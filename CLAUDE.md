# Sump

MCP search server — sanitizes web search results to prevent prompt injection. Hand-rolled JSON-RPC over stdio, no MCP SDK.

## Status

MCP server connects successfully. Previous fixes: added `serverInfo` to initialize response, switched from Content-Length framed JSON-RPC to newline-delimited JSON (Claude Code v2.1+ uses newline-delimited, not LSP-style framing).

## Layout

- `sump-mcp.ts` — MCP server (Claude Code, stdio JSON-RPC)
- `sump.ts` — standalone CLI version
- `sump-blacklist.json` — blocked domains + injection-pattern regexes
- `install.sh` — installer for multiple MCP clients
- `commands/` — CLI subcommands

## Config paths

Runtime config lives in `~/.config/sump/`:
- `sump-blacklist.json` — domains + regex patterns
- `sump-whitelist.json` — trusted domains (skip `<untrusted>` wrapping)
- `plugins/sump-mcp.ts` — installed copy of the MCP server

## MCP settings

Configured in `~/.claude.json` under `mcpServers.sump` (NOT `~/.claude/settings.json` — that file doesn't support `mcpServers`):
```json
{ "command": "node", "args": ["/home/philip/.config/opencode/plugins/sump-mcp.mjs"] }
```
