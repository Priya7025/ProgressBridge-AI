import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import {
  ReviewTabsClient,
  ReviewQueueItem,
  UnmatchedQueueItem,
} from '@/components/review/review-tabs-client'

export default async function ReviewPage() {
  // 1. Initialize Server Supabase Client (reads session cookies)
  const supabase = await createClient()

  // 2. Get current authenticated user
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // 3. Query user_profiles table for role & project_ids
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('role, project_ids')
    .eq('id', user.id)
    .single()

  // Route Guard: Supervisors are restricted from planner-only review page
  if (profile?.role === 'supervisor') {
    redirect('/time-agent')
  }

  const activeProjectId =
    profile?.project_ids?.[0] ||
    process.env.NEXT_PUBLIC_DEMO_PROJECT_ID ||
    '1c1711c7-11f8-43f0-babe-e6a7cefe1ad4'

  // 4. Concurrently query review_queue and unmatched_queue for activeProjectId
  const [reviewRes, unmatchedRes] = await Promise.all([
    supabase
      .from('review_queue')
      .select('*')
      .eq('project_id', activeProjectId),
    supabase
      .from('unmatched_queue')
      .select('*')
      .eq('project_id', activeProjectId),
  ])

  const pendingItems = (reviewRes.data as ReviewQueueItem[] | null) ?? []
  const unmatchedItems = (unmatchedRes.data as UnmatchedQueueItem[] | null) ?? []

  return (
    <div className="space-y-6 w-full transition-colors duration-200">
      <div>
        <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold tracking-tight font-heading text-primary">
          Activity Review
        </h1>
        <p className="text-xs sm:text-sm text-muted-foreground font-sans mt-1">
          Review extracted site progress updates & schedule activity matches
        </p>
      </div>

      <ReviewTabsClient
        pendingItems={pendingItems}
        unmatchedItems={unmatchedItems}
        userId={user.id}
      />
    </div>
  )
}
