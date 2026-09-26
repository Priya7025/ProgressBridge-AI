import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createDirectClient } from '@supabase/supabase-js'
import {
  getActivityVisualEvidence,
} from '@/lib/visual/db'

export async function GET(request: NextRequest) {
  try {
    let supabase = await createClient()
    const { searchParams } = new URL(request.url)

    const activityIdentifier =
      searchParams.get('activity_id') ||
      searchParams.get('activityId') ||
      searchParams.get('id')

    if (!activityIdentifier) {
      const errMsg = 'Bad Request: activity_id query parameter is required.'
      return NextResponse.json(
        { success: false, error: errMsg, message: errMsg },
        { status: 400 }
      )
    }

    // Check user auth or fallback to service client in demo mode
    let user = null
    try {
      const authRes = await supabase.auth.getUser()
      user = authRes.data.user
    } catch {
      // No active session
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

    const evidence = await getActivityVisualEvidence(supabase, activityIdentifier, projectId)

    if (!evidence) {
      const errMsg = `Activity '${activityIdentifier}' not found in project ${projectId}.`
      return NextResponse.json(
        {
          success: false,
          error: errMsg,
          message: errMsg,
        },
        { status: 404 }
      )
    }

    return NextResponse.json(
      {
        success: true,
        data: evidence,
      },
      {
        status: 200,
        headers: { 'Cache-Control': 'no-store, max-age=0' },
      }
    )
  } catch (err: unknown) {
    const error = err as Error
    const errMsg = error.message || 'Failed to fetch visual evidence'
    return NextResponse.json(
      { success: false, error: errMsg, message: errMsg },
      { status: 500 }
    )
  }
}
