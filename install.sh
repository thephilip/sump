#!/bin/sh
# ponytail: single-file install, add multi-file/multi-platform support if needed
set -e
CFG="${XDG_CONFIG_HOME:-$HOME/.config}/opencode"
REPO="${PLUNGER_REPO:-anomalyco/plunger}"
mkdir -p "${CFG}/plugins" "${CFG}/commands"
curl -fsSL "https://raw.githubusercontent.com/$REPO/main/plunger.ts" -o "${CFG}/plugins/plunger.ts"
curl -fsSL "https://raw.githubusercontent.com/$REPO/main/commands/plunger.md" -o "${CFG}/commands/plunger.md"
[ -f "${CFG}/plunger-blacklist.json" ] || {
  curl -fsSL "https://raw.githubusercontent.com/$REPO/main/plunger-blacklist.json" -o "${CFG}/plunger-blacklist.json"
  echo "  created ${CFG}/plunger-blacklist.json (seed)"
}
[ -f "${CFG}/plunger-whitelist.json" ] || {
  echo '[]' > "${CFG}/plunger-whitelist.json"
  echo "  created ${CFG}/plunger-whitelist.json (empty)"
}
echo "plunger installed: plugin + commands + config files"
