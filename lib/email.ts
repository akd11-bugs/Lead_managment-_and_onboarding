import nodemailer from 'nodemailer'
import { prisma } from '@/lib/db'
import { decrypt, DecryptionError } from '@/lib/crypto'

export interface SendEmailInput {
  to: string
  subject: string
  body: string
}

export interface SendEmailResult {
  id: string
}

let transporter: ReturnType<typeof nodemailer.createTransport> | null = null

function getTransporter() {
  if (transporter) return transporter

  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS } = process.env
  if (!SMTP_HOST || !SMTP_PORT || !SMTP_USER || !SMTP_PASS) {
    throw new Error(
      'SMTP is not configured. Set SMTP_HOST, SMTP_PORT, SMTP_USER, and SMTP_PASS in .env to send email.'
    )
  }

  transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: Number(SMTP_PORT),
    secure: Number(SMTP_PORT) === 465,
    auth: { user: SMTP_USER, pass: SMTP_PASS },
  })
  return transporter
}

export async function sendEmail(input: SendEmailInput): Promise<SendEmailResult> {
  const from = process.env.EMAIL_FROM || process.env.SMTP_USER

  const info = await getTransporter().sendMail({
    from,
    to: input.to,
    subject: input.subject,
    text: input.body,
  })

  return { id: info.messageId }
}

/**
 * Sends as the given user's own configured Gmail app password, if they have
 * one — falls back to the shared app mailbox (sendEmail) if they don't, or
 * if the stored credential fails to decrypt (e.g. key rotated).
 */
export async function sendEmailAs(userId: string, input: SendEmailInput): Promise<SendEmailResult> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { emailFromAddress: true, emailAppPasswordEnc: true },
  })

  if (!user?.emailFromAddress || !user.emailAppPasswordEnc) {
    return sendEmail(input)
  }

  let appPassword: string
  try {
    appPassword = decrypt(user.emailAppPasswordEnc)
  } catch (err) {
    if (err instanceof DecryptionError) return sendEmail(input)
    throw err
  }

  const personalTransporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 465,
    secure: true,
    auth: { user: user.emailFromAddress, pass: appPassword },
  })
  const info = await personalTransporter.sendMail({
    from: user.emailFromAddress,
    to: input.to,
    subject: input.subject,
    text: input.body,
  })
  return { id: info.messageId }
}
