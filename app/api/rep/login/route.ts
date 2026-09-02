import { NextResponse } from 'next/server'
import { readJsonBody } from '@/lib/http'
import { verifyRepLogin } from '@/lib/repAuth'
import { setRepSessionCookie } from '@/lib/repSession'

export const dynamic = 'force-dynamic'

export async function POST(req: Request) {
  const body = await readJsonBody(req)
  if (body instanceof NextResponse) return body

  const name = String(body?.name ?? '').trim()
  const pin = String(body?.pin ?? '').trim()
  if (!name || !pin) {
    return NextResponse.json({ error: 'Name and PIN are required' }, { status: 400 })
  }

  const result = await verifyRepLogin(name, pin)
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status })
  }

  await setRepSessionCookie(result.userId)
  return NextResponse.json({ ok: true })
}
