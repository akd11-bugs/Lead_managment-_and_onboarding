// Adds a synthetic second org so tenant isolation can be tested against real
// rows. Idempotent: wipes and recreates org-b-test on every run.
import { PrismaClient } from '@prisma/client'
const db = new PrismaClient()
const ORG_B = 'org-b-test'

for (const m of ['activity', 'lead', 'person', 'company', 'user', 'organization']) {
  await db[m].deleteMany({ where: m === 'organization' ? { id: ORG_B } : { orgId: ORG_B } })
}

const orgB = await db.organization.create({ data: { id: ORG_B, name: 'Northwind Traders' } })
await db.user.create({
  data: { id: 'user-b-admin', orgId: orgB.id, name: 'Beatrice Admin', email: 'admin@northwind.test', role: 'admin', isActive: true },
})
const salesB = await db.user.create({
  data: { id: 'user-b-sales', orgId: orgB.id, name: 'Bob Sales', email: 'bob@northwind.test', role: 'sales', isActive: true },
})
const companyB = await db.company.create({
  data: { id: 'company-b-1', orgId: orgB.id, name: 'Northwind Supply Co', normalizedName: 'northwind supply co' },
})
const personB = await db.person.create({ data: { id: 'person-b-1', orgId: orgB.id, name: 'Nina North' } })
const leadB = await db.lead.create({
  data: {
    id: 'lead-b-1', orgId: orgB.id, companyId: companyB.id, personId: personB.id,
    ownerId: salesB.id, ownerName: salesB.name, stage: 'new', source: 'referral',
    email: 'nina@northwind.test', estimatedVolume: 500000,
  },
})
await db.activity.create({
  data: { orgId: orgB.id, leadId: leadB.id, type: 'note', description: 'ORG-B-SECRET-ACTIVITY', authorName: 'Bob Sales' },
})
console.log(`seeded ${ORG_B}: 1 user-admin, 1 sales, 1 company, 1 person, 1 lead, 1 activity`)
await db.$disconnect()
