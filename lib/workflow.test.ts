import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Lead, WorkflowRule } from '@prisma/client'

const findManyMock = vi.fn()
const taskCreateMock = vi.fn()
const userFindUniqueMock = vi.fn()
const activityCreateMock = vi.fn()
const leadUpdateMock = vi.fn()
const sendEmailAsMock = vi.fn()

vi.mock('@/lib/db', () => ({
  prisma: {
    workflowRule: { findMany: (...args: unknown[]) => findManyMock(...args) },
    task: { create: (...args: unknown[]) => taskCreateMock(...args) },
    user: { findUnique: (...args: unknown[]) => userFindUniqueMock(...args) },
    activity: { create: (...args: unknown[]) => activityCreateMock(...args) },
    lead: { update: (...args: unknown[]) => leadUpdateMock(...args) },
  },
}))

vi.mock('@/lib/email', () => ({
  sendEmailAs: (...args: unknown[]) => sendEmailAsMock(...args),
}))

const { evaluateStageRules } = await import('@/lib/workflow')

function makeLead(overrides: Partial<Lead> = {}): Lead {
  return {
    id: 'lead-1',
    ownerId: 'owner-1',
    email: 'lead@example.com',
    lastActivityAt: new Date('2026-01-01'),
    ...overrides,
  } as Lead
}

function makeRule(overrides: Partial<WorkflowRule> = {}): WorkflowRule {
  return {
    id: 'rule-1',
    ownerId: 'owner-1',
    name: 'Test rule',
    triggerType: 'stage_changed',
    triggerConfig: JSON.stringify({ toStage: 'qualified' }),
    actionType: 'create_task',
    actionConfig: JSON.stringify({ title: 'Follow up' }),
    active: true,
    ...overrides,
  } as WorkflowRule
}

beforeEach(() => {
  vi.useRealTimers()
  findManyMock.mockReset()
  taskCreateMock.mockReset()
  userFindUniqueMock.mockReset()
  activityCreateMock.mockReset()
  leadUpdateMock.mockReset()
  sendEmailAsMock.mockReset()
  activityCreateMock.mockResolvedValue({ date: new Date('2026-02-02') })
})

describe('evaluateStageRules', () => {
  it('does nothing when no rules match the owner/trigger type', async () => {
    findManyMock.mockResolvedValue([])
    await evaluateStageRules(makeLead(), 'qualified')
    expect(taskCreateMock).not.toHaveBeenCalled()
    expect(sendEmailAsMock).not.toHaveBeenCalled()
  })

  it('skips a rule whose configured toStage does not match the new stage', async () => {
    findManyMock.mockResolvedValue([makeRule({ triggerConfig: JSON.stringify({ toStage: 'proposal' }) })])
    await evaluateStageRules(makeLead(), 'qualified')
    expect(taskCreateMock).not.toHaveBeenCalled()
  })

  it('silently ignores malformed JSON in triggerConfig instead of throwing', async () => {
    findManyMock.mockResolvedValue([makeRule({ triggerConfig: '{not json' })])
    await expect(evaluateStageRules(makeLead(), 'qualified')).resolves.toBeUndefined()
    expect(taskCreateMock).not.toHaveBeenCalled()
  })

  it('runs every matching rule, not just the first', async () => {
    findManyMock.mockResolvedValue([
      makeRule({ id: 'r1', actionConfig: JSON.stringify({ title: 'Task A' }) }),
      makeRule({ id: 'r2', actionConfig: JSON.stringify({ title: 'Task B' }) }),
    ])
    await evaluateStageRules(makeLead(), 'qualified')
    expect(taskCreateMock).toHaveBeenCalledTimes(2)
  })

  describe('create_task action', () => {
    it('creates a task with no due date when dueInDays is omitted', async () => {
      findManyMock.mockResolvedValue([makeRule({ actionConfig: JSON.stringify({ title: 'Call back' }) })])
      await evaluateStageRules(makeLead(), 'qualified')
      expect(taskCreateMock).toHaveBeenCalledWith({
        data: expect.objectContaining({ leadId: 'lead-1', title: 'Call back', dueDate: null, source: 'sequence', ownerId: 'owner-1' }),
      })
    })

    it('computes dueDate as now + dueInDays', async () => {
      vi.useFakeTimers()
      vi.setSystemTime(new Date('2026-03-01T00:00:00.000Z'))
      findManyMock.mockResolvedValue([makeRule({ actionConfig: JSON.stringify({ title: 'Follow up', dueInDays: 3 }) })])
      await evaluateStageRules(makeLead(), 'qualified')
      const call = taskCreateMock.mock.calls[0][0]
      expect(call.data.dueDate.toISOString()).toBe('2026-03-04T00:00:00.000Z')
      vi.useRealTimers()
    })

    it('skips creating a task when actionConfig has no title', async () => {
      findManyMock.mockResolvedValue([makeRule({ actionConfig: JSON.stringify({}) })])
      await evaluateStageRules(makeLead(), 'qualified')
      expect(taskCreateMock).not.toHaveBeenCalled()
    })
  })

  describe('send_email action', () => {
    function emailRule(overrides: Partial<WorkflowRule> = {}) {
      return makeRule({
        actionType: 'send_email',
        actionConfig: JSON.stringify({ subject: 'Hi', body: 'Body text' }),
        ...overrides,
      })
    }

    it('sends to the lead email by default, logs the activity, and updates lastActivityAt', async () => {
      findManyMock.mockResolvedValue([emailRule()])
      sendEmailAsMock.mockResolvedValue({ id: 'msg-1' })
      const lead = makeLead({ email: 'lead@example.com' })
      await evaluateStageRules(lead, 'qualified')

      expect(sendEmailAsMock).toHaveBeenCalledWith('owner-1', { to: 'lead@example.com', subject: 'Hi', body: 'Body text' })
      expect(activityCreateMock).toHaveBeenCalledWith({
        data: expect.objectContaining({
          leadId: 'lead-1',
          type: 'email',
          description: expect.stringContaining('Sent: "Hi"'),
        }),
      })
      expect(leadUpdateMock).toHaveBeenCalledWith({ where: { id: 'lead-1' }, data: { lastActivityAt: new Date('2026-02-02') } })
    })

    it('skips silently when the lead has no email and "to" is not set to owner', async () => {
      findManyMock.mockResolvedValue([emailRule()])
      await evaluateStageRules(makeLead({ email: '' }), 'qualified')
      expect(sendEmailAsMock).not.toHaveBeenCalled()
      expect(activityCreateMock).not.toHaveBeenCalled()
    })

    it('sends to the rule owner\'s email when to="owner", using an "Automation —" prefix and "Notified owner:" description', async () => {
      findManyMock.mockResolvedValue([emailRule({ actionConfig: JSON.stringify({ subject: 'Heads up', body: 'Moved stage', to: 'owner' }) })])
      userFindUniqueMock.mockResolvedValue({ email: 'owner@example.com' })
      sendEmailAsMock.mockResolvedValue({ id: 'msg-2' })
      await evaluateStageRules(makeLead(), 'qualified')

      expect(userFindUniqueMock).toHaveBeenCalledWith({ where: { id: 'owner-1' }, select: { email: true } })
      expect(sendEmailAsMock).toHaveBeenCalledWith('owner-1', { to: 'owner@example.com', subject: 'Heads up', body: 'Moved stage' })
      expect(activityCreateMock).toHaveBeenCalledWith({
        data: expect.objectContaining({ description: expect.stringContaining('Notified owner: "Heads up"') }),
      })
    })

    it('skips when to="owner" but the owner user has no email on file', async () => {
      findManyMock.mockResolvedValue([emailRule({ actionConfig: JSON.stringify({ subject: 'Heads up', body: 'Moved stage', to: 'owner' }) })])
      userFindUniqueMock.mockResolvedValue({ email: null })
      await evaluateStageRules(makeLead(), 'qualified')
      expect(sendEmailAsMock).not.toHaveBeenCalled()
    })

    it('skips when actionConfig is missing subject or body', async () => {
      findManyMock.mockResolvedValue([emailRule({ actionConfig: JSON.stringify({ subject: 'Only subject' }) })])
      await evaluateStageRules(makeLead(), 'qualified')
      expect(sendEmailAsMock).not.toHaveBeenCalled()
    })

    it('propagates a send failure instead of swallowing it, and does not log an activity for a send that never went out', async () => {
      findManyMock.mockResolvedValue([emailRule()])
      sendEmailAsMock.mockRejectedValue(new Error('SMTP auth failed'))
      await expect(evaluateStageRules(makeLead(), 'qualified')).rejects.toThrow('SMTP auth failed')
      expect(activityCreateMock).not.toHaveBeenCalled()
      expect(leadUpdateMock).not.toHaveBeenCalled()
    })
  })
})
