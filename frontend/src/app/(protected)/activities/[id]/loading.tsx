import { Card, CardContent, CardHeader } from '@/components/ui/card'

export default function ActivityDetailsLoading() {
  return (
    <div className="space-y-6 w-full animate-pulse">
      {/* Back button skeleton */}
      <div className="h-4 w-32 bg-muted rounded" />

      {/* 1. HEADER CARD SKELETON */}
      <Card className="bg-card border border-border shadow-sm rounded-lg p-4 sm:p-6">
        <CardHeader className="p-0 pb-3">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="space-y-2">
              <div className="h-3 w-24 bg-muted rounded" />
              <div className="h-7 w-64 sm:w-96 bg-muted rounded" />
            </div>
            <div className="h-6 w-28 bg-muted rounded-full" />
          </div>
        </CardHeader>
        <CardContent className="p-0 pt-2 flex flex-wrap gap-2">
          <div className="h-6 w-32 bg-muted rounded" />
          <div className="h-6 w-36 bg-muted rounded" />
          <div className="h-6 w-24 bg-muted rounded" />
        </CardContent>
      </Card>

      {/* 2. PLANNED VS ACTUAL CARD SKELETON */}
      <Card className="bg-card border border-border shadow-sm rounded-lg p-4 sm:p-6 space-y-4">
        <div className="h-4 w-44 bg-muted rounded" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-muted/40 border border-border p-4 rounded space-y-3">
            <div className="h-3 w-28 bg-muted rounded" />
            <div className="grid grid-cols-2 gap-2">
              <div className="h-5 w-24 bg-muted rounded" />
              <div className="h-5 w-24 bg-muted rounded" />
            </div>
          </div>
          <div className="bg-muted/40 border border-border p-4 rounded space-y-3">
            <div className="h-3 w-28 bg-muted rounded" />
            <div className="grid grid-cols-2 gap-2">
              <div className="h-5 w-24 bg-muted rounded" />
              <div className="h-5 w-24 bg-muted rounded" />
            </div>
          </div>
        </div>
      </Card>

      {/* 3. SOURCE REPORTS CARD SKELETON */}
      <Card className="bg-card border border-border shadow-sm rounded-lg p-4 sm:p-6 space-y-3">
        <div className="h-4 w-36 bg-muted rounded" />
        <div className="bg-muted/40 border border-border p-4 rounded space-y-2">
          <div className="h-5 w-full bg-muted rounded" />
          <div className="h-4 w-3/4 bg-muted rounded" />
        </div>
      </Card>

      {/* 4. AUDIT HISTORY CARD SKELETON */}
      <Card className="bg-card border border-border shadow-sm rounded-lg p-4 sm:p-6 space-y-3">
        <div className="h-4 w-32 bg-muted rounded" />
        <div className="h-12 w-full bg-muted/40 rounded" />
      </Card>
    </div>
  )
}
