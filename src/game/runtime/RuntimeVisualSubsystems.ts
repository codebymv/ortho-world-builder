import * as THREE from 'three';
import type { AssetManager } from '@/lib/game/AssetManager';
import { SharedGeometry } from '@/lib/game/AssetManager';
import type { GameState, NPC } from '@/lib/game/GameState';
import { createEnemyVisualRegistry } from '@/game/runtime/EnemyVisualRegistry';
import { createRuntimeSceneObjects } from '@/game/runtime/RuntimeSceneObjects';
import { createRuntimePlayerVisuals } from '@/game/runtime/RuntimePlayerVisuals';
import { createRuntimeNpcVisuals } from '@/game/runtime/RuntimeNpcVisuals';

interface CreateRuntimeVisualSubsystemsOptions {
  scene: THREE.Scene;
  assetManager: AssetManager;
  state: GameState;
  npcData: NPC[];
  playerBaseScale: number;
  npcFootOffset: number;
  npcScaleById: Record<string, number>;
  outlinePad: number;
  getVisualYAt: (x: number, y: number) => number;
  getActorRenderOrder: (x: number, y: number, footOffset: number) => number;
  getPlayerVisualY: (x: number, y: number) => number;
  createOutlineMesh: (geometry: THREE.BufferGeometry, texture: THREE.Texture | null) => THREE.Mesh;
}

export function createRuntimeVisualSubsystems({
  scene,
  assetManager,
  state,
  npcData,
  playerBaseScale,
  npcFootOffset,
  npcScaleById,
  outlinePad,
  getVisualYAt,
  getActorRenderOrder,
  getPlayerVisualY,
  createOutlineMesh,
}: CreateRuntimeVisualSubsystemsOptions) {
  const enemyVisuals = createEnemyVisualRegistry(scene);
  const sceneObjects = createRuntimeSceneObjects(scene, assetManager);

  const playerGeometry = SharedGeometry.player;
  const playerTexture = assetManager.getTexture('player_down_idle_0');
  const playerVisuals = createRuntimePlayerVisuals({
    scene,
    playerGeometry,
    playerTexture,
    heldItemTexture: assetManager.getTexture('tempest_grass_item') ?? assetManager.getTexture('potion') ?? null,
    playerBaseScale,
    initialPosition: state.player.position,
    getPlayerVisualY,
    createOutlineMesh,
  });

  const npcVisuals = createRuntimeNpcVisuals({
    scene,
    assetManager,
    npcData,
    shadowGeometry: playerVisuals.shadowGeometry,
    shadowMaterial: playerVisuals.shadowMaterial,
    createOutlineMesh,
    getVisualYAt,
    getActorRenderOrder,
    npcScaleById,
    npcFootOffset,
    outlinePad,
  });

  return {
    enemyVisuals,
    sceneObjects,
    playerVisuals,
    npcVisuals,
  };
}
