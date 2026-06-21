# Plunger

Prompt injection guard plugin for opencode. Overrides `websearch` with deterministic sanitization: strips invisible unicode, markdown exfiltration channels, and known injection patterns. Domain trust tiers for whitelist/blacklist control.

## Usage

1. Symlink or copy to `~/.opencode/plugins/plunger.ts`
2. (Optional) Configure trust tiers:

**`~/.config/opencode/plunger-whitelist.json`**
```json
["docs.mycompany.com", "confluence.internal"]
```

**`~/.config/opencode/plunger-blacklist.json`**
```json
{
  "domains": ["known-malicious.example.com"],
  "patterns": ["ignore all previous instructions", "developer mode"]
}
```

**Env vars:**
- `PLUNGER_SEARCH_URL` — custom search endpoint override

## What it guards

| Channel | Method | Deterministic? |
|---------|--------|:---:|
| Invisible Unicode (U+E0000–U+E007F) | Strip from fetched content | ✅ |
| Markdown image exfiltration (`![...](url)`) | Strip from results | ✅ |
| Reference-link URLs | Strip from results | ✅ |
| Known injection patterns | Sub detection + wrapping | ✅ |
| Untrusted content labeling | Wrap in `<untrusted>` tags | ✅ |
| Whitelisted domains | Skip wrapper, still sanitize | ✅ |
| Blacklisted domains | Drop results silently | ✅ |

## What it does NOT guard

Tool-based exfiltration (model being told to POST data) — requires architectural separation.
