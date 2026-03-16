import * as THREE from 'three';

export interface PlayerState {
  position: { x: number; y: number };
  direction: 'up' | 'down' | 'left' | 'right';
  isMoving: boolean;
  speed: number;
  health: number;
  maxHealth: number;
  gold: number;
  attackDamage: number;
  attackRange: number;
  lastAttackTime: number;
  attackCooldown: number;
  damageFlashTimer: number;
  attackAnimationTimer: number;
}

export interface NPC {
  id: string;
  name: string;
  position: { x: number; y: number };
  dialogueId: string;
  sprite: string;
  questGiver?: boolean;
}

export interface Item {
  id: string;
  name: string;
  description: string;
  type: 'consumable' | 'key' | 'quest';
  sprite: string;
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

export class GameState {
  player: PlayerState;
  inventory: Item[];
  quests: Quest[];
  npcs: NPC[];
  scene: THREE.Scene;
  camera: THREE.OrthographicCamera;
  currentMap: string;
  dialogueActive: boolean;
  currentDialogue: string | null;
  gameFlags: Record<string, boolean>;

  constructor(scene: THREE.Scene, camera: THREE.OrthographicCamera) {
    this.scene = scene;
    this.camera = camera;
    this.currentMap = 'village';
    this.dialogueActive = false;
    this.currentDialogue = null;
    this.gameFlags = {};
    
    this.player = {
      position: { x: 0, y: 0 },
      direction: 'down',
      isMoving: false,
      speed: 0.08,
      health: 100,
      maxHealth: 100,
      gold: 0,
      attackDamage: 20,
      attackRange: 2,
      lastAttackTime: 0,
      attackCooldown: 500,
      damageFlashTimer: 0,
      attackAnimationTimer: 0,
    };

    this.inventory = [];
    this.quests = [];
    this.npcs = [];
  }

  addItem(item: Item) {
    this.inventory.push(item);
  }

  removeItem(itemId: string) {
    this.inventory = this.inventory.filter(item => item.id !== itemId);
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
        this.player.gold += quest.reward.gold;
      }
    }
  }

  setFlag(flag: string, value: boolean) {
    this.gameFlags[flag] = value;
  }

  getFlag(flag: string): boolean {
    return this.gameFlags[flag] || false;
  }
}
