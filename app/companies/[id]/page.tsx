import { notFound } from 'next/navigation'
import { prisma } from '@/lib/db'
import { requireUser } from '@/lib/session'
import { Building2 } from 'lucide-react'
import { RecordNavigator } from '@/components/shared/RecordNavigator'
import { CompanyRecordView } from '@/components/companies/CompanyRecordView'

export const dynamic = 'force-dynamic'

export default async function CompanyDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser()
  const { id } = await params

  const company = await prisma.company.findFirst({
    where: { id, orgId: user.orgId },
    include: {
      people: { orderBy: { name: 'asc' } },
      leads: { orderBy: { updatedAt: 'desc' }, include: { person: true } },
    },
  })
  if (!company) notFound()

  const siblings = await prisma.company.findMany({
    where: { orgId: user.orgId },
    orderBy: { name: 'asc' },
    select: { id: true },
  })
  const index = siblings.findIndex((c) => c.id === id)
  const prevId = index > 0 ? siblings[index - 1].id : null
  const nextId = index >= 0 && index < siblings.length - 1 ? siblings[index + 1].id : null

  return (
    <div className="space-y-4 max-w-4xl">
      <RecordNavigator
        backHref="/companies"
        backLabel="Back to companies"
        prevHref={prevId ? `/companies/${prevId}` : null}
        nextHref={nextId ? `/companies/${nextId}` : null}
        index={index + 1}
        total={siblings.length}
        listLabel="Companies"
      />
      <h1 className="text-xl font-semibold tracking-tight flex items-center gap-2">
        <Building2 className="h-5 w-5 text-muted-foreground" />
        {company.name}
      </h1>
      <CompanyRecordView initialCompany={company} />
    </div>
  )
}
