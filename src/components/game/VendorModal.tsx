import React, { memo, useMemo, useState } from 'react';
import { Coins, Sparkles, Package, Sword, Heart, User, Check, Key, Circle } from 'lucide-react';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import type { GameState, Item } from '@/lib/game/GameState';
import type { AssetManager } from '@/lib/game/AssetManager';
import type { VendorDef, VendorItem } from '@/data/vendors';
import { getVendorStockRemaining } from '@/data/vendors';

interface VendorModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  vendor: VendorDef | null;
  gameState: GameState;
  assetManager: AssetManager | null;
  itemsRegistry: Record<string, Item>;
  onPurchase: (vendorId: string, vendorItem: VendorItem, item: Item) => void;
}

// ─── Merchant icon (person + $ badge, mirrors BonfireMenu) ────────────────────

const MerchantHeaderIcon = () => (
  <span className="relative inline-block leading-none text-[#DAA520] flex-shrink-0">
    <User className="h-5 w-5" strokeWidth={2.2} />
    <span
      className="absolute bottom-[-2px] right-[-3px] flex items-center justify-center w-[10px] h-[10px] rounded-full bg-[#120A08] text-[#DAA520] text-[9px] font-black leading-none"
      style={{ border: '1px solid #DAA520' }}
    >
      $
    </span>
  </span>
);

// ─── Meta chip ────────────────────────────────────────────────────────────────

const CHIP_VARIANTS = {
  muted:  'text-[#8B7355]  border-[#3A2215]/80 bg-[#1A0F0A]/40',
  green:  'text-[#8FBC8F]  border-[#2e5e2e]/50 bg-[#1e2e1e]/40',
  violet: 'text-violet-300 border-violet-500/30 bg-violet-900/20',
  amber:  'text-[#DAA520]  border-[#DAA520]/40  bg-[#DAA520]/10',
  red:    'text-red-400    border-red-500/30    bg-red-900/20',
} as const;

const MetaChip = ({ icon, label, variant }: {
  icon?: React.ReactNode;
  label: string;
  variant: keyof typeof CHIP_VARIANTS;
}) => (
  <span className={cn(
    'inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-sm border text-[9px] font-bold uppercase tracking-wide leading-none',
    CHIP_VARIANTS[variant],
  )}>
    {icon}
    {label}
  </span>
);

// ─── Helpers ──────────────────────────────────────────────────────────────────

const getItemIcon = (item: Item, className: string, assetManager?: AssetManager | null) => {
  if (!item) return <div className={className} />;
  if (assetManager) {
    const url = assetManager.getTextureURL(item.sprite);
    if (url) {
      return <img src={url} alt={item.name} className={`${className} [image-rendering:pixelated] object-contain drop-shadow-sm`} />;
    }
  }
  // Fallback icons
  if (item.type === 'equipment') return <Sword className={className} />;
  if (item.type === 'consumable') return <Heart className={className} />;
  return <Package className={className} />;
};

// ─── Item Card ────────────────────────────────────────────────────────────────

const VendorItemCard = memo(({
  vendorItem,
  item,
  assetManager,
  canAfford,
  alreadyOwned,
  soldOut,
  stockRemaining,
  onBuy,
}: {
  vendorItem: VendorItem;
  item: Item;
  assetManager: AssetManager | null;
  canAfford: boolean;
  alreadyOwned: boolean;
  soldOut: boolean;
  stockRemaining: number | null;
  onBuy: () => void;
}) => {
  const isWeapon = item.type === 'equipment' && item.stats;

  return (
    <div className={cn(
      'flex items-center gap-3 p-3 border rounded-sm transition-all',
      alreadyOwned
        ? 'border-[#2e5e2e]/50 bg-[#1e2e1e]/30'
        : 'border-[#5C3A21]/50 bg-[#2D1B11]/40 hover:border-[#DAA520]/40',
    )}>
      {/* Item sprite */}
      <div className="w-16 h-16 flex-shrink-0 bg-[#1A0F0A]/70 rounded border border-[#5C3A21]/50 flex items-center justify-center shadow-inner overflow-hidden">
        {getItemIcon(item, 'w-12 h-12', assetManager)}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <h4 className="font-bold text-[#F5DEB3] text-sm truncate">{item.name}</h4>
          {isWeapon && (
            <span className="text-[10px] uppercase font-bold tracking-wider text-[#DAA520] border border-[#DAA520]/40 bg-[#DAA520]/10 px-1.5 py-0.5 rounded-sm flex-shrink-0">
              Weapon
            </span>
          )}
        </div>
        <p className="text-[10px] text-[#C9B8A8] leading-snug line-clamp-2">{item.description}</p>

        {/* Metadata chips — always rendered */}
        <div className="flex flex-wrap gap-1 mt-1.5">
          {/* Stock — always shown */}
          {alreadyOwned ? (
            <MetaChip icon={<Check className="w-2.5 h-2.5" />} label="owned" variant="green" />
          ) : vendorItem.unique ? (
            <MetaChip label="unique" variant="amber" />
          ) : soldOut ? (
            <MetaChip label="sold out" variant="red" />
          ) : stockRemaining === null ? (
            <MetaChip label="∞ stock" variant="muted" />
          ) : (
            <MetaChip
              label={`${stockRemaining} / ${vendorItem.stock} left`}
              variant={stockRemaining <= 2 ? 'amber' : 'muted'}
            />
          )}

          {/* Consumable effects */}
          {item.healAmount != null && (
            <MetaChip
              icon={<Heart className="w-2.5 h-2.5" />}
              label={`+${item.healAmount} hp`}
              variant="red"
            />
          )}
          {item.essenceAmount != null && (
            <MetaChip
              icon={<Sparkles className="w-2.5 h-2.5" />}
              label={`+${item.essenceAmount} essence`}
              variant="violet"
            />
          )}
          {item.buffType === 'berserker' && item.buffDuration != null && (
            <MetaChip label={`berserker ${item.buffDuration}s`} variant="red" />
          )}
          {item.buffType === 'stealth' && item.buffDuration != null && (
            <MetaChip label={`stealth ${item.buffDuration}s`} variant="muted" />
          )}
          {item.buffType === 'last_breath' && (
            <MetaChip label="revive on death" variant="amber" />
          )}

          {/* Weapon stats */}
          {isWeapon && item.stats && (
            <>
              {item.stats.damage != null && (
                <MetaChip
                  icon={<Sword className="w-2.5 h-2.5" />}
                  label={`${item.stats.damage} atk`}
                  variant="amber"
                />
              )}
              {item.stats.range != null && (
                <MetaChip label={`${item.stats.range.toFixed(2)} range`} variant="muted" />
              )}
            </>
          )}
        </div>
      </div>

      {/* Price + buy */}
      <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
        {/* Price */}
        <div className="flex items-center gap-1">
          {vendorItem.currency === 'gold'
            ? <Coins className="w-3.5 h-3.5 text-yellow-400" />
            : <Sparkles className="w-3.5 h-3.5 text-violet-300" />
          }
          <span className={cn(
            'text-sm font-bold',
            alreadyOwned ? 'text-[#8FBC8F]' : soldOut ? 'text-[#6B5344]' : canAfford ? 'text-[#F5DEB3]' : 'text-red-400',
          )}>
            {vendorItem.price}
          </span>
        </div>
        {/* Button */}
        {alreadyOwned ? (
          <span className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-[#8FBC8F] border border-[#2e5e2e]/60 rounded-sm flex items-center gap-1">
            <Check className="w-3 h-3" /> Owned
          </span>
        ) : soldOut ? (
          <span className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-[#6B5344] border border-[#5C3A21]/30 rounded-sm">
            Sold Out
          </span>
        ) : (
          <button
            onClick={onBuy}
            disabled={!canAfford}
            className={cn(
              'px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider rounded-sm transition-colors border',
              canAfford
                ? 'text-[#DAA520] border-[#DAA520]/40 hover:bg-[#DAA520]/15 hover:border-[#DAA520]/70'
                : 'text-[#6B5344] border-[#5C3A21]/30 cursor-not-allowed opacity-70',
            )}
          >
            Buy
          </button>
        )}
      </div>
    </div>
  );
});

// ─── Tab config ───────────────────────────────────────────────────────────────

type VendorTabId = 'weapons' | 'rings' | 'consumables' | 'key_items';

const VENDOR_TAB_CONFIG: { id: VendorTabId; label: string; icon: React.ReactNode; types: string[] }[] = [
  { id: 'weapons',     label: 'Weapons',     icon: <Sword   className="w-3.5 h-3.5" />, types: ['equipment'] },
  { id: 'rings',       label: 'Rings',       icon: <Circle  className="w-3.5 h-3.5" />, types: ['ring']      },
  { id: 'consumables', label: 'Consumables', icon: <Heart   className="w-3.5 h-3.5" />, types: ['consumable'] },
  { id: 'key_items',   label: 'Key Items',   icon: <Key     className="w-3.5 h-3.5" />, types: ['key', 'quest'] },
];

// ─── Main Component ───────────────────────────────────────────────────────────

export const VendorModal = memo(function VendorModal({
  open,
  onOpenChange,
  vendor,
  gameState,
  assetManager,
  itemsRegistry,
  onPurchase,
}: VendorModalProps) {
  const resolvedItems = useMemo(() => {
    if (!vendor) return [];
    return vendor.items
      .map(vi => ({ vendorItem: vi, item: itemsRegistry[vi.itemId] }))
      .filter(({ item }) => !!item);
  }, [vendor, itemsRegistry]);

  const visibleTabs = useMemo(() =>
    VENDOR_TAB_CONFIG.filter(tab =>
      resolvedItems.some(({ item }) => tab.types.includes(item.type))
    ),
  [resolvedItems]);

  const [activeTab, setActiveTab] = useState<VendorTabId>('consumables');

  // Reset to first available tab whenever the vendor changes
  const effectiveTab = visibleTabs.some(t => t.id === activeTab)
    ? activeTab
    : (visibleTabs[0]?.id ?? 'consumables');

  const tabItems = useMemo(() => {
    const tab = VENDOR_TAB_CONFIG.find(t => t.id === effectiveTab);
    if (!tab) return resolvedItems;
    return resolvedItems.filter(({ item }) => tab.types.includes(item.type));
  }, [resolvedItems, effectiveTab]);

  const tabCounts = useMemo(() => {
    const counts = {} as Record<VendorTabId, number>;
    for (const tab of VENDOR_TAB_CONFIG) {
      counts[tab.id] = resolvedItems.filter(({ item }) => tab.types.includes(item.type)).length;
    }
    return counts;
  }, [resolvedItems]);

  if (!vendor) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        onOpenAutoFocus={e => e.preventDefault()}
        className={cn(
          'z-[85] flex max-h-[min(92vh,680px)] w-[min(96vw,540px)] max-w-[min(96vw,540px)] flex-col gap-0 border-2 border-[#5C3A21] bg-[#120A08]/97 p-0 text-left shadow-2xl backdrop-blur-md sm:rounded-sm',
        )}
      >
        <DialogTitle className="sr-only">{vendor.name} — Shop</DialogTitle>

        {/* ── Header ── */}
        <div className="flex flex-shrink-0 items-end justify-between gap-2 border-b border-[#5C3A21]/60 px-5 py-3 pr-12">
          <div>
            <h2 className="font-bold uppercase tracking-[0.2em] text-[#DAA520] flex items-center gap-2">
              <MerchantHeaderIcon />
              {vendor.name}
            </h2>
          </div>
          <div className="flex items-center gap-3 flex-shrink-0">
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
        {visibleTabs.length > 1 && (
          <div className="flex flex-shrink-0 border-b border-[#5C3A21]/40 px-4">
            {visibleTabs.map(tab => {
              const isActive = tab.id === effectiveTab;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={cn(
                    'flex items-center gap-1.5 px-3 py-2.5 text-[10px] font-bold uppercase tracking-wider border-b-2 transition-colors',
                    isActive
                      ? 'border-[#DAA520] text-[#DAA520]'
                      : 'border-transparent text-[#8B7355] hover:text-[#C9A36B]',
                  )}
                >
                  {tab.icon}
                  {tab.label}
                  {tabCounts[tab.id] > 0 && (
                    <span className={cn(
                      'ml-0.5 rounded-sm px-1 py-px text-[9px] font-bold',
                      isActive ? 'bg-[#DAA520]/20 text-[#DAA520]' : 'bg-[#3A2215] text-[#8B7355]',
                    )}>
                      {tabCounts[tab.id]}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        )}

        {/* ── Items ── */}
        <div className="flex-1 overflow-y-auto px-5 py-4">
          {resolvedItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-center">
              <Package className="w-8 h-8 text-[#5C3A21] mb-2.5" />
              <p className="text-[#A0522D] text-sm font-semibold">Nothing for sale</p>
            </div>
          ) : (
            <div className="space-y-2">
              {tabItems.map(({ vendorItem, item }) => {
                const playerBalance = vendorItem.currency === 'gold'
                  ? gameState.player.gold
                  : gameState.player.essence;
                const canAfford = playerBalance >= vendorItem.price;
                const alreadyOwned = vendorItem.unique === true && gameState.hasItem(vendorItem.itemId);
                const stockRemaining = getVendorStockRemaining(
                  gameState.gameFlags as Record<string, boolean | number>,
                  vendor.id,
                  vendorItem,
                );
                const soldOut = stockRemaining != null && stockRemaining <= 0;

                return (
                  <VendorItemCard
                    key={vendorItem.itemId}
                    vendorItem={vendorItem}
                    item={item}
                    assetManager={assetManager}
                    canAfford={canAfford}
                    alreadyOwned={alreadyOwned}
                    soldOut={soldOut}
                    stockRemaining={stockRemaining}
                    onBuy={() => onPurchase(vendor.id, vendorItem, item)}
                  />
                );
              })}
            </div>
          )}
        </div>

        {/* ── Footer ── */}
        <div className="flex-shrink-0 border-t border-[#5C3A21]/30 px-5 py-2 flex justify-end">
          <p className="text-[10px] text-[#C9B8A8]">
            <kbd className="rounded border border-[#5C3A21] bg-[#1A0F0A] px-1.5 py-0.5 font-mono text-[#DAA520]">Esc</kbd>{' '}
            to close
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
});
