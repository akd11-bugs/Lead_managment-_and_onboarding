import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { parseRangeKey } from '@/lib/reportRange'
import { getReportsData } from '@/lib/reportsData'
import { checkRateLimit, getClientIp } from '@/lib/rateLimit'

export const dynamic = 'force-dynamic'

// Same two-tier limit as lib/agentAuth.ts's requireAgentOrg, for the same
// "the key IS the org scope" pattern: a tight per-IP budget so an invalid-key
// flood can't run a query per attempt, and a looser per-org budget so a
// single valid (possibly leaked) key can't pull this org's reporting data —
// or re-run getReportsData's 5 unpaginated queries — at unlimited frequency.
const UNAUTH_MAX = 20
const UNAUTH_WINDOW_MS = 5 * 60 * 1000
const AUTH_MAX = 120
const AUTH_WINDOW_MS = 60 * 1000

function tooMany(retryAfterSeconds: number) {
  return NextResponse.json(
    { error: 'Too many requests' },
    { status: 429, headers: { 'Retry-After': String(retryAfterSeconds) } },
  )
}

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
  const ip = getClientIp(req)

  const authHeader = req.headers.get('authorization') ?? ''
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null
  if (!token) {
    const unauth = checkRateLimit(`reports-unauth:${ip}`, UNAUTH_MAX, UNAUTH_WINDOW_MS)
    if (!unauth.allowed) return tooMany(unauth.retryAfterSeconds)
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Check the per-IP budget before touching the database, so an invalid-key
  // flood can't make us run a query per attempt.
  const unauth = checkRateLimit(`reports-unauth:${ip}`, UNAUTH_MAX, UNAUTH_WINDOW_MS)
  if (!unauth.allowed) return tooMany(unauth.retryAfterSeconds)

  const org = await prisma.organization.findUnique({ where: { reportsApiKey: token }, select: { id: true } })
  if (!org) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const authed = checkRateLimit(`reports-org:${org.id}`, AUTH_MAX, AUTH_WINDOW_MS)
  if (!authed.allowed) return tooMany(authed.retryAfterSeconds)

  const url = new URL(req.url)
  const range = parseRangeKey(url.searchParams.get('range') ?? undefined)
  const data = await getReportsData(range, [org.id])

  return NextResponse.json(data)
}
