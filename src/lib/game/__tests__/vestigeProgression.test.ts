import { describe, expect, it } from 'vitest';
import { GameState } from '@/lib/game/GameState';
import { items } from '@/data/items';
import {
  MAX_EPHEMERAL_EXTRACT_CHARGES,
  MAX_EPHEMERAL_EXTRACT_UPGRADES,
} from '@/data/balance';
import {
  canAffordEphemeralExtractUpgrade,
  getEphemeralExtractUpgradeLevel,
  getVestigeCostForUpgradeLevel,
  isEphemeralExtractUpgradeMaxed,
} from '@/lib/game/vestigeProgression';

describe('vestigeProgression', () => {
  it('derives upgrade level from flask max charges', () => {
    expect(getEphemeralExtractUpgradeLevel(MAX_EPHEMERAL_EXTRACT_CHARGES)).toBe(0);
    expect(getEphemeralExtractUpgradeLevel(MAX_EPHEMERAL_EXTRACT_CHARGES + 2)).toBe(2);
  });

  it('uses escalating vestige costs', () => {
    expect(getVestigeCostForUpgradeLevel(0)).toBe(1);
    expect(getVestigeCostForUpgradeLevel(1)).toBe(1);
    expect(getVestigeCostForUpgradeLevel(2)).toBe(2);
    expect(getVestigeCostForUpgradeLevel(3)).toBe(2);
    expect(getVestigeCostForUpgradeLevel(4)).toBe(3);
  });

  it('blocks upgrades once max tier is reached', () => {
    expect(isEphemeralExtractUpgradeMaxed(MAX_EPHEMERAL_EXTRACT_UPGRADES)).toBe(true);
    expect(getVestigeCostForUpgradeLevel(MAX_EPHEMERAL_EXTRACT_UPGRADES)).toBe(Infinity);
  });

  it('requires enough held vestiges for the current tier', () => {
    expect(canAffordEphemeralExtractUpgrade(1, 0)).toBe(true);
    expect(canAffordEphemeralExtractUpgrade(1, 2)).toBe(false);
    expect(canAffordEphemeralExtractUpgrade(2, 2)).toBe(true);
  });
});

describe('GameState.upgradeEphemeralExtract', () => {
  it('consumes multiple vestiges on higher tiers', () => {
    const state = new GameState();
    state.addItem({ ...items.radiant_vestige }, { notify: false });
    state.addItem({ ...items.radiant_vestige }, { notify: false });

    expect(state.upgradeEphemeralExtract()).toBe(true);
    expect(state.upgradeEphemeralExtract()).toBe(true);
    expect(state.countItem('radiant_vestige')).toBe(0);
    expect(state.getEphemeralExtractUpgradeLevel()).toBe(2);
    expect(state.player.maxEphemeralExtractCharges).toBe(MAX_EPHEMERAL_EXTRACT_CHARGES + 2);

    state.addItem({ ...items.radiant_vestige }, { notify: false });
    expect(state.canUpgradeEphemeralExtract()).toBe(false);
    expect(state.upgradeEphemeralExtract()).toBe(false);
  });
});
