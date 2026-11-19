# Setting up a wall tablet

EarnKeep is built to live on a tablet on the wall or the kitchen counter,
where the kids check off their habits through the day. This guide sets one up
with [Fully Kiosk Browser](https://www.fully-kiosk.com/), which keeps the
screen on, locks it to EarnKeep, and lets EarnKeep play sounds on it.

Any tablet that runs Fully Kiosk works. EarnKeep is designed and tested at
the screen of a 10-inch Amazon Fire HD 10: **1280 × 800** at 1.5× (Android's
default), or 1920 × 1200 at 1× (Fully Kiosk's desktop viewport). Other
sizes work, but those two are the ones checked before every release.

A tablet is optional. Without one, EarnKeep still works from any browser or
the Home Assistant app, just without sound.

## What you need

- A tablet on the same network as Home Assistant.
- Fully Kiosk Browser. The free version is enough to show EarnKeep. Sounds
  need **remote administration**, which is a Fully Kiosk PLUS feature (a
  one-time license per device).
- A Home Assistant login for the tablet. A separate, non-administrator user
  is best: the tablet stays signed in, and the admin pages stay out of reach.
  EarnKeep's own Admin tab is protected by its PIN either way.

## 1. Install Fully Kiosk

Install Fully Kiosk Browser on the tablet. On a Fire tablet, which has no
Google Play, download it from fully-kiosk.com and allow installing apps from
unknown sources when Fire OS asks.

## 2. Point it at EarnKeep

In Fully Kiosk's settings (swipe in from the left edge, then **Settings**):

1. **Web Content Settings → Start URL:** your Home Assistant address followed
   by `/earn-keep`, for example `http://homeassistant.local:8123/earn-keep`.
2. Go back and let it load, then sign in as the tablet's Home Assistant user.
   Tick **Keep me logged in**.

EarnKeep fills the space Home Assistant gives it. If Home Assistant's
sidebar shows along the left edge, collapse it with the menu button at its
top.

## 3. Keep the screen on

Still in Fully Kiosk's settings:

- **Device Management → Keep Screen On:** on.
- **Device Management → Screen Brightness:** set to taste. A wall screen at
  full brightness is a lot at night.
- **Kiosk Mode** (PLUS): on, if you want to stop little hands from leaving
  EarnKeep. Set a kiosk PIN so you can still get out.

## 4. Turn the motion back on

Many tablets ask apps to reduce motion (a battery or accessibility setting),
and EarnKeep follows that by default, which stills its world. To keep it
animated:

1. Open EarnKeep's **Admin** tab and enter the PIN.
2. **Settings → Motion → Always animate.**

## 5. Sounds (optional, needs PLUS)

EarnKeep plays a sound on the tablet when a kid checks off a habit, and the
sound builds as they keep going. It sends the sound through Fully Kiosk's
remote administration.

1. In Fully Kiosk: **Remote Administration (PLUS) → Enable Remote
   Administration:** on. Set a **Remote Admin Password** and allow
   **Remote Admin from Local Network**. Note the port it shows (2323 by
   default).
2. Give the tablet a fixed address on your network (a DHCP reservation in
   your router), so Home Assistant can always find it.
3. In Home Assistant: **Settings → Devices & services → EarnKeep →
   Configure.** Enter the tablet's address and the remote-admin port.
4. Put the remote-admin password in a file named `.earnkeep_fk_password` in
   Home Assistant's config folder (the folder with `configuration.yaml`),
   with nothing else in it. On a system with a terminal, `chmod 600` it. The
   password is kept there, not in EarnKeep's settings, so it never shows in
   Home Assistant's settings screens.
5. Check **Settings → System → Network:** the tablet downloads the sound
   from Home Assistant's own address, so the local URL there must be one
   the tablet can reach.

Leave the tablet address empty to turn sounds off. Everything else carries on
as normal.

Sounds play on the tablet's **alarm** channel, so they play even when the
media volume is down. EarnKeep sets that channel to full volume before each
sound, so the tablet's volume buttons won't quiet it; there's no volume
setting in EarnKeep yet.

**Spoken reminders.** EarnKeep can also speak a reminder of what's left to
do, through the same path, using Home Assistant's ElevenLabs integration for
the voice. There's no settings screen for reminders yet, so they're off
unless you add them to EarnKeep's stored data yourself.

## If something's wrong

| What you see | What to check |
| --- | --- |
| A login page instead of EarnKeep | The tablet's Home Assistant session ended. Sign in again with **Keep me logged in** ticked. |
| EarnKeep is still, nothing moves | Step 4: set Motion to **Always animate**. |
| No sound | Remote administration is on (PLUS), the address and port in EarnKeep → Configure are right, `.earnkeep_fk_password` matches the Fully Kiosk password, and the tablet can reach Home Assistant's local URL. Home Assistant logs a failed sound only at debug level, so test with a real check-off. |
| An old version after an update | Fully Kiosk caches pages. Reload from Fully Kiosk's menu; if it's still old, clear Fully Kiosk's cache (from its settings or its remote-admin page) and reload. |
| The bottom of the screen is blank or cut off | Note the tablet's screen size and Fully Kiosk's viewport setting and open an issue. EarnKeep is checked at 1280 × 800 and 1920 × 1200. |

For developers: `scripts/verify-device.sh` takes a screenshot from the
tablet through Fully Kiosk, and `FK_REFRESH=1 scripts/deploy.sh` clears the
tablet's cache and reloads it after a deploy. Both read the tablet's address
from `.env` (see `.env.example`).
