'use client'

import { useState } from 'react'
import { Loader2, Play, RefreshCw, AlertTriangle, Clock, DollarSign, FileText } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { ReportRenderer } from './ReportRenderer'
import { getSkill } from '@/lib/skills/catalog'
import { Skeleton } from '@/components/ui/skeleton'

interface RunResult {
  skillId: string
  skillName: string
  runnerType: 'script' | 'llm'
  outputMarkdown: string
  outputStructured?: unknown
  ok: boolean
  error?: string
  durationMs: number
  cost?: { inputTokens: number; outputTokens: number; estimatedUsd: number }
  runId?: string
}

export function SkillRunner({
  skillId,
  leadId,
  pastRun,
}: {
  skillId: string
  leadId?: string
  pastRun?: {
    id: string
    outputMarkdown: string
    runnerType: string
    createdAt: Date | string
    inputJson?: string
  } | null
}) {
  const skill = getSkill(skillId)
  const [running, setRunning] = useState(false)
  const [result, setResult] = useState<RunResult | null>(
    pastRun
      ? {
          ok: true,
          skillId,
          skillName: skill?.name ?? skillId,
          runnerType: pastRun.runnerType as 'script' | 'llm',
          outputMarkdown: pastRun.outputMarkdown,
          durationMs: 0,
          runId: pastRun.id,
        }
      : null
  )
  const [userQuestion, setUserQuestion] = useState('')
  const [error, setError] = useState<string | null>(null)

  async function run() {
    setRunning(true)
    setError(null)
    try {
      const res = await fetch('/api/skills/run', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ skillId, leadId, userQuestion: userQuestion.trim() || undefined }),
      })
      const data = await res.json()
      if (!res.ok || !data.ok) {
        setError(data.error ?? `Skill run failed (${res.status})`)
        setResult(data)
      } else {
        setResult(data)
      }
    } catch (e: any) {
      setError(e.message ?? 'Network error')
    } finally {
      setRunning(false)
    }
  }

  return (
    <div className="space-y-4">
      {!pastRun && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Run this skill</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Badge variant="outline">Scope: {leadId ? 'this lead' : 'portfolio'}</Badge>
              {skill?.runnerType === 'script' ? (
                <Badge variant="success" className="gap-1">
                  Local Python — no API call needed
                </Badge>
              ) : (
                <Badge variant="secondary" className="gap-1">
                  Calls Claude (~ $0.05–0.30 per run)
                </Badge>
              )}
            </div>
            <div>
              <label className="text-sm font-medium">Optional focus for this run</label>
              <Textarea
                rows={2}
                placeholder={
                  skill?.runnerType === 'script'
                    ? 'Optional: e.g. cycle=45d, inactive=90d'
                    : 'e.g. "Focus on the deals over $20k from this quarter"'
                }
                value={userQuestion}
                onChange={(e) => setUserQuestion(e.target.value)}
                className="mt-1"
              />
            </div>
            <Button onClick={run} disabled={running}>
              {running ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Running…
                </>
              ) : result ? (
                <>
                  <RefreshCw className="h-4 w-4" />
                  Run again
                </>
              ) : (
                <>
                  <Play className="h-4 w-4" />
                  Run skill
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      )}

      {error && (
        <Card className="border-rose-300 bg-rose-50 dark:bg-rose-950/20">
          <CardContent className="p-4 flex items-start gap-2 text-sm">
            <AlertTriangle className="h-4 w-4 text-rose-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-rose-900 dark:text-rose-100">Skill failed</p>
              <p className="text-rose-700 dark:text-rose-300 text-xs mt-0.5">{error}</p>
            </div>
          </CardContent>
        </Card>
      )}

      {running && (
        <Card>
          <CardContent className="p-5 space-y-3">
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-3 w-full" />
            <Skeleton className="h-3 w-5/6" />
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-3 w-2/3" />
          </CardContent>
        </Card>
      )}

      {result && !running && (
        <>
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {(result.durationMs / 1000).toFixed(1)}s
            </span>
            {result.cost && (
              <span className="inline-flex items-center gap-1">
                <DollarSign className="h-3 w-3" />
                ${result.cost.estimatedUsd.toFixed(3)} ({result.cost.inputTokens}+{result.cost.outputTokens} tok)
              </span>
            )}
            {result.runnerType === 'script' && (
              <span className="inline-flex items-center gap-1">
                <FileText className="h-3 w-3" />
                Local script — no API call
              </span>
            )}
          </div>
          <ReportRenderer markdown={result.outputMarkdown} />
        </>
      )}
    </div>
  )
}