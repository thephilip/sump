import { readFileSync } from "fs"
import { homedir } from "os"
import { join } from "path"

const CFG = join(homedir(), ".config", "sump")
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

interface Result { title: string; snippet: string; url: string; domain: string }

const ENTITIES: Record<string, string> = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", "#x27": "'" }
function decodeEntities(s: string): string {
  return s.replace(/&(#x[0-9a-fA-F]+|#[0-9]+|\w+);/g, (m, e) => {
    if (ENTITIES[e]) return ENTITIES[e]
    if (e.startsWith("#x")) return String.fromCodePoint(parseInt(e.slice(2), 16))
    if (e.startsWith("#")) return String.fromCodePoint(parseInt(e.slice(1), 10))
    return m
  })
}

function parseResults(html: string): Result[] {
  const results: Result[] = []
  const linkRx = /<a rel="nofollow" href="[^"]*uddg=([^&"]+)[^"]*"[^>]*class='result-link'>([^<]+)<\/a>/g
  const snippetRx = /<td class='result-snippet'>\s*([\s\S]*?)\s*<\/td>/g
  const links = [...html.matchAll(linkRx)]
  const snippets = [...html.matchAll(snippetRx)]
  for (let i = 0; i < links.length; i++) {
    const url = decodeURIComponent(links[i][1])
    const title = decodeEntities(links[i][2])
    const snippet = decodeEntities((snippets[i]?.[1] || "").replace(/<[^>]+>/g, "")).trim()
    let domain = ""
    try { domain = new URL(url).hostname } catch {}
    results.push({ title, snippet, url, domain })
  }
  return results
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
  } else if (method === "ping") {
    respond(id, {})
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
    const parsed = parseResults(await res.text())
    const lines: string[] = []
    let n = 0
    for (const r of parsed) {
      const [title, tFlag] = clean(r.title, r.domain)
      const [snippet, sFlag] = clean(r.snippet, r.domain)
      if (!snippet) continue
      const flagged = tFlag || sFlag
      n++
      const entry = `${n}. ${title}\n${snippet}\n${r.url}`
      lines.push(flagged ? `${entry}\n[FLAGGED: injection patterns detected]` : entry)
    }
    const text = lines.join("\n\n") || "No results."
    respond(id, { content: [{ type: "text", text }] })
  } catch (e: any) {
    respond(id, { isError: true, content: [{ type: "text", text: `Search error: ${e.message}` }] })
  }
}

function respond(id: any, result: any) {
  process.stdout.write(JSON.stringify({ jsonrpc: "2.0", id, result }) + "\n")
}
