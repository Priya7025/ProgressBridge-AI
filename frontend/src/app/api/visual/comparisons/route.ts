import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import {
  getVisualComparisonsByActivity,
  resolveActivity,
  saveVisualComparison,
  updateVisualComparisonReview,
} from '@/lib/visual/db'
import { VisualComparisonStatus } from '@/lib/visual/types'

export async function GET(request: NextRequest) {
  try {
    const authClient = await createClient()
    const supabaseAdmin = createAdminClient()
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

    // Check user auth or fallback in demo mode
    let user = null
    try {
      const authRes = await authClient.auth.getUser()
      user = authRes.data.user
    } catch {
      // No active session
    }

    let projectId = searchParams.get('project_id') || searchParams.get('projectId') || undefined

    if (user) {
      const { data: profile } = await supabaseAdmin
        .from('user_profiles')
        .select('project_ids')
        .eq('id', user.id)
        .single()

      if (!projectId && profile?.project_ids?.length) {
        projectId = profile.project_ids[0]
      }
    }

    if (!projectId) {
      projectId =
        process.env.NEXT_PUBLIC_DEMO_PROJECT_ID ||
        '1c1711c7-11f8-43f0-babe-e6a7cefe1ad4'
    }

    // Resolve activity UUID & metadata using server-side admin client
    const activity = await resolveActivity(supabaseAdmin, activityIdentifier, projectId)
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

    const comparisons = await getVisualComparisonsByActivity(supabaseAdmin, activity.id)

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
    const authClient = await createClient()
    const supabaseAdmin = createAdminClient()

    // 1. Verify Authentication
    let user = null
    try {
      const authRes = await authClient.auth.getUser()
      user = authRes.data.user
    } catch {
      // No session
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

    // 2. If trigger_ai is requested or metric scores are not manually provided, run AI comparator pipeline
    const shouldRunAi = body.trigger_ai || body.triggerAi || (confidence === undefined && visualSimilarity === undefined)

    if (shouldRunAi) {
      const [designRes, siteRes] = await Promise.all([
        supabaseAdmin.from('design_images').select('*').eq('id', designImageId).maybeSingle(),
        supabaseAdmin.from('site_images').select('*').eq('id', siteImageId).maybeSingle(),
      ])

      if (!designRes.data || !siteRes.data) {
        return NextResponse.json(
          {
            success: false,
            error: 'Not Found: Design image or site image not found.',
            message: 'Design image or site image not found.',
          },
          { status: 404 }
        )
      }

      const designImg = designRes.data
      const siteImg = siteRes.data

      const activity = await resolveActivity(supabaseAdmin, designImg.activity_id, projectId || designImg.project_id)
      const { compareDesignAndSiteImages } = await import('@/lib/visual/comparator')
      const compRes = await compareDesignAndSiteImages({
        projectId: projectId || designImg.project_id,
        activityId: designImg.activity_id,
        activityCode: activity?.activity_id || 'PIP-2458',
        activityDescription: activity?.description,
        discipline: activity?.discipline,
        location: activity?.location,
        viewType: designImg.view_type,
        designImage: designImg,
        siteImage: siteImg,
        supabase: supabaseAdmin,
        forceRecompare: true,
      })

      if (!compRes.success || !compRes.data) {
        return NextResponse.json(
          {
            success: false,
            error: compRes.error || 'Failed to generate visual comparison.',
            message: compRes.error || 'Failed to generate visual comparison.',
          },
          { status: 500 }
        )
      }

      return NextResponse.json(
        {
          success: true,
          data: compRes.data,
        },
        { status: 201 }
      )
    }

    // 3. Execute Direct Comparison Save / Upsert using admin client
    const result = await saveVisualComparison(supabaseAdmin, {
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
    const authClient = await createClient()
    const supabaseAdmin = createAdminClient()

    // 1. Verify Authentication & Role
    let user = null
    try {
      const authRes = await authClient.auth.getUser()
      user = authRes.data.user
    } catch {
      // No session
    }

    const cookieStore = await cookies()
    const cookieRole = cookieStore.get('pb_user_role')?.value

    let userRole = cookieRole
    if (user) {
      const { data: profile } = await supabaseAdmin
        .from('user_profiles')
        .select('role')
        .eq('id', user.id)
        .single()

      if (!userRole && profile?.role) {
        userRole = profile.role
      }
    }

    const effectiveRole = (userRole || '').toLowerCase()

    // Only planners can verify, flag, or reject comparisons
    if (effectiveRole === 'supervisor') {
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

    // 2. Update Comparison Review Record using admin client
    const result = await updateVisualComparisonReview(supabaseAdmin, {
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

