import type { CombatSystem } from '@/lib/game/Combat';
import type { GameState } from '@/lib/game/GameState';
import { ENEMY_BLUEPRINTS } from '@/data/enemies';

interface ScreenShakeLike {
  shake: (intensity: number, duration: number) => void;
}

interface ParticleSystemLike {
  emitAt: (
    x: number,
    y: number,
    z: number,
    count: number,
    color: number,
    size?: number,
    speed?: number,
    life?: number,
  ) => void;
}

export interface EastRidgeBoulderContext {
  state: GameState;
  combatSystem: CombatSystem;
  screenShake: ScreenShakeLike;
  particleSystem: ParticleSystemLike;
  playPropBreak?: () => void;
}

// East Ridge Ascent - scripted boulder encounter on the long C4 boulder lane.
//
// Layout (world-space; forest map 300×300, world = tile − 150):
//   Lane runs x 91-94, y −14 → 0  (tile C4: x241-244, y136-150).
//   Boulder spawns at the top of the lane (y = −16, one step above C4) and rolls
//   south (+y) the full length of the lane before slamming the south wall.
//   A skeleton guarding a log-and-rope containment device at the summit smashes
//   it loose; the boulder launches ~380 ms after the skeleton is triggered so the
//   player sees the break-free moment before the rock arrives.
//
// Trigger: player enters the southern third of the lane (y −2 → 2) so they have
// ~2.5 s to react before the boulder reaches them.

// Trigger band - southern mouth of the lane.
const TRIGGER_MIN_X = 90.5;
const TRIGGER_MAX_X = 94.5;
const TRIGGER_MIN_Y = -2;
const TRIGGER_MAX_Y =  2;

// Boulder and skeleton world positions at the lane summit.
const BOULDER_SPAWN  = { x: 92, y: -16 };
const SKELETON_SPAWN = { x: 92, y: -14 };

// Rolling south (+y) down the lane.
const ROLL_VELOCITY = { x: 0, y: 7.0 };

// Delay between skeleton smash and boulder launch (ms).
const LAUNCH_DELAY_MS = 380;

// Module-level state - tracks the pending delayed launch across frames.
let _pendingLaunch = false;
let _launchAt = -1;

/** Dev-only: clear the one-shot flag and disarm any in-flight launch so the encounter replays. */
export function resetBoulderEncounterForDev(state: { setFlag: (key: string, value: boolean) => void }): void {
  _pendingLaunch = false;
  _launchAt = -1;
  state.setFlag('east_ridge_boulder_seen', false);
}

export function updateEastRidgeBoulder(ctx: EastRidgeBoulderContext): void {
  const { state, combatSystem, screenShake, particleSystem } = ctx;
  if (state.currentMap !== 'forest') return;

  // ── Pending delayed boulder launch ───────────────────────────────────────
  if (_pendingLaunch) {
    if (performance.now() < _launchAt) return; // still waiting
    _pendingLaunch = false;

    // Launch the boulder - bigger hitRadius and heavier damage than a thrown projectile.
    combatSystem.spawnProjectile({
      position: { ...BOULDER_SPAWN },
      velocity: { ...ROLL_VELOCITY },
      damage: 36,
      sprite: 'rock',
      lifetime: 4.8,
      sourceEnemyId: 'east_ridge_boulder',
      hitRadius: 1.3,
      spinRate: 10,
    });

    // Heavy impact on release: rock+debris burst at spawn, strong screen shake.
    screenShake.shake(0.85, 0.7);
    particleSystem.emitAt(BOULDER_SPAWN.x, BOULDER_SPAWN.y, 0.3, 45, 0x8a7866, 0.16, 3.0, 1.4);
    particleSystem.emitAt(BOULDER_SPAWN.x, BOULDER_SPAWN.y, 0.2, 20, 0xc0aa90, 0.10, 1.8, 0.9);
    ctx.playPropBreak?.();
    return;
  }

  // ── One-shot trigger guard ────────────────────────────────────────────────
  if (state.getFlag('east_ridge_boulder_seen')) return;

  const p = state.player.position;
  if (p.x < TRIGGER_MIN_X || p.x > TRIGGER_MAX_X) return;
  if (p.y < TRIGGER_MIN_Y || p.y > TRIGGER_MAX_Y) return;

  // Mark immediately - prevents re-triggering even mid-launch.
  state.setFlag('east_ridge_boulder_seen', true);

  // ── Spawn the containment-breaking skeleton at the summit ─────────────────
  const bp = ENEMY_BLUEPRINTS.skeleton;
  if (bp) {
    combatSystem.spawnEnemy(
      bp.name,
      { ...SKELETON_SPAWN },
      bp.hp,
      bp.damage,
      bp.sprite,
      {
        speed: bp.speed,
        attackRange: bp.attackRange,
        chaseRange: bp.chaseRange,
        essenceReward: bp.essenceReward,
        goldReward: bp.goldReward,
        telegraphDuration: bp.telegraphDuration,
        recoverDuration: bp.recoverDuration,
        poise: bp.poise,
        staggerDuration: bp.staggerDuration,
        behaviorOverrides: bp.behaviorOverrides,
      },
    );
  }

  // Snap of breaking wood/rope - lighter shake at skeleton position.
  screenShake.shake(0.35, 0.25);
  particleSystem.emitAt(SKELETON_SPAWN.x, SKELETON_SPAWN.y, 0.3, 16, 0xc0a870, 0.12, 1.8, 0.8);

  // Arm the delayed boulder release.
  _pendingLaunch = true;
  _launchAt = performance.now() + LAUNCH_DELAY_MS;
}
