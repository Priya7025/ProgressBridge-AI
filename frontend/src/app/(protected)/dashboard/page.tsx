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

  const activeProjectId = profile?.project_ids?.[0]

  if (!activeProjectId) {
    return (
      <div className="space-y-8 p-4 sm:p-8 bg-[#000000] min-h-full">
        <div>
          <h2 className="text-2xl font-bold tracking-tight font-heading text-[#e2bf29]">
            Project Dashboard
          </h2>
          <p className="text-sm text-[#f1f2f3]/80 font-sans mt-1">
            Real-time activity progress & metrics summary
          </p>
        </div>
        <Card className="bg-[#111111] text-[#ffffff] border border-[#e2bf29]/30 rounded-lg p-10 text-center shadow-md">
          <CardContent className="space-y-2 pt-2">
            <p className="text-base font-semibold text-[#ffffff]">
              No active project assigned
            </p>
            <p className="text-xs text-[#f1f2f3]/70 font-sans max-w-md mx-auto">
              Your account currently has no project assigned. Please contact a project administrator to assign a project to your profile.
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  // 3. Fetch summary data & discipline progress concurrently from Supabase
  const [summaryRes, disciplineRes] = await Promise.all([
    supabase
      .from('project_dashboard_summary')
      .select('*')
      .eq('project_id', activeProjectId)
      .maybeSingle(),
    supabase
      .from('project_discipline_progress')
      .select('*')
      .eq('project_id', activeProjectId),
  ])

  // Database / API Error State
  if (summaryRes.error || disciplineRes.error) {
    const errorMsg = summaryRes.error?.message || disciplineRes.error?.message || 'Database query failed'
    return (
      <div className="space-y-8 p-4 sm:p-8 bg-[#000000] min-h-full">
        <div>
          <h2 className="text-2xl font-bold tracking-tight font-heading text-[#e2bf29]">
            Project Dashboard
          </h2>
        </div>
        <Card className="bg-[#111111] text-[#ffffff] border border-[#b71511]/50 rounded-lg p-8 text-center shadow-md">
          <CardContent className="space-y-2 pt-2">
            <p className="text-base font-semibold text-[#b71511]">
              Failed to load dashboard metrics
            </p>
            <p className="text-xs text-[#f1f2f3]/80 font-mono">
              {errorMsg}
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  const summary: DashboardSummary | null = summaryRes.data
  const disciplineData: DisciplineProgressItem[] | null = disciplineRes.data

  // Empty project data state (no summary recorded yet)
  if (!summary) {
    return (
      <div className="space-y-8 p-4 sm:p-8 bg-[#000000] min-h-full">
        <div>
          <h2 className="text-2xl font-bold tracking-tight font-heading text-[#e2bf29]">
            Project Dashboard
          </h2>
          <p className="text-sm text-[#f1f2f3]/80 font-sans mt-1">
            Real-time activity progress & metrics summary
          </p>
        </div>
        <Card className="bg-[#111111] text-[#ffffff] border border-[#e2bf29]/30 rounded-lg p-10 text-center shadow-md">
          <CardContent className="space-y-2 pt-2">
            <p className="text-base font-semibold text-[#ffffff]">
              No progress data yet for this project
            </p>
            <p className="text-xs text-[#f1f2f3]/70 font-sans max-w-md mx-auto">
              Once site updates or schedules are processed, activity progress metrics will appear here.
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  const kpis = [
    {
      title: 'Total Activities',
      value: typeof summary.total_activities === 'number' ? summary.total_activities : 0,
      accentClass: 'border-[#e2bf29]/30 hover:border-[#e2bf29]',
    },
    {
      title: 'Completed',
      value: typeof summary.completed === 'number' ? summary.completed : 0,
      accentClass: 'border-[#e2bf29]/30 hover:border-[#e2bf29]',
    },
    {
      title: 'Delayed',
      value: typeof summary.delayed === 'number' ? summary.delayed : 0,
      accentClass: 'border-l-4 border-l-[#b71511] text-[#b71511]',
    },
    {
      title: 'Pending Review',
      value: typeof summary.pending_review === 'number' ? summary.pending_review : 0,
      accentClass: 'border-l-4 border-l-[#337ab7] text-[#337ab7]',
    },
    {
      title: 'Unmatched',
      value: typeof summary.unmatched === 'number' ? summary.unmatched : 0,
      accentClass: 'border-[#e2bf29]/30 hover:border-[#e2bf29]',
    },
  ]

  return (
    <div className="space-y-8 p-8 bg-[#000000] min-h-full">
      <div>
        <h2 className="text-2xl font-bold tracking-tight font-heading font-sans font-['Helvetica_Neue',Helvetica,Arial,sans-serif] text-[#e2bf29]">
          Project Dashboard
        </h2>
        <p className="text-sm text-[#f1f2f3]/80 font-sans mt-1">
          Real-time activity progress & metrics summary
        </p>
      </div>

      {/* 5 KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6">
        {kpis.map((kpi) => (
          <Card
            key={kpi.title}
            className={`bg-[#111111] text-[#ffffff] border rounded-lg shadow-sm transition-colors ${kpi.accentClass}`}
          >
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium font-heading font-sans font-['Helvetica_Neue',Helvetica,Arial,sans-serif] uppercase tracking-wider text-[#f1f2f3]/70">
                {kpi.title}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold font-heading font-sans text-[#ffffff]">
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
        <Card className="bg-[#111111] text-[#ffffff] border border-[#e2bf29]/30 rounded-lg p-6 text-center text-[#f1f2f3]/70 font-sans shadow-sm">
          No discipline progress data recorded yet.
        </Card>
      )}
    </div>
  )
}
