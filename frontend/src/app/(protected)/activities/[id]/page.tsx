import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

interface ScheduleActivity {
  id: string
  project_id: string
  activity_id: string
  wbs: string | null
  level: string | null
  description: string
  discipline: string | null
  location: string | null
  asset: string | null
  planned_start: string | null
  planned_finish: string | null
  duration: number | null
  status: string
  actual_start: string | null
  actual_finish: string | null
  created_at: string
  updated_at: string
}

interface ProgressEvent {
  id: string
  project_id: string
  document_id: string | null
  discipline: string | null
  activity_description: string
  asset: string | null
  location: string | null
  event_type: string | null
  event_date: string | null
  event_time: string | null
  quantity: number | null
  delay_reason: string | null
  extraction_confidence: number | null
  status: string
  created_at: string
}

interface ActivityMatchWithEvent {
  id: string
  event_id: string
  activity_id: string | null
  semantic_score: number | null
  identifier_score: number | null
  discipline_score: number | null
  location_score: number | null
  final_score: number | null
  match_status: string
  reviewed_by: string | null
  reviewed_at: string | null
  created_at: string
  progress_events: ProgressEvent | ProgressEvent[] | null
}

interface AuditLogEntry {
  id: string
  event_id: string | null
  activity_id: string | null
  action: string
  old_value: Record<string, unknown> | null
  new_value: Record<string, unknown> | null
  user_id: string | null
  comment: string | null
  created_at: string
}

interface PageProps {
  params: Promise<{ id: string }> | { id: string }
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return 'Not yet recorded'
  const date = new Date(dateStr)
  if (isNaN(date.getTime())) return dateStr
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

function calculateDelayDays(plannedFinish: string | null, actualFinish: string | null): number | null {
  if (!plannedFinish || !actualFinish) return null
  const planned = new Date(plannedFinish).getTime()
  const actual = new Date(actualFinish).getTime()
  if (isNaN(planned) || isNaN(actual)) return null
  const diffTime = actual - planned
  return Math.round(diffTime / (1000 * 60 * 60 * 24))
}

function getStatusBadgeClass(status: string) {
  const normalized = status.toUpperCase()
  switch (normalized) {
    case 'DELAYED':
      return 'bg-[#b71511] text-white'
    case 'NOT_STARTED':
      return 'bg-[#1a1a1a] text-[#f1f2f3] border border-zinc-700'
    case 'IN_PROGRESS':
      return 'bg-[#337ab7] text-white'
    case 'COMPLETED':
      return 'bg-emerald-700 text-white'
    default:
      return 'bg-[#1a1a1a] text-[#ffffff] border border-[#e2bf29]/30'
  }
}

export default async function ActivityDetailsPage({ params }: PageProps) {
  const resolvedParams = await params
  const { id } = resolvedParams

  const supabase = await createClient()

  // Authenticated user check
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Route Guard: Supervisors are restricted from planner-only activities details
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role === 'supervisor') {
    redirect('/time-agent')
  }

  // 1. Fetch schedule_activity row by ID
  const { data: activityData } = await supabase
    .from('schedule_activities')
    .select('*')
    .eq('id', id)
    .maybeSingle()

  const activity = activityData as ScheduleActivity | null

  if (!activity) {
    return (
      <div className="p-8 space-y-4 bg-[#000000] min-h-full">
        <Card className="bg-[#111111] text-[#ffffff] border border-[#e2bf29] rounded-lg p-8 max-w-md mx-auto shadow-lg text-center">
          <CardTitle className="font-heading text-xl font-bold text-[#e2bf29]">Activity Not Found</CardTitle>
          <p className="text-sm text-[#f1f2f3]/80 mt-2 font-sans">
            No schedule activity exists for ID: {id}
          </p>
          <div className="pt-4">
            <Link
              href="/dashboard"
              className="inline-flex items-center justify-center px-4 py-2 text-sm font-bold bg-[#e2bf29] text-[#111111] rounded shadow-md hover:bg-[#c9a720] transition-colors"
            >
              Return to Dashboard
            </Link>
          </div>
        </Card>
      </div>
    )
  }

  // 2. Fetch linked activity_matches with progress_events & audit_log rows concurrently
  const [matchesRes, auditRes] = await Promise.all([
    supabase
      .from('activity_matches')
      .select(`
        *,
        progress_events (
          *
        )
      `)
      .eq('activity_id', id),
    supabase
      .from('audit_log')
      .select('*')
      .eq('activity_id', id)
      .order('created_at', { ascending: false }),
  ])

  const matches = (matchesRes.data as ActivityMatchWithEvent[] | null) ?? []
  const auditLogs = (auditRes.data as AuditLogEntry[] | null) ?? []

  const delayDays = calculateDelayDays(activity.planned_finish, activity.actual_finish)

  return (
    <div className="space-y-6 bg-[#000000] min-h-full p-2 sm:p-4">
      <Link
        href="/dashboard"
        className="text-sm font-bold text-[#e2bf29] hover:underline inline-flex items-center gap-1.5 transition-colors"
      >
        ← Back to Dashboard
      </Link>

      {/* 1. HEADER CARD */}
      <Card className="bg-[#111111] text-[#ffffff] border border-[#e2bf29]/40 rounded-lg shadow-sm">
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <span className="text-xs font-mono font-bold text-[#e2bf29] uppercase tracking-wide">
                {activity.activity_id}
              </span>
              <CardTitle className="font-heading text-2xl font-bold tracking-tight text-[#ffffff] mt-0.5">
                {activity.description}
              </CardTitle>
            </div>
            <div>
              <span
                className={`inline-block px-3 py-1 text-xs font-bold font-heading uppercase rounded ${getStatusBadgeClass(
                  activity.status
                )}`}
              >
                {activity.status.replace('_', ' ')}
              </span>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap items-center gap-2 pt-1">
            {activity.discipline && (
              <span className="text-xs font-bold font-heading uppercase bg-[#070707] border border-[#e2bf29]/30 text-[#e2bf29] px-2.5 py-1 rounded">
                DISCIPLINE: {activity.discipline}
              </span>
            )}
            {activity.location && (
              <span className="text-xs font-bold font-heading uppercase bg-[#070707] border border-[#e2bf29]/30 text-[#e2bf29] px-2.5 py-1 rounded">
                LOCATION: {activity.location}
              </span>
            )}
            {activity.wbs && (
              <span className="text-xs font-bold font-heading uppercase bg-[#070707] border border-[#e2bf29]/30 text-[#f1f2f3] px-2.5 py-1 rounded">
                WBS: {activity.wbs}
              </span>
            )}
          </div>
        </CardContent>
      </Card>

      {/* 2. PLANNED VS ACTUAL CARD */}
      <Card className="bg-[#111111] text-[#ffffff] border border-[#e2bf29]/40 rounded-lg shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-bold font-heading uppercase tracking-wider text-[#e2bf29]">
            PLANNED VS ACTUAL
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 pt-2">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-3 bg-[#070707] border border-[#e2bf29]/30 p-4 rounded">
              <h4 className="text-xs font-bold font-heading uppercase text-[#f1f2f3]/80 tracking-wider">
                Planned Schedule
              </h4>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <span className="text-xs text-[#f1f2f3]/60 block">Planned Start</span>
                  <span className="font-bold text-[#ffffff]">{formatDate(activity.planned_start)}</span>
                </div>
                <div>
                  <span className="text-xs text-[#f1f2f3]/60 block">Planned Finish</span>
                  <span className="font-bold text-[#ffffff]">{formatDate(activity.planned_finish)}</span>
                </div>
              </div>
              {activity.duration !== null && (
                <div className="text-xs text-[#f1f2f3]/70 pt-1 border-t border-[#26241b]">
                  Planned Duration: <span className="font-bold text-[#e2bf29]">{activity.duration} days</span>
                </div>
              )}
            </div>

            <div className="space-y-3 bg-[#070707] border border-[#e2bf29]/30 p-4 rounded">
              <h4 className="text-xs font-bold font-heading uppercase text-[#f1f2f3]/80 tracking-wider">
                Actual Schedule
              </h4>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <span className="text-xs text-[#f1f2f3]/60 block">Actual Start</span>
                  <span className="font-bold text-[#ffffff]">{formatDate(activity.actual_start)}</span>
                </div>
                <div>
                  <span className="text-xs text-[#f1f2f3]/60 block">Actual Finish</span>
                  <span className="font-bold text-[#ffffff]">{formatDate(activity.actual_finish)}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="pt-2 border-t border-[#26241b]">
            <div className="flex items-center justify-between text-sm">
              <span className="text-xs font-bold font-heading uppercase text-[#f1f2f3]/70">
                Schedule Variance:
              </span>
              {delayDays !== null ? (
                delayDays > 0 ? (
                  <span className="font-bold text-[#b71511] font-heading">
                    +{delayDays} days delay
                  </span>
                ) : (
                  <span className="font-bold text-emerald-400 font-heading">
                    {delayDays === 0 ? '0 days delay (On Schedule)' : `${Math.abs(delayDays)} days ahead`}
                  </span>
                )
              ) : (
                <span className="text-xs text-[#f1f2f3]/60 italic">
                  Not yet recorded
                </span>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 3. SOURCE REPORTS CARD */}
      <Card className="bg-[#111111] text-[#ffffff] border border-[#e2bf29]/40 rounded-lg shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-bold font-heading uppercase tracking-wider text-[#e2bf29]">
            SOURCE REPORTS
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-2">
          {matches.length > 0 ? (
            <div className="space-y-3">
              {matches.map((match) => {
                const event = Array.isArray(match.progress_events)
                  ? match.progress_events[0]
                  : match.progress_events

                return (
                  <div
                    key={match.id}
                    className="bg-[#070707] border border-[#e2bf29]/30 p-4 rounded space-y-2"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <p className="text-sm font-bold text-[#ffffff]">
                        {event?.activity_description ?? 'No event description'}
                      </p>
                      {match.final_score !== null && match.final_score !== undefined && (
                        <span className="text-xs font-mono font-bold px-2 py-0.5 bg-[#111111] border border-[#e2bf29] text-[#e2bf29] rounded shrink-0">
                          Score: {(match.final_score * 100).toFixed(0)}%
                        </span>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-[#f1f2f3]/70">
                      {event?.event_type && (
                        <span>Type: <strong className="text-[#ffffff] font-bold">{event.event_type}</strong></span>
                      )}
                      {event?.event_date && (
                        <span>Date: <strong className="text-[#ffffff] font-bold">{formatDate(event.event_date)}</strong></span>
                      )}
                      {event?.quantity !== null && event?.quantity !== undefined && (
                        <span>Qty: <strong className="text-[#ffffff] font-bold">{event.quantity}</strong></span>
                      )}
                      {match.match_status && (
                        <span>Status: <strong className="text-[#e2bf29] font-bold">{match.match_status}</strong></span>
                      )}
                    </div>

                    {event?.delay_reason && (
                      <p className="text-xs text-[#b71511] font-bold bg-[#b71511]/10 border border-[#b71511]/30 p-2 rounded">
                        Delay Reason: {event.delay_reason}
                      </p>
                    )}
                  </div>
                )
              })}
            </div>
          ) : (
            <p className="text-sm text-[#f1f2f3]/60 italic py-2">
              No source reports yet
            </p>
          )}
        </CardContent>
      </Card>

      {/* 4. AUDIT HISTORY CARD */}
      <Card className="bg-[#111111] text-[#ffffff] border border-[#e2bf29]/40 rounded-lg shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-bold font-heading uppercase tracking-wider text-[#e2bf29]">
            AUDIT HISTORY
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-2">
          {auditLogs.length > 0 ? (
            <div className="relative border-l border-[#e2bf29]/40 pl-4 ml-2 space-y-4 py-1">
              {auditLogs.map((log) => (
                <div key={log.id} className="relative space-y-1">
                  <div className="absolute -left-[21px] top-1.5 size-2 rounded-full bg-[#e2bf29]" />
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between text-xs text-[#f1f2f3]/70 gap-1">
                    <span className="font-mono font-bold text-[#e2bf29] uppercase">
                      {log.action}
                    </span>
                    <span>
                      {new Date(log.created_at).toLocaleString()}
                    </span>
                  </div>
                  {log.user_id && (
                    <p className="text-xs text-[#f1f2f3]/60">
                      User: <span className="font-mono text-[#ffffff]">{log.user_id}</span>
                    </p>
                  )}
                  {log.comment && (
                    <p className="text-xs text-[#ffffff] font-bold">
                      {log.comment}
                    </p>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-[#f1f2f3]/60 italic py-2">
              No audit history yet
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
