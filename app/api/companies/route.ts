import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requireApiUser } from '@/lib/session'
import { readJsonBody } from '@/lib/http'
import { findOrCreateCompany } from '@/lib/company'

export const dynamic = 'force-dynamic'

// Plain authenticated-user access, not admin-gated — a Company is a business
// record like Lead itself, not admin config like LeadFieldDefinition/StageDefinition.
export async function GET(req: Request) {
  const user = await requireApiUser()
  if (user instanceof NextResponse) return user

  const url = new URL(req.url)
  const q = url.searchParams.get('q')?.trim() ?? ''

  const companies = await prisma.company.findMany({
    where: { orgId: user.orgId, ...(q ? { name: { contains: q, mode: 'insensitive' } } : {}) },
    orderBy: { name: 'asc' },
    take: 20,
    include: { _count: { select: { leads: true, people: true } } },
  })
  return NextResponse.json({ companies })
}

// Lets a caller explicitly create a company up front (e.g. the CompanyPicker's
// "Create new ..." option) rather than only ever resolving one implicitly via
// a Lead create/import — same find-or-create helper either way, so a company
// typed here and one typed on a new lead always converge on one row.
export async function POST(req: Request) {
  const user = await requireApiUser()
  if (user instanceof NextResponse) return user
  const body = await readJsonBody(req)
  if (body instanceof NextResponse) return body

  const name = String(body.name ?? '').trim()
  if (!name) return NextResponse.json({ error: 'name is required' }, { status: 400 })

  const company = await findOrCreateCompany(user.orgId, name)
  return NextResponse.json({ company })
}
