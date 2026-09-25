'use client'

import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useTheme } from '@/lib/theme-provider'

export interface DisciplineProgressItem {
  discipline: string
  completion_pct: number
}

interface DisciplineChartProps {
  data: DisciplineProgressItem[]
}

export function DisciplineChart({ data }: DisciplineChartProps) {
  const { resolvedTheme } = useTheme()
  const isDark = resolvedTheme === 'dark'

  const primaryColor = isDark ? '#e2bf29' : '#c99611'
  const textColor = isDark ? '#f1f2f3' : '#334155'
  const gridColor = isDark ? '#26241b' : '#e2e8f0'
  const tooltipBg = isDark ? '#0c0c0c' : '#ffffff'
  const tooltipText = isDark ? '#ffffff' : '#0f172a'

  return (
    <Card className="bg-card text-card-foreground border border-border/60 rounded-xl shadow-sm">
      <CardHeader className="p-4 sm:p-6 pb-2 sm:pb-3">
        <CardTitle className="text-base sm:text-lg font-bold font-heading text-primary">
          Discipline Progress
        </CardTitle>
      </CardHeader>
      <CardContent className="h-[280px] sm:h-[350px] w-full p-2 sm:p-6 pt-0 sm:pt-2">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={data}
            layout="vertical"
            margin={{ top: 5, right: 15, left: 10, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke={gridColor} />
            <XAxis
              type="number"
              domain={[0, 100]}
              tickFormatter={(val) => `${val}%`}
              tick={{ fontSize: 11, fill: textColor }}
              stroke={primaryColor}
            />
            <YAxis
              type="category"
              dataKey="discipline"
              tick={{ fontSize: 11, fill: textColor }}
              width={85}
              stroke={primaryColor}
            />
            <Tooltip
              formatter={(value) => [`${value ?? 0}%`, 'Completion']}
              contentStyle={{
                backgroundColor: tooltipBg,
                borderColor: primaryColor,
                borderRadius: '8px',
                color: tooltipText,
                fontSize: '12px',
                boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
              }}
            />
            <Bar
              dataKey="completion_pct"
              fill={primaryColor}
              radius={[0, 4, 4, 0]}
              barSize={18}
            />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}


