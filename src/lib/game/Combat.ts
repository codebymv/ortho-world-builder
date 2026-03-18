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
  // Telegraph system
  telegraphTimer: number;      // counts down during telegraph
  telegraphDuration: number;   // how long the telegraph lasts (dodge window)
  recoverTimer: number;        // recovery after attack (vulnerable window)
  recoverDuration: number;
  // Patrol
  patrolOrigin: { x: number; y: number };
  patrolAngle: number;
  patrolRadius: number;
}

export class CombatSystem {
  private enemies: Enemy[] = [];
  private gameState: GameState;

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
      // Telegraph: visible windup before attacking
      telegraphTimer: 0,
      telegraphDuration: 0.8, // 800ms warning — player can dodge
      recoverTimer: 0,
      recoverDuration: 0.6, // 600ms vulnerability after attack
      // Patrol
      patrolOrigin: { ...position },
      patrolAngle: Math.random() * Math.PI * 2,
      patrolRadius: 2 + Math.random() * 2,
    };

    this.enemies.push(enemy);
    return enemy;
  }

  getEnemies(): Enemy[] {
    return this.enemies.filter(e => e.state !== 'dead');
  }

  getAllEnemies(): Enemy[] {
    return this.enemies;
  }

  updateEnemies(deltaTime: number, playerPosition: { x: number; y: number }): void {
    for (const enemy of this.enemies) {
      if (enemy.state === 'dead') continue;

      const dx = playerPosition.x - enemy.position.x;
      const dy = playerPosition.y - enemy.position.y;
      const distance = Math.sqrt(dx * dx + dy * dy);

      switch (enemy.state) {
        case 'idle': {
          // Gentle patrol around origin
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
            // Begin telegraph — visible windup
            enemy.state = 'telegraphing';
            enemy.telegraphTimer = enemy.telegraphDuration;
            break;
          }

          // Move toward player
          if (distance > 0) {
            const moveSpeed = enemy.speed * deltaTime * 60;
            enemy.position.x += (dx / distance) * moveSpeed;
            enemy.position.y += (dy / distance) * moveSpeed;
          }
          break;
        }

        case 'telegraphing': {
          // Freeze in place, showing windup animation
          enemy.telegraphTimer -= deltaTime;

          if (enemy.telegraphTimer <= 0) {
            // Execute attack — check if player is still in range
            const newDist = Math.sqrt(
              Math.pow(playerPosition.x - enemy.position.x, 2) +
              Math.pow(playerPosition.y - enemy.position.y, 2)
            );

            if (newDist <= enemy.attackRange * 1.3) {
              // Player didn't dodge — take damage!
              this.attackPlayer(enemy);
            }
            // Regardless, enter recovery (vulnerable)
            enemy.state = 'recovering';
            enemy.recoverTimer = enemy.recoverDuration;
            enemy.attackAnimationTimer = 0.3;
          }
          break;
        }

        case 'attacking': {
          // Legacy state — shouldn't reach here with new system
          enemy.state = 'recovering';
          enemy.recoverTimer = enemy.recoverDuration;
          break;
        }

        case 'recovering': {
          // Stunned after attack — takes extra damage
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

    // Bonus damage if enemy is recovering (reward for timing)
    let finalDamage = damage;
    if (targetEnemy.state === 'recovering') {
      finalDamage = Math.floor(damage * 1.5); // 50% bonus for punishing recovery
    }

    targetEnemy.health = Math.max(0, targetEnemy.health - finalDamage);
    targetEnemy.damageFlashTimer = 0.2;

    if (targetEnemy.health <= 0) {
      targetEnemy.state = 'dead';
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
