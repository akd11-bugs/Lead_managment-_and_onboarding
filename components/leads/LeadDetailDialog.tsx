'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Phone,
  Mail,
  Calendar,
  StickyNote,
  Sparkles,
  Trash2,
  Loader2,
  ExternalLink,
  CheckCircle2,
} from 'lucide-react'
import { formatCurrency, formatDate, formatDateTime, formatRelative } from '@/lib/utils'
import {
  STAGES,
  STAGE_LABELS,
  SOURCES,
  SOURCE_LABELS,
  QUALITY_LEVELS,
  QUALITY_LABELS,
  LEAD_TYPES,
  LEAD_TYPE_LABELS,
  BUSINESS_TYPES,
  BUSINESS_TYPE_LABELS,
  PROPOSAL_SUB_STAGES,
  PROPOSAL_SUB_STAGE_LABELS,
  ONBOARDING_SUB_STAGE_LABELS,
  onboardingProgressPercent,
  type Lead,
  type Activity,
  type ActivityType,
  type Stage,
  type LeadSource,
  type QualityLevel,
  type LeadType,
  type BusinessType,
  type ProposalSubStage,
} from '@/lib/types'
import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import { SKILLS } from '@/lib/skills/catalog'
import { EmailComposer } from './EmailComposer'
import { LeadTasksTab } from './LeadTasksTab'

interface SkillRunEntry {
  id: string
  skillId: string
  skillName: string
  runnerType: string
  createdAt: string
}

const ACTIVITY_ICONS: Record<ActivityType, React.ReactNode> = {
  call: <Phone className="h-3.5 w-3.5" />,
  email: <Mail className="h-3.5 w-3.5" />,
  meeting: <Calendar className="h-3.5 w-3.5" />,
  note: <StickyNote className="h-3.5 w-3.5" />,
}

export function LeadDetailDialog({
  leadId,
  open,
  onOpenChange,
}: {
  leadId: string
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const router = useRouter()
  const [lead, setLead] = useState<Lead | null>(null)
  const [activities, setActivities] = useState<Activity[]>([])
  const [skillRuns, setSkillRuns] = useState<SkillRunEntry[]>([])
  const [saving, setSaving] = useState(false)
  const [running, setRunning] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState('overview')
  const [activityForm, setActivityForm] = useState<{ type: ActivityType; description: string }>({
    type: 'note',
    description: '',
  })
  useEffect(() => {
    if (!open) return
    fetch(`/api/leads/${leadId}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.lead) {
          setLead(data.lead)
          setActivities(data.lead.activities ?? [])
          setSkillRuns(data.lead.skillRuns ?? [])
        }
      })
  }, [open, leadId])

  if (!lead && open) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading…
          </div>
        </DialogContent>
      </Dialog>
    )
  }
  if (!lead) return null

  async function patchLead(patch: Partial<Lead>) {
    if (!lead) return
    setSaving(true)
    try {
      const res = await fetch(`/api/leads/${lead.id}`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(patch),
      })
      if (res.ok) {
        const data = await res.json()
        setLead({ ...lead, ...data.lead })
        router.refresh()
      }
    } finally {
      setSaving(false)
    }
  }

  async function addActivity() {
    if (!lead || !activityForm.description) return
    const res = await fetch('/api/activities', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        leadId: lead.id,
        type: activityForm.type,
        description: activityForm.description,
      }),
    })
    if (res.ok) {
      setActivityForm({ type: 'note', description: '' })
      const refreshed = await fetch(`/api/leads/${lead.id}`).then((r) => r.json())
      setActivities(refreshed.lead.activities ?? [])
      router.refresh()
    }
  }

  async function handleEmailSent() {
    if (!lead) return
    const refreshed = await fetch(`/api/leads/${lead.id}`).then((r) => r.json())
    setActivities(refreshed.lead.activities ?? [])
    router.refresh()
  }

  async function deleteLead() {
    if (!lead) return
    if (!confirm('Delete this lead? Activities and skill runs will be removed.')) return
    await fetch(`/api/leads/${lead.id}`, { method: 'DELETE' })
    onOpenChange(false)
    router.refresh()
  }

  async function runSkill(skillId: string, skillName: string) {
    if (!lead) return
    setRunning(skillId)
    try {
      const res = await fetch('/api/skills/run', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ skillId, leadId: lead.id, scope: 'lead' }),
      })
      const data = await res.json()
      if (data.runId) {
        // Reload skill history
        const refreshed = await fetch(`/api/leads/${lead.id}`).then((r) => r.json())
        setSkillRuns(refreshed.lead.skillRuns ?? [])
      }
      // Open the skill report in a new tab — best UX while user keeps kanban context
      window.open(`/skills/${skillId}?leadId=${lead.id}`, '_blank')
    } finally {
      setRunning(null)
    }
  }

  // Lead-scoped skills
  const leadSkills = SKILLS.filter((s) => s.scope === 'lead')

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <DialogTitle className="text-xl truncate">{lead.company}</DialogTitle>
              <DialogDescription asChild>
                <div className="flex items-center gap-2 mt-1">
                  {lead.poc && (
                    <>
                      <span className="font-medium text-foreground">{lead.poc}</span>
                      <span>·</span>
                    </>
                  )}
                  <span>{formatCurrency(lead.estimatedVolume)}</span>
                  <span>·</span>
                  <Badge variant="outline" className="capitalize">
                    {STAGE_LABELS[lead.stage as Stage]}
                  </Badge>
                </div>
              </DialogDescription>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <Button size="sm" variant="outline" onClick={() => setActiveTab('activities')}>
                <Mail className="h-3.5 w-3.5" />
                Send email
              </Button>
              <Button variant="ghost" size="icon" onClick={deleteLead} aria-label="Delete lead">
                <Trash2 className="h-4 w-4 text-rose-500" />
              </Button>
            </div>
          </div>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="activities">Activity ({activities.length})</TabsTrigger>
            <TabsTrigger value="tasks">Tasks</TabsTrigger>
            <TabsTrigger value="skills">Skills</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4 pt-2">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <Field label="Email">
                <a href={`mailto:${lead.email}`} className="text-blue-600 hover:underline">
                  {lead.email}
                </a>
              </Field>
              <Field label="Phone">
                {lead.phone ? (
                  <a href={`tel:${lead.phone}`} className="text-blue-600 hover:underline">
                    {lead.phone}
                  </a>
                ) : (
                  <span className="text-muted-foreground">—</span>
                )}
              </Field>
              <Field label="POC (optional)">
                <Input
                  defaultValue={lead.poc ?? ''}
                  className="h-8"
                  placeholder="Point of contact"
                  onBlur={(e) => {
                    if (e.target.value !== (lead.poc ?? '')) patchLead({ poc: e.target.value || null })
                  }}
                  disabled={saving}
                />
              </Field>
              <Field label="Website">
                <Input
                  defaultValue={lead.website ?? ''}
                  className="h-8"
                  placeholder="https://…"
                  onBlur={(e) => {
                    if (e.target.value !== (lead.website ?? '')) patchLead({ website: e.target.value || null })
                  }}
                  disabled={saving}
                />
              </Field>
              <Field label="Industry">
                <Input
                  defaultValue={lead.industry ?? ''}
                  className="h-8"
                  placeholder="Fashion, Apparel, F&B…"
                  onBlur={(e) => {
                    if (e.target.value !== (lead.industry ?? '')) patchLead({ industry: e.target.value || null })
                  }}
                  disabled={saving}
                />
              </Field>
              <Field label="Business type">
                <Select
                  value={lead.businessType ?? 'unset'}
                  onValueChange={(v) => patchLead({ businessType: v === 'unset' ? null : (v as BusinessType) })}
                  disabled={saving}
                >
                  <SelectTrigger className="h-8">
                    <SelectValue placeholder="Not set" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="unset">Not set</SelectItem>
                    {BUSINESS_TYPES.map((b) => (
                      <SelectItem key={b} value={b}>
                        {BUSINESS_TYPE_LABELS[b]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Stage">
                <Select
                  value={lead.stage}
                  onValueChange={(v) => patchLead({ stage: v as Stage })}
                  disabled={saving}
                >
                  <SelectTrigger className="h-8">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {STAGES.map((s) => (
                      <SelectItem key={s} value={s}>
                        {STAGE_LABELS[s]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              {lead.stage === 'proposal' && (
                <Field label="Proposal status">
                  <Select
                    value={lead.proposalSubStage ?? ''}
                    onValueChange={(v) => patchLead({ proposalSubStage: v as ProposalSubStage })}
                    disabled={saving}
                  >
                    <SelectTrigger className="h-8">
                      <SelectValue placeholder="Not set" />
                    </SelectTrigger>
                    <SelectContent>
                      {PROPOSAL_SUB_STAGES.map((s) => (
                        <SelectItem key={s} value={s}>
                          {PROPOSAL_SUB_STAGE_LABELS[s]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
              )}
              <Field label="Source">
                <Select
                  value={lead.source}
                  onValueChange={(v) => patchLead({ source: v as LeadSource })}
                  disabled={saving}
                >
                  <SelectTrigger className="h-8">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {SOURCES.map((s) => (
                      <SelectItem key={s} value={s}>
                        {SOURCE_LABELS[s]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Type">
                <Select
                  value={lead.type}
                  onValueChange={(v) => patchLead({ type: v as LeadType })}
                  disabled={saving}
                >
                  <SelectTrigger className="h-8">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {LEAD_TYPES.map((t) => (
                      <SelectItem key={t} value={t}>
                        {LEAD_TYPE_LABELS[t]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Quality">
                <Select
                  value={lead.quality}
                  onValueChange={(v) => patchLead({ quality: v as QualityLevel })}
                  disabled={saving}
                >
                  <SelectTrigger className="h-8">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {QUALITY_LEVELS.map((q) => (
                      <SelectItem key={q} value={q}>
                        {QUALITY_LABELS[q]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Effort">
                <Select
                  value={lead.effort}
                  onValueChange={(v) => patchLead({ effort: v as QualityLevel })}
                  disabled={saving}
                >
                  <SelectTrigger className="h-8">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {QUALITY_LEVELS.map((q) => (
                      <SelectItem key={q} value={q}>
                        {QUALITY_LABELS[q]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Est. Volume (₹)">
                <Input
                  type="number"
                  defaultValue={lead.estimatedVolume}
                  className="h-8"
                  onBlur={(e) => {
                    const v = Number(e.target.value)
                    if (v !== lead.estimatedVolume) patchLead({ estimatedVolume: v })
                  }}
                  disabled={saving}
                />
              </Field>
              <Field label="Owner">
                <Input
                  defaultValue={lead.ownerName}
                  className="h-8"
                  onBlur={(e) => {
                    if (e.target.value !== lead.ownerName) patchLead({ ownerName: e.target.value })
                  }}
                  disabled={saving}
                />
              </Field>
              <Field label="Expected close date">
                <Input
                  type="date"
                  defaultValue={lead.expectedCloseDate ? String(lead.expectedCloseDate).slice(0, 10) : ''}
                  className="h-8"
                  onBlur={(e) => {
                    patchLead({ expectedCloseDate: e.target.value ? new Date(e.target.value).toISOString() : null })
                  }}
                  disabled={saving}
                />
              </Field>
              <Field label="Onboarding">
                {lead.stage !== 'onboarding' ? (
                  <span className="text-xs text-muted-foreground">
                    {lead.onboardedAt ? `Onboarded ${formatDate(lead.onboardedAt)}` : 'Starts once moved to Onboarding'}
                  </span>
                ) : (
                  <div className="flex items-center gap-2">
                    <Badge variant={lead.onboardingSubStage === 'final_onboarded' ? 'success' : 'outline'} className="gap-1">
                      {lead.onboardingSubStage === 'final_onboarded' && <CheckCircle2 className="h-3 w-3" />}
                      {lead.onboardingSubStage ? ONBOARDING_SUB_STAGE_LABELS[lead.onboardingSubStage] : 'Not started'}
                      {' · '}
                      {onboardingProgressPercent(lead.onboardingSubStage)}%
                    </Badge>
                    <Link
                      href={`/leads/${lead.id}/onboarding`}
                      className="flex items-center gap-1 text-xs text-blue-600 hover:underline"
                    >
                      View more <ArrowRight className="h-3 w-3" />
                    </Link>
                  </div>
                )}
              </Field>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Pain points</Label>
                <Textarea
                  rows={3}
                  placeholder="What's hurting them today?"
                  defaultValue={lead.painPoints}
                  onBlur={(e) => {
                    if (e.target.value !== lead.painPoints) patchLead({ painPoints: e.target.value })
                  }}
                  disabled={saving}
                />
              </div>
              <div className="space-y-1.5">
                <Label>What they want</Label>
                <Textarea
                  rows={3}
                  placeholder="What are they actually asking for?"
                  defaultValue={lead.whatTheyWant}
                  onBlur={(e) => {
                    if (e.target.value !== lead.whatTheyWant) patchLead({ whatTheyWant: e.target.value })
                  }}
                  disabled={saving}
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Notes</Label>
              <Textarea
                rows={4}
                defaultValue={lead.notes}
                onBlur={(e) => {
                  if (e.target.value !== lead.notes) patchLead({ notes: e.target.value })
                }}
                disabled={saving}
              />
            </div>
          </TabsContent>

          <TabsContent value="activities" className="pt-2 space-y-4">
            <EmailComposer
              key={lead.id}
              leadId={lead.id}
              leadEmail={lead.email}
              isNewStage={lead.stage === 'new'}
              onSent={handleEmailSent}
              onMarkContacted={() => patchLead({ stage: 'contacted' })}
            />

            <div className="rounded-md border p-3 space-y-2">
              <div className="flex gap-2">
                <Select
                  value={activityForm.type}
                  onValueChange={(v) => setActivityForm({ ...activityForm, type: v as ActivityType })}
                >
                  <SelectTrigger className="h-9 w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="call">Call</SelectItem>
                    <SelectItem value="email">Email</SelectItem>
                    <SelectItem value="meeting">Meeting</SelectItem>
                    <SelectItem value="note">Note</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Textarea
                placeholder="What happened? Discovery notes, call outcome, follow-up plan…"
                value={activityForm.description}
                onChange={(e) => setActivityForm({ ...activityForm, description: e.target.value })}
                rows={2}
              />
              <div className="flex justify-end">
                <Button size="sm" onClick={addActivity} disabled={!activityForm.description}>
                  Log activity
                </Button>
              </div>
            </div>

            <div className="space-y-3">
              {activities.length === 0 && (
                <p className="text-sm text-muted-foreground">No activity yet. Log one above.</p>
              )}
              {activities.map((a) => (
                <div key={a.id} className="flex items-start gap-3 rounded-md border p-3">
                  <div className="mt-0.5 text-muted-foreground">{ACTIVITY_ICONS[a.type]}</div>
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
            </div>
          </TabsContent>

          <TabsContent value="tasks" className="pt-2">
            <LeadTasksTab leadId={lead.id} />
          </TabsContent>

          <TabsContent value="skills" className="pt-2 space-y-4">
            <p className="text-sm text-muted-foreground">
              Run a lead-scoped skill against this lead's data. Output opens in a new tab so you can keep this dialog open.
            </p>
            <div className="grid gap-2 sm:grid-cols-2">
              {leadSkills.map((s) => (
                <button
                  key={s.id}
                  className="flex items-start gap-3 rounded-md border p-3 text-left hover:border-blue-400 hover:bg-accent transition-colors disabled:opacity-50"
                  onClick={() => runSkill(s.id, s.name)}
                  disabled={running === s.id}
                >
                  <Sparkles className="h-4 w-4 mt-0.5 text-violet-500 shrink-0" />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium">{s.name}</p>
                    <p className="text-xs text-muted-foreground line-clamp-2">{s.description}</p>
                  </div>
                  {running === s.id && <Loader2 className="h-4 w-4 animate-spin shrink-0" />}
                </button>
              ))}
            </div>

            {skillRuns.length > 0 && (
              <div className="border-t pt-4">
                <p className="text-xs uppercase tracking-wide text-muted-foreground mb-2">Past runs</p>
                <div className="space-y-1.5">
                  {skillRuns.map((r) => (
                    <a
                      key={r.id}
                      href={`/skills/${r.skillId}?leadId=${lead.id}&runId=${r.id}`}
                      target="_blank"
                      className="flex items-center justify-between gap-2 rounded-md border px-3 py-2 text-sm hover:bg-accent"
                    >
                      <div>
                        <p className="font-medium">{r.skillName}</p>
                        <p className="text-xs text-muted-foreground">
                          {formatRelative(r.createdAt)} · {r.runnerType === 'script' ? '⚡ script' : '🧠 LLM'}
                        </p>
                      </div>
                      <ExternalLink className="h-3.5 w-3.5 text-muted-foreground" />
                    </a>
                  ))}
                </div>
              </div>
            )}
          </TabsContent>
        </Tabs>

        <div className="flex justify-between items-center border-t pt-3 text-xs text-muted-foreground">
          <span>
            Created {formatDateTime(lead.createdAt)} · Updated {formatRelative(lead.updatedAt)}
          </span>
        </div>
      </DialogContent>
    </Dialog>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5 min-w-0">
      <Label className="text-xs uppercase tracking-wide text-muted-foreground">{label}</Label>
      <div>{children}</div>
    </div>
  )
}