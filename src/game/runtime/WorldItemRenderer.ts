import * as THREE from 'three';
import type { WorldItem } from '@/lib/game/GameState';
import type { AssetManager } from '@/lib/game/AssetManager';
import { SharedGeometry } from '@/lib/game/AssetManager';

const ITEM_SCALE = 0.55;
const BOB_AMPLITUDE = 0.07;
const BOB_SPEED = 2.2;
const SHADOW_SCALE = 0.38;
const SHADOW_OPACITY = 0.22;
const RENDER_Z = 0.25;

interface WorldItemVisual {
  mesh: THREE.Mesh;
  shadow: THREE.Mesh;
  seedOffset: number;
}

export function createWorldItemRenderer(scene: THREE.Scene) {
  const visuals = new Map<string, WorldItemVisual>();

  const _shadowMat = new THREE.MeshBasicMaterial({
    color: 0x000000,
    transparent: true,
    opacity: SHADOW_OPACITY,
    depthWrite: false,
  });

  function getOrCreate(item: WorldItem, assetManager: AssetManager): WorldItemVisual {
    const existing = visuals.get(item.instanceId);
    if (existing) return existing;

    const tex = assetManager.getTexture(item.itemId);
    const mat = new THREE.MeshBasicMaterial({
      map: tex ?? null,
      transparent: true,
      depthWrite: false,
    });

    const mesh = new THREE.Mesh(SharedGeometry.tile, mat);
    mesh.scale.set(ITEM_SCALE, ITEM_SCALE, 1);
    mesh.renderOrder = 100;
    scene.add(mesh);

    const shadow = new THREE.Mesh(SharedGeometry.tile, _shadowMat.clone());
    shadow.scale.set(SHADOW_SCALE, SHADOW_SCALE * 0.4, 1);
    shadow.renderOrder = 99;
    scene.add(shadow);

    const visual: WorldItemVisual = {
      mesh,
      shadow,
      seedOffset: Math.random() * Math.PI * 2,
    };
    visuals.set(item.instanceId, visual);
    return visual;
  }

  function remove(instanceId: string) {
    const v = visuals.get(instanceId);
    if (!v) return;
    scene.remove(v.mesh);
    (v.mesh.material as THREE.Material).dispose();
    scene.remove(v.shadow);
    (v.shadow.material as THREE.Material).dispose();
    visuals.delete(instanceId);
  }

  function update(
    worldItems: WorldItem[],
    currentMap: string,
    assetManager: AssetManager,
    currentTime: number,
  ) {
    const activeIds = new Set<string>();

    for (const item of worldItems) {
      if (item.mapId !== currentMap) continue;
      activeIds.add(item.instanceId);

      const v = getOrCreate(item, assetManager);

      const bob = Math.sin(currentTime / 1000 * BOB_SPEED + v.seedOffset) * BOB_AMPLITUDE;
      v.mesh.position.set(item.x, item.y + bob, RENDER_Z);
      v.shadow.position.set(item.x, item.y - 0.3, RENDER_Z - 0.01);

      // Gentle pulse scale
      const pulse = 1 + Math.sin(currentTime / 1000 * BOB_SPEED + v.seedOffset) * 0.04;
      v.mesh.scale.set(ITEM_SCALE * pulse, ITEM_SCALE * pulse, 1);
    }

    // Remove visuals for items no longer present
    for (const [id] of visuals) {
      if (!activeIds.has(id)) remove(id);
    }
  }

  function dispose() {
    for (const [id] of visuals) remove(id);
    _shadowMat.dispose();
  }

  return { update, remove, dispose };
}

export type WorldItemRendererInstance = ReturnType<typeof createWorldItemRenderer>;
