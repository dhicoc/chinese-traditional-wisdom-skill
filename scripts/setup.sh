#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

echo "=== Chinese Traditional Wisdom AI Agent Workflow - Setup ==="
echo
echo "[1/4] Installing Python offline-oracle dependencies..."
if command -v pip3 >/dev/null 2>&1; then
  pip3 install -r "$ROOT_DIR/requirements.txt"
elif command -v pip >/dev/null 2>&1; then
  pip install -r "$ROOT_DIR/requirements.txt"
else
  echo "ERROR: pip/pip3 is required for the complete installation." >&2
  exit 1
fi

echo
echo "[2/4] Installing the authoritative TypeScript runtime..."
pnpm --dir "$ROOT_DIR/apps/visual" install --frozen-lockfile

echo
echo "[3/4] Verifying TypeScript contracts and tool discovery..."
pnpm --dir "$ROOT_DIR/apps/visual" typecheck
pnpm --dir "$ROOT_DIR/apps/visual" engine:list >/dev/null

echo
echo "[4/4] Setup complete."
echo
echo "Authoritative Agent runtime:"
echo "  pnpm engine:list"
echo "  pnpm engine:describe bazi_calculate"
echo "  pnpm engine bazi_calculate src/__fixtures__/local-tools/bazi_calculate.success.json"
echo
echo "Dashboard:"
echo "  pnpm dev"
echo
echo "Python dependencies were installed for offline maintenance cross-checks only."
echo "They are not a user-facing calculation source and must not replace ToolEnvelope results."
