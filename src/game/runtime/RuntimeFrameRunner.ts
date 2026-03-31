import * as THREE from 'three';
import { advanceGameFrame, runGameplayPrelude } from '@/game/runtime/GameLoop';
import { runPlayerFramePhase } from '@/game/runtime/RuntimePlayerFrame';
import { runEnemyLoop } from '@/game/runtime/RuntimeEnemyLoop';
import { runRuntimeLoopTail } from '@/game/runtime/RuntimeLoopTail';
import type { RuntimePhaseContexts } from '@/game/runtime/RuntimePhaseContexts';
import type { RuntimeSessionState } from '@/game/runtime/RuntimeSessionState';
import type { GameState } from '@/lib/game/GameState';
import type { ParticleSystem } from '@/lib/game/ParticleSystem';

interface RunRuntimeFrameOptions {
  runtimeSession: RuntimeSessionState;
  phaseContexts: RuntimePhaseContexts;
  currentTime: number;
  maxDelta: number;
  isPaused: boolean;
  isMapModalOpen: boolean;
  isPlayerDead: boolean;
  renderFrame: () => void;
  updateScreenShake: (deltaTime: number) => boolean;
  updateFloatingText: (deltaTime: number) => void;
  state: GameState;
  camera: THREE.OrthographicCamera;
  cameraTarget: { x: number; y: number };
  spinDirections: Array<'up' | 'down' | 'left' | 'right' | 'up_left' | 'up_right' | 'down_left' | 'down_right'>;
  spinSwooshDuration: number;
  transitionDebug: boolean;
  lastInteractionPrompt: string | null;
  vignette: HTMLDivElement | null;
  particleSystem: ParticleSystem;
  activeNpcWorldPos: { x: number; y: number } | null;
  lastNpcProjected: { x: number; y: number };
  currentBiome: string;
  onPlayerDied: (lostEssence: number) => void;
}

export function runRuntimeFrame({
  runtimeSession,
  phaseContexts,
  currentTime,
  maxDelta,
  isPaused,
  isMapModalOpen,
  isPlayerDead,
  renderFrame,
  updateScreenShake,
  updateFloatingText,
  state,
  camera,
  cameraTarget,
  spinDirections,
  spinSwooshDuration,
  transitionDebug,
  lastInteractionPrompt,
  vignette,
  particleSystem,
  activeNpcWorldPos,
  lastNpcProjected,
  currentBiome,
  onPlayerDied,
}: RunRuntimeFrameOptions) {
  const frameState = advanceGameFrame({
    currentTime,
    lastTime: runtimeSession.loop.lastTime,
    maxDelta,
    isPaused,
    isMapModalOpen,
    isPlayerDead,
    updateScreenShake,
    updateFloatingText,
    renderFrame,
  });

  runtimeSession.loop.lastTime = frameState.lastTime;
  if (!frameState.shouldContinue) {
    return lastInteractionPrompt;
  }

  const { deltaTime } = frameState;

  const preludeState = runGameplayPrelude({
    ...phaseContexts.gameplayPreludeContext,
    currentTime,
    deltaTime,
    isBlocking: runtimeSession.combat.isBlocking,
    playerAnimState: runtimeSession.animation.playerAnimState,
    blockAngle: runtimeSession.combat.blockAngle,
    portalCooldown: runtimeSession.loop.portalCooldown,
    interactBuffered: runtimeSession.input.interactBuffered,
    potionBuffered: runtimeSession.input.potionBuffered,
    isLmbHeld: runtimeSession.input.isLmbHeld,
    isChargingAttack: runtimeSession.animation.isChargingAttack,
    chargeTimer: runtimeSession.animation.chargeTimer,
    chargeLevel: runtimeSession.animation.chargeLevel,
    currentDir8: runtimeSession.animation.currentDir8,
    footstepTimer: runtimeSession.loop.footstepTimer,
    attackFrame: runtimeSession.animation.attackFrame,
    attackFrameTimer: runtimeSession.animation.attackFrameTimer,
    spinDirIndex: runtimeSession.animation.spinDirIndex,
    spinFrameTimer: runtimeSession.animation.spinFrameTimer,
    drinkTimer: runtimeSession.animation.drinkTimer,
    animTimer: runtimeSession.animation.animTimer,
    animFrame: runtimeSession.animation.animFrame,
    dodgeBuffered: runtimeSession.input.dodgeBuffered,
  });

  runtimeSession.combat.isBlocking = preludeState.isBlocking;
  runtimeSession.combat.blockAngle = preludeState.blockAngle;
  runtimeSession.loop.portalCooldown = preludeState.portalCooldown;
  runtimeSession.input.interactBuffered = preludeState.interactBuffered;
  runtimeSession.input.potionBuffered = preludeState.potionBuffered;
  runtimeSession.animation.isChargingAttack = preludeState.isChargingAttack;
  runtimeSession.animation.chargeTimer = preludeState.chargeTimer;
  runtimeSession.animation.chargeLevel = preludeState.chargeLevel;
  runtimeSession.animation.playerAnimState = preludeState.playerAnimState;
  runtimeSession.animation.currentDir8 = preludeState.currentDir8;
  runtimeSession.loop.footstepTimer = preludeState.footstepTimer;
  runtimeSession.animation.attackFrame = preludeState.attackFrame;
  runtimeSession.animation.attackFrameTimer = preludeState.attackFrameTimer;
  runtimeSession.animation.spinDirIndex = preludeState.spinDirIndex;
  runtimeSession.animation.spinFrameTimer = preludeState.spinFrameTimer;
  runtimeSession.animation.drinkTimer = preludeState.drinkTimer;
  runtimeSession.animation.animTimer = preludeState.animTimer;
  runtimeSession.animation.animFrame = preludeState.animFrame;
  runtimeSession.input.dodgeBuffered = preludeState.dodgeBuffered;

  if (!state.dialogueActive) {
    ({
      playerSmoothedElevation: runtimeSession.visual.playerSmoothedElevation,
      swooshTimer: runtimeSession.visual.swooshTimer,
      spinSwooshTimer: runtimeSession.visual.spinSwooshTimer,
      lastInteractionPrompt,
      lastTransitionDebugRefreshAt: runtimeSession.visual.lastTransitionDebugRefreshAt,
    } = runPlayerFramePhase({
      ...phaseContexts.playerFrameContext,
      currentTime,
      deltaTime,
      playerAnimState: runtimeSession.animation.playerAnimState,
      currentDir8: runtimeSession.animation.currentDir8,
      isChargingAttack: runtimeSession.animation.isChargingAttack,
      chargeLevel: runtimeSession.animation.chargeLevel,
      animFrame: runtimeSession.animation.animFrame,
      attackFrame: runtimeSession.animation.attackFrame,
      spinDirIndex: runtimeSession.animation.spinDirIndex,
      spinDirections,
      playerSmoothedElevation: runtimeSession.visual.playerSmoothedElevation,
      swooshTimer: runtimeSession.visual.swooshTimer,
      swooshFacing: runtimeSession.visual.swooshFacing,
      spinSwooshTimer: runtimeSession.visual.spinSwooshTimer,
      spinSwooshDuration,
      camera,
      cameraTarget,
      lastInteractionPrompt,
      transitionDebug,
      lastTransitionDebugRefreshAt: runtimeSession.visual.lastTransitionDebugRefreshAt,
      portalCooldown: runtimeSession.loop.portalCooldown,
      isMapModalOpen,
      isPlayerDead,
      vignette,
      particleSystem,
    }));

    const enemyLoopResult = runEnemyLoop({
      ...phaseContexts.enemyLoopContext,
      currentTime,
      deltaTime,
      isBlocking: runtimeSession.combat.isBlocking,
      blockStartTime: runtimeSession.combat.blockStartTime,
      isPlayerDead,
    });

    if (enemyLoopResult.playerDied) {
      onPlayerDied(enemyLoopResult.lostEssence);
    }
  }

  ({
    lastNpcScreenUpdate: runtimeSession.loop.lastNpcScreenUpdate,
    lastAutoSaveTime: runtimeSession.loop.lastAutoSaveTime,
  } = runRuntimeLoopTail({
    ...phaseContexts.runtimeLoopTailContext,
    playerPosition: state.player.position,
    activeNpcWorldPos,
    isDialogueActive: state.dialogueActive,
    currentTime,
    deltaTime,
    lastNpcScreenUpdate: runtimeSession.loop.lastNpcScreenUpdate,
    lastNpcProjected,
    currentBiome,
    lastAutoSaveTime: runtimeSession.loop.lastAutoSaveTime,
  }));

  return lastInteractionPrompt;
}
