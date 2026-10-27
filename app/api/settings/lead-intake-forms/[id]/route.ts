import { NextResponse } from 'next/server'
import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/db'
import { requireApiUser, isAdmin } from '@/lib/session'
import { readJsonBody } from '@/lib/http'
import { slugify } from '@/lib/orgSlug'
import { SOURCES } from '@/lib/types'

export const dynamic = 'force-dynamic'

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireApiUser()
  if (user instanceof NextResponse) return user
  if (!isAdmin(user)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { id } = await params
  // findFirst with an orgId term, never findUnique({ where: { id } }) — id
  // is globally unique, so findUnique alone would resolve another org's row.
  const existing = await prisma.orgLeadIntakeForm.findFirst({ where: { id, orgId: user.orgId } })
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const body = await readJsonBody(req)
  if (body instanceof NextResponse) return body

  const data: Prisma.OrgLeadIntakeFormUpdateInput = {}

  if (body.name !== undefined) {
    const name = String(body.name).trim()
    if (!name) return NextResponse.json({ error: 'name cannot be empty' }, { status: 400 })
    data.name = name
  }
  if (body.slug !== undefined) {
    const slug = slugify(String(body.slug))
    if (!slug) return NextResponse.json({ error: 'slug cannot be empty' }, { status: 400 })
    data.slug = slug
  }
  if (body.defaultSource !== undefined) {
    const defaultSource = String(body.defaultSource).trim()
    if (!(SOURCES as string[]).includes(defaultSource)) {
      return NextResponse.json({ error: `defaultSource must be one of: ${SOURCES.join(', ')}` }, { status: 400 })
    }
    data.defaultSource = defaultSource
  }
  if (body.defaultOwnerUserId !== undefined) {
    const defaultOwnerUserId = String(body.defaultOwnerUserId).trim()
    const owner = await prisma.user.findUnique({ where: { id: defaultOwnerUserId }, select: { orgId: true } })
    if (!owner || owner.orgId !== user.orgId) {
      return NextResponse.json({ error: 'defaultOwnerUserId must be a user in your org' }, { status: 400 })
    }
    data.defaultOwnerUserId = defaultOwnerUserId
  }
  if (body.enabled !== undefined) {
    data.enabled = Boolean(body.enabled)
  }

  try {
    const form = await prisma.orgLeadIntakeForm.update({ where: { id }, data })
    return NextResponse.json({ form })
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
      return NextResponse.json({ error: 'That link is already taken — choose a different slug.' }, { status: 409 })
    }
    throw err
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireApiUser()
  if (user instanceof NextResponse) return user
  if (!isAdmin(user)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { id } = await params
  const existing = await prisma.orgLeadIntakeForm.findFirst({ where: { id, orgId: user.orgId } })
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  await prisma.orgLeadIntakeForm.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
