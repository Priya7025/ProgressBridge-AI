# ProgressBridge AI

> **Intelligent Data Capture & Schedule-Linking Layer for Infrastructure Project Management**  
> *Real-Time Actual Progress Tracking (Planning-to-Execution Bridge)*

**SIH 2026 — Problem Statement 26122**  
**Organization:** Oil India Limited (OIL)  
**Theme:** Smart Automation | **Category:** Software  

---

## 1. Project Overview

**ProgressBridge AI** resolves one of the most critical challenges in infrastructure and industrial engineering: the disconnect between high-level project master schedules (Primavera P6 / Level 5 & Level 6 WBS) and unstructured, messy daily site updates.

In mega-projects (refineries, pipelines, power plants, offshore platforms), progress data arrives daily through site diaries, unstructured WhatsApp/voice logs, supervisor shift reports, and subcontractor spreadsheets. Because site vocabulary rarely matches formal Primavera activity descriptions, planners spend days manually reconciling records, causing progress reporting delays, inaccurate EVM (Earned Value Management), and unmitigated schedule slippages.

ProgressBridge AI automates this entire lifecycle:
1. **Intelligent Extraction:** Converts unstructured text/multimodal site logs into structured event payloads using Google Gemini.
2. **Hybrid Multi-Factor Matching:** Matches field events to schedule activities using a 4-factor scoring algorithm (50% Semantic Embeddings + 25% Asset/Identifier + 15% Discipline + 10% Location).
3. **Human-in-the-Loop Review:** Routes uncertain matches to planners with transparent sub-score breakdowns for one-click approval or manual override.
4. **Schedule-Linked Analytics:** Updates actual dates (`actual_start`, `actual_finish`), calculates delay variances against planned baselines, dynamically refreshes executive dashboards, and logs immutable audit trails.

---

## 2. Key Features

- **Multi-Source Progress Ingestion:** Ingests daily site diaries, structured CSVs, and interactive Time Agent reports.
- **Multilingual & Field Vocabulary Extraction:** Leverages Gemini to isolate disciplines (Piping, Civil, Electrical, etc.), equipment/line tags, locations, event types (STARTED, IN_PROGRESS, COMPLETED), and timestamps.
- **pgvector Multi-Factor Schedule Matcher:** Combines dense vector similarity with deterministic heuristic bonuses for exact asset tag, discipline, and plant area matches.
- **Planner Review & Approval Center:** High-transparency cards showing overall confidence alongside individual sub-score badges.
- **Automated Delay & Variance Tracking:** Dynamically calculates schedule variances (`actual_finish - planned_finish`) without hardcoding.
- **Executive BI Dashboard:** Live SQL aggregation (`project_dashboard_summary`) displaying project health KPIs, discipline completion percentages, and milestone variance.
- **Immutable Audit Trail:** Append-only logging capturing every match creation, approval, timestamp, and before/after state diff.
- **Demo Reset Capability:** One-click / API-driven reset returning the system to a clean baseline while preserving all 890 baseline Primavera schedule activities.

---

## 3. Architecture & Major Components

```text
┌─────────────────────────────────────────────────────────────────────────────┐
│                            FIELD INGESTION LAYER                            │
│  Daily Site Reports │ Shift Diaries │ Time Agent Interface │ CSV Upload     │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │
                                       ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                      EXTRACTION & NORMALIZATION ENGINE                      │
│        n8n Workflow Webhooks ──► Google Gemini Structured Extraction        │
│        Output: { discipline, asset, location, event_type, event_date }      │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │
                                       ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                       HYBRID SCHEDULE MATCHING LAYER                        │
│   • Semantic Vector Similarity (Voyage AI / pgvector cosine distance: 50%)  │
│   • Asset / Line Identifier Match (25%)                                     │
│   • Engineering Discipline Match (15%)                                      │
│   • Plant Location / Unit Area Match (10%)                                  │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │
                                       ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                       PLANNER TRUST & REVIEW QUEUE                          │
│   • Confidence Score Banding (High / Medium / Low)                          │
│   • One-Click Accept / Reject / Override Review Queue                       │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │
                                       ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                   PERSISTENCE & AUDITABLE PROJECT INTELLIGENCE              │
│   • Supabase PostgreSQL (schedule_activities, progress_events, audit_log)  │
│   • Executive Next.js Dashboard & Gantt Milestone Views                     │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 4. Demo Roles & Authentication

The platform provides role-based access control (RBAC) via Supabase Auth and Postgres Row-Level Security:

| Role | Demo Account | Permissions & View Scope |
|---|---|---|
| **Project Planner (Reviewer)** | `pbchauhan246@gmail.com` | Full administrative access: `/dashboard`, `/activities`, `/review`, `/upload`, `/time-agent` |
| **Site Supervisor (Field Agent)** | `priyachauhan320224@gmail.com` | Field execution access: `/time-agent` and document upload |

*(Credentials are pre-configured in the project environment; consult team lead for rehearsal passwords).*

---

## 5. Golden Acceptance Flow (`PIP-2458`)

The canonical end-to-end verification scenario uses activity **`PIP-2458`**:

1. **Schedule Baseline:** `PIP-2458` (*Erect Line 24-XX*, Piping, North Unit) planned for `2026-08-20` $\rightarrow$ `2026-08-23`. Status: `NOT_STARTED`.
2. **Supervisor Submission:** Report sent via Time Agent:
   ```text
   24-XX spool erection started at 10:30 AM in North Unit.
   ```
3. **AI Extraction:** Gemini extracts structured event (`Discipline: Piping`, `Asset: Line 24-XX`, `Location: North Unit`, `Type: STARTED`).
4. **Hybrid Matching:** Matcher scores candidate `PIP-2458` at **`86.98%`** confidence (Semantic: 74.0%, ID: 100%, Disc: 100%, Loc: 100%).
5. **Review & Approval:** Planner accepts match in `/review`.
6. **Actual Progress Update:** Status updates to `COMPLETED`, `actual_start: 2026-08-20`, `actual_finish: 2026-08-31`.
7. **Delay Impact:** Dynamic formula calculates **+8 days delay** (`2026-08-31` - `2026-08-23`).
8. **Dashboard & Audit:** Executive dashboard increments delayed count; audit trail records `MATCH_APPROVED`.

---

## 6. Setup & Local Development

### Prerequisites
- Node.js 18+ & npm
- Python 3.10+
- Access to Supabase Project

### Environment Configuration
Create `frontend/.env.local` with the following variables:

```env
NEXT_PUBLIC_SUPABASE_URL=https://<your-supabase-project>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<your-supabase-anon-key>
SUPABASE_SERVICE_ROLE_KEY=<your-supabase-service-role-key>
NEXT_PUBLIC_DEMO_PROJECT_ID=1c1711c7-11f8-43f0-babe-e6a7cefe1ad4
INGESTION_WEBHOOK_URL=https://<n8n-host>/webhook/ingest-text
N8N_WEBHOOK_BASE_URL=https://<n8n-host>/webhook
VOYAGE_API_KEY=<your-voyage-or-gemini-key>
```

### Running the Frontend
```powershell
cd frontend
npm install
npm run dev
```
Open `http://localhost:3000` in your web browser.

---

## 7. Quality Gates & Test Execution

### 1. Automated 12-Step E2E Golden Acceptance Suite
Validates baseline schedule, report ingestion, extraction, hybrid matching, approval state transition, delay calculation (+8d), live SQL aggregations, audit logs, 4 negative test cases (ambiguous, unknown activity, malformed input, duplicate submission), and demo reset:
```powershell
python tests/e2e/e2e_golden_flow_test.py
```

### 2. Real Browser CDP Automation Suite (Chrome & Edge)
Launches real headless Chrome and Edge browser processes to verify UI rendering, login, search, Time Agent forms, review cards, and upload dropzones:
```powershell
python tests/e2e/browser_cdp_test.py
```

### 3. Code Quality & Build Checks
```powershell
# Frontend Typecheck, Lint & Production Build
cd frontend
npm run typecheck
npm run lint
npm run build

# Python Ruff Linter
cd ..
python -m ruff check data/scripts tests
```

---

## 8. Resetting Demo State

To return the application to a clean baseline state before presentations (preserving all 890 Primavera schedule activities while clearing dynamic events and matches):

```powershell
# Via API Endpoint:
curl -X POST http://localhost:3000/api/demo/reset -H "Content-Type: application/json" -d "{\"projectId\":\"1c1711c7-11f8-43f0-babe-e6a7cefe1ad4\"}"
```

---

## 9. Known Limitations

- **Sandboxed Agent Environments:** Headless Playwright driver auto-downloads may be restricted in sandboxed CI runners; direct CDP automation (`tests/e2e/browser_cdp_test.py`) or manual browser execution should be used.
- **External Webhook Latency:** If hosted n8n webhooks experience network cold starts, local fallback handlers automatically ensure test continuity.
