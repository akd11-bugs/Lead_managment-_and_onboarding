'use client'

import { FunnelChart, type FunnelStage } from '@/components/charts/funnel-chart'

export interface PipelineFunnelData {
  new: number
  followedUp: number
  qualified: number
  onboarded: number
  live: number
}

export function PipelineFunnel({ data }: { data: PipelineFunnelData }) {
  const stages: FunnelStage[] = [
    { label: 'New', value: data.new },
    { label: 'Followed up', value: data.followedUp },
    { label: 'Qualified', value: data.qualified },
    { label: 'Onboarded', value: data.onboarded },
    { label: 'Live', value: data.live },
  ]

  return <FunnelChart data={stages} color="#2a78d6" layers={3} />
}
