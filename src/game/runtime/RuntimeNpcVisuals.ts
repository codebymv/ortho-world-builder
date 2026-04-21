import * as THREE from 'three';
import { SharedGeometry } from '@/lib/game/AssetManager';
import type { AssetManager } from '@/lib/game/AssetManager';
import type { NPC } from '@/lib/game/GameState';

export interface RuntimeNpcVisuals {
  activeNpcIndices: number[];
  npcMeshes: THREE.Mesh[];
  npcShadows: THREE.Mesh[];
  npcOutlines: THREE.Mesh[];
  npcObjectiveRings: THREE.Mesh[];
  npcObjectiveHalos: THREE.Mesh[];
  setActiveForMap: (currentMap: string) => NPC[];
  dispose: () => void;
}

interface CreateRuntimeNpcVisualsOptions {
  scene: THREE.Scene;
  assetManager: AssetManager;
  npcData: NPC[];
  shadowGeometry: THREE.BufferGeometry;
  shadowMaterial: THREE.MeshBasicMaterial;
  createOutlineMesh: (geometry: THREE.BufferGeometry, texture: THREE.Texture | null) => THREE.Mesh;
  getVisualYAt: (x: number, y: number) => number;
  getActorRenderOrder: (x: number, y: number, footOffset: number) => number;
  npcScaleById: Record<string, number>;
  npcFootOffset: number;
  outlinePad: number;
}

export function createRuntimeNpcVisuals({
  scene,
  assetManager,
  npcData,
  shadowGeometry,
  shadowMaterial,
  createOutlineMesh,
  getVisualYAt,
  getActorRenderOrder,
  npcScaleById,
  npcFootOffset,
  outlinePad,
}: CreateRuntimeNpcVisualsOptions): RuntimeNpcVisuals {
  const activeNpcIndices: number[] = [];
  const npcMeshes: THREE.Mesh[] = [];
  const npcShadows: THREE.Mesh[] = [];
  const npcOutlines: THREE.Mesh[] = [];
  const npcObjectiveRings: THREE.Mesh[] = [];
  const npcObjectiveHalos: THREE.Mesh[] = [];

  npcData.forEach(npc => {
    const npcShadow = new THREE.Mesh(shadowGeometry, shadowMaterial.clone());
    npcShadow.position.set(npc.position.x, getVisualYAt(npc.position.x, npc.position.y) - 0.3, 0.05);
    npcShadow.scale.set(0.8, 0.35, 1);
    npcShadow.renderOrder = 1;
    scene.add(npcShadow);
    npcShadows.push(npcShadow);

    const npcGeometry = SharedGeometry.player;
    const npcTexture = assetManager.getTexture(npc.sprite);
    const npcMaterial = new THREE.MeshBasicMaterial({
      map: npcTexture,
      transparent: true,
      depthWrite: false,
    });
    const npcMesh = new THREE.Mesh(npcGeometry, npcMaterial);
    const npcScale = npcScaleById[npc.id] ?? 1;
    npcMesh.position.set(npc.position.x, getVisualYAt(npc.position.x, npc.position.y), 0.2);
    npcMesh.scale.set(npcScale, npcScale, 1);
    npcMesh.renderOrder = getActorRenderOrder(npc.position.x, npc.position.y, npcFootOffset);
    npcMesh.userData = { npcId: npc.id };
    scene.add(npcMesh);
    npcMeshes.push(npcMesh);

    const npcOutline = createOutlineMesh(npcGeometry, npcTexture ?? null);
    npcOutline.position.set(npc.position.x, getVisualYAt(npc.position.x, npc.position.y), 0.19);
    npcOutline.scale.set(npcScale * outlinePad, npcScale * outlinePad, 1);
    npcOutline.renderOrder = npcMesh.renderOrder - 1;
    scene.add(npcOutline);
    npcOutlines.push(npcOutline);

    const objectiveHalo = new THREE.Mesh(
      new THREE.CircleGeometry(0.09, 24),
      new THREE.MeshBasicMaterial({
        color: 0xFFF0A8,
        transparent: true,
        opacity: 0,
        depthWrite: false,
        depthTest: false,
      }),
    );
    objectiveHalo.position.set(npc.position.x, getVisualYAt(npc.position.x, npc.position.y) + 0.9, 0.5);
    objectiveHalo.scale.set(1, 1, 1);
    objectiveHalo.visible = false;
    objectiveHalo.renderOrder = 150100;
    scene.add(objectiveHalo);
    npcObjectiveHalos.push(objectiveHalo);

    const objectiveRing = new THREE.Mesh(
      new THREE.CircleGeometry(0.05, 20),
      new THREE.MeshBasicMaterial({
        color: 0xFFD54F,
        transparent: true,
        opacity: 0,
        depthWrite: false,
        depthTest: false,
      }),
    );
    objectiveRing.position.set(npc.position.x, getVisualYAt(npc.position.x, npc.position.y) + 0.9, 0.51);
    objectiveRing.visible = false;
    objectiveRing.renderOrder = 150110;
    scene.add(objectiveRing);
    npcObjectiveRings.push(objectiveRing);
  });

  return {
    activeNpcIndices,
    npcMeshes,
    npcShadows,
    npcOutlines,
    npcObjectiveRings,
    npcObjectiveHalos,
    setActiveForMap: (currentMap: string) => {
      activeNpcIndices.length = 0;
      const activeNpcs: NPC[] = [];

      for (let i = 0; i < npcData.length; i++) {
        const npc = npcData[i];
        const isActive = !npc.mapId || npc.mapId === currentMap;

        const npcMesh = npcMeshes[i];
        if (npcMesh) npcMesh.visible = isActive;
        const npcShadow = npcShadows[i];
        if (npcShadow) npcShadow.visible = isActive;
        const npcOutline = npcOutlines[i];
        if (npcOutline) npcOutline.visible = isActive;
        const npcObjectiveHalo = npcObjectiveHalos[i];
        if (npcObjectiveHalo) npcObjectiveHalo.visible = false;
        const npcObjectiveRing = npcObjectiveRings[i];
        if (npcObjectiveRing) npcObjectiveRing.visible = false;

        if (isActive) {
          activeNpcIndices.push(i);
          activeNpcs.push(npc);
        }
      }

      return activeNpcs;
    },
    dispose: () => {
      npcMeshes.forEach(mesh => {
        scene.remove(mesh);
        (mesh.material as THREE.Material).dispose();
      });
      npcShadows.forEach(mesh => {
        scene.remove(mesh);
        (mesh.material as THREE.Material).dispose();
      });
      npcOutlines.forEach(mesh => {
        scene.remove(mesh);
        (mesh.material as THREE.Material).dispose();
      });
      npcObjectiveHalos.forEach(mesh => {
        scene.remove(mesh);
        (mesh.material as THREE.Material).dispose();
        mesh.geometry.dispose();
      });
      npcObjectiveRings.forEach(mesh => {
        scene.remove(mesh);
        (mesh.material as THREE.Material).dispose();
        mesh.geometry.dispose();
      });
    },
  };
}
