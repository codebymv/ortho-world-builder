import type { Item } from '@/lib/game/GameState';

export type RewardBundleEntry =
  | {
      kind: 'gold';
      amount: number;
    }
  | {
      kind: 'item';
      item: Item;
      quantity?: number;
    };

export interface RewardBundle {
  id: string;
  title: string;
  entries: RewardBundleEntry[];
}

export interface ShowRewardBundleOptions {
  /** Hold the bundle until the weapon-acquisition overlay is dismissed. */
  deferUntilWeaponAcquisition?: boolean;
}
