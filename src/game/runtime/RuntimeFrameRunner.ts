import * as THREE from 'three';
import { advanceGameFrame, runGameplayPrelude, type RunGameplayPreludeOptions } from '@/game/runtime/GameLoop';
import { runPlayerFramePhase, type RunPlayerFramePhaseOptions } from '@/game/runtime/RuntimePlayerFrame';
import { runEnemyLoop, type RunEnemyLoopOptions } from '@/game/runtime/RuntimeEnemyLoop';
import { runRuntimeLoopTail, type RunRuntimeLoopTailOptions } from '@/game/runtime/RuntimeLoopTail';
import type { RuntimePhaseContexts } from '@/game/runtime/RuntimePhaseContexts';
import type { RuntimeSessionState } from '@/game/runtime/RuntimeSessionState';
import type { GameState } from '@/lib/game/GameState';
import type { ParticleSystem } from '@/lib/game/ParticleSystem';
import type { PerfProfiler, PerfStatsInput } from '@/game/runtime/PerfProfiler';

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
  particleSystem: ParticleSystem;
  activeNpcWorldPos: { x: number; y: number } | null;
  lastNpcProjected: { x: number; y: number };
  currentBiome: string;
  perfProfiler?: PerfProfiler;
  onPlayerDied: (lostEssence: number) => void;
}

function collectPerfStats(phaseContexts: RuntimePhaseContexts): PerfStatsInput {
  const tail = phaseContexts.runtimeLoopTailContext;
  const enemy = phaseContexts.enemyLoopContext;
  return {
    renderer: tail.renderer,
    world: tail.world,
    combatSystem: enemy.combatSystem,
    particleSystem: tail.particleSystem,
    weatherSystem: tail.weatherSystem,
    biomeAmbience: tail.biomeAmbience,
    worldItemCount: tail.state.worldItems.length,
  };
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
  particleSystem,
  activeNpcWorldPos,
  lastNpcProjected,
  currentBiome,
  perfProfiler,
  onPlayerDied,
}: RunRuntimeFrameOptions) {
  perfProfiler?.beginFrame(currentTime);
  const profilePhases = perfProfiler?.isEnabled() ?? false;
  const profiledRenderFrame = () => {
    if (!profilePhases) {
      renderFrame();
      return;
    }
    perfProfiler?.start('render');
    try {
      renderFrame();
    } finally {
      perfProfiler?.end('render');
    }
  };

  const frameState = advanceGameFrame({
    currentTime,
    lastTime: runtimeSession.loop.lastTime,
    maxDelta,
    isPaused,
    isMapModalOpen,
    isPlayerDead,
    updateScreenShake,
    updateFloatingText,
    renderFrame: profiledRenderFrame,
  });

  runtimeSession.loop.lastTime = frameState.lastTime;
  if (!frameState.shouldContinue) {
    perfProfiler?.endFrame(collectPerfStats(phaseContexts));
    return lastInteractionPrompt;
  }

  const { deltaTime } = frameState;

  const preludeOpts = phaseContexts.gameplayPreludeContext as RunGameplayPreludeOptions;
  preludeOpts.currentTime = currentTime;
  preludeOpts.deltaTime = deltaTime;
  preludeOpts.isBlocking = runtimeSession.combat.isBlocking;
  preludeOpts.playerAnimState = runtimeSession.animation.playerAnimState;
  preludeOpts.blockAngle = runtimeSession.combat.blockAngle;
  preludeOpts.portalCooldown = runtimeSession.loop.portalCooldown;
  preludeOpts.interactBuffered = runtimeSession.input.interactBuffered;
  preludeOpts.potionBuffered = runtimeSession.input.potionBuffered;
  preludeOpts.isLmbHeld = runtimeSession.input.isLmbHeld;
  preludeOpts.isChargingAttack = runtimeSession.animation.isChargingAttack;
  preludeOpts.chargeTimer = runtimeSession.animation.chargeTimer;
  preludeOpts.chargeLevel = runtimeSession.animation.chargeLevel;
  preludeOpts.currentDir8 = runtimeSession.animation.currentDir8;
  preludeOpts.footstepTimer = runtimeSession.loop.footstepTimer;
  preludeOpts.attackFrame = runtimeSession.animation.attackFrame;
  preludeOpts.attackFrameTimer = runtimeSession.animation.attackFrameTimer;
  preludeOpts.spinDirIndex = runtimeSession.animation.spinDirIndex;
  preludeOpts.spinFrameTimer = runtimeSession.animation.spinFrameTimer;
  preludeOpts.drinkTimer = runtimeSession.animation.drinkTimer;
  preludeOpts.animTimer = runtimeSession.animation.animTimer;
  preludeOpts.animFrame = runtimeSession.animation.animFrame;
  preludeOpts.dodgeBuffered = runtimeSession.input.dodgeBuffered;
  preludeOpts.comboStep = runtimeSession.animation.comboStep;
  preludeOpts.comboWindowTimer = runtimeSession.animation.comboWindowTimer;
  preludeOpts.comboInputBuffered = runtimeSession.input.comboInputBuffered;

  if (profilePhases) perfProfiler?.start('prelude');
  const preludeState = runGameplayPrelude(preludeOpts);
  if (profilePhases) perfProfiler?.end('prelude');

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
  runtimeSession.animation.comboStep = preludeState.comboStep;
  runtimeSession.animation.comboWindowTimer = preludeState.comboWindowTimer;
  runtimeSession.input.comboInputBuffered = preludeState.comboInputBuffered;

  if (!state.dialogueActive) {
    const pfOpts = phaseContexts.playerFrameContext as RunPlayerFramePhaseOptions;
    pfOpts.currentTime = currentTime;
    pfOpts.deltaTime = deltaTime;
    pfOpts.playerAnimState = runtimeSession.animation.playerAnimState;
    pfOpts.currentDir8 = runtimeSession.animation.currentDir8;
    pfOpts.isChargingAttack = runtimeSession.animation.isChargingAttack;
    pfOpts.chargeLevel = runtimeSession.animation.chargeLevel;
    pfOpts.animFrame = runtimeSession.animation.animFrame;
    pfOpts.attackFrame = runtimeSession.animation.attackFrame;
    pfOpts.comboStep = runtimeSession.animation.comboStep;
    pfOpts.spinDirIndex = runtimeSession.animation.spinDirIndex;
    pfOpts.spinDirections = spinDirections;
    pfOpts.playerSmoothedElevation = runtimeSession.visual.playerSmoothedElevation;
    pfOpts.swooshTimer = runtimeSession.visual.swooshTimer;
    pfOpts.swooshFacing = runtimeSession.visual.swooshFacing;
    pfOpts.spinSwooshTimer = runtimeSession.visual.spinSwooshTimer;
    pfOpts.spinSwooshDuration = spinSwooshDuration;
    pfOpts.heldConsumableSpriteId = runtimeSession.animation.heldConsumableSpriteId;
    pfOpts.camera = camera;
    pfOpts.cameraTarget = cameraTarget;
    pfOpts.lastInteractionPrompt = lastInteractionPrompt;
    pfOpts.transitionDebug = transitionDebug;
    pfOpts.lastTransitionDebugRefreshAt = runtimeSession.visual.lastTransitionDebugRefreshAt;
    pfOpts.portalCooldown = runtimeSession.loop.portalCooldown;
    pfOpts.isMapModalOpen = isMapModalOpen;
    pfOpts.isPlayerDead = isPlayerDead;
    pfOpts.particleSystem = particleSystem;

    if (profilePhases) perfProfiler?.start('player');
    ({
      playerSmoothedElevation: runtimeSession.visual.playerSmoothedElevation,
      swooshTimer: runtimeSession.visual.swooshTimer,
      spinSwooshTimer: runtimeSession.visual.spinSwooshTimer,
      lastInteractionPrompt,
      lastTransitionDebugRefreshAt: runtimeSession.visual.lastTransitionDebugRefreshAt,
    } = runPlayerFramePhase(pfOpts));
    if (profilePhases) perfProfiler?.end('player');

    const elOpts = phaseContexts.enemyLoopContext as RunEnemyLoopOptions;
    elOpts.currentTime = currentTime;
    elOpts.deltaTime = deltaTime;
    elOpts.isBlocking = runtimeSession.combat.isBlocking;
    elOpts.blockStartTime = runtimeSession.combat.blockStartTime;
    elOpts.isPlayerDead = isPlayerDead;

    if (profilePhases) perfProfiler?.start('enemy');
    const enemyLoopResult = runEnemyLoop(elOpts);
    if (profilePhases) perfProfiler?.end('enemy');

    if (enemyLoopResult.playerDied) {
      onPlayerDied(enemyLoopResult.lostEssence);
    }
  }

  const tailOpts = phaseContexts.runtimeLoopTailContext as RunRuntimeLoopTailOptions;
  tailOpts.playerPosition = state.player.position;
  tailOpts.activeNpcWorldPos = activeNpcWorldPos;
  tailOpts.isDialogueActive = state.dialogueActive;
  tailOpts.currentTime = currentTime;
  tailOpts.deltaTime = deltaTime;
  tailOpts.lastNpcScreenUpdate = runtimeSession.loop.lastNpcScreenUpdate;
  tailOpts.lastNpcProjected = lastNpcProjected;
  tailOpts.currentBiome = currentBiome;
  tailOpts.lastAutoSaveTime = runtimeSession.loop.lastAutoSaveTime;
  tailOpts.perfProfiler = perfProfiler;

  if (profilePhases) perfProfiler?.start('tail');
  ({
    lastNpcScreenUpdate: runtimeSession.loop.lastNpcScreenUpdate,
    lastAutoSaveTime: runtimeSession.loop.lastAutoSaveTime,
  } = runRuntimeLoopTail(tailOpts));
  if (profilePhases) perfProfiler?.end('tail');
  perfProfiler?.endFrame(collectPerfStats(phaseContexts));

  return lastInteractionPrompt;
}
