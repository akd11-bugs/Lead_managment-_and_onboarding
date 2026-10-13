import { NextResponse, type NextRequest } from 'next/server'
import { neonAuth } from '@/lib/auth'

// Reads/validates the session cookie straight from the request — unlike
// neonAuth.getSession() (ambient next/headers-based), which only works in
// Server Components/Route Handlers, not here. Redirects to /login when
// there's no valid session.
const protect = neonAuth.middleware({ loginUrl: '/login' })

export default async function proxy(req: NextRequest) {
  const pathname = req.nextUrl.pathname

  // Where an invited person redeems their one-time code and sets their own
  // password — must be reachable while logged out, like /login.
  const isInviteRedeemPage = pathname === '/invite/redeem'
  // Self-serve email+password signup — request a link, then set name/password.
  // Lands as 'pending' just like the invite/Google flows; must be reachable
  // while logged out, like /login.
  const isSignupPage = pathname === '/signup' || pathname === '/signup/complete'
  // The lightweight rep-facing form — its own PIN-based auth lives entirely
  // inside app/api/rep/* route handlers (the rep_session cookie), never here.
  const isRepPage = pathname === '/rep'
  const isPublicPage = pathname === '/login' || isInviteRedeemPage || isSignupPage || isRepPage

  // Defense-in-depth beyond the session cookie's own sameSite=lax setting
  // (which already blocks the cookie from riding along on a genuine
  // cross-site request): reject a state-changing API call whose Origin
  // header doesn't match this host. A same-origin fetch always sends
  // Origin on POST/PATCH/PUT/DELETE, so this never blocks legitimate
  // in-app requests — only ones missing Origin entirely (rare, and left
  // alone rather than risk breaking some legitimate caller) pass through.
  //
  // req.nextUrl.host reflects the raw Host header, which on Render (and
  // most non-Vercel hosts) is an internal address behind the reverse
  // proxy, not the public domain the browser's Origin actually sends.
  // Compare against x-forwarded-host (what the proxy says the public host
  // really is) first, falling back to nextUrl.host for direct/local
  // requests where no proxy is in front of it.
  const isStateChangingApiCall =
    pathname.startsWith('/api/') && !['GET', 'HEAD', 'OPTIONS'].includes(req.method)
  if (isStateChangingApiCall) {
    const origin = req.headers.get('origin')
    const trustedHost = req.headers.get('x-forwarded-host') ?? req.nextUrl.host
    if (origin && new URL(origin).host !== trustedHost) {
      return NextResponse.json({ error: 'Cross-origin request blocked' }, { status: 403 })
    }
  }

  if (isPublicPage) return NextResponse.next()

  // Pending-role gating and "redirect away from /login when already
  // authenticated" used to live here too. They moved to lib/session.ts
  // (requireUser()) and app/login/page.tsx respectively — role/orgId aren't
  // part of Neon Auth's own session, they're our own Prisma `User` fields,
  // and Edge middleware can't reach Prisma.
  return protect(req)
}

export const config = {
  // Skip static assets (both /_next's own and anything served straight out
  // of /public, e.g. the logo — matched by file extension since /login,
  // /signup, and /rep must be able to load it while logged out), the Neon
  // Auth API routes, the invite-redemption and signup APIs (must be
  // callable while logged out), the external reports API + the
  // leads-sheet sync cron route (both authenticate callers with their own
  // API key, not a browser session), and the rep-form API (its own
  // rep_session cookie) — everything else (pages and our own /api/*
  // routes) requires a Neon Auth session.
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|webp|gif|ico)$|api/auth|api/invites/redeem|api/signup|api/external|api/cron|api/rep).*)',
  ],
}
