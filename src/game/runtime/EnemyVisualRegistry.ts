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
  disposeAll: () => void;
}

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

  const getOrCreateHPBar = (enemyId: string): EnemyHPBar => {
    let hpBar = hpBars.get(enemyId);
    if (!hpBar) {
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

      scene.add(bg);
      scene.add(fill);
      hpBar = { bg, fill };
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

    const hpBar = hpBars.get(enemyId);
    if (hpBar) {
      scene.remove(hpBar.bg);
      scene.remove(hpBar.fill);
      (hpBar.bg.material as THREE.Material).dispose();
      (hpBar.fill.material as THREE.Material).dispose();
      hpBars.delete(enemyId);
    }
  };

  const removeProjectile = (projectileId: string) => {
    disposeMesh(scene, projectileMeshes.get(projectileId));
    projectileMeshes.delete(projectileId);
  };

  const removeHazard = (hazardId: string) => {
    const hazard = hazardMeshes.get(hazardId);
    if (!hazard) return;
    disposeMesh(scene, hazard.marker);
    disposeMesh(scene, hazard.scythe);
    hazardMeshes.delete(hazardId);
  };

  return {
    meshes,
    shadows,
    outlines,
    hpBars,
    projectileMeshes,
    hazardMeshes,
    registerEnemyVisuals: (enemyId, visuals) => {
      meshes.set(enemyId, visuals.mesh);
      shadows.set(enemyId, visuals.shadow);
      outlines.set(enemyId, visuals.outline);
    },
    getOrCreateHPBar,
    removeEnemy,
    removeProjectile,
    removeHazard,
    disposeAll: () => {
      meshes.forEach(mesh => disposeMesh(scene, mesh));
      meshes.clear();

      shadows.forEach(mesh => disposeMesh(scene, mesh));
      shadows.clear();

      outlines.forEach(mesh => disposeMesh(scene, mesh));
      outlines.clear();

      hpBars.forEach(({ bg, fill }) => {
        scene.remove(bg);
        scene.remove(fill);
        (bg.material as THREE.Material).dispose();
        (fill.material as THREE.Material).dispose();
      });
      hpBars.clear();

      projectileMeshes.forEach(mesh => disposeMesh(scene, mesh));
      projectileMeshes.clear();

      hazardMeshes.forEach(({ marker, scythe }) => {
        disposeMesh(scene, marker);
        disposeMesh(scene, scythe);
      });
      hazardMeshes.clear();
    },
  };
}
