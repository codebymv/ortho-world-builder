import * as THREE from 'three';
import { GameState } from './GameState';
import { SpatialHash } from './SpatialHash';
import { World } from './World';
import { breakTilesInRadius } from '@/game/runtime/BreakableProps';

type CardinalDirection = 'up' | 'down' | 'left' | 'right';

const BLOCK_DAMAGE_REDUCTION = 0.6;
const PARRY_WINDOW = 0.25;
const ENEMY_MOVE_RADIUS = 0.3;
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
// Number of consecutive blocked frames before an enemy is forced into a brief recover pause.
const ENEMY_STUCK_FRAME_LIMIT = 6;
const ENEMY_PATH_RECOVERY_DURATION = 0.85;
const ENEMY_PATH_RECOVERY_BLEND = 0.28;

type EnemyMoveStep = { x: number; y: number; moved: boolean; vx: number; vy: number };
type EnemyChaseMoveStep = EnemyMoveStep & { usedRecovery: boolean };

function trySlideEnemyMove(
  world: World,
  ox: number,
  oy: number,
  nx: number,
  ny: number,
  r: number
): EnemyMoveStep {
  if (world.canEnemyMoveTo(ox, oy, nx, ny, r)) {
    const dx = nx - ox;
    const dy = ny - oy;
    const len = Math.hypot(dx, dy) || 1;
    return { x: nx, y: ny, moved: true, vx: dx / len, vy: dy / len };
  }
  if (world.canEnemyMoveTo(ox, oy, nx, oy, r)) {
    const sx = nx - ox;
    return { x: nx, y: oy, moved: true, vx: sx >= 0 ? 1 : -1, vy: 0 };
  }
  if (world.canEnemyMoveTo(ox, oy, ox, ny, r)) {
    const sy = ny - oy;
    return { x: ox, y: ny, moved: true, vx: 0, vy: sy >= 0 ? 1 : -1 };
  }
  return { x: ox, y: oy, moved: false, vx: 0, vy: 0 };
}

function normalizeMoveVector(x: number, y: number): { x: number; y: number } {
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
): EnemyChaseMoveStep {
  const step = trySlideEnemyMove(
    world,
    ox,
    oy,
    ox + vx * moveDistance,
    oy + vy * moveDistance,
    r,
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
  const preferredSide = enemy.pathRecoverySide || (enemy.visualSeed < 0.5 ? -1 : 1);
  const sideOrder: Array<-1 | 1> = [preferredSide, preferredSide === 1 ? -1 : 1];
  const candidates: Array<{ vx: number; vy: number; usedRecovery: boolean }> = [];

  if (enemy.pathRecoveryTimer <= 0) {
    candidates.push({ vx, vy, usedRecovery: false });
  }

  for (const side of sideOrder) {
    const sideVx = -vy * side;
    const sideVy = vx * side;
    candidates.push({
      ...normalizeMoveVector(vx * ENEMY_PATH_RECOVERY_BLEND + sideVx, vy * ENEMY_PATH_RECOVERY_BLEND + sideVy),
      usedRecovery: true,
    });
    candidates.push({ vx: sideVx, vy: sideVy, usedRecovery: true });
  }

  if (enemy.pathRecoveryTimer > 0) {
    candidates.push({ vx, vy, usedRecovery: false });
  }

  for (const candidate of candidates) {
    const step = tryEnemyMoveVector(
      world,
      enemy.position.x,
      enemy.position.y,
      candidate.vx,
      candidate.vy,
      moveDistance,
      r,
      candidate.usedRecovery,
    );
    if (step.moved) return step;
  }

  return { x: enemy.position.x, y: enemy.position.y, moved: false, vx: 0, vy: 0, usedRecovery: false };
}

import type { EnemyBehaviorOverrides } from '../../data/enemies';

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
  /** Current attack variant being telegraphed. */
  currentAttackType: 'normal' | 'sweep' | 'nova' | 'combo_sweep' | 'combo_finisher' | 'hail_mary';
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
    };

    this.enemies.push(enemy);
    this.spatialHash.insert(enemy);
    this._enemiesDirty = true;
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

  updateEnemies(
    deltaTime: number,
    playerPosition: { x: number; y: number },
    playerInvulnerable: boolean = false,
    playerBlocking: boolean = false,
    blockStartTime: number = 0,
    world?: World,
    onPhaseChange?: (enemy: Enemy, phase: number) => void,
    stealthDetectionMult: number = 1.0,
    particleSystem?: { emit(position: THREE.Vector3, count: number, color: number, lifetime: number, speed: number, spread: number): void },
    playPropBreak?: () => void,
    playerIsClimbing: boolean = false,
    playerCombatElevation: number | undefined = undefined,
  ): { parried: boolean; parryEnemyId: string | null } {
    const updateMovementVisuals = (enemy: Enemy, vx: number, vy: number, moving: boolean, cadence: number) => {
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

    for (const enemy of this.enemies) {
      if (enemy.state === 'dead') continue;

      if (enemy.attackWindupLockTimer > 0) {
        enemy.attackWindupLockTimer = Math.max(0, enemy.attackWindupLockTimer - deltaTime);
      }
      if (enemy.pathRecoveryTimer > 0) {
        enemy.pathRecoveryTimer = Math.max(0, enemy.pathRecoveryTimer - deltaTime);
      }

      // Dormancy: always measured against the player so the battle only activates on approach.
      const playerDx = playerPosition.x - enemy.position.x;
      const playerDy = playerPosition.y - enemy.position.y;
      const playerDistSq = playerDx * playerDx + playerDy * playerDy;

      if (enemy.state === 'idle' && playerDistSq > DORMANCY_RANGE_SQ) continue;

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
          const nearby = this.getEnemiesInRange(enemy.position, enemy.chaseRange * 1.5);
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
          if (world && !world.canEnemyMoveTo(px, py, px, py, 0.15)) {
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
            const moveSpeed = enemy.speed * 0.4 * deltaTime * 60;
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
              const step = trySlideEnemyMove(world, enemy.position.x, enemy.position.y, nextX, nextY, 0.15);
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
          if (distSq <= chaseRangeSq || enemy.factionTarget !== null) {
            enemy.state = 'chasing';
          }
          break;
        }

        case 'chasing': {
          const leashRangeSq = chaseRangeSq * 2.25;
          if (distSq > leashRangeSq) {
            enemy.state = 'idle';
            updateMovementVisuals(enemy, 0, 0, false, 0);
            break;
          }

          const bo = enemy.behaviorOverrides;
          if (bo.rangedAttack && enemy.attackWindupLockTimer <= 0) {
            const rangedRange = bo.rangedRange ?? 3.0;
            if (distSq > attackRangeSq && distSq <= rangedRange * rangedRange * 4 &&
                Math.random() < (bo.rangedChance ?? 0.5) * deltaTime * 2) {
              enemy.state = 'telegraphing';
              enemy.telegraphTimer = enemy.telegraphDuration * 0.8;
              updateMovementVisuals(enemy, 0, 0, false, 0);
              break;
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
            enemy.telegraphTimer = enemy.telegraphDuration;
            updateMovementVisuals(enemy, 0, 0, false, 0);
            break;
          }

          if (distSq > 0) {
            _tmpOldPos.x = enemy.position.x;
            _tmpOldPos.y = enemy.position.y;
            const dist = Math.sqrt(distSq);
            const moveSpeed = enemy.speed * deltaTime * 60;
            const nvx = dx / dist;
            const nvy = dy / dist;
            const nextX = enemy.position.x + nvx * moveSpeed;
            const nextY = enemy.position.y + nvy * moveSpeed;
            if (!world) {
              enemy.position.x = nextX;
              enemy.position.y = nextY;
              this.updateEnemyHash(enemy, _tmpOldPos);
              updateMovementVisuals(enemy, nvx, nvy, true, 10);
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
                updateMovementVisuals(enemy, step.vx, step.vy, true, 10);
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
          enemy.telegraphTimer -= deltaTime;
          updateMovementVisuals(enemy, 0, 0, false, 0);

          if (enemy.telegraphTimer <= 0) {
            const isSweep = enemy.currentAttackType === 'sweep' || enemy.currentAttackType === 'combo_sweep';
            const isComboFinisher = enemy.currentAttackType === 'combo_finisher';
            const rangeMult = isSweep ? 3.0 : 1.69;
            const extAttackRangeSq = attackRangeSq * rangeMult;

            const savedDamage = enemy.damage;
            if (isSweep) enemy.damage = Math.floor(enemy.damage * 0.7);

            const eBo = enemy.behaviorOverrides;
            // Ranged projectile path — release a thrown blade aimed at the player's current position.
            // Skip the melee damage check entirely; the projectile resolves its own hit in updateProjectiles.
            const rangedDistSq = distSq;
            const rangedMaxSq = (eBo.rangedRange ?? 3.0) * (eBo.rangedRange ?? 3.0) * 4;
            if (isComboFinisher) {
              const finisherRadius = 2.0;
              if (world && particleSystem) {
                breakTilesInRadius(world, world.getCurrentMap(), enemy.position.x, enemy.position.y, finisherRadius, particleSystem, playPropBreak);
              }
              const finisherDx = playerPosition.x - enemy.position.x;
              const finisherDy = playerPosition.y - enemy.position.y;
              const finisherDistSq = finisherDx * finisherDx + finisherDy * finisherDy;
              if (finisherDistSq <= finisherRadius * finisherRadius && !playerInvulnerable) {
                this.applyAreaHitToPlayer(Math.floor(enemy.damage * 1.25), playerBlocking);
              }
            } else if (eBo.rangedAttack && eBo.rangedProjectile && rangedDistSq > attackRangeSq && rangedDistSq <= rangedMaxSq) {
              const dxP = playerPosition.x - enemy.position.x;
              const dyP = playerPosition.y - enemy.position.y;
              const lenP = Math.hypot(dxP, dyP) || 1;
              const speed = eBo.rangedProjectileSpeed ?? 6.0;
              this.spawnProjectile({
                position: { x: enemy.position.x, y: enemy.position.y },
                velocity: { x: (dxP / lenP) * speed, y: (dyP / lenP) * speed },
                damage: enemy.damage,
                sprite: eBo.rangedProjectileSprite ?? 'projectile_scythe',
                lifetime: eBo.rangedProjectileLifetime ?? 1.4,
                sourceEnemyId: enemy.id,
              });
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
            enemy.state = 'recovering';
            enemy.recoverTimer = enemy.recoverDuration;
            enemy.attackAnimationTimer = 0.3;
          }
          break;
        }

        case 'attacking': {
          enemy.state = 'recovering';
          enemy.recoverTimer = enemy.recoverDuration;
          updateMovementVisuals(enemy, 0, 0, false, 0);
          break;
        }

        case 'recovering': {
          enemy.recoverTimer -= deltaTime;
          updateMovementVisuals(enemy, 0, 0, false, 0);
          if (enemy.recoverTimer <= 0) {
            const bo = enemy.behaviorOverrides;

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
              if (playerBlocking && this.gameState.player.guardBrokenTimer <= 0) {
                this.gameState.player.stamina -= novaDamage * 0.8;
                if (this.gameState.player.stamina <= 0) {
                  this.gameState.player.stamina = 0;
                  this.gameState.player.guardBrokenTimer = 1.2;
                }
                const reduced = Math.floor(novaDamage * (1 - BLOCK_DAMAGE_REDUCTION));
                this.gameState.player.health = Math.max(0, this.gameState.player.health - reduced);
              } else {
                this.gameState.player.health = Math.max(0, this.gameState.player.health - novaDamage);
              }
              this.gameState.player.damageFlashTimer = 0.4;
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
              if (playerBlocking && this.gameState.player.guardBrokenTimer <= 0) {
                this.gameState.player.stamina -= slamDamage * 0.8;
                if (this.gameState.player.stamina <= 0) {
                  this.gameState.player.stamina = 0;
                  this.gameState.player.guardBrokenTimer = 1.2;
                }
                const reduced = Math.floor(slamDamage * (1 - BLOCK_DAMAGE_REDUCTION));
                this.gameState.player.health = Math.max(0, this.gameState.player.health - reduced);
              } else {
                this.gameState.player.health = Math.max(0, this.gameState.player.health - slamDamage);
              }
              this.gameState.player.damageFlashTimer = 0.4;
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

  private applyAreaHitToPlayer(damage: number, isBlocking: boolean): void {
    const player = this.gameState.player;
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
    player.iFrameTimer = Math.max(player.iFrameTimer, 0.35);
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
    playerDirection?: string
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
      if (dot > 0.7) {
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

    targetEnemy.poise -= finalDamage;
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
      const allies = this.getEnemiesInRange(targetEnemy.position, PACK_ALERT_RANGE);
      for (const ally of allies) {
        if (ally !== targetEnemy && ally.faction === targetEnemy.faction && ally.state !== 'dead') {
          ally.playerAggroed = true;
        }
      }
    }

    return { killed: false, staggered: isStaggered, backstab: isBackstab };
  }

  getEnemiesInRange(position: { x: number; y: number }, range: number): Enemy[] {
    return this.spatialHash.query(position.x, position.y, range);
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
  ): void {
    const guardian = this.enemies.find(e => e.type === 'hollow_guardian' && e.state !== 'dead');
    if (!guardian) {
      this.fallingScytheHazards = [];
      this.hollowStillnessTimer = 0;
      this.hollowStillnessCooldown = 0;
      this.hollowLastPlayerPosition = null;
      return;
    }

    this.updateHollowStillnessScythes(deltaTime, playerPosition, guardian.phase);

    const now = performance.now() / 1000;
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
          const isPerfectBlock = playerBlocking && (now - blockStartTime) < PARRY_WINDOW;
          if (isPerfectBlock) {
            this.gameState.player.parryBonusTimer = Math.max(this.gameState.player.parryBonusTimer, 0.6);
            this.gameState.player.iFrameTimer = Math.max(this.gameState.player.iFrameTimer, 0.35);
          } else {
            this.applyAreaHitToPlayer(hazard.damage, playerBlocking);
          }
        }
      }

      if (hazard.strikeTimer <= 0) {
        hazard.alive = false;
      }
    }

    if (this.fallingScytheHazards.some(h => !h.alive)) {
      this.fallingScytheHazards = this.fallingScytheHazards.filter(h => h.alive);
    }
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
  ): void {
    const now = performance.now() / 1000;
    const playerHitRadius = 0.4;

    for (const p of this.projectiles) {
      if (!p.alive) continue;

      p.lifetime -= deltaTime;
      p.rotation += p.spinRate * deltaTime;

      const nextX = p.position.x + p.velocity.x * deltaTime;
      const nextY = p.position.y + p.velocity.y * deltaTime;

      // Wall collision — fizzle if the tile is not walkable.
      if (world && !world.canMoveTo(p.position.x, p.position.y, nextX, nextY, 0.05)) {
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
          if (result === 'reflected') {
            continue;
          }
        }
        p.alive = false;
      }
    }

    // Sweep dead projectiles every frame — array is small (rarely > a dozen).
    if (this.projectiles.some(p => !p.alive)) {
      this.projectiles = this.projectiles.filter(p => p.alive);
    }
  }

  private applyProjectileHit(
    projectile: Projectile,
    isBlocking: boolean,
    blockStartTime: number,
    now: number,
  ): 'hit' | 'blocked' | 'reflected' {
    const player = this.gameState.player;
    const isParry = isBlocking && (now - blockStartTime) < PARRY_WINDOW;
    const suppressBlockFlash = projectile.sprite === 'projectile_scythe';

    if (isParry) {
      // Parry deflects the projectile cleanly — short i-frames, no damage.
      player.parryBonusTimer = 1.0;
      player.iFrameTimer = Math.max(player.iFrameTimer, 0.4);
      return this.reflectProjectile(projectile) ? 'reflected' : 'blocked';
    }

    let damage = projectile.damage;
    if (isBlocking && player.guardBrokenTimer <= 0) {
      player.stamina -= projectile.damage * 0.8;
      if (player.stamina <= 0) {
        player.stamina = 0;
        player.guardBrokenTimer = 1.2;
        if (!suppressBlockFlash) {
          player.damageFlashTimer = 0.6;
        }
        return 'blocked';
      }
      if (!suppressBlockFlash) {
        player.damageFlashTimer = 0.18;
      }
      return 'blocked';
    }
    player.health = Math.max(0, player.health - damage);
    player.damageFlashTimer = 0.3;
    return 'hit';
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

  private applyReflectedProjectileHit(projectile: Projectile, target: Enemy): void {
    target.poise -= projectile.damage;
    if (target.poise <= 0 && target.state !== 'staggered') {
      target.state = 'staggered';
      target.staggerTimer = target.staggerDuration;
      target.damageFlashTimer = target.staggerDuration;
    }

    target.health = Math.max(0, target.health - projectile.damage);
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
