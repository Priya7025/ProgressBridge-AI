# PRD — Intelligent Data Capture & Schedule-Linking Platform

**Project / Working Name:** ProgressBridge AI
**Problem Statement:** SIH / OIL 26122
**Organization:** Oil India Limited (OIL)
**Theme:** Smart Automation
**Category:** Software
**Document Version:** 2.0
**Status:** MVP / Hackathon Build

**Changelog from v1.0:** Tech stack pivoted from a FastAPI + SQLAlchemy + Docker backend to a managed stack (Supabase + n8n + Vercel + Render) to fit the team's timeline and reduce infra overhead. Team-split section made flexible for a 2–4 person team. Security section rewritten around Supabase Auth/RLS instead of custom JWT middleware. All other sections (personas, functional requirements, data model, demo plan) carried over from v1.0 with light edits.

---

## 1. Product Overview

ProgressBridge AI is an intelligent data-capture and schedule-linking platform for infrastructure project execution.

The system converts fragmented field-progress inputs — daily reports, spreadsheets, site-diary text, supervisor updates — into structured activity events, then links those events to the project's L5/L6 schedule activities.

Core product flow:

```text
Messy Field Input
      ↓
Document / Text Ingestion            (n8n workflow)
      ↓
AI Information Extraction            (LLM, structured output)
      ↓
Activity / Entity Normalization
      ↓
Semantic Schedule Matching           (pgvector + hybrid scoring)
      ↓
Confidence Scoring
      ↓
Human Review when Needed
      ↓
Actual Progress Update               (Supabase, audited)
      ↓
Dashboard + Delay/Risk Insights
      ↓
Structured Institutional Memory
```

The MVP is designed for synthetic/sample project data and must demonstrate the end-to-end workflow without depending on live OIL project data.

---

## 2. Problem Statement

Infrastructure projects have detailed baseline schedules containing L5/L6 activities, but actual execution information is usually reported through disconnected sources:

- Daily progress reports
- Discipline-wise spreadsheets
- Site diaries
- Supervisor text updates
- Contractor reports
- Verbal/voice updates
- Primavera/MS Project exports

The same physical work may be described differently across these sources.

Example:

```text
Schedule:        "Erect Line 24-XX"
Field report:     "24-XX spool erected"
Supervisor:       "Pipe erection for 24-inch line completed"
Spreadsheet:      "Spool installation - North Unit"
```

These descriptions may refer to the same planned activity, but exact-text matching cannot reliably connect them.

This causes: delayed progress updates, manual reconciliation effort, incorrect or missing activity links, poor delay/risk analytics, and loss of execution knowledge after project closure.

---

## 3. Product Vision

Build a low-friction intelligent bridge between **project planning** and **field execution**.

The product should let a planner or supervisor provide execution information in whatever format is easiest for them, while the system converts it into trusted, auditable, schedule-linked progress data.

> "Capture what happened at site, understand what it means, link it to the plan, and continuously build an intelligent memory of project execution."

---

## 4. Goals

### 4.1 Primary Goals

1. Ingest heterogeneous field-progress inputs.
2. Extract activity-level execution events using AI.
3. Identify discipline, activity, asset/location, status, date, and time.
4. Semantically match extracted activities to L5/L6 schedule nodes.
5. Provide a confidence score for every match.
6. Route uncertain matches to human review.
7. Maintain an audit trail for every update.
8. Show planned vs actual progress.
9. Highlight delays, unmatched events, and exceptions.
10. Build a structured repository of historical execution events.

### 4.2 Secondary Goals

- Support text-based supervisor input via a conversational "time agent."
- Provide a voice-ready interface architecture.
- Support multiple project disciplines.
- Allow future integration with Primavera/MS Project/PMIS.
- Make the ingestion pipeline visually inspectable (n8n's canvas) as a demo and debugging aid, not just a black box.
- Provide a foundation for future productivity and delay analytics.

---

## 5. Non-Goals for MVP

Explicitly out of scope for the hackathon MVP:

- Full Primavera P6 or MS Project replacement
- Production-grade OCR for every document type
- Production-grade speech recognition
- Live OIL project integration
- Enterprise SSO / fine-grained RBAC (basic role-based access via Supabase Auth is in scope — see FR-20)
- Automated schedule modification without review
- Large-scale distributed processing
- Predictive project completion models
- Full OGC/industry-standard integrations
- Native mobile applications
- Multi-tenant enterprise deployment

These are candidates for future phases (see Section 25).

---

## 6. Target Users

**Site Supervisor** — needs low-friction reporting: what started, what finished, where, when, which discipline, optional delay reason.

**Project Planner** — needs trustworthy schedule-linked execution data: review extracted events, validate matches, update progress, investigate exceptions.

**Project Manager** — needs fast operational visibility: overall progress, delayed activities, discipline comparison, recurring issues, execution trends.

---

## 7. User Personas

**Persona A — Site Supervisor**
> "I don't want to fill a complicated form every time I complete a small activity."
Preferred interaction: `"Started hydro testing Line 24-XX at 10 AM."`

**Persona B — Planner**
> "I need to know which schedule activity this report belongs to and whether I can trust the match."
Preferred flow: `Extracted event → Suggested activity → Confidence → Accept / Reject / Change`

**Persona C — Project Manager**
> "I want to know what is happening, what is late, and why."
Preferred view: `Overall Progress · Discipline Progress · Delayed Activities · Unmatched Reports · Top Delay Causes · Recent Updates`

---

## 8. MVP Scope

The MVP must demonstrate the complete workflow using synthetic/sample data.

**Required input types (at least 3):**
1. CSV/Excel schedule
2. Free-text daily report
3. Discipline-wise spreadsheet

**Optional (time permitting):** PDF daily report, voice transcript (as text), image/scanned diary (pre-transcribed).

---

## 9. Core User Journey

**Journey 1 — Upload Schedule.** Planner uploads `schedule.xlsx`. System parses activity ID, WBS, description, discipline, planned start/finish, duration, location, parent activity — validates it and indexes activities (embeddings) for semantic search.

**Journey 2 — Upload Daily Report.** User uploads `daily_report.txt`. Example: *"Piping crew started erection of spool for Line 24-XX at 10:30 AM in North Unit. Hydro testing of Line 18-B was completed at 5 PM."* System extracts structured events:

```json
{
  "events": [
    {"discipline": "Piping", "activity_description": "spool erection", "asset": "Line 24-XX", "location": "North Unit", "status": "STARTED", "event_time": "10:30"},
    {"discipline": "Piping", "activity_description": "hydro testing", "asset": "Line 18-B", "location": null, "status": "COMPLETED", "event_time": "17:00"}
  ]
}
```

**Journey 3 — Semantic Matching.** System compares each event against schedule activities:

```text
Report: "spool erection for Line 24-XX"
PIP-2458 — Erect Line 24-XX       94%
PIP-2512 — Fabricate Line 24-XX   61%
PIP-3144 — Hydrotest Line 24-XX   42%
```

**Journey 4 — Human Review.** For medium-confidence matches (70–89%), the reviewer sees the suggestion and can Accept / Reject / Choose Another.

**Journey 5 — Progress Update.** After approval, actual start/finish dates update on the activity, delay is calculated, and the dashboard refreshes automatically.

---

## 10. Functional Requirements

**FR-01 Project Creation** — name, code, client/organization, start date, planned finish date.

**FR-02 Schedule Upload** — accepts `.xlsx`, `.xls`, `.csv`. Required columns: `activity_id, wbs, activity_description, discipline, planned_start, planned_finish`. Optional: `location, parent_activity, duration, predecessors, responsible_contractor`.

**FR-03 Schedule Validation** — required columns exist, dates valid, activity IDs unique, empty descriptions flagged, invalid rows reported with a downloadable error report.

**FR-04 Schedule Indexing** — every L5/L6 activity indexed for semantic retrieval using normalized text, discipline, location, asset/entity identifiers, and an embedding vector (stored in Supabase via `pgvector`).

**FR-05 Report Ingestion** — accepts plain text, CSV, Excel, PDF text extraction. Every source retains metadata: `source_id, filename, source_type, uploaded_by, uploaded_at, project_id`.

**FR-06 Text Extraction** — AI layer identifies activity/action, discipline, start/finish event, date, time, asset/equipment/line number, location, quantity (if stated), status, delay reason (if stated).

**FR-07 Structured Event Output** — all extracted info converted into typed JSON:

```json
{"discipline": "Civil", "activity_description": "foundation concreting", "asset": "Pump P-101 foundation", "location": "Unit A", "event_type": "COMPLETED", "event_date": "2026-08-29", "event_time": "17:00", "quantity": null, "delay_reason": null, "source_id": "DOC-001"}
```

**FR-08 Semantic Matching** — retrieve candidates, rank by semantic similarity, apply discipline/entity constraints, return top-N candidates with a final match confidence. Signals: semantic similarity + identifier match + discipline match + location match.

**FR-09 Confidence Classification** — configurable thresholds, default: `≥90% high confidence`, `70–89% review required`, `<70% unmatched / manual selection`.

**FR-10 Human-in-the-Loop Review** — reviewer can accept, reject, select a different activity, mark as new/unplanned, correct extracted fields, add comments. Every change logged.

**FR-11 Actual Start/Finish Logic** — maintains actual start, actual finish, current status, last updated at. State model: `NOT_STARTED → STARTED → IN_PROGRESS → COMPLETED`, optionally `ON_HOLD / CANCELLED / BLOCKED`.

**FR-12 Delay Calculation** — completed: `Actual Finish − Planned Finish`. Ongoing: `Current Date − Planned Finish` (expected delay). MVP distinguishes on time / early / delayed / at risk.

**FR-13 Audit Trail** — every progress update records `event_id, source_id, activity_id, previous_value, new_value, confidence, approved_by, approved_at, reason/comment`. Original source text is never deleted.

**FR-14 Dashboard** — project KPIs (total, completed, in progress, not started, delayed, unmatched, pending review), discipline KPIs (Civil, Piping, Mechanical, Electrical, Instrumentation, HSE), recent events feed.

**FR-15 Planned vs Actual Timeline** — per activity: planned start/finish, actual start/finish, delay days, shown as a simple timeline bar.

**FR-16 Unmatched Activities Queue** — dedicated queue for low-confidence events; the system must never silently discard an unmatched report.

**FR-17 Delay Reason Capture** — extracts and normalizes stated delay reasons: material unavailable, equipment breakdown, manpower shortage, weather, design change, permit delay, access issue, safety hold.

**FR-18 Search** — by activity ID, description, discipline, location, line/equipment, event, or source document.

**FR-19 Conversational / Voice-Ready Input** — MVP implements a text "time agent" (e.g. *"Completed valve installation on line 18B at 4 PM."*) processed through the same extraction/matching pipeline. Swapping in real speech-to-text is a Phase 2 change, not an architecture change.

**FR-20 Authentication & Roles** *(new in v2.0)* — Supabase Auth (email/password or magic link). Two MVP roles: `supervisor` (submit reports/time-agent messages, see own submissions) and `planner` (see full review queue, approve/override matches, view dashboard). Enforced via Postgres Row-Level Security policies keyed on `project_id` and role — not custom middleware.

---

## 11. AI/ML Requirements

**11.1 LLM Extraction** — must return structured data, not free prose. Prompt requires a JSON schema, `null` for missing values, no invented facts, and the original evidence span where possible.

**11.2 Embedding Search** — every schedule activity gets an embedding. Suggested embedding input: `discipline | activity_description | location | asset | WBS`, e.g. `"Piping | Erect Line 24-XX | North Unit | Line 24-XX"`.

**11.3 Hybrid Matching** — do not rely on LLM judgment alone.

```text
Extract Event → Normalize entities → Metadata filtering → Vector similarity search (pgvector)
→ Keyword/identifier checks → Weighted score → Top candidate → Confidence
```

Example scoring weights (configurable): Semantic similarity 50%, Identifier match 25%, Discipline match 15%, Location match 10%.

**11.4 Explainable Match** — every suggested match shows why:

```text
✓ Same discipline: Piping
✓ Same line number: 24-XX
✓ Similar activity wording
✓ Same location: North Unit
Confidence: 94%
```

---

## 12. Recommended Technical Architecture

```text
                              FRONTEND
        ┌───────────────────────────────────────────┐
        │ Next.js + TypeScript + Tailwind + shadcn   │
        │ Dashboard / Upload / Review / Time Agent   │
        │ Deployed on Vercel                         │
        └───────────────┬─────────────────┬──────────┘
                         │                 │
             Supabase client SDK      Webhook calls
             (auth, reads, RLS)       (ingestion/extraction/matching)
                         │                 │
                         ▼                 ▼
              ┌────────────────┐   ┌──────────────────┐
              │    Supabase    │   │       n8n         │
              │ Postgres +     │◄──┤ Ingestion workflow │
              │ pgvector       │   │ Extraction (LLM)   │
              │ Auth + RLS     │──►│ Matching workflow  │
              │ Storage        │   │ Self-hosted on     │
              └────────────────┘   │ Render             │
                         │         └──────────────────┘
                         ▼
                Audit Log · Analytics · Institutional Memory
```

**Why this shape:** n8n owns the messy part of the pipeline (parsing varied formats, calling the LLM for extraction, running the matching workflow) where a visual, editable workflow is genuinely useful — both for iterating fast during the hackathon and as a demo artifact judges can see running live. Supabase owns data, auth, and vector search in one place, so there's no separate vector DB or auth service to stand up. The frontend talks to Supabase directly for anything read-heavy (dashboard, activity list) and only hits n8n for actions that need the extraction/matching pipeline (new report, time-agent message).

If a step in matching needs more custom logic than n8n's nodes comfortably express (e.g. a weighted-scoring function), it's fine to drop a small serverless function (Vercel Edge/Node function, or a Supabase Edge Function) in front of that one step rather than introducing a whole second backend service — see Development Principle #2 in Section 30.

---

## 13. Proposed Tech Stack

**Frontend**
- Next.js (React + TypeScript)
- Tailwind CSS + shadcn/ui
- TanStack Query
- React Hook Form + Zod
- Recharts

**Backend / Orchestration**
- n8n (self-hosted on Render, or n8n Cloud free tier if you'd rather skip DevOps) — ingestion, extraction, matching workflows
- Vercel serverless/edge functions or Supabase Edge Functions for any logic that doesn't fit n8n cleanly (e.g. the live time-agent chat round-trip, which should skip n8n's extra hop for responsiveness)

**Data, Auth & Vector Search**
- Supabase: Postgres, `pgvector` extension, Auth (email/password or magic link), Storage (uploaded files), Row-Level Security for role enforcement

**AI**
- LLM API with structured/JSON output (extraction + match verification/explanation)
- Embeddings API or `sentence-transformers` (local) for schedule-activity vectors
- Prompt templates version-controlled in `docs/prompts/`

**Data Processing (inside n8n or a lightweight function)**
- pandas / openpyxl equivalents as needed for spreadsheet parsing (n8n has native CSV/spreadsheet nodes for most of this)
- PyMuPDF / pdfplumber only if PDF ingestion is attempted (P1, not P0)

**Hosting**
- Vercel — frontend + any Next.js API routes
- Render — self-hosted n8n
- Supabase managed infra — Postgres, Auth, Storage (nothing to deploy)

**Development**
- Git + GitHub, trunk-based with short-lived feature branches
- Claude Code / Antigravity for agentic coding
- Stitch for initial UI generation
- Shared prompt templates as a lightweight "skill" so extraction/matching prompts stay consistent across contributors

---

## 14. API & Workflow Requirements

Endpoints below can be implemented as Next.js API routes, Supabase RPC functions, or n8n webhook URLs — pick whichever fits each one; the contract (request/response shape) is what matters, not which layer serves it.

```http
POST /api/projects
GET  /api/projects
GET  /api/projects/{project_id}

POST /api/projects/{project_id}/schedule/upload
GET  /api/projects/{project_id}/activities
GET  /api/activities/{activity_id}

POST /api/projects/{project_id}/documents        # or n8n webhook
GET  /api/projects/{project_id}/documents
GET  /api/documents/{document_id}

POST /api/documents/{document_id}/extract         # n8n workflow trigger
GET  /api/documents/{document_id}/events

POST /api/events/{event_id}/match                 # n8n workflow trigger
GET  /api/events/{event_id}/candidates

POST /api/events/{event_id}/approve
POST /api/events/{event_id}/reject
POST /api/events/{event_id}/override

GET /api/projects/{project_id}/dashboard
GET /api/projects/{project_id}/delays
GET /api/projects/{project_id}/unmatched
GET /api/projects/{project_id}/recent-events
```

**Response shape (kept consistent everywhere):**

```json
// success
{"success": true, "data": {}}
// error
{"success": false, "error": {"code": "VALIDATION_ERROR", "message": "Human readable", "fields": {}}}
```

---

## 15. Data Model

**Project** — `id, name, code, organization, planned_start, planned_finish, created_at, updated_at`

**Schedule Activity** — `id, project_id, activity_id, wbs, level, description, discipline, location, asset, planned_start, planned_finish, duration, status, actual_start, actual_finish, embedding`

**Document** — `id, project_id, filename, source_type, mime_type, raw_text, uploaded_by, uploaded_at`

**Progress Event** — `id, project_id, document_id, discipline, activity_description, asset, location, event_type, event_date, event_time, quantity, delay_reason, extraction_confidence, match_confidence, status, created_at`

**Activity Match** — `id, event_id, activity_id, semantic_score, identifier_score, discipline_score, location_score, final_score, match_status, reviewed_by, reviewed_at`

**Audit Log** — `id, event_id, activity_id, action, old_value, new_value, user_id, comment, created_at`

**User** *(new in v2.0, from Supabase Auth)* — `id, email, role (supervisor | planner), project_ids[], created_at` — role and project access enforced via RLS policy, not application code.

---

## 16. UI/UX Requirements

**Main navigation:** Dashboard · Projects · Schedule · Reports · AI Extraction · Review Queue · Activities · Analytics · Audit Log · Settings

**Dashboard:** KPI cards (total, completed, in progress, delayed, pending review, unmatched); charts for progress by discipline, planned vs actual, delay distribution, recent events.

**Upload page:** drag-and-drop, supports XLSX/CSV/TXT/PDF, shows live status (`Parsing… → Extracting… → Matching…`).

**AI Review page:** three-column layout — Source (original report) → Extracted Event (discipline, activity, status, time) → Schedule Match (suggested activity, confidence, reasons) — with Accept / Reject / Change Match actions.

**Activity Details:** activity ID, description, discipline, planned dates, actual dates, status, delay, source reports, audit history.

---

## 17. Security & Data Handling

For the MVP, security rides on Supabase's managed primitives rather than custom middleware — this is both less work and more defensible in a demo:

- **Auth:** Supabase Auth issues and manages tokens; no custom JWT signing/rotation code needed.
- **Authorization:** Row-Level Security policies on every table, scoped by `project_id` and `role` — a supervisor cannot read another project's data or another user's unapproved events by construction, not by a controller-level check.
- **Secrets:** stored in Vercel/Render/Supabase/n8n's own environment variable dashboards — never committed. Commit only `.env.example` files with placeholder values.
- **File uploads:** validate type and size before accepting; sanitize filenames; Supabase Storage bucket policies restrict access by project/role the same way RLS does for the database.
- **Logging:** never log secrets, tokens, or full request bodies from uploaded documents containing potentially sensitive text.
- **No real OIL production data** at any point — synthetic/sample/anonymized data only, per the problem statement's data-sharing terms.

**Explicitly out of scope for MVP:** enterprise SSO, encryption-at-rest configuration beyond Supabase defaults, formal penetration testing, compliance/retention policy — flagged as Phase 3 items (Section 25).

---

## 18. Performance Requirements — MVP

- Schedule upload: < 10 seconds for a typical demo dataset
- Text extraction: < 10 seconds per report
- Candidate matching: < 3 seconds per event
- Dashboard load: < 2 seconds
- Support at least 500–1,000 schedule activities comfortably in the demo dataset (pgvector handles far more; this is a demo-scale target, not a ceiling)
- UI must stay usable with hundreds of extracted events

---

## 19. Error Handling

**Invalid schedule:** report the missing required column(s) and offer a downloadable error report.
**Unreadable document:** "Could not extract text — unsupported/corrupted format."
**AI extraction failure:** show `[Retry]` and `[Enter Manually]`.
**Low-confidence match:** "No reliable match found — `[Review Manually]`."
**Duplicate event:** flag potential duplicates rather than silently creating duplicate progress updates.

---

## 20. AI Safety / Trust Rules

The AI must never silently invent dates, activity IDs, quantities, or delay reasons, and must never auto-map an uncertain activity.

```text
Missing information → null / "Unknown"
Low confidence      → human review
Ambiguous match     → show alternatives
Every update        → audit trail
```

---

## 21. Demo Dataset

```text
Project: OIL Demo Refinery Expansion
Activities: 500–1,000 L5/L6 activities
Disciplines: Civil, Piping, Mechanical, Electrical, Instrumentation, HSE
```

Sample inputs: `schedule.xlsx`, `daily_report_01.txt`, `daily_report_02.txt`, `piping_progress.xlsx`, `civil_progress.xlsx`.

Include intentionally difficult cases: exact wording, different wording for the same activity, abbreviations, missing schedule match, multiple possible matches, different disciplines, delay reason present, start event, completion event, duplicate-like reports.

---

## 22. Example End-to-End Demo

```text
Schedule:  PIP-2458 — Erect Line 24-XX — Piping — 20-Aug → 23-Aug
Report:    "24-XX spool erection started at 10:30 AM in North Unit."
Extracted: Discipline: Piping | Activity: spool erection | Asset: Line 24-XX
           Location: North Unit | Status: STARTED | Time: 10:30 AM
Matched:   PIP-2458, Confidence 94%
Approved:  [Accept] → Actual Start: 29-Aug 10:30, Status: In Progress

Second report: "Line 24-XX erection completed on 31-Aug."
Result:    Actual Finish: 31-Aug | Planned Finish: 23-Aug | Delay: 8 days
Dashboard: Delayed Activities: 1 | Piping Progress: 67%
```

---

## 23. Analytics — MVP

**Delay analytics:** activity, planned finish, actual finish, delay days.
**Discipline performance (example):** Civil 82% · Piping 67% · Mechanical 74% · Electrical 79%.
**Delay reasons (example):** Material 35% · Manpower 22% · Equipment 18% · Permit 15% · Other 10%.
**Data quality:** high-confidence matches 72% · needs review 20% · unmatched 8%.

---

## 24. Institutional Memory

Every approved execution event becomes structured historical data. Future query examples: *"Show average actual duration for hydrotesting activities"* or *"Which delay reasons occur most frequently for piping work?"* The MVP doesn't need forecasting models, but the data model must preserve what future learning would need.

---

## 25. Future Roadmap

**Phase 1 — Hackathon MVP:** schedule upload, daily report upload, Excel/CSV support, AI extraction, embedding matching, human review, confidence score, dashboard, planned vs actual, audit trail.

**Phase 2 — Pilot:** PDF ingestion, OCR, real voice interface, better duplicate detection, Primavera P6 / MS Project integration, finer-grained roles, advanced analytics.

**Phase 3 — Production:** PMIS integration, real-time field updates, mobile/PWA, enterprise SSO, full RBAC, high-scale processing, model monitoring, delay prediction, productivity forecasting, cross-project institutional memory.

---

## 26. Success Metrics

**MVP success** when: schedule uploads and indexes; 2–3 heterogeneous input formats process correctly; AI extracts meaningful events; events link to schedule activities; confidence scores display; low-confidence events enter review; approved events update progress; planned vs actual is visible; audit trail is visible; the full flow demos end-to-end.

**Target demo accuracy (synthetic test set):** field/event extraction accuracy >90%, top-1 schedule match accuracy >85%, high-confidence match precision >90%. Engineering targets for the MVP, not production claims.

---

## 27. Acceptance Criteria

```text
1. User creates a project.
2. User uploads schedule.xlsx — system validates and indexes activities.
3. User uploads a daily report.
4. AI extracts multiple activity events.
5. System returns top schedule matches with confidence scores.
6. User reviews medium/low-confidence events.
7. User accepts or overrides matches.
8. Actual dates/status update.
9. Dashboard recalculates project progress; delayed activities are highlighted.
10. Original source and audit trail remain accessible.
```

---

## 28. Hackathon Priorities

**P0 — Must have:** schedule ingestion, Excel/CSV ingestion, text report ingestion, AI extraction, semantic matching, confidence score, review workflow, activity update, dashboard, audit trail.

**P1 — Should have:** PDF ingestion, voice-transcript input (as text), delay reason extraction, planned vs actual charts, search.

**P2 — Nice to have:** OCR, actual speech-to-text, Primavera integration mock, predictive delay analytics, advanced institutional-memory search.

---

## 29. Recommended Team Split

Scales from 2 to 4 people — pair up rows if your team is smaller.

**Ingestion & Extraction** — n8n workflows for each input format, LLM extraction prompts, structured-output validation.

**Matching & Data** — pgvector setup, hybrid scoring logic, Supabase schema and RLS policies, audit trail writes.

**Frontend & Time Agent** — Next.js dashboard, upload UI, review UI, activity detail, charts, the conversational time-agent interface.

**Integration, Data & Demo** *(if a 4th person is available)* — synthetic dataset creation, end-to-end integration testing, deployment (Vercel/Render/Supabase config), demo script, documentation/README.

For a 2-person team: one person owns Ingestion & Extraction + Matching & Data; the other owns Frontend & Time Agent + Integration/Demo.

---

## 30. Development Principles

1. Build end-to-end before adding features.
2. Prefer managed services (Supabase, Vercel, Render) and n8n's built-in nodes over custom infrastructure — a hackathon is not the place to hand-roll what a managed service already does well.
3. Use structured AI output — never unrestricted prose from the LLM.
4. Use hybrid matching, not LLM-only matching.
5. Keep a human in the loop for uncertainty.
6. Never silently discard unmatched data.
7. Preserve source evidence and audit history.
8. Use synthetic data for the hackathon — no real OIL data.
9. Keep production integrations (Primavera, PMIS) as adapters/interfaces, not hard dependencies.
10. Optimize for a reliable live demo first.

---

## 31. Definition of Done

- The application is reachable via a deployed URL (Vercel frontend); no local-only setup required for the demo.
- Demo data can be loaded into Supabase quickly (a seed script or SQL file in the repo).
- Schedule upload works.
- Reports can be uploaded and processed via the n8n pipeline.
- AI extraction works on the prepared dataset.
- Semantic matching produces useful candidates.
- Review workflow works.
- Progress updates reflect immediately on the dashboard.
- Dashboard shows meaningful KPIs.
- Audit history is visible.
- At least one difficult/unmatched example is demonstrated live.
- No API keys or secrets are committed to Git — verified `.gitignore` and `.env.example` only.
- README contains setup, architecture, sample data, and demo instructions.

---

## 32. Final Product Statement

> **ProgressBridge AI is an intelligent planning-to-execution bridge that transforms heterogeneous field reports into structured, auditable, schedule-linked project progress data using AI-powered extraction and semantic activity matching.**

The MVP focuses on one critical capability:

> **Turn "what the site team said happened" into "which planned activity actually happened, when, and with what confidence."**
