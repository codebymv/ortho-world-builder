import { useEffect, useState } from 'react';

interface DeathOverlayProps {
  active: boolean;
  goldLost: number;
  onComplete: () => void;
}

export const DeathOverlay = ({ active, goldLost, onComplete }: DeathOverlayProps) => {
  const [phase, setPhase] = useState<'hidden' | 'fadein' | 'show' | 'fadeout'>('hidden');

  useEffect(() => {
    if (active) {
      setPhase('fadein');
      const show = setTimeout(() => setPhase('show'), 600);
      const fadeout = setTimeout(() => setPhase('fadeout'), 2200);
      const done = setTimeout(() => {
        setPhase('hidden');
        onComplete();
      }, 2800);
      return () => { clearTimeout(show); clearTimeout(fadeout); clearTimeout(done); };
    }
  }, [active, onComplete]);

  if (phase === 'hidden') return null;

  return (
    <div
      className={`fixed inset-0 z-[95] flex flex-col items-center justify-center pointer-events-none transition-opacity duration-500 ${
        phase === 'fadein' || phase === 'show' ? 'opacity-100' : 'opacity-0'
      }`}
      style={{ backgroundColor: 'rgba(80,0,0,0.85)' }}
    >
      <h2 className="text-4xl font-bold text-red-500 uppercase tracking-[0.4em] mb-4">
        Defeated
      </h2>
      {goldLost > 0 && (
        <p className="text-lg text-[#F5DEB3]">Lost <span className="text-yellow-400 font-bold">{goldLost}</span> gold</p>
      )}
    </div>
  );
};
