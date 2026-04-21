import { memo, useMemo } from 'react';
import { Coins, Sparkles, Package, Sword, Heart, Shield, Check } from 'lucide-react';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import type { GameState, Item } from '@/lib/game/GameState';
import type { AssetManager } from '@/lib/game/AssetManager';
import type { VendorDef, VendorItem } from '@/data/vendors';

interface VendorModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  vendor: VendorDef | null;
  gameState: GameState;
  assetManager: AssetManager | null;
  itemsRegistry: Record<string, Item>;
  onPurchase: (vendorItem: VendorItem, item: Item) => void;
}

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
  onBuy,
}: {
  vendorItem: VendorItem;
  item: Item;
  assetManager: AssetManager | null;
  canAfford: boolean;
  alreadyOwned: boolean;
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
            <span className="text-[8px] uppercase font-bold tracking-wider text-[#DAA520] border border-[#DAA520]/40 bg-[#DAA520]/10 px-1.5 py-0.5 rounded-sm flex-shrink-0">
              Weapon
            </span>
          )}
        </div>
        <p className="text-[10px] text-[#C9B8A8] leading-snug line-clamp-2">{item.description}</p>
        {/* Weapon stats */}
        {isWeapon && item.stats && (
          <div className="flex items-center gap-3 mt-1 text-[10px] text-[#A1887F]">
            {item.stats.damage != null && (
              <span className="flex items-center gap-0.5">
                <Sword className="w-3 h-3 text-[#DAA520]" />
                <span className="text-[#F5DEB3] font-bold">{item.stats.damage}</span> ATK
              </span>
            )}
            {item.stats.range != null && (
              <span className="flex items-center gap-0.5">
                <span className="text-[#F5DEB3] font-bold">{item.stats.range.toFixed(2)}</span> Range
              </span>
            )}
          </div>
        )}
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
            alreadyOwned ? 'text-[#8FBC8F]' : canAfford ? 'text-[#F5DEB3]' : 'text-red-400',
          )}>
            {vendorItem.price}
          </span>
        </div>
        {/* Button */}
        {alreadyOwned ? (
          <span className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-[#8FBC8F] border border-[#2e5e2e]/60 rounded-sm flex items-center gap-1">
            <Check className="w-3 h-3" /> Owned
          </span>
        ) : (
          <button
            onClick={onBuy}
            disabled={!canAfford}
            className={cn(
              'px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider rounded-sm transition-colors border',
              canAfford
                ? 'text-[#DAA520] border-[#DAA520]/40 hover:bg-[#DAA520]/15 hover:border-[#DAA520]/70'
                : 'text-[#5C3A21] border-[#5C3A21]/30 cursor-not-allowed opacity-50',
            )}
          >
            Buy
          </button>
        )}
      </div>
    </div>
  );
});

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
        <div className="flex flex-shrink-0 items-end justify-between gap-2 border-b border-[#5C3A21]/60 px-5 py-3">
          <div>
            <h2 className="font-bold uppercase tracking-[0.2em] text-[#DAA520] flex items-center gap-2">
              <Shield className="w-5 h-5" />
              {vendor.name}
            </h2>
            <p className="mt-0.5 text-xs text-[#A1887F] italic">"{vendor.greeting}"</p>
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

        {/* ── Items ── */}
        <div className="flex-1 overflow-y-auto px-5 py-4">
          {resolvedItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-center">
              <Package className="w-8 h-8 text-[#5C3A21] mb-2.5" />
              <p className="text-[#A0522D] text-sm font-semibold">Nothing for sale</p>
            </div>
          ) : (
            <div className="space-y-2">
              {resolvedItems.map(({ vendorItem, item }) => {
                const playerBalance = vendorItem.currency === 'gold'
                  ? gameState.player.gold
                  : gameState.player.essence;
                const canAfford = playerBalance >= vendorItem.price;
                const alreadyOwned = vendorItem.unique === true && gameState.hasItem(vendorItem.itemId);

                return (
                  <VendorItemCard
                    key={vendorItem.itemId}
                    vendorItem={vendorItem}
                    item={item}
                    assetManager={assetManager}
                    canAfford={canAfford}
                    alreadyOwned={alreadyOwned}
                    onBuy={() => onPurchase(vendorItem, item)}
                  />
                );
              })}
            </div>
          )}
        </div>

        {/* ── Footer ── */}
        <div className="flex-shrink-0 border-t border-[#5C3A21]/30 px-5 py-2 flex justify-end">
          <p className="text-[10px] text-[#8D6E63]">
            <kbd className="rounded border border-[#5C3A21] bg-[#1A0F0A] px-1.5 py-0.5 font-mono text-[#DAA520]">Esc</kbd>{' '}
            to close
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
});
