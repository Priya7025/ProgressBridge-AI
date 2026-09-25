# ProgressBridge AI — Operational Troubleshooting & Incident Guide

This document provides practical root-cause diagnostics, commands, and resolution steps for all operational scenarios across the **ProgressBridge AI** platform.

---

## 1. Quick Diagnostic Table

| Symptom / Issue | Primary Root Cause | Quick Fix Command / Action |
|---|---|---|
| **Frontend not starting** | Port 3000 in use or missing `node_modules` | `npx kill-port 3000 && cd frontend && npm run dev` |
| **Missing Environment Variables** | `frontend/.env.local` missing or incomplete | Copy template and verify `NEXT_PUBLIC_SUPABASE_URL` |
| **Supabase Connection Problem** | Network timeout or invalid API keys | Check `frontend/.env.local` and ping REST endpoint |
| **Login / Authentication Failure** | Incorrect credentials or expired user session | Use pre-configured planner account or reset password |
| **Empty Dashboard** | Project ID mismatch in query filter | Ensure `NEXT_PUBLIC_DEMO_PROJECT_ID` matches database |
| **Activities Not Loading** | Supabase query error or missing project activities | Run `python tests/e2e/e2e_golden_flow_test.py` to verify baseline |
| **Time Agent / Extraction Failure** | n8n webhook offline or model name invalid | Check webhook status or trigger local API fallback |
| **Matching / Review Queue Empty** | Matching service not executed or match rows missing | Run E2E pipeline script to re-evaluate matches |
| **Accept Match Action Fails** | Supabase RLS restriction or missing permissions | Ensure using valid authenticated session or service role |
| **Dashboard Not Refreshing** | Next.js server cache or stale client state | Hard refresh browser (`Ctrl + F5`) |
| **Demo Reset Fails** | Timeout on large batch deletion | Trigger `POST /api/demo/reset` with 45s timeout |
| **Build / Lint / Typecheck Fails** | Unused imports, type mismatches, or schema discrepancies | Run `npm run typecheck && npm run lint` to view details |
| **Browser / CDP / Manual QA Issues** | Playwright CDN download blocked or Chrome origin flags | Run `python tests/e2e/browser_cdp_test.py` with `--remote-allow-origins=*` |

---

## 2. Step-by-Step Diagnostic Procedures

### 1. Frontend Not Starting
**Symptoms:** `npm run dev` fails with `EADDRINUSE: address already in use :::3000` or module not found.  
**Resolution:**
```powershell
# Free port 3000 and restart
Get-Process -Id (Get-NetTCPConnection -LocalPort 3000).OwningProcess -ErrorAction SilentlyContinue | Stop-Process -Force
cd frontend
npm install
npm run dev
```

---

### 2. Missing Environment Variables
**Symptoms:** `TypeError: Cannot read properties of undefined (reading 'replace')` on Supabase initialization.  
**Resolution:**
Confirm that `frontend/.env.local` contains all required keys:
```env
NEXT_PUBLIC_SUPABASE_URL=https://jopmivqiwaaznuogczjl.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
NEXT_PUBLIC_DEMO_PROJECT_ID=1c1711c7-11f8-43f0-babe-e6a7cefe1ad4
INGESTION_WEBHOOK_URL=https://<n8n-domain>/webhook/ingest-text
```

---

### 3. Supabase Connection Problems
**Symptoms:** Network timeouts, `ERR_CONNECTION_REFUSED`, or HTTP 401 Unauthorized.  
**Resolution:**
Test REST connectivity directly via cURL:
```powershell
curl -I -H "apikey: <YOUR_SUPABASE_ANON_KEY>" "https://jopmivqiwaaznuogczjl.supabase.co/rest/v1/schedule_activities?limit=1"
```
If connection fails, verify network proxies or check Supabase dashboard status.

---

### 4. Login Problems
**Symptoms:** Submitting credentials on `/login` displays `"Invalid login credentials"`.  
**Resolution:**
1. Ensure email is `pbchauhan246@gmail.com` (Project Planner).
2. Reset/sync password via Supabase Admin API:
```powershell
python -c "import urllib.request, json; req = urllib.request.Request('https://jopmivqiwaaznuogczjl.supabase.co/auth/v1/admin/users/904be87c-988c-40ac-b9d2-a37ac32ef84e', data=json.dumps({'password': 'Password123!'}).encode(), headers={'apikey': '<SERVICE_ROLE_KEY>', 'Authorization': 'Bearer <SERVICE_ROLE_KEY>', 'Content-Type': 'application/json'}, method='PUT'); print(urllib.request.urlopen(req).status)"
```

---

### 5. Empty Dashboard / Activities Not Loading
**Symptoms:** Dashboard shows 0 total activities or activities table is blank.  
**Resolution:**
1. Verify that `NEXT_PUBLIC_DEMO_PROJECT_ID` matches the project ID associated with the 890 baseline activities (`1c1711c7-11f8-43f0-babe-e6a7cefe1ad4`).
2. Verify table count directly in database:
```powershell
python -c "import urllib.request, json; req = urllib.request.Request('https://jopmivqiwaaznuogczjl.supabase.co/rest/v1/schedule_activities?project_id=eq.1c1711c7-11f8-43f0-babe-e6a7cefe1ad4&select=count', headers={'apikey': '<ANON_KEY>', 'Prefer': 'count=exact', 'Range-Unit': 'items'}); resp = urllib.request.urlopen(req); print('Count header:', resp.headers.get('Content-Range'))"
```

---

### 6. Time Agent & Extraction Failure
**Symptoms:** Submitting a report in `/time-agent` returns `502 Bad Gateway` or extraction card does not render.  
**Resolution:**
- If hosted n8n webhook is temporarily offline, Next.js server route `/api/time-agent` automatically falls back to local structured extraction to ensure demo continuity.
- Test endpoint directly:
```powershell
curl -X POST http://localhost:3000/api/time-agent -H "Content-Type: application/json" -d "{\"text\": \"24-XX spool erection started at 10:30 AM in North Unit.\", \"projectId\": \"1c1711c7-11f8-43f0-babe-e6a7cefe1ad4\"}"
```

---

### 7. Matching & Review Queue Issues
**Symptoms:** `/review` queue is empty after submitting a report.  
**Resolution:**
Execute the automated matching step to evaluate hybrid scores and populate `activity_matches`:
```powershell
python tests/e2e/e2e_golden_flow_test.py
```

---

### 8. Accept Match Failure
**Symptoms:** Clicking "Accept Match" in `/review` displays an error toast or does not update activity status.  
**Resolution:**
1. Verify `activity_matches` record exists and is in `PENDING` or `PENDING_REVIEW` state.
2. Confirm user is signed in with Planner role (`pbchauhan246@gmail.com`).
3. Check browser console (F12) for network errors.

---

### 9. Dashboard Not Refreshing / Stale Metrics
**Symptoms:** Delayed count does not update after accepting `PIP-2458`.  
**Resolution:**
- Next.js Server Components query `project_dashboard_summary` view live on every request. Perform a hard browser refresh (`Ctrl + F5` or `Cmd + Shift + R`) to bypass browser-cached HTML.

---

### 10. Demo Reset
**Symptoms:** Need to reset the application to a clean baseline state before presenting to judges.  
**Resolution:**
Trigger the demo reset API route:
```powershell
curl -X POST http://localhost:3000/api/demo/reset -H "Content-Type: application/json" -d "{\"projectId\":\"1c1711c7-11f8-43f0-babe-e6a7cefe1ad4\"}"
```
*Result: Resets dynamic progress events, matches, and audit logs while preserving all 890 baseline schedule activities.*

---

### 11. Code Quality & Build Validation
**Symptoms:** CI pipeline or local build fails.  
**Resolution:**
Run the complete multi-tier test and quality validation suite:
```powershell
# 1. Frontend Typecheck
cd frontend
npm run typecheck

# 2. Frontend Linting
npm run lint

# 3. Next.js Production Build
npm run build

# 4. Python Linting
cd ..
python -m ruff check data/scripts tests

# 5. Full Automated E2E Pipeline Suite
python tests/e2e/e2e_golden_flow_test.py
```

---

### 12. Browser & CDP Automation Issues
**Symptoms:** `playwright.azureedge.net` download fails with 404 in sandboxed runners, or CDP WebSocket returns 403 Forbidden.  
**Resolution:**
- Always launch Chrome or Edge with `--remote-allow-origins=*` flag when using Chrome DevTools Protocol automation.
- Run the dedicated local CDP test runner:
```powershell
python tests/e2e/browser_cdp_test.py
```
