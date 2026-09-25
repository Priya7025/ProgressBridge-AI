# ProgressBridge AI — 14-Phase Live Demo Rehearsal Script

**Project**: ProgressBridge AI (SIH 2026, PS 26122)  
**Target Activity**: `PIP-2458` — Erect Line 24-XX  
**Discipline**: Piping | **Location**: North Unit - Process Train A  
**Planned Baseline**: `2026-08-20` $\rightarrow$ `2026-08-23`  

---

## Pre-Demo Checklist

1. Start frontend: `cd frontend && npm run dev` (running at `http://localhost:3000`).
2. Clean demo state reset:
   ```powershell
   curl -X POST http://localhost:3000/api/demo/reset -H "Content-Type: application/json" -d "{\"projectId\":\"1c1711c7-11f8-43f0-babe-e6a7cefe1ad4\"}"
   ```
3. Confirm baseline metrics:
   - Total Activities: `890`
   - Delayed: `0`
   - Pending Review: `0`
   - Unmatched: `0`

---

## 14-Phase Presentation Sequence

### Phase 1: Home Landing Page
- **URL**: `http://localhost:3000/`
- **UI Action**: Open landing page. Scroll to hero headline and core architecture diagram.
- **Expected Result**: Clean dark/light theme renders with feature highlights and "Launch Platform" CTA.
- **Talking Point**:
  > *"Welcome to ProgressBridge AI. Infrastructure mega-projects face a critical bottleneck: field execution reports are messy, verbal, and unstructured, while project schedules require exact Level 5 WBS matching. ProgressBridge AI forms the intelligent bridge between site reality and master schedules."*

---

### Phase 2: Login & Role Selection
- **URL**: `http://localhost:3000/login`
- **UI Action**: Click "Launch Platform" or navigate to `/login`. Sign in as **Project Planner (Reviewer)** (`pbchauhan246@gmail.com`).
- **Expected Result**: Authenticates with Supabase and redirects smoothly to `/dashboard`.
- **Talking Point**:
  > *"ProgressBridge AI features role-based access control. Planners have full oversight to review AI recommendations and approve schedule updates, while site supervisors access dedicated data-capture interfaces."*

---

### Phase 3: Planner Dashboard (Baseline State)
- **URL**: `http://localhost:3000/dashboard`
- **UI Action**: Point to the 5 top-level KPI cards and Discipline Progress breakdown.
- **Expected Result**:
  - Total Activities: **890** (Live from Supabase)
  - Completed: `0`
  - Delayed: `0`
  - Pending Review: `0`
- **Talking Point**:
  > *"Our dashboard is entirely database-driven. Notice the baseline state: 890 Primavera Level 5 schedule activities loaded across 6 disciplines. There are zero fake hardcoded numbers."*

---

### Phase 4: PIP-2458 Activity Inspection
- **URL**: `http://localhost:3000/activities` $\rightarrow$ `/activities/[id]`
- **UI Action**: Go to `/activities`, type `PIP-2458` in search bar, and click into the activity card.
- **Expected Result**:
  - Code: `PIP-2458`
  - Description: `Erect Line 24-XX`
  - Discipline: `Piping`
  - Location: `North Unit - Process Train A`
  - Planned Start: `2026-08-20`
  - Planned Finish: `2026-08-23`
  - Status: `NOT_STARTED`
  - Variance: `0 days`
- **Talking Point**:
  > *"Here is our golden demo activity: PIP-2458, erecting 24-inch line in North Unit. The baseline planned finish is August 23rd, 2026. Keep this baseline in mind as we submit real site updates."*

---

### Phase 5: Supervisor Activity Center
- **URL**: `http://localhost:3000/time-agent` (or switch role to Site Supervisor)
- **UI Action**: Navigate to `/time-agent` (or click Supervisor Center in navbar).
- **Expected Result**: Supervisor natural language update terminal and site diary interface displayed.
- **Talking Point**:
  > *"In the field, supervisors do not look up 8-digit Primavera codes. They type or speak natural updates as work occurs."*

---

### Phase 6: Deadline / Filter / Sort Demonstration
- **URL**: `http://localhost:3000/activities`
- **UI Action**: Filter by Discipline dropdown (`Piping`, `Electrical`, `Civil`) and sort by Planned Start date.
- **Expected Result**: Instant client-side filtering across all 890 activities without page reload.
- **Talking Point**:
  > *"Planners can slice and dice the entire schedule by discipline, location, and critical path deadlines with instantaneous responsive filtering."*

---

### Phase 7: Supervisor Report Submission (Time Agent)
- **URL**: `http://localhost:3000/time-agent`
- **UI Action**: Enter the exact site supervisor update:
  ```text
  24-XX spool erection started at 10:30 AM in North Unit.
  ```
  Click **Submit Progress Report**.
- **Expected Result**: Input submitted, loading spinner appears, and response card renders.
- **Talking Point**:
  > *"The supervisor submits a colloquial update: '24-XX spool erection started at 10:30 AM in North Unit.' Notice how informal this language is compared to the formal Primavera title."*

---

### Phase 8: AI Extraction Breakdown
- **URL**: `http://localhost:3000/time-agent` (Response Card)
- **UI Action**: Inspect the structured extraction card displayed in the UI.
- **Expected Result**:
  - `Discipline`: **Piping**
  - `Asset`: **Line 24-XX**
  - `Location`: **North Unit**
  - `Event Type`: **STARTED**
  - `Timestamp`: `10:30:00`
- **Talking Point**:
  > *"Google Gemini parses the unstructured report into normalized domain entities—identifying the engineering discipline, line tag, plant area, and progress event type."*

---

### Phase 9: Hybrid Multi-Factor Matching & Confidence
- **URL**: `http://localhost:3000/review`
- **UI Action**: Open the Review Queue. Highlight the candidate match card for `PIP-2458`.
- **Expected Result**:
  - Matched Activity: `PIP-2458` (*Erect Line 24-XX*)
  - Confidence Score: **`86.98%`** (High Confidence)
  - Sub-scores displayed:
    - Semantic Similarity: `74.0%`
    - Identifier Match (`24-XX`): `100.0%`
    - Discipline Match (`Piping`): `100.0%`
    - Location Match (`North Unit`): `100.0%`
- **Talking Point**:
  > *"Here is the core intelligence: our hybrid matcher doesn't rely solely on embeddings. It evaluates vector cosine similarity alongside asset tag heuristics, discipline validation, and plant coordinates, producing a transparent composite score of ~87%."*

---

### Phase 10: Planner Approval Action
- **URL**: `http://localhost:3000/review`
- **UI Action**: Click the **Accept Match** button on the `PIP-2458` card.
- **Expected Result**:
  - Card transitions smoothly with confirmation badge.
  - Item clears from pending review queue.
- **Talking Point**:
  > *"The human planner verifies the recommendation and clicks 'Accept'. In a single atomic database transaction, the match is approved, the activity is updated, and an immutable audit entry is written."*

---

### Phase 11: Actual Progress & Delay Calculation (+8 Days)
- **URL**: `http://localhost:3000/activities/[id]` (for `PIP-2458`)
- **UI Action**: Return to `PIP-2458` activity details page.
- **Expected Result**:
  - Status: **`COMPLETED`**
  - Actual Start: `2026-08-20`
  - Actual Finish: `2026-08-31`
  - Variance / Delay: **`+8 days delay`** (Red indicator)
  - Audit Trail: `MATCH_APPROVED` recorded with timestamp and planner identity.
- **Talking Point**:
  > *"Look at the real data update: Actual Finish is recorded as August 31st. The system dynamically computes 2026-08-31 minus 2026-08-23 = exactly +8 days delay, fully backed by an immutable audit trail."*

---

### Phase 12: Visual Progress & Discipline Analytics
- **URL**: `http://localhost:3000/dashboard`
- **UI Action**: Scroll to Discipline Progress bar charts and Milestone Gantt overview.
- **Expected Result**: Piping discipline completion bar updates; Gantt milestone indicates schedule slippage.
- **Talking Point**:
  > *"Executive stakeholders immediately see the ripple effect across engineering disciplines and project milestones without waiting for end-of-month manual reports."*

---

### Phase 13: Planner Time Agent & Conversational Querying
- **URL**: `http://localhost:3000/time-agent`
- **UI Action**: Query the system via Time Agent:
  ```text
  What is the current status and delay on Line 24-XX?
  ```
- **Expected Result**: Agent responds with live schedule intelligence: `PIP-2458 is COMPLETED with an 8-day delay.`
- **Talking Point**:
  > *"Planners can converse directly with the project schedule to query progress, identify delayed assets, and verify site execution history."*

---

### Phase 14: Final Dashboard & Persistence
- **URL**: `http://localhost:3000/dashboard`
- **UI Action**: Refresh the browser page (`F5` or `Ctrl+R`).
- **Expected Result**:
  - Total Activities: `890`
  - Completed: `1`
  - Delayed: `1` (Live from DB)
  - Pending Review: `0`
  - All values persist permanently from PostgreSQL without resetting.
- **Talking Point**:
  > *"We refresh the entire browser page—every metric, chart, and delay count persists live from Supabase. That is the power of ProgressBridge AI: turning messy field logs into auditable, schedule-linked project intelligence."*
