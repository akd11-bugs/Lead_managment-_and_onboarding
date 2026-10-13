import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { CheckCircle2, Circle } from 'lucide-react'

interface GettingStartedStep {
  label: string
  done: boolean
  href: string
}

// Derived live from data that already exists — no separate tracking table.
// Shows up only while there's something left to do; once every step is
// done, the card simply stops rendering (see the `steps.every` check below).
export function GettingStartedCard({
  realLeadCount,
  teamMemberCount,
  sheetConnected,
}: {
  realLeadCount: number
  teamMemberCount: number
  sheetConnected: boolean
}) {
  const steps: GettingStartedStep[] = [
    { label: 'Add your first real lead', done: realLeadCount > 0, href: '/leads' },
    { label: 'Invite a teammate', done: teamMemberCount > 1, href: '/settings' },
    { label: 'Connect a Google Sheet (optional, two-way sync)', done: sheetConnected, href: '/settings' },
  ]

  if (steps.every((s) => s.done)) return null

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Getting started</CardTitle>
        <CardDescription>A few sample leads are in your pipeline below — here&apos;s what&apos;s next.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-1">
        {steps.map((step) => (
          <Link
            key={step.label}
            href={step.href}
            className="flex items-center gap-2.5 rounded-md px-2 py-1.5 text-sm hover:bg-muted/60 -mx-2"
          >
            {step.done ? (
              <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
            ) : (
              <Circle className="h-4 w-4 shrink-0 text-muted-foreground" />
            )}
            <span className={step.done ? 'text-muted-foreground line-through' : ''}>{step.label}</span>
          </Link>
        ))}
      </CardContent>
    </Card>
  )
}
