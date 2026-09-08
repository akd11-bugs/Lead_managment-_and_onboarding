import 'dotenv/config'
import { prisma } from '../lib/db'
import { createRootOrganization } from '../lib/org'

// One-time Phase 0 migration: give every existing row an orgId, backed by a
// single new root Organization, then lock the column down to NOT NULL.
//
// PRECONDITION — run this only after the schema change has been applied with
// orgId as NULLABLE (the Organization and JobRun tables must already exist
// too). `prisma db push` cannot do this in one step: adding a required column
// with no default to a table that already has rows is exactly the kind of
// change it refuses to apply. The safe sequence is:
//   1. Temporarily mark every new `orgId` field in prisma/schema.prisma as
//      optional (`String?`) and run `npx prisma db push` — this creates
//      Organization/JobRun and adds every orgId column as nullable, with no
//      data-loss risk since nothing is required yet.
//   2. Run `npx prisma generate` so the client matches (still optional).
//   3. Run this script (`npx tsx scripts/backfill-org.ts`) — it creates the
//      root org and backfills every row via raw SQL (the typed client can't
//      express `where: { orgId: null }` once the field is optional-in-DB but
//      you're about to make it required-in-schema, so this uses $executeRaw
//      directly) then ALTERs each column to NOT NULL.
//   4. Revert schema.prisma's orgId fields back to required (`String`,
//      matching what's already committed) and run `npx prisma generate`
//      again so the client's types match the now-fully-backfilled reality.
//
// Dry-run this whole sequence against a copied DATABASE_URL first — this
// touches every row in the production tables listed below.
const REQUIRED_ORGID_TABLES = ['Lead', 'User', 'WorkflowRule', 'SavedView', 'Task', 'Activity', 'Invite', 'SkillRun']
// AuditLog.orgId is nullable by design (pre-signup events have no org yet) —
// backfilled for existing rows, but never forced to NOT NULL.
const NULLABLE_ORGID_TABLES = ['AuditLog']

async function main() {
  console.log('Step 1/3: creating (or reusing) the root organization...')
  let orgId: string
  const existingRoot = await prisma.organization.findFirst({
    where: { parentOrgId: null },
    orderBy: { createdAt: 'asc' },
  })
  if (existingRoot) {
    orgId = existingRoot.id
    console.log(`  = reusing existing root org ${orgId} ("${existingRoot.name}")`)
  } else {
    const org = await createRootOrganization(process.env.BACKFILL_ORG_NAME || 'Default Organization')
    orgId = org.id
    console.log(`  + created root org ${orgId} ("${org.name}")`)
  }

  console.log('Step 2/3: backfilling orgId on every existing row...')
  for (const table of [...REQUIRED_ORGID_TABLES, ...NULLABLE_ORGID_TABLES]) {
    const [{ count: totalBefore }] = await prisma.$queryRawUnsafe<{ count: bigint }[]>(
      `SELECT COUNT(*)::bigint as count FROM "${table}"`
    )
    const updated = await prisma.$executeRawUnsafe(`UPDATE "${table}" SET "orgId" = $1 WHERE "orgId" IS NULL`, orgId)
    console.log(`  ${table}: ${updated} row(s) backfilled (of ${totalBefore} total)`)
  }

  console.log('Step 3/3: enforcing NOT NULL on the tables that require it...')
  for (const table of REQUIRED_ORGID_TABLES) {
    const [{ nullCount }] = await prisma.$queryRawUnsafe<{ nullCount: bigint }[]>(
      `SELECT COUNT(*)::bigint as "nullCount" FROM "${table}" WHERE "orgId" IS NULL`
    )
    if (Number(nullCount) > 0) {
      throw new Error(`Refusing to set NOT NULL — ${table} still has ${nullCount} row(s) with a null orgId`)
    }
    await prisma.$executeRawUnsafe(`ALTER TABLE "${table}" ALTER COLUMN "orgId" SET NOT NULL`)
    console.log(`  + ${table}.orgId is now NOT NULL`)
  }

  console.log('✅ Backfill complete. Now flip orgId fields back to required in prisma/schema.prisma (step 4 above) and `npx prisma generate`.')
}

main()
  .catch((e) => {
    console.error('❌ Backfill failed:', e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
