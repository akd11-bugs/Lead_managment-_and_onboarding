import { notFound } from 'next/navigation'
import { prisma } from '@/lib/db'
import { requireUser, leadScope } from '@/lib/session'
import { getService } from '@/lib/services/catalog'
import { ServicePanel } from '@/components/services/ServicePanel'

export const dynamic = 'force-dynamic'

export default async function ServicePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const service = getService(slug)
  if (!service) notFound()

  const user = await requireUser()
  const leads =
    service.leadSkillIds.length > 0
      ? await prisma.lead.findMany({
          where: leadScope(user),
          select: { id: true, poc: true, company: true, stage: true },
          orderBy: { updatedAt: 'desc' },
        })
      : []

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{service.name}</h1>
        <p className="text-sm text-muted-foreground">{service.description}</p>
      </div>
      <ServicePanel service={service} leads={leads} />
    </div>
  )
}
