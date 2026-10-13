'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Mail, Phone, Briefcase } from 'lucide-react'
import { STAGE_LABELS, BUSINESS_TYPES, BUSINESS_TYPE_LABELS, type Stage, type BusinessType } from '@/lib/types'
import { formatCurrency } from '@/lib/utils'
import { HighlightsGrid, type Highlight } from '@/components/shared/HighlightsGrid'

export interface CompanyRecordData {
  id: string
  name: string
  website: string | null
  industry: string | null
  businessType: string | null
  people: { id: string; name: string; email: string | null; phone: string | null; jobTitle: string | null }[]
  leads: { id: string; estimatedVolume: number; stage: string; person: { name: string } | null }[]
}

export function CompanyRecordView({ initialCompany }: { initialCompany: CompanyRecordData }) {
  const router = useRouter()
  const [company, setCompany] = useState(initialCompany)
  const [saving, setSaving] = useState(false)

  async function patchCompany(patch: Partial<CompanyRecordData>) {
    setSaving(true)
    try {
      const res = await fetch(`/api/companies/${company.id}`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(patch),
      })
      if (res.ok) {
        const data = await res.json()
        setCompany({ ...company, ...data.company })
        router.refresh()
      }
    } finally {
      setSaving(false)
    }
  }

  const totalVolume = company.leads.reduce((sum, l) => sum + l.estimatedVolume, 0)

  const highlights: Highlight[] = [
    { label: 'Leads', value: company.leads.length },
    { label: 'Total value', value: formatCurrency(totalVolume) },
    { label: 'Contacts', value: company.people.length },
    { label: 'Industry', value: company.industry ?? 'Not set' },
  ]

  return (
    <>
      <HighlightsGrid items={highlights} />

      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="people">People ({company.people.length})</TabsTrigger>
          <TabsTrigger value="leads">Leads ({company.leads.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4 pt-2">
          <div className="grid grid-cols-2 gap-4 text-sm max-w-xl">
            <div className="space-y-1.5">
              <Label className="text-xs uppercase tracking-wide text-muted-foreground">Website</Label>
              <Input
                defaultValue={company.website ?? ''}
                placeholder="https://…"
                className="h-8"
                onBlur={(e) => {
                  if (e.target.value !== (company.website ?? '')) patchCompany({ website: e.target.value || null })
                }}
                disabled={saving}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs uppercase tracking-wide text-muted-foreground">Industry</Label>
              <Input
                defaultValue={company.industry ?? ''}
                placeholder="Fashion, Apparel, F&B…"
                className="h-8"
                onBlur={(e) => {
                  if (e.target.value !== (company.industry ?? '')) patchCompany({ industry: e.target.value || null })
                }}
                disabled={saving}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs uppercase tracking-wide text-muted-foreground">Business type</Label>
              <Select
                value={company.businessType ?? 'unset'}
                onValueChange={(v) => patchCompany({ businessType: v === 'unset' ? null : v })}
                disabled={saving}
              >
                <SelectTrigger className="h-8">
                  <SelectValue placeholder="Not set" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="unset">Not set</SelectItem>
                  {BUSINESS_TYPES.map((b) => (
                    <SelectItem key={b} value={b}>
                      {BUSINESS_TYPE_LABELS[b as BusinessType]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="people" className="pt-2 space-y-2">
          {company.people.length === 0 && <p className="text-sm text-muted-foreground">No contacts identified at this company yet.</p>}
          {company.people.map((person) => (
            <div key={person.id} className="flex items-center justify-between gap-3 rounded-md border p-3">
              <div className="min-w-0">
                <p className="font-medium truncate">{person.name}</p>
                <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                  {person.jobTitle && (
                    <span className="flex items-center gap-1">
                      <Briefcase className="h-3 w-3" />
                      {person.jobTitle}
                    </span>
                  )}
                  {person.email && (
                    <span className="flex items-center gap-1">
                      <Mail className="h-3 w-3" />
                      {person.email}
                    </span>
                  )}
                  {person.phone && (
                    <span className="flex items-center gap-1">
                      <Phone className="h-3 w-3" />
                      {person.phone}
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </TabsContent>

        <TabsContent value="leads" className="pt-2 space-y-2">
          {company.leads.length === 0 && <p className="text-sm text-muted-foreground">No leads yet.</p>}
          {company.leads.map((lead) => (
            <Link
              key={lead.id}
              href={`/leads/${lead.id}`}
              className="flex items-center justify-between gap-3 rounded-md border p-3 hover:bg-muted/40"
            >
              <div className="min-w-0">
                <p className="font-medium truncate">{lead.person?.name ?? 'No contact set'}</p>
                <p className="text-xs text-muted-foreground">{formatCurrency(lead.estimatedVolume)}</p>
              </div>
              <Badge variant="outline">{STAGE_LABELS[lead.stage as Stage] ?? lead.stage}</Badge>
            </Link>
          ))}
        </TabsContent>
      </Tabs>
    </>
  )
}
