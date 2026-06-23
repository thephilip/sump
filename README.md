# Sump

![Sump](sump.png)

**Prompt injection guard for OpenCode.** Sump overrides OpenCode's `websearch` to sanitize web results before they reach the LLM — stripping invisible Unicode, flagging known injection patterns, and wrapping untrusted content in `<untrusted>` tags. Domain trust tiers let you decide what the model can read freely.

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

```sh
curl -fsSL https://raw.githubusercontent.com/anomalyco/sump/main/install.sh | sh
```

Or from a local clone:

```sh
ln -sf $(pwd)/sump.ts ~/.opencode/plugins/
ln -sf $(pwd)/commands/sump.md ~/.opencode/commands/
```

Requires [OpenCode](https://opencode.ai) 0.x with plugin support.

## How it works

Sump is a single-file TypeScript plugin (111 lines) that hooks OpenCode's `websearch` tool. On every search:

1. Fetches results from **DuckDuckGo Lite** (no API key needed; override via `SUMP_SEARCH_URL`)
2. **Checks the source domain** against blacklist → drops if blocked
3. **Strips invisible Unicode** (`/[\u{E0000}-\u{E007F}]/gu`)
4. **Scans for injection patterns** — if any match, the result is flagged
5. **Wraps in `<untrusted>`** unless the domain is whitelisted

The `/sump` command and `sump-config` tool let you manage trust rules at runtime without editing files.

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

## Claude Code

Add to your Claude Code MCP config (`~/.claude/settings.json` or project `.mcp.json`):

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

Requires `tsx` (`npm install -g tsx`) or pre-compile with `tsc`. Uses the same
`~/.config/opencode/sump-{white,black}list.json` config files as the OpenCode plugin.

## Extending

**Add patterns** — edit `~/.config/opencode/sump-blacklist.json` patterns array, or use the `pattern-add` action via `/sump`. Patterns are case-insensitive regexes.

**Custom search backend** — point `SUMP_SEARCH_URL` at any endpoint that returns text. For an HTML page, the raw text is scanned (Unicode stripping + regex). PRs welcome for proper per-result HTML parsing.

**Plugin bundling** — Sump's single-file design makes it easy to fork or vendor into your own plugin configuration.

## Limits

Sump guards `websearch` only. It does **not** protect against:
- Tool-based exfiltration (the model POSTing data to an attacker's server)
- Prompt injection via `webfetch` or file reads (separate override, not yet implemented)
- Social engineering of the operator
- Zero-day injection patterns not in the regex list

## Philosophy

Sump is built in the [ponytail](https://github.com/anomalyco/opencode-ponytail) tradition — the laziest effective defense. One file, no dependencies, no framework, no build step. Deliberate shortcuts are marked with `ponytail:` comments. The simplicity means you can read, audit, and trust the whole thing in five minutes.
