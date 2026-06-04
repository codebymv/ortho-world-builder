import { describe, it, expect } from 'vitest';
import { generateMap } from '@/data/mapGenerator';
import { forestDef } from '@/content/regions/whispering_woods/map';

describe('Whispering Woods precipice west pocket', () => {
  it('clears live trees at world (77,-139)', () => {
    const map = generateMap(forestDef);
    const t = map.tiles[11][227];
    expect(t.type).not.toBe('tree');
    expect(t.walkable).toBe(true);

    expect(map.tiles[12][227].type).toBe('summoning_ritual');

    const collidingDeadTrees: string[] = [];
    for (let ty = 10; ty <= 14; ty++) {
      for (let tx = 225; tx <= 229; tx++) {
        const dist = Math.max(Math.abs(tx - 227), Math.abs(ty - 12));
        if (dist > 2 || (tx === 227 && ty === 12)) continue;
        if (map.tiles[ty][tx].type === 'dead_tree') {
          collidingDeadTrees.push(`${tx},${ty}`);
        }
      }
    }
    expect(collidingDeadTrees).toEqual([]);

    const liveTrees: string[] = [];
    for (let ty = 9; ty <= 13; ty++) {
      for (let tx = 225; tx <= 232; tx++) {
        if (map.tiles[ty][tx].type === 'tree') {
          liveTrees.push(`${tx},${ty}`);
        }
      }
    }
    expect(liveTrees).toEqual([]);
  });
});
