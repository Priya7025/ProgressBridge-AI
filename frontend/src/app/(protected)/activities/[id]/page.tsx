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
      return 'bg-destructive text-destructive-foreground'
    case 'NOT_STARTED':
      return 'bg-muted text-muted-foreground border border-border'
    case 'IN_PROGRESS':
      return 'bg-sky-600 text-white dark:bg-[#337ab7]'
    case 'COMPLETED':
      return 'bg-emerald-600 text-white dark:bg-emerald-700'
    default:
      return 'bg-muted text-foreground border border-primary/30'
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

  // 1. Fetch schedule_activity row by UUID (id) OR by activity code (activity_id e.g. PIP-2458)
  const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)

  const { data: activityData } = isUUID
    ? await supabase.from('schedule_activities').select('*').eq('id', id).maybeSingle()
    : await supabase.from('schedule_activities').select('*').eq('activity_id', id).maybeSingle()

  const activity = activityData as ScheduleActivity | null

  if (!activity) {
    return (
      <div className="p-8 space-y-4 bg-background min-h-full">
        <Card className="bg-card text-card-foreground border border-primary/40 rounded-lg p-8 max-w-md mx-auto shadow-lg text-center">
          <CardTitle className="font-heading text-xl font-bold text-primary">Activity Not Found</CardTitle>
          <p className="text-sm text-muted-foreground mt-2 font-sans">
            No schedule activity exists for ID or code: {id}
          </p>
          <div className="pt-4">
            <Link
              href="/dashboard"
              className="inline-flex items-center justify-center px-4 py-2 text-sm font-bold bg-primary text-primary-foreground rounded shadow-md hover:opacity-90 transition-opacity"
            >
              Return to Dashboard
            </Link>
          </div>
        </Card>
      </div>
    )
  }

  // 2. Fetch linked activity_matches with progress_events & audit_log rows concurrently for activity.id
  const [matchesRes, auditRes] = await Promise.all([
    supabase
      .from('activity_matches')
      .select(`
        *,
        progress_events (
          *
        )
      `)
      .eq('activity_id', activity.id),
    supabase
      .from('audit_log')
      .select('*')
      .eq('activity_id', activity.id)
      .order('created_at', { ascending: false }),
  ])

  const matches = (matchesRes.data as ActivityMatchWithEvent[] | null) ?? []
  const auditLogs = (auditRes.data as AuditLogEntry[] | null) ?? []

  const delayDays = calculateDelayDays(activity.planned_finish, activity.actual_finish)

  return (
    <div className="space-y-6 w-full">
      <Link
        href="/activities"
        className="text-xs sm:text-sm font-bold text-primary hover:underline inline-flex items-center gap-1.5 transition-colors"
      >
        ← Back to Activities
      </Link>

      {/* 1. HEADER CARD */}
      <Card className="bg-card text-card-foreground border border-border shadow-sm rounded-lg">
        <CardHeader className="p-4 sm:p-6 pb-2 sm:pb-3">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
            <div>
              <span className="text-xs font-mono font-bold text-primary uppercase tracking-wide">
                {activity.activity_id}
              </span>
              <CardTitle className="font-heading text-lg sm:text-2xl font-bold tracking-tight text-foreground mt-0.5">
                {activity.description}
              </CardTitle>
            </div>
            <div>
              <span
                className={`inline-block px-2.5 sm:px-3 py-1 text-xs font-bold font-heading uppercase rounded ${getStatusBadgeClass(
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
              <span className="text-xs font-bold font-heading uppercase bg-muted/60 border border-primary/30 text-primary px-2.5 py-1 rounded">
                DISCIPLINE: {activity.discipline}
              </span>
            )}
            {activity.location && (
              <span className="text-xs font-bold font-heading uppercase bg-muted/60 border border-primary/30 text-primary px-2.5 py-1 rounded">
                LOCATION: {activity.location}
              </span>
            )}
            {activity.wbs && (
              <span className="text-xs font-bold font-heading uppercase bg-muted/60 border border-border text-foreground px-2.5 py-1 rounded">
                WBS: {activity.wbs}
              </span>
            )}
          </div>
        </CardContent>
      </Card>

      {/* 2. PLANNED VS ACTUAL CARD */}
      <Card className="bg-card text-card-foreground border border-border shadow-sm rounded-lg">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-bold font-heading uppercase tracking-wider text-primary">
            PLANNED VS ACTUAL
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 pt-2">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-3 bg-muted/40 border border-border p-4 rounded">
              <h4 className="text-xs font-bold font-heading uppercase text-muted-foreground tracking-wider">
                Planned Schedule
              </h4>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <span className="text-xs text-muted-foreground block">Planned Start</span>
                  <span className="font-bold text-foreground">{formatDate(activity.planned_start)}</span>
                </div>
                <div>
                  <span className="text-xs text-muted-foreground block">Planned Finish</span>
                  <span className="font-bold text-foreground">{formatDate(activity.planned_finish)}</span>
                </div>
              </div>
              {activity.duration !== null && (
                <div className="text-xs text-muted-foreground pt-1 border-t border-border">
                  Planned Duration: <span className="font-bold text-primary">{activity.duration} days</span>
                </div>
              )}
            </div>

            <div className="space-y-3 bg-muted/40 border border-border p-4 rounded">
              <h4 className="text-xs font-bold font-heading uppercase text-muted-foreground tracking-wider">
                Actual Schedule
              </h4>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <span className="text-xs text-muted-foreground block">Actual Start</span>
                  <span className="font-bold text-foreground">{formatDate(activity.actual_start)}</span>
                </div>
                <div>
                  <span className="text-xs text-muted-foreground block">Actual Finish</span>
                  <span className="font-bold text-foreground">{formatDate(activity.actual_finish)}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="pt-2 border-t border-border">
            <div className="flex items-center justify-between text-sm">
              <span className="text-xs font-bold font-heading uppercase text-muted-foreground">
                Schedule Variance:
              </span>
              {delayDays !== null ? (
                delayDays > 0 ? (
                  <span className="font-bold text-destructive font-heading">
                    +{delayDays} days delay
                  </span>
                ) : (
                  <span className="font-bold text-emerald-600 dark:text-emerald-400 font-heading">
                    {delayDays === 0 ? '0 days delay (On Schedule)' : `${Math.abs(delayDays)} days ahead`}
                  </span>
                )
              ) : (
                <span className="text-xs text-muted-foreground italic">
                  Not yet recorded
                </span>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 3. SOURCE REPORTS CARD */}
      <Card className="bg-card text-card-foreground border border-border shadow-sm rounded-lg">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-bold font-heading uppercase tracking-wider text-primary">
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
                    className="bg-muted/40 border border-border p-4 rounded space-y-2"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <p className="text-sm font-bold text-foreground">
                        {event?.activity_description ?? 'No event description'}
                      </p>
                      {match.final_score !== null && match.final_score !== undefined && (
                        <span className="text-xs font-mono font-bold px-2 py-0.5 bg-background border border-primary text-primary rounded shrink-0">
                          Score: {(match.final_score * 100).toFixed(0)}%
                        </span>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                      {event?.event_type && (
                        <span>Type: <strong className="text-foreground font-bold">{event.event_type}</strong></span>
                      )}
                      {event?.event_date && (
                        <span>Date: <strong className="text-foreground font-bold">{formatDate(event.event_date)}</strong></span>
                      )}
                      {event?.quantity !== null && event?.quantity !== undefined && (
                        <span>Qty: <strong className="text-foreground font-bold">{event.quantity}</strong></span>
                      )}
                      {match.match_status && (
                        <span>Status: <strong className="text-primary font-bold">{match.match_status}</strong></span>
                      )}
                    </div>

                    {/* 4 SUB-SCORES */}
                    {(match.semantic_score !== null || match.identifier_score !== null) && (
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-border/40 text-xs">
                        <div className="bg-background/60 p-2 rounded border border-border/50">
                          <span className="text-muted-foreground block text-[10px] sm:text-[11px]">Semantic</span>
                          <strong className="text-primary font-mono text-xs">
                            {match.semantic_score !== null ? `${(match.semantic_score * 100).toFixed(0)}%` : 'N/A'}
                          </strong>
                        </div>
                        <div className="bg-background/60 p-2 rounded border border-border/50">
                          <span className="text-muted-foreground block text-[10px] sm:text-[11px]">Identifier</span>
                          <strong className="text-primary font-mono text-xs">
                            {match.identifier_score !== null ? `${(match.identifier_score * 100).toFixed(0)}%` : 'N/A'}
                          </strong>
                        </div>
                        <div className="bg-background/60 p-2 rounded border border-border/50">
                          <span className="text-muted-foreground block text-[10px] sm:text-[11px]">Discipline</span>
                          <strong className="text-primary font-mono text-xs">
                            {match.discipline_score !== null ? `${(match.discipline_score * 100).toFixed(0)}%` : 'N/A'}
                          </strong>
                        </div>
                        <div className="bg-background/60 p-2 rounded border border-border/50">
                          <span className="text-muted-foreground block text-[10px] sm:text-[11px]">Location</span>
                          <strong className="text-primary font-mono text-xs">
                            {match.location_score !== null ? `${(match.location_score * 100).toFixed(0)}%` : 'N/A'}
                          </strong>
                        </div>
                      </div>
                    )}

                    {event?.delay_reason && (
                      <p className="text-xs text-destructive font-bold bg-destructive/10 border border-destructive/30 p-2 rounded">
                        Delay Reason: {event.delay_reason}
                      </p>
                    )}
                  </div>
                )
              })}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground italic py-2">
              No source reports yet
            </p>
          )}
        </CardContent>
      </Card>

      {/* 4. AUDIT HISTORY CARD */}
      <Card className="bg-card text-card-foreground border border-border shadow-sm rounded-lg">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-bold font-heading uppercase tracking-wider text-primary">
            AUDIT HISTORY
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-2">
          {auditLogs.length > 0 ? (
            <div className="relative border-l border-primary/40 pl-4 ml-2 space-y-4 py-1">
              {auditLogs.map((log) => (
                <div key={log.id} className="relative space-y-1">
                  <div className="absolute -left-[21px] top-1.5 size-2 rounded-full bg-primary" />
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between text-xs text-muted-foreground gap-1">
                    <span className="font-mono font-bold text-primary uppercase">
                      {log.action}
                    </span>
                    <span>
                      {new Date(log.created_at).toLocaleString()}
                    </span>
                  </div>
                  {log.user_id && (
                    <p className="text-xs text-muted-foreground">
                      User: <span className="font-mono text-foreground">{log.user_id}</span>
                    </p>
                  )}
                  {log.comment && (
                    <p className="text-xs text-foreground font-bold">
                      {log.comment}
                    </p>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground italic py-2">
              No audit history yet
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
