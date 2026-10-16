'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Check, Copy, KeyRound, Loader2 } from 'lucide-react'
import { McpQuickStart } from './McpQuickStart'

export function AgentApiKeyCard() {
  const [loading, setLoading] = useState(true)
  const [key, setKey] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [copied, setCopied] = useState<'key' | 'config' | null>(null)

  // Read lazily from the browser so the snippet shows whatever host this
  // workspace is actually served from — a hardcoded production URL would be
  // wrong for self-hosted and white-label deployments. useState's initialiser
  // runs once on mount rather than every render, and this component is
  // client-only, so there's no SSR/hydration mismatch to guard against.
  const [origin] = useState(() => (typeof window === 'undefined' ? '' : window.location.origin))

  function copy(text: string, which: 'key' | 'config') {
    navigator.clipboard.writeText(text)
    setCopied(which)
    setTimeout(() => setCopied(null), 1500)
  }

  const mcpUrl = `${origin}/api/agent/mcp`

  useEffect(() => {
    fetch('/api/settings/agent-api-key')
      .then((res) => res.json())
      .then((data) => setKey(data.agentApiKey ?? null))
      .finally(() => setLoading(false))
  }, [])

  async function handleGenerate() {
    if (key && !confirm('Generate a new key? The current one will stop working immediately.')) return
    setBusy(true)
    try {
      const res = await fetch('/api/settings/agent-api-key', { method: 'POST' })
      const data = await res.json()
      setKey(data.agentApiKey)
    } finally {
      setBusy(false)
    }
  }

  async function handleRevoke() {
    if (!confirm('Revoke this key? Anything calling the agent API with it will stop working immediately.')) return
    setBusy(true)
    try {
      await fetch('/api/settings/agent-api-key', { method: 'DELETE' })
      setKey(null)
    } finally {
      setBusy(false)
    }
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">MCP agent access</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-xs text-muted-foreground">
          Connect Claude (or any MCP-compatible assistant) to this workspace so it can search your leads, log calls and
          emails, and move deals through the pipeline — following the same rules and workflow automations as when a
          person does it by hand. Every change it makes is attributed to &quot;AI Agent&quot; in the lead timeline.
        </p>
        <p className="text-xs text-muted-foreground">
          The same key also works for scripts calling <code>/api/agent/v1/*</code> directly. It can write, not just
          read — treat it like a password.
        </p>

        {!loading && key && (
          <div className="space-y-3">
            <div className="space-y-1">
              <div className="text-xs font-medium">Your key</div>
              <div className="flex items-center gap-2 rounded-md border px-3 py-2">
                <KeyRound className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                <code className="flex-1 truncate text-xs">{key}</code>
                <button
                  type="button"
                  onClick={() => copy(key, 'key')}
                  className="text-muted-foreground hover:text-foreground"
                  aria-label="Copy agent API key"
                >
                  {copied === 'key' ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
                </button>
              </div>
            </div>

            <div className="space-y-1">
              <div className="text-xs font-medium">MCP endpoint</div>
              <div className="flex items-center gap-2 rounded-md border px-3 py-2">
                <code className="flex-1 truncate text-xs">{mcpUrl}</code>
                <button
                  type="button"
                  onClick={() => copy(mcpUrl, 'config')}
                  className="text-muted-foreground hover:text-foreground"
                  aria-label="Copy MCP endpoint URL"
                >
                  {copied === 'config' ? (
                    <Check className="h-3.5 w-3.5 text-emerald-600" />
                  ) : (
                    <Copy className="h-3.5 w-3.5" />
                  )}
                </button>
              </div>
            </div>

            <McpQuickStart url={mcpUrl} apiKey={key} />
          </div>
        )}

        {!loading && !key && (
          <p className="text-xs text-muted-foreground">
            No key yet — generate one to connect an assistant to this workspace.
          </p>
        )}

        <div className="flex gap-2">
          <Button size="sm" variant="outline" disabled={busy} onClick={handleGenerate}>
            {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
            {key ? 'Regenerate' : 'Generate key'}
          </Button>
          {key && (
            <Button size="sm" variant="ghost" className="text-rose-600" disabled={busy} onClick={handleRevoke}>
              Revoke
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
