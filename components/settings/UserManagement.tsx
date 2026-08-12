'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { UserPlus, Loader2 } from 'lucide-react'

interface UserRow {
  id: string
  name: string
  email: string
  role: string
  createdAt: string
}

export function UserManagement({ initialUsers }: { initialUsers: UserRow[] }) {
  const router = useRouter()
  const [users, setUsers] = useState(initialUsers)
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'sales' as 'admin' | 'sales' | 'operations' })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function createUser() {
    setSaving(true)
    setError(null)
    try {
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(form),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error ?? 'Failed to create user')
        return
      }
      setUsers((prev) => [...prev, data.user])
      setForm({ name: '', email: '', password: '', role: 'sales' })
      router.refresh()
    } finally {
      setSaving(false)
    }
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Team accounts</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-1.5">
          {users.map((u) => (
            <div key={u.id} className="flex items-center justify-between gap-3 rounded-md border px-3 py-2 text-sm">
              <div>
                <p className="font-medium">{u.name}</p>
                <p className="text-xs text-muted-foreground">{u.email}</p>
              </div>
              <Badge variant="outline" className="text-[10px] capitalize">
                {u.role}
              </Badge>
            </div>
          ))}
        </div>

        <div className="rounded-md border p-3 space-y-2">
          <p className="text-sm font-medium flex items-center gap-1.5">
            <UserPlus className="h-3.5 w-3.5" /> Add a team member
          </p>
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label className="text-xs">Name</Label>
              <Input
                className="h-8"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Email</Label>
              <Input
                type="email"
                className="h-8"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Temporary password</Label>
              <Input
                type="text"
                className="h-8"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                placeholder="min 8 characters"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Role</Label>
              <Select
                value={form.role}
                onValueChange={(v) => setForm({ ...form, role: v as 'admin' | 'sales' | 'operations' })}
              >
                <SelectTrigger className="h-8">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="sales">Sales — sees only their own leads</SelectItem>
                  <SelectItem value="admin">Admin — sees everything</SelectItem>
                  <SelectItem value="operations">Operations — manages the onboarding queue</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          {error && <p className="text-xs text-rose-600">{error}</p>}
          <div className="flex justify-end">
            <Button
              size="sm"
              onClick={createUser}
              disabled={saving || !form.name || !form.email || !form.password}
            >
              {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              Create account
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
