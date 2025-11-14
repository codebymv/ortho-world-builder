import { useEffect, useRef } from 'react';
import { WorldMap } from '@/lib/game/World';

interface MinimapProps {
  currentMap: WorldMap;
  playerPosition: { x: number; y: number };
  visitedTiles: Set<string>;
  npcs: Array<{ position: { x: number; y: number } }>;
}

export const Minimap = ({ currentMap, playerPosition, visitedTiles, npcs }: MinimapProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const scale = 4; // pixels per tile
    canvas.width = currentMap.width * scale;
    canvas.height = currentMap.height * scale;

    // Clear canvas
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw tiles
    for (let y = 0; y < currentMap.height; y++) {
      for (let x = 0; x < currentMap.width; x++) {
        const tile = currentMap.tiles[y][x];
        const tileKey = `${x},${y}`;
        const isVisited = visitedTiles.has(tileKey);

        if (isVisited) {
          // Color code tiles
          let color = '#228B22'; // grass
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
          }

          ctx.fillStyle = color;
          ctx.fillRect(x * scale, y * scale, scale, scale);
        }
      }
    }

    // Draw NPCs
    ctx.fillStyle = '#FFFF00';
    for (const npc of npcs) {
      const npcX = Math.floor(npc.position.x + currentMap.width / 2);
      const npcY = Math.floor(npc.position.y + currentMap.height / 2);
      ctx.fillRect(npcX * scale, npcY * scale, scale, scale);
    }

    // Draw player
    const playerX = Math.floor(playerPosition.x + currentMap.width / 2);
    const playerY = Math.floor(playerPosition.y + currentMap.height / 2);
    ctx.fillStyle = '#FF0000';
    ctx.fillRect(playerX * scale - 1, playerY * scale - 1, scale + 2, scale + 2);

    // Border
    ctx.strokeStyle = '#FFFFFF';
    ctx.lineWidth = 2;
    ctx.strokeRect(0, 0, canvas.width, canvas.height);
  }, [currentMap, playerPosition, visitedTiles, npcs]);

  return (
    <div className="absolute top-4 right-4 bg-black/80 p-2 rounded-lg border-2 border-primary/50">
      <div className="text-white text-xs mb-1 text-center font-bold">{currentMap.name}</div>
      <canvas
        ref={canvasRef}
        className="pixelated"
        style={{ imageRendering: 'pixelated' }}
      />
    </div>
  );
};
