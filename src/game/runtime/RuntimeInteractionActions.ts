import * as THREE from 'three';
import type { GameState } from '@/lib/game/GameState';
import type { CriticalPathItemVisual } from '@/data/criticalPathItems';
import { INTERACTABLE_QUERY_RADIUS } from '@/lib/game/World';

interface InteractionSystemLike {
  tryInteractWithNearbyNpc: (range: number) => boolean;
  tryReclaimDroppedEssence: (x: number, y: number) => boolean;
  tryHandleBonfireRest: (interactionId: string, x: number, y: number, mapWidth: number, mapHeight: number) => boolean;
  tryHandleMoonbloomPickup: (interactionId: string, x: number, y: number) => boolean;
  tryHandleChestOpen: (interactionId: string, x: number, y: number) => boolean;
  tryHandleConsumablePickup: (interactionId: string, x: number, y: number) => boolean;
  tryHandleHealingSource: (interactionId: string, checkX: number, checkY: number) => boolean;
  tryHandleBuildingTransition: (
    interactionId: string,
    px: number,
    py: number,
    isEntranceTile: boolean,
    getTransitionAt: (x: number, y: number) => { targetMap: string; targetX: number; targetY: number } | null,
  ) => boolean;
  tryHandleForestShortcutLever: (interactionId: string) => boolean;
  tryHandleGroveShelfShortcutLever: (interactionId: string) => boolean;
  tryHandleQuarryBankShortcutLever: (interactionId: string) => boolean;
  tryHandleWestCliffGateLever: (interactionId: string) => boolean;
  tryHandleRiversideBridgeShortcutLever: (interactionId: string) => boolean;
  tryHandleHollowShortcutLever: (interactionId: string) => boolean;
  tryHandleEastHollowRouteGateLever: (interactionId: string) => boolean;
  tryHandleHollowApproachLadder: (interactionId: string, ladderX: number, ladderY: number) => boolean;
  tryHandleCliffCorridorLadder: (interactionId: string, ladderX: number, ladderY: number) => boolean;
  tryHandleFortRidgeLadder: (interactionId: string, ladderX: number, ladderY: number) => boolean;
  tryHandleHollowFogGate: (interactionId: string) => boolean;
  tryHandleForestFortGate: (interactionId: string) => boolean;
  tryHandleNorthFortGate: (interactionId: string) => boolean;
  tryHandleWestFortGate: (interactionId: string) => boolean;
  tryHandleGolemFortGate: (interactionId: string) => boolean;
  tryHandleManuscriptCheckpointGate: (interactionId: string) => boolean;
  tryHandleBlightedRoot: (interactionId: string) => boolean;
  tryHandleHomesteadContainer: (interactionId: string) => boolean;
  tryHandleDialogueInteraction: (interactionId: string) => boolean;
  tryPickupWorldItems: (x: number, y: number) => void;
}

interface RuntimeWorldLike {
  getInteractableNear: (x: number, y: number, radius: number) => { interactionId: string; x: number; y: number } | null;
  getInteractableAt: (x: number, y: number) => string | null;
  getCurrentMap: () => { width: number; height: number };
  getTile: (x: number, y: number) => { type?: string } | null | undefined;
  getTransitionAt: (x: number, y: number) => { targetMap: string; targetX: number; targetY: number } | null;
}

export interface PendingConsumableUse {
  itemId: string;
  name: string;
  healAmount?: number;
  buffType?: 'stealth' | 'berserker';
  buffDuration?: number;
}

interface PotionActionOptions {
  state: GameState;
  particleSystem: { emitHeal: (position: THREE.Vector3) => void; emitDamage: (position: THREE.Vector3) => void };
  notify: (title: string, options?: { id?: string; type?: 'success' | 'info' | 'error'; description?: string; duration?: number }) => void;
  triggerUIUpdate: () => void;
  playPotionDrink?: () => void;
  playGrassChew?: () => void;
  setPlayerAnimState?: (value: 'drinking') => void;
  setHeldConsumableSpriteId?: (value: string | null) => void;
  setDrinkTimer?: (value: number) => void;
  drinkDuration?: number;
  getIsConsuming?: () => boolean;
  getPendingConsumableUse?: () => PendingConsumableUse | null;
  setPendingConsumableUse?: (value: PendingConsumableUse | null) => void;
}

export function createUsePotionAction(options: PotionActionOptions) {
  return () => {
    applyHealthPotionAction(options);
  };
}

export function createCompleteConsumableUseAction(options: PotionActionOptions) {
  return () => {
    completePendingConsumableUse(options);
  };
}

function resolveUsableItem(state: GameState, triggerUIUpdate: () => void) {
  let activeItem = state.inventory[state.activeItemIndex];

  const isUsable = (i: typeof activeItem) =>
    i?.type === 'consumable' &&
    i.buffType !== 'last_breath' &&
    (
      (typeof i.healAmount === 'number' && i.healAmount > 0) ||
      (typeof i.essenceAmount === 'number' && i.essenceAmount > 0) ||
      i.buffType === 'stealth' ||
      i.buffType === 'berserker'
    );

  if (!isUsable(activeItem)) {
    const firstUsableIdx = state.inventory.findIndex(isUsable);
    if (firstUsableIdx === -1) return null;
    state.activeItemIndex = firstUsableIdx;
    activeItem = state.inventory[firstUsableIdx];
    triggerUIUpdate();
  }

  return activeItem;
}

function beginConsumableUse(
  activeItem: NonNullable<ReturnType<typeof resolveUsableItem>>,
  options: PotionActionOptions,
) {
  const {
    playPotionDrink,
    playGrassChew,
    setPlayerAnimState,
    setHeldConsumableSpriteId,
    setDrinkTimer,
    setPendingConsumableUse,
    drinkDuration,
  } = options;

  if (activeItem.id === 'health_potion') {
    playPotionDrink?.();
  } else if (activeItem.id === 'tempest_grass') {
    playGrassChew?.();
  } else {
    playPotionDrink?.();
  }

  setPendingConsumableUse?.({
    itemId: activeItem.id,
    name: activeItem.name,
    healAmount: activeItem.healAmount,
    buffType: activeItem.buffType === 'stealth' || activeItem.buffType === 'berserker'
      ? activeItem.buffType
      : undefined,
    buffDuration: activeItem.buffDuration,
  });
  setPlayerAnimState?.('drinking');
  setHeldConsumableSpriteId?.(activeItem.sprite);
  setDrinkTimer?.(drinkDuration ?? 0.65);
}

export function applyHealthPotionAction(options: PotionActionOptions) {
  const { state, particleSystem, notify, triggerUIUpdate, getIsConsuming } = options;

  if (getIsConsuming?.()) return;

  const activeItem = resolveUsableItem(state, triggerUIUpdate);
  if (!activeItem) return;

  // Soul-items resolve instantly - no drink animation, like absorbing essence in Souls games.
  if (typeof activeItem.essenceAmount === 'number' && activeItem.essenceAmount > 0) {
    const gained = activeItem.essenceAmount;
    const itemId = activeItem.id;
    const itemName = activeItem.name;
    options.playPotionDrink?.();
    state.addEssence(gained);
    state.removeItem(itemId);
    if (state.activeItemIndex >= state.inventory.length) {
      state.activeItemIndex = Math.max(0, state.inventory.length - 1);
    }
    particleSystem.emitHeal(new THREE.Vector3(state.player.position.x, state.player.position.y, 0.3));
    notify(`Used ${itemName}`, {
      id: `used-${itemId}`,
      type: 'success',
      description: `Absorbed ${gained} essence.`,
      duration: 2000,
    });
    triggerUIUpdate();
    return;
  }

  if (activeItem.buffType === 'berserker') {
    beginConsumableUse(activeItem, options);
    triggerUIUpdate();
    return;
  }

  if (activeItem.buffType === 'stealth') {
    beginConsumableUse(activeItem, options);
    triggerUIUpdate();
    return;
  }

  const atFullHealth = state.player.health >= state.player.maxHealth;
  const atFullStamina = state.player.stamina >= state.player.maxStamina;
  if (atFullHealth && (activeItem.id !== 'tempest_grass' || atFullStamina)) {
    notify('Already at full health!', { id: 'full-health', duration: 1500 });
    return;
  }

  beginConsumableUse(activeItem, options);
  triggerUIUpdate();
}

export function completePendingConsumableUse({
  state,
  particleSystem,
  notify,
  triggerUIUpdate,
  getPendingConsumableUse,
  setPendingConsumableUse,
  setHeldConsumableSpriteId,
}: PotionActionOptions) {
  const pending = getPendingConsumableUse?.();
  if (!pending) return;

  setPendingConsumableUse?.(null);
  setHeldConsumableSpriteId?.(null);

  const inventoryItem = state.inventory.find(i => i.id === pending.itemId);
  if (!inventoryItem) return;

  if (pending.buffType === 'berserker') {
    const duration = pending.buffDuration ?? 10;
    state.player.berserkerTimer = duration;
    state.player.berserkerDamageMult = 1.5;
    state.player.berserkerSpeedMult = 1.4;
    state.removeItem(pending.itemId);
    if (state.activeItemIndex >= state.inventory.length) {
      state.activeItemIndex = Math.max(0, state.inventory.length - 1);
    }
    particleSystem.emitDamage(new THREE.Vector3(state.player.position.x, state.player.position.y, 0.3));
    notify('Berserker Draught Active', {
      id: 'berserker-active',
      type: 'success',
      description: `Strikes hit harder and your stride lengthens for ${duration} seconds.`,
      duration: 3000,
    });
    triggerUIUpdate();
    return;
  }

  if (pending.buffType === 'stealth') {
    const duration = pending.buffDuration ?? 14;
    state.player.stealthTimer = duration;
    state.player.stealthDetectionMult = 0.25;
    state.removeItem(pending.itemId);
    if (state.activeItemIndex >= state.inventory.length) {
      state.activeItemIndex = Math.max(0, state.inventory.length - 1);
    }
    particleSystem.emitHeal(new THREE.Vector3(state.player.position.x, state.player.position.y, 0.3));
    notify('Verdant Tonic Active', {
      id: 'stealth-active',
      type: 'success',
      description: `Enemies will not detect you for ${duration} seconds.`,
      duration: 3000,
    });
    triggerUIUpdate();
    return;
  }

  // Ephemeral Extract (the Estus flask) is scaled by the player's potency, raised by Radiant
  // Vestige upgrades. Other heals (e.g. Tempest Grass) use their flat amount.
  const baseHeal = pending.healAmount ?? 0;
  const healAmount = pending.itemId === 'health_potion'
    ? Math.round(baseHeal * state.player.ephemeralExtractPotency)
    : baseHeal;
  state.player.health = Math.min(state.player.maxHealth, state.player.health + healAmount);
  if (pending.itemId === 'tempest_grass') {
    state.player.stamina = state.player.maxStamina;
  }
  state.removeItem(pending.itemId);
  if (state.activeItemIndex >= state.inventory.length) {
    state.activeItemIndex = Math.max(0, state.inventory.length - 1);
  }
  particleSystem.emitHeal(new THREE.Vector3(state.player.position.x, state.player.position.y, 0.3));
  const staminaNote = pending.itemId === 'tempest_grass' ? ' Stamina fully restored.' : '';
  notify(`Used ${pending.name}`, {
    id: `used-${pending.itemId}`,
    type: 'success',
    description: `Restored ${healAmount} health.${staminaNote}`,
    duration: 2000,
  });
  triggerUIUpdate();
}

interface InteractionCheckOptions {
  state: GameState;
  world: RuntimeWorldLike;
  interactionSystem: InteractionSystemLike;
  criticalPathItems: Record<string, CriticalPathItemVisual>;
  criticalItemInteractionIds: Set<string>;
  notify: (title: string, options?: { id?: string; duration?: number }) => void;
  handleMapTransition: (targetMap: string, targetX: number, targetY: number) => void;
}

export function createInteractionCheckAction(options: InteractionCheckOptions) {
  return () => {
    runInteractionCheck(options);
  };
}

export function runInteractionCheck({
  state,
  world,
  interactionSystem,
  criticalPathItems,
  criticalItemInteractionIds,
  notify,
  handleMapTransition,
}: InteractionCheckOptions) {
  void handleMapTransition; // building transitions go through interactionSystem.tryHandleBuildingTransition
  const checkX = state.player.position.x;
  const checkY = state.player.position.y;

  // Passive world item pickup - always runs first, no keypress needed
  interactionSystem.tryPickupWorldItems(checkX, checkY);

  if (interactionSystem.tryReclaimDroppedEssence(checkX, checkY)) {
    return;
  }

  // Doors / building entrances first so wide interactable radii never block exits (F-key).
  const doorProbeOffsets = [
    { x: 0, y: 0 },
    { x: 0, y: 0.7 },
    { x: 0, y: -0.7 },
    { x: 0.7, y: 0 },
    { x: -0.7, y: 0 },
  ];
  for (const dir of doorProbeOffsets) {
    const px = checkX + dir.x;
    const py = checkY + dir.y;
    const doorId = world.getInteractableAt(px, py);
    if (doorId !== 'building_exit' && doorId !== 'building_entrance') continue;
    if (
      interactionSystem.tryHandleBuildingTransition(
        doorId,
        px,
        py,
        true,
        (x, y) => world.getTransitionAt(x, y),
      )
    ) {
      return;
    }
  }

  const interactableHit = world.getInteractableNear(checkX, checkY, INTERACTABLE_QUERY_RADIUS);
  if (interactableHit) {
    const { interactionId, x: px, y: py } = interactableHit;
    const currentMap = world.getCurrentMap();

    if (interactionSystem.tryHandleBonfireRest(interactionId, px, py, currentMap.width, currentMap.height)) return;
    if (interactionSystem.tryHandleMoonbloomPickup(interactionId, px, py)) return;
    if (interactionSystem.tryHandleChestOpen(interactionId, px, py)) return;

    if (criticalItemInteractionIds.has(interactionId)) {
      const config = criticalPathItems[interactionId];
      if (config && state.getFlag(config.collectedFlag)) {
        notify('Nothing more remains here.', { id: 'critical-item-collected', duration: 1800 });
        return;
      }
    }

    if (interactionSystem.tryHandleConsumablePickup(interactionId, px, py)) return;
    if (interactionSystem.tryHandleHealingSource(interactionId, checkX, checkY)) return;
    if (interactionSystem.tryHandleBuildingTransition(
      interactionId,
      px,
      py,
      true,
      (x, y) => world.getTransitionAt(x, y),
    )) return;
    if (interactionSystem.tryHandleForestShortcutLever(interactionId)) return;
    if (interactionSystem.tryHandleGroveShelfShortcutLever(interactionId)) return;
    if (interactionSystem.tryHandleQuarryBankShortcutLever(interactionId)) return;
    if (interactionSystem.tryHandleWestLakeBridgePlank(interactionId)) return;
    if (interactionSystem.tryHandleWestCliffGateLever(interactionId)) return;
    if (interactionSystem.tryHandleRiversideBridgeShortcutLever(interactionId)) return;
    if (interactionSystem.tryHandleHollowShortcutLever(interactionId)) return;
    if (interactionSystem.tryHandleEastHollowRouteGateLever(interactionId)) return;
    if (interactionSystem.tryHandleHollowApproachLadder(interactionId, px, py)) return;
    if (interactionSystem.tryHandleCliffCorridorLadder(interactionId, px, py)) return;
    if (interactionSystem.tryHandleFortRidgeLadder(interactionId, px, py)) return;
    if (interactionSystem.tryHandleForestFortGate(interactionId)) return;
    if (interactionSystem.tryHandleNorthFortGate(interactionId)) return;
    if (interactionSystem.tryHandleWestFortGate(interactionId)) return;
    if (interactionSystem.tryHandleGolemFortGate(interactionId)) return;
    if (interactionSystem.tryHandleManuscriptCheckpointGate(interactionId)) return;
    if (interactionSystem.tryHandleHollowFogGate(interactionId)) return;
    if (interactionSystem.tryHandleBlightedRoot(interactionId)) return;
    if (interactionSystem.tryHandleHomesteadContainer(interactionId)) return;
    if (interactionSystem.tryHandleDialogueInteraction(interactionId)) return;
  }

  if (interactionSystem.tryInteractWithNearbyNpc(3.0)) {
    return;
  }
}
