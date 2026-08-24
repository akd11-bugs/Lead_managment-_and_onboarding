import Link from 'next/link'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  isToday,
  startOfMonth,
  startOfWeek,
  subMonths,
} from 'date-fns'
import { Button } from '@/components/ui/button'
import { prisma } from '@/lib/db'
import { requireUser, isAdmin } from '@/lib/session'
import { CalendarMonth, type CalendarDay } from '@/components/calendar/CalendarMonth'

export const dynamic = 'force-dynamic'

export default async function CalendarPage({
  searchParams,
}: {
  searchParams: Promise<{ y?: string; m?: string }>
}) {
  const user = await requireUser()
  const { y, m } = await searchParams

  const now = new Date()
  const year = y ? Number(y) : now.getFullYear()
  const month = m ? Number(m) - 1 : now.getMonth()
  const anchor = new Date(year, month, 1)

  const monthStart = startOfMonth(anchor)
  const monthEnd = endOfMonth(anchor)
  const gridStart = startOfWeek(monthStart)
  const gridEnd = endOfWeek(monthEnd)

  const tasks = await prisma.task.findMany({
    where: {
      ...(isAdmin(user) ? {} : { ownerId: user.id }),
      dueDate: { gte: gridStart, lte: gridEnd },
    },
    orderBy: { dueDate: 'asc' },
    include: { lead: { select: { id: true, company: true } } },
  })

  const days: CalendarDay[] = eachDayOfInterval({ start: gridStart, end: gridEnd }).map((date) => ({
    date: date.toISOString(),
    label: format(date, 'd'),
    isCurrentMonth: isSameMonth(date, anchor),
    isToday: isToday(date),
    tasks: tasks
      .filter((t) => t.dueDate && isSameDay(t.dueDate, date))
      .map((t) => ({
        id: t.id,
        title: t.title,
        done: t.done,
        leadId: t.leadId,
        leadCompany: t.lead?.company ?? null,
      })),
  }))

  const prev = subMonths(anchor, 1)
  const next = addMonths(anchor, 1)

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Calendar</h1>
          <p className="text-sm text-muted-foreground">Task due dates at a glance.</p>
        </div>
        <div className="flex items-center gap-2">
          <Link href={`/calendar?y=${prev.getFullYear()}&m=${prev.getMonth() + 1}`}>
            <Button variant="outline" size="icon">
              <ChevronLeft className="h-4 w-4" />
            </Button>
          </Link>
          <span className="min-w-[9rem] text-center text-sm font-medium">{format(anchor, 'MMMM yyyy')}</span>
          <Link href={`/calendar?y=${next.getFullYear()}&m=${next.getMonth() + 1}`}>
            <Button variant="outline" size="icon">
              <ChevronRight className="h-4 w-4" />
            </Button>
          </Link>
        </div>
      </div>
      <CalendarMonth days={days} />
    </div>
  )
}
