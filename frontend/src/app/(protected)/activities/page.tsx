import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import {
  ActivitiesListClient,
  ScheduleActivity,
} from '@/components/activities/activities-list-client'

type SearchParamsObj = {
  page?: string
  search?: string
  discipline?: string
  status?: string
  sort?: string
}

interface SearchParamsProps {
  searchParams?: Promise<SearchParamsObj>
}

const SCHEDULE_COLUMNS = 'id, project_id, activity_id, wbs, level, description, discipline, location, asset, planned_start, planned_finish, duration, status, actual_start, actual_finish, created_at, updated_at'

export default async function ActivitiesPage({ searchParams }: SearchParamsProps) {
  const supabase = await createClient()

  // 1. Concurrently resolve auth user and searchParams
  const [authRes, resolvedSearchParams] = await Promise.all([
    supabase.auth.getUser(),
    searchParams ? searchParams : Promise.resolve({} as SearchParamsObj),
  ])

  const sp = resolvedSearchParams || {}

  const user = authRes.data.user
  if (!user) {
    redirect('/login')
  }

  // 2. Query user_profiles table for role & project_ids
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('role, project_ids')
    .eq('id', user.id)
    .maybeSingle()

  const activeProjectId =
    profile?.project_ids?.[0] ||
    process.env.NEXT_PUBLIC_DEMO_PROJECT_ID ||
    '1c1711c7-11f8-43f0-babe-e6a7cefe1ad4'

  const pageSize = 50
  const pageNum = Math.max(1, parseInt(sp.page || '1', 10))
  const from = (pageNum - 1) * pageSize
  const to = from + pageSize - 1

  // 3. Server-side paginated query excluding heavy vector embedding column
  let query = supabase
    .from('schedule_activities')
    .select(SCHEDULE_COLUMNS, { count: 'exact' })
    .eq('project_id', activeProjectId)

  if (sp.discipline && sp.discipline !== 'All') {
    query = query.ilike('discipline', sp.discipline)
  }

  if (sp.status && sp.status !== 'All') {
    query = query.eq('status', sp.status)
  }

  if (sp.search) {
    const s = sp.search.trim()
    if (s) {
      query = query.or(`activity_id.ilike.%${s}%,description.ilike.%${s}%`)
    }
  }

  if (sp.sort === 'deadline_nearest') {
    query = query.order('planned_finish', { ascending: true, nullsFirst: false })
  } else if (sp.sort === 'deadline_farthest') {
    query = query.order('planned_finish', { ascending: false, nullsFirst: false })
  } else {
    query = query.order('activity_id', { ascending: true })
  }

  query = query.range(from, to)

  const { data: activitiesData, count, error: activitiesErr } = await query

  if (activitiesErr) {
    return (
      <div className="space-y-6 bg-background min-h-full p-4 sm:p-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight font-heading text-primary">
            Activities
          </h1>
        </div>
        <div className="bg-card text-card-foreground border border-destructive/40 rounded-xl p-8 text-center shadow-md">
          <p className="text-base font-semibold text-destructive">
            Failed to load schedule activities
          </p>
          <p className="text-xs text-muted-foreground font-mono mt-1">
            {activitiesErr.message}
          </p>
        </div>
      </div>
    )
  }

  const activities = (activitiesData as ScheduleActivity[] | null) ?? []
  const totalCount = count ?? activities.length

  return (
    <ActivitiesListClient
      initialActivities={activities}
      totalCount={totalCount}
      currentPage={pageNum}
      pageSize={pageSize}
      initialDiscipline={sp.discipline || 'All'}
      initialStatus={sp.status || 'All'}
      initialSearch={sp.search || ''}
      initialSort={sp.sort || 'code'}
    />
  )
}
