import { prisma } from '@/lib/db'
import type { Organization } from '@prisma/client'

// Until Phase 2 (Neon Auth → "create your organization") is wired up, any
// code path that must create a User with no explicit org yet (the existing
// Google OAuth pending-signup flow, admin-invite redemption before an org
// picker exists, etc.) falls back to the single root org created by the
// Phase 0 migration backfill. Once multiple root orgs exist this stops being
// meaningful and every one of these call sites needs an explicit orgId
// instead — grep for this function's usages when that day comes.
export async function getDefaultOrgId(): Promise<string> {
  const root = await prisma.organization.findFirst({
    where: { parentOrgId: null },
    orderBy: { createdAt: 'asc' },
    select: { id: true },
  })
  if (!root) {
    throw new Error('No root organization exists — run the Phase 0 backfill (scripts/backfill-org.ts) first.')
  }
  return root.id
}

// A materialized path lets "self + all descendants" be a single indexed
// `path LIKE '<path>%'` query instead of a recursive CTE. Each org's path is
// its ancestors' ids joined by "/", with a trailing "/" so prefix matching
// never false-positives on a sibling whose id happens to start with the same
// characters (e.g. "/a/" is not a prefix of "/ab/").
function childPath(parentPath: string, childId: string): string {
  return `${parentPath}${childId}/`
}

export async function createRootOrganization(name: string): Promise<Organization> {
  // Two-step: the path needs the row's own generated id, which Prisma only
  // hands back after the insert.
  const org = await prisma.organization.create({ data: { name, parentOrgId: null, path: '/' } })
  return prisma.organization.update({ where: { id: org.id }, data: { path: childPath('/', org.id) } })
}

export async function createChildOrganization(parentId: string, name: string): Promise<Organization> {
  const parent = await prisma.organization.findUnique({ where: { id: parentId }, select: { path: true } })
  if (!parent) throw new Error(`Parent organization ${parentId} not found`)
  const org = await prisma.organization.create({ data: { name, parentOrgId: parentId, path: '' } })
  return prisma.organization.update({ where: { id: org.id }, data: { path: childPath(parent.path, org.id) } })
}
