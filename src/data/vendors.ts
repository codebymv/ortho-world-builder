
export interface VendorItem {
  itemId: string;       // references items.ts key
  price: number;
  currency: 'gold' | 'essence';
  unique?: boolean;     // one-time purchase (e.g. weapons)
  /** Finite stock — tracked via vendor_bought_{vendorId}_{itemId} game flag. */
  stock?: number;
}

export interface VendorDef {
  id: string;
  name: string;
  greeting: string;
  items: VendorItem[];
}

export function getVendorPurchaseFlagKey(vendorId: string, itemId: string): string {
  return `vendor_bought_${vendorId}_${itemId}`;
}

export function getVendorPurchaseCount(
  gameFlags: Record<string, boolean | number>,
  vendorId: string,
  itemId: string,
): number {
  const raw = gameFlags[getVendorPurchaseFlagKey(vendorId, itemId)];
  return typeof raw === 'number' ? raw : 0;
}

export function getVendorStockRemaining(
  gameFlags: Record<string, boolean | number>,
  vendorId: string,
  vendorItem: VendorItem,
): number | null {
  if (vendorItem.stock == null) return null;
  return Math.max(0, vendorItem.stock - getVendorPurchaseCount(gameFlags, vendorId, vendorItem.itemId));
}

export const vendors: Record<string, VendorDef> = {
  fort_quartermaster: {
    id: 'fort_quartermaster',
    name: 'Listless Merchant',
    greeting: "Take your time. I'm not going anywhere.",
    items: [
      { itemId: 'tempest_grass', price: 20, currency: 'gold', stock: 12 },
      { itemId: 'health_potion', price: 38, currency: 'gold', stock: 12 },
      { itemId: 'sundered_essence_i', price: 75, currency: 'gold', stock: 5 },
      { itemId: 'ornamental_broadsword', price: 700, currency: 'gold', unique: true },
    ],
  },
  merchant: {
    id: 'merchant',
    name: 'Traveling Merchant',
    greeting: "Browse freely! Everything has a price and a story.",
    items: [
      { itemId: 'health_potion', price: 10, currency: 'gold' },
      { itemId: 'ancient_map', price: 50, currency: 'gold' },
    ],
  },
};
