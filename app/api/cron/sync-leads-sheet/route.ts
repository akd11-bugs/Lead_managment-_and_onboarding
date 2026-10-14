import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getSheetRows } from '@/lib/googleSheets'
import { autoMapHeaders, normalizeHeader, FIELDS } from '@/lib/headerMapping'
import { importLeadRows, type ImportOwner } from '@/lib/leadImport'
import { safeEqual } from '@/lib/http'
import { recordJobRun } from '@/lib/jobRun'

export const dynamic = 'force-dynamic'

const OWNER_SYNONYMS = ['owner', 'assigned to', 'sales rep', 'owner email', 'assignee'].map(normalizeHeader)

interface SheetSource {
  label: string // "org:<id>" — set once at construction, not re-derived
  cursorKey: string
  spreadsheetId: string
  range: string
  orgId: string
  defaultOwner: ImportOwner
}

interface SyncResult {
  source: string
  created: number
  skipped: { row: number; reason: string }[]
  error?: string
}

async function syncOneSheet(source: SheetSource): Promise<SyncResult> {
  const startedAt = new Date()

  try {
    const allRows = await getSheetRows(source.spreadsheetId, source.range)
    if (allRows.length < 2) {
      await recordJobRun({ orgId: source.orgId, jobKey: 'sync-leads-sheet', status: 'success', startedAt })
      return { source: source.label, created: 0, skipped: [] }
    }
    const [headerRow, ...dataRows] = allRows
    const mapping = autoMapHeaders(headerRow)
    const ownerColumnIndex = headerRow.findIndex((h) => {
      const normalized = normalizeHeader(h)
      return OWNER_SYNONYMS.some((s) => normalized.includes(s))
    })

    const cursor = await prisma.syncCursor.findUnique({ where: { key: source.cursorKey } })
    const alreadyProcessed = cursor ? Number(cursor.value) || 0 : 0
    const newRows = dataRows.slice(alreadyProcessed)

    if (newRows.length === 0) {
      await recordJobRun({ orgId: source.orgId, jobKey: 'sync-leads-sheet', status: 'success', startedAt })
      return { source: source.label, created: 0, skipped: [] }
    }

    // Resolve each row's owner (by name/email in the Owner column, falling
    // back to the configured default) and bucket rows by owner so
    // importLeadRows — which takes one owner per call — can still assign
    // each row correctly without changing its signature.
    const ownerCache = new Map<string, ImportOwner>()
    async function resolveOwner(rawValue: string): Promise<ImportOwner> {
      const value = rawValue.trim()
      if (!value) return source.defaultOwner
      const cached = ownerCache.get(value.toLowerCase())
      if (cached) return cached
      const user = await prisma.user.findFirst({
        where: {
          orgId: source.orgId,
          OR: [{ email: { equals: value, mode: 'insensitive' } }, { name: { equals: value, mode: 'insensitive' } }],
        },
        select: { id: true, name: true },
      })
      const resolved = user ?? source.defaultOwner
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
      const result = await importLeadRows(rows, owner, source.orgId)
      created += result.created
      for (const s of result.skipped) {
        skipped.push({ row: rowNumbers[s.row - 1] ?? s.row, reason: s.reason })
      }
    }

    await prisma.syncCursor.upsert({
      where: { key: source.cursorKey },
      create: { key: source.cursorKey, value: String(dataRows.length) },
      update: { value: String(dataRows.length) },
    })
    await prisma.orgSheetConnector.update({ where: { orgId: source.orgId }, data: { lastSyncedAt: new Date() } })

    await recordJobRun({ orgId: source.orgId, jobKey: 'sync-leads-sheet', status: 'success', startedAt })
    skipped.sort((a, b) => a.row - b.row)
    return { source: source.label, created, skipped }
  } catch (err) {
    await recordJobRun({ orgId: source.orgId, jobKey: 'sync-leads-sheet', status: 'failure', startedAt, error: String(err) })
    console.error(`sync-leads-sheet failed (${source.label})`, err)
    return { source: source.label, created: 0, skipped: [], error: String(err) }
  }
}

// Every org that's configured its own connector from Settings (no env vars,
// no backend involvement) — see components/settings/OrgSheetConnectorCard.tsx.
// One batched owner lookup instead of one query per connector.
async function buildOrgSources(): Promise<SheetSource[]> {
  const connectors = await prisma.orgSheetConnector.findMany({ where: { enabled: true } })
  if (connectors.length === 0) return []

  const owners = await prisma.user.findMany({
    where: { id: { in: connectors.map((c) => c.defaultOwnerUserId) } },
    select: { id: true, name: true },
  })
  const ownerById = new Map(owners.map((o) => [o.id, o]))

  return connectors.flatMap((c): SheetSource[] => {
    const defaultOwner = ownerById.get(c.defaultOwnerUserId)
    if (!defaultOwner) return [] // configured owner was since deleted — skip rather than fail the whole run

    return [{
      label: `org:${c.orgId}`,
      cursorKey: `leads-sheet:org:${c.orgId}`,
      spreadsheetId: c.sheetId,
      range: c.sheetRange,
      orgId: c.orgId,
      defaultOwner,
    }]
  })
}

// Cross-domain, unattended caller — same static-Bearer-key pattern as
// app/api/external/reports/route.ts, no browser session involved. One
// external trigger fans out internally across every org's own connector —
// each org configures its own sheet from Settings (OrgSheetConnectorCard),
// no env vars or backend involvement needed per org.
export async function POST(req: Request) {
  const expectedKey = process.env.CRON_SYNC_API_KEY
  if (!expectedKey) {
    return NextResponse.json({ error: 'Sheet sync is not configured' }, { status: 503 })
  }
  const authHeader = req.headers.get('authorization') ?? ''
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null
  if (!token || !safeEqual(token, expectedKey)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const sources = await buildOrgSources()

  if (sources.length === 0) {
    return NextResponse.json({ results: [] })
  }

  // Each source is an independent org/sheet/cursor — sync them concurrently
  // rather than one at a time. syncOneSheet never throws (it reports its
  // own failures in the result), so a plain Promise.all is safe here.
  const results = await Promise.all(sources.map(syncOneSheet))

  return NextResponse.json({ results })
}
