import * as THREE from 'three';
import type { NPC } from '@/lib/game/GameState';
import type { World } from '@/lib/game/World';
import type { NpcWanderState } from '@/game/runtime/RuntimeConfig';
import { applyNpcVisuals } from '@/game/runtime/NpcVisualSystem';

interface UpdateNpcBehaviorsOptions {
  activeNpcIndices: number[];
  npcData: NPC[];
  npcWander: Record<string, NpcWanderState>;
  currentTime: number;
  deltaTime: number;
  isDialogueActive: boolean;
  currentDialogue: string | null;
  world: World;
  isNpcPriorityCueTarget: (npc: NPC) => boolean;
  npcScaleById: Record<string, number>;
  npcFootOffset: number;
  getVisualYAt: (x: number, y: number) => number;
  getActorRenderOrder: (x: number, y: number, footOffset: number) => number;
  meshes: {
    npcMeshes: THREE.Mesh[];
    npcShadows: THREE.Mesh[];
    npcOutlines: THREE.Mesh[];
    npcObjectiveHalos: THREE.Mesh[];
    npcObjectiveRings: THREE.Mesh[];
  };
}

interface UpdateNpcDialogueProjectionOptions {
  activeNpcWorldPos: { x: number; y: number } | null;
  isDialogueActive: boolean;
  playerPosition: { x: number; y: number };
  currentTime: number;
  camera: THREE.OrthographicCamera;
  renderer: THREE.WebGLRenderer;
  getVisualYAt: (x: number, y: number) => number;
  closeDialogueSession: () => void;
  setNpcScreenPos: (position: { x: number; y: number }) => void;
  lastNpcScreenUpdate: number;
  lastNpcProjected: { x: number; y: number };
  minIntervalMs?: number;
  minDeltaPx?: number;
}

const worldPosVec3 = new THREE.Vector3();

export function updateNpcBehaviors({
  activeNpcIndices,
  npcData,
  npcWander,
  currentTime,
  deltaTime,
  isDialogueActive,
  currentDialogue,
  world,
  isNpcPriorityCueTarget,
  npcScaleById,
  npcFootOffset,
  getVisualYAt,
  getActorRenderOrder,
  meshes,
}: UpdateNpcBehaviorsOptions) {
  for (let ai = 0; ai < activeNpcIndices.length; ai++) {
    const ni = activeNpcIndices[ai];
    const npc = npcData[ni];
    const wander = npcWander[npc.id];
    if (!wander) continue;

    const visualMeshes = {
      npcMesh: meshes.npcMeshes[ni],
      npcShadow: meshes.npcShadows[ni],
      npcOutline: meshes.npcOutlines[ni],
      npcObjectiveHalo: meshes.npcObjectiveHalos[ni],
      npcObjectiveRing: meshes.npcObjectiveRings[ni],
    };

    const isTalkingToThisNpc = isDialogueActive && currentDialogue === npc.dialogueId;
    if (isTalkingToThisNpc) {
      applyNpcVisuals({
        npc,
        index: ni,
        currentTime,
        isTalking: true,
        isPaused: true,
        isObjective: isNpcPriorityCueTarget(npc),
        npcScale: npcScaleById[npc.id] ?? 1,
        npcFootOffset,
        getVisualYAt,
        getActorRenderOrder,
        meshes: visualMeshes,
      });
      continue;
    }

    if (wander.isPaused) {
      wander.pauseTimer -= deltaTime;
      if (wander.pauseTimer <= 0) {
        wander.isPaused = false;
        wander.angle += (Math.random() - 0.5) * Math.PI;
      }
    } else {
      const targetX = wander.origin.x + Math.cos(wander.angle) * wander.radius;
      const targetY = wander.origin.y + Math.sin(wander.angle) * wander.radius;
      const dx = targetX - npc.position.x;
      const dy = targetY - npc.position.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist > 0.1) {
        const moveSpeed = wander.speed * deltaTime;
        const nx = npc.position.x + (dx / dist) * moveSpeed;
        const ny = npc.position.y + (dy / dist) * moveSpeed;
        let moved = false;

        if (world.canMoveTo(npc.position.x, npc.position.y, nx, ny)) {
          npc.position.x = nx;
          npc.position.y = ny;
          moved = true;
        } else if (world.canMoveTo(npc.position.x, npc.position.y, nx, npc.position.y)) {
          npc.position.x = nx;
          moved = true;
        } else if (world.canMoveTo(npc.position.x, npc.position.y, npc.position.x, ny)) {
          npc.position.y = ny;
          moved = true;
        }

        if (moved) {
          wander.stuckFrames = 0;
        } else {
          wander.stuckFrames++;
          if (wander.stuckFrames >= 4) {
            wander.isPaused = true;
            wander.pauseTimer = 0.3 + Math.random() * 1.0;
            wander.angle = Math.random() * Math.PI * 2;
            wander.stuckFrames = 0;
          } else {
            wander.angle += Math.PI * (0.4 + Math.random() * 0.6);
          }
        }
      } else {
        wander.isPaused = true;
        wander.pauseTimer = 1.5 + Math.random() * 3;
        wander.angle += (Math.random() - 0.5) * Math.PI * 1.5;
      }
    }

    applyNpcVisuals({
      npc,
      index: ni,
      currentTime,
      isTalking: false,
      isPaused: wander.isPaused,
      isObjective: isNpcPriorityCueTarget(npc),
      npcScale: npcScaleById[npc.id] ?? 1,
      npcFootOffset,
      getVisualYAt,
      getActorRenderOrder,
      meshes: visualMeshes,
    });
  }
}

export function updateNpcDialogueProjection({
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
  minIntervalMs = 48,
  minDeltaPx = 3,
}: UpdateNpcDialogueProjectionOptions) {
  if (!activeNpcWorldPos || !isDialogueActive) {
    return lastNpcScreenUpdate;
  }

  const nwx = activeNpcWorldPos.x;
  const nwy = activeNpcWorldPos.y;
  const pdx = playerPosition.x - nwx;
  const pdy = playerPosition.y - nwy;
  const npcDistSq = pdx * pdx + pdy * pdy;
  const dialogueBreakDist = 4;

  if (npcDistSq > dialogueBreakDist * dialogueBreakDist) {
    closeDialogueSession();
    return lastNpcScreenUpdate;
  }

  worldPosVec3.set(nwx, getVisualYAt(nwx, nwy) + 1.2, 0);
  worldPosVec3.project(camera);
  const sx = (worldPosVec3.x * 0.5 + 0.5) * renderer.domElement.clientWidth;
  const sy = (-worldPosVec3.y * 0.5 + 0.5) * renderer.domElement.clientHeight;
  const elapsed = currentTime - lastNpcScreenUpdate;
  const moved =
    Math.abs(sx - lastNpcProjected.x) >= minDeltaPx ||
    Math.abs(sy - lastNpcProjected.y) >= minDeltaPx;

  if (elapsed >= minIntervalMs || moved) {
    lastNpcProjected.x = sx;
    lastNpcProjected.y = sy;
    setNpcScreenPos({ x: sx, y: sy });
    return currentTime;
  }

  return lastNpcScreenUpdate;
}
