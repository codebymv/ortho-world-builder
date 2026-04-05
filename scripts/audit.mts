import { generateMap } from '../src/data/mapGenerator.ts';
import { mapDefinitions } from '../src/data/maps.ts';

const maps = ['forest', 'village'] as const;
for (const mapId of maps) {
  const m = generateMap(mapDefinitions[mapId]);
  // Collect unique entrance tiles (deduplicate frontY / entryY of same target)
  const seen = new Set<string>();
  for (let y = 0; y < m.height; y++) {
    for (let x = 0; x < m.width; x++) {
      const t = m.tiles[y][x];
      if (t.interactionId !== 'building_entrance' || !t.transition) continue;
      const key = `${t.transition.targetMap}:${x}`;
      if (seen.has(key)) continue;
      seen.add(key);
      // Check approach tiles walking south (player coming from large-y side)
      const approach: string[] = [];
      for (let d = 1; d <= 6; d++) {
        const n = m.tiles[y + d]?.[x];
        if (!n) break;
        approach.push(`${n.walkable ? 'W' : 'X'}:${n.type.slice(0, 10)}`);
      }
      // Check 2 tiles north (should be blocked / foundation)
      const north: string[] = [];
      for (let d = 1; d <= 2; d++) {
        const n = m.tiles[y - d]?.[x];
        if (!n) break;
        north.push(`${n.walkable ? 'W' : 'X'}:${n.type.slice(0, 10)}`);
      }
      const northWalkable = north.some(s => s.startsWith('W'));
      const firstDirtApproach = approach.findIndex(s => s.startsWith('W:dirt') || s.startsWith('W:sand') || s.startsWith('W:cobblest'));
      console.log(
        `[${mapId}] (${x},${y}) → ${t.transition.targetMap}`,
        `| N blocked: ${!northWalkable}`,
        `| approach: ${approach.slice(0, 5).join(' ')}`,
        `| first dirt at d+${firstDirtApproach + 1}`
      );
    }
  }
}
