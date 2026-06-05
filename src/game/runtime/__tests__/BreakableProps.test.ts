import { describe, expect, it, vi } from 'vitest';
import { breakTileAt } from '@/game/runtime/BreakableProps';
import type { WorldMap } from '@/lib/game/World';

describe('BreakableProps', () => {
  it('cuts tall grass back to grass even beside cliff and water', () => {
    const map: WorldMap = {
      name: 'Test',
      width: 3,
      height: 3,
      tiles: [
        [
          { type: 'grass', walkable: true, elevation: 0 },
          { type: 'cliff', walkable: false, elevation: 0 },
          { type: 'grass', walkable: true, elevation: 0 },
        ],
        [
          { type: 'water', walkable: false, elevation: 0 },
          { type: 'tall_grass', walkable: true, elevation: 0 },
          { type: 'cliff', walkable: false, elevation: 0 },
        ],
        [
          { type: 'grass', walkable: true, elevation: 0 },
          { type: 'water', walkable: false, elevation: 0 },
          { type: 'grass', walkable: true, elevation: 0 },
        ],
      ],
    };
    const world = {
      getCurrentMap: () => map,
      refreshMapTileRegion: vi.fn(),
    };
    const particles = { emit: vi.fn() };

    expect(breakTileAt(world, map, 1, 1, particles)).toBe(true);
    expect(map.tiles[1][1]).toMatchObject({
      type: 'grass',
      walkable: true,
      elevation: 0,
    });
  });
});
