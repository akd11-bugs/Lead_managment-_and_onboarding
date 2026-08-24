import 'dotenv/config'
import { Client } from 'pg'

const OLD_URL = process.env.OLD_DATABASE_URL
const NEW_URL = process.env.NEW_DATABASE_URL
if (!OLD_URL || !NEW_URL) {
  throw new Error('Set OLD_DATABASE_URL (source, Prisma Postgres) and NEW_DATABASE_URL (target, Neon) env vars')
}

// Parents before children — Task/Activity/SkillRun have a hard FK to Lead.
const TABLES = ['Lead', 'User', 'WorkflowRule', 'SavedView', 'Task', 'Activity', 'Invite', 'SignupToken', 'AuditLog', 'SkillRun']

async function main() {
  const oldClient = new Client({ connectionString: OLD_URL })
  const newClient = new Client({ connectionString: NEW_URL })
  await oldClient.connect()
  await newClient.connect()

  for (const table of TABLES) {
    let rows: Record<string, unknown>[]
    try {
      rows = (await oldClient.query(`SELECT * FROM "${table}"`)).rows
    } catch (err) {
      if ((err as { code?: string }).code === '42P01') {
        console.log(`${table}: table does not exist in source, skipping`)
        continue
      }
      throw err
    }
    if (rows.length === 0) {
      console.log(`${table}: 0 rows in source, skipping`)
      continue
    }
    const columns = Object.keys(rows[0])
    const colList = columns.map((c) => `"${c}"`).join(', ')
    const updateList = columns
      .filter((c) => c !== 'id')
      .map((c) => `"${c}" = EXCLUDED."${c}"`)
      .join(', ')
    for (const row of rows) {
      const values = columns.map((c) => row[c])
      const placeholders = values.map((_, i) => `$${i + 1}`).join(', ')
      // Upsert, not plain insert — safe to re-run (e.g. to catch writes made
      // to the old DB during the gap before Render's env var was flipped).
      await newClient.query(
        `INSERT INTO "${table}" (${colList}) VALUES (${placeholders})
         ON CONFLICT ("id") DO UPDATE SET ${updateList}`,
        values
      )
    }
    console.log(`${table}: upserted ${rows.length} rows`)
  }

  await oldClient.end()
  await newClient.end()
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
