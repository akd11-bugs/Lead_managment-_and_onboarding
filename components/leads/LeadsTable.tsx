'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { Search } from 'lucide-react'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
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

export function LeadsTable({ initialLeads, initialQuery }: { initialLeads: Lead[]; initialQuery?: string }) {
  const [search, setSearch] = useState(initialQuery ?? '')
  const [stageFilter, setStageFilter] = useState<Stage | 'all'>('all')
  const [sourceFilter, setSourceFilter] = useState<LeadSource | 'all'>('all')
  const [sortKey, setSortKey] = useState<SortKey>('date')

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
        <span className="ml-auto text-sm text-muted-foreground">
          {filtered.length} of {initialLeads.length} leads
        </span>
      </div>

      <div className="rounded-md border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-xs uppercase tracking-wide">
            <tr className="text-left">
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
                <td colSpan={7} className="px-3 py-12 text-center text-muted-foreground">
                  No leads match the current filters.
                </td>
              </tr>
            )}
            {filtered.map((l) => (
              <tr key={l.id} className="hover:bg-muted/40">
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
    </div>
  )
}