import * as THREE from 'three';
import { GameState } from './GameState';
import { SpatialHash } from './SpatialHash';
import { World } from './World';
import { breakTilesInRadius } from '@/game/runtime/BreakableProps';
import {
  isPositionInBonfireSafeZone,
  nudgeEnemyOutOfBonfireSanctuary,
} from '@/game/runtime/bonfireCombatGuard';

type CardinalDirection = 'up' | 'down' | 'left' | 'right';

const BLOCK_DAMAGE_REDUCTION = 0.6;
const PARRY_WINDOW = 0.25;
const ENEMY_MOVE_RADIUS = 0.3;
/** Locomotion multiplier while an enemy stands in unchopped tall grass (mirrors the player slow). */
const TALL_GRASS_SLOW = 0.5;
const DORMANCY_RANGE_SQ = 40 * 40;
// Faction enemies only begin fighting each other once the player is within this radius.
// Keeps pre-staged battles in stasis until the player is close enough to witness the start.
const FACTION_FIGHT_WAKE_SQ = 16 * 16;
const _tmpOldPos = { x: 0, y: 0 };
const HOLLOW_STILLNESS_THRESHOLD_SQ = 0.25 * 0.25;
const HOLLOW_STILLNESS_TRIGGER = 0.75;
const FALLING_SCYTHE_WARNING = 0.45;
const FALLING_SCYTHE_STRIKE = 0.35;
const FALLING_SCYTHE_RADIUS = 0.75;
const HOLLOW_ECLIPSE_TELEGRAPH = 2.2;
const HOLLOW_ECLIPSE_PHASE_DELAY = 8.0;
const HOLLOW_ECLIPSE_CHANCE = 0.08;
const MELEE_ELEVATION_TOLERANCE = 0.55;
const MELEE_TRACE_STEP = 0.25;
const PLAYER_LADDER_SAFE_TILE_TYPES = new Set(['ladder', 'curled_ladder', 'gate_ladder', 'gate_ladder_open']);
const WATER_SLIME_WATER_TILE_TYPES = new Set(['water', 'water_corrupted', 'waterfall']);
const SHELL_PROJECTILE_PASSABLE_TILE_TYPES = new Set(['water', 'water_corrupted', 'waterfall']);
const WATER_SLIME_DIVE_DURATION = 0.55;
const WATER_SLIME_SURFACE_DURATION = 0.45;
// Number of consecutive blocked frames before an enemy is forced into a brief recover pause.
const ENEMY_STUCK_FRAME_LIMIT = 6;
const ENEMY_PATH_RECOVERY_DURATION = 0.85;
const ENEMY_PATH_RECOVERY_BLEND = 0.28;
const BACKSTAB_FACING_DOT = 0.5;

type EnemyMovePredicate = (fromX: number, fromY: number, toX: number, toY: number, r: number) => boolean;
type EnemyMoveStep = { x: number; y: number; moved: boolean; vx: number; vy: number };
type EnemyChaseMoveStep = EnemyMoveStep & { usedRecovery: boolean };
type CombatParticleEmitter = { emit(position: THREE.Vector3, count: number, color: number, lifetime: number, speed: number, spread: number): void };

function cardinalDirectionToVector(direction: string): { x: number; y: number } {
  switch (direction) {
    case 'up': return { x: 0, y: 1 };
    case 'down': return { x: 0, y: -1 };
    case 'left': return { x: -1, y: 0 };
    case 'right': return { x: 1, y: 0 };
    default: return { x: 0, y: 0 };
  }
}

function trySlideEnemyMove(
  world: World,
  ox: number,
  oy: number,
  nx: number,
  ny: number,
  r: number,
  canMove: EnemyMovePredicate = (fromX, fromY, toX, toY, radius) => world.canEnemyMoveTo(fromX, fromY, toX, toY, radius),
): EnemyMoveStep {
  if (![ox, oy, nx, ny, r].every(Number.isFinite)) {
    return { x: ox, y: oy, moved: false, vx: 0, vy: 0 };
  }

  if (canMove(ox, oy, nx, ny, r)) {
    const dx = nx - ox;
    const dy = ny - oy;
    const len = Math.hypot(dx, dy) || 1;
    return { x: nx, y: ny, moved: true, vx: dx / len, vy: dy / len };
  }
  if (canMove(ox, oy, nx, oy, r)) {
    const sx = nx - ox;
    return { x: nx, y: oy, moved: true, vx: sx >= 0 ? 1 : -1, vy: 0 };
  }
  if (canMove(ox, oy, ox, ny, r)) {
    const sy = ny - oy;
    return { x: ox, y: ny, moved: true, vx: 0, vy: sy >= 0 ? 1 : -1 };
  }
  return { x: ox, y: oy, moved: false, vx: 0, vy: 0 };
}

function isWaterSlimeWaterTile(world: World, x: number, y: number): boolean {
  const tile = world.getTile(x, y);
  return !!tile && WATER_SLIME_WATER_TILE_TYPES.has(tile.type);
}

function canWaterSlimeStandAt(world: World, enemy: Enemy, x: number, y: number): boolean {
  const tile = world.getTile(x, y);
  if (!tile) return false;

  const homeDx = x - enemy.patrolOrigin.x;
  const homeDy = y - enemy.patrolOrigin.y;
  const leash = enemy.behaviorOverrides.waterLeashRadius ?? 10;
  if (homeDx * homeDx + homeDy * homeDy > leash * leash) return false;

  const homeElevation = world.getElevationAt(enemy.patrolOrigin.x, enemy.patrolOrigin.y);
  const targetElevation = tile.elevation ?? 0;
  if (Math.abs(homeElevation - targetElevation) > MELEE_ELEVATION_TOLERANCE) return false;

  if (WATER_SLIME_WATER_TILE_TYPES.has(tile.type)) return true;

  if (!tile.walkable || tile.enemyBlocked || tile.transition) return false;
  const shore = enemy.behaviorOverrides.waterShoreRadius ?? 8;
  return homeDx * homeDx + homeDy * homeDy <= shore * shore;
}

function canWaterSlimeMovePoint(world: World, enemy: Enemy, fromX: number, fromY: number, toX: number, toY: number): boolean {
  if (!canWaterSlimeStandAt(world, enemy, toX, toY)) return false;
  const fromWater = isWaterSlimeWaterTile(world, fromX, fromY);
  const toWater = isWaterSlimeWaterTile(world, toX, toY);
  if (!fromWater && !toWater) return world.canEnemyMoveTo(fromX, fromY, toX, toY, 0);

  const fromElevation = world.getElevationAt(fromX, fromY);
  const toElevation = world.getElevationAt(toX, toY);
  return Math.abs(fromElevation - toElevation) <= MELEE_ELEVATION_TOLERANCE;
}

function canWaterSlimeMoveTo(world: World, enemy: Enemy, fromX: number, fromY: number, toX: number, toY: number, r: number = 0): boolean {
  if (![fromX, fromY, toX, toY, r].every(Number.isFinite)) return false;
  if (!enemy.behaviorOverrides.amphibiousWaterLeash) {
    return world.canEnemyMoveTo(fromX, fromY, toX, toY, r);
  }
  if (r === 0) return canWaterSlimeMovePoint(world, enemy, fromX, fromY, toX, toY);

  return canWaterSlimeMovePoint(world, enemy, fromX - r, fromY - r, toX - r, toY - r) &&
         canWaterSlimeMovePoint(world, enemy, fromX + r, fromY - r, toX + r, toY - r) &&
         canWaterSlimeMovePoint(world, enemy, fromX - r, fromY + r, toX - r, toY + r) &&
         canWaterSlimeMovePoint(world, enemy, fromX + r, fromY + r, toX + r, toY + r) &&
         canWaterSlimeMovePoint(world, enemy, fromX,     fromY - r, toX,     toY - r) &&
         canWaterSlimeMovePoint(world, enemy, fromX,     fromY + r, toX,     toY + r) &&
         canWaterSlimeMovePoint(world, enemy, fromX - r, fromY,     toX - r, toY    ) &&
         canWaterSlimeMovePoint(world, enemy, fromX + r, fromY,     toX + r, toY    );
}

function emitWaterSlimeSplash(
  world: World,
  enemy: Enemy,
  particleSystem: CombatParticleEmitter | undefined,
  countMult: number = 1,
): void {
  if (!particleSystem || enemy.waterSplashCooldown > 0) return;
  const y = world.getVisualY(enemy.position.x, enemy.position.y) + 0.08;
  particleSystem.emit(new THREE.Vector3(enemy.position.x, y, 0.22), Math.round(8 * countMult), 0x9DEBFF, 0.38, 1.25, 0.48);
  particleSystem.emit(new THREE.Vector3(enemy.position.x, y, 0.24), Math.round(4 * countMult), 0xF2FFFF, 0.26, 0.85, 0.3);
  enemy.waterSplashCooldown = 0.32;
}

function pickWaterSlimeDiveTarget(world: World, enemy: Enemy): { x: number; y: number } | null {
  const leash = Math.max(2, enemy.behaviorOverrides.waterLeashRadius ?? 10);
  const shore = Math.max(1.5, enemy.behaviorOverrides.waterShoreRadius ?? 8);
  const maxRadius = Math.min(leash - 0.5, Math.max(2.5, shore * 0.75));

  for (let i = 0; i < 28; i++) {
    const angle = Math.random() * Math.PI * 2;
    const distance = 1.25 + Math.random() * maxRadius;
    const x = enemy.patrolOrigin.x + Math.cos(angle) * distance;
    const y = enemy.patrolOrigin.y + Math.sin(angle) * distance;
    if (isWaterSlimeWaterTile(world, x, y) && canWaterSlimeStandAt(world, enemy, x, y)) {
      return { x, y };
    }
  }

  return isWaterSlimeWaterTile(world, enemy.patrolOrigin.x, enemy.patrolOrigin.y)
    ? { x: enemy.patrolOrigin.x, y: enemy.patrolOrigin.y }
    : null;
}

function triggerWaterSlimeSurface(
  world: World | undefined,
  enemy: Enemy,
  particleSystem: CombatParticleEmitter | undefined,
): void {
  if (enemy.type !== 'water_slime' || !world || !isWaterSlimeWaterTile(world, enemy.position.x, enemy.position.y)) return;
  enemy.waterSurfaceTimer = WATER_SLIME_SURFACE_DURATION;
  emitWaterSlimeSplash(world, enemy, particleSystem, 1.0);
}

function beginWaterSlimeDive(
  world: World | undefined,
  enemy: Enemy,
  particleSystem: CombatParticleEmitter | undefined,
): boolean {
  if (enemy.type !== 'water_slime' || !world || !isWaterSlimeWaterTile(world, enemy.position.x, enemy.position.y)) return false;
  enemy.waterDiveTimer = WATER_SLIME_DIVE_DURATION;
  enemy.waterSurfaceTimer = 0;
  enemy.waterDiveCooldown = 1.1 + Math.random() * 0.8;
  emitWaterSlimeSplash(world, enemy, particleSystem, 1.15);
  return true;
}

function normalizeMoveVector(x: number, y: number): { x: number; y: number } {
  if (!Number.isFinite(x) || !Number.isFinite(y)) return { x: 0, y: 0 };
  const len = Math.hypot(x, y) || 1;
  return { x: x / len, y: y / len };
}

function tryEnemyMoveVector(
  world: World,
  ox: number,
  oy: number,
  vx: number,
  vy: number,
  moveDistance: number,
  r: number,
  usedRecovery: boolean,
  canMove?: EnemyMovePredicate,
): EnemyChaseMoveStep {
  const step = trySlideEnemyMove(
    world,
    ox,
    oy,
    ox + vx * moveDistance,
    oy + vy * moveDistance,
    r,
    canMove,
  );
  return { ...step, usedRecovery: step.moved && usedRecovery };
}

function tryEnemyChaseMove(
  world: World,
  enemy: Enemy,
  vx: number,
  vy: number,
  moveDistance: number,
  r: number,
): EnemyChaseMoveStep {
  if (![vx, vy, moveDistance, r].every(Number.isFinite)) {
    return { x: enemy.position.x, y: enemy.position.y, moved: false, vx: 0, vy: 0, usedRecovery: false };
  }
  const canMove: EnemyMovePredicate = (fromX, fromY, toX, toY, radius) =>
    canWaterSlimeMoveTo(world, enemy, fromX, fromY, toX, toY, radius);

  // Direct toward player is ALWAYS tried first, even mid-recovery. The old
  // logic deferred direct to last while `pathRecoveryTimer > 0`, which meant
  // any successful side-step refreshed the timer and locked the enemy into
  // perpetual sideways drift — visible as fast spiders spazzing along walls.
  // If the path is genuinely clear we want to take it immediately and exit
  // recovery mode; if it's blocked, the side candidates below still handle
  // navigation around the obstacle in the preferred direction.
  const direct = tryEnemyMoveVector(world, enemy.position.x, enemy.position.y, vx, vy, moveDistance, r, false, canMove);
  if (direct.moved) return direct;

  const preferredSide = enemy.pathRecoverySide || (enemy.visualSeed < 0.5 ? -1 : 1);
  const sideOrder: Array<-1 | 1> = [preferredSide, preferredSide === 1 ? -1 : 1];

  for (const side of sideOrder) {
    const sideVx = -vy * side;
    const sideVy = vx * side;
    // Blended (28% forward + 100% sideways) tried before pure side — gives the
    // enemy a diagonal slide along the wall that still drifts toward the
    // player, instead of pure perpendicular movement.
    const blended = normalizeMoveVector(vx * ENEMY_PATH_RECOVERY_BLEND + sideVx, vy * ENEMY_PATH_RECOVERY_BLEND + sideVy);
    const blendedStep = tryEnemyMoveVector(world, enemy.position.x, enemy.position.y, blended.x, blended.y, moveDistance, r, true, canMove);
    if (blendedStep.moved) return blendedStep;
    const pureStep = tryEnemyMoveVector(world, enemy.position.x, enemy.position.y, sideVx, sideVy, moveDistance, r, true, canMove);
    if (pureStep.moved) return pureStep;
  }

  return { x: enemy.position.x, y: enemy.position.y, moved: false, vx: 0, vy: 0, usedRecovery: false };
}

import type { EnemyBehaviorOverrides } from '../../data/enemies';

/**
 * Set an enemy's telegraph timer with souls-like variance: 10% snap (very fast),
 * 15% held (held a beat longer for a fake-out feel), 75% standard ±15% jitter.
 * This breaks the metronome cadence that makes a fight feel rote.
 */
function setVariableTelegraph(enemy: Enemy, baseDuration: number): void {
  const roll = Math.random();
  if (roll < 0.10) {
    enemy.telegraphTimer = baseDuration * 0.45; // snap strike
  } else if (roll < 0.25) {
    enemy.telegraphTimer = baseDuration * (1.25 + Math.random() * 0.25); // held
  } else {
    enemy.telegraphTimer = baseDuration * (0.85 + Math.random() * 0.30);
  }
}

/**
 * Picks a souls-like attack type for big enemies based on player distance and
 * current state. Mid-range picks bias to committed dash moves (grab / lunge /
 * slab), close-range biases to fast strikes and AoE sweeps.
 */
function pickBigEnemyAttackType(
  enemy: Enemy,
  distSq: number,
  attackRangeSq: number,
): Enemy['currentAttackType'] {
  const closeBand = distSq <= attackRangeSq * 1.1;
  const midBand = !closeBand && distSq <= attackRangeSq * 4;
  const roll = Math.random();
  switch (enemy.type) {
    case 'golem':
      if (closeBand) {
        if (roll < 0.18) return 'golem_grab';
        if (roll < 0.38) return 'golem_stomp';
        return 'normal';
      }
      if (midBand) {
        if (roll < 0.55) return 'golem_stomp';
        if (roll < 0.80) return 'golem_grab';
        return 'normal';
      }
      return 'golem_stomp';
    case 'stone_sentinel':
      if (closeBand) {
        if (roll < 0.42) return 'sentinel_slab';
        return 'normal';
      }
      if (midBand) {
        return roll < 0.75 ? 'sentinel_slab' : 'normal';
      }
      return 'sentinel_slab';
    case 'corrupted_giant':
      if (closeBand) {
        if (roll < 0.28) return 'sweep';
        return 'normal';
      }
      if (midBand) {
        return roll < 0.65 ? 'giant_lunge' : 'normal';
      }
      return 'giant_lunge';
    case 'ashen_reaver':
      if (closeBand) {
        if (roll < 0.30) return 'sweep';
        return 'normal';
      }
      if (midBand) {
        return roll < 0.55 ? 'reaver_rush' : 'normal';
      }
      return 'reaver_rush';
    case 'ridge_revenant':
      if (closeBand) {
        // Point-blank: pure melee pressure. Bladestorm is a spacing tool and reads
        // poorly fired from the enemy's own tile, so it's reserved for mid/far.
        if (roll < 0.40) return 'revenant_flurry';
        if (roll < 0.72) return 'revenant_crusher';
        return 'revenant_rush';
      }
      if (midBand) {
        // At mid range the Revenant favors its summoned blade array — you cannot
        // simply back off to safety; the storm punishes spacing.
        if (roll < 0.45) return 'revenant_bladestorm';
        if (roll < 0.72) return 'revenant_rush';
        return 'revenant_crusher';
      }
      // Far band: open with the blade storm or close the gap with a rush.
      return roll < 0.60 ? 'revenant_bladestorm' : 'revenant_rush';
    default:
      return 'normal';
  }
}

/**
 * Tile/sec advance speed of a committed dash attack mid-telegraph. Bigger
 * enemies hit harder but also commit further — souls-like spacing tension.
 */
function dashTileSpeedFor(enemy: Enemy): number {
  switch (enemy.type) {
    case 'golem': return 3.2;
    case 'stone_sentinel': return 4.4;
    case 'ashen_reaver': return 6.5;
    case 'corrupted_giant': return 5.0;
    case 'ridge_revenant': return 5.8;
    default: return 4.0;
  }
}

interface SpawnEnemyOptions {
  speed?: number;
  attackRange?: number;
  chaseRange?: number;
  essenceReward?: number;
  telegraphDuration?: number;
  recoverDuration?: number;
  poise?: number;
  staggerDuration?: number;
  behaviorOverrides?: EnemyBehaviorOverrides;
  /** Faction key. Enemies with different (non-empty) factions will attack each other. */
  faction?: string;
  patrolRadius?: number;
  /** Stable cross-session ID for persistence (format: `mapKey:z{zoneIdx}:{spawnIdx}` or `mapKey:fixed:{x}_{y}`). */
  zoneId?: string;
}

export interface Enemy {
  id: string;
  name: string;
  position: { x: number; y: number };
  health: number;
  maxHealth: number;
  damage: number;
  xpReward: number;
  essenceReward: number;
  sprite: string;
  speed: number;
  attackRange: number;
  chaseRange: number;
  state: 'idle' | 'chasing' | 'telegraphing' | 'attacking' | 'recovering' | 'staggered' | 'dead' | 'retreating' | 'charging' | 'slamming';
  lastAttackTime: number;
  attackCooldown: number;
  damageFlashTimer: number;
  attackAnimationTimer: number;
  telegraphTimer: number;
  telegraphDuration: number;
  recoverTimer: number;
  recoverDuration: number;
  patrolOrigin: { x: number; y: number };
  patrolAngle: number;
  patrolRadius: number;
  facing: CardinalDirection;
  moveCycle: number;
  moveBlend: number;
  velocity: { x: number; y: number };
  poise: number;
  maxPoise: number;
  staggerTimer: number;
  staggerDuration: number;
  poiseRegenTimer: number;
  /** Seconds before this enemy can start a new attack telegraph (e.g. after lunge knockback). */
  attackWindupLockTimer: number;
  /** Enemy blueprint type key (e.g. 'wolf', 'hollow_guardian') derived from sprite name. */
  type: string;
  /** Boss phase (1=default, 2=enraged). Only meaningful for boss enemies. */
  phase: number;
  /** Set once when phase 2 transition triggers, to prevent repeated transitions. */
  phaseTransitioned: boolean;
  behaviorOverrides: EnemyBehaviorOverrides;
  /** Set once when first poise break is absorbed by poiseImmunityFirstHit. */
  poiseImmunityUsed: boolean;
  /** Stable cross-session ID set at spawn. Present on zone/fixed enemies; absent on arena phase-summons. */
  zoneId?: string;
  /** Retreat timer for retreatAfterHit behavior. */
  retreatTimer: number;
  /** Charge-slam timer for Guardian Phase 2. */
  chargeSlamTimer: number;
  chargeSlamTarget: { x: number; y: number } | null;
  /** Faction this enemy belongs to (e.g. 'undead', 'beast'). Enemies from different factions fight each other. */
  faction: string;
  /** The opposing-faction enemy this enemy is currently targeting (null = target player). */
  factionTarget: Enemy | null;
  /** Seconds until the next faction-target search is allowed. Avoids re-scanning the spatial hash every frame when no candidate is in range. */
  factionTargetSearchTimer: number;
  /** True once the player has attacked this enemy, permanently overriding faction targeting. */
  playerAggroed: boolean;
  /**
   * Current attack variant being telegraphed.
   *
   * Big enemies (golem, sentinel, giant, reaver) pick from extended rosters
   * for souls-like variety: golems can grab or stomp; sentinels uppercut a
   * rising rock slab; giants and reavers commit to dash strikes. The basic
   * 'normal' is the default fast jab kept for trash mobs.
   */
  currentAttackType:
    | 'normal'
    | 'sweep'
    | 'nova'
    | 'combo_sweep'
    | 'combo_finisher'
    | 'hail_mary'
    | 'golem_grab'
    | 'golem_stomp'
    | 'sentinel_slab'
    | 'reaver_rush'
    | 'giant_lunge'
    | 'revenant_crusher'
    | 'revenant_rush'
    | 'revenant_flurry'
    | 'revenant_bladestorm';
  /**
   * When an attack involves a committed dash/lunge during the telegraph,
   * this is the world-space target locked in at telegraph start. Used by
   * giant_lunge / reaver_rush / golem_grab to commit to a strike path the
   * player can sidestep — the heart of souls-like spacing.
   */
  attackLockedTarget: { x: number; y: number } | null;
  /**
   * Seconds remaining where the enemy sprints during chase (movement-only;
   * separate from attack windups). Big enemies trigger short sprint bursts to
   * close gaps less predictably than constant-speed creep.
   */
  sprintBurstTimer: number;
  /** Cooldown before the next sprint burst can fire. */
  sprintCooldown: number;
  /** Timer for the dark nova windup (slamming state). */
  novaSlamTimer: number;
  /** Hollow Apparition phase-local timer, used by rare spectacle attacks. */
  phaseElapsed: number;
  /** Tracks once-per-phase Hollow Eclipse usage. */
  hollowEclipseUsedPhases: Set<number>;
  /** Remaining chained combo hits after a boss attack. */
  comboHitsRemaining: number;
  /** Stable per-enemy seed in [0, 1) used by visual systems for sub-tile jitter, idle bob phase, etc. */
  visualSeed: number;
  /** Consecutive frames where all movement directions were blocked while chasing. Resets on any successful move. */
  stuckFrames: number;
  /** Seconds remaining where chase movement prefers a side-step vector instead of retrying a known blocked line. */
  pathRecoveryTimer: number;
  /** Preferred side for temporary obstacle recovery. Flips when the chosen side is also hard blocked. */
  pathRecoverySide: -1 | 1;
  /** Cooldown for amphibious splash particles when crossing water/shore. */
  waterSplashCooldown: number;
  /** Last sampled water/shore state for amphibious transition effects. */
  lastWaterState: boolean | null;
  /** Seconds remaining while a water slime is hidden below the water surface. */
  waterDiveTimer: number;
  /** Seconds remaining in the water-slime pop-out surfacing animation. */
  waterSurfaceTimer: number;
  /** Cooldown before the next water-slime dive/reposition cycle. */
  waterDiveCooldown: number;
}

function canEnemyMeleeReachPlayer(
  world: World | undefined,
  enemy: Enemy,
  playerPosition: { x: number; y: number },
  playerCombatElevation: number | undefined,
  playerIsClimbing: boolean,
): boolean {
  if (!world) return true;
  if (playerIsClimbing) return false;

  const playerTile = world.getTile(playerPosition.x, playerPosition.y);
  if (!playerTile || PLAYER_LADDER_SAFE_TILE_TYPES.has(playerTile.type)) return false;

  const enemyElevation = world.getElevationAt(enemy.position.x, enemy.position.y);
  const targetElevation = playerCombatElevation ?? world.getElevationAt(playerPosition.x, playerPosition.y);
  if (Math.abs(enemyElevation - targetElevation) > MELEE_ELEVATION_TOLERANCE) return false;

  const dx = playerPosition.x - enemy.position.x;
  const dy = playerPosition.y - enemy.position.y;
  const distance = Math.hypot(dx, dy);
  const steps = Math.max(1, Math.ceil(distance / MELEE_TRACE_STEP));
  for (let i = 1; i < steps; i++) {
    const t = i / steps;
    const sampleTile = world.getTile(enemy.position.x + dx * t, enemy.position.y + dy * t);
    if (!sampleTile || PLAYER_LADDER_SAFE_TILE_TYPES.has(sampleTile.type)) return false;
    if (!sampleTile.walkable && !sampleTile.transition) return false;
    const sampleElevation = sampleTile.elevation ?? 0;
    if (Math.abs(sampleElevation - enemyElevation) > MELEE_ELEVATION_TOLERANCE) return false;
  }

  return true;
}

export interface AttackResult {
  killed: boolean;
  staggered: boolean;
  backstab: boolean;
}

/**
 * Emitted when the player parries any incoming attack (melee, AoE, projectile,
 * hazard). Carries the world-space position the runtime should anchor immersive
 * feedback to (screen shake, particles, hit-stop). No text — purely visual/audio.
 */
export interface ParryFeedbackEvent {
  x: number;
  y: number;
  source: 'melee' | 'aoe' | 'projectile' | 'hazard';
  sourceEnemyId: string | null;
}

/** Enemy-spawned thrown projectile (e.g. Hollow Reaver scythe). Resolves player collision in updateProjectiles. */
export interface Projectile {
  id: string;
  position: { x: number; y: number };
  velocity: { x: number; y: number };
  damage: number;
  lifetime: number;
  maxLifetime: number;
  sourceEnemyId: string;
  sprite: string;
  spinRate: number;
  rotation: number;
  hitRadius: number;
  alive: boolean;
  reflected: boolean;
  reflectedTargetEnemyId?: string;
}

export interface FallingScytheHazard {
  id: string;
  position: { x: number; y: number };
  radius: number;
  damage: number;
  warningTimer: number;
  strikeTimer: number;
  maxWarningTimer: number;
  maxStrikeTimer: number;
  rotation: number;
  spinRate: number;
  state: 'warning' | 'striking';
  alive: boolean;
  hitPlayer: boolean;
  source: 'stillness' | 'eclipse';
}

function removeDeadInPlace<T extends { alive: boolean }>(arr: T[]): void {
  let i = 0;
  let len = arr.length;
  while (i < len) {
    if (!arr[i].alive) {
      arr[i] = arr[--len];
      arr.length = len;
    } else {
      i++;
    }
  }
}

export class CombatSystem {
  private enemies: Enemy[] = [];
  private projectiles: Projectile[] = [];
  private fallingScytheHazards: FallingScytheHazard[] = [];
  private gameState: GameState;
  private _cachedLiveEnemies: Enemy[] = [];
  private _enemiesDirty: boolean = true;
  private spatialHash: SpatialHash<Enemy>;
  /** Monotonic counter for unique enemy ids — replaces the old Date.now()+Math.random() pair that could collide on rapid double-spawns. */
  private _nextEnemyIdSeq: number = 0;
  private _nextProjectileIdSeq: number = 0;
  private _nextFallingScytheIdSeq: number = 0;
  private hollowStillnessTimer: number = 0;
  private hollowLastPlayerPosition: { x: number; y: number } | null = null;
  private hollowStillnessCooldown: number = 0;
  private _scratchQueryResult: Enemy[] = [];

  constructor(gameState: GameState) {
    this.gameState = gameState;
    this.spatialHash = new SpatialHash<Enemy>(4);
  }

  spawnEnemy(
    name: string,
    position: { x: number; y: number },
    health: number,
    damage: number,
    sprite: string,
    options: SpawnEnemyOptions = {}
  ): Enemy {
    const enemy: Enemy = {
      id: `enemy_${++this._nextEnemyIdSeq}`,
      name,
      position: { ...position },
      health,
      maxHealth: health,
      damage,
      xpReward: health * 2,
      essenceReward: options.essenceReward ?? Math.floor(health / 2),
      sprite,
      speed: options.speed ?? 0.04,
      attackRange: options.attackRange ?? 1.5,
      chaseRange: options.chaseRange ?? 6,
      state: 'idle',
      lastAttackTime: 0,
      attackCooldown: 2000,
      damageFlashTimer: 0,
      attackAnimationTimer: 0,
      telegraphTimer: 0,
      telegraphDuration: options.telegraphDuration ?? 0.8,
      recoverTimer: 0,
      recoverDuration: options.recoverDuration ?? 0.6,
      patrolOrigin: { ...position },
      patrolAngle: Math.random() * Math.PI * 2,
      patrolRadius: options.patrolRadius ?? 2 + Math.random() * 2,
      facing: 'down',
      moveCycle: Math.random() * Math.PI * 2,
      moveBlend: 0,
      velocity: { x: 0, y: 0 },
      poise: options.poise ?? 100,
      maxPoise: options.poise ?? 100,
      staggerTimer: 0,
      staggerDuration: options.staggerDuration ?? 1.5,
      poiseRegenTimer: 0,
      attackWindupLockTimer: 0,
      type: sprite.replace('enemy_', ''),
      phase: 1,
      phaseTransitioned: false,
      behaviorOverrides: options.behaviorOverrides ?? {},
      poiseImmunityUsed: false,
      retreatTimer: 0,
      chargeSlamTimer: 0,
      chargeSlamTarget: null,
      faction: options.faction ?? '',
      factionTarget: null,
      factionTargetSearchTimer: 0,
      playerAggroed: false,
      currentAttackType: 'normal',
      novaSlamTimer: 0,
      phaseElapsed: 0,
      hollowEclipseUsedPhases: new Set<number>(),
      comboHitsRemaining: 0,
      visualSeed: Math.random(),
      stuckFrames: 0,
      pathRecoveryTimer: 0,
      pathRecoverySide: Math.random() < 0.5 ? -1 : 1,
      waterSplashCooldown: 0,
      lastWaterState: null,
      waterDiveTimer: 0,
      waterSurfaceTimer: 0,
      waterDiveCooldown: Math.random() * 0.8,
      attackLockedTarget: null,
      sprintBurstTimer: 0,
      sprintCooldown: 0,
      zoneId: options.zoneId,
    };

    if (!isPositionInBonfireSafeZone(this.gameState.currentMap, position.x, position.y)) {
      this.enemies.push(enemy);
      this.spatialHash.insert(enemy);
      this._enemiesDirty = true;
    }
    return enemy;
  }

  getEnemies(): Enemy[] {
    if (this._enemiesDirty) {
      this._cachedLiveEnemies = this.enemies.filter(e => e.state !== 'dead');
      this._enemiesDirty = false;
    }
    return this._cachedLiveEnemies;
  }

  getAllEnemies(): Enemy[] {
    return this.enemies;
  }

  getPerformanceStats(): { liveEnemies: number; totalEnemies: number; projectiles: number; hazards: number } {
    return {
      liveEnemies: this.getEnemies().length,
      totalEnemies: this.enemies.length,
      projectiles: this.projectiles.length,
      hazards: this.fallingScytheHazards.length,
    };
  }

  updateEnemies(
    deltaTime: number,
    playerPosition: { x: number; y: number },
    playerInvulnerable: boolean = false,
    playerBlocking: boolean = false,
    blockStartTime: number = 0,
    world?: World,
    onPhaseChange?: (enemy: Enemy, phase: number) => void,
    stealthDetectionMult: number = 1.0,
    particleSystem?: CombatParticleEmitter,
    playPropBreak?: () => void,
    playerIsClimbing: boolean = false,
    playerCombatElevation: number | undefined = undefined,
  ): { parried: boolean; parryEnemyId: string | null } {
    const updateMovementVisuals = (enemy: Enemy, vx: number, vy: number, moving: boolean, cadence: number) => {
      if (enemy.waterSplashCooldown > 0) {
        enemy.waterSplashCooldown = Math.max(0, enemy.waterSplashCooldown - deltaTime);
      }
      if (world && enemy.behaviorOverrides.splashOnWaterTransition) {
        const nowWater = isWaterSlimeWaterTile(world, enemy.position.x, enemy.position.y);
        if (enemy.lastWaterState === null) {
          enemy.lastWaterState = nowWater;
        } else if (nowWater !== enemy.lastWaterState) {
          enemy.lastWaterState = nowWater;
          emitWaterSlimeSplash(world, enemy, particleSystem, 1.0);
        }
      }
      if (moving) {
        enemy.velocity.x = vx;
        enemy.velocity.y = vy;
        enemy.moveCycle += deltaTime * cadence;
        enemy.moveBlend = Math.min(1, enemy.moveBlend + deltaTime * 5);

        if (Math.abs(vx) > Math.abs(vy)) {
          enemy.facing = vx >= 0 ? 'right' : 'left';
        } else if (Math.abs(vy) > 0.001) {
          enemy.facing = vy >= 0 ? 'up' : 'down';
        }
      } else {
        const damp = Math.max(0, 1 - deltaTime * 8);
        enemy.velocity.x *= damp;
        enemy.velocity.y *= damp;
        enemy.moveBlend = Math.max(0, enemy.moveBlend - deltaTime * 4);
      }
    };

    let parried = false;
    let parryEnemyId: string | null = null;
    const now = performance.now() / 1000;
    const mapId = this.gameState.currentMap;
    const playerInBonfireSanctuary = isPositionInBonfireSafeZone(
      mapId,
      playerPosition.x,
      playerPosition.y,
    );
    if (playerInBonfireSanctuary) {
      playerInvulnerable = true;
    }

    for (const enemy of this.enemies) {
      if (enemy.state === 'dead') continue;

      if (enemy.attackWindupLockTimer > 0) {
        enemy.attackWindupLockTimer = Math.max(0, enemy.attackWindupLockTimer - deltaTime);
      }
      if (enemy.waterSurfaceTimer > 0) {
        enemy.waterSurfaceTimer = Math.max(0, enemy.waterSurfaceTimer - deltaTime);
      }
      if (enemy.waterDiveCooldown > 0) {
        enemy.waterDiveCooldown = Math.max(0, enemy.waterDiveCooldown - deltaTime);
      }
      if (enemy.type === 'water_slime' && enemy.waterDiveTimer > 0) {
        enemy.waterDiveTimer = Math.max(0, enemy.waterDiveTimer - deltaTime);
        updateMovementVisuals(enemy, 0, 0, false, 0);
        if (enemy.waterDiveTimer <= 0 && world) {
          const diveTarget = pickWaterSlimeDiveTarget(world, enemy);
          if (diveTarget) {
            _tmpOldPos.x = enemy.position.x;
            _tmpOldPos.y = enemy.position.y;
            enemy.position.x = diveTarget.x;
            enemy.position.y = diveTarget.y;
            this.updateEnemyHash(enemy, _tmpOldPos);
          }
          enemy.waterSurfaceTimer = WATER_SLIME_SURFACE_DURATION;
          enemy.lastWaterState = true;
          emitWaterSlimeSplash(world, enemy, particleSystem, 1.25);
        }
        continue;
      }
      if (enemy.pathRecoveryTimer > 0) {
        enemy.pathRecoveryTimer = Math.max(0, enemy.pathRecoveryTimer - deltaTime);
      }

      // Dormancy: always measured against the player so the battle only activates on approach.
      const playerDx = playerPosition.x - enemy.position.x;
      const playerDy = playerPosition.y - enemy.position.y;
      const playerDistSq = playerDx * playerDx + playerDy * playerDy;

      if (enemy.state === 'idle' && playerDistSq > DORMANCY_RANGE_SQ) continue;

      if (isPositionInBonfireSafeZone(mapId, enemy.position.x, enemy.position.y)) {
        nudgeEnemyOutOfBonfireSanctuary(enemy, mapId);
        updateMovementVisuals(enemy, 0, 0, false, 0);
        continue;
      }

      // Faction target resolution — find the nearest alive enemy from a different faction.
      // Only runs when the enemy has a faction and the player hasn't aggroed it yet.
      let dx: number;
      let dy: number;
      let distSq: number;

      if (enemy.faction && !enemy.playerAggroed && playerDistSq <= FACTION_FIGHT_WAKE_SQ) {
        // Player is close enough — resolve faction targeting so the fight begins.
        // Throttle the spatial-hash search: once a target is found we keep it
        // until it dies; if none was found we wait factionTargetSearchTimer
        // seconds before scanning again instead of paying the cost every frame.
        if (enemy.factionTargetSearchTimer > 0) {
          enemy.factionTargetSearchTimer -= deltaTime;
        }
        if (
          (!enemy.factionTarget || enemy.factionTarget.state === 'dead') &&
          enemy.factionTargetSearchTimer <= 0
        ) {
          enemy.factionTarget = null;
          const nearby = this.getEnemiesInRange(enemy.position, enemy.chaseRange * 1.5, this._scratchQueryResult);
          let bestDistSq = Infinity;
          for (const candidate of nearby) {
            if (candidate === enemy || candidate.state === 'dead') continue;
            if (!candidate.faction || candidate.faction === enemy.faction) continue;
            const cdx = candidate.position.x - enemy.position.x;
            const cdy = candidate.position.y - enemy.position.y;
            const cDistSq = cdx * cdx + cdy * cdy;
            if (cDistSq < bestDistSq) {
              bestDistSq = cDistSq;
              enemy.factionTarget = candidate;
            }
          }
          // Whether or not we found one, back off for a quarter second before
          // scanning again. A target acquired here will short-circuit the
          // outer `if` on subsequent frames anyway.
          enemy.factionTargetSearchTimer = 0.25;
        }
        if (enemy.factionTarget && enemy.factionTarget.state !== 'dead') {
          dx = enemy.factionTarget.position.x - enemy.position.x;
          dy = enemy.factionTarget.position.y - enemy.position.y;
          distSq = dx * dx + dy * dy;
        } else {
          enemy.factionTarget = null;
          dx = playerDx;
          dy = playerDy;
          distSq = playerDistSq;
        }
      } else {
        // Either no faction, player-aggroed, or player is too far away to trigger faction fight.
        // Clear any stale faction target so the enemy stays in stasis.
        if (!enemy.playerAggroed) enemy.factionTarget = null;
        dx = playerDx;
        dy = playerDy;
        distSq = playerDistSq;
      }

      if (enemy.state !== 'staggered') {
        enemy.poiseRegenTimer += deltaTime;
        if (enemy.poiseRegenTimer >= 2.0) {
          enemy.poise = Math.min(enemy.maxPoise, enemy.poise + enemy.maxPoise * 0.05);
          enemy.poiseRegenTimer = 0;
        }
      }

      if (enemy.type === 'hollow_guardian') {
        enemy.phaseElapsed += deltaTime;
      }

      // Stone Golem phase 2 at 50% HP — cracks appear, becomes faster and more aggressive
      if (enemy.type === 'golem' && !enemy.phaseTransitioned && enemy.health <= enemy.maxHealth * 0.5) {
        enemy.phase = 2;
        enemy.phaseTransitioned = true;
        enemy.speed *= 1.35;
        enemy.telegraphDuration *= 0.8;
        enemy.recoverDuration *= 0.75;
        enemy.damage = Math.round(enemy.damage * 1.2);
        enemy.attackRange *= 1.15;
        // Shorter snare on the cracked golem — still punishing but not as oppressive
        if (enemy.behaviorOverrides.snareDuration) {
          enemy.behaviorOverrides = { ...enemy.behaviorOverrides, snareDuration: 0.5, chainChance: 0.6 };
        }
        if (onPhaseChange) onPhaseChange(enemy, 2);
      }

      // Corrupted Giant enrage at 50% HP — corruption veins rupture, becomes relentless
      if (enemy.type === 'corrupted_giant' && !enemy.phaseTransitioned && enemy.health <= enemy.maxHealth * 0.5) {
        enemy.phase = 2;
        enemy.phaseTransitioned = true;
        enemy.speed *= 1.30;
        enemy.telegraphDuration *= 0.80;
        enemy.recoverDuration *= 0.75;
        enemy.damage = Math.round(enemy.damage * 1.20);
        // Chain chance spikes hard — feels relentless vs the methodical golem cadence
        enemy.behaviorOverrides = { ...enemy.behaviorOverrides, chainChance: 0.75, snareDuration: 0.6 };
        if (onPhaseChange) onPhaseChange(enemy, 2);
      }

      // Phase 2 transition for the Hollow Apparition at 50% HP — gains speed and aggression
      if (enemy.type === 'hollow_guardian' && !enemy.phaseTransitioned && enemy.health <= enemy.maxHealth * 0.5) {
        enemy.phase = 2;
        enemy.phaseTransitioned = true;
        enemy.speed *= 1.4;
        enemy.telegraphDuration *= 0.75;
        enemy.recoverDuration *= 0.7;
        enemy.damage = Math.round(enemy.damage * 1.3);
        enemy.behaviorOverrides = { ...enemy.behaviorOverrides, chainChance: 0.4 };
        enemy.phaseElapsed = 0;
        enemy.comboHitsRemaining = 0;
        if (onPhaseChange) onPhaseChange(enemy, 2);
      }
      // Phase 3 transition at 25% HP — second summon wave, final enrage
      if (enemy.type === 'hollow_guardian' && enemy.phase === 2 && enemy.health <= enemy.maxHealth * 0.25) {
        enemy.phase = 3;
        enemy.speed *= 1.2;
        enemy.telegraphDuration *= 0.85;
        enemy.recoverDuration *= 0.8;
        enemy.damage = Math.round(enemy.damage * 1.15);
        enemy.behaviorOverrides = { ...enemy.behaviorOverrides, chainChance: 0.6 };
        enemy.phaseElapsed = 0;
        enemy.comboHitsRemaining = 0;
        if (onPhaseChange) onPhaseChange(enemy, 3);
      }

      const effectiveChaseRange = enemy.playerAggroed
        ? enemy.chaseRange
        : enemy.chaseRange * stealthDetectionMult;
      const chaseRangeSq = effectiveChaseRange * effectiveChaseRange;
      const attackRangeSq = enemy.attackRange * enemy.attackRange;

      switch (enemy.state) {
        case 'idle': {
          enemy.patrolAngle += deltaTime * 0.5;
          let px = enemy.patrolOrigin.x + Math.cos(enemy.patrolAngle) * enemy.patrolRadius;
          let py = enemy.patrolOrigin.y + Math.sin(enemy.patrolAngle) * enemy.patrolRadius;
          // Skip patrol targets that land on unwalkable tiles so enemies don't hug cliffs
          // or drift off their authored grass pockets.
          if (world && !canWaterSlimeMoveTo(world, enemy, px, py, px, py, 0.15)) {
            px = enemy.patrolOrigin.x;
            py = enemy.patrolOrigin.y;
          }
          if (isPositionInBonfireSafeZone(mapId, px, py)) {
            px = enemy.patrolOrigin.x;
            py = enemy.patrolOrigin.y;
          }
          const pdx = px - enemy.position.x;
          const pdy = py - enemy.position.y;
          const pdistSq = pdx * pdx + pdy * pdy;

          if (pdistSq > 0.01) {
            _tmpOldPos.x = enemy.position.x;
            _tmpOldPos.y = enemy.position.y;
            const pdist = Math.sqrt(pdistSq);
            const grassMult = world && world.getTile(enemy.position.x, enemy.position.y)?.type === 'tall_grass' ? TALL_GRASS_SLOW : 1;
            const moveSpeed = enemy.speed * 0.4 * grassMult * deltaTime * 60;
            const nvx = pdx / pdist;
            const nvy = pdy / pdist;
            const nextX = enemy.position.x + nvx * moveSpeed;
            const nextY = enemy.position.y + nvy * moveSpeed;
            if (!world) {
              enemy.position.x = nextX;
              enemy.position.y = nextY;
              this.updateEnemyHash(enemy, _tmpOldPos);
              updateMovementVisuals(enemy, nvx, nvy, true, 7);
            } else {
              const step = trySlideEnemyMove(
                world,
                enemy.position.x,
                enemy.position.y,
                nextX,
                nextY,
                0.15,
                (fromX, fromY, toX, toY, radius) => canWaterSlimeMoveTo(world, enemy, fromX, fromY, toX, toY, radius),
              );
              if (step.moved) {
                enemy.position.x = step.x;
                enemy.position.y = step.y;
                this.updateEnemyHash(enemy, _tmpOldPos);
                updateMovementVisuals(enemy, step.vx, step.vy, true, 7);
              } else {
                updateMovementVisuals(enemy, 0, 0, false, 0);
              }
            }
          } else {
            updateMovementVisuals(enemy, 0, 0, false, 0);
          }

          // Start chasing if target is in range. For faction enemies, also engage immediately
          // when a faction target has been detected (regardless of exact distance).
          if (
            !playerInBonfireSanctuary &&
            (distSq <= chaseRangeSq || enemy.factionTarget !== null)
          ) {
            enemy.state = 'chasing';
          }
          break;
        }

        case 'chasing': {
          if (playerInBonfireSanctuary) {
            enemy.state = 'idle';
            enemy.playerAggroed = false;
            enemy.factionTarget = null;
            enemy.attackLockedTarget = null;
            updateMovementVisuals(enemy, 0, 0, false, 0);
            break;
          }
          const leashRangeSq = chaseRangeSq * 2.25;
          if (distSq > leashRangeSq) {
            enemy.state = 'idle';
            updateMovementVisuals(enemy, 0, 0, false, 0);
            break;
          }

          const bo = enemy.behaviorOverrides;
          if (bo.amphibiousWaterLeash) {
            const shoreLimit = (bo.waterShoreRadius ?? 8) + 2;
            const hdx = playerPosition.x - enemy.patrolOrigin.x;
            const hdy = playerPosition.y - enemy.patrolOrigin.y;
            if (hdx * hdx + hdy * hdy > shoreLimit * shoreLimit) {
              enemy.state = 'idle';
              updateMovementVisuals(enemy, 0, 0, false, 0);
              break;
            }
          }
          if (bo.rangedAttack && enemy.attackWindupLockTimer <= 0) {
            const rangedRange = bo.rangedRange ?? 3.0;
            if (distSq > attackRangeSq && distSq <= rangedRange * rangedRange * 4 &&
                Math.random() < (bo.rangedChance ?? 0.5) * deltaTime * 2) {
              enemy.state = 'telegraphing';
              enemy.telegraphTimer = enemy.telegraphDuration * 0.8;
              triggerWaterSlimeSurface(world, enemy, particleSystem);
              updateMovementVisuals(enemy, 0, 0, false, 0);
              break;
            }
          }

          const isBigType = enemy.type === 'golem' || enemy.type === 'stone_sentinel'
            || enemy.type === 'corrupted_giant' || enemy.type === 'ashen_reaver'
            || enemy.type === 'ridge_revenant';

          // Big-enemy mid-range commitment: when not yet in melee range, sometimes
          // commit to a long-windup attack (lunge/slab/stomp) telegraphed from
          // outside attack range — locks the strike point so a sidestep beats it.
          if (isBigType && enemy.attackWindupLockTimer <= 0 && distSq > attackRangeSq
              && distSq <= attackRangeSq * 4) {
            // Per-frame chance accumulates over time; ~25% per second at mid range.
            if (Math.random() < 0.42 * deltaTime) {
              enemy.currentAttackType = pickBigEnemyAttackType(enemy, distSq, attackRangeSq);
              if (enemy.currentAttackType === 'giant_lunge' ||
                  enemy.currentAttackType === 'reaver_rush' ||
                  enemy.currentAttackType === 'golem_grab' ||
                  enemy.currentAttackType === 'sentinel_slab' ||
                  enemy.currentAttackType === 'golem_stomp' ||
                  enemy.currentAttackType === 'revenant_crusher' ||
                  enemy.currentAttackType === 'revenant_rush' ||
                  enemy.currentAttackType === 'revenant_bladestorm') {
                enemy.attackLockedTarget = { x: playerPosition.x, y: playerPosition.y };
                enemy.state = 'telegraphing';
                setVariableTelegraph(enemy, enemy.telegraphDuration);
                if (enemy.currentAttackType === 'revenant_crusher') {
                  enemy.telegraphTimer *= 1.5;
                } else if (enemy.currentAttackType === 'revenant_bladestorm') {
                  // A deliberate cast: the array materializes behind the wraith
                  // before it sweeps its hand to release the storm.
                  enemy.telegraphTimer *= 1.35;
                }
                updateMovementVisuals(enemy, 0, 0, false, 0);
                break;
              }
              // Fell through to 'normal' — keep chasing.
              enemy.currentAttackType = 'normal';
            }
          }

          if (
            distSq <= attackRangeSq &&
            canEnemyMeleeReachPlayer(world, enemy, playerPosition, playerCombatElevation, playerIsClimbing)
          ) {
            if (enemy.attackWindupLockTimer > 0) {
              updateMovementVisuals(enemy, 0, 0, false, 0);
              break;
            }
            enemy.state = 'telegraphing';
            // Big enemies pick from their roster; trash mobs stay on 'normal'
            // (so wolves and bandits aren't doing slab attacks).
            if (isBigType) {
              enemy.currentAttackType = pickBigEnemyAttackType(enemy, distSq, attackRangeSq);
              if (enemy.currentAttackType !== 'normal') {
                enemy.attackLockedTarget = { x: playerPosition.x, y: playerPosition.y };
              }
              if (enemy.currentAttackType === 'revenant_flurry') {
                enemy.comboHitsRemaining = 2;
              }
            }
            setVariableTelegraph(enemy, enemy.telegraphDuration);
            if (enemy.currentAttackType === 'revenant_crusher') {
              enemy.telegraphTimer *= 1.5;
            } else if (enemy.currentAttackType === 'revenant_flurry') {
              enemy.telegraphTimer *= 0.6;
            } else if (enemy.currentAttackType === 'revenant_bladestorm') {
              enemy.telegraphTimer *= 1.35;
            }
            updateMovementVisuals(enemy, 0, 0, false, 0);
            break;
          }

          // Sprint-burst reposition — short aggressive dash for big enemies.
          // Fires occasionally when player is mid-range and the cooldown is
          // ready, giving the chase a non-uniform "the boss noticed you stepped
          // back" feel.
          if (enemy.sprintCooldown > 0) {
            enemy.sprintCooldown = Math.max(0, enemy.sprintCooldown - deltaTime);
          }
          if (enemy.sprintBurstTimer > 0) {
            enemy.sprintBurstTimer = Math.max(0, enemy.sprintBurstTimer - deltaTime);
          } else if (isBigType && enemy.sprintCooldown <= 0
              && distSq > attackRangeSq && distSq <= attackRangeSq * 6
              && Math.random() < 0.55 * deltaTime) {
            enemy.sprintBurstTimer = 0.45 + Math.random() * 0.25;
            enemy.sprintCooldown = 2.2 + Math.random() * 1.8;
          }

          if (distSq > 0) {
            _tmpOldPos.x = enemy.position.x;
            _tmpOldPos.y = enemy.position.y;
            const dist = Math.sqrt(distSq);
            const sprintMult = enemy.sprintBurstTimer > 0 ? 2.4 : 1.0;
            // Tall grass slows everything that wades through it, enemies included.
            const grassMult = world && world.getTile(enemy.position.x, enemy.position.y)?.type === 'tall_grass' ? TALL_GRASS_SLOW : 1;
            const moveSpeed = enemy.speed * sprintMult * grassMult * deltaTime * 60;
            const nvx = dx / dist;
            const nvy = dy / dist;
            const nextX = enemy.position.x + nvx * moveSpeed;
            const nextY = enemy.position.y + nvy * moveSpeed;
            if (!world) {
              enemy.position.x = nextX;
              enemy.position.y = nextY;
              this.updateEnemyHash(enemy, _tmpOldPos);
              updateMovementVisuals(enemy, nvx, nvy, true, sprintMult > 1 ? 16 : 10);
            } else {
              const step = tryEnemyChaseMove(world, enemy, nvx, nvy, moveSpeed, ENEMY_MOVE_RADIUS);
              if (step.moved) {
                enemy.stuckFrames = 0;
                enemy.pathRecoveryTimer = step.usedRecovery
                  ? Math.max(enemy.pathRecoveryTimer, ENEMY_PATH_RECOVERY_DURATION)
                  : 0;
                enemy.position.x = step.x;
                enemy.position.y = step.y;
                this.updateEnemyHash(enemy, _tmpOldPos);
                updateMovementVisuals(enemy, step.vx, step.vy, true, sprintMult > 1 ? 16 : 10);
              } else {
                enemy.stuckFrames++;
                if (enemy.stuckFrames >= ENEMY_STUCK_FRAME_LIMIT) {
                  const wasRecoveringPath = enemy.pathRecoveryTimer > 0;
                  enemy.stuckFrames = 0;
                  enemy.pathRecoverySide = enemy.pathRecoverySide === 1 ? -1 : 1;
                  enemy.pathRecoveryTimer = ENEMY_PATH_RECOVERY_DURATION;
                  if (wasRecoveringPath) {
                    enemy.state = 'recovering';
                    enemy.recoverTimer = 0.25 + Math.random() * 0.2;
                  }
                }
                updateMovementVisuals(enemy, 0, 0, false, 0);
              }
            }
          } else {
            updateMovementVisuals(enemy, 0, 0, false, 0);
          }
          break;
        }

        case 'telegraphing': {
          if (playerInBonfireSanctuary) {
            enemy.state = 'idle';
            enemy.playerAggroed = false;
            enemy.attackLockedTarget = null;
            updateMovementVisuals(enemy, 0, 0, false, 0);
            break;
          }
          enemy.telegraphTimer -= deltaTime;

          // Mid-telegraph dash for committed attacks — the enemy actually moves
          // during the windup so a sidestep beats the strike. This is what makes
          // big enemies READ as souls-like: they're chasing you DURING the wind-up,
          // and your job is to read the lock point and step off it.
          const dashType = enemy.currentAttackType;
          const isCommittedDash =
            dashType === 'giant_lunge' ||
            dashType === 'reaver_rush' ||
            dashType === 'golem_grab' ||
            dashType === 'revenant_rush';
          if (isCommittedDash && enemy.attackLockedTarget) {
            const t = enemy.attackLockedTarget;
            const ldx = t.x - enemy.position.x;
            const ldy = t.y - enemy.position.y;
            const ldist = Math.hypot(ldx, ldy);
            if (ldist > 0.05) {
              const dashSpeed = dashTileSpeedFor(enemy) * deltaTime;
              const stepMag = Math.min(dashSpeed, ldist);
              const dvx = ldx / ldist;
              const dvy = ldy / ldist;
              const dashNextX = enemy.position.x + dvx * stepMag;
              const dashNextY = enemy.position.y + dvy * stepMag;
              _tmpOldPos.x = enemy.position.x;
              _tmpOldPos.y = enemy.position.y;
              if (!world) {
                enemy.position.x = dashNextX;
                enemy.position.y = dashNextY;
                this.updateEnemyHash(enemy, _tmpOldPos);
              } else {
                const step = trySlideEnemyMove(world, enemy.position.x, enemy.position.y, dashNextX, dashNextY, ENEMY_MOVE_RADIUS);
                if (step.moved) {
                  enemy.position.x = step.x;
                  enemy.position.y = step.y;
                  this.updateEnemyHash(enemy, _tmpOldPos);
                }
              }
              updateMovementVisuals(enemy, dvx, dvy, true, 18);
            } else {
              updateMovementVisuals(enemy, 0, 0, false, 0);
            }
          } else {
            updateMovementVisuals(enemy, 0, 0, false, 0);
          }

          if (enemy.telegraphTimer <= 0) {
            const isSweep = enemy.currentAttackType === 'sweep' || enemy.currentAttackType === 'combo_sweep';
            const isComboFinisher = enemy.currentAttackType === 'combo_finisher';
            const isGolemGrab = enemy.currentAttackType === 'golem_grab';
            const isGolemStomp = enemy.currentAttackType === 'golem_stomp';
            const isSentinelSlab = enemy.currentAttackType === 'sentinel_slab';
            const isGiantLunge = enemy.currentAttackType === 'giant_lunge';
            const isReaverRush = enemy.currentAttackType === 'reaver_rush';
            const isRevenantCrusher = enemy.currentAttackType === 'revenant_crusher';
            const isRevenantRush = enemy.currentAttackType === 'revenant_rush';
            const isRevenantFlurry = enemy.currentAttackType === 'revenant_flurry';
            const isRevenantBladestorm = enemy.currentAttackType === 'revenant_bladestorm';
            const rangeMult = isSweep ? 3.0 : 1.69;
            const extAttackRangeSq = attackRangeSq * rangeMult;

            const savedDamage = enemy.damage;
            if (isSweep) enemy.damage = Math.floor(enemy.damage * 0.7);

            const eBo = enemy.behaviorOverrides;
            // Ranged projectile path — release a thrown blade aimed at the player's current position.
            // Skip the melee damage check entirely; the projectile resolves its own hit in updateProjectiles.
            const rangedDistSq = distSq;
            const rangedMaxSq = (eBo.rangedRange ?? 3.0) * (eBo.rangedRange ?? 3.0) * 4;
            if (isGolemStomp) {
              // Stone Golem stomp — wide AoE around the golem's feet. Cracks
              // tiles like the nova slam, knocks the player back hard, and is
              // fully parryable via applyAreaHitToPlayer.
              const stompRadius = 2.6;
              if (world && particleSystem) {
                breakTilesInRadius(world, world.getCurrentMap(), enemy.position.x, enemy.position.y, stompRadius, particleSystem, playPropBreak);
              }
              const sdx = playerPosition.x - enemy.position.x;
              const sdy = playerPosition.y - enemy.position.y;
              if (sdx * sdx + sdy * sdy <= stompRadius * stompRadius && !playerInvulnerable) {
                const result = this.applyAreaHitToPlayer(
                  Math.floor(enemy.damage * 1.1),
                  playerBlocking, blockStartTime, now, enemy,
                  6.5, // strong outward push
                );
                if (result.parried) { parried = true; parryEnemyId = enemy.id; }
              }
            } else if (isGolemGrab) {
              // Stone Golem grab — tighter range than stomp but very high damage,
              // and the dash during telegraph already closed the gap. On connect:
              // snare the player AND launch them backward like the grip was
              // ripped off them.
              const grabRadius = 1.4;
              const gdx = playerPosition.x - enemy.position.x;
              const gdy = playerPosition.y - enemy.position.y;
              if (gdx * gdx + gdy * gdy <= grabRadius * grabRadius && !playerInvulnerable) {
                const result = this.applyAreaHitToPlayer(
                  Math.floor(enemy.damage * 1.6),
                  playerBlocking, blockStartTime, now, enemy,
                  5.5,
                );
                if (result.parried) {
                  parried = true; parryEnemyId = enemy.id;
                } else if (!playerBlocking) {
                  // Unblocked grab roots you for a moment as the golem releases.
                  this.gameState.player.snareTimer = Math.max(this.gameState.player.snareTimer, 0.9);
                  this.gameState.player.snareSpeedMult = 0.45;
                }
              }
            } else if (isSentinelSlab) {
              // Stone Sentinel slab — the sentinel slams its fist down and a
              // rising rock pillar erupts at the locked target tile. Lethal if
              // you don't sidestep the lock point during the windup. Big
              // outward knockback on connect.
              const target = enemy.attackLockedTarget ?? playerPosition;
              const slabRadius = 1.1;
              if (world && particleSystem) {
                breakTilesInRadius(world, world.getCurrentMap(), target.x, target.y, slabRadius * 0.9, particleSystem, playPropBreak);
              }
              const sldx = playerPosition.x - target.x;
              const sldy = playerPosition.y - target.y;
              if (sldx * sldx + sldy * sldy <= slabRadius * slabRadius && !playerInvulnerable) {
                // Push is from the slab origin (the locked target), not the
                // enemy, so the player gets shoved off the impact tile.
                const player = this.gameState.player;
                const isParry = playerBlocking && (now - blockStartTime) < PARRY_WINDOW;
                if (isParry) {
                  enemy.state = 'staggered';
                  enemy.staggerTimer = enemy.staggerDuration;
                  enemy.damageFlashTimer = enemy.staggerDuration;
                  player.parryBonusTimer = 1.0;
                  player.iFrameTimer = Math.max(player.iFrameTimer, 0.5);
                  parried = true; parryEnemyId = enemy.id;
                } else {
                  let dmg = Math.floor(enemy.damage * 1.35);
                  if (playerBlocking && player.guardBrokenTimer <= 0) {
                    player.stamina -= dmg * 0.8;
                    if (player.stamina <= 0) {
                      player.stamina = 0;
                      player.guardBrokenTimer = 1.2;
                    }
                    dmg = Math.floor(dmg * (1 - BLOCK_DAMAGE_REDUCTION));
                  }
                  player.health = Math.max(0, player.health - dmg);
                  player.damageFlashTimer = 0.4;
                  player.hurtTimer = Math.max(player.hurtTimer, 0.35);
                  player.iFrameTimer = Math.max(player.iFrameTimer, 0.35);
                  const kbMag = playerBlocking ? 4.5 : 7.5;
                  this.applyKnockbackFromSource(target.x, target.y, kbMag);
                }
              }
            } else if (isGiantLunge || isReaverRush) {
              // Giant lunge + Reaver rush — committed dash strikes that the
              // mid-telegraph movement already advanced. Resolve a wide front
              // arc at the enemy's current position with extra reach.
              const reach = isReaverRush ? 2.0 : 2.2;
              const reachSq = reach * reach;
              const ldx = playerPosition.x - enemy.position.x;
              const ldy = playerPosition.y - enemy.position.y;
              if (ldx * ldx + ldy * ldy <= reachSq && !playerInvulnerable) {
                const result = this.applyAreaHitToPlayer(
                  Math.floor(enemy.damage * (isReaverRush ? 1.45 : 1.3)),
                  playerBlocking, blockStartTime, now, enemy,
                  isReaverRush ? 5.0 : 4.5,
                );
                if (result.parried) { parried = true; parryEnemyId = enemy.id; }
              }
            } else if (isRevenantCrusher) {
              // Ridge Revenant overhead crusher — wide shockwave, unblockable.
              // Must out-space; short swords cannot poke safely from inside the radius.
              const crushRadius = 3.0;
              const crushCenter = enemy.attackLockedTarget ?? enemy.position;
              if (world && particleSystem) {
                breakTilesInRadius(world, world.getCurrentMap(), crushCenter.x, crushCenter.y, crushRadius * 0.85, particleSystem, playPropBreak);
              }
              const cdx = playerPosition.x - crushCenter.x;
              const cdy = playerPosition.y - crushCenter.y;
              if (cdx * cdx + cdy * cdy <= crushRadius * crushRadius && !playerInvulnerable) {
                const player = this.gameState.player;
                const crushDmg = Math.floor(enemy.damage * 1.45);
                player.health = Math.max(0, player.health - crushDmg);
                player.damageFlashTimer = 0.5;
                player.hurtTimer = Math.max(player.hurtTimer, 0.45);
                player.iFrameTimer = Math.max(player.iFrameTimer, 0.4);
                player.stamina = Math.max(0, player.stamina - 35);
                if (player.stamina <= 0) player.guardBrokenTimer = 1.2;
                this.applyKnockbackFromSource(crushCenter.x, crushCenter.y, 8.0);
              }
            } else if (isRevenantRush) {
              // Ridge Revenant gap-closer — snaring grab after the dash commits.
              const rushRadius = 1.6;
              const rdx = playerPosition.x - enemy.position.x;
              const rdy = playerPosition.y - enemy.position.y;
              if (rdx * rdx + rdy * rdy <= rushRadius * rushRadius && !playerInvulnerable) {
                const result = this.applyAreaHitToPlayer(
                  Math.floor(enemy.damage * 1.25),
                  playerBlocking, blockStartTime, now, enemy,
                  6.0,
                );
                if (result.parried) {
                  parried = true; parryEnemyId = enemy.id;
                } else if (!playerBlocking) {
                  this.gameState.player.snareTimer = Math.max(this.gameState.player.snareTimer, 1.1);
                  this.gameState.player.snareSpeedMult = 0.3;
                }
              }
            } else if (isRevenantBladestorm) {
              // Spectral Blade Array — the wraith sweeps its hand and the summoned
              // blades behind it launch as a wide fan aimed at the player. Each blade
              // does modest damage; the threat is the spread, which forces a clean
              // dodge or a parry of an individual blade. Parried blades reflect.
              // The outer fan is locked to the telegraph target (sidestep-the-lock play),
              // but the inner blades RE-AIM at the player's live position at release, so
              // backpedalling or strafing during the cast no longer dodges the whole storm.
              const lockedAngle = Math.atan2(
                (enemy.attackLockedTarget ?? playerPosition).y - enemy.position.y,
                (enemy.attackLockedTarget ?? playerPosition).x - enemy.position.x,
              );
              const liveAngle = Math.atan2(
                playerPosition.y - enemy.position.y,
                playerPosition.x - enemy.position.x,
              );
              const bladeCount = 9;
              const fanSpread = (80 * Math.PI) / 180;
              const bladeSpeed = 7.8;
              const bladeDamage = Math.max(8, Math.floor(enemy.damage * 0.45));
              const liveAimBand = 2; // the central |b - center| <= this re-aim at the player
              const center = (bladeCount - 1) / 2;
              for (let b = 0; b < bladeCount; b++) {
                const offset = -fanSpread / 2 + (fanSpread * b) / (bladeCount - 1);
                // Inner blades track the player live; outer blades stay on the locked fan.
                const isInner = Math.abs(b - center) <= liveAimBand;
                const angle = (isInner ? liveAngle : lockedAngle) + offset * (isInner ? 0.5 : 1);
                // Slight per-blade speed variance so the fan arrives as a ripple
                // rather than a single flat wall.
                const speed = bladeSpeed * (0.9 + 0.06 * (b % 3));
                const blade = this.spawnProjectile({
                  position: { x: enemy.position.x, y: enemy.position.y },
                  velocity: { x: Math.cos(angle) * speed, y: Math.sin(angle) * speed },
                  damage: bladeDamage,
                  sprite: 'projectile_spectral_blade',
                  lifetime: 1.7,
                  sourceEnemyId: enemy.id,
                  hitRadius: 0.34,
                  spinRate: 0,
                });
                // The blade sprite points along +X; lock its rotation to the travel
                // angle so the tip always leads (spinRate 0 keeps it fixed).
                blade.rotation = angle;
              }
            } else if (isRevenantFlurry) {
              const flurryReach = enemy.attackRange * 1.35;
              const flurryReachSq = flurryReach * flurryReach;
              const fdx = playerPosition.x - enemy.position.x;
              const fdy = playerPosition.y - enemy.position.y;
              if (fdx * fdx + fdy * fdy <= flurryReachSq && !playerInvulnerable
                && canEnemyMeleeReachPlayer(world, enemy, playerPosition, playerCombatElevation, playerIsClimbing)) {
                const result = this.attackPlayer(enemy, playerBlocking, blockStartTime, now);
                if (result.parried) {
                  parried = true;
                  parryEnemyId = enemy.id;
                } else if (!playerBlocking) {
                  // Extra guard-break pressure on the flurry line.
                  this.gameState.player.stamina = Math.max(0, this.gameState.player.stamina - 18);
                  if (this.gameState.player.stamina <= 0) {
                    this.gameState.player.guardBrokenTimer = 1.3;
                  }
                }
              }
            } else if (isComboFinisher) {
              const finisherRadius = 2.0;
              if (world && particleSystem) {
                breakTilesInRadius(world, world.getCurrentMap(), enemy.position.x, enemy.position.y, finisherRadius, particleSystem, playPropBreak);
              }
              const finisherDx = playerPosition.x - enemy.position.x;
              const finisherDy = playerPosition.y - enemy.position.y;
              const finisherDistSq = finisherDx * finisherDx + finisherDy * finisherDy;
              if (finisherDistSq <= finisherRadius * finisherRadius && !playerInvulnerable) {
                const result = this.applyAreaHitToPlayer(
                  Math.floor(enemy.damage * 1.25),
                  playerBlocking,
                  blockStartTime,
                  now,
                  enemy,
                );
                if (result.parried) {
                  parried = true;
                  parryEnemyId = enemy.id;
                }
              }
            } else if (eBo.rangedAttack && eBo.rangedProjectile && rangedDistSq > attackRangeSq && rangedDistSq <= rangedMaxSq) {
              const dxP = playerPosition.x - enemy.position.x;
              const dyP = playerPosition.y - enemy.position.y;
              const speed = eBo.rangedProjectileSpeed ?? 6.0;
              const projectileSprite = eBo.rangedProjectileSprite ?? 'projectile_scythe';
              // Fan a volley of N blades centered on the aim direction (Bladestorm). A single
              // shot (count<=1) keeps the original straight-line behavior.
              const volleyCount = Math.max(1, eBo.rangedVolleyCount ?? 1);
              const baseAngle = Math.atan2(dyP, dxP);
              const spread = ((eBo.rangedVolleySpreadDeg ?? 0) * Math.PI) / 180;
              for (let v = 0; v < volleyCount; v++) {
                const offset = volleyCount > 1
                  ? -spread / 2 + (spread * v) / (volleyCount - 1)
                  : 0;
                const angle = baseAngle + offset;
                this.spawnProjectile({
                  position: { x: enemy.position.x, y: enemy.position.y },
                  velocity: { x: Math.cos(angle) * speed, y: Math.sin(angle) * speed },
                  damage: enemy.damage,
                  sprite: projectileSprite,
                  lifetime: eBo.rangedProjectileLifetime ?? 1.4,
                  sourceEnemyId: enemy.id,
                  hitRadius: projectileSprite === 'projectile_shell' ? 0.32 : undefined,
                  spinRate: projectileSprite === 'projectile_shell' ? 8 : undefined,
                });
              }
              if (enemy.type === 'water_slime' && world && isWaterSlimeWaterTile(world, enemy.position.x, enemy.position.y)) {
                enemy.waterDiveCooldown = Math.min(enemy.waterDiveCooldown, 0.05);
              }
            } else if (enemy.factionTarget && enemy.factionTarget.state !== 'dead') {
              const ftDx = enemy.factionTarget.position.x - enemy.position.x;
              const ftDy = enemy.factionTarget.position.y - enemy.position.y;
              const ftDistSq = ftDx * ftDx + ftDy * ftDy;
              if (ftDistSq <= extAttackRangeSq) {
                this.enemyAttackEnemy(enemy, enemy.factionTarget);
              }
            } else {
              const newDx = playerPosition.x - enemy.position.x;
              const newDy = playerPosition.y - enemy.position.y;
              const newDistSq = newDx * newDx + newDy * newDy;
              if (newDistSq <= extAttackRangeSq && !playerInvulnerable
                && canEnemyMeleeReachPlayer(world, enemy, playerPosition, playerCombatElevation, playerIsClimbing)) {
                const result = this.attackPlayer(enemy, playerBlocking, blockStartTime, now);
                if (result.parried) {
                  parried = true;
                  parryEnemyId = enemy.id;
                }
              }
            }

            enemy.damage = savedDamage;
            enemy.currentAttackType = 'normal';
            enemy.attackLockedTarget = null;
            // Committed dash attacks get a longer recover (they overshot or
            // pulled off a heavy move) so the player has a real punish window.
            const dashOvercommit = isGolemGrab || isGolemStomp || isSentinelSlab
              || isGiantLunge || isReaverRush || isRevenantCrusher || isRevenantRush;
            enemy.state = 'recovering';
            enemy.recoverTimer = dashOvercommit
              ? enemy.recoverDuration * 1.6
              : enemy.recoverDuration;
            enemy.attackAnimationTimer = dashOvercommit ? 0.45 : 0.3;
          }
          break;
        }

        case 'attacking': {
          if (playerInBonfireSanctuary) {
            enemy.state = 'idle';
            enemy.playerAggroed = false;
            enemy.attackLockedTarget = null;
            updateMovementVisuals(enemy, 0, 0, false, 0);
            break;
          }
          enemy.state = 'recovering';
          enemy.recoverTimer = enemy.recoverDuration;
          updateMovementVisuals(enemy, 0, 0, false, 0);
          break;
        }

        case 'recovering': {
          if (playerInBonfireSanctuary) {
            enemy.state = 'idle';
            enemy.playerAggroed = false;
            enemy.attackLockedTarget = null;
            updateMovementVisuals(enemy, 0, 0, false, 0);
            break;
          }
          enemy.recoverTimer -= deltaTime;
          updateMovementVisuals(enemy, 0, 0, false, 0);
          if (enemy.recoverTimer <= 0) {
            const bo = enemy.behaviorOverrides;

            if (enemy.type === 'water_slime' && enemy.waterDiveCooldown <= 0 && beginWaterSlimeDive(world, enemy, particleSystem)) {
              break;
            }

            if (enemy.type === 'hollow_guardian') {
              if (enemy.comboHitsRemaining > 0 && distSq <= attackRangeSq * 2.75) {
                enemy.state = 'telegraphing';
                enemy.currentAttackType = enemy.phase >= 3 && enemy.comboHitsRemaining === 1
                  ? 'combo_finisher'
                  : 'combo_sweep';
                enemy.telegraphTimer = enemy.currentAttackType === 'combo_finisher' ? 0.55 : 0.5;
                enemy.comboHitsRemaining--;
                break;
              }

              if (
                enemy.phaseElapsed >= HOLLOW_ECLIPSE_PHASE_DELAY &&
                !enemy.hollowEclipseUsedPhases.has(enemy.phase) &&
                Math.random() < HOLLOW_ECLIPSE_CHANCE
              ) {
                enemy.hollowEclipseUsedPhases.add(enemy.phase);
                enemy.state = 'slamming';
                enemy.currentAttackType = 'hail_mary';
                enemy.novaSlamTimer = HOLLOW_ECLIPSE_TELEGRAPH;
                enemy.attackAnimationTimer = 0.5;
                break;
              }
            }

            if (enemy.type === 'hollow_guardian' && enemy.phase >= 2 &&
                distSq <= attackRangeSq * 2.25) {
              const isP3 = enemy.phase === 3;
              const roll = Math.random();

              // Dark nova if player is point-blank
              const novaThreshold = isP3 ? 0.35 : 0.25;
              if (distSq <= 1.5 * 1.5 && roll < novaThreshold) {
                enemy.state = 'slamming';
                enemy.novaSlamTimer = 0.5;
                enemy.currentAttackType = 'nova';
                break;
              }

              // Charge slam
              const chargeChance = isP3 ? 0.30 : 0.20;
              if (roll < chargeChance + novaThreshold) {
                enemy.state = 'charging';
                enemy.chargeSlamTimer = 0.6;
                enemy.chargeSlamTarget = { x: playerPosition.x, y: playerPosition.y };
                break;
              }

              // Sweep telegraph
              const sweepChance = isP3 ? 0.25 : 0.20;
              if (roll < chargeChance + novaThreshold + sweepChance) {
                enemy.state = 'telegraphing';
                enemy.currentAttackType = 'sweep';
                enemy.telegraphTimer = isP3 ? 0.6 : 0.7;
                break;
              }

              const comboChance = isP3 ? 0.35 : 0.28;
              if (roll < chargeChance + novaThreshold + sweepChance + comboChance) {
                enemy.state = 'telegraphing';
                enemy.currentAttackType = 'combo_sweep';
                enemy.telegraphTimer = isP3 ? 0.5 : 0.55;
                enemy.comboHitsRemaining = isP3 ? 1 : 0;
                break;
              }

              // Chain telegraph
              const chainChance = isP3 ? 0.6 : 0.4;
              if (Math.random() < chainChance) {
                enemy.state = 'telegraphing';
                enemy.telegraphTimer = bo.chainTelegraph ?? enemy.telegraphDuration * 0.5;
                break;
              }

              enemy.state = 'chasing';
              break;
            }

            if (enemy.type === 'ridge_revenant') {
              if (enemy.comboHitsRemaining > 0 && distSq <= attackRangeSq * 2.75) {
                enemy.state = 'telegraphing';
                enemy.currentAttackType = 'revenant_flurry';
                enemy.telegraphTimer = 0.32;
                enemy.comboHitsRemaining--;
                break;
              }
            }

            if (bo.retreatAfterHit && enemy.attackAnimationTimer > 0) {
              enemy.state = 'retreating';
              enemy.retreatTimer = bo.retreatDuration ?? 1.0;
              break;
            }
            if (bo.chainAttack && distSq <= attackRangeSq * 2.25 &&
                Math.random() < (bo.chainChance ?? 0.3)) {
              enemy.state = 'telegraphing';
              enemy.telegraphTimer = bo.chainTelegraph ?? enemy.telegraphDuration * 0.5;
            } else {
              enemy.state = distSq <= chaseRangeSq ? 'chasing' : 'idle';
            }
          }
          break;
        }

        case 'slamming': {
          enemy.novaSlamTimer -= deltaTime;
          updateMovementVisuals(enemy, 0, 0, false, 0);
          if (enemy.novaSlamTimer <= 0) {
            if (enemy.currentAttackType === 'hail_mary') {
              this.spawnHollowEclipseHazards(enemy);
              enemy.currentAttackType = 'normal';
              enemy.state = 'recovering';
              enemy.recoverTimer = enemy.recoverDuration * 2.0;
              enemy.attackAnimationTimer = 0.5;
              break;
            }

            const novaRadius = 3.0;
            if (world && particleSystem) {
              breakTilesInRadius(world, world.getCurrentMap(), enemy.position.x, enemy.position.y, novaRadius, particleSystem, playPropBreak);
            }
            const novaDx = playerPosition.x - enemy.position.x;
            const novaDy = playerPosition.y - enemy.position.y;
            const novaDistSq = novaDx * novaDx + novaDy * novaDy;
            if (novaDistSq <= novaRadius * novaRadius && !playerInvulnerable) {
              const novaDamage = Math.floor(enemy.damage * 1.5);
              const novaResult = this.applyAreaHitToPlayer(novaDamage, playerBlocking, blockStartTime, now, enemy);
              if (novaResult.parried) {
                parried = true;
                parryEnemyId = enemy.id;
              }
            }
            enemy.currentAttackType = 'normal';
            enemy.state = 'recovering';
            enemy.recoverTimer = enemy.recoverDuration * 1.8;
            enemy.attackAnimationTimer = 0.4;
          }
          break;
        }

        case 'retreating': {
          enemy.retreatTimer -= deltaTime;
          if (enemy.retreatTimer <= 0) {
            enemy.state = distSq <= chaseRangeSq ? 'chasing' : 'idle';
            updateMovementVisuals(enemy, 0, 0, false, 0);
            break;
          }
          const bo = enemy.behaviorOverrides;
          const retreatSpeed = enemy.speed * (bo.retreatSpeedMult ?? 1.5) * deltaTime * 60;
          const dist = Math.sqrt(distSq) || 1;
          const rvx = -(dx / dist);
          const rvy = -(dy / dist);
          _tmpOldPos.x = enemy.position.x;
          _tmpOldPos.y = enemy.position.y;
          const rnx = enemy.position.x + rvx * retreatSpeed;
          const rny = enemy.position.y + rvy * retreatSpeed;
          if (!world) {
            enemy.position.x = rnx;
            enemy.position.y = rny;
            this.updateEnemyHash(enemy, _tmpOldPos);
            updateMovementVisuals(enemy, rvx, rvy, true, 12);
          } else {
            const step = trySlideEnemyMove(world, enemy.position.x, enemy.position.y, rnx, rny, ENEMY_MOVE_RADIUS);
            if (step.moved) {
              enemy.position.x = step.x;
              enemy.position.y = step.y;
              this.updateEnemyHash(enemy, _tmpOldPos);
              updateMovementVisuals(enemy, step.vx, step.vy, true, 12);
            } else {
              updateMovementVisuals(enemy, 0, 0, false, 0);
            }
          }
          break;
        }

        case 'charging': {
          enemy.chargeSlamTimer -= deltaTime;
          if (enemy.chargeSlamTimer <= 0 || !enemy.chargeSlamTarget) {
            const slamRange = 2.5;
            if (world && particleSystem) {
              breakTilesInRadius(world, world.getCurrentMap(), enemy.position.x, enemy.position.y, slamRange, particleSystem, playPropBreak);
            }
            const slamDx = playerPosition.x - enemy.position.x;
            const slamDy = playerPosition.y - enemy.position.y;
            const slamDistSq = slamDx * slamDx + slamDy * slamDy;
            if (slamDistSq <= slamRange * slamRange && !playerInvulnerable) {
              const slamDamage = Math.floor(enemy.damage * 1.5);
              const slamResult = this.applyAreaHitToPlayer(slamDamage, playerBlocking, blockStartTime, now, enemy);
              if (slamResult.parried) {
                parried = true;
                parryEnemyId = enemy.id;
              }
            }
            enemy.chargeSlamTarget = null;
            enemy.state = 'recovering';
            enemy.recoverTimer = enemy.recoverDuration * 1.5;
            enemy.attackAnimationTimer = 0.4;
            updateMovementVisuals(enemy, 0, 0, false, 0);
            break;
          }
          if (enemy.chargeSlamTarget) {
            _tmpOldPos.x = enemy.position.x;
            _tmpOldPos.y = enemy.position.y;
            const cdx = enemy.chargeSlamTarget.x - enemy.position.x;
            const cdy = enemy.chargeSlamTarget.y - enemy.position.y;
            const cdist = Math.sqrt(cdx * cdx + cdy * cdy) || 1;
            const chargeMult = enemy.type === 'hollow_guardian' && enemy.phase === 3 ? 4 : 3;
            const chargeSpeed = enemy.speed * chargeMult * deltaTime * 60;
            const cvx = cdx / cdist;
            const cvy = cdy / cdist;
            const chargeNextX = enemy.position.x + cvx * chargeSpeed;
            const chargeNextY = enemy.position.y + cvy * chargeSpeed;
            if (!world) {
              enemy.position.x = chargeNextX;
              enemy.position.y = chargeNextY;
            } else {
              const step = trySlideEnemyMove(
                world,
                enemy.position.x,
                enemy.position.y,
                chargeNextX,
                chargeNextY,
                ENEMY_MOVE_RADIUS,
              );
              enemy.position.x = step.x;
              enemy.position.y = step.y;
            }
            this.updateEnemyHash(enemy, _tmpOldPos);
            updateMovementVisuals(enemy, cvx, cvy, true, 14);
          }
          break;
        }

        case 'staggered': {
          enemy.staggerTimer -= deltaTime;
          enemy.damageFlashTimer = Math.max(0, enemy.damageFlashTimer - deltaTime);
          updateMovementVisuals(enemy, 0, 0, false, 0);
          if (enemy.staggerTimer <= 0) {
            enemy.poise = enemy.maxPoise *0.3;
            enemy.state = distSq <= chaseRangeSq ? 'chasing' : 'idle';
          }
          break;
        }
      }
    }

    return { parried, parryEnemyId };
  }

  private enemyAttackEnemy(attacker: Enemy, target: Enemy): void {
    target.poise -= attacker.damage;
    if (target.poise <= 0 && target.state !== 'staggered') {
      target.state = 'staggered';
      target.staggerTimer = target.staggerDuration;
      target.damageFlashTimer = target.staggerDuration;
    }

    target.health = Math.max(0, target.health - attacker.damage);
    target.damageFlashTimer = Math.max(target.damageFlashTimer, 0.2);
    target.poiseRegenTimer = 0;

    if (target.health <= 0) {
      target.state = 'dead';
      this._enemiesDirty = true;
      // Award the player half the normal essence for witnessing the kill
      this.gameState.addEssence(Math.floor(target.essenceReward * 0.5));
    }
  }

  /**
   * Push the player away from a world-space source with the given magnitude
   * (tiles/second). Composes additively with any existing knockback so a
   * second hit during the slide chains the impulse instead of replacing it.
   * Skipped on a successful parry (parried hits never knock back).
   */
  private applyKnockbackFromSource(sourceX: number, sourceY: number, magnitude: number): void {
    if (magnitude <= 0) return;
    const player = this.gameState.player;
    const dx = player.position.x - sourceX;
    const dy = player.position.y - sourceY;
    const len = Math.hypot(dx, dy);
    if (len < 0.001) {
      // Source is on top of the player — push in the player's facing direction
      // so they don't stay glued in place.
      const facing = player.direction;
      const fx = facing === 'left' ? -1 : facing === 'right' ? 1 : 0;
      const fy = facing === 'up' ? 1 : facing === 'down' ? -1 : 0;
      player.knockbackVelX += fx * magnitude;
      player.knockbackVelY += fy * magnitude;
      return;
    }
    player.knockbackVelX += (dx / len) * magnitude;
    player.knockbackVelY += (dy / len) * magnitude;
  }

  /**
   * Apply an AoE/area hit to the player, honouring the parry window when blocking.
   *
   * Returns `parried` so callers can stagger the source enemy and trigger the
   * shared immersive feedback (shake / hit-stop / sparks). Heavy boss attacks
   * (nova slam, charge slam, combo finisher AoE, eclipse hazards) all funnel
   * through here so they can be parried like any melee strike — there is no
   * "unparryable" attack outside of pure environmental hazards with no source.
   *
   * `knockbackMagnitude` shoves the player away from `sourceEnemy` (or the
   * given fallback position) on a non-parried connect — purely physical impact.
   */
  private applyAreaHitToPlayer(
    damage: number,
    isBlocking: boolean,
    blockStartTime: number = 0,
    now: number = 0,
    sourceEnemy: Enemy | null = null,
    knockbackMagnitude: number = 0,
  ): { parried: boolean } {
    const player = this.gameState.player;
    const isParry = isBlocking && (now - blockStartTime) < PARRY_WINDOW;

    if (isParry) {
      if (sourceEnemy && sourceEnemy.state !== 'dead') {
        sourceEnemy.state = 'staggered';
        sourceEnemy.staggerTimer = sourceEnemy.staggerDuration;
        sourceEnemy.damageFlashTimer = sourceEnemy.staggerDuration;
      }
      player.parryBonusTimer = 1.0;
      player.iFrameTimer = Math.max(player.iFrameTimer, 0.5);
      return { parried: true };
    }

    let finalDamage = damage;
    if (isBlocking && player.guardBrokenTimer <= 0) {
      player.stamina -= damage * 0.8;
      if (player.stamina <= 0) {
        player.stamina = 0;
        player.guardBrokenTimer = 1.2;
      }
      finalDamage = Math.floor(damage * (1 - BLOCK_DAMAGE_REDUCTION));
    }

    player.health = Math.max(0, player.health - finalDamage);
    player.damageFlashTimer = 0.4;
    player.hurtTimer = Math.max(player.hurtTimer, 0.35);
    player.iFrameTimer = Math.max(player.iFrameTimer, 0.35);

    if (knockbackMagnitude > 0 && sourceEnemy) {
      // Blocking softens the shove (you brace against it); unblocked = full impulse.
      const mult = isBlocking ? 0.55 : 1.0;
      this.applyKnockbackFromSource(sourceEnemy.position.x, sourceEnemy.position.y, knockbackMagnitude * mult);
    }
    return { parried: false };
  }

  private attackPlayer(
    enemy: Enemy,
    isBlocking: boolean = false,
    blockStartTime: number = 0,
    now: number = 0
  ): { parried: boolean } {
    const player = this.gameState.player;
    const isParry = isBlocking && (now - blockStartTime) < PARRY_WINDOW;

    if (isParry) {
      enemy.state = 'staggered';
      enemy.staggerTimer = enemy.staggerDuration;
      enemy.damageFlashTimer = enemy.staggerDuration;
      player.parryBonusTimer = 1.0;
      player.iFrameTimer = Math.max(player.iFrameTimer, 0.5);
      return { parried: true };
    }

    let damage = enemy.damage;
    if (isBlocking && player.guardBrokenTimer <= 0) {
      player.stamina -= enemy.damage * 0.8;
      if (player.stamina <= 0) {
        player.stamina = 0;
        player.guardBrokenTimer = 1.2;
        player.damageFlashTimer = 0.6;
        enemy.attackAnimationTimer = 0.3;
        return { parried: false };
      }
      damage = Math.floor(damage * (1 - BLOCK_DAMAGE_REDUCTION));
    }
    player.health = Math.max(0, player.health - damage);
    player.damageFlashTimer = 0.3;
    player.hurtTimer = Math.max(player.hurtTimer, 0.35);
    enemy.attackAnimationTimer = 0.3;

    const bo = enemy.behaviorOverrides;
    if (bo.snareOnHit && !isParry && !(isBlocking && player.guardBrokenTimer <= 0)) {
      player.snareTimer = bo.snareDuration ?? 1.5;
      player.snareSpeedMult = bo.snareSpeedMult ?? 0.6;
    }

    return { parried: false };
  }

  playerAttack(
    targetEnemy: Enemy,
    damage: number,
    playerPosition?: { x: number; y: number },
    playerDirection?: string,
    /** Fraction of damage applied to poise (default 1.0). Pass <1 for hits that should
     *  deal full HP damage but only graze poise — e.g. the scythe arc wave, which should
     *  wound enemies without CC-locking everything it touches. */
    poiseMult: number = 1.0,
  ): AttackResult {
    if (targetEnemy.state === 'dead') {
      return { killed: false, staggered: false, backstab: false };
    }

    let finalDamage = damage;
    let isStaggered = false;
    let isBackstab = false;

    const isBackstabbable = targetEnemy.state === 'idle';
    if (isBackstabbable && playerPosition && playerDirection) {
      const dx = playerPosition.x - targetEnemy.position.x;
      const dy = playerPosition.y - targetEnemy.position.y;
      const len = Math.sqrt(dx * dx + dy * dy) || 1;
      const toPlayerX = dx / len;
      const toPlayerY = dy / len;

      let enemyForwardX = 0;
      let enemyForwardY = 0;
      switch (targetEnemy.facing) {
        case 'up': enemyForwardY = 1; break;
        case 'down': enemyForwardY = -1; break;
        case 'left': enemyForwardX = -1; break;
        case 'right': enemyForwardX = 1; break;
      }

      const dot = -(enemyForwardX * toPlayerX + enemyForwardY * toPlayerY);
      const playerForward = cardinalDirectionToVector(playerDirection);
      const toEnemyX = -toPlayerX;
      const toEnemyY = -toPlayerY;
      const playerFacingTarget = playerForward.x * toEnemyX + playerForward.y * toEnemyY;
      if (dot > 0.7 && playerFacingTarget >= BACKSTAB_FACING_DOT) {
        isBackstab = true;
        finalDamage = Math.floor(damage * 2.5);
      }
    }

    if (targetEnemy.state === 'recovering') {
      finalDamage = Math.floor(damage * 1.5);
    }

    if (targetEnemy.state === 'staggered') {
      finalDamage = Math.floor(damage * 2);
    }

    targetEnemy.poise -= Math.floor(finalDamage * poiseMult);
    if (targetEnemy.poise <= 0 && targetEnemy.state !== 'staggered') {
      if (targetEnemy.behaviorOverrides.poiseImmunityFirstHit && !targetEnemy.poiseImmunityUsed) {
        targetEnemy.poiseImmunityUsed = true;
        targetEnemy.poise = Math.floor(targetEnemy.maxPoise * 0.5);
      } else {
        targetEnemy.state = 'staggered';
        targetEnemy.staggerTimer = targetEnemy.staggerDuration;
        targetEnemy.damageFlashTimer = targetEnemy.staggerDuration;
        isStaggered = true;
      }
    }

    targetEnemy.health = Math.max(0, targetEnemy.health - finalDamage);
    targetEnemy.damageFlashTimer = Math.max(targetEnemy.damageFlashTimer, 0.2);
    targetEnemy.poiseRegenTimer = 0;

    if (targetEnemy.health <= 0) {
      targetEnemy.state = 'dead';
      this._enemiesDirty = true;
      this.gameState.addEssence(targetEnemy.essenceReward);
      return { killed: true, staggered: false, backstab: isBackstab };
    }

    // Player attacking a faction enemy: permanently override faction targeting for the target
    // and alert nearby same-faction allies (pack response).
    if (targetEnemy.faction) {
      targetEnemy.playerAggroed = true;
      const PACK_ALERT_RANGE = 8;
      const allies = this.getEnemiesInRange(targetEnemy.position, PACK_ALERT_RANGE, this._scratchQueryResult);
      for (const ally of allies) {
        if (ally !== targetEnemy && ally.faction === targetEnemy.faction && ally.state !== 'dead') {
          ally.playerAggroed = true;
        }
      }
    }

    return { killed: false, staggered: isStaggered, backstab: isBackstab };
  }

  getEnemiesInRange(position: { x: number; y: number }, range: number, out?: Enemy[]): Enemy[] {
    return this.spatialHash.query(position.x, position.y, range, out);
  }

  updateEnemyHash(enemy: Enemy, oldPos: { x: number; y: number }) {
    this.spatialHash.update(enemy, oldPos);
  }

  removeDeadEnemies(): Enemy[] {
    const dead = this.enemies.filter(e => e.state === 'dead');
    dead.forEach(e => this.spatialHash.remove(e));
    this.enemies = this.enemies.filter(e => e.state !== 'dead');
    this._enemiesDirty = true;
    return dead;
  }

  removeDeadEnemiesByIds(ids: string[]): Enemy[] {
    if (ids.length === 0) return [];
    if (ids.length === 1) {
      const id = ids[0];
      const removed: Enemy[] = [];
      const kept: Enemy[] = [];
      for (const enemy of this.enemies) {
        if (enemy.id === id) removed.push(enemy);
        else kept.push(enemy);
      }
      for (const enemy of removed) this.spatialHash.remove(enemy);
      if (removed.length > 0) {
        this.enemies = kept;
        this._enemiesDirty = true;
      }
      return removed;
    }

    const toRemove = new Set(ids);
    const removed = this.enemies.filter(e => toRemove.has(e.id));
    removed.forEach(e => this.spatialHash.remove(e));
    this.enemies = this.enemies.filter(e => !toRemove.has(e.id));
    this._enemiesDirty = true;
    return removed;
  }

  clearAllEnemies(): void {
    this.enemies = [];
    this.spatialHash.clear();
    this._enemiesDirty = true;
    this.projectiles = [];
    this.fallingScytheHazards = [];
    this.hollowStillnessTimer = 0;
    this.hollowStillnessCooldown = 0;
    this.hollowLastPlayerPosition = null;
  }

  // ===== Hollow Apparition arena hazards =====

  updateFallingScytheHazards(
    deltaTime: number,
    playerPosition: { x: number; y: number },
    playerInvulnerable: boolean = false,
    playerBlocking: boolean = false,
    blockStartTime: number = 0,
  ): ParryFeedbackEvent | null {
    const guardian = this.enemies.find(e => e.type === 'hollow_guardian' && e.state !== 'dead');
    if (!guardian) {
      this.fallingScytheHazards = [];
      this.hollowStillnessTimer = 0;
      this.hollowStillnessCooldown = 0;
      this.hollowLastPlayerPosition = null;
      return null;
    }

    this.updateHollowStillnessScythes(deltaTime, playerPosition, guardian.phase);

    const now = performance.now() / 1000;
    let parryEvent: ParryFeedbackEvent | null = null;
    for (const hazard of this.fallingScytheHazards) {
      if (!hazard.alive) continue;

      hazard.rotation += hazard.spinRate * deltaTime;
      if (hazard.state === 'warning') {
        hazard.warningTimer -= deltaTime;
        if (hazard.warningTimer <= 0) {
          hazard.state = 'striking';
          hazard.strikeTimer = hazard.maxStrikeTimer;
        }
        continue;
      }

      hazard.strikeTimer -= deltaTime;
      if (!hazard.hitPlayer && !playerInvulnerable) {
        const dx = playerPosition.x - hazard.position.x;
        const dy = playerPosition.y - hazard.position.y;
        if (dx * dx + dy * dy <= hazard.radius * hazard.radius) {
          hazard.hitPlayer = true;
          // Hazards have a remote source (guardian) — parry staggers the boss
          // so the player is rewarded for nailing scythe timing in their face.
          const result = this.applyAreaHitToPlayer(hazard.damage, playerBlocking, blockStartTime, now, guardian);
          if (result.parried && !parryEvent) {
            parryEvent = { x: hazard.position.x, y: hazard.position.y, source: 'hazard', sourceEnemyId: guardian.id };
          }
        }
      }

      if (hazard.strikeTimer <= 0) {
        hazard.alive = false;
      }
    }

    removeDeadInPlace(this.fallingScytheHazards);
    return parryEvent;
  }

  getFallingScytheHazards(): FallingScytheHazard[] {
    return this.fallingScytheHazards;
  }

  private updateHollowStillnessScythes(
    deltaTime: number,
    playerPosition: { x: number; y: number },
    guardianPhase: number,
  ): void {
    if (this.hollowStillnessCooldown > 0) {
      this.hollowStillnessCooldown = Math.max(0, this.hollowStillnessCooldown - deltaTime);
    }

    const anchor = this.hollowLastPlayerPosition;
    if (!anchor) {
      this.hollowLastPlayerPosition = { ...playerPosition };
      return;
    }

    const dx = playerPosition.x - anchor.x;
    const dy = playerPosition.y - anchor.y;
    if (dx * dx + dy * dy > HOLLOW_STILLNESS_THRESHOLD_SQ) {
      this.hollowStillnessTimer = 0;
      this.hollowLastPlayerPosition = { ...playerPosition };
      return;
    }

    this.hollowStillnessTimer += deltaTime;
    if (this.hollowStillnessTimer >= HOLLOW_STILLNESS_TRIGGER && this.hollowStillnessCooldown <= 0) {
      this.spawnFallingScytheHazard({
        position: { ...playerPosition },
        damage: this.getFallingScytheDamageForPhase(guardianPhase),
        source: 'stillness',
      });
      this.hollowStillnessTimer = 0;
      this.hollowStillnessCooldown = 0.55;
    }
  }

  private getFallingScytheDamageForPhase(phase: number): number {
    if (phase >= 3) return 28;
    if (phase >= 2) return 22;
    return 16;
  }

  private spawnFallingScytheHazard(opts: {
    position: { x: number; y: number };
    damage: number;
    source: 'stillness' | 'eclipse';
    warningTimer?: number;
    strikeTimer?: number;
    radius?: number;
  }): FallingScytheHazard {
    const warningTimer = opts.warningTimer ?? FALLING_SCYTHE_WARNING;
    const strikeTimer = opts.strikeTimer ?? FALLING_SCYTHE_STRIKE;
    const hazard: FallingScytheHazard = {
      id: `falling_scythe_${++this._nextFallingScytheIdSeq}`,
      position: { ...opts.position },
      radius: opts.radius ?? FALLING_SCYTHE_RADIUS,
      damage: opts.damage,
      warningTimer,
      strikeTimer,
      maxWarningTimer: warningTimer,
      maxStrikeTimer: strikeTimer,
      rotation: 0,
      spinRate: 18 + Math.random() * 8,
      state: 'warning',
      alive: true,
      hitPlayer: false,
      source: opts.source,
    };
    this.fallingScytheHazards.push(hazard);
    return hazard;
  }

  private spawnHollowEclipseHazards(enemy: Enemy): void {
    const positions = [
      { x: -5.5, y: 0 }, { x: -3.5, y: 0 }, { x: 3.5, y: 0 }, { x: 5.5, y: 0 },
      { x: 0, y: -5.5 }, { x: 0, y: -3.5 }, { x: 0, y: 3.5 }, { x: 0, y: 5.5 },
      { x: -5.0, y: -2.5 }, { x: -2.5, y: -5.0 }, { x: 2.5, y: -5.0 }, { x: 5.0, y: -2.5 },
      { x: -5.0, y: 2.5 }, { x: -2.5, y: 5.0 }, { x: 2.5, y: 5.0 }, { x: 5.0, y: 2.5 },
    ];

    for (const pos of positions) {
      this.spawnFallingScytheHazard({
        position: { x: enemy.position.x + pos.x, y: enemy.position.y + pos.y },
        damage: 20,
        source: 'eclipse',
        warningTimer: 0.65,
        strikeTimer: 0.45,
        radius: 0.8,
      });
    }
  }

  // ===== Projectiles =====

  spawnProjectile(opts: {
    position: { x: number; y: number };
    velocity: { x: number; y: number };
    damage: number;
    sprite: string;
    lifetime: number;
    sourceEnemyId: string;
    hitRadius?: number;
    spinRate?: number;
  }): Projectile {
    const proj: Projectile = {
      id: `proj_${++this._nextProjectileIdSeq}`,
      position: { ...opts.position },
      velocity: { ...opts.velocity },
      damage: opts.damage,
      lifetime: opts.lifetime,
      maxLifetime: opts.lifetime,
      sourceEnemyId: opts.sourceEnemyId,
      sprite: opts.sprite,
      spinRate: opts.spinRate ?? 18,
      rotation: 0,
      hitRadius: opts.hitRadius ?? 0.45,
      alive: true,
      reflected: false,
    };
    this.projectiles.push(proj);
    return proj;
  }

  getProjectiles(): Projectile[] {
    return this.projectiles;
  }

  updateProjectiles(
    deltaTime: number,
    playerPosition: { x: number; y: number },
    playerInvulnerable: boolean = false,
    playerBlocking: boolean = false,
    blockStartTime: number = 0,
    world?: World,
  ): ParryFeedbackEvent | null {
    const now = performance.now() / 1000;
    const playerHitRadius = 0.4;
    let parryEvent: ParryFeedbackEvent | null = null;

    for (const p of this.projectiles) {
      if (!p.alive) continue;

      p.lifetime -= deltaTime;
      p.rotation += p.spinRate * deltaTime;

      const nextX = p.position.x + p.velocity.x * deltaTime;
      const nextY = p.position.y + p.velocity.y * deltaTime;

      // Wall collision — fizzle if the terrain cannot carry this projectile.
      if (world && !this.canProjectileMoveTo(world, p, nextX, nextY)) {
        p.alive = false;
        continue;
      }

      p.position.x = nextX;
      p.position.y = nextY;

      if (p.lifetime <= 0) {
        p.alive = false;
        continue;
      }

      if (p.reflected) {
        const hitEnemy = this.getProjectileReflectionTarget(p);
        if (hitEnemy) {
          this.applyReflectedProjectileHit(p, hitEnemy);
          p.alive = false;
        }
        continue;
      }

      // Player hit check.
      const pdx = playerPosition.x - p.position.x;
      const pdy = playerPosition.y - p.position.y;
      const distSq = pdx * pdx + pdy * pdy;
      const reach = p.hitRadius + playerHitRadius;
      if (distSq <= reach * reach) {
        if (!playerInvulnerable) {
          const result = this.applyProjectileHit(p, playerBlocking, blockStartTime, now);
          if (result.parried && !parryEvent) {
            parryEvent = { x: p.position.x, y: p.position.y, source: 'projectile', sourceEnemyId: p.sourceEnemyId };
          }
          if (result.outcome === 'reflected') {
            continue;
          }
        }
        p.alive = false;
      }
    }

    removeDeadInPlace(this.projectiles);
    return parryEvent;
  }

  private canProjectileMoveTo(world: World, projectile: Projectile, nextX: number, nextY: number): boolean {
    if (projectile.sprite !== 'projectile_shell') {
      return world.canMoveTo(projectile.position.x, projectile.position.y, nextX, nextY, 0.05);
    }

    const tile = world.getTile(nextX, nextY);
    if (!tile) return false;
    if (tile.transition) return true;
    return tile.walkable || SHELL_PROJECTILE_PASSABLE_TILE_TYPES.has(tile.type);
  }

  private applyProjectileHit(
    projectile: Projectile,
    isBlocking: boolean,
    blockStartTime: number,
    now: number,
  ): { outcome: 'hit' | 'blocked' | 'reflected'; parried: boolean } {
    const player = this.gameState.player;
    const isParry = isBlocking && (now - blockStartTime) < PARRY_WINDOW;

    if (isParry) {
      // Parry deflects the projectile cleanly — short i-frames, no damage.
      player.parryBonusTimer = 1.0;
      player.iFrameTimer = Math.max(player.iFrameTimer, 0.4);
      return { outcome: this.reflectProjectile(projectile) ? 'reflected' : 'blocked', parried: true };
    }

    let damage = projectile.damage;
    if (isBlocking && player.guardBrokenTimer <= 0) {
      player.stamina -= projectile.damage * 0.8;
      if (player.stamina <= 0) {
        player.stamina = 0;
        player.guardBrokenTimer = 1.2;
        return { outcome: 'blocked', parried: false };
      }
      return { outcome: 'blocked', parried: false };
    }
    player.health = Math.max(0, player.health - damage);
    player.damageFlashTimer = 0.3;
    player.hurtTimer = Math.max(player.hurtTimer, 0.35);
    return { outcome: 'hit', parried: false };
  }

  private reflectProjectile(projectile: Projectile): boolean {
    const sourceEnemy = this.enemies.find(e => e.id === projectile.sourceEnemyId && e.state !== 'dead');
    if (!sourceEnemy) {
      return false;
    }

    const dx = sourceEnemy.position.x - projectile.position.x;
    const dy = sourceEnemy.position.y - projectile.position.y;
    const dist = Math.hypot(dx, dy) || 1;
    const speed = Math.hypot(projectile.velocity.x, projectile.velocity.y) || 7;

    projectile.velocity.x = (dx / dist) * speed;
    projectile.velocity.y = (dy / dist) * speed;
    projectile.lifetime = Math.max(projectile.lifetime, 1.2);
    projectile.maxLifetime = Math.max(projectile.maxLifetime, projectile.lifetime);
    projectile.reflected = true;
    projectile.reflectedTargetEnemyId = sourceEnemy.id;
    projectile.spinRate *= -1.35;
    return true;
  }

  private getProjectileReflectionTarget(projectile: Projectile): Enemy | undefined {
    const target = this.enemies.find(e => e.id === (projectile.reflectedTargetEnemyId ?? projectile.sourceEnemyId) && e.state !== 'dead');
    if (!target) {
      return undefined;
    }

    const dx = target.position.x - projectile.position.x;
    const dy = target.position.y - projectile.position.y;
    const reach = projectile.hitRadius + 0.45;
    return dx * dx + dy * dy <= reach * reach ? target : undefined;
  }

  private getReflectedProjectileDamage(projectile: Projectile): number {
    if (projectile.sprite === 'projectile_shell') {
      return Math.max(Math.round(projectile.damage * 4), 32);
    }
    return Math.max(Math.round(projectile.damage * 3), 40);
  }

  private applyReflectedProjectileHit(projectile: Projectile, target: Enemy): void {
    const reflectedDamage = this.getReflectedProjectileDamage(projectile);
    target.poise -= reflectedDamage;
    if (target.poise <= 0 && target.state !== 'staggered') {
      target.state = 'staggered';
      target.staggerTimer = target.staggerDuration;
      target.damageFlashTimer = target.staggerDuration;
    }

    target.health = Math.max(0, target.health - reflectedDamage);
    target.damageFlashTimer = Math.max(target.damageFlashTimer, 0.3);
    target.poiseRegenTimer = 0;
    target.playerAggroed = true;

    if (target.health <= 0) {
      target.state = 'dead';
      this._enemiesDirty = true;
      this.gameState.addEssence(target.essenceReward);
    }
  }

  clearAllProjectiles(): void {
    this.projectiles = [];
    this.fallingScytheHazards = [];
  }
}
