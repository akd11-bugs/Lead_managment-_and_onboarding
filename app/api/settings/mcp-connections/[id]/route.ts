import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requireApiUser, isAdmin } from '@/lib/session'
import { readJsonBody } from '@/lib/http'
import { checkConnection } from '@/lib/mcp/connections'

export const dynamic = 'force-dynamic'

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

// Toggle enabled, rename, or re-run the handshake (?action=check) — never
// edits serverUrl/token here; changing those is "disconnect, reconnect"
// (DELETE then POST) so the create-time handshake-before-save guarantee
// always holds for whatever credential is currently stored.
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireApiUser()
  if (user instanceof NextResponse) return user
  if (!isAdmin(user)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const { id } = await params

  const existing = await prisma.orgMcpConnection.findFirst({ where: { id, orgId: user.orgId } })
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const url = new URL(req.url)
  if (url.searchParams.get('action') === 'check') {
    const result = await checkConnection(id)
    const connection = await prisma.orgMcpConnection.findUnique({ where: { id }, select: SAFE_SELECT })
    return NextResponse.json({ connection, checked: result })
  }

  const body = await readJsonBody(req)
  if (body instanceof NextResponse) return body

  const connection = await prisma.orgMcpConnection.update({
    where: { id },
    data: {
      ...(body.name !== undefined && { name: String(body.name).trim() }),
      ...(body.enabled !== undefined && { enabled: Boolean(body.enabled) }),
    },
    select: SAFE_SELECT,
  })
  return NextResponse.json({ connection })
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireApiUser()
  if (user instanceof NextResponse) return user
  if (!isAdmin(user)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const { id } = await params

  const existing = await prisma.orgMcpConnection.findFirst({ where: { id, orgId: user.orgId } })
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  await prisma.orgMcpConnection.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
