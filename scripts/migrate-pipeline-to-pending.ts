// One-time migration for the pipeline simplification: New → Pending →
// Onboarding / Not Interested. Run once, right after `prisma db push` adds
// the new `pendingSubStatus` column, against the shared local+production
// Neon database.
//
//   npx tsx scripts/migrate-pipeline-to-pending.ts
//
// - contacted | follow_up | qualified | proposal -> pending, pendingSubStatus
//   defaults to pending_ours (can't know historically who was actually
//   blocking — the team corrects it on first touch).
// - lost -> not_interested (no reason can be back-filled; "no fabricated
//   data").
// Each migrated lead gets one Activity row so the change is visible in its
// timeline, not silent.

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

const TO_PENDING = ['contacted', 'follow_up', 'qualified', 'proposal']

async function main() {
  const toPending = await prisma.lead.findMany({
    where: { stage: { in: TO_PENDING } },
    select: { id: true, stage: true },
  })
  const toNotInterested = await prisma.lead.findMany({
    where: { stage: 'lost' },
    select: { id: true },
  })

  console.log(`Found ${toPending.length} lead(s) to migrate to 'pending', ${toNotInterested.length} to 'not_interested'.`)

  for (const lead of toPending) {
    await prisma.lead.update({
      where: { id: lead.id },
      data: { stage: 'pending', pendingSubStatus: 'pending_ours' },
    })
    await prisma.activity.create({
      data: {
        leadId: lead.id,
        type: 'note',
        authorName: 'System',
        description: `Migrated from ${lead.stage} to Pending (pipeline simplification)`,
      },
    })
  }

  for (const lead of toNotInterested) {
    await prisma.lead.update({
      where: { id: lead.id },
      data: { stage: 'not_interested' },
    })
    await prisma.activity.create({
      data: {
        leadId: lead.id,
        type: 'note',
        authorName: 'System',
        description: 'Migrated from Lost to Not Interested (pipeline simplification)',
      },
    })
  }

  console.log('✅ Migration complete.')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
