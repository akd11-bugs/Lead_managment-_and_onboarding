import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const userFindUniqueMock = vi.fn()
const userFindFirstMock = vi.fn()
const userFindManyMock = vi.fn()
const cursorFindUniqueMock = vi.fn()
const cursorUpsertMock = vi.fn()
const orgSheetConnectorFindManyMock = vi.fn()
const orgSheetConnectorUpdateMock = vi.fn()
const getSheetRowsMock = vi.fn()
const importLeadRowsMock = vi.fn()
const recordJobRunMock = vi.fn()

vi.mock('@/lib/db', () => ({
  prisma: {
    user: {
      findUnique: (...args: unknown[]) => userFindUniqueMock(...args),
      findFirst: (...args: unknown[]) => userFindFirstMock(...args),
      findMany: (...args: unknown[]) => userFindManyMock(...args),
    },
    syncCursor: {
      findUnique: (...args: unknown[]) => cursorFindUniqueMock(...args),
      upsert: (...args: unknown[]) => cursorUpsertMock(...args),
    },
    orgSheetConnector: {
      findMany: (...args: unknown[]) => orgSheetConnectorFindManyMock(...args),
      update: (...args: unknown[]) => orgSheetConnectorUpdateMock(...args),
    },
  },
}))

vi.mock('@/lib/googleSheets', () => ({
  getSheetRows: (...args: unknown[]) => getSheetRowsMock(...args),
}))

vi.mock('@/lib/leadImport', () => ({
  importLeadRows: (...args: unknown[]) => importLeadRowsMock(...args),
}))

vi.mock('@/lib/jobRun', () => ({
  recordJobRun: (...args: unknown[]) => recordJobRunMock(...args),
}))

const { POST } = await import('./route')

const ENV_KEYS = ['CRON_SYNC_API_KEY', 'LEADS_SHEET_ID', 'LEADS_SHEET_RANGE', 'SHEET_IMPORT_DEFAULT_OWNER_EMAIL'] as const
const savedEnv: Record<string, string | undefined> = {}

function req(token?: string) {
  const headers: Record<string, string> = {}
  if (token !== undefined) headers.authorization = `Bearer ${token}`
  return new Request('http://x/api/cron/sync-leads-sheet', { method: 'POST', headers })
}

beforeEach(() => {
  for (const k of ENV_KEYS) savedEnv[k] = process.env[k]
  process.env.CRON_SYNC_API_KEY = 'test-key'
  process.env.LEADS_SHEET_ID = 'sheet-123'
  process.env.LEADS_SHEET_RANGE = 'Sheet1'
  process.env.SHEET_IMPORT_DEFAULT_OWNER_EMAIL = 'default@example.com'

  userFindUniqueMock.mockReset()
  userFindFirstMock.mockReset()
  userFindManyMock.mockReset()
  cursorFindUniqueMock.mockReset()
  cursorUpsertMock.mockReset()
  orgSheetConnectorFindManyMock.mockReset()
  orgSheetConnectorUpdateMock.mockReset()
  getSheetRowsMock.mockReset()
  importLeadRowsMock.mockReset()
  recordJobRunMock.mockReset()

  userFindUniqueMock.mockResolvedValue({ id: 'default-owner', name: 'Default Owner', orgId: 'default-org' })
  userFindManyMock.mockResolvedValue([])
  cursorFindUniqueMock.mockResolvedValue(null)
  cursorUpsertMock.mockResolvedValue({})
  orgSheetConnectorFindManyMock.mockResolvedValue([]) // no per-org connectors configured, by default
  orgSheetConnectorUpdateMock.mockResolvedValue({})
  importLeadRowsMock.mockResolvedValue({ created: 0, skipped: [] })
  recordJobRunMock.mockResolvedValue(undefined)
})

afterEach(() => {
  for (const k of ENV_KEYS) {
    if (savedEnv[k] === undefined) delete process.env[k]
    else process.env[k] = savedEnv[k]
  }
})

describe('POST /api/cron/sync-leads-sheet', () => {
  it('returns 503 when CRON_SYNC_API_KEY is not configured', async () => {
    delete process.env.CRON_SYNC_API_KEY
    const res = await POST(req('anything'))
    expect(res.status).toBe(503)
  })

  it('returns 401 with no Authorization header', async () => {
    const res = await POST(req())
    expect(res.status).toBe(401)
  })

  it('returns 401 with a wrong bearer token', async () => {
    const res = await POST(req('wrong-key'))
    expect(res.status).toBe(401)
  })

  it('returns 503 when LEADS_SHEET_ID is set but SHEET_IMPORT_DEFAULT_OWNER_EMAIL is missing', async () => {
    delete process.env.SHEET_IMPORT_DEFAULT_OWNER_EMAIL
    const res = await POST(req('test-key'))
    expect(res.status).toBe(503)
  })

  it('returns 503 naming the env var when the default owner email matches no user', async () => {
    userFindUniqueMock.mockResolvedValue(null)
    const res = await POST(req('test-key'))
    expect(res.status).toBe(503)
    const body = await res.json()
    expect(body.error).toContain('default@example.com')
  })

  it('returns an empty results array when neither the global env sheet nor any org connector is configured', async () => {
    delete process.env.LEADS_SHEET_ID
    const res = await POST(req('test-key'))
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ results: [] })
  })

  it('short-circuits with created:0 when the sheet has only a header row (or is empty)', async () => {
    getSheetRowsMock.mockResolvedValue([['Company', 'Email']])
    const res = await POST(req('test-key'))
    const body = await res.json()
    expect(body.results).toEqual([{ source: 'global', created: 0, skipped: [] }])
    expect(importLeadRowsMock).not.toHaveBeenCalled()
  })

  it('short-circuits with created:0 when the cursor already covers every data row', async () => {
    getSheetRowsMock.mockResolvedValue([
      ['Company', 'Email'],
      ['Acme', 'a@acme.com'],
    ])
    cursorFindUniqueMock.mockResolvedValue({ value: '1' })
    const res = await POST(req('test-key'))
    const body = await res.json()
    expect(body.results).toEqual([{ source: 'global', created: 0, skipped: [] }])
    expect(importLeadRowsMock).not.toHaveBeenCalled()
  })

  it('processes only rows past the cursor, and advances the cursor to the full data-row count', async () => {
    getSheetRowsMock.mockResolvedValue([
      ['Company', 'Email'],
      ['Old Co', 'old@co.com'],
      ['New Co', 'new@co.com'],
    ])
    cursorFindUniqueMock.mockResolvedValue({ value: '1' })
    importLeadRowsMock.mockResolvedValue({ created: 1, skipped: [] })

    await POST(req('test-key'))

    expect(importLeadRowsMock).toHaveBeenCalledTimes(1)
    const [rowsArg] = importLeadRowsMock.mock.calls[0]
    expect(rowsArg).toHaveLength(1)
    expect(rowsArg[0].company).toBe('New Co')

    expect(cursorUpsertMock).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { key: 'leads-sheet:sheet-123:Sheet1' },
        create: { key: 'leads-sheet:sheet-123:Sheet1', value: '2' },
        update: { value: '2' },
      })
    )
  })

  it('creates a fresh cursor at zero when none exists, treating every data row as new', async () => {
    getSheetRowsMock.mockResolvedValue([
      ['Company', 'Email'],
      ['Acme', 'a@acme.com'],
    ])
    await POST(req('test-key'))
    const [rowsArg] = importLeadRowsMock.mock.calls[0]
    expect(rowsArg).toHaveLength(1)
  })

  it('resolves an owner by email/name from the Owner column, falling back to the default owner when unmatched', async () => {
    getSheetRowsMock.mockResolvedValue([
      ['Company', 'Email', 'Owner'],
      ['Acme', 'a@acme.com', 'rep@example.com'],
      ['Beta', 'b@beta.com', 'nobody-matches@example.com'],
    ])
    userFindFirstMock.mockImplementation(async ({ where }: any) => {
      const value = where.OR[0].email.equals
      return value === 'rep@example.com' ? { id: 'rep-1', name: 'Rep One' } : null
    })

    await POST(req('test-key'))

    // Two distinct resolved owners -> two separate importLeadRows calls, one bucket each.
    expect(importLeadRowsMock).toHaveBeenCalledTimes(2)
    const owners = importLeadRowsMock.mock.calls.map((c) => c[1].id).sort()
    expect(owners).toEqual(['default-owner', 'rep-1'].sort())
  })

  it('treats a blank Owner cell as unresolved and falls back to the default owner without querying the DB', async () => {
    getSheetRowsMock.mockResolvedValue([
      ['Company', 'Email', 'Owner'],
      ['Acme', 'a@acme.com', '  '],
    ])
    await POST(req('test-key'))
    expect(userFindFirstMock).not.toHaveBeenCalled()
    expect(importLeadRowsMock.mock.calls[0][1].id).toBe('default-owner')
  })

  it('remaps skipped row numbers from the importLeadRows-local index back to real sheet row numbers', async () => {
    getSheetRowsMock.mockResolvedValue([
      ['Company', 'Email'],
      ['Old Co', 'old@co.com'],
      ['Old Co 2', 'old2@co.com'],
      ['Bad Row', 'not-an-email'],
    ])
    cursorFindUniqueMock.mockResolvedValue({ value: '2' }) // first two rows already processed
    importLeadRowsMock.mockResolvedValue({ created: 0, skipped: [{ row: 1, reason: 'Invalid email' }] })

    const res = await POST(req('test-key'))
    const body = await res.json()
    // "row" is a 1-based data-row index (row 1 = first data row under the
    // header), not the literal spreadsheet row: 2 rows already processed by
    // the cursor + this row's own 1-based position lands on 3.
    expect(body.results[0].skipped).toEqual([{ row: 3, reason: 'Invalid email' }])
  })

  it('sums created counts and sorts skipped rows across multiple owner buckets', async () => {
    getSheetRowsMock.mockResolvedValue([
      ['Company', 'Email', 'Owner'],
      ['A', 'a@a.com', 'rep@example.com'],
      ['B', 'bad-email', ''],
    ])
    userFindFirstMock.mockResolvedValue({ id: 'rep-1', name: 'Rep One' })
    importLeadRowsMock.mockImplementation(async (rows: unknown[], owner: { id: string }) => {
      if (owner.id === 'rep-1') return { created: 1, skipped: [] }
      return { created: 0, skipped: [{ row: 1, reason: 'Invalid email' }] }
    })

    const res = await POST(req('test-key'))
    const body = await res.json()
    expect(body.results[0].created).toBe(1)
    expect(body.results[0].skipped).toEqual([{ row: 2, reason: 'Invalid email' }])
  })

  it('records a successful JobRun scoped to the default owner\'s org after a normal sync', async () => {
    getSheetRowsMock.mockResolvedValue([
      ['Company', 'Email'],
      ['Acme', 'a@acme.com'],
    ])
    await POST(req('test-key'))
    expect(recordJobRunMock).toHaveBeenCalledWith(
      expect.objectContaining({ orgId: 'default-org', jobKey: 'sync-leads-sheet', status: 'success' })
    )
  })

  it('records a failed JobRun and reports an error on that source (not a bare unhandled crash) when importLeadRows throws mid-batch', async () => {
    getSheetRowsMock.mockResolvedValue([
      ['Company', 'Email'],
      ['Acme', 'a@acme.com'],
    ])
    importLeadRowsMock.mockRejectedValue(new Error('DB connection dropped'))

    const res = await POST(req('test-key'))
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.results[0].error).toContain('DB connection dropped')
    expect(recordJobRunMock).toHaveBeenCalledWith(
      expect.objectContaining({ jobKey: 'sync-leads-sheet', status: 'failure', error: expect.stringContaining('DB connection dropped') })
    )
  })

  describe('per-org sheet connectors', () => {
    it('syncs a configured org connector alongside the global source, each with its own cursor', async () => {
      orgSheetConnectorFindManyMock.mockResolvedValue([
        { orgId: 'org-a', sheetId: 'org-a-sheet', sheetRange: 'Leads', defaultOwnerUserId: 'org-a-owner' },
      ])
      userFindManyMock.mockResolvedValue([{ id: 'org-a-owner', name: 'Org A Owner' }])
      getSheetRowsMock.mockResolvedValue([
        ['Company', 'Email'],
        ['Acme', 'a@acme.com'],
      ])
      importLeadRowsMock.mockResolvedValue({ created: 1, skipped: [] })

      const res = await POST(req('test-key'))
      const body = await res.json()

      expect(body.results).toHaveLength(2)
      expect(body.results.map((r: any) => r.source).sort()).toEqual(['global', 'org:org-a'])
      expect(orgSheetConnectorUpdateMock).toHaveBeenCalledWith(
        expect.objectContaining({ where: { orgId: 'org-a' } })
      )
    })

    it('skips an org connector whose configured default owner no longer exists, without failing the whole run', async () => {
      orgSheetConnectorFindManyMock.mockResolvedValue([
        { orgId: 'org-a', sheetId: 'org-a-sheet', sheetRange: 'Leads', defaultOwnerUserId: 'deleted-user' },
      ])
      userFindManyMock.mockResolvedValue([]) // the connector's configured owner is gone
      getSheetRowsMock.mockResolvedValue([
        ['Company', 'Email'],
        ['Acme', 'a@acme.com'],
      ])

      const res = await POST(req('test-key'))
      const body = await res.json()

      expect(body.results).toHaveLength(1) // only the global source ran
      expect(body.results[0].source).toBe('global')
    })
  })
})
