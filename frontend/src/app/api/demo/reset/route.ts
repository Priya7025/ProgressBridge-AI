import { NextRequest, NextResponse } from 'next/server'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}))
    const projectId =
      body.projectId?.trim() ||
      process.env.NEXT_PUBLIC_DEMO_PROJECT_ID ||
      '1c1711c7-11f8-43f0-babe-e6a7cefe1ad4'

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
    const supabaseKey =
      process.env.SUPABASE_SERVICE_ROLE_KEY ||
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
      ''

    const supabase = createSupabaseClient(supabaseUrl, supabaseKey)

    // 1. Fetch activity IDs and event IDs for this project to clear audit logs safely
    const { data: actRows } = await supabase
      .from('schedule_activities')
      .select('id')
      .eq('project_id', projectId)
    const actIds = (actRows || []).map((a) => a.id)

    const { data: eventRows } = await supabase
      .from('progress_events')
      .select('id')
      .eq('project_id', projectId)
    const eventIds = (eventRows || []).map((e) => e.id)

    // 2. Clean audit_log for these items
    if (actIds.length > 0) {
      await supabase.from('audit_log').delete().in('activity_id', actIds)
    }
    if (eventIds.length > 0) {
      await supabase.from('audit_log').delete().in('event_id', eventIds)
    }

    // 3. Delete activity_matches
    if (eventIds.length > 0) {
      await supabase.from('activity_matches').delete().in('event_id', eventIds)
    }

    // 4. Delete progress_events
    await supabase.from('progress_events').delete().eq('project_id', projectId)

    // 5. Delete documents
    await supabase.from('documents').delete().eq('project_id', projectId)

    // 6. Reset execution fields on schedule_activities (DO NOT delete activities or embeddings)
    const { error: actResetErr } = await supabase
      .from('schedule_activities')
      .update({
        actual_start: null,
        actual_finish: null,
        status: 'NOT_STARTED',
      })
      .eq('project_id', projectId)

    if (actResetErr) {
      return NextResponse.json(
        { success: false, error: actResetErr.message },
        { status: 500 }
      )
    }

    // 7. Verify counts
    const { count: finalActs } = await supabase
      .from('schedule_activities')
      .select('*', { count: 'exact', head: true })
      .eq('project_id', projectId)

    const { count: finalEvents } = await supabase
      .from('progress_events')
      .select('*', { count: 'exact', head: true })
      .eq('project_id', projectId)

    return NextResponse.json({
      success: true,
      project_id: projectId,
      message: 'Demo project successfully reset to TRUE ZERO STATE.',
      counts: {
        schedule_activities: finalActs ?? 0,
        progress_events: finalEvents ?? 0,
      },
    })
  } catch (err: unknown) {
    const error = err as Error
    return NextResponse.json(
      { success: false, error: error.message || 'Reset failed' },
      { status: 500 }
    )
  }
}
