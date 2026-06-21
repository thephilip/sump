import { type Plugin, tool } from "@opencode-ai/plugin"
import { readFileSync } from "fs"
import { homedir } from "os"
import { join } from "path"

const CFG = join(homedir(), ".config", "opencode")
const SEARCH = process.env.PLUNGER_SEARCH_URL || "https://lite.duckduckgo.com/lite/"

// ponytail: naive regex scan, upgrade to intent classifier if false positives hurt
const BAD_RX = (() => {
  try {
    const f = join(CFG, "plunger-blacklist.json")
    return (JSON.parse(readFileSync(f, "utf-8")).patterns || []).map((p: string) => new RegExp(p, "i"))
  } catch { return [] }
})()

const WHITELIST: string[] = (() => {
  try { return JSON.parse(readFileSync(join(CFG, "plunger-whitelist.json"), "utf-8")) }
  catch { return [] }
})()

const BLACKLIST: string[] = (() => {
  try { return JSON.parse(readFileSync(join(CFG, "plunger-blacklist.json"), "utf-8")).domains || [] }
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

export const Plunger: Plugin = async () => ({
  tool: {
    websearch: tool({
      description: "Search the web. Results sanitized to prevent prompt injection.",
      args: { query: tool.schema.string({ description: "Search query" }) },
      async execute(args) {
        const res = await fetch(`${SEARCH}?q=${encodeURIComponent(args.query as string)}`)
        if (!res.ok) return `Search failed (${res.status})`
        const [text, flagged] = clean(await res.text(), new URL(SEARCH).hostname)
        return flagged ? `${text}\n\n[FLAGGED: injection patterns detected]` : text
      },
    }),
  },
})
