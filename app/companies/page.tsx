import { prisma } from '@/lib/db'
import { requireUser } from '@/lib/session'
import { CompaniesTable } from '@/components/companies/CompaniesTable'

export const dynamic = 'force-dynamic'

export default async function CompaniesPage() {
  const user = await requireUser()

  const companies = await prisma.company.findMany({
    where: { orgId: user.orgId },
    orderBy: { name: 'asc' },
    include: { _count: { select: { leads: true, people: true } } },
  })

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Companies</h1>
        <p className="text-sm text-muted-foreground">
          {companies.length} compan{companies.length === 1 ? 'y' : 'ies'} across your pipeline.
        </p>
      </div>
      <CompaniesTable initialCompanies={companies} />
    </div>
  )
}
