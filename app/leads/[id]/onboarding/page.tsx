import { notFound } from 'next/navigation'
import Link from 'next/link'
import { prisma } from '@/lib/db'
import { requireUser, isAdmin, isOperations } from '@/lib/session'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ArrowLeft, Building2, Globe, Mail } from 'lucide-react'
import { OnboardingProgressPanel } from '@/components/leads/OnboardingProgressPanel'
import { formatCurrency } from '@/lib/utils'
import { BUSINESS_TYPE_LABELS, LEAD_TYPE_LABELS, type BusinessType, type LeadType } from '@/lib/types'

export const dynamic = 'force-dynamic'

export default async function OnboardingDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser()
  const { id } = await params
  const lead = await prisma.lead.findFirst({
    where: { id, ...(isAdmin(user) || isOperations(user) ? {} : { ownerId: user.id }) },
  })
  if (!lead) notFound()

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" asChild>
          <Link href={`/leads/${lead.id}`}>
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-2">
            <Building2 className="h-5 w-5 text-muted-foreground" />
            {lead.company}
          </h1>
          <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
            {lead.poc && <span>{lead.poc}</span>}
            <Badge variant="outline" className="text-[10px]">
              {LEAD_TYPE_LABELS[lead.type as LeadType] ?? lead.type}
            </Badge>
            {lead.businessType && (
              <Badge variant="outline" className="text-[10px]">
                {BUSINESS_TYPE_LABELS[lead.businessType as BusinessType] ?? lead.businessType}
              </Badge>
            )}
          </div>
        </div>
      </div>

      {lead.stage !== 'onboarding' ? (
        <Card>
          <CardContent className="p-6 text-sm text-muted-foreground">
            This lead isn&apos;t in onboarding right now. Move its stage to Onboarding from the pipeline to start
            tracking progress here.
          </CardContent>
        </Card>
      ) : (
        <>
          <Card>
            <CardContent className="p-5 grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div>
                <p className="text-xs uppercase tracking-wide text-muted-foreground flex items-center gap-1.5">
                  <Mail className="h-3.5 w-3.5" /> Email
                </p>
                <p className="mt-1 text-sm font-medium truncate">{lead.email}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-muted-foreground flex items-center gap-1.5">
                  <Globe className="h-3.5 w-3.5" /> Website
                </p>
                <p className="mt-1 text-sm font-medium truncate">{lead.website ?? '—'}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Est. volume</p>
                <p className="mt-1 text-sm font-medium">{formatCurrency(lead.estimatedVolume)}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Owner</p>
                <p className="mt-1 text-sm font-medium">{lead.ownerName}</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Onboarding checklist</CardTitle>
            </CardHeader>
            <CardContent>
              <OnboardingProgressPanel leadId={lead.id} subStage={lead.onboardingSubStage as never} />
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}
