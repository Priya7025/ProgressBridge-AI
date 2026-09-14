# ProgressBridge AI — Golden Demo Script

This document provides the step-by-step presentation and rehearsal script for **ProgressBridge AI** (SIH 2026, PS 26122). All steps, confidence scores, dates, and metrics in this document represent **verified, real numbers** produced by the end-to-end pipeline during integration testing.

---

## Demo Overview & Objective

Demonstrate the real, end-to-end planning-to-execution bridge:
$$\text{Messy Field Input} \longrightarrow \text{AI Extraction} \longrightarrow \text{Hybrid Semantic Matching} \longrightarrow \text{Human Review} \longrightarrow \text{Schedule Update} \longrightarrow \text{Delay Impact (+8d)} \longrightarrow \text{Audit Trail}$$

> **Primary Acceptance Activity:** `PIP-2458` — *Erect Line 24-XX* (Piping, North Unit - Process Train A)

---

## Pre-Demo Setup & Verification

> [!NOTE]
> **n8n Status Note:** The n8n ingestion workflow is pending Member 1's deployment to persistent Render hosting and Gemini model name update (`models/gemini-1.5-flash`). For local rehearsals, ensure the n8n webhook or ngrok tunnel (`https://gleeful-caliber-acclaim.ngrok-free.dev/webhook/ingest-text`) is active.

1. **Verify Environment**:
   - `NEXT_PUBLIC_DEMO_PROJECT_ID=1c1711c7-11f8-43f0-babe-e6a7cefe1ad4` in `frontend/.env.local`.
   - Start frontend: `npm run dev` (running at `http://localhost:3000`).
2. **Clean Slate Reset**:
   - Trigger demo reset: `POST /api/demo/reset` with payload `{"projectId": "1c1711c7-11f8-43f0-babe-e6a7cefe1ad4"}`.
   - Confirm baseline state:
     - Total Activities: `890`
     - Delayed Activities: `0`
     - Pending Review: `0`

---

## Step-by-Step Presentation Script

### Step 1: Upload & Inspect Project Schedule (Planner View)
- **Action**: Navigate to `http://localhost:3000/upload` (or `/dashboard`).
- **Show**:
  - The 890-activity Primavera/Level 5 schedule is loaded into pgvector with multi-discipline coverage (Piping, Civil, Electrical, Instrumentation, Mechanical).
  - Open `/activities` and search for **`PIP-2458`**.
  - Show baseline planned dates for `PIP-2458`:
    - Planned Start: `2026-08-20`
    - Planned Finish: `2026-08-23`
    - Status: `NOT_STARTED`
    - Delay: `0 days`

---

### Step 2: Supervisor Submits Daily Start Log (Time Agent)
- **Action**: Navigate to `http://localhost:3000/time-agent` (Supervisor interface).
- **Input Text**:
  ```text
  24-XX spool erection started at 10:30 AM in North Unit.
  ```
- **Click**: **Send Update**
- **What Happens Under the Hood**:
  1. Frontend forwards text to n8n webhook `/webhook/ingest-text`.
  2. Gemini extracts structured fields:
     - `discipline`: `"Piping"`
     - `activity_description`: `"24-XX spool erection started at 10:30 AM in North Unit."`
     - `asset`: `"Line 24-XX"`
     - `location`: `"North Unit"`
     - `event_type`: `"STARTED"`
     - `event_time`: `"10:30:00"`
  3. Row inserted into Supabase `progress_events` with status `PENDING_MATCH`.
  4. Hybrid Matcher computes candidate scores:
     - **Semantic similarity:** $0.7396$ (50% weight)
     - **Identifier match (`24-XX` $\rightarrow$ `Line 24-XX`):** $1.0000$ (25% weight)
     - **Discipline match (`Piping` $\rightarrow$ `Piping`):** $1.0000$ (15% weight)
     - **Location match (`North Unit` $\rightarrow$ `North Unit - Process Train A`):** $1.0000$ (10% weight)
     - **Final Composite Score:** **`86.98%`** ($0.8698$)
  5. Placed in `PENDING_REVIEW` in `activity_matches`.

---

### Step 3: Planner Reviews & Accepts Start Event
- **Action**: Navigate to `http://localhost:3000/review`.
- **Show the Match Card**:
  - Suggested Activity: `PIP-2458` (*Erect Line 24-XX*)
  - Confidence Score: **`86.98%`** (High Confidence Recommendation)
  - Sub-score breakdown transparently displayed (Semantic, Identifier, Discipline, Location).
- **Click**: **Accept**
- **Result**:
  - `activity_matches.match_status` becomes `APPROVED`.
  - `schedule_activities.actual_start` becomes `2026-08-20`.
  - Activity status transitions from `NOT_STARTED` $\rightarrow$ `IN_PROGRESS`.
  - Immutable audit trail record logged with action `MATCH_APPROVED`.

---

### Step 4: Supervisor Submits Completion Log (Delayed Finish)
- **Action**: Return to `http://localhost:3000/time-agent`.
- **Input Text**:
  ```text
  Line 24-XX erection completed on 31-Aug in North Unit.
  ```
- **Click**: **Send Update**
- **What Happens Under the Hood**:
  1. Gemini extracts:
     - `event_type`: `"COMPLETED"`
     - `event_date`: `"2026-08-31"`
     - `asset`: `"Line 24-XX"`
     - `location`: `"North Unit"`
  2. Hybrid Matcher calculates top candidate:
     - **Semantic similarity:** $0.8832$
     - **Identifier match:** $1.0000$
     - **Discipline match:** $1.0000$
     - **Location match:** $1.0000$
     - **Final Composite Score:** **`94.16%`** ($0.9416$)
  3. Match queued in `review_queue` as `PENDING_REVIEW`.

---

### Step 5: Planner Reviews & Accepts Completion Event
- **Action**: Navigate to `http://localhost:3000/review`.
- **Show**: Match for `PIP-2458` with **`94.16%`** confidence.
- **Click**: **Accept**
- **Result**:
  - `schedule_activities.actual_finish` becomes `2026-08-31`.
  - `schedule_activities.status` becomes `COMPLETED`.
  - Second audit entry logged.

---

### Step 6: Verify Live Impact on Schedule & Dashboard
- **Action 1**: Navigate to `http://localhost:3000/activities/PIP-2458` (Activity Details).
  - **Status**: `COMPLETED`
  - **Planned Start / Finish**: `2026-08-20` $\rightarrow$ `2026-08-23`
  - **Actual Start / Finish**: `2026-08-20` $\rightarrow$ `2026-08-31`
  - **Delay Calculation**: $2026\text{-}08\text{-}31 - 2026\text{-}08\text{-}23 =$ **`+8 days`**
  - **Linked Matches**: 2 linked matches (Start Event @ 86.98%, Completion Event @ 94.16%).
  - **Audit History**: 6 audit trail records showing full provenance (created, updated, approved).
- **Action 2**: Navigate to `http://localhost:3000/dashboard`.
  - **Delayed Activities Count**: Increased from **`0` $\rightarrow$ `1`** dynamically from real database calculation.
  - **Completed Activities Count**: `358` / `890`.

---

## Golden Demo Acceptance Summary Table

| Metric / Stage | Expected / Verified Value |
|---|---|
| Schedule Size | `890` activities |
| Test Activity | `PIP-2458` (*Erect Line 24-XX*) |
| Start Report Score | **`86.98%`** ($0.8698$) |
| Completion Report Score | **`94.16%`** ($0.9416$) |
| Actual Start Date | `2026-08-20` |
| Planned Finish Date | `2026-08-23` |
| Actual Finish Date | `2026-08-31` |
| Delay Calculated | **`+8 days`** |
| Dashboard Delayed KPI | **`0` $\rightarrow$ `1`** |
| Audit Trail Entries | `6` transactions logged |
