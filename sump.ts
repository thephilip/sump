import { type Plugin, tool } from "@opencode-ai/plugin"
import { readFileSync, writeFileSync } from "fs"
import { homedir } from "os"
import { join } from "path"

const CFG = join(homedir(), ".config", "opencode")
const SEARCH = process.env.SUMP_SEARCH_URL || "https://lite.duckduckgo.com/lite/"

// ponytail: naive regex scan, upgrade to intent classifier if false positives hurt
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

// ponytail: no per-result HTML parsing, whole-blob sanitize. Add structured parse if domain-level trust per result needed.
function clean(text: string, domain: string): [string, boolean] {
  if (!domain || BLACKLIST.some(d => domain.includes(d))) return ["", true]
  let c = text.replace(/[\u{E0000}-\u{E007F}]/gu, "")  // ponytail: invisible unicode only, add markdown image/reflink strip if webfetch override added
  const flagged = BAD_RX.some(r => r.test(c))
  if (!WHITELIST.some(w => domain.includes(w))) c = `<untrusted>\n${c}\n</untrusted>`
  return [c, flagged]
}

function readJSON(path: string) {
  try { return JSON.parse(readFileSync(path, "utf-8")) }
  catch { return null }
}

export const Sump: Plugin = async () => ({
  tool: {
    websearch: tool({
      description: "Search the web. Results sanitized to prevent prompt injection.",
      args: { query: tool.schema.string({ description: "Search query" }) },
      async execute(args) {
        const res = await fetch(`${SEARCH}?q=${encodeURIComponent(args.query as string)}`, { headers: { "User-Agent": "sump/1.0" } })
        if (!res.ok) return `Search failed (${res.status})`
        const [text, flagged] = clean(await res.text(), new URL(SEARCH).hostname)
        return flagged ? `${text}\n\n[FLAGGED: injection patterns detected]` : text
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
