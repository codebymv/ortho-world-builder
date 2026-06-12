import type { GameState } from '@/lib/game/GameState';
import type { CombatSystem } from '@/lib/game/Combat';
import { World } from '@/lib/game/World';
import type { Tile, WorldMap } from '@/lib/game/World';
import { dialogues } from '@/data/dialogues';
import { mapDefinitions } from '@/data/maps';
import { ENEMY_BLUEPRINTS, DEFAULT_ENEMY } from '@/data/enemies';
import type { EnemyBlueprint } from '@/data/enemies';
import {
  evictEnemiesFromBonfireSafeZones,
  evictEnemiesFromBonfireRestZones,
  isPositionInBonfireSpawnExclusionZone,
} from '@/game/runtime/bonfireCombatGuard';
import type { Item } from '@/lib/game/GameState';
import type { CriticalPathItemVisual } from '@/data/criticalPathItems';

export const SPAWN_BODY_R = 0.3;
const WATER_SLIME_MAX_TILE_Y = 255;
const WATER_SLIME_SPAWN_TILES = new Set(['water', 'water_corrupted', 'waterfall']);
/** Minimum tile distance from an auto-warp portal when arriving via map transition. */
const PORTAL_ARRIVAL_MIN_TILE_DISTANCE = 3;
const PORTAL_ARRIVAL_SEARCH_RADIUS = 6;

function isAutoWarpPortalTile(tile: Tile | undefined): boolean {
  if (!tile?.transition) return false;
  if (tile.type === 'portal') return true;
  if (tile.type === 'door_interior') return true;
  if (tile.type === 'cave_mouth' && !tile.interactable) return true;
  return false;
}

function tileCoordToWorld(mapWorld: WorldMap, tileX: number, tileY: number): { x: number; y: number } {
  return { x: tileX - mapWorld.width / 2, y: tileY - mapWorld.height / 2 };
}

function resolvePortalArrivalTile(
  world: World,
  mapWorld: WorldMap,
  targetTileX: number,
  targetTileY: number,
): { x: number; y: number } {
  const targetTile = mapWorld.tiles[targetTileY]?.[targetTileX];
  if (!isAutoWarpPortalTile(targetTile)) {
    return { x: targetTileX, y: targetTileY };
  }

  const candidates: Array<{ x: number; y: number; dist: number }> = [];
  for (let dy = -PORTAL_ARRIVAL_SEARCH_RADIUS; dy <= PORTAL_ARRIVAL_SEARCH_RADIUS; dy++) {
    for (let dx = -PORTAL_ARRIVAL_SEARCH_RADIUS; dx <= PORTAL_ARRIVAL_SEARCH_RADIUS; dx++) {
      const dist = Math.max(Math.abs(dx), Math.abs(dy));
      if (dist < PORTAL_ARRIVAL_MIN_TILE_DISTANCE) continue;

      const tx = targetTileX + dx;
      const ty = targetTileY + dy;
      if (tx < 0 || ty < 0 || tx >= mapWorld.width || ty >= mapWorld.height) continue;

      const tile = mapWorld.tiles[ty]?.[tx];
      if (!tile || isAutoWarpPortalTile(tile)) continue;

      const worldPos = tileCoordToWorld(mapWorld, tx, ty);
      if (!world.canMoveTo(worldPos.x, worldPos.y, worldPos.x, worldPos.y, SPAWN_BODY_R)) continue;

      candidates.push({ x: tx, y: ty, dist });
    }
  }

  candidates.sort((a, b) => {
    if (a.dist !== b.dist) return a.dist - b.dist;
    // Step off the portal toward the map interior (south) when distances tie.
    if (a.y !== b.y) return b.y - a.y;
    return Math.abs(a.x - mapWorld.width / 2) - Math.abs(b.x - mapWorld.width / 2);
  });

  if (candidates.length > 0) {
    return { x: candidates[0].x, y: candidates[0].y };
  }

  return { x: targetTileX, y: targetTileY };
}

export function getMapDisplayName(mapId: string): string {
  return mapDefinitions[mapId]?.name ?? mapId.replace(/_/g, ' ').replace(/\b\w/g, m => m.toUpperCase());
}

export function getInteractionPromptLabel(
  interactionId: string,
  state: GameState,
  world: World,
  x: number,
  y: number,
  criticalItemInteractionIds: Set<string>,
  criticalPathItems: Record<string, CriticalPathItemVisual>,
  items: Record<string, Item>,
  npcName?: string,
): string | null {
  if (npcName) return `Talk to ${npcName}`;

  if (interactionId === 'building_entrance' || interactionId === 'building_exit') {
    const transition = world.getTransitionAt(x, y);
    if (!transition) return interactionId === 'building_entrance' ? 'Enter' : 'Exit';
    const destinationName = getMapDisplayName(transition.targetMap);
    return interactionId === 'building_entrance' ? `Enter ${destinationName}` : `Exit to ${destinationName}`;
  }

  if (interactionId.includes('bonfire')) {
    const map = world.getCurrentMap();
    const tx = Math.floor(x + map.width / 2);
    const ty = Math.floor(y + map.height / 2);
    const firstKey = `bonfire_first_${state.currentMap}_${tx}_${ty}`;
    return state.getFlag(firstKey) ? 'Rest at Bonfire' : 'Kindle Bonfire';
  }
  if (interactionId === 'moonbloom_pickup') return 'Pick Moonbloom';
  if (interactionId === 'tempest_grass_pickup') return 'Harvest Tempest Grass';
  if (interactionId === 'forest_shortcut_lever') {
    return state.getFlag('whispering_woods_shortcut_open') ? 'Shortcut Unlocked' : 'Unbar Ranger Gate';
  }
  if (interactionId === 'grove_shelf_shortcut_lever') {
    return state.getFlag('grove_shelf_shortcut_open') ? 'Shortcut Unlocked' : 'Unbar Trail Gate';
  }
  if (interactionId === 'quarry_bank_shortcut_lever') {
    return state.getFlag('quarry_bank_shortcut_open') ? 'Shortcut Unlocked' : 'Unbar Quarry Gate';
  }
  if (interactionId === 'west_lake_bridge_plank') {
    return state.getFlag('west_lake_bridge_plank_extended') ? 'Plank Crossing' : 'Extend Plank';
  }
  if (interactionId === 'quarry_bank_gate_sealed') {
    return 'Must open another way';
  }
  if (interactionId === 'west_cliff_gate_lever') {
    return state.getFlag('west_cliff_gate_open') ? 'Gate Opened' : 'Lift Bar';
  }
  if (interactionId === 'west_cliff_gate_sealed') {
    return 'Must open another way';
  }
  if (interactionId === 'south_entry_picket_gate_lever') {
    return state.getFlag('south_entry_picket_gate_open') ? 'Gate Opened' : 'Lift Bar';
  }
  if (interactionId === 'south_entry_picket_gate_sealed') {
    return 'Must open another way';
  }
  if (interactionId === 'riverside_bridge_shortcut_lever') {
    return state.getFlag('riverside_bridge_shortcut_open') ? 'Shortcut Unlocked' : 'Lower Bridge';
  }
  if (interactionId === 'hollow_shortcut_lever') {
    return state.getFlag('hollow_shortcut_open') ? 'Shortcut Unlocked' : 'Unbar Hollow Gate';
  }
  if (interactionId === 'hollow_gate_sealed') {
    return 'Must open another way';
  }
  if (interactionId === 'east_hollow_route_gate_lever') {
    return state.getFlag('east_hollow_route_gate_open') ? 'Shortcut Unlocked' : 'Unbar Route Gate';
  }
  if (interactionId === 'east_hollow_route_gate_sealed') {
    return 'Must open another way';
  }
  if (interactionId === 'highlanders_plains_gate') {
    if (state.getFlag('highlanders_plains_gate_open')) return "Highlander's Plains Gate (Open)";
    return state.hasItem('highlanders_key') ? "Unlock Highlander's Plains Gate" : "Highlander's Gate (Locked, Key Required)";
  }

  if (criticalItemInteractionIds.has(interactionId)) {
    const config = criticalPathItems[interactionId];
    const criticalItem = items[config.itemId];
    if (criticalItem?.name) {
      if (criticalItem.name.toLowerCase().includes('manuscript')) return `Read ${criticalItem.name}`;
      return `Take ${criticalItem.name}`;
    }
    return 'Inspect';
  }

  if (interactionId.includes('chest')) {
    return state.getFlag(`${interactionId}_opened`) ? 'Chest Opened' : 'Open Chest';
  }

  if (interactionId.includes('sign')) return 'Read Sign';
  if (interactionId === 'tombstone') return 'Read Epitaph';
  if (interactionId === 'lantern') return null;
  if (interactionId === 'ancient_well') return 'Drink from Well';
  if (interactionId === 'well' || interactionId === 'fountain' || interactionId === 'ancient_fountain' || interactionId === 'ancient_well' || interactionId === 'guilrhym_fountain' || interactionId === 'guilrhym_market_well' || interactionId === 'guilrhym_cathedral_well') return 'Drink from Fountain';
  if (interactionId === 'hunter_clue') return "Read Hunter's Manuscript";
  if (interactionId === 'wolf_den_bones') return 'Inspect Remains';
  if (interactionId === 'chapel_dead_ranger') return 'Inspect Fallen Ranger';
  if (interactionId === 'hollow_dead_ranger') return 'Inspect Fallen Ranger';
  if (interactionId === 'dead_ranger_shortcut_note') return 'Inspect Fallen Ranger';
  if (interactionId === 'witch_altar') return 'Inspect Altar';
  if (interactionId === 'forest_fort_gate') {
    if (state.getFlag('forest_fort_gate_open')) return 'Fort Gate (Open)';
    return state.hasItem('fort_gate_key') ? 'Unlock Fort Gate' : 'Fort Gate (Locked, Key Required)';
  }
  if (interactionId === 'manuscript_checkpoint_gate') {
    if (state.getFlag('manuscript_checkpoint_gate_open')) return 'Checkpoint Gate (Open)';
    return state.getFlag('manuscript_fragment_collected') ? 'Open Checkpoint Gate' : 'Checkpoint Gate (Ranger Permission Required)';
  }
  if (interactionId === 'hollow_fog_gate') {
    return state.getFlag('hollow_guardian_defeated') ? 'The Fog Has Lifted' : 'Enter the Fog';
  }
  if (interactionId === 'guilrhym_fog_gate') {
    return state.getFlag('ashen_reaver_defeated') ? 'The Fog Has Lifted' : 'Approach the Fog';
  }
  if (interactionId === 'old_chapel_altar') return 'Inspect Altar';
  if (interactionId === 'temple_inscription') return 'Read Inscription';
  if (interactionId === 'forest_fort_banner') return 'Inspect Banner';
  if (interactionId === 'volcano_warning') return 'Read Warning';
  
  if (interactionId === 'logging_camp') return 'Inspect Camp';
  if (interactionId === 'collapsed_cottage') return 'Inspect Ruins';

  if (dialogues[interactionId]) {
    const speakerName = interactionId.replace(/_/g, ' ').replace(/\b\w/g, m => m.toUpperCase());
    return `Talk to ${speakerName}`;
  }

  return 'Interact';
}

function pickEnemySpawnInZone(
  mapKey: string,
  zone: { x: number; y: number; width: number; height: number; patrolRadius?: number },
  mapWorld: WorldMap,
  world: World,
  index: number,
  total: number,
  blueprint?: EnemyBlueprint,
  gameFlags?: Record<string, boolean | number>,
): { x: number; y: number } | null {
  if (blueprint?.behaviorOverrides?.amphibiousWaterLeash) {
    return pickWaterSlimeSpawnInZone(mapKey, zone, mapWorld, world, gameFlags);
  }

  const cols = Math.max(1, Math.min(Math.floor(zone.width), Math.ceil(Math.sqrt(total))));
  const rows = Math.max(1, Math.ceil(total / cols));
  const subW = zone.width / cols;
  const subH = zone.height / rows;
  const ci = index % cols;
  const cj = Math.floor(index / cols);
  const bx = zone.x + ci * subW;
  const by = zone.y + cj * subH;
  for (let t = 0; t < 10; t++) {
    const ex = bx + Math.random() * subW - mapWorld.width / 2;
    const ey = by + Math.random() * subH - mapWorld.height / 2;
    if (
      !isPositionInBonfireSpawnExclusionZone(mapKey, ex, ey) &&
      world.canEnemyMoveTo(ex, ey, ex, ey, SPAWN_BODY_R)
    ) {
      return { x: ex, y: ey };
    }
  }
  for (let t = 0; t < 28; t++) {
    const ex = zone.x + Math.random() * zone.width - mapWorld.width / 2;
    const ey = zone.y + Math.random() * zone.height - mapWorld.height / 2;
    if (
      !isPositionInBonfireSpawnExclusionZone(mapKey, ex, ey) &&
      world.canEnemyMoveTo(ex, ey, ex, ey, SPAWN_BODY_R)
    ) {
      return { x: ex, y: ey };
    }
  }
  return null;
}

function tileToWorldCenter(mapWorld: WorldMap, tileX: number, tileY: number): { x: number; y: number } {
  return {
    x: tileX - mapWorld.width / 2 + 0.5,
    y: tileY - mapWorld.height / 2 + 0.5,
  };
}

function pickWaterSlimeSpawnInZone(
  mapKey: string,
  zone: { x: number; y: number; width: number; height: number },
  mapWorld: WorldMap,
  world: World,
  gameFlags?: Record<string, boolean | number>,
): { x: number; y: number } | null {
  if (zone.y > WATER_SLIME_MAX_TILE_Y) return null;

  const minX = Math.max(0, Math.floor(zone.x));
  const maxX = Math.min(mapWorld.width - 1, Math.ceil(zone.x + zone.width) - 1);
  const minY = Math.max(0, Math.floor(zone.y));
  const maxY = Math.min(WATER_SLIME_MAX_TILE_Y, mapWorld.height - 1, Math.ceil(zone.y + zone.height) - 1);
  const waterCandidates: Array<{ x: number; y: number }> = [];
  const shoreCandidates: Array<{ x: number; y: number }> = [];

  for (let ty = minY; ty <= maxY; ty++) {
    const row = mapWorld.tiles[ty];
    if (!row) continue;
    for (let tx = minX; tx <= maxX; tx++) {
      const tile = row[tx];
      if (!tile) continue;
      const pos = tileToWorldCenter(mapWorld, tx, ty);
      if (isPositionInBonfireSpawnExclusionZone(mapKey, pos.x, pos.y)) continue;
      if (WATER_SLIME_SPAWN_TILES.has(tile.type)) {
        waterCandidates.push(pos);
      } else if (world.canEnemyMoveTo(pos.x, pos.y, pos.x, pos.y, SPAWN_BODY_R)) {
        shoreCandidates.push(pos);
      }
    }
  }

  const candidates = waterCandidates.length > 0 ? waterCandidates : shoreCandidates;
  if (candidates.length === 0) return null;
  return candidates[Math.floor(Math.random() * candidates.length)];
}

export function resolveSafeTransitionPosition(
  world: World,
  mapWorld: WorldMap,
  targetX: number,
  targetY: number,
): { x: number; y: number } {
  const arrivalTile = resolvePortalArrivalTile(world, mapWorld, targetX, targetY);
  const baseX = arrivalTile.x - mapWorld.width / 2;
  const baseY = arrivalTile.y - mapWorld.height / 2;

  if (world.canMoveTo(baseX, baseY, baseX, baseY, SPAWN_BODY_R)) {
    return { x: baseX, y: baseY };
  }

  const offsets = [
    { x: 0, y: 1 }, { x: 0, y: -1 }, { x: 1, y: 0 }, { x: -1, y: 0 },
    { x: 1, y: 1 }, { x: -1, y: 1 }, { x: 1, y: -1 }, { x: -1, y: -1 },
    { x: 0, y: 2 }, { x: 0, y: -2 }, { x: 2, y: 0 }, { x: -2, y: 0 },
  ];

  for (const offset of offsets) {
    const x = baseX + offset.x;
    const y = baseY + offset.y;
    if (world.canMoveTo(x, y, x, y, SPAWN_BODY_R)) {
      return { x, y };
    }
  }

  return { x: baseX, y: baseY };
}

export function spawnEnemiesFromMapZones(
  mapKey: string,
  mapWorld: WorldMap,
  combatSystem: CombatSystem,
  world: World,
  killedIds: ReadonlySet<string> = new Set(),
  gameFlags?: Record<string, boolean | number>,
) {
  const mapDef = mapDefinitions[mapKey];
  if (!mapDef?.enemyZones?.length) return;
  for (let zoneIdx = 0; zoneIdx < mapDef.enemyZones.length; zoneIdx++) {
    const zone = mapDef.enemyZones[zoneIdx];
    const blueprint = ENEMY_BLUEPRINTS[zone.enemyType] || DEFAULT_ENEMY;
    for (let i = 0; i < zone.count; i++) {
      const zoneId = `${mapKey}:z${zoneIdx}:${i}`;
      if (killedIds.has(zoneId)) continue;
      const pos = pickEnemySpawnInZone(mapKey, zone, mapWorld, world, i, zone.count, blueprint, gameFlags);
      if (!pos) continue;
      combatSystem.spawnEnemy(
        blueprint.name,
        pos,
        blueprint.hp,
        blueprint.damage,
        blueprint.sprite,
        {
          speed: blueprint.speed,
          attackRange: blueprint.attackRange,
          chaseRange: blueprint.chaseRange,
          essenceReward: blueprint.essenceReward,
          goldReward: blueprint.goldReward,
          telegraphDuration: blueprint.telegraphDuration,
          recoverDuration: blueprint.recoverDuration,
          poise: blueprint.poise,
          staggerDuration: blueprint.staggerDuration,
          behaviorOverrides: blueprint.behaviorOverrides,
          faction: zone.faction ?? blueprint.faction,
          patrolRadius: zone.patrolRadius,
          zoneId,
        },
      );
    }
  }
  evictEnemiesFromBonfireSafeZones(combatSystem, mapKey, gameFlags);
  evictEnemiesFromBonfireRestZones(combatSystem, mapKey);
}
