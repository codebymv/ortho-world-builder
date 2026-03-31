import * as THREE from 'three';
import type { World } from '@/lib/game/World';

interface TransitionDebugMaterials {
  entrance: THREE.MeshBasicMaterial;
  exit: THREE.MeshBasicMaterial;
  portal: THREE.MeshBasicMaterial;
  other: THREE.MeshBasicMaterial;
}

interface CreateTransitionDebugManagerOptions {
  world: World;
  transitionDebugGroup: THREE.Group;
  transitionDebugGeometry: THREE.RingGeometry;
  transitionDebugMaterials: TransitionDebugMaterials;
  setTransitionDebugLines: (lines: string[]) => void;
}

export function createTransitionDebugManager({
  world,
  transitionDebugGroup,
  transitionDebugGeometry,
  transitionDebugMaterials,
  setTransitionDebugLines,
}: CreateTransitionDebugManagerOptions) {
  const clear = () => {
    for (let i = transitionDebugGroup.children.length - 1; i >= 0; i--) {
      transitionDebugGroup.remove(transitionDebugGroup.children[i]);
    }
  };

  const rebuild = (playerPosition: { x: number; y: number }) => {
    clear();
    const map = world.getCurrentMap();
    const radius = 18;
    const centerTileX = Math.floor(playerPosition.x + map.width / 2);
    const centerTileY = Math.floor(playerPosition.y + map.height / 2);
    const lines: string[] = [];

    for (let ty = Math.max(0, centerTileY - radius); ty <= Math.min(map.height - 1, centerTileY + radius); ty++) {
      for (let tx = Math.max(0, centerTileX - radius); tx <= Math.min(map.width - 1, centerTileX + radius); tx++) {
        const tile = map.tiles[ty]?.[tx];
        if (!tile) continue;
        const isEntrance = tile.interactionId === 'building_entrance';
        const isExit = tile.interactionId === 'building_exit';
        const hasTransition = !!tile.transition;
        if (!isEntrance && !isExit && !hasTransition) continue;

        const wx = tx - map.width / 2;
        const wy = ty - map.height / 2;
        const mat = isEntrance
          ? transitionDebugMaterials.entrance
          : isExit
            ? transitionDebugMaterials.exit
            : tile.type === 'portal'
              ? transitionDebugMaterials.portal
              : transitionDebugMaterials.other;
        const marker = new THREE.Mesh(transitionDebugGeometry, mat);
        marker.position.set(wx, world.getVisualY(wx, wy) + 0.02, 0.72);
        marker.renderOrder = 250000;
        transitionDebugGroup.add(marker);

        if (lines.length < 7) {
          const target = tile.transition
            ? ` -> ${tile.transition.targetMap}(${tile.transition.targetX},${tile.transition.targetY})`
            : '';
          lines.push(`(${wx}, ${wy}) ${tile.type}${tile.interactionId ? ` [${tile.interactionId}]` : ''}${target}`);
        }
      }
    }

    setTransitionDebugLines(lines);
  };

  const dispose = () => {
    clear();
    transitionDebugGeometry.dispose();
    transitionDebugMaterials.entrance.dispose();
    transitionDebugMaterials.exit.dispose();
    transitionDebugMaterials.portal.dispose();
    transitionDebugMaterials.other.dispose();
  };

  return {
    clear,
    rebuild,
    dispose,
  };
}
