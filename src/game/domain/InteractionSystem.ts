import * as THREE from 'three';
import { isRingRewardChestInteractionId } from '@/data/specialChests';
import type { GameState, Item } from '@/lib/game/GameState';
import type { RewardBundleEntry, ShowRewardBundleOptions } from '@/game/domain/rewardDisplay';
import { markObjectiveDone } from '@/lib/game/progressionToasts';

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
  playGoldPickup: () => void;
  playEssencePickup: () => void;
  playGrassPull: () => void;
  playChestUnlock: () => void;
  playGateShortcut: () => void;
  playLeverPull: () => void;
  playGateOpenHeavy: () => void;
  playGateLockedHeavy: () => void;
  playDoorOpenWood: () => void;
  playDoorCloseWood: () => void;
  playDoorLocked: () => void;
  playLadderClimb: () => void;
  emitSparkles: (position: THREE.Vector3) => void;
  emitHeal: (position: THREE.Vector3) => void;
  notify: (message: string, options?: NotificationOptions) => void;
  showRewardBundle?: (
    bundle: { id: string; title: string; entries: RewardBundleEntry[] },
    options?: ShowRewardBundleOptions,
  ) => void;
  triggerSave: () => void;
  triggerUIUpdate: () => void;
  performBonfireRest: (tileX: number, tileY: number) => void;
  syncOpenedChestState: () => void;
  syncRangerWolfRingChestState?: () => void;
  triggerMinimapUpdate?: (reset: boolean) => void;
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
  syncQuarryBankShortcutState: () => void;
  syncWestCliffGateState: () => void;
  syncRiversideBridgeShortcutState: () => void;
  syncHollowShortcutState: () => void;
  syncEastHollowRouteGateState: () => void;
  syncHollowApproachLadderState: () => void;
  syncCliffCorridorLadderState: () => void;
  syncFortRidgeLadderState: () => void;
  syncForestFortGateState: () => void;
  syncNorthFortGateState: () => void;
  syncWestFortGateState: () => void;
  syncGolemFortGateState: () => void;
  syncManuscriptCheckpointGateState: () => void;
  syncGuilrhymBossState: () => void;
  showHeroOverlay: (title: string, subtitle?: string) => void;
  hasDialogue: (interactionId: string) => boolean;
  onWorldItemPickup?: (itemId: string) => void;
  getAliveEnemyCountNearPlayer?: (radius: number) => number;
  /** Briefly pan the camera to a world position (e.g. a shortcut gate just opened). */
  startCameraPan?: (worldX: number, worldY: number, durationMs: number) => void;
}

export function canReleaseFortRidgeLadderFromPosition(playerX: number, ladderWorldX: number): boolean {
  // The usable release pin is reached from the east-side ridge tile centered one full tile
  // to the right of the gate ladder. Standing on the fort-side landing still puts the
  // player within generic interaction reach, so require them to actually be on the
  // progressed/east ledge rather than merely adjacent to the gate.
  return playerX >= ladderWorldX + 0.5;
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
    context.playEssencePickup();
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
      if (count >= 3) {
        markObjectiveDone(merchantQuest, 0, 'Find Moonbloom flowers (3/3)');
      }
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

  const tryHandleRingRewardChest = (interactionId: string, px: number, py: number): boolean => {
    if (!isRingRewardChestInteractionId(interactionId)) return false;
    if (context.state.getFlag(`${interactionId}_opened`)) return false;

    const ringItem =
      interactionId === 'hunter_cliff_shelf_chest'
        ? context.items.gravebound_ring
        : interactionId === 'ranger_wolf_ring_chest'
          ? context.items.wolf_ring
          : interactionId === 'north_fort_wayfarer_ring_chest'
            ? context.items.wayfarer_ring
            : undefined;
    if (!ringItem) return false;

    context.playChestUnlock();
    context.state.addItem({ ...ringItem });

    if (interactionId === 'hunter_cliff_shelf_chest') {
      context.state.setFlag('gravebound_ring_received', true);
    } else if (interactionId === 'ranger_wolf_ring_chest') {
      context.state.setFlag('wolf_ring_received', true);
    } else {
      context.state.setFlag('wayfarer_ring_received', true);
    }

    let description = `Found ${ringItem.name}.`;
    if (context.state.tryAutoEquipRing(ringItem.id)) {
      description =
        interactionId === 'hunter_cliff_shelf_chest'
          ? 'Gravebound Ring equipped (+22% stamina recovery).'
          : interactionId === 'ranger_wolf_ring_chest'
            ? 'Wolf Ring equipped (faster hit recovery).'
            : 'Wayfarer Ring equipped (+15% movement speed).';
    }

    context.state.setFlag(`${interactionId}_opened`, true);
    context.syncOpenedChestState();
    context.syncRangerWolfRingChestState?.();
    context.emitSparkles(new THREE.Vector3(px, py, 0.3));
    context.notify('Special Chest Opened!', {
      id: 'ring-chest-open',
      type: 'success',
      description,
      duration: 3200,
    });
    context.triggerUIUpdate();
    if (interactionId === 'ranger_wolf_ring_chest') {
      context.triggerMinimapUpdate?.(true);
      context.triggerSave();
    }
    return true;
  };

  const tryHandleChestOpen = (interactionId: string, px: number, py: number): boolean => {
    if (!interactionId.includes('chest')) return false;
    if (context.state.getFlag(`${interactionId}_opened`)) return false;
    if (tryHandleRingRewardChest(interactionId, px, py)) return true;

    context.playChestUnlock();

    const goldAmount = interactionId.includes('ancient')
      ? 100
      : interactionId.includes('guilrhym')
      ? 85
      : interactionId.includes('ruins')
      ? 90
      : interactionId.includes('revenant_terminus')
      ? 90
      : interactionId.includes('hollow_arena')
      ? 90
      : interactionId.includes('waterfall') || interactionId.includes('observatory') || interactionId.includes('volcano')
      ? 100
      : interactionId.includes('golem_arena')
      ? 90
      : interactionId.includes('wolf') || interactionId.includes('shadow')
      ? 80
      : interactionId.includes('enchanted')
      ? 75
      : interactionId.includes('hidden') || interactionId.includes('fort')
      ? 70
      : interactionId.includes('temple') || interactionId.includes('spider')
      ? 80
      : interactionId.includes('forest')
      ? 55
      : 40;

    context.state.addGold(goldAmount);
    context.playGoldPickup();
    const rewardEntries: RewardBundleEntry[] = [{ kind: 'gold', amount: goldAmount }];

    let deferBundleForWeaponAcquisition = false;
    const grantChestWeapon = (item: Item) => {
      const firstAcquisition = !context.state.seenItemIds.has(item.id);
      context.state.addItem({ ...item });
      if (firstAcquisition) deferBundleForWeaponAcquisition = true;
    };

    if (interactionId === 'ancient_chest' && context.items.shadow_blade) {
      grantChestWeapon(context.items.shadow_blade);
    } else if (interactionId === 'boss_arena_chest' && context.items.crystal_greatsword) {
      grantChestWeapon(context.items.crystal_greatsword);
    } else if (interactionId === 'forest_river_chest' && context.items.ornamental_broadsword) {
      grantChestWeapon(context.items.ornamental_broadsword);
    } else if (
      (interactionId === 'revenant_west_terminus_chest' ||
       interactionId === 'revenant_precipice_terminus_chest' ||
       interactionId === 'revenant_east_terminus_chest') &&
      context.items.terminus_scythe
    ) {
      grantChestWeapon(context.items.terminus_scythe);
      context.state.setFlag('terminus_scythe_early_obtained', true);
    } else if (
      interactionId === 'hollow_terminus_chest' &&
      context.items.terminus_scythe &&
      !context.state.getFlag('terminus_scythe_early_obtained')
    ) {
      grantChestWeapon(context.items.terminus_scythe);
    }

    // Per-chest consumable override. Chests not listed here fall through to
    // the default Ephemeral Extract so we keep healing potions broadly available.
    const CHEST_CONSUMABLE_OVERRIDES: Record<string, string> = {
      hidden_grove_chest: 'berserker_draught',
      forest_hermit_chest: 'berserker_draught',
      forest_shore_divide_chest: 'berserker_draught',
      forgotten_shrine_chest: 'last_breath_charm',
      wolf_den_chest: 'last_breath_charm',
      // In front of the hollow corridor gate — "you'll need this" before the Hollow proper.
      hollow_gate_chest: 'last_breath_charm',
      cliff_corridor_chest: 'last_breath_charm',
      // Reward for besting the western fort's Ridge Revenant.
      west_fort_chest: 'last_breath_charm',
    };
    // Sundered Essence soul-items replace the (plentiful) default Extract in chests chosen
    // by zone/flow. Tier I sits along the southern + peripheral early routes; Tier II only
    // past the river crossing (Riverside Grove / Corrupted Bridge) where corruption deepens.
    const CHEST_ESSENCE_OVERRIDES: Record<string, string> = {
      // Tier I — pre-river exploration loop (south, southwest, southeast, central).
      forest_south_entry_chest: 'sundered_essence_i',   // south river peninsula (entry)
      rocky_hill_chest: 'sundered_essence_i',           // SW cliff-top plateau
      spider_chest: 'sundered_essence_i',               // SW spider grounds
      destroyed_town_chest: 'sundered_essence_i',       // west ruined settlement
      forest_lake_chest: 'sundered_essence_i',          // SE lake shelf
      forest_woodcutter_chest: 'sundered_essence_i',    // central woodcutter ruin
      // Tier II — north of the river, the Hollow approach and beyond.
      forest_chest_hollow_approach: 'sundered_essence_ii', // ridge over the decayed bridge lane
      observatory_chest: 'sundered_essence_ii',            // observatory compound (NE)
      waterfall_hidden_chest: 'sundered_essence_ii',       // hidden reward behind the north falls
    };

    // Chests that yield multiple Ephemeral Extracts instead of the usual single one.
    const TRIPLE_EXTRACT_CHESTS = new Set(['start_extract_chest']);
    const extractCount = TRIPLE_EXTRACT_CHESTS.has(interactionId) ? 3 : 1;

    const overrideItemId = CHEST_ESSENCE_OVERRIDES[interactionId] ?? CHEST_CONSUMABLE_OVERRIDES[interactionId];
    const consumableItem = overrideItemId ? context.items[overrideItemId] : context.items.health_potion;
    let consumableLabel = extractCount > 1 ? `${extractCount}× Ephemeral Extract` : 'an Ephemeral Extract';
    if (consumableItem) {
      for (let i = 0; i < extractCount; i++) {
        context.state.addItem({ ...consumableItem }, { notify: false });
      }
      rewardEntries.push({ kind: 'item', item: { ...consumableItem }, quantity: extractCount });
      context.playItemGrab();
      if (overrideItemId) {
        // Article matches the item name's first vowel sound.
        const startsWithVowel = /^[aeiou]/i.test(consumableItem.name);
        consumableLabel = `${startsWithVowel ? 'an' : 'a'} ${consumableItem.name}`;
      }
    }

    context.state.setFlag(`${interactionId}_opened`, true);
    context.syncOpenedChestState();
    context.emitSparkles(new THREE.Vector3(px, py, 0.3));
    context.showRewardBundle?.(
      {
        id: `chest-${interactionId}-${Date.now()}`,
        title: 'Chest Rewards',
        entries: rewardEntries,
      },
      { deferUntilWeaponAcquisition: deferBundleForWeaponAcquisition },
    );
    context.notify('Chest Opened!', {
      id: 'chest-open',
      type: 'success',
      description: `Found ${goldAmount} gold, ${consumableLabel}.`,
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

    if (interactionId === 'building_entrance') context.playDoorOpenWood();
    else context.playDoorCloseWood();
    context.handleMapTransition(transition.targetMap, transition.targetX, transition.targetY);
    return true;
  };

  const tryHandleHealingSource = (interactionId: string, checkX: number, checkY: number): boolean => {
    if (
      interactionId !== 'well' &&
      interactionId !== 'fountain' &&
      interactionId !== 'ancient_fountain' &&
      interactionId !== 'ancient_well' &&
      interactionId !== 'guilrhym_fountain' &&
      interactionId !== 'guilrhym_market_well' &&
      interactionId !== 'guilrhym_cathedral_well'
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

    context.notify('Refreshing Water!', {
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

    context.playLeverPull();
    context.state.setFlag('whispering_woods_shortcut_open', true);
    context.syncWhisperingWoodsShortcutState();
    context.updateWorldChunksAtPlayer();
    context.playGateOpenHeavy();
    context.playGateShortcut();
    context.showHeroOverlay('Shortcut Unlocked');
    // Pan camera to the gate that just opened so the player sees the effect.
    context.startCameraPan?.(-5, 45, 750);
    context.triggerSave();
    context.triggerUIUpdate();
    return true;
  };

  const tryHandleWestCliffGateLever = (interactionId: string): boolean => {
    // Right-side sealed face — player bumped into it from the wrong side.
    if (interactionId === 'west_cliff_gate_sealed') {
      context.playGateLockedHeavy();
      context.notify('Must open another way.', { id: 'west-cliff-gate-sealed', duration: 2000 });
      return true;
    }
    if (interactionId !== 'west_cliff_gate_lever') return false;
    if (context.state.currentMap !== 'forest') return true;

    if (context.state.getFlag('west_cliff_gate_open')) {
      context.notify('The gate is already open.', { id: 'west-cliff-gate-open', duration: 1800 });
      return true;
    }

    context.playLeverPull();
    context.state.setFlag('west_cliff_gate_open', true);
    context.syncWestCliffGateState();
    context.updateWorldChunksAtPlayer();
    context.playGateOpenHeavy();
    context.playGateShortcut();
    context.showHeroOverlay('Gate Unbarred');
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

    context.playLeverPull();
    context.state.setFlag('grove_shelf_shortcut_open', true);
    context.syncGroveShelfShortcutState();
    context.updateWorldChunksAtPlayer();
    context.playGateOpenHeavy();
    context.playGateShortcut();
    context.showHeroOverlay('Shortcut Unlocked');
    context.startCameraPan?.(-93, 13, 750);
    context.triggerSave();
    context.triggerUIUpdate();
    return true;
  };

  const tryHandleQuarryBankShortcutLever = (interactionId: string): boolean => {
    if (interactionId === 'quarry_bank_gate_sealed') {
      context.playGateLockedHeavy();
      context.notify('Must open another way.', { id: 'quarry-bank-gate-sealed', duration: 2000 });
      return true;
    }
    if (interactionId !== 'quarry_bank_shortcut_lever') return false;
    if (context.state.currentMap !== 'forest') return true;

    if (context.state.getFlag('quarry_bank_shortcut_open')) {
      context.notify('The quarry-bank gate is already open.', { id: 'quarry-bank-shortcut-open', duration: 1800 });
      return true;
    }

    context.playLeverPull();
    context.state.setFlag('quarry_bank_shortcut_open', true);
    context.syncQuarryBankShortcutState();
    context.updateWorldChunksAtPlayer();
    context.playGateOpenHeavy();
    context.playGateShortcut();
    context.showHeroOverlay('Shortcut Unlocked');
    context.startCameraPan?.(55, 72, 750);
    context.triggerSave();
    context.triggerUIUpdate();
    return true;
  };

  const tryHandleRiversideBridgeShortcutLever = (interactionId: string): boolean => {
    if (interactionId !== 'riverside_bridge_shortcut_lever') return false;
    if (context.state.currentMap !== 'forest') return true;

    if (context.state.getFlag('riverside_bridge_shortcut_open')) {
      context.notify('The bridge is already lowered.', { id: 'riverside-bridge-open', duration: 1800 });
      return true;
    }

    context.playLeverPull();
    context.state.setFlag('riverside_bridge_shortcut_open', true);
    context.syncRiversideBridgeShortcutState();
    context.updateWorldChunksAtPlayer();
    context.playGateOpenHeavy();
    context.playGateShortcut();
    context.showHeroOverlay('Shortcut Unlocked');
    context.startCameraPan?.(-1, 7, 750);
    context.triggerSave();
    context.triggerUIUpdate();
    return true;
  };

  const tryHandleEastHollowRouteGateLever = (interactionId: string): boolean => {
    if (interactionId === 'east_hollow_route_gate_sealed') {
      context.playGateLockedHeavy();
      context.notify('Must open another way.', { id: 'east-hollow-route-gate-sealed', duration: 2000 });
      return true;
    }
    if (interactionId !== 'east_hollow_route_gate_lever') return false;
    if (context.state.currentMap !== 'forest') return true;

    if (context.state.getFlag('east_hollow_route_gate_open')) {
      context.notify('The route gate is already open.', { id: 'east-hollow-route-gate-open', duration: 1800 });
      return true;
    }

    context.playLeverPull();
    context.state.setFlag('east_hollow_route_gate_open', true);
    context.syncEastHollowRouteGateState();
    context.updateWorldChunksAtPlayer();
    context.playGateOpenHeavy();
    context.playGateShortcut();
    context.showHeroOverlay('Shortcut Unlocked');
    context.startCameraPan?.(89, -93, 750);
    context.triggerSave();
    context.triggerUIUpdate();
    return true;
  };

  const tryHandleHollowShortcutLever = (interactionId: string): boolean => {
    if (interactionId === 'hollow_gate_sealed') {
      context.playGateLockedHeavy();
      context.notify('Must open another way.', { id: 'hollow-gate-sealed', duration: 2000 });
      return true;
    }
    if (interactionId !== 'hollow_shortcut_lever') return false;
    if (context.state.currentMap !== 'forest') return true;

    if (context.state.getFlag('hollow_shortcut_open')) {
      context.notify('The hollow gate is already open.', { id: 'hollow-shortcut-open', duration: 1800 });
      return true;
    }

    context.playLeverPull();
    context.state.setFlag('hollow_shortcut_open', true);
    context.syncHollowShortcutState();
    context.updateWorldChunksAtPlayer();
    context.playGateOpenHeavy();
    context.playGateShortcut();
    context.showHeroOverlay('Shortcut Unlocked');
    context.startCameraPan?.(-28, -100, 750);
    context.triggerSave();
    context.triggerUIUpdate();
    return true;
  };

  const tryHandleHollowApproachLadder = (interactionId: string, _ladderX: number, _ladderY: number): boolean => {
    if (interactionId !== 'hollow_approach_ladder') return false;
    if (context.state.currentMap !== 'forest') return true;

    if (context.state.getFlag('hollow_approach_ladder_extended')) {
      context.notify('The ladder is already extended.', { id: 'ladder-already-extended', duration: 1800 });
      return true;
    }

    context.playLadderClimb();
    context.state.setFlag('hollow_approach_ladder_extended', true);
    context.syncHollowApproachLadderState();
    context.updateWorldChunksAtPlayer();
    context.playGateShortcut();
    context.showHeroOverlay('Ladder Extended');
    context.triggerSave();
    context.triggerUIUpdate();
    return true;
  };

  const tryHandleCliffCorridorLadder = (interactionId: string, ladderX: number, _ladderWorldY: number): boolean => {
    if (interactionId !== 'cliff_corridor_ladder') return false;
    if (context.state.currentMap !== 'forest') return true;

    if (context.state.getFlag('cliff_corridor_ladder_extended')) {
      context.notify('The ladder is already extended.', { id: 'cliff-ladder-already-extended', duration: 1800 });
      return true;
    }

    // Only allow from the enclosed overlook west of the cliff seam. The lower corridor side
    // sees the coiled ladder but cannot reach the release pin.
    if (context.state.player.position.x > ladderX) {
      context.startDialogue('cliff_corridor_ladder_wrong_side');
      return true;
    }

    context.playLadderClimb();
    context.state.setFlag('cliff_corridor_ladder_extended', true);
    context.syncCliffCorridorLadderState();
    context.updateWorldChunksAtPlayer();
    context.playGateShortcut();
    // Pan to the ladder's lower east landing so the player sees where it dropped.
    // Tile (269, 128) → world (119, -22).
    context.startCameraPan?.(119, -22, 750);
    context.showHeroOverlay('Shortcut Unlocked');
    context.triggerSave();
    context.triggerUIUpdate();
    return true;
  };

  const tryHandleFortRidgeLadder = (interactionId: string, ladderWorldX: number, _ladderWorldY: number): boolean => {
    if (interactionId !== 'fort_ridge_ladder') return false;
    if (context.state.currentMap !== 'forest') return true;

    if (context.state.getFlag('fort_ridge_ladder_extended')) {
      context.notify('The ladder is already extended.', { id: 'fort-ridge-ladder-extended', duration: 1800 });
      return true;
    }

    // The latch is released only from the el1 overlook EAST of the gate. A fort-side player
    // can still stand close enough to the gate ladder to interact, so require the actual
    // east ridge tile rather than any position merely "not west" of the gate.
    if (!canReleaseFortRidgeLadderFromPosition(context.state.player.position.x, ladderWorldX)) {
      context.startDialogue('fort_ridge_ladder_wrong_side');
      return true;
    }

    context.playLadderClimb();
    context.state.setFlag('fort_ridge_ladder_extended', true);
    context.syncFortRidgeLadderState();
    context.updateWorldChunksAtPlayer();
    context.playGateShortcut();
    // Pan to the west-side landing below the drop (tile 238,171 → world 88, 21).
    context.startCameraPan?.(88, 21, 750);
    context.showHeroOverlay('Shortcut Unlocked');
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
      context.playGateLockedHeavy();
      context.startDialogue('forest_fort_gate_locked');
      return true;
    }

    context.playGateOpenHeavy();
    context.state.setFlag('forest_fort_gate_open', true);
    context.syncForestFortGateState();
    context.syncManuscriptCheckpointGateState();
    context.updateWorldChunksAtPlayer();
    context.playGateShortcut();
    context.showHeroOverlay('Eastern Fort Unlocked');
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
      context.playGateLockedHeavy();
      context.startDialogue('north_fort_gate_locked');
      return true;
    }

    context.playGateOpenHeavy();
    context.state.setFlag('north_fort_gate_open', true);
    context.syncNorthFortGateState();
    context.updateWorldChunksAtPlayer();
    context.playGateShortcut();
    context.showHeroOverlay('Southern Fort Unlocked');
    context.triggerSave();
    context.triggerUIUpdate();
    return true;
  };

  const tryHandleWestFortGate = (interactionId: string): boolean => {
    if (interactionId !== 'west_fort_gate') return false;
    if (context.state.currentMap !== 'forest') return true;

    if (context.state.getFlag('west_fort_gate_open')) {
      context.notify('The fort gate is already open.', { id: 'west-fort-gate-open', duration: 1800 });
      return true;
    }

    if (!context.state.hasItem('fort_gate_key')) {
      context.playGateLockedHeavy();
      context.startDialogue('west_fort_gate_locked');
      return true;
    }

    context.playGateOpenHeavy();
    context.state.setFlag('west_fort_gate_open', true);
    context.syncWestFortGateState();
    context.updateWorldChunksAtPlayer();
    context.playGateShortcut();
    context.showHeroOverlay('Western Fort Unlocked');
    context.triggerSave();
    context.triggerUIUpdate();
    return true;
  };

  const tryHandleGolemFortGate = (interactionId: string): boolean => {
    if (interactionId !== 'golem_fort_gate') return false;
    if (context.state.currentMap !== 'forest') return true;

    if (context.state.getFlag('golem_fort_gate_open')) {
      context.notify('The fort gate is already open.', { id: 'golem-fort-gate-open', duration: 1800 });
      return true;
    }

    if (!context.state.hasItem('fort_gate_key')) {
      context.playGateLockedHeavy();
      context.startDialogue('golem_fort_gate_locked');
      return true;
    }

    context.playGateOpenHeavy();
    context.state.setFlag('golem_fort_gate_open', true);
    context.syncGolemFortGateState();
    context.updateWorldChunksAtPlayer();
    context.playGateShortcut();
    context.showHeroOverlay('Northern Fort Unlocked');
    context.triggerSave();
    context.triggerUIUpdate();
    return true;
  };

  const tryHandleManuscriptCheckpointGate = (interactionId: string): boolean => {
    if (interactionId !== 'manuscript_checkpoint_gate') return false;
    if (context.state.currentMap !== 'forest') return true;

    // Gate can only be opened by the guard through dialogue — never auto-opens here.
    // Route all interactions to the guard so the player must speak with him.
    context.startDialogue('manuscript_gate_guard');
    return true;
  };

  const tryHandleHollowFogGate = (interactionId: string): boolean => {
    if (interactionId === 'guilrhym_fog_gate') {
      if (context.state.currentMap !== 'guilrhym') return true;
      if (context.state.getFlag('ashen_reaver_defeated')) {
        context.notify('The ashen fog has lifted.', { id: 'fog-gate-clear', duration: 1800 });
        return true;
      }
      context.startDialogue('guilrhym_fog_gate_confirm');
      return true;
    }

    if (interactionId !== 'hollow_fog_gate') return false;
    if (context.state.currentMap !== 'forest') return true;

    if (context.state.getFlag('hollow_guardian_defeated')) {
      context.notify('The fog has lifted.', { id: 'fog-gate-clear', duration: 1800 });
      return true;
    }

    context.startDialogue('hollow_fog_gate_confirm');
    return true;
  };

  const tryHandleGuilrhymShortcutLever = (interactionId: string): boolean => {
    if (interactionId !== 'guilrhym_shortcut_lever_1' && interactionId !== 'guilrhym_shortcut_lever_2') return false;
    if (context.state.currentMap !== 'guilrhym') return true;

    const flagKey = `${interactionId}_open`;
    if (context.state.getFlag(flagKey)) {
      context.notify('The gate is already open.', { id: `${interactionId}-open`, duration: 1800 });
      return true;
    }

    context.playLeverPull();
    context.state.setFlag(flagKey, true);
    context.syncGuilrhymBossState();
    context.updateWorldChunksAtPlayer();
    context.playGateOpenHeavy();
    context.playGateShortcut();
    context.showHeroOverlay('Shortcut Unlocked');
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

  // Small searchable containers at the abandoned homestead (barrels + crate).
  // One-time interaction: press E to rummage and find a handful of coins.
  const tryHandleHomesteadContainer = (interactionId: string): boolean => {
    if (!interactionId.startsWith('homestead_container_')) return false;

    const flagKey = `opened_${interactionId}`;
    if (context.state.getFlag(flagKey)) {
      context.notify('Nothing left inside.', { id: `${interactionId}-empty`, duration: 1400 });
      return true;
    }

    context.state.setFlag(flagKey, true);
    context.state.addGold(10);
    context.playGoldPickup();
    context.playChestUnlock();
    context.notify('Rummaged through the container', {
      id: `${interactionId}-found`,
      type: 'success',
      description: '+10 gold',
      duration: 2000,
    });
    context.triggerSave();
    context.triggerUIUpdate();
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
    tryHandleForestShortcutLever,
    tryHandleGroveShelfShortcutLever,
    tryHandleQuarryBankShortcutLever,
    tryHandleWestCliffGateLever,
    tryHandleRiversideBridgeShortcutLever,
    tryHandleHollowShortcutLever,
    tryHandleEastHollowRouteGateLever,
    tryHandleHollowApproachLadder,
    tryHandleCliffCorridorLadder,
    tryHandleFortRidgeLadder,
    tryHandleForestFortGate,
    tryHandleNorthFortGate,
    tryHandleWestFortGate,
    tryHandleGolemFortGate,
    tryHandleManuscriptCheckpointGate,
    tryHandleHollowFogGate,
    tryHandleGuilrhymShortcutLever,
    tryHandleBlightedRoot,
    tryHandleHomesteadContainer,
    tryHandleDialogueInteraction,
    tryPickupWorldItems,
  };
}
