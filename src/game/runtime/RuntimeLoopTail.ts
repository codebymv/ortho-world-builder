import * as THREE from 'three';
import { updateNpcDialogueProjection } from '@/game/runtime/NpcBehaviorSystem';
import type { RuntimeLoopTailContext } from '@/game/runtime/RuntimePhaseContexts';

interface RunRuntimeLoopTailOptions extends RuntimeLoopTailContext {
  playerPosition: { x: number; y: number };
  activeNpcWorldPos: { x: number; y: number } | null;
  isDialogueActive: boolean;
  currentTime: number;
  deltaTime: number;
  lastNpcScreenUpdate: number;
  lastNpcProjected: { x: number; y: number };
  currentBiome: string;
  lastAutoSaveTime: number;
}

export function runRuntimeLoopTail({
  scene,
  world,
  playerPosition,
  activeNpcWorldPos,
  isDialogueActive,
  currentTime,
  deltaTime,
  camera,
  renderer,
  getVisualYAt,
  closeDialogueSession,
  setNpcScreenPos,
  lastNpcScreenUpdate,
  lastNpcProjected,
  npcScreenMinMs = 48,
  npcScreenMinPx = 3,
  currentBiome,
  biomeAmbience,
  weatherSystem,
  dayNightCycle,
  floatingText,
  particleSystem,
  lastAutoSaveTime,
  autoSaveInterval,
  triggerSave,
  worldItemRenderer,
  state,
  assetManager,
}: RunRuntimeLoopTailOptions) {
  world.updateChunks(playerPosition.x, playerPosition.y);

  const nextNpcScreenUpdate = updateNpcDialogueProjection({
    activeNpcWorldPos,
    isDialogueActive,
    playerPosition,
    currentTime,
    camera,
    renderer,
    getVisualYAt,
    closeDialogueSession,
    setNpcScreenPos,
    lastNpcScreenUpdate,
    lastNpcProjected,
    minIntervalMs: npcScreenMinMs,
    minDeltaPx: npcScreenMinPx,
  });

  biomeAmbience.setBiome(currentBiome);
  biomeAmbience.update(deltaTime, playerPosition.x, playerPosition.y);
  weatherSystem.update(deltaTime, playerPosition.x, playerPosition.y, currentBiome);
  dayNightCycle.update(deltaTime, playerPosition.x, playerPosition.y);
  floatingText.update(deltaTime);
  particleSystem.update(deltaTime);
  worldItemRenderer.update(state.worldItems, state.currentMap, assetManager, currentTime, getVisualYAt);

  let nextAutoSaveTime = lastAutoSaveTime;
  if (currentTime - nextAutoSaveTime >= autoSaveInterval) {
    nextAutoSaveTime = currentTime;
    triggerSave();
  }

  renderer.render(scene, camera);

  return {
    lastNpcScreenUpdate: nextNpcScreenUpdate,
    lastAutoSaveTime: nextAutoSaveTime,
  };
}
