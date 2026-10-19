import { NextResponse } from 'next/server'
import { requireApiUser } from '@/lib/session'
import { seedFunnel } from '../route'

export const dynamic = 'force-dynamic'

// "Insert pipeline funnel" toolbar action — adds a funnel box per pipeline
// stage to the board on demand. The whiteboard no longer gets one by
// default (see elements/route.ts GET), so this is the only way a funnel
// ends up there now.
export async function POST() {
  const user = await requireApiUser()
  if (user instanceof NextResponse) return user
  await seedFunnel(user.orgId)
  return NextResponse.json({ ok: true })
}
