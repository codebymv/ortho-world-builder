import { describe, it, expect } from 'vitest';
import * as THREE from 'three';
import { GameState } from '@/lib/game/GameState';
import { CombatSystem } from '@/lib/game/Combat';
import { isPositionInBonfireSafeZone } from '@/game/runtime/bonfireCombatGuard';
import { ENEMY_BLUEPRINTS } from '@/data/enemies';

describe('fog-gate boss spawn', () => {
  it('arena centre is outside sanctuary when the arena bonfire is not kindled yet', () => {
    const flags: Record<string, boolean | number> = {};
    expect(isPositionInBonfireSafeZone('interior_hollow_arena', 0.5, 0.5, flags)).toBe(false);
    expect(isPositionInBonfireSafeZone('interior_guilrhym_cathedral', 0.5, 0.5, flags)).toBe(false);
  });

  it('south spawn is not invulnerable until the arena bonfire is kindled', () => {
    const flags: Record<string, boolean | number> = {};
    // handleMapTransition(..., 18, 32) -> world (0, 14)
    expect(isPositionInBonfireSafeZone('interior_hollow_arena', 0, 14, flags)).toBe(false);

    flags.bonfire_first_interior_hollow_arena_18_28 = true;
    expect(isPositionInBonfireSafeZone('interior_hollow_arena', 0, 14, flags)).toBe(true);
  });

  it('spawnEnemy materializes hollow guardian with ignoreBonfireSanctuary even on kindled arena', () => {
    const state = new GameState({} as THREE.Scene, {} as THREE.OrthographicCamera);
    state.currentMap = 'interior_hollow_arena';
    state.setFlag('bonfire_first_interior_hollow_arena_18_28', true);
    const combat = new CombatSystem(state);
    const bp = ENEMY_BLUEPRINTS.hollow_guardian;
    combat.spawnEnemy(bp.name, { x: 0.5, y: 0.5 }, bp.hp, bp.damage, bp.sprite, {
      speed: bp.speed,
      attackRange: bp.attackRange,
      chaseRange: bp.chaseRange,
      ignoreBonfireSanctuary: true,
    });
    expect(combat.getEnemies().some(e => e.type === 'hollow_guardian')).toBe(true);
  });

  it('spawnEnemy drops hollow guardian without ignoreBonfireSanctuary when kindled sanctuary overlaps (regression guard)', () => {
    const state = new GameState({} as THREE.Scene, {} as THREE.OrthographicCamera);
    state.currentMap = 'interior_hollow_arena';
    state.setFlag('bonfire_first_interior_hollow_arena_18_28', true);
    const combat = new CombatSystem(state);
    const bp = ENEMY_BLUEPRINTS.hollow_guardian;
    // Simulates the old bug: if someone removes ignoreBonfireSanctuary from boss
    // spawns while the post-victory bonfire is kindled, the guardian must not
    // silently fail to enter the live enemy list.
    combat.spawnEnemy(bp.name, { x: 0.5, y: 0.5 }, bp.hp, bp.damage, bp.sprite, {
      speed: bp.speed,
      attackRange: bp.attackRange,
      chaseRange: bp.chaseRange,
    });
    // At combat radius 6 the nave centre is outside the kindled disc - still spawns.
    expect(combat.getEnemies().some(e => e.type === 'hollow_guardian')).toBe(true);
  });

  it('spawnEnemy materializes ashen reaver at cathedral centre', () => {
    const state = new GameState({} as THREE.Scene, {} as THREE.OrthographicCamera);
    state.currentMap = 'interior_guilrhym_cathedral';
    const combat = new CombatSystem(state);
    const bp = ENEMY_BLUEPRINTS.ashen_reaver;
    combat.spawnEnemy(bp.name, { x: 0.5, y: 0.5 }, bp.hp, bp.damage, bp.sprite, {
      speed: bp.speed,
      attackRange: bp.attackRange,
      chaseRange: bp.chaseRange,
      ignoreBonfireSanctuary: true,
    });
    expect(combat.getEnemies().some(e => e.type === 'ashen_reaver')).toBe(true);
  });
});
