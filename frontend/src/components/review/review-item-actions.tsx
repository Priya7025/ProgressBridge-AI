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
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const handleAccept = async () => {
    setLoading('accept')
    setErrorMessage(null)
    try {
      const now = new Date().toISOString()
      if (matchId) {
        const { error: matchErr } = await supabase
          .from('activity_matches')
          .update({
            match_status: 'APPROVED',
            reviewed_by: userId,
            reviewed_at: now,
          })
          .eq('id', matchId)

        if (matchErr) throw matchErr
      }

      const { error: eventErr } = await supabase
        .from('progress_events')
        .update({ status: 'MATCHED' })
        .eq('id', eventId)

      if (eventErr) throw eventErr

      router.refresh()
    } catch (err: unknown) {
      console.error('Error accepting match:', err)
      const msg = err instanceof Error ? err.message : 'Failed to accept match'
      setErrorMessage(msg)
    } finally {
      setLoading(null)
    }
  }

  const handleReject = async () => {
    setLoading('reject')
    setErrorMessage(null)
    try {
      const now = new Date().toISOString()
      if (matchId) {
        const { error: matchErr } = await supabase
          .from('activity_matches')
          .update({
            match_status: 'REJECTED',
            reviewed_by: userId,
            reviewed_at: now,
          })
          .eq('id', matchId)

        if (matchErr) throw matchErr
      }

      const { error: eventErr } = await supabase
        .from('progress_events')
        .update({ status: 'REJECTED' })
        .eq('id', eventId)

      if (eventErr) throw eventErr

      router.refresh()
    } catch (err: unknown) {
      console.error('Error rejecting match:', err)
      const msg = err instanceof Error ? err.message : 'Failed to reject match'
      setErrorMessage(msg)
    } finally {
      setLoading(null)
    }
  }

  const handleMarkReviewed = async () => {
    setLoading('mark')
    setErrorMessage(null)
    try {
      const { error: eventErr } = await supabase
        .from('progress_events')
        .update({ status: 'UNMATCHED' })
        .eq('id', eventId)

      if (eventErr) throw eventErr

      router.refresh()
    } catch (err: unknown) {
      console.error('Error marking reviewed:', err)
      const msg = err instanceof Error ? err.message : 'Failed to mark as reviewed'
      setErrorMessage(msg)
    } finally {
      setLoading(null)
    }
  }

  if (mode === 'unmatched') {
    return (
      <div className="flex flex-col items-end gap-1">
        <Button
          size="sm"
          disabled={loading !== null}
          onClick={handleMarkReviewed}
          className="bg-[#111111] border border-[#e2bf29] text-[#e2bf29] hover:bg-[#e2bf29] hover:text-[#111111] font-bold transition-all text-xs h-8 px-3 cursor-pointer"
        >
          {loading === 'mark' ? (
            <Loader2 className="size-3.5 animate-spin mr-1" />
          ) : (
            <Check className="size-3.5 mr-1" />
          )}
          Mark Reviewed
        </Button>
        {errorMessage && (
          <span className="text-[11px] font-bold text-[#b71511]">
            {errorMessage}
          </span>
        )}
      </div>
    )
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <div className="flex items-center gap-2">
        <Button
          size="sm"
          disabled={loading !== null}
          onClick={handleAccept}
          className="bg-[#e2bf29] text-[#111111] font-bold hover:bg-[#c9a720] shadow-[rgba(226,191,41,0.2)_0px_0px_8px] transition-all text-xs h-8 px-3.5 cursor-pointer"
        >
          {loading === 'accept' ? (
            <Loader2 className="size-3.5 animate-spin mr-1" />
          ) : (
            <Check className="size-3.5 mr-1" />
          )}
          Accept Match
        </Button>

        <Button
          size="sm"
          variant="outline"
          disabled={loading !== null}
          onClick={handleReject}
          className="border border-[#b71511] text-[#b71511] hover:bg-[#b71511]/15 font-bold transition-all text-xs h-8 px-3.5 cursor-pointer"
        >
          {loading === 'reject' ? (
            <Loader2 className="size-3.5 animate-spin mr-1" />
          ) : (
            <X className="size-3.5 mr-1" />
          )}
          Reject
        </Button>
      </div>
      {errorMessage && (
        <span className="text-[11px] font-bold text-[#b71511]">
          {errorMessage}
        </span>
      )}
    </div>
  )
}
