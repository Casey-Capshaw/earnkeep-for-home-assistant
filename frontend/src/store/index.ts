// EarnKeep - Zustand state store
// Single source of truth for all app data and UI state.

import { create } from 'zustand';
import type { EarnKeepAPI } from '../api/client';
import type {
  Accountability,
  AppSettings,
  FamilyMember,
  HabitState,
  Transaction,
  WeekInfo,
} from '../types';

interface ToastState {
  message: string;
  type: 'success' | 'error';
}

interface ConfettiState {
  childId: string;
  color: string;
}

interface EarnKeepState {
  // Data
  family: FamilyMember[];
  accountabilities: Accountability[];
  transactions: Transaction[];
  dailyHabits: HabitState[];
  settings: AppSettings | null;
  weekInfo: WeekInfo | null;

  // Live HA weather state (weather.home etc.) — drives the world
  weather: string;

  // UI State
  activeView: 'roles' | 'bank' | 'admin';
  adminUnlocked: boolean;
  loading: boolean;
  confetti: ConfettiState | null;
  toast: ToastState | null;

  // API reference
  api: EarnKeepAPI | null;

  // Actions
  setApi(api: EarnKeepAPI): void;
  loadData(): Promise<void>;
  setActiveView(view: 'roles' | 'bank' | 'admin'): void;
  setWeather(state: string): void;
  toggleHabit(
    accountabilityId: string,
    childId: string,
    completed: boolean,
    date?: string
  ): Promise<void>;
  addTransaction(
    childId: string,
    label: string,
    amount: number,
    date?: string,
    dateUserEntered?: boolean
  ): Promise<boolean>;
  updateSettings(settings: Partial<AppSettings>): Promise<void>;
  updateFamilyMember(
    memberId: string,
    updates: Partial<FamilyMember>
  ): Promise<void>;
  addFamilyMember(
    data: { name: string; color?: string; emoji?: string; compensation?: number; birthday?: string }
  ): Promise<void>;
  deleteFamilyMember(memberId: string): Promise<void>;
  addAccountability(
    data: Omit<Accountability, 'id'>
  ): Promise<void>;
  updateAccountability(
    id: string,
    updates: Partial<Accountability>
  ): Promise<void>;
  deleteAccountability(id: string): Promise<void>;
  /** Resolves to true, or to a message saying why not. */
  verifyPin(pin: string): Promise<true | string>;
  lockAdmin(): void;
  showToast(message: string, type: 'success' | 'error'): void;
  triggerConfetti(childId: string, color: string): void;
}

const TOAST_MS = 2600;
let toastTimer: ReturnType<typeof setTimeout> | null = null;

export const useStore = create<EarnKeepState>((set, get) => ({
  // Data defaults
  family: [],
  accountabilities: [],
  transactions: [],
  dailyHabits: [],
  settings: null,
  weekInfo: null,

  weather: 'sunny',

  // UI defaults
  activeView: 'roles',
  adminUnlocked: false,
  loading: true,
  confetti: null,
  toast: null,

  // API
  api: null,

  setApi(api: EarnKeepAPI) {
    api.onAdminExpired = () => {
      if (!get().adminUnlocked) return;
      set({ adminUnlocked: false });
      get().showToast('Admin timed out. Enter the PIN again.', 'error');
    };
    set({ api });
  },

  async loadData() {
    const { api } = get();
    if (!api) return;

    try {
      set({ loading: true });
      const data = await api.getData();
      set({
        family: data.family,
        accountabilities: data.accountabilities,
        transactions: data.transactions,
        dailyHabits: data.daily_habits,
        settings: data.settings,
        weekInfo: data.week_info,
        loading: false,
      });
    } catch (e) {
      console.error('Failed to load data:', e);
      set({ loading: false });
      get().showToast('Failed to load data', 'error');
    }
  },

  setActiveView(view) {
    set({ activeView: view });
  },

  setWeather(state) {
    if (state && state !== get().weather) set({ weather: state });
  },

  async toggleHabit(accountabilityId, childId, completed, date) {
    const { api } = get();
    if (!api) return;

    // Optimistic update
    const prevHabits = get().dailyHabits;
    const matchDate = date ?? null;
    const existing = prevHabits.find(
      (h) =>
        h.accountability_id === accountabilityId &&
        h.child_id === childId &&
        h.date === matchDate
    );

    let optimisticHabits: HabitState[];
    if (existing) {
      optimisticHabits = prevHabits.map((h) =>
        h.accountability_id === accountabilityId &&
        h.child_id === childId &&
        h.date === matchDate
          ? {
              ...h,
              completed,
              completed_at: completed
                ? new Date().toISOString()
                : null,
            }
          : h
      );
    } else {
      optimisticHabits = [
        ...prevHabits,
        {
          accountability_id: accountabilityId,
          child_id: childId,
          completed,
          completed_at: completed ? new Date().toISOString() : null,
          date: matchDate,
        },
      ];
    }
    set({ dailyHabits: optimisticHabits });

    try {
      const updatedHabits = await api.toggleHabit(
        accountabilityId,
        childId,
        completed,
        date
      );
      set({ dailyHabits: updatedHabits });
    } catch (e) {
      console.error('Failed to toggle habit:', e);
      set({ dailyHabits: prevHabits });
      get().showToast('Failed to save - check connection', 'error');
    }
  },

  async addTransaction(childId, label, amount, date, dateUserEntered) {
    const { api } = get();
    if (!api) return false;

    try {
      const transaction = await api.addTransaction(
        childId,
        label,
        amount,
        date,
        dateUserEntered
      );
      // Refresh all data to get updated balances
      const data = await api.getData();
      set({
        family: data.family,
        transactions: data.transactions,
      });

      // Spec copy: "Deposited $5.00 to Owen" / "Withdrew $3.50 from Hazel".
      const child = get().family.find((c) => c.id === childId);
      const action = amount >= 0 ? 'Deposited' : 'Withdrew';
      const prep = amount >= 0 ? 'to' : 'from';
      get().showToast(
        `${action} $${Math.abs(transaction.amount).toFixed(2)} ${prep} ${child?.name ?? childId}`,
        'success'
      );
      return true;
    } catch (e) {
      console.error('Failed to add transaction:', e);
      get().showToast('Transaction failed', 'error');
      return false;
    }
  },

  async updateSettings(updates) {
    const { api, settings } = get();
    if (!api || !settings) return;

    try {
      const updated = await api.updateSettings(updates);
      set({ settings: updated });
      get().showToast('Settings updated', 'success');
    } catch (e) {
      console.error('Failed to update settings:', e);
      get().showToast('Failed to update settings', 'error');
    }
  },

  async updateFamilyMember(memberId, updates) {
    const { api } = get();
    if (!api) return;

    try {
      const updated = await api.updateFamilyMember(memberId, updates);
      set({
        family: get().family.map((m) =>
          m.id === memberId ? updated : m
        ),
      });
    } catch (e) {
      console.error('Failed to update family member:', e);
      get().showToast('Failed to update', 'error');
    }
  },

  async addFamilyMember(data) {
    const { api } = get();
    if (!api) return;

    try {
      const created = await api.addFamilyMember(data);
      set({
        family: [...get().family, created],
      });
      get().showToast(`${created.name} added`, 'success');
    } catch (e) {
      console.error('Failed to add family member:', e);
      get().showToast('Failed to add family member', 'error');
    }
  },

  async deleteFamilyMember(memberId) {
    const { api } = get();
    if (!api) return;

    try {
      await api.deleteFamilyMember(memberId);
      const member = get().family.find((m) => m.id === memberId);
      set({
        family: get().family.filter((m) => m.id !== memberId),
        accountabilities: get().accountabilities.map((a) => ({
          ...a,
          assigned_to: a.assigned_to.filter((id) => id !== memberId),
        })),
        transactions: get().transactions.filter(
          (t) => t.child_id !== memberId
        ),
        dailyHabits: get().dailyHabits.filter(
          (h) => h.child_id !== memberId
        ),
      });
      get().showToast(
        `${member?.name ?? memberId} removed`,
        'success'
      );
    } catch (e) {
      console.error('Failed to delete family member:', e);
      get().showToast('Failed to delete family member', 'error');
    }
  },

  async addAccountability(data) {
    const { api } = get();
    if (!api) return;

    try {
      const created = await api.addAccountability(data);
      set({
        accountabilities: [...get().accountabilities, created],
      });
      get().showToast('Accountability added', 'success');
    } catch (e) {
      console.error('Failed to add accountability:', e);
      get().showToast('Failed to add accountability', 'error');
    }
  },

  async updateAccountability(id, updates) {
    const { api } = get();
    if (!api) return;

    try {
      const updated = await api.updateAccountability(id, updates);
      set({
        accountabilities: get().accountabilities.map((a) =>
          a.id === id ? updated : a
        ),
      });
      get().showToast('Accountability updated', 'success');
    } catch (e) {
      console.error('Failed to update accountability:', e);
      get().showToast('Failed to update accountability', 'error');
    }
  },

  async deleteAccountability(id) {
    const { api } = get();
    if (!api) return;

    try {
      await api.deleteAccountability(id);
      set({
        accountabilities: get().accountabilities.filter(
          (a) => a.id !== id
        ),
        dailyHabits: get().dailyHabits.filter(
          (h) => h.accountability_id !== id
        ),
      });
      get().showToast('Accountability deleted', 'success');
    } catch (e) {
      console.error('Failed to delete accountability:', e);
      get().showToast('Failed to delete accountability', 'error');
    }
  },

  async verifyPin(pin) {
    const { api } = get();
    if (!api) return 'Not connected';

    try {
      const { valid, retryAfter } = await api.verifyPin(pin);
      if (valid) {
        set({ adminUnlocked: true });
        return true;
      }
      return retryAfter > 0 ? `Too many tries. Wait ${retryAfter} s` : 'Incorrect PIN';
    } catch (e) {
      console.error('Failed to verify PIN:', e);
      return 'Could not check the PIN';
    }
  },

  lockAdmin() {
    set({ adminUnlocked: false });
    get().api?.lockAdmin().catch(() => {});
  },

  showToast(message, type) {
    if (toastTimer) clearTimeout(toastTimer);
    set({ toast: { message, type } });
    toastTimer = setTimeout(() => {
      toastTimer = null;
      set({ toast: null });
    }, TOAST_MS);
  },

  triggerConfetti(childId, color) {
    set({ confetti: { childId, color } });
    setTimeout(() => {
      set({ confetti: null });
    }, 1400);
  },
}));
