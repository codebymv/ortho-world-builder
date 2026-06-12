import type { Dispatch, MutableRefObject, SetStateAction } from 'react';
import type { DialogueNode } from '@/data/dialogues';
import type { Item, GameState } from '@/lib/game/GameState';
import type { CriticalPathItemVisual } from '@/data/criticalPathItems';
import type { RuntimeSessionState } from '@/game/runtime/RuntimeSessionState';
import type { Direction8 } from '@/game/runtime/PlayerSimulationSystem';
import type { World, WorldMap } from '@/lib/game/World';
import type { BreakableWorld } from '@/game/runtime/BreakableProps';
import type { CombatSystem, Enemy } from '@/lib/game/Combat';
import type { FloatingTextSystem } from '@/lib/game/FloatingText';
import type { ScreenShake } from '@/lib/game/ScreenShake';
import type { ParticleSystem } from '@/lib/game/ParticleSystem';
import type { RewardBundle, ShowRewardBundleOptions } from '@/game/domain/rewardDisplay';
import { createRuntimeSfx } from '@/game/runtime/RuntimeSfx';
import { createBonfireRestAction } from '@/game/runtime/RuntimeRestFlow';
import { createPerformDodgeAction } from '@/game/runtime/RuntimePlayerActions';
import { scheduleCameraPan } from '@/game/runtime/RuntimePlayerFrame';
import {
  FIND_HUNTER_INDEX,
  FIND_HUNTER_MANUSCRIPT_OBJECTIVE,
  tryCompleteFindHunterQuest,
} from '@/lib/game/findHunterProgression';
import { markObjectiveDone } from '@/lib/game/progressionToasts';
import { createRuntimeCombatActions } from '@/game/runtime/RuntimeCombatActions';
import { createRuntimeDialogueFlow } from '@/game/runtime/RuntimeDialogueFlow';
import { createInteractionCheckAction, createCompleteConsumableUseAction, createUsePotionAction } from '@/game/runtime/RuntimeInteractionActions';

interface RuntimeActionPhaseOptions {
  state: GameState;
  world: World & BreakableWorld;
  runtimeSession: RuntimeSessionState;
  processAudioElement: (audio: HTMLAudioElement) => void;
  musicRef: MutableRefObject<HTMLAudioElement | null>;
  musicStarted: MutableRefObject<boolean>;
  showHeroOverlay: (title: string, subtitle?: string) => void;
  showRewardBundle: (bundle: RewardBundle, options?: ShowRewardBundleOptions) => void;
  particleSystem: ParticleSystem;
  combatSystem: CombatSystem;
  floatingText: FloatingTextSystem;
  screenShake: ScreenShake;
  items: Record<string, Item>;
  criticalPathItems: Record<string, CriticalPathItemVisual>;
  criticalItemInteractionIds: Set<string>;
  createDialogueProgression: () => {
    selectDialogueStartNode: (state: GameState, dialogueId: string) => DialogueNode | null | undefined;
  } | null;
  activeNpcWorldPos: MutableRefObject<{ x: number; y: number } | null>;
  setCurrentDialogue: Dispatch<SetStateAction<{ node: DialogueNode; npcName: string } | null>>;
  addMarkersFromText: (text: string, currentMap: string) => void;
  notify: (title: string, options?: { id?: string; type?: 'success' | 'info' | 'error'; description?: string; duration?: number }) => void;
  triggerSave: () => void;
  triggerUIUpdate: () => void;
  triggerMinimapUpdate: (force?: boolean, now?: number) => void;
  respawnEnemiesForCurrentMap: (targetMap: string, map: WorldMap) => void;
  syncOpenedChestState: () => void;
  syncHarvestedTempestGrassState: () => void;
  syncHarvestedMoonbloomState: () => void;
  syncWhisperingWoodsShortcutState: () => void;
  syncGroveShelfShortcutState: () => void;
  syncQuarryBankShortcutState: () => void;
  syncWestLakeBridgePlankState: () => void;
  syncWestCliffGateState: () => void;
  syncSouthEntryPicketGateState: () => void;
  syncEastCreekShoreGateState: () => void;
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
  syncHollowFogGateState: () => void;
  syncHollowArenaVictoryPortalState: () => void;
  switchMusicTrack: (mapId: string) => void;
  syncGuilrhymBossState: () => void;
  syncRevenantTerminusChestState: () => void;
  handleMapTransition: (targetMap: string, targetX: number, targetY: number) => void;
  healCooldowns: MutableRefObject<Map<string, number>>;
  visitedTilesRef: MutableRefObject<Set<string>>;
  hasDialogue: (interactionId: string) => boolean;
  dir8to4: (direction: Direction8) => 'up' | 'down' | 'left' | 'right';
  getKillCount: () => number;
  setKillCount: (value: number) => void;
  getCurrentDir8: () => Direction8;
  healCooldownMs: number;
  drinkDuration: number;
  attackFrameDuration: number;
  spinFrameDuration: number;
  spinDirections: Direction8[];
  swooshDuration: number;
  spinSwooshDuration: number;
  attackStaminaCost: number;
  chargeAttackStaminaCost: number;
  chargeDamageMult: number;
  dodgeIFrameDuration: number;
  dodgeStaminaCost: number;
  comboFrameMultipliers: readonly [number, number, number];
  comboDamageMultipliers: readonly [number, number, number];
  lungeDistMin: number;
  lungeDistMax: number;
  lungeSpeedBase: number;
  lungeSpeedFull: number;
  lungeRecoveryMin: number;
  lungeRecoveryMax: number;
  openBonfireMenu: () => void;
  showTransitionOverlay: (mapName: string, mapSubtitle?: string) => void;
}

export function setupRuntimeActionPhase({
  state,
  world,
  runtimeSession,
  processAudioElement,
  musicRef,
  musicStarted,
  showHeroOverlay,
  showRewardBundle,
  particleSystem,
  combatSystem,
  floatingText,
  screenShake,
  items,
  criticalPathItems,
  criticalItemInteractionIds,
  createDialogueProgression,
  activeNpcWorldPos,
  setCurrentDialogue,
  addMarkersFromText,
  notify,
  triggerSave,
  triggerUIUpdate,
  triggerMinimapUpdate,
  respawnEnemiesForCurrentMap,
  syncOpenedChestState,
  syncHarvestedTempestGrassState,
  syncHarvestedMoonbloomState,
  syncWhisperingWoodsShortcutState,
  syncGroveShelfShortcutState,
  syncQuarryBankShortcutState,
  syncWestLakeBridgePlankState,
  syncWestCliffGateState,
  syncSouthEntryPicketGateState,
  syncEastCreekShoreGateState,
  syncRiversideBridgeShortcutState,
  syncHollowShortcutState,
  syncEastHollowRouteGateState,
  syncHollowApproachLadderState,
  syncCliffCorridorLadderState,
  syncFortRidgeLadderState,
  syncForestFortGateState,
  syncNorthFortGateState,
  syncWestFortGateState,
  syncGolemFortGateState,
  syncManuscriptCheckpointGateState,
  syncHollowFogGateState,
  syncHollowArenaVictoryPortalState,
  switchMusicTrack,
  syncGuilrhymBossState,
  syncRevenantTerminusChestState,
  handleMapTransition,
  healCooldowns,
  visitedTilesRef,
  hasDialogue,
  dir8to4,
  getKillCount,
  setKillCount,
  getCurrentDir8,
  healCooldownMs,
  drinkDuration,
  attackFrameDuration,
  spinFrameDuration,
  spinDirections,
  swooshDuration,
  spinSwooshDuration,
  attackStaminaCost,
  chargeAttackStaminaCost,
  chargeDamageMult,
  dodgeIFrameDuration,
  dodgeStaminaCost,
  comboFrameMultipliers,
  comboDamageMultipliers,
  lungeDistMin,
  lungeDistMax,
  lungeSpeedBase,
  lungeSpeedFull,
  lungeRecoveryMin,
  lungeRecoveryMax,
  openBonfireMenu,
  showTransitionOverlay,
}: RuntimeActionPhaseOptions) {
  const sfx = createRuntimeSfx({
    processAudioElement,
    musicRef,
    musicStarted,
  });

  const playWeaponHitForEnemy = (enemy: Enemy) => {
    switch (enemy.type) {
      case 'skeleton':
      case 'skeleton_captain':
        sfx.playWeaponHitBone();
        return;
      case 'golem':
      case 'stone_sentinel':
        sfx.playWeaponHitStone();
        return;
      case 'plant':
        sfx.playWeaponHitPlant();
        return;
      case 'shadow':
      case 'shadow_lurker':
      case 'hollow_reaver':
      case 'void_wisp':
      case 'hollow_guardian':
      case 'ashen_reaver':
      case 'ridge_revenant':
        sfx.playWeaponHitEthereal();
        return;
      default:
        sfx.playWeaponHitFlesh();
    }
  };

  const bonfireActions = createBonfireRestAction({
    state,
    world,
    combatSystem,
    particleSystem,
    notify,
    showHeroOverlay,
    playBonfireKindle: sfx.playBonfireKindle,
    playBonfireRestore: sfx.playBonfireRestore,
    respawnEnemiesForCurrentMap,
    showTransitionOverlay,
    triggerSave,
    triggerUIUpdate,
    openBonfireMenu,
  });
  const performBonfireRest = bonfireActions.interact;

  const clearChargeState = () => {
    runtimeSession.animation.isChargingAttack = false;
    runtimeSession.animation.chargeTimer = 0;
    runtimeSession.animation.chargeLevel = 0;
    if (runtimeSession.animation.playerAnimState === 'charge') {
      runtimeSession.animation.playerAnimState = 'idle';
    }
  };

  const performDodge = createPerformDodgeAction({
    state,
    getCurrentDir8,
    setPlayerAnimState: value => {
      runtimeSession.animation.playerAnimState = value;
    },
    playDodgeRoll: sfx.playDodgeRoll,
    triggerUIUpdate,
    dodgeIFrameDuration,
    dodgeStaminaCost,
    getIsConsuming: () => runtimeSession.animation.drinkTimer > 0,
  });

  const { onEnemyKilled, performAttack, performBufferedAttack, performChargeAttack, triggerComboChain } = createRuntimeCombatActions({
    state,
    world,
    visitedTilesRef,
    combatSystem,
    floatingText,
    screenShake,
    particleSystem,
    playPropBreak: sfx.playPropBreak,
    playTallGrassBreak: sfx.playTallGrassBreak,
    enemyAudio: sfx.enemyAudio,
    notify,
    showHeroOverlay,
    triggerUIUpdate,
    playEssencePickup: sfx.playEssencePickup,
    playSwordSwing: sfx.playSwordSwing,
    playBossAttack: sfx.playBossAttack,
    playBladeSheath: sfx.playBladeSheath,
    playWeaponHit: playWeaponHitForEnemy,
    playWeaponChargeRelease: sfx.playWeaponChargeRelease,
    playWeaponArcWave: sfx.playWeaponArcWave,
    playStaggerEnemy: sfx.playStaggerEnemy,
    getKillCount,
    setKillCount,
    getCurrentDir8,
    dir8to4,
    getIsBlocking: () => runtimeSession.combat.isBlocking,
    setIsBlocking: value => {
      runtimeSession.combat.isBlocking = value;
    },
    setSwooshTimer: value => {
      runtimeSession.visual.swooshTimer = value;
    },
    setSwooshFacing: value => {
      runtimeSession.visual.swooshFacing = value;
    },
    swooshDuration,
    attackStaminaCost,
    chargeAttackStaminaCost,
    chargeDamageMult,
    spinSwooshDuration,
    setSpinSwooshTimer: value => {
      runtimeSession.visual.spinSwooshTimer = value;
    },
    arcWave: runtimeSession.combat.arcWave,
    setPlayerAnimState: value => {
      runtimeSession.animation.playerAnimState = value;
    },
    setAttackFrame: value => {
      runtimeSession.animation.attackFrame = value;
    },
    setAttackFrameTimer: value => {
      runtimeSession.animation.attackFrameTimer = value;
    },
    attackFrameDuration,
    setSpinDirIndex: value => {
      runtimeSession.animation.spinDirIndex = value;
    },
    setSpinFrameTimer: value => {
      runtimeSession.animation.spinFrameTimer = value;
    },
    spinFrameDuration,
    spinDirections,
    clearChargeState,
    getComboStep: () => runtimeSession.animation.comboStep,
    setComboStep: value => {
      runtimeSession.animation.comboStep = value;
    },
    getComboWindowTimer: () => runtimeSession.animation.comboWindowTimer,
    setComboWindowTimer: value => {
      runtimeSession.animation.comboWindowTimer = value;
    },
    getComboInputBuffered: () => runtimeSession.input.comboInputBuffered,
    setComboInputBuffered: value => {
      runtimeSession.input.comboInputBuffered = value;
    },
    getPlayerAnimState: () => runtimeSession.animation.playerAnimState,
    comboFrameMultipliers,
    comboDamageMultipliers,
    lungeDistMin,
    lungeDistMax,
    lungeSpeedBase,
    lungeSpeedFull,
    lungeRecoveryMin,
    lungeRecoveryMax,
    startLunge: (dirX: number, dirY: number, speed: number, distance: number, recovery: number, damage: number) => {
      runtimeSession.lunge.active = true;
      runtimeSession.lunge.recovering = false;
      runtimeSession.lunge.dirX = dirX;
      runtimeSession.lunge.dirY = dirY;
      runtimeSession.lunge.speed = speed;
      runtimeSession.lunge.distanceRemaining = distance;
      runtimeSession.lunge.recoveryTimer = recovery;
      runtimeSession.lunge.damage = damage;
      runtimeSession.lunge.hitEnemyIds.clear();
    },
    playHeresyAltarHit: sfx.playHeresyAltarHit,
    playHeresyAltarBreak: sfx.playHeresyAltarBreak,
    playRitualSummonStart: sfx.playRitualSummonStart,
    syncRevenantTerminusChestState,
    triggerSave,
    onBossDefeated: () => {
      syncHollowArenaVictoryPortalState();
      syncHollowFogGateState();
      switchMusicTrack('victory');
      showHeroOverlay('HOLLOW APPARITION VANQUISHED', 'The fog lifts…');
    },
  });

  const dialoguePickupRef: { startDialogue?: (dialogueId: string, npcName?: string) => void } = {};

  const { interactionSystem, startDialogue } = createRuntimeDialogueFlow({
    state,
    items,
    createDialogueProgression,
    activeNpcWorldPos,
    setCurrentDialogue,
    addMarkersFromText,
    playItemGrab: sfx.playItemGrab,
    playGoldPickup: sfx.playGoldPickup,
    playEssencePickup: sfx.playEssencePickup,
    playGrassPull: sfx.playGrassPull,
    playChestUnlock: sfx.playChestUnlock,
    playGateShortcut: sfx.playGateShortcut,
    playLeverPull: sfx.playLeverPull,
    playGateOpenHeavy: sfx.playGateOpenHeavy,
    playGateLockedHeavy: sfx.playGateLockedHeavy,
    playDoorOpenWood: sfx.playDoorOpenWood,
    playDoorCloseWood: sfx.playDoorCloseWood,
    playDoorLocked: sfx.playDoorLocked,
    playLadderClimb: sfx.playLadderClimb,
    particleSystem,
    notify,
    triggerSave,
    triggerUIUpdate,
    showRewardBundle,
    performBonfireRest,
    syncOpenedChestState,
    syncHarvestedTempestGrassState,
    syncHarvestedMoonbloomState,
    getInteractionCooldown: interactionId => healCooldowns.current.get(interactionId) || 0,
    setInteractionCooldown: (interactionId, timestamp) => {
      healCooldowns.current.set(interactionId, timestamp);
    },
    healCooldownMs,
    handleMapTransition,
    activateSwitch: (doorId: string) => {
      world.activateSwitch(doorId);
    },
    updateWorldChunksAtPlayer: () => {
      world.updateChunks(state.player.position.x, state.player.position.y);
    },
    syncWhisperingWoodsShortcutState,
    syncGroveShelfShortcutState,
    syncQuarryBankShortcutState,
    syncWestLakeBridgePlankState,
    syncWestCliffGateState,
    syncSouthEntryPicketGateState,
    syncEastCreekShoreGateState,
    syncRiversideBridgeShortcutState,
    syncHollowShortcutState,
    syncEastHollowRouteGateState,
    syncHollowApproachLadderState,
    syncCliffCorridorLadderState,
    syncFortRidgeLadderState,
    syncForestFortGateState,
    syncNorthFortGateState,
    syncWestFortGateState,
    syncGolemFortGateState,
    syncManuscriptCheckpointGateState,
    syncGuilrhymBossState,
    showHeroOverlay,
    startCameraPan: scheduleCameraPan,
    hasDialogue,
    onWorldItemPickup: (itemId: string) => {
      if (
        itemId === 'manuscript_fragment' ||
        itemId === 'evacuation_order' ||
        itemId === 'hunters_manuscript' ||
        itemId === 'wolf_ring' ||
        itemId === 'gravebound_ring'
      ) {
        sfx.playKeyItemDiscovered();
      }
      if (itemId === 'manuscript_fragment') {
        state.setFlag('manuscript_fragment_collected', true);
        const q = state.quests.find(q => q.id === 'find_hunter' && q.active && !q.completed);
        if (q) {
          markObjectiveDone(q, 1, 'Find the Disparaged Cottage');
          markObjectiveDone(q, 2, 'Find traces of the manuscript');
          triggerUIUpdate();
        }
        if (!state.getFlag('hunter_clue_dialogue_seen') && hasDialogue('hunter_clue')) {
          dialoguePickupRef.startDialogue?.('hunter_clue');
        }
      } else if (itemId === 'evacuation_order' || itemId === 'hunters_manuscript') {
        state.setFlag(itemId === 'evacuation_order' ? 'evacuation_order_collected' : 'hunters_manuscript_collected', true);
        const q = state.quests.find(q => q.id === 'find_hunter' && q.active && !q.completed);
        if (q) {
          markObjectiveDone(q, FIND_HUNTER_INDEX.manuscript, FIND_HUNTER_MANUSCRIPT_OBJECTIVE);
          addMarkersFromText('Village Elder', 'village');
          tryCompleteFindHunterQuest(state, notify, showHeroOverlay);
          triggerUIUpdate();
        }
      } else if (itemId === 'wolf_ring') {
        state.setFlag('wolf_ring_received', true);
        if (state.tryAutoEquipRing('wolf_ring')) {
          notify('Wolf Ring Equipped', {
            id: 'wolf-ring-equipped',
            type: 'success',
            description: 'Hit-stun and attack recovery slightly improved.',
            duration: 3200,
          });
        }
        triggerUIUpdate();
        // The ring-hint secondary marker is removed once the ring is received
        // (see getRingHintMarker). Force a minimap refresh so the legend recomputes
        // and drops the now-stale "Secondary" entry without waiting for the player to move.
        triggerMinimapUpdate(true);
      } else if (itemId === 'gravebound_ring') {
        state.setFlag('gravebound_ring_received', true);
        triggerUIUpdate();
        triggerMinimapUpdate(true);
      }
    },
    getAliveEnemyCountNearPlayer: (radius: number) => {
      const pos = state.player.position;
      return combatSystem.getEnemiesInRange(pos, radius)
        .filter(e => e.health > 0).length;
    },
  });

  dialoguePickupRef.startDialogue = startDialogue;

  const consumableUseOptions = {
    state,
    particleSystem,
    notify,
    triggerUIUpdate,
    playPotionDrink: sfx.playPotionDrink,
    playGrassChew: sfx.playGrassChew,
    setPlayerAnimState: (value: 'drinking') => {
      runtimeSession.animation.playerAnimState = value;
    },
    setHeldConsumableSpriteId: (value: string | null) => {
      runtimeSession.animation.heldConsumableSpriteId = value;
    },
    setDrinkTimer: (value: number) => {
      runtimeSession.animation.drinkTimer = value;
    },
    drinkDuration,
    getIsConsuming: () => runtimeSession.animation.drinkTimer > 0,
    getPendingConsumableUse: () => runtimeSession.animation.pendingConsumableUse,
    setPendingConsumableUse: (value: typeof runtimeSession.animation.pendingConsumableUse) => {
      runtimeSession.animation.pendingConsumableUse = value;
    },
  };

  const consumePotion = createUsePotionAction(consumableUseOptions);
  const completeConsumableUse = createCompleteConsumableUseAction(consumableUseOptions);

  const checkInteraction = createInteractionCheckAction({
    state,
    world,
    interactionSystem,
    criticalPathItems,
    criticalItemInteractionIds,
    notify,
    handleMapTransition,
  });

  return {
    enemyAudio: sfx.enemyAudio,
    playFootstep: sfx.playFootstep,
    playGameOverSound: sfx.playGameOverSound,
    playDeathSound: sfx.playDeathSound,
    playPotionDrink: sfx.playPotionDrink,
    playGrassChew: sfx.playGrassChew,
    playBlock: sfx.playBlock,
    playWeaponChargeStart: sfx.playWeaponChargeStart,
    playWeaponHit: playWeaponHitForEnemy,
    playStaggerEnemy: sfx.playStaggerEnemy,
    playParrySuccess: sfx.playParrySuccess,
    playParryProjectile: sfx.playParryProjectile,
    playGuardBreak: sfx.playGuardBreak,
    playPlayerHit: sfx.playPlayerHit,
    playSwordSwing: sfx.playSwordSwing,
    playBossAttack: sfx.playBossAttack,
    playHeroEvent: sfx.playHeroEvent,
    playRitualSummonStart: sfx.playRitualSummonStart,
    playPlantIdle: sfx.playPlantIdle,
    playPlantLash: sfx.playPlantLash,
    playHollowReaverAttack: sfx.playHollowReaverAttack,
    playProjectileCast: sfx.playProjectileCast,
    startProjectileFly: sfx.startProjectileFly,
    stopProjectileFly: sfx.stopProjectileFly,
    playProjectileImpact: sfx.playProjectileImpact,
    playProjectileReflect: sfx.playProjectileReflect,
    playHazardWarningPulse: sfx.playHazardWarningPulse,
    playHazardScytheFall: sfx.playHazardScytheFall,
    playHazardScytheImpact: sfx.playHazardScytheImpact,
    startBoulderRollLoop: sfx.startBoulderRollLoop,
    stopBoulderRollLoop: sfx.stopBoulderRollLoop,
    playBoulderImpact: sfx.playBoulderImpact,
    playVendorPurchase: sfx.playVendorPurchase,
    playInventoryEquip: sfx.playInventoryEquip,
    playInventoryUnequip: sfx.playInventoryUnequip,
    playGateShortcut: sfx.playGateShortcut,
    startPortalChargeLoop: sfx.startPortalChargeLoop,
    stopPortalChargeLoop: sfx.stopPortalChargeLoop,
    playPortalWarp: sfx.playPortalWarp,
    playDialogueAdvance: sfx.playDialogueAdvance,
    startDialogueLoop: sfx.startDialogueLoop,
    stopDialogueLoop: sfx.stopDialogueLoop,
    playMenuOpen: sfx.playMenuOpen,
    playMenuClose: sfx.playMenuClose,
    playPropBreak: sfx.playPropBreak,
    playTallGrassBreak: sfx.playTallGrassBreak,
    startStormLoop: sfx.startStormLoop,
    stopStormLoop: sfx.stopStormLoop,
    playThunder: sfx.playThunder,
    setOutdoorsLoopState: sfx.setOutdoorsLoopState,
    startCorruptionIdleLoop: sfx.startCorruptionIdleLoop,
    stopCorruptionIdleLoop: sfx.stopCorruptionIdleLoop,
    setCorruptionIdleLoopIntensity: sfx.setCorruptionIdleLoopIntensity,
    consumePotion,
    completeConsumableUse,
    checkInteraction,
    performDodge,
    performAttack,
    performBufferedAttack,
    performChargeAttack,
    triggerComboChain,
    onEnemyKilled,
    restAtBonfire: bonfireActions.restAtBonfire,
    travelToBonfire: bonfireActions.travelToBonfire,
  };
}
