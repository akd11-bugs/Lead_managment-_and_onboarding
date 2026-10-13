import { prisma } from '@/lib/db'
import { requireUser, leadScope } from '@/lib/session'
import { EmailServicePanel } from '@/components/services/EmailServicePanel'

export const dynamic = 'force-dynamic'

export default async function EmailServicePage() {
  const user = await requireUser()
  const rawLeads = await prisma.lead.findMany({
    where: leadScope(user),
    orderBy: { updatedAt: 'desc' },
    select: { id: true, person: { select: { name: true } }, company: { select: { name: true } }, email: true, stage: true },
  })
  const leads = rawLeads.map((l) => ({ id: l.id, poc: l.person?.name ?? null, company: l.company?.name ?? 'Unknown company', email: l.email, stage: l.stage }))

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Email</h1>
        <p className="text-sm text-muted-foreground">
          Send an email directly, and run the outreach skills that make it sharper — in one place
          instead of hunting through the skill catalog.
        </p>
      </div>
      <EmailServicePanel leads={leads} />
    </div>
  )
}
