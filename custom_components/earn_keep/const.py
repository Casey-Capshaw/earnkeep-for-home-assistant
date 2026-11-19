# EarnKeep - Constants
# Custom integration for Home Assistant: kid accountability tracker and banking system.

DOMAIN = "earn_keep"
STORAGE_KEY = "earn_keep.data"
STORAGE_VERSION = 1
DAILY_STATE_KEY = "earn_keep.daily_state"
# NOTE: the integration version lives ONLY in manifest.json. A second VERSION
# constant here once drove the panel's cache-busting URL, drifted out of sync,
# and caused days of stale-bundle confusion — the js_url ?v= param is now a
# content hash of the bundle itself (see __init__.py).

TIME_OF_DAY_FILTERS = ["morning", "evening", "all"]

# Fully Kiosk announcer (optional). Host and port are integration options
# (Settings -> Devices & Services -> EarnKeep -> Configure); an empty host
# disables tablet playback. See kiosk.py.
CONF_FULLY_KIOSK_HOST = "fully_kiosk_host"
CONF_FULLY_KIOSK_PORT = "fully_kiosk_port"
DEFAULT_FULLY_KIOSK_PORT = 2323  # Fully Kiosk's stock remote-admin port
# Password lives in HA's config dir, never in the repo (see announcer.py).
FULLY_KIOSK_PASSWORD_FILE = ".earnkeep_fk_password"
