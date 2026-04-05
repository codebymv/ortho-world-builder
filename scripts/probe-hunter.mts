import { generateMap } from '../src/data/mapGenerator.ts';
import { mapDefinitions } from '../src/data/maps.ts';
const m = generateMap(mapDefinitions.forest);

// Show the full corridor from spine (x~146) to hunter cottage (x~134-140), y=178-215
// to visualise what the player actually walks through
console.log('=== Hunter approach corridor x=122-148, y=178-215 ===');
console.log('(W=walkable X=blocked  T=has transition  I=interactable)');
console.log('     ' + Array.from({length:27},(_,i)=>(122+i).toString().padStart(3)).join(''));
for (let y = 178; y <= 215; y++) {
  const cols: string[] = [];
  for (let x = 122; x <= 148; x++) {
    const t = m.tiles[y]?.[x];
    if (!t) { cols.push('  ?'); continue; }
    let c = t.walkable ? 'W' : 'X';
    if (t.transition) c = 'T';
    if (t.interactable && t.interactionId !== 'building_entrance') c = 'I';
    if (t.interactionId === 'building_entrance') c = 'E';
    cols.push('  ' + c);
  }
  console.log(`y=${y.toString().padStart(3)} ${cols.join('')}`);
}
