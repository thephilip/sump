# Project North Star
_Last updated: 2026-06-21_

## Core Goals
- Plunger is a prompt injection guard for opencode — overrides `websearch`, strips invisible unicode, flags injection patterns, wraps untrusted content in `<untrusted>` tags.
- Single-file plugin, zero external dependencies beyond the opencode plugin SDK.
- Config-driven: whitelist (domains that skip wrapper), blacklist (blocked domains + injection regex patterns).

## Active Constraints
- TypeScript, `@opencode-ai/plugin` SDK only.
- Config lives at `~/.config/opencode/plunger-*.json`.
- Install via `install.sh` (curl-pipe) or symlink.

## Closed Decisions
- Regex-based pattern scanning (not an intent classifier). Commented with upgrade path.
- Whole-blob sanitization (not per-result HTML parsing). Commented with upgrade path.
- Config managed via `plunger-config` tool + `/plunger` TUI command (not a standalone CLI).

## Current Phase
Stabilizing: core plugin works, seed blacklist deployed, management tooling in place. Remaining items are speculative (webfetch override, markdown stripping) — punt until needed.

## Off-Limits Paths
- No new dependencies: stdlib + plugin SDK only.
- No standalone CLI for config — the LLM + `plunger-config` tool is the UI.

## Graphify
Not run.
