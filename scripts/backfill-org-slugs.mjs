// Gives every existing organisation a slug for its /rep/<slug> field-rep
// login page. Orgs created from now on get one automatically
// (lib/org.ts createOrganization); this is for rows that predate that.
//
// Idempotent: orgs that already have a slug are left untouched.
//
// NOTE: the slugify rules here mirror lib/orgSlug.ts. That file is
// TypeScript and this script runs as plain node, so the logic is duplicated
// deliberately — keep the two in sync if either changes.
import { PrismaClient } from '@prisma/client'
const db = new PrismaClient()

const RESERVED = new Set(['api', 'login', 'logout', 'signup', 'rep', 'admin', 'settings', 'new', 'static', '_next'])

const slugify = (name) => {
  const base = name.toLowerCase().trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40)
    .replace(/-+$/, '')
  return base || 'org'
}

const orgs = await db.organization.findMany({ select: { id: true, name: true, slug: true } })
const taken = new Set(orgs.map(o => o.slug).filter(Boolean))
let assigned = 0

for (const org of orgs) {
  if (org.slug) {
    console.log(`${org.name.padEnd(28)} already /rep/${org.slug}`)
    continue
  }
  const base = slugify(org.name)
  let candidate = RESERVED.has(base) ? `${base}-org` : base
  let n = 2
  while (taken.has(candidate)) candidate = `${base}-${n++}`
  taken.add(candidate)
  await db.organization.update({ where: { id: org.id }, data: { slug: candidate } })
  console.log(`${org.name.padEnd(28)} -> /rep/${candidate}`)
  assigned++
}

console.log(`\n${assigned} assigned, ${orgs.length - assigned} already had one`)
await db.$disconnect()
