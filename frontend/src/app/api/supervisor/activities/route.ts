import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createDirectClient } from '@supabase/supabase-js'
import { getSupervisorActivities } from '@/lib/supervisor/activities'
import { SupervisorActivitiesQueryParams } from '@/lib/supervisor/types'

export async function GET(request: NextRequest) {
  try {
    let supabase = await createClient()
    const { searchParams } = new URL(request.url)

    // 1. Resolve Auth & Project ID
    let user = null
    try {
      const authRes = await supabase.auth.getUser()
      user = authRes.data.user
    } catch {
      // No active session cookie
    }

    let projectId = searchParams.get('project_id') || searchParams.get('projectId') || undefined

    if (user) {
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('project_ids')
        .eq('id', user.id)
        .single()

      if (!projectId && profile?.project_ids?.length) {
        projectId = profile.project_ids[0]
      }
    } else {
      // In demo / fallback mode, use service role client if available to ensure live data access
      const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
      if (serviceKey && supabaseUrl) {
        supabase = createDirectClient(supabaseUrl, serviceKey)
      }
    }

    if (!projectId) {
      projectId =
        process.env.NEXT_PUBLIC_DEMO_PROJECT_ID ||
        '1c1711c7-11f8-43f0-babe-e6a7cefe1ad4'
    }

    // 2. Parse Query Parameters
    const queryParams: SupervisorActivitiesQueryParams = {
      projectId,
      page: searchParams.has('page') ? parseInt(searchParams.get('page')!, 10) : 1,
      limit: searchParams.has('limit')
        ? parseInt(searchParams.get('limit')!, 10)
        : searchParams.has('pageSize')
        ? parseInt(searchParams.get('pageSize')!, 10)
        : 20,
      discipline: searchParams.get('discipline') || undefined,
      status: searchParams.get('status') || undefined,
      sort: searchParams.get('sort') || undefined,
      search: searchParams.get('search') || searchParams.get('q') || undefined,
      referenceDate:
        searchParams.get('reference_date') ||
        searchParams.get('referenceDate') ||
        searchParams.get('current_date') ||
        undefined,
    }

    // 3. Fetch Paginated Supervisor Activities with Dynamic Deadline Calculations
    const result = await getSupervisorActivities(supabase, queryParams)

    if (!result.success) {
      const errMsg = result.error || 'Failed to fetch supervisor activities'
      return NextResponse.json(
        {
          success: false,
          error: errMsg,
          message: errMsg,
        },
        { status: 500 }
      )
    }

    return NextResponse.json(result, {
      status: 200,
      headers: {
        'Cache-Control': 'no-store, max-age=0',
      },
    })
  } catch (err: unknown) {
    const error = err as Error
    const errMsg = error.message || 'Failed to fetch supervisor activities'
    return NextResponse.json(
      {
        success: false,
        error: errMsg,
        message: errMsg,
      },
      { status: 500 }
    )
  }
}
