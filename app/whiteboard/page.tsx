import { requireUser } from '@/lib/session'
import { WhiteboardCanvas } from '@/components/whiteboard/WhiteboardCanvas'

export const dynamic = 'force-dynamic'

export default async function WhiteboardPage() {
  await requireUser()
  return (
    <div className="flex h-[calc(100vh-7.5rem)] flex-col -mx-4 md:-mx-6 -my-6">
      <WhiteboardCanvas />
    </div>
  )
}
