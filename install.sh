#!/bin/sh
set -e
CFG="${XDG_CONFIG_HOME:-$HOME/.config}/sump"
REPO="${SUMP_REPO:-thephilip/sump}"
MCP_TS="${CFG}/sump-mcp.ts"
MCP_MJS="${CFG}/sump-mcp.mjs"

mkdir -p "${CFG}"

echo "==> Downloading sump-mcp.ts (MCP server)..."
curl -fsSL "https://raw.githubusercontent.com/$REPO/master/sump-mcp.ts" -o "${MCP_TS}"

echo "==> Building sump-mcp.mjs..."
if npx esbuild "${MCP_TS}" --bundle --platform=node --format=esm --outfile="${MCP_MJS}" 2>/dev/null; then
  echo "  built ${MCP_MJS}"
else
  echo "  esbuild not available — use 'npx tsx ${MCP_TS}' instead of node"
fi

[ -f "${CFG}/sump-blacklist.json" ] || {
  curl -fsSL "https://raw.githubusercontent.com/$REPO/master/sump-blacklist.json" -o "${CFG}/sump-blacklist.json"
  echo "  created ${CFG}/sump-blacklist.json (seed)"
}
[ -f "${CFG}/sump-whitelist.json" ] || {
  echo '[]' > "${CFG}/sump-whitelist.json"
  echo "  created ${CFG}/sump-whitelist.json (empty)"
}

NODE="$(which node 2>/dev/null || echo node)"
CONFIGURED=""

# OpenCode
if command -v opencode >/dev/null 2>&1; then
  OC="${XDG_CONFIG_HOME:-$HOME/.config}/opencode"
  mkdir -p "${OC}/plugins" "${OC}/commands"
  echo "==> OpenCode detected — installing plugin + command..."
  curl -fsSL "https://raw.githubusercontent.com/$REPO/master/sump.ts" -o "${OC}/plugins/sump.ts"
  curl -fsSL "https://raw.githubusercontent.com/$REPO/master/commands/sump.md" -o "${OC}/commands/sump.md"
  CONFIGURED="${CONFIGURED} opencode"
  echo ""
  echo "  OpenCode: symlink if needed:"
  echo "    ln -sf ${OC}/plugins/sump.ts ~/.opencode/plugins/sump.ts"
  echo "    ln -sf ${OC}/commands/sump.md ~/.opencode/commands/sump.md"
fi

# Codex CLI
if command -v codex >/dev/null 2>&1; then
  echo "==> Codex CLI detected — registering MCP server..."
  codex mcp add sump -- "${NODE}" "${MCP_MJS}" 2>/dev/null && CONFIGURED="${CONFIGURED} codex" || echo "  codex mcp add failed — add manually"
fi

# Gemini CLI
if command -v gemini >/dev/null 2>&1; then
  echo "==> Gemini CLI detected — registering MCP server..."
  gemini mcp add sump -- "${NODE}" "${MCP_MJS}" 2>/dev/null && CONFIGURED="${CONFIGURED} gemini" || echo "  gemini mcp add failed — add manually"
fi

# Claude Code
if command -v claude >/dev/null 2>&1; then
  CONFIGURED="${CONFIGURED} claude"
  echo ""
  echo "  Claude Code: add to ~/.claude.json:"
  echo "    { \"mcpServers\": { \"sump\": { \"command\": \"${NODE}\", \"args\": [\"${MCP_MJS}\"] } } }"
fi

echo ""
if [ -n "${CONFIGURED}" ]; then
  echo "sump installed. Configured for:${CONFIGURED}"
else
  echo "sump installed. No supported clients detected on PATH."
  echo "Register manually for your MCP host:"
  echo "  node ${MCP_MJS}"
fi
