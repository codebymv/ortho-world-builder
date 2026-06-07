import { describe, it, expect } from 'vitest';
import {
  getVendorPurchaseFlagKey,
  getVendorPurchaseCount,
  getVendorStockRemaining,
  vendors,
} from '@/data/vendors';

describe('vendor stock helpers', () => {
  it('tracks remaining stock from purchase-count flags', () => {
    const vendor = vendors.fort_quartermaster;
    const essenceItem = vendor.items.find(i => i.itemId === 'sundered_essence_i')!;
    expect(essenceItem.stock).toBe(5);

    const flagKey = getVendorPurchaseFlagKey(vendor.id, essenceItem.itemId);
    const flags: Record<string, boolean | number> = {};

    expect(getVendorStockRemaining(flags, vendor.id, essenceItem)).toBe(5);
    flags[flagKey] = 2;
    expect(getVendorPurchaseCount(flags, vendor.id, essenceItem.itemId)).toBe(2);
    expect(getVendorStockRemaining(flags, vendor.id, essenceItem)).toBe(3);
    flags[flagKey] = 5;
    expect(getVendorStockRemaining(flags, vendor.id, essenceItem)).toBe(0);
  });
});
