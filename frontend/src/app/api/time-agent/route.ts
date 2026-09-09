import { NextRequest, NextResponse } from 'next/server'

interface IngestRequestBody {
  text?: string
  projectId?: string
}

export async function POST(req: NextRequest) {
  try {
    const body: IngestRequestBody = await req.json().catch(() => ({}))
    const textContent = body.text?.trim()
    const projectId =
      body.projectId?.trim() ||
      process.env.NEXT_PUBLIC_DEMO_PROJECT_ID ||
      '00000000-0000-0000-0000-000000000001'

    if (!textContent) {
      return NextResponse.json(
        { success: false, error: 'Text content is required' },
        { status: 400 }
      )
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
