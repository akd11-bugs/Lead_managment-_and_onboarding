import { notFound } from 'next/navigation'
import { prisma } from '@/lib/db'
import { requireUser, isAdmin, isOperations, leadScope } from '@/lib/session'
import { RecordNavigator } from '@/components/shared/RecordNavigator'
import { LeadPageView } from '@/components/leads/LeadPageView'
import type { Lead } from '@/lib/types'

export const dynamic = 'force-dynamic'

export default async function LeadDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser()
  const { id } = await params
  const lead = await prisma.lead.findUnique({
    where: { id },
    include: {
      activities: { orderBy: { date: 'desc' } },
      skillRuns: { orderBy: { createdAt: 'desc' }, take: 30 },
      company: true,
      person: true,
    },
  })
  // Sales users hitting another rep's lead by direct URL get the same 404 as
  // a missing lead — not just hidden from lists.
  if (!lead || (!isAdmin(user) && !isOperations(user) && lead.ownerId !== user.id)) notFound()

  // Same default ordering the main /leads table uses, so "N of M" and the
  // prev/next arrows step through the exact set this lead was opened from.
  const siblingIds = await prisma.lead.findMany({
    where: leadScope(user),
    orderBy: [{ stage: 'asc' }, { position: 'asc' }],
    select: { id: true },
  })
  const index = siblingIds.findIndex((l) => l.id === id)
  const prevId = index > 0 ? siblingIds[index - 1].id : null
  const nextId = index >= 0 && index < siblingIds.length - 1 ? siblingIds[index + 1].id : null

  return (
    <div className="space-y-4 max-w-4xl">
      <RecordNavigator
        backHref="/leads"
        backLabel="Back to leads"
        prevHref={prevId ? `/leads/${prevId}` : null}
        nextHref={nextId ? `/leads/${nextId}` : null}
        index={index + 1}
        total={siblingIds.length}
        listLabel="Leads"
      />
      <LeadPageView initialLead={lead as unknown as Lead} />
    </div>
  )
}
