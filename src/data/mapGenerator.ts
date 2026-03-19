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
  return { type, walkable, ...options };
}

export interface MapFeature {
  x: number;
  y: number;
  width: number;
  height: number;
  type: 'building' | 'lake' | 'clearing' | 'path' | 'wall' | 'ruins' | 'camp' | 'garden' | 'graveyard' | 'bridge' | 'secret_cave' | 'destroyed_town' | 'temple' | 'waterfall' | 'volcano' | 'boss_arena' | 'abandoned_camp' | 'cemetery' | 'cliff_face' | 'farm' | 'iron_fence_border' | 'hedge_maze' | 'cobble_plaza' | 'forest_grove' | 'fort' | 'enchanted_grove' | 'church' | 'ruined_fort' | 'cottage' | 'watchtower';
  tiles?: Partial<Record<string, Tile>>; // specific tile overrides by "dx,dy"
  fill?: TileType;
  border?: TileType;
  interactionId?: string;
}

export interface MapDefinition {
  name: string;
  width: number;
  height: number;
  spawnPoint: { x: number; y: number };
  seed: number;
  baseTerrain: 'grassland' | 'forest' | 'swamp' | 'ruins' | 'dungeon';
  borderTile: TileType;
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
  secretAreas?: Array<{
    x: number;
    y: number;
    width: number;
    height: number;
    fill: TileType;
  }>;
  enemyZones?: Array<{
    x: number;
    y: number;
    width: number;
    height: number;
    enemyType: string;
    count: number;
  }>;
}

const STRUCTURE_FEATURE_TYPES: Set<MapFeature['type']> = new Set([
  'building', 'cottage', 'watchtower', 'church', 'temple', 'fort', 'ruined_fort', 'farm', 'cemetery'
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
      // Border
      const borderSize = 2;
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
            tile = createTile('flower', false); // Flowers should not be walkable
          } else if (n1 > 0.85 && n2 > 0.5) {
            tile = createTile('tree', false);
          } else if (n2 < 0.1) {
            tile = createTile('rock', false);
          } else if (n3 > 0.7 && n1 > 0.6) {
            tile = createTile('tall_grass', false); // Tall grass should not be walkable
          } else {
            tile = createTile('grass', true);
          }
          break;

        case 'forest':
          if (n1 > 0.45) {
            tile = createTile('tree', false);
          } else if (n1 > 0.35 && n2 > 0.5) {
            tile = createTile('tree', false);
          } else if (n2 < 0.08) {
            tile = createTile('mushroom', false); // Mushrooms should not be walkable
          } else if (n1 < 0.15) {
            tile = createTile('tall_grass', false); // Tall grass should not be walkable
          } else {
            tile = createTile('grass', true);
          }
          break;

        case 'swamp':
          if (n1 < 0.3) {
            tile = createTile('water', false);
          } else if (n1 < 0.45) {
            tile = createTile('swamp', true);
          } else if (n1 > 0.8) {
            tile = createTile('tree', false);
          } else if (n2 < 0.1) {
            tile = createTile('mushroom', false); // Mushrooms should not be walkable
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
    ...def.features.filter(f => f.type !== 'wall').map(f => ({ x: f.x + Math.floor(f.width / 2), y: f.y + Math.floor(f.height / 2) })),
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
  let cx = x1;
  let cy = y1;

  while (cx !== x2 || cy !== y2) {
    for (let dy = -Math.floor(width / 2); dy <= Math.floor(width / 2); dy++) {
      for (let dx = -Math.floor(width / 2); dx <= Math.floor(width / 2); dx++) {
        const tx = cx + dx;
        const ty = cy + dy;
        if (ty >= 2 && ty < tiles.length - 2 && tx >= 2 && tx < tiles[0].length - 2) {
          const existing = tiles[ty][tx];
          if (existing.type !== 'portal' && existing.type !== 'chest' && !existing.interactable) {
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
        placeBuilding(tiles, feature);
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
const HOUSE_TYPES: Set<TileType> = new Set(['house', 'house_blue', 'house_green', 'house_thatch']);
// All tile types that indicate a structure is present (for spacing checks)
const STRUCTURE_TYPES: Set<TileType> = new Set([
  'house', 'house_blue', 'house_green', 'house_thatch',
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

function placeBuilding(tiles: Tile[][], f: MapFeature) {
  // Skip if this building would be on water/lava or too close to another building
  if (isOnInvalidTerrain(tiles, f.x, f.y, f.width, f.height)) return;
  if (isBuildingNearby(tiles, f.x, f.y, f.width, f.height)) return;

  // Pick a deterministic house variant based on position
  const variant = HOUSE_VARIANTS[(f.x * 7 + f.y * 13) % HOUSE_VARIANTS.length];
  
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

  // Place the actual building - limit house sprites to a centered cluster
  const houseWidth = Math.min(f.width, 3); // max 3 house tiles wide
  const houseStartX = Math.floor((f.width - houseWidth) / 2);
  
  for (let dy = 0; dy < f.height; dy++) {
    for (let dx = 0; dx < f.width; dx++) {
      const tx = f.x + dx;
      const ty = f.y + dy;
      if (ty >= 0 && ty < tiles.length && tx >= 0 && tx < tiles[0].length) {
        if (dx === Math.floor(f.width / 2) && dy === f.height - 1) {
          // Door
          tiles[ty][tx] = createTile('dirt', true, { interactable: true, interactionId: f.interactionId });
        } else if ((dy === 0 || dy === 1) && dx >= houseStartX && dx < houseStartX + houseWidth) {
          // House sprite only in center cluster
          tiles[ty][tx] = createTile(variant, false);
        } else if (dy === 0 || dy === 1) {
          // Stone walls flanking the house
          tiles[ty][tx] = createTile('stone', false);
        } else {
          tiles[ty][tx] = createTile('stone', false);
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
  for (let dy = 0; dy < f.height; dy++) {
    for (let dx = 0; dx < f.width; dx++) {
      const tx = f.x + dx;
      const ty = f.y + dy;
      if (ty >= 0 && ty < tiles.length && tx >= 0 && tx < tiles[0].length) {
        // Outer walls
        if (dx === 0 || dx === f.width - 1 || dy === 0 || dy === f.height - 1) {
          // Leave gaps for doors
          if ((dx === Math.floor(f.width / 2) && (dy === 0 || dy === f.height - 1)) ||
              (dy === Math.floor(f.height / 2) && (dx === 0 || dx === f.width - 1))) {
            tiles[ty][tx] = createTile('stone', true);
          } else {
            tiles[ty][tx] = createTile('stone', false);
          }
        } else {
          tiles[ty][tx] = createTile('stone', true);
        }
      }
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
    tiles[cy][cx] = createTile('campfire', false, { interactable: true, interactionId: f.interactionId || 'campfire' });
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

function placePath(tiles: Tile[][], f: MapFeature) {
  for (let dy = 0; dy < f.height; dy++) {
    for (let dx = 0; dx < f.width; dx++) {
      const tx = f.x + dx;
      const ty = f.y + dy;
      if (ty >= 0 && ty < tiles.length && tx >= 0 && tx < tiles[0].length) {
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
  const cx = f.x + Math.floor(f.width / 2);
  for (let dy = 0; dy < f.height; dy++) {
    for (let dx = 0; dx < f.width; dx++) {
      const tx = f.x + dx;
      const ty = f.y + dy;
      if (ty >= 0 && ty < tiles.length && tx >= 0 && tx < tiles[0].length) {
        const distFromCenter = Math.abs(tx - cx);
        if (distFromCenter <= 2) {
          tiles[ty][tx] = createTile(dy < 3 ? 'waterfall' : 'water', false);
        } else if (distFromCenter <= 3) {
          tiles[ty][tx] = createTile('rock', false);
        } else {
          tiles[ty][tx] = createTile('grass', true);
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
    tiles[cy][cx] = createTile('campfire', false, { interactable: true, interactionId: f.interactionId || 'boss_summon' });
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
  // Fenced cemetery with orderly tombstones, dead trees, and bones
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
        } else if (dx % 3 === 1 && dy % 3 === 1) {
          tiles[ty][tx] = createTile('tombstone', false, { interactable: true, interactionId: 'tombstone' });
        } else if (dx === Math.floor(f.width / 2) && dy === Math.floor(f.height / 2)) {
          tiles[ty][tx] = createTile('dead_tree', false);
        } else if ((dx + dy * 3) % 17 === 0) {
          tiles[ty][tx] = createTile('bones', true);
        } else {
          tiles[ty][tx] = createTile('dirt', true);
        }
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
        if (dy < 2) {
          tiles[ty][tx] = createTile('cliff_edge', false);
        } else {
          tiles[ty][tx] = createTile('cliff', false);
        }
      }
    }
  }
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
  if (isBuildingNearby(tiles, f.x, f.y, f.width, f.height)) return;
  for (let dy = 0; dy < f.height; dy++) {
    for (let dx = 0; dx < f.width; dx++) {
      const tx = f.x + dx;
      const ty = f.y + dy;
      if (ty >= 0 && ty < tiles.length && tx >= 0 && tx < tiles[0].length) {
        // Outer stone walls
        if (dx === 0 || dx === f.width - 1 || dy === 0 || dy === f.height - 1) {
          if (dx === Math.floor(f.width / 2) && dy === f.height - 1) {
            tiles[ty][tx] = createTile('gate', true);
          } else {
            tiles[ty][tx] = createTile('stone', false);
          }
        }
        // Inner wall ring
        else if (dx === 1 || dx === f.width - 2 || dy === 1 || dy === f.height - 2) {
          if ((dx + dy) % 4 === 0) {
            tiles[ty][tx] = createTile('stone', false);
          } else {
            tiles[ty][tx] = createTile('cobblestone', true);
          }
        }
        // Corner towers
        else if ((dx <= 3 && dy <= 3) || (dx >= f.width - 4 && dy <= 3) || 
                 (dx <= 3 && dy >= f.height - 4) || (dx >= f.width - 4 && dy >= f.height - 4)) {
          tiles[ty][tx] = createTile('stone', false);
        }
        // Interior
        else {
          if (dx === Math.floor(f.width / 2) && dy === Math.floor(f.height / 2)) {
            tiles[ty][tx] = createTile('campfire', false, { interactable: true, interactionId: f.interactionId || 'fort_campfire' });
          } else if ((dx + dy * 3) % 11 === 0) {
            tiles[ty][tx] = createTile('barrel', false);
          } else if ((dx * 2 + dy) % 13 === 0) {
            tiles[ty][tx] = createTile('crate', false);
          } else {
            tiles[ty][tx] = createTile('cobblestone', true);
          }
        }
      }
    }
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
  for (let dy = 0; dy < f.height; dy++) {
    for (let dx = 0; dx < f.width; dx++) {
      const tx = f.x + dx;
      const ty = f.y + dy;
      if (ty >= 0 && ty < tiles.length && tx >= 0 && tx < tiles[0].length) {
        // Crumbling outer walls with gaps
        if (dx === 0 || dx === f.width - 1 || dy === 0 || dy === f.height - 1) {
          if ((dx + dy) % 3 === 0) {
            tiles[ty][tx] = createTile('stone', true); // collapsed section
          } else {
            tiles[ty][tx] = createTile('mossy_stone', false);
          }
        }
        // Broken corner towers
        else if ((dx <= 2 && dy <= 2) || (dx >= f.width - 3 && dy <= 2) ||
                 (dx <= 2 && dy >= f.height - 3) || (dx >= f.width - 3 && dy >= f.height - 3)) {
          if ((dx + dy) % 2 === 0) {
            tiles[ty][tx] = createTile('stone', false);
          } else {
            tiles[ty][tx] = createTile('ruins_floor', true);
          }
        }
        // Interior - overgrown with debris
        else if ((dx * 3 + dy * 7) % 11 === 0) {
          tiles[ty][tx] = createTile('bones', true);
        } else if ((dx + dy * 5) % 13 === 0) {
          tiles[ty][tx] = createTile('destroyed_house', false);
        } else if ((dx * 2 + dy) % 9 === 0) {
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
    tiles[cy][cx] = createTile('campfire', false, { interactable: true, interactionId: f.interactionId || 'ruined_fort' });
  }
}

function placeCottage(tiles: Tile[][], f: MapFeature) {
  if (isBuildingNearby(tiles, f.x, f.y, f.width, f.height)) return;
  for (let dy = 0; dy < f.height; dy++) {
    for (let dx = 0; dx < f.width; dx++) {
      const tx = f.x + dx;
      const ty = f.y + dy;
      if (ty >= 0 && ty < tiles.length && tx >= 0 && tx < tiles[0].length) {
        if (dx >= 1 && dx <= f.width - 2 && dy >= 0 && dy <= 2) {
          tiles[ty][tx] = createTile('house', false);
        } else if (dx === Math.floor(f.width / 2) && dy === 3) {
          tiles[ty][tx] = createTile('dirt', true, { interactable: true, interactionId: f.interactionId || 'cottage' });
        } else if (dy >= 3) {
          // Small garden around cottage
          if ((dx + dy) % 4 === 0) {
            tiles[ty][tx] = createTile('flower', true);
          } else {
            tiles[ty][tx] = createTile('grass', true);
          }
        } else {
          tiles[ty][tx] = createTile('wood', false);
        }
      }
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
  for (const portal of def.portals) {
    if (portal.y < tiles.length && portal.x < tiles[0].length) {
      tiles[portal.y][portal.x] = createTile('portal', true, {
        transition: { targetMap: portal.targetMap, targetX: portal.targetX, targetY: portal.targetY }
      });
      // Clear surrounding tiles for accessibility
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          if (dx === 0 && dy === 0) continue;
          const tx = portal.x + dx;
          const ty = portal.y + dy;
          if (ty >= 2 && ty < tiles.length - 2 && tx >= 2 && tx < tiles[0].length - 2) {
            if (tiles[ty][tx].type !== 'portal') {
              tiles[ty][tx] = createTile('stone', true);
            }
          }
        }
      }
    }
  }
}

function placeChests(tiles: Tile[][], def: MapDefinition) {
  for (const chest of def.chests) {
    if (chest.y < tiles.length && chest.x < tiles[0].length) {
      tiles[chest.y][chest.x] = createTile('chest', true, { interactable: true, interactionId: chest.interactionId });
      // Ensure path to chest
      for (let dx = -1; dx <= 1; dx++) {
        for (let dy = -1; dy <= 1; dy++) {
          const tx = chest.x + dx;
          const ty = chest.y + dy;
          if (ty >= 2 && ty < tiles.length - 2 && tx >= 2 && tx < tiles[0].length - 2) {
            if (!tiles[ty][tx].walkable && tiles[ty][tx].type !== 'chest') {
              tiles[ty][tx] = createTile('grass', true);
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
      tiles[obj.y][obj.x] = createTile(obj.type, obj.walkable, { interactable: true, interactionId: obj.interactionId });
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
]);

// Decoration overlay types that should only appear on land
const LAND_DECORATIONS: Set<TileType> = new Set([
  'flower', 'tall_grass', 'mushroom', 'rock', 'tree', 'dead_tree',
  'stump', 'bones', 'scarecrow', 'hay_bale', 'tombstone',
]);

// Path-type tiles that trees/rocks should be cleared away from
const PATH_TILES: Set<TileType> = new Set([
  'dirt', 'cobblestone', 'wooden_path', 'bridge', 'sand',
]);

// How far from paths to clear blocking objects (trees, rocks)
const PATH_CLEAR_RADIUS = 2;

// Objects that block paths and should be cleared near roads
const PATH_BLOCKERS: Set<TileType> = new Set([
  'tree', 'rock', 'stump', 'dead_tree', 'hedge',
]);

// Minimum spacing between decoration overlays (trees, rocks, etc.)
const MIN_DECORATION_SPACING = 2;
const SPACED_DECORATIONS: Set<TileType> = new Set([
  'tree', 'dead_tree', 'rock', 'stump', 'tombstone', 'statue',
  'scarecrow', 'hay_bale', 'well', 'campfire', 'barrel', 'crate',
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
      if (!SPACED_DECORATIONS.has(tile.type)) continue;
      // Check neighborhood for other decorations (only previously visited cells)
      for (let dy = -MIN_DECORATION_SPACING; dy <= MIN_DECORATION_SPACING; dy++) {
        for (let dx = -MIN_DECORATION_SPACING; dx <= MIN_DECORATION_SPACING; dx++) {
          if (dx === 0 && dy === 0) continue;
          const nx = x + dx;
          const ny = y + dy;
          if (ny < 0 || ny >= h || nx < 0 || nx >= w) continue;
          // Only check tiles that come AFTER in scan order (remove duplicates going forward)
          if (ny < y || (ny === y && nx <= x)) continue;
          if (SPACED_DECORATIONS.has(tiles[ny][nx].type)) {
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

export function generateMap(def: MapDefinition): WorldMap {
  const tiles = generateBaseTerrain(def);

  // Place features first (buildings, lakes, etc)
  placeFeatures(tiles, def);

  // Carve roads between key points
  carveRoads(tiles, def);

  // Place specific objects
  placePortals(tiles, def);
  placeChests(tiles, def);
  placeInteractables(tiles, def);
  placeSecretAreas(tiles, def);

  // Clean up illogical placements (flowers in water, etc.)
  cleanupIllogicalPlacements(tiles, def);

  // Ensure spawn point is walkable
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

  return {
    name: def.name,
    width: def.width,
    height: def.height,
    tiles,
    spawnPoint: def.spawnPoint,
  };
}
