import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { formatDateTime } from '@/lib/utils'

export const ACTION_LABELS: Record<string, string> = {
  login_success: 'Login succeeded',
  login_failed: 'Login failed',
  login_locked: 'Account locked',
  oauth_signup_pending: 'Google sign-in (awaiting approval)',
  invite_created: 'Invite created',
  invite_revoked: 'Invite revoked',
  invite_redeemed: 'Invite redeemed',
  user_role_changed: 'Role changed',
  user_deactivated: 'User deactivated',
  user_activated: 'User reactivated',
  user_deleted: 'User deleted',
}

export const ACTION_TONE: Record<string, 'outline' | 'secondary' | 'destructive'> = {
  login_failed: 'destructive',
  login_locked: 'destructive',
  user_deleted: 'destructive',
  user_deactivated: 'secondary',
}

export interface AuditLogRow {
  id: string
  createdAt: Date | string
  action: string
  actorName: string | null
  targetLabel: string | null
}

// Pure presentational table, split out of app/settings/audit-log/page.tsx so
// the same markup can be shown on the marketing page with seeded rows — no
// database, no session — instead of a drawn lookalike.
export function AuditLogTable({ rows, title }: { rows: AuditLogRow[]; title?: string }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">{title ?? 'Recent activity'}</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-xs uppercase tracking-wide">
              <tr className="text-left">
                <th className="px-4 py-2 font-medium">When</th>
                <th className="px-4 py-2 font-medium">Action</th>
                <th className="px-4 py-2 font-medium">Actor</th>
                <th className="px-4 py-2 font-medium">Target</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {rows.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-4 py-10 text-center text-muted-foreground">
                    No events logged yet.
                  </td>
                </tr>
              )}
              {rows.map((log) => (
                <tr key={log.id}>
                  <td className="px-4 py-2 text-muted-foreground whitespace-nowrap">{formatDateTime(log.createdAt)}</td>
                  <td className="px-4 py-2">
                    <Badge variant={ACTION_TONE[log.action] ?? 'outline'} className="text-[10px]">
                      {ACTION_LABELS[log.action] ?? log.action}
                    </Badge>
                  </td>
                  <td className="px-4 py-2">{log.actorName ?? <span className="text-muted-foreground">—</span>}</td>
                  <td className="px-4 py-2 text-muted-foreground">{log.targetLabel ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  )
}
