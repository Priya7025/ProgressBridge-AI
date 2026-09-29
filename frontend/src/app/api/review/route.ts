import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createDirectClient } from '@supabase/supabase-js'

interface ReviewActionBody {
  action: 'ACCEPT' | 'REJECT' | 'MARK_REVIEWED'
  eventId: string
  matchId?: string | null
  userId?: string | null
}

export async function POST(req: NextRequest) {
  try {
    const body: ReviewActionBody = await req.json().catch(() => ({} as ReviewActionBody))
    const { action, eventId, matchId } = body

    if (!action || !eventId) {
      return NextResponse.json(
        { success: false, error: 'Missing required parameters: action and eventId' },
        { status: 400 }
      )
    }

    const serverSupabase = await createClient()

    // 1. Resolve User Session
    let userId = body.userId || null
    try {
      const { data: { user } } = await serverSupabase.auth.getUser()
      if (user) {
        userId = user.id
      }
    } catch {
      // Fall back to provided userId or null
    }

    // 2. Initialize privileged client for atomic updates
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
    const serviceKey =
      process.env.SUPABASE_SERVICE_ROLE_KEY ||
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
      ''

    const db = (supabaseUrl && serviceKey)
      ? createDirectClient(supabaseUrl, serviceKey)
      : serverSupabase

    const now = new Date().toISOString()

    // ──────────────────────────────────────────────────────────────────────────
    // ACTION 1: MARK UNMATCHED EVENT AS REVIEWED
    // ──────────────────────────────────────────────────────────────────────────
    if (action === 'MARK_REVIEWED') {
      // A. Update progress_events status to 'REJECTED' (closes it from unmatched queue)
      const { error: eventErr } = await db
        .from('progress_events')
        .update({ status: 'REJECTED' })
        .eq('id', eventId)

      if (eventErr) {
        console.error('[Review API] Error updating progress_events status to REJECTED:', eventErr.message)
        return NextResponse.json(
          { success: false, error: `Failed to mark event as reviewed: ${eventErr.message}` },
          { status: 500 }
        )
      }

      // B. If a candidate match row exists, update its status as well
      let currentMatchId = matchId
      if (!currentMatchId) {
        const { data: mRow } = await db
          .from('activity_matches')
          .select('id')
          .eq('event_id', eventId)
          .maybeSingle()
        currentMatchId = mRow?.id
      }

      if (currentMatchId) {
        await db
          .from('activity_matches')
          .update({
            match_status: 'REJECTED',
            reviewed_by: userId,
            reviewed_at: now,
          })
          .eq('id', currentMatchId)
      }

      // C. Record Audit Log entry
      await db.from('audit_log').insert({
        event_id: eventId,
        action: 'UNMATCHED_EVENT_REVIEWED',
        user_id: userId,
        comment: 'Planner reviewed and dismissed unmatched progress event.',
        new_value: {
          status: 'REJECTED',
          reviewed_at: now,
        },
      })

      return NextResponse.json({
        success: true,
        action: 'MARK_REVIEWED',
        eventId,
        message: 'Unmatched event marked as reviewed successfully.',
      })
    }

    // ──────────────────────────────────────────────────────────────────────────
    // ACTION 2: ACCEPT MATCH (MATCH_APPROVED)
    // ──────────────────────────────────────────────────────────────────────────
    if (action === 'ACCEPT') {
      let currentMatchId = matchId
      if (!currentMatchId) {
        const { data: mRow } = await db
          .from('activity_matches')
          .select('id')
          .eq('event_id', eventId)
          .maybeSingle()
        currentMatchId = mRow?.id
      }

      if (currentMatchId) {
        // Fetch match data
        const { data: matchData, error: fetchErr } = await db
          .from('activity_matches')
          .select('activity_id, event_id, progress_events (event_type, event_date, activity_description)')
          .eq('id', currentMatchId)
          .single()

        if (fetchErr) {
          return NextResponse.json(
            { success: false, error: `Failed to fetch match details: ${fetchErr.message}` },
            { status: 500 }
          )
        }

        // Update match status to APPROVED
        const { error: matchUpdateErr } = await db
          .from('activity_matches')
          .update({
            match_status: 'APPROVED',
            reviewed_by: userId,
            reviewed_at: now,
          })
          .eq('id', currentMatchId)

        if (matchUpdateErr) {
          return NextResponse.json(
            { success: false, error: `Failed to approve match: ${matchUpdateErr.message}` },
            { status: 500 }
          )
        }

        // Update schedule activity if linked
        if (matchData?.activity_id) {
          const rawEvents = matchData.progress_events
          const evt = Array.isArray(rawEvents) ? rawEvents[0] : rawEvents

          const updatePayload: Record<string, unknown> = {}
          const eventDate = evt?.event_date || now.split('T')[0]

          if (
            evt?.event_type === 'COMPLETED' ||
            evt?.activity_description?.toLowerCase().includes('completed')
          ) {
            updatePayload.status = 'COMPLETED'
            updatePayload.actual_finish = eventDate
          } else if (evt?.event_type === 'IN_PROGRESS' || evt?.event_type === 'STARTED') {
            updatePayload.status = 'IN_PROGRESS'
            updatePayload.actual_start = eventDate
          }

          if (Object.keys(updatePayload).length > 0) {
            await db
              .from('schedule_activities')
              .update(updatePayload)
              .eq('id', matchData.activity_id)
          }

          // Write audit log
          await db.from('audit_log').insert({
            event_id: matchData.event_id || eventId,
            activity_id: matchData.activity_id,
            action: 'MATCH_APPROVED',
            user_id: userId,
            comment: `Match approved by reviewer. Status updated to ${updatePayload.status || 'IN_PROGRESS'}.`,
            new_value: {
              status: updatePayload.status,
              actual_start: updatePayload.actual_start,
              actual_finish: updatePayload.actual_finish,
            },
          })
        }
      }

      // Update progress event status to MATCHED
      const { error: eventUpdateErr } = await db
        .from('progress_events')
        .update({ status: 'MATCHED' })
        .eq('id', eventId)

      if (eventUpdateErr) {
        return NextResponse.json(
          { success: false, error: `Failed to update event status: ${eventUpdateErr.message}` },
          { status: 500 }
        )
      }

      return NextResponse.json({
        success: true,
        action: 'ACCEPT',
        eventId,
        message: 'Match approved and schedule updated successfully.',
      })
    }

    // ──────────────────────────────────────────────────────────────────────────
    // ACTION 3: REJECT MATCH
    // ──────────────────────────────────────────────────────────────────────────
    if (action === 'REJECT') {
      if (matchId) {
        await db
          .from('activity_matches')
          .update({
            match_status: 'REJECTED',
            reviewed_by: userId,
            reviewed_at: now,
          })
          .eq('id', matchId)
      }

      const { error: eventUpdateErr } = await db
        .from('progress_events')
        .update({ status: 'REJECTED' })
        .eq('id', eventId)

      if (eventUpdateErr) {
        return NextResponse.json(
          { success: false, error: `Failed to reject event: ${eventUpdateErr.message}` },
          { status: 500 }
        )
      }

      await db.from('audit_log').insert({
        event_id: eventId,
        action: 'MATCH_REJECTED',
        user_id: userId,
        comment: 'Match rejected by reviewer.',
        new_value: { status: 'REJECTED' },
      })

      return NextResponse.json({
        success: true,
        action: 'REJECT',
        eventId,
        message: 'Match rejected successfully.',
      })
    }

    return NextResponse.json(
      { success: false, error: `Unsupported action: ${action}` },
      { status: 400 }
    )
  } catch (err: unknown) {
    const error = err as Error
    return NextResponse.json(
      { success: false, error: error.message || 'Server error processing review action' },
      { status: 500 }
    )
  }
}
