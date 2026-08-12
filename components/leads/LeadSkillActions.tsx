'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Sparkles, Loader2, ExternalLink, History } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { SKILLS } from '@/lib/skills/catalog'
import { useRouter } from 'next/navigation'

export function LeadSkillActions({ leadId }: { leadId: string }) {
  const router = useRouter()
  const [running, setRunning] = useState<string | null>(null)

  const leadSkills = SKILLS.filter((s) => s.scope === 'lead')

  async function runSkill(skillId: string) {
    setRunning(skillId)
    try {
      const res = await fetch('/api/skills/run', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ skillId, leadId, scope: 'lead' }),
      })
      const data = await res.json()
      if (data.runId) {
        router.push(`/skills/${skillId}?leadId=${leadId}&runId=${data.runId}`)
      } else {
        window.open(`/skills/${skillId}?leadId=${leadId}`, '_blank')
      }
    } finally {
      setRunning(null)
    }
  }

  return (
    <Card className="sticky top-20">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-violet-500" />
          Run a skill on this lead
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {leadSkills.map((s) => (
          <button
            key={s.id}
            onClick={() => runSkill(s.id)}
            disabled={running === s.id}
            className="group flex w-full items-start gap-2 rounded-md border p-2.5 text-left hover:border-blue-400 hover:bg-accent transition-colors disabled:opacity-50"
          >
            <Sparkles className="h-3.5 w-3.5 mt-0.5 text-violet-500 shrink-0" />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium">{s.name}</p>
              <p className="text-xs text-muted-foreground line-clamp-2">{s.description}</p>
            </div>
            {running === s.id ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin shrink-0" />
            ) : (
              <ExternalLink className="h-3.5 w-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 shrink-0" />
            )}
          </button>
        ))}
      </CardContent>
    </Card>
  )
}