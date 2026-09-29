import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import {
  getSiteImagesByActivity,
  normalizeViewType,
  registerSiteImage,
  resolveActivity,
} from '@/lib/visual/db'
import {
  sanitizeFilename,
  validateCoordinates,
  validateImageFile,
  validateIsoDate,
} from '@/lib/visual/validation'

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

    const siteImages = await getSiteImagesByActivity(supabaseAdmin, activity.id)

    return NextResponse.json(
      {
        success: true,
        activity,
        data: siteImages,
        count: siteImages.length,
      },
      {
        status: 200,
        headers: { 'Cache-Control': 'no-store, max-age=0' },
      }
    )
  } catch (err: unknown) {
    const error = err as Error
    const errMsg = error.message || 'Failed to list site images'
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
    let rawCaptureDate: string | undefined
    let latitude: number | undefined
    let longitude: number | undefined
    let file: File | null = null
    let preUploadedPath: string | undefined
    let rawFileName: string | undefined

    if (contentType.includes('multipart/form-data')) {
      const formData = await request.formData()
      file = formData.get('file') as File | null
      activityIdentifier = (formData.get('activity_id') || formData.get('activityId')) as string | undefined
      projectId = (formData.get('project_id') || formData.get('projectId')) as string | undefined
      viewType = (formData.get('view_type') || formData.get('viewType')) as string | undefined
      rawCaptureDate = (formData.get('capture_date') || formData.get('captureDate')) as string | undefined
      const rawLat = formData.get('latitude')
      const rawLng = formData.get('longitude')
      if (rawLat !== null && rawLat !== undefined && rawLat !== '') latitude = parseFloat(rawLat.toString())
      if (rawLng !== null && rawLng !== undefined && rawLng !== '') longitude = parseFloat(rawLng.toString())
      preUploadedPath = (formData.get('storage_path') || formData.get('storagePath')) as string | undefined
      rawFileName = file?.name || (formData.get('file_name') as string | undefined)
    } else {
      const body = await request.json().catch(() => ({}))
      activityIdentifier = body.activity_id || body.activityId
      projectId = body.project_id || body.projectId
      viewType = body.view_type || body.viewType
      rawCaptureDate = body.capture_date || body.captureDate
      if (body.latitude !== undefined && body.latitude !== null) latitude = Number(body.latitude)
      if (body.longitude !== undefined && body.longitude !== null) longitude = Number(body.longitude)
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

    // 2. Validate capture date and coordinates
    const dateValidation = validateIsoDate(rawCaptureDate)
    if (!dateValidation.valid) {
      const errMsg = dateValidation.error || 'Invalid capture date'
      return NextResponse.json(
        { success: false, error: errMsg, message: errMsg },
        { status: 400 }
      )
    }
    const finalCaptureDate = dateValidation.date!

    const coordValidation = validateCoordinates(latitude, longitude)
    if (!coordValidation.valid) {
      const errMsg = coordValidation.error || 'Invalid coordinates'
      return NextResponse.json(
        { success: false, error: errMsg, message: errMsg },
        { status: 400 }
      )
    }

    // 3. Resolve User's Assigned Project and Enforce Role Permissions
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

    // Enforce: only supervisors can upload actual site execution photos
    if (effectiveRole === 'planner') {
      const errMsg = 'Forbidden: Only supervisors can upload site execution photos.'
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

    // 4. Resolve Activity using admin client
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

    const normViewType = normalizeViewType(viewType, 'OTHER')
    let finalStoragePath = preUploadedPath
    let finalFileName = rawFileName ? sanitizeFilename(rawFileName) : undefined
    let finalFileSize: number | undefined
    let finalMimeType: string | undefined

    // 5. File Validation & Upload
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

      // 6. Prevent Duplicate Uploads for same Activity + View Type + Filename + Capture Date
      const { data: existingSite } = await supabaseAdmin
        .from('site_images')
        .select('id, file_name, view_type, capture_date, storage_path, created_at')
        .eq('activity_id', activity.id)
        .eq('view_type', normViewType)
        .eq('file_name', finalFileName)
        .eq('capture_date', finalCaptureDate)
        .maybeSingle()

      if (existingSite) {
        const errMsg = `Conflict: A site photo for view '${normViewType}' with filename '${finalFileName}' on date '${finalCaptureDate}' is already registered for activity '${activity.activity_id}'.`
        return NextResponse.json(
          {
            success: false,
            error: errMsg,
            message: errMsg,
            duplicate: true,
            existing_id: existingSite.id,
          },
          { status: 409 }
        )
      }

      // Safe isolated storage path: projects/{projectId}/activities/{activityId}/site/{timestamp}-{sanitizedFilename}
      const uniqueSuffix = `${Date.now()}-${Math.random().toString(36).substring(2, 8)}`
      finalStoragePath = preUploadedPath || `projects/${projectId}/activities/${activity.id}/site/${uniqueSuffix}-${finalFileName}`

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
        finalFileName = sanitizeFilename(preUploadedPath.split('/').pop() || 'site_image.png')
      }
    } else {
      const errMsg = 'Bad Request: Either a valid file or storage_path is required.'
      return NextResponse.json(
        { success: false, error: errMsg, message: errMsg },
        { status: 400 }
      )
    }

    // 7. Register Record in Database using admin client
    const result = await registerSiteImage(supabaseAdmin, {
      projectId,
      activityId: activity.id,
      storagePath: finalStoragePath!,
      captureDate: finalCaptureDate,
      viewType: normViewType,
      fileName: finalFileName,
      fileSize: finalFileSize,
      mimeType: finalMimeType,
      latitude,
      longitude,
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

      const errMsg = result.error || 'Failed to register site photo'
      return NextResponse.json(
        { success: false, error: errMsg, message: errMsg },
        { status: 500 }
      )
    }

    // 8. Auto-trigger AI comparison if matching design drawing exists for this view type
    let comparisonResult = null
    try {
      const { data: matchingDesign } = await supabaseAdmin
        .from('design_images')
        .select('*')
        .eq('activity_id', activity.id)
        .eq('view_type', normViewType)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      if (matchingDesign) {
        const { compareDesignAndSiteImages } = await import('@/lib/visual/comparator')
        const compRes = await compareDesignAndSiteImages({
          projectId,
          activityId: activity.id,
          activityCode: activity.activity_id,
          activityDescription: activity.description,
          discipline: activity.discipline,
          location: activity.location,
          viewType: normViewType,
          designImage: matchingDesign,
          siteImage: result.data,
          supabase: supabaseAdmin,
          forceRecompare: true,
        })
        if (compRes.success && compRes.data) {
          comparisonResult = compRes.data
        }
      }
    } catch (compErr) {
      console.error('[Auto Comparison Trigger Error on Site Upload]:', compErr)
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
    const errMsg = error.message || 'Failed to process site photo upload'
    return NextResponse.json(
      { success: false, error: errMsg, message: errMsg },
      { status: 500 }
    )
  }
}
