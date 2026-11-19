// EarnKeep - Admin PIN editor
// The body of the "Change admin PIN" dialog opened from the Settings tab's
// PIN row (spec: masked •••• + "Change"). Numeric only, 4–8 digits.

import React, { useState } from 'react';
import { useStore } from '../../store';
import { cancelButton, fieldLabel, saveButton, textInput } from './formStyles';

interface PinEditorProps {
  onClose: () => void;
}

export const PinEditor: React.FC<PinEditorProps> = ({ onClose }) => {
  const updateSettings = useStore((s) => s.updateSettings);
  const showToast = useStore((s) => s.showToast);
  const [pin, setPin] = useState('');
  const [confirm, setConfirm] = useState('');

  const handleSave = async () => {
    const val = pin.trim();
    if (!val || val.length < 4) {
      showToast('PIN must be at least 4 digits', 'error');
      return;
    }
    if (!/^\d+$/.test(val)) {
      showToast('PIN must be numbers only', 'error');
      return;
    }
    if (val !== confirm.trim()) {
      showToast("PINs don't match", 'error');
      return;
    }

    await updateSettings({ admin_pin: val });
    onClose();
  };

  const pinInput = `${textInput} text-center font-ledger tracking-[4px]`;

  return (
    <>
      <div>
        <label className={fieldLabel}>New PIN</label>
        <input
          type="password"
          value={pin}
          onChange={(e) => setPin(e.target.value)}
          placeholder="••••"
          maxLength={8}
          inputMode="numeric"
          pattern="[0-9]*"
          autoFocus
          className={pinInput}
        />
      </div>
      <div>
        <label className={fieldLabel}>Confirm new PIN</label>
        <input
          type="password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          placeholder="••••"
          maxLength={8}
          inputMode="numeric"
          pattern="[0-9]*"
          className={pinInput}
        />
      </div>
      <div className="mt-1.5 flex gap-3">
        <button onClick={onClose} className={cancelButton}>
          Cancel
        </button>
        <button onClick={handleSave} className={saveButton}>
          Save
        </button>
      </div>
    </>
  );
};
