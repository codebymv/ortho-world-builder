import { describe, it, expect } from 'vitest';
import { generateMap } from '@/data/mapGenerator';
import { villageDef } from '@/content/regions/greenleaf/map';

describe('Greenleaf main road at world (-1,-21)', () => {
  it('stays walkable (no town hall wood on the N-S spine)', () => {
    const map = generateMap(villageDef);
    const tx = 119;
    const ty = 59;
    const tile = map.tiles[ty][tx];
    expect(tile.walkable).toBe(true);
    expect(tile.type).not.toBe('wood');
    for (let x = 116; x <= 121; x++) {
      expect(map.tiles[ty][x].walkable).toBe(true);
    }
  });
});
