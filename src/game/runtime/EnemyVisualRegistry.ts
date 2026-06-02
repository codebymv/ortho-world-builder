import * as THREE from 'three';
import { SharedGeometry } from '@/lib/game/AssetManager';

export interface EnemyHPBar {
  bg: THREE.Mesh;
  fill: THREE.Mesh;
}

export interface EnemyVisualRegistry {
  meshes: Map<string, THREE.Mesh>;
  shadows: Map<string, THREE.Mesh>;
  outlines: Map<string, THREE.Mesh>;
  hpBars: Map<string, EnemyHPBar>;
  /** Active thrown-projectile meshes keyed by projectile id. */
  projectileMeshes: Map<string, THREE.Mesh>;
  /** Active falling-scythe hazard meshes keyed by hazard id. */
  hazardMeshes: Map<string, { marker: THREE.Mesh; scythe: THREE.Mesh }>;
  /** Decorative per-enemy effect meshes (e.g. the Revenant's summoned blade array). */
  auxMeshes: Map<string, THREE.Mesh[]>;
  acquireProjectile: (projectileId: string, texture: THREE.Texture | null) => THREE.Mesh;
  releaseProjectile: (projectileId: string) => void;
  acquireHazard: (
    hazardId: string,
    markerTexture: THREE.Texture | null,
    scytheTexture: THREE.Texture | null
  ) => { marker: THREE.Mesh; scythe: THREE.Mesh };
  releaseHazard: (hazardId: string) => void;
  registerEnemyVisuals: (
    enemyId: string,
    visuals: {
      mesh: THREE.Mesh;
      shadow: THREE.Mesh;
      outline: THREE.Mesh;
    }
  ) => void;
  getOrCreateHPBar: (enemyId: string) => EnemyHPBar;
  removeEnemy: (enemyId: string) => void;
  removeProjectile: (projectileId: string) => void;
  removeHazard: (hazardId: string) => void;
  removeAux: (enemyId: string) => void;
  disposeAll: () => void;
}

const PROJECTILE_POOL_LIMIT = 32;
const HAZARD_POOL_LIMIT = 18;
const HP_BAR_POOL_LIMIT = 48;

function disposeMesh(scene: THREE.Scene, mesh: THREE.Mesh | undefined) {
  if (!mesh) return;
  scene.remove(mesh);
  (mesh.material as THREE.Material).dispose();
}

export function createEnemyVisualRegistry(scene: THREE.Scene): EnemyVisualRegistry {
  const meshes = new Map<string, THREE.Mesh>();
  const shadows = new Map<string, THREE.Mesh>();
  const outlines = new Map<string, THREE.Mesh>();
  const hpBars = new Map<string, EnemyHPBar>();
  const projectileMeshes = new Map<string, THREE.Mesh>();
  const hazardMeshes = new Map<string, { marker: THREE.Mesh; scythe: THREE.Mesh }>();
  const auxMeshes = new Map<string, THREE.Mesh[]>();
  const projectilePool: THREE.Mesh[] = [];
  const hazardPool: { marker: THREE.Mesh; scythe: THREE.Mesh }[] = [];
  const hpBarPool: EnemyHPBar[] = [];

  const createHPBar = (): EnemyHPBar => {
    const bgMat = new THREE.MeshBasicMaterial({
      color: 0x333333,
      transparent: true,
      opacity: 0.8,
      depthWrite: false,
    });
    const bg = new THREE.Mesh(SharedGeometry.hpBarBg, bgMat);

    const fillMat = new THREE.MeshBasicMaterial({
      color: 0xff0000,
      transparent: true,
      opacity: 0.9,
      depthWrite: false,
    });
    const fill = new THREE.Mesh(SharedGeometry.hpBarFill, fillMat);

    bg.visible = false;
    fill.visible = false;
    scene.add(bg);
    scene.add(fill);
    return { bg, fill };
  };

  const resetHPBar = (hpBar: EnemyHPBar) => {
    hpBar.bg.visible = false;
    hpBar.fill.visible = false;
    hpBar.bg.position.set(0, 0, -999);
    hpBar.fill.position.set(0, 0, -999);
    hpBar.bg.scale.set(1, 1, 1);
    hpBar.fill.scale.set(1, 1, 1);
    const bgMat = hpBar.bg.material as THREE.MeshBasicMaterial;
    const fillMat = hpBar.fill.material as THREE.MeshBasicMaterial;
    bgMat.color.setHex(0x333333);
    bgMat.opacity = 0.8;
    fillMat.color.setHex(0xff0000);
    fillMat.opacity = 0.9;
  };

  const disposeHPBar = (hpBar: EnemyHPBar) => {
    scene.remove(hpBar.bg);
    scene.remove(hpBar.fill);
    (hpBar.bg.material as THREE.Material).dispose();
    (hpBar.fill.material as THREE.Material).dispose();
  };

  const releaseHPBar = (enemyId: string) => {
    const hpBar = hpBars.get(enemyId);
    if (!hpBar) return;
    hpBars.delete(enemyId);
    resetHPBar(hpBar);
    if (hpBarPool.length < HP_BAR_POOL_LIMIT) {
      hpBarPool.push(hpBar);
    } else {
      disposeHPBar(hpBar);
    }
  };

  const getOrCreateHPBar = (enemyId: string): EnemyHPBar => {
    let hpBar = hpBars.get(enemyId);
    if (!hpBar) {
      hpBar = hpBarPool.pop() ?? createHPBar();
      resetHPBar(hpBar);
      hpBars.set(enemyId, hpBar);
    }

    return hpBar;
  };

  const removeEnemy = (enemyId: string) => {
    disposeMesh(scene, meshes.get(enemyId));
    meshes.delete(enemyId);

    disposeMesh(scene, shadows.get(enemyId));
    shadows.delete(enemyId);

    disposeMesh(scene, outlines.get(enemyId));
    outlines.delete(enemyId);

    releaseHPBar(enemyId);

    const aux = auxMeshes.get(enemyId);
    if (aux) {
      for (const mesh of aux) disposeMesh(scene, mesh);
      auxMeshes.delete(enemyId);
    }
  };

  const resetMeshBasicMaterial = (
    mesh: THREE.Mesh,
    texture: THREE.Texture | null,
    color: number,
    opacity: number
  ) => {
    const material = mesh.material as THREE.MeshBasicMaterial;
    material.map = texture;
    material.color.setHex(color);
    material.opacity = opacity;
    material.transparent = true;
    material.depthWrite = false;
    material.needsUpdate = true;
  };

  const createProjectileMesh = (texture: THREE.Texture | null) => {
    const material = new THREE.MeshBasicMaterial({
      map: texture,
      color: 0xffffff,
      transparent: true,
      depthWrite: false,
    });
    const mesh = new THREE.Mesh(SharedGeometry.enemy, material);
    mesh.renderOrder = 52;
    mesh.visible = false;
    scene.add(mesh);
    return mesh;
  };

  const acquireProjectile = (projectileId: string, texture: THREE.Texture | null) => {
    let mesh = projectileMeshes.get(projectileId);
    if (!mesh) {
      mesh = projectilePool.pop() ?? createProjectileMesh(texture);
      projectileMeshes.set(projectileId, mesh);
    }

    resetMeshBasicMaterial(mesh, texture, 0xffffff, 1);
    mesh.visible = true;
    return mesh;
  };

  const releaseProjectile = (projectileId: string) => {
    const mesh = projectileMeshes.get(projectileId);
    if (!mesh) return;
    projectileMeshes.delete(projectileId);
    mesh.visible = false;
    mesh.position.set(0, 0, -999);
    if (projectilePool.length < PROJECTILE_POOL_LIMIT) {
      projectilePool.push(mesh);
    } else {
      disposeMesh(scene, mesh);
    }
  };

  const removeProjectile = (projectileId: string) => {
    releaseProjectile(projectileId);
  };

  const removeAux = (enemyId: string) => {
    const meshes = auxMeshes.get(enemyId);
    if (!meshes) return;
    for (const mesh of meshes) disposeMesh(scene, mesh);
    auxMeshes.delete(enemyId);
  };

  const createHazardVisual = (markerTexture: THREE.Texture | null, scytheTexture: THREE.Texture | null) => {
    const markerMat = new THREE.MeshBasicMaterial({
      map: markerTexture,
      color: 0xff2244,
      transparent: true,
      opacity: 0.45,
      depthWrite: false,
    });
    const marker = new THREE.Mesh(SharedGeometry.enemy, markerMat);
    marker.renderOrder = 46;
    marker.visible = false;
    scene.add(marker);

    const scytheMat = new THREE.MeshBasicMaterial({
      map: scytheTexture,
      color: 0xffffff,
      transparent: true,
      depthWrite: false,
    });
    const scythe = new THREE.Mesh(SharedGeometry.enemy, scytheMat);
    scythe.renderOrder = 58;
    scythe.visible = false;
    scene.add(scythe);
    return { marker, scythe };
  };

  const acquireHazard = (
    hazardId: string,
    markerTexture: THREE.Texture | null,
    scytheTexture: THREE.Texture | null
  ) => {
    let hazard = hazardMeshes.get(hazardId);
    if (!hazard) {
      hazard = hazardPool.pop() ?? createHazardVisual(markerTexture, scytheTexture);
      hazardMeshes.set(hazardId, hazard);
    }

    resetMeshBasicMaterial(hazard.marker, markerTexture, 0xff2244, 0.45);
    resetMeshBasicMaterial(hazard.scythe, scytheTexture, 0xffffff, 1);
    hazard.marker.visible = true;
    hazard.scythe.visible = true;
    return hazard;
  };

  const releaseHazard = (hazardId: string) => {
    const hazard = hazardMeshes.get(hazardId);
    if (!hazard) return;
    hazardMeshes.delete(hazardId);
    hazard.marker.visible = false;
    hazard.scythe.visible = false;
    hazard.marker.position.set(0, 0, -999);
    hazard.scythe.position.set(0, 0, -999);
    if (hazardPool.length < HAZARD_POOL_LIMIT) {
      hazardPool.push(hazard);
    } else {
      disposeMesh(scene, hazard.marker);
      disposeMesh(scene, hazard.scythe);
    }
  };

  const removeHazard = (hazardId: string) => {
    releaseHazard(hazardId);
  };

  return {
    meshes,
    shadows,
    outlines,
    hpBars,
    projectileMeshes,
    hazardMeshes,
    auxMeshes,
    acquireProjectile,
    releaseProjectile,
    acquireHazard,
    releaseHazard,
    registerEnemyVisuals: (enemyId, visuals) => {
      meshes.set(enemyId, visuals.mesh);
      shadows.set(enemyId, visuals.shadow);
      outlines.set(enemyId, visuals.outline);
    },
    getOrCreateHPBar,
    removeEnemy,
    removeProjectile,
    removeHazard,
    removeAux,
    disposeAll: () => {
      meshes.forEach(mesh => disposeMesh(scene, mesh));
      meshes.clear();

      shadows.forEach(mesh => disposeMesh(scene, mesh));
      shadows.clear();

      outlines.forEach(mesh => disposeMesh(scene, mesh));
      outlines.clear();

      hpBars.forEach(({ bg, fill }) => {
        disposeHPBar({ bg, fill });
      });
      hpBars.clear();
      hpBarPool.forEach(disposeHPBar);
      hpBarPool.length = 0;

      projectileMeshes.forEach(mesh => disposeMesh(scene, mesh));
      projectileMeshes.clear();
      projectilePool.forEach(mesh => disposeMesh(scene, mesh));
      projectilePool.length = 0;

      hazardMeshes.forEach(({ marker, scythe }) => {
        disposeMesh(scene, marker);
        disposeMesh(scene, scythe);
      });
      hazardMeshes.clear();
      hazardPool.forEach(({ marker, scythe }) => {
        disposeMesh(scene, marker);
        disposeMesh(scene, scythe);
      });
      hazardPool.length = 0;

      auxMeshes.forEach(meshList => {
        for (const mesh of meshList) disposeMesh(scene, mesh);
      });
      auxMeshes.clear();
    },
  };
}
