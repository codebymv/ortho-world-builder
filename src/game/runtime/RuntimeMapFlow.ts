import type { GameState } from '@/lib/game/GameState';
import type { CombatSystem } from '@/lib/game/Combat';
import type { Tile, World, WorldMap, TileType } from '@/lib/game/World';
import { createMapTransitionService } from '@/game/domain/MapTransitionService';
import { getVillageReactivityStage } from '@/game/domain/VillageReactivity';
import { mapDefinitions } from '@/data/maps';
import { TILE_METADATA } from '@/data/tiles';
import { getClosedChestTileType, getOpenedChestTileType, isChestTileType } from '@/data/specialChests';
import { evictEnemiesFromBonfireSafeZones } from '@/game/runtime/bonfireCombatGuard';
import { spawnEnemiesFromMapZones } from '@/game/runtime/RuntimeWorldUtils';
import { ENEMY_BLUEPRINTS } from '@/data/enemies';
import { syncHeresyAltarsForMap } from '@/game/runtime/HeresyAltars';
import {
  applyRevenantRitualDecor,
  ensureForestDudRitualSites,
  isRitualDecorTileType,
} from '@/game/runtime/revenantRitualDecor';
import { syncWestFortBonfireLogs } from '@/game/runtime/westFortBonfires';

function closedKeyGateTile(el: number, interactionId: string, tx: number, centerTx: number): Tile {
  return {
    type: 'gate' as TileType,
    walkable: false,
    elevation: el,
    interactable: true,
    interactionId,
    ...(tx === centerTx ? { keyGateLock: true } : {}),
  };
}

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
    world.refreshMapTileRegion(120, 198, 137, 203);
  };

  const syncGroveShelfShortcutState = () => {
    if (state.currentMap !== 'forest') return;
    const map = world.getCurrentMap();
    const shortcutOpen = state.getFlag('grove_shelf_shortcut_open');
    for (let x = 56; x <= 60; x++) {
      const existing = map.tiles[163]?.[x];
      if (!existing) continue;
      map.tiles[163][x] = shortcutOpen
        ? { type: 'dirt', walkable: true, elevation: existing.elevation ?? 0, spinePath: true }
        : { type: 'iron_fence', walkable: false, elevation: existing.elevation ?? 0 };
    }
    world.refreshMapTileRegion(55, 162, 61, 164);
  };

  // West cliff fence gate - a 2-tile opening at x:87, y:58-59 (world ~-63, -91/-92) inside the
  // vertical iron-fence wall. The player travels E-W through it.
  //
  // Closed: a `gate` tile (distinct gate texture so it reads as openable, unlike the plain
  //   iron_fence picket on either side) AND interactable as 'west_cliff_gate_sealed'. Interaction
  //   is proximity-based and picks the nearest interactable, so:
  //     • From the EAST (approach) the nearest interactable is this gate tile → "doesn't open
  //       from this side" feedback.
  //     • From the WEST (far/shortcut side) the adjacent lever at (86,58) is nearer → opens it.
  // Open: walkable dirt, no interaction.
  const syncQuarryBankShortcutState = () => {
    if (state.currentMap !== 'forest') return;
    const map = world.getCurrentMap();
    const shortcutOpen = state.getFlag('quarry_bank_shortcut_open');
    for (let ty = 221; ty <= 224; ty++) {
      const existing = map.tiles[ty]?.[205];
      if (!existing) continue;
      map.tiles[ty][205] = shortcutOpen
        ? { type: 'dirt' as TileType, walkable: true, elevation: existing.elevation ?? 0, spinePath: true }
        : {
            type: 'gate' as TileType,
            walkable: false,
            elevation: existing.elevation ?? 0,
            interactable: true,
            interactionId: 'quarry_bank_gate_sealed',
          };
    }
    world.refreshMapTileRegion(204, 218, 206, 225);
  };

  /**
   * Broken west lake bridge plank shortcut (world ~45,110 → ~32,109). Closed: gap stays open water
   * with a loose_plank tease tile at the east gap edge (south row). Open: a single-tile rickety bridge span
   * across the gap — slow for the player, enemy-blocked so wolves cannot follow.
   *
   * Gap is x:190–192 (3 tiles) after both stubs were extended.
   * West stub now ends at x:189; east stub starts at x:193.
   * Tease plank is at (192,260) — south row, directly adjacent to the plank_pile prop at (193,260).
   * When extended the span runs straight across at y:260: (192,260)→(191,260)→(190,260),
   * connecting east stub at (193,260) to west stub at (189,260) in a single horizontal line.
   */
  const WEST_LAKE_PLANK_SPAN = [
    { x: 192, y: 260 },
    { x: 191, y: 260 },
    { x: 190, y: 260 },
  ] as const;

  // Single tease plank at the south-row gap edge, beside the plank_pile prop.
  // Carries interactionId so pressing E on the plank itself triggers the crossing.
  const WEST_LAKE_PLANK_TEASE = new Set(['192,260']);

  const syncWestLakeBridgePlankState = () => {
    if (state.currentMap !== 'forest') return;
    const map = world.getCurrentMap();
    const extended = state.getFlag('west_lake_bridge_plank_extended');
    for (const { x, y } of WEST_LAKE_PLANK_SPAN) {
      const existing = map.tiles[y]?.[x];
      if (!existing) continue;
      const elevation = existing.elevation ?? 0;
      if (extended) {
        // Center tile: use plank_crossing overlay (same sprite as loose_plank, widthScale 4.8)
        // so it reads as one long plank spanning the full gap from a single tile.
        // Flanking tiles: plain walkable bridge so the player can step on them without visual clutter.
        const isCenterTile = x === 191 && y === 260;
        map.tiles[y][x] = isCenterTile
          ? {
              type: 'plank_crossing' as TileType,
              walkable: true,
              elevation,
              enemyBlocked: true,
              slowWalk: true,
            }
          : {
              type: 'bridge' as TileType,
              walkable: true,
              elevation,
              enemyBlocked: true,
              slowWalk: true,
            };
      } else if (existing.type !== 'bridge') {
        // Show cut-lumber tease props at the east-gap positions so the player can see
        // that someone started laying planks here; plain water everywhere else in the gap.
        map.tiles[y][x] = WEST_LAKE_PLANK_TEASE.has(`${x},${y}`)
          ? { type: 'loose_plank' as TileType, walkable: false, elevation, interactable: true, interactionId: 'west_lake_bridge_plank' }
          : { type: 'water' as TileType, walkable: false, elevation };
      }
    }
    world.refreshMapTileRegion(189, 257, 194, 261);
  };

  const syncWestCliffGateState = () => {
    if (state.currentMap !== 'forest') return;
    const map = world.getCurrentMap();
    const open = state.getFlag('west_cliff_gate_open');
    for (let ty = 58; ty <= 59; ty++) {
      const existing = map.tiles[ty]?.[87];
      if (!existing) continue;
      map.tiles[ty][87] = open
        ? { type: 'dirt' as TileType, walkable: true, elevation: existing.elevation ?? 0 }
        : {
            type: 'gate' as TileType,
            walkable: false,
            elevation: existing.elevation ?? 0,
            interactable: true,
            interactionId: 'west_cliff_gate_sealed',
          };
    }
    world.refreshMapTileRegion(86, 57, 88, 60);
  };

  // Highlander's Plains picket gate — east creek north-shore fence at y=237 (world ~81..144, y=87).
  // Closed: five-tile gate panel centered on world (101,87). Opens with Highlander's Key from Olwen's grotto.
  // South-entry west-bank picket gate — vertical fence at x=128 (world x=-22). Three-tile gate
  // panel at world (-22, 112–114) / tiles (128, 262–264); lever stays west at (-25, 117).
  const syncSouthEntryPicketGateState = () => {
    if (state.currentMap !== 'forest') return;
    const map = world.getCurrentMap();
    const open = state.getFlag('south_entry_picket_gate_open');
    const gateX = 128;
    const gateY0 = 262;
    const gateY1 = 264;
    for (let gateY = gateY0; gateY <= gateY1; gateY++) {
      const existing = map.tiles[gateY]?.[gateX];
      if (!existing) continue;
      map.tiles[gateY][gateX] = open
        ? { type: 'grass' as TileType, walkable: true, elevation: existing.elevation ?? 0 }
        : {
            type: 'gate' as TileType,
            walkable: false,
            elevation: existing.elevation ?? 0,
            interactable: true,
            interactionId: 'south_entry_picket_gate_sealed',
          };
    }
    world.refreshMapTileRegion(gateX - 1, gateY0 - 1, gateX + 1, gateY1 + 1);
  };

  const syncEastCreekShoreGateState = () => {
    if (state.currentMap !== 'forest') return;
    const map = world.getCurrentMap();
    const open = state.getFlag('highlanders_plains_gate_open');
    const gateY = 237;
    const gateX0 = 249;
    const gateX1 = 253;
    const gateCenterX = 251;
    for (let tx = gateX0; tx <= gateX1; tx++) {
      const existing = map.tiles[gateY]?.[tx];
      if (!existing) continue;
      const el = existing.elevation ?? 0;
      map.tiles[gateY][tx] = open
        ? { type: 'grass' as TileType, walkable: true, elevation: el }
        : closedKeyGateTile(el, 'highlanders_plains_gate', tx, gateCenterX);
    }
    world.refreshMapTileRegion(gateX0 - 1, gateY - 1, gateX1 + 1, gateY + 1);
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
    world.refreshMapTileRegion(145, 154, 154, 162);
  };

  // Hollow corridor iron gate - horizontal picket row at x:116-129, y:50-51 (world ~-34..-21, -100).
  // Closed: iron_fence end caps with a five-tile gate panel centered in the row. Open: dirt spine.
  const applyIronFenceGateBand = (
    map: ReturnType<typeof world.getCurrentMap>,
    open: boolean,
    rowMinY: number,
    rowMaxY: number,
    gateMinX: number,
    gateMaxX: number,
    gatePanelMinX: number,
    gatePanelMaxX: number,
    sealedInteractionId: string,
  ) => {
    for (let ty = rowMinY; ty <= rowMaxY; ty++) {
      for (let tx = gateMinX; tx <= gateMaxX; tx++) {
        const existing = map.tiles[ty]?.[tx];
        if (!existing) continue;
        const el = existing.elevation ?? 1;
        if (open) {
          map.tiles[ty][tx] = {
            type: 'dirt' as TileType,
            walkable: true,
            elevation: el,
            spinePath: true,
          };
        } else if (tx >= gatePanelMinX && tx <= gatePanelMaxX) {
          map.tiles[ty][tx] = {
            type: 'gate' as TileType,
            walkable: false,
            elevation: el,
            interactable: true,
            interactionId: sealedInteractionId,
          };
        } else {
          map.tiles[ty][tx] = { type: 'iron_fence' as TileType, walkable: false, elevation: el };
        }
      }
    }
  };

  const syncHollowShortcutState = () => {
    if (state.currentMap !== 'forest') return;
    const map = world.getCurrentMap();
    const shortcutOpen = state.getFlag('hollow_shortcut_open');
    applyIronFenceGateBand(
      map,
      shortcutOpen,
      50,
      51,
      116,
      129,
      120,
      124,
      'hollow_gate_sealed',
    );
    if (shortcutOpen) {
      for (let ty = 49; ty <= 54; ty++) {
        for (let tx = 116; tx <= 130; tx++) {
          const existing = map.tiles[ty]?.[tx];
          if (!existing) continue;
          map.tiles[ty][tx] = {
            type: 'hollow_blight' as TileType,
            walkable: true,
            elevation: 1,
            spinePath: true,
          };
        }
      }
    }
    world.refreshMapTileRegion(115, 48, 130, 53);
  };

  // East hollow horizontal fence at y:57 (world ~76..101,-93). Gate band centered on world (89,-92).
  const syncEastHollowRouteGateState = () => {
    if (state.currentMap !== 'forest') return;
    const map = world.getCurrentMap();
    applyIronFenceGateBand(
      map,
      state.getFlag('east_hollow_route_gate_open'),
      57,
      57,
      233,
      246,
      237,
      241,
      'east_hollow_route_gate_sealed',
    );
    world.refreshMapTileRegion(232, 56, 247, 58);
  };

  const syncHollowCorridorGateState = () => syncHollowShortcutState();

  // Permanent iron fence blocking the dirt-spine entrance to the hollow-approach ridge
  // (world ~-4,-37 / tile x=145, y=112-113). Vertical picket at the grass/dirt boundary -
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
    world.refreshMapTileRegion(109, 110, 119, 113);
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
    world.refreshMapTileRegion(118, 111, 146, 114);
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
      // Top rung at the overlook edge (y=107, elevation 1) - step off onto the overlook.
      if (map.tiles[107]?.[gateX]) {
        map.tiles[107][gateX] = { type: 'ladder' as TileType, walkable: true, elevation: 1 };
      }
      // Overlook dismount tile (y=106) - ensure it is walkable as the step-off point.
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
    world.refreshMapTileRegion(118, 105, 120, 113);
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

    // Clean cliff block south-east of the corridor ladder overlook:
    // world x=118..122, y=-17..-13 => tile x=268..272, y=133..137.
    // This also scrubs older live sessions that still have stale ladder/grass here.
    for (let ty = 133; ty <= 137; ty++) {
      for (let tx = 268; tx <= 272; tx++) {
        if (map.tiles[ty]?.[tx]) {
          map.tiles[ty][tx] = { type: 'cliff' as TileType, walkable: false, elevation: 1 };
        }
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
    world.refreshMapTileRegion(267, 127, 273, 138);
  };

  const syncFortRidgeLadderState = () => {
    if (state.currentMap !== 'forest') return;
    const map = world.getCurrentMap();
    const extended = state.getFlag('fort_ridge_ladder_extended');
    // Mirror of cliff-corridor ladder (268,132): gate on el1 shelf at (239,172 / world 89,22),
    // drops screen-DOWN (north) to fort landing west at (238,170 / world 88,20).
    const gateX = 239;
    const gateY = 172;
    const bottomY = gateY - 1; // bottomY = 171 (Only 1 tile down from gate to prevent going too far)
    if (!map.tiles[gateY]?.[gateX]) return;

    const setGrass = (tx: number, ty: number, elevation = 0) => {
      if (map.tiles[ty]?.[tx]) {
        map.tiles[ty][tx] = { type: 'grass' as TileType, walkable: true, elevation };
      }
    };

    // Scrub stale footprints from earlier ladder iterations.
    for (let ty = 168; ty <= 177; ty++) {
      for (const tx of [235, 236, 237, 238, 239]) {
        const t = map.tiles[ty]?.[tx];
        if (!t || t.transition || t.interactable) continue;
        if (t.type === 'gate_ladder' || t.type === 'ladder') {
          map.tiles[ty][tx] = {
            type: 'grass' as TileType,
            walkable: true,
            elevation: ty <= gateY && tx >= 240 ? 1 : 0,
          };
        }
      }
    }

    // El1 shelf + C7 connector (gate column excluded).
    for (let ty = 170; ty <= gateY; ty++) {
      for (let tx = 240; tx <= 242; tx++) setGrass(tx, ty, 1);
    }
    for (let tx = 240; tx <= 242; tx++) {
      if (map.tiles[169]?.[tx]) {
        map.tiles[169][tx] = { type: 'cliff' as TileType, walkable: false, elevation: 0 };
      }
    }
    for (let ty = 164; ty <= 171; ty++) {
      for (let tx = 243; tx <= 244; tx++) setGrass(tx, ty, 1);
    }
    for (const [tx, ty] of [[243, 172], [244, 172]] as const) {
      if (map.tiles[ty]?.[tx]) {
        map.tiles[ty][tx] = { type: 'cliff' as TileType, walkable: false, elevation: 1 };
      }
    }

    // Reassert the mirrored cliff-corridor pocket before applying gate/ladder art.
    for (let ty = bottomY; ty <= gateY; ty++) {
      for (const tx of [gateX - 1, gateX, gateX + 1]) {
        if (!map.tiles[ty]?.[tx]) continue;
        const existing = map.tiles[ty][tx];
        if (existing.transition || existing.interactable) continue;
        if (tx === gateX + 1 && ty === gateY) {
          map.tiles[ty][tx] = {
            type: 'grass' as TileType,
            walkable: true,
            elevation: 1,
            enemyBlocked: true,
          };
        } else if (tx === gateX - 1 && ty === bottomY) {
          map.tiles[ty][tx] = {
            type: 'grass' as TileType,
            walkable: true,
            elevation: 0,
            enemyBlocked: true,
          };
        } else if (tx === gateX && ty >= bottomY && ty < gateY) {
          map.tiles[ty][tx] = { type: 'cliff' as TileType, walkable: false, elevation: 0 };
        } else if (tx === gateX - 1 && ty > bottomY && ty <= gateY) {
          // Clear any cliff/obstruction tiles in front of the ladder columns on the west side
          map.tiles[ty][tx] = { type: 'grass' as TileType, walkable: true, elevation: 0 };
        } else if (!(tx === gateX && ty === gateY)) {
          map.tiles[ty][tx] = {
            type: (ty === gateY ? 'cliff_edge' : 'cliff') as TileType,
            walkable: false,
            elevation: ty === gateY ? 1 : 0,
          };
        }
      }
    }

    if (extended) {
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

      if (map.tiles[gateY]?.[gateX + 1]) {
        map.tiles[gateY][gateX + 1] = {
          type: 'grass' as TileType,
          walkable: true,
          elevation: 1,
          enemyBlocked: true,
        };
      }
      if (map.tiles[gateY]?.[gateX - 1]) {
        map.tiles[gateY][gateX - 1] = { type: 'cliff_edge' as TileType, walkable: false, elevation: 1 };
      }

      for (let ty = gateY - 1; ty > bottomY; ty--) {
        if (map.tiles[ty]?.[gateX + 1]) {
          map.tiles[ty][gateX + 1] = { type: 'cliff' as TileType, walkable: false, elevation: 0 };
        }
        if (map.tiles[ty]?.[gateX - 1]) {
          map.tiles[ty][gateX - 1] = { type: 'grass' as TileType, walkable: true, elevation: 0 };
        }
      }

      if (map.tiles[bottomY]?.[gateX + 1]) {
        map.tiles[bottomY][gateX + 1] = { type: 'cliff' as TileType, walkable: false, elevation: 0 };
      }
      if (map.tiles[bottomY]?.[gateX - 1]) {
        map.tiles[bottomY][gateX - 1] = {
          type: 'grass' as TileType,
          walkable: true,
          elevation: 0,
          enemyBlocked: true,
        };
      }
    } else {
      map.tiles[gateY][gateX] = {
        type: 'gate_ladder' as TileType,
        walkable: false,
        elevation: 1,
        baseTile: 'stone' as TileType,
        interactable: true,
        interactionId: 'fort_ridge_ladder',
      };
      for (let ty = gateY - 1; ty >= bottomY; ty--) {
        if (map.tiles[ty]?.[gateX]) {
          map.tiles[ty][gateX] = { type: 'cliff' as TileType, walkable: false, elevation: 0 };
        }
      }
      if (map.tiles[gateY]?.[gateX + 1]) {
        map.tiles[gateY][gateX + 1] = {
          type: 'grass' as TileType,
          walkable: true,
          elevation: 1,
          enemyBlocked: true,
        };
      }
      if (map.tiles[gateY]?.[gateX - 1]) {
        map.tiles[gateY][gateX - 1] = { type: 'cliff_edge' as TileType, walkable: false, elevation: 1 };
      }
      for (let ty = gateY - 1; ty > bottomY; ty--) {
        if (map.tiles[ty]?.[gateX + 1]) {
          map.tiles[ty][gateX + 1] = { type: 'cliff' as TileType, walkable: false, elevation: 0 };
        }
        if (map.tiles[ty]?.[gateX - 1]) {
          map.tiles[ty][gateX - 1] = { type: 'grass' as TileType, walkable: true, elevation: 0 };
        }
      }
      if (map.tiles[bottomY]?.[gateX + 1]) {
        map.tiles[bottomY][gateX + 1] = { type: 'cliff' as TileType, walkable: false, elevation: 0 };
      }
      if (map.tiles[bottomY]?.[gateX - 1]) {
        map.tiles[bottomY][gateX - 1] = {
          type: 'grass' as TileType,
          walkable: true,
          elevation: 0,
          enemyBlocked: true,
        };
      }
    }

    // Seal the cliff face above the landing: world (87, 18)-(89, 18) (tiles 237-239, 168) unwalkable cliffs.
    for (let tx = 237; tx <= 239; tx++) {
      if (map.tiles[168]?.[tx]) {
        map.tiles[168][tx] = { type: 'cliff' as TileType, walkable: false, elevation: 0 };
      }
    }

    // Cliff-sprite bleed buffer (engine convention: 2 rows). The tall cliff sprite at row 168
    // visually covers rows 169-170 (world y=19-20). Keep them grass-typed (so they don't emit
    // cliff art and propagate the bleed) but NON-walkable so the player never stands on a tile that
    // looks like cliff. The clean walkable landing is row 171.
    for (let tx = 237; tx <= 239; tx++) {
      if (map.tiles[169]?.[tx]) map.tiles[169][tx] = { type: 'grass' as TileType, walkable: false, elevation: 0 };
      if (map.tiles[170]?.[tx]) map.tiles[170][tx] = { type: 'grass' as TileType, walkable: false, elevation: 0 };
    }

    // Clean walkable landing at the ladder foot: world (87-89, 21) = tiles (237-239, 171).
    setGrass(237, 171, 0);
    setGrass(238, 171, 0);

    // North cap above the ladder column (world y=23-26): seal bypass north of the pocket.
    for (let ty = 173; ty <= 176; ty++) {
      for (let tx = 237; tx <= 239; tx++) {
        if (map.tiles[ty]?.[tx]) {
          map.tiles[ty][tx] = { type: 'cliff' as TileType, walkable: false, elevation: 1 };
        }
      }
    }

    // Shelf-mouth plug (world 92,23 / tile 242,173): closes the bypass gap on the el1 shelf.
    if (map.tiles[173]?.[242]) {
      map.tiles[173][242] = { type: 'cliff' as TileType, walkable: false, elevation: 1 };
    }

    // Replace the procedural rock blocking the shelf mouth (world ~93,25 / tile 243,175).
    if (map.tiles[175]?.[243]) {
      map.tiles[175][243] = { type: 'cliff' as TileType, walkable: false, elevation: 1 };
    }

    // East cliff face fill (world x=91-94, y=23-27 / tiles 241-244, 173-177): patch grass gaps
    // in the east wall. Preserve spine corridor at tx 239-240, ty 175-183.
    for (let ty = 173; ty <= 177; ty++) {
      for (let tx = 241; tx <= 244; tx++) {
        if (map.tiles[ty]?.[tx]) {
          map.tiles[ty][tx] = { type: 'cliff' as TileType, walkable: false, elevation: 1 };
        }
      }
    }
    if (map.tiles[174]?.[240]) {
      map.tiles[174][240] = { type: 'cliff' as TileType, walkable: false, elevation: 1 };
    }

    if (map.tiles[177]?.[239]) {
      map.tiles[177][239] = { type: 'grass' as TileType, walkable: true, elevation: 0 };
    }
    world.refreshMapTileRegion(234, 167, 245, 178);
  };

  const syncRevenantTerminusChestState = () => {
    if (state.currentMap !== 'forest') return;
    const map = world.getCurrentMap();
    const earlyObtained = state.getFlag('terminus_scythe_early_obtained');
    // Anchor tile coords and per-site chest ids for the two early-unlock ritual sites.
    const REVENANT_CHEST_SITES = [
      { clearedFlag: 'ritual_revenant_west_cleared', interactionId: 'revenant_west_terminus_chest', anchorX: 18, anchorY: 147 },
      { clearedFlag: 'ritual_revenant_precipice_cleared', interactionId: 'revenant_precipice_terminus_chest', anchorX: 227, anchorY: 20 },
      { clearedFlag: 'ridge_revenant_defeated', interactionId: 'revenant_east_terminus_chest', anchorX: 260, anchorY: 142 },
    ] as const;
    for (const site of REVENANT_CHEST_SITES) {
      const row = map.tiles[site.anchorY];
      if (!row) continue;
      const existing = row[site.anchorX];
      if (!existing) continue;
      const el = existing.elevation ?? 0;
      const cleared = state.getFlag(site.clearedFlag);
      const opened = state.getFlag(`${site.interactionId}_opened`);
      if (cleared && !opened && !earlyObtained) {
        // Chest hasn't been claimed yet - materialise special_chest over the dud glyph.
        row[site.anchorX] = { type: 'special_chest' as TileType, walkable: true, elevation: el, interactable: true, interactionId: site.interactionId };
      } else {
        // Chest claimed or scythe already obtained - restore the dud glyph so the spent
        // ritual site still reads correctly.  Only overwrite if the tile is currently a
        // chest type (avoids clobbering other authored tiles that happen to share coords).
        if (existing.type === 'special_chest' || existing.type === 'special_chest_opened') {
          row[site.anchorX] = { type: 'summoning_ritual_dud' as TileType, walkable: true, elevation: el };
        }
      }
    }
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
    const FORT_X = 222, FORT_Y = 153, FORT_W = 16, FORT_H = 15;
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
            : closedKeyGateTile(el, 'forest_fort_gate', tx, GATE_CX);
          continue;
        }

        // North wall passage - owned by syncManuscriptCheckpointGateState, skip here.
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

        // Third ring at gate passage - open when gate is open so no iron bar blocks the walkway
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

    // Exterior gatehouse frame (row south of fort) - open style matches north exit when key used
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
            : closedKeyGateTile(el, 'north_fort_gate', tx, GATE_CX);
          continue;
        }

        if (ty === FORT_Y && tx >= GATE_CX - 1 && tx <= GATE_CX + 1) {
          row[tx] = { type: 'cobblestone' as TileType, walkable: true, elevation: el, spinePath: true };
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

        // Third ring at gate passage - clear to cobblestone when open
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
              nRow[nx] = { type: 'cobblestone' as TileType, walkable: true, elevation: el, spinePath: true };
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
            : closedKeyGateTile(el, interactionId, tx, GATE_CX);
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

        // ── Interior - cobblestone, but keep authored chests (e.g. Wayfarer Ring) and
        //    the summoning glyph (the west-fort Revenant ritual lives on the floor here) ──
        const interiorTile = row[tx];
        if (
          isChestTileType(interiorTile.type)
          || interiorTile.type === 'summoning_ritual'
          || isRitualDecorTileType(interiorTile.type)
          || interiorTile.type === 'bonfire'
          || interiorTile.type === 'bonfire_unlit'
        ) {
          continue;
        }
        row[tx] = { type: 'cobblestone' as TileType, walkable: true, elevation: el };
      }
    }

    // Exterior frames - both sides show pillar+lantern when locked, lantern+cobblestone when open
    const southFrameRow = map.tiles[FORT_Y + FORT_H];
    applyExteriorFrame(southFrameRow, gateOpen);
    const northFrameRow = map.tiles[FORT_Y - 1];
    applyExteriorFrame(northFrameRow, gateOpen);

    world.rebuildChunks();
  };

  /** Failed summoning circles (dud sites) - re-stamp glyph + pad + decor after late map-gen passes. */
  const syncForestDudRitualSites = () => {
    if (state.currentMap !== 'forest') return;
    ensureForestDudRitualSites(world, state.currentMap, {
      forceRemesh: true,
      playerWorldX: state.player.position.x,
      playerWorldY: state.player.position.y,
    });
  };

  const syncWestFortGateState = () => {
    if (state.currentMap !== 'forest') return;
    // Western fort - moved +10 y from original placement, fully sealed (dual gates)
    buildOptionalFort('west_fort_gate_open', 'west_fort_gate', 12, 141, 14, 14);
    const map = world.getCurrentMap();
    applyRevenantRitualDecor(map, 18, 147);
    syncWestFortBonfireLogs(map, state);
    world.rebuildChunks();
  };

  const syncGolemFortGateState = () => {
    if (state.currentMap !== 'forest') return;
    // Northern (golem) fort - fully sealed (dual gates)
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
          : {
              type: 'gate' as TileType,
              walkable: false,
              elevation: el,
              interactable: true,
              interactionId: 'manuscript_checkpoint_gate',
              ...(tx === gateCenterX ? { keyGateLock: true } : {}),
            };
      }
    }

    world.rebuildChunks();
  };

  const HOLLOW_VICTORY_PORTAL_TARGET = { targetMap: 'guilrhym', targetX: 150, targetY: 285 } as const;

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
    // Center special chest - materialises at the boss's fall point after the guardian dies,
    // unless the player already earned the Terminus Scythe from a revenant ritual.
    // Placed 3 tiles south of the portal (same column, still on ruins_floor) so it is visible
    // from both the portal and the bonfire without overlapping either.
    const TERMINUS_CHEST_X = 18;
    const TERMINUS_CHEST_Y = 21;
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
      // Terminus Scythe special chest - appears at the boss's fallen position only if
      // the early revenant route did not already award the weapon.
      const terminusRow = map.tiles[TERMINUS_CHEST_Y];
      if (terminusRow) {
        const tEl = terminusRow[TERMINUS_CHEST_X]?.elevation ?? 0;
        if (state.getFlag('terminus_scythe_early_obtained')) {
          terminusRow[TERMINUS_CHEST_X] = { type: 'ruins_floor' as TileType, walkable: true, elevation: tEl };
        } else {
          terminusRow[TERMINUS_CHEST_X] = {
            type: state.getFlag('hollow_terminus_chest_opened')
              ? getOpenedChestTileType('hollow_terminus_chest')
              : getClosedChestTileType('hollow_terminus_chest'),
            walkable: true,
            elevation: tEl,
            interactable: true,
            interactionId: 'hollow_terminus_chest',
          };
        }
      }
    } else {
      row[portalX] = { type: 'ruins_floor' as TileType, walkable: true, elevation: el };
      for (const chest of victoryChests) {
        const chestRow = map.tiles[chest.y];
        if (!chestRow) continue;
        const chestEl = chestRow[chest.x]?.elevation ?? 0;
        chestRow[chest.x] = { type: 'dark_grass' as TileType, walkable: true, elevation: chestEl };
      }
      // Before boss defeat: tile is plain ruins_floor so nothing appears prematurely.
      const terminusRow = map.tiles[TERMINUS_CHEST_Y];
      if (terminusRow) {
        const tEl = terminusRow[TERMINUS_CHEST_X]?.elevation ?? 0;
        terminusRow[TERMINUS_CHEST_X] = { type: 'ruins_floor' as TileType, walkable: true, elevation: tEl };
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

  const RANGER_WOLF_RING_CHEST_ID = 'ranger_wolf_ring_chest';
  const RANGER_WOLF_RING_CHEST_X = 11;
  const RANGER_WOLF_RING_CHEST_Y = 7;

  const purgeLegacyRangerWolfRingPickups = () => {
    const before = state.worldItems.length;
    state.worldItems = state.worldItems.filter(
      wi => !(wi.itemId === 'wolf_ring' && wi.mapId === 'interior_ranger_cabin'),
    );
    return before !== state.worldItems.length;
  };

  const purgeLegacyHuntersManuscriptPickups = () => {
    const before = state.worldItems.length;
    state.worldItems = state.worldItems.filter(
      wi => !(wi.itemId === 'hunters_manuscript' && wi.mapId === 'forest'),
    );
    return before !== state.worldItems.length;
  };

  const syncRangerWolfRingChestState = () => {
    purgeLegacyRangerWolfRingPickups();

    if (state.currentMap !== 'interior_ranger_cabin') return;
    const map = world.getCurrentMap();
    const row = map.tiles[RANGER_WOLF_RING_CHEST_Y];
    if (!row) return;

    const el = row[RANGER_WOLF_RING_CHEST_X]?.elevation ?? 0;
    const floorTile: Tile = {
      type: 'wood_floor' as TileType,
      walkable: true,
      elevation: el,
    };

    const showOpened =
      state.getFlag('wolf_ring_received') || state.getFlag(`${RANGER_WOLF_RING_CHEST_ID}_opened`);
    // The Wolf Ring chest exists from the start; Olwen's hint only reveals the secondary objective.
    const showClosed = !showOpened;

    if (showOpened) {
      row[RANGER_WOLF_RING_CHEST_X] = {
        type: getOpenedChestTileType(RANGER_WOLF_RING_CHEST_ID),
        walkable: true,
        elevation: el,
        interactable: true,
        interactionId: RANGER_WOLF_RING_CHEST_ID,
      };
    } else if (showClosed) {
      row[RANGER_WOLF_RING_CHEST_X] = {
        type: getClosedChestTileType(RANGER_WOLF_RING_CHEST_ID),
        walkable: true,
        elevation: el,
        interactable: true,
        interactionId: RANGER_WOLF_RING_CHEST_ID,
      };
    } else {
      row[RANGER_WOLF_RING_CHEST_X] = floorTile;
    }

    world.refreshMapTileRegion(
      RANGER_WOLF_RING_CHEST_X - 1,
      RANGER_WOLF_RING_CHEST_Y - 1,
      RANGER_WOLF_RING_CHEST_X + 1,
      RANGER_WOLF_RING_CHEST_Y + 1,
    );
  };

  const syncPreplacedWorldItems = () => {
    purgeLegacyRangerWolfRingPickups();
    purgeLegacyHuntersManuscriptPickups();

    if (state.getFlag('hunters_manuscript_collected') && !state.getFlag('evacuation_order_collected')) {
      state.setFlag('evacuation_order_collected', true);
    }

    const PREPLACED: Array<{ itemId: string; collectedFlag: string; mapId: string; x: number; y: number; prerequisiteFlag?: string }> = [
      { itemId: 'manuscript_fragment', collectedFlag: 'manuscript_fragment_collected', mapId: 'interior_hunter_cottage', x: 0.5, y: -0.5 },
      { itemId: 'evacuation_order', collectedFlag: 'evacuation_order_collected', mapId: 'forest', x: 63, y: -80 },
    ];
    for (const entry of PREPLACED) {
      if (state.getFlag(entry.collectedFlag)) continue;
      if (entry.prerequisiteFlag && !state.getFlag(entry.prerequisiteFlag)) continue;
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

  const GUILRHYM_ARENA_VICTORY_PORTAL_TARGET = { targetMap: 'village', targetX: 120, targetY: 115 } as const;

  // Cathedral-steps fog gate on the main map. Interacting with it (when the Reaver lives)
  // transitions the player into interior_guilrhym_cathedral; once the Reaver is defeated the
  // gate clears to walkable cobblestone. The boss fight itself resolves in the interior arena,
  // so there is no in-place arena or victory portal on the main map anymore.
  const syncGuilrhymBossState = () => {
    if (state.currentMap !== 'guilrhym') return;
    const map = world.getCurrentMap();
    const defeated = state.getFlag('ashen_reaver_defeated');

    const GATE_Y = 45;
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
          interactionId: 'guilrhym_fog_gate',
        };
      }
    }

    // Shortcut portcullis gates. Each is opened by its winch lever (flag <leverId>_open).
    // Closed: a solid iron gate; open: walkable cobblestone. These collapse the long
    // detour loops back onto the bonfire spine once the player finds the lever.
    const shortcutGates: Array<{ flag: string; y0: number; y1: number; x0: number; x1: number; openType: TileType; closedType: TileType }> = [
      // Lever 1 - the winch portcullis on the direct upper-city ascent (the Heights gate).
      { flag: 'guilrhym_shortcut_lever_1_open', y0: 116, y1: 118, x0: 146, x1: 154, openType: 'cobblestone', closedType: 'gate' },
      // Lever 2 - the central canal sluice gate, opening a straight crossing back onto the spine.
      { flag: 'guilrhym_shortcut_lever_2_open', y0: 169, y1: 175, x0: 146, x1: 154, openType: 'bridge', closedType: 'water' },
    ];
    for (const gate of shortcutGates) {
      const open = state.getFlag(gate.flag);
      for (let gy = gate.y0; gy <= gate.y1; gy++) {
        const grow = map.tiles[gy];
        if (!grow) continue;
        for (let gx = gate.x0; gx <= gate.x1; gx++) {
          const gel = grow[gx]?.elevation ?? 0;
          grow[gx] = open
            ? { type: gate.openType, walkable: true, elevation: gel }
            : { type: gate.closedType, walkable: false, elevation: gel };
        }
      }
    }

    world.rebuildChunks();
  };

  const syncGuilrhymArenaVictoryPortalState = () => {
    if (state.currentMap !== 'interior_guilrhym_cathedral') return;
    const map = world.getCurrentMap();
    const portalX = 18;
    const portalY = 18;
    const victoryChests = [
      { x: 6, y: 6, interactionId: 'guilrhym_arena_chest_nw' },
      { x: 29, y: 6, interactionId: 'guilrhym_arena_chest_ne' },
      { x: 6, y: 29, interactionId: 'guilrhym_arena_chest_sw' },
    ];
    // Reaver's reward - a special chest at the boss's fall point, 3 tiles south of the portal.
    const REAVER_CHEST_X = 18;
    const REAVER_CHEST_Y = 21;
    const row = map.tiles[portalY];
    if (!row) return;
    const el = row[portalX]?.elevation ?? 0;
    if (state.getFlag('ashen_reaver_defeated')) {
      row[portalX] = {
        type: 'portal' as TileType,
        walkable: true,
        elevation: el,
        transition: { ...GUILRHYM_ARENA_VICTORY_PORTAL_TARGET },
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
          interactionId: 'guilrhym_arena_bonfire',
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
      const reaverRow = map.tiles[REAVER_CHEST_Y];
      if (reaverRow) {
        const rEl = reaverRow[REAVER_CHEST_X]?.elevation ?? 0;
        reaverRow[REAVER_CHEST_X] = {
          type: 'special_chest' as TileType,
          walkable: true,
          elevation: rEl,
          interactable: true,
          interactionId: 'guilrhym_reaver_chest',
        };
      }
    } else {
      row[portalX] = { type: 'ruins_floor' as TileType, walkable: true, elevation: el };
      for (const chest of victoryChests) {
        const chestRow = map.tiles[chest.y];
        if (!chestRow) continue;
        const chestEl = chestRow[chest.x]?.elevation ?? 0;
        chestRow[chest.x] = { type: 'cobblestone' as TileType, walkable: true, elevation: chestEl };
      }
      const reaverRow = map.tiles[REAVER_CHEST_Y];
      if (reaverRow) {
        const rEl = reaverRow[REAVER_CHEST_X]?.elevation ?? 0;
        reaverRow[REAVER_CHEST_X] = { type: 'ruins_floor' as TileType, walkable: true, elevation: rEl };
      }
    }

    world.rebuildChunks();
  };

  const syncPersistentMapState = () => {
    syncWhisperingWoodsShortcutState();
    syncGroveShelfShortcutState();
    syncQuarryBankShortcutState();
    syncWestLakeBridgePlankState();
    syncWestCliffGateState();
    syncSouthEntryPicketGateState();
    syncEastCreekShoreGateState();
    syncRiversideBridgeShortcutState();
    syncHollowShortcutState();
    syncEastHollowRouteGateState();
    syncHollowApproachOverlookShelfState();
    syncHollowApproachSpineGateState();
    syncForestFortGateState();
    syncNorthFortGateState();
    syncWestFortGateState();
    syncForestDudRitualSites();
    syncGolemFortGateState();
    syncManuscriptCheckpointGateState();
    syncHollowFogGateState();
    syncHollowArenaVictoryPortalState();
    syncGuilrhymBossState();
    syncGuilrhymArenaVictoryPortalState();
    syncVillageReactivityState();
    syncVillageInteriorReactivityState();
    syncRevenantTerminusChestState();
    syncOpenedChestState();
    syncBlightedRootState();
    syncHarvestedTempestGrassState();
    syncHarvestedMoonbloomState();
    syncBonfireKindledState();
    syncRangerWolfRingChestState();
    syncPreplacedWorldItems();
    syncHollowApproachLadderState();
    syncCliffCorridorLadderState();
    syncFortRidgeLadderState();
    syncHeresyAltarsForMap(state, world.getCurrentMap(), state.currentMap);
  };

  const respawnEnemiesForCurrentMap = (targetMap: string, map: WorldMap) => {
    const flags = state.gameFlags as Record<string, boolean | number>;
    combatSystem.clearAllEnemies();
    enemyVisuals.disposeAll();
    assetManager.warmupEnemyTexturesForZones(mapDefinitions[targetMap]?.enemyZones);
    spawnEnemiesFromMapZones(targetMap, map, combatSystem, world, state.killedEnemyIds, flags);

    if (targetMap === 'forest') {
      const spawnBattleEnemy = (
        enemyKey: keyof typeof ENEMY_BLUEPRINTS,
        position: { x: number; y: number },
        faction: string,
      ) => {
        const bp = ENEMY_BLUEPRINTS[enemyKey];
        if (!bp) return;
        const zoneId = `forest:fixed:${Math.round(position.x)}_${Math.round(position.y)}`;
        if (state.killedEnemyIds.has(zoneId)) return;
        combatSystem.spawnEnemy(bp.name, position, bp.hp, bp.damage, bp.sprite, {
          speed: bp.speed,
          attackRange: bp.attackRange,
          chaseRange: bp.chaseRange,
          essenceReward: bp.essenceReward,
          goldReward: bp.goldReward,
          telegraphDuration: bp.telegraphDuration,
          recoverDuration: bp.recoverDuration,
          poise: bp.poise,
          staggerDuration: bp.staggerDuration,
          behaviorOverrides: bp.behaviorOverrides,
          faction,
          zoneId,
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

    // Boss arena: spawn the Hollow Guardian at the nave centre (tile 18,18).
    if (targetMap === 'interior_hollow_arena' && !state.getFlag('hollow_guardian_defeated')) {
      const bp = ENEMY_BLUEPRINTS.hollow_guardian;
      if (bp) {
        const arenaCenter = {
          x: 18 - map.width / 2 + 0.5,
          y: 18 - map.height / 2 + 0.5,
        };
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
          // Scripted boss - must appear even if sanctuary radius overlaps the nave
          // (registry post-victory bonfire at tile 18,28 used to silently drop the spawn).
          ignoreBonfireSanctuary: true,
        });
      }

      // One Hollow Reaver at a far (north) corner on arena entry - enough ranged pressure
      // to teach the add read without immediately turning the arena into full crossfire.
      const reaverBp = ENEMY_BLUEPRINTS.hollow_reaver;
      if (reaverBp) {
        const initialReaverCorners = [
          { x:  6, y: -7 }, // NE corner
        ];
        for (const corner of initialReaverCorners) {
          combatSystem.spawnEnemy(reaverBp.name, corner, reaverBp.hp, reaverBp.damage, reaverBp.sprite, {
            speed: reaverBp.speed,
            attackRange: reaverBp.attackRange,
            chaseRange: reaverBp.chaseRange,
            essenceReward: reaverBp.essenceReward,
            goldReward: reaverBp.goldReward,
            telegraphDuration: reaverBp.telegraphDuration,
            recoverDuration: reaverBp.recoverDuration,
            poise: reaverBp.poise,
            staggerDuration: reaverBp.staggerDuration,
            behaviorOverrides: reaverBp.behaviorOverrides,
            ignoreBonfireSanctuary: true,
          });
        }
      }
    }

    // Boss arena: spawn the Ashen Reaver at the cathedral nave centre, with two
    // shadow lurkers anchored to the north corners for crossfire pressure as the
    // player advances up the nave toward the boss.
    if (targetMap === 'interior_guilrhym_cathedral' && !state.getFlag('ashen_reaver_defeated')) {
      const bp = ENEMY_BLUEPRINTS.ashen_reaver;
      if (bp) {
        const arenaCenter = {
          x: 18 - map.width / 2 + 0.5,
          y: 18 - map.height / 2 + 0.5,
        };
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
          ignoreBonfireSanctuary: true,
        });
      }

      const addBp = ENEMY_BLUEPRINTS.shadow_lurker;
      if (addBp) {
        const addCorners = [
          { x: -7, y: -7 }, // NW corner
          { x:  6, y: -7 }, // NE corner
        ];
        for (const corner of addCorners) {
          combatSystem.spawnEnemy(addBp.name, corner, addBp.hp, addBp.damage, addBp.sprite, {
            speed: addBp.speed,
            attackRange: addBp.attackRange,
            chaseRange: addBp.chaseRange,
            essenceReward: addBp.essenceReward,
            telegraphDuration: addBp.telegraphDuration,
            recoverDuration: addBp.recoverDuration,
            poise: addBp.poise,
            staggerDuration: addBp.staggerDuration,
            behaviorOverrides: addBp.behaviorOverrides,
            ignoreBonfireSanctuary: true,
          });
        }
      }
    }

    evictEnemiesFromBonfireSafeZones(combatSystem, targetMap, flags);
    if (import.meta.env.DEV) {
      console.log(`[Spawn] Total enemies spawned: ${combatSystem.getEnemies().length}`);
    }
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
    syncQuarryBankShortcutState,
    syncWestLakeBridgePlankState,
    syncWestCliffGateState,
    syncSouthEntryPicketGateState,
    syncEastCreekShoreGateState,
    syncRiversideBridgeShortcutState,
    syncHollowShortcutState,
    syncEastHollowRouteGateState,
    syncHollowCorridorGateState,
    syncHollowApproachOverlookShelfState,
    syncHollowApproachSpineGateState,
    syncHollowApproachLadderState,
    syncCliffCorridorLadderState,
    syncFortRidgeLadderState,
    syncForestFortGateState,
    syncNorthFortGateState,
    syncWestFortGateState,
    syncGolemFortGateState,
    syncManuscriptCheckpointGateState,
    syncHollowFogGateState,
    syncHollowArenaVictoryPortalState,
    syncGuilrhymBossState,
    syncGuilrhymArenaVictoryPortalState,
    syncVillageReactivityState,
    syncVillageInteriorReactivityState,
    syncRevenantTerminusChestState,
    syncOpenedChestState,
    syncRangerWolfRingChestState,
    syncBlightedRootState,
    syncHarvestedTempestGrassState,
    syncHarvestedMoonbloomState,
    syncPersistentMapState,
    handleMapTransition,
    handlePortalTransition,
    respawnEnemiesForCurrentMap,
  };
}
