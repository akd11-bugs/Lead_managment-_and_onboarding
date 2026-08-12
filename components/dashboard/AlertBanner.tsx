import Link from 'next/link'
import { AlertTriangle, ArrowRight } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { AlertTaskButton } from './AlertTaskButton'
import type { Alert } from '@/lib/alerts'
import { cn } from '@/lib/utils'

const SEVERITY_STYLES = {
  high: 'border-rose-300 bg-rose-50 dark:bg-rose-950/20',
  medium: 'border-amber-300 bg-amber-50 dark:bg-amber-950/20',
  low: 'border-slate-200 bg-slate-50 dark:bg-slate-900',
}

const SEVERITY_DOT = {
  high: 'bg-rose-500',
  medium: 'bg-amber-500',
  low: 'bg-slate-400',
}

export function AlertBanner({ alerts }: { alerts: Alert[] }) {
  if (alerts.length === 0) {
    return (
      <Card>
        <CardContent className="p-5 flex items-center gap-3 text-sm text-muted-foreground">
          <div className="h-2 w-2 rounded-full bg-emerald-500" />
          No skill alerts. Everything is fresh.
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <AlertTriangle className="h-4 w-4 text-amber-500" />
          {alerts.length} skill{alerts.length === 1 ? '' : 's'} suggested by your data
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {alerts.map((a) => (
          <Link
            key={`${a.skillId}-${a.metric}`}
            href={`/skills/${a.skillId}`}
            className={cn(
              'flex items-center justify-between gap-3 rounded-lg border px-3 py-2.5 transition-colors hover:bg-accent',
              SEVERITY_STYLES[a.severity]
            )}
          >
            <div className="flex items-center gap-3 min-w-0">
              <span className={cn('h-2 w-2 shrink-0 rounded-full', SEVERITY_DOT[a.severity])} />
              <div className="min-w-0">
                <p className="text-sm font-medium truncate">{a.skillName}</p>
                <p className="text-xs text-muted-foreground truncate">{a.reason}</p>
              </div>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <AlertTaskButton title={a.reason} />
              <Button variant="ghost" size="sm" className="gap-1">
                Run <ArrowRight className="h-3 w-3" />
              </Button>
            </div>
          </Link>
        ))}
      </CardContent>
    </Card>
  )
}