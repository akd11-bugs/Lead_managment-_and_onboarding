'use client'

import { useEffect, useState } from 'react'
import { BOARD_COLUMN_COLORS } from '@/lib/types'

export interface StageOption {
  id: string
  key: string
  label: string
  description: string | null
  color: string | null
  isCore: boolean
}

export interface OnboardingStepOption {
  id: string
  key: string
  label: string
  isCore: boolean
}

export interface PendingSubStatusOption {
  id: string
  key: string
  label: string
  owner: 'us' | 'external'
  isDefault: boolean
}

export interface BoardColumn {
  key: string
  label: string
  description: string | null
  color: string | null
}

// A column's `color` comes from its org-customizable StageDefinition row
// when an admin has set one (see components/settings/PipelineConfigCard.tsx)
// — every core stage seeds with `color: null` (lib/pipelineConfig.ts), so it
// falls back to BOARD_COLUMN_COLORS (lib/types.ts — shared with the
// dashboard charts, so the Kanban board and the charts never disagree on
// what a stage's color means). A custom (non-core) stage with no color set
// falls back to BOARD_COLUMN_COLORS.new — the same neutral 'new' uses.

// Pending's sub-statuses expand into one column per the org's actual
// PendingSubStatusDefinition rows (fully admin add/remove/rename-able — see
// that model's doc comment in prisma/schema.prisma) instead of a fixed
// 3-column list. All share the same neutral pending color since they're not
// individually colorable the way top-level stages are.
function buildBoardColumns(stages: StageOption[], pendingSubStatuses: PendingSubStatusOption[]): BoardColumn[] {
  return stages.flatMap((s) =>
    s.key === 'pending'
      ? pendingSubStatuses.map((p) => ({
          key: p.key,
          label: p.label,
          description: p.owner === 'us' ? 'Our turn to follow up' : 'Waiting on them to act',
          color: BOARD_COLUMN_COLORS.pending_ours,
        }))
      : [{
          key: s.key,
          label: s.label,
          description: s.description,
          color: s.color ?? BOARD_COLUMN_COLORS[s.key] ?? BOARD_COLUMN_COLORS.new,
        }]
  )
}

function shapeConfig(
  stages: StageOption[] | null,
  onboardingSteps: OnboardingStepOption[] | null,
  pendingSubStatuses: PendingSubStatusOption[] | null,
) {
  const resolvedStages = stages ?? []
  const resolvedSteps = onboardingSteps ?? []
  const resolvedPendingSubStatuses = pendingSubStatuses ?? []

  return {
    stages: resolvedStages,
    onboardingSteps: resolvedSteps,
    pendingSubStatuses: resolvedPendingSubStatuses,
    columns: buildBoardColumns(resolvedStages, resolvedPendingSubStatuses),
    finalOnboardingStepKey: resolvedSteps.find((s) => s.isCore)?.key ?? 'final_onboarded',
    loading: stages === null || onboardingSteps === null || pendingSubStatuses === null,
  }
}

// Fetches the caller's org-scoped pipeline configuration once (stages +
// onboarding steps), seeded server-side on first read if the org has none
// yet (see lib/pipelineConfig.ts) — every Kanban/lead-form component that
// used to import STAGES/BOARD_COLUMNS/ONBOARDING_SUB_STAGES directly from
// lib/types.ts uses this instead, so a Settings-side rename/custom-stage
// actually shows up everywhere else in the app.
//
// Only for a regular (Google/password) session — the backing routes are
// admin/sales/ops-authenticated and 401 a rep session. RepForm uses
// useRepPipelineConfig below instead.
export function usePipelineConfig() {
  const [stages, setStages] = useState<StageOption[] | null>(null)
  const [onboardingSteps, setOnboardingSteps] = useState<OnboardingStepOption[] | null>(null)
  const [pendingSubStatuses, setPendingSubStatuses] = useState<PendingSubStatusOption[] | null>(null)

  useEffect(() => {
    let cancelled = false
    fetch('/api/pipeline-config/stages')
      .then((r) => r.json())
      .then((d) => !cancelled && setStages(d.stages ?? []))
    fetch('/api/pipeline-config/onboarding-steps')
      .then((r) => r.json())
      .then((d) => !cancelled && setOnboardingSteps(d.steps ?? []))
    fetch('/api/pipeline-config/pending-sub-statuses')
      .then((r) => r.json())
      .then((d) => !cancelled && setPendingSubStatuses(d.subStatuses ?? []))
    return () => {
      cancelled = true
    }
  }, [])

  return shapeConfig(stages, onboardingSteps, pendingSubStatuses)
}

// Rep-session equivalent, backed by the single combined
// GET /api/rep/pipeline-config route (a rep session can't call the
// admin-authenticated /api/pipeline-config/* routes above). `loggedIn` must
// gate the fetch (same convention as RepForm's own lead-search effect) —
// RepForm renders before PIN login, when there's no rep_session cookie yet,
// so an unconditional fetch here would always 401 and never retry.
export function useRepPipelineConfig(loggedIn: boolean) {
  const [stages, setStages] = useState<StageOption[] | null>(null)
  const [onboardingSteps, setOnboardingSteps] = useState<OnboardingStepOption[] | null>(null)
  const [pendingSubStatuses, setPendingSubStatuses] = useState<PendingSubStatusOption[] | null>(null)

  useEffect(() => {
    if (!loggedIn) return
    let cancelled = false
    fetch('/api/rep/pipeline-config')
      .then((r) => r.json())
      .then((d) => {
        if (cancelled) return
        setStages(d.stages ?? [])
        setOnboardingSteps(d.steps ?? [])
        setPendingSubStatuses(d.pendingSubStatuses ?? [])
      })
    return () => {
      cancelled = true
    }
  }, [loggedIn])

  return shapeConfig(stages, onboardingSteps, pendingSubStatuses)
}

export interface LeadFieldOption {
  id: string
  key: string
  label: string
  type: 'text' | 'number' | 'date' | 'select'
  options: string[] | null
  required: boolean
}

// Fetches the caller's org-scoped custom lead field definitions once.
export function useLeadFieldDefinitions() {
  const [fields, setFields] = useState<LeadFieldOption[] | null>(null)

  useEffect(() => {
    let cancelled = false
    fetch('/api/lead-field-definitions')
      .then((r) => r.json())
      .then((d) => !cancelled && setFields(d.fields ?? []))
    return () => {
      cancelled = true
    }
  }, [])

  return { fields: fields ?? [], loading: fields === null }
}
