import { useEffect, useRef, useState } from 'react';

interface GameBootLoadingOverlayProps {
  message: string;
  /** Target progress 0–100; displayed value eases toward this each frame. */
  targetProgress: number;
  /** When true, overlay fades out before unmount. */
  exiting?: boolean;
}

/**
 * Full-screen boot veil with a purple progress meter. Shown over the main menu and then over the
 * canvas while runtime modules, Three.js, and the first world stream complete.
 */
export const GameBootLoadingOverlay = ({
  message,
  targetProgress,
  exiting = false,
}: GameBootLoadingOverlayProps) => {
  const [displayProgress, setDisplayProgress] = useState(0);
  const displayRef = useRef(0);

  useEffect(() => {
    let raf = 0;
    const tick = () => {
      const current = displayRef.current;
      const delta = targetProgress - current;
      const step = Math.abs(delta) < 0.35 ? delta : delta * 0.14;
      const next = Math.max(0, Math.min(100, current + step));
      displayRef.current = next;
      setDisplayProgress(next);
      if (Math.abs(targetProgress - next) > 0.2) {
        raf = requestAnimationFrame(tick);
      }
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [targetProgress]);

  const pct = Math.round(displayProgress);

  return (
    <div
      className={`fixed inset-0 z-[220] flex items-center justify-center bg-[#07030d] text-[#E8DBF5] pointer-events-auto transition-opacity duration-500 ${
        exiting ? 'opacity-0' : 'opacity-100'
      }`}
      aria-live="polite"
      aria-busy={!exiting}
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(116,65,190,0.28)_0%,rgba(7,3,13,0.82)_42%,rgba(0,0,0,0.98)_100%)]" />
      <div className="absolute inset-0 bg-gradient-to-b from-[#0a0612]/40 via-transparent to-[#0a0612]/70" />

      <div className="relative flex w-full max-w-md flex-col items-center gap-6 px-10 text-center">
        {/* Bonfire pulse */}
        <div className="relative h-14 w-14">
          <div className="absolute inset-0 rounded-full border border-[#8f67d6]/30 animate-pulse" />
          <div className="absolute inset-[0.35rem] rounded-full bg-[#ff8a2a] shadow-[0_0_28px_rgba(255,120,32,0.65)]" />
          <div className="absolute -inset-1 rounded-full bg-[#7c4dff]/15 blur-md" />
        </div>

        <div>
          <p
            className="font-['Cinzel'] text-sm font-bold uppercase tracking-[0.32em] text-[#d8c6f4] drop-shadow-[0_0_14px_rgba(150,90,220,0.65)]"
          >
            {message}
          </p>
          <p className="mt-2 text-[10px] uppercase tracking-[0.26em] text-[#9f8ac4]">
            Preparing the world
          </p>
        </div>

        {/* Purple meter */}
        <div className="w-full">
          <div className="mb-2 flex items-center justify-between text-[10px] uppercase tracking-[0.22em] text-[#9f8ac4]">
            <span>Loading</span>
            <span className="tabular-nums text-[#d8c6f4]">{pct}%</span>
          </div>
          <div className="h-2 overflow-hidden rounded-sm border border-[#6b4f9e]/45 bg-[#120a22]/80 shadow-[inset_0_1px_4px_rgba(0,0,0,0.55)]">
            <div
              className="relative h-full rounded-sm bg-gradient-to-r from-[#5a3a8f] via-[#8f67d6] to-[#c4a8ff] shadow-[0_0_16px_rgba(143,103,214,0.55)] transition-[width] duration-150 ease-out"
              style={{ width: `${displayProgress}%` }}
            >
              <div className="absolute inset-y-0 right-0 w-8 bg-gradient-to-l from-white/25 to-transparent" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
