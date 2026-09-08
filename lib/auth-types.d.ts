import type { DefaultSession } from 'next-auth'

declare module 'next-auth' {
  interface Session {
    user: {
      id: string
      role: string
      orgId: string
    } & DefaultSession['user']
  }

  interface User {
    role: string
    orgId: string
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    role?: string
    orgId?: string
  }
}
