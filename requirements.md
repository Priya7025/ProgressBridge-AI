# REQUIREMENTS.md

# ProgressBridge AI — Implementation Requirements

**Project:** ProgressBridge AI  
**Problem Statement:** SIH / OIL 26122  
**Organization:** Oil India Limited (OIL)  
**Theme:** Smart Automation  
**Version:** 2.0  
**Status:** MVP / SIH Hackathon

> This document is derived from `PRD.md`. The updated PRD pivots the implementation to **Next.js + Supabase + n8n + Vercel + Render**, with Supabase Auth/RLS and pgvector. fileciteturn2file0L3-L11

---

## 1. Product Requirements Summary

The system shall convert fragmented field-progress inputs into structured execution events, semantically link those events to L5/L6 schedule activities, assign confidence, route uncertain matches to human review, update actual progress, and expose delay/risk insights and historical execution data. fileciteturn2file0L15-L45

Core pipeline:

```text
Messy Field Input
        ↓
n8n Ingestion
        ↓
LLM Structured Extraction
        ↓
Entity Normalization
        ↓
pgvector + Hybrid Matching
        ↓
Confidence Scoring
        ↓
Human Review
        ↓
Supabase Progress Update + Audit
        ↓
Dashboard / Delay / Risk Insights
        ↓
Institutional Memory
```

---

# 2. Scope

## 2.1 P0 — Must Have

The MVP must support:

- Project creation
- Supabase authentication
- Supervisor and planner roles
- Schedule upload: CSV/XLS/XLSX
- Schedule validation
- Schedule indexing with embeddings
- Free-text daily report ingestion
- Discipline-wise spreadsheet ingestion
- LLM structured extraction
- Activity/entity normalization
- pgvector semantic candidate retrieval
- Hybrid match scoring
- Match confidence
- Human review
- Actual start/end updates
- Activity status updates
- Delay calculation
- Unmatched-event queue
- Project dashboard
- Discipline metrics
- Planned vs actual timeline
- Recent events
- Audit trail
- Source traceability
- Conversational text “time agent”
- Synthetic demo data
- Vercel frontend deployment
- Supabase Postgres/pgvector/Auth/Storage/RLS
- n8n ingestion/extraction/matching workflows

The PRD requires at least three input types: CSV/Excel schedule, free-text daily report, and discipline-wise spreadsheet. fileciteturn2file0L160-L169

## 2.2 P1 — Should Have

- PDF text ingestion
- Voice transcript as text input
- Delay-reason analytics
- Search
- Better duplicate detection
- More polished planned-vs-actual views

## 2.3 P2 — Nice to Have

- OCR
- Real speech-to-text
- Primavera integration mock
- Predictive delay analytics
- Advanced institutional-memory search

These remain secondary to the core end-to-end MVP. fileciteturn2file0L554-L560

---

# 3. Architecture Requirements

The implementation shall follow the v2 architecture:

```text
                    ┌──────────────────────────────┐
                    │ Next.js + TypeScript         │
                    │ Tailwind + shadcn/ui         │
                    │ Vercel                       │
                    └────────────┬─────────────────┘
                                 │
                    ┌────────────┴─────────────┐
                    │                          │
             Supabase Client             Webhooks / API
             Auth / Reads / RLS                │
                    │                          │
                    ▼                          ▼
              ┌───────────┐             ┌────────────┐
              │ Supabase  │◄────────────┤    n8n     │
              │ Postgres  │             │ Ingestion  │
              │ pgvector  │             │ Extraction │
              │ Auth      │             │ Matching   │
              │ Storage   │             └─────┬──────┘
              └─────┬─────┘                   │
                    │                         │
                    └──────────┬──────────────┘
                               ▼
                         Audit / Analytics
```

n8n should own the messy ingestion/extraction/matching workflow where practical. Supabase should own persistent data, authentication, storage, vector search, and RLS. If custom logic is needed, use an isolated Next.js/Vercel or Supabase Edge Function rather than adding a second full backend service. fileciteturn2file0L278-L306

---

# 4. Frontend Requirements

## FE-001 — Framework

Use:

```text
Next.js
React
TypeScript
```

Deploy to:

```text
Vercel
```

## FE-002 — UI Libraries

Use or evaluate the versions selected by the project:

```text
Tailwind CSS
shadcn/ui
TanStack Query
React Hook Form
Zod
Recharts
```

These are the technologies listed in the updated PRD. fileciteturn2file0L310-L317

## FE-003 — Main Navigation

```text
Dashboard
Projects
Schedule
Reports
AI Extraction
Review Queue
Activities
Analytics
Audit Log
Settings
```

## FE-004 — Dashboard

Must display:

```text
Total Activities
Completed
In Progress
Delayed
Pending Review
Unmatched
```

Charts:

- Progress by discipline
- Planned vs actual
- Delay distribution
- Recent events

## FE-005 — Upload UI

The upload interface shall:

- Accept supported file types
- Show upload status
- Show processing stages
- Display:

```text
Parsing...
Extracting...
Matching...
```

## FE-006 — Review UI

Use a three-step/three-column workflow:

```text
Source
   →
Extracted Event
   →
Schedule Match
```

Display:

- Original source/report
- Extracted fields
- Suggested activity
- Confidence
- Matching reasons

Actions:

```text
Accept
Reject
Change Match
```

## FE-007 — Activity Details

Display:

```text
Activity ID
Description
Discipline
Planned Dates
Actual Dates
Status
Delay
Source Reports
Audit History
```

---

# 5. Authentication & Authorization Requirements

The v2 PRD introduces Supabase Auth and two MVP roles. fileciteturn2file0L247-L247

## AUTH-001 — Supabase Auth

Use Supabase Auth with either:

```text
Email/password
or
Magic link
```

Do not create custom JWT signing/rotation middleware.

## AUTH-002 — Roles

Support exactly:

```text
supervisor
planner
```

## AUTH-003 — Supervisor

Supervisor can:

- Sign in
- Access assigned projects
- Submit reports
- Submit time-agent messages
- View own submissions/status

Supervisor cannot approve/override planner decisions.

## AUTH-004 — Planner

Planner can:

- View assigned projects
- View full review queue
- Approve matches
- Reject matches
- Override matches
- View project dashboard
- View activity data
- View audit history

## AUTH-005 — Row-Level Security

Use Supabase Postgres RLS policies keyed by:

```text
project_id
authenticated user
role
```

Do not rely only on frontend checks.

---

# 6. Schedule Requirements

## SCH-001 — Supported Formats

```text
.csv
.xls
.xlsx
```

## SCH-002 — Required Columns

```text
activity_id
wbs
activity_description
discipline
planned_start
planned_finish
```

Optional:

```text
location
parent_activity
duration
predecessors
responsible_contractor
level
asset
```

## SCH-003 — Validation

Validate:

- Required columns
- Valid dates
- Unique activity IDs
- Non-empty descriptions
- Supported format
- Invalid rows

Provide import summary and downloadable error report. fileciteturn2file0L203-L209

## SCH-004 — Normalization

Normalize:

- Case
- Whitespace
- Punctuation
- Common abbreviations
- Basic spelling differences

Preserve original data.

## SCH-005 — L5/L6 Indexing

Each activity must be indexed with:

```text
activity_id
wbs
description
discipline
location
asset/entity identifiers
normalized search text
embedding
```

Embeddings are stored using Supabase pgvector. fileciteturn2file0L211-L213

---

# 7. Document & Report Requirements

## DOC-001 — Required Inputs

```text
TXT
CSV
XLSX/XLS
```

PDF is P1.

## DOC-002 — Source Metadata

Each source must retain:

```text
source_id
filename
source_type
uploaded_by
uploaded_at
project_id
```

## DOC-003 — Original Source

Original source content must remain retrievable for audit/evidence.

## DOC-004 — Spreadsheet Parsing

Discipline spreadsheets should be converted into meaningful records/text while preserving source values.

## DOC-005 — Processing State

A document should expose:

```text
UPLOADED
PARSING
EXTRACTING
MATCHING
COMPLETED
FAILED
```

---

# 8. AI Extraction Requirements

## AI-001 — Structured Output

LLM output must be schema-constrained JSON.

Required fields:

```text
discipline
activity_description
event_type
event_date
event_time
asset
location
quantity
delay_reason
source_id
source_evidence
```

## AI-002 — Event Types

Support:

```text
STARTED
IN_PROGRESS
COMPLETED
ON_HOLD
BLOCKED
CANCELLED
```

## AI-003 — No Hallucination

The AI must not invent:

- Activity IDs
- Dates
- Times
- Quantities
- Locations
- Delay reasons

Use `null` when unsupported by the source.

## AI-004 — Evidence

Retain source evidence spans where possible.

## AI-005 — Prompt Versioning

Prompts must be version controlled under:

```text
docs/prompts/
```

The PRD explicitly requires version-controlled prompt templates. fileciteturn2file0L323-L329

## AI-006 — Failure Handling

On AI/API failure:

```text
Retry
↓
Manual entry / review
```

Source data must not be lost.

---

# 9. Entity Normalization Requirements

Normalize common entities such as:

```text
Line 24-XX
24-XX
24 inch line XX
24-inch process line
```

Support where practical:

```text
line numbers
equipment IDs
location names
discipline names
common activity abbreviations
```

Preserve raw text for traceability.

---

# 10. Semantic Matching Requirements

## MATCH-001 — Candidate Retrieval

For every extracted event:

1. Apply appropriate metadata filters.
2. Query pgvector.
3. Retrieve top-N candidates.
4. Compute additional matching signals.
5. Produce final confidence.

## MATCH-002 — Embedding Text

Recommended schedule embedding input:

```text
discipline | activity_description | location | asset | WBS
```

## MATCH-003 — Hybrid Scoring

Use:

```text
Semantic similarity
Identifier match
Discipline match
Location match
Keyword/context match
```

Initial configurable weights:

```text
Semantic similarity   50%
Identifier match      25%
Discipline match      15%
Location match        10%
```

These weights are from the v2 PRD and must remain configurable. fileciteturn2file0L251-L273

## MATCH-004 — Candidate Results

Example:

```text
PIP-2458 — Erect Line 24-XX       94%
PIP-2512 — Fabricate Line 24-XX   61%
PIP-3144 — Hydrotest Line 24-XX   42%
```

## MATCH-005 — Confidence

Default policy:

```text
>= 90% → HIGH CONFIDENCE
70–89% → REVIEW REQUIRED
< 70%  → UNMATCHED / MANUAL SELECTION
```

Thresholds must be configurable.

## MATCH-006 — Explainability

For each suggestion show reasons such as:

```text
✓ Same discipline
✓ Same line identifier
✓ Similar activity wording
✓ Same location
```

---

# 11. Human Review Requirements

## REV-001 — Review Queue

Queue:

- Medium-confidence matches
- Low-confidence matches
- Ambiguous matches
- Manually flagged records

## REV-002 — Actions

Planner can:

```text
Accept
Reject
Choose Another
Mark as New/Unplanned
Edit Extracted Fields
Add Comment
```

## REV-003 — No Silent Failure

Unmatched events must never be silently dropped.

## REV-004 — Review Audit

Record:

```text
event_id
reviewer
decision
old_match
new_match
comment
timestamp
```

---

# 12. Progress Update Requirements

## PROG-001 — Activity Statuses

```text
NOT_STARTED
STARTED
IN_PROGRESS
COMPLETED
ON_HOLD
BLOCKED
CANCELLED
```

## PROG-002 — Actual Start

An approved STARTED event updates `actual_start`.

If multiple approved starts exist, retain the earliest unless explicitly overridden.

## PROG-003 — Actual Finish

An approved COMPLETED event updates `actual_finish`.

## PROG-004 — Last Updated

Track `last_updated_at`.

## PROG-005 — State Flow

```text
NOT_STARTED
     ↓
STARTED
     ↓
IN_PROGRESS
     ↓
COMPLETED
```

---

# 13. Delay Requirements

## DLY-001 — Completed Activity

```text
delay_days = actual_finish - planned_finish
```

## DLY-002 — Ongoing Activity

```text
expected_delay = current_date - planned_finish
```

## DLY-003 — Classification

```text
EARLY
ON_TIME
DELAYED
AT_RISK
```

## DLY-004 — Delay Reasons

Support stated reasons including:

```text
Material unavailable
Equipment breakdown
Manpower shortage
Weather
Design change
Permit delay
Access issue
Safety hold
```

Do not infer unstated reasons.

---

# 14. Duplicate Detection Requirements

Flag probable duplicates using:

```text
Activity ID
Event type
Event date/time
Similar text
Source document
```

Do not silently create duplicate progress events.

---

# 15. Dashboard Requirements

## DASH-001 — Project KPIs

```text
Total Activities
Completed
In Progress
Not Started
Delayed
Pending Review
Unmatched
```

## DASH-002 — Data Quality

```text
Reports Processed
Events Extracted
High-Confidence Matches
Manual Overrides
```

## DASH-003 — Discipline Metrics

Support:

```text
Civil
Piping
Mechanical
Electrical
Instrumentation
HSE
```

Show:

```text
Activity count
Completion %
Delayed count
Pending review count
```

## DASH-004 — Recent Events

Show:

```text
Timestamp
Activity
Event/status
Source
Confidence
```

## DASH-005 — Planned vs Actual

Show:

```text
Planned Start
Planned Finish
Actual Start
Actual Finish
Delay Days
```

---

# 16. Search Requirements

Search by:

```text
Activity ID
Description
WBS
Discipline
Location
Line
Equipment
Event
Source document
```

---

# 17. Audit & Traceability Requirements

## AUD-001 — Audit Log

Record:

```text
audit_id
event_id
activity_id
action
old_value
new_value
user_id
comment
created_at
```

## AUD-002 — Source Traceability

Navigation must work:

```text
Activity
    ↓
Matched Event
    ↓
Source Document
    ↓
Original Evidence
```

## AUD-003 — Historical Record

Critical progress and review history must be retained instead of overwritten.

---

# 18. Conversational Time Agent Requirements

## TA-001 — Text Input

Provide a conversational text box.

Example:

```text
Completed valve installation on Line 18-B at 4 PM.
```

## TA-002 — Same Pipeline

```text
Text
 ↓
LLM extraction
 ↓
Normalization
 ↓
Matching
 ↓
Confidence
 ↓
Review / update
```

## TA-003 — Voice Ready

Architecture must accept a future speech-to-text transcript without changing downstream extraction/matching.

Actual speech-to-text is Phase 2.

---

# 19. Supabase Requirements

Supabase shall provide:

```text
Postgres
pgvector
Auth
Storage
Row-Level Security
```

No separate vector database or auth service is required for MVP. fileciteturn2file0L323-L338

## Storage

Uploaded files must be stored in Supabase Storage.

Storage policies must respect project/role permissions.

---

# 20. n8n Requirements

n8n shall own the primary ingestion/extraction/matching workflow where practical.

Recommended workflow:

```text
Webhook / Trigger
      ↓
Identify Project/User
      ↓
Fetch Source / File
      ↓
Parse Input
      ↓
LLM Structured Extraction
      ↓
Normalize Entities
      ↓
Generate Embedding / Search
      ↓
Retrieve Candidates
      ↓
Hybrid Score
      ↓
Write Match + Confidence
      ↓
Route:
  High → review/update path
  Medium → review queue
  Low → unmatched
```

n8n's canvas should remain understandable and visually inspectable because the PRD treats it as a demo and debugging aid. fileciteturn2file0L103-L110

---

# 21. API / Workflow Contract Requirements

Implementation may use Next.js API routes, Supabase RPC/Edge Functions, or n8n webhooks. The logical contracts must remain consistent. fileciteturn2file0L348-L381

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

## Standard Response

Success:

```json
{"success": true, "data": {}}
```

Error:

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

---

# 22. Data Model Requirements

## Project

```text
id
name
code
organization
planned_start
planned_finish
created_at
updated_at
```

## Schedule Activity

```text
id
project_id
activity_id
wbs
level
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

## Document

```text
id
project_id
filename
source_type
mime_type
raw_text
uploaded_by
uploaded_at
```

## Progress Event

```text
id
project_id
document_id
discipline
activity_description
asset
location
event_type
event_date
event_time
quantity
delay_reason
extraction_confidence
match_confidence
status
created_at
```

## Activity Match

```text
id
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

## Audit Log

```text
id
event_id
activity_id
action
old_value
new_value
user_id
comment
created_at
```

## User Profile

Supabase Auth-backed profile:

```text
id
email
role
project_ids
created_at
```

The v2 PRD defines these entities and fields and requires project/role access to be enforced through RLS. fileciteturn2file0L392-L406

---

# 23. Security Requirements

## SEC-001 — Authentication

Use Supabase Auth.

## SEC-002 — Authorization

Use Postgres RLS.

## SEC-003 — Secrets

Store secrets only in platform environment-variable/configuration stores:

```text
Vercel
Render
Supabase
n8n
```

Commit only `.env.example` with placeholders.

## SEC-004 — File Uploads

Validate:

- file type
- file size
- filename

Use Storage access policies scoped by project/role.

## SEC-005 — Logging

Never log:

- API keys
- access tokens
- secrets
- full sensitive uploaded document bodies

## SEC-006 — Data Policy

Only synthetic/sample/anonymized data may be used for the hackathon. No real OIL production data. fileciteturn2file0L424-L435

---

# 24. Performance Requirements

MVP targets:

```text
Schedule upload:      < 10 seconds
Text extraction:      < 10 seconds/report
Candidate matching:   < 3 seconds/event
Dashboard load:       < 2 seconds
```

Demo-scale target:

```text
500–1,000 schedule activities
hundreds of extracted events
```

These are demo targets rather than production guarantees. fileciteturn2file0L439-L445

---

# 25. Error Handling Requirements

## ERR-001 — Invalid Schedule

Report missing required columns and provide an error report.

## ERR-002 — Unreadable Document

Show:

```text
Could not extract text — unsupported/corrupted format.
```

## ERR-003 — AI Failure

Show:

```text
Retry
Enter Manually
```

## ERR-004 — Low Confidence

Show:

```text
No reliable match found
Review Manually
```

## ERR-005 — Duplicate

Flag possible duplicates rather than silently inserting them.

---

# 26. AI Trust Requirements

Enforce:

```text
Missing information → null / Unknown
Low confidence      → human review
Ambiguous match     → show alternatives
Every update        → audit trail
```

AI must never silently invent activity IDs, dates, quantities, or delay reasons, and must never silently auto-map uncertain activities. fileciteturn2file0L460-L468

---

# 27. Demo Dataset Requirements

Create:

```text
Project: OIL Demo Refinery Expansion
Activities: 500–1,000 L5/L6
Disciplines: Civil, Piping, Mechanical, Electrical, Instrumentation, HSE
```

Files:

```text
schedule.xlsx
daily_report_01.txt
daily_report_02.txt
piping_progress.xlsx
civil_progress.xlsx
```

Include:

```text
Exact match
Paraphrase
Abbreviation
Identifier match
Ambiguous match
Unmatched event
Different disciplines
Delay reason
STARTED event
COMPLETED event
Duplicate-like report
```

These cases mirror the updated PRD demo dataset requirements. fileciteturn2file0L473-L483

---

# 28. Testing Requirements

## TEST-001 — Unit Tests

Cover:

- Schedule validation
- Date parsing
- Normalization
- Event schema validation
- Hybrid scoring
- Confidence thresholds
- Delay calculations
- Duplicate detection
- RLS/permission behavior where testable

## TEST-002 — Integration Test

Test the complete chain:

```text
Upload schedule
      ↓
Index activities
      ↓
Upload report
      ↓
Extract event
      ↓
Match activity
      ↓
Review
      ↓
Approve
      ↓
Update progress
      ↓
Refresh dashboard
```

## TEST-003 — AI Evaluation Set

Maintain labeled examples for:

```text
Exact matches
Paraphrases
Abbreviations
Ambiguous matches
Unmatched events
Multiple events/report
```

Measure:

```text
Extraction precision
Extraction recall
Top-1 match accuracy
Top-3 candidate recall
False high-confidence match rate
```

---

# 29. Quality Targets

On the synthetic test set:

```text
Field/event extraction accuracy  > 90%
Top-1 schedule match accuracy    > 85%
High-confidence match precision  > 90%
```

These are internal MVP engineering targets, not production claims. fileciteturn2file0L529-L533

---

# 30. Deployment Requirements

## DEP-001 — Frontend

```text
Next.js → Vercel
```

## DEP-002 — n8n

```text
n8n → Render
```

or n8n Cloud if the team chooses to avoid hosting n8n.

## DEP-003 — Managed Data Services

```text
Supabase → Postgres + pgvector + Auth + Storage
```

## DEP-004 — Public Demo

The final demo must be reachable through a deployed Vercel URL; local-only setup is not sufficient for final demonstration. fileciteturn2file0L595-L609

---

# 31. Environment Requirements

Create `.env.example` containing placeholders such as:

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=

SUPABASE_SERVICE_ROLE_KEY=

LLM_API_KEY=
LLM_MODEL=

EMBEDDING_API_KEY=
EMBEDDING_MODEL=

N8N_WEBHOOK_BASE_URL=
```

Rules:

- Never commit real secrets.
- Never expose the service-role key to browser code.
- Keep server-only credentials on the server/automation side.
- Frontend public variables must be explicitly designed for browser exposure.

---

# 32. Repository Requirements

Recommended v2 structure:

```text
binary-beaters/
│
├── frontend/
│   ├── app/
│   ├── components/
│   ├── lib/
│   ├── hooks/
│   ├── types/
│   └── ...
│
├── n8n/
│   ├── workflows/
│   └── README.md
│
├── supabase/
│   ├── migrations/
│   ├── seed.sql
│   └── README.md
│
├── data/
│   ├── sample/
│   └── expected/
│
├── docs/
│   ├── prompts/
│   ├── architecture/
│   └── demo/
│
├── tests/
├── PRD.md
├── requirements.md
├── README.md
├── .env.example
└── .gitignore
```

Do not introduce a separate full `backend/` service unless a concrete requirement cannot be cleanly handled by Next.js/serverless functions, Supabase Edge Functions, or n8n.

---

# 33. AI Coding Tool Rules

The team may use Claude Code, Antigravity, or similar tools.

Generated code must:

1. Follow the PRD and this requirements file.
2. Avoid unnecessary new services.
3. Use Supabase Auth instead of custom auth.
4. Respect RLS.
5. Never expose service-role credentials.
6. Validate LLM output with a schema.
7. Keep prompts in `docs/prompts/`.
8. Preserve evidence and audit history.
9. Never silently discard unmatched data.
10. Include tests for core matching and progress logic.
11. Keep AI provider integrations replaceable.
12. Prefer small, reviewable feature branches/commits.

The v2 PRD explicitly emphasizes managed services, structured AI output, hybrid matching, human review, source preservation, synthetic data, and live-demo reliability. fileciteturn2file0L580-L590

---

# 34. Team Implementation Requirements

For a 2–4 person team:

## Ingestion & Extraction

Own:

```text
n8n workflows
file parsing
LLM extraction
structured validation
prompt templates
```

## Matching & Data

Own:

```text
Supabase schema
pgvector
hybrid scoring
RLS
Audit trail
```

## Frontend & Time Agent

Own:

```text
Next.js
dashboard
upload UI
review UI
activity details
charts
time agent
```

## Integration & Demo

Optional fourth person:

```text
synthetic data
deployment
end-to-end testing
demo script
README/documentation
```

For a 2-person team, combine the roles as specified by the v2 PRD. fileciteturn2file0L564-L576

---

# 35. Acceptance Criteria

The MVP is accepted only when this complete scenario works:

```text
1. User signs in.
2. User creates/opens a project.
3. Planner uploads schedule.xlsx.
4. System validates schedule.
5. System indexes L5/L6 activities.
6. Supervisor uploads a daily report or submits a time-agent message.
7. n8n processes the input.
8. LLM extracts one or more structured events.
9. Entities are normalized.
10. pgvector retrieves candidate activities.
11. Hybrid scoring generates confidence.
12. Medium/low-confidence items enter review.
13. Planner approves or overrides the match.
14. Actual status/dates update in Supabase.
15. Delay is calculated.
16. Dashboard refreshes.
17. Delayed and unmatched items are visible.
18. Original source/evidence is accessible.
19. Audit history is visible.
20. The complete flow works from the deployed Vercel frontend.
```

These steps reflect the updated PRD's acceptance flow and Definition of Done. fileciteturn2file0L537-L548

---

# 36. Definition of Done

The project is ready for SIH demonstration when:

- Vercel frontend is deployed.
- Supabase is configured.
- Supabase migrations/seed data are committed.
- Auth works.
- RLS is verified.
- Schedule upload works.
- Required report formats work.
- n8n processes reports.
- AI extraction works on the prepared dataset.
- pgvector matching works.
- Confidence thresholds work.
- Review workflow works.
- Progress updates appear on the dashboard.
- Dashboard KPIs are meaningful.
- Audit history is visible.
- At least one difficult/unmatched case is demonstrated live.
- `.gitignore` and `.env.example` are correct.
- README includes setup, architecture, sample data, and demo instructions.

The v2 PRD specifically requires a deployed Vercel frontend, quick demo-data loading, working n8n processing, review, immediate dashboard updates, audit history, a difficult live example, and secret hygiene. fileciteturn2file0L595-L609

---

# 37. Final MVP Requirement

> **Turn “what the site team said happened” into “which planned activity actually happened, when, and with what confidence.”**

The implementation must optimize for one reliable, explainable end-to-end workflow rather than broad but shallow feature coverage. fileciteturn2file0L613-L619
