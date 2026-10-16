import { ArrowRight } from 'lucide-react'
import Link from 'next/link'
import { cn } from '@/lib/utils'

// Bento layout: a grid of unequal cells, each able to carry a live preview
// behind its label. Adapted from the magicui pattern, with two changes for
// this codebase: lucide icons (the set the product already uses) instead of
// @radix-ui/react-icons, which is not a dependency here, and `background` as
// a ReactNode so a cell can hold a real component rather than a decorative
// image. Nothing on this site renders invented UI.

export function BentoGrid({
  children,
  className,
}: {
  children: React.ReactNode
  className?: string
}) {
  return (
    <div className={cn('grid w-full auto-rows-[18rem] grid-cols-1 gap-4 md:grid-cols-3', className)}>
      {children}
    </div>
  )
}

export function BentoCard({
  name,
  className,
  background,
  Icon,
  description,
  href,
  cta,
}: {
  name: string
  className?: string
  background?: React.ReactNode
  Icon: React.ElementType
  description: string
  href?: string
  cta?: string
}) {
  return (
    <div
      key={name}
      className={cn(
        'group relative flex flex-col justify-between overflow-hidden rounded-xl',
        'border border-white/[0.09] bg-[#0b0d14]',
        'transform-gpu transition-all duration-300 hover:border-white/[0.16]',
        className,
      )}
    >
      {/* Live preview sits behind the label, dimmed so the copy stays legible
          and lifts slightly on hover. */}
      {background && (
        <div className="pointer-events-none absolute inset-0 opacity-60 transition-opacity duration-300 group-hover:opacity-80">
          {background}
        </div>
      )}

      <div className="pointer-events-none relative z-10 flex transform-gpu flex-col gap-1 p-6 transition-all duration-300 group-hover:-translate-y-1">
        <Icon className="h-6 w-6 text-white/40 transition-colors duration-300 group-hover:text-[#5b8cff]" strokeWidth={1.6} />
        <h3 className="mt-2 text-lg font-semibold text-white">{name}</h3>
        <p className="max-w-lg text-sm text-white/55">{description}</p>
      </div>

      {href && cta && (
        <div className="relative z-10 flex w-full translate-y-2 transform-gpu flex-row items-center p-6 pt-0 opacity-0 transition-all duration-300 group-hover:translate-y-0 group-hover:opacity-100">
          <Link href={href} className="inline-flex items-center gap-1 text-sm font-medium text-white/80 hover:text-white">
            {cta}
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      )}

      {/* Scrim: keeps the label readable over a busy preview. */}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-[#0b0d14] via-[#0b0d14]/60 to-transparent" />
    </div>
  )
}
