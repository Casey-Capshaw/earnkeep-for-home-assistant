#!/usr/bin/env bash
# verify-device.sh — pull a real screenshot off the kitchen Fire HD 10 via
# Fully Kiosk's remote-admin API. The final word on any visual change is what
# the actual tablet shows — desktop/browser verification has fooled us twice.
#
# Its screenshots can fool you too: Fully Kiosk's capture sometimes misdraws
# composited layers. With Home Assistant's sidebar open it has drawn the
# second kid's card at half width while the screen itself was fine. When a
# capture looks wrong, look at the tablet before you change the layout.
#
# Usage: scripts/verify-device.sh [output.png]
# Needs EARNKEEP_TABLET_HOST (and EARNKEEP_HA_SSH unless FK_PASSWORD is set)
# in .env at the repo root — see .env.example.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"
# shellcheck source=scripts/env.sh
. "$SCRIPT_DIR/env.sh"
FK_ADDR="$(earnkeep_fk_host)" || exit 1
FK_PASSWORD="$(earnkeep_fk_password)" || exit 1
if [ -z "$FK_PASSWORD" ]; then
  echo "ERROR: no Fully Kiosk password (set FK_PASSWORD, or check that" >&2
  echo "/config/.earnkeep_fk_password exists on $EARNKEEP_HA_SSH)" >&2
  exit 1
fi
OUT="${1:-$ROOT_DIR/frontend/dev/screenshots/device-$(date +%Y%m%d-%H%M%S).png}"

mkdir -p "$(dirname "$OUT")"
curl -sf "http://$FK_ADDR/?cmd=getScreenshot&password=$FK_PASSWORD" -o "$OUT"

if [ ! -s "$OUT" ]; then
  echo "ERROR: empty response — is Fully Kiosk's remote admin up? (Note: its"
  echo "web server dies when the FK app dies; the tablet may still answer ping.)"
  rm -f "$OUT"
  exit 1
fi
echo "Device screenshot: $OUT"
