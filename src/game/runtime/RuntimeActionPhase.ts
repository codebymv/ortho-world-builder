import type { Dispatch, MutableRefObject, SetStateAction } from 'react';
import type { DialogueNode } from '@/data/dialogues';
import type { Item, GameState } from '@/lib/game/GameState';
import type { CriticalPathItemVisual } from '@/data/criticalPathItems';
import type { RuntimeSessionState } from '@/game/runtime/RuntimeSessionState';
import type { Direction8 } from '@/game/runtime/PlayerSimulationSystem';
import { createRuntimeSfx } from '@/game/runtime/RuntimeSfx';
import { createBonfireRestAction } from '@/game/runtime/RuntimeRestFlow';
import { createPerformDodgeAction } from '@/game/runtime/RuntimePlayerActions';
import { createRuntimeCombatActions } from '@/game/runtime/RuntimeCombatActions';
import { createRuntimeDialogueFlow } from '@/game/runtime/RuntimeDialogueFlow';
import { createInteractionCheckAction, createUsePotionAction } from '@/game/runtime/RuntimeInteractionActions';

interface RuntimeActionPhaseOptions {
  state: GameState;
  world: {
    activateSwitch: (doorId: string) => void;
    updateChunks: (x: number, y: number) => void;
    getCurrentMap: () => any;
  };
  runtimeSession: RuntimeSessionState;
  processAudioElement: (audio: HTMLAudioElement) => void;
  musicRef: MutableRefObject<HTMLAudioElement | null>;
  musicStarted: MutableRefObject<boolean>;
  showHeroOverlay: (title: string, subtitle?: string) => void;
  particleSystem: {
    emitHeal: (position: { x: number; y: number; z?: number } | any) => void;
    emitSparkles: (position: { x: number; y: number; z?: number } | any) => void;
    emitBonfireKindled: (position: { x: number; y: number; z?: number } | any) => void;
    emitDamage: (position: any) => void;
    emit: (position: any, count: number, color: number, size: number, speed: number, life: number) => void;
  };
  combatSystem: any;
  floatingText: any;
  screenShake: any;
  items: Record<string, Item>;
  criticalPathItems: Record<string, CriticalPathItemVisual>;
  criticalItemInteractionIds: Set<string>;
  createDialogueProgression: () => {
    selectDialogueStartNode: (state: GameState, dialogueId: string) => DialogueNode | null | undefined;
  };
  activeNpcWorldPos: MutableRefObject<{ x: number; y: number } | null>;
  setCurrentDialogue: Dispatch<SetStateAction<{ node: DialogueNode; npcName: string } | null>>;
  addMarkersFromText: (text: string, currentMap: string) => void;
  notify: (title: string, options?: { id?: string; type?: string; description?: string; duration?: number }) => void;
  triggerSave: () => void;
  triggerUIUpdate: () => void;
  respawnEnemiesForCurrentMap: (targetMap: string, map: any) => void;
  syncOpenedChestState: () => void;
  syncHarvestedTempestGrassState: () => void;
  syncHarvestedMoonbloomState: () => void;
  syncWhisperingWoodsShortcutState: () => void;
  syncGroveShelfShortcutState: () => void;
  syncHollowShortcutState: () => void;
  syncForestFortGateState: () => void;
  syncHollowFogGateState: () => void;
  syncHollowArenaExitState: () => void;
  handleMapTransition: (targetMap: string, targetX: number, targetY: number) => void;
  healCooldowns: MutableRefObject<Map<string, number>>;
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
  respawnEnemiesForCurrentMap,
  syncOpenedChestState,
  syncHarvestedTempestGrassState,
  syncHarvestedMoonbloomState,
  syncWhisperingWoodsShortcutState,
  syncGroveShelfShortcutState,
  syncHollowShortcutState,
  syncForestFortGateState,
  syncHollowFogGateState,
  syncHollowArenaExitState,
  handleMapTransition,
  healCooldowns,
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

  const bonfireActions = createBonfireRestAction({
    state,
    world: world as any,
    particleSystem: particleSystem as any,
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
  });

  const { performAttack, performChargeAttack, triggerComboChain } = createRuntimeCombatActions({
    state,
    combatSystem,
    floatingText,
    screenShake,
    particleSystem: particleSystem as any,
    enemyAudio: sfx.enemyAudio,
    notify,
    triggerUIUpdate,
    playItemGrab: sfx.playItemGrab,
    playSwordSwing: sfx.playSwordSwing,
    playBladeSheath: sfx.playBladeSheath,
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
    onBossDefeated: () => {
      syncHollowArenaExitState();
      syncHollowFogGateState();
      showHeroOverlay('HOLLOW APPARITION VANQUISHED', 'The fog lifts…');
    },
  });

  const { interactionSystem } = createRuntimeDialogueFlow({
    state,
    items,
    createDialogueProgression,
    activeNpcWorldPos,
    setCurrentDialogue,
    addMarkersFromText,
    playItemGrab: sfx.playItemGrab,
    playGrassPull: sfx.playGrassPull,
    playChestUnlock: sfx.playChestUnlock,
    playGateShortcut: sfx.playGateShortcut,
    particleSystem: particleSystem as any,
    notify,
    triggerSave,
    triggerUIUpdate,
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
    syncHollowShortcutState,
    syncForestFortGateState,
    showHeroOverlay,
    hasDialogue,
  });

  const usePotion = createUsePotionAction({
    state,
    particleSystem: particleSystem as any,
    notify,
    triggerUIUpdate,
    playPotionDrink: sfx.playPotionDrink,
    playGrassChew: sfx.playGrassChew,
    setPlayerAnimState: value => {
      runtimeSession.animation.playerAnimState = value as any;
    },
    setHeldConsumableSpriteId: value => {
      runtimeSession.animation.heldConsumableSpriteId = value;
    },
    setDrinkTimer: value => {
      runtimeSession.animation.drinkTimer = value;
    },
    drinkDuration,
  });

  const checkInteraction = createInteractionCheckAction({
    state,
    world: world as any,
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
    playPlayerHit: sfx.playPlayerHit,
    playHeroEvent: sfx.playHeroEvent,
    playGateShortcut: sfx.playGateShortcut,
    startPortalChargeLoop: sfx.startPortalChargeLoop,
    stopPortalChargeLoop: sfx.stopPortalChargeLoop,
    playPortalWarp: sfx.playPortalWarp,
    playDialogueAdvance: sfx.playDialogueAdvance,
    startDialogueLoop: sfx.startDialogueLoop,
    stopDialogueLoop: sfx.stopDialogueLoop,
    playMenuOpen: sfx.playMenuOpen,
    playMenuClose: sfx.playMenuClose,
    usePotion,
    checkInteraction,
    performDodge,
    performAttack,
    performChargeAttack,
    triggerComboChain,
    restAtBonfire: bonfireActions.restAtBonfire,
    travelToBonfire: bonfireActions.travelToBonfire,
  };
}
