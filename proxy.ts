import NextAuth from 'next-auth'
import { NextResponse } from 'next/server'
import { authConfig } from '@/lib/auth.config'

const { auth } = NextAuth(authConfig)

export default auth((req) => {
  const isLoggedIn = !!req.auth
  const isLoginPage = req.nextUrl.pathname === '/login'

  if (!isLoggedIn && !isLoginPage) {
    const url = new URL('/login', req.nextUrl.origin)
    url.searchParams.set('from', req.nextUrl.pathname)
    return NextResponse.redirect(url)
  }
  if (isLoggedIn && isLoginPage) {
    return NextResponse.redirect(new URL('/', req.nextUrl.origin))
  }
  return NextResponse.next()
})

export const config = {
  // Skip static assets and the NextAuth API routes themselves; everything
  // else (pages + our own /api/* routes) requires a session.
  matcher: ['/((?!_next/static|_next/image|favicon.ico|api/auth).*)'],
}
