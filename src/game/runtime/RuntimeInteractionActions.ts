import * as THREE from 'three';
import type { GameState, Item } from '@/lib/game/GameState';
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
    getTransitionAt: (x: number, y: number) => unknown,
  ) => boolean;
  tryHandleShadowCastleGateSwitch: (interactionId: string) => boolean;
  tryHandleForestShortcutLever: (interactionId: string) => boolean;
  tryHandleGroveShelfShortcutLever: (interactionId: string) => boolean;
  tryHandleHollowShortcutLever: (interactionId: string) => boolean;
  tryHandleHollowApproachLadder: (interactionId: string) => boolean;
  tryHandleCliffCorridorLadder: (interactionId: string, ladderX: number, ladderY: number) => boolean;
  tryHandleHollowFogGate: (interactionId: string) => boolean;
  tryHandleForestFortGate: (interactionId: string) => boolean;
  tryHandleNorthFortGate: (interactionId: string) => boolean;
  tryHandleBlightedRoot: (interactionId: string) => boolean;
  tryHandleDialogueInteraction: (interactionId: string) => boolean;
  tryPickupWorldItems: (x: number, y: number) => void;
}

interface RuntimeWorldLike {
  getInteractableNear: (x: number, y: number, radius: number) => { interactionId: string; x: number; y: number } | null;
  getInteractableAt: (x: number, y: number) => string | null;
  getCurrentMap: () => { width: number; height: number };
  getTile: (x: number, y: number) => { type?: string } | undefined;
  getTransitionAt: (x: number, y: number) => { targetMap: string; targetX: number; targetY: number } | null;
}

interface PotionActionOptions {
  state: GameState;
  particleSystem: { emitHeal: (position: THREE.Vector3) => void };
  notify: (title: string, options?: { id?: string; type?: string; description?: string; duration?: number }) => void;
  triggerUIUpdate: () => void;
  playPotionDrink?: () => void;
  playGrassChew?: () => void;
  setPlayerAnimState?: (value: string) => void;
  setHeldConsumableSpriteId?: (value: string | null) => void;
  setDrinkTimer?: (value: number) => void;
  drinkDuration?: number;
}

export function createUsePotionAction(options: PotionActionOptions) {
  return () => {
    useHealthPotionAction(options);
  };
}

export function useHealthPotionAction({
  state,
  particleSystem,
  notify,
  triggerUIUpdate,
  playPotionDrink,
  playGrassChew,
  setPlayerAnimState,
  setHeldConsumableSpriteId,
  setDrinkTimer,
  drinkDuration,
}: PotionActionOptions) {
  let activeItem = state.inventory[state.activeItemIndex];

  // Accept consumables that either heal OR apply a buff.
  const isUsable = (i: typeof activeItem) =>
    i?.type === 'consumable' &&
    (
      (typeof i.healAmount === 'number' && i.healAmount > 0) ||
      i.buffType === 'stealth'
    );

  if (!isUsable(activeItem)) {
    const firstUsableIdx = state.inventory.findIndex(isUsable);
    if (firstUsableIdx === -1) return;
    state.activeItemIndex = firstUsableIdx;
    activeItem = state.inventory[firstUsableIdx];
    triggerUIUpdate();
  }

  // Stealth buff — does not require low health.
  if (activeItem.buffType === 'stealth') {
    const duration = activeItem.buffDuration ?? 14;
    state.player.stealthTimer = duration;
    state.player.stealthDetectionMult = 0.25;
    playPotionDrink?.();
    setPlayerAnimState?.('drinking');
    setHeldConsumableSpriteId?.(activeItem.sprite);
    if (typeof drinkDuration === 'number') setDrinkTimer?.(drinkDuration);
    state.removeItem(activeItem.id);
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

  // Tempest Grass — allow use when stamina is depleted even if HP is full.
  const atFullHealth = state.player.health >= state.player.maxHealth;
  const atFullStamina = state.player.stamina >= state.player.maxStamina;
  if (atFullHealth && (activeItem.id !== 'tempest_grass' || atFullStamina)) {
    notify('Already at full health!', { id: 'full-health', duration: 1500 });
    return;
  }

  if (activeItem.id === 'health_potion') {
    playPotionDrink?.();
  } else if (activeItem.id === 'tempest_grass') {
    playGrassChew?.();
  }
  setPlayerAnimState?.('drinking');
  setHeldConsumableSpriteId?.(activeItem.sprite);
  if (typeof drinkDuration === 'number') {
    setDrinkTimer?.(drinkDuration);
  }
  state.player.health = Math.min(state.player.maxHealth, state.player.health + (activeItem.healAmount ?? 0));
  if (activeItem.id === 'tempest_grass') {
    state.player.stamina = state.player.maxStamina;
  }
  state.removeItem(activeItem.id);
  if (state.activeItemIndex >= state.inventory.length) {
    state.activeItemIndex = Math.max(0, state.inventory.length - 1);
  }
  particleSystem.emitHeal(new THREE.Vector3(state.player.position.x, state.player.position.y, 0.3));
  const staminaNote = activeItem.id === 'tempest_grass' ? ' Stamina fully restored.' : '';
  notify(`Used ${activeItem.name}`, {
    id: `used-${activeItem.id}`,
    type: 'success',
    description: `Restored ${activeItem.healAmount} health.${staminaNote}`,
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

  // Passive world item pickup — always runs first, no keypress needed
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
    if (interactionSystem.tryHandleShadowCastleGateSwitch(interactionId)) return;
    if (interactionSystem.tryHandleForestShortcutLever(interactionId)) return;
    if (interactionSystem.tryHandleGroveShelfShortcutLever(interactionId)) return;
    if (interactionSystem.tryHandleHollowShortcutLever(interactionId)) return;
    if (interactionSystem.tryHandleHollowApproachLadder(interactionId, px, py)) return;
    if (interactionSystem.tryHandleCliffCorridorLadder(interactionId, px, py)) return;
    if (interactionSystem.tryHandleForestFortGate(interactionId)) return;
    if (interactionSystem.tryHandleNorthFortGate(interactionId)) return;
    if (interactionSystem.tryHandleHollowFogGate(interactionId)) return;
    if (interactionSystem.tryHandleBlightedRoot(interactionId)) return;
    if (interactionSystem.tryHandleDialogueInteraction(interactionId)) return;
  }

  if (interactionSystem.tryInteractWithNearbyNpc(3.0)) {
    return;
  }
}
