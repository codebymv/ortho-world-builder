import type { WorldMap, Tile } from '@/lib/game/World';
import type { GameState } from '@/lib/game/GameState';
import type { MapMarker } from '@/lib/game/MapMarkers';

export const MARKER_TYPE_ICONS: Record<string, string> = {
  quest: '!',
  poi: '◆',
  danger: '⚠',
  npc: '●',
  portal: '▸',
};

/** Short labels for compact HUD legend */
export const MARKER_TYPE_SHORT: Record<string, string> = {
  quest: 'Quest',
  poi: 'POI',
  danger: 'Danger',
  npc: 'NPC',
  portal: 'Gate',
};

/** Readable names for full map modal */
export const MARKER_TYPE_NAMES: Record<string, string> = {
  quest: 'Objective',
  poi: 'Place of interest',
  danger: 'Hazard',
  npc: 'Character',
  portal: 'Passage',
};

export function tileColorForMinimap(tile: Tile): string {
  if (!tile.walkable) {
    if (tile.type === 'tree') return '#1a5c1a';
    if (tile.type === 'water') return '#2a4a9a';
    if (tile.type === 'stone') return '#5a6570';
    return '#4a3520';
  }
  if (tile.type === 'dirt') return '#7a6445';
  if (tile.type === 'stone') return '#8a8a8a';
  if (tile.type === 'portal') return '#8060c0';
  if (tile.type === 'cobblestone') return '#808080';
  if (tile.type === 'sand') return '#c0a870';
  if (tile.type === 'farmland' || tile.type === 'wheat') return '#8a7a30';
  return '#228B22';
}

export function computeMinimapScale(
  mapWidth: number,
  mapHeight: number,
  maxAxisPixels: number,
  minScale = 1,
  maxScale = 16
): number {
  const dim = Math.max(mapWidth, mapHeight);
  const s = Math.floor(maxAxisPixels / dim);
  return Math.max(minScale, Math.min(maxScale, s));
}

/** Pick largest integer scale so the full map fits inside maxWidth × maxHeight (HUD / modal). */
export function computeMinimapScaleToFit(
  mapWidth: number,
  mapHeight: number,
  maxWidth: number,
  maxHeight: number,
  minScale = 1,
  maxScale = 16
): number {
  if (maxWidth < 8 || maxHeight < 8) return minScale;
  const sx = Math.floor(maxWidth / mapWidth);
  const sy = Math.floor(maxHeight / mapHeight);
  const s = Math.min(sx, sy, maxScale);
  return Math.max(minScale, s);
}

export interface DrawMinimapParams {
  ctx: CanvasRenderingContext2D;
  currentMap: WorldMap;
  currentMapId: string;
  state: GameState;
  visited: Set<string>;
  markers: MapMarker[];
  scale: number;
  nowMs: number;
}

/**
 * Single source of truth for minimap + full map canvas rendering.
 */
export function drawMinimapContent(p: DrawMinimapParams): void {
  const { ctx, currentMap, currentMapId, state, visited, markers, scale, nowMs } = p;
  const w = currentMap.width;
  const h = currentMap.height;
  const tiles = currentMap.tiles;

  const playerPosition = state.player.position;
  const npcs = state.npcs;

  ctx.fillStyle = '#0a0806';
  ctx.fillRect(0, 0, w * scale, h * scale);

  for (const tileKey of visited) {
    const comma = tileKey.indexOf(',');
    if (comma <= 0) continue;
    const x = +tileKey.slice(0, comma);
    const y = +tileKey.slice(1 + comma);
    if (x < 0 || y < 0 || x >= w || y >= h) continue;
    const tile = tiles[y]?.[x];
    if (!tile) continue;
    ctx.fillStyle = tileColorForMinimap(tile);
    ctx.fillRect(x * scale, (h - 1 - y) * scale, scale, scale);
  }

  for (const marker of markers) {
    const mx = marker.tileX * scale;
    const my = (h - 1 - marker.tileY) * scale;
    const isPulsing = nowMs < marker.pulseUntil;

    const cx = mx + scale / 2;
    const cy = my + scale / 2;

    ctx.beginPath();
    ctx.arc(cx, cy, Math.max(6, scale * 0.9), 0, Math.PI * 2);
    ctx.fillStyle = marker.color;
    ctx.globalAlpha = 0.25;
    ctx.fill();
    ctx.globalAlpha = 1;

    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(Math.PI / 4);
    const markerSize = Math.max(scale * 1.5, 4);
    ctx.fillStyle = marker.color;
    ctx.fillRect(-markerSize / 2, -markerSize / 2, markerSize, markerSize);
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = Math.max(1, scale >= 6 ? 2 : 1);
    ctx.globalAlpha = 0.65;
    ctx.strokeRect(-markerSize / 2, -markerSize / 2, markerSize, markerSize);
    ctx.globalAlpha = 1;
    ctx.restore();

    if (isPulsing) {
      const age = nowMs - marker.createdAt;
      for (let ring = 0; ring < 2; ring++) {
        const pulsePhase = ((age + ring * 750) % 1500) / 1500;
        const ringRadius = 5 + pulsePhase * (scale >= 6 ? 28 : 20);
        const ringAlpha = (1 - pulsePhase) * 0.7;

        ctx.beginPath();
        ctx.arc(cx, cy, ringRadius, 0, Math.PI * 2);
        ctx.strokeStyle = marker.color;
        ctx.globalAlpha = ringAlpha;
        ctx.lineWidth = scale >= 6 ? 3 : 2.5;
        ctx.stroke();
        ctx.globalAlpha = 1;
      }
    }
  }

  const stain = state.droppedEssence;
  if (stain && stain.mapId === currentMapId && stain.amount > 0) {
    const ex = Math.floor(stain.x + w / 2);
    const ey = Math.floor(stain.y + h / 2);
    const essX = ex * scale + scale / 2;
    const essY = (h - 1 - ey) * scale + scale / 2;
    const pulse = 0.55 + Math.sin(nowMs / 400) * 0.45;
    const r = Math.max(scale + 2, scale >= 6 ? 8 : 5);
    ctx.beginPath();
    ctx.arc(essX, essY, r, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(186,104,255,${0.5 * pulse})`;
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.55)';
    ctx.lineWidth = scale >= 6 ? 2 : 1;
    ctx.stroke();
  }

  for (const npc of npcs) {
    const npcX = Math.floor(npc.position.x + w / 2);
    const npcY = Math.floor(npc.position.y + h / 2);
    const nx = npcX * scale + scale / 2;
    const ny = (h - 1 - npcY) * scale + scale / 2;

    ctx.beginPath();
    ctx.arc(nx, ny, Math.max(scale, scale >= 6 ? 5 : 3), 0, Math.PI * 2);
    ctx.fillStyle = '#FFD700';
    ctx.fill();
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 1;
    ctx.globalAlpha = 0.5;
    ctx.stroke();
    ctx.globalAlpha = 1;
  }

  const playerX = Math.floor(playerPosition.x + w / 2);
  const playerY = Math.floor(playerPosition.y + h / 2);
  const px = playerX * scale + scale / 2;
  const py = (h - 1 - playerY) * scale + scale / 2;
  const playerPulse = 0.7 + Math.sin(nowMs / 400) * 0.3;

  ctx.beginPath();
  ctx.arc(px, py, Math.max(scale + 3, scale >= 6 ? 10 : 6), 0, Math.PI * 2);
  ctx.fillStyle = '#4488ff';
  ctx.globalAlpha = 0.25 * playerPulse;
  ctx.fill();
  ctx.globalAlpha = 1;

  const playerSize = Math.max(scale + 2, scale >= 6 ? 8 : 5);
  ctx.fillStyle = '#4488ff';
  ctx.beginPath();
  ctx.arc(px, py, playerSize, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(px, py, playerSize * 0.5, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = '#3a2812';
  ctx.lineWidth = scale >= 6 ? 3 : 2;
  ctx.strokeRect(0, 0, w * scale, h * scale);
}
