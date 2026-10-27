import Link from 'next/link'
import { cn } from '@/lib/utils'

const WEEKDAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const MAX_VISIBLE_TASKS = 3
const MAX_VISIBLE_LEADS = 2

export interface CalendarDayTask {
  id: string
  title: string
  done: boolean
  leadId: string | null
  leadCompany: string | null
}

export interface CalendarDayLead {
  id: string
  company: string
  stageColor: string
}

export interface CalendarDay {
  date: string
  label: string
  isCurrentMonth: boolean
  isToday: boolean
  tasks: CalendarDayTask[]
  leads: CalendarDayLead[]
}

export function CalendarMonth({ days }: { days: CalendarDay[] }) {
  return (
    <div className="overflow-x-auto">
      <div className="min-w-[640px] rounded-lg border">
        <div className="grid grid-cols-7 border-b bg-muted/40 text-xs font-medium text-muted-foreground">
          {WEEKDAY_LABELS.map((label) => (
            <div key={label} className="px-2 py-1.5 text-center">
              {label}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7">
          {days.map((day) => {
            const visible = day.tasks.slice(0, MAX_VISIBLE_TASKS)
            const overflow = day.tasks.length - visible.length
            const visibleLeads = day.leads.slice(0, MAX_VISIBLE_LEADS)
            const leadOverflow = day.leads.length - visibleLeads.length
            return (
              <div
                key={day.date}
                className={cn(
                  'flex min-h-[6.5rem] flex-col gap-1 border-b border-r p-1.5 last:border-r-0',
                  !day.isCurrentMonth && 'bg-muted/20'
                )}
              >
                <span
                  className={cn(
                    'inline-flex h-5 w-5 items-center justify-center rounded-full text-xs',
                    !day.isCurrentMonth && 'text-muted-foreground',
                    day.isToday && 'bg-primary font-semibold text-primary-foreground'
                  )}
                >
                  {day.label}
                </span>
                <div className="flex flex-col gap-0.5">
                  {visible.map((task) => {
                    const content = (
                      <span
                        className={cn(
                          'block truncate rounded px-1 py-0.5 text-[11px] leading-tight',
                          task.done
                            ? 'text-muted-foreground line-through'
                            : 'bg-primary/10 text-primary'
                        )}
                        title={task.leadCompany ? `${task.title} — ${task.leadCompany}` : task.title}
                      >
                        {task.title}
                      </span>
                    )
                    return task.leadId ? (
                      <Link key={task.id} href={`/leads/${task.leadId}`}>
                        {content}
                      </Link>
                    ) : (
                      <div key={task.id}>{content}</div>
                    )
                  })}
                  {overflow > 0 && (
                    <span className="px-1 text-[11px] text-muted-foreground">+{overflow} more</span>
                  )}
                  {visibleLeads.map((lead) => (
                    <Link key={lead.id} href={`/leads/${lead.id}`} className="flex items-center gap-1 truncate px-1 py-0.5">
                      <span
                        className="h-1.5 w-1.5 shrink-0 rounded-full"
                        style={{ backgroundColor: lead.stageColor }}
                      />
                      <span className="truncate text-[11px] leading-tight text-foreground/80" title={`${lead.company} — expected close`}>
                        {lead.company}
                      </span>
                    </Link>
                  ))}
                  {leadOverflow > 0 && (
                    <span className="px-1 text-[11px] text-muted-foreground">+{leadOverflow} more</span>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
