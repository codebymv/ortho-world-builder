import * as THREE from 'three';
import { GameState } from './GameState';

type CardinalDirection = 'up' | 'down' | 'left' | 'right';

export interface Enemy {
  id: string;
  name: string;
  position: { x: number; y: number };
  health: number;
  maxHealth: number;
  damage: number;
  xpReward: number;
  goldReward: number;
  sprite: string;
  speed: number;
  attackRange: number;
  chaseRange: number;
  state: 'idle' | 'chasing' | 'telegraphing' | 'attacking' | 'recovering' | 'dead';
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
}

export class CombatSystem {
  private enemies: Enemy[] = [];
  private gameState: GameState;
  private _cachedLiveEnemies: Enemy[] = [];
  private _enemiesDirty: boolean = true;

  constructor(gameState: GameState) {
    this.gameState = gameState;
  }

  spawnEnemy(
    name: string,
    position: { x: number; y: number },
    health: number,
    damage: number,
    sprite: string
  ): Enemy {
    const enemy: Enemy = {
      id: `enemy_${Date.now()}_${Math.random()}`,
      name,
      position: { ...position },
      health,
      maxHealth: health,
      damage,
      xpReward: health * 2,
      goldReward: Math.floor(health / 2),
      sprite,
      speed: 0.04,
      attackRange: 1.5,
      chaseRange: 6,
      state: 'idle',
      lastAttackTime: 0,
      attackCooldown: 2000,
      damageFlashTimer: 0,
      attackAnimationTimer: 0,
      telegraphTimer: 0,
      telegraphDuration: 0.8,
      recoverTimer: 0,
      recoverDuration: 0.6,
      patrolOrigin: { ...position },
      patrolAngle: Math.random() * Math.PI * 2,
      patrolRadius: 2 + Math.random() * 2,
      facing: 'down',
      moveCycle: Math.random() * Math.PI * 2,
      moveBlend: 0,
      velocity: { x: 0, y: 0 },
    };

    this.enemies.push(enemy);
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

  updateEnemies(deltaTime: number, playerPosition: { x: number; y: number }, playerDodging: boolean = false): void {
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

    for (const enemy of this.enemies) {
      if (enemy.state === 'dead') continue;

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
            const pdist = Math.sqrt(pdistSq);
            const moveSpeed = enemy.speed * 0.4 * deltaTime * 60;
            const nvx = pdx / pdist;
            const nvy = pdy / pdist;
            enemy.position.x += nvx * moveSpeed;
            enemy.position.y += nvy * moveSpeed;
            updateMovementVisuals(enemy, nvx, nvy, true, 7);
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
            const dist = Math.sqrt(distSq);
            const moveSpeed = enemy.speed * deltaTime * 60;
            const nvx = dx / dist;
            const nvy = dy / dist;
            enemy.position.x += nvx * moveSpeed;
            enemy.position.y += nvy * moveSpeed;
            updateMovementVisuals(enemy, nvx, nvy, true, 10);
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

            if (newDistSq <= extAttackRangeSq && !playerDodging) {
              this.attackPlayer(enemy);
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
      }
    }
  }

  private attackPlayer(enemy: Enemy): void {
    this.gameState.player.health = Math.max(0, this.gameState.player.health - enemy.damage);
    this.gameState.player.damageFlashTimer = 0.3;
    enemy.attackAnimationTimer = 0.3;
  }

  playerAttack(targetEnemy: Enemy, damage: number): boolean {
    if (targetEnemy.state === 'dead') return false;

    let finalDamage = damage;
    if (targetEnemy.state === 'recovering') {
      finalDamage = Math.floor(damage * 1.5);
    }

    targetEnemy.health = Math.max(0, targetEnemy.health - finalDamage);
    targetEnemy.damageFlashTimer = 0.2;

    if (targetEnemy.health <= 0) {
      targetEnemy.state = 'dead';
      this._enemiesDirty = true;
      this.gameState.player.gold += targetEnemy.goldReward;
      return true;
    }

    return false;
  }

  getEnemiesInRange(position: { x: number; y: number }, range: number): Enemy[] {
    const rangeSq = range * range;
    return this.enemies.filter(enemy => {
      if (enemy.state === 'dead') return false;
      const dx = position.x - enemy.position.x;
      const dy = position.y - enemy.position.y;
      return (dx * dx + dy * dy) <= rangeSq;
    });
  }

  removeDeadEnemies(): Enemy[] {
    const dead = this.enemies.filter(e => e.state === 'dead');
    this.enemies = this.enemies.filter(e => e.state !== 'dead');
    this._enemiesDirty = true;
    return dead;
  }

  removeDeadEnemiesByIds(ids: string[]): Enemy[] {
    const toRemove = new Set(ids);
    const removed = this.enemies.filter(e => toRemove.has(e.id));
    this.enemies = this.enemies.filter(e => !toRemove.has(e.id));
    this._enemiesDirty = true;
    return removed;
  }

  clearAllEnemies(): void {
    this.enemies = [];
    this._enemiesDirty = true;
  }
}
