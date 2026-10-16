import { prisma } from '@/lib/db'

// URL-safe organisation identifier, used for the per-org field-rep login
// page (/rep/<slug>). Field reps authenticate with name + PIN and have no
// email, so the URL is the only thing that says which tenant they belong to
// — see lib/repAuth.ts for the cross-tenant lockout this prevents.
//
// Shared by org creation (lib/org.ts) and the backfill script, so both
// produce identical slugs for the same name.

/** Longest slug we will generate, before any de-duplication suffix. */
const MAX_BASE = 40

// Reserved because /rep/<slug> sits under the same path as these, and a slug
// that collides with a real or future route would be unreachable or
// confusing.
const RESERVED = new Set(['api', 'login', 'logout', 'signup', 'rep', 'admin', 'settings', 'new', 'static', '_next'])

export function slugify(name: string): string {
  const base = name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, MAX_BASE)
    .replace(/-+$/, '')
  return base || 'org'
}

/**
 * A slug not already taken. Appends -2, -3 … on collision, so two customers
 * with the same or similar company name both get a working link.
 *
 * Racy by nature: two orgs created at the same instant can resolve the same
 * candidate. The unique index on Organization.slug is the real guard —
 * callers should retry on P2002 rather than trusting this alone.
 */
export async function uniqueOrgSlug(name: string): Promise<string> {
  const base = slugify(name)
  let candidate = RESERVED.has(base) ? `${base}-org` : base

  for (let n = 2; n < 1000; n++) {
    const taken = await prisma.organization.findUnique({
      where: { slug: candidate },
      select: { id: true },
    })
    if (!taken) return candidate
    candidate = `${base}-${n}`
  }
  // Astronomically unlikely; a random suffix beats throwing on signup.
  return `${base}-${Math.random().toString(36).slice(2, 8)}`
}
