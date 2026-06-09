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
 * Radiant Vestige upgrade (the merged Estus Shard + Undead Bone Shard of this game). Each bonfire
 * "Increase Healing" raises the flask's max charges and its heal potency; cost scales by tier.
 */
export const EPHEMERAL_EXTRACT_CHARGES_PER_UPGRADE = 1;
/** +15% Ephemeral Extract heal per upgrade (additive: 1.0 -> 1.15 -> 1.30 ...). */
export const EPHEMERAL_EXTRACT_POTENCY_PER_UPGRADE = 0.15;

/** Max bonfire flask upgrades from Radiant Vestiges. */
export const MAX_EPHEMERAL_EXTRACT_UPGRADES = 10;

/**
 * Vestiges required per upgrade, indexed by how many upgrades are already applied.
 * First two cost 1, next two cost 2, then 3 each — extend the array as more areas add vestiges.
 */
export const VESTIGE_COST_BY_UPGRADE_LEVEL: readonly number[] = [1, 1, 2, 2, 3, 3, 3, 3, 3, 3];

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
