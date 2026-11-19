# EarnKeep - Fully Kiosk settings
# Pure helpers (no Home Assistant imports) so they can be unit-tested on a
# dev machine without HA installed.

from __future__ import annotations

DEFAULT_PORT = 2323


def fully_kiosk_base_url(host, port=None) -> str | None:
    """Return the Fully Kiosk remote-admin base URL, or None when disabled.

    ``host`` comes from the integration options; empty/None means the
    tablet announcer is not configured. A scheme or a ``:port`` typed into
    the host field is tolerated. ``port`` falls back to Fully Kiosk's
    default when missing or invalid.
    """
    host = (host or "").strip()
    for prefix in ("http://", "https://"):
        if host.lower().startswith(prefix):
            host = host[len(prefix):]
    host = host.rstrip("/")
    if not host:
        return None
    # "host:port" typed into the host field wins over the port option.
    name, _, maybe_port = host.rpartition(":")
    if name and maybe_port.isdigit() and (
        host.startswith("[") and name.endswith("]") or ":" not in name
    ):
        return f"http://{host}"
    try:
        port = int(port) if port not in (None, "") else DEFAULT_PORT
    except (TypeError, ValueError):
        port = DEFAULT_PORT
    if not 0 < port < 65536:
        port = DEFAULT_PORT
    return f"http://{host}:{port}"
