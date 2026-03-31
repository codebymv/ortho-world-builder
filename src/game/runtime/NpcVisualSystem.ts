import * as THREE from 'three';
import type { NPC } from '@/lib/game/GameState';

interface ApplyNpcVisualsOptions {
  npc: NPC;
  index: number;
  currentTime: number;
  isTalking: boolean;
  isPaused: boolean;
  isObjective: boolean;
  npcScale: number;
  npcFootOffset: number;
  getVisualYAt: (x: number, y: number) => number;
  getActorRenderOrder: (x: number, y: number, footOffset: number) => number;
  meshes: {
    npcMesh?: THREE.Mesh;
    npcShadow?: THREE.Mesh;
    npcOutline?: THREE.Mesh;
    npcObjectiveHalo?: THREE.Mesh;
    npcObjectiveRing?: THREE.Mesh;
  };
}

export function applyNpcVisuals({
  npc,
  index,
  currentTime,
  isTalking,
  isPaused,
  isObjective,
  npcScale,
  npcFootOffset,
  getVisualYAt,
  getActorRenderOrder,
  meshes,
}: ApplyNpcVisualsOptions) {
  const visualY = getVisualYAt(npc.position.x, npc.position.y);
  const breathe = Math.sin(currentTime / 800 + index * 2.1) * 0.03;
  const walkWave = !isTalking && !isPaused ? Math.sin(currentTime / 120 + index * 1.7) : 0;
  const stride = Math.abs(walkWave);
  const bob = isTalking
    ? breathe
    : !isPaused
      ? stride * 0.05
      : breathe;
  const lean = isTalking || isPaused ? 0 : walkWave * 0.035;

  const { npcMesh, npcShadow, npcOutline, npcObjectiveHalo, npcObjectiveRing } = meshes;

  if (npcMesh) {
    npcMesh.position.set(npc.position.x, visualY + bob, 0.2);
    npcMesh.scale.set(
      npcScale * (isTalking ? 1 : 1 - stride * 0.025),
      npcScale * (isTalking ? 1 : 1 + stride * 0.05),
      1,
    );
    npcMesh.rotation.z = lean;
    npcMesh.renderOrder = getActorRenderOrder(npc.position.x, npc.position.y, npcFootOffset);
  }

  if (npcShadow) {
    npcShadow.position.set(npc.position.x, visualY - 0.3, 0.05);
  }

  if (npcOutline && npcMesh) {
    npcOutline.position.set(npc.position.x, visualY + bob, 0.19);
    npcOutline.rotation.z = lean;
    npcOutline.renderOrder = npcMesh.renderOrder - 1;
  }

  if (npcObjectiveHalo) {
    npcObjectiveHalo.visible = false;
  }

  if (npcObjectiveRing) {
    npcObjectiveRing.visible = false;
  }
}
