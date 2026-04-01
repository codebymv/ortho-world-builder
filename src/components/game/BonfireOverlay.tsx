import { useEffect, useState } from 'react';

interface BonfireOverlayProps {
  active: boolean;
  title?: string;
  subtitle?: string;
}

export const BonfireOverlay = ({ active, title = 'Flame Kindled', subtitle }: BonfireOverlayProps) => {
  const [phase, setPhase] = useState<'hidden' | 'fadein' | 'show' | 'fadeout'>('hidden');

  useEffect(() => {
    if (active) {
      setPhase('fadein');
      const show = setTimeout(() => setPhase('show'), 300);
      const fadeout = setTimeout(() => setPhase('fadeout'), 1900);
      const done = setTimeout(() => setPhase('hidden'), 2800);
      return () => { clearTimeout(show); clearTimeout(fadeout); clearTimeout(done); };
    }
  }, [active]);

  if (phase === 'hidden') return null;

  return (
    <div
      className={`fixed inset-0 z-[96] flex flex-col items-center justify-center pointer-events-none transition-opacity duration-700 ${
        phase === 'fadein' || phase === 'show' ? 'opacity-100' : 'opacity-0'
      }`}
      style={{
        background: 'radial-gradient(circle at center, rgba(191,121,25,0.18) 0%, rgba(20,8,2,0.38) 38%, rgba(0,0,0,0.0) 72%)',
      }}
    >
      <div className="flex flex-col items-center" style={{ marginTop: '-15vh' }}>
        <div
          className={`px-10 py-6 text-center ${
            phase === 'fadein'
              ? 'bonfire-card-enter'
              : phase === 'show'
                ? 'bonfire-card-hold'
                : 'bonfire-card-exit'
          }`}
        >
          <h2
            className={`text-4xl md:text-5xl uppercase text-[#f2d08a] drop-shadow-[0_0_10px_rgba(255,196,92,0.35)] ${
              phase === 'fadein'
                ? 'bonfire-title-enter'
                : phase === 'show'
                  ? 'bonfire-title-hold'
                  : 'bonfire-title-exit'
            }`}
            style={{ fontFamily: '"Times New Roman", Georgia, serif', letterSpacing: '0.38em' }}
          >
            {title}
          </h2>
          {subtitle ? (
            <p
              className={`mt-3 text-center text-sm uppercase text-[#d8b97a] ${
                phase === 'fadein'
                  ? 'bonfire-subtitle-enter'
                  : phase === 'show'
                    ? 'bonfire-subtitle-hold'
                    : 'bonfire-subtitle-exit'
              }`}
              style={{ letterSpacing: '0.26em' }}
            >
              {subtitle}
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
};
