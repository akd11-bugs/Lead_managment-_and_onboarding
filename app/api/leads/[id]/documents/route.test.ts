import { describe, expect, it, vi, beforeEach } from 'vitest'

// Exercises the real route handlers against a mocked Prisma, so the
// authorization and tenant-scoping behaviour is tested rather than inferred
// from reading the source. The previous suite covered pure helpers only;
// nothing proved a route actually applies them.

const findFirst = vi.fn()
const findMany = vi.fn()
const create = vi.fn()

vi.mock('@/lib/db', () => ({
  prisma: {
    lead: { findFirst: (...a: unknown[]) => findFirst(...a) },
    onboardingDocument: {
      findMany: (...a: unknown[]) => findMany(...a),
      create: (...a: unknown[]) => create(...a),
    },
  },
}))

let currentUser: Record<string, unknown> | { __unauth: true } = { __unauth: true }

// Stub the whole module rather than importActual: lib/session imports
// lib/auth, which pulls @neondatabase/auth and its next/headers dependency,
// neither of which resolves outside the Next runtime. The role helpers are
// trivial and re-implemented here to match lib/session.ts exactly.
vi.mock('@/lib/session', async () => {
  const { NextResponse } = await import('next/server')
  return {
    requireApiUser: async () =>
      '__unauth' in currentUser ? NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) : currentUser,
    isAdmin: (u: { role?: string }) => u.role === 'admin',
    isOperations: (u: { role?: string }) => u.role === 'operations',
  }
})

vi.mock('@/lib/http', () => ({
  readJsonBody: async (req: Request) => {
    try {
      return await req.json()
    } catch {
      const { NextResponse } = await import('next/server')
      return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
    }
  },
}))

const { GET, POST } = await import('@/app/api/leads/[id]/documents/route')

function user(overrides: Record<string, unknown> = {}) {
  return {
    id: 'u-sales',
    name: 'Sales',
    email: 's@a.com',
    role: 'sales',
    orgId: 'org-a',
    visibleOrgIds: ['org-a'],
    ...overrides,
  }
}

const SHA = 'a'.repeat(64)
const params = (id: string) => ({ params: Promise.resolve({ id }) })

function postReq(body: unknown) {
  return new Request('http://test/api/leads/lead-1/documents', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

beforeEach(() => {
  findFirst.mockReset()
  findMany.mockReset().mockResolvedValue([])
  create.mockReset().mockResolvedValue({ id: 'doc-1' })
  currentUser = user()
})

describe('authentication', () => {
  it('GET returns 401 when there is no session, and never touches the database', async () => {
    currentUser = { __unauth: true }
    const res = await GET(new Request('http://test'), params('lead-1'))
    expect(res.status).toBe(401)
    expect(findFirst).not.toHaveBeenCalled()
    expect(findMany).not.toHaveBeenCalled()
  })

  it('POST returns 401 when there is no session, before any write', async () => {
    currentUser = { __unauth: true }
    const res = await POST(postReq({ kind: 'pan' }), params('lead-1'))
    expect(res.status).toBe(401)
    expect(create).not.toHaveBeenCalled()
  })
})

describe('multi-tenant isolation', () => {
  it('scopes the lead lookup to the caller org on GET', async () => {
    findFirst.mockResolvedValue({ id: 'lead-1' })
    await GET(new Request('http://test'), params('lead-1'))
    expect(findFirst.mock.calls[0][0].where.orgId).toBe('org-a')
  })

  it('scopes the document query to the caller org, never to the lead alone', async () => {
    findFirst.mockResolvedValue({ id: 'lead-1' })
    await GET(new Request('http://test'), params('lead-1'))
    expect(findMany.mock.calls[0][0].where).toMatchObject({ orgId: 'org-a', leadId: 'lead-1' })
  })

  it('404s a lead belonging to another org rather than leaking its existence', async () => {
    // Another org's lead is simply not found under this org's filter.
    findFirst.mockResolvedValue(null)
    const res = await GET(new Request('http://test'), params('lead-from-org-b'))
    expect(res.status).toBe(404)
    expect(findMany).not.toHaveBeenCalled()
  })

  it('refuses to create a document against another org lead', async () => {
    findFirst.mockResolvedValue(null)
    const res = await POST(
      postReq({ kind: 'pan', localKey: 'k', fileName: 'f.pdf', sha256: SHA, byteSize: 10 }),
      params('lead-from-org-b'),
    )
    expect(res.status).toBe(404)
    expect(create).not.toHaveBeenCalled()
  })

  it('writes the caller org onto the row, never an org supplied by the client', async () => {
    findFirst.mockResolvedValue({ id: 'lead-1' })
    await POST(
      postReq({
        kind: 'pan',
        localKey: 'k',
        fileName: 'f.pdf',
        sha256: SHA,
        byteSize: 10,
        orgId: 'org-b', // hostile: try to plant the row in another tenant
      }),
      params('lead-1'),
    )
    expect(create.mock.calls[0][0].data.orgId).toBe('org-a')
  })
})

describe('role-based lead visibility', () => {
  it('restricts a sales user to leads they own', async () => {
    findFirst.mockResolvedValue({ id: 'lead-1' })
    await GET(new Request('http://test'), params('lead-1'))
    expect(findFirst.mock.calls[0][0].where.ownerId).toBe('u-sales')
  })

  it('does not restrict an admin by ownerId, but still scopes by org', async () => {
    currentUser = user({ role: 'admin', id: 'u-admin' })
    findFirst.mockResolvedValue({ id: 'lead-1' })
    await GET(new Request('http://test'), params('lead-1'))
    const where = findFirst.mock.calls[0][0].where
    expect(where.ownerId).toBeUndefined()
    expect(where.orgId).toBe('org-a')
  })

  it('does not restrict operations by ownerId, but still scopes by org', async () => {
    currentUser = user({ role: 'operations', id: 'u-ops' })
    findFirst.mockResolvedValue({ id: 'lead-1' })
    await GET(new Request('http://test'), params('lead-1'))
    const where = findFirst.mock.calls[0][0].where
    expect(where.ownerId).toBeUndefined()
    expect(where.orgId).toBe('org-a')
  })
})

describe('the no-bytes guarantee, enforced at the route', () => {
  it.each(['content', 'data', 'base64', 'blob', 'file', 'bytes', 'dataUrl'])(
    'rejects a payload carrying %s and writes nothing',
    async field => {
      findFirst.mockResolvedValue({ id: 'lead-1' })
      const res = await POST(
        postReq({ kind: 'pan', localKey: 'k', fileName: 'f.pdf', sha256: SHA, byteSize: 10, [field]: 'JVBER' }),
        params('lead-1'),
      )
      expect(res.status).toBe(400)
      expect(create).not.toHaveBeenCalled()
    },
  )

  it('stores only metadata fields on a valid create', async () => {
    findFirst.mockResolvedValue({ id: 'lead-1' })
    await POST(
      postReq({ kind: 'gst', localKey: 'k', fileName: 'gst.pdf', sha256: SHA, byteSize: 2048 }),
      params('lead-1'),
    )
    const data = create.mock.calls[0][0].data
    expect(data.sha256).toBe(SHA)
    expect(data.byteSize).toBe(2048)
    for (const banned of ['content', 'data', 'base64', 'blob', 'file', 'bytes', 'dataUrl']) {
      expect(data[banned]).toBeUndefined()
    }
  })
})
