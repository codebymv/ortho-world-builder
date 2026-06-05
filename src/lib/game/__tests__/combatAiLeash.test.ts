import { afterEach, describe, expect, it, vi } from 'vitest';
import { CombatSystem, getActiveCombatLeashRangeSq, shouldEnemyResumeChasing } from '@/lib/game/Combat';
import { GameState } from '@/lib/game/GameState';
import { ENEMY_BLUEPRINTS } from '@/data/enemies';

function spawnFromBlueprint(combat: CombatSystem, type: keyof typeof ENEMY_BLUEPRINTS, position: { x: number; y: number }) {
  const bp = ENEMY_BLUEPRINTS[type];
  return combat.spawnEnemy(
    bp.name,
    position,
    bp.hp,
    bp.damage,
    bp.sprite,
    {
      speed: bp.speed,
      attackRange: bp.attackRange,
      chaseRange: bp.chaseRange,
      telegraphDuration: bp.telegraphDuration,
      recoverDuration: bp.recoverDuration,
      poise: bp.poise,
      staggerDuration: bp.staggerDuration,
      behaviorOverrides: bp.behaviorOverrides,
    },
  );
}

describe('Combat AI active leash', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('active leash is 1.5x chase range squared', () => {
    const chaseRangeSq = 6 * 6;
    expect(getActiveCombatLeashRangeSq(chaseRangeSq)).toBe(6 * 6 * 2.25);
    expect(shouldEnemyResumeChasing(7.5 * 7.5, chaseRangeSq)).toBe(true);
    expect(shouldEnemyResumeChasing(10 * 10, chaseRangeSq)).toBe(false);
  });

  it('recovering resumes chasing inside active leash but outside base chase', () => {
    const gameState = new GameState();
    const combat = new CombatSystem(gameState);
    const enemy = spawnFromBlueprint(combat, 'bandit', { x: 0, y: 0 });
    enemy.state = 'recovering';
    enemy.recoverTimer = 0.001;
    enemy.playerAggroed = true;
    enemy.attackAnimationTimer = 0;
    vi.spyOn(Math, 'random').mockReturnValue(1);

    combat.updateEnemies(0.02, { x: 7.5, y: 0 });

    expect(enemy.state).toBe('chasing');
  });

  it('recovering returns to idle beyond active leash', () => {
    const gameState = new GameState();
    const combat = new CombatSystem(gameState);
    const enemy = spawnFromBlueprint(combat, 'bandit', { x: 0, y: 0 });
    const chaseRange = ENEMY_BLUEPRINTS.bandit.chaseRange ?? 7;
    const beyondLeash = chaseRange * 1.5 + 1;
    enemy.state = 'recovering';
    enemy.recoverTimer = 0.001;
    enemy.playerAggroed = true;
    enemy.attackAnimationTimer = 0;
    vi.spyOn(Math, 'random').mockReturnValue(1);

    combat.updateEnemies(0.02, { x: beyondLeash, y: 0 });

    expect(enemy.state).toBe('idle');
  });

  it('retreating resumes chasing inside active leash but outside base chase', () => {
    const gameState = new GameState();
    const combat = new CombatSystem(gameState);
    const enemy = spawnFromBlueprint(combat, 'wolf', { x: 0, y: 0 });
    enemy.state = 'retreating';
    enemy.retreatTimer = 0.001;
    enemy.playerAggroed = true;

    combat.updateEnemies(0.02, { x: 7.5, y: 0 });

    expect(enemy.state).toBe('chasing');
  });

  it('retreating returns to idle beyond active leash', () => {
    const gameState = new GameState();
    const combat = new CombatSystem(gameState);
    const enemy = spawnFromBlueprint(combat, 'wolf', { x: 0, y: 0 });
    const chaseRange = ENEMY_BLUEPRINTS.wolf.chaseRange ?? 6;
    const beyondLeash = chaseRange * 1.5 + 1;
    enemy.state = 'retreating';
    enemy.retreatTimer = 0.001;
    enemy.playerAggroed = true;

    combat.updateEnemies(0.02, { x: beyondLeash, y: 0 });

    expect(enemy.state).toBe('idle');
  });
});
