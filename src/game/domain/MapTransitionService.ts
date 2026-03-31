import type { GameState } from '@/lib/game/GameState';
import type { World, WorldMap } from '@/lib/game/World';
import type { MapTransitionResult } from '@/game/runtime/RuntimeTypes';

type NotificationType = 'success' | 'info' | 'error';

interface NotificationOptions {
  id?: string;
  type?: NotificationType;
  description?: string;
  duration?: number;
}

interface TransitionContext {
  state: GameState;
  world: World;
  allMaps: Record<string, WorldMap>;
  isPortalDestinationUnlocked: (targetMap: string) => boolean;
  notify: (message: string, options?: NotificationOptions) => void;
  showTransitionOverlay: (mapName: string) => void;
  syncPersistentMapState: () => void;
  setActiveNpcsForCurrentMap: () => void;
  setBiomeForMap: (mapId: string) => void;
  switchMusicTrack: (mapId: string) => void;
  triggerSave: () => void;
  resolveSafeTransitionPosition: (
    world: World,
    mapWorld: WorldMap,
    targetX: number,
    targetY: number
  ) => { x: number; y: number };
  syncPlayerSpatialState: (targetMap: string, worldX: number, worldY: number) => void;
  resetEnemiesForMap: (targetMap: string, map: WorldMap) => void;
  applyMapEntryProgression: (targetMap: string) => void;
  resetExplorationState: () => void;
  setPortalCooldown: (seconds: number) => void;
}

export function createMapTransitionService(context: TransitionContext) {
  const findNearbyExteriorEntrance = (map: WorldMap, targetX: number, targetY: number) => {
    let best: { x: number; y: number } | null = null;
    let bestScore = Number.POSITIVE_INFINITY;

    for (let y = targetY - 4; y <= targetY + 4; y++) {
      if (y < 0 || y >= map.height) continue;
      for (let x = targetX - 1; x <= targetX + 1; x++) {
        if (x < 0 || x >= map.width) continue;
        const tile = map.tiles[y]?.[x];
        if (tile?.interactionId !== 'building_entrance') continue;

        // Favor the southernmost entrance marker so cottage front-step fallback
        // triggers beat the threshold tile tucked under the facade.
        const score = Math.abs(x - targetX) * 100 + Math.abs(y - targetY) * 10 - y;
        if (!best || score < bestScore) {
          best = { x, y };
          bestScore = score;
        }
      }
    }

    return best;
  };

  const resolveExteriorExitTarget = (
    sourceMap: string,
    targetMap: string,
    map: WorldMap,
    targetX: number,
    targetY: number,
  ) => {
    if (!sourceMap.startsWith('interior_') || targetMap.startsWith('interior_')) {
      return { x: targetX, y: targetY };
    }

    const entranceTile = findNearbyExteriorEntrance(map, targetX, targetY);
    if (!entranceTile) {
      return { x: targetX, y: targetY };
    }

    // Exterior building entrances are authored with the accessible approach path
    // visually below the trigger tile. In this map coordinate system that means
    // a slightly smaller Y value, so step outward that way instead of dropping
    // the player onto the roof/back side of the facade.
    const candidateOffsets = [5, 4, 3, 2, 1, 6];
    for (const offset of candidateOffsets) {
      const nextY = entranceTile.y - offset;
      const nextTile = map.tiles[nextY]?.[entranceTile.x];
      if (nextTile?.walkable) {
        return { x: entranceTile.x, y: nextY };
      }
    }

    return entranceTile;
  };

  const transitionTo = (targetMap: string, targetX: number, targetY: number): MapTransitionResult => {
    console.log(`[MapTransition] Starting transition to ${targetMap} at (${targetX}, ${targetY})`);
    const sourceMap = context.state.currentMap;

    if (!context.isPortalDestinationUnlocked(targetMap)) {
      context.notify('Magical barrier blocks the path', {
        id: 'portal-barrier',
        description: 'Complete the right quest to unlock this route.',
        duration: 3500,
      });
      return { ok: false, reason: 'locked' };
    }

    const newMap = context.allMaps[targetMap];
    if (!newMap) {
      console.log(`[MapTransition] ERROR: Map ${targetMap} not found!`);
      return { ok: false, reason: 'missing_map' };
    }

    console.log(`[MapTransition] Map loaded: ${newMap.name}, size: ${newMap.width}x${newMap.height}`);

    context.showTransitionOverlay(newMap.name);

    context.state.currentMap = targetMap;
    context.world.loadMap(newMap);
    context.syncPersistentMapState();
    context.setActiveNpcsForCurrentMap();

    if (!targetMap.startsWith('interior_')) {
      context.setBiomeForMap(targetMap);
      context.switchMusicTrack(targetMap);
    }

    context.triggerSave();

    const preferredTarget = resolveExteriorExitTarget(sourceMap, targetMap, newMap, targetX, targetY);
    const safeTarget = context.resolveSafeTransitionPosition(context.world, newMap, preferredTarget.x, preferredTarget.y);
    context.state.player.position = { x: safeTarget.x, y: safeTarget.y };
    context.syncPlayerSpatialState(targetMap, safeTarget.x, safeTarget.y);

    context.resetEnemiesForMap(targetMap, newMap);
    context.applyMapEntryProgression(targetMap);
    context.notify(`Entered ${newMap.name}`, { id: 'map-enter', duration: 2500 });
    context.resetExplorationState();
    context.setPortalCooldown(0.5);

    return { ok: true, map: newMap };
  };

  return {
    transitionTo,
  };
}
