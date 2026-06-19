export type TileRect = readonly [x: number, y: number, width: number, height: number];

export const HOLLOW_CORRUPTED_WATER_RECTS: ReadonlyArray<TileRect> = [
  [116, 4, 54, 48],
  [28, 64, 64, 16],
  [4, 80, 104, 7],
  [104, 80, 12, 11],
  [110, 84, 14, 12],
  [116, 81, 18, 15],
  [130, 80, 10, 11],
  [134, 78, 56, 8],
  [190, 79, 50, 6],
  [250, 78, 50, 6],
];

// ---------------------------------------------------------------------------
// Corruption gradient (single source of truth).
//
// tileY = worldY + 150:
//   world y -52  -> tileY 98  (fade start: fully pristine)
//   world y -60  -> tileY 90  (soft-front inner edge — dissolve thins out north of here)
//   world y -95  -> tileY 55  (Deep Hollow: fully corrupted)
//
// The approach band uses a smooth Y ramp plus a short feather/dissolve zone so the
// leading edge reads intentional rather than a ruler-straight cutoff. Main band
// (ty <= 90) stays latitude-only; scatter applies only in the feather (90 < ty < 98).
// ---------------------------------------------------------------------------

const CORRUPT_FULL_TILEY = 55;        // world y -95
const CORRUPT_SOFT_FRONT_TILEY = 90;  // world y -60
const CORRUPT_FADE_START_TILEY = 98; // world y -52
const DISSOLVE_SEED = 7777;

function isInAnyHollowRect(tileX: number, tileY: number): boolean {
  for (const [x, y, width, height] of HOLLOW_CORRUPTED_WATER_RECTS) {
    if (tileX >= x && tileX < x + width && tileY >= y && tileY < y + height) return true;
  }
  return false;
}

function smoothstep01(t: number): number {
  const x = Math.max(0, Math.min(1, t));
  return x * x * (3 - 2 * x);
}

function dissolveNoise2D(x: number, y: number, seed: number): number {
  const n = Math.sin(x * 12.9898 + y * 78.233 + seed) * 43758.5453;
  return n - Math.floor(n);
}

/** Coherent noise for the feather dissolve only (not the main approach band). */
function dissolveSmoothNoise(x: number, y: number, scale = 7): number {
  const sx = x / scale;
  const sy = y / scale;
  const x0 = Math.floor(sx);
  const y0 = Math.floor(sy);
  let fx = sx - x0;
  let fy = sy - y0;
  fx = fx * fx * (3 - 2 * fx);
  fy = fy * fy * (3 - 2 * fy);
  const v00 = dissolveNoise2D(x0, y0, DISSOLVE_SEED);
  const v10 = dissolveNoise2D(x0 + 1, y0, DISSOLVE_SEED);
  const v01 = dissolveNoise2D(x0, y0 + 1, DISSOLVE_SEED);
  const v11 = dissolveNoise2D(x0 + 1, y0 + 1, DISSOLVE_SEED);
  const top = v00 + (v10 - v00) * fx;
  const bot = v01 + (v11 - v01) * fx;
  return top + (bot - top) * fy;
}

/**
 * Smooth 0..1 corruption strength for hollow-approach water.
 * Feather zone (world -52..-60): dispersed leading edge. Main band: latitude-only ramp.
 */
export function getHollowWaterCorruptionIntensity(tileX: number, tileY: number): number {
  if (!isInAnyHollowRect(tileX, tileY)) return 0;
  if (tileY >= CORRUPT_FADE_START_TILEY) return 0;
  if (tileY <= CORRUPT_FULL_TILEY) return 1;

  const span = CORRUPT_FADE_START_TILEY - CORRUPT_FULL_TILEY;
  const linear = (CORRUPT_FADE_START_TILEY - tileY) / span;
  let intensity = Math.pow(smoothstep01(linear), 0.78);

  // Feather / dissolve: break up the -60 front into scattered inlets of clean water.
  if (tileY > CORRUPT_SOFT_FRONT_TILEY) {
    const featherSpan = CORRUPT_FADE_START_TILEY - CORRUPT_SOFT_FRONT_TILEY;
    const edgeDepth = (CORRUPT_FADE_START_TILEY - tileY) / featherSpan;
    const dissolve = dissolveSmoothNoise(tileX, tileY);
    const gate = smoothstep01(edgeDepth * 1.4);
    if (dissolve > gate) return 0;
    intensity *= smoothstep01(edgeDepth * 2.4);
  }

  return intensity;
}

/** 0..1 blend strength for rendering; eases in so the feather stays subtle. */
export function getHollowWaterVisualBlend(intensity: number): number {
  if (intensity <= 0) return 0;
  if (intensity >= 1) return 1;
  return 0.06 + Math.pow(intensity, 1.2) * 0.94;
}

/**
 * Whether the tile should use the `water_corrupted` type (Deep Hollow basin only).
 * Approach-band water stays `water`; visual darkening is handled at render time.
 */
export function isHollowWaterCorrupted(tileX: number, tileY: number): boolean {
  return getHollowWaterCorruptionIntensity(tileX, tileY) >= 1;
}

type HollowWaterTileType = 'water' | 'water_corrupted';

/** Target type for hollow-approach river tiles, or null if this tile is outside the system. */
export function getHollowApproachWaterTargetType(
  tileX: number,
  tileY: number,
  currentType: string,
): HollowWaterTileType | null {
  if (currentType !== 'water' && currentType !== 'water_corrupted') return null;
  if (!isInAnyHollowRect(tileX, tileY)) return null;
  return isHollowWaterCorrupted(tileX, tileY) ? 'water_corrupted' : 'water';
}

type MutableWaterTile = {
  type: string;
  walkable: boolean;
  [key: string]: unknown;
};

/**
 * Reconcile hollow-approach `water` / `water_corrupted` tiles inside the authored rects.
 * Returns true if any tile was changed. Shared by mapGenerator and runtime sync passes.
 */
export function reconcileHollowApproachWaterInRects<T extends MutableWaterTile>(
  tiles: T[][],
  rects: ReadonlyArray<TileRect> = HOLLOW_CORRUPTED_WATER_RECTS,
): boolean {
  const h = tiles.length;
  const w = tiles[0]?.length ?? 0;
  let changed = false;

  for (const [x, y, width, height] of rects) {
    for (let ty = y; ty < y + height && ty < h; ty++) {
      if (ty < 0) continue;
      const row = tiles[ty];
      if (!row) continue;
      for (let tx = x; tx < x + width && tx < w; tx++) {
        if (tx < 0) continue;
        const tile = row[tx];
        if (!tile) continue;
        const target = getHollowApproachWaterTargetType(tx, ty, tile.type);
        if (!target || tile.type === target) continue;
        row[tx] = { ...tile, type: target, walkable: false };
        changed = true;
      }
    }
  }

  return changed;
}
