import { useEffect, useRef, useState } from 'react';

interface DeathOverlayProps {
  active: boolean;
  essenceLost: number;
  onComplete: () => void;
}

export const DeathOverlay = ({ active, essenceLost, onComplete }: DeathOverlayProps) => {
  const [phase, setPhase] = useState<'hidden' | 'fadein' | 'show' | 'fadeout'>('hidden');
  const [skippable, setSkippable] = useState(false);
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  const skip = () => {
    if (!skippable) return;
    timersRef.current.forEach(clearTimeout);
    timersRef.current = [];
    setPhase('fadeout');
    timersRef.current.push(setTimeout(() => {
      setPhase('hidden');
      setSkippable(false);
      onCompleteRef.current();
    }, 500));
  };

  useEffect(() => {
    if (active) {
      setSkippable(false);
      setPhase('fadein');
      timersRef.current.push(setTimeout(() => setPhase('show'), 600));
      timersRef.current.push(setTimeout(() => setSkippable(true), 1000));
      timersRef.current.push(setTimeout(() => setPhase('fadeout'), 2200));
      timersRef.current.push(setTimeout(() => {
        setPhase('hidden');
        setSkippable(false);
        onCompleteRef.current();
      }, 2800));
      return () => {
        timersRef.current.forEach(clearTimeout);
        timersRef.current = [];
      };
    }
  }, [active]);

  if (phase === 'hidden') return null;

  return (
    <div
      className={`fixed inset-0 z-[95] flex flex-col items-center justify-center transition-opacity duration-500 ${
        phase === 'fadein' || phase === 'show' ? 'opacity-100' : 'opacity-0'
      } ${skippable ? 'cursor-pointer pointer-events-auto' : 'pointer-events-none'}`}
      style={{ backgroundColor: 'rgba(80,0,0,0.85)' }}
      onClick={skip}
    >
      <h2 className="text-4xl font-bold text-red-500 uppercase tracking-[0.35em] mb-4">
        You Died
      </h2>
      <p className="text-sm text-[#D7CCC8] max-w-md text-center px-6 mb-2">
        You return to the last bonfire. Your essence remains where you fell—recover it before it is lost again.
      </p>
      {essenceLost > 0 && (
        <p className="text-lg text-[#F5DEB3]">
          Bloodstain: <span className="text-violet-300 font-bold">{essenceLost}</span> essence
        </p>
      )}
      {essenceLost === 0 && (
        <p className="text-sm text-[#A1887F]">You carried no essence to lose.</p>
      )}
      {skippable && (
        <p className="mt-6 text-xs text-[#D7CCC8]/50 uppercase tracking-widest animate-pulse">
          Click to continue
        </p>
      )}
    </div>
  );
};
