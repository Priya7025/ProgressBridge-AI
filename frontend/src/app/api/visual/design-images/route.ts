import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import {
  getDesignImagesByActivity,
  normalizeViewType,
  registerDesignImage,
  resolveActivity,
} from '@/lib/visual/db'
import { sanitizeFilename, validateImageFile } from '@/lib/visual/validation'

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

    const designImages = await getDesignImagesByActivity(supabaseAdmin, activity.id)

    return NextResponse.json(
      {
        success: true,
        activity,
        data: designImages,
        count: designImages.length,
      },
      {
        status: 200,
        headers: { 'Cache-Control': 'no-store, max-age=0' },
      }
    )
  } catch (err: unknown) {
    const error = err as Error
    const errMsg = error.message || 'Failed to list design images'
    return NextResponse.json(
      { success: false, error: errMsg, message: errMsg },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  let uploadedPathToCleanup: string | null = null
  const authClient = await createClient()
  const supabaseAdmin = createAdminClient()

  try {
    // 1. Verify Authentication
    let user = null
    try {
      const authRes = await authClient.auth.getUser()
      user = authRes.data.user
    } catch {
      // No session
    }

    const contentType = request.headers.get('content-type') || ''
    let projectId: string | undefined
    let activityIdentifier: string | undefined
    let viewType: string | undefined
    let file: File | null = null
    let preUploadedPath: string | undefined
    let rawFileName: string | undefined

    if (contentType.includes('multipart/form-data')) {
      const formData = await request.formData()
      file = formData.get('file') as File | null
      activityIdentifier = (formData.get('activity_id') || formData.get('activityId')) as string | undefined
      projectId = (formData.get('project_id') || formData.get('projectId')) as string | undefined
      viewType = (formData.get('view_type') || formData.get('viewType')) as string | undefined
      preUploadedPath = (formData.get('storage_path') || formData.get('storagePath')) as string | undefined
      rawFileName = file?.name || (formData.get('file_name') as string | undefined)
    } else {
      const body = await request.json().catch(() => ({}))
      activityIdentifier = body.activity_id || body.activityId
      projectId = body.project_id || body.projectId
      viewType = body.view_type || body.viewType
      preUploadedPath = body.storage_path || body.storagePath
      rawFileName = body.file_name || body.fileName
    }

    if (!activityIdentifier) {
      const errMsg = 'Bad Request: activity_id is required.'
      return NextResponse.json(
        { success: false, error: errMsg, message: errMsg },
        { status: 400 }
      )
    }

    // 2. Resolve User's Assigned Project & Check Role Permissions
    const cookieStore = await cookies()
    const cookieRole = cookieStore.get('pb_user_role')?.value

    let userRole = cookieRole
    if (user) {
      const { data: profile } = await supabaseAdmin
        .from('user_profiles')
        .select('project_ids, role')
        .eq('id', user.id)
        .single()

      if (!userRole && profile?.role) {
        userRole = profile.role
      }

      if (!projectId && profile?.project_ids?.length) {
        projectId = profile.project_ids[0]
      }
    }

    const effectiveRole = (userRole || '').toLowerCase()

    // Enforce: only planners can upload engineering design images
    if (effectiveRole === 'supervisor') {
      const errMsg = 'Forbidden: Only planners can upload engineering design images/drawings.'
      return NextResponse.json(
        {
          success: false,
          error: errMsg,
          message: errMsg,
        },
        { status: 403 }
      )
    }

    if (!projectId) {
      projectId =
        process.env.NEXT_PUBLIC_DEMO_PROJECT_ID ||
        '1c1711c7-11f8-43f0-babe-e6a7cefe1ad4'
    }

    // 3. Resolve Activity using admin client
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

    const normViewType = normalizeViewType(viewType, 'FRONT')
    let finalStoragePath = preUploadedPath
    let finalFileName = rawFileName ? sanitizeFilename(rawFileName) : undefined
    let finalFileSize: number | undefined
    let finalMimeType: string | undefined

    // 4. File Validation & Upload
    if (file && typeof file !== 'string') {
      const validation = validateImageFile(file)
      if (!validation.valid) {
        const errMsg = validation.error || 'Invalid image file'
        return NextResponse.json(
          { success: false, error: errMsg, message: errMsg },
          { status: 400 }
        )
      }

      finalFileName = validation.sanitizedFilename
      finalFileSize = file.size
      finalMimeType = validation.mimeType

      // 5. Prevent Duplicate Uploads for same Activity + View Type + Filename
      const { data: existingDesign } = await supabaseAdmin
        .from('design_images')
        .select('id, file_name, view_type, storage_path, created_at')
        .eq('activity_id', activity.id)
        .eq('view_type', normViewType)
        .eq('file_name', finalFileName)
        .maybeSingle()

      if (existingDesign) {
        const errMsg = `Conflict: A design image for view '${normViewType}' with filename '${finalFileName}' already exists for activity '${activity.activity_id}'.`
        return NextResponse.json(
          {
            success: false,
            error: errMsg,
            message: errMsg,
            duplicate: true,
            existing_id: existingDesign.id,
          },
          { status: 409 }
        )
      }

      // Safe isolated storage path: projects/{projectId}/activities/{activityId}/design/{timestamp}-{sanitizedFilename}
      const uniqueSuffix = `${Date.now()}-${Math.random().toString(36).substring(2, 8)}`
      finalStoragePath = preUploadedPath || `projects/${projectId}/activities/${activity.id}/design/${uniqueSuffix}-${finalFileName}`

      const arrayBuffer = await file.arrayBuffer()
      const fileBuffer = Buffer.from(arrayBuffer)

      // Use server-side service-role client for Storage upload
      const { error: uploadError } = await supabaseAdmin.storage
        .from('visual-evidence')
        .upload(finalStoragePath, fileBuffer, {
          contentType: finalMimeType,
          upsert: true,
        })

      if (uploadError) {
        const errMsg = `Storage Upload Failed: ${uploadError.message}`
        return NextResponse.json(
          { success: false, error: errMsg, message: errMsg },
          { status: 500 }
        )
      }

      // Track uploaded file for cleanup in case database write fails
      uploadedPathToCleanup = finalStoragePath
    } else if (preUploadedPath) {
      if (!finalFileName) {
        finalFileName = sanitizeFilename(preUploadedPath.split('/').pop() || 'design_image.png')
      }
    } else {
      const errMsg = 'Bad Request: Either a valid file or storage_path is required.'
      return NextResponse.json(
        { success: false, error: errMsg, message: errMsg },
        { status: 400 }
      )
    }

    // 6. Register Record in Database using admin client
    const result = await registerDesignImage(supabaseAdmin, {
      projectId,
      activityId: activity.id,
      storagePath: finalStoragePath!,
      viewType: normViewType,
      fileName: finalFileName,
      fileSize: finalFileSize,
      mimeType: finalMimeType,
      uploadedBy: user?.id,
    })

    if (!result.success || !result.data) {
      // Rollback uploaded storage file if database registration failed
      if (uploadedPathToCleanup) {
        try {
          await supabaseAdmin.storage.from('visual-evidence').remove([uploadedPathToCleanup])
        } catch (cleanupErr) {
          console.error('[Storage Cleanup Error]:', cleanupErr)
        }
      }

      const errMsg = result.error || 'Failed to register design image'
      return NextResponse.json(
        { success: false, error: errMsg, message: errMsg },
        { status: 500 }
      )
    }

    // 7. Auto-trigger AI comparison if matching site photo exists for this view type
    let comparisonResult = null
    try {
      const { data: matchingSite } = await supabaseAdmin
        .from('site_images')
        .select('*')
        .eq('activity_id', activity.id)
        .eq('view_type', normViewType)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      if (matchingSite) {
        const { compareDesignAndSiteImages } = await import('@/lib/visual/comparator')
        const compRes = await compareDesignAndSiteImages({
          projectId,
          activityId: activity.id,
          activityCode: activity.activity_id,
          activityDescription: activity.description,
          discipline: activity.discipline,
          location: activity.location,
          viewType: normViewType,
          designImage: result.data,
          siteImage: matchingSite,
          supabase: supabaseAdmin,
          forceRecompare: true,
        })
        if (compRes.success && compRes.data) {
          comparisonResult = compRes.data
        }
      }
    } catch (compErr) {
      console.error('[Auto Comparison Trigger Error on Design Upload]:', compErr)
    }

    return NextResponse.json(
      {
        success: true,
        activity,
        data: result.data,
        comparison: comparisonResult,
      },
      { status: 201 }
    )
  } catch (err: unknown) {
    if (uploadedPathToCleanup) {
      try {
        await supabaseAdmin.storage.from('visual-evidence').remove([uploadedPathToCleanup])
      } catch (cleanupErr) {
        console.error('[Storage Cleanup Exception]:', cleanupErr)
      }
    }

    const error = err as Error
    const errMsg = error.message || 'Failed to process design image upload'
    return NextResponse.json(
      { success: false, error: errMsg, message: errMsg },
      { status: 500 }
    )
  }
}
