import { mapDefinitions } from '../src/data/maps.ts';
import { generateMap } from '../src/data/mapGenerator.ts';

const map = generateMap(mapDefinitions.forest);

function getTile(x: number, y: number) {
  const tileX = Math.floor(x + map.width / 2);
  const tileY = Math.floor(y + map.height / 2);
  if (tileX < 0 || tileX >= map.width || tileY < 0 || tileY >= map.height) return null;
  return map.tiles[tileY][tileX];
}

type MapTile = ReturnType<typeof generateMap>['tiles'][number][number] | null;

function isTileWalkable(tile: MapTile) {
  if (!tile) return false;
  if (tile.transition) return true;
  return !!tile.walkable;
}

function canStepBetween(fromTile: MapTile, toTile: MapTile) {
  if (!toTile || !isTileWalkable(toTile)) return false;
  const fromElevation = fromTile?.elevation ?? 0;
  const toElevation = toTile.elevation ?? 0;
  if (fromElevation === toElevation) return true;
  if (fromTile?.transition || toTile.transition) return true;
  const connectsLevels =
    fromTile?.type === 'stairs' ||
    toTile.type === 'stairs' ||
    fromTile?.type === 'ladder' ||
    toTile.type === 'ladder';
  if (connectsLevels) return Math.abs(toElevation - fromElevation) <= 1;
  if (Math.abs(toElevation - fromElevation) <= 1) return true;
  return false;
}

function canMoveTo(fromX: number, fromY: number, toX: number, toY: number, r = 0): boolean {
  if (r === 0) return canStepBetween(getTile(fromX, fromY), getTile(toX, toY));
  return canMoveTo(fromX - r, fromY - r, toX - r, toY - r) &&
    canMoveTo(fromX + r, fromY - r, toX + r, toY - r) &&
    canMoveTo(fromX - r, fromY + r, toX - r, toY + r) &&
    canMoveTo(fromX + r, fromY + r, toX + r, toY + r);
}

function worldCenter(tileX: number, tileY: number) {
  return { x: tileX - map.width / 2 + 0.5, y: tileY - map.height / 2 + 0.5 };
}

console.log('Pad tile accessibility from east by center point:');
for (let tileY = 186; tileY <= 191; tileY++) {
  for (let tileX = 136; tileX <= 140; tileX++) {
    const center = worldCenter(tileX, tileY);
    const from = worldCenter(tileX + 1, tileY);
    const ok = canMoveTo(from.x, from.y, center.x, center.y, 0.2);
    const t = map.tiles[tileY][tileX];
    console.log(`${tileX},${tileY} ${t.type} walk=${t.walkable} elev=${t.elevation} from east => ${ok}`);
  }
}

console.log('\nDetailed corner samples for 139,189 from east:');
const target = worldCenter(139, 189);
const from = worldCenter(140, 189);
const r = 0.2;
for (const [label, ox, oy] of [
  ['tl', -r, -r],
  ['tr', r, -r],
  ['bl', -r, r],
  ['br', r, r],
] as const) {
  const fx = from.x + ox;
  const fy = from.y + oy;
  const tx = target.x + ox;
  const ty = target.y + oy;
  const ft = getTile(fx, fy);
  const tt = getTile(tx, ty);
  console.log(label, 'from', fx.toFixed(2), fy.toFixed(2), ft?.type, ft?.walkable, ft?.elevation, '-> to', tx.toFixed(2), ty.toFixed(2), tt?.type, tt?.walkable, tt?.elevation, 'ok', canStepBetween(ft, tt));
}
