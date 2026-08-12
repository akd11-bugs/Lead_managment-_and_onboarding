'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ListPlus, Check, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'

export function AlertTaskButton({ title }: { title: string }) {
  const router = useRouter()
  const [added, setAdded] = useState(false)
  const [saving, setSaving] = useState(false)

  async function createTask(e: React.MouseEvent) {
    e.preventDefault()
    e.stopPropagation()
    setSaving(true)
    try {
      const res = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ title, source: 'alert' }),
      })
      if (res.ok) {
        setAdded(true)
        router.refresh()
      }
    } finally {
      setSaving(false)
    }
  }

  if (added) {
    return (
      <span className="flex items-center gap-1 text-xs text-emerald-600 shrink-0 px-2">
        <Check className="h-3.5 w-3.5" /> Added
      </span>
    )
  }

  return (
    <Button variant="ghost" size="sm" className="gap-1 shrink-0" onClick={createTask} disabled={saving}>
      {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ListPlus className="h-3.5 w-3.5" />}
      Task
    </Button>
  )
}
