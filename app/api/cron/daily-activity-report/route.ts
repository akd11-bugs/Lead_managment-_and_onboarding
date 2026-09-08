import { NextResponse } from 'next/server'
import { safeEqual } from '@/lib/http'
import { sendDailyActivityReportEmail } from '@/lib/dailyReportEmail'
import { getDefaultOrgId } from '@/lib/org'
import { resolveVisibleOrgIds } from '@/lib/session'
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

  const startedAt = new Date()
  try {
    // No user session on this cron route — reports on the default org's
    // full tree (self + descendants), same rollup an admin gets.
    const defaultOrgId = await getDefaultOrgId()
    const orgIds = await resolveVisibleOrgIds(defaultOrgId, 'admin')
    const result = await sendDailyActivityReportEmail(orgIds)
    await recordJobRun({ orgId: defaultOrgId, jobKey: 'daily-activity-report', status: 'success', startedAt })
    return NextResponse.json(result)
  } catch (err) {
    await recordJobRun({ jobKey: 'daily-activity-report', status: 'failure', startedAt, error: String(err) })
    console.error('daily-activity-report failed', err)
    return NextResponse.json({ error: 'Failed to send the daily activity report' }, { status: 500 })
  }
}
