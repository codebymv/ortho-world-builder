import { useCallback, useEffect, useRef, useState } from 'react';
import type { AssetManager } from '@/lib/game/AssetManager';
import type { RewardBundle, RewardBundleEntry } from '@/game/domain/rewardDisplay';
import { HudSprite, SPRITE_COIN } from '@/components/game/HudSprite';
import { Package } from 'lucide-react';

interface RewardBundleOverlayProps {
  bundle: RewardBundle | null;
  assetManager?: AssetManager | null;
  onDismiss: () => void;
}

const READY_DELAY_MS = 250;
const AUTO_DISMISS_MS = 6500;

function RewardIcon({
  entry,
  assetManager,
}: {
  entry: RewardBundleEntry;
  assetManager?: AssetManager | null;
}) {
  if (entry.kind === 'gold') {
    return <HudSprite spec={SPRITE_COIN} size={48} title="Gold" className="drop-shadow-md" />;
  }

  const spriteUrl = assetManager?.getTextureURL(entry.item.sprite) ?? null;
  if (spriteUrl) {
    return (
      <img
        src={spriteUrl}
        alt={entry.item.name}
        className="h-12 w-12 object-contain [image-rendering:pixelated] drop-shadow-md"
      />
    );
  }

  return <Package className="h-10 w-10 text-[#DAA520]" />;
}

function getRewardLabel(entry: RewardBundleEntry): string {
  if (entry.kind === 'gold') return `${entry.amount} Gold`;
  if ((entry.quantity ?? 1) > 1) return `${entry.quantity}x ${entry.item.name}`;
  return entry.item.name;
}

function getRewardChip(entry: RewardBundleEntry): string {
  if (entry.kind === 'gold') return 'Currency';
  if (entry.item.type === 'equipment') return 'Weapon';
  if (entry.item.type === 'ring') return 'Ring';
  if (entry.item.type === 'quest' || entry.item.type === 'key') return 'Key Item';
  return 'Item';
}

export function RewardBundleOverlay({
  bundle,
  assetManager,
  onDismiss,
}: RewardBundleOverlayProps) {
  const [phase, setPhase] = useState<'hidden' | 'fadein' | 'ready' | 'fadeout'>('hidden');
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const onDismissRef = useRef(onDismiss);
  onDismissRef.current = onDismiss;

  const clearTimers = useCallback(() => {
    timersRef.current.forEach(clearTimeout);
    timersRef.current = [];
  }, []);

  const dismiss = useCallback(() => {
    clearTimers();
    setPhase('fadeout');
    timersRef.current.push(setTimeout(() => {
      setPhase('hidden');
      onDismissRef.current();
    }, 350));
  }, [clearTimers]);

  useEffect(() => {
    if (!bundle) {
      setPhase('hidden');
      clearTimers();
      return;
    }
    setPhase('fadein');
    timersRef.current.push(setTimeout(() => setPhase('ready'), READY_DELAY_MS));
    timersRef.current.push(setTimeout(() => dismiss(), AUTO_DISMISS_MS));
    return clearTimers;
  }, [bundle, clearTimers, dismiss]);

  useEffect(() => {
    if (phase !== 'ready') return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.code !== 'Enter' && e.code !== 'Space' && e.code !== 'Escape') return;
      e.preventDefault();
      e.stopPropagation();
      dismiss();
    };
    window.addEventListener('keydown', onKeyDown, { capture: true });
    return () => window.removeEventListener('keydown', onKeyDown, { capture: true });
  }, [phase, dismiss]);

  if (!bundle || phase === 'hidden') return null;

  return (
    <div
      className={`fixed inset-0 z-[96] flex items-center justify-center transition-opacity duration-300 ${
        phase === 'fadein' || phase === 'ready' ? 'opacity-100' : 'opacity-0'
      }`}
      style={{ backgroundColor: 'rgba(10,6,2,0.72)' }}
      onClick={(e) => { e.stopPropagation(); if (phase === 'ready') dismiss(); }}
    >
      <div
        className="flex flex-col items-center pointer-events-auto select-none"
        onClick={(e) => e.stopPropagation()}
        style={{ marginTop: '-4vh' }}
      >
        <p className="mb-4 text-xs uppercase tracking-[0.4em] text-[#DAA520] drop-shadow-[0_0_6px_rgba(218,165,32,0.35)]">
          {bundle.title}
        </p>

        <div className="flex max-w-[min(92vw,760px)] flex-wrap justify-center gap-4">
          {bundle.entries.map((entry, index) => (
            <div
              key={`${bundle.id}-${entry.kind}-${index}`}
              className="flex min-w-[132px] max-w-[168px] flex-col items-center rounded-lg border-2 border-[#DAA520] bg-[#1A0F0A]/92 p-3 shadow-2xl shadow-[#DAA520]/15"
            >
              <div className="mb-3 flex h-20 w-20 items-center justify-center rounded-md border border-[#5C3A21] bg-[#0D0705]/80 shadow-inner">
                <RewardIcon entry={entry} assetManager={assetManager} />
              </div>
              <h2 className="mb-1 text-center text-sm font-bold leading-tight tracking-wide text-[#F5DEB3]">
                {getRewardLabel(entry)}
              </h2>
              <span className="rounded-sm border border-[#DAA520]/60 bg-black/30 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[#F5DEB3]">
                {getRewardChip(entry)}
              </span>
            </div>
          ))}
        </div>

        {phase === 'ready' && (
          <button
            className="mt-6 flex items-center gap-2 rounded-md border border-[#DAA520]/60 bg-[#2D1B11]/80 px-5 py-2 transition-colors hover:bg-[#3D2B21]"
            onClick={(e) => { e.stopPropagation(); dismiss(); }}
          >
            <span className="text-xs uppercase tracking-wider text-[#C9B8A8]">Press</span>
            <kbd className="rounded border border-[#5C3A21] bg-[#1A0F0A] px-2 py-0.5 text-sm font-bold text-[#DAA520] shadow-inner">
              Space
            </kbd>
            <span className="text-xs uppercase tracking-wider text-[#C9B8A8]">to continue</span>
          </button>
        )}
      </div>
    </div>
  );
}
