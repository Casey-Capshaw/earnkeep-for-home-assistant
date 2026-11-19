#!/usr/bin/env bash
# deploy.sh — Build, ship atomically to HA, reload only the EarnKeep entry.
#
# Design (2026-07-10 architecture review):
#   - builds first, so the deployed bundle can never trail the source
#   - ships to a staging dir and verifies the bundle hash BEFORE swapping,
#     so a half-extracted tree is never live
#   - keeps the previous deploy at ${REMOTE}.prev for instant rollback
#   - reloads the EarnKeep config entry instead of restarting all of HA
#     (the panel re-registers with a content-hash ?v=, so clients are
#     guaranteed a fresh bundle — no manual version constant anywhere)
#   - optionally refreshes the kitchen tablet via Fully Kiosk's REST API
#
# Requirements:
#   - .env at the repo root (copy .env.example): EARNKEEP_HA_SSH (an ssh
#     alias or user@host for the HA box, key-based auth), EARNKEEP_HA_URL,
#     and for FK_REFRESH=1 the EARNKEEP_TABLET_* settings
#   - HA_TOKEN env var (long-lived access token) for the reload + verify
#     steps; without it the script deploys but tells you to reload manually
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"
LOCAL="$ROOT_DIR/custom_components/earn_keep"
# shellcheck source=scripts/env.sh
. "$SCRIPT_DIR/env.sh"
earnkeep_require EARNKEEP_HA_SSH

# Long-lived HA access token: env var wins, else ~/.config/earnkeep/ha_token
# (chmod 600, outside the repo — never commit or paste tokens).
TOKEN_FILE="$HOME/.config/earnkeep/ha_token"
if [ -z "${HA_TOKEN:-}" ] && [ -r "$TOKEN_FILE" ]; then
  HA_TOKEN="$(tr -d '[:space:]' < "$TOKEN_FILE")"
fi
HA_SSH="$EARNKEEP_HA_SSH"
if [ -n "${HA_TOKEN:-}" ]; then
  earnkeep_require EARNKEEP_HA_URL
fi
HA_URL="${EARNKEEP_HA_URL:-}"
HA_URL="${HA_URL%/}"
if [ "${FK_REFRESH:-0}" = "1" ]; then
  FK_ADDR="$(earnkeep_fk_host)" || exit 1
fi
# STAGE and PREV must live OUTSIDE custom_components/ — HA's loader scans
# that whole directory and a stray earn_keep.prev dir inside it broke the
# integration's own import on 2026-07-10 (ModuleNotFoundError: no module
# named 'custom_components.earn_keep.prev', setup failed entirely).
REMOTE="/homeassistant/custom_components/earn_keep"
STAGE="/homeassistant/earn_keep.deploy-stage"
PREV="/homeassistant/earn_keep.prev"
BUNDLE="frontend/earn-keep-panel.js"

echo "=== EarnKeep deploy → $HA_SSH ==="

# 1. Fresh build — the deployed bundle can never be stale relative to source.
"$SCRIPT_DIR/build.sh"

LOCAL_HASH=$(shasum -a 256 "$LOCAL/$BUNDLE" | cut -d' ' -f1)
echo "Local bundle sha256: ${LOCAL_HASH:0:12}…"

# 2. Ship to a staging dir. COPYFILE_DISABLE strips macOS AppleDouble (._*)
#    junk that previous tar-pipe deploys left in the live tree.
ssh "$HA_SSH" "rm -rf $STAGE && mkdir -p $STAGE"
COPYFILE_DISABLE=1 tar -C "$LOCAL" \
  --exclude='__pycache__' --exclude='.DS_Store' --exclude='._*' \
  -czf - . | ssh "$HA_SSH" "tar -C $STAGE -xzf -"

# 3. Verify the staged bundle byte-for-byte before it can go live.
REMOTE_HASH=$(ssh "$HA_SSH" "sha256sum $STAGE/$BUNDLE" | cut -d' ' -f1)
if [ "$LOCAL_HASH" != "$REMOTE_HASH" ]; then
  echo "ERROR: staged bundle hash mismatch (local ${LOCAL_HASH:0:12}, remote ${REMOTE_HASH:0:12}) — aborting before swap"
  ssh "$HA_SSH" "rm -rf $STAGE"
  exit 1
fi

# 4. Atomic-ish swap; previous deploy kept for rollback:
#    ssh "$EARNKEEP_HA_SSH" "rm -rf ${REMOTE} && mv ${PREV} ${REMOTE}" then reload.
ssh "$HA_SSH" "rm -rf $PREV && mv $REMOTE $PREV && mv $STAGE $REMOTE"
echo "Swapped in. Previous deploy preserved at $PREV"

# 5. Reload just the EarnKeep config entry (seconds, EarnKeep-only) instead
#    of restarting the whole house.
if [ -n "${HA_TOKEN:-}" ]; then
  ENTRY_ID=$(curl -sf -H "Authorization: Bearer $HA_TOKEN" \
    "$HA_URL/api/config/config_entries/entry?domain=earn_keep" \
    | python3 -c 'import json,sys; print(json.load(sys.stdin)[0]["entry_id"])')
  curl -sf -X POST -H "Authorization: Bearer $HA_TOKEN" \
    -H "Content-Type: application/json" \
    -d "{\"entry_id\": \"$ENTRY_ID\"}" \
    "$HA_URL/api/services/homeassistant/reload_config_entry" > /dev/null
  echo "Config entry reloaded ($ENTRY_ID)"

  # 6. Verify what HA actually serves matches what we built.
  SERVED_HASH=$(curl -sf "$HA_URL/earn_keep_frontend/earn-keep-panel.js?v=deploy-verify-$$" | shasum -a 256 | cut -d' ' -f1)
  if [ "$SERVED_HASH" = "$LOCAL_HASH" ]; then
    echo "Served bundle verified (sha256 match)"
  else
    echo "ERROR: served bundle does not match the build — investigate before trusting this deploy"
    exit 1
  fi
else
  echo "HA_TOKEN not set — skipping reload + verification."
  echo "Reload manually: Settings → Devices & Services → EarnKeep → Reload"
fi

# 7. Optional: refresh the kitchen tablet so it picks up the new panel now
#    rather than at its next natural reload. Set FK_REFRESH=1 to enable.
if [ "${FK_REFRESH:-0}" = "1" ]; then
  FK_PASSWORD="$(earnkeep_fk_password)"
  curl -sf "http://$FK_ADDR/?cmd=clearCache&password=$FK_PASSWORD" > /dev/null \
    && curl -sf "http://$FK_ADDR/?cmd=loadStartURL&password=$FK_PASSWORD" > /dev/null \
    && echo "Tablet cache cleared + start URL reloaded" \
    || echo "WARNING: tablet refresh failed (FK admin API unreachable?) — it will pick up the new bundle on its next reload"
fi

echo "=== Deploy complete ==="
