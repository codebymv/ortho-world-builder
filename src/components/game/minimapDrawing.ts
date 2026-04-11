import type { TileType, WorldMap, Tile } from '@/lib/game/World';
import type { GameState } from '@/lib/game/GameState';
import { isNpcObjectiveTarget, isPrimaryObjectiveMarker, markerTargetsNpc, type MapMarker } from '@/lib/game/MapMarkers';
import { parseVisitedTileKey } from '@/lib/game/visitedTiles';

export const MARKER_TYPE_ICONS: Record<string, string> = {
  quest: '!',
  poi: '+',
  danger: '!',
  npc: 'o',
  portal: '>',
};

/** Short labels for compact HUD legend */
export const MARKER_TYPE_SHORT: Record<string, string> = {
  quest: 'Goal',
  poi: 'Place',
  danger: 'Risk',
  npc: 'NPC',
  portal: 'Gate',
};

/** Readable names for full map modal */
export const MARKER_TYPE_NAMES: Record<string, string> = {
  quest: 'Current objective',
  poi: 'Landmark',
  danger: 'Danger area',
  npc: 'Character',
  portal: 'Passage',
};

/**
 * Pixel colors aligned with `AssetManager` procedural tints (`createColorTexture` hexes) so the
 * minimap / full map read as the same materials as the overworld. Unknown types fall back to
 * walkable grass or generic unwalkable soil.
 */
const MINIMAP_TILE_COLOR: Partial<Record<TileType, string>> & Record<string, string> = {
  // --- Base terrain (AssetManager) ---
  grass: '#4CAF50',
  tall_grass: '#388E3C',
  dark_grass: '#2E7D32',
  dirt: '#8D6E63',
  sand: '#E8D4B0',
  stone: '#6E7B85',
  wood: '#795548',
  mossy_stone: '#6B7B5A',
  wooden_path: '#9E7B65',
  wood_floor: '#A1887F',
  cobblestone: '#7A7F88',
  cobblestone_dark: '#5C6068',
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
  bridge_decay_blend: '#8D7B68',
  // --- Vertical / elevation art ---
  cliff: '#5D6A72',
  cliff_edge: '#6B7A85',
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
  blighted_stump: '#4E342E',
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

/** Legend rows for the full-map modal — grouped materials (same hues as minimap). */
export const MINIMAP_TERRAIN_LEGEND: ReadonlyArray<{ label: string; color: string }> = [
  { label: 'Grass & clearings', color: '#4CAF50' },
  { label: 'Forest & dark grass', color: '#2E7D32' },
  { label: 'Hollow blight (grass + violet rot)', color: '#355a3c' },
  { label: 'Hollow approach (light rot, before y -91)', color: '#2f5c34' },
  { label: 'Dirt, sand & wooden paths', color: '#8D6E63' },
  { label: 'Water & waterfalls', color: '#1E88E5' },
  { label: 'Stone, cobble & ruins', color: '#7A7F88' },
  { label: 'Cliffs & stairs', color: '#5D6A72' },
  { label: 'Trees & dense wood', color: '#1B5E20' },
  { label: 'Structures & props', color: '#6D4C41' },
];

/** Deterministic 0..1 noise per map cell — stable across frames. */
function minimapTileHash(tx: number, ty: number): number {
  let n = Math.imul(tx, 92837111) ^ Math.imul(ty, 689287499);
  n = Math.imul(n ^ (n >>> 13), 1597334677);
  return ((n >>> 0) % 10001) / 10000;
}

/**
 * Deep Hollow floor on the map: stay rooted in forest greens, with mauve/violet “rot” blotches
 * (same language as corrupted bridge) — avoids a uniform beige desert read at small scale.
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

  // Wider violet wash — ~half the cells get visible corruption (blotchy, not a solid tan field)
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

/** Whispering Woods: tileY 59–74 ⇒ world y &gt; ~-91 — south of deep hollow, still “sick” grass (bridge corridor). */
function isWhisperingWoodsHollowTransitionCell(mapName: string, tileY: number, tileType: string): boolean {
  if (mapName !== 'Whispering Woods') return false;
  if (tileY < 59 || tileY > 74) return false;
  return tileType === 'dark_grass' || tileType === 'grass' || tileType === 'tall_grass';
}

/** Softer than full hollow_blight — keeps map green-forward, faint violet specks ramping northward. */
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
): void {
  const px = tileX * scale;
  const py = (mapHeight - 1 - tileY) * scale;
  if (tile.type === 'hollow_blight') {
    drawHollowBlightMinimapCell(ctx, tileX, tileY, px, py, scale);
    return;
  }
  if (isWhisperingWoodsHollowTransitionCell(mapName, tileY, tile.type)) {
    drawHollowTransitionMinimapCell(ctx, tileX, tileY, px, py, scale);
    return;
  }
  ctx.fillStyle = tileColorForMinimap(tile);
  ctx.fillRect(px, py, scale, scale);
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
  const s = Math.floor(maxAxisPixels / dim);
  return Math.max(minScale, Math.min(maxScale, s));
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
  const sx = Math.floor(maxWidth / mapWidth);
  const sy = Math.floor(maxHeight / mapHeight);
  const s = Math.min(sx, sy, maxScale);
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

/**
 * Single source of truth for minimap + full map canvas rendering.
 */
export function drawMinimapContent(p: DrawMinimapParams): void {
  const { ctx, currentMap, currentMapId, state, visited, markers, scale, nowMs } = p;
  const w = currentMap.width;
  const h = currentMap.height;
  const tiles = currentMap.tiles;

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

  ctx.fillStyle = '#0a0806';
  ctx.fillRect(0, 0, w * scale, h * scale);

  const playerTileX = Math.floor(playerPosition.x + w / 2);
  const playerTileY = Math.floor(playerPosition.y + h / 2);

  const visibleVisitedTiles = getVisitedTilesForMap(visited, currentMapId, w, h);

  if (visibleVisitedTiles.length === 0) {
    const revealRadius = 5;
    for (let dy = -revealRadius; dy <= revealRadius; dy++) {
      for (let dx = -revealRadius; dx <= revealRadius; dx++) {
        const tx = playerTileX + dx;
        const ty = playerTileY + dy;
        if (tx >= 0 && ty >= 0 && tx < w && ty < h) {
          const tile = tiles[ty]?.[tx];
          if (tile) {
            drawMinimapTerrainCell(ctx, tile, tx, ty, scale, h, currentMap.name);
          }
        }
      }
    }
  }

  for (const tileInfo of visibleVisitedTiles) {
    const { x, y } = tileInfo;
    const tile = tiles[y]?.[x];
    if (!tile) continue;
    drawMinimapTerrainCell(ctx, tile, x, y, scale, h, currentMap.name);
  }

  for (const marker of markers) {
    const mx = marker.tileX * scale;
    const my = (h - 1 - marker.tileY) * scale;
    const isPulsing = nowMs < marker.pulseUntil;

    const cx = mx + scale / 2;
    const cy = my + scale / 2;

    const isNpcObjectiveMarker = objectiveNpcMarkerIds.has(marker.id);

    ctx.beginPath();
    ctx.arc(cx, cy, Math.max(6, scale * 0.9), 0, Math.PI * 2);
    ctx.fillStyle = marker.color;
    ctx.globalAlpha = isNpcObjectiveMarker ? 0.18 : 0.25;
    ctx.fill();
    ctx.globalAlpha = 1;

    if (isNpcObjectiveMarker) {
      const coreRadius = Math.max(scale >= 6 ? 5 : 3.5, scale * 0.7);
      ctx.beginPath();
      ctx.arc(cx, cy, coreRadius, 0, Math.PI * 2);
      ctx.fillStyle = marker.color;
      ctx.fill();
      ctx.beginPath();
      ctx.arc(cx, cy, coreRadius * 0.45, 0, Math.PI * 2);
      ctx.fillStyle = '#fff7d6';
      ctx.fill();
    } else {
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(Math.PI / 4);
      const markerSize = Math.max(scale * 1.5, 4);
      ctx.fillStyle = marker.color;
      ctx.fillRect(-markerSize / 2, -markerSize / 2, markerSize, markerSize);
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = Math.max(1, scale >= 6 ? 2 : 1);
      ctx.globalAlpha = 0.65;
      ctx.strokeRect(-markerSize / 2, -markerSize / 2, markerSize, markerSize);
      ctx.globalAlpha = 1;
      ctx.restore();
    }

    if (isPulsing || isNpcObjectiveMarker) {
      const age = nowMs - marker.createdAt;
      const ringCount = isNpcObjectiveMarker ? 1 : 2;
      for (let ring = 0; ring < ringCount; ring++) {
        const pulsePhase = ((age + ring * 750) % 1500) / 1500;
        const ringRadius = isNpcObjectiveMarker
          ? 4 + pulsePhase * (scale >= 6 ? 10 : 7)
          : 5 + pulsePhase * (scale >= 6 ? 28 : 20);
        const ringAlpha = isNpcObjectiveMarker
          ? (1 - pulsePhase) * 0.28
          : (1 - pulsePhase) * 0.7;

        ctx.beginPath();
        ctx.arc(cx, cy, ringRadius, 0, Math.PI * 2);
        ctx.strokeStyle = marker.color;
        ctx.globalAlpha = ringAlpha;
        ctx.lineWidth = isNpcObjectiveMarker ? (scale >= 6 ? 2 : 1.5) : (scale >= 6 ? 3 : 2.5);
        ctx.stroke();
        ctx.globalAlpha = 1;
      }
    }
  }

  const stain = state.droppedEssence;
  if (stain && stain.mapId === currentMapId && stain.amount > 0) {
    const ex = Math.floor(stain.x + w / 2);
    const ey = Math.floor(stain.y + h / 2);
    const essX = ex * scale + scale / 2;
    const essY = (h - 1 - ey) * scale + scale / 2;
    const pulse = 0.55 + Math.sin(nowMs / 400) * 0.45;
    const r = Math.max(scale + 2, scale >= 6 ? 8 : 5);
    ctx.beginPath();
    ctx.arc(essX, essY, r, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(186,104,255,${0.5 * pulse})`;
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.55)';
    ctx.lineWidth = scale >= 6 ? 2 : 1;
    ctx.stroke();
  }

  for (const npc of npcs) {
    if (objectiveNpcIds.has(npc.id)) continue;
    const npcX = Math.floor(npc.position.x + w / 2);
    const npcY = Math.floor(npc.position.y + h / 2);
    const nx = npcX * scale + scale / 2;
    const ny = (h - 1 - npcY) * scale + scale / 2;

    ctx.beginPath();
    ctx.arc(nx, ny, Math.max(scale, scale >= 6 ? 5 : 3), 0, Math.PI * 2);
    ctx.fillStyle = '#FFD700';
    ctx.fill();
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 1;
    ctx.globalAlpha = 0.5;
    ctx.stroke();
    ctx.globalAlpha = 1;
  }

  const playerX = Math.floor(playerPosition.x + w / 2);
  const playerY = Math.floor(playerPosition.y + h / 2);
  const px = playerX * scale + scale / 2;
  const py = (h - 1 - playerY) * scale + scale / 2;
  const playerPulse = 0.7 + Math.sin(nowMs / 400) * 0.3;

  ctx.beginPath();
  ctx.arc(px, py, Math.max(scale + 3, scale >= 6 ? 10 : 6), 0, Math.PI * 2);
  ctx.fillStyle = '#4488ff';
  ctx.globalAlpha = 0.25 * playerPulse;
  ctx.fill();
  ctx.globalAlpha = 1;

  const playerSize = Math.max(scale + 2, scale >= 6 ? 8 : 5);
  ctx.fillStyle = '#4488ff';
  ctx.beginPath();
  ctx.arc(px, py, playerSize, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(px, py, playerSize * 0.5, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = '#3a2812';
  ctx.lineWidth = scale >= 6 ? 3 : 2;
  ctx.strokeRect(0, 0, w * scale, h * scale);
}
