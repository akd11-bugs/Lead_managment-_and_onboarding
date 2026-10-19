'use client'

import { BarChart } from '@/components/charts/bar-chart'
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
//
// Uses Tremor's BarChart (components/charts/bar-chart.tsx) rather than a
// hand-rolled Recharts bar, per the user's request — Tremor's own closed
// color palette (blue/emerald/violet/...) applies here rather than our
// exact per-stage brand hexes, since there's one "Leads" series, not one
// color per bar.

export interface GenericStageDatum {
  stage: Stage
  count: number
  value: number
}

export function GenericPipelineChart({ data }: { data: GenericStageDatum[] }) {
  const byStage = new Map(data.map((d) => [d.stage, d]))
  const rows = STAGES.map((s) => ({
    label: STAGE_LABELS[s],
    Leads: byStage.get(s)?.count ?? 0,
    value: byStage.get(s)?.value ?? 0,
  }))
  const valueByLabel = new Map(rows.map((r) => [r.label, r.value]))

  return (
    <BarChart
      data={rows}
      index="label"
      categories={['Leads']}
      colors={['blue']}
      showLegend={false}
      allowDecimals={false}
      yAxisWidth={32}
      intervalType={0}
      // 5 fixed stage labels in a narrow card overlap at Recharts' own
      // default tick font size (16px — Tremor's text-xs utility doesn't
      // reach the actual SVG <text> node here), so this chart gets a
      // smaller tick size scoped to it rather than changing the shared
      // component's default. `recharts-cartesian-axis-tick-value` is
      // Recharts' real class name on the tick <text> element (confirmed via
      // DOM inspection — not `recharts-cartesian-axis-tick`, which only
      // wraps the <g>).
      className="h-56 [&_.recharts-cartesian-axis-tick-value]:text-[9px]"
      customTooltip={({ active, payload, label }) => {
        if (!active || !payload?.length) return null
        return (
          <div className="rounded-md border bg-popover px-3 py-2 text-xs shadow-md">
            <p className="font-medium">{label}</p>
            <p className="text-muted-foreground">{payload[0].value} leads</p>
            <p className="text-muted-foreground">{formatCurrency(valueByLabel.get(label) ?? 0)}</p>
          </div>
        )
      }}
    />
  )
}
