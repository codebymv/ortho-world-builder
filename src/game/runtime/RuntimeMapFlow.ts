import type { GameState } from '@/lib/game/GameState';
import type { CombatSystem } from '@/lib/game/Combat';
import type { Tile, World, WorldMap, TileType } from '@/lib/game/World';
import { createMapTransitionService } from '@/game/domain/MapTransitionService';
import { getVillageReactivityStage } from '@/game/domain/VillageReactivity';
import { mapDefinitions } from '@/data/maps';
import { TILE_METADATA } from '@/data/tiles';
import { spawnEnemiesFromMapZones } from '@/game/runtime/RuntimeWorldUtils';
import { ENEMY_BLUEPRINTS } from '@/data/enemies';

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

  const syncHollowShortcutState = () => {
    if (state.currentMap !== 'forest') return;
    const map = world.getCurrentMap();
    const shortcutOpen = state.getFlag('hollow_shortcut_open');
    for (let y = 39; y <= 44; y++) {
      for (let x = 96; x <= 103; x++) {
        const existing = map.tiles[y]?.[x];
        if (!existing) continue;
        map.tiles[y][x] = shortcutOpen
          ? { type: 'wooden_path', walkable: true, elevation: existing.elevation ?? 0 }
          : {
              type: 'gate',
              walkable: false,
              elevation: existing.elevation ?? 0,
              interactionId: 'hollow_gate',
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

  const syncForestFortGateState = () => {
    if (state.currentMap !== 'forest') return;
    const map = world.getCurrentMap();
    const gateOpen = state.getFlag('forest_fort_gate_open');
    const FORT_X = 130, FORT_Y = 120, FORT_W = 22, FORT_H = 18;
    const GATE_CX = FORT_X + Math.floor(FORT_W / 2); // 141
    const SOUTH_Y = FORT_Y + FORT_H - 1; // 137
    const TOWER_R = 3;

    const inCornerTower = (dx: number, dy: number) =>
      (dx < TOWER_R && dy < TOWER_R) ||
      (dx >= FORT_W - TOWER_R && dy < TOWER_R) ||
      (dx < TOWER_R && dy >= FORT_H - TOWER_R) ||
      (dx >= FORT_W - TOWER_R && dy >= FORT_H - TOWER_R);

    const towerCenter = (dx: number, dy: number) => {
      const cxL = dx < FORT_W / 2 ? Math.floor(TOWER_R / 2) : FORT_W - 1 - Math.floor(TOWER_R / 2);
      const cyL = dy < FORT_H / 2 ? Math.floor(TOWER_R / 2) : FORT_H - 1 - Math.floor(TOWER_R / 2);
      return dx === cxL && dy === cyL;
    };

    for (let dy = 0; dy < FORT_H; dy++) {
      for (let dx = 0; dx < FORT_W; dx++) {
        const isOuter = dx === 0 || dx === FORT_W - 1 || dy === 0 || dy === FORT_H - 1;
        const isSecond = dx === 1 || dx === FORT_W - 2 || dy === 1 || dy === FORT_H - 2;
        const isThird = dx === 2 || dx === FORT_W - 3 || dy === 2 || dy === FORT_H - 3;
        if (!isOuter && !isSecond && !isThird && !inCornerTower(dx, dy)) continue;
        const tx = FORT_X + dx;
        const ty = FORT_Y + dy;
        const row = map.tiles[ty];
        if (!row) continue;
        const el = row[tx]?.elevation ?? 0;

        // 3-wide gate on the south wall
        if (ty === SOUTH_Y && tx >= GATE_CX - 1 && tx <= GATE_CX + 1) {
          row[tx] = gateOpen
            ? { type: 'stone' as TileType, walkable: true, elevation: el }
            : { type: 'gate' as TileType, walkable: false, elevation: el, interactable: true, interactionId: 'forest_fort_gate' };
          continue;
        }

        // Gatehouse approach (row inside south wall): lanterns flanking, cobblestone walkway
        if (dy === FORT_H - 2 && dx >= GATE_CX - FORT_X - 2 && dx <= GATE_CX - FORT_X + 2) {
          if (dx === GATE_CX - FORT_X - 2 || dx === GATE_CX - FORT_X + 2) {
            row[tx] = { type: 'lantern' as TileType, walkable: false, elevation: el };
          } else {
            row[tx] = { type: 'cobblestone' as TileType, walkable: true, elevation: el };
          }
          continue;
        }

        // Corner tower tiles: lantern at center, stone elsewhere
        if (inCornerTower(dx, dy)) {
          row[tx] = towerCenter(dx, dy)
            ? { type: 'lantern' as TileType, walkable: false, elevation: el }
            : { type: 'stone' as TileType, walkable: false, elevation: el };
          continue;
        }

        // Third ring: iron fence / cobblestone pattern
        if (isThird && !isOuter && !isSecond) {
          row[tx] = (dx + dy) % 3 === 0
            ? { type: 'iron_fence' as TileType, walkable: false, elevation: el }
            : { type: 'cobblestone' as TileType, walkable: true, elevation: el };
          continue;
        }

        // Outer and second wall: solid stone
        row[tx] = { type: 'stone' as TileType, walkable: false, elevation: el };
      }
    }

    // Exterior gatehouse frame (row south of fort)
    const frameY = FORT_Y + FORT_H;
    if (frameY < map.tiles.length) {
      const frameRow = map.tiles[frameY];
      if (frameRow) {
        const el = frameRow[GATE_CX]?.elevation ?? 0;
        const pillarL = GATE_CX - 2, pillarR = GATE_CX + 2;
        const torchL = GATE_CX - 1, torchR = GATE_CX + 1;
        if (pillarL >= 0) frameRow[pillarL] = { type: 'stone' as TileType, walkable: false, elevation: el };
        if (pillarR < frameRow.length) frameRow[pillarR] = { type: 'stone' as TileType, walkable: false, elevation: el };
        if (torchL >= 0) frameRow[torchL] = { type: 'lantern' as TileType, walkable: false, elevation: el };
        if (torchR < frameRow.length) frameRow[torchR] = { type: 'lantern' as TileType, walkable: false, elevation: el };
      }
    }

    world.rebuildChunks();
  };

  const syncHollowFogGateState = () => {
    if (state.currentMap !== 'forest') return;
    const map = world.getCurrentMap();
    const defeated = state.getFlag('hollow_guardian_defeated');
    // Place a 3-wide fog gate row at tile y=22 (south edge of the clearing), centred at x=122
    const GATE_Y = 22;
    const GATE_CX = 122;
    for (let dx = -1; dx <= 1; dx++) {
      const tx = GATE_CX + dx;
      const row = map.tiles[GATE_Y];
      if (!row) continue;
      const el = row[tx]?.elevation ?? 0;
      if (defeated) {
        row[tx] = { type: 'dark_grass' as TileType, walkable: true, elevation: el };
      } else {
        row[tx] = {
          type: 'fog_gate' as TileType,
          walkable: false,
          elevation: el,
          interactable: true,
          interactionId: 'hollow_fog_gate',
        };
      }
    }
    world.rebuildChunks();
  };

  const syncHollowArenaExitState = () => {
    if (state.currentMap !== 'interior_hollow_arena') return;
    const map = world.getCurrentMap();
    const exitY = 34;
    const exitX = 18;
    const row = map.tiles[exitY];
    if (!row) return;
    const el = row[exitX]?.elevation ?? 0;
    if (state.getFlag('hollow_guardian_defeated')) {
      row[exitX] = {
        type: 'door_interior' as TileType,
        walkable: true,
        elevation: el,
        transition: { targetMap: 'forest', targetX: 122, targetY: 30 },
        interactable: true,
        interactionId: 'building_exit',
      };
    } else {
      row[exitX] = { type: 'dead_tree' as TileType, walkable: false, elevation: el };
    }
    world.rebuildChunks();
  };

  const syncPersistentMapState = () => {
    syncShadowCastleGateState();
    syncWhisperingWoodsShortcutState();
    syncHollowShortcutState();
    syncForestFortGateState();
    syncHollowFogGateState();
    syncHollowArenaExitState();
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

    // Boss arena: spawn the Hollow Guardian at the arena center
    if (targetMap === 'interior_hollow_arena' && !state.getFlag('hollow_guardian_defeated')) {
      const bp = ENEMY_BLUEPRINTS.hollow_guardian;
      if (bp) {
        const arenaCenter = { x: 0, y: 0 }; // tile (18,18) -> world (18 - 18, 18 - 18)
        combatSystem.spawnEnemy(bp.name, arenaCenter, bp.hp, bp.damage, bp.sprite, {
          speed: bp.speed,
          attackRange: bp.attackRange,
          chaseRange: bp.chaseRange,
          essenceReward: bp.essenceReward,
          telegraphDuration: bp.telegraphDuration,
          recoverDuration: bp.recoverDuration,
          poise: bp.poise,
          staggerDuration: bp.staggerDuration,
        });
      }
    }

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
    syncHollowShortcutState,
    syncForestFortGateState,
    syncHollowFogGateState,
    syncHollowArenaExitState,
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
