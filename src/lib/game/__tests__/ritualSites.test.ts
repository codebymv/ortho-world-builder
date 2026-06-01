import { describe, it, expect } from 'vitest';
import { generateMap } from '@/data/mapGenerator';
import { forestDef } from '@/content/regions/whispering_woods/map';

describe('failed ritual sites', () => {
  it('places the dud glyph at tile (273, 259) — world (123, 109)', () => {
    const map = generateMap(forestDef);
    expect(map.tiles[259]?.[273]?.type).toBe('summoning_ritual_dud');
  });

  it('places the dud glyph at tile (134, 133) — world (-16, -17)', () => {
    const map = generateMap(forestDef);
    expect(map.tiles[133]?.[134]?.type).toBe('summoning_ritual_dud');
  });

  it('places the dud glyph at tile (285, 162) — world (135, 12)', () => {
    const map = generateMap(forestDef);
    expect(map.tiles[162]?.[285]?.type).toBe('summoning_ritual_dud');
  });
});
