import * as THREE from 'three';
import type { TileType, WorldMap } from '@/lib/game/World';
import type { GameState } from '@/lib/game/GameState';

/**
 * Heresy altars: corrupted shrines hidden off the main progression spine.
 * Two hits to destroy; each yields +1 cursed sediment.
 *
 * State model:
 *   - First hit  → swap tile to heresy_altar_cracked, set flag `altar_hit_<mapId>_<x>_<y>`
 *   - Second hit → replace tile with hollow_blight (walkable), +1 cursed sediment,
 *                  set flag `altar_destroyed_<mapId>_<x>_<y>`, emit violet burst.
 */
const SEDIMENT_PARTICLE_COLOR = 0xCC44FF;
const HIT_PARTICLE_COLOR = 0x7A1F8C;

export interface AltarWorld {
  getCurrentMap(): WorldMap;
  refreshMapTileRegion(minTX: number, minTY: number, maxTX: number, maxTY: number): void;
}

interface AltarParticles {
  emit(position: THREE.Vector3, count: number, color: number, lifetime: number, speed: number, spread: number): void;
}

const _tmp = new THREE.Vector3();

function hitFlagKey(mapId: string, tx: number, ty: number): string {
  return `altar_hit_${mapId}_${tx}_${ty}`;
}

function destroyedFlagKey(mapId: string, tx: number, ty: number): string {
  return `altar_destroyed_${mapId}_${tx}_${ty}`;
}

function isAltarTile(type: TileType): boolean {
  return type === 'heresy_altar' || type === 'heresy_altar_cracked';
}

/**
 * Sweep heresy_altar / heresy_altar_cracked tiles within radius and apply one hit each.
 * Returns the number of altars destroyed this swing.
 */
export function damageHeresyAltarsInRadius(
  state: GameState,
  world: AltarWorld,
  map: WorldMap,
  worldX: number,
  worldY: number,
  radius: number,
  particles: AltarParticles,
  playPropBreak?: () => void,
  notify?: (message: string, options?: { id?: string; type?: 'success' | 'info'; description?: string; duration?: number }) => void,
): number {
  const cx = worldX + map.width / 2;
  const cy = worldY + map.height / 2;
  const r = radius + 0.5;

  const minTX = Math.max(0, Math.floor(cx - r));
  const maxTX = Math.min(map.width - 1, Math.floor(cx + r));
  const minTY = Math.max(0, Math.floor(cy - r));
  const maxTY = Math.min(map.height - 1, Math.floor(cy + r));

  const rSq = radius * radius;
  let destroyedCount = 0;

  for (let ty = minTY; ty <= maxTY; ty++) {
    for (let tx = minTX; tx <= maxTX; tx++) {
      const dx = (tx + 0.5) - cx;
      const dy = (ty + 0.5) - cy;
      if (dx * dx + dy * dy > rSq) continue;

      const tile = map.tiles[ty]?.[tx];
      if (!tile || !isAltarTile(tile.type)) continue;

      const mapId = state.currentMap;
      const tileWorldX = tx - map.width / 2 + 0.5;
      const tileWorldY = ty - map.height / 2 + 0.5;

      const alreadyHit = state.getFlag(hitFlagKey(mapId, tx, ty));
      if (!alreadyHit) {
        // First hit — crack the altar visually.
        state.setFlag(hitFlagKey(mapId, tx, ty), true);
        map.tiles[ty][tx] = {
          type: 'heresy_altar_cracked' as TileType,
          walkable: false,
          elevation: tile.elevation ?? 0,
        };
        world.refreshMapTileRegion(tx - 1, ty - 1, tx + 1, ty + 1);
        _tmp.set(tileWorldX, tileWorldY, 0.45);
        particles.emit(_tmp.clone(), 6, HIT_PARTICLE_COLOR, 0.5, 1.2, 0.9);
        playPropBreak?.();
        continue;
      }

      // Second hit — destroy.
      map.tiles[ty][tx] = {
        type: 'hollow_blight' as TileType,
        walkable: true,
        elevation: tile.elevation ?? 0,
      };
      state.setFlag(destroyedFlagKey(mapId, tx, ty), true);
      world.refreshMapTileRegion(tx - 1, ty - 1, tx + 1, ty + 1);

      state.addCursedSediment(1);

      _tmp.set(tileWorldX, tileWorldY, 0.5);
      particles.emit(_tmp.clone(), 18, SEDIMENT_PARTICLE_COLOR, 1.0, 2.2, 1.6);
      particles.emit(_tmp.clone(), 8, HIT_PARTICLE_COLOR, 0.7, 1.4, 1.2);
      playPropBreak?.();

      notify?.('Heresy altar shattered', {
        id: `heresy-altar-destroy-${tx}-${ty}`,
        type: 'success',
        description: 'Cursed sediment drifts to you.',
        duration: 2400,
      });

      destroyedCount++;
    }
  }

  return destroyedCount;
}

/**
 * Apply persisted altar state when (re)entering a map:
 *   - destroyed flag → hollow_blight
 *   - hit flag only  → heresy_altar_cracked
 */
export function syncHeresyAltarsForMap(state: GameState, map: WorldMap, mapId: string): void {
  for (let ty = 0; ty < map.height; ty++) {
    const row = map.tiles[ty];
    if (!row) continue;
    for (let tx = 0; tx < map.width; tx++) {
      const tile = row[tx];
      if (!tile || !isAltarTile(tile.type)) continue;
      if (state.getFlag(destroyedFlagKey(mapId, tx, ty))) {
        row[tx] = {
          type: 'hollow_blight' as TileType,
          walkable: true,
          elevation: tile.elevation ?? 0,
        };
      } else if (state.getFlag(hitFlagKey(mapId, tx, ty))) {
        row[tx] = {
          type: 'heresy_altar_cracked' as TileType,
          walkable: false,
          elevation: tile.elevation ?? 0,
        };
      }
    }
  }
}
