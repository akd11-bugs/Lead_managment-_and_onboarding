'use client'

import { useState } from 'react'
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer, Tooltip, Legend } from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

// Reference categorical palette, slots 1 (blue) and 2 (orange) — the
// documented adjacent pair that passes CVD/contrast floors in both themes.
const SERIES_COLORS = { created: '#2a78d6', won: '#eb6834' }

export interface TrendPoint {
  label: string
  created: number
  won: number
}

export function TrendChart({ weekly, monthly }: { weekly: TrendPoint[]; monthly: TrendPoint[] }) {
  const [granularity, setGranularity] = useState<'week' | 'month'>('week')
  const data = granularity === 'week' ? weekly : monthly

  return (
    <Card>
      <CardHeader className="pb-2 flex-row items-center justify-between space-y-0">
        <div>
          <CardTitle className="text-base">Leads created vs. won</CardTitle>
          <p className="text-xs text-muted-foreground">
            {granularity === 'week' ? 'Last 8 weeks' : 'Last 6 months'}
          </p>
        </div>
        <div className="inline-flex rounded-md border bg-muted/40 p-1 gap-0.5">
          <Button
            size="sm"
            variant={granularity === 'week' ? 'default' : 'ghost'}
            className="h-7 px-3 text-xs"
            onClick={() => setGranularity('week')}
          >
            Weekly
          </Button>
          <Button
            size="sm"
            variant={granularity === 'month' ? 'default' : 'ghost'}
            className="h-7 px-3 text-xs"
            onClick={() => setGranularity('month')}
          >
            Monthly
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 8 }}>
              <XAxis dataKey="label" tickLine={false} axisLine={false} style={{ fontSize: 11 }} />
              <YAxis allowDecimals={false} tickLine={false} axisLine={false} style={{ fontSize: 11 }} width={28} />
              <Tooltip
                cursor={{ stroke: 'hsl(var(--border))', strokeWidth: 1 }}
                content={({ active, payload, label }) => {
                  if (!active || !payload?.length) return null
                  return (
                    <div className="rounded-md border bg-popover px-3 py-2 text-xs shadow-md space-y-1">
                      <p className="font-medium">{label}</p>
                      {payload.map((p) => (
                        <p key={p.dataKey as string} style={{ color: p.color }}>
                          {p.name}: {p.value}
                        </p>
                      ))}
                    </div>
                  )
                }}
              />
              <Legend
                wrapperStyle={{ fontSize: 12 }}
                formatter={(value) => <span className="text-muted-foreground">{value}</span>}
              />
              <Line
                type="monotone"
                dataKey="created"
                name="Created"
                stroke={SERIES_COLORS.created}
                strokeWidth={2}
                dot={{ r: 3 }}
                activeDot={{ r: 5 }}
              />
              <Line
                type="monotone"
                dataKey="won"
                name="Won"
                stroke={SERIES_COLORS.won}
                strokeWidth={2}
                dot={{ r: 3 }}
                activeDot={{ r: 5 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  )
}
