import nodemailer from 'nodemailer'
import { prisma } from '@/lib/db'
import { tryDecrypt } from '@/lib/crypto'

export interface SendEmailInput {
  to: string
  subject: string
  body: string
}

export interface SendEmailResult {
  id: string
}

interface Mailbox {
  host: string
  port: number
  secure: boolean
  user: string
  pass: string
  from: string
}

// Shared by send() below and the org-email settings route's credential
// verification step (app/api/settings/org-email/route.ts) — one place for
// the transporter shape and timeouts. A transporter is cheap to build (no
// connection pooling needed at this scale — see lib/skills/runner.ts's
// dispatch pattern), so one is built fresh per send rather than cached per
// org/user: a cache would keep serving a stale password after someone
// rotates their credentials from Settings, until the process restarted.
export function createMailboxTransporter(opts: { host: string; port: number; secure: boolean; user: string; pass?: string }) {
  return nodemailer.createTransport({
    host: opts.host,
    port: opts.port,
    secure: opts.secure,
    auth: { user: opts.user, pass: opts.pass },
    // A slow response or a blocked outbound port otherwise hangs for
    // nodemailer's default (up to 10 min), well past any serverless
    // function timeout.
    connectionTimeout: 10_000,
    greetingTimeout: 10_000,
    socketTimeout: 10_000,
  })
}

async function send(mailbox: Mailbox, input: SendEmailInput): Promise<SendEmailResult> {
  const transporter = createMailboxTransporter(mailbox)
  const info = await transporter.sendMail({ from: mailbox.from, to: input.to, subject: input.subject, text: input.body })
  return { id: info.messageId }
}

function globalMailbox(): Mailbox {
  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, EMAIL_FROM } = process.env
  if (!SMTP_HOST || !SMTP_PORT || !SMTP_USER || !SMTP_PASS) {
    throw new Error(
      'SMTP is not configured. Set SMTP_HOST, SMTP_PORT, SMTP_USER, and SMTP_PASS in .env, or configure an org mailbox from Settings, to send email.'
    )
  }
  return {
    host: SMTP_HOST,
    port: Number(SMTP_PORT),
    secure: Number(SMTP_PORT) === 465,
    user: SMTP_USER,
    pass: SMTP_PASS,
    from: EMAIL_FROM || SMTP_USER,
  }
}

async function orgMailbox(orgId: string): Promise<Mailbox | null> {
  const config = await prisma.orgEmailConfig.findUnique({ where: { orgId } })
  if (!config) return null
  const pass = tryDecrypt(config.smtpPassEnc)
  if (!pass) return null
  return {
    host: config.smtpHost,
    port: config.smtpPort,
    secure: config.smtpSecure,
    user: config.smtpUser,
    pass,
    from: config.fromName ? `${config.fromName} <${config.fromAddress}>` : config.fromAddress,
  }
}

/**
 * Sends from the given org's own configured SMTP mailbox, if one is set —
 * falls back to the shared global mailbox (env-configured) otherwise, or if
 * the stored credential fails to decrypt (e.g. key rotated). Pass no orgId
 * to go straight to the global mailbox (e.g. pre-account signup emails,
 * which have no org yet).
 */
export async function sendEmail(input: SendEmailInput, orgId?: string): Promise<SendEmailResult> {
  const mailbox = (orgId ? await orgMailbox(orgId) : null) ?? globalMailbox()
  return send(mailbox, input)
}

/**
 * Sends as the given user's own configured Gmail app password, if they have
 * one — falls back to their org's mailbox, then the global shared mailbox,
 * if they don't, or if the stored credential fails to decrypt (e.g. key
 * rotated).
 */
export async function sendEmailAs(userId: string, input: SendEmailInput): Promise<SendEmailResult> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { orgId: true, emailFromAddress: true, emailAppPasswordEnc: true },
  })

  const pass = user?.emailAppPasswordEnc ? tryDecrypt(user.emailAppPasswordEnc) : null
  if (!user?.emailFromAddress || !pass) {
    return sendEmail(input, user?.orgId)
  }

  return send({ host: 'smtp.gmail.com', port: 465, secure: true, user: user.emailFromAddress, pass, from: user.emailFromAddress }, input)
}
