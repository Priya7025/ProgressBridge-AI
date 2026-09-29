/**
 * ProgressBridge AI - Time Agent Intent Classification Engine
 * 
 * Accurately classifies incoming user messages into:
 * 1. Planner Intelligence Intents (status queries, history timelines, delay analysis, reviews, etc.)
 * 2. Progress Capture Intents (site progress logs, work started/completed, observations)
 * 3. Clarification / Ambiguous Queries
 * 
 * Guarantees that Planner questions NEVER create progress_events or activity_matches rows.
 */

export type PlannerIntent =
  | 'ACTIVITY_STATUS'
  | 'ACTIVITY_HISTORY'
  | 'DELAYED_ACTIVITIES'
  | 'PENDING_REVIEW'
  | 'DISCIPLINE_ACTIVITIES'
  | 'DUE_ACTIVITIES'
  | 'PROJECT_SUMMARY'

export type ProgressCaptureIntent =
  | 'SITE_PROGRESS_REPORT'
  | 'ACTIVITY_STARTED'
  | 'ACTIVITY_COMPLETED'
  | 'ACTIVITY_DELAY'
  | 'SITE_OBSERVATION'

export type AgentIntent =
  | PlannerIntent
  | ProgressCaptureIntent
  | 'CLARIFICATION'

export interface IntentClassificationResult {
  intent: AgentIntent
  category: 'PLANNER_INTELLIGENCE' | 'PROGRESS_CAPTURE' | 'CLARIFICATION'
  activityCode: string | null
  discipline: string | null
  timeWindow: string | null
  asset: string | null
  confidence: number
  rawText: string
}

/**
 * Extracts potential activity code from text (e.g. PIP-2458, CIV-1002, ELE-3011, etc.)
 */
export function extractActivityCode(text: string): string | null {
  // 1. Standard format: PIP-2458, CIV-1010, MEC-3001, ELE-4002, INS-5001, HSE-6001
  const codeMatch = text.match(/\b([A-Z]{2,4}-\d{3,5})\b/i)
  if (codeMatch) {
    return codeMatch[1].toUpperCase()
  }

  // 2. Activity / Line ID patterns (e.g. Activity 2458, Act 2458)
  const actMatch = text.match(/\b(?:activity|task|item)\s*#?\s*([A-Z0-9-]+)\b/i)
  if (actMatch) {
    return actMatch[1].toUpperCase()
  }

  return null
}

/**
 * Extracts asset identifiers (e.g. Line 24-XX, Pier 3, CS line 24-XX, Tank Farm)
 */
export function extractAssetIdentifier(text: string): string | null {
  const assetMatch = text.match(
    /\b(?:Line\s+[A-Z0-9-]+|CS\s+line\s+[A-Z0-9-]+|\d+-[A-Z0-9]+(?:\s+spool)?|Pier\s+\d+|Tank\s+[\w-]+|Pump\s+[\w-]+|Header\s+[\w-]+)\b/i
  )
  if (assetMatch) {
    let raw = assetMatch[0].trim()
    if (/^\d+-[A-Z0-9]+/i.test(raw) && !raw.toLowerCase().startsWith('line')) {
      raw = `Line ${raw}`
    }
    return raw.replace(/\s+spool/i, '').replace(/CS\s+line/i, 'Line')
  }
  return null
}

/**
 * Extracts discipline keyword (Piping, Civil, Electrical, Instrumentation, Mechanical, HSE)
 */
export function extractDiscipline(text: string): string | null {
  const lower = text.toLowerCase()
  if (lower.includes('piping') || lower.includes('pipe') || lower.includes('spool') || lower.includes('hydrotest')) {
    return 'Piping'
  }
  if (lower.includes('civil') || lower.includes('concrete') || lower.includes('excavation') || lower.includes('earthwork') || lower.includes('foundation') || lower.includes('pier')) {
    return 'Civil'
  }
  if (lower.includes('electrical') || lower.includes('cable') || lower.includes('tray') || lower.includes('switchgear') || lower.includes('transformer')) {
    return 'Electrical'
  }
  if (lower.includes('instrumentation') || lower.includes('instrument') || lower.includes('transmitter') || lower.includes('tubing') || lower.includes('loop test')) {
    return 'Instrumentation'
  }
  if (lower.includes('mechanical') || lower.includes('pump') || lower.includes('compressor') || lower.includes('turbine') || lower.includes('vessel')) {
    return 'Mechanical'
  }
  if (lower.includes('hse') || lower.includes('safety') || lower.includes('permit') || lower.includes('incident')) {
    return 'HSE'
  }
  return null
}

/**
 * Extracts time window keywords (today, tomorrow, this week, next week, upcoming, overdue)
 */
export function extractTimeWindow(text: string): string | null {
  const lower = text.toLowerCase()
  if (lower.includes('today')) return 'today'
  if (lower.includes('tomorrow')) return 'tomorrow'
  if (lower.includes('this week')) return 'this_week'
  if (lower.includes('next week')) return 'next_week'
  if (lower.includes('overdue') || lower.includes('delayed') || lower.includes('late')) return 'overdue'
  if (lower.includes('upcoming')) return 'upcoming'
  return null
}

/**
 * Checks if input is clearly phrased as a question or inquiry
 */
function isQuestionOrInquiry(text: string): boolean {
  const trimmed = text.trim()
  if (trimmed.endsWith('?')) return true

  const lower = trimmed.toLowerCase()
  const questionStarters = [
    'what',
    'which',
    'how',
    'why',
    'where',
    'when',
    'who',
    'is',
    'are',
    'was',
    'were',
    'can',
    'could',
    'show',
    'list',
    'tell me',
    'check',
    'give me',
    'find',
    'status of',
    'history of',
    'update on',
    'details of',
    'details for',
    'timeline for',
    'overview of',
  ]

  for (const starter of questionStarters) {
    if (lower.startsWith(starter) || lower.includes(` ${starter} `)) {
      return true
    }
  }

  return false
}

/**
 * Checks if text is a multi-line structured site report
 */
function isMultiLineReport(text: string): boolean {
  const trimmed = text.trim()
  if (/\bDATE:\s*\d{4}-\d{2}-\d{2}\b/i.test(trimmed)) return true
  const numberedLines = trimmed.split(/\n(?=\s*\d+\.\s+)/)
  return numberedLines.length > 1 && /^\d+\./.test(numberedLines[0].trim())
}

/**
 * Classifies the incoming message into an intent.
 */
export function classifyIntent(text: string, role?: string | null): IntentClassificationResult {
  const trimmed = text.trim()
  const lower = trimmed.toLowerCase()
  const normRole = (role || 'planner').toLowerCase()

  const activityCode = extractActivityCode(trimmed)
  const asset = extractAssetIdentifier(trimmed)
  const discipline = extractDiscipline(trimmed)
  const timeWindow = extractTimeWindow(trimmed)
  const isQuestion = isQuestionOrInquiry(trimmed)
  const isReport = isMultiLineReport(trimmed)

  // 1. Multi-line site progress report
  if (isReport) {
    return {
      intent: 'SITE_PROGRESS_REPORT',
      category: 'PROGRESS_CAPTURE',
      activityCode,
      discipline,
      timeWindow,
      asset,
      confidence: 0.98,
      rawText: trimmed,
    }
  }

  // 2. Questions about Activity History / "What happened to <activity>?"
  if (
    (activityCode || asset) &&
    (lower.includes('what happened') ||
      lower.includes('happened to') ||
      lower.includes('history') ||
      lower.includes('timeline') ||
      lower.includes('audit') ||
      lower.includes('why is') ||
      lower.includes('why was') ||
      lower.includes('what took place') ||
      lower.includes('log for') ||
      lower.includes('events for') ||
      lower.includes('progress on'))
  ) {
    return {
      intent: 'ACTIVITY_HISTORY',
      category: 'PLANNER_INTELLIGENCE',
      activityCode,
      discipline,
      timeWindow,
      asset,
      confidence: 0.95,
      rawText: trimmed,
    }
  }

  // 3. Questions about Activity Status (e.g. "What is the status of activity PIP-2458?")
  if (
    (activityCode || asset) &&
    (isQuestion ||
      lower.startsWith('status') ||
      lower.includes('status of') ||
      lower.includes('current status') ||
      lower.includes('progress of') ||
      lower.includes('state of') ||
      lower.includes('where are we on') ||
      lower.includes('how is') ||
      lower.includes('is it complete') ||
      lower.includes('is it finished') ||
      lower.includes('is it done') ||
      normRole === 'planner')
  ) {
    // If it is NOT an explicit execution report (e.g. "Started...", "Completed...")
    const isExecutionAction =
      (lower.startsWith('started') ||
        lower.startsWith('completed') ||
        lower.startsWith('poured') ||
        lower.startsWith('excavated') ||
        lower.startsWith('installed') ||
        lower.startsWith('halted') ||
        lower.startsWith('delayed due to')) &&
      !isQuestion

    if (!isExecutionAction) {
      return {
        intent: 'ACTIVITY_STATUS',
        category: 'PLANNER_INTELLIGENCE',
        activityCode,
        discipline,
        timeWindow,
        asset,
        confidence: 0.95,
        rawText: trimmed,
      }
    }
  }

  // 4. Delayed / Overdue Activities queries
  if (
    lower.includes('delayed') ||
    lower.includes('delay') ||
    lower.includes('overdue') ||
    lower.includes('late') ||
    lower.includes('behind schedule') ||
    lower.includes('slippage')
  ) {
    // Check if reporting a delay on site vs asking about delays
    if (
      isQuestion ||
      lower.startsWith('show') ||
      lower.startsWith('which') ||
      lower.startsWith('list') ||
      lower.includes('which activities') ||
      lower.includes('show delayed') ||
      lower.includes('what is delayed') ||
      normRole === 'planner'
    ) {
      return {
        intent: 'DELAYED_ACTIVITIES',
        category: 'PLANNER_INTELLIGENCE',
        activityCode,
        discipline,
        timeWindow,
        asset,
        confidence: 0.92,
        rawText: trimmed,
      }
    }
  }

  // 5. Pending Review / Review Queue queries
  if (
    lower.includes('pending review') ||
    lower.includes('review queue') ||
    lower.includes('pending match') ||
    lower.includes('unmatched') ||
    lower.includes('needs review') ||
    lower.includes('awaiting approval') ||
    lower.includes('unreviewed') ||
    (lower.includes('review') && (isQuestion || lower.includes('show') || lower.includes('list')))
  ) {
    return {
      intent: 'PENDING_REVIEW',
      category: 'PLANNER_INTELLIGENCE',
      activityCode,
      discipline,
      timeWindow,
      asset,
      confidence: 0.94,
      rawText: trimmed,
    }
  }

  // 6. Discipline-specific Activities queries (e.g. "Show Piping activities", "List all civil activities")
  if (
    discipline &&
    (lower.includes('activities') ||
      lower.includes('tasks') ||
      lower.includes('schedule') ||
      lower.includes('list') ||
      lower.includes('show') ||
      isQuestion ||
      normRole === 'planner')
  ) {
    if (
      !lower.startsWith('started') &&
      !lower.startsWith('completed') &&
      !lower.startsWith('poured') &&
      !lower.startsWith('excavated')
    ) {
      return {
        intent: 'DISCIPLINE_ACTIVITIES',
        category: 'PLANNER_INTELLIGENCE',
        activityCode,
        discipline,
        timeWindow,
        asset,
        confidence: 0.9,
        rawText: trimmed,
      }
    }
  }

  // 7. Due Date queries (e.g. "What is due today?", "Show activities due this week")
  if (
    (timeWindow || lower.includes('due') || lower.includes('deadline')) &&
    (isQuestion || lower.startsWith('show') || lower.startsWith('list') || lower.includes('due today') || lower.includes('due this week'))
  ) {
    return {
      intent: 'DUE_ACTIVITIES',
      category: 'PLANNER_INTELLIGENCE',
      activityCode,
      discipline,
      timeWindow: timeWindow || 'upcoming',
      asset,
      confidence: 0.9,
      rawText: trimmed,
    }
  }

  // 8. Overall Project Summary / Progress queries
  if (
    lower.includes('project summary') ||
    lower.includes('overall progress') ||
    lower.includes('project status') ||
    lower.includes('how is the project') ||
    lower.includes('executive summary') ||
    lower.includes('dashboard summary') ||
    lower.includes('kpi')
  ) {
    return {
      intent: 'PROJECT_SUMMARY',
      category: 'PLANNER_INTELLIGENCE',
      activityCode,
      discipline,
      timeWindow,
      asset,
      confidence: 0.92,
      rawText: trimmed,
    }
  }

  // 9. Site Progress Capture - Started
  if (
    (lower.includes('started at') ||
      lower.includes('started') ||
      lower.includes('commenced') ||
      lower.includes('initiated') ||
      lower.includes('erection started')) &&
    !isQuestion
  ) {
    return {
      intent: 'ACTIVITY_STARTED',
      category: 'PROGRESS_CAPTURE',
      activityCode,
      discipline,
      timeWindow,
      asset,
      confidence: 0.95,
      rawText: trimmed,
    }
  }

  // 10. Site Progress Capture - Completed
  if (
    (lower.includes('completed on') ||
      lower.includes('completed') ||
      lower.includes('finished') ||
      lower.includes('checked off') ||
      lower.includes('erection completed') ||
      lower.includes('hydrotest passed')) &&
    !isQuestion
  ) {
    return {
      intent: 'ACTIVITY_COMPLETED',
      category: 'PROGRESS_CAPTURE',
      activityCode,
      discipline,
      timeWindow,
      asset,
      confidence: 0.95,
      rawText: trimmed,
    }
  }

  // 11. Site Progress Capture - Delay / Blocker on site
  if (
    (lower.includes('halted') ||
      lower.includes('on hold') ||
      lower.includes('paused') ||
      lower.includes('suspended') ||
      lower.includes('blocked') ||
      lower.includes('cannot proceed') ||
      lower.includes('due to rain') ||
      lower.includes('due to weather') ||
      lower.includes('crane breakdown')) &&
    !isQuestion
  ) {
    return {
      intent: 'ACTIVITY_DELAY',
      category: 'PROGRESS_CAPTURE',
      activityCode,
      discipline,
      timeWindow,
      asset,
      confidence: 0.9,
      rawText: trimmed,
    }
  }

  // 12. Site Progress Capture - Quantities / Observations
  if (
    !isQuestion &&
    (/\b\d+\s*(?:m³|m3|m|meters|spools|tons|ft|feet|joints)\b/i.test(trimmed) ||
      lower.startsWith('poured') ||
      lower.startsWith('excavated') ||
      lower.startsWith('installed') ||
      lower.startsWith('delivered') ||
      lower.startsWith('pulled'))
  ) {
    return {
      intent: 'SITE_OBSERVATION',
      category: 'PROGRESS_CAPTURE',
      activityCode,
      discipline,
      timeWindow,
      asset,
      confidence: 0.9,
      rawText: trimmed,
    }
  }

  // 13. If user is in Planner role and entered text that is not a site action, default to Planner intelligence
  if (normRole === 'planner') {
    if (activityCode || asset) {
      return {
        intent: 'ACTIVITY_STATUS',
        category: 'PLANNER_INTELLIGENCE',
        activityCode,
        discipline,
        timeWindow,
        asset,
        confidence: 0.85,
        rawText: trimmed,
      }
    }
    return {
      intent: 'CLARIFICATION',
      category: 'CLARIFICATION',
      activityCode,
      discipline,
      timeWindow,
      asset,
      confidence: 0.8,
      rawText: trimmed,
    }
  }

  // 14. If user is in Supervisor role and text is not a clear progress event, route to clarification or observation
  if (isQuestion) {
    return {
      intent: activityCode || asset ? 'ACTIVITY_STATUS' : 'CLARIFICATION',
      category: activityCode || asset ? 'PLANNER_INTELLIGENCE' : 'CLARIFICATION',
      activityCode,
      discipline,
      timeWindow,
      asset,
      confidence: 0.8,
      rawText: trimmed,
    }
  }

  // Default fallback for single-line text in supervisor role
  return {
    intent: 'SITE_OBSERVATION',
    category: 'PROGRESS_CAPTURE',
    activityCode,
    discipline,
    timeWindow,
    asset,
    confidence: 0.75,
    rawText: trimmed,
  }
}
