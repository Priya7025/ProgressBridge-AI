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

export interface DisciplineProgressItem {
  discipline: string
  completion_pct: number
}

interface DisciplineChartProps {
  data: DisciplineProgressItem[]
}

export function DisciplineChart({ data }: DisciplineChartProps) {
  return (
    <Card className="bg-[#111111] text-[#ffffff] border border-[#e2bf29]/30 rounded-lg shadow-sm">
      <CardHeader>
        <CardTitle className="text-lg font-bold font-heading text-[#e2bf29]">
          Discipline Progress
        </CardTitle>
      </CardHeader>
      <CardContent className="h-[350px] w-full pt-2">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={data}
            layout="vertical"
            margin={{ top: 5, right: 30, left: 40, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#26241b" />
            <XAxis
              type="number"
              domain={[0, 100]}
              tickFormatter={(val) => `${val}%`}
              tick={{ fontSize: 12, fill: '#f1f2f3' }}
              stroke="#e2bf29"
            />
            <YAxis
              type="category"
              dataKey="discipline"
              tick={{ fontSize: 12, fill: '#f1f2f3' }}
              width={100}
              stroke="#e2bf29"
            />
            <Tooltip
              formatter={(value) => [`${value ?? 0}%`, 'Completion']}
              contentStyle={{
                backgroundColor: '#070707',
                borderColor: '#e2bf29',
                borderRadius: '6px',
                color: '#ffffff',
              }}
            />
            <Bar
              dataKey="completion_pct"
              fill="#e2bf29"
              radius={[0, 4, 4, 0]}
              barSize={20}
            />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}
