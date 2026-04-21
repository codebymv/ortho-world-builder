import React, { memo, useMemo, useState } from 'react';
import { Heart, Coins, Package, Sword, Zap, Key, Map as MapIcon, Sparkles, Check } from 'lucide-react';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import type { GameState, Item } from '@/lib/game/GameState';
import type { AssetManager } from '@/lib/game/AssetManager';
import { notify } from '@/lib/game/notificationBus';

interface InventoryModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  gameState: GameState;
  assetManager: AssetManager | null;
  triggerUIUpdate: () => void;
  playPotionDrink?: () => void;
  playGrassChew?: () => void;
}

type TabId = 'weapons' | 'consumables' | 'key_items';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const getItemIcon = (item: Item, className: string, assetManager?: AssetManager | null) => {
  if (!item) return <div className={className} />;
  if (assetManager) {
    const url = assetManager.getTextureURL(item.sprite);
    if (url) {
      return <img src={url} alt={item.name} className={`${className} [image-rendering:pixelated] object-contain drop-shadow-sm`} />;
    }
  }
  if (item.sprite === 'sword') return <Sword className={className} />;
  if (item.sprite === 'potion' || item.sprite === 'red_potion') return <Heart className={className} />;
  if (item.sprite === 'map') return <MapIcon className={className} />;
  if (item.sprite === 'key') return <Key className={className} />;
  if (item.sprite === 'flower' || item.sprite === 'tempest_grass_item') return <Zap className={className} />;
  return <Package className={className} />;
};

const TAB_CONFIG: { id: TabId; label: string; icon: React.ReactNode }[] = [
  { id: 'weapons', label: 'Weapons', icon: <Sword className="w-3.5 h-3.5" /> },
  { id: 'consumables', label: 'Consumables', icon: <Heart className="w-3.5 h-3.5" /> },
  { id: 'key_items', label: 'Key Items', icon: <Key className="w-3.5 h-3.5" /> },
];

// ─── Sub-components ───────────────────────────────────────────────────────────

const WeaponCard = memo(({
  weapon,
  isEquipped,
  assetManager,
  onEquip,
}: {
  weapon: Item;
  isEquipped: boolean;
  assetManager: AssetManager | null;
  onEquip: (id: string) => void;
}) => (
  <div
    className={cn(
      'flex items-center gap-3 p-3 border rounded-sm transition-all',
      isEquipped
        ? 'border-[#DAA520]/50 bg-[#2D1B11]/70'
        : 'border-[#5C3A21]/50 bg-[#2D1B11]/30 hover:border-[#5C3A21] hover:bg-[#2D1B11]/50',
    )}
  >
    <div className="w-14 h-14 flex-shrink-0 bg-[#1A0F0A]/60 rounded border border-[#5C3A21]/50 flex items-center justify-center shadow-inner overflow-hidden">
      {getItemIcon(weapon, 'w-10 h-10', assetManager)}
    </div>
    <div className="flex-1 min-w-0">
      <div className="flex items-center gap-2 mb-0.5">
        <h4 className="font-bold text-[#F5DEB3] text-sm truncate">{weapon.name}</h4>
        {isEquipped && (
          <span className="text-[8px] uppercase font-bold tracking-wider text-[#DAA520] border border-[#DAA520]/40 bg-[#DAA520]/10 px-1.5 py-0.5 rounded-sm flex-shrink-0 flex items-center gap-0.5">
            <Check className="w-2.5 h-2.5" /> Equipped
          </span>
        )}
      </div>
      <div className="flex items-center gap-3 text-[11px] text-[#A1887F]">
        {weapon.stats?.damage != null && (
          <span className="flex items-center gap-1">
            <Sword className="w-3 h-3 text-[#DAA520]" />
            <span className="text-[#F5DEB3] font-bold">{weapon.stats.damage}</span> ATK
          </span>
        )}
        {weapon.stats?.range != null && (
          <span className="flex items-center gap-1">
            <span className="text-[#F5DEB3] font-bold">{weapon.stats.range.toFixed(2)}</span> Range
          </span>
        )}
      </div>
      <p className="text-[10px] text-[#8D6E63] leading-snug mt-0.5 line-clamp-1">{weapon.description}</p>
    </div>
    {!isEquipped && (
      <button
        onClick={() => onEquip(weapon.id)}
        className="flex-shrink-0 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-[#DAA520] border border-[#DAA520]/40 rounded-sm hover:bg-[#DAA520]/15 hover:border-[#DAA520]/70 transition-colors"
      >
        Equip
      </button>
    )}
  </div>
));

const ConsumableCard = memo(({
  item,
  count,
  assetManager,
  onUse,
}: {
  item: Item;
  count: number;
  assetManager: AssetManager | null;
  onUse: (item: Item) => void;
}) => (
  <div className="flex items-center gap-3 p-2.5 border border-[#5C3A21]/50 bg-[#2D1B11]/40 rounded-sm hover:border-[#DAA520]/40 transition-colors">
    <div className="w-12 h-12 flex-shrink-0 bg-[#1A0F0A]/60 rounded border border-[#5C3A21]/50 flex items-center justify-center shadow-inner relative overflow-hidden">
      {getItemIcon(item, 'w-9 h-9', assetManager)}
      {count > 1 && (
        <div className="absolute -top-0.5 -right-0.5 bg-[#1A0F0A] border border-[#DAA520]/50 rounded-full min-w-[14px] h-3.5 px-0.5 flex items-center justify-center z-10">
          <span className="text-[7px] font-bold text-[#DAA520]">x{count}</span>
        </div>
      )}
    </div>
    <div className="flex-1 min-w-0">
      <h4 className="font-bold text-[#F5DEB3] text-sm truncate leading-tight">{item.name}</h4>
      <p className="text-[10px] text-[#C9B8A8] leading-snug line-clamp-1 mt-0.5">{item.description}</p>
    </div>
    <button
      onClick={() => onUse(item)}
      className="flex-shrink-0 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-[#DAA520] border border-[#DAA520]/40 rounded-sm hover:bg-[#DAA520]/15 hover:border-[#DAA520]/70 transition-colors"
    >
      Use
    </button>
  </div>
));

const KeyItemCard = memo(({
  item,
  count,
  assetManager,
}: {
  item: Item;
  count: number;
  assetManager: AssetManager | null;
}) => (
  <div className="flex items-center gap-3 p-2.5 border border-[#5C3A21]/40 bg-[#2D1B11]/30 rounded-sm">
    <div className="w-12 h-12 flex-shrink-0 bg-[#1A0F0A]/60 rounded border border-[#5C3A21]/50 flex items-center justify-center shadow-inner relative overflow-hidden">
      {getItemIcon(item, 'w-9 h-9', assetManager)}
      {count > 1 && (
        <div className="absolute -top-0.5 -right-0.5 bg-[#1A0F0A] border border-sky-400/50 rounded-full min-w-[14px] h-3.5 px-0.5 flex items-center justify-center z-10">
          <span className="text-[7px] font-bold text-sky-300">x{count}</span>
        </div>
      )}
    </div>
    <div className="flex-1 min-w-0">
      <div className="flex items-center gap-2 mb-0.5">
        <h4 className="font-bold text-[#F5DEB3] text-sm truncate leading-tight">{item.name}</h4>
        <span className={cn(
          'text-[8px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded-sm border flex-shrink-0',
          item.type === 'key'
            ? 'text-amber-400 border-amber-500/40 bg-amber-900/20'
            : 'text-sky-400 border-sky-500/40 bg-sky-900/20',
        )}>
          {item.type}
        </span>
      </div>
      <p className="text-[10px] text-[#C9B8A8] leading-snug line-clamp-2">{item.description}</p>
    </div>
  </div>
));

// ─── Empty States ─────────────────────────────────────────────────────────────

const EmptyTab = ({ icon: Icon, message, hint }: { icon: React.ElementType; message: string; hint: string }) => (
  <div className="flex flex-col items-center justify-center py-10 text-center">
    <Icon className="w-8 h-8 text-[#5C3A21] mb-2.5" />
    <p className="text-[#A0522D] text-sm font-semibold">{message}</p>
    <p className="text-[10px] text-[#8D6E63] mt-1">{hint}</p>
  </div>
);

// ─── Main Component ───────────────────────────────────────────────────────────

export const InventoryModal = memo(function InventoryModal({
  open,
  onOpenChange,
  gameState,
  assetManager,
  triggerUIUpdate,
  playPotionDrink,
  playGrassChew,
}: InventoryModalProps) {
  const [activeTab, setActiveTab] = useState<TabId>('weapons');

  // ─── Grouped data ───
  const groupedInventory = useMemo(() => {
    const groups = new Map<string, { item: Item; count: number }>();
    gameState.inventory.forEach(item => {
      const existing = groups.get(item.id);
      if (existing) existing.count += 1;
      else groups.set(item.id, { item, count: 1 });
    });
    return Array.from(groups.values());
  }, [gameState.inventory]);

  const weapons = useMemo(() => groupedInventory.filter(({ item }) => item.type === 'equipment'), [groupedInventory]);
  const consumables = useMemo(() => groupedInventory.filter(({ item }) => item.type === 'consumable'), [groupedInventory]);
  const keyItems = useMemo(() => groupedInventory.filter(({ item }) => item.type === 'quest' || item.type === 'key'), [groupedInventory]);

  const tabCounts: Record<TabId, number> = {
    weapons: weapons.reduce((s, w) => s + w.count, 0),
    consumables: consumables.reduce((s, c) => s + c.count, 0),
    key_items: keyItems.reduce((s, k) => s + k.count, 0),
  };

  // ─── Actions ───
  const useConsumable = (item: Item) => {
    if (item.buffType === 'stealth') {
      const duration = item.buffDuration ?? 14;
      gameState.player.stealthTimer = duration;
      gameState.player.stealthDetectionMult = 0.25;
      playPotionDrink?.();
      gameState.removeItem(item.id);
      notify('Verdant Tonic Active', {
        id: 'stealth-active',
        type: 'success',
        description: `Enemies will not detect you for ${duration} seconds.`,
        duration: 3000,
      });
      triggerUIUpdate();
      return;
    }

    if (typeof item.healAmount === 'number' && item.healAmount > 0) {
      const atFullHealth = gameState.player.health >= gameState.player.maxHealth;
      const atFullStamina = gameState.player.stamina >= gameState.player.maxStamina;
      if (atFullHealth && (item.id !== 'tempest_grass' || atFullStamina)) {
        notify('Already at full health!', { id: 'full-health', duration: 1500 });
        return;
      }
      if (item.id === 'health_potion') playPotionDrink?.();
      else if (item.id === 'tempest_grass') playGrassChew?.();

      gameState.player.health = Math.min(gameState.player.maxHealth, gameState.player.health + item.healAmount);
      if (item.id === 'tempest_grass') gameState.player.stamina = gameState.player.maxStamina;
      gameState.removeItem(item.id);
      const staminaNote = item.id === 'tempest_grass' ? ' Stamina fully restored.' : '';
      notify(`Used ${item.name}`, {
        id: `used-${item.id}`,
        type: 'success',
        description: `Restored ${item.healAmount} health.${staminaNote}`,
        duration: 2000,
      });
      triggerUIUpdate();
    }
  };

  const equipWeapon = (weaponId: string) => {
    gameState.setEquippedWeapon(weaponId);
    triggerUIUpdate();
  };

  const totalItems = groupedInventory.reduce((sum, { count }) => sum + count, 0);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        onOpenAutoFocus={e => e.preventDefault()}
        className={cn(
          'z-[85] flex max-h-[min(92vh,680px)] w-[min(96vw,540px)] max-w-[min(96vw,540px)] flex-col gap-0 border-2 border-[#5C3A21] bg-[#120A08]/97 p-0 text-left shadow-2xl backdrop-blur-md sm:rounded-sm',
        )}
      >
        <DialogTitle className="sr-only">Inventory</DialogTitle>

        {/* ── Header ── */}
        <div className="flex flex-shrink-0 items-end justify-between gap-2 border-b border-[#5C3A21]/60 px-5 py-3">
          <div>
            <h2 className="font-bold uppercase tracking-[0.2em] text-[#DAA520] flex items-center gap-2">
              <Package className="w-5 h-5" />
              Inventory
            </h2>
            <p className="mt-0.5 text-xs text-[#A1887F]">
              {totalItems === 0 ? 'Your pack is empty.' : `${totalItems} item${totalItems !== 1 ? 's' : ''} carried`}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5">
              <Coins className="w-3.5 h-3.5 text-yellow-400" />
              <span className="text-xs font-bold text-[#F5DEB3]">{gameState.player.gold}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-violet-300" />
              <span className="text-xs font-bold text-violet-200">{gameState.player.essence}</span>
            </div>
          </div>
        </div>

        {/* ── Tabs ── */}
        <div className="flex border-b border-[#5C3A21]/40 px-4">
          {TAB_CONFIG.map(tab => {
            const isActive = activeTab === tab.id;
            const count = tabCounts[tab.id];
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  'flex items-center gap-1.5 px-3.5 py-2.5 text-[11px] font-bold uppercase tracking-wider transition-colors border-b-2 -mb-px',
                  isActive
                    ? 'border-[#DAA520] text-[#DAA520]'
                    : 'border-transparent text-[#8D6E63] hover:text-[#C9B8A8] hover:border-[#5C3A21]/50',
                )}
              >
                {tab.icon}
                {tab.label}
                {count > 0 && (
                  <span className={cn(
                    'text-[9px] font-bold rounded-full min-w-[16px] h-4 px-1 flex items-center justify-center',
                    isActive ? 'bg-[#DAA520]/20 text-[#DAA520]' : 'bg-[#5C3A21]/30 text-[#8D6E63]',
                  )}>
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* ── Tab content ── */}
        <div className="flex-1 px-5 py-4">
          {/* Weapons tab */}
          {activeTab === 'weapons' && (
            weapons.length === 0 ? (
              <EmptyTab icon={Sword} message="No weapons found" hint="Defeat enemies or find them in the world" />
            ) : (
              <div className="space-y-2">
                {/* Equipped first, then others */}
                {[...weapons].sort((a, b) => {
                  const aEq = a.item.id === gameState.equippedWeaponId ? 0 : 1;
                  const bEq = b.item.id === gameState.equippedWeaponId ? 0 : 1;
                  return aEq - bEq;
                }).map(({ item }, idx) => (
                  <WeaponCard
                    key={`${item.id}_${idx}`}
                    weapon={item}
                    isEquipped={item.id === gameState.equippedWeaponId}
                    assetManager={assetManager}
                    onEquip={equipWeapon}
                  />
                ))}
              </div>
            )
          )}

          {/* Consumables tab */}
          {activeTab === 'consumables' && (
            consumables.length === 0 ? (
              <EmptyTab icon={Heart} message="No consumables" hint="Pick up potions and herbs as you explore" />
            ) : (
              <div className="space-y-1.5">
                {consumables.map(({ item, count }, idx) => (
                  <ConsumableCard
                    key={`${item.id}_${idx}`}
                    item={item}
                    count={count}
                    assetManager={assetManager}
                    onUse={useConsumable}
                  />
                ))}
              </div>
            )
          )}

          {/* Key Items tab */}
          {activeTab === 'key_items' && (
            keyItems.length === 0 ? (
              <EmptyTab icon={Key} message="No quest items" hint="Complete objectives to find key items" />
            ) : (
              <div className="space-y-1.5">
                {keyItems.map(({ item, count }, idx) => (
                  <KeyItemCard
                    key={`${item.id}_${idx}`}
                    item={item}
                    count={count}
                    assetManager={assetManager}
                  />
                ))}
              </div>
            )
          )}
        </div>

        {/* ── Footer hint ── */}
        <div className="flex-shrink-0 border-t border-[#5C3A21]/30 px-5 py-2 flex justify-end">
          <p className="text-[10px] text-[#8D6E63]">
            <kbd className="rounded border border-[#5C3A21] bg-[#1A0F0A] px-1.5 py-0.5 font-mono text-[#DAA520]">I</kbd>{' '}
            or <kbd className="rounded border border-[#5C3A21] bg-[#1A0F0A] px-1.5 py-0.5 font-mono text-[#DAA520]">Esc</kbd>{' '}
            to close
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
});
