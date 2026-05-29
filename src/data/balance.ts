/**
 * Central combat balance constants. Import from here instead of scattering magic numbers.
 */

/** Player should die in roughly this many clean hits at 100 HP (no block/heal). */
export const SURVIVABILITY_TARGETS = {
  trashHitsToKill: { min: 5, max: 7 },
  eliteHitsToKill: { min: 3, max: 5 },
  bossHitsToKill: { min: 2, max: 4 },
} as const;

/** Stagger burst multiplier when hitting a staggered enemy. */
export const STAGGER_DAMAGE_MULT = 1.4;
export const STAGGER_DAMAGE_MULT_BOSS = 2.0;

export const BOSS_ENEMY_TYPES = new Set([
  'hollow_guardian',
  'ashen_reaver',
  'ridge_revenant',
  'corrupted_giant',
]);

export function getStaggerDamageMultiplier(enemyType: string): number {
  return BOSS_ENEMY_TYPES.has(enemyType) ? STAGGER_DAMAGE_MULT_BOSS : STAGGER_DAMAGE_MULT;
}

/** Compute hits-to-kill for a given enemy damage vs player max HP. */
export function hitsToKillPlayer(enemyDamage: number, playerMaxHp = 100): number {
  if (enemyDamage <= 0) return Infinity;
  return Math.ceil(playerMaxHp / enemyDamage);
}

/** Compute R1 hits-to-kill for a given enemy HP vs player attack damage. */
export function hitsToKillEnemy(enemyHp: number, playerDamage = 20): number {
  if (playerDamage <= 0) return Infinity;
  return Math.ceil(enemyHp / playerDamage);
}
