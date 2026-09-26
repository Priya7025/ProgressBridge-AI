# ProgressBridge AI — Troubleshooting & Incident Guide

This document captures real issues, symptoms, root causes, workarounds, and fallbacks encountered during testing and integration. Keep this document accessible during Day 2 rehearsals and the final presentation.

---

## 1. Confirmed Issues & Active Diagnostics

### Issue 1: Invalid Gemini Model Identifier in n8n Workflows
- **Symptom**: AI extraction fails with `404 Model Not Found` or crashes the n8n execution when invoking the Google Gemini Chat Model node.
- **Root Cause**: The exported workflow JSON (`n8n/workflows/free-text-ingestion.json` and `n8n/workflows/member1-ai-extraction.json`) specifies `"modelName": "models/gemini-3.6-flash"`. `gemini-3.6-flash` is not a valid Google API model name.
- **Status**: **Pending Member 1**
- **Owner**: Member 1 (Ingestion)
- **Fix / Workaround**:
  - Update the n8n Google Gemini Chat Model node `modelName` parameter to `models/gemini-1.5-flash` or `models/gemini-2.0-flash`.
  - Re-export the workflow JSON to `n8n/workflows/`.

---

### Issue 2: Asset Field Extraction Gap (`asset` = `null`)
- **Symptom**: Field reports like *"24-XX spool erection started at 10:30 AM in North Unit"* produce `discipline = "Piping"`, `location = "North Unit"`, and `activity_description = "24-XX spool erection"`, but `asset = null` in the `progress_events` table. Consequently, `identifier_score` is computed as `0.0`, causing the matcher to score `PIP-2420` higher than `PIP-2458`.
- **Root Cause**: The Structured Output Parser prompt does not explicitly instruct the LLM to isolate equipment/line tags (e.g., `24-XX`, `Line 24-XX`) into the `asset` JSON field, allowing it to remain embedded in `activity_description`.
- **Status**: **Pending Member 1**
- **Owner**: Member 1 (Ingestion)
- **Fix / Workaround**:
  - Add explicit extraction guidelines and few-shot examples in the Gemini prompt:
    > *"Extract equipment numbers, line numbers, or asset tags (e.g., 'Line 24-XX', '24-XX', 'E-101') into the 'asset' field."*
  - Verify that `progress_events.asset` contains `"Line 24-XX"` or `"24-XX"` upon submission.

---

### Issue 3: Asynchronous Webhook Timing / Immediate 200 Response
- **Symptom**: Submitting a report via `/api/time-agent` returns HTTP 200 immediately with `data.events = []`. The frontend displays a success toast, but the review queue does not show the new item until several seconds later after a manual page refresh.
- **Root Cause**: The n8n Webhook node responds immediately upon payload receipt (`onReceived` mode) rather than holding the HTTP connection until the LangChain LLM chain and Supabase insertion nodes finish.
- **Status**: **Pending Member 1**
- **Owner**: Member 1 (Ingestion) & Member 3 (Frontend)
- **Fix / Workaround**:
  - In n8n, change the Webhook node **Response Mode** to `"Using 'Respond to Webhook' Node"`.
  - Place a **Respond to Webhook** node at the very end of the workflow, returning the inserted `progress_event` record.
  - Frontend fallback: Polling / re-fetching `/api/review-queue` automatically after a 2-second delay.

---

### Issue 4: ngrok Tunnel Instability & Rate Limiting
- **Symptom**: `POST /api/time-agent` occasionally fails with `502 Bad Gateway`, `ERR_NGROK_3200` (offline tunnel), or session timeouts when local n8n machine sleeps or ngrok restarts.
- **Root Cause**: Reliance on local n8n routed through ephemeral ngrok tunnels rather than a cloud-hosted instance.
- **Status**: **In Progress (Deployment to Render)**
- **Owner**: Member 1 (Ingestion) & Member 4 (QA / Integration)
- **Fix / Workaround**:
  - Complete the Render n8n deployment with persistent storage and a permanent public webhook endpoint.
  - Update `INGESTION_WEBHOOK_URL` in `.env.local` and Vercel environment settings to point to `https://<render-subdomain>.onrender.com/webhook/ingest-text`.

---

### Issue 5: Duplicate Submission Handling (Lack of Idempotency)
- **Symptom**: Submitting the exact same report text multiple times creates duplicate rows in `progress_events` and multiple duplicate review cards in `activity_matches`.
- **Root Cause**: No deduplication or idempotency check (e.g., hashing `(project_id, raw_text, submission_date)` or checking for recent identical pending events) exists prior to Supabase insertion.
- **Status**: **Known Limitation / P1 Improvement**
- **Owner**: Member 1 (Ingestion) & Member 2 (Matching)
- **Fix / Workaround**:
  - Short-term (Demo): Instruct demo presenter to click the submit button only once and observe loading states.
  - Long-term: Implement an idempotency check in the n8n ingestion node or Supabase trigger to reject/merge submissions within a 60-second window.

---

## 2. Emergency Fallback Plan: "If n8n is Unreachable During Demo"

If n8n or ngrok goes down during the live presentation or evaluation:

### What to Explain to Judges
1. **Architecture Resilience**:
   > *"ProgressBridge AI is designed with a decoupled event-driven architecture. The supervisor ingestion layer uses asynchronous webhooks that isolate field communications from the core matching and project scheduling engine."*
2. **Direct Inspection & Review**:
   > *"While the external messaging webhook is queuing field logs, let's look at how our hybrid matcher processes incoming progress events and links them to Level 5/6 schedule activities."*

### Step-by-Step Live Fallback Actions
1. **Direct Schedule / Review Flow**:
   - Navigate directly to the **Review Queue** (`/review`) where pre-staged pending events are waiting.
   - Walk through the matching breakdown (Semantic 50%, Identifier 25%, Discipline 15%, Location 10%).
   - Click **Accept** on `PIP-2458` to demonstrate the real database transaction, actual date updates, and delay calculation (+8 days).
2. **Demo Reset & Re-seed**:
   - If a clean state is required, call `POST /api/demo/reset` to restore the 890-activity schedule and clean test state.

---

## 3. Quick Verification Checklist Before Presentations

- [ ] `DEMO_PROJECT_ID` is `1c1711c7-11f8-43f0-babe-e6a7cefe1ad4` in all `.env` files.
- [ ] Render / ngrok webhook URL is live (`curl -I <INGESTION_WEBHOOK_URL>`).
- [ ] Golden demo activity `PIP-2458` exists in database (`SELECT id, code, name FROM schedule_activities WHERE code = 'PIP-2458'`).
- [ ] Review queue loads real data from Supabase (`GET /api/review-queue`).
- [ ] Dev server running smoothly with `npm run dev`.
