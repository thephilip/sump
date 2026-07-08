#!/bin/sh
set -e
CFG="${XDG_CONFIG_HOME:-$HOME/.config}/sump"
OC="${XDG_CONFIG_HOME:-$HOME/.config}/opencode"
REPO="${SUMP_REPO:-thephilip/sump}"
MCP_TS="${CFG}/sump-mcp.ts"
MCP_MJS="${CFG}/sump-mcp.mjs"

mkdir -p "${CFG}" "${OC}/plugins" "${OC}/commands"

echo "==> Downloading sump.ts (OpenCode plugin)..."
curl -fsSL "https://raw.githubusercontent.com/$REPO/master/sump.ts" -o "${OC}/plugins/sump.ts"

echo "==> Downloading sump-mcp.ts (MCP server)..."
curl -fsSL "https://raw.githubusercontent.com/$REPO/master/sump-mcp.ts" -o "${MCP_TS}"

echo "==> Building sump-mcp.mjs..."
if npx esbuild "${MCP_TS}" --bundle --platform=node --format=esm --outfile="${MCP_MJS}" 2>/dev/null; then
  echo "  built ${MCP_MJS}"
else
  echo "  esbuild not available — use 'npx tsx ${MCP_TS}' instead of node"
fi

echo "==> Installing command..."
curl -fsSL "https://raw.githubusercontent.com/$REPO/master/commands/sump.md" -o "${OC}/commands/sump.md"

[ -f "${CFG}/sump-blacklist.json" ] || {
  curl -fsSL "https://raw.githubusercontent.com/$REPO/master/sump-blacklist.json" -o "${CFG}/sump-blacklist.json"
  echo "  created ${CFG}/sump-blacklist.json (seed)"
}
[ -f "${CFG}/sump-whitelist.json" ] || {
  echo '[]' > "${CFG}/sump-whitelist.json"
  echo "  created ${CFG}/sump-whitelist.json (empty)"
}

NODE="$(which node 2>/dev/null || echo node)"

echo ""
echo "sump installed: plugin + MCP server + commands + config"
echo ""
echo "--- Next steps ---"
echo ""
echo "OpenCode:"
echo "  ln -sf ${OC}/plugins/sump.ts ~/.opencode/plugins/sump.ts"
echo "  ln -sf ${OC}/commands/sump.md ~/.opencode/commands/sump.md"
echo ""
echo "Claude Code (add to ~/.claude.json):"
echo "  { \"mcpServers\": { \"sump\": { \"command\": \"${NODE}\", \"args\": [\"${MCP_MJS}\"] } } }"
echo ""
echo "Codex CLI:"
echo "  codex mcp add sump -- ${NODE} ${MCP_MJS}"
echo ""
echo "Gemini CLI:"
echo "  gemini mcp add sump -- ${NODE} ${MCP_MJS}"
