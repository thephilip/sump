# Sump

![Sump](sump.png)

**Prompt injection guard for OpenCode and Claude Code.** Sump overrides `websearch` (OpenCode) or runs as an MCP server (Claude Code) to sanitize web results before they reach the LLM — stripping invisible Unicode, flagging known injection patterns, and wrapping untrusted content in `<untrusted>` tags. Domain trust tiers let you decide what the model can read freely.

In the age of agentic AI, every search result is a potential attack vector. Sump is the air gap.

## Defense layers

| Threat | How Sump stops it |
|---|---|
| **Invisible Unicode** (U+E0000–U+E007F) — tag characters used to hide text from humans but inject it into LLMs | Stripped from all fetched content before the model sees it |
| **Known injection patterns** — "ignore all previous instructions", persona takeovers, jailbreak phrases, prompt leak attempts, markup escapes | 23+ regex patterns compiled from the Prompt Injection Firewall; flagged results append `[FLAGGED: injection patterns detected]` |
| **Untrusted domains** — any site not on your whitelist | Content wrapped in `<untrusted>\n...\n</untrusted>`, giving the model a clear boundary signal |
| **Blacklisted domains** — pastebins, URL shorteners, replit, glitch | Content dropped silently; flagged as injection attempt |
| **Invisible injection via search results** — a malicious site hiding instructions in its DDG snippet | Same Unicode + pattern scan runs on *every* search result blob |

## Install

### OpenCode plugin

```sh
curl -fsSL https://raw.githubusercontent.com/anomalyco/sump/main/install.sh | sh
```

Or from a local clone:

```sh
ln -sf $(pwd)/sump.ts ~/.opencode/plugins/
ln -sf $(pwd)/commands/sump.md ~/.opencode/commands/
```

### Claude Code MCP server

Add to `~/.claude/settings.json` or project `.mcp.json`:

```json
{
  "mcpServers": {
    "sump": {
      "command": "npx",
      "args": ["tsx", "/path/to/sump-mcp.ts"]
    }
  }
}
```

Requires `tsx` (`npm install -g tsx`) or `tsc` to compile.

## How it works

Sump is available as an [OpenCode](https://opencode.ai) plugin (`sump.ts`, 111 lines) or a [Claude Code](https://claude.ai) MCP server (`sump-mcp.ts`, 92 lines). Both share the same sanitization logic and config files. On every search:

1. Fetches results from **DuckDuckGo Lite** (no API key needed; override via `SUMP_SEARCH_URL`)
2. **Checks the source domain** against blacklist → drops if blocked
3. **Strips invisible Unicode** (`/[\u{E0000}-\u{E007F}]/gu`)
4. **Scans for injection patterns** — if any match, the result is flagged
5. **Wraps in `<untrusted>`** unless the domain is whitelisted

The `/sump` command and `sump-config` tool let you manage trust rules at runtime without editing files (OpenCode only).

## Configuration

### Whitelist — domains trusted to skip `<untrusted>`

`~/.config/opencode/sump-whitelist.json`:
```json
["docs.mycompany.com", "confluence.internal", "github.com/your-org"]
```

### Blacklist — blocked domains + injection patterns

`~/.config/opencode/sump-blacklist.json`:
```json
{
  "domains": ["pastebin.com"],
  "patterns": ["ignore all previous instructions"]
}
```

Ships with a seed blacklist of 13 domains and 23 injection patterns (adapted from [Prompt Injection Firewall](https://github.com/ogulcanaydogan/Prompt-Injection-Firewall), Apache-2.0).

### Environment

| Variable | Purpose | Default |
|---|---|---|
| `SUMP_SEARCH_URL` | Override the search backend | `https://lite.duckduckgo.com/lite/` |

### Runtime management

Use natural language in OpenCode:
- `show sump config`
- `add docs.internal.com to whitelist`
- `block example.com`
- `add "forget everything" to patterns`

## Extending

**Add patterns** — edit `~/.config/opencode/sump-blacklist.json` patterns array, or use the `pattern-add` action via `/sump`. Patterns are case-insensitive regexes.

**Custom search backend** — point `SUMP_SEARCH_URL` at any endpoint that returns text. For an HTML page, the raw text is scanned (Unicode stripping + regex). PRs welcome for proper per-result HTML parsing.

**Plugin bundling** — Sump's single-file design makes it easy to fork or vendor into your own plugin configuration.

## Limits

Sump guards web search results only (OpenCode `websearch` / Claude Code `sump-search` tool). It does **not** protect against:
- Tool-based exfiltration (the model POSTing data to an attacker's server)
- Prompt injection via `webfetch` or file reads (separate override, not yet implemented for OpenCode)
- Social engineering of the operator
- Zero-day injection patterns not in the regex list

## Philosophy

Sump is built in the laziest effective defense tradition. One file, no dependencies, no framework, no build step. Deliberate shortcuts are marked with `ponytail:` comments. The simplicity means you can read, audit, and trust the whole thing in five minutes.
