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
  const { data: activitiesData } = await supabase
    .from('schedule_activities')
    .select('*')
    .eq('project_id', activeProjectId)
    .order('activity_id', { ascending: true })

  const activities = (activitiesData as ScheduleActivity[] | null) ?? []

  return <ActivitiesListClient initialActivities={activities} />
}
