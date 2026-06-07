import { describe, expect, it } from 'vitest';
import { GameState } from '@/lib/game/GameState';
import {
  isOverworldRegionDiscovered,
  OVERWORLD_REGIONS,
  seenRegionFlagKey,
} from '@/data/overworld';

describe('isOverworldRegionDiscovered', () => {
  it('reveals earlier regions when a later one is discovered', () => {
    const state = new GameState();
    state.currentMap = 'guilrhym';
    state.setFlag(seenRegionFlagKey('guilrhym'), true);

    const woods = OVERWORLD_REGIONS.find(r => r.id === 'whispering_woods')!;
    const greenleaf = OVERWORLD_REGIONS.find(r => r.id === 'greenleaf')!;
    const guilrhym = OVERWORLD_REGIONS.find(r => r.id === 'guilrhym')!;

    expect(isOverworldRegionDiscovered(guilrhym, state, 'guilrhym')).toBe(true);
    expect(isOverworldRegionDiscovered(woods, state, 'guilrhym')).toBe(true);
    expect(isOverworldRegionDiscovered(greenleaf, state, 'guilrhym')).toBe(true);
  });

  it('does not reveal later regions when only an earlier one is discovered', () => {
    const state = new GameState();
    state.currentMap = 'forest';
    state.setFlag(seenRegionFlagKey('whispering_woods'), true);

    const woods = OVERWORLD_REGIONS.find(r => r.id === 'whispering_woods')!;
    const guilrhym = OVERWORLD_REGIONS.find(r => r.id === 'guilrhym')!;

    expect(isOverworldRegionDiscovered(woods, state, 'forest')).toBe(true);
    expect(isOverworldRegionDiscovered(guilrhym, state, 'forest')).toBe(false);
  });
});
