import { generateMap } from '../src/data/mapGenerator.ts';
import { mapDefinitions } from '../src/data/maps.ts';
import type { Tile } from '../src/lib/game/World.ts';
const m = generateMap(mapDefinitions.forest);
function sym(t: Tile): string {
  if (t.type === 'cliff') return '#';
  if (t.type === 'cliff_edge') return '^';
  if (t.type === 'stairs') return '=';
  if (t.type === 'chest') return '$';
  if (t.type === 'dirt') return '.';
  if (t.type === 'stone') return 'S';
  if (t.type === 'gate') return 'G';
  if (t.type === 'cobblestone') return 'c';
  if (t.type === 'grass') return 'g';
  if (t.type === 'water') return '~';
  if (t.type === 'tree') return 'T';
  if (t.type === 'fence') return 'f';
  if (t.type === 'iron_fence') return 'F';
  if (t.type === 'campfire' || t.type === 'bonfire' || t.type === 'bonfire_unlit') return 'B';
  if (t.type === 'rock') return 'R';
  if (t.type === 'sign') return 's';
  if (t.type === 'lantern') return 'L';
  if (t.type === 'barrel') return 'r';
  if (t.type === 'crate') return 'C';
  return t.type[0];
}
// wide view of the south fort shelf region
for (let y = 183; y <= 215; y++) {
  let r = `${y}: `;
  for (let x = 44; x <= 92; x++) {
    const t = m.tiles[y][x];
    r += sym(t);
  }
  console.log(r);
}
