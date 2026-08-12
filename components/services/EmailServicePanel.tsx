'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Search, Mail } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { EmailComposer } from '@/components/leads/EmailComposer'
import { CustomEmailComposer } from '@/components/leads/CustomEmailComposer'
import { SkillRunner } from '@/components/skills/SkillRunner'
import { getSkill } from '@/lib/skills/catalog'
import { cn } from '@/lib/utils'
import { STAGE_LABELS, type Stage } from '@/lib/types'

export interface SlimLead {
  id: string
  poc: string | null
  company: string
  email: string
  stage: string
}

const LEAD_SKILLS = ['write-the-follow-up', 'ghosted-after-the-demo']
const CADENCE_SKILLS = ['spam-folder-check', 'email-nurture-sequence-review', 'cold-outbound-sequence-review']

export function EmailServicePanel({ leads: initialLeads }: { leads: SlimLead[] }) {
  const router = useRouter()
  const [leads, setLeads] = useState(initialLeads)
  const [search, setSearch] = useState('')
  const [selectedId, setSelectedId] = useState<string | null>(null)

  const filtered = leads.filter((l) => {
    const q = search.trim().toLowerCase()
    if (!q) return true
    return `${l.company} ${l.poc ?? ''} ${l.email}`.toLowerCase().includes(q)
  })

  const selected = leads.find((l) => l.id === selectedId) ?? null

  async function markContacted() {
    if (!selected) return
    const res = await fetch(`/api/leads/${selected.id}`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ stage: 'contacted' }),
    })
    if (res.ok) {
      setLeads((prev) => prev.map((l) => (l.id === selected.id ? { ...l, stage: 'contacted' } : l)))
      router.refresh()
    }
  }

  return (
    <div className="space-y-6">
      <Tabs defaultValue="lead">
        <TabsList>
          <TabsTrigger value="lead">Send to a lead</TabsTrigger>
          <TabsTrigger value="custom">Send to someone else</TabsTrigger>
        </TabsList>

        <TabsContent value="lead" className="pt-4">
          <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Pick a lead</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="relative">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search leads…"
                    className="pl-9 h-9"
                  />
                </div>
                <div className="max-h-[420px] overflow-y-auto space-y-1">
                  {filtered.length === 0 && (
                    <p className="text-xs text-muted-foreground py-4 text-center">No leads match.</p>
                  )}
                  {filtered.map((l) => (
                    <button
                      key={l.id}
                      onClick={() => setSelectedId(l.id)}
                      className={cn(
                        'w-full text-left rounded-md border px-2.5 py-2 transition-colors',
                        l.id === selectedId ? 'border-blue-400 bg-accent' : 'hover:bg-accent/60'
                      )}
                    >
                      <p className="text-sm font-medium truncate">{l.company}</p>
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-xs text-muted-foreground truncate">{l.poc || 'No POC set'}</p>
                        <Badge variant="outline" className="text-[10px] shrink-0">
                          {STAGE_LABELS[l.stage as Stage] ?? l.stage}
                        </Badge>
                      </div>
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>

            <div className="min-w-0">
              {!selected ? (
                <Card>
                  <CardContent className="p-10 text-center text-sm text-muted-foreground">
                    <Mail className="h-6 w-6 mx-auto mb-2 opacity-50" />
                    Pick a lead to send an email and run lead-scoped outreach skills against them.
                  </CardContent>
                </Card>
              ) : (
                <section className="space-y-3">
                  <h2 className="text-sm font-semibold">
                    {selected.company}
                    {selected.poc && <span className="text-muted-foreground font-normal"> · {selected.poc}</span>}
                  </h2>
                  <EmailComposer
                    key={selected.id}
                    leadId={selected.id}
                    leadEmail={selected.email}
                    isNewStage={selected.stage === 'new'}
                    onSent={() => router.refresh()}
                    onMarkContacted={markContacted}
                  />
                  <div className="grid gap-4 sm:grid-cols-2">
                    {LEAD_SKILLS.map((id) => {
                      const skill = getSkill(id)
                      if (!skill) return null
                      return (
                        <div key={id} className="space-y-1.5">
                          <p className="text-sm font-medium">{skill.name}</p>
                          <p className="text-xs text-muted-foreground">{skill.description}</p>
                          <SkillRunner skillId={id} leadId={selected.id} />
                        </div>
                      )
                    })}
                  </div>
                </section>
              )}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="custom" className="pt-4 max-w-xl">
          <CustomEmailComposer />
        </TabsContent>
      </Tabs>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold">Deliverability &amp; cadence</h2>
        <p className="text-xs text-muted-foreground">
          Portfolio-level — these don&apos;t need a specific lead selected.
        </p>
        <div className="grid gap-4 sm:grid-cols-2">
          {CADENCE_SKILLS.map((id) => {
            const skill = getSkill(id)
            if (!skill) return null
            return (
              <div key={id} className="space-y-1.5">
                <p className="text-sm font-medium">{skill.name}</p>
                <p className="text-xs text-muted-foreground">{skill.description}</p>
                <SkillRunner skillId={id} />
              </div>
            )
          })}
        </div>
      </section>
    </div>
  )
}
