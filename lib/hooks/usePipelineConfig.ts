'use client'

import { useEffect, useState } from 'react'
import { BOARD_COLUMN_LABELS, BOARD_COLUMN_DESCRIPTIONS, BOARD_COLUMN_COLORS, PENDING_SUB_STATUSES } from '@/lib/types'

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

// Pending's 3 sub-statuses aren't part of this round's per-org
// configuration (only stages/onboarding-steps/custom-fields were asked
// for) — they stay the static values already in lib/types.ts. A custom
// stage never expands this way; only the literal 'pending' core stage does.
const PENDING_SUB_COLUMNS: BoardColumn[] = PENDING_SUB_STATUSES.map((key) => ({
  key,
  label: BOARD_COLUMN_LABELS[key],
  description: BOARD_COLUMN_DESCRIPTIONS[key],
  color: BOARD_COLUMN_COLORS[key],
}))

function buildBoardColumns(stages: StageOption[]): BoardColumn[] {
  return stages.flatMap((s) =>
    s.key === 'pending'
      ? PENDING_SUB_COLUMNS
      : [{
          key: s.key,
          label: s.label,
          description: s.description,
          color: s.color ?? BOARD_COLUMN_COLORS[s.key] ?? BOARD_COLUMN_COLORS.new,
        }]
  )
}

function shapeConfig(stages: StageOption[] | null, onboardingSteps: OnboardingStepOption[] | null) {
  const resolvedStages = stages ?? []
  const resolvedSteps = onboardingSteps ?? []

  return {
    stages: resolvedStages,
    onboardingSteps: resolvedSteps,
    columns: buildBoardColumns(resolvedStages),
    finalOnboardingStepKey: resolvedSteps.find((s) => s.isCore)?.key ?? 'final_onboarded',
    loading: stages === null || onboardingSteps === null,
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

  useEffect(() => {
    let cancelled = false
    fetch('/api/pipeline-config/stages')
      .then((r) => r.json())
      .then((d) => !cancelled && setStages(d.stages ?? []))
    fetch('/api/pipeline-config/onboarding-steps')
      .then((r) => r.json())
      .then((d) => !cancelled && setOnboardingSteps(d.steps ?? []))
    return () => {
      cancelled = true
    }
  }, [])

  return shapeConfig(stages, onboardingSteps)
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

  useEffect(() => {
    if (!loggedIn) return
    let cancelled = false
    fetch('/api/rep/pipeline-config')
      .then((r) => r.json())
      .then((d) => {
        if (cancelled) return
        setStages(d.stages ?? [])
        setOnboardingSteps(d.steps ?? [])
      })
    return () => {
      cancelled = true
    }
  }, [loggedIn])

  return shapeConfig(stages, onboardingSteps)
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
