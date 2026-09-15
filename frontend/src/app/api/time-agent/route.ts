import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}))
    const message = body.message || body.text_content

    if (!message || typeof message !== 'string' || !message.trim()) {
      return NextResponse.json(
        { error: 'Message is required and must be a non-empty string.' },
        { status: 400 }
      )
    }

    const supabase = await createClient()

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { data: profile } = await supabase
      .from('user_profiles')
      .select('project_ids')
      .eq('id', user.id)
      .single()

    const projectId = profile?.project_ids?.[0]

    if (!projectId) {
      return NextResponse.json(
        { error: 'No active project assigned to the current user.' },
        { status: 400 }
      )
    }

    const webhookUrl = process.env.INGESTION_WEBHOOK_URL

    if (!webhookUrl) {
      return NextResponse.json(
        { error: 'INGESTION_WEBHOOK_URL environment variable is missing.' },
        { status: 500 }
      )
    }

    try {
      const webhookRes = await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'ngrok-skip-browser-warning': 'true',
        },
        body: JSON.stringify({
          project_id: projectId,
          text_content: message.trim(),
          source_type: 'time_agent',
        }),
      })

      const responseText = await webhookRes.text()
      let webhookData: Record<string, unknown> | null = null
      if (responseText && responseText.trim()) {
        try {
          webhookData = JSON.parse(responseText)
        } catch {
          webhookData = { raw: responseText }
        }
      }

      if (!webhookRes.ok) {
        return NextResponse.json(
          webhookData || { error: `Extraction service returned status ${webhookRes.status}` },
          { status: webhookRes.status }
        )
      }

      return NextResponse.json(
        webhookData ?? {
          message: 'n8n workflow is currently INACTIVE. Please toggle the "Text Daily Report Ingestion Workflow" to Active in your n8n dashboard (or click "Execute workflow" in n8n) to enable Gemini extraction.',
        },
        { status: webhookRes.status }
      )
    } catch (fetchError: unknown) {
      console.error('Error reaching INGESTION_WEBHOOK_URL:', fetchError)
      return NextResponse.json(
        { error: 'Could not reach the extraction service. Please try again.' },
        { status: 502 }
      )
    }
  } catch (err: unknown) {
    console.error('Time Agent API Route error:', err)
    const errorMessage = err instanceof Error ? err.message : 'Internal server error'
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    )
  }
}

