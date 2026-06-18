import { describe, expect, it, vi, afterEach } from 'vitest';
import { CombatSystem } from '@/lib/game/Combat';
import { GameState } from '@/lib/game/GameState';
import { ENEMY_BLUEPRINTS } from '@/data/enemies';
import {
  getVisceralDamage,
  getVisceralWindowDuration,
  isStanceBreakable,
  isVisceralExempt,
} from '@/data/balance';

function spawnFromBlueprint(combat: CombatSystem, type: keyof typeof ENEMY_BLUEPRINTS, position: { x: number; y: number }) {
  const bp = ENEMY_BLUEPRINTS[type];
  return combat.spawnEnemy(bp.name, position, bp.hp, bp.damage, bp.sprite, {
    speed: bp.speed,
    attackRange: bp.attackRange,
    chaseRange: bp.chaseRange,
    telegraphDuration: bp.telegraphDuration,
    recoverDuration: bp.recoverDuration,
    poise: bp.poise,
    staggerDuration: bp.staggerDuration,
    behaviorOverrides: bp.behaviorOverrides,
  });
}

describe('Visceral balance helpers', () => {
  it('classifies stance-breakability: trash/mid yes, heavies/bosses no', () => {
    expect(isStanceBreakable('bandit')).toBe(true);
    expect(isStanceBreakable('skeleton_captain')).toBe(true);
    expect(isStanceBreakable('golem')).toBe(false);
    expect(isStanceBreakable('stone_sentinel')).toBe(false);
    expect(isStanceBreakable('hollow_guardian')).toBe(false);
  });

  it('exempts void_wisp from all visceral paths', () => {
    expect(isVisceralExempt('void_wisp')).toBe(true);
    expect(isStanceBreakable('void_wisp')).toBe(false);
  });

  it('scales visceral damage by tier and folds in the stagger burst', () => {
    // bandit (trash): 90 maxHP * 0.40 = 36, * 1.4 trash stagger mult = 50.
    expect(getVisceralDamage('bandit', ENEMY_BLUEPRINTS.bandit.hp)).toBe(50);
    // hollow_guardian (boss): 800 * 0.14 = 112, * 2.0 boss stagger mult = 224.
    expect(getVisceralDamage('hollow_guardian', ENEMY_BLUEPRINTS.hollow_guardian.hp)).toBe(224);
  });

  it('tightens the window for phase-2 bosses without changing damage', () => {
    const p1 = getVisceralWindowDuration('hollow_guardian', 1);
    const p2 = getVisceralWindowDuration('hollow_guardian', 2);
    expect(p2).toBeCloseTo(p1 * 0.6, 5);
  });
});

describe('Visceral state machine', () => {
  afterEach(() => vi.restoreAllMocks());

  it('a charged poise break opens a visceral window on a stance-breakable enemy', () => {
    const combat = new CombatSystem(new GameState());
    const enemy = spawnFromBlueprint(combat, 'bandit', { x: 0, y: 0 });
    enemy.state = 'chasing';
    enemy.poise = 5;

    combat.playerAttack(enemy, 50, undefined, undefined, 1.0, true);

    expect(enemy.state).toBe('visceral_open');
    expect(enemy.visceralTimer).toBeGreaterThan(0);
  });

  it('a normal (non-charged) poise break produces a plain stagger, not a window', () => {
    const combat = new CombatSystem(new GameState());
    const enemy = spawnFromBlueprint(combat, 'bandit', { x: 0, y: 0 });
    enemy.state = 'chasing';
    enemy.poise = 5;

    combat.playerAttack(enemy, 50, undefined, undefined, 1.0, false);

    expect(enemy.state).toBe('staggered');
  });

  it('heavies cannot be stance-broken into a window even on a charged break', () => {
    const combat = new CombatSystem(new GameState());
    const enemy = spawnFromBlueprint(combat, 'golem', { x: 0, y: 0 });
    enemy.state = 'chasing';
    enemy.poiseImmunityUsed = true; // bypass first-hit immunity
    enemy.poise = 5;

    combat.playerAttack(enemy, 80, undefined, undefined, 1.0, true);

    expect(enemy.state).toBe('staggered');
  });

  it('a charged break force-surfaces a diving water_slime', () => {
    const combat = new CombatSystem(new GameState());
    const enemy = spawnFromBlueprint(combat, 'water_slime', { x: 0, y: 0 });
    enemy.state = 'chasing';
    enemy.poise = 5;
    enemy.waterDiveTimer = 5;

    combat.playerAttack(enemy, 50, undefined, undefined, 1.0, true);

    expect(enemy.state).toBe('visceral_open');
    expect(enemy.waterDiveTimer).toBe(0);
  });

  it('an unanswered window lapses back to chase/idle', () => {
    const combat = new CombatSystem(new GameState());
    const enemy = spawnFromBlueprint(combat, 'bandit', { x: 0, y: 0 });
    enemy.state = 'visceral_open';
    enemy.visceralTimer = 0.01;
    enemy.playerAggroed = true;
    vi.spyOn(Math, 'random').mockReturnValue(1);

    combat.updateEnemies(0.05, { x: 2, y: 0 });

    expect(enemy.state).not.toBe('visceral_open');
  });
});

describe('performVisceral finisher', () => {
  it('deals tier-scaled % maxHP damage and grants the player i-frames', () => {
    const gameState = new GameState();
    const combat = new CombatSystem(gameState);
    const enemy = spawnFromBlueprint(combat, 'corrupted_giant', { x: 0, y: 0 });
    enemy.state = 'visceral_open';
    enemy.health = enemy.maxHealth;
    gameState.player.iFrameTimer = 0;

    const result = combat.performVisceral(enemy);

    const expected = getVisceralDamage('corrupted_giant', enemy.maxHealth);
    expect(result.damage).toBe(expected);
    expect(enemy.health).toBe(enemy.maxHealth - expected);
    expect(result.killed).toBe(false);
    expect(enemy.state).toBe('recovering');
    expect(gameState.player.iFrameTimer).toBeGreaterThanOrEqual(0.6);
  });

  it('kills when the finisher exceeds remaining HP', () => {
    const combat = new CombatSystem(new GameState());
    const enemy = spawnFromBlueprint(combat, 'bandit', { x: 0, y: 0 });
    enemy.state = 'visceral_open';
    enemy.health = 10;

    const result = combat.performVisceral(enemy);

    expect(result.killed).toBe(true);
    expect(enemy.state).toBe('dead');
  });

  it('is a no-op against an enemy without an open window', () => {
    const combat = new CombatSystem(new GameState());
    const enemy = spawnFromBlueprint(combat, 'bandit', { x: 0, y: 0 });
    enemy.state = 'chasing';
    const before = enemy.health;

    const result = combat.performVisceral(enemy);

    expect(result).toEqual({ killed: false, damage: 0 });
    expect(enemy.health).toBe(before);
  });
});
