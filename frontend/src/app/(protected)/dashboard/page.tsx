import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { DisciplineChart, DisciplineProgressItem } from '@/components/dashboard/discipline-chart'
import { SupervisorDashboardClient, ScheduleActivity } from '@/components/dashboard/supervisor-dashboard-client'

interface DashboardSummary {
  project_id: string
  total_activities: number
  completed: number
  in_progress?: number
  not_started?: number
  delayed: number
  pending_review: number
  unmatched: number
}

// Explicit columns excluding the heavy vector embedding column for 10x performance gains
const SCHEDULE_COLUMNS = 'id, project_id, activity_id, wbs, level, description, discipline, location, asset, planned_start, planned_finish, duration, status, actual_start, actual_finish, created_at, updated_at'

interface DashboardProps {
  searchParams?: Promise<{ role?: string }>
}

export default async function DashboardPage({ searchParams }: DashboardProps) {
  const supabase = await createClient()

  // 1. Concurrently fetch auth user, cookies, and searchParams
  const [authRes, cookieStore, resolvedSearchParams] = await Promise.all([
    supabase.auth.getUser(),
    cookies(),
    searchParams ? searchParams : Promise.resolve({} as { role?: string }),
  ])

  const user = authRes.data.user
  if (!user) {
    redirect('/login')
  }

  const sp = resolvedSearchParams || {}
  const cookieRole = cookieStore.get('pb_user_role')?.value

  // 2. Fetch user profile
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('role, project_ids')
    .eq('id', user.id)
    .maybeSingle()

  const userRole = sp.role || cookieRole || profile?.role || 'planner'
  const activeProjectId = profile?.project_ids?.[0] || '1c1711c7-11f8-43f0-babe-e6a7cefe1ad4'

  // 3. SUPERVISOR EXPERIENCE (Parallel fetch without heavy embedding column)
  if (userRole === 'supervisor') {
    const { data: activitiesData } = await supabase
      .from('schedule_activities')
      .select(SCHEDULE_COLUMNS)
      .eq('project_id', activeProjectId)
      .order('planned_finish', { ascending: true, nullsFirst: false })

    const activities = (activitiesData as ScheduleActivity[] | null) ?? []
    return <SupervisorDashboardClient activities={activities} />
  }

  // 4. PLANNER EXPERIENCE: Fetch all dashboard metric views concurrently in 1 Promise.all call
  const [disciplineRes, allActivitiesRes, pendingRes, unmatchedRes] = await Promise.all([
    supabase
      .from('project_discipline_progress')
      .select('*')
      .eq('project_id', activeProjectId),
    supabase
      .from('schedule_activities')
      .select('status, planned_finish, actual_finish')
      .eq('project_id', activeProjectId),
    supabase
      .from('progress_events')
      .select('id', { count: 'exact', head: true })
      .eq('project_id', activeProjectId)
      .eq('status', 'PENDING_REVIEW'),
    supabase
      .from('progress_events')
      .select('id', { count: 'exact', head: true })
      .eq('project_id', activeProjectId)
      .eq('status', 'UNMATCHED'),
  ])

  const activities = (allActivitiesRes.data || []) as {
    status: string | null
    planned_finish: string | null
    actual_finish: string | null
  }[]

  const totalActivities = activities.length
  const completedCount = activities.filter((act) => act.status === 'COMPLETED').length
  const delayedCount = activities.filter((act) => {
    // 1. Explicit DELAYED status from imported schedule
    if (act.status === 'DELAYED') return true
    // 2. Activity with actual finish past planned finish (e.g., PIP-2458 completed with delay)
    if (act.actual_finish && act.planned_finish && act.actual_finish > act.planned_finish) return true
    return false
  }).length

  const pendingCount = pendingRes.count ?? 0
  const unmatchedCount = unmatchedRes.count ?? 0

  const summary: DashboardSummary = {
    project_id: activeProjectId,
    total_activities: totalActivities,
    completed: completedCount,
    delayed: delayedCount,
    pending_review: pendingCount,
    unmatched: unmatchedCount,
  }

  const disciplineData: DisciplineProgressItem[] | null = disciplineRes.data

  const kpis = [
    {
      title: 'Total Activities',
      value: summary.total_activities ?? 0,
      accentClass: 'border-border/60 hover:border-primary',
    },
    {
      title: 'Completed',
      value: summary.completed ?? 0,
      accentClass: 'border-border/60 hover:border-primary',
    },
    {
      title: 'Delayed',
      value: summary.delayed ?? 0,
      accentClass: 'border-l-4 border-l-destructive text-destructive',
    },
    {
      title: 'Pending Review',
      value: summary.pending_review ?? 0,
      accentClass: 'border-l-4 border-l-accent text-accent',
    },
    {
      title: 'Unmatched',
      value: summary.unmatched ?? 0,
      accentClass: 'border-border/60 hover:border-primary',
    },
  ]

  return (
    <div className="space-y-6 sm:space-y-8 transition-colors duration-200">
      <div>
        <h2 className="text-xl sm:text-2xl font-bold tracking-tight font-heading font-sans text-primary">
          Project Dashboard
        </h2>
        <p className="text-xs sm:text-sm text-muted-foreground font-sans mt-1">
          Real-time activity progress & metrics summary
        </p>
      </div>

      {/* 5 KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 sm:gap-6">
        {kpis.map((kpi) => (
          <Card
            key={kpi.title}
            className={`bg-card text-card-foreground border rounded-xl shadow-sm transition-colors ${kpi.accentClass}`}
          >
            <CardHeader className="p-4 sm:p-6 pb-2">
              <CardTitle className="text-xs sm:text-sm font-medium font-heading font-sans uppercase tracking-wider text-muted-foreground">
                {kpi.title}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 sm:p-6 pt-0">
              <div className="text-2xl sm:text-3xl font-bold font-heading font-sans text-foreground">
                {kpi.value.toLocaleString()}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Recharts Discipline Progress Chart */}
      {disciplineData && disciplineData.length > 0 ? (
        <DisciplineChart data={disciplineData} />
      ) : (
        <Card className="bg-card text-card-foreground border border-border/60 rounded-xl p-6 text-center text-muted-foreground font-sans shadow-sm">
          No discipline progress data recorded yet.
        </Card>
      )}
    </div>
  )
}
