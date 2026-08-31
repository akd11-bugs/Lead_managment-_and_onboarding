'use client'

import { useEffect, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Loader2, LogOut, Search, ArrowLeft, CheckCircle2 } from 'lucide-react'
import { STAGES, STAGE_LABELS, type Stage } from '@/lib/types'

interface LeadSummary {
  id: string
  company: string
  poc: string | null
  stage: string
}

interface LeadDetail extends LeadSummary {
  email: string
  phone: string | null
  notes: string
  activities: { id: string; type: string; description: string; authorName: string; date: string }[]
}

export function RepForm() {
  const [loggedIn, setLoggedIn] = useState(false)
  const [email, setEmail] = useState('')
  const [pin, setPin] = useState('')
  const [loginError, setLoginError] = useState<string | null>(null)
  const [loggingIn, setLoggingIn] = useState(false)

  const [query, setQuery] = useState('')
  const [results, setResults] = useState<LeadSummary[]>([])
  const [searching, setSearching] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const [selected, setSelected] = useState<LeadDetail | null>(null)
  const [loadingLead, setLoadingLead] = useState(false)
  const [stage, setStage] = useState<Stage | ''>('')
  const [remark, setRemark] = useState('')
  const [savingStage, setSavingStage] = useState(false)
  const [savingRemark, setSavingRemark] = useState(false)
  const [savedMessage, setSavedMessage] = useState<string | null>(null)

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    if (query.trim().length < 2) {
      return
    }
    debounceRef.current = setTimeout(async () => {
      setSearching(true)
      try {
        const res = await fetch(`/api/rep/leads/search?q=${encodeURIComponent(query.trim())}`)
        if (res.status === 401) {
          setLoggedIn(false)
          return
        }
        const data = await res.json()
        setResults(data.leads ?? [])
      } finally {
        setSearching(false)
      }
    }, 300)
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [query])

  async function handleLogin() {
    setLoggingIn(true)
    setLoginError(null)
    try {
      const res = await fetch('/api/rep/login', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ email, pin }),
      })
      const data = await res.json()
      if (!res.ok) {
        setLoginError(data.error ?? 'Login failed')
        return
      }
      setLoggedIn(true)
      setPin('')
    } finally {
      setLoggingIn(false)
    }
  }

  async function handleLogout() {
    await fetch('/api/rep/logout', { method: 'POST' })
    setLoggedIn(false)
    setSelected(null)
    setResults([])
    setQuery('')
  }

  async function selectLead(id: string) {
    setLoadingLead(true)
    setSavedMessage(null)
    try {
      const res = await fetch(`/api/rep/leads/${id}`)
      if (res.status === 401) {
        setLoggedIn(false)
        return
      }
      const data = await res.json()
      setSelected(data.lead)
      setStage(data.lead.stage)
      setRemark('')
    } finally {
      setLoadingLead(false)
    }
  }

  async function saveStage() {
    if (!selected || !stage || stage === selected.stage) return
    setSavingStage(true)
    setSavedMessage(null)
    try {
      const res = await fetch(`/api/rep/leads/${selected.id}`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ stage }),
      })
      const data = await res.json()
      if (res.ok) {
        setSelected(data.lead)
        setSavedMessage('Stage updated')
      }
    } finally {
      setSavingStage(false)
    }
  }

  async function submitRemark() {
    if (!selected || !remark.trim()) return
    setSavingRemark(true)
    setSavedMessage(null)
    try {
      const res = await fetch('/api/rep/activities', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ leadId: selected.id, type: 'note', description: remark.trim() }),
      })
      if (res.ok) {
        setRemark('')
        setSavedMessage('Remark added')
        selectLead(selected.id)
      }
    } finally {
      setSavingRemark(false)
    }
  }

  if (!loggedIn) {
    return (
      <div className="space-y-4">
        <div>
          <h1 className="text-xl font-semibold">Update your leads</h1>
          <p className="text-sm text-muted-foreground">Enter your email and PIN to continue.</p>
        </div>
        <div className="space-y-3">
          <div className="space-y-1">
            <Label className="text-xs">Email</Label>
            <Input value={email} onChange={(e) => setEmail(e.target.value)} type="email" autoComplete="email" />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">PIN</Label>
            <Input
              value={pin}
              onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 6))}
              inputMode="numeric"
              maxLength={6}
              className="tracking-widest"
            />
          </div>
          {loginError && <p className="text-xs text-rose-600">{loginError}</p>}
          <Button className="w-full" onClick={handleLogin} disabled={loggingIn || !email || pin.length !== 6}>
            {loggingIn && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            Continue
          </Button>
        </div>
      </div>
    )
  }

  if (selected) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Button variant="ghost" size="sm" onClick={() => setSelected(null)}>
            <ArrowLeft className="h-3.5 w-3.5" />
            Back
          </Button>
          <Button variant="ghost" size="sm" onClick={handleLogout}>
            <LogOut className="h-3.5 w-3.5" />
          </Button>
        </div>

        <div>
          <h2 className="text-lg font-semibold">{selected.company}</h2>
          <p className="text-sm text-muted-foreground">{selected.poc || '—'} · {selected.email}</p>
          {selected.phone && <p className="text-sm text-muted-foreground">{selected.phone}</p>}
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs">Stage</Label>
          <div className="flex gap-2">
            <Select value={stage} onValueChange={(v) => setStage(v as Stage)}>
              <SelectTrigger className="h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {STAGES.map((s) => (
                  <SelectItem key={s} value={s}>
                    {STAGE_LABELS[s]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button onClick={saveStage} disabled={savingStage || stage === selected.stage}>
              {savingStage ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : 'Save'}
            </Button>
          </div>
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs">Add a remark</Label>
          <Textarea value={remark} onChange={(e) => setRemark(e.target.value)} placeholder="What happened on the call?" rows={3} />
          <Button size="sm" onClick={submitRemark} disabled={savingRemark || !remark.trim()}>
            {savingRemark && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            Add remark
          </Button>
        </div>

        {savedMessage && (
          <div className="flex items-center gap-1.5 text-xs text-emerald-600">
            <CheckCircle2 className="h-3.5 w-3.5" /> {savedMessage}
          </div>
        )}

        {selected.activities.length > 0 && (
          <div className="space-y-1.5">
            <Label className="text-xs">Recent activity</Label>
            <div className="space-y-1.5 max-h-52 overflow-y-auto">
              {selected.activities.map((a) => (
                <div key={a.id} className="rounded-md border px-2.5 py-1.5 text-xs">
                  <p>{a.description}</p>
                  <p className="text-muted-foreground">{a.authorName} · {new Date(a.date).toLocaleString()}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {loadingLead && <Loader2 className="h-4 w-4 animate-spin mx-auto" />}
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold">Find a lead</h1>
        <Button variant="ghost" size="sm" onClick={handleLogout}>
          <LogOut className="h-3.5 w-3.5" />
        </Button>
      </div>
      <div className="relative">
        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          className="pl-8"
          placeholder="Search by company, contact, or email"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>
      {searching && <Loader2 className="h-4 w-4 animate-spin mx-auto" />}
      <div className="space-y-1.5">
        {(query.trim().length < 2 ? [] : results).map((lead) => (
          <button
            key={lead.id}
            className="w-full text-left rounded-md border px-3 py-2 text-sm hover:bg-muted/50"
            onClick={() => selectLead(lead.id)}
          >
            <p className="font-medium">{lead.company}</p>
            <p className="text-xs text-muted-foreground">
              {lead.poc || '—'} · <Badge variant="outline" className="text-[10px]">{STAGE_LABELS[lead.stage as Stage] ?? lead.stage}</Badge>
            </p>
          </button>
        ))}
        {query.trim().length >= 2 && !searching && results.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-4">No matching leads.</p>
        )}
      </div>
    </div>
  )
}
