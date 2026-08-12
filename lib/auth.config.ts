import type { NextAuthConfig } from 'next-auth'

// Edge-safe half of the auth config — no Prisma, no bcrypt. Used directly by
// middleware.ts (Edge runtime) and merged with the Credentials provider in
// lib/auth.ts for everything else (API routes, server components).
export const authConfig: NextAuthConfig = {
  pages: { signIn: '/login' },
  session: { strategy: 'jwt' },
  // Render (and most non-Vercel hosts) sit behind a reverse proxy, so the
  // Host header isn't the one NextAuth would otherwise verify against.
  trustHost: true,
  providers: [],
  callbacks: {
    jwt({ token, user }) {
      if (user) token.role = (user as { role: string }).role
      return token
    },
    session({ session, token }) {
      if (session.user) {
        session.user.id = token.sub as string
        session.user.role = token.role as string
      }
      return session
    },
  },
}
