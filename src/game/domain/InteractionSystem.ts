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
  syncHarvestedMoonbloomState: () => void;
  getInteractionCooldown: (interactionId: string) => number;
  setInteractionCooldown: (interactionId: string, timestamp: number) => void;
  healCooldownMs: number;
  handleMapTransition: (targetMap: string, targetX: number, targetY: number) => void;
  activateSwitch: (doorId: string) => void;
  updateWorldChunksAtPlayer: () => void;
  syncWhisperingWoodsShortcutState: () => void;
  syncGroveShelfShortcutState: () => void;
  syncHollowShortcutState: () => void;
  syncHollowApproachLadderState: () => void;
  syncCliffCorridorLadderState: () => void;
  syncForestFortGateState: () => void;
  syncNorthFortGateState: () => void;
  syncGilrhymBossState: () => void;
  showHeroOverlay: (title: string, subtitle?: string) => void;
  hasDialogue: (interactionId: string) => boolean;
  onWorldItemPickup?: (itemId: string) => void;
  getAliveEnemyCountNearPlayer?: (radius: number) => number;
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
    if (!interactionId.includes('bonfire')) return false;

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
    context.playGrassPull();
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
      description: 'Deep color folds into your pack like bottled dusk.',
      duration: 2500,
    });
    context.syncHarvestedMoonbloomState();
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
      : interactionId.includes('gilrhym')
      ? 85
      : interactionId.includes('ruins')
      ? 75
      : interactionId.includes('hollow_arena')
      ? 65
      : interactionId.includes('wolf') || interactionId.includes('shadow')
      ? 60
      : interactionId.includes('enchanted')
      ? 55
      : interactionId.includes('hidden') || interactionId.includes('fort')
      ? 50
      : interactionId.includes('temple') || interactionId.includes('volcano') || interactionId.includes('spider')
      ? 45
      : interactionId.includes('forest')
      ? 40
      : 20;

    context.state.addGold(goldAmount);
    if (context.items.health_potion) {
      context.state.addItem(context.items.health_potion);
      context.playItemGrab();
    }

    let bonusDescription = '';
    if (interactionId === 'ancient_chest' && context.items.shadow_blade) {
      context.state.addItem({ ...context.items.shadow_blade });
      bonusDescription = ' and a Shadow Blade';
    } else if (interactionId === 'boss_arena_chest' && context.items.crystal_greatsword) {
      context.state.addItem({ ...context.items.crystal_greatsword });
      bonusDescription = ' and a Crystal Greatsword';
    } else if (interactionId === 'forest_river_chest' && context.items.ornamental_broadsword) {
      context.state.addItem({ ...context.items.ornamental_broadsword });
      bonusDescription = ' and an Ornamental Broadsword';
    } else if (interactionId === 'gilrhym_scythe_chest' && context.items.terminus_scythe) {
      context.state.addItem({ ...context.items.terminus_scythe });
      bonusDescription = ' and the Terminus Scythe';
    }

    context.state.setFlag(`${interactionId}_opened`, true);
    context.syncOpenedChestState();
    context.emitSparkles(new THREE.Vector3(px, py, 0.3));
    context.notify('Chest Opened!', {
      id: 'chest-open',
      type: 'success',
      description: `Found ${goldAmount} gold, an Ephemeral Extract${bonusDescription}.`,
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
      interactionId !== 'ancient_well' &&
      interactionId !== 'gilrhym_fountain' &&
      interactionId !== 'gilrhym_market_well' &&
      interactionId !== 'gilrhym_cathedral_well' &&
      interactionId !== 'healing_mushroom' &&
      interactionId !== 'campfire'
    ) {
      return false;
    }

    const now = Date.now();
    const lastUse = context.getInteractionCooldown(interactionId);
    if (now - lastUse < context.healCooldownMs) {
      const remaining = Math.ceil((context.healCooldownMs - (now - lastUse)) / 1000);
      context.notify(`Not ready yetâ€¦ (${remaining}s)`, { id: 'heal-cooldown', duration: 1500 });
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
      description: 'The barred gate below groans open â€” a path back to the Ranger Outpost is now clear.',
      duration: 3200,
    });
    context.triggerSave();
    context.triggerUIUpdate();
    return true;
  };

  const tryHandleGroveShelfShortcutLever = (interactionId: string): boolean => {
    if (interactionId !== 'grove_shelf_shortcut_lever') return false;
    if (context.state.currentMap !== 'forest') return true;

    if (context.state.getFlag('grove_shelf_shortcut_open')) {
      context.notify('The trail gate is already open.', { id: 'grove-shelf-shortcut-open', duration: 1800 });
      return true;
    }

    context.state.setFlag('grove_shelf_shortcut_open', true);
    context.syncGroveShelfShortcutState();
    context.updateWorldChunksAtPlayer();
    context.playGateShortcut();
    context.showHeroOverlay('Shortcut Unlocked');
    context.notify('Shortcut unlocked', {
      id: 'grove-shelf-shortcut-unlocked',
      type: 'success',
      description: 'The iron gate at the trail head groans open â€” the path back through the Whispering Woods is clear.',
      duration: 3200,
    });
    context.triggerSave();
    context.triggerUIUpdate();
    return true;
  };

  const tryHandleHollowShortcutLever = (interactionId: string): boolean => {
    if (interactionId !== 'hollow_shortcut_lever') return false;
    if (context.state.currentMap !== 'forest') return true;

    if (context.state.getFlag('hollow_shortcut_open')) {
      context.notify('The hollow gate is already open.', { id: 'hollow-shortcut-open', duration: 1800 });
      return true;
    }

    context.state.setFlag('hollow_shortcut_open', true);
    context.syncHollowShortcutState();
    context.updateWorldChunksAtPlayer();
    context.playGateShortcut();
    context.showHeroOverlay('Shortcut Unlocked');
    context.notify('Shortcut unlocked', {
      id: 'hollow-shortcut-unlocked',
      type: 'success',
      description: 'A twisted gate of roots and iron groans open, revealing a path back to the Hollow bonfire.',
      duration: 3200,
    });
    context.triggerSave();
    context.triggerUIUpdate();
    return true;
  };

  const tryHandleHollowApproachLadder = (interactionId: string, ladderX: number, _ladderY: number): boolean => {
    if (interactionId !== 'hollow_approach_ladder') return false;
    if (context.state.currentMap !== 'forest') return true;

    if (context.state.getFlag('hollow_approach_ladder_extended')) {
      context.notify('The ladder is already extended.', { id: 'ladder-already-extended', duration: 1800 });
      return true;
    }

    // Only allow from the left/west side (long way around).
    // Reject if player is to the right/east of the ladder (short-way, unintended approach).
    if (context.state.player.position.x > ladderX) {
      context.startDialogue('hollow_approach_ladder_wrong_side');
      return true;
    }

    context.state.setFlag('hollow_approach_ladder_extended', true);
    context.syncHollowApproachLadderState();
    context.updateWorldChunksAtPlayer();
    context.playGateShortcut();
    context.showHeroOverlay('Ladder Extended');
    context.notify('Ladder extended', {
      id: 'hollow-approach-ladder-extended',
      type: 'success',
      description: 'You kick the coiled ladder over the edge. It unrolls down the cliff face â€” a shortcut back.',
      duration: 3200,
    });
    context.triggerSave();
    context.triggerUIUpdate();
    return true;
  };

  const tryHandleCliffCorridorLadder = (interactionId: string, _ladderX: number, ladderY: number): boolean => {
    if (interactionId !== 'cliff_corridor_ladder') return false;
    if (context.state.currentMap !== 'forest') return true;

    if (context.state.getFlag('cliff_corridor_ladder_extended')) {
      context.notify('The ladder is already extended.', { id: 'cliff-ladder-already-extended', duration: 1800 });
      return true;
    }

    if (context.state.player.position.y > ladderY) {
      context.startDialogue('cliff_corridor_ladder_wrong_side');
      return true;
    }

    context.state.setFlag('cliff_corridor_ladder_extended', true);
    context.syncCliffCorridorLadderState();
    context.updateWorldChunksAtPlayer();
    context.playGateShortcut();
    context.showHeroOverlay('Ladder Extended');
    context.notify('Ladder extended', {
      id: 'cliff-corridor-ladder-extended',
      type: 'success',
      description: 'You kick the coiled ladder over the edge. It unrolls down the cliff face â€” a shortcut to the terrace below.',
      duration: 3200,
    });
    context.triggerSave();
    context.triggerUIUpdate();
    return true;
  };

  const tryHandleForestFortGate = (interactionId: string): boolean => {
    if (interactionId !== 'forest_fort_gate') return false;
    if (context.state.currentMap !== 'forest') return true;

    if (context.state.getFlag('forest_fort_gate_open')) {
      context.notify('The fort gate is already open.', { id: 'fort-gate-open', duration: 1800 });
      return true;
    }

    if (!context.state.hasItem('fort_gate_key')) {
      context.startDialogue('forest_fort_gate_locked');
      return true;
    }

    context.state.setFlag('forest_fort_gate_open', true);
    context.syncForestFortGateState();
    context.updateWorldChunksAtPlayer();
    context.playGateShortcut();
    context.showHeroOverlay('Fortress Unlocked');
    context.notify('Fort gate unlocked', {
      id: 'fort-gate-unlocked',
      type: 'success',
      description: 'The iron lock gives way. The fort is open.',
      duration: 3200,
    });
    context.triggerSave();
    context.triggerUIUpdate();
    return true;
  };

  const tryHandleNorthFortGate = (interactionId: string): boolean => {
    if (interactionId !== 'north_fort_gate') return false;
    if (context.state.currentMap !== 'forest') return true;

    if (context.state.getFlag('north_fort_gate_open')) {
      context.notify('The fort gate is already open.', { id: 'north-fort-gate-open', duration: 1800 });
      return true;
    }

    if (!context.state.hasItem('fort_gate_key')) {
      context.startDialogue('north_fort_gate_locked');
      return true;
    }

    context.state.setFlag('north_fort_gate_open', true);
    context.syncNorthFortGateState();
    context.updateWorldChunksAtPlayer();
    context.playGateShortcut();
    context.showHeroOverlay('Fortress Unlocked');
    context.notify('Fort gate unlocked', {
      id: 'north-fort-gate-unlocked',
      type: 'success',
      description: 'The iron lock yields. The northern fort stands open.',
      duration: 3200,
    });
    context.triggerSave();
    context.triggerUIUpdate();
    return true;
  };

  const tryHandleHollowFogGate = (interactionId: string): boolean => {
    if (interactionId === 'gilrhym_fog_gate') {
      if (context.state.getFlag('ashen_reaver_defeated')) {
        context.notify('The ashen fog has lifted.', { id: 'fog-gate-clear', duration: 1800 });
        return true;
      }
      context.notify('A wall of dark fog blocks the way. Something terrible guards the cathedral plaza.', { id: 'fog-gate-locked', duration: 3000 });
      return true;
    }

    if (interactionId !== 'hollow_fog_gate') return false;
    if (context.state.currentMap !== 'forest') return true;

    if (context.state.getFlag('hollow_guardian_defeated')) {
      context.notify('The fog has lifted.', { id: 'fog-gate-clear', duration: 1800 });
      return true;
    }

    context.handleMapTransition('interior_hollow_arena', 18, 32);
    return true;
  };

  const tryHandleGilrhymShortcutLever = (interactionId: string): boolean => {
    if (interactionId !== 'gilrhym_shortcut_lever_1' && interactionId !== 'gilrhym_shortcut_lever_2') return false;
    if (context.state.currentMap !== 'gilrhym') return true;

    const flagKey = `${interactionId}_open`;
    if (context.state.getFlag(flagKey)) {
      context.notify('The gate is already open.', { id: `${interactionId}-open`, duration: 1800 });
      return true;
    }

    context.state.setFlag(flagKey, true);
    context.syncGilrhymBossState();
    context.updateWorldChunksAtPlayer();
    context.playGateShortcut();
    context.showHeroOverlay('Shortcut Unlocked');
    context.notify('Shortcut unlocked', {
      id: `${interactionId}-unlocked`,
      type: 'success',
      description: 'An iron gate groans open, revealing a route back toward the bonfires.',
      duration: 3200,
    });
    context.triggerSave();
    context.triggerUIUpdate();
    return true;
  };

  const tryHandleBlightedRoot = (interactionId: string): boolean => {
    if (interactionId !== 'blighted_root') return false;

    // Gate: grove must be cleared of enemies before the root can be interacted with
    if (!context.state.getFlag('blighted_root_destroyed')) {
      const GROVE_CLEAR_RADIUS = 15;
      const nearbyCount = context.getAliveEnemyCountNearPlayer?.(GROVE_CLEAR_RADIUS) ?? 0;
      if (nearbyCount > 0) {
        context.startDialogue('blighted_root_guarded');
        return true;
      }
      return false;
    }

    const quest = context.state.quests.find(q => q.id === 'blighted_heart');
    if (!quest?.completed && context.items.blighted_root_shard && !context.state.hasItem('blighted_root_shard')) {
      context.state.addItem({ ...context.items.blighted_root_shard });
      context.playItemGrab();
      context.showHeroOverlay('Blighted Root Shard');
      context.notify('Shard recovered', {
        id: 'blighted-root-shard-recovery',
        type: 'success',
        description: 'A gnarled shard from the dead growth. Return it to Warden Callum.',
        duration: 3600,
      });
      const activeQuest = context.state.quests.find(q => q.id === 'blighted_heart' && q.active && !q.completed);
      if (activeQuest) {
        activeQuest.objectives[1] = `Find and destroy the Blighted Root \u2713`;
      }
      context.triggerSave();
      context.triggerUIUpdate();
      return true;
    }

    context.notify('Nothing more remains here.', { id: 'blighted-root-empty', duration: 1800 });
    return true;
  };

  const tryHandleDialogueInteraction = (interactionId: string): boolean => {
    if (!context.hasDialogue(interactionId)) return false;
    context.startDialogue(interactionId, undefined);
    return true;
  };

  /** Auto-pickup world items in proximity (called every player movement frame). */
  const tryPickupWorldItems = (px: number, py: number): void => {
    const currentMap = context.state.currentMap;
    const toRemove: string[] = [];

    for (const wi of context.state.worldItems) {
      if (wi.mapId !== currentMap) continue;
      const dx = px - wi.x;
      const dy = py - wi.y;
      if (dx * dx + dy * dy >= 1.5 * 1.5) continue;

      const itemDef = context.items[wi.itemId];
      if (!itemDef) continue;

      context.state.addItem({ ...itemDef });
      context.playItemGrab();
      context.emitSparkles(new THREE.Vector3(wi.x, wi.y, 0.5));
      context.notify(`${itemDef.name} obtained`, {
        id: `world-item-pickup-${wi.instanceId}`,
        type: 'success',
        description: itemDef.description,
        duration: 3000,
      });
      context.onWorldItemPickup?.(wi.itemId);
      toRemove.push(wi.instanceId);
    }

    if (toRemove.length > 0) {
      context.state.worldItems = context.state.worldItems.filter(
        wi => !toRemove.includes(wi.instanceId),
      );
      context.triggerSave();
      context.triggerUIUpdate();
    }
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
    tryHandleForestShortcutLever,
    tryHandleGroveShelfShortcutLever,
    tryHandleHollowShortcutLever,
    tryHandleHollowApproachLadder,
    tryHandleCliffCorridorLadder,
    tryHandleForestFortGate,
    tryHandleNorthFortGate,
    tryHandleHollowFogGate,
    tryHandleGilrhymShortcutLever,
    tryHandleBlightedRoot,
    tryHandleDialogueInteraction,
    tryPickupWorldItems,
  };
}
