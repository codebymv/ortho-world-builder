import { describe, expect, it } from 'vitest';
import { generateMap } from '@/data/mapGenerator';
import { forestDef } from '@/content/regions/whispering_woods/map';
import { canCrossSpinePathElevation, isSpinePathElevationTile } from '@/lib/game/World';

describe('Whispering Woods dirt spine elevation', () => {
  it('marks vertical portal spine and allows north–south elevation steps', () => {
    const map = generateMap(forestDef);
    for (let tx = 146; tx <= 153; tx++) {
      expect(map.tiles[147][tx].spinePath).toBe(true);
      expect(map.tiles[148][tx].type).toBe('dirt');
    }

    const from = map.tiles[149][150];
    const to = map.tiles[148][150];
    expect(isSpinePathElevationTile(from)).toBe(true);
    expect(isSpinePathElevationTile(to)).toBe(true);
    expect(canCrossSpinePathElevation(from, to)).toBe(true);

    const high = map.tiles[107][150];
    const low = map.tiles[108][150];
    expect(canCrossSpinePathElevation(high, low)).toBe(true);
  });

  it('marks east–west corridor at world (42, 0) and grass apron below', () => {
    const map = generateMap(forestDef);
    const west = map.tiles[150][191];
    const east = map.tiles[150][192];
    expect(west.spinePath).toBe(true);
    expect(east.spinePath).toBe(true);
    expect(canCrossSpinePathElevation(west, east)).toBe(true);

    const grassWest = map.tiles[153][191];
    const grassEast = map.tiles[153][192];
    expect(grassWest.spinePath).toBe(true);
    expect(grassEast.spinePath).toBe(true);
    expect(canCrossSpinePathElevation(grassWest, grassEast)).toBe(true);
  });

  it('marks north grass apron at world (37, -2) below north-bank spine', () => {
    const map = generateMap(forestDef);
    const dirt = map.tiles[148][188];
    const grass = map.tiles[147][188];
    expect(dirt.spinePath).toBe(true);
    expect(grass.spinePath).toBe(true);
    expect(canCrossSpinePathElevation(dirt, grass)).toBe(true);
  });
  it('does not bypass elevation on unmarked dirt', () => {
    const map = generateMap(forestDef);
    const from = map.tiles[80][60];
    const to = map.tiles[79][60];
    expect(from.spinePath).not.toBe(true);
    expect(canCrossSpinePathElevation(from, to)).toBe(false);
  });
});
