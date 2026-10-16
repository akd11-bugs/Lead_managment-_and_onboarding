import { describe, expect, it, beforeAll, afterAll } from 'vitest'
import { PrismaClient } from '@prisma/client'

// INTEGRATION tests: a real Postgres, real Prisma, no mocks.
//
// The mocked route tests prove a handler SENDS the right where clause. They
// cannot prove Prisma interprets it correctly, or that the schema relations
// are right. These run the same filters against actual rows in two orgs:
// org A is the restored production backup (WTPL, 64 leads), org B is
// synthetic. A query that mixes them fails here and nowhere else.
//
// Requires: docker postgres on 5433, schema pushed, backup restored, org B
// seeded. Skipped automatically when TEST_DATABASE_URL is unset so CI and a
// normal `vitest run` are unaffected.

const url = process.env.TEST_DATABASE_URL
const maybe = url ? describe : describe.skip

const ORG_B = 'org-b-test'

let db: PrismaClient
let orgA: string

// Mirrors lib/session.ts leadScope() exactly.
function leadScope(u: { role: string; id: string; visibleOrgIds: string[] }) {
  return u.role === 'admin' || u.role === 'operations'
    ? { orgId: { in: u.visibleOrgIds } }
    : { orgId: { in: u.visibleOrgIds }, ownerId: u.id }
}

maybe('tenant isolation against a real database', () => {
  beforeAll(async () => {
    db = new PrismaClient({ datasources: { db: { url } } })
    const a = await db.organization.findFirst({ where: { NOT: { id: ORG_B } } })
    if (!a) throw new Error('org A missing — restore the backup first')
    orgA = a.id
  })

  afterAll(async () => {
    await db?.$disconnect()
  })

  it('the fixture really does contain two orgs with data', async () => {
    const [aLeads, bLeads] = await Promise.all([
      db.lead.count({ where: { orgId: orgA } }),
      db.lead.count({ where: { orgId: ORG_B } }),
    ])
    expect(aLeads).toBeGreaterThan(0)
    expect(bLeads).toBeGreaterThan(0)
  })

  it('an admin in org B sees none of org A\'s 64 real leads', async () => {
    const user = { role: 'admin', id: 'user-b-admin', visibleOrgIds: [ORG_B] }
    const leads = await db.lead.findMany({ where: leadScope(user) })
    expect(leads.length).toBeGreaterThan(0)
    expect(leads.every(l => l.orgId === ORG_B)).toBe(true)
  })

  it('an admin in org A sees none of org B\'s leads', async () => {
    const user = { role: 'admin', id: 'admin-a', visibleOrgIds: [orgA] }
    const leads = await db.lead.findMany({ where: leadScope(user) })
    expect(leads.every(l => l.orgId === orgA)).toBe(true)
    expect(leads.some(l => l.id === 'lead-b-1')).toBe(false)
  })

  it('fetching another org\'s lead BY ITS REAL ID returns nothing', async () => {
    // The strongest statement available: a genuine, existing primary key
    // from the other tenant, requested with the correct scope applied.
    const user = { role: 'admin', id: 'user-b-admin', visibleOrgIds: [ORG_B] }
    const aLead = await db.lead.findFirst({ where: { orgId: orgA } })
    expect(aLead).toBeTruthy()
    const stolen = await db.lead.findFirst({ where: { id: aLead!.id, ...leadScope(user) } })
    expect(stolen).toBeNull()
  })

  it('an unscoped query DOES return it — proving the scope is what blocks it', async () => {
    // Guards against a false pass: if the fixture were empty or the id wrong,
    // the test above would pass for the wrong reason.
    const aLead = await db.lead.findFirst({ where: { orgId: orgA } })
    const unscoped = await db.lead.findFirst({ where: { id: aLead!.id } })
    expect(unscoped).toBeTruthy()
    expect(unscoped!.orgId).toBe(orgA)
  })

  it('a sales user sees only their own leads, inside their own org', async () => {
    const user = { role: 'sales', id: 'user-b-sales', visibleOrgIds: [ORG_B] }
    const leads = await db.lead.findMany({ where: leadScope(user) })
    expect(leads.every(l => l.orgId === ORG_B && l.ownerId === 'user-b-sales')).toBe(true)
  })

  it('activities are isolated through the lead relation filter', async () => {
    const user = { role: 'admin', id: 'user-b-admin', visibleOrgIds: [ORG_B] }
    const acts = await db.activity.findMany({ where: { lead: leadScope(user) } })
    expect(acts.every(a => a.orgId === ORG_B)).toBe(true)
  })

  it('a foreign leadId cannot widen an activity query', async () => {
    const user = { role: 'admin', id: 'user-b-admin', visibleOrgIds: [ORG_B] }
    const aLead = await db.lead.findFirst({ where: { orgId: orgA } })
    const acts = await db.activity.findMany({
      where: { lead: leadScope(user), leadId: aLead!.id },
    })
    expect(acts).toHaveLength(0)
  })

  it('companies and people are org-isolated', async () => {
    const [companies, people] = await Promise.all([
      db.company.findMany({ where: { orgId: ORG_B } }),
      db.person.findMany({ where: { orgId: ORG_B } }),
    ])
    expect(companies.every(c => c.orgId === ORG_B)).toBe(true)
    expect(people.every(p => p.orgId === ORG_B)).toBe(true)
  })

  it('every lead row carries an orgId — no orphans in real restored data', async () => {
    const total = await db.lead.count()
    const scoped = await db.lead.count({ where: { OR: [{ orgId: orgA }, { orgId: ORG_B }] } })
    expect(scoped).toBe(total)
  })

  it('schema relations resolve: lead -> company -> org all agree', async () => {
    // A wrong @relation would surface here and in no mocked test.
    const leads = await db.lead.findMany({ include: { company: true }, take: 25 })
    for (const l of leads) {
      if (l.company) expect(l.company.orgId).toBe(l.orgId)
    }
  })

  it('two orgs can each have a rep with the SAME name', async () => {
    // The regression this guards: lib/repAuth.ts used to search User.name
    // across every org and accept a login only when exactly one match
    // existed anywhere, so a second tenant hiring a "Priya" locked out the
    // first tenant's Priya permanently. Scoping by orgId removes it.
    const name = 'Collision Test Rep'
    await db.user.deleteMany({ where: { name } })
    await db.user.create({
      data: { id: 'collide-a', orgId: orgA, name, email: 'collide-a@test.local', role: 'sales', isActive: true, pinHash: 'x' },
    })
    await db.user.create({
      data: { id: 'collide-b', orgId: ORG_B, name, email: 'collide-b@test.local', role: 'sales', isActive: true, pinHash: 'x' },
    })

    // The OLD global lookup is ambiguous...
    const globalMatches = await db.user.findMany({ where: { name: { equals: name, mode: 'insensitive' } } })
    expect(globalMatches.length).toBe(2)

    // ...while the NEW org-scoped lookup resolves exactly one per tenant.
    const inA = await db.user.findFirst({ where: { orgId: orgA, name: { equals: name, mode: 'insensitive' } } })
    const inB = await db.user.findFirst({ where: { orgId: ORG_B, name: { equals: name, mode: 'insensitive' } } })
    expect(inA?.id).toBe('collide-a')
    expect(inB?.id).toBe('collide-b')

    await db.user.deleteMany({ where: { name } })
  })

  it('every org has a slug for its rep login URL', async () => {
    const orgs = await db.organization.findMany({ select: { slug: true } })
    expect(orgs.every(o => o.slug)).toBe(true)
  })

  it('org slugs are unique, so a slug resolves to exactly one tenant', async () => {
    const slugs = (await db.organization.findMany({ select: { slug: true } })).map(o => o.slug)
    expect(new Set(slugs).size).toBe(slugs.length)
  })

  it('the restored production data is intact: 64 leads in org A', async () => {
    expect(await db.lead.count({ where: { orgId: orgA } })).toBe(64)
    expect(await db.company.count({ where: { orgId: orgA } })).toBe(64)
    expect(await db.user.count({ where: { orgId: orgA } })).toBe(8)
  })
})
