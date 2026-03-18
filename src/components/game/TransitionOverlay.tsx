import { useEffect, useState, useRef } from 'react';

interface TransitionOverlayProps {
  active: boolean;
  mapName?: string;
}

export const TransitionOverlay = ({ active, mapName }: TransitionOverlayProps) => {
  const [phase, setPhase] = useState<'hidden' | 'fade-in' | 'show' | 'fade-out'>('hidden');
  const timerRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  useEffect(() => {
    if (active) {
      // Clear any pending timers
      timerRef.current.forEach(clearTimeout);
      timerRef.current = [];

      setPhase('fade-in');
      timerRef.current.push(setTimeout(() => setPhase('show'), 300));
      timerRef.current.push(setTimeout(() => setPhase('fade-out'), 1500));
      timerRef.current.push(setTimeout(() => setPhase('hidden'), 2200));
    }
    // Don't clear timers on cleanup — let the full animation play out
  }, [active]);

  if (phase === 'hidden') return null;

  const opacity = phase === 'fade-in' ? 'opacity-100' : phase === 'show' ? 'opacity-100' : 'opacity-0';

  return (
    <div
      className={`fixed inset-0 z-[90] pointer-events-none flex items-center justify-center transition-opacity duration-500 ${opacity}`}
      style={{ backgroundColor: 'rgba(0,0,0,0.85)' }}
    >
      {mapName && (
        <h2 className="text-3xl font-bold text-[#DAA520] uppercase tracking-[0.3em]">
          {mapName}
        </h2>
      )}
    </div>
  );
};
