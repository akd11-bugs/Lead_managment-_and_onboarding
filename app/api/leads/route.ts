import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requireApiUser, leadScope } from '@/lib/session'
import { validateLeadFields } from '@/lib/types'

export const dynamic = 'force-dynamic'

export async function GET() {
  const user = await requireApiUser()
  if (user instanceof NextResponse) return user
  const leads = await prisma.lead.findMany({
    where: leadScope(user),
    include: { activities: { orderBy: { date: 'desc' } } },
    orderBy: [{ stage: 'asc' }, { position: 'asc' }],
  })
  return NextResponse.json({ leads })
}

export async function POST(req: Request) {
  const user = await requireApiUser()
  if (user instanceof NextResponse) return user
  const body = await req.json()
  if (!body.company || !body.email) {
    return NextResponse.json({ error: 'company and email are required' }, { status: 400 })
  }
  const validationError = validateLeadFields(body)
  if (validationError) return NextResponse.json({ error: validationError }, { status: 400 })
  const lead = await prisma.lead.create({
    data: {
      poc: body.poc ?? null,
      company: body.company,
      email: body.email,
      phone: body.phone ?? null,
      website: body.website ?? null,
      industry: body.industry ?? null,
      businessType: body.businessType ?? null,
      source: body.source ?? 'other',
      stage: body.stage ?? 'new',
      estimatedVolume: Number(body.estimatedVolume ?? 0),
      ownerId: user.id,
      ownerName: user.name,
      type: body.type ?? 'merchant',
      notes: body.notes ?? '',
      position: body.position ?? 0,
    },
  })
  return NextResponse.json({ lead })
}