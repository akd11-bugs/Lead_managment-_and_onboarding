import { NextResponse } from 'next/server'
import { getAllOrgIds } from '@/lib/org'
import { safeEqual } from '@/lib/http'
import { sendDailyActivityReportEmail } from '@/lib/dailyReportEmail'
import { recordJobRun } from '@/lib/jobRun'

export const dynamic = 'force-dynamic'

// Cross-domain, unattended caller — same static-Bearer-key pattern as
// app/api/cron/sync-leads-sheet/route.ts, meant to be hit once a day by an
// external scheduler (see .github/workflows/daily-activity-report.yml).
export async function POST(req: Request) {
  const expectedKey = process.env.DAILY_REPORT_API_KEY
  if (!expectedKey) {
    return NextResponse.json({ error: 'Daily report is not configured' }, { status: 503 })
  }
  const authHeader = req.headers.get('authorization') ?? ''
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null
  if (!token || !safeEqual(token, expectedKey)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Orgs are flat and isolated — each one gets its own report, sent only to
  // its own admins, not a blended cross-company one.
  const orgIds = await getAllOrgIds()
  const results = await Promise.all(
    orgIds.map(async (orgId) => {
      const startedAt = new Date()
      try {
        const result = await sendDailyActivityReportEmail(orgId)
        await recordJobRun({ orgId, jobKey: 'daily-activity-report', status: 'success', startedAt })
        return { orgId, ...result }
      } catch (err) {
        await recordJobRun({ orgId, jobKey: 'daily-activity-report', status: 'failure', startedAt, error: String(err) })
        console.error(`daily-activity-report failed (org ${orgId})`, err)
        return { orgId, error: String(err) }
      }
    }),
  )

  return NextResponse.json({ results })
}
