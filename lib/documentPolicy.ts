// Validation rules for onboarding-document METADATA.
//
// Extracted from the route so the no-bytes-on-the-server guarantee is
// directly testable. The whole point of the browser vault is that we never
// receive these files; a regression here would quietly turn the product's
// central privacy claim into a lie, so it gets tests rather than trust.

export const DOCUMENT_KINDS = ['pan', 'gst', 'incorporation', 'bank', 'other'] as const
export const DOCUMENT_STATUSES = ['held', 'verified', 'rejected', 'missing'] as const

export type DocumentKind = (typeof DOCUMENT_KINDS)[number]
export type DocumentStatus = (typeof DOCUMENT_STATUSES)[number]

// Field names that would carry file content. Any of these present means a
// caller is trying to upload bytes, which this system must never accept.
export const CONTENT_FIELDS = ['content', 'data', 'base64', 'blob', 'file', 'bytes', 'dataUrl'] as const

const SHA256_RE = /^[a-f0-9]{64}$/

export type PolicyFailure = { ok: false; error: string }
export type PolicySuccess = {
  ok: true
  value: {
    kind: DocumentKind
    localKey: string
    fileName: string
    mimeType: string
    sha256: string
    byteSize: number
    status: DocumentStatus
    label: string
  }
}

/** True if the payload carries anything that looks like file content. */
export function carriesContent(body: Record<string, unknown>): boolean {
  return CONTENT_FIELDS.some(f => body[f] !== undefined)
}

export function validateDocumentMetadata(body: Record<string, unknown>): PolicyFailure | PolicySuccess {
  if (carriesContent(body)) {
    return {
      ok: false,
      error:
        'This endpoint stores metadata only. Document content must stay in the browser vault and must not be transmitted.',
    }
  }

  const kind = String(body.kind ?? '').trim()
  if (!(DOCUMENT_KINDS as readonly string[]).includes(kind)) {
    return { ok: false, error: `kind must be one of: ${DOCUMENT_KINDS.join(', ')}` }
  }

  const localKey = String(body.localKey ?? '').trim()
  if (!localKey) return { ok: false, error: 'localKey is required' }

  const fileName = String(body.fileName ?? '').trim()
  if (!fileName) return { ok: false, error: 'fileName is required' }

  const sha256 = String(body.sha256 ?? '').trim().toLowerCase()
  if (!SHA256_RE.test(sha256)) {
    return { ok: false, error: 'sha256 must be a 64-character hex digest' }
  }

  const byteSize = Number(body.byteSize)
  if (!Number.isInteger(byteSize) || byteSize < 0) {
    return { ok: false, error: 'byteSize must be a non-negative integer' }
  }

  const rawStatus = String(body.status ?? '')
  const status = (DOCUMENT_STATUSES as readonly string[]).includes(rawStatus)
    ? (rawStatus as DocumentStatus)
    : 'held'

  return {
    ok: true,
    value: {
      kind: kind as DocumentKind,
      localKey,
      fileName: fileName.slice(0, 255),
      mimeType: String(body.mimeType ?? 'application/octet-stream').slice(0, 120),
      sha256,
      byteSize,
      status,
      label: String(body.label ?? fileName).slice(0, 200),
    },
  }
}
