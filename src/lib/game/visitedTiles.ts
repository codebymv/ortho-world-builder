export interface ParsedVisitedTileKey {
  mapId: string | null;
  x: number;
  y: number;
}

export function makeVisitedTileKey(mapId: string, x: number, y: number): string {
  return `${mapId}|${x},${y}`;
}

/**
 * Reveal all tiles in a map by adding them to the visited set.
 * Used when a boss is defeated in an arena to fully reveal the map.
 */
export function revealAllTilesForMap(visitedTiles: Set<string>, mapId: string, mapWidth: number, mapHeight: number): void {
  for (let y = 0; y < mapHeight; y++) {
    for (let x = 0; x < mapWidth; x++) {
      visitedTiles.add(makeVisitedTileKey(mapId, x, y));
    }
  }
}

export function parseVisitedTileKey(key: string): ParsedVisitedTileKey | null {
  const pipe = key.indexOf('|');
  const coords = pipe >= 0 ? key.slice(pipe + 1) : key;
  const comma = coords.indexOf(',');
  if (comma <= 0) return null;

  const x = +coords.slice(0, comma);
  const y = +coords.slice(comma + 1);
  if (!Number.isFinite(x) || !Number.isFinite(y)) return null;

  return {
    mapId: pipe >= 0 ? key.slice(0, pipe) : null,
    x,
    y,
  };
}
