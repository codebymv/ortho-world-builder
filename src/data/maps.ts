import { WorldMap, Tile } from '@/lib/game/World';

const createTile = (type: Tile['type'], walkable: boolean = true, interactable: boolean = false, interactionId?: string): Tile => ({
  type,
  walkable,
  interactable,
  interactionId,
});

export const villageMap: WorldMap = {
  name: 'Village',
  width: 30,
  height: 20,
  spawnPoint: { x: 15, y: 10 },
  tiles: [
    // Row 0-3: Forest border with trees
    ...Array(3).fill(null).map(() => 
      Array(30).fill(null).map((_, x) => 
        x < 2 || x > 27 ? createTile('tree', false) : createTile('grass')
      )
    ),
    
    // Row 4: Village entrance
    Array(30).fill(null).map((_, x) => {
      if (x < 2 || x > 27) return createTile('tree', false);
      if (x === 10) return createTile('stone', true, true, 'village_sign');
      return createTile('dirt');
    }),

    // Row 5: Village square
    Array(30).fill(null).map((_, x) => {
      if (x < 2 || x > 27) return createTile('tree', false);
      if (x === 15) return createTile('chest', true, true, 'chest_1');
      return createTile('dirt');
    }),

    // Rows 6-8: Houses and NPCs
    Array(30).fill(null).map((_, x) => {
      if (x < 2 || x > 27) return createTile('tree', false);
      if (x === 5 || x === 25) return createTile('house', false);
      if (x === 8) return createTile('rock', false);
      return createTile('grass');
    }),
    
    Array(30).fill(null).map((_, x) => {
      if (x < 2 || x > 27) return createTile('tree', false);
      if (x === 15) return createTile('dirt');
      return createTile('grass');
    }),

    Array(30).fill(null).map((_, x) => {
      if (x < 2 || x > 27) return createTile('tree', false);
      if (x === 10 || x === 20) return createTile('tree', false);
      return createTile('grass');
    }),

    // Rows 9-11: Central area with well
    Array(30).fill(null).map((_, x) => {
      if (x < 2 || x > 27) return createTile('tree', false);
      if (x === 15) return createTile('water', false, true, 'well');
      if (x === 12 || x === 18) return createTile('rock', false);
      return createTile('grass');
    }),

    Array(30).fill(null).map((_, x) => {
      if (x < 2 || x > 27) return createTile('tree', false);
      if (x === 15) return createTile('water', false);
      return createTile('grass');
    }),

    Array(30).fill(null).map((_, x) => {
      if (x < 2 || x > 27) return createTile('tree', false);
      if (x === 5) return createTile('tree', false);
      if (x === 25) return createTile('tree', false);
      return createTile('grass');
    }),

    // Rows 12-15: More buildings
    Array(30).fill(null).map((_, x) => {
      if (x < 2 || x > 27) return createTile('tree', false);
      if (x === 8 || x === 22) return createTile('house', false);
      return createTile('grass');
    }),

    Array(30).fill(null).map((_, x) => {
      if (x < 2 || x > 27) return createTile('tree', false);
      if (x === 15) return createTile('dirt');
      return createTile('grass');
    }),

    Array(30).fill(null).map((_, x) => {
      if (x < 2 || x > 27) return createTile('tree', false);
      if (x === 15) return createTile('dirt');
      if (x === 10 || x === 20) return createTile('tree', false);
      return createTile('grass');
    }),

    Array(30).fill(null).map((_, x) => {
      if (x < 2 || x > 27) return createTile('tree', false);
      if (x === 15) return createTile('dirt');
      return createTile('grass');
    }),

    // Row 16: Exit path
    Array(30).fill(null).map((_, x) => {
      if (x < 2 || x > 27) return createTile('tree', false);
      if (x === 15) return createTile('dirt');
      if (x === 5 || x === 25) return createTile('rock', false);
      return createTile('grass');
    }),

    // Rows 17-19: Forest border
    ...Array(4).fill(null).map(() => 
      Array(30).fill(null).map((_, x) => 
        x < 2 || x > 27 ? createTile('tree', false) : createTile('grass')
      )
    ),
  ],
};
