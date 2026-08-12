'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Plus } from 'lucide-react'
import {
  STAGES,
  STAGE_LABELS,
  SOURCES,
  SOURCE_LABELS,
  LEAD_TYPES,
  LEAD_TYPE_LABELS,
  BUSINESS_TYPES,
  BUSINESS_TYPE_LABELS,
  type Stage,
  type LeadSource,
  type LeadType,
  type BusinessType,
} from '@/lib/types'

const NONE = '__none__'

export function NewLeadDialog({ children }: { children?: React.ReactNode }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    poc: '',
    company: '',
    email: '',
    phone: '',
    website: '',
    industry: '',
    businessType: '' as BusinessType | '',
    source: 'website' as LeadSource,
    stage: 'new' as Stage,
    type: 'merchant' as LeadType,
    estimatedVolume: '5000',
    notes: '',
  })

  async function handleSubmit() {
    if (!form.company || !form.email) return
    setSaving(true)
    try {
      const res = await fetch('/api/leads', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          ...form,
          businessType: form.businessType || null,
          estimatedVolume: Number(form.estimatedVolume),
        }),
      })
      if (res.ok) {
        setOpen(false)
        setForm({
          poc: '',
          company: '',
          email: '',
          phone: '',
          website: '',
          industry: '',
          businessType: '',
          source: 'website',
          stage: 'new',
          type: 'merchant',
          estimatedVolume: '5000',
          notes: '',
        })
        router.refresh()
      }
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children ?? (
          <Button size="sm">
            <Plus className="h-4 w-4" />
            New Lead
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>Add a new lead</DialogTitle>
          <DialogDescription>Capture details now. Follow up later — that's what the skills are for.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="company">Company</Label>
              <Input id="company" value={form.company} onChange={(e) => setForm({ ...form, company: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="poc">POC (optional)</Label>
              <Input id="poc" value={form.poc} onChange={(e) => setForm({ ...form, poc: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="phone">Phone (optional)</Label>
              <Input id="phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="website">Website (optional)</Label>
              <Input
                id="website"
                placeholder="https://…"
                value={form.website}
                onChange={(e) => setForm({ ...form, website: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="industry">Industry (optional)</Label>
              <Input
                id="industry"
                placeholder="Fashion, Apparel, F&B…"
                value={form.industry}
                onChange={(e) => setForm({ ...form, industry: e.target.value })}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Business type</Label>
              <Select
                value={form.businessType || NONE}
                onValueChange={(v) => setForm({ ...form, businessType: v === NONE ? '' : (v as BusinessType) })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Not set" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE}>Not set</SelectItem>
                  {BUSINESS_TYPES.map((b) => (
                    <SelectItem key={b} value={b}>{BUSINESS_TYPE_LABELS[b]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Source</Label>
              <Select value={form.source} onValueChange={(v) => setForm({ ...form, source: v as LeadSource })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SOURCES.map((s) => (
                    <SelectItem key={s} value={s}>{SOURCE_LABELS[s]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Type</Label>
              <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v as LeadType })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {LEAD_TYPES.map((t) => (
                    <SelectItem key={t} value={t}>{LEAD_TYPE_LABELS[t]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Stage</Label>
              <Select value={form.stage} onValueChange={(v) => setForm({ ...form, stage: v as Stage })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STAGES.map((s) => (
                    <SelectItem key={s} value={s}>{STAGE_LABELS[s]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="estimatedVolume">Est. Volume (₹)</Label>
            <Input
              id="estimatedVolume"
              type="number"
              value={form.estimatedVolume}
              onChange={(e) => setForm({ ...form, estimatedVolume: e.target.value })}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="notes">Notes</Label>
            <Textarea id="notes" rows={3} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={saving || !form.company || !form.email}>
            {saving ? 'Saving…' : 'Create lead'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
