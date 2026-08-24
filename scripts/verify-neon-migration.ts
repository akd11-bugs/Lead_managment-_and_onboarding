import 'dotenv/config'
import { Client } from 'pg'

const OLD_URL = process.env.OLD_DATABASE_URL
const NEW_URL = process.env.NEW_DATABASE_URL
if (!OLD_URL || !NEW_URL) throw new Error('Set OLD_DATABASE_URL and NEW_DATABASE_URL')

const TABLES = ['Lead', 'User', 'WorkflowRule', 'SavedView', 'Task', 'Activity', 'Invite', 'SignupToken', 'AuditLog', 'SkillRun']

async function main() {
  const oldClient = new Client({ connectionString: OLD_URL })
  const newClient = new Client({ connectionString: NEW_URL })
  await oldClient.connect()
  await newClient.connect()

  let allMatch = true
  for (const table of TABLES) {
    const oldCount = (await oldClient.query(`SELECT count(*) FROM "${table}"`)).rows[0].count
    const newCount = (await newClient.query(`SELECT count(*) FROM "${table}"`)).rows[0].count
    const match = oldCount === newCount
    if (!match) allMatch = false
    console.log(`${table}: source=${oldCount} neon=${newCount} ${match ? 'OK' : 'MISMATCH'}`)
  }
  console.log(allMatch ? '\nAll counts match.' : '\nMISMATCH detected — do not cut over yet.')

  await oldClient.end()
  await newClient.end()
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
