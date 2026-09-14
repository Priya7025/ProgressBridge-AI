'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Search, Filter, Calendar, MapPin, Tag } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'

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

export function ActivitiesListClient({ initialActivities }: ActivitiesListClientProps) {
  const router = useRouter()
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedDiscipline, setSelectedDiscipline] = useState('All')

  // Filter activities client-side
  const filteredActivities = initialActivities.filter((act) => {
    const matchesSearch =
      !searchQuery.trim() ||
      act.activity_id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      act.description.toLowerCase().includes(searchQuery.toLowerCase())

    const matchesDiscipline =
      selectedDiscipline === 'All' ||
      (act.discipline &&
        act.discipline.toLowerCase() === selectedDiscipline.toLowerCase())

    return matchesSearch && matchesDiscipline
  })

  if (initialActivities.length === 0) {
    return (
      <div className="space-y-6 w-full">
        <div>
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold tracking-tight font-heading font-display text-primary">
            Activities
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground font-sans mt-1">
            0 activities
          </p>
        </div>

        <Card className="bg-card text-card-foreground border border-border/60 rounded-xl p-8 sm:p-12 text-center shadow-md">
          <CardContent className="space-y-4 pt-4">
            <p className="text-sm sm:text-base font-medium text-muted-foreground">
              No activities yet — upload a schedule to get started
            </p>
            <div>
              <Link
                href="/upload"
                className="inline-flex items-center justify-center px-4 py-2 text-sm font-bold bg-primary text-primary-foreground rounded-lg shadow-md hover:opacity-90 transition-opacity"
              >
                Go to Upload
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6 w-full transition-colors duration-200">
      {/* PAGE HEADER */}
      <div>
        <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold tracking-tight font-heading font-display text-primary">
          Activities
        </h1>
        <p className="text-xs sm:text-sm text-muted-foreground font-sans mt-1">
          {filteredActivities.length === initialActivities.length
            ? `${initialActivities.length} activities`
            : `Showing ${filteredActivities.length} of ${initialActivities.length} activities`}
        </p>
      </div>

      {/* FILTER & SEARCH CONTROLS */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:gap-4">
        {/* Search Input */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-primary" />
          <Input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by Activity ID or Description..."
            className="pl-9 bg-background border-border/60 text-foreground placeholder:text-muted-foreground focus-visible:ring-primary/50 focus-visible:border-primary h-10 text-sm rounded-lg"
          />
        </div>

        {/* Discipline Filter Select */}
        <div className="relative w-full sm:w-56">
          <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none text-primary">
            <Filter className="size-4" />
          </div>
          <select
            value={selectedDiscipline}
            onChange={(e) => setSelectedDiscipline(e.target.value)}
            className="w-full bg-background border border-border/60 text-foreground pl-9 pr-4 h-10 text-sm rounded-lg focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/50 cursor-pointer appearance-none"
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
      </div>

      {/* NO MATCHES FALLBACK */}
      {filteredActivities.length === 0 ? (
        <Card className="bg-card text-card-foreground border border-border/60 rounded-xl p-8 text-center shadow-md">
          <p className="text-sm text-muted-foreground font-sans">
            No activities match your current search or discipline filter.
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
                  {filteredActivities.map((act) => (
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
                          {act.status.replace('_', ' ')}
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
            {filteredActivities.map((act) => (
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
                    {act.status.replace('_', ' ')}
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
        </>
      )}
    </div>
  )
}
