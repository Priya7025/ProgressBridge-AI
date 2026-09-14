/**
 * SERVER COMPONENT DATA FETCHING EXPLANATION:
 * ------------------------------------------
 * This `DashboardPage` is an async Next.js Server Component (rendered on the server).
 * 
 * Why is this different/simpler than the client-side pattern used in the login page?
 * 1. Direct `async/await` data fetching: Data is fetched directly inside the component body using `await`.
 *    No `useEffect`, `useState`, or client loading/error state boilerplate is required.
 * 2. No client waterfalls or loading flicker: Data fetching completes on the server before the final HTML is sent to the browser.
 * 3. Security & Performance: Supabase database queries run securely on the server with direct cookie authentication,
 *    reducing client JavaScript bundle size and avoiding public exposure of internal query logic.
 * 
 * In contrast, the login page uses `'use client'` because it handles interactive browser state, user input forms, and browser events.
 */

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { DisciplineChart, DisciplineProgressItem } from '@/components/dashboard/discipline-chart'

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

export default async function DashboardPage() {
  const supabase = await createClient()

  // 1. Get authenticated user
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // 2. Fetch user's profile & role from user_profiles table
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('role, project_ids')
    .eq('id', user.id)
    .single()

  // Route Guard: Supervisors are planner-only restricted from dashboard
  if (profile?.role === 'supervisor') {
    redirect('/time-agent')
  }

  const activeProjectId = profile?.project_ids?.[0] || '1c1711c7-11f8-43f0-babe-e6a7cefe1ad4'

  // 3. Fetch summary data, discipline progress, and activities with actual dates concurrently from Supabase
  const [summaryRes, disciplineRes, actualActivitiesRes] = await Promise.all([
    supabase
      .from('project_dashboard_summary')
      .select('*')
      .eq('project_id', activeProjectId)
      .maybeSingle(),
    supabase
      .from('project_discipline_progress')
      .select('*')
      .eq('project_id', activeProjectId),
    supabase
      .from('schedule_activities')
      .select('planned_finish, actual_finish')
      .eq('project_id', activeProjectId)
      .not('actual_finish', 'is', null)
      .not('planned_finish', 'is', null),
  ])

  // Functional zero-state logic: default to 0s if summary view is empty (0 activities)
  const summary: DashboardSummary = summaryRes.data ?? {
    project_id: activeProjectId,
    total_activities: 0,
    completed: 0,
    in_progress: 0,
    not_started: 0,
    delayed: 0,
    pending_review: 0,
    unmatched: 0,
  }

  // Calculate delayed count strictly from activities with recorded actual progress data
  const actualDelayedCount = (actualActivitiesRes.data ?? []).filter(
    (act) => act.actual_finish && act.planned_finish && act.actual_finish > act.planned_finish
  ).length

  summary.delayed = actualDelayedCount

  if (!summaryRes.data) {
    const [{ count: pendingCount }, { count: unmatchedCount }] = await Promise.all([
      supabase
        .from('progress_events')
        .select('*', { count: 'exact', head: true })
        .eq('project_id', activeProjectId)
        .eq('status', 'PENDING_REVIEW'),
      supabase
        .from('progress_events')
        .select('*', { count: 'exact', head: true })
        .eq('project_id', activeProjectId)
        .eq('status', 'UNMATCHED'),
    ])
    summary.pending_review = pendingCount ?? 0
    summary.unmatched = unmatchedCount ?? 0
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
