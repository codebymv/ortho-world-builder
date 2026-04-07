import * as THREE from 'three';
import { GameState } from './GameState';
import { SpatialHash } from './SpatialHash';
import { World } from './World';

type CardinalDirection = 'up' | 'down' | 'left' | 'right';

const BLOCK_DAMAGE_REDUCTION = 0.6;
const PARRY_WINDOW = 0.25;
const ENEMY_MOVE_RADIUS = 0.15;
const DORMANCY_RANGE_SQ = 40 * 40;
// Faction enemies only begin fighting each other once the player is within this radius.
// Keeps pre-staged battles in stasis until the player is close enough to witness the start.
const FACTION_FIGHT_WAKE_SQ = 16 * 16;
const _tmpOldPos = { x: 0, y: 0 };

function trySlideEnemyMove(
  world: World,
  ox: number,
  oy: number,
  nx: number,
  ny: number,
  r: number
): { x: number; y: number; moved: boolean; vx: number; vy: number } {
  if (world.canMoveTo(ox, oy, nx, ny, r)) {
    const dx = nx - ox;
    const dy = ny - oy;
    const len = Math.hypot(dx, dy) || 1;
    return { x: nx, y: ny, moved: true, vx: dx / len, vy: dy / len };
  }
  if (world.canMoveTo(ox, oy, nx, oy, r)) {
    const sx = nx - ox;
    return { x: nx, y: oy, moved: true, vx: sx >= 0 ? 1 : -1, vy: 0 };
  }
  if (world.canMoveTo(ox, oy, ox, ny, r)) {
    const sy = ny - oy;
    return { x: ox, y: ny, moved: true, vx: 0, vy: sy >= 0 ? 1 : -1 };
  }
  return { x: ox, y: oy, moved: false, vx: 0, vy: 0 };
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
  state: 'idle' | 'chasing' | 'telegraphing' | 'attacking' | 'recovering' | 'staggered' | 'dead' | 'retreating' | 'charging';
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
  /** True once the player has attacked this enemy, permanently overriding faction targeting. */
  playerAggroed: boolean;
}

export interface AttackResult {
  killed: boolean;
  staggered: boolean;
  backstab: boolean;
}

export class CombatSystem {
  private enemies: Enemy[] = [];
  private gameState: GameState;
  private _cachedLiveEnemies: Enemy[] = [];
  private _enemiesDirty: boolean = true;
  private spatialHash: SpatialHash<Enemy>;

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
      id: `enemy_${Date.now()}_${Math.random()}`,
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
      patrolRadius: 2 + Math.random() * 2,
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
      playerAggroed: false,
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
    stealthDetectionMult: number = 1.0
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
        if (!enemy.factionTarget || enemy.factionTarget.state === 'dead') {
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

      // Phase 2 transition for the Hollow Guardian at 50% HP
      if (enemy.type === 'hollow_guardian' && !enemy.phaseTransitioned && enemy.health <= enemy.maxHealth * 0.5) {
        enemy.phase = 2;
        enemy.phaseTransitioned = true;
        enemy.speed *= 1.4;
        enemy.telegraphDuration *= 0.75;
        enemy.recoverDuration *= 0.7;
        enemy.damage = Math.round(enemy.damage * 1.3);
        if (onPhaseChange) onPhaseChange(enemy, 2);
      }

      const effectiveChaseRange = enemy.playerAggroed
        ? enemy.chaseRange
        : enemy.chaseRange * stealthDetectionMult;
      const chaseRangeSq = effectiveChaseRange * effectiveChaseRange;
      const attackRangeSq = enemy.attackRange * enemy.attackRange;

      switch (enemy.state) {
        case 'idle': {
          enemy.patrolAngle += deltaTime * 0.5;
          const px = enemy.patrolOrigin.x + Math.cos(enemy.patrolAngle) * enemy.patrolRadius;
          const py = enemy.patrolOrigin.y + Math.sin(enemy.patrolAngle) * enemy.patrolRadius;
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
            if (!world || world.canMoveTo(enemy.position.x, enemy.position.y, nextX, nextY, 0.15)) {
              enemy.position.x = nextX;
              enemy.position.y = nextY;
              this.updateEnemyHash(enemy, _tmpOldPos);
              updateMovementVisuals(enemy, nvx, nvy, true, 7);
            } else {
              updateMovementVisuals(enemy, 0, 0, false, 0);
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

          if (distSq <= attackRangeSq) {
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
              const step = trySlideEnemyMove(world, enemy.position.x, enemy.position.y, nextX, nextY, ENEMY_MOVE_RADIUS);
              if (step.moved) {
                enemy.position.x = step.x;
                enemy.position.y = step.y;
                this.updateEnemyHash(enemy, _tmpOldPos);
                updateMovementVisuals(enemy, step.vx, step.vy, true,10);
              } else {
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
            const extAttackRangeSq = attackRangeSq * 1.69;

            if (enemy.factionTarget && enemy.factionTarget.state !== 'dead') {
              // Attack the faction target instead of the player
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
              if (newDistSq <= extAttackRangeSq && !playerInvulnerable) {
                const result = this.attackPlayer(enemy, playerBlocking, blockStartTime, now);
                if (result.parried) {
                  parried = true;
                  parryEnemyId = enemy.id;
                }
              }
            }
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
            if (enemy.type === 'hollow_guardian' && enemy.phase === 2 &&
                distSq <= attackRangeSq * 2.25) {
              const roll = Math.random();
              if (roll < 0.2) {
                enemy.state = 'charging';
                enemy.chargeSlamTimer = 0.6;
                const dist = Math.sqrt(distSq) || 1;
                enemy.chargeSlamTarget = { x: playerPosition.x, y: playerPosition.y };
                break;
              } else if (roll < 0.5) {
                enemy.state = 'telegraphing';
                enemy.telegraphTimer = 0.6;
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
          if (!world || world.canMoveTo(enemy.position.x, enemy.position.y, rnx, rny, ENEMY_MOVE_RADIUS)) {
            enemy.position.x = rnx;
            enemy.position.y = rny;
            this.updateEnemyHash(enemy, _tmpOldPos);
            updateMovementVisuals(enemy, rvx, rvy, true, 12);
          } else {
            updateMovementVisuals(enemy, 0, 0, false, 0);
          }
          break;
        }

        case 'charging': {
          enemy.chargeSlamTimer -= deltaTime;
          if (enemy.chargeSlamTimer <= 0 || !enemy.chargeSlamTarget) {
            const slamRange = 2.5;
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
            const chargeSpeed = enemy.speed * 3 * deltaTime * 60;
            const cvx = cdx / cdist;
            const cvy = cdy / cdist;
            enemy.position.x += cvx * chargeSpeed;
            enemy.position.y += cvy * chargeSpeed;
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
  }
}
