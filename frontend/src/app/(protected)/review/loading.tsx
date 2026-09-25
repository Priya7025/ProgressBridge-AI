import { Loader2 } from 'lucide-react'
import { Card } from '@/components/ui/card'

export default function ReviewLoading() {
  return (
    <div className="space-y-6 w-full p-4 sm:p-6 animate-pulse">
      <div>
        <div className="h-8 w-48 bg-muted border border-border/40 rounded" />
        <div className="h-4 w-72 bg-muted border border-border/40 rounded mt-2" />
      </div>

      <div className="flex gap-4 border-b border-border/40 pb-1">
        <div className="h-9 w-36 bg-muted rounded" />
        <div className="h-9 w-32 bg-muted rounded" />
      </div>

      <Card className="bg-card border border-border/60 rounded-xl p-12 flex flex-col items-center justify-center space-y-3 min-h-[250px]">
        <Loader2 className="size-8 animate-spin text-primary" />
        <p className="text-sm font-semibold text-muted-foreground font-sans">
          Loading review queue...
        </p>
      </Card>
    </div>
  )
}
