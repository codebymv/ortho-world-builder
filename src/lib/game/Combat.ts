import * as THREE from 'three';
import { GameState } from './GameState';

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
    for (const enemy of this.enemies) {
      if (enemy.state === 'dead') continue;

      const dx = playerPosition.x - enemy.position.x;
      const dy = playerPosition.y - enemy.position.y;
      const distance = Math.sqrt(dx * dx + dy * dy);

      switch (enemy.state) {
        case 'idle': {
          enemy.patrolAngle += deltaTime * 0.5;
          const px = enemy.patrolOrigin.x + Math.cos(enemy.patrolAngle) * enemy.patrolRadius;
          const py = enemy.patrolOrigin.y + Math.sin(enemy.patrolAngle) * enemy.patrolRadius;
          const pdx = px - enemy.position.x;
          const pdy = py - enemy.position.y;
          const pdist = Math.sqrt(pdx * pdx + pdy * pdy);
          if (pdist > 0.1) {
            const moveSpeed = enemy.speed * 0.4 * deltaTime * 60;
            enemy.position.x += (pdx / pdist) * moveSpeed;
            enemy.position.y += (pdy / pdist) * moveSpeed;
          }

          if (distance <= enemy.chaseRange) {
            enemy.state = 'chasing';
          }
          break;
        }

        case 'chasing': {
          if (distance > enemy.chaseRange * 1.5) {
            enemy.state = 'idle';
            break;
          }

          if (distance <= enemy.attackRange) {
            enemy.state = 'telegraphing';
            enemy.telegraphTimer = enemy.telegraphDuration;
            break;
          }

          if (distance > 0) {
            const moveSpeed = enemy.speed * deltaTime * 60;
            enemy.position.x += (dx / distance) * moveSpeed;
            enemy.position.y += (dy / distance) * moveSpeed;
          }
          break;
        }

        case 'telegraphing': {
          enemy.telegraphTimer -= deltaTime;

          if (enemy.telegraphTimer <= 0) {
            const newDist = Math.sqrt(
              Math.pow(playerPosition.x - enemy.position.x, 2) +
              Math.pow(playerPosition.y - enemy.position.y, 2)
            );

            // Player dodging = i-frames, attack misses!
            if (newDist <= enemy.attackRange * 1.3 && !playerDodging) {
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
          break;
        }

        case 'recovering': {
          enemy.recoverTimer -= deltaTime;
          if (enemy.recoverTimer <= 0) {
            enemy.state = distance <= enemy.chaseRange ? 'chasing' : 'idle';
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
    return this.enemies.filter(enemy => {
      if (enemy.state === 'dead') return false;
      const distance = Math.sqrt(
        Math.pow(position.x - enemy.position.x, 2) +
        Math.pow(position.y - enemy.position.y, 2)
      );
      return distance <= range;
    });
  }

  removeDeadEnemies(): Enemy[] {
    const dead = this.enemies.filter(e => e.state === 'dead');
    this.enemies = this.enemies.filter(e => e.state !== 'dead');
    return dead;
  }

  removeDeadEnemiesByIds(ids: string[]): Enemy[] {
    const toRemove = new Set(ids);
    const removed = this.enemies.filter(e => toRemove.has(e.id));
    this.enemies = this.enemies.filter(e => !toRemove.has(e.id));
    return removed;
  }

  clearAllEnemies(): void {
    this.enemies = [];
  }
}
