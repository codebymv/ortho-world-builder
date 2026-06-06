import { describe, it, expect } from 'vitest';
import { generateMap } from '@/data/mapGenerator';
import { forestDef } from '@/content/regions/whispering_woods/map';
import { villageDef } from '@/content/regions/greenleaf/map';
import {
  BONFIRE_COMBAT_SAFE_RADIUS,
  BONFIRE_REST_HOSTILE_RADIUS,
  isPositionInBonfireSafeZone,
} from '@/game/runtime/bonfireCombatGuard';
import { bonfireTileWorldPosition } from '@/data/bonfires';

describe('bonfire sanctuary', () => {
  it('marks enemyBlocked tiles around Riverside Grove bonfire on forest map', () => {
    const map = generateMap(forestDef, 'forest');
    const { x, y } = bonfireTileWorldPosition('forest', 156, 154);
    expect(isPositionInBonfireSafeZone('forest', x, y)).toBe(true);

    let blockedWalkable = 0;
    const r = Math.ceil(BONFIRE_COMBAT_SAFE_RADIUS);
    for (let dy = -r; dy <= r; dy++) {
      for (let dx = -r; dx <= r; dx++) {
        if (dx * dx + dy * dy > BONFIRE_COMBAT_SAFE_RADIUS * BONFIRE_COMBAT_SAFE_RADIUS) continue;
        const nx = 156 + dx;
        const ny = 154 + dy;
        const t = map.tiles[ny]?.[nx];
        if (!t?.walkable || t.type === 'bonfire' || t.type === 'bonfire_unlit') continue;
        if (t.enemyBlocked) blockedWalkable++;
      }
    }
    expect(blockedWalkable).toBeGreaterThan(8);
  });

  it('keeps bonfire center walkable for the player', () => {
    const map = generateMap(forestDef, 'forest');
    const center = map.tiles[154]?.[156];
    expect(center?.walkable).toBe(true);
  });

  it('excludes positions just outside the safe radius', () => {
    const { x, y } = bonfireTileWorldPosition('forest', 156, 154);
    const outside = BONFIRE_COMBAT_SAFE_RADIUS + 2;
    expect(isPositionInBonfireSafeZone('forest', x + outside, y)).toBe(false);
  });

  it('keeps the cliff ledge approach path outside combat sanctuary', () => {
    // Minimap HUD shows world coords — ~(34, 39) is the grass shelf fight before the bonfire.
    expect(isPositionInBonfireSafeZone('forest', 34, 39)).toBe(false);
    expect(BONFIRE_REST_HOSTILE_RADIUS).toBeGreaterThan(BONFIRE_COMBAT_SAFE_RADIUS);
  });

  it('keeps cliff ledge sentinels outside the bonfire sanctuary', () => {
    const toWorld = (tileX: number, tileY: number) => ({
      x: tileX - forestDef.width / 2 + 0.5,
      y: tileY - forestDef.height / 2 + 0.5,
    });

    expect(isPositionInBonfireSafeZone('forest', toWorld(177, 190).x, toWorld(177, 190).y)).toBe(false);
    expect(isPositionInBonfireSafeZone('forest', toWorld(209, 190).x, toWorld(209, 190).y)).toBe(false);
  });

  it('applies village bonfire sanctuary', () => {
    const map = generateMap(villageDef, 'village');
    const { x, y } = bonfireTileWorldPosition('village', 120, 104);
    expect(isPositionInBonfireSafeZone('village', x, y)).toBe(true);
    expect(map.mapKey).toBe('village');
    expect(map.tiles[104]?.[121]?.enemyBlocked).toBe(true);
  });
});
