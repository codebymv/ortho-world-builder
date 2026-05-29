import { describe, expect, it } from 'vitest';
import { generateMap } from '@/data/mapGenerator';
import { forestDef } from '@/content/regions/whispering_woods/map';
import { canCrossSpinePathElevation } from '@/lib/game/World';

describe('east-west path crossing at world (89-90, 27) / tile (239-240, 177)', () => {
  it('both sides of the el=0/el=1 seam have spinePath and allow crossing', () => {
    const map = generateMap(forestDef);
    const el0 = map.tiles[177][239];
    const el1 = map.tiles[177][240];
    expect({ tx: 239, type: el0.type, walkable: el0.walkable, elev: el0.elevation, spine: el0.spinePath })
      .toEqual({ tx: 239, type: 'grass', walkable: true, elev: 0, spine: true });
    expect({ tx: 240, type: el1.type, walkable: el1.walkable, elev: el1.elevation, spine: el1.spinePath })
      .toEqual({ tx: 240, type: 'grass', walkable: true, elev: 1, spine: true });
    expect(canCrossSpinePathElevation(el0, el1)).toBe(true);
    expect(canCrossSpinePathElevation(el1, el0)).toBe(true);
  });
});

describe('ranger cottage path at world (79-80, 75) / tile (229-230, 225)', () => {
  it('both sides of the el=0/el=1 seam have spinePath and allow crossing', () => {
    const map = generateMap(forestDef);
    const el0 = map.tiles[225][229];
    const el1 = map.tiles[225][230];
    expect({ tx: 229, type: el0.type, walkable: el0.walkable, elev: el0.elevation, spine: el0.spinePath })
      .toEqual({ tx: 229, type: 'grass', walkable: true, elev: 0, spine: true });
    expect({ tx: 230, type: el1.type, walkable: el1.walkable, elev: el1.elevation, spine: el1.spinePath })
      .toEqual({ tx: 230, type: 'grass', walkable: true, elev: 1, spine: true });
    expect(canCrossSpinePathElevation(el0, el1)).toBe(true);
    expect(canCrossSpinePathElevation(el1, el0)).toBe(true);
  });
});
