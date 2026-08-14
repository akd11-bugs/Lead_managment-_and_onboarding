import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { sendEmail } from '@/lib/email'
import { requireApiUser, leadScope } from '@/lib/session'
import { readJsonBody } from '@/lib/http'

export const dynamic = 'force-dynamic'

export async function POST(req: Request) {
  const user = await requireApiUser()
  if (user instanceof NextResponse) return user
  const body = await readJsonBody(req)
  if (body instanceof NextResponse) return body
  const { leadId, to, subject, body: emailBody } = body

  if (!subject || !emailBody) {
    return NextResponse.json({ error: 'subject and body are required' }, { status: 400 })
  }
  if (!leadId && !to) {
    return NextResponse.json({ error: 'Provide either leadId or a custom "to" address' }, { status: 400 })
  }

  // Lead-scoped send: look up the address, log it as an Activity on that lead.
  if (leadId) {
    const lead = await prisma.lead.findFirst({ where: { id: leadId, ...leadScope(user) } })
    if (!lead) {
      return NextResponse.json({ error: 'Lead not found' }, { status: 404 })
    }
    try {
      const result = await sendEmail({ to: lead.email, subject, body: emailBody })

      const activity = await prisma.activity.create({
        data: {
          leadId,
          type: 'email',
          description: `Sent: "${subject}"\n\n${emailBody}`,
          authorName: user.name,
        },
      })
      await prisma.lead.update({ where: { id: leadId }, data: { lastActivityAt: activity.date } })

      return NextResponse.json({ ok: true, emailId: result.id, activity })
    } catch (err) {
      return NextResponse.json({ error: err instanceof Error ? err.message : String(err) }, { status: 502 })
    }
  }

  // Custom recipient — not a lead in the system, so there's nothing to log an Activity against.
  try {
    const result = await sendEmail({ to, subject, body: emailBody })
    return NextResponse.json({ ok: true, emailId: result.id })
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : String(err) }, { status: 502 })
  }
}
