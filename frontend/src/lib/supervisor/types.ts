export type DeadlineState =
  | 'DUE_TODAY'
  | 'DUE_SOON'
  | 'OVERDUE'
  | 'UPCOMING'
  | 'COMPLETED'
  | 'NO_DEADLINE'

export interface DeadlineInfo {
  deadline_state: DeadlineState
  deadline_label: string
  days_diff: number | null
  days_remaining: number | null
  days_overdue: number | null
}

export interface ScheduleActivityDbRow {
  id: string
  project_id: string
  activity_id: string
  description: string
  discipline: string | null
  asset: string | null
  location: string | null
  planned_start: string | null
  planned_finish: string | null
  actual_start: string | null
  actual_finish: string | null
  status: string
}

export interface SupervisorActivityItem extends DeadlineInfo {
  id: string
  project_id: string
  activity_id: string
  description: string
  discipline: string | null
  asset: string | null
  location: string | null
  planned_start: string | null
  planned_finish: string | null
  actual_start: string | null
  actual_finish: string | null
  status: string
}

export interface SupervisorActivitySummary {
  total: number
  due_today: number
  due_soon: number
  overdue: number
  in_progress: number
  completed: number
  not_started: number
}

export type SupervisorActivitySort =
  | 'deadline_nearest'
  | 'deadline_farthest'
  | 'activity_name'
  | 'status'

export interface SupervisorActivitiesQueryParams {
  projectId?: string
  page?: number
  limit?: number
  discipline?: string
  status?: string
  sort?: SupervisorActivitySort | string
  search?: string
  referenceDate?: string
}

export interface SupervisorActivitiesResponse {
  success: boolean
  data: SupervisorActivityItem[]
  pagination: {
    page: number
    limit: number
    total: number
    total_pages: number
    has_more: boolean
  }
  summary?: SupervisorActivitySummary
  filters: {
    project_id: string
    discipline: string
    status: string
    sort: string
    reference_date: string
  }
  error?: string
}
