import crypto from 'crypto'
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { sendEmail } from '@/lib/email'
import { readJsonBody } from '@/lib/http'

export const dynamic = 'force-dynamic'

const TOKEN_TTL_MS = 30 * 60 * 1000

// Public route — no requireApiUser(). Anyone can ask for a signup link;
// they still land as a 'pending' account with no access until an admin
// approves them from Organisation. Excluded from proxy.ts's auth wall.
export async function POST(req: Request) {
  const body = await readJsonBody(req)
  if (body instanceof NextResponse) return body
  const email = String(body.email ?? '').trim().toLowerCase()

  if (!email || !email.includes('@')) {
    return NextResponse.json({ error: 'A valid email is required' }, { status: 400 })
  }

  const existingUser = await prisma.user.findUnique({ where: { email } })
  if (existingUser) {
    return NextResponse.json({ error: 'That email is already registered — log in instead' }, { status: 409 })
  }

  const token = crypto.randomBytes(32).toString('base64url')
  await prisma.signupToken.create({
    data: { email, token, expiresAt: new Date(Date.now() + TOKEN_TTL_MS) },
  })

  const origin = new URL(req.url).origin
  const link = `${origin}/signup/complete?token=${token}`

  try {
    await sendEmail({
      to: email,
      subject: 'Finish setting up your LRM_blu account',
      body: `Click the link below to set your name and password and finish creating your account:\n\n${link}\n\nThis link expires in 30 minutes. If you didn't request this, you can ignore this email.`,
    })
  } catch (err) {
    return NextResponse.json(
      { error: 'Could not send the email — please try again shortly or contact an admin' },
      { status: 502 }
    )
  }

  return NextResponse.json({ ok: true })
}
