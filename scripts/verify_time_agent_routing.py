#!/usr/bin/env python3
"""
Verification script for Planner Time Agent Routing Bug Fix
"""

import json
import urllib.request
import urllib.error
import sys

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')

BASE_URL = "http://localhost:3000"
PROJECT_ID = "1c1711c7-11f8-43f0-babe-e6a7cefe1ad4"

def post_time_agent(text, role="planner"):
    url = f"{BASE_URL}/api/time-agent"
    payload = {
        "text": text,
        "role": role,
        "projectId": PROJECT_ID
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
    print("Testing Planner Time Agent Routing Fix")
    print("==================================================")

    # TEST 1: "What happened to PIP-2458?" (Planner Intelligence)
    print("\n[TEST 1] Asking: 'What happened to PIP-2458?' (role: planner)")
    res1 = post_time_agent("What happened to PIP-2458?", role="planner")
    assert res1.get("success") is True, f"Failed: {res1}"
    assert res1.get("type") == "intelligence", f"Expected type 'intelligence', got {res1.get('type')}"
    assert res1.get("intent") == "ACTIVITY_HISTORY", f"Expected intent 'ACTIVITY_HISTORY', got {res1.get('intent')}"
    assert len(res1.get("events", [])) == 0, f"Expected 0 progress_events, got {len(res1.get('events'))}"
    msg1 = res1.get("message", "")
    assert "PIP-2458" in msg1, f"Expected PIP-2458 in response message, got: {msg1}"
    print("✓ PASSED: Correctly routed to ACTIVITY_HISTORY intelligence without inserting progress_events.")
    print("Response summary:")
    print(msg1[:250] + "...\n")

    # TEST 2: "What is the status of activity PIP-2458?" (Planner Intelligence)
    print("[TEST 2] Asking: 'What is the status of activity PIP-2458?' (role: planner)")
    res2 = post_time_agent("What is the status of activity PIP-2458?", role="planner")
    assert res2.get("success") is True, f"Failed: {res2}"
    assert res2.get("type") == "intelligence", f"Expected type 'intelligence', got {res2.get('type')}"
    assert res2.get("intent") == "ACTIVITY_STATUS", f"Expected intent 'ACTIVITY_STATUS', got {res2.get('intent')}"
    assert len(res2.get("events", [])) == 0, f"Expected 0 progress_events, got {len(res2.get('events'))}"
    msg2 = res2.get("message", "")
    assert "PIP-2458" in msg2, f"Expected PIP-2458 in response message, got: {msg2}"
    print("✓ PASSED: Correctly routed to ACTIVITY_STATUS intelligence without inserting progress_events.")
    print("Response summary:")
    print(msg2[:250] + "...\n")

    # TEST 3: "Which activities are delayed?"
    print("[TEST 3] Asking: 'Which activities are delayed?' (role: planner)")
    res3 = post_time_agent("Which activities are delayed?", role="planner")
    assert res3.get("success") is True, f"Failed: {res3}"
    assert res3.get("intent") == "DELAYED_ACTIVITIES", f"Expected DELAYED_ACTIVITIES, got {res3.get('intent')}"
    assert len(res3.get("events", [])) == 0
    print("✓ PASSED: Correctly routed to DELAYED_ACTIVITIES.")

    # TEST 4: "Show Piping activities"
    print("\n[TEST 4] Asking: 'Show Piping activities' (role: planner)")
    res4 = post_time_agent("Show Piping activities", role="planner")
    assert res4.get("success") is True, f"Failed: {res4}"
    assert res4.get("intent") == "DISCIPLINE_ACTIVITIES", f"Expected DISCIPLINE_ACTIVITIES, got {res4.get('intent')}"
    assert len(res4.get("events", [])) == 0
    print("✓ PASSED: Correctly routed to DISCIPLINE_ACTIVITIES.")

    # TEST 5: Supervisor Site Capture (Must still create progress event)
    print("\n[TEST 5] Submitting Supervisor Site Log: 'Started hydro testing Line 24-XX at 10 AM in North Unit' (role: supervisor)")
    res5 = post_time_agent("Started hydro testing Line 24-XX at 10 AM in North Unit", role="supervisor")
    assert res5.get("success") is True, f"Failed: {res5}"
    assert res5.get("type") == "capture", f"Expected type 'capture', got {res5.get('type')}"
    events = res5.get("events", [])
    assert len(events) >= 1, f"Expected >= 1 inserted progress events, got {len(events)}"
    print(f"✓ PASSED: Supervisor site capture successfully inserted {len(events)} progress event into pipeline.")

    print("\n==================================================")
    print("ALL 5 VERIFICATION TESTS PASSED SUCCESSFULLY!")
    print("==================================================")

if __name__ == "__main__":
    try:
        run_tests()
    except Exception as e:
        print(f"FAILED: {e}")
        sys.exit(1)
