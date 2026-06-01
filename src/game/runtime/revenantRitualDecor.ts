import type { TileType, World, WorldMap } from '@/lib/game/World';
import { FOREST_DUD_RITUAL_ANCHORS } from '@/game/runtime/ritualSiteConstants';

/** Decorative tiles placed around summoning glyphs — preserved when forts are stamped. */
export const RITUAL_DECOR_TILE_TYPES: ReadonlySet<TileType> = new Set([
  'ritual_candle',
  'ritual_candle_knocked',
]);

export function isRitualDecorTileType(type: TileType): boolean {
  return RITUAL_DECOR_TILE_TYPES.has(type);
}

/** Ring of ritual clutter around a glyph anchor (tile coords). */
const RITUAL_RING: Array<{ dx: number; dy: number; type: TileType }> = [
  { dx: -3, dy: -1, type: 'ritual_candle_knocked' },
  { dx: -2, dy: -3, type: 'ritual_candle_knocked' },
  { dx: 0, dy: -4, type: 'ritual_candle_knocked' },
  { dx: 2, dy: -3, type: 'ritual_candle_knocked' },
  { dx: 3, dy: -1, type: 'ritual_candle_knocked' },
  { dx: 3, dy: 1, type: 'ritual_candle_knocked' },
  { dx: 2, dy: 3, type: 'ritual_candle' },
  { dx: 0, dy: 4, type: 'ritual_candle_knocked' },
  { dx: -2, dy: 3, type: 'ritual_candle_knocked' },
  { dx: -3, dy: 1, type: 'ritual_candle' },
  { dx: -4, dy: 0, type: 'bones' },
  { dx: 4, dy: 0, type: 'rubble' },
  { dx: 1, dy: -2, type: 'bloodstain' },
  { dx: -1, dy: 2, type: 'bloodstain' },
];

/**
 * Stamps walkable ritual props in a ring around the glyph. Skips the anchor tile
 * (summoning_ritual / summoning_ritual_dud) and any chest / interactable tiles.
 */
export function applyRevenantRitualDecor(map: WorldMap, anchorX: number, anchorY: number): void {
  for (const { dx, dy, type } of RITUAL_RING) {
    const tx = anchorX + dx;
    const ty = anchorY + dy;
    if (tx === anchorX && ty === anchorY) continue;
    if (ty < 0 || ty >= map.height || tx < 0 || tx >= map.width) continue;
    const row = map.tiles[ty];
    if (!row) continue;
    const existing = row[tx];
    if (!existing) continue;
    if (
      existing.type === 'summoning_ritual'
      || existing.type === 'summoning_ritual_dud'
      || existing.type === 'chest'
      || existing.type === 'chest_opened'
      || existing.type === 'special_chest'
      || existing.type === 'special_chest_opened'
      || existing.interactable
    ) {
      continue;
    }
    const el = existing.elevation ?? 0;
    row[tx] = { type, walkable: true, elevation: el };
  }
}

/** Ensures the failed glyph overlay exists (map-gen late passes can overwrite props). */
export function stampFailedRitualGlyph(map: WorldMap, anchorX: number, anchorY: number): void {
  const row = map.tiles[anchorY];
  if (!row?.[anchorX]) return;
  const el = row[anchorX].elevation ?? 0;
  row[anchorX] = { type: 'summoning_ritual_dud', walkable: true, elevation: el };
}

/** Removes legacy 3×3 ash pads so only the masked sigil reads as scorched ground. */
export function clearFailedRitualPad(map: WorldMap, anchorX: number, anchorY: number): boolean {
  let changed = false;
  for (let dy = -1; dy <= 1; dy++) {
    for (let dx = -1; dx <= 1; dx++) {
      if (dx === 0 && dy === 0) continue;
      const tx = anchorX + dx;
      const ty = anchorY + dy;
      if (ty < 0 || ty >= map.height || tx < 0 || tx >= map.width) continue;
      const row = map.tiles[ty];
      const existing = row?.[tx];
      if (!existing || existing.type !== 'ash') continue;
      const el = existing.elevation ?? 0;
      row[tx] = { type: 'grass', walkable: true, elevation: el };
      changed = true;
    }
  }
  return changed;
}

export type EnsureForestDudRitualOptions = {
  /** Rebuild Three.js meshes even when map data already has the dud glyph. */
  forceRemesh?: boolean;
  playerWorldX?: number;
  playerWorldY?: number;
};

/**
 * Idempotent: (re)builds dud ritual tiles on the live world map and refreshes nearby meshes.
 * Map cache + HMR can leave grass meshes here while tile data is already summoning_ritual_dud.
 */
export function ensureForestDudRitualSites(
  world: World,
  mapId: string,
  options?: EnsureForestDudRitualOptions,
): boolean {
  if (mapId !== 'forest') return false;

  const map = world.getCurrentMap();
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  let dataChanged = false;
  let meshStale = options?.forceRemesh === true;

  for (const { tileX, tileY } of FOREST_DUD_RITUAL_ANCHORS) {
    const center = map.tiles[tileY]?.[tileX];
    if (!center) continue;

    const hadDudGlyph = center.type === 'summoning_ritual_dud';
    if (!hadDudGlyph) {
      stampFailedRitualGlyph(map, tileX, tileY);
      dataChanged = true;
      meshStale = true;
      if (import.meta.env.DEV) {
        console.info(`[ritual] Stamped failed glyph at forest tile (${tileX}, ${tileY})`);
      }
    } else if (world.isActiveTileMeshStale(tileX, tileY)) {
      meshStale = true;
    }

    if (clearFailedRitualPad(map, tileX, tileY)) {
      dataChanged = true;
      meshStale = true;
    }
    applyRevenantRitualDecor(map, tileX, tileY);

    minX = Math.min(minX, tileX - 6);
    minY = Math.min(minY, tileY - 6);
    maxX = Math.max(maxX, tileX + 6);
    maxY = Math.max(maxY, tileY + 6);
  }

  if (meshStale && Number.isFinite(minX)) {
    world.refreshMapTileRegion(
      Math.max(0, Math.floor(minX)),
      Math.max(0, Math.floor(minY)),
      Math.min(map.width - 1, Math.ceil(maxX)),
      Math.min(map.height - 1, Math.ceil(maxY)),
      { forceAttach: options?.forceRemesh === true || dataChanged },
    );
    if (options?.playerWorldX != null && options?.playerWorldY != null) {
      world.updateChunks(options.playerWorldX, options.playerWorldY);
    }
  }

  return dataChanged || meshStale;
}
