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
import { UserPlus, Loader2, Copy, Ban, Trash2, Check, UserCheck } from 'lucide-react'

interface UserRow {
  id: string
  name: string
  email: string
  role: string
  isActive: boolean
  createdAt: string
}

interface InviteRow {
  id: string
  name: string
  role: string
  code: string
  status: string
  createdAt: string
}

type Role = 'admin' | 'sales' | 'operations'

const ROLE_LABELS: Record<Role, string> = {
  sales: 'Sales — sees only their own leads',
  admin: 'Admin — sees everything',
  operations: 'Operations — manages the onboarding queue',
}

export function OrganisationPanel({
  initialUsers,
  initialInvites,
}: {
  initialUsers: UserRow[]
  initialInvites: InviteRow[]
}) {
  const router = useRouter()
  const [users, setUsers] = useState(initialUsers)
  const [invites, setInvites] = useState(initialInvites)
  const [form, setForm] = useState({ name: '', role: 'sales' as Role })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [approveRole, setApproveRole] = useState<Record<string, Role>>({})

  async function generateInvite() {
    setSaving(true)
    setError(null)
    try {
      const res = await fetch('/api/invites', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(form),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error ?? 'Failed to generate invite')
        return
      }
      setInvites((prev) => [data.invite, ...prev])
      setForm({ name: '', role: 'sales' })
    } finally {
      setSaving(false)
    }
  }

  async function revokeInvite(id: string) {
    if (!confirm('Revoke this invite code? It will no longer be redeemable.')) return
    const res = await fetch(`/api/invites/${id}`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
    })
    if (res.ok) setInvites((prev) => prev.map((i) => (i.id === id ? { ...i, status: 'revoked' } : i)))
  }

  async function copyCode(id: string, code: string) {
    await navigator.clipboard.writeText(code)
    setCopiedId(id)
    setTimeout(() => setCopiedId(null), 1500)
  }

  async function changeRole(id: string, role: string) {
    const res = await fetch(`/api/users/${id}`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ role }),
    })
    if (res.ok) setUsers((prev) => prev.map((u) => (u.id === id ? { ...u, role } : u)))
  }

  async function toggleActive(id: string, isActive: boolean) {
    const res = await fetch(`/api/users/${id}`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ isActive }),
    })
    if (res.ok) setUsers((prev) => prev.map((u) => (u.id === id ? { ...u, isActive } : u)))
  }

  async function deleteUser(id: string, name: string) {
    if (!confirm(`Delete ${name}'s account? This can't be undone.`)) return
    const res = await fetch(`/api/users/${id}`, { method: 'DELETE' })
    if (res.ok) setUsers((prev) => prev.filter((u) => u.id !== id))
  }

  const pendingInvites = invites.filter((i) => i.status === 'pending')
  const otherInvites = invites.filter((i) => i.status !== 'pending')
  const pendingApprovals = users.filter((u) => u.role === 'pending')
  const activeUsers = users.filter((u) => u.role !== 'pending')

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Organisation</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {pendingApprovals.length > 0 && (
          <div className="space-y-1.5">
            <p className="text-xs font-medium text-amber-700">Awaiting approval — signed in with Google</p>
            {pendingApprovals.map((u) => (
              <div key={u.id} className="flex items-center justify-between gap-3 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm">
                <div className="min-w-0">
                  <p className="font-medium truncate">{u.name}</p>
                  <p className="text-xs text-muted-foreground truncate">{u.email}</p>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <Select value={approveRole[u.id] ?? 'sales'} onValueChange={(v) => setApproveRole({ ...approveRole, [u.id]: v as Role })}>
                    <SelectTrigger className="h-7 w-[7.5rem] text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="sales">Sales</SelectItem>
                      <SelectItem value="admin">Admin</SelectItem>
                      <SelectItem value="operations">Operations</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button size="sm" className="h-7" onClick={() => changeRole(u.id, approveRole[u.id] ?? 'sales')}>
                    <UserCheck className="h-3.5 w-3.5" />
                    Approve
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-7 w-7 text-rose-600 hover:text-rose-700"
                    title="Reject"
                    onClick={() => deleteUser(u.id, u.name)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="space-y-1.5">
          {activeUsers.map((u) => (
            <div key={u.id} className="flex items-center justify-between gap-3 rounded-md border px-3 py-2 text-sm">
              <div className="min-w-0">
                <p className="font-medium truncate">{u.name}</p>
                <p className="text-xs text-muted-foreground truncate">{u.email}</p>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <Select value={u.role} onValueChange={(v) => changeRole(u.id, v)}>
                  <SelectTrigger className="h-7 w-[7.5rem] text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="sales">Sales</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                    <SelectItem value="operations">Operations</SelectItem>
                  </SelectContent>
                </Select>
                <Badge variant={u.isActive ? 'outline' : 'secondary'} className="text-[10px]">
                  {u.isActive ? 'Active' : 'Inactive'}
                </Badge>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-7 w-7"
                  title={u.isActive ? 'Deactivate' : 'Reactivate'}
                  onClick={() => toggleActive(u.id, !u.isActive)}
                >
                  <Ban className="h-3.5 w-3.5" />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-7 w-7 text-rose-600 hover:text-rose-700"
                  title="Delete"
                  onClick={() => deleteUser(u.id, u.name)}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          ))}
          {activeUsers.length === 0 && <p className="text-sm text-muted-foreground">No team members yet.</p>}
        </div>

        {pendingInvites.length > 0 && (
          <div className="space-y-1.5">
            <p className="text-xs font-medium text-muted-foreground">Pending invites</p>
            {pendingInvites.map((i) => (
              <div key={i.id} className="flex items-center justify-between gap-3 rounded-md border border-dashed px-3 py-2 text-sm">
                <div className="min-w-0">
                  <p className="font-medium truncate">{i.name}</p>
                  <p className="text-xs text-muted-foreground capitalize">{i.role}</p>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <code className="rounded bg-muted px-2 py-1 text-xs">{i.code}</code>
                  <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => copyCode(i.id, i.code)} title="Copy code">
                    {copiedId === i.id ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                  </Button>
                  <Button size="icon" variant="ghost" className="h-7 w-7 text-rose-600 hover:text-rose-700" onClick={() => revokeInvite(i.id)} title="Revoke">
                    <Ban className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="rounded-md border p-3 space-y-2">
          <p className="text-sm font-medium flex items-center gap-1.5">
            <UserPlus className="h-3.5 w-3.5" /> Invite a team member
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
              <Label className="text-xs">Designation</Label>
              <Select value={form.role} onValueChange={(v) => setForm({ ...form, role: v as Role })}>
                <SelectTrigger className="h-8">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(ROLE_LABELS) as Role[]).map((r) => (
                    <SelectItem key={r} value={r}>
                      {ROLE_LABELS[r]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          {error && <p className="text-xs text-rose-600">{error}</p>}
          <div className="flex justify-end">
            <Button size="sm" onClick={generateInvite} disabled={saving || !form.name}>
              {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              Generate invite code
            </Button>
          </div>
        </div>

        {otherInvites.length > 0 && (
          <p className="text-xs text-muted-foreground">
            {otherInvites.filter((i) => i.status === 'redeemed').length} invite(s) redeemed ·{' '}
            {otherInvites.filter((i) => i.status === 'revoked').length} revoked
          </p>
        )}
      </CardContent>
    </Card>
  )
}
