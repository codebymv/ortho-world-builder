
export interface VendorItem {
  itemId: string;       // references items.ts key
  price: number;
  currency: 'gold' | 'essence';
  unique?: boolean;     // one-time purchase (e.g. weapons)
}

export interface VendorDef {
  id: string;
  name: string;
  greeting: string;
  items: VendorItem[];
}

export const vendors: Record<string, VendorDef> = {
  fort_quartermaster: {
    id: 'fort_quartermaster',
    name: 'Listless Merchant',
    greeting: "Take your time. I'm not going anywhere.",
    items: [
      { itemId: 'tempest_grass', price: 8, currency: 'gold' },
      { itemId: 'health_potion', price: 15, currency: 'gold' },
      { itemId: 'ornamental_broadsword', price: 280, currency: 'gold', unique: true },
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
