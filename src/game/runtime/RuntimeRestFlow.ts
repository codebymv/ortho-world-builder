import * as THREE from 'three';
import type { GameState } from '@/lib/game/GameState';
import type { World, WorldMap } from '@/lib/game/World';
import { bonfireTileWorldPosition, type BonfireEntry } from '@/data/bonfires';

interface RuntimeParticleSystemLike {
  emitBonfireKindled: (position: THREE.Vector3) => void;
  emitSparkles: (position: THREE.Vector3) => void;
}

interface CreateBonfireRestActionOptions {
  state: GameState;
  world: World;
  particleSystem: RuntimeParticleSystemLike;
  notify: (message: string, options?: { id?: string; type?: 'success' | 'info' | 'error'; description?: string; duration?: number }) => void;
  showHeroOverlay: (title: string, subtitle?: string) => void;
  playBonfireKindle: () => void;
  playBonfireRestore: () => void;
  respawnEnemiesForCurrentMap: (targetMap: string, map: WorldMap) => void;
  showTransitionOverlay: (mapName: string, mapSubtitle?: string) => void;
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
  showTransitionOverlay,
  triggerSave,
  triggerUIUpdate,
  openBonfireMenu,
}: CreateBonfireRestActionOptions) {
  const kindleBonfire = (tileX: number, tileY: number) => {
    const map = world.getCurrentMap();
    const { x: bonfireWorldX, y: bonfireWorldY } = bonfireTileWorldPosition(state.currentMap, tileX, tileY);
    const bonfireVec = new THREE.Vector3(bonfireWorldX, bonfireWorldY, 0.45);
    const firstKey = `bonfire_first_${state.currentMap}_${tileX}_${tileY}`;

    if (!state.getFlag(firstKey)) {
      state.setFlag(firstKey, true);

      const row = map.tiles[tileY];
      if (row && row[tileX]) {
        row[tileX]!.type = 'bonfire';
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

    // Respawn / fast-travel “here” must match bonfire tile center (not walk-up player offset).
    state.lastBonfire = {
      mapId: state.currentMap,
      x: bonfireWorldX,
      y: bonfireWorldY,
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

  const travelToBonfire = (entry: BonfireEntry) => {
    const map = world.getCurrentMap();
    const { x: worldX, y: worldY } = bonfireTileWorldPosition(entry.mapId, entry.tileX, entry.tileY);

    state.player.position = { x: worldX, y: worldY };
    state.player.health = state.player.maxHealth;
    state.player.stamina = state.player.maxStamina;
    state.lastBonfire = { mapId: entry.mapId, x: worldX, y: worldY };

    respawnEnemiesForCurrentMap(state.currentMap, map);
    showTransitionOverlay(map.name, map.subtitle);
    playBonfireRestore();
    notify('Arrived at bonfire', {
      id: 'bonfire-travel',
      type: 'success',
      description: 'Health and stamina restored. Enemies have respawned.',
      duration: 2500,
    });
    triggerSave();
    triggerUIUpdate();
  };

  return { interact, restAtBonfire, travelToBonfire };
}
