// EarnKeep - Admin view (tabbed back office — spec § Admin — unlocked)
// PIN-gated. A 210px left tab rail (Pay & Bank / Tasks / People / Settings,
// with Lock pinned at the bottom) drives a single scrolling content pane
// that rises into place on each tab switch. Same design tokens as the rest
// of the app, deliberately restrained — the back office, not the playroom.

import React, { useState } from 'react';
import { useStore } from '../../store';
import { DOW_SHORT_NAMES, formatClock12, ordinal } from '../../lib/utils';
import { PinGate } from './PinGate';
import { FamilyMemberManager } from './FamilyMemberManager';
import { CompensationEditor } from './CompensationEditor';
import { InterestRateEditor } from './InterestRateEditor';
import { TransactionForm } from './TransactionForm';
import { AccountabilityManager } from './AccountabilityManager';
import { PinEditor } from './PinEditor';
import { HomeUrlEditor } from './HomeUrlEditor';
import { outlineButton } from './formStyles';
import { CelebrationsEditor, MotionEditor, WeatherEntityEditor } from './CelebrationsEditor';
import { Ornate } from '../shared/Ornate';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog';

type AdminTab = 'pay' | 'tasks' | 'people' | 'settings';

const TABS: { id: AdminTab; icon: string; label: string }[] = [
  { id: 'pay', icon: '💵', label: 'Pay & Bank' },
  { id: 'tasks', icon: '✅', label: 'Tasks' },
  { id: 'people', icon: '👨‍👩‍👧', label: 'People' },
  { id: 'settings', icon: '⚙️', label: 'Settings' },
];

const SectionTitle: React.FC<{ title: string; helper: string }> = ({
  title,
  helper,
}) => (
  <>
    <div className="mb-1 font-display text-[26px] leading-tight text-ink">
      {title}
    </div>
    <div className="mb-4 text-[15px] font-semibold text-ink-soft">{helper}</div>
  </>
);

const SettingsRow: React.FC<{
  title: string;
  sub?: string;
  children: React.ReactNode;
}> = ({ title, sub, children }) => (
  <div className="flex items-center gap-3.5 rounded-[18px] bg-white/60 shadow-[inset_0_0_0_1.5px_color-mix(in_srgb,var(--color-ink)_16%,transparent)] px-5 py-[18px]">
    <div className="min-w-0 flex-1">
      <div className="text-base font-extrabold text-cloud">{title}</div>
      {sub && (
        <div className="mt-0.5 text-xs font-semibold text-cloud-dim">{sub}</div>
      )}
    </div>
    {children}
  </div>
);

const SettingsTab: React.FC = () => {
  const settings = useStore((s) => s.settings);
  const [pinOpen, setPinOpen] = useState(false);

  const payoutDay = settings ? DOW_SHORT_NAMES[settings.compensation_day] ?? '' : '';

  return (
    <div className="flex max-w-[680px] flex-col gap-4">
      <div className="mb-0.5 font-display text-[26px] leading-tight text-ink">
        Settings
      </div>
      <SettingsRow
        title="Monthly interest rate"
        sub="Compounded on the 1st — teaches saving"
      >
        <InterestRateEditor />
      </SettingsRow>
      <SettingsRow title="Admin PIN" sub="Protects this back office">
        <span className="font-ledger text-[22px] font-bold tracking-[4px] text-cloud-dim">
          ••••
        </span>
        <button onClick={() => setPinOpen(true)} className={outlineButton}>
          Change
        </button>
      </SettingsRow>
      <SettingsRow title="Home button URL" sub="Where the dock's ⌂ goes">
        <HomeUrlEditor />
      </SettingsRow>
      <SettingsRow title="Motion" sub="Drifting world, critters, bouncy tiles. Follow tablet turns it all off when the tablet's animations are off.">
        <MotionEditor />
      </SettingsRow>
      <SettingsRow title="Weather" sub="HA weather entity — rain, snow and fog show in the world">
        <WeatherEntityEditor />
      </SettingsRow>
      <CelebrationsEditor />
      {settings && (
        <div className="rounded-[18px] bg-white/60 shadow-[inset_0_0_0_1.5px_color-mix(in_srgb,var(--color-ink)_16%,transparent)] px-5 py-[18px]">
          <div className="mb-3 text-base font-extrabold text-cloud">
            Automatic schedule
          </div>
          <div className="flex flex-col gap-2 text-sm font-semibold text-cloud-dim">
            <div className="flex justify-between">
              <span>Daily habit reset</span>
              <span className="font-ledger text-cloud">
                {formatClock12(settings.daily_reset_time)}
              </span>
            </div>
            <div className="flex justify-between">
              <span>Weekly compensation payout</span>
              <span className="font-ledger text-cloud">
                {payoutDay} {formatClock12(settings.compensation_time)}
              </span>
            </div>
            <div className="flex justify-between">
              <span>Monthly interest</span>
              <span className="font-ledger text-cloud">
                {ordinal(settings.monthly_interest_day)} ·{' '}
                {formatClock12(settings.monthly_interest_time)}
              </span>
            </div>
          </div>
        </div>
      )}

      <Dialog open={pinOpen} onOpenChange={setPinOpen}>
        <DialogContent className="w-[440px]">
          <DialogHeader>
            <DialogTitle>Change admin PIN</DialogTitle>
          </DialogHeader>
          <PinEditor onClose={() => setPinOpen(false)} />
        </DialogContent>
      </Dialog>
    </div>
  );
};

export const AdminView: React.FC = () => {
  const adminUnlocked = useStore((s) => s.adminUnlocked);
  const lockAdmin = useStore((s) => s.lockAdmin);
  const [tab, setTab] = useState<AdminTab>('pay');

  if (!adminUnlocked) {
    return <PinGate />;
  }

  return (
    <div className="relative z-[5] flex h-full min-h-0 gap-7 px-12 pt-[30px]">
      {/* Tab rail */}
      <Ornate opacity={0.88} corner={60} className="w-[220px] flex-shrink-0">
        <div className="flex h-full flex-col gap-1.5 px-3.5 py-[22px]">
          <div className="px-3 pb-4 pt-1.5 font-display text-[28px] leading-none text-ink">Admin</div>
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={
                tab === t.id
                  ? 'flex min-h-12 items-center gap-[11px] rounded-[14px] bg-ink px-3.5 text-left text-[16px] font-extrabold text-paper transition-colors duration-150'
                  : 'flex min-h-12 items-center gap-[11px] rounded-[14px] bg-transparent px-3.5 text-left text-[16px] font-extrabold text-ink transition-colors duration-150'
              }
            >
              <span className="text-xl leading-none">{t.icon}</span>
              {t.label}
            </button>
          ))}
          <button
            onClick={lockAdmin}
            className="mt-auto flex min-h-11 items-center gap-[11px] rounded-[14px] px-3.5 text-left text-[15px] font-bold text-ink-soft"
          >
            <span className="text-lg leading-none">🔒</span>
            Lock
          </button>
        </div>
      </Ornate>

      {/* Tab content — re-keyed per tab so ek-rise replays on every switch */}
      <Ornate opacity={0.9} className="min-w-0 flex-1">
        <div className="h-full overflow-y-auto px-[30px] py-[26px]">
          <div key={tab} className="animate-[ek-rise_.25s_ease]">
            {tab === 'pay' && (
              <div className="flex flex-col gap-6">
                <div>
                  <SectionTitle
                    title="Deposit or withdraw"
                    helper="Pick a child, tap an amount, then choose. No typing needed."
                  />
                  <TransactionForm />
                </div>
                <div>
                  <SectionTitle
                    title="Weekly compensation"
                    helper="Paid every Sunday when all weekly accountabilities are done."
                  />
                  <CompensationEditor />
                </div>
              </div>
            )}
            {tab === 'tasks' && <AccountabilityManager />}
            {tab === 'people' && <FamilyMemberManager />}
            {tab === 'settings' && <SettingsTab />}
          </div>
        </div>
      </Ornate>
    </div>
  );
};
