// EarnKeep - Confetti burst
// Fires once when a section (all habits/accountabilities) is fully completed.
// The one big orchestrated moment in the app — see the HQ Ledger moodboard's
// "Motion" section. Everything else in the UI stays quiet by comparison.

import React, { useMemo } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useCalmMotion } from '../../lib/motion';
import { useStore } from '../../store';

const PARTICLE_COUNT = 18;

function useParticles(seedKey: string) {
  return useMemo(() => {
    // Deterministic-enough spread per burst without needing Math.random at
    // module scope; re-computed fresh each time `seedKey` (childId+color)
    // changes, which is exactly once per burst.
    return Array.from({ length: PARTICLE_COUNT }, (_, i) => {
      const angle = (i / PARTICLE_COUNT) * Math.PI * 2 + (i % 3) * 0.15;
      const distance = 90 + ((i * 37) % 70);
      return {
        id: i,
        dx: Math.cos(angle) * distance,
        dy: Math.sin(angle) * distance - 30,
        rotate: (i % 2 === 0 ? 1 : -1) * (180 + (i * 47) % 180),
        delay: (i % 6) * 0.02,
        size: 7 + (i % 3) * 3,
      };
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seedKey]);
}

export const Confetti: React.FC = () => {
  const confetti = useStore((s) => s.confetti);
  const prefersReducedMotion = useCalmMotion();
  const seedKey = confetti ? `${confetti.childId}-${confetti.color}` : '';
  const particles = useParticles(seedKey);

  return (
    <AnimatePresence>
      {confetti && (
        <div className="pointer-events-none fixed inset-0 z-50 flex items-center justify-center">
          {prefersReducedMotion ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.6 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.25 }}
              className="flex h-20 w-20 items-center justify-center rounded-full text-4xl text-cloud"
              style={{ backgroundColor: confetti.color }}
            >
              ✓
            </motion.div>
          ) : (
            <>
              <motion.div
                initial={{ opacity: 0, scale: 0.4 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ duration: 0.35, ease: [0.34, 1.56, 0.64, 1] }}
                className="absolute flex h-20 w-20 items-center justify-center rounded-full text-4xl text-cloud shadow-lg"
                style={{ backgroundColor: confetti.color }}
              >
                ✓
              </motion.div>
              {particles.map((p) => (
                <motion.span
                  key={p.id}
                  initial={{ x: 0, y: 0, opacity: 1, rotate: 0 }}
                  animate={{ x: p.dx, y: p.dy, opacity: 0, rotate: p.rotate }}
                  transition={{
                    duration: 0.9,
                    delay: p.delay,
                    ease: 'easeOut',
                  }}
                  className="absolute rounded-sm"
                  style={{
                    width: p.size,
                    height: p.size,
                    backgroundColor: confetti.color,
                  }}
                />
              ))}
            </>
          )}
        </div>
      )}
    </AnimatePresence>
  );
};
