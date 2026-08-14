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
  const isPublicPage = isLoginPage || isInviteRedeemPage

  if (!isLoggedIn && !isPublicPage) {
    const url = new URL('/login', req.nextUrl.origin)
    url.searchParams.set('from', pathname)
    return NextResponse.redirect(url)
  }
  if (isLoggedIn && isLoginPage) {
    return NextResponse.redirect(new URL('/', req.nextUrl.origin))
  }
  return NextResponse.next()
})

export const config = {
  // Skip static assets, the NextAuth API routes, and the invite-redemption
  // API (must be callable while logged out) — everything else (pages and
  // our own /api/* routes) requires a session.
  matcher: ['/((?!_next/static|_next/image|favicon.ico|api/auth|api/invites/redeem).*)'],
}
