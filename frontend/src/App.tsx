// EarnKeep - Main App component (layered-world redesign, 2026-11-10).
//
// Stacking, back to front (one stacking context on .earn-keep-app):
//   WorldBackdrop (sky, parallax layers, light shafts, weather) ......... z 0
//   panels — desks, bank cards, admin ................................ z 5
//   WorldOverlay — critters, festive decor (z 6), dark front framing (z 7)
//   headers + dock (must stay readable/tappable over the framing) ..... z 8
//   confetti / toast / dialogs ....................................... z 50+
// The world pans (parallax) as the dock view changes, and its palette
// re-inks the whole UI via --ek-* custom properties.

import React, { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { useStore } from './store';
import { RolesView } from './components/roles/RolesView';
import { BankView } from './components/bank/BankView';
import { AdminView } from './components/admin/AdminView';
import { Confetti } from './components/shared/Confetti';
import { Toast } from './components/shared/Toast';
import { DayContext, Ornate } from './components/shared/Ornate';
import { WorldBackdrop, WorldOverlay } from './world/WorldScene';
import { useDay } from './world/useDay';
import { SpritesProvider } from './world/sprites/Sprites';

const DOCK_ITEMS = [
  { view: 'roles' as const, icon: '🏠', label: 'Roles' },
  { view: 'bank' as const, icon: '🏦', label: 'Bank' },
  { view: 'admin' as const, icon: '⚙️', label: 'Admin' },
];

const App: React.FC = () => {
  const activeView = useStore((s) => s.activeView);
  const setActiveView = useStore((s) => s.setActiveView);
  const loading = useStore((s) => s.loading);
  const settings = useStore((s) => s.settings);
  const day = useDay();
  const rootRef = useRef<HTMLDivElement>(null);
  const pan = DOCK_ITEMS.findIndex((d) => d.view === activeView);
  const motionAuto = (settings?.motion ?? 'auto') === 'auto';

  // The day's palette inks the whole UI. Set on the app root AND its parent
  // (the portal container) so Radix dialogs, portaled outside the app root,
  // inherit the same --ek-* values.
  const vars: Record<string, string> = {
    '--ek-ink': day.ink,
    '--ek-ink-soft': day.inkSoft,
    '--ek-paper': day.palette.haze,
    '--ek-haze': day.palette.haze,
  };
  useEffect(() => {
    const host = rootRef.current?.parentElement;
    if (!host) return;
    for (const [k, v] of Object.entries(vars)) host.style.setProperty(k, v);
    host.classList.toggle('ek-motion-auto', motionAuto);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [day.ink, day.inkSoft, day.palette.haze, motionAuto]);

  return (
    <DayContext.Provider value={day}>
      <SpritesProvider day={day} rootRef={rootRef}>
      <div
        ref={rootRef}
        className={`earn-keep-app isolate flex h-full flex-col overflow-hidden font-body text-ink ${motionAuto ? 'ek-motion-auto' : ''}`}
        style={{ ...(vars as React.CSSProperties), background: day.palette.haze }}
      >
        <WorldBackdrop day={day} pan={pan < 0 ? 0 : pan} />

        {loading ? (
          <div className="relative z-[8] flex flex-1 items-center justify-center font-display text-3xl text-ink">
            Loading…
          </div>
        ) : (
          <main className="relative flex min-h-0 flex-1 flex-col">
            {activeView === 'roles' && <RolesView />}
            {activeView === 'bank' && <BankView />}
            {activeView === 'admin' && <AdminView />}
          </main>
        )}

        <nav className="relative z-[8] flex flex-shrink-0 items-center justify-center pb-[14px] pt-3">
          <Ornate corner={40} opacity={0.9} surface="dock">
            <div className="flex items-center gap-1.5 px-2.5 py-[7px]">
              <a
                href={settings?.home_url || '/'}
                title="Back to Dashboard"
                className="flex min-h-11 items-center rounded-[14px] px-3.5 text-2xl leading-none text-ink-soft active:scale-90"
              >
                ⌂
              </a>
              {DOCK_ITEMS.map((item) => {
                const isActive = activeView === item.view;
                return (
                  <motion.button
                    key={item.view}
                    onClick={() => setActiveView(item.view)}
                    whileTap={{ scaleX: 1.12, scaleY: 0.84 }}
                    transition={{ type: 'spring', stiffness: 520, damping: 9 }}
                    className={
                      isActive
                        ? 'flex min-h-11 items-center gap-2 rounded-[14px] bg-ink px-[26px] font-display text-[20px] leading-none text-paper'
                        : 'flex min-h-11 items-center gap-2 rounded-[14px] bg-transparent px-[26px] font-display text-[20px] leading-none text-ink'
                    }
                  >
                    <span className="text-[19px] leading-none">{item.icon}</span>
                    {item.label}
                  </motion.button>
                );
              })}
            </div>
          </Ornate>
        </nav>

        <WorldOverlay day={day} pan={pan < 0 ? 0 : pan} hour={day.date.getHours()} />

        <Confetti />
        <Toast />
      </div>
      </SpritesProvider>
    </DayContext.Provider>
  );
};

export default App;
