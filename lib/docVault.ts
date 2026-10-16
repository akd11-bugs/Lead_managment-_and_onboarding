// Browser-local document vault.
//
// THE CONTRACT: file bytes never leave the device. Onboarding documents here
// are government-issued identity papers; the product's guarantee is that the
// vendor cannot read them, cannot leak them, and cannot be compelled to
// produce them, because the vendor never receives them.
//
// Bytes -> IndexedDB (origin-scoped, survives reload, no quota prompt at the
// sizes involved). Metadata -> the server, via OnboardingDocument, which
// holds no content: filename, size, type, SHA-256, review status.
//
// Consequences the UI must be honest about:
//   - Clearing site data destroys the documents. Nothing can recover them.
//   - They are visible on THIS browser only. Another device sees metadata
//     with status "held elsewhere" and must re-collect to view.
// Both are stated at the point of upload, not buried in docs.

const DB_NAME = 'steadfast-doc-vault'
const DB_VERSION = 1
const STORE = 'documents'

export type VaultRecord = {
  localKey: string
  blob: Blob
  fileName: string
  mimeType: string
  byteSize: number
  sha256: string
  leadId: string
  storedAt: number
}

export type VaultMeta = Omit<VaultRecord, 'blob'>

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION)
    req.onupgradeneeded = () => {
      const db = req.result
      if (!db.objectStoreNames.contains(STORE)) {
        const os = db.createObjectStore(STORE, { keyPath: 'localKey' })
        os.createIndex('leadId', 'leadId', { unique: false })
      }
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error ?? new Error('IndexedDB open failed'))
  })
}

function tx<T>(mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  return openDb().then(
    db =>
      new Promise<T>((resolve, reject) => {
        const t = db.transaction(STORE, mode)
        const req = fn(t.objectStore(STORE))
        req.onsuccess = () => resolve(req.result)
        req.onerror = () => reject(req.error ?? new Error('IndexedDB request failed'))
        t.oncomplete = () => db.close()
      }),
  )
}

/** SHA-256 of the file, so a re-presented copy can be proven identical. */
export async function hashFile(file: Blob): Promise<string> {
  const buf = await file.arrayBuffer()
  const digest = await crypto.subtle.digest('SHA-256', buf)
  return Array.from(new Uint8Array(digest))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')
}

export async function putDocument(file: File, leadId: string): Promise<VaultMeta> {
  const sha256 = await hashFile(file)
  // Key is content- and lead-derived, so re-uploading the same file for the
  // same lead overwrites rather than duplicating.
  const localKey = `${leadId}:${sha256.slice(0, 32)}`
  const record: VaultRecord = {
    localKey,
    blob: file,
    fileName: file.name,
    mimeType: file.type || 'application/octet-stream',
    byteSize: file.size,
    sha256,
    leadId,
    storedAt: Date.now(),
  }
  await tx('readwrite', s => s.put(record))
  const { blob: _blob, ...meta } = record
  return meta
}

export async function getDocument(localKey: string): Promise<VaultRecord | undefined> {
  return tx<VaultRecord | undefined>('readonly', s => s.get(localKey))
}

/** True if THIS browser holds the bytes — drives "held here" vs "held elsewhere". */
export async function hasDocument(localKey: string): Promise<boolean> {
  const count = await tx<number>('readonly', s => s.count(localKey))
  return count > 0
}

export async function deleteDocument(localKey: string): Promise<void> {
  await tx('readwrite', s => s.delete(localKey))
}

/** Open a held document for viewing. Caller must revoke the returned URL. */
export async function openDocumentUrl(localKey: string): Promise<string | null> {
  const rec = await getDocument(localKey)
  return rec ? URL.createObjectURL(rec.blob) : null
}

/** Rough vault footprint, for the "documents on this device" settings view. */
export async function vaultUsage(): Promise<{ count: number; bytes: number }> {
  const all = await tx<VaultRecord[]>('readonly', s => s.getAll())
  return { count: all.length, bytes: all.reduce((n, r) => n + r.byteSize, 0) }
}
