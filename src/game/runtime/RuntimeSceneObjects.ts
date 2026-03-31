import * as THREE from 'three';
import type { AssetManager } from '@/lib/game/AssetManager';

interface TransitionDebugMaterials {
  entrance: THREE.MeshBasicMaterial;
  exit: THREE.MeshBasicMaterial;
  portal: THREE.MeshBasicMaterial;
  other: THREE.MeshBasicMaterial;
}

export interface RuntimeSceneObjects {
  indicatorGeometry: THREE.PlaneGeometry;
  indicatorMaterial: THREE.MeshBasicMaterial;
  indicatorMesh: THREE.Mesh;
  objectiveIndicatorRingMaterial: THREE.MeshBasicMaterial;
  objectiveIndicatorRingMesh: THREE.Mesh;
  objectiveIndicatorOuterMaterial: THREE.MeshBasicMaterial;
  objectiveIndicatorOuterMesh: THREE.Mesh;
  transitionDebugGroup: THREE.Group;
  transitionDebugGeometry: THREE.RingGeometry;
  transitionDebugMaterials: TransitionDebugMaterials;
  essenceOrbMaterial: THREE.MeshBasicMaterial;
  essenceOrbMesh: THREE.Mesh;
  criticalItemVisualGroup: THREE.Group;
}

export function createRuntimeSceneObjects(scene: THREE.Scene, assetManager: AssetManager): RuntimeSceneObjects {
  const indicatorTexture = assetManager.getTexture('interact_indicator');
  const indicatorGeometry = new THREE.PlaneGeometry(0.4, 0.4);
  const indicatorMaterial = new THREE.MeshBasicMaterial({
    map: indicatorTexture,
    transparent: true,
    depthWrite: false,
    depthTest: false,
  });
  const indicatorMesh = new THREE.Mesh(indicatorGeometry, indicatorMaterial);
  indicatorMesh.position.z = 0.5;
  indicatorMesh.visible = false;
  scene.add(indicatorMesh);

  const objectiveIndicatorRingMaterial = new THREE.MeshBasicMaterial({
    color: 0xFFD24A,
    transparent: true,
    opacity: 0,
    depthWrite: false,
    depthTest: false,
  });
  const objectiveIndicatorRingMesh = new THREE.Mesh(
    new THREE.RingGeometry(0.24, 0.32, 32),
    objectiveIndicatorRingMaterial,
  );
  objectiveIndicatorRingMesh.position.z = 0.48;
  objectiveIndicatorRingMesh.visible = false;
  scene.add(objectiveIndicatorRingMesh);

  const objectiveIndicatorOuterMaterial = new THREE.MeshBasicMaterial({
    color: 0xFFF1B8,
    transparent: true,
    opacity: 0,
    depthWrite: false,
    depthTest: false,
  });
  const objectiveIndicatorOuterMesh = new THREE.Mesh(
    new THREE.RingGeometry(0.34, 0.4, 32),
    objectiveIndicatorOuterMaterial,
  );
  objectiveIndicatorOuterMesh.position.z = 0.47;
  objectiveIndicatorOuterMesh.visible = false;
  scene.add(objectiveIndicatorOuterMesh);

  const transitionDebugGroup = new THREE.Group();
  transitionDebugGroup.visible = false;
  scene.add(transitionDebugGroup);

  const transitionDebugGeometry = new THREE.RingGeometry(0.2, 0.3, 16);
  const transitionDebugMaterials = {
    entrance: new THREE.MeshBasicMaterial({ color: 0xFFD24A, transparent: true, opacity: 0.9, depthWrite: false, depthTest: false }),
    exit: new THREE.MeshBasicMaterial({ color: 0xFF8A4A, transparent: true, opacity: 0.9, depthWrite: false, depthTest: false }),
    portal: new THREE.MeshBasicMaterial({ color: 0xB47BFF, transparent: true, opacity: 0.9, depthWrite: false, depthTest: false }),
    other: new THREE.MeshBasicMaterial({ color: 0x6EE7FF, transparent: true, opacity: 0.9, depthWrite: false, depthTest: false }),
  };

  const essenceOrbMaterial = new THREE.MeshBasicMaterial({
    map: assetManager.getTexture('essence_drop'),
    transparent: true,
    opacity: 0.95,
    depthWrite: false,
    depthTest: false,
  });
  const essenceOrbMesh = new THREE.Mesh(new THREE.PlaneGeometry(0.55, 0.55), essenceOrbMaterial);
  essenceOrbMesh.visible = false;
  essenceOrbMesh.renderOrder = 150000;
  scene.add(essenceOrbMesh);

  const criticalItemVisualGroup = new THREE.Group();
  criticalItemVisualGroup.visible = true;
  scene.add(criticalItemVisualGroup);

  return {
    indicatorGeometry,
    indicatorMaterial,
    indicatorMesh,
    objectiveIndicatorRingMaterial,
    objectiveIndicatorRingMesh,
    objectiveIndicatorOuterMaterial,
    objectiveIndicatorOuterMesh,
    transitionDebugGroup,
    transitionDebugGeometry,
    transitionDebugMaterials,
    essenceOrbMaterial,
    essenceOrbMesh,
    criticalItemVisualGroup,
  };
}
