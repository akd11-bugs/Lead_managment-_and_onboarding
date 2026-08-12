'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Phone, Mail, Calendar, StickyNote } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { formatRelative } from '@/lib/utils'

interface ActivityItem {
  id: string
  type: string
  description: string
  date: string
  authorName: string
  leadName: string
  leadId: string
}

const ICONS: Record<string, React.ReactNode> = {
  call: <Phone className="h-3.5 w-3.5" />,
  email: <Mail className="h-3.5 w-3.5" />,
  meeting: <Calendar className="h-3.5 w-3.5" />,
  note: <StickyNote className="h-3.5 w-3.5" />,
}

// Polls rather than pushing — good enough for a small team, and avoids
// standing up a websocket/SSE server for something admins glance at.
const POLL_MS = 15000

export function ActivityFeed({ limit = 8 }: { limit?: number }) {
  const [items, setItems] = useState<ActivityItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false

    function load() {
      fetch('/api/activities?limit=' + limit)
        .then((r) => r.json())
        .then((data) => {
          if (!cancelled) {
            setItems(data.activities ?? [])
            setLoading(false)
          }
        })
        .catch(() => {
          if (!cancelled) setLoading(false)
        })
    }

    load()
    const interval = setInterval(load, POLL_MS)
    return () => {
      cancelled = true
      clearInterval(interval)
    }
  }, [limit])

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          Recent activity
          <span className="flex items-center gap-1 text-[10px] font-normal text-muted-foreground">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" /> live
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {loading && <p className="text-sm text-muted-foreground">Loading…</p>}
        {!loading && items.length === 0 && (
          <p className="text-sm text-muted-foreground">No activity yet. Add a lead to get started.</p>
        )}
        {!loading &&
          items.map((a) => (
            <Link
              key={a.id}
              href={`/leads/${a.leadId}`}
              className="flex items-start gap-3 text-sm rounded-md -mx-2 px-2 py-1 transition-colors hover:bg-accent/60"
            >
              <div className="mt-0.5 text-muted-foreground">{ICONS[a.type] ?? ICONS.note}</div>
              <div className="min-w-0 flex-1">
                <p className="truncate">
                  <span className="font-medium">{a.authorName}</span>{' '}
                  <span className="text-muted-foreground">on</span>{' '}
                  <span className="font-medium">{a.leadName}</span>
                </p>
                <p className="text-xs text-muted-foreground line-clamp-2">{a.description}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{formatRelative(a.date)}</p>
              </div>
            </Link>
          ))}
      </CardContent>
    </Card>
  )
}