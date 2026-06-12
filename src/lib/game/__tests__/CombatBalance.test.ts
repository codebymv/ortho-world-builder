import { describe, expect, it } from 'vitest';
import { ENEMY_BLUEPRINTS } from '@/data/enemies';
import {
  SURVIVABILITY_TARGETS,
  STAGGER_DAMAGE_MULT,
  STAGGER_DAMAGE_MULT_BOSS,
  getStaggerDamageMultiplier,
  hitsToKillEnemy,
  hitsToKillPlayer,
} from '@/data/balance';

describe('CombatBalance', () => {
  it('defines survivability target ranges', () => {
    expect(SURVIVABILITY_TARGETS.trashHitsToKill).toEqual({ min: 5, max: 7 });
    expect(SURVIVABILITY_TARGETS.eliteHitsToKill).toEqual({ min: 3, max: 5 });
    expect(SURVIVABILITY_TARGETS.bossHitsToKill).toEqual({ min: 2, max: 4 });
  });

  it('entry trash kills the player in roughly 5-8 clean hits', () => {
    for (const type of ['wolf', 'spider', 'bandit', 'plant', 'skeleton', 'shadow'] as const) {
      const hits = hitsToKillPlayer(ENEMY_BLUEPRINTS[type].damage);
      expect(hits).toBeGreaterThanOrEqual(SURVIVABILITY_TARGETS.trashHitsToKill.min);
      expect(hits).toBeLessThanOrEqual(SURVIVABILITY_TARGETS.trashHitsToKill.max + 1);
    }
  });

  it('elites kill the player in roughly 3-5 clean hits', () => {
    for (const type of ['armored_wolf', 'skeleton_captain', 'stone_sentinel'] as const) {
      const hits = hitsToKillPlayer(ENEMY_BLUEPRINTS[type].damage);
      expect(hits).toBeGreaterThanOrEqual(SURVIVABILITY_TARGETS.eliteHitsToKill.min);
      expect(hits).toBeLessThanOrEqual(SURVIVABILITY_TARGETS.eliteHitsToKill.max + 1);
    }
  });

  it('wolf TTK at 20 ATK is 4-5 light hits', () => {
    const hits = hitsToKillEnemy(ENEMY_BLUEPRINTS.wolf.hp, 20);
    expect(hits).toBeGreaterThanOrEqual(4);
    expect(hits).toBeLessThanOrEqual(5);
  });

  it('shadow is aligned with other entry trash (not a 3-hit outlier)', () => {
    expect(hitsToKillEnemy(ENEMY_BLUEPRINTS.shadow.hp, 20)).toBeGreaterThanOrEqual(4);
    expect(hitsToKillPlayer(ENEMY_BLUEPRINTS.shadow.damage)).toBeGreaterThanOrEqual(5);
  });

  it('uses lower stagger burst on trash and full burst on bosses', () => {
    expect(getStaggerDamageMultiplier('wolf')).toBe(STAGGER_DAMAGE_MULT);
    expect(STAGGER_DAMAGE_MULT).toBe(1.4);
    expect(getStaggerDamageMultiplier('ridge_revenant')).toBe(STAGGER_DAMAGE_MULT_BOSS);
    expect(STAGGER_DAMAGE_MULT_BOSS).toBe(2.0);
  });

  it('hollow reaver projectile range stays clamped for fairness', () => {
    const reaver = ENEMY_BLUEPRINTS.hollow_reaver.behaviorOverrides;
    expect(reaver?.rangedRange).toBeLessThanOrEqual(3.5);
    expect(reaver?.rangedProjectileLifetime).toBeLessThanOrEqual(1.2);
    expect(reaver?.rangedCooldown).toBeGreaterThanOrEqual(1.2);
  });
});
