import { NextResponse } from 'next/server'
import { requireAgentOrg } from '@/lib/agentAuth'
import { handleRpc, rpcError, RpcError, type JsonRpcRequest } from '@/lib/mcp/protocol'
import { TOOLS, type McpCtx } from '@/lib/mcp/tools'
import { buildProxyToolsForOrg } from '@/lib/mcp/connections'

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

  // Not version-gated: this server only ever implements the small, version-
  // stable subset below (initialize/ping/tools), so it has nothing to refuse
  // over a client sending a newer dated MCP-Protocol-Version than it's seen
  // before — it just answers with its own PROTOCOL_VERSION, same as always.
  // A hard allowlist here previously broke newer clients (including
  // Claude.ai's own connector health-check) with a 400 the moment MCP
  // shipped a new date.

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

  // Only tools/list and tools/call need the merged tool set — every other
  // method (initialize, ping, notifications) never touches `tools` at all,
  // so skip the live handshake against every connected third-party server
  // on those. tools/call still re-handshakes on every call rather than
  // caching: no caching layer exists yet, and correctness (never calling a
  // tool a connection no longer actually exposes) matters more than the
  // extra round-trip for a first version of this feature.
  const needsTools = message.method === 'tools/list' || message.method === 'tools/call'
  const tools = needsTools ? [...TOOLS, ...(await buildProxyToolsForOrg(agentOrg.orgId))] : TOOLS

  try {
    const response = await handleRpc(message, tools, SERVER_INFO, ctx)
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
// GET/SSE stream outright, but clients (e.g. Claude.ai's connector setup)
// send an unauthenticated GET first to discover the auth scheme via
// WWW-Authenticate before ever trying the real POST. A bare 405 with no
// header gives it nothing to infer from, so it defaults to assuming OAuth —
// which this server doesn't implement — and the subsequent POST then
// mismatches whatever the user picked. Answering 401 + WWW-Authenticate:
// Bearer here tells it up front this is a plain bearer-token server.
export function GET() {
  return new NextResponse(null, {
    status: 401,
    headers: { 'WWW-Authenticate': 'Bearer', Allow: 'POST' },
  })
}
