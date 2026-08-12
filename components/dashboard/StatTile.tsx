import Link from 'next/link'
import { Card, CardContent } from '@/components/ui/card'
import { cn, formatCurrency } from '@/lib/utils'

export interface StatTileProps {
  label: string
  value: string | number
  hint?: string
  trend?: { direction: 'up' | 'down' | 'flat'; text: string }
  icon?: React.ReactNode
  className?: string
  href?: string
}

export function StatTile({ label, value, hint, trend, icon, className, href }: StatTileProps) {
  const card = (
    <Card className={cn('border-muted', href && 'transition-colors hover:border-blue-300 hover:bg-accent/40', className)}>
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
            <p className="text-2xl font-semibold">{value}</p>
            {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
          </div>
          {icon && <div className="text-muted-foreground/60">{icon}</div>}
        </div>
        {trend && (
          <p
            className={cn(
              'mt-2 text-xs font-medium',
              trend.direction === 'up' && 'text-emerald-600',
              trend.direction === 'down' && 'text-rose-600',
              trend.direction === 'flat' && 'text-muted-foreground'
            )}
          >
            {trend.direction === 'up' ? '↑ ' : trend.direction === 'down' ? '↓ ' : '→ '}
            {trend.text}
          </p>
        )}
      </CardContent>
    </Card>
  )
  return href ? <Link href={href}>{card}</Link> : card
}

export function CurrencyTile(props: Omit<StatTileProps, 'value'> & { value: number }) {
  return <StatTile {...props} value={formatCurrency(props.value)} />
}