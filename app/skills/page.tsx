import { SKILLS, SKILL_CATEGORIES } from '@/lib/skills/catalog'
import { Card, CardContent } from '@/components/ui/card'
import Link from 'next/link'
import { Sparkles, Zap } from 'lucide-react'
import * as Icons from 'lucide-react'
import { cn } from '@/lib/utils'

export const dynamic = 'force-dynamic'

export default function SkillsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Skills</h1>
        <p className="text-sm text-muted-foreground">
          30 diagnostic skills, productized. Two run locally via Python (no API). The rest use Claude.
        </p>
      </div>

      <div className="rounded-md border bg-muted/30 px-4 py-2.5 flex items-center gap-3 text-xs">
        <Zap className="h-3.5 w-3.5 text-emerald-600" />
        <span className="text-muted-foreground">
          <span className="font-medium text-foreground">Script-backed (instant):</span> Pipeline Hygiene Audit, Spam Folder Check.
        </span>
        <span className="text-muted-foreground ml-auto">
          <span className="font-medium text-foreground">LLM-backed:</span> 28 skills via Claude.
        </span>
      </div>

      <div className="space-y-8">
        {SKILL_CATEGORIES.map((cat) => {
          const inCat = SKILLS.filter((s) => s.category === cat.id)
          return (
            <section key={cat.id}>
              <div className="mb-3">
                <h2 className="text-base font-semibold">{cat.label}</h2>
                <p className="text-xs text-muted-foreground">{cat.description}</p>
              </div>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {inCat.map((s) => {
                  const Icon = (Icons as any)[s.icon] ?? Sparkles
                  return (
                    <Link
                      key={s.id}
                      href={`/skills/${s.id}`}
                      className="group rounded-lg border bg-card p-4 shadow-sm hover:shadow-md hover:border-blue-300 transition-all"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div
                          className={cn(
                            'h-8 w-8 rounded-md grid place-items-center shrink-0',
                            s.runnerType === 'script'
                              ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
                              : 'bg-violet-100 text-violet-700 dark:bg-violet-950 dark:text-violet-300'
                          )}
                        >
                          <Icon className="h-4 w-4" />
                        </div>
                        {s.runnerType === 'script' && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-medium text-emerald-700 dark:text-emerald-300">
                            <Zap className="h-3 w-3" />
                            Instant
                          </span>
                        )}
                      </div>
                      <p className="mt-3 text-sm font-semibold">{s.name}</p>
                      <p className="mt-1 text-xs text-muted-foreground line-clamp-3">{s.description}</p>
                      <div className="mt-3 flex items-center gap-2 text-[10px] text-muted-foreground uppercase tracking-wide">
                        <span>{s.scope}</span>
                        <span>·</span>
                        <span>{s.outputType}</span>
                      </div>
                    </Link>
                  )
                })}
              </div>
            </section>
          )
        })}
      </div>
    </div>
  )
}