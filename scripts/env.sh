#!/usr/bin/env bash
# env.sh — sourced by the other scripts. Loads per-household settings
# (HA host, tablet address, ...) from the gitignored .env at the repo root;
# see .env.example for every variable. Values already exported in the
# environment win over the file.
#
# Expects ROOT_DIR to be set by the caller.

earnkeep_load_env() {
  local file="$ROOT_DIR/.env" line key val
  [ -r "$file" ] || return 0
  while IFS= read -r line || [ -n "$line" ]; do
    line="${line%$'\r'}"
    case "$line" in ''|\#*) continue ;; esac
    line="${line#export }"
    key="${line%%=*}"
    val="${line#*=}"
    [[ "$key" =~ ^[A-Za-z_][A-Za-z0-9_]*$ ]] || continue
    if [[ "$val" =~ ^\"(.*)\"$ ]] || [[ "$val" =~ ^\'(.*)\'$ ]]; then
      val="${BASH_REMATCH[1]}"
    fi
    if [ -z "${!key+x}" ]; then
      export "$key=$val"
    fi
  done < "$file"
}

# earnkeep_require VAR [VAR...] — exit with a clear error if any is empty.
earnkeep_require() {
  local var missing=0
  for var in "$@"; do
    if [ -z "${!var:-}" ]; then
      echo "ERROR: $var is not set." >&2
      missing=1
    fi
  done
  if [ "$missing" = 1 ]; then
    echo "Set it in $ROOT_DIR/.env (copy .env.example) or export it." >&2
    exit 1
  fi
}

# Fully Kiosk remote-admin address as host:port. FK_HOST (host:port) is
# still honoured as a one-off override.
earnkeep_fk_host() {
  if [ -n "${FK_HOST:-}" ]; then
    echo "$FK_HOST"
  else
    earnkeep_require EARNKEEP_TABLET_HOST
    echo "${EARNKEEP_TABLET_HOST}:${EARNKEEP_TABLET_PORT:-2323}"
  fi
}

# Fully Kiosk password: FK_PASSWORD wins, else read it off HA over ssh.
earnkeep_fk_password() {
  if [ -n "${FK_PASSWORD:-}" ]; then
    echo "$FK_PASSWORD"
  else
    earnkeep_require EARNKEEP_HA_SSH
    ssh "$EARNKEEP_HA_SSH" cat /config/.earnkeep_fk_password 2>/dev/null | tr -d '[:space:]'
  fi
}

earnkeep_load_env
