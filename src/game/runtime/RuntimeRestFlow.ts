import * as THREE from 'three';
import type { GameState } from '@/lib/game/GameState';
import type { World, WorldMap } from '@/lib/game/World';

interface RuntimeParticleSystemLike {
  emitBonfireKindled: (position: THREE.Vector3) => void;
  emitSparkles: (position: THREE.Vector3) => void;
}

interface CreateBonfireRestActionOptions {
  state: GameState;
  world: World;
  particleSystem: RuntimeParticleSystemLike;
  notify: (message: string, options?: { id?: string; type?: string; description?: string; duration?: number }) => void;
  showHeroOverlay: (title: string, subtitle?: string) => void;
  playBonfireKindle: () => void;
  playBonfireRestore: () => void;
  respawnEnemiesForCurrentMap: (targetMap: string, map: WorldMap) => void;
  triggerSave: () => void;
  triggerUIUpdate: () => void;
  openBonfireMenu: () => void;
}

export function createBonfireRestAction({
  state,
  world,
  particleSystem,
  notify,
  showHeroOverlay,
  playBonfireKindle,
  playBonfireRestore,
  respawnEnemiesForCurrentMap,
  triggerSave,
  triggerUIUpdate,
  openBonfireMenu,
}: CreateBonfireRestActionOptions) {
  const kindleBonfire = (tileX: number, tileY: number) => {
    const map = world.getCurrentMap();
    const bonfireWorldX = tileX - map.width / 2 + 0.5;
    const bonfireWorldY = tileY - map.height / 2 + 0.5;
    const bonfireVec = new THREE.Vector3(bonfireWorldX, bonfireWorldY, 0.45);
    const firstKey = `bonfire_first_${state.currentMap}_${tileX}_${tileY}`;

    if (!state.getFlag(firstKey)) {
      state.setFlag(firstKey, true);

      const row = map.tiles[tileY];
      if (row && row[tileX]) {
        row[tileX]!.type = 'bonfire' as any;
        world.refreshMapTileRegion(tileX - 1, tileY - 1, tileX + 1, tileY + 1);
      }

      playBonfireKindle();
      particleSystem.emitBonfireKindled(bonfireVec);
      particleSystem.emitSparkles(new THREE.Vector3(bonfireWorldX, bonfireWorldY + 0.1, 0.55));
      showHeroOverlay('Flame Kindled');
      notify('Flame kindled', {
        id: 'bonfire',
        type: 'success',
        description: 'You will respawn here if you fall.',
        duration: 4000,
      });
    } else {
      particleSystem.emitBonfireKindled(bonfireVec);
    }

    state.lastBonfire = {
      mapId: state.currentMap,
      x: state.player.position.x,
      y: state.player.position.y,
    };

    triggerSave();
  };

  const restAtBonfire = () => {
    state.player.health = state.player.maxHealth;
    state.player.stamina = state.player.maxStamina;
    playBonfireRestore();
    const map = world.getCurrentMap();
    respawnEnemiesForCurrentMap(state.currentMap, map);
    notify('Rested at bonfire', {
      id: 'bonfire',
      type: 'success',
      description: 'Health and stamina restored. Enemies have respawned.',
      duration: 2500,
    });
    triggerSave();
    triggerUIUpdate();
  };

  const interact = (tileX: number, tileY: number) => {
    const firstKey = `bonfire_first_${state.currentMap}_${tileX}_${tileY}`;
    const alreadyKindled = state.getFlag(firstKey);

    if (alreadyKindled) {
      // Bonfire is already lit — kindle updates respawn point then open the menu.
      kindleBonfire(tileX, tileY);
      openBonfireMenu();
    } else {
      // First interaction: kindle (shows hero overlay, particles, sfx) but keep menu closed
      // so the "Flame Kindled" hero text is fully visible.
      kindleBonfire(tileX, tileY);
    }
  };

  return { interact, restAtBonfire };
}
