import * as THREE from 'three';
import { AssetManager } from './AssetManager';
import { TILE_METADATA, DETAIL_CONFIG } from '@/data/tiles';
import { isPositionInBonfireSafeZone } from '@/game/runtime/bonfireCombatGuard';
import { GroundInstanceLayer } from './GroundInstanceLayer';
import { TransientTileDecalField } from './TransientTileDecals';

/**
 * Experimental: batch flat base-ground quads into per-texture InstancedMeshes to cut draw calls.
 * Default OFF — the proven per-mesh path is unchanged when false. Flip to true to A/B test in-game
 * (F8 to watch drawCalls). Only pure ground tiles (no shadow/decal/seam/overlay) are instanced.
 */
const USE_INSTANCED_GROUND: boolean = false;

export type TileType = 
  | 'grass' | 'dirt' | 'water' | 'water_corrupted' | 'stone' | 'wood' 
  | 'tree' | 'tree_b' | 'tree_c' | 'house' | 'house_entry' | 'house_blue' | 'house_blue_entry' | 'house_green' | 'house_green_entry' | 'house_thatch' | 'house_thatch_entry' | 'cottage_house' | 'cottage_house_entry' | 'cottage_house_forest' | 'cottage_house_forest_ruined' | 'cottage_house_ranger' | 'rock' | 'chest' | 'chest_opened' | 'special_chest' | 'special_chest_opened' | 'portal' | 'flower' | 'moonbloom' | 'tempest_grass'
  | 'tall_grass' | 'tall_grass_b' | 'tall_grass_c' | 'plains_grass' | 'plains_grass_tall' | 'bridge' | 'bridge_corrupted' | 'bridge_folded' | 'sand' | 'swamp' | 'lava' | 'ice'
  | 'pressure_plate' | 'hidden_wall' | 'push_block' | 'switch_door'
  | 'campfire' | 'campfire_remains' | 'bonfire' | 'sign' | 'well' | 'tombstone' | 'tombstone_broken' | 'tombstone_cracked_v' | 'mushroom' | 'stump' | 'stump_b' | 'stump_c'
  | 'fence' | 'gate' | 'barrel' | 'crate' | 'spike_trap' | 'bones'
  | 'volcanic_rock' | 'ash' | 'ruins_floor' | 'waterfall' | 'snow'
  | 'dead_tree' | 'dead_tree_b' | 'dead_tree_c' | 'destroyed_house' | 'destroyed_house_rubble' | 'destroyed_house_overgrown' | 'broken_sign' | 'statue'
  | 'cliff' | 'cliff_edge' | 'cliff_corrupted' | 'cliff_edge_corrupted' | 'cliff_edge_plains' | 'cobblestone' | 'farmland' | 'wheat'
  | 'iron_fence' | 'hedge' | 'scarecrow' | 'windmill' | 'hay_bale' | 'lantern'
  | 'dark_grass' | 'hollow_blight' | 'mossy_stone' | 'ruined_fort_wall' | 'ruined_fort_wall_mossy' | 'wooden_path' | 'stairs' | 'ladder' | 'curled_ladder' | 'gate_ladder' | 'gate_ladder_open'
  | 'wagon' | 'cart' | 'market_stall' | 'bench' | 'bookshelf'
  | 'table' | 'pot' | 'rug' | 'wood_floor' | 'counter'
  | 'bed' | 'wardrobe' | 'fireplace' | 'weapon_rack' | 'alchemy_table' | 'cauldron'
  | 'throne' | 'altar' | 'heresy_altar' | 'heresy_altar_cracked' | 'summoning_ritual' | 'summoning_ritual_dud' | 'ritual_candle' | 'ritual_candle_knocked' | 'bloodstain' | 'chain' | 'shortcut_lever' | 'cage' | 'bones_pile' | 'ranger_remains' | 'ranger_remains_scattered'
  | 'door' | 'door_interior' | 'door_iron'
  | 'fog_gate'
  | 'bonfire_unlit'
  | 'boat_wreck' | 'dock'
  | 'cobblestone_dark' | 'brick' | 'roof_tile' | 'timber_wall'
  // Guilrhym district pavers + canal ground (authored district identity; see AssetManager)
  | 'cobble_grand' | 'cobble_market' | 'cobble_residential' | 'waterlogged_cobble' | 'flood_silt' | 'ashen_cobble'
  // Guilrhym bespoke architecture - tall Victorian overlay structures (see AssetManager + tiles.ts)
  | 'tenement_facade' | 'townhouse_facade' | 'cathedral_facade' | 'clocktower' | 'warehouse_facade'
  | 'manor_facade' | 'boarded_facade'
  // Guilrhym street life + paving (props + a proper paved-road ground tile)
  | 'baby_carriage' | 'stagecoach' | 'street_sign' | 'road_setts'
  | 'street_lamp' | 'iron_railing' | 'fountain' | 'pillar' | 'sewer_grate' | 'hanging_sign' | 'wall_torch' | 'awning'
  | 'rubble' | 'broken_stall' | 'crate_stack' | 'barrel_stack' | 'chimney'
  // Guilrhym fallen-city dressing - a burning street barricade + a civic memorial column landmark
  | 'burning_barricade' | 'memorial_column'
  // Guilrhym district fencing kits + a hard street-sealing collapse mass
  | 'timber_palisade' | 'stone_low_wall' | 'chain_fence' | 'collapsed_masonry'
  // A bespoke cliff cave-mouth - interactable entrance into a cave interior (and its step-out exit)
  | 'cave_mouth'
  | 'cave_mouth_angled'
  | 'cottage_shed'
  | 'blighted_stump'
  | 'observatory'
  | 'fallen_log' | 'fallen_log_b'
  | 'fallen_log_v' | 'fallen_log_v_b'
  | 'loose_plank'
  | 'plank_pile'
  | 'plank_crossing'
  | 'ridge_lumberyard'
  | 'quarry_floor' | 'quarry_bedrock' | 'quarry_crane' | 'cut_stone_blocks' | 'quarry_cart' | 'quarry_rubble' | 'quarry_tools'
  | 'cave_floor';

/** Pass as `getInteractableNear` radius from gameplay so gates / chunky facades stay in scan + reach.
 * Must be >= every `getInteractableReach` value so the min() cap does not shrink large reaches. */
export const INTERACTABLE_QUERY_RADIUS = 3.25;

export interface Tile {
  type: TileType;
  walkable: boolean;
  elevation?: number;
  interactable?: boolean;
  interactionId?: string;
  transition?: {
    targetMap: string;
    targetX: number;
    targetY: number;
  };
  hidden?: boolean;
  linkedTo?: string;
  pushable?: boolean;
  activated?: boolean;
  /** Set for `stairs` when map stairways use `axis: 'ew'` - treads run east–west. */
  stairAxis?: 'ns' | 'ew';
  /** Optional fixed backing drawn beneath overlay/height art when neighbor sampling would show seams. */
  baseTile?: TileType;
  /** When true, this tile is part of an authored dirt-spine route and may cross ±1 elevation without stairs. */
  spinePath?: boolean;
  /** When true, enemies cannot stand on or path onto this tile (e.g. ladder landings). */
  enemyBlocked?: boolean;
  /** When true, the player moves at reduced speed (rickety plank crossings, etc.). */
  slowWalk?: boolean;
  /** When true, draw a padlock overlay — key-item gates (forts, Highlander's Plains). */
  keyGateLock?: boolean;
}

export interface WorldMap {
  name: string;
  subtitle?: string;
  width: number;
  height: number;
  tiles: Tile[][];
  spawnPoint: { x: number; y: number };
  /** Runtime-only revision for map tile edits that should invalidate cached terrain canvases. */
  revision?: number;
  /** When true, World draws an extra south backdrop (cliff/ocean) below the tile grid so the camera does not show empty void past the coast. */
  coastalSouthBackdrop?: boolean;
  /** When true, deep-ocean planes also extend past the north, east, and west map edges (matches coastalBorderAllSides generation). */
  coastalBorderAllSides?: boolean;
  /** Runtime map key (village, forest, …) - used for bonfire sanctuary collision. */
  mapKey?: string;
}

export interface InteractableHit {
  interactionId: string;
  tileType: TileType;
  x: number;
  y: number;
}

export interface CollisionDebugTile {
  tileX: number;
  tileY: number;
  type: TileType;
  walkable: boolean;
  elevation: number;
  interactable: boolean;
  transition: boolean;
  enemyBlocked: boolean;
}

export interface CollisionDebugSample extends CollisionDebugTile {
  label: 'tl' | 'tr' | 'bl' | 'br';
  worldX: number;
  worldY: number;
}

export interface CollisionDebugProbe {
  label: 'left' | 'right' | 'up' | 'down';
  allowed: boolean;
  reason: string;
  tileX: number;
  tileY: number;
  type: TileType | null;
  elevation: number | null;
}

export interface CollisionDebugSnapshot {
  worldX: number;
  worldY: number;
  radius: number;
  tileX: number;
  tileY: number;
  currentTile: CollisionDebugTile | null;
  samples: CollisionDebugSample[];
  nearbyTiles: CollisionDebugTile[];
  probes: CollisionDebugProbe[];
  scanRadius: number;
}

export interface CollisionAuditPoint {
  label: string;
  x: number;
  y: number;
  radius?: number;
}

export interface CollisionAuditResult {
  label: string;
  worldX: number;
  worldY: number;
  tileX: number;
  tileY: number;
  currentType: TileType | null;
  currentElevation: number | null;
  walkable: boolean;
  probes: CollisionDebugProbe[];
}

// The ortho camera (frustumSize 12) shows ~12 tiles tall and ~12*aspect wide - a visible
// half-span of ~6 vertical and ~11–14 horizontal even on ultrawide. RENDER_RADIUS only needs
// to cover that PLUS a movement margin; rendering far beyond it just meshes off-screen tiles.
// 22 covers a 21:9 viewport's wide half-span (~14) with ~8 tiles of margin, ~11 on 16:9.
// (Was 32 → a 65² window, ~4–5× the visible area. 22 ≈ a 45² window: ~half the active objects,
//  on every map, with faster map-enter streaming too.)
// INVARIANT: CULL_RADIUS must be ≥ RENDER_RADIUS + PRELOAD_EXTRA (tiles are added out to that
// in the move direction), or just-preloaded tiles get culled next frame → flicker. Original
// set CULL = RENDER + PRELOAD exactly (42 = 32+10); we keep that: 34 = 22+12.
const RENDER_RADIUS = 22;
const CULL_RADIUS = 34;
const MAX_TILES_PER_FRAME = 200; // steady-state budget while moving
const INITIAL_LOAD_TILES_PER_FRAME = 320; // smoother initial/after-rebuild streaming without one-frame spikes
const TILE_KEY_STRIDE = 65536;
const MAX_MESH_POOL_SIZE = 1200;
const DECORATIVE_OVERLAY_NEAR_RADIUS = 26;
const HEIGHT_TILE_TYPES: ReadonlySet<TileType> = new Set(['cliff', 'cliff_edge', 'cliff_corrupted', 'cliff_edge_corrupted', 'cliff_edge_plains', 'stairs', 'ladder', 'curled_ladder', 'gate_ladder', 'gate_ladder_open']);
const OVERLAY_CULL_EXEMPT_TILE_TYPES: ReadonlySet<TileType> = new Set([
  'door', 'door_interior', 'door_iron',
  'chest', 'chest_opened', 'special_chest', 'special_chest_opened',
  'portal', 'bonfire', 'bonfire_unlit',
  'ladder', 'curled_ladder', 'gate_ladder', 'gate_ladder_open',
  'gate', 'fog_gate',
  'house', 'house_entry', 'house_blue', 'house_blue_entry', 'house_green', 'house_green_entry',
  'house_thatch', 'house_thatch_entry',
  'cottage_house', 'cottage_house_entry', 'cottage_house_forest', 'cottage_house_forest_ruined',
  'cottage_house_ranger', 'cottage_shed',
  'tenement_facade', 'townhouse_facade', 'cathedral_facade', 'clocktower', 'warehouse_facade',
  'manor_facade', 'boarded_facade', 'collapsed_masonry', 'memorial_column',
  'windmill', 'ridge_lumberyard', 'observatory',
  'heresy_altar', 'heresy_altar_cracked', 'summoning_ritual', 'summoning_ritual_dud',
  'shortcut_lever',
  'cliff', 'cliff_edge', 'cliff_corrupted', 'cliff_edge_corrupted', 'cliff_edge_plains',
  'stairs',
]);
const ELEVATION_CONNECTOR_TILE_TYPES: ReadonlySet<TileType> = new Set([
  'stairs',
  'ladder',
  'gate_ladder',
  'gate_ladder_open',
  'bridge',
  'bridge_corrupted',
  'wooden_path',
]);

export const SPINE_ELEVATION_TILE_TYPES: ReadonlySet<TileType> = new Set(['dirt', 'grass', 'plains_grass', 'plains_grass_tall', 'sand', 'hollow_blight', 'cobblestone', 'cobble_grand', 'cobble_market', 'cobble_residential', 'waterlogged_cobble', 'flood_silt', 'ashen_cobble', 'road_setts', 'ash', 'volcanic_rock', 'rock', 'dead_tree']);

export function isSpinePathElevationTile(tile: Tile | null): boolean {
  if (!tile?.walkable || !tile.spinePath) return false;
  return SPINE_ELEVATION_TILE_TYPES.has(tile.type) || HEIGHT_TILE_TYPES.has(tile.type);
}

/** Authored dirt/grass spine tiles may step ±1 elevation without stair/ladder connectors. */
export function canCrossSpinePathElevation(fromTile: Tile | null, toTile: Tile | null): boolean {
  return isSpinePathElevationTile(fromTile) && isSpinePathElevationTile(toTile);
}

/** Tile types enemies treat as solid - mirrors ladder/gate art and vertical traversal the player can use. */
const ENEMY_BLOCKED_TILE_TYPES: ReadonlySet<TileType> = new Set(['ladder', 'curled_ladder', 'gate_ladder', 'gate_ladder_open', 'stairs']);
const NON_BLOCKING_OVERLAYS: ReadonlySet<TileType> = new Set([
  'bones',
  'flower',
  'moonbloom',
  'tempest_grass',
  'hay_bale',
  'mushroom',
  'pot',
  'rug',
  'tall_grass',
  'plains_grass_tall',
  'wheat',
]);
const WATER_BRIDGE_TILES: ReadonlySet<TileType> = new Set<TileType>([
  'water',
  'water_corrupted',
  'bridge',
  'bridge_corrupted',
  'bridge_folded',
  'bridge_decay_blend',
] as TileType[]);
/** Tiles that can host an idle wave-crest ripple (open water only — not bridges/docks). */
const WATER_RIPPLE_TILES: ReadonlySet<TileType> = new Set<TileType>(['water', 'water_corrupted'] as TileType[]);
/** Grassy/leafy ground that can host an idle wind gust (open vegetation, not structures/paths). */
const WIND_GUST_TILES: ReadonlySet<TileType> = new Set<TileType>([
  'grass', 'dark_grass', 'tall_grass', 'tall_grass_b', 'tall_grass_c', 'wheat', 'farmland',
] as TileType[]);
/** Highlander's Plains ground - hosts the straw-tinted gust decal instead of the green one. */
const PLAINS_GUST_TILES: ReadonlySet<TileType> = new Set<TileType>([
  'plains_grass', 'plains_grass_tall',
] as TileType[]);
const OVERWORLD_STRUCTURE_TILE_TYPES: ReadonlySet<TileType> = new Set([
  'house',
  'house_entry',
  'house_blue',
  'house_blue_entry',
  'house_green',
  'house_green_entry',
  'house_thatch',
  'house_thatch_entry',
  'cottage_house',
  'cottage_house_entry',
  'cottage_house_forest',
  'cottage_house_forest_ruined',
  'cottage_house_ranger',
  'destroyed_house',
  'destroyed_house_rubble',
  'destroyed_house_overgrown',
  'tenement_facade',
  'townhouse_facade',
  'cathedral_facade',
  'clocktower',
  'warehouse_facade',
  'manor_facade',
  'boarded_facade',
]);
const OVERWORLD_STRUCTURE_SCALE_MULTIPLIER = 1.18;
const BLOODSTAIN_VARIANT_COUNT = 16;
const RUINED_FOREST_COTTAGE_VARIANT_COUNT = 12;
const GUILRHYM_TENEMENT_VARIANT_COUNT = 18;
const GUILRHYM_TOWNHOUSE_VARIANT_COUNT = 18;
const GUILRHYM_WAREHOUSE_VARIANT_COUNT = 18;
const GUILRHYM_MANOR_VARIANT_COUNT = 18;
const GUILRHYM_BOARDED_VARIANT_COUNT = 18;

function packTileKey(tileX: number, tileY: number): number {
  return tileY * TILE_KEY_STRIDE + tileX;
}

function unpackTileKeyX(key: number): number {
  return key % TILE_KEY_STRIDE;
}

function unpackTileKeyY(key: number): number {
  return Math.floor(key / TILE_KEY_STRIDE);
}

function createSortedRenderOffsets(radius: number): Array<{ dx: number; dy: number }> {
  const offsets: Array<{ dx: number; dy: number; dist: number }> = [];
  for (let dy = -radius; dy <= radius; dy++) {
    for (let dx = -radius; dx <= radius; dx++) {
      offsets.push({ dx, dy, dist: Math.abs(dx) + Math.abs(dy) });
    }
  }
  offsets.sort((a, b) => a.dist - b.dist);
  return offsets.map(({ dx, dy }) => ({ dx, dy }));
}

// Seeded hash for deterministic detail placement
function tileHash(x: number, y: number, seed: number = 0): number {
  let h = (x * 374761393 + y * 668265263 + seed * 1274126177) | 0;
  h = (h ^ (h >> 13)) * 1274126177;
  h = h ^ (h >> 16);
  return (h & 0x7fffffff) / 0x7fffffff; // 0..1
}

function getBloodstainTextureId(tileX: number, tileY: number): string {
  const variant = Math.floor(tileHash(tileX, tileY, 911) * BLOODSTAIN_VARIANT_COUNT);
  return `bloodstain_variant_${Math.min(BLOODSTAIN_VARIANT_COUNT - 1, variant)}`;
}

function getRuinedForestCottageTextureId(tileX: number, tileY: number): string {
  const variant = Math.floor(tileHash(tileX, tileY, 947) * RUINED_FOREST_COTTAGE_VARIANT_COUNT);
  return `cottage_house_forest_ruined_variant_${Math.min(RUINED_FOREST_COTTAGE_VARIANT_COUNT - 1, variant)}`;
}

function getGuilrhymTenementTextureId(tileX: number, tileY: number): string {
  const variant = Math.floor(tileHash(tileX, tileY, 613) * GUILRHYM_TENEMENT_VARIANT_COUNT);
  return `tenement_facade_variant_${Math.min(GUILRHYM_TENEMENT_VARIANT_COUNT - 1, variant)}`;
}

function getGuilrhymTownhouseTextureId(tileX: number, tileY: number): string {
  const variant = Math.floor(tileHash(tileX, tileY, 617) * GUILRHYM_TOWNHOUSE_VARIANT_COUNT);
  return `townhouse_facade_variant_${Math.min(GUILRHYM_TOWNHOUSE_VARIANT_COUNT - 1, variant)}`;
}

function getGuilrhymWarehouseTextureId(tileX: number, tileY: number): string {
  const variant = Math.floor(tileHash(tileX, tileY, 619) * GUILRHYM_WAREHOUSE_VARIANT_COUNT);
  return `warehouse_facade_variant_${Math.min(GUILRHYM_WAREHOUSE_VARIANT_COUNT - 1, variant)}`;
}

function getGuilrhymManorTextureId(tileX: number, tileY: number): string {
  const variant = Math.floor(tileHash(tileX, tileY, 631) * GUILRHYM_MANOR_VARIANT_COUNT);
  return `manor_facade_variant_${Math.min(GUILRHYM_MANOR_VARIANT_COUNT - 1, variant)}`;
}

function getGuilrhymBoardedTextureId(tileX: number, tileY: number): string {
  const variant = Math.floor(tileHash(tileX, tileY, 641) * GUILRHYM_BOARDED_VARIANT_COUNT);
  return `boarded_facade_variant_${Math.min(GUILRHYM_BOARDED_VARIANT_COUNT - 1, variant)}`;
}

function getOverlayTextureId(tileType: TileType, tileX: number | undefined, tileY: number | undefined): string {
  if (tileX === undefined || tileY === undefined) return tileType;
  if (tileType === 'bloodstain') return getBloodstainTextureId(tileX, tileY);
  if (tileType === 'cottage_house_forest_ruined') return getRuinedForestCottageTextureId(tileX, tileY);
  if (tileType === 'tenement_facade') return getGuilrhymTenementTextureId(tileX, tileY);
  if (tileType === 'townhouse_facade') return getGuilrhymTownhouseTextureId(tileX, tileY);
  if (tileType === 'warehouse_facade') return getGuilrhymWarehouseTextureId(tileX, tileY);
  if (tileType === 'manor_facade') return getGuilrhymManorTextureId(tileX, tileY);
  if (tileType === 'boarded_facade') return getGuilrhymBoardedTextureId(tileX, tileY);
  return tileType;
}

// detail Decals - now imported from data/tiles.ts

export class World {
  static readonly ELEVATION_Y_OFFSET = 0.58;

  private map: WorldMap;
  private tileSize: number = 1;
  private scene: THREE.Scene;
  private assetManager: AssetManager;
  
  private activeMeshes: Map<number, THREE.Object3D> = new Map();
  private overlayPool: THREE.Group[] = [];
  private meshPool: THREE.Mesh[] = [];
  private lastChunkCenter: { x: number; y: number } = { x: -9999, y: -9999 };
  private lastMoveDir: { x: number; y: number } = { x: 0, y: 0 };
  private readonly CHUNK_UPDATE_THRESHOLD = 2;
  // Slightly more lookahead than before, to keep the (now smaller) render window's leading
  // edge ahead of fast movement/dashes so tiles stream in before they're on screen.
  private readonly PRELOAD_EXTRA = 12; // extra tiles in movement direction
  private readonly sortedRenderOffsets = createSortedRenderOffsets(RENDER_RADIUS + this.PRELOAD_EXTRA);
  private pendingTiles: Array<{ x: number; y: number; key: number }> = [];
  private isInitialLoad: boolean = true;
  private mapRevision: number = 0;
  private renderCenter: { x: number; y: number } = { x: -9999, y: -9999 };
  private activeOverlayObjectCount: number = 0;
  private activeDecorativeOverlayCullCount: number = 0;
  private decorativeOverlayCullSkips: number = 0;
  private interactableCache: {
    centerTileX: number;
    centerTileY: number;
    radius: number;
    revision: number;
    result: InteractableHit | null;
  } | null = null;
  /** Meshes below the south coast tiles; not part of chunk streaming. */
  private southCoastBackdrop: THREE.Group | null = null;
  /** Geometries for optional extra coast planes; material + texture shared (see rebuild). */
  private southCoastBackdropDisposables: Array<{
    geometry: THREE.BufferGeometry;
    material: THREE.Material;
    texture?: THREE.Texture;
  }> = [];
  private coastalBackdropShared: { material: THREE.MeshBasicMaterial; texture: THREE.Texture } | null = null;
  private materialCache: Map<string, THREE.MeshBasicMaterial> = new Map();
  private detailGeometry: THREE.PlaneGeometry;
  private shadowGeometry: THREE.PlaneGeometry;
  private detailTextures: Map<string, THREE.Texture> = new Map();

  private readonly groundInstances: GroundInstanceLayer;
  /** Pool of empty placeholder nodes that stand in `activeMeshes` for instanced ground tiles. */
  private readonly groundPlaceholderPool: THREE.Object3D[] = [];
  /** Idle ambience: sparse transient decals stamped on random visible water / grass tiles. */
  private readonly waterRipples: TransientTileDecalField;
  private readonly windGusts: TransientTileDecalField;
  private readonly plainsGusts: TransientTileDecalField;

  constructor(scene: THREE.Scene, assetManager: AssetManager, map: WorldMap) {
    this.scene = scene;
    this.assetManager = assetManager;
    this.map = map;
    this.map.revision = this.mapRevision;
    this.detailGeometry = new THREE.PlaneGeometry(0.3, 0.3);
    this.shadowGeometry = new THREE.PlaneGeometry(1, 1);
    this.groundInstances = new GroundInstanceLayer(scene);
    this.waterRipples = new TransientTileDecalField(
      scene,
      {
        maxConcurrent: 5, lifeMs: 1500, minGapMs: 320, maxGapMs: 950,
        size: 0.9, renderOrder: 56000, z: 0.03, peakOpacity: 0.7,
        scaleFrom: 0.85, scaleTo: 1.25, driftX: 0, driftY: 0.07,
        jitter: 0.5, rotationJitter: 0.6,
      },
      () => this.assetManager.getTexture('water_ripple') ?? null,
    );
    this.windGusts = new TransientTileDecalField(
      scene,
      {
        maxConcurrent: 4, lifeMs: 1300, minGapMs: 520, maxGapMs: 1600,
        size: 1.5, renderOrder: 100, z: 0.04, peakOpacity: 0.42,
        scaleFrom: 0.75, scaleTo: 1.3, driftX: 0.6, driftY: 0.12,
        jitter: 0.6, rotationJitter: 0.3,
      },
      () => this.assetManager.getTexture('wind_gust') ?? null,
    );
    // Open plains read as windswept: same gust mechanism, straw-tinted streaks, slightly more
    // frequent and faster horizontal drift than the sheltered forest gusts.
    this.plainsGusts = new TransientTileDecalField(
      scene,
      {
        maxConcurrent: 5, lifeMs: 1200, minGapMs: 380, maxGapMs: 1100,
        size: 1.5, renderOrder: 100, z: 0.04, peakOpacity: 0.46,
        scaleFrom: 0.75, scaleTo: 1.35, driftX: 0.8, driftY: 0.1,
        jitter: 0.6, rotationJitter: 0.3,
      },
      () => this.assetManager.getTexture('wind_gust_plains') ?? null,
    );
    this.generateDetailTextures();
    this.rebuildSouthCoastBackdrop();
  }

  private generateDetailTextures() {
    const makeCanvas = (draw: (ctx: CanvasRenderingContext2D) => void): THREE.Texture => {
      const c = document.createElement('canvas');
      c.width = 16; c.height = 16;
      const ctx = c.getContext('2d')!;
      ctx.clearRect(0, 0, 16, 16);
      draw(ctx);
      const tex = new THREE.CanvasTexture(c);
      tex.magFilter = THREE.NearestFilter;
      tex.minFilter = THREE.NearestFilter;
      return tex;
    };

    this.detailTextures.set('detail_grass_tuft', makeCanvas(ctx => {
      ctx.fillStyle = '#3a6b28';
      ctx.fillRect(6, 8, 2, 6); ctx.fillRect(4, 6, 2, 5); ctx.fillRect(9, 7, 2, 5);
      ctx.fillStyle = '#4a8b38';
      ctx.fillRect(7, 6, 1, 4); ctx.fillRect(5, 5, 1, 3); ctx.fillRect(10, 6, 1, 3);
    }));

    this.detailTextures.set('detail_leaf', makeCanvas(ctx => {
      ctx.fillStyle = '#8B6914';
      ctx.fillRect(5, 6, 6, 4);
      ctx.fillStyle = '#A07828';
      ctx.fillRect(6, 7, 4, 2);
      ctx.fillRect(7, 5, 2, 1);
      ctx.fillRect(7, 10, 2, 1);
    }));

    this.detailTextures.set('detail_pebble', makeCanvas(ctx => {
      ctx.fillStyle = '#888';
      ctx.beginPath(); ctx.arc(6, 9, 3, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#999';
      ctx.beginPath(); ctx.arc(10, 7, 2, 0, Math.PI * 2); ctx.fill();
    }));

    this.detailTextures.set('detail_crack', makeCanvas(ctx => {
      ctx.strokeStyle = 'rgba(0,0,0,0.3)';
      ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(4, 4); ctx.lineTo(8, 8); ctx.lineTo(6, 12); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(8, 8); ctx.lineTo(12, 10); ctx.stroke();
    }));

    this.detailTextures.set('detail_twig', makeCanvas(ctx => {
      ctx.strokeStyle = '#6B4226';
      ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(3, 10); ctx.lineTo(12, 6); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(8, 7); ctx.lineTo(10, 4); ctx.stroke();
    }));

    this.detailTextures.set('detail_mushroom_small', makeCanvas(ctx => {
      ctx.fillStyle = '#C8A882';
      ctx.fillRect(7, 9, 2, 4);
      ctx.fillStyle = '#CC4444';
      ctx.fillRect(5, 7, 6, 3);
      ctx.fillStyle = '#EE6666';
      ctx.fillRect(6, 7, 4, 2);
    }));

    this.detailTextures.set('height_shadow_top', makeCanvas(ctx => {
      for (let y = 0; y < 16; y++) {
        const alpha = Math.max(0, 0.5 - y * 0.055);
        if (alpha <= 0) continue;
        ctx.fillStyle = `rgba(0, 0, 0, ${alpha})`;
        ctx.fillRect(0, y, 16, 1);
      }
    }));

    this.detailTextures.set('height_shadow_side', makeCanvas(ctx => {
      for (let x = 0; x < 16; x++) {
        const alpha = Math.max(0, 0.34 - x * 0.04);
        if (alpha <= 0) continue;
        ctx.fillStyle = `rgba(0, 0, 0, ${alpha})`;
        ctx.fillRect(x, 0, 1, 16);
      }
    }));

    // Dark lip along map-south edge of a ladder tile when the next tile down is a sheer cliff (path reads as “drop, use ladder”).
    this.detailTextures.set('ladder_south_cliff_cue', makeCanvas(ctx => {
      const w = 16;
      const h = 14;
      for (let y = 0; y < h; y++) {
        const t = y / (h - 1);
        const a = (1 - t) * 0.72;
        ctx.fillStyle = `rgba(12, 8, 6, ${a})`;
        ctx.fillRect(0, y, w, 1);
      }
      ctx.fillStyle = 'rgba(0,0,0,0.38)';
      ctx.fillRect(0, h - 2, w, 2);
    }));

    // Whispering Woods - hollow approach band (world y > ~-91, tileY 59–74): faint violet rot on grass,
    // same family as corrupted bridge / deep hollow, weaker than full hollow_blight floor.
    this.detailTextures.set('detail_corruption_mote', makeCanvas(ctx => {
      const g = ctx.createRadialGradient(8, 8, 0, 8, 8, 7.5);
      g.addColorStop(0, 'rgba(175, 110, 205, 0.85)');
      g.addColorStop(0.35, 'rgba(95, 55, 125, 0.45)');
      g.addColorStop(0.7, 'rgba(45, 30, 62, 0.12)');
      g.addColorStop(1, 'rgba(20, 14, 28, 0)');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, 16, 16);
      ctx.fillStyle = 'rgba(220, 190, 245, 0.4)';
      ctx.fillRect(5, 6, 1, 1);
      ctx.fillRect(10, 10, 1, 1);
      ctx.fillRect(7, 11, 1, 1);
    }));

    this.detailTextures.set('detail_corruption_veil', makeCanvas(ctx => {
      const g = ctx.createRadialGradient(8, 10, 0, 8, 10, 9);
      g.addColorStop(0, 'rgba(130, 85, 165, 0.35)');
      g.addColorStop(0.55, 'rgba(70, 48, 92, 0.18)');
      g.addColorStop(1, 'rgba(25, 18, 35, 0)');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, 16, 16);
    }));
  }

  // Shared geometry for all tile meshes
  private readonly sharedTileGeometry = new THREE.PlaneGeometry(this.tileSize, this.tileSize);
  /** Shared 1×1 plane; scaled per edge to plug elevation gaps (see appendTerrainSeamFillers). */
  private readonly elevationFillerGeometry = new THREE.PlaneGeometry(this.tileSize, this.tileSize);
  /** Thin strip across the south edge of a ladder tile (sheer cliff cue). */
  private readonly ladderSouthCueGeometry = new THREE.PlaneGeometry(this.tileSize, 0.2);
  /** Cached gradient strips: kind + variant → texture/material (disposed in dispose()). */
  private seamFillTextureByKey = new Map<string, THREE.CanvasTexture>();
  private seamFillMaterialByKey = new Map<string, THREE.MeshBasicMaterial>();

  private getCachedMaterial(texture: THREE.Texture, cacheKey: string): THREE.MeshBasicMaterial {
    let material = this.materialCache.get(cacheKey);
    if (!material) {
      material = new THREE.MeshBasicMaterial({
        map: texture,
        transparent: false, // Use alpha-tested cutouts instead of transparent sorting for world sprites
        depthWrite: false,
        depthTest: false, // Disable depth test completely for proper transparency
        alphaTest: 0.5, // Discard empty pixels so sprite cutouts don't hide the player
      });
      this.materialCache.set(cacheKey, material);
    }
    return material;
  }

  private acquireMesh(geometry: THREE.BufferGeometry, material: THREE.Material | THREE.Material[]): THREE.Mesh {
    const mesh = this.meshPool.pop() ?? new THREE.Mesh(geometry, material);
    mesh.geometry = geometry;
    mesh.material = material;
    mesh.visible = true;
    mesh.frustumCulled = true;
    mesh.matrixAutoUpdate = true;
    mesh.position.set(0, 0, 0);
    mesh.rotation.set(0, 0, 0);
    mesh.scale.set(1, 1, 1);
    mesh.renderOrder = 0;
    mesh.userData = {};
    return mesh;
  }

  private releaseMesh(mesh: THREE.Mesh): void {
    mesh.parent?.remove(mesh);
    mesh.visible = false;
    mesh.matrixAutoUpdate = false;
    mesh.userData = {};
    if (this.meshPool.length < MAX_MESH_POOL_SIZE) {
      this.meshPool.push(mesh);
    }
  }

  private createPlaneMesh(texture: THREE.Texture, z: number, cacheKey: string): THREE.Mesh {
    const material = this.getCachedMaterial(texture, cacheKey);
    const mesh = this.acquireMesh(this.sharedTileGeometry, material);
    mesh.frustumCulled = true;
    mesh.position.z = z;
    mesh.matrixAutoUpdate = false;
    return mesh;
  }

  private tileKey(tileX: number, tileY: number): number {
    return packTileKey(tileX, tileY);
  }

  private shouldKeepTileActive(tileX: number, tileY: number): boolean {
    if (this.lastChunkCenter.x === -9999 || this.lastChunkCenter.y === -9999) return false;
    return Math.abs(tileX - this.lastChunkCenter.x) <= CULL_RADIUS &&
      Math.abs(tileY - this.lastChunkCenter.y) <= CULL_RADIUS;
  }

  /** True when the live map tile type does not match the rendered mesh (or mesh is missing in view range). */
  isActiveTileMeshStale(tileX: number, tileY: number): boolean {
    const tile = this.map.tiles[tileY]?.[tileX];
    if (!tile) return false;
    const key = this.tileKey(tileX, tileY);
    const object = this.activeMeshes.get(key);
    if (!object) {
      return this.shouldKeepTileActive(tileX, tileY);
    }
    return object.userData?.tileType !== tile.type;
  }

  private removeActiveTileObject(key: number): void {
    const object = this.activeMeshes.get(key);
    if (!object) return;
    this.scene.remove(object);
    this.untrackActiveObject(object);
    this.recycleObject(object);
    this.activeMeshes.delete(key);
  }

  private trackActiveObject(object: THREE.Object3D): void {
    if (object.userData?.isOverlayObject) this.activeOverlayObjectCount++;
    if (object.userData?.overlayCulled) this.activeDecorativeOverlayCullCount++;
  }

  private untrackActiveObject(object: THREE.Object3D): void {
    if (object.userData?.isOverlayObject) {
      this.activeOverlayObjectCount = Math.max(0, this.activeOverlayObjectCount - 1);
    }
    if (object.userData?.overlayCulled) {
      this.activeDecorativeOverlayCullCount = Math.max(0, this.activeDecorativeOverlayCullCount - 1);
    }
  }

  private attachTileObject(tileX: number, tileY: number, object: THREE.Object3D): void {
    const key = this.tileKey(tileX, tileY);
    const existing = this.activeMeshes.get(key);
    if (existing && existing !== object) this.untrackActiveObject(existing);

    const tileType = this.map.tiles[tileY]?.[tileX]?.type ?? 'grass';
    const isOverlay = this.isOverlayTileType(tileType);
    const baseZ = isOverlay ? 0.01 : 0.0;
    const visualYOffset = (this.map.tiles[tileY]?.[tileX]?.elevation ?? 0) * World.ELEVATION_Y_OFFSET;
    const worldOffsetX = -this.map.width / 2;
    const worldOffsetY = -this.map.height / 2;
    object.position.set(worldOffsetX + tileX * this.tileSize, worldOffsetY + tileY * this.tileSize + visualYOffset, baseZ);
    object.userData = {
      ...object.userData,
      tileX,
      tileY,
      visualSignature: this.getTileVisualSignature(this.map.tiles[tileY][tileX], tileX, tileY),
      isOverlayObject: isOverlay,
    };
    // Instanced ground placeholder: register the quad in the instanced layer at this tile's world
    // position (matching the per-mesh base quad: z = -0.5). The placeholder itself renders nothing.
    if (USE_INSTANCED_GROUND && object.userData.instancedGround) {
      const groundType = object.userData.groundType as TileType;
      const texture = this.assetManager.getTexture(groundType);
      if (texture) {
        const matKey = `base_${groundType}`;
        const material = this.getCachedMaterial(texture, matKey);
        const placed = this.groundInstances.set(
          key,
          matKey,
          this.sharedTileGeometry,
          material,
          worldOffsetX + tileX * this.tileSize,
          worldOffsetY + tileY * this.tileSize + visualYOffset,
          -0.5,
        );
        if (placed) {
          object.userData.instancedGroundKey = key;
        } else {
          // Capacity overflow — fall back to a real per-tile quad so nothing goes missing.
          object.userData.instancedGround = false;
          const fallback = this.createPlaneMesh(texture, baseZ - 0.5, matKey);
          fallback.position.set(
            worldOffsetX + tileX * this.tileSize,
            worldOffsetY + tileY * this.tileSize + visualYOffset,
            -0.5,
          );
          fallback.updateMatrix();
          this.scene.add(fallback);
          object.userData.instancedFallbackMesh = fallback;
        }
      }
    }
    if (isOverlay) {
      const sortAnchorY = object.userData?.sortAnchorY ?? 0;
      const worldY = worldOffsetY + tileY * this.tileSize + visualYOffset + sortAnchorY;
      const ySort = Math.round(100000 - worldY * 10 + (object.userData?.renderOrderBias ?? 0));
      this.applyOverlayRenderOrder(object, ySort);
    } else if (WATER_BRIDGE_TILES.has(tileType)) {
      if (object instanceof THREE.Group) {
        for (const child of object.children) {
          child.renderOrder = 55000;
        }
      } else {
        object.renderOrder = 55000;
      }
    }
    object.updateMatrix();
    if (object instanceof THREE.Group) object.updateMatrixWorld(false);
    this.scene.add(object);
    this.activeMeshes.set(key, object);
    this.trackActiveObject(object);
  }

  private refreshTileRegion(
    minTileX: number,
    minTileY: number,
    maxTileX: number,
    maxTileY: number,
    options?: { forceAttach?: boolean },
  ): void {
    this.mapRevision += 1;
    this.map.revision = this.mapRevision;
    this.interactableCache = null;
    const clampedMinX = Math.max(0, minTileX);
    const clampedMinY = Math.max(0, minTileY);
    const clampedMaxX = Math.min(this.map.width - 1, maxTileX);
    const clampedMaxY = Math.min(this.map.height - 1, maxTileY);
    if (clampedMinX > clampedMaxX || clampedMinY > clampedMaxY) return;

    const forceAttach = options?.forceAttach === true;

    this.pendingTiles = this.pendingTiles.filter(({ x, y }) =>
      x < clampedMinX || x > clampedMaxX || y < clampedMinY || y > clampedMaxY
    );
    const pendingTileKeys = new Set(this.pendingTiles.map(({ key }) => key));

    for (let y = clampedMinY; y <= clampedMaxY; y++) {
      for (let x = clampedMinX; x <= clampedMaxX; x++) {
        const key = this.tileKey(x, y);
        const tile = this.map.tiles[y]?.[x];
        const existing = this.activeMeshes.get(key);
        if (!forceAttach && existing && tile && existing.userData?.visualSignature === this.getTileVisualSignature(tile, x, y)) {
          continue;
        }
        this.removeActiveTileObject(key);
        if (!forceAttach && !this.shouldKeepTileActive(x, y)) {
          if (tile && !pendingTileKeys.has(key)) {
            this.pendingTiles.push({ x, y, key });
            pendingTileKeys.add(key);
          }
          continue;
        }

        if (!tile) continue;
        const object = this.createTileObject(tile, x, y);
        if (!object) continue;
        this.attachTileObject(x, y, object);
      }
    }
  }

  private setRenderRole(object: THREE.Object3D, role: 'ground' | 'overlay'): void {
    object.userData = {
      ...object.userData,
      renderRole: role,
    };
  }

  private applyOverlayRenderOrder(object: THREE.Object3D, ySort: number): void {
    if (!(object instanceof THREE.Group)) {
      object.renderOrder = ySort;
      return;
    }

    object.renderOrder = 0;
    for (const child of object.children) {
      child.renderOrder = child.userData?.renderRole === 'overlay' ? ySort : 0;
    }
  }

  private createDetailDecal(tileX: number, tileY: number, tileType: TileType): THREE.Mesh | null {
    const config = DETAIL_CONFIG[tileType];
    if (!config) return null;

    const h = tileHash(tileX, tileY);
    if (h > config.chance) return null;

    const typeIndex = Math.floor(tileHash(tileX, tileY, 7) * config.types.length);
    const detailType = config.types[typeIndex];
    const tex = this.detailTextures.get(detailType);
    if (!tex) return null;

    const cacheKey = `detail_${detailType}_${Math.floor(config.opacity * 10)}`;
    let mat = this.materialCache.get(cacheKey);
    if (!mat) {
      mat = new THREE.MeshBasicMaterial({
        map: tex,
        transparent: true,
        opacity: config.opacity,
        depthWrite: false,
        depthTest: false, // Disable depth test completely for proper transparency
        alphaTest: 0.5, // Keep detail decals as cutout sprites too
      });
      this.materialCache.set(cacheKey, mat);
    }

    const mesh = this.acquireMesh(this.detailGeometry, mat);
    mesh.frustumCulled = true;
    mesh.matrixAutoUpdate = false;

    const offsetX = (tileHash(tileX, tileY, 3) - 0.5) * 0.5;
    const offsetY = (tileHash(tileX, tileY, 5) - 0.5) * 0.5;
    const rot = tileHash(tileX, tileY, 11) * Math.PI * 2;
    const s = config.scale * (0.8 + tileHash(tileX, tileY, 13) * 0.4);

    mesh.position.set(offsetX, offsetY, -0.3);
    mesh.rotation.z = rot;
    mesh.scale.set(s, s, 1);

    return mesh;
  }

  /**
   * Between the river / bridge approach and the full deep-hollow floor (tileY < 59, world y about -91 and north):
   * sparse purple corruption motes on grass - gradual ramp toward `hollow_blight`.
   */
  private createHollowTransitionCorruptionDecals(tileX: number, tileY: number, tileType: TileType): THREE.Group | null {
    if (this.map.name !== 'Whispering Woods') return null;
    if (tileType !== 'dark_grass' && tileType !== 'grass' && tileType !== 'tall_grass') return null;
    if (tileY < 59 || tileY > 74) return null;

    const depthT = (74 - tileY) / 15;
    const passChance = 0.1 + depthT * 0.38;
    if (tileHash(tileX, tileY, 501) > passChance) return null;

    const count = tileHash(tileX, tileY, 502) < 0.42 + depthT * 0.38 ? 2 : 1;
    const opacityBase = 0.14 + depthT * 0.24;
    const group = new THREE.Group();
    group.matrixAutoUpdate = false;

    const addMesh = (variant: 'mote' | 'veil', idx: number) => {
      const tex = this.detailTextures.get(variant === 'mote' ? 'detail_corruption_mote' : 'detail_corruption_veil');
      if (!tex) return;
      const op = Math.min(0.45, opacityBase + idx * 0.07);
      const matKey = `hollow_corrupt_${variant}_${Math.round(op * 40)}`;
      let mat = this.materialCache.get(matKey);
      if (!mat) {
        mat = new THREE.MeshBasicMaterial({
          map: tex,
          transparent: true,
          opacity: op,
          depthWrite: false,
          depthTest: false,
          alphaTest: 0.03,
        });
        this.materialCache.set(matKey, mat);
      }
      const mesh = this.acquireMesh(this.detailGeometry, mat);
      mesh.frustumCulled = true;
      mesh.matrixAutoUpdate = false;
      const hx = (tileHash(tileX, tileY, 510 + idx) - 0.5) * 0.48;
      const hy = (tileHash(tileX, tileY, 520 + idx) - 0.5) * 0.48;
      const baseSc = variant === 'mote' ? 1.1 + tileHash(tileX, tileY, 530 + idx) * 0.55 : 1.55 + tileHash(tileX, tileY, 531 + idx) * 0.45;
      mesh.position.set(hx, hy, -0.28);
      mesh.scale.set(baseSc, baseSc, 1);
      mesh.rotation.z = tileHash(tileX, tileY, 540 + idx) * Math.PI * 2;
      this.setRenderRole(mesh, 'overlay');
      mesh.updateMatrix();
      group.add(mesh);
    };

    addMesh('mote', 0);
    if (count > 1) addMesh('veil', 1);

    if (group.children.length === 0) return null;
    return group;
  }

  /**
   * Violet corruption halo rendered directly on the heresy_altar overlay tile.
   * Scatters motes and a broad veil in a ring around the altar's footprint.
   */
  private createHeresyAltarSelfAura(tileX: number, tileY: number): THREE.Group | null {
    const moteTex = this.detailTextures.get('detail_corruption_mote');
    const veilTex = this.detailTextures.get('detail_corruption_veil');
    if (!moteTex) return null;

    const makeMat = (variant: 'mote' | 'veil', opacity: number): THREE.MeshBasicMaterial => {
      const key = `heresy_aura_${variant}_${Math.round(opacity * 100)}`;
      let mat = this.materialCache.get(key);
      if (!mat) {
        mat = new THREE.MeshBasicMaterial({
          map: variant === 'mote' ? moteTex : (veilTex ?? moteTex),
          transparent: true,
          opacity,
          depthWrite: false,
          depthTest: false,
          alphaTest: 0.02,
        });
        this.materialCache.set(key, mat);
      }
      return mat;
    };

    const group = new THREE.Group();
    group.matrixAutoUpdate = false;

    // Broad veil underneath - covers the altar base
    const veilMat = makeMat('veil', 0.38);
    const veil = this.acquireMesh(this.detailGeometry, veilMat);
    veil.frustumCulled = true;
    veil.matrixAutoUpdate = false;
    veil.position.set(0, 0.05, 0.12);
    veil.scale.set(2.2, 2.2, 1);
    veil.rotation.z = tileHash(tileX, tileY, 800) * Math.PI * 2;
    this.setRenderRole(veil, 'overlay');
    veil.updateMatrix();
    group.add(veil);

    // Ring of 6 motes scattered at ~0.35 radius
    const MOTE_COUNT = 6;
    for (let i = 0; i < MOTE_COUNT; i++) {
      const angle = (i / MOTE_COUNT) * Math.PI * 2 + tileHash(tileX, tileY, 810 + i) * 0.9;
      const r = 0.28 + tileHash(tileX, tileY, 820 + i) * 0.22;
      const mx = Math.cos(angle) * r;
      const my = Math.sin(angle) * r * 0.6; // flatten for isometric feel
      const moteMat = makeMat('mote', 0.42 + tileHash(tileX, tileY, 830 + i) * 0.18);
      const mote = this.acquireMesh(this.detailGeometry, moteMat);
      mote.frustumCulled = true;
      mote.matrixAutoUpdate = false;
      mote.position.set(mx, my + 0.08, 0.14 + i * 0.005);
      const sc = 1.1 + tileHash(tileX, tileY, 840 + i) * 0.5;
      mote.scale.set(sc, sc, 1);
      mote.rotation.z = tileHash(tileX, tileY, 850 + i) * Math.PI * 2;
      this.setRenderRole(mote, 'overlay');
      mote.updateMatrix();
      group.add(mote);
    }

    return group;
  }

  /** @deprecated No longer used - aura now renders on the altar itself via createHeresyAltarSelfAura */
  private createHeresyAltarAuraDecals(_tileX: number, _tileY: number): THREE.Group | null {
    return null;
  }

  private createShadowMesh(textureKey: string, opacity: number, rotation: number = 0, flipX: boolean = false): THREE.Mesh | null {
    const tex = this.detailTextures.get(textureKey);
    if (!tex) return null;

    const cacheKey = `shadow_${textureKey}_${Math.round(opacity * 100)}`;
    let mat = this.materialCache.get(cacheKey);
    if (!mat) {
      mat = new THREE.MeshBasicMaterial({
        map: tex,
        transparent: true,
        opacity,
        depthWrite: false,
        depthTest: false,
        alphaTest: 0.02,
      });
      this.materialCache.set(cacheKey, mat);
    }

    const mesh = this.acquireMesh(this.shadowGeometry, mat);
    mesh.frustumCulled = true;
    mesh.matrixAutoUpdate = false;
    mesh.position.set(0, 0, -0.32);
    mesh.rotation.z = rotation;
    mesh.scale.set(flipX ? -1 : 1, 1, 1);
    return mesh;
  }

  private createElevationShadow(tileX: number, tileY: number, tile: Tile): THREE.Object3D | null {
    const currentElevation = tile.elevation ?? 0;
    const shadowGroup = this.overlayPool.pop() ?? new THREE.Group();
    shadowGroup.clear();
    shadowGroup.matrixAutoUpdate = false;

    let hasShadow = false;
    const northElevation = tileY > 0 ? (this.map.tiles[tileY - 1]?.[tileX]?.elevation ?? 0) : currentElevation;
    const westElevation = tileX > 0 ? (this.map.tiles[tileY]?.[tileX - 1]?.elevation ?? 0) : currentElevation;
    const eastElevation = tileX < this.map.width - 1 ? (this.map.tiles[tileY]?.[tileX + 1]?.elevation ?? 0) : currentElevation;

    if (northElevation > currentElevation) {
      const mesh = this.createShadowMesh('height_shadow_top', Math.min(0.34, 0.18 + (northElevation - currentElevation) * 0.1));
      if (mesh) {
        mesh.updateMatrix();
        shadowGroup.add(mesh);
        hasShadow = true;
      }
    }

    if (westElevation > currentElevation) {
      const mesh = this.createShadowMesh('height_shadow_side', Math.min(0.22, 0.1 + (westElevation - currentElevation) * 0.06));
      if (mesh) {
        mesh.position.z = -0.31;
        mesh.updateMatrix();
        shadowGroup.add(mesh);
        hasShadow = true;
      }
    }

    if (eastElevation > currentElevation) {
      const mesh = this.createShadowMesh('height_shadow_side', Math.min(0.22, 0.1 + (eastElevation - currentElevation) * 0.06), 0, true);
      if (mesh) {
        mesh.position.z = -0.31;
        mesh.updateMatrix();
        shadowGroup.add(mesh);
        hasShadow = true;
      }
    }

    if (!hasShadow) {
      this.overlayPool.push(shadowGroup);
      return null;
    }

    shadowGroup.userData = {
      tileType: `${tile.type}_shadow`,
      sortAnchorY: null,
    };
    return shadowGroup;
  }

  private isOverlayTileType(type: TileType): boolean {
    return Boolean(TILE_METADATA[type]?.isOverlay) || HEIGHT_TILE_TYPES.has(type);
  }

  private isDecorativeOverlayCullCandidate(tile: Tile): boolean {
    if (!this.isOverlayTileType(tile.type)) return false;
    if (HEIGHT_TILE_TYPES.has(tile.type)) return false;
    if (tile.interactable || tile.transition) return false;
    if (OVERLAY_CULL_EXEMPT_TILE_TYPES.has(tile.type)) return false;
    const metadata = TILE_METADATA[tile.type];
    if (metadata?.foundation) return false;
    return true;
  }

  private shouldCullDecorativeOverlay(tile: Tile, tileX?: number, tileY?: number): boolean {
    if (tileX === undefined || tileY === undefined) return false;
    if (!this.isDecorativeOverlayCullCandidate(tile)) return false;
    if (this.renderCenter.x === -9999 || this.renderCenter.y === -9999) return false;
    return Math.abs(tileX - this.renderCenter.x) > DECORATIVE_OVERLAY_NEAR_RADIUS ||
      Math.abs(tileY - this.renderCenter.y) > DECORATIVE_OVERLAY_NEAR_RADIUS;
  }

  // FNV-1a 32-bit folding helpers. A trailing field-separator fold mirrors the old '|' join so
  // distinct field boundaries can't collide (e.g. "ab"+"c" vs "a"+"bc").
  private hashFoldStr(h: number, s: string): number {
    for (let i = 0; i < s.length; i++) {
      h = Math.imul(h ^ s.charCodeAt(i), 0x01000193) >>> 0;
    }
    return Math.imul(h ^ 0x7c /* '|' */, 0x01000193) >>> 0;
  }

  private hashFoldNum(h: number, n: number): number {
    h = Math.imul(h ^ (n | 0), 0x01000193) >>> 0;
    return Math.imul(h ^ 0x7c, 0x01000193) >>> 0;
  }

  /**
   * Numeric visual signature for a tile. Previously this built a 12-element array and joined it
   * into a string on every call; that ran for every active mesh on every full chunk update
   * (every 2 tiles of movement), allocating thousands of strings/arrays per second while moving
   * and driving GC stutter. This folds the identical inputs into an allocation-free 32-bit hash.
   * Collision risk (~1/2^32 per comparison) is negligible and its only effect would be a tile
   * keeping a stale visual until its next genuine change.
   */
  private getTileVisualSignature(tile: Tile, tileX: number, tileY: number): number {
    const overlayCulled = this.shouldCullDecorativeOverlay(tile, tileX, tileY);
    const overlayTextureId = getOverlayTextureId(tile.type, tileX, tileY);
    const baseType = this.isOverlayTileType(tile.type)
      ? tile.baseTile ?? this.resolveBaseTileType(tileX, tileY, TILE_METADATA[tile.type]?.baseTile ?? 'grass')
      : tile.type;

    let h = 0x811c9dc5;
    h = this.hashFoldStr(h, tile.type);
    h = this.hashFoldNum(h, tile.walkable ? 1 : 0);
    h = this.hashFoldNum(h, tile.elevation ?? 0);
    h = this.hashFoldStr(h, tile.baseTile ?? '');
    h = this.hashFoldStr(h, tile.stairAxis ?? '');
    h = this.hashFoldNum(h, tile.interactable ? 1 : 0);
    h = this.hashFoldStr(h, tile.interactionId ?? '');
    if (tile.transition) {
      h = this.hashFoldStr(h, tile.transition.targetMap);
      h = this.hashFoldNum(h, tile.transition.targetX);
      h = this.hashFoldNum(h, tile.transition.targetY);
    } else {
      h = this.hashFoldNum(h, 0);
    }
    h = this.hashFoldNum(h, tile.hidden ? 1 : 0);
    h = this.hashFoldStr(h, overlayTextureId);
    h = this.hashFoldStr(h, baseType);
    h = this.hashFoldNum(h, overlayCulled ? 1 : 0);
    return h >>> 0;
  }

  private resolveBaseTileType(tileX: number, tileY: number, fallback: TileType = 'dirt'): TileType {
    const neighbors: TileType[] = [];
    for (const [dx, dy] of [[0, 1], [0, -1], [1, 0], [-1, 0]] as const) {
      const nx = tileX + dx;
      const ny = tileY + dy;
      if (ny < 0 || ny >= this.map.height || nx < 0 || nx >= this.map.width) continue;
      const neighborType = this.map.tiles[ny][nx]?.type;
      if (!neighborType) continue;
      if (!this.isOverlayTileType(neighborType)) neighbors.push(neighborType);
    }

    if (neighbors.length === 0) return fallback;

    const counts = new Map<TileType, number>();
    for (const neighborType of neighbors) {
      counts.set(neighborType, (counts.get(neighborType) || 0) + 1);
    }

    let best = neighbors[0];
    let bestCount = 0;
    for (const [type, count] of counts) {
      if (count > bestCount) {
        best = type;
        bestCount = count;
      }
    }

    return best;
  }

  private createHeightTileObject(tile: Tile, tileX?: number, tileY?: number): THREE.Object3D | null {
    const overlayTextureId = getOverlayTextureId(tile.type, tileX, tileY);
    const overlayTexture = this.assetManager.getTexture(overlayTextureId) ?? this.assetManager.getTexture(tile.type);
    if (!overlayTexture) return null;

    const baseType = tile.baseTile ?? (tileX !== undefined && tileY !== undefined
      ? this.resolveBaseTileType(tileX, tileY, tile.type === 'stairs' ? 'dirt' : 'grass')
      : (tile.type === 'stairs' ? 'dirt' : 'grass'));
    const baseTexture = this.assetManager.getTexture(baseType);
    if (!baseTexture) return null;

    const group = this.overlayPool.pop() ?? new THREE.Group();
    group.clear();
    group.matrixAutoUpdate = false;

    let scale = 1.0;
    let yOffset = 0;
    let sortTrim = 0.16;

    if (tile.type === 'cliff' || tile.type === 'cliff_corrupted') {
      scale = 2.4;
      yOffset = 0.76;
      sortTrim = 0.04;
    } else if (tile.type === 'cliff_edge' || tile.type === 'cliff_edge_corrupted' || tile.type === 'cliff_edge_plains') {
      scale = 2.0;
      yOffset = 0.55;
      sortTrim = 0.05;
    } else if (tile.type === 'ladder') {
      scale = 1.72;
      yOffset = 0.22;
      sortTrim = 0.07;
    } else if (tile.type === 'curled_ladder') {
      scale = 1.2;
      yOffset = 0.1;
      sortTrim = 0.1;
    } else if (tile.type === 'gate_ladder') {
      scale = 1.5;
      yOffset = 0.18;
      sortTrim = 0.08;
    } else if (tile.type === 'gate_ladder_open') {
      // Taller than plain ladder so the bottom hangs ~half a tile further south off the cliff edge.
      scale = 2.4;
      yOffset = 0.2;
      sortTrim = 0.06;
    } else {
      scale = 1.42;
      yOffset = 0.16;
      sortTrim = 0.12;
    }

    const sortAnchorY = yOffset - scale * 0.5 + sortTrim;
    const isCliffArt = tile.type === 'cliff' || tile.type === 'cliff_edge'
      || tile.type === 'cliff_corrupted' || tile.type === 'cliff_edge_corrupted'
      || tile.type === 'cliff_edge_plains';
    group.userData = {
      tileType: tile.type,
      sortAnchorY,
      ...(isCliffArt ? { renderOrderBias: -50000 } : {}),
    };

    const baseMesh = this.createPlaneMesh(baseTexture, -0.5, `base_${baseType}`);
    const overlayMesh = this.createPlaneMesh(overlayTexture, 0.1, `height_${tile.type}`);
    this.setRenderRole(baseMesh, 'ground');
    this.setRenderRole(overlayMesh, 'overlay');
    overlayMesh.scale.set(1, scale, 1);
    overlayMesh.position.y = yOffset;
    if (tile.type === 'ladder' || tile.type === 'gate_ladder' || tile.type === 'gate_ladder_open') {
      overlayMesh.position.x = 0.06; // Visually shift ladder slightly east to center in oblique cliff gaps
    }
    if (tile.type === 'stairs' && tile.stairAxis === 'ew') {
      overlayMesh.rotation.z = Math.PI / 2;
    }

    baseMesh.updateMatrix();
    overlayMesh.updateMatrix();
    group.add(baseMesh, overlayMesh);
    if ((tile.type === 'ladder' || tile.type === 'gate_ladder_open') && tileX !== undefined && tileY !== undefined) {
      this.appendLadderSouthCliffCue(group, tileX, tileY);
    }
    return group;
  }

  /**
   * Elevation UX: stampCliffs only covers “north tile higher than south”. Offset-based drawing still
   * leaves gaps when a neighbor to the south OR east is higher. We only add strips from the **lower**
   * tile toward the higher one (south edge or east edge) so each internal boundary is drawn once.
   * Textures are small vertical gradients + noise per terrain family so seams read as soil/rock, not UI.
   */
  private seamTerrainKind(tile: Tile, tileX: number, tileY: number): string {
    const base: TileType = TILE_METADATA[tile.type]?.isOverlay
      ? this.resolveBaseTileType(tileX, tileY, TILE_METADATA[tile.type]?.baseTile ?? 'grass')
      : tile.type;
    if (base === 'water' || base === 'water_corrupted' || base === 'waterfall') return 'swamp';
    if (base === 'swamp') return 'swamp';
    if (base === 'snow' || base === 'ice') return 'snow';
    if (base === 'ruins_floor') return 'ruins';
    if (base === 'mossy_stone' || base === 'ruined_fort_wall' || base === 'ruined_fort_wall_mossy' ||
        base === 'cobblestone' || base === 'stone' || base === 'wooden_path') return 'stone';
    if (base === 'dirt' || base === 'sand' || base === 'wood' || base === 'wood_floor' || base === 'farmland' || base === 'ash') return 'dirt';
    if (base === 'hollow_blight') return 'hollow_blight';
    if (base === 'dark_grass' || base === 'tall_grass') return 'forest_floor';
    return 'grass';
  }

  private createSeamGradientCanvasTexture(kind: string, variant: number): THREE.CanvasTexture {
    const W = 8;
    const H = 80;
    const canvas = document.createElement('canvas');
    canvas.width = W;
    canvas.height = H;
    const ctx = canvas.getContext('2d')!;
    const PAL: Record<string, [[number, number, number], [number, number, number]]> = {
      grass: [
        [82, 148, 88],
        [32, 58, 38],
      ],
      forest_floor: [
        [54, 104, 62],
        [24, 44, 30],
      ],
      hollow_blight: [
        [196, 188, 158],
        [92, 84, 70],
      ],
      dirt: [
        [124, 96, 70],
        [56, 42, 30],
      ],
      stone: [
        [102, 104, 108],
        [46, 48, 52],
      ],
      swamp: [
        [62, 102, 84],
        [28, 52, 44],
      ],
      ruins: [
        [92, 88, 108],
        [40, 38, 52],
      ],
      snow: [
        [220, 228, 236],
        [148, 162, 176],
      ],
    };
    const pair = PAL[kind] ?? PAL.grass;
    const top = pair[0];
    const bot = pair[1];
    const vr = variant * 19.1;
    const clamp = (n: number) => Math.max(0, Math.min(255, Math.round(n)));
    for (let y = 0; y < H; y++) {
      const u = y / (H - 1);
      // Ease-in curve so the bottom half darkens faster, reinforcing a shadow drop
      const ue = u * u;
      const n =
        Math.sin(y * 0.55 + vr) * 7 +
        Math.sin(y * 1.4 + vr * 1.7) * 5 +
        (tileHash(variant, y, 2) - 0.5) * 12;
      const r = top[0] * (1 - ue) + bot[0] * ue + n;
      const g = top[1] * (1 - ue) + bot[1] * ue + n * 0.92;
      const b = top[2] * (1 - ue) + bot[2] * ue + n * 0.88;
      ctx.fillStyle = `rgb(${clamp(r)},${clamp(g)},${clamp(b)})`;
      ctx.fillRect(0, y, W, 1);
    }
    // Dark seam rows scattered through the gradient for rock-strata feel
    for (let s = 0; s < 8; s++) {
      const yy = Math.floor(tileHash(variant, s, 11) * H);
      ctx.fillStyle = `rgba(0,0,0,${0.10 + tileHash(s, variant, 5) * 0.15})`;
      ctx.fillRect(0, yy, W, 1);
    }
    // Extra hard shadow at the very bottom edge (base of the drop)
    ctx.fillStyle = 'rgba(0,0,0,0.45)';
    ctx.fillRect(0, H - 2, W, 2);
    const tex = new THREE.CanvasTexture(canvas);
    tex.magFilter = THREE.NearestFilter;
    tex.minFilter = THREE.NearestFilter;
    tex.wrapS = THREE.ClampToEdgeWrapping;
    tex.wrapT = THREE.ClampToEdgeWrapping;
    tex.needsUpdate = true;
    return tex;
  }

  private getSeamFillMaterial(kind: string, variant: number): THREE.MeshBasicMaterial {
    const key = `${kind}_v${variant}`;
    let mat = this.seamFillMaterialByKey.get(key);
    if (!mat) {
      let tex = this.seamFillTextureByKey.get(key);
      if (!tex) {
        tex = this.createSeamGradientCanvasTexture(kind, variant);
        this.seamFillTextureByKey.set(key, tex);
      }
      mat = new THREE.MeshBasicMaterial({
        map: tex,
        depthWrite: true,
        depthTest: true,
      });
      this.seamFillMaterialByKey.set(key, mat);
    }
    return mat;
  }

  private appendTerrainSeamFillers(parent: THREE.Group, tile: Tile, tileX: number, tileY: number): void {
    const waterTile = WATER_BRIDGE_TILES.has(tile.type);
    const me = tile.elevation ?? 0;
    const kind = this.seamTerrainKind(tile, tileX, tileY);
    // Height tiles (cliff_edge, cliff body, etc.) only participate in the south→north
    // seam so that an elevation jump *within* a cliff_face feature (e.g. el0 cliff body
    // tile adjacent to an el1 tile above it) doesn't leave a sky-coloured strip.
    // All other seam directions are either handled by the adjacent non-height tile or
    // are already covered by the cliff sprite itself.
    const heightTile = HEIGHT_TILE_TYPES.has(tile.type);

    const addSouth = () => {
      if (tileY >= this.map.height - 1) return;
      const nb = this.map.tiles[tileY + 1]?.[tileX];
      if (!nb) return;
      if (WATER_BRIDGE_TILES.has(nb.type)) return;
      const ne = nb.elevation ?? 0;
      if (HEIGHT_TILE_TYPES.has(nb.type) && (ne <= me || waterTile)) return;
      if (ne <= me) return;
      const gap = (ne - me) * World.ELEVATION_Y_OFFSET;
      if (gap < 0.02) return;
      // Bank drop onto water/bridge: tint the filler with the bank's terrain (not the water's
      // swamp palette) so the shelf face reads as earth above the waterline.
      const fillKind = waterTile ? this.seamTerrainKind(nb, tileX, tileY + 1) : kind;
      const variant = Math.floor(tileHash(tileX, tileY, 201) * 6);
      const mesh = this.acquireMesh(this.elevationFillerGeometry, this.getSeamFillMaterial(fillKind, variant));
      this.setRenderRole(mesh, 'ground');
      mesh.scale.set(1, gap, 1);
      mesh.position.set(0, this.tileSize * 0.5 + gap * 0.5, 0.04);
      mesh.frustumCulled = true;
      mesh.matrixAutoUpdate = false;
      mesh.updateMatrix();
      parent.add(mesh);
    };

    const addEast = () => {
      if (tileX >= this.map.width - 1) return;
      const nb = this.map.tiles[tileY]?.[tileX + 1];
      if (!nb) return;
      if (WATER_BRIDGE_TILES.has(nb.type)) return;
      const ne = nb.elevation ?? 0;
      if (HEIGHT_TILE_TYPES.has(nb.type) && ne <= me) return;
      if (ne <= me) return;
      const gap = (ne - me) * World.ELEVATION_Y_OFFSET;
      if (gap < 0.02) return;
      const variant = Math.floor(tileHash(tileX, tileY, 307) * 6);
      const mesh = this.acquireMesh(this.elevationFillerGeometry, this.getSeamFillMaterial(kind, variant));
      this.setRenderRole(mesh, 'ground');
      mesh.scale.set(gap, 1, 1);
      mesh.position.set(this.tileSize * 0.5 + gap * 0.5, 0, 0.04);
      mesh.frustumCulled = true;
      mesh.matrixAutoUpdate = false;
      mesh.updateMatrix();
      parent.add(mesh);
    };

    const addNorth = () => {
      if (tileY <= 0) return;
      const nb = this.map.tiles[tileY - 1]?.[tileX];
      if (!nb) return;
      // Do NOT skip when the north neighbour is water at higher elevation - that gap must be
      // filled with terrain seam texture to avoid sky showing through below the water surface.
      // (The symmetric south-bank case: cliff tiles use the water-bridge skip in addSouth, which
      //  is intentional since the cliff sprite already covers that face.)
      const ne = nb.elevation ?? 0;
      if (HEIGHT_TILE_TYPES.has(nb.type) && ne <= me) return;
      if (ne <= me) return;
      const gap = (ne - me) * World.ELEVATION_Y_OFFSET;
      if (gap < 0.02) return;
      const variant = Math.floor(tileHash(tileX, tileY, 113) * 6);
      const mesh = this.acquireMesh(this.elevationFillerGeometry, this.getSeamFillMaterial(kind, variant));
      this.setRenderRole(mesh, 'ground');
      mesh.scale.set(1, gap, 1);
      mesh.position.set(0, -(this.tileSize * 0.5 + gap * 0.5), 0.04);
      mesh.frustumCulled = true;
      mesh.matrixAutoUpdate = false;
      mesh.updateMatrix();
      parent.add(mesh);
    };

    const addWest = () => {
      if (tileX <= 0) return;
      const nb = this.map.tiles[tileY]?.[tileX - 1];
      if (!nb) return;
      if (WATER_BRIDGE_TILES.has(nb.type)) return;
      const ne = nb.elevation ?? 0;
      if (HEIGHT_TILE_TYPES.has(nb.type) && ne <= me) return;
      if (ne <= me) return;
      const gap = (ne - me) * World.ELEVATION_Y_OFFSET;
      if (gap < 0.02) return;
      const variant = Math.floor(tileHash(tileX, tileY, 419) * 6);
      const mesh = this.acquireMesh(this.elevationFillerGeometry, this.getSeamFillMaterial(kind, variant));
      this.setRenderRole(mesh, 'ground');
      mesh.scale.set(gap, 1, 1);
      mesh.position.set(-(this.tileSize * 0.5 + gap * 0.5), 0, 0.04);
      mesh.frustumCulled = true;
      mesh.matrixAutoUpdate = false;
      mesh.updateMatrix();
      parent.add(mesh);
    };

    if (waterTile) {
      // Water/bridge tiles normally rely on bank/cliff art to cover elevation faces, but when a
      // plain walkable bank at higher elevation sits directly behind (screen-north, row ty+1,
      // no cliff sprite), the elevated row leaves a sky strip along the waterline — fill just
      // that gap.
      addSouth();
      return;
    }
    addSouth();
    if (!heightTile) {
      addEast();
      addNorth();
      addWest();
    }
  }

  /** When a ladder sits on a ledge and map-south is an unwalkable cliff, darken the south lip so the sheer face reads clearly. */
  private appendLadderSouthCliffCue(group: THREE.Group, tileX: number, tileY: number): void {
    const ty = tileY + 1;
    if (ty >= this.map.height) return;
    const south = this.map.tiles[ty]?.[tileX];
    if (!south) return;
    const sheer =
      (south.type === 'cliff' || south.type === 'cliff_edge'
        || south.type === 'cliff_corrupted' || south.type === 'cliff_edge_corrupted'
        || south.type === 'cliff_edge_plains') &&
      !south.transition &&
      !this.isTileWalkable(south);
    if (!sheer) return;

    const tex = this.detailTextures.get('ladder_south_cliff_cue');
    if (!tex) return;

    const mat = this.getCachedMaterial(tex, 'ladder_south_cliff_cue');
    mat.transparent = true;
    mat.depthWrite = false;
    const mesh = this.acquireMesh(this.ladderSouthCueGeometry, mat);
    this.setRenderRole(mesh, 'overlay');
    mesh.position.set(0, -this.tileSize * 0.5 + 0.1, 0.125);
    mesh.renderOrder = 2;
    mesh.updateMatrix();
    group.add(mesh);
  }

  /** Spent ritual: grass underfoot + ash noise texture clipped to the sigil mask (no flat grey sprite / pad). */
  private createDudRitualTileObject(tile: Tile, tileX: number, tileY: number): THREE.Object3D | null {
    const ashTexture = this.assetManager.getTexture('ash');
    const maskTexture = this.assetManager.getTexture('summoning_ritual_dud');
    const baseType = this.resolveBaseTileType(
      tileX,
      tileY,
      TILE_METADATA.summoning_ritual_dud?.baseTile ?? 'grass',
    );
    const baseTexture = this.assetManager.getTexture(baseType);
    if (!ashTexture || !maskTexture || !baseTexture) return null;

    const baseScale = TILE_METADATA.summoning_ritual_dud?.scale ?? 1.0;
    const isOverworldMap = this.map.width >= 80 || this.map.height >= 80;
    const structureScaleBoost = isOverworldMap && OVERWORLD_STRUCTURE_TILE_TYPES.has('summoning_ritual_dud')
      ? OVERWORLD_STRUCTURE_SCALE_MULTIPLIER
      : 1;
    const scale = baseScale * structureScaleBoost;
    const sortTrim = TILE_METADATA.summoning_ritual_dud?.sortTrim ?? 0.16;
    const yOffset = TILE_METADATA.summoning_ritual_dud?.yOffset ?? ((scale - 1) * this.tileSize * 0.3);
    const sortAnchorY = ((scale - 1) * this.tileSize * 0.3) - (scale * 0.5) + sortTrim;

    const group = this.overlayPool.pop() ?? new THREE.Group();
    group.clear();
    group.matrixAutoUpdate = false;
    group.userData = {
      tileType: tile.type,
      sortAnchorY,
      renderOrderBias: 800,
    };

    const baseMesh = this.createPlaneMesh(baseTexture, -0.5, `base_${baseType}`);
    this.setRenderRole(baseMesh, 'ground');

    const materialKey = 'overlay_dud_ash_sigil';
    let sigilMaterial = this.materialCache.get(materialKey);
    if (!sigilMaterial) {
      sigilMaterial = new THREE.MeshBasicMaterial({
        map: ashTexture,
        alphaMap: maskTexture,
        transparent: true,
        depthWrite: false,
        depthTest: false,
        alphaTest: 0.05,
      });
      this.materialCache.set(materialKey, sigilMaterial);
    }
    const overlayMesh = this.acquireMesh(this.sharedTileGeometry, sigilMaterial);
    overlayMesh.position.z = 0.1;
    overlayMesh.scale.set(scale, scale, 1);
    overlayMesh.position.y = yOffset;
    this.setRenderRole(overlayMesh, 'overlay');
    overlayMesh.updateMatrix();

    baseMesh.updateMatrix();
    group.add(baseMesh, overlayMesh);
    this.appendTerrainSeamFillers(group, tile, tileX, tileY);
    return group;
  }

  private createTileObject(tile: Tile, tileX?: number, tileY?: number): THREE.Object3D | null {
    if (HEIGHT_TILE_TYPES.has(tile.type)) {
      return this.createHeightTileObject(tile, tileX, tileY);
    }

    if (tile.type === 'summoning_ritual_dud' && tileX !== undefined && tileY !== undefined) {
      return this.createDudRitualTileObject(tile, tileX, tileY);
    }

    const isOverlay = TILE_METADATA[tile.type]?.isOverlay;

    if (!isOverlay) {
      const texture = this.assetManager.getTexture(tile.type);
      if (!texture) return null;
      
      if (tileX !== undefined && tileY !== undefined && tile.walkable) {
        const shadow = this.createElevationShadow(tileX, tileY, tile);
        const decal = this.createDetailDecal(tileX, tileY, tile.type);
        const hollowRot = this.createHollowTransitionCorruptionDecals(tileX, tileY, tile.type);
        if (shadow || decal || hollowRot) {
          const group = this.overlayPool.pop() ?? new THREE.Group();
          group.clear();
          group.matrixAutoUpdate = false;
          group.userData = {
            tileType: tile.type,
            sortAnchorY: null,
          };
          const baseMesh = this.createPlaneMesh(texture, -0.5, `base_${tile.type}`);
          baseMesh.updateMatrix();
          group.add(baseMesh);
          this.appendTerrainSeamFillers(group, tile, tileX, tileY);
          if (shadow instanceof THREE.Group) {
            for (const child of shadow.children) {
              group.add(child);
            }
            shadow.clear();
            this.overlayPool.push(shadow);
          } else if (shadow) {
            shadow.updateMatrix();
            group.add(shadow);
          }
          if (decal) {
            decal.updateMatrix();
            group.add(decal);
          }
          if (hollowRot) {
            hollowRot.updateMatrix();
            group.add(hollowRot);
          }
          return group;
        }
      }

      if (tileX !== undefined && tileY !== undefined) {
        const hollowRot =
          tile.walkable ? this.createHollowTransitionCorruptionDecals(tileX, tileY, tile.type) : null;
        const group = this.overlayPool.pop() ?? new THREE.Group();
        group.clear();
        group.matrixAutoUpdate = false;
        group.userData = { tileType: tile.type, sortAnchorY: null };
        const baseMesh = this.createPlaneMesh(texture, -0.5, `base_${tile.type}`);
        baseMesh.updateMatrix();
        group.add(baseMesh);
        this.appendTerrainSeamFillers(group, tile, tileX, tileY);
        if (hollowRot) {
          hollowRot.updateMatrix();
          group.add(hollowRot);
        }
        // Pure flat ground tile (no seams/decals/shadow) → hand its quad to the instanced layer
        // and stand a placeholder in its place so the existing chunk lifecycle still tracks it.
        if (USE_INSTANCED_GROUND && group.children.length === 1) {
          this.recycleObject(group); // returns the base quad + group to their pools
          const placeholder = this.groundPlaceholderPool.pop() ?? new THREE.Object3D();
          placeholder.matrixAutoUpdate = false;
          placeholder.userData = { instancedGround: true, groundType: tile.type, tileType: tile.type };
          return placeholder;
        }
        return group;
      }

      return this.createPlaneMesh(texture, -0.5, `base_${tile.type}`);
    }

    const overlayTextureId = getOverlayTextureId(tile.type, tileX, tileY);
    const overlayTexture = this.assetManager.getTexture(overlayTextureId) ?? this.assetManager.getTexture(tile.type);
    
    // Determine base tile: check surrounding terrain for context, fall back to default
    const baseType = tileX !== undefined && tileY !== undefined
      ? this.resolveBaseTileType(tileX, tileY, TILE_METADATA[tile.type]?.baseTile ?? 'grass')
      : (TILE_METADATA[tile.type]?.baseTile ?? 'grass');
    
    const baseTexture = this.assetManager.getTexture(baseType);
    if (!overlayTexture || !baseTexture) return null;

    if (this.shouldCullDecorativeOverlay(tile, tileX, tileY)) {
      this.decorativeOverlayCullSkips++;
      const group = this.overlayPool.pop() ?? new THREE.Group();
      group.clear();
      group.matrixAutoUpdate = false;
      group.userData = {
        tileType: tile.type,
        sortAnchorY: null,
        overlayCulled: true,
      };
      const baseMesh = this.createPlaneMesh(baseTexture, -0.5, `base_${baseType}`);
      this.setRenderRole(baseMesh, 'ground');
      baseMesh.updateMatrix();
      group.add(baseMesh);
      if (tileX !== undefined && tileY !== undefined) {
        this.appendTerrainSeamFillers(group, tile, tileX, tileY);
      }
      return group;
    }

    const group = this.overlayPool.pop() ?? new THREE.Group();
    group.clear();
    group.matrixAutoUpdate = false;
    const baseScale = TILE_METADATA[tile.type]?.scale ?? 1.0;
    const isOverworldMap = this.map.width >= 80 || this.map.height >= 80;
    const structureScaleBoost = isOverworldMap && OVERWORLD_STRUCTURE_TILE_TYPES.has(tile.type)
      ? OVERWORLD_STRUCTURE_SCALE_MULTIPLIER
      : 1;
    const metadata = TILE_METADATA[tile.type];
    const scale = baseScale * structureScaleBoost;
    const sortTrim = TILE_METADATA[tile.type]?.sortTrim ?? 0.16;
    const yOffset = metadata?.yOffset ?? ((scale - 1) * this.tileSize * 0.3);
    const sortAnchorY = ((scale - 1) * this.tileSize * 0.3) - (scale * 0.5) + sortTrim;
    const renderOrderBias =
      tile.type === 'house_entry' ||
      tile.type === 'house_blue_entry' ||
      tile.type === 'house_green_entry' ||
      tile.type === 'house_thatch_entry' ||
      tile.type === 'cottage_house' ||
      tile.type === 'cottage_house_entry' ||
      tile.type === 'cottage_house_forest' ||
      tile.type === 'cottage_house_forest_ruined' ||
      tile.type === 'cottage_house_ranger'
        ? 1500
        : tile.type === 'door' || tile.type === 'door_interior' || tile.type === 'door_iron'
          ? 1300
          : tile.type === 'chest' || tile.type === 'chest_opened' || tile.type === 'special_chest' || tile.type === 'special_chest_opened'
            ? 900
            : tile.type === 'windmill' || tile.type === 'ridge_lumberyard'
              ? 850
              : tile.type === 'summoning_ritual' || tile.type === 'summoning_ritual_dud'
                ? 800
                : 0;

    group.userData = {
      tileType: tile.type,
      sortAnchorY,
      renderOrderBias,
    };

    const baseMesh = this.createPlaneMesh(baseTexture, -0.5, `base_${baseType}`);
    const overlayZ = tile.type === 'windmill' ? 0.22 : 0.1;
    const overlayMesh = this.createPlaneMesh(overlayTexture, overlayZ, `overlay_${overlayTextureId}`);
    this.setRenderRole(baseMesh, 'ground');
    this.setRenderRole(overlayMesh, 'overlay');

    if (tile.type === 'bloodstain' && tileX !== undefined && tileY !== undefined) {
      const scaleJitter = 0.9 + tileHash(tileX, tileY, 932) * 0.18;
      overlayMesh.scale.set(scale * scaleJitter, scale * (0.9 + tileHash(tileX, tileY, 933) * 0.16), 1);
      overlayMesh.position.x = (tileHash(tileX, tileY, 934) - 0.5) * 0.1;
      overlayMesh.position.y = yOffset + (tileHash(tileX, tileY, 935) - 0.5) * 0.08;
      overlayMesh.rotation.z = Math.floor(tileHash(tileX, tileY, 936) * 4) * (Math.PI / 2);
    } else if (scale !== 1.0 || (metadata?.widthScale ?? 1) !== 1) {
      const effectiveWidthScale = metadata?.widthScale ?? 1;
      overlayMesh.scale.set(scale * effectiveWidthScale, scale, 1);
      overlayMesh.position.y = yOffset;
    }
    baseMesh.updateMatrix();
    overlayMesh.updateMatrix();

    group.add(baseMesh, overlayMesh);
    if (tile.keyGateLock) {
      const lockTexture = this.assetManager.getTexture('gate_padlock');
      if (lockTexture) {
        const lockMesh = this.createPlaneMesh(lockTexture, overlayZ + 0.08, 'overlay_gate_padlock');
        lockMesh.scale.set(0.62, 0.62, 1);
        lockMesh.position.y = yOffset + 0.12;
        this.setRenderRole(lockMesh, 'overlay');
        lockMesh.updateMatrix();
        group.add(lockMesh);
      }
    }
    if (tileX !== undefined && tileY !== undefined) {
      this.appendTerrainSeamFillers(group, tile, tileX, tileY);
      if (tile.type === 'heresy_altar' || tile.type === 'heresy_altar_cracked') {
        const aura = this.createHeresyAltarSelfAura(tileX, tileY);
        if (aura) {
          aura.updateMatrix();
          group.add(aura);
        }
      }
    }
    return group;
  }

  private recycleObject(object: THREE.Object3D) {
    // Instanced-ground placeholder: free its instance slot (and any capacity-overflow fallback
    // mesh), then return the placeholder to its pool. Caller already removed it from the scene.
    if (object.userData?.instancedGround) {
      const instKey = object.userData.instancedGroundKey;
      if (typeof instKey === 'number') this.groundInstances.remove(instKey);
      const fallback = object.userData.instancedFallbackMesh;
      if (fallback instanceof THREE.Mesh) {
        this.scene.remove(fallback);
        this.releaseMesh(fallback);
      }
      object.userData = {};
      this.groundPlaceholderPool.push(object);
      return;
    }
    if (object instanceof THREE.Group) {
      const meshes: THREE.Mesh[] = [];
      object.traverse(child => {
        if (child instanceof THREE.Mesh) meshes.push(child);
      });
      for (const mesh of meshes) {
        this.releaseMesh(mesh);
      }
      object.clear();
      this.overlayPool.push(object);
      return;
    }
    if (object instanceof THREE.Mesh) {
      this.releaseMesh(object);
    }
    // Meshes with shared materials just get removed from scene - no disposal needed
  }

  private disposeSouthCoastBackdrop() {
    if (this.southCoastBackdrop) {
      this.scene.remove(this.southCoastBackdrop);
      this.southCoastBackdrop.clear();
      this.southCoastBackdrop = null;
    }
    for (const d of this.southCoastBackdropDisposables) {
      d.geometry.dispose();
    }
    this.southCoastBackdropDisposables = [];
    if (this.coastalBackdropShared) {
      this.coastalBackdropShared.material.dispose();
      this.coastalBackdropShared.texture.dispose();
      this.coastalBackdropShared = null;
    }
  }

  /**
   * Deep-ocean planes past map edges so the camera does not show empty void beyond the
   * coastal water tiles. South-only for village-style maps; north/east/west added when
   * {@link WorldMap.coastalBorderAllSides} is set.
   */
  private rebuildSouthCoastBackdrop() {
    this.disposeSouthCoastBackdrop();
    const south = !!this.map.coastalSouthBackdrop;
    const allSides = !!this.map.coastalBorderAllSides;
    if (!south && !allSides) return;

    const w = this.map.width;
    const h = this.map.height;
    const ts = this.tileSize;
    const worldOffsetX = -w / 2;
    const worldOffsetY = -h / 2;

    const group = new THREE.Group();
    group.name = 'coastalBackdrops';

    const cw = 4;
    const ch = 64;
    const c = document.createElement('canvas');
    c.width = cw; c.height = ch;
    const ctx = c.getContext('2d')!;
    for (let py = 0; py < ch; py++) {
      const t = py / (ch - 1);
      const r = Math.round(18 + t * 10);
      const g = Math.round(90 + t * 20 + (py % 6 < 1 ? 8 : 0));
      const b = Math.round(155 + t * 30);
      ctx.fillStyle = `rgb(${r},${g},${b})`;
      ctx.fillRect(0, py, cw, 1);
    }
    const tex = new THREE.CanvasTexture(c);
    tex.magFilter = THREE.NearestFilter;
    tex.minFilter = THREE.NearestFilter;
    tex.wrapS = THREE.ClampToEdgeWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.colorSpace = THREE.SRGBColorSpace;

    const mat = new THREE.MeshBasicMaterial({
      map: tex,
      depthWrite: false,
      depthTest: false,
    });
    this.coastalBackdropShared = { material: mat, texture: tex };

    const planeStrip = 32;
    const addMesh = (geom: THREE.PlaneGeometry, px: number, py: number) => {
      const mesh = new THREE.Mesh(geom, mat);
      mesh.position.set(px, py, -0.15);
      mesh.renderOrder = -4000;
      group.add(mesh);
      this.southCoastBackdropDisposables.push({ geometry: geom, material: mat });
    };

    if (south) {
      const southEdgeY = worldOffsetY - ts * 0.5;
      const planeW = w * ts + 20;
      const geom = new THREE.PlaneGeometry(planeW, planeStrip);
      addMesh(geom, 0, southEdgeY - planeStrip * 0.5);
    }

    if (allSides) {
      const northEdgeY = worldOffsetY + (h - 1) * ts + ts * 0.5;
      const planeW = w * ts + 20;
      const northGeom = new THREE.PlaneGeometry(planeW, planeStrip);
      addMesh(northGeom, 0, northEdgeY + planeStrip * 0.5);

      const stripLong = h * ts + 20;
      const westEdgeX = worldOffsetX - ts * 0.5;
      const eastEdgeX = worldOffsetX + (w - 1) * ts + ts * 0.5;
      const midY = worldOffsetY + ((h - 1) * ts) * 0.5;

      const westGeom = new THREE.PlaneGeometry(planeStrip, stripLong);
      addMesh(westGeom, westEdgeX - planeStrip * 0.5, midY);

      const eastGeom = new THREE.PlaneGeometry(planeStrip, stripLong);
      addMesh(eastGeom, eastEdgeX + planeStrip * 0.5, midY);
    }

    this.scene.add(group);
    this.southCoastBackdrop = group;
  }

  /**
   * Idle environmental ambience as occasional, transient decals rather than a constant per-tile
   * loop: wave crests laps across open water, soft gusts rustle across grass/trees. Both pick a
   * random visible host tile at random intervals (capped), fade a quad in and back out, then
   * recycle it — a few transparent quads per frame, no per-tile work.
   */
  tickAmbientDecals(currentTime: number): void {
    this.waterRipples.tick(currentTime, () => this.pickRandomVisibleTileCenter(WATER_RIPPLE_TILES));
    this.windGusts.tick(currentTime, () => this.pickRandomVisibleTileCenter(WIND_GUST_TILES));
    this.plainsGusts.tick(currentTime, () => this.pickRandomVisibleTileCenter(PLAINS_GUST_TILES));
  }

  /**
   * Reservoir-sample a streamed-in tile whose type is in `tiles`, returning its world-space centre
   * (elevation included). Null when none of that kind are on screen. No per-spawn allocation beyond
   * the single returned point.
   */
  private pickRandomVisibleTileCenter(tiles: ReadonlySet<TileType>): { worldX: number; worldY: number } | null {
    let chosenX = 0;
    let chosenY = 0;
    let seen = 0;
    for (const [, object] of this.activeMeshes) {
      const tx = object.userData?.tileX as number | undefined;
      const ty = object.userData?.tileY as number | undefined;
      if (tx === undefined || ty === undefined) continue;
      const type = this.map.tiles[ty]?.[tx]?.type;
      if (type === undefined || !tiles.has(type)) continue;
      seen++;
      if (Math.random() < 1 / seen) { chosenX = tx; chosenY = ty; }
    }
    if (seen === 0) return null;
    const worldOffsetX = -this.map.width / 2;
    const worldOffsetY = -this.map.height / 2;
    const visualYOffset = (this.map.tiles[chosenY]?.[chosenX]?.elevation ?? 0) * World.ELEVATION_Y_OFFSET;
    return {
      worldX: worldOffsetX + chosenX * this.tileSize,
      worldY: worldOffsetY + chosenY * this.tileSize + visualYOffset,
    };
  }

  updateChunks(playerWorldX: number, playerWorldY: number) {
    const centerTileX = Math.floor(playerWorldX + this.map.width / 2);
    const centerTileY = Math.floor(playerWorldY + this.map.height / 2);
    this.renderCenter = { x: centerTileX, y: centerTileY };

    const dx = centerTileX - this.lastChunkCenter.x;
    const dy = centerTileY - this.lastChunkCenter.y;
    
    const needsFullUpdate = Math.abs(dx) >= this.CHUNK_UPDATE_THRESHOLD || Math.abs(dy) >= this.CHUNK_UPDATE_THRESHOLD;

    // Process pending tiles from previous frames (batched loading)
    if (this.pendingTiles.length > 0) {
      const batchSize = this.isInitialLoad ? INITIAL_LOAD_TILES_PER_FRAME : MAX_TILES_PER_FRAME;
      const batch = this.pendingTiles.splice(0, batchSize);

      for (const { x, y, key } of batch) {
        if (this.activeMeshes.has(key)) continue;
        const tile = this.map.tiles[y]?.[x];
        if (!tile) continue;

        const object = this.createTileObject(tile, x, y);
        if (!object) continue;
        this.attachTileObject(x, y, object);
      }

      if (this.pendingTiles.length === 0) this.isInitialLoad = false;
      if (!needsFullUpdate) return;
    }

    if (!needsFullUpdate) return;

    // Track movement direction for preloading
    if (dx !== 0 || dy !== 0) {
      this.lastMoveDir.x = dx > 0 ? 1 : dx < 0 ? -1 : 0;
      this.lastMoveDir.y = dy > 0 ? 1 : dy < 0 ? -1 : 0;
    }
    this.lastChunkCenter = { x: centerTileX, y: centerTileY };

    // Extend render radius in movement direction
    const preX = this.lastMoveDir.x * this.PRELOAD_EXTRA;
    const preY = this.lastMoveDir.y * this.PRELOAD_EXTRA;
    const minDx = -RENDER_RADIUS + Math.min(0, preX);
    const maxDx = RENDER_RADIUS + Math.max(0, preX);
    const minDy = -RENDER_RADIUS + Math.min(0, preY);
    const maxDy = RENDER_RADIUS + Math.max(0, preY);

    // Cull distant tiles (keep anything within cull radius to prevent flicker)
    const signatureRefreshTiles: Array<{ x: number; y: number; key: number }> = [];
    for (const [key, object] of this.activeMeshes) {
      const kx = typeof object.userData?.tileX === 'number' ? object.userData.tileX : unpackTileKeyX(key);
      const ky = typeof object.userData?.tileY === 'number' ? object.userData.tileY : unpackTileKeyY(key);
      if (Math.abs(kx - centerTileX) > CULL_RADIUS || Math.abs(ky - centerTileY) > CULL_RADIUS) {
        this.scene.remove(object);
        this.untrackActiveObject(object);
        this.recycleObject(object);
        this.activeMeshes.delete(key);
        continue;
      }

      const tile = this.map.tiles[ky]?.[kx];
      if (tile && object.userData?.visualSignature !== this.getTileVisualSignature(tile, kx, ky)) {
        this.scene.remove(object);
        this.untrackActiveObject(object);
        this.recycleObject(object);
        this.activeMeshes.delete(key);
        signatureRefreshTiles.push({ x: kx, y: ky, key });
      }
    }

    // Collect new tiles to create
    this.pendingTiles = signatureRefreshTiles;
    const pendingTileKeys = new Set(this.pendingTiles.map(({ key }) => key));
    for (const { dx: offsetX, dy: offsetY } of this.sortedRenderOffsets) {
      if (offsetX < minDx || offsetX > maxDx || offsetY < minDy || offsetY > maxDy) continue;
      const x = centerTileX + offsetX;
      const y = centerTileY + offsetY;
      if (x < 0 || y < 0 || x >= this.map.width || y >= this.map.height) continue;
      const key = this.tileKey(x, y);
      if (!this.activeMeshes.has(key) && !pendingTileKeys.has(key)) {
        this.pendingTiles.push({ x, y, key });
        pendingTileKeys.add(key);
      }
    }

    // Process first batch immediately (initial load gets all at once)
    const immediateBatch = this.isInitialLoad ? INITIAL_LOAD_TILES_PER_FRAME : MAX_TILES_PER_FRAME;
    const batch = this.pendingTiles.splice(0, immediateBatch);

    for (const { x, y, key } of batch) {
      if (this.activeMeshes.has(key)) continue;
      const tile = this.map.tiles[y]?.[x];
      if (!tile) continue;

      const object = this.createTileObject(tile, x, y);
      if (!object) continue;
      this.attachTileObject(x, y, object);
    }

    if (this.pendingTiles.length === 0) this.isInitialLoad = false;
  }

  rebuildChunks() {
    this.mapRevision += 1;
    this.map.revision = this.mapRevision;
    this.interactableCache = null;
    this.disposeSouthCoastBackdrop();
    this.waterRipples.clear();
    this.windGusts.clear();
    this.plainsGusts.clear();
    for (const [, object] of this.activeMeshes) {
      this.scene.remove(object);
      this.recycleObject(object);
    }
    this.activeMeshes.clear();
    this.groundInstances.clear(); // safety net: per-placeholder recycle already freed each slot
    this.activeOverlayObjectCount = 0;
    this.activeDecorativeOverlayCullCount = 0;
    this.pendingTiles = [];
    this.lastChunkCenter = { x: -9999, y: -9999 };
    this.lastMoveDir = { x: 0, y: 0 };
    this.isInitialLoad = true;
    this.rebuildSouthCoastBackdrop();
  }

  /**
   * Rebuild Three.js tile meshes only inside a map-tile rectangle.
   * Prefer this over {@link rebuildChunks} for small edits: rebuildChunks tears down the
   * south coast backdrop (deep blue) and all tiles, which produced a visible blue edge flash
   * on chest opens / pickups when the GPU recomposited the frame.
   */
  refreshMapTileRegion(
    minTileX: number,
    minTileY: number,
    maxTileX: number,
    maxTileY: number,
    options?: { forceAttach?: boolean },
  ): void {
    this.refreshTileRegion(minTileX, minTileY, maxTileX, maxTileY, options);
  }

  getTile(x: number, y: number): Tile | null {
    if (!Number.isFinite(x) || !Number.isFinite(y)) return null;

    const tileX = Math.floor(x + this.map.width / 2);
    const tileY = Math.floor(y + this.map.height / 2);

    if (tileX < 0 || tileX >= this.map.width || tileY < 0 || tileY >= this.map.height) {
      return null;
    }

    return this.map.tiles[tileY][tileX];
  }

  getElevationAt(x: number, y: number): number {
    return this.getTile(x, y)?.elevation ?? 0;
  }

  getVisualY(x: number, y: number): number {
    return y + this.getElevationAt(x, y) * World.ELEVATION_Y_OFFSET;
  }

  getNearbyTileWorldPositions(tileType: TileType, playerWorldX: number, playerWorldY: number, radius: number): Array<{ x: number; y: number }> {
    const centerTileX = Math.floor(playerWorldX + this.map.width / 2);
    const centerTileY = Math.floor(playerWorldY + this.map.height / 2);
    const tileRadius = Math.ceil(radius);
    const radiusSq = radius * radius;
    const positions: Array<{ x: number; y: number }> = [];

    for (let y = Math.max(0, centerTileY - tileRadius); y <= Math.min(this.map.height - 1, centerTileY + tileRadius); y++) {
      for (let x = Math.max(0, centerTileX - tileRadius); x <= Math.min(this.map.width - 1, centerTileX + tileRadius); x++) {
        const tile = this.map.tiles[y]?.[x];
        if (!tile || tile.type !== tileType) continue;

        const worldX = x - this.map.width / 2 + 0.5;
        const worldY = y - this.map.height / 2 + 0.5 + (tile.elevation ?? 0) * World.ELEVATION_Y_OFFSET;
        const dx = worldX - playerWorldX;
        const dy = worldY - playerWorldY;
        if (dx * dx + dy * dy <= radiusSq) {
          positions.push({ x: worldX, y: worldY });
        }
      }
    }

    return positions;
  }

  private isTileWalkable(tile: Tile | null): boolean {
    if (!tile) return false;
    if (tile.transition) return true;

    const metadata = TILE_METADATA[tile.type];
    if (metadata?.isOverlay) {
      if (NON_BLOCKING_OVERLAYS.has(tile.type)) return true;
      return tile.walkable;
    }

    return tile.walkable;
  }

  private canStepBetween(
    fromTile: Tile | null,
    toTile: Tile | null,
    fromTileX?: number,
    fromTileY?: number,
    toTileX?: number,
    toTileY?: number,
  ): boolean {
    return this.getStepDecision(fromTile, toTile, fromTileX, fromTileY, toTileX, toTileY).allowed;
  }

  private isElevationConnector(tile: Tile | null): boolean {
    if (!tile) return false;
    if (tile.transition) return true;
    return ELEVATION_CONNECTOR_TILE_TYPES.has(tile.type);
  }

  private getStepDecision(
    fromTile: Tile | null,
    toTile: Tile | null,
    fromTileX?: number,
    fromTileY?: number,
    toTileX?: number,
    toTileY?: number,
  ): { allowed: boolean; reason: string } {
    if (!toTile) return { allowed: false, reason: 'no target tile' };
    if (!this.isTileWalkable(toTile)) return { allowed: false, reason: `${toTile.type} blocked` };

    const fromElevation = fromTile?.elevation ?? 0;
    const toElevation = toTile.elevation ?? 0;
    if (fromElevation === toElevation) return { allowed: true, reason: 'same elevation' };

    // Map transitions / portals must stay reachable even if elevation metadata is inconsistent.
    if (fromTile?.transition || toTile.transition) return { allowed: true, reason: 'map transition' };

    const delta = Math.abs(toElevation - fromElevation);
    if (delta > 1) return { allowed: false, reason: `elevation jump ${fromElevation}->${toElevation}` };

    if (this.isElevationConnector(fromTile) || this.isElevationConnector(toTile)) {
      return { allowed: true, reason: `connector ${fromElevation}->${toElevation}` };
    }

    if (canCrossSpinePathElevation(fromTile, toTile)) {
      return { allowed: true, reason: `spine path ${fromElevation}->${toElevation}` };
    }

    // Raised shelves require authored connectors instead of arbitrary one-level steps.
    return { allowed: false, reason: `needs connector ${fromElevation}->${toElevation}` };
  }

  isWalkable(x: number, y: number, r: number = 0): boolean {
    if (r === 0) {
      return this.isTileWalkable(this.getTile(x, y));
    }
    return this.isTileWalkable(this.getTile(x - r, y - r)) &&
           this.isTileWalkable(this.getTile(x + r, y - r)) &&
           this.isTileWalkable(this.getTile(x - r, y + r)) &&
           this.isTileWalkable(this.getTile(x + r, y + r));
  }

  private isEnemyBlockedStandingTile(tile: Tile | null): boolean {
    if (!tile) return true;
    if (tile.enemyBlocked) return true;
    return ENEMY_BLOCKED_TILE_TYPES.has(tile.type);
  }

  private canEnemyStepBetween(
    fromTile: Tile | null,
    toTile: Tile | null,
    fromTileX: number,
    fromTileY: number,
    toTileX: number,
    toTileY: number,
  ): boolean {
    if (toTile && ENEMY_BLOCKED_TILE_TYPES.has(toTile.type)) return false;
    return this.canStepBetween(fromTile, toTile, fromTileX, fromTileY, toTileX, toTileY);
  }

  private canEnemyMovePoint(fromX: number, fromY: number, toX: number, toY: number): boolean {
    const fromTile = this.getTile(fromX, fromY);
    const toTile = this.getTile(toX, toY);
    const fromTileX = Math.floor(fromX + this.map.width / 2);
    const fromTileY = Math.floor(fromY + this.map.height / 2);
    const toTileX = Math.floor(toX + this.map.width / 2);
    const toTileY = Math.floor(toY + this.map.height / 2);
    if (!this.canEnemyStepBetween(fromTile, toTile, fromTileX, fromTileY, toTileX, toTileY)) return false;
    if (this.isEnemyBlockedStandingTile(toTile)) return false;
    if (this.map.mapKey && isPositionInBonfireSafeZone(this.map.mapKey, toX, toY)) return false;
    return true;
  }

  canEnemyMoveTo(fromX: number, fromY: number, toX: number, toY: number, r: number = 0): boolean {
    if (
      !Number.isFinite(fromX) ||
      !Number.isFinite(fromY) ||
      !Number.isFinite(toX) ||
      !Number.isFinite(toY) ||
      !Number.isFinite(r)
    ) return false;
    if (r === 0) {
      return this.canEnemyMovePoint(fromX, fromY, toX, toY);
    }

    // 4 corners + 4 edge midpoints = 8-point hull - catches obstacles that straddle
    // the diagonal between two corners and gives tighter clearance from cliff edges.
    return this.canEnemyMovePoint(fromX - r, fromY - r, toX - r, toY - r) &&
           this.canEnemyMovePoint(fromX + r, fromY - r, toX + r, toY - r) &&
           this.canEnemyMovePoint(fromX - r, fromY + r, toX - r, toY + r) &&
           this.canEnemyMovePoint(fromX + r, fromY + r, toX + r, toY + r) &&
           this.canEnemyMovePoint(fromX,     fromY - r, toX,     toY - r) &&
           this.canEnemyMovePoint(fromX,     fromY + r, toX,     toY + r) &&
           this.canEnemyMovePoint(fromX - r, fromY,     toX - r, toY    ) &&
           this.canEnemyMovePoint(fromX + r, fromY,     toX + r, toY    );
  }

  private canMovePoint(fromX: number, fromY: number, toX: number, toY: number): boolean {
    const fromTileX = Math.floor(fromX + this.map.width / 2);
    const fromTileY = Math.floor(fromY + this.map.height / 2);
    const toTileX = Math.floor(toX + this.map.width / 2);
    const toTileY = Math.floor(toY + this.map.height / 2);
    return this.canStepBetween(
      this.getTile(fromX, fromY),
      this.getTile(toX, toY),
      fromTileX,
      fromTileY,
      toTileX,
      toTileY,
    );
  }

  private getMovePointDecision(fromX: number, fromY: number, toX: number, toY: number): { allowed: boolean; reason: string } {
    const fromTileX = Math.floor(fromX + this.map.width / 2);
    const fromTileY = Math.floor(fromY + this.map.height / 2);
    const toTileX = Math.floor(toX + this.map.width / 2);
    const toTileY = Math.floor(toY + this.map.height / 2);
    return this.getStepDecision(
      this.getTile(fromX, fromY),
      this.getTile(toX, toY),
      fromTileX,
      fromTileY,
      toTileX,
      toTileY,
    );
  }

  canMoveTo(fromX: number, fromY: number, toX: number, toY: number, r: number = 0): boolean {
    if (
      !Number.isFinite(fromX) ||
      !Number.isFinite(fromY) ||
      !Number.isFinite(toX) ||
      !Number.isFinite(toY) ||
      !Number.isFinite(r)
    ) return false;
    if (r === 0) {
      return this.canMovePoint(fromX, fromY, toX, toY);
    }

    return this.canMovePoint(fromX - r, fromY - r, toX - r, toY - r) &&
           this.canMovePoint(fromX + r, fromY - r, toX + r, toY - r) &&
           this.canMovePoint(fromX - r, fromY + r, toX - r, toY + r) &&
           this.canMovePoint(fromX + r, fromY + r, toX + r, toY + r);
  }

  getCollisionDebugSnapshot(x: number, y: number, r: number = 0.2, scanRadius: number = 3): CollisionDebugSnapshot {
    const tileX = Math.floor(x + this.map.width / 2);
    const tileY = Math.floor(y + this.map.height / 2);
    const toDebugTile = (tx: number, ty: number, tile: Tile | null): CollisionDebugTile | null => {
      if (!tile) return null;
      return {
        tileX: tx,
        tileY: ty,
        type: tile.type,
        walkable: this.isTileWalkable(tile),
        elevation: tile.elevation ?? 0,
        interactable: !!tile.interactable,
        transition: !!tile.transition,
        enemyBlocked: !!tile.enemyBlocked || this.isEnemyBlockedStandingTile(tile),
      };
    };

    const currentTile = toDebugTile(tileX, tileY, this.getTile(x, y));
    const nearbyTiles: CollisionDebugTile[] = [];
    for (let ty = tileY - scanRadius; ty <= tileY + scanRadius; ty++) {
      for (let tx = tileX - scanRadius; tx <= tileX + scanRadius; tx++) {
        if (ty < 0 || ty >= this.map.height || tx < 0 || tx >= this.map.width) continue;
        const tile = this.map.tiles[ty][tx];
        const debugTile = toDebugTile(tx, ty, tile);
        if (debugTile) nearbyTiles.push(debugTile);
      }
    }

    const samples: CollisionDebugSample[] = ([
      ['tl', -r, -r],
      ['tr', r, -r],
      ['bl', -r, r],
      ['br', r, r],
    ] as const).map(([label, ox, oy]) => {
      const wx = x + ox;
      const wy = y + oy;
      const stx = Math.floor(wx + this.map.width / 2);
      const sty = Math.floor(wy + this.map.height / 2);
      const base = toDebugTile(stx, sty, this.getTile(wx, wy));
      return {
        label,
        worldX: wx,
        worldY: wy,
        tileX: base?.tileX ?? stx,
        tileY: base?.tileY ?? sty,
        type: base?.type ?? 'grass',
        walkable: base?.walkable ?? false,
        elevation: base?.elevation ?? 0,
        interactable: base?.interactable ?? false,
        transition: base?.transition ?? false,
        enemyBlocked: base?.enemyBlocked ?? false,
      };
    });

    const step = 0.35;
    const getMoveDecision = (label: CollisionDebugProbe['label'], toX: number, toY: number): CollisionDebugProbe => {
      const checks = r === 0
        ? [{ fromX: x, fromY: y, toX, toY }]
        : [
            { fromX: x - r, fromY: y - r, toX: toX - r, toY: toY - r },
            { fromX: x + r, fromY: y - r, toX: toX + r, toY: toY - r },
            { fromX: x - r, fromY: y + r, toX: toX - r, toY: toY + r },
            { fromX: x + r, fromY: y + r, toX: toX + r, toY: toY + r },
          ];
      const blocked = checks
        .map(check => this.getMovePointDecision(check.fromX, check.fromY, check.toX, check.toY))
        .find(decision => !decision.allowed);
      const allowed = !blocked;
      const targetTile = this.getTile(toX, toY);
      const targetTileX = Math.floor(toX + this.map.width / 2);
      const targetTileY = Math.floor(toY + this.map.height / 2);
      return {
        label,
        allowed,
        reason: blocked?.reason ?? 'clear',
        tileX: targetTileX,
        tileY: targetTileY,
        type: targetTile?.type ?? null,
        elevation: targetTile?.elevation ?? null,
      };
    };
    const probes: CollisionDebugProbe[] = [
      getMoveDecision('left', x - step, y),
      getMoveDecision('right', x + step, y),
      getMoveDecision('up', x, y - step),
      getMoveDecision('down', x, y + step),
    ];

    return {
      worldX: x,
      worldY: y,
      radius: r,
      tileX,
      tileY,
      currentTile,
      samples,
      nearbyTiles,
      probes,
      scanRadius,
    };
  }

  auditCollisionPoints(points: CollisionAuditPoint[]): CollisionAuditResult[] {
    return points.map(point => {
      const snapshot = this.getCollisionDebugSnapshot(point.x, point.y, point.radius ?? 0.2, 1);
      return {
        label: point.label,
        worldX: point.x,
        worldY: point.y,
        tileX: snapshot.tileX,
        tileY: snapshot.tileY,
        currentType: snapshot.currentTile?.type ?? null,
        currentElevation: snapshot.currentTile?.elevation ?? null,
        walkable: snapshot.currentTile?.walkable ?? false,
        probes: snapshot.probes,
      };
    });
  }



  getSpawnPoint(): { x: number; y: number } {
    return {
      x: this.map.spawnPoint.x - this.map.width / 2,
      y: this.map.spawnPoint.y - this.map.height / 2,
    };
  }

  getInteractableAt(x: number, y: number): string | null {
    const tile = this.getTile(x, y);
    return tile?.interactable && tile.interactionId ? tile.interactionId : null;
  }

  getInteractableNear(x: number, y: number, radius: number = INTERACTABLE_QUERY_RADIUS): InteractableHit | null {
    const centerTileX = Math.floor(x + this.map.width / 2);
    const centerTileY = Math.floor(y + this.map.height / 2);
    const cached = this.interactableCache;
    if (
      cached &&
      cached.centerTileX === centerTileX &&
      cached.centerTileY === centerTileY &&
      cached.radius === radius &&
      cached.revision === this.mapRevision
    ) {
      return cached.result;
    }
    let best: InteractableHit | null = null;
    let bestDistSq = Number.POSITIVE_INFINITY;
    /** On equal distance, prefer map transitions so doors are not stolen by nearer signs. */
    let bestPriority = -1;
    const interactablePriority = (tile: Tile): number => {
      if (tile.interactionId === 'building_exit' || tile.interactionId === 'building_entrance') return 2;
      return 0;
    };

    const maxGateReach = 3;
    const span = Math.max(2, Math.ceil(radius + maxGateReach));

    for (let ty = centerTileY - span; ty <= centerTileY + span; ty++) {
      if (ty < 0 || ty >= this.map.height) continue;
      for (let tx = centerTileX - span; tx <= centerTileX + span; tx++) {
        if (tx < 0 || tx >= this.map.width) continue;
        const tile = this.map.tiles[ty][tx];
        if (!tile?.interactable || !tile.interactionId) continue;
        if (tile.interactionId === 'lantern') continue;

        const tileCenterX = tx - this.map.width / 2;
        const tileCenterY = ty - this.map.height / 2;
        const dx = x - tileCenterX;
        const dy = y - tileCenterY;
        const distSq = dx * dx + dy * dy;
        const reach = Math.min(radius, this.getInteractableReach(tile));
        if (distSq > reach * reach) continue;

        const pr = interactablePriority(tile);
        if (distSq < bestDistSq || (distSq === bestDistSq && pr > bestPriority)) {
          bestDistSq = distSq;
          bestPriority = pr;
          best = {
            interactionId: tile.interactionId,
            tileType: tile.type,
            x: tileCenterX,
            y: tileCenterY,
          };
        }
      }
    }

    this.interactableCache = {
      centerTileX,
      centerTileY,
      radius,
      revision: this.mapRevision,
      result: best,
    };
    return best;
  }

  getTransitionAt(x: number, y: number): { targetMap: string; targetX: number; targetY: number } | null {
    const tile = this.getTile(x, y);
    return tile?.transition || null;
  }

  /** Like getTransitionAt but only for portal tiles (auto-warp). Doors require F-key. */
  getAutoTransitionAt(x: number, y: number): { targetMap: string; targetX: number; targetY: number } | null {
    const tile = this.getTile(x, y);
    if (tile?.type === 'portal' && tile.transition) return tile.transition;
    // Cave-mouth EXITS step-warp like a portal (no door). Cave-mouth ENTRANCES are interactable
    // (interact-to-enter), so they're excluded here and won't auto-trigger on step.
    if ((tile?.type === 'cave_mouth' || tile?.type === 'cave_mouth_angled') && tile.transition && !tile.interactable) return tile.transition;
    return null;
  }

  tryPushBlock(playerX: number, playerY: number, direction: { x: number; y: number }): boolean {
    const blockTileX = Math.floor(playerX + direction.x + this.map.width / 2);
    const blockTileY = Math.floor(playerY + direction.y + this.map.height / 2);
    
    const tile = this.map.tiles[blockTileY]?.[blockTileX];
    if (!tile || tile.type !== 'push_block') return false;

    const targetTileX = blockTileX + direction.x;
    const targetTileY = blockTileY + direction.y;
    const targetTile = this.map.tiles[targetTileY]?.[targetTileX];
    
    if (!targetTile || !targetTile.walkable) return false;

    this.map.tiles[blockTileY][blockTileX] = { type: 'stone', walkable: true };
    this.map.tiles[targetTileY][targetTileX] = { type: 'push_block', walkable: false, pushable: true };

    if (targetTile.type === 'pressure_plate' && targetTile.linkedTo) {
      this.activateSwitch(targetTile.linkedTo);
    }

    this.refreshTileRegion(
      Math.min(blockTileX, targetTileX) - 1,
      Math.min(blockTileY, targetTileY) - 1,
      Math.max(blockTileX, targetTileX) + 1,
      Math.max(blockTileY, targetTileY) + 1,
    );
    return true;
  }

  activateSwitch(doorId: string) {
    let minX = Number.POSITIVE_INFINITY;
    let minY = Number.POSITIVE_INFINITY;
    let maxX = Number.NEGATIVE_INFINITY;
    let maxY = Number.NEGATIVE_INFINITY;
    for (let y = 0; y < this.map.height; y++) {
      for (let x = 0; x < this.map.width; x++) {
        const tile = this.map.tiles[y][x];
        if (tile.type === 'switch_door' && tile.interactionId === doorId) {
          tile.walkable = true;
          tile.type = 'stone';
          tile.activated = true;
          if (x < minX) minX = x;
          if (y < minY) minY = y;
          if (x > maxX) maxX = x;
          if (y > maxY) maxY = y;
        }
      }
    }
    if (Number.isFinite(minX) && Number.isFinite(minY) && Number.isFinite(maxX) && Number.isFinite(maxY)) {
      this.refreshTileRegion(minX - 1, minY - 1, maxX + 1, maxY + 1);
    }
  }

  private getInteractableReach(tile: Tile): number {
    // Distances are in world units (~1.0 between adjacent tile centres). Old values (≤1.0) forced the
    // player to nearly overlap the tile; these targets allow comfortable adjacency and slight diagonals.
    if (tile.interactionId === 'building_entrance' || tile.interactionId === 'building_exit') {
      return 1.55;
    }
    if (tile.type === 'door' || tile.type === 'door_interior' || tile.type === 'door_iron' || tile.type === 'portal') {
      return 1.2;
    }
    if (tile.type === 'bonfire' || tile.type === 'campfire') {
      return 1.65;
    }
    if (tile.type === 'sign' || tile.type === 'chain' || tile.type === 'shortcut_lever' || tile.type === 'lantern') {
      return 1.45;
    }
    // Coiled gate-ladders (fort ridge, cliff corridor) are released from the shelf
    // tiles east of the gate. The interactable's stored point omits the +0.5 tile
    // centre, so a player standing one tile diagonally out (e.g. world 90,23 vs a
    // gate at 89,22) sits ~2.12 units away - out of a tighter reach. Use a radius
    // that comfortably covers both the adjacent (distSq≈2.5) and diagonal
    // (distSq≈4.5) approach tiles so the release fires wherever you're correctly
    // perched on the ledge. Wrong-side (fort) players are still rejected by the
    // elevation/X side gate, so the larger radius cannot open it from below.
    if (tile.type === 'gate_ladder') {
      return 2.4;
    }
    if (tile.type === 'well' || tile.type === 'tombstone' || tile.type === 'tombstone_broken' || tile.type === 'tombstone_cracked_v' || tile.type === 'table' || tile.type === 'stump') {
      return 1.4;
    }
    if (tile.type === 'gate') {
      return 3.0;
    }
    if (tile.type === 'fog_gate') {
      return 2.85;
    }
    if (tile.type === 'chest' || tile.type === 'chest_opened' || tile.type === 'special_chest' || tile.type === 'special_chest_opened') {
      return 1.5;
    }
    if (tile.type === 'flower' || tile.type === 'moonbloom' || tile.type === 'mushroom' || tile.type === 'tempest_grass') {
      return 1.5;
    }
    if (tile.type === 'ranger_remains' || tile.type === 'ranger_remains_scattered' || tile.type === 'bones_pile') {
      return 1.5;
    }
    // Allow interaction from any adjacent tile including diagonal (sqrt(2) ≈ 1.41).
    if (tile.type === 'loose_plank') {
      return 1.6;
    }
    return 1.4;
  }

  /** Clears `hidden` on tiles in range after e.g. a puzzle reveal. Tiles still render while hidden - see `placeSecretAreas` - so the map never shows void. */
  revealHiddenArea(centerX: number, centerY: number, radius: number = 3) {
    const tileX = Math.floor(centerX + this.map.width / 2);
    const tileY = Math.floor(centerY + this.map.height / 2);
    let revealedAny = false;

    for (let dy = -radius; dy <= radius; dy++) {
      for (let dx = -radius; dx <= radius; dx++) {
        const tx = tileX + dx;
        const ty = tileY + dy;
        if (tx >= 0 && tx < this.map.width && ty >= 0 && ty < this.map.height) {
          if (this.map.tiles[ty][tx].hidden) {
            this.map.tiles[ty][tx].hidden = false;
            revealedAny = true;
          }
        }
      }
    }
    if (revealedAny) {
      this.refreshTileRegion(tileX - radius - 1, tileY - radius - 1, tileX + radius + 1, tileY + radius + 1);
    }
  }

  loadMap(map: WorldMap) {
    this.map = map;
    this.mapRevision += 1;
    this.interactableCache = null;
    this.rebuildChunks();
  }

  getCurrentMap(): WorldMap {
    return this.map;
  }

  getMapRevision(): number {
    return this.mapRevision;
  }

  getPerformanceStats(): {
    activeObjects: number;
    activeOverlayObjects: number;
    activeDecorativeOverlayCulls: number;
    decorativeOverlayCullSkips: number;
    pendingTiles: number;
    meshPoolSize: number;
    groupPoolSize: number;
    mapRevision: number;
  } {
    return {
      activeObjects: this.activeMeshes.size,
      activeOverlayObjects: this.activeOverlayObjectCount,
      activeDecorativeOverlayCulls: this.activeDecorativeOverlayCullCount,
      decorativeOverlayCullSkips: this.decorativeOverlayCullSkips,
      pendingTiles: this.pendingTiles.length,
      meshPoolSize: this.meshPool.length,
      groupPoolSize: this.overlayPool.length,
      mapRevision: this.mapRevision,
    };
  }

  dispose() {
    this.disposeSouthCoastBackdrop();
    this.waterRipples.dispose();
    this.windGusts.dispose();
    this.plainsGusts.dispose();
    for (const [, object] of this.activeMeshes) {
      this.scene.remove(object);
    }
    this.activeMeshes.clear();
    this.activeOverlayObjectCount = 0;
    this.activeDecorativeOverlayCullCount = 0;
    
    for (const [, material] of this.materialCache) {
      material.dispose();
    }
    this.materialCache.clear();
    for (const [, tex] of this.detailTextures) {
      tex.dispose();
    }
    this.detailTextures.clear();
    this.overlayPool = [];
    this.meshPool = [];
    for (const [, m] of this.seamFillMaterialByKey) {
      m.dispose();
    }
    this.seamFillMaterialByKey.clear();
    for (const [, t] of this.seamFillTextureByKey) {
      t.dispose();
    }
    this.seamFillTextureByKey.clear();
    this.sharedTileGeometry.dispose();
    this.elevationFillerGeometry.dispose();
    this.detailGeometry.dispose();
  }
}
