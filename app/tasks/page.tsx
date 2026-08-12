import { prisma } from '@/lib/db'
import { requireUser, isAdmin } from '@/lib/session'
import { TasksList } from '@/components/tasks/TasksList'

export const dynamic = 'force-dynamic'

export default async function TasksPage() {
  const user = await requireUser()
  const tasks = await prisma.task.findMany({
    where: isAdmin(user) ? {} : { ownerId: user.id },
    orderBy: [{ done: 'asc' }, { dueDate: 'asc' }],
    include: { lead: { select: { id: true, company: true } } },
  })
  const serialized = tasks.map((t) => ({
    id: t.id,
    leadId: t.leadId,
    leadCompany: t.lead?.company ?? null,
    title: t.title,
    dueDate: t.dueDate,
    done: t.done,
    source: t.source,
    createdAt: t.createdAt,
  }))

  return (
    <div className="space-y-4 max-w-3xl">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Tasks</h1>
        <p className="text-sm text-muted-foreground">Follow-ups from leads, alerts, and manual reminders.</p>
      </div>
      <TasksList initialTasks={serialized as never} />
    </div>
  )
}
