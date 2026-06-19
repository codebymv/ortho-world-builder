import { WorldMap, Tile, TileType } from '@/lib/game/World';
import { TILE_METADATA } from './tiles';
import { HOLLOW_CORRUPTED_WATER_RECTS, reconcileHollowApproachWaterInRects } from './hollowCorruptedWater';
import { getClosedChestTileType, isChestTileType } from './specialChests';
import { enforceBonfireSanctuaryTiles } from '@/game/runtime/bonfireCombatGuard';
import { applyRevenantRitualDecor } from '@/game/runtime/revenantRitualDecor';


// Simple 2D noise
function noise2D(x: number, y: number, seed: number): number {
  const n = Math.sin(x * 12.9898 + y * 78.233 + seed) * 43758.5453;
  return n - Math.floor(n);
}

function smoothNoise(x: number, y: number, seed: number, scale: number = 8): number {
  const sx = x / scale;
  const sy = y / scale;
  const x0 = Math.floor(sx);
  const y0 = Math.floor(sy);
  let fx = sx - x0;
  let fy = sy - y0;
  // Smoothstep: t²(3-2t) - removes the linear gradient banding that creates visible grid lines
  fx = fx * fx * (3 - 2 * fx);
  fy = fy * fy * (3 - 2 * fy);

  const v00 = noise2D(x0, y0, seed);
  const v10 = noise2D(x0 + 1, y0, seed);
  const v01 = noise2D(x0, y0 + 1, seed);
  const v11 = noise2D(x0 + 1, y0 + 1, seed);

  const i0 = v00 * (1 - fx) + v10 * fx;
  const i1 = v01 * (1 - fx) + v11 * fx;
  return i0 * (1 - fy) + i1 * fy;
}

/** Fractional Brownian Motion - layers multiple octaves of smoothNoise for organic, non-grid terrain.
 *  Each octave halves amplitude and doubles frequency, adding fine detail on top of broad shapes. */
function octaveNoise(x: number, y: number, seed: number, scale: number, octaves: number = 3): number {
  let value = 0;
  let amplitude = 1;
  let norm = 0;
  for (let i = 0; i < octaves; i++) {
    const s = scale / Math.pow(2, i);
    value += smoothNoise(x, y, seed + i * 73, s) * amplitude;
    norm += amplitude;
    amplitude *= 0.5;
  }
  return value / norm;
}

export function createTile(
  type: TileType,
  walkable: boolean = true,
  options?: Partial<Tile>
): Tile {
  return { type, walkable, elevation: 0, ...options };
}

export interface ElevationZone {
  x: number;
  y: number;
  width: number;
  height: number;
  elevation: number;
}

export interface Stairway {
  x: number;
  y: number;
  width: number;
  height: number;
  elevation: number;
  /** Default `ns`: stride climbs along map ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â±Y (north/south). `ew`: rotate stair sprite 90ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â° for ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â±X approaches. */
  axis?: 'ns' | 'ew';
}

export interface Ladder {
  x: number;
  y: number;
  width: number;
  height: number;
  elevation: number;
}

export interface MapFeature {
  x: number;
  y: number;
  width: number;
  height: number;
  type: 'building' | 'inn_building' | 'lake' | 'clearing' | 'path' | 'wall' | 'ruins' | 'camp' | 'garden' | 'graveyard' | 'bridge' | 'bridge_corrupted' | 'bridge_decay_blend' | 'secret_cave' | 'cave_mouth' | 'destroyed_town' | 'temple' | 'waterfall' | 'volcano' | 'boss_arena' | 'abandoned_camp' | 'cemetery' | 'cliff_face' | 'farm' | 'iron_fence_border' | 'hedge_maze' | 'cobble_plaza' | 'forest_grove' | 'fort' | 'enchanted_grove' | 'church' | 'ruined_fort' | 'cottage' | 'watchtower' | 'broken_wagon' | 'market_stall_row';
  tiles?: Partial<Record<string, Tile>>; // specific tile overrides by "dx,dy"
  fill?: TileType;
  border?: TileType;
  /** For cemetery features: opens an additional gap on the east wall centred at this dy offset (±eastOpenHalf tiles). */
  eastOpenDY?: number;
  eastOpenHalf?: number;
  interactionId?: string;
  /** Door becomes a portal into this map (inn_building / optional cottage / cave_mouth) */
  interiorMap?: string;
  interiorSpawnX?: number;
  interiorSpawnY?: number;
  /** cave_mouth only: when true the mouth is the interior's EXIT (interactionId 'building_exit')
   *  rather than an entrance ('building_entrance'). Both are interact-to-use. */
  caveExit?: boolean;
  /** cave_mouth only: use the angled/side-facing sprite (for openings on a left/right cliff wall). */
  caveAngled?: boolean;
}

export interface MapDefinition {
  name: string;
  subtitle?: string;
  width: number;
  height: number;
  spawnPoint: { x: number; y: number };
  seed: number;
  baseTerrain: 'grassland' | 'forest' | 'swamp' | 'ruins' | 'dungeon' | 'city';
  borderTile: TileType;
  autoRoads?: boolean;
  /**
   * When provided, carveRoads connects ONLY these anchor points instead of
   * auto-connecting every feature. With `roadHub`, each anchor is carved from the hub
   * (hub-and-spoke). Without `roadHub`, anchors chain sequentially from spawn (spine).
   * Requires autoRoads !== false.
   */
  roadAnchors?: Array<{ x: number; y: number }>;
  /** Optional plaza/hub for roadAnchors; spokes radiate from here instead of chaining. */
  roadHub?: { x: number; y: number };
  /** When false, south map edge uses normal borderTile (e.g. inn rooms). Default: large overworld maps use sea cliff + ocean on the south edge. */
  coastalSouthBorder?: boolean;
  /** When true (and map is large), all four edges use the same sea cliff + deep water band as the south coast (Greenleaf-style rim on every side). */
  coastalBorderAllSides?: boolean;
  features: MapFeature[];
  portals: Array<{
    x: number;
    y: number;
    targetMap: string;
    targetX: number;
    targetY: number;
  }>;
  chests: Array<{
    x: number;
    y: number;
    interactionId: string;
  }>;
  interactables: Array<{
    x: number;
    y: number;
    type: TileType;
    walkable: boolean;
    interactionId: string;
  }>;
  /** Static props (no interaction) ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â furniture, dÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Â ÃƒÂ¢Ã¢â€šÂ¬Ã¢â€žÂ¢ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â©cor */
  props?: Array<{
    x: number;
    y: number;
    type: TileType;
    walkable: boolean;
  }>;
  secretAreas?: Array<{
    x: number;
    y: number;
    width: number;
    height: number;
    fill: TileType;
  }>;
  elevationZones?: ElevationZone[];
  stairways?: Stairway[];
  ladders?: Ladder[];
  enemyZones?: Array<{
    x: number;
    y: number;
    width: number;
    height: number;
    enemyType: string;
    count: number;
    /** Optional faction key. Enemies with different factions attack each other before targeting the player. */
    faction?: string;
    /** Optional idle patrol radius in world units (defaults to 2–4). */
    patrolRadius?: number;
  }>;
}

/** Number of tile rows reserved for the south coastal cliff + ocean. Must match stampCliffs protection. */
const COASTAL_SOUTH_ROWS = 6; // 1 cliff_edge cap + 3 cliff body + 2 water rows

/** Tall cliff sprites overlap into rows just south of cliff tiles; keep them unwalkable for collision/feel. */
const CLIFF_SPRITE_BUFFER_ROWS = 2;

function hasCoastalSouthBorder(def: MapDefinition): boolean {
  if (def.coastalSouthBorder === false) return false;
  return def.width >= 48 && def.height >= 48;
}

function hasCoastalAllSides(def: MapDefinition): boolean {
  return def.coastalBorderAllSides === true && def.width >= 48 && def.height >= 48;
}

function coastalBandTile(relFromOuter: number): Tile {
  if (relFromOuter <= 1) {
    return createTile('water', false);
  }
  if (relFromOuter === COASTAL_SOUTH_ROWS - 1) {
    return createTile('cliff_edge', false);
  }
  return createTile('cliff', false);
}

const STRUCTURE_FEATURE_TYPES: Set<MapFeature['type']> = new Set([
  'building', 'inn_building', 'cottage', 'watchtower', 'church', 'temple', 'fort', 'ruined_fort', 'farm', 'cemetery'
]);
const STRUCTURE_FEATURE_SPACING = 8;

/** Tile Y in [0, 58] ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¡ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¾Ãƒâ€šÃ‚Â¢ world y ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â°ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¤ -91 (Deep Hollow: bleached ground + heavy fog). */
const DEEP_HOLLOW_TILE_Y_MAX = 59;

function areStructureFeaturesTooClose(a: MapFeature, b: MapFeature): boolean {
  const pad = STRUCTURE_FEATURE_SPACING;
  return !(
    a.x + a.width + pad <= b.x ||
    b.x + b.width + pad <= a.x ||
    a.y + a.height + pad <= b.y ||
    b.y + b.height + pad <= a.y
  );
}

function generateBaseTerrain(def: MapDefinition): Tile[][] {
  const tiles: Tile[][] = [];
  for (let y = 0; y < def.height; y++) {
    const row: Tile[] = [];
    for (let x = 0; x < def.width; x++) {
      const borderSize = 2;
      const S = COASTAL_SOUTH_ROWS;
      const allSides = hasCoastalAllSides(def);

      if (allSides) {
        if (y < S) {
          row.push(coastalBandTile(y));
          continue;
        }
        if (def.height - 1 - y < S) {
          row.push(coastalBandTile(def.height - 1 - y));
          continue;
        }
        if (x < S) {
          row.push(coastalBandTile(x));
          continue;
        }
        if (def.width - 1 - x < S) {
          row.push(coastalBandTile(def.width - 1 - x));
          continue;
        }
      } else {
        // South edge (low y = screen bottom): dramatic sea cliff + ocean, full width on large maps.
        if (hasCoastalSouthBorder(def) && y < S) {
          row.push(coastalBandTile(y));
          continue;
        }
        if (x < borderSize || x >= def.width - borderSize || y < borderSize || y >= def.height - borderSize) {
          row.push(createTile(def.borderTile, false));
          continue;
        }
      }

      // n1 uses octave noise for organic, non-grid tree distribution.
      // n2/n3 stay single-sample for fine detail (mushrooms, rocks, flowers).
      const n1 = def.baseTerrain === 'forest'
        ? octaveNoise(x, y, def.seed, 16, 3)
        : smoothNoise(x, y, def.seed, 12);
      const n2 = smoothNoise(x, y, def.seed + 100, 6);
      const n3 = smoothNoise(x, y, def.seed + 200, 20);

      let tile: Tile;

      switch (def.baseTerrain) {
        case 'grassland':
          if (n1 < 0.05 && n2 > 0.6) {
            tile = createTile('flower', true);
          } else if (n1 > 0.85 && n2 > 0.5) {
            tile = createTile('tree', false);
          } else if (n2 < 0.1) {
            tile = createTile('rock', false);
          } else if (n3 > 0.7 && n1 > 0.6) {
            tile = createTile('tall_grass', true);
          } else if (n1 > 0.82 && n2 < 0.35) {
            tile = createTile('stump', false);
          } else if (n1 < 0.08 && n3 > 0.75) {
            tile = createTile('mushroom', true);
          } else if (n3 > 0.78 && n1 > 0.4 && n1 < 0.5) {
            tile = createTile('dark_grass', true);
          } else {
            tile = createTile('grass', true);
          }
          break;

        case 'forest': {
          const inHollow = y < 75;
          const inDeepHollow = def.name === 'Whispering Woods' && y < DEEP_HOLLOW_TILE_Y_MAX;
          if (n1 > 0.45) {
            tile = createTile(inHollow && n2 > 0.25 ? 'dead_tree' : 'tree', false);
          } else if (n1 > 0.35 && n2 > 0.5) {
            tile = createTile(inHollow && n2 > 0.4 ? 'dead_tree' : 'tree', false);
          } else if (n2 < 0.08) {
            tile = createTile('mushroom', true);
          } else if (inHollow && n3 > 0.85) {
            tile = createTile('bones', true);
          } else if (!inHollow && n1 > 0.28 && n1 < 0.32 && n2 > 0.6) {
            tile = createTile('rock', false);
          } else if (!inHollow && n1 > 0.20 && n1 < 0.23 && n3 > 0.5) {
            tile = createTile('flower', true);
          } else if (!inHollow && n1 > 0.32 && n1 < 0.35 && n2 < 0.3) {
            tile = createTile('stump', false);
          } else if (!inHollow && noise2D(x, y, def.seed + 400) > 0.86) {
            // 50/50 horizontal vs vertical orientation, picked per-tile by an independent noise channel
            const isVertical = noise2D(x, y, def.seed + 500) > 0.5;
            tile = createTile(isVertical ? 'fallen_log_v' : 'fallen_log', false);
          } else if (n1 < 0.15) {
            tile = createTile('tall_grass', true);
          } else {
            tile = createTile(
              inHollow ? (inDeepHollow ? 'hollow_blight' : 'dark_grass') : 'grass',
              true,
            );
          }
          break;
        }

        case 'swamp':
          if (n1 < 0.3) {
            tile = createTile('water', false);
          } else if (n1 < 0.45) {
            tile = createTile('swamp', true);
          } else if (n1 > 0.8) {
            tile = createTile('tree', false);
          } else if (n2 < 0.1) {
            tile = createTile('mushroom', true);
          } else {
            tile = createTile('grass', true);
          }
          break;

        case 'ruins':
          if (n1 > 0.7) {
            tile = createTile('stone', false);
          } else if (n1 > 0.55) {
            tile = createTile('stone', true);
          } else if (n2 < 0.1) {
            tile = createTile('rock', false);
          } else {
            tile = createTile('stone', true);
          }
          break;

        case 'city':
          // Deterministic, uniform ground. City maps are authored at 100% intent:
          // ALL texture variation (cobblestone_dark accents, brick foundations,
          // bones, sewer grates, etc.) is placed explicitly via features/props, so
          // the base layer carries no procedural noise - never a "is that meant to
          // be here?" tile. Variation is reintroduced only by authored content.
          tile = createTile('cobblestone', true);
          break;

        case 'dungeon':
          if (n1 > 0.6) {
            tile = createTile('stone', false);
          } else {
            tile = createTile('stone', true);
          }
          break;

        default:
          tile = createTile('grass', true);
      }

      row.push(tile);
    }
    tiles.push(row);
  }

  return tiles;
}

function carveRoads(tiles: Tile[][], def: MapDefinition) {
  // Authored mode: deliberate network instead of auto-connecting every feature center.
  if (def.roadAnchors && def.roadAnchors.length > 0) {
    const hub = def.roadHub ?? def.spawnPoint;

    if (hub.x !== def.spawnPoint.x || hub.y !== def.spawnPoint.y) {
      carvePath(tiles, def.spawnPoint.x, def.spawnPoint.y, hub.x, hub.y, 'dirt', 2);
    }

    if (def.roadHub) {
      for (const anchor of def.roadAnchors) {
        carvePath(tiles, hub.x, hub.y, anchor.x, anchor.y, 'dirt', 2);
      }
    } else {
      const points = [def.spawnPoint, ...def.roadAnchors];
      for (let i = 0; i < points.length - 1; i++) {
        const from = points[i];
        const to = points[i + 1];
        carvePath(tiles, from.x, from.y, to.x, to.y, 'dirt', 2);
      }
    }
    return;
  }

  // Default mode: carve paths between portals and spawn, and between features
  const points = [
    def.spawnPoint,
    ...def.portals.map(p => ({ x: p.x, y: p.y })),
    ...def.features.filter(f => f.type !== 'wall' && f.type !== 'fort').map(f => ({ x: f.x + Math.floor(f.width / 2), y: f.y + Math.floor(f.height / 2) })),
  ];

  for (let i = 0; i < points.length - 1; i++) {
    const from = points[i];
    const to = points[i + 1];
    carvePath(tiles, from.x, from.y, to.x, to.y, 'dirt', 2);
  }

  // Also connect spawn to the first chest if any
  if (def.chests.length > 0) {
    carvePath(tiles, def.spawnPoint.x, def.spawnPoint.y, def.chests[0].x, def.chests[0].y, 'dirt', 1);
  }
}

function carvePath(tiles: Tile[][], x1: number, y1: number, x2: number, y2: number, pathType: TileType, width: number) {
  const ROAD_CARVE_PROTECTED: Set<TileType> = new Set([
    'house', 'house_entry',
    'house_blue', 'house_blue_entry',
    'house_green', 'house_green_entry',
    'house_thatch', 'house_thatch_entry',
    'cottage_house', 'cottage_house_entry', 'cottage_house_forest', 'cottage_house_forest_ruined', 'cottage_house_ranger', 'cottage_shed',
    'door', 'door_interior', 'door_iron',
    'lantern', 'iron_fence', 'wood',
    'stone', 'mossy_stone', 'gate',
  ]);

  let cx = x1;
  let cy = y1;

  while (cx !== x2 || cy !== y2) {
    for (let dy = -Math.floor(width / 2); dy <= Math.floor(width / 2); dy++) {
      for (let dx = -Math.floor(width / 2); dx <= Math.floor(width / 2); dx++) {
        const tx = cx + dx;
        const ty = cy + dy;
        if (ty >= 2 && ty < tiles.length - 2 && tx >= 2 && tx < tiles[0].length - 2) {
          const existing = tiles[ty][tx];
          // PATH_BLOCKERS (trees, rocks) are non-walkable but intentionally clearable by roads.
          // Everything else non-walkable (building interiors, cliff tiles, foundations) must not
          // be overwritten ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â roads should go around them, not through them.
          const isCarveableBlocker = !existing.walkable && PATH_BLOCKERS.has(existing.type);
          if (
            existing.type !== 'portal' &&
            !isChestTileType(existing.type) &&
            !existing.interactable &&
            !ROAD_CARVE_PROTECTED.has(existing.type) &&
            (existing.walkable || isCarveableBlocker)
          ) {
            tiles[ty][tx] = createTile(pathType, true);
          }
        }
      }
    }

    // Move towards target (L-shaped paths)
    if (Math.abs(cx - x2) > Math.abs(cy - y2)) {
      cx += cx < x2 ? 1 : -1;
    } else {
      cy += cy < y2 ? 1 : -1;
    }
  }
}

function placeFeatures(tiles: Tile[][], def: MapDefinition) {
  const placedStructures: MapFeature[] = [];

  for (const feature of def.features) {
    const isStructureFeature = STRUCTURE_FEATURE_TYPES.has(feature.type);
    if (isStructureFeature) {
      const tooCloseToPlacedStructure = placedStructures.some(existing =>
        areStructureFeaturesTooClose(existing, feature)
      );
      if (tooCloseToPlacedStructure) continue;
    }

    switch (feature.type) {
      case 'building':
        placeBuilding(tiles, feature, false, def.baseTerrain);
        break;
      case 'inn_building':
        if (feature.interactionId === 'ranger_cabin') {
          placeCottage(tiles, feature);
        } else {
          placeBuilding(tiles, feature, true, def.baseTerrain);
        }
        break;
      case 'broken_wagon':
        placeBrokenWagon(tiles, feature, def.baseTerrain);
        break;
      case 'market_stall_row':
        placeMarketStallRow(tiles, feature);
        break;
      case 'lake':
        placeLake(tiles, feature);
        break;
      case 'clearing':
        placeClearing(tiles, feature);
        break;
      case 'wall':
        placeWall(tiles, feature, def.baseTerrain);
        break;
      case 'ruins':
        placeRuinsFeature(tiles, feature);
        break;
      case 'camp':
        placeCamp(tiles, feature);
        break;
      case 'garden':
        placeGarden(tiles, feature);
        break;
      case 'graveyard':
        placeGraveyard(tiles, feature);
        break;
      case 'bridge':
        placeBridge(tiles, feature);
        break;
      case 'bridge_corrupted':
        placeBridgeCorrupted(tiles, feature);
        break;
      case 'bridge_decay_blend':
        placeBridgeDecayBlend(tiles, feature);
        break;
      case 'path':
        placePath(tiles, feature);
        break;
      case 'destroyed_town':
        placeDestroyedTown(tiles, feature);
        break;
      case 'temple':
        placeTemple(tiles, feature);
        break;
      case 'waterfall':
        placeWaterfall(tiles, feature);
        break;
      case 'volcano':
        placeVolcano(tiles, feature);
        break;
      case 'boss_arena':
        placeBossArena(tiles, feature);
        break;
      case 'abandoned_camp':
        placeAbandonedCamp(tiles, feature);
        break;
      case 'cemetery':
        placeCemetery(tiles, feature);
        break;
      case 'cliff_face':
        placeCliffFace(tiles, feature);
        break;
      case 'cave_mouth':
        placeCaveMouth(tiles, feature);
        break;
      case 'farm':
        placeFarm(tiles, feature);
        break;
      case 'iron_fence_border':
        placeIronFenceBorder(tiles, feature);
        break;
      case 'hedge_maze':
        placeHedgeMaze(tiles, feature);
        break;
      case 'cobble_plaza':
        placeCobblePlaza(tiles, feature, def.baseTerrain);
        break;
      case 'forest_grove':
        placeForestGrove(tiles, feature);
        break;
      case 'fort':
        placeFort(tiles, feature);
        break;
      case 'enchanted_grove':
        placeEnchantedGrove(tiles, feature);
        break;
      case 'church':
        placeChurch(tiles, feature);
        break;
      case 'ruined_fort':
        placeRuinedFort(tiles, feature);
        break;
      case 'cottage':
        placeCottage(tiles, feature);
        break;
      case 'watchtower':
        placeWatchtower(tiles, feature);
        break;
    }

    if (isStructureFeature) {
      placedStructures.push(feature);
    }
  }
}

const HOUSE_VARIANTS: TileType[] = ['house', 'house_blue', 'house_green', 'house_thatch'];
// Guilrhym (and any `city` baseTerrain) building masses use the Victorian facade kit
// instead of the rural cottage overlays, so the city never inherits Whispering Woods imagery.
const CITY_FACADE_VARIANTS: TileType[] = ['townhouse_facade', 'tenement_facade', 'warehouse_facade'];
const HOUSE_TYPES: Set<TileType> = new Set([
  'house', 'house_entry',
  'house_blue', 'house_blue_entry',
  'house_green', 'house_green_entry',
  'house_thatch', 'house_thatch_entry',
  'cottage_house', 'cottage_house_entry', 'cottage_house_forest', 'cottage_house_forest_ruined', 'cottage_house_ranger', 'cottage_shed',
]);
// All tile types that indicate a structure is present (for spacing checks)
const STRUCTURE_TYPES: Set<TileType> = new Set([
  'house', 'house_entry',
  'house_blue', 'house_blue_entry',
  'house_green', 'house_green_entry',
  'house_thatch', 'house_thatch_entry',
  'cottage_house', 'cottage_house_entry', 'cottage_house_forest', 'cottage_house_forest_ruined', 'cottage_house_ranger', 'cottage_shed',
  'destroyed_house', 'statue', 'mossy_stone', 'well',
]);
const MIN_BUILDING_SPACING = 16; // minimum tiles between any two buildings (increased from 12)

function isBuildingNearby(tiles: Tile[][], fx: number, fy: number, fw: number, fh: number): boolean {
  const checkPad = MIN_BUILDING_SPACING;
  const h = tiles.length;
  const w = tiles[0].length;
  for (let dy = -checkPad; dy < fh + checkPad; dy++) {
    for (let dx = -checkPad; dx < fw + checkPad; dx++) {
      // Skip the building's own footprint
      if (dx >= 0 && dx < fw && dy >= 0 && dy < fh) continue;
      const tx = fx + dx;
      const ty = fy + dy;
      if (ty >= 0 && ty < h && tx >= 0 && tx < w) {
        if (STRUCTURE_TYPES.has(tiles[ty][tx].type)) return true;
      }
    }
  }
  return false;
}

function isOnInvalidTerrain(tiles: Tile[][], fx: number, fy: number, fw: number, fh: number): boolean {
  const h = tiles.length;
  const w = tiles[0].length;
  const BAD_TERRAIN: Set<TileType> = new Set(['water', 'water_corrupted', 'lava', 'swamp', 'ice', 'waterfall']);
  let badCount = 0;
  let total = 0;
  for (let dy = -1; dy < fh + 1; dy++) {
    for (let dx = -1; dx < fw + 1; dx++) {
      const tx = fx + dx;
      const ty = fy + dy;
      if (ty >= 0 && ty < h && tx >= 0 && tx < w) {
        total++;
        if (BAD_TERRAIN.has(tiles[ty][tx].type)) badCount++;
      }
    }
  }
  // Skip if more than 20% of footprint+border is bad terrain
  return badCount / total > 0.2;
}

function placeBuilding(tiles: Tile[][], f: MapFeature, interiorPortal: boolean, baseTerrain?: string) {
  const isCity = baseTerrain === 'city';
  // Skip if this building would be on water/lava or too close to another building.
  // Market / inn cluster buildings are intentionally adjacent so skip the spacing guard for them.
  const allowNearbyCluster = /shop_|^inn$|witch_hut/.test(f.interactionId ?? '');
  if (isOnInvalidTerrain(tiles, f.x, f.y, f.width, f.height)) return;
  if (!allowNearbyCluster && isBuildingNearby(tiles, f.x, f.y, f.width, f.height)) return;

  if (interiorPortal && (!f.interiorMap || f.interiorSpawnX === undefined || f.interiorSpawnY === undefined)) {
    return;
  }

  // Pick a deterministic house variant based on position
  const baseVariant: TileType = f.interactionId === 'ranger_cabin'
    ? 'cottage_house_forest'
    : HOUSE_VARIANTS[(f.x * 7 + f.y * 13) % HOUSE_VARIANTS.length];
  const variant: TileType = interiorPortal
    ? (
        baseVariant === 'house' ? 'house_entry' :
        baseVariant === 'house_blue' ? 'house_blue_entry' :
        baseVariant === 'house_green' ? 'house_green_entry' :
        baseVariant === 'house_thatch' ? 'house_thatch_entry' :
        baseVariant
      )
    : baseVariant;
  
  // City building aprons blend into the cobblestone base (no orange brick halos).
  // City maps are authored at 100% intent - brick is placed explicitly where wanted.
  const yardFill: TileType = isCity ? 'cobblestone' : 'grass';
  // First, clear a yard around the building (3-tile border)
  const yardPad = 4;
  for (let dy = -yardPad; dy < f.height + yardPad; dy++) {
    for (let dx = -yardPad; dx < f.width + yardPad; dx++) {
      const tx = f.x + dx;
      const ty = f.y + dy;
      if (ty >= 0 && ty < tiles.length && tx >= 0 && tx < tiles[0].length) {
        const existing = tiles[ty][tx];
        if (HOUSE_TYPES.has(existing.type) || existing.type === 'portal' || 
            isChestTileType(existing.type) || existing.interactable) continue;
        if (!existing.walkable || existing.type === 'water' || existing.type === 'water_corrupted' || existing.type === 'tree' || 
            existing.type === 'rock' || existing.type === 'swamp') {
          tiles[ty][tx] = createTile(yardFill, true);
        }
      }
    }
  }

  if (interiorPortal) {
    const centerX = Math.floor(f.width / 2);
    const entryY = f.y + f.height - 3;
    const thresholdY = f.y + f.height - 1;
    const frontY = f.y + f.height;
    const facadeRow = Math.max(1, f.height - 2);
    const entryTransition = {
      targetMap: f.interiorMap!,
      targetX: f.interiorSpawnX!,
      targetY: f.interiorSpawnY!,
    };

    for (let dy = 0; dy < f.height; dy++) {
      for (let dx = 0; dx < f.width; dx++) {
        const tx = f.x + dx;
        const ty = f.y + dy;
        if (ty < 0 || ty >= tiles.length || tx < 0 || tx >= tiles[0].length) continue;

        if (dx === centerX && dy === facadeRow) {
          // Shop/inn exteriors use a single full facade sprite with its own baked-in door art.
          // Keep the transition trigger invisible, like cottages, so we don't get a loose door tile.
          tiles[ty][tx] = createTile(variant, false);
        } else if (dx === centerX && dy === f.height - 1) {
          // Match cottage behavior: keep a solid threshold/foundation under the facade
          // and put the exterior entrance trigger on the approach tile(s) in front of it.
          tiles[ty][tx] = createTile('dirt', false);
        } else if (dy >= f.height - 3) {
          // Match placeCottage: block the whole depth band so wide facade sprites align with collision.
          tiles[ty][tx] = createTile('dirt', false);
        } else if (dy === f.height - 1 && (dx === centerX - 1 || dx === centerX + 1) && f.width >= 4) {
          tiles[ty][tx] = createTile(isCity ? 'street_lamp' : 'lantern', false);
        } else {
          // Block all remaining interior tiles. Only the building_entrance stamps (entryY / frontY)
          // selectively restore walkability so players cannot side-enter through upper body rows.
          tiles[ty][tx] = createTile('dirt', false);
        }
      }
    }

    if (entryY >= 0 && entryY < tiles.length) {
      tiles[entryY][f.x + centerX] = createTile('dirt', true, {
        transition: entryTransition,
        interactable: true,
        interactionId: 'building_entrance',
      });
    }

    if (frontY >= 0 && frontY < tiles.length) {
      const frontTile = tiles[frontY][f.x + centerX];
      if (!frontTile.interactable) {
        tiles[frontY][f.x + centerX] = createTile('dirt', true, {
          transition: entryTransition,
          interactable: true,
          interactionId: 'building_entrance',
        });
      }
    }

    for (let step = 2; step <= 4; step++) {
      const ty = thresholdY + step;
      const tx = f.x + centerX;
      if (ty >= 0 && ty < tiles.length && tx >= 0 && tx < tiles[0].length) {
        tiles[ty][tx] = createTile('dirt', true);
      }
    }

    return;
  }

  // One centered house sprite per building ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â each sprite is scale 2.2 so it visually
  // spans the full facade. Multiple side-by-side sprites produce a "stacked houses" look.
  // City masses: a solid stone block fronted by one or more Victorian facade sprites
  // (anchored at the block's south base, rising north). No rural cottage overlay, no
  // dirt/wood - the city reads as stone, never as a Whispering Woods homestead.
  if (isCity) {
    const facadeType = CITY_FACADE_VARIANTS[(f.x * 7 + f.y * 13) % CITY_FACADE_VARIANTS.length];
    const cityBodyRows = Math.max(2, Math.ceil(f.height * 0.5));
    const cityHasDoor = !!f.interactionId;
    const cx = Math.floor(f.width / 2);
    for (let dy = 0; dy < f.height; dy++) {
      for (let dx = 0; dx < f.width; dx++) {
        const tx = f.x + dx;
        const ty = f.y + dy;
        if (ty < 0 || ty >= tiles.length || tx < 0 || tx >= tiles[0].length) continue;
        if (cityHasDoor && dx === cx && dy === f.height - 1) {
          tiles[ty][tx] = createTile('cobblestone', true, { interactable: true, interactionId: f.interactionId });
        } else if (dy < cityBodyRows) {
          tiles[ty][tx] = createTile('stone', false);
        } else if (cityHasDoor && dy === f.height - 1 && (dx === cx - 1 || dx === cx + 1) && f.width >= 4) {
          tiles[ty][tx] = createTile('street_lamp', false);
        } else {
          tiles[ty][tx] = createTile('cobblestone', true);
        }
      }
    }
    // Facade sprites along the south edge of the solid mass, butted into a terrace.
    const anchorY = f.y + cityBodyRows - 1;
    for (let ax = f.x + 2; ax <= f.x + f.width - 2; ax += 5) {
      if (anchorY < 0 || anchorY >= tiles.length || ax < 0 || ax >= tiles[0].length) continue;
      tiles[anchorY][ax] = createTile(facadeType, false);
    }
    if (cityHasDoor) {
      const doorX = f.x + cx;
      for (let dy = 1; dy <= 3; dy++) {
        const ty = f.y + f.height - 1 + dy;
        if (ty >= 0 && ty < tiles.length && doorX >= 0 && doorX < tiles[0].length) {
          const existing = tiles[ty][doorX];
          if (existing.walkable) tiles[ty][doorX] = createTile('cobblestone', true);
        }
      }
    }
    return;
  }

  const houseWidth = 1;
  const houseStartX = Math.floor(f.width / 2);
  const facadeRow = 0;
  // The "body" rows are 0..bodyRows-1 (solid stone wall, no entry).
  // The "apron" rows are bodyRows..height-1 (walkable stone floor in front of building).
  const bodyRows = Math.max(2, Math.ceil(f.height * 0.5));

  const hasDoor = !!(f.interactionId || interiorPortal);

  for (let dy = 0; dy < f.height; dy++) {
    for (let dx = 0; dx < f.width; dx++) {
      const tx = f.x + dx;
      const ty = f.y + dy;
      if (ty >= 0 && ty < tiles.length && tx >= 0 && tx < tiles[0].length) {
        if (hasDoor && dx === Math.floor(f.width / 2) && dy === f.height - 1) {
          if (interiorPortal && f.interiorMap && f.interiorSpawnX !== undefined && f.interiorSpawnY !== undefined) {
            tiles[ty][tx] = createTile('door', true, {
              transition: { targetMap: f.interiorMap, targetX: f.interiorSpawnX, targetY: f.interiorSpawnY },
              interactable: true,
              interactionId: 'building_entrance',
            });
          } else {
            tiles[ty][tx] = createTile('dirt', true, { interactable: true, interactionId: f.interactionId });
          }
        } else if (dy === facadeRow && dx >= houseStartX && dx < houseStartX + houseWidth) {
          tiles[ty][tx] = hasDoor ? createTile(variant, false) : createTile('cottage_shed', false);
        } else if (dy < bodyRows) {
          tiles[ty][tx] = createTile('wood', false);
        } else if (hasDoor && dy === f.height - 1 && (dx === Math.floor(f.width / 2) - 1 || dx === Math.floor(f.width / 2) + 1) && f.width >= 4) {
          tiles[ty][tx] = createTile(isCity ? 'street_lamp' : 'lantern', false);
        } else {
          tiles[ty][tx] = createTile('dirt', true);
        }
      }
    }
  }

  // Only stamp a dirt approach path for buildings that have a door
  if (hasDoor) {
    const doorX = f.x + Math.floor(f.width / 2);
    for (let dy = 1; dy <= 4; dy++) {
      const ty = f.y + f.height - 1 + dy;
      if (ty >= 0 && ty < tiles.length && doorX >= 0 && doorX < tiles[0].length) {
        const existing = tiles[ty][doorX];
        if (existing.walkable || existing.type === 'grass' || existing.type === 'tall_grass') {
          tiles[ty][doorX] = createTile('dirt', true);
        }
      }
    }
  }
}

function placeBrokenWagon(tiles: Tile[][], f: MapFeature, baseTerrain?: string) {
  // On stone cities the wagon sits on cobblestone, not a rural dirt patch.
  const groundFill: TileType = baseTerrain === 'city' ? 'cobblestone' : 'dirt';
  for (let dy = 0; dy < f.height; dy++) {
    for (let dx = 0; dx < f.width; dx++) {
      const tx = f.x + dx;
      const ty = f.y + dy;
      if (ty >= 0 && ty < tiles.length && tx >= 0 && tx < tiles[0].length) {
        tiles[ty][tx] = createTile(groundFill, true);
      }
    }
  }
  const cx = f.x + Math.floor(f.width / 2);
  const cy = f.y + Math.floor(f.height / 2);
  if (cy < tiles.length && cx >= 0 && cx < tiles[0].length) {
    tiles[cy][cx] = createTile('wagon', false);
  }
  if (cy < tiles.length && cx - 1 >= f.x && cx - 1 < tiles[0].length) {
    tiles[cy][cx - 1] = createTile('crate', false);
  }
  if (cy < tiles.length && cx + 1 < f.x + f.width && cx + 1 < tiles[0].length) {
    tiles[cy][cx + 1] = createTile('bones', true);
  }
  if (f.height >= 2 && cy - 1 >= f.y) {
    tiles[cy - 1][cx] = createTile('cart', false);
  }
}

function placeMarketStallRow(tiles: Tile[][], f: MapFeature) {
  for (let dx = 0; dx < f.width; dx++) {
    const tx = f.x + dx;
    const ty = f.y;
    if (ty >= 0 && ty < tiles.length && tx >= 0 && tx < tiles[0].length) {
      tiles[ty][tx] = createTile('market_stall', false);
    }
  }
}

function placeProps(tiles: Tile[][], def: MapDefinition) {
  for (const p of def.props ?? []) {
    if (p.y >= 0 && p.y < tiles.length && p.x >= 0 && p.x < tiles[0].length) {
      const existing = tiles[p.y][p.x];
      if (
        PROTECTED_INTERACTIVE_TILES.has(existing.type) ||
        existing.interactable
      ) {
        continue;
      }
      tiles[p.y][p.x] = createTile(p.type, p.walkable);
    }
  }
}

function applyPropFoundations(tiles: Tile[][], def: MapDefinition) {
  for (const p of def.props ?? []) {
    const foundation = TILE_METADATA[p.type]?.foundation;
    if (!foundation) continue;

    const targets: Array<{ tx: number; ty: number }> = [];
    if (foundation.rows && foundation.rows.length > 0) {
      for (const row of foundation.rows) {
        for (let x = row.xMin; x <= row.xMax; x++) {
          targets.push({ tx: p.x + x, ty: p.y + row.y });
        }
      }
    } else {
      for (let dy = 0; dy < foundation.height; dy++) {
        for (let dx = 0; dx < foundation.width; dx++) {
          targets.push({ tx: p.x + foundation.x + dx, ty: p.y + foundation.y + dy });
        }
      }
    }

    for (const { tx, ty } of targets) {
      if (ty < 0 || ty >= tiles.length || tx < 0 || tx >= tiles[0].length) continue;

      const existing = tiles[ty][tx];
      const isAnchor = tx === p.x && ty === p.y;
      if (isAnchor) {
        // Overlay prop stays on the anchor tile for rendering; still enforce solid collision.
        tiles[ty][tx] = createTile(p.type, false, {
          elevation: existing.elevation,
          hidden: existing.hidden,
          interactable: existing.interactable,
          interactionId: existing.interactionId,
        });
        continue;
      }

      if (
        PROTECTED_INTERACTIVE_TILES.has(existing.type) ||
        existing.interactable
      ) {
        continue;
      }

      tiles[ty][tx] = foundation.tile
        ? createTile(foundation.tile, foundation.walkable, { elevation: existing.elevation })
        : createTile(resolveInvisibleFoundationTileType(tiles, tx, ty), foundation.walkable, {
            elevation: existing.elevation,
            hidden: existing.hidden,
          });
    }

    // Walkable aprons last so they win over solid collision rows at the same cells.
    for (const row of foundation.clearRows ?? []) {
      for (let x = row.xMin; x <= row.xMax; x++) {
        const tx = p.x + x;
        const ty = p.y + row.y;
        if (ty < 0 || ty >= tiles.length || tx < 0 || tx >= tiles[0].length) continue;

        const existing = tiles[ty][tx];
        if (
          PROTECTED_INTERACTIVE_TILES.has(existing.type) ||
          existing.interactable
        ) {
          continue;
        }

        tiles[ty][tx] = createTile(resolveInvisibleFoundationTileType(tiles, tx, ty), true, {
          elevation: existing.elevation,
          hidden: existing.hidden,
        });
      }
    }
  }
}

/** Riverside broken bridge (146–153): keep north + south spine stair approaches open after late passes. */
function enforceRiversideBridgeSpineApproach(tiles: Tile[][], def: MapDefinition) {
  if (def.name !== 'Whispering Woods') return;

  const stampStairs = (yMin: number, yMax: number) => {
    for (let ty = yMin; ty <= yMax; ty++) {
      for (let tx = 146; tx <= 153; tx++) {
        if (ty < 0 || ty >= tiles.length || tx < 0 || tx >= tiles[0].length) continue;
        const existing = tiles[ty][tx];
        if (existing.transition || existing.interactable) continue;
        if (PROTECTED_INTERACTIVE_TILES.has(existing.type)) continue;
        tiles[ty][tx] = createTile('stairs', true, { elevation: existing.elevation ?? 1 });
      }
    }
  };

  stampStairs(162, 164);

  // Riverside Grove bonfire corridor: lanterns on the spine column must not block the dirt path.
  for (let ty = 149; ty <= 156; ty++) {
    for (let tx = 146; tx <= 153; tx++) {
      if (ty < 0 || ty >= tiles.length || tx < 0 || tx >= tiles[0].length) continue;
      const existing = tiles[ty][tx];
      if (existing.type !== 'lantern') continue;
      if (existing.transition || existing.interactable) continue;
      tiles[ty][tx] = createTile('dirt', true, { elevation: existing.elevation ?? 1, spinePath: true });
    }
  }

  stampStairs(152, 154);
}

/** Western bypass observatory (131,222): restore bypass path + front meadow after foundation/cliff passes. */
function enforceWesternBypassObservatoryApproach(tiles: Tile[][], def: MapDefinition) {
  if (def.name !== 'Whispering Woods') return;

  const setTile = (tx: number, ty: number, type: TileType, walkable: boolean) => {
    if (ty < 0 || ty >= tiles.length || tx < 0 || tx >= tiles[0].length) return;
    const existing = tiles[ty][tx];
    if (existing.transition || existing.interactable) return;
    if (PROTECTED_INTERACTIVE_TILES.has(existing.type)) return;
    tiles[ty][tx] = createTile(type, walkable, { elevation: existing.elevation ?? 0 });
  };
  const reopenInvisibleTerrain = (tx: number, ty: number) => {
    if (ty < 0 || ty >= tiles.length || tx < 0 || tx >= tiles[0].length) return;
    const existing = tiles[ty][tx];
    if (existing.transition || existing.interactable) return;
    if (existing.type !== 'grass' && existing.type !== 'dirt') return;
    tiles[ty][tx] = { ...existing, walkable: true };
  };

  // East-west bypass in front of the tower (UI y ~ 64–67).
  for (let ty = 214; ty <= 217; ty++) {
    for (let tx = 110; tx <= 128; tx++) setTile(tx, ty, 'dirt', true);
  }
  // Cliff-1 sprite-buffer rows - reopen the authored clearing west of the tower base.
  for (let ty = 212; ty <= 213; ty++) {
    for (let tx = 110; tx <= 121; tx++) setTile(tx, ty, 'grass', true);
  }
  // The observatory footprint preserves the underlying grass/dirt while making it solid.
  // At the western-bypass tower, that invisible mask spills into the authored connector
  // north/east of the structure. Reopen only grass/dirt route cells; the observatory
  // anchor, real cliff, props, and the lower tower body remain blocked.
  for (let ty = 212; ty <= 218; ty++) {
    for (let tx = 127; tx <= 136; tx++) reopenInvisibleTerrain(tx, ty);
  }
  // Keep the player from hitting an invisible wall before reaching the visible base.
  // These two rows sit just below the rendered observatory footprint at this placement.
  for (let ty = 219; ty <= 220; ty++) {
    for (let tx = 128; tx <= 135; tx++) reopenInvisibleTerrain(tx, ty);
  }
  // The observatory's shared foundation mask now preserves underlying terrain while blocking
  // the sprite footprint, so do not stamp a separate visible stone rectangle here.
}

/** North fort approach observatory (66,249): reopen skirt lanes after the shared foundation mask. */
function enforceNorthFortApproachObservatory(tiles: Tile[][], def: MapDefinition) {
  if (def.name !== 'Whispering Woods') return;

  const reopenInvisibleTerrain = (tx: number, ty: number) => {
    if (ty < 0 || ty >= tiles.length || tx < 0 || tx >= tiles[0].length) return;
    const existing = tiles[ty][tx];
    if (existing.transition || existing.interactable) return;
    if (existing.type !== 'grass' && existing.type !== 'dirt') return;
    tiles[ty][tx] = { ...existing, walkable: true };
  };

  // East-west skirt north of the dome base — keeps the wayfarer cache lane (tile 87,249) reachable
  // without dead-ending on invisible collision north/east of the tower body.
  for (let ty = 246; ty <= 248; ty++) {
    for (let tx = 70; tx <= 90; tx++) reopenInvisibleTerrain(tx, ty);
  }
  // South entrance apron — rows just below the rendered footprint at this placement.
  for (let ty = 254; ty <= 256; ty++) {
    for (let tx = 60; tx <= 72; tx++) reopenInvisibleTerrain(tx, ty);
  }
}

function enforceWhisperingWoodsCliffLedgeLookoutApproach(tiles: Tile[][], def: MapDefinition) {
  if (def.name !== 'Whispering Woods') return;

  // The fourth overlook shelf is authored as grass, but the tall cliff sprite buffer below
  // the final altar pocket turns the first two shelf rows into grass-looking collision.
  // Reopen only those grass buffer tiles; real cliff, props, and interactables stay solid.
  for (let ty = 187; ty <= 188; ty++) {
    for (let tx = 177; tx <= 204; tx++) {
      if (ty < 0 || ty >= tiles.length || tx < 0 || tx >= tiles[0].length) continue;
      const t = tiles[ty][tx];
      if (!t || t.transition || t.interactable) continue;
      if (t.type === 'grass' && !t.walkable) {
        tiles[ty][tx] = { ...t, walkable: true };
      }
    }
  }
}

function enforceLakeOverlookBridgeLanding(tiles: Tile[][], def: MapDefinition) {
  if (def.name !== 'Whispering Woods') return;

  // Lake overlook bridge east landing (world ~102,25): cliff buffering marks the top
  // grass row solid, which makes the bridge feel one tile too short when stepping off.
  // Reopen only the grass landing cells; nearby log/rubble decorations stay as authored.
  const ty = 175;
  for (let tx = 252; tx <= 257; tx++) {
    if (ty < 0 || ty >= tiles.length || tx < 0 || tx >= tiles[0].length) continue;
    const t = tiles[ty][tx];
    if (!t || t.transition || t.interactable) continue;
    if (t.type === 'grass' && !t.walkable) {
      tiles[ty][tx] = { ...t, walkable: true };
    }
  }

  // Lake overlook stair mouth (world ~100,25): procedural tree scatter can land
  // directly in front of the stairs. Keep the central 4-wide stair channel clear.
  for (let clearY = 174; clearY <= 175; clearY++) {
    for (let clearX = 248; clearX <= 251; clearX++) {
      if (clearY < 0 || clearY >= tiles.length || clearX < 0 || clearX >= tiles[0].length) continue;
      const t = tiles[clearY][clearX];
      if (!t || t.transition || t.interactable) continue;
      if (t.type === 'grass' || t.type === 'tree') {
        tiles[clearY][clearX] = createTile('grass', true, { elevation: t.elevation ?? 1 });
      }
    }
  }

  // The grass shoulders beside the stair mouth are entry aprons, not bypasses.
  // Keep enough of the apron walkable for the player's corner probes to clear
  // when entering from either side, then block farther out from the funnel.
  for (let shoulderY = 174; shoulderY <= 175; shoulderY++) {
    for (let shoulderX = 245; shoulderX <= 255; shoulderX++) {
      if (shoulderY < 0 || shoulderY >= tiles.length || shoulderX < 0 || shoulderX >= tiles[0].length) continue;
      const t = tiles[shoulderY][shoulderX];
      if (!t || t.transition || t.interactable) continue;
      if (t.type === 'grass') {
        tiles[shoulderY][shoulderX] = { ...t, walkable: true };
      }
    }
  }
  for (let blockY = 174; blockY <= 175; blockY++) {
    for (const blockX of [244, 256]) {
      if (blockY < 0 || blockY >= tiles.length || blockX < 0 || blockX >= tiles[0].length) continue;
      const t = tiles[blockY][blockX];
      if (!t || t.transition || t.interactable) continue;
      if (t.type === 'grass') {
        tiles[blockY][blockX] = { ...t, walkable: false };
      }
    }
  }

  // Southeast of the overlook bridge, close the little lake-edge gap between
  // the flanking cliffs so this reads as one continuous sealed ledge.
  for (let ledgeY = 193; ledgeY <= 197; ledgeY++) {
    for (let ledgeX = 254; ledgeX <= 258; ledgeX++) {
      if (ledgeY < 0 || ledgeY >= tiles.length || ledgeX < 0 || ledgeX >= tiles[0].length) continue;
      const t = tiles[ledgeY][ledgeX];
      if (!t || t.transition || t.interactable) continue;
      tiles[ledgeY][ledgeX] = createTile(ledgeY === 193 ? 'cliff_edge' : 'cliff', false, {
        elevation: t.elevation ?? 1,
      });
    }
  }
  for (let ledgeY = 193; ledgeY <= 198; ledgeY++) {
    for (let ledgeX = 292; ledgeX <= 294; ledgeX++) {
      if (ledgeY < 0 || ledgeY >= tiles.length || ledgeX < 0 || ledgeX >= tiles[0].length) continue;
      const t = tiles[ledgeY][ledgeX];
      if (!t || t.transition || t.interactable) continue;
      tiles[ledgeY][ledgeX] = createTile(ledgeY === 193 ? 'cliff_edge' : 'cliff', false, {
        elevation: t.elevation ?? 1,
      });
    }
  }
  for (let waterY = 184; waterY <= 192; waterY++) {
    for (let waterX = 259; waterX <= 294; waterX++) {
      if (waterY < 0 || waterY >= tiles.length || waterX < 0 || waterX >= tiles[0].length) continue;
      const t = tiles[waterY][waterX];
      if (!t || t.transition || t.interactable) continue;
      tiles[waterY][waterX] = createTile('water', false, { elevation: t.elevation ?? 0 });
    }
  }
  // Remove the skinny sand spit left in the middle of the connected lake
  // at world x ~= 108, while leaving the bridge/stair landings intact.
  for (let waterY = 184; waterY <= 189; waterY++) {
    const waterX = 258;
    if (waterY < 0 || waterY >= tiles.length || waterX < 0 || waterX >= tiles[0].length) continue;
    const t = tiles[waterY][waterX];
    if (!t || t.transition || t.interactable) continue;
    if (t.type === 'sand' || t.type === 'grass') {
      tiles[waterY][waterX] = createTile('water', false, { elevation: t.elevation ?? 0 });
    }
  }

  // South/lower exit of the same crossing: the authored lower cliff lip and
  // cliff-sprite buffer leave a grass-looking landing that is still sealed.
  // Continue the central stair channel through the lip, then clear one taller
  // grass landing below it so players can enter/exit cleanly.
  for (let stairY = 197; stairY <= 199; stairY++) {
    for (let stairX = 247; stairX <= 252; stairX++) {
      if (stairY < 0 || stairY >= tiles.length || stairX < 0 || stairX >= tiles[0].length) continue;
      const t = tiles[stairY][stairX];
      if (!t || t.transition || t.interactable) continue;
      tiles[stairY][stairX] = createTile('stairs', true, { elevation: t.elevation ?? 1 });
    }
  }
  for (let landingY = 200; landingY <= 204; landingY++) {
    for (let landingX = 247; landingX <= 252; landingX++) {
      if (landingY < 0 || landingY >= tiles.length || landingX < 0 || landingX >= tiles[0].length) continue;
      const t = tiles[landingY][landingX];
      if (!t || t.transition || t.interactable) continue;
      if (t.type === 'grass' || t.type === 'cliff' || t.type === 'cliff_edge' || t.type === 'fallen_log_v' || t.type === 'fallen_log_h') {
        tiles[landingY][landingX] = createTile('grass', true, { elevation: t.elevation ?? 1 });
      }
    }
  }
}

function resolveInvisibleFoundationTileType(tiles: Tile[][], tx: number, ty: number): TileType {
  const existing = tiles[ty][tx];
  if (!TILE_METADATA[existing.type]?.isOverlay) {
    return existing.type;
  }

  const counts = new Map<TileType, number>();
  for (let dy = -1; dy <= 1; dy++) {
    for (let dx = -1; dx <= 1; dx++) {
      if (dx === 0 && dy === 0) continue;
      const nx = tx + dx;
      const ny = ty + dy;
      if (ny < 0 || ny >= tiles.length || nx < 0 || nx >= tiles[0].length) continue;
      const neighbor = tiles[ny][nx];
      if (TILE_METADATA[neighbor.type]?.isOverlay) continue;
      counts.set(neighbor.type, (counts.get(neighbor.type) ?? 0) + 1);
    }
  }

  let bestType: TileType | null = null;
  let bestCount = -1;
  for (const [type, count] of counts) {
    if (count > bestCount) {
      bestType = type;
      bestCount = count;
    }
  }

  return bestType ?? TILE_METADATA[existing.type]?.baseTile ?? 'grass';
}

function placeLake(tiles: Tile[][], f: MapFeature) {
  const cx = f.x + f.width / 2;
  const cy = f.y + f.height / 2;
  const rx = f.width / 2;
  const ry = f.height / 2;
  const waterType: TileType = f.fill === 'water_corrupted' ? 'water_corrupted' : 'water';

  for (let dy = -Math.ceil(ry) - 1; dy <= Math.ceil(ry) + 1; dy++) {
    for (let dx = -Math.ceil(rx) - 1; dx <= Math.ceil(rx) + 1; dx++) {
      const tx = Math.floor(cx + dx);
      const ty = Math.floor(cy + dy);
      if (ty >= 0 && ty < tiles.length && tx >= 0 && tx < tiles[0].length) {
        const dist = (dx * dx) / (rx * rx) + (dy * dy) / (ry * ry);
        if (dist < 0.8) {
          tiles[ty][tx] = createTile(waterType, false);
        } else if (dist < 1.2) {
          tiles[ty][tx] = createTile('sand', true);
        }
      }
    }
  }
}

function placeClearing(tiles: Tile[][], f: MapFeature) {
  for (let dy = 0; dy < f.height; dy++) {
    for (let dx = 0; dx < f.width; dx++) {
      const tx = f.x + dx;
      const ty = f.y + dy;
      if (ty < tiles.length && tx < tiles[0].length && ty >= 0 && tx >= 0) {
        tiles[ty][tx] = createTile(f.fill || 'grass', true);
      }
    }
  }
}

function placeWall(tiles: Tile[][], f: MapFeature, baseTerrain?: string) {
  const isCity = baseTerrain === 'city';

  if (!isCity) {
    for (let dy = 0; dy < f.height; dy++) {
      for (let dx = 0; dx < f.width; dx++) {
        const tx = f.x + dx;
        const ty = f.y + dy;
        if (ty < tiles.length && tx < tiles[0].length && ty >= 0 && tx >= 0) {
          tiles[ty][tx] = createTile(f.fill || 'stone', false);
        }
      }
    }
    return;
  }

  if (f.fill && f.fill !== 'stone') {
    for (let dy = 0; dy < f.height; dy++) {
      for (let dx = 0; dx < f.width; dx++) {
        const tx = f.x + dx;
        const ty = f.y + dy;
        if (ty < tiles.length && tx < tiles[0].length && ty >= 0 && tx >= 0) {
          tiles[ty][tx] = createTile(f.fill as TileType, false);
        }
      }
    }
    return;
  }

  // City walls default to UNIFORM stone (no procedural multi-material/chimney
  // texturing). City maps are authored at 100% intent: any masonry variation is
  // placed explicitly via features, so a plain stone wall is exactly that - no
  // "is that meant to be here?" patches. (The old block-texturer was built for
  // the legacy giant-wall-block layout; real buildings now use type:'building'.)
  for (let dy = 0; dy < f.height; dy++) {
    for (let dx = 0; dx < f.width; dx++) {
      const tx = f.x + dx;
      const ty = f.y + dy;
      if (ty >= tiles.length || tx >= tiles[0].length || ty < 0 || tx < 0) continue;
      tiles[ty][tx] = createTile('stone', false);
    }
  }
}

function placeRuinsFeature(tiles: Tile[][], f: MapFeature) {
  const halfW = Math.floor(f.width / 2);
  const halfH = Math.floor(f.height / 2);
  const cx = f.x + halfW;
  const cy = f.y + halfH;
  const maxDist = Math.max(halfW, halfH) || 1;

  for (let dy = 0; dy < f.height; dy++) {
    for (let dx = 0; dx < f.width; dx++) {
      const tx = f.x + dx;
      const ty = f.y + dy;
      if (ty < 0 || ty >= tiles.length || tx < 0 || tx >= tiles[0].length) continue;

      const dist = Math.abs(dx - halfW) + Math.abs(dy - halfH);
      const hash = (dx * 17 + dy * 31 + f.x * 7 + f.y * 11) % 13;
      const isNSWall = dy === 0 || dy === f.height - 1;
      const isEWWall = dx === 0 || dx === f.width - 1;
      const isCorner = isNSWall && isEWWall;
      const isWall = isNSWall || isEWWall;

      if (isWall) {
        // Two-tile-wide entrance gap at the midpoint of each side (never at corners)
        const isNSGap = isNSWall && !isCorner && (dx === halfW || dx === halfW - 1);
        const isEWGap = isEWWall && !isCorner && (dy === halfH || dy === halfH - 1);

        if (isNSGap || isEWGap) {
          // Entrance floor matches interior ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â the brown continues through the wall opening
          // so the gap is immediately readable as "you can walk through here"
          tiles[ty][tx] = createTile((dx + dy) % 3 === 0 ? 'cobblestone_dark' : 'ruins_floor', true);
        } else {
          // Scatter mossy_stone patches ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â ages/weathers the wall visually
          const broken = hash < 4 && !isCorner;
          tiles[ty][tx] = createTile(broken ? 'rubble' : (hash < 8 ? 'mossy_stone' : 'stone'), false);
        }
      } else {
        // Interior ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â ruins_floor reads clearly as ancient flagstone vs the stone walls
        const isAisle = Math.abs(dx - halfW) <= 1 || Math.abs(dy - halfH) <= 1;
        const outerWear = dist > maxDist * 0.95 && hash < 4;
        const floorType: TileType = outerWear
          ? 'mossy_stone'
          : isAisle || hash > 3
            ? 'ruins_floor'
            : 'cobblestone_dark';
        tiles[ty][tx] = createTile(floorType, true);
      }
    }
  }

  // Rock gateposts one tile outside each entrance ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â flanking pillars that frame the opening
  // and draw the eye toward it from the surrounding terrain.
  const set = (tx: number, ty: number, type: TileType, walkable: boolean) => {
    if (ty >= 0 && ty < tiles.length && tx >= 0 && tx < tiles[0].length) {
      const existing = tiles[ty][tx];
      if (existing?.transition || existing?.interactable) return;
      tiles[ty][tx] = createTile(type, walkable, { elevation: existing?.elevation ?? 0 });
    }
  };
  // North entrance gateposts (outside north wall)
  set(f.x + halfW - 2, f.y - 1, 'pillar', false);
  set(f.x + halfW + 1, f.y - 1, 'rubble', true);
  // South entrance gateposts (outside south wall)
  set(f.x + halfW - 2, f.y + f.height, 'rubble', true);
  set(f.x + halfW + 1, f.y + f.height, 'pillar', false);
  // West entrance gateposts (outside west wall)
  set(f.x - 1, f.y + halfH - 2, 'mossy_stone', false);
  set(f.x - 1, f.y + halfH + 1, 'rubble', true);
  // East entrance gateposts (outside east wall)
  set(f.x + f.width, f.y + halfH - 2, 'rubble', true);
  set(f.x + f.width, f.y + halfH + 1, 'mossy_stone', false);

  // Rubble piles just inside the corners ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â gives the space a lived-in, collapsed feel
  const rubble: [number, number][] = [
    [f.x + 1, f.y + 1],
    [f.x + f.width - 2, f.y + 1],
    [f.x + 1, f.y + f.height - 2],
    [f.x + f.width - 2, f.y + f.height - 2],
  ];
  for (const [rx, ry] of rubble) {
    if (ry >= 0 && ry < tiles.length && rx >= 0 && rx < tiles[0].length) {
      tiles[ry][rx] = createTile((rx + ry) % 2 === 0 ? 'rubble' : 'mossy_stone', (rx + ry) % 2 === 0);
    }
  }

  set(cx, cy, 'campfire_remains', false);
  if (f.width >= 10 && f.height >= 8) {
    set(cx - 1, cy, 'cobblestone_dark', true);
    set(cx + 1, cy, 'cobblestone_dark', true);
    set(cx, cy - 1, 'cobblestone_dark', true);
    set(cx, cy + 1, 'cobblestone_dark', true);
  }

  const columnPairs: Array<[number, number]> = [
    [f.x + 2, f.y + 2],
    [f.x + f.width - 3, f.y + 2],
    [f.x + 2, f.y + f.height - 3],
    [f.x + f.width - 3, f.y + f.height - 3],
  ];
  for (const [px, py] of columnPairs) {
    if (px > f.x && px < f.x + f.width - 1 && py > f.y && py < f.y + f.height - 1) {
      set(px, py, (px + py) % 3 === 0 ? 'rubble' : 'pillar', false);
    }
  }

  if (f.width >= 12) {
    set(cx - 3, cy - 1, 'rubble', true);
    set(cx + 3, cy + 1, 'rubble', true);
    set(cx - 4, cy + 2, 'bones_pile', true);
    set(cx + 4, cy - 2, 'chain', true);
  }
  if (f.height >= 10) {
    set(cx - 2, cy - 3, 'ritual_candle_knocked', true);
    set(cx + 2, cy - 3, 'ritual_candle', true);
    set(cx - 2, cy + 3, 'ritual_candle', true);
    set(cx + 2, cy + 3, 'ritual_candle_knocked', true);
  }
}

function placeCamp(tiles: Tile[][], f: MapFeature) {
  // Clear area
  for (let dy = 0; dy < f.height; dy++) {
    for (let dx = 0; dx < f.width; dx++) {
      const tx = f.x + dx;
      const ty = f.y + dy;
      if (ty >= 0 && ty < tiles.length && tx >= 0 && tx < tiles[0].length) {
        tiles[ty][tx] = createTile('dirt', true);
      }
    }
  }
  // Center remains of a campfire - atmospheric only, not a healing/rest source.
  const cx = f.x + Math.floor(f.width / 2);
  const cy = f.y + Math.floor(f.height / 2);
  if (cy < tiles.length && cx < tiles[0].length) {
    tiles[cy][cx] = createTile('campfire_remains', false);
  }
  // Barrels and crates around edges
  const corners = [[f.x + 1, f.y + 1], [f.x + f.width - 2, f.y + 1], [f.x + 1, f.y + f.height - 2]];
  for (const [bx, by] of corners) {
    if (by >= 0 && by < tiles.length && bx >= 0 && bx < tiles[0].length) {
      tiles[by][bx] = createTile('barrel', false);
    }
  }
}

function placeGarden(tiles: Tile[][], f: MapFeature) {
  for (let dy = 0; dy < f.height; dy++) {
    for (let dx = 0; dx < f.width; dx++) {
      const tx = f.x + dx;
      const ty = f.y + dy;
      if (ty >= 0 && ty < tiles.length && tx >= 0 && tx < tiles[0].length) {
        if ((dx + dy) % 3 === 0) {
          tiles[ty][tx] = createTile('flower', true);
        } else {
          tiles[ty][tx] = createTile('grass', true);
        }
      }
    }
  }
  // Fence border
  for (let dx = 0; dx < f.width; dx++) {
    const tx = f.x + dx;
    if (f.y >= 0 && f.y < tiles.length && tx >= 0 && tx < tiles[0].length) {
      if (dx !== Math.floor(f.width / 2)) tiles[f.y][tx] = createTile('fence', false);
    }
    const by = f.y + f.height - 1;
    if (by >= 0 && by < tiles.length && tx >= 0 && tx < tiles[0].length) {
      if (dx !== Math.floor(f.width / 2)) tiles[by][tx] = createTile('fence', false);
    }
  }
}

function placeGraveyard(tiles: Tile[][], f: MapFeature) {
  for (let dy = 0; dy < f.height; dy++) {
    for (let dx = 0; dx < f.width; dx++) {
      const tx = f.x + dx;
      const ty = f.y + dy;
      if (ty >= 0 && ty < tiles.length && tx >= 0 && tx < tiles[0].length) {
        if (dx % 3 === 1 && dy % 3 === 1) {
          tiles[ty][tx] = createTile('tombstone', false);
        } else {
          tiles[ty][tx] = createTile('dirt', true);
        }
      }
    }
  }
}

function placeBridge(tiles: Tile[][], f: MapFeature) {
  for (let dy = 0; dy < f.height; dy++) {
    for (let dx = 0; dx < f.width; dx++) {
      const tx = f.x + dx;
      const ty = f.y + dy;
      if (ty >= 0 && ty < tiles.length && tx >= 0 && tx < tiles[0].length) {
        tiles[ty][tx] = createTile('bridge', true);
      }
    }
  }
}

function placeBridgeCorrupted(tiles: Tile[][], f: MapFeature) {
  for (let dy = 0; dy < f.height; dy++) {
    for (let dx = 0; dx < f.width; dx++) {
      const tx = f.x + dx;
      const ty = f.y + dy;
      if (ty >= 0 && ty < tiles.length && tx >= 0 && tx < tiles[0].length) {
        tiles[ty][tx] = createTile('bridge_corrupted', true);
      }
    }
  }
}

/** Deterministic 0..1 hash for tile coordinates (speckle / dither). */
function bridgeDecayHash01(tx: number, ty: number, salt: number): number {
  let n = (tx * 374761393 + ty * 668265263 + salt * 1442695041) >>> 0;
  n = (n ^ (n >>> 13)) >>> 0;
  return (n % 10000) / 10000;
}

/**
 * Hollow entrance bridge: smooth southÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¾Ãƒâ€šÃ‚Â¢north decay (intact ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¾Ãƒâ€šÃ‚Â¢ corrupted) with speckled mixing
 * instead of a hard rectangle boundary. Keeps water gap at x=123ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã¢â‚¬Â¦ÃƒÂ¢Ã¢â€šÂ¬Ã…â€œ124 on the northernmost stub rows.
 * Expects footprint x=118ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã¢â‚¬Â¦ÃƒÂ¢Ã¢â€šÂ¬Ã…â€œ129, y=81ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã¢â‚¬Â¦ÃƒÂ¢Ã¢â€šÂ¬Ã…â€œ95 (12ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Â ÃƒÂ¢Ã¢â€šÂ¬Ã¢â€žÂ¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€šÃ‚Â15) over the hollow river crossing.
 */
function placeBridgeDecayBlend(tiles: Tile[][], f: MapFeature) {
  const x0 = f.x;
  const y0 = f.y;
  const w = f.width;
  const h = f.height;
  const ySouth = y0 + h - 1;
  const span = Math.max(1, ySouth - y0);

  for (let dy = 0; dy < h; dy++) {
    const ty = y0 + dy;
    if (ty < 0 || ty >= tiles.length) continue;

    for (let dx = 0; dx < w; dx++) {
      const tx = f.x + dx;
      if (tx < 0 || tx >= tiles[0].length) continue;

      // Northernmost rows: keep river visible between corrupted stubs (legacy gap).
      if (ty <= y0 + 3 && tx >= 123 && tx <= 124) continue;

      // y=81ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã¢â‚¬Â¦ÃƒÂ¢Ã¢â€šÂ¬Ã…â€œ83: rail columns stay clean wood; side stubs corrupted (no full-width seam).
      if (ty <= y0 + 2) {
        if (tx === x0 || tx === x0 + w - 1) {
          tiles[ty][tx] = createTile('bridge', true);
        } else if ((tx >= 119 && tx <= 122) || (tx >= 125 && tx <= 128)) {
          tiles[ty][tx] = createTile('bridge_corrupted', true);
        }
        continue;
      }

      // Gradient: south (high ty) = intact, north (low ty) = corrupted.
      const northness = (ySouth - ty) / span;
      const smooth = northness * northness * (3 - 2 * northness);
      const h1 = bridgeDecayHash01(tx, ty, 1);
      const h2 = bridgeDecayHash01(tx + 3, ty - 2, 7);
      const h3 = bridgeDecayHash01(tx - 1, ty + 5, 13);
      const speckle = (h1 - 0.5) * 0.38 + (h2 - 0.5) * 0.22 + (h3 - 0.5) * 0.14;
      const railBias = (tx === x0 || tx === x0 + w - 1) ? -0.2 : 0;
      const corruptScore = smooth + speckle + railBias;
      const useCorrupt = corruptScore > 0.47;
      tiles[ty][tx] = createTile(useCorrupt ? 'bridge_corrupted' : 'bridge', true);
    }
  }
}

// Objects path strips may replace when unwalkable (carve through forest). Other unwalkable tiles
// (house foundations, water) are left alone so collision matches authored structures.
// Fence / gate / iron_fence are always skipped (gates are walkable and would otherwise be paved over).
/** Unwalkable terrain types an authored path strip is allowed to replace with path fill (dirt etc.). */
const PATH_BLOCKERS: Set<TileType> = new Set([
  'tree', 'rock', 'stump', 'dead_tree', 'hedge', 'fallen_log', 'fallen_log_v',
  // Carve through decorative cliff_face stamps when a path runs over them (e.g. south-bank artery
  // y=148 vs funnel block at x=144ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã¢â‚¬Â¦ÃƒÂ¢Ã¢â€šÂ¬Ã…â€œ153) so elevation seam fillers do not show as sky strips.
  'cliff_edge', 'cliff', 'cliff_edge_corrupted', 'cliff_corrupted',
]);

function placePath(tiles: Tile[][], f: MapFeature) {
  const neighborHasBuildingDoor = (tx: number, ty: number): boolean => {
    const h = tiles.length;
    const w = tiles[0].length;
    const offs: [number, number][] = [[0, 1], [0, -1], [1, 0], [-1, 0]];
    for (const [dx, dy] of offs) {
      const nx = tx + dx;
      const ny = ty + dy;
      if (ny < 0 || ny >= h || nx < 0 || nx >= w) continue;
      const id = tiles[ny][nx].interactionId;
      if (id === 'building_entrance' || id === 'building_exit') return true;
    }
    return false;
  };

  for (let dy = 0; dy < f.height; dy++) {
    for (let dx = 0; dx < f.width; dx++) {
      const tx = f.x + dx;
      const ty = f.y + dy;
      if (ty >= 0 && ty < tiles.length && tx >= 0 && tx < tiles[0].length) {
        const existing = tiles[ty][tx];
        // Never pave over structure sprites, authored interactables, or transitions.
        if (
          HOUSE_TYPES.has(existing.type) ||
          existing.type === 'door' ||
          existing.type === 'door_interior' ||
          existing.type === 'door_iron' ||
          existing.type === 'fence' ||
          existing.type === 'gate' ||
          existing.type === 'iron_fence' ||
          existing.interactable ||
          existing.transition ||
          existing.interactionId === 'building_entrance' ||
          existing.interactionId === 'building_exit'
        ) {
          continue;
        }
        // Keep solid door thresholds (e.g. cottage/inn dirt under the facade); otherwise a path
        // strip can replace unwalkable threshold with walkable dirt and strand F-key probes off the
        // actual building_entrance tiles (ranger cabin on the yÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â°ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â¹ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€šÃ‚Â 168 east-west trail).
        if (!existing.walkable && neighborHasBuildingDoor(tx, ty)) {
          continue;
        }
        if (!existing.walkable && !PATH_BLOCKERS.has(existing.type)) {
          continue;
        }
        tiles[ty][tx] = createTile(f.fill || 'dirt', true);
      }
    }
  }
}

function placeDestroyedTown(tiles: Tile[][], f: MapFeature) {
  const hash = (dx: number, dy: number, salt: number) =>
    ((dx * 374761 + dy * 668265 + f.x * 127 + f.y * 311 + salt) >>> 0) % 100;

  const houseVariants: TileType[] = ['destroyed_house', 'destroyed_house_rubble', 'destroyed_house_overgrown'];

  // Phase 1: fill everything with dirt/ruins_floor base
  for (let dy = 0; dy < f.height; dy++) {
    for (let dx = 0; dx < f.width; dx++) {
      const tx = f.x + dx;
      const ty = f.y + dy;
      if (ty < 0 || ty >= tiles.length || tx < 0 || tx >= tiles[0].length) continue;
      const existing = tiles[ty][tx];
      if (existing.transition || existing.interactable) continue;
      const h = hash(dx, dy, 0);
      tiles[ty][tx] = createTile(h < 30 ? 'ruins_floor' : 'dirt', true);
    }
  }

  // Phase 2: place house ruins on a sparse grid (every 5-6 tiles) with variant rotation
  let houseIdx = 0;
  for (let dy = 2; dy < f.height - 2; dy += 5) {
    for (let dx = 2; dx < f.width - 2; dx += 5) {
      const jitterX = (hash(dx, dy, 77) % 3) - 1;
      const jitterY = (hash(dx, dy, 133) % 3) - 1;
      const px = dx + jitterX;
      const py = dy + jitterY;
      const tx = f.x + px;
      const ty = f.y + py;
      if (ty < 0 || ty >= tiles.length || tx < 0 || tx >= tiles[0].length) continue;
      if (hash(px, py, 200) < 25) continue;
      const variant = houseVariants[houseIdx % houseVariants.length];
      houseIdx++;
      tiles[ty][tx] = createTile(variant, false);
    }
  }

  // Phase 3: scatter environmental detail ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â signs, rubble, bones, dead trees, barrels
  for (let dy = 0; dy < f.height; dy++) {
    for (let dx = 0; dx < f.width; dx++) {
      const tx = f.x + dx;
      const ty = f.y + dy;
      if (ty < 0 || ty >= tiles.length || tx < 0 || tx >= tiles[0].length) continue;
      const cur = tiles[ty][tx];
      if (cur.type !== 'dirt' && cur.type !== 'ruins_floor') continue;

      const h = hash(dx, dy, 500);
      if (h < 1) {
        tiles[ty][tx] = createTile('broken_sign', false);
      } else if (h < 5) {
        tiles[ty][tx] = createTile('rubble', true);
      } else if (h < 10) {
        tiles[ty][tx] = createTile('bones_pile', true);
      } else if (h < 13) {
        tiles[ty][tx] = createTile('dead_tree', false);
      } else if (h < 15) {
        tiles[ty][tx] = createTile('barrel', false);
      } else if (h < 17) {
        tiles[ty][tx] = createTile('crate', false);
      } else if (h < 19) {
        tiles[ty][tx] = createTile('bones', true);
      } else if (h < 21) {
        tiles[ty][tx] = createTile('bloodstain', true);
      } else if (h < 23) {
        tiles[ty][tx] = createTile('stump', false);
      }
    }
  }
}

function placeTemple(tiles: Tile[][], f: MapFeature) {
  for (let dy = 0; dy < f.height; dy++) {
    for (let dx = 0; dx < f.width; dx++) {
      const tx = f.x + dx;
      const ty = f.y + dy;
      if (ty >= 0 && ty < tiles.length && tx >= 0 && tx < tiles[0].length) {
        if (dx === 0 || dx === f.width - 1 || dy === 0 || dy === f.height - 1) {
          if ((dx === Math.floor(f.width / 2) && dy === f.height - 1)) {
            tiles[ty][tx] = createTile('stone', true);
          } else {
            tiles[ty][tx] = createTile('stone', false);
          }
        } else if (dx % 4 === 2 && dy % 4 === 2) {
          tiles[ty][tx] = createTile('statue', false);
        } else {
          tiles[ty][tx] = createTile('ruins_floor', true);
        }
      }
    }
  }
}

function placeWaterfall(tiles: Tile[][], f: MapFeature) {
  const fw = f.width;
  const fh = f.height;
  const cx = f.x + Math.floor(fw / 2);
  const grand = fh >= 18 || fw >= 16;
  const halfFall = grand ? 3 : 2;
  const cascadeDepth = grand
    ? Math.min(Math.max(6, Math.floor(fh * 0.34)), Math.max(fh - 5, 4))
    : 3;
  const splashBand = grand ? 2 : 1;
  const poolPhaseStart = cascadeDepth + splashBand;

  for (let dy = 0; dy < fh; dy++) {
    for (let dx = 0; dx < fw; dx++) {
      const tx = f.x + dx;
      const ty = f.y + dy;
      if (ty < 0 || ty >= tiles.length || tx < 0 || tx >= tiles[0].length) continue;

      const dist = Math.abs(tx - cx);

      if (dy === 0) {
        if (dist <= halfFall + 1) {
          tiles[ty][tx] = createTile(dist <= halfFall ? 'mossy_stone' : 'rock', false);
        } else {
          tiles[ty][tx] = createTile(grand ? 'dark_grass' : 'grass', true);
          if (grand && (dx + tx + ty) % 7 === 0) {
            tiles[ty][tx] = createTile('dead_tree', false);
          }
        }
        continue;
      }

      if (dy < cascadeDepth) {
        if (dist <= halfFall) {
          tiles[ty][tx] = createTile('waterfall', false);
        } else if (dist <= halfFall + 2) {
          tiles[ty][tx] = createTile((dx + dy) % 3 === 0 ? 'waterfall' : 'rock', false);
        } else if (dist <= halfFall + (grand ? 6 : 4)) {
          tiles[ty][tx] = createTile('rock', false);
        } else {
          tiles[ty][tx] = createTile(grand ? 'dark_grass' : 'grass', true);
          if (grand && (dx * 3 + dy * 5) % 13 === 0) {
            tiles[ty][tx] = createTile('tall_grass', true);
          }
        }
        continue;
      }

      if (dy < poolPhaseStart) {
        if (dist <= halfFall + 3) {
          tiles[ty][tx] = createTile('rock', false);
        } else {
          tiles[ty][tx] = createTile('mossy_stone', dist > halfFall + 5);
        }
        continue;
      }

      const poolH = fh - poolPhaseStart;
      const yn = poolH > 1 ? (dy - poolPhaseStart) / (poolH - 1) : 0;
      const xn = dist / Math.max(fw * 0.42, 1);
      const inPool = xn * xn + yn * yn <= 0.92;

      if (inPool && dist <= halfFall + 5 + Math.floor(yn * 4)) {
        tiles[ty][tx] = createTile('water', false);
      } else if (dist <= halfFall + 6 + Math.floor(yn * 5)) {
        tiles[ty][tx] = createTile('rock', false);
      } else {
        tiles[ty][tx] = createTile('mossy_stone', true);
        if (grand && (dx + dy) % 5 === 0) {
          tiles[ty][tx] = createTile('tall_grass', true);
        }
      }
    }
  }
}

function placeVolcano(tiles: Tile[][], f: MapFeature) {
  const cx = f.x + f.width / 2;
  const cy = f.y + f.height / 2;
  const rx = f.width / 2;
  const ry = f.height / 2;

  for (let dy = -Math.ceil(ry); dy <= Math.ceil(ry); dy++) {
    for (let dx = -Math.ceil(rx); dx <= Math.ceil(rx); dx++) {
      const tx = Math.floor(cx + dx);
      const ty = Math.floor(cy + dy);
      if (ty >= 0 && ty < tiles.length && tx >= 0 && tx < tiles[0].length) {
        const dist = (dx * dx) / (rx * rx) + (dy * dy) / (ry * ry);
        if (dist < 0.15) {
          tiles[ty][tx] = createTile('lava', false);
        } else if (dist < 0.5) {
          tiles[ty][tx] = createTile('volcanic_rock', false);
        } else if (dist < 0.85) {
          tiles[ty][tx] = createTile('ash', true);
        } else if (dist < 1.1) {
          tiles[ty][tx] = createTile('rock', false);
        }
      }
    }
  }
}

function placeBossArena(tiles: Tile[][], f: MapFeature) {
  const cx = f.x + Math.floor(f.width / 2);
  const cy = f.y + Math.floor(f.height / 2);
  const rx = f.width / 2;
  const ry = f.height / 2;

  for (let dy = -Math.ceil(ry); dy <= Math.ceil(ry); dy++) {
    for (let dx = -Math.ceil(rx); dx <= Math.ceil(rx); dx++) {
      const tx = Math.floor(cx + dx);
      const ty = Math.floor(cy + dy);
      if (ty >= 0 && ty < tiles.length && tx >= 0 && tx < tiles[0].length) {
        const dist = (dx * dx) / (rx * rx) + (dy * dy) / (ry * ry);
        if (dist < 0.7) {
          tiles[ty][tx] = createTile('stone', true);
        } else if (dist < 1.0) {
          // Ring of pillars/statues
          if ((dx + dy) % 5 === 0) {
            tiles[ty][tx] = createTile('statue', false);
          } else {
            tiles[ty][tx] = createTile('ruins_floor', true);
          }
        }
      }
    }
  }
  // Central marker
  if (cy < tiles.length && cx < tiles[0].length) {
    tiles[cy][cx] = createTile('campfire_remains', false);
  }
}

function placeAbandonedCamp(tiles: Tile[][], f: MapFeature) {
  // Overgrown abandoned camp with scattered supplies
  for (let dy = 0; dy < f.height; dy++) {
    for (let dx = 0; dx < f.width; dx++) {
      const tx = f.x + dx;
      const ty = f.y + dy;
      if (ty >= 0 && ty < tiles.length && tx >= 0 && tx < tiles[0].length) {
        if ((dx * 3 + dy * 7) % 11 === 0) {
          tiles[ty][tx] = createTile('barrel', false);
        } else if ((dx + dy * 5) % 13 === 0) {
          tiles[ty][tx] = createTile('crate', false);
        } else if ((dx * 2 + dy) % 9 === 0) {
          tiles[ty][tx] = createTile('bones', true);
        } else if ((dx + dy) % 7 === 0) {
          tiles[ty][tx] = createTile('tall_grass', true);
        } else {
          tiles[ty][tx] = createTile('dirt', true);
        }
      }
    }
  }
  // Non-interactive campfire at center ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â purely decorative, no prompt.
  const ccx = f.x + Math.floor(f.width / 2);
  const ccy = f.y + Math.floor(f.height / 2);
  if (ccy < tiles.length && ccx < tiles[0].length) {
    tiles[ccy][ccx] = createTile('campfire_remains', false);
  }
}

function placeCemetery(tiles: Tile[][], f: MapFeature) {
  const gateX = Math.floor(f.width / 2);
  const southRow = f.height - 1;
  const halfOpen = 2; // ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â±2 = 5-tile-wide openings
  const westOpenDY = Math.floor(f.height / 2);
  const northOpenDX = gateX; // north opening aligned with south gate

  for (let dy = 0; dy < f.height; dy++) {
    for (let dx = 0; dx < f.width; dx++) {
      const tx = f.x + dx;
      const ty = f.y + dy;
      if (ty < 0 || ty >= tiles.length || tx < 0 || tx >= tiles[0].length) continue;

      // ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚ÂÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚ÂÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¬ Fence / openings on border ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚ÂÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚ÂÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚ÂÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚ÂÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚ÂÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚ÂÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚ÂÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚ÂÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚ÂÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚ÂÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚ÂÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚ÂÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚ÂÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚ÂÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚ÂÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚ÂÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚ÂÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚ÂÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚ÂÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚ÂÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚ÂÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚ÂÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚ÂÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚ÂÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚ÂÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚ÂÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚ÂÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚ÂÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚ÂÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚ÂÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚ÂÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚ÂÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚ÂÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚ÂÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚ÂÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚ÂÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚ÂÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚ÂÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚ÂÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚ÂÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚ÂÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¬
      if (dx === 0 || dx === f.width - 1 || dy === 0 || dy === southRow) {
        const isWestOpen  = dx === 0 && Math.abs(dy - westOpenDY) <= halfOpen;
        const isNorthOpen = dy === 0 && Math.abs(dx - northOpenDX) <= halfOpen;
        const isEastOpen  = f.eastOpenDY !== undefined
          && dx === f.width - 1
          && Math.abs(dy - f.eastOpenDY) <= (f.eastOpenHalf ?? 1);
        if (isWestOpen || isNorthOpen || isEastOpen) {
          tiles[ty][tx] = createTile('dirt', true);
        } else {
          tiles[ty][tx] = createTile('fence', false);
        }
        continue;
      }

      // ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚ÂÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚ÂÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¬ Base floor ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚ÂÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚ÂÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚ÂÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚ÂÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚ÂÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚ÂÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚ÂÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚ÂÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚ÂÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚ÂÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚ÂÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚ÂÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚ÂÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚ÂÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚ÂÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚ÂÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚ÂÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚ÂÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚ÂÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚ÂÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚ÂÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚ÂÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚ÂÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚ÂÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚ÂÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚ÂÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚ÂÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚ÂÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚ÂÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚ÂÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚ÂÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚ÂÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚ÂÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚ÂÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚ÂÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚ÂÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚ÂÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚ÂÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚ÂÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚ÂÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚ÂÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚ÂÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚ÂÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚ÂÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚ÂÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚ÂÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚ÂÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚ÂÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚ÂÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚ÂÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚ÂÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚ÂÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚ÂÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚ÂÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚ÂÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚ÂÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚ÂÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚ÂÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚ÂÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¬
      tiles[ty][tx] = createTile('dirt', true);

      // ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚ÂÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚ÂÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¬ Central dead tree ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚ÂÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚ÂÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚ÂÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚ÂÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚ÂÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚ÂÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚ÂÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚ÂÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚ÂÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚ÂÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚ÂÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚ÂÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚ÂÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚ÂÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚ÂÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚ÂÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚ÂÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚ÂÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚ÂÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚ÂÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚ÂÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚ÂÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚ÂÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚ÂÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚ÂÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚ÂÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚ÂÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚ÂÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚ÂÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚ÂÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚ÂÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚ÂÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚ÂÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚ÂÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚ÂÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚ÂÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚ÂÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚ÂÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚ÂÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚ÂÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚ÂÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚ÂÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚ÂÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚ÂÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚ÂÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚ÂÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚ÂÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚ÂÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚ÂÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚ÂÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚ÂÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚ÂÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¬
      if (dx === Math.floor(f.width / 2) && dy === Math.floor(f.height / 2)) {
        tiles[ty][tx] = createTile('dead_tree', false);
        continue;
      }

      // ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚ÂÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚ÂÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¬ Keep corridors near openings clear of tombstones ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚ÂÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚ÂÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚ÂÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚ÂÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚ÂÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚ÂÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚ÂÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚ÂÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚ÂÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚ÂÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚ÂÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚ÂÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚ÂÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚ÂÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚ÂÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚ÂÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚ÂÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚ÂÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚ÂÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚ÂÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚ÂÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¬
      if (dx <= 2 && Math.abs(dy - westOpenDY) <= halfOpen) continue;
      if (dy <= 2 && Math.abs(dx - northOpenDX) <= halfOpen) continue;

      // ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚ÂÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚ÂÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¬ Tombstones ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â mix intact, cracked-h, cracked-v, and bones ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚ÂÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚ÂÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¬
      const hash = (dx * 7 + dy * 13 + f.x + f.y * 3) % 100;
      const crackedVariant: TileType = hash % 2 === 0 ? 'tombstone_broken' : 'tombstone_cracked_v';

      if (dx % 4 === 1 && dy % 4 === 1) {
        if (hash < 15) {
          tiles[ty][tx] = createTile('bones_pile', true);
        } else if (hash < 40) {
          tiles[ty][tx] = createTile(crackedVariant, false);
        } else {
          tiles[ty][tx] = createTile('tombstone', false);
        }
      } else if (dx % 4 === 3 && dy % 4 === 3 && hash < 35) {
        tiles[ty][tx] = hash < 18
          ? createTile(crackedVariant, false)
          : createTile('tombstone', false);
      } else if ((dx + dy * 3) % 17 === 0) {
        tiles[ty][tx] = createTile('bones', true);
      } else if ((dx * 11 + dy * 5 + f.x) % 23 === 0) {
        tiles[ty][tx] = createTile(crackedVariant, false);
      }
    }
  }
}

const WATER_BRIDGE_TILES: Set<TileType> = new Set<TileType>(['water', 'water_corrupted', 'bridge', 'bridge_corrupted', 'bridge_folded', 'bridge_decay_blend'] as TileType[]);

function placeCliffFace(tiles: Tile[][], f: MapFeature) {
  for (let dy = 0; dy < f.height; dy++) {
    for (let dx = 0; dx < f.width; dx++) {
      const tx = f.x + dx;
      const ty = f.y + dy;
      if (ty >= 0 && ty < tiles.length && tx >= 0 && tx < tiles[0].length) {
        const existing = tiles[ty][tx];
        if (existing.transition || existing.interactable) continue;
        if (WATER_BRIDGE_TILES.has(existing.type)) continue;
        if (dy < 2) {
          tiles[ty][tx] = createTile('cliff_edge', false);
        } else {
          tiles[ty][tx] = createTile('cliff', false);
        }
      }
    }
  }
  applySouthCliffSpriteWalkabilityBuffer(
    tiles,
    f.x,
    f.x + f.width,
    f.y + f.height,
    0,
  );
}

function placeFarm(tiles: Tile[][], f: MapFeature) {
  for (let dy = 0; dy < f.height; dy++) {
    for (let dx = 0; dx < f.width; dx++) {
      const tx = f.x + dx;
      const ty = f.y + dy;
      if (ty >= 0 && ty < tiles.length && tx >= 0 && tx < tiles[0].length) {
        // Fence border
        if (dx === 0 || dx === f.width - 1 || dy === 0 || dy === f.height - 1) {
          if (dx === Math.floor(f.width / 2) && dy === f.height - 1) {
            tiles[ty][tx] = createTile('gate', true);
          } else {
            tiles[ty][tx] = createTile('fence', false);
          }
        } else if (dy % 3 === 1 && dx > 1 && dx < f.width - 2) {
          tiles[ty][tx] = createTile('wheat', true);
        } else if (dx === Math.floor(f.width / 2) && dy === Math.floor(f.height / 2)) {
          tiles[ty][tx] = createTile('scarecrow', false);
        } else if ((dx + dy * 5) % 17 === 0) {
          tiles[ty][tx] = createTile('hay_bale', false);
        } else {
          tiles[ty][tx] = createTile('farmland', true);
        }
      }
    }
  }
}

// Bespoke cave mouth: stamps a single walkable cave-mouth tile at the feature centre carrying
// the interior transition. Both entrances and exits are interact-to-use (the press-to-enter cue,
// no visible portal): entrances use 'building_entrance', caveExit mouths use 'building_exit'.
function placeCaveMouth(tiles: Tile[][], f: MapFeature) {
  if (!f.interiorMap || f.interiorSpawnX === undefined || f.interiorSpawnY === undefined) return;
  const cx = f.x + Math.floor(f.width / 2);
  const cy = f.y + Math.floor(f.height / 2);
  if (cy < 0 || cy >= tiles.length || cx < 0 || cx >= tiles[0].length) return;
  const existing = tiles[cy][cx];
  const transition = { targetMap: f.interiorMap, targetX: f.interiorSpawnX, targetY: f.interiorSpawnY };
  tiles[cy][cx] = createTile(f.caveAngled ? 'cave_mouth_angled' : 'cave_mouth', true, {
    elevation: existing.elevation,
    transition,
    interactable: true,
    interactionId: f.caveExit ? 'building_exit' : 'building_entrance',
  });
}

function placeIronFenceBorder(tiles: Tile[][], f: MapFeature) {
  for (let dy = 0; dy < f.height; dy++) {
    for (let dx = 0; dx < f.width; dx++) {
      const tx = f.x + dx;
      const ty = f.y + dy;
      if (ty >= 0 && ty < tiles.length && tx >= 0 && tx < tiles[0].length) {
        if (dx === 0 || dx === f.width - 1 || dy === 0 || dy === f.height - 1) {
          if (dx === Math.floor(f.width / 2) && dy === f.height - 1) {
            tiles[ty][tx] = createTile('gate', true);
          } else {
            tiles[ty][tx] = createTile('iron_fence', false);
          }
        } else {
          tiles[ty][tx] = createTile(f.fill || 'dirt', true);
        }
      }
    }
  }
}

function placeHedgeMaze(tiles: Tile[][], f: MapFeature) {
  for (let dy = 0; dy < f.height; dy++) {
    for (let dx = 0; dx < f.width; dx++) {
      const tx = f.x + dx;
      const ty = f.y + dy;
      if (ty >= 0 && ty < tiles.length && tx >= 0 && tx < tiles[0].length) {
        // Create maze-like hedge pattern
        if (dx === 0 || dx === f.width - 1 || dy === 0 || dy === f.height - 1) {
          if (dx === Math.floor(f.width / 2) && (dy === 0 || dy === f.height - 1)) {
            tiles[ty][tx] = createTile('grass', true);
          } else {
            tiles[ty][tx] = createTile('hedge', false);
          }
        } else if ((dx % 4 === 0 && dy > 1 && dy < f.height - 2) || (dy % 4 === 0 && dx > 1 && dx < f.width - 2)) {
          if ((dx + dy) % 8 !== 0) {
            tiles[ty][tx] = createTile('hedge', false);
          } else {
            tiles[ty][tx] = createTile('grass', true);
          }
        } else {
          tiles[ty][tx] = createTile('grass', true);
        }
      }
    }
  }
}

function placeCobblePlaza(tiles: Tile[][], f: MapFeature, baseTerrain?: string) {
  const isCity = baseTerrain === 'city';
  const lampType: TileType = isCity ? 'street_lamp' : 'lantern';
  const cx = Math.floor(f.width / 2);
  const cy = Math.floor(f.height / 2);
  const hasFountain = isCity && f.width >= 8 && f.height >= 8;
  const seed = ((f.x * 31 + f.y * 17) >>> 0) % 127;

  for (let dy = 0; dy < f.height; dy++) {
    for (let dx = 0; dx < f.width; dx++) {
      const tx = f.x + dx;
      const ty = f.y + dy;
      if (ty >= 0 && ty < tiles.length && tx >= 0 && tx < tiles[0].length) {
        if (hasFountain && dx === cx && dy === cy) {
          tiles[ty][tx] = createTile('fountain', false);
        } else if ((dx + dy) % 12 === 0) {
          tiles[ty][tx] = createTile(lampType, false);
        } else if (isCity) {
          const tileHash = ((dx * 13 + dy * 7 + seed) >>> 0) % 100;
          const onEdge = dx === 0 || dy === 0 || dx === f.width - 1 || dy === f.height - 1;
          const nearEdge = dx <= 1 || dy <= 1 || dx >= f.width - 2 || dy >= f.height - 2;

          if (onEdge && tileHash % 6 === 0) {
            tiles[ty][tx] = createTile('iron_railing', false);
          } else if (onEdge && tileHash % 8 === 0) {
            tiles[ty][tx] = createTile('pillar', false);
          } else if (nearEdge && tileHash % 14 === 0) {
            tiles[ty][tx] = createTile('bench', false);
          } else if (!nearEdge && tileHash % 18 === 0) {
            tiles[ty][tx] = createTile('cobblestone_dark', true);
          } else if (!onEdge && dx % 6 === 3 && dy % 6 === 3 && f.width >= 14 && f.height >= 14) {
            tiles[ty][tx] = createTile('street_lamp', false);
          } else {
            tiles[ty][tx] = createTile('cobblestone', true);
          }
        } else {
          // Grassland plaza: add benches, lanterns, accent tiles, center well
          const tileHash = ((dx * 13 + dy * 7 + seed) >>> 0) % 100;
          const onEdge = dx === 0 || dy === 0 || dx === f.width - 1 || dy === f.height - 1;
          const nearEdge = dx <= 1 || dy <= 1 || dx >= f.width - 2 || dy >= f.height - 2;
          const isLarge = f.width >= 10 && f.height >= 10;

          if (isLarge && dx === cx && dy === cy) {
            tiles[ty][tx] = createTile('well', false);
          } else if (onEdge && (dx + dy) % 10 === 0) {
            tiles[ty][tx] = createTile('lantern', false);
          } else if (nearEdge && !onEdge && tileHash % 14 === 0) {
            tiles[ty][tx] = createTile('bench', false);
          } else if (!nearEdge && tileHash % 7 === 0) {
            tiles[ty][tx] = createTile('cobblestone_dark', true);
          } else if (onEdge && tileHash % 20 === 0) {
            tiles[ty][tx] = createTile('pot', false);
          } else {
            tiles[ty][tx] = createTile('cobblestone', true);
          }
        }
      }
    }
  }
}

function placeForestGrove(tiles: Tile[][], f: MapFeature) {
  const cx = f.x + f.width / 2;
  const cy = f.y + f.height / 2;
  const rx = f.width / 2;
  const ry = f.height / 2;
  for (let dy = -Math.ceil(ry); dy <= Math.ceil(ry); dy++) {
    for (let dx = -Math.ceil(rx); dx <= Math.ceil(rx); dx++) {
      const tx = Math.floor(cx + dx);
      const ty = Math.floor(cy + dy);
      if (ty >= 0 && ty < tiles.length && tx >= 0 && tx < tiles[0].length) {
        const dist = (dx * dx) / (rx * rx) + (dy * dy) / (ry * ry);
        if (dist < 0.3) {
          tiles[ty][tx] = createTile('dark_grass', true);
        } else if (dist < 0.6) {
          if ((dx + dy) % 3 === 0) {
            tiles[ty][tx] = createTile('tree', false);
          } else {
            tiles[ty][tx] = createTile('dark_grass', true);
          }
        } else if (dist < 1.0) {
          if ((dx + dy) % 2 === 0) {
            tiles[ty][tx] = createTile('tree', false);
          } else {
            tiles[ty][tx] = createTile('tall_grass', true);
          }
        }
      }
    }
  }
}

function placeFort(tiles: Tile[][], f: MapFeature) {
  const W = f.width;
  const H = f.height;
  const gateX = Math.floor(W / 2);
  const towerR = 3;

  const inCornerTower = (dx: number, dy: number) =>
    (dx < towerR && dy < towerR) ||
    (dx >= W - towerR && dy < towerR) ||
    (dx < towerR && dy >= H - towerR) ||
    (dx >= W - towerR && dy >= H - towerR);

  const isOuterWall = (dx: number, dy: number) =>
    dx === 0 || dx === W - 1 || dy === 0 || dy === H - 1;

  const isSecondWall = (dx: number, dy: number) =>
    dx === 1 || dx === W - 2 || dy === 1 || dy === H - 2;

  for (let dy = 0; dy < H; dy++) {
    for (let dx = 0; dx < W; dx++) {
      const tx = f.x + dx;
      const ty = f.y + dy;
      if (ty < 0 || ty >= tiles.length || tx < 0 || tx >= tiles[0].length) continue;

      // --- Corner towers: solid stone with lantern at center ---
      if (inCornerTower(dx, dy)) {
        const cxL = dx < W / 2 ? Math.floor(towerR / 2) : W - 1 - Math.floor(towerR / 2);
        const cyL = dy < H / 2 ? Math.floor(towerR / 2) : H - 1 - Math.floor(towerR / 2);
        if (dx === cxL && dy === cyL) {
          tiles[ty][tx] = createTile('lantern', false);
        } else {
          tiles[ty][tx] = createTile('stone', false);
        }
        continue;
      }

      // --- Gatehouse: 3-wide opening on south wall with flanking lanterns ---
      if (dy === H - 1 && dx >= gateX - 1 && dx <= gateX + 1) {
        tiles[ty][tx] = createTile('gate', true);
        continue;
      }
      if (dy === H - 2 && (dx === gateX - 2 || dx === gateX + 2)) {
        tiles[ty][tx] = createTile('lantern', false);
        continue;
      }
      if (dy === H - 2 && dx >= gateX - 1 && dx <= gateX + 1) {
        tiles[ty][tx] = createTile('cobblestone', true);
        continue;
      }

      // --- Outer wall (double-thick stone) ---
      if (isOuterWall(dx, dy)) {
        tiles[ty][tx] = createTile('stone', false);
        continue;
      }
      if (isSecondWall(dx, dy)) {
        tiles[ty][tx] = createTile('stone', false);
        continue;
      }

      // --- Wall-walk ring (iron_fence on the inside of the double wall) ---
      if (dx === 2 || dx === W - 3 || dy === 2 || dy === H - 3) {
        if ((dx + dy) % 3 === 0) {
          tiles[ty][tx] = createTile('iron_fence', false);
        } else {
          tiles[ty][tx] = createTile('cobblestone', true);
        }
        continue;
      }

      // --- Interior ---
      if (dx === gateX && dy === Math.floor(H / 2)) {
        // River forest fort: no central fire ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â keep courtyard open stone only
        if (f.interactionId === 'forest_fort') {
          tiles[ty][tx] = createTile('cobblestone', true);
        } else {
          tiles[ty][tx] = createTile('campfire_remains', false);
        }
      } else if ((dx + dy * 3) % 11 === 0) {
        tiles[ty][tx] = createTile('barrel', false);
      } else if ((dx * 2 + dy) % 13 === 0) {
        tiles[ty][tx] = createTile('crate', false);
      } else {
        tiles[ty][tx] = createTile('cobblestone', true);
      }
    }
  }

  // --- Exterior gatehouse frame: stone pillars + lanterns south of the gate ---
  const frameY = f.y + H;
  const frameLX = f.x + gateX - 2;
  const frameRX = f.x + gateX + 2;
  if (frameY < tiles.length) {
    if (frameLX >= 0 && frameLX < tiles[0].length)
      tiles[frameY][frameLX] = createTile('stone', false);
    if (frameRX >= 0 && frameRX < tiles[0].length)
      tiles[frameY][frameRX] = createTile('stone', false);
    const torchLX = f.x + gateX - 1;
    const torchRX = f.x + gateX + 1;
    if (torchLX >= 0 && torchLX < tiles[0].length)
      tiles[frameY][torchLX] = createTile('lantern', false);
    if (torchRX >= 0 && torchRX < tiles[0].length)
      tiles[frameY][torchRX] = createTile('lantern', false);
  }
}

function placeEnchantedGrove(tiles: Tile[][], f: MapFeature) {
  const cx = f.x + f.width / 2;
  const cy = f.y + f.height / 2;
  const rx = f.width / 2;
  const ry = f.height / 2;
  // Use pseudo-random scatter based on tile position for natural placement
  const hash = (x: number, y: number) => {
    const n = Math.sin(x * 127.1 + y * 311.7) * 43758.5453;
    return n - Math.floor(n);
  };
  for (let dy = -Math.ceil(ry); dy <= Math.ceil(ry); dy++) {
    for (let dx = -Math.ceil(rx); dx <= Math.ceil(rx); dx++) {
      const tx = Math.floor(cx + dx);
      const ty = Math.floor(cy + dy);
      if (ty >= 0 && ty < tiles.length && tx >= 0 && tx < tiles[0].length) {
        const dist = (dx * dx) / (rx * rx) + (dy * dy) / (ry * ry);
        const rng = hash(tx, ty);
        if (dist < 0.15) {
          // Center clearing with scattered flowers
          if (rng < 0.35) {
            tiles[ty][tx] = createTile('flower', true);
          } else {
            tiles[ty][tx] = createTile('dark_grass', true);
          }
        } else if (dist < 0.4) {
          // Mushroom ring - scattered naturally, not grid-aligned
          if (rng < 0.2) {
            tiles[ty][tx] = createTile('mushroom', true);
          } else if (rng < 0.4) {
            tiles[ty][tx] = createTile('flower', true);
          } else {
            tiles[ty][tx] = createTile('dark_grass', true);
          }
        } else if (dist < 0.7) {
          // Dense magical trees - scattered
          if (rng < 0.45) {
            tiles[ty][tx] = createTile('tree', false);
          } else {
            tiles[ty][tx] = createTile('dark_grass', true);
          }
        } else if (dist < 1.0) {
          // Outer ring - thick canopy
          if (rng < 0.6) {
            tiles[ty][tx] = createTile('tree', false);
          } else {
            tiles[ty][tx] = createTile('tall_grass', true);
          }
        }
      }
    }
  }
}

function placeChurch(tiles: Tile[][], f: MapFeature) {
  if (isBuildingNearby(tiles, f.x, f.y, f.width, f.height)) return;
  const aisleCenter = Math.floor(f.width / 2);
  const aisleHalfWidth = f.width >= 10 ? 1 : 0;
  const isAisle = (dx: number) => dx >= aisleCenter - aisleHalfWidth && dx <= aisleCenter;
  for (let dy = 0; dy < f.height; dy++) {
    for (let dx = 0; dx < f.width; dx++) {
      const tx = f.x + dx;
      const ty = f.y + dy;
      if (ty >= 0 && ty < tiles.length && tx >= 0 && tx < tiles[0].length) {
        // Stone walls
        if (dx === 0 || dx === f.width - 1 || dy === 0 || dy === f.height - 1) {
          const isSouthGate = isAisle(dx) && dy === f.height - 1;
          const isNorthExit = isAisle(dx) && dy === 0;
          if (isSouthGate || isNorthExit) {
            tiles[ty][tx] = createTile('dirt', true);
          } else {
            tiles[ty][tx] = createTile('mossy_stone', false);
          }
        }
        // Interior with statues as pillars
        else if (dx === 2 && dy % 3 === 1) {
          tiles[ty][tx] = createTile('statue', false);
        } else if (dx === f.width - 3 && dy % 3 === 1) {
          tiles[ty][tx] = createTile('statue', false);
        }
        // Pews (cobblestone rows)
        else if (dy >= 3 && dy <= f.height - 3 && (dx >= 3 && dx <= f.width - 4)) {
          if (dy % 2 === 0 && !isAisle(dx)) {
            tiles[ty][tx] = createTile('wooden_path', false);
          } else {
            tiles[ty][tx] = createTile('cobblestone', true);
          }
        } else {
          tiles[ty][tx] = createTile('cobblestone', true);
        }
      }
    }
  }
}

function placeRuinedFort(tiles: Tile[][], f: MapFeature) {
  if (isBuildingNearby(tiles, f.x, f.y, f.width, f.height)) return;
  const isHunterGateRuin = f.interactionId === 'hunter_gate_ruin';
  const isRuinedEastFort = f.interactionId === 'ruined_east_fort';

  const midX = Math.floor(f.width / 2);
  const midY = Math.floor(f.height / 2);
  const breachHalf = 2;

  const isSouthBreach = (dx: number, dy: number) =>
    !isHunterGateRuin && dy === f.height - 1 && dx >= midX - breachHalf && dx <= midX + breachHalf;
  const isWestBreach = (dx: number, dy: number) =>
    !isHunterGateRuin && dx === 0 && dy >= midY - breachHalf && dy <= midY + breachHalf;
  const isEastBreach = (dx: number, dy: number) =>
    isRuinedEastFort && dx === f.width - 1 && dy >= midY - breachHalf && dy <= midY + breachHalf;

  const isCornerBastion = (dx: number, dy: number) =>
    (dx <= 1 && dy <= 1) || (dx >= f.width - 2 && dy <= 1) ||
    (dx <= 1 && dy >= f.height - 2) || (dx >= f.width - 2 && dy >= f.height - 2);

  const wallTile = (dx: number, dy: number): TileType => {
    if (isCornerBastion(dx, dy)) return 'stone';
    return (dx * 5 + dy * 3 + (isRuinedEastFort ? 1 : 0)) % 4 === 0 ? 'ruined_fort_wall' : 'ruined_fort_wall_mossy';
  };

  const innerWallWalk = (dx: number, dy: number) =>
    dx === 1 || dx === f.width - 2 || dy === 1 || dy === f.height - 2;

  const interiorTile = (dx: number, dy: number): Tile => {
    if (isHunterGateRuin) return createTile('ruins_floor', true);
    const n = (dx * 17 + dy * 29 + f.x * 3 + f.y * 5) % 97;
    if (n === 0 || n === 39) return createTile('destroyed_house_rubble', false);
    if (n % 23 === 0) return createTile('crate', false);
    if (n % 29 === 0) return createTile('barrel', false);
    if (n % 13 === 0) return createTile('bones', true);
    if (n % 11 === 0) return createTile('rubble', true);
    if (n % 7 === 0) return createTile('tall_grass', true);
    return createTile((dx + dy) % 5 === 0 ? 'cobblestone' : 'ruins_floor', true);
  };

  for (let dy = 0; dy < f.height; dy++) {
    for (let dx = 0; dx < f.width; dx++) {
      const tx = f.x + dx;
      const ty = f.y + dy;
      if (ty < 0 || ty >= tiles.length || tx < 0 || tx >= tiles[0].length) continue;

      const isBorder = dx === 0 || dx === f.width - 1 || dy === 0 || dy === f.height - 1;

      if (isBorder) {
        if (isSouthBreach(dx, dy) || isWestBreach(dx, dy) || isEastBreach(dx, dy)) {
          tiles[ty][tx] = createTile((dx + dy) % 2 === 0 ? 'rubble' : 'ruins_floor', true);
        } else {
          tiles[ty][tx] = createTile(wallTile(dx, dy), false);
        }
      } else if (isCornerBastion(dx, dy)) {
        tiles[ty][tx] = createTile('stone', false);
      } else if (innerWallWalk(dx, dy)) {
        tiles[ty][tx] = createTile((dx + dy) % 6 === 0 ? 'rubble' : 'cobblestone', true);
      } else {
        tiles[ty][tx] = interiorTile(dx, dy);
      }
    }
  }

  const canReplaceForBreach = (tile: Tile) =>
    !tile.transition && !tile.interactable &&
    tile.type !== 'water' && tile.type !== 'water_corrupted' &&
    tile.type !== 'bridge' && tile.type !== 'cliff_face' && tile.type !== 'cliff_edge' &&
    tile.type !== 'stairs' && tile.type !== 'ladder';

  // Rubble scatter just outside the breaches to make them read as collapsed wall.
  const scatterBreach = (bx: number, by: number, outDx: number, outDy: number) => {
    for (let i = -breachHalf; i <= breachHalf; i++) {
      const sx = f.x + bx + (outDy !== 0 ? i : 0) + outDx;
      const sy = f.y + by + (outDx !== 0 ? i : 0) + outDy;
      if (sy >= 0 && sy < tiles.length && sx >= 0 && sx < tiles[0].length) {
        const existing = tiles[sy][sx];
        if (canReplaceForBreach(existing) && existing.type !== 'mossy_stone' && existing.type !== 'ruined_fort_wall_mossy') {
          tiles[sy][sx] = createTile('rubble', true);
        }
      }
    }
  };

  const clearBreachApron = (bx: number, by: number, outDx: number, outDy: number) => {
    for (let step = 1; step <= 3; step++) {
      for (let i = -breachHalf; i <= breachHalf; i++) {
        const sx = f.x + bx + (outDy !== 0 ? i : outDx * step);
        const sy = f.y + by + (outDx !== 0 ? i : outDy * step);
        if (sy >= 0 && sy < tiles.length && sx >= 0 && sx < tiles[0].length && canReplaceForBreach(tiles[sy][sx])) {
          tiles[sy][sx] = createTile(step === 1 ? 'rubble' : 'grass', true);
        }
      }
    }
  };

  if (!isHunterGateRuin) {
    scatterBreach(midX, f.height - 1, 0, 1);
    scatterBreach(0, midY, -1, 0);
    clearBreachApron(midX, f.height - 1, 0, 1);
    clearBreachApron(0, midY, -1, 0);
    if (isRuinedEastFort) {
      scatterBreach(f.width - 1, midY, 1, 0);
      clearBreachApron(f.width - 1, midY, 1, 0);
    }
  }

  const cx = f.x + midX;
  const cy = f.y + midY;
  if (cy < tiles.length && cx < tiles[0].length) {
    tiles[cy][cx] = createTile('campfire_remains', false);
  }
}

function placeCottage(tiles: Tile[][], f: MapFeature) {
  // witch_cottage is intentionally adjacent to the golem boss arena; hunter_cottage and ranger_cabin
  // share a compound. All three may coexist with nearby structure tiles.
  const allowNearbyStructureCluster = /hunter_cottage|ranger_cabin|ranger_cabin_ruin|woodcutter_cottage_ruin|hollow_ruin/.test(f.interactionId ?? '');
  if (!allowNearbyStructureCluster && isBuildingNearby(tiles, f.x, f.y, f.width, f.height)) return;

  // Clear a yard around the cottage to prevent blocked doors.
  // Sample the center tile to determine whether the yard should be dirt or grass
  // so the cottage respects the surrounding terrain (e.g. dirt clearings in forests).
  const yardPad = 4;
  const sampleTx = f.x + Math.floor(f.width / 2);
  const sampleTy = f.y + Math.floor(f.height / 2);
  const sampleType = (sampleTy >= 0 && sampleTy < tiles.length && sampleTx >= 0 && sampleTx < tiles[0].length)
    ? tiles[sampleTy][sampleTx].type : 'grass';
  const yardFill: TileType = sampleType === 'dirt' ? 'dirt' : 'grass';
  for (let dy = -yardPad; dy < f.height + yardPad; dy++) {
    for (let dx = -yardPad; dx < f.width + yardPad; dx++) {
      const tx = f.x + dx;
      const ty = f.y + dy;
      if (ty >= 0 && ty < tiles.length && tx >= 0 && tx < tiles[0].length) {
        const existing = tiles[ty][tx];
        if (HOUSE_TYPES.has(existing.type) || existing.type === 'portal' ||
            isChestTileType(existing.type) || existing.interactable) continue;
        if (!existing.walkable || existing.type === 'water' || existing.type === 'water_corrupted' || existing.type === 'tree' ||
            existing.type === 'rock' || existing.type === 'swamp') {
          tiles[ty][tx] = createTile(yardFill, true);
        }
      }
    }
  }

  const cx = Math.floor(f.width / 2);
  const hasInterior = !!(f.interiorMap && f.interiorSpawnX !== undefined && f.interiorSpawnY !== undefined);
  const isWhisperingCottage = /hunter_cottage|forest_cottage|ruin_cottage|hidden_cottage|ranger_cabin/.test(f.interactionId ?? '');
  // Abandoned exterior prop ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â ruined facade, vines/tall grass, no door interaction (set dressing).
  const isAbandonedForestShack = f.interactionId === 'forest_hermit'
    || f.interactionId === 'woodcutter_cottage_ruin'
    || f.interactionId === 'ranger_cabin_ruin'
    || /^hollow_ruin/.test(f.interactionId ?? '');
  const isRuinedForestCottageFacade = /forest_hermit|woodcutter_cottage_ruin|ranger_cabin_ruin|hollow_ruin/.test(f.interactionId ?? '');
  const isNonEnterable = !f.interactionId && !hasInterior;
  const isRangerCabin = f.interactionId === 'ranger_cabin';
  const facadeTile: TileType = isRuinedForestCottageFacade
    ? 'cottage_house_forest_ruined'
    : isRangerCabin
      ? 'cottage_house_ranger'
      : isWhisperingCottage
        ? 'cottage_house_forest'
        : isNonEnterable
          ? 'cottage_shed'
          : 'cottage_house';
  const anchors = (() => {
    const entryX = f.x + cx;
    // Canonical exterior cottage interaction anchor.
    // Keep this aligned with legacy player-facing coordinates (ex: -29,40 in village cottage).
    const entryY = f.y + f.height - 3;
    const frontY = f.y + f.height;
    return {
      centerX: cx,
      spriteStartX: cx,
      spriteRow: Math.max(1, f.height - 2),
      entryX,
      entryY,
      frontY,
    };
  })();
  const bodyRows = Math.max(2, Math.ceil(f.height * 0.5));
  const apronStartRow = Math.max(bodyRows, f.height - 2);
  // Keep facade above the threshold door tile so both render (door + cottage).
  const spriteRow = anchors.spriteRow;

  for (let dy = 0; dy < f.height; dy++) {
    for (let dx = 0; dx < f.width; dx++) {
      const tx = f.x + dx;
      const ty = f.y + dy;
      if (ty < 0 || ty >= tiles.length || tx < 0 || tx >= tiles[0].length) continue;

      if (dy === spriteRow && dx === anchors.spriteStartX) {
        // Visual facade sprite ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â non-walkable in all cases.
        tiles[ty][tx] = createTile(facadeTile, false);
      } else if (hasInterior) {
        // Keep only the upper cottage body blocked. Interior cottages use oversized facade art,
        // and the player collision radius needs a few walkable rows in front of the facade to
        // actually step onto the visible pad from the sides and approach the entrance cleanly.
        // Entry triggers are still stamped explicitly below, and the facade sprite tile remains
        // non-walkable via the branch above.
        // For oversized interior-cottage facades, keep only the top strip blocked.
        // Remaining footprint rows must be walkable so no invisible non-walkable
        // bands remain on the visible approach pad.
        tiles[ty][tx] = createTile(yardFill, true);
      } else if (dy < bodyRows) {
        if (isAbandonedForestShack || isNonEnterable) {
          tiles[ty][tx] = createTile(yardFill, true);
        } else {
          tiles[ty][tx] = createTile('wood', false);
        }
      } else if (dx === anchors.centerX && dy === f.height - 1) {
        tiles[ty][tx] = isAbandonedForestShack || !f.interactionId
          ? createTile('dirt', true)
          : createTile('dirt', true, { interactable: true, interactionId: f.interactionId });
      } else if (!isAbandonedForestShack && dy === f.height - 1 && (dx === anchors.centerX - 1 || dx === anchors.centerX + 1) && f.width >= 4) {
        tiles[ty][tx] = createTile('lantern', false);
      } else if (isAbandonedForestShack && dy === f.height - 1 && (dx === anchors.centerX - 1 || dx === anchors.centerX + 1) && f.width >= 4) {
        tiles[ty][tx] = (dx + f.x + ty) % 2 === 0 ? createTile('tall_grass', true) : createTile('dead_tree', false);
      } else if (dy >= apronStartRow) {
        if (isAbandonedForestShack) {
          const h = (dx * 5 + dy * 7 + f.x) % 10;
          if (h < 4) tiles[ty][tx] = createTile('tall_grass', true);
          else if (h === 4) tiles[ty][tx] = createTile('dark_grass', true);
          else if (h === 5) tiles[ty][tx] = createTile('mushroom', true);
          else tiles[ty][tx] = createTile('dirt', true);
        } else {
          tiles[ty][tx] = createTile('dirt', true);
        }
      } else {
        if (isAbandonedForestShack) {
          const h = (dx + dy * 3 + f.y) % 7;
          if (h < 3) tiles[ty][tx] = createTile('tall_grass', true);
          else if (h === 3) tiles[ty][tx] = createTile('dark_grass', true);
          else if (h === 4) tiles[ty][tx] = createTile('bones', true);
          else tiles[ty][tx] = createTile('grass', true);
        } else if ((dx + dy) % 4 === 0) {
          tiles[ty][tx] = createTile('flower', true);
        } else {
          tiles[ty][tx] = createTile('grass', true);
        }
      }
    }
  }

  // Exterior entry door: one tile in front of the cottage threshold.
  if (hasInterior) {
    if (anchors.entryY >= 0 && anchors.entryY < tiles.length && anchors.entryX >= 0 && anchors.entryX < tiles[0].length) {
      tiles[anchors.entryY][anchors.entryX] = createTile('dirt', true, {
        transition: { targetMap: f.interiorMap!, targetX: f.interiorSpawnX!, targetY: f.interiorSpawnY! },
        interactable: true,
        interactionId: 'building_entrance',
      });
    }

    // Secondary fallback trigger at the front step to keep interaction forgiving.
    if (anchors.frontY >= 0 && anchors.frontY < tiles.length && anchors.entryX >= 0 && anchors.entryX < tiles[0].length) {
      const existing = tiles[anchors.frontY][anchors.entryX];
      if (!existing.interactable) {
        tiles[anchors.frontY][anchors.entryX] = createTile('dirt', true, {
          transition: { targetMap: f.interiorMap!, targetX: f.interiorSpawnX!, targetY: f.interiorSpawnY! },
          interactable: true,
          interactionId: 'building_entrance',
        });
      }
    }
  }

  // Dirt path from the door outward. Interior cottages use map-authored trails for the approach
  // so we do not paint a brown apron that fights grass buffers in front of oversized facades.
  if (!hasInterior) {
    const doorX = anchors.entryX;
    for (let step = 1; step <= 3; step++) {
      const ty = f.y + f.height - 1 + step;
      if (ty >= 0 && ty < tiles.length && doorX >= 0 && doorX < tiles[0].length) {
        if (isAbandonedForestShack) {
          tiles[ty][doorX] = step === 1
            ? createTile('dirt', true)
            : createTile('tall_grass', true);
        } else {
          tiles[ty][doorX] = createTile('dirt', true);
        }
      }
    }
  }
}

function validateMapTransitions(tiles: Tile[][], def: MapDefinition) {
  // Validate static portal targets got stamped with transitions.
  for (const portal of def.portals) {
    if (portal.y < 0 || portal.y >= tiles.length || portal.x < 0 || portal.x >= tiles[0].length) {
      console.warn(`[MapValidation] ${def.name}: portal out of bounds at (${portal.x},${portal.y})`);
      continue;
    }
    const tile = tiles[portal.y][portal.x];
    if (!tile.transition) {
      console.warn(`[MapValidation] ${def.name}: portal missing transition at (${portal.x},${portal.y})`);
    }
  }

  // Validate interior-enabled features have at least one entrance tile somewhere on the map
  // that targets the expected interior. Standard buildings and cottages stamp their
  // entrances differently, so a tight feature-bounds scan produces false positives.
  for (const f of def.features) {
    const hasInterior = !!(f.interiorMap && f.interiorSpawnX !== undefined && f.interiorSpawnY !== undefined);
    if (!hasInterior) continue;
    // Cave-mouth EXITS use a 'building_exit' tile, not 'building_entrance', so skip the
    // entrance-presence validation for them.
    if (f.type === 'cave_mouth' && f.caveExit) continue;

    let foundEntrance = false;
    for (let y = 0; y < def.height && !foundEntrance; y++) {
      for (let x = 0; x < def.width; x++) {
        const tile = tiles[y][x];
        if (tile.interactable && tile.interactionId === 'building_entrance' && tile.transition?.targetMap === f.interiorMap) {
          foundEntrance = true;
          break;
        }
      }
    }

    if (!foundEntrance) {
      console.warn(
        `[MapValidation] ${def.name}: missing building entrance for feature ${f.interactionId ?? f.type} -> ${f.interiorMap}`
      );
    }
  }
}

/** Late map passes can overwrite prop tiles - restore authored ritual glyphs before validation. */
function restampAuthoredRitualGlyphs(tiles: Tile[][], def: MapDefinition) {
  const ritualTypes: Set<string> = new Set(['summoning_ritual', 'summoning_ritual_dud']);
  for (const prop of def.props ?? []) {
    if (!ritualTypes.has(prop.type)) continue;
    if (prop.y < 0 || prop.y >= tiles.length || prop.x < 0 || prop.x >= tiles[0].length) continue;
    const el = tiles[prop.y][prop.x]?.elevation ?? 0;
    tiles[prop.y][prop.x] = createTile(prop.type as TileType, prop.walkable ?? true, { elevation: el });
  }

  if (def.name === 'Whispering Woods') {
    const mapLike: WorldMap = {
      name: def.name,
      width: def.width,
      height: def.height,
      tiles,
      spawnPoint: def.spawnPoint,
    };
    for (const prop of def.props ?? []) {
      if (prop.type === 'summoning_ritual') {
        applyRevenantRitualDecor(mapLike, prop.x, prop.y);
      }
    }
  }
}

function validateAuthoredPlacements(tiles: Tile[][], def: MapDefinition) {
  const spawnDx = (x: number) => x - def.spawnPoint.x;
  const spawnDy = (y: number) => y - def.spawnPoint.y;

  for (const chest of def.chests) {
    if (chest.y < 0 || chest.y >= tiles.length || chest.x < 0 || chest.x >= tiles[0].length) {
      console.warn(`[MapValidation] ${def.name}: chest out of bounds at (${chest.x},${chest.y})`);
      continue;
    }
    const tile = tiles[chest.y][chest.x];
    if (!isChestTileType(tile.type) || tile.interactionId !== chest.interactionId) {
      console.warn(`[MapValidation] ${def.name}: chest placement overwritten at (${chest.x},${chest.y}) [${chest.interactionId}]`);
    }
    const distSq = spawnDx(chest.x) * spawnDx(chest.x) + spawnDy(chest.y) * spawnDy(chest.y);
    if (distSq <= 4) {
      console.warn(`[MapValidation] ${def.name}: chest ${chest.interactionId} is very close to spawn at (${chest.x},${chest.y})`);
    }
  }

  const ritualGlyphTypes: Set<string> = new Set(['summoning_ritual', 'summoning_ritual_dud']);
  for (const prop of def.props ?? []) {
    if (!ritualGlyphTypes.has(prop.type)) continue;
    if (prop.y < 0 || prop.y >= tiles.length || prop.x < 0 || prop.x >= tiles[0].length) {
      console.warn(`[MapValidation] ${def.name}: ritual glyph out of bounds at (${prop.x},${prop.y})`);
      continue;
    }
    const tile = tiles[prop.y][prop.x];
    if (tile.type !== prop.type) {
      console.warn(
        `[MapValidation] ${def.name}: ritual glyph overwritten at (${prop.x},${prop.y}) expected [${prop.type}] got [${tile.type}]`,
      );
    }
  }

  for (const interactable of def.interactables) {
    if (interactable.y < 0 || interactable.y >= tiles.length || interactable.x < 0 || interactable.x >= tiles[0].length) {
      console.warn(`[MapValidation] ${def.name}: interactable out of bounds at (${interactable.x},${interactable.y}) [${interactable.interactionId}]`);
      continue;
    }
    const tile = tiles[interactable.y][interactable.x];
    if (tile.interactionId !== interactable.interactionId) {
      console.warn(
        `[MapValidation] ${def.name}: interactable overwritten at (${interactable.x},${interactable.y}) expected [${interactable.interactionId}] got [${tile.interactionId ?? tile.type}]`
      );
    }
  }
}

function placeWatchtower(tiles: Tile[][], f: MapFeature) {
  const cx = f.x + Math.floor(f.width / 2);
  const cy = f.y + Math.floor(f.height / 2);
  for (let dy = 0; dy < f.height; dy++) {
    for (let dx = 0; dx < f.width; dx++) {
      const tx = f.x + dx;
      const ty = f.y + dy;
      if (ty >= 0 && ty < tiles.length && tx >= 0 && tx < tiles[0].length) {
        const ddx = tx - cx;
        const ddy = ty - cy;
        const dist = ddx * ddx + ddy * ddy;
        if (dist <= 4) {
          tiles[ty][tx] = createTile('stone', false);
        } else if (dist <= 9) {
          tiles[ty][tx] = createTile('cobblestone', true);
        } else {
          tiles[ty][tx] = createTile('dirt', true);
        }
      }
    }
  }
  // Entrance
  const ey = cy + 2;
  if (ey < tiles.length) {
    tiles[ey][cx] = createTile('cobblestone', true);
  }
  // Lantern on top
  if (cy < tiles.length && cx < tiles[0].length) {
    tiles[cy][cx] = createTile('lantern', false);
  }
}

function placePortals(tiles: Tile[][], def: MapDefinition) {
  // Determine if this is an interior map (use door for exits) or overworld (use portal)
  const isInterior = def.name.toLowerCase().includes('inn') || 
                     def.name.toLowerCase().includes('smith') || 
                     def.name.toLowerCase().includes('shop') ||
                     def.name.toLowerCase().includes('cottage') ||
                     def.name.toLowerCase().includes('cabin') ||
                     def.name.toLowerCase().includes('hut') ||
                     def.name.toLowerCase().includes('hollow');
  
  for (const portal of def.portals) {
    if (portal.y < tiles.length && portal.x < tiles[0].length) {
      // Use door for interior exits, portal for overworld transitions
      const tileType: TileType = isInterior ? 'door_interior' : 'portal';
      tiles[portal.y][portal.x] = createTile(tileType, true, {
        transition: { targetMap: portal.targetMap, targetX: portal.targetX, targetY: portal.targetY },
        interactable: isInterior ? true : undefined,
        interactionId: isInterior ? 'building_exit' : undefined,
      });
      // Clear surrounding tiles for accessibility (include border rows so interior doors are reachable)
      const clearTile: TileType = isInterior ? 'wood_floor' : 'stone';
      const clearRange = isInterior ? 2 : 1;
      for (let dy = -clearRange; dy <= clearRange; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          if (dx === 0 && dy === 0) continue;
          const tx = portal.x + dx;
          const ty = portal.y + dy;
          if (ty >= 0 && ty < tiles.length && tx >= 0 && tx < tiles[0].length) {
            if (
              tiles[ty][tx].type !== 'portal' &&
              tiles[ty][tx].type !== 'door' &&
              tiles[ty][tx].type !== 'door_interior'
            ) {
              tiles[ty][tx] = createTile(clearTile, true);
            }
          }
        }
      }
    }
  }
}

/** Never grind these down for chest access ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â preserves cemetery palisade, gates, castle rails. */
const CHEST_CARVE_SKIP_TYPES: Set<TileType> = new Set([
  'fence', 'gate', 'iron_fence',
]);

function placeChests(tiles: Tile[][], def: MapDefinition) {
  const shouldCarveAccess = def.width >= 40 || def.height >= 40;
  for (const chest of def.chests) {
    if (chest.y >= 0 && chest.y < tiles.length && chest.x >= 0 && chest.x < tiles[0].length) {
      tiles[chest.y][chest.x] = createTile(getClosedChestTileType(chest.interactionId), true, { interactable: true, interactionId: chest.interactionId });
      if (shouldCarveAccess) {
        // Only auto-carve access in large field maps; authored interiors should keep their walls/floors intact.
        for (let dx = -1; dx <= 1; dx++) {
          for (let dy = -1; dy <= 1; dy++) {
            const tx = chest.x + dx;
            const ty = chest.y + dy;
            if (ty >= 2 && ty < tiles.length - 2 && tx >= 2 && tx < tiles[0].length - 2) {
              const t = tiles[ty][tx];
              if (!t.walkable && !isChestTileType(t.type) && !CHEST_CARVE_SKIP_TYPES.has(t.type)) {
                tiles[ty][tx] = createTile('grass', true);
              }
            }
          }
        }
      }
    }
  }
}

function placeInteractables(tiles: Tile[][], def: MapDefinition) {
  for (const obj of def.interactables) {
    if (obj.y < tiles.length && obj.x < tiles[0].length) {
      const softInteractable =
        obj.type === 'bonfire' ||
        obj.type === 'bonfire_unlit' ||
        obj.type === 'campfire' ||
        obj.type === 'sign' ||
        obj.type === 'chain' ||
        obj.type === 'shortcut_lever' ||
        obj.type === 'lantern';
      const placedType = obj.type === 'bonfire' ? 'bonfire_unlit' : obj.type;
      tiles[obj.y][obj.x] = createTile(placedType as TileType, softInteractable ? true : obj.walkable, {
        interactable: true,
        interactionId: obj.interactionId,
      });
    }
  }
}

function placeSecretAreas(tiles: Tile[][], def: MapDefinition) {
  if (!def.secretAreas) return;
  for (const secret of def.secretAreas) {
    for (let dy = 0; dy < secret.height; dy++) {
      for (let dx = 0; dx < secret.width; dx++) {
        const tx = secret.x + dx;
        const ty = secret.y + dy;
        if (ty >= 0 && ty < tiles.length && tx >= 0 && tx < tiles[0].length) {
          tiles[ty][tx] = createTile(secret.fill, true, { hidden: true });
        }
      }
    }
  }
}

// Tiles that should not have decoration overlays on or adjacent to them
const INCOMPATIBLE_BASE: Set<TileType> = new Set<TileType>([
  'water', 'water_corrupted', 'lava', 'ice', 'swamp', 'waterfall', 'bridge', 'bridge_corrupted', 'bridge_folded', 'bridge_decay_blend',
  // Cliff faces: trees growing out of vertical rock walls look wrong
  'cliff', 'cliff_edge', 'cliff_corrupted', 'cliff_edge_corrupted',
] as TileType[]);

// Decoration overlay types that should only appear on land
const LAND_DECORATIONS: Set<TileType> = new Set([
  'flower', 'moonbloom', 'tall_grass', 'mushroom', 'rock', 'tree', 'dead_tree',
  'stump', 'bones', 'scarecrow', 'hay_bale', 'tombstone',
  'fallen_log', 'fallen_log_v',
]);

// Path-type tiles that trees/rocks should be cleared away from
const PATH_TILES: Set<TileType> = new Set([
  'dirt', 'cobblestone', 'wooden_path', 'wood_floor', 'bridge', 'bridge_corrupted', 'bridge_folded', 'sand',
]);

/**
 * Mark cells just south of cliff art as unwalkable (sprite overlap), optional y-min for coastal rows.
 */
function applySouthCliffSpriteWalkabilityBuffer(
  tiles: Tile[][],
  minX: number,
  maxXExclusive: number,
  southEdgeYExclusive: number,
  coastProtectMaxY: number,
): void {
  const h = tiles.length;
  const w = tiles[0]?.length ?? 0;
  for (let x = minX; x < maxXExclusive; x++) {
    if (x < 0 || x >= w) continue;
    for (let b = 0; b < CLIFF_SPRITE_BUFFER_ROWS; b++) {
      const ty = southEdgeYExclusive + b;
      if (ty >= h || ty < coastProtectMaxY) continue;
      const bufTile = tiles[ty][x];
      if (!bufTile.transition && !bufTile.interactable && bufTile.type !== 'stairs'
          && !PATH_TILES.has(bufTile.type) && bufTile.type !== 'bridge' && bufTile.type !== 'bridge_corrupted') {
        tiles[ty][x] = { ...bufTile, walkable: false };
      }
    }
  }
}

const PROTECTED_INTERACTIVE_TILES: Set<TileType> = new Set([
  'chest', 'door', 'door_interior', 'door_iron',
]);

// Cliff tile types that must NEVER be converted to walkable terrain by any cleanup pass.
// Stairways are the only walkable transition through cliff; all raw cliff/cliff_edge tiles
// must stay non-walkable regardless of proximity to paths, cottages, or anything else.
const CLIFF_TILE_TYPES: Set<TileType> = new Set<TileType>([
  'cliff', 'cliff_edge', 'cliff_corrupted', 'cliff_edge_corrupted',
]);

// How far from paths to clear blocking objects (trees, rocks)
const PATH_CLEAR_RADIUS = 2;

// Minimum spacing between decoration overlays (trees, rocks, etc.)
const MIN_DECORATION_SPACING = 2;
const SPACED_DECORATIONS: Set<TileType> = new Set([
  'tree', 'dead_tree', 'rock', 'stump', 'tombstone', 'statue',
  'scarecrow', 'hay_bale', 'well', 'campfire', 'campfire_remains', 'bonfire', 'barrel', 'crate',
  'mushroom', 'bones', 'lantern',
  'street_lamp', 'iron_railing', 'fountain', 'pillar', 'rubble',
  'broken_stall', 'crate_stack', 'barrel_stack', 'chimney', 'wall_torch',
]);

function cleanupIllogicalPlacements(tiles: Tile[][], def: MapDefinition) {
  const h = tiles.length;
  const w = tiles[0].length;

  // First pass: identify all path tiles
  const isPathTile = new Uint8Array(h * w);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (PATH_TILES.has(tiles[y][x].type)) {
        isPathTile[y * w + x] = 1;
      }
    }
  }

  // Determine if this is a heavily forested map (forest biome gets reduced clearing)
  const isForestBiome = def.baseTerrain === 'forest';

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const tile = tiles[y][x];

      // Remove land decorations near water/lava
      if (PROTECTED_INTERACTIVE_TILES.has(tile.type) || tile.interactable) {
        continue;
      }

      if (LAND_DECORATIONS.has(tile.type)) {
        let onBadTerrain = false;
        for (let dy = -1; dy <= 1; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            const nx = x + dx;
            const ny = y + dy;
            if (ny >= 0 && ny < h && nx >= 0 && nx < w) {
              if (INCOMPATIBLE_BASE.has(tiles[ny][nx].type)) {
                onBadTerrain = true;
              }
            }
          }
        }
        if (onBadTerrain) {
          // Use grass instead of sand in forest biomes - sand looks wrong beside forest water
          const shoreType = isForestBiome ? 'grass' : 'sand';
          tiles[y][x] = createTile(shoreType as TileType, true);
          continue;
        }
      }

      // Clear trees/rocks near paths (reduced radius in forest biomes).
      // Cliff tiles are in PATH_BLOCKERS so placePath can carve through authored cliff_face stamps,
      // but cleanup must NEVER touch them - cliffs must stay non-walkable regardless of path proximity.
      if (PATH_BLOCKERS.has(tile.type) && !CLIFF_TILE_TYPES.has(tile.type)) {
        const clearRadius = isForestBiome ? 1 : PATH_CLEAR_RADIUS;
        let nearPath = false;
        for (let dy = -clearRadius; dy <= clearRadius && !nearPath; dy++) {
          for (let dx = -clearRadius; dx <= clearRadius && !nearPath; dx++) {
            const nx = x + dx;
            const ny = y + dy;
            if (ny >= 0 && ny < h && nx >= 0 && nx < w) {
              if (isPathTile[ny * w + nx]) {
                nearPath = true;
              }
            }
          }
        }
        if (nearPath) {
          tiles[y][x] = createTile('grass', true);
        }
      }

      // Remove any decoration directly ON water/lava
      if (INCOMPATIBLE_BASE.has(tile.type) && LAND_DECORATIONS.has(tile.type)) {
        tiles[y][x] = createTile('water', false);
      }
    }
  }

  // Fallen-log-specific spacing: enforce minimum 2 tiles between any two fallen logs
  // (either orientation) so they appear as isolated singles between trees, never
  // adjacent. Checks only log-vs-log (not against trees, which would wipe them all).
  const isFallenLog = (t: Tile) => t.type === 'fallen_log' || t.type === 'fallen_log_v';
  const FALLEN_LOG_MIN_SPACING = 2;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (!isFallenLog(tiles[y][x])) continue;
      for (let dy = -FALLEN_LOG_MIN_SPACING; dy <= FALLEN_LOG_MIN_SPACING; dy++) {
        for (let dx = -FALLEN_LOG_MIN_SPACING; dx <= FALLEN_LOG_MIN_SPACING; dx++) {
          if (dx === 0 && dy === 0) continue;
          const nx = x + dx;
          const ny = y + dy;
          if (ny < 0 || ny >= h || nx < 0 || nx >= w) continue;
          // Only remove neighbors that come after in scan order (keeps the first encountered)
          if (ny < y || (ny === y && nx <= x)) continue;
          if (isFallenLog(tiles[ny][nx])) {
            tiles[ny][nx] = createTile('grass', true);
          }
        }
      }
    }
  }

  // Second pass: enforce minimum spacing between decoration overlays
  // Scan left-to-right, top-to-bottom; when two decorations are too close, remove the later one
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const tile = tiles[y][x];
      if (!SPACED_DECORATIONS.has(tile.type) || tile.interactable) continue;
      // Check neighborhood for other decorations (only previously visited cells)
      for (let dy = -MIN_DECORATION_SPACING; dy <= MIN_DECORATION_SPACING; dy++) {
        for (let dx = -MIN_DECORATION_SPACING; dx <= MIN_DECORATION_SPACING; dx++) {
          if (dx === 0 && dy === 0) continue;
          const nx = x + dx;
          const ny = y + dy;
          if (ny < 0 || ny >= h || nx < 0 || nx >= w) continue;
          // Only check tiles that come AFTER in scan order (remove duplicates going forward)
          if (ny < y || (ny === y && nx <= x)) continue;
          const neighbor = tiles[ny][nx];
          if (neighbor.interactable) continue;
          if (SPACED_DECORATIONS.has(neighbor.type)) {
            // Remove the neighbor (keep the first one encountered)
            const baseTerrain = def.baseTerrain === 'forest' ? 'grass' : 
                               def.baseTerrain === 'ruins' ? 'stone' :
                               def.baseTerrain === 'city' ? 'cobblestone' : 'grass';
            tiles[ny][nx] = createTile(baseTerrain as TileType, true);
          }
        }
      }
    }
  }
}

function applyElevationZones(tiles: Tile[][], def: MapDefinition) {
  for (const zone of def.elevationZones ?? []) {
    for (let dy = 0; dy < zone.height; dy++) {
      for (let dx = 0; dx < zone.width; dx++) {
        const tx = zone.x + dx;
        const ty = zone.y + dy;
        if (ty < 0 || ty >= tiles.length || tx < 0 || tx >= tiles[0].length) continue;
        tiles[ty][tx].elevation = zone.elevation;
      }
    }
  }
}

function normalizeWhisperingWoodsSoutheastCreekWaterElevation(tiles: Tile[][], def: MapDefinition) {
  if (def.name !== 'Whispering Woods') return;

  // The southeast creek and west-lake connector pass beside two elevated hill zones.
  // Keep the authored water/bridge surface flat so elevation seams cannot cut through it.
  for (let ty = 232; ty <= 264; ty++) {
    for (let tx = 184; tx <= 250; tx++) {
      const tile = tiles[ty]?.[tx];
      if (!tile || !WATER_BRIDGE_TILES.has(tile.type)) continue;
      tiles[ty][tx] = { ...tile, elevation: 0 };
    }
  }
}

function normalizeWhisperingWoodsFarHollowRiverWaterElevation(tiles: Tile[][], def: MapDefinition) {
  if (def.name !== 'Whispering Woods') return;

  // Hollow-approach river (meander, east exit, far east channel). Elevation zone el=2 for the
  // north-fort shelf overlaps the y=79 water row, leaving water at el2 above el1 grass/water —
  // a sky strip along world y=-71 (tiles x≈204–222). Keep the whole channel at el1.
  for (let ty = 78; ty <= 95; ty++) {
    for (let tx = 116; tx <= 260; tx++) {
      const tile = tiles[ty]?.[tx];
      if (!tile || !WATER_BRIDGE_TILES.has(tile.type)) continue;
      tiles[ty][tx] = { ...tile, elevation: 1 };
    }
  }
}

// Vertical cliff art: only when the tile to the NORTH (smaller y) is higher than the tile to the SOUTH.
// The complementary ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â¦ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã¢â‚¬Å“south/east neighbor higherÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â case is filled at render time in World.appendTerrainSeamFillers
// so paths and portal rows do not show sky gaps.
function stampCliffs(tiles: Tile[][], def: MapDefinition) {
  const h = tiles.length;
  const w = tiles[0].length;
  const elevations = tiles.map(row => row.map(tile => tile.elevation ?? 0));
  const S = COASTAL_SOUTH_ROWS;
  const protectRing = hasCoastalAllSides(def);
  const protectSouthOnly = hasCoastalSouthBorder(def) && !protectRing;
  const coastProtectMaxY = protectSouthOnly ? S : 0;

  const cellInCoastalRing = (tx: number, ty: number): boolean =>
    protectRing && (ty < S || ty >= h - S || tx < S || tx >= w - S);

  for (let y = 1; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const upperElevation = elevations[y - 1][x];
      const lowerElevation = elevations[y][x];
      if (upperElevation <= lowerElevation) continue;

      const upperTile = tiles[y - 1][x];
      const lowerTile = tiles[y][x];
      if (upperTile.transition || lowerTile.transition || upperTile.interactable || lowerTile.interactable) continue;
      if (upperTile.type === 'stairs' || lowerTile.type === 'stairs') continue;
      // Do not replace plot fencing / gates with cliff art (cemetery back row vs lower shelf, etc.).
      if (
        upperTile.type === 'fence' || upperTile.type === 'gate' || upperTile.type === 'iron_fence' ||
        lowerTile.type === 'fence' || lowerTile.type === 'gate' || lowerTile.type === 'iron_fence'
      ) {
        continue;
      }
      // Never overwrite roads/paths with cliff tiles ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â elevation changes on roads are
      // handled by the walkability system's "visible height indicator" heuristic.
      if (PATH_TILES.has(upperTile.type) || PATH_TILES.has(lowerTile.type)) continue;
      // Water and bridges render at their own depth; cliffs must go behind, not overwrite them.
      if (WATER_BRIDGE_TILES.has(upperTile.type) || WATER_BRIDGE_TILES.has(lowerTile.type)) continue;

      if (protectRing) {
        if (cellInCoastalRing(x, y - 1) || cellInCoastalRing(x, y)) continue;
      } else if (y - 1 < coastProtectMaxY) {
        continue;
      }
      tiles[y - 1][x] = createTile('cliff_edge', false, { elevation: upperElevation });

      // Mark the tile immediately above the cliff_edge (the high-elevation lip) as
      // enemy-blocked so enemies cannot press against the edge and appear to float
      // over the cliff face.
      const northBufY = y - 2;
      if (northBufY >= 0) {
        const northOk = protectRing
          ? !cellInCoastalRing(x, northBufY)
          : northBufY >= coastProtectMaxY;
        if (northOk) {
          const northBufTile = tiles[northBufY]?.[x];
          if (northBufTile && !northBufTile.transition && !northBufTile.interactable
              && !PATH_TILES.has(northBufTile.type) && !WATER_BRIDGE_TILES.has(northBufTile.type)) {
            tiles[northBufY][x] = { ...northBufTile, enemyBlocked: true };
          }
        }
      }

      // Extra wall tiles proportional to elevation drop ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â a 2-step drop gets 3 cliff tiles
      const elevDrop = upperElevation - lowerElevation;
      const wallDepth = Math.min(2 + elevDrop, h - y);
      for (let depth = 0; depth < wallDepth; depth++) {
        const cy = y + depth;
        if (cy >= h) break;
        if (protectRing) {
          if (cellInCoastalRing(x, cy)) continue;
        } else if (cy < coastProtectMaxY) {
          continue;
        }
        const targetTile = tiles[cy][x];
        if (targetTile.transition || targetTile.interactable || targetTile.type === 'stairs') continue;
        if (WATER_BRIDGE_TILES.has(targetTile.type)) continue;
        tiles[cy][x] = createTile('cliff', false, { elevation: lowerElevation });
      }

      applySouthCliffSpriteWalkabilityBuffer(tiles, x, x + 1, y + wallDepth, coastProtectMaxY);
    }
  }
}

function placeStairways(tiles: Tile[][], def: MapDefinition) {
  for (const stair of def.stairways ?? []) {
    for (let dy = 0; dy < stair.height; dy++) {
      for (let dx = 0; dx < stair.width; dx++) {
        const tx = stair.x + dx;
        const ty = stair.y + dy;
        if (ty < 0 || ty >= tiles.length || tx < 0 || tx >= tiles[0].length) continue;
        const existing = tiles[ty][tx];
        tiles[ty][tx] = createTile('stairs', true, {
          elevation: stair.elevation,
          transition: existing.transition,
          interactable: existing.interactable,
          interactionId: existing.interactionId,
          hidden: existing.hidden,
          ...(stair.axis === 'ew' ? { stairAxis: 'ew' as const } : {}),
        });
      }
    }
  }
}

function placeLadders(tiles: Tile[][], def: MapDefinition) {
  for (const ladder of def.ladders ?? []) {
    for (let dy = 0; dy < ladder.height; dy++) {
      for (let dx = 0; dx < ladder.width; dx++) {
        const tx = ladder.x + dx;
        const ty = ladder.y + dy;
        if (ty < 0 || ty >= tiles.length || tx < 0 || tx >= tiles[0].length) continue;
        const existing = tiles[ty][tx];
        tiles[ty][tx] = createTile('ladder', true, {
          elevation: ladder.elevation,
          transition: existing.transition,
          interactable: existing.interactable,
          interactionId: existing.interactionId,
          hidden: existing.hidden,
        });
      }
    }
  }
}

function enforceInteriorCottageAprons(tiles: Tile[][], def: MapDefinition) {
  for (const f of def.features) {
    if (f.type !== 'cottage') continue;
    const hasInterior = !!(f.interiorMap && f.interiorSpawnX !== undefined && f.interiorSpawnY !== undefined);
    if (!hasInterior) continue;

    const centerX = f.x + Math.floor(f.width / 2);
    const entryY = f.y + f.height - 3;
    const frontY = f.y + f.height;

    // Pass 1: normalize any accidental non-walkable grass bands around the approach/foundation.
    // This catches edge cases introduced by later elevation/cliff passes and map-specific seams.
    const normalizeMinX = f.x - 2;
    const normalizeMaxX = f.x + f.width + 2;
    const normalizeMinY = f.y - 8;
    const normalizeMaxY = f.y + f.height + 3;
    for (let ty = normalizeMinY; ty <= normalizeMaxY; ty++) {
      for (let tx = normalizeMinX; tx <= normalizeMaxX; tx++) {
        if (ty < 0 || ty >= tiles.length || tx < 0 || tx >= tiles[0].length) continue;
        const existing = tiles[ty][tx];
        if (existing.type === 'portal' || isChestTileType(existing.type)) continue;
        if (HOUSE_TYPES.has(existing.type)) continue;
        if (!existing.walkable && (existing.type === 'grass' || existing.type === 'dirt' || existing.type === 'dark_grass' || existing.type === 'hollow_blight')) {
          tiles[ty][tx] = {
            ...existing,
            walkable: true,
          };
        }
      }
    }

    // Pass 2: enforce a guaranteed center apron lane to the exterior doorway.
    const apronMinX = centerX - 2;
    const apronMaxX = centerX + 2;
    const apronMinY = entryY - 1;
    const apronMaxY = frontY + 2;
    for (let ty = apronMinY; ty <= apronMaxY; ty++) {
      for (let tx = apronMinX; tx <= apronMaxX; tx++) {
        if (ty < 0 || ty >= tiles.length || tx < 0 || tx >= tiles[0].length) continue;
        const existing = tiles[ty][tx];
        if (existing.type === 'portal' || isChestTileType(existing.type)) continue;
        if (HOUSE_TYPES.has(existing.type)) continue;
        if (CLIFF_TILE_TYPES.has(existing.type)) continue; // never pave over cliff tiles

        tiles[ty][tx] = createTile('dirt', true, {
          elevation: existing.elevation,
          transition: existing.transition,
          interactable: existing.interactable,
          interactionId: existing.interactionId,
          hidden: existing.hidden,
        });
      }
    }
  }
}

/** Whispering Woods: north of the Deep Hollow line, replace green hollow turf with bleached ground. */
function applyDeepHollowBleachedGround(tiles: Tile[][], def: MapDefinition) {
  if (def.name !== 'Whispering Woods') return;
  const w = tiles[0]?.length ?? 0;
  const maxY = Math.min(DEEP_HOLLOW_TILE_Y_MAX, tiles.length);
  for (let ty = 0; ty < maxY; ty++) {
    for (let tx = 0; tx < w; tx++) {
      const t = tiles[ty][tx];
      if (t.transition || t.interactable) continue;
      if (t.type !== 'dark_grass' && t.type !== 'grass') continue;
      tiles[ty][tx] = { ...t, type: 'hollow_blight' };
    }
  }
}

// Swap any cliff / cliff_edge tile in the Hollow side of the corruption blend boundary
// (ty < 77, matching UI y < -73) for its Hollow-tinted variant. Pure visual reskin -
// walkability, elevation, transitions, and other tile metadata are preserved.
function applyHollowCliffCorruption(tiles: Tile[][], def: MapDefinition) {
  if (def.name !== 'Whispering Woods') return;
  const w = tiles[0]?.length ?? 0;
  const maxY = Math.min(77, tiles.length);
  for (let ty = 0; ty < maxY; ty++) {
    for (let tx = 0; tx < w; tx++) {
      const t = tiles[ty][tx];
      if (t.type === 'cliff') {
        tiles[ty][tx] = { ...t, type: 'cliff_corrupted' };
      } else if (t.type === 'cliff_edge') {
        tiles[ty][tx] = { ...t, type: 'cliff_edge_corrupted' };
      }
    }
  }
}

// Soft transition band between the Hollow's hollow_blight ground and the forest grass
// south of it. Mirrors placeBridgeDecayBlend's smoothstep + 3-octave speckle pattern so
// the ground boundary reads visually consistent with the bridge above it. Runs AFTER
// applyDeepHollowBleachedGround so it can re-introduce occasional dark_grass / grass
// speckles into the top of the blend band (y:57-58) where the deep-hollow pass forced
// everything to hollow_blight.
function applyHollowBoundaryBlend(tiles: Tile[][], def: MapDefinition) {
  if (def.name !== 'Whispering Woods') return;
  const w = tiles[0]?.length ?? 0;
  const y0 = 57;
  const y1 = 77;
  const span = y1 - y0;
  for (let ty = y0; ty <= y1; ty++) {
    if (ty < 0 || ty >= tiles.length) continue;
    for (let tx = 0; tx < w; tx++) {
      const t = tiles[ty][tx];
      if (t.transition || t.interactable) continue;
      if (t.type !== 'grass' && t.type !== 'dark_grass' && t.type !== 'hollow_blight') continue;

      const northness = (y1 - ty) / span;
      const smooth = northness * northness * (3 - 2 * northness);
      const h1 = bridgeDecayHash01(tx, ty, 1);
      const h2 = bridgeDecayHash01(tx + 3, ty - 2, 7);
      const h3 = bridgeDecayHash01(tx - 1, ty + 5, 13);
      const speckle = (h1 - 0.5) * 0.38 + (h2 - 0.5) * 0.22 + (h3 - 0.5) * 0.14;
      const score = smooth + speckle;

      let newType: TileType;
      if (score > 0.65) newType = 'hollow_blight';
      else if (score > 0.30) newType = 'dark_grass';
      else newType = 'grass';

      if (newType !== t.type) {
        tiles[ty][tx] = { ...t, type: newType };
      }
    }
  }
}

/** Corrupts the Hollow-side waters while leaving the southern river and creek systems blue. */
function applyWhisperingWoodsHollowApproachCorruptedWater(tiles: Tile[][], def: MapDefinition) {
  if (def.name !== 'Whispering Woods') return;
  reconcileHollowApproachWaterInRects(tiles, HOLLOW_CORRUPTED_WATER_RECTS);
}

function enforceForestRockyHillShelf(tiles: Tile[][], def: MapDefinition) {
  if (def.name !== 'Whispering Woods') return;
  // SW coastal-rim reward shelf above the rocky-hill stairway. Cliff sprite buffering marks the
  // first visible grass rows non-walkable, but this authored shelf should be traversable.
  for (let ty = 293; ty <= 294; ty++) {
    for (let tx = 78; tx <= 83; tx++) {
      if (ty < 0 || ty >= tiles.length || tx < 0 || tx >= tiles[0].length) continue;
      const existing = tiles[ty][tx];
      if (existing.type !== 'grass' && !isChestTileType(existing.type)) continue;
      tiles[ty][tx] = {
        ...existing,
        walkable: true,
      };
    }
  }
}

function enforceWhisperingWoodsOverlookChain(tiles: Tile[][], def: MapDefinition) {
  if (def.name !== 'Whispering Woods') return;

  const setRect = (x: number, y: number, width: number, height: number, type: TileType, walkable: boolean) => {
    for (let ty = y; ty < y + height; ty++) {
      for (let tx = x; tx < x + width; tx++) {
        if (ty < 0 || ty >= tiles.length || tx < 0 || tx >= tiles[0].length) continue;
        tiles[ty][tx] = createTile(type, walkable, { elevation: 0 });
      }
    }
  };

  // Final tiny lookout at UI ~24..30, 30..33, with a skinny stair down to the long shelf.
  setRect(174, 177, 12, 3, 'cliff', false);
  setRect(171, 180, 3, 7, 'cliff', false);
  setRect(181, 180, 5, 7, 'cliff', false);
  setRect(174, 184, 12, 3, 'cliff', false);
  setRect(174, 180, 7, 3, 'grass', true);
  setRect(174, 183, 2, 1, 'grass', true);
  setRect(179, 183, 2, 1, 'grass', true);
  setRect(176, 183, 3, 7, 'stairs', true);
  setRect(177, 182, 1, 1, 'heresy_altar', false);

  // Windmill hay scatter at UI 35,42; restore after decoration cleanup.
  setRect(181, 199, 1, 1, 'hay_bale', false);
  setRect(184, 201, 1, 1, 'hay_bale', false);
  setRect(191, 199, 1, 1, 'hay_bale', false);

  // West cliff overlook: seal the grass pocket's south edge around UI -60,46.
  setRect(84, 196, 18, 1, 'cliff_edge', false);
  setRect(84, 197, 18, 3, 'cliff', false);
  setRect(91, 193, 1, 1, 'barrel', false);
  setRect(89, 194, 1, 1, 'crate', false);
  setRect(93, 195, 1, 1, 'barrel', false);

  // Lower west sentinel overlook: NS stair UI -76,48 → -76,53; landing UI ~-79..-73, 52..55.
  setRect(68, 198, 3, 7, 'cliff', false);
  setRect(78, 198, 5, 7, 'cliff', false);
  setRect(72, 198, 5, 6, 'stairs', true);
  setRect(71, 202, 7, 3, 'grass', true);
  setRect(72, 202, 1, 1, 'barrel', false);
  setRect(76, 202, 1, 1, 'crate', false);
  setRect(76, 204, 1, 1, 'lantern', false);
  setRect(73, 204, 1, 1, 'bones_pile', true);
  // (74,203) left as walkable grass for the Stone Sentinel spawn tile.
  // South cap - seals shelf above the cliff drop; bypass dirt spine at UI ~64 stays untouched.
  setRect(71, 205, 7, 1, 'cliff_edge', false);
  setRect(71, 206, 7, 2, 'cliff', false);
}

function enforceHollowWestCorruptedStairShelf(tiles: Tile[][], def: MapDefinition) {
  if (def.name !== 'Whispering Woods') return;

  const setRect = (
    x: number,
    y: number,
    width: number,
    height: number,
    type: TileType,
    walkable: boolean,
    extra: Partial<Tile> = {},
  ) => {
    for (let ty = y; ty < y + height; ty++) {
      for (let tx = x; tx < x + width; tx++) {
        if (ty < 0 || ty >= tiles.length || tx < 0 || tx >= tiles[0].length) continue;
        tiles[ty][tx] = createTile(type, walkable, { elevation: 1, ...extra });
      }
    }
  };

  // East-facing stair at world ~(-56,-98), climbing into a sealed corrupted cliff-top pocket.
  setRect(99, 47, 18, 2, 'cliff_edge', false);
  setRect(116, 49, 3, 8, 'cliff', false);
  setRect(99, 57, 18, 1, 'cliff_edge', false);
  setRect(99, 58, 18, 3, 'cliff', false);
  setRect(101, 49, 15, 8, 'hollow_blight', true);
  setRect(100, 51, 16, 3, 'dirt', true);
  setRect(113, 49, 3, 9, 'cliff', false);
  // Back-side landing for the Hollow shortcut gate. The closed gate rows still block progress,
  // but the far side must not be a cliff lip or the shortcut remains visually/traversally false.
  // Match the opened gate width, not just the center gate panels; x=130 stays cliff shoulder.
  setRect(116, 49, 14, 6, 'hollow_blight', true, { spinePath: true });
  setRect(92, 52, 2, 3, 'hollow_blight', true);
  setRect(94, 49, 7, 6, 'stairs', true, { stairAxis: 'ew' });
  setRect(107, 54, 1, 1, 'heresy_altar', false);
}

/**
 * Second-pass decoration cleanup that runs AFTER stampCliffs.
 * cleanupIllogicalPlacements runs before cliff stamping, so freshly-stamped cliff
 * tiles can leave non-interactable decorations (mushrooms, flowers, etc.) stranded
 * on the inaccessible cliff plateau. This pass removes them.
 */
const POST_CLIFF_DECOR_TYPES: Set<string> = new Set([
  'mushroom', 'flower', 'moonbloom', 'tall_grass', 'stump',
  'fallen_log', 'fallen_log_v', 'bones', 'rock', 'dead_tree',
]);
const CLIFF_FACE_TYPES: Set<string> = new Set([
  'cliff', 'cliff_edge', 'cliff_corrupted', 'cliff_edge_corrupted',
]);

function scrubDecorationsAdjacentToCliffs(tiles: Tile[][]): void {
  const h = tiles.length;
  const w = tiles[0]?.length ?? 0;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const tile = tiles[y][x];
      // Skip interactables (tempest_grass pickups, etc.) - those are handled individually
      if (!POST_CLIFF_DECOR_TYPES.has(tile.type) || tile.interactable) continue;
      let adjacentToCliff = false;
      outer: for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          const ny = y + dy;
          const nx = x + dx;
          if (ny >= 0 && ny < h && nx >= 0 && nx < w && CLIFF_FACE_TYPES.has(tiles[ny][nx].type)) {
            adjacentToCliff = true;
            break outer;
          }
        }
      }
      if (adjacentToCliff) {
        tiles[y][x] = createTile('grass', true);
      }
    }
  }
}

/** cleanupIllogicalPlacements turns shore decor beside water/cliffs into sand; restore grass at the portal seam. */
function scrubWhisperingWoodsPortalSandSeam(tiles: Tile[][], def: MapDefinition) {
  if (def.name !== 'Whispering Woods') return;
  for (const [tx, ty] of [
    [144, 293],
    [145, 293],
  ] as const) {
    if (ty < 0 || ty >= tiles.length || tx < 0 || tx >= tiles[0].length) continue;
    const existing = tiles[ty][tx];
    if (existing.type !== 'sand') continue;
    tiles[ty][tx] = createTile('grass', true, { elevation: existing.elevation ?? 0 });
  }
}

function scrubWhisperingWoodsNorthFortFrontTree(tiles: Tile[][], def: MapDefinition) {
  if (def.name !== 'Whispering Woods') return;
  const tx = 211;
  const ty = 77;
  if (ty < 0 || ty >= tiles.length || tx < 0 || tx >= tiles[0].length) return;
  const existing = tiles[ty][tx];
  if (existing.type !== 'tree') return;
  tiles[ty][tx] = createTile('grass', true, { elevation: existing.elevation ?? 0 });
}

function scrubWhisperingWoodsNorthFortElevationSeam(tiles: Tile[][], def: MapDefinition) {
  if (def.name !== 'Whispering Woods') return;

  // The northern fort spans a procedural elevation break around world x=54.
  // Keep the authored fort pieces, but flatten their elevation so the seam does not render through it.
  for (let ty = 60; ty <= 77; ty++) {
    for (let tx = 200; tx <= 217; tx++) {
      if (ty < 0 || ty >= tiles.length || tx < 0 || tx >= tiles[0].length) continue;
      tiles[ty][tx] = { ...tiles[ty][tx], elevation: 1 };
    }
  }

  const seamX = 204;
  for (let ty = 38; ty <= 78; ty++) {
    if (ty < 0 || ty >= tiles.length || seamX < 0 || seamX >= tiles[0].length) continue;
    tiles[ty][seamX] = { ...tiles[ty][seamX], elevation: 1 };
  }

  // South-east gate approach around world (59,-73) / tile (209,77). The center-summit el=2
  // zone (y=38-79) stops at the fort apron while the interior scrub stays at el=1, leaving
  // a blocked el=1↔el=2 seam on the south mouth unless both sides carry spinePath.
  const apronTypes: Set<string> = new Set(['grass', 'dirt', 'sand', 'hollow_blight']);
  for (let ty = 74; ty <= 78; ty++) {
    for (let tx = 195; tx <= 222; tx++) {
      if (ty < 0 || ty >= tiles.length || tx < 0 || tx >= tiles[0].length) continue;
      const t = tiles[ty][tx];
      if (!t || t.transition || t.interactable) continue;
      if (apronTypes.has(t.type)) {
        tiles[ty][tx] = { ...t, walkable: true, elevation: 1, spinePath: true };
      }
    }
  }

  // North apron around the fort's north side and the consumed-camp dirt shelf at
  // world (54,-95)–(68,-96) / tiles y=52–59. Summit el=2 still sat on row y=54 north
  // of the landing row, which kept both collision and the visible north seam filler.
  const northApronBlocked: Set<string> = new Set([
    'stone', 'cliff', 'cliff_edge', 'cliff_corrupted', 'cliff_edge_corrupted',
    'gate', 'iron_fence', 'dead_tree', 'tree', 'fallen_tree', 'stump',
    'lantern', 'barrel', 'crate', 'wagon', 'cart', 'rock',
  ]);
  // Walkable hollow corridor east of the west cliff column (tiles x=94-99). Flatten el=1 +
  // spinePath on floor tiles only - skip cliff/dead-tree corridor walls via northApronBlocked.
  for (let ty = 38; ty <= 59; ty++) {
    for (let tx = 100; tx <= 222; tx++) {
      if (ty < 0 || ty >= tiles.length || tx < 0 || tx >= tiles[0].length) continue;
      const t = tiles[ty][tx];
      if (!t || t.transition || t.interactable || !t.walkable || northApronBlocked.has(t.type)) continue;
      if (apronTypes.has(t.type)) {
        tiles[ty][tx] = { ...t, walkable: true, elevation: 1, spinePath: true };
      } else {
        // Decor overlays (bones, etc.) are walkable but not spine-eligible types - rebake to floor.
        tiles[ty][tx] = createTile('hollow_blight', true, { elevation: 1, spinePath: true });
      }
    }
  }

  // Consumed-camp dirt shelf (tiles x=204-217): stamp dirt only on walkable floor tiles so
  // scatter blockers clear without converting cliff_face / iron_fence corridor walls to dirt.
  for (let ty = 38; ty <= 55; ty++) {
    for (let tx = 204; tx <= 217; tx++) {
      if (ty < 0 || ty >= tiles.length || tx < 0 || tx >= tiles[0].length) continue;
      const t = tiles[ty][tx];
      if (!t || t.transition || t.interactable || northApronBlocked.has(t.type)) continue;
      if (!t.walkable) continue;
      tiles[ty][tx] = createTile('dirt', true, { elevation: 1, spinePath: true });
    }
  }

  // Scatter can land on the camp shelf after the apron pass; reopen the spine column only.
  const shelfScatter: Set<string> = new Set([
    'fallen_log', 'fallen_log_v', 'tree', 'dead_tree', 'fallen_tree', 'stump', 'rock',
  ]);
  for (let ty = 38; ty <= 55; ty++) {
    for (let tx = 204; tx <= 217; tx++) {
      if (ty < 0 || ty >= tiles.length || tx < 0 || tx >= tiles[0].length) continue;
      const t = tiles[ty][tx];
      if (!t || t.transition || t.interactable) continue;
      if (shelfScatter.has(t.type)) {
        tiles[ty][tx] = createTile('dirt', true, { elevation: 1, spinePath: true });
      }
    }
  }

  // East center-summit picket (world x=100 / tile x=250): el=2 summit vs el=1 NE ridge for
  // world y=-92..-73 (ty=58-77). South rows already had spine; extend north so travel along
  // the boundary is not blocked by the visible seam filler / el±1 step.
  const eastSeamFloorTypes: Set<string> = new Set([...apronTypes, 'dark_grass']);
  for (let ty = 58; ty <= 77; ty++) {
    for (let tx = 249; tx <= 252; tx++) {
      if (ty < 0 || ty >= tiles.length || tx < 0 || tx >= tiles[0].length) continue;
      const t = tiles[ty][tx];
      if (!t || t.transition || t.interactable || northApronBlocked.has(t.type)) continue;
      const el = tx <= 250 ? 2 : 1;
      if (eastSeamFloorTypes.has(t.type)) {
        const floorType = (t.type === 'dark_grass' ? 'grass' : t.type) as TileType;
        tiles[ty][tx] = { ...t, type: floorType, walkable: true, elevation: el, spinePath: true };
      } else if (
        !t.walkable &&
        (t.type === 'hollow_blight' || t.type === 'dark_grass' || t.type === 'grass')
      ) {
        tiles[ty][tx] = createTile(t.type, true, { elevation: el, spinePath: true });
      }
    }
  }
}

function scrubWhisperingWoodsWestHollowSpineSeamArt(tiles: Tile[][], def: MapDefinition) {
  if (def.name !== 'Whispering Woods') return;

  const seamArtTypes: Set<TileType> = new Set([
    'grass',
    'dark_grass',
    'hollow_blight',
    'cliff',
    'cliff_edge',
    'cliff_corrupted',
    'cliff_edge_corrupted',
  ]);

  // Around world (-42,-121) through (-20,-112), the pale elevation seam is visual
  // support for the dirt spine, not a separate wall. Keep the dirt readable, but
  // remove collision from adjacent non-dirt seam art in this short Hollow approach strip.
  for (let ty = 28; ty <= 41; ty++) {
    for (let tx = 106; tx <= 148; tx++) {
      if (ty < 0 || ty >= tiles.length || tx < 0 || tx >= tiles[0].length) continue;
      const t = tiles[ty][tx];
      if (!t || t.transition || t.interactable || t.type === 'dirt') continue;
      if (!seamArtTypes.has(t.type)) continue;
      tiles[ty][tx] = createTile('hollow_blight', true, {
        elevation: t.elevation ?? 1,
        spinePath: true,
        enemyBlocked: t.enemyBlocked,
      });
    }
  }
}

function enforceWhisperingWoodsDeepHollowBonfireApron(tiles: Tile[][], def: MapDefinition) {
  if (def.name !== 'Whispering Woods') return;

  const floorTypes: Set<TileType> = new Set(['dirt', 'hollow_blight', 'dark_grass', 'grass', 'sand']);
  const targetElevation = 1;

  for (let ty = 43; ty <= 48; ty++) {
    for (let tx = 123; tx <= 129; tx++) {
      if (ty < 0 || ty >= tiles.length || tx < 0 || tx >= tiles[0].length) continue;
      const t = tiles[ty][tx];
      if (!t || t.transition) continue;

      if (t.type === 'bonfire' || t.type === 'bonfire_unlit') {
        tiles[ty][tx] = { ...t, walkable: true, elevation: targetElevation };
        continue;
      }

      if (!floorTypes.has(t.type)) continue;
      tiles[ty][tx] = { ...t, walkable: true, elevation: targetElevation, spinePath: true };
    }
  }
}

function enforceGreenleafUpperRidgeDetour(tiles: Tile[][], def: MapDefinition) {
  if (def.name !== 'Greenleaf Village') return;

  // The obvious north-road climb is intentionally sealed so players follow the
  // ridge east to find the break. Run this after stair/path cleanup so it cannot
  // be softened back into grass by proximity-to-path cleanup.
  for (let ty = 27; ty <= 30; ty++) {
    for (let tx = 64; tx <= 135; tx++) {
      if (ty < 0 || ty >= tiles.length || tx < 0 || tx >= tiles[0].length) continue;
      const existing = tiles[ty][tx];
      if (existing.transition || existing.interactable) continue;
      tiles[ty][tx] = createTile(ty <= 28 ? 'cliff_edge' : 'cliff', false, {
        elevation: ty <= 28 ? 2 : 1,
      });
    }
  }
}

function enforceGreenleafNorthRidgeCliffWall(tiles: Tile[][], def: MapDefinition) {
  if (def.name !== 'Greenleaf Village') return;

  // Keep the north-ridge stairway and intentional market approach as the only breaks
  // in this cliff wall. Authored path/cleanup passes can otherwise visually bleed
  // dirt into the cliff seam, so restore these bands after all late path passes.
  const cliffBands = [
    { minX: 98, maxX: 115 },
    { minX: 122, maxX: 147 },
    { minX: 162, maxX: 198 },
  ];

  for (let ty = 45; ty <= 48; ty++) {
    for (const band of cliffBands) {
      for (let tx = band.minX; tx <= band.maxX; tx++) {
        if (ty < 0 || ty >= tiles.length || tx < 0 || tx >= tiles[0].length) continue;
        const existing = tiles[ty][tx];
        if (!existing || existing.transition || existing.interactable) continue;
        tiles[ty][tx] = createTile(ty === 45 ? 'cliff_edge' : 'cliff', false, {
          elevation: ty === 45 ? 1 : 0,
        });
      }
    }
  }
}

function enforceGreenleafDirtSpineWalkway(tiles: Tile[][], def: MapDefinition) {
  if (def.name !== 'Greenleaf Village') return;

  // Garden borders and other decor can land on the authored N-S spine because
  // placePath refuses to overwrite fence tiles. Clear blockers on the spine bands
  // so the main north corridor stays fully walkable.
  const SPINE_BLOCKERS: Set<TileType> = new Set(['fence', 'iron_fence', 'hedge']);
  const spineBands = [
    { minY: 8, maxY: 45 },
    { minY: 49, maxY: 68 },
    { minY: 96, maxY: 139 },
  ];
  const minX = 116;
  const maxX = 121;

  for (const band of spineBands) {
    for (let ty = band.minY; ty <= band.maxY; ty++) {
      for (let tx = minX; tx <= maxX; tx++) {
        if (ty < 0 || ty >= tiles.length || tx < 0 || tx >= tiles[0].length) continue;
        const t = tiles[ty][tx];
        if (!t || t.transition || t.interactable) continue;
        if (!SPINE_BLOCKERS.has(t.type)) continue;
        tiles[ty][tx] = createTile('dirt', true, {
          elevation: t.elevation,
          spinePath: true,
        });
      }
    }
  }
}

function enforceGreenleafNorthEastVerticalCliff(tiles: Tile[][], def: MapDefinition) {
  if (def.name !== 'Greenleaf Village') return;

  // Vertical cliff: world (27,-74) → (27,-42), 3 tiles wide at tile x=146–148, y=5–37.
  for (let ty = 5; ty <= 37; ty++) {
    for (let tx = 146; tx <= 148; tx++) {
      if (ty < 0 || ty >= tiles.length || tx < 0 || tx >= tiles[0].length) continue;
      const existing = tiles[ty][tx];
      if (!existing || existing.transition || existing.interactable) continue;
      const elev = existing.elevation ?? 1;
      tiles[ty][tx] = createTile(tx === 146 ? 'cliff_edge' : 'cliff', false, { elevation: elev });
    }
  }
}

function enforceGreenleafEastRidgeStairConnector(tiles: Tile[][], def: MapDefinition) {
  if (def.name !== 'Greenleaf Village') return;

  // World (-1,-55) → (16,-54): keep the east-ridge dirt tie-in and stair mouth walkable
  // after cliff/detour passes (horizontal y=24–26, stair column x=136–141 y=25–33).
  for (let ty = 24; ty <= 33; ty++) {
    const minX = ty <= 26 ? 119 : 136;
    const maxX = ty <= 26 ? 136 : 141;
    for (let tx = minX; tx <= maxX; tx++) {
      if (ty < 0 || ty >= tiles.length || tx < 0 || tx >= tiles[0].length) continue;
      const t = tiles[ty][tx];
      if (!t || t.transition || t.interactable) continue;
      if (t.type === 'stairs') continue;
      if (t.type === 'dirt' || t.type === 'grass' || t.type === 'cobblestone') {
        tiles[ty][tx] = { ...t, walkable: true, spinePath: true };
      }
    }
  }
}

function enforceGreenleafEastMarketWestSeam(tiles: Tile[][], def: MapDefinition) {
  if (def.name !== 'Greenleaf Village') return;

  // World x=28, y=-30..-5 => tile x=148, y=49..74. This is the west edge
  // of the east market plateau. Mark both sides of the vertical elevation seam
  // so the authored open ground can be crossed without needing a stair every row.
  for (let ty = 49; ty <= 74; ty++) {
    for (const tx of [147, 148]) {
      if (ty < 0 || ty >= tiles.length || tx < 0 || tx >= tiles[0].length) continue;
      const t = tiles[ty][tx];
      if (!t || t.transition || t.interactable) continue;
      if (t.type === 'grass' || t.type === 'dirt' || t.type === 'cobblestone') {
        tiles[ty][tx] = { ...t, walkable: true, spinePath: true };
      }
    }
  }

  // East market stair step-off apron. World (29,-29) => tile (149,50) sits
  // just south of the stair tiles; keep this mouth clear for player corner probes.
  for (let ty = 49; ty <= 52; ty++) {
    for (let tx = 148; tx <= 151; tx++) {
      if (ty < 0 || ty >= tiles.length || tx < 0 || tx >= tiles[0].length) continue;
      const t = tiles[ty][tx];
      if (!t || t.transition || t.interactable) continue;
      if (t.type === 'grass' || t.type === 'dirt' || t.type === 'cobblestone') {
        tiles[ty][tx] = { ...t, walkable: true, spinePath: true };
      }
    }
  }
}

// Clears the enclosed landing and exit of the traditional cliff-corridor stairway at x=260-262.
// The main cliff_face (x=238-267, y=118-173) stamps cliff tiles across the stairway's exit
// row. placeStairways handles y=118-130, but the upper overlook beside the ladder stays
// sealed unless we reopen it. Keep x=268 sealed as cliff so the player drops a ladder down
// the face, then steps off to the lower corridor on the east side at the bottom.
function enforceCliffCorridorTraditionalApproach(tiles: Tile[][], def: MapDefinition) {
  if (def.name !== 'Whispering Woods') return;
  const gateX = 268;
  const gateY = 132;
  const bottomY = gateY - 4;

  // Upper/high grass overlook. x=268 is intentionally excluded so the gate_ladder reads
  // as mounted on the cliff edge, not as part of the grass path.
  for (let ty = 130; ty <= 132; ty++) {
    for (let tx = 260; tx <= 267; tx++) {
      if (ty < 0 || ty >= tiles.length || tx < 0 || tx >= tiles[0].length) continue;
      const t = tiles[ty][tx];
      if (!t || t.transition || t.interactable) continue;
      if (t.type === ('cliff' as TileType) || t.type === ('cliff_edge' as TileType)) {
        tiles[ty][tx] = createTile('grass', true, { elevation: 1 });
      } else if (t.type === 'grass') {
        tiles[ty][tx] = { ...t, walkable: true, elevation: 1 };
      }
    }
  }

  // Reassert the cliff face around the ladder drop. Only the west top tile and the east bottom
  // tile remain open, so the shortcut reads as a lowered ladder instead of a side hallway.
  for (let ty = bottomY; ty <= gateY; ty++) {
    for (const tx of [gateX - 1, gateX, gateX + 1]) {
      if (ty < 0 || ty >= tiles.length || tx < 0 || tx >= tiles[0].length) continue;
      const t = tiles[ty][tx];
      if (!t || t.transition || t.interactable) continue;
      if (tx === gateX - 1 && ty === gateY) {
        tiles[ty][tx] = createTile('grass', true, { elevation: 1, enemyBlocked: true });
      } else if (tx === gateX + 1 && ty === bottomY) {
        tiles[ty][tx] = createTile('grass', true, { elevation: 0 });
      } else {
        tiles[ty][tx] = createTile(ty === gateY ? 'cliff_edge' : 'cliff', false, {
          elevation: ty === gateY ? 1 : 0,
        });
      }
    }
  }

  // Clean cliff block south-east of the corridor ladder overlook:
  // world x=118..122, y=-17..-13 => tile x=268..272, y=133..137.
  for (let ty = 133; ty <= 137; ty++) {
    for (let tx = 268; tx <= 272; tx++) {
      if (ty < 0 || ty >= tiles.length || tx < 0 || tx >= tiles[0].length) continue;
      const t = tiles[ty][tx];
      if (!t || t.transition || t.interactable) continue;
      tiles[ty][tx] = createTile('cliff', false, { elevation: 1 });
    }
  }
}

// Carves the East Ridge Ascent: a winding descent SOUTH (larger tile-Y, which renders screen-up)
// from the cliff-corridor ladder overlook into the empty cliff void between the homestead (west)
// and the terrace/corridor (east), ending in a sealed arena. stampCliffs seals this whole block
// as cliff art; this pass (run after stampCliffs) re-asserts the path tiles as walkable el1 grass
// so it matches the el1 overlook with no seams, while the surrounding void stays cliff so the
// route reads as a narrow ledge threading the rock. The 3-tile cliff buffers on each side keep it
// isolated from the homestead/skeleton story route.
// Authored tall-grass "gate" fields. Stamped AFTER all cleanup/cliff passes because tall_grass is
// a LAND_DECORATION + POST_CLIFF_DECOR and the scrub passes otherwise eat clearing-fill grass that
// sits near cliffs/water. Converts only walkable ground (never cliffs, water, paths, props, or
// interactables) so the gate fills its corridor without paving over real terrain or routes.
type TallGrassGateRect = {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
  /** When true, convert spine-path grass/dirt in this rect (e.g. shelf beside a dirt bridge). */
  throughSpinePath?: boolean;
};

const TALL_GRASS_GATE_RECTS: Record<string, TallGrassGateRect[]> = {
  'Whispering Woods': [
    // Western Fort approach corridor - runs from the cliff up to the grove-rim fence (y162), x41-47.
    // Bottom pushed one row into the cliff edge (y123) so the grass meets the cliff with no bare gap;
    // the enforce pass skips true cliff tiles, so over-reaching into the cliff is harmless.
    { x0: 41, y0: 123, x1: 47, y1: 162 },
    // Southern reed band - a 4-tile-tall hedge (world y85-88) sweeping west from x93 to the
    // western coastal cliff at x6, screening the south-west approach.
    { x0: 6, y0: 235, x1: 93, y1: 238 },
    // East cliff-gap hedge - fills the break between cliffs (world x124-132, y-2..2) with reeds so
    // the gap reads as a soft-gated grass pass rather than an open lane.
    { x0: 274, y0: 148, x1: 282, y1: 152 },
    // West cliff shelf lane - world (-61, 68). x0 reaches the cliff face (x85–86); enforce skips
    // true cliff tiles so the reed band starts flush on the east edge of the cliff sprite.
    { x0: 86, y0: 217, x1: 90, y1: 223, throughSpinePath: true },
    // East-central reed column - world (89-93, -44..-32); a tall vertical hedge screening the
    // approach here. Trees in the lane are cleared to walkable grass by the enforce pass.
    { x0: 239, y0: 106, x1: 243, y1: 118 },
  ],
};
const TALL_GRASS_GATE_GROUND: ReadonlySet<TileType> = new Set<TileType>([
  'grass', 'dirt', 'dark_grass', 'hollow_blight',
]);
// Scatter decorations cleared out of the way inside a gate so the reed band reads as a clean,
// continuous hedge - trees, stumps, logs, rocks, loose flora. Cliffs/water/walls/paths/props and
// anything interactive are NOT listed here, so they survive untouched.
const TALL_GRASS_GATE_CLEARABLE: ReadonlySet<TileType> = new Set<TileType>([
  'tree', 'dead_tree', 'fallen_tree', 'stump', 'fallen_log', 'fallen_log_v',
  'rock', 'mushroom', 'hedge', 'flower', 'bones', 'fence',
]);

function enforceWhisperingWoodsTallGrassGates(tiles: Tile[][], def: MapDefinition) {
  const rects = TALL_GRASS_GATE_RECTS[def.name];
  if (!rects) return;
  for (const r of rects) {
    for (let ty = r.y0; ty <= r.y1; ty++) {
      for (let tx = r.x0; tx <= r.x1; tx++) {
        if (ty < 0 || ty >= tiles.length || tx < 0 || tx >= tiles[0].length) continue;
        const t = tiles[ty][tx];
        // Preserve authored paths, props, and anything interactive (chests, levers, pickups, portals).
        if (t.transition || t.interactable) continue;
        if (t.spinePath && !r.throughSpinePath) continue;
        const isGround = TALL_GRASS_GATE_GROUND.has(t.type);
        const isClearable = TALL_GRASS_GATE_CLEARABLE.has(t.type);
        // Cliffs/water/walls fall through both sets and stay untouched.
        if (!isGround && !isClearable) continue;
        // Only grass WALKABLE ground. A cliff's non-walkable sprite-buffer tiles keep their grass
        // type but stay impassable; grassing them made reeds appear to climb the cliff face, so we
        // skip them and let the hedge stop cleanly at the cliff edge. Scatter (trees/logs/etc.) is
        // always cleared to walkable tall grass, since removing the obstacle is the whole point.
        if (isGround && !t.walkable) continue;
        tiles[ty][tx] = createTile('tall_grass', true, {
          elevation: t.elevation ?? 0,
          baseTile: r.throughSpinePath ? 'grass' : undefined,
        });
      }
    }
  }
}

function scrubWhisperingWoodsOpenLaneTallGrass(tiles: Tile[][], def: MapDefinition) {
  if (def.name !== 'Whispering Woods') return;

  // World (-17, 42) sits in an open Hollow lane. Keep the cliff-side grass fields,
  // but clear the stray tall grass clump that reads like accidental obstruction.
  for (let ty = 190; ty <= 194; ty++) {
    for (let tx = 131; tx <= 136; tx++) {
      if (ty < 0 || ty >= tiles.length || tx < 0 || tx >= tiles[0].length) continue;
      const t = tiles[ty][tx];
      if (t.type !== 'tall_grass' || t.transition || t.interactable) continue;
      tiles[ty][tx] = createTile('grass', true, { elevation: t.elevation ?? 0 });
    }
  }
}

function scrubWhisperingWoodsPrecipiceReserveLiveTrees(tiles: Tile[][], def: MapDefinition) {
  if (def.name !== 'Whispering Woods') return;

  // Precipice Reserve should read as a clear, first-class threshold pocket. Strip only
  // the live green trees near world (109,-113), leaving dead/corrupted silhouettes intact.
  for (let ty = 35; ty <= 49; ty++) {
    for (let tx = 253; tx <= 263; tx++) {
      if (ty < 0 || ty >= tiles.length || tx < 0 || tx >= tiles[0].length) continue;
      const t = tiles[ty][tx];
      if (t.type !== 'tree' || t.transition || t.interactable) continue;
      tiles[ty][tx] = createTile('hollow_blight', true, { elevation: t.elevation ?? 1 });
    }
  }
}

function scrubWhisperingWoodsPrecipiceWestPocketLiveTrees(tiles: Tile[][], def: MapDefinition) {
  if (def.name !== 'Whispering Woods') return;

  // West Precipice lip pocket around world (77,-139): props alone get overwritten by late
  // elevation/cliff passes, so strip live trees here after all stamping is finished.
  for (let ty = 9; ty <= 13; ty++) {
    for (let tx = 225; tx <= 232; tx++) {
      if (ty < 0 || ty >= tiles.length || tx < 0 || tx >= tiles[0].length) continue;
      const t = tiles[ty][tx];
      if (t.type !== 'tree' || t.transition || t.interactable) continue;
      tiles[ty][tx] = createTile('hollow_blight', true, { elevation: t.elevation ?? 1 });
    }
  }
}

function scrubWhisperingWoodsQuarryBankShortcutLiveTrees(tiles: Tile[][], def: MapDefinition) {
  if (def.name !== 'Whispering Woods') return;

  // Keep the quarry-bank shortcut readable once the gate is added to the west-bank picket cordon.
  // The live forest scatter crowds the lever/gate sprite here; clear only tree anchor tiles.
  for (let ty = 216; ty <= 228; ty++) {
    for (let tx = 198; tx <= 214; tx++) {
      if (ty < 0 || ty >= tiles.length || tx < 0 || tx >= tiles[0].length) continue;
      const t = tiles[ty][tx];
      if (t.type !== 'tree' || t.transition || t.interactable) continue;
      tiles[ty][tx] = createTile('grass', true, { elevation: t.elevation ?? 0 });
    }
  }
}

function enforceWhisperingWoodsEastCreekShoreGate(tiles: Tile[][], def: MapDefinition) {
  if (def.name !== 'Whispering Woods') return;

  // East creek north-shore picket gate at world (101,87) / tile (251,237). Closed gate panels
  // (walkable: false, key-gated) are applied at runtime by syncEastCreekShoreGateState.

  // Clear the live trees crowding the gate mouth so the opening reads cleanly.
  for (let ty = 235; ty <= 239; ty++) {
    for (let tx = 248; tx <= 254; tx++) {
      if (ty < 0 || ty >= tiles.length || tx < 0 || tx >= tiles[0].length) continue;
      const t = tiles[ty][tx];
      if (t.type !== 'tree' || t.transition || t.interactable) continue;
      tiles[ty][tx] = createTile('grass', true, { elevation: t.elevation ?? 0 });
    }
  }
}

function scrubWhisperingWoodsSouthEntryPicketGateTrees(tiles: Tile[][], def: MapDefinition) {
  if (def.name !== 'Whispering Woods') return;

  // West-bank picket gate (128,262–264) + lever (125,267): strip procedural trees crowding the panel.
  for (let ty = 260; ty <= 268; ty++) {
    for (let tx = 123; tx <= 130; tx++) {
      if (ty < 0 || ty >= tiles.length || tx < 0 || tx >= tiles[0].length) continue;
      const t = tiles[ty][tx];
      if (t.type !== 'tree' || t.transition || t.interactable) continue;
      tiles[ty][tx] = createTile('grass', true, { elevation: t.elevation ?? 0 });
    }
  }
}

function applyWhisperingWoodsHighlanderPlainsBiome(tiles: Tile[][], def: MapDefinition) {
  if (def.name !== 'Whispering Woods') return;

  // Highlander's Plains - everything north of the east creek picket fence (world y 87..144,
  // x 45..144 / tiles y 238..294, x 195..294). Retint plain grass to the sun-dried plains tone
  // and scatter knee-high straw tufts (walkable decor, not the breakable tall_grass walls).
  const Y0 = 238, Y1 = 294;
  const X0 = 195, X1 = 294;
  // Speckled border blend (same recipe as placeBridgeDecayBlend): instead of a hard biome line at
  // the south fence row / west open edge, plains coverage ramps in over ~4 tiles of depth inside
  // the region AND spills ~2 tiles out into the forest grass, with a deterministic multi-octave
  // speckle, so the two grasses interleave across a wide, obvious transition band.
  const BLEND_DEPTH = 4; // ramp depth inside the region
  const BLEND_OUTSET = 4; // plains speckles spill well past the border into the forest side
  for (let ty = Y0 - BLEND_OUTSET; ty <= Y1; ty++) {
    for (let tx = X0 - BLEND_OUTSET; tx <= X1; tx++) {
      if (ty < 0 || ty >= tiles.length || tx < 0 || tx >= tiles[0].length) continue;
      const t = tiles[ty][tx];
      if (t.transition || t.interactable) continue;
      const insideRegion = ty >= Y0 && tx >= X0;
      // Cliff caps inside the plains get the yellow-shifted edge art so the band matches the ground.
      if (t.type === 'cliff_edge') {
        if (insideRegion) tiles[ty][tx] = { ...t, type: 'cliff_edge_plains' };
        continue;
      }
      if (t.type !== 'grass') continue;

      // Signed depth from the nearest open border (south fence line, west edge); negative in the
      // forest-side outset band. North/east are map edges - no transition to blend against.
      const depth = Math.min(ty - Y0, tx - X0);
      if (depth < BLEND_DEPTH) {
        // Linear ramp across the full band (outset..depth) with a strong speckle so coverage
        // disperses from ~5% two tiles into the forest up to ~95% four tiles into the plains.
        const ramp = (depth + BLEND_OUTSET + 1) / (BLEND_DEPTH + BLEND_OUTSET);
        const h1 = bridgeDecayHash01(tx, ty, 21);
        const h2 = bridgeDecayHash01(tx + 3, ty - 2, 27);
        const h3 = bridgeDecayHash01(tx - 1, ty + 5, 33);
        const speckle = (h1 - 0.5) * 0.55 + (h2 - 0.5) * 0.3 + (h3 - 0.5) * 0.2;
        if (ramp + speckle <= 0.5) continue; // stays forest grass
      }

      if (!t.walkable) {
        // Unwalkable bare grass here is an invisible prop foundation (windmill base, etc.) or a
        // cliff-sprite buffer stamped before this pass. Keep its collision and flags but retint
        // the ground so it doesn't read as a bright forest-grass rectangle on the plains.
        tiles[ty][tx] = { ...t, type: 'plains_grass' };
        continue;
      }

      // Keep the gate mouth clear so the opening stays readable from both sides.
      const nearGateMouth = ty <= 240 && tx >= 248 && tx <= 254;
      // Deterministic coordinate hash - ~8% tuft coverage, stable across regenerations.
      const hash = ((tx * 73856093) ^ (ty * 19349663)) >>> 0;
      const tuft = !nearGateMouth && hash % 100 < 8;
      tiles[ty][tx] = createTile(tuft ? 'plains_grass_tall' : 'plains_grass', true, {
        elevation: t.elevation ?? 0,
      });
    }
  }
}

function scrubWhisperingWoodsPlainsCliffBufferBoxes(tiles: Tile[][], def: MapDefinition) {
  if (def.name !== 'Whispering Woods') return;

  // World (55,99)/(56,99): applySouthCliffSpriteWalkabilityBuffer left two unwalkable grass tiles
  // two rows clear of the cliff band's art, and the plains biome pass skips unwalkable grass - so
  // they read as a phantom collision box on a stray bright-green patch. Restore them as open
  // plains ground.
  for (const { tx, ty } of [{ tx: 205, ty: 249 }, { tx: 206, ty: 249 }]) {
    const t = tiles[ty]?.[tx];
    if (!t || t.walkable || t.type !== 'grass') continue;
    tiles[ty][tx] = createTile('plains_grass', true, { elevation: t.elevation ?? 0 });
  }
}

function sealWhisperingWoodsPlainsNorthRimGap(tiles: Tile[][], def: MapDefinition) {
  if (def.name !== 'Whispering Woods') return;

  // Rows ty 287-288 (world y 137-138) between the plains north cliff band and the authored
  // north-rim cliff_face are leftover sprite-buffer tiles: unwalkable grass that is covered by
  // the band's tall art in-world but reads as a walkable green strip on the minimap. Type them
  // as cliff body so the rim renders as one solid mass. Genuinely walkable tiles (the east
  // map-edge corridor at tx 292-293 and the open west fringe) are left untouched.
  for (let ty = 287; ty <= 288; ty++) {
    for (let tx = 230; tx <= 291; tx++) {
      const t = tiles[ty]?.[tx];
      if (!t || t.transition || t.interactable || t.walkable) continue;
      tiles[ty][tx] = createTile('cliff', false, { elevation: t.elevation ?? 0 });
    }
  }
}

function enforceWhisperingWoodsPlainsWestSlope(tiles: Tile[][], def: MapDefinition) {
  if (def.name !== 'Whispering Woods') return;

  // Where high plains shelves (el1) meet lower fields (el0) along bare grass columns, keep the
  // boundary open: mark both columns as spinePath so the player walks the gentle rise anywhere
  // along the line (same mechanism as authored dirt spines) instead of hitting an invisible
  // wall or a stamped cliff face.
  const slopeStrips: Array<{ y0: number; y1: number; cols: [number, number] }> = [
    { y0: 251, y1: 282, cols: [229, 230] }, // world (80,101)-(80,132) - east high plains west face
    { y0: 242, y1: 251, cols: [199, 200] }, // world (50,92)-(50,101) - lakeside shelf west face
    { y0: 238, y1: 288, cols: [291, 292] }, // world (142,88)-(142,138) - east map-edge corridor face
  ];
  for (const { y0, y1, cols } of slopeStrips) {
    for (let ty = y0; ty <= y1; ty++) {
      for (const tx of cols) {
        const t = tiles[ty]?.[tx];
        if (!t || !t.walkable || t.transition || t.interactable) continue;
        if (t.type !== 'plains_grass' && t.type !== 'plains_grass_tall' && t.type !== 'grass') continue;
        tiles[ty][tx] = { ...t, spinePath: true };
      }
    }
  }
}

function enforceWhisperingWoodsPlainsShelfLipElevation(tiles: Tile[][], def: MapDefinition) {
  if (def.name !== 'Whispering Woods') return;

  // Plains shelf lip rows directly north of cliff_edge bands: isolated walkable e0 potholes
  // inside an otherwise e1 row (seen at world 52,100 / 57,100, and on the high-plains south lip
  // at y=282) render as sunken one-tile seam columns and block +/-1 elevation crossing.
  // Raise any such dip to match its e1 neighbors.
  const lipRows: Array<{ ty: number; x0: number; x1: number }> = [
    { ty: 250, x0: 200, x1: 212 }, // SE bluff lip (world y=100)
    { ty: 282, x0: 231, x1: 291 }, // high-plains south lip (world y=132)
  ];
  const isLipPothole = (ty: number, tx: number): boolean => {
    const t = tiles[ty]?.[tx];
    return !!t && t.walkable && !t.transition && !t.interactable && (t.elevation ?? 0) === 0;
  };
  for (const { ty, x0, x1 } of lipRows) {
    for (let tx = x0; tx <= x1; tx++) {
      if (!isLipPothole(ty, tx)) continue;
      // Maximal run of e0 tiles starting here; raise short runs (<=4) flanked by e1 on both ends.
      let runEnd = tx;
      while (runEnd + 1 <= x1 && isLipPothole(ty, runEnd + 1)) runEnd++;
      const west = tiles[ty][tx - 1];
      const east = tiles[ty][runEnd + 1];
      if (runEnd - tx < 4 && (west?.elevation ?? 0) === 1 && (east?.elevation ?? 0) === 1) {
        for (let rx = tx; rx <= runEnd; rx++) {
          tiles[ty][rx] = { ...tiles[ty][rx], elevation: 1 };
        }
      }
      tx = runEnd;
    }
  }
}

function scrubWhisperingWoodsPrecipiceWestRitualDeadTrees(tiles: Tile[][], def: MapDefinition) {
  if (def.name !== 'Whispering Woods') return;

  // Precipice summoning glyph (tile 227,12 / world 77,-138): procedural dead_tree scatter
  // overlaps the large ritual sprite - clear only the two tiles hugging the sigil.
  const anchorX = 227;
  const anchorY = 12;
  const clearRadius = 2;
  for (let ty = anchorY - clearRadius; ty <= anchorY + clearRadius; ty++) {
    for (let tx = anchorX - clearRadius; tx <= anchorX + clearRadius; tx++) {
      if (tx === anchorX && ty === anchorY) continue;
      if (ty < 0 || ty >= tiles.length || tx < 0 || tx >= tiles[0].length) continue;
      const dist = Math.max(Math.abs(tx - anchorX), Math.abs(ty - anchorY));
      if (dist > clearRadius) continue;
      const t = tiles[ty][tx];
      if (t.type !== 'dead_tree' || t.transition || t.interactable) continue;
      tiles[ty][tx] = createTile('hollow_blight', true, { elevation: t.elevation ?? 1 });
    }
  }
}

function enforceWhisperingWoodsPrecipiceReserveWestLip(tiles: Tile[][], def: MapDefinition) {
  if (def.name !== 'Whispering Woods') return;

  // World x=96 / tile x=246 is the visible west lip of the huge off-map caldera.
  // Keep the cliff/seam art intact; only clear collision on the local walk-through segment.
  for (let ty = 9; ty <= 36; ty++) {
    for (let tx = 245; tx <= 246; tx++) {
      if (ty < 0 || ty >= tiles.length || tx < 0 || tx >= tiles[0].length) continue;
      const t = tiles[ty][tx];
      if (t.transition || t.interactable) continue;
      tiles[ty][tx] = { ...t, walkable: true, spinePath: true };
    }
  }
}

function enforceWhisperingWoodsPrecipiceReserveCliffBites(tiles: Tile[][], def: MapDefinition) {
  if (def.name !== 'Whispering Woods') return;

  // The west-lip seam has intentional walk-throughs near world y=-138 and y=-115,
  // but the cliff face between them should remain a solid visual wall.
  for (let ty = 19; ty <= 31; ty++) {
    for (let tx = 244; tx <= 249; tx++) {
      if (ty < 0 || ty >= tiles.length || tx < 0 || tx >= tiles[0].length) continue;
      const t = tiles[ty][tx];
      if (t.transition || t.interactable) continue;
      tiles[ty][tx] = createTile(ty === 19 ? 'cliff_edge_corrupted' : 'cliff_corrupted', false, {
        elevation: t.elevation ?? 2,
      });
    }
  }
}

function scrubWhisperingWoodsPrecipiceReserveSouthSeam(tiles: Tile[][], def: MapDefinition) {
  if (def.name !== 'Whispering Woods') return;

  // Remove only the live trees on the Precipice Reserve vertical sightline around
  // world x=92, y=-122..-109. Dead trees remain as Hollow silhouettes.
  for (let ty = 28; ty <= 41; ty++) {
    for (let tx = 239; tx <= 245; tx++) {
      if (ty < 0 || ty >= tiles.length || tx < 0 || tx >= tiles[0].length) continue;
      const t = tiles[ty][tx];
      if (t.type !== 'tree' || t.transition || t.interactable) continue;
      tiles[ty][tx] = createTile('hollow_blight', true, { elevation: t.elevation ?? 1 });
    }
  }

  // World y=-112 / tile y=38: clear collision along the horizontal seam from
  // world x=76..96 while preserving the existing seam/cliff/dead-tree art.
  for (let ty = 37; ty <= 39; ty++) {
    for (let tx = 226; tx <= 246; tx++) {
      if (ty < 0 || ty >= tiles.length || tx < 0 || tx >= tiles[0].length) continue;
      const t = tiles[ty][tx];
      if (t.transition || t.interactable) continue;
      tiles[ty][tx] = { ...t, walkable: true, spinePath: true };
    }
  }
}

function scrubWhisperingWoodsPrecipiceAltarDeadTrees(tiles: Tile[][], def: MapDefinition) {
  if (def.name !== 'Whispering Woods') return;

  // World (86,-115) / tile (236,35): open up the NE ridge heresy altar without
  // changing the altar itself or the surrounding elevation seam art.
  for (let ty = 31; ty <= 39; ty++) {
    for (let tx = 231; tx <= 240; tx++) {
      if (ty < 0 || ty >= tiles.length || tx < 0 || tx >= tiles[0].length) continue;
      const t = tiles[ty][tx];
      if (t.type !== 'dead_tree' || t.transition || t.interactable) continue;
      tiles[ty][tx] = createTile('hollow_blight', true, { elevation: t.elevation ?? 1 });
    }
  }
}

function enforceWhisperingWoodsPrecipiceSpineCliffCover(tiles: Tile[][], def: MapDefinition) {
  if (def.name !== 'Whispering Woods') return;

  // World x=76..80, y=-110..-93 / tile x=226..230, y=40..57:
  // cover this exposed dirt spine segment with solid cliff face.
  for (let ty = 40; ty <= 57; ty++) {
    for (let tx = 226; tx <= 230; tx++) {
      if (ty < 0 || ty >= tiles.length || tx < 0 || tx >= tiles[0].length) continue;
      const t = tiles[ty][tx];
      if (t.transition || t.interactable) continue;
      tiles[ty][tx] = createTile('cliff', false, { elevation: t.elevation ?? 2 });
    }
  }
}

function enforceEastRidgeAscent(tiles: Tile[][], def: MapDefinition) {
  if (def.name !== 'Whispering Woods') return;
  // [x, y, width, height, elevation?] switchback segments, matching the authored clearings.
  // The first half (C1-C7) is el1, level with the ladder overlook; the extension wraps east and
  // climbs north, ending on an el2 summit field (E3) one cliff layer above the ladder shortcut.
  const segments: [number, number, number, number, number?][] = [
    [248, 129, 14, 2],  // C1 connector ledge from the ladder overlook
    [248, 131, 4, 6],   // C2 throat dropping south
    [241, 134, 11, 3],  // C3 switchback turning west
    [241, 136, 4, 15],  // C4 long west leg
    [241, 148, 11, 3],  // C5 switchback turning east (stops short of the summit field)
    [248, 150, 4, 10],  // C6 corridor south to the mid-point landing (held west, world ~99)
    [243, 157, 13, 7],  // C7 mid-point landing bowl
    [255, 159, 8, 3],   // E1 right leg east off the landing (full elbow x255-262, y159-161)
    [259, 147, 4, 15],  // E2 lengthened north leg climbing back toward the ladder (y147-161)
    [256, 139, 10, 8, 2], // E3 el2 summit field (pushed north, SW corner shaved off)
  ];
  for (const [sx, sy, sw, sh, sel] of segments) {
    const elevation = sel ?? 1;
    for (let ty = sy; ty < sy + sh; ty++) {
      for (let tx = sx; tx < sx + sw; tx++) {
        if (ty < 0 || ty >= tiles.length || tx < 0 || tx >= tiles[0].length) continue;
        const t = tiles[ty][tx];
        // Preserve chests, ladders, signs, and transitions placed on the path.
        if (t && (t.transition || t.interactable)) continue;
        tiles[ty][tx] = createTile('grass', true, { elevation });
      }
    }
  }

  const stamp = (tx: number, ty: number, type: TileType, walkable: boolean, elevation: number) => {
    if (ty < 0 || ty >= tiles.length || tx < 0 || tx >= tiles[0].length) return;
    const t = tiles[ty][tx];
    if (t && (t.transition || t.interactable)) return;
    tiles[ty][tx] = createTile(type, walkable, { elevation });
  };

  // --- Environmental storytelling: dress the climb like a treacherous, failed ascent. Stamped
  // AFTER the grass carve so they survive (enforceEastRidgeAscent runs late in generateMap, past
  // placeProps). createTile leaves baseTile unset, so these overlays render over the resolved
  // neighbour terrain (grass). Ground overlays (bones/bloodstain/rubble) stay walkable; blockers
  // (dead_tree/tombstone/sign/campfire) sit only on dead corners of WIDE segments so they never
  // choke the single-file corridor. [tx, ty, type, walkable, elevation]
  const decor: [number, number, TileType, boolean, number][] = [
    // Trailhead off the ladder overlook - a lone lantern and the bones of the first to try.
    [259, 129, 'lantern', true, 1],
    [256, 130, 'bones', true, 1],
    [252, 130, 'bones', true, 1],
    // Upper switchback (C3) - a dead tree clinging to the rock at the NW dead corner.
    [241, 134, 'dead_tree', false, 1],
    // Boulder containment at the lane summit (tile 242,134 = world 92,−16).
    // The skeleton guard breaks this loose; the crate and rubble read as the wooden
    // cradle that was holding the boulder in place.
    [242, 134, 'crate',     false, 1],
    [243, 134, 'rubble',    true,  1],
    [243, 135, 'bones',     true,  1],
    // Long west descent (C4), the boulder lane - rockfall debris and old bloodstains.
    [242, 143, 'bloodstain', true, 1],
    [243, 145, 'rubble', true, 1],
    [242, 147, 'bones', true, 1],
    // Lower switchback (C5) - a broken grave at the far-east dead corner.
    [251, 148, 'tombstone_broken', false, 1],
    [249, 149, 'bones', true, 1],
    // Mid-point landing (C7): dressed like the FINAL camp where climbers gave up - the fake end.
    [247, 160, 'campfire_remains', false, 1],
    [245, 159, 'bones_pile', true, 1],
    [250, 162, 'bloodstain', true, 1],
    [244, 162, 'broken_sign', false, 1],
    // One loose crate at the far dead corner - a stray supply left by the last climber.
    [253, 162, 'crate', false, 1],
    // Hidden climb (E2) past the barricade - sparse remains the player only sees if they break through.
    [261, 150, 'bones', true, 1],
    [260, 155, 'bloodstain', true, 1],
    // Summit arena (E3, el2): a boneyard of challengers ringing the Ridge Revenant.
    [257, 140, 'tombstone_broken', false, 2],
    [264, 145, 'tombstone_broken', false, 2],
    [263, 141, 'bones_pile', true, 2],
    [258, 144, 'bones', true, 2],
    [262, 143, 'bloodstain', true, 2],
  ];
  for (const [tx, ty, type, walkable, elevation] of decor) stamp(tx, ty, type, walkable, elevation);

  // --- Fake-end barricade: a wrecked wagon braced by a barrel row. This reads as an
  // abandoned-climber blockade, not a tile puzzle, while still hiding the climb to the Ridge
  // Revenant + Tempered Core. Smashing these breakables resolves back to el1 grass.
  //
  // The E1 throat (segment [255,159,8,3]) is the ONLY land link between the C7 landing (west)
  // and the hidden E2 climb (east, x>=257), bounded by cliff void on the y158/y162 rows. The
  // barricade therefore fills the full corridor cross-section - all three rows (y159-161) at
  // x255-256 - so the player cannot slip past it on the y159/y161 rows the way the old
  // single-row blockade allowed. Past x256 the E1 elbow stays open (x257-262) so smashing
  // through opens straight onto the climb.
  // Row 0 (front seal, x255-256): barrels flanking the lead wagon - full 3-row cross-section.
  // Rows 1-2 (world ~108 and ~110, x258 and x260): two wagons staggered along the corridor
  // giving the blockade depth and making the "this is a real barricade" read stronger.
  const barricade: [number, number, TileType][] = [
    [255, 159, 'barrel'], [256, 159, 'barrel'],
    [255, 160, 'barrel'], [256, 160, 'wagon'],
    [255, 161, 'barrel'], [256, 161, 'barrel'],
    // Second wagon - world (~108, 11), staggered slightly off-centre
    [258, 160, 'wagon'], [258, 161, 'barrel'],
    // Third wagon - world (~110, 11)
    [260, 159, 'barrel'], [260, 160, 'wagon'],
  ];
  for (const [tx, ty, type] of barricade) {
    stamp(tx, ty, type, false, 1);
    const t = tiles[ty]?.[tx];
    if (t && !t.transition && !t.interactable) {
      tiles[ty][tx] = { ...t, baseTile: 'grass' };
    }
  }
}

// Carves the cliff shortcut linking C7 (world ~90, ~13) to the fort-side grass pocket.
// Layout (all tile coords):
//   • C7 west rim    el1  y=163, x=240-242 - cliff void (world 90-92, 13); not walkable shelf
//   • Cliff fill            y=164-168, x=238-242 - seals world (88-92, 14-18)
//   • Descent corridor el1→el0  x=243-244, y=164-171 - east-of-fill outlet C7 → platform
//   • Grass platform   el0  y=170-173, x=239-242 - sealed cliff pocket
//   • Gate ladder at x=239, y=172 (world 89,22) on the el1 shelf where the corridor walk ends
//     (~90,22 east); drops screen-DOWN (north) to fort landing west at (238,168 / world 88,18).
function enforceFortRidgeLadderGate(tiles: Tile[][], def: MapDefinition) {
  if (def.name !== 'Whispering Woods') return;

  const stamp = (tx: number, ty: number, type: TileType, walkable: boolean, elevation: number, extra?: Partial<Tile>) => {
    if (ty < 0 || ty >= tiles.length || tx < 0 || tx >= tiles[0].length) return;
    const t = tiles[ty][tx];
    if (t && (t.transition || t.interactable)) return;
    tiles[ty][tx] = createTile(type, walkable, { elevation, ...extra });
  };

  // C7 west rim (el1): world (90-92, 13) hangs over the cliff void - keep impassable like y162.
  for (let tx = 240; tx <= 242; tx++) {
    stamp(tx, 163, 'cliff', false, 1);
  }

  // Cliff fill: seal world (88-92, 14-18) = tile (238-242, 164-168).
  for (let ty = 164; ty <= 168; ty++) {
    for (let tx = 238; tx <= 242; tx++) {
      tiles[ty][tx] = createTile('cliff', false, { elevation: 0 });
    }
  }

  // Descent corridor (el1): x=243-244, y=164-171 - continuous high ground from C7 to the overlook.
  for (let ty = 164; ty <= 171; ty++) {
    for (let tx = 243; tx <= 244; tx++) {
      stamp(tx, ty, 'grass', true, 1);
    }
  }
  stamp(243, 172, 'cliff', false, 1);
  stamp(244, 172, 'cliff', false, 1);

  const gateX = 239;
  const gateY = 172;
  const bottomY = gateY - 1; // bottomY = 171 (Only 1 tile down from gate to prevent going too far)

  // El1 shelf east of the gate column (x=239 stays cliff-edge mounted, not walkable path).
  for (let ty = 170; ty <= gateY; ty++) {
    for (let tx = 240; tx <= 242; tx++) {
      stamp(tx, ty, 'grass', true, 1);
    }
  }
  for (let tx = 240; tx <= 242; tx++) {
    stamp(tx, 169, 'cliff', false, 0);
  }

  // Mirrored cliff-corridor ladder pocket: high landing east, low landing west, cliffs on the right.
  for (let ty = bottomY; ty <= gateY; ty++) {
    for (const tx of [gateX - 1, gateX, gateX + 1]) {
      if (ty < 0 || ty >= tiles.length || tx < 0 || tx >= tiles[0].length) continue;
      const existing = tiles[ty][tx];
      if (existing?.transition || existing?.interactable) continue;
      if (tx === gateX + 1 && ty === gateY) {
        tiles[ty][tx] = createTile('grass', true, { elevation: 1, enemyBlocked: true });
      } else if (tx === gateX - 1 && ty === bottomY) {
        tiles[ty][tx] = createTile('grass', true, { elevation: 0, enemyBlocked: true });
      } else if (tx === gateX && ty === gateY) {
        tiles[ty][tx] = createTile('cliff_edge', false, { elevation: 1 });
      } else if (tx === gateX - 1 && ty > bottomY && ty <= gateY) {
        // Clear out any cliff/obstruction tiles in front of the ladder columns on the west side
        tiles[ty][tx] = createTile('grass', true, { elevation: 0 });
      } else {
        tiles[ty][tx] = createTile(ty === gateY ? 'cliff_edge' : 'cliff', false, {
          elevation: ty === gateY ? 1 : 0,
        });
      }
    }
  }

  // Seal the cliff face above the landing: world (87, 18)-(89, 18) (tiles 237-239, 168) are unwalkable cliffs.
  for (let tx = 237; tx <= 239; tx++) {
    stamp(tx, 168, 'cliff', false, 0);
  }

  // Cliff-sprite bleed buffer (engine convention: CLIFF_SPRITE_BUFFER_ROWS=2). The tall cliff
  // sprite at row 168 visually covers the two rows below it (169-170 / world y=19-20). Keep these
  // grass-typed (so they do NOT emit cliff art and propagate the bleed further) but NON-walkable,
  // so the player never stands on a tile that visually reads as cliff. The clean landing is row 171.
  for (let tx = 237; tx <= 239; tx++) {
    stamp(tx, 169, 'grass', false, 0);
    stamp(tx, 170, 'grass', false, 0);
  }

  // Clean walkable landing at the ladder foot: world (87-89, 21) = tiles (237-239, 171).
  stamp(237, 171, 'grass', true, 0);
  stamp(238, 171, 'grass', true, 0);

  // North cap above the ladder column (world y=23-26): seal bypass so the only exits are the
  // west landing (238,171) and the el1 shelf east of the gate (240+,172).
  for (let ty = 173; ty <= 176; ty++) {
    for (let tx = 237; tx <= 239; tx++) {
      stamp(tx, ty, 'cliff', false, 1);
    }
  }

  // Shelf-mouth plug (world 92,23 / tile 242,173): closes the gap between the north cap and
  // the east cliff wall so the pocket cannot be bypassed from the shelf.
  stamp(242, 173, 'cliff', false, 1);

  // Replace the procedural rock blocking the shelf mouth (world ~93,25 / tile 243,175).
  stamp(243, 175, 'cliff', false, 1);

  // East cliff face fill (world x=91-94, y=23-27 / tiles 241-244, 173-177): patch procedural grass
  // gaps in the east wall for a continuous cliff face. Preserve the el0/el=1 spine corridor at
  // tx 239-240, ty 175-183 (handled later by enforceWhisperingWoodsEastDirtSpineBreak).
  for (let ty = 173; ty <= 177; ty++) {
    for (let tx = 241; tx <= 244; tx++) {
      stamp(tx, ty, 'cliff', false, 1);
    }
  }
  // Row 174 column 240 sits outside the spine corridor (ty 175+) but still reads as east wall.
  stamp(240, 174, 'cliff', false, 1);

  stamp(239, 177, 'grass', true, 0); // el0 plateau-crossing spine (world 89,27)
}

// Clears procedural logs/trees from the fort-ridge ladder mouth (world ~87-91, 18-23 /
// tiles x=237-241, y=168-173) and converts stray rocks above the pocket into cliff.
function scrubFortRidgeLadderScatter(tiles: Tile[][], def: MapDefinition) {
  if (def.name !== 'Whispering Woods') return;
  const scatterTypes: Set<string> = new Set([
    'fallen_log',
    'fallen_log_v',
    'tree',
    'dead_tree',
    'fallen_tree',
    'stump',
    'tall_grass',
    'rock',
    'mossy_stone',
  ]);
  for (let ty = 168; ty <= 177; ty++) {
    for (let tx = 237; tx <= 244; tx++) {
      if (ty < 0 || ty >= tiles.length || tx < 0 || tx >= tiles[0].length) continue;
      const t = tiles[ty][tx];
      if (!t || t.transition || t.interactable) continue;
      if (tx === 239 && ty === 172) continue; // gate top
      if (tx === 239 && ty === 171) continue; // bottom rung / west landing column
      if (tx === 238 && ty === 171) continue; // west landing
      if (ty >= 173 && tx >= 237 && tx <= 239) continue; // north cap (enforceFortRidgeLadderGate)
      if (tx === 242 && ty === 173) continue; // shelf-mouth plug (enforceFortRidgeLadderGate)
      if (tx >= 241 && tx <= 244 && ty >= 173 && ty <= 177) continue; // east cliff face fill
      if (tx === 240 && ty === 174) continue; // east cliff face fill (row 174 only)
      if (tx === 243 && ty === 175) continue; // rock→cliff handled in enforceFortRidgeLadderGate
      if (scatterTypes.has(t.type)) {
        tiles[ty][tx] = createTile(
          ty >= 173 && tx >= 240 ? 'cliff' : 'grass',
          ty >= 173 && tx >= 240 ? false : true,
          { elevation: ty <= 172 && tx >= 240 ? 1 : ty >= 173 ? 1 : 0 },
        );
      }
    }
  }
  // Legacy gate columns west of the corrected drop - restore fort-approach grass.
  for (const ty of [171, 172, 173, 174, 175, 176, 177]) {
    for (const tx of [235, 236]) {
      const t = tiles[ty]?.[tx];
      if (!t || t.transition || t.interactable) continue;
      if (t.type === 'gate_ladder' || t.type === 'ladder' || t.type === 'cliff_edge'
          || scatterTypes.has(t.type)) {
        tiles[ty][tx] = createTile('grass', true, { elevation: 0 });
      }
    }
  }
}

// Reopens the grass shelf below the hollow-approach stairway (world ~-38,-37 / tiles x=110-118,
// y=111-112). stampCliffs' south-face sprite buffer marks these grass tiles non-walkable even
// though they must stay traversable so the player can reach the stair mouth at y=107-110.
// Also marks the cliff_edge row at y=107 (x=110-118) as enemyBlocked so enemies that climb the
// stair cannot roam east along the highland ledge toward the ladder column.
function enforceHollowApproachOverlookShelf(tiles: Tile[][], def: MapDefinition) {
  if (def.name !== 'Whispering Woods') return;
  const scatterTypes: Set<string> = new Set([
    'tall_grass',
    'fallen_log',
    'fallen_log_v',
    'tree',
    'fallen_tree',
    'stump',
  ]);
  for (let ty = 111; ty <= 112; ty++) {
    for (let tx = 110; tx <= 118; tx++) {
      if (ty < 0 || ty >= tiles.length || tx < 0 || tx >= tiles[0].length) continue;
      const t = tiles[ty][tx];
      if (!t || t.transition || t.interactable) continue;
      if (t.type === 'grass' && !t.walkable) {
        tiles[ty][tx] = { ...t, walkable: true };
        continue;
      }
      if (scatterTypes.has(t.type)) {
        tiles[ty][tx] = createTile('grass', true, { elevation: t.elevation ?? 0 });
      }
    }
  }
  // Enemy collision centers are smaller than large wolf sprites; keep enemies one tile
  // west of the ladder column so their art does not hang over the climb path.
  for (let ty = 111; ty <= 112; ty++) {
    const tx = 118;
    if (ty < 0 || ty >= tiles.length || tx < 0 || tx >= tiles[0].length) continue;
    const t = tiles[ty][tx];
    if (!t || t.transition || t.interactable || !t.walkable) continue;
    tiles[ty][tx] = { ...t, enemyBlocked: true };
  }
  // Mark cliff_edge row at the top of the stairway as enemyBlocked so wolves cannot walk
  // from the stair landing onto the highland ledge and appear north of the ladder.
  for (let tx = 110; tx <= 125; tx++) {
    const ty = 107;
    if (ty < 0 || ty >= tiles.length || tx < 0 || tx >= tiles[0].length) continue;
    const t = tiles[ty][tx];
    if (!t || t.transition) continue;
    if (t.walkable) {
      tiles[ty][tx] = { ...t, enemyBlocked: true };
    }
  }
}

// Reopens the east-west ridge walkway west of the spine gate (world ~-10,-37 /
// tiles x=119-144, y=112). stampCliffs' south-face buffer and scatter props on that row
// block r=0.2 corner probes from the y=113 floor and cause invisible walls.
function enforceHollowApproachSpineCorridor(tiles: Tile[][], def: MapDefinition) {
  if (def.name !== 'Whispering Woods') return;
  const ty = 112;
  const scatterTypes: Set<string> = new Set([
    'tall_grass',
    'fallen_log',
    'fallen_log_v',
    'tree',
    'fallen_tree',
    'stump',
  ]);
  for (let tx = 119; tx <= 144; tx++) {
    if (ty < 0 || ty >= tiles.length || tx < 0 || tx >= tiles[0].length) continue;
    const t = tiles[ty][tx];
    if (!t || t.transition || t.interactable) continue;
    if ((t.type === 'grass' || t.type === 'dirt') && !t.walkable) {
      tiles[ty][tx] = { ...t, walkable: true };
      continue;
    }
    if (scatterTypes.has(t.type)) {
      tiles[ty][tx] = createTile('grass', true, { elevation: t.elevation ?? 0 });
    }
  }
}

// Reopens the east-west ridge corridor between the dirt spine (x=146–153) and the cliff-top
// walkway entry (x=198) at y=111–112 (world ~-38). The cliff_face buffer (stampCliffs south-face
// buffer from the y=114 cliff band) marks x=154–193 non-walkable and leaves them at el=0 while
// the cliff-top walkway starts at el=1 (x=194+). Both issues block leftward movement from
// world (44,−38). Marking these tiles spinePath lets the el=0↔el=1 seam be crossed freely.
// Also reopens apron rows y=104–105 near the north-fort walkway mouth (x=186–197) whose cliff
// buffer blocks the north corner probe when moving west from world (43,−44).
function enforceNorthFortRidgeCorridor(tiles: Tile[][], def: MapDefinition) {
  if (def.name !== 'Whispering Woods') return;
  const scatterTypes: Set<string> = new Set([
    'tall_grass', 'fallen_log', 'fallen_log_v', 'tree', 'fallen_tree', 'stump',
  ]);
  // Ridge corridor y=111–112, x=154–197 (between dirt-spine end and cliff-top walkway).
  for (let ty = 111; ty <= 112; ty++) {
    for (let tx = 154; tx <= 197; tx++) {
      if (ty < 0 || ty >= tiles.length || tx < 0 || tx >= tiles[0].length) continue;
      const t = tiles[ty][tx];
      if (!t || t.transition || t.interactable) continue;
      if (t.type === 'grass' || t.type === 'dirt') {
        tiles[ty][tx] = { ...t, walkable: true, spinePath: true };
      } else if (scatterTypes.has(t.type)) {
        tiles[ty][tx] = createTile('grass', true, { elevation: t.elevation ?? 0, spinePath: true });
      }
    }
  }
  // Single isolated el=0 tile at (190,106) is surrounded by el=1 neighbours on all four
  // sides; the seam filler generates fillers in all four directions producing a sunken-pit
  // multi-direction seam. Raise it to el=1 to match its neighbours.
  {
    const t = tiles[106][190];
    if (t && !t.transition && !t.interactable && (t.type === 'grass' || t.type === 'dirt')) {
      tiles[106][190] = { ...t, elevation: 1 };
    }
  }

  // Cliff-corridor east exit pocket: x=269–271, y=130–133 (world ~119–121, -17 to -20).
  // The el=0 corridor at y=130–131 exits north into el=1 grass at y=132–133. Neither
  // side has spinePath so the ±1 elevation step is blocked. No type/walkability changes -
  // all tiles here are already walkable grass at the correct elevation.
  for (let ty = 130; ty <= 133; ty++) {
    for (let tx = 269; tx <= 271; tx++) {
      if (ty < 0 || ty >= tiles.length || tx < 0 || tx >= tiles[0].length) continue;
      const t = tiles[ty][tx];
      if (!t || t.transition || t.interactable) continue;
      if ((t.type === 'grass' || t.type === 'dirt') && t.walkable) {
        tiles[ty][tx] = { ...t, spinePath: true };
      }
    }
  }

  // Apron rows y=104–105 near north-fort walkway mouth (x=186–197).
  for (let ty = 104; ty <= 105; ty++) {
    for (let tx = 186; tx <= 197; tx++) {
      if (ty < 0 || ty >= tiles.length || tx < 0 || tx >= tiles[0].length) continue;
      const t = tiles[ty][tx];
      if (!t || t.transition || t.interactable) continue;
      if (t.type === 'grass' || t.type === 'dirt') {
        tiles[ty][tx] = { ...t, walkable: true };
      } else if (scatterTypes.has(t.type)) {
        tiles[ty][tx] = createTile('grass', true, { elevation: t.elevation ?? 0 });
      }
    }
  }

  // East-west grass path crossing at world ~(89–90, 25–33) / tile x=239–240, y=175–183.
  // The ranger plateau (el=1) begins at x=240; the open forest floor (el=0) ends at x=239.
  // Both columns are walkable grass but lack spinePath, blocking horizontal movement.
  for (let ty = 175; ty <= 183; ty++) {
    for (const tx of [239, 240]) {
      if (ty < 0 || ty >= tiles.length || tx < 0 || tx >= tiles[0].length) continue;
      const t = tiles[ty][tx];
      if (!t || t.transition || t.interactable) continue;
      if ((t.type === 'grass' || t.type === 'dirt') && t.walkable) {
        tiles[ty][tx] = { ...t, spinePath: true };
      }
    }
  }

  // East-west grass path beside ranger cottage at world ~(79–80, 72–80) / tile x=229–230, y=222–230.
  // Same el=0↔el=1 seam as the plateau boundary west of the inn (x=236, y=227); no spinePath yet.
  for (let ty = 222; ty <= 230; ty++) {
    for (const tx of [229, 230]) {
      if (ty < 0 || ty >= tiles.length || tx < 0 || tx >= tiles[0].length) continue;
      const t = tiles[ty][tx];
      if (!t || t.transition || t.interactable) continue;
      if ((t.type === 'grass' || t.type === 'dirt') && t.walkable) {
        tiles[ty][tx] = { ...t, spinePath: true };
      }
    }
  }
}

// South step-off beside the hollow-approach ladder gate (world ~-31,-42 / tile x=119, y=106).
function enforceHollowApproachLadderSouthExit(tiles: Tile[][], def: MapDefinition) {
  if (def.name !== 'Whispering Woods') return;
  for (let ty = 106; ty <= 106; ty++) {
    for (let tx = 119; tx <= 119; tx++) {
      if (ty < 0 || ty >= tiles.length || tx < 0 || tx >= tiles[0].length) continue;
      const t = tiles[ty][tx];
      if (!t || t.transition || t.interactable) continue;
      if (t.type === 'grass' && !t.walkable) {
        tiles[ty][tx] = { ...t, walkable: true, enemyBlocked: true };
      } else if (t.type === 'grass' && t.walkable) {
        tiles[ty][tx] = { ...t, enemyBlocked: true };
      }
    }
  }
}

// Force-stamps cliff tiles onto the highland passage canyon walls after all other passes.
// Something in the pipeline (carveRoads, scatter cleanup, or an enforce function) clears
// the placeCliffFace tiles at x=240-242 (west wall) and x=247-250 (east wall), y=80-95.
// This runs last and re-asserts the canyon walls unconditionally.
function enforceHighlandPassageCanyonWalls(tiles: Tile[][], def: MapDefinition) {
  if (def.name !== 'Whispering Woods') return;
  const westCols = [240, 241, 242];
  const eastCols = [247, 248, 249, 250];
  const wallCols = [...westCols, ...eastCols];
  // Canyon entrance walls only span y=80-85 (world ~-70 to -65); the corridor opens
  // below y=86 so the barrier at y=96 is the only blocker south of the entrance.
  for (let ty = 80; ty <= 85; ty++) {
    for (const tx of wallCols) {
      if (ty < 0 || ty >= tiles.length || tx < 0 || tx >= tiles[0].length) continue;
      const t = tiles[ty][tx];
      if (t.transition || t.interactable) continue;
      const tileType: TileType = (ty - 80) < 2 ? 'cliff_edge' : 'cliff';
      tiles[ty][tx] = createTile(tileType, false, { elevation: t.elevation ?? 0 });
    }
  }
  // South seal: x=242-247, y=96-105 (world ~92-97, -54 to -45). Fills the barrier passage
  // gap and extends the cliff band below the barrier height so the corridor is fully enclosed.
  const sealCols = [242, 243, 244, 245, 246, 247];
  for (let ty = 96; ty <= 105; ty++) {
    for (const tx of sealCols) {
      if (ty < 0 || ty >= tiles.length || tx < 0 || tx >= tiles[0].length) continue;
      const t = tiles[ty][tx];
      if (t.transition || t.interactable) continue;
      const tileType: TileType = (ty - 96) < 2 ? 'cliff_edge' : 'cliff';
      tiles[ty][tx] = createTile(tileType, false, { elevation: t.elevation ?? 0 });
    }
  }
}

// Clears tree/scatter types from the narrow highland passage (x=243-246, y=87-106,
// world ~93-96, worldY ~-46 to -63). The dirt path at y=79-86 handles stampCliffs bypass;
// this function handles the cave/corridor section south of that without leaving a dirt spine.
function enforceHighlandPassageCorridor(tiles: Tile[][], def: MapDefinition) {
  if (def.name !== 'Whispering Woods') return;
  const scatterTypes: Set<string> = new Set([
    'tree',
    'dead_tree',
    'fallen_log',
    'fallen_log_v',
    'stump',
    'tall_grass',
    'mushroom',
    'rock',
    'bones',
  ]);
  for (let ty = 87; ty <= 106; ty++) {
    for (let tx = 243; tx <= 246; tx++) {
      if (ty < 0 || ty >= tiles.length || tx < 0 || tx >= tiles[0].length) continue;
      const t = tiles[ty][tx];
      if (!t || t.transition || t.interactable) continue;
      if (scatterTypes.has(t.type)) {
        tiles[ty][tx] = createTile('grass', true, { elevation: t.elevation ?? 0 });
      }
    }
  }
}

// North landing in the hollow-approach ladder column (world ~-31,-37 / tile x=119, y=112).
function enforceHollowApproachLadderLanding(tiles: Tile[][], def: MapDefinition) {
  if (def.name !== 'Whispering Woods') return;
  for (let ty = 112; ty <= 113; ty++) {
    for (let tx = 119; tx <= 120; tx++) {
      if (ty < 0 || ty >= tiles.length || tx < 0 || tx >= tiles[0].length) continue;
      const t = tiles[ty][tx];
      if (!t || t.transition || t.interactable) continue;
      const blockEnemies = tx === 119 && ty === 112;
      if (t.type === 'grass' && !t.walkable) {
        tiles[ty][tx] = {
          ...t,
          walkable: true,
          ...(blockEnemies ? { enemyBlocked: true } : {}),
        };
      } else if (t.type === 'grass' && t.walkable && blockEnemies) {
        tiles[ty][tx] = { ...t, enemyBlocked: true };
      }
    }
  }
}

// Clears procedural dead_tree scatter around the east hollow route gate (world ~89,-92 /
// tile y=57) and a tight pocket by the lever (~86,-95). World Y grows more negative south;
// keep the north (ty>=58) open, only strip trees near the lever on the south side.
function scrubWhisperingWoodsEastHollowRouteGateScatter(tiles: Tile[][], def: MapDefinition) {
  if (def.name !== 'Whispering Woods') return;

  const clearDeadTree = (tx: number, ty: number) => {
    if (ty < 0 || ty >= tiles.length || tx < 0 || tx >= tiles[0].length) return;
    const t = tiles[ty][tx];
    if (!t || t.transition || t.interactable) return;
    if (t.type !== 'dead_tree') return;
    tiles[ty][tx] = createTile('hollow_blight', true, { elevation: t.elevation ?? 1 });
  };

  // North of the gate row (less negative world Y): keep the full approach readable.
  for (let ty = 58; ty <= 60; ty++) {
    for (let tx = 222; tx <= 254; tx++) {
      clearDeadTree(tx, ty);
    }
  }

  // Gate row band (runtime gate x=233-246).
  for (let tx = 228; tx <= 251; tx++) {
    clearDeadTree(tx, 57);
  }

  // South / lever side (more negative world Y): small pocket so the switch stays visible.
  for (let ty = 54; ty <= 56; ty++) {
    for (let tx = 232; tx <= 240; tx++) {
      clearDeadTree(tx, ty);
    }
  }
}

// Keeps the north-fort grass walkway mouth open around world (41,-44) / tile (191,106).
// Tree/log scatter can land directly on the choke point after the fort apron is stamped.
function scrubWhisperingWoodsNorthFortWalkwayLog(tiles: Tile[][], def: MapDefinition) {
  if (def.name !== 'Whispering Woods') return;
  const scatterTypes: Set<string> = new Set([
    'fallen_log',
    'fallen_log_v',
    'tree',
    'dead_tree',
    'fallen_tree',
    'stump',
  ]);
  for (let ty = 104; ty <= 111; ty++) {
    for (let tx = 189; tx <= 193; tx++) {
      if (ty < 0 || ty >= tiles.length || tx < 0 || tx >= tiles[0].length) continue;
      const t = tiles[ty][tx];
      if (!t || t.transition || t.interactable) continue;
      if (scatterTypes.has(t.type)) {
        tiles[ty][tx] = createTile('grass', true, { elevation: t.elevation ?? 0 });
      }
    }
  }
}

// Keeps the south-east corridor open around world (57,100) / tile (207,250).
// A generated log plus authored rocks can pinch the route after prop foundations run.
function scrubWhisperingWoodsSouthEastCorridorBlockers(tiles: Tile[][], def: MapDefinition) {
  if (def.name !== 'Whispering Woods') return;
  const blockerTypes: Set<string> = new Set([
    'fallen_log',
    'fallen_log_v',
    'fallen_tree',
    'rock',
    'stump',
  ]);
  for (let ty = 248; ty <= 257; ty++) {
    for (let tx = 202; tx <= 219; tx++) {
      if (ty < 0 || ty >= tiles.length || tx < 0 || tx >= tiles[0].length) continue;
      const t = tiles[ty][tx];
      if (!t || t.transition || t.interactable) continue;
      if (blockerTypes.has(t.type)) {
        tiles[ty][tx] = createTile('grass', true, { elevation: t.elevation ?? 0 });
      }
    }
  }

  // South-east bluff stair exit apron (world ~63,106): stampCliffs marks the row south of the
  // stair band (y=256, x=209–216) non-walkable. Reopen so players can step off the stairs.
  for (let tx = 209; tx <= 216; tx++) {
    if (256 < 0 || 256 >= tiles.length || tx < 0 || tx >= tiles[0].length) continue;
    const t = tiles[256][tx];
    if (!t || t.transition || t.interactable) continue;
    if (t.type === 'grass' || t.type === 'dirt') {
      tiles[256][tx] = { ...t, walkable: true };
    } else if (blockerTypes.has(t.type)) {
      tiles[256][tx] = createTile('grass', true, { elevation: t.elevation ?? 0 });
    }
  }
}

function enforceWhisperingWoodsEastDirtSpineBreak(tiles: Tile[][], def: MapDefinition) {
  if (def.name !== 'Whispering Woods') return;
  for (let ty = 118; ty <= 126; ty++) {
    for (let tx = 231; tx <= 232; tx++) {
      if (ty < 0 || ty >= tiles.length || tx < 0 || tx >= tiles[0].length) continue;
      const tile = tiles[ty][tx];
      if (!tile || tile.transition || tile.interactable) continue;
      tiles[ty][tx] = createTile('dirt', true, { elevation: tile.elevation ?? 0, spinePath: true });
    }
  }
}

/** Hunter cliff-1 east face - seal y=196–199 (world y=46–49) at x=106–121; cliff body not cliff_edge. */
function enforceWhisperingWoodsHunterShelfEastLip(tiles: Tile[][], def: MapDefinition) {
  if (def.name !== 'Whispering Woods') return;
  for (let ty = 196; ty <= 199; ty++) {
    for (let tx = 106; tx <= 121; tx++) {
      if (ty < 0 || ty >= tiles.length || tx < 0 || tx >= tiles[0].length) continue;
      const tile = tiles[ty][tx];
      if (!tile || tile.transition || tile.interactable) continue;
      tiles[ty][tx] = createTile('cliff', false, { elevation: tile.elevation ?? 0 });
    }
  }
}

/** Church-side deadfall - hard-seal the west/east squeeze route under the authored log pile. */
function enforceWhisperingWoodsChurchSideDeadfall(tiles: Tile[][], def: MapDefinition) {
  if (def.name !== 'Whispering Woods') return;
  const visibleDeadfall = new Map<string, TileType>([
    ['182,122', 'rock'],
    ['183,122', 'stump_c'],
    ['182,123', 'stump_b'],
    ['183,123', 'fallen_log_v'],
    ['182,124', 'fallen_log_v_b'],
    ['183,124', 'fallen_log_v'],
    ['182,125', 'fallen_log_v_b'],
    ['183,125', 'fallen_log_v'],
    ['182,126', 'fallen_log_v_b'],
    ['183,126', 'fallen_log_v'],
    ['182,127', 'fallen_log_v_b'],
    ['183,127', 'fallen_log_v'],
    ['182,128', 'stump_b'],
    ['183,128', 'fallen_log_v'],
    ['182,129', 'fallen_log_v_b'],
    ['183,129', 'fallen_log_v'],
  ]);

  for (let ty = 122; ty <= 129; ty++) {
    for (let tx = 180; tx <= 184; tx++) {
      if (ty < 0 || ty >= tiles.length || tx < 0 || tx >= tiles[0].length) continue;
      const tile = tiles[ty][tx];
      if (!tile || tile.transition || tile.interactable) continue;
      const blockingEdge = tx >= 182 && tx <= 183;
      tiles[ty][tx] = createTile(visibleDeadfall.get(`${tx},${ty}`) ?? 'grass', !blockingEdge, {
        elevation: tile.elevation ?? 0,
      });
    }
  }

  // Reassert the committed forest church layout after late scrub passes. Only the
  // exterior shell is blocked; interior pews/statues/floor stay intact.
  const churchX = 180;
  const churchY = 130;
  const churchW = 12;
  const churchH = 16;
  const aisleCenter = Math.floor(churchW / 2);
  const isAisle = (dx: number) => dx >= aisleCenter - 1 && dx <= aisleCenter;
  for (let dy = 0; dy < churchH; dy++) {
    for (let dx = 0; dx < churchW; dx++) {
      const tx = churchX + dx;
      const ty = churchY + dy;
      if (ty < 0 || ty >= tiles.length || tx < 0 || tx >= tiles[0].length) continue;
      const tile = tiles[ty][tx];
      if (!tile || tile.transition || tile.interactable) continue;

      if (dx === 0 || dx === churchW - 1 || dy === 0 || dy === churchH - 1) {
        const isGate = isAisle(dx) && (dy === 0 || dy === churchH - 1);
        tiles[ty][tx] = createTile(isGate ? 'dirt' : 'mossy_stone', isGate, { elevation: tile.elevation ?? 0 });
      } else if ((dx === 2 || dx === churchW - 3) && dy % 3 === 1) {
        tiles[ty][tx] = createTile('statue', false, { elevation: tile.elevation ?? 0 });
      } else if (dy >= 3 && dy <= churchH - 3 && dx >= 3 && dx <= churchW - 4) {
        const isPew = dy % 2 === 0 && !isAisle(dx);
        tiles[ty][tx] = createTile(isPew ? 'wooden_path' : 'cobblestone', !isPew, { elevation: tile.elevation ?? 0 });
      } else {
        tiles[ty][tx] = createTile('cobblestone', true, { elevation: tile.elevation ?? 0 });
      }
    }
  }
}

/** Auto-mark spinePath on walkable grass/dirt tiles bordering a ±1 elevation neighbour of the same type. */
function enforceWalkableElevationSeamCrossings(tiles: Tile[][], def: MapDefinition) {
  if (def.name !== 'Whispering Woods') return;
  const seamTypes: Set<string> = new Set(['grass', 'dirt', 'sand']);
  const isSeamTile = (t: Tile | undefined) =>
    !!t && t.walkable && seamTypes.has(t.type) && !t.transition && !t.interactable;

  for (let ty = 0; ty < tiles.length; ty++) {
    for (let tx = 0; tx < tiles[0].length; tx++) {
      const t = tiles[ty][tx];
      if (!isSeamTile(t)) continue;
      const el = t.elevation ?? 0;
      const cardinals: [number, number][] = [[tx - 1, ty], [tx + 1, ty], [tx, ty - 1], [tx, ty + 1]];
      for (const [nx, ny] of cardinals) {
        if (ny < 0 || ny >= tiles.length || nx < 0 || nx >= tiles[0].length) continue;
        const n = tiles[ny][nx];
        if (!isSeamTile(n)) continue;
        if (Math.abs(el - (n.elevation ?? 0)) !== 1) continue;
        tiles[ty][tx] = { ...tiles[ty][tx], spinePath: true };
        tiles[ny][nx] = { ...n, spinePath: true };
      }
    }
  }
}

function applyAuthoredSpinePathFlags(tiles: Tile[][], def: MapDefinition) {
  const markSpineCell = (tx: number, ty: number) => {
    if (ty < 0 || ty >= tiles.length || tx < 0 || tx >= tiles[0].length) return;
    const tile = tiles[ty][tx];
    if (!tile?.walkable || tile.interactable || tile.transition) return;
    if (tile.type !== 'dirt' && tile.type !== 'grass') return;
    tiles[ty][tx] = { ...tile, spinePath: true };
  };

  for (const feature of def.features ?? []) {
    if (feature.type !== 'path') continue;
    if (feature.fill && feature.fill !== 'dirt') continue;
    for (let dy = 0; dy < feature.height; dy++) {
      for (let dx = 0; dx < feature.width; dx++) {
        const tx = feature.x + dx;
        const ty = feature.y + dy;
        markSpineCell(tx, ty);
        // Grass aprons north + south of path rows - elevation seam filler on either side of spines.
        markSpineCell(tx, ty - 1);
        markSpineCell(tx, ty + 1);
      }
    }
  }
}

/**
 * After all placement and scrub functions have run, distribute live 'tree' and
 * 'tall_grass' tiles across their kit variants using a deterministic position hash.
 * The same map always produces the same distribution; no runtime RNG required.
 * Only the Whispering Woods forest map runs this pass.
 */
function randomizeForestTreeVariants(tiles: Tile[][], def: MapDefinition): void {
  if (def.name !== 'Whispering Woods') return;
  for (let ty = 0; ty < tiles.length; ty++) {
    const row = tiles[ty];
    if (!row) continue;
    for (let tx = 0; tx < row.length; tx++) {
      const tile = row[tx];
      if (!tile) continue;
      // Deterministic hash - same coordinates always yield the same variant.
      const hash = (((tx * 2654435761) ^ (ty * 2246822519)) >>> 0) % 3;
      if (tile.type === 'tree') {
        if (hash === 1) row[tx] = { ...tile, type: 'tree_b' };
        else if (hash === 2) row[tx] = { ...tile, type: 'tree_c' };
      } else if (tile.type === 'tall_grass') {
        if (hash === 1) row[tx] = { ...tile, type: 'tall_grass_b' };
        else if (hash === 2) row[tx] = { ...tile, type: 'tall_grass_c' };
      }
    }
  }
}

export function generateMap(def: MapDefinition, mapKey?: string): WorldMap {
  const tiles = generateBaseTerrain(def);
  const isHandCraftedInterior = def.autoRoads === false && def.width <= 24 && def.height <= 24;

  // Place features first (buildings, lakes, etc)
  placeFeatures(tiles, def);

  // Carve roads between key points unless the map opts into fully authored routing
  if (def.autoRoads !== false) {
    carveRoads(tiles, def);
  }

  // Place specific objects
  placePortals(tiles, def);
  placeChests(tiles, def);
  placeProps(tiles, def);
  placeInteractables(tiles, def);
  placeSecretAreas(tiles, def);

  // Clean up illogical placements (flowers in water, etc.)
  if (!isHandCraftedInterior) {
    cleanupIllogicalPlacements(tiles, def);
    scrubWhisperingWoodsPortalSandSeam(tiles, def);
  }

  // Ensure spawn point is walkable (skip for hand-crafted interior maps)
  if (def.autoRoads !== false) {
    const sp = def.spawnPoint;
    for (let dy = -2; dy <= 2; dy++) {
      for (let dx = -2; dx <= 2; dx++) {
        const tx = sp.x + dx;
        const ty = sp.y + dy;
        if (ty >= 0 && ty < tiles.length && tx >= 0 && tx < tiles[0].length) {
          if (!tiles[ty][tx].walkable && tiles[ty][tx].type !== 'portal') {
            tiles[ty][tx] = createTile('grass', true);
          }
        }
      }
    }
  }

  applyElevationZones(tiles, def);
  normalizeWhisperingWoodsSoutheastCreekWaterElevation(tiles, def);
  normalizeWhisperingWoodsFarHollowRiverWaterElevation(tiles, def);
  stampCliffs(tiles, def);
  // Second decoration cleanup: catches non-interactable decor that ended up adjacent
  // to cliffs after stampCliffs ran (pre-cliff cleanup couldn't see those yet).
  scrubDecorationsAdjacentToCliffs(tiles);
  placeStairways(tiles, def);
  placeLadders(tiles, def);
  enforceGreenleafUpperRidgeDetour(tiles, def);
  // Final pass: keep interior cottage approaches traversable even after elevation/cliff stamping.
  enforceInteriorCottageAprons(tiles, def);
  enforceForestRockyHillShelf(tiles, def);
  enforceWhisperingWoodsOverlookChain(tiles, def);
  enforceHollowWestCorruptedStairShelf(tiles, def);
  applyDeepHollowBleachedGround(tiles, def);
  applyHollowBoundaryBlend(tiles, def);
  applyHollowCliffCorruption(tiles, def);
  applyWhisperingWoodsHollowApproachCorruptedWater(tiles, def);
  // Apply large-prop collision/foundation masks last so cleanup/elevation passes cannot reopen them.
  applyPropFoundations(tiles, def);
  scrubWhisperingWoodsNorthFortFrontTree(tiles, def);
  scrubWhisperingWoodsNorthFortWalkwayLog(tiles, def);
  scrubWhisperingWoodsSouthEastCorridorBlockers(tiles, def);
  scrubWhisperingWoodsEastHollowRouteGateScatter(tiles, def);
  enforceWhisperingWoodsEastDirtSpineBreak(tiles, def);
  scrubWhisperingWoodsNorthFortElevationSeam(tiles, def);
  enforceWesternBypassObservatoryApproach(tiles, def);
  enforceNorthFortApproachObservatory(tiles, def);
  enforceWhisperingWoodsCliffLedgeLookoutApproach(tiles, def);
  enforceLakeOverlookBridgeLanding(tiles, def);
  enforceRiversideBridgeSpineApproach(tiles, def);
  enforceCliffCorridorTraditionalApproach(tiles, def);
  enforceEastRidgeAscent(tiles, def);
  enforceFortRidgeLadderGate(tiles, def);
  scrubFortRidgeLadderScatter(tiles, def);
  enforceHollowApproachOverlookShelf(tiles, def);
  enforceHollowApproachSpineCorridor(tiles, def);
  enforceNorthFortRidgeCorridor(tiles, def);
  enforceHollowApproachLadderLanding(tiles, def);
  enforceHollowApproachLadderSouthExit(tiles, def);
  enforceHighlandPassageCanyonWalls(tiles, def);
  enforceHighlandPassageCorridor(tiles, def);
  applyAuthoredSpinePathFlags(tiles, def);
  enforceWalkableElevationSeamCrossings(tiles, def);
  enforceGreenleafNorthRidgeCliffWall(tiles, def);
  enforceGreenleafDirtSpineWalkway(tiles, def);
  enforceGreenleafNorthEastVerticalCliff(tiles, def);
  enforceGreenleafEastRidgeStairConnector(tiles, def);
  enforceGreenleafEastMarketWestSeam(tiles, def);
  scrubWhisperingWoodsWestHollowSpineSeamArt(tiles, def);
  enforceWhisperingWoodsDeepHollowBonfireApron(tiles, def);

  restampAuthoredRitualGlyphs(tiles, def);
  // Re-assert authored tall-grass gates last: tall_grass is a LAND_DECORATION + POST_CLIFF_DECOR,
  // so the cleanup/cliff scrub passes eat clearing-fill grass near cliffs (e.g. the western-fort
  // corridor's cliff at y=-26). This restores the full field over any walkable ground.
  enforceWhisperingWoodsTallGrassGates(tiles, def);
  scrubWhisperingWoodsOpenLaneTallGrass(tiles, def);
  scrubWhisperingWoodsPrecipiceReserveLiveTrees(tiles, def);
  scrubWhisperingWoodsPrecipiceWestPocketLiveTrees(tiles, def);
  scrubWhisperingWoodsQuarryBankShortcutLiveTrees(tiles, def);
  enforceWhisperingWoodsEastCreekShoreGate(tiles, def);
  scrubWhisperingWoodsSouthEntryPicketGateTrees(tiles, def);
  applyWhisperingWoodsHighlanderPlainsBiome(tiles, def);
  enforceWhisperingWoodsPlainsShelfLipElevation(tiles, def);
  scrubWhisperingWoodsPlainsCliffBufferBoxes(tiles, def);
  sealWhisperingWoodsPlainsNorthRimGap(tiles, def);
  enforceWhisperingWoodsPlainsWestSlope(tiles, def);
  scrubWhisperingWoodsPrecipiceWestRitualDeadTrees(tiles, def);
  enforceWhisperingWoodsPrecipiceReserveWestLip(tiles, def);
  enforceWhisperingWoodsPrecipiceReserveCliffBites(tiles, def);
  scrubWhisperingWoodsPrecipiceReserveSouthSeam(tiles, def);
  scrubWhisperingWoodsPrecipiceAltarDeadTrees(tiles, def);
  enforceWhisperingWoodsPrecipiceSpineCliffCover(tiles, def);
  enforceWhisperingWoodsHunterShelfEastLip(tiles, def);
  enforceWhisperingWoodsChurchSideDeadfall(tiles, def);

  // Last visual pass: distribute live tree tiles across kit variants for visual variety.
  // Runs after ALL placement, scrub, and enforcement functions so only tiles that survived
  // the full pipeline receive variants - zero risk to existing walkability or collision logic.
  randomizeForestTreeVariants(tiles, def);

  validateMapTransitions(tiles, def);
  validateAuthoredPlacements(tiles, def);

  if (mapKey) {
    enforceBonfireSanctuaryTiles(tiles, mapKey);
  }

  return {
    name: def.name,
    subtitle: def.subtitle,
    width: def.width,
    height: def.height,
    tiles,
    spawnPoint: def.spawnPoint,
    coastalSouthBackdrop: hasCoastalSouthBorder(def),
    coastalBorderAllSides: hasCoastalAllSides(def),
    mapKey,
  };
}
