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

if [ -t 0 ]; then
  echo ""
  echo "--- Configure clients ---"

  printf "Set up OpenCode? [Y/n] "
  read -r ans
  case "$ans" in
    [Nn]*) ;;
    *)
      mkdir -p ~/.opencode/plugins ~/.opencode/commands
      ln -sf "${CFG}/plugins/sump.ts" ~/.opencode/plugins/sump.ts
      ln -sf "${CFG}/commands/sump.md" ~/.opencode/commands/sump.md
      echo "  OpenCode ready"
      ;;
  esac

  printf "Set up Claude Code? [y/N] "
  read -r ans
  case "$ans" in
    [Yy]*)
      echo ""
      echo "  Add this to ~/.claude/settings.json or .mcp.json:"
      echo "  { \"mcpServers\": { \"sump\": { \"command\": \"npx\", \"args\": [\"tsx\", \"${MCP}\"] } } }"
      echo ""
      ;;
  esac

  printf "Set up Codex CLI? [y/N] "
  read -r ans
  case "$ans" in
    [Yy]*)
      echo ""
      echo "  Run: codex mcp add sump -- npx tsx ${MCP}"
      echo ""
      ;;
  esac

  printf "Set up Gemini CLI? [y/N] "
  read -r ans
  case "$ans" in
    [Yy]*)
      echo ""
      echo "  Run: gemini mcp add sump -- npx tsx ${MCP}"
      echo ""
      ;;
  esac

  echo "--- Done ---"
else
  echo ""
  echo "Run again interactively to configure clients, or set up manually:"
  echo "  Claude Code: add MCP server pointing to ${MCP}"
  echo "  Codex CLI:   codex mcp add sump -- npx tsx ${MCP}"
  echo "  Gemini CLI:  gemini mcp add sump -- npx tsx ${MCP}"
fi
