import { prisma } from '@/lib/db'
import { sendEmail } from '@/lib/email'

const ACTOR_ACTIVITY_TYPES = ['call', 'email', 'meeting', 'note', 'stage_change']

const TYPE_LABELS: Record<string, string> = {
  call: 'Call',
  email: 'Email',
  meeting: 'Meeting',
  note: 'Note',
  stage_change: 'Stage change',
}

const IST = 'Asia/Kolkata'

function dayRange(date: Date): { start: Date; end: Date } {
  const start = new Date(date.getFullYear(), date.getMonth(), date.getDate())
  const end = new Date(start.getFullYear(), start.getMonth(), start.getDate(), 23, 59, 59, 999)
  return { start, end }
}

function yesterday(): Date {
  const d = new Date()
  d.setDate(d.getDate() - 1)
  return d
}

function formatTime(date: Date): string {
  return new Intl.DateTimeFormat('en-US', { timeZone: IST, hour: 'numeric', minute: '2-digit', hour12: true }).format(date)
}

export interface DailyReportResult {
  recipients: string[]
  reportDate: string
}

// Rep-wise activity for a single calendar day, emailed to every active
// admin — every call, email, meeting, note, and stage move (e.g.
// "New → Pending — Our Side") each rep logged, not just a count. Defaults
// to yesterday so a morning cron run reports on the day that just finished.
export async function sendDailyActivityReportEmail(date: Date = yesterday()): Promise<DailyReportResult> {
  const { start, end } = dayRange(date)
  const reportDate = start.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric', year: 'numeric' })

  const [admins, createdLeads, wonLeads, activities] = await Promise.all([
    prisma.user.findMany({
      where: { role: 'admin', isActive: true },
      select: { email: true },
    }),
    prisma.lead.count({ where: { createdAt: { gte: start, lte: end } } }),
    prisma.lead.count({ where: { wonAt: { gte: start, lte: end } } }),
    prisma.activity.findMany({
      where: { date: { gte: start, lte: end }, authorName: { not: 'System' }, type: { in: ACTOR_ACTIVITY_TYPES } },
      select: { type: true, description: true, authorName: true, date: true, lead: { select: { company: true } } },
      orderBy: { date: 'asc' },
    }),
  ])

  const byRep = new Map<string, typeof activities>()
  for (const a of activities) {
    const list = byRep.get(a.authorName) ?? []
    list.push(a)
    byRep.set(a.authorName, list)
  }
  const reps = Array.from(byRep.entries()).sort((a, b) => b[1].length - a[1].length)

  const lines = [
    `Daily activity report — ${reportDate}`,
    '',
    `Leads created: ${createdLeads}`,
    `Leads won: ${wonLeads}`,
    `Activities logged: ${activities.length}`,
    '',
    'By rep:',
  ]
  if (reps.length === 0) {
    lines.push('  No activity logged.')
  } else {
    for (const [name, repActivities] of reps) {
      lines.push('', `${name} (${repActivities.length}):`)
      for (const a of repActivities) {
        lines.push(
          `  ${formatTime(a.date)} · ${TYPE_LABELS[a.type] ?? a.type} · ${a.lead.company} — ${a.description}`
        )
      }
    }
  }

  const recipients = admins.map((a) => a.email)
  if (recipients.length > 0) {
    await Promise.all(
      recipients.map((to) =>
        sendEmail({ to, subject: `Daily activity report — ${reportDate}`, body: lines.join('\n') })
      )
    )
  }

  return { recipients, reportDate }
}
