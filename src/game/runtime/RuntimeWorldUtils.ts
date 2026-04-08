import type { GameState } from '@/lib/game/GameState';
import type { CombatSystem } from '@/lib/game/Combat';
import { World } from '@/lib/game/World';
import type { WorldMap } from '@/lib/game/World';
import { dialogues } from '@/data/dialogues';
import { mapDefinitions } from '@/data/maps';
import { ENEMY_BLUEPRINTS, DEFAULT_ENEMY } from '@/data/enemies';
import type { Item } from '@/lib/game/GameState';
import type { CriticalPathItemVisual } from '@/data/criticalPathItems';

export const SPAWN_BODY_R = 0.15;

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
  if (interactionId === 'shadow_castle_gate_switch') return 'Open Inner Gate';
  if (interactionId === 'forest_shortcut_lever') {
    return state.getFlag('whispering_woods_shortcut_open') ? 'Shortcut Unlocked' : 'Unbar Ranger Gate';
  }
  if (interactionId === 'grove_shelf_shortcut_lever') {
    return state.getFlag('grove_shelf_shortcut_open') ? 'Shortcut Unlocked' : 'Unbar Trail Gate';
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
  if (interactionId === 'campfire') return 'Rest at Campfire';
  if (interactionId === 'ancient_well') return 'Drink from Well';
  if (interactionId === 'well' || interactionId === 'fountain' || interactionId === 'ancient_fountain' || interactionId === 'ancient_well' || interactionId === 'gilrhym_fountain' || interactionId === 'gilrhym_market_well' || interactionId === 'gilrhym_cathedral_well') return 'Drink from Fountain';
  if (interactionId === 'healing_mushroom') return 'Gather Mushroom';
  if (interactionId === 'lantern') return 'Inspect Lantern';
  if (interactionId === 'hunter_clue') return "Read Hunter's Manuscript";
  if (interactionId === 'stump_lore') return 'Inspect Carvings';
  if (interactionId === 'wolf_den_bones') return 'Inspect Remains';
  if (interactionId === 'chapel_dead_ranger') return 'Inspect Fallen Ranger';
  if (interactionId === 'hollow_dead_ranger') return 'Inspect Fallen Ranger';
  if (interactionId === 'dead_ranger_shortcut_note') return 'Inspect Fallen Ranger';
  if (interactionId === 'witch_cauldron') return 'Inspect Cauldron';
  if (interactionId === 'witch_altar') return 'Inspect Altar';
  if (interactionId === 'forest_fort_gate') {
    if (state.getFlag('forest_fort_gate_open')) return 'Fort Gate (Open)';
    return state.hasItem('fort_gate_key') ? 'Unlock Fort Gate' : 'Fort Gate (Locked — Key Required)';
  }
  if (interactionId === 'hollow_fog_gate') {
    return state.getFlag('hollow_guardian_defeated') ? 'The Fog Has Lifted' : 'Enter the Fog';
  }
  if (interactionId === 'gilrhym_fog_gate') {
    return state.getFlag('ashen_reaver_defeated') ? 'The Fog Has Lifted' : 'Approach the Fog';
  }
  if (interactionId === 'old_chapel_altar') return 'Inspect Altar';
  if (interactionId === 'spider_cocoon') return 'Inspect Cocoon';
  if (interactionId === 'temple_inscription') return 'Read Inscription';
  if (interactionId === 'forest_fort_banner') return 'Inspect Banner';
  if (interactionId === 'volcano_warning') return 'Read Warning';
  if (interactionId === 'witch_cottage') return 'Inspect Cottage';
  if (interactionId === 'logging_camp') return 'Inspect Camp';
  if (interactionId === 'collapsed_cottage') return 'Inspect Ruins';

  if (dialogues[interactionId]) {
    const speakerName = interactionId.replace(/_/g, ' ').replace(/\b\w/g, m => m.toUpperCase());
    return `Talk to ${speakerName}`;
  }

  return 'Interact';
}

function pickEnemySpawnInZone(
  zone: { x: number; y: number; width: number; height: number },
  mapWorld: WorldMap,
  world: World,
  index: number,
  total: number,
): { x: number; y: number } | null {
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
    if (world.canMoveTo(ex, ey, ex, ey, SPAWN_BODY_R)) return { x: ex, y: ey };
  }
  for (let t = 0; t < 28; t++) {
    const ex = zone.x + Math.random() * zone.width - mapWorld.width / 2;
    const ey = zone.y + Math.random() * zone.height - mapWorld.height / 2;
    if (world.canMoveTo(ex, ey, ex, ey, SPAWN_BODY_R)) return { x: ex, y: ey };
  }
  return null;
}

export function resolveSafeTransitionPosition(
  world: World,
  mapWorld: WorldMap,
  targetX: number,
  targetY: number,
): { x: number; y: number } {
  const baseX = targetX - mapWorld.width / 2;
  const baseY = targetY - mapWorld.height / 2;

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

export function spawnEnemiesFromMapZones(mapKey: string, mapWorld: WorldMap, combatSystem: CombatSystem, world: World) {
  const mapDef = mapDefinitions[mapKey];
  if (!mapDef?.enemyZones?.length) return;
  for (const zone of mapDef.enemyZones) {
    const blueprint = ENEMY_BLUEPRINTS[zone.enemyType] || DEFAULT_ENEMY;
    for (let i = 0; i < zone.count; i++) {
      const pos = pickEnemySpawnInZone(zone, mapWorld, world, i, zone.count);
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
          telegraphDuration: blueprint.telegraphDuration,
          recoverDuration: blueprint.recoverDuration,
          poise: blueprint.poise,
          staggerDuration: blueprint.staggerDuration,
          behaviorOverrides: blueprint.behaviorOverrides,
          faction: zone.faction ?? blueprint.faction,
        },
      );
    }
  }
}
