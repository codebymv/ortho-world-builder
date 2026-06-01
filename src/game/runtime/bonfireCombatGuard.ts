import type { CombatSystem } from '@/lib/game/Combat';
import type { Enemy } from '@/lib/game/Combat';
import {
  bonfireEntryWorldPosition,
  bonfireTileWorldPosition,
  getBonfiresForMap,
} from '@/data/bonfires';

/**
 * World-space radius around each bonfire where enemies must not spawn, path, or fight the player.
 * Matches the distance used to block rest / fast travel when hostiles are nearby.
 */
export const BONFIRE_SAFE_RADIUS = 12;

/** @deprecated Use BONFIRE_SAFE_RADIUS — kept as alias for existing imports. */
export const BONFIRE_ENEMY_BLOCK_RADIUS = BONFIRE_SAFE_RADIUS;

const BONFIRE_SAFE_RADIUS_SQ = BONFIRE_SAFE_RADIUS * BONFIRE_SAFE_RADIUS;

const ENEMY_SANCTUARY_TILE_TYPES: Set<string> = new Set([
  'water',
  'cliff',
  'cliff_edge',
  'cliff_corrupted',
  'cliff_edge_corrupted',
]);

export function isPositionInBonfireSafeZone(
  mapId: string,
  worldX: number,
  worldY: number,
): boolean {
  for (const entry of getBonfiresForMap(mapId)) {
    const c = bonfireEntryWorldPosition(entry);
    const dx = worldX - c.x;
    const dy = worldY - c.y;
    if (dx * dx + dy * dy <= BONFIRE_SAFE_RADIUS_SQ) return true;
  }
  return false;
}

export function countHostilesNearBonfire(
  combatSystem: CombatSystem,
  mapId: string,
  tileX: number,
  tileY: number,
): number {
  const { x, y } = bonfireTileWorldPosition(mapId, tileX, tileY);
  return combatSystem
    .getEnemiesInRange({ x, y }, BONFIRE_SAFE_RADIUS)
    .filter(e => e.health > 0 && e.state !== 'dead').length;
}

export function areHostilesNearBonfire(
  combatSystem: CombatSystem,
  mapId: string,
  tileX: number,
  tileY: number,
): boolean {
  return countHostilesNearBonfire(combatSystem, mapId, tileX, tileY) > 0;
}

/** Push a live enemy outside every bonfire sanctuary disc on this map. */
export function nudgeEnemyOutOfBonfireSanctuary(enemy: Enemy, mapId: string): void {
  if (enemy.state === 'dead') return;
  let x = enemy.position.x;
  let y = enemy.position.y;
  let changed = false;

  for (const entry of getBonfiresForMap(mapId)) {
    const c = bonfireEntryWorldPosition(entry);
    const dx = x - c.x;
    const dy = y - c.y;
    const distSq = dx * dx + dy * dy;
    if (distSq >= BONFIRE_SAFE_RADIUS_SQ) continue;
    const dist = Math.sqrt(distSq);
    const push = BONFIRE_SAFE_RADIUS + 1.25;
    if (dist < 0.05) {
      x = c.x + push;
      y = c.y;
    } else {
      const scale = push / dist;
      x = c.x + dx * scale;
      y = c.y + dy * scale;
    }
    changed = true;
  }

  if (changed) {
    enemy.position.x = x;
    enemy.position.y = y;
    enemy.patrolOrigin = { x, y };
    if (enemy.state === 'chasing' || enemy.state === 'telegraphing' || enemy.state === 'recovering') {
      enemy.state = 'idle';
    }
    enemy.playerAggroed = false;
    enemy.factionTarget = null;
    enemy.attackLockedTarget = null;
  }
}

export function evictEnemiesFromBonfireSafeZones(combatSystem: CombatSystem, mapId: string): void {
  for (const enemy of combatSystem.getAllEnemies()) {
    if (enemy.state === 'dead') continue;
    if (!isPositionInBonfireSafeZone(mapId, enemy.position.x, enemy.position.y)) continue;
    nudgeEnemyOutOfBonfireSanctuary(enemy, mapId);
  }
}

/**
 * Marks walkable ground near authored bonfires so enemies cannot path into the flame yard.
 * Called from map generation (requires mapKey on the generated WorldMap).
 */
export function enforceBonfireSanctuaryTiles(
  tiles: { type: string; walkable: boolean; enemyBlocked?: boolean }[][],
  mapKey: string,
): void {
  const h = tiles.length;
  const w = tiles[0]?.length ?? 0;
  const r = Math.ceil(BONFIRE_SAFE_RADIUS);

  for (const entry of getBonfiresForMap(mapKey)) {
    for (let dy = -r; dy <= r; dy++) {
      for (let dx = -r; dx <= r; dx++) {
        if (dx * dx + dy * dy > BONFIRE_SAFE_RADIUS_SQ) continue;
        const tx = entry.tileX + dx;
        const ty = entry.tileY + dy;
        if (ty < 0 || ty >= h || tx < 0 || tx >= w) continue;
        const t = tiles[ty][tx];
        if (!t || !t.walkable || ENEMY_SANCTUARY_TILE_TYPES.has(t.type)) continue;
        if (t.type === 'bonfire' || t.type === 'bonfire_unlit') continue;
        tiles[ty][tx] = { ...t, enemyBlocked: true };
      }
    }
  }
}

export const BONFIRE_HOSTILES_NEAR_MESSAGE = 'Enemies draw near — the flame will not answer.';
