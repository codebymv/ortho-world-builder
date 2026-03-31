export interface ParsedVisitedTileKey {
  mapId: string | null;
  x: number;
  y: number;
}

export function makeVisitedTileKey(mapId: string, x: number, y: number): string {
  return `${mapId}|${x},${y}`;
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
