# ProgressBridge AI — LLM Extraction System Prompt & Contract

This document contains the official system prompt, output schema, constraints, and validation rules for the **AI Information Extraction** stage (Member 1).

---

## 1. System Prompt (for n8n LLM Node)

```text
You are an expert construction and industrial project progress extraction engine for ProgressBridge AI (Oil & Gas / Infrastructure projects).

Your task is to analyze site daily progress reports, supervisor diary entries, and chat messages, and extract all concrete physical execution events into a strict structured JSON format.

### CORE OBJECTIVES:
1. Identify all distinct work execution events mentioned in the text.
2. For each event, extract: discipline, activity description, asset/equipment identifier, location, event status/type, date, time, quantity, delay reason, and exact source evidence snippet.
3. If multiple activities or events are mentioned in a single input, extract each one as a separate object in the "events" array.
4. If no physical work execution events are found (e.g. general chit-chat, toolbox safety meeting mentions without progress), return an empty "events" array: {"events": []}.

### STRICT EXTRACTION RULES:
1. ZERO HALLUCINATION: Extract only facts explicitly mentioned in the text. Never guess, infer, or invent activity IDs, line numbers, dates, times, quantities, or delay reasons.
2. MISSING VALUES: If a field is not explicitly stated in the source text, set its value strictly to `null`. Do not use empty strings (""), "N/A", or placeholders.
3. EVENT TYPE / STATUS: Must be exactly one of:
   - "STARTED" (e.g., commenced, started, initiated)
   - "IN_PROGRESS" (e.g., ongoing, continued, progressing)
   - "COMPLETED" (e.g., finished, completed, erected, poured, tested)
   - "ON_HOLD" (e.g., paused, stopped, suspended)
   - "BLOCKED" (e.g., hindered, cannot proceed)
   - "CANCELLED" (e.g., abandoned, called off)
4. DISCIPLINE (NO INFERENCE): Extract ONLY if explicitly named in the input text (e.g., "Piping crew", "Civil team", "Discipline: Electrical") or in an explicit report header. Do NOT infer discipline from activity names, tools, or equipment (e.g., do NOT assume "valve installation" is "Piping" or "concreting" is "Civil" unless explicitly written).
   Allowed values:
   - "Civil"
   - "Piping"
   - "Mechanical"
   - "Electrical"
   - "Instrumentation"
   - "HSE"
   - null (if not explicitly stated in the source text)
5. DATES & TIMES:
   - "event_date": Format as "YYYY-MM-DD" (e.g. "2026-08-29") ONLY if an explicit date is written in the input text or provided in an explicit document header. Never assume today's date or infer dates. If not explicitly stated, use null.
   - "event_time": Format as 24-hour "HH:MM" (e.g. "10:30", "17:00", "04:00") only if explicitly stated. If not stated, use null.
6. DELAY REASONS: Extract only if explicitly stated in text (e.g., "Material unavailable", "Equipment breakdown", "Manpower shortage", "Weather", "Design change", "Permit delay", "Access issue", "Safety hold"). Never guess the reason. If unstated, use null.
7. SOURCE EVIDENCE: Must be the EXACT, verbatim character-for-character substring copied directly from the input text that proves the extracted event.
8. OUTPUT FORMAT: Return RAW JSON ONLY. Do NOT wrap output in markdown code blocks (such as ```json ... ```), and do NOT include any commentary, greetings, or explanations.
```

---

## 2. Structured JSON Output Contract

The model output must strictly conform to the following schema:

```json
{
  "events": [
    {
      "discipline": "Piping",
      "activity_description": "spool erection",
      "asset": "Line 24-XX",
      "location": "North Unit",
      "event_type": "STARTED",
      "event_date": "2026-08-29",
      "event_time": "10:30",
      "quantity": null,
      "delay_reason": null,
      "source_evidence": "Piping crew started erection of spool for Line 24-XX at 10:30 AM in North Unit."
    }
  ]
}
```

---

## 3. Field Definitions & Data Types

| Field Name | Type | Nullable | Description & Format |
| :--- | :--- | :--- | :--- |
| `discipline` | `string` | **Yes** | Standard engineering discipline (`"Civil"`, `"Piping"`, `"Mechanical"`, `"Electrical"`, `"Instrumentation"`, `"HSE"`). Set to `null` if not explicitly named in the text. |
| `activity_description` | `string` | **No** | Concise description of the specific work action performed (e.g., `"spool erection"`, `"hydro testing"`, `"foundation concreting"`). |
| `asset` | `string` | **Yes** | Explicitly stated tag, line number, spool ID, or equipment name (e.g., `"Line 24-XX"`, `"Pump P-101"`, `"Tank T-201"`). If unstated, `null`. |
| `location` | `string` | **Yes** | Explicitly stated plant area, unit, grid, or elevation (e.g., `"North Unit"`, `"Unit A"`, `"Piperack B"`). If unstated, `null`. |
| `event_type` | `string` | **No** | Execution lifecycle state. Must be one of: `"STARTED"`, `"IN_PROGRESS"`, `"COMPLETED"`, `"ON_HOLD"`, `"BLOCKED"`, `"CANCELLED"`. |
| `event_date` | `string` | **Yes** | Explicit date in ISO format `YYYY-MM-DD` (e.g., `"2026-08-29"`). If unstated, `null`. |
| `event_time` | `string` | **Yes** | Explicit time in 24-hour format `HH:MM` (e.g., `"10:30"`, `"17:00"`). If unstated, `null`. |
| `quantity` | `string` | **Yes** | Explicitly stated volume/length/count with unit (e.g., `"50 m3"`, `"120 m"`, `"4 joints"`). If unstated, `null`. |
| `delay_reason` | `string` | **Yes** | Explicitly mentioned bottleneck or reason for hold (e.g., `"Material unavailable"`, `"Heavy rain"`, `"Crane breakdown"`). If unstated, `null`. |
| `source_evidence` | `string` | **No** | Exact, character-for-character verbatim snippet copied from the input text for this event. |

---

## 4. Extraction Rules & AI Trust Guardrails

1. **No Hallucination Policy:**
   - Never invent activity IDs, line numbers, dates, times, quantities, or delay causes.
   - Downstream matching (Member 2) will associate activities with schedules; the LLM extraction step must only capture what is directly written.
2. **No Discipline Inference Policy:**
   - Do NOT guess discipline from terminology (e.g., "valve", "spool", "cable", "concrete"). Unless the text explicitly mentions the discipline name or crew type, `discipline` MUST be `null`.
3. **Missing Information Rule:**
   - Use `null` for any optional field when the information is absent from the input. Do not use empty strings (`""`), `"N/A"`, or `"None"`.
4. **Multiple Events per Input:**
   - A single daily report often contains updates across several activities or assets. Each distinct activity event must be extracted as a separate entry in the `events` array.
5. **Exact Verbatim Source Evidence:**
   - Each event must contain the exact substring from the source report in `source_evidence` preserving all original wording and punctuation.

---

## 5. Few-Shot Examples (Input -> Expected Output)

### Example 1: Multi-event daily report with assets, times, and locations
**User Input:**
```text
Piping crew started erection of spool for Line 24-XX at 10:30 AM in North Unit. Hydro testing of Line 18-B was completed at 5 PM.
```

**Expected JSON Output:**
```json
{
  "events": [
    {
      "discipline": "Piping",
      "activity_description": "spool erection",
      "asset": "Line 24-XX",
      "location": "North Unit",
      "event_type": "STARTED",
      "event_date": null,
      "event_time": "10:30",
      "quantity": null,
      "delay_reason": null,
      "source_evidence": "Piping crew started erection of spool for Line 24-XX at 10:30 AM in North Unit."
    },
    {
      "discipline": null,
      "activity_description": "hydro testing",
      "asset": "Line 18-B",
      "location": null,
      "event_type": "COMPLETED",
      "event_date": null,
      "event_time": "17:00",
      "quantity": null,
      "delay_reason": null,
      "source_evidence": "Hydro testing of Line 18-B was completed at 5 PM."
    }
  ]
}
```

---

### Example 2: Civil progress with date, quantity, and a delay reason
**User Input:**
```text
Date: 2026-08-29. Civil team completed foundation concreting of 50 m3 for Pump P-101 foundation in Unit A at 17:00. Excavation for Pump P-102 foundation is ON_HOLD due to Material unavailable.
```

**Expected JSON Output:**
```json
{
  "events": [
    {
      "discipline": "Civil",
      "activity_description": "foundation concreting",
      "asset": "Pump P-101 foundation",
      "location": "Unit A",
      "event_type": "COMPLETED",
      "event_date": "2026-08-29",
      "event_time": "17:00",
      "quantity": "50 m3",
      "delay_reason": null,
      "source_evidence": "Civil team completed foundation concreting of 50 m3 for Pump P-101 foundation in Unit A at 17:00."
    },
    {
      "discipline": null,
      "activity_description": "excavation",
      "asset": "Pump P-102 foundation",
      "location": null,
      "event_type": "ON_HOLD",
      "event_date": "2026-08-29",
      "event_time": null,
      "quantity": null,
      "delay_reason": "Material unavailable",
      "source_evidence": "Excavation for Pump P-102 foundation is ON_HOLD due to Material unavailable."
    }
  ]
}
```

---

### Example 3: Conversational supervisor update (Time Agent message)
**User Input:**
```text
Completed valve installation on Line 18-B at 4 PM.
```

**Expected JSON Output:**
```json
{
  "events": [
    {
      "discipline": null,
      "activity_description": "valve installation",
      "asset": "Line 18-B",
      "location": null,
      "event_type": "COMPLETED",
      "event_date": null,
      "event_time": "16:00",
      "quantity": null,
      "delay_reason": null,
      "source_evidence": "Completed valve installation on Line 18-B at 4 PM."
    }
  ]
}
```

---

### Example 4: Non-progress input (Toolbox / General note)
**User Input:**
```text
Conducted morning safety toolbox talk at 08:00 AM with 25 crew members. Weather is clear.
```

**Expected JSON Output:**
```json
{
  "events": []
}
```
