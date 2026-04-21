import type { Dispatch, MutableRefObject, SetStateAction } from 'react';
import type { DialogueNode } from '@/data/dialogues';
import type { Item, GameState } from '@/lib/game/GameState';
import type { CriticalPathItemVisual } from '@/data/criticalPathItems';
import type { RuntimeSessionState } from '@/game/runtime/RuntimeSessionState';
import type { Direction8 } from '@/game/runtime/PlayerSimulationSystem';
import type { World, WorldMap } from '@/lib/game/World';
import type { BreakableWorld } from '@/game/runtime/BreakableProps';
import type { CombatSystem } from '@/lib/game/Combat';
import type { FloatingTextSystem } from '@/lib/game/FloatingText';
import type { ScreenShake } from '@/lib/game/ScreenShake';
import type { ParticleSystem } from '@/lib/game/ParticleSystem';
import { createRuntimeSfx } from '@/game/runtime/RuntimeSfx';
import { createBonfireRestAction } from '@/game/runtime/RuntimeRestFlow';
import { createPerformDodgeAction } from '@/game/runtime/RuntimePlayerActions';
import { createRuntimeCombatActions } from '@/game/runtime/RuntimeCombatActions';
import { createRuntimeDialogueFlow } from '@/game/runtime/RuntimeDialogueFlow';
import { createInteractionCheckAction, createUsePotionAction } from '@/game/runtime/RuntimeInteractionActions';

interface RuntimeActionPhaseOptions {
  state: GameState;
  world: World & BreakableWorld;
  runtimeSession: RuntimeSessionState;
  processAudioElement: (audio: HTMLAudioElement) => void;
  musicRef: MutableRefObject<HTMLAudioElement | null>;
  musicStarted: MutableRefObject<boolean>;
  showHeroOverlay: (title: string, subtitle?: string) => void;
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
  respawnEnemiesForCurrentMap: (targetMap: string, map: WorldMap) => void;
  syncOpenedChestState: () => void;
  syncHarvestedTempestGrassState: () => void;
  syncHarvestedMoonbloomState: () => void;
  syncWhisperingWoodsShortcutState: () => void;
  syncGroveShelfShortcutState: () => void;
  syncHollowShortcutState: () => void;
  syncHollowApproachLadderState: () => void;
  syncCliffCorridorLadderState: () => void;
  syncForestFortGateState: () => void;
  syncNorthFortGateState: () => void;
  syncHollowFogGateState: () => void;
  syncHollowArenaVictoryPortalState: () => void;
  switchMusicTrack: (mapId: string) => void;
  syncGilrhymBossState: () => void;
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
  syncHollowApproachLadderState,
  syncCliffCorridorLadderState,
  syncForestFortGateState,
  syncNorthFortGateState,
  syncHollowFogGateState,
  syncHollowArenaVictoryPortalState,
  switchMusicTrack,
  syncGilrhymBossState,
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
    world,
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

  const { onEnemyKilled, performAttack, performChargeAttack, triggerComboChain } = createRuntimeCombatActions({
    state,
    world,
    combatSystem,
    floatingText,
    screenShake,
    particleSystem,
    playPropBreak: sfx.playPropBreak,
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
    playGrassPull: sfx.playGrassPull,
    playChestUnlock: sfx.playChestUnlock,
    playGateShortcut: sfx.playGateShortcut,
    particleSystem,
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
    syncHollowApproachLadderState,
    syncCliffCorridorLadderState,
    syncForestFortGateState,
    syncNorthFortGateState,
    syncGilrhymBossState,
    showHeroOverlay,
    hasDialogue,
    onWorldItemPickup: (itemId: string) => {
      const CHECKMARK = '\u2713';
      if (itemId === 'manuscript_fragment') {
        state.setFlag('manuscript_fragment_collected', true);
        const q = state.quests.find(q => q.id === 'find_hunter' && q.active && !q.completed);
        if (q) {
          q.objectives[1] = `Find the Disparaged Cottage ${CHECKMARK}`;
          q.objectives[2] = `Find traces of the manuscript ${CHECKMARK}`;
          triggerUIUpdate();
        }
        if (!state.getFlag('hunter_clue_dialogue_seen') && hasDialogue('hunter_clue')) {
          dialoguePickupRef.startDialogue?.('hunter_clue');
        }
      } else if (itemId === 'hunters_manuscript') {
        state.setFlag('hunters_manuscript_collected', true);
        const q = state.quests.find(q => q.id === 'find_hunter' && q.active && !q.completed);
        if (q) {
          q.objectives[5] = `Recover the complete manuscript ${CHECKMARK}`;
          addMarkersFromText('Village Elder', 'village');
          triggerUIUpdate();
        }
      }
    },
    getAliveEnemyCountNearPlayer: (radius: number) => {
      const pos = state.player.position;
      return combatSystem.getEnemiesInRange(pos, radius)
        .filter(e => e.health > 0).length;
    },
  });

  dialoguePickupRef.startDialogue = startDialogue;

  const consumePotion = createUsePotionAction({
    state,
    particleSystem,
    notify,
    triggerUIUpdate,
    playPotionDrink: sfx.playPotionDrink,
    playGrassChew: sfx.playGrassChew,
    setPlayerAnimState: value => {
      runtimeSession.animation.playerAnimState = value;
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
    playPropBreak: sfx.playPropBreak,
    startStormLoop: sfx.startStormLoop,
    stopStormLoop: sfx.stopStormLoop,
    playThunder: sfx.playThunder,
    consumePotion,
    checkInteraction,
    performDodge,
    performAttack,
    performChargeAttack,
    triggerComboChain,
    onEnemyKilled,
    restAtBonfire: bonfireActions.restAtBonfire,
    travelToBonfire: bonfireActions.travelToBonfire,
  };
}
