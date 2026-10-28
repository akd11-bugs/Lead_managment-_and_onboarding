import { prisma } from '@/lib/db'
import { findOrCreateCompany, findOrCreatePerson } from '@/lib/company'
import { writeBackLeadToSheet } from '@/lib/googleSheetWriteback'

export interface PublicIntakeSubmission {
  company?: unknown
  contactName?: unknown
  email?: unknown
  phone?: unknown
  industry?: unknown
  notes?: unknown
  // Honeypot — a real visitor never sees or fills this field (hidden via
  // CSS on the public form). A non-empty value means a bot filled every
  // input it could find; treated as a silent success so the bot gets no
  // signal its submission was rejected.
  website_url?: unknown
}

export interface PublicIntakeResult {
  ok: true
  silent?: boolean
}

export class PublicIntakeValidationError extends Error {}

// Single-submission intake from an anonymous public form — deliberately NOT
// lib/leadImport.ts's importLeadRows, which is batch/CSV-shaped (silently
// skips bad rows, needs an ImportOwner drawn from a logged-in session).
// Here there is no session and no batch: a bad submission must come back as
// a specific, immediate validation error, and the owner comes from the
// OrgLeadIntakeForm's configured defaultOwnerUserId instead.
export async function submitPublicLeadIntake(
  formId: string,
  formName: string,
  orgId: string,
  defaultOwnerUserId: string,
  defaultSource: string,
  input: PublicIntakeSubmission,
): Promise<PublicIntakeResult> {
  if (typeof input.website_url === 'string' && input.website_url.trim() !== '') {
    return { ok: true, silent: true }
  }

  const company = String(input.company ?? '').trim()
  const contactName = String(input.contactName ?? '').trim()
  const email = String(input.email ?? '').trim()
  const phone = input.phone ? String(input.phone).trim() : null
  const industry = input.industry ? String(input.industry).trim() : null
  const notes = input.notes ? String(input.notes).trim() : ''

  if (!company) throw new PublicIntakeValidationError('Company name is required.')
  if (!email) throw new PublicIntakeValidationError('Email is required.')
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new PublicIntakeValidationError('Enter a valid email address.')

  const owner = await prisma.user.findUnique({ where: { id: defaultOwnerUserId }, select: { id: true, name: true, orgId: true } })
  if (!owner || owner.orgId !== orgId) {
    // The form's configured owner was removed/deactivated after the form was
    // set up — a config problem, not something the submitter caused.
    throw new PublicIntakeValidationError('This form is temporarily unavailable. Please try again later.')
  }

  const companyRow = await findOrCreateCompany(orgId, company)
  const person = contactName ? await findOrCreatePerson(orgId, companyRow.id, contactName, { email, phone }) : null

  await prisma.$transaction([
    prisma.lead.create({
      data: {
        orgId,
        companyId: companyRow.id,
        personId: person?.id ?? null,
        email,
        phone,
        website: null,
        industry,
        source: defaultSource,
        stage: 'new',
        ownerId: owner.id,
        ownerName: owner.name,
        notes,
        intakeFormId: formId,
        intakeFormName: formName,
      },
    }),
    prisma.orgLeadIntakeForm.update({ where: { id: formId }, data: { submissionCount: { increment: 1 } } }),
  ])

  await writeBackLeadToSheet(orgId, {
    company,
    contactName: contactName || null,
    email,
    phone,
    website: null,
    industry,
    businessType: null,
    source: defaultSource,
    type: 'merchant',
    estimatedVolume: 0,
    notes,
  })

  return { ok: true }
}
