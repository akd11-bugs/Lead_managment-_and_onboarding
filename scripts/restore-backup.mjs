// Restores a JSON backup (as written before the 2026-10-16 wipe) into
// whatever DATABASE_URL points at. Insert order respects FK dependencies.
// Columns added to the schema since the backup are absent and take defaults.
//
// Intended for the local test database. Pointing this at Neon would
// re-populate production, so pass the URL deliberately.
import { PrismaClient } from '@prisma/client'
import { readFileSync } from 'node:fs'

const db = new PrismaClient()
const path = process.argv[2]
if (!path) {
  console.error('usage: node scripts/restore-backup.mjs <backup.json>')
  process.exit(1)
}
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
