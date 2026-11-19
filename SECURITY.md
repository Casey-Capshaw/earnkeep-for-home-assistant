# Security

## What the admin PIN protects

EarnKeep's Admin screens sit behind a PIN, so kids tapping around a shared
tablet can't change pay rates, balances, people or tasks.

- The PIN stays on the server. The panel never receives it. The server checks
  each attempt and slows down after five wrong guesses.
- A correct PIN opens a short admin session (30 minutes, renewed while in
  use). The server refuses admin changes without one.
- **Home Assistant administrators can always make admin changes**, with or
  without the PIN. They can already edit EarnKeep's storage file, so the PIN
  adds nothing for them. If kids' devices are signed in to Home Assistant,
  use a non-admin user there.
- Anyone signed in to your Home Assistant can *see* EarnKeep's data: names,
  balances, tasks and transactions. The PIN guards changes, not reading.

Change the default PIN (`1234`) after setup.

## Other notes

- The optional Fully Kiosk announcer reads the kiosk's remote-admin password
  from a file in Home Assistant's config directory (`.earnkeep_fk_password`,
  `chmod 600`). It is never stored in EarnKeep's data or in this repo.
- EarnKeep makes no outbound internet requests. Everything stays on your
  Home Assistant.

## Reporting a vulnerability

Please report security problems privately through GitHub's
[private vulnerability reporting](../../security/advisories/new) rather than
in a public issue. Expect a reply within a week.
