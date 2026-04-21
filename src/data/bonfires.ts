import { mapDefinitions } from './maps';

export interface BonfireEntry {
  id: string;
  name: string;
  mapId: string;
  tileX: number;
  tileY: number;
}

/** World-space center of a bonfire tile — must match RuntimeRestFlow / World tile placement. */
export function bonfireTileWorldPosition(mapId: string, tileX: number, tileY: number): { x: number; y: number } {
  const def = mapDefinitions[mapId];
  if (!def) {
    return { x: tileX, y: tileY };
  }
  return {
    x: tileX - def.width / 2 + 0.5,
    y: tileY - def.height / 2 + 0.5,
  };
}

export function bonfireEntryWorldPosition(entry: BonfireEntry): { x: number; y: number } {
  return bonfireTileWorldPosition(entry.mapId, entry.tileX, entry.tileY);
}

/** Max distance from bonfire tile center (world units; tile size = 1) to count as standing at that flame. */
const BONFIRE_HERE_RADIUS = 1.5;

/**
 * True when the player is close enough to this registry bonfire to show “(here)” in fast travel.
 * Uses tile center (same as travel/kindle) — not raw lastBonfire coords, so slight walk-up offset still matches.
 */
export function isPlayerAtBonfireEntry(
  mapId: string,
  playerX: number,
  playerY: number,
  entry: BonfireEntry,
): boolean {
  if (mapId !== entry.mapId) return false;
  const w = bonfireEntryWorldPosition(entry);
  const dx = playerX - w.x;
  const dy = playerY - w.y;
  return dx * dx + dy * dy <= BONFIRE_HERE_RADIUS * BONFIRE_HERE_RADIUS;
}

/**
 * Fast-travel list order for Whispering Woods — south-to-north / story progression
 * (Forest Clearing → Iron Gate → Riverside Grove → Cliff Cemetery → Corrupted Bridge).
 */
const FOREST_BONFIRE_LIST_ORDER: readonly string[] = [
  'bonfire_forest_clearing',
  'bonfire_forest_south',
  'bonfire_hollow',
  'bonfire_cliff_cemetery',
  'bonfire_forest_fort',
];

function sortBonfiresByMapProgression(mapId: string, entries: BonfireEntry[]): BonfireEntry[] {
  const order = mapId === 'forest' ? FOREST_BONFIRE_LIST_ORDER : null;
  if (!order) return entries;
  const rank = (id: string) => {
    const i = order.indexOf(id);
    return i === -1 ? order.length : i;
  };
  return [...entries].sort((a, b) => rank(a.id) - rank(b.id));
}

export const BONFIRE_REGISTRY: BonfireEntry[] = [
  { id: 'bonfire_village',           name: 'Village Square',      mapId: 'village',       tileX: 120, tileY: 104 },
  // Must match maps.ts tile coords — unlock flag is bonfire_first_<mapId>_<x>_<y>
  { id: 'bonfire_hollow',            name: 'Riverside Grove',     mapId: 'forest',        tileX: 156, tileY: 154 },
  { id: 'bonfire_forest_fort',       name: 'Corrupted Bridge',    mapId: 'forest',        tileX: 124, tileY: 77  },
  { id: 'bonfire_forest_clearing',   name: 'Forest Clearing',     mapId: 'forest',        tileX: 148, tileY: 286 },
  // World ~(-15.5, 58.5) — slightly NE of old (130,206); legacy 130_206 still unlocks (see getKindledBonfiresForMap)
  { id: 'bonfire_forest_south',      name: 'Iron Gate',           mapId: 'forest',        tileX: 134, tileY: 208 },
  { id: 'bonfire_cliff_cemetery',    name: 'Cliff Cemetery',      mapId: 'forest',        tileX: 281, tileY: 145 },
  { id: 'bonfire_gilrhym_gate',       name: 'City Gate',           mapId: 'gilrhym',       tileX: 150, tileY: 268 },
  { id: 'bonfire_gilrhym_market',     name: 'Market Square',       mapId: 'gilrhym',       tileX: 150, tileY: 155 },
  { id: 'bonfire_gilrhym_heights',    name: 'The Heights',         mapId: 'gilrhym',       tileX: 140, tileY: 85  },
  { id: 'bonfire_gilrhym_cathedral',  name: 'Cathedral Steps',     mapId: 'gilrhym',       tileX: 150, tileY: 50  },
  { id: 'bonfire_hollow_arena',      name: 'The Hollow',          mapId: 'interior_hollow_arena', tileX: 18, tileY: 28 },
];

export function getBonfiresForMap(mapId: string): BonfireEntry[] {
  return sortBonfiresByMapProgression(mapId, BONFIRE_REGISTRY.filter(b => b.mapId === mapId));
}

export function getKindledBonfiresForMap(
  mapId: string,
  gameFlags: Record<string, boolean | number>,
): BonfireEntry[] {
  return sortBonfiresByMapProgression(
    mapId,
    getBonfiresForMap(mapId).filter(b => {
      const key = `bonfire_first_${b.mapId}_${b.tileX}_${b.tileY}`;
      if (gameFlags[key]) return true;
      // Legacy tile for Iron Gate bonfire before reposition to ~(world -15, 58)
      if (b.id === 'bonfire_forest_south' && Boolean(gameFlags[`bonfire_first_${b.mapId}_130_206`])) {
        return true;
      }
      return false;
    }),
  );
}
