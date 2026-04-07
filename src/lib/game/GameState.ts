import * as THREE from 'three';
import { items } from '../../data/items';

export interface PlayerState {
  position: { x: number; y: number };
  direction: 'up' | 'down' | 'left' | 'right';
  isMoving: boolean;
  speed: number;
  sprintSpeed: number;
  isSprinting: boolean;
  health: number;
  maxHealth: number;
  gold: number;
  essence: number;
  attackDamage: number;
  attackRange: number;
  lastAttackTime: number;
  attackCooldown: number;
  damageFlashTimer: number;
  attackAnimationTimer: number;
  isDodging: boolean;
  dodgeTimer: number;
  iFrameTimer: number;
  dodgeDuration: number;
  dodgeCooldown: number;
  lastDodgeTime: number;
  dodgeDirection: { x: number; y: number };
  dodgeSpeed: number;
  stamina: number;
  maxStamina: number;
  staminaRegenRate: number;
  staminaRegenDelay: number;
  lastStaminaUseTime: number;
  guardBrokenTimer: number;
  parryBonusTimer: number;
  snareTimer: number;
  snareSpeedMult: number;
  stealthTimer: number;
  stealthDetectionMult: number;
  level: number;
  vitality: number;
  endurance: number;
  strength: number;
}

export interface NPC {
  id: string;
  name: string;
  mapId?: string;
  position: { x: number; y: number };
  dialogueId: string;
  sprite: string;
  questGiver?: boolean;
}

export interface Item {
  id: string;
  name: string;
  description: string;
  type: 'consumable' | 'key' | 'quest' | 'equipment';
  sprite: string;
  healAmount?: number;
  buffType?: 'stealth';
  buffDuration?: number;
  stats?: {
    damage?: number;
    range?: number;
  };
}

export interface Quest {
  id: string;
  title: string;
  description: string;
  objectives: string[];
  completed: boolean;
  active: boolean;
  reward?: { gold?: number; items?: string[] };
}

export interface LastBonfire {
  mapId: string;
  x: number;
  y: number;
}

export interface DroppedEssence {
  mapId: string;
  x: number;
  y: number;
  amount: number;
}

export interface CurrencyGain {
  kind: 'gold' | 'essence';
  amount: number;
}

export interface WorldItem {
  /** Unique instance id (e.g. uuid or `itemId_mapId_x_y`) */
  instanceId: string;
  itemId: string;
  mapId: string;
  x: number;
  y: number;
}

export class GameState {
  player: PlayerState;
  inventory: Item[];
  activeItemIndex: number;
  equippedWeaponId: string | null;
  /** Last rested bonfire — respawn point */
  lastBonfire: LastBonfire | null;
  /** Bloodstain left on death */
  droppedEssence: DroppedEssence | null;
  quests: Quest[];
  npcs: NPC[];
  scene: THREE.Scene;
  camera: THREE.OrthographicCamera;
  currentMap: string;
  dialogueActive: boolean;
  currentDialogue: string | null;
  gameFlags: Record<string, boolean | number>;
  /** Items dropped in the world (persisted across sessions) */
  worldItems: WorldItem[];
  onItemAdded: ((item: Item) => void) | null;
  onCurrencyGained: ((gain: CurrencyGain) => void) | null;

  constructor(scene: THREE.Scene, camera: THREE.OrthographicCamera) {
    this.scene = scene;
    this.camera = camera;
    this.currentMap = 'village';
    this.dialogueActive = false;
    this.currentDialogue = null;
    this.gameFlags = {};
    this.onItemAdded = null;
    this.onCurrencyGained = null;
    
    this.player = {
      position: { x: 0, y: 0 },
      direction: 'down',
      isMoving: false,
      speed: 0.0605,
      sprintSpeed: 0.11,
      isSprinting: false,
      health: 100,
      maxHealth: 100,
      gold: 0,
      essence: 0,
      attackDamage: 20,
      attackRange: 2,
      lastAttackTime: 0,
      attackCooldown: 500,
      damageFlashTimer: 0,
      attackAnimationTimer: 0,
      isDodging: false,
      dodgeTimer: 0,
      iFrameTimer: 0,
      dodgeDuration: 0.25,
      dodgeCooldown: 600,
      lastDodgeTime: 0,
      dodgeDirection: { x: 0, y: 0 },
      dodgeSpeed: 0.12,
      stamina: 120,
      maxStamina: 120,
      staminaRegenRate: 44,
      staminaRegenDelay: 0.38,
      lastStaminaUseTime: 0,
      guardBrokenTimer: 0,
      parryBonusTimer: 0,
      snareTimer: 0,
      snareSpeedMult: 1.0,
      stealthTimer: 0,
      stealthDetectionMult: 1.0,
      level: 1,
      vitality: 1,
      endurance: 1,
      strength: 1,
    };

    this.inventory = [{ ...items.meek_short_sword }];
    this.activeItemIndex = 0;
    this.equippedWeaponId = items.meek_short_sword.id;
    this.lastBonfire = null;
    this.droppedEssence = null;
    this.worldItems = [];
    this.quests = [];
    this.npcs = [];
  }

  addItem(item: Item) {
    if (item.type === 'consumable') {
      const lastMatchingIndex = this.inventory.reduce((lastIndex, inventoryItem, index) => (
        inventoryItem.id === item.id ? index : lastIndex
      ), -1);

      if (lastMatchingIndex >= 0) {
        this.inventory = [
          ...this.inventory.slice(0, lastMatchingIndex + 1),
          item,
          ...this.inventory.slice(lastMatchingIndex + 1),
        ];
      } else {
        this.inventory = [...this.inventory, item];
      }
    } else {
      this.inventory = [...this.inventory, item];
    }
    this.onItemAdded?.(item);
    if (item.type === 'equipment' && !this.equippedWeaponId) {
      this.setEquippedWeapon(item.id);
    }
  }

  addGold(amount: number) {
    if (amount <= 0) return;
    this.player.gold += amount;
    this.onCurrencyGained?.({ kind: 'gold', amount });
  }

  spendGold(amount: number) {
    if (amount <= 0) return;
    this.player.gold = Math.max(0, this.player.gold - amount);
  }

  addEssence(amount: number) {
    if (amount <= 0) return;
    this.player.essence += amount;
    this.onCurrencyGained?.({ kind: 'essence', amount });
  }

  removeItem(itemId: string) {
    const index = this.inventory.findIndex(item => item.id === itemId);
    if (index !== -1) {
      this.inventory = [
        ...this.inventory.slice(0, index),
        ...this.inventory.slice(index + 1)
      ];
      if (this.equippedWeaponId === itemId) {
        this.setEquippedWeapon(null);
      }
    }
  }

  hasItem(itemId: string): boolean {
    return this.inventory.some(item => item.id === itemId);
  }

  addQuest(quest: Quest) {
    this.quests.push(quest);
  }

  completeQuest(questId: string) {
    const quest = this.quests.find(q => q.id === questId);
    if (quest) {
      quest.completed = true;
      quest.active = false;
      if (quest.reward?.gold) {
        this.addGold(quest.reward.gold);
      }
      quest.reward?.items?.forEach(itemId => {
        const rewardItem = items[itemId];
        if (rewardItem) this.addItem({ ...rewardItem });
      });
    }
  }

  setEquippedWeapon(itemId: string | null) {
    const equipped =
      (itemId ? this.inventory.find(item => item.id === itemId && item.type === 'equipment') : undefined) ??
      this.inventory.find(item => item.type === 'equipment');

    this.equippedWeaponId = equipped?.id ?? null;
    const baseDamage = equipped?.stats?.damage ?? 20;
    this.player.attackDamage = baseDamage + (this.player.strength - 1) * 3;
    this.player.attackRange = equipped?.stats?.range ?? 2;
  }

  getLevelUpCost(): number {
    return Math.floor(80 + (this.player.level - 1) * 40 + (this.player.level - 1) ** 1.8 * 12);
  }

  levelUpStat(stat: 'vitality' | 'endurance' | 'strength'): boolean {
    const cost = this.getLevelUpCost();
    if (this.player.essence < cost) return false;

    this.player.essence -= cost;
    this.player[stat] += 1;
    this.player.level += 1;

    this.player.maxHealth = 100 + (this.player.vitality - 1) * 20;
    this.player.health = this.player.maxHealth;
    this.player.maxStamina = 120 + (this.player.endurance - 1) * 15;
    this.player.stamina = this.player.maxStamina;

    const weapon = this.equippedWeaponId
      ? this.inventory.find(i => i.id === this.equippedWeaponId)
      : undefined;
    const baseWeaponDamage = weapon?.stats?.damage ?? 20;
    this.player.attackDamage = baseWeaponDamage + (this.player.strength - 1) * 3;

    return true;
  }

  setFlag(flag: string, value: boolean | number) {
    this.gameFlags[flag] = value;
  }

  getFlag(flag: string): boolean | number {
    return this.gameFlags[flag] || false;
  }
}
