import type { GameState } from '@/lib/game/GameState';
import type { CombatSystem } from '@/lib/game/Combat';
import type { Tile, World, WorldMap, TileType } from '@/lib/game/World';
import { createMapTransitionService } from '@/game/domain/MapTransitionService';
import { getVillageReactivityStage } from '@/game/domain/VillageReactivity';
import { mapDefinitions } from '@/data/maps';
import { TILE_METADATA } from '@/data/tiles';
import { spawnEnemiesFromMapZones } from '@/game/runtime/RuntimeWorldUtils';

interface RuntimeMapTransitionServiceLike {
  transitionTo: (targetMap: string, targetX: number, targetY: number) => void;
}

interface EnemyVisualRegistryLike {
  disposeAll: () => void;
}

interface RuntimeMapFlowOptions {
  state: GameState;
  world: World;
  allMaps: Record<string, WorldMap>;
  notify: (message: string, options?: { id?: string; type?: string; description?: string; duration?: number }) => void;
  showTransitionOverlay: (mapName: string, mapSubtitle?: string) => void;
  setBiomeForMap: (mapId: string) => void;
  switchMusicTrack: (mapId: string) => void;
  triggerSave: () => void;
  resolveSafeTransitionPosition: (world: World, mapWorld: WorldMap, targetX: number, targetY: number) => { x: number; y: number };
  syncPlayerSpatialState: (targetMap: string, worldX: number, worldY: number) => void;
  resetExplorationState: () => void;
  isPortalDestinationUnlocked: (targetMap: string) => boolean;
  setPortalCooldown: (seconds: number) => void;
  setActiveForCurrentMap: () => void;
  playPortalWarp: () => void;
  assetManager: { warmupEnemyTexturesForZones: (enemyZones: unknown) => void };
  combatSystem: CombatSystem;
  enemyVisuals: EnemyVisualRegistryLike;
  applyMapEntryProgression: (targetMap: string) => void;
}

const WALKABLE_BASE_TILES: ReadonlySet<TileType> = new Set([
  'grass',
  'dirt',
  'stone',
  'wood',
  'sand',
  'swamp',
  'ice',
  'cobblestone',
  'farmland',
  'ash',
  'ruins_floor',
  'dark_grass',
  'mossy_stone',
  'wooden_path',
  'wood_floor',
]);

type ReactiveTileSpec = {
  x: number;
  y: number;
  type: TileType;
  walkable: boolean;
};

const VILLAGE_MANUSCRIPT_REACTIVITY_TILES: ReadonlyArray<ReactiveTileSpec> = [
  { x: 113, y: 18, type: 'lantern', walkable: false },
  { x: 123, y: 18, type: 'lantern', walkable: false },
  { x: 113, y: 30, type: 'lantern', walkable: false },
  { x: 123, y: 30, type: 'lantern', walkable: false },
  { x: 108, y: 24, type: 'cart', walkable: false },
  { x: 107, y: 26, type: 'barrel', walkable: false },
  { x: 109, y: 26, type: 'crate', walkable: false },
  { x: 128, y: 24, type: 'cart', walkable: false },
  { x: 130, y: 26, type: 'barrel', walkable: false },
  { x: 132, y: 26, type: 'crate', walkable: false },
  { x: 96, y: 86, type: 'lantern', walkable: false },
  { x: 144, y: 86, type: 'lantern', walkable: false },
  { x: 154, y: 74, type: 'barrel', walkable: false },
  { x: 156, y: 74, type: 'crate', walkable: false },
  { x: 186, y: 76, type: 'barrel', walkable: false },
  { x: 188, y: 76, type: 'crate', walkable: false },
];

const VILLAGE_DEEP_WOODS_REACTIVITY_TILES: ReadonlyArray<ReactiveTileSpec> = [
  { x: 113, y: 11, type: 'lantern', walkable: false },
  { x: 123, y: 11, type: 'lantern', walkable: false },
  { x: 104, y: 18, type: 'cart', walkable: false },
  { x: 102, y: 22, type: 'barrel', walkable: false },
  { x: 103, y: 22, type: 'crate', walkable: false },
  { x: 136, y: 18, type: 'cart', walkable: false },
  { x: 137, y: 22, type: 'barrel', walkable: false },
  { x: 138, y: 22, type: 'crate', walkable: false },
  { x: 110, y: 40, type: 'barrel', walkable: false },
  { x: 112, y: 40, type: 'crate', walkable: false },
  { x: 128, y: 40, type: 'barrel', walkable: false },
  { x: 130, y: 40, type: 'crate', walkable: false },
  { x: 170, y: 84, type: 'lantern', walkable: false },
  { x: 194, y: 84, type: 'lantern', walkable: false },
  { x: 42, y: 48, type: 'cart', walkable: false },
  { x: 44, y: 50, type: 'barrel', walkable: false },
  { x: 46, y: 50, type: 'crate', walkable: false },
  { x: 56, y: 50, type: 'barrel', walkable: false },
  { x: 58, y: 50, type: 'crate', walkable: false },
  { x: 50, y: 56, type: 'lantern', walkable: false },
  { x: 56, y: 56, type: 'lantern', walkable: false },
];

const INTERIOR_BLACKSMITH_MANUSCRIPT_TILES: ReadonlyArray<ReactiveTileSpec> = [
  { x: 11, y: 3, type: 'crate', walkable: false },
  { x: 12, y: 3, type: 'barrel', walkable: false },
  { x: 10, y: 4, type: 'crate', walkable: false },
];

const INTERIOR_BLACKSMITH_DEEP_TILES: ReadonlyArray<ReactiveTileSpec> = [
  { x: 5, y: 3, type: 'weapon_rack', walkable: false },
  { x: 10, y: 3, type: 'weapon_rack', walkable: false },
  { x: 12, y: 4, type: 'barrel', walkable: false },
];

const INTERIOR_MERCHANT_MANUSCRIPT_TILES: ReadonlyArray<ReactiveTileSpec> = [
  { x: 5, y: 3, type: 'lantern', walkable: false },
  { x: 9, y: 3, type: 'lantern', walkable: false },
  { x: 5, y: 8, type: 'pot', walkable: true },
  { x: 9, y: 8, type: 'pot', walkable: true },
];

const INTERIOR_MERCHANT_DEEP_TILES: ReadonlyArray<ReactiveTileSpec> = [
  { x: 4, y: 4, type: 'bookshelf', walkable: false },
  { x: 10, y: 4, type: 'bookshelf', walkable: false },
  { x: 7, y: 8, type: 'pot', walkable: true },
];

const INTERIOR_INN_MANUSCRIPT_TILES: ReadonlyArray<ReactiveTileSpec> = [
  { x: 6, y: 3, type: 'lantern', walkable: false },
  { x: 14, y: 3, type: 'lantern', walkable: false },
  { x: 6, y: 8, type: 'bench', walkable: false },
  { x: 14, y: 8, type: 'bench', walkable: false },
  { x: 9, y: 5, type: 'barrel', walkable: false },
];

const INTERIOR_INN_DEEP_TILES: ReadonlyArray<ReactiveTileSpec> = [
  { x: 6, y: 9, type: 'bed', walkable: false },
  { x: 14, y: 9, type: 'bed', walkable: false },
  { x: 8, y: 8, type: 'barrel', walkable: false },
  { x: 12, y: 8, type: 'crate', walkable: false },
];

function applyReactiveTiles(map: WorldMap, specs: ReadonlyArray<ReactiveTileSpec>) {
  let changed = false;

  for (const spec of specs) {
    const existing = map.tiles[spec.y]?.[spec.x];
    if (!existing) continue;

    const nextTile: Tile = {
      type: spec.type,
      walkable: spec.walkable,
      elevation: existing.elevation ?? 0,
    };

    if (existing.type === nextTile.type && existing.walkable === nextTile.walkable) {
      continue;
    }

    map.tiles[spec.y][spec.x] = nextTile;
    changed = true;
  }

  return changed;
}

function resolveHarvestedBaseTile(map: WorldMap, tileX: number, tileY: number, fallback: TileType): TileType {
  const neighborCounts = new Map<TileType, number>();

  for (const [dx, dy] of [[0, 1], [0, -1], [1, 0], [-1, 0]] as const) {
    const nx = tileX + dx;
    const ny = tileY + dy;
    if (ny < 0 || ny >= map.height || nx < 0 || nx >= map.width) continue;

    const neighborType = map.tiles[ny]?.[nx]?.type;
    if (!neighborType) continue;
    if (TILE_METADATA[neighborType]?.isOverlay) continue;

    neighborCounts.set(neighborType, (neighborCounts.get(neighborType) || 0) + 1);
  }

  let bestType = fallback;
  let bestCount = 0;

  for (const [type, count] of neighborCounts) {
    if (count > bestCount) {
      bestType = type;
      bestCount = count;
    }
  }

  return bestType;
}

export function createRuntimeMapFlow({
  state,
  world,
  allMaps,
  notify,
  showTransitionOverlay,
  setBiomeForMap,
  switchMusicTrack,
  triggerSave,
  resolveSafeTransitionPosition,
  syncPlayerSpatialState,
  resetExplorationState,
  isPortalDestinationUnlocked,
  setPortalCooldown,
  setActiveForCurrentMap,
  playPortalWarp,
  assetManager,
  combatSystem,
  enemyVisuals,
  applyMapEntryProgression,
}: RuntimeMapFlowOptions) {
  const syncShadowCastleGateState = () => {
    if (state.currentMap !== 'shadow_castle') return;
    const map = world.getCurrentMap();
    const gateOpen = state.getFlag('shadow_castle_gate_open');
    const gateId = 'shadow_castle_inner_gate';
    for (let y = 46; y <= 47; y++) {
      for (let x = 92; x <= 107; x++) {
        const tile = map.tiles[y]?.[x];
        if (!tile) continue;
        if (gateOpen) {
          map.tiles[y][x] = { type: 'stone', walkable: true, elevation: tile.elevation ?? 0 };
        } else {
          map.tiles[y][x] = {
            type: 'switch_door',
            walkable: false,
            elevation: tile.elevation ?? 0,
            interactionId: gateId,
          };
        }
      }
    }
    world.rebuildChunks();
  };

  const syncWhisperingWoodsShortcutState = () => {
    if (state.currentMap !== 'forest') return;
    const map = world.getCurrentMap();
    const shortcutOpen = state.getFlag('whispering_woods_shortcut_open');
    for (let y = 199; y <= 202; y++) {
      for (let x = 122; x <= 136; x++) {
        const existing = map.tiles[y]?.[x];
        if (!existing) continue;
        map.tiles[y][x] = shortcutOpen
          ? { type: 'wooden_path', walkable: true, elevation: existing.elevation ?? 0 }
          : {
              type: 'gate',
              walkable: false,
              elevation: existing.elevation ?? 0,
              interactionId: 'whispering_woods_ranger_gate',
            };
      }
    }
    world.rebuildChunks();
  };

  const syncOpenedChestState = () => {
    const map = world.getCurrentMap();
    let changed = false;
    for (let y = 0; y < map.height; y++) {
      for (let x = 0; x < map.width; x++) {
        const tile = map.tiles[y][x];
        if (!tile.interactionId || !tile.interactionId.includes('chest')) continue;
        const opened = state.getFlag(`${tile.interactionId}_opened`);
        if (opened && tile.type === 'chest') {
          map.tiles[y][x] = { ...tile, type: 'chest_opened' };
          changed = true;
        } else if (!opened && tile.type === 'chest_opened') {
          map.tiles[y][x] = { ...tile, type: 'chest' };
          changed = true;
        }
      }
    }
    if (changed) {
      world.rebuildChunks();
    }
  };

  const syncHarvestedTempestGrassState = () => {
    const map = world.getCurrentMap();
    let changed = false;

    for (let y = 0; y < map.height; y++) {
      for (let x = 0; x < map.width; x++) {
        const tile = map.tiles[y][x];
        if (tile.interactionId !== 'tempest_grass_pickup') continue;
        if (tile.type !== 'tempest_grass') continue;

        const worldX = x - map.width / 2;
        const worldY = y - map.height / 2;
        const harvested = state.getFlag(`tempest_grass_${state.currentMap}_${worldX}_${worldY}`);
        if (!harvested) continue;

        const baseType = resolveHarvestedBaseTile(
          map,
          x,
          y,
          TILE_METADATA[tile.type]?.baseTile ?? 'grass'
        );

        map.tiles[y][x] = {
          type: baseType,
          walkable: WALKABLE_BASE_TILES.has(baseType),
          elevation: tile.elevation ?? 0,
        };
        changed = true;
      }
    }

    if (changed) {
      world.rebuildChunks();
    }
  };

  const syncVillageReactivityState = () => {
    if (state.currentMap !== 'village') return;

    const map = world.getCurrentMap();
    const villageStage = getVillageReactivityStage(state);
    let changed = false;

    if (villageStage === 'after_manuscript' || villageStage === 'after_deep_woods') {
      changed = applyReactiveTiles(map, VILLAGE_MANUSCRIPT_REACTIVITY_TILES) || changed;
    }

    if (villageStage === 'after_deep_woods') {
      changed = applyReactiveTiles(map, VILLAGE_DEEP_WOODS_REACTIVITY_TILES) || changed;
    }

    if (changed) {
      world.rebuildChunks();
    }
  };

  const syncVillageInteriorReactivityState = () => {
    const villageStage = getVillageReactivityStage(state);
    const map = world.getCurrentMap();
    let changed = false;

    if (state.currentMap === 'interior_blacksmith') {
      if (villageStage === 'after_manuscript' || villageStage === 'after_deep_woods') {
        changed = applyReactiveTiles(map, INTERIOR_BLACKSMITH_MANUSCRIPT_TILES) || changed;
      }
      if (villageStage === 'after_deep_woods') {
        changed = applyReactiveTiles(map, INTERIOR_BLACKSMITH_DEEP_TILES) || changed;
      }
    }

    if (state.currentMap === 'interior_merchant') {
      if (villageStage === 'after_manuscript' || villageStage === 'after_deep_woods') {
        changed = applyReactiveTiles(map, INTERIOR_MERCHANT_MANUSCRIPT_TILES) || changed;
      }
      if (villageStage === 'after_deep_woods') {
        changed = applyReactiveTiles(map, INTERIOR_MERCHANT_DEEP_TILES) || changed;
      }
    }

    if (state.currentMap === 'interior_inn') {
      if (villageStage === 'after_manuscript' || villageStage === 'after_deep_woods') {
        changed = applyReactiveTiles(map, INTERIOR_INN_MANUSCRIPT_TILES) || changed;
      }
      if (villageStage === 'after_deep_woods') {
        changed = applyReactiveTiles(map, INTERIOR_INN_DEEP_TILES) || changed;
      }
    }

    if (changed) {
      world.rebuildChunks();
    }
  };

  const syncPersistentMapState = () => {
    syncShadowCastleGateState();
    syncWhisperingWoodsShortcutState();
    syncVillageReactivityState();
    syncVillageInteriorReactivityState();
    syncOpenedChestState();
    syncHarvestedTempestGrassState();
  };

  const respawnEnemiesForCurrentMap = (targetMap: string, map: WorldMap) => {
    combatSystem.clearAllEnemies();
    enemyVisuals.disposeAll();
    assetManager.warmupEnemyTexturesForZones(mapDefinitions[targetMap]?.enemyZones);
    spawnEnemiesFromMapZones(targetMap, map, combatSystem, world);
    console.log(`[Spawn] Total enemies spawned: ${combatSystem.getEnemies().length}`);
  };

  const mapTransitionService: RuntimeMapTransitionServiceLike = createMapTransitionService({
    state,
    world,
    allMaps,
    isPortalDestinationUnlocked,
    notify,
    showTransitionOverlay,
    syncPersistentMapState,
    setActiveNpcsForCurrentMap: setActiveForCurrentMap,
    setBiomeForMap,
    switchMusicTrack,
    triggerSave,
    resolveSafeTransitionPosition,
    syncPlayerSpatialState,
    resetEnemiesForMap: respawnEnemiesForCurrentMap,
    applyMapEntryProgression,
    resetExplorationState,
    setPortalCooldown,
  });

  const handleMapTransition = (targetMap: string, targetX: number, targetY: number) => {
    mapTransitionService.transitionTo(targetMap, targetX, targetY);
  };

  const handlePortalTransition = (targetMap: string, targetX: number, targetY: number) => {
    playPortalWarp();
    mapTransitionService.transitionTo(targetMap, targetX, targetY);
  };

  return {
    syncShadowCastleGateState,
    syncWhisperingWoodsShortcutState,
    syncVillageReactivityState,
    syncVillageInteriorReactivityState,
    syncOpenedChestState,
    syncHarvestedTempestGrassState,
    syncPersistentMapState,
    handleMapTransition,
    handlePortalTransition,
    respawnEnemiesForCurrentMap,
  };
}
