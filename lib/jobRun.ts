import { prisma } from '@/lib/db'

export interface RecordJobRunInput {
  orgId?: string
  jobKey: string
  status: 'success' | 'failure'
  startedAt: Date
  error?: string
}

// Written once at the end of every cron-route handler — backs the ops
// dashboard's "last run" health view without depending on GitHub Actions API
// access (this session couldn't authenticate to that from inside the app).
export async function recordJobRun(input: RecordJobRunInput): Promise<void> {
  await prisma.jobRun.create({
    data: {
      orgId: input.orgId ?? null,
      jobKey: input.jobKey,
      status: input.status,
      startedAt: input.startedAt,
      finishedAt: new Date(),
      error: input.error ?? null,
    },
  })
}
