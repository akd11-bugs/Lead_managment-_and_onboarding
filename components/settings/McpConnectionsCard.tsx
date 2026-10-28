'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { CheckCircle2, AlertCircle, Loader2, Plug, RefreshCw, Trash2 } from 'lucide-react'

interface Connection {
  id: string
  name: string
  serverUrl: string
  enabled: boolean
  lastToolCount: number | null
  lastCheckedAt: string | null
  lastError: string | null
  configuredAt: string
}

// Bring-your-own MCP server (e.g. treg.to) — connect once here, and every
// rep's existing Claude session (already pointed at Steadfast's own MCP
// endpoint, see AgentApiKeyCard) gets that server's tools merged in
// automatically. No second sign-in, no separate billing relationship for
// the rep to manage personally — the admin owns the one credential.
export function McpConnectionsCard() {
  const [connections, setConnections] = useState<Connection[] | null>(null)
  const [form, setForm] = useState({ name: '', serverUrl: '', token: '' })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [checkingId, setCheckingId] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/settings/mcp-connections')
      .then((r) => r.json())
      .then((d) => setConnections(d.connections ?? []))
  }, [])

  async function connect() {
    if (!form.name.trim() || !form.serverUrl.trim()) return
    setSaving(true)
    setError(null)
    try {
      const res = await fetch('/api/settings/mcp-connections', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(form),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error ?? 'Failed to connect')
        return
      }
      setConnections((prev) => [...(prev ?? []), data.connection])
      setForm({ name: '', serverUrl: '', token: '' })
    } finally {
      setSaving(false)
    }
  }

  async function toggle(id: string, enabled: boolean) {
    setConnections((prev) => prev?.map((c) => (c.id === id ? { ...c, enabled } : c)) ?? null)
    await fetch(`/api/settings/mcp-connections/${id}`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ enabled }),
    })
  }

  async function recheck(id: string) {
    setCheckingId(id)
    try {
      const res = await fetch(`/api/settings/mcp-connections/${id}?action=check`, { method: 'PATCH' })
      const data = await res.json()
      if (data.connection) {
        setConnections((prev) => prev?.map((c) => (c.id === id ? data.connection : c)) ?? null)
      }
    } finally {
      setCheckingId(null)
    }
  }

  async function remove(id: string) {
    if (!confirm('Disconnect this server? Its tools stop appearing in Claude immediately.')) return
    await fetch(`/api/settings/mcp-connections/${id}`, { method: 'DELETE' })
    setConnections((prev) => prev?.filter((c) => c.id !== id) ?? null)
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <Plug className="h-4 w-4" />
          Connected MCP servers
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-xs text-muted-foreground">
          Connect a third-party MCP server (treg.to, or any other) once here — its tools show up automatically in
          every rep&apos;s existing Claude session, right alongside Steadfast&apos;s own. Each connection exposes
          all of that server&apos;s tools; nothing is picked individually yet.
        </p>

        {connections === null && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}

        {connections?.map((c) => (
          <div key={c.id} className="space-y-1.5 rounded-md border px-3 py-2">
            <div className="flex items-center gap-2">
              {c.lastError ? (
                <AlertCircle className="h-3.5 w-3.5 shrink-0 text-destructive" />
              ) : (
                <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-emerald-600" />
              )}
              <span className="text-sm font-medium flex-1 truncate">{c.name}</span>
              <span className="text-xs text-muted-foreground shrink-0">
                {c.lastError ? 'Connection error' : `${c.lastToolCount ?? 0} tools`}
              </span>
              <button
                type="button"
                role="switch"
                aria-checked={c.enabled}
                onClick={() => toggle(c.id, !c.enabled)}
                className={`h-5 w-9 shrink-0 rounded-full transition-colors ${c.enabled ? 'bg-primary' : 'bg-muted'}`}
              >
                <span
                  className={`block h-4 w-4 rounded-full bg-background shadow transition-transform ${c.enabled ? 'translate-x-4' : 'translate-x-0.5'}`}
                />
              </button>
              <Button size="icon" variant="ghost" className="h-7 w-7 shrink-0" onClick={() => recheck(c.id)} disabled={checkingId === c.id}>
                <RefreshCw className={`h-3.5 w-3.5 ${checkingId === c.id ? 'animate-spin' : ''}`} />
              </Button>
              <Button size="icon" variant="ghost" className="h-7 w-7 shrink-0 text-rose-600 hover:text-rose-700" onClick={() => remove(c.id)}>
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
            <code className="block truncate text-xs text-muted-foreground">{c.serverUrl}</code>
            {c.lastError && <p className="text-xs text-destructive">{c.lastError}</p>}
          </div>
        ))}

        <div className="space-y-2 rounded-md border border-dashed p-3">
          <div className="grid gap-2 sm:grid-cols-2">
            <div className="space-y-1">
              <Label className="text-xs">Name</Label>
              <Input className="h-8" placeholder="treg" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Server URL</Label>
              <Input
                className="h-8"
                placeholder="https://treg.to/mcp/"
                value={form.serverUrl}
                onChange={(e) => setForm({ ...form, serverUrl: e.target.value })}
              />
            </div>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">API key / token (optional)</Label>
            <Input
              className="h-8"
              type="password"
              placeholder="leave blank if the server needs none"
              value={form.token}
              onChange={(e) => setForm({ ...form, token: e.target.value })}
            />
          </div>
          <Button size="sm" onClick={connect} disabled={saving || !form.name.trim() || !form.serverUrl.trim()}>
            {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plug className="h-3.5 w-3.5" />}
            Connect
          </Button>
          {error && <p className="text-xs text-rose-600">{error}</p>}
        </div>
      </CardContent>
    </Card>
  )
}
