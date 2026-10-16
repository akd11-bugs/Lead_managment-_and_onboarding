import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export const dynamic = 'force-dynamic'

// Liveness + readiness probe for the host's health check. Deliberately
// unauthenticated so the platform can call it, and deliberately minimal in
// what it reports: an unauthenticated endpoint should never expose version
// numbers, migration state, or connection strings that help someone
// fingerprint the deployment.
//
// Checks the database rather than just returning 200, because the common
// production failure here is the app being up while Neon is unreachable —
// a process-only check would report healthy through an outage.
export async function GET() {
  const startedAt = Date.now()
  try {
    await prisma.$queryRaw`SELECT 1`
    return NextResponse.json(
      { status: 'ok', db: 'up', latencyMs: Date.now() - startedAt },
      { headers: { 'Cache-Control': 'no-store' } },
    )
  } catch {
    // The underlying error is logged for operators, never returned.
    console.error('[health] database check failed')
    return NextResponse.json(
      { status: 'degraded', db: 'down' },
      { status: 503, headers: { 'Cache-Control': 'no-store' } },
    )
  }
}
