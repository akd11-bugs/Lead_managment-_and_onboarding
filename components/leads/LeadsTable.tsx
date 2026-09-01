'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Search, Loader2 } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { SavedViewsMenu, type LeadViewFilters } from '@/components/leads/SavedViewsMenu'
import { formatCurrency, formatRelative, cn } from '@/lib/utils'
import {
  STAGES,
  STAGE_LABELS,
  SOURCES,
  SOURCE_LABELS,
  QUALITY_LABELS,
  QUALITY_RANK,
  type Lead,
  type Stage,
  type LeadSource,
  type QualityLevel,
} from '@/lib/types'

interface OwnerOption {
  id: string
  name: string
}

type SortKey = 'date' | 'quality' | 'stage'

const SORT_LABELS: Record<SortKey, string> = {
  date: 'Date (newest first)',
  quality: 'Quality (best first)',
  stage: 'Stage (pipeline order)',
}

const QUALITY_BADGE_CLASS: Record<QualityLevel, string> = {
  high: 'border-emerald-300 text-emerald-700 bg-emerald-50',
  medium: 'border-amber-300 text-amber-700 bg-amber-50',
  low: 'border-slate-300 text-slate-600 bg-slate-50',
}

export function LeadsTable({
  initialLeads,
  initialQuery,
  canReassign = false,
  ownerOptions = [],
}: {
  initialLeads: Lead[]
  initialQuery?: string
  canReassign?: boolean
  ownerOptions?: OwnerOption[]
}) {
  const router = useRouter()
  const [search, setSearch] = useState(initialQuery ?? '')
  const [stageFilter, setStageFilter] = useState<Stage | 'all'>('all')
  const [sourceFilter, setSourceFilter] = useState<LeadSource | 'all'>('all')
  const [sortKey, setSortKey] = useState<SortKey>('date')
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [bulkStage, setBulkStage] = useState<Stage | ''>('')
  const [bulkOwnerId, setBulkOwnerId] = useState('')
  const [bulkBusy, setBulkBusy] = useState(false)
  const [bulkMessage, setBulkMessage] = useState<string | null>(null)
  const [bulkRemarkOpen, setBulkRemarkOpen] = useState(false)
  const [bulkRemark, setBulkRemark] = useState('')

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    const rows = initialLeads.filter((l) => {
      if (stageFilter !== 'all' && l.stage !== stageFilter) return false
      if (sourceFilter !== 'all' && l.source !== sourceFilter) return false
      if (q && !(`${l.company} ${l.poc ?? ''} ${l.email} ${l.industry ?? ''}`.toLowerCase().includes(q))) return false
      return true
    })

    const sorted = [...rows]
    if (sortKey === 'date') {
      sorted.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    } else if (sortKey === 'quality') {
      sorted.sort((a, b) => QUALITY_RANK[b.quality] - QUALITY_RANK[a.quality])
    } else if (sortKey === 'stage') {
      sorted.sort((a, b) => STAGES.indexOf(a.stage) - STAGES.indexOf(b.stage))
    }
    return sorted
  }, [initialLeads, search, stageFilter, sourceFilter, sortKey])

  const allVisibleSelected = filtered.length > 0 && filtered.every((l) => selected.has(l.id))

  function toggleAllVisible() {
    setSelected((prev) => {
      if (allVisibleSelected) {
        const next = new Set(prev)
        for (const l of filtered) next.delete(l.id)
        return next
      }
      const next = new Set(prev)
      for (const l of filtered) next.add(l.id)
      return next
    })
  }

  function toggleOne(id: string) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  async function runBulkAction(action: 'stage' | 'reassign', remark?: string) {
    if (selected.size === 0) return
    setBulkBusy(true)
    setBulkMessage(null)
    try {
      const owner = ownerOptions.find((o) => o.id === bulkOwnerId)
      const res = await fetch('/api/leads/bulk', {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          leadIds: Array.from(selected),
          action,
          ...(action === 'stage' && { stage: bulkStage, remark }),
          ...(action === 'reassign' && { ownerId: owner?.id }),
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        setBulkMessage(data.error ?? 'Bulk update failed')
        return
      }
      setBulkMessage(
        data.skipped > 0
          ? `Updated ${data.updated} of ${data.requested} (${data.skipped} out of scope)`
          : `Updated ${data.updated} lead${data.updated === 1 ? '' : 's'}`
      )
      setSelected(new Set())
      router.refresh()
    } finally {
      setBulkBusy(false)
    }
  }

  async function confirmBulkStageChange() {
    const remark = bulkRemark.trim()
    if (!remark) return
    await runBulkAction('stage', remark)
    setBulkRemarkOpen(false)
    setBulkRemark('')
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[220px] max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by company, POC, email, industry…"
            className="pl-9 h-9"
          />
        </div>
        <Select value={stageFilter} onValueChange={(v) => setStageFilter(v as Stage | 'all')}>
          <SelectTrigger className="h-9 w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All stages</SelectItem>
            {STAGES.map((s) => (
              <SelectItem key={s} value={s}>
                {STAGE_LABELS[s]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={sourceFilter} onValueChange={(v) => setSourceFilter(v as LeadSource | 'all')}>
          <SelectTrigger className="h-9 w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All sources</SelectItem>
            {SOURCES.map((s) => (
              <SelectItem key={s} value={s}>
                {SOURCE_LABELS[s]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={sortKey} onValueChange={(v) => setSortKey(v as SortKey)}>
          <SelectTrigger className="h-9 w-52">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {(Object.keys(SORT_LABELS) as SortKey[]).map((k) => (
              <SelectItem key={k} value={k}>
                Sort: {SORT_LABELS[k]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <SavedViewsMenu
          filters={{ search, stageFilter, sourceFilter, sortKey }}
          onApply={(v: LeadViewFilters) => {
            setSearch(v.search)
            setStageFilter((STAGES as string[]).includes(v.stageFilter) ? (v.stageFilter as Stage) : 'all')
            setSourceFilter((SOURCES as string[]).includes(v.sourceFilter) ? (v.sourceFilter as LeadSource) : 'all')
            setSortKey((Object.keys(SORT_LABELS) as string[]).includes(v.sortKey) ? (v.sortKey as SortKey) : 'date')
          }}
        />
        <span className="ml-auto text-sm text-muted-foreground">
          {filtered.length} of {initialLeads.length} leads
        </span>
      </div>

      {selected.size > 0 && (
        <div className="flex flex-wrap items-center gap-2 rounded-md border bg-accent/40 px-3 py-2">
          <span className="text-sm font-medium">{selected.size} selected</span>
          <Select value={bulkStage} onValueChange={(v) => setBulkStage(v as Stage)}>
            <SelectTrigger className="h-8 w-40">
              <SelectValue placeholder="Move to stage…" />
            </SelectTrigger>
            <SelectContent>
              {STAGES.map((s) => (
                <SelectItem key={s} value={s}>
                  {STAGE_LABELS[s]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button size="sm" variant="outline" disabled={!bulkStage || bulkBusy} onClick={() => setBulkRemarkOpen(true)}>
            {bulkBusy && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            Apply stage
          </Button>
          {canReassign && (
            <>
              <Select value={bulkOwnerId} onValueChange={setBulkOwnerId}>
                <SelectTrigger className="h-8 w-44">
                  <SelectValue placeholder="Reassign to…" />
                </SelectTrigger>
                <SelectContent>
                  {ownerOptions.map((o) => (
                    <SelectItem key={o.id} value={o.id}>
                      {o.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button size="sm" variant="outline" disabled={!bulkOwnerId || bulkBusy} onClick={() => runBulkAction('reassign')}>
                {bulkBusy && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                Reassign
              </Button>
            </>
          )}
          {bulkMessage && <span className="text-xs text-muted-foreground">{bulkMessage}</span>}
          <Button size="sm" variant="ghost" className="ml-auto" onClick={() => setSelected(new Set())}>
            Clear
          </Button>
        </div>
      )}

      <div className="rounded-md border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-xs uppercase tracking-wide">
            <tr className="text-left">
              <th className="px-3 py-2 font-medium w-8">
                <input type="checkbox" checked={allVisibleSelected} onChange={toggleAllVisible} aria-label="Select all visible leads" />
              </th>
              <th className="px-3 py-2 font-medium">Company / POC</th>
              <th className="px-3 py-2 font-medium hidden md:table-cell">Stage</th>
              <th className="px-3 py-2 font-medium hidden md:table-cell">Source</th>
              <th className="px-3 py-2 font-medium">Quality / Effort</th>
              <th className="px-3 py-2 font-medium">Est. Volume</th>
              <th className="px-3 py-2 font-medium hidden lg:table-cell">Last activity</th>
              <th className="px-3 py-2 font-medium hidden lg:table-cell">Owner</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {filtered.length === 0 && (
              <tr>
                <td colSpan={8} className="px-3 py-12 text-center text-muted-foreground">
                  No leads match the current filters.
                </td>
              </tr>
            )}
            {filtered.map((l) => (
              <tr key={l.id} className="hover:bg-muted/40">
                <td className="px-3 py-2">
                  <input
                    type="checkbox"
                    checked={selected.has(l.id)}
                    onChange={() => toggleOne(l.id)}
                    aria-label={`Select ${l.company}`}
                  />
                </td>
                <td className="px-3 py-2">
                  <Link href={`/leads/${l.id}`} className="block">
                    <p className="font-medium">{l.company}</p>
                    <p className="text-xs text-muted-foreground">{l.poc || l.industry || '—'}</p>
                  </Link>
                </td>
                <td className="px-3 py-2 hidden md:table-cell">
                  <Badge variant="outline">{STAGE_LABELS[l.stage as Stage]}</Badge>
                </td>
                <td className="px-3 py-2 hidden md:table-cell text-muted-foreground">
                  {SOURCE_LABELS[l.source as LeadSource] ?? l.source}
                </td>
                <td className="px-3 py-2">
                  <div className="flex items-center gap-1">
                    <Badge variant="outline" className={cn('text-[10px]', QUALITY_BADGE_CLASS[l.quality])}>
                      {QUALITY_LABELS[l.quality]}
                    </Badge>
                    <span className="text-[10px] text-muted-foreground">
                      {QUALITY_LABELS[l.effort]} effort
                    </span>
                  </div>
                </td>
                <td className="px-3 py-2 tabular-nums">{formatCurrency(l.estimatedVolume)}</td>
                <td className={cn('px-3 py-2 hidden lg:table-cell text-muted-foreground')}>
                  {formatRelative(l.lastActivityAt)}
                </td>
                <td className="px-3 py-2 hidden lg:table-cell text-muted-foreground">{l.ownerName}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Dialog open={bulkRemarkOpen} onOpenChange={(o) => { setBulkRemarkOpen(o); if (!o) setBulkRemark('') }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Move {selected.size} lead{selected.size === 1 ? '' : 's'} to {bulkStage ? STAGE_LABELS[bulkStage] : ''}</DialogTitle>
            <DialogDescription>
              One remark, logged identically to every selected lead&apos;s activity timeline.
            </DialogDescription>
          </DialogHeader>
          <Textarea
            autoFocus
            rows={4}
            placeholder="What happened?"
            value={bulkRemark}
            onChange={(e) => setBulkRemark(e.target.value)}
          />
          <DialogFooter>
            <Button variant="ghost" onClick={() => setBulkRemarkOpen(false)} disabled={bulkBusy}>
              Cancel
            </Button>
            <Button onClick={confirmBulkStageChange} disabled={bulkBusy || !bulkRemark.trim()}>
              {bulkBusy && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              Confirm
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}