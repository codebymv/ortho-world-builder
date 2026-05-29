import { GameState, type CurrencyGain, type Item } from '@/lib/game/GameState';
import { AssetManager } from '@/lib/game/AssetManager';
import { Button } from '@/components/ui/button';
// The remaining lucide icons are fallbacks for inventory item sprites and
// generic UI affordances (chevrons). The navigation bar itself now uses the
// hand-authored pixel HUD sprites defined in ./HudSprite.tsx.
import {
  Heart, Zap, Sword, Key, Package,
  Map as MapIcon,
  ChevronRight, ChevronDown,
} from 'lucide-react';
import {
  HudSprite,
  SPRITE_COIN,
  SPRITE_ESSENCE,
  SPRITE_CURSED_SHARD,
  SPRITE_VOLUME_ON,
  SPRITE_VOLUME_MUTE,
  SPRITE_INVENTORY,
  SPRITE_PLAYER,
  SPRITE_MAP,
  SPRITE_OBJECTIVES,
} from '@/components/game/HudSprite';
import React, { useState, useMemo, useEffect } from 'react';
import {
  applyElementMute,
  applyMasterGainMute,
  isAudioMuted,
  setAudioMuted,
} from '@/game/domain/audioMutePreference';
import { CONTROL_GROUPS } from './controlBindings';

interface GameUIProps {
  gameState: GameState;
  assetManager?: AssetManager | null;
  refreshToken: number;
  bossHud?: {
    name: string;
    health: number;
    maxHealth: number;
    phase: number;
  } | null;
  justPickedUpItem?: Item | null;
  justGainedCurrency?: CurrencyGain | null;
  onOpenInventory?: () => void;
  onOpenPlayer?: () => void;
  onOpenMap?: () => void;
  onOpenObjectives?: () => void;
  musicRef: React.RefObject<HTMLAudioElement | null>;
  masterGainRef?: React.RefObject<GainNode | null>;
  showControls?: boolean;
  interactionPrompt?: string | null;
  activeQuestCount?: number;
}

// --- Helpers ---

const getItemIcon = (item: Item | null | undefined, className: string, assetManager?: AssetManager | null) => {
  if (!item) return <div className={className} />;
  if (assetManager) {
    const url = assetManager.getTextureURL(item.sprite);
    if (url) {
      return <img src={url} alt={item.name} className={`${className} [image-rendering:pixelated] object-contain drop-shadow-sm`} />;
    }
  }
  if (item.sprite === 'sword') return <Sword className={className} />;
  if (item.sprite === 'potion' || item.sprite === 'red_potion') return <Heart className={className} />; // Health potion
  if (item.sprite === 'map') return <MapIcon className={className} />;
  if (item.sprite === 'key') return <Key className={className} />;
  if (item.sprite === 'flower' || item.sprite === 'tempest_grass_item') return <Zap className={className} />;
  return <Package className={className} />;
};

// --- Memoized Sub-components ---

const CombatBars = React.memo(({ health, maxHealth, stamina, maxStamina }: {
  health: number, maxHealth: number, stamina: number, maxStamina: number
}) => (
  // Bars-only treatment — the heart / shield iconography was removed in favour
  // of the bar color itself doing the categorical work (red = HP, green =
  // stamina). Reads as a cleaner, more diegetic HUD.
  <div className="flex items-center gap-5">
    <div className="flex items-center gap-2">
      <div className="w-28 h-2.5 bg-black/60 rounded-full overflow-hidden border border-[#5C3A21]">
        <div
          className="h-full bg-gradient-to-r from-red-600 to-red-400"
          style={{ width: `${(health / maxHealth) * 100}%` }}
        />
      </div>
      <span className="text-[10px] font-bold text-[#F5DEB3] tracking-wide">
        {health}/{maxHealth}
      </span>
    </div>

    <div className="flex items-center gap-2">
      <div className="w-20 h-2 bg-black/60 rounded-full overflow-hidden border border-[#5C3A21]">
        <div
          className="h-full bg-gradient-to-r from-emerald-600 to-emerald-400 transition-[width] duration-75 ease-out"
          style={{ width: `${(stamina / maxStamina) * 100}%` }}
        />
      </div>
      <span className="text-[10px] font-bold text-emerald-200 tracking-wide">
        {Math.round(stamina)}/{maxStamina}
      </span>
    </div>
  </div>
));

const BossHealthBar = React.memo(({
  name,
  health,
  maxHealth,
}: {
  name: string;
  health: number;
  maxHealth: number;
}) => {
  const ratio = Math.max(0, Math.min(1, health / Math.max(1, maxHealth)));
  return (
    <div className="fixed left-1/2 bottom-8 z-40 w-[min(72vw,46rem)] -translate-x-1/2 pointer-events-none">
      <div className="mb-1 flex items-end justify-between px-1">
        <span className="text-[13px] font-semibold tracking-[0.16em] text-[#E8D8BA] uppercase drop-shadow-[0_2px_2px_rgba(0,0,0,1)]">
          {name}
        </span>
        <span className="text-[10px] font-bold text-[#BFA06A] drop-shadow-[0_2px_2px_rgba(0,0,0,1)]">
          {Math.max(0, Math.ceil(health))}
        </span>
      </div>
      <div className="h-3 border border-[#8A6A3A] bg-[#090504]/90 shadow-[0_0_0_1px_rgba(0,0,0,0.9),0_3px_10px_rgba(0,0,0,0.65)]">
        <div
          className="h-full bg-gradient-to-r from-[#6B0F18] via-[#B8202A] to-[#E14A4A] transition-[width] duration-100 ease-out"
          style={{ width: `${ratio * 100}%` }}
        />
      </div>
    </div>
  );
});

const CurrencyCountersWithGains = React.memo(({
  gold,
  essence,
  cursedSediment,
  justGainedCurrency,
}: {
  gold: number;
  essence: number;
  cursedSediment: number;
  justGainedCurrency?: CurrencyGain | null;
}) => (
  <div className="flex items-center gap-4">
    <div className="flex items-center gap-1.5 relative min-w-[42px]">
      <HudSprite spec={SPRITE_COIN} size={16} title="Gold" className="drop-shadow" />
      <span className="text-xs font-bold text-[#F5DEB3] tracking-wide">{gold}</span>
      {justGainedCurrency?.kind === 'gold' && (
        <span className="absolute left-1/2 top-full mt-1 -translate-x-1/2 text-[10px] font-bold text-yellow-300 tracking-wide drop-shadow-[0_1px_1px_rgba(0,0,0,1)] animate-in fade-in slide-in-from-top-1">
          +{justGainedCurrency.amount}
        </span>
      )}
    </div>

    <div className="flex items-center gap-1.5 relative min-w-[42px]">
      <HudSprite spec={SPRITE_ESSENCE} size={16} title="Essence" className="drop-shadow" />
      <span className="text-xs font-bold text-violet-200 tracking-wide">{essence}</span>
      {justGainedCurrency?.kind === 'essence' && (
        <span className="absolute left-1/2 top-full mt-1 -translate-x-1/2 text-[10px] font-bold text-violet-200 tracking-wide drop-shadow-[0_1px_1px_rgba(0,0,0,1)] animate-in fade-in slide-in-from-top-1">
          +{justGainedCurrency.amount}
        </span>
      )}
    </div>

    {cursedSediment > 0 && (
      <div className="flex items-center gap-1.5 relative min-w-[42px]" title="Cursed Sediment">
        <HudSprite spec={SPRITE_CURSED_SHARD} size={16} title="Cursed Sediment" className="drop-shadow" />
        <span className="text-xs font-bold text-fuchsia-200 tracking-wide">{cursedSediment}</span>
        {justGainedCurrency?.kind === 'cursed_sediment' && (
          <span className="absolute left-1/2 top-full mt-1 -translate-x-1/2 text-[10px] font-bold text-fuchsia-200 tracking-wide drop-shadow-[0_1px_1px_rgba(0,0,0,1)] animate-in fade-in slide-in-from-top-1">
            +{justGainedCurrency.amount}
          </span>
        )}
      </div>
    )}
  </div>
));

const CurrentObjective = React.memo(({ title, onObjectiveClick }: { title: string, onObjectiveClick?: () => void }) => {
  const interactive = typeof onObjectiveClick === 'function';
  return (
    <button
      type="button"
      onClick={onObjectiveClick}
      disabled={!interactive}
      title={interactive ? 'Click to open objectives' : undefined}
      className={`flex items-center gap-2 bg-[#2D1B11]/50 px-3 py-1 rounded-full border border-[#5C3A21] transition-colors animate-pulse ${interactive ? 'cursor-pointer hover:bg-[#3D2B21]/50' : 'cursor-default'}`}
    >
      <span className="text-[#DAA520] text-xs font-bold uppercase tracking-wider">Objective:</span>
      <span className="text-[#F5DEB3] text-xs truncate max-w-[200px]">{title}</span>
    </button>
  );
});

const SelectionWheel = React.memo(({
  entries,
  activeItemId,
  assetManager,
  prevLabel,
  nextLabel,
  badgeLabel,
  badgeKey,
  fullWidthTitle = false,
}: {
  entries: Array<{ item: Item; count: number }>;
  activeItemId: string | null | undefined;
  assetManager?: AssetManager | null;
  prevLabel: string;
  nextLabel: string;
  badgeLabel: string;
  /** Keybind hint shown in parens after the label, e.g. "Z" → "(Z)" */
  badgeKey?: string;
  /** Span title across the full wheel width (weapon names need more room). */
  fullWidthTitle?: boolean;
}) => {
  if (entries.length === 0) return null;

  const hasTwoEntries = entries.length === 2;
  const activeIndex = Math.max(0, entries.findIndex(u => u.item.id === activeItemId));
  const activeEntry = entries[activeIndex] ?? entries[0];
  const hasMultipleDistinct = entries.length > 1;
  const prevEntry = hasMultipleDistinct ? entries[(activeIndex - 1 + entries.length) % entries.length] : null;
  const nextEntry = hasMultipleDistinct ? entries[(activeIndex + 1) % entries.length] : null;
  const sideCardClass = hasTwoEntries ? 'w-12 h-12' : 'w-11 h-11';
  const sideIconClass = hasTwoEntries ? 'w-7 h-7 mb-1' : 'w-6 h-6 mb-1';
  const titleClass =
    'text-[11px] text-[#F5DEB3] font-bold uppercase tracking-wider text-center drop-shadow-[0_2px_2px_rgba(0,0,0,1)] truncate';
  const activeName = activeEntry?.item?.name || 'Empty';

  return (
    <div className="w-full">
      {fullWidthTitle && (
        <span className={`${titleClass} block mb-1.5 max-w-full px-0.5`}>
          {activeName}
        </span>
      )}
      <div className="w-full flex items-end justify-between">
      <div className={`flex flex-col items-center transition-opacity ${hasMultipleDistinct ? 'opacity-80 hover:opacity-100' : 'opacity-[0.85]'}`}>
        <kbd className="bg-[#2D1B11] px-2 py-0.5 rounded border border-[#5C3A21] text-[#DAA520] text-xs font-bold leading-none mb-1.5 shadow-sm">{prevLabel}</kbd>
        {prevEntry ? (
          <div className={`${sideCardClass} bg-[#2D1B11]/70 border border-[#5C3A21] rounded-md shadow-lg flex flex-col items-center justify-center p-1 relative overflow-hidden`}>
            {getItemIcon(prevEntry.item, sideIconClass, assetManager)}
            {prevEntry.count > 1 && (
              <span className="absolute top-0 right-0.5 text-[10px] font-bold text-[#F5DEB3] drop-shadow-md">x{prevEntry.count}</span>
            )}
            <span className="text-[10px] text-[#D3D3D3] text-center w-full truncate absolute bottom-0.5 leading-none">{prevEntry.item.name.split(' ')[0]}</span>
          </div>
        ) : (
          <div className={`${sideCardClass} bg-[#2D1B11]/40 rounded-lg shadow-inner pointer-events-none`} />
        )}
      </div>

      <div className="flex flex-col items-center transform scale-100 translate-y-[-4px]">
        {!fullWidthTitle && (
          <span className={`${titleClass} mb-1.5 max-w-[170px]`}>
            {activeName}
          </span>
        )}
        <div className="w-16 h-16 bg-[#2D1B11]/80 border-[1.5px] border-[#DAA520] rounded-lg flex items-center justify-center shadow-xl relative overflow-hidden group">
          {activeEntry && getItemIcon(activeEntry.item, "w-12 h-12 transform group-hover:scale-110 transition-transform", assetManager)}
          {activeEntry && activeEntry.count > 1 && (
            <span className="absolute top-1 right-1.5 text-[10px] font-bold text-[#F5DEB3] drop-shadow-[0_1px_1px_rgba(0,0,0,1)] bg-[#1A0F0A]/60 px-1 rounded-sm border border-[#5C3A21]/50">x{activeEntry.count}</span>
          )}
        </div>
        <span className="text-[10px] text-[#DAA520] mt-1.5 uppercase tracking-widest font-semibold drop-shadow-[0_1px_2px_rgba(0,0,0,1)] flex items-baseline gap-1">
          {badgeLabel}
          {badgeKey && (
            <span className="text-[10px] text-[#DAA520]/90 normal-case tracking-normal font-normal">
              ({badgeKey})
            </span>
          )}
        </span>
      </div>

      <div className={`flex flex-col items-center transition-opacity ${hasMultipleDistinct ? 'opacity-80 hover:opacity-100' : 'opacity-[0.85]'}`}>
        <kbd className="bg-[#2D1B11] px-2 py-0.5 rounded border border-[#5C3A21] text-[#DAA520] text-xs font-bold leading-none mb-1.5 shadow-sm">{nextLabel}</kbd>
        {nextEntry ? (
          <div className={`${sideCardClass} bg-[#2D1B11]/70 border border-[#5C3A21] rounded-md shadow-lg flex flex-col items-center justify-center p-1 relative overflow-hidden`}>
            {getItemIcon(nextEntry.item, sideIconClass, assetManager)}
            {nextEntry.count > 1 && (
              <span className="absolute top-0 right-0.5 text-[10px] font-bold text-[#F5DEB3] drop-shadow-md">x{nextEntry.count}</span>
            )}
            <span className="text-[10px] text-[#D3D3D3] text-center w-full truncate absolute bottom-0.5 leading-none">{nextEntry.item.name.split(' ')[0]}</span>
          </div>
        ) : (
          <div className={`${sideCardClass} bg-[#2D1B11]/40 rounded-lg shadow-inner pointer-events-none`} />
        )}
      </div>
    </div>
    </div>
  );
});

const JustPickedUpDisplay = React.memo(({
  item,
  assetManager,
}: {
  item: Item | null;
  assetManager?: AssetManager | null;
}) => {
  if (!item) return null;

  return (
    <div className="fixed left-1/2 bottom-20 z-40 -translate-x-1/2 pointer-events-none">
      {/* No backdrop-blur / tailwind animate-in here: those promoted a full compositor layer and caused edge halos on some GPUs when this mounts after pickups. */}
      <div className="flex flex-col items-center transform transition-opacity duration-200">
        <span className="text-[11px] text-[#F5DEB3] font-bold mb-1.5 uppercase tracking-wider text-center drop-shadow-[0_2px_2px_rgba(0,0,0,1)]">
          {item.name}
        </span>
        <div className="w-16 h-16 bg-[#1A0F0A] border-[1.5px] border-[#DAA520] rounded-lg flex items-center justify-center shadow-xl relative overflow-hidden">
          {getItemIcon(item, "w-12 h-12", assetManager)}
        </div>
        <span className="text-[10px] text-[#F5DEB3] mt-2 bg-[#1A0F0A] border border-[#5C3A21] px-2.5 py-0.5 rounded-md uppercase tracking-widest shadow-lg drop-shadow-md">
          Acquired
        </span>
      </div>
    </div>
  );
});

export const GameUI = ({
  gameState,
  assetManager,
  refreshToken,
  bossHud = null,
  justPickedUpItem = null,
  justGainedCurrency = null,
  onOpenInventory,
  onOpenPlayer,
  onOpenMap,
  onOpenObjectives,
  musicRef,
  masterGainRef,
  showControls = true,
  interactionPrompt = null,
  activeQuestCount = 0,
}: GameUIProps) => {
  const [isMuted, setIsMuted] = useState(() => isAudioMuted());
  /** Compact controls help: closed by default so HUD stays minimal; click to expand rectangular panel. */
  const [controlsHelpOpen, setControlsHelpOpen] = useState(false);

  void refreshToken;

  const groupedInventory = useMemo(() => {
    const groups = new Map<string, { item: Item; count: number }>();
    gameState.inventory.forEach(item => {
      const existing = groups.get(item.id);
      if (existing) {
        existing.count += 1;
      } else {
        groups.set(item.id, { item, count: 1 });
      }
    });
    return Array.from(groups.values());
  }, [gameState.inventory]);

  const groupedConsumables = useMemo(
    () => groupedInventory.filter(({ item }) => item.type === 'consumable'),
    [groupedInventory],
  );

  const groupedWeapons = useMemo(
    () => gameState.getLoadoutWeaponIds()
      .map(id => {
        const item = gameState.inventory.find(i => i.id === id && i.type === 'equipment');
        return item ? { item, count: 1 } : null;
      })
      .filter((entry): entry is { item: Item; count: number } => entry !== null),
    [gameState.inventory, gameState.weaponLoadout, refreshToken],
  );

  const activeConsumable = gameState.inventory[gameState.activeItemIndex];
  const activeConsumableId = activeConsumable?.type === 'consumable' ? activeConsumable.id : groupedConsumables[0]?.item.id;
  const activeWeaponId = gameState.equippedWeaponId ?? groupedWeapons[0]?.item.id;

  // Belt-and-suspenders: re-apply persisted mute once HUD mounts (audio may have
  // started before gameState was ready).
  useEffect(() => {
    if (!isMuted) return;
    applyMasterGainMute(masterGainRef?.current);
    applyElementMute(musicRef.current);
  }, [isMuted, masterGainRef, musicRef]);

  const toggleMute = () => {
    const nextMuted = !isMuted;
    setIsMuted(nextMuted);
    setAudioMuted(nextMuted);
    applyMasterGainMute(masterGainRef?.current);
    applyElementMute(musicRef.current);
  };

  return (
    <>
      {/* Minimal Top Bar */}
      <div className="fixed top-0 left-0 right-0 h-12 bg-[#1A0F0A]/85 backdrop-blur-sm border-b border-[#5C3A21] z-50 px-4 pointer-events-auto shadow-md">
        <div className="relative flex h-full items-center">
          {/* Left Side: Currency */}
          <div className="flex min-w-[140px] items-center">
            <CurrencyCountersWithGains
              gold={gameState.player.gold}
              essence={gameState.player.essence}
              cursedSediment={gameState.player.cursedSediment}
              justGainedCurrency={justGainedCurrency}
            />
          </div>

          {/* Center: Combat bars + stealth badge + objective */}
          <div className="absolute left-1/2 flex -translate-x-1/2 items-center gap-6">
            <CombatBars
              health={gameState.player.health}
              maxHealth={gameState.player.maxHealth}
              stamina={gameState.player.stamina}
              maxStamina={gameState.player.maxStamina}
            />
            {gameState.player.stealthTimer > 0 && (
              <div className="flex items-center gap-1.5 bg-emerald-900/70 border border-emerald-500/60 rounded-full px-2.5 py-0.5 animate-pulse">
                <span className="text-[10px] font-bold text-emerald-300 tracking-widest uppercase">Cloaked</span>
                <span className="text-[10px] font-bold text-emerald-200">{Math.ceil(gameState.player.stealthTimer)}s</span>
              </div>
            )}
            {gameState.player.berserkerTimer > 0 && (
              <div className="flex items-center gap-1.5 bg-red-900/70 border border-red-500/60 rounded-full px-2.5 py-0.5 animate-pulse">
                <span className="text-[10px] font-bold text-red-300 tracking-widest uppercase">Berserker</span>
                <span className="text-[10px] font-bold text-red-200">{Math.ceil(gameState.player.berserkerTimer)}s</span>
              </div>
            )}
            {(() => {
              const firstActiveQuest = gameState.quests.find(q => q.active && !q.completed);
              if (!firstActiveQuest) return null;
              const activeStep = firstActiveQuest.objectives.find(o => !o.includes('\u2713')) ?? firstActiveQuest.title;
              return <CurrentObjective title={activeStep} onObjectiveClick={onOpenObjectives} />;
            })()}
          </div>

          {/* Right Side: Toggles - pushed left more to avoid fullscreen button */}
          <div className="ml-auto flex items-center gap-1 mr-8">
          <Button
            onClick={toggleMute}
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0 text-[#D3D3D3] hover:text-[#DAA520] hover:bg-[#2D1B11] border border-transparent rounded-sm transition-colors"
            title={isMuted ? 'Unmute' : 'Mute'}
          >
            <HudSprite spec={isMuted ? SPRITE_VOLUME_MUTE : SPRITE_VOLUME_ON} size={16} />
          </Button>

          <Button
            onClick={() => onOpenPlayer?.()}
            variant="ghost"
            size="sm"
            className="h-8 px-2 text-xs font-bold tracking-wider rounded-sm transition-colors text-[#D3D3D3] hover:text-[#DAA520] hover:bg-[#2D1B11] border border-transparent"
          >
            <HudSprite spec={SPRITE_PLAYER} size={16} className="mr-1" />
            PLAYER
          </Button>

          <Button
            onClick={() => onOpenInventory?.()}
            variant="ghost"
            size="sm"
            className="h-8 px-2 text-xs font-bold tracking-wider rounded-sm transition-colors text-[#D3D3D3] hover:text-[#DAA520] hover:bg-[#2D1B11] border border-transparent"
          >
            <HudSprite spec={SPRITE_INVENTORY} size={16} className="mr-1" />
            INVENTORY
          </Button>

          <Button
            onClick={() => onOpenMap?.()}
            variant="ghost"
            size="sm"
            className="h-8 px-2 text-xs font-bold tracking-wider rounded-sm transition-colors text-[#D3D3D3] hover:text-[#DAA520] hover:bg-[#2D1B11] border border-transparent"
          >
            <HudSprite spec={SPRITE_MAP} size={16} className="mr-1" />
            MAP
          </Button>

          <Button
            onClick={() => onOpenObjectives?.()}
            variant="ghost"
            size="sm"
            className="h-8 px-2 text-xs font-bold tracking-wider rounded-sm transition-colors text-[#D3D3D3] hover:text-[#DAA520] hover:bg-[#2D1B11] border border-transparent relative"
          >
            <HudSprite spec={SPRITE_OBJECTIVES} size={16} className="mr-1" />
            OBJECTIVES
            {activeQuestCount > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-600 text-white rounded-full text-[10px] font-bold flex items-center justify-center border border-[#1A0F0A]">
                {activeQuestCount}
              </span>
            )}
          </Button>
        </div>
        </div>
      </div>

      {/* Inventory and Objectives are now rendered as modals in Game.tsx */}

      {bossHud && bossHud.health > 0 && (
        <BossHealthBar
          name={bossHud.name}
          health={bossHud.health}
          maxHealth={bossHud.maxHealth}
        />
      )}

      {/* Controls help: collapsible rectangular panel (same kbd / text colors as before) */}
      {showControls && (
        <div className="fixed bottom-4 left-4 z-40 pointer-events-auto flex flex-col items-start gap-1.5">
          <button
            type="button"
            title="Show or hide control bindings"
            aria-expanded={controlsHelpOpen}
            aria-controls="game-controls-help-panel"
            onClick={() => setControlsHelpOpen(o => !o)}
            className="flex items-center gap-1.5 bg-[#1A0F0A]/80 backdrop-blur-sm border border-[#5C3A21] rounded-sm px-2 py-1 shadow-sm hover:bg-[#2D1B11]/70 transition-colors"
          >
            <kbd className="bg-[#2D1B11] px-1 rounded border border-[#5C3A21] text-[#DAA520] text-[10px] font-bold leading-none py-0.5">?</kbd>
            <span className="text-[10px] font-bold text-[#DAA520] uppercase tracking-wider">Controls</span>
            {controlsHelpOpen ? (
              <ChevronDown className="w-3.5 h-3.5 text-[#DAA520] shrink-0" aria-hidden />
            ) : (
              <ChevronRight className="w-3.5 h-3.5 text-[#DAA520] shrink-0" aria-hidden />
            )}
          </button>
          {controlsHelpOpen && (
            <div
              id="game-controls-help-panel"
              role="region"
              aria-label="Control bindings"
              className="bg-[#1A0F0A]/80 backdrop-blur-sm border border-[#5C3A21] rounded-sm p-2.5 shadow-sm w-[min(92vw,20rem)] max-h-[min(70vh,24rem)] overflow-y-auto space-y-2"
            >
              {CONTROL_GROUPS.map(group => (
                <div key={group.title}>
                  <p className="text-[10px] font-bold text-[#DAA520]/90 uppercase tracking-[0.2em] mb-1">{group.title}</p>
                  <div className="grid grid-cols-2 gap-x-3 gap-y-1">
                    {group.bindings.map(b => {
                      const action = b.keys === 'F' ? (interactionPrompt || b.action) : b.action;
                      return (
                        <p
                          key={`${group.title}-${b.keys}`}
                          className={`text-[10px] text-[#D3D3D3] ${b.wide ? 'col-span-2' : ''}`}
                        >
                          <kbd className="bg-[#2D1B11] px-1 rounded border border-[#5C3A21] text-[#DAA520] mr-0.5">{b.keys}</kbd>{' '}
                          {action}
                        </p>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="fixed bottom-4 right-4 z-30 pointer-events-auto">
        <div className="bg-[#1A0F0A]/85 backdrop-blur-md border border-[#5C3A21] rounded-lg px-3 pt-2.5 pb-2 shadow-xl flex flex-col items-center gap-3 w-[290px]">
          <SelectionWheel
            entries={groupedConsumables}
            activeItemId={activeConsumableId}
            assetManager={assetManager}
            prevLabel="Q"
            nextLabel="E"
            badgeLabel="Item"
            badgeKey="Z"
          />
          {groupedConsumables.length > 0 && groupedWeapons.length > 0 && (
            <div className="w-full border-t border-[#5C3A21]/50" />
          )}
          <SelectionWheel
            entries={groupedWeapons}
            activeItemId={activeWeaponId}
            assetManager={assetManager}
            prevLabel="←"
            nextLabel="→"
            badgeLabel="Weapon"
            badgeKey="LMB"
            fullWidthTitle
          />
        </div>
      </div>
      <JustPickedUpDisplay item={justPickedUpItem} assetManager={assetManager} />
    </>
  );
};

export default GameUI;
