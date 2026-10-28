import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requireApiUser, leadScope } from '@/lib/session'
import { validateLeadFields } from '@/lib/types'
import { readJsonBody } from '@/lib/http'
import { mergeCustomFields } from '@/lib/leadCustomFields'
import { getStageDefinitions } from '@/lib/pipelineConfig'
import { findOrCreateCompany, findOrCreatePerson, findPossibleDuplicatePerson } from '@/lib/company'
import { writeBackLeadToSheet } from '@/lib/googleSheetWriteback'

export const dynamic = 'force-dynamic'

export async function GET() {
  const user = await requireApiUser()
  if (user instanceof NextResponse) return user
  const leads = await prisma.lead.findMany({
    where: leadScope(user),
    include: { activities: { orderBy: { date: 'desc' } }, company: true, person: true },
    orderBy: [{ stage: 'asc' }, { position: 'asc' }],
  })
  return NextResponse.json({ leads })
}

export async function POST(req: Request) {
  const user = await requireApiUser()
  if (user instanceof NextResponse) return user
  const body = await readJsonBody(req)
  if (body instanceof NextResponse) return body
  if ((!body.company && !body.companyId) || !body.email) {
    return NextResponse.json({ error: 'company and email are required' }, { status: 400 })
  }
  const stageDefs = await getStageDefinitions(user.orgId)
  const validationError = validateLeadFields(body, { validStageKeys: stageDefs.map((s) => s.key) })
  if (validationError) return NextResponse.json({ error: validationError }, { status: 400 })

  // Company is resolved by name (find-or-create) unless the caller already
  // picked an existing one via companyId (e.g. the CompanyPicker combobox).
  const company = body.companyId
    ? await prisma.company.findFirst({ where: { id: body.companyId, orgId: user.orgId } })
    : await findOrCreateCompany(user.orgId, body.company)
  if (!company) return NextResponse.json({ error: 'companyId does not match an existing company in your org' }, { status: 400 })

  if (body.force !== true) {
    // Same company is normal (many leads/contacts share one company) — only
    // an email match, or a likely-same Person at this company, counts as a
    // duplicate worth flagging.
    const emailDuplicate = await prisma.lead.findFirst({
      where: { orgId: user.orgId, email: { equals: body.email, mode: 'insensitive' } },
      select: { id: true, email: true, company: { select: { name: true } } },
    })
    if (emailDuplicate) {
      return NextResponse.json(
        { error: `Possible duplicate: "${emailDuplicate.company.name}" (${emailDuplicate.email}) already exists`, duplicate: emailDuplicate },
        { status: 409 },
      )
    }

    const duplicatePerson = await findPossibleDuplicatePerson(user.orgId, company.id, body.poc, body.email)
    if (duplicatePerson) {
      return NextResponse.json(
        { error: `Possible duplicate: "${duplicatePerson.name}" at "${company.name}" already exists`, duplicate: { id: duplicatePerson.id, companyName: company.name, email: duplicatePerson.email } },
        { status: 409 },
      )
    }
  }

  let customFieldsJson = '{}'
  if (body.customFields !== undefined) {
    try {
      customFieldsJson = await mergeCustomFields(user.orgId, '{}', body.customFields)
    } catch (err) {
      return NextResponse.json({ error: err instanceof Error ? err.message : 'Invalid customFields' }, { status: 400 })
    }
  }

  const person = body.poc?.trim()
    ? await findOrCreatePerson(user.orgId, company.id, body.poc, {
        linkedinUrl: body.linkedinUrl || null,
        otherLinks: Array.isArray(body.otherLinks) ? body.otherLinks.filter((l: unknown) => typeof l === 'string') : undefined,
      })
    : null

  const lead = await prisma.lead.create({
    data: {
      orgId: user.orgId,
      companyId: company.id,
      personId: person?.id ?? null,
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
      customFieldsJson,
      position: body.position ?? 0,
    },
    include: { company: true, person: true },
  })

  await writeBackLeadToSheet(user.orgId, {
    company: company.name,
    contactName: person?.name ?? null,
    email: lead.email,
    phone: lead.phone,
    website: lead.website,
    industry: lead.industry,
    businessType: lead.businessType,
    source: lead.source,
    type: lead.type,
    estimatedVolume: lead.estimatedVolume,
    notes: lead.notes,
  })

  return NextResponse.json({ lead })
}