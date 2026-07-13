import { type Plugin, tool } from "@opencode-ai/plugin"
import { readFileSync, writeFileSync } from "fs"
import { homedir } from "os"
import { join } from "path"

const CFG = join(homedir(), ".config", "sump")
const SEARCH = process.env.SUMP_SEARCH_URL || "https://lite.duckduckgo.com/lite/"

function readJSON(path: string) {
  try { return JSON.parse(readFileSync(path, "utf-8")) }
  catch { return null }
}

// ponytail: naive regex scan, upgrade to intent classifier if false positives hurt
const BAD_RX = ((readJSON(join(CFG, "sump-blacklist.json"))?.patterns || []) as string[]).map(p => new RegExp(p, "i"))
const WHITELIST: string[] = readJSON(join(CFG, "sump-whitelist.json")) ?? []
const BLACKLIST: string[] = readJSON(join(CFG, "sump-blacklist.json"))?.domains ?? []

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

export const Sump: Plugin = async () => ({
  tool: {
    websearch: tool({
      description: "Search the web. Results sanitized to prevent prompt injection.",
      args: { query: tool.schema.string({ description: "Search query" }) },
      async execute(args) {
        const res = await fetch(`${SEARCH}?q=${encodeURIComponent(args.query as string)}`, { headers: { "User-Agent": "sump/1.0" } })
        if (!res.ok) return `Search failed (${res.status})`
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
        return lines.join("\n\n") || "No results."
      },
    }),
    "sump-config": tool({
      description: "View or modify Sump whitelist (domains skipped from <untrusted> wrapper) and blacklist (blocked domains + injection patterns).",
      args: {
        action: tool.schema.enum(["show", "whitelist-add", "whitelist-remove", "blacklist-add", "blacklist-remove", "pattern-add", "pattern-remove"]),
        value: tool.schema.string({ description: "Domain or pattern to add/remove" }).optional(),
      },
      async execute(args) {
        const wl = join(CFG, "sump-whitelist.json")
        const bl = join(CFG, "sump-blacklist.json")
        const a = args.action as string

        if (a === "show") {
          const w = readJSON(wl) ?? []
          const b = readJSON(bl) ?? { domains: [], patterns: [] }
          return `WHITELIST:\n${JSON.stringify(w, null, 2)}\n\nBLACKLIST:\n${JSON.stringify(b, null, 2)}`
        }

        if (a === "whitelist-add") {
          const w: string[] = readJSON(wl) ?? []
          w.push(args.value as string)
          writeFileSync(wl, JSON.stringify([...new Set(w)], null, 2))
          return `Added "${args.value}" to whitelist`
        }
        if (a === "whitelist-remove") {
          let w: string[] = readJSON(wl) ?? []
          w = w.filter(d => d !== args.value)
          writeFileSync(wl, JSON.stringify(w, null, 2))
          return `Removed "${args.value}" from whitelist`
        }

        const b: { domains: string[], patterns: string[] } = readJSON(bl) ?? { domains: [], patterns: [] }
        if (a === "blacklist-add") {
          b.domains.push(args.value as string)
          b.domains = [...new Set(b.domains)]
          writeFileSync(bl, JSON.stringify(b, null, 2))
          return `Added "${args.value}" to blacklist`
        }
        if (a === "blacklist-remove") {
          b.domains = b.domains.filter(d => d !== args.value)
          writeFileSync(bl, JSON.stringify(b, null, 2))
          return `Removed "${args.value}" from blacklist`
        }
        if (a === "pattern-add") {
          b.patterns.push(args.value as string)
          b.patterns = [...new Set(b.patterns)]
          writeFileSync(bl, JSON.stringify(b, null, 2))
          return `Added pattern "${args.value}" to blacklist`
        }
        if (a === "pattern-remove") {
          b.patterns = b.patterns.filter(p => p !== args.value)
          writeFileSync(bl, JSON.stringify(b, null, 2))
          return `Removed pattern "${args.value}" from blacklist`
        }

        return "Unknown action"
      },
    }),
  },
})
