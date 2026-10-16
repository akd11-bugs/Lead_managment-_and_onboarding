import Link from 'next/link'
import { redirect } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { AuditLogTable, type AuditLogRow } from '@/components/settings/AuditLogTable'
import { requireUser, isAdmin } from '@/lib/session'
import { prisma } from '@/lib/db'

export const dynamic = 'force-dynamic'

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

  const rows: AuditLogRow[] = logs.map((log) => {
    const actor = log.actorUserId ? userById.get(log.actorUserId) : null
    const target = log.targetUserId ? userById.get(log.targetUserId) : null
    const invite = log.targetInviteId ? inviteById.get(log.targetInviteId) : null
    return {
      id: log.id,
      createdAt: log.createdAt,
      action: log.action,
      actorName: actor?.name ?? null,
      targetLabel: target ? target.name : invite ? `Invite: ${invite.name}` : null,
    }
  })

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

      <AuditLogTable rows={rows} />
    </div>
  )
}
