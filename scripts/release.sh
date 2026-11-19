#!/usr/bin/env bash
# release.sh — Tag a release and create a GitHub release
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"

# Read version from manifest.json
VERSION=$(python3 -c "import json; print(json.load(open('$ROOT_DIR/custom_components/earn_keep/manifest.json'))['version'])")

if [ -z "$VERSION" ]; then
  echo "ERROR: Could not read version from manifest.json"
  exit 1
fi

TAG="v$VERSION"

echo "=== Creating release $TAG ==="

# Build frontend first
echo "Building frontend..."
bash "$SCRIPT_DIR/build.sh"

# The committed bundle must be exactly what the source builds to.
if [ -n "$(git -C "$ROOT_DIR" status --porcelain)" ]; then
  echo "ERROR: Uncommitted changes (or the committed bundle doesn't match a fresh build). Commit all changes before releasing."
  exit 1
fi

# Check the built panel itself renders.
node "$SCRIPT_DIR/verify-bundle.mjs"

# Create tag
echo "Creating tag $TAG..."
git -C "$ROOT_DIR" tag -a "$TAG" -m "Release $TAG"

# Push tag
echo "Pushing tag..."
git -C "$ROOT_DIR" push origin "$TAG"

# Create GitHub release
echo "Creating GitHub release..."
gh release create "$TAG" \
  --repo Casey-Capshaw/earnkeep-for-home-assistant \
  --title "EarnKeep $TAG" \
  --generate-notes

echo "=== Release $TAG published ==="
