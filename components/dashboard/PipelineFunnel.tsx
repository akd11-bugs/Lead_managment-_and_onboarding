'use client'

import { useId } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, Cell, LabelList } from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { formatCurrency, cn } from '@/lib/utils'
import { claymorphicBar } from './ClayBar'
import type { Stage } from '@/lib/types'
import { STAGES, STAGE_LABELS } from '@/lib/types'

const STAGE_HEX: Record<Stage, string> = {
  new: '#64748b',
  pending: '#f59e0b',
  onboarding: '#10b981',
  not_interested: '#f43f5e',
}

interface PipelineData {
  stage: Stage
  count: number
  value: number
}

export function PipelineFunnel({ data }: { data: PipelineData[] }) {
  const uid = useId().replace(/:/g, '')
  const router = useRouter()
  const byStage = new Map(data.map((d) => [d.stage, d]))
  const rows = STAGES.map((s) => ({
    stage: s,
    label: STAGE_LABELS[s],
    count: byStage.get(s)?.count ?? 0,
    value: byStage.get(s)?.value ?? 0,
  }))
  const totalLeads = rows.reduce((sum, r) => sum + r.count, 0)

  return (
    <Card className="clay-card">
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Pipeline by stage</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={rows} margin={{ top: 24, right: 8, left: 0, bottom: 8 }}>
              <XAxis
                dataKey="label"
                tickLine={false}
                axisLine={false}
                style={{ fontSize: 11 }}
                interval={0}
                angle={-15}
                textAnchor="end"
                height={50}
              />
              <YAxis allowDecimals={false} tickLine={false} axisLine={false} style={{ fontSize: 11 }} />
              <Tooltip
                cursor={{ fill: 'transparent' }}
                content={({ active, payload }) => {
                  if (!active || !payload?.length) return null
                  const d = payload[0].payload
                  return (
                    <div className="rounded-md border bg-popover px-3 py-2 text-xs shadow-md">
                      <p className="font-medium">{d.label}</p>
                      <p className="text-muted-foreground">{d.count} leads</p>
                      <p className="text-muted-foreground">{formatCurrency(d.value)}</p>
                    </div>
                  )
                }}
              />
              <Bar dataKey="count" shape={claymorphicBar(uid)} cursor="pointer" onClick={(d) => router.push(`/leads?stage=${d.payload.stage}`)}>
                {rows.map((r) => (
                  <Cell key={r.stage} fill={STAGE_HEX[r.stage]} />
                ))}
                <LabelList dataKey="count" position="top" style={{ fontSize: 11, fontWeight: 600 }} />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="grid grid-cols-4 gap-1 mt-2 text-center">
          {rows.map((r) => (
            <Link key={r.stage} href={`/leads?stage=${r.stage}`} className="text-[10px] rounded hover:bg-accent/60">
              <p className={cn('font-semibold tabular-nums')}>{formatCurrency(r.value)}</p>
            </Link>
          ))}
        </div>
        <div className="grid grid-cols-4 gap-1 mt-1 text-center">
          {rows.map((r) => (
            <Link
              key={r.stage}
              href={`/leads?stage=${r.stage}`}
              className="text-[10px] text-muted-foreground hover:underline"
            >
              {totalLeads === 0 ? '—' : `${Math.round((r.count / totalLeads) * 100)}% of pipeline`}
            </Link>
          ))}
        </div>
        <p className="mt-2 text-[10px] text-muted-foreground">
          Share of all current leads sitting in each stage right now — a snapshot of the current pipeline, not a cohort trend over time.
        </p>
      </CardContent>
    </Card>
  )
}