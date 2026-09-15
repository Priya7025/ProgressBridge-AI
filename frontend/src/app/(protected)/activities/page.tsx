import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import {
  ActivitiesListClient,
  ScheduleActivity,
} from '@/components/activities/activities-list-client'

export default async function ActivitiesPage() {
  const supabase = await createClient()

  // 1. Get current authenticated user session
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // 2. Query user_profiles table for role & project_ids
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('role, project_ids')
    .eq('id', user.id)
    .single()

  // 3. Route Guard: Supervisors are restricted from planner-only activities pages
  if (profile?.role === 'supervisor') {
    redirect('/time-agent')
  }

  const activeProjectId =
    profile?.project_ids?.[0] ||
    process.env.NEXT_PUBLIC_DEMO_PROJECT_ID ||
    '1c1711c7-11f8-43f0-babe-e6a7cefe1ad4'

  // 4. Fetch all schedule_activities rows for the project, ordered by activity_id
  const { data: activitiesData, error: activitiesErr } = await supabase
    .from('schedule_activities')
    .select('*')
    .eq('project_id', activeProjectId)
    .order('activity_id', { ascending: true })

  if (activitiesErr) {
    return (
      <div className="space-y-6 bg-[#000000] min-h-full p-4 sm:p-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight font-heading font-display text-[#e2bf29]">
            Activities
          </h1>
        </div>
        <div className="bg-[#111111] text-[#ffffff] border border-[#b71511]/50 rounded-lg p-8 text-center shadow-md">
          <p className="text-base font-semibold text-[#b71511]">
            Failed to load schedule activities
          </p>
          <p className="text-xs text-[#f1f2f3]/80 font-mono mt-1">
            {activitiesErr.message}
          </p>
        </div>
      </div>
    )
  }

  const activities = (activitiesData as ScheduleActivity[] | null) ?? []

  return <ActivitiesListClient initialActivities={activities} />
}
