// EarnKeep - Abstract API client interface
// Both HA WebSocket and standalone HTTP clients implement this interface.

import type {
  AppData,
  AppSettings,
  Accountability,
  FamilyMember,
  HabitState,
  Transaction,
} from '../types';
import type { SpriteFile } from '../world/sprites/traits';

export interface EarnKeepAPI {
  getData(): Promise<AppData>;
  toggleHabit(
    accountabilityId: string,
    childId: string,
    completed: boolean,
    date?: string
  ): Promise<HabitState[]>;
  addTransaction(
    childId: string,
    label: string,
    amount: number,
    date?: string,
    dateUserEntered?: boolean
  ): Promise<Transaction>;
  updateTransaction(
    transactionId: string,
    updates: Partial<Transaction>
  ): Promise<Transaction>;
  updateSettings(settings: Partial<AppSettings>): Promise<AppSettings>;
  updateFamilyMember(
    memberId: string,
    updates: Partial<FamilyMember>
  ): Promise<FamilyMember>;
  addFamilyMember(
    data: { name: string; color?: string; emoji?: string; compensation?: number; birthday?: string; sprite?: SpriteFile | null }
  ): Promise<FamilyMember>;
  deleteFamilyMember(memberId: string): Promise<void>;
  addAccountability(
    data: Omit<Accountability, 'id'>
  ): Promise<Accountability>;
  updateAccountability(
    accountabilityId: string,
    updates: Partial<Accountability>
  ): Promise<Accountability>;
  deleteAccountability(accountabilityId: string): Promise<void>;
  /** Checks the PIN on the server. A correct PIN opens an admin session
   * that the client then sends with every admin command; the PIN itself is
   * never sent to the panel. retryAfter > 0 means too many wrong tries. */
  verifyPin(pin: string): Promise<{ valid: boolean; retryAfter: number }>;
  /** Ends the admin session. */
  lockAdmin(): Promise<void>;
  /** Called when the server rejects an admin command (session expired). */
  onAdminExpired?: () => void;
}
