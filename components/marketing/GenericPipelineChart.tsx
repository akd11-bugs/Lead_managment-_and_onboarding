'use client'

import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, Cell, LabelList } from 'recharts'
import { STAGES, STAGE_LABELS, type Stage } from '@/lib/types'
import { formatCurrency } from '@/lib/utils'

// "Run your pipeline" needs a chart that reads as fintech-agnostic — the
// real PipelineFunnel always renders BOARD_COLUMNS, which includes the
// product's actual pending sub-stages (our side / merchant / PSP), a
// payments-specific breakdown that doesn't belong in a pitch aimed at any
// industry. This instead charts the real top-level Stage enum (new, pending,
// proposal, onboarding, not_interested) — the same stages every lead moves
// through regardless of what the business sells, used as-is on the real
// Kanban board, just without the fintech-only sub-status split.

const STAGE_COLORS: Record<Stage, string> = {
  new: '#5b8cff',
  pending: '#7f93c2',
  proposal: '#f0a44a',
  onboarding: '#2ecc9b',
  not_interested: '#4b5563',
}

export interface GenericStageDatum {
  stage: Stage
  count: number
  value: number
}

export function GenericPipelineChart({ data }: { data: GenericStageDatum[] }) {
  const byStage = new Map(data.map((d) => [d.stage, d]))
  const rows = STAGES.map((s) => ({
    stage: s,
    label: STAGE_LABELS[s],
    count: byStage.get(s)?.count ?? 0,
    value: byStage.get(s)?.value ?? 0,
  }))

  return (
    <div className="h-56">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={rows} margin={{ top: 24, right: 8, left: 0, bottom: 8 }}>
          <XAxis
            dataKey="label"
            tickLine={false}
            axisLine={false}
            style={{ fontSize: 11 }}
            interval={0}
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
          <Bar dataKey="count" radius={[4, 4, 0, 0]}>
            {rows.map((r) => (
              <Cell key={r.stage} fill={STAGE_COLORS[r.stage]} />
            ))}
            <LabelList dataKey="count" position="top" style={{ fontSize: 11, fontWeight: 600 }} />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
