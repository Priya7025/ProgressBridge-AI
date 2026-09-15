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

  const activeProjectId = profile?.project_ids?.[0]

  if (!activeProjectId) {
    return (
      <div className="space-y-6 bg-[#000000] min-h-full p-4 sm:p-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight font-heading text-[#e2bf29]">
            Activity Review
          </h1>
          <p className="text-sm text-[#f1f2f3]/80 font-sans mt-1">
            Review extracted site progress updates & schedule activity matches
          </p>
        </div>
        <ReviewTabsClient pendingItems={[]} unmatchedItems={[]} userId={user.id} />
      </div>
    )
  }

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

  if (reviewRes.error || unmatchedRes.error) {
    const errorMsg = reviewRes.error?.message || unmatchedRes.error?.message || 'Database query failed'
    return (
      <div className="space-y-6 bg-[#000000] min-h-full p-4 sm:p-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight font-heading text-[#e2bf29]">
            Activity Review
          </h1>
        </div>
        <div className="bg-[#111111] text-[#ffffff] border border-[#b71511]/50 rounded-lg p-8 text-center shadow-md">
          <p className="text-base font-semibold text-[#b71511]">
            Failed to load review items
          </p>
          <p className="text-xs text-[#f1f2f3]/80 font-mono mt-1">
            {errorMsg}
          </p>
        </div>
      </div>
    )
  }

  const pendingItems = (reviewRes.data as ReviewQueueItem[] | null) ?? []
  const unmatchedItems = (unmatchedRes.data as UnmatchedQueueItem[] | null) ?? []

  return (
    <div className="space-y-6 bg-[#000000] min-h-full p-4 sm:p-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight font-heading text-[#e2bf29]">
          Activity Review
        </h1>
        <p className="text-sm text-[#f1f2f3]/80 font-sans mt-1">
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
