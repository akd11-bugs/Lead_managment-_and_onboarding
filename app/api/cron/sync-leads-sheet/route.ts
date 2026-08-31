import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getSheetRows } from '@/lib/googleSheets'
import { autoMapHeaders, normalizeHeader, FIELDS } from '@/lib/headerMapping'
import { importLeadRows, type ImportOwner } from '@/lib/leadImport'

export const dynamic = 'force-dynamic'

const CURSOR_KEY_PREFIX = 'leads-sheet:'
const OWNER_SYNONYMS = ['owner', 'assigned to', 'sales rep', 'owner email', 'assignee'].map(normalizeHeader)

// Cross-domain, unattended caller — same static-Bearer-key pattern as
// app/api/external/reports/route.ts, no browser session involved.
export async function POST(req: Request) {
  const expectedKey = process.env.CRON_SYNC_API_KEY
  // TEMPORARY — diagnosing a 503 that persists despite the var being set on
  // Render. Logs presence/length only, never the value. Remove after use.
  console.log(
    '[sync-leads-sheet debug]',
    JSON.stringify({
      hasKey: !!expectedKey,
      keyLength: expectedKey?.length ?? 0,
      nodeEnv: process.env.NODE_ENV,
      hasSheetId: !!process.env.LEADS_SHEET_ID,
      hasDefaultOwner: !!process.env.SHEET_IMPORT_DEFAULT_OWNER_EMAIL,
    }),
  )
  if (!expectedKey) {
    return NextResponse.json({ error: 'Sheet sync is not configured' }, { status: 503 })
  }
  const authHeader = req.headers.get('authorization') ?? ''
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null
  if (token !== expectedKey) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const spreadsheetId = process.env.LEADS_SHEET_ID
  const range = process.env.LEADS_SHEET_RANGE || 'Sheet1'
  const defaultOwnerEmail = process.env.SHEET_IMPORT_DEFAULT_OWNER_EMAIL
  if (!spreadsheetId || !defaultOwnerEmail) {
    return NextResponse.json(
      { error: 'LEADS_SHEET_ID and SHEET_IMPORT_DEFAULT_OWNER_EMAIL must both be set' },
      { status: 503 }
    )
  }
  const defaultOwnerRow = await prisma.user.findUnique({
    where: { email: defaultOwnerEmail.toLowerCase() },
    select: { id: true, name: true },
  })
  if (!defaultOwnerRow) {
    return NextResponse.json(
      { error: `SHEET_IMPORT_DEFAULT_OWNER_EMAIL (${defaultOwnerEmail}) does not match a real user` },
      { status: 503 }
    )
  }
  const defaultOwner: ImportOwner = defaultOwnerRow

  const allRows = await getSheetRows(spreadsheetId, range)
  if (allRows.length < 2) {
    return NextResponse.json({ created: 0, skipped: [] })
  }
  const [headerRow, ...dataRows] = allRows
  const mapping = autoMapHeaders(headerRow)
  // Fuzzy (substring) match, same as the field mapper — "Lead Owner Name"
  // should match "owner" just as readily as an exact "Owner" header would.
  const ownerColumnIndex = headerRow.findIndex((h) => {
    const normalized = normalizeHeader(h)
    return OWNER_SYNONYMS.some((s) => normalized.includes(s))
  })

  const cursorKey = `${CURSOR_KEY_PREFIX}${spreadsheetId}:${range}`
  const cursor = await prisma.syncCursor.findUnique({ where: { key: cursorKey } })
  const alreadyProcessed = cursor ? Number(cursor.value) || 0 : 0
  const newRows = dataRows.slice(alreadyProcessed)

  if (newRows.length === 0) {
    return NextResponse.json({ created: 0, skipped: [] })
  }

  // Resolve each row's owner (by name/email in the Owner column, falling
  // back to the configured default) and bucket rows by owner so
  // importLeadRows — which takes one owner per call — can still assign each
  // row correctly without changing its signature.
  const ownerCache = new Map<string, ImportOwner>()
  async function resolveOwner(rawValue: string): Promise<ImportOwner> {
    const value = rawValue.trim()
    if (!value) return defaultOwner
    const cached = ownerCache.get(value.toLowerCase())
    if (cached) return cached
    const user = await prisma.user.findFirst({
      where: { OR: [{ email: { equals: value, mode: 'insensitive' } }, { name: { equals: value, mode: 'insensitive' } }] },
      select: { id: true, name: true },
    })
    const resolved = user ?? defaultOwner
    ownerCache.set(value.toLowerCase(), resolved)
    return resolved
  }

  const buckets = new Map<string, { owner: ImportOwner; rows: Record<string, unknown>[]; rowNumbers: number[] }>()
  for (let i = 0; i < newRows.length; i++) {
    const dataRow = newRows[i]
    const ownerValue = ownerColumnIndex !== -1 ? (dataRow[ownerColumnIndex] ?? '') : ''
    const owner = await resolveOwner(ownerValue)
    const mappedRow: Record<string, unknown> = {}
    for (const field of FIELDS) {
      const header = mapping[field]
      const colIndex = header ? headerRow.indexOf(header) : -1
      mappedRow[field] = colIndex !== -1 ? (dataRow[colIndex] ?? '') : ''
    }
    const bucket = buckets.get(owner.id) ?? { owner, rows: [], rowNumbers: [] }
    bucket.rows.push(mappedRow)
    bucket.rowNumbers.push(alreadyProcessed + i + 1) // +1: row 1 is the header, so data row 0 is sheet row 2
    buckets.set(owner.id, bucket)
  }

  let created = 0
  const skipped: { row: number; reason: string }[] = []
  for (const { owner, rows, rowNumbers } of buckets.values()) {
    const result = await importLeadRows(rows, owner)
    created += result.created
    // importLeadRows numbers rows 1-based within its own input array — remap
    // back to the row's real position in the sheet using rowNumbers.
    for (const s of result.skipped) {
      skipped.push({ row: rowNumbers[s.row - 1] ?? s.row, reason: s.reason })
    }
  }

  await prisma.syncCursor.upsert({
    where: { key: cursorKey },
    create: { key: cursorKey, value: String(dataRows.length) },
    update: { value: String(dataRows.length) },
  })

  skipped.sort((a, b) => a.row - b.row)
  return NextResponse.json({ created, skipped })
}
