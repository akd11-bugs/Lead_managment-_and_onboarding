import { NextResponse } from 'next/server'

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
