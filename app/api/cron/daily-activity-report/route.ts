import { NextResponse } from 'next/server'
import { safeEqual } from '@/lib/http'
import { sendDailyActivityReportEmail } from '@/lib/dailyReportEmail'

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

  const result = await sendDailyActivityReportEmail()
  return NextResponse.json(result)
}
