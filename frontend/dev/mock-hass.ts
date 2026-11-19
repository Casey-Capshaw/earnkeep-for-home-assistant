// EarnKeep - Mock hass object for the device-fidelity dev harness.
// Feeds the REAL panel element (ha-panel-entry.ts) fixture data over the
// same callWS interface HA provides, so what renders here is the exact
// production code path — no backend, no tokens, fully repeatable.
//
// Fixture intent: exercise every visual state the Roles/Bank views have —
// streak flame + optimistic preview, badge shelf, partially-complete
// sections, compensated day rows with done/missed/today states, positive
// and negative transactions.

import type {
  AppData,
  Accountability,
  FamilyMember,
  HabitState,
  Transaction,
} from '../src/types';
import type { SpriteFile } from '../src/world/sprites/traits';
import fern from '../test/fixtures/fern.sprite.json';
import rowan from '../test/fixtures/rowan.sprite.json';

const iso = (d: Date) => d.toISOString().slice(0, 10);

const today = new Date();
const monday = new Date(today);
monday.setDate(today.getDate() - ((today.getDay() + 6) % 7));
const weekDates = Array.from({ length: 7 }, (_, i) => {
  const d = new Date(monday);
  d.setDate(monday.getDate() + i);
  return iso(d);
});

const family: FamilyMember[] = [
  {
    id: 'owen',
    name: 'Owen',
    color: '#FFB627',
    emoji: '🚀',
    compensation: 5,
    bank_balance: 5.08,
    current_streak: 12,
    best_streak: 12,
    badges: [{ id: 'b1', streak_days: 7, earned_at: '2026-07-03T06:00:00Z' }],
    birthday: '2017-03-14',
    sprite: rowan as SpriteFile,
  },
  {
    id: 'hazel',
    name: 'Hazel',
    color: '#FF5A5F',
    emoji: '🌻',
    compensation: 5,
    bank_balance: 93.96,
    current_streak: 34,
    best_streak: 34,
    badges: [
      { id: 'b2', streak_days: 7, earned_at: '2026-06-06T06:00:00Z' },
      { id: 'b3', streak_days: 21, earned_at: '2026-06-20T06:00:00Z' },
      { id: 'b4', streak_days: 30, earned_at: '2026-06-29T06:00:00Z' },
    ],
    birthday: '2019-10-02',
    sprite: fern as SpriteFile,
  },
];

// Content volume mirrors the a typical household load (5 morning + 5 evening
// dailies per kid + a weekly) — the fit-on-screen question is only honest
// at real volume.
const accountabilities: Accountability[] = [
  { id: 'a1', name: 'Brush your teeth', entity_slug: 'brush_am', emoji: '🪥', type: 'daily', time_of_day: 'morning', assigned_to: ['owen', 'hazel'], recurrence_days: [0, 1, 2, 3, 4, 5, 6] },
  { id: 'a2', name: 'Feed Biscuit', entity_slug: 'feed_biscuit', emoji: '🐶', type: 'daily', time_of_day: 'morning', assigned_to: ['owen', 'hazel'], recurrence_days: [0, 1, 2, 3, 4, 5, 6] },
  { id: 'a3', name: 'Put on your shoes', entity_slug: 'shoes', emoji: '📚', type: 'daily', time_of_day: 'morning', assigned_to: ['owen', 'hazel'], recurrence_days: [0, 1, 2, 3, 4, 5, 6] },
  { id: 'a4', name: 'Pack your lunch', entity_slug: 'lunch', emoji: '📚', type: 'daily', time_of_day: 'morning', assigned_to: ['owen', 'hazel'], recurrence_days: [0, 1, 2, 3, 4, 5, 6] },
  { id: 'a5', name: 'Floss your teeth', entity_slug: 'floss', emoji: '🪥', type: 'daily', time_of_day: 'morning', assigned_to: ['owen', 'hazel'], recurrence_days: [0, 1, 2, 3, 4, 5, 6] },
  { id: 'a6', name: 'Brush your teeth', entity_slug: 'brush_pm', emoji: '🪥', type: 'daily', time_of_day: 'evening', assigned_to: ['owen', 'hazel'], recurrence_days: [0, 1, 2, 3, 4, 5, 6] },
  { id: 'a7', name: "Put on your PJ's", entity_slug: 'pjs', emoji: '👕', type: 'daily', time_of_day: 'evening', assigned_to: ['owen', 'hazel'], recurrence_days: [0, 1, 2, 3, 4, 5, 6] },
  { id: 'a8', name: 'Take your vitamins', entity_slug: 'vitamins', emoji: '💊', type: 'daily', time_of_day: 'evening', assigned_to: ['owen', 'hazel'], recurrence_days: [0, 1, 2, 3, 4, 5, 6] },
  { id: 'a9', name: 'Tidy your room', entity_slug: 'tidy_room', emoji: '🧸', type: 'daily', time_of_day: 'evening', assigned_to: ['owen', 'hazel'], recurrence_days: [0, 1, 2, 3, 4, 5, 6] },
  { id: 'a10', name: 'Read a book', entity_slug: 'read', emoji: '📖', type: 'daily', time_of_day: 'evening', assigned_to: ['owen', 'hazel'], recurrence_days: [0, 1, 2, 3, 4, 5, 6] },
  { id: 'a11', name: 'Empty Dishwasher', entity_slug: 'dishwasher', emoji: '🍽️', type: 'compensated', time_of_day: 'morning', assigned_to: ['owen'], recurrence_days: [0, 2, 4] },
  { id: 'a12', name: 'Water Plants', entity_slug: 'plants', emoji: '🪴', type: 'compensated', time_of_day: 'evening', assigned_to: ['hazel'], recurrence_days: [1, 3, 5] },
];

const daily_habits: HabitState[] = [
  // Partial completion in both sections (mirrors the mid-day photo state)
  { accountability_id: 'a1', child_id: 'owen', completed: true, completed_at: '2026-07-10T07:45:00Z', date: null },
  { accountability_id: 'a5', child_id: 'owen', completed: true, completed_at: '2026-07-10T07:50:00Z', date: null },
  { accountability_id: 'a8', child_id: 'owen', completed: true, completed_at: '2026-07-10T19:00:00Z', date: null },
  { accountability_id: 'a3', child_id: 'hazel', completed: true, completed_at: '2026-07-10T07:40:00Z', date: null },
  { accountability_id: 'a4', child_id: 'hazel', completed: true, completed_at: '2026-07-10T07:42:00Z', date: null },
  // Compensated: one done earlier this week, one missed
  { accountability_id: 'a11', child_id: 'owen', completed: true, completed_at: '2026-07-08T08:00:00Z', date: weekDates[0] },
  { accountability_id: 'a12', child_id: 'hazel', completed: false, completed_at: null, date: weekDates[1] },
];

const transactions: Transaction[] = [
  { id: 't1', child_id: 'hazel', label: 'Weekly pay', amount: 5, date: weekDates[0], date_user_entered: false, created_at: '2026-07-06T18:00:00Z', source: 'compensation' },
  { id: 't2', child_id: 'hazel', label: 'Interest', amount: 0.47, date: '2026-07-01', date_user_entered: false, created_at: '2026-07-01T09:00:00Z', source: 'interest' },
  { id: 't3', child_id: 'hazel', label: 'Lego set', amount: -24.99, date: '2026-06-28', date_user_entered: true, created_at: '2026-06-28T15:00:00Z', source: 'manual' },
  { id: 't4', child_id: 'owen', label: 'Weekly pay', amount: 5, date: weekDates[0], date_user_entered: false, created_at: '2026-07-06T18:00:00Z', source: 'compensation' },
  { id: 't5', child_id: 'owen', label: 'Slushie', amount: -3.5, date: '2026-07-05', date_user_entered: true, created_at: '2026-07-05T14:00:00Z', source: 'manual' },
];

const data: AppData = {
  family,
  accountabilities,
  transactions,
  daily_habits,
  settings: {
    admin_pin: '0000',
    interest_rate: 5,
    daily_reset_time: '03:00',
    compensation_day: 6,
    compensation_time: '18:00',
    monthly_interest_day: 1,
    monthly_interest_time: '09:00',
    timezone: 'America/Denver',
    home_url: '/wall-tablet/0',
    celebrations: [
      { name: 'Mom', date: '1985-08-30' },
      { name: 'Dad', date: '1984-02-17' },
    ],
    weather_entity: 'weather.home',
    motion: 'auto',
  },
  week_info: { today: iso(today), week_start: weekDates[0], week_dates: weekDates },
};

export function createMockHass() {
  // Live weather like HA's hass.states — ?ekweather= overrides it in useDay.
  return {
    states: { 'weather.home': { state: 'partlycloudy' } } as Record<string, { state: string }>,
    async callWS(msg: Record<string, unknown>): Promise<unknown> {
      const type = msg.type as string;
      const ADMIN_CMDS = ['add_transaction', 'update_transaction', 'update_settings', 'update_family_member', 'add_family_member', 'delete_family_member', 'add_accountability', 'update_accountability', 'delete_accountability'];
      if (ADMIN_CMDS.includes(type.replace('earn_keep/', '')) && msg.admin_token !== 'mock-admin-token') {
        throw { code: 'unauthorized', message: 'Admin PIN required' };
      }
      switch (type) {
        case 'earn_keep/get_data': {
          // like the real backend: the PIN never leaves the server
          const out = structuredClone(data);
          delete (out.settings as { admin_pin?: string }).admin_pin;
          return out;
        }
        case 'earn_keep/toggle_habit': {
          const existing = data.daily_habits.find(
            (h) =>
              h.accountability_id === msg.accountability_id &&
              h.child_id === msg.child_id
          );
          if (existing) {
            existing.completed = msg.completed as boolean;
            existing.completed_at = existing.completed ? new Date().toISOString() : null;
          } else {
            data.daily_habits.push({
              accountability_id: msg.accountability_id as string,
              child_id: msg.child_id as string,
              completed: msg.completed as boolean,
              completed_at: new Date().toISOString(),
              date: (msg.date as string) ?? null,
            });
          }
          return { daily_habits: structuredClone(data.daily_habits) };
        }
        case 'earn_keep/verify_pin': {
          const valid = msg.pin === data.settings.admin_pin;
          return { valid, token: valid ? 'mock-admin-token' : null, retry_after: 0 };
        }
        case 'earn_keep/lock_admin':
          return { success: true };
        // Admin mutations mirror the real backend's return shapes — the
        // store merges these results straight into state, so returning {}
        // here (the old behavior) crashed the UI after any admin save and
        // hid real bugs from the harness.
        case 'earn_keep/add_accountability': {
          const acct = {
            id: 'acct_' + Math.random().toString(36).slice(2, 8),
            name: msg.name as string,
            entity_slug: msg.entity_slug as string,
            emoji: msg.emoji as string,
            type: (msg.acct_type ?? 'daily') as 'daily' | 'compensated',
            time_of_day: (msg.time_of_day ?? 'morning') as 'morning' | 'evening',
            assigned_to: (msg.assigned_to ?? []) as string[],
            recurrence_days: (msg.recurrence_days ?? [0, 1, 2, 3, 4, 5, 6]) as number[],
          };
          data.accountabilities.push(acct);
          return structuredClone(acct);
        }
        case 'earn_keep/update_accountability': {
          const acct = data.accountabilities.find((a) => a.id === msg.accountability_id);
          if (!acct) throw new Error('not_found');
          const u = { ...(msg.updates as Record<string, unknown>) };
          if ('acct_type' in u) { u.type = u.acct_type; delete u.acct_type; }
          Object.assign(acct, u);
          return structuredClone(acct);
        }
        case 'earn_keep/delete_accountability': {
          data.accountabilities = data.accountabilities.filter((a) => a.id !== msg.accountability_id);
          data.daily_habits = data.daily_habits.filter((h) => h.accountability_id !== msg.accountability_id);
          return null;
        }
        case 'earn_keep/update_family_member': {
          const m = data.family.find((f) => f.id === msg.member_id);
          if (!m) throw new Error('not_found');
          Object.assign(m, msg.updates as Record<string, unknown>);
          return structuredClone(m);
        }
        case 'earn_keep/add_family_member': {
          const m = {
            id: 'kid_' + Math.random().toString(36).slice(2, 8),
            name: msg.name as string,
            color: (msg.color ?? '#FFB627') as string,
            emoji: (msg.emoji ?? '🙂') as string,
            compensation: (msg.compensation ?? 0) as number,
            bank_balance: 0,
            current_streak: 0,
            best_streak: 0,
            badges: [],
            birthday: (msg.birthday ?? '') as string,
            sprite: (msg.sprite ?? null) as FamilyMember['sprite'],
          };
          data.family.push(m);
          return structuredClone(m);
        }
        case 'earn_keep/delete_family_member': {
          data.family = data.family.filter((f) => f.id !== msg.member_id);
          return null;
        }
        case 'earn_keep/add_transaction': {
          const child = data.family.find((f) => f.id === msg.child_id);
          if (!child) throw new Error('not_found');
          const amount = msg.amount as number;
          child.bank_balance = +(child.bank_balance + amount).toFixed(2);
          const txn = {
            id: 'txn_' + Math.random().toString(36).slice(2, 8),
            child_id: child.id,
            label: msg.label as string,
            amount,
            date: iso(today),
            date_user_entered: !!msg.date_user_entered,
            created_at: new Date().toISOString(),
            source: 'manual' as const,
          };
          data.transactions.push(txn);
          return structuredClone(txn);
        }
        case 'earn_keep/update_settings': {
          Object.assign(data.settings, msg.settings as Record<string, unknown>);
          const out = structuredClone(data.settings);
          delete (out as { admin_pin?: string }).admin_pin;
          return out;
        }
        default:
          console.warn(`[mock-hass] unhandled command ${type} — returning {}`);
          return {};
      }
    },
  };
}
