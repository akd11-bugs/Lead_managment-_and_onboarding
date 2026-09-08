import 'dotenv/config'
import bcrypt from 'bcryptjs'
import { prisma } from '@/lib/db'
import { getDefaultOrgId, createRootOrganization } from '@/lib/org'

const VALID_ROLES = ['admin', 'sales', 'operations']

async function main() {
  const name = process.env.ADMIN_NAME
  const email = process.env.ADMIN_EMAIL?.trim().toLowerCase()
  const password = process.env.ADMIN_PASSWORD
  const role = process.env.ADMIN_ROLE ?? 'admin'

  if (!name || !email || !password || password.length < 8) {
    console.error('Set ADMIN_NAME, ADMIN_EMAIL, ADMIN_PASSWORD (8+ chars) env vars and re-run.')
    process.exit(1)
  }
  if (!VALID_ROLES.includes(role)) {
    console.error(`ADMIN_ROLE must be one of ${VALID_ROLES.join(', ')} — got "${role}".`)
    process.exit(1)
  }

  const existing = await prisma.user.findUnique({ where: { email } })
  if (existing) {
    console.error(`A user with email ${email} already exists (role: ${existing.role}). Refusing to overwrite.`)
    process.exit(1)
  }

  // Bootstraps the very first (root) org if none exists yet — this script is
  // typically the first thing run against a fresh database.
  let orgId: string
  try {
    orgId = await getDefaultOrgId()
  } catch {
    const org = await createRootOrganization(process.env.ADMIN_ORG_NAME || 'Default Organization')
    orgId = org.id
  }

  const passwordHash = await bcrypt.hash(password, 10)
  const user = await prisma.user.create({ data: { orgId, name, email, passwordHash, role } })
  console.log(`✅ Created ${user.role} user ${user.email} (id: ${user.id}). Log in and rotate the password if desired.`)
}

main()
  .catch((e) => {
    console.error('❌ Failed to create user:', e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
