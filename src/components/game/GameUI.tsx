import { GameState } from '@/lib/game/GameState';
import { AssetManager } from '@/lib/game/AssetManager';
import { Button } from '@/components/ui/button';
import { Heart, Coins, Package, ScrollText, Zap, Volume2, VolumeX, Shield, Sword, FlaskRound, Map as MapIcon, Key, Sparkles } from 'lucide-react';
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { notify } from '@/lib/game/notificationBus';

interface GameUIProps {
  gameState: GameState;
  assetManager?: AssetManager | null;
  refreshToken: number;
  triggerUIUpdate: () => void;
  musicRef: React.RefObject<HTMLAudioElement | null>;
  showControls?: boolean;
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
  if (item.sprite === 'potion') return <FlaskRound className={className} />;
  if (item.sprite === 'red_potion') return <FlaskRound className={className} />; // Fallback for red potion
  if (item.sprite === 'map') return <MapIcon className={className} />;
  if (item.sprite === 'key') return <Key className={className} />;
  if (item.sprite === 'flower') return <Zap className={className} />;
  return <Package className={className} />;
};

// --- Memoized Sub-components ---

const StatMeters = React.memo(({ health, maxHealth, stamina, maxStamina, gold, essence, estusCharges, maxEstusCharges }: { 
  health: number, maxHealth: number, stamina: number, maxStamina: number, gold: number, essence: number,
  estusCharges: number, maxEstusCharges: number
}) => (
  <div className="flex items-center gap-4">
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
    </div>

    {/* Estus Flask */}
    <div className="flex items-center gap-1">
      <FlaskRound className="w-3.5 h-3.5 text-amber-400 drop-shadow" />
      <span className="text-xs font-bold text-amber-200">{estusCharges}/{maxEstusCharges}</span>
    </div>

    <div className="flex items-center gap-1.5">
      <Coins className="w-4 h-4 text-yellow-400 drop-shadow" />
      <span className="text-xs font-bold text-[#F5DEB3] tracking-wide">{gold}</span>
    </div>

    <div className="flex items-center gap-1.5">
      <Sparkles className="w-4 h-4 text-violet-300 drop-shadow" />
      <span className="text-xs font-bold text-violet-200 tracking-wide">{essence}</span>
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

const ActiveItemWheel = React.memo(({ 
  inventory, activeItemIndex, groupedInventory, assetManager 
}: { 
  inventory: any[], activeItemIndex: number, groupedInventory: any[], assetManager?: AssetManager | null 
}) => {
  if (inventory.length === 0) return null;
  const activeIdx = activeItemIndex || 0;
  
  const uniqueItems = groupedInventory;
  const activeItemRaw = inventory[activeIdx];
  const uniqueActiveIdx = Math.max(0, uniqueItems.findIndex(u => u.item.id === activeItemRaw?.id));
  
  const activeEntry = uniqueItems[uniqueActiveIdx];
  const hasMultipleDistinct = uniqueItems.length > 1;
  const prevEntry = hasMultipleDistinct ? uniqueItems[(uniqueActiveIdx - 1 + uniqueItems.length) % uniqueItems.length] : null;
  const nextEntry = uniqueItems.length > 2 ? uniqueItems[(uniqueActiveIdx + 1) % uniqueItems.length] : null;

  return (
    <div className="fixed bottom-4 right-4 z-30 pointer-events-auto flex items-end gap-3 transition-all duration-300">
      <div className={`flex flex-col items-center transition-opacity ${hasMultipleDistinct ? 'opacity-80 hover:opacity-100' : 'opacity-[0.85]'}`}>
        <span className="text-[10px] text-[#DAA520]/60 font-bold mb-1 font-mono drop-shadow-[0_1.5px_1.5px_rgba(0,0,0,1)]">Q</span>
        {prevEntry ? (
          <div className="w-11 h-11 bg-[#1A0F0A]/90 backdrop-blur-md border border-[#5C3A21] rounded-md shadow-lg flex flex-col items-center justify-center p-1 relative overflow-hidden">
            {getItemIcon(prevEntry.item, "w-6 h-6 mb-1", assetManager)}
            {prevEntry.count > 1 && (
              <span className="absolute top-0 right-0.5 text-[8px] font-bold text-[#F5DEB3] drop-shadow-md">x{prevEntry.count}</span>
            )}
            <span className="text-[7px] text-[#D3D3D3] text-center w-full truncate absolute bottom-0.5 leading-none">{prevEntry.item.name.split(' ')[0]}</span>
          </div>
        ) : (
          <div className="w-11 h-11 bg-[#2D1B11]/40 rounded-lg shadow-inner pointer-events-none" />
        )}
      </div>

      <div className="flex flex-col items-center transform scale-100 translate-y-[-4px]">
        <span className="text-[11px] text-[#F5DEB3] font-bold mb-1.5 uppercase tracking-wider text-center drop-shadow-[0_2px_2px_rgba(0,0,0,1)]">{activeEntry?.item?.name || 'Empty'}</span>
        <div className="w-16 h-16 bg-[#1A0F0A]/95 backdrop-blur-md border-[1.5px] border-[#DAA520] rounded-lg flex items-center justify-center shadow-xl relative overflow-hidden group">
          {activeEntry && getItemIcon(activeEntry.item, "w-12 h-12 transform group-hover:scale-110 transition-transform", assetManager)}
          {activeEntry && activeEntry.count > 1 && (
            <span className="absolute top-1 right-1.5 text-[10px] font-bold text-[#F5DEB3] drop-shadow-[0_1px_1px_rgba(0,0,0,1)] bg-[#1A0F0A]/60 px-1 rounded-sm border border-[#5C3A21]/50">x{activeEntry.count}</span>
          )}
        </div>
        <span className="text-[9px] text-[#F5DEB3] mt-2 font-mono bg-[#1A0F0A]/95 backdrop-blur border border-[#5C3A21] px-2.5 py-0.5 rounded-md uppercase tracking-widest shadow-lg drop-shadow-md">Space</span>
      </div>

      <div className={`flex flex-col items-center transition-opacity ${hasMultipleDistinct ? 'opacity-80 hover:opacity-100' : 'opacity-[0.85]'}`}>
        <span className="text-[10px] text-[#DAA520]/60 font-bold mb-1 font-mono drop-shadow-[0_1.5px_1.5px_rgba(0,0,0,1)]">E</span>
        {nextEntry ? (
          <div className="w-11 h-11 bg-[#1A0F0A]/90 backdrop-blur-md border border-[#5C3A21] rounded-md shadow-lg flex flex-col items-center justify-center p-1 relative overflow-hidden">
            {getItemIcon(nextEntry.item, "w-6 h-6 mb-1", assetManager)}
            {nextEntry.count > 1 && (
              <span className="absolute top-0 right-0.5 text-[8px] font-bold text-[#F5DEB3] drop-shadow-md">x{nextEntry.count}</span>
            )}
            <span className="text-[7px] text-[#D3D3D3] text-center w-full truncate absolute bottom-0.5 leading-none">{nextEntry.item.name.split(' ')[0]}</span>
          </div>
        ) : (
          <div className="w-11 h-11 bg-[#2D1B11]/40 rounded-lg shadow-inner pointer-events-none" />
        )}
      </div>
    </div>
  );
});

export const GameUI = ({ gameState, assetManager, refreshToken, triggerUIUpdate, musicRef, showControls = true }: GameUIProps) => {
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

  const toggleMute = () => {
    if (musicRef.current) {
      musicRef.current.muted = !musicRef.current.muted;
      setIsMuted(musicRef.current.muted);
    }
  };

  return (
    <>
      {/* Minimal Top Bar */}
      <div className="fixed top-0 left-0 right-0 h-12 bg-[#1A0F0A]/85 backdrop-blur-sm border-b border-[#5C3A21] z-50 flex justify-between items-center px-4 pointer-events-auto shadow-md">

        {/* Left Side: Health, Stamina & Gold */}
        <StatMeters 
          health={gameState.player.health} 
          maxHealth={gameState.player.maxHealth} 
          stamina={gameState.player.stamina} 
          maxStamina={gameState.player.maxStamina} 
          gold={gameState.player.gold} 
          essence={gameState.player.essence}
          estusCharges={gameState.player.estusCharges}
          maxEstusCharges={gameState.player.maxEstusCharges}
        />

        {/* Center: Current Objective */}
        <div className="flex-1 flex justify-center">
          {activeQuests.length > 0 && (
            <CurrentObjective title={activeQuests[0].title} />
          )}
        </div>

        {/* Right Side: Toggles - pushed left more to avoid fullscreen button */}
        <div className="flex items-center gap-1 mr-8">
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
              setShowInventory(!showInventory);
              if (!showInventory) setShowQuests(false);
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
              setShowQuests(!showQuests);
              if (!showQuests) setShowInventory(false);
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

      {/* Inventory Dropdown Menu */}
      {showInventory && (
        <div className="fixed top-12 right-8 w-72 bg-[#1A0F0A]/95 backdrop-blur-md border border-[#5C3A21] border-t-0 rounded-b-md shadow-xl z-40 flex flex-col pointer-events-auto">
          <div className="p-3 overflow-y-auto max-h-[400px]">
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
                      if (item.type === 'consumable' && item.id === 'health_potion') {
                        if (gameState.player.health >= gameState.player.maxHealth) {
                          notify('Already at full health!', { id: 'full-health', duration: 1500 });
                          return;
                        }
                        gameState.player.health = Math.min(gameState.player.maxHealth, gameState.player.health + 50);
                        gameState.removeItem(item.id);
                        notify('Used Health Potion', { id: 'used-potion', type: 'success', description: 'Restored 50 health.', duration: 2000 });
                        triggerUIUpdate();
                        setShowInventory(true);
                      }
                    }}
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-[#1A0F0A]/60 rounded border border-[#5C3A21]/50 flex items-center justify-center shadow-inner relative">
                          {getItemIcon(item, "w-8 h-8", assetManager)}
                          {count > 1 && (
                            <div className="absolute -top-1 -right-1 bg-[#1A0F0A] border border-[#DAA520] rounded-full min-w-[16px] h-4 px-1 flex items-center justify-center border border-[#DAA520]/50 shadow-sm z-10">
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
            <p className="text-[10px] text-[#D3D3D3]"><kbd className="bg-[#2D1B11] px-1 rounded border border-[#5C3A21] text-[#DAA520] mr-0.5">SPACE</kbd> Dodge / Estus</p>
            <p className="text-[10px] text-[#D3D3D3]"><kbd className="bg-[#2D1B11] px-1 rounded border border-[#5C3A21] text-[#DAA520] mr-0.5">CTRL/RMB</kbd> Block</p>
            <p className="text-[10px] text-[#D3D3D3]"><kbd className="bg-[#2D1B11] px-1 rounded border border-[#5C3A21] text-[#DAA520] mr-0.5">SHIFT</kbd> Sprint</p>
            <p className="text-[10px] text-[#D3D3D3]"><kbd className="bg-[#2D1B11] px-1 rounded border border-[#5C3A21] text-[#DAA520] mr-0.5">F</kbd> Interact</p>
            <p className="text-[10px] text-[#C9A0FF]">Portals — stand nearby; warp charges automatically</p>
            <p className="text-[10px] text-[#D3D3D3]"><kbd className="bg-[#2D1B11] px-1 rounded border border-[#5C3A21] text-[#DAA520] mr-0.5">Q/E</kbd> Item</p>
            <p className="text-[10px] text-[#D3D3D3]"><kbd className="bg-[#2D1B11] px-1 rounded border border-[#5C3A21] text-[#DAA520] mr-0.5">M</kbd> Map</p>
            <p className="text-[10px] text-[#D3D3D3]"><kbd className="bg-[#2D1B11] px-1 rounded border border-[#5C3A21] text-[#DAA520] mr-0.5">ESC</kbd> Pause</p>
          </div>
        </div>
      )}

      {/* Active Item Wheel */}
      <ActiveItemWheel 
        inventory={gameState.inventory} 
        activeItemIndex={gameState.activeItemIndex} 
        groupedInventory={groupedInventory} 
        assetManager={assetManager} 
      />
    </>
  );
};

export default GameUI;
