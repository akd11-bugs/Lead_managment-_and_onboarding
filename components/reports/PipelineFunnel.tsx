'use client'

import { FunnelChart, type FunnelStage } from '@/components/charts/funnel-chart'

export interface PipelineFunnelData {
  new: number
  pendingOurs: number
  pendingMerchant: number
  pendingPsp: number
  onboarded: number
  live: number
}

export function PipelineFunnel({ data }: { data: PipelineFunnelData }) {
  const stages: FunnelStage[] = [
    { label: 'New', value: data.new },
    { label: 'Pending — Our Side', value: data.pendingOurs },
    { label: 'Pending — Merchant', value: data.pendingMerchant },
    { label: 'Pending — PSP', value: data.pendingPsp },
    { label: 'Onboarded', value: data.onboarded },
    { label: 'Live', value: data.live },
  ]

  return <FunnelChart data={stages} color="#2a78d6" layers={3} />
}
