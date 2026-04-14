'use client';

import type { ReactNode } from 'react';
import clsx from 'clsx';

interface FlippableCardProps {
  front: ReactNode;
  back: ReactNode;
  flipped: boolean;
}

export function FlippableCard({ front, back, flipped }: FlippableCardProps) {
  return (
    <div style={{ perspective: 1200 }}>
      <div
        className={clsx(
          'relative [transform-style:preserve-3d] transition-transform duration-700',
        )}
        style={flipped ? { transform: 'rotateY(180deg)' } : undefined}
      >
        <div className="[backface-visibility:hidden]">{front}</div>
        <div
          className="absolute inset-0 [backface-visibility:hidden]"
          style={{ transform: 'rotateY(180deg)' }}
        >
          {back}
        </div>
      </div>
    </div>
  );
}
