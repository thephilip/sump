#!/bin/sh
# ponytail: single-file install, add multi-file/multi-platform support if needed
set -e
CFG="${XDG_CONFIG_HOME:-$HOME/.config}/opencode"
REPO="${SUMP_REPO:-thephilip/sump}"
mkdir -p "${CFG}/plugins" "${CFG}/commands"
curl -fsSL "https://raw.githubusercontent.com/$REPO/master/sump.ts" -o "${CFG}/plugins/sump.ts"
curl -fsSL "https://raw.githubusercontent.com/$REPO/master/commands/sump.md" -o "${CFG}/commands/sump.md"
[ -f "${CFG}/sump-blacklist.json" ] || {
  curl -fsSL "https://raw.githubusercontent.com/$REPO/master/sump-blacklist.json" -o "${CFG}/sump-blacklist.json"
  echo "  created ${CFG}/sump-blacklist.json (seed)"
}
[ -f "${CFG}/sump-whitelist.json" ] || {
  echo '[]' > "${CFG}/sump-whitelist.json"
  echo "  created ${CFG}/sump-whitelist.json (empty)"
}
echo "sump installed: plugin + commands + config files"
