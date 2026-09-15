import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

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
    const timeoutId = setTimeout(() => controller.abort(), 30000)

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

      if (!n8nResponse.ok) {
        const errorText = await n8nResponse.text().catch(() => '')
        console.error(`[Time Agent Proxy] Upstream error body preview:`, errorText.slice(0, 300))
        
        let userMessage = `n8n webhook responded with status ${n8nResponse.status}`
        if (errorText.includes('ERR_NGROK_3200') || errorText.includes('is offline')) {
          userMessage = `The ngrok tunnel is currently offline (ERR_NGROK_3200). Please start or restart ngrok on the machine running n8n (e.g., 'ngrok http 5678') and verify your INGESTION_WEBHOOK_URL.`
        }

        return NextResponse.json(
          {
            success: false,
            connected: false,
            error: 'WEBHOOK_HTTP_ERROR',
            status: n8nResponse.status,
            message: userMessage,
            detail: errorText,
          },
          { status: 502 }
        )
      }

      const responseText = await n8nResponse.text().catch(() => '')
      let responseData: Record<string, unknown> | null = null

      if (responseText && responseText.trim()) {
        try {
          responseData = JSON.parse(responseText)
        } catch {
          responseData = {
            message: responseText.trim(),
            raw: responseText,
          }
        }
      } else {
        responseData = {
          status: 'RECEIVED',
          message: 'Activity log received by n8n Time Agent webhook.',
          events: [],
        }
      }

      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
      const supabaseServiceKey =
        process.env.SUPABASE_SERVICE_ROLE_KEY ||
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
        ''

      // Ensure extracted events are saved to progress_events if returned directly by n8n
      const extractedEvents = (responseData?.data as { events?: Array<Record<string, unknown>> })?.events ||
        (responseData?.events as Array<Record<string, unknown>>) || []

      if (Array.isArray(extractedEvents) && extractedEvents.length > 0 && supabaseUrl && supabaseServiceKey) {
        const { createClient: createSupabaseClient } = await import('@supabase/supabase-js')
        const supabase = createSupabaseClient(supabaseUrl, supabaseServiceKey)

        for (const evt of extractedEvents) {
          if (!evt.id) {
            const { data: inserted } = await supabase
              .from('progress_events')
              .insert({
                project_id: projectId,
                discipline: evt.discipline || null,
                activity_description: evt.activity_description || '',
                asset: evt.asset || null,
                location: evt.location || null,
                event_type: evt.event_type || 'IN_PROGRESS',
                event_date: evt.event_date || null,
                event_time: evt.event_time || null,
                quantity: evt.quantity ? Number(evt.quantity) : null,
                delay_reason: evt.delay_reason || null,
                status: 'PENDING_MATCH',
              })
              .select()
              .single()

            if (inserted?.id) {
              evt.id = inserted.id
            }
          }
        }
      }

      // Automatically trigger schedule matching engine for pending events
      if (supabaseUrl && supabaseServiceKey) {
        try {
          const matchRes = await fetch(`${supabaseUrl}/functions/v1/generate-embeddings`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${supabaseServiceKey}`,
            },
            body: JSON.stringify({
              action: 'match_pending',
              project_id: projectId,
            }),
          })
          const matchResult = await matchRes.json().catch(() => null)
          console.log('[Time Agent] Auto matching completed:', matchResult)
        } catch (matchErr) {
          console.error('[Time Agent] Auto matching error:', matchErr)
        }
      }

      return NextResponse.json({
        success: true,
        connected: true,
        data: responseData,
      })
    } catch (fetchErr: unknown) {
      clearTimeout(timeoutId)
      const err = fetchErr as Error
      const isTimeout = err.name === 'AbortError' || err.name === 'TimeoutError'

      return NextResponse.json(
        {
          success: false,
          connected: false,
          error: isTimeout ? 'TIMEOUT' : 'NETWORK_ERROR',
          message: isTimeout
            ? 'n8n webhook timed out after 30 seconds.'
            : `Failed to connect to n8n webhook at ${webhookUrl}: ${err.message}`,
        },
        { status: 504 }
      )
    }
  } catch (err: unknown) {
    const error = err as Error
    return NextResponse.json(
      { success: false, error: 'SERVER_ERROR', message: error.message },
      { status: 500 }
    )
  }
}
