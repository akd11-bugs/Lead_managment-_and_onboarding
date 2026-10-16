'use client'

import { createClient } from '@liveblocks/client'
import { createRoomContext } from '@liveblocks/react'

// A consistent, if arbitrary, color per connection — assigned by Liveblocks
// from each user's connectionId, not stored anywhere. Good enough to tell
// two cursors apart; not meant to be a stable per-user brand color.
export const CURSOR_COLORS = ['#2f5bff', '#c21e75', '#2fcf7a', '#f0ff3d', '#ff6b3d', '#9d5cff']

const client = createClient({ authEndpoint: '/api/liveblocks-auth' })

// Presence is deliberately the ONLY thing Liveblocks carries — cursor
// position (in whiteboard world-space, already pan/zoom-adjusted so it
// lines up regardless of each viewer's own pan/zoom) and which element (if
// any) this user is currently dragging/editing. Actual board content
// (sticky notes, shapes) stays the durable source of truth in Postgres via
// the existing /api/whiteboard/elements routes — Liveblocks never stores or
// persists anything here, it only broadcasts ephemeral "who's doing what
// right now" to everyone else in the room.
type Presence = {
  cursor: { x: number; y: number } | null
  editingId: string | null
}

type UserMeta = {
  id: string
  info: { name: string }
}

export const { RoomProvider, useMyPresence, useUpdateMyPresence, useOthers } = createRoomContext<
  Presence,
  Record<string, never>,
  UserMeta
>(client)
