import { describe, expect, it } from 'vitest';
import { generateMap } from '@/data/mapGenerator';
import { forestDef } from '@/content/regions/whispering_woods/map';
import { getBonfiresForMap } from '@/data/bonfires';
import { canCrossSpinePathElevation } from '@/lib/game/World';
import type { Tile } from '@/lib/game/World';

const WALKABLE_PATH_TYPES = new Set(['grass', 'dirt', 'sand']);

function isPathTile(t: Tile | undefined): t is Tile {
  return !!t && t.walkable && WALKABLE_PATH_TYPES.has(t.type) && !t.transition && !t.interactable;
}

function findBlockedElevationSeams(tiles: Tile[][]) {
  const horizontal: { tx: number; ty: number }[] = [];
  const vertical: { tx: number; ty: number }[] = [];

  for (let ty = 0; ty < tiles.length; ty++) {
    for (let tx = 0; tx < tiles[0].length; tx++) {
      const t = tiles[ty][tx];
      if (!isPathTile(t) || t.spinePath) continue;

      const west = tx > 0 ? tiles[ty][tx - 1] : undefined;
      const east = tx < tiles[0].length - 1 ? tiles[ty][tx + 1] : undefined;
      const north = ty > 0 ? tiles[ty - 1][tx] : undefined;
      const south = ty < tiles.length - 1 ? tiles[ty + 1][tx] : undefined;
      const el = t.elevation ?? 0;

      if (isPathTile(west) && isPathTile(east)) {
        const wEl = west.elevation ?? 0;
        const eEl = east.elevation ?? 0;
        if (Math.abs(wEl - eEl) === 1 && (el === wEl || el === eEl) && !west.spinePath && !east.spinePath) {
          if (!canCrossSpinePathElevation(west, east)) horizontal.push({ tx, ty });
        }
      }

      if (isPathTile(north) && isPathTile(south)) {
        const nEl = north.elevation ?? 0;
        const sEl = south.elevation ?? 0;
        if (Math.abs(nEl - sEl) === 1 && (el === nEl || el === sEl) && !north.spinePath && !south.spinePath) {
          if (!canCrossSpinePathElevation(north, south)) vertical.push({ tx, ty });
        }
      }
    }
  }

  return { horizontal, vertical };
}

function clusterSeams(seams: { tx: number; ty: number }[], axis: 'h' | 'v') {
  const key = (tx: number, ty: number) => `${tx},${ty}`;
  const set = new Set(seams.map(s => key(s.tx, s.ty)));
  const visited = new Set<string>();
  const clusters: { minX: number; maxX: number; minY: number; maxY: number; count: number }[] = [];

  for (const s of seams) {
    const k = key(s.tx, s.ty);
    if (visited.has(k)) continue;
    const queue = [s];
    visited.add(k);
    let minX = s.tx, maxX = s.tx, minY = s.ty, maxY = s.ty, count = 0;

    while (queue.length) {
      const cur = queue.pop()!;
      count++;
      minX = Math.min(minX, cur.tx);
      maxX = Math.max(maxX, cur.tx);
      minY = Math.min(minY, cur.ty);
      maxY = Math.max(maxY, cur.ty);
      const neighbors =
        axis === 'h'
          ? [{ tx: cur.tx, ty: cur.ty - 1 }, { tx: cur.tx, ty: cur.ty + 1 }]
          : [{ tx: cur.tx - 1, ty: cur.ty }, { tx: cur.tx + 1, ty: cur.ty }];
      for (const n of neighbors) {
        const nk = key(n.tx, n.ty);
        if (set.has(nk) && !visited.has(nk)) {
          visited.add(nk);
          queue.push(n);
        }
      }
    }
    clusters.push({ minX, maxX, minY, maxY, count });
  }
  return clusters;
}

/** Mirrors syncGroveShelfShortcutState when the lever flag is set. */
function applyOpenGroveShelfGate(tiles: Tile[][]) {
  for (let x = 56; x <= 60; x++) {
    const existing = tiles[163]?.[x];
    if (!existing) continue;
    tiles[163][x] = {
      type: 'dirt',
      walkable: true,
      elevation: existing.elevation ?? 0,
      spinePath: true,
    };
  }
}

/** Mirrors syncQuarryBankShortcutState when the lever flag is set. */
function applyOpenQuarryBankGate(tiles: Tile[][]) {
  for (let y = 221; y <= 224; y++) {
    const existing = tiles[y]?.[205];
    if (!existing) continue;
    tiles[y][205] = {
      type: 'dirt',
      walkable: true,
      elevation: existing.elevation ?? 0,
      spinePath: true,
    };
  }
}

describe('Whispering Woods elevation seam audit', () => {
  it('reports zero blocked el±1 path seams after auto-fix', () => {
    const map = generateMap(forestDef);
    const { horizontal, vertical } = findBlockedElevationSeams(map.tiles);
    expect(clusterSeams(horizontal, 'h').length).toBe(0);
    expect(clusterSeams(vertical, 'v').length).toBe(0);
  });

  it('world (71,86) bridge landing allows N-S crossing', () => {
    const map = generateMap(forestDef);
    const el0 = map.tiles[235][221];
    const el1 = map.tiles[236][221];
    expect(el0.spinePath).toBe(true);
    expect(el1.spinePath).toBe(true);
    expect(canCrossSpinePathElevation(el0, el1)).toBe(true);
  });

  it('keeps world (118,-17) through (122,-13) as a clean cliff block', () => {
    const map = generateMap(forestDef);
    for (let ty = 133; ty <= 137; ty++) {
      for (let tx = 268; tx <= 272; tx++) {
        expect(map.tiles[ty][tx]).toMatchObject({
          type: 'cliff',
          walkable: false,
          elevation: 1,
        });
      }
    }
  });

  it('world (59,-73) north-fort south approach allows N-S crossing', () => {
    const map = generateMap(forestDef);
    const south = map.tiles[77][209];
    const north = map.tiles[76][209];
    expect(south.walkable).toBe(true);
    expect(north.walkable).toBe(true);
    expect(south.spinePath).toBe(true);
    expect(north.spinePath).toBe(true);
    expect(canCrossSpinePathElevation(south, north)).toBe(true);
  });

  it('world (58,-90) north-fort north apron allows E-W crossing', () => {
    const map = generateMap(forestDef);
    const west = map.tiles[59][203];
    const east = map.tiles[59][208];
    expect(west.walkable).toBe(true);
    expect(east.walkable).toBe(true);
    expect(west.spinePath).toBe(true);
    expect(east.spinePath).toBe(true);
    expect(canCrossSpinePathElevation(west, east)).toBe(true);
  });

  it('world (54,-94) to dirt path at (54,-95) allows N-S crossing', () => {
    const map = generateMap(forestDef);
    const apron = map.tiles[56][204];
    const landing = map.tiles[55][204];
    expect(apron.walkable).toBe(true);
    expect(landing.walkable).toBe(true);
    expect(apron.spinePath).toBe(true);
    expect(landing.spinePath).toBe(true);
    expect(canCrossSpinePathElevation(apron, landing)).toBe(true);
  });

  it('world (60,-94) steps north onto dirt path at (60,-95)', () => {
    const map = generateMap(forestDef);
    const apron = map.tiles[56][210];
    const dirt = map.tiles[55][210];
    expect(apron.walkable).toBe(true);
    expect(dirt.type).toBe('dirt');
    expect(canCrossSpinePathElevation(apron, dirt)).toBe(true);
  });

  it('world (57,-98) full seam row allows N-S crossing off the dirt spine', () => {
    const map = generateMap(forestDef);
    const north = map.tiles[51][207];
    const south = map.tiles[52][207];
    expect(north.walkable).toBe(true);
    expect(south.walkable).toBe(true);
    expect(north.elevation).toBe(1);
    expect(south.elevation).toBe(1);
    expect(north.spinePath).toBe(true);
    expect(south.spinePath).toBe(true);
    expect(canCrossSpinePathElevation(north, south)).toBe(true);
  });

  it('world (54,-100) to (68,-100) corridor is fully walkable dirt shelf', () => {
    const map = generateMap(forestDef);
    for (let tx = 204; tx <= 217; tx++) {
      const tile = map.tiles[50][tx];
      expect(tile.type).toBe('dirt');
      expect(tile.walkable).toBe(true);
      expect(tile.elevation).toBe(1);
      expect(tile.spinePath).toBe(true);
    }
    expect(map.tiles[50][208].type).toBe('dirt');
    expect(map.tiles[50][205].type).toBe('dirt');
    const north = map.tiles[49][210];
    const south = map.tiles[50][210];
    expect(canCrossSpinePathElevation(north, south)).toBe(true);
  });

  it('world (44,-107) west hollow approach has no E-W elevation seam', () => {
    const map = generateMap(forestDef);
    const west = map.tiles[43][186];
    const here = map.tiles[43][188];
    const east = map.tiles[43][204];
    expect(here.walkable).toBe(true);
    expect(here.elevation).toBe(1);
    expect(here.spinePath).toBe(true);
    expect(west.spinePath).toBe(true);
    expect(west.elevation).toBe(1);
    expect(east.spinePath).toBe(true);
    expect(canCrossSpinePathElevation(west, here)).toBe(true);
    expect(canCrossSpinePathElevation(here, east)).toBe(true);
  });

  it('world (-1,-108) west seam crossing at tile x=148/149', () => {
    const map = generateMap(forestDef);
    const west = map.tiles[42][148];
    const east = map.tiles[42][149];
    expect(west.walkable).toBe(true);
    expect(east.walkable).toBe(true);
    expect(west.elevation).toBe(1);
    expect(east.elevation).toBe(1);
    expect(west.spinePath).toBe(true);
    expect(east.spinePath).toBe(true);
    expect(canCrossSpinePathElevation(west, east)).toBe(true);
    // West cliff column and east corridor wall stay sealed.
    expect(map.tiles[42][96].type).toMatch(/cliff/);
    expect(map.tiles[42][96].walkable).toBe(false);
    expect(map.tiles[50][148].type).toMatch(/cliff/);
    expect(map.tiles[50][148].walkable).toBe(false);
  });

  it('world (38,-106) west seam crossing at tile x=187/188', () => {
    const map = generateMap(forestDef);
    const west = map.tiles[44][187];
    const east = map.tiles[44][188];
    expect(west.walkable).toBe(true);
    expect(east.walkable).toBe(true);
    expect(west.elevation).toBe(1);
    expect(east.elevation).toBe(1);
    expect(west.spinePath).toBe(true);
    expect(east.spinePath).toBe(true);
    expect(west.type).toBe('hollow_blight');
    expect(east.type).toBe('hollow_blight');
    expect(canCrossSpinePathElevation(west, east)).toBe(true);
    // Authored cliff_face corridor wall (y=46-53) must stay intact - not flattened to dirt.
    expect(map.tiles[50][148].type).toMatch(/cliff/);
    expect(map.tiles[50][148].walkable).toBe(false);
  });

  it('world (54,-110) to (67,-110) corridor is fully walkable with open north seam', () => {
    const map = generateMap(forestDef);
    for (let tx = 204; tx <= 217; tx++) {
      const tile = map.tiles[40][tx];
      expect(tile.type).toBe('dirt');
      expect(tile.walkable).toBe(true);
      expect(tile.elevation).toBe(1);
      expect(tile.spinePath).toBe(true);
    }
    const north = map.tiles[39][210];
    const here = map.tiles[40][210];
    expect(canCrossSpinePathElevation(north, here)).toBe(true);
    expect(canCrossSpinePathElevation(here, map.tiles[41][210])).toBe(true);
  });

  it('world (56,-95) dirt shelf has no north elevation seam', () => {
    const map = generateMap(forestDef);
    const here = map.tiles[55][206];
    const north = map.tiles[54][206];
    const west = map.tiles[55][204];
    const east = map.tiles[55][210];
    expect(here.type).toBe('dirt');
    expect(here.elevation).toBe(1);
    expect(north.elevation).toBe(1);
    expect(canCrossSpinePathElevation(here, north)).toBe(true);
    expect(canCrossSpinePathElevation(west, east)).toBe(true);
  });

  it('world (-42,-121) through (-20,-112) keeps dirt spine readable while adjacent seam art has no collision', () => {
    const map = generateMap(forestDef);
    const seam = map.tiles[38][130];
    const westSeam = map.tiles[38][114];
    const farWestSeam = map.tiles[29][108];
    for (const tile of [seam, map.tiles[37][130], map.tiles[39][130], westSeam, farWestSeam]) {
      expect(tile.type).toBe('hollow_blight');
      expect(tile.walkable).toBe(true);
      expect(tile.spinePath).toBe(true);
      expect(canCrossSpinePathElevation(seam, tile)).toBe(true);
    }

    // Dirt in this rectangle can include normal ground; the fix targets adjacent
    // non-dirt seam art so it no longer collides beside the readable dirt spine.
  });
});

describe('world (63,106) stair band collision', () => {
  it('player tile is walkable stairs; row south is walkable grass apron', () => {
    const map = generateMap(forestDef);
    const player = map.tiles[255][212];
    const south = map.tiles[256][212];
    expect(player.type).toBe('stairs');
    expect(player.walkable).toBe(true);
    expect(south.type).toBe('grass');
    expect(south.walkable).toBe(true);
  });
});

describe('world (-17,42) Hollow open lane grass cleanup', () => {
  it('clears the stray tall grass clump from the open lane', () => {
    const map = generateMap(forestDef);
    for (let ty = 190; ty <= 194; ty++) {
      for (let tx = 131; tx <= 136; tx++) {
        expect(map.tiles[ty][tx].type).not.toBe('tall_grass');
      }
    }
    expect(map.tiles[192][133].walkable).toBe(true);
    expect(map.tiles[192][133].type).not.toBe('tall_grass');
  });
});

describe('world (-61,68..73) west cliff shelf reed bank', () => {
  it('keeps the reed lane cut base on grass instead of water or cliff', () => {
    const map = generateMap(forestDef);

    for (let ty = 218; ty <= 223; ty++) {
      const tile = map.tiles[ty][89];
      expect(tile.type).toBe('tall_grass');
      expect(tile.walkable).toBe(true);
      expect(tile.baseTile).toBe('grass');
    }
  });
});

describe('east hollow route gate at world (89,-92)', () => {
  function applyClosedEastHollowRouteGate(tiles: Tile[][]) {
    for (let tx = 233; tx <= 246; tx++) {
      const el = tiles[57][tx]?.elevation ?? 1;
      if (tx >= 237 && tx <= 241) {
        tiles[57][tx] = {
          type: 'gate',
          walkable: false,
          elevation: el,
          interactable: true,
          interactionId: 'east_hollow_route_gate_sealed',
        };
      } else {
        tiles[57][tx] = { type: 'iron_fence', walkable: false, elevation: el };
      }
    }
  }

  it('world (100,-82) east summit seam allows E-W crossing along x=250', () => {
    const map = generateMap(forestDef);
    const west = map.tiles[68][250];
    const east = map.tiles[68][251];
    expect(west.walkable).toBe(true);
    expect(east.walkable).toBe(true);
    expect(west.spinePath).toBe(true);
    expect(east.spinePath).toBe(true);
    expect(canCrossSpinePathElevation(west, east)).toBe(true);
    const north = map.tiles[67][250];
    const south = map.tiles[69][250];
    expect(canCrossSpinePathElevation(north, west)).toBe(true);
    expect(canCrossSpinePathElevation(west, south)).toBe(true);
  });

  it('north of gate stays clear; south keeps scatter away from lever pocket only', () => {
    const map = generateMap(forestDef);
    for (let ty = 58; ty <= 60; ty++) {
      for (let tx = 222; tx <= 254; tx++) {
        expect(map.tiles[ty][tx].type).not.toBe('dead_tree');
      }
    }
    for (let ty = 54; ty <= 56; ty++) {
      for (let tx = 232; tx <= 240; tx++) {
        expect(map.tiles[ty][tx].type).not.toBe('dead_tree');
      }
    }
  });

  it('lever at (86,-95) and five-tile gate centered on (89,-92)', () => {
    const map = generateMap(forestDef);
    applyClosedEastHollowRouteGate(map.tiles);
    const lever = map.tiles[55][236];
    expect(lever.type).toBe('shortcut_lever');
    expect(lever.interactionId).toBe('east_hollow_route_gate_lever');
    expect(map.tiles[57][233].type).toBe('iron_fence');
    expect(map.tiles[57][239].type).toBe('gate');
    expect(map.tiles[57][242].type).toBe('iron_fence');
  });
});

describe('hunter cliff shelf east face at world y=48', () => {
  it('seals cliff-1 east face (x=106–121) for y=196–199 with no dirt spine between cliff rows', () => {
    const map = generateMap(forestDef);
    for (let ty = 196; ty <= 199; ty++) {
      for (let tx = 106; tx <= 121; tx++) {
        const tile = map.tiles[ty][tx];
        expect(tile.type).toBe('cliff');
        expect(tile.walkable).toBe(false);
      }
    }

    // Iron gate plateau / lever spur stays dirt east of cliff-1.
    expect(map.tiles[196][122].type).toBe('dirt');
    expect(map.tiles[196][122].walkable).toBe(true);
    expect(map.tiles[198][122].type).toBe('dirt');

    const leverApproach = map.tiles[197][125];
    expect(leverApproach.type).toBe('dirt');
    expect(leverApproach.walkable).toBe(true);
  });
});

describe('hollow corridor gate at world (-32,-102)', () => {
  function applyClosedHollowGate(tiles: Tile[][]) {
    for (let ty = 50; ty <= 51; ty++) {
      for (let tx = 116; tx <= 129; tx++) {
        const el = tiles[ty][tx]?.elevation ?? 1;
        if (tx >= 120 && tx <= 124) {
          tiles[ty][tx] = {
            type: 'gate',
            walkable: false,
            elevation: el,
            interactable: true,
            interactionId: 'hollow_gate_sealed',
          };
        } else {
          tiles[ty][tx] = { type: 'iron_fence', walkable: false, elevation: el };
        }
      }
    }
  }

  function applyOpenHollowGate(tiles: Tile[][]) {
    for (let ty = 50; ty <= 51; ty++) {
      for (let tx = 116; tx <= 129; tx++) {
        const existing = tiles[ty][tx];
        tiles[ty][tx] = {
          type: 'dirt',
          walkable: true,
          elevation: existing?.elevation ?? 1,
          spinePath: true,
        };
      }
    }
  }

  it('lever is placed at tile (118,48) and closed gate uses iron_fence + gate panels', () => {
    const map = generateMap(forestDef);
    applyClosedHollowGate(map.tiles);
    const lever = map.tiles[48][118];
    expect(lever.type).toBe('shortcut_lever');
    expect(lever.interactionId).toBe('hollow_shortcut_lever');
    expect(map.tiles[50][116].type).toBe('iron_fence');
    expect(map.tiles[50][119].type).toBe('iron_fence');
    expect(map.tiles[50][122].type).toBe('gate');
    expect(map.tiles[50][125].type).toBe('iron_fence');
    expect(map.tiles[50][122].walkable).toBe(false);
  });

  it('opened gate row is walkable dirt spine', () => {
    const map = generateMap(forestDef);
    applyOpenHollowGate(map.tiles);
    for (let tx = 116; tx <= 129; tx++) {
      const tile = map.tiles[50][tx];
      expect(tile.type).toBe('dirt');
      expect(tile.walkable).toBe(true);
      expect(tile.spinePath).toBe(true);
    }
    expect(canCrossSpinePathElevation(map.tiles[49][122], map.tiles[50][122])).toBe(true);
  });
});

describe('grove shelf shortcut at world (-92,14)', () => {
  it('opened gate row allows el=0 to el=1 crossing from south landing', () => {
    const map = generateMap(forestDef);
    applyOpenGroveShelfGate(map.tiles);
    const south = map.tiles[164][58];
    const gate = map.tiles[163][58];
    expect(south).toMatchObject({ type: 'dirt', walkable: true, elevation: 0, spinePath: true });
    expect(gate).toMatchObject({ type: 'dirt', walkable: true, elevation: 1, spinePath: true });
    expect(canCrossSpinePathElevation(south, gate)).toBe(true);
  });
});

describe('quarry bank shortcut at world (55,72)', () => {
  it('has a lever on the quarry side of the west-bank fence', () => {
    const map = generateMap(forestDef);
    const lever = map.tiles[220][207];

    expect(lever).toMatchObject({
      type: 'shortcut_lever',
      interactionId: 'quarry_bank_shortcut_lever',
    });
    expect(map.tiles[219][205].type).toBe('fence');
    expect(map.tiles[224][205].type).toBe('fence');
  });

  it('clears live trees crowding the shortcut read', () => {
    const map = generateMap(forestDef);

    for (let ty = 216; ty <= 228; ty++) {
      for (let tx = 198; tx <= 214; tx++) {
        expect(map.tiles[ty][tx].type).not.toBe('tree');
      }
    }
  });

  it('opened gate allows the west shore and quarry side to connect', () => {
    const map = generateMap(forestDef);
    applyOpenQuarryBankGate(map.tiles);

    expect(map.tiles[221][204].walkable).toBe(true);
    expect(map.tiles[221][205]).toMatchObject({ type: 'dirt', walkable: true, spinePath: true });
    expect(map.tiles[221][206].walkable).toBe(true);
    expect(map.tiles[224][205]).toMatchObject({ type: 'dirt', walkable: true, spinePath: true });
  });
});

describe('Deep Hollow bonfire landing', () => {
  it('does not trap fast travel arrivals inside an elevation pocket', () => {
    const map = generateMap(forestDef);
    const bonfire = map.tiles[46][126];

    expect(['bonfire', 'bonfire_unlit']).toContain(bonfire.type);
    expect(bonfire.walkable).toBe(true);
    expect(bonfire.elevation).toBe(1);

    for (const [tx, ty] of [
      [126, 45],
      [127, 46],
      [126, 47],
      [125, 46],
    ] as const) {
      const exit = map.tiles[ty][tx];
      expect(exit.walkable).toBe(true);
      expect(exit.elevation).toBe(1);
    }
  });
});

describe('Guilrhym return landing', () => {
  it('has a first-class return portal back to Guilrhym', () => {
    const map = generateMap(forestDef);
    const portal = map.tiles[45][266];

    expect(portal.type).toBe('portal');
    expect(portal.walkable).toBe(true);
    expect(portal.transition).toMatchObject({
      targetMap: 'guilrhym',
      targetX: 150,
      targetY: 292,
    });

    for (const [tx, ty] of [
      [266, 44],
      [267, 45],
      [266, 46],
      [265, 45],
      [261, 45],
    ] as const) {
      expect(map.tiles[ty][tx].walkable).toBe(true);
    }
  });

  it('has a registered bonfire near the threshold pocket', () => {
    const map = generateMap(forestDef);
    const bonfire = map.tiles[45][256];
    const registryEntry = getBonfiresForMap('forest').find(entry => entry.id === 'bonfire_guilrhym_threshold');

    expect(registryEntry).toMatchObject({
      name: 'Precipice Reserve',
      tileX: 256,
      tileY: 45,
    });
    expect(bonfire.type).toBe('bonfire_unlit');
    expect(bonfire.walkable).toBe(true);
    expect(bonfire.interactionId).toBe('bonfire_guilrhym_threshold');
  });

  it('keeps the Precipice Reserve pocket free of live trees', () => {
    const map = generateMap(forestDef);

    for (let ty = 35; ty <= 49; ty++) {
      for (let tx = 253; tx <= 263; tx++) {
        expect(map.tiles[ty][tx].type).not.toBe('tree');
      }
    }
  });

  it('frames the reserve against a massive off-map caldera lip', () => {
    const map = generateMap(forestDef);
    const mountainTypes = new Set(['lava', 'volcanic_rock', 'ash', 'rock']);
    let mountainTiles = 0;

    for (let ty = 0; ty <= 58; ty++) {
      for (let tx = 262; tx <= 299; tx++) {
        if (mountainTypes.has(map.tiles[ty][tx].type)) mountainTiles++;
      }
    }

    expect(mountainTiles).toBeGreaterThan(650);
    expect(map.tiles[16][292].type).toBe('lava');
    expect(map.tiles[45][256].type).toBe('bonfire_unlit');
    expect(map.tiles[45][266].type).toBe('portal');
  });

  it('clears collision on the world x=96 caldera lip without deleting cliff art', () => {
    const map = generateMap(forestDef);
    const westNeighbor = map.tiles[11][245];
    const calledOutTile = map.tiles[11][246];
    const cliffArtTile = map.tiles[23][246];

    expect(westNeighbor.walkable).toBe(true);
    expect(westNeighbor.spinePath).toBe(true);
    expect(calledOutTile.walkable).toBe(true);
    expect(calledOutTile.spinePath).toBe(true);
    expect(canCrossSpinePathElevation(westNeighbor, calledOutTile)).toBe(true);
    expect(cliffArtTile.type).not.toBe('hollow_blight');
    expect(cliffArtTile.walkable).toBe(false);

    const lowerWestNeighbor = map.tiles[35][245];
    const lowerSeamTile = map.tiles[35][246];
    expect(lowerWestNeighbor.walkable).toBe(true);
    expect(lowerWestNeighbor.spinePath).toBe(true);
    expect(lowerSeamTile.walkable).toBe(true);
    expect(lowerSeamTile.spinePath).toBe(true);
    expect(canCrossSpinePathElevation(lowerWestNeighbor, lowerSeamTile)).toBe(true);

    for (let ty = 9; ty <= 36; ty++) {
      for (let tx = 245; tx <= 246; tx++) {
        if (ty >= 19 && ty <= 31) continue;
        expect(map.tiles[ty][tx].walkable).toBe(true);
        expect(map.tiles[ty][tx].spinePath).toBe(true);
      }
    }

    for (let ty = 19; ty <= 31; ty++) {
      for (let tx = 244; tx <= 249; tx++) {
        expect(map.tiles[ty][tx].type).toBe(ty === 19 ? 'cliff_edge_corrupted' : 'cliff_corrupted');
        expect(map.tiles[ty][tx].walkable).toBe(false);
      }
    }
  });

  it('clears live trees and collision on the south Precipice seam', () => {
    const map = generateMap(forestDef);

    for (let ty = 28; ty <= 41; ty++) {
      for (let tx = 239; tx <= 245; tx++) {
        expect(map.tiles[ty][tx].type).not.toBe('tree');
      }
    }

    for (let tx = 226; tx <= 246; tx++) {
      const north = map.tiles[37][tx];
      const seam = map.tiles[38][tx];
      const south = map.tiles[39][tx];
      expect(north.walkable).toBe(true);
      expect(north.spinePath).toBe(true);
      expect(seam.walkable).toBe(true);
      expect(seam.spinePath).toBe(true);
      expect(south.walkable).toBe(true);
      expect(south.spinePath).toBe(true);
      expect(canCrossSpinePathElevation(north, seam)).toBe(true);
      expect(canCrossSpinePathElevation(seam, south)).toBe(true);
    }
  });

  it('keeps the NE ridge heresy altar clear of surrounding dead trees', () => {
    const map = generateMap(forestDef);

    expect(map.tiles[45][235].type).toBe('heresy_altar');
    for (let ty = 41; ty <= 49; ty++) {
      for (let tx = 231; tx <= 240; tx++) {
        if (tx === 235 && ty === 45) continue;
        expect(map.tiles[ty][tx].type).not.toBe('dead_tree');
      }
    }
  });

  it('covers the exposed Precipice dirt spine with cliff face', () => {
    const map = generateMap(forestDef);

    for (let ty = 40; ty <= 57; ty++) {
      for (let tx = 226; tx <= 230; tx++) {
        const tile = map.tiles[ty][tx];
        expect(tile.type).toBe('cliff');
        expect(tile.walkable).toBe(false);
      }
    }
  });
});

describe('known fixed seams', () => {
  it('ranger cottage (79-80, 75)', () => {
    const map = generateMap(forestDef);
    expect(map.tiles[225][229].spinePath).toBe(true);
    expect(map.tiles[225][230].spinePath).toBe(true);
  });

  it('plateau crossing (89-90, 27)', () => {
    const map = generateMap(forestDef);
    expect(map.tiles[177][239].spinePath).toBe(true);
    expect(map.tiles[177][240].spinePath).toBe(true);
  });
});

describe('forest cathedral interior collision', () => {
  it('keeps a central aisle walkable while pew rows block side movement', () => {
    const map = generateMap(forestDef);

    for (const tx of [185, 186]) {
      expect(map.tiles[134][tx].walkable).toBe(true);
      expect(map.tiles[145][tx].walkable).toBe(true);
    }

    for (const tx of [183, 184, 187, 188]) {
      expect(map.tiles[134][tx]).toMatchObject({ type: 'wooden_path', walkable: false });
    }
  });
});
