import { Loader2 } from 'lucide-react'
import { Card } from '@/components/ui/card'

export default function ActivitiesLoading() {
  return (
    <div className="space-y-6 bg-[#000000] min-h-full p-4 sm:p-6 animate-pulse">
      <div>
        <div className="h-8 w-40 bg-[#111111] border border-[#e2bf29]/20 rounded" />
        <div className="h-4 w-56 bg-[#111111] border border-zinc-800 rounded mt-2" />
      </div>

      <div className="flex gap-4">
        <div className="h-10 flex-1 bg-[#111111] border border-[#e2bf29]/20 rounded-lg" />
        <div className="h-10 w-48 bg-[#111111] border border-[#e2bf29]/20 rounded-lg" />
      </div>

      <Card className="bg-[#111111] border border-[#e2bf29]/20 rounded-lg p-12 flex flex-col items-center justify-center space-y-3 min-h-[300px]">
        <Loader2 className="size-8 animate-spin text-[#e2bf29]" />
        <p className="text-sm font-semibold text-[#f1f2f3]/70 font-sans">
          Loading schedule activities...
        </p>
      </Card>
    </div>
  )
}

