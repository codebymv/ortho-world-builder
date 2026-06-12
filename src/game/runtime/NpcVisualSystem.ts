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
  vanishProgress?: number;
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
  npcScale,
  npcFootOffset,
  vanishProgress = 0,
  getVisualYAt,
  getActorRenderOrder,
  meshes,
}: ApplyNpcVisualsOptions) {
  const visualY = getVisualYAt(npc.position.x, npc.position.y);
  const isInjured = npc.sprite.includes('injured');
  const breathe = Math.sin(currentTime / 800 + index * 2.1) * (isInjured ? 0.015 : 0.03);
  const walkWave = !isTalking && !isPaused && !isInjured ? Math.sin(currentTime / 120 + index * 1.7) : 0;
  const stride = Math.abs(walkWave);
  const bob = isTalking
    ? breathe
    : !isPaused
      ? stride * 0.05
      : breathe;
  const lean = isTalking || isPaused ? 0 : walkWave * 0.035;

  const { npcMesh, npcShadow, npcOutline, npcObjectiveHalo, npcObjectiveRing } = meshes;

  const dissolveScale = vanishProgress > 0 ? 1 - vanishProgress * 0.28 : 1;
  const dissolveAlpha = vanishProgress > 0 ? 1 - vanishProgress : 1;

  if (npcMesh) {
    npcMesh.position.set(npc.position.x, visualY + bob, 0.2);
    const scaleX = npcScale * (isTalking ? 1 : 1 - stride * 0.025) * dissolveScale;
    const scaleY = npcScale * (isTalking ? 1 : 1 + stride * 0.05) * dissolveScale;
    npcMesh.scale.set(
      npc.facing === 'left' ? -scaleX : scaleX,
      scaleY,
      1,
    );
    npcMesh.rotation.z = lean;
    npcMesh.renderOrder = getActorRenderOrder(npc.position.x, npc.position.y, npcFootOffset);
    const mat = npcMesh.material as THREE.MeshBasicMaterial;
    mat.opacity = dissolveAlpha;
  }

  if (npcShadow) {
    npcShadow.position.set(npc.position.x, visualY - 0.3, 0.05);
  }

  if (npcOutline && npcMesh) {
    npcOutline.position.set(npc.position.x, visualY + bob, 0.19);
    npcOutline.rotation.z = lean;
    npcOutline.renderOrder = npcMesh.renderOrder - 1;
    const outlineMat = npcOutline.material as THREE.MeshBasicMaterial;
    outlineMat.opacity = 0.45 * dissolveAlpha;
  }

  if (npcShadow) {
    npcShadow.scale.set(0.8 * dissolveScale, 0.35 * dissolveScale, 1);
  }

  if (npcObjectiveHalo) {
    npcObjectiveHalo.visible = false;
  }

  if (npcObjectiveRing) {
    npcObjectiveRing.visible = false;
  }
}
