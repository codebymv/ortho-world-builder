import { WorldMap, Tile } from '@/lib/game/World';

const createTile = (
  type: Tile['type'], 
  walkable: boolean = true, 
  interactable: boolean = false, 
  interactionId?: string,
  transition?: Tile['transition']
): Tile => ({
  type,
  walkable,
  interactable,
  interactionId,
  transition,
});

// ============= VILLAGE: Cozy Starting Town =============
export const villageMap: WorldMap = {
  name: 'Greenleaf Village',
  width: 35,
  height: 25,
  spawnPoint: { x: 17, y: 20 },
  tiles: [
    Array(35).fill(null).map(() => createTile('tree', false)),
    Array(35).fill(null).map((_, x) => {
      if (x < 15 || x > 19) return createTile('tree', false);
      if (x === 16 || x === 18) return createTile('stone', false);
      if (x === 17) return createTile('portal', true, false, undefined, { targetMap: 'forest', targetX: 15, targetY: 17 });
      return createTile('dirt');
    }),
    ...Array(2).fill(null).map(() =>
      Array(35).fill(null).map((_, x) => {
        if (x < 3 || x > 31) return createTile('tree', false);
        if (x >= 16 && x <= 18) return createTile('dirt');
        if (x === 10 || x === 24) return createTile('tree', false);
        return createTile('grass');
      })
    ),
    Array(35).fill(null).map((_, x) => {
      if (x < 3 || x > 31) return createTile('tree', false);
      if (x === 15 || x === 19) return createTile('stone', true, true, 'village_sign');
      if (x >= 16 && x <= 18) return createTile('dirt');
      if (x === 8 || x === 26) return createTile('flower', true);
      return createTile('grass');
    }),
    ...Array(2).fill(null).map(() =>
      Array(35).fill(null).map((_, x) => {
        if (x < 3 || x > 31) return createTile('tree', false);
        if (x === 5 || x === 9) return createTile('house', false);
        if (x >= 16 && x <= 18) return createTile('dirt');
        if (x === 6 || x === 7) return createTile('flower', true);
        return createTile('grass');
      })
    ),
    Array(35).fill(null).map((_, x) => {
      if (x < 3 || x > 31) return createTile('tree', false);
      if (x === 11 || x === 13) return createTile('stone', true, true, 'market_stall');
      if (x >= 16 && x <= 18) return createTile('dirt');
      if (x === 25 || x === 29) return createTile('house', false);
      return createTile('grass');
    }),
    Array(35).fill(null).map((_, x) => {
      if (x < 3 || x > 31) return createTile('tree', false);
      if (x === 21 || x === 23) return createTile('stone', true, true, 'market_stall');
      if (x >= 16 && x <= 18) return createTile('dirt');
      if (x === 27) return createTile('flower', true);
      return createTile('grass');
    }),
    Array(35).fill(null).map((_, x) => {
      if (x < 3 || x > 31) return createTile('tree', false);
      if (x >= 10 && x <= 24) return createTile('stone');
      return createTile('grass');
    }),
    Array(35).fill(null).map((_, x) => {
      if (x < 3 || x > 31) return createTile('tree', false);
      if (x >= 10 && x <= 24) return createTile('stone');
      if (x === 14 || x === 20) return createTile('flower', true);
      return createTile('grass');
    }),
    Array(35).fill(null).map((_, x) => {
      if (x < 3 || x > 31) return createTile('tree', false);
      if (x >= 10 && x <= 24) {
        if (x >= 15 && x <= 19 && x !== 17) return createTile('water', false);
        if (x === 17) return createTile('water', false, true, 'fountain');
        return createTile('stone');
      }
      return createTile('grass');
    }),
    Array(35).fill(null).map((_, x) => {
      if (x < 3 || x > 31) return createTile('tree', false);
      if (x >= 10 && x <= 24) {
        if (x >= 15 && x <= 19) return createTile('water', false);
        return createTile('stone');
      }
      return createTile('grass');
    }),
    Array(35).fill(null).map((_, x) => {
      if (x < 3 || x > 31) return createTile('tree', false);
      if (x >= 10 && x <= 24) {
        if (x >= 15 && x <= 19 && x !== 17) return createTile('water', false);
        if (x === 17) return createTile('chest', true, true, 'chest_1');
        return createTile('stone');
      }
      return createTile('grass');
    }),
    Array(35).fill(null).map((_, x) => {
      if (x < 3 || x > 31) return createTile('tree', false);
      if (x >= 10 && x <= 24) return createTile('stone');
      if (x === 14 || x === 20) return createTile('flower', true);
      return createTile('grass');
    }),
    Array(35).fill(null).map((_, x) => {
      if (x < 3 || x > 31) return createTile('tree', false);
      if (x >= 15 && x <= 19) return createTile('dirt');
      if (x === 7) return createTile('house', false);
      return createTile('grass');
    }),
    Array(35).fill(null).map((_, x) => {
      if (x < 3 || x > 31) return createTile('tree', false);
      if (x >= 15 && x <= 19) return createTile('stone');
      return createTile('grass');
    }),
    Array(35).fill(null).map((_, x) => {
      if (x < 3 || x > 31) return createTile('tree', false);
      if (x >= 14 && x <= 20) return createTile('stone');
      if (x === 17) return createTile('stone', true, true, 'elder_house');
      return createTile('grass');
    }),
    ...Array(3).fill(null).map(() =>
      Array(35).fill(null).map((_, x) => {
        if (x < 3 || x > 31) return createTile('tree', false);
        if (x >= 16 && x <= 18) return createTile('dirt');
        if (x === 8 || x === 11 || x === 23 || x === 27) return createTile('house', false);
        if (x === 9 || x === 26) return createTile('flower', true);
        return createTile('grass');
      })
    ),
    Array(35).fill(null).map((_, x) => {
      if (x < 3 || x > 31) return createTile('tree', false);
      if (x >= 16 && x <= 18) return createTile('dirt');
      if (x === 20) return createTile('tree', false);
      return createTile('grass');
    }),
    ...Array(2).fill(null).map(() =>
      Array(35).fill(null).map((_, x) => {
        if (x < 3 || x > 31) return createTile('tree', false);
        if (x >= 16 && x <= 18) return createTile('dirt');
        if (x === 10 || x === 13 || x === 22 || x === 25) return createTile('flower', true);
        return createTile('grass');
      })
    ),
    Array(35).fill(null).map((_, x) => {
      if (x < 3 || x > 31) return createTile('tree', false);
      if (x >= 16 && x <= 18) return createTile('dirt');
      if (x === 15 || x === 19) return createTile('stone', false);
      return createTile('grass');
    }),
    Array(35).fill(null).map(() => createTile('tree', false)),
  ]
};

// Forest - Northern area with denser trees
export const forestMap: WorldMap = {
  name: 'Northern Forest',
  width: 30,
  height: 20,
  spawnPoint: { x: 15, y: 18 },
  tiles: [
    // Rows 0-1: Deep forest border
    ...Array(2).fill(null).map(() => 
      Array(30).fill(null).map(() => createTile('tree', false))
    ),

    // Row 2: Portal to Deep Woods
    Array(30).fill(null).map((_, x) => {
      if (x < 5 || x > 25) return createTile('tree', false);
      if (x === 15) return createTile('portal', true, false, undefined, { targetMap: 'deep_woods', targetX: 15, targetY: 18 });
      if (x % 3 === 0) return createTile('tree', false);
      return createTile('grass');
    }),

    // Rows 3-8: Dense forest with paths
    ...Array(6).fill(null).map((_, rowIdx) => 
      Array(30).fill(null).map((_, x) => {
        if (x < 3 || x > 26) return createTile('tree', false);
        if (x === 15 && rowIdx < 3) return createTile('dirt');
        if ((x + rowIdx) % 4 === 0 && x !== 15) return createTile('tree', false);
        if (rowIdx === 3 && x === 8) return createTile('rock', false);
        return createTile('grass');
      })
    ),

    // Rows 9-11: Clearing with patrol area
    ...Array(3).fill(null).map((_, rowIdx) => 
      Array(30).fill(null).map((_, x) => {
        if (x < 3 || x > 26) return createTile('tree', false);
        if (rowIdx === 1 && x === 10) return createTile('stone', true, true, 'patrol_marker');
        if ((x === 8 || x === 22) && rowIdx === 1) return createTile('rock', false);
        return createTile('grass');
      })
    ),

    // Rows 12-16: Path back to village
    ...Array(5).fill(null).map((_, rowIdx) => 
      Array(30).fill(null).map((_, x) => {
        if (x < 2 || x > 27) return createTile('tree', false);
        if (x === 15) return createTile('dirt');
        if (rowIdx === 2 && (x === 5 || x === 25)) return createTile('tree', false);
        if ((x + rowIdx) % 5 === 0 && x !== 15) return createTile('tree', false);
        return createTile('grass');
      })
    ),

    // Row 17: Transition area
    Array(30).fill(null).map((_, x) => {
      if (x < 2 || x > 27) return createTile('tree', false);
      if (x === 15) return createTile('dirt');
      return createTile('grass');
    }),

    // Row 18: Portal back to village
    Array(30).fill(null).map((_, x) => {
      if (x < 2 || x > 27) return createTile('tree', false);
      if (x === 15) return createTile('portal', true, false, undefined, { targetMap: 'village', targetX: 15, targetY: 5 });
      return createTile('dirt');
    }),

    // Row 19: Border
    Array(30).fill(null).map((_, x) => 
      x < 2 || x > 27 ? createTile('tree', false) : createTile('grass')
    ),
  ],
};

// Deep Woods - Mysterious and dangerous area
export const deepWoodsMap: WorldMap = {
  name: 'Deep Woods',
  width: 30,
  height: 20,
  spawnPoint: { x: 15, y: 2 },
  tiles: [
    // Row 0: Dense trees
    Array(30).fill(null).map(() => createTile('tree', false)),

    // Row 1: Portal from forest
    Array(30).fill(null).map((_, x) => {
      if (x === 15) return createTile('portal', true, false, undefined, { targetMap: 'forest', targetX: 15, targetY: 3 });
      return createTile('tree', false);
    }),

    // Row 2: Entry path
    Array(30).fill(null).map((_, x) => {
      if (x < 10 || x > 20) return createTile('tree', false);
      if (x === 15) return createTile('dirt');
      if (x === 12 || x === 18) return createTile('tree', false);
      return createTile('grass');
    }),

    // Rows 3-8: Very dense forest with narrow paths
    ...Array(6).fill(null).map((_, rowIdx) => 
      Array(30).fill(null).map((_, x) => {
        if (x < 5 || x > 24) return createTile('tree', false);
        if (x === 15 && rowIdx < 3) return createTile('dirt');
        if ((x + rowIdx) % 3 === 0) return createTile('tree', false);
        if (rowIdx === 2 && x === 20) return createTile('rock', false);
        if (rowIdx === 4 && x === 10) return createTile('chest', true, true, 'forest_chest');
        return createTile('grass');
      })
    ),

    // Row 9: Ancient ruins entrance
    Array(30).fill(null).map((_, x) => {
      if (x < 8 || x > 22) return createTile('tree', false);
      if (x === 15) return createTile('stone', true, true, 'ruins_entrance');
      if (x === 12 || x === 18) return createTile('stone');
      return createTile('grass');
    }),

    // Rows 10-12: Ruins area
    ...Array(3).fill(null).map((_, rowIdx) => 
      Array(30).fill(null).map((_, x) => {
        if (x < 8 || x > 22) return createTile('tree', false);
        if (rowIdx === 1 && x === 15) return createTile('portal', true, false, undefined, { targetMap: 'ruins', targetX: 15, targetY: 2 });
        if ((x === 10 || x === 20) && rowIdx === 0) return createTile('stone');
        return createTile('stone');
      })
    ),

    // Rows 13-16: Return path
    ...Array(4).fill(null).map((_, rowIdx) => 
      Array(30).fill(null).map((_, x) => {
        if (x < 5 || x > 24) return createTile('tree', false);
        if (x === 15) return createTile('dirt');
        if ((x + rowIdx) % 4 === 0 && x !== 15) return createTile('tree', false);
        return createTile('grass');
      })
    ),

    // Row 17: Transition
    Array(30).fill(null).map((_, x) => {
      if (x < 10 || x > 20) return createTile('tree', false);
      if (x === 15) return createTile('dirt');
      return createTile('grass');
    }),

    // Row 18: Portal back to village
    Array(30).fill(null).map((_, x) => {
      if (x < 10 || x > 20) return createTile('tree', false);
      if (x === 15) return createTile('portal', true, false, undefined, { targetMap: 'village', targetX: 15, targetY: 17 });
      return createTile('dirt');
    }),

    // Row 19: Border
    Array(30).fill(null).map((_, x) => {
      if (x < 10 || x > 20) return createTile('tree', false);
      return createTile('grass');
    }),
  ],
};

// Ancient Ruins - Quest location
export const ruinsMap: WorldMap = {
  name: 'Ancient Ruins',
  width: 25,
  height: 15,
  spawnPoint: { x: 12, y: 2 },
  tiles: [
    // Row 0: Stone wall
    Array(25).fill(null).map(() => createTile('stone', false)),

    // Row 1: Portal from Deep Woods
    Array(25).fill(null).map((_, x) => {
      if (x === 12) return createTile('portal', true, false, undefined, { targetMap: 'deep_woods', targetX: 15, targetY: 11 });
      return createTile('stone', false);
    }),

    // Row 2: Entrance
    Array(25).fill(null).map((_, x) => {
      if (x < 8 || x > 16) return createTile('stone', false);
      if (x === 12) return createTile('stone');
      return createTile('stone');
    }),

    // Rows 3-6: Ruins interior
    ...Array(4).fill(null).map((_, rowIdx) => 
      Array(25).fill(null).map((_, x) => {
        if (x < 5 || x > 19) return createTile('stone', false);
        if (x === 8 || x === 16) return createTile('stone', false);
        if (rowIdx === 1 && x === 12) return createTile('chest', true, true, 'ancient_chest');
        if (rowIdx === 2 && x === 10) return createTile('stone', true, true, 'ancient_tablet');
        return createTile('stone');
      })
    ),

    // Rows 7-8: Central chamber
    ...Array(2).fill(null).map((_, rowIdx) => 
      Array(25).fill(null).map((_, x) => {
        if (x < 5 || x > 19) return createTile('stone', false);
        if (rowIdx === 0 && (x === 10 || x === 14)) return createTile('water', false, true, 'ancient_fountain');
        return createTile('stone');
      })
    ),

    // Rows 9-12: Exit path
    ...Array(4).fill(null).map(() => 
      Array(25).fill(null).map((_, x) => {
        if (x < 5 || x > 19) return createTile('stone', false);
        if (x === 12) return createTile('stone');
        return createTile('stone');
      })
    ),

    // Row 13: Exit
    Array(25).fill(null).map((_, x) => {
      if (x < 8 || x > 16) return createTile('stone', false);
      return createTile('stone');
    }),

    // Row 14: Wall
    Array(25).fill(null).map(() => createTile('stone', false)),
  ],
};

export const allMaps: Record<string, WorldMap> = {
  village: villageMap,
  forest: forestMap,
  deep_woods: deepWoodsMap,
  ruins: ruinsMap,
};
