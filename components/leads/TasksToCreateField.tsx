'use client'

import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Plus, X } from 'lucide-react'

export interface DraftTask {
  title: string
  dueDate: string
}

// A repeatable title+date list for creating one or more Tasks alongside a
// lead — used on the New Lead form, where the lead (and so its id) doesn't
// exist yet, so these can't be saved individually the way LeadTasksTab does;
// the caller creates them all after the lead itself is saved.
export function TasksToCreateField({
  tasks,
  onChange,
}: {
  tasks: DraftTask[]
  onChange: (tasks: DraftTask[]) => void
}) {
  function updateRow(i: number, patch: Partial<DraftTask>) {
    onChange(tasks.map((t, idx) => (idx === i ? { ...t, ...patch } : t)))
  }

  function addRow() {
    onChange([...tasks, { title: '', dueDate: '' }])
  }

  function removeRow(i: number) {
    onChange(tasks.filter((_, idx) => idx !== i))
  }

  return (
    <div className="space-y-1.5">
      <Label>Tasks (optional)</Label>
      {tasks.map((t, i) => (
        <div key={i} className="flex gap-2">
          <Input
            placeholder='e.g. "Send onboarding docs"'
            value={t.title}
            onChange={(e) => updateRow(i, { title: e.target.value })}
          />
          <Input
            type="date"
            className="w-40 shrink-0"
            value={t.dueDate}
            onChange={(e) => updateRow(i, { dueDate: e.target.value })}
          />
          <Button type="button" size="icon" variant="ghost" className="shrink-0" onClick={() => removeRow(i)}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      ))}
      <Button type="button" size="sm" variant="outline" onClick={addRow}>
        <Plus className="h-3.5 w-3.5" />
        Add a task
      </Button>
    </div>
  )
}
