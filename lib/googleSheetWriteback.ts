import { prisma } from '@/lib/db'
import { appendSheetRow, getSheetRows } from '@/lib/googleSheets'
import { FIELDS, autoMapHeaders } from '@/lib/headerMapping'

// Write-once, on creation only — never re-synced on later edits. A stage
// change, a note added, a re-owned lead: none of it pushes back out. Two
// reasons, both deliberate (not a missing feature): (1) finding "this lead's
// row" again later needs a stable row identifier, which would mean adding a
// hidden id column to every customer's own spreadsheet — real intrusion into
// a sheet the org edits by hand; (2) updating a row an org may have since
// edited by hand risks clobbering their edit with stale Steadfast data,
// which is worse than just not syncing it. A new row, appended once, has
// neither problem.
//
// Only called from the lead-creation paths that are NOT the Sheet-import
// itself (lib/leadImport.ts, used by both the cron sync and the CSV import
// dialog) — calling it there would create an infinite read-write-read loop
// between the two sync directions. See each of the four call sites
// (app/api/leads/route.ts, app/api/agent/v1/leads/route.ts,
// lib/publicLeadIntake.ts, lib/mcp/tools.ts) for where this is wired in.
// lib/org.ts's seedSampleLeads is also deliberately excluded — demo data
// has no business appearing in a real customer's spreadsheet.
export interface WritebackLead {
  company: string
  contactName: string | null
  email: string
  phone: string | null
  website: string | null
  industry: string | null
  businessType: string | null
  source: string
  type: string
  estimatedVolume: number
  notes: string
}

// Best-effort: a missing connector, a disabled one, or any Sheets API error
// (most commonly a 403 — the org re-shared with Viewer, not Editor) must
// never fail or roll back the lead creation that triggered it. Logged
// server-side only.
export async function writeBackLeadToSheet(orgId: string, lead: WritebackLead): Promise<void> {
  try {
    const connector = await prisma.orgSheetConnector.findUnique({ where: { orgId } })
    if (!connector || !connector.enabled) return

    const allRows = await getSheetRows(connector.sheetId, connector.sheetRange)
    const headerRow = allRows[0] ?? []
    if (headerRow.length === 0) return

    const row = buildRow(headerRow, lead)
    // appendSheetRow's API finds the next row itself within the named
    // sheet/tab — strip any "!A:Z"-style cell range down to just the tab
    // name, since a configured range like "Sheet1!A:K" names the whole sheet
    // only in its first segment.
    const sheetName = connector.sheetRange.split('!')[0]
    await appendSheetRow(connector.sheetId, sheetName, row)
  } catch (err) {
    console.error(`[googleSheetWriteback] failed for org ${orgId}:`, err)
  }
}

// Exported for lib/googleSheetWriteback.test.ts — the pure mapping logic is
// what's actually worth unit-testing here; writeBackLeadToSheet itself is
// mostly network calls and a try/catch, not logic.
//
// Reuses autoMapHeaders (lib/headerMapping.ts) rather than reimplementing
// header matching — that function's two-phase approach (every field's EXACT
// synonym match first, across the whole row, then fuzzy substring matches
// for whatever's left) is what correctly resolves an ambiguous header like
// "Company Name": poc's synonyms include the bare word "name", so a
// single-phase per-field scan (tried here originally, caught by this file's
// own test) wrongly claims that column for poc before company ever gets a
// chance at its own, more specific, exact match.
export function buildRow(headerRow: string[], lead: WritebackLead): string[] {
  const mapping = autoMapHeaders(headerRow)
  const row = new Array(headerRow.length).fill('')

  const values: Partial<Record<(typeof FIELDS)[number], string>> = {
    company: lead.company,
    email: lead.email,
    poc: lead.contactName ?? '',
    phone: lead.phone ?? '',
    website: lead.website ?? '',
    industry: lead.industry ?? '',
    businessType: lead.businessType ?? '',
    source: lead.source,
    type: lead.type,
    estimatedVolume: String(lead.estimatedVolume),
    notes: lead.notes,
  }

  for (const field of FIELDS) {
    const matchedHeader = mapping[field]
    if (matchedHeader === null) continue
    const idx = headerRow.indexOf(matchedHeader)
    if (idx !== -1) row[idx] = values[field] ?? ''
  }

  return row
}
