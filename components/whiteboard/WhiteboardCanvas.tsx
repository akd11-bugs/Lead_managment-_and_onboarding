'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  MousePointer2,
  Hand,
  StickyNote,
  Square,
  Circle as CircleIcon,
  ArrowUpRight,
  Pencil,
  Undo2,
  Redo2,
  ZoomIn,
  ZoomOut,
  Maximize,
  Trash2,
  Wand2,
  Users,
  Loader2,
} from 'lucide-react'
import { extractLeadFields } from '@/lib/aiExtraction'

type Tool = 'select' | 'pan' | 'sticky' | 'rect' | 'circle' | 'arrow' | 'freehand'

interface WBElement {
  id: string
  type: 'sticky' | 'rect' | 'circle' | 'arrow' | 'freepath' | 'stamp' | 'funnel'
  x: number
  y: number
  w?: number | null
  h?: number | null
  color?: string | null
  text?: string | null
  x2?: number
  y2?: number
  points?: { x: number; y: number }[]
  stageKey?: string
  k?: string
  count?: number
  value?: number
  won?: boolean
  leadId?: string
  system?: boolean
}

interface Point {
  x: number
  y: number
}

const NOTE_COLORS = ['yellow', 'pink', 'green', 'blue'] as const
const NOTE_BG: Record<string, string> = {
  yellow: 'bg-amber-200 text-amber-950 border-amber-400 dark:bg-amber-300 dark:text-amber-950',
  pink: 'bg-pink-200 text-pink-950 border-pink-400 dark:bg-pink-300 dark:text-pink-950',
  green: 'bg-emerald-200 text-emerald-950 border-emerald-400 dark:bg-emerald-300 dark:text-emerald-950',
  blue: 'bg-sky-200 text-sky-950 border-sky-400 dark:bg-sky-300 dark:text-sky-950',
}

async function api<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...init,
    headers: { 'content-type': 'application/json', ...(init?.headers ?? {}) },
  })
  if (!res.ok) throw new Error((await res.json().catch(() => ({})))?.error ?? 'Request failed')
  return res.json()
}

export function WhiteboardCanvas() {
  const router = useRouter()
  const [elements, setElements] = useState<WBElement[]>([])
  const [loading, setLoading] = useState(true)
  const [tool, setTool] = useState<Tool>('select')
  const [selected, setSelected] = useState<string[]>([])
  const [pan, setPan] = useState({ x: 40, y: 20 })
  const [zoom, setZoom] = useState(1)
  const [extractTarget, setExtractTarget] = useState<WBElement | null>(null)
  const [extractForm, setExtractForm] = useState({ company: '', poc: '', email: '', phone: '' })
  const [extracting, setExtracting] = useState(false)
  const [savingSegment, setSavingSegment] = useState(false)

  const viewportRef = useRef<HTMLDivElement>(null)
  // The single synchronous source of truth for "the current elements array,
  // right now" — React state (`elements`) only reflects that after a
  // render, so anywhere that needs the latest value *immediately after*
  // mutating it (committing undo history, chaining another mutation) reads
  // this instead of risking a stale closure over `elements`.
  const elementsRef = useRef<WBElement[]>([])
  function applyElements(next: WBElement[], commit: boolean) {
    elementsRef.current = next
    setElements(next)
    if (commit) commitHistory(next)
  }
  const dragRef = useRef<{ ids: string[]; startWorld: Point; startPositions: Record<string, Point>; moved: boolean } | null>(null)
  const creatingRef = useRef<
    | { type: 'rect' | 'circle'; x0: number; y0: number }
    | { type: 'arrow'; x0: number; y0: number }
    | { type: 'freehand'; points: Point[] }
    | null
  >(null)
  const [ghost, setGhost] = useState<null | { kind: 'rect' | 'circle'; x: number; y: number; w: number; h: number } | { kind: 'arrow'; x1: number; y1: number; x2: number; y2: number } | { kind: 'path'; points: Point[] }>(null)

  // Local-only undo stack (one browser tab's own actions) — see
  // app/api/whiteboard/elements/route.ts's doc comment for why there's no
  // cross-tab live sync to reconcile here.
  const historyRef = useRef<WBElement[][]>([])
  const historyIndexRef = useRef(-1)
  const [canUndo, setCanUndo] = useState(false)
  const [canRedo, setCanRedo] = useState(false)

  const load = useCallback(() => {
    setLoading(true)
    api<{ elements: WBElement[] }>('/api/whiteboard/elements')
      .then((data) => {
        elementsRef.current = data.elements
        setElements(data.elements)
        historyRef.current = [data.elements]
        historyIndexRef.current = 0
        updateUndoButtons()
      })
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    load()
  }, [load])

  function updateUndoButtons() {
    setCanUndo(historyIndexRef.current > 0)
    setCanRedo(historyIndexRef.current < historyRef.current.length - 1)
  }
  function commitHistory(next: WBElement[]) {
    historyRef.current = historyRef.current.slice(0, historyIndexRef.current + 1)
    historyRef.current.push(next)
    if (historyRef.current.length > 50) historyRef.current.shift()
    historyIndexRef.current = historyRef.current.length - 1
    updateUndoButtons()
  }
  // Undo/redo only move the LOCAL view back and forth through this tab's
  // own history — they don't re-create or re-delete rows on the server, so
  // reverting a delete here does nothing server-side. Good enough for a
  // single-session "oops" — not a substitute for real server-side undo.
  function undo() {
    if (historyIndexRef.current <= 0) return
    historyIndexRef.current -= 1
    elementsRef.current = historyRef.current[historyIndexRef.current]
    setElements(elementsRef.current)
    updateUndoButtons()
  }
  function redo() {
    if (historyIndexRef.current >= historyRef.current.length - 1) return
    historyIndexRef.current += 1
    elementsRef.current = historyRef.current[historyIndexRef.current]
    setElements(elementsRef.current)
    updateUndoButtons()
  }

  function toWorld(clientX: number, clientY: number): Point {
    const rect = viewportRef.current!.getBoundingClientRect()
    return { x: (clientX - rect.left - pan.x) / zoom, y: (clientY - rect.top - pan.y) / zoom }
  }

  async function createElement(partial: Partial<WBElement> & { type: WBElement['type']; x: number; y: number }) {
    const { element } = await api<{ element: WBElement }>('/api/whiteboard/elements', {
      method: 'POST',
      body: JSON.stringify(partial),
    })
    applyElements([...elementsRef.current, element], true)
    return element
  }

  async function patchElement(id: string, patch: Partial<WBElement>) {
    applyElements(
      elementsRef.current.map((e) => (e.id === id ? { ...e, ...patch } : e)),
      false, // the caller commits once editing finishes (see commitCurrentElements) — not on every keystroke
    )
    await api(`/api/whiteboard/elements/${id}`, { method: 'PATCH', body: JSON.stringify(patch) }).catch(() => {})
  }
  function commitCurrentElements() {
    commitHistory(elementsRef.current)
  }

  async function deleteSelected() {
    const ids = selected
    applyElements(
      elementsRef.current.filter((e) => !ids.includes(e.id)),
      true,
    )
    setSelected([])
    await Promise.all(ids.map((id) => api(`/api/whiteboard/elements/${id}`, { method: 'DELETE' }).catch(() => {})))
  }

  // ---------------- Pointer interactions ----------------
  function onViewportMouseDown(ev: React.MouseEvent) {
    if (tool === 'pan' || ev.button === 1) {
      const start = { x: ev.clientX, y: ev.clientY }
      const origin = { ...pan }
      function onMove(mv: MouseEvent) {
        setPan({ x: origin.x + (mv.clientX - start.x), y: origin.y + (mv.clientY - start.y) })
      }
      function onUp() {
        document.removeEventListener('mousemove', onMove)
        document.removeEventListener('mouseup', onUp)
      }
      document.addEventListener('mousemove', onMove)
      document.addEventListener('mouseup', onUp)
      return
    }

    const w = toWorld(ev.clientX, ev.clientY)

    if (tool === 'sticky') {
      createElement({ type: 'sticky', x: w.x - 105, y: w.y - 75, w: 210, h: 150, color: NOTE_COLORS[elementsRef.current.length % 4], text: '' })
      setTool('select')
      return
    }
    if (tool === 'rect' || tool === 'circle') {
      creatingRef.current = { type: tool, x0: w.x, y0: w.y }
      return
    }
    if (tool === 'arrow') {
      creatingRef.current = { type: 'arrow', x0: w.x, y0: w.y }
      return
    }
    if (tool === 'freehand') {
      creatingRef.current = { type: 'freehand', points: [w] }
      return
    }
    if (tool === 'select') {
      setSelected([])
    }
  }

  function onViewportMouseMove(ev: React.MouseEvent) {
    const creating = creatingRef.current
    if (!creating) return
    const w = toWorld(ev.clientX, ev.clientY)
    if (creating.type === 'rect' || creating.type === 'circle') {
      const x = Math.min(creating.x0, w.x)
      const y = Math.min(creating.y0, w.y)
      setGhost({ kind: creating.type, x, y, w: Math.abs(w.x - creating.x0), h: Math.abs(w.y - creating.y0) })
    } else if (creating.type === 'arrow') {
      setGhost({ kind: 'arrow', x1: creating.x0, y1: creating.y0, x2: w.x, y2: w.y })
    } else if (creating.type === 'freehand') {
      creating.points.push(w)
      setGhost({ kind: 'path', points: creating.points.slice() })
    }
  }

  function classifyStroke(points: Point[]): { type: 'rect' | 'circle'; x: number; y: number; w: number; h: number } | null {
    if (points.length < 4) return null
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity, len = 0
    for (let i = 0; i < points.length; i++) {
      const p = points[i]
      minX = Math.min(minX, p.x); minY = Math.min(minY, p.y)
      maxX = Math.max(maxX, p.x); maxY = Math.max(maxY, p.y)
      if (i > 0) len += Math.hypot(p.x - points[i - 1].x, p.y - points[i - 1].y)
    }
    const w = Math.max(maxX - minX, 12), h = Math.max(maxY - minY, 12)
    if (w < 24 || h < 24) return null

    let corners = 0, prevAngle: number | null = null
    const step = Math.max(1, Math.floor(points.length / 40))
    for (let j = step; j < points.length; j += step) {
      const a = points[j - step], b = points[j]
      const angle = Math.atan2(b.y - a.y, b.x - a.x)
      if (prevAngle !== null) {
        let diff = Math.abs(angle - prevAngle)
        if (diff > Math.PI) diff = 2 * Math.PI - diff
        if (diff > 0.6) corners++
      }
      prevAngle = angle
    }
    const bboxPerimeter = 2 * (w + h)
    const ellipsePerimeter = (Math.PI * (w + h)) / 2
    if (corners >= 3 && corners <= 7 && Math.abs(len - bboxPerimeter) / bboxPerimeter < 0.55) return { type: 'rect', x: minX, y: minY, w, h }
    if (corners <= 3 && Math.abs(len - ellipsePerimeter) / ellipsePerimeter < 0.55) return { type: 'circle', x: minX, y: minY, w, h }
    return null
  }

  async function onViewportMouseUp(ev: React.MouseEvent) {
    const creating = creatingRef.current
    if (!creating) return
    creatingRef.current = null
    setGhost(null)
    const w = toWorld(ev.clientX, ev.clientY)

    if (creating.type === 'rect' || creating.type === 'circle') {
      const x = Math.min(creating.x0, w.x), y = Math.min(creating.y0, w.y)
      const ww = Math.abs(w.x - creating.x0), hh = Math.abs(w.y - creating.y0)
      if (ww > 10 && hh > 10) await createElement({ type: creating.type, x, y, w: ww, h: hh })
    } else if (creating.type === 'arrow') {
      await createElement({ type: 'arrow', x: creating.x0, y: creating.y0, x2: w.x, y2: w.y } as never)
    } else if (creating.type === 'freehand') {
      const cls = classifyStroke(creating.points)
      if (cls) await createElement({ type: cls.type, x: cls.x, y: cls.y, w: cls.w, h: cls.h })
    }
    setTool('select')
  }

  function startDragElement(ev: React.MouseEvent, el: WBElement) {
    if (tool !== 'select') return
    ev.stopPropagation()
    let ids = selected
    if (ev.shiftKey) {
      ids = selected.includes(el.id) ? selected : [...selected, el.id]
      setSelected(ids)
    } else if (!selected.includes(el.id)) {
      ids = [el.id]
      setSelected(ids)
    }
    const startWorld = toWorld(ev.clientX, ev.clientY)
    const startPositions: Record<string, Point> = {}
    elements.forEach((e) => {
      if (ids.includes(e.id)) startPositions[e.id] = { x: e.x, y: e.y }
    })
    dragRef.current = { ids, startWorld, startPositions, moved: false }

    function onMove(mv: MouseEvent) {
      const d = dragRef.current
      if (!d) return
      const w = toWorldStatic(mv.clientX, mv.clientY)
      const dx = w.x - d.startWorld.x, dy = w.y - d.startWorld.y
      if (Math.abs(dx) > 2 || Math.abs(dy) > 2) d.moved = true
      const next = elementsRef.current.map((e) =>
        d.startPositions[e.id] ? { ...e, x: d.startPositions[e.id].x + dx, y: d.startPositions[e.id].y + dy } : e,
      )
      elementsRef.current = next
      setElements(next)
    }
    async function onUp() {
      document.removeEventListener('mousemove', onMove)
      document.removeEventListener('mouseup', onUp)
      const d = dragRef.current
      dragRef.current = null
      if (!d || !d.moved) return
      commitCurrentElements()
      const byId = new Map(elementsRef.current.map((e) => [e.id, e]))
      d.ids.forEach((id) => {
        const e = byId.get(id)
        if (e) api(`/api/whiteboard/elements/${id}`, { method: 'PATCH', body: JSON.stringify({ x: e.x, y: e.y }) }).catch(() => {})
      })
    }
    document.addEventListener('mousemove', onMove)
    document.addEventListener('mouseup', onUp)
  }

  // toWorld closes over pan/zoom state, which is stale inside a
  // document-level listener added once per drag — read the live viewport
  // rect each call but recompute from the CURRENT pan/zoom via refs to
  // avoid that staleness.
  const panRef = useRef(pan)
  const zoomRef = useRef(zoom)
  useEffect(() => {
    panRef.current = pan
    zoomRef.current = zoom
  }, [pan, zoom])
  function toWorldStatic(clientX: number, clientY: number): Point {
    const rect = viewportRef.current!.getBoundingClientRect()
    return { x: (clientX - rect.left - panRef.current.x) / zoomRef.current, y: (clientY - rect.top - panRef.current.y) / zoomRef.current }
  }

  function onWheel(ev: React.WheelEvent) {
    ev.preventDefault()
    const factor = ev.deltaY < 0 ? 1.08 : 1 / 1.08
    const rect = viewportRef.current!.getBoundingClientRect()
    const cx = ev.clientX - rect.left, cy = ev.clientY - rect.top
    const w = { x: (cx - pan.x) / zoom, y: (cy - pan.y) / zoom }
    const newZoom = Math.min(2.4, Math.max(0.4, zoom * factor))
    setZoom(newZoom)
    setPan({ x: cx - w.x * newZoom, y: cy - w.y * newZoom })
  }

  // ---------------- Extract to lead ----------------
  function openExtract(el: WBElement) {
    const extracted = extractFromTextSync(el.text ?? '')
    setExtractForm(extracted)
    setExtractTarget(el)
  }
  // Quick synchronous regex pre-fill shown instantly while the real model loads.
  function extractFromTextSync(text: string) {
    const email = text.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/)?.[0] ?? ''
    const phone = text.match(/(\+?\d[\d\s().-]{5,}\d)/)?.[0]?.trim() ?? ''
    return { company: '', poc: '', email, phone }
  }
  useEffect(() => {
    if (!extractTarget) return
    let cancelled = false
    extractLeadFields(extractTarget.text ?? '').then((result) => {
      if (cancelled) return
      setExtractForm((prev) => ({
        company: prev.company || result.company || '',
        poc: prev.poc || result.poc || '',
        email: prev.email || result.email || '',
        phone: prev.phone || result.phone || '',
      }))
    })
    return () => {
      cancelled = true
    }
  }, [extractTarget])

  async function confirmExtract() {
    if (!extractTarget || !extractForm.company || !extractForm.email) return
    setExtracting(true)
    try {
      const data = await api<{ lead?: { id: string }; error?: string; duplicate?: { id: string } }>('/api/leads', {
        method: 'POST',
        body: JSON.stringify({
          company: extractForm.company,
          poc: extractForm.poc || undefined,
          email: extractForm.email,
          phone: extractForm.phone || undefined,
          source: 'other',
        }),
      }).catch(async (err) => {
        throw err
      })
      const leadId = data.lead?.id
      if (leadId) await patchElement(extractTarget.id, { leadId })
      setExtractTarget(null)
      router.refresh()
    } catch {
      // duplicate or validation error — leave the popover open so they can adjust
    } finally {
      setExtracting(false)
    }
  }

  // ---------------- Save as segment ----------------
  const selectedLinkedIds = selected.filter((id) => elements.find((e) => e.id === id)?.leadId)
  async function saveSegment() {
    const name = prompt('Segment name (e.g. "Hot leads")')
    if (!name?.trim()) return
    const leadIds = selectedLinkedIds.map((id) => elements.find((e) => e.id === id)!.leadId!)
    setSavingSegment(true)
    try {
      await api('/api/views', {
        method: 'POST',
        body: JSON.stringify({ name: name.trim(), viewType: 'leads', filters: { leadIds } }),
      })
      setSelected([])
    } finally {
      setSavingSegment(false)
    }
  }

  async function resetBoard() {
    if (!confirm('Clear the whole board for everyone in your org? This cannot be undone.')) return
    await api('/api/whiteboard/elements', { method: 'DELETE' })
    load()
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-2 border-b bg-background/95 px-4 py-2">
        <ToolButton icon={<MousePointer2 className="h-4 w-4" />} active={tool === 'select'} onClick={() => setTool('select')} label="Select" />
        <ToolButton icon={<Hand className="h-4 w-4" />} active={tool === 'pan'} onClick={() => setTool('pan')} label="Pan" />
        <div className="mx-1 h-6 w-px bg-border" />
        <ToolButton icon={<StickyNote className="h-4 w-4" />} active={tool === 'sticky'} onClick={() => setTool('sticky')} label="Note" />
        <ToolButton icon={<Square className="h-4 w-4" />} active={tool === 'rect'} onClick={() => setTool('rect')} label="Box" />
        <ToolButton icon={<CircleIcon className="h-4 w-4" />} active={tool === 'circle'} onClick={() => setTool('circle')} label="Circle" />
        <ToolButton icon={<ArrowUpRight className="h-4 w-4" />} active={tool === 'arrow'} onClick={() => setTool('arrow')} label="Arrow" />
        <ToolButton icon={<Pencil className="h-4 w-4" />} active={tool === 'freehand'} onClick={() => setTool('freehand')} label="Draw" />
        <div className="mx-1 h-6 w-px bg-border" />
        <Button size="icon" variant="outline" className="h-8 w-8" disabled={!canUndo} onClick={undo} title="Undo">
          <Undo2 className="h-4 w-4" />
        </Button>
        <Button size="icon" variant="outline" className="h-8 w-8" disabled={!canRedo} onClick={redo} title="Redo">
          <Redo2 className="h-4 w-4" />
        </Button>
        {selected.length > 0 && (
          <>
            <div className="mx-1 h-6 w-px bg-border" />
            {selected.length === 1 && elements.find((e) => e.id === selected[0])?.type === 'sticky' && (
              <Button size="sm" variant="outline" onClick={() => openExtract(elements.find((e) => e.id === selected[0])!)}>
                <Wand2 className="h-3.5 w-3.5" /> Extract to lead
              </Button>
            )}
            {selected.length > 1 && (
              <Button size="sm" variant="outline" disabled={selectedLinkedIds.length < 2 || savingSegment} onClick={saveSegment}>
                {savingSegment ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Users className="h-3.5 w-3.5" />}
                Save as segment {selectedLinkedIds.length < selected.length && `(${selectedLinkedIds.length}/${selected.length} linked)`}
              </Button>
            )}
            <Button size="icon" variant="ghost" className="h-8 w-8 text-rose-600" onClick={deleteSelected} title="Delete">
              <Trash2 className="h-4 w-4" />
            </Button>
          </>
        )}
        <div className="ml-auto flex items-center gap-1.5">
          <Button size="icon" variant="outline" className="h-8 w-8" onClick={() => setZoom((z) => Math.max(0.4, z / 1.2))}>
            <ZoomOut className="h-4 w-4" />
          </Button>
          <span className="w-10 text-center text-xs tabular-nums text-muted-foreground">{Math.round(zoom * 100)}%</span>
          <Button size="icon" variant="outline" className="h-8 w-8" onClick={() => setZoom((z) => Math.min(2.4, z * 1.2))}>
            <ZoomIn className="h-4 w-4" />
          </Button>
          <Button size="icon" variant="outline" className="h-8 w-8" onClick={() => { setZoom(1); setPan({ x: 40, y: 20 }) }}>
            <Maximize className="h-4 w-4" />
          </Button>
          <Button size="sm" variant="ghost" className="text-muted-foreground" onClick={resetBoard}>
            Reset board
          </Button>
        </div>
      </div>

      <p className="border-b bg-muted/30 px-4 py-1.5 text-xs text-muted-foreground">
        Shared with your whole org — everyone sees the same board on their next load. Not live: another person&apos;s edit
        appears after a refresh, not instantly.
      </p>

      <div
        ref={viewportRef}
        className="relative flex-1 overflow-hidden bg-[radial-gradient(circle,hsl(var(--border))_1px,transparent_1px)] [background-size:24px_24px]"
        style={{ cursor: tool === 'pan' ? 'grab' : tool === 'select' ? 'default' : 'crosshair' }}
        onMouseDown={onViewportMouseDown}
        onMouseMove={onViewportMouseMove}
        onMouseUp={onViewportMouseUp}
        onWheel={onWheel}
      >
        {loading && <div className="absolute inset-0 grid place-items-center text-sm text-muted-foreground">Loading board…</div>}

        <div className="absolute left-0 top-0 origin-top-left" style={{ transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})` }}>
          <svg className="pointer-events-none absolute left-0 top-0 overflow-visible" width={4000} height={2400}>
            <defs>
              <marker id="wb-arrowhead" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
                <path d="M0,0 L6,3 L0,6 Z" fill="hsl(var(--muted-foreground))" />
              </marker>
            </defs>
            {elements.map((el) => {
              if (el.type === 'arrow') {
                return (
                  <line
                    key={el.id}
                    x1={el.x} y1={el.y} x2={el.x2} y2={el.y2}
                    stroke={el.system ? 'hsl(var(--border))' : 'hsl(var(--primary))'}
                    strokeWidth={2}
                    markerEnd="url(#wb-arrowhead)"
                  />
                )
              }
              if (el.type === 'rect') {
                return (
                  <rect
                    key={el.id}
                    x={el.x} y={el.y} width={el.w ?? 0} height={el.h ?? 0} rx={8}
                    fill="hsl(var(--primary) / 0.07)"
                    stroke={selected.includes(el.id) ? 'hsl(var(--primary))' : 'hsl(var(--border))'}
                    strokeWidth={selected.includes(el.id) ? 2 : 1.5}
                    className="pointer-events-auto cursor-pointer"
                    onMouseDown={(e) => startDragElement(e as never, el)}
                  />
                )
              }
              if (el.type === 'circle') {
                return (
                  <ellipse
                    key={el.id}
                    cx={el.x + (el.w ?? 0) / 2} cy={el.y + (el.h ?? 0) / 2} rx={(el.w ?? 0) / 2} ry={(el.h ?? 0) / 2}
                    fill="hsl(var(--primary) / 0.07)"
                    stroke={selected.includes(el.id) ? 'hsl(var(--primary))' : 'hsl(var(--border))'}
                    strokeWidth={selected.includes(el.id) ? 2 : 1.5}
                    className="pointer-events-auto cursor-pointer"
                    onMouseDown={(e) => startDragElement(e as never, el)}
                  />
                )
              }
              return null
            })}
            {ghost?.kind === 'rect' && <rect x={ghost.x} y={ghost.y} width={ghost.w} height={ghost.h} rx={8} fill="hsl(var(--primary) / 0.08)" stroke="hsl(var(--primary))" strokeDasharray="4 3" />}
            {ghost?.kind === 'circle' && <ellipse cx={ghost.x + ghost.w / 2} cy={ghost.y + ghost.h / 2} rx={ghost.w / 2} ry={ghost.h / 2} fill="hsl(var(--primary) / 0.08)" stroke="hsl(var(--primary))" strokeDasharray="4 3" />}
            {ghost?.kind === 'arrow' && <line x1={ghost.x1} y1={ghost.y1} x2={ghost.x2} y2={ghost.y2} stroke="hsl(var(--primary))" strokeDasharray="4 3" strokeWidth={2} />}
            {ghost?.kind === 'path' && <path d={ghost.points.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x},${p.y}`).join(' ')} fill="none" stroke="hsl(var(--primary))" strokeWidth={2} strokeLinecap="round" />}
          </svg>

          {elements.map((el) => {
            if (el.type === 'funnel') {
              return (
                <div
                  key={el.id}
                  className={`absolute flex flex-col items-center justify-center gap-1 rounded-lg border px-3 py-2.5 text-center ${el.won ? 'border-emerald-500/40 bg-emerald-500/10' : 'border-dashed bg-muted/40'}`}
                  style={{ left: el.x, top: el.y, width: el.w ?? undefined, height: el.h ?? undefined }}
                >
                  <span className="text-[11px] uppercase tracking-wide text-muted-foreground">{el.k}</span>
                  <span className={`text-xl font-bold tabular-nums ${el.won ? 'text-emerald-600' : ''}`}>{el.count ?? 0}</span>
                  <span className="text-[11px] tabular-nums text-muted-foreground">{formatINR(el.value ?? 0)} value</span>
                </div>
              )
            }
            if (el.type === 'sticky') {
              return (
                <StickyNoteBox
                  key={el.id}
                  el={el}
                  selected={selected.includes(el.id)}
                  onMouseDown={(e) => startDragElement(e, el)}
                  onTextChange={(text) => {
                    const next = elementsRef.current.map((e) => (e.id === el.id ? { ...e, text } : e))
                    elementsRef.current = next
                    setElements(next)
                  }}
                  onTextBlur={(text) => {
                    patchElement(el.id, { text })
                    commitCurrentElements()
                  }}
                  onSelectOnly={() => setSelected([el.id])}
                />
              )
            }
            return null
          })}
        </div>

      </div>

      {extractTarget && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/50" onMouseDown={() => setExtractTarget(null)}>
          <div className="w-80 rounded-lg border bg-popover p-4 shadow-xl" onMouseDown={(e) => e.stopPropagation()}>
            <h4 className="text-sm font-semibold">Extract to lead</h4>
            <p className="mt-0.5 text-xs text-muted-foreground">Parsed on-device from this note — review before adding.</p>
            <div className="mt-3 space-y-2">
              {(['company', 'poc', 'email', 'phone'] as const).map((field) => (
                <div key={field} className="space-y-1">
                  <label className="text-[10px] uppercase tracking-wide text-muted-foreground">
                    {field === 'poc' ? 'Contact name' : field}
                  </label>
                  <input
                    className="h-8 w-full rounded-md border bg-background px-2 text-sm"
                    value={extractForm[field]}
                    onChange={(e) => setExtractForm((prev) => ({ ...prev, [field]: e.target.value }))}
                  />
                </div>
              ))}
            </div>
            <div className="mt-3 flex gap-2">
              <Button size="sm" variant="ghost" className="flex-1" onClick={() => setExtractTarget(null)}>
                Cancel
              </Button>
              <Button size="sm" className="flex-1" disabled={extracting || !extractForm.company || !extractForm.email} onClick={confirmExtract}>
                {extracting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                Add to CRM
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function ToolButton({ icon, active, onClick, label }: { icon: React.ReactNode; active: boolean; onClick: () => void; label: string }) {
  return (
    <Button size="sm" variant={active ? 'secondary' : 'ghost'} className="h-8 gap-1.5 px-2.5" onClick={onClick} title={label}>
      {icon}
      <span className="text-xs">{label}</span>
    </Button>
  )
}

function StickyNoteBox({
  el,
  selected,
  onMouseDown,
  onTextChange,
  onTextBlur,
  onSelectOnly,
}: {
  el: WBElement
  selected: boolean
  onMouseDown: (e: React.MouseEvent) => void
  onTextChange: (text: string) => void
  onTextBlur: (text: string) => void
  onSelectOnly: () => void
}) {
  const color = el.color && NOTE_BG[el.color] ? el.color : 'yellow'
  return (
    <div
      data-testid={`sticky-${el.id}`}
      className={`absolute flex flex-col rounded-md border p-2 shadow-md ${NOTE_BG[color]} ${selected ? 'ring-2 ring-primary ring-offset-2' : ''}`}
      style={{ left: el.x, top: el.y, width: el.w ?? 210, height: el.h ?? 150 }}
      onMouseDown={onMouseDown}
    >
      <textarea
        className="h-full w-full flex-1 resize-none bg-transparent text-sm outline-none placeholder:text-current/50"
        placeholder="Type a note…"
        value={el.text ?? ''}
        onMouseDown={(e) => {
          e.stopPropagation()
          onSelectOnly()
        }}
        onChange={(e) => onTextChange(e.target.value)}
        onBlur={(e) => onTextBlur(e.target.value)}
      />
      {el.leadId && (
        <Badge variant="outline" className="absolute bottom-1.5 right-1.5 border-current/30 bg-background/60 text-[10px]">
          Lead created
        </Badge>
      )}
    </div>
  )
}

function formatINR(n: number) {
  if (n >= 100000) return `₹${(n / 100000).toFixed(1)}L`
  return `₹${n.toLocaleString('en-IN')}`
}
