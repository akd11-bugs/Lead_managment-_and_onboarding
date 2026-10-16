import { requireUser } from '@/lib/session'
import { WhiteboardCanvas } from '@/components/whiteboard/WhiteboardCanvas'
import { RoomProvider } from '@/lib/liveblocksConfig'

export const dynamic = 'force-dynamic'

export default async function WhiteboardPage() {
  const user = await requireUser()
  return (
    <div className="flex h-[calc(100vh-7.5rem)] flex-col -mx-4 md:-mx-6 -my-6">
      <RoomProvider id={`whiteboard:${user.orgId}`} initialPresence={{ cursor: null, editingId: null }}>
        <WhiteboardCanvas />
      </RoomProvider>
    </div>
  )
}
