'use client'

import { useId } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, Cell, LabelList } from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { formatCurrency } from '@/lib/utils'
import { claymorphicBar } from './ClayBar'

// Categorical palette slots 1–3 (blue, orange, aqua) — validated for CVD + contrast
// via the dataviz skill's validate_palette.js, adjacent pairlist, light + dark.
const REP_COLORS = ['#2a78d6', '#eb6834', '#1baf7a']

export interface RepPerformanceRow {
  ownerName: string
  openValue: number
  totalLeads: number
  winRate: number // 0-100, or -1 if no closed deals yet
}

export function RepPerformance({ rows }: { rows: RepPerformanceRow[] }) {
  const uid = useId().replace(/:/g, '')
  const router = useRouter()
  return (
    <Card className="clay-card">
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Rep performance</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-56">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={rows} margin={{ top: 20, right: 8, left: 0, bottom: 8 }}>
              <XAxis dataKey="ownerName" tickLine={false} axisLine={false} style={{ fontSize: 11 }} />
              <YAxis allowDecimals={false} tickLine={false} axisLine={false} style={{ fontSize: 11 }} />
              <Tooltip
                cursor={{ fill: 'transparent' }}
                content={({ active, payload }) => {
                  if (!active || !payload?.length) return null
                  const d = payload[0].payload as RepPerformanceRow
                  return (
                    <div className="rounded-md border bg-popover px-3 py-2 text-xs shadow-md">
                      <p className="font-medium">{d.ownerName}</p>
                      <p className="text-muted-foreground">{formatCurrency(d.openValue)} open pipeline</p>
                      <p className="text-muted-foreground">{d.totalLeads} leads</p>
                      <p className="text-muted-foreground">
                        {d.winRate >= 0 ? `${d.winRate}% win rate` : 'No closed deals yet'}
                      </p>
                    </div>
                  )
                }}
              />
              <Bar
                dataKey="openValue"
                shape={claymorphicBar(uid)}
                cursor="pointer"
                onClick={(d) => router.push(`/leads?owner=${encodeURIComponent(d.payload.ownerName)}`)}
              >
                {rows.map((r, i) => (
                  <Cell key={r.ownerName} fill={REP_COLORS[i % REP_COLORS.length]} />
                ))}
                <LabelList
                  dataKey="openValue"
                  position="top"
                  style={{ fontSize: 11, fontWeight: 600 }}
                  formatter={(v) => formatCurrency(Number(v))}
                />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="grid gap-1 mt-2" style={{ gridTemplateColumns: `repeat(${rows.length}, 1fr)` }}>
          {rows.map((r) => (
            <Link
              key={r.ownerName}
              href={`/leads?owner=${encodeURIComponent(r.ownerName)}`}
              className="text-center text-[10px] text-muted-foreground hover:underline"
            >
              {r.winRate >= 0 ? `${r.winRate}% win rate` : 'no closed deals'}
            </Link>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
