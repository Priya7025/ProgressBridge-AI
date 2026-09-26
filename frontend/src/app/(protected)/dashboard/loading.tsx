import { Loader2 } from 'lucide-react'
import { Card, CardContent, CardHeader } from '@/components/ui/card'

export default function DashboardLoading() {
  return (
    <div className="space-y-8 p-4 sm:p-8 w-full animate-pulse">
      <div>
        <div className="h-7 w-48 bg-muted border border-border/40 rounded" />
        <div className="h-4 w-72 bg-muted border border-border/40 rounded mt-2" />
      </div>

      {/* 5 KPI SKELETON CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6">
        {[...Array(5)].map((_, i) => (
          <Card key={i} className="bg-card border border-border/60 rounded-xl">
            <CardHeader className="pb-2">
              <div className="h-3 w-24 bg-muted rounded" />
            </CardHeader>
            <CardContent>
              <div className="h-8 w-16 bg-muted rounded" />
            </CardContent>
          </Card>
        ))}
      </div>

      {/* CHART SKELETON */}
      <Card className="bg-card border border-border/60 rounded-xl p-12 flex flex-col items-center justify-center space-y-3 min-h-[300px]">
        <Loader2 className="size-8 animate-spin text-primary" />
        <p className="text-sm font-semibold text-muted-foreground font-sans">
          Loading dashboard metrics...
        </p>
      </Card>
    </div>
  )
}
