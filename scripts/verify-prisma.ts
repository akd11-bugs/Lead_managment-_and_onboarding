import 'dotenv/config'
import { prisma } from '@/lib/db'

async function main() {
  const count = await prisma.lead.count()
  console.log(`✅ Connected. Lead rows: ${count}`)
}

main()
  .catch((e) => {
    console.error('❌ Failed to connect:', e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
