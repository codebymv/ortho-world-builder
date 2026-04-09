export interface EnemyBehaviorOverrides {
  chainAttack?: boolean;
  chainChance?: number;
  chainTelegraph?: number;
  retreatAfterHit?: boolean;
  retreatDuration?: number;
  retreatSpeedMult?: number;
  rangedAttack?: boolean;
  rangedRange?: number;
  rangedChance?: number;
  snareOnHit?: boolean;
  snareDuration?: number;
  snareSpeedMult?: number;
  poiseImmunityFirstHit?: boolean;
}

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
  behaviorOverrides?: EnemyBehaviorOverrides;
  /** Optional faction key. Enemies with different factions will fight each other. */
  faction?: string;
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
    behaviorOverrides: {
      chainAttack: true,
      chainChance: 0.6,
      chainTelegraph: 0.3,
      retreatAfterHit: true,
      retreatDuration: 1.0,
      retreatSpeedMult: 1.5,
    },
  },
  shadow: {
    type: 'shadow',
    name: 'Shadow Reaper',
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
    behaviorOverrides: {
      chainAttack: true,
      chainChance: 0.3,
      chainTelegraph: 0.55,
    },
  },
  shadow_lurker: {
    type: 'shadow_lurker',
    name: 'Hollow Shade',
    hp: 70,
    damage: 18,
    sprite: 'enemy_shadow',
    speed: 0.038,
    attackRange: 1.7,
    chaseRange: 2.8,
    telegraphDuration: 0.75,
    recoverDuration: 0.6,
    poise: 90,
    staggerDuration: 1.1,
    essenceReward: 55,
    behaviorOverrides: {
      chainAttack: true,
      chainChance: 0.25,
      chainTelegraph: 0.6,
    },
  },
  void_wisp: {
    type: 'void_wisp',
    name: 'Void Wisp',
    hp: 80,
    damage: 18,
    sprite: 'enemy_void_wisp',
    speed: 0.055,
    attackRange: 1.5,
    chaseRange: 8,
    telegraphDuration: 0.5,
    recoverDuration: 0.45,
    poise: 60,
    staggerDuration: 0.8,
    essenceReward: 45,
    behaviorOverrides: {
      chainAttack: true,
      chainChance: 0.4,
      chainTelegraph: 0.45,
    },
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
    behaviorOverrides: {
      snareOnHit: true,
      snareDuration: 1.5,
      snareSpeedMult: 0.6,
    },
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
  skeleton_captain: {
    type: 'skeleton_captain',
    name: 'Skeleton Captain',
    hp: 110,
    damage: 20,
    sprite: 'enemy_skeleton_captain',
    speed: 0.032,
    attackRange: 1.8,
    chaseRange: 7,
    telegraphDuration: 0.85,
    recoverDuration: 0.65,
    poise: 120,
    staggerDuration: 1.2,
    essenceReward: 40,
    behaviorOverrides: {
      poiseImmunityFirstHit: true,
    },
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
    hp: 340,
    damage: 28,
    sprite: 'enemy_golem',
    speed: 0.016,
    attackRange: 2.2,
    chaseRange: 7,
    telegraphDuration: 1.6,
    recoverDuration: 1.3,
    poise: 300,
    staggerDuration: 2.2,
    essenceReward: 80,
    behaviorOverrides: {
      // Chains a slower follow-up slam 40% of the time after the first hit
      chainAttack: true,
      chainChance: 0.4,
      chainTelegraph: 1.1,
      // First poise break is absorbed — reinforced stone shell
      poiseImmunityFirstHit: true,
      // Snares the player briefly on hit — crushing weight
      snareOnHit: true,
      snareDuration: 0.8,
      snareSpeedMult: 0.45,
    },
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
    behaviorOverrides: {
      rangedAttack: true,
      rangedRange: 3.0,
      rangedChance: 0.5,
    },
  },
  hollow_guardian: {
    type: 'hollow_guardian',
    name: 'Hollow Apparition',
    hp: 800,
    damage: 20,
    sprite: 'enemy_hollow_guardian',
    speed: 0.018,
    attackRange: 2.2,
    chaseRange: 14,
    telegraphDuration: 1.2,
    recoverDuration: 0.9,
    poise: 350,
    staggerDuration: 1.4,
    essenceReward: 400,
    behaviorOverrides: {
      chainAttack: true,
      chainChance: 0.2,
      chainTelegraph: 0.8,
    },
  },
  armored_wolf: {
    type: 'armored_wolf',
    name: 'Armored Wolf',
    hp: 80,
    damage: 18,
    sprite: 'enemy_armored_wolf',
    speed: 0.038,
    attackRange: 1.5,
    chaseRange: 7,
    telegraphDuration: 0.6,
    recoverDuration: 0.5,
    poise: 100,
    staggerDuration: 0.9,
    essenceReward: 25,
    behaviorOverrides: {
      poiseImmunityFirstHit: true,
    },
  },
  stone_sentinel: {
    type: 'stone_sentinel',
    name: 'Stone Sentinel',
    hp: 220,
    damage: 36,
    sprite: 'enemy_stone_sentinel',
    speed: 0.033,
    attackRange: 1.8,
    chaseRange: 10,
    telegraphDuration: 0.7,
    recoverDuration: 0.55,
    poise: 250,
    staggerDuration: 1.2,
    essenceReward: 85,
    behaviorOverrides: {
      poiseImmunityFirstHit: true,
    },
  },
  ashen_reaver: {
    type: 'ashen_reaver',
    name: 'Ashen Reaver',
    hp: 1200,
    damage: 32,
    sprite: 'enemy_ashen_reaver',
    speed: 0.022,
    attackRange: 2.4,
    chaseRange: 16,
    telegraphDuration: 1.0,
    recoverDuration: 0.7,
    poise: 500,
    staggerDuration: 1.2,
    essenceReward: 600,
    behaviorOverrides: {
      chainAttack: true,
      chainChance: 0.35,
      chainTelegraph: 0.7,
      poiseImmunityFirstHit: true,
    },
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
