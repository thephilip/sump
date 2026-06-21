# Plunger

Prompt injection guard for opencode. Overrides `websearch` — strips invisible unicode, flags injection patterns, wraps untrusted content in `<untrusted>` tags. Domain trust tiers.

## Install

```sh
curl -fsSL https://raw.githubusercontent.com/anomalyco/plunger/main/install.sh | sh
```

Or symlink from a local clone: `ln -sf $(pwd)/plunger.ts ~/.opencode/plugins/`

## Config

**`~/.config/opencode/plunger-whitelist.json`** — trusted domains, skip wrapper:
```json
["docs.mycompany.com", "confluence.internal"]
```

**`~/.config/opencode/plunger-blacklist.json`** — blocked domains + patterns:
```json
{
  "domains": ["pastebin.com"],
  "patterns": ["ignore all previous instructions"]
}
```

**Env:** `PLUNGER_SEARCH_URL` — custom search endpoint

## What it guards

| Channel | Method |
|---------|--------|
| Invisible Unicode (U+E0000–U+E007F) | Strip from fetched content |
| Known injection patterns | Regex detection + flagging |
| Untrusted content | `<untrusted>` wrapper |
| Whitelisted domains | Skip wrapper |
| Blacklisted domains/blobs | Drop silently |

## What it doesn't

Tool-based exfiltration (model POSTing data). That needs architectural separation.
