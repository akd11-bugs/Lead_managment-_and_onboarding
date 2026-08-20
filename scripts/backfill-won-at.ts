import 'dotenv/config'
import { prisma } from '../lib/db'

// One-off: wonAt didn't exist until now, so leads already sitting in the
// 'onboarding' stage need a best-effort backfill. updatedAt is the closest
// approximation we have for when they actually entered that stage.
async function main() {
  const leads = await prisma.lead.findMany({
    where: { stage: 'onboarding', wonAt: null },
    select: { id: true, company: true, updatedAt: true },
  })

  if (leads.length === 0) {
    console.log('No onboarding-stage leads missing wonAt.')
    return
  }

  for (const l of leads) {
    await prisma.lead.update({ where: { id: l.id }, data: { wonAt: l.updatedAt } })
    console.log(`  - ${l.company} (${l.id}): wonAt set to ${l.updatedAt.toISOString()}`)
  }
  console.log(`✅ Backfilled wonAt on ${leads.length} lead(s).`)
}

main()
  .catch((e) => {
    console.error('❌ Failed to backfill wonAt:', e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
