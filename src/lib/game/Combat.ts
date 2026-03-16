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
  state: 'idle' | 'chasing' | 'attacking' | 'dead';
  lastAttackTime: number;
  attackCooldown: number;
  damageFlashTimer: number;
  attackAnimationTimer: number;
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
      position,
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
      attackCooldown: 1500,
      damageFlashTimer: 0,
      attackAnimationTimer: 0,
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
    const currentTime = Date.now();

    for (const enemy of this.enemies) {
      if (enemy.state === 'dead') continue;

      const distance = Math.sqrt(
        Math.pow(playerPosition.x - enemy.position.x, 2) +
        Math.pow(playerPosition.y - enemy.position.y, 2)
      );

      // State transitions
      if (distance <= enemy.attackRange) {
        enemy.state = 'attacking';
      } else if (distance <= enemy.chaseRange) {
        enemy.state = 'chasing';
      } else {
        enemy.state = 'idle';
      }

      // Behavior
      if (enemy.state === 'chasing') {
        // Move toward player (delta-time based)
        const dx = playerPosition.x - enemy.position.x;
        const dy = playerPosition.y - enemy.position.y;
        const length = Math.sqrt(dx * dx + dy * dy);

        if (length > 0) {
          const moveSpeed = enemy.speed * deltaTime * 60; // normalize to ~60fps baseline
          enemy.position.x += (dx / length) * moveSpeed;
          enemy.position.y += (dy / length) * moveSpeed;
        }
      } else if (enemy.state === 'attacking') {
        // Attack player if cooldown ready
        if (currentTime - enemy.lastAttackTime >= enemy.attackCooldown) {
          this.attackPlayer(enemy);
          enemy.lastAttackTime = currentTime;
        }
      }
    }
  }

  private attackPlayer(enemy: Enemy): void {
    this.gameState.player.health = Math.max(0, this.gameState.player.health - enemy.damage);
    this.gameState.player.damageFlashTimer = 0.2;
    enemy.attackAnimationTimer = 0.2; // Enemy attack lunge animation
  }

  playerAttack(targetEnemy: Enemy, damage: number): boolean {
    if (targetEnemy.state === 'dead') return false;

    targetEnemy.health = Math.max(0, targetEnemy.health - damage);

    targetEnemy.damageFlashTimer = 0.2; // 200ms flash

    if (targetEnemy.health <= 0) {
      targetEnemy.state = 'dead';
      this.gameState.player.gold += targetEnemy.goldReward;
      return true; // Enemy died
    }

    return false; // Enemy still alive
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
