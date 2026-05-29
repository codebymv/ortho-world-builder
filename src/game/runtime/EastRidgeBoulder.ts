import type { CombatSystem } from '@/lib/game/Combat';
import type { GameState } from '@/lib/game/GameState';
import { scheduleCameraPan } from '@/game/runtime/RuntimePlayerFrame';

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

// East Ridge Ascent: a single scripted boulder that rolls down the west-side climb the first
// time the player crosses it. Implemented on top of the existing projectile system (it damages
// on contact, can be blocked/parried, and fizzles when it slams into the cliff at the bottom of
// the climb) rather than a bespoke hazard, so it needs no new render/collision plumbing.
//
// Coordinates are world-space (forest map is 300x300, so world = tile - 150).
// Trigger band sits on the long west leg of the descent (tile x241-244, y142-146); the boulder
// spawns uphill of the player (tile ~242,138) and rolls south (+y) down the lane toward the arena,
// crossing the player's path before slamming into the cliff at the bottom of the leg.
const TRIGGER_MIN_X = 90.5;
const TRIGGER_MAX_X = 94.5;
const TRIGGER_MIN_Y = -8;
const TRIGGER_MAX_Y = -4;
const SPAWN_POS = { x: 92, y: -12 };
const ROLL_VELOCITY = { x: 0, y: 6.5 };

export function updateEastRidgeBoulder(ctx: EastRidgeBoulderContext): void {
  const { state, combatSystem } = ctx;
  if (state.currentMap !== 'forest') return;
  if (state.getFlag('east_ridge_boulder_seen')) return;

  const p = state.player.position;
  if (p.x < TRIGGER_MIN_X || p.x > TRIGGER_MAX_X) return;
  if (p.y < TRIGGER_MIN_Y || p.y > TRIGGER_MAX_Y) return;

  // Once-per-save: set immediately so it never repeats this session; persists with the next save.
  state.setFlag('east_ridge_boulder_seen', true);

  combatSystem.spawnProjectile({
    position: { ...SPAWN_POS },
    velocity: { ...ROLL_VELOCITY },
    damage: 30,
    sprite: 'rock',
    lifetime: 3.4,
    sourceEnemyId: 'east_ridge_boulder',
    hitRadius: 0.7,
    spinRate: 7,
  });

  ctx.screenShake.shake(0.5, 0.5);
  ctx.particleSystem.emitAt(SPAWN_POS.x, SPAWN_POS.y, 0.3, 24, 0x8a7866, 0.14, 2.4, 1.1);
  ctx.playPropBreak?.();
  // Brief pan uphill to sell where the boulder broke loose.
  scheduleCameraPan(SPAWN_POS.x, SPAWN_POS.y, 900);
}
