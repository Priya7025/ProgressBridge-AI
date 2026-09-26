# AGENTS.md — ProgressBridge AI Next-Round Execution Plan

## 1. Mission

ProgressBridge AI has cleared Round 1 of the hackathon.

The next-round goal is **not to build a huge number of features**. The goal is to make the existing product:

1. Fast and responsive
2. More polished and realistic
3. Clearly role-based for Planner and Supervisor
4. Stronger in field execution workflow
5. Differentiated through **Visual Execution Verification**
6. Ready for a strong 3–4 minute online demo video

### Core product story

> **Planner plans. Supervisor captures. AI understands. Visual AI verifies. Planner approves. ProgressBridge updates the project truth.**

---

# 2. CRITICAL RULES

## DO

- Keep the existing real-data architecture.
- Use real Supabase data.
- Reuse the existing schedule/matching/progress workflow.
- Keep PIP-2458 as the main demo activity.
- Build generic functionality, not PIP-2458-specific hardcoding.
- Use loading skeletons/progressive rendering instead of blank screens.
- Test every feature with the actual database.
- Keep changes modular so they can be merged safely.
- Document important implementation decisions in the PR.

## DO NOT

- Do NOT deploy to production yet.
- Do NOT spend time on permanent n8n hosting.
- Do NOT add Cloudinary yet.
- Do NOT replace Supabase Storage unless a real limitation is proven.
- Do NOT rewrite the working matching engine.
- Do NOT lower matching thresholds just to make the demo look better.
- Do NOT hardcode dashboard counts, PIP-2458 status, confidence, delays, or AI outputs.
- Do NOT create fake/mock progress data for the final demo.
- Do NOT build signup functionality now.
- Do NOT add 3D reconstruction in this sprint.
- Do NOT build complex predictive ML unless all P0/P1 work is complete.
- Do NOT redesign unrelated pages while fixing one feature.
- Do NOT merge another member's branch blindly; resolve conflicts carefully and preserve working functionality.

---

# 3. EXISTING GOLDEN FLOW — MUST NEVER BREAK

The existing core workflow is:

```text
Schedule
   ↓
Daily Report / Time Agent
   ↓
Gemini Extraction
   ↓
Structured Progress Event
   ↓
Hybrid Schedule Matching
   ↓
Confidence + Review Queue
   ↓
Planner Accepts Match
   ↓
Actual Start / Finish
   ↓
Delay Calculation
   ↓
Dashboard
   ↓
Audit Trail
```

The new visual feature must extend this flow, not replace it.

New direction:

```text
Engineering Design
        +
Daily Report
        +
Site Photos
        ↓
ProgressBridge AI
        ↓
Text Intelligence + Visual Intelligence
        ↓
Planner Review
        ↓
Trusted Schedule-Linked Progress
```

---

# 4. PRIORITY ORDER

## P0 — MUST FINISH FIRST

1. Performance / loading fixes
2. Supervisor Activity Center
3. Deadline + discipline filtering/sorting
4. Login + role selection UI
5. Home page content/polish
6. Protect existing end-to-end text/report workflow

## P1 — MAIN DIFFERENTIATOR

7. Design image upload
8. Site photo upload
9. Activity-linked image storage
10. View classification
11. Design vs actual visual comparison
12. Visual confidence + evidence
13. Planned vs Actual viewer

## P2 — ONLY AFTER P0/P1

14. Difference highlighting
15. Visual timeline
16. Better Time Agent role-specific experience
17. Final visual polish
18. Demo video preparation

---

# 5. TEAM STRUCTURE

There are 4 members.

## MEMBER 1 — AI + VISUAL INTELLIGENCE

### Primary responsibility

Build the **Visual Execution Verification** backend/AI pipeline.

### Tasks

#### P1.1 Design image analysis
- Accept planner-uploaded design images.
- Store metadata:
  - project_id
  - activity_id
  - view_type
  - storage_path
  - uploaded_by
  - created_at
- Supported view types for MVP:
  - FRONT
  - LEFT
  - RIGHT
  - TOP
  - OTHER

#### P1.2 Site image analysis
- Accept supervisor site photos.
- Analyze:
  - likely view type
  - visible asset/object
  - discipline clues
  - location clues when available
  - image quality
- Return structured JSON.

#### P1.3 View classification
Example:

```json
{
  "view_type": "FRONT",
  "confidence": 0.94
}
```

#### P1.4 Visual comparison
Given:
- design image
- site image

Return structured result such as:

```json
{
  "asset_consistent": true,
  "view_consistent": true,
  "visual_similarity": 0.89,
  "completion_state": "NEAR_COMPLETE",
  "confidence": 0.88,
  "differences": [
    "Temporary scaffolding visible"
  ]
}
```

Do not claim exact construction percentage unless supported by reliable logic.

#### P1.5 Evidence result
Store the AI result so reopening the activity does NOT trigger Gemini again.

### Efficiency requirements

- Analyze one batch/job, not repeated calls for every page refresh.
- Do not call Gemini again when an identical analysis already exists.
- Resize/compress images before expensive AI processing.
- Keep AI outputs structured and deterministic where practical.
- If image quality is poor, return a clear review state instead of inventing conclusions.

### Must not change

- Existing text extraction workflow unless required for visual integration.
- Existing matching thresholds.
- Existing PIP-2458 behavior.

---

# 6. MEMBER 2 — BACKEND + DATABASE + SCHEDULE EXPERIENCE

### Primary responsibility

Build data support for:

- supervisor activity center
- deadlines
- filters/sorting
- visual evidence tables
- API/data access

### P0.1 Supervisor activities

Create/query a list of activities relevant to the supervisor.

Each activity should expose:

- activity_id
- description
- discipline
- asset
- location
- planned_start
- planned_finish
- actual_start
- actual_finish
- status
- deadline state

Deadline states should be calculated from real dates, for example:

```text
Due today
Due in 1 day
Due in 3 days
Overdue by 2 days
```

Never hardcode these values.

### P0.2 Sorting/filtering

Support:

#### Discipline
- All
- Civil
- Mechanical
- Electrical
- Piping
- Instrumentation
- HSE

#### Status
- All
- Not Started
- In Progress
- Pending Review
- Completed
- Overdue

#### Sort
- Deadline — nearest first
- Deadline — farthest first
- Activity name
- Status

### P1.3 Visual database

Suggested tables:

#### `design_images`

```text
id
project_id
activity_id
storage_path
view_type
uploaded_by
created_at
```

#### `site_images`

```text
id
project_id
activity_id
storage_path
capture_date
view_type
uploaded_by
latitude (nullable)
longitude (nullable)
created_at
```

#### `visual_comparisons`

```text
id
activity_id
design_image_id
site_image_id
view_match_score
visual_similarity
completion_state
differences
confidence
status
created_at
```

Use the existing schema conventions and inspect the current project before adding anything.

### Performance requirements

- Do not fetch all 890 activities for every screen.
- Use pagination/limits for activity lists.
- Fetch only the fields needed by the page.
- Run independent queries in parallel where possible.
- Add indexes only after checking current query patterns.
- Avoid duplicate requests.

### Must not break

- schedule upload
- activity details
- matching RPC
- review queue
- approval logic
- delay calculations
- audit log

---

# 7. MEMBER 3 — FRONTEND + UX + PERFORMANCE

### Primary responsibility

This member owns the visible product experience.

---

## P0.1 PERFORMANCE

First task: audit why pages take 10–12 seconds to load.

Audit:

- Dashboard
- Activity list
- Activity Details
- Review Queue
- Upload
- Time Agent

Check:

- request waterfalls
- duplicate Supabase requests
- sequential queries
- large client components
- unnecessary rerenders
- large JS bundles
- charts loading too early
- full-table fetches
- missing pagination
- missing caching
- unnecessary client-side data fetching

### Target experience

Instead of:

```text
Click
↓
blank screen
↓
10–12 seconds
↓
everything
```

Aim for:

```text
Click
↓
page shell immediately
↓
loading skeleton
↓
data progressively appears
```

Do not remove real data to make the page appear faster.

---

## P0.2 Supervisor Dashboard

Build a role-specific dashboard.

Example sections:

```text
SUPERVISOR DASHBOARD

Today's Work

Due Today
Due Tomorrow
Overdue
Completed

MY ACTIVITIES

PIP-2458
Erect Line 24-XX

Piping
North Unit

Due in 1 day
[Upload Progress]
```

### Filters

```text
Discipline [All ▼]
Status [All ▼]
Sort [Deadline ▼]
```

### Important UX

Deadline state must be visually clear:

- Due today
- Due in 1 day
- Due in 3 days
- Overdue

No fake colors/counts/data.

---

## P0.3 Login UI

Create:

```text
Welcome back

Email
Password

Role [Supervisor ▼]

[ LOG IN ]

Don't have an account?
SIGN UP
```

Role options:

- Supervisor
- Planner

### Demo requirement

Login can use the existing demo authentication behavior.

Signup does NOT need to be functional now.

If signup is clicked, use a clean non-breaking placeholder such as:

```text
Signup is coming soon.
```

Do not implement a full registration system in this sprint.

---

## P0.4 Home Page

Make the home page explain ProgressBridge in under 10 seconds.

### Hero

```text
ProgressBridge AI

Bridge planning and site execution with AI.
```

### Core story

```text
PLAN
Engineering Schedule

↓

CAPTURE
Reports + Photos + Voice

↓

UNDERSTAND
AI Extraction + Matching

↓

VERIFY
Human Review + Visual Evidence

↓

ACT
Real Progress + Delay Intelligence
```

### Feature sections

1. AI Progress Capture
2. Intelligent Schedule Linking
3. Visual Execution Verification

Add:

```text
[ LOG IN ]
[ SIGN UP ]
```

Signup is visual/presentation-only for now.

---

## P1.5 Visual Progress UI

Create a dedicated section inside Activity Details.

Example:

```text
PIP-2458 — Visual Progress

PLANNED DESIGN        ACTUAL SITE

[ Design Front ]      [ Site Front ]

[ Design Side ]       [ Site Side ]

AI Visual Analysis

✓ Asset detected
✓ View matched
✓ Location consistent

Visual Evidence Confidence
88%

[ Compare ]
```

Add a Planned ↔ Actual slider if time permits.

The goal is a highly understandable judge-facing interaction.

---

# 8. MEMBER 4 — INTEGRATION + QA + DEMO

### Primary responsibility

Keep the system stable while other members work.

### Tasks

#### P0.1 Regression protection

After every merge, verify:

- Dashboard loads
- Activity page loads
- PIP-2458 opens
- Upload works
- Text extraction works
- Matching works
- Review works
- Accept works
- Actual dates update
- Delay updates
- Audit trail updates

#### P0.2 Demo data

Keep the demo based on real data.

Main example:

```text
PIP-2458
Erect Line 24-XX
Piping
North Unit - Process Train A
Planned Start: 2026-08-20
Planned Finish: 2026-08-23
```

Existing real report:

```text
daily_site_report_piping_2026-08-20.txt
```

Do not create hardcoded visual results.

#### P0.3 Integration

- Merge only tested PRs.
- Resolve conflicts carefully.
- Run lint/build/type checks after significant merges.
- Never merge a feature that silently replaces DB-driven behavior with fake values.

#### P0.4 Demo preparation

Create the final clean demo sequence:

```text
Home
↓
Login
↓
Planner/Supervisor role
↓
Dashboard
↓
Activity
↓
Supervisor workflow
↓
Report upload / Time Agent
↓
AI extraction
↓
Schedule matching
↓
Human approval
↓
Actual progress + delay
↓
Visual Progress
↓
Planner Time Agent
↓
Final dashboard
```

---

# 9. TIME AGENT — ROLE-SPECIFIC PURPOSE

The Time Agent must have a clear reason to exist for each role.

## Supervisor Time Agent = CAPTURE

Goal:

> Let a supervisor report site activity naturally without filling rigid forms.

Example:

> “Line 24-XX erection started at 10:30 AM in North Unit.”

Expected structured output:

- Activity/event
- Asset
- Discipline
- Location
- Date
- Time
- Evidence/source text

## Planner Time Agent = UNDERSTAND

Goal:

> Let a planner query project intelligence from real data.

Example questions:

- “Which activities are delayed?”
- “Show Piping activities due this week.”
- “What happened to PIP-2458?”
- “Which activities are pending review?”
- “Why is PIP-2458 delayed?”
- “Which activities have not received progress recently?”

### Important

Do not build a generic chatbot.

The role determines the assistant's purpose.

---

# 10. VISUAL EXECUTION VERIFICATION — MVP

## Planner side

Planner uploads:

```text
Activity: PIP-2458

Front Design
Side Design
Top Design
```

## Supervisor side

Supervisor uploads:

```text
PIP-2458

Front Site Photo
Side Site Photo
Top Site Photo
```

## AI

AI determines:

- view type
- image quality
- asset consistency
- visual consistency
- differences
- confidence

## Planner

Planner sees:

```text
PLANNED                  ACTUAL
Design Front             Site Front

Design Side              Site Side

Design Top               Site Top
```

Then:

```text
Visual Evidence Confidence: 88%

✓ Asset consistent
✓ View consistent
✓ Expected object visible

⚠ Temporary scaffolding detected
```

### Important safety/accuracy principle

Visual AI should be presented as **evidence and a signal**, not as an unquestionable engineering certification.

---

# 11. IMAGE STORAGE

Use **Supabase Storage** for the MVP.

Do NOT add Cloudinary unless a real performance/storage problem appears.

Recommended flow:

```text
Upload
↓
Compress/resize
↓
Supabase Storage
↓
Store path + metadata in DB
↓
Gemini Vision analysis
↓
Save structured result
```

Do not store image binaries inside PostgreSQL.

### Image efficiency

- Compress large phone images
- Prefer ~1–3 MB optimized images
- Resize large dimensions
- Generate thumbnails where useful
- Do not re-run AI analysis when the same analysis already exists

---

# 12. GIT WORKFLOW

Use:

```text
feature branch
    ↓
Pull Request
    ↓
dev
    ↓
Testing
    ↓
master
```

### Rules

- No direct feature work on master.
- Avoid direct dev edits unless required for integration.
- One feature = one focused branch/PR.
- PR description must say:
  - what changed
  - what was tested
  - what remains
- Keep commits small and meaningful.
- Do not merge unrelated cleanup with feature work.

---

# 13. TEAM DEADLINE PLAN

## Phase 1 — Foundation

### Member 1
AI visual pipeline design + schema review

### Member 2
Supervisor activity APIs + deadline/filter/sort data

### Member 3
Performance audit + fixes

### Member 4
Regression baseline + integration protection

**Do not start visual UI polishing until the performance problem is understood.**

---

## Phase 2 — Product Experience

### Member 1
Visual analysis + structured results

### Member 2
Image storage tables + backend endpoints

### Member 3
Supervisor dashboard + login + home page

### Member 4
Continuous integration + testing

---

## Phase 3 — Visual Feature

### Member 1
Gemini Vision comparison

### Member 2
Visual comparison persistence + activity integration

### Member 3
Planned vs Actual visual UI

### Member 4
End-to-end QA

---

## Phase 4 — Demo Polish

All members stop adding major features.

Only:

- bug fixes
- loading states
- error states
- spacing/alignment
- text cleanup
- demo data validation
- demo rehearsal

---

# 14. DEFINITION OF DONE

A task is NOT complete just because the code compiles.

It is complete only when:

- Feature works through the UI
- Real database data is used
- No hardcoded demo values
- Empty/loading/error states work
- Existing golden flow still works
- Lint/typecheck/build pass where applicable
- Another team member can reproduce it

---

# 15. FINAL ACCEPTANCE CHECKLIST

## Performance

- [ ] Dashboard no longer waits 10–12 seconds with a blank screen
- [ ] Activity page loads progressively
- [ ] Activity lists are paginated/limited
- [ ] Duplicate data requests removed

## Roles

- [ ] Login role selector works
- [ ] Supervisor gets supervisor experience
- [ ] Planner gets planner experience
- [ ] Signup button does not break the UI

## Supervisor

- [ ] Activities visible
- [ ] Deadline state shown
- [ ] Discipline filter works
- [ ] Deadline sort works
- [ ] Status filtering works
- [ ] Progress upload accessible

## Planner

- [ ] Schedule visible
- [ ] Review queue works
- [ ] Activity details work
- [ ] Visual evidence visible
- [ ] Time Agent can answer project questions

## Time Agent

- [ ] Supervisor = field capture
- [ ] Planner = project intelligence

## Visual Progress

- [ ] Design upload
- [ ] Site photo upload
- [ ] Activity-linked storage
- [ ] View classification
- [ ] Visual comparison
- [ ] Confidence/evidence
- [ ] Planned vs Actual view
- [ ] AI result saved and reused

## Core

- [ ] PIP-2458 flow still works
- [ ] Match confidence still data-driven
- [ ] Review approval works
- [ ] Actual dates update
- [ ] Delay updates
- [ ] Audit trail updates
- [ ] No fake dashboard numbers

---

# 16. DEMO VIDEO STORY

The demo should NOT feel like a tour of 25 features.

Tell one story:

> **A project is planned. Work happens on site. The supervisor captures progress. AI structures and links it to the schedule. The planner verifies it. Then visual evidence shows what was actually built versus what was planned.**

Recommended order:

```text
1. Home page
2. Login + role
3. Planner dashboard
4. PIP-2458 schedule activity
5. Supervisor Activity Center
6. Deadline/filter/sort
7. Supervisor report / Time Agent
8. AI extraction
9. Matching + confidence
10. Planner approval
11. Actual dates + delay
12. Visual Progress
13. Planner Time Agent
14. Final dashboard
```

### Signature line for the demo

> **“We don't just ask AI what happened on site. We connect what was planned, what was reported, and what is visibly present on site.”**

---

# 17. ANTI-SCOPE-CREEP RULE

When someone proposes a new feature, ask:

1. Does it improve the final demo?
2. Does it strengthen the planning-to-execution story?
3. Can we complete and test it within this sprint?
4. Will it risk breaking the existing golden flow?

If the answer is not clearly yes, postpone it.

## Golden rule

> **A smaller number of real, reliable, visually clear features is better than many unfinished AI features.**
