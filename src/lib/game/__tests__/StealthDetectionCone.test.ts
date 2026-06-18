import { describe, expect, it } from 'vitest';
import {
  CombatSystem,
  DETECTION_FRONT_DOT,
  DETECTION_REAR_FACTOR,
  detectionRangeSqForFacing,
} from '@/lib/game/Combat';
import { GameState } from '@/lib/game/GameState';
import { ENEMY_BLUEPRINTS } from '@/data/enemies';

function spawnFromBlueprint(combat: CombatSystem, type: keyof typeof ENEMY_BLUEPRINTS, position: { x: number; y: number }) {
  const bp = ENEMY_BLUEPRINTS[type];
  return combat.spawnEnemy(bp.name, position, bp.hp, bp.damage, bp.sprite, {
    speed: bp.speed,
    attackRange: bp.attackRange,
    chaseRange: bp.chaseRange,
    poise: bp.poise,
    staggerDuration: bp.staggerDuration,
    behaviorOverrides: bp.behaviorOverrides,
  });
}

/** Freeze an idle enemy in place with a fixed facing so the aggro cone is deterministic. */
function makeIdleFacing(combat: CombatSystem, type: keyof typeof ENEMY_BLUEPRINTS, facing: 'up' | 'down' | 'left' | 'right') {
  const enemy = spawnFromBlueprint(combat, type, { x: 0, y: 0 });
  enemy.state = 'idle';
  enemy.facing = facing;
  enemy.patrolRadius = 0; // patrol target == origin == position -> no movement, no re-facing
  enemy.patrolOrigin = { x: 0, y: 0 };
  return enemy;
}

describe('detectionRangeSqForFacing', () => {
  const CR = 49; // chaseRange 7, squared

  it('uses full range when the player is straight ahead', () => {
    expect(detectionRangeSqForFacing('up', 0, 5, CR)).toBe(CR);
  });

  it('shrinks to the rear radius directly behind', () => {
    expect(detectionRangeSqForFacing('down', 0, 5, CR)).toBeCloseTo(CR * DETECTION_REAR_FACTOR ** 2, 5);
  });

  it('treats perpendicular (side) as outside the front arc', () => {
    // dot = 0 < DETECTION_FRONT_DOT -> rear radius
    expect(detectionRangeSqForFacing('up', 5, 0, CR)).toBeCloseTo(CR * DETECTION_REAR_FACTOR ** 2, 5);
  });

  it('counts a 45-degree forward offset as in-front (dot ~0.71 > threshold)', () => {
    // facing up=(0,1), toPlayer=(1,1) -> dot = 1/sqrt(2) ~= 0.707 >= DETECTION_FRONT_DOT
    expect(DETECTION_FRONT_DOT).toBeLessThan(0.707);
    expect(detectionRangeSqForFacing('up', 1, 1, CR)).toBe(CR);
  });
});

describe('vision cone gates idle aggro', () => {
  it('does NOT aggro a player behind the enemy at mid-range', () => {
    const combat = new CombatSystem(new GameState());
    const enemy = makeIdleFacing(combat, 'bandit', 'down'); // looking -y
    // player to the north (+y, behind), within full chase (7) but outside rear (~3.15)
    combat.updateEnemies(0.02, { x: 0, y: 5 });
    expect(enemy.state).toBe('idle');
  });

  it('DOES aggro a player in front at the same range', () => {
    const combat = new CombatSystem(new GameState());
    const enemy = makeIdleFacing(combat, 'bandit', 'up'); // looking +y, toward player
    combat.updateEnemies(0.02, { x: 0, y: 5 });
    expect(enemy.state).toBe('chasing');
  });

  it('still senses a player who closes in behind (within the rear radius)', () => {
    const combat = new CombatSystem(new GameState());
    const enemy = makeIdleFacing(combat, 'bandit', 'down');
    combat.updateEnemies(0.02, { x: 0, y: 2 }); // 2 tiles behind < rear ~3.15
    expect(enemy.state).toBe('chasing');
  });

  it('once aggroed, the cone no longer protects a behind-approach (post-aggro is omnidirectional)', () => {
    const combat = new CombatSystem(new GameState());
    const enemy = makeIdleFacing(combat, 'bandit', 'down');
    enemy.state = 'chasing';
    enemy.playerAggroed = true;
    // player behind at range 5 - would be a blind spot if idle, but it's already chasing
    combat.updateEnemies(0.02, { x: 0, y: 5 });
    expect(enemy.state).not.toBe('idle');
  });
});

describe('sneak shrinks the detection radius (stealthDetectionMult)', () => {
  it('a front-facing enemy that would aggro at full range does NOT aggro while sneaking', () => {
    const combat = new CombatSystem(new GameState());
    const enemy = makeIdleFacing(combat, 'bandit', 'up'); // facing the player, in front
    // bandit chaseRange 7; player in front at 6 -> aggros at full range, but 0.5x sneak -> 3.5 -> safe
    // updateEnemies(dt, pos, invuln, blocking, blockStart, world, onPhaseChange, stealthDetectionMult)
    combat.updateEnemies(0.02, { x: 0, y: 6 }, false, false, 0, undefined, undefined, 0.5);
    expect(enemy.state).toBe('idle');
  });

  it('the same enemy aggros at that range when not sneaking (mult = 1)', () => {
    const combat = new CombatSystem(new GameState());
    const enemy = makeIdleFacing(combat, 'bandit', 'up');
    combat.updateEnemies(0.02, { x: 0, y: 6 }, false, false, 0, undefined, undefined, 1.0);
    expect(enemy.state).toBe('chasing');
  });
});
