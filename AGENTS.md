# ProgressBridge AI — 2-Day Hackathon Agent Guide

## 1. Project Mission

We are building **ProgressBridge AI** for SIH 2026, PS 26122:

> Intelligent Data Capture & Schedule-Linking Layer for Infrastructure Project Management: Real-Time Actual Progress Tracking (Planning-to-Execution Bridge)

The demo must prove one real end-to-end flow:

**Planner uploads schedule → Supervisor uploads/sends field report → Gemini extracts structured progress → system matches report to L5/L6 schedule activity → confidence score shown → reviewer accepts → actual progress/status is updated → delay is calculated → dashboard reflects the delay → audit trail is recorded.**

### Golden demo activity

Use **PIP-2458 — Erect Line 24-XX** as the primary acceptance-test activity.

Expected real flow:

1. Schedule contains PIP-2458.
2. Supervisor submits a report about 24-XX spool erection in North Unit.
3. Gemini extracts the activity event.
4. Matching produces a realistic confidence score around the high-80% range.
5. Event enters review when below the current auto-approval threshold.
6. Reviewer accepts.
7. Activity becomes COMPLETED with actual dates.
8. Planned finish: 2026-08-23.
9. Actual finish: 2026-08-31.
10. Dashboard shows the resulting +8 day delay.
11. Audit log records the approval/change.

Do not fake these results for the final demo. The application must generate them through the real data flow.

---

# 2. Non-Negotiable Team Rules

## Branching

Production:
- `master`

Integration/testing:
- `dev`

Feature branches:
- `feature/ingestion`
- `feature/matching`
- `feature/frontend`
- `feature/integration`

Workflow:

```text
feature/* → Pull Request → dev → testing → master
```

Never push directly to `dev` or `master`.

## Before starting work

Every member:

```powershell
git fetch origin
git checkout dev
git pull origin dev
git status
```

Create/use your own feature branch:

```powershell
git checkout -b feature/<your-area>
```

## Before committing

```powershell
git status
git diff
```

Do not commit:
- `.env`
- API keys
- Supabase service-role keys
- Gemini/Voyage keys
- Render secrets
- ngrok secrets

## Commit and PR

```powershell
git add .
git commit -m "feat: <clear description>"
git push origin feature/<your-area>
```

Then open:

```text
feature/<your-area> → dev
```

The team lead reviews and merges.

---

# 3. How To Use AI Coding Tools

Each member may use:

- ChatGPT — architecture, debugging, test planning, SQL/API reasoning
- Claude — code review, refactoring, edge cases, complex debugging
- Antigravity — repository inspection, implementation, integration, testing
- Other coding agents — only when they understand the current repository state

## Rule for AI agents

Never tell an AI agent:

> "Build the whole project."

Instead give it:
1. exact task
2. exact files/folders to inspect
3. current expected behavior
4. constraints
5. acceptance tests
6. instruction not to redesign unrelated UI
7. instruction not to fabricate data

## Every agent task must end with

Ask the agent to report:

```text
Files changed:
What was implemented:
Tests executed:
Test results:
Known limitations:
Environment variables required:
Any database/migration changes:
Commit-ready: YES/NO
```

---

# 4. MEMBER 1 — INGESTION + GEMINI + n8n

## Branch

```text
feature/ingestion
```

## Owner

Member 1 owns the complete path:

**Supervisor input → n8n webhook → Gemini extraction → validation → progress_events → response**

This member also owns deploying n8n on Render.

---

## Task 1 — Deploy n8n to Render

### Goal

Move the demo ingestion workflow away from local n8n + ngrok.

### Requirements

Deploy a persistent n8n instance on Render.

Configure:
- n8n runtime
- persistent storage/database as required by the chosen Render setup
- webhook accessibility
- Gemini credentials
- Supabase credentials
- required environment variables

The final webhook must be publicly reachable.

Expected endpoint shape:

```text
https://<render-n8n-domain>/webhook/ingest-text
```

### Acceptance test

Send a real POST request to the webhook:

```json
{
  "project_id": "<active-project-id>",
  "text_content": "24-XX spool erection started at 10:30 AM in North Unit.",
  "source_type": "time_agent"
}
```

Confirm:
- webhook receives request
- workflow executes
- Gemini runs
- Supabase receives the event
- workflow does not silently fail
- response is meaningful

---

## Task 2 — Verify Gemini extraction

Extraction must produce structured fields, not only free text.

Minimum fields:

```text
project_id
activity_description
discipline
asset
location
event_type
event_date
event_time
source_type
```

Expected example:

```json
{
  "discipline": "Piping",
  "activity_description": "24-XX spool erection started at 10:30 AM in North Unit.",
  "asset": "Line 24-XX",
  "location": "North Unit",
  "event_type": "STARTED"
}
```

### Requirements

Handle:
- clear reports
- missing fields
- different wording
- date/time variations
- irrelevant text
- malformed requests
- Gemini/API failure

Do not create fake successful records when Gemini fails.

---

## Task 3 — Verify progress_events insertion

Confirm the extracted event is stored in Supabase with the correct project.

Expected initial state:

```text
PENDING_MATCH
```

Do not accidentally create duplicate events from one upload.

---

## Task 4 — Make the webhook reliable

Test:

```text
200 success
400 invalid payload
500 workflow/server failure
timeout behavior
Gemini failure
Supabase failure
```

Do not expose secrets in responses or logs.

If n8n currently responds immediately before workflow completion, configure the workflow so the frontend receives a useful completion/error response where practical.

---

## Task 5 — Connect frontend environment

Provide the team with the permanent Render webhook.

Frontend should ultimately use:

```text
INGESTION_WEBHOOK_URL=<render-webhook-url>
```

Do not commit the real URL if the project treats it as secret/configuration.

---

## Task 6 — Export and document n8n

Keep the workflow export in:

```text
n8n/workflows/
```

Update documentation with:
- workflow name
- webhook path
- expected payload
- required credentials/env variables
- how to test
- known limitations

---

## Member 1 definition of done

Member 1 is finished only when:

- Render n8n is running
- `/webhook/ingest-text` is reachable
- Gemini extraction works
- Supabase insertion works
- invalid input is handled
- frontend can use the endpoint
- no local ngrok is required for the final demo
- another teammate can reproduce the test from the documentation

---

# 5. MEMBER 2 — MATCHING + REVIEW + ACTUAL PROGRESS + DELAY

## Branch

```text
feature/matching
```

## Owner

Member 2 owns:

**progress event → schedule matching → confidence → review → acceptance → actual dates/status → delay → audit**

This is the core intelligence and business-logic path.

---

## Task 1 — Verify schedule matching

Confirm matching uses the existing hybrid approach:

```text
semantic similarity
+ activity/asset identifier
+ discipline
+ location
```

Current conceptual weights:

```text
50% semantic
25% identifier
15% discipline
10% location
```

Do not replace the working matcher with a simpler exact-text lookup.

---

## Task 2 — Verify embedding pipeline

Confirm:
- schedule activities can be embedded
- embeddings have the expected dimension
- matching can retrieve candidates
- missing embeddings do not crash the pipeline
- embedding API failures are handled

Keep the current production/demo embedding strategy unless there is a verified reason to change it.

---

## Task 3 — Verify confidence classification

The system should support three outcomes conceptually:

```text
High confidence → automatic/fast acceptance
Medium confidence → PENDING_REVIEW
Low confidence → UNMATCHED
```

For the current demo, ensure the PIP-2458 test enters the review flow rather than bypassing it.

Do not hardcode the displayed score.

---

## Task 4 — Verify PIP-2458 matching

Use the real activity:

```text
Activity ID: PIP-2458
Description: Erect Line 24-XX
Discipline: Piping
Location: North Unit
```

Supervisor report:

```text
24-XX spool erection started at 10:30 AM in North Unit.
```

Expected result:
- PIP-2458 selected
- discipline match
- location match
- identifier/asset match
- semantic score present
- final confidence shown
- event becomes reviewable

The exact confidence value may vary slightly; do not hardcode it.

---

## Task 5 — Verify review queue

Review item should display enough information for a planner/reviewer to trust the recommendation:

```text
Source report
Suggested activity
Activity code
Discipline
Location
Confidence score
Sub-scores
Event type
Event date/time
```

---

## Task 6 — Verify Accept action

When reviewer accepts PIP-2458:

```text
activity_match → APPROVED
progress_event → MATCHED
schedule activity → updated
audit_log → MATCH_APPROVED
```

No duplicate match records.

---

## Task 7 — Verify actual progress logic

For the PIP-2458 demo path:

```text
Actual Start = 2026-08-20
Actual Finish = 2026-08-31
Status = COMPLETED
```

These values must come from the real accepted event/progress flow.

Do not hardcode them into frontend components.

---

## Task 8 — Verify delay calculation

Planned finish:

```text
2026-08-23
```

Actual finish:

```text
2026-08-31
```

Expected:

```text
+8 days delay
```

The calculation must be data-driven.

Also test an on-time activity so that:

```text
delay = 0
```

is possible.

---

## Task 9 — Verify audit trail

Acceptance must create an audit entry containing enough information to answer:

```text
Who approved it?
When?
Which activity?
What changed?
What were the old/new values?
```

Do not remove audit logging just to make the demo simpler.

---

## Member 2 definition of done

- PIP-2458 is found by real matching
- confidence is computed, not hardcoded
- review queue receives it
- Accept works
- actual dates update
- status updates
- delay is calculated
- audit log is written
- no fake KPI/data logic exists
- edge cases do not crash the workflow

---

# 6. MEMBER 3 — FRONTEND + API + DATA BINDING

## Branch

```text
feature/frontend
```

## Owner

Member 3 owns the UI's connection to the real backend.

### IMPORTANT

Do NOT redesign the existing UI.

Keep:
- current layout
- current white theme
- current visual style
- current navigation

Only fix functionality, data binding, states and bugs.

---

## Task 1 — Dashboard

Verify dashboard metrics are database-driven.

Minimum important metrics:

```text
Total activities
Completed
Delayed
Pending Review
Unmatched
```

The dashboard must react to real database changes.

Example:

```text
Before acceptance:
Delayed = 0

After PIP-2458 acceptance:
Delayed = 1
```

Do not hardcode:

```text
Delayed = 10
```

or any other presentation-only value.

---

## Task 2 — Activity Details

For PIP-2458, Activity Details must show real fields:

```text
Activity ID
Description
Status
Planned Start
Planned Finish
Actual Start
Actual Finish
Variance
Linked Match
Confidence
Source Report
Audit History
```

Support both UUID and activity-code lookup where the current route/API requires it.

---

## Task 3 — Review page

Verify the page renders:
- real pending records
- real confidence scores
- source report
- suggested activity
- sub-scores
- event details
- Accept action
- Reject/action behavior if already supported

No fake review rows.

---

## Task 4 — Supervisor report upload

Verify:
- valid file uploads
- supported text/report data is processed
- loading state works
- errors are visible
- successful ingestion is reflected in backend/UI

The UI should not claim success before the backend actually accepts the request.

---

## Task 5 — Time Agent

Verify Time Agent uses the real server route and real n8n ingestion endpoint.

Expected path:

```text
Time Agent UI
→ /api/time-agent
→ INGESTION_WEBHOOK_URL
→ n8n
→ Gemini
→ progress_events
```

Remove any:
- `setTimeout`
- fake response
- mock success message
- local demo response

---

## Task 6 — Empty-state correctness

After demo reset:

```text
No fake progress records
No fake review rows
No fake delayed KPI
No fake activity completion
```

Schedule activities may remain because the schedule itself is real.

---

## Task 7 — Error states

Check:
- backend unavailable
- n8n unavailable
- empty result
- missing project
- invalid activity
- malformed response

Show useful messages instead of blank screens.

---

## Member 3 definition of done

- all visible data comes from real APIs/DB
- no hardcoded demo values
- PIP-2458 data renders correctly
- review actions trigger backend changes
- dashboard updates after backend changes
- Time Agent is real
- no unrelated UI redesign
- build/lint/typecheck pass

---

# 7. MEMBER 4 — INTEGRATION + QA + DATASET + DEMO

## Branch

```text
feature/integration
```

## Owner

Member 4 is the integration/QA owner.

This member should NOT wait until the final hours to test.

---

## Task 1 — Create one repeatable E2E test

The acceptance flow:

```text
RESET
 ↓
Upload 890-row schedule
 ↓
Confirm Total = 890
 ↓
Supervisor sends/uploads report
 ↓
n8n receives it
 ↓
Gemini extracts event
 ↓
progress_events created
 ↓
Matcher finds PIP-2458
 ↓
Confidence shown
 ↓
Review queue gets event
 ↓
Reviewer accepts
 ↓
PIP-2458 updates
 ↓
Actual finish = 2026-08-31
 ↓
Delay = +8 days
 ↓
Dashboard delayed count increases
 ↓
Audit log exists
```

---

## Task 2 — Test negative cases

At minimum:

### Case A — Normal valid report

Expected:
```text
matched/reviewable
```

### Case B — Ambiguous report

Expected:
```text
PENDING_REVIEW
```

### Case C — Unknown activity

Expected:
```text
UNMATCHED
```

### Case D — Invalid/malformed input

Expected:
```text
validation error
```

### Case E — Duplicate submission

Expected:
```text
no accidental duplicate progress event/match
```

---

## Task 3 — Dataset verification

Confirm schedule CSV behavior:

```text
890 activities
```

Confirm disciplines are still represented.

The schedule upload should:
- parse correctly
- reject malformed rows
- upsert correctly
- preserve activity IDs
- preserve planned dates
- preserve embeddings where applicable

Do not modify the dataset just to make metrics look better.

---

## Task 4 — Reset workflow

Verify the demo can return to a clean state.

Clean state should mean:

```text
Schedule: present
Progress events: empty
Matches: empty
Audit logs: empty
Actual dates: reset
Statuses: reset appropriately
```

Do not delete the schedule itself unless the demo specifically requires full re-import.

---

## Task 5 — Cross-browser/manual test

Run the actual application in at least:
- Chrome
- one additional browser if time permits

Check:
- login
- dashboard
- schedule upload
- supervisor input
- review
- accept
- activity details
- dashboard refresh

---

## Task 6 — Demo documentation

Create/update:

```text
README.md
docs/demo-script.md
docs/troubleshooting.md
```

Demo script should contain exact clicks/input in order.

Use the same PIP-2458 scenario for every rehearsal.

---

## Task 7 — Regression gate

Before recommending merge to `master`, run:

```powershell
npm run lint
npm run typecheck
npm run build
```

and the E2E manual flow.

If a feature breaks another member's work, stop and coordinate before merging.

---

## Member 4 definition of done

- full flow tested
- edge cases tested
- reset verified
- dataset verified
- documentation ready
- build/lint/typecheck pass
- no critical blocker remains

---

# 8. TEAM INTEGRATION SCHEDULE

## DAY 1 — Build + Integrate

### First block

Member 1:
- Render n8n deployment
- Gemini workflow verification
- permanent webhook

Member 2:
- matcher/review verification
- PIP-2458 path

Member 3:
- frontend data binding
- dashboard/review/activity fixes

Member 4:
- E2E test plan
- dataset/reset verification

### Middle block

Create PRs:

```text
feature/ingestion → dev
feature/matching → dev
feature/frontend → dev
feature/integration → dev
```

Team lead merges safe PRs into `dev`.

### End of Day 1

The complete PIP-2458 flow must work on `dev`.

If not, stop adding features and fix the broken path.

---

# 9. DAY 2 — STABILIZE + DEPLOY + REHEARSE

## Morning

Run the complete E2E flow repeatedly.

Fix:
- deployment failures
- environment variables
- API errors
- database mismatches
- UI/backend mismatches
- duplicate events
- stale dashboard values

## Afternoon

Deploy the `dev` build to the demo/staging environment.

Test:

```text
Browser
→ deployed frontend
→ real Supabase
→ hosted n8n
→ Gemini
→ matching
→ review
→ audit
```

No local-only dependency should remain.

## Final phase

Freeze feature work.

Only fix blockers.

Then:

```text
dev → master
```

Deploy final `master` version.

---

# 10. Environment Variables

Never commit real secrets.

Typical categories include:

```text
Supabase URL
Supabase anon/public key
Supabase service key where server-side only
Gemini API key
Voyage/embedding API key where required
INGESTION_WEBHOOK_URL
N8N_WEBHOOK_BASE_URL
```

Keep secrets in:
- local `.env.local`
- Vercel environment settings
- Render environment settings
- Supabase/Edge Function secrets
- n8n credentials/environment

---

# 11. What NOT To Do

Do not:

- redesign the UI
- add unnecessary features
- replace working architecture without proof
- hardcode demo metrics
- hardcode PIP-2458 completion
- fake confidence scores
- fake review records
- fake delay values
- create mock backend responses
- delete audit logging
- push directly to `dev`
- push directly to `master`
- commit `.env` files
- spend hours on low-value visual polish
- change the database schema without telling the team
- merge code that has not been tested

---

# 12. Priority Order

When time is limited, use this priority:

## P0 — Must work

```text
Schedule upload
Supervisor input
n8n
Gemini
progress_events
Matching
Review
Accept
Actual dates/status
Delay calculation
Dashboard
Audit log
```

## P1 — Important

```text
Time Agent
Unmatched flow
Ambiguous flow
Error handling
Reset
Deployment stability
```

## P2 — Nice to have

```text
Extra analytics
Advanced forecasting
Extra UI polish
Non-essential filters
```

Do not sacrifice P0 functionality for P2 features.

---

# 13. Final Demo Acceptance Checklist

The project is demo-ready only when all are YES:

- [ ] Hosted n8n works without local laptop dependency
- [ ] Gemini extraction is real
- [ ] 890-row schedule upload works
- [ ] Supervisor report creates a real progress event
- [ ] PIP-2458 is matched by the real matcher
- [ ] Confidence/sub-scores are real
- [ ] Review queue is real
- [ ] Accept action is real
- [ ] Actual Start/Finish are persisted
- [ ] PIP-2458 becomes COMPLETED
- [ ] +8 day delay is calculated
- [ ] Dashboard delayed KPI updates from DB
- [ ] Audit log is written
- [ ] No fake presentation values remain
- [ ] Reset returns the app to a clean demo state
- [ ] Deployed frontend works
- [ ] Deployed n8n works
- [ ] Build passes
- [ ] Lint passes
- [ ] Typecheck passes
- [ ] Full demo has been rehearsed at least 3 times

---

# 14. Standard AI Prompt Template

Use this when assigning a coding-agent task:

```text
You are working on ProgressBridge AI.

First inspect the existing repository and understand the current implementation.

Task:
<exact task>

Context:
<why this matters>

Relevant files:
<files/folders>

Constraints:
- Do not redesign unrelated UI.
- Do not introduce fake/mock/demo values.
- Reuse existing architecture where possible.
- Do not commit secrets.
- Do not modify unrelated features.
- Preserve existing working functionality.

Acceptance criteria:
1. ...
2. ...
3. ...

Before finishing:
- run lint
- run typecheck
- run build if practical
- test the changed flow
- report files changed
- report tests and results
- report known limitations
- do not commit/push unless explicitly requested.
```

---

# 15. Team Lead Merge Rule

The team lead controls integration.

For every PR:

```text
1. Check changed files
2. Check for hardcoded/fake data
3. Check environment changes
4. Review DB/schema changes
5. Pull/test on dev
6. Run lint/typecheck/build
7. Run the affected E2E path
8. Merge to dev
```

Only after all P0 acceptance checks pass:

```text
dev → master
```

---

# 16. Golden Rule

**The final presentation must demonstrate a real system, not a scripted screen.**

A judge should be able to watch:

**messy field input → AI extraction → intelligent matching → human trust/review → schedule-linked update → delay calculation → auditable project intelligence**

and see the database-backed result change live.
