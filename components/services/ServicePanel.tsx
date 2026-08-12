'use client'

import { useState } from 'react'
import { Search, Sparkles } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { SkillRunner } from '@/components/skills/SkillRunner'
import { getSkill } from '@/lib/skills/catalog'
import { cn } from '@/lib/utils'
import { STAGE_LABELS, type Stage } from '@/lib/types'
import type { ServiceDef } from '@/lib/services/catalog'

export interface SlimLead {
  id: string
  poc: string | null
  company: string
  stage: string
}

function SkillGrid({ skillIds, leadId }: { skillIds: string[]; leadId?: string }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {skillIds.map((id) => {
        const skill = getSkill(id)
        if (!skill) return null
        return (
          <div key={id} className="space-y-1.5">
            <p className="text-sm font-medium">{skill.name}</p>
            <p className="text-xs text-muted-foreground">{skill.description}</p>
            <SkillRunner skillId={id} leadId={leadId} />
          </div>
        )
      })}
    </div>
  )
}

export function ServicePanel({ service, leads }: { service: ServiceDef; leads: SlimLead[] }) {
  const [search, setSearch] = useState('')
  const [selectedId, setSelectedId] = useState<string | null>(null)

  const hasLeadSkills = service.leadSkillIds.length > 0
  const filtered = leads.filter((l) => {
    const q = search.trim().toLowerCase()
    if (!q) return true
    return `${l.company} ${l.poc ?? ''}`.toLowerCase().includes(q)
  })
  const selected = leads.find((l) => l.id === selectedId) ?? null

  return (
    <div className="space-y-6">
      {hasLeadSkills && (
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
                  <Sparkles className="h-6 w-6 mx-auto mb-2 opacity-50" />
                  Pick a lead to run lead-scoped skills against them.
                </CardContent>
              </Card>
            ) : (
              <section className="space-y-3">
                <h2 className="text-sm font-semibold">
                  {selected.company}
                  {selected.poc && <span className="text-muted-foreground font-normal"> · {selected.poc}</span>}
                </h2>
                <SkillGrid skillIds={service.leadSkillIds} leadId={selected.id} />
              </section>
            )}
          </div>
        </div>
      )}

      {service.portfolioSkillIds.length > 0 && (
        <section className="space-y-3">
          {hasLeadSkills && (
            <>
              <h2 className="text-sm font-semibold">Portfolio-wide</h2>
              <p className="text-xs text-muted-foreground">These don&apos;t need a specific lead selected.</p>
            </>
          )}
          <SkillGrid skillIds={service.portfolioSkillIds} />
        </section>
      )}
    </div>
  )
}
