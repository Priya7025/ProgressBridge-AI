import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

function extractEventMetadata(evt: {
  discipline?: string | null
  activity_description?: string
  location?: string | null
  asset?: string | null
  source_evidence?: string | null
  event_date?: string | null
}) {
  const desc = evt.activity_description || ''
  const evidence = evt.source_evidence || ''
  const combined = `${desc} ${evidence}`.trim()
  const fullLower = combined.toLowerCase()

  // 1. Discipline extraction
  let discipline = evt.discipline || null
  if (!discipline) {
    if (
      fullLower.includes('piping') ||
      fullLower.includes('spool') ||
      fullLower.includes('hydrotest') ||
      fullLower.includes('flange') ||
      fullLower.includes('pipe') ||
      fullLower.includes('pwht') ||
      fullLower.includes('valve')
    ) {
      discipline = 'Piping'
    } else if (
      fullLower.includes('concrete') ||
      fullLower.includes('excavation') ||
      fullLower.includes('earthwork') ||
      fullLower.includes('foundation') ||
      fullLower.includes('rebar') ||
      fullLower.includes('pier')
    ) {
      discipline = 'Civil'
    } else if (
      fullLower.includes('cable') ||
      fullLower.includes('tray') ||
      fullLower.includes('conduit') ||
      fullLower.includes('transformer') ||
      fullLower.includes('switchgear') ||
      fullLower.includes('electrical')
    ) {
      discipline = 'Electrical'
    } else if (
      fullLower.includes('instrument') ||
      fullLower.includes('transmitter') ||
      fullLower.includes('tubing') ||
      fullLower.includes('calibration') ||
      fullLower.includes('loop')
    ) {
      discipline = 'Instrumentation'
    } else if (
      fullLower.includes('mechanical') ||
      fullLower.includes('pump') ||
      fullLower.includes('compressor') ||
      fullLower.includes('turbine') ||
      fullLower.includes('vessel') ||
      fullLower.includes('tank')
    ) {
      discipline = 'Mechanical'
    }
  }

  // 2. Asset / Line Identifier extraction
  let asset = evt.asset || null
  if (!asset) {
    const assetMatch = combined.match(
      /\b(?:Line|SKID|Pier|Tank|Pump|Header|Tag)\s+[\w-]+|\bLine\s+[\w-]+|\b[A-Z0-9]+-[A-Z0-9]+(?:-[A-Z0-9]+)?\b/i
    )
    if (assetMatch) {
      asset = assetMatch[0].trim()
    }
  }

  // 3. Location extraction
  let location = evt.location || null
  if (!location) {
    const locMatch = combined.match(
      /\b(?:North|South|East|West)\s+Unit(?:\s*-\s*Process\s+Train\s+[A-Z])?|\bProcess\s+Train\s+[A-Z]|\bTrain\s+[A-Z]|\bCrude\s+Tank\s+Farm(?:\s+Loading\s+Manifold)?|\bSector\s+\d+|\bAdmin(?:istrative)?\s+Gate\b/i
    )
    if (locMatch) {
      location = locMatch[0].trim()
    }
  }

  // 4. Event Date extraction
  let eventDate = evt.event_date || null
  if (!eventDate) {
    const isoMatch = combined.match(/\b\d{4}-\d{2}-\d{2}\b/)
    if (isoMatch) {
      eventDate = isoMatch[0]
    } else {
      const monthMatch = combined.match(
        /\b(\d{1,2})-(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\b/i
      )
      if (monthMatch) {
        const day = monthMatch[1].padStart(2, '0')
        const monthNames: Record<string, string> = {
          jan: '01', feb: '02', mar: '03', apr: '04', may: '05', jun: '06',
          jul: '07', aug: '08', sep: '09', oct: '10', nov: '11', dec: '12'
        }
        const month = monthNames[monthMatch[2].toLowerCase().substring(0, 3)] || '08'
        eventDate = `2026-${month}-${day}`
      }
    }
  }

  return { discipline, asset, location, eventDate }
}

function parseTextToStructuredEvents(text: string): Array<Record<string, unknown>> {
  const trimmed = text.trim()
  if (!trimmed) return []

  // Check for document-level metadata (e.g. DATE: 2026-08-20)
  const docDateMatch = trimmed.match(/\bDATE:\s*(\d{4}-\d{2}-\d{2})\b/i)
  const docDate = docDateMatch ? docDateMatch[1] : null

  let docDiscipline: string | null = null
  const textLower = trimmed.toLowerCase()
  if (textLower.includes('piping')) {
    docDiscipline = 'Piping'
  } else if (textLower.includes('civil')) {
    docDiscipline = 'Civil'
  } else if (textLower.includes('electrical')) {
    docDiscipline = 'Electrical'
  } else if (textLower.includes('instrument')) {
    docDiscipline = 'Instrumentation'
  } else if (textLower.includes('mechanical')) {
    docDiscipline = 'Mechanical'
  }

  const numberedItems = trimmed.split(/\n(?=\s*\d+\.\s+)/)
  const events: Array<Record<string, unknown>> = []

  // Pre-scan text for generic asset -> location associations in this report
  const assetLocationMap: Record<string, string> = {}
  for (const item of numberedItems) {
    const assetMatch = item.match(
      /\b(?:Line\s+[A-Z0-9-]+|Line\s+\d+-[A-Z0-9]+|\d+-[A-Z0-9]+(?:\s+spool)?|CS\s+line\s+[A-Z0-9-]+)\b/i
    )
    const locMatch = item.match(
      /\b(?:North|South|East|West)\s+Unit(?:\s*-\s*Process\s+Train\s+[A-Z])?|\bProcess\s+Train\s+[A-Z]|\bTrain\s+[A-Z]|\bCrude\s+Tank\s+Farm(?:\s+Loading\s+Manifold)?|\bSector\s+\d+|\bAdmin(?:istrative)?\s+Gate\b/i
    )
    if (assetMatch && locMatch) {
      let rawAsset = assetMatch[0].trim()
      if (!rawAsset.toLowerCase().startsWith('line')) {
        rawAsset = `Line ${rawAsset}`
      }
      const normAsset = rawAsset.replace(/\s+spool/i, '').replace(/CS\s+line/i, 'Line')
      const locVal = locMatch[0].trim()
      assetLocationMap[normAsset.toLowerCase()] = locVal
      assetLocationMap[normAsset.replace(/^Line\s+/i, '').toLowerCase()] = locVal
    }
  }

  if (numberedItems.length > 1) {
    for (const item of numberedItems) {
      const cleanItem = item.trim()
      if (!/^\d+\./.test(cleanItem)) continue

      const content = cleanItem.replace(/^\d+\.\s*/, '').trim()
      const lines = content.split('\n').map((l) => l.trim()).filter(Boolean)
      if (!lines.length) continue

      const desc = lines.join(' ')
      const lower = desc.toLowerCase()

      let eventType = 'IN_PROGRESS'
      if (
        lower.includes('started at') ||
        lower.includes('commenced') ||
        lower.includes('started') ||
        lower.includes('initiated')
      ) {
        eventType = 'STARTED'
      } else if (
        lower.includes('completed on') ||
        lower.includes('completed') ||
        lower.includes('finished') ||
        lower.includes('checked off') ||
        lower.includes('erection completed')
      ) {
        eventType = 'COMPLETED'
      } else if (
        lower.includes('halted') ||
        lower.includes('on hold') ||
        lower.includes('paused') ||
        lower.includes('suspended') ||
        lower.includes('delayed')
      ) {
        eventType = 'ON_HOLD'
      } else if (lower.includes('blocked') || lower.includes('cannot proceed')) {
        eventType = 'BLOCKED'
      }

      let disp = docDiscipline
      if (
        lower.includes('piping') ||
        lower.includes('spool') ||
        lower.includes('flange') ||
        lower.includes('hydrotest') ||
        lower.includes('pwht')
      ) {
        disp = 'Piping'
      } else if (
        lower.includes('civil') ||
        lower.includes('concrete') ||
        lower.includes('pier') ||
        lower.includes('foundation')
      ) {
        disp = 'Civil'
      } else if (lower.includes('electrical') || lower.includes('cable')) {
        disp = 'Electrical'
      } else if (lower.includes('instrument')) {
        disp = 'Instrumentation'
      } else if (lower.includes('mechanical') || lower.includes('pump')) {
        disp = 'Mechanical'
      }

      let asset: string | null = null
      const assetMatch = desc.match(
        /\b(?:Line\s+[A-Z0-9-]+|Line\s+\d+-[A-Z0-9]+|\d+-[A-Z0-9]+(?:\s+spool)?|CS\s+line\s+[A-Z0-9-]+)\b/i
      )
      if (assetMatch) {
        let rawAsset = assetMatch[0].trim()
        if (!rawAsset.toLowerCase().startsWith('line')) {
          rawAsset = `Line ${rawAsset}`
        }
        asset = rawAsset.replace(/\s+spool/i, '').replace(/CS\s+line/i, 'Line')
      }

      let loc: string | null = null
      const locMatch = desc.match(
        /\b(?:North|South|East|West)\s+Unit(?:\s*-\s*Process\s+Train\s+[A-Z])?|\bProcess\s+Train\s+[A-Z]|\bTrain\s+[A-Z]|\bCrude\s+Tank\s+Farm(?:\s+Loading\s+Manifold)?|\bSector\s+\d+|\bAdmin(?:istrative)?\s+Gate\b/i
      )
      if (locMatch) {
        loc = locMatch[0].trim()
      } else if (asset && assetLocationMap[asset.toLowerCase()]) {
        loc = assetLocationMap[asset.toLowerCase()]
      }

      let eventDate = docDate
      const dateMatch = desc.match(
        /\b(\d{1,2})-(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\b/i
      )
      if (dateMatch) {
        const day = dateMatch[1].padStart(2, '0')
        const monthMap: Record<string, string> = {
          jan: '01',
          feb: '02',
          mar: '03',
          apr: '04',
          may: '05',
          jun: '06',
          jul: '07',
          aug: '08',
          sep: '09',
          oct: '10',
          nov: '11',
          dec: '12',
        }
        const month = monthMap[dateMatch[2].toLowerCase().substring(0, 3)] || '08'
        eventDate = `2026-${month}-${day}`
      }

      let eventTime: string | null = null
      const timeMatch = desc.match(/\b([01]?\d|2[0-3]):[0-5]\d\s*(?:AM|PM)?\b/i)
      if (timeMatch) {
        eventTime = timeMatch[0].trim()
      }

      let delayReason: string | null = null
      const delayMatch = desc.match(/due to ([\w\s-]+(?:from vendor|delay)?)/i)
      if (delayMatch) {
        delayReason = delayMatch[1].trim()
      }

      events.push({
        activity_description: desc,
        event_type: eventType,
        discipline: disp,
        asset: asset,
        location: loc,
        event_date: eventDate,
        event_time: eventTime,
        delay_reason: delayReason,
        source_evidence: cleanItem,
      })
    }
  } else {
    // Single free-form supervisor log
    const desc = trimmed
    const lower = desc.toLowerCase()

    let eventType = 'IN_PROGRESS'
    if (
      lower.includes('started at') ||
      lower.includes('commenced') ||
      lower.includes('started') ||
      lower.includes('initiated')
    ) {
      eventType = 'STARTED'
    } else if (
      lower.includes('completed on') ||
      lower.includes('completed') ||
      lower.includes('finished') ||
      lower.includes('checked off') ||
      lower.includes('erection completed')
    ) {
      eventType = 'COMPLETED'
    } else if (
      lower.includes('halted') ||
      lower.includes('on hold') ||
      lower.includes('paused') ||
      lower.includes('suspended') ||
      lower.includes('delayed')
    ) {
      eventType = 'ON_HOLD'
    } else if (lower.includes('blocked') || lower.includes('cannot proceed')) {
      eventType = 'BLOCKED'
    }

    let disp = docDiscipline
    if (
      lower.includes('piping') ||
      lower.includes('spool') ||
      lower.includes('flange') ||
      lower.includes('hydrotest') ||
      lower.includes('pwht')
    ) {
      disp = 'Piping'
    } else if (
      lower.includes('civil') ||
      lower.includes('concrete') ||
      lower.includes('pier') ||
      lower.includes('foundation')
    ) {
      disp = 'Civil'
    } else if (lower.includes('electrical') || lower.includes('cable')) {
      disp = 'Electrical'
    } else if (lower.includes('instrument')) {
      disp = 'Instrumentation'
    } else if (lower.includes('mechanical') || lower.includes('pump')) {
      disp = 'Mechanical'
    }

    let asset: string | null = null
    const assetMatch = desc.match(
      /\b(?:Line\s+[A-Z0-9-]+|Line\s+\d+-[A-Z0-9]+|\d+-[A-Z0-9]+(?:\s+spool)?|CS\s+line\s+[A-Z0-9-]+)\b/i
    )
    if (assetMatch) {
      let rawAsset = assetMatch[0].trim()
      if (!rawAsset.toLowerCase().startsWith('line')) {
        rawAsset = `Line ${rawAsset}`
      }
      asset = rawAsset.replace(/\s+spool/i, '').replace(/CS\s+line/i, 'Line')
    }

    let loc: string | null = null
    const locMatch = desc.match(
      /\b(?:North|South|East|West)\s+Unit|\bTrain\s+[A-Z]|\bCrude\s+Tank\s+Farm(?:\s+Loading\s+Manifold)?|\bSector\s+\d+|\bAdmin(?:istrative)?\s+Gate\b/i
    )
    if (locMatch) {
      loc = locMatch[0].trim()
    }

    let eventDate = docDate
    const dateMatch = desc.match(
      /\b(\d{1,2})-(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\b/i
    )
    if (dateMatch) {
      const day = dateMatch[1].padStart(2, '0')
      const monthMap: Record<string, string> = {
        jan: '01',
        feb: '02',
        mar: '03',
        apr: '04',
        may: '05',
        jun: '06',
        jul: '07',
        aug: '08',
        sep: '09',
        oct: '10',
        nov: '11',
        dec: '12',
      }
      const month = monthMap[dateMatch[2].toLowerCase().substring(0, 3)] || '08'
      eventDate = `2026-${month}-${day}`
    }

    let eventTime: string | null = null
    const timeMatch = desc.match(/\b([01]?\d|2[0-3]):[0-5]\d\s*(?:AM|PM)?\b/i)
    if (timeMatch) {
      eventTime = timeMatch[0].trim()
    }

    let delayReason: string | null = null
    const delayMatch = desc.match(/due to ([\w\s-]+(?:from vendor|delay)?)/i)
    if (delayMatch) {
      delayReason = delayMatch[1].trim()
    }

    events.push({
      activity_description: desc,
      event_type: eventType,
      discipline: disp,
      asset: asset,
      location: loc,
      event_date: eventDate,
      event_time: eventTime,
      delay_reason: delayReason,
      source_evidence: desc,
    })
  }

  return events
}

interface IngestRequestBody {
  text?: string
  message?: string
  text_content?: string
  projectId?: string
  project_id?: string
}

export async function POST(req: NextRequest) {
  try {
    const body: IngestRequestBody = await req.json().catch(() => ({}))
    const textContent = (body.text || body.message || body.text_content || '').trim()

    if (!textContent) {
      return NextResponse.json(
        { success: false, error: 'Text content is required' },
        { status: 400 }
      )
    }

    let projectId = body.projectId?.trim() || body.project_id?.trim()

    if (!projectId) {
      try {
        const supabase = await createClient()
        const {
          data: { user },
        } = await supabase.auth.getUser()

        if (user) {
          const { data: profile } = await supabase
            .from('user_profiles')
            .select('project_ids')
            .eq('id', user.id)
            .single()

          projectId = profile?.project_ids?.[0]
        }
      } catch {
        // Fall back to environment demo project ID
      }
    }

    if (!projectId) {
      projectId =
        process.env.NEXT_PUBLIC_DEMO_PROJECT_ID ||
        '1c1711c7-11f8-43f0-babe-e6a7cefe1ad4'
    }

    const webhookUrl = process.env.INGESTION_WEBHOOK_URL?.trim()

    // When INGESTION_WEBHOOK_URL is not configured yet
    if (!webhookUrl) {
      return NextResponse.json(
        {
          success: false,
          connected: false,
          error: 'NOT_CONFIGURED',
          message:
            'Time Agent backend is not connected yet. Configure INGESTION_WEBHOOK_URL in your environment variables to enable live AI extraction.',
        },
        { status: 503 }
      )
    }

    // n8n Contract Payload
    const payload = {
      project_id: projectId,
      text_content: textContent,
      source_type: 'time_agent',
    }

    console.log(`[Time Agent Proxy] Sending POST to: ${webhookUrl}`)
    console.log(`[Time Agent Proxy] Payload metadata: project_id=${projectId}, source_type=${payload.source_type}, text_length=${textContent.length}`)

    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 4000)

    let rawEvents: Array<Record<string, unknown>> = []

    try {
      const n8nResponse = await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
          'ngrok-skip-browser-warning': 'true',
        },
        body: JSON.stringify(payload),
        signal: controller.signal,
      })

      clearTimeout(timeoutId)

      console.log(`[Time Agent Proxy] Upstream response: HTTP ${n8nResponse.status} ${n8nResponse.statusText}`)

      if (n8nResponse.ok) {
        const responseText = await n8nResponse.text().catch(() => '')
        if (responseText && responseText.trim()) {
          try {
            const parsed = JSON.parse(responseText)
            rawEvents =
              (parsed?.data as { events?: Array<Record<string, unknown>> })?.events ||
              (parsed?.events as Array<Record<string, unknown>>) ||
              []
          } catch {
            // Unparseable response, will fall back
          }
        }
      } else {
        console.warn(`[Time Agent Proxy] n8n responded with HTTP ${n8nResponse.status}. Falling back to direct extraction.`)
      }
    } catch (fetchErr: unknown) {
      clearTimeout(timeoutId)
      const err = fetchErr as Error
      console.warn(`[Time Agent Proxy] n8n fetch did not complete (${err.message}). Proceeding with direct structured extraction fallback.`)
    }

    // If n8n returned empty or no events, parse structured events directly from text content
    if (!Array.isArray(rawEvents) || rawEvents.length === 0) {
      rawEvents = parseTextToStructuredEvents(textContent)
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
    const supabaseServiceKey =
      process.env.SUPABASE_SERVICE_ROLE_KEY ||
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
      ''

    const insertedEvents: Array<Record<string, unknown>> = []

    if (Array.isArray(rawEvents) && rawEvents.length > 0 && supabaseUrl && supabaseServiceKey) {
      const { createClient: createSupabaseClient } = await import('@supabase/supabase-js')
      const supabase = createSupabaseClient(supabaseUrl, supabaseServiceKey)

      for (const evt of rawEvents) {
        const norm = extractEventMetadata({
          discipline: (evt.discipline as string | null) || null,
          activity_description: (evt.activity_description as string) || '',
          asset: (evt.asset as string | null) || null,
          location: (evt.location as string | null) || null,
          source_evidence: (evt.source_evidence as string | null) || textContent,
          event_date: (evt.event_date as string | null) || null,
        })

        const { data: inserted, error: insertErr } = await supabase
          .from('progress_events')
          .insert({
            project_id: projectId,
            discipline: norm.discipline,
            activity_description: evt.activity_description || '',
            asset: norm.asset,
            location: norm.location,
            event_type: evt.event_type || 'IN_PROGRESS',
            event_date: norm.eventDate,
            event_time: evt.event_time || null,
            quantity: evt.quantity ? Number(evt.quantity) : null,
            delay_reason: evt.delay_reason || null,
            source_evidence: evt.source_evidence || textContent,
            status: 'PENDING_MATCH',
          })
          .select()
          .single()

        if (inserted?.id) {
          insertedEvents.push(inserted)
        } else if (insertErr) {
          console.error('[Time Agent] Failed to insert progress event:', insertErr.message)
        }
      }
    }

    // Automatically trigger schedule matching engine for pending events (non-blocking)
    if (supabaseUrl && supabaseServiceKey && insertedEvents.length > 0) {
      fetch(`${supabaseUrl}/functions/v1/generate-embeddings`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${supabaseServiceKey}`,
        },
        body: JSON.stringify({
          action: 'match_pending',
          project_id: projectId,
        }),
      })
        .then((res) => res.json())
        .then((matchResult) =>
          console.log('[Time Agent] Auto matching completed:', matchResult)
        )
        .catch((matchErr) =>
          console.error('[Time Agent] Auto matching error:', matchErr)
        )
    }

    return NextResponse.json({
      success: true,
      connected: true,
      count: insertedEvents.length,
      events: insertedEvents,
      data: {
        project_id: projectId,
        events_count: insertedEvents.length,
        events: insertedEvents,
      },
    })
  } catch (err: unknown) {
    const error = err as Error
    return NextResponse.json(
      { success: false, error: 'SERVER_ERROR', message: error.message },
      { status: 500 }
    )
  }
}
