import * as THREE from 'three';
import { GameState } from './GameState';
import { SpatialHash } from './SpatialHash';
import { World } from './World';

type CardinalDirection = 'up' | 'down' | 'left' | 'right';

const BLOCK_DAMAGE_REDUCTION = 0.6;
const PARRY_WINDOW = 0.25;
const ENEMY_MOVE_RADIUS = 0.15;

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

interface SpawnEnemyOptions {
  speed?: number;
  attackRange?: number;
  chaseRange?: number;
  essenceReward?: number;
  telegraphDuration?: number;
  recoverDuration?: number;
  poise?: number;
  staggerDuration?: number;
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
  state: 'idle' | 'chasing' | 'telegraphing' | 'attacking' | 'recovering' | 'staggered' | 'dead';
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
    world?: World
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

      if (enemy.state !== 'staggered') {
        enemy.poiseRegenTimer += deltaTime;
        if (enemy.poiseRegenTimer >= 1.5) {
          enemy.poise = Math.min(enemy.maxPoise, enemy.poise + enemy.maxPoise * 0.15);
          enemy.poiseRegenTimer = 0;
        }
      }

      const dx = playerPosition.x - enemy.position.x;
      const dy = playerPosition.y - enemy.position.y;
      const distSq = dx * dx + dy * dy;
      const chaseRangeSq = enemy.chaseRange * enemy.chaseRange;
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
            const oldPos = { ...enemy.position };
            const pdist = Math.sqrt(pdistSq);
            const moveSpeed = enemy.speed * 0.4 * deltaTime * 60;
            const nvx = pdx / pdist;
            const nvy = pdy / pdist;
            const nextX = enemy.position.x + nvx * moveSpeed;
            const nextY = enemy.position.y + nvy * moveSpeed;
            if (!world || world.canMoveTo(enemy.position.x, enemy.position.y, nextX, nextY, 0.15)) {
              enemy.position.x = nextX;
              enemy.position.y = nextY;
              this.updateEnemyHash(enemy, oldPos);
              updateMovementVisuals(enemy, nvx, nvy, true, 7);
            } else {
              updateMovementVisuals(enemy, 0, 0, false, 0);
            }
          } else {
            updateMovementVisuals(enemy, 0, 0, false, 0);
          }

          if (distSq <= chaseRangeSq) {
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

          if (distSq <= attackRangeSq) {
            enemy.state = 'telegraphing';
            enemy.telegraphTimer = enemy.telegraphDuration;
            updateMovementVisuals(enemy, 0, 0, false, 0);
            break;
          }

          if (distSq > 0) {
            const oldPos = { ...enemy.position };
            const dist = Math.sqrt(distSq);
            const moveSpeed = enemy.speed * deltaTime * 60;
            const nvx = dx / dist;
            const nvy = dy / dist;
            const nextX = enemy.position.x + nvx * moveSpeed;
            const nextY = enemy.position.y + nvy * moveSpeed;
            if (!world) {
              enemy.position.x = nextX;
              enemy.position.y = nextY;
              this.updateEnemyHash(enemy, oldPos);
              updateMovementVisuals(enemy, nvx, nvy, true, 10);
            } else {
              const step = trySlideEnemyMove(world, enemy.position.x, enemy.position.y, nextX, nextY, ENEMY_MOVE_RADIUS);
              if (step.moved) {
                enemy.position.x = step.x;
                enemy.position.y = step.y;
                this.updateEnemyHash(enemy, oldPos);
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
            const newDx = playerPosition.x - enemy.position.x;
            const newDy = playerPosition.y - enemy.position.y;
            const newDistSq = newDx * newDx + newDy * newDy;
            const extAttackRangeSq = attackRangeSq * 1.69;

            if (newDistSq <= extAttackRangeSq && !playerInvulnerable) {
              const result = this.attackPlayer(enemy, playerBlocking, blockStartTime, now);
              if (result.parried) {
                parried = true;
                parryEnemyId = enemy.id;
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
            enemy.state = distSq <= chaseRangeSq ? 'chasing' : 'idle';
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

  private attackPlayer(
    enemy: Enemy,
    isBlocking: boolean = false,
    blockStartTime: number = 0,
    now: number = 0
  ): { parried: boolean } {
    const isParry = isBlocking && (now - blockStartTime) < PARRY_WINDOW;

    if (isParry) {
      enemy.state = 'staggered';
      enemy.staggerTimer = enemy.staggerDuration;
      enemy.damageFlashTimer = enemy.staggerDuration;
      return { parried: true };
    }

    let damage = enemy.damage;
    if (isBlocking) {
      damage = Math.floor(damage * (1 - BLOCK_DAMAGE_REDUCTION));
    }
    this.gameState.player.health = Math.max(0, this.gameState.player.health - damage);
    this.gameState.player.damageFlashTimer = 0.3;
    enemy.attackAnimationTimer = 0.3;
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

    targetEnemy.poise -= damage;
    if (targetEnemy.poise <= 0 && targetEnemy.state !== 'staggered') {
      targetEnemy.state = 'staggered';
      targetEnemy.staggerTimer = targetEnemy.staggerDuration;
      targetEnemy.damageFlashTimer = targetEnemy.staggerDuration;
      isStaggered = true;
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
