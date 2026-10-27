import { Prisma, type Company, type Person } from '@prisma/client'
import { prisma } from '@/lib/db'

// Same normalization the app's old company-matching logic already did
// (lowercase + trim) — centralized here instead of duplicated at every call
// site, plus whitespace collapsing to also catch "Acme  Inc" vs "Acme Inc".
export function normalizeCompanyName(name: string): string {
  return name.trim().toLowerCase().replace(/\s+/g, ' ')
}

/**
 * Finds the org's existing Company by normalized name, or creates it.
 * Races are possible (two concurrent imports creating the same company for
 * the first time) — the unique constraint on (orgId, normalizedName) is the
 * real guard; on a P2002 conflict here, re-fetch rather than fail, since the
 * other writer's row is just as valid as the one we tried to create.
 */
export async function findOrCreateCompany(orgId: string, name: string): Promise<Company> {
  const trimmedName = name.trim()
  const normalizedName = normalizeCompanyName(name)

  const existing = await prisma.company.findUnique({ where: { orgId_normalizedName: { orgId, normalizedName } } })
  if (existing) return existing

  try {
    return await prisma.company.create({ data: { orgId, name: trimmedName, normalizedName } })
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
      const raced = await prisma.company.findUnique({ where: { orgId_normalizedName: { orgId, normalizedName } } })
      if (raced) return raced
    }
    throw err
  }
}

/**
 * Finds an existing Person at this company by case-insensitive name match,
 * or creates one. Unlike Company, there's no DB-level unique constraint on
 * (companyId, name) — a company can have two legitimately different people
 * who happen to share a name — so this is a best-effort match, not an
 * identity guarantee. Callers that need duplicate-detection semantics (see
 * app/api/leads/route.ts) should treat a match here as "probably the same
 * person," not "definitely."
 */
export async function findOrCreatePerson(
  orgId: string,
  companyId: string,
  name: string,
  extra?: {
    email?: string | null
    phone?: string | null
    jobTitle?: string | null
    linkedinUrl?: string | null
    otherLinks?: string[]
  },
): Promise<Person> {
  const trimmedName = name.trim()

  const existing = await prisma.person.findFirst({
    where: { orgId, companyId, name: { equals: trimmedName, mode: 'insensitive' } },
  })
  if (existing) {
    // A card scan matching an existing Person (same name, same company)
    // still carries real new data — without this, a rescanned or
    // previously-manually-entered contact would silently drop the
    // LinkedIn/other links a scan just found, since create() below never
    // runs for a match. Only touches the two link fields; every other
    // field keeps this function's existing create-only behavior.
    if (extra?.linkedinUrl || (extra?.otherLinks && extra.otherLinks.length > 0)) {
      const existingOtherLinks: string[] = JSON.parse(existing.otherLinksJson || '[]')
      const mergedOtherLinks = Array.from(new Set([...existingOtherLinks, ...(extra.otherLinks ?? [])]))
      return prisma.person.update({
        where: { id: existing.id },
        data: {
          linkedinUrl: existing.linkedinUrl ?? extra.linkedinUrl ?? null,
          otherLinksJson: JSON.stringify(mergedOtherLinks),
        },
      })
    }
    return existing
  }

  return prisma.person.create({
    data: {
      orgId,
      companyId,
      name: trimmedName,
      email: extra?.email ?? null,
      phone: extra?.phone ?? null,
      jobTitle: extra?.jobTitle ?? null,
      linkedinUrl: extra?.linkedinUrl ?? null,
      otherLinksJson: JSON.stringify(extra?.otherLinks ?? []),
    },
  })
}

/**
 * Looks for an existing Person at this company that would make a new lead a
 * likely duplicate entry — matched by name (case-insensitive) or email, same
 * company. Read-only — callers decide what to do with a match (409 + force
 * override, same UX pattern as the old company-level check this replaces).
 */
export async function findPossibleDuplicatePerson(
  orgId: string,
  companyId: string,
  name: string | undefined,
  email: string | undefined,
): Promise<Person | null> {
  const conditions: Prisma.PersonWhereInput[] = []
  if (name?.trim()) conditions.push({ name: { equals: name.trim(), mode: 'insensitive' } })
  if (email?.trim()) conditions.push({ email: { equals: email.trim(), mode: 'insensitive' } })
  if (conditions.length === 0) return null

  return prisma.person.findFirst({ where: { orgId, companyId, OR: conditions } })
}
