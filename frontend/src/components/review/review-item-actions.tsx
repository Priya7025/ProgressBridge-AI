'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Check, X, Loader2 } from 'lucide-react'

interface ReviewItemActionsProps {
  matchId?: string | null
  eventId: string
  userId: string
  mode: 'pending' | 'unmatched'
  onResolved?: (eventId: string, mode: 'pending' | 'unmatched') => void
}

export function ReviewItemActions({
  matchId,
  eventId,
  userId,
  mode,
  onResolved,
}: ReviewItemActionsProps) {
  const router = useRouter()
  const [loading, setLoading] = useState<'accept' | 'reject' | 'mark' | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const executeAction = async (action: 'ACCEPT' | 'REJECT' | 'MARK_REVIEWED') => {
    const loadingState = action === 'ACCEPT' ? 'accept' : action === 'REJECT' ? 'reject' : 'mark'
    setLoading(loadingState)
    setErrorMessage(null)

    try {
      const res = await fetch('/api/review', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action,
          eventId,
          matchId,
          userId,
        }),
      })

      const data = await res.json().catch(() => null)

      if (!res.ok || !data?.success) {
        throw new Error(data?.error || `Failed to perform action (${action})`)
      }

      // 1. Instantly notify parent component to remove from local state & update tab count
      if (onResolved) {
        onResolved(eventId, mode)
      }

      // 2. Refresh server data
      router.refresh()
    } catch (err: unknown) {
      console.error(`Error performing review action (${action}):`, err)
      const msg = err instanceof Error ? err.message : 'Action failed'
      setErrorMessage(msg)
    } finally {
      setLoading(null)
    }
  }

  const handleAccept = () => executeAction('ACCEPT')
  const handleReject = () => executeAction('REJECT')
  const handleMarkReviewed = () => executeAction('MARK_REVIEWED')

  if (mode === 'unmatched') {
    return (
      <div className="flex flex-col items-end gap-1">
        <Button
          size="sm"
          disabled={loading !== null}
          onClick={handleMarkReviewed}
          className="bg-muted border border-primary text-primary hover:bg-primary hover:text-primary-foreground font-bold transition-all text-xs h-7 sm:h-8 px-2.5 sm:px-3 cursor-pointer"
        >
          {loading === 'mark' ? (
            <Loader2 className="size-3.5 animate-spin mr-1" />
          ) : (
            <Check className="size-3.5 mr-1" />
          )}
          Mark Reviewed
        </Button>
        {errorMessage && (
          <span className="text-[11px] font-bold text-destructive">
            {errorMessage}
          </span>
        )}
      </div>
    )
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <div className="flex items-center gap-1.5 sm:gap-2">
        <Button
          size="sm"
          disabled={loading !== null}
          onClick={handleAccept}
          className="bg-primary text-primary-foreground font-bold hover:opacity-90 shadow-[rgba(226,191,41,0.2)_0px_0px_8px] transition-all text-xs h-7 sm:h-8 px-2.5 sm:px-3.5 cursor-pointer"
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
          className="border border-destructive text-destructive hover:bg-destructive/15 font-bold transition-all text-xs h-7 sm:h-8 px-2 sm:px-3.5 cursor-pointer"
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
        <span className="text-[11px] font-bold text-destructive">
          {errorMessage}
        </span>
      )}
    </div>
  )
}
