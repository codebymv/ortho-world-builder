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
  /** When true, ranged attacks emit a Projectile (e.g. thrown scythe) instead of resolving as a melee hit at telegraph end. */
  rangedProjectile?: boolean;
  /** Tiles per second for the thrown projectile. */
  rangedProjectileSpeed?: number;
  /** Sprite key for the projectile (e.g. 'projectile_scythe'). */
  rangedProjectileSprite?: string;
  /** Maximum lifetime (seconds) before the projectile fizzles out. */
  rangedProjectileLifetime?: number;
  /** Number of projectiles released per ranged attack (a fanned volley). Default 1. */
  rangedVolleyCount?: number;
  /** Total angular spread (degrees) of the volley fan, centered on the player. Default 0. */
  rangedVolleySpreadDeg?: number;
  /** Allows this enemy to stand in water and make short shore hops around its patrol origin. */
  amphibiousWaterLeash?: boolean;
  /** Maximum distance from patrol origin while in water or on nearby shore. */
  waterLeashRadius?: number;
  /** Maximum distance from patrol origin for walkable shore tiles. */
  waterShoreRadius?: number;
  /** Runtime visuals may emit small splashes when crossing water/shore boundaries. */
  splashOnWaterTransition?: boolean;
  snareOnHit?: boolean;
  snareDuration?: number;
  snareSpeedMult?: number;
  poiseImmunityFirstHit?: boolean;
  /**
   * Scales forced displacement from player knockback effects.
   * 1 = normal shove, 0 = immovable.
   */
  knockbackResistance?: number;
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
  goldReward?: number;
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
    hp: 85,
    damage: 13,
    sprite: 'enemy_wolf',
    speed: 0.045,
    attackRange: 1.5,
    chaseRange: 6,
    telegraphDuration: 0.5,
    recoverDuration: 0.4,
    poise: 48,
    staggerDuration: 1.2,
    essenceReward: 42,
    goldReward: 4,
    behaviorOverrides: {
      chainAttack: true,
      chainChance: 0.6,
      chainTelegraph: 0.3,
      retreatAfterHit: true,
      retreatDuration: 1.0,
      retreatSpeedMult: 1.5,
      knockbackResistance: 1.15,
    },
  },
  shadow: {
    type: 'shadow',
    name: 'Shadow Reaper',
    hp: 85,
    damage: 17,
    sprite: 'enemy_shadow',
    speed: 0.05,
    attackRange: 1.6,
    chaseRange: 7,
    telegraphDuration: 0.6,
    recoverDuration: 0.5,
    poise: 80,
    staggerDuration: 1.0,
    essenceReward: 42,
    goldReward: 5,
    behaviorOverrides: {
      chainAttack: true,
      chainChance: 0.3,
      chainTelegraph: 0.55,
      knockbackResistance: 0.9,
    },
  },
  shadow_lurker: {
    type: 'shadow_lurker',
    name: 'Hollow Shade',
    hp: 110,
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
    goldReward: 10,
    behaviorOverrides: {
      chainAttack: true,
      chainChance: 0.25,
      chainTelegraph: 0.6,
      knockbackResistance: 0.85,
    },
  },
  hollow_reaver: {
    type: 'hollow_reaver',
    name: 'Hollow Reaver',
    hp: 95,
    damage: 17,
    sprite: 'enemy_hollow_reaver',
    speed: 0.028,
    attackRange: 1.5,
    chaseRange: 7.5,
    telegraphDuration: 0.9,
    recoverDuration: 0.7,
    poise: 60,
    staggerDuration: 1.2,
    essenceReward: 65,
    goldReward: 12,
    behaviorOverrides: {
      rangedAttack: true,
      rangedRange: 3.5,
      rangedChance: 0.7,
      rangedProjectile: true,
      rangedProjectileSpeed: 7.0,
      rangedProjectileSprite: 'projectile_scythe',
      rangedProjectileLifetime: 0.85,
      knockbackResistance: 0.75,
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
    goldReward: 5,
    behaviorOverrides: {
      chainAttack: true,
      chainChance: 0.4,
      chainTelegraph: 0.45,
      knockbackResistance: 1.0,
    },
  },
  plant: {
    type: 'plant',
    name: 'Vine Terror',
    hp: 100,
    damage: 15,
    sprite: 'enemy_plant',
    speed: 0.02,
    attackRange: 2.2,
    chaseRange: 5,
    telegraphDuration: 1.0,
    recoverDuration: 1.0,
    poise: 50,
    staggerDuration: 0.8,
    essenceReward: 50,
    goldReward: 4,
    behaviorOverrides: {
      snareOnHit: true,
      snareDuration: 1.5,
      snareSpeedMult: 0.6,
      knockbackResistance: 0.55,
    },
  },
  skeleton: {
    type: 'skeleton',
    name: 'Skeleton Warrior',
    hp: 110,
    damage: 17,
    sprite: 'enemy_skeleton',
    speed: 0.035,
    attackRange: 1.8,
    chaseRange: 6,
    telegraphDuration: 0.9,
    recoverDuration: 0.7,
    poise: 55,
    staggerDuration: 1.4,
    essenceReward: 55,
    goldReward: 5,
    behaviorOverrides: {
      retreatAfterHit: true,
      retreatDuration: 0.6,
      retreatSpeedMult: 1.3,
      knockbackResistance: 0.75,
    },
  },
  skeleton_captain: {
    type: 'skeleton_captain',
    name: 'Skeleton Captain',
    hp: 110,
    damage: 24,
    sprite: 'enemy_skeleton_captain',
    speed: 0.032,
    attackRange: 1.8,
    chaseRange: 7,
    telegraphDuration: 0.85,
    recoverDuration: 0.65,
    poise: 120,
    staggerDuration: 1.8,
    essenceReward: 40,
    goldReward: 14,
    behaviorOverrides: {
      poiseImmunityFirstHit: true,
      knockbackResistance: 0.65,
    },
  },
  bandit: {
    type: 'bandit',
    name: 'Bandit',
    hp: 90,
    damage: 14,
    sprite: 'enemy_bandit',
    speed: 0.055,
    attackRange: 1.5,
    chaseRange: 7,
    telegraphDuration: 0.7,
    recoverDuration: 0.5,
    poise: 50,
    staggerDuration: 1.5,
    essenceReward: 45,
    goldReward: 5,
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
    goldReward: 22,
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
      knockbackResistance: 0.2,
    },
  },
  spider: {
    type: 'spider',
    name: 'Giant Spider',
    hp: 70,
    damage: 14,
    sprite: 'enemy_spider',
    speed: 0.042,
    attackRange: 1.4,
    chaseRange: 6,
    telegraphDuration: 0.58,
    recoverDuration: 0.55,
    poise: 42,
    staggerDuration: 1.8,
    essenceReward: 35,
    goldReward: 3,
    behaviorOverrides: {
      rangedAttack: true,
      rangedRange: 2.6,
      rangedChance: 0.26,
      rangedProjectile: true,
      rangedProjectileSpeed: 4.2,
      rangedProjectileSprite: 'projectile_shell',
      rangedProjectileLifetime: 0.85,
      snareOnHit: true,
      snareDuration: 0.5,
      snareSpeedMult: 0.6,
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
      knockbackResistance: 0.15,
    },
  },
  armored_wolf: {
    type: 'armored_wolf',
    name: 'Armored Wolf',
    hp: 80,
    damage: 22,
    sprite: 'enemy_armored_wolf',
    speed: 0.038,
    attackRange: 1.5,
    chaseRange: 7,
    telegraphDuration: 0.6,
    recoverDuration: 0.5,
    poise: 100,
    staggerDuration: 1.6,
    essenceReward: 25,
    goldReward: 12,
    behaviorOverrides: {
      poiseImmunityFirstHit: true,
      knockbackResistance: 0.65,
    },
  },
  stone_sentinel: {
    type: 'stone_sentinel',
    name: 'Stone Sentinel',
    hp: 220,
    damage: 42,
    sprite: 'enemy_stone_sentinel',
    speed: 0.033,
    attackRange: 1.8,
    chaseRange: 10,
    // Big punish hit (42 dmg ≈ 2.4-hit kill) needs a readable wind-up — was 0.7s, too fast
    // for the damage; 1.0s keeps it a hard "don't greed the chest" wall you CAN react to.
    telegraphDuration: 1.0,
    recoverDuration: 0.55,
    poise: 250,
    staggerDuration: 1.2,
    essenceReward: 85,
    goldReward: 18,
    behaviorOverrides: {
      poiseImmunityFirstHit: true,
      knockbackResistance: 0.4,
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
      knockbackResistance: 0.18,
    },
  },
  slime: {
    type: 'slime',
    name: 'Green Slime',
    hp: 60,
    damage: 8,
    sprite: 'enemy_slime',
    speed: 0.03,
    attackRange: 1.2,
    chaseRange: 4,
    telegraphDuration: 1.2,
    recoverDuration: 0.8,
    poise: 38,
    staggerDuration: 1.0,
    essenceReward: 30,
    goldReward: 3,
    behaviorOverrides: {
      rangedAttack: true,
      rangedRange: 2.2,
      rangedChance: 0.4,
      rangedProjectile: true,
      rangedProjectileSpeed: 3.5,
      rangedProjectileSprite: 'projectile_shell',
      rangedProjectileLifetime: 0.8,
    },
  },
  water_slime: {
    type: 'water_slime',
    name: 'Water Slime',
    hp: 60,
    damage: 8,
    sprite: 'enemy_water_slime',
    speed: 0.028,
    attackRange: 1.1,
    chaseRange: 5.5,
    telegraphDuration: 1.05,
    recoverDuration: 0.85,
    poise: 38,
    staggerDuration: 1.0,
    essenceReward: 32,
    goldReward: 3,
    behaviorOverrides: {
      rangedAttack: true,
      rangedRange: 3.25,
      rangedChance: 0.65,
      rangedProjectile: true,
      rangedProjectileSpeed: 4.8,
      rangedProjectileSprite: 'projectile_shell',
      rangedProjectileLifetime: 1.5,
      amphibiousWaterLeash: true,
      waterLeashRadius: 10,
      waterShoreRadius: 8,
      splashOnWaterTransition: true,
    },
  },
  corrupted_giant: {
    type: 'corrupted_giant',
    name: 'Corrupted Giant',
    hp: 480,
    damage: 24,
    sprite: 'enemy_corrupted_giant',
    speed: 0.017,
    attackRange: 2.4,
    chaseRange: 9,
    telegraphDuration: 1.4,
    recoverDuration: 1.1,
    poise: 280,
    staggerDuration: 1.8,
    essenceReward: 180,
    goldReward: 32,
    behaviorOverrides: {
      // Relentless chain pressure — 50% follow-up before phase 2, ramps to 75% after
      chainAttack: true,
      chainChance: 0.5,
      chainTelegraph: 1.0,
      // Crushing weight — roots the player briefly on every clean hit
      snareOnHit: true,
      snareDuration: 0.9,
      snareSpeedMult: 0.4,
      // First stagger is absorbed — corruption-hardened flesh
      poiseImmunityFirstHit: true,
      knockbackResistance: 0.25,
    },
  },
  ridge_revenant: {
    type: 'ridge_revenant',
    name: 'Ridge Revenant',
    // 680 -> 560 (-18%): an OPTIONAL early field boss whose appeal is rewarding aggression.
    // Its offense is the real skill check (38 dmg ~3-hit kill, 0.35s chain telegraph, snare),
    // so the HP pool comes down to stop a perfectly-dodged fight being a 20+ hit slog with the
    // broadsword. Stays clearly tankier than the Corrupted Giant (480), below the Hollow boss (800).
    hp: 560,
    damage: 38,
    sprite: 'enemy_ridge_revenant',
    speed: 0.025,
    attackRange: 2.4,
    chaseRange: 12,
    telegraphDuration: 1.15,
    recoverDuration: 0.85,
    poise: 340,
    staggerDuration: 1.4,
    essenceReward: 175,
    goldReward: 30,
    behaviorOverrides: {
      chainAttack: true,
      chainChance: 0.45,
      chainTelegraph: 0.35,
      snareOnHit: true,
      snareDuration: 1.0,
      snareSpeedMult: 0.35,
      poiseImmunityFirstHit: true,
    },
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
