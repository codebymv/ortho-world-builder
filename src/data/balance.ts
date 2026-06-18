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

// ---------------------------------------------------------------------------
// Sneak / approach mode (binary Souls-style: seen or not, no awareness meter).
// ---------------------------------------------------------------------------

/** Movement speed multiplier while the sneak toggle is active (crouch-walk). */
export const SNEAK_SPEED_MULT = 0.5;
/** Detection-range multiplier applied while sneaking (composes with the facing cone). */
export const SNEAK_DETECTION_MULT = 0.5;

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

// ---------------------------------------------------------------------------
// Visceral attack system (tier-2 punish window above the normal stagger).
// ---------------------------------------------------------------------------

/**
 * Enemies that never open a visceral window. void_wisp spawns in swarms of 6,
 * so cinematic finishers would fire constantly and wreck pacing.
 */
export const VISCERAL_EXEMPT_TYPES = new Set(['void_wisp']);

/**
 * Enemies whose poise can be broken into a visceral window by a CHARGED attack
 * (the "Stance Break" path). Heavies/bosses are intentionally absent: their
 * large poise pools + poiseImmunityFirstHit make this path unreachable, so they
 * remain parry-only by design.
 */
export const STANCE_BREAKABLE_TYPES = new Set([
  'slime', 'water_slime', 'wolf', 'spider', 'bandit', 'shadow', 'plant',
  'skeleton', 'skeleton_captain', 'armored_wolf', 'shadow_lurker', 'hollow_reaver',
]);

export type VisceralTier = 'trash' | 'mid' | 'heavy' | 'boss';

const VISCERAL_TIER_BY_TYPE: Record<string, VisceralTier> = {
  slime: 'trash', water_slime: 'trash', wolf: 'trash', spider: 'trash',
  bandit: 'trash', shadow: 'trash', plant: 'trash',
  skeleton: 'mid', skeleton_captain: 'mid', armored_wolf: 'mid',
  shadow_lurker: 'mid', hollow_reaver: 'mid',
  stone_sentinel: 'heavy', golem: 'heavy', corrupted_giant: 'heavy',
  hollow_guardian: 'boss', ashen_reaver: 'boss', ridge_revenant: 'boss',
};

/** Fraction of max HP a visceral finisher deals before the stagger burst, by tier. Tunable. */
const VISCERAL_HP_FRACTION: Record<VisceralTier, number> = {
  trash: 0.40, mid: 0.30, heavy: 0.18, boss: 0.14,
};

/** How long the punish window stays open (seconds) once triggered, by tier. */
const VISCERAL_WINDOW_DURATION: Record<VisceralTier, number> = {
  trash: 1.1, mid: 0.9, heavy: 0.8, boss: 0.7,
};

/** Phase-2+ bosses keep full damage but a tighter window (scarcity, not a damage cap). */
const VISCERAL_PHASE2_WINDOW_SCALE = 0.6;

export function getVisceralTier(enemyType: string): VisceralTier {
  return VISCERAL_TIER_BY_TYPE[enemyType] ?? 'mid';
}

export function isVisceralExempt(enemyType: string): boolean {
  return VISCERAL_EXEMPT_TYPES.has(enemyType);
}

/** Whether a charged-attack poise break may open a visceral window on this enemy. */
export function isStanceBreakable(enemyType: string): boolean {
  return STANCE_BREAKABLE_TYPES.has(enemyType) && !VISCERAL_EXEMPT_TYPES.has(enemyType);
}

/** HP damage a visceral finisher deals (tier % of max HP, then the stagger burst). */
export function getVisceralDamage(enemyType: string, maxHealth: number): number {
  const base = maxHealth * VISCERAL_HP_FRACTION[getVisceralTier(enemyType)];
  return Math.floor(base * getStaggerDamageMultiplier(enemyType));
}

/** Visceral punish-window duration, accounting for boss phase. */
export function getVisceralWindowDuration(enemyType: string, phase: number = 1): number {
  const base = VISCERAL_WINDOW_DURATION[getVisceralTier(enemyType)];
  return phase >= 2 ? base * VISCERAL_PHASE2_WINDOW_SCALE : base;
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
