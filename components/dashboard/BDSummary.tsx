import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { StatTile, CurrencyTile } from '@/components/dashboard/StatTile'
import { formatCurrencyCompact } from '@/lib/utils'
import { Handshake, Store, CalendarClock } from 'lucide-react'

export interface BDOwnerRow {
  ownerName: string
  partnersOnboarded: number
  merchantsOnboarded: number
  expectedCount: number
  expectedVolume: number
}

export interface BDSummaryData {
  partnersOnboarded: number
  merchantsOnboarded: number
  expectedCount: number
  expectedVolume: number
  byOwner: BDOwnerRow[]
}

export function BDSummary({ data }: { data: BDSummaryData }) {
  return (
    <div className="space-y-3">
      <div>
        <h2 className="text-sm font-semibold">BD Summary — this month</h2>
        <p className="text-xs text-muted-foreground">
          Partners/merchants onboarded so far, and what&apos;s forecast to close by month end.
        </p>
      </div>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Link href="/leads?filter=partners-onboarded" className="block transition-opacity hover:opacity-80">
          <StatTile label="Partners onboarded" value={data.partnersOnboarded} icon={<Handshake className="h-4 w-4" />} />
        </Link>
        <Link href="/leads?filter=merchants-onboarded" className="block transition-opacity hover:opacity-80">
          <StatTile label="Merchants onboarded" value={data.merchantsOnboarded} icon={<Store className="h-4 w-4" />} />
        </Link>
        <Link href="/leads?filter=expected-to-onboard" className="block transition-opacity hover:opacity-80">
          <StatTile
            label="Expected to onboard"
            value={data.expectedCount}
            hint="by month end"
            icon={<CalendarClock className="h-4 w-4" />}
          />
        </Link>
        <Link href="/leads?filter=expected-to-onboard" className="block transition-opacity hover:opacity-80">
          <CurrencyTile label="Expected volume" value={data.expectedVolume} hint={formatCurrencyCompact(data.expectedVolume)} />
        </Link>
      </div>

      {data.byOwner.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">By rep</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-xs text-muted-foreground">
                  <tr className="text-left">
                    <th className="py-1.5 pr-4 font-medium">Owner</th>
                    <th className="py-1.5 pr-4 font-medium">Partners onboarded</th>
                    <th className="py-1.5 pr-4 font-medium">Merchants onboarded</th>
                    <th className="py-1.5 pr-4 font-medium">Expected (month end)</th>
                    <th className="py-1.5 font-medium">Expected volume</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {data.byOwner.map((r) => (
                    <tr key={r.ownerName}>
                      <td className="py-1.5 pr-4 font-medium">
                        <Link href={`/leads?owner=${encodeURIComponent(r.ownerName)}`} className="hover:underline">
                          {r.ownerName}
                        </Link>
                      </td>
                      <td className="py-1.5 pr-4 tabular-nums">{r.partnersOnboarded}</td>
                      <td className="py-1.5 pr-4 tabular-nums">{r.merchantsOnboarded}</td>
                      <td className="py-1.5 pr-4 tabular-nums">{r.expectedCount}</td>
                      <td className="py-1.5 tabular-nums">{formatCurrencyCompact(r.expectedVolume)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="mt-2 text-[10px] text-muted-foreground">
              Sales reps see only their own row here; admin sees the whole team.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
