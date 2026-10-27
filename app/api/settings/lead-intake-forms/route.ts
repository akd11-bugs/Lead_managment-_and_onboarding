import { NextResponse } from 'next/server'
import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/db'
import { requireApiUser, isAdmin } from '@/lib/session'
import { readJsonBody } from '@/lib/http'
import { slugify } from '@/lib/orgSlug'
import { SOURCES } from '@/lib/types'

export const dynamic = 'force-dynamic'

export async function GET() {
  const user = await requireApiUser()
  if (user instanceof NextResponse) return user
  if (!isAdmin(user)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const forms = await prisma.orgLeadIntakeForm.findMany({
    where: { orgId: user.orgId },
    orderBy: { configuredAt: 'desc' },
  })
  return NextResponse.json({ forms })
}

export async function POST(req: Request) {
  const user = await requireApiUser()
  if (user instanceof NextResponse) return user
  if (!isAdmin(user)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await readJsonBody(req)
  if (body instanceof NextResponse) return body

  const name = String(body.name ?? '').trim()
  const defaultOwnerUserId = String(body.defaultOwnerUserId ?? '').trim()
  const defaultSource = String(body.defaultSource ?? 'form').trim()
  // slugify() does the same lowercase/dash normalization used for
  // Organization.slug — this reuses it rather than a second hand-rolled
  // regex, though the RESERVED-word check that guards /rep/<slug> doesn't
  // apply here (/intake/<slug> is a different path, no collision risk).
  // An explicit empty string from the "optional" slug field must fall back
  // to `name` too, not just a missing field — `??` alone doesn't catch that.
  const rawSlug = String(body.slug ?? '').trim()
  const slug = slugify(rawSlug || name)

  if (!name || !slug) {
    return NextResponse.json({ error: 'A name is required' }, { status: 400 })
  }
  if (!defaultOwnerUserId) {
    return NextResponse.json({ error: 'defaultOwnerUserId is required' }, { status: 400 })
  }
  if (!(SOURCES as string[]).includes(defaultSource)) {
    return NextResponse.json({ error: `defaultSource must be one of: ${SOURCES.join(', ')}` }, { status: 400 })
  }

  const owner = await prisma.user.findUnique({ where: { id: defaultOwnerUserId }, select: { orgId: true } })
  if (!owner || owner.orgId !== user.orgId) {
    return NextResponse.json({ error: 'defaultOwnerUserId must be a user in your org' }, { status: 400 })
  }

  try {
    const form = await prisma.orgLeadIntakeForm.create({
      data: { orgId: user.orgId, name, slug, defaultOwnerUserId, defaultSource, configuredByUserId: user.id },
    })
    return NextResponse.json({ form }, { status: 201 })
  } catch (err) {
    // slug is globally unique (prisma/schema.prisma) — same conflict shape
    // as OrgSheetConnector.sheetId.
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
      return NextResponse.json({ error: 'That link is already taken — choose a different name or slug.' }, { status: 409 })
    }
    throw err
  }
}
