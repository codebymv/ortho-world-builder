import * as THREE from 'three';
import type { MutableRefObject } from 'react';
import type { GameState, Item } from '@/lib/game/GameState';
import type { World, WorldMap } from '@/lib/game/World';
import { allMaps } from '@/data/maps';

interface CreateRespawnHandlerOptions {
  gameStateRef: MutableRefObject<GameState | null>;
  worldRef: MutableRefObject<World | null>;
  cameraRef: MutableRefObject<THREE.OrthographicCamera | null>;
  items: Record<string, Item>;
  biomeAmbience: { setBiome: (biome: string) => void };
  mapBiomes: Record<string, string>;
  setActiveNpcsForCurrentMap: () => void;
  switchMusicTrack: (mapId: string) => void;
  syncPersistentMapState: () => void;
  getPlayerVisualY: (x: number, y: number) => number;
  playerMesh: THREE.Mesh;
  cameraTarget: { x: number; y: number };
  setPlayerSmoothedElevation: (elevation: number) => void;
  respawnEnemiesForMap: (targetMap: string, map: WorldMap) => void;
  closeDialogueSession: () => void;
  triggerSave: () => void;
  triggerUIUpdate: () => void;
  triggerMinimapUpdate: (force?: boolean, now?: number) => void;
}

export function createDeathRespawnHandler({
  gameStateRef,
  worldRef,
  cameraRef,
  items,
  biomeAmbience,
  mapBiomes,
  setActiveNpcsForCurrentMap,
  switchMusicTrack,
  syncPersistentMapState,
  getPlayerVisualY,
  playerMesh,
  cameraTarget,
  setPlayerSmoothedElevation,
  respawnEnemiesForMap,
  closeDialogueSession,
  triggerSave,
  triggerUIUpdate,
  triggerMinimapUpdate,
}: CreateRespawnHandlerOptions) {
  return () => {
    const state = gameStateRef.current;
    const world = worldRef.current;
    if (!state || !world) return;

    const camera = cameraRef.current;
    state.player.health = state.player.maxHealth;
    state.player.stamina = state.player.maxStamina;
    state.player.isDodging = false;
    state.player.iFrameTimer = 0;

    const potionCount = state.inventory.filter(i => i.id === 'health_potion').length;
    if (potionCount < 2) {
      while (state.inventory.filter(i => i.id === 'health_potion').length < 2) {
        state.addItem({ ...items.health_potion });
      }
    }

    let bonfire = state.lastBonfire;
    if (!bonfire) {
      const spawnPoint = world.getSpawnPoint();
      bonfire = { mapId: state.currentMap, x: spawnPoint.x, y: spawnPoint.y };
      state.lastBonfire = bonfire;
    }

    const targetMap = bonfire.mapId;
    const newMap = allMaps[targetMap];
    if (!newMap) return;

    if (state.currentMap !== targetMap) {
      state.currentMap = targetMap;
      world.loadMap(newMap);
      setActiveNpcsForCurrentMap();
      if (!targetMap.startsWith('interior_')) {
        biomeAmbience.setBiome(mapBiomes[targetMap] || 'grassland');
        switchMusicTrack(targetMap);
      }
    }

    syncPersistentMapState();

    state.player.position = { x: bonfire.x, y: bonfire.y };
    setPlayerSmoothedElevation(world.getElevationAt(bonfire.x, bonfire.y));
    const playerVisualY = getPlayerVisualY(bonfire.x, bonfire.y);
    playerMesh.position.set(bonfire.x, playerVisualY, 0.8);
    cameraTarget.x = bonfire.x;
    cameraTarget.y = playerVisualY;
    if (camera) {
      camera.position.x = bonfire.x;
      camera.position.y = playerVisualY;
    }

    respawnEnemiesForMap(targetMap, newMap);

    world.rebuildChunks();
    world.updateChunks(bonfire.x, bonfire.y);
    closeDialogueSession();
    triggerSave();
    triggerUIUpdate();
    triggerMinimapUpdate(true);
  };
}

interface StartupNotificationsOptions {
  savedData: { timestamp: number } | null;
  state: GameState;
  effectTimeouts: ReturnType<typeof setTimeout>[];
  isDisposed: () => boolean;
  addMarkersFromText: (text: string, currentMap: string) => void;
  notify: (title: string, options?: { id?: string; description?: string; duration?: number }) => void;
}

export function queueRuntimeStartupNotifications({
  savedData,
  state,
  effectTimeouts,
  isDisposed,
  addMarkersFromText,
  notify,
}: StartupNotificationsOptions) {
  if (!savedData) {
    effectTimeouts.push(
      setTimeout(() => {
        if (isDisposed()) return;
        notify('The Village Elder looks deeply troubled...', {
          description: 'Perhaps you should speak with him. (Press F to interact)',
          duration: 8000,
        });
        addMarkersFromText('Village Elder', state.currentMap);
      }, 1000),
    );
    return;
  }

  notify('Progress restored.', { id: 'save-load', duration: 3000 });
}
