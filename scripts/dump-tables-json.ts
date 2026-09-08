import 'dotenv/config'
import { Pool } from 'pg'
import { writeFileSync } from 'fs'
import path from 'path'

// One-off safety backup before the Phase 0 org-migration ALTERs run — dumps
// every row of every table that migration touches to a local JSON file, so
// there's a restorable snapshot if anything goes wrong. Not a substitute for
// a real pg_dump (no schema/indexes/sequences captured, just row data), but
// sufficient to manually restore data if a step needs to be undone.
const TABLES = ['Lead', 'User', 'WorkflowRule', 'SavedView', 'Task', 'Activity', 'Invite', 'SkillRun', 'AuditLog']

async function main() {
  const outDir = process.argv[2]
  if (!outDir) {
    console.error('Usage: tsx scripts/dump-tables-json.ts <output-dir>')
    process.exit(1)
  }
  const pool = new Pool({ connectionString: process.env.DATABASE_URL })
  for (const table of TABLES) {
    const { rows } = await pool.query(`SELECT * FROM "${table}"`)
    const file = path.join(outDir, `${table}.json`)
    writeFileSync(file, JSON.stringify(rows, null, 2))
    console.log(`  ${table}: ${rows.length} row(s) -> ${file}`)
  }
  await pool.end()
  console.log('✅ Backup complete.')
}

main().catch((e) => {
  console.error('❌ Backup failed:', e)
  process.exit(1)
})
