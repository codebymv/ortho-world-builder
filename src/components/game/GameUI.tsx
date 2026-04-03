import { GameState, type CurrencyGain } from '@/lib/game/GameState';
import { AssetManager } from '@/lib/game/AssetManager';
import { Button } from '@/components/ui/button';
import { Heart, Coins, Package, ScrollText, Zap, Volume2, VolumeX, Shield, Sword, Map as MapIcon, Key, Sparkles } from 'lucide-react';
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { notify } from '@/lib/game/notificationBus';

interface GameUIProps {
  gameState: GameState;
  assetManager?: AssetManager | null;
  refreshToken: number;
  triggerUIUpdate: () => void;
  justPickedUpItem?: any | null;
  justGainedCurrency?: CurrencyGain | null;
  playPotionDrink?: () => void;
  playGrassChew?: () => void;
  playMenuOpen?: () => void;
  playMenuClose?: () => void;
  musicRef: React.RefObject<HTMLAudioElement | null>;
  showControls?: boolean;
  interactionPrompt?: string | null;
}

// --- Helpers ---

const getItemIcon = (item: any, className: string, assetManager?: AssetManager | null) => {
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
  <div className="flex items-center gap-5">
    {/* Health */}
    <div className="flex items-center gap-2">
      <Heart className="w-4 h-4 text-red-500 drop-shadow" />
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

    {/* Stamina */}
    <div className="flex items-center gap-2">
      <Shield className="w-3.5 h-3.5 text-emerald-400 drop-shadow" />
      <div className="w-20 h-2 bg-black/60 rounded-full overflow-hidden border border-[#5C3A21]">
        <div
          className="h-full bg-gradient-to-r from-emerald-600 to-emerald-400 transition-[width] duration-75 ease-out"
          style={{ width: `${(stamina / maxStamina) * 100}%` }}
        />
      </div>
      <span className="text-[10px] font-bold text-emerald-300/70 tracking-wide">
        {Math.round(stamina)}/{maxStamina}
      </span>
    </div>
  </div>
));

const CurrencyCountersWithGains = React.memo(({
  gold,
  essence,
  justGainedCurrency,
}: {
  gold: number;
  essence: number;
  justGainedCurrency?: CurrencyGain | null;
}) => (
  <div className="flex items-center gap-4">
    <div className="flex items-center gap-1.5 relative min-w-[42px]">
      <Coins className="w-4 h-4 text-yellow-400 drop-shadow" />
      <span className="text-xs font-bold text-[#F5DEB3] tracking-wide">{gold}</span>
      {justGainedCurrency?.kind === 'gold' && (
        <span className="absolute left-1/2 top-full mt-1 -translate-x-1/2 text-[10px] font-bold text-yellow-300 tracking-wide drop-shadow-[0_1px_1px_rgba(0,0,0,1)] animate-in fade-in slide-in-from-top-1">
          +{justGainedCurrency.amount}
        </span>
      )}
    </div>

    <div className="flex items-center gap-1.5 relative min-w-[42px]">
      <Sparkles className="w-4 h-4 text-violet-300 drop-shadow" />
      <span className="text-xs font-bold text-violet-200 tracking-wide">{essence}</span>
      {justGainedCurrency?.kind === 'essence' && (
        <span className="absolute left-1/2 top-full mt-1 -translate-x-1/2 text-[10px] font-bold text-violet-200 tracking-wide drop-shadow-[0_1px_1px_rgba(0,0,0,1)] animate-in fade-in slide-in-from-top-1">
          +{justGainedCurrency.amount}
        </span>
      )}
    </div>
  </div>
));

const CurrentObjective = React.memo(({ title, onObjectiveClick }: { title: string, onObjectiveClick?: () => void }) => (
  <div 
    className="flex items-center gap-2 bg-[#2D1B11]/50 px-3 py-1 rounded-full border border-[#5C3A21] cursor-pointer hover:bg-[#3D2B21]/50 transition-colors animate-pulse"
    onClick={onObjectiveClick}
    title="Click to view on minimap"
  >
    <span className="text-[#DAA520] text-xs font-bold uppercase tracking-wider">Objective:</span>
    <span className="text-[#F5DEB3] text-xs truncate max-w-[200px]">{title}</span>
  </div>
));

const SelectionWheel = React.memo(({
  entries,
  activeItemId,
  assetManager,
  prevLabel,
  nextLabel,
  badgeLabel,
}: {
  entries: Array<{ item: any; count: number }>;
  activeItemId: string | null | undefined;
  assetManager?: AssetManager | null;
  prevLabel: string;
  nextLabel: string;
  badgeLabel: string;
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

  return (
    <div className={`flex items-end transition-all duration-300 ${hasTwoEntries ? 'gap-2' : 'gap-3'}`}>
      <div className={`flex flex-col items-center transition-opacity ${hasMultipleDistinct ? 'opacity-80 hover:opacity-100' : 'opacity-[0.85]'}`}>
        <span className="text-[10px] text-[#DAA520]/60 font-bold mb-1 font-mono drop-shadow-[0_1.5px_1.5px_rgba(0,0,0,1)]">{prevLabel}</span>
        {prevEntry ? (
          <div className={`${sideCardClass} bg-[#1A0F0A]/90 backdrop-blur-md border border-[#5C3A21] rounded-md shadow-lg flex flex-col items-center justify-center p-1 relative overflow-hidden`}>
            {getItemIcon(prevEntry.item, sideIconClass, assetManager)}
            {prevEntry.count > 1 && (
              <span className="absolute top-0 right-0.5 text-[8px] font-bold text-[#F5DEB3] drop-shadow-md">x{prevEntry.count}</span>
            )}
            <span className="text-[7px] text-[#D3D3D3] text-center w-full truncate absolute bottom-0.5 leading-none">{prevEntry.item.name.split(' ')[0]}</span>
          </div>
        ) : (
          <div className={`${sideCardClass} bg-[#2D1B11]/40 rounded-lg shadow-inner pointer-events-none`} />
        )}
      </div>

      <div className="flex flex-col items-center transform scale-100 translate-y-[-4px]">
        <span className="text-[11px] text-[#F5DEB3] font-bold mb-1.5 uppercase tracking-wider text-center drop-shadow-[0_2px_2px_rgba(0,0,0,1)]">
          {activeEntry?.item?.name || 'Empty'}
        </span>
        <div className="w-16 h-16 bg-[#1A0F0A]/95 backdrop-blur-md border-[1.5px] border-[#DAA520] rounded-lg flex items-center justify-center shadow-xl relative overflow-hidden group">
          {activeEntry && getItemIcon(activeEntry.item, "w-12 h-12 transform group-hover:scale-110 transition-transform", assetManager)}
          {activeEntry && activeEntry.count > 1 && (
            <span className="absolute top-1 right-1.5 text-[10px] font-bold text-[#F5DEB3] drop-shadow-[0_1px_1px_rgba(0,0,0,1)] bg-[#1A0F0A]/60 px-1 rounded-sm border border-[#5C3A21]/50">x{activeEntry.count}</span>
          )}
        </div>
        <span className="text-[9px] text-[#F5DEB3] mt-2 font-mono bg-[#1A0F0A]/95 backdrop-blur border border-[#5C3A21] px-2.5 py-0.5 rounded-md uppercase tracking-widest shadow-lg drop-shadow-md">
          {badgeLabel}
        </span>
      </div>

      <div className={`flex flex-col items-center transition-opacity ${hasMultipleDistinct ? 'opacity-80 hover:opacity-100' : 'opacity-[0.85]'}`}>
        <span className="text-[10px] text-[#DAA520]/60 font-bold mb-1 font-mono drop-shadow-[0_1.5px_1.5px_rgba(0,0,0,1)]">{nextLabel}</span>
        {nextEntry ? (
          <div className={`${sideCardClass} bg-[#1A0F0A]/90 backdrop-blur-md border border-[#5C3A21] rounded-md shadow-lg flex flex-col items-center justify-center p-1 relative overflow-hidden`}>
            {getItemIcon(nextEntry.item, sideIconClass, assetManager)}
            {nextEntry.count > 1 && (
              <span className="absolute top-0 right-0.5 text-[8px] font-bold text-[#F5DEB3] drop-shadow-md">x{nextEntry.count}</span>
            )}
            <span className="text-[7px] text-[#D3D3D3] text-center w-full truncate absolute bottom-0.5 leading-none">{nextEntry.item.name.split(' ')[0]}</span>
          </div>
        ) : (
          <div className={`${sideCardClass} bg-[#2D1B11]/40 rounded-lg shadow-inner pointer-events-none`} />
        )}
      </div>
    </div>
  );
});

const JustPickedUpDisplay = React.memo(({
  item,
  assetManager,
}: {
  item: any | null;
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
        <span className="text-[9px] text-[#F5DEB3] mt-2 font-mono bg-[#1A0F0A] border border-[#5C3A21] px-2.5 py-0.5 rounded-md uppercase tracking-widest shadow-lg drop-shadow-md">
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
  triggerUIUpdate,
  justPickedUpItem = null,
  justGainedCurrency = null,
  playPotionDrink,
  playGrassChew,
  playMenuOpen,
  playMenuClose,
  musicRef,
  showControls = true,
  interactionPrompt = null,
}: GameUIProps) => {
  const [showInventory, setShowInventory] = useState(false);
  const [showQuests, setShowQuests] = useState(false);
  const [isMuted, setIsMuted] = useState(false);

  const activeQuests = gameState.quests.filter(q => q.active && !q.completed);
  void refreshToken;

  const groupedInventory = useMemo(() => {
    const groups = new Map<string, { item: any; count: number }>();
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
    () => groupedInventory.filter(({ item }) => item.type === 'equipment'),
    [groupedInventory],
  );

  const activeConsumable = gameState.inventory[gameState.activeItemIndex];
  const activeConsumableId = activeConsumable?.type === 'consumable' ? activeConsumable.id : groupedConsumables[0]?.item.id;
  const activeWeaponId = gameState.equippedWeaponId ?? groupedWeapons[0]?.item.id;

  const toggleMute = () => {
    if (musicRef.current) {
      musicRef.current.muted = !musicRef.current.muted;
      setIsMuted(musicRef.current.muted);
    }
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
              justGainedCurrency={justGainedCurrency}
            />
          </div>

          {/* Center: Combat bars + objective */}
          <div className="absolute left-1/2 flex -translate-x-1/2 items-center gap-6">
            <CombatBars
              health={gameState.player.health}
              maxHealth={gameState.player.maxHealth}
              stamina={gameState.player.stamina}
              maxStamina={gameState.player.maxStamina}
            />
            {activeQuests.length > 0 && (
              <CurrentObjective title={activeQuests[0].title} />
            )}
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
            {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
          </Button>

          <Button
            onClick={() => {
              const nextShowInventory = !showInventory;
              if (nextShowInventory) {
                playMenuOpen?.();
              } else {
                playMenuClose?.();
              }
              setShowInventory(nextShowInventory);
              if (nextShowInventory) setShowQuests(false);
            }}
            variant="ghost"
            size="sm"
            className={`h-8 px-2 text-xs font-bold tracking-wider rounded-sm transition-colors ${
              showInventory
                ? 'bg-[#3D2B21] text-[#DAA520] border border-[#DAA520]'
                : 'text-[#D3D3D3] hover:text-[#DAA520] hover:bg-[#2D1B11] border border-transparent'
            }`}
          >
            <Package className="w-4 h-4 mr-1" />
            INVENTORY
          </Button>

          <Button
            onClick={() => {
              const nextShowQuests = !showQuests;
              if (nextShowQuests) {
                playMenuOpen?.();
              } else {
                playMenuClose?.();
              }
              setShowQuests(nextShowQuests);
              if (nextShowQuests) setShowInventory(false);
            }}
            variant="ghost"
            size="sm"
            className={`h-8 px-2 text-xs font-bold tracking-wider rounded-sm transition-colors relative ${
              showQuests
                ? 'bg-[#3D2B21] text-[#DAA520] border border-[#DAA520]'
                : 'text-[#D3D3D3] hover:text-[#DAA520] hover:bg-[#2D1B11] border border-transparent'
            }`}
          >
            <ScrollText className="w-4 h-4 mr-1" />
            QUESTS
            {activeQuests.length > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-600 text-white rounded-full text-[10px] font-bold flex items-center justify-center border border-[#1A0F0A]">
                {activeQuests.length}
              </span>
            )}
          </Button>
        </div>
        </div>
      </div>

      {/* Inventory Dropdown Menu */}
      {showInventory && (
        <div className="fixed top-12 right-8 w-[420px] bg-[#1A0F0A]/95 backdrop-blur-md border border-[#5C3A21] border-t-0 rounded-b-md shadow-xl z-40 flex flex-col pointer-events-auto">
          <div className="p-3 overflow-y-auto max-h-[480px]">
            {(() => {
              const eqId = gameState.equippedWeaponId;
              const weapon =
                (eqId ? gameState.inventory.find(i => i.id === eqId) : undefined) ??
                gameState.inventory.find(i => i.type === 'equipment');
              if (!weapon?.stats) return null;
              return (
                <div className="text-[10px] text-[#DAA520] border-b border-[#5C3A21] pb-2 mb-2 leading-relaxed">
                  <span className="uppercase tracking-wider font-bold">Equipped weapon</span>
                  <div className="text-[#F5DEB3] font-semibold mt-0.5">{weapon.name}</div>
                  <div className="text-[#B0B0B0] mt-0.5">
                    Attack {weapon.stats.damage}
                    {weapon.stats.range != null ? ` · Range ${weapon.stats.range.toFixed(2)}` : ''}
                  </div>
                </div>
              );
            })()}
            {gameState.inventory.length === 0 ? (
              <p className="text-[#A0522D] text-center py-6 text-sm font-semibold">Your pack is empty</p>
            ) : (
              <div className="space-y-2">
                {groupedInventory.map(({ item, count }, idx) => (
                  <div
                    key={`${item.id}_${idx}`}
                    className={`p-2 bg-[#2D1B11]/80 border border-[#5C3A21] rounded-sm transition-colors ${
                      item.type === 'consumable' ? 'hover:border-[#DAA520] cursor-pointer' : 'hover:border-[#5C3A21]/70'
                    }`}
                    onClick={() => {
                      if (item.type === 'consumable' && typeof item.healAmount === 'number' && item.healAmount > 0) {
                        if (gameState.player.health >= gameState.player.maxHealth) {
                          notify('Already at full health!', { id: 'full-health', duration: 1500 });
                          return;
                        }
                        if (item.id === 'health_potion') {
                          playPotionDrink?.();
                        } else if (item.id === 'tempest_grass') {
                          playGrassChew?.();
                        }
                        gameState.player.health = Math.min(gameState.player.maxHealth, gameState.player.health + item.healAmount);
                        gameState.removeItem(item.id);
                        notify(`Used ${item.name}`, {
                          id: `used-${item.id}`,
                          type: 'success',
                          description: `Restored ${item.healAmount} health.`,
                          duration: 2000,
                        });
                        triggerUIUpdate();
                        setShowInventory(true);
                      }
                    }}
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex items-center gap-3">
                        <div className="w-16 h-16 flex-shrink-0 bg-[#1A0F0A]/60 rounded border border-[#5C3A21]/50 flex items-center justify-center shadow-inner relative overflow-hidden">
                          {getItemIcon(item, "w-12 h-12 [image-rendering:pixelated] object-contain", assetManager)}
                          {count > 1 && (
                            <div className="absolute -top-1 -right-1 bg-[#1A0F0A] border border-[#DAA520]/50 rounded-full min-w-[16px] h-4 px-1 flex items-center justify-center shadow-sm z-10">
                              <span className="text-[8px] font-bold text-[#DAA520]">x{count}</span>
                            </div>
                          )}
                        </div>
                        <div>
                          <h4 className="font-bold text-[#F5DEB3] text-sm leading-tight">{item.name}</h4>
                          <p className="text-xs text-[#D3D3D3] mt-0.5 leading-tight opacity-80">{item.description}</p>
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        <span className="text-[9px] text-[#DAA520] uppercase bg-[#1A0F0A]/80 px-1.5 py-0.5 rounded-sm border border-[#5C3A21]">{item.type}</span>
                        {item.type === 'consumable' && (
                          <span className="text-[8px] text-[#DAA520] uppercase tracking-wider bg-[#2D1B11] px-1 rounded-sm border border-[#DAA520]/30 animate-pulse">Use</span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Quest Dropdown Menu */}
      {showQuests && (
        <div className="fixed top-12 right-4 w-80 bg-[#1A0F0A]/95 backdrop-blur-md border border-[#5C3A21] border-t-0 rounded-b-md shadow-xl z-40 flex flex-col pointer-events-auto">
          <div className="p-3 overflow-y-auto max-h-[400px]">
            {gameState.quests.length === 0 ? (
              <p className="text-[#A0522D] text-center py-6 text-sm font-semibold">Your journal is empty</p>
            ) : (
              <div className="space-y-3">
                {gameState.quests.map((quest) => (
                  <div
                    key={quest.id}
                    className={`p-3 rounded-sm border shadow-inner ${
                      quest.completed
                        ? 'bg-[#1e2e1e]/60 border-[#2e5e2e]'
                        : quest.active
                        ? 'bg-[#2D1B11]/80 border-[#DAA520]/50'
                        : 'bg-[#1A0F0A] border-[#5C3A21]'
                    }`}
                  >
                    <div className="flex justify-between items-start mb-1.5">
                      <h4 className={`font-bold text-sm ${quest.completed ? 'text-[#8FBC8F]' : 'text-[#F5DEB3]'}`}>{quest.title}</h4>
                      {quest.completed && (
                        <span className="text-[9px] uppercase font-bold text-[#8FBC8F] border border-[#2e5e2e] px-1.5 py-0.5 rounded-sm">
                          Completed
                        </span>
                      )}
                      {quest.active && !quest.completed && (
                        <span className="text-[9px] uppercase font-bold text-[#DAA520] border border-[#DAA520]/50 px-1.5 py-0.5 rounded-sm">
                          Active
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-[#D3D3D3] mb-3 leading-relaxed opacity-80">{quest.description}</p>
                    <div className="space-y-1.5 bg-[#1A0F0A]/50 p-2 rounded-sm border border-[#5C3A21]/30">
                      <p className="text-[10px] font-bold text-[#DAA520] uppercase tracking-wider">Objectives:</p>
                      {quest.objectives.map((obj, i) => (
                        <p key={i} className="text-xs text-[#F5DEB3] ml-1 flex gap-1.5 opacity-90">
                          <span className="text-[#DAA520]">{quest.completed ? '✓' : '▶'}</span> {obj}
                        </p>
                      ))}
                    </div>
                    {quest.reward && (
                      <div className="mt-2 pt-2 border-t border-[#5C3A21]/50 flex items-center gap-2">
                        <p className="text-[10px] font-bold text-[#DAA520] uppercase">Reward:</p>
                        {quest.reward.gold && (
                          <p className="text-xs text-[#F5DEB3] font-bold flex items-center gap-1">
                            <Coins className="w-3 h-3 text-yellow-400" /> {quest.reward.gold}
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Controls Help (auto-hide) */}
      {showControls && (
        <div className="fixed bottom-4 left-4 bg-[#1A0F0A]/80 backdrop-blur-sm border border-[#5C3A21] rounded-sm p-2 z-40 shadow-sm pointer-events-auto transition-opacity duration-1000">
          <div className="flex flex-wrap gap-3 items-center">
            <p className="text-[10px] text-[#D3D3D3]"><kbd className="bg-[#2D1B11] px-1 rounded border border-[#5C3A21] text-[#DAA520] mr-0.5">WASD</kbd> Move</p>
            <p className="text-[10px] text-[#D3D3D3]"><kbd className="bg-[#2D1B11] px-1 rounded border border-[#5C3A21] text-[#DAA520] mr-0.5">LMB</kbd> Attack</p>
            <p className="text-[10px] text-[#D3D3D3]"><kbd className="bg-[#2D1B11] px-1 rounded border border-[#5C3A21] text-[#DAA520] mr-0.5">HOLD LMB</kbd> Charge</p>
            <p className="text-[10px] text-[#D3D3D3]"><kbd className="bg-[#2D1B11] px-1 rounded border border-[#5C3A21] text-[#DAA520] mr-0.5">SPACE</kbd> Dodge Roll</p>
            <p className="text-[10px] text-[#D3D3D3]"><kbd className="bg-[#2D1B11] px-1 rounded border border-[#5C3A21] text-[#DAA520] mr-0.5">CTRL/RMB</kbd> Block</p>
            <p className="text-[10px] text-[#D3D3D3]"><kbd className="bg-[#2D1B11] px-1 rounded border border-[#5C3A21] text-[#DAA520] mr-0.5">SHIFT</kbd> Sprint</p>
            <p className="text-[10px] text-[#D3D3D3]">
              <kbd className="bg-[#2D1B11] px-1 rounded border border-[#5C3A21] text-[#DAA520] mr-0.5">F</kbd>
              {interactionPrompt || 'Interact'}
            </p>
            <p className="text-[10px] text-[#C9A0FF]">Portals — stand nearby; warp charges automatically</p>
            <p className="text-[10px] text-[#D3D3D3]"><kbd className="bg-[#2D1B11] px-1 rounded border border-[#5C3A21] text-[#DAA520] mr-0.5">Q/E</kbd> Item</p>
            <p className="text-[10px] text-[#D3D3D3]"><kbd className="bg-[#2D1B11] px-1 rounded border border-[#5C3A21] text-[#DAA520] mr-0.5">←/→</kbd> Weapon</p>
            <p className="text-[10px] text-[#D3D3D3]"><kbd className="bg-[#2D1B11] px-1 rounded border border-[#5C3A21] text-[#DAA520] mr-0.5">Z</kbd> Use Item</p>
            <p className="text-[10px] text-[#D3D3D3]"><kbd className="bg-[#2D1B11] px-1 rounded border border-[#5C3A21] text-[#DAA520] mr-0.5">M</kbd> Map</p>
            <p className="text-[10px] text-[#D3D3D3]"><kbd className="bg-[#2D1B11] px-1 rounded border border-[#5C3A21] text-[#DAA520] mr-0.5">ESC</kbd> Pause</p>
          </div>
        </div>
      )}

      <div className="fixed bottom-4 right-4 z-30 pointer-events-auto flex flex-col items-end gap-5">
        <SelectionWheel
          entries={groupedConsumables}
          activeItemId={activeConsumableId}
          assetManager={assetManager}
          prevLabel="Q"
          nextLabel="E"
          badgeLabel="Item"
        />
        <SelectionWheel
          entries={groupedWeapons}
          activeItemId={activeWeaponId}
          assetManager={assetManager}
          prevLabel="←"
          nextLabel="→"
          badgeLabel="Weapon"
        />
      </div>
      <JustPickedUpDisplay item={justPickedUpItem} assetManager={assetManager} />
    </>
  );
};

export default GameUI;
