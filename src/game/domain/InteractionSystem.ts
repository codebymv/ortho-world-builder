import * as THREE from 'three';
import type { GameState, Item } from '@/lib/game/GameState';

type NotificationType = 'success' | 'info' | 'error';

interface NotificationOptions {
  id?: string;
  type?: NotificationType;
  description?: string;
  duration?: number;
}

interface InteractionSystemContext {
  state: GameState;
  startDialogue: (dialogueId: string, npcName?: string) => void;
  items: Record<string, Item>;
  playItemGrab: () => void;
  playGrassPull: () => void;
  playChestUnlock: () => void;
  playGateShortcut: () => void;
  emitSparkles: (position: THREE.Vector3) => void;
  emitHeal: (position: THREE.Vector3) => void;
  notify: (message: string, options?: NotificationOptions) => void;
  triggerSave: () => void;
  triggerUIUpdate: () => void;
  performBonfireRest: (tileX: number, tileY: number) => void;
  syncOpenedChestState: () => void;
  syncHarvestedTempestGrassState: () => void;
  getInteractionCooldown: (interactionId: string) => number;
  setInteractionCooldown: (interactionId: string, timestamp: number) => void;
  healCooldownMs: number;
  handleMapTransition: (targetMap: string, targetX: number, targetY: number) => void;
  activateSwitch: (doorId: string) => void;
  updateWorldChunksAtPlayer: () => void;
  syncWhisperingWoodsShortcutState: () => void;
  showHeroOverlay: (title: string, subtitle?: string) => void;
  hasDialogue: (interactionId: string) => boolean;
}

export function createInteractionSystem(context: InteractionSystemContext) {
  const tryInteractWithNearbyNpc = (interactionRange: number = 3): boolean => {
    const interactionRangeSq = interactionRange * interactionRange;

    for (const npc of context.state.npcs) {
      const dx = context.state.player.position.x - npc.position.x;
      const dy = context.state.player.position.y - npc.position.y;
      const distSq = dx * dx + dy * dy;
      if (distSq < interactionRangeSq) {
        context.startDialogue(npc.dialogueId, npc.name);
        return true;
      }
    }

    return false;
  };

  const tryReclaimDroppedEssence = (checkX: number, checkY: number): boolean => {
    const dropped = context.state.droppedEssence;
    if (!dropped || dropped.mapId !== context.state.currentMap || dropped.amount <= 0) {
      return false;
    }

    const dx = checkX - dropped.x;
    const dy = checkY - dropped.y;
    if (dx * dx + dy * dy >= 2.25) {
      return false;
    }

    context.state.addEssence(dropped.amount);
    context.state.droppedEssence = null;
    context.playItemGrab();
    context.emitSparkles(new THREE.Vector3(dropped.x, dropped.y, 0.5));
    context.notify('Essence reclaimed', {
      id: 'essence-reclaim',
      type: 'success',
      description: `Recovered ${dropped.amount} essence from your bloodstain.`,
      duration: 2500,
    });
    context.triggerSave();
    context.triggerUIUpdate();
    return true;
  };

  const tryHandleBonfireRest = (interactionId: string, px: number, py: number, mapWidth: number, mapHeight: number): boolean => {
    if (interactionId !== 'bonfire_rest') return false;

    const tx = Math.floor(px + mapWidth / 2);
    const ty = Math.floor(py + mapHeight / 2);
    context.performBonfireRest(tx, ty);
    return true;
  };

  const tryHandleMoonbloomPickup = (interactionId: string, px: number, py: number): boolean => {
    if (interactionId !== 'moonbloom_pickup') return false;

    const pickupKey = `moonbloom_${context.state.currentMap}_${Math.round(px)}_${Math.round(py)}`;
    if (context.state.getFlag(pickupKey)) return false;

    context.state.setFlag(pickupKey, true);
    if (context.items.moonbloom) {
      context.state.addItem({ ...context.items.moonbloom });
    }
    context.playItemGrab();
    context.emitSparkles(new THREE.Vector3(px, py, 0.3));

    const merchantQuest = context.state.quests.find(q => q.id === 'merchants_request' && q.active && !q.completed);
    if (merchantQuest) {
      const count = context.state.inventory.filter(i => i.id === 'moonbloom').length;
      const clamped = Math.min(count, 3);
      merchantQuest.objectives[0] = `Find Moonbloom flowers (${clamped}/3)`;
      if (count >= 3) merchantQuest.objectives[0] = 'Find Moonbloom flowers (3/3) âœ“';
    }

    context.notify('Picked Moonbloom', {
      type: 'success',
      description: 'A silvery petal glimmers in your pack.',
      duration: 2500,
    });
    context.triggerUIUpdate();
    context.triggerSave();
    return true;
  };

  const tryHandleChestOpen = (interactionId: string, px: number, py: number): boolean => {
    if (!interactionId.includes('chest')) return false;
    if (context.state.getFlag(`${interactionId}_opened`)) return false;

    context.playChestUnlock();

    const goldAmount = interactionId.includes('ancient')
      ? 100
      : interactionId.includes('ruins')
        ? 75
        : interactionId.includes('wolf') || interactionId.includes('shadow')
          ? 60
          : interactionId.includes('hidden')
            ? 50
            : interactionId.includes('forest')
              ? 40
              : 20;

    context.state.addGold(goldAmount);
    if (context.items.health_potion) {
      context.state.addItem(context.items.health_potion);
      context.playItemGrab();
    }
    context.state.setFlag(`${interactionId}_opened`, true);
    context.syncOpenedChestState();
    context.emitSparkles(new THREE.Vector3(px, py, 0.3));
    context.notify('Chest Opened!', {
      id: 'chest-open',
      type: 'success',
      description: `Found ${goldAmount} gold and an Ephemeral Extract.`,
      duration: 3000,
    });
    context.triggerUIUpdate();
    return true;
  };

  const tryHandleConsumablePickup = (interactionId: string, px: number, py: number): boolean => {
    if (interactionId !== 'tempest_grass_pickup') return false;

    const pickupKey = `tempest_grass_${context.state.currentMap}_${Math.round(px)}_${Math.round(py)}`;
    if (context.state.getFlag(pickupKey)) return false;

    context.state.setFlag(pickupKey, true);
    if (context.items.tempest_grass) {
      context.state.addItem(context.items.tempest_grass);
    }
    context.playGrassPull();
    context.syncHarvestedTempestGrassState();
    context.emitSparkles(new THREE.Vector3(px, py, 0.3));
    context.notify('Harvested Tempest Grass', {
      type: 'success',
      description: 'A fresh bundle was added to your inventory.',
      duration: 2000,
    });
    context.triggerUIUpdate();
    context.triggerSave();
    return true;
  };

  const tryHandleBuildingTransition = (
    interactionId: string,
    px: number,
    py: number,
    _isEntranceTile: boolean,
    getTransitionAt: (x: number, y: number) => { targetMap: string; targetX: number; targetY: number } | null
  ): boolean => {
    if (interactionId !== 'building_exit' && interactionId !== 'building_entrance') return false;

    const transition = getTransitionAt(px, py);
    if (!transition) return false;

    context.handleMapTransition(transition.targetMap, transition.targetX, transition.targetY);
    return true;
  };

  const tryHandleHealingSource = (interactionId: string, checkX: number, checkY: number): boolean => {
    if (
      interactionId !== 'well' &&
      interactionId !== 'fountain' &&
      interactionId !== 'ancient_fountain' &&
      interactionId !== 'healing_mushroom' &&
      interactionId !== 'campfire'
    ) {
      return false;
    }

    const now = Date.now();
    const lastUse = context.getInteractionCooldown(interactionId);
    if (now - lastUse < context.healCooldownMs) {
      const remaining = Math.ceil((context.healCooldownMs - (now - lastUse)) / 1000);
      context.notify(`Not ready yet… (${remaining}s)`, { id: 'heal-cooldown', duration: 1500 });
      return true;
    }

    if (context.state.player.health >= context.state.player.maxHealth) {
      context.notify('Already at full health!', { id: 'full-health', duration: 1500 });
      return true;
    }

    context.setInteractionCooldown(interactionId, now);
    context.state.player.health = Math.min(context.state.player.maxHealth, context.state.player.health + 25);
    context.emitHeal(new THREE.Vector3(checkX, checkY, 0.3));

    const label =
      interactionId === 'campfire'
        ? 'Resting by the Fire'
        : interactionId === 'healing_mushroom'
          ? 'Mushroom Energy!'
          : 'Refreshing Water!';

    context.notify(label, {
      id: 'heal-source',
      type: 'success',
      description: 'Restored 25 health.',
      duration: 2000,
    });
    context.triggerUIUpdate();
    return true;
  };

  const tryHandleShadowCastleGateSwitch = (interactionId: string): boolean => {
    if (interactionId !== 'shadow_castle_gate_switch') return false;
    if (context.state.currentMap !== 'shadow_castle') return true;

    if (context.state.getFlag('shadow_castle_gate_open')) {
      context.notify('The inner gate is already open.', { id: 'shadow-gate-open', duration: 1800 });
      return true;
    }

    context.state.setFlag('shadow_castle_gate_open', true);
    context.activateSwitch('shadow_castle_inner_gate');
    context.updateWorldChunksAtPlayer();
    context.notify('Inner gate unlocked', {
      id: 'shadow-gate-unlocked',
      type: 'success',
      description: 'A heavy mechanism rumbles deeper in the castle.',
      duration: 3200,
    });
    context.triggerSave();
    context.triggerUIUpdate();
    return true;
  };

  const tryHandleForestShortcutLever = (interactionId: string): boolean => {
    if (interactionId !== 'forest_shortcut_lever') return false;
    if (context.state.currentMap !== 'forest') return true;

    if (context.state.getFlag('whispering_woods_shortcut_open')) {
      context.notify('The ranger gate is already open.', { id: 'forest-shortcut-open', duration: 1800 });
      return true;
    }

    context.state.setFlag('whispering_woods_shortcut_open', true);
    context.syncWhisperingWoodsShortcutState();
    context.updateWorldChunksAtPlayer();
    context.playGateShortcut();
    context.showHeroOverlay('Shortcut Unlocked');
    context.notify('Shortcut unlocked', {
      id: 'forest-shortcut-unlocked',
      type: 'success',
      description: 'A rain-slick gate groans open toward the Ranger Outpost.',
      duration: 3200,
    });
    context.triggerSave();
    context.triggerUIUpdate();
    return true;
  };

  const tryHandleDialogueInteraction = (interactionId: string): boolean => {
    if (!context.hasDialogue(interactionId)) return false;
    context.startDialogue(interactionId, undefined);
    return true;
  };

  return {
    tryInteractWithNearbyNpc,
    tryReclaimDroppedEssence,
    tryHandleBonfireRest,
    tryHandleMoonbloomPickup,
    tryHandleChestOpen,
    tryHandleConsumablePickup,
    tryHandleBuildingTransition,
    tryHandleHealingSource,
    tryHandleShadowCastleGateSwitch,
    tryHandleForestShortcutLever,
    tryHandleDialogueInteraction,
  };
}
