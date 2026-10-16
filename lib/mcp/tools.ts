import { prisma } from '@/lib/db'
import { validateLeadFields, STAGES } from '@/lib/types'
import { getStageDefinitions } from '@/lib/pipelineConfig'
import { findOrCreateCompany } from '@/lib/company'
import { applyStageChange } from '@/lib/leadStage'
import { AGENT_ACTOR_NAME } from '@/lib/agentAuth'
import type { ToolDef } from './protocol'

export interface McpCtx {
  orgId: string
}

// Tools deliberately mirror app/api/agent/v1/* rather than reaching into
// Prisma with their own rules: same validation, same duplicate checks, same
// applyStageChange path the UI uses. An agent should not be able to create a
// record a human couldn't, and stage changes must still write an Activity.

const MAX_LIMIT = 200

function str(v: unknown): string | undefined {
  if (typeof v !== 'string') return undefined
  const t = v.trim()
  return t === '' ? undefined : t
}

export const TOOLS: ToolDef<McpCtx>[] = [
  {
    name: 'search_leads',
    description:
      'Search leads in this workspace. Filter by free-text query (matches company name, contact name, or email) and/or pipeline stage. Returns up to `limit` leads plus a nextCursor for paging.',
    inputSchema: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Free text matched against company, contact name, and email' },
        stage: { type: 'string', description: 'Pipeline stage key, e.g. "new", "proposal"' },
        limit: { type: 'number', description: `Max leads to return (default 25, max ${MAX_LIMIT})` },
        cursor: { type: 'string', description: 'nextCursor from a previous call, to fetch the next page' },
      },
    },
    async run(args, ctx) {
      const q = str(args.query)
      const stage = str(args.stage)
      const cursor = str(args.cursor)
      const rawLimit = typeof args.limit === 'number' ? args.limit : 25
      const limit = Math.min(Math.max(Math.floor(rawLimit), 1), MAX_LIMIT)

      const rows = await prisma.lead.findMany({
        where: {
          orgId: ctx.orgId,
          ...(stage ? { stage } : {}),
          ...(q
            ? {
                OR: [
                  { email: { contains: q, mode: 'insensitive' } },
                  { company: { name: { contains: q, mode: 'insensitive' } } },
                  { person: { name: { contains: q, mode: 'insensitive' } } },
                ],
              }
            : {}),
        },
        include: { company: true, person: true },
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        take: limit + 1,
        ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      })

      const hasMore = rows.length > limit
      const page = hasMore ? rows.slice(0, limit) : rows

      return JSON.stringify(
        {
          count: page.length,
          nextCursor: hasMore ? page[page.length - 1].id : null,
          leads: page.map((l) => ({
            id: l.id,
            company: l.company?.name ?? null,
            contact: l.person?.name ?? null,
            email: l.email,
            phone: l.phone,
            stage: l.stage,
            source: l.source,
            estimatedVolume: l.estimatedVolume,
            owner: l.ownerName,
            lastActivityAt: l.lastActivityAt,
          })),
        },
        null,
        2,
      )
    },
  },

  {
    name: 'get_lead',
    description:
      'Fetch one lead by id, including its full activity timeline and open tasks. Use after search_leads when you need detail.',
    inputSchema: {
      type: 'object',
      properties: { id: { type: 'string', description: 'Lead id' } },
      required: ['id'],
    },
    async run(args, ctx) {
      const id = str(args.id)
      if (!id) throw new Error('id is required')

      // orgId in the where clause is the tenant boundary: another org's id
      // simply doesn't match, so it reads as "not found" rather than denied.
      const lead = await prisma.lead.findFirst({
        where: { id, orgId: ctx.orgId },
        include: {
          company: true,
          person: true,
          activities: { orderBy: { date: 'desc' }, take: 50 },
          tasks: { where: { done: false }, orderBy: { dueDate: 'asc' }, take: 20 },
        },
      })
      if (!lead) throw new Error(`No lead found with id ${id}`)

      return JSON.stringify(
        {
          id: lead.id,
          company: lead.company?.name ?? null,
          contact: lead.person?.name ?? null,
          email: lead.email,
          phone: lead.phone,
          stage: lead.stage,
          source: lead.source,
          industry: lead.industry,
          estimatedVolume: lead.estimatedVolume,
          owner: lead.ownerName,
          notes: lead.notes,
          lastActivityAt: lead.lastActivityAt,
          activities: lead.activities.map((a) => ({
            type: a.type,
            date: a.date,
            author: a.authorName,
            description: a.description,
          })),
          openTasks: lead.tasks.map((t) => ({ title: t.title, dueDate: t.dueDate })),
        },
        null,
        2,
      )
    },
  },

  {
    name: 'create_lead',
    description:
      'Create a lead. Requires company, email, and ownerEmail (an active user in this workspace who will own it). Returns 409-style duplicate info instead of creating when a lead with the same email exists, unless force is true.',
    inputSchema: {
      type: 'object',
      properties: {
        company: { type: 'string', description: 'Company name' },
        email: { type: 'string', description: 'Contact email' },
        ownerEmail: { type: 'string', description: 'Email of the rep who should own this lead' },
        contactName: { type: 'string' },
        phone: { type: 'string' },
        stage: { type: 'string', description: 'Pipeline stage key; defaults to the first stage' },
        source: { type: 'string' },
        estimatedVolume: { type: 'number' },
        notes: { type: 'string' },
        force: { type: 'boolean', description: 'Create even if a duplicate email exists' },
      },
      required: ['company', 'email', 'ownerEmail'],
    },
    async run(args, ctx) {
      const company = str(args.company)
      const email = str(args.email)
      const ownerEmail = str(args.ownerEmail)
      if (!company || !email || !ownerEmail) {
        throw new Error('company, email and ownerEmail are all required')
      }

      const owner = await prisma.user.findFirst({
        where: { orgId: ctx.orgId, email: { equals: ownerEmail, mode: 'insensitive' }, isActive: true },
        select: { id: true, name: true },
      })
      if (!owner) throw new Error(`ownerEmail "${ownerEmail}" is not an active user in this workspace`)

      const stageDefs = await getStageDefinitions(ctx.orgId)
      const payload = {
        company,
        email,
        person: str(args.contactName),
        phone: str(args.phone),
        stage: str(args.stage) ?? stageDefs[0]?.key,
        source: str(args.source),
        estimatedVolume: typeof args.estimatedVolume === 'number' ? args.estimatedVolume : undefined,
        notes: str(args.notes),
      }
      const invalid = validateLeadFields(payload, { validStageKeys: stageDefs.map((s) => s.key) })
      if (invalid) throw new Error(invalid)

      if (args.force !== true) {
        const dupe = await prisma.lead.findFirst({
          where: { orgId: ctx.orgId, email: { equals: email, mode: 'insensitive' } },
          select: { id: true, email: true, company: { select: { name: true } } },
        })
        if (dupe) {
          return JSON.stringify({
            created: false,
            reason: 'duplicate',
            message: `A lead with email ${dupe.email} already exists ("${dupe.company?.name}"). Call again with force: true to create anyway.`,
            existingLeadId: dupe.id,
          })
        }
      }

      const companyRow = await findOrCreateCompany(ctx.orgId, company)
      if (!companyRow) throw new Error('Could not resolve company')

      const lead = await prisma.lead.create({
        data: {
          orgId: ctx.orgId,
          companyId: companyRow.id,
          email,
          phone: payload.phone ?? null,
          stage: payload.stage ?? stageDefs[0].key,
          source: payload.source ?? 'other',
          estimatedVolume: payload.estimatedVolume ?? 0,
          notes: payload.notes ?? '',
          ownerId: owner.id,
          ownerName: owner.name,
        },
        select: { id: true },
      })

      return JSON.stringify({ created: true, leadId: lead.id })
    },
  },

  {
    name: 'log_activity',
    description:
      'Log an activity (call, email, note, meeting) against a lead. Appears in the lead timeline attributed to the AI agent, never to a human user.',
    inputSchema: {
      type: 'object',
      properties: {
        leadId: { type: 'string' },
        type: { type: 'string', description: 'call | email | note | meeting' },
        description: { type: 'string' },
      },
      required: ['leadId', 'type', 'description'],
    },
    async run(args, ctx) {
      const leadId = str(args.leadId)
      const type = str(args.type)
      const description = str(args.description)
      if (!leadId || !type || !description) throw new Error('leadId, type and description are required')

      const lead = await prisma.lead.findFirst({ where: { id: leadId, orgId: ctx.orgId }, select: { id: true } })
      if (!lead) throw new Error(`No lead found with id ${leadId}`)

      const now = new Date()
      // Both statements in one transaction: creating the activity without
      // bumping lastActivityAt leaves the lead looking stale and liable to be
      // flagged by the 21-day alert.
      await prisma.$transaction([
        prisma.activity.create({
          data: { orgId: ctx.orgId, leadId: lead.id, type, description, date: now, authorName: AGENT_ACTOR_NAME },
        }),
        prisma.lead.update({ where: { id: lead.id }, data: { lastActivityAt: now } }),
      ])

      return JSON.stringify({ logged: true, leadId: lead.id })
    },
  },

  {
    name: 'move_lead_stage',
    description:
      'Move a lead to a different pipeline stage. A remark is required — one line on what actually happened. Fires the workspace’s configured workflow rules exactly as a human dragging the card on the board would.',
    inputSchema: {
      type: 'object',
      properties: {
        leadId: { type: 'string' },
        stage: { type: 'string', description: 'Target stage key' },
        remark: { type: 'string', description: 'Required. What happened, in one line.' },
      },
      required: ['leadId', 'stage', 'remark'],
    },
    async run(args, ctx) {
      const leadId = str(args.leadId)
      const stage = str(args.stage)
      const remark = str(args.remark)
      if (!leadId || !stage) throw new Error('leadId and stage are required')
      // Same requirement the HTTP route enforces — the timeline entry is
      // worthless without it, and an agent should not get a pass a rep doesn't.
      if (!remark) throw new Error('remark is required — what happened, in one line')

      const lead = await prisma.lead.findFirst({
        where: { id: leadId, orgId: ctx.orgId },
        include: { company: true, person: true },
      })
      if (!lead) throw new Error(`No lead found with id ${leadId}`)

      const stageDefs = await getStageDefinitions(ctx.orgId)
      const invalid = validateLeadFields({ stage }, { validStageKeys: stageDefs.map((s) => s.key) })
      if (invalid) throw new Error(invalid)

      // validateLeadFields has confirmed `stage` is one of the org's stage
      // keys, which are exactly the Stage union — narrow it for the typed
      // applyStageChange signature.
      const typedStage = STAGES.find((s) => s === stage)
      if (!typedStage) {
        throw new Error(`Unknown stage "${stage}". Valid stages: ${STAGES.join(', ')}`)
      }

      const updated = await applyStageChange(lead.id, lead, { stage: typedStage, remark }, { name: AGENT_ACTOR_NAME })

      return JSON.stringify({ moved: true, leadId: updated.id, from: lead.stage, to: updated.stage })
    },
  },

  {
    name: 'pipeline_summary',
    description:
      'Counts and total estimated value per pipeline stage for this workspace. Use for "how is the pipeline looking" questions instead of paging through every lead.',
    inputSchema: { type: 'object', properties: {} },
    async run(_args, ctx) {
      const [stageDefs, grouped] = await Promise.all([
        getStageDefinitions(ctx.orgId),
        prisma.lead.groupBy({
          by: ['stage'],
          where: { orgId: ctx.orgId },
          _count: { _all: true },
          _sum: { estimatedVolume: true },
        }),
      ])

      const byStage = new Map(grouped.map((g) => [g.stage, g]))
      return JSON.stringify(
        {
          stages: stageDefs.map((s) => ({
            stage: s.key,
            label: s.label,
            leads: byStage.get(s.key)?._count._all ?? 0,
            estimatedValue: byStage.get(s.key)?._sum.estimatedVolume ?? 0,
          })),
        },
        null,
        2,
      )
    },
  },
]
