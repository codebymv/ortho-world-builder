/**
 * UNIQUE bird's-eye overworld — NOT the real region maps. Painted with real tile
 * types at the same fidelity as the minimap. Best-effort match to each region's
 * actual internal geography, simplified for a high-level "I was here, now I'm
 * there" read.
 *
 * Tile-type conventions for the overworld canvas:
 *   'water'     → ocean/sea (rendered dark navy in OverworldMap)
 *   'waterfall' → inland rivers, lakes, canals (rendered bright river-blue)
 *   All other types use the shared minimap palette as-is.
 */
export const OVERWORLD_W = 180;
export const OVERWORLD_H = 222;

export interface OverworldBand {
  id: string;
  yStart: number;
  yEnd: number;
}

export interface OverworldRegionAnchor {
  id: string;
  x: number;
  y: number;
}

export interface OverworldScene {
  width: number;
  height: number;
  tiles: string[][];
  bands: OverworldBand[];
  anchors: OverworldRegionAnchor[];
}

const BANDS: OverworldBand[] = [
  { id: 'greenleaf', yStart: 0, yEnd: 62 },
  { id: 'whispering_woods', yStart: 63, yEnd: 142 },
  { id: 'guilrhym', yStart: 143, yEnd: OVERWORLD_H - 1 },
];

const ANCHORS: OverworldRegionAnchor[] = [
  { id: 'greenleaf', x: 100, y: 26 },
  { id: 'whispering_woods', x: 90, y: 96 },
  { id: 'guilrhym', x: 100, y: 174 },
];

function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

let _sceneCache: OverworldScene | null = null;
let _waterDistCache: number[][] | null = null;

export function getOverworldScene(): OverworldScene {
  if (_sceneCache) return _sceneCache;

  const W = OVERWORLD_W;
  const H = OVERWORLD_H;
  const rng = mulberry32(0xf00d42);
  const t: string[][] = Array.from({ length: H }, () => Array.from({ length: W }, () => 'water'));

  const get = (x: number, y: number) => t[y]?.[x];
  const set = (x: number, y: number, type: string) => {
    if (x >= 0 && y >= 0 && x < W && y < H) t[y][x] = type;
  };
  const isOcean = (x: number, y: number) => (t[y]?.[x] ?? 'water') === 'water';
  const isLand = (x: number, y: number) => !isOcean(x, y);
  const pick = <T,>(arr: T[]): T => arr[Math.floor(rng() * arr.length)];

  // fillRect — unconditional (used for the base landmass and water features only).
  const fillRect = (x0: number, y0: number, x1: number, y1: number, type: string) => {
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) set(x, y, type);
  };
  // fillLand — only writes to tiles already on land so features never bleed into ocean.
  const fillLand = (x0: number, y0: number, x1: number, y1: number, type: string) => {
    for (let y = y0; y <= y1; y++)
      for (let x = x0; x <= x1; x++)
        if (isLand(x, y)) set(x, y, type);
  };
  // fillLandOrganic — fills an elliptical/rounded area with jittered edges so it looks organic and natural.
  const fillLandOrganic = (x0: number, y0: number, x1: number, y1: number, type: string) => {
    const cx = (x0 + x1) / 2;
    const cy = (y0 + y1) / 2;
    const rx = Math.max(1, (x1 - x0) / 2);
    const ry = Math.max(1, (y1 - y0) / 2);
    for (let y = y0; y <= y1; y++) {
      for (let x = x0; x <= x1; x++) {
        if (isLand(x, y)) {
          const dx = (x - cx) / rx;
          const dy = (y - cy) / ry;
          const distSq = dx * dx + dy * dy;
          const noise = (rng() - 0.5) * 0.35;
          if (distSq + noise < 1.0) {
            set(x, y, type);
          }
        }
      }
    }
  };
  const scatterOn = (x0: number, y0: number, x1: number, y1: number, type: string, d: number) => {
    for (let y = y0; y <= y1; y++)
      for (let x = x0; x <= x1; x++)
        if (isLand(x, y) && rng() < d) set(x, y, type);
  };
  // stamp — only writes to land so structures can't poke into the ocean.
  const stamp = (cx: number, cy: number, w: number, h: number, body: string, top?: string) => {
    for (let dy = 0; dy < h; dy++)
      for (let dx = 0; dx < w; dx++)
        if (isLand(cx + dx, cy + dy)) set(cx + dx, cy + dy, top && dy === 0 ? top : body);
  };
  const road = (pts: Array<{ x: number; y: number }>, hw = 1, fill = 'dirt') => {
    for (let i = 0; i < pts.length - 1; i++) {
      const a = pts[i]; const b = pts[i + 1];
      const steps = Math.max(Math.abs(b.x - a.x), Math.abs(b.y - a.y), 1);
      for (let s = 0; s <= steps; s++) {
        const u = s / steps;
        const x = Math.round(a.x + (b.x - a.x) * u);
        const y = Math.round(a.y + (b.y - a.y) * u);
        for (let dy = -hw; dy <= hw; dy++)
          for (let dx = -hw; dx <= hw; dx++)
            if (isLand(x + dx, y + dy)) set(x + dx, y + dy, fill);
      }
    }
  };
  const riverLine = (pts: Array<{ x: number; y: number }>, thick = 2) => {
    for (let i = 0; i < pts.length - 1; i++) {
      const a = pts[i]; const b = pts[i + 1];
      const steps = Math.max(Math.abs(b.x - a.x), Math.abs(b.y - a.y), 1);
      for (let s = 0; s <= steps; s++) {
        const u = s / steps;
        const x = Math.round(a.x + (b.x - a.x) * u);
        const y = Math.round(a.y + (b.y - a.y) * u);
        for (let d = 0; d < thick; d++) set(x, y + d, 'waterfall');
      }
    }
  };

  // ── Organic landmass. Each region has a distinct silhouette. ──────────────
  // Greenleaf: compact rolling farmland, wider in the middle.
  // Whispering Woods: wide and irregular, bulging west and east (big 300² map).
  // Guilrhym: similar width, dramatic east lava coast narrows the south.
  const landCx = (y: number) =>
    90 + Math.round(8 * Math.sin(y / 32)) + Math.round(3 * Math.sin(y / 9));
  const landHw = (y: number) => {
    const base = y < 63 ? 56 : y < 143 ? 72 : 66;
    let hw = base +
      Math.round(10 * Math.sin(y / 22)) +
      Math.round(4 * Math.cos(y / 8)) +
      Math.round(3 * Math.sin(y / 41));

    // Taper at the top (y < 25)
    if (y < 25) {
      const pct = (y - 3) / 22;
      hw = Math.round(hw * Math.sin((pct * Math.PI) / 2));
    }
    // Taper at the bottom (y > H - 16)
    if (y > H - 16) {
      const pct = (H - 3 - y) / 13;
      hw = Math.round(hw * Math.sin((pct * Math.PI) / 2));
    }
    return Math.max(0, hw);
  };
  for (let y = 3; y < H - 3; y++) {
    const cx = landCx(y); const hw = landHw(y);
    for (let x = cx - hw; x <= cx + hw; x++)
      if (x >= 2 && x < W - 2) set(x, y, 'grass');
  }

  // Sandy beaches — scan every land tile adjacent to ocean rather than using the
  // math formula (which drifts after bays/peninsulas are punched out).
  const applyBeaches = () => {
    for (let y = 1; y < H - 1; y++) {
      for (let x = 1; x < W - 1; x++) {
        if (!isLand(x, y)) continue;
        const v = t[y][x];
        // Only grass-family tiles convert to sand; don't overwrite features.
        if (v !== 'grass' && v !== 'tall_grass' && v !== 'dark_grass') continue;
        const touchesOcean =
          isOcean(x - 1, y) || isOcean(x + 1, y) ||
          isOcean(x, y - 1) || isOcean(x, y + 1);
        if (touchesOcean) { set(x, y, 'sand'); continue; }
        // Second pixel — softer probability inland of the first sand row.
        const touchesSand =
          t[y][x - 1] === 'sand' || t[y][x + 1] === 'sand' ||
          t[y - 1]?.[x] === 'sand' || t[y + 1]?.[x] === 'sand';
        if (touchesSand && rng() < 0.55) set(x, y, 'sand');
      }
    }
  };
  applyBeaches();

  // Add a few coastal bays / peninsulas for organic silhouette.
  // Bay on west (Greenleaf mid).
  for (let y = 20; y < 36; y++) {
    const depth = Math.round(5 * Math.sin(((y - 20) / 16) * Math.PI));
    for (let x = landCx(y) - landHw(y) - 1; x <= landCx(y) - landHw(y) + depth; x++)
      if (get(x, y) === 'grass') set(x, y, 'water');
  }
  // Peninsula on east (mid-woods).
  for (let y = 88; y < 108; y++) {
    const ext = Math.round(5 * Math.sin(((y - 88) / 20) * Math.PI));
    const cx = landCx(y); const hw = landHw(y);
    for (let x = cx + hw - ext; x <= cx + hw + ext; x++)
      if (x < W - 2 && x >= 0) { if (get(x, y) === 'water') set(x, y, 'grass'); }
  }

  // ==========================================================================
  // GREENLEAF VILLAGE (y 4–60)  —  compact town, north = top
  // ==========================================================================
  scatterOn(0, 5, W - 1, 60, 'tall_grass', 0.16);
  scatterOn(0, 5, W - 1, 60, 'dark_grass', 0.08);
  scatterOn(0, 5, W - 1, 60, 'flower', 0.024);

  // Waterfall + stream feeding the lake (village waterfall, north).
  fillRect(92, 4, 96, 8, 'waterfall');
  riverLine([{ x: 93, y: 8 }, { x: 92, y: 14 }, { x: 88, y: 18 }], 1);

  // Cemetery — north-west, small iron-fenced dirt block with tombstones.
  fillLandOrganic(30, 8, 50, 20, 'dirt');
  scatterOn(30, 8, 50, 20, 'tombstone', 0.36);
  for (let x = 30; x <= 50; x++) if (isLand(x, 8)) set(x, 8, 'iron_fence');

  // Church — west, stone clearing with a garden.
  fillLandOrganic(52, 16, 64, 26, 'dirt');
  stamp(54, 18, 6, 6, 'house_thatch', 'roof_tile');
  set(56, 25, 'statue');
  set(62, 23, 'garden');

  // Residential west — organic cluster of houses + gardens.
  const homes = ['house', 'cottage_house', 'house_green', 'house_thatch'];
  const housePos = [
    [24, 24], [36, 22], [26, 34], [40, 32], [24, 42], [38, 42],
  ];
  for (const [hx, hy] of housePos) {
    fillLand(hx - 1, hy - 1, hx + 5, hy + 4, 'grass');
    stamp(hx, hy, 4, 3, pick(homes), 'roof_tile');
    if (rng() < 0.55) { if (isLand(hx + 5, hy + 1)) set(hx + 5, hy + 1, 'garden'); }
    if (rng() < 0.4) { if (isLand(hx - 1, hy + 2)) set(hx - 1, hy + 2, 'hedge'); }
  }
  fillLandOrganic(22, 20, 60, 50, 'grass');
  scatterOn(22, 20, 60, 50, 'hedge', 0.04);

  // Central village square — cobblestone plaza, town hall, well, fountain.
  fillLandOrganic(72, 20, 106, 40, 'dirt');
  scatterOn(72, 20, 106, 40, 'cobblestone', 0.55);
  stamp(80, 24, 6, 4, 'house', 'roof_tile');   // town hall
  stamp(92, 28, 4, 3, 'building', 'roof_tile');
  set(78, 32, 'well');
  set(96, 34, 'fountain');
  set(88, 22, 'market_stall');
  set(100, 26, 'market_stall');

  // Market / shops — east, with inn/blacksmith landmarks.
  fillLandOrganic(112, 18, 148, 40, 'dirt');
  scatterOn(112, 18, 148, 40, 'cobblestone', 0.4);
  stamp(116, 20, 4, 3, 'house', 'roof_tile');
  stamp(124, 19, 5, 4, 'house_thatch', 'house_thatch_entry');
  stamp(134, 22, 4, 3, 'house_green', 'house_green_entry');
  set(128, 30, 'market_stall');
  set(142, 26, 'market_stall');
  set(118, 34, 'bonfire');

  // Forts — NE corner; west fort — west edge.
  stamp(136, 8, 7, 5, 'ruined_fort_wall', 'stone');
  fillLandOrganic(122, 8, 134, 16, 'dirt');
  scatterOn(122, 8, 134, 16, 'cobblestone', 0.3);
  stamp(24, 44, 5, 4, 'ruined_fort_wall', 'stone');

  // Hedge maze — east border (map x200+).
  fillLandOrganic(152, 20, 164, 36, 'hedge');
  scatterOn(152, 20, 164, 36, 'grass', 0.28);

  // Village lake + dock — south-east.
  fillRect(118, 44, 146, 56, 'waterfall');
  scatterOn(118, 44, 146, 56, 'waterfall', 0.12);
  set(116, 48, 'dock');
  set(117, 49, 'dock');
  set(136, 43, 'boat_wreck');
  // Wooden boardwalk.
  for (let x = 110; x < 118; x++) set(x, 48, 'wooden_path');

  // Farm fields — south, giving way to treeline.
  for (let i = 0; i < 5; i++) {
    const fy = 44 + i * 2;
    fillLand(40, fy, 92, fy + 1, i % 2 ? 'wheat' : 'farmland');
  }
  set(48, 44, 'windmill');
  scatterOn(40, 44, 92, 58, 'hay_bale', 0.05);

  // Forest fringe — transition from farms to the woods.
  scatterOn(18, 48, W - 14, 62, 'tree', 0.22);
  scatterOn(18, 52, 36, 62, 'tree', 0.34);
  scatterOn(148, 50, W - 14, 62, 'tree', 0.32);
  scatterOn(0, 48, 18, 62, 'tree', 0.1);

  // North road: plaza → south → into the woods.
  road([{ x: 90, y: 40 }, { x: 88, y: 52 }, { x: 87, y: 63 }]);

  // ==========================================================================
  // WHISPERING WOODS (y 63–142)  —  flipped: Hollow at bottom = toward city
  // ==========================================================================
  scatterOn(0, 63, W - 1, 142, 'dark_grass', 0.2);
  scatterOn(0, 63, W - 1, 142, 'tree', 0.38);

  // Forest entrance clearings — where the farm road meets the canopy.
  fillLandOrganic(72, 63, 104, 76, 'grass');
  scatterOn(72, 63, 104, 76, 'tall_grass', 0.32);

  // Spider nest — upper-west (region SW; off the route).
  fillLandOrganic(18, 66, 46, 86, 'dirt');
  scatterOn(18, 66, 46, 86, 'dead_tree', 0.18);
  scatterOn(20, 68, 44, 84, 'bones', 0.06);
  scatterOn(18, 66, 46, 86, 'dark_grass', 0.2);

  // Consumed camp — upper-east (region NE; ruined huts, off route).
  fillLandOrganic(118, 66, 138, 82, 'dirt');
  scatterOn(118, 66, 138, 82, 'tree', 0.12);
  stamp(122, 68, 4, 3, 'destroyed_house', 'roof_tile');
  stamp(128, 72, 3, 3, 'destroyed_house', 'roof_tile');
  set(120, 76, 'campfire');
  set(132, 78, 'bones');

  // Hidden grove — west mid (secluded, off the main road).
  fillLandOrganic(14, 94, 44, 116, 'grass');
  scatterOn(14, 94, 44, 116, 'tall_grass', 0.36);
  scatterOn(14, 94, 44, 116, 'flower', 0.07);
  set(28, 104, 'garden');
  set(22, 108, 'statue');

  // Western forest — dense canopy between spider nest and grove.
  scatterOn(14, 86, 50, 94, 'tree', 0.55);

  // Eastern stone ridge & cliffs (region has cliff terrain on east flank).
  fillLandOrganic(144, 70, 164, 105, 'stone');
  scatterOn(144, 70, 164, 105, 'cliff', 0.18);
  scatterOn(144, 70, 164, 105, 'rock', 0.12);
  scatterOn(144, 70, 164, 95, 'snow', 0.07);

  // Eastern caldera lip — volcanic east flank below the dividing river, near the Hollow.
  // Mostly stone/red rock; only a thin lava cap at the top of the lip.
  const calderaYStart = 125;
  const calderaYEnd = 142;
  const calderaCenterY = (calderaYStart + calderaYEnd) / 2;
  for (let y = calderaYStart; y <= calderaYEnd; y++) {
    const cx = landCx(y);
    const hw = landHw(y);
    const distFromCenter = Math.abs(y - calderaCenterY);
    const maxDist = (calderaYEnd - calderaYStart) / 2;
    const width = distFromCenter > maxDist ? 0 : Math.round(22 * Math.cos((distFromCenter / maxDist) * Math.PI / 2));
    if (width <= 0) continue;

    const startX = cx + hw - width;
    const endX = cx + hw;
    const rowsFromTop = y - calderaYStart;
    for (let x = startX; x <= endX; x++) {
      if (!isLand(x, y)) continue;
      const r = rng();
      const inLavaCapZone = rowsFromTop <= 3 && x >= startX + 7 && x <= endX - 3;
      if (inLavaCapZone && r < 0.22) {
        set(x, y, 'lava');
      } else if (r < 0.42) {
        set(x, y, 'volcanic_rock');
      } else if (r < 0.68) {
        set(x, y, 'rock');
      } else if (r < 0.86) {
        set(x, y, 'stone');
      } else {
        set(x, y, 'ash');
      }
    }
    scatterOn(startX - 3, y, startX + 4, y, 'volcanic_rock', 0.3);
    scatterOn(startX - 4, y, startX + 2, y, 'ash', 0.15);
  }

  // Ranger cabin at the base of the ridge.
  stamp(148, 80, 4, 3, 'cottage_house_ranger', 'cottage_shed');
  set(152, 86, 'bonfire_unlit');

  // Ranger camp — center (main route passes through).
  fillLandOrganic(80, 96, 108, 114, 'dirt');
  scatterOn(80, 96, 108, 114, 'grass', 0.22);
  stamp(88, 100, 4, 3, 'cottage_house_forest', 'cottage_shed');
  set(96, 108, 'bonfire');
  set(84, 110, 'cart');

  // A second small clearing mid-east (map has clearings at various coords).
  fillLandOrganic(116, 96, 138, 112, 'grass');
  scatterOn(116, 96, 138, 112, 'tall_grass', 0.3);

  // The dividing river — wide meander across the full woods width.
  riverLine([
    { x: 12, y: 120 },
    { x: 40, y: 118 },
    { x: 72, y: 122 },
    { x: 100, y: 119 },
    { x: 130, y: 121 },
    { x: 152, y: 118 },
  ], 3);
  // Bridge crossing on the central road.
  for (let y = 119; y <= 122; y++) { set(86, y, 'bridge'); set(87, y, 'bridge'); }

  // The Hollow — corrupted swamp scar at the bottom (region north = toward city).
  fillLand(54, 126, 118, 142, 'swamp');
  scatterOn(54, 126, 118, 142, 'water_corrupted', 0.22);
  scatterOn(54, 126, 118, 142, 'dead_tree', 0.24);
  scatterOn(54, 126, 118, 142, 'bones', 0.05);
  scatterOn(62, 128, 108, 140, 'heresy_altar_cracked', 0.015);
  // Small corrupted lake in the hollow.
  fillLand(72, 130, 90, 138, 'waterfall');
  scatterOn(72, 130, 90, 138, 'water_corrupted', 0.4);
  // Ceremonial apron + fog gate.
  fillLand(82, 136, 96, 142, 'dirt');
  set(88, 140, 'fog_gate');
  set(89, 140, 'fog_gate');

  // Main road: entrance → ranger → bridge → hollow → fog gate.
  road([
    { x: 87, y: 63 },
    { x: 90, y: 80 },
    { x: 92, y: 96 },
    { x: 88, y: 110 },
    { x: 87, y: 119 },
    { x: 87, y: 132 },
    { x: 88, y: 142 },
  ]);
  // Off-path woodcutter spur (west).
  road([{ x: 72, y: 68 }, { x: 54, y: 80 }, { x: 38, y: 96 }], 0);

  // ==========================================================================
  // GUILRHYM (y 143–218)  — gate plaza at top, canal mid, cathedral at bottom
  // ==========================================================================
  // Fill the city ground with dark cobblestone, leaving a natural green/beach buffer on the left and right sides.
  for (let y = 143; y < H - 4; y++) {
    const cx = landCx(y);
    const hw = landHw(y);
    const bufferLeft = 16;
    const bufferRight = 16;
    for (let x = cx - hw + bufferLeft; x <= cx + hw - bufferRight; x++) {
      if (isLand(x, y)) {
        set(x, y, 'cobblestone_dark');
        if (rng() < 0.24) set(x, y, 'ashen_cobble');
        else if (rng() < 0.12) set(x, y, 'road_setts');
      }
    }
  }

  // Scatter trees and grass on the city's green buffers (left and right sides of the cobblestone area)
  for (let y = 143; y < H - 4; y++) {
    const cx = landCx(y);
    const hw = landHw(y);
    const bufferLeft = 16;
    const bufferRight = 16;
    
    // Left buffer (grass area)
    for (let x = cx - hw; x < cx - hw + bufferLeft; x++) {
      if (isLand(x, y)) {
        const r = rng();
        if (r < 0.22) set(x, y, 'tree');
        else if (r < 0.35) set(x, y, 'dark_grass');
        else if (r < 0.45) set(x, y, 'tall_grass');
      }
    }
    
    // Right buffer (grass area)
    for (let x = cx + hw - bufferRight + 1; x <= cx + hw; x++) {
      if (isLand(x, y)) {
        const r = rng();
        if (r < 0.22) set(x, y, 'tree');
        else if (r < 0.35) set(x, y, 'dark_grass');
        else if (r < 0.45) set(x, y, 'tall_grass');
      }
    }
  }

  // Gate plaza — top (entry from Hollow).
  fillLandOrganic(38, 144, 148, 152, 'cobblestone');
  scatterOn(38, 144, 148, 152, 'road_setts', 0.32);
  stamp(84, 144, 7, 5, 'ruined_fort_wall', 'stone'); // gatehouse
  set(78, 150, 'stagecoach');
  // Western outskirts — crumbled.
  fillLandOrganic(22, 152, 56, 170, 'ruins_floor');
  scatterOn(22, 152, 56, 170, 'rubble', 0.1);
  scatterOn(22, 152, 56, 170, 'destroyed_house', 0.04);
  stamp(28, 158, 4, 3, 'destroyed_house_overgrown', 'roof_tile');

  // Market / artisan quarter — east (forced dogleg).
  const facades = ['tenement_facade', 'townhouse_facade', 'warehouse_facade'];
  for (let by = 152; by < 178; by += 7) {
    for (let bx = 110; bx < 158; bx += 10) {
      if (rng() < 0.84) stamp(bx, by, 5, 4, pick(facades), 'roof_tile');
    }
  }
  set(118, 160, 'market_stall');
  set(134, 168, 'market_stall');
  set(128, 174, 'street_lamp');

  // Estates / undercroft — west.
  for (let by = 156; by < 196; by += 9) {
    for (let bx = 26; bx < 72; bx += 11) {
      if (rng() < 0.72) stamp(bx, by, 5, 5, pick(['townhouse_facade', 'tenement_facade']), 'roof_tile');
    }
  }
  stamp(38, 186, 6, 5, 'destroyed_house_overgrown', 'roof_tile');
  scatterOn(24, 178, 74, 200, 'rubble', 0.04);

  // THE CANAL — hard horizontal divide (only the toll bridge crosses).
  // Use fillLand so the canal doesn't extend into the ocean on narrow rows.
  fillLand(18, 180, 158, 186, 'waterlogged_cobble');
  riverLine([{ x: 18, y: 181 }, { x: 88, y: 183 }, { x: 158, y: 181 }], 4);
  // Canal banks — wet stone.
  for (let x = 18; x <= 158; x++) {
    if (isLand(x, 180)) set(x, 180, 'waterlogged_cobble');
    if (isLand(x, 186)) set(x, 186, 'waterlogged_cobble');
  }
  // Toll bridge (central road crosses here).
  for (let y = 180; y <= 186; y++) { set(90, y, 'bridge'); set(91, y, 'bridge'); }

  // Cemetery rise — east, south of canal.
  fillLandOrganic(126, 190, 154, 208, 'dirt');
  scatterOn(126, 190, 154, 208, 'tombstone', 0.3);
  scatterOn(126, 190, 154, 208, 'dead_tree', 0.06);

  // The Heights / Reliquary cloister — pale civic stone toward the cathedral.
  fillLandOrganic(66, 194, 122, 216, 'cobble_grand');
  scatterOn(66, 194, 122, 216, 'ashen_cobble', 0.16);
  // Off-center cathedral — landmark at the far end.
  stamp(96, 200, 11, 14, 'cathedral_facade', 'clocktower');
  set(101, 198, 'statue');
  scatterOn(90, 196, 112, 216, 'wall_torch', 0.04);
  // Second clocktower mass east of cathedral for city silhouette.
  stamp(112, 158, 5, 7, 'clocktower', 'stone');

  // Central gate boulevard (visual spine from plaza through canal to cathedral).
  fillLand(90, 152, 93, 180, 'cobble_grand');
  fillLand(90, 187, 93, 200, 'cobble_grand');

  // South harbor.
  fillLandOrganic(36, H - 12, 106, H - 5, 'waterlogged_cobble');
  riverLine([{ x: 42, y: H - 9 }, { x: 100, y: H - 9 }], 3);
  set(50, H - 10, 'dock');
  set(96, H - 10, 'dock');

  applyBeaches();

  _sceneCache = { width: W, height: H, tiles: t, bands: BANDS, anchors: ANCHORS };
  return _sceneCache;
}

export function getOverworldBandAtRow(y: number): OverworldBand {
  const scene = getOverworldScene();
  return (
    scene.bands.find(b => y >= b.yStart && y <= b.yEnd) ??
    scene.bands[scene.bands.length - 1]
  );
}

/** 0 = clear, 1 = fully fogged. Soft fade at band edges. */
export function getOverworldFogStrength(
  y: number,
  bandId: string,
  discovered: boolean,
): number {
  if (discovered) return 0;
  const band = getOverworldScene().bands.find(b => b.id === bandId);
  if (!band || y < band.yStart || y > band.yEnd) return 0;
  const fade = 12;
  const dTop = y - band.yStart;
  const dBot = band.yEnd - y;
  let s = 0.93;
  if (dTop < fade) s *= 0.3 + (dTop / fade) * 0.7;
  if (dBot < fade) s *= 0.3 + (dBot / fade) * 0.7;
  return Math.min(1, Math.max(0, s));
}

export function getOverworldAnchor(regionId: string): OverworldRegionAnchor | undefined {
  return getOverworldScene().anchors.find(a => a.id === regionId);
}

/** Chebyshev-ish distance from each tile to the nearest land tile (BFS). Cached once. */
export function getOverworldWaterDistanceField(): number[][] {
  if (_waterDistCache) return _waterDistCache;

  const scene = getOverworldScene();
  const { width: W, height: H, tiles } = scene;
  const dist: number[][] = Array.from({ length: H }, () => new Array<number>(W).fill(Infinity));
  const queue: [number, number][] = [];

  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      if (tiles[y][x] !== 'water') {
        dist[y][x] = 0;
        queue.push([x, y]);
      }
    }
  }

  let qHead = 0;
  while (qHead < queue.length) {
    const [cx, cy] = queue[qHead++];
    const d = dist[cy][cx];
    if (cx > 0 && dist[cy][cx - 1] === Infinity) {
      dist[cy][cx - 1] = d + 1;
      queue.push([cx - 1, cy]);
    }
    if (cx + 1 < W && dist[cy][cx + 1] === Infinity) {
      dist[cy][cx + 1] = d + 1;
      queue.push([cx + 1, cy]);
    }
    if (cy > 0 && dist[cy - 1][cx] === Infinity) {
      dist[cy - 1][cx] = d + 1;
      queue.push([cx, cy - 1]);
    }
    if (cy + 1 < H && dist[cy + 1][cx] === Infinity) {
      dist[cy + 1][cx] = d + 1;
      queue.push([cx, cy + 1]);
    }
  }

  _waterDistCache = dist;
  return dist;
}
