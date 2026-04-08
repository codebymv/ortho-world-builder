import { generateMap } from './src/data/mapGenerator.ts';
import { mapDefinitions } from './src/data/maps.ts';
const m = generateMap(mapDefinitions.forest);
for (const [x,y] of [[118,105],[119,105],[118,106],[119,106],[117,106]] as const) {
  const t = m.tiles[y][x];
  console.log(x, y, t.type, t.walkable, t.elevation);
}
