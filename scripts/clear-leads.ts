import 'dotenv/config'
import { prisma } from '@/lib/db'
import { clearAllLeadData } from '../prisma/seed-helpers'

async function main() {
  const count = await prisma.lead.count()
  console.log(`Found ${count} lead(s) in this database.`)

  if (process.env.CONFIRM_CLEAR !== 'yes') {
    console.error('Refusing to delete without confirmation. Re-run with: CONFIRM_CLEAR=yes npm run db:clear-leads')
    process.exit(1)
  }

  await clearAllLeadData(prisma)
  console.log(`✅ Cleared ${count} lead(s) and related activities/skill runs. Database is now empty of leads.`)
}

main()
  .catch((e) => {
    console.error('❌ Failed to clear leads:', e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
