import * as THREE from 'three';

interface CleanupSystemLike {
  cleanup: () => void;
}

interface CleanupVisualLike {
  dispose: () => void;
}

interface EnemyVisualRegistryLike {
  disposeAll: () => void;
}

interface TransitionDebugLike {
  dispose: () => void;
}

interface RuntimeCleanupOptions {
  scene: THREE.Scene;
  renderer: THREE.WebGLRenderer;
  world: { dispose: () => void };
  enemyVisuals: EnemyVisualRegistryLike;
  disposePlayerVisuals: () => void;
  disposeNpcVisuals: () => void;
  transitionDebugManager: TransitionDebugLike;
  criticalItemVisuals: CleanupVisualLike;
  particleSystem: CleanupSystemLike;
  biomeAmbience: CleanupSystemLike;
  weatherSystem: CleanupSystemLike;
  dayNightCycle: CleanupSystemLike;
  floatingText: CleanupSystemLike;
  criticalItemVisualGroup: THREE.Group;
  transitionDebugGroup: THREE.Group;
  indicatorMesh: THREE.Mesh;
  indicatorMaterial: THREE.Material;
  indicatorGeometry: THREE.BufferGeometry;
  objectiveIndicatorRingMesh: THREE.Mesh;
  objectiveIndicatorRingMaterial: THREE.Material;
  objectiveIndicatorOuterMesh: THREE.Mesh;
  objectiveIndicatorOuterMaterial: THREE.Material;
  essenceOrbMesh: THREE.Mesh;
  essenceOrbMaterial: THREE.Material;
  swooshMesh: THREE.Mesh;
  swooshMaterial: THREE.Material;
  spinSwooshMesh: THREE.Mesh;
  spinSwooshMaterial: THREE.Material;
}

export function cleanupRuntimeResources({
  scene,
  renderer,
  world,
  enemyVisuals,
  disposePlayerVisuals,
  disposeNpcVisuals,
  transitionDebugManager,
  criticalItemVisuals,
  particleSystem,
  biomeAmbience,
  weatherSystem,
  dayNightCycle,
  floatingText,
  criticalItemVisualGroup,
  transitionDebugGroup,
  indicatorMesh,
  indicatorMaterial,
  indicatorGeometry,
  objectiveIndicatorRingMesh,
  objectiveIndicatorRingMaterial,
  objectiveIndicatorOuterMesh,
  objectiveIndicatorOuterMaterial,
  essenceOrbMesh,
  essenceOrbMaterial,
  swooshMesh,
  swooshMaterial,
  spinSwooshMesh,
  spinSwooshMaterial,
}: RuntimeCleanupOptions) {
  enemyVisuals.disposeAll();
  disposePlayerVisuals();
  scene.remove(essenceOrbMesh);
  essenceOrbMaterial.dispose();
  scene.remove(indicatorMesh);
  indicatorMaterial.dispose();
  indicatorGeometry.dispose();
  scene.remove(objectiveIndicatorRingMesh);
  objectiveIndicatorRingMaterial.dispose();
  objectiveIndicatorRingMesh.geometry.dispose();
  scene.remove(objectiveIndicatorOuterMesh);
  objectiveIndicatorOuterMaterial.dispose();
  objectiveIndicatorOuterMesh.geometry.dispose();
  scene.remove(transitionDebugGroup);
  transitionDebugManager.dispose();
  scene.remove(swooshMesh);
  swooshMaterial.dispose();
  scene.remove(spinSwooshMesh);
  spinSwooshMaterial.dispose();
  criticalItemVisuals.dispose();
  scene.remove(criticalItemVisualGroup);
  disposeNpcVisuals();
  particleSystem.cleanup();
  biomeAmbience.cleanup();
  weatherSystem.cleanup();
  dayNightCycle.cleanup();
  floatingText.cleanup();
  world.dispose();
  renderer.dispose();
}
