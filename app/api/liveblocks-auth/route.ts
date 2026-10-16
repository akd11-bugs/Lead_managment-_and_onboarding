import { NextResponse } from 'next/server'
import { Liveblocks } from '@liveblocks/node'
import { requireApiUser } from '@/lib/session'

// One Liveblocks room per org — "whiteboard:<orgId>" — mirrors the flat,
// org-scoped convention every other feature in this app already uses.
// This only ever grants access to the caller's own org's room: there's no
// path here that could let one org's session read another org's presence.
export async function POST(req: Request) {
  const user = await requireApiUser()
  if (user instanceof NextResponse) return user

  const secret = process.env.LIVEBLOCKS_SECRET_KEY
  if (!secret) {
    return NextResponse.json({ error: 'Live presence is not configured' }, { status: 503 })
  }

  const liveblocks = new Liveblocks({ secret })
  const session = liveblocks.prepareSession(user.id, {
    userInfo: { name: user.name },
  })
  session.allow(`whiteboard:${user.orgId}`, session.FULL_ACCESS)

  const { status, body } = await session.authorize()
  return new NextResponse(body, { status })
}
