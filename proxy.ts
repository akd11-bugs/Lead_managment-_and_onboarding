import { NextResponse, type NextRequest } from 'next/server'
import { neonAuth } from '@/lib/auth'
import { DEV_BYPASS_COOKIE } from '@/lib/devBypass'

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
  // Covers /rep and the per-org /rep/<slug> login pages. Was an exact match
  // before the slug route existed, which would have redirected /rep/acme to
  // /login and broken field sign-in entirely.
  const isRepPage = pathname === '/rep' || pathname.startsWith('/rep/')
  // The public lead-intake form (/intake/<slug>) — no login, resolves its
  // org from the slug the same way the rep portal does. Its own write route
  // (app/api/intake/[slug]/route.ts) is excluded from the matcher below,
  // same treatment as api/rep.
  const isIntakePage = pathname === '/intake' || pathname.startsWith('/intake/')
  // "/" itself must be reachable while logged out too — app/page.tsx branches
  // on session there (marketing page vs dashboard), so the middleware can't
  // blanket-redirect it to /login the way every other route still should.
  //
  // Exception: a request carrying Neon Auth's OAuth verifier param (the
  // callbackURL every sign-in flow uses is '/') must NOT be treated as
  // public — neonAuth.middleware() is what actually exchanges that verifier
  // for a real session and strips the param via its "redirect_oauth" case.
  // Short-circuiting "/" before that middleware runs meant the exchange
  // never happened: the verifier param and the session_challenge cookie
  // were left dangling, no session cookie was ever set, and every OAuth
  // sign-in silently landed back on the logged-out marketing page.
  const isRootPage = pathname === '/' && !req.nextUrl.searchParams.has('neon_auth_session_verifier')
  // Local dev-only auth bypass (lib/session.ts, app/api/dev-login) — sets a
  // cookie Neon Auth's own middleware knows nothing about, so it must be
  // reachable while logged out too. The route itself 404s outside
  // development; this check only decides whether middleware lets the
  // request through to it.
  const isDevLoginRoute = pathname === '/api/dev-login' && process.env.NODE_ENV !== 'production'
  // Once the cookie is set (via /api/dev-login), every route needs to skip
  // Neon Auth's own middleware too, not just the root page — otherwise only
  // "/" would honor the bypass and every other page would still 307 to
  // /login before lib/session.ts's resolveDevBypass() ever got a chance to
  // run. Same NODE_ENV guard as the cookie's own set-path.
  const hasDevBypassCookie =
    process.env.NODE_ENV !== 'production' && req.cookies.get(DEV_BYPASS_COOKIE)?.value === '1'
  const isPublicPage =
    pathname === '/login' ||
    isInviteRedeemPage ||
    isSignupPage ||
    isRepPage ||
    isIntakePage ||
    isRootPage ||
    isDevLoginRoute ||
    hasDevBypassCookie

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
  // leads-sheet sync cron route + the agent-facing write API (all three
  // authenticate callers with their own per-org API key, not a browser
  // session), the rep-form API (its own rep_session cookie), the public
  // lead-intake API (no auth at all — it's meant for anonymous submitters,
  // protected by its own rate limiting instead), and the health probe (the
  // hosting platform calls it with no session and must get a real status,
  // not a redirect to /login) — everything else (pages and our own /api/*
  // routes) requires a Neon Auth session.
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|webp|gif|ico)$|api/auth|api/invites/redeem|api/signup|api/external|api/cron|api/agent|api/rep|api/intake|api/health).*)',
  ],
}
