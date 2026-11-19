#!/usr/bin/env bash
# build.sh — Build React frontend → custom_components/earn_keep/frontend/
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"
FRONTEND_DIR="$ROOT_DIR/frontend"
OUTPUT_DIR="$ROOT_DIR/custom_components/earn_keep/frontend"

echo "=== Building EarnKeep Frontend ==="

# Install dependencies if needed
if [ ! -d "$FRONTEND_DIR/node_modules" ]; then
  echo "Installing dependencies..."
  cd "$FRONTEND_DIR" && npm install
fi

# Build
echo "Building React app..."
cd "$FRONTEND_DIR" && npm run build

# Verify output
if [ -f "$OUTPUT_DIR/earn-keep-panel.js" ]; then
  SIZE=$(wc -c < "$OUTPUT_DIR/earn-keep-panel.js")
  echo "Build successful: earn-keep-panel.js (${SIZE} bytes)"
else
  echo "ERROR: Build output not found at $OUTPUT_DIR/earn-keep-panel.js"
  exit 1
fi

echo "=== Done ==="
