import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requireApiUser, isAdmin } from '@/lib/session'
import { readJsonBody } from '@/lib/http'
import { encrypt } from '@/lib/crypto'
import { fetchRemoteTools, ConnectionError } from '@/lib/mcp/connections'

export const dynamic = 'force-dynamic'

// Never returns tokenEnc — this list is rendered straight into the
// Settings UI, and there is never a legitimate reason for a decrypted or
// even still-encrypted credential to reach the browser once saved.
const SAFE_SELECT = {
  id: true,
  name: true,
  serverUrl: true,
  enabled: true,
  lastToolCount: true,
  lastCheckedAt: true,
  lastError: true,
  configuredAt: true,
} as const

export async function GET() {
  const user = await requireApiUser()
  if (user instanceof NextResponse) return user
  if (!isAdmin(user)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const connections = await prisma.orgMcpConnection.findMany({
    where: { orgId: user.orgId },
    orderBy: { configuredAt: 'asc' },
    select: SAFE_SELECT,
  })
  return NextResponse.json({ connections })
}

// Verifies the server is actually reachable (a live tools/list handshake)
// before saving anything — same "fail fast with a clear message" pattern
// as the Google Sheet connector, and for the same reason: the most common
// failure is a typo'd URL or a token that doesn't work, and silently
// saving a broken connection just means a rep's tool call fails later with
// no visible cause.
export async function POST(req: Request) {
  const user = await requireApiUser()
  if (user instanceof NextResponse) return user
  if (!isAdmin(user)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await readJsonBody(req)
  if (body instanceof NextResponse) return body

  const name = String(body.name ?? '').trim()
  const serverUrl = String(body.serverUrl ?? '').trim()
  const token = typeof body.token === 'string' ? body.token.trim() : ''

  if (!name) return NextResponse.json({ error: 'name is required' }, { status: 400 })
  if (!serverUrl) return NextResponse.json({ error: 'serverUrl is required' }, { status: 400 })
  try {
    const parsed = new URL(serverUrl)
    if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') throw new Error()
  } catch {
    return NextResponse.json({ error: 'serverUrl must be a valid http(s) URL' }, { status: 400 })
  }

  let toolCount: number
  try {
    const tools = await fetchRemoteTools(serverUrl, token || null)
    toolCount = tools.length
  } catch (err) {
    const message = err instanceof ConnectionError ? err.message : 'Could not connect to that server'
    return NextResponse.json({ error: `Couldn't connect — ${message}` }, { status: 400 })
  }

  const connection = await prisma.orgMcpConnection.create({
    data: {
      orgId: user.orgId,
      name,
      serverUrl,
      tokenEnc: token ? encrypt(token) : null,
      configuredByUserId: user.id,
      lastToolCount: toolCount,
      lastCheckedAt: new Date(),
    },
    select: SAFE_SELECT,
  })
  return NextResponse.json({ connection })
}
