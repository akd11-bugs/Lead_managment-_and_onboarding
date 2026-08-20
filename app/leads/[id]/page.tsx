import { notFound } from 'next/navigation'
import Link from 'next/link'
import { prisma } from '@/lib/db'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ArrowLeft, Mail, Sparkles, Building2, Calendar } from 'lucide-react'
import { formatDateTime, formatRelative } from '@/lib/utils'
import { STAGE_LABELS, SOURCE_LABELS, type Stage, type LeadSource, type BusinessType } from '@/lib/types'
import { LeadSkillActions } from '@/components/leads/LeadSkillActions'
import { LeadDiscoveryEditor } from '@/components/leads/LeadDiscoveryEditor'
import { LeadProfileEditor } from '@/components/leads/LeadProfileEditor'
import { requireUser, isAdmin, isOperations } from '@/lib/session'

export const dynamic = 'force-dynamic'

export default async function LeadDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser()
  const { id } = await params
  const lead = await prisma.lead.findUnique({
    where: { id },
    include: {
      activities: { orderBy: { date: 'desc' } },
      skillRuns: { orderBy: { createdAt: 'desc' }, take: 30 },
    },
  })
  // Sales users hitting another rep's lead by direct URL get the same 404 as
  // a missing lead — not just hidden from lists.
  if (!lead || (!isAdmin(user) && !isOperations(user) && lead.ownerId !== user.id)) notFound()

  const ACTIVITY_ICONS: Record<string, React.ReactNode> = {
    call: <Mail className="h-3.5 w-3.5" />,
    email: <Mail className="h-3.5 w-3.5" />,
    meeting: <Calendar className="h-3.5 w-3.5" />,
    note: <Calendar className="h-3.5 w-3.5" />,
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/leads">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-2">
              <Building2 className="h-5 w-5 text-muted-foreground" />
              {lead.company}
            </h1>
            <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
              {lead.poc && (
                <>
                  <span className="font-medium text-foreground">{lead.poc}</span>
                  <span>·</span>
                </>
              )}
              {lead.industry && (
                <>
                  <span>{lead.industry}</span>
                  <span>·</span>
                </>
              )}
              <Badge variant="outline">{STAGE_LABELS[lead.stage as Stage]}</Badge>
              <span>·</span>
              <span>{SOURCE_LABELS[lead.source as LeadSource] ?? lead.source}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <LeadProfileEditor
            leadId={lead.id}
            email={lead.email}
            phone={lead.phone}
            poc={lead.poc}
            website={lead.website}
            industry={lead.industry}
            businessType={lead.businessType as BusinessType | null}
            ownerName={lead.ownerName}
            estimatedVolume={lead.estimatedVolume}
            lastActivityAt={lead.lastActivityAt}
          />

          {/* Activity timeline */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Activity timeline ({lead.activities.length})</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {lead.activities.length === 0 && (
                <p className="text-sm text-muted-foreground">No activity yet.</p>
              )}
              {lead.activities.map((a) => (
                <div key={a.id} className="flex items-start gap-3 rounded-md border p-3">
                  <div className="mt-0.5 text-muted-foreground">
                    {ACTIVITY_ICONS[a.type] ?? null}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium capitalize">{a.type}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatDateTime(a.date)} · {a.authorName}
                      </p>
                    </div>
                    <p className="text-sm whitespace-pre-line mt-0.5">{a.description}</p>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          <LeadDiscoveryEditor
            leadId={lead.id}
            initialPainPoints={lead.painPoints}
            initialWhatTheyWant={lead.whatTheyWant}
            initialNotes={lead.notes}
          />

          {/* Skill run history */}
          {lead.skillRuns.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-violet-500" />
                  Skill run history
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-1.5">
                {lead.skillRuns.map((r) => (
                  <Link
                    key={r.id}
                    href={`/skills/${r.skillId}?leadId=${lead.id}&runId=${r.id}`}
                    className="flex items-center justify-between gap-2 rounded-md border px-3 py-2 text-sm hover:bg-accent"
                  >
                    <div>
                      <p className="font-medium">{r.skillName}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatRelative(r.createdAt)} · {r.runnerType === 'script' ? '⚡ script' : '🧠 LLM'}
                      </p>
                    </div>
                    <span className="text-xs text-muted-foreground">View report →</span>
                  </Link>
                ))}
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right rail: lead-scoped skills */}
        <div className="space-y-4">
          <LeadSkillActions leadId={lead.id} />
        </div>
      </div>
    </div>
  )
}
