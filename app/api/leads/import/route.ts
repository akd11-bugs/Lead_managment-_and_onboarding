import { NextResponse } from 'next/server'
import { requireApiUser } from '@/lib/session'
import { readJsonBody } from '@/lib/http'
import { importLeadRows } from '@/lib/leadImport'

export const dynamic = 'force-dynamic'

export async function POST(req: Request) {
  const user = await requireApiUser()
  if (user instanceof NextResponse) return user
  const body = await readJsonBody(req)
  if (body instanceof NextResponse) return body
  const rows: unknown[] = Array.isArray(body?.rows) ? body.rows : []

  if (rows.length === 0) {
    return NextResponse.json({ error: 'rows must be a non-empty array' }, { status: 400 })
  }
  if (rows.length > 2000) {
    return NextResponse.json({ error: 'Max 2000 rows per import' }, { status: 400 })
  }

  const result = await importLeadRows(rows, { id: user.id, name: user.name })
  return NextResponse.json(result)
}
