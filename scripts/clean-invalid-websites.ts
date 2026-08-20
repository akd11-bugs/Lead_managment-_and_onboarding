import 'dotenv/config'
import { prisma } from '@/lib/db'
import { isValidWebsite } from '@/lib/types'

async function main() {
  const leads = await prisma.lead.findMany({
    where: { website: { not: null } },
    select: { id: true, company: true, website: true },
  })

  const bad = leads.filter((l) => l.website && !isValidWebsite(l.website))

  if (bad.length === 0) {
    console.log('No invalid website values found.')
    return
  }

  console.log(`Found ${bad.length} lead(s) with an invalid website value:`)
  for (const l of bad) {
    console.log(`  - ${l.company} (${l.id}): "${l.website}"`)
  }

  await prisma.lead.updateMany({
    where: { id: { in: bad.map((l) => l.id) } },
    data: { website: null },
  })

  console.log(`✅ Cleared website on ${bad.length} lead(s).`)
}

main()
  .catch((e) => {
    console.error('❌ Failed to clean websites:', e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
