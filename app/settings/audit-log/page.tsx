import Link from 'next/link'
import { redirect } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { requireUser, isAdmin } from '@/lib/session'
import { prisma } from '@/lib/db'
import { formatDateTime } from '@/lib/utils'

export const dynamic = 'force-dynamic'

const ACTION_LABELS: Record<string, string> = {
  login_success: 'Login succeeded',
  login_failed: 'Login failed',
  login_locked: 'Account locked',
  invite_created: 'Invite created',
  invite_revoked: 'Invite revoked',
  invite_redeemed: 'Invite redeemed',
  user_role_changed: 'Role changed',
  user_deactivated: 'User deactivated',
  user_activated: 'User reactivated',
  user_deleted: 'User deleted',
}

const ACTION_TONE: Record<string, 'outline' | 'secondary' | 'destructive'> = {
  login_failed: 'destructive',
  login_locked: 'destructive',
  user_deleted: 'destructive',
  user_deactivated: 'secondary',
}

export default async function AuditLogPage() {
  const user = await requireUser()
  if (!isAdmin(user)) redirect('/settings')

  const logs = await prisma.auditLog.findMany({ orderBy: { createdAt: 'desc' }, take: 100 })

  const userIds = Array.from(
    new Set(logs.flatMap((l) => [l.actorUserId, l.targetUserId]).filter((id): id is string => !!id))
  )
  const inviteIds = Array.from(new Set(logs.map((l) => l.targetInviteId).filter((id): id is string => !!id)))

  const [users, invites] = await Promise.all([
    userIds.length ? prisma.user.findMany({ where: { id: { in: userIds } }, select: { id: true, name: true, email: true } }) : [],
    inviteIds.length ? prisma.invite.findMany({ where: { id: { in: inviteIds } }, select: { id: true, name: true } }) : [],
  ])
  const userById = new Map(users.map((u) => [u.id, u]))
  const inviteById = new Map(invites.map((i) => [i.id, i]))

  return (
    <div className="space-y-4 max-w-4xl">
      <div className="flex items-center gap-3">
        <Link href="/settings">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Audit log</h1>
          <p className="text-sm text-muted-foreground">Last {logs.length} auth and organisation events, most recent first.</p>
        </div>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Recent activity</CardTitle>
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
                {logs.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-4 py-10 text-center text-muted-foreground">
                      No events logged yet.
                    </td>
                  </tr>
                )}
                {logs.map((log) => {
                  const actor = log.actorUserId ? userById.get(log.actorUserId) : null
                  const target = log.targetUserId ? userById.get(log.targetUserId) : null
                  const invite = log.targetInviteId ? inviteById.get(log.targetInviteId) : null
                  return (
                    <tr key={log.id}>
                      <td className="px-4 py-2 text-muted-foreground whitespace-nowrap">{formatDateTime(log.createdAt)}</td>
                      <td className="px-4 py-2">
                        <Badge variant={ACTION_TONE[log.action] ?? 'outline'} className="text-[10px]">
                          {ACTION_LABELS[log.action] ?? log.action}
                        </Badge>
                      </td>
                      <td className="px-4 py-2">{actor ? actor.name : <span className="text-muted-foreground">—</span>}</td>
                      <td className="px-4 py-2 text-muted-foreground">
                        {target ? target.name : invite ? `Invite: ${invite.name}` : '—'}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
