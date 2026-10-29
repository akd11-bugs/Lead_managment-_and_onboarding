import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { resolveIntakeFormFields } from '@/lib/intakeFormFields'

export const dynamic = 'force-dynamic'

// Public, no-auth — the intake form itself (app/intake/[slug]/page.tsx)
// needs to know which fields to render before a submitter has done
// anything. Only ever returns field shape (key/label/type/required/options),
// never anything about the org beyond what the page already fetches
// separately (org name) — no owner, no source, no submission count.
export async function GET(_req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const form = await prisma.orgLeadIntakeForm.findUnique({
    where: { slug },
    select: { orgId: true, enabled: true, fieldConfigJson: true },
  })
  if (!form || !form.enabled) {
    return NextResponse.json({ error: 'This form is no longer available.' }, { status: 404 })
  }

  const fields = await resolveIntakeFormFields(form.orgId, form.fieldConfigJson)
  return NextResponse.json({ fields })
}
