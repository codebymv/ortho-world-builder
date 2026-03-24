export interface EnemyBlueprint {
  type: string;
  name: string;
  hp: number;
  damage: number;
  sprite: string;
  speed?: number;
  attackRange?: number;
  chaseRange?: number;
  essenceReward?: number;
  telegraphDuration?: number;
  recoverDuration?: number;
  poise?: number;
  staggerDuration?: number;
}

export const ENEMY_BLUEPRINTS: Record<string, EnemyBlueprint> = {
  wolf: {
    type: 'wolf',
    name: 'Forest Wolf',
    hp: 40,
    damage: 10,
    sprite: 'enemy_wolf',
    speed: 0.045,
    attackRange: 1.5,
    chaseRange: 6,
    telegraphDuration: 0.5,
    recoverDuration: 0.4,
    poise: 60,
    staggerDuration: 1.2,
  },
  shadow: {
    type: 'shadow',
    name: 'Shadow Creature',
    hp: 60,
    damage: 15,
    sprite: 'enemy_shadow',
    speed: 0.05,
    attackRange: 1.6,
    chaseRange: 7,
    telegraphDuration: 0.6,
    recoverDuration: 0.5,
    poise: 80,
    staggerDuration: 1.0,
  },
  plant: {
    type: 'plant',
    name: 'Vine Terror',
    hp: 50,
    damage: 12,
    sprite: 'enemy_plant',
    speed: 0.02,
    attackRange: 2.2,
    chaseRange: 5,
    telegraphDuration: 1.0,
    recoverDuration: 1.0,
    poise: 120,
    staggerDuration: 0.8,
  },
  skeleton: {
    type: 'skeleton',
    name: 'Skeleton Warrior',
    hp: 55,
    damage: 14,
    sprite: 'enemy_skeleton',
    speed: 0.035,
    attackRange: 1.8,
    chaseRange: 6,
    telegraphDuration: 0.9,
    recoverDuration: 0.7,
    poise: 70,
    staggerDuration: 1.4,
  },
  bandit: {
    type: 'bandit',
    name: 'Bandit',
    hp: 45,
    damage: 11,
    sprite: 'enemy_bandit',
    speed: 0.055,
    attackRange: 1.5,
    chaseRange: 7,
    telegraphDuration: 0.7,
    recoverDuration: 0.5,
    poise: 50,
    staggerDuration: 1.5,
  },
  golem: {
    type: 'golem',
    name: 'Stone Golem',
    hp: 200,
    damage: 25,
    sprite: 'enemy_golem',
    speed: 0.02,
    attackRange: 2.0,
    chaseRange: 5,
    telegraphDuration: 1.5,
    recoverDuration: 1.2,
    poise: 200,
    staggerDuration: 2.0,
  },
  spider: {
    type: 'spider',
    name: 'Giant Spider',
    hp: 35,
    damage: 8,
    sprite: 'enemy_spider',
    speed: 0.06,
    attackRange: 1.4,
    chaseRange: 8,
    telegraphDuration: 0.4,
    recoverDuration: 0.3,
    poise: 30,
    staggerDuration: 1.8,
  },
  slime: {
    type: 'slime',
    name: 'Green Slime',
    hp: 25,
    damage: 5,
    sprite: 'enemy_slime',
    speed: 0.03,
    attackRange: 1.2,
    chaseRange: 4,
    telegraphDuration: 1.2,
    recoverDuration: 0.8,
    poise: 40,
    staggerDuration: 1.0,
  },
};

export const DEFAULT_ENEMY: EnemyBlueprint = {
  type: 'wolf',
  name: 'Wild Beast',
  hp: 40,
  damage: 10,
  sprite: 'enemy_wolf',
  speed: 0.04,
  attackRange: 1.5,
  chaseRange: 6,
  telegraphDuration: 0.8,
  recoverDuration: 0.6,
  poise: 60,
  staggerDuration: 1.2,
};
