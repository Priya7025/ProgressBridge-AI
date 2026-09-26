'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import { Search, Filter, Calendar, MapPin, Tag, ChevronLeft, ChevronRight, ArrowUpDown } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
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

interface ActivitiesListClientProps {
  initialActivities: ScheduleActivity[]
  totalCount: number
  currentPage: number
  pageSize: number
  initialDiscipline: string
  initialStatus: string
  initialSearch: string
  initialSort: string
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
  { label: 'Delayed', value: 'DELAYED' },
]

function getStatusBadgeClass(status: string) {
  const normalized = (status || '').toUpperCase()
  switch (normalized) {
    case 'DELAYED':
      return 'bg-destructive text-white'
    case 'NOT_STARTED':
      return 'bg-muted text-muted-foreground border border-border/60'
    case 'IN_PROGRESS':
      return 'bg-accent text-white'
    case 'COMPLETED':
      return 'bg-emerald-600 text-white'
    default:
      return 'bg-muted text-foreground border border-primary/30'
  }
}

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

export function ActivitiesListClient({
  initialActivities,
  totalCount,
  currentPage,
  pageSize,
  initialDiscipline,
  initialStatus,
  initialSearch,
  initialSort,
}: ActivitiesListClientProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [isPending, startTransition] = useTransition()

  const [searchQuery, setSearchQuery] = useState(initialSearch)
  const [selectedDiscipline, setSelectedDiscipline] = useState(initialDiscipline)
  const [selectedStatus, setSelectedStatus] = useState(initialStatus)
  const [selectedSort, setSelectedSort] = useState(initialSort)

  const totalPages = Math.ceil(totalCount / pageSize) || 1

  const updateFilters = (updates: Record<string, string>) => {
    const params = new URLSearchParams(searchParams.toString())
    Object.entries(updates).forEach(([key, value]) => {
      if (value && value !== 'All' && value !== 'code' && value !== '') {
        params.set(key, value)
      } else {
        params.delete(key)
      }
    })
    // Reset to page 1 on filter changes unless page itself is being changed
    if (!updates.page) {
      params.delete('page')
    }
    startTransition(() => {
      router.push(`${pathname}?${params.toString()}`)
    })
  }

  const handleSearchChange = (val: string) => {
    setSearchQuery(val)
    updateFilters({ search: val, discipline: selectedDiscipline, status: selectedStatus, sort: selectedSort })
  }

  const handleDisciplineChange = (val: string) => {
    setSelectedDiscipline(val)
    updateFilters({ search: searchQuery, discipline: val, status: selectedStatus, sort: selectedSort })
  }

  const handleStatusChange = (val: string) => {
    setSelectedStatus(val)
    updateFilters({ search: searchQuery, discipline: selectedDiscipline, status: val, sort: selectedSort })
  }

  const handleSortChange = (val: string) => {
    setSelectedSort(val)
    updateFilters({ search: searchQuery, discipline: selectedDiscipline, status: selectedStatus, sort: val })
  }

  const handlePageChange = (newPage: number) => {
    const params = new URLSearchParams(searchParams.toString())
    params.set('page', newPage.toString())
    startTransition(() => {
      router.push(`${pathname}?${params.toString()}`)
    })
  }

  return (
    <div className={`space-y-6 w-full transition-colors duration-200 ${isPending ? 'opacity-70 pointer-events-none' : ''}`}>
      {/* PAGE HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold tracking-tight font-heading font-display text-primary">
            Schedule Activities
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground font-sans mt-1">
            Showing {initialActivities.length} of {totalCount} total activities (Page {currentPage} of {totalPages})
          </p>
        </div>

        <Link
          href="/upload"
          className="inline-flex items-center justify-center px-4 py-2 text-xs sm:text-sm font-bold bg-primary text-primary-foreground rounded-lg shadow-md hover:opacity-90 transition-opacity self-start sm:self-auto"
        >
          Upload Schedule
        </Link>
      </div>

      {/* FILTER & SEARCH CONTROLS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Search Input */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-primary" />
          <Input
            type="text"
            value={searchQuery}
            onChange={(e) => handleSearchChange(e.target.value)}
            placeholder="Search Activity ID or Description..."
            className="pl-9 bg-background border-border/60 text-foreground placeholder:text-muted-foreground focus-visible:ring-primary/50 focus-visible:border-primary h-10 text-xs sm:text-sm rounded-lg"
          />
        </div>

        {/* Discipline Filter Select */}
        <div className="relative">
          <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none text-primary">
            <Filter className="size-4" />
          </div>
          <select
            value={selectedDiscipline}
            onChange={(e) => handleDisciplineChange(e.target.value)}
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

        {/* Status Filter Select */}
        <div className="relative">
          <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none text-primary">
            <Tag className="size-4" />
          </div>
          <select
            value={selectedStatus}
            onChange={(e) => handleStatusChange(e.target.value)}
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

        {/* Sort Select */}
        <div className="relative">
          <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none text-primary">
            <ArrowUpDown className="size-4" />
          </div>
          <select
            value={selectedSort}
            onChange={(e) => handleSortChange(e.target.value)}
            className="w-full bg-background border border-border/60 text-foreground pl-9 pr-8 h-10 text-xs sm:text-sm rounded-lg focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/50 cursor-pointer appearance-none"
          >
            <option value="code" className="bg-card text-foreground">Sort: Activity Code</option>
            <option value="deadline_nearest" className="bg-card text-foreground">Deadline: Nearest First</option>
            <option value="deadline_farthest" className="bg-card text-foreground">Deadline: Farthest First</option>
          </select>
          <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-muted-foreground text-xs">
            ▼
          </div>
        </div>
      </div>

      {/* NO MATCHES FALLBACK */}
      {initialActivities.length === 0 ? (
        <Card className="bg-card text-card-foreground border border-border/60 rounded-xl p-8 text-center shadow-md">
          <p className="text-sm text-muted-foreground font-sans">
            No schedule activities match your filter settings.
          </p>
        </Card>
      ) : (
        <>
          {/* DESKTOP TABLE VIEW */}
          <div className="hidden md:block bg-card border border-border/60 rounded-xl overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-muted/60 border-b border-border/40 text-xs font-bold font-heading uppercase tracking-wider text-primary">
                    <th className="py-3.5 px-4">Activity ID</th>
                    <th className="py-3.5 px-4">Description</th>
                    <th className="py-3.5 px-4">Discipline</th>
                    <th className="py-3.5 px-4">Location</th>
                    <th className="py-3.5 px-4">Status</th>
                    <th className="py-3.5 px-4">Planned Finish</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/40">
                  {initialActivities.map((act) => (
                    <tr
                      key={act.id}
                      onClick={() => router.push(`/activities/${act.id}`)}
                      className="hover:bg-muted/40 transition-colors cursor-pointer group"
                    >
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <Link
                          href={`/activities/${act.id}`}
                          className="font-mono font-bold text-primary group-hover:underline"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {act.activity_id}
                        </Link>
                      </td>
                      <td className="py-3.5 px-4 text-sm font-medium text-foreground max-w-xs lg:max-w-md truncate">
                        {act.description}
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        {act.discipline ? (
                          <span className="text-xs font-bold font-heading uppercase bg-muted border border-border/60 text-primary px-2.5 py-1 rounded">
                            {act.discipline}
                          </span>
                        ) : (
                          <span className="text-xs text-muted-foreground italic">N/A</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-sm text-muted-foreground whitespace-nowrap">
                        {act.location || '—'}
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span
                          className={`inline-block px-2.5 py-1 text-xs font-bold font-heading uppercase rounded ${getStatusBadgeClass(
                            act.status
                          )}`}
                        >
                          {(act.status || 'NOT_STARTED').replace('_', ' ')}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-sm text-muted-foreground whitespace-nowrap">
                        {formatDate(act.planned_finish)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* MOBILE CARD LIST VIEW */}
          <div className="block md:hidden space-y-3">
            {initialActivities.map((act) => (
              <Link
                key={act.id}
                href={`/activities/${act.id}`}
                className="block bg-card border border-border/60 hover:border-primary/80 p-4 rounded-xl shadow-sm transition-all space-y-2.5"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-mono text-xs font-bold text-primary tracking-wide">
                    {act.activity_id}
                  </span>
                  <span
                    className={`inline-block px-2 py-0.5 text-[11px] font-bold font-heading uppercase rounded ${getStatusBadgeClass(
                      act.status
                    )}`}
                  >
                    {(act.status || 'NOT_STARTED').replace('_', ' ')}
                  </span>
                </div>

                <p className="text-sm font-semibold text-foreground leading-snug">
                  {act.description}
                </p>

                <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs text-muted-foreground pt-1 border-t border-border/40">
                  {act.discipline && (
                    <span className="flex items-center gap-1 text-primary">
                      <Tag className="size-3" />
                      {act.discipline}
                    </span>
                  )}
                  {act.location && (
                    <span className="flex items-center gap-1">
                      <MapPin className="size-3 text-muted-foreground" />
                      {act.location}
                    </span>
                  )}
                  {act.planned_finish && (
                    <span className="flex items-center gap-1 ml-auto">
                      <Calendar className="size-3 text-muted-foreground" />
                      {formatDate(act.planned_finish)}
                    </span>
                  )}
                </div>
              </Link>
            ))}
          </div>

          {/* PAGINATION CONTROLS */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between pt-4 border-t border-border/40">
              <span className="text-xs text-muted-foreground">
                Page <strong className="text-foreground font-bold">{currentPage}</strong> of <strong className="text-foreground font-bold">{totalPages}</strong>
              </span>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={currentPage <= 1 || isPending}
                  onClick={() => handlePageChange(currentPage - 1)}
                  className="h-8 text-xs flex items-center gap-1 cursor-pointer"
                >
                  <ChevronLeft className="size-3.5" />
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={currentPage >= totalPages || isPending}
                  onClick={() => handlePageChange(currentPage + 1)}
                  className="h-8 text-xs flex items-center gap-1 cursor-pointer"
                >
                  Next
                  <ChevronRight className="size-3.5" />
                </Button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
