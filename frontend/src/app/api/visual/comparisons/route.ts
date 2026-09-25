import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createDirectClient } from '@supabase/supabase-js'
import {
  getVisualComparisonsByActivity,
  resolveActivity,
  saveVisualComparison,
  updateVisualComparisonReview,
} from '@/lib/visual/db'
import { VisualComparisonStatus } from '@/lib/visual/types'

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

    // Resolve activity UUID & metadata
    const activity = await resolveActivity(supabase, activityIdentifier, projectId)
    if (!activity) {
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

    const comparisons = await getVisualComparisonsByActivity(supabase, activity.id)

    return NextResponse.json(
      {
        success: true,
        activity,
        data: comparisons,
        count: comparisons.length,
      },
      {
        status: 200,
        headers: { 'Cache-Control': 'no-store, max-age=0' },
      }
    )
  } catch (err: unknown) {
    const error = err as Error
    const errMsg = error.message || 'Failed to list visual comparisons'
    return NextResponse.json(
      { success: false, error: errMsg, message: errMsg },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    let supabase = await createClient()

    // 1. Verify Authentication or Server Role Fallback
    let user = null
    try {
      const authRes = await supabase.auth.getUser()
      user = authRes.data.user
    } catch {
      // No session
    }

    if (!user) {
      const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
      if (serviceKey && supabaseUrl) {
        supabase = createDirectClient(supabaseUrl, serviceKey)
      }
    }

    const body = await request.json().catch(() => ({}))
    const designImageId = body.design_image_id || body.designImageId
    const siteImageId = body.site_image_id || body.siteImageId
    const projectId = body.project_id || body.projectId
    const activityId = body.activity_id || body.activityId
    const viewMatchScore = body.view_match_score !== undefined ? Number(body.view_match_score) : undefined
    const visualSimilarity = body.visual_similarity !== undefined ? Number(body.visual_similarity) : undefined
    const completionState = body.completion_state || body.completionState
    const differences = body.differences
    const confidence = body.confidence !== undefined ? Number(body.confidence) : undefined
    const status = body.status || 'PENDING_REVIEW'
    const notes = body.notes

    if (!designImageId || !siteImageId) {
      const errMsg = 'Bad Request: Both design_image_id and site_image_id are required.'
      return NextResponse.json(
        {
          success: false,
          error: errMsg,
          message: errMsg,
        },
        { status: 400 }
      )
    }

    // 2. Execute Comparison Save / Upsert
    const result = await saveVisualComparison(supabase, {
      designImageId,
      siteImageId,
      projectId,
      activityId,
      viewMatchScore,
      visualSimilarity,
      completionState,
      differences,
      confidence,
      status,
      notes,
      reviewedBy: user?.id,
    })

    if (!result.success || !result.data) {
      const isConflict = result.error?.toLowerCase().includes('conflict')
      const errMsg = result.error || 'Failed to save visual comparison.'
      return NextResponse.json(
        { success: false, error: errMsg, message: errMsg },
        { status: isConflict ? 409 : 400 }
      )
    }

    return NextResponse.json(
      {
        success: true,
        data: result.data,
      },
      { status: 201 }
    )
  } catch (err: unknown) {
    const error = err as Error
    const errMsg = error.message || 'Failed to save visual comparison'
    return NextResponse.json(
      { success: false, error: errMsg, message: errMsg },
      { status: 500 }
    )
  }
}

export async function PATCH(request: NextRequest) {
  try {
    let supabase = await createClient()

    // 1. Verify Authentication & Role
    let user = null
    try {
      const authRes = await supabase.auth.getUser()
      user = authRes.data.user
    } catch {
      // No session
    }

    if (user) {
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('role')
        .eq('id', user.id)
        .single()

      // Only planners can verify, flag, or reject comparisons
      if (profile?.role === 'supervisor') {
        const errMsg = 'Forbidden: Only planners can review, verify, or reject visual comparisons.'
        return NextResponse.json(
          {
            success: false,
            error: errMsg,
            message: errMsg,
          },
          { status: 403 }
        )
      }
    } else {
      const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
      if (serviceKey && supabaseUrl) {
        supabase = createDirectClient(supabaseUrl, serviceKey)
      }
    }

    const body = await request.json().catch(() => ({}))
    const comparisonId = body.id || body.comparison_id || body.comparisonId
    const status = (body.status || '').toUpperCase() as VisualComparisonStatus
    const notes = body.notes

    if (!comparisonId) {
      const errMsg = 'Bad Request: comparison id is required.'
      return NextResponse.json(
        { success: false, error: errMsg, message: errMsg },
        { status: 400 }
      )
    }

    const validStatuses: VisualComparisonStatus[] = ['VERIFIED', 'FLAGGED', 'REJECTED', 'PENDING_REVIEW']
    if (!validStatuses.includes(status)) {
      const errMsg = `Bad Request: Invalid status '${status}'. Must be one of: ${validStatuses.join(', ')}.`
      return NextResponse.json(
        {
          success: false,
          error: errMsg,
          message: errMsg,
        },
        { status: 400 }
      )
    }

    // 2. Update Comparison Review Record
    const result = await updateVisualComparisonReview(supabase, {
      comparisonId,
      status,
      notes,
      reviewedBy: user?.id,
    })

    if (!result.success || !result.data) {
      const errMsg = result.error || 'Comparison not found or update failed.'
      return NextResponse.json(
        { success: false, error: errMsg, message: errMsg },
        { status: 404 }
      )
    }

    return NextResponse.json(
      {
        success: true,
        data: result.data,
      },
      { status: 200 }
    )
  } catch (err: unknown) {
    const error = err as Error
    const errMsg = error.message || 'Failed to update visual comparison'
    return NextResponse.json(
      { success: false, error: errMsg, message: errMsg },
      { status: 500 }
    )
  }
}
