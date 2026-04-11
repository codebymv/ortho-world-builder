import * as THREE from 'three';
import type { AssetManager } from '@/lib/game/AssetManager';
import type { GameState, Item } from '@/lib/game/GameState';
import type { ParticleSystem } from '@/lib/game/ParticleSystem';
import type { World } from '@/lib/game/World';
import type { CriticalPathItemVisual } from '@/data/criticalPathItems';

interface CreateCriticalItemVisualManagerOptions {
  state: GameState;
  world: World;
  assetManager: AssetManager;
  particleSystem: ParticleSystem;
  items: Record<string, Item>;
  criticalPathItems: Record<string, CriticalPathItemVisual>;
  criticalItemVisualGroup: THREE.Group;
  getVisualYAt: (x: number, y: number) => number;
}

export function createCriticalItemVisualManager({
  state,
  world,
  assetManager,
  particleSystem,
  items,
  criticalPathItems,
  criticalItemVisualGroup,
  getVisualYAt,
}: CreateCriticalItemVisualManagerOptions) {
  let glowAccumulator = 0;
  let lastSignature = '';
  const tmpVec3 = new THREE.Vector3();

  const dispose = () => {
    for (let i = criticalItemVisualGroup.children.length - 1; i >= 0; i--) {
      const child = criticalItemVisualGroup.children[i] as THREE.Group;
      child.children.forEach(grandChild => {
        if (grandChild instanceof THREE.Mesh) {
          grandChild.geometry.dispose();
          (grandChild.material as THREE.Material).dispose();
        }
      });
      criticalItemVisualGroup.remove(child);
    }
  };

  const getSignature = () =>
    `${state.currentMap}|${Object.values(criticalPathItems).map(config => `${config.interactionId}:${state.getFlag(config.collectedFlag) ? 1 : 0}`).join('|')}`;

  const rebuild = () => {
    dispose();
    const map = world.getCurrentMap();

    for (const config of Object.values(criticalPathItems)) {
      if (config.renderVisual === false) continue;
      if (state.getFlag(config.collectedFlag)) continue;
      const item = items[config.itemId];
      const texture = item ? assetManager.getTexture(item.sprite) : undefined;
      if (!item || !texture) continue;

      let found = false;
      for (let ty = 0; ty < map.height && !found; ty++) {
        for (let tx = 0; tx < map.width; tx++) {
          const tile = map.tiles[ty]?.[tx];
          if (!tile || tile.interactionId !== config.interactionId) continue;

          const group = new THREE.Group();
          const halo = new THREE.Mesh(
            new THREE.CircleGeometry(config.haloScale ?? 0.88, 24),
            new THREE.MeshBasicMaterial({
              color: config.haloColor ?? config.glowColor,
              transparent: true,
              opacity: 0.22,
              depthWrite: false,
              depthTest: false,
            }),
          );
          halo.renderOrder = 149500;
          halo.position.set(0, 0.04, 0.38);

          const sprite = new THREE.Mesh(
            new THREE.PlaneGeometry(config.spriteScale ?? 0.56, config.spriteScale ?? 0.56),
            new THREE.MeshBasicMaterial({
              map: texture,
              transparent: true,
              opacity: 1,
              depthWrite: false,
              depthTest: false,
            }),
          );
          sprite.renderOrder = 150000;
          sprite.position.set(0, 0.12, 0.44);

          group.userData = {
            baseX: tx - map.width / 2,
            baseY: ty - map.height / 2,
            bobAmplitude: config.bobAmplitude ?? 0.05,
            hoverHeight: config.hoverHeight ?? 0.52,
            glowColor: config.glowColor,
          };
          group.add(halo, sprite);
          criticalItemVisualGroup.add(group);
          found = true;
          break;
        }
      }
    }
  };

  const update = (currentTime: number, deltaTime: number) => {
    const signature = getSignature();
    if (signature !== lastSignature) {
      rebuild();
      lastSignature = signature;
    }

    glowAccumulator += deltaTime;
    criticalItemVisualGroup.children.forEach((child, index) => {
      const group = child as THREE.Group;
      const baseX = group.userData.baseX as number;
      const baseY = group.userData.baseY as number;
      const bobAmplitude = group.userData.bobAmplitude as number;
      const hoverHeight = group.userData.hoverHeight as number;
      const glowColor = group.userData.glowColor as number;
      const bob = Math.sin(currentTime / 280 + index * 0.9) * bobAmplitude;
      const pulse = 0.78 + Math.sin(currentTime / 220 + index * 0.7) * 0.22;
      group.position.set(baseX, getVisualYAt(baseX, baseY) + hoverHeight + bob, 0);
      group.children.forEach((meshChild, meshIndex) => {
        if (!(meshChild instanceof THREE.Mesh)) return;
        const material = meshChild.material as THREE.MeshBasicMaterial;
        material.opacity = meshIndex === 0 ? 0.15 + pulse * 0.18 : 0.92;
        if (meshIndex === 0) {
          meshChild.scale.setScalar(0.94 + pulse * 0.12);
        }
        meshChild.updateMatrix();
      });
      group.updateMatrixWorld();
      if (glowAccumulator >= 0.18) {
        tmpVec3.set(baseX, getVisualYAt(baseX, baseY) + hoverHeight, 0.45);
        particleSystem.emit(tmpVec3, 2, glowColor, 0.55, 0.22, 0.7);
      }
    });

    if (glowAccumulator >= 0.18) {
      glowAccumulator = 0;
    }
  };

  return {
    dispose,
    rebuild,
    update,
  };
}
