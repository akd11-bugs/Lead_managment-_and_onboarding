'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Loader2, Building2, Plus } from 'lucide-react'

interface OrgRow {
  id: string
  name: string
  parentOrgId: string | null
}

// Renders the caller's visible org tree (self + descendants — see
// lib/session.ts's visibleOrgIds) as a simple indented list, with a form to
// add a child org under any node in that tree. Flat rollup visibility today;
// editing a descendant org's own users/invites still happens from that org's
// own admin session (see the plan's Phase 1 note on read-vs-manage scope).
export function OrgHierarchyPanel({
  currentOrgId,
  initialOrganizations,
}: {
  currentOrgId: string
  initialOrganizations: OrgRow[]
}) {
  const [orgs, setOrgs] = useState(initialOrganizations)
  const [name, setName] = useState('')
  const [parentOrgId, setParentOrgId] = useState(currentOrgId)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const byParent = new Map<string, OrgRow[]>()
  for (const org of orgs) {
    const key = org.parentOrgId ?? '__root__'
    const list = byParent.get(key) ?? []
    list.push(org)
    byParent.set(key, list)
  }

  async function createChild() {
    if (!name.trim()) return
    setSaving(true)
    setError(null)
    try {
      const res = await fetch('/api/organizations', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), parentOrgId }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error ?? 'Failed to create organization')
        return
      }
      setOrgs((prev) => [...prev, data.organization])
      setName('')
    } finally {
      setSaving(false)
    }
  }

  function renderNode(org: OrgRow, depth: number) {
    const children = byParent.get(org.id) ?? []
    return (
      <div key={org.id}>
        <div className="flex items-center gap-2 py-1 text-sm" style={{ paddingLeft: depth * 16 }}>
          <Building2 className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
          <span className="font-medium">{org.name}</span>
          {org.id === currentOrgId && (
            <Badge variant="outline" className="text-[10px]">
              you
            </Badge>
          )}
        </div>
        {children.map((c) => renderNode(c, depth + 1))}
      </div>
    )
  }

  const roots = byParent.get('__root__') ?? []

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Organizations</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-0.5">
          {roots.map((r) => renderNode(r, 0))}
          {orgs.length === 0 && <p className="text-sm text-muted-foreground">No organizations visible.</p>}
        </div>

        <div className="rounded-md border p-3 space-y-2">
          <p className="text-sm font-medium flex items-center gap-1.5">
            <Plus className="h-3.5 w-3.5" /> Add a sub-organization
          </p>
          <div className="flex gap-2">
            <select
              className="h-8 rounded-md border bg-background px-2 text-xs"
              value={parentOrgId}
              onChange={(e) => setParentOrgId(e.target.value)}
            >
              {orgs.map((o) => (
                <option key={o.id} value={o.id}>
                  under: {o.name}
                </option>
              ))}
            </select>
            <Input className="h-8" placeholder="Org name" value={name} onChange={(e) => setName(e.target.value)} />
            <Button size="sm" onClick={createChild} disabled={saving || !name.trim()}>
              {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              Add
            </Button>
          </div>
          {error && <p className="text-xs text-rose-600">{error}</p>}
        </div>
      </CardContent>
    </Card>
  )
}
