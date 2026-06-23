# Sump — project memory

## Implemented

- **OpenCode plugin** (`sump.ts`) — overrides `websearch` with prompt injection sanitization
- **Claude Code MCP server** (`sump-mcp.ts`) — zero-dependency MCP server, raw JSON-RPC over stdio, exposes `sump-search` tool

## Planned extensions

- Codex CLI extension — to be designed and built after MCP server
