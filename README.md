# ProgressBridge AI

> **Intelligent Data Capture & Schedule-Linking Layer for Infrastructure Project Management**

**SIH 2026 — Problem Statement 26122**  
**Organization:** Oil India Limited (OIL)  
**Theme:** Smart Automation  
**Category:** Software  
**Status:** Hackathon MVP

---

## 1. Overview

ProgressBridge AI bridges the gap between **project planning** and **field execution**.

Infrastructure projects maintain detailed L5/L6 schedules, but actual execution information often arrives through daily reports, spreadsheets, site diaries, supervisor updates, and verbal/voice updates. The same physical work can be described in many different ways.

ProgressBridge AI converts these heterogeneous inputs into structured execution events, links them to the most likely schedule activities using AI-powered extraction and hybrid semantic matching, routes uncertain matches to a human reviewer, and updates actual progress with a complete audit trail.

### Core idea

> **Turn "what the site team said happened" into "which planned activity actually happened, when, and with what confidence."**

The MVP uses synthetic/sample data and does not depend on live OIL production data.

---

## 2. Problem

Traditional project reporting creates a planning-to-execution gap:

- Progress data is distributed across multiple formats.
- Field descriptions rarely match schedule descriptions exactly.
- Planners spend time manually reconciling reports with schedule activities.
- Uncertain matches can lead to incorrect progress updates.
- Delays and exceptions are discovered late.
- Historical execution knowledge is difficult to reuse.

### Example

The same work may appear as:

```text
Schedule:        Erect Line 24-XX
Field report:    24-XX spool erection started
Supervisor:      Pipe erection for 24-inch line
Spreadsheet:     Spool installation - North Unit
```

A simple exact-text search cannot reliably identify that all of these refer to the same planned activity.

---

## 3. Solution

ProgressBridge AI creates an intelligent pipeline:

```text
┌─────────────────────┐
│  Field Inputs       │
│                     │
│ Daily reports       │
│ CSV / Excel         │
│ Site diary text     │
│ Supervisor updates  │
│ Time Agent          │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│ Ingestion            │
│ n8n Workflow         │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│ AI Extraction        │
│ Structured JSON      │
│ Gemini / LLM         │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│ Normalization        │
│ Activity / Entity    │
│ Discipline / Asset   │
│ Location / Status    │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│ Hybrid Matching      │
│                     │
│ pgvector similarity  │
│ + identifier        │
│ + discipline        │
│ + location           │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│ Confidence Score     │
└──────────┬──────────┘
           │
      ┌────┴─────┐
      │          │
      ▼          ▼
 High confidence  Review
      │          │
      │          ▼
      │    Human decision
      │    Accept / Reject
      │    Change match
      └────┬─────┘
           │
           ▼
┌─────────────────────┐
│ Actual Progress      │
│ Status / Dates       │
│ Delay Calculation    │
│ Audit Trail          │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│ Dashboard            │
│ Progress / Delays    │
│ Discipline KPIs      │
│ Exceptions           │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│ Institutional Memory │
│ Structured execution │
│ history              │
└─────────────────────┘
```

---

## 4. Key Features

### Schedule Management

- Upload `.xlsx`, `.xls`, or `.csv` schedules.
- Validate required columns.
- Detect invalid dates and duplicate activity IDs.
- Store L5/L6 activities.
- Generate/index embeddings for semantic retrieval.

### AI Report Extraction

Extracts structured fields from unstructured reports:

- Discipline
- Activity description
- Asset / equipment / line
- Location
- Event type
- Event date
- Event time
- Quantity when stated
- Delay reason when stated
- Source document

Example:

```json
{
  "discipline": "Piping",
  "activity_description": "spool erection",
  "asset": "Line 24-XX",
  "location": "North Unit",
  "event_type": "STARTED",
  "event_date": "2026-08-20",
  "event_time": "10:30"
}
```

### Hybrid Schedule Matching

The system does not rely on an LLM alone.

It combines:

```text
Semantic similarity
        +
Identifier / asset matching
        +
Discipline matching
        +
Location matching
        ↓
Weighted final confidence
```

Reference scoring model:

```text
Semantic similarity  → 50%
Identifier match     → 25%
Discipline match     → 15%
Location match       → 10%
```

### Human-in-the-Loop Review

Uncertain matches are sent to a review queue.

The reviewer can:

- Accept the suggested match
- Reject the match
- Select another schedule activity
- Mark the event as new/unplanned
- Correct extracted fields
- Add a comment

### Actual Progress

Approved events can update:

- Actual start
- Actual finish
- Current status
- Last updated timestamp

Typical lifecycle:

```text
NOT_STARTED
     ↓
STARTED
     ↓
IN_PROGRESS
     ↓
COMPLETED
```

Optional states include:

```text
ON_HOLD / CANCELLED / BLOCKED
```

### Delay Tracking

For completed activities:

```text
Delay = Actual Finish − Planned Finish
```

The dashboard can highlight:

- On-time activities
- Early activities
- Delayed activities
- At-risk activities

### Audit Trail

Every approved change preserves:

- Source event
- Source document
- Activity
- Previous value
- New value
- Confidence
- Reviewer
- Timestamp
- Review comment

Original source evidence is retained.

### Dashboard

Project-level visibility includes:

- Total activities
- Completed
- In progress
- Not started
- Delayed
- Pending review
- Unmatched
- Discipline progress
- Recent execution events
- Planned vs actual progress
- Delay insights

### Time Agent

Supervisors can submit natural-language updates instead of filling rigid forms.

Example:

```text
Completed valve installation on Line 18-B at 4 PM.
```

The message follows the same extraction and matching pipeline.

The MVP implements a text interface; real speech-to-text can be added later without changing the core architecture.

---

## 5. Technology Stack

### Frontend

- Next.js
- React
- TypeScript
- Tailwind CSS
- shadcn/ui
- TanStack Query
- React Hook Form
- Zod
- Recharts

### Backend / Orchestration

- n8n
- Next.js API routes where appropriate
- Supabase Edge Functions where appropriate

### Database / Authentication / Vector Search

- Supabase
- PostgreSQL
- `pgvector`
- Supabase Auth
- Supabase Storage
- Row-Level Security (RLS)

### AI

- Gemini / LLM API for structured extraction and match reasoning
- Embeddings API for schedule activity vectors
- Version-controlled prompts

### Hosting

```text
Vercel
  → Next.js frontend + API routes

Render
  → n8n orchestration

Supabase
  → PostgreSQL + pgvector + Auth + Storage
```

---

## 6. Architecture

```text
                    ┌─────────────────────────┐
                    │       USER / TEAM       │
                    │                         │
                    │ Supervisor / Planner    │
                    │ Project Manager         │
                    └────────────┬────────────┘
                                 │
                                 ▼
                    ┌─────────────────────────┐
                    │       NEXT.JS           │
                    │                         │
                    │ Dashboard               │
                    │ Schedule Upload         │
                    │ Reports                 │
                    │ Review Queue            │
                    │ Activity Details        │
                    │ Time Agent              │
                    └───────┬─────────┬───────┘
                            │         │
                 Supabase   │         │ Pipeline actions
                  reads     │         │
                            ▼         ▼
                  ┌────────────┐  ┌────────────┐
                  │ SUPABASE   │  │    n8n     │
                  │            │  │            │
                  │ Postgres   │◄─┤ Ingestion  │
                  │ pgvector   │  │ Extraction │
                  │ Auth       │  │ Matching   │
                  │ Storage    │  └─────┬──────┘
                  │ RLS        │        │
                  └─────┬──────┘        ▼
                        │        ┌────────────┐
                        │        │ Gemini /   │
                        │        │ LLM        │
                        │        └────────────┘
                        │
                        ▼
               ┌────────────────────┐
               │ Audit / Analytics  │
               │ Institutional      │
               │ Memory             │
               └────────────────────┘
```

### Architectural principle

n8n handles the messy orchestration work: ingestion, extraction, and matching workflows.

Supabase provides the centralized data layer, authentication, storage, and vector search.

The frontend reads operational data from Supabase and invokes the processing pipeline for actions such as report ingestion and Time Agent submissions.

---

## 7. Repository Structure

A recommended structure is:

```text
ProgressBridge-AI/
│
├── README.md
├── AGENTS.md
├── PRD.md
├── REQUIREMENTS.md
├── STACK.md
├── DATABASE.md
├── API.md
├── DESIGN.md
├── DECISIONS.md
├── KNOWN_ISSUES.md
├── .gitignore
├── .env.example
│
├── frontend/
│   ├── src/
│   │   ├── app/
│   │   ├── components/
│   │   ├── hooks/
│   │   ├── lib/
│   │   └── utils/
│   ├── public/
│   ├── package.json
│   └── ...
│
├── supabase/
│   ├── functions/
│   ├── migrations/
│   └── ...
│
├── n8n/
│   └── workflows/
│
├── data/
│   ├── schedule/
│   ├── reports/
│   └── spreadsheets/
│
├── docs/
│   ├── prompts/
│   ├── architecture/
│   └── ...
│
└── tests/
```

> Keep the actual repository structure authoritative. Do not create folders only because they appear in this example if the implementation does not need them.

---

## 8. Prerequisites

Install:

- Node.js 20+ recommended
- npm
- Git
- A Supabase project
- A Gemini/LLM API key
- n8n for the ingestion pipeline

For the deployed demo:

- Vercel for the frontend
- Render for hosted n8n
- Supabase for database/auth/storage

---

## 9. Environment Variables

Create the required environment file from `.env.example`.

Typical frontend configuration:

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=

INGESTION_WEBHOOK_URL=
N8N_WEBHOOK_BASE_URL=
```

AI/database credentials should be configured in the service that actually uses them.

### Important

Never commit:

```text
.env
.env.local
API keys
service-role keys
Gemini keys
Supabase private credentials
n8n credentials
```

Commit only:

```text
.env.example
```

with placeholder values.

---

## 10. Local Development

Clone the repository:

```bash
git clone <your-repository-url>
cd <repository-directory>
```

Install frontend dependencies:

```bash
cd frontend
npm install
```

Create your environment file:

```bash
cp .env.example .env.local
```

On Windows PowerShell, if needed:

```powershell
Copy-Item .env.example .env.local
```

Start the frontend:

```bash
npm run dev
```

Open the local development URL shown by Next.js.

### Useful checks

```bash
npm run lint
```

```bash
npx tsc --noEmit
```

```bash
npm run build
```

Run all relevant checks before opening a pull request.

---

## 11. Supabase Setup

Create/configure a Supabase project.

The database layer should contain the core entities:

```text
projects
schedule_activities
documents
progress_events
activity_matches
audit_logs
users / profiles
```

The schedule activity records contain information such as:

```text
activity_id
project_id
wbs
description
discipline
location
asset
planned_start
planned_finish
duration
status
actual_start
actual_finish
embedding
```

The matching layer stores:

```text
event_id
activity_id
semantic_score
identifier_score
discipline_score
location_score
final_score
match_status
reviewed_by
reviewed_at
```

Use RLS policies to enforce project and role access.

---

## 12. n8n Setup

The main ingestion workflow is:

```text
Webhook
   ↓
Receive project + report text
   ↓
Gemini / LLM extraction
   ↓
Validate structured JSON
   ↓
Normalize extracted event
   ↓
Store progress event
   ↓
Match against schedule
   ↓
Store candidate / confidence
   ↓
Return processing result
```

The production demo should use a reachable hosted n8n instance rather than depending on a developer laptop or temporary tunnel.

### Webhook

The application sends ingestion requests to:

```text
POST /webhook/ingest-text
```

Example payload:

```json
{
  "project_id": "<project-id>",
  "text_content": "24-XX spool erection started at 10:30 AM in North Unit.",
  "source_type": "time_agent",
  "filename": "daily_site_report_piping_2026-08-20.txt"
}
```

The exact environment variable used by the frontend is:

```env
INGESTION_WEBHOOK_URL=
```

---

## 13. Demo Dataset

The PRD defines a synthetic demo project:

```text
Project:
OIL Demo Refinery Expansion

Disciplines:
Civil
Piping
Mechanical
Electrical
Instrumentation
HSE

Target:
500–1,000 L5/L6 schedule activities
```

Recommended sample inputs:

```text
schedule.xlsx
daily_report_01.txt
daily_report_02.txt
piping_progress.xlsx
civil_progress.xlsx
```

The dataset should contain both easy and difficult examples:

- Exact wording
- Different wording for the same activity
- Abbreviations
- Missing schedule match
- Multiple possible matches
- Different disciplines
- Delay reasons
- Start events
- Completion events
- Duplicate-like reports

---

## 14. Golden End-to-End Demo

The primary demonstration uses:

```text
Activity ID:
PIP-2458

Description:
Erect Line 24-XX

Discipline:
Piping

Location:
North Unit

Planned:
20-Aug-2026 → 23-Aug-2026
```

### Step 1 — Load the schedule

Upload the schedule containing:

```text
PIP-2458 — Erect Line 24-XX
```

The system validates and indexes the schedule activities.

### Step 2 — Submit a real field report

Example:

```text
24-XX spool erection started at 10:30 AM in North Unit.
```

### Step 3 — AI extraction

Expected structured information:

```text
Discipline: Piping
Activity: spool erection
Asset: Line 24-XX
Location: North Unit
Status: STARTED
Time: 10:30 AM
```

### Step 4 — Matching

The matcher searches the schedule using semantic similarity and metadata signals.

Example candidates:

```text
PIP-2458 — Erect Line 24-XX
PIP-2512 — Fabricate Line 24-XX
PIP-3144 — Hydrotest Line 24-XX
```

The correct candidate should be:

```text
PIP-2458 — Erect Line 24-XX
```

### Step 5 — Human review

If confidence is below the auto-approval threshold, the event enters:

```text
PENDING_REVIEW
```

The reviewer sees:

```text
Source Report
     ↓
Extracted Event
     ↓
Suggested Schedule Match
     ↓
Confidence + Matching Reasons
```

Then selects:

```text
Accept
```

### Step 6 — Progress update

The approved event updates the activity:

```text
Actual Start → 20-Aug-2026
Status       → IN_PROGRESS / STARTED
```

### Step 7 — Completion report

Submit:

```text
Line 24-XX erection completed on 31-Aug.
```

The system extracts a completion event and links it to the same schedule activity.

### Step 8 — Actual finish and delay

The activity becomes:

```text
Actual Finish: 31-Aug-2026
Planned Finish: 23-Aug-2026
Delay: +8 days
Status: COMPLETED
```

### Step 9 — Dashboard

The dashboard reflects the real database state:

```text
Delayed Activities: 1
```

and the relevant discipline/project progress changes accordingly.

### Step 10 — Audit

The reviewer action is preserved in the audit trail.

This demonstrates the complete planning-to-execution bridge:

```text
Report
  ↓
AI
  ↓
Match
  ↓
Confidence
  ↓
Human approval
  ↓
Actual progress
  ↓
Delay
  ↓
Dashboard
  ↓
Audit history
```

---

## 15. Trust & AI Safety

ProgressBridge AI is designed around a human-in-the-loop model.

### Rules

```text
Missing information → null / Unknown
Low confidence      → human review
Ambiguous match     → show alternatives
Every update        → audit trail
```

The AI must never silently invent:

- Dates
- Activity IDs
- Quantities
- Delay reasons
- Schedule matches

Uncertain activity mapping must not be silently applied.

---

## 16. Error Handling

### Invalid schedule

Show:

```text
Missing required column(s)
```

and provide useful validation feedback.

### Unreadable document

Show:

```text
Could not extract text — unsupported/corrupted format.
```

### AI extraction failure

Provide:

```text
Retry
Enter Manually
```

### Low-confidence match

Show:

```text
No reliable match found
Review Manually
```

### Duplicate event

Flag the possible duplicate instead of silently creating duplicate progress.

---

## 17. Security

### Secrets

Never commit credentials.

Use environment variables and hosted service secret stores.

### Authentication

Supabase Auth manages authentication.

### Authorization

Supabase Row-Level Security should scope data access by:

```text
project_id
+
user role
```

### File handling

Uploaded files should be:

- Type validated
- Size validated
- Filename sanitized
- Protected by appropriate Storage policies

### Logging

Do not log:

- API keys
- Tokens
- Passwords
- Service-role credentials
- Full sensitive uploaded documents

### Data policy

The hackathon MVP uses:

```text
Synthetic / sample / anonymized data
```

and must not depend on real OIL production data.

---

## 18. Performance Targets

The MVP targets:

| Operation | Target |
|---|---:|
| Schedule upload | < 10 seconds |
| Text extraction | < 10 seconds/report |
| Candidate matching | < 3 seconds/event |
| Dashboard load | < 2 seconds |
| Demo schedule | 500–1,000 activities |

These are engineering targets for the MVP, not production guarantees.

---

## 19. API / Workflow Contracts

The logical API surface includes:

```http
POST /api/projects
GET  /api/projects
GET  /api/projects/{project_id}

POST /api/projects/{project_id}/schedule/upload
GET  /api/projects/{project_id}/activities
GET  /api/activities/{activity_id}

POST /api/projects/{project_id}/documents
GET  /api/projects/{project_id}/documents
GET  /api/documents/{document_id}

POST /api/documents/{document_id}/extract
GET  /api/documents/{document_id}/events

POST /api/events/{event_id}/match
GET  /api/events/{event_id}/candidates

POST /api/events/{event_id}/approve
POST /api/events/{event_id}/reject
POST /api/events/{event_id}/override

GET /api/projects/{project_id}/dashboard
GET /api/projects/{project_id}/delays
GET /api/projects/{project_id}/unmatched
GET /api/projects/{project_id}/recent-events
```

Success response convention:

```json
{
  "success": true,
  "data": {}
}
```

Error response convention:

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Human readable",
    "fields": {}
  }
}
```

The actual implemented API routes are authoritative if they differ from this logical contract.

---

## 20. Development Workflow

The team uses short-lived feature branches.

```text
feature/*
     ↓
   Pull Request
     ↓
    dev
     ↓
Testing / Integration
     ↓
   master
     ↓
Production
```

### Branches

```text
master
dev
feature/ingestion
feature/matching
feature/frontend
feature/integration
```

### Start work

```bash
git fetch origin
git checkout dev
git pull origin dev
git status
```

Create a feature branch:

```bash
git checkout -b feature/<name>
```

Commit:

```bash
git add .
git commit -m "feat: <description>"
```

Push:

```bash
git push origin feature/<name>
```

Open a Pull Request into:

```text
dev
```

Do not directly push to `dev` or `master` unless the team explicitly changes the workflow.

---

## 21. Team Ownership

### Member 1 — Ingestion & Extraction

Owns:

- n8n
- Render deployment
- Webhook
- Gemini extraction
- Structured JSON
- Validation
- `progress_events`
- Workflow export

### Member 2 — Matching & Data

Owns:

- pgvector
- Hybrid matching
- Confidence scoring
- Review queue
- Accept/reject/override
- Actual dates/status
- Delay calculation
- Audit trail

### Member 3 — Frontend & Time Agent

Owns:

- Dashboard
- Schedule upload UI
- Report upload
- Review UI
- Activity details
- Time Agent
- Empty states
- API/data binding

### Member 4 — Integration & QA

Owns:

- End-to-end testing
- Dataset
- Reset workflow
- Negative cases
- Deployment checks
- Regression testing
- Demo preparation
- Documentation

---

## 22. Development Principles

1. Build end-to-end before adding optional features.
2. Prefer managed infrastructure for the hackathon.
3. Use structured AI output.
4. Use hybrid matching instead of LLM-only matching.
5. Keep a human in the loop for uncertainty.
6. Never silently discard unmatched data.
7. Preserve source evidence and audit history.
8. Use synthetic/sample data for the hackathon.
9. Keep Primavera/MS Project/PMIS integrations as future adapters rather than hard dependencies.
10. Optimize for a reliable live demo first.

---

## 23. MVP Scope

### P0 — Must Have

- Schedule ingestion
- Excel/CSV ingestion
- Text report ingestion
- AI extraction
- Semantic/hybrid matching
- Confidence score
- Human review
- Activity update
- Dashboard
- Audit trail

### P1 — Should Have

- PDF ingestion
- Voice transcript input
- Delay reason extraction
- Planned vs actual charts
- Search

### P2 — Nice to Have

- OCR
- Actual speech-to-text
- Primavera integration mock
- Predictive delay analytics
- Advanced institutional-memory search

---

## 24. Out of Scope for MVP

The hackathon MVP does not attempt to provide:

- Full Primavera P6 replacement
- Full MS Project replacement
- Live OIL production integration
- Production-grade OCR for every document
- Production-grade speech recognition
- Automated schedule modification without review
- Large-scale distributed processing
- Predictive project completion models
- Native mobile applications
- Enterprise SSO
- Full enterprise multi-tenancy

---

## 25. Roadmap

### Phase 1 — Hackathon MVP

```text
Schedule upload
Daily report upload
Excel/CSV support
AI extraction
Embedding matching
Human review
Confidence scoring
Dashboard
Planned vs actual
Audit trail
```

### Phase 2 — Pilot

```text
PDF ingestion
OCR
Real voice interface
Better duplicate detection
Primavera P6 integration
MS Project integration
Advanced analytics
```

### Phase 3 — Production

```text
PMIS integration
Real-time field updates
Mobile / PWA
Enterprise SSO
Full RBAC
High-scale processing
Model monitoring
Delay prediction
Productivity forecasting
Cross-project institutional memory
```

---

## 26. Success Criteria

The MVP is successful when:

- A schedule can be uploaded and indexed.
- At least 2–3 heterogeneous input formats can be processed.
- AI extracts meaningful execution events.
- Events are linked to schedule activities.
- Confidence scores are visible.
- Low-confidence events enter human review.
- Approved events update actual progress.
- Planned vs actual information is visible.
- Delayed activities are highlighted.
- Audit history remains accessible.
- The complete flow works in a live demo.
- At least one difficult/unmatched case can be demonstrated.
- No secrets are committed to Git.

---

## 27. Demo Checklist

Before presenting:

### Infrastructure

- [ ] Supabase project is reachable.
- [ ] Database schema/migrations are applied.
- [ ] pgvector is working.
- [ ] n8n is deployed and reachable.
- [ ] Gemini/LLM credentials are configured securely.
- [ ] Vercel environment variables are configured.
- [ ] No temporary local tunnel is required.

### Data

- [ ] Demo project exists.
- [ ] Schedule is loaded.
- [ ] Schedule activities have embeddings.
- [ ] No fake progress values remain.
- [ ] Demo reset/clean-state flow works.

### E2E

- [ ] Upload a real report.
- [ ] Verify extraction.
- [ ] Verify matching.
- [ ] Verify confidence.
- [ ] Verify review queue.
- [ ] Accept the match.
- [ ] Verify actual progress.
- [ ] Verify delay calculation.
- [ ] Verify dashboard update.
- [ ] Verify audit trail.

### Presentation

- [ ] Show the original field report.
- [ ] Show AI extraction.
- [ ] Show matching explanation.
- [ ] Show human review.
- [ ] Show updated activity.
- [ ] Show dashboard impact.
- [ ] Show audit trail.
- [ ] Demonstrate at least one difficult/unmatched case.

---

## 28. Troubleshooting

### Frontend cannot connect to ingestion

Check:

```env
INGESTION_WEBHOOK_URL=
```

Then verify the n8n webhook is reachable from the deployed frontend.

### n8n works locally but not in production

Do not rely on a developer laptop for the final demo.

Deploy n8n to the agreed hosted environment and update:

```env
INGESTION_WEBHOOK_URL=
```

### Dashboard shows incorrect data

Verify:

1. Frontend Supabase URL/key.
2. Active project ID.
3. Database rows.
4. RLS policies.
5. API response.
6. Browser cache/state.
7. No hardcoded demo values remain.

### Review queue is empty unexpectedly

Check:

```text
progress_events
activity_matches
match_status
project_id
```

and confirm that the uploaded event actually reached the matching workflow.

### Matching is incorrect

Inspect:

```text
semantic_score
identifier_score
discipline_score
location_score
final_score
```

Then verify that the schedule activity has a valid embedding and normalized metadata.

### Progress does not update after approval

Verify:

```text
match status
    ↓
approval action
    ↓
schedule activity
    ↓
actual_start / actual_finish
    ↓
status
    ↓
dashboard query
```

### Never fix a demo problem by hardcoding the dashboard

The final presentation should demonstrate real data flowing through the system.

---

## 29. Documentation & Guides

### Presentation & Operational Guides
- [Golden Demo Presentation Script](docs/demo-script.md) — Step-by-step presentation script with verified test numbers and metrics.
- [Troubleshooting & Incident Guide](docs/troubleshooting.md) — Root causes, workarounds, and demo fallback plans for live testing.

### Project Architecture & Reference Specs
- `README.md` — Project mission, architecture, pipeline, schema, and operational overview.
- `PRD.md` — Product requirements document.
- `REQUIREMENTS.md` — Formal requirements and acceptance criteria.
- `AGENTS.md` — Hackathon agent guide, team branch ownership, and verification rules.
- `docs/design.md` — UI design tokens, color palette, typography, and component styling.


---

## 30. License / Project Status

This repository is a **hackathon MVP / prototype for SIH 2026 Problem Statement 26122**.

The system is intended to demonstrate the proposed planning-to-execution workflow using synthetic/sample data.

It is not a production OIL system and should not be represented as one.

---

## 31. Final Product Statement

> **ProgressBridge AI is an intelligent planning-to-execution bridge that transforms heterogeneous field reports into structured, auditable, schedule-linked project progress data using AI-powered extraction and semantic activity matching.**

The MVP focuses on one critical capability:

> **Turn "what the site team said happened" into "which planned activity actually happened, when, and with what confidence."**
