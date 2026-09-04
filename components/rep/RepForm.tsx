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
import {
  BOARD_COLUMNS,
  BOARD_COLUMN_LABELS,
  boardColumnFor,
  boardColumnToInput,
  SOURCE_LABELS,
  LEAD_TYPE_LABELS,
  QUALITY_LABELS,
  BUSINESS_TYPE_LABELS,
  type BoardColumnKey,
  type PendingSubStatus,
  type LeadSource,
  type LeadType,
  type QualityLevel,
  type BusinessType,
  type OnboardingSubStage,
  type Stage,
} from '@/lib/types'
import { PipelineProgressBar } from '@/components/leads/PipelineProgressBar'

interface LeadSummary {
  id: string
  company: string
  poc: string | null
  stage: string
  pendingSubStatus: PendingSubStatus | null
}

interface LeadDetail extends LeadSummary {
  email: string
  phone: string | null
  website: string | null
  industry: string | null
  businessType: BusinessType | null
  source: LeadSource
  type: LeadType
  quality: QualityLevel
  effort: string
  estimatedVolume: number
  ownerName: string
  expectedCloseDate: string | null
  painPoints: string
  whatTheyWant: string
  notes: string
  createdAt: string
  onboardingSubStage: OnboardingSubStage | null
  assignedOpsName: string | null
  activities: { id: string; type: string; description: string; authorName: string; date: string }[]
}

interface OperationsUser {
  id: string
  name: string
}

function formatCurrency(n: number) {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n)
}

export function RepForm() {
  const [loggedIn, setLoggedIn] = useState(false)
  const [name, setName] = useState('')
  const [pin, setPin] = useState('')
  const [loginError, setLoginError] = useState<string | null>(null)
  const [loggingIn, setLoggingIn] = useState(false)

  const [query, setQuery] = useState('')
  const [results, setResults] = useState<LeadSummary[]>([])
  const [isFresh, setIsFresh] = useState(true)
  const [searching, setSearching] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const [selected, setSelected] = useState<LeadDetail | null>(null)
  const [loadingLead, setLoadingLead] = useState(false)
  const [column, setColumn] = useState<BoardColumnKey | ''>('')
  const [stageRemark, setStageRemark] = useState('')
  const [stageError, setStageError] = useState<string | null>(null)
  const [operationsUsers, setOperationsUsers] = useState<OperationsUser[]>([])
  const [assignedOpsId, setAssignedOpsId] = useState('')
  const [remark, setRemark] = useState('')
  const [savingStage, setSavingStage] = useState(false)
  const [savingRemark, setSavingRemark] = useState(false)
  const [savedMessage, setSavedMessage] = useState<string | null>(null)

  async function runSearch(q: string) {
    setSearching(true)
    try {
      const res = await fetch(`/api/rep/leads/search?q=${encodeURIComponent(q)}`)
      if (res.status === 401) {
        setLoggedIn(false)
        return
      }
      const data = await res.json()
      setResults(data.leads ?? [])
      setIsFresh(data.isFresh ?? false)
    } finally {
      setSearching(false)
    }
  }

  // Runs on login (loads the default "fresh leads" browse list) and on every
  // query change — an empty query re-fetches that same fresh-leads list.
  useEffect(() => {
    if (!loggedIn) return
    if (debounceRef.current) clearTimeout(debounceRef.current)
    const q = query.trim()
    debounceRef.current = setTimeout(() => runSearch(q), q.length < 2 ? 0 : 300)
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [loggedIn, query])

  async function handleLogin() {
    setLoggingIn(true)
    setLoginError(null)
    try {
      const res = await fetch('/api/rep/login', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ name, pin }),
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
    setIsFresh(true)
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
      setColumn(boardColumnFor(data.lead))
      setStageRemark('')
      setStageError(null)
      setRemark('')
      setAssignedOpsId('')
    } finally {
      setLoadingLead(false)
    }
  }

  // Load the operations team as soon as the rep picks "Onboarding" as the
  // target column — the picker below needs it before they can confirm.
  useEffect(() => {
    if (column !== 'onboarding') return
    fetch('/api/rep/operations')
      .then((r) => r.json())
      .then((data) => setOperationsUsers(data.operationsUsers ?? []))
  }, [column])

  async function saveStage() {
    if (!selected || !column) return
    const currentColumn = boardColumnFor(selected)
    if (column === currentColumn) return
    if (!stageRemark.trim()) {
      setStageError('A remark is required')
      return
    }
    const movingToOnboarding = column === 'onboarding'
    if (movingToOnboarding && !assignedOpsId) {
      setStageError('Choose who from operations will handle this lead')
      return
    }
    setSavingStage(true)
    setSavedMessage(null)
    setStageError(null)
    try {
      const res = await fetch(`/api/rep/leads/${selected.id}`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          ...boardColumnToInput(column),
          remark: stageRemark.trim(),
          ...(movingToOnboarding && { assignedOpsId }),
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        setStageError(data.error ?? 'Failed to save')
        return
      }
      setAssignedOpsId('')
      await selectLead(selected.id)
      setSavedMessage('Updated')
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
        await selectLead(selected.id)
        setSavedMessage('Remark added')
      }
    } finally {
      setSavingRemark(false)
    }
  }

  if (!loggedIn) {
    return (
      <div className="mx-auto max-w-md space-y-4">
        <div>
          <h1 className="text-xl font-semibold">Update your leads</h1>
          <p className="text-sm text-muted-foreground">Enter your name and PIN to continue.</p>
        </div>
        <div className="space-y-3">
          <div className="space-y-1">
            <Label className="text-xs">Name</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} type="text" autoComplete="name" />
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
          <Button className="w-full" onClick={handleLogin} disabled={loggingIn || !name || pin.length !== 6}>
            {loggingIn && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            Continue
          </Button>
        </div>
      </div>
    )
  }

  if (selected) {
    const currentColumn = boardColumnFor(selected)
    return (
      <div className="mx-auto max-w-2xl space-y-4">
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
          {selected.website && (
            <a href={selected.website} target="_blank" rel="noreferrer" className="text-sm text-primary underline underline-offset-2">
              {selected.website}
            </a>
          )}
        </div>

        <div className="rounded-md border p-3">
          <PipelineProgressBar
            stage={selected.stage as Stage}
            onboardingSubStage={selected.onboardingSubStage}
            assignedOpsName={selected.assignedOpsName}
          />
        </div>

        <div className="grid grid-cols-2 gap-x-3 gap-y-2 rounded-md border p-3 text-sm">
          <div>
            <p className="text-[11px] text-muted-foreground">Industry</p>
            <p>{selected.industry || '—'}</p>
          </div>
          <div>
            <p className="text-[11px] text-muted-foreground">Business type</p>
            <p>{selected.businessType ? BUSINESS_TYPE_LABELS[selected.businessType] : '—'}</p>
          </div>
          <div>
            <p className="text-[11px] text-muted-foreground">Source</p>
            <p>{SOURCE_LABELS[selected.source]}</p>
          </div>
          <div>
            <p className="text-[11px] text-muted-foreground">Type</p>
            <p>{LEAD_TYPE_LABELS[selected.type]}</p>
          </div>
          <div>
            <p className="text-[11px] text-muted-foreground">Quality</p>
            <p>{QUALITY_LABELS[selected.quality]}</p>
          </div>
          <div>
            <p className="text-[11px] text-muted-foreground">Effort</p>
            <p className="capitalize">{selected.effort}</p>
          </div>
          <div>
            <p className="text-[11px] text-muted-foreground">Est. volume</p>
            <p>{formatCurrency(selected.estimatedVolume)}</p>
          </div>
          <div>
            <p className="text-[11px] text-muted-foreground">Owner</p>
            <p>{selected.ownerName}</p>
          </div>
          <div>
            <p className="text-[11px] text-muted-foreground">Expected close</p>
            <p>{selected.expectedCloseDate ? new Date(selected.expectedCloseDate).toLocaleDateString() : '—'}</p>
          </div>
          <div>
            <p className="text-[11px] text-muted-foreground">Created</p>
            <p>{new Date(selected.createdAt).toLocaleDateString()}</p>
          </div>
        </div>

        {(selected.painPoints || selected.whatTheyWant) && (
          <div className="space-y-2">
            {selected.painPoints && (
              <div>
                <p className="text-[11px] text-muted-foreground">Pain points</p>
                <p className="text-sm whitespace-pre-wrap">{selected.painPoints}</p>
              </div>
            )}
            {selected.whatTheyWant && (
              <div>
                <p className="text-[11px] text-muted-foreground">What they want</p>
                <p className="text-sm whitespace-pre-wrap">{selected.whatTheyWant}</p>
              </div>
            )}
          </div>
        )}

        {selected.notes && (
          <div>
            <p className="text-[11px] text-muted-foreground">Notes</p>
            <p className="text-sm whitespace-pre-wrap">{selected.notes}</p>
          </div>
        )}

        <div className="space-y-1.5">
          <Label className="text-xs">Stage</Label>
          <Select value={column} onValueChange={(v) => setColumn(v as BoardColumnKey)}>
            <SelectTrigger className="h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {BOARD_COLUMNS.map((c) => (
                <SelectItem key={c} value={c}>
                  {BOARD_COLUMN_LABELS[c]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {column !== currentColumn && (
          <div className="space-y-1.5 rounded-md border border-amber-200 bg-amber-50 p-3">
            {column === 'onboarding' && (
              <div className="space-y-1.5">
                <Label className="text-xs">Assign to operations</Label>
                <Select value={assignedOpsId} onValueChange={setAssignedOpsId}>
                  <SelectTrigger className="h-9 bg-white">
                    <SelectValue placeholder="Choose who handles onboarding" />
                  </SelectTrigger>
                  <SelectContent>
                    {operationsUsers.map((u) => (
                      <SelectItem key={u.id} value={u.id}>
                        {u.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {operationsUsers.length === 0 && (
                  <p className="text-xs text-muted-foreground">No active operations users yet.</p>
                )}
              </div>
            )}
            <Label className="text-xs">
              {column === 'not_interested' ? 'Reason for marking Not Interested' : 'What happened?'}
            </Label>
            <Textarea
              value={stageRemark}
              onChange={(e) => setStageRemark(e.target.value)}
              placeholder="A remark is required to save this change"
              rows={3}
            />
            {stageError && <p className="text-xs text-rose-600">{stageError}</p>}
            <Button
              size="sm"
              onClick={saveStage}
              disabled={savingStage || !stageRemark.trim() || (column === 'onboarding' && !assignedOpsId)}
            >
              {savingStage && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              Save change
            </Button>
          </div>
        )}

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
    <div className="mx-auto max-w-4xl space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold">Find a lead</h1>
        <Button variant="ghost" size="sm" onClick={handleLogout}>
          <LogOut className="h-3.5 w-3.5" />
        </Button>
      </div>
      <div className="relative max-w-md">
        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          className="pl-8"
          placeholder="Search by company, contact, or email"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>
      {isFresh && results.length > 0 && (
        <p className="text-xs text-muted-foreground">Your {results.length} newest leads — search above to find something else.</p>
      )}
      {searching && <Loader2 className="h-4 w-4 animate-spin mx-auto" />}
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {results.map((lead) => (
          <button
            key={lead.id}
            className="w-full text-left rounded-md border px-3 py-2 text-sm hover:bg-muted/50"
            onClick={() => selectLead(lead.id)}
          >
            <p className="font-medium">{lead.company}</p>
            <p className="text-xs text-muted-foreground">
              {lead.poc || '—'} · <Badge variant="outline" className="text-[10px]">{BOARD_COLUMN_LABELS[boardColumnFor(lead)]}</Badge>
            </p>
          </button>
        ))}
        {!isFresh && !searching && results.length === 0 && (
          <p className="col-span-full text-sm text-muted-foreground text-center py-4">No matching leads.</p>
        )}
        {isFresh && !searching && results.length === 0 && (
          <p className="col-span-full text-sm text-muted-foreground text-center py-4">No leads yet — search above once you have one.</p>
        )}
      </div>
    </div>
  )
}
