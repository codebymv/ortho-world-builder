import type { TileType } from '@/lib/game/World';

export interface CityBlockProp {
  x: number;
  y: number;
  type: TileType;
  walkable: boolean;
}

interface Rect { x0: number; y0: number; x1: number; y1: number }

export interface CityBlockOpts {
  /** Region to fill (tile coords, inclusive). */
  x0: number; y0: number; x1: number; y1: number;
  /** Nominal block width (a continuous terrace run); jittered per block. */
  blockW?: number;
  /** Nominal block depth (stacked terrace rows so it reads solid); jittered per row. */
  blockH?: number;
  /** Nominal E-W street width between block rows; jittered. */
  streetW?: number;
  /** Nominal N-S alley/wynd width between blocks; jittered. */
  alleyW?: number;
  /** Vertical step between terrace rows inside a block (≈ footprint height). */
  rowStep?: number;
  /** Horizontal step between bays inside a terrace (≈ building width → seamless). */
  baySpacing?: number;
  /** Extra straight thoroughfares (E-W centre-lines kept clear of buildings). */
  streetRows?: number[];
  streetHalfWidth?: number;
  /** Building kit to stamp (single type). */
  type?: TileType;
  /** Weighted mix of kits - repeat an entry to make it more frequent. A district is
   *  defined by this FREQUENCY of forms, not a uniform colour (colours mix per-building). */
  types?: TileType[];
  /** Rectangles left open (bonfires, POIs, the critical path, plazas, the canal). */
  keepClear?: Rect[];
  /** Per-district seed so each district's irregularity differs. */
  seed?: number;
  /** 0..1 chance a block is dropped → a small court/yard/plaza breaking the fabric. */
  courtChance?: number;
}

/**
 * Dense Victorian fill that reads as an ORGANIC, grown city - not a stiff grid.
 * Thinks in BLOCKS (solid continuous terraces) separated by narrow streets/alleys, but
 * every block's WIDTH, DEPTH, the alley/street widths, the row start offset, and the bay
 * phase are jittered from a per-district seed, rows are staggered, and a few blocks are
 * dropped as courts. So block edges don't line up column-to-column and streets wander -
 * the Booth-map grain. Run a walkability BFS after; keepClear protects the dogleg + POIs.
 */
export function cityBlocks(o: CityBlockOpts): CityBlockProp[] {
  const baseW = o.blockW ?? 28;
  const baseH = o.blockH ?? 16;
  const baseStreet = o.streetW ?? 3;
  const baseAlley = o.alleyW ?? 2;
  const rowStep = o.rowStep ?? 7;
  const bay = o.baySpacing ?? 6;
  const type = o.type ?? 'tenement_facade';
  const streetHalf = o.streetHalfWidth ?? 2;
  const seed = o.seed ?? 1337;
  const courtChance = o.courtChance ?? 0.1;
  const out: CityBlockProp[] = [];

  // Deterministic per-cell hash → 0..1.
  const rnd = (a: number, b: number) => {
    let h = (Math.imul(a | 0, 73856093) ^ Math.imul(b | 0, 19349663) ^ Math.imul(seed, 83492791)) >>> 0;
    h = Math.imul(h ^ (h >>> 13), 1274126177);
    return ((h ^ (h >>> 16)) >>> 0) / 0xffffffff;
  };
  const blocked = (xi: number, yi: number) =>
    o.keepClear?.some(r => xi >= r.x0 - 3 && xi <= r.x1 + 3 && yi >= r.y0 - 3 && yi <= r.y1 + 3) ?? false;

  let by = o.y0;
  let gy = 0;
  while (by <= o.y1) {
    const rowStreet = baseStreet + Math.floor(rnd(7, gy) * 2);              // 3..4
    const rowH = Math.max(8, baseH + Math.floor((rnd(3, gy) - 0.5) * 10));  // ±5
    let bx = o.x0 + Math.floor(rnd(11, gy) * (baseAlley + 4));              // stagger each row's start
    let gx = 0;
    while (bx <= o.x1) {
      const blockW = Math.max(12, baseW + Math.floor((rnd(gx, gy) - 0.5) * 18)); // ±9
      const alley = baseAlley + Math.floor(rnd(gx + 5, gy) * 3);                 // 2..4
      const isCourt = rnd(gx + 23, gy) < courtChance;
      if (!isCourt) {
        for (let ry = by; ry < by + rowH && ry <= o.y1; ry += rowStep) {
          if (o.streetRows?.some(sy => Math.abs(sy - ry) <= streetHalf)) continue;
          const bayOff = Math.floor(rnd(gx + ry, gy) * bay); // terraces don't phase-align across blocks
          for (let rx = bx + bayOff; rx < bx + blockW && rx <= o.x1; rx += bay) {
            const xi = Math.round(rx);
            const yi = Math.round(ry);
            if (blocked(xi, yi)) continue;
            const mix = o.types;
            const bType = mix && mix.length > 0 ? mix[Math.floor(rnd(xi + 31, yi + 17) * mix.length)] : type;
            out.push({ x: xi, y: yi, type: bType, walkable: false });
          }
        }
      }
      bx += blockW + alley;
      gx++;
    }
    by += rowH + rowStreet;
    gy++;
  }
  return out;
}

export interface CityFenceOpts {
  /** Compound rectangle to fence (tile coords, inclusive). */
  x0: number; y0: number; x1: number; y1: number;
  /** Which edges to fence. Default all four. */
  sides?: Array<'n' | 's' | 'e' | 'w'>;
  /** Cadence of gate openings along an edge (a gate roughly every N tiles). */
  gateEvery?: number;
  /** Width of each gate opening, in tiles. */
  gateWidth?: number;
  /** Fence / gate kits. */
  fenceType?: TileType;
  gateType?: TileType;
  /** Per-compound seed so gate phases differ between districts. */
  seed?: number;
  /** Tiles left open (the dogleg path, POIs, chests) - fence skips these, leaving a natural opening. */
  keepClear?: Rect[];
}

/**
 * Iron-fence PERIMETER around a housing compound, with periodic gate openings and any
 * keepClear tiles left open. Combined with cityBlocks this turns each district into a
 * walled compound whose only ways in are gates on the roads - the structurality needed to
 * gate routes off. Fences are unwalkable; gate tiles are walkable. The dogleg/POIs (passed
 * via keepClear) punch natural openings so the critical path is never sealed.
 */
export function cityFences(o: CityFenceOpts): CityBlockProp[] {
  const sides = o.sides ?? ['n', 's', 'e', 'w'];
  // "gate" cadence now defines plain GAPS in the fence (bare walkable ground), not gate sprites.
  const gateEvery = Math.max(4, o.gateEvery ?? 11);
  const gateWidth = Math.max(1, o.gateWidth ?? 2);
  const fenceType = o.fenceType ?? 'iron_fence';
  const seed = o.seed ?? 991;
  const out: CityBlockProp[] = [];

  const rnd = (a: number, b: number) => {
    let h = (Math.imul(a | 0, 73856093) ^ Math.imul(b | 0, 19349663) ^ Math.imul(seed, 83492791)) >>> 0;
    h = Math.imul(h ^ (h >>> 13), 1274126177);
    return ((h ^ (h >>> 16)) >>> 0) / 0xffffffff;
  };
  // pad 2 so a fence never butts hard against a protected path/POI tile
  const blocked = (xi: number, yi: number) =>
    o.keepClear?.some(r => xi >= r.x0 - 2 && xi <= r.x1 + 2 && yi >= r.y0 - 2 && yi <= r.y1 + 2) ?? false;

  const run = (pts: Array<{ x: number; y: number }>, edgeKey: number) => {
    const phase = Math.floor(rnd(edgeKey, 7) * gateEvery);
    for (let i = 0; i < pts.length; i++) {
      const { x, y } = pts[i];
      if (blocked(x, y)) continue; // path/POI crossing → natural opening
      const inGap = ((i + phase) % gateEvery) < gateWidth;
      if (inGap) continue; // leave a plain GAP in the fence (bare ground), not a gate sprite
      out.push({ x, y, type: fenceType, walkable: false });
    }
  };

  if (sides.includes('n')) { const p = []; for (let x = o.x0; x <= o.x1; x++) p.push({ x, y: o.y0 }); run(p, o.y0 * 31 + 1); }
  if (sides.includes('s')) { const p = []; for (let x = o.x0; x <= o.x1; x++) p.push({ x, y: o.y1 }); run(p, o.y1 * 31 + 2); }
  if (sides.includes('w')) { const p = []; for (let y = o.y0; y <= o.y1; y++) p.push({ x: o.x0, y }); run(p, o.x0 * 17 + 3); }
  if (sides.includes('e')) { const p = []; for (let y = o.y0; y <= o.y1; y++) p.push({ x: o.x1, y }); run(p, o.x1 * 17 + 4); }
  return out;
}
