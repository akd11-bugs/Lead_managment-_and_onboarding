// Minimal JSON-RPC 2.0 / MCP Streamable HTTP server.
//
// Hand-written rather than using @modelcontextprotocol/sdk: that package
// pulls in express, hono, cors, jose and ajv — a second HTTP framework
// inside a Next.js route handler, on a repo whose npm tree currently can't
// resolve new installs. The spec allows a plain `application/json` response
// instead of SSE, and sessions are optional, so the subset an unattended
// CRM agent actually needs is small enough to own outright.
//
// Spec: modelcontextprotocol.io/specification/2025-06-18/basic/transports

export const PROTOCOL_VERSION = '2025-06-18'

export type JsonRpcId = string | number | null

export interface JsonRpcRequest {
  jsonrpc: '2.0'
  id?: JsonRpcId
  method: string
  params?: Record<string, unknown>
}

// Standard JSON-RPC codes. -32002 is MCP's "resource/tool unavailable".
export const RpcError = {
  PARSE: -32700,
  INVALID_REQUEST: -32600,
  METHOD_NOT_FOUND: -32601,
  INVALID_PARAMS: -32602,
  INTERNAL: -32603,
} as const

export function rpcResult(id: JsonRpcId, result: unknown) {
  return { jsonrpc: '2.0' as const, id, result }
}

export function rpcError(id: JsonRpcId, code: number, message: string) {
  return { jsonrpc: '2.0' as const, id, error: { code, message } }
}

export interface ToolDef<Ctx> {
  name: string
  description: string
  inputSchema: Record<string, unknown>
  // Returns the text payload for the tool result. Throwing is fine —
  // handleRpc converts it to an MCP tool error rather than a transport error.
  run: (args: Record<string, unknown>, ctx: Ctx) => Promise<string>
}

export interface ServerInfo {
  name: string
  version: string
  instructions?: string
}

export async function handleRpc<Ctx>(
  message: JsonRpcRequest,
  tools: ToolDef<Ctx>[],
  info: ServerInfo,
  ctx: Ctx,
): Promise<object | null> {
  const { id, method } = message
  // A notification (no id) gets no response body — the caller returns 202.
  const isNotification = id === undefined

  switch (method) {
    case 'initialize':
      return isNotification
        ? null
        : rpcResult(id ?? null, {
            protocolVersion: PROTOCOL_VERSION,
            // Only tools. No resources/prompts/sampling, so we don't
            // advertise capabilities this server doesn't implement.
            capabilities: { tools: { listChanged: false } },
            serverInfo: { name: info.name, version: info.version },
            ...(info.instructions ? { instructions: info.instructions } : {}),
          })

    // Lifecycle notifications: acknowledge, do nothing.
    case 'notifications/initialized':
    case 'notifications/cancelled':
      return null

    case 'ping':
      return isNotification ? null : rpcResult(id ?? null, {})

    case 'tools/list':
      return isNotification
        ? null
        : rpcResult(id ?? null, {
            tools: tools.map((t) => ({
              name: t.name,
              description: t.description,
              inputSchema: t.inputSchema,
            })),
          })

    case 'tools/call': {
      if (isNotification) return null
      const params = (message.params ?? {}) as { name?: string; arguments?: Record<string, unknown> }
      const tool = tools.find((t) => t.name === params.name)
      if (!tool) {
        return rpcError(id ?? null, RpcError.INVALID_PARAMS, `Unknown tool: ${String(params.name)}`)
      }
      try {
        const text = await tool.run(params.arguments ?? {}, ctx)
        return rpcResult(id ?? null, { content: [{ type: 'text', text }] })
      } catch (err) {
        // A failed tool call is a *result* with isError, not a protocol
        // error — that's what lets the model see and react to the failure.
        const text = err instanceof Error ? err.message : 'Tool execution failed'
        return rpcResult(id ?? null, { content: [{ type: 'text', text }], isError: true })
      }
    }

    default:
      return isNotification ? null : rpcError(id ?? null, RpcError.METHOD_NOT_FOUND, `Unknown method: ${method}`)
  }
}
