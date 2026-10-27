import { notFound } from 'next/navigation'
import { prisma } from '@/lib/db'
import { IntakeForm } from '@/components/intake/IntakeForm'

export const dynamic = 'force-dynamic'

// Public, no-login lead-capture link — a partner, a flyer, an event booth
// hands out /intake/<slug> and a submission becomes a real Lead in that
// org's pipeline. Same "resolve a tenant from the URL slug, 404 on a
// miss, render standalone (no AppShell)" shape as app/rep/[orgSlug]/page.tsx.
// An org can run several of these (different campaigns/owners/sources),
// unlike the 1:1 rep-portal-per-org slug — slug is still the sole public
// lookup key and stays globally unique across every org's forms.
export default async function IntakePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params

  const form = await prisma.orgLeadIntakeForm.findUnique({
    where: { slug },
    select: { id: true, enabled: true, orgId: true },
  })
  if (!form || !form.enabled) notFound()

  const org = await prisma.organization.findUnique({ where: { id: form.orgId }, select: { name: true } })
  if (!org) notFound()

  return (
    <div className="min-h-screen px-4 py-8">
      <p className="mx-auto mb-4 max-w-md text-center text-sm text-muted-foreground">
        Get in touch with <span className="font-medium text-foreground">{org.name}</span>
      </p>
      <IntakeForm slug={slug} />
    </div>
  )
}
