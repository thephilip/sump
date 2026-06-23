#!/bin/sh
set -e
CFG="${XDG_CONFIG_HOME:-$HOME/.config}/opencode"
REPO="${SUMP_REPO:-thephilip/sump}"
MCP="${CFG}/plugins/sump-mcp.ts"

mkdir -p "${CFG}/plugins" "${CFG}/commands"

echo "==> Downloading sump.ts (OpenCode plugin)..."
curl -fsSL "https://raw.githubusercontent.com/$REPO/master/sump.ts" -o "${CFG}/plugins/sump.ts"

echo "==> Downloading sump-mcp.ts (MCP server)..."
curl -fsSL "https://raw.githubusercontent.com/$REPO/master/sump-mcp.ts" -o "${MCP}"

echo "==> Installing command..."
curl -fsSL "https://raw.githubusercontent.com/$REPO/master/commands/sump.md" -o "${CFG}/commands/sump.md"

[ -f "${CFG}/sump-blacklist.json" ] || {
  curl -fsSL "https://raw.githubusercontent.com/$REPO/master/sump-blacklist.json" -o "${CFG}/sump-blacklist.json"
  echo "  created ${CFG}/sump-blacklist.json (seed)"
}
[ -f "${CFG}/sump-whitelist.json" ] || {
  echo '[]' > "${CFG}/sump-whitelist.json"
  echo "  created ${CFG}/sump-whitelist.json (empty)"
}

echo ""
echo "sump installed: plugin + MCP server + commands + config"
echo ""
echo "--- Next steps ---"
echo ""
echo "OpenCode:"
echo "  ln -sf ${CFG}/plugins/sump.ts ~/.opencode/plugins/sump.ts"
echo "  ln -sf ${CFG}/commands/sump.md ~/.opencode/commands/sump.md"
echo ""
echo "Claude Code:"
echo "  Add to ~/.claude/settings.json or .mcp.json:"
echo "  { \"mcpServers\": { \"sump\": { \"command\": \"npx\", \"args\": [\"tsx\", \"${MCP}\"] } } }"
echo ""
echo "Codex CLI:"
echo "  codex mcp add sump -- npx tsx ${MCP}"
echo ""
echo "Gemini CLI:"
echo "  gemini mcp add sump -- npx tsx ${MCP}"
