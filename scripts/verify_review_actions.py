#!/usr/bin/env python3
"""
Verification script for "Mark Reviewed" button on Activity Review Page (/api/review)
"""

import json
import urllib.request
import urllib.error
import sys
import os

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')

from pathlib import Path

WORKSPACE_ROOT = Path(__file__).resolve().parent.parent
FRONTEND_ENV = WORKSPACE_ROOT / "frontend" / ".env.local"
if FRONTEND_ENV.exists():
    for line in FRONTEND_ENV.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if line and not line.startswith("#") and "=" in line:
            k, v = line.split("=", 1)
            os.environ[k.strip()] = v.strip().strip('"').strip("'")

BASE_URL = "http://localhost:3000"
PROJECT_ID = os.getenv("NEXT_PUBLIC_DEMO_PROJECT_ID", "1c1711c7-11f8-43f0-babe-e6a7cefe1ad4")
SUPABASE_URL = os.getenv("NEXT_PUBLIC_SUPABASE_URL", "https://jopmivqiwaaznuogczjl.supabase.co")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY") or os.getenv("NEXT_PUBLIC_SUPABASE_ANON_KEY")

def supabase_get(table_or_view, params=""):
    url = f"{SUPABASE_URL}/rest/v1/{table_or_view}?{params}"
    req = urllib.request.Request(
        url,
        headers={
            "apikey": SUPABASE_KEY,
            "Authorization": f"Bearer {SUPABASE_KEY}",
            "Accept": "application/json",
        }
    )
    with urllib.request.urlopen(req) as res:
        return json.loads(res.read().decode("utf-8"))

def supabase_post(table, payload):
    url = f"{SUPABASE_URL}/rest/v1/{table}"
    req = urllib.request.Request(
        url,
        data=json.dumps(payload).encode("utf-8"),
        headers={
            "apikey": SUPABASE_KEY,
            "Authorization": f"Bearer {SUPABASE_KEY}",
            "Content-Type": "application/json",
            "Prefer": "return=representation",
        }
    )
    with urllib.request.urlopen(req) as res:
        return json.loads(res.read().decode("utf-8"))

def post_review_action(action, event_id, match_id=None, user_id=None):
    url = f"{BASE_URL}/api/review"
    payload = {
        "action": action,
        "eventId": event_id,
        "matchId": match_id,
        "userId": user_id or "00000000-0000-0000-0000-000000000001",
    }
    req = urllib.request.Request(
        url,
        data=json.dumps(payload).encode("utf-8"),
        headers={"Content-Type": "application/json"}
    )
    with urllib.request.urlopen(req) as res:
        return json.loads(res.read().decode("utf-8"))

def run_tests():
    print("==================================================")
    print("Testing 'Mark Reviewed' Review Action Flow")
    print("==================================================")

    # STEP 1: Create a test unmatched event
    print("\n[STEP 1] Creating test unmatched event 1 in database...")
    created_events = supabase_post("progress_events", {
        "project_id": PROJECT_ID,
        "activity_description": "Unmatched site event for testing Mark Reviewed button",
        "discipline": "Civil",
        "location": "Sector 4",
        "event_type": "COMPLETED",
        "event_date": "2026-08-20",
        "status": "UNMATCHED",
    })
    event1 = created_events[0]
    event1_id = event1["id"]
    print(f"✓ Created test event 1: {event1_id} (status: UNMATCHED)")

    # STEP 2: Verify it appears in unmatched_queue
    print("\n[STEP 2] Verifying test event appears in unmatched_queue view...")
    unmatched_list = supabase_get("unmatched_queue", f"event_id=eq.{event1_id}")
    assert len(unmatched_list) == 1, f"Expected 1 item in unmatched_queue, got: {unmatched_list}"
    print("✓ Confirmed: Event 1 is present in unmatched_queue view.")

    # STEP 3: Click "Mark Reviewed" via API
    print("\n[STEP 3] Executing 'Mark Reviewed' on Event 1 via /api/review...")
    res = post_review_action("MARK_REVIEWED", event1_id)
    assert res.get("success") is True, f"API failed: {res}"
    assert res.get("action") == "MARK_REVIEWED", f"Unexpected action: {res}"
    print(f"✓ API response 200 OK: {res.get('message')}")

    # STEP 4: Verify event is removed from unmatched_queue
    print("\n[STEP 4] Verifying event 1 is removed from unmatched_queue view...")
    unmatched_after = supabase_get("unmatched_queue", f"event_id=eq.{event1_id}")
    assert len(unmatched_after) == 0, f"Expected 0 items in unmatched_queue, got: {unmatched_after}"
    print("✓ Confirmed: Event 1 is no longer in unmatched_queue.")

    # STEP 5: Verify progress_events record is updated to REJECTED (reviewed)
    print("\n[STEP 5] Verifying progress_events status in database...")
    db_events = supabase_get("progress_events", f"id=eq.{event1_id}")
    assert len(db_events) == 1, "Event not found"
    assert db_events[0]["status"] == "REJECTED", f"Expected status REJECTED, got {db_events[0]['status']}"
    print(f"✓ Confirmed: Event 1 status is persisted as {db_events[0]['status']}.")

    # STEP 6: Test with a second unmatched event
    print("\n[STEP 6] Testing Mark Reviewed on a second unmatched event...")
    created_events2 = supabase_post("progress_events", {
        "project_id": PROJECT_ID,
        "activity_description": "Second unmatched site event for verification",
        "discipline": "Piping",
        "location": "North Unit",
        "event_type": "IN_PROGRESS",
        "event_date": "2026-08-21",
        "status": "UNMATCHED",
    })
    event2 = created_events2[0]
    event2_id = event2["id"]

    res2 = post_review_action("MARK_REVIEWED", event2_id)
    assert res2.get("success") is True, f"API failed: {res2}"

    unmatched_after2 = supabase_get("unmatched_queue", f"event_id=eq.{event2_id}")
    assert len(unmatched_after2) == 0, "Event 2 still in unmatched queue"
    print("✓ Confirmed: Event 2 successfully marked reviewed and removed from queue.")

    print("\n==================================================")
    print("ALL 'MARK REVIEWED' VERIFICATION TESTS PASSED!")
    print("==================================================")

if __name__ == "__main__":
    try:
        run_tests()
    except Exception as e:
        print(f"FAILED: {e}")
        sys.exit(1)
