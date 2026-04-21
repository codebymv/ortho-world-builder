import type { GameplayPreludeContext } from '@/game/runtime/RuntimePhaseContexts';
import { updateNpcBehaviors } from '@/game/runtime/NpcBehaviorSystem';
import { updatePlayerSimulation, type Direction8, type PlayerAnimState } from '@/game/runtime/PlayerSimulationSystem';
import { checkPositionBasedProgression } from '@/game/runtime/RuntimeMapRules';

interface AdvanceGameFrameOptions {
  currentTime: number;
  lastTime: number;
  maxDelta: number;
  isPaused: boolean;
  isMapModalOpen: boolean;
  isPlayerDead: boolean;
  updateScreenShake: (deltaTime: number) => boolean;
  updateFloatingText: (deltaTime: number) => void;
  renderFrame: () => void;
}

export function advanceGameFrame({
  currentTime,
  lastTime,
  maxDelta,
  isPaused,
  isMapModalOpen,
  isPlayerDead,
  updateScreenShake,
  updateFloatingText,
  renderFrame,
}: AdvanceGameFrameOptions) {
  let deltaTime = (currentTime - lastTime) / 1000;
  if (deltaTime > maxDelta) deltaTime = maxDelta;

  if (isPaused || isMapModalOpen) {
    renderFrame();
    return {
      shouldContinue: false,
      deltaTime,
      lastTime: currentTime,
    };
  }

  if (isPlayerDead) {
    renderFrame();
    return {
      shouldContinue: false,
      deltaTime,
      lastTime: currentTime,
    };
  }

  const frozen = updateScreenShake(deltaTime);
  if (frozen) {
    updateFloatingText(deltaTime);
    renderFrame();
    return {
      shouldContinue: false,
      deltaTime,
      lastTime: currentTime,
    };
  }

  return {
    shouldContinue: true,
    deltaTime,
    lastTime: currentTime,
  };
}

export interface RunGameplayPreludeOptions extends GameplayPreludeContext {
  currentTime: number;
  deltaTime: number;
  isBlocking: boolean;
  playerAnimState: PlayerAnimState;
  blockAngle: number;
  portalCooldown: number;
  interactBuffered: boolean;
  potionBuffered: boolean;
  isLmbHeld: boolean;
  isChargingAttack: boolean;
  chargeTimer: number;
  chargeLevel: number;
  currentDir8: Direction8;
  footstepTimer: number;
  attackFrame: number;
  attackFrameTimer: number;
  spinDirIndex: number;
  spinFrameTimer: number;
  drinkTimer: number;
  animTimer: number;
  animFrame: number;
  dodgeBuffered: boolean;
  comboStep: number;
  comboWindowTimer: number;
  comboInputBuffered: boolean;
}

export function runGameplayPrelude({
  state,
  world,
  currentTime,
  deltaTime,
  isBlocking,
  playerAnimState,
  blockAngle,
  portalCooldown,
  blockStaminaCost,
  triggerUIUpdateThrottled,
  activeNpcIndices,
  npcData,
  npcWander,
  isNpcPriorityCueTarget,
  npcScaleById,
  npcFootOffset,
  getVisualYAt,
  getActorRenderOrder,
  npcMeshes,
  npcShadows,
  npcOutlines,
  npcObjectiveHalos,
  npcObjectiveRings,
  interactBuffered,
  potionBuffered,
  checkInteraction,
  consumePotion,
  isLmbHeld,
  isChargingAttack,
  chargeTimer,
  chargeLevel,
  currentDir8,
  footstepTimer,
  footstepInterval,
  attackFrame,
  attackFrameTimer,
  attackFrameDuration,
  spinDirIndex,
  spinFrameTimer,
  spinFrameDuration,
  spinDirections,
  drinkTimer,
  animTimer,
  animFrame,
  idleFrameDuration,
  walkFrameDuration,
  chargeTimeMin,
  chargeTimeMax,
  dodgeBuffered,
  keys,
  visitedTiles,
  getDirection8,
  dir8to4,
  performDodge,
  playFootstep,
  emitDust,
  emitHeal,
  triggerMinimapUpdate,
  lungeState,
  combatSystem,
  onLungeHit,
  onLungeEnd,
  particleSystem,
  playPropBreak,
  dodgeIFrameDuration,
  comboStep,
  comboWindowTimer,
  comboInputBuffered,
  triggerComboChain,
  comboWindowDuration,
  getComboFrameDuration,
  notify,
}: RunGameplayPreludeOptions) {
  const nowSec = currentTime / 1000;
  if (state.player.iFrameTimer > 0) {
    state.player.iFrameTimer = Math.max(0, state.player.iFrameTimer - deltaTime);
  }
  if (state.player.guardBrokenTimer > 0) {
    state.player.guardBrokenTimer = Math.max(0, state.player.guardBrokenTimer - deltaTime);
  }
  if (state.player.parryBonusTimer > 0) {
    state.player.parryBonusTimer = Math.max(0, state.player.parryBonusTimer - deltaTime);
  }
  if (state.player.snareTimer > 0) {
    state.player.snareTimer = Math.max(0, state.player.snareTimer - deltaTime);
    if (state.player.snareTimer <= 0) {
      state.player.snareSpeedMult = 1.0;
    }
  }
  if (state.player.stealthTimer > 0) {
    state.player.stealthTimer = Math.max(0, state.player.stealthTimer - deltaTime);
    if (state.player.stealthTimer <= 0) {
      state.player.stealthDetectionMult = 1.0;
      notify('Stealth faded.', { id: 'stealth-faded', duration: 2000 });
    }
  }
  if (nowSec - state.player.lastStaminaUseTime > state.player.staminaRegenDelay) {
    state.player.stamina = Math.min(
      state.player.maxStamina,
      state.player.stamina + state.player.staminaRegenRate * deltaTime,
    );
  }

  if (isBlocking) {
    if (state.player.stamina <= 0 || state.player.guardBrokenTimer > 0) {
      isBlocking = false;
      if (playerAnimState === 'block') {
        playerAnimState = 'idle';
      }
    } else {
      state.player.stamina = Math.max(0, state.player.stamina - blockStaminaCost * deltaTime);
      state.player.lastStaminaUseTime = nowSec;
    }
  }

  triggerUIUpdateThrottled(currentTime);

  const targetBlockAngle = isBlocking ? 0.3 : 0;
  blockAngle += (targetBlockAngle - blockAngle) * Math.min(1, deltaTime * 15);

  if (portalCooldown > 0) {
    portalCooldown -= deltaTime;
  }

  updateNpcBehaviors({
    activeNpcIndices,
    npcData,
    npcWander,
    currentTime,
    deltaTime,
    isDialogueActive: state.dialogueActive,
    currentDialogue: state.currentDialogue,
    world,
    isNpcPriorityCueTarget,
    npcScaleById,
    npcFootOffset,
    getVisualYAt,
    getActorRenderOrder,
    meshes: {
      npcMeshes,
      npcShadows,
      npcOutlines,
      npcObjectiveHalos,
      npcObjectiveRings,
    },
  });

  if (interactBuffered && !state.dialogueActive) {
    checkInteraction();
    interactBuffered = false;
  }
  if (potionBuffered && !state.dialogueActive) {
    consumePotion();
    potionBuffered = false;
  }

  ({
    isChargingAttack,
    chargeTimer,
    chargeLevel,
    playerAnimState,
    currentDir8,
    footstepTimer,
    attackFrame,
    attackFrameTimer,
    spinDirIndex,
    spinFrameTimer,
    drinkTimer,
    animTimer,
    animFrame,
    dodgeBuffered,
    comboStep,
    comboWindowTimer,
    comboInputBuffered,
  } = updatePlayerSimulation({
    state,
    world,
    currentTime,
    deltaTime,
    isDialogueActive: state.dialogueActive,
    isBlocking,
    isLmbHeld,
    isChargingAttack,
    chargeTimer,
    chargeLevel,
    playerAnimState,
    currentDir8,
    footstepTimer,
    footstepInterval,
    attackFrame,
    attackFrameTimer,
    attackFrameDuration,
    spinDirIndex,
    spinFrameTimer,
    spinFrameDuration,
    spinDirections,
    drinkTimer,
    animTimer,
    animFrame,
    idleFrameDuration,
    walkFrameDuration,
    chargeTimeMin,
    chargeTimeMax,
    dodgeBuffered,
    keys,
    visitedTiles,
    getDirection8,
    dir8to4,
    performDodge,
    playFootstep,
    emitDust,
    emitHeal,
    triggerMinimapUpdate,
    lungeState,
    combatSystem,
    onLungeHit,
    onLungeEnd,
    particleSystem,
    playPropBreak,
    dodgeIFrameDuration,
    comboStep,
    comboWindowTimer,
    comboInputBuffered,
    comboWindowDuration,
    getComboFrameDuration,
    triggerComboChain,
  }));

  const currentMap = world.getCurrentMap();
  const tileY = Math.floor(state.player.position.y + currentMap.height / 2);
  if (checkPositionBasedProgression(state, tileY)) {
    triggerUIUpdateThrottled(currentTime);
  }

  return {
    isBlocking,
    playerAnimState,
    blockAngle,
    portalCooldown,
    interactBuffered,
    potionBuffered,
    isChargingAttack,
    chargeTimer,
    chargeLevel,
    currentDir8,
    footstepTimer,
    attackFrame,
    attackFrameTimer,
    spinDirIndex,
    spinFrameTimer,
    drinkTimer,
    animTimer,
    animFrame,
    dodgeBuffered,
    comboStep,
    comboWindowTimer,
    comboInputBuffered,
  };
}
