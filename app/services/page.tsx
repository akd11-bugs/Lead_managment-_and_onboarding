import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Mail, Users, Megaphone, PhoneCall, Handshake, LineChart, ArrowRight } from 'lucide-react'
import { SERVICES } from '@/lib/services/catalog'

const ICONS: Record<string, React.ReactNode> = {
  email: <Mail className="h-5 w-5" />,
  'lead-capture': <Users className="h-5 w-5" />,
  'paid-ads': <Megaphone className="h-5 w-5" />,
  outbound: <PhoneCall className="h-5 w-5" />,
  calls: <Handshake className="h-5 w-5" />,
  deals: <Handshake className="h-5 w-5" />,
  reports: <LineChart className="h-5 w-5" />,
}

export default function ServicesPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Services</h1>
        <p className="text-sm text-muted-foreground">
          Real workflows with skills embedded — not a flat list of 30 skills.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Link href="/services/email">
          <Card className="h-full transition-colors hover:border-blue-400 hover:bg-accent/40">
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                {ICONS.email}
                Email
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <p className="text-sm text-muted-foreground">
                Send to a lead or someone new, plus deliverability and cadence checks.
              </p>
              <span className="flex items-center gap-1 text-xs text-blue-600">
                Open <ArrowRight className="h-3 w-3" />
              </span>
            </CardContent>
          </Card>
        </Link>

        {SERVICES.map((s) => (
          <Link key={s.slug} href={`/services/${s.slug}`}>
            <Card className="h-full transition-colors hover:border-blue-400 hover:bg-accent/40">
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  {ICONS[s.slug]}
                  {s.name}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <p className="text-sm text-muted-foreground">{s.description}</p>
                <span className="flex items-center gap-1 text-xs text-blue-600">
                  Open <ArrowRight className="h-3 w-3" />
                </span>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  )
}
