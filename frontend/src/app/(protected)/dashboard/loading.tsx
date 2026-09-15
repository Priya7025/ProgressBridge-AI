import { Loader2 } from 'lucide-react'
import { Card, CardContent, CardHeader } from '@/components/ui/card'

export default function DashboardLoading() {
  return (
    <div className="space-y-8 p-4 sm:p-8 bg-[#000000] min-h-full animate-pulse">
      <div>
        <div className="h-7 w-48 bg-[#111111] border border-[#e2bf29]/20 rounded" />
        <div className="h-4 w-72 bg-[#111111] border border-zinc-800 rounded mt-2" />
      </div>

      {/* 5 KPI SKELETON CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6">
        {[...Array(5)].map((_, i) => (
          <Card key={i} className="bg-[#111111] border border-[#e2bf29]/20 rounded-lg">
            <CardHeader className="pb-2">
              <div className="h-3 w-24 bg-[#070707] rounded" />
            </CardHeader>
            <CardContent>
              <div className="h-8 w-16 bg-[#070707] rounded" />
            </CardContent>
          </Card>
        ))}
      </div>

      {/* CHART SKELETON */}
      <Card className="bg-[#111111] border border-[#e2bf29]/20 rounded-lg p-12 flex flex-col items-center justify-center space-y-3 min-h-[300px]">
        <Loader2 className="size-8 animate-spin text-[#e2bf29]" />
        <p className="text-sm font-semibold text-[#f1f2f3]/70 font-sans">
          Loading dashboard metrics...
        </p>
      </Card>
    </div>
  )
}
