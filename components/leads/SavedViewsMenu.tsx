'use client'

import { useEffect, useState } from 'react'
import { Bookmark, Trash2, Plus, Check, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

export interface LeadViewFilters {
  search: string
  stageFilter: string
  sourceFilter: string
  sortKey: string
}

interface SavedView {
  id: string
  name: string
  filters: LeadViewFilters
}

export function SavedViewsMenu({
  filters,
  onApply,
}: {
  filters: LeadViewFilters
  onApply: (filters: LeadViewFilters) => void
}) {
  const [views, setViews] = useState<SavedView[]>([])
  const [showSaveForm, setShowSaveForm] = useState(false)
  const [name, setName] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    fetch('/api/views')
      .then((res) => (res.ok ? res.json() : { views: [] }))
      .then((data) => setViews(data.views ?? []))
      .catch(() => {})
  }, [])

  async function saveCurrentView() {
    const trimmed = name.trim()
    if (!trimmed) return
    setSaving(true)
    try {
      const res = await fetch('/api/views', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ name: trimmed, filters }),
      })
      if (res.ok) {
        const { view } = await res.json()
        setViews((prev) => [view, ...prev])
        setName('')
        setShowSaveForm(false)
      }
    } finally {
      setSaving(false)
    }
  }

  async function deleteView(id: string) {
    setViews((prev) => prev.filter((v) => v.id !== id))
    await fetch(`/api/views/${id}`, { method: 'DELETE' })
  }

  return (
    <div className="flex items-center gap-1.5">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" className="h-9">
            <Bookmark className="h-3.5 w-3.5" />
            Views
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-56">
          <DropdownMenuLabel>Saved views</DropdownMenuLabel>
          {views.length === 0 && (
            <p className="px-2 py-1.5 text-xs text-muted-foreground">No saved views yet.</p>
          )}
          {views.map((view) => (
            <DropdownMenuItem key={view.id} onSelect={() => onApply(view.filters)} className="justify-between gap-2">
              <span className="truncate">{view.name}</span>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  deleteView(view.id)
                }}
                className="text-muted-foreground hover:text-destructive"
                aria-label={`Delete view ${view.name}`}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </DropdownMenuItem>
          ))}
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onSelect={(e) => {
              e.preventDefault()
              setShowSaveForm(true)
            }}
          >
            <Plus className="h-3.5 w-3.5" />
            Save current view…
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {showSaveForm && (
        <div className="flex items-center gap-1">
          <Input
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') saveCurrentView()
              if (e.key === 'Escape') setShowSaveForm(false)
            }}
            placeholder="View name…"
            className="h-9 w-40"
          />
          <Button size="icon" variant="outline" className="h-9 w-9" disabled={saving || !name.trim()} onClick={saveCurrentView}>
            <Check className="h-4 w-4" />
          </Button>
          <Button size="icon" variant="ghost" className="h-9 w-9" onClick={() => setShowSaveForm(false)}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  )
}
