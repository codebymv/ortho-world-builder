import { describe, expect, it } from 'vitest';
import { generateMap } from '@/data/mapGenerator';
import { forestDef } from '@/content/regions/whispering_woods/map';

/** Hooded river witness / approach apron — world (~-55,-73), tile ~(92,76). */
describe('hollow approach pond at world (-58, -74)', () => {
  it('keeps NW seal and west-run as normal water (no water_corrupted near river witness)', () => {
    const map = generateMap(forestDef);
    const t = map.tiles;

    expect(t[76][92]?.type).not.toBe('water_corrupted');
    expect(t[77][95]?.type).not.toBe('water_corrupted');

    for (let ty = 64; ty <= 86; ty++) {
      for (let tx = 28; tx <= 107; tx++) {
        if (t[ty][tx]?.type === 'water_corrupted') {
          expect.fail(`corrupted water on approach pond ${tx},${ty}`);
        }
      }
    }

    expect(t[79][91]?.type).toBe('water');
    expect(t[80][86]?.type).toBe('water');
  });
});
