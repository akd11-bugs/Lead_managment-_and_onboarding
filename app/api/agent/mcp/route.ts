import { NextResponse } from 'next/server'
import { requireAgentOrg } from '@/lib/agentAuth'
import { handleRpc, isSupportedVersion, rpcError, RpcError, type JsonRpcRequest } from '@/lib/mcp/protocol'
import { TOOLS, type McpCtx } from '@/lib/mcp/tools'

export const dynamic = 'force-dynamic'

// MCP endpoint: lets Claude Desktop, Claude Code, or any MCP client operate
// this workspace's CRM directly. Authenticated with the same per-org agent
// API key as /api/agent/v1/* (Settings → Agent API key), so the key is the
// tenant scope and a client can only ever see one workspace.
//
// Returns plain application/json rather than opening an SSE stream. The
// transport spec allows either for a request; nothing here pushes
// server-initiated messages, so a stream would add reconnection and
// resumability concerns for no benefit.

const SERVER_INFO = {
  name: 'steadfast',
  version: '1.0.0',
  instructions:
    'Steadfast CRM. Search and read leads, create them, log activities, and move pipeline stages. ' +
    'Every write is attributed to "AI Agent" in the lead timeline, never to a human user. ' +
    'Prefer pipeline_summary over paging all leads for overview questions.',
}

// Per the spec's DNS-rebinding warning: a browser on a malicious page must
// not be able to drive this endpoint using an ambiently-stored key. Non-
// browser clients (Claude Desktop, CLI tools) send no Origin at all and are
// unaffected; a browser always sends one on cross-origin POST.
function originAllowed(req: Request): boolean {
  const origin = req.headers.get('origin')
  if (!origin) return true

  const forwardedHost = req.headers.get('x-forwarded-host')
  const host = forwardedHost ?? new URL(req.url).host
  try {
    return new URL(origin).host === host
  } catch {
    return false
  }
}

export async function POST(req: Request) {
  if (!originAllowed(req)) {
    return NextResponse.json({ error: 'Forbidden origin' }, { status: 403 })
  }

  const version = req.headers.get('mcp-protocol-version')
  if (!isSupportedVersion(version)) {
    return NextResponse.json({ error: `Unsupported MCP-Protocol-Version: ${version}` }, { status: 400 })
  }

  // Auth before parsing: an unauthenticated caller should not get to exercise
  // the JSON parser, and requireAgentOrg carries the rate limiting.
  const agentOrg = await requireAgentOrg(req)
  if (agentOrg instanceof NextResponse) return agentOrg

  let message: JsonRpcRequest
  try {
    message = await req.json()
  } catch {
    return NextResponse.json(rpcError(null, RpcError.PARSE, 'Invalid JSON'), { status: 400 })
  }

  if (!message || message.jsonrpc !== '2.0' || typeof message.method !== 'string') {
    return NextResponse.json(rpcError(message?.id ?? null, RpcError.INVALID_REQUEST, 'Invalid JSON-RPC request'), {
      status: 400,
    })
  }

  const ctx: McpCtx = { orgId: agentOrg.orgId }

  try {
    const response = await handleRpc(message, TOOLS, SERVER_INFO, ctx)
    // Notifications get 202 with no body, per the transport spec.
    if (response === null) return new NextResponse(null, { status: 202 })
    return NextResponse.json(response)
  } catch (err) {
    // Never leak internals to an external caller; operators get the detail.
    console.error('[mcp] handler failed', err)
    return NextResponse.json(rpcError(message.id ?? null, RpcError.INTERNAL, 'Internal error'), { status: 500 })
  }
}

// The spec allows a server with no server-initiated messages to decline the
// GET/SSE stream outright.
export function GET() {
  return new NextResponse(null, { status: 405, headers: { Allow: 'POST' } })
}
