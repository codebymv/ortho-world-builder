import * as THREE from 'three';
import type { GameState, NPC } from '@/lib/game/GameState';
import type { World } from '@/lib/game/World';

type InteractionPrompt = string | null;

interface InteractionIndicatorMeshes {
  indicatorMesh: THREE.Mesh;
  indicatorMaterial: THREE.MeshBasicMaterial;
  objectiveIndicatorRingMesh: THREE.Mesh;
  objectiveIndicatorRingMaterial: THREE.MeshBasicMaterial;
  objectiveIndicatorOuterMesh: THREE.Mesh;
  objectiveIndicatorOuterMaterial: THREE.MeshBasicMaterial;
}

interface UpdateInteractionIndicatorOptions {
  state: GameState;
  world: World;
  currentTime: number;
  getVisualYAt: (x: number, y: number) => number;
  getInteractionPromptLabel: (
    interactionId: string,
    state: GameState,
    world: World,
    x: number,
    y: number,
    npcName?: string,
  ) => InteractionPrompt;
  isNpcPriorityCueTarget: (npc: NPC) => boolean;
  isPortalDestinationUnlocked: (mapId: string) => boolean;
  samplePortalNearPlayer: () => { targetMap: string; targetX: number; targetY: number } | null;
  getMapDisplayName: (mapId: string) => string;
  criticalItemInteractionIds: Set<string>;
  isCollectedCriticalItem: (interactionId: string) => boolean;
  isChestOpened: (interactionId: string) => boolean;
  isConsumablePickupCollected: (interactionId: string, x: number, y: number) => boolean;
  lastInteractionPrompt: InteractionPrompt;
  setInteractionPrompt: (prompt: InteractionPrompt) => void;
  meshes: InteractionIndicatorMeshes;
}

export function updateInteractionIndicator({
  state,
  world,
  currentTime,
  getVisualYAt,
  getInteractionPromptLabel,
  isNpcPriorityCueTarget,
  isPortalDestinationUnlocked,
  samplePortalNearPlayer,
  getMapDisplayName,
  criticalItemInteractionIds,
  isCollectedCriticalItem,
  isChestOpened,
  isConsumablePickupCollected,
  lastInteractionPrompt,
  setInteractionPrompt,
  meshes,
}: UpdateInteractionIndicatorOptions): InteractionPrompt {
  let showIndicator = false;
  let indicatorX = 0;
  let indicatorY = 0;
  let indicatorIsObjectiveNpc = false;
  let nextInteractionPrompt: InteractionPrompt = null;
  const interactionRange = 2.0;

  const directions = [
    { x: 0, y: 0 },
    { x: 0, y: 1 },
    { x: 0, y: -1 },
    { x: 1, y: 0 },
    { x: -1, y: 0 },
  ];

  const interactableHit = world.getInteractableNear(state.player.position.x, state.player.position.y, 1.15);
  if (interactableHit) {
    const { interactionId: intId, x, y } = interactableHit;
    if (
      !(criticalItemInteractionIds.has(intId) && isCollectedCriticalItem(intId)) &&
      !(intId.includes('chest') && isChestOpened(intId)) &&
      !(intId === 'tempest_grass_pickup' && isConsumablePickupCollected(intId, x, y))
    ) {
      if (intId === 'building_entrance' || intId === 'building_exit') {
        if (world.getTransitionAt(x, y)) {
          showIndicator = true;
          indicatorX = x;
          indicatorY = y;
          nextInteractionPrompt = getInteractionPromptLabel(intId, state, world, x, y);
        }
      } else {
        showIndicator = true;
        indicatorX = x;
        indicatorY = y;
        nextInteractionPrompt = getInteractionPromptLabel(intId, state, world, x, y);
      }
    }
  }

  if (!showIndicator) {
    for (const dir of directions) {
      const cx = state.player.position.x + dir.x * 0.7;
      const cy = state.player.position.y + dir.y * 0.7;
      const intId = world.getInteractableAt(cx, cy);
      if (intId !== 'building_entrance' && intId !== 'building_exit') continue;
      if (!world.getTransitionAt(cx, cy)) continue;
      showIndicator = true;
      indicatorX = cx;
      indicatorY = cy;
      nextInteractionPrompt = getInteractionPromptLabel(intId, state, world, cx, cy);
      break;
    }
  }

  if (!showIndicator) {
    const portalHint = samplePortalNearPlayer();
    if (portalHint && isPortalDestinationUnlocked(portalHint.targetMap)) {
      showIndicator = true;
      const portalDir = directions.find(dir => {
        const cx = state.player.position.x + dir.x * 0.7;
        const cy = state.player.position.y + dir.y * 0.7;
        return world.getTransitionAt(cx, cy) !== null;
      }) || directions[0];
      indicatorX = state.player.position.x + portalDir.x * 0.7;
      indicatorY = state.player.position.y + portalDir.y * 0.7;
      nextInteractionPrompt = `Travel to ${getMapDisplayName(portalHint.targetMap)}`;
    }
  }

  if (!showIndicator) {
    const interactionRangeSq = interactionRange * interactionRange;
    let closestDistSq = interactionRangeSq;
    for (const npc of state.npcs) {
      const ndx = state.player.position.x - npc.position.x;
      const ndy = state.player.position.y - npc.position.y;
      const distSq = ndx * ndx + ndy * ndy;
      if (distSq < closestDistSq) {
        closestDistSq = distSq;
        showIndicator = true;
        indicatorX = npc.position.x;
        indicatorY = npc.position.y;
        indicatorIsObjectiveNpc = isNpcPriorityCueTarget(npc);
        nextInteractionPrompt = getInteractionPromptLabel(
          npc.dialogueId,
          state,
          world,
          npc.position.x,
          npc.position.y,
          npc.name,
        );
      }
    }
  }

  if (lastInteractionPrompt !== nextInteractionPrompt) {
    setInteractionPrompt(nextInteractionPrompt);
  }

  const {
    indicatorMesh,
    indicatorMaterial,
    objectiveIndicatorRingMesh,
    objectiveIndicatorRingMaterial,
    objectiveIndicatorOuterMesh,
    objectiveIndicatorOuterMaterial,
  } = meshes;

  if (showIndicator) {
    indicatorMesh.visible = true;
    const bobY = Math.sin(currentTime / 200) * 0.12;
    const pulse = 0.7 + Math.sin(currentTime / 300) * 0.3;
    indicatorMesh.position.set(indicatorX, getVisualYAt(indicatorX, indicatorY) + 0.8 + bobY, 0.5);
    indicatorMaterial.opacity = pulse;
    indicatorMesh.scale.set(
      0.8 + Math.sin(currentTime / 250) * 0.15,
      0.8 + Math.sin(currentTime / 250) * 0.15,
      1,
    );
    indicatorMaterial.color.setHex(indicatorIsObjectiveNpc ? 0xffe596 : 0xffffff);
    objectiveIndicatorRingMesh.visible = indicatorIsObjectiveNpc;
    objectiveIndicatorOuterMesh.visible = indicatorIsObjectiveNpc;
    if (indicatorIsObjectiveNpc) {
      const objectivePulse = 0.82 + Math.sin(currentTime / 260) * 0.18;
      objectiveIndicatorRingMesh.position.set(indicatorX, getVisualYAt(indicatorX, indicatorY) + 0.8, 0.49);
      objectiveIndicatorRingMaterial.opacity = 0.18 + objectivePulse * 0.12;
      objectiveIndicatorRingMesh.scale.setScalar(1 + objectivePulse * 0.06);
      objectiveIndicatorOuterMesh.position.set(indicatorX, getVisualYAt(indicatorX, indicatorY) + 0.8, 0.47);
      objectiveIndicatorOuterMaterial.opacity = 0.05 + objectivePulse * 0.05;
      objectiveIndicatorOuterMesh.scale.setScalar(0.98 + objectivePulse * 0.08);
    }
  } else {
    indicatorMesh.visible = false;
    objectiveIndicatorRingMesh.visible = false;
    objectiveIndicatorOuterMesh.visible = false;
  }

  return nextInteractionPrompt;
}

export function applySmoothedCameraFollow(
  camera: THREE.OrthographicCamera,
  cameraTarget: { x: number; y: number },
  deltaTime: number,
) {
  const lerpFactor = 1 - Math.pow(0.001, deltaTime);
  camera.position.x += (cameraTarget.x - camera.position.x) * lerpFactor;
  camera.position.y += (cameraTarget.y - camera.position.y) * lerpFactor;
}
