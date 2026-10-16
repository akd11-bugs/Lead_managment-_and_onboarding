// Restores a JSON backup (as written before the 2026-10-16 wipe) into
// whatever DATABASE_URL points at. Insert order respects FK dependencies.
// Columns added to the schema since the backup are absent and take defaults.
//
// Intended for the local test database. Pointing this at Neon would
// re-populate production, so pass the URL deliberately.
import { PrismaClient } from '@prisma/client'
import { readFileSync } from 'node:fs'

const path = process.argv[2]
if (!path) {
  console.error('usage: node scripts/restore-backup.mjs <backup.json>')
  process.exit(1)
}

// This script writes rows into whatever DATABASE_URL points at. An explicit
// `DATABASE_URL=... node scripts/restore-backup.mjs` prefix bypasses
// .env.local entirely, so the usual local-only guarantee does not apply
// here. Refuse a non-local target unless the caller says they meant it.
const url = process.env.DATABASE_URL ?? ''
const isLocal = url.includes('localhost') || url.includes('127.0.0.1')
if (!isLocal && process.env.I_MEAN_IT !== 'yes') {
  console.error('\nRefusing to write to a non-local database.')
  console.error(`  target: ${url.replace(/:\/\/[^@]*@/, '://***@') || '(unset)'}`)
  console.error('\nThis would restore rows into a remote database, probably production.')
  console.error('If that is genuinely what you want, re-run with I_MEAN_IT=yes\n')
  process.exit(1)
}

const db = new PrismaClient()
const dump = JSON.parse(readFileSync(path, 'utf-8'))

const ISO = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/
const revive = (row) =>
  Object.fromEntries(
    Object.entries(row).map(([k, v]) => [k, typeof v === 'string' && ISO.test(v) ? new Date(v) : v]),
  )

const order = [
  'organization', 'user', 'company', 'person', 'lead',
  'activity', 'task', 'stageDefinition', 'onboardingStepDefinition',
  'leadFieldDefinition', 'orgEmailConfig', 'orgSheetConnector',
  'savedView', 'workflowRule', 'invite', 'joinRequest', 'signupToken',
  'auditLog', 'skillRun', 'whiteboardElement', 'syncCursor', 'jobRun',
]

let totalFail = 0
for (const m of order) {
  const rows = dump[m]
  if (!Array.isArray(rows) || rows.length === 0) continue
  let ok = 0, fail = 0
  for (const row of rows) {
    try { await db[m].create({ data: revive(row) }); ok++ }
    catch (e) { fail++; if (fail <= 2) console.log(`  ! ${m}: ${e.message.slice(0, 110)}`) }
  }
  totalFail += fail
  console.log(`${m.padEnd(26)} ${ok} restored${fail ? `, ${fail} FAILED` : ''}`)
}
await db.$disconnect()
process.exit(totalFail > 0 ? 1 : 0)
