import { NextResponse } from 'next/server'
import { getAllOrgIds } from '@/lib/org'
import { parseRangeKey } from '@/lib/reportRange'
import { getReportsData } from '@/lib/reportsData'
import { safeEqual } from '@/lib/http'

export const dynamic = 'force-dynamic'

// Cross-domain, server-to-server endpoint for an external admin dashboard —
// no browser session exists here, so access is controlled by a static API
// key instead of requireApiUser(). No caching: every call re-runs the same
// live queries /reports itself uses, via the shared getReportsData().
//
// This is a platform-level view across every company's org (the caller is
// a static API key, not a per-company login) — explicitly every org that
// exists, not inferred from any one org's visibility.
export async function GET(req: Request) {
  const expectedKey = process.env.REPORTS_API_KEY
  if (!expectedKey) {
    return NextResponse.json({ error: 'Reports API is not configured' }, { status: 503 })
  }

  const authHeader = req.headers.get('authorization') ?? ''
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null
  if (!token || !safeEqual(token, expectedKey)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const url = new URL(req.url)
  const range = parseRangeKey(url.searchParams.get('range') ?? undefined)
  const orgIds = await getAllOrgIds()
  const data = await getReportsData(range, orgIds)

  return NextResponse.json(data)
}
