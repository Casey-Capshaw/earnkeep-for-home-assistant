// EarnKeep - Toast notification (spec § Global chrome — Toast)
// Bottom-center, floating above the dock, dusk-deep with a 1px vault
// (success) or destructive (error) border, springing up via ek-toast.
// Lifetime (~2.6s) is owned by the store's showToast.

import React from 'react';
import { useStore } from '../../store';

export const Toast: React.FC = () => {
  const toast = useStore((s) => s.toast);

  if (!toast) return null;

  return (
    <div
      // Re-keying on the message restarts the spring when a toast replaces
      // another mid-flight instead of leaving the second one motionless.
      key={`${toast.type}:${toast.message}`}
      className={`absolute bottom-[92px] left-1/2 z-[60] -translate-x-1/2 animate-[ek-toast_.3s_cubic-bezier(.34,1.56,.64,1)] rounded-[14px] border-2 bg-paper px-[26px] py-3.5 text-[17px] font-extrabold text-ink shadow-[0_10px_30px_color-mix(in_srgb,var(--color-ink)_35%,transparent)] ${
        toast.type === 'error' ? 'border-destructive' : 'border-vault'
      }`}
    >
      {toast.message}
    </div>
  );
};
