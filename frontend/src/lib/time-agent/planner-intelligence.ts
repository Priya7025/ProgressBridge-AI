import { SupabaseClient } from '@supabase/supabase-js'
import { PlannerIntent } from './intent'

export interface PlannerIntelligenceParams {
  intent: PlannerIntent | 'CLARIFICATION'
  query: string
  projectId: string
  activityCode: string | null
  discipline: string | null
  timeWindow: string | null
  asset: string | null
  role: string | null
  supabase: SupabaseClient
}

export interface PlannerIntelligenceResult {
  message: string
  intent: string
  activity?: Record<string, unknown> | null
  details?: Record<string, unknown> | null
}

function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return 'Not recorded'
  const d = new Date(dateStr)
  if (isNaN(d.getTime())) return dateStr
  return d.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

function calculateDelayDays(
  plannedFinish: string | null | undefined,
  actualFinish: string | null | undefined,
  status: string | null | undefined
): { days: number; label: string; isDelayed: boolean } {
  const normStatus = (status || '').toUpperCase()
  const now = new Date()
  const todayUtc = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()))

  if (normStatus === 'COMPLETED' && actualFinish && plannedFinish) {
    const planned = new Date(plannedFinish).getTime()
    const actual = new Date(actualFinish).getTime()
    const diffDays = Math.round((actual - planned) / (1000 * 60 * 60 * 24))
    if (diffDays > 0) {
      return { days: diffDays, label: `Completed with ${diffDays} day(s) delay`, isDelayed: true }
    } else if (diffDays < 0) {
      return { days: diffDays, label: `Completed ${Math.abs(diffDays)} day(s) ahead of schedule`, isDelayed: false }
    }
    return { days: 0, label: 'Completed on schedule', isDelayed: false }
  }

  if (plannedFinish) {
    const planned = new Date(plannedFinish).getTime()
    const diffDays = Math.round((todayUtc.getTime() - planned) / (1000 * 60 * 60 * 24))
    if (diffDays > 0 && normStatus !== 'COMPLETED') {
      return { days: diffDays, label: `Overdue by ${diffDays} day(s)`, isDelayed: true }
    }
  }

  return { days: 0, label: 'On schedule (0 days delay)', isDelayed: false }
}

/**
 * Handles "What is the status of activity <id>?" and related status queries.
 */
async function handleActivityStatus(
  supabase: SupabaseClient,
  projectId: string,
  activityCode: string | null,
  asset: string | null,
  query: string
): Promise<PlannerIntelligenceResult> {
  // 1. Query schedule_activities
  let queryBuilder = supabase
    .from('schedule_activities')
    .select('id, project_id, activity_id, wbs, level, description, discipline, location, asset, planned_start, planned_finish, duration, status, actual_start, actual_finish, created_at, updated_at')
    .eq('project_id', projectId)

  if (activityCode) {
    queryBuilder = queryBuilder.ilike('activity_id', activityCode)
  } else if (asset) {
    queryBuilder = queryBuilder.ilike('asset', `%${asset}%`)
  } else {
    // Attempt to extract keyword from query
    const words = query.replace(/[^\w\s-]/g, '').split(/\s+/).filter((w) => w.length > 2)
    if (words.length > 0) {
      queryBuilder = queryBuilder.or(`activity_id.ilike.%${words[0]}%,description.ilike.%${words[0]}%`)
    }
  }

  const { data: activities, error: actError } = await queryBuilder.limit(1)

  if (actError || !activities || activities.length === 0) {
    const searchTarget = activityCode || asset || query
    return {
      intent: 'ACTIVITY_STATUS',
      message: `I could not find an activity matching **"${searchTarget}"** in the current project schedule.\n\nPlease verify the activity ID (e.g. *PIP-2458*, *CIV-1002*) or check the Schedule page.`,
      activity: null,
    }
  }

  const act = activities[0]

  // 2. Fetch linked matches and progress events
  const { data: matches } = await supabase
    .from('activity_matches')
    .select('id, event_id, semantic_score, identifier_score, discipline_score, location_score, final_score, match_status, reviewed_at, progress_events(*)')
    .eq('activity_id', act.id)
    .order('created_at', { ascending: false })
    .limit(5)

  // 3. Direct progress events by asset if available
  let directEvents: Array<Record<string, unknown>> = []
  if (act.asset) {
    const { data: events } = await supabase
      .from('progress_events')
      .select('*')
      .eq('project_id', projectId)
      .ilike('asset', `%${act.asset}%`)
      .order('created_at', { ascending: false })
      .limit(3)
    if (events) directEvents = events
  }

  const delayInfo = calculateDelayDays(act.planned_finish, act.actual_finish, act.status)
  
  // Format Latest Event
  let latestEventStr = 'No progress events logged yet.'
  const latestMatch = matches && matches.length > 0 ? matches[0] : null
  const rawMatchedEvt = latestMatch?.progress_events as unknown
  const matchedEvent = (Array.isArray(rawMatchedEvt) ? rawMatchedEvt[0] : rawMatchedEvt) as Record<string, unknown> | null

  if (matchedEvent) {
    const evtType = (matchedEvent.event_type as string) || 'UPDATE'
    const evtDesc = (matchedEvent.activity_description as string) || (matchedEvent.source_evidence as string) || ''
    const evtDate = formatDate(matchedEvent.event_date as string)
    latestEventStr = `"${evtDesc}" (${evtType} on ${evtDate})`
  } else if (directEvents.length > 0) {
    const evt = directEvents[0]
    const evtType = (evt.event_type as string) || 'UPDATE'
    const evtDesc = (evt.activity_description as string) || ''
    const evtDate = formatDate(evt.event_date as string)
    latestEventStr = `"${evtDesc}" (${evtType} on ${evtDate})`
  }

  // Format Review Status
  let reviewStatusStr = 'No pending review actions.'
  if (latestMatch) {
    const confScore = latestMatch.final_score ? Math.round(Number(latestMatch.final_score) * 100) : null
    const scoreStr = confScore !== null ? ` (Confidence: ${confScore}%)` : ''
    if (latestMatch.match_status === 'APPROVED') {
      reviewStatusStr = `Approved by Planner${scoreStr}`
    } else if (latestMatch.match_status === 'AUTO_MATCHED') {
      reviewStatusStr = `Auto-Matched to Schedule${scoreStr}`
    } else if (latestMatch.match_status === 'PENDING_REVIEW') {
      reviewStatusStr = `Pending Planner Review${scoreStr}`
    } else {
      reviewStatusStr = `${latestMatch.match_status}${scoreStr}`
    }
  }

  const message = [
    `### Activity Status: **${act.activity_id}** — *${act.description}*`,
    `• **Discipline:** ${act.discipline || 'General'}`,
    `• **Asset / Location:** ${act.asset || 'N/A'} · ${act.location || 'N/A'}`,
    `• **Current Status:** \`${act.status}\``,
    `• **Planned Schedule:** ${formatDate(act.planned_start)} → ${formatDate(act.planned_finish)} (${act.duration || 0} days)`,
    `• **Actual Dates:** Started: **${formatDate(act.actual_start)}** | Finish: **${act.actual_finish ? formatDate(act.actual_finish) : (act.status === 'IN_PROGRESS' ? 'In Progress' : 'Pending')}**`,
    `• **Schedule Variance / Delay:** ${delayInfo.label}`,
    `• **Latest Site Event:** ${latestEventStr}`,
    `• **Review & Verification:** ${reviewStatusStr}`,
  ].join('\n')

  return {
    intent: 'ACTIVITY_STATUS',
    message,
    activity: act,
    details: {
      activity_id: act.activity_id,
      description: act.description,
      discipline: act.discipline,
      status: act.status,
      planned_start: act.planned_start,
      planned_finish: act.planned_finish,
      actual_start: act.actual_start,
      actual_finish: act.actual_finish,
      delay_days: delayInfo.days,
      delay_label: delayInfo.label,
      latest_event: latestEventStr,
      review_status: reviewStatusStr,
    },
  }
}

/**
 * Handles "What happened to <id>?" and activity timeline/history inquiries.
 */
async function handleActivityHistory(
  supabase: SupabaseClient,
  projectId: string,
  activityCode: string | null,
  asset: string | null,
  query: string
): Promise<PlannerIntelligenceResult> {
  // 1. Query activity details
  let queryBuilder = supabase
    .from('schedule_activities')
    .select('id, project_id, activity_id, wbs, level, description, discipline, location, asset, planned_start, planned_finish, duration, status, actual_start, actual_finish, created_at, updated_at')
    .eq('project_id', projectId)

  if (activityCode) {
    queryBuilder = queryBuilder.ilike('activity_id', activityCode)
  } else if (asset) {
    queryBuilder = queryBuilder.ilike('asset', `%${asset}%`)
  } else {
    const words = query.replace(/[^\w\s-]/g, '').split(/\s+/).filter((w) => w.length > 2)
    if (words.length > 0) {
      queryBuilder = queryBuilder.or(`activity_id.ilike.%${words[0]}%,description.ilike.%${words[0]}%`)
    }
  }

  const { data: activities, error: actError } = await queryBuilder.limit(1)

  if (actError || !activities || activities.length === 0) {
    const searchTarget = activityCode || asset || query
    return {
      intent: 'ACTIVITY_HISTORY',
      message: `I could not find an activity history matching **"${searchTarget}"** in the current project.\n\nPlease verify the activity code (e.g. *PIP-2458*).`,
      activity: null,
    }
  }

  const act = activities[0]

  // 2. Fetch matches, progress events, and audit logs
  const [matchesRes, auditRes] = await Promise.all([
    supabase
      .from('activity_matches')
      .select('id, event_id, semantic_score, identifier_score, discipline_score, location_score, final_score, match_status, reviewed_at, created_at, progress_events(*)')
      .eq('activity_id', act.id)
      .order('created_at', { ascending: true }),
    supabase
      .from('audit_log')
      .select('id, action, old_value, new_value, user_id, comment, created_at')
      .eq('activity_id', act.id)
      .order('created_at', { ascending: true }),
  ])

  const matches = matchesRes.data || []
  const auditLogs = auditRes.data || []
  const delayInfo = calculateDelayDays(act.planned_finish, act.actual_finish, act.status)

  const timelineEntries: string[] = []

  // Step 1: Baseline
  timelineEntries.push(
    `1. **Baseline Scheduled:** Planned start **${formatDate(act.planned_start)}**, target finish **${formatDate(act.planned_finish)}** (${act.duration || 0} days duration).`
  )

  // Step 2: Ingested Events & Verification
  if (matches.length > 0) {
    matches.forEach((m, idx) => {
      const rawEvt = m.progress_events as unknown
      const evt = (Array.isArray(rawEvt) ? rawEvt[0] : rawEvt) as Record<string, unknown> | null
      const evtDate = evt?.event_date ? formatDate(evt.event_date as string) : formatDate(m.created_at)
      const evtType = (evt?.event_type as string) || 'PROGRESS'
      const evtDesc = (evt?.activity_description as string) || 'Site progress reported'
      const conf = m.final_score ? `${Math.round(Number(m.final_score) * 100)}%` : 'AI verified'
      const statusLabel = m.match_status === 'APPROVED' ? 'Approved by Planner' : m.match_status

      timelineEntries.push(
        `${idx + 2}. **${evtDate} — Site Report:** "${evtDesc}" (Type: \`${evtType}\`). Matched with **${conf} confidence** — *${statusLabel}*.`
      )
    })
  } else {
    // If no match row yet, check if actual start has been set
    if (act.actual_start) {
      timelineEntries.push(
        `2. **${formatDate(act.actual_start)} — Execution Commenced:** Site progress initiated on ${act.asset || act.description}. Status updated to \`${act.status}\`.`
      )
    }
  }

  // Step 3: Audit Trail entries
  if (auditLogs.length > 0) {
    auditLogs.forEach((a) => {
      const auditDate = formatDate(a.created_at)
      const actionName = a.action || 'Schedule update'
      const commentStr = a.comment ? ` (${a.comment})` : ''
      timelineEntries.push(
        `• **${auditDate} — Audit Log:** ${actionName}${commentStr}.`
      )
    })
  }

  // Final Summary state
  const executionSummary = act.actual_finish
    ? `Completed on **${formatDate(act.actual_finish)}** (${delayInfo.label}).`
    : act.actual_start
    ? `Currently **IN PROGRESS** (Commenced on ${formatDate(act.actual_start)}).`
    : `Status: **${act.status}** (Not started).`

  const message = [
    `### Complete Timeline & History: **${act.activity_id}**`,
    `**${act.description}** | Discipline: *${act.discipline}* | Asset: *${act.asset || 'N/A'}*`,
    ``,
    `#### Project Schedule Baseline:`,
    `- **Planned Window:** ${formatDate(act.planned_start)} → ${formatDate(act.planned_finish)}`,
    `- **Actual Execution:** ${executionSummary}`,
    `- **Schedule Variance:** ${delayInfo.label}`,
    ``,
    `#### Chronological Activity Log:`,
    ...timelineEntries,
  ].join('\n')

  return {
    intent: 'ACTIVITY_HISTORY',
    message,
    activity: act,
    details: {
      activity_id: act.activity_id,
      description: act.description,
      status: act.status,
      timeline: timelineEntries,
      delay: delayInfo,
    },
  }
}

/**
 * Handles "Which activities are delayed?" and overdue analysis.
 */
async function handleDelayedActivities(
  supabase: SupabaseClient,
  projectId: string,
  discipline: string | null
): Promise<PlannerIntelligenceResult> {
  let query = supabase
    .from('schedule_activities')
    .select('activity_id, description, discipline, location, planned_start, planned_finish, actual_start, actual_finish, status')
    .eq('project_id', projectId)

  if (discipline) {
    query = query.ilike('discipline', discipline)
  }

  const { data: activities, error } = await query

  if (error || !activities) {
    return {
      intent: 'DELAYED_ACTIVITIES',
      message: 'Unable to query delay analytics at this time. Please check your network connection.',
    }
  }

  const delayedList: Array<{
    activity_id: string
    description: string
    discipline: string
    delay_days: number
    planned_finish: string | null
    status: string
  }> = []

  for (const act of activities) {
    const delay = calculateDelayDays(act.planned_finish, act.actual_finish, act.status)
    if (delay.isDelayed && delay.days > 0) {
      delayedList.push({
        activity_id: act.activity_id,
        description: act.description,
        discipline: act.discipline || 'General',
        delay_days: delay.days,
        planned_finish: act.planned_finish,
        status: act.status,
      })
    }
  }

  delayedList.sort((a, b) => b.delay_days - a.delay_days)

  if (delayedList.length === 0) {
    return {
      intent: 'DELAYED_ACTIVITIES',
      message: `🎉 **No delayed activities found!**\n\nAll ${discipline ? discipline + ' ' : ''}activities in the schedule baseline are currently on track or completed on schedule.`,
    }
  }

  const topDelayed = delayedList.slice(0, 8)
  const lines = topDelayed.map(
    (d, i) =>
      `${i + 1}. **${d.activity_id}** — *${d.description}* [${d.discipline}]\n   • Delay: **+${d.delay_days} day(s)** | Due: ${formatDate(d.planned_finish)} | Status: \`${d.status}\``
  )

  const message = [
    `### Delayed & Overdue Activities (${delayedList.length} total found)`,
    discipline ? `Filter: **${discipline}** discipline\n` : '',
    ...lines,
    delayedList.length > 8 ? `\n*...and ${delayedList.length - 8} more delayed activities. View full list on the Dashboard.*` : '',
  ].filter(Boolean).join('\n')

  return {
    intent: 'DELAYED_ACTIVITIES',
    message,
    details: {
      count: delayedList.length,
      delayed_activities: topDelayed,
    },
  }
}

/**
 * Handles "Which activities are pending review?"
 */
async function handlePendingReview(
  supabase: SupabaseClient,
  projectId: string
): Promise<PlannerIntelligenceResult> {
  const [reviewRes, unmatchedRes] = await Promise.all([
    supabase
      .from('review_queue')
      .select('*')
      .eq('project_id', projectId)
      .limit(5),
    supabase
      .from('unmatched_queue')
      .select('*')
      .eq('project_id', projectId)
      .limit(5),
  ])

  const pendingItems = reviewRes.data || []
  const unmatchedItems = unmatchedRes.data || []
  const totalCount = pendingItems.length + unmatchedItems.length

  if (totalCount === 0) {
    return {
      intent: 'PENDING_REVIEW',
      message: '✅ **Review Queue is clean!**\n\nThere are currently 0 pending matches or unmatched site events awaiting planner review.',
    }
  }

  const pendingLines = pendingItems.map((item, idx) => {
    const score = item.final_score ? `${Math.round(Number(item.final_score) * 100)}%` : 'Review'
    return `${idx + 1}. **"${item.activity_description}"** [${item.discipline || 'General'}]\n   • Suggested Match: **${item.suggested_activity_code || 'N/A'}** (${score} score) · Status: \`PENDING_REVIEW\``
  })

  const unmatchedLines = unmatchedItems.map((item, idx) => {
    return `${idx + 1}. **"${item.activity_description}"** [${item.discipline || 'General'}]\n   • Candidate: **${item.closest_activity_code || 'None'}** · Status: \`UNMATCHED\``
  })

  const messageParts: string[] = [
    `### Review Queue Status: **${totalCount} Event(s) Awaiting Review**`,
  ]

  if (pendingItems.length > 0) {
    messageParts.push(`\n#### High-Confidence & Review Matches (${pendingItems.length}):`, ...pendingLines)
  }

  if (unmatchedItems.length > 0) {
    messageParts.push(`\n#### Unmatched Site Events (${unmatchedItems.length}):`, ...unmatchedLines)
  }

  messageParts.push(`\n👉 *Navigate to the **Review** tab to approve or link these events.*`)

  return {
    intent: 'PENDING_REVIEW',
    message: messageParts.join('\n'),
    details: {
      pending_count: pendingItems.length,
      unmatched_count: unmatchedItems.length,
    },
  }
}

/**
 * Handles discipline queries like "Show Piping activities"
 */
async function handleDisciplineActivities(
  supabase: SupabaseClient,
  projectId: string,
  discipline: string
): Promise<PlannerIntelligenceResult> {
  const { data: activities, error } = await supabase
    .from('schedule_activities')
    .select('activity_id, description, discipline, status, planned_start, planned_finish, actual_start, actual_finish')
    .eq('project_id', projectId)
    .ilike('discipline', discipline)
    .order('planned_start', { ascending: true })
    .limit(10)

  if (error || !activities || activities.length === 0) {
    return {
      intent: 'DISCIPLINE_ACTIVITIES',
      message: `No activities found for discipline **"${discipline}"** in the project schedule.`,
    }
  }

  const counts: Record<string, number> = {
    COMPLETED: 0,
    IN_PROGRESS: 0,
    NOT_STARTED: 0,
  }

  activities.forEach((a) => {
    const st = (a.status || 'NOT_STARTED').toUpperCase()
    counts[st] = (counts[st] || 0) + 1
  })

  const sampleLines = activities.slice(0, 6).map(
    (a, i) =>
      `${i + 1}. **${a.activity_id}** — ${a.description}\n   • Window: ${formatDate(a.planned_start)} → ${formatDate(a.planned_finish)} | Status: \`${a.status}\``
  )

  const message = [
    `### **${discipline}** Discipline Overview`,
    `• **Summary:** ${counts['COMPLETED'] || 0} Completed | ${counts['IN_PROGRESS'] || 0} In Progress | ${counts['NOT_STARTED'] || 0} Not Started`,
    ``,
    `#### Key Activities:`,
    ...sampleLines,
    activities.length > 6 ? `\n*...and ${activities.length - 6} more activities in the Schedule.*` : '',
  ].filter(Boolean).join('\n')

  return {
    intent: 'DISCIPLINE_ACTIVITIES',
    message,
    details: { discipline, counts, sample: activities.slice(0, 6) },
  }
}

/**
 * Handles "What is due today / this week?"
 */
async function handleDueActivities(
  supabase: SupabaseClient,
  projectId: string,
  timeWindow: string | null
): Promise<PlannerIntelligenceResult> {
  const now = new Date()
  const todayStr = now.toISOString().split('T')[0]

  const { data: activities, error } = await supabase
    .from('schedule_activities')
    .select('activity_id, description, discipline, planned_start, planned_finish, status')
    .eq('project_id', projectId)
    .order('planned_finish', { ascending: true })
    .limit(20)

  if (error || !activities) {
    return {
      intent: 'DUE_ACTIVITIES',
      message: 'Could not query upcoming deadlines at this time.',
    }
  }

  const lines = activities.slice(0, 6).map(
    (a, i) =>
      `${i + 1}. **${a.activity_id}** — *${a.description}* [${a.discipline || 'General'}]\n   • Due: **${formatDate(a.planned_finish)}** | Status: \`${a.status}\``
  )

  const message = [
    `### Upcoming Deadlines & Due Schedule Items (${timeWindow || 'Current Period'})`,
    `Reference Date: **${todayStr}**`,
    ``,
    ...lines,
  ].join('\n')

  return {
    intent: 'DUE_ACTIVITIES',
    message,
    details: { activities: activities.slice(0, 6) },
  }
}

/**
 * Handles "Project Summary"
 */
async function handleProjectSummary(
  supabase: SupabaseClient,
  projectId: string
): Promise<PlannerIntelligenceResult> {
  const [actRes, eventsRes] = await Promise.all([
    supabase
      .from('schedule_activities')
      .select('status, discipline')
      .eq('project_id', projectId),
    supabase
      .from('progress_events')
      .select('status, event_type')
      .eq('project_id', projectId),
  ])

  const activities = actRes.data || []
  const events = eventsRes.data || []

  const totalActs = activities.length
  const completed = activities.filter((a) => (a.status || '').toUpperCase() === 'COMPLETED').length
  const inProgress = activities.filter((a) => (a.status || '').toUpperCase() === 'IN_PROGRESS').length
  const notStarted = activities.filter((a) => (a.status || '').toUpperCase() === 'NOT_STARTED').length
  const delayed = activities.filter((a) => (a.status || '').toUpperCase() === 'DELAYED').length

  const completionPct = totalActs > 0 ? Math.round((completed / totalActs) * 100) : 0

  const message = [
    `### 📊 Project Intelligence Executive Summary`,
    `• **Total Schedule Activities:** ${totalActs}`,
    `• **Overall Progress Completion:** ${completionPct}%`,
    `• **Activity Status Breakdown:**`,
    `  - ✅ **Completed:** ${completed}`,
    `  - 🚧 **In Progress:** ${inProgress}`,
    `  - ⏳ **Not Started:** ${notStarted}`,
    `  - ⚠️ **Delayed:** ${delayed}`,
    `• **Extracted Site Events Logged:** ${events.length}`,
  ].join('\n')

  return {
    intent: 'PROJECT_SUMMARY',
    message,
    details: {
      total_activities: totalActs,
      completed,
      in_progress: inProgress,
      not_started: notStarted,
      delayed,
      completion_pct: completionPct,
      total_events: events.length,
    },
  }
}

/**
 * Main dispatcher for Planner Intelligence Queries.
 */
export async function handlePlannerIntelligence(
  params: PlannerIntelligenceParams
): Promise<PlannerIntelligenceResult> {
  const { intent, query, projectId, activityCode, discipline, timeWindow, asset, supabase } = params

  switch (intent) {
    case 'ACTIVITY_STATUS':
      return handleActivityStatus(supabase, projectId, activityCode, asset, query)

    case 'ACTIVITY_HISTORY':
      return handleActivityHistory(supabase, projectId, activityCode, asset, query)

    case 'DELAYED_ACTIVITIES':
      return handleDelayedActivities(supabase, projectId, discipline)

    case 'PENDING_REVIEW':
      return handlePendingReview(supabase, projectId)

    case 'DISCIPLINE_ACTIVITIES':
      return handleDisciplineActivities(supabase, projectId, discipline || 'Piping')

    case 'DUE_ACTIVITIES':
      return handleDueActivities(supabase, projectId, timeWindow)

    case 'PROJECT_SUMMARY':
      return handleProjectSummary(supabase, projectId)

    case 'CLARIFICATION':
    default:
      return {
        intent: 'CLARIFICATION',
        message: [
          `👋 **Hello! I am your Project Intelligence Assistant.**`,
          ``,
          `You can query project intelligence and schedule progress by asking:`,
          `• *"What happened to PIP-2458?"* — Full chronological timeline, site logs & review history.`,
          `• *"What is the status of activity PIP-2458?"* — Current state, dates, delay & latest event.`,
          `• *"Which activities are delayed?"* — Real-time schedule slippage analysis.`,
          `• *"Which activities are pending review?"* — Review queue items needing planner verification.`,
          `• *"Show Piping activities"* — Discipline-specific breakdown & upcoming work.`,
          `• *"What is the project summary?"* — Executive KPIs and completion status.`,
        ].join('\n'),
      }
  }
}
