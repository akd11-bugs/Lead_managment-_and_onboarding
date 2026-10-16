import { notFound } from 'next/navigation'
import { prisma } from '@/lib/db'
import { RepForm } from '@/components/rep/RepForm'

export const dynamic = 'force-dynamic'

// Per-org rep login. Field reps have no email, so the organisation cannot be
// derived from their credential — it comes from this URL instead. An admin
// shares one link with their team; the form itself is still just name + PIN.
//
// An unknown slug 404s rather than falling back to a global name search,
// which is what used to let one tenant lock out another's identically named
// rep (see lib/repAuth.ts).
export default async function RepOrgPage({ params }: { params: Promise<{ orgSlug: string }> }) {
  const { orgSlug } = await params
  const slug = orgSlug.trim().toLowerCase()

  const org = await prisma.organization.findUnique({
    where: { slug },
    select: { name: true },
  })
  if (!org) notFound()

  return (
    <div className="min-h-screen px-4 py-8">
      <p className="mx-auto mb-4 max-w-md text-center text-sm text-muted-foreground">
        Signing in to <span className="font-medium text-foreground">{org.name}</span>
      </p>
      <RepForm orgSlug={slug} />
    </div>
  )
}
