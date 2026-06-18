import * as THREE from 'three';
import { items } from '../../data/items';
import {
  MAX_EPHEMERAL_EXTRACT_CHARGES,
  EPHEMERAL_EXTRACT_CHARGES_PER_UPGRADE,
  EPHEMERAL_EXTRACT_POTENCY_PER_UPGRADE,
} from '../../data/balance';
import {
  canAffordEphemeralExtractUpgrade,
  getEphemeralExtractUpgradeLevel,
  getVestigeCostForUpgradeLevel,
  isEphemeralExtractUpgradeMaxed,
} from './vestigeProgression';

/**
 * Hand-curated names of game flags set anywhere in the codebase.
 *
 * Adding a flag here is optional - `setFlag`/`getFlag` still accept any
 * `string` - but listing it unlocks autocomplete and a "find references"
 * starting point. Dynamic keys (e.g. `tempest_grass_${map}_${x}_${y}`,
 * `${interactionId}_opened`) are intentionally not listed.
 */
export type KnownGameFlag =
  | 'ashen_reaver_defeated'
  | 'blighted_root_destroyed'
  | 'chapel_key_collected'
  | 'cliff_corridor_ladder_extended'
  | 'fort_ridge_ladder_extended'
  | 'forest_fort_gate_open'
  | 'forest_golem_defeated'
  | 'forest_kill_count'
  | 'grove_shelf_shortcut_open'
  | 'highlanders_plains_gate_open'
  | 'western_preserve_gate_open'
  | 'quarry_bank_shortcut_open'
  | 'west_lake_bridge_plank_extended'
  | 'west_cliff_gate_open'
  | 'south_entry_picket_gate_open'
  | 'ritual_revenant_west_cleared'
  | 'ritual_revenant_precipice_cleared'
  | 'terminus_scythe_early_obtained'
  | 'bonfire_west_fort_north_logs_cleared'
  | 'guard_duty_kill_baseline'
  | 'hollow_approach_ladder_extended'
  | 'hollow_entered'
  | 'hollow_guardian_defeated'
  | 'ridge_revenant_defeated'
  | 'east_ridge_boulder_seen'
  | 'hollow_shortcut_open'
  | 'east_hollow_route_gate_open'
  | 'hunter_clue_dialogue_seen'
  | 'hunters_manuscript_collected'
  | 'evacuation_order_collected'
  | 'manuscript_fragment_collected'
  | 'north_fort_gate_open'
  | 'petra_heart_delivered'
  | 'petra_hearts_sold'
  | 'petra_departed'
  | 'village_after_manuscript'
  | 'village_after_reaver'
  | 'whispering_woods_shortcut_open'
  | 'olwen_ranger_cabin_hint'
  | 'gravebound_ring_received'
  | 'wolf_ring_received'
  | 'wayfarer_ring_received';

/**
 * Accepts a known flag (autocomplete-friendly) or any other string
 * for dynamically built keys. The `(string & {})` keeps the union
 * from collapsing to plain `string` while still allowing any input.
 */
export type GameFlagKey = KnownGameFlag | (string & Record<never, never>);

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
  cursedSediment: number;
  attackDamage: number;
  attackRange: number;
  lastAttackTime: number;
  attackCooldown: number;
  damageFlashTimer: number;
  attackAnimationTimer: number;
  isDodging: boolean;
  isClimbing: boolean;
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
  /**
   * Counts down from PARRY_WINDOW (0.25s) the instant the player starts blocking.
   * While > 0, the parry window is open and the blade renders a primed shimmer -
   * a purely visual cue with no text. Decremented each frame in the gameplay
   * prelude; cleared if the player stops blocking.
   */
  parryWindowTimer: number;
  snareTimer: number;
  snareSpeedMult: number;
  /**
   * Knockback velocity applied to the player position each frame in addition
   * to input-driven movement. Decays exponentially (knockbackDecayRate per
   * second). Set by heavy enemy hits (Sentinel rock slab, Golem stomp/grab,
   * Giant lunge). Honours world collision so the player can't be shoved
   * through walls. Souls-like impact without text or hard cinematic stops.
   */
  knockbackVelX: number;
  knockbackVelY: number;
  stealthTimer: number;
  stealthDetectionMult: number;
  /** Persistent sneak toggle (the dedicated approach mode): slows the player and shrinks enemy detection. */
  isSneaking: boolean;
  berserkerTimer: number;
  berserkerDamageMult: number;
  berserkerSpeedMult: number;
  chrysalisTimer: number;
  chrysalisDamageMult: number;
  /** Set when Last Breath Charm triggers; cleared on bonfire rest or true death. */
  lastBreathUsedThisLife: boolean;
  /** Perfect parries landed this life - feeds the Ironbark Band's growing reveal bonus. Reset on death. */
  ironbarkParryStacks: number;
  level: number;
  vitality: number;
  endurance: number;
  strength: number;
  /**
   * Seconds remaining in hit-stun lockout after taking unblocked health damage.
   * While > 0: playerAnimState is forced to 'hurt' and attacks are blocked.
   * Cleared on death respawn / bonfire rest.
   */
  hurtTimer: number;
  /**
   * Seconds remaining in post-swing recovery lockout (Souls-style attack recovery frames).
   * While > 0: fresh attacks are blocked. Does NOT block natural combo chains.
   * Dodge-cancelable - cleared the moment isDodging becomes true.
   */
  attackRecoveryTimer: number;
  /**
   * Estus-style Ephemeral Extract flask. `maxEphemeralExtractCharges` is the flask cap
   * (refilled at bonfires); `ephemeralExtractPotency` multiplies each draught's heal amount.
   * Both rise when a Radiant Vestige is consumed via the bonfire's "Increase Healing".
   */
  maxEphemeralExtractCharges: number;
  ephemeralExtractPotency: number;
}

export interface NPC {
  id: string;
  name: string;
  mapId?: string;
  position: { x: number; y: number };
  dialogueId: string;
  sprite: string;
  questGiver?: boolean;
  facing?: 'left' | 'right';
}

export interface Item {
  id: string;
  name: string;
  description: string;
  type: 'consumable' | 'key' | 'quest' | 'equipment' | 'ring';
  sprite: string;
  healAmount?: number;
  /** Essence granted when consumed (soul-item style - e.g. Sundered Essence). */
  essenceAmount?: number;
  projectileDamage?: number;
  projectileSpeed?: number;
  projectileLifetime?: number;
  projectileSprite?: string;
  projectileHitRadius?: number;
  imbueType?: 'chrysalis';
  imbueDuration?: number;
  weaponClass?: 'standard' | 'imbued';
  upgradeTrack?: 'standard' | 'special';
  canReceiveParchment?: boolean;
  buffType?: 'stealth' | 'berserker' | 'last_breath';
  buffDuration?: number;
  stats?: {
    damage?: number;
    range?: number;
    staminaRegenMult?: number;
    recoverySpeedMult?: number;
    moveSpeedMult?: number;
    /** Extra tiles of fog-of-war reveal radius while this ring is equipped (utility rings). */
    revealRadiusBonus?: number;
  };
}

export const RING_SLOT_COUNT = 2;
export type RingSlotIndex = 0 | 1;
export type EquippedRingIds = [string | null, string | null];

export const EMPTY_EQUIPPED_RING_IDS: EquippedRingIds = [null, null];

export const WEAPON_LOADOUT_SIZE = 3;
export type WeaponLoadoutSlotIndex = 0 | 1 | 2;
export type WeaponLoadout = [string | null, string | null, string | null];

export const EMPTY_WEAPON_LOADOUT: WeaponLoadout = [null, null, null];

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
  kind: 'gold' | 'essence' | 'cursed_sediment';
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

const STRENGTH_DAMAGE_PER_LEVEL = 4;

export class GameState {
  player: PlayerState;
  inventory: Item[];
  activeItemIndex: number;
  equippedWeaponId: string | null;
  equippedRingIds: EquippedRingIds;
  weaponLoadout: WeaponLoadout;
  /** Last rested bonfire - respawn point */
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
  gameFlagsRevision: number;
  /** Items dropped in the world (persisted across sessions) */
  worldItems: WorldItem[];
  /** Item ids the player has ever picked up. Drives the first-time acquisition overlay. */
  seenItemIds: Set<string>;
  /** Zone-based IDs of enemies killed this life. Cleared on bonfire rest / death. Persisted so refresh preserves kills until rest. */
  killedEnemyIds: Set<string>;
  onItemAdded: ((item: Item, isFirstTime: boolean) => void) | null;
  onCurrencyGained: ((gain: CurrencyGain) => void) | null;

  constructor(scene: THREE.Scene, camera: THREE.OrthographicCamera) {
    this.scene = scene;
    this.camera = camera;
    this.currentMap = 'village';
    this.dialogueActive = false;
    this.currentDialogue = null;
    this.gameFlags = {};
    this.gameFlagsRevision = 0;
    this.seenItemIds = new Set();
    this.killedEnemyIds = new Set();
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
      cursedSediment: 0,
      maxEphemeralExtractCharges: MAX_EPHEMERAL_EXTRACT_CHARGES,
      ephemeralExtractPotency: 1,
      attackDamage: 20,
      attackRange: 2,
      lastAttackTime: 0,
      attackCooldown: 500,
      damageFlashTimer: 0,
      attackAnimationTimer: 0,
      isDodging: false,
      isClimbing: false,
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
      parryWindowTimer: 0,
      snareTimer: 0,
      snareSpeedMult: 1.0,
      knockbackVelX: 0,
      knockbackVelY: 0,
      stealthTimer: 0,
      stealthDetectionMult: 1.0,
      isSneaking: false,
      berserkerTimer: 0,
      berserkerDamageMult: 1.0,
      berserkerSpeedMult: 1.0,
      chrysalisTimer: 0,
      chrysalisDamageMult: 1.0,
      lastBreathUsedThisLife: false,
      ironbarkParryStacks: 0,
      level: 1,
      vitality: 1,
      endurance: 1,
      strength: 1,
      hurtTimer: 0,
      attackRecoveryTimer: 0,
    };

    // New game starts with a full Ephemeral Extract flask (Estus-style); it refills at bonfires.
    this.inventory = [
      { ...items.meek_short_sword },
      ...Array.from({ length: MAX_EPHEMERAL_EXTRACT_CHARGES }, () => ({ ...items.health_potion })),
    ];
    this.activeItemIndex = 0;
    this.equippedWeaponId = items.meek_short_sword.id;
    this.equippedRingIds = [...EMPTY_EQUIPPED_RING_IDS];
    this.weaponLoadout = [items.meek_short_sword.id, null, null];
    this.lastBonfire = null;
    this.droppedEssence = null;
    this.worldItems = [];
    this.quests = [];
    this.npcs = [];
    // Starter weapon shouldn't trigger the first-time acquisition overlay.
    this.seenItemIds.add(items.meek_short_sword.id);
  }

  /** Current Ephemeral Extract flask charges = count of health_potion instances in inventory. */
  get ephemeralExtractCharges(): number {
    return this.inventory.reduce((n, i) => (i.id === 'health_potion' ? n + 1 : n), 0);
  }

  /** Refill the Estus-style flask to its cap. Called on bonfire rest, fast-travel, and death-respawn. */
  refillEphemeralExtract() {
    while (this.ephemeralExtractCharges < this.player.maxEphemeralExtractCharges) {
      this.addItem({ ...items.health_potion }, { notify: false });
    }
  }

  getEphemeralExtractUpgradeLevel(): number {
    return getEphemeralExtractUpgradeLevel(this.player.maxEphemeralExtractCharges);
  }

  getNextEphemeralExtractUpgradeCost(): number {
    return getVestigeCostForUpgradeLevel(this.getEphemeralExtractUpgradeLevel());
  }

  canUpgradeEphemeralExtract(): boolean {
    return canAffordEphemeralExtractUpgrade(
      this.countItem('radiant_vestige'),
      this.getEphemeralExtractUpgradeLevel(),
    );
  }

  isEphemeralExtractUpgradeMaxed(): boolean {
    return isEphemeralExtractUpgradeMaxed(this.getEphemeralExtractUpgradeLevel());
  }

  /**
   * Spend tiered Radiant Vestiges to upgrade the flask: +1 max charge and +potency to each
   * draught, then top the flask off so the new charge is immediately available.
   */
  upgradeEphemeralExtract(): boolean {
    const upgradeLevel = this.getEphemeralExtractUpgradeLevel();
    const cost = getVestigeCostForUpgradeLevel(upgradeLevel);
    if (!Number.isFinite(cost) || this.countItem('radiant_vestige') < cost) return false;

    for (let i = 0; i < cost; i++) {
      this.removeItem('radiant_vestige');
    }
    this.player.maxEphemeralExtractCharges += EPHEMERAL_EXTRACT_CHARGES_PER_UPGRADE;
    this.player.ephemeralExtractPotency += EPHEMERAL_EXTRACT_POTENCY_PER_UPGRADE;
    this.refillEphemeralExtract();
    return true;
  }

  addItem(item: Item, options: { notify?: boolean } = {}) {
    // Ephemeral Extract is an Estus-style flask: charges are capped and refilled at bonfires,
    // never stockpiled. At the cap, extra Extract is discarded rather than added.
    if (item.id === 'health_potion' && this.ephemeralExtractCharges >= this.player.maxEphemeralExtractCharges) {
      return;
    }
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
    const isFirstTime = !this.seenItemIds.has(item.id);
    if (isFirstTime) this.seenItemIds.add(item.id);
    if (options.notify !== false) {
      this.onItemAdded?.(item, isFirstTime);
    }
    if (item.type === 'equipment') {
      this.tryAddWeaponToLoadout(item.id);
      if (!this.equippedWeaponId) {
        const firstLoadout = this.getLoadoutWeaponIds()[0];
        if (firstLoadout) this.setEquippedWeapon(firstLoadout);
      }
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

  spendEssence(amount: number) {
    if (amount <= 0) return;
    this.player.essence = Math.max(0, this.player.essence - amount);
  }

  addCursedSediment(amount: number) {
    if (amount <= 0) return;
    this.player.cursedSediment += amount;
    this.onCurrencyGained?.({ kind: 'cursed_sediment', amount });
  }

  spendCursedSediment(amount: number) {
    if (amount <= 0) return;
    this.player.cursedSediment = Math.max(0, this.player.cursedSediment - amount);
  }

  removeItem(itemId: string) {
    const index = this.inventory.findIndex(item => item.id === itemId);
    if (index !== -1) {
      this.inventory = [
        ...this.inventory.slice(0, index),
        ...this.inventory.slice(index + 1)
      ];
      if (this.equippedWeaponId === itemId) {
        const nextLoadout = this.getLoadoutWeaponIds()[0] ?? null;
        this.setEquippedWeapon(nextLoadout);
      }
      for (let i = 0; i < WEAPON_LOADOUT_SIZE; i++) {
        if (this.weaponLoadout[i] === itemId) {
          this.weaponLoadout[i] = null;
        }
      }
      for (let i = 0; i < RING_SLOT_COUNT; i++) {
        if (this.equippedRingIds[i] === itemId) {
          this.equippedRingIds[i] = null;
        }
      }
    }
  }

  hasItem(itemId: string): boolean {
    return this.inventory.some(item => item.id === itemId);
  }

  countItem(itemId: string): number {
    return this.inventory.filter(item => item.id === itemId).length;
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
    let targetId = itemId;
    if (targetId && !this.isWeaponInLoadout(targetId)) {
      targetId = this.getLoadoutWeaponIds()[0] ?? null;
    }

    const equipped =
      (targetId ? this.inventory.find(item => item.id === targetId && item.type === 'equipment') : undefined) ??
      this.inventory.find(item => item.type === 'equipment' && this.isWeaponInLoadout(item.id));

    this.equippedWeaponId = equipped?.id ?? null;
    const baseDamage = equipped?.stats?.damage ?? 20;
    this.player.attackDamage = baseDamage + (this.player.strength - 1) * STRENGTH_DAMAGE_PER_LEVEL;
    this.player.attackRange = equipped?.stats?.range ?? 2;
  }

  isWeaponInLoadout(itemId: string): boolean {
    return this.weaponLoadout.includes(itemId);
  }

  getLoadoutWeaponIds(): string[] {
    return this.weaponLoadout.filter((id): id is string => id !== null);
  }

  findEmptyWeaponLoadoutSlot(): WeaponLoadoutSlotIndex | null {
    const index = this.weaponLoadout.findIndex(id => id === null);
    return index >= 0 ? (index as WeaponLoadoutSlotIndex) : null;
  }

  getWeaponLoadoutSlot(itemId: string): WeaponLoadoutSlotIndex | null {
    const index = this.weaponLoadout.indexOf(itemId);
    return index >= 0 ? (index as WeaponLoadoutSlotIndex) : null;
  }

  assignWeaponToLoadout(itemId: string, slotIndex: WeaponLoadoutSlotIndex): boolean {
    const weapon = this.inventory.find(item => item.id === itemId && item.type === 'equipment');
    if (!weapon) return false;

    for (let i = 0; i < WEAPON_LOADOUT_SIZE; i++) {
      if (this.weaponLoadout[i] === itemId) {
        this.weaponLoadout[i] = null;
      }
    }

    this.weaponLoadout[slotIndex] = itemId;

    if (!this.equippedWeaponId || !this.isWeaponInLoadout(this.equippedWeaponId)) {
      this.setEquippedWeapon(itemId);
    }
    return true;
  }

  clearWeaponLoadoutSlot(slotIndex: WeaponLoadoutSlotIndex): void {
    const removed = this.weaponLoadout[slotIndex];
    this.weaponLoadout[slotIndex] = null;
    if (removed && this.equippedWeaponId === removed) {
      this.setEquippedWeapon(this.getLoadoutWeaponIds()[0] ?? null);
    }
  }

  tryAddWeaponToLoadout(itemId: string): boolean {
    if (this.isWeaponInLoadout(itemId)) return true;
    const slot = this.findEmptyWeaponLoadoutSlot();
    if (slot === null) return false;
    return this.assignWeaponToLoadout(itemId, slot);
  }

  isWeaponLoadoutFull(): boolean {
    return this.findEmptyWeaponLoadoutSlot() === null;
  }

  findEmptyRingSlot(): RingSlotIndex | null {
    const index = this.equippedRingIds.findIndex(id => id === null);
    return index >= 0 ? (index as RingSlotIndex) : null;
  }

  equipRing(itemId: string, slotIndex: RingSlotIndex): boolean {
    const ring = this.inventory.find(item => item.id === itemId && item.type === 'ring');
    if (!ring) return false;

    for (let i = 0; i < RING_SLOT_COUNT; i++) {
      if (this.equippedRingIds[i] === itemId) {
        this.equippedRingIds[i] = null;
      }
    }

    this.equippedRingIds[slotIndex] = itemId;
    return true;
  }

  unequipRing(slotIndex: RingSlotIndex): void {
    this.equippedRingIds[slotIndex] = null;
  }

  tryAutoEquipRing(itemId: string): boolean {
    const slot = this.findEmptyRingSlot();
    if (slot === null) return false;
    return this.equipRing(itemId, slot);
  }

  getStaminaRegenMultiplier(): number {
    let mult = 1 + (this.player.endurance - 1) * 0.05;
    for (const ringId of this.equippedRingIds) {
      if (!ringId) continue;
      const ring = this.inventory.find(item => item.id === ringId && item.type === 'ring');
      if (ring?.stats?.staminaRegenMult) {
        mult *= ring.stats.staminaRegenMult;
      }
    }
    return mult;
  }

  getStaminaRegenDelay(): number {
    return Math.max(0.1, this.player.staminaRegenDelay - (this.player.endurance - 1) * 0.03);
  }

  /** Max reveal-radius the Ironbark Band's perfect-parry stacks can add this life. */
  static readonly IRONBARK_PARRY_REVEAL_CAP = 6;

  /** Extra fog-of-war reveal radius (in tiles) from equipped utility rings (e.g. Ironbark Band). */
  getRevealRadiusBonus(): number {
    let bonus = 0;
    let ironbarkEquipped = false;
    for (const ringId of this.equippedRingIds) {
      if (!ringId) continue;
      if (ringId === 'ironbark_ring') ironbarkEquipped = true;
      const ring = this.inventory.find(item => item.id === ringId && item.type === 'ring');
      if (ring?.stats?.revealRadiusBonus) bonus += ring.stats.revealRadiusBonus; // base
    }
    // Ironbark Band combat tie-in: every perfect parry this life widens the reveal further (capped).
    if (ironbarkEquipped) {
      bonus += Math.min(GameState.IRONBARK_PARRY_REVEAL_CAP, this.player.ironbarkParryStacks);
    }
    return bonus;
  }

  /** Called on every perfect parry - grows the Ironbark Band's reveal bonus (only while it's worn). */
  registerPerfectParry(): void {
    if (!this.equippedRingIds.includes('ironbark_ring')) return;
    this.player.ironbarkParryStacks = Math.min(
      GameState.IRONBARK_PARRY_REVEAL_CAP,
      this.player.ironbarkParryStacks + 1,
    );
  }

  getVitalityDamageAbsorption(): number {
    return Math.max(0, this.player.vitality - 1);
  }

  getRecoverySpeedMultiplier(): number {
    let mult = 1;
    for (const ringId of this.equippedRingIds) {
      if (!ringId) continue;
      const ring = this.inventory.find(item => item.id === ringId && item.type === 'ring');
      if (ring?.stats?.recoverySpeedMult) {
        mult *= ring.stats.recoverySpeedMult;
      }
    }
    return mult;
  }

  getMovementSpeedMultiplier(): number {
    let mult = 1;
    for (const ringId of this.equippedRingIds) {
      if (!ringId) continue;
      const ring = this.inventory.find(item => item.id === ringId && item.type === 'ring');
      if (ring?.stats?.moveSpeedMult) {
        mult *= ring.stats.moveSpeedMult;
      }
    }
    return mult;
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
    this.player.attackDamage = baseWeaponDamage + (this.player.strength - 1) * STRENGTH_DAMAGE_PER_LEVEL;

    return true;
  }

  setFlag(flag: GameFlagKey, value: boolean | number) {
    if (this.gameFlags[flag] === value) return;
    this.gameFlags[flag] = value;
    this.gameFlagsRevision += 1;
  }

  replaceGameFlags(flags: Record<string, boolean | number>) {
    this.gameFlags = flags;
    this.gameFlagsRevision += 1;
  }

  /**
   * Returns the raw stored value (boolean or number) or `false` when unset.
   *
   * Prefer {@link getFlagBool} or {@link getFlagNumber} at call sites - the
   * union return type forces every caller to narrow, and the legacy `||`
   * fallback collapses a stored `0` to `false`, which can hide real state for
   * numeric counters. Kept for back-compat with `if (state.getFlag(x))` usage.
   */
  getFlag(flag: GameFlagKey): boolean | number {
    return this.gameFlags[flag] ?? false;
  }

  /** True iff the flag is set to a truthy value. Safe for boolean-style flags. */
  getFlagBool(flag: GameFlagKey): boolean {
    return Boolean(this.gameFlags[flag]);
  }

  /** Numeric value of the flag, or 0 when unset / non-numeric. */
  getFlagNumber(flag: GameFlagKey): number {
    const v = this.gameFlags[flag];
    return typeof v === 'number' ? v : 0;
  }
}
