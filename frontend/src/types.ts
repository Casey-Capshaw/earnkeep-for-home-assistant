// EarnKeep - TypeScript type definitions
// Matches the backend Python dataclass models exactly.

export interface Badge {
  id: string;
  streak_days: number;
  earned_at: string;
}

export interface FamilyMember {
  id: string;
  name: string;
  color: string;
  emoji: string;
  compensation: number;
  bank_balance: number;
  current_streak: number;
  best_streak: number;
  badges: Badge[];
  birthday?: string; // YYYY-MM-DD, optional — drives the birthday world
  sprite?: import('./world/sprites/traits').SpriteFile | null; // Sprite character file; members without one don't appear in the world
}

export interface Accountability {
  id: string;
  name: string;
  entity_slug: string;
  emoji: string;
  type: 'daily' | 'compensated';
  time_of_day: 'morning' | 'evening';
  assigned_to: string[];
  recurrence_days: number[]; // 0=Mon..6=Sun
}

export interface Transaction {
  id: string;
  child_id: string;
  label: string;
  amount: number;
  date: string;
  date_user_entered: boolean;
  created_at: string;
  source: 'manual' | 'compensation' | 'interest' | 'migration';
}

export interface HabitState {
  accountability_id: string;
  child_id: string;
  completed: boolean;
  completed_at: string | null;
  date: string | null; // YYYY-MM-DD for compensated day-of-week tracking
}

export interface AppSettings {
  admin_pin?: string; // write-only: set it via updateSettings; the server never sends it
  interest_rate: number;
  daily_reset_time: string;
  compensation_day: number;
  compensation_time: string;
  monthly_interest_day: number;
  monthly_interest_time: string;
  timezone: string;
  home_url: string;
  /** Other birthdays the world celebrates (grown-ups, pets…). */
  celebrations?: { name: string; date: string }[];
  /** HA weather entity that drives the world's atmosphere. */
  weather_entity?: string;
  /** 'auto' follows the device's reduce-motion setting; 'always' animates. */
  motion?: 'auto' | 'always';
}

export interface WeekInfo {
  today: string;
  week_start: string;
  week_dates: string[]; // 7 dates for the current pay week
}

export interface AppData {
  family: FamilyMember[];
  accountabilities: Accountability[];
  transactions: Transaction[];
  daily_habits: HabitState[];
  settings: AppSettings;
  week_info: WeekInfo;
}
