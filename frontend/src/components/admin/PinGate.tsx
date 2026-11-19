// EarnKeep - PIN gate (spec § Admin — PIN gate)
// 4-digit PIN entry with number pad for admin access — an ornate plaque in
// the world (2026-11-10). Restrained: no kid colors; keys just have weight.

import React, { useCallback, useState } from 'react';
import { motion } from 'framer-motion';
import { useStore } from '../../store';
import { Ornate } from '../shared/Ornate';

export const PinGate: React.FC = () => {
  const verifyPin = useStore((s) => s.verifyPin);
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');

  const handleDigit = useCallback(
    async (digit: string) => {
      setError('');

      if (digit === 'clear') {
        setPin('');
        return;
      }

      if (digit === 'enter') {
        const result = await verifyPin(pin);
        if (result !== true) {
          setError(result);
          setPin('');
        }
        return;
      }

      if (pin.length < 4) {
        setPin((prev) => prev + digit);
      }
    },
    [pin, verifyPin]
  );

  const digits = ['1', '2', '3', '4', '5', '6', '7', '8', '9', 'clear', '0', 'enter'];

  return (
    <div className="relative z-[5] flex h-full flex-1 items-center justify-center pt-4">
      <Ornate opacity={0.88} className="px-14 py-7">
        <div className="flex flex-col items-center gap-4">
          <div className="text-[15px] font-black uppercase tracking-[2px] text-ink-soft">Grown-ups only</div>
          <h2 className="font-display text-[34px] leading-none text-ink">Enter PIN</h2>
          <div className="mb-1 flex gap-3.5">
            {[0, 1, 2, 3].map((i) => (
              <div
                key={i}
                className={
                  i < pin.length
                    ? 'h-5 w-5 rounded-full bg-vault shadow-[0_0_10px_var(--color-vault)] transition-colors duration-200'
                    : 'h-5 w-5 rounded-full bg-ink/15 transition-colors duration-200'
                }
              />
            ))}
          </div>
          <div className="grid grid-cols-[repeat(3,78px)] gap-3">
            {digits.map((d) => {
              const label = d === 'clear' ? 'C' : d === 'enter' ? '✓' : d;
              return (
                <motion.button
                  key={d}
                  onClick={() => handleDigit(d)}
                  whileTap={{ scaleX: 1.12, scaleY: 0.86 }}
                  transition={{ type: 'spring', stiffness: 600, damping: 10 }}
                  className={
                    d === 'enter'
                      ? 'h-[78px] w-[78px] rounded-full bg-vault font-body text-[28px] font-black text-white shadow-[inset_0_-5px_0_var(--color-vault-deep)]'
                      : 'h-[78px] w-[78px] rounded-full bg-white/80 font-body text-[28px] font-black text-ink shadow-[inset_0_0_0_2px_var(--color-ink),inset_0_-5px_0_color-mix(in_srgb,var(--color-ink)_18%,transparent)]'
                  }
                >
                  {label}
                </motion.button>
              );
            })}
          </div>
          <div className="min-h-6 font-body text-[16px] font-extrabold text-destructive">{error}</div>
        </div>
      </Ornate>
    </div>
  );
};
