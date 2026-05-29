import React, { memo, useMemo, useState } from 'react';
import { Sword, Circle, Check, Package } from 'lucide-react';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { HudSprite, SPRITE_PLAYER } from '@/components/game/HudSprite';
import type {
  GameState,
  Item,
  RingSlotIndex,
  WeaponLoadoutSlotIndex,
} from '@/lib/game/GameState';
import {
  RING_SLOT_COUNT,
  WEAPON_LOADOUT_SIZE,
} from '@/lib/game/GameState';
import type { AssetManager } from '@/lib/game/AssetManager';
import { PlayerPreviewSprite } from '@/components/game/PlayerPreviewSprite';
import { notify } from '@/lib/game/notificationBus';

interface PlayerModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  gameState: GameState;
  assetManager: AssetManager | null;
  triggerUIUpdate: () => void;
}

const getItemIcon = (item: Item, className: string, assetManager?: AssetManager | null) => {
  if (assetManager) {
    const url = assetManager.getTextureURL(item.sprite);
    if (url) {
      return (
        <img
          src={url}
          alt={item.name}
          className={`${className} [image-rendering:pixelated] object-contain drop-shadow-sm`}
        />
      );
    }
  }
  if (item.type === 'equipment') return <Sword className={className} />;
  if (item.type === 'ring') return <Circle className={className} />;
  return <Package className={className} />;
};

function formatRingBonus(item: Item): string | null {
  if (item.stats?.staminaRegenMult && item.stats.staminaRegenMult > 1) {
    return `+${Math.round((item.stats.staminaRegenMult - 1) * 100)}% stamina recovery`;
  }
  if (item.stats?.recoverySpeedMult && item.stats.recoverySpeedMult > 1) {
    return `+${Math.round((item.stats.recoverySpeedMult - 1) * 100)}% recovery speed`;
  }
  return null;
}

const StatRow = memo(({
  label,
  value,
  bonus,
  accent,
}: {
  label: string;
  value: string | number;
  bonus?: string | null;
  accent?: boolean;
}) => (
  <div className="flex items-center justify-between gap-2 text-xs">
    <span className="text-[#A1887F] uppercase tracking-wider text-[10px]">{label}</span>
    <span className="flex items-center gap-1.5 min-w-0">
      {bonus ? (
        <span className="text-[10px] font-bold text-violet-300 tabular-nums flex-shrink-0">{bonus}</span>
      ) : null}
      <span className={cn('font-bold tabular-nums', accent ? 'text-[#DAA520]' : 'text-[#F5DEB3]')}>{value}</span>
    </span>
  </div>
));

export const PlayerModal = memo(({
  open,
  onOpenChange,
  gameState,
  assetManager,
  triggerUIUpdate,
}: PlayerModalProps) => {
  const [selectedWeaponId, setSelectedWeaponId] = useState<string | null>(null);
  const [selectedRingId, setSelectedRingId] = useState<string | null>(null);

  const { player } = gameState;

  const ownedWeapons = useMemo(
    () => {
      const seen = new Set<string>();
      return gameState.inventory.filter(item => {
        if (item.type !== 'equipment' || seen.has(item.id)) return false;
        seen.add(item.id);
        return true;
      });
    },
    [gameState.inventory],
  );

  const reserveWeapons = useMemo(
    () => ownedWeapons.filter(w => !gameState.isWeaponInLoadout(w.id)),
    [ownedWeapons, gameState.weaponLoadout],
  );

  const ownedRings = useMemo(
    () => {
      const seen = new Set<string>();
      return gameState.inventory.filter(item => {
        if (item.type !== 'ring' || seen.has(item.id)) return false;
        seen.add(item.id);
        return true;
      });
    },
    [gameState.inventory],
  );

  const staminaRegenBonus = Math.round((gameState.getStaminaRegenMultiplier() - 1) * 100);
  const recoveryBonus = Math.round((gameState.getRecoverySpeedMultiplier() - 1) * 100);
  const effectiveStaminaRegen = Math.round(player.staminaRegenRate * gameState.getStaminaRegenMultiplier());

  const getRingItem = (slotIndex: RingSlotIndex): Item | null => {
    const ringId = gameState.equippedRingIds[slotIndex];
    if (!ringId) return null;
    return gameState.inventory.find(item => item.id === ringId && item.type === 'ring') ?? null;
  };

  const getLoadoutWeapon = (slotIndex: WeaponLoadoutSlotIndex): Item | null => {
    const weaponId = gameState.weaponLoadout[slotIndex];
    if (!weaponId) return null;
    return gameState.inventory.find(item => item.id === weaponId && item.type === 'equipment') ?? null;
  };

  const handleWeaponSlotClick = (slotIndex: WeaponLoadoutSlotIndex) => {
    if (selectedWeaponId) {
      gameState.assignWeaponToLoadout(selectedWeaponId, slotIndex);
      setSelectedWeaponId(null);
      triggerUIUpdate();
      return;
    }

    const current = gameState.weaponLoadout[slotIndex];
    if (current) {
      gameState.setEquippedWeapon(current);
      triggerUIUpdate();
    }
  };

  const handleRingSlotClick = (slotIndex: RingSlotIndex) => {
    if (selectedRingId) {
      gameState.equipRing(selectedRingId, slotIndex);
      setSelectedRingId(null);
      triggerUIUpdate();
      return;
    }

    if (gameState.equippedRingIds[slotIndex]) {
      gameState.unequipRing(slotIndex);
      triggerUIUpdate();
    }
  };

  const handleReserveWeaponClick = (weaponId: string) => {
    if (gameState.isWeaponLoadoutFull()) {
      setSelectedWeaponId(prev => (prev === weaponId ? null : weaponId));
      notify('Select a loadout slot', {
        id: 'weapon-loadout-pick-slot',
        type: 'info',
        description: 'Click an active weapon slot to swap this weapon in.',
        duration: 2500,
      });
      return;
    }
    const empty = gameState.findEmptyWeaponLoadoutSlot();
    if (empty !== null) {
      gameState.assignWeaponToLoadout(weaponId, empty);
      triggerUIUpdate();
    }
  };

  const handleRingPick = (ringId: string) => {
    const equippedSlot = gameState.equippedRingIds.findIndex(id => id === ringId);
    if (equippedSlot >= 0) return;
    const empty = gameState.findEmptyRingSlot();
    if (empty !== null) {
      gameState.equipRing(ringId, empty);
      triggerUIUpdate();
      return;
    }
    setSelectedRingId(prev => (prev === ringId ? null : ringId));
    notify('Select a ring slot', {
      id: 'ring-pick-slot',
      type: 'info',
      description: 'Click a ring slot to equip this ring (replaces what is there).',
      duration: 2500,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        onOpenAutoFocus={e => e.preventDefault()}
        className={cn(
          'z-[85] flex w-[min(96vw,960px)] max-w-[min(96vw,960px)] flex-col gap-0 border-2 border-[#5C3A21] bg-[#120A08]/97 p-0 text-left shadow-2xl backdrop-blur-md sm:rounded-sm overflow-hidden',
        )}
      >
        <DialogTitle className="sr-only">Player</DialogTitle>

        <div className="flex flex-shrink-0 items-center justify-between gap-2 border-b border-[#5C3A21]/60 px-5 py-3">
          <div>
            <h2 className="font-bold uppercase tracking-[0.2em] text-[#DAA520] flex items-center gap-2">
              <HudSprite spec={SPRITE_PLAYER} size={20} />
              Player
            </h2>
            <p className="mt-0.5 text-xs text-[#A1887F]">Level {player.level}</p>
          </div>
        </div>

        <div className="px-5 py-4">
          <div className="grid grid-cols-[minmax(168px,200px)_1fr] gap-5 items-start">
            {/* Left — portrait + stats */}
            <div className="space-y-3">
              <div className="flex flex-col items-center rounded-sm border border-[#5C3A21]/50 bg-[#1A0F0A]/60 p-3">
                <PlayerPreviewSprite
                  assetManager={assetManager}
                  equippedWeaponId={gameState.equippedWeaponId}
                  className="w-20 h-20 drop-shadow-lg"
                />
                <p className="mt-1.5 text-[10px] uppercase tracking-wider text-[#A1887F]">Traveler</p>
              </div>
              <div className="rounded-sm border border-[#5C3A21]/40 bg-[#2D1B11]/30 p-3 space-y-2">
                <p className="text-[10px] font-bold uppercase tracking-wider text-[#DAA520]">Attributes</p>
                <StatRow label="Vitality" value={player.vitality} />
                <StatRow label="Endurance" value={player.endurance} />
                <StatRow label="Strength" value={player.strength} />
                <StatRow label="Level" value={player.level} accent />
                <div className="border-t border-[#5C3A21]/30 pt-2 space-y-2">
                  <StatRow label="Health" value={`${Math.ceil(player.health)} / ${player.maxHealth}`} />
                  <StatRow label="Stamina" value={`${Math.ceil(player.stamina)} / ${player.maxStamina}`} />
                  <StatRow
                    label="Stamina Regen"
                    value={`${effectiveStaminaRegen}/s`}
                    bonus={staminaRegenBonus > 0 ? `+${staminaRegenBonus}%` : null}
                  />
                  <StatRow
                    label="Recovery Speed"
                    value="100%"
                    bonus={recoveryBonus > 0 ? `+${recoveryBonus}%` : null}
                  />
                  <StatRow label="Attack" value={player.attackDamage} accent />
                  <StatRow label="Range" value={player.attackRange.toFixed(2)} />
                </div>
              </div>
            </div>

            {/* Right — loadout panels side by side */}
            <div className="grid grid-cols-[1fr_minmax(200px,240px)] gap-4 min-w-0">
              {/* Weapons */}
              <section className="min-w-0">
                <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-[#DAA520] flex items-center gap-1.5">
                  <Sword className="w-3.5 h-3.5" /> Active Weapons
                </p>
                <div className="grid grid-cols-3 gap-2">
                  {Array.from({ length: WEAPON_LOADOUT_SIZE }, (_, slotIndex) => {
                    const weapon = getLoadoutWeapon(slotIndex as WeaponLoadoutSlotIndex);
                    const isActive = weapon?.id === gameState.equippedWeaponId;
                    const isTarget = selectedWeaponId !== null;
                    return (
                      <button
                        key={`weapon-slot-${slotIndex}`}
                        type="button"
                        onClick={() => handleWeaponSlotClick(slotIndex as WeaponLoadoutSlotIndex)}
                        className={cn(
                          'flex h-[120px] flex-col items-center justify-between rounded-sm border p-2 transition-all',
                          weapon
                            ? isActive
                              ? 'border-[#DAA520]/70 bg-[#2D1B11]/70'
                              : 'border-[#5C3A21]/50 bg-[#2D1B11]/40 hover:border-[#DAA520]/40'
                            : isTarget
                              ? 'border-dashed border-[#DAA520]/60 bg-[#DAA520]/5'
                              : 'border-dashed border-[#5C3A21]/50 bg-[#1A0F0A]/40',
                        )}
                      >
                        <span className="text-[9px] uppercase font-bold tracking-wider text-[#A1887F] flex-shrink-0">
                          Slot {slotIndex + 1}
                        </span>
                        <div className="flex flex-1 flex-col items-center justify-center gap-1 min-h-0 w-full">
                          <div className="w-10 h-10 flex-shrink-0 flex items-center justify-center bg-[#1A0F0A]/60 rounded border border-[#5C3A21]/50">
                            {weapon ? getItemIcon(weapon, 'w-8 h-8', assetManager) : <Sword className="w-5 h-5 text-[#5C3A21]" />}
                          </div>
                          {weapon ? (
                            <>
                              <span className="text-[10px] font-bold text-[#F5DEB3] text-center line-clamp-2 leading-tight w-full px-0.5">
                                {weapon.name}
                              </span>
                              <span className="text-[9px] text-[#C9B8A8]">ATK {weapon.stats?.damage ?? '—'}</span>
                            </>
                          ) : (
                            <span className="text-[10px] text-[#C9B8A8]">Empty</span>
                          )}
                        </div>
                        <span className="h-[14px] flex-shrink-0 flex items-center justify-center text-[9px] uppercase font-bold text-[#DAA520]">
                          {weapon && isActive ? (
                            <span className="flex items-center gap-0.5">
                              <Check className="w-2.5 h-2.5" /> Active
                            </span>
                          ) : null}
                        </span>
                      </button>
                    );
                  })}
                </div>
                {selectedWeaponId && (
                  <p className="mt-1.5 text-[10px] text-[#DAA520]">
                    Click a slot to assign.{' '}
                    <button type="button" className="underline hover:text-[#F5DEB3]" onClick={() => setSelectedWeaponId(null)}>
                      Cancel
                    </button>
                  </p>
                )}
                {reserveWeapons.length > 0 && (
                  <div className="mt-3">
                    <p className="mb-1.5 text-[10px] font-bold uppercase tracking-wider text-[#A1887F]">Reserve</p>
                    <div className="flex flex-wrap gap-1.5">
                      {reserveWeapons.map(weapon => (
                        <button
                          key={weapon.id}
                          type="button"
                          onClick={() => handleReserveWeaponClick(weapon.id)}
                          className={cn(
                            'flex items-center gap-2 px-2 py-1.5 border rounded-sm transition-colors text-left max-w-full',
                            selectedWeaponId === weapon.id
                              ? 'border-[#DAA520]/60 bg-[#DAA520]/10'
                              : 'border-[#5C3A21]/50 bg-[#2D1B11]/30 hover:border-[#5C3A21]',
                          )}
                        >
                          <div className="w-7 h-7 flex-shrink-0 bg-[#1A0F0A]/60 rounded border border-[#5C3A21]/50 flex items-center justify-center">
                            {getItemIcon(weapon, 'w-5 h-5', assetManager)}
                          </div>
                          <span className="text-[10px] font-bold text-[#F5DEB3] truncate max-w-[140px]">{weapon.name}</span>
                          <span className="text-[9px] text-[#C9B8A8] flex-shrink-0">ATK {weapon.stats?.damage ?? '—'}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </section>

              {/* Rings */}
              <section className="min-w-0">
                <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-[#DAA520] flex items-center gap-1.5">
                  <Circle className="w-3.5 h-3.5" /> Rings
                </p>
                <div className="grid grid-cols-1 gap-2">
                  {Array.from({ length: RING_SLOT_COUNT }, (_, slotIndex) => {
                    const ring = getRingItem(slotIndex as RingSlotIndex);
                    const isTarget = selectedRingId !== null;
                    return (
                      <button
                        key={`ring-slot-${slotIndex}`}
                        type="button"
                        onClick={() => handleRingSlotClick(slotIndex as RingSlotIndex)}
                        className={cn(
                          'flex items-center gap-2 rounded-sm border p-2 min-h-[72px] transition-all text-left',
                          ring
                            ? 'border-[#DAA520]/50 bg-[#2D1B11]/60'
                            : isTarget
                              ? 'border-dashed border-[#DAA520]/60 bg-[#DAA520]/5'
                              : 'border-dashed border-[#5C3A21]/50 bg-[#1A0F0A]/40',
                        )}
                      >
                        <div className="w-10 h-10 flex-shrink-0 rounded-full bg-[#1A0F0A]/60 border border-[#5C3A21]/50 flex items-center justify-center">
                          {ring ? getItemIcon(ring, 'w-7 h-7', assetManager) : <Circle className="w-4 h-4 text-[#5C3A21]" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <span className="text-[9px] uppercase font-bold tracking-wider text-[#A1887F] block">
                            Ring {slotIndex + 1}
                          </span>
                          {ring ? (
                            <>
                              <span className="text-[10px] font-bold text-[#F5DEB3] block truncate">{ring.name}</span>
                              {formatRingBonus(ring) && (
                                <span className="text-[9px] text-violet-300 block truncate">{formatRingBonus(ring)}</span>
                              )}
                            </>
                          ) : (
                            <span className="text-[10px] text-[#C9B8A8]">Empty</span>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
                {ownedRings.some(r => !gameState.equippedRingIds.includes(r.id)) && (
                  <div className="mt-2 space-y-1">
                    {ownedRings.map(ring => {
                      if (gameState.equippedRingIds.includes(ring.id)) return null;
                      return (
                        <button
                          key={ring.id}
                          type="button"
                          onClick={() => handleRingPick(ring.id)}
                          className={cn(
                            'w-full flex items-center gap-2 p-1.5 border rounded-sm transition-colors text-left',
                            selectedRingId === ring.id
                              ? 'border-[#DAA520]/60 bg-[#DAA520]/10'
                              : 'border-[#5C3A21]/50 bg-[#2D1B11]/30 hover:border-[#5C3A21]',
                          )}
                        >
                          <div className="w-7 h-7 flex-shrink-0 rounded-full bg-[#1A0F0A]/60 border border-[#5C3A21]/50 flex items-center justify-center">
                            {getItemIcon(ring, 'w-5 h-5', assetManager)}
                          </div>
                          <span className="text-[10px] font-bold text-[#F5DEB3] truncate flex-1">{ring.name}</span>
                          {formatRingBonus(ring) && (
                            <span className="text-[9px] font-bold text-violet-300 flex-shrink-0">{formatRingBonus(ring)}</span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                )}
                {selectedRingId && (
                  <p className="mt-1.5 text-[10px] text-[#DAA520]">
                    Click a slot.{' '}
                    <button type="button" className="underline hover:text-[#F5DEB3]" onClick={() => setSelectedRingId(null)}>
                      Cancel
                    </button>
                  </p>
                )}
              </section>
            </div>
          </div>
        </div>

        <div className="flex-shrink-0 border-t border-[#5C3A21]/30 px-5 py-2 flex justify-end">
          <p className="text-[10px] text-[#C9B8A8]">
            <kbd className="rounded border border-[#5C3A21] bg-[#1A0F0A] px-1.5 py-0.5 font-mono text-[#DAA520]">P</kbd>{' '}
            or <kbd className="rounded border border-[#5C3A21] bg-[#1A0F0A] px-1.5 py-0.5 font-mono text-[#DAA520]">Esc</kbd>{' '}
            to close
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
});
