'use client'

import { useId } from 'react'
import { useRouter } from 'next/navigation'
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, Cell, LabelList } from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { formatCurrency } from '@/lib/utils'
import { claymorphicBar } from './ClayBar'
import { SOURCE_LABELS, type LeadSource } from '@/lib/types'

// Categorical palette slots 1–6 — validated for CVD + contrast via the dataviz
// skill's validate_palette.js, adjacent pairlist (bars), light + dark.
const SOURCE_COLORS: Record<LeadSource, string> = {
  linkedin: '#2a78d6',
  cold_outreach: '#eb6834',
  website: '#1baf7a',
  event: '#eda100',
  referral: '#e87ba4',
  other: '#008300',
}

export interface SourceROIRow {
  source: LeadSource
  value: number
  count: number
  winRate: number // 0-100, or -1 if no closed deals yet
}

export function SourceROI({ rows }: { rows: SourceROIRow[] }) {
  const uid = useId().replace(/:/g, '')
  const router = useRouter()
  const data = rows.map((r) => ({ ...r, label: SOURCE_LABELS[r.source] }))

  return (
    <Card className="clay-card">
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Source ROI</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-56">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 20, right: 8, left: 0, bottom: 8 }}>
              <XAxis
                dataKey="label"
                tickLine={false}
                axisLine={false}
                style={{ fontSize: 11 }}
                interval={0}
                angle={-15}
                textAnchor="end"
                height={40}
              />
              <YAxis allowDecimals={false} tickLine={false} axisLine={false} style={{ fontSize: 11 }} />
              <Tooltip
                cursor={{ fill: 'transparent' }}
                content={({ active, payload }) => {
                  if (!active || !payload?.length) return null
                  const d = payload[0].payload as SourceROIRow & { label: string }
                  return (
                    <div className="rounded-md border bg-popover px-3 py-2 text-xs shadow-md">
                      <p className="font-medium">{d.label}</p>
                      <p className="text-muted-foreground">{formatCurrency(d.value)} total value</p>
                      <p className="text-muted-foreground">{d.count} leads</p>
                      <p className="text-muted-foreground">
                        {d.winRate >= 0 ? `${d.winRate}% win rate` : 'No closed deals yet'}
                      </p>
                    </div>
                  )
                }}
              />
              <Bar
                dataKey="value"
                shape={claymorphicBar(uid)}
                cursor="pointer"
                onClick={(d) => router.push(`/leads?source=${d.payload.source}`)}
              >
                {data.map((r) => (
                  <Cell key={r.source} fill={SOURCE_COLORS[r.source]} />
                ))}
                <LabelList
                  dataKey="value"
                  position="top"
                  style={{ fontSize: 10, fontWeight: 600 }}
                  formatter={(v) => formatCurrency(Number(v))}
                />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  )
}
