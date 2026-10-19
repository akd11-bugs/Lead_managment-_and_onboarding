import { NextResponse } from 'next/server'
import { DEV_BYPASS_COOKIE } from '@/lib/devBypass'

export const dynamic = 'force-dynamic'

// Local-only: sets/clears the dev auth-bypass cookie (lib/session.ts), so
// "/" with no cookie still shows the real marketing page and a developer
// can opt into skipping Google sign-in with GET /api/dev-login, or back out
// with GET /api/dev-login?off=1. Never does anything in production — same
// NODE_ENV guard as resolveDevBypass, redundant on purpose.
//
// Sets the cookie directly on the redirect response, not via next/headers'
// cookies() — that jar only flows to the client when the SAME response
// object it mutated is the one returned, and NextResponse.redirect() here
// creates a fresh response instead.
export async function GET(req: Request) {
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Not available' }, { status: 404 })
  }
  const off = new URL(req.url).searchParams.get('off') === '1'
  const res = NextResponse.redirect(new URL('/', req.url))
  if (off) {
    res.cookies.delete(DEV_BYPASS_COOKIE)
  } else {
    res.cookies.set(DEV_BYPASS_COOKIE, '1', { httpOnly: true, sameSite: 'lax', path: '/' })
  }
  return res
}
