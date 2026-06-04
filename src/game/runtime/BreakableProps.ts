import * as THREE from 'three';
import type { TileType, WorldMap } from '@/lib/game/World';
import { TILE_METADATA } from '@/data/tiles';

export const BREAKABLE_TILES: ReadonlySet<TileType> = new Set<TileType>([
  'barrel',
  'barrel_stack',
  'crate',
  'crate_stack',
  'pot',
  'cart',
  'wagon',
  'broken_stall',
  'hay_bale',
  'bench',
  'lantern',
  // Tall grass: walkable but slows movement; any swing clears it back to its grass base.
  'tall_grass',
]);

const WALKABLE_BASE_TILES: ReadonlySet<TileType> = new Set<TileType>([
  'grass', 'dirt', 'stone', 'wood', 'sand', 'swamp', 'ice',
  'cobblestone', 'farmland', 'ash', 'ruins_floor', 'dark_grass', 'hollow_blight',
  'mossy_stone', 'wooden_path', 'wood_floor',
]);

const DEBRIS_COLORS: Partial<Record<TileType, number>> = {
  barrel:       0x8B6914,
  barrel_stack: 0x8B6914,
  crate:        0x8B6914,
  crate_stack:  0x8B6914,
  cart:         0x8B6914,
  wagon:        0x8B6914,
  broken_stall: 0x8B6914,
  pot:          0xB5651D,
  hay_bale:     0xD4A017,
  bench:        0x8B6914,
  lantern:      0x666666,
  tall_grass:   0x5BA84F,
};

export interface BreakableWorld {
  getCurrentMap(): WorldMap;
  refreshMapTileRegion(minTX: number, minTY: number, maxTX: number, maxTY: number): void;
}

interface BreakableParticles {
  emit(position: THREE.Vector3, count: number, color: number, lifetime: number, speed: number, spread: number): void;
}

export interface BreakableSoundHandlers {
  generic?: () => void;
  tallGrass?: () => void;
}

type BreakableSound = (() => void) | BreakableSoundHandlers;

function resolveBaseTile(map: WorldMap, tx: number, ty: number, fallback: TileType): TileType {
  const counts = new Map<TileType, number>();
  for (const [dx, dy] of [[0, 1], [0, -1], [1, 0], [-1, 0]] as const) {
    const nx = tx + dx;
    const ny = ty + dy;
    if (ny < 0 || ny >= map.height || nx < 0 || nx >= map.width) continue;
    const t = map.tiles[ny]?.[nx]?.type;
    if (!t) continue;
    if (TILE_METADATA[t]?.isOverlay) continue;
    counts.set(t, (counts.get(t) || 0) + 1);
  }
  let best = fallback;
  let bestN = 0;
  for (const [t, n] of counts) {
    if (n > bestN) { best = t; bestN = n; }
  }
  return best;
}

const _tmpVec = new THREE.Vector3();

function playBreakableSound(sound: BreakableSound | undefined, tileType: TileType): void {
  if (!sound) return;
  if (typeof sound === 'function') {
    sound();
    return;
  }
  if (tileType === 'tall_grass') {
    (sound.tallGrass ?? sound.generic)?.();
    return;
  }
  sound.generic?.();
}

function breakTileAtWithType(
  world: BreakableWorld,
  map: WorldMap,
  tileX: number,
  tileY: number,
  particles: BreakableParticles,
  playSound?: BreakableSound,
): TileType | null {
  if (tileY < 0 || tileY >= map.height || tileX < 0 || tileX >= map.width) return null;
  const tile = map.tiles[tileY][tileX];
  const brokenType = tile.type;
  if (!BREAKABLE_TILES.has(brokenType)) return null;

  const color = DEBRIS_COLORS[brokenType] ?? 0x8B6914;
  const fallback = TILE_METADATA[brokenType]?.baseTile ?? 'grass';
  const baseType = tile.baseTile ?? resolveBaseTile(map, tileX, tileY, fallback as TileType);

  map.tiles[tileY][tileX] = {
    type: baseType,
    walkable: WALKABLE_BASE_TILES.has(baseType),
    elevation: tile.elevation ?? 0,
  };

  world.refreshMapTileRegion(tileX - 1, tileY - 1, tileX + 1, tileY + 1);

  const worldX = tileX - map.width / 2 + 0.5;
  const worldY = tileY - map.height / 2 + 0.5;
  _tmpVec.set(worldX, worldY, 0.3);
  particles.emit(_tmpVec.clone(), 6, color, 0.6, 1.5, 1.2);

  playBreakableSound(playSound, brokenType);

  return brokenType;
}

export function breakTileAt(
  world: BreakableWorld,
  map: WorldMap,
  tileX: number,
  tileY: number,
  particles: BreakableParticles,
  playSound?: BreakableSound,
): boolean {
  return breakTileAtWithType(world, map, tileX, tileY, particles, playSound) !== null;
}

export function breakTilesInRadius(
  world: BreakableWorld,
  map: WorldMap,
  worldX: number,
  worldY: number,
  radius: number,
  particles: BreakableParticles,
  playSound?: BreakableSound,
): number {
  const cx = worldX + map.width / 2;
  const cy = worldY + map.height / 2;
  const r = radius + 0.5;

  const minTX = Math.max(0, Math.floor(cx - r));
  const maxTX = Math.min(map.width - 1, Math.floor(cx + r));
  const minTY = Math.max(0, Math.floor(cy - r));
  const maxTY = Math.min(map.height - 1, Math.floor(cy + r));

  const rSq = radius * radius;
  let count = 0;
  let brokeTallGrass = false;
  let brokeGeneric = false;

  for (let ty = minTY; ty <= maxTY; ty++) {
    for (let tx = minTX; tx <= maxTX; tx++) {
      const dx = (tx + 0.5) - cx;
      const dy = (ty + 0.5) - cy;
      if (dx * dx + dy * dy > rSq) continue;
      const brokenType = breakTileAtWithType(world, map, tx, ty, particles);
      if (!brokenType) continue;
      count++;
      if (brokenType === 'tall_grass') brokeTallGrass = true;
      else brokeGeneric = true;
    }
  }

  if (brokeTallGrass) playBreakableSound(playSound, 'tall_grass');
  if (brokeGeneric) playBreakableSound(playSound, 'barrel');

  return count;
}
