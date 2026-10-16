import { prisma } from '@/lib/db'

export type AuditAction =
  | 'login_success'
  | 'login_failed'
  | 'login_locked'
  | 'oauth_signup_pending'
  | 'signup_pending'
  | 'org_created'
  | 'user_created'
  | 'invite_created'
  | 'invite_revoked'
  | 'invite_redeemed'
  | 'user_role_changed'
  | 'user_deactivated'
  | 'user_activated'
  | 'user_deleted'
  | 'user_pin_reset'
  | 'rep_login_success'
  | 'rep_login_failed'
  | 'rep_login_locked'
  | 'custom_email_sent'
  | 'reports_api_key_generated'
  | 'reports_api_key_revoked'
  | 'agent_api_key_generated'
  | 'agent_api_key_revoked'

export async function logAudit(entry: {
  action: AuditAction
  actorUserId?: string | null
  targetUserId?: string | null
  targetInviteId?: string | null
  metadata?: Record<string, unknown>
}) {
  await prisma.auditLog.create({
    data: {
      action: entry.action,
      actorUserId: entry.actorUserId ?? null,
      targetUserId: entry.targetUserId ?? null,
      targetInviteId: entry.targetInviteId ?? null,
      metadata: entry.metadata ? JSON.stringify(entry.metadata) : null,
    },
  })
}
