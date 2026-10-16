'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Upload, FileText, Eye, Trash2, AlertTriangle, Loader2, MonitorSmartphone } from 'lucide-react'
import {
  putDocument,
  hasDocument,
  openDocumentUrl,
  deleteDocument,
  type VaultMeta,
} from '@/lib/docVault'

// The browser-held document vault, surfaced per lead.
//
// The bytes live in this browser only (lib/docVault.ts); the server holds
// metadata alone. That is the whole privacy guarantee, so the two costs of it
// are stated in the UI at the moment of upload rather than hidden in docs:
//   1. documents are visible on THIS device only
//   2. clearing site data destroys them irrecoverably
// A row whose bytes are not in this browser renders as "held elsewhere" and
// deliberately offers no download, because there is nothing to download.

type DocRow = {
  id: string
  kind: string
  label: string
  fileName: string
  mimeType: string
  byteSize: number
  sha256: string
  status: string
  localKey: string
  holderLabel: string | null
  createdAt: string
}

const KINDS = [
  { value: 'pan', label: 'PAN card' },
  { value: 'gst', label: 'GST certificate' },
  { value: 'incorporation', label: 'Incorporation' },
  { value: 'bank', label: 'Bank proof' },
  { value: 'other', label: 'Other' },
]

function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`
  if (n < 1024 * 1024) return `${Math.round(n / 1024)} KB`
  return `${(n / (1024 * 1024)).toFixed(1)} MB`
}

export function DocumentVaultPanel({ leadId }: { leadId: string }) {
  const [rows, setRows] = useState<DocRow[]>([])
  const [heldHere, setHeldHere] = useState<Record<string, boolean>>({})
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [kind, setKind] = useState('pan')
  const fileRef = useRef<HTMLInputElement>(null)

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/leads/${leadId}/documents`)
      if (!res.ok) throw new Error('Could not load documents')
      const json = (await res.json()) as { documents: DocRow[] }
      setRows(json.documents)
      // Which of these does THIS browser actually hold?
      const held: Record<string, boolean> = {}
      for (const d of json.documents) held[d.id] = await hasDocument(d.localKey)
      setHeldHere(held)
      setError(null)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load documents')
    } finally {
      setLoading(false)
    }
  }, [leadId])

  useEffect(() => {
    // Deferred so the first state write belongs to the microtask, not the
    // effect body (react-hooks/set-state-in-effect).
    let cancelled = false
    void (async () => {
      if (!cancelled) await load()
    })()
    return () => {
      cancelled = true
    }
  }, [load])

  async function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setBusy(true)
    setError(null)
    try {
      // Bytes first, into this browser. Nothing is sent anywhere.
      const meta: VaultMeta = await putDocument(file, leadId)
      // Then metadata only. The route rejects any payload carrying content.
      const res = await fetch(`/api/leads/${leadId}/documents`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          kind,
          localKey: meta.localKey,
          fileName: meta.fileName,
          mimeType: meta.mimeType,
          byteSize: meta.byteSize,
          sha256: meta.sha256,
          holderLabel: navigator.platform || 'this browser',
        }),
      })
      if (!res.ok) {
        const j = await res.json().catch(() => ({}))
        throw new Error(j.error ?? 'Could not record the document')
      }
      setLoading(true)
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed')
    } finally {
      setBusy(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  async function onView(row: DocRow) {
    const url = await openDocumentUrl(row.localKey)
    if (!url) {
      setError('That document is not stored in this browser.')
      return
    }
    window.open(url, '_blank', 'noopener')
    // Give the new tab time to read the blob before releasing it.
    setTimeout(() => URL.revokeObjectURL(url), 60_000)
  }

  async function onForget(row: DocRow) {
    await deleteDocument(row.localKey)
    setHeldHere(h => ({ ...h, [row.id]: false }))
  }

  return (
    <div className="space-y-4">
      <div className="rounded-md border border-amber-500/30 bg-amber-500/[0.06] p-3">
        <p className="flex items-start gap-2 text-xs leading-relaxed text-muted-foreground">
          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-500" />
          <span>
            Documents stay in this browser and are never uploaded to our servers. That means they are visible on this
            device only, and clearing your browser data will delete them permanently. We store the file name, size and
            a checksum so the checklist still works.
          </span>
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <select
          value={kind}
          onChange={e => setKind(e.target.value)}
          className="h-9 rounded-md border bg-background px-3 text-sm"
          aria-label="Document type"
        >
          {KINDS.map(k => (
            <option key={k.value} value={k.value}>
              {k.label}
            </option>
          ))}
        </select>
        <input ref={fileRef} type="file" onChange={onPick} className="hidden" id="doc-upload" />
        <Button size="sm" disabled={busy} onClick={() => fileRef.current?.click()}>
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
          {busy ? 'Storing' : 'Add document'}
        </Button>
      </div>

      {error && <p className="text-sm text-rose-600">{error}</p>}

      {loading ? (
        <p className="text-sm text-muted-foreground">Loading documents…</p>
      ) : rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">No documents recorded for this lead yet.</p>
      ) : (
        <ul className="space-y-1.5">
          {rows.map(row => {
            const here = heldHere[row.id]
            return (
              <li key={row.id} className="flex items-center justify-between gap-3 rounded-md border px-3 py-2">
                <div className="flex min-w-0 items-center gap-2.5">
                  <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{row.label}</p>
                    <p className="text-xs text-muted-foreground">
                      {KINDS.find(k => k.value === row.kind)?.label ?? row.kind} · {formatBytes(row.byteSize)}
                      {!here && row.holderLabel ? ` · on ${row.holderLabel}` : ''}
                    </p>
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-1.5">
                  {here ? (
                    <>
                      <Badge variant="outline" className="text-[10px]">
                        on this device
                      </Badge>
                      <Button size="icon" variant="ghost" onClick={() => onView(row)} aria-label="View document">
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button size="icon" variant="ghost" onClick={() => onForget(row)} aria-label="Remove from this device">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </>
                  ) : (
                    <Badge variant="secondary" className="gap-1 text-[10px]">
                      <MonitorSmartphone className="h-3 w-3" />
                      held elsewhere
                    </Badge>
                  )}
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
