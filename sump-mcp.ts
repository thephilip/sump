import { readFileSync } from "fs"
import { homedir } from "os"
import { join } from "path"

const CFG = join(homedir(), ".config", "opencode")
const SEARCH = process.env.SUMP_SEARCH_URL || "https://lite.duckduckgo.com/lite/"

// ponytail: cloned from sump.ts — YAGNI shared module for two consumers
const BAD_RX = (() => {
  try {
    const f = join(CFG, "sump-blacklist.json")
    return (JSON.parse(readFileSync(f, "utf-8")).patterns || []).map((p: string) => new RegExp(p, "i"))
  } catch { return [] }
})()

const WHITELIST: string[] = (() => {
  try { return JSON.parse(readFileSync(join(CFG, "sump-whitelist.json"), "utf-8")) }
  catch { return [] }
})()

const BLACKLIST: string[] = (() => {
  try { return JSON.parse(readFileSync(join(CFG, "sump-blacklist.json"), "utf-8")).domains || [] }
  catch { return [] }
})()

function clean(text: string, domain: string): [string, boolean] {
  if (!domain || BLACKLIST.some(d => domain.includes(d))) return ["", true]
  let c = text.replace(/[\u{E0000}-\u{E007F}]/gu, "")
  const flagged = BAD_RX.some(r => r.test(c))
  if (!WHITELIST.some(w => domain.includes(w))) c = `<untrusted>\n${c}\n</untrusted>`
  return [c, flagged]
}

// ponytail: no MCP SDK — newline-delimited JSON-RPC over stdio
import { createInterface } from "readline"
const rl = createInterface({ input: process.stdin })
rl.on("line", (line: string) => {
  if (!line.trim()) return
  try { handle(JSON.parse(line)) } catch { /* malformed JSON, skip */ }
})

function handle(msg: any) {
  const { id, method, params } = msg
  if (method === "initialize") {
    respond(id, { protocolVersion: params?.protocolVersion || "2024-11-05", capabilities: { tools: {} }, serverInfo: { name: "sump", version: "1.0.0" } })
  } else if (!id) {
    // ponytail: notifications (e.g. initialized, cancelled) are ignored
  } else if (method === "tools/list") {
    respond(id, {
      tools: [{
        name: "sump-search",
        description: "Search the web. Results sanitized to prevent prompt injection.",
        inputSchema: {
          type: "object",
          properties: { query: { type: "string" } },
          required: ["query"],
        },
      }],
    })
  } else if (method === "tools/call") {
    if (params?.name === "sump-search") {
      search(id, params.arguments?.query as string)
    } else {
      respond(id, { isError: true, content: [{ type: "text", text: `Unknown tool: ${params?.name}` }] })
    }
  }
}

async function search(id: any, query: string) {
  try {
    const res = await fetch(`${SEARCH}?q=${encodeURIComponent(query)}`, { headers: { "User-Agent": "sump-mcp/1.0" } })
    if (!res.ok) {
      respond(id, { isError: true, content: [{ type: "text", text: `Search failed (${res.status})` }] })
      return
    }
    const [text, flagged] = clean(await res.text(), new URL(SEARCH).hostname)
    respond(id, {
      content: [{ type: "text", text: flagged ? `${text}\n\n[FLAGGED: injection patterns detected]` : text }],
    })
  } catch (e: any) {
    respond(id, { isError: true, content: [{ type: "text", text: `Search error: ${e.message}` }] })
  }
}

function respond(id: any, result: any) {
  process.stdout.write(JSON.stringify({ jsonrpc: "2.0", id, result }) + "\n")
}
