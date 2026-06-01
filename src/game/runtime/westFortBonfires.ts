import type { GameFlagKey, GameState } from '@/lib/game/GameState';
import type { World, WorldMap } from '@/lib/game/World';
import type { TileType } from '@/lib/game/World';

/** World ~(-130, 5) — north yard outside the western fort gate row. */
export const WEST_FORT_NORTH_BONFIRE_TILE = { x: 20, y: 155 } as const;
export const WEST_FORT_NORTH_BONFIRE_ID = 'bonfire_west_fort_north';

/** World ~(-127, 0) — ritual chamber beside the summoning glyph. */
export const WEST_FORT_RITUAL_BONFIRE_TILE = { x: 23, y: 150 } as const;
export const WEST_FORT_RITUAL_BONFIRE_ID = 'bonfire_west_fort_ritual';

export const WEST_FORT_NORTH_LOGS_FLAG: GameFlagKey = 'bonfire_west_fort_north_logs_cleared';

/**
 * Fallen timber smothering the north-yard bonfire and sealing the fort's north exit.
 * The north face (y153, x17–23) is a solid woven wall of alternating horizontal/vertical logs so
 * the player can't slip through the gate opening before clearing it; back rows (y154–155) pile up
 * around the bonfire. Same-orientation logs stay ≥2 tiles apart for the map-gen log rules.
 */
const NORTH_LOG_COVER: ReadonlyArray<{ x: number; y: number; type: 'fallen_log' | 'fallen_log_v' }> = [
  // North face — full-width barricade across the gate opening (seals the exit at world ~-131,4).
  { x: 17, y: 153, type: 'fallen_log' },
  { x: 18, y: 153, type: 'fallen_log_v' },
  { x: 19, y: 153, type: 'fallen_log' },
  { x: 20, y: 153, type: 'fallen_log_v' },
  { x: 21, y: 153, type: 'fallen_log' },
  { x: 22, y: 153, type: 'fallen_log_v' },
  { x: 23, y: 153, type: 'fallen_log' },
  // Back rows — timber heaped over the smothered bonfire yard.
  { x: 17, y: 154, type: 'fallen_log' },
  { x: 23, y: 154, type: 'fallen_log_v' },
  { x: 18, y: 155, type: 'fallen_log_v' },
  { x: 22, y: 155, type: 'fallen_log' },
];

const LOG_TILE_TYPES = new Set<TileType>(['fallen_log', 'fallen_log_v']);

export function isWestFortNorthBonfireTile(tileX: number, tileY: number): boolean {
  return tileX === WEST_FORT_NORTH_BONFIRE_TILE.x && tileY === WEST_FORT_NORTH_BONFIRE_TILE.y;
}

export function westFortNorthLogsBlocking(map: WorldMap): boolean {
  return NORTH_LOG_COVER.some(({ x, y }) => LOG_TILE_TYPES.has(map.tiles[y]?.[x]?.type ?? 'grass'));
}

export function stampWestFortNorthLogCover(map: WorldMap): void {
  for (const { x, y, type } of NORTH_LOG_COVER) {
    const row = map.tiles[y];
    if (!row?.[x]) continue;
    if (row[x].interactable) continue;
    const el = row[x].elevation ?? 0;
    row[x] = { type, walkable: false, elevation: el };
  }
}

export function clearWestFortNorthLogCover(
  map: WorldMap,
  world: World,
  state: GameState,
): void {
  state.setFlag(WEST_FORT_NORTH_LOGS_FLAG, true);
  let minX = WEST_FORT_NORTH_BONFIRE_TILE.x;
  let maxX = WEST_FORT_NORTH_BONFIRE_TILE.x;
  let minY = WEST_FORT_NORTH_BONFIRE_TILE.y;
  let maxY = WEST_FORT_NORTH_BONFIRE_TILE.y;

  for (const { x, y } of NORTH_LOG_COVER) {
    const row = map.tiles[y];
    if (!row?.[x]) continue;
    if (!LOG_TILE_TYPES.has(row[x].type)) continue;
    const el = row[x].elevation ?? 0;
    row[x] = { type: 'cobblestone', walkable: true, elevation: el };
    minX = Math.min(minX, x);
    maxX = Math.max(maxX, x);
    minY = Math.min(minY, y);
    maxY = Math.max(maxY, y);
  }

  world.refreshMapTileRegion(minX - 1, minY - 1, maxX + 1, maxY + 1);
}

export function syncWestFortBonfireLogs(map: WorldMap, state: GameState): void {
  if (state.getFlagBool(WEST_FORT_NORTH_LOGS_FLAG)) {
    for (const { x, y } of NORTH_LOG_COVER) {
      const row = map.tiles[y];
      if (!row?.[x]) continue;
      if (!LOG_TILE_TYPES.has(row[x].type)) continue;
      const el = row[x].elevation ?? 0;
      row[x] = { type: 'cobblestone', walkable: true, elevation: el };
    }
    return;
  }
  stampWestFortNorthLogCover(map);
}
