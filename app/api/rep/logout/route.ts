import { NextResponse } from 'next/server'
import { clearRepSessionCookie } from '@/lib/repSession'

export const dynamic = 'force-dynamic'

export async function POST() {
  await clearRepSessionCookie()
  return NextResponse.json({ ok: true })
}
