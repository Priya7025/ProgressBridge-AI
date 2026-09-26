import { Loader2 } from 'lucide-react'
import { Card } from '@/components/ui/card'

export default function ActivitiesLoading() {
  return (
    <div className="space-y-6 w-full p-4 sm:p-6 animate-pulse">
      <div>
        <div className="h-8 w-40 bg-muted border border-border/40 rounded" />
        <div className="h-4 w-56 bg-muted border border-border/40 rounded mt-2" />
      </div>

      <div className="flex gap-4">
        <div className="h-10 flex-1 bg-muted border border-border/40 rounded-lg" />
        <div className="h-10 w-48 bg-muted border border-border/40 rounded-lg" />
      </div>

      <Card className="bg-card border border-border/60 rounded-xl p-12 flex flex-col items-center justify-center space-y-3 min-h-[300px]">
        <Loader2 className="size-8 animate-spin text-primary" />
        <p className="text-sm font-semibold text-muted-foreground font-sans">
          Loading schedule activities...
        </p>
      </Card>
    </div>
  )
}

