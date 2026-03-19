export interface EnemyBlueprint {
  type: string;
  name: string;
  hp: number;
  damage: number;
  sprite: string;
  speed?: number;
  attackRange?: number;
  chaseRange?: number;
  goldReward?: number;
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
};
