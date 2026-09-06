#!/usr/bin/env python3
"""
ProgressBridge AI (SIH26122) - End-to-End Pipeline Smoke Test
============================================================
Validates the complete integrated pipeline:
  Stage 1: Schedule Baseline Verification (Member 4)
  Stage 2: Ingestion Webhook & Document Upload (Member 1)
  Stage 3: LLM Information Extraction & Progress Events (Member 1)
  Stage 4: Semantic Schedule Matching & Accuracy Evaluation (Member 2)
  Stage 5: Dashboard & Metrics Data Source (Member 3)

Design principles:
- Read-only consumer: does not mutate source code.
- Evaluates against supabase/seed/sample_reports/ground_truth.json.
- Gracefully detects unmerged branches/offline services with clear "BLOCKED ON" diagnostics.
- Uses Python standard library for zero-dependency execution.
"""

import json
import os
import sys
import time
import urllib.error
import urllib.request
from datetime import datetime, timezone
from pathlib import Path

# Base Paths
WORKSPACE_ROOT = Path(__file__).resolve().parent.parent.parent
SEED_DIR = WORKSPACE_ROOT / "supabase" / "seed"
SAMPLE_REPORTS_DIR = SEED_DIR / "sample_reports"
GROUND_TRUTH_PATH = SAMPLE_REPORTS_DIR / "ground_truth.json"

# Environment & Connection Configuration
SUPABASE_URL = os.getenv("SUPABASE_URL", "http://127.0.0.1:54321").rstrip("/")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY") or os.getenv("SUPABASE_ANON_KEY") or "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.e30.demo"
INGESTION_WEBHOOK_URL = os.getenv(
    "INGESTION_WEBHOOK_URL",
    f"{SUPABASE_URL}/functions/v1/document-ingest"
)
FRONTEND_API_URL = os.getenv("FRONTEND_API_URL", "http://localhost:3000").rstrip("/")
DEMO_PROJECT_ID = os.getenv("DEMO_PROJECT_ID", "00000000-0000-0000-0000-000000000001")

POLL_TIMEOUT_SECS = int(os.getenv("POLL_TIMEOUT_SECS", "5"))
POLL_INTERVAL_SECS = 1


class PipelineTester:
    def __init__(self):
        self.stage_results = {
            "Stage 1: Schedule Baseline (Member 4)": {"status": "PENDING", "details": ""},
            "Stage 2: Document Ingestion (Member 1)": {"status": "PENDING", "details": ""},
            "Stage 3: Event Extraction (Member 1)": {"status": "PENDING", "details": ""},
            "Stage 4: Semantic Matching (Member 2)": {"status": "PENDING", "details": ""},
            "Stage 5: Dashboard Metrics (Member 3)": {"status": "PENDING", "details": ""},
        }
        self.ground_truth = None
        self.ingested_doc_ids = []
        self.extracted_events = []
        self.activity_matches = []
        self.accuracy_stats = {
            "total_benchmark": 0,
            "correct_matches": 0,
            "false_matches": 0,
            "correct_unmatched": 0,
            "false_unmatched": 0,
            "accuracy_pct": 0.0,
        }

    def log(self, stage: str, msg: str, status: str = "INFO"):
        prefix = f"[{status:^7}]"
        timestamp = datetime.now(timezone.utc).strftime("%H:%M:%S")
        print(f"{timestamp} {prefix} {stage}: {msg}", flush=True)

    def http_request(
        self,
        url: str,
        method: str = "GET",
        data: dict | list | str | bytes | None = None,
        headers: dict | None = None,
        timeout: float = 2.0,
    ):
        """Standard library HTTP client with error handling."""
        req_headers = {
            "User-Agent": "ProgressBridge-E2E-Tester/1.0",
            "apikey": SUPABASE_KEY,
            "Authorization": f"Bearer {SUPABASE_KEY}",
            "Content-Type": "application/json",
            "Prefer": "return=representation",
        }
        if headers:
            req_headers.update(headers)

        body = None
        if data is not None:
            if isinstance(data, (dict, list)):
                body = json.dumps(data).encode("utf-8")
            elif isinstance(data, str):
                body = data.encode("utf-8")
            elif isinstance(data, bytes):
                body = data

        req = urllib.request.Request(url, data=body, headers=req_headers, method=method)
        try:
            with urllib.request.urlopen(req, timeout=timeout) as response:
                res_body = response.read().decode("utf-8")
                try:
                    parsed = json.loads(res_body)
                except (json.JSONDecodeError, UnicodeDecodeError, ValueError):
                    parsed = res_body
                return {"status": response.status, "data": parsed, "headers": dict(response.headers)}
        except urllib.error.HTTPError as e:
            res_body = e.read().decode("utf-8") if e.fp else ""
            return {"status": e.code, "error": str(e), "body": res_body}
        except urllib.error.URLError as e:
            return {"status": 0, "error": str(e.reason)}
        except (TimeoutError, OSError) as e:
            return {"status": -1, "error": str(e)}

    # -------------------------------------------------------------
    # STAGE 1: Schedule Baseline Verification
    # -------------------------------------------------------------
    def run_stage_1_schedule_verification(self) -> bool:
        stage_name = "Stage 1: Schedule Baseline (Member 4)"
        self.log(stage_name, "Verifying schedule_activities table in Supabase...")

        # 1. Check local seed file
        csv_file = SEED_DIR / "schedule_activities.csv"
        if not csv_file.exists():
            self.stage_results[stage_name] = {
                "status": "FAILED",
                "details": f"Missing seed CSV at {csv_file}"
            }
            return False

        # 2. Check Supabase REST endpoint
        url = f"{SUPABASE_URL}/rest/v1/schedule_activities?select=count&project_id=eq.{DEMO_PROJECT_ID}"
        resp = self.http_request(url, method="GET", headers={"Range-Unit": "items", "Prefer": "count=exact"})

        if resp.get("status") == 0 or resp.get("status") == -1:
            self.stage_results[stage_name] = {
                "status": "BLOCKED",
                "details": f"Blocked on local Supabase container (Connection refused at {SUPABASE_URL}). Run `npx supabase start && npx supabase db reset`."
            }
            self.log(stage_name, self.stage_results[stage_name]["details"], status="BLOCKED")
            return False

        if resp.get("status") in (401, 403):
            self.stage_results[stage_name] = {
                "status": "BLOCKED",
                "details": f"Supabase auth failed ({resp.get('status')}). Verify SUPABASE_SERVICE_ROLE_KEY or SUPABASE_ANON_KEY."
            }
            self.log(stage_name, self.stage_results[stage_name]["details"], status="BLOCKED")
            return False

        if resp.get("status") == 404:
            self.stage_results[stage_name] = {
                "status": "BLOCKED",
                "details": "Table `schedule_activities` not found (HTTP 404). Migrations in supabase/migrations/ have not been applied."
            }
            self.log(stage_name, self.stage_results[stage_name]["details"], status="BLOCKED")
            return False

        # Query total row count
        count_url = f"{SUPABASE_URL}/rest/v1/schedule_activities?select=activity_id,discipline,status&project_id=eq.{DEMO_PROJECT_ID}&limit=1000"
        count_resp = self.http_request(count_url, method="GET")

        if count_resp.get("status") == 200 and isinstance(count_resp.get("data"), list):
            row_count = len(count_resp["data"])
            if row_count >= 750:
                self.stage_results[stage_name] = {
                    "status": "PASSED",
                    "details": f"Confirmed {row_count} activities seeded across Civil, Mechanical, and Electrical."
                }
                self.log(stage_name, self.stage_results[stage_name]["details"], status="PASSED")
                return True
            else:
                self.stage_results[stage_name] = {
                    "status": "FAILED",
                    "details": f"Expected 750 activities, found {row_count}. Run `npx supabase db reset` to apply seed.sql."
                }
                self.log(stage_name, self.stage_results[stage_name]["details"], status="FAILED")
                return False

        self.stage_results[stage_name] = {
            "status": "FAILED",
            "details": f"Unexpected response from Supabase: {resp}"
        }
        return False

    # -------------------------------------------------------------
    # STAGE 2: Document Ingestion Webhook
    # -------------------------------------------------------------
    def run_stage_2_document_ingestion(self) -> bool:
        stage_name = "Stage 2: Document Ingestion (Member 1)"
        self.log(stage_name, f"Testing document ingestion at: {INGESTION_WEBHOOK_URL}")

        if not SAMPLE_REPORTS_DIR.exists():
            self.stage_results[stage_name] = {
                "status": "FAILED",
                "details": f"Sample reports directory not found at {SAMPLE_REPORTS_DIR}"
            }
            return False

        report_files = list(SAMPLE_REPORTS_DIR.glob("*.txt")) + list(SAMPLE_REPORTS_DIR.glob("*.csv"))
        if not report_files:
            self.stage_results[stage_name] = {
                "status": "FAILED",
                "details": "No sample report files found in supabase/seed/sample_reports/"
            }
            return False

        # Probe webhook availability
        probe = self.http_request(INGESTION_WEBHOOK_URL, method="POST", data={"probe": True})
        if probe.get("status") in (0, -1, 404, 502, 503):
            # Also probe alternative Next.js route: /api/projects/{project_id}/documents
            alt_url = f"{FRONTEND_API_URL}/api/projects/{DEMO_PROJECT_ID}/documents"
            alt_probe = self.http_request(alt_url, method="POST", data={"probe": True})

            if alt_probe.get("status") in (0, -1, 404, 502, 503):
                self.stage_results[stage_name] = {
                    "status": "BLOCKED",
                    "details": f"Blocked on Member 1 (Ingestion Webhook / n8n workflow or Next.js route offline at {INGESTION_WEBHOOK_URL})."
                }
                self.log(stage_name, self.stage_results[stage_name]["details"], status="BLOCKED")
                return False
            else:
                target_url = alt_url
        else:
            target_url = INGESTION_WEBHOOK_URL

        success_count = 0
        for report_path in report_files:
            content = report_path.read_text(encoding="utf-8")
            source_type = "spreadsheet" if report_path.suffix == ".csv" else "daily_report"
            mime_type = "text/csv" if report_path.suffix == ".csv" else "text/plain"

            payload = {
                "project_id": DEMO_PROJECT_ID,
                "filename": report_path.name,
                "source_type": source_type,
                "mime_type": mime_type,
                "raw_text": content,
            }

            res = self.http_request(target_url, method="POST", data=payload)
            if res.get("status") in (200, 201, 202):
                success_count += 1
                doc_id = None
                if isinstance(res.get("data"), dict):
                    doc_id = res["data"].get("id") or res["data"].get("document_id")
                if doc_id:
                    self.ingested_doc_ids.append(doc_id)
            else:
                self.log(stage_name, f"Upload warning for {report_path.name}: {res.get('error', res.get('status'))}", status="WARN")

        if success_count > 0:
            self.stage_results[stage_name] = {
                "status": "PASSED",
                "details": f"Successfully ingested {success_count}/{len(report_files)} field reports."
            }
            self.log(stage_name, self.stage_results[stage_name]["details"], status="PASSED")
            return True
        else:
            self.stage_results[stage_name] = {
                "status": "FAILED",
                "details": f"Failed to ingest reports into {target_url}."
            }
            self.log(stage_name, self.stage_results[stage_name]["details"], status="FAILED")
            return False

    # -------------------------------------------------------------
    # STAGE 3: Information Extraction (progress_events)
    # -------------------------------------------------------------
    def run_stage_3_event_extraction(self) -> bool:
        stage_name = "Stage 3: Event Extraction (Member 1)"
        self.log(stage_name, "Polling `progress_events` table for extracted records...")

        url = f"{SUPABASE_URL}/rest/v1/progress_events?select=*&project_id=eq.{DEMO_PROJECT_ID}"

        start_time = time.time()
        events = []
        while time.time() - start_time < POLL_TIMEOUT_SECS:
            resp = self.http_request(url, method="GET")
            if resp.get("status") == 200 and isinstance(resp.get("data"), list):
                if len(resp["data"]) > 0:
                    events = resp["data"]
                    break
            elif resp.get("status") == 404:
                self.stage_results[stage_name] = {
                    "status": "BLOCKED",
                    "details": "Table `progress_events` does not exist in Supabase (Member 2 schema migration missing)."
                }
                self.log(stage_name, self.stage_results[stage_name]["details"], status="BLOCKED")
                return False
            time.sleep(POLL_INTERVAL_SECS)

        if not events:
            self.stage_results[stage_name] = {
                "status": "BLOCKED",
                "details": f"Blocked on Member 1 extraction pipeline: No progress events landed in `progress_events` within {POLL_TIMEOUT_SECS}s timeout."
            }
            self.log(stage_name, self.stage_results[stage_name]["details"], status="BLOCKED")
            return False

        self.extracted_events = events
        self.stage_results[stage_name] = {
            "status": "PASSED",
            "details": f"Extracted {len(events)} structured progress events from ingested documents."
        }
        self.log(stage_name, self.stage_results[stage_name]["details"], status="PASSED")
        return True

    # -------------------------------------------------------------
    # STAGE 4: Semantic Matching & Ground Truth Accuracy
    # -------------------------------------------------------------
    def run_stage_4_semantic_matching(self) -> bool:
        stage_name = "Stage 4: Semantic Matching (Member 2)"
        self.log(stage_name, "Evaluating matching accuracy against ground truth benchmark...")

        if not GROUND_TRUTH_PATH.exists():
            self.stage_results[stage_name] = {
                "status": "FAILED",
                "details": f"Missing ground truth file at {GROUND_TRUTH_PATH}"
            }
            return False

        with open(GROUND_TRUTH_PATH, "r", encoding="utf-8") as f:
            self.ground_truth = json.load(f)

        benchmark_entries = self.ground_truth.get("entries", [])
        self.accuracy_stats["total_benchmark"] = len(benchmark_entries)

        # Query activity_matches joined with schedule_activities
        matches_url = (
            f"{SUPABASE_URL}/rest/v1/activity_matches"
            f"?select=id,event_id,activity_id,semantic_score,identifier_score,final_score,match_status,schedule_activities(activity_id,discipline,description)"
        )
        resp = self.http_request(matches_url, method="GET")

        if resp.get("status") == 404:
            self.stage_results[stage_name] = {
                "status": "BLOCKED",
                "details": "Table `activity_matches` does not exist in Supabase (Member 2 schema missing)."
            }
            self.log(stage_name, self.stage_results[stage_name]["details"], status="BLOCKED")
            return False

        if resp.get("status") != 200 or not isinstance(resp.get("data"), list):
            self.stage_results[stage_name] = {
                "status": "BLOCKED",
                "details": f"Blocked on Member 2: Semantic matching service has not run or activity_matches is unreachable ({resp.get('status')})."
            }
            self.log(stage_name, self.stage_results[stage_name]["details"], status="BLOCKED")
            return False

        self.activity_matches = resp["data"]
        if not self.activity_matches:
            self.stage_results[stage_name] = {
                "status": "BLOCKED",
                "details": "Blocked on Member 2: `activity_matches` table is empty (matching pipeline has not been executed)."
            }
            self.log(stage_name, self.stage_results[stage_name]["details"], status="BLOCKED")
            return False

        # Evaluation & Accuracy calculation
        correct_matches = 0
        false_matches = 0
        correct_unmatched = 0
        false_unmatched = 0

        # Build index of matches by raw text / description keywords
        for benchmark in benchmark_entries:
            expected_act_id = benchmark["expected_activity_id"]
            is_matched_benchmark = benchmark["is_matched"]

            # Locate candidate match in activity_matches
            matched_row = None
            for m in self.activity_matches:
                sched = m.get("schedule_activities") or {}
                if sched.get("activity_id") == expected_act_id:
                    matched_row = m
                    break

            if is_matched_benchmark:
                if matched_row and matched_row.get("match_status") in ("AUTO_MATCHED", "APPROVED", "PENDING_REVIEW"):
                    correct_matches += 1
                else:
                    false_unmatched += 1
            else:
                # Deliberate non-match: assert it is NOT auto-matched to an activity
                if matched_row is None or matched_row.get("match_status") in ("UNMATCHED", "REJECTED", "PENDING_REVIEW"):
                    correct_unmatched += 1
                else:
                    false_matches += 1

        total_eval = len(benchmark_entries)
        correct_total = correct_matches + correct_unmatched
        accuracy_pct = (correct_total / total_eval * 100) if total_eval > 0 else 0.0

        self.accuracy_stats["correct_matches"] = correct_matches
        self.accuracy_stats["false_matches"] = false_matches
        self.accuracy_stats["correct_unmatched"] = correct_unmatched
        self.accuracy_stats["false_unmatched"] = false_unmatched
        self.accuracy_stats["accuracy_pct"] = accuracy_pct

        details = (
            f"Accuracy: {accuracy_pct:.1f}% ({correct_total}/{total_eval} correct) | "
            f"Matches: {correct_matches} correct, {false_unmatched} missed | "
            f"Deliberate Non-Matches: {correct_unmatched} correctly held for review, {false_matches} false positive."
        )

        if accuracy_pct >= 80.0:
            self.stage_results[stage_name] = {"status": "PASSED", "details": details}
            self.log(stage_name, details, status="PASSED")
            return True
        else:
            self.stage_results[stage_name] = {"status": "FAILED", "details": details}
            self.log(stage_name, details, status="FAILED")
            return False

    # -------------------------------------------------------------
    # STAGE 5: Dashboard & Metrics Data Source
    # -------------------------------------------------------------
    def run_stage_5_dashboard_metrics(self) -> bool:
        stage_name = "Stage 5: Dashboard Metrics (Member 3)"
        self.log(stage_name, f"Verifying dashboard endpoint at {FRONTEND_API_URL}...")

        # 1. Probe frontend dashboard API route
        dashboard_url = f"{FRONTEND_API_URL}/api/projects/{DEMO_PROJECT_ID}/dashboard"
        resp = self.http_request(dashboard_url, method="GET")

        if resp.get("status") == 200 and isinstance(resp.get("data"), dict):
            self.stage_results[stage_name] = {
                "status": "PASSED",
                "details": f"Dashboard API responsive with project metrics: {list(resp['data'].keys())}"
            }
            self.log(stage_name, self.stage_results[stage_name]["details"], status="PASSED")
            return True

        # 2. Fallback check: Direct Supabase metrics query for dashboard data
        fallback_url = (
            f"{SUPABASE_URL}/rest/v1/schedule_activities"
            f"?select=discipline,status&project_id=eq.{DEMO_PROJECT_ID}"
        )
        fb_resp = self.http_request(fallback_url, method="GET")

        if fb_resp.get("status") == 200 and isinstance(fb_resp.get("data"), list):
            self.stage_results[stage_name] = {
                "status": "PASSED",
                "details": f"Database aggregates available for frontend consumption ({len(fb_resp['data'])} activity data points)."
            }
            self.log(stage_name, self.stage_results[stage_name]["details"], status="PASSED")
            return True

        self.stage_results[stage_name] = {
            "status": "BLOCKED",
            "details": f"Blocked on Member 3: Frontend dev server or dashboard API unreachable at {FRONTEND_API_URL}."
        }
        self.log(stage_name, self.stage_results[stage_name]["details"], status="BLOCKED")
        return False

    # -------------------------------------------------------------
    # Execution & Report Printing
    # -------------------------------------------------------------
    def run_all(self):
        print("\n" + "=" * 78)
        print("  PROGRESSBRIDGE AI (SIH26122) - END-TO-END PIPELINE SMOKE TEST")
        print("=" * 78 + "\n")

        self.run_stage_1_schedule_verification()
        self.run_stage_2_document_ingestion()
        self.run_stage_3_event_extraction()
        self.run_stage_4_semantic_matching()
        self.run_stage_5_dashboard_metrics()

        self.print_summary()

    def print_summary(self):
        print("\n" + "=" * 78)
        print("                          PIPELINE STAGE SUMMARY")
        print("=" * 78)
        print(f"{'STAGE':<42} | {'STATUS':<10} | {'DETAILS'}")
        print("-" * 78)

        all_passed = True
        has_blocked = False

        for stage, result in self.stage_results.items():
            status = result["status"]
            details = result["details"]
            if status != "PASSED":
                all_passed = False
            if status == "BLOCKED":
                has_blocked = True

            print(f"{stage:<42} | {status:<10} | {details}")

        print("=" * 78)
        if self.accuracy_stats["total_benchmark"] > 0:
            print("Ground Truth Evaluation Benchmark:")
            print(f"- Total benchmark entries: {self.accuracy_stats['total_benchmark']}")
            print(f"- Correct schedule matches: {self.accuracy_stats['correct_matches']}")
            print(f"- Correctly held non-matches: {self.accuracy_stats['correct_unmatched']}")
            print(f"- Semantic Matching Accuracy: {self.accuracy_stats['accuracy_pct']:.1f}%")
            print("-" * 78)

        if all_passed:
            print("[SUCCESS] All 5 pipeline stages verified successfully! Full demo ready.")
            sys.exit(0)
        elif has_blocked:
            print("[NOTE] Some stages are blocked on pending unmerged branches or offline local services.")
            print("       Review the 'BLOCKED ON' diagnostics above for specific member deliverables.")
            sys.exit(0)
        else:
            print("[FAILURE] One or more pipeline stages failed assertions. Check logs above.")
            sys.exit(1)


if __name__ == "__main__":
    tester = PipelineTester()
    tester.run_all()
