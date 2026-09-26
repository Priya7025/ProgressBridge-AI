# ProgressBridge AI — Master Demo Runbook

**SIH 2026 — PS 26122**: Intelligent Data Capture & Schedule-Linking Layer for Infrastructure Project Management  
**Demo Project**: Demo Gas Terminal & Processing Facility (Oil India Limited / `PRJ-DEMO-01`)  
**Primary Acceptance Activity**: `PIP-2458` — *Erect Line 24-XX* (Piping, North Unit - Process Train A)  
**Runbook Version**: 2.1 (Explicit 14-Phase Golden Demo Specification)  

---

## 1. Demo Mission & Architecture

This runbook guides the presenter through the 14-phase end-to-end demonstration proving the core SIH project mission:

$$\text{Messy Field Input} \longrightarrow \text{AI Extraction} \longrightarrow \text{Hybrid Semantic Matching (87.7\%)} \longrightarrow \text{Human Review} \longrightarrow \text{Schedule-Linked Update} \longrightarrow \text{Delay Derived (+8d)} \longrightarrow \text{Dashboard KPI Update} \longrightarrow \text{Audit Trail}$$

---

## 2. Live Demo Personas & Credentials

| Persona | Email | Assigned Role | Capabilities & Route Access |
| :--- | :--- | :--- | :--- |
| **Project Planner** | `pbchauhan246@gmail.com` | `planner` | Full access: `/dashboard`, `/activities`, `/review`, `/upload`, `/time-agent` |
| **Site Supervisor** | `priyachauhan320224@gmail.com` | `supervisor` | Execution access: `/time-agent`, `/upload` (routed from planner screens) |

---

## 3. Pre-Demo Setup & Baseline State

1. **Verify Local Dev Server**:
   ```powershell
   cd frontend
   npm run dev
   ```
   Open `http://localhost:3000` in browser.

2. **Clean Baseline Reset** (Before each rehearsal or live presentation):
   ```powershell
   Invoke-RestMethod -Uri "http://localhost:3000/api/demo/reset" -Method Post -ContentType "application/json" -Body '{"projectId":"1c1711c7-11f8-43f0-babe-e6a7cefe1ad4"}'
   ```
   *Expected Response*: `{"success": true, "counts": {"schedule_activities": 890, "progress_events": 0}}`.

---

## 4. The 14 Explicit Demo Phases

---

### Phase 1: Home
* **URL**: `http://localhost:3000/`
* **Objective**: Introduce ProgressBridge AI and the planning-to-execution gap in major infrastructure projects.
* **Talking Point**: "In major construction projects, site reality is trapped in unstructured chat logs and daily site diaries while planners work with rigid Primavera schedules. ProgressBridge AI creates an intelligent, automated bridge between execution and planning."
* **Action**: Review hero highlights (AI Time Agent, Multi-Format Ingestion, Discipline Analytics) and click **Launch App**.
* **Verification Status**: **MANUAL VERIFICATION REQUIRED** (UI navigation).

---

### Phase 2: Login + Role
* **URL**: `http://localhost:3000/login`
* **Objective**: Demonstrate persona-based role-based access control (RBAC).
* **Action**:
  1. Sign in as **Project Planner** (`pbchauhan246@gmail.com`).
  2. Note role badge `planner` in top navigation bar granting access to `/dashboard`, `/activities`, `/review`, `/upload`, `/time-agent`.
  3. (Optional) Show supervisor sign-in (`priyachauhan320224@gmail.com`) routing directly to `/time-agent` execution center.
* **Verification Status**: **MANUAL VERIFICATION REQUIRED** (UI authentication).

---

### Phase 3: Planner Dashboard
* **URL**: `http://localhost:3000/dashboard`
* **Objective**: Inspect initial baseline metrics derived dynamically from Supabase database views.
* **Talking Point**: "Our project baseline contains 890 Primavera Level 5 schedule activities. At start of demo, zero activities are delayed and zero are completed."
* **Show Live KPIs**:
  * Total Activities: **`890`**
  * Completed: **`0`**
  * Delayed: **`0`**
  * Pending Review: **`0`**
  * Unmatched: **`0`**
* **Show Live Chart**: Recharts **Discipline Progress** showing 0% completion across Civil, Piping, Mechanical, Electrical, Instrumentation, and HSE.
* **Verification Status**: **PASS** (Supabase DB Query) / **MANUAL VERIFICATION REQUIRED** (Visual UI rendering).

---

### Phase 4: PIP-2458 Activity
* **URL**: `http://localhost:3000/activities/PIP-2458`
* **Objective**: Inspect the golden demo baseline target activity before any site reports are processed.
* **Show Attributes**:
  * Activity ID: **`PIP-2458`** (UUID: `2030a2db-0469-4e3a-9c23-5fae2a711142`)
  * Description: **`Erect Line 24-XX`**
  * Discipline: **`Piping`**
  * Location: **`North Unit - Process Train A`**
  * Asset Identifier: **`Line 24-XX`**
  * Planned Start: **`2026-08-20`**
  * Planned Finish: **`2026-08-23`**
  * Planned Duration: **`4 days`**
  * Status: **`NOT_STARTED`**
  * Actual Start / Finish: *Not yet recorded*
  * Schedule Variance: *Not yet recorded*
* **Verification Status**: **PASS** (Supabase DB Record) / **MANUAL VERIFICATION REQUIRED** (Visual UI rendering).

---

### Phase 5: Supervisor Activity Center
* **URL**: `http://localhost:3000/activities`
* **Objective**: Show the full schedule activity center supporting multi-discipline visibility across 890 activities.
* **Action**:
  * Scroll through desktop table view and mobile card view.
  * Point out distinct discipline badges (`Piping`, `Civil`, `Electrical`, `Mechanical`, `Instrumentation`, `HSE`).
* **Verification Status**: **PASS** (DB Record set) / **MANUAL VERIFICATION REQUIRED** (Visual UI rendering).

---

### Phase 6: Deadline / Filter / Sort
* **URL**: `http://localhost:3000/activities`
* **Objective**: Demonstrate client-side interactive search and trade filtering.
* **Action**:
  1. Select **Piping** from the discipline dropdown — list filters down to only piping schedule activities.
  2. Type `Line 24-XX` or `PIP-2458` in search input — immediately filters to `PIP-2458` and related package items.
  3. Clear filter and select **Civil** or **Electrical** to show instant reactivity.
* **Verification Status**: **MANUAL VERIFICATION REQUIRED** (Interactive client filter).

---

### Phase 7: Supervisor Report / Time Agent
* **URL**: `http://localhost:3000/time-agent`
* **Objective**: Site supervisor logs natural field milestones without navigating complex Gantt charts.
* **Input Text 1 (Start Event)**:
  ```text
  24-XX spool erection started at 10:30 AM in North Unit.
  ```
* **Click**: **Send**
* **Input Text 2 (Completion Event)**:
  ```text
  Line 24-XX erection completed on 31-Aug.
  ```
* **Click**: **Send**
* **Verification Status**: **PASS** (API endpoint HTTP 200) / **MANUAL VERIFICATION REQUIRED** (Chat UI bubble interaction).

---

### Phase 8: AI Extraction
* **Scope**: `/api/time-agent` $\rightarrow$ Gemini extraction pipeline $\rightarrow$ `progress_events` table.
* **Objective**: Demonstrate structured information extraction from free-form supervisor input.
* **Extracted Schema**:
  * `discipline`: `"Piping"`
  * `activity_description`: `"24-XX spool erection started at 10:30 AM in North Unit."`
  * `asset`: `"Line 24-XX"`
  * `location`: `"North Unit"`
  * `event_type`: `"STARTED"` / `"COMPLETED"`
  * `event_date`: `"2026-08-20"` (Start) / `"2026-08-31"` (Completion)
* **Verification Status**: **PASS** (Database Insertion) / **MANUAL VERIFICATION REQUIRED** (UI feedback badge).

---

### Phase 9: Hybrid Matching + Confidence
* **Scope**: `match_schedule_activities` SQL function & `activity_matches` table.
* **Objective**: Demonstrate pgvector semantic search weighted with domain metadata.
* **Scoring Breakdown for `PIP-2458`**:
  * Semantic Similarity (50% weight): **`75.42%`**
  * Asset Identifier Match (`24-XX` $\rightarrow$ `Line 24-XX`, 25% weight): **`100.0%`**
  * Discipline Match (`Piping` $\rightarrow$ `Piping`, 15% weight): **`100.0%`**
  * Location Match (`North Unit` $\rightarrow$ `North Unit - Process Train A`, 10% weight): **`100.0%`**
  * **Final Composite Score**: **`87.71%`** (High confidence match)
* **Verification Status**: **PASS** (SQL Function Execution) / **MANUAL VERIFICATION REQUIRED** (Review card presentation).

---

### Phase 10: Planner Approval
* **URL**: `http://localhost:3000/review`
* **Objective**: Demonstrate human-in-the-loop validation of AI match proposals.
* **Show Review Item**:
  * Source Report: *"Line 24-XX erection completed on 31-Aug."*
  * Suggested Match: **`PIP-2458` — `Erect Line 24-XX`**
  * Confidence: **`87.71%`** with all 4 sub-score badges visible.
* **Click**: **Accept Match**
* **Database Updates Triggered**:
  * `activity_matches.match_status` $\rightarrow$ `APPROVED`
  * `schedule_activities.status` $\rightarrow$ `COMPLETED`
  * `schedule_activities.actual_start` $\rightarrow$ `2026-08-20`
  * `schedule_activities.actual_finish` $\rightarrow$ `2026-08-31`
  * `progress_events.status` $\rightarrow$ `MATCHED`
  * `audit_log` $\rightarrow$ Action `MATCH_APPROVED` recorded with user ID and timestamp.
* **Verification Status**: **PASS** (Atomic DB Mutation) / **MANUAL VERIFICATION REQUIRED** (Button click & UI revalidation).

---

### Phase 11: Actual Progress + Delay
* **URL**: `http://localhost:3000/activities/PIP-2458`
* **Objective**: Prove real schedule linking and automated delay derivation.
* **Show Real Calculated Values**:
  * Status: **`COMPLETED`**
  * Actual Start: **Aug 20, 2026**
  * Actual Finish: **Aug 31, 2026**
  * Planned Finish: **Aug 23, 2026**
  * Schedule Variance: **`+8 days delay`** ($2026\text{-}08\text{-}31 - 2026\text{-}08\text{-}23$)
* **Verification Status**: **PASS** (Formula & DB State) / **MANUAL VERIFICATION REQUIRED** (Visual badge rendering).

---

### Phase 12: Visual Progress
* **URL**: `http://localhost:3000/activities/PIP-2458` and `/dashboard`
* **Objective**: Show clear visual contrast between planned vs actual execution timelines.
* **Show**:
  * Planned vs Actual schedule comparison cards on Activity Details.
  * Audit history timeline showing `MATCH_APPROVED` with before/after state snapshots.
  * Recharts Piping discipline progress bar increment on Dashboard.
* **Verification Status**: **MANUAL VERIFICATION REQUIRED** (Visual layout inspection).

---

### Phase 13: Planner Time Agent
* **URL**: `http://localhost:3000/time-agent`
* **Objective**: Planner uses conversational Time Agent to query current project progress and log notes.
* **Action**:
  * Review conversational thread history containing supervisor progress submissions and system match receipts.
* **Verification Status**: **PASS** (Message State) / **MANUAL VERIFICATION REQUIRED** (UI rendering).

---

### Phase 14: Final Dashboard
* **URL**: `http://localhost:3000/dashboard`
* **Objective**: Executive overview reflects updated project health driven purely by live database actuals.
* **Show Updated KPIs**:
  * Total Activities: **`890`**
  * Completed: **`1`** (PIP-2458 completed)
  * Delayed: **`1`** (PIP-2458 delay +8 days derived from `actual_finish > planned_finish`)
  * Pending Review: **`0`**
  * Unmatched: **`0`**
* **Verification Status**: **PASS** (Supabase View Aggregates) / **MANUAL VERIFICATION REQUIRED** (KPI Card visual update).

---

## 5. Failure Recovery & Troubleshooting Guide

| Scenario | Root Cause | Immediate Recovery Action |
| :--- | :--- | :--- |
| **n8n Webhook Unreachable** | External ngrok tunnel dropped | `/api/time-agent` automatic regex fallback activates without disrupting extraction. |
| **Stale UI after Accept** | Browser caching | Press `Ctrl+F5` for hard reload. Database state persists. |
| **Clean Slate Needed Mid-Demo** | Testing previous scenario | Call `POST /api/demo/reset` to restore 0-progress baseline with 890 activities. |
