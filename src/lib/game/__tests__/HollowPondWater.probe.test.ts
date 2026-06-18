import { describe, expect, it } from 'vitest';
import { generateMap } from '@/data/mapGenerator';
import { forestDef } from '@/content/regions/whispering_woods/map';

/** Hollow approach river under the corrupted biome. */
describe('hollow approach river at world (-58, -74)', () => {
  it('corrupts the Hollow river while preserving bridges and distant blue creeks', () => {
    const map = generateMap(forestDef);
    const t = map.tiles;
    const expectNoNormalWater = (x: number, y: number, width: number, height: number) => {
      for (let ty = y; ty < y + height; ty++) {
        for (let tx = x; tx < x + width; tx++) {
          if (t[ty][tx]?.type === 'water') {
            expect.fail(`normal water left in Hollow approach river ${tx},${ty}`);
          }
        }
      }
    };

    expect(t[79][91]?.type).toBe('water_corrupted');
    expect(t[80][86]?.type).toBe('water_corrupted');
    expect(t[80][155]?.type).toBe('water_corrupted');
    expect(t[80][190]?.type).toBe('water_corrupted');
    expect(t[80][252]?.type).toBe('water_corrupted');

    expectNoNormalWater(28, 64, 64, 16);
    expectNoNormalWater(4, 80, 104, 7);
    expectNoNormalWater(104, 80, 12, 11);
    expectNoNormalWater(110, 84, 14, 12);
    expectNoNormalWater(116, 81, 18, 15);
    expectNoNormalWater(130, 80, 10, 11);
    expectNoNormalWater(134, 78, 56, 8);
    expectNoNormalWater(190, 79, 50, 6);
    expectNoNormalWater(250, 78, 50, 6);

    expect(t[94][123]?.type).toBe('bridge');
    expect(t[232][200]?.type).toBe('water');
  });
});
