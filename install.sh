#!/bin/sh
# ponytail: single-file install, add multi-file/multi-platform support if needed
set -e
REPO="${PLUNGER_REPO:-anomalyco/plunger}"
mkdir -p "${PLUNGER_DIR:-$HOME/.opencode/plugins}"
curl -fsSL "https://raw.githubusercontent.com/$REPO/main/plunger.ts" -o "${PLUNGER_DIR:-$HOME/.opencode/plugins}/plunger.ts"
echo "plunger installed to ${PLUNGER_DIR:-$HOME/.opencode/plugins}/plunger.ts"
