// EarnKeep - Home Assistant WebSocket API client
// Uses the hass.callWS() method provided by the HA custom panel framework.

import type { EarnKeepAPI } from './client';
import type { SpriteFile } from '../world/sprites/traits';
import type {
  AppData,
  AppSettings,
  Accountability,
  FamilyMember,
  HabitState,
  Transaction,
} from '../types';

interface HassObject {
  callWS(msg: Record<string, unknown>): Promise<unknown>;
}

export class HAWebSocketClient implements EarnKeepAPI {
  private _hass: HassObject;
  private _adminToken: string | null = null;
  onAdminExpired?: () => void;

  constructor(hass: HassObject) {
    this._hass = hass;
  }

  set hass(hass: HassObject) {
    this._hass = hass;
  }

  private async sendCommand<T>(
    type: string,
    data?: Record<string, unknown>
  ): Promise<T> {
    return this._hass.callWS({ type, ...data }) as Promise<T>;
  }

  /** An admin command: carries the PIN session token. */
  private async adminCommand<T>(
    type: string,
    data?: Record<string, unknown>
  ): Promise<T> {
    try {
      return await this.sendCommand<T>(type, {
        ...data,
        ...(this._adminToken ? { admin_token: this._adminToken } : {}),
      });
    } catch (e) {
      if ((e as { code?: string })?.code === 'unauthorized') {
        this._adminToken = null;
        this.onAdminExpired?.();
      }
      throw e;
    }
  }

  async getData(): Promise<AppData> {
    return this.sendCommand<AppData>('earn_keep/get_data');
  }

  async toggleHabit(
    accountabilityId: string,
    childId: string,
    completed: boolean,
    date?: string
  ): Promise<HabitState[]> {
    const data: Record<string, unknown> = {
      accountability_id: accountabilityId,
      child_id: childId,
      completed,
    };
    if (date !== undefined) {
      data.date = date;
    }
    const result = await this.sendCommand<{ daily_habits: HabitState[] }>(
      'earn_keep/toggle_habit',
      data
    );
    return result.daily_habits;
  }

  async addTransaction(
    childId: string,
    label: string,
    amount: number,
    date?: string,
    dateUserEntered?: boolean
  ): Promise<Transaction> {
    const data: Record<string, unknown> = {
      child_id: childId,
      label,
      amount,
    };
    if (date !== undefined) {
      data.date = date;
    }
    if (dateUserEntered !== undefined) {
      data.date_user_entered = dateUserEntered;
    }
    return this.adminCommand<Transaction>('earn_keep/add_transaction', data);
  }

  async updateTransaction(
    transactionId: string,
    updates: Partial<Transaction>
  ): Promise<Transaction> {
    return this.adminCommand<Transaction>('earn_keep/update_transaction',
      {
        transaction_id: transactionId,
        updates,
      }
    );
  }

  async updateSettings(
    settings: Partial<AppSettings>
  ): Promise<AppSettings> {
    return this.adminCommand<AppSettings>('earn_keep/update_settings',
      { settings }
    );
  }

  async updateFamilyMember(
    memberId: string,
    updates: Partial<FamilyMember>
  ): Promise<FamilyMember> {
    return this.adminCommand<FamilyMember>('earn_keep/update_family_member',
      {
        member_id: memberId,
        updates,
      }
    );
  }

  async addFamilyMember(
    data: { name: string; color?: string; emoji?: string; compensation?: number; birthday?: string; sprite?: SpriteFile | null }
  ): Promise<FamilyMember> {
    return this.adminCommand<FamilyMember>('earn_keep/add_family_member',
      data
    );
  }

  async deleteFamilyMember(memberId: string): Promise<void> {
    await this.adminCommand<void>('earn_keep/delete_family_member', {
      member_id: memberId,
    });
  }

  async addAccountability(
    data: Omit<Accountability, 'id'>
  ): Promise<Accountability> {
    // Rename 'type' to 'acct_type' to avoid collision with WebSocket command 'type'
    const { type: acctType, ...rest } = data as Record<string, unknown>;
    return this.adminCommand<Accountability>('earn_keep/add_accountability',
      { ...rest, acct_type: acctType }
    );
  }

  async updateAccountability(
    accountabilityId: string,
    updates: Partial<Accountability>
  ): Promise<Accountability> {
    // Rename 'type' to 'acct_type' inside updates to avoid wire collision
    const wireUpdates: Record<string, unknown> = { ...updates };
    if ('type' in wireUpdates) {
      wireUpdates.acct_type = wireUpdates.type;
      delete wireUpdates.type;
    }
    return this.adminCommand<Accountability>('earn_keep/update_accountability',
      {
        accountability_id: accountabilityId,
        updates: wireUpdates,
      }
    );
  }

  async deleteAccountability(accountabilityId: string): Promise<void> {
    await this.adminCommand<void>('earn_keep/delete_accountability', {
      accountability_id: accountabilityId,
    });
  }

  async verifyPin(pin: string): Promise<{ valid: boolean; retryAfter: number }> {
    const result = await this.sendCommand<{ valid: boolean; token?: string | null; retry_after?: number }>(
      'earn_keep/verify_pin',
      { pin }
    );
    this._adminToken = result.valid && result.token ? result.token : null;
    return { valid: !!this._adminToken, retryAfter: result.retry_after ?? 0 };
  }

  async lockAdmin(): Promise<void> {
    const token = this._adminToken;
    this._adminToken = null;
    if (token) await this.sendCommand<void>('earn_keep/lock_admin', { admin_token: token });
  }
}
