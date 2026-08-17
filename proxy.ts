import NextAuth from 'next-auth'
import { NextResponse } from 'next/server'
import { authConfig } from '@/lib/auth.config'

const { auth } = NextAuth(authConfig)

export default auth((req) => {
  const isLoggedIn = !!req.auth
  const pathname = req.nextUrl.pathname
  const isLoginPage = pathname === '/login'
  // Where an invited person redeems their one-time code and sets their own
  // password — must be reachable while logged out, like /login.
  const isInviteRedeemPage = pathname === '/invite/redeem'
  // Self-serve email+password signup — request a link, then set name/password.
  // Lands as 'pending' just like the invite/Google flows; must be reachable
  // while logged out, like /login.
  const isSignupPage = pathname === '/signup' || pathname === '/signup/complete'
  const isPublicPage = isLoginPage || isInviteRedeemPage || isSignupPage
  const isPendingPage = pathname === '/pending'
  // First-time Google sign-in with no role assigned yet — blocked from
  // everything except this one page until an admin approves them.
  const isPending = req.auth?.user?.role === 'pending'

  if (!isLoggedIn && !isPublicPage) {
    const url = new URL('/login', req.nextUrl.origin)
    url.searchParams.set('from', pathname)
    return NextResponse.redirect(url)
  }
  if (isLoggedIn && isLoginPage) {
    return NextResponse.redirect(new URL('/', req.nextUrl.origin))
  }
  if (isLoggedIn && isPending && !isPendingPage) {
    return NextResponse.redirect(new URL('/pending', req.nextUrl.origin))
  }
  if (isLoggedIn && !isPending && isPendingPage) {
    return NextResponse.redirect(new URL('/', req.nextUrl.origin))
  }
  return NextResponse.next()
})

export const config = {
  // Skip static assets, the NextAuth API routes, and the invite-redemption
  // and signup APIs (must be callable while logged out) — everything else
  // (pages and our own /api/* routes) requires a session.
  matcher: ['/((?!_next/static|_next/image|favicon.ico|api/auth|api/invites/redeem|api/signup).*)'],
}
