'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
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
    <div className="space-y-6">
      {/* TAB HEADERS */}
      <div className="flex items-center gap-4 border-b border-[#e2bf29]/20 pb-1">
        <button
          type="button"
          onClick={() => setActiveTab('pending')}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-bold transition-all cursor-pointer border-b-2 -mb-1 ${
            activeTab === 'pending'
              ? 'border-[#e2bf29] text-[#e2bf29]'
              : 'border-transparent text-[#f1f2f3]/70 hover:text-white'
          }`}
        >
          <span>Pending Review</span>
          <span
            className={`px-2 py-0.5 text-xs font-mono rounded-full ${
              activeTab === 'pending'
                ? 'bg-[#e2bf29] text-[#111111]'
                : 'bg-[#111111] text-[#f1f2f3] border border-[#e2bf29]/30'
            }`}
          >
            {pendingItems.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('unmatched')}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-bold transition-all cursor-pointer border-b-2 -mb-1 ${
            activeTab === 'unmatched'
              ? 'border-[#e2bf29] text-[#e2bf29]'
              : 'border-transparent text-[#f1f2f3]/70 hover:text-white'
          }`}
        >
          <span>Unmatched</span>
          <span
            className={`px-2 py-0.5 text-xs font-mono rounded-full ${
              activeTab === 'unmatched'
                ? 'bg-[#e2bf29] text-[#111111]'
                : 'bg-[#111111] text-[#f1f2f3] border border-[#e2bf29]/30'
            }`}
          >
            {unmatchedItems.length}
          </span>
        </button>
      </div>

      {/* TAB CONTENT: PENDING REVIEW */}
      {activeTab === 'pending' && (
        <div className="space-y-6">
          {pendingItems.length === 0 ? (
            <Card className="bg-[#111111] text-[#ffffff] border border-[#e2bf29]/30 rounded-lg p-10 text-center shadow-md">
              <CardContent className="space-y-2 pt-2">
                <Sparkles className="size-8 text-[#e2bf29] mx-auto opacity-80" />
                <p className="text-base font-semibold text-[#ffffff]">
                  No pending activity matches
                </p>
                <p className="text-xs text-[#f1f2f3]/70 font-sans">
                  All extracted site progress updates have been processed or reviewed.
                </p>
              </CardContent>
            </Card>
          ) : (
            pendingItems.map((item) => (
              <Card
                key={item.event_id}
                className="bg-[#070707] text-[#ffffff] border border-[#e2bf29]/30 hover:border-[#e2bf29]/60 rounded-xl shadow-md overflow-hidden transition-all"
              >
                <CardHeader className="bg-[#111111] border-b border-[#e2bf29]/20 pb-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <FileText className="size-4 text-[#e2bf29] shrink-0" />
                      <span className="text-xs font-mono font-bold text-[#e2bf29]">
                        {item.source_filename || 'Site Log Entry'}
                      </span>
                    </div>
                    <ReviewItemActions
                      matchId={item.match_id}
                      eventId={item.event_id}
                      userId={userId}
                      mode="pending"
                    />
                  </div>
                </CardHeader>

                <CardContent className="p-5 space-y-5">
                  {/* SOURCE EVENT DETAILS */}
                  <div className="space-y-2">
                    <h4 className="text-xs font-bold font-heading uppercase text-[#e2bf29] tracking-wider">
                      Extracted Site Progress Event
                    </h4>
                    <p className="text-sm font-medium text-[#ffffff] leading-relaxed bg-[#111111] p-3 rounded-lg border border-[#26241b]">
                      "{item.activity_description}"
                    </p>
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-[#f1f2f3]/80 pt-1">
                      {item.discipline && (
                        <span>Discipline: <strong className="text-[#e2bf29]">{item.discipline}</strong></span>
                      )}
                      {item.event_type && (
                        <span>Event Type: <strong className="text-white">{item.event_type}</strong></span>
                      )}
                      {item.location && (
                        <span>Location: <strong className="text-white">{item.location}</strong></span>
                      )}
                      {item.asset && (
                        <span>Asset: <strong className="text-white">{item.asset}</strong></span>
                      )}
                      {item.event_date && (
                        <span>Date: <strong className="text-white">{item.event_date}</strong></span>
                      )}
                    </div>
                    {item.delay_reason && (
                      <p className="text-xs font-semibold text-[#b71511] bg-[#b71511]/10 border border-[#b71511]/30 p-2 rounded">
                        Stated Delay Reason: {item.delay_reason}
                      </p>
                    )}
                  </div>

                  {/* SUGGESTED MATCH & CONFIDENCE BREAKDOWN */}
                  <div className="space-y-3 pt-2 border-t border-[#26241b]">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-bold font-heading uppercase text-[#e2bf29] tracking-wider flex items-center gap-1.5">
                        <ArrowRight className="size-3.5" /> Suggested Schedule Activity Match
                      </h4>
                      {item.final_score !== null && (
                        <span className="text-xs font-mono font-bold px-2.5 py-0.5 bg-[#e2bf29] text-[#111111] rounded shadow-sm">
                          Overall Match: {formatScore(item.final_score)}
                        </span>
                      )}
                    </div>

                    <div className="bg-[#111111] border border-[#e2bf29]/30 rounded-lg p-4 space-y-3">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div>
                          <span className="font-mono text-xs font-bold text-[#e2bf29]">
                            {item.suggested_activity_code || 'UNASSIGNED'}
                          </span>
                          <h5 className="text-sm font-semibold text-white mt-0.5">
                            {item.suggested_description || 'No description matched'}
                          </h5>
                        </div>
                      </div>

                      {/* 4 SUB-SCORES GRID */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-[#26241b] text-xs">
                        <div className="bg-[#070707] p-2 rounded border border-[#26241b]">
                          <span className="text-[#f1f2f3]/60 block text-[11px]">Semantic</span>
                          <strong className="text-[#e2bf29] font-mono">{formatScore(item.semantic_score)}</strong>
                        </div>
                        <div className="bg-[#070707] p-2 rounded border border-[#26241b]">
                          <span className="text-[#f1f2f3]/60 block text-[11px]">Identifier</span>
                          <strong className="text-[#e2bf29] font-mono">{formatScore(item.identifier_score)}</strong>
                        </div>
                        <div className="bg-[#070707] p-2 rounded border border-[#26241b]">
                          <span className="text-[#f1f2f3]/60 block text-[11px]">Discipline</span>
                          <strong className="text-[#e2bf29] font-mono">{formatScore(item.discipline_score)}</strong>
                        </div>
                        <div className="bg-[#070707] p-2 rounded border border-[#26241b]">
                          <span className="text-[#f1f2f3]/60 block text-[11px]">Location</span>
                          <strong className="text-[#e2bf29] font-mono">{formatScore(item.location_score)}</strong>
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
        <div className="space-y-6">
          {unmatchedItems.length === 0 ? (
            <Card className="bg-[#111111] text-[#ffffff] border border-[#e2bf29]/30 rounded-lg p-10 text-center shadow-md">
              <CardContent className="space-y-2 pt-2">
                <Sparkles className="size-8 text-[#e2bf29] mx-auto opacity-80" />
                <p className="text-base font-semibold text-[#ffffff]">
                  No unmatched progress events
                </p>
                <p className="text-xs text-[#f1f2f3]/70 font-sans">
                  All logged site events successfully matched a schedule activity.
                </p>
              </CardContent>
            </Card>
          ) : (
            unmatchedItems.map((item) => (
              <Card
                key={item.event_id}
                className="bg-[#070707] text-[#ffffff] border border-[#e2bf29]/30 hover:border-[#e2bf29]/60 rounded-xl shadow-md overflow-hidden transition-all"
              >
                <CardHeader className="bg-[#111111] border-b border-[#e2bf29]/20 pb-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <AlertCircle className="size-4 text-[#b71511] shrink-0" />
                      <span className="text-xs font-mono font-bold text-[#e2bf29]">
                        {item.source_filename || 'Unmatched Event'}
                      </span>
                    </div>
                    <ReviewItemActions
                      eventId={item.event_id}
                      userId={userId}
                      mode="unmatched"
                    />
                  </div>
                </CardHeader>

                <CardContent className="p-5 space-y-4">
                  <div className="space-y-2">
                    <h4 className="text-xs font-bold font-heading uppercase text-[#e2bf29] tracking-wider">
                      Logged Site Progress Event
                    </h4>
                    <p className="text-sm font-medium text-[#ffffff] leading-relaxed bg-[#111111] p-3 rounded-lg border border-[#26241b]">
                      "{item.activity_description}"
                    </p>
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-[#f1f2f3]/80">
                      {item.discipline && (
                        <span>Discipline: <strong className="text-[#e2bf29]">{item.discipline}</strong></span>
                      )}
                      {item.event_type && (
                        <span>Type: <strong className="text-white">{item.event_type}</strong></span>
                      )}
                      {item.location && (
                        <span>Location: <strong className="text-white">{item.location}</strong></span>
                      )}
                      {item.event_date && (
                        <span>Date: <strong className="text-white">{item.event_date}</strong></span>
                      )}
                    </div>
                  </div>

                  {item.closest_activity_code && (
                    <div className="pt-3 border-t border-[#26241b] space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-[#f1f2f3]/70 italic">
                          Closest candidate (low confidence match):
                        </span>
                        {item.closest_score !== null && (
                          <span className="text-xs font-mono text-[#e2bf29]">
                            Score: {formatScore(item.closest_score)}
                          </span>
                        )}
                      </div>
                      <div className="bg-[#111111] p-3 rounded border border-[#26241b] text-xs">
                        <span className="font-mono font-bold text-[#e2bf29] mr-2">
                          {item.closest_activity_code}
                        </span>
                        <span className="text-white">{item.closest_description}</span>
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
