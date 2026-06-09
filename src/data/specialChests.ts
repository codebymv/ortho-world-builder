import type { TileType } from '@/lib/game/World';

const SPECIAL_CHEST_INTERACTION_IDS = new Set<string>([
  'ancient_chest',
  'boss_arena_chest',
  'forest_river_chest',
  'hollow_terminus_chest',
  'revenant_west_terminus_chest',
  'revenant_precipice_terminus_chest',
  'revenant_east_terminus_chest',
  'hunter_cliff_shelf_chest',
  'ranger_wolf_ring_chest',
  'north_fort_wayfarer_ring_chest',
  'forest_ironbark_ring_chest',
  'east_ridge_vestige_chest',
  'travelers_inlet_chest',
]);

/** Chests that grant only a Radiant Vestige (no gold or default consumable). */
export const VESTIGE_REWARD_CHEST_IDS = new Set<string>([
  'east_ridge_vestige_chest',
  'travelers_inlet_chest',
]);

/** Chests that grant only a ring (no gold or default consumable). */
export const RING_REWARD_CHEST_IDS = new Set<string>([
  'hunter_cliff_shelf_chest',
  'ranger_wolf_ring_chest',
  'north_fort_wayfarer_ring_chest',
  'forest_ironbark_ring_chest',
]);

export function isRingRewardChestInteractionId(interactionId: string): boolean {
  return RING_REWARD_CHEST_IDS.has(interactionId);
}

export function isVestigeRewardChestInteractionId(interactionId: string): boolean {
  return VESTIGE_REWARD_CHEST_IDS.has(interactionId);
}

export function isSpecialChestInteractionId(interactionId: string): boolean {
  return SPECIAL_CHEST_INTERACTION_IDS.has(interactionId);
}

export function getClosedChestTileType(interactionId: string): TileType {
  return isSpecialChestInteractionId(interactionId) ? 'special_chest' : 'chest';
}

export function getOpenedChestTileType(interactionId: string): TileType {
  return isSpecialChestInteractionId(interactionId) ? 'special_chest_opened' : 'chest_opened';
}

export function isChestTileType(type: TileType): boolean {
  return type === 'chest' || type === 'chest_opened' || type === 'special_chest' || type === 'special_chest_opened';
}
