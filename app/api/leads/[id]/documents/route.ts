import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requireApiUser, isAdmin, isOperations, type SessionUser } from '@/lib/session'
import { readJsonBody } from '@/lib/http'
import { validateDocumentMetadata } from '@/lib/documentPolicy'

export const dynamic = 'force-dynamic'

// Onboarding document METADATA only.
//
// This route must never accept file content. The documents are government
// identity papers and the product's guarantee is that the vendor never holds
// them — bytes stay in the uploader's browser (lib/docVault.ts). The guard
// in POST below enforces that at runtime rather than trusting the client,
// so a future caller cannot quietly start posting base64 and turn this into
// the liability the design exists to avoid.


/** The caller may touch this lead at all. Non-privileged users own-leads only. */
async function authorizeLead(user: SessionUser, leadId: string) {
  return prisma.lead.findFirst({
    where: {
      id: leadId,
      orgId: user.orgId,
      ...(isAdmin(user) || isOperations(user) ? {} : { ownerId: user.id }),
    },
    select: { id: true },
  })
}

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireApiUser()
  if (user instanceof NextResponse) return user
  const { id } = await params

  if (!(await authorizeLead(user, id))) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const documents = await prisma.onboardingDocument.findMany({
    where: { orgId: user.orgId, leadId: id },
    orderBy: { createdAt: 'asc' },
  })
  return NextResponse.json({ documents })
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireApiUser()
  if (user instanceof NextResponse) return user
  const { id } = await params

  if (!(await authorizeLead(user, id))) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const body = await readJsonBody(req)
  if (body instanceof NextResponse) return body

  // Validation (including the refusal of any file content) lives in
  // lib/documentPolicy.ts so it can be unit-tested directly. See
  // lib/documentPolicy.test.ts — the no-bytes rule is the product's central
  // privacy claim and must not be able to regress silently.
  const parsed = validateDocumentMetadata(body)
  if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 })
  const meta = parsed.value

  const document = await prisma.onboardingDocument.create({
    data: {
      orgId: user.orgId,
      leadId: id,
      localKey: meta.localKey,
      kind: meta.kind,
      label: meta.label,
      fileName: meta.fileName,
      mimeType: meta.mimeType,
      byteSize: meta.byteSize,
      sha256: meta.sha256,
      status: meta.status,
      holderUserId: user.id,
      holderLabel: String(body.holderLabel ?? '').slice(0, 120) || null,
    },
  })

  return NextResponse.json({ document }, { status: 201 })
}
