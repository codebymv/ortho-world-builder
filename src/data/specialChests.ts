import type { TileType } from '@/lib/game/World';

const SPECIAL_CHEST_INTERACTION_IDS = new Set<string>([
  'ancient_chest',
  'boss_arena_chest',
  'forest_river_chest',
  'gilrhym_scythe_chest',
]);

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
