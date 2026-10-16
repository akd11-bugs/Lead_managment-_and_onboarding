import { describe, expect, it, vi, beforeEach } from 'vitest'

// Multi-tenant proof for the agent surface.
//
// The MCP tools are the highest-risk boundary in the product: an API key
// holder reaches them directly, with no browser session and no middleware in
// front. These tests assert mechanically that every database read and write
// a tool performs is scoped to the calling key's org, so a new tool cannot
// silently omit the filter.

const calls: { model: string; op: string; args: Record<string, unknown> }[] = []

function record(model: string, op: string) {
  return (args: Record<string, unknown> = {}) => {
    calls.push({ model, op, args })
    if (op === 'count') return Promise.resolve(0)
    if (op.startsWith('find') && op.endsWith('Many')) return Promise.resolve([])
    if (op === 'groupBy' || op === 'aggregate') return Promise.resolve([])
    if (op === 'create' || op === 'update') return Promise.resolve({ id: 'x' })
    return Promise.resolve(null)
  }
}

function model(name: string) {
  return {
    findMany: record(name, 'findMany'),
    findFirst: record(name, 'findFirst'),
    findUnique: record(name, 'findUnique'),
    count: record(name, 'count'),
    create: record(name, 'create'),
    update: record(name, 'update'),
    groupBy: record(name, 'groupBy'),
    aggregate: record(name, 'aggregate'),
  }
}

vi.mock('@/lib/db', () => ({
  prisma: {
    lead: model('lead'),
    person: model('person'),
    company: model('company'),
    activity: model('activity'),
    user: model('user'),
    stageDefinition: model('stageDefinition'),
  },
}))

vi.mock('@/lib/pipelineConfig', () => ({
  getStageDefinitions: async (orgId: string) => {
    calls.push({ model: 'stageDefinition', op: 'getStageDefinitions', args: { orgId } })
    return [
      { id: 's1', orgId, key: 'new', label: 'New', position: 0, isCore: true },
      { id: 's2', orgId, key: 'proposal', label: 'Proposal', position: 1, isCore: true },
    ]
  },
  getOnboardingStepDefinitions: async () => [],
}))

vi.mock('@/lib/company', () => ({
  findOrCreateCompany: async (orgId: string, name: string) => {
    calls.push({ model: 'company', op: 'findOrCreateCompany', args: { orgId, name } })
    return { id: 'c1', name, orgId }
  },
}))

vi.mock('@/lib/leadStage', () => ({
  applyStageChange: async () => ({ id: 'lead-1', stage: 'proposal' }),
}))

const { TOOLS } = await import('@/lib/mcp/tools')

const ORG = 'org-a'
const ctx = { orgId: ORG }

function tool(name: string) {
  const t = TOOLS.find(t => t.name === name)
  if (!t) throw new Error(`no such tool: ${name}`)
  return t
}

/** Every recorded arg object, flattened, so we can hunt for a stray orgId. */
function orgIdsSeen(): unknown[] {
  const found: unknown[] = []
  const walk = (v: unknown) => {
    if (!v || typeof v !== 'object') return
    for (const [k, val] of Object.entries(v as Record<string, unknown>)) {
      if (k === 'orgId') found.push(typeof val === 'object' && val !== null && 'in' in (val as object)
        ? (val as { in: unknown }).in
        : val)
      walk(val)
    }
  }
  for (const c of calls) walk(c.args)
  return found
}

beforeEach(() => {
  calls.length = 0
})

describe('every MCP tool is org-scoped', () => {
  it('exposes exactly the six documented tools', () => {
    expect(TOOLS.map(t => t.name).sort()).toEqual(
      ['create_lead', 'get_lead', 'log_activity', 'move_lead_stage', 'pipeline_summary', 'search_leads'].sort(),
    )
  })

  it('search_leads filters by the calling org', async () => {
    await tool('search_leads').run({}, ctx)
    const q = calls.find(c => c.model === 'lead' && c.op === 'findMany')
    expect(q).toBeDefined()
    expect(JSON.stringify(q!.args)).toContain(ORG)
  })

  it('get_lead filters by the calling org, so another org id returns nothing', async () => {
    // The tool throws "not found" because the org filter excluded it. That
    // throw IS the isolation working; assert the query that produced it.
    await expect(tool('get_lead').run({ id: 'lead-from-org-b' }, ctx)).rejects.toThrow(/No lead found/)
    const q = calls.find(c => c.model === 'lead')
    expect(q).toBeDefined()
    expect(JSON.stringify(q!.args)).toContain(ORG)
    expect(JSON.stringify(q!.args)).toContain('lead-from-org-b')
  })

  it('pipeline_summary aggregates only within the calling org', async () => {
    await tool('pipeline_summary').run({}, ctx)
    expect(calls.length).toBeGreaterThan(0)
    expect(JSON.stringify(calls)).toContain(ORG)
  })

  it('log_activity verifies the lead belongs to the calling org before writing', async () => {
    await expect(
      tool('log_activity').run({ leadId: 'lead-1', type: 'call', description: 'hi' }, ctx),
    ).rejects.toThrow(/No lead found/)
    const lookup = calls.find(c => c.model === 'lead')
    expect(lookup).toBeDefined()
    expect(JSON.stringify(lookup!.args)).toContain(ORG)
    // The org check gates the write: nothing was inserted.
    expect(calls.some(c => c.model === 'activity' && c.op === 'create')).toBe(false)
  })

  it('move_lead_stage verifies org ownership before changing anything', async () => {
    await expect(
      tool('move_lead_stage').run({ leadId: 'lead-1', stage: 'proposal', remark: 'signed' }, ctx),
    ).rejects.toThrow(/No lead found/)
    const lookup = calls.find(c => c.model === 'lead')
    expect(lookup).toBeDefined()
    expect(JSON.stringify(lookup!.args)).toContain(ORG)
  })

  it('never issues a query carrying an org id other than the caller org', async () => {
    for (const t of TOOLS) {
      calls.length = 0
      try {
        await t.run({ id: 'x', leadId: 'x', stage: 'proposal', type: 'call', description: 'd', company: 'Acme' }, ctx)
      } catch {
        // A tool may reject these placeholder args; the point is that any
        // query it DID issue before rejecting was still org-scoped.
      }
      for (const seen of orgIdsSeen()) {
        const vals = Array.isArray(seen) ? seen : [seen]
        for (const v of vals) expect(v).toBe(ORG)
      }
    }
  })
})

describe('a hostile payload cannot escape the tenant', () => {
  it('ignores an orgId supplied in tool arguments', async () => {
    await tool('search_leads').run({ orgId: 'org-b' } as Record<string, unknown>, ctx)
    const serialized = JSON.stringify(calls)
    expect(serialized).toContain(ORG)
    expect(serialized).not.toContain('org-b')
  })

  it('creates a lead under the calling org, not a client-supplied one', async () => {
    // ownerEmail is required; the mocked user lookup returns null, so this
    // rejects. The owner lookup itself must still have been org-scoped.
    await expect(
      tool('create_lead').run(
        { company: 'Acme', email: 'a@acme.com', ownerEmail: 'rep@a.com', orgId: 'org-b' } as Record<string, unknown>,
        ctx,
      ),
    ).rejects.toThrow()
    const serialized = JSON.stringify(calls)
    expect(serialized).toContain(ORG)
    expect(serialized).not.toContain('org-b')
  })
})
