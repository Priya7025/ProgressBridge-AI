import { NextRequest, NextResponse } from 'next/server'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'

interface CsvScheduleRow {
  project_id: string
  activity_id: string
  description: string
  discipline: string | null
  location: string | null
  asset: string | null
  planned_start: string | null
  planned_finish: string | null
  duration: number | null
  status: string
  wbs: string | null
}

function parseCSV(text: string): string[][] {
  const lines: string[][] = []
  let row: string[] = []
  let inQuotes = false
  let currentField = ''

  for (let i = 0; i < text.length; i++) {
    const char = text[i]
    const nextChar = text[i + 1]

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        currentField += '"'
        i++
      } else {
        inQuotes = !inQuotes
      }
    } else if (char === ',' && !inQuotes) {
      row.push(currentField.trim())
      currentField = ''
    } else if ((char === '\r' || char === '\n') && !inQuotes) {
      if (char === '\r' && nextChar === '\n') {
        i++
      }
      row.push(currentField.trim())
      currentField = ''
      if (row.length > 0 && row.some((f) => f.length > 0)) {
        lines.push(row)
      }
      row = []
    } else {
      currentField += char
    }
  }

  if (currentField.length > 0 || row.length > 0) {
    row.push(currentField.trim())
    if (row.some((f) => f.length > 0)) {
      lines.push(row)
    }
  }

  return lines
}

function normalizeDate(val: string | undefined): string | null {
  if (!val) return null
  const trimmed = val.trim()
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    const d = new Date(trimmed)
    if (!isNaN(d.getTime())) return trimmed
  }
  const d = new Date(trimmed)
  if (!isNaN(d.getTime())) {
    return d.toISOString().split('T')[0]
  }
  return null
}

function calculateDuration(startStr: string | null, endStr: string | null): number | null {
  if (!startStr || !endStr) return null
  const s = new Date(startStr).getTime()
  const e = new Date(endStr).getTime()
  if (isNaN(s) || isNaN(e)) return null
  const days = Math.round((e - s) / (1000 * 60 * 60 * 24)) + 1
  return days > 0 ? days : null
}

function normalizeStatus(statusStr: string | undefined): string {
  if (!statusStr) return 'NOT_STARTED'
  const upper = statusStr.trim().toUpperCase()
  if (upper === 'COMPLETED' || upper === 'IN_PROGRESS' || upper === 'NOT_STARTED' || upper === 'ON_HOLD') {
    return upper
  }
  if (upper === 'DELAYED') {
    return 'IN_PROGRESS'
  }
  return 'NOT_STARTED'
}

export async function POST(req: NextRequest) {
  try {
    let csvText = ''
    let filename = 'schedule.csv'
    let requestedProjectId = ''

    const contentType = req.headers.get('content-type') || ''
    if (contentType.includes('multipart/form-data')) {
      const formData = await req.formData()
      const file = formData.get('file') as File | null
      requestedProjectId = (formData.get('projectId') as string) || ''
      if (!file) {
        return NextResponse.json(
          { success: false, error: 'No file provided in form data' },
          { status: 400 }
        )
      }
      filename = file.name
      csvText = await file.text()
    } else {
      const body = await req.json().catch(() => ({}))
      csvText = body.csvText || ''
      filename = body.filename || 'schedule.csv'
      requestedProjectId = body.projectId || ''
    }

    if (!csvText || !csvText.trim()) {
      return NextResponse.json(
        { success: false, error: 'CSV text content is required' },
        { status: 400 }
      )
    }

    const projectId =
      requestedProjectId.trim() ||
      process.env.NEXT_PUBLIC_DEMO_PROJECT_ID ||
      '1c1711c7-11f8-43f0-babe-e6a7cefe1ad4'

    const rows = parseCSV(csvText)
    if (rows.length < 2) {
      return NextResponse.json(
        {
          success: false,
          error: 'CSV file contains no data rows (header only or empty)',
        },
        { status: 400 }
      )
    }

    const rawHeaders = rows[0]
    const headers = rawHeaders.map((h) => h.toLowerCase().trim().replace(/[\s_-]+/g, ''))

    const actIdIdx = headers.findIndex((h) => h === 'activityid' || h === 'actid' || h === 'id' || h === 'code')
    const descIdx = headers.findIndex((h) => h === 'description' || h === 'activitydescription' || h === 'desc' || h === 'name')
    const discIdx = headers.findIndex((h) => h === 'discipline' || h === 'trade' || h === 'department')
    const locIdx = headers.findIndex((h) => h === 'location' || h === 'area' || h === 'site')
    const assetIdx = headers.findIndex((h) => h === 'asset' || h === 'equipment' || h === 'line' || h === 'tag')
    const startIdx = headers.findIndex((h) => h === 'plannedstartdate' || h === 'plannedstart' || h === 'startdate' || h === 'start')
    const finishIdx = headers.findIndex((h) => h === 'plannedenddate' || h === 'plannedfinish' || h === 'enddate' || h === 'finish')
    const statusIdx = headers.findIndex((h) => h === 'status' || h === 'state')
    const wbsIdx = headers.findIndex((h) => h === 'wbscode' || h === 'wbs' || h === 'wbsnumber')

    if (actIdIdx === -1 || descIdx === -1) {
      return NextResponse.json(
        {
          success: false,
          error: `Missing required columns. Found headers: [${rawHeaders.join(', ')}]. 'activity_id' and 'description' are mandatory.`,
        },
        { status: 400 }
      )
    }

    const validRows: CsvScheduleRow[] = []
    const rejectedRows: { row_number: number; reason: string; row: string[] }[] = []
    const seenActivityIds = new Map<string, number>()
    const disciplineStats: Record<string, number> = {}

    for (let i = 1; i < rows.length; i++) {
      const row = rows[i]
      if (row.length === 0 || row.every((c) => c === '')) continue

      const actId = row[actIdIdx]?.trim()
      const desc = row[descIdx]?.trim()

      if (!actId) {
        rejectedRows.push({
          row_number: i + 1,
          reason: 'Missing activity_id',
          row,
        })
        continue
      }

      if (!desc) {
        rejectedRows.push({
          row_number: i + 1,
          reason: 'Missing description',
          row,
        })
        continue
      }

      const disc = discIdx !== -1 && row[discIdx] ? row[discIdx].trim() : null
      const loc = locIdx !== -1 && row[locIdx] ? row[locIdx].trim() : null
      const asset = assetIdx !== -1 && row[assetIdx] ? row[assetIdx].trim() : null
      const planStart = startIdx !== -1 ? normalizeDate(row[startIdx]) : null
      const planFinish = finishIdx !== -1 ? normalizeDate(row[finishIdx]) : null
      const status = statusIdx !== -1 ? normalizeStatus(row[statusIdx]) : 'NOT_STARTED'
      const wbs = wbsIdx !== -1 && row[wbsIdx] ? row[wbsIdx].trim() : null
      const duration = calculateDuration(planStart, planFinish)

      if (disc) {
        disciplineStats[disc] = (disciplineStats[disc] || 0) + 1
      }

      if (seenActivityIds.has(actId)) {
        seenActivityIds.set(actId, (seenActivityIds.get(actId) || 1) + 1)
      } else {
        seenActivityIds.set(actId, 1)
      }

      validRows.push({
        project_id: projectId,
        activity_id: actId,
        description: desc,
        discipline: disc,
        location: loc,
        asset: asset,
        planned_start: planStart,
        planned_finish: planFinish,
        duration: duration,
        status: status,
        wbs: wbs,
      })
    }

    const duplicates = Array.from(seenActivityIds.values()).filter((count) => count > 1).length

    // Initialize Supabase Client with service role if available for reliable bulk upserts
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
    const supabase = createSupabaseClient(supabaseUrl, supabaseKey)

    const BATCH_SIZE = 150
    let insertedCount = 0

    for (let i = 0; i < validRows.length; i += BATCH_SIZE) {
      const batch = validRows.slice(i, i + BATCH_SIZE)
      const { error: upsertErr } = await supabase
        .from('schedule_activities')
        .upsert(batch, {
          onConflict: 'project_id,activity_id',
          ignoreDuplicates: false,
        })

      if (upsertErr) {
        console.error(`[Schedule Upload] Batch error at offset ${i}:`, upsertErr.message)
        return NextResponse.json(
          {
            success: false,
            error: `Database insertion error: ${upsertErr.message}`,
            rows_processed_before_error: insertedCount,
          },
          { status: 500 }
        )
      }

      insertedCount += batch.length
    }

    return NextResponse.json({
      success: true,
      project_id: projectId,
      filename: filename,
      rows_read: rows.length - 1,
      rows_valid: validRows.length,
      rows_rejected: rejectedRows.length,
      rows_upserted: insertedCount,
      duplicates: duplicates,
      disciplines: disciplineStats,
      rejected_samples: rejectedRows.slice(0, 5),
      indexing: {
        status: 'READY',
        message: `${insertedCount} schedule activities stored and indexed in project ${projectId}.`,
      },
    })
  } catch (err: unknown) {
    const error = err as Error
    console.error('[Schedule Upload] Unhandled error:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
