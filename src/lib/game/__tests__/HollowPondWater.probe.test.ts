import { describe, expect, it } from 'vitest';
import { generateMap } from '@/data/mapGenerator';
import {
  getHollowWaterCorruptionIntensity,
  getHollowWaterVisualBlend,
  isHollowWaterCorrupted,
  reconcileHollowApproachWaterInRects,
} from '@/data/hollowCorruptedWater';
import { minimapColorForHollowWater } from '@/components/game/minimapDrawing';
import { forestDef } from '@/content/regions/whispering_woods/map';

describe('hollow water corruption intensity', () => {
  it('is zero at or above the fade start (world -52, tileY >= 98)', () => {
    expect(getHollowWaterCorruptionIntensity(117, 100)).toBe(0);
    expect(getHollowWaterCorruptionIntensity(117, 98)).toBe(0);
    for (let ty = 98; ty <= 105; ty++) {
      expect(getHollowWaterCorruptionIntensity(116, ty)).toBe(0);
      expect(getHollowWaterCorruptionIntensity(117, ty)).toBe(0);
    }
  });

  it('feathers the -60 front with a dispersed leading edge (not a straight band)', () => {
    let clear = 0;
    let tinted = 0;
    for (let tx = 116; tx < 130; tx++) {
      const v = getHollowWaterCorruptionIntensity(tx, 95);
      if (v === 0) clear++;
      else tinted++;
    }
    expect(clear).toBeGreaterThan(0);
    expect(tinted).toBeGreaterThan(0);
  });

  it('ramps smoothly with tileY in the main band (no lateral scatter below -60)', () => {
    const i89 = getHollowWaterCorruptionIntensity(117, 89);
    const i89b = getHollowWaterCorruptionIntensity(120, 89);
    expect(i89).toBe(i89b);
    expect(i89).toBeGreaterThan(0);
    expect(i89).toBeLessThan(1);

    const shallow = getHollowWaterCorruptionIntensity(117, 89);
    const deep = getHollowWaterCorruptionIntensity(117, 82);
    expect(deep).toBeGreaterThan(shallow);
    expect(getHollowWaterVisualBlend(deep)).toBeGreaterThan(getHollowWaterVisualBlend(shallow));
  });

  it('is fully corrupted only in the Deep Hollow (tileY <= 55)', () => {
    expect(getHollowWaterCorruptionIntensity(140, 30)).toBe(1);
    expect(isHollowWaterCorrupted(140, 30)).toBe(true);
  });

  it('downgrades stale water_corrupted above the Deep Hollow line', () => {
    const tiles = Array.from({ length: 92 }, () =>
      Array.from({ length: 118 }, () => ({ type: 'grass', walkable: true })),
    );
    tiles[90][117] = { type: 'water_corrupted', walkable: false };
    expect(reconcileHollowApproachWaterInRects(tiles, [[116, 81, 18, 15]])).toBe(true);
    expect(tiles[90][117].type).toBe('water');
  });

  it('never affects water outside the authored rects', () => {
    expect(getHollowWaterCorruptionIntensity(250, 200)).toBe(0);
    expect(isHollowWaterCorrupted(250, 200)).toBe(false);
  });
});

describe('hollow approach water tile bake', () => {
  it('keeps approach-band river as water with a Y-only gradient; Deep Hollow uses water_corrupted', () => {
    const map = generateMap(forestDef);
    const t = map.tiles;

    for (let ty = 4; ty <= 52; ty++) {
      for (let tx = 116; tx < 170; tx++) {
        expect(t[ty]?.[tx]?.type).not.toBe('water');
      }
    }

    for (let ty = 90; ty <= 100; ty++) {
      for (let tx = 0; tx < 300; tx++) {
        expect(t[ty]?.[tx]?.type).not.toBe('water_corrupted');
      }
    }

    expect(t[90][117]?.type).toBe('water');

    for (let ty = 82; ty <= 89; ty++) {
      for (let tx = 116; tx < 134; tx++) {
        const type = t[ty]?.[tx]?.type;
        if (type === 'water' || type === 'water_corrupted') {
          expect(type).toBe('water');
        }
      }
    }

    expect(getHollowWaterCorruptionIntensity(117, 88)).toBeGreaterThan(
      getHollowWaterCorruptionIntensity(117, 89),
    );

    expect(t[94][123]?.type).toBe('bridge');
    expect(t[232][200]?.type).toBe('water');
  });
});

describe('hollow water minimap colors', () => {
  it('returns null outside Whispering Woods', () => {
    expect(minimapColorForHollowWater(117, 90, 'water', 'Other Map')).toBeNull();
  });

  it('uses clean blue above the fade start', () => {
    expect(minimapColorForHollowWater(117, 100, 'water', 'Whispering Woods', 'forest')).toBe('#1E88E5');
  });

  it('lerps toward corrupt purple as intensity increases', () => {
    const shallow = minimapColorForHollowWater(117, 89, 'water', 'Whispering Woods', 'forest');
    const deep = minimapColorForHollowWater(117, 82, 'water', 'Whispering Woods', 'forest');
    expect(shallow).not.toBe('#1E88E5');
    expect(deep).not.toBe(shallow);
    expect(deep).not.toBe('#1A0A22');
  });

  it('matches full corrupt color in the Deep Hollow', () => {
    expect(minimapColorForHollowWater(140, 30, 'water_corrupted', 'Whispering Woods', 'forest')).toBe('#1A0A22');
  });
});
