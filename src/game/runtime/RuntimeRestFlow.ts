import * as THREE from 'three';
import type { CombatSystem } from '@/lib/game/Combat';
import type { GameState } from '@/lib/game/GameState';
import type { World, WorldMap } from '@/lib/game/World';
import {
  bonfireTileWorldPosition,
  getBonfiresForMap,
  isPlayerAtBonfireEntry,
  type BonfireEntry,
} from '@/data/bonfires';
import {
  areHostilesNearBonfire,
  BONFIRE_HOSTILES_NEAR_MESSAGE,
  evictEnemiesFromBonfireSafeZones,
  evictEnemiesFromBonfireRestZones,
} from '@/game/runtime/bonfireCombatGuard';
import {
  clearWestFortNorthLogCover,
  isWestFortNorthBonfireTile,
  westFortNorthLogsBlocking,
} from '@/game/runtime/westFortBonfires';

interface RuntimeParticleSystemLike {
  emitBonfireKindled: (position: THREE.Vector3) => void;
  emitSparkles: (position: THREE.Vector3) => void;
}

interface CreateBonfireRestActionOptions {
  state: GameState;
  world: World;
  combatSystem: CombatSystem;
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
  combatSystem,
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
  const hostilesBlockBonfire = (tileX: number, tileY: number): boolean => {
    evictEnemiesFromBonfireRestZones(combatSystem, state.currentMap);
    if (!areHostilesNearBonfire(combatSystem, state.currentMap, tileX, tileY)) return false;
    notify(BONFIRE_HOSTILES_NEAR_MESSAGE, {
      id: 'bonfire-hostiles-near',
      type: 'error',
      duration: 3200,
    });
    return true;
  };

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

  const resolveBonfireTileAtPlayer = (): { tileX: number; tileY: number } | null => {
    const map = world.getCurrentMap();
    const px = state.player.position.x;
    const py = state.player.position.y;
    const halfW = map.width / 2;
    const halfH = map.height / 2;
    const tx = Math.floor(px + halfW);
    const ty = Math.floor(py + halfH);
    const tile = map.tiles[ty]?.[tx];
    if (tile?.interactionId?.includes('bonfire')) {
      return { tileX: tx, tileY: ty };
    }
    for (const entry of getBonfiresForMap(state.currentMap)) {
      if (isPlayerAtBonfireEntry(state.currentMap, px, py, entry)) {
        return { tileX: entry.tileX, tileY: entry.tileY };
      }
    }
    return null;
  };

  const restAtBonfireAt = (tileX: number, tileY: number) => {
    if (hostilesBlockBonfire(tileX, tileY)) return;

    state.player.health = state.player.maxHealth;
    state.player.stamina = state.player.maxStamina;
    state.player.lastBreathUsedThisLife = false;
    state.refillEphemeralExtract();
    playBonfireRestore();
    const map = world.getCurrentMap();
    state.killedEnemyIds.clear();
    respawnEnemiesForCurrentMap(state.currentMap, map);
    notify('Rested at bonfire', {
      id: 'bonfire',
      type: 'success',
      description: 'Health, stamina, and Ephemeral Extract restored. Enemies have respawned.',
      duration: 2500,
    });
    triggerSave();
    triggerUIUpdate();
  };

  const restAtBonfire = () => {
    const at = resolveBonfireTileAtPlayer();
    if (!at) return;
    restAtBonfireAt(at.tileX, at.tileY);
  };

  const interact = (tileX: number, tileY: number) => {
    const map = world.getCurrentMap();

    if (isWestFortNorthBonfireTile(tileX, tileY) && westFortNorthLogsBlocking(map)) {
      if (hostilesBlockBonfire(tileX, tileY)) return;
      clearWestFortNorthLogCover(map, world, state);
      notify('Timber cleared', {
        id: 'west-fort-bonfire-logs-cleared',
        type: 'success',
        description: 'You drag the fallen logs aside. The cold hearth lies bare. Kindle it when the yard is safe.',
        duration: 4200,
      });
      triggerSave();
      triggerUIUpdate();
      return;
    }

    if (hostilesBlockBonfire(tileX, tileY)) return;

    const firstKey = `bonfire_first_${state.currentMap}_${tileX}_${tileY}`;
    const alreadyKindled = state.getFlag(firstKey);

    if (alreadyKindled) {
      // Bonfire is already lit — kindle updates respawn point then open the menu.
      kindleBonfire(tileX, tileY);
      evictEnemiesFromBonfireSafeZones(combatSystem, state.currentMap, state.gameFlags as Record<string, boolean | number>);
      openBonfireMenu();
    } else {
      // First interaction: kindle (shows hero overlay, particles, sfx) but keep menu closed
      // so the "Flame Kindled" hero text is fully visible.
      kindleBonfire(tileX, tileY);
    }
  };

  const travelToBonfire = (entry: BonfireEntry) => {
    evictEnemiesFromBonfireRestZones(combatSystem, entry.mapId);
    if (areHostilesNearBonfire(combatSystem, entry.mapId, entry.tileX, entry.tileY)) {
      notify(BONFIRE_HOSTILES_NEAR_MESSAGE, {
        id: 'bonfire-travel-hostiles-near',
        type: 'error',
        description: 'That flame is surrounded. Deal with the nearby threats first.',
        duration: 3200,
      });
      return;
    }

    const map = world.getCurrentMap();
    const { x: worldX, y: worldY } = bonfireTileWorldPosition(entry.mapId, entry.tileX, entry.tileY);

    state.player.position = { x: worldX, y: worldY };
    state.player.health = state.player.maxHealth;
    state.player.stamina = state.player.maxStamina;
    state.refillEphemeralExtract();
    state.lastBonfire = { mapId: entry.mapId, x: worldX, y: worldY };

    state.killedEnemyIds.clear();
    respawnEnemiesForCurrentMap(state.currentMap, map);
    evictEnemiesFromBonfireSafeZones(combatSystem, entry.mapId, state.gameFlags as Record<string, boolean | number>);
    evictEnemiesFromBonfireRestZones(combatSystem, entry.mapId);
    showTransitionOverlay(map.name, map.subtitle);
    playBonfireRestore();
    notify('Arrived at bonfire', {
      id: 'bonfire-travel',
      type: 'success',
      description: 'Health, stamina, and Ephemeral Extract restored. Enemies have respawned.',
      duration: 2500,
    });
    triggerSave();
    triggerUIUpdate();
  };

  return { interact, restAtBonfire, travelToBonfire };
}
