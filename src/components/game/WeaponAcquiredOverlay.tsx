import { useEffect, useRef, useState, useCallback } from 'react';
import type { Item } from '@/lib/game/GameState';
import type { AssetManager } from '@/lib/game/AssetManager';

interface WeaponAcquiredOverlayProps {
  weapon: Item | null;
  currentWeapon: Item | null;
  assetManager?: AssetManager | null;
  onEquip: (weaponId: string) => void;
  onDismiss: () => void;
}

const EQUIP_DELAY_MS = 350;
const AUTO_DISMISS_MS = 10_000;

export const WeaponAcquiredOverlay = ({
  weapon,
  currentWeapon,
  assetManager,
  onEquip,
  onDismiss,
}: WeaponAcquiredOverlayProps) => {
  const [phase, setPhase] = useState<'hidden' | 'fadein' | 'ready' | 'equipped' | 'fadeout'>('hidden');
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const onEquipRef = useRef(onEquip);
  const onDismissRef = useRef(onDismiss);
  onEquipRef.current = onEquip;
  onDismissRef.current = onDismiss;
  const weaponRef = useRef(weapon);
  weaponRef.current = weapon;

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
    if (phase !== 'ready' || !weaponRef.current) return;
    clearTimers();
    onEquipRef.current(weaponRef.current.id);
    setPhase('equipped');
    timersRef.current.push(setTimeout(() => {
      setPhase('fadeout');
      timersRef.current.push(setTimeout(() => {
        setPhase('hidden');
        onDismissRef.current();
      }, 500));
    }, 800));
  }, [phase, clearTimers]);

  useEffect(() => {
    if (weapon) {
      setPhase('fadein');
      timersRef.current.push(setTimeout(() => setPhase('ready'), EQUIP_DELAY_MS));
      timersRef.current.push(setTimeout(() => dismiss(), AUTO_DISMISS_MS));
      return clearTimers;
    } else {
      setPhase('hidden');
    }
  }, [weapon, dismiss, clearTimers]);

  useEffect(() => {
    if (phase !== 'ready') return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'KeyF' || e.code === 'Enter') {
        e.preventDefault();
        e.stopPropagation();
        handleEquip();
      }
      if (e.code === 'Escape') {
        e.preventDefault();
        dismiss();
      }
    };
    window.addEventListener('keydown', onKeyDown, { capture: true });
    return () => window.removeEventListener('keydown', onKeyDown, { capture: true });
  }, [phase, handleEquip, dismiss]);

  if (phase === 'hidden' || !weapon) return null;

  const newDmg = weapon.stats?.damage ?? 0;
  const oldDmg = currentWeapon?.stats?.damage ?? 0;
  const newRange = weapon.stats?.range ?? 0;
  const oldRange = currentWeapon?.stats?.range ?? 0;
  const dmgDiff = newDmg - oldDmg;
  const rangeDiff = +(newRange - oldRange).toFixed(2);

  const spriteUrl = assetManager?.getTextureURL(weapon.sprite) ?? null;

  const isEquipped = phase === 'equipped';

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
          style={{ fontFamily: '"Times New Roman", Georgia, serif' }}
        >
          {isEquipped ? 'Weapon Equipped' : 'Weapon Acquired'}
        </p>

        {/* Weapon icon */}
        <div
          className={`w-24 h-24 bg-[#1A0F0A]/90 border-2 rounded-lg flex items-center justify-center shadow-2xl mb-4 transition-all duration-500 ${
            isEquipped
              ? 'border-emerald-400 shadow-emerald-400/20'
              : 'border-[#DAA520] shadow-[#DAA520]/15'
          }`}
        >
          {spriteUrl ? (
            <img
              src={spriteUrl}
              alt={weapon.name}
              className="w-16 h-16 [image-rendering:pixelated] object-contain drop-shadow-md"
            />
          ) : (
            <div className="w-16 h-16 bg-[#2D1B11] rounded" />
          )}
        </div>

        {/* Weapon name */}
        <h2
          className={`text-2xl font-bold tracking-wide mb-1 transition-colors duration-300 ${
            isEquipped ? 'text-emerald-300' : 'text-[#F5DEB3]'
          }`}
        >
          {weapon.name}
        </h2>

        {/* Description */}
        <p className="text-xs text-[#D3D3D3]/70 max-w-xs text-center leading-relaxed mb-5 px-4">
          {weapon.description}
        </p>

        {/* Stat comparison */}
        <div className="flex items-stretch gap-6 mb-6">
          {/* Current weapon */}
          <div className="flex flex-col items-center min-w-[100px]">
            <span className="text-[9px] uppercase tracking-wider text-[#A0522D] mb-2">Current</span>
            <span className="text-xs text-[#D3D3D3]/60 font-semibold mb-1">{currentWeapon?.name ?? 'None'}</span>
            <div className="flex flex-col gap-1 items-center">
              <span className="text-[11px] text-[#F5DEB3]/60">
                ATK <span className="font-bold">{oldDmg}</span>
              </span>
              <span className="text-[11px] text-[#F5DEB3]/60">
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
            <span className="text-[9px] uppercase tracking-wider text-[#DAA520] mb-2">New</span>
            <span className="text-xs text-[#F5DEB3] font-semibold mb-1">{weapon.name}</span>
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

        {/* Equip prompt */}
        {phase === 'ready' && (
          <button
            className="flex items-center gap-2 bg-[#2D1B11]/80 border border-[#DAA520]/60 rounded-md px-5 py-2 cursor-pointer hover:bg-[#3D2B21] transition-colors group"
            onClick={(e) => { e.stopPropagation(); handleEquip(); }}
          >
            <span className="text-xs text-[#D3D3D3]/70 uppercase tracking-wider">Press</span>
            <kbd className="bg-[#1A0F0A] px-2 py-0.5 rounded border border-[#5C3A21] text-[#DAA520] text-sm font-bold shadow-inner group-hover:border-[#DAA520]">
              F
            </kbd>
            <span className="text-xs text-[#D3D3D3]/70 uppercase tracking-wider">to equip</span>
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
