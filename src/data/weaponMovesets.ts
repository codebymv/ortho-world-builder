/**
 * Per-weapon melee combo movesets.
 *
 * The combat loop (RuntimeCombatActions + PlayerSimulationSystem) is data-driven:
 * it reads the active weapon's moveset to decide how many combo steps exist, how
 * fast each swing plays, how hard it hits, how far it reaches, and how long the
 * recovery / chain window last. This lets each weapon feel distinct without
 * branching combat logic per weapon.
 *
 * Charge attacks (broadsword lunge, scythe arc slash) are handled separately in
 * RuntimeCombatActions and are NOT part of the moveset table.
 *
 * `DEFAULT_MOVESET` reproduces the original hardcoded 3-step combo numbers so any
 * weapon without an explicit entry behaves exactly as before.
 */

/** Base single-swing frame duration (seconds). Per-step `frameMult` scales this. */
export const ATTACK_FRAME_DURATION = 0.15;

export interface ComboStepDef {
  /** Multiplies ATTACK_FRAME_DURATION for this swing's per-frame timing. <1 = faster. */
  frameMult: number;
  /** Multiplies the weapon's base damage for this combo step. */
  damageMult: number;
  /** Multiplies the player's melee reach for this step (finishers can reach further). */
  rangeMult: number;
  /** Post-swing recovery lockout (seconds) if the combo ends on this step. */
  recovery: number;
  /**
   * Which generated attack sprite set to use (attack_0/1/2). Defaults to the step
   * index clamped to the available sprites. Lets longer combos reuse existing poses
   * until bespoke art exists ("logic first, art follows").
   */
  spriteStep?: number;
}

export interface WeaponMoveset {
  steps: ComboStepDef[];
  /** Seconds after a swing completes during which the next press chains the combo. */
  comboWindow: number;
}

/** Original behavior: 3 hits, speeds up toward the finisher, finisher hits 20% harder. */
export const DEFAULT_MOVESET: WeaponMoveset = {
  comboWindow: 0.3,
  steps: [
    { frameMult: 1.0, damageMult: 1.0, rangeMult: 1.0, recovery: 0.35 },
    { frameMult: 0.85, damageMult: 1.0, rangeMult: 1.0, recovery: 0.35 },
    { frameMult: 0.72, damageMult: 1.2, rangeMult: 1.0, recovery: 0.5 },
  ],
};

export const WEAPON_MOVESETS: Record<string, WeaponMoveset> = {
  // Light, quick triple-slash. Tight window rewards rhythm; low per-hit commitment.
  meek_short_sword: {
    comboWindow: 0.28,
    steps: [
      { frameMult: 0.9, damageMult: 1.0, rangeMult: 1.0, recovery: 0.3 },
      { frameMult: 0.8, damageMult: 1.0, rangeMult: 1.0, recovery: 0.3 },
      { frameMult: 0.7, damageMult: 1.15, rangeMult: 1.05, recovery: 0.42 },
    ],
  },

  // Balanced soldier's sword — the baseline cadence.
  iron_sword: {
    comboWindow: 0.3,
    steps: [
      { frameMult: 1.0, damageMult: 1.0, rangeMult: 1.0, recovery: 0.35 },
      { frameMult: 0.88, damageMult: 1.05, rangeMult: 1.0, recovery: 0.35 },
      { frameMult: 0.75, damageMult: 1.25, rangeMult: 1.05, recovery: 0.5 },
    ],
  },

  // Fast, aggressive 4-hit flurry. 4th hit reuses the finisher pose until art lands.
  shadow_blade: {
    comboWindow: 0.32,
    steps: [
      { frameMult: 0.85, damageMult: 0.95, rangeMult: 1.0, recovery: 0.28, spriteStep: 0 },
      { frameMult: 0.78, damageMult: 1.0, rangeMult: 1.0, recovery: 0.28, spriteStep: 1 },
      { frameMult: 0.78, damageMult: 1.0, rangeMult: 1.05, recovery: 0.32, spriteStep: 0 },
      { frameMult: 0.7, damageMult: 1.3, rangeMult: 1.1, recovery: 0.48, spriteStep: 2 },
    ],
  },

  // Heavy ceremonial blade — slow, weighty 2-hit with a forgiving window and big reach.
  ornamental_broadsword: {
    comboWindow: 0.42,
    steps: [
      { frameMult: 1.25, damageMult: 1.1, rangeMult: 1.1, recovery: 0.45 },
      { frameMult: 1.15, damageMult: 1.5, rangeMult: 1.2, recovery: 0.6, spriteStep: 2 },
    ],
  },

  // Sweeping reaper combo — long reach, wide arcs, 3 deliberate hits.
  terminus_scythe: {
    comboWindow: 0.36,
    steps: [
      { frameMult: 1.05, damageMult: 1.0, rangeMult: 1.15, recovery: 0.38 },
      { frameMult: 0.95, damageMult: 1.1, rangeMult: 1.15, recovery: 0.38 },
      { frameMult: 0.85, damageMult: 1.35, rangeMult: 1.25, recovery: 0.55 },
    ],
  },

  // Greatsword — slowest, heaviest 2-hit. Massive commitment, massive payoff.
  crystal_greatsword: {
    comboWindow: 0.5,
    steps: [
      { frameMult: 1.4, damageMult: 1.15, rangeMult: 1.1, recovery: 0.55 },
      { frameMult: 1.3, damageMult: 1.6, rangeMult: 1.25, recovery: 0.7, spriteStep: 2 },
    ],
  },
};

export function getMoveset(weaponId: string | null | undefined): WeaponMoveset {
  if (weaponId && WEAPON_MOVESETS[weaponId]) return WEAPON_MOVESETS[weaponId];
  return DEFAULT_MOVESET;
}

/** Number of combo steps for the given weapon. */
export function getComboStepCount(weaponId: string | null | undefined): number {
  return getMoveset(weaponId).steps.length;
}

/** Resolve the sprite step (attack_0/1/2) for a logical combo step, clamped to available art. */
export function getComboSpriteStep(
  weaponId: string | null | undefined,
  step: number,
  maxSpriteStep = 2,
): number {
  const moveset = getMoveset(weaponId);
  const def = moveset.steps[step];
  const raw = def?.spriteStep ?? step;
  return Math.max(0, Math.min(raw, maxSpriteStep));
}
