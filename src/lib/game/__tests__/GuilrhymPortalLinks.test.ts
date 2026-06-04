import { describe, expect, it } from 'vitest';
import { generateMap } from '@/data/mapGenerator';
import { guilrhymDef } from '@/content/regions/ruins/map';

describe('Guilrhym portal links', () => {
  it('returns to the Whispering Woods pocket without landing on the return portal', () => {
    const map = generateMap(guilrhymDef);
    const portal = map.tiles[297][150];

    expect(portal.type).toBe('portal');
    expect(portal.walkable).toBe(true);
    expect(portal.transition).toMatchObject({
      targetMap: 'forest',
      targetX: 261,
      targetY: 45,
    });
  });
});
