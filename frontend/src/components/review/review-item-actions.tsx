'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Check, X, Loader2 } from 'lucide-react'

interface ReviewItemActionsProps {
  matchId?: string | null
  eventId: string
  userId: string
  mode: 'pending' | 'unmatched'
}

export function ReviewItemActions({
  matchId,
  eventId,
  userId,
  mode,
}: ReviewItemActionsProps) {
  const router = useRouter()
  const supabase = createClient()
  const [loading, setLoading] = useState<'accept' | 'reject' | 'mark' | null>(null)

  const handleAccept = async () => {
    setLoading('accept')
    try {
      const now = new Date().toISOString()
      let currentMatchId = matchId

      if (!currentMatchId) {
        const { data: mRow } = await supabase
          .from('activity_matches')
          .select('id')
          .eq('event_id', eventId)
          .maybeSingle()
        currentMatchId = mRow?.id
      }

      if (currentMatchId) {
        // Fetch the match details along with progress event date and type
        const { data: matchData } = await supabase
          .from('activity_matches')
          .select('activity_id, event_id, progress_events (event_type, event_date, activity_description)')
          .eq('id', currentMatchId)
          .single()

        await supabase
          .from('activity_matches')
          .update({
            match_status: 'APPROVED',
            reviewed_by: userId,
            reviewed_at: now,
          })
          .eq('id', currentMatchId)

        if (matchData?.activity_id) {
          const rawEvents = matchData.progress_events
          const evt = Array.isArray(rawEvents) ? rawEvents[0] : rawEvents

          const updatePayload: Record<string, unknown> = {}
          const eventDate = evt?.event_date || new Date().toISOString().split('T')[0]

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
            await supabase
              .from('schedule_activities')
              .update(updatePayload)
              .eq('id', matchData.activity_id)
          }

          // Explicit audit log record for activity details timeline
          await supabase.from('audit_log').insert({
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

      await supabase
        .from('progress_events')
        .update({ status: 'MATCHED' })
        .eq('id', eventId)

      router.refresh()
    } catch (err) {
      console.error('Error accepting match:', err)
    } finally {
      setLoading(null)
    }
  }

  const handleReject = async () => {
    setLoading('reject')
    try {
      const now = new Date().toISOString()
      if (matchId) {
        await supabase
          .from('activity_matches')
          .update({
            match_status: 'REJECTED',
            reviewed_by: userId,
            reviewed_at: now,
          })
          .eq('id', matchId)
      }

      await supabase
        .from('progress_events')
        .update({ status: 'REJECTED' })
        .eq('id', eventId)

      router.refresh()
    } catch (err) {
      console.error('Error rejecting match:', err)
    } finally {
      setLoading(null)
    }
  }

  const handleMarkReviewed = async () => {
    setLoading('mark')
    try {
      await supabase
        .from('progress_events')
        .update({ status: 'UNMATCHED' })
        .eq('id', eventId)

      router.refresh()
    } catch (err) {
      console.error('Error marking reviewed:', err)
    } finally {
      setLoading(null)
    }
  }

  if (mode === 'unmatched') {
    return (
      <Button
        size="sm"
        disabled={loading !== null}
        onClick={handleMarkReviewed}
        className="bg-[#111111] border border-[#e2bf29] text-[#e2bf29] hover:bg-[#e2bf29] hover:text-[#111111] font-bold transition-all text-xs h-7 sm:h-8 px-2.5 sm:px-3 cursor-pointer"
      >
        {loading === 'mark' ? (
          <Loader2 className="size-3.5 animate-spin mr-1" />
        ) : (
          <Check className="size-3.5 mr-1" />
        )}
        Mark Reviewed
      </Button>
    )
  }

  return (
    <div className="flex items-center gap-1.5 sm:gap-2">
      <Button
        size="sm"
        disabled={loading !== null}
        onClick={handleAccept}
        className="bg-[#e2bf29] text-[#111111] font-bold hover:bg-[#c9a720] shadow-[rgba(226,191,41,0.2)_0px_0px_8px] transition-all text-xs h-7 sm:h-8 px-2.5 sm:px-3.5 cursor-pointer"
      >
        {loading === 'accept' ? (
          <Loader2 className="size-3.5 animate-spin mr-1" />
        ) : (
          <Check className="size-3.5 mr-1" />
        )}
        Accept
      </Button>

      <Button
        size="sm"
        variant="outline"
        disabled={loading !== null}
        onClick={handleReject}
        className="border border-[#b71511] text-[#b71511] hover:bg-[#b71511]/15 font-bold transition-all text-xs h-7 sm:h-8 px-2 sm:px-3.5 cursor-pointer"
      >
        {loading === 'reject' ? (
          <Loader2 className="size-3.5 animate-spin mr-1" />
        ) : (
          <X className="size-3.5 mr-1" />
        )}
        Reject
      </Button>
    </div>
  )
}
