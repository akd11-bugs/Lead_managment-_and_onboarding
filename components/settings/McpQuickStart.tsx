'use client'

import { useState } from 'react'
import { Check, ChevronDown, Copy } from 'lucide-react'

// Per-client setup instructions for the MCP endpoint. Collapsed by default:
// most admins only need the key, and only whoever wires up an assistant
// needs this.
//
// Ordered easiest-first and labelled by audience, because the honest answer
// is that most of these paths are developer tasks — editing a JSON file on
// disk is not something a salesperson should be talked into. The "Ask your
// assistant" option exists for exactly that reader: hand the whole setup to
// the assistant instead of doing it by hand.
//
// Every snippet is filled in with the live key and the host this workspace
// is actually served from, so it is copy-paste correct rather than a
// template the reader has to edit.

type Client = {
  id: string
  label: string
  audience: 'easy' | 'dev'
  // One line under the tabs, before any steps.
  intro: string
  steps?: string[]
  snippet: string | null
  snippetLabel?: string
  // Shown after the snippet — how to tell it worked.
  success?: string
  caveat?: string
}

function buildClients(url: string, key: string): Client[] {
  const serverBlock = `{
  "mcpServers": {
    "steadfast": {
      "type": "http",
      "url": "${url}",
      "headers": {
        "Authorization": "Bearer ${key}"
      }
    }
  }
}`

  return [
    {
      id: 'ask',
      label: 'Ask your assistant',
      audience: 'easy',
      intro:
        'The simplest route: paste this into Claude (or any assistant that can edit files on your computer) and let it do the setup for you.',
      snippetLabel: 'Paste this to your assistant',
      snippet: `Please connect my Steadfast CRM to yourself as an MCP server.

Add this to my Claude Desktop config file (claude_desktop_config.json),
merging it with any servers already in there rather than replacing them:

${serverBlock}

The config file lives at:
  macOS    ~/Library/Application Support/Claude/claude_desktop_config.json
  Windows  %APPDATA%\\Claude\\claude_desktop_config.json

After editing, tell me to restart Claude Desktop.`,
      success:
        'Once it has finished and you have restarted the app, ask: “How many leads are in my pipeline?” You should get real numbers back.',
      caveat:
        'That text contains your key. Paste it into your own assistant only — not a shared chat, a ticket, or a document other people can read.',
    },
    {
      id: 'claude-desktop',
      label: 'Claude Desktop',
      audience: 'easy',
      intro: 'Doing it by hand takes about two minutes.',
      steps: [
        'Open Claude Desktop → Settings → Developer → Edit Config. That opens a file called claude_desktop_config.json.',
        'If the file is empty, paste the whole block below. If it already has "mcpServers" in it, add only the "steadfast" part inside the existing braces — do not replace what is there, or your other connections will stop working.',
        'Save the file and quit Claude Desktop completely, then open it again. A restart is required; the config is only read at startup.',
      ],
      snippet: serverBlock,
      success:
        'Ask Claude “How many leads are in my pipeline?”. If it answers with real numbers, it is connected. If it says it has no such tool, the file was not saved or the app was not fully restarted.',
    },
    {
      id: 'claude-code',
      label: 'Claude Code',
      audience: 'dev',
      intro: 'One command in a terminal — no config file to edit.',
      steps: [
        'Run the command below. Scope it with --scope user to use it in every project, or --scope project to commit it to a repo your team shares (the key goes in the file, so only do that with a key you are happy to share).',
        'Run claude mcp list to confirm it connected.',
        'Start claude in any directory and ask it about your pipeline.',
      ],
      snippet: `claude mcp add --transport http steadfast ${url} \\
  --header "Authorization: Bearer ${key}"

# Available everywhere instead of just this project:
claude mcp add --scope user --transport http steadfast ${url} \\
  --header "Authorization: Bearer ${key}"

# Verify:
claude mcp list

# Remove later:
claude mcp remove steadfast`,
      success:
        'claude mcp list should show steadfast — ✔ Connected. Then ask Claude “How many leads are in my pipeline?” and you should get real numbers.',
    },
    {
      id: 'cursor',
      label: 'Cursor',
      audience: 'dev',
      intro: 'Create .cursor/mcp.json in a project, or ~/.cursor/mcp.json to enable it everywhere.',
      snippet: `{
  "mcpServers": {
    "steadfast": {
      "url": "${url}",
      "headers": {
        "Authorization": "Bearer ${key}"
      }
    }
  }
}`,
    },
    {
      id: 'openai-api',
      label: 'OpenAI API',
      audience: 'dev',
      intro: 'Pass the server as an mcp tool on a Responses API call.',
      snippet: `{
  "model": "gpt-5",
  "tools": [
    {
      "type": "mcp",
      "server_label": "steadfast",
      "server_url": "${url}",
      "headers": {
        "Authorization": "Bearer ${key}"
      },
      "require_approval": "always"
    }
  ],
  "input": "Which leads have gone quiet for three weeks?"
}`,
      caveat:
        'require_approval is "always" so a human confirms before the model writes to your CRM. Only lower it for a caller you trust.',
    },
    {
      id: 'chatgpt',
      label: 'ChatGPT',
      audience: 'dev',
      intro: 'Settings → Connectors → Create, using the endpoint and header below.',
      snippet: null,
      caveat:
        'Connectors need a Pro, Business or Enterprise plan. ChatGPT’s deep-research mode also looks for tools named search and fetch — this server exposes search_leads and get_lead, so those particular flows will not find it. Ordinary tool calling works normally.',
    },
    {
      id: 'curl',
      label: 'Raw HTTP',
      audience: 'dev',
      intro: 'Any other MCP client, or your own code. JSON-RPC 2.0 over POST.',
      snippet: `curl -X POST ${url} \\
  -H "Authorization: Bearer ${key}" \\
  -H "Content-Type: application/json" \\
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/list"}'`,
    },
  ]
}

// One tier (easy / developer): its own tab row, instructions, snippet and
// callouts. Rendering two of these means both audiences see a working path
// without clicking anything.
function Tier({
  heading,
  subheading,
  clients,
  active,
  onSelect,
  client,
  url,
  apiKey,
  copied,
  onCopy,
}: {
  heading: string
  subheading: string
  clients: Client[]
  active: string
  onSelect: (id: string) => void
  client: Client
  url: string
  apiKey: string
  copied: string | null
  onCopy: (text: string, id: string) => void
}) {
  return (
    <section className="space-y-2">
      <div>
        <h4 className="text-xs font-medium">{heading}</h4>
        <p className="text-[11px] text-muted-foreground">{subheading}</p>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {clients.map((c) => (
          <button
            key={c.id}
            type="button"
            onClick={() => onSelect(c.id)}
            className={`rounded-full px-2.5 py-1 text-[11px] transition-colors ${
              c.id === active ? 'bg-foreground text-background' : 'border text-muted-foreground hover:text-foreground'
            }`}
          >
            {c.label}
          </button>
        ))}
      </div>

      <p className="text-xs text-muted-foreground">{client.intro}</p>

      {client.steps && (
        <ol className="space-y-1.5">
          {client.steps.map((s, i) => (
            <li key={s} className="flex gap-2 text-[11px] text-muted-foreground">
              <span className="grid h-4 w-4 shrink-0 place-items-center rounded-full border text-[9px] font-medium text-foreground">
                {i + 1}
              </span>
              <span>{s}</span>
            </li>
          ))}
        </ol>
      )}

      {client.snippet ? (
        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-medium">{client.snippetLabel ?? 'Copy this'}</span>
            <button
              type="button"
              onClick={() => onCopy(client.snippet as string, client.id)}
              className="flex items-center gap-1 rounded border px-1.5 py-0.5 text-[10px] text-muted-foreground hover:text-foreground"
            >
              {copied === client.id ? <Check className="h-3 w-3 text-emerald-600" /> : <Copy className="h-3 w-3" />}
              {copied === client.id ? 'Copied' : 'Copy'}
            </button>
          </div>
          <pre className="max-h-64 overflow-auto rounded-md border bg-muted/40 p-3 text-[11px] leading-relaxed">
            {client.snippet}
          </pre>
        </div>
      ) : (
        <div className="rounded-md border bg-muted/40 p-3 text-[11px] text-muted-foreground">
          <div className="font-medium text-foreground">MCP endpoint</div>
          <code className="mt-1 block break-all">{url}</code>
          <div className="mt-2 font-medium text-foreground">Header</div>
          <code className="mt-1 block break-all">Authorization: Bearer {apiKey}</code>
        </div>
      )}

      {client.success && (
        <p className="rounded-md border border-emerald-500/25 bg-emerald-500/[0.07] px-2.5 py-2 text-[11px] text-emerald-700 dark:text-emerald-400">
          <span className="font-medium">Did it work? </span>
          {client.success}
        </p>
      )}

      {client.caveat && (
        <p className="rounded-md border border-amber-500/25 bg-amber-500/[0.07] px-2.5 py-2 text-[11px] text-amber-700 dark:text-amber-400">
          {client.caveat}
        </p>
      )}
    </section>
  )
}

export function McpQuickStart({ url, apiKey }: { url: string; apiKey: string }) {
  const [open, setOpen] = useState(false)
  // Two independent selections, one per tier, so the non-technical and the
  // developer path are both on screen at once. A single `active` tab meant a
  // developer had to click away from the default before seeing any command,
  // and whoever set it up could not see both routes side by side.
  const [easyActive, setEasyActive] = useState('ask')
  const [devActive, setDevActive] = useState('claude-code')
  const [copied, setCopied] = useState<string | null>(null)

  const clients = buildClients(url, apiKey)
  const easy = clients.filter((c) => c.audience === 'easy')
  const dev = clients.filter((c) => c.audience === 'dev')
  const easyClient = easy.find((c) => c.id === easyActive) ?? easy[0]
  const devClient = dev.find((c) => c.id === devActive) ?? dev[0]

  function copy(text: string, id: string) {
    navigator.clipboard.writeText(text)
    setCopied(id)
    setTimeout(() => setCopied(null), 1500)
  }

  return (
    <div className="rounded-md border">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="flex w-full items-center justify-between px-3 py-2.5 text-left"
      >
        <span className="text-xs font-medium">Quick start — connect an assistant</span>
        <ChevronDown className={`h-3.5 w-3.5 text-muted-foreground transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="space-y-4 border-t px-3 py-3">
          <Tier
            heading="If you don't set up software"
            subheading="Pick one. Both take a couple of minutes."
            clients={easy}
            active={easyActive}
            onSelect={setEasyActive}
            client={easyClient}
            url={url}
            apiKey={apiKey}
            copied={copied}
            onCopy={copy}
          />

          <Tier
            heading="If you're comfortable with a terminal"
            subheading="Same key, same endpoint — just faster to wire up."
            clients={dev}
            active={devActive}
            onSelect={setDevActive}
            client={devClient}
            url={url}
            apiKey={apiKey}
            copied={copied}
            onCopy={copy}
          />

          <div className="border-t pt-3">
            <div className="text-xs font-medium">What the assistant can do</div>
            <ul className="mt-1.5 space-y-1 text-[11px] text-muted-foreground">
              <li>Read — search your leads, open one in full, summarise the pipeline</li>
              <li>Write — add a lead, log a call or email, move a deal to another stage</li>
            </ul>
            <p className="mt-2 text-[11px] text-muted-foreground">
              It follows the same rules as the app: required fields, duplicate checks, and your workflow automations all
              still apply. Everything it changes shows in the lead timeline as “AI Agent”, never as one of your people.
              Revoking the key above disconnects every assistant immediately.
            </p>
            <p className="mt-2 text-[11px] text-muted-foreground">
              New leads need an owner — the assistant must say which rep each one belongs to. Tell it a default once
              (“assign new leads to priya@acme.com”) so it stops asking every time.
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
