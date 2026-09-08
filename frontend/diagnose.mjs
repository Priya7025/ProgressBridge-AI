import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://jopmivqiwaaznuogczjl.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpvcG1pdnFpd2Fhem51b2djempsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODgxNzA0NjMsImV4cCI6MjEwMzc0NjQ2M30.qXCflu2_UxgL8d750xfa_CfI_lJPYgh83_a_SCGFdQM'

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

async function runDiagnosis() {
  console.log('=== STEP 1: DIAGNOSIS LOGS ===')

  // 1. Check user_profiles table
  const { data: profiles, error: profileErr } = await supabase
    .from('user_profiles')
    .select('*')
  console.log('User profiles:', JSON.stringify(profiles), profileErr)

  const activeProjectId = profiles?.[0]?.project_ids?.[0]
  console.log('Active project ID from user_profiles:', activeProjectId)

  // 2. Query review_queue
  const { data: reviewQueue, error: reviewErr } = await supabase
    .from('review_queue')
    .select('*')
  console.log('review_queue total count:', reviewQueue?.length, reviewErr)
  console.log('review_queue sample rows:', JSON.stringify(reviewQueue?.slice(0, 5)))

  // 3. Query review_queue filtered by project_id
  if (activeProjectId) {
    const { data: reviewQueueFiltered, error: reviewFilteredErr } = await supabase
      .from('review_queue')
      .select('*')
      .eq('project_id', activeProjectId)
    console.log(`review_queue rows for project_id=${activeProjectId}:`, reviewQueueFiltered?.length, reviewFilteredErr)
  }

  // 4. Query unmatched_queue
  const { data: unmatchedQueue, error: unmatchedErr } = await supabase
    .from('unmatched_queue')
    .select('*')
  console.log('unmatched_queue total count:', unmatchedQueue?.length, unmatchedErr)
  console.log('unmatched_queue sample rows:', JSON.stringify(unmatchedQueue?.slice(0, 5)))

  // 5. Query activity_matches
  const { data: activityMatches, error: matchesErr } = await supabase
    .from('activity_matches')
    .select('*')
  console.log('activity_matches total count:', activityMatches?.length, matchesErr)
}

runDiagnosis()
