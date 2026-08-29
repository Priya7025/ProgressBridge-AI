# REQUIREMENTS.md
# ProgressBridge AI — Requirements Specification
**Problem Statement:** SIH 26122  
**Project:** Intelligent Data Capture & Schedule-Linking Platform  
**Organization:** Oil India Limited (OIL)  
**Theme:** Smart Automation  
**Version:** 1.0  
**Status:** MVP / SIH Hackathon

---

## 1. Purpose

This document defines the implementation requirements for ProgressBridge AI.

The system converts heterogeneous field-execution inputs into structured progress events, semantically links those events to L5/L6 schedule activities, provides confidence scores, supports human validation, and updates project progress dashboards.

This document is the implementation checklist for the MVP.

---

# 2. Product Objective

The product creates a reliable bridge between:

```text
PLANNING
L5/L6 Schedule
     ↓
FIELD EXECUTION
Daily reports / spreadsheets / supervisor updates
     ↓
AI PROCESSING
Extraction + normalization + semantic matching
     ↓
VALIDATION
Human review
     ↓
PROJECT VISIBILITY
Actual progress + delays + analytics + audit trail
```

---

# 3. Scope

## 3.1 MVP In Scope

- Project creation
- Schedule upload
- CSV/XLSX schedule ingestion
- Daily report/text ingestion
- Discipline spreadsheet ingestion
- AI-based event extraction
- Activity normalization
- Semantic activity matching
- Confidence scoring
- Human review
- Actual start/end tracking
- Progress status tracking
- Delay calculation
- Unmatched-event queue
- Dashboard
- Activity details
- Audit trail
- Synthetic/sample data
- Local Docker deployment

## 3.2 MVP Out of Scope

- Live OIL production-data integration
- Full Primavera P6 bidirectional integration
- Full MS Project bidirectional integration
- Enterprise SSO
- Production-grade OCR
- Production-grade ASR
- Native mobile application
- Kubernetes
- Distributed processing
- Advanced predictive ML
- Automatic schedule modification without review
- Multi-tenant enterprise architecture

---

# 4. User Requirements

## UR-01 — Project Creation

Users must be able to create a project with:

- Project name
- Project code
- Organization
- Planned start date
- Planned finish date

## UR-02 — Schedule Management

Users must be able to upload and view project schedules.

## UR-03 — Progress Reporting

Users must be able to provide field progress through simple input mechanisms.

## UR-04 — Review

Planners must be able to review, approve, reject, or override AI-generated activity matches.

## UR-05 — Monitoring

Project managers must be able to view current progress, delays, exceptions, and data-quality metrics.

---

# 5. Functional Requirements

## FR-001 — Project Management

The application shall support:

- Create project
- List projects
- Open project
- Edit project metadata
- Archive project

Required project fields:

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

---

## FR-002 — Schedule File Upload

The system shall accept:

```text
.csv
.xlsx
.xls
```

Minimum required columns:

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
level
location
asset
parent_activity
duration
predecessors
responsible_contractor
```

---

## FR-003 — Schedule Validation

The system shall:

- Detect missing required columns
- Detect duplicate activity IDs
- Validate date fields
- Detect empty descriptions
- Detect unsupported formats
- Report invalid rows
- Show import summary

Example:

```text
Total rows: 1000
Valid: 987
Invalid: 13
Duplicates: 4
```

---

## FR-004 — Schedule Normalization

The system shall normalize schedule text before indexing.

Examples:

```text
"Erect Line 24-XX"
"ERCT LINE 24 XX"
"Line 24-XX Erection"
```

Normalization may include:

- Case
- Extra spaces
- Common abbreviations
- Punctuation
- Basic spelling variations

Original schedule data must remain available.

---

## FR-005 — Schedule Indexing

Each activity shall be indexed using:

- Activity ID
- Description
- WBS
- Discipline
- Location
- Asset/entity information
- Search text
- Embedding vector

The index must support semantic candidate retrieval.

---

## FR-006 — Field Report Upload

The system shall accept at least:

```text
TXT
CSV
XLSX
```

PDF support should be included when practical.

Each uploaded source shall store:

```text
document_id
project_id
filename
source_type
uploaded_by
uploaded_at
raw_text
```

---

## FR-007 — Text Extraction

The system shall extract usable text from supported uploaded documents.

For spreadsheets, meaningful rows/cells should be identified instead of treating the entire workbook as one text block.

---

## FR-008 — AI Event Extraction

The system shall identify execution events from unstructured text.

Supported fields:

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
source_evidence
```

Supported event types:

```text
STARTED
IN_PROGRESS
COMPLETED
ON_HOLD
BLOCKED
CANCELLED
```

---

## FR-009 — Structured AI Response

AI output must conform to a predefined schema.

Example:

```json
{
  "events": [
    {
      "discipline": "Piping",
      "activity_description": "spool erection",
      "event_type": "STARTED",
      "event_date": "2026-08-29",
      "event_time": "10:30",
      "asset": "Line 24-XX",
      "location": "North Unit",
      "quantity": null,
      "delay_reason": null,
      "source_evidence": "Spool erection for Line 24-XX started at 10:30 AM."
    }
  ]
}
```

The model must not invent values unsupported by the source.

Unknown values must be represented as:

```text
null
```

---

## FR-010 — Evidence Preservation

Every extracted event should retain source evidence wherever possible.

Example:

```text
Field: event_time
Value: 10:30
Evidence: "started at 10:30 AM"
```

---

## FR-011 — Entity Normalization

The system should normalize entities such as:

```text
Line 24-XX
24-XX
24 inch line XX
24-inch process line
```

into a common representation when the underlying entity can be confidently identified.

Original text must remain accessible.

---

## FR-012 — Candidate Retrieval

For each extracted event, the system shall retrieve the most relevant schedule activities.

The system should return the top-N candidates.

Example:

```text
1. PIP-2458 — Erect Line 24-XX       0.94
2. PIP-2512 — Fabricate Line 24-XX   0.63
3. PIP-3144 — Hydrotest Line 24-XX   0.41
```

---

## FR-013 — Hybrid Activity Matching

The matching engine shall combine multiple signals:

```text
Semantic similarity
Identifier/line/equipment match
Discipline match
Location match
Keyword similarity
WBS/context similarity
```

Recommended initial weighting:

```text
0.50 * semantic_similarity
+ 0.25 * identifier_score
+ 0.15 * discipline_score
+ 0.10 * location_score
```

Weights must be configurable.

---

## FR-014 — Match Confidence

Every suggested match must have a confidence score.

Recommended initial policy:

```text
>= 0.90
HIGH CONFIDENCE

0.70 - 0.89
REVIEW REQUIRED

< 0.70
UNMATCHED / MANUAL SELECTION
```

Thresholds must be configurable.

---

## FR-015 — Human Review

Reviewers must be able to:

- Accept suggested match
- Reject match
- Select another activity
- Mark as new/unplanned activity
- Correct extracted fields
- Add reviewer comment

The reviewer decision must be logged.

---

## FR-016 — Progress Event State

Progress events shall support:

```text
PENDING_REVIEW
APPROVED
REJECTED
OVERRIDDEN
UNMATCHED
```

---

## FR-017 — Activity Status

Schedule activities shall support:

```text
NOT_STARTED
STARTED
IN_PROGRESS
COMPLETED
ON_HOLD
BLOCKED
CANCELLED
```

---

## FR-018 — Actual Start Date

When a STARTED event is approved and linked to an activity:

```text
activity.actual_start
```

shall be populated or updated.

If multiple start events exist, retain the earliest approved actual start unless a reviewer explicitly overrides it.

---

## FR-019 — Actual Finish Date

When a COMPLETED event is approved and linked to an activity:

```text
activity.actual_finish
```

shall be populated or updated.

---

## FR-020 — Duplicate Detection

The system should detect likely duplicate progress events using combinations of:

- Activity ID
- Event type
- Event date/time
- Similar source text
- Source document

Potential duplicates should be flagged rather than silently duplicated.

---

## FR-021 — Delay Calculation

For completed activities:

```text
delay_days =
actual_finish - planned_finish
```

For active unfinished activities:

```text
delay_days =
current_date - planned_finish
```

Classify activities as:

```text
EARLY
ON_TIME
DELAYED
```

---

## FR-022 — Delay Reason Extraction

The system should identify delay reasons when explicitly stated.

Examples:

```text
Material unavailable
Manpower shortage
Equipment failure
Weather
Permit delay
Design change
Access issue
Safety hold
```

If no reason is present:

```text
delay_reason = null
```

The system must not guess.

---

## FR-023 — Unmatched Queue

The system shall provide a dedicated unmatched-event page.

Each record should show:

```text
Original report text
Extracted event
Top candidates
Similarity/confidence
Reason for uncertainty
Review actions
```

---

## FR-024 — Activity Details

Each activity page shall show:

```text
Activity ID
WBS
Description
Discipline
Location
Planned Start
Planned Finish
Actual Start
Actual Finish
Status
Delay
Linked Reports
Match History
Audit History
```

---

## FR-025 — Dashboard

The main dashboard shall display:

```text
Total Activities
Completed
In Progress
Not Started
Delayed
Pending Review
Unmatched
```

Additional metrics:

```text
Reports Processed
Events Extracted
High-Confidence Matches
Manual Overrides
```

---

## FR-026 — Discipline Dashboard

At minimum support:

```text
Civil
Piping
Mechanical
Electrical
Instrumentation
HSE
```

Users should be able to compare:

- Activity count
- Completion percentage
- Delayed activity count
- Pending review count

---

## FR-027 — Planned vs Actual View

Provide a visual timeline comparing:

```text
Planned Start → Planned Finish
Actual Start  → Actual Finish
```

Display delay days.

---

## FR-028 — Recent Activity Feed

Show recently approved execution events.

Example:

```text
10:32 AM
PIP-2458 started
Source: Daily Report #1042
Confidence: 94%
```

---

## FR-029 — Search

Search must support:

```text
Activity ID
Description
WBS
Discipline
Location
Asset
Document
Event
```

---

## FR-030 — Audit Trail

Maintain history for critical changes.

Each log should include:

```text
audit_id
action
entity_type
entity_id
old_value
new_value
user
timestamp
comment
source
```

---

## FR-031 — Source Traceability

Users must be able to navigate:

```text
Activity
   ↓
Matched Event
   ↓
Source Document
   ↓
Original Evidence
```

---

## FR-032 — Conversational Reporting

Provide a text input for supervisor-style reporting.

Example:

```text
Completed valve installation on Line 18-B at 4 PM.
```

This must use the same extraction and matching pipeline as uploaded reports.

---

## FR-033 — Voice-Ready Architecture

The backend shall accept a future speech-to-text transcript without changing the event-extraction pipeline.

MVP may use text input instead of full speech recognition.

---

# 6. AI Requirements

## AI-001 — Structured Extraction

The LLM must return schema-valid structured data.

## AI-002 — No Hallucinated Facts

The model must not create:

- Activity IDs
- Dates
- Times
- Quantities
- Locations
- Delay reasons

unless supported by source evidence.

## AI-003 — Extraction Confidence

Store extraction confidence where supported.

## AI-004 — Match Explainability

Show the main factors contributing to a suggested match.

Example:

```text
✓ Same discipline
✓ Same line identifier
✓ High semantic similarity
✓ Same location
```

## AI-005 — Model Failure Handling

If AI fails:

```text
Retry
↓
Fallback/manual entry
```

The source document must not be lost.

---

# 7. Data Requirements

## DR-001 — Schedule Data

Sample schedule should contain realistic L5/L6 records.

Recommended demo size:

```text
500–1,000 activities
```

## DR-002 — Disciplines

Include:

```text
Civil
Piping
Mechanical
Electrical
Instrumentation
HSE
```

## DR-003 — Sample Reports

Create reports with:

- Exact matches
- Synonyms
- Abbreviations
- Different sentence structures
- Missing information
- Multiple activities in one report
- Unmatched events
- Delay reasons
- Duplicate-like reports

## DR-004 — Synthetic Data

The hackathon demo must use synthetic/anonymized data.

No confidential OIL project information should be committed to Git.

---

# 8. Non-Functional Requirements

## NFR-001 — Performance

MVP target:

```text
Dashboard load: < 2 seconds
Typical report extraction: < 10 seconds
Match calculation: < 3 seconds/event
Schedule import: < 10 seconds for demo dataset
```

These are local/demo targets.

---

## NFR-002 — Reliability

The system should gracefully handle:

- Empty files
- Invalid files
- Malformed rows
- Missing columns
- AI timeouts
- API failures
- Database connection failures

---

## NFR-003 — Maintainability

Recommended backend modules:

```text
ingestion/
extraction/
normalization/
matching/
progress/
analytics/
audit/
```

Recommended frontend modules:

```text
dashboard/
projects/
schedule/
reports/
review/
activities/
analytics/
shared/
```

---

## NFR-004 — Security

The system must:

- Keep secrets in `.env`
- Never commit API keys
- Validate uploads
- Restrict dangerous file types
- Sanitize filenames
- Limit upload size
- Avoid logging sensitive credentials

---

## NFR-005 — Observability

Backend should log:

```text
Request
Processing stage
Duration
Errors
AI failures
Matching failures
```

Logs must not expose secrets.

---

## NFR-006 — Reproducibility

A new developer should be able to run the project using documented setup commands.

Preferred:

```bash
docker compose up
```

or a clearly documented local-development equivalent.

---

# 9. Technical Requirements

## TR-001 — Frontend

Required:

```text
React
TypeScript
Vite
```

Recommended:

```text
Tailwind CSS
shadcn/ui
TanStack Query
Axios
React Hook Form
Zod
Recharts
```

---

## TR-002 — Backend

Required:

```text
Python
FastAPI
Pydantic
```

Recommended:

```text
SQLAlchemy
Alembic
```

---

## TR-003 — Data Processing

Required:

```text
pandas
openpyxl
```

Recommended:

```text
NumPy
PyMuPDF
```

---

## TR-004 — Database

Required:

```text
PostgreSQL
pgvector
```

---

## TR-005 — AI

Required capabilities:

```text
LLM structured extraction
Embeddings
Semantic search
```

The model provider should remain replaceable.

---

## TR-006 — Containerization

Use:

```text
Docker
Docker Compose
```

Recommended services:

```text
frontend
backend
postgres
```

Optional:

```text
nginx
```

---

# 10. Database Requirements

The MVP should include at least:

```text
projects
schedule_activities
documents
progress_events
activity_matches
audit_logs
```

Relationships:

```text
Project
 ├── Schedule Activities
 ├── Documents
 ├── Progress Events
 └── Audit Logs

Progress Event
 └── Activity Match
       └── Schedule Activity
```

---

# 11. API Requirements

## Project

```http
POST   /api/projects
GET    /api/projects
GET    /api/projects/{id}
PATCH  /api/projects/{id}
```

## Schedule

```http
POST /api/projects/{id}/schedule/upload
GET  /api/projects/{id}/activities
GET  /api/activities/{id}
```

## Documents

```http
POST /api/projects/{id}/documents
GET  /api/projects/{id}/documents
GET  /api/documents/{id}
```

## Extraction

```http
POST /api/documents/{id}/extract
GET  /api/documents/{id}/events
```

## Matching

```http
POST /api/events/{id}/match
GET  /api/events/{id}/candidates
```

## Review

```http
POST /api/events/{id}/approve
POST /api/events/{id}/reject
POST /api/events/{id}/override
```

## Dashboard

```http
GET /api/projects/{id}/dashboard
GET /api/projects/{id}/delays
GET /api/projects/{id}/unmatched
GET /api/projects/{id}/recent-events
```

---

# 12. UX Requirements

## UX-001 — Simple Workflow

```text
Create Project
     ↓
Upload Schedule
     ↓
Upload Report
     ↓
Extract
     ↓
Match
     ↓
Review
     ↓
Update Progress
     ↓
View Dashboard
```

## UX-002 — Explainability

AI suggestions should show:

- Confidence
- Candidate activity
- Matching reasons
- Original evidence

## UX-003 — Human Control

The user must always be able to override an AI suggestion.

## UX-004 — Error Visibility

Errors must be understandable to non-technical users.

Avoid raw stack traces in the UI.

---

# 13. Matching Quality Requirements

The test dataset should include at least:

```text
20 exact-match cases
20 paraphrased cases
10 abbreviation cases
10 identifier-heavy cases
10 ambiguous cases
10 unmatched cases
10 duplicate-like cases
```

Target MVP performance:

```text
Top-1 match accuracy: >85%
High-confidence precision: >90%
Extraction accuracy: >90%
```

These are internal synthetic-dataset targets, not production guarantees.

---

# 14. Testing Requirements

## Unit Tests

Test:

- File validation
- Schedule parsing
- Date normalization
- Event schema validation
- Confidence calculation
- Delay calculation
- Duplicate detection

## Integration Tests

Test:

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
Approve
      ↓
Update activity
      ↓
Dashboard
```

## AI Evaluation

Maintain a small labeled test set with expected outputs.

Measure:

```text
Extraction precision
Extraction recall
Top-1 matching accuracy
Top-3 matching recall
False high-confidence matches
```

---

# 15. Acceptance Requirements

The MVP shall be accepted when all of the following are demonstrated:

### A. Schedule ingestion

```text
Upload XLSX
→ validation
→ schedule activities stored
→ embeddings/index created
```

### B. Field report processing

```text
Upload TXT/XLSX
→ extraction
→ activity events generated
```

### C. AI extraction

```text
Unstructured text
→ structured event JSON
```

### D. Schedule linking

```text
Event
→ candidate activities
→ confidence score
→ suggested match
```

### E. Human review

```text
Review
→ Accept / Reject / Override
```

### F. Progress update

```text
Approved STARTED event
→ actual_start updated

Approved COMPLETED event
→ actual_finish updated
```

### G. Delay

```text
Planned finish
vs
Actual finish
→ delay days
```

### H. Dashboard

Dashboard shows:

```text
Completion
Progress
Delays
Unmatched events
Pending review
Discipline statistics
```

### I. Traceability

Every approved update can be traced back to its source report.

---

# 16. MVP Priority Matrix

## P0 — Critical

```text
Project creation
Schedule upload
Schedule parsing
Daily report ingestion
AI extraction
Semantic matching
Confidence score
Review queue
Activity update
Delay calculation
Dashboard
Audit trail
```

## P1 — Important

```text
PDF extraction
Voice transcript input
Duplicate detection
Advanced search
Delay reason analytics
```

## P2 — Optional

```text
OCR
Speech-to-text
Primavera adapter
MS Project adapter
Predictive delay model
Advanced institutional-memory search
```

---

# 17. Recommended Repository Requirements

```text
binary-beaters/
│
├── frontend/
│   ├── src/
│   ├── public/
│   └── package.json
│
├── backend/
│   ├── app/
│   │   ├── api/
│   │   ├── core/
│   │   ├── db/
│   │   ├── models/
│   │   ├── schemas/
│   │   ├── services/
│   │   │   ├── ingestion/
│   │   │   ├── extraction/
│   │   │   ├── matching/
│   │   │   ├── progress/
│   │   │   └── analytics/
│   │   └── main.py
│   ├── tests/
│   ├── requirements.txt
│   └── ...
│
├── data/
│   ├── sample/
│   └── processed/
│
├── scripts/
├── docs/
├── tests/
├── docker-compose.yml
├── .env.example
├── .gitignore
├── PRD.md
├── requirements.md
└── README.md
```

---

# 18. Environment Requirements

Example `.env.example`:

```env
APP_ENV=development

DATABASE_URL=postgresql+psycopg://postgres:postgres@localhost:5432/progressbridge

LLM_API_KEY=
LLM_MODEL=

EMBEDDING_API_KEY=
EMBEDDING_MODEL=

MAX_UPLOAD_SIZE_MB=25
```

Secrets must never be committed.

---

# 19. Development Rules for AI Coding Tools

AI coding assistants may be used, but generated code must follow these rules:

1. Do not invent APIs or libraries without verification.
2. Do not expose secrets.
3. Do not change database schema without migration.
4. Do not bypass validation.
5. Do not silently auto-approve low-confidence matches.
6. Keep business logic in backend services, not UI components.
7. Use typed request/response schemas.
8. Add tests for core matching and progress logic.
9. Preserve source evidence.
10. Keep implementation aligned with this requirements document.

---

# 20. Definition of Done

A feature is complete only when:

```text
Code implemented
     ↓
Validation added
     ↓
Error handling added
     ↓
Test added
     ↓
UI integrated when required
     ↓
Documentation updated
     ↓
Feature works end-to-end
```

---

# 21. Final MVP Requirement

The MVP must demonstrate this complete scenario:

```text
1. Import an L5/L6 project schedule.
2. Upload a field-progress report.
3. Extract one or more execution events.
4. Identify discipline/activity/entity/date/time.
5. Retrieve matching schedule activities.
6. Assign confidence.
7. Show reasons for the suggested match.
8. Allow planner approval or override.
9. Update actual progress.
10. Calculate delay.
11. Reflect changes in the dashboard.
12. Trace the update back to the original source.
```

This end-to-end path is the primary implementation requirement for SIH 26122.
