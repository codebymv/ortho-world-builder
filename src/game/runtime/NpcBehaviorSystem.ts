import * as THREE from 'three';
import type { NPC } from '@/lib/game/GameState';
import type { World } from '@/lib/game/World';
import type { NpcWanderState } from '@/game/runtime/RuntimeConfig';
import { applyNpcVisuals } from '@/game/runtime/NpcVisualSystem';
import { getHoodedWitnessVanishProgress } from '@/game/runtime/hoodedWitnessVanish';

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

const NPC_WANDER_BODY_RADIUS = 0.15;
const NPC_WANDER_TARGET_ATTEMPTS = 10;
const NPC_STUCK_FRAME_LIMIT = 4;
const worldPosVec3 = new THREE.Vector3();

function chooseNpcWanderTarget(
  npc: NPC,
  wander: NpcWanderState,
  world: World,
): { x: number; y: number } | null {
  if (wander.radius <= 0 || wander.speed <= 0) return null;

  for (let attempt = 0; attempt < NPC_WANDER_TARGET_ATTEMPTS; attempt++) {
    const angle = Math.random() * Math.PI * 2;
    const distance = wander.radius * Math.sqrt(Math.random());
    const x = wander.origin.x + Math.cos(angle) * distance;
    const y = wander.origin.y + Math.sin(angle) * distance;
    const dx = x - npc.position.x;
    const dy = y - npc.position.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const firstStep = Math.min(0.35, dist);
    const firstStepX = dist > 0 ? npc.position.x + (dx / dist) * firstStep : x;
    const firstStepY = dist > 0 ? npc.position.y + (dy / dist) * firstStep : y;

    if (
      world.canMoveTo(x, y, x, y, NPC_WANDER_BODY_RADIUS) &&
      world.canMoveTo(npc.position.x, npc.position.y, firstStepX, firstStepY, NPC_WANDER_BODY_RADIUS)
    ) {
      wander.angle = angle;
      return { x, y };
    }
  }

  return null;
}

function pauseNpcWander(wander: NpcWanderState, minPause: number, randomPause: number) {
  wander.isPaused = true;
  wander.pauseTimer = minPause + Math.random() * randomPause;
  wander.target = null;
  wander.stuckFrames = 0;
}

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

    const vanishProgress = getHoodedWitnessVanishProgress(npc.id);
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
        vanishProgress,
        getVisualYAt,
        getActorRenderOrder,
        meshes: visualMeshes,
      });
      continue;
    }

    if (wander.isPaused) {
      wander.pauseTimer -= deltaTime;
      if (wander.pauseTimer <= 0) {
        wander.target = chooseNpcWanderTarget(npc, wander, world);
        if (wander.target) {
          wander.isPaused = false;
        } else {
          pauseNpcWander(wander, 0.4, 1.0);
        }
      }
    } else {
      if (!wander.target && currentTime >= wander.nextRetargetTime) {
        wander.target = chooseNpcWanderTarget(npc, wander, world);
        wander.nextRetargetTime = currentTime + 250;
      }
      if (!wander.target) {
        pauseNpcWander(wander, 0.4, 1.0);
        applyNpcVisuals({
          npc,
          index: ni,
          currentTime,
          isTalking: false,
          isPaused: true,
          isObjective: isNpcPriorityCueTarget(npc),
          npcScale: npcScaleById[npc.id] ?? 1,
          npcFootOffset,
          vanishProgress,
          getVisualYAt,
          getActorRenderOrder,
          meshes: visualMeshes,
        });
        continue;
      }

      const targetX = wander.target.x;
      const targetY = wander.target.y;
      const dx = targetX - npc.position.x;
      const dy = targetY - npc.position.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist > 0.1) {
        const moveSpeed = Math.min(wander.speed * deltaTime, dist);
        const nx = npc.position.x + (dx / dist) * moveSpeed;
        const ny = npc.position.y + (dy / dist) * moveSpeed;
        let moved = false;

        if (world.canMoveTo(npc.position.x, npc.position.y, nx, ny, NPC_WANDER_BODY_RADIUS)) {
          npc.position.x = nx;
          npc.position.y = ny;
          moved = true;
        } else if (world.canMoveTo(npc.position.x, npc.position.y, nx, npc.position.y, NPC_WANDER_BODY_RADIUS)) {
          npc.position.x = nx;
          moved = true;
        } else if (world.canMoveTo(npc.position.x, npc.position.y, npc.position.x, ny, NPC_WANDER_BODY_RADIUS)) {
          npc.position.y = ny;
          moved = true;
        }

        if (moved) {
          wander.stuckFrames = 0;
        } else {
          wander.stuckFrames++;
          wander.target = null;
          if (wander.stuckFrames >= NPC_STUCK_FRAME_LIMIT) {
            pauseNpcWander(wander, 0.3, 1.0);
          }
        }
      } else {
        pauseNpcWander(wander, 1.5, 3.0);
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
      vanishProgress,
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
