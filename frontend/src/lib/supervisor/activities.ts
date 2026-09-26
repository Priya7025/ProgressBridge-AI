import { SupabaseClient } from '@supabase/supabase-js'
import type {
  DeadlineInfo,
  ScheduleActivityDbRow,
  SupervisorActivityItem,
  SupervisorActivitiesQueryParams,
  SupervisorActivitiesResponse,
  SupervisorActivitySummary,
} from './types'

/**
 * Parses YYYY-MM-DD string into a UTC Date object set to midnight.
 * Guarantees date calculations are consistent across timezones.
 */
export function parseDateToUtcMidnight(dateStr: string | null | undefined): Date | null {
  if (!dateStr) return null
  const parts = dateStr.trim().split('-')
  if (parts.length !== 3) return null
  const year = parseInt(parts[0], 10)
  const month = parseInt(parts[1], 10) - 1
  const day = parseInt(parts[2], 10)
  if (isNaN(year) || isNaN(month) || isNaN(day)) return null
  return new Date(Date.UTC(year, month, day))
}

/**
 * Returns reference date as UTC midnight.
 */
export function getReferenceDateUtc(referenceDateStr?: string | null): Date {
  if (referenceDateStr) {
    const parsed = parseDateToUtcMidnight(referenceDateStr)
    if (parsed) return parsed
  }
  const now = new Date()
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()))
}

/**
 * Formats a Date to YYYY-MM-DD.
 */
export function formatDateToIso(date: Date): string {
  const year = date.getUTCFullYear()
  const month = String(date.getUTCMonth() + 1).padStart(2, '0')
  const day = String(date.getUTCDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

/**
 * Calculates deadline state, label, and days diff dynamically from planned_finish and status.
 */
export function calculateDeadlineInfo(
  plannedFinish: string | null | undefined,
  actualFinish: string | null | undefined,
  status: string | null | undefined,
  refDateUtc: Date
): DeadlineInfo {
  const normStatus = (status || '').toUpperCase()

  // 1. Completed Activities
  if (normStatus === 'COMPLETED' || actualFinish) {
    return {
      deadline_state: 'COMPLETED',
      deadline_label: 'Completed',
      days_diff: null,
      days_remaining: null,
      days_overdue: null,
    }
  }

  // 2. Activities without a Planned Finish Date
  if (!plannedFinish) {
    return {
      deadline_state: 'NO_DEADLINE',
      deadline_label: 'No deadline',
      days_diff: null,
      days_remaining: null,
      days_overdue: null,
    }
  }

  const targetDateUtc = parseDateToUtcMidnight(plannedFinish)
  if (!targetDateUtc) {
    return {
      deadline_state: 'NO_DEADLINE',
      deadline_label: 'No deadline',
      days_diff: null,
      days_remaining: null,
      days_overdue: null,
    }
  }

  const MS_PER_DAY = 1000 * 60 * 60 * 24
  const diffDays = Math.round((targetDateUtc.getTime() - refDateUtc.getTime()) / MS_PER_DAY)

  // 3. Overdue
  if (diffDays < 0) {
    const overdueDays = Math.abs(diffDays)
    return {
      deadline_state: 'OVERDUE',
      deadline_label: overdueDays === 1 ? 'Overdue by 1 day' : `Overdue by ${overdueDays} days`,
      days_diff: diffDays,
      days_remaining: 0,
      days_overdue: overdueDays,
    }
  }

  // 4. Due Today
  if (diffDays === 0) {
    return {
      deadline_state: 'DUE_TODAY',
      deadline_label: 'Due today',
      days_diff: 0,
      days_remaining: 0,
      days_overdue: 0,
    }
  }

  // 5. Due Soon (1 to 3 days)
  if (diffDays <= 3) {
    return {
      deadline_state: 'DUE_SOON',
      deadline_label: diffDays === 1 ? 'Due in 1 day' : `Due in ${diffDays} days`,
      days_diff: diffDays,
      days_remaining: diffDays,
      days_overdue: 0,
    }
  }

  // 6. Upcoming (more than 3 days)
  return {
    deadline_state: 'UPCOMING',
    deadline_label: `Due in ${diffDays} days`,
    days_diff: diffDays,
    days_remaining: diffDays,
    days_overdue: 0,
  }
}

/**
 * Queries lightweight summary metrics for supervisor dashboard overview.
 */
export async function fetchSupervisorActivitySummary(
  supabase: SupabaseClient,
  projectId: string,
  discipline?: string,
  referenceDateStr?: string
): Promise<SupervisorActivitySummary> {
  const refDateUtc = getReferenceDateUtc(referenceDateStr)
  const refDateFormatted = formatDateToIso(refDateUtc)

  const plus3Days = new Date(refDateUtc.getTime() + 3 * 24 * 60 * 60 * 1000)
  const plus3DaysFormatted = formatDateToIso(plus3Days)

  const createBaseCountQuery = () => {
    let q = supabase
      .from('schedule_activities')
      .select('*', { count: 'exact', head: true })
      .eq('project_id', projectId)

    if (discipline && discipline.toLowerCase() !== 'all') {
      q = q.ilike('discipline', discipline)
    }
    return q
  }

  const [
    totalRes,
    completedRes,
    inProgressRes,
    notStartedRes,
    overdueRes,
    dueTodayRes,
    dueSoonRes,
  ] = await Promise.all([
    createBaseCountQuery(),
    createBaseCountQuery().eq('status', 'COMPLETED'),
    createBaseCountQuery().eq('status', 'IN_PROGRESS'),
    createBaseCountQuery().eq('status', 'NOT_STARTED'),
    createBaseCountQuery()
      .neq('status', 'COMPLETED')
      .lt('planned_finish', refDateFormatted),
    createBaseCountQuery()
      .neq('status', 'COMPLETED')
      .eq('planned_finish', refDateFormatted),
    createBaseCountQuery()
      .neq('status', 'COMPLETED')
      .gt('planned_finish', refDateFormatted)
      .lte('planned_finish', plus3DaysFormatted),
  ])

  return {
    total: totalRes.count ?? 0,
    completed: completedRes.count ?? 0,
    in_progress: inProgressRes.count ?? 0,
    not_started: notStartedRes.count ?? 0,
    overdue: overdueRes.count ?? 0,
    due_today: dueTodayRes.count ?? 0,
    due_soon: dueSoonRes.count ?? 0,
  }
}

/**
 * Core query function for fetching paginated, filtered, sorted activities for supervisor center.
 */
export async function getSupervisorActivities(
  supabase: SupabaseClient,
  params: SupervisorActivitiesQueryParams
): Promise<SupervisorActivitiesResponse> {
  const projectId =
    params.projectId ||
    process.env.NEXT_PUBLIC_DEMO_PROJECT_ID ||
    '00000000-0000-0000-0000-000000000001'

  const page = Math.max(1, Number(params.page) || 1)
  const limit = Math.min(100, Math.max(1, Number(params.limit) || 20))
  const discipline = params.discipline?.trim() || 'All'
  const status = params.status?.trim() || 'All'
  const sort = params.sort?.trim() || 'deadline_nearest'
  const search = params.search?.trim() || ''

  const refDateUtc = getReferenceDateUtc(params.referenceDate)
  const refDateIso = formatDateToIso(refDateUtc)
  const plus3Days = new Date(refDateUtc.getTime() + 3 * 24 * 60 * 60 * 1000)
  const plus3DaysIso = formatDateToIso(plus3Days)

  // 1. Build main query with only the fields needed by Supervisor Activity UI
  let query = supabase
    .from('schedule_activities')
    .select(
      'id, project_id, activity_id, description, discipline, asset, location, planned_start, planned_finish, actual_start, actual_finish, status',
      { count: 'exact' }
    )
    .eq('project_id', projectId)

  // 2. Discipline filter
  if (discipline && discipline.toLowerCase() !== 'all') {
    query = query.ilike('discipline', discipline)
  }

  // 3. Status / Deadline filter
  const normStatus = status.toUpperCase()
  if (normStatus !== 'ALL' && normStatus !== '') {
    if (normStatus === 'OVERDUE' || normStatus === 'DELAYED') {
      // Overdue: Not completed and planned_finish in past, or marked DELAYED
      query = query
        .neq('status', 'COMPLETED')
        .or(`status.eq.DELAYED,planned_finish.lt.${refDateIso}`)
    } else if (normStatus === 'DUE_TODAY' || normStatus === 'TODAY') {
      query = query.neq('status', 'COMPLETED').eq('planned_finish', refDateIso)
    } else if (normStatus === 'DUE_SOON' || normStatus === 'SOON') {
      query = query
        .neq('status', 'COMPLETED')
        .gt('planned_finish', refDateIso)
        .lte('planned_finish', plus3DaysIso)
    } else if (normStatus === 'COMPLETED') {
      query = query.eq('status', 'COMPLETED')
    } else if (normStatus === 'IN_PROGRESS') {
      query = query.eq('status', 'IN_PROGRESS')
    } else if (normStatus === 'NOT_STARTED') {
      query = query.eq('status', 'NOT_STARTED')
    } else {
      query = query.ilike('status', status)
    }
  }

  // 4. Text search filter
  if (search) {
    const cleanSearch = search.replace(/[%,()]/g, '')
    if (cleanSearch) {
      query = query.or(
        `activity_id.ilike.%${cleanSearch}%,description.ilike.%${cleanSearch}%,asset.ilike.%${cleanSearch}%,location.ilike.%${cleanSearch}%`
      )
    }
  }

  // 5. Sorting
  switch (sort) {
    case 'deadline_farthest':
    case 'deadline_desc':
      query = query
        .order('planned_finish', { ascending: false, nullsFirst: false })
        .order('activity_id', { ascending: true })
      break

    case 'activity_name':
    case 'name':
    case 'name_asc':
      query = query.order('activity_id', { ascending: true })
      break

    case 'status':
      query = query
        .order('status', { ascending: true })
        .order('planned_finish', { ascending: true, nullsFirst: false })
        .order('activity_id', { ascending: true })
      break

    case 'deadline_nearest':
    case 'deadline_asc':
    case 'deadline':
    default:
      query = query
        .order('planned_finish', { ascending: true, nullsFirst: false })
        .order('activity_id', { ascending: true })
      break
  }

  // 6. Pagination range
  const from = (page - 1) * limit
  const to = from + limit - 1
  query = query.range(from, to)

  // 7. Execute query and summary concurrently
  const [activitiesResult, summary] = await Promise.all([
    query,
    fetchSupervisorActivitySummary(supabase, projectId, discipline, params.referenceDate),
  ])

  if (activitiesResult.error) {
    return {
      success: false,
      data: [],
      pagination: {
        page,
        limit,
        total: 0,
        total_pages: 0,
        has_more: false,
      },
      filters: {
        project_id: projectId,
        discipline,
        status,
        sort,
        reference_date: refDateIso,
      },
      error: activitiesResult.error.message,
    }
  }

  const rawRows: ScheduleActivityDbRow[] = (activitiesResult.data as ScheduleActivityDbRow[]) || []
  const totalCount = activitiesResult.count ?? rawRows.length
  const totalPages = Math.ceil(totalCount / limit)

  // 8. Transform data with real calculated deadline states
  const formattedActivities: SupervisorActivityItem[] = rawRows.map((row: ScheduleActivityDbRow) => {
    const deadlineInfo = calculateDeadlineInfo(
      row.planned_finish,
      row.actual_finish,
      row.status,
      refDateUtc
    )

    return {
      id: row.id,
      project_id: row.project_id,
      activity_id: row.activity_id,
      description: row.description,
      discipline: row.discipline,
      asset: row.asset,
      location: row.location,
      planned_start: row.planned_start,
      planned_finish: row.planned_finish,
      actual_start: row.actual_start,
      actual_finish: row.actual_finish,
      status: row.status,
      ...deadlineInfo,
    }
  })

  return {
    success: true,
    data: formattedActivities,
    pagination: {
      page,
      limit,
      total: totalCount,
      total_pages: totalPages,
      has_more: page < totalPages,
    },
    summary,
    filters: {
      project_id: projectId,
      discipline,
      status,
      sort,
      reference_date: refDateIso,
    },
  }
}
