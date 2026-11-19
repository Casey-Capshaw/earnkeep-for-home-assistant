// EarnKeep - Standalone HTTP API client
// Uses REST endpoints for development/standalone mode outside Home Assistant.

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

export class StandaloneHTTPClient implements EarnKeepAPI {
  private baseUrl: string;
  private token: string;

  constructor(baseUrl: string, token: string) {
    this.baseUrl = baseUrl.replace(/\/$/, '');
    this.token = token;
  }

  private async request<T>(
    method: string,
    endpoint: string,
    body?: unknown
  ): Promise<T> {
    const resp = await fetch(
      `${this.baseUrl}/api/earn_keep/${endpoint}`,
      {
        method,
        headers: {
          Authorization: `Bearer ${this.token}`,
          'Content-Type': 'application/json',
        },
        body: body ? JSON.stringify(body) : undefined,
      }
    );
    if (!resp.ok) {
      const text = await resp.text();
      throw new Error(`API ${resp.status}: ${text}`);
    }
    if (resp.status === 204) return undefined as T;
    return resp.json() as Promise<T>;
  }

  async getData(): Promise<AppData> {
    return this.request<AppData>('GET', 'data');
  }

  async toggleHabit(
    accountabilityId: string,
    childId: string,
    completed: boolean,
    date?: string
  ): Promise<HabitState[]> {
    const body: Record<string, unknown> = {
      accountability_id: accountabilityId,
      child_id: childId,
      completed,
    };
    if (date !== undefined) body.date = date;
    return this.request<HabitState[]>('POST', 'toggle_habit', body);
  }

  async addTransaction(
    childId: string,
    label: string,
    amount: number,
    date?: string,
    dateUserEntered?: boolean
  ): Promise<Transaction> {
    const body: Record<string, unknown> = {
      child_id: childId,
      label,
      amount,
    };
    if (date !== undefined) body.date = date;
    if (dateUserEntered !== undefined)
      body.date_user_entered = dateUserEntered;
    return this.request<Transaction>('POST', 'transaction', body);
  }

  async updateTransaction(
    transactionId: string,
    updates: Partial<Transaction>
  ): Promise<Transaction> {
    return this.request<Transaction>(
      'PATCH',
      `transaction/${transactionId}`,
      updates
    );
  }

  async updateSettings(
    settings: Partial<AppSettings>
  ): Promise<AppSettings> {
    return this.request<AppSettings>('PATCH', 'settings', settings);
  }

  async updateFamilyMember(
    memberId: string,
    updates: Partial<FamilyMember>
  ): Promise<FamilyMember> {
    return this.request<FamilyMember>(
      'PATCH',
      `family/${memberId}`,
      updates
    );
  }

  async addFamilyMember(
    data: { name: string; color?: string; emoji?: string; compensation?: number; birthday?: string; sprite?: SpriteFile | null }
  ): Promise<FamilyMember> {
    return this.request<FamilyMember>('POST', 'family', data);
  }

  async deleteFamilyMember(memberId: string): Promise<void> {
    await this.request<void>('DELETE', `family/${memberId}`);
  }

  async addAccountability(
    data: Omit<Accountability, 'id'>
  ): Promise<Accountability> {
    return this.request<Accountability>(
      'POST',
      'accountability',
      data
    );
  }

  async updateAccountability(
    accountabilityId: string,
    updates: Partial<Accountability>
  ): Promise<Accountability> {
    return this.request<Accountability>(
      'PATCH',
      `accountability/${accountabilityId}`,
      updates
    );
  }

  async deleteAccountability(accountabilityId: string): Promise<void> {
    await this.request<void>(
      'DELETE',
      `accountability/${accountabilityId}`
    );
  }

  async verifyPin(pin: string): Promise<{ valid: boolean; retryAfter: number }> {
    const result = await this.request<{ valid: boolean; retry_after?: number }>(
      'POST',
      'verify_pin',
      { pin }
    );
    return { valid: result.valid, retryAfter: result.retry_after ?? 0 };
  }

  async lockAdmin(): Promise<void> {}
}
