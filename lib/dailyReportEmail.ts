import { prisma } from '@/lib/db'
import { sendEmail } from '@/lib/email'

const ACTOR_ACTIVITY_TYPES = ['call', 'email', 'meeting', 'note', 'stage_change']

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

export interface DailyReportResult {
  recipients: string[]
  reportDate: string
}

// Rep-wise activity for a single calendar day, emailed to every active
// admin — same numbers as the "Daily activity — by rep" table on /reports,
// scoped to one day instead of a trailing 14-day window. Defaults to
// yesterday so a morning cron run reports on the day that just finished.
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
      select: { authorName: true },
    }),
  ])

  const repCounts = new Map<string, number>()
  for (const a of activities) {
    repCounts.set(a.authorName, (repCounts.get(a.authorName) ?? 0) + 1)
  }
  const reps = Array.from(repCounts.entries()).sort((a, b) => b[1] - a[1])

  const lines = [
    `Daily activity report — ${reportDate}`,
    '',
    `Leads created: ${createdLeads}`,
    `Leads won: ${wonLeads}`,
    `Activities logged: ${activities.length}`,
    '',
    'By rep:',
    ...(reps.length > 0 ? reps.map(([name, count]) => `  ${name}: ${count}`) : ['  No activity logged.']),
  ]

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
