import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { parseRangeKey } from '@/lib/reportRange'
import { getReportsData } from '@/lib/reportsData'

export const dynamic = 'force-dynamic'

// Cross-domain, server-to-server endpoint for an external dashboard — no
// browser session exists here, so access is controlled by a per-org API key
// instead of requireApiUser(). No caching: every call re-runs the same live
// queries /reports itself uses, via the shared getReportsData().
//
// Each org generates its own key from Settings (OrgReportsApiKeyCard,
// app/api/settings/reports-api-key/route.ts) — the key IS the org scope, so
// a caller only ever sees the numbers for the one org that generated it.
// There's no platform-wide cross-org key anymore; that's a separate concern
// from "give each customer their own API access."
export async function GET(req: Request) {
  const authHeader = req.headers.get('authorization') ?? ''
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null
  if (!token) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const org = await prisma.organization.findUnique({ where: { reportsApiKey: token }, select: { id: true } })
  if (!org) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const url = new URL(req.url)
  const range = parseRangeKey(url.searchParams.get('range') ?? undefined)
  const data = await getReportsData(range, [org.id])

  return NextResponse.json(data)
}
