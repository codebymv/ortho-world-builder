import { useEffect, useRef, useState, useCallback } from 'react';
import type { Item } from '@/lib/game/GameState';
import type { AssetManager } from '@/lib/game/AssetManager';

interface ItemAcquiredOverlayProps {
  item: Item | null;
  /** Currently equipped weapon — only used when the acquired item is equipment, for the stat compare. */
  currentWeapon: Item | null;
  assetManager?: AssetManager | null;
  /** Equip handler for weapons and rings. Ignored for other item types. */
  onEquip: (itemId: string) => void;
  onDismiss: () => void;
  /** When false, weapon is in inventory reserve — prompt Player (P) instead of equip. */
  canEquipActive?: boolean;
}

const EQUIP_DELAY_MS = 350;
const AUTO_DISMISS_MS = 10_000;

interface TypeChrome {
  header: string;
  acquiredHeader: string;
  chip: string;
  border: string;
  shadow: string;
  ringActive: string;
  ringEquipped: string;
}

const TYPE_CHROME: Record<Item['type'], TypeChrome> = {
  equipment: {
    header: 'Weapon',
    acquiredHeader: 'Weapon Acquired',
    chip: 'Weapon',
    border: 'border-[#DAA520]',
    shadow: 'shadow-[#DAA520]/15',
    ringActive: 'border-[#DAA520]',
    ringEquipped: 'border-emerald-400',
  },
  consumable: {
    header: 'Consumable',
    acquiredHeader: 'Item Acquired',
    chip: 'Consumable',
    border: 'border-amber-500',
    shadow: 'shadow-amber-500/15',
    ringActive: 'border-amber-500',
    ringEquipped: 'border-amber-300',
  },
  key: {
    header: 'Key Item',
    acquiredHeader: 'Key Item Acquired',
    chip: 'Key Item',
    border: 'border-violet-400',
    shadow: 'shadow-violet-400/15',
    ringActive: 'border-violet-400',
    ringEquipped: 'border-violet-300',
  },
  quest: {
    header: 'Quest Item',
    acquiredHeader: 'Quest Item Acquired',
    chip: 'Quest Item',
    border: 'border-cyan-400',
    shadow: 'shadow-cyan-400/15',
    ringActive: 'border-cyan-400',
    ringEquipped: 'border-cyan-300',
  },
  ring: {
    header: 'Ring',
    acquiredHeader: 'Ring Acquired',
    chip: 'Ring',
    border: 'border-violet-400',
    shadow: 'shadow-violet-400/15',
    ringActive: 'border-violet-400',
    ringEquipped: 'border-emerald-400',
  },
};

function formatRingBonus(item: Item): string | null {
  if (item.stats?.staminaRegenMult && item.stats.staminaRegenMult > 1) {
    return `+${Math.round((item.stats.staminaRegenMult - 1) * 100)}% stamina recovery`;
  }
  if (item.stats?.recoverySpeedMult && item.stats.recoverySpeedMult > 1) {
    return `+${Math.round((item.stats.recoverySpeedMult - 1) * 100)}% recovery speed`;
  }
  if (item.stats?.moveSpeedMult && item.stats.moveSpeedMult > 1) {
    return `+${Math.round((item.stats.moveSpeedMult - 1) * 100)}% movement speed`;
  }
  return null;
}

/**
 * Renamed from WeaponAcquiredOverlay — now fires for any first-time pickup so the
 * player sees real fanfare the first time they find a potion, charm, key, or weapon.
 * Game.tsx is responsible for only invoking this with first-time items (tracked via
 * GameState.seenItemIds); the overlay itself just renders whatever it's handed.
 */
export const WeaponAcquiredOverlay = ({
  item,
  currentWeapon,
  assetManager,
  onEquip,
  onDismiss,
  canEquipActive = true,
}: ItemAcquiredOverlayProps) => {
  const [phase, setPhase] = useState<'hidden' | 'fadein' | 'ready' | 'equipped' | 'fadeout'>('hidden');
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const onEquipRef = useRef(onEquip);
  const onDismissRef = useRef(onDismiss);
  onEquipRef.current = onEquip;
  onDismissRef.current = onDismiss;
  const itemRef = useRef(item);
  itemRef.current = item;

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
    }, 500));
  }, [clearTimers]);

  const handleEquip = useCallback(() => {
    if (phase !== 'ready' || !itemRef.current) return;
    if (itemRef.current.type !== 'equipment' && itemRef.current.type !== 'ring') {
      dismiss();
      return;
    }
    clearTimers();
    onEquipRef.current(itemRef.current.id);
    setPhase('equipped');
    timersRef.current.push(setTimeout(() => {
      setPhase('fadeout');
      timersRef.current.push(setTimeout(() => {
        setPhase('hidden');
        onDismissRef.current();
      }, 500));
    }, 800));
  }, [phase, clearTimers, dismiss]);

  useEffect(() => {
    if (item) {
      setPhase('fadein');
      timersRef.current.push(setTimeout(() => setPhase('ready'), EQUIP_DELAY_MS));
      timersRef.current.push(setTimeout(() => dismiss(), AUTO_DISMISS_MS));
      return clearTimers;
    } else {
      setPhase('hidden');
    }
  }, [item, dismiss, clearTimers]);

  useEffect(() => {
    if (phase !== 'ready') return;
    const canEquip = itemRef.current?.type === 'equipment' || itemRef.current?.type === 'ring';
    const onKeyDown = (e: KeyboardEvent) => {
      if (canEquip && canEquipActive && e.code === 'KeyF') {
        e.preventDefault();
        e.stopPropagation();
        handleEquip();
        return;
      }
      if (e.code === 'Enter' || e.code === 'Space') {
        e.preventDefault();
        e.stopPropagation();
        if (canEquip && canEquipActive) handleEquip();
        else dismiss();
      }
      if (e.code === 'Escape') {
        e.preventDefault();
        dismiss();
      }
    };
    window.addEventListener('keydown', onKeyDown, { capture: true });
    return () => window.removeEventListener('keydown', onKeyDown, { capture: true });
  }, [phase, handleEquip, dismiss, canEquipActive]);

  if (phase === 'hidden' || !item) return null;

  const chrome = TYPE_CHROME[item.type] ?? TYPE_CHROME.quest;
  const isEquipment = item.type === 'equipment';
  const isRing = item.type === 'ring';
  const isEquipped = phase === 'equipped';
  const ringBonus = formatRingBonus(item);
  const spriteUrl = assetManager?.getTextureURL(item.sprite) ?? null;

  const newDmg = item.stats?.damage ?? 0;
  const oldDmg = currentWeapon?.stats?.damage ?? 0;
  const newRange = item.stats?.range ?? 0;
  const oldRange = currentWeapon?.stats?.range ?? 0;
  const dmgDiff = newDmg - oldDmg;
  const rangeDiff = +(newRange - oldRange).toFixed(2);

  return (
    <div
      className={`fixed inset-0 z-[97] flex items-center justify-center transition-opacity duration-500 ${
        phase === 'fadein' || phase === 'ready' || phase === 'equipped' ? 'opacity-100' : 'opacity-0'
      }`}
      style={{ backgroundColor: 'rgba(10,6,2,0.82)' }}
      onClick={(e) => { e.stopPropagation(); if (phase === 'ready') dismiss(); }}
    >
      <div
        className="flex flex-col items-center pointer-events-auto select-none"
        onClick={(e) => e.stopPropagation()}
        style={{ marginTop: '-4vh' }}
      >
        {/* Header */}
        <p
          className="text-xs uppercase tracking-[0.4em] text-[#DAA520] mb-4 drop-shadow-[0_0_6px_rgba(218,165,32,0.3)]"
        >
          {isEquipped
            ? (isRing ? 'Ring Equipped' : 'Weapon Equipped')
            : chrome.acquiredHeader}
        </p>

        {/* Item icon */}
        <div
          className={`w-24 h-24 bg-[#1A0F0A]/90 border-2 rounded-lg flex items-center justify-center shadow-2xl mb-4 transition-all duration-500 ${
            isEquipped ? `${chrome.ringEquipped} shadow-emerald-400/20` : `${chrome.ringActive} ${chrome.shadow}`
          }`}
        >
          {spriteUrl ? (
            <img
              src={spriteUrl}
              alt={item.name}
              className="w-16 h-16 [image-rendering:pixelated] object-contain drop-shadow-md"
            />
          ) : (
            <div className="w-16 h-16 bg-[#2D1B11] rounded" />
          )}
        </div>

        {/* Item name */}
        <h2
          className={`text-2xl font-bold tracking-wide mb-1 transition-colors duration-300 ${
            isEquipped ? 'text-emerald-300' : 'text-[#F5DEB3]'
          }`}
        >
          {item.name}
        </h2>

        {/* Type chip (non-equipment only — equipment header already says "Weapon") */}
        {!isEquipment && (
          <span className={`mb-2 text-[10px] uppercase tracking-wider font-bold px-2 py-0.5 rounded-sm ${chrome.border} border bg-black/30 text-[#F5DEB3]`}>
            {chrome.chip}
          </span>
        )}

        {/* Description */}
        <p className="text-xs text-[#C9B8A8] max-w-xs text-center leading-relaxed mb-5 px-4">
          {item.description}
        </p>

        {isRing && ringBonus && (
          <p className="text-sm font-bold text-violet-300 mb-5 tabular-nums">{ringBonus}</p>
        )}

        {/* Stat comparison — equipment only */}
        {isEquipment && (
          <div className="flex items-stretch gap-6 mb-6">
            {/* Current weapon */}
            <div className="flex flex-col items-center min-w-[100px]">
              <span className="text-[10px] uppercase tracking-wider text-[#A1887F] mb-2">Current</span>
              <span className="text-xs text-[#F5DEB3] font-semibold mb-1">{currentWeapon?.name ?? 'None'}</span>
              <div className="flex flex-col gap-1 items-center">
                <span className="text-[11px] text-[#C9B8A8]">
                  ATK <span className="font-bold">{oldDmg}</span>
                </span>
                <span className="text-[11px] text-[#C9B8A8]">
                  RNG <span className="font-bold">{oldRange.toFixed(2)}</span>
                </span>
              </div>
            </div>

            {/* Arrow */}
            <div className="flex items-center">
              <span className="text-lg text-[#DAA520]">&rarr;</span>
            </div>

            {/* New weapon */}
            <div className="flex flex-col items-center min-w-[100px]">
              <span className="text-[10px] uppercase tracking-wider text-[#DAA520] mb-2">New</span>
              <span className="text-xs text-[#F5DEB3] font-semibold mb-1">{item.name}</span>
              <div className="flex flex-col gap-1 items-center">
                <span className="text-[11px] text-[#F5DEB3]">
                  ATK <span className="font-bold">{newDmg}</span>
                  {dmgDiff !== 0 && (
                    <span className={`ml-1 text-[10px] font-bold ${dmgDiff > 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                      {dmgDiff > 0 ? '+' : ''}{dmgDiff}
                    </span>
                  )}
                </span>
                <span className="text-[11px] text-[#F5DEB3]">
                  RNG <span className="font-bold">{newRange.toFixed(2)}</span>
                  {rangeDiff !== 0 && (
                    <span className={`ml-1 text-[10px] font-bold ${rangeDiff > 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                      {rangeDiff > 0 ? '+' : ''}{rangeDiff}
                    </span>
                  )}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Prompt button */}
        {phase === 'ready' && (isEquipment || isRing) && canEquipActive && (
          <button
            className="flex items-center gap-2 bg-[#2D1B11]/80 border border-[#DAA520]/60 rounded-md px-5 py-2 cursor-pointer hover:bg-[#3D2B21] transition-colors group"
            onClick={(e) => { e.stopPropagation(); handleEquip(); }}
          >
            <span className="text-xs text-[#C9B8A8] uppercase tracking-wider">Press</span>
            <kbd className="bg-[#1A0F0A] px-2 py-0.5 rounded border border-[#5C3A21] text-[#DAA520] text-sm font-bold shadow-inner group-hover:border-[#DAA520]">
              F
            </kbd>
            <span className="text-xs text-[#C9B8A8] uppercase tracking-wider">to equip</span>
          </button>
        )}

        {phase === 'ready' && isEquipment && !canEquipActive && (
          <p className="text-xs text-[#C9B8A8] text-center max-w-xs leading-relaxed">
            Loadout full. Open{' '}
            <kbd className="rounded border border-[#5C3A21] bg-[#1A0F0A] px-1.5 py-0.5 font-mono text-[#DAA520]">P</kbd>{' '}
            to swap a weapon into your active set.
          </p>
        )}

        {phase === 'ready' && isRing && !canEquipActive && (
          <p className="text-xs text-[#C9B8A8] text-center max-w-xs leading-relaxed">
            Ring slots full. Open{' '}
            <kbd className="rounded border border-[#5C3A21] bg-[#1A0F0A] px-1.5 py-0.5 font-mono text-[#DAA520]">P</kbd>{' '}
            to swap rings.
          </p>
        )}

        {phase === 'ready' && !isEquipment && (
          <button
            className="flex items-center gap-2 bg-[#2D1B11]/80 border border-[#DAA520]/60 rounded-md px-5 py-2 cursor-pointer hover:bg-[#3D2B21] transition-colors group"
            onClick={(e) => { e.stopPropagation(); dismiss(); }}
          >
            <span className="text-xs text-[#C9B8A8] uppercase tracking-wider">Press</span>
            <kbd className="bg-[#1A0F0A] px-2 py-0.5 rounded border border-[#5C3A21] text-[#DAA520] text-sm font-bold shadow-inner group-hover:border-[#DAA520]">
              Space
            </kbd>
            <span className="text-xs text-[#C9B8A8] uppercase tracking-wider">to continue</span>
          </button>
        )}

        {isEquipped && (
          <p className="text-sm text-emerald-400 font-bold uppercase tracking-widest animate-pulse">
            Equipped!
          </p>
        )}

        {phase === 'fadein' && (
          <div className="h-8" />
        )}
      </div>
    </div>
  );
};
