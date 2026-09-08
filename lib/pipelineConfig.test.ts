import { beforeEach, describe, expect, it, vi } from 'vitest'

const stageFindManyMock = vi.fn()
const stageCreateManyMock = vi.fn()
const stepFindManyMock = vi.fn()
const stepCreateManyMock = vi.fn()

vi.mock('@/lib/db', () => ({
  prisma: {
    stageDefinition: {
      findMany: (...args: unknown[]) => stageFindManyMock(...args),
      createMany: (...args: unknown[]) => stageCreateManyMock(...args),
    },
    onboardingStepDefinition: {
      findMany: (...args: unknown[]) => stepFindManyMock(...args),
      createMany: (...args: unknown[]) => stepCreateManyMock(...args),
    },
  },
}))

const { getStageDefinitions, getOnboardingStepDefinitions } = await import('@/lib/pipelineConfig')

const orgId = 'org-1'

beforeEach(() => {
  stageFindManyMock.mockReset()
  stageCreateManyMock.mockReset()
  stepFindManyMock.mockReset()
  stepCreateManyMock.mockReset()
})

describe('getStageDefinitions', () => {
  it('seeds the 5 core stages (matching lib/types.ts STAGES) on first read, all isCore: true', async () => {
    stageFindManyMock.mockResolvedValueOnce([]) // pre-seed check
    stageFindManyMock.mockResolvedValueOnce([
      // post-seed re-fetch — not asserting exact content here, just the seed call shape below
    ])
    await getStageDefinitions(orgId)

    expect(stageCreateManyMock).toHaveBeenCalledTimes(1)
    const seeded = stageCreateManyMock.mock.calls[0][0].data as { key: string; label: string; position: number; isCore: boolean }[]
    expect(seeded.map((s) => s.key)).toEqual(['new', 'pending', 'proposal', 'onboarding', 'not_interested'])
    expect(seeded.every((s) => s.isCore === true)).toBe(true)
    expect(seeded.map((s) => s.position)).toEqual([0, 1, 2, 3, 4])
    expect(seeded.find((s) => s.key === 'onboarding')?.label).toBe('Onboarding')
  })

  it('does not reseed when the org already has stage rows', async () => {
    const already = [{ id: '1', orgId, key: 'new', label: 'New', position: 0, isCore: true }]
    stageFindManyMock.mockResolvedValue(already)
    const result = await getStageDefinitions(orgId)
    expect(result).toBe(already)
    expect(stageCreateManyMock).not.toHaveBeenCalled()
  })
})

describe('getOnboardingStepDefinitions', () => {
  it('seeds the 4 core onboarding steps, with only the last (final_onboarded) marked isCore', async () => {
    stepFindManyMock.mockResolvedValueOnce([])
    stepFindManyMock.mockResolvedValueOnce([])
    await getOnboardingStepDefinitions(orgId)

    expect(stepCreateManyMock).toHaveBeenCalledTimes(1)
    const seeded = stepCreateManyMock.mock.calls[0][0].data as { key: string; position: number; isCore: boolean }[]
    expect(seeded.map((s) => s.key)).toEqual([
      'document_submission',
      'document_verification',
      'psp_verification',
      'final_onboarded',
    ])
    expect(seeded.filter((s) => s.isCore)).toHaveLength(1)
    expect(seeded.find((s) => s.isCore)?.key).toBe('final_onboarded')
  })

  it('does not reseed when the org already has step rows', async () => {
    const already = [{ id: '1', orgId, key: 'final_onboarded', label: 'Final onboarded', position: 0, isCore: true }]
    stepFindManyMock.mockResolvedValue(already)
    const result = await getOnboardingStepDefinitions(orgId)
    expect(result).toBe(already)
    expect(stepCreateManyMock).not.toHaveBeenCalled()
  })
})
