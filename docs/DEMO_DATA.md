# Demo Data Specification — ProgressBridge AI (SIH PS 26122)

**Document Version**: 1.0  
**Owner**: Member 4 (Integration & QA)  
**Verification Date**: 2026-09-25  

---

## 1. Demo Project Overview

* **Project ID**: `1c1711c7-11f8-43f0-babe-e6a7cefe1ad4`
* **Project Name**: `Demo Gas Terminal & Processing Facility`
* **Project Code**: `PROJECT-001` / `PRJ-DEMO-01`
* **Organization**: `Oil India Limited (OIL)`
* **Total Baseline Activities**: **890 activities** across 6 disciplines:
  * `Civil`
  * `Mechanical`
  * `Electrical`
  * `Piping`
  * `Instrumentation`
  * `HSE`

---

## 2. Golden Demo Activity: `PIP-2458`

The primary acceptance-test activity for live evaluation is:

| Attribute | Specification | Live Database Value |
| :--- | :--- | :--- |
| **Activity ID** | `PIP-2458` | `PIP-2458` |
| **Database UUID** | — | `2030a2db-0469-4e3a-9c23-5fae2a711142` |
| **Description** | `Erect Line 24-XX` | `Erect Line 24-XX` |
| **Discipline** | `Piping` | `Piping` |
| **Location** | `North Unit - Process Train A` | `North Unit - Process Train A` |
| **Asset Identifier** | `Line 24-XX` | `Line 24-XX` |
| **Planned Start** | `2026-08-20` | `2026-08-20` |
| **Planned Finish** | `2026-08-23` | `2026-08-23` |
| **Planned Duration** | 4 days | 4 days |
| **WBS Code** | `4.1.04.58` | `4.1.04.58` |
| **Actual Start** (after start event) | `2026-08-20` | `2026-08-20` |
| **Actual Finish** (after completion event) | `2026-08-31` | `2026-08-31` |
| **Schedule Variance / Delay** | **$+8$ days delay** | **$+8$ days delay** |
| **Final Status** | `COMPLETED` | `COMPLETED` |

---

## 3. Demo Field Report

**File Path**: `data/sample_reports/daily_site_report_piping_2026-08-20.txt` (and `supabase/seed/sample_reports/daily_site_report_piping_2026-08-20.txt`)

### Report Content:
```text
PROGRESSBRIDGE AI - SITE PROGRESS REPORT
PROJECT: OIL Demo Refinery Expansion
DATE: 2026-08-20
REPORT TYPE: Daily Field Diary - Piping & Mechanical Erection
PREPARED BY: Somnath Mukherjee, Lead Piping Construction Engineer
WEATHER: Sunny, 32°C, wind 8 km/h

SUMMARY OF FIELD ACTIVITIES:
1. Line 24-XX Spool Erection (PRD Demo Headline Case - Start Event):
   24-XX spool erection started at 10:30 AM in North Unit. Rigging crew positioned the 8-inch carbon steel line onto structural rack supports.

2. Line 24-XX Erection Completion (PRD Demo Headline Case - Completion Event):
   Line 24-XX erection completed on 31-Aug. Final alignment and drift pin removal checked off by QA inspector.

3. Exact Baseline Match Test Case:
   Erect Line 24-XX

4. Abbreviation & Field Jargon Case:
   PWHT & NDT on CS line 18-B completed. Certified tech recorded 12-pt thermal charts and 100% PAUT on 8 butt joints at South Unit.

5. Ambiguous Multiple Match Case:
   Hydrotesting process line in Train A completed with calibrated gauge holding 36 bar. (Ambiguous: Multiple hydrotest packages in Train A without specific line ID).

6. Delay Reason Case:
   Piping erection halted on Line 18-B in South Unit due to 4-day delay in receiving Class 600 isolation check valve from vendor.

7. Flange Torque Tightening:
   Cross-pattern torque tightening of Class 300/600 raised-face flanges with spiral gaskets completed at Crude Tank Farm Loading Manifold (Line 24-TF-502).

UNSCHEDULED / NON-BASELINE ENTRIES:
8. Site Office AC Unloading:
   Piping crew assisted logistics team in unloading 3 wooden crates of office air conditioners at the main administrative gate.
```

---

## 4. Required Database Records & State

### 4.1 `schedule_activities`
* Contains 890 activities.
* `PIP-2458` row with baseline dates `2026-08-20` to `2026-08-23`.

### 4.2 `progress_events`
* **Start Event**:
  * `event_type`: `STARTED`
  * `event_date`: `2026-08-20`
  * `discipline`: `Piping`
  * `asset`: `Line 24-XX`
  * `location`: `North Unit`
  * `status`: `MATCHED`
* **Completion Event**:
  * `event_type`: `COMPLETED`
  * `event_date`: `2026-08-31`
  * `discipline`: `Piping`
  * `asset`: `Line 24-XX`
  * `location`: `North Unit`
  * `status`: `MATCHED`
* **Pending Match Event**:
  * `activity_description`: `Exact Baseline Match Test Case: Erect Line 24-XX`
  * `status`: `PENDING_REVIEW`

### 4.3 `activity_matches`
* Linked to `PIP-2458` UUID (`2030a2db-0469-4e3a-9c23-5fae2a711142`).
* Hybrid score breakdown:
  * Semantic score: `0.7542` ($75.4\%$)
  * Identifier score: `1.0` ($100\%$)
  * Discipline score: `1.0` ($100\%$)
  * Location score: `1.0` ($100\%$)
  * **Final Score**: **`0.8771`** ($87.7\%$)

### 4.4 `audit_log`
* Records `MATCH_APPROVED` action on approval with reviewer user ID, timestamp, and before/after payloads (`actual_finish: 2026-08-31`, `status: COMPLETED`).

---

## 5. Verified Real-Data Flow

1. **Schedule Ingestion**:
   - `data/schedule_activities.csv` $\rightarrow$ `POST /api/upload/schedule` $\rightarrow$ upserted into `schedule_activities`.
2. **Supervisor Input / Time Agent**:
   - Natural language: *"24-XX spool erection started at 10:30 AM in North Unit."*
   - Sent via `POST /api/time-agent` $\rightarrow$ Gemini/n8n extraction $\rightarrow$ inserted into `progress_events`.
3. **Hybrid Matching**:
   - SQL function `public.match_schedule_activities` evaluates embeddings and metadata.
   - Generates confidence score (~88%) and creates row in `activity_matches` with status `PENDING_REVIEW`.
4. **Review & Approval**:
   - Planner navigates to `/review`, inspects sub-score breakdown, and clicks **Accept Match**.
   - `ReviewItemActions.handleAccept` updates match status to `APPROVED`, updates `schedule_activities` actual dates and status, and writes `MATCH_APPROVED` to `audit_log`.
5. **Delay & Dashboard Reflection**:
   - Activity Details (`/activities/PIP-2458`) dynamically computes $+8$ days delay ($2026\text{-}08\text{-}31 - 2026\text{-}08\text{-}23$).
   - Dashboard (`/dashboard`) dynamically updates `Delayed` KPI from database query on `schedule_activities` without presentation mocks.

---

## 6. Audit for Hardcoded or Fake Values

| Area Checked | Finding | Status |
| :--- | :--- | :---: |
| `PIP-2458` Status | Strictly loaded from `schedule_activities.status` column | **CLEAN (No hardcoding)** |
| Match Confidence | Computed by `public.match_schedule_activities` SQL function | **CLEAN (No hardcoding)** |
| Delay Value | Dynamically calculated as $\text{actual\_finish} - \text{planned\_finish}$ | **CLEAN (No hardcoding)** |
| Discipline Chart | Dynamically rendered from `project_discipline_progress` DB view | **CLEAN (No hardcoding)** |
| Dashboard KPI Counts | Derived from database aggregate views | **CLEAN (No hardcoding)** |
| Time Agent Output | Formats actual API responses from n8n / DB insertions | **CLEAN (No hardcoding)** |

---

## 7. Environment & Setup Checklist

* **Database Connection**: `NEXT_PUBLIC_SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` in `.env.local`.
* **Demo Project ID**: `NEXT_PUBLIC_DEMO_PROJECT_ID=1c1711c7-11f8-43f0-babe-e6a7cefe1ad4`.
* **Ingestion Webhook**: `INGESTION_WEBHOOK_URL` configured for live Gemini extraction.
* **Demo Reset**: `/api/demo/reset` available to reset progress events and matches back to baseline state without deleting the 890 schedule activities.
