// EarnKeep — today's world, kept current. The expensive part (generating
// the layered scene) runs once per calendar day (and when birthdays
// change); weather and the hour only swap the atmosphere + critters.
//
// Dev/test overrides (harmless on the kiosk): ?ekdate=YYYY-MM-DD,
// ?ekweather=<HA weather state>, ?ekhour=H — used by the dev harness and
// scripts/verify-*.mjs to preview any day. The sprites add ?eksprites=<game>
// and ?ekspriteslayer=<level> (see sprites/, scripts/sprite-frames.mjs).

import { useEffect, useMemo, useState } from 'react';
import { useStore } from '../store';
import { buildDay, atmosphereFor, crittersFor, daySeed, type Day, type Weather } from './daily';
import { collectBirthdays } from './festive';

function overrides() {
  const q = new URLSearchParams(typeof location !== 'undefined' ? location.search : '');
  return { date: q.get('ekdate'), weather: q.get('ekweather'), hour: q.get('ekhour') };
}

export function nowWithOverrides(): Date {
  const o = overrides();
  const d = o.date ? new Date(`${o.date}T12:00:00`) : new Date();
  if (o.date) {
    const real = new Date();
    d.setHours(real.getHours(), real.getMinutes());
  }
  if (o.hour) d.setHours(Number(o.hour), 0);
  return d;
}

export function useDay(): Day {
  const family = useStore((s) => s.family);
  const settings = useStore((s) => s.settings);
  const liveWeather = useStore((s) => s.weather);
  const weather = (overrides().weather || liveWeather || 'sunny') as Weather;

  const [now, setNow] = useState(nowWithOverrides);
  useEffect(() => {
    const t = setInterval(() => setNow(nowWithOverrides()), 60_000);
    return () => clearInterval(t);
  }, []);

  const birthdays = useMemo(
    () => collectBirthdays(family, settings?.celebrations ?? []),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [JSON.stringify(family.map((k) => [k.id, k.name, k.color, k.birthday])), JSON.stringify(settings?.celebrations ?? [])],
  );

  const seed = daySeed(now);
  const base = useMemo(() => {
    const noon = new Date(now);
    noon.setHours(12, 0, 0, 0);
    return buildDay(noon, 'sunny', birthdays);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seed, birthdays]);

  const hour = now.getHours();
  return useMemo(
    () => ({
      ...base,
      date: now,
      atmosphere: atmosphereFor(weather, base.season, hour),
      critters: crittersFor(base.season, weather, base.kit, hour, (seed * 2654435761) >>> 3, base.special),
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [base, weather, hour],
  );
}
