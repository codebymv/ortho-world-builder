import { useEffect, useRef } from 'react';
import { WorldMap } from '@/lib/game/World';
import { MapMarker } from '@/lib/game/MapMarkers';

interface MinimapProps {
  currentMap: WorldMap;
  currentMapId: string;
  playerPosition: { x: number; y: number };
  visitedTiles: Set<string>;
  npcs: Array<{ position: { x: number; y: number } }>;
  markers: MapMarker[];
  refreshToken: number;
}

const MARKER_TYPE_ICONS: Record<string, string> = {
  quest: '!',
  poi: '◆',
  danger: '⚠',
  npc: '●',
  portal: '▸',
};

export const Minimap = ({ currentMap, currentMapId, playerPosition, visitedTiles, npcs, markers, refreshToken }: MinimapProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animFrameRef = useRef<number>(0);

  // Animated render loop for pulsing markers
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const maxMinimapSize = 180;
    const scale = Math.max(1, Math.min(4, Math.floor(maxMinimapSize / Math.max(currentMap.width, currentMap.height))));
    canvas.width = currentMap.width * scale;
    canvas.height = currentMap.height * scale;

    let running = true;

    const draw = () => {
      if (!running) return;

      const now = Date.now();

      // Clear canvas
      ctx.fillStyle = '#111008';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Draw tiles
      for (let y = 0; y < currentMap.height; y++) {
        for (let x = 0; x < currentMap.width; x++) {
          const tile = currentMap.tiles[y][x];
          const tileKey = `${x},${y}`;
          const isVisited = visitedTiles.has(tileKey);

          if (isVisited) {
            let color = '#228B22';
            if (!tile.walkable) {
              if (tile.type === 'tree') color = '#006400';
              else if (tile.type === 'water') color = '#4169E1';
              else if (tile.type === 'stone') color = '#708090';
              else color = '#654321';
            } else if (tile.type === 'dirt') {
              color = '#8B7355';
            } else if (tile.type === 'stone') {
              color = '#A9A9A9';
            } else if (tile.type === 'portal') {
              color = '#9370DB';
            } else if (tile.type === 'cobblestone') {
              color = '#999999';
            }

            ctx.fillStyle = color;
            ctx.fillRect(x * scale, (currentMap.height - 1 - y) * scale, scale, scale);
          }
        }
      }

      // Draw markers for current map
      const currentMarkers = markers.filter(m => m.map === currentMapId);
      for (const marker of currentMarkers) {
        const mx = marker.tileX * scale;
        const my = (currentMap.height - 1 - marker.tileY) * scale;
        const isPulsing = now < marker.pulseUntil;
        const age = now - marker.createdAt;

        const cx = mx + scale / 2;
        const cy = my + scale / 2;

        // Glowing background circle (always visible)
        ctx.beginPath();
        ctx.arc(cx, cy, 4, 0, Math.PI * 2);
        ctx.fillStyle = marker.color;
        ctx.globalAlpha = 0.4;
        ctx.fill();
        ctx.globalAlpha = 1;

        // Bright center dot
        ctx.fillStyle = marker.color;
        const dotSize = Math.max(scale * 2, 3);
        ctx.fillRect(cx - dotSize / 2, cy - dotSize / 2, dotSize, dotSize);

        // Pulsing ring animation
        if (isPulsing) {
          const pulsePhase = (age % 1500) / 1500;
          const ringRadius = 4 + pulsePhase * 16;
          const ringAlpha = 1 - pulsePhase;

          ctx.beginPath();
          ctx.arc(cx, cy, ringRadius, 0, Math.PI * 2);
          ctx.strokeStyle = marker.color;
          ctx.globalAlpha = ringAlpha * 0.8;
          ctx.lineWidth = 2;
          ctx.stroke();
          ctx.globalAlpha = 1;

          // Second ring offset
          const pulsePhase2 = ((age + 750) % 1500) / 1500;
          const ringRadius2 = 4 + pulsePhase2 * 16;
          const ringAlpha2 = 1 - pulsePhase2;
          ctx.beginPath();
          ctx.arc(cx, cy, ringRadius2, 0, Math.PI * 2);
          ctx.globalAlpha = ringAlpha2 * 0.5;
          ctx.stroke();
          ctx.globalAlpha = 1;
        }
      }

      // Draw NPCs
      ctx.fillStyle = '#FFFF00';
      for (const npc of npcs) {
        const npcX = Math.floor(npc.position.x + currentMap.width / 2);
        const npcY = Math.floor(npc.position.y + currentMap.height / 2);
        ctx.fillRect(npcX * scale, (currentMap.height - 1 - npcY) * scale, scale, scale);
      }

      // Draw player
      const playerX = Math.floor(playerPosition.x + currentMap.width / 2);
      const playerY = Math.floor(playerPosition.y + currentMap.height / 2);
      ctx.fillStyle = '#FF0000';
      ctx.fillRect(playerX * scale - 1, (currentMap.height - 1 - playerY) * scale - 1, scale + 2, scale + 2);

      // Border
      ctx.strokeStyle = '#5C3A21';
      ctx.lineWidth = 2;
      ctx.strokeRect(0, 0, canvas.width, canvas.height);

      // Only keep animating if there are pulsing markers
      const hasPulsing = currentMarkers.some(m => now < m.pulseUntil);
      if (hasPulsing) {
        animFrameRef.current = requestAnimationFrame(draw);
      }
    };

    draw();

    return () => {
      running = false;
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [currentMap, currentMapId, playerPosition, visitedTiles, npcs, markers, refreshToken]);

  // Build legend from active markers on current map
  const currentMarkers = markers.filter(m => m.map === currentMapId);
  const now = Date.now();
  const recentMarkers = currentMarkers.filter(m => m.permanent || now - m.createdAt < 120000 || now < m.pulseUntil);

  return (
    <div className="fixed top-16 right-4 bg-[#1A0F0A]/85 backdrop-blur-sm p-1.5 rounded-sm border-2 border-[#5C3A21] shadow-md z-30 font-sans pointer-events-auto" style={{ maxWidth: '200px' }}>
      <div className="text-[#DAA520] text-xs mb-1 text-center font-bold uppercase tracking-wider">{currentMap.name}</div>
      <canvas
        ref={canvasRef}
        className="pixelated border-2 border-[#5C3A21] block"
        style={{ imageRendering: 'pixelated', maxWidth: '180px', maxHeight: '160px', width: '100%', height: 'auto' }}
      />
      {/* Marker legend */}
      {recentMarkers.length > 0 && (
        <div className="mt-1 space-y-0.5 max-h-16 overflow-y-auto">
          {recentMarkers.slice(0, 4).map(m => (
            <div key={m.id} className="flex items-center gap-1 text-[9px] leading-tight">
              <span
                className="inline-block w-2 h-2 rounded-full flex-shrink-0"
                style={{
                  backgroundColor: m.color,
                  boxShadow: now < m.pulseUntil ? `0 0 4px ${m.color}` : 'none',
                }}
              />
              <span className="text-[#DAA520] font-bold">{MARKER_TYPE_ICONS[m.type] || '◆'}</span>
              <span className="text-[#F5DEB3] truncate">{m.label}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
