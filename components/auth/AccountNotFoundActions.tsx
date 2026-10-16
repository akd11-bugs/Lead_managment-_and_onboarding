'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Loader2, CheckCircle2 } from 'lucide-react'

interface MatchedOrg {
  id: string
  name: string
}

export function AccountNotFoundActions({ matchedOrg, suggestedName }: { matchedOrg: MatchedOrg | null; suggestedName: string }) {
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [requestSent, setRequestSent] = useState(false)
  const [showCreateForm, setShowCreateForm] = useState(!matchedOrg)
  const [name, setName] = useState(suggestedName)
  const [companyName, setCompanyName] = useState('')

  async function requestToJoin() {
    if (!matchedOrg) return
    setBusy(true)
    setError(null)
    try {
      const res = await fetch('/api/join-requests', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ orgId: matchedOrg.id, name }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error ?? 'Could not send request')
        return
      }
      setRequestSent(true)
    } finally {
      setBusy(false)
    }
  }

  async function createOrg() {
    if (!companyName.trim()) return
    setBusy(true)
    setError(null)
    try {
      const res = await fetch('/api/account-not-found/create-org', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ companyName: companyName.trim() }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error ?? 'Could not create your organization')
        return
      }
      router.push('/')
      router.refresh()
    } finally {
      setBusy(false)
    }
  }

  if (requestSent) {
    return (
      <div className="flex items-center gap-2 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2.5 text-sm text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-300">
        <CheckCircle2 className="h-4 w-4 shrink-0" />
        Request sent — {matchedOrg?.name}&apos;s admin will get an email, and you&apos;ll get one back once they approve it.
      </div>
    )
  }

  if (matchedOrg && !showCreateForm) {
    return (
      <div className="space-y-3">
        <p className="text-sm">
          <span className="font-medium">{matchedOrg.name}</span> is already on Steadfast — want to request to join them?
        </p>
        <div className="space-y-1.5">
          <Label htmlFor="requesterName">Your name</Label>
          <Input id="requesterName" value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        {error && <p className="text-sm text-destructive">{error}</p>}
        <div className="flex items-center justify-between gap-2">
          <Button size="sm" onClick={requestToJoin} disabled={busy || !name.trim()}>
            {busy && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            Request to join
          </Button>
          <button type="button" className="text-xs text-muted-foreground hover:underline" onClick={() => setShowCreateForm(true)}>
            Not your company? Create a new one instead
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <p className="text-sm font-medium">Create your own company</p>
      <div className="space-y-1.5">
        <Label htmlFor="companyName">Company name</Label>
        <Input id="companyName" value={companyName} onChange={(e) => setCompanyName(e.target.value)} placeholder="Acme Inc" autoFocus />
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
      <div className="flex items-center justify-between gap-2">
        <Button size="sm" onClick={createOrg} disabled={busy || !companyName.trim()}>
          {busy && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
          Create company
        </Button>
        {matchedOrg && (
          <button type="button" className="text-xs text-muted-foreground hover:underline" onClick={() => setShowCreateForm(false)}>
            Back to requesting to join {matchedOrg.name}
          </button>
        )}
      </div>
    </div>
  )
}
