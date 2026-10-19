// Standalone constant, deliberately with no other imports: proxy.ts (Edge
// middleware) and lib/session.ts (Node runtime, imports Prisma) both need
// this cookie name, and importing it from lib/session.ts directly would
// pull Prisma into the Edge bundle.
export const DEV_BYPASS_COOKIE = 'dev_bypass_auth'
