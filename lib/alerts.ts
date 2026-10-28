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

// Maps a pending sub-status key to who it's waiting on — 'us' or
// 'external' — so the Ghosted/Follow-up alerts below work for any org's
// actual sub-statuses, not just the 3 seeded defaults. Falls back to the
// seeded defaults' own owner (pending_ours → us, everything else →
// external) for a caller that hasn't fetched PendingSubStatusDefinition
// rows, or for a key this org has since renamed/removed.
export type SubStatusOwnerMap = Record<string, 'us' | 'external'>

function ownerFor(key: string | null, ownerByKey: SubStatusOwnerMap): 'us' | 'external' | null {
  if (!key) return null
  if (key in ownerByKey) return ownerByKey[key]
  return key === 'pending_ours' ? 'us' : 'external'
}

export function computeAlerts(leads: Lead[], pendingSubStatusOwners: SubStatusOwnerMap = {}): Alert[] {
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

  // Ghosted — pending on an external party's side (merchant, PSP, or
  // whatever an org has renamed/added) with no activity 21+ days
  const ghosted = leads.filter((l) => {
    if (l.stage !== 'pending') return false
    if (ownerFor(l.pendingSubStatus, pendingSubStatusOwners) !== 'external') return false
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

  // Follow-up needed — it's our turn (any 'us'-owned sub-status) and we
  // haven't touched it in 14+ days
  const followUpOverdue = leads.filter((l) => {
    if (l.stage !== 'pending' || ownerFor(l.pendingSubStatus, pendingSubStatusOwners) !== 'us') return false
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