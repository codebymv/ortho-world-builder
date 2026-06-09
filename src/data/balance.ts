/**
 * Central combat balance constants. Import from here instead of scattering magic numbers.
 */

/** Player should die in roughly this many clean hits at 100 HP (no block/heal). */
export const SURVIVABILITY_TARGETS = {
  trashHitsToKill: { min: 5, max: 7 },
  eliteHitsToKill: { min: 3, max: 5 },
  bossHitsToKill: { min: 2, max: 4 },
} as const;

/**
 * Ephemeral Extract is an Estus-style flask, not a stacking consumable: the player holds a
 * capped number of charges that refill on bonfire rest / death-respawn. Chests and vendors no
 * longer dispense it, so this cap is the entire heal supply between fires.
 */
export const MAX_EPHEMERAL_EXTRACT_CHARGES = 5;

/**
 * Radiant Vestige upgrade (the merged Estus Shard + Undead Bone Shard of this game). Consuming
 * one at a bonfire's "Increase Healing" raises the flask's max charges and its heal potency.
 */
export const EPHEMERAL_EXTRACT_CHARGES_PER_UPGRADE = 1;
/** +15% Ephemeral Extract heal per Radiant Vestige consumed (additive: 1.0 -> 1.15 -> 1.30 ...). */
export const EPHEMERAL_EXTRACT_POTENCY_PER_UPGRADE = 0.15;

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
