import { WorldMap, Tile, TileType } from '@/lib/game/World';

// Simple seeded random for deterministic maps
function seededRandom(seed: number) {
  let s = seed;
  return () => {
    s = (s * 16807 + 0) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

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
  const fx = sx - x0;
  const fy = sy - y0;

  const v00 = noise2D(x0, y0, seed);
  const v10 = noise2D(x0 + 1, y0, seed);
  const v01 = noise2D(x0, y0 + 1, seed);
  const v11 = noise2D(x0 + 1, y0 + 1, seed);

  const i0 = v00 * (1 - fx) + v10 * fx;
  const i1 = v01 * (1 - fx) + v11 * fx;
  return i0 * (1 - fy) + i1 * fy;
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
  /** Default `ns`: stride climbs along map ±Y (north/south). `ew`: rotate stair sprite 90° for ±X approaches. */
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
  type: 'building' | 'inn_building' | 'lake' | 'clearing' | 'path' | 'wall' | 'ruins' | 'camp' | 'garden' | 'graveyard' | 'bridge' | 'secret_cave' | 'destroyed_town' | 'temple' | 'waterfall' | 'volcano' | 'boss_arena' | 'abandoned_camp' | 'cemetery' | 'cliff_face' | 'farm' | 'iron_fence_border' | 'hedge_maze' | 'cobble_plaza' | 'forest_grove' | 'fort' | 'enchanted_grove' | 'church' | 'ruined_fort' | 'cottage' | 'watchtower' | 'broken_wagon' | 'market_stall_row';
  tiles?: Partial<Record<string, Tile>>; // specific tile overrides by "dx,dy"
  fill?: TileType;
  border?: TileType;
  interactionId?: string;
  /** Door becomes a portal into this map (inn_building / optional cottage) */
  interiorMap?: string;
  interiorSpawnX?: number;
  interiorSpawnY?: number;
}

export interface MapDefinition {
  name: string;
  subtitle?: string;
  width: number;
  height: number;
  spawnPoint: { x: number; y: number };
  seed: number;
  baseTerrain: 'grassland' | 'forest' | 'swamp' | 'ruins' | 'dungeon';
  borderTile: TileType;
  autoRoads?: boolean;
  /** When false, south map edge uses normal borderTile (e.g. inn rooms). Default: large overworld maps use sea cliff + ocean on the south edge. */
  coastalSouthBorder?: boolean;
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
  /** Static props (no interaction) — furniture, décor */
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
  }>;
}

/** Number of tile rows reserved for the south coastal cliff + ocean. Must match stampCliffs protection. */
const COASTAL_SOUTH_ROWS = 6; // 1 cliff_edge cap + 3 cliff body + 2 water rows

/** Tall cliff sprites overlap into rows just south of cliff tiles; keep them unwalkable for collision/feel. */
const CLIFF_SPRITE_BUFFER_ROWS = 2;

function useCoastalSouthBorder(def: MapDefinition): boolean {
  if (def.coastalSouthBorder === false) return false;
  return def.width >= 48 && def.height >= 48;
}

const STRUCTURE_FEATURE_TYPES: Set<MapFeature['type']> = new Set([
  'building', 'inn_building', 'cottage', 'watchtower', 'church', 'temple', 'fort', 'ruined_fort', 'farm', 'cemetery'
]);
const STRUCTURE_FEATURE_SPACING = 8;

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
  const rand = seededRandom(def.seed);

  for (let y = 0; y < def.height; y++) {
    const row: Tile[] = [];
    for (let x = 0; x < def.width; x++) {
      const borderSize = 2;
      // South edge (low y = screen bottom): dramatic sea cliff + ocean, full width on large maps.
      // Layout from south: y=0,1 = deep water; y=2..COASTAL_SOUTH_ROWS-2 = cliff body; y=COASTAL_SOUTH_ROWS-1 = cliff_edge cap.
      if (useCoastalSouthBorder(def) && y < COASTAL_SOUTH_ROWS) {
        if (y <= 1) {
          row.push(createTile('water', false));
        } else if (y === COASTAL_SOUTH_ROWS - 1) {
          row.push(createTile('cliff_edge', false));
        } else {
          row.push(createTile('cliff', false));
        }
        continue;
      }
      if (x < borderSize || x >= def.width - borderSize || y < borderSize || y >= def.height - borderSize) {
        row.push(createTile(def.borderTile, false));
        continue;
      }

      const n1 = smoothNoise(x, y, def.seed, 12);
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
          } else {
            tile = createTile('grass', true);
          }
          break;

        case 'forest': {
          const inHollow = y < 75;
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
          } else if (n1 < 0.15) {
            tile = createTile('tall_grass', true);
          } else {
            tile = createTile(inHollow ? 'dark_grass' : 'grass', true);
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
  // Carve paths between portals and spawn, and between features
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
    'cottage_house', 'cottage_house_entry', 'cottage_house_forest', 'cottage_house_forest_ruined',
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
          // be overwritten — roads should go around them, not through them.
          const isCarveableBlocker = !existing.walkable && PATH_BLOCKERS.has(existing.type);
          if (
            existing.type !== 'portal' &&
            existing.type !== 'chest' &&
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
        placeBuilding(tiles, feature, false);
        break;
      case 'inn_building':
        if (feature.interactionId === 'ranger_cabin') {
          placeCottage(tiles, feature);
        } else {
          placeBuilding(tiles, feature, true);
        }
        break;
      case 'broken_wagon':
        placeBrokenWagon(tiles, feature);
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
        placeWall(tiles, feature);
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
        placeCobblePlaza(tiles, feature);
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
const HOUSE_TYPES: Set<TileType> = new Set([
  'house', 'house_entry',
  'house_blue', 'house_blue_entry',
  'house_green', 'house_green_entry',
  'house_thatch', 'house_thatch_entry',
  'cottage_house', 'cottage_house_entry', 'cottage_house_forest', 'cottage_house_forest_ruined',
]);
// All tile types that indicate a structure is present (for spacing checks)
const STRUCTURE_TYPES: Set<TileType> = new Set([
  'house', 'house_entry',
  'house_blue', 'house_blue_entry',
  'house_green', 'house_green_entry',
  'house_thatch', 'house_thatch_entry',
  'cottage_house', 'cottage_house_entry', 'cottage_house_forest', 'cottage_house_forest_ruined',
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
  const BAD_TERRAIN: Set<TileType> = new Set(['water', 'lava', 'swamp', 'ice', 'waterfall']);
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

function placeBuilding(tiles: Tile[][], f: MapFeature, interiorPortal: boolean) {
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
  
  // First, clear a yard around the building (3-tile border of grass)
  const yardPad = 4;
  for (let dy = -yardPad; dy < f.height + yardPad; dy++) {
    for (let dx = -yardPad; dx < f.width + yardPad; dx++) {
      const tx = f.x + dx;
      const ty = f.y + dy;
      if (ty >= 0 && ty < tiles.length && tx >= 0 && tx < tiles[0].length) {
        const existing = tiles[ty][tx];
        if (HOUSE_TYPES.has(existing.type) || existing.type === 'portal' || 
            existing.type === 'chest' || existing.interactable) continue;
        if (!existing.walkable || existing.type === 'water' || existing.type === 'tree' || 
            existing.type === 'rock' || existing.type === 'swamp') {
          tiles[ty][tx] = createTile('grass', true);
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
          tiles[ty][tx] = createTile('lantern', false);
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

  // One centered house sprite per building — each sprite is scale 2.2 so it visually
  // spans the full facade. Multiple side-by-side sprites produce a "stacked houses" look.
  const houseWidth = 1;
  const houseStartX = Math.floor(f.width / 2);
  const facadeRow = 0;
  // The "body" rows are 0..bodyRows-1 (solid stone wall, no entry).
  // The "apron" rows are bodyRows..height-1 (walkable stone floor in front of building).
  const bodyRows = Math.max(2, Math.ceil(f.height * 0.5));

  for (let dy = 0; dy < f.height; dy++) {
    for (let dx = 0; dx < f.width; dx++) {
      const tx = f.x + dx;
      const ty = f.y + dy;
      if (ty >= 0 && ty < tiles.length && tx >= 0 && tx < tiles[0].length) {
        if (dx === Math.floor(f.width / 2) && dy === f.height - 1) {
          // Door / portal — always on the bottom-centre tile
          if (interiorPortal && f.interiorMap && f.interiorSpawnX !== undefined && f.interiorSpawnY !== undefined) {
            // Standard shop/house facades still need a visible entrance tile.
            // Cottage-style interiors use a separate path in placeCottage().
            tiles[ty][tx] = createTile('door', true, {
              transition: { targetMap: f.interiorMap, targetX: f.interiorSpawnX, targetY: f.interiorSpawnY },
              interactable: true,
              interactionId: 'building_entrance',
            });
          } else {
            tiles[ty][tx] = createTile('dirt', true, { interactable: true, interactionId: f.interactionId });
          }
        } else if (dy === facadeRow && dx >= houseStartX && dx < houseStartX + houseWidth) {
          // Standard exteriors use a small roofline sprite at the top row.
          // Interior shop entrances use a larger facade variant anchored near the threshold,
          // so the overworld building reads as one coherent asset around the visible door.
          tiles[ty][tx] = createTile(variant, false);
        } else if (dy < bodyRows) {
          // Solid wooden wall — warm brown rather than cold grey stone
          tiles[ty][tx] = createTile('wood', false);
        } else if (dy === f.height - 1 && (dx === Math.floor(f.width / 2) - 1 || dx === Math.floor(f.width / 2) + 1) && f.width >= 4) {
          // Lantern gate posts flanking the door — visually mark the entrance
          tiles[ty][tx] = createTile('lantern', false);
        } else {
          // Dirt path apron — earthy and walkable so players can approach freely
          tiles[ty][tx] = createTile('dirt', true);
        }
      }
    }
  }

  // Place a dirt path leading from the door
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

function placeBrokenWagon(tiles: Tile[][], f: MapFeature) {
  for (let dy = 0; dy < f.height; dy++) {
    for (let dx = 0; dx < f.width; dx++) {
      const tx = f.x + dx;
      const ty = f.y + dy;
      if (ty >= 0 && ty < tiles.length && tx >= 0 && tx < tiles[0].length) {
        tiles[ty][tx] = createTile('dirt', true);
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

function placeLake(tiles: Tile[][], f: MapFeature) {
  const cx = f.x + f.width / 2;
  const cy = f.y + f.height / 2;
  const rx = f.width / 2;
  const ry = f.height / 2;

  for (let dy = -Math.ceil(ry) - 1; dy <= Math.ceil(ry) + 1; dy++) {
    for (let dx = -Math.ceil(rx) - 1; dx <= Math.ceil(rx) + 1; dx++) {
      const tx = Math.floor(cx + dx);
      const ty = Math.floor(cy + dy);
      if (ty >= 0 && ty < tiles.length && tx >= 0 && tx < tiles[0].length) {
        const dist = (dx * dx) / (rx * rx) + (dy * dy) / (ry * ry);
        if (dist < 0.8) {
          tiles[ty][tx] = createTile('water', false);
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

function placeWall(tiles: Tile[][], f: MapFeature) {
  for (let dy = 0; dy < f.height; dy++) {
    for (let dx = 0; dx < f.width; dx++) {
      const tx = f.x + dx;
      const ty = f.y + dy;
      if (ty < tiles.length && tx < tiles[0].length && ty >= 0 && tx >= 0) {
        tiles[ty][tx] = createTile(f.fill || 'stone', false);
      }
    }
  }
}

function placeRuinsFeature(tiles: Tile[][], f: MapFeature) {
  const halfW = Math.floor(f.width / 2);
  const halfH = Math.floor(f.height / 2);

  for (let dy = 0; dy < f.height; dy++) {
    for (let dx = 0; dx < f.width; dx++) {
      const tx = f.x + dx;
      const ty = f.y + dy;
      if (ty < 0 || ty >= tiles.length || tx < 0 || tx >= tiles[0].length) continue;

      const isNSWall = dy === 0 || dy === f.height - 1;
      const isEWWall = dx === 0 || dx === f.width - 1;
      const isCorner = isNSWall && isEWWall;
      const isWall = isNSWall || isEWWall;

      if (isWall) {
        // Two-tile-wide entrance gap at the midpoint of each side (never at corners)
        const isNSGap = isNSWall && !isCorner && (dx === halfW || dx === halfW - 1);
        const isEWGap = isEWWall && !isCorner && (dy === halfH || dy === halfH - 1);

        if (isNSGap || isEWGap) {
          // Entrance floor matches interior — the brown continues through the wall opening
          // so the gap is immediately readable as "you can walk through here"
          tiles[ty][tx] = createTile('ruins_floor', true);
        } else {
          // Scatter mossy_stone patches — ages/weathers the wall visually
          const isMossy = (dx * 7 + dy * 3) % 5 === 0;
          tiles[ty][tx] = createTile(isMossy ? 'mossy_stone' : 'stone', false);
        }
      } else {
        // Interior — ruins_floor reads clearly as ancient flagstone vs the stone walls
        tiles[ty][tx] = createTile('ruins_floor', true);
      }
    }
  }

  // Rock gateposts one tile outside each entrance — flanking pillars that frame the opening
  // and draw the eye toward it from the surrounding terrain.
  const set = (tx: number, ty: number) => {
    if (ty >= 0 && ty < tiles.length && tx >= 0 && tx < tiles[0].length) {
      tiles[ty][tx] = createTile('rock', false);
    }
  };
  // North entrance gateposts (outside north wall)
  set(f.x + halfW - 2, f.y - 1);
  set(f.x + halfW + 1, f.y - 1);
  // South entrance gateposts (outside south wall)
  set(f.x + halfW - 2, f.y + f.height);
  set(f.x + halfW + 1, f.y + f.height);
  // West entrance gateposts (outside west wall)
  set(f.x - 1, f.y + halfH - 2);
  set(f.x - 1, f.y + halfH + 1);
  // East entrance gateposts (outside east wall)
  set(f.x + f.width, f.y + halfH - 2);
  set(f.x + f.width, f.y + halfH + 1);

  // Rubble piles just inside the corners — gives the space a lived-in, collapsed feel
  const rubble: [number, number][] = [
    [f.x + 1, f.y + 1],
    [f.x + f.width - 2, f.y + 1],
    [f.x + 1, f.y + f.height - 2],
    [f.x + f.width - 2, f.y + f.height - 2],
  ];
  for (const [rx, ry] of rubble) {
    if (ry >= 0 && ry < tiles.length && rx >= 0 && rx < tiles[0].length) {
      tiles[ry][rx] = createTile('rock', false);
    }
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
  // Center campfire
  const cx = f.x + Math.floor(f.width / 2);
  const cy = f.y + Math.floor(f.height / 2);
  if (cy < tiles.length && cx < tiles[0].length) {
    tiles[cy][cx] = createTile('campfire', true, { interactable: true, interactionId: f.interactionId || 'campfire' });
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
          tiles[ty][tx] = createTile('tombstone', false, { interactable: true, interactionId: 'tombstone' });
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

// Objects path strips may replace when unwalkable (carve through forest). Other unwalkable tiles
// (house foundations, water) are left alone so collision matches authored structures.
// Fence / gate / iron_fence are always skipped (gates are walkable and would otherwise be paved over).
const PATH_BLOCKERS: Set<TileType> = new Set([
  'tree', 'rock', 'stump', 'dead_tree', 'hedge',
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
        // actual building_entrance tiles (ranger cabin on the y≈168 east-west trail).
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
  for (let dy = 0; dy < f.height; dy++) {
    for (let dx = 0; dx < f.width; dx++) {
      const tx = f.x + dx;
      const ty = f.y + dy;
      if (ty >= 0 && ty < tiles.length && tx >= 0 && tx < tiles[0].length) {
        if ((dx + dy * 3) % 7 === 0) {
          tiles[ty][tx] = createTile('destroyed_house', false);
        } else if ((dx * 2 + dy) % 11 === 0) {
          tiles[ty][tx] = createTile('bones', true);
        } else if ((dx + dy) % 9 === 0) {
          tiles[ty][tx] = createTile('barrel', false);
        } else if ((dx * 3 + dy * 2) % 13 === 0) {
          tiles[ty][tx] = createTile('crate', false);
        } else {
          tiles[ty][tx] = createTile('dirt', true);
        }
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
    tiles[cy][cx] = createTile('campfire', true, { interactable: true, interactionId: f.interactionId || 'boss_summon' });
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
  // Extinguished campfire center
  const ccx = f.x + Math.floor(f.width / 2);
  const ccy = f.y + Math.floor(f.height / 2);
  if (ccy < tiles.length && ccx < tiles[0].length) {
    tiles[ccy][ccx] = createTile('stump', false, { interactable: true, interactionId: f.interactionId || 'abandoned_camp' });
  }
}

function placeCemetery(tiles: Tile[][], f: MapFeature) {
  // Fenced cemetery with orderly tombstones, fallen graves, dead trees and bones.
  const gateX = Math.floor(f.width / 2);
  const gateY = f.height - 1; // high-Y edge = visual top = player approach side

  for (let dy = 0; dy < f.height; dy++) {
    for (let dx = 0; dx < f.width; dx++) {
      const tx = f.x + dx;
      const ty = f.y + dy;
      if (ty < 0 || ty >= tiles.length || tx < 0 || tx >= tiles[0].length) continue;

      // ── Fence / gate border ──────────────────────────────────────────────────
      if (dx === 0 || dx === f.width - 1 || dy === 0 || dy === gateY) {
        // 3-tile-wide gate opening (centre ± 1) so the entrance is never visually blocked.
        const isGateOpening = dy === gateY && Math.abs(dx - gateX) <= 1;
        tiles[ty][tx] = isGateOpening ? createTile('gate', true) : createTile('fence', false);
        continue;
      }

      // ── Base floor ───────────────────────────────────────────────────────────
      tiles[ty][tx] = createTile('dirt', true);

      // ── Central dead tree ────────────────────────────────────────────────────
      if (dx === Math.floor(f.width / 2) && dy === Math.floor(f.height / 2)) {
        tiles[ty][tx] = createTile('dead_tree', false);
        continue;
      }

      // ── Entrance corridor — 2 rows deep, 3 tiles wide: always clear ──────────
      if (dy >= gateY - 2 && Math.abs(dx - gateX) <= 1) continue;

      // ── Tombstones — sparser %4 grid so the plot breathes more ──────────────
      // Deterministic per-cemetery hash gives organic variation without RNG.
      const hash = (dx * 7 + dy * 13 + f.x + f.y * 3) % 100;

      if (dx % 4 === 1 && dy % 4 === 1) {
        // ~30 % of graves are fallen (bones_pile, walkable) — rest are upright.
        if (hash < 30) {
          tiles[ty][tx] = createTile('bones_pile', true);
        } else {
          tiles[ty][tx] = createTile('tombstone', false, { interactable: true, interactionId: 'tombstone' });
        }
      } else if (dx % 4 === 3 && dy % 4 === 3 && hash < 35) {
        // Sparse secondary tombstones at offset positions for an irregular look.
        tiles[ty][tx] = createTile('tombstone', false, { interactable: true, interactionId: 'tombstone' });
      } else if ((dx + dy * 3) % 17 === 0) {
        tiles[ty][tx] = createTile('bones', true);
      }
    }
  }
}

function placeCliffFace(tiles: Tile[][], f: MapFeature) {
  for (let dy = 0; dy < f.height; dy++) {
    for (let dx = 0; dx < f.width; dx++) {
      const tx = f.x + dx;
      const ty = f.y + dy;
      if (ty >= 0 && ty < tiles.length && tx >= 0 && tx < tiles[0].length) {
        // Never overwrite authored entrance tiles, portals, or interactables (e.g. cottage doors
        // whose frontY row happens to fall at the top of a cliff_face feature).
        const existing = tiles[ty][tx];
        if (existing.transition || existing.interactable) continue;
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

function placeCobblePlaza(tiles: Tile[][], f: MapFeature) {
  for (let dy = 0; dy < f.height; dy++) {
    for (let dx = 0; dx < f.width; dx++) {
      const tx = f.x + dx;
      const ty = f.y + dy;
      if (ty >= 0 && ty < tiles.length && tx >= 0 && tx < tiles[0].length) {
        if ((dx + dy) % 12 === 0) {
          tiles[ty][tx] = createTile('lantern', false);
        } else {
          tiles[ty][tx] = createTile('cobblestone', true);
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
        tiles[ty][tx] = createTile('campfire', true, {
          interactable: true,
          interactionId: f.interactionId || 'fort_campfire',
        });
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
            tiles[ty][tx] = createTile('mushroom', true, { interactable: true, interactionId: 'healing_mushroom' });
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
  for (let dy = 0; dy < f.height; dy++) {
    for (let dx = 0; dx < f.width; dx++) {
      const tx = f.x + dx;
      const ty = f.y + dy;
      if (ty >= 0 && ty < tiles.length && tx >= 0 && tx < tiles[0].length) {
        // Stone walls
        if (dx === 0 || dx === f.width - 1 || dy === 0 || dy === f.height - 1) {
          if (dx === Math.floor(f.width / 2) && dy === f.height - 1) {
            tiles[ty][tx] = createTile('gate', true); // entrance
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
        // Altar at front
        else if (dx === Math.floor(f.width / 2) && dy === 1) {
          tiles[ty][tx] = createTile('well', false, { interactable: true, interactionId: f.interactionId || 'church_altar' });
        }
        // Pews (cobblestone rows)
        else if (dy >= 3 && dy <= f.height - 3 && (dx >= 3 && dx <= f.width - 4)) {
          if (dy % 2 === 0) {
            tiles[ty][tx] = createTile('wooden_path', true);
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
  for (let dy = 0; dy < f.height; dy++) {
    for (let dx = 0; dx < f.width; dx++) {
      const tx = f.x + dx;
      const ty = f.y + dy;
      if (ty >= 0 && ty < tiles.length && tx >= 0 && tx < tiles[0].length) {
        // Crumbling outer walls with gaps
        if (dx === 0 || dx === f.width - 1 || dy === 0 || dy === f.height - 1) {
          if (!isHunterGateRuin && (dx + dy) % 3 === 0) {
            tiles[ty][tx] = createTile('stone', true); // collapsed section
          } else {
            tiles[ty][tx] = createTile('mossy_stone', false);
          }
        }
        // Broken corner towers
        else if ((dx <= 2 && dy <= 2) || (dx >= f.width - 3 && dy <= 2) ||
                 (dx <= 2 && dy >= f.height - 3) || (dx >= f.width - 3 && dy >= f.height - 3)) {
          if (isHunterGateRuin || (dx + dy) % 2 === 0) {
            tiles[ty][tx] = createTile('stone', false);
          } else {
            tiles[ty][tx] = createTile('ruins_floor', true);
          }
        }
        // Interior - overgrown with debris
        else if (!isHunterGateRuin && (dx * 3 + dy * 7) % 11 === 0) {
          tiles[ty][tx] = createTile('bones', true);
        } else if (!isHunterGateRuin && (dx + dy * 5) % 13 === 0) {
          tiles[ty][tx] = createTile('destroyed_house', false);
        } else if (!isHunterGateRuin && (dx * 2 + dy) % 9 === 0) {
          tiles[ty][tx] = createTile('tall_grass', true);
        } else {
          tiles[ty][tx] = createTile('ruins_floor', true);
        }
      }
    }
  }
  // Center marker
  const cx = f.x + Math.floor(f.width / 2);
  const cy = f.y + Math.floor(f.height / 2);
  if (cy < tiles.length && cx < tiles[0].length) {
    tiles[cy][cx] = createTile('campfire', true, { interactable: true, interactionId: f.interactionId || 'ruined_fort' });
  }
}

function placeCottage(tiles: Tile[][], f: MapFeature) {
  // witch_cottage is intentionally adjacent to the golem boss arena; hunter_cottage and ranger_cabin
  // share a compound. All three may coexist with nearby structure tiles.
  const allowNearbyStructureCluster = /hunter_cottage|ranger_cabin|witch_cottage/.test(f.interactionId ?? '');
  if (!allowNearbyStructureCluster && isBuildingNearby(tiles, f.x, f.y, f.width, f.height)) return;

  // Clear a yard around the cottage (4-tile border of grass) to prevent blocked doors
  const yardPad = 4;
  for (let dy = -yardPad; dy < f.height + yardPad; dy++) {
    for (let dx = -yardPad; dx < f.width + yardPad; dx++) {
      const tx = f.x + dx;
      const ty = f.y + dy;
      if (ty >= 0 && ty < tiles.length && tx >= 0 && tx < tiles[0].length) {
        const existing = tiles[ty][tx];
        if (HOUSE_TYPES.has(existing.type) || existing.type === 'portal' ||
            existing.type === 'chest' || existing.interactable) continue;
        if (!existing.walkable || existing.type === 'water' || existing.type === 'tree' ||
            existing.type === 'rock' || existing.type === 'swamp') {
          tiles[ty][tx] = createTile('grass', true);
        }
      }
    }
  }

  const cx = Math.floor(f.width / 2);
  const hasInterior = !!(f.interiorMap && f.interiorSpawnX !== undefined && f.interiorSpawnY !== undefined);
  const isWhisperingCottage = /witch_cottage|hunter_cottage|forest_cottage|ruin_cottage|hidden_cottage|ranger_cabin/.test(f.interactionId ?? '');
  // Abandoned exterior prop — ruined facade, vines/tall grass, no door interaction (set dressing).
  const isAbandonedForestShack = f.interactionId === 'forest_hermit' || f.interactionId === 'woodcutter_cottage_ruin';
  const isRuinedForestCottageFacade = /hunter_cottage|forest_hermit|woodcutter_cottage_ruin/.test(f.interactionId ?? '');
  const facadeTile: TileType = isRuinedForestCottageFacade
    ? 'cottage_house_forest_ruined'
    : isWhisperingCottage
      ? 'cottage_house_forest'
      : hasInterior
        ? 'cottage_house_entry'
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
        // Visual facade sprite — non-walkable in all cases.
        tiles[ty][tx] = createTile(facadeTile, false);
      } else if (hasInterior) {
        // Keep only the upper cottage body blocked. Interior cottages use oversized facade art,
        // and the player collision radius needs a few walkable rows in front of the facade to
        // actually step onto the visible pad from the sides and approach the entrance cleanly.
        // Entry triggers are still stamped explicitly below, and the facade sprite tile remains
        // non-walkable via the branch above.
        // For oversized interior-cottage facades, keep only the top strip blocked.
        // Remaining footprint rows must be walkable so no invisible "non-walkable grass"
        // bands remain on the visible approach pad.
        tiles[ty][tx] = createTile('grass', dy >= 1);
      } else if (dy < bodyRows) {
        tiles[ty][tx] = createTile('wood', false);
      } else if (dx === anchors.centerX && dy === f.height - 1) {
        tiles[ty][tx] = isAbandonedForestShack
          ? createTile('dirt', true)
          : createTile('dirt', true, { interactable: true, interactionId: f.interactionId || 'cottage' });
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

function validateAuthoredPlacements(tiles: Tile[][], def: MapDefinition) {
  const spawnDx = (x: number) => x - def.spawnPoint.x;
  const spawnDy = (y: number) => y - def.spawnPoint.y;

  for (const chest of def.chests) {
    if (chest.y < 0 || chest.y >= tiles.length || chest.x < 0 || chest.x >= tiles[0].length) {
      console.warn(`[MapValidation] ${def.name}: chest out of bounds at (${chest.x},${chest.y})`);
      continue;
    }
    const tile = tiles[chest.y][chest.x];
    if (tile.type !== 'chest' || tile.interactionId !== chest.interactionId) {
      console.warn(`[MapValidation] ${def.name}: chest placement overwritten at (${chest.x},${chest.y}) [${chest.interactionId}]`);
    }
    const distSq = spawnDx(chest.x) * spawnDx(chest.x) + spawnDy(chest.y) * spawnDy(chest.y);
    if (distSq <= 4) {
      console.warn(`[MapValidation] ${def.name}: chest ${chest.interactionId} is very close to spawn at (${chest.x},${chest.y})`);
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

/** Never grind these down for chest access — preserves cemetery palisade, gates, castle rails. */
const CHEST_CARVE_SKIP_TYPES: Set<TileType> = new Set([
  'fence', 'gate', 'iron_fence',
]);

function placeChests(tiles: Tile[][], def: MapDefinition) {
  const shouldCarveAccess = def.width >= 40 || def.height >= 40;
  for (const chest of def.chests) {
    if (chest.y >= 0 && chest.y < tiles.length && chest.x >= 0 && chest.x < tiles[0].length) {
      tiles[chest.y][chest.x] = createTile('chest', true, { interactable: true, interactionId: chest.interactionId });
      if (shouldCarveAccess) {
        // Only auto-carve access in large field maps; authored interiors should keep their walls/floors intact.
        for (let dx = -1; dx <= 1; dx++) {
          for (let dy = -1; dy <= 1; dy++) {
            const tx = chest.x + dx;
            const ty = chest.y + dy;
            if (ty >= 2 && ty < tiles.length - 2 && tx >= 2 && tx < tiles[0].length - 2) {
              const t = tiles[ty][tx];
              if (!t.walkable && t.type !== 'chest' && !CHEST_CARVE_SKIP_TYPES.has(t.type)) {
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
const INCOMPATIBLE_BASE: Set<TileType> = new Set([
  'water', 'lava', 'ice', 'swamp', 'waterfall', 'bridge',
  // Cliff faces: trees growing out of vertical rock walls look wrong
  'cliff', 'cliff_edge',
]);

// Decoration overlay types that should only appear on land
const LAND_DECORATIONS: Set<TileType> = new Set([
  'flower', 'moonbloom', 'tall_grass', 'mushroom', 'rock', 'tree', 'dead_tree',
  'stump', 'bones', 'scarecrow', 'hay_bale', 'tombstone',
]);

// Path-type tiles that trees/rocks should be cleared away from
const PATH_TILES: Set<TileType> = new Set([
  'dirt', 'cobblestone', 'wooden_path', 'wood_floor', 'bridge', 'sand',
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
          && !PATH_TILES.has(bufTile.type) && bufTile.type !== 'bridge') {
        tiles[ty][x] = { ...bufTile, walkable: false };
      }
    }
  }
}

const PROTECTED_INTERACTIVE_TILES: Set<TileType> = new Set([
  'chest', 'door', 'door_interior', 'door_iron',
]);

// How far from paths to clear blocking objects (trees, rocks)
const PATH_CLEAR_RADIUS = 2;

// Minimum spacing between decoration overlays (trees, rocks, etc.)
const MIN_DECORATION_SPACING = 2;
const SPACED_DECORATIONS: Set<TileType> = new Set([
  'tree', 'dead_tree', 'rock', 'stump', 'tombstone', 'statue',
  'scarecrow', 'hay_bale', 'well', 'campfire', 'bonfire', 'barrel', 'crate',
  'mushroom', 'bones', 'lantern',
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
          tiles[y][x] = createTile('sand', true);
          continue;
        }
      }

      // Clear trees/rocks near paths (reduced radius in forest biomes)
      if (PATH_BLOCKERS.has(tile.type)) {
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
                               def.baseTerrain === 'ruins' ? 'stone' : 'grass';
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

// Vertical cliff art: only when the tile to the NORTH (smaller y) is higher than the tile to the SOUTH.
// The complementary “south/east neighbor higher” case is filled at render time in World.appendTerrainSeamFillers
// so paths and portal rows do not show sky gaps.
function stampCliffs(tiles: Tile[][], protectSouthCoastRows: boolean) {
  const h = tiles.length;
  const w = tiles[0].length;
  const elevations = tiles.map(row => row.map(tile => tile.elevation ?? 0));
  // Protect the coastal zone at low y values (south = bottom of screen).
  const coastProtectMaxY = protectSouthCoastRows ? COASTAL_SOUTH_ROWS : 0;

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
      // Never overwrite roads/paths with cliff tiles — elevation changes on roads are
      // handled by the walkability system's "visible height indicator" heuristic.
      if (PATH_TILES.has(upperTile.type) || PATH_TILES.has(lowerTile.type)) continue;

      // Skip if the cliff_edge cap row falls inside the protected coastal zone.
      if (y - 1 < coastProtectMaxY) continue;
      tiles[y - 1][x] = createTile('cliff_edge', false, { elevation: upperElevation });

      // Extra wall tiles proportional to elevation drop — a 2-step drop gets 3 cliff tiles
      const elevDrop = upperElevation - lowerElevation;
      const wallDepth = Math.min(2 + elevDrop, h - y);
      for (let depth = 0; depth < wallDepth; depth++) {
        const cy = y + depth;
        if (cy >= h) break;
        if (cy < coastProtectMaxY) continue; // skip rows inside coastal zone
        const targetTile = tiles[cy][x];
        if (targetTile.transition || targetTile.interactable || targetTile.type === 'stairs') continue;
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
        if (existing.type === 'portal' || existing.type === 'chest') continue;
        if (HOUSE_TYPES.has(existing.type)) continue;
        if (!existing.walkable && (existing.type === 'grass' || existing.type === 'dirt' || existing.type === 'dark_grass')) {
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
        if (existing.type === 'portal' || existing.type === 'chest') continue;
        if (HOUSE_TYPES.has(existing.type)) continue;

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

export function generateMap(def: MapDefinition): WorldMap {
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
  stampCliffs(tiles, useCoastalSouthBorder(def));
  placeStairways(tiles, def);
  placeLadders(tiles, def);
  // Final pass: keep interior cottage approaches traversable even after elevation/cliff stamping.
  enforceInteriorCottageAprons(tiles, def);
  validateMapTransitions(tiles, def);
  validateAuthoredPlacements(tiles, def);

  return {
    name: def.name,
    subtitle: def.subtitle,
    width: def.width,
    height: def.height,
    tiles,
    spawnPoint: def.spawnPoint,
    coastalSouthBackdrop: useCoastalSouthBorder(def),
  };
}
