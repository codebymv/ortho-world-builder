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
  /** Attack animation frame that applies damage. Frame 1+ prevents button-press hits. */
  activeFrame: 1 | 2;
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
    { frameMult: 1.0, activeFrame: 1, damageMult: 1.0, rangeMult: 1.0, recovery: 0.35 },
    { frameMult: 0.85, activeFrame: 1, damageMult: 1.0, rangeMult: 1.0, recovery: 0.35 },
    { frameMult: 0.72, activeFrame: 2, damageMult: 1.2, rangeMult: 1.0, recovery: 0.5 },
  ],
};

export const WEAPON_MOVESETS: Record<string, WeaponMoveset> = {
  // Light, quick triple-slash. Tight window rewards rhythm; low per-hit commitment.
  meek_short_sword: {
    comboWindow: 0.28,
    steps: [
      { frameMult: 0.9, activeFrame: 1, damageMult: 1.0, rangeMult: 1.0, recovery: 0.3 },
      { frameMult: 0.8, activeFrame: 1, damageMult: 1.0, rangeMult: 1.0, recovery: 0.3 },
      { frameMult: 0.7, activeFrame: 1, damageMult: 1.15, rangeMult: 1.05, recovery: 0.42 },
    ],
  },

  // Balanced soldier's sword - the baseline cadence.
  iron_sword: {
    comboWindow: 0.3,
    steps: [
      { frameMult: 1.0, activeFrame: 1, damageMult: 1.0, rangeMult: 1.0, recovery: 0.35 },
      { frameMult: 0.88, activeFrame: 1, damageMult: 1.05, rangeMult: 1.0, recovery: 0.35 },
      { frameMult: 0.75, activeFrame: 2, damageMult: 1.25, rangeMult: 1.05, recovery: 0.5 },
    ],
  },

  // Fast, aggressive 4-hit flurry. 4th hit reuses the finisher pose until art lands.
  shadow_blade: {
    comboWindow: 0.32,
    steps: [
      { frameMult: 0.85, activeFrame: 1, damageMult: 0.95, rangeMult: 1.0, recovery: 0.28, spriteStep: 0 },
      { frameMult: 0.78, activeFrame: 1, damageMult: 1.0, rangeMult: 1.0, recovery: 0.28, spriteStep: 1 },
      { frameMult: 0.78, activeFrame: 1, damageMult: 1.0, rangeMult: 1.05, recovery: 0.32, spriteStep: 0 },
      { frameMult: 0.7, activeFrame: 1, damageMult: 1.3, rangeMult: 1.1, recovery: 0.48, spriteStep: 2 },
    ],
  },

  // Heavy ceremonial blade - slow, weighty 2-hit with a forgiving window and big reach.
  ornamental_broadsword: {
    comboWindow: 0.42,
    steps: [
      { frameMult: 1.25, activeFrame: 2, damageMult: 1.1, rangeMult: 1.1, recovery: 0.45 },
      { frameMult: 1.15, activeFrame: 2, damageMult: 1.5, rangeMult: 1.2, recovery: 0.6, spriteStep: 2 },
    ],
  },

  // Sweeping reaper combo - long reach, wide arcs, 3 deliberate hits.
  terminus_scythe: {
    comboWindow: 0.36,
    steps: [
      { frameMult: 1.05, activeFrame: 1, damageMult: 1.0, rangeMult: 1.15, recovery: 0.38 },
      { frameMult: 0.95, activeFrame: 1, damageMult: 1.1, rangeMult: 1.15, recovery: 0.38 },
      { frameMult: 0.85, activeFrame: 2, damageMult: 1.35, rangeMult: 1.25, recovery: 0.55 },
    ],
  },

  // Clockwork Axe - weighty 3-hit with a hard finisher. Identity is crit/precision,
  // not flurry: deliberate cadence, big finisher. Charge is the 2-rotation extend (handled
  // in RuntimeCombatActions, not here).
  clockwork_axe: {
    comboWindow: 0.36,
    steps: [
      { frameMult: 1.1, activeFrame: 1, damageMult: 1.0, rangeMult: 1.0, recovery: 0.42 },
      { frameMult: 1.02, activeFrame: 1, damageMult: 1.08, rangeMult: 1.0, recovery: 0.42 },
      { frameMult: 0.94, activeFrame: 2, damageMult: 1.35, rangeMult: 1.12, recovery: 0.6, spriteStep: 2 },
    ],
  },

  // Greatsword - slowest, heaviest 2-hit. Massive commitment, massive payoff.
  crystal_greatsword: {
    comboWindow: 0.5,
    steps: [
      { frameMult: 1.4, activeFrame: 2, damageMult: 1.15, rangeMult: 1.1, recovery: 0.55 },
      { frameMult: 1.3, activeFrame: 2, damageMult: 1.6, rangeMult: 1.25, recovery: 0.7, spriteStep: 2 },
    ],
  },
};

export function getMoveset(weaponId: string | null | undefined): WeaponMoveset {
  if (weaponId && WEAPON_MOVESETS[weaponId]) return WEAPON_MOVESETS[weaponId];
  return DEFAULT_MOVESET;
}

// ---------------------------------------------------------------------------
// Per-weapon visceral (finisher) choreography.
//
// Same "logic first, art follows" idea as the combo table: the finisher's feel
// is data, not branched code. `onVisceral` reads this to drive hitstop, shake,
// the particle signature, the player pose (reused attack/spin frames), and the
// SFX hook - giving each weapon a distinct finisher without bespoke per-weapon
// sprites. Damage itself stays authoritative in CombatSystem.performVisceral.
// ---------------------------------------------------------------------------

export type VisceralStyle = 'thrust' | 'cleave' | 'flurry' | 'reap' | 'blink' | 'crush';

export interface VisceralChoreography {
  style: VisceralStyle;
  /** Cosmetic burst count emitted during the hitstop freeze - sells a flurry vs a single heavy blow. */
  hits: number;
  /** Hitstop freeze (seconds) on the key impact frame. */
  hitstop: number;
  shakeIntensity: number;
  shakeDuration: number;
  /** Particle signature for the finisher burst. */
  particleColor: number;
  particleCount: number;
  particleSize: number;
  particleSpeed: number;
}

/** Generic finisher for any weapon without a bespoke entry. */
export const DEFAULT_VISCERAL: VisceralChoreography = {
  style: 'thrust', hits: 1, hitstop: 0.16,
  shakeIntensity: 0.4, shakeDuration: 0.3,
  particleColor: 0xfff0c0, particleCount: 14, particleSize: 0.4, particleSpeed: 1.6,
};

export const WEAPON_VISCERAL: Record<string, VisceralChoreography> = {
  // Death by a thousand cuts - a rapid spray of light stabs.
  meek_short_sword: {
    style: 'flurry', hits: 5, hitstop: 0.12,
    shakeIntensity: 0.3, shakeDuration: 0.28,
    particleColor: 0xfff4d0, particleCount: 10, particleSize: 0.26, particleSpeed: 1.4,
  },
  // Clean run-through thrust - the classic riposte.
  iron_sword: {
    style: 'thrust', hits: 1, hitstop: 0.18,
    shakeIntensity: 0.42, shakeDuration: 0.3,
    particleColor: 0xffe9a8, particleCount: 16, particleSize: 0.42, particleSpeed: 1.8,
  },
  // Blink behind the target and strike from the dark.
  shadow_blade: {
    style: 'blink', hits: 2, hitstop: 0.15,
    shakeIntensity: 0.35, shakeDuration: 0.26,
    particleColor: 0x7c4dff, particleCount: 18, particleSize: 0.34, particleSpeed: 1.7,
  },
  // Massive overhead cleave - heaviest shake, ground-crack burst.
  ornamental_broadsword: {
    style: 'cleave', hits: 1, hitstop: 0.24,
    shakeIntensity: 0.6, shakeDuration: 0.4,
    particleColor: 0xffd27a, particleCount: 26, particleSize: 0.5, particleSpeed: 2.0,
  },
  // Wide reaping spin - the harvest, dripping corruption.
  terminus_scythe: {
    style: 'reap', hits: 3, hitstop: 0.2,
    shakeIntensity: 0.5, shakeDuration: 0.35,
    particleColor: 0x6a0dad, particleCount: 22, particleSize: 0.45, particleSpeed: 1.9,
  },
  // Guard-crushing impale - longest hitstop, near screen-freeze, shard burst.
  crystal_greatsword: {
    style: 'crush', hits: 1, hitstop: 0.3,
    shakeIntensity: 0.7, shakeDuration: 0.45,
    particleColor: 0xbeefff, particleCount: 30, particleSize: 0.55, particleSpeed: 2.2,
  },
  // Mechanical crush - heavy double impact, brass/steam debris (no magic glow).
  clockwork_axe: {
    style: 'crush', hits: 2, hitstop: 0.26,
    shakeIntensity: 0.62, shakeDuration: 0.4,
    particleColor: 0xB08D57, particleCount: 24, particleSize: 0.5, particleSpeed: 2.0,
  },
};

export function getWeaponVisceral(weaponId: string | null | undefined): VisceralChoreography {
  if (weaponId && WEAPON_VISCERAL[weaponId]) return WEAPON_VISCERAL[weaponId];
  return DEFAULT_VISCERAL;
}

/** Number of combo steps for the given weapon. */
export function getComboStepCount(weaponId: string | null | undefined): number {
  return getMoveset(weaponId).steps.length;
}

export function getComboActiveFrame(weaponId: string | null | undefined, step: number): 1 | 2 {
  const moveset = getMoveset(weaponId);
  const fallback = moveset.steps[moveset.steps.length - 1];
  return (moveset.steps[step] ?? fallback)?.activeFrame ?? 1;
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
