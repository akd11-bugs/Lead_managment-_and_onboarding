import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const badgeVariants = cva(
  'inline-flex items-center rounded-md border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
  {
    variants: {
      variant: {
        default: 'border-transparent bg-primary text-primary-foreground shadow hover:bg-primary/80',
        primary: 'border-transparent bg-primary text-primary-foreground shadow hover:bg-primary/80',
        secondary: 'border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80',
        destructive: 'border-transparent bg-destructive text-destructive-foreground shadow hover:bg-destructive/80',
        outline: 'text-foreground',
        success: 'border-transparent bg-emerald-500 text-white shadow',
        warning: 'border-transparent bg-amber-500 text-white shadow',
        info: 'border-transparent bg-sky-500 text-white shadow',
        mono: 'border-transparent bg-foreground text-background shadow',
      },
      // Outlined treatment: drops the fill and tints the border and text with
      // the variant's colour instead. Applied via compoundVariants so each
      // variant keeps its own hue.
      appearance: {
        solid: '',
        stroke: 'bg-transparent shadow-none',
      },
    },
    compoundVariants: [
      { appearance: 'stroke', variant: 'default', className: 'border-primary text-primary hover:bg-primary/10' },
      { appearance: 'stroke', variant: 'primary', className: 'border-primary text-primary hover:bg-primary/10' },
      {
        appearance: 'stroke',
        variant: 'secondary',
        className: 'border-border text-muted-foreground hover:bg-secondary/40',
      },
      {
        appearance: 'stroke',
        variant: 'destructive',
        className: 'border-destructive text-destructive hover:bg-destructive/10',
      },
      { appearance: 'stroke', variant: 'success', className: 'border-emerald-500 text-emerald-500 hover:bg-emerald-500/10' },
      { appearance: 'stroke', variant: 'warning', className: 'border-amber-500 text-amber-500 hover:bg-amber-500/10' },
      { appearance: 'stroke', variant: 'info', className: 'border-sky-500 text-sky-500 hover:bg-sky-500/10' },
      { appearance: 'stroke', variant: 'mono', className: 'border-foreground text-foreground hover:bg-foreground/10' },
    ],
    defaultVariants: { variant: 'default', appearance: 'solid' },
  }
)

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, appearance, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant, appearance }), className)} {...props} />
}

export { Badge, badgeVariants }