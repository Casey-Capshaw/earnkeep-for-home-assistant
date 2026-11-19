// EarnKeep - Badge shelf
// Earned, not given — brass medallions, kept static and quiet. Per the
// moodboard's "Motion" section, an idle shine loop reads as "look at me"
// and is deliberately NOT used here; badges are only ever confirmed by
// the nightly backend job (see Initiatives/earnkeep.md), so there's no
// live "just unlocked" moment to animate in this data model — a kid
// notices a new medallion the next time they open the app, which is its
// own quiet reward. Sized to sit inline next to the streak flame in the
// Character Desk header.

import React from 'react';
import type { FamilyMember } from '../../types';

interface BadgeShelfProps {
  child: FamilyMember;
}

export const BadgeShelf: React.FC<BadgeShelfProps> = ({ child }) => {
  // Defensive: a HA restart mid-deploy, or this frontend reaching the
  // tablet before the Phase 5 backend does, can both mean live data
  // predates these fields entirely — not just an empty array, undefined.
  if (!child.badges || child.badges.length === 0) return null;

  const sorted = [...child.badges].sort((a, b) => a.streak_days - b.streak_days);

  return (
    <div className="flex flex-shrink-0 gap-1.5">
      {sorted.map((badge) => (
        <div
          key={badge.id}
          title={`${badge.streak_days}-day streak`}
          className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full text-xs"
          style={{
            background:
              'radial-gradient(circle at 32% 28%, #EBCB7E 0%, #D8A73D 45%, #8F6A1F 100%)',
            boxShadow: 'inset 0 0 0 1.5px rgba(255,255,255,0.45), 0 0 0 1.5px var(--color-ink), 0 0 10px rgba(216,167,61,0.55)',
          }}
        >
          🔥
        </div>
      ))}
    </div>
  );
};
