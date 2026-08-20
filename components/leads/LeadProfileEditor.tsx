'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Mail, Phone, User as UserIcon, Globe, Building2, DollarSign, Calendar } from 'lucide-react'
import { formatRelative } from '@/lib/utils'
import { BUSINESS_TYPES, BUSINESS_TYPE_LABELS, type BusinessType } from '@/lib/types'

interface LeadProfileEditorProps {
  leadId: string
  email: string
  phone: string | null
  poc: string | null
  website: string | null
  industry: string | null
  businessType: BusinessType | null
  ownerName: string
  estimatedVolume: number
  lastActivityAt: string | Date | null
}

export function LeadProfileEditor({
  leadId,
  email,
  phone,
  poc,
  website,
  industry,
  businessType,
  ownerName,
  estimatedVolume,
  lastActivityAt,
}: LeadProfileEditorProps) {
  const router = useRouter()
  const [saving, setSaving] = useState(false)

  async function patch(field: string, value: unknown) {
    setSaving(true)
    try {
      await fetch(`/api/leads/${leadId}`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ [field]: value }),
      })
      router.refresh()
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      <Card>
        <CardContent className="p-5 grid grid-cols-2 md:grid-cols-4 gap-4">
          <Field icon={<DollarSign className="h-4 w-4" />} label="Est. Volume">
            <Input
              type="number"
              defaultValue={estimatedVolume}
              className="h-8"
              onBlur={(e) => {
                const v = Number(e.target.value)
                if (v !== estimatedVolume) patch('estimatedVolume', v)
              }}
              disabled={saving}
            />
          </Field>
          <Field icon={<UserIcon className="h-4 w-4" />} label="Owner">
            <Input
              defaultValue={ownerName}
              className="h-8"
              onBlur={(e) => {
                if (e.target.value !== ownerName) patch('ownerName', e.target.value)
              }}
              disabled={saving}
            />
          </Field>
          <Field icon={<Calendar className="h-4 w-4" />} label="Last activity">
            <p className="mt-1 text-sm font-medium truncate">
              {lastActivityAt ? formatRelative(lastActivityAt) : 'Never'}
            </p>
          </Field>
          <Field icon={<Mail className="h-4 w-4" />} label="Email">
            <Input
              type="email"
              defaultValue={email}
              className="h-8"
              onBlur={(e) => {
                if (e.target.value !== email) patch('email', e.target.value)
              }}
              disabled={saving}
            />
          </Field>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Company profile</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Field icon={<UserIcon className="h-4 w-4" />} label="POC">
            <Input
              defaultValue={poc ?? ''}
              className="h-8"
              placeholder="Point of contact"
              onBlur={(e) => {
                if (e.target.value !== (poc ?? '')) patch('poc', e.target.value || null)
              }}
              disabled={saving}
            />
          </Field>
          <Field icon={<Phone className="h-4 w-4" />} label="Phone">
            <Input
              type="tel"
              defaultValue={phone ?? ''}
              className="h-8"
              placeholder="Phone number"
              onBlur={(e) => {
                if (e.target.value !== (phone ?? '')) patch('phone', e.target.value || null)
              }}
              disabled={saving}
            />
          </Field>
          <Field icon={<Globe className="h-4 w-4" />} label="Website">
            <Input
              defaultValue={website ?? ''}
              className="h-8"
              placeholder="https://…"
              onBlur={(e) => {
                if (e.target.value !== (website ?? '')) patch('website', e.target.value || null)
              }}
              disabled={saving}
            />
          </Field>
          <Field icon={<Building2 className="h-4 w-4" />} label="Industry">
            <Input
              defaultValue={industry ?? ''}
              className="h-8"
              placeholder="Fashion, Apparel, F&B…"
              onBlur={(e) => {
                if (e.target.value !== (industry ?? '')) patch('industry', e.target.value || null)
              }}
              disabled={saving}
            />
          </Field>
          <Field icon={<Building2 className="h-4 w-4" />} label="Business type">
            <Select
              value={businessType ?? 'unset'}
              onValueChange={(v) => patch('businessType', v === 'unset' ? null : v)}
              disabled={saving}
            >
              <SelectTrigger className="h-8">
                <SelectValue placeholder="Not set" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="unset">Not set</SelectItem>
                {BUSINESS_TYPES.map((b) => (
                  <SelectItem key={b} value={b}>
                    {BUSINESS_TYPE_LABELS[b]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
        </CardContent>
      </Card>
    </>
  )
}

function Field({ icon, label, children }: { icon: React.ReactNode; label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs uppercase tracking-wide text-muted-foreground flex items-center gap-1.5">
        {icon} {label}
      </p>
      <div className="mt-1">{children}</div>
    </div>
  )
}
