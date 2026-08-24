import type { Lead, WorkflowRule } from '@prisma/client'
import { prisma } from '@/lib/db'
import { sendEmailAs } from '@/lib/email'

interface StageChangedTrigger {
  toStage: string
}

interface CreateTaskAction {
  title: string
  dueInDays?: number
}

interface SendEmailAction {
  subject: string
  body: string
  to?: 'lead' | 'owner'
}

function parseJson<T>(value: string): T | null {
  try {
    return JSON.parse(value) as T
  } catch {
    return null
  }
}

/**
 * Runs any of the acting rep's active "stage changed" rules that match the
 * lead's new stage. Evaluated inline at the one call site that produces this
 * trigger today — not a generic event bus, since there's only one.
 */
export async function evaluateStageRules(lead: Lead, newStage: string): Promise<void> {
  const rules = await prisma.workflowRule.findMany({
    where: { ownerId: lead.ownerId, triggerType: 'stage_changed', active: true },
  })

  for (const rule of rules) {
    const trigger = parseJson<StageChangedTrigger>(rule.triggerConfig)
    if (trigger?.toStage !== newStage) continue
    await runAction(rule, lead)
  }
}

async function runAction(rule: WorkflowRule, lead: Lead): Promise<void> {
  if (rule.actionType === 'create_task') {
    const config = parseJson<CreateTaskAction>(rule.actionConfig)
    if (!config?.title) return
    await prisma.task.create({
      data: {
        leadId: lead.id,
        title: config.title,
        dueDate: config.dueInDays ? new Date(Date.now() + config.dueInDays * 24 * 60 * 60 * 1000) : null,
        source: 'sequence',
        ownerId: lead.ownerId,
      },
    })
    return
  }

  if (rule.actionType === 'send_email') {
    const config = parseJson<SendEmailAction>(rule.actionConfig)
    if (!config?.subject || !config?.body) return

    let to: string | null = lead.email || null
    if (config.to === 'owner') {
      const owner = await prisma.user.findUnique({ where: { id: rule.ownerId }, select: { email: true } })
      to = owner?.email ?? null
    }
    if (!to) return

    await sendEmailAs(rule.ownerId, { to, subject: config.subject, body: config.body })
  }
}
