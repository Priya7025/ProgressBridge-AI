import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: Request) {
  try {
    const supabase = await createClient()

    // 1. Verify authenticated session
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized: User must be authenticated to upload files.' },
        { status: 401 }
      )
    }

    // 2. Parse form data
    const formData = await request.formData()
    const file = formData.get('file') as File | null
    const requestedProjectId = formData.get('project_id') as string | null

    if (!file || typeof file === 'string') {
      return NextResponse.json(
        { success: false, error: 'Bad Request: No file provided.' },
        { status: 400 }
      )
    }

    // 3. Validate file size and extension
    if (file.size === 0) {
      return NextResponse.json(
        { success: false, error: 'Bad Request: File cannot be empty.' },
        { status: 400 }
      )
    }

    const ext = file.name.split('.').pop()?.toLowerCase() || ''
    const allowedExtensions = ['xlsx', 'csv', 'txt', 'pdf']

    if (!allowedExtensions.includes(ext)) {
      return NextResponse.json(
        {
          success: false,
          error: `Unsupported file extension .${ext}. Allowed extensions are .xlsx, .csv, .txt, and .pdf.`,
        },
        { status: 400 }
      )
    }

    // 4. Resolve user's real project_id server-side
    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('project_ids, role')
      .eq('id', user.id)
      .single()

    if (profileError || !profile || !profile.project_ids || profile.project_ids.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Forbidden: No assigned projects found for your user profile.' },
        { status: 403 }
      )
    }

    let targetProjectId = profile.project_ids[0]
    if (requestedProjectId) {
      if (profile.project_ids.includes(requestedProjectId)) {
        targetProjectId = requestedProjectId
      } else {
        return NextResponse.json(
          { success: false, error: 'Forbidden: You are not assigned to the requested project.' },
          { status: 403 }
        )
      }
    }

    // 5. Map source_type and MIME type
    let sourceType: 'spreadsheet' | 'pdf' | 'daily_report' = 'daily_report'
    if (ext === 'xlsx' || ext === 'csv') {
      sourceType = 'spreadsheet'
    } else if (ext === 'pdf') {
      sourceType = 'pdf'
    } else if (ext === 'txt') {
      sourceType = 'daily_report'
    }

    const mimeType =
      file.type ||
      (ext === 'xlsx'
        ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        : ext === 'csv'
          ? 'text/csv'
          : ext === 'pdf'
            ? 'application/pdf'
            : 'text/plain')

    // Extract raw text for text/csv files if available
    let rawText: string | null = null
    if (ext === 'txt' || ext === 'csv') {
      try {
        rawText = await file.text()
      } catch {
        rawText = null
      }
    }

    // 6. Safe unique storage path
    const sanitizedFilename = file.name.replace(/[^a-zA-Z0-9_.-]/g, '_')
    const uniqueSuffix = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`
    const storagePath = `${targetProjectId}/${uniqueSuffix}-${sanitizedFilename}`

    // 7. Upload to Supabase Storage bucket `progress-documents`
    const arrayBuffer = await file.arrayBuffer()
    const fileBuffer = Buffer.from(arrayBuffer)

    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('progress-documents')
      .upload(storagePath, fileBuffer, {
        contentType: mimeType,
        upsert: false,
      })

    if (uploadError) {
      return NextResponse.json(
        { success: false, error: `Storage Upload Failed: ${uploadError.message}` },
        { status: 500 }
      )
    }

    // 8. Create document record in database
    const { data: docRecord, error: dbError } = await supabase
      .from('documents')
      .insert({
        project_id: targetProjectId,
        filename: file.name,
        source_type: sourceType,
        mime_type: mimeType,
        raw_text: rawText,
        storage_path: uploadData.path,
        uploaded_by: user.id,
      })
      .select()
      .single()

    if (dbError) {
      return NextResponse.json(
        { success: false, error: `Database Record Creation Failed: ${dbError.message}` },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      document: docRecord,
      message: 'File uploaded and document record created successfully.',
    })
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : 'An unexpected error occurred.'
    return NextResponse.json({ success: false, error: errorMessage }, { status: 500 })
  }
}
