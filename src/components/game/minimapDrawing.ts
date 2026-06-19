import type { TileType, WorldMap, Tile } from '@/lib/game/World';
import type { GameState } from '@/lib/game/GameState';
import type { AssetManager } from '@/lib/game/AssetManager';
import { getHollowWaterCorruptionIntensity, getHollowWaterVisualBlend } from '@/data/hollowCorruptedWater';
import { isNpcObjectiveTarget, isPrimaryObjectiveMarker, markerTargetsNpc, type MapMarker } from '@/lib/game/MapMarkers';
import { parseVisitedTileKey } from '@/lib/game/visitedTiles';

export function hasActiveDroppedEssence(state: GameState, currentMapId: string): boolean {
  const stain = state.droppedEssence;
  return !!(stain && stain.mapId === currentMapId && stain.amount > 0);
}

/** Brighter violet used for lost-essence bloodstain dots (map + legend). */
export const LOST_ESSENCE_MARKER_COLOR = '#E040FB';
export const LOST_ESSENCE_MARKER_GLOW = 'rgba(224, 64, 251, 0.45)';

const PLAYER_MARKER_COLOR = '#4488ff';

/** Pull the underlying HTMLCanvasElement/HTMLImageElement from a THREE-style texture so we can drawImage() it. */
function getDrawableFromTexture(tex: { image?: unknown } | undefined): CanvasImageSource | null {
  if (!tex) return null;
  const img = tex.image;
  if (
    img instanceof HTMLCanvasElement ||
    img instanceof HTMLImageElement ||
    (typeof ImageBitmap !== 'undefined' && img instanceof ImageBitmap)
  ) {
    return img;
  }
  return null;
}

function getDrawableSize(img: CanvasImageSource): { width: number; height: number } {
  if (img instanceof HTMLImageElement) {
    return { width: img.naturalWidth || img.width, height: img.naturalHeight || img.height };
  }
  return { width: img.width, height: img.height };
}

function playerFaceTextureKeys(equippedWeaponId?: string | null): string[] {
  const prefix = equippedWeaponId === 'ornamental_broadsword'
    ? 'broadsword_'
    : equippedWeaponId === 'terminus_scythe'
      ? 'scythe_'
      : '';
  const primary = `player_${prefix}down_idle_0`;
  return primary === 'player_down_idle_0' ? [primary] : [primary, 'player_down_idle_0'];
}

export function getPlayerFaceMarkerDrawable(
  assetManager: AssetManager | null | undefined,
  equippedWeaponId?: string | null,
): CanvasImageSource | null {
  if (!assetManager) return null;
  for (const key of playerFaceTextureKeys(equippedWeaponId)) {
    const drawable = getDrawableFromTexture(assetManager.getTexture(key));
    if (drawable) return drawable;
  }
  return null;
}

export function drawPlayerFaceMapMarker(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  size: number,
  assetManager: AssetManager | null | undefined,
  equippedWeaponId?: string | null,
  options: { glow?: boolean; fallback?: boolean } = {},
): boolean {
  const { glow = true, fallback = true } = options;
  const pulse = 0.7 + Math.sin(Date.now() / 400) * 0.3;

  if (glow) {
    ctx.beginPath();
    ctx.arc(cx, cy, Math.max(size * 0.6, 6), 0, Math.PI * 2);
    ctx.fillStyle = PLAYER_MARKER_COLOR;
    ctx.globalAlpha = 0.25 * pulse;
    ctx.fill();
    ctx.globalAlpha = 1;
  }

  const drawable = getPlayerFaceMarkerDrawable(assetManager, equippedWeaponId);
  if (drawable) {
    const { width, height } = getDrawableSize(drawable);
    if (width > 0 && height > 0) {
      const cropH = Math.max(1, Math.round(height * 0.45));
      const cropW = Math.max(1, Math.round(width * 0.72));
      const sx = Math.max(0, Math.floor((width - cropW) / 2));
      const sy = 0;
      const prevSmoothing = ctx.imageSmoothingEnabled;
      ctx.imageSmoothingEnabled = false;

      ctx.save();
      ctx.beginPath();
      ctx.arc(cx, cy, size * 0.56, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(5, 3, 2, 0.72)';
      ctx.fill();
      ctx.lineWidth = Math.max(1, Math.round(size * 0.1));
      ctx.strokeStyle = PLAYER_MARKER_COLOR;
      ctx.globalAlpha = 0.9;
      ctx.stroke();
      ctx.globalAlpha = 1;
      ctx.drawImage(drawable, sx, sy, cropW, cropH, cx - size / 2, cy - size / 2, size, size);
      ctx.restore();

      ctx.imageSmoothingEnabled = prevSmoothing;
      return true;
    }
  }

  if (!fallback) return false;

  const playerSize = Math.max(size * 0.42, 5);
  ctx.fillStyle = PLAYER_MARKER_COLOR;
  ctx.beginPath();
  ctx.arc(cx, cy, playerSize, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(cx, cy, playerSize * 0.5, 0, Math.PI * 2);
  ctx.fill();
  return false;
}

/**
 * Pixel colors aligned with `AssetManager` procedural tints (`createColorTexture` hexes) so the
 * minimap / full map read as the same materials as the overworld. Unknown types fall back to
 * walkable grass or generic unwalkable soil.
 */
const MINIMAP_TILE_COLOR: Partial<Record<TileType, string>> & Record<string, string> = {
  // --- Base terrain (AssetManager) ---
  grass: '#4CAF50',
  tall_grass: '#388E3C',
  tall_grass_b: '#357A38',
  tall_grass_c: '#3B9440',
  dark_grass: '#2E7D32',
  plains_grass: '#86B14E',
  plains_grass_tall: '#A3A848',
  dirt: '#8D6E63',
  cave_floor: '#5C4A38',
  sand: '#E8D4B0',
  stone: '#6E7B85',
  wood: '#795548',
  mossy_stone: '#6B7B5A',
  ruined_fort_wall: '#777066',
  ruined_fort_wall_mossy: '#65705C',
  wooden_path: '#9E7B65',
  wood_floor: '#A1887F',
  cobblestone: '#7A7F88',
  cobblestone_dark: '#5C6068',
  quarry_floor: '#9097A0',
  quarry_bedrock: '#767E86',
  brick: '#8B4513',
  roof_tile: '#4A4A52',
  timber_wall: '#5C4033',
  farmland: '#6D4C41',
  wheat: '#9E8C3A',
  ruins_floor: '#6D4C41',
  ash: '#616161',
  swamp: '#556B2F',
  ice: '#B3E5FC',
  lava: '#E65100',
  snow: '#ECEFF1',
  volcanic_rock: '#3E2723',
  water: '#1E88E5',
  water_corrupted: '#1A0A22',
  waterfall: '#42A5F5',
  // --- Bridges / crossings ---
  bridge: '#C4A882',
  bridge_corrupted: '#7D6A58',
  bridge_folded: '#8C6732',
  bridge_decay_blend: '#8D7B68',
  // --- Vertical / elevation art ---
  cliff: '#5D6A72',
  cliff_edge: '#6B7A85',
  cliff_edge_plains: '#7C8472',
  cliff_corrupted: '#4C4153',
  cliff_edge_corrupted: '#5A4F63',
  stairs: '#8A9096',
  ladder: '#6D4C41',
  curled_ladder: '#5D4037',
  gate_ladder: '#5D4037',
  gate_ladder_open: '#6D4C41',
  // --- Structures & large props (browns / greys) ---
  house: '#6D4C41',
  house_entry: '#5D4037',
  house_blue: '#5C6BC0',
  house_blue_entry: '#3949AB',
  house_green: '#558B2F',
  house_green_entry: '#33691E',
  house_thatch: '#6D4C41',
  house_thatch_entry: '#5D4037',
  cottage_house: '#6D4C41',
  cottage_house_entry: '#5D4037',
  cottage_house_forest: '#5D4037',
  cottage_house_forest_ruined: '#4E342E',
  cottage_house_ranger: '#5D4037',
  cottage_shed: '#5D4037',
  destroyed_house: '#4E342E',
  destroyed_house_rubble: '#3E2723',
  destroyed_house_overgrown: '#4A5C3A',
  observatory: '#78909C',
  // --- Guilrhym bespoke assets ---
  tenement_facade: '#6E4A3A',
  clocktower: '#8C8678',
  cathedral_facade: '#9E988B',
  townhouse_facade: '#C8B89E',
  warehouse_facade: '#4A3A34',
  baby_carriage: '#33384A',
  stagecoach: '#5A342A',
  burning_barricade: '#C0431F',
  memorial_column: '#B7AE9C',
  ritual_candle: '#E8B25A',
  campfire_remains: '#555049',
  manor_facade: '#C8B89E',
  boarded_facade: '#5A4636',
  timber_palisade: '#6D4C41',
  stone_low_wall: '#8A8A8A',
  chain_fence: '#546E7A',
  collapsed_masonry: '#6E7A82',
  cave_mouth: '#1B1B1B',
  cave_mouth_angled: '#1B1B1B',
  street_sign: '#3A5A4A',
  road_setts: '#5E6168',
  cobble_grand: '#9C968A',
  ashen_cobble: '#4A4640',
  waterlogged_cobble: '#44525A',
  // --- Gameplay objects ---
  tree: '#1B5E20',
  dead_tree: '#4E342E',
  rock: '#5C6A75',
  portal: '#9575CD',
  door: '#5D4037',
  door_interior: '#8D6E63',
  door_iron: '#546E7A',
  chest: '#B87333',
  chest_opened: '#8D6E63',
  special_chest: '#D8A72B',
  special_chest_opened: '#B28756',
  campfire: '#E64A19',
  bonfire: '#D84315',
  bonfire_unlit: '#5D4037',
  fog_gate: '#7E57C2',
  spike_trap: '#5D4037',
  fence: '#6D4C41',
  iron_fence: '#90A4AE',
  hedge: '#2E7D32',
  gate: '#78909C',
  barrel: '#6D4C41',
  crate: '#8D6E63',
  sign: '#D4A574',
  broken_sign: '#8D6E63',
  well: '#78909C',
  tombstone: '#9E9E9E',
  tombstone_broken: '#757575',
  tombstone_cracked_v: '#757575',
  statue: '#B0BEC5',
  wagon: '#6D4C41',
  cart: '#795548',
  market_stall: '#8D6E63',
  bench: '#6D4C41',
  windmill: '#6D4C41',
  hay_bale: '#C9B87C',
  scarecrow: '#8D6E63',
  lantern: '#FFB74D',
  street_lamp: '#FFF59D',
  fountain: '#64B5F6',
  pillar: '#90A4AE',
  boat_wreck: '#5D4037',
  dock: '#4E342E',
  // --- Smaller props / overlays ---
  flower: '#81C784',
  moonbloom: '#E1BEE7',
  tempest_grass: '#66BB6A',
  mushroom: '#CE93D8',
  stump: '#5D4037',
  ridge_lumberyard: '#6A472C',
  blighted_stump: '#4E342E',
  heresy_altar: '#7B4397',
  heresy_altar_cracked: '#5E3378',
  bones: '#A1887F',
  pot: '#8D6E63',
  rug: '#5D4037',
  pressure_plate: '#607D8B',
  hidden_wall: '#78909C',
  push_block: '#5D4037',
  switch_door: '#4E342E',
  shortcut_lever: '#8D6E63',
  bloodstain: '#5D1A1A',
  chain: '#9E9E9E',
  cage: '#6D4C41',
  bones_pile: '#A1887F',
  ranger_remains: '#6D4C41',
  bookshelf: '#5D4037',
  table: '#6D4C41',
  counter: '#6D4C41',
  bed: '#5D4037',
  wardrobe: '#5D4037',
  fireplace: '#BF360C',
  weapon_rack: '#6D4C41',
  alchemy_table: '#6D4C41',
  cauldron: '#424242',
  throne: '#FFD54F',
  altar: '#78909C',
  iron_railing: '#B0BEC5',
  sewer_grate: '#455A64',
  hanging_sign: '#D7CCC8',
  wall_torch: '#FF9800',
  awning: '#8D6E63',
  rubble: '#757575',
  broken_stall: '#6D4C41',
  crate_stack: '#795548',
  barrel_stack: '#6D4C41',
  chimney: '#616161',
};

const UNWALKABLE_FALLBACK = '#3E2723';
const WALKABLE_FALLBACK = '#4CAF50';

const MINIMAP_WATER_BLUE = MINIMAP_TILE_COLOR.water;
const MINIMAP_WATER_CORRUPT = MINIMAP_TILE_COLOR.water_corrupted;

function isWhisperingWoodsMap(mapName: string, mapKey?: string): boolean {
  return mapKey === 'forest' || mapName === 'Whispering Woods';
}

function isHollowGradientWaterTile(tileType: string): boolean {
  return tileType === 'water' || tileType === 'waterfall' || tileType === 'water_corrupted';
}

function parseMinimapHex(hex: string): [number, number, number] {
  const h = hex.replace('#', '');
  return [
    parseInt(h.slice(0, 2), 16),
    parseInt(h.slice(2, 4), 16),
    parseInt(h.slice(4, 6), 16),
  ];
}

function lerpMinimapHex(from: string, to: string, t: number): string {
  const clamped = Math.max(0, Math.min(1, t));
  const [r0, g0, b0] = parseMinimapHex(from);
  const [r1, g1, b1] = parseMinimapHex(to);
  const r = Math.round(r0 + (r1 - r0) * clamped);
  const g = Math.round(g0 + (g1 - g0) * clamped);
  const b = Math.round(b0 + (b1 - b0) * clamped);
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`.toUpperCase();
}

/**
 * Minimap pixel color for hollow-approach water — mirrors World.ts blend (intensity + visual blend).
 * Returns null when the caller should use the default terrain color path.
 */
export function minimapColorForHollowWater(
  tileX: number,
  tileY: number,
  tileType: string,
  mapName: string,
  mapKey?: string,
): string | null {
  if (!isWhisperingWoodsMap(mapName, mapKey) || !isHollowGradientWaterTile(tileType)) return null;

  const intensity = getHollowWaterCorruptionIntensity(tileX, tileY);
  if (intensity <= 0) return MINIMAP_WATER_BLUE;

  const blend = getHollowWaterVisualBlend(intensity);
  return lerpMinimapHex(MINIMAP_WATER_BLUE, MINIMAP_WATER_CORRUPT, blend);
}

function drawHollowWaterMinimapCell(
  ctx: CanvasRenderingContext2D,
  tileX: number,
  tileY: number,
  px: number,
  py: number,
  scale: number,
  color: string,
): void {
  ctx.fillStyle = color;
  ctx.fillRect(px, py, scale, scale);

  // At higher zoom, add a faint center fleck on stronger corruption (reads like in-world noise).
  const intensity = getHollowWaterCorruptionIntensity(tileX, tileY);
  if (scale >= 2 && intensity > 0.35) {
    const u = minimapTileHash(tileX, tileY);
    if (u > 0.55 - intensity * 0.2) {
      ctx.fillStyle = `rgba(140, 90, 170, ${0.12 + intensity * 0.2})`;
      const s = Math.max(1, Math.floor(scale * 0.4));
      ctx.fillRect(
        px + Math.floor((scale - s) * u),
        py + Math.floor((scale - s) * (1 - u)),
        s,
        s,
      );
    }
  }
}

/**
 * Landmark tile types that are always drawn on the map regardless of fog-of-war,
 * rendered as a proportionally-sized icon rather than a raw 1px tile so they read
 * clearly at minimap scale. Stone collision tiles are intentionally excluded - only
 * the meaningful asset anchors appear.
 *
 * icon size = pixels drawn per tile (centered). At scale=1 a raw tile is 1px,
 * so anything > 1 makes the structure visible before exploration.
 */
const LANDMARK_ICON_SIZES: Partial<Record<string, number>> = {
  // Large towers
  observatory: 6,
  windmill:    5,
  // Guilrhym - the Tolbooth reads as the big civic landmark; tenements as a dense
  // built-up mass; street props as small map dressing.
  clocktower:       6,
  cathedral_facade: 6,
  tenement_facade:  3,
  townhouse_facade: 3,
  warehouse_facade: 3,
  manor_facade:     3,
  boarded_facade:   3,
  collapsed_masonry: 3,
  stagecoach:       3,
  street_sign:      3,
  baby_carriage:    2,
  memorial_column:  4, // a dispersed civic landmark, between a statue and the Tolbooth
  burning_barricade: 2, // small map dressing
  // House variants - sized to read alongside the observatory/windmill
  house:                        5,
  house_entry:                  5,
  house_blue:                   5,
  house_blue_entry:             5,
  house_green:                  5,
  house_green_entry:            5,
  house_thatch:                 5,
  house_thatch_entry:           5,
  // Cottages
  cottage_house:                5,
  cottage_house_entry:          5,
  cottage_house_forest:         5,
  cottage_house_forest_ruined:  5,
  cottage_house_ranger:         5,
  cottage_shed:                 4,
  // Civic
  well:        3,
  fountain:    3,
  statue:      3,
  market_stall: 3,
  ridge_lumberyard: 4,
  quarry_crane: 4,
  special_chest: 3,
  special_chest_opened: 3,
  // Corrupted shrines - same landmark treatment as windmills / cottages
  heresy_altar:         5,
  heresy_altar_cracked: 5,
  // Revenant summoning sigils - active (purple) and failed/dud (ash) read as landmarks once found
  summoning_ritual:     5,
  summoning_ritual_dud: 5,
  // World transitions - always rendered as a visible landmark so portals read on the map
  portal:               5,
  fog_gate:             5,
  cave_mouth:           4,
  cave_mouth_angled:    4,
  // Lit bonfires (rest sites) - visible once discovered
  bonfire:              5,
};

/** Overlay / variant tile types that share a parent landmark sprite on the map. */
const MINIMAP_LANDMARK_ALIASES: Record<string, string> = {};

function resolveMinimapLandmarkType(type: string): string | null {
  const resolved = MINIMAP_LANDMARK_ALIASES[type] ?? type;
  return resolved in LANDMARK_ICON_SIZES ? resolved : null;
}

const HERESY_ALTAR_DESTROYED_FLAG_PREFIX = 'altar_destroyed_';
const HERESY_ALTAR_DESTROYED_LANDMARK_TYPE: TileType = 'heresy_altar_cracked';
let _destroyedAltarCacheKey = '';
let _destroyedAltarCache: Set<string> = new Set();

/** Tile types that get a downscaled sprite landmark on the minimap / full map. */
export function isMinimapLandmarkTile(type: string): boolean {
  return resolveMinimapLandmarkType(type) !== null;
}

function destroyedHeresyAltarKey(tx: number, ty: number): string {
  return `${tx},${ty}`;
}

function collectDestroyedHeresyAltars(
  state: GameState,
  currentMapId: string,
  mapWidth: number,
  mapHeight: number,
): Set<string> {
  const cacheKey = `${currentMapId}:${mapWidth}:${mapHeight}:${state.gameFlagsRevision}`;
  if (cacheKey === _destroyedAltarCacheKey) return _destroyedAltarCache;

  const prefix = `${HERESY_ALTAR_DESTROYED_FLAG_PREFIX}${currentMapId}_`;
  const destroyed = new Set<string>();

  for (const [flag, value] of Object.entries(state.gameFlags)) {
    if (!value || !flag.startsWith(prefix)) continue;
    const coords = flag.slice(prefix.length).split('_');
    if (coords.length !== 2) continue;

    const tx = Number(coords[0]);
    const ty = Number(coords[1]);
    if (!Number.isInteger(tx) || !Number.isInteger(ty)) continue;
    if (tx < 0 || ty < 0 || tx >= mapWidth || ty >= mapHeight) continue;
    destroyed.add(destroyedHeresyAltarKey(tx, ty));
  }

  _destroyedAltarCacheKey = cacheKey;
  _destroyedAltarCache = destroyed;
  return destroyed;
}

/** Visited tiles plus a 1-tile ring so unwalkable landmark anchors (altars, windmills) still draw. */
function collectLandmarkProbeTiles(
  visitedTiles: Array<{ x: number; y: number }>,
  mapWidth: number,
  mapHeight: number,
  revealAll: boolean,
): Array<{ x: number; y: number }> {
  if (revealAll) {
    const all: Array<{ x: number; y: number }> = [];
    for (let ty = 0; ty < mapHeight; ty++) {
      for (let tx = 0; tx < mapWidth; tx++) all.push({ x: tx, y: ty });
    }
    return all;
  }

  const seen = new Set<string>();
  const out: Array<{ x: number; y: number }> = [];
  const add = (tx: number, ty: number) => {
    if (tx < 0 || ty < 0 || tx >= mapWidth || ty >= mapHeight) return;
    const key = `${tx},${ty}`;
    if (seen.has(key)) return;
    seen.add(key);
    out.push({ x: tx, y: ty });
  };

  for (const { x, y } of visitedTiles) {
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) add(x + dx, y + dy);
    }
  }
  return out;
}


/** Deterministic 0..1 noise per map cell - stable across frames. */
function minimapTileHash(tx: number, ty: number): number {
  let n = Math.imul(tx, 92837111) ^ Math.imul(ty, 689287499);
  n = Math.imul(n ^ (n >>> 13), 1597334677);
  return ((n >>> 0) % 10001) / 10000;
}

/**
 * Deep Hollow floor on the map: stay rooted in forest greens, with mauve/violet “rot” blotches
 * (same language as corrupted bridge) - avoids a uniform beige desert read at small scale.
 */
function drawHollowBlightMinimapCell(
  ctx: CanvasRenderingContext2D,
  tx: number,
  ty: number,
  px: number,
  py: number,
  scale: number,
): void {
  const u = minimapTileHash(tx, ty);
  const u2 = minimapTileHash(tx + 101, ty + 17);
  const u3 = minimapTileHash(tx - 37, ty + 203);
  const bases = ['#243826', '#2a4a2e', '#2c4d30', '#203a24'];
  ctx.fillStyle = bases[(Math.floor(u * 4) + ty) % 4];
  ctx.fillRect(px, py, scale, scale);

  // Wider violet wash - ~half the cells get visible corruption (blotchy, not a solid tan field)
  if (u2 > 0.45) {
    ctx.fillStyle = u2 > 0.88 ? 'rgba(125, 78, 158, 0.48)' : 'rgba(72, 48, 96, 0.34)';
    const pad = Math.max(0, Math.min(scale - 1, Math.floor(scale * 0.12)));
    ctx.fillRect(px + pad, py + pad, scale - 2 * pad, scale - 2 * pad);
  }

  // Rare brighter flecks (bridge-adjacent purple family)
  if (u * u3 > 0.55 && scale >= 2) {
    ctx.fillStyle = 'rgba(168, 118, 198, 0.45)';
    const s = Math.max(1, Math.floor(scale * 0.42));
    const ox = px + Math.floor((scale - s) * (0.2 + u2 * 0.5));
    const oy = py + Math.floor((scale - s) * (0.15 + u3 * 0.55));
    ctx.fillRect(ox, oy, s, s);
  }
}

/** Whispering Woods: tileY 59–74 ⇒ world y &gt; ~-91 - south of deep hollow, still “sick” grass (bridge corridor). */
function isWhisperingWoodsHollowTransitionCell(mapName: string, tileY: number, tileType: string): boolean {
  if (mapName !== 'Whispering Woods') return false;
  if (tileY < 59 || tileY > 74) return false;
  return tileType === 'dark_grass' || tileType === 'grass' || tileType === 'tall_grass'
    || tileType === 'tall_grass_b' || tileType === 'tall_grass_c';
}

/** Softer than full hollow_blight - keeps map green-forward, faint violet specks ramping northward. */
function drawHollowTransitionMinimapCell(
  ctx: CanvasRenderingContext2D,
  tileX: number,
  tileY: number,
  px: number,
  py: number,
  scale: number,
): void {
  const u = minimapTileHash(tileX, tileY);
  const depthT = (74 - tileY) / 15;
  const greens = ['#2E7D32', '#2f6b32', '#336b2f'];
  ctx.fillStyle = greens[Math.floor(u * 3) % 3];
  ctx.fillRect(px, py, scale, scale);

  const u2 = minimapTileHash(tileX + 19, tileY + 3);
  if (u2 < 0.18 + depthT * 0.28) {
    ctx.fillStyle = `rgba(95, 58, 118, ${0.1 + depthT * 0.16})`;
    const pad = Math.max(0, Math.floor(scale * 0.1));
    ctx.fillRect(px + pad, py + pad, scale - 2 * pad, scale - 2 * pad);
  }
  if (minimapTileHash(tileX, tileY + 99) * u2 > 0.62 && scale >= 2) {
    ctx.fillStyle = `rgba(150, 100, 175, ${0.18 + depthT * 0.12})`;
    const s = Math.max(1, Math.floor(scale * 0.35));
    ctx.fillRect(px + Math.floor((scale - s) * 0.35), py + Math.floor((scale - s) * 0.4), s, s);
  }
}

/** Single source for one terrain pixel on the map canvas (handles hollow_blight multi-pass). */
export function drawMinimapTerrainCell(
  ctx: CanvasRenderingContext2D,
  tile: Tile,
  tileX: number,
  tileY: number,
  scale: number,
  mapHeight: number,
  mapName: string,
  mapKey?: string,
): void {
  const px = tileX * scale;
  const py = (mapHeight - 1 - tileY) * scale;
  const hollowWaterColor = minimapColorForHollowWater(tileX, tileY, tile.type, mapName, mapKey);
  if (hollowWaterColor) {
    drawHollowWaterMinimapCell(ctx, tileX, tileY, px, py, scale, hollowWaterColor);
    if (isWhisperingWoodsMap(mapName, mapKey) && scale <= 1) {
      ctx.fillStyle = 'rgba(255,255,255,0.12)';
      ctx.fillRect(px, py, scale, scale);
    }
    return;
  }
  if (tile.type === 'hollow_blight') {
    drawHollowBlightMinimapCell(ctx, tileX, tileY, px, py, scale);
    if (mapName === 'Whispering Woods' && scale <= 1) {
      ctx.fillStyle = 'rgba(255,255,255,0.14)';
      ctx.fillRect(px, py, scale, scale);
    }
    return;
  }
  if (isWhisperingWoodsHollowTransitionCell(mapName, tileY, tile.type)) {
    drawHollowTransitionMinimapCell(ctx, tileX, tileY, px, py, scale);
    if (scale <= 1) {
      ctx.fillStyle = 'rgba(255,255,255,0.14)';
      ctx.fillRect(px, py, scale, scale);
    }
    return;
  }
  ctx.fillStyle = tileColorForMinimap(tile);
  ctx.fillRect(px, py, scale, scale);
  if (isWhisperingWoodsMap(mapName, mapKey) && scale <= 1) {
    ctx.fillStyle = 'rgba(255,255,255,0.12)';
    ctx.fillRect(px, py, scale, scale);
  }
}

export function tileColorForMinimap(tile: Tile): string {
  if (tile.type === 'hollow_blight') return '#2a4a2e';
  const key = tile.type as string;
  const mapped = MINIMAP_TILE_COLOR[key];
  if (mapped) return mapped;
  if (!tile.walkable) return UNWALKABLE_FALLBACK;
  return WALKABLE_FALLBACK;
}

export function computeMinimapScale(
  mapWidth: number,
  mapHeight: number,
  maxAxisPixels: number,
  minScale = 1,
  maxScale = 16
): number {
  const dim = Math.max(mapWidth, mapHeight);
  // For small maps (interiors, arenas), allow higher scale to fill the space better
  const adaptiveMaxScale = dim < 50 ? Math.max(maxScale, 8) : maxScale;
  const s = Math.floor(maxAxisPixels / dim);
  return Math.max(minScale, Math.min(adaptiveMaxScale, s));
}

/** Pick largest integer scale so the full map fits inside maxWidth x maxHeight (HUD / modal). */
export function computeMinimapScaleToFit(
  mapWidth: number,
  mapHeight: number,
  maxWidth: number,
  maxHeight: number,
  minScale = 1,
  maxScale = 16
): number {
  if (maxWidth < 8 || maxHeight < 8) return minScale;
  const dim = Math.max(mapWidth, mapHeight);
  // For small maps (interiors, arenas), allow higher scale to fill the space better
  const adaptiveMaxScale = dim < 50 ? Math.max(maxScale, 14) : maxScale;
  const sx = Math.floor(maxWidth / mapWidth);
  const sy = Math.floor(maxHeight / mapHeight);
  const s = Math.min(sx, sy, adaptiveMaxScale);
  return Math.max(minScale, s);
}

export interface DrawMinimapParams {
  ctx: CanvasRenderingContext2D;
  currentMap: WorldMap;
  currentMapId: string;
  state: GameState;
  visited: Set<string>;
  markers: MapMarker[];
  scale: number;
  nowMs: number;
  revealAll?: boolean;
  assetManager?: AssetManager | null;
}

export interface DrawMinimapTerrainParams {
  ctx: CanvasRenderingContext2D;
  currentMap: WorldMap;
  currentMapId: string;
  state: GameState;
  visited: Set<string>;
  scale: number;
  revealAll?: boolean;
  assetManager?: AssetManager | null;
}

export interface DrawMinimapDynamicParams {
  ctx: CanvasRenderingContext2D;
  currentMap: WorldMap;
  currentMapId: string;
  state: GameState;
  markers: MapMarker[];
  scale: number;
  nowMs: number;
  clear?: boolean;
  includeFrame?: boolean;
  assetManager?: AssetManager | null;
  /** When provided, NPC dots are only drawn for NPCs near tiles the player has visited. */
  visited?: Set<string>;
}

let _cachedVisitedTiles: { x: number; y: number }[] = [];
let _cachedVisitedSize = -1;
let _cachedVisitedMapId = '';
let _cachedVisitedMapW = 0;
let _cachedVisitedMapH = 0;

function getVisitedTilesForMap(
  visited: Set<string>,
  currentMapId: string,
  w: number,
  h: number,
): { x: number; y: number }[] {
  if (
    visited.size === _cachedVisitedSize &&
    currentMapId === _cachedVisitedMapId &&
    w === _cachedVisitedMapW &&
    h === _cachedVisitedMapH
  ) {
    return _cachedVisitedTiles;
  }
  _cachedVisitedSize = visited.size;
  _cachedVisitedMapId = currentMapId;
  _cachedVisitedMapW = w;
  _cachedVisitedMapH = h;

  const result: { x: number; y: number }[] = [];
  for (const key of visited) {
    const tile = parseVisitedTileKey(key);
    if (!tile) continue;
    if (tile.mapId !== null && tile.mapId !== currentMapId) continue;
    if (tile.x >= 0 && tile.y >= 0 && tile.x < w && tile.y < h) {
      result.push(tile);
    }
  }
  _cachedVisitedTiles = result;
  return result;
}

// Fast NPC-discovery check: Set<"x,y"> for the current map, rebuilt only when visited changes.
let _cachedVisitedXY: Set<string> | null = null;
let _cachedVisitedXYSize = -1;
let _cachedVisitedXYMapId = '';

function getVisitedTileXYSet(
  visited: Set<string>,
  currentMapId: string,
  w: number,
  h: number,
): Set<string> {
  if (visited.size === _cachedVisitedXYSize && currentMapId === _cachedVisitedXYMapId && _cachedVisitedXY) {
    return _cachedVisitedXY;
  }
  _cachedVisitedXYSize = visited.size;
  _cachedVisitedXYMapId = currentMapId;
  const tiles = getVisitedTilesForMap(visited, currentMapId, w, h);
  _cachedVisitedXY = new Set(tiles.map(t => `${t.x},${t.y}`));
  return _cachedVisitedXY;
}

/**
 * Single source of truth for minimap + full map canvas rendering.
 */
export function drawMinimapTerrain(p: DrawMinimapTerrainParams): void {
  const { ctx, currentMap, currentMapId, state, visited, scale, revealAll = false, assetManager = null } = p;
  const w = currentMap.width;
  const h = currentMap.height;
  const playerPosition = state.player.position;
  const tiles = currentMap.tiles;

  ctx.fillStyle = '#0a0806';
  ctx.fillRect(0, 0, w * scale, h * scale);

  const playerTileX = Math.floor(playerPosition.x + w / 2);
  const playerTileY = Math.floor(playerPosition.y + h / 2);

  const visibleVisitedTiles = getVisitedTilesForMap(visited, currentMapId, w, h);
  if (revealAll) {
    for (let ty = 0; ty < h; ty++) {
      for (let tx = 0; tx < w; tx++) {
        const tile = tiles[ty]?.[tx];
        if (!tile) continue;
        drawMinimapTerrainCell(ctx, tile, tx, ty, scale, h, currentMap.name, currentMap.mapKey);
      }
    }
  } else {
    if (visibleVisitedTiles.length === 0) {
      const revealRadius = 5;
      for (let dy = -revealRadius; dy <= revealRadius; dy++) {
        for (let dx = -revealRadius; dx <= revealRadius; dx++) {
          const tx = playerTileX + dx;
          const ty = playerTileY + dy;
          if (tx >= 0 && ty >= 0 && tx < w && ty < h) {
            const tile = tiles[ty]?.[tx];
            if (tile) {
              drawMinimapTerrainCell(ctx, tile, tx, ty, scale, h, currentMap.name, currentMap.mapKey);
            }
          }
        }
      }
    }

    for (const tileInfo of visibleVisitedTiles) {
      const { x, y } = tileInfo;
      const tile = tiles[y]?.[x];
      if (!tile) continue;
      drawMinimapTerrainCell(ctx, tile, x, y, scale, h, currentMap.name, currentMap.mapKey);
    }
  }

  // Landmark pass - draws each known structure as a downscaled sprite centered on its
  // anchor tile so landmarks read like miniature versions of the in-world asset. Only
  // runs for tiles the player has already seen (visited set, or full reveal mode), so
  // landmarks don't leak unexplored areas. Falls back to a solid color block when the
  // sprite texture isn't drawable (e.g. AssetManager unavailable).
  const LANDMARK_SIZE_MULT = 1.75;
  const destroyedHeresyAltars = collectDestroyedHeresyAltars(state, currentMapId, w, h);
  const drawDestroyedHeresyAltarMark = (dx: number, dy: number, size: number) => {
    const inset = Math.max(1, Math.round(size * 0.24));
    const lineWidth = Math.max(2, Math.round(size * 0.18));

    ctx.save();
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = 'rgba(35, 5, 5, 0.92)';
    ctx.lineWidth = lineWidth + Math.max(2, Math.round(size * 0.08));
    ctx.beginPath();
    ctx.moveTo(dx + inset, dy + inset);
    ctx.lineTo(dx + size - inset, dy + size - inset);
    ctx.moveTo(dx + size - inset, dy + inset);
    ctx.lineTo(dx + inset, dy + size - inset);
    ctx.stroke();

    ctx.strokeStyle = '#E53935';
    ctx.lineWidth = lineWidth;
    ctx.beginPath();
    ctx.moveTo(dx + inset, dy + inset);
    ctx.lineTo(dx + size - inset, dy + size - inset);
    ctx.moveTo(dx + size - inset, dy + inset);
    ctx.lineTo(dx + inset, dy + size - inset);
    ctx.stroke();
    ctx.restore();
  };
  const drawLandmark = (tx: number, ty: number, overrideType?: TileType, destroyed = false) => {
    const tile = tiles[ty]?.[tx];
    if (!tile && !overrideType) return;
    const landmarkType = resolveMinimapLandmarkType(overrideType ?? tile?.type ?? '');
    if (!landmarkType) return;
    const iconPx = LANDMARK_ICON_SIZES[landmarkType];
    if (!iconPx) return;
    const sized = Math.round(iconPx * LANDMARK_SIZE_MULT);
    const size = Math.max(sized, scale * sized);
    const half = Math.floor(size / 2);
    const basePx = tx * scale + Math.floor(scale / 2);
    const basePy = (h - 1 - ty) * scale + Math.floor(scale / 2);
    const dx = basePx - half;
    const dy = basePy - half;

    // The dud tile's own texture is a white alpha-mask (filled with ash in-world), so swap to a
    // dedicated opaque ash-grey icon for the map; everything else draws its in-world texture.
    const textureId = landmarkType === 'summoning_ritual_dud' ? 'summoning_ritual_dud_icon' : landmarkType;
    const sprite = assetManager ? getDrawableFromTexture(assetManager.getTexture(textureId)) : null;
    if (sprite) {
      ctx.drawImage(sprite, dx, dy, size, size);
    } else {
      ctx.fillStyle = overrideType
        ? tileColorForMinimap({ type: landmarkType, walkable: false })
        : tileColorForMinimap(tile);
      ctx.fillRect(dx, dy, size, size);
    }

    if (destroyed) {
      drawDestroyedHeresyAltarMark(dx, dy, size);
    }
  };

  const prevSmoothing = ctx.imageSmoothingEnabled;
  ctx.imageSmoothingEnabled = false;
  for (const { x, y } of collectLandmarkProbeTiles(visibleVisitedTiles, w, h, revealAll)) {
    const key = destroyedHeresyAltarKey(x, y);
    if (destroyedHeresyAltars.has(key)) {
      drawLandmark(x, y, HERESY_ALTAR_DESTROYED_LANDMARK_TYPE, true);
      continue;
    }
    const tile = tiles[y]?.[x];
    if (!tile || !isMinimapLandmarkTile(tile.type)) continue;
    drawLandmark(x, y);
  }
  ctx.imageSmoothingEnabled = prevSmoothing;
}

export function drawMinimapDynamicOverlay(p: DrawMinimapDynamicParams): void {
  const { ctx, currentMap, currentMapId, state, markers, scale, nowMs, clear = false, includeFrame = true, assetManager = null, visited } = p;
  const w = currentMap.width;
  const h = currentMap.height;
  const playerPosition = state.player.position;
  const npcs = state.npcs;
  const primaryObjectiveMarkers = markers.filter(marker => isPrimaryObjectiveMarker(marker, state));
  const objectiveNpcIds = new Set(
    npcs
      .filter(npc => isNpcObjectiveTarget(npc, currentMapId, primaryObjectiveMarkers))
      .map(npc => npc.id)
  );
  const objectiveNpcMarkerIds = new Set(
    primaryObjectiveMarkers
      .filter(marker => marker.type === 'quest' && npcs.some(npc => markerTargetsNpc(marker, npc)))
      .map(marker => marker.id)
  );

  if (clear) {
    ctx.clearRect(0, 0, w * scale, h * scale);
  }

  // ── Layer 1: NPC orange dots (drawn first so quest diamonds paint over them) ──
  const NPC_DISCOVER_RADIUS = 4;
  const visitedXY = visited ? getVisitedTileXYSet(visited, currentMapId, w, h) : null;

  for (const npc of npcs) {
    if (objectiveNpcIds.has(npc.id)) continue;
    const npcX = Math.floor(npc.position.x + w / 2);
    const npcY = Math.floor(npc.position.y + h / 2);

    // Only show NPCs near tiles the player has already explored.
    if (visitedXY) {
      let discovered = false;
      outer: for (let dy = -NPC_DISCOVER_RADIUS; dy <= NPC_DISCOVER_RADIUS; dy++) {
        for (let dx = -NPC_DISCOVER_RADIUS; dx <= NPC_DISCOVER_RADIUS; dx++) {
          if (visitedXY.has(`${npcX + dx},${npcY + dy}`)) { discovered = true; break outer; }
        }
      }
      if (!discovered) continue;
    }

    const nx = npcX * scale + scale / 2;
    const ny = (h - 1 - npcY) * scale + scale / 2;

    const npcR = Math.max(scale, scale >= 6 ? 5 : 3);
    ctx.beginPath();
    ctx.arc(nx, ny, npcR + 1.5, 0, Math.PI * 2);
    ctx.fillStyle = '#0a0806';
    ctx.globalAlpha = 0.7;
    ctx.fill();
    ctx.globalAlpha = 1;
    ctx.beginPath();
    ctx.arc(nx, ny, npcR, 0, Math.PI * 2);
    ctx.fillStyle = '#FF7043';
    ctx.fill();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1;
    ctx.globalAlpha = 0.55;
    ctx.stroke();
    ctx.globalAlpha = 1;
  }

  // ── Layer 2: Quest / POI markers (on top of NPC dots) ────────────────────────
  for (const marker of markers) {
    const mx = marker.tileX * scale;
    const my = (h - 1 - marker.tileY) * scale;
    const isObjectiveMarker = isPrimaryObjectiveMarker(marker, state);
    const isPulsing = isObjectiveMarker && nowMs < marker.pulseUntil;
    const markerColor = isObjectiveMarker
      ? '#FFD700'
      : (marker.type === 'quest' || marker.type === 'poi') ? '#8FBC8F' : marker.color;

    // Optional / skippable content (side quests, POIs, optional field bosses) renders
    // HOLLOW so it visibly recedes from the solid pulsing primary objective - the player
    // reads it as "you may detour here", not "you missed a turn". NPC and portal markers
    // keep their solid read (they're people / navigation, not opt-in destinations).
    const isOptional = !isObjectiveMarker
      && (marker.type === 'quest' || marker.type === 'poi' || marker.type === 'danger');

    const cx = mx + scale / 2;
    const cy = my + scale / 2;

    const isNpcObjectiveMarker = objectiveNpcMarkerIds.has(marker.id);

    const haloRadius = Math.max(7, scale * 1);
    // Soft dark backdrop so the marker reads against any landmark sprite color underneath.
    ctx.beginPath();
    ctx.arc(cx, cy, haloRadius + 1, 0, Math.PI * 2);
    ctx.fillStyle = '#0a0806';
    ctx.globalAlpha = 0.42;
    ctx.fill();
    ctx.globalAlpha = 1;

    ctx.beginPath();
    ctx.arc(cx, cy, haloRadius, 0, Math.PI * 2);
    ctx.fillStyle = markerColor;
    ctx.globalAlpha = isNpcObjectiveMarker ? 0.3 : 0.42;
    ctx.fill();
    ctx.globalAlpha = 1;

    if (isNpcObjectiveMarker) {
      const coreRadius = Math.max(scale >= 6 ? 5 : 3.5, scale * 0.7);
      ctx.beginPath();
      ctx.arc(cx, cy, coreRadius, 0, Math.PI * 2);
      ctx.fillStyle = markerColor;
      ctx.fill();
      ctx.beginPath();
      ctx.arc(cx, cy, coreRadius * 0.45, 0, Math.PI * 2);
      ctx.fillStyle = '#fff7d6';
      ctx.fill();
    } else {
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(Math.PI / 4);
      const markerSize = Math.max(scale * 1.5, 6);
      const darkPad = 1.5;
      ctx.fillStyle = '#0a0806';
      ctx.fillRect(
        -(markerSize + darkPad * 2) / 2,
        -(markerSize + darkPad * 2) / 2,
        markerSize + darkPad * 2,
        markerSize + darkPad * 2,
      );
      if (isOptional) {
        // Hollow diamond: faint fill + a bold colored outline (no white ring).
        ctx.fillStyle = markerColor;
        ctx.globalAlpha = 0.16;
        ctx.fillRect(-markerSize / 2, -markerSize / 2, markerSize, markerSize);
        ctx.globalAlpha = 1;
        ctx.strokeStyle = markerColor;
        ctx.lineWidth = Math.max(1.5, scale >= 6 ? 2.5 : 1.5);
        ctx.strokeRect(-markerSize / 2, -markerSize / 2, markerSize, markerSize);
      } else {
        ctx.fillStyle = markerColor;
        ctx.fillRect(-markerSize / 2, -markerSize / 2, markerSize, markerSize);
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = Math.max(1, scale >= 6 ? 2 : 1);
        ctx.globalAlpha = 0.7;
        ctx.strokeRect(-markerSize / 2, -markerSize / 2, markerSize, markerSize);
        ctx.globalAlpha = 1;
      }
      ctx.restore();
    }

    if (isPulsing || isNpcObjectiveMarker) {
      const age = nowMs - marker.createdAt;
      const ringCount = isNpcObjectiveMarker ? 1 : 2;
      for (let ring = 0; ring < ringCount; ring++) {
        const pulsePhase = ((age + ring * 600) % 1500) / 1500;
        let ringRadius: number;
        let ringAlpha: number;
        if (isNpcObjectiveMarker) {
          ringRadius = 4 + pulsePhase * (scale >= 6 ? 10 : 7);
          ringAlpha = (1 - pulsePhase) * 0.28;
        } else {
          ringRadius = 5 + pulsePhase * (scale >= 6 ? 28 : 20);
          ringAlpha = (1 - pulsePhase) * 0.7;
        }

        ctx.beginPath();
        ctx.arc(cx, cy, ringRadius, 0, Math.PI * 2);
        ctx.strokeStyle = markerColor;
        ctx.globalAlpha = ringAlpha;
        ctx.lineWidth = isNpcObjectiveMarker
          ? (scale >= 6 ? 2 : 1.5)
          : (scale >= 6 ? 3 : 2.5);
        ctx.stroke();
        ctx.globalAlpha = 1;
      }
    }
  }

  const stain = state.droppedEssence;
  if (hasActiveDroppedEssence(state, currentMapId) && stain) {
    const ex = Math.floor(stain.x + w / 2);
    const ey = Math.floor(stain.y + h / 2);
    const essX = ex * scale + scale / 2;
    const essY = (h - 1 - ey) * scale + scale / 2;
    const pulse = 0.75 + Math.sin(nowMs / 400) * 0.25;
    const sprite = assetManager ? getDrawableFromTexture(assetManager.getTexture('essence_drop')) : null;
    const size = Math.max(scale * 4, scale >= 6 ? 18 : 10);
    const half = size / 2;
    const glowR = Math.max(size * 0.55, scale >= 6 ? 12 : 7);

    ctx.beginPath();
    ctx.arc(essX, essY, glowR, 0, Math.PI * 2);
    ctx.fillStyle = LOST_ESSENCE_MARKER_GLOW;
    ctx.globalAlpha = 0.3 * pulse;
    ctx.fill();
    ctx.globalAlpha = 1;

    if (sprite) {
      const prevSmoothing = ctx.imageSmoothingEnabled;
      ctx.imageSmoothingEnabled = false;
      ctx.save();
      ctx.globalAlpha = 0.9 + 0.1 * pulse;
      ctx.drawImage(sprite, essX - half, essY - half, size, size);
      ctx.restore();
      ctx.imageSmoothingEnabled = prevSmoothing;
    } else {
      ctx.beginPath();
      ctx.arc(essX, essY, Math.max(scale + 2, scale >= 6 ? 8 : 5), 0, Math.PI * 2);
      ctx.fillStyle = LOST_ESSENCE_MARKER_COLOR;
      ctx.globalAlpha = 0.92 * pulse;
      ctx.fill();
      ctx.globalAlpha = 1;
    }
  }

  const playerX = Math.floor(playerPosition.x + w / 2);
  const playerY = Math.floor(playerPosition.y + h / 2);
  const px = playerX * scale + scale / 2;
  const py = (h - 1 - playerY) * scale + scale / 2;
  // Player marker on the minimap / full map - sized to read at roughly the
  // same prominence as bonfire landmark sprites (~9 × scale) so the player's
  // dot doesn't get lost next to discovered landmarks on busy maps.
  const playerMarkerSize = Math.max(scale * 7.5, scale >= 6 ? 26 : 18);
  drawPlayerFaceMapMarker(ctx, px, py, playerMarkerSize, assetManager, state.equippedWeaponId);

  if (includeFrame) {
    ctx.strokeStyle = '#3a2812';
    ctx.lineWidth = scale >= 6 ? 3 : 2;
    ctx.strokeRect(0, 0, w * scale, h * scale);
  }
}

export function drawMinimapContent(p: DrawMinimapParams): void {
  const { ctx, currentMap, currentMapId, state, visited, markers, scale, nowMs, revealAll = false, assetManager = null } = p;
  drawMinimapTerrain({
    ctx,
    currentMap,
    currentMapId,
    state,
    visited,
    scale,
    revealAll,
    assetManager,
  });
  drawMinimapDynamicOverlay({
    ctx,
    currentMap,
    currentMapId,
    state,
    markers,
    scale,
    nowMs,
    assetManager,
    visited,
  });
}
