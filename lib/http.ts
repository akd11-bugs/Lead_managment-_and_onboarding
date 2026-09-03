import { NextResponse } from 'next/server'
import crypto from 'crypto'

// Callers check `instanceof NextResponse` and return it directly — same
// convention as requireApiUser() in lib/session.ts. Returns `any` (matching
// the untyped body every route already assumed from a raw `req.json()`)
// rather than `unknown`, so existing `body.field` access keeps compiling.
export async function readJsonBody(req: Request): Promise<any | NextResponse> {
  try {
    return await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }
}

// Constant-time comparison for static API keys (the external reports API,
// the cron sync key) — a plain `!==` leaks timing information an attacker
// can use to brute-force the key one byte at a time. Same technique
// lib/repSession.ts already uses for its signed cookie MAC.
export function safeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a)
  const bufB = Buffer.from(b)
  if (bufA.length !== bufB.length) return false
  return crypto.timingSafeEqual(bufA, bufB)
}
