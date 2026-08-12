import type { PrismaClient } from '@prisma/client'

export async function clearAllLeadData(prisma: PrismaClient) {
  await prisma.skillRun.deleteMany()
  await prisma.activity.deleteMany()
  await prisma.lead.deleteMany()
}
