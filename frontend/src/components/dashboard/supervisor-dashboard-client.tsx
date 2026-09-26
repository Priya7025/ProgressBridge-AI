'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  Calendar,
  Filter,
  Search,
  Tag,
  MapPin,
  Clock,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  Send,
  ArrowUpDown,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'

export interface ScheduleActivity {
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

interface SupervisorDashboardClientProps {
  activities: ScheduleActivity[]
}

const DISCIPLINES = [
  'All',
  'Civil',
  'Piping',
  'Mechanical',
  'Electrical',
  'Instrumentation',
  'HSE',
]

const STATUSES = [
  { label: 'All Statuses', value: 'All' },
  { label: 'Not Started', value: 'NOT_STARTED' },
  { label: 'In Progress', value: 'IN_PROGRESS' },
  { label: 'Pending Review', value: 'PENDING_REVIEW' },
  { label: 'Completed', value: 'COMPLETED' },
  { label: 'Overdue', value: 'OVERDUE' },
]

function formatDate(dateStr: string | null): string {
  if (!dateStr) return 'Not set'
  const date = new Date(dateStr)
  if (isNaN(date.getTime())) return dateStr
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

function computeDeadlineInfo(act: ScheduleActivity) {
  if (act.status === 'COMPLETED' || act.actual_finish) {
    return {
      label: 'Completed',
      category: 'COMPLETED',
      badgeClass: 'bg-emerald-600 text-white dark:bg-emerald-700',
    }
  }

  if (!act.planned_finish) {
    return {
      label: 'No finish date',
      category: 'NOT_STARTED',
      badgeClass: 'bg-muted text-muted-foreground',
    }
  }

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const finish = new Date(act.planned_finish)
  finish.setHours(0, 0, 0, 0)

  const diffDays = Math.round((finish.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))

  if (diffDays < 0) {
    const overdueDays = Math.abs(diffDays)
    return {
      label: `Overdue by ${overdueDays} day${overdueDays > 1 ? 's' : ''}`,
      category: 'OVERDUE',
      badgeClass: 'bg-destructive text-white border border-destructive/80',
    }
  }

  if (diffDays === 0) {
    return {
      label: 'Due Today',
      category: 'DUE_TODAY',
      badgeClass: 'bg-amber-500 text-black font-extrabold border border-amber-400 animate-pulse',
    }
  }

  if (diffDays === 1) {
    return {
      label: 'Due Tomorrow',
      category: 'DUE_TOMORROW',
      badgeClass: 'bg-accent text-white border border-accent/60',
    }
  }

  return {
    label: `Due in ${diffDays} days`,
    category: 'IN_PROGRESS',
    badgeClass: 'bg-primary/20 text-primary border border-primary/40',
  }
}

export function SupervisorDashboardClient({ activities }: SupervisorDashboardClientProps) {
  const router = useRouter()
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedDiscipline, setSelectedDiscipline] = useState('All')
  const [selectedStatus, setSelectedStatus] = useState('All')
  const [sortOption, setSortOption] = useState<'nearest' | 'farthest' | 'code'>('nearest')

  // Calculate real summary metrics from schedule activities
  let dueTodayCount = 0
  let dueTomorrowCount = 0
  let overdueCount = 0
  let completedCount = 0

  activities.forEach((act) => {
    const info = computeDeadlineInfo(act)
    if (info.category === 'COMPLETED') completedCount++
    else if (info.category === 'OVERDUE') overdueCount++
    else if (info.category === 'DUE_TODAY') dueTodayCount++
    else if (info.category === 'DUE_TOMORROW') dueTomorrowCount++
  })

  // Filter activities
  const filteredActivities = activities.filter((act) => {
    const matchesSearch =
      !searchQuery.trim() ||
      act.activity_id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      act.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (act.location && act.location.toLowerCase().includes(searchQuery.toLowerCase()))

    const matchesDiscipline =
      selectedDiscipline === 'All' ||
      (act.discipline && act.discipline.toLowerCase() === selectedDiscipline.toLowerCase())

    const deadlineInfo = computeDeadlineInfo(act)
    let matchesStatus = true
    if (selectedStatus !== 'All') {
      if (selectedStatus === 'OVERDUE') {
        matchesStatus = deadlineInfo.category === 'OVERDUE'
      } else {
        matchesStatus = (act.status || '').toUpperCase() === selectedStatus
      }
    }

    return matchesSearch && matchesDiscipline && matchesStatus
  })

  // Sort activities
  const sortedActivities = [...filteredActivities].sort((a, b) => {
    if (sortOption === 'code') {
      return a.activity_id.localeCompare(b.activity_id)
    }
    const dateA = a.planned_finish ? new Date(a.planned_finish).getTime() : 0
    const dateB = b.planned_finish ? new Date(b.planned_finish).getTime() : 0
    if (sortOption === 'nearest') {
      return dateA - dateB
    } else {
      return dateB - dateA
    }
  })

  return (
    <div className="space-y-6 sm:space-y-8 transition-colors duration-200">
      {/* HEADER SECTION */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight font-heading text-primary">
            Supervisor Activity Center
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground font-sans mt-1">
            Track site assignments, upcoming deadlines, and submit progress reports
          </p>
        </div>

        <Link
          href="/time-agent"
          className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground font-bold text-xs sm:text-sm rounded-lg shadow-md hover:opacity-90 transition-opacity self-start sm:self-auto"
        >
          <Send className="size-4" />
          <span>Report via Time Agent</span>
        </Link>
      </div>

      {/* TODAY'S WORK SUMMARY KPI CARDS */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-6">
        <Card className="bg-card text-card-foreground border border-amber-500/40 rounded-xl shadow-sm">
          <CardHeader className="p-3 sm:p-5 pb-1">
            <CardTitle className="text-[10px] sm:text-xs font-bold font-heading uppercase text-amber-500 flex items-center justify-between">
              <span>Due Today</span>
              <Clock className="size-4" />
            </CardTitle>
          </CardHeader>
          <CardContent className="p-3 sm:p-5 pt-0">
            <div className="text-2xl sm:text-3xl font-extrabold text-foreground">
              {dueTodayCount}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card text-card-foreground border border-accent/40 rounded-xl shadow-sm">
          <CardHeader className="p-3 sm:p-5 pb-1">
            <CardTitle className="text-[10px] sm:text-xs font-bold font-heading uppercase text-accent flex items-center justify-between">
              <span>Due Tomorrow</span>
              <Calendar className="size-4" />
            </CardTitle>
          </CardHeader>
          <CardContent className="p-3 sm:p-5 pt-0">
            <div className="text-2xl sm:text-3xl font-extrabold text-foreground">
              {dueTomorrowCount}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card text-card-foreground border border-destructive/40 rounded-xl shadow-sm">
          <CardHeader className="p-3 sm:p-5 pb-1">
            <CardTitle className="text-[10px] sm:text-xs font-bold font-heading uppercase text-destructive flex items-center justify-between">
              <span>Overdue</span>
              <AlertTriangle className="size-4" />
            </CardTitle>
          </CardHeader>
          <CardContent className="p-3 sm:p-5 pt-0">
            <div className="text-2xl sm:text-3xl font-extrabold text-destructive">
              {overdueCount}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card text-card-foreground border border-emerald-500/40 rounded-xl shadow-sm">
          <CardHeader className="p-3 sm:p-5 pb-1">
            <CardTitle className="text-[10px] sm:text-xs font-bold font-heading uppercase text-emerald-600 dark:text-emerald-400 flex items-center justify-between">
              <span>Completed</span>
              <CheckCircle2 className="size-4" />
            </CardTitle>
          </CardHeader>
          <CardContent className="p-3 sm:p-5 pt-0">
            <div className="text-2xl sm:text-3xl font-extrabold text-foreground">
              {completedCount}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* FILTER & SORT CONTROLS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-primary" />
          <Input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search Activity ID or Description..."
            className="pl-9 bg-background border-border/60 text-foreground placeholder:text-muted-foreground focus-visible:ring-primary/50 h-10 text-xs sm:text-sm rounded-lg"
          />
        </div>

        <div className="relative">
          <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none text-primary">
            <Filter className="size-4" />
          </div>
          <select
            value={selectedDiscipline}
            onChange={(e) => setSelectedDiscipline(e.target.value)}
            className="w-full bg-background border border-border/60 text-foreground pl-9 pr-8 h-10 text-xs sm:text-sm rounded-lg focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/50 cursor-pointer appearance-none"
          >
            {DISCIPLINES.map((disc) => (
              <option key={disc} value={disc} className="bg-card text-foreground">
                {disc === 'All' ? 'All Disciplines' : disc}
              </option>
            ))}
          </select>
          <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-muted-foreground text-xs">
            ▼
          </div>
        </div>

        <div className="relative">
          <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none text-primary">
            <Tag className="size-4" />
          </div>
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="w-full bg-background border border-border/60 text-foreground pl-9 pr-8 h-10 text-xs sm:text-sm rounded-lg focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/50 cursor-pointer appearance-none"
          >
            {STATUSES.map((st) => (
              <option key={st.value} value={st.value} className="bg-card text-foreground">
                {st.label}
              </option>
            ))}
          </select>
          <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-muted-foreground text-xs">
            ▼
          </div>
        </div>

        <div className="relative">
          <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none text-primary">
            <ArrowUpDown className="size-4" />
          </div>
          <select
            value={sortOption}
            onChange={(e) => setSortOption(e.target.value as 'nearest' | 'farthest' | 'code')}
            className="w-full bg-background border border-border/60 text-foreground pl-9 pr-8 h-10 text-xs sm:text-sm rounded-lg focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/50 cursor-pointer appearance-none"
          >
            <option value="nearest" className="bg-card text-foreground">Sort: Nearest Deadline</option>
            <option value="farthest" className="bg-card text-foreground">Sort: Farthest Deadline</option>
            <option value="code" className="bg-card text-foreground">Sort: Activity Code</option>
          </select>
          <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-muted-foreground text-xs">
            ▼
          </div>
        </div>
      </div>

      {/* SITE ACTIVITIES CARDS GRID */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-bold font-heading uppercase text-primary tracking-wider">
            Site Activities ({sortedActivities.length})
          </h2>
        </div>

        {sortedActivities.length === 0 ? (
          <Card className="bg-card border border-border/60 p-8 text-center rounded-xl shadow-sm">
            <p className="text-sm text-muted-foreground">
              No site activities match your search and filter criteria.
            </p>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {sortedActivities.map((act) => {
              const deadline = computeDeadlineInfo(act)
              return (
                <Card
                  key={act.id}
                  className="bg-card text-card-foreground border border-border/60 hover:border-primary/80 transition-all rounded-xl shadow-sm flex flex-col justify-between"
                >
                  <CardHeader className="p-4 pb-2 space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <Link
                        href={`/activities/${act.id}`}
                        className="font-mono text-xs font-bold text-primary tracking-wide hover:underline"
                      >
                        {act.activity_id}
                      </Link>
                      <span
                        className={`inline-block px-2.5 py-0.5 text-[11px] font-bold font-heading rounded-full uppercase ${deadline.badgeClass}`}
                      >
                        {deadline.label}
                      </span>
                    </div>

                    <CardTitle className="text-sm font-bold font-heading text-foreground leading-snug">
                      <Link
                        href={`/activities/${act.id}`}
                        className="hover:text-primary transition-colors"
                      >
                        {act.description}
                      </Link>
                    </CardTitle>
                  </CardHeader>

                  <CardContent className="p-4 pt-0 space-y-3">
                    <div className="flex flex-wrap items-center gap-2 text-xs pt-1">
                      {act.discipline && (
                        <span className="px-2 py-0.5 bg-muted border border-border/60 text-primary font-bold text-[10px] rounded uppercase">
                          {act.discipline}
                        </span>
                      )}
                      {act.location && (
                        <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
                          <MapPin className="size-3 text-primary" />
                          {act.location}
                        </span>
                      )}
                      {act.asset && (
                        <span className="text-[11px] text-muted-foreground">
                          Asset: <strong className="text-foreground">{act.asset}</strong>
                        </span>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs bg-muted/40 p-2.5 rounded border border-border/40">
                      <div>
                        <span className="text-[10px] text-muted-foreground block">Planned Start</span>
                        <strong className="text-foreground font-semibold">{formatDate(act.planned_start)}</strong>
                      </div>
                      <div>
                        <span className="text-[10px] text-muted-foreground block">Planned Finish</span>
                        <strong className="text-foreground font-semibold">{formatDate(act.planned_finish)}</strong>
                      </div>
                    </div>

                    <div className="pt-2 border-t border-border/40 flex items-center justify-between">
                      <Link
                        href={`/time-agent`}
                        className="text-xs font-bold text-primary hover:underline flex items-center gap-1"
                      >
                        <span>Submit Report</span>
                        <ArrowRight className="size-3.5" />
                      </Link>

                      <Link
                        href={`/upload`}
                        className="text-[11px] text-muted-foreground hover:text-foreground underline"
                      >
                        Upload Document
                      </Link>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
