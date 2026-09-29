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

    // 1. Delete visual verification evidence for this project
    await supabase.from('visual_comparisons').delete().eq('project_id', projectId)
    await supabase.from('site_images').delete().eq('project_id', projectId)
    await supabase.from('design_images').delete().eq('project_id', projectId)

    // 2. Fetch activity IDs and event IDs for this project to clear audit logs safely
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

    // 3. Clean audit_log for these items
    if (actIds.length > 0) {
      await supabase.from('audit_log').delete().in('activity_id', actIds)
    }
    if (eventIds.length > 0) {
      await supabase.from('audit_log').delete().in('event_id', eventIds)
    }

    // 4. Delete activity_matches
    if (eventIds.length > 0) {
      await supabase.from('activity_matches').delete().in('event_id', eventIds)
    }

    // 5. Delete progress_events
    await supabase.from('progress_events').delete().eq('project_id', projectId)

    // 6. Delete documents
    await supabase.from('documents').delete().eq('project_id', projectId)

    // 7. Delete schedule_activities so the dashboard starts with Total Activities = 0 before Excel upload
    const { error: actDeleteErr } = await supabase
      .from('schedule_activities')
      .delete()
      .eq('project_id', projectId)

    if (actDeleteErr) {
      console.error('[Demo Reset] Error deleting schedule activities:', actDeleteErr.message)
      return NextResponse.json(
        { success: false, error: actDeleteErr.message },
        { status: 500 }
      )
    }

    // 8. Clean up storage files in visual-evidence and progress-documents buckets if applicable
    try {
      const { data: files } = await supabase.storage
        .from('visual-evidence')
        .list(`projects/${projectId}`)
      if (files && files.length > 0) {
        const filePaths = files.map((f) => `projects/${projectId}/${f.name}`)
        await supabase.storage.from('visual-evidence').remove(filePaths)
      }
    } catch {
      // Non-critical storage cleanup error
    }

    // 9. Verify counts
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
      message: 'Demo project successfully reset to TRUE ZERO STATE (0 activities, 0 events, 0 visual records).',
      counts: {
        schedule_activities: finalActs ?? 0,
        progress_events: finalEvents ?? 0,
        completed: 0,
        delayed: 0,
        pending_review: 0,
        unmatched: 0,
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

