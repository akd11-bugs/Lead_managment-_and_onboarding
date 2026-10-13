import 'dotenv/config'
import { prisma } from '@/lib/db'
import { createOrganization } from '@/lib/org'
import { createNeonAuthIdentity } from '@/lib/auth'

const VALID_ROLES = ['admin', 'sales', 'operations']

async function main() {
  const name = process.env.ADMIN_NAME
  const email = process.env.ADMIN_EMAIL?.trim().toLowerCase()
  const password = process.env.ADMIN_PASSWORD
  const role = process.env.ADMIN_ROLE ?? 'admin'
  const orgId = process.env.ADMIN_ORG_ID
  const orgName = process.env.ADMIN_ORG_NAME

  if (!name || !email || !password || password.length < 8) {
    console.error('Set ADMIN_NAME, ADMIN_EMAIL, ADMIN_PASSWORD (8+ chars) env vars and re-run.')
    process.exit(1)
  }
  if (!VALID_ROLES.includes(role)) {
    console.error(`ADMIN_ROLE must be one of ${VALID_ROLES.join(', ')} — got "${role}".`)
    process.exit(1)
  }
  if (!orgId && !orgName) {
    console.error('Set either ADMIN_ORG_ID (to add this user to an existing company) or ADMIN_ORG_NAME (to create a brand-new, isolated company).')
    process.exit(1)
  }

  const existing = await prisma.user.findUnique({ where: { email } })
  if (existing) {
    console.error(`A user with email ${email} already exists (role: ${existing.role}). Refusing to overwrite.`)
    process.exit(1)
  }

  // Orgs are flat and isolated — this either joins an existing one (by id)
  // or creates a brand-new one. There is no "default org" fallback anymore.
  let resolvedOrgId: string
  if (orgId) {
    const org = await prisma.organization.findUnique({ where: { id: orgId }, select: { id: true } })
    if (!org) {
      console.error(`ADMIN_ORG_ID "${orgId}" does not match an existing organization.`)
      process.exit(1)
    }
    resolvedOrgId = org.id
  } else {
    const org = await createOrganization(orgName!)
    resolvedOrgId = org.id
  }

  // See lib/auth.ts's createNeonAuthIdentity doc comment for why this
  // script can't use the `neonAuth` instance directly. There's no real
  // browser request here to take a trusted Origin from — override
  // ADMIN_ORIGIN if the default isn't one of this Neon Auth project's
  // trusted origins. Login checks against this Neon Auth identity, not the
  // passwordHash column below (kept null — vestigial since the migration).
  const origin = process.env.ADMIN_ORIGIN || 'http://localhost:3000'
  const signUp = await createNeonAuthIdentity({ email, password, name, origin })
  if (!signUp.ok) {
    console.error(`❌ Failed to create the Neon Auth identity: ${signUp.message}`)
    process.exit(1)
  }

  const user = await prisma.user.create({ data: { orgId: resolvedOrgId, name, email, passwordHash: null, role } })
  console.log(`✅ Created ${user.role} user ${user.email} (id: ${user.id}) in org ${resolvedOrgId}. Log in at /login.`)
}

main()
  .catch((e) => {
    console.error('❌ Failed to create user:', e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
