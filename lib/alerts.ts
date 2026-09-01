// Computes which skills to suggest on the dashboard based on lead data.
// Pure functions — safe to call server-side.

import { SKILLS } from './skills/catalog'
import type { Lead } from '@/lib/types'

const DAY = 86400000

export interface Alert {
  skillId: string
  skillName: string
  reason: string
  metric: string
  severity: 'low' | 'medium' | 'high'
}

export function computeAlerts(leads: Lead[]): Alert[] {
  const now = Date.now()
  const alerts: Alert[] = []

  // Always-on skills
  for (const skill of SKILLS) {
    if (skill.alertWhen?.metric === 'always') {
      alerts.push({
        skillId: skill.id,
        skillName: skill.name,
        reason: 'Recommended every week',
        metric: 'always',
        severity: 'low',
      })
    }
  }

  // Stale leads (no activity past N days)
  const staleByDays = (window: number) =>
    leads.filter((l) => {
      if (!l.lastActivityAt) return true
      return now - new Date(l.lastActivityAt).getTime() > window * DAY
    })

  const stale45 = staleByDays(45)
  if (stale45.length >= 3) {
    const skill = SKILLS.find((s) => s.id === 'pipeline-hygiene-audit')!
    alerts.push({
      skillId: skill.id,
      skillName: skill.name,
      reason: `${stale45.length} leads with no activity past 45 days`,
      metric: 'staleLeadsCount',
      severity: stale45.length >= 8 ? 'high' : 'medium',
    })
  }

  // Ghosted — pending on the merchant or PSP's side with no activity 21+ days
  const ghosted = leads.filter((l) => {
    if (l.stage !== 'pending') return false
    if (l.pendingSubStatus !== 'pending_merchant' && l.pendingSubStatus !== 'pending_psp') return false
    if (!l.lastActivityAt) return true
    return now - new Date(l.lastActivityAt).getTime() > 21 * DAY
  })
  if (ghosted.length > 0) {
    const skill = SKILLS.find((s) => s.id === 'ghosted-after-the-demo')!
    alerts.push({
      skillId: skill.id,
      skillName: skill.name,
      reason: `${ghosted.length} lead${ghosted.length === 1 ? '' : 's'} pending on merchant/PSP, silent for 21+ days`,
      metric: 'qualifiedLeadsNoActivity',
      severity: 'high',
    })
  }

  // Follow-up needed — it's our turn and we haven't touched it in 14+ days
  const followUpOverdue = leads.filter((l) => {
    if (l.stage !== 'pending' || l.pendingSubStatus !== 'pending_ours') return false
    if (!l.lastActivityAt) return true
    return now - new Date(l.lastActivityAt).getTime() > 14 * DAY
  })
  if (followUpOverdue.length >= 2) {
    const skill = SKILLS.find((s) => s.id === 'sales-follow-up-speed-audit')!
    alerts.push({
      skillId: skill.id,
      skillName: skill.name,
      reason: `${followUpOverdue.length} lead${followUpOverdue.length === 1 ? '' : 's'} pending on our side without touch in 14+ days`,
      metric: 'followUpNeeded',
      severity: followUpOverdue.length >= 5 ? 'medium' : 'low',
    })
  }

  // Not Interested leads
  const lost = leads.filter((l) => l.stage === 'not_interested')
  if (lost.length >= 10) {
    const skill = SKILLS.find((s) => s.id === 'disqualification-reason-miner')!
    alerts.push({
      skillId: skill.id,
      skillName: skill.name,
      reason: `${lost.length} lost deals — patterns to mine`,
      metric: 'lostLeadsCount',
      severity: 'low',
    })
  }

  return alerts
}