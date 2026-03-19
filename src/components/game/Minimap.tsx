import React, { useEffect, useRef, memo } from 'react';
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

export const Minimap = memo(({ currentMap, currentMapId, playerPosition, visitedTiles, npcs, markers, refreshToken }: MinimapProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animFrameRef = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const maxMinimapSize = 200;
    const scale = Math.max(1, Math.min(4, Math.floor(maxMinimapSize / Math.max(currentMap.width, currentMap.height))));
    canvas.width = currentMap.width * scale;
    canvas.height = currentMap.height * scale;

    let running = true;

    const draw = () => {
      if (!running) return;

      const now = Date.now();

      // Dark background
      ctx.fillStyle = '#0a0806';
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
              if (tile.type === 'tree') color = '#1a5c1a';
              else if (tile.type === 'water') color = '#2a4a9a';
              else if (tile.type === 'stone') color = '#5a6570';
              else color = '#4a3520';
            } else if (tile.type === 'dirt') {
              color = '#7a6445';
            } else if (tile.type === 'stone') {
              color = '#8a8a8a';
            } else if (tile.type === 'portal') {
              color = '#8060c0';
            } else if (tile.type === 'cobblestone') {
              color = '#808080';
            } else if (tile.type === 'sand') {
              color = '#c0a870';
            } else if (tile.type === 'farmland' || tile.type === 'wheat') {
              color = '#8a7a30';
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

        const cx = mx + scale / 2;
        const cy = my + scale / 2;

        // Outer glow (always)
        ctx.beginPath();
        ctx.arc(cx, cy, 6, 0, Math.PI * 2);
        ctx.fillStyle = marker.color;
        ctx.globalAlpha = 0.25;
        ctx.fill();
        ctx.globalAlpha = 1;

        // Main marker — diamond shape for better visibility
        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate(Math.PI / 4);
        const markerSize = Math.max(scale * 1.5, 4);
        ctx.fillStyle = marker.color;
        ctx.fillRect(-markerSize / 2, -markerSize / 2, markerSize, markerSize);
        // White border
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1;
        ctx.globalAlpha = 0.6;
        ctx.strokeRect(-markerSize / 2, -markerSize / 2, markerSize, markerSize);
        ctx.globalAlpha = 1;
        ctx.restore();

        // Pulsing rings
        if (isPulsing) {
          const age = now - marker.createdAt;
          for (let ring = 0; ring < 2; ring++) {
            const pulsePhase = ((age + ring * 750) % 1500) / 1500;
            const ringRadius = 5 + pulsePhase * 20;
            const ringAlpha = (1 - pulsePhase) * 0.7;

            ctx.beginPath();
            ctx.arc(cx, cy, ringRadius, 0, Math.PI * 2);
            ctx.strokeStyle = marker.color;
            ctx.globalAlpha = ringAlpha;
            ctx.lineWidth = 2.5;
            ctx.stroke();
            ctx.globalAlpha = 1;
          }
        }
      }

      // Draw NPCs — yellow dots with outline
      for (const npc of npcs) {
        const npcX = Math.floor(npc.position.x + currentMap.width / 2);
        const npcY = Math.floor(npc.position.y + currentMap.height / 2);
        const nx = npcX * scale + scale / 2;
        const ny = (currentMap.height - 1 - npcY) * scale + scale / 2;
        
        ctx.beginPath();
        ctx.arc(nx, ny, Math.max(scale, 3), 0, Math.PI * 2);
        ctx.fillStyle = '#FFD700';
        ctx.fill();
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 1;
        ctx.globalAlpha = 0.5;
        ctx.stroke();
        ctx.globalAlpha = 1;
      }

      // Draw player — larger, with pulsing outline
      const playerX = Math.floor(playerPosition.x + currentMap.width / 2);
      const playerY = Math.floor(playerPosition.y + currentMap.height / 2);
      const px = playerX * scale + scale / 2;
      const py = (currentMap.height - 1 - playerY) * scale + scale / 2;
      const playerPulse = 0.7 + Math.sin(now / 400) * 0.3;
      
      // Outer glow
      ctx.beginPath();
      ctx.arc(px, py, Math.max(scale + 3, 6), 0, Math.PI * 2);
      ctx.fillStyle = '#4488ff';
      ctx.globalAlpha = 0.25 * playerPulse;
      ctx.fill();
      ctx.globalAlpha = 1;

      // Player arrow/chevron shape pointing in movement direction
      const playerSize = Math.max(scale + 2, 5);
      ctx.fillStyle = '#4488ff';
      ctx.beginPath();
      ctx.arc(px, py, playerSize, 0, Math.PI * 2);
      ctx.fill();

      // White center
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(px, py, playerSize * 0.5, 0, Math.PI * 2);
      ctx.fill();

      // Border
      ctx.strokeStyle = '#3a2812';
      ctx.lineWidth = 2;
      ctx.strokeRect(0, 0, canvas.width, canvas.height);

      // Re-animate if pulsing markers exist
      const hasPulsing = currentMarkers.some(m => now < m.pulseUntil);
      if (hasPulsing || true) { // always animate for player pulse
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
    <div className="fixed top-16 right-4 bg-[#1A0F0A]/90 backdrop-blur-sm p-2 rounded-sm border-2 border-[#5C3A21] shadow-lg z-30 font-sans pointer-events-auto" style={{ maxWidth: '220px', maxHeight: '340px', overflowY: 'auto' }}>
      <div className="text-[#DAA520] text-xs mb-1.5 text-center font-bold uppercase tracking-wider">{currentMap.name}</div>
      <canvas
        ref={canvasRef}
        className="pixelated border-2 border-[#3a2812] block rounded-sm"
        style={{ imageRendering: 'pixelated', maxWidth: '200px', maxHeight: '180px', width: '100%', height: 'auto' }}
      />
      {/* Marker legend */}
      {recentMarkers.length > 0 && (
        <div className="mt-2 space-y-1">
          {recentMarkers.slice(0, 8).map(m => {
            const isPulsing = Date.now() < m.pulseUntil;
            return (
              <div key={m.id} className="flex items-center gap-2 text-[11px] leading-tight">
                <span
                  className={`inline-block w-3 h-3 flex-shrink-0 rounded-sm ${isPulsing ? 'animate-pulse' : ''}`}
                  style={{
                    backgroundColor: m.color,
                    boxShadow: isPulsing ? `0 0 6px ${m.color}` : `0 0 2px ${m.color}80`,
                  }}
                />
                <span className="text-[#DAA520] font-bold text-[10px] w-3 flex-shrink-0">{MARKER_TYPE_ICONS[m.type] || '◆'}</span>
                <span className="text-[#F5DEB3] truncate font-medium">{m.label}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
});