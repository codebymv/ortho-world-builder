import type { GameState } from '@/lib/game/GameState';
import type { CombatSystem } from '@/lib/game/Combat';
import type { Tile, World, WorldMap, TileType } from '@/lib/game/World';
import { createMapTransitionService } from '@/game/domain/MapTransitionService';
import { getVillageReactivityStage } from '@/game/domain/VillageReactivity';
import { mapDefinitions } from '@/data/maps';
import { TILE_METADATA } from '@/data/tiles';
import { getClosedChestTileType, getOpenedChestTileType, isChestTileType } from '@/data/specialChests';
import { spawnEnemiesFromMapZones } from '@/game/runtime/RuntimeWorldUtils';
import { ENEMY_BLUEPRINTS } from '@/data/enemies';
import { syncHeresyAltarsForMap } from '@/game/runtime/HeresyAltars';

interface RuntimeMapTransitionServiceLike {
  transitionTo: (targetMap: string, targetX: number, targetY: number) => void;
}

interface EnemyVisualRegistryLike {
  disposeAll: () => void;
}

interface RuntimeMapFlowOptions {
  state: GameState;
  world: World;
  loadMap: (targetMap: string) => Promise<WorldMap | undefined>;
  notify: (message: string, options?: { id?: string; type?: 'success' | 'info' | 'error'; description?: string; duration?: number }) => void;
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
  assetManager: { warmupEnemyTexturesForZones: (enemyZones: { enemyType: string }[] | undefined) => void };
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
  'hollow_blight',
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

const VILLAGE_REAVER_REACTIVITY_TILES: ReadonlyArray<ReactiveTileSpec> = [
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

const INTERIOR_BLACKSMITH_REAVER_TILES: ReadonlyArray<ReactiveTileSpec> = [
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

const INTERIOR_MERCHANT_REAVER_TILES: ReadonlyArray<ReactiveTileSpec> = [
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

const INTERIOR_INN_REAVER_TILES: ReadonlyArray<ReactiveTileSpec> = [
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
  loadMap,
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
  const syncWhisperingWoodsShortcutState = () => {
    if (state.currentMap !== 'forest') return;
    const map = world.getCurrentMap();
    const shortcutOpen = state.getFlag('whispering_woods_shortcut_open');
    for (let y = 199; y <= 202; y++) {
      for (let x = 121; x <= 136; x++) {
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

  const syncGroveShelfShortcutState = () => {
    if (state.currentMap !== 'forest') return;
    const map = world.getCurrentMap();
    const shortcutOpen = state.getFlag('grove_shelf_shortcut_open');
    for (let x = 56; x <= 60; x++) {
      const existing = map.tiles[163]?.[x];
      if (!existing) continue;
      map.tiles[163][x] = shortcutOpen
        ? { type: 'dirt', walkable: true, elevation: existing.elevation ?? 0 }
        : { type: 'iron_fence', walkable: false, elevation: existing.elevation ?? 0 };
    }
    world.rebuildChunks();
  };

  const syncRiversideBridgeShortcutState = () => {
    if (state.currentMap !== 'forest') return;
    const map = world.getCurrentMap();
    const shortcutOpen = state.getFlag('riverside_bridge_shortcut_open');
    for (let y = 155; y <= 161; y++) {
      for (let x = 146; x <= 153; x++) {
        const existing = map.tiles[y]?.[x];
        if (!existing) continue;
        const elevation = existing.elevation ?? 0;
        if (shortcutOpen) {
          map.tiles[y][x] = { type: 'bridge' as TileType, walkable: true, elevation };
        } else if (y <= 156) {
          map.tiles[y][x] = { type: 'bridge_folded' as TileType, walkable: false, elevation };
        } else if (y <= 158) {
          map.tiles[y][x] = { type: 'water' as TileType, walkable: false, elevation };
        } else {
          map.tiles[y][x] = { type: 'bridge' as TileType, walkable: true, elevation };
        }
      }
    }
    world.rebuildChunks();
  };

  // No-op: fog gate clears after boss defeat, making the corridor fully walkable
  // back to the bonfire. No separate shortcut gate needed. Kept as stub for plumbing.
  const syncHollowShortcutState = () => {};

  // Writes the permanent iron fence gate directly to the live map after generation,
  // bypassing the feature-array pipeline which cannot guarantee ordering for this gate.
  // Placed deep inside the corridor (y:50-51) so the dead-tree walls (x:100-115 and
  // x:130-147, y:28-71) fully enclose the gate on both sides — cannot be flanked.
  const syncHollowCorridorGateState = () => {
    if (state.currentMap !== 'forest') return;
    const map = world.getCurrentMap();
    for (let ty = 50; ty < 52; ty++) {
      const row = map.tiles[ty];
      if (!row) continue;
      for (let tx = 116; tx < 130; tx++) {
        const el = row[tx]?.elevation ?? 0;
        row[tx] = { type: 'iron_fence' as TileType, walkable: false, elevation: el };
      }
    }
    world.rebuildChunks();
  };

  // Permanent iron fence blocking the dirt-spine entrance to the hollow-approach ridge
  // (world ~-4,-37 / tile x=145, y=112-113). Vertical picket at the grass/dirt boundary —
  // perpendicular to the horizontal hollow corridor gate at y=50-51.
  // Reopens the hollow-approach stair landing shelf at runtime (world ~-38,-38 / x=110-118, y=111-112).
  const syncHollowApproachOverlookShelfState = () => {
    if (state.currentMap !== 'forest') return;
    const map = world.getCurrentMap();
    const scatterTypes = new Set<TileType>([
      'tall_grass',
      'fallen_log',
      'fallen_log_v',
      'tree',
      'fallen_tree',
      'stump',
    ]);
    for (let ty = 111; ty <= 112; ty++) {
      for (let tx = 110; tx <= 118; tx++) {
        const t = map.tiles[ty]?.[tx];
        if (!t || t.transition || t.interactable) continue;
        if (t.type === 'grass' && !t.walkable) {
          map.tiles[ty][tx] = { ...t, walkable: true };
          continue;
        }
        if (scatterTypes.has(t.type)) {
          map.tiles[ty][tx] = {
            type: 'grass' as TileType,
            walkable: true,
            elevation: t.elevation ?? 0,
          };
        }
      }
    }
    // Enemy collision centers are smaller than large wolf sprites; keep enemies one tile
    // west of the ladder column so their art does not hang over the climb path.
    for (let ty = 111; ty <= 112; ty++) {
      const tx = 118;
      const t = map.tiles[ty]?.[tx];
      if (!t || t.transition || t.interactable || !t.walkable) continue;
      map.tiles[ty][tx] = { ...t, enemyBlocked: true };
    }
    world.rebuildChunks();
  };

  const syncHollowApproachSpineGateState = () => {
    if (state.currentMap !== 'forest') return;
    const map = world.getCurrentMap();
    const scatterTypes = new Set<TileType>([
      'tall_grass',
      'fallen_log',
      'fallen_log_v',
      'tree',
      'fallen_tree',
      'stump',
    ]);
    const corridorY = 112;
    for (let tx = 119; tx <= 144; tx++) {
      const t = map.tiles[corridorY]?.[tx];
      if (!t || t.transition || t.interactable) continue;
      if ((t.type === 'grass' || t.type === 'dirt') && !t.walkable) {
        map.tiles[corridorY][tx] = { ...t, walkable: true };
        continue;
      }
      if (scatterTypes.has(t.type)) {
        map.tiles[corridorY][tx] = {
          type: 'grass' as TileType,
          walkable: true,
          elevation: t.elevation ?? 0,
        };
      }
    }
    const gateX = 145;
    for (let ty = 112; ty < 114; ty++) {
      const row = map.tiles[ty];
      if (!row?.[gateX]) continue;
      const el = row[gateX].elevation ?? 0;
      row[gateX] = { type: 'iron_fence' as TileType, walkable: false, elevation: el };
    }
    world.rebuildChunks();
  };

  const syncHollowApproachLadderState = () => {
    if (state.currentMap !== 'forest') return;
    const map = world.getCurrentMap();
    const extended = state.getFlag('hollow_approach_ladder_extended');
    // Coiled rope at the foot of the cliff (x=119, y=112, world -31,-38).
    // Player activates from the grass strip below the cliff face; the rope hooks on the
    // overlook edge above and gives a shortcut back up.
    const gateX = 119;
    const gateY = 112;
    if (!map.tiles[gateY]?.[gateX]) return;
    if (extended) {
      // Foot tile reverts to walkable grass once the rope is deployed.
      const foot = map.tiles[gateY]?.[gateX];
      if (foot) {
        map.tiles[gateY][gateX] = {
          type: 'grass' as TileType,
          walkable: true,
          elevation: foot.elevation ?? 0,
          enemyBlocked: true,
        };
      }
      // Ladder tiles through the cliff face body (y=108–111, elevation 0).
      for (let ty = 108; ty <= 111; ty++) {
        if (map.tiles[ty]?.[gateX]) {
          map.tiles[ty][gateX] = { type: 'ladder' as TileType, walkable: true, elevation: 0 };
        }
      }
      // Top rung at the overlook edge (y=107, elevation 1) — step off onto the overlook.
      if (map.tiles[107]?.[gateX]) {
        map.tiles[107][gateX] = { type: 'ladder' as TileType, walkable: true, elevation: 1 };
      }
      // Overlook dismount tile (y=106) — ensure it is walkable as the step-off point.
      const topExit = map.tiles[106]?.[gateX];
      if (topExit) {
        map.tiles[106][gateX] = { ...topExit, walkable: true, enemyBlocked: true };
      }
    } else {
      map.tiles[gateY][gateX] = {
        type: 'gate_ladder' as TileType,
        walkable: false,
        elevation: 0,
        interactable: true,
        interactionId: 'hollow_approach_ladder',
      };
    }
    world.rebuildChunks();
  };

  const syncCliffCorridorLadderState = () => {
    if (state.currentMap !== 'forest') return;
    const map = world.getCurrentMap();
    const extended = state.getFlag('cliff_corridor_ladder_extended');
    // Gate at the cliff edge of the enclosed overlook: x=268, y=132 (world ~118, -18).
    // The high-side grass ledge reaches the top from the west. Once kicked open, the ladder
    // drops toward lower screen rows and the player steps off to the east at the bottom.
    const gateX = 268;
    const gateY = 132;
    const bottomY = gateY - 4;
    if (!map.tiles[gateY]?.[gateX]) return;

    // Older live sessions may still have the previous y=133..136 ladder stamped in the map.
    // Always scrub that legacy footprint first so the player cannot walk through stale rungs
    // while the corrected ladder drops toward y=128.
    for (let ty = gateY + 1; ty <= gateY + 4; ty++) {
      if (map.tiles[ty]?.[gateX - 1]) {
        map.tiles[ty][gateX - 1] = { type: 'cliff' as TileType, walkable: false, elevation: 1 };
      }
      if (map.tiles[ty]?.[gateX]) {
        map.tiles[ty][gateX] = ty === gateY + 1
          ? { type: 'cliff' as TileType, walkable: false, elevation: 1 }
          : { type: 'grass' as TileType, walkable: true, elevation: 1 };
      }
      if (map.tiles[ty]?.[gateX + 1]) {
        map.tiles[ty][gateX + 1] = {
          type: 'grass' as TileType,
          walkable: true,
          elevation: 1,
          enemyBlocked: true,
        };
      }
    }

    if (extended) {
      // Rope unrolled: the release point stays on the high west ledge while the rungs descend
      // to the lower east-side landing. This mirrors Hollow Approach's "drop a shortcut down"
      // read, but with the dismount to the right of the bottom rung.
      map.tiles[gateY][gateX] = {
        type: 'ladder' as TileType,
        walkable: true,
        elevation: 1,
        baseTile: 'stone' as TileType,
      };
      for (let ty = gateY - 1; ty >= bottomY; ty--) {
        if (map.tiles[ty]?.[gateX]) {
          map.tiles[ty][gateX] = {
            type: 'ladder' as TileType,
            walkable: true,
            elevation: 0,
            baseTile: 'stone' as TileType,
          };
        }
      }

      const highLanding = map.tiles[gateY]?.[gateX - 1];
      if (highLanding?.type === 'grass') {
        map.tiles[gateY][gateX - 1] = {
          ...highLanding,
          walkable: true,
          elevation: 1,
          enemyBlocked: true,
        };
      }
      if (map.tiles[gateY]?.[gateX + 1]) {
        map.tiles[gateY][gateX + 1] = { type: 'cliff_edge' as TileType, walkable: false, elevation: 1 };
      }

      for (let ty = gateY - 1; ty > bottomY; ty--) {
        if (map.tiles[ty]?.[gateX - 1]) {
          map.tiles[ty][gateX - 1] = { type: 'cliff' as TileType, walkable: false, elevation: 0 };
        }
        if (map.tiles[ty]?.[gateX + 1]) {
          map.tiles[ty][gateX + 1] = { type: 'cliff' as TileType, walkable: false, elevation: 0 };
        }
      }

      if (map.tiles[bottomY]?.[gateX - 1]) {
        map.tiles[bottomY][gateX - 1] = { type: 'cliff' as TileType, walkable: false, elevation: 0 };
      }
      const eastLanding = map.tiles[bottomY]?.[gateX + 1];
      if (eastLanding) {
        map.tiles[bottomY][gateX + 1] = {
          type: 'grass' as TileType,
          walkable: true,
          elevation: 0,
          enemyBlocked: true,
        };
      }
    } else {
      // Sealed: coiled gate-ladder mounted on the new cliff edge. The cliff body to the east
      // is natural from authored cliff_face features and needs no explicit restoration on load.
      map.tiles[gateY][gateX] = {
        type: 'gate_ladder' as TileType,
        walkable: false,
        elevation: 1,
        baseTile: 'stone' as TileType,
        interactable: true,
        interactionId: 'cliff_corridor_ladder',
      };
      for (let ty = gateY - 1; ty >= bottomY; ty--) {
        if (map.tiles[ty]?.[gateX]) {
          map.tiles[ty][gateX] = { type: 'cliff' as TileType, walkable: false, elevation: 0 };
        }
      }
      const highLanding = map.tiles[gateY]?.[gateX - 1];
      if (highLanding?.type === 'grass') {
        map.tiles[gateY][gateX - 1] = {
          ...highLanding,
          walkable: true,
          elevation: 1,
          enemyBlocked: true,
        };
      }
      if (map.tiles[gateY]?.[gateX + 1]) {
        map.tiles[gateY][gateX + 1] = { type: 'cliff_edge' as TileType, walkable: false, elevation: 1 };
      }
      for (let ty = gateY - 1; ty > bottomY; ty--) {
        if (map.tiles[ty]?.[gateX - 1]) {
          map.tiles[ty][gateX - 1] = { type: 'cliff' as TileType, walkable: false, elevation: 0 };
        }
        if (map.tiles[ty]?.[gateX + 1]) {
          map.tiles[ty][gateX + 1] = { type: 'cliff' as TileType, walkable: false, elevation: 0 };
        }
      }
      if (map.tiles[bottomY]?.[gateX - 1]) {
        map.tiles[bottomY][gateX - 1] = { type: 'cliff' as TileType, walkable: false, elevation: 0 };
      }
      const eastLanding = map.tiles[bottomY]?.[gateX + 1];
      if (eastLanding) {
        map.tiles[bottomY][gateX + 1] = {
          type: 'grass' as TileType,
          walkable: true,
          elevation: 0,
          enemyBlocked: true,
        };
      }
    }
    world.rebuildChunks();
  };

  const syncOpenedChestState = () => {
    const map = world.getCurrentMap();
    let changed = false;
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    const grow = (tx: number, ty: number) => {
      minX = Math.min(minX, tx - 1);
      maxX = Math.max(maxX, tx + 1);
      minY = Math.min(minY, ty - 1);
      maxY = Math.max(maxY, ty + 1);
    };
    for (let y = 0; y < map.height; y++) {
      for (let x = 0; x < map.width; x++) {
        const tile = map.tiles[y][x];
        if (!tile.interactionId || !tile.interactionId.includes('chest')) continue;
        const opened = state.getFlag(`${tile.interactionId}_opened`);
        if (opened && isChestTileType(tile.type) && tile.type !== getOpenedChestTileType(tile.interactionId)) {
          map.tiles[y][x] = { ...tile, type: getOpenedChestTileType(tile.interactionId) };
          changed = true;
          grow(x, y);
        } else if (!opened && isChestTileType(tile.type) && tile.type !== getClosedChestTileType(tile.interactionId)) {
          map.tiles[y][x] = { ...tile, type: getClosedChestTileType(tile.interactionId) };
          changed = true;
          grow(x, y);
        }
      }
    }
    if (changed && Number.isFinite(minX)) {
      world.refreshMapTileRegion(minX, minY, maxX, maxY);
    }
  };

  const syncBlightedRootState = () => {
    if (state.currentMap !== 'forest') return;
    const map = world.getCurrentMap();
    const destroyed = state.getFlag('blighted_root_destroyed');
    for (let y = 0; y < map.height; y++) {
      for (let x = 0; x < map.width; x++) {
        const tile = map.tiles[y][x];
        if (tile.interactionId !== 'blighted_root') continue;
        const wantType: TileType = destroyed ? 'stump' : 'blighted_stump';
        if (tile.type !== wantType) {
          map.tiles[y][x] = { ...tile, type: wantType };
          world.refreshMapTileRegion(x - 1, y - 1, x + 1, y + 1);
        }
      }
    }
  };

  const syncHarvestedTempestGrassState = () => {
    const map = world.getCurrentMap();
    let changed = false;
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;

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
        minX = Math.min(minX, x - 1);
        maxX = Math.max(maxX, x + 1);
        minY = Math.min(minY, y - 1);
        maxY = Math.max(maxY, y + 1);
      }
    }

    if (changed && Number.isFinite(minX)) {
      world.refreshMapTileRegion(minX, minY, maxX, maxY);
    }
  };

  const syncHarvestedMoonbloomState = () => {
    const map = world.getCurrentMap();
    let changed = false;
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;

    for (let y = 0; y < map.height; y++) {
      for (let x = 0; x < map.width; x++) {
        const tile = map.tiles[y][x];
        if (tile.interactionId !== 'moonbloom_pickup') continue;
        if (tile.type !== 'moonbloom') continue;

        const worldX = x - map.width / 2;
        const worldY = y - map.height / 2;
        const picked = state.getFlag(`moonbloom_${state.currentMap}_${worldX}_${worldY}`);
        if (!picked) continue;

        const baseType = resolveHarvestedBaseTile(
          map,
          x,
          y,
          TILE_METADATA.moonbloom?.baseTile ?? 'grass'
        );

        map.tiles[y][x] = {
          type: baseType,
          walkable: WALKABLE_BASE_TILES.has(baseType),
          elevation: tile.elevation ?? 0,
        };
        changed = true;
        minX = Math.min(minX, x - 1);
        maxX = Math.max(maxX, x + 1);
        minY = Math.min(minY, y - 1);
        maxY = Math.max(maxY, y + 1);
      }
    }

    if (changed && Number.isFinite(minX)) {
      world.refreshMapTileRegion(minX, minY, maxX, maxY);
    }
  };

  const syncVillageReactivityState = () => {
    if (state.currentMap !== 'village') return;

    const map = world.getCurrentMap();
    const villageStage = getVillageReactivityStage(state);
    let changed = false;

    if (villageStage === 'after_manuscript' || villageStage === 'after_reaver') {
      changed = applyReactiveTiles(map, VILLAGE_MANUSCRIPT_REACTIVITY_TILES) || changed;
    }

    if (villageStage === 'after_reaver') {
      changed = applyReactiveTiles(map, VILLAGE_REAVER_REACTIVITY_TILES) || changed;
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
      if (villageStage === 'after_manuscript' || villageStage === 'after_reaver') {
        changed = applyReactiveTiles(map, INTERIOR_BLACKSMITH_MANUSCRIPT_TILES) || changed;
      }
      if (villageStage === 'after_reaver') {
        changed = applyReactiveTiles(map, INTERIOR_BLACKSMITH_REAVER_TILES) || changed;
      }
    }

    if (state.currentMap === 'interior_merchant') {
      if (villageStage === 'after_manuscript' || villageStage === 'after_reaver') {
        changed = applyReactiveTiles(map, INTERIOR_MERCHANT_MANUSCRIPT_TILES) || changed;
      }
      if (villageStage === 'after_reaver') {
        changed = applyReactiveTiles(map, INTERIOR_MERCHANT_REAVER_TILES) || changed;
      }
    }

    if (state.currentMap === 'interior_inn') {
      if (villageStage === 'after_manuscript' || villageStage === 'after_reaver') {
        changed = applyReactiveTiles(map, INTERIOR_INN_MANUSCRIPT_TILES) || changed;
      }
      if (villageStage === 'after_reaver') {
        changed = applyReactiveTiles(map, INTERIOR_INN_REAVER_TILES) || changed;
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
    const FORT_X = 222, FORT_Y = 153, FORT_W = 16, FORT_H = 20;
    const GATE_CX = FORT_X + Math.floor(FORT_W / 2); // 230
    const SOUTH_Y = FORT_Y + FORT_H - 1; // 172
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
        const tx = FORT_X + dx;
        const ty = FORT_Y + dy;
        const row = map.tiles[ty];
        if (!row) continue;
        const el = row[tx]?.elevation ?? 0;

        if (!isOuter && !isSecond && !isThird && !inCornerTower(dx, dy)) {
          const existing = row[tx];
          if (!existing?.interactable) {
            row[tx] = { type: 'cobblestone' as TileType, walkable: true, elevation: el };
          }
          continue;
        }

        // 3-wide gate on the south wall
        if (ty === SOUTH_Y && tx >= GATE_CX - 1 && tx <= GATE_CX + 1) {
          row[tx] = gateOpen
            ? { type: 'cobblestone' as TileType, walkable: true, elevation: el }
            : { type: 'gate' as TileType, walkable: false, elevation: el, interactable: true, interactionId: 'forest_fort_gate' };
          continue;
        }

        // North wall passage — owned by syncManuscriptCheckpointGateState, skip here.
        if (ty === FORT_Y && tx >= GATE_CX - 1 && tx <= GATE_CX + 1) {
          continue;
        }

        // North exit approach (row inside north wall, dy=1): lanterns + cobblestone mirror the south gate
        if (dy === 1 && dx >= GATE_CX - FORT_X - 2 && dx <= GATE_CX - FORT_X + 2) {
          if (dx === GATE_CX - FORT_X - 2 || dx === GATE_CX - FORT_X + 2) {
            row[tx] = { type: 'lantern' as TileType, walkable: false, elevation: el };
          } else {
            row[tx] = { type: 'cobblestone' as TileType, walkable: true, elevation: el };
          }
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

        // Third ring at gate passage — open when gate is open so no iron bar blocks the walkway
        if (isThird && !isOuter && !isSecond && gateOpen && dy === FORT_H - 3 && tx >= GATE_CX - 1 && tx <= GATE_CX + 1) {
          row[tx] = { type: 'cobblestone' as TileType, walkable: true, elevation: el };
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

    // Exterior gatehouse frame (row south of fort) — open style matches north exit when key used
    const frameY = FORT_Y + FORT_H;
    if (frameY < map.tiles.length) {
      const frameRow = map.tiles[frameY];
      if (frameRow) {
        const el = frameRow[GATE_CX]?.elevation ?? 0;
        if (gateOpen) {
          for (let nx = GATE_CX - 2; nx <= GATE_CX + 2; nx++) {
            if (nx < 0 || nx >= frameRow.length) continue;
            frameRow[nx] = nx === GATE_CX - 2 || nx === GATE_CX + 2
              ? { type: 'lantern' as TileType, walkable: false, elevation: el }
              : { type: 'cobblestone' as TileType, walkable: true, elevation: el };
          }
        } else {
          const pillarL = GATE_CX - 2, pillarR = GATE_CX + 2;
          const torchL = GATE_CX - 1, torchR = GATE_CX + 1;
          if (pillarL >= 0) frameRow[pillarL] = { type: 'stone' as TileType, walkable: false, elevation: el };
          if (pillarR < frameRow.length) frameRow[pillarR] = { type: 'stone' as TileType, walkable: false, elevation: el };
          if (torchL >= 0) frameRow[torchL] = { type: 'lantern' as TileType, walkable: false, elevation: el };
          if (torchR < frameRow.length) frameRow[torchR] = { type: 'lantern' as TileType, walkable: false, elevation: el };
        }
      }
    }

    // Exterior north exit frame (row north of fort) - cobblestone runway so exit is obvious
    const northFrameY = FORT_Y - 1;
    if (northFrameY >= 0 && northFrameY < map.tiles.length) {
      const nRow = map.tiles[northFrameY];
      if (nRow) {
        const el = nRow[GATE_CX]?.elevation ?? 0;
        for (let nx = GATE_CX - 2; nx <= GATE_CX + 2; nx++) {
          if (nx >= 0 && nx < nRow.length) {
            if (nx === GATE_CX - 2 || nx === GATE_CX + 2) {
              nRow[nx] = { type: 'lantern' as TileType, walkable: false, elevation: el };
            } else {
              nRow[nx] = { type: 'cobblestone' as TileType, walkable: true, elevation: el };
            }
          }
        }
      }
    }

    world.rebuildChunks();
  };

  const syncNorthFortGateState = () => {
    if (state.currentMap !== 'forest') return;
    const map = world.getCurrentMap();
    const gateOpen = state.getFlag('north_fort_gate_open');
    const FORT_X = 200, FORT_Y = 60, FORT_W = 18, FORT_H = 16;
    const GATE_CX = FORT_X + Math.floor(FORT_W / 2); // 209
    const SOUTH_Y = FORT_Y + FORT_H - 1; // 75
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

        if (ty === SOUTH_Y && tx >= GATE_CX - 1 && tx <= GATE_CX + 1) {
          row[tx] = gateOpen
            ? { type: 'cobblestone' as TileType, walkable: true, elevation: el }
            : { type: 'gate' as TileType, walkable: false, elevation: el, interactable: true, interactionId: 'north_fort_gate' };
          continue;
        }

        if (ty === FORT_Y && tx >= GATE_CX - 1 && tx <= GATE_CX + 1) {
          row[tx] = { type: 'cobblestone' as TileType, walkable: true, elevation: el };
          continue;
        }

        if (dy === 1 && dx >= GATE_CX - FORT_X - 2 && dx <= GATE_CX - FORT_X + 2) {
          if (dx === GATE_CX - FORT_X - 2 || dx === GATE_CX - FORT_X + 2) {
            row[tx] = { type: 'lantern' as TileType, walkable: false, elevation: el };
          } else {
            row[tx] = { type: 'cobblestone' as TileType, walkable: true, elevation: el };
          }
          continue;
        }

        if (dy === FORT_H - 2 && dx >= GATE_CX - FORT_X - 2 && dx <= GATE_CX - FORT_X + 2) {
          if (dx === GATE_CX - FORT_X - 2 || dx === GATE_CX - FORT_X + 2) {
            row[tx] = { type: 'lantern' as TileType, walkable: false, elevation: el };
          } else {
            row[tx] = { type: 'cobblestone' as TileType, walkable: true, elevation: el };
          }
          continue;
        }

        if (inCornerTower(dx, dy)) {
          row[tx] = towerCenter(dx, dy)
            ? { type: 'lantern' as TileType, walkable: false, elevation: el }
            : { type: 'stone' as TileType, walkable: false, elevation: el };
          continue;
        }

        // Third ring at gate passage — clear to cobblestone when open
        if (isThird && !isOuter && !isSecond && gateOpen && dy === FORT_H - 3 && tx >= GATE_CX - 1 && tx <= GATE_CX + 1) {
          row[tx] = { type: 'cobblestone' as TileType, walkable: true, elevation: el };
          continue;
        }

        if (isThird && !isOuter && !isSecond) {
          row[tx] = (dx + dy) % 3 === 0
            ? { type: 'iron_fence' as TileType, walkable: false, elevation: el }
            : { type: 'cobblestone' as TileType, walkable: true, elevation: el };
          continue;
        }

        row[tx] = { type: 'stone' as TileType, walkable: false, elevation: el };
      }
    }

    const frameY = FORT_Y + FORT_H;
    if (frameY < map.tiles.length) {
      const frameRow = map.tiles[frameY];
      if (frameRow) {
        const el = frameRow[GATE_CX]?.elevation ?? 0;
        if (gateOpen) {
          for (let nx = GATE_CX - 2; nx <= GATE_CX + 2; nx++) {
            if (nx < 0 || nx >= frameRow.length) continue;
            frameRow[nx] = nx === GATE_CX - 2 || nx === GATE_CX + 2
              ? { type: 'lantern' as TileType, walkable: false, elevation: el }
              : { type: 'cobblestone' as TileType, walkable: true, elevation: el };
          }
        } else {
          const pillarL = GATE_CX - 2, pillarR = GATE_CX + 2;
          const torchL = GATE_CX - 1, torchR = GATE_CX + 1;
          if (pillarL >= 0) frameRow[pillarL] = { type: 'stone' as TileType, walkable: false, elevation: el };
          if (pillarR < frameRow.length) frameRow[pillarR] = { type: 'stone' as TileType, walkable: false, elevation: el };
          if (torchL >= 0) frameRow[torchL] = { type: 'lantern' as TileType, walkable: false, elevation: el };
          if (torchR < frameRow.length) frameRow[torchR] = { type: 'lantern' as TileType, walkable: false, elevation: el };
        }
      }
    }

    const northFrameY = FORT_Y - 1;
    if (northFrameY >= 0 && northFrameY < map.tiles.length) {
      const nRow = map.tiles[northFrameY];
      if (nRow) {
        const el = nRow[GATE_CX]?.elevation ?? 0;
        for (let nx = GATE_CX - 2; nx <= GATE_CX + 2; nx++) {
          if (nx >= 0 && nx < nRow.length) {
            if (nx === GATE_CX - 2 || nx === GATE_CX + 2) {
              nRow[nx] = { type: 'lantern' as TileType, walkable: false, elevation: el };
            } else {
              nRow[nx] = { type: 'cobblestone' as TileType, walkable: true, elevation: el };
            }
          }
        }
      }
    }

    world.rebuildChunks();
  };

  // Shared builder for the two optional dual-gated forts (western + northern/golem).
  // Differences from the required forts: both north AND south walls are gated (same key),
  // and every interior tile is explicitly written as cobblestone so no trees bleed in.
  const buildOptionalFort = (
    flagKey: string,
    interactionId: string,
    FORT_X: number, FORT_Y: number, FORT_W: number, FORT_H: number,
  ) => {
    const map = world.getCurrentMap();
    const gateOpen = state.getFlag(flagKey);
    const GATE_CX = FORT_X + Math.floor(FORT_W / 2);
    const SOUTH_Y = FORT_Y + FORT_H - 1;
    const TOWER_R = 3;
    const GDX = GATE_CX - FORT_X; // gate column offset

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

    const applyExteriorFrame = (frameRow: typeof map.tiles[0], open: boolean) => {
      if (!frameRow) return;
      const el = frameRow[GATE_CX]?.elevation ?? 0;
      if (open) {
        for (let nx = GATE_CX - 2; nx <= GATE_CX + 2; nx++) {
          if (nx < 0 || nx >= frameRow.length) continue;
          frameRow[nx] = nx === GATE_CX - 2 || nx === GATE_CX + 2
            ? { type: 'lantern' as TileType, walkable: false, elevation: el }
            : { type: 'cobblestone' as TileType, walkable: true, elevation: el };
        }
      } else {
        for (const nx of [GATE_CX - 2, GATE_CX + 2]) {
          if (nx >= 0 && nx < frameRow.length) frameRow[nx] = { type: 'stone' as TileType, walkable: false, elevation: el };
        }
        for (const nx of [GATE_CX - 1, GATE_CX + 1]) {
          if (nx >= 0 && nx < frameRow.length) frameRow[nx] = { type: 'lantern' as TileType, walkable: false, elevation: el };
        }
      }
    };

    for (let dy = 0; dy < FORT_H; dy++) {
      for (let dx = 0; dx < FORT_W; dx++) {
        const tx = FORT_X + dx;
        const ty = FORT_Y + dy;
        if (tx < 0 || tx >= map.width || ty < 0 || ty >= map.height) continue;
        const row = map.tiles[ty];
        if (!row) continue;
        const el = row[tx]?.elevation ?? 0;

        const isOuter  = dx === 0 || dx === FORT_W - 1 || dy === 0 || dy === FORT_H - 1;
        const isSecond = dx === 1 || dx === FORT_W - 2 || dy === 1 || dy === FORT_H - 2;
        const isThird  = dx === 2 || dx === FORT_W - 3 || dy === 2 || dy === FORT_H - 3;
        const inTower  = inCornerTower(dx, dy);

        // ── Gate tiles on BOTH walls ──────────────────────────────────────────
        const nearGate = tx >= GATE_CX - 1 && tx <= GATE_CX + 1;
        if (isOuter && nearGate && (ty === FORT_Y || ty === SOUTH_Y)) {
          row[tx] = gateOpen
            ? { type: 'cobblestone' as TileType, walkable: true, elevation: el }
            : { type: 'gate' as TileType, walkable: false, elevation: el, interactable: true, interactionId };
          continue;
        }

        // ── Corner towers ─────────────────────────────────────────────────────
        if (inTower) {
          row[tx] = towerCenter(dx, dy)
            ? { type: 'lantern' as TileType, walkable: false, elevation: el }
            : { type: 'stone' as TileType, walkable: false, elevation: el };
          continue;
        }

        // ── Outer & second rings → stone wall (gate passage cleared when open) ──
        if (isOuter || isSecond) {
          const isSecondGatePassage = isSecond && nearGate && (dy === 1 || dy === FORT_H - 2);
          if (isSecondGatePassage && gateOpen) {
            row[tx] = { type: 'cobblestone' as TileType, walkable: true, elevation: el };
          } else {
            row[tx] = { type: 'stone' as TileType, walkable: false, elevation: el };
          }
          continue;
        }

        // ── Third ring: iron-fence pattern, gate passage clears when open ─────
        if (isThird) {
          const isNorthPassage = dy === 2    && nearGate;
          const isSouthPassage = dy === FORT_H - 3 && nearGate;
          if ((isNorthPassage || isSouthPassage) && gateOpen) {
            row[tx] = { type: 'cobblestone' as TileType, walkable: true, elevation: el };
          } else if (isNorthPassage || isSouthPassage) {
            row[tx] = { type: 'stone' as TileType, walkable: false, elevation: el };
          } else {
            row[tx] = (dx + dy) % 3 === 0
              ? { type: 'iron_fence' as TileType, walkable: false, elevation: el }
              : { type: 'cobblestone' as TileType, walkable: true, elevation: el };
          }
          continue;
        }

        // ── Interior — always cobblestone (overwrites trees/grass from map) ────
        row[tx] = { type: 'cobblestone' as TileType, walkable: true, elevation: el };
      }
    }

    // Exterior frames — both sides show pillar+lantern when locked, lantern+cobblestone when open
    const southFrameRow = map.tiles[FORT_Y + FORT_H];
    applyExteriorFrame(southFrameRow, gateOpen);
    const northFrameRow = map.tiles[FORT_Y - 1];
    applyExteriorFrame(northFrameRow, gateOpen);

    world.rebuildChunks();
  };

  const syncWestFortGateState = () => {
    if (state.currentMap !== 'forest') return;
    // Western fort — moved +10 y from original placement, fully sealed (dual gates)
    buildOptionalFort('west_fort_gate_open', 'west_fort_gate', 12, 141, 14, 14);
  };

  const syncGolemFortGateState = () => {
    if (state.currentMap !== 'forest') return;
    // Northern (golem) fort — fully sealed (dual gates)
    buildOptionalFort('golem_fort_gate_open', 'golem_fort_gate', 80, 242, 14, 14);
  };

  const syncManuscriptCheckpointGateState = () => {
    if (state.currentMap !== 'forest') return;
    const map = world.getCurrentMap();
    const gateOpen = state.getFlag('manuscript_checkpoint_gate_open');
    const gateY = 153;
    const gateCenterX = 230; // aligned with forest fort GATE_CX
    const gateRow = map.tiles[gateY];
    if (!gateRow) return;

    for (let tx = gateCenterX - 3; tx <= gateCenterX + 3; tx++) {
      if (tx < 0 || tx >= gateRow.length) continue;
      const el = gateRow[tx]?.elevation ?? 0;
      if (tx === gateCenterX - 3 || tx === gateCenterX + 3) {
        gateRow[tx] = { type: 'stone' as TileType, walkable: false, elevation: el };
      } else {
        gateRow[tx] = gateOpen
          ? { type: 'cobblestone' as TileType, walkable: true, elevation: el }
          : { type: 'gate' as TileType, walkable: false, elevation: el, interactable: true, interactionId: 'manuscript_checkpoint_gate' };
      }
    }

    world.rebuildChunks();
  };

  const HOLLOW_VICTORY_PORTAL_TARGET = { targetMap: 'gilrhym', targetX: 150, targetY: 285 } as const;

  const syncHollowFogGateState = () => {
    if (state.currentMap !== 'forest') return;
    const map = world.getCurrentMap();
    const defeated = state.getFlag('hollow_guardian_defeated');
    const GATE_Y = 18;
    const GATE_CX = 122;
    // Portal tile lives in the hollow camp, just south of the old chest (world y--127).
    const CAMP_PORTAL_X = 122;
    const CAMP_PORTAL_Y = 23;

    // Gate tiles - open to bleached hollow ground when defeated, fog_gate when not.
    for (let dx = -2; dx <= 2; dx++) {
      const tx = GATE_CX + dx;
      const row = map.tiles[GATE_Y];
      if (!row) continue;
      const el = row[tx]?.elevation ?? 0;
      if (defeated) {
        row[tx] = { type: 'hollow_blight' as TileType, walkable: true, elevation: el };
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

    // Victory portal - placed in the hollow camp after boss defeat.
    const campRow = map.tiles[CAMP_PORTAL_Y];
    if (campRow) {
      const el = campRow[CAMP_PORTAL_X]?.elevation ?? 0;
      if (defeated) {
        campRow[CAMP_PORTAL_X] = {
          type: 'portal' as TileType,
          walkable: true,
          elevation: el,
          transition: { ...HOLLOW_VICTORY_PORTAL_TARGET },
        };
      } else {
        campRow[CAMP_PORTAL_X] = { type: 'hollow_blight' as TileType, walkable: true, elevation: el };
      }
    }

    world.rebuildChunks();
  };

  const syncHollowArenaVictoryPortalState = () => {
    if (state.currentMap !== 'interior_hollow_arena') return;
    const map = world.getCurrentMap();
    const portalX = 18;
    const portalY = 18;
    const victoryChests = [
      { x: 5, y: 5, interactionId: 'hollow_arena_chest_nw' },
      { x: 30, y: 5, interactionId: 'hollow_arena_chest_ne' },
      { x: 5, y: 30, interactionId: 'hollow_arena_chest_sw' },
    ];
    const row = map.tiles[portalY];
    if (!row) return;
    const el = row[portalX]?.elevation ?? 0;
    if (state.getFlag('hollow_guardian_defeated')) {
      row[portalX] = {
        type: 'portal' as TileType,
        walkable: true,
        elevation: el,
        transition: { ...HOLLOW_VICTORY_PORTAL_TARGET },
      };
      const bonfireY = 28;
      const bonfireRow = map.tiles[bonfireY];
      if (bonfireRow) {
        const bel = bonfireRow[portalX]?.elevation ?? 0;
        bonfireRow[portalX] = {
          type: 'bonfire_unlit' as TileType,
          walkable: true,
          elevation: bel,
          interactable: true,
          interactionId: 'hollow_arena_bonfire',
        };
      }
      for (const chest of victoryChests) {
        const chestRow = map.tiles[chest.y];
        if (!chestRow) continue;
        const chestEl = chestRow[chest.x]?.elevation ?? 0;
        chestRow[chest.x] = {
          type: 'chest' as TileType,
          walkable: true,
          elevation: chestEl,
          interactable: true,
          interactionId: chest.interactionId,
        };
      }
    } else {
      row[portalX] = { type: 'ruins_floor' as TileType, walkable: true, elevation: el };
      for (const chest of victoryChests) {
        const chestRow = map.tiles[chest.y];
        if (!chestRow) continue;
        const chestEl = chestRow[chest.x]?.elevation ?? 0;
        chestRow[chest.x] = { type: 'dark_grass' as TileType, walkable: true, elevation: chestEl };
      }
    }
    world.rebuildChunks();
  };

  const syncBonfireKindledState = () => {
    const map = world.getCurrentMap();
    for (let y = 0; y < map.height; y++) {
      const row = map.tiles[y];
      if (!row) continue;
      for (let x = 0; x < row.length; x++) {
        const tile = row[x];
        if (!tile) continue;
        if (tile.type === 'bonfire_unlit' as TileType) {
          const firstKey = `bonfire_first_${state.currentMap}_${x}_${y}`;
          if (state.getFlag(firstKey)) {
            tile.type = 'bonfire' as TileType;
          }
        }
      }
    }
  };

  const syncPreplacedWorldItems = () => {
    const PREPLACED: Array<{ itemId: string; collectedFlag: string; mapId: string; x: number; y: number }> = [
      { itemId: 'manuscript_fragment', collectedFlag: 'manuscript_fragment_collected', mapId: 'interior_hunter_cottage', x: 0.5, y: -0.5 },
      { itemId: 'hunters_manuscript', collectedFlag: 'hunters_manuscript_collected', mapId: 'forest', x: 63, y: -80 },
    ];
    for (const entry of PREPLACED) {
      if (state.getFlag(entry.collectedFlag)) continue;
      if (state.worldItems.some(wi => wi.itemId === entry.itemId && wi.mapId === entry.mapId)) continue;
      state.worldItems.push({
        instanceId: `preplaced_${entry.itemId}_${entry.mapId}`,
        itemId: entry.itemId,
        mapId: entry.mapId,
        x: entry.x,
        y: entry.y,
      });
    }
  };

  const syncGilrhymBossState = () => {
    if (state.currentMap !== 'gilrhym') return;
    const map = world.getCurrentMap();
    const defeated = state.getFlag('ashen_reaver_defeated');

    const GATE_Y = 55;
    const GATE_CX = 150;
    for (let dx = -3; dx <= 3; dx++) {
      const tx = GATE_CX + dx;
      const row = map.tiles[GATE_Y];
      if (!row) continue;
      const el = row[tx]?.elevation ?? 0;
      if (defeated) {
        row[tx] = { type: 'cobblestone' as TileType, walkable: true, elevation: el };
      } else {
        row[tx] = {
          type: 'fog_gate' as TileType,
          walkable: false,
          elevation: el,
          interactable: true,
          interactionId: 'gilrhym_fog_gate',
        };
      }
    }

    const PORTAL_Y = 15;
    const PORTAL_X = 150;
    const portalRow = map.tiles[PORTAL_Y];
    if (portalRow) {
      const el = portalRow[PORTAL_X]?.elevation ?? 0;
      if (defeated) {
        portalRow[PORTAL_X] = {
          type: 'portal' as TileType,
          walkable: true,
          elevation: el,
          transition: { targetMap: 'village', targetX: 120, targetY: 115 },
        };
      } else {
        portalRow[PORTAL_X] = { type: 'cobblestone' as TileType, walkable: true, elevation: el };
      }
    }

    world.rebuildChunks();
  };

  const syncPersistentMapState = () => {
    syncWhisperingWoodsShortcutState();
    syncGroveShelfShortcutState();
    syncRiversideBridgeShortcutState();
    syncHollowShortcutState();
    syncHollowCorridorGateState();
    syncHollowApproachOverlookShelfState();
    syncHollowApproachSpineGateState();
    syncForestFortGateState();
    syncNorthFortGateState();
    syncWestFortGateState();
    syncGolemFortGateState();
    syncManuscriptCheckpointGateState();
    syncHollowFogGateState();
    syncHollowArenaVictoryPortalState();
    syncGilrhymBossState();
    syncVillageReactivityState();
    syncVillageInteriorReactivityState();
    syncOpenedChestState();
    syncBlightedRootState();
    syncHarvestedTempestGrassState();
    syncHarvestedMoonbloomState();
    syncBonfireKindledState();
    syncPreplacedWorldItems();
    syncHollowApproachLadderState();
    syncCliffCorridorLadderState();
    syncHeresyAltarsForMap(state, world.getCurrentMap(), state.currentMap);
  };

  const respawnEnemiesForCurrentMap = (targetMap: string, map: WorldMap) => {
    combatSystem.clearAllEnemies();
    enemyVisuals.disposeAll();
    assetManager.warmupEnemyTexturesForZones(mapDefinitions[targetMap]?.enemyZones);
    spawnEnemiesFromMapZones(targetMap, map, combatSystem, world);

    if (targetMap === 'forest') {
      const spawnBattleEnemy = (
        enemyKey: keyof typeof ENEMY_BLUEPRINTS,
        position: { x: number; y: number },
        faction: string,
      ) => {
        const bp = ENEMY_BLUEPRINTS[enemyKey];
        if (!bp) return;
        combatSystem.spawnEnemy(bp.name, position, bp.hp, bp.damage, bp.sprite, {
          speed: bp.speed,
          attackRange: bp.attackRange,
          chaseRange: bp.chaseRange,
          essenceReward: bp.essenceReward,
          telegraphDuration: bp.telegraphDuration,
          recoverDuration: bp.recoverDuration,
          poise: bp.poise,
          staggerDuration: bp.staggerDuration,
          behaviorOverrides: bp.behaviorOverrides,
          faction,
        });
      };

      // Fixed faction skirmish on the river road - shifted west to avoid accidental triggering.
      // Undead side - 3 regular skeletons + 1 captain
      spawnBattleEnemy('skeleton', { x: 50.5, y: -0.6 }, 'undead');
      spawnBattleEnemy('skeleton', { x: 51.8, y: 0.4 }, 'undead');
      spawnBattleEnemy('skeleton', { x: 49.5, y: 0.8 }, 'undead');
      spawnBattleEnemy('skeleton_captain', { x: 51.0, y: 0.0 }, 'undead');
      // Beast side - 2 armored wolves
      spawnBattleEnemy('armored_wolf', { x: 57.2, y: -0.3 }, 'beast');
      spawnBattleEnemy('armored_wolf', { x: 58.1, y: 0.7 }, 'beast');

      // Observatory compound faction skirmish - SE of North Fort, offset from sentinels/golem.
      // Undead side - 2 skeletons + 1 captain
      spawnBattleEnemy('skeleton', { x: 76.5, y: -57.4 }, 'undead');
      spawnBattleEnemy('skeleton', { x: 77.8, y: -56.6 }, 'undead');
      spawnBattleEnemy('skeleton_captain', { x: 77.0, y: -57.0 }, 'undead');
      // Beast side - 2 armored wolves
      spawnBattleEnemy('armored_wolf', { x: 80.2, y: -57.3 }, 'beast');
      spawnBattleEnemy('armored_wolf', { x: 81.0, y: -56.5 }, 'beast');
    }

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
          behaviorOverrides: bp.behaviorOverrides,
        });
      }

      // Four Hollow Reavers at the corners of the central arena area — they pelt the player
      // with thrown scythe-blades while the boss controls the center.
      const reaverBp = ENEMY_BLUEPRINTS.hollow_reaver;
      if (reaverBp) {
        const reaverCorners = [
          { x: -7, y: -7 }, // NW corner, inset from statue at tile (10,10)
          { x:  6, y: -7 }, // NE corner, inset from statue at tile (25,10)
          { x: -7, y:  6 }, // SW corner, inset from statue at tile (10,25)
          { x:  6, y:  6 }, // SE corner, inset from statue at tile (25,25)
        ];
        for (const corner of reaverCorners) {
          combatSystem.spawnEnemy(reaverBp.name, corner, reaverBp.hp, reaverBp.damage, reaverBp.sprite, {
            speed: reaverBp.speed,
            attackRange: reaverBp.attackRange,
            chaseRange: reaverBp.chaseRange,
            essenceReward: reaverBp.essenceReward,
            telegraphDuration: reaverBp.telegraphDuration,
            recoverDuration: reaverBp.recoverDuration,
            poise: reaverBp.poise,
            staggerDuration: reaverBp.staggerDuration,
            behaviorOverrides: reaverBp.behaviorOverrides,
          });
        }
      }
    }

    console.log(`[Spawn] Total enemies spawned: ${combatSystem.getEnemies().length}`);
  };

  const mapTransitionService: RuntimeMapTransitionServiceLike = createMapTransitionService({
    state,
    world,
    loadMap,
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
    syncWhisperingWoodsShortcutState,
    syncGroveShelfShortcutState,
    syncRiversideBridgeShortcutState,
    syncHollowShortcutState,
    syncHollowCorridorGateState,
    syncHollowApproachOverlookShelfState,
    syncHollowApproachSpineGateState,
    syncHollowApproachLadderState,
    syncCliffCorridorLadderState,
    syncForestFortGateState,
    syncNorthFortGateState,
    syncWestFortGateState,
    syncGolemFortGateState,
    syncManuscriptCheckpointGateState,
    syncHollowFogGateState,
    syncHollowArenaVictoryPortalState,
    syncGilrhymBossState,
    syncVillageReactivityState,
    syncVillageInteriorReactivityState,
    syncOpenedChestState,
    syncBlightedRootState,
    syncHarvestedTempestGrassState,
    syncHarvestedMoonbloomState,
    syncPersistentMapState,
    handleMapTransition,
    handlePortalTransition,
    respawnEnemiesForCurrentMap,
  };
}
