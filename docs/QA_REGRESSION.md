# QA Regression Report — ProgressBridge AI (SIH PS 26122)

**Report Date**: 2026-09-25  
**Stage**: P0.1 Regression Protection & Final UI Verification  
**Golden Flow Demo Activity**: `PIP-2458` — Erect Line 24-XX  

---

## 1. Executive Summary

A thorough regression and data-flow verification of ProgressBridge AI was conducted across the database, server API routes, TypeScript type system, and client components.

* **Automated Server, API & Database Tests**: **PASS** (Supabase live queries, `/api/time-agent`, `/api/upload/schedule`, TypeScript typecheck, ESLint, Next.js production build).
* **Automated Browser Automation (`open_browser_url`)**: **BLOCKED BY ENVIRONMENT** (Playwright CDN driver download returned 404).
* **Visual UI Flow & Interaction**: Explicitly marked as **REQUIRES MANUAL BROWSER VERIFICATION** in accordance with the rule: *do not claim PASS without direct testing*.

---

## 2. Complete Flow Verification Status

$$\text{Dashboard} \rightarrow \text{Activity List} \rightarrow \text{PIP-2458} \rightarrow \text{Upload Daily Report} \rightarrow \text{Gemini Extraction} \rightarrow \text{Progress Event} \rightarrow \text{Schedule Matching} \rightarrow \text{Review Queue} \rightarrow \text{Accept Match} \rightarrow \text{Actual Start/Finish} \rightarrow \text{Delay} \rightarrow \text{Dashboard Update} \rightarrow \text{Audit Trail}$$

| Flow Step / Component | Target / Activity | Automated API / DB Status | UI / Browser Status | Details & Verification Notes |
| :--- | :--- | :---: | :---: | :--- |
| **1. Dashboard** | `/dashboard` | **PASS** (DB Aggregation) | **MANUAL VERIFICATION REQUIRED** | Live query on `project_dashboard_summary` verified. Returns 890 total activities, 0 hardcoded fake metrics. |
| **2. Activity List** | `/activities` | **PASS** (DB Query) | **MANUAL VERIFICATION REQUIRED** | Live query verified on `schedule_activities` (890 rows across Civil, Mech, Elec, Piping, Inst, HSE). |
| **3. Target Activity** | `PIP-2458` (`/activities/PIP-2458`) | **PASS** (DB Record) | **MANUAL VERIFICATION REQUIRED** | Verified live in Supabase: planned start `2026-08-20`, planned finish `2026-08-23`, discipline `Piping`, location `North Unit - Process Train A`. |
| **4. Report Upload** | `/upload` & `/api/upload/schedule` | **PASS** (API Test) | **MANUAL VERIFICATION REQUIRED** | Multipart CSV schedule ingestion batch upsert with `onConflict: 'project_id,activity_id'` verified. Supabase storage bucket `progress-documents` configured. |
| **5. Time Agent / Extraction** | `/time-agent` & `/api/time-agent` | **PASS** (Live API 200) | **MANUAL VERIFICATION REQUIRED** | Tested with: *"24-XX spool erection started at 10:30 AM in North Unit."* API returned HTTP 200 with structured progress event (`discipline: Piping`, `asset: Line 24-XX`, `location: North Unit`). |
| **6. Progress Event Creation** | `progress_events` table | **PASS** (Live Supabase) | **MANUAL VERIFICATION REQUIRED** | Verified live records in Supabase `progress_events` with status `PENDING_REVIEW` / `MATCHED`. |
| **7. Schedule Matching** | `match_schedule_activities` | **PASS** (Live Supabase) | **MANUAL VERIFICATION REQUIRED** | Live hybrid matching scored `PIP-2458` at **87.71%** confidence (`semantic: 0.7542`, `identifier: 1.0`, `discipline: 1.0`, `location: 1.0`). |
| **8. Review Queue** | `/review` | **PASS** (DB View) | **MANUAL VERIFICATION REQUIRED** | Live `review_queue` view returns pending items with sub-score breakdowns and suggested matches. |
| **9. Accept Match Action** | `ReviewItemActions.handleAccept` | **PASS** (Code Audit) | **MANUAL VERIFICATION REQUIRED** | Logic verified in `src/components/review/review-item-actions.tsx`: updates match status to `APPROVED`, sets activity status `COMPLETED`, `actual_finish: 2026-08-31`, and writes to `audit_log`. |
| **10. Actual Start/Finish** | `schedule_activities` updates | **PASS** (DB Schema) | **MANUAL VERIFICATION REQUIRED** | Verified columns `actual_start`, `actual_finish`, `status` in Supabase. |
| **11. Delay Calculation** | $+8$ days for `PIP-2458` | **PASS** (Formula Verified) | **MANUAL VERIFICATION REQUIRED** | Calculation $(2026\text{-}08\text{-}31 - 2026\text{-}08\text{-}23 = +8\text{ days})$ verified in `src/app/(protected)/activities/[id]/page.tsx`. |
| **12. Dashboard Update** | Dynamic KPI updates | **PASS** (Query Verified) | **MANUAL VERIFICATION REQUIRED** | `summary.delayed = actualDelayedCount` strictly derives from `actual_finish > planned_finish`. |
| **13. Audit Trail** | `audit_log` table | **PASS** (Live Supabase) | **MANUAL VERIFICATION REQUIRED** | Verified live entries in Supabase `audit_log` with before/after state snapshots. |

---

## 3. Automated Validation Results

| Test / Check | Result | Log / Output Details |
| :--- | :---: | :--- |
| `npm run typecheck` | **PASS** | `tsc --noEmit` exited with code 0. Zero type errors. |
| `npm run lint` | **PASS** | `eslint` exited with code 0. Zero lint warnings/errors. |
| `npm run build` | **PASS** | `next build` compiled 14/14 static and dynamic routes in 1.8s. |
| Next.js Dev Server (`npm run dev`) | **PASS** | Running and listening on `http://localhost:3000`. |
| Time Agent API (`POST /api/time-agent`) | **PASS** | Tested with live payload; returned HTTP 200 and persisted progress event. |
| Live Supabase Connectivity | **PASS** | Authenticated queries to `https://jopmivqiwaaznuogczjl.supabase.co` successful. |

---

## 4. Regressions Fixed

1. **Theme Inconsistency in Loading Skeletons**:
   - Replaced hardcoded `#000000`/`#111111` in `dashboard/loading.tsx`, `activities/loading.tsx`, and `review/loading.tsx` with semantic Tailwind classes (`bg-card`, `bg-muted`, `border-border/60`, `text-primary`).
2. **Error State Contrast in Light Mode**:
   - Replaced hardcoded `#000000` in error fallbacks for `activities/page.tsx` and `review/page.tsx` with `bg-card text-card-foreground border-destructive/40 text-destructive`.
3. **Upload Notification Styling**:
   - Replaced hardcoded `#111111` in `upload/page.tsx` with semantic `bg-destructive/10 text-destructive` and `bg-emerald-500/10 text-emerald-600`.

---

## 5. Manual Browser Verification Checklist

Perform these steps in a standard web browser (e.g. Chrome / Edge at `http://localhost:3000`):

1. **Dashboard Check (`/dashboard`)**:
   - [ ] Navigate to `http://localhost:3000/dashboard`.
   - [ ] Verify 5 KPI cards render: Total Activities (890), Completed, Delayed, Pending Review, Unmatched.
   - [ ] Verify Discipline Progress chart renders without console errors.

2. **Activity List Check (`/activities`)**:
   - [ ] Navigate to `http://localhost:3000/activities`.
   - [ ] Search for `PIP-2458`.
   - [ ] Verify row appears: `PIP-2458` — `Erect Line 24-XX`, Discipline: `Piping`, Location: `North Unit - Process Train A`.
   - [ ] Click row to open `/activities/PIP-2458` and check Planned Start (`2026-08-20`) and Planned Finish (`2026-08-23`).

3. **Time Agent Ingestion (`/time-agent`)**:
   - [ ] Navigate to `http://localhost:3000/time-agent`.
   - [ ] Submit: *"24-XX spool erection started at 10:30 AM in North Unit."*
   - [ ] Confirm agent bubble returns extracted event details.

4. **Review & Accept Match (`/review`)**:
   - [ ] Navigate to `http://localhost:3000/review`.
   - [ ] Locate pending review card for `Line 24-XX` matched to `PIP-2458` (Confidence: ~88%).
   - [ ] Click **Accept Match**.
   - [ ] Verify the item clears from the pending review queue.

5. **Actual Progress, Delay & Dashboard Update**:
   - [ ] Navigate back to `/activities/PIP-2458`.
   - [ ] Verify status shows `COMPLETED`, Actual Finish shows `2026-08-31`, and Variance shows `+8 days delay`.
   - [ ] Verify Audit History section contains a new `MATCH_APPROVED` entry.
   - [ ] Navigate to `/dashboard` and verify Delayed count has incremented.
   - [ ] Refresh the browser page (`F5`) and confirm all updated values persist from Supabase without reverting.
