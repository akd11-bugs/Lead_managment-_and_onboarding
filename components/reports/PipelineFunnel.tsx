'use client'

import { FunnelChart, type FunnelStage } from '@/components/charts/funnel-chart'

export interface PipelineFunnelData {
  new: number
  pending: { key: string; label: string; count: number }[]
  onboarded: number
  live: number
}

export function PipelineFunnel({ data }: { data: PipelineFunnelData }) {
  const stages: FunnelStage[] = [
    { label: 'New', value: data.new },
    ...data.pending.map((p) => ({ label: p.label, value: p.count })),
    { label: 'Onboarded', value: data.onboarded },
    { label: 'Live', value: data.live },
  ]

  return <FunnelChart data={stages} color="#2a78d6" layers={3} />
}
