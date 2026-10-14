'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Copy, Check, KeyRound } from 'lucide-react'

export function ReportsApiKeyCard() {
  const [loading, setLoading] = useState(true)
  const [key, setKey] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    fetch('/api/settings/reports-api-key')
      .then((res) => res.json())
      .then((data) => setKey(data.reportsApiKey ?? null))
      .finally(() => setLoading(false))
  }, [])

  async function generate() {
    if (key && !confirm('Generating a new key immediately invalidates the current one. Continue?')) return
    setSaving(true)
    try {
      const res = await fetch('/api/settings/reports-api-key', { method: 'POST' })
      const data = await res.json()
      setKey(data.reportsApiKey)
    } finally {
      setSaving(false)
    }
  }

  async function revoke() {
    if (!confirm('Revoke this key? Any integration using it will stop working immediately.')) return
    setSaving(true)
    try {
      await fetch('/api/settings/reports-api-key', { method: 'DELETE' })
      setKey(null)
    } finally {
      setSaving(false)
    }
  }

  async function copy() {
    if (!key) return
    await navigator.clipboard.writeText(key)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Reports API key</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-xs text-muted-foreground">
          Lets an external dashboard pull your own report numbers via <code className="rounded bg-muted px-1">GET /api/external/reports</code>,
          authenticated with <code className="rounded bg-muted px-1">Authorization: Bearer &lt;key&gt;</code>. This key only ever
          unlocks your own organization&apos;s data — never anyone else&apos;s.
        </p>

        {!loading && key && (
          <div className="flex items-center gap-2 rounded-md border px-3 py-2">
            <KeyRound className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
            <code className="flex-1 truncate text-xs">{key}</code>
            <button type="button" onClick={copy} className="text-muted-foreground hover:text-foreground" aria-label="Copy key">
              {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
            </button>
          </div>
        )}

        <div className="flex gap-2">
          <Button size="sm" onClick={generate} disabled={saving}>
            {key ? 'Regenerate' : 'Generate key'}
          </Button>
          {key && (
            <Button size="sm" variant="outline" onClick={revoke} disabled={saving}>
              Revoke
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
