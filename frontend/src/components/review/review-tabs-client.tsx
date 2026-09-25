'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { ReviewItemActions } from '@/components/review/review-item-actions'
import { FileText, Sparkles, AlertCircle, ArrowRight } from 'lucide-react'

export interface ReviewQueueItem {
  event_id: string
  project_id: string
  discipline: string | null
  activity_description: string
  asset: string | null
  location: string | null
  event_type: string | null
  event_date: string | null
  event_time: string | null
  delay_reason: string | null
  event_status: string
  match_id: string | null
  suggested_activity_id: string | null
  suggested_activity_code: string | null
  suggested_description: string | null
  semantic_score: number | null
  identifier_score: number | null
  discipline_score: number | null
  location_score: number | null
  final_score: number | null
  source_filename: string | null
  source_text: string | null
}

export interface UnmatchedQueueItem {
  event_id: string
  project_id: string
  discipline: string | null
  activity_description: string
  asset: string | null
  location: string | null
  event_type: string | null
  event_date: string | null
  event_time: string | null
  event_status: string
  closest_score: number | null
  closest_activity_code: string | null
  closest_description: string | null
  source_filename: string | null
  source_text: string | null
}

interface ReviewTabsClientProps {
  pendingItems: ReviewQueueItem[]
  unmatchedItems: UnmatchedQueueItem[]
  userId: string
}

function formatScore(score: number | null): string {
  if (score === null || score === undefined) return 'N/A'
  return `${(score * 100).toFixed(0)}%`
}

export function ReviewTabsClient({
  pendingItems,
  unmatchedItems,
  userId,
}: ReviewTabsClientProps) {
  const [activeTab, setActiveTab] = useState<'pending' | 'unmatched'>('pending')

  return (
    <div className="space-y-6 w-full">
      {/* TAB HEADERS */}
      <div className="flex items-center gap-2 sm:gap-4 border-b border-border/40 pb-1 overflow-x-auto">
        <button
          type="button"
          onClick={() => setActiveTab('pending')}
          className={`flex items-center gap-2 px-3 sm:px-4 py-2 text-xs sm:text-sm font-bold transition-all cursor-pointer border-b-2 -mb-1 whitespace-nowrap ${
            activeTab === 'pending'
              ? 'border-primary text-primary'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          <span>Pending Review</span>
          <span
            className={`px-2 py-0.5 text-xs font-mono rounded-full ${
              activeTab === 'pending'
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted text-foreground border border-border/60'
            }`}
          >
            {pendingItems.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('unmatched')}
          className={`flex items-center gap-2 px-3 sm:px-4 py-2 text-xs sm:text-sm font-bold transition-all cursor-pointer border-b-2 -mb-1 whitespace-nowrap ${
            activeTab === 'unmatched'
              ? 'border-primary text-primary'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          <span>Unmatched</span>
          <span
            className={`px-2 py-0.5 text-xs font-mono rounded-full ${
              activeTab === 'unmatched'
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted text-foreground border border-border/60'
            }`}
          >
            {unmatchedItems.length}
          </span>
        </button>
      </div>

      {/* TAB CONTENT: PENDING REVIEW */}
      {activeTab === 'pending' && (
        <div className="space-y-4 sm:space-y-6">
          {pendingItems.length === 0 ? (
            <Card className="bg-card text-card-foreground border border-border/60 rounded-xl p-6 sm:p-10 text-center shadow-sm">
              <CardContent className="space-y-2 pt-2">
                <Sparkles className="size-8 text-primary mx-auto opacity-80" />
                <p className="text-sm sm:text-base font-semibold text-foreground">
                  No pending activity matches
                </p>
                <p className="text-xs text-muted-foreground font-sans">
                  All extracted site progress updates have been processed or reviewed.
                </p>
              </CardContent>
            </Card>
          ) : (
            pendingItems.map((item) => (
              <Card
                key={item.event_id}
                className="bg-card text-card-foreground border border-border/60 hover:border-primary/80 rounded-xl shadow-sm overflow-hidden transition-all"
              >
                <CardHeader className="bg-muted/40 border-b border-border/40 p-3.5 sm:p-4 pb-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-2 min-w-0">
                      <FileText className="size-4 text-primary shrink-0" />
                      <span className="text-xs font-mono font-bold text-primary truncate">
                        {item.source_filename || 'Site Log Entry'}
                      </span>
                    </div>
                    <div className="shrink-0">
                      <ReviewItemActions
                        matchId={item.match_id}
                        eventId={item.event_id}
                        userId={userId}
                        mode="pending"
                      />
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="p-3.5 sm:p-5 space-y-4 sm:space-y-5">
                  {/* SOURCE EVENT DETAILS */}
                  <div className="space-y-2">
                    <h4 className="text-[11px] sm:text-xs font-bold font-heading uppercase text-primary tracking-wider">
                      Extracted Site Progress Event
                    </h4>
                    <p className="text-xs sm:text-sm font-medium text-foreground leading-relaxed bg-muted/60 p-2.5 sm:p-3 rounded-lg border border-border/40">
                      &ldquo;{item.activity_description}&rdquo;
                    </p>
                    <div className="flex flex-wrap items-center gap-x-3 sm:gap-x-4 gap-y-1 text-[11px] sm:text-xs text-muted-foreground pt-1">
                      {item.discipline && (
                        <span>Discipline: <strong className="text-primary">{item.discipline}</strong></span>
                      )}
                      {item.event_type && (
                        <span>Event Type: <strong className="text-foreground">{item.event_type}</strong></span>
                      )}
                      {item.location && (
                        <span>Location: <strong className="text-foreground">{item.location}</strong></span>
                      )}
                      {item.asset && (
                        <span>Asset: <strong className="text-foreground">{item.asset}</strong></span>
                      )}
                      {item.event_date && (
                        <span>Date: <strong className="text-foreground">{item.event_date}</strong></span>
                      )}
                    </div>
                    {item.delay_reason && (
                      <p className="text-xs font-semibold text-destructive bg-destructive/10 border border-destructive/30 p-2 rounded">
                        Stated Delay Reason: {item.delay_reason}
                      </p>
                    )}
                  </div>

                  {/* SUGGESTED MATCH & CONFIDENCE BREAKDOWN */}
                  <div className="space-y-3 pt-2 border-t border-border/40">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
                      <h4 className="text-[11px] sm:text-xs font-bold font-heading uppercase text-primary tracking-wider flex items-center gap-1.5">
                        <ArrowRight className="size-3.5 shrink-0" /> Suggested Schedule Activity Match
                      </h4>
                      {item.final_score !== null && (
                        <span className="text-[11px] sm:text-xs font-mono font-bold px-2 py-0.5 bg-primary text-primary-foreground rounded shadow-sm self-start sm:self-auto">
                          Overall Match: {formatScore(item.final_score)}
                        </span>
                      )}
                    </div>

                    <div className="bg-muted/40 border border-border/60 rounded-xl p-3 sm:p-4 space-y-3">
                      <div>
                        <span className="font-mono text-xs font-bold text-primary">
                          {item.suggested_activity_code || 'UNASSIGNED'}
                        </span>
                        <h5 className="text-xs sm:text-sm font-semibold text-foreground mt-0.5">
                          {item.suggested_description || 'No description matched'}
                        </h5>
                      </div>

                      {/* 4 SUB-SCORES GRID */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-border/40 text-xs">
                        <div className="bg-card p-2 rounded border border-border/50">
                          <span className="text-muted-foreground block text-[10px] sm:text-[11px]">Semantic</span>
                          <strong className="text-primary font-mono text-xs sm:text-sm">{formatScore(item.semantic_score)}</strong>
                        </div>
                        <div className="bg-card p-2 rounded border border-border/50">
                          <span className="text-muted-foreground block text-[10px] sm:text-[11px]">Identifier</span>
                          <strong className="text-primary font-mono text-xs sm:text-sm">{formatScore(item.identifier_score)}</strong>
                        </div>
                        <div className="bg-card p-2 rounded border border-border/50">
                          <span className="text-muted-foreground block text-[10px] sm:text-[11px]">Discipline</span>
                          <strong className="text-primary font-mono text-xs sm:text-sm">{formatScore(item.discipline_score)}</strong>
                        </div>
                        <div className="bg-card p-2 rounded border border-border/50">
                          <span className="text-muted-foreground block text-[10px] sm:text-[11px]">Location</span>
                          <strong className="text-primary font-mono text-xs sm:text-sm">{formatScore(item.location_score)}</strong>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      )}

      {/* TAB CONTENT: UNMATCHED */}
      {activeTab === 'unmatched' && (
        <div className="space-y-4 sm:space-y-6">
          {unmatchedItems.length === 0 ? (
            <Card className="bg-card text-card-foreground border border-border/60 rounded-xl p-6 sm:p-10 text-center shadow-sm">
              <CardContent className="space-y-2 pt-2">
                <Sparkles className="size-8 text-primary mx-auto opacity-80" />
                <p className="text-sm sm:text-base font-semibold text-foreground">
                  No unmatched progress events
                </p>
                <p className="text-xs text-muted-foreground font-sans">
                  All logged site events successfully matched a schedule activity.
                </p>
              </CardContent>
            </Card>
          ) : (
            unmatchedItems.map((item) => (
              <Card
                key={item.event_id}
                className="bg-card text-card-foreground border border-border/60 hover:border-primary/80 rounded-xl shadow-sm overflow-hidden transition-all"
              >
                <CardHeader className="bg-muted/40 border-b border-border/40 p-3.5 sm:p-4 pb-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-2 min-w-0">
                      <AlertCircle className="size-4 text-destructive shrink-0" />
                      <span className="text-xs font-mono font-bold text-primary truncate">
                        {item.source_filename || 'Unmatched Event'}
                      </span>
                    </div>
                    <div className="shrink-0">
                      <ReviewItemActions
                        eventId={item.event_id}
                        userId={userId}
                        mode="unmatched"
                      />
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="p-3.5 sm:p-5 space-y-3.5 sm:space-y-4">
                  <div className="space-y-2">
                    <h4 className="text-[11px] sm:text-xs font-bold font-heading uppercase text-primary tracking-wider">
                      Logged Site Progress Event
                    </h4>
                    <p className="text-xs sm:text-sm font-medium text-foreground leading-relaxed bg-muted/60 p-2.5 sm:p-3 rounded-lg border border-border/40">
                      &ldquo;{item.activity_description}&rdquo;
                    </p>
                    <div className="flex flex-wrap items-center gap-x-3 sm:gap-x-4 gap-y-1 text-[11px] sm:text-xs text-muted-foreground">
                      {item.discipline && (
                        <span>Discipline: <strong className="text-primary">{item.discipline}</strong></span>
                      )}
                      {item.event_type && (
                        <span>Type: <strong className="text-foreground">{item.event_type}</strong></span>
                      )}
                      {item.location && (
                        <span>Location: <strong className="text-foreground">{item.location}</strong></span>
                      )}
                      {item.event_date && (
                        <span>Date: <strong className="text-foreground">{item.event_date}</strong></span>
                      )}
                    </div>
                  </div>

                  {item.closest_activity_code && (
                    <div className="pt-3 border-t border-border/40 space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-muted-foreground italic">
                          Closest candidate (low confidence match):
                        </span>
                        {item.closest_score !== null && (
                          <span className="text-xs font-mono text-primary font-bold">
                            Score: {formatScore(item.closest_score)}
                          </span>
                        )}
                      </div>
                      <div className="bg-muted/40 p-2.5 sm:p-3 rounded-lg border border-border/40 text-xs">
                        <span className="font-mono font-bold text-primary mr-2">
                          {item.closest_activity_code}
                        </span>
                        <span className="text-foreground">{item.closest_description}</span>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))
          )}
        </div>
      )}
    </div>
  )
}
