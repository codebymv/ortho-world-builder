import type { MapDefinition } from '@/data/mapGenerator';

// The Ashen Reaver's arena - the corrupted cathedral nave beneath Guilrhym.
// Modeled on interiorHollowArenaDef. The victory portal, chests, and bonfire are
// injected at runtime by syncGuilrhymArenaVictoryPortalState once the Reaver falls;
// the boss and its adds are spawned by the map-transition handler in RuntimeMapFlow.
export const interiorGuilrhymCathedralDef: MapDefinition = {
  name: 'Cathedral of the Wellspring',
  subtitle: 'Where the seal was broken',
  width: 36,
  height: 36,
  spawnPoint: { x: 18, y: 32 },
  seed: 7140,
  baseTerrain: 'city',
  borderTile: 'stone',
  autoRoads: false,
  coastalSouthBorder: false,
  features: [
    // Outer cathedral walls
    { x: 0, y: 0, width: 36, height: 3, type: 'wall', fill: 'stone' },
    { x: 0, y: 33, width: 36, height: 3, type: 'wall', fill: 'stone' },
    { x: 0, y: 3, width: 3, height: 30, type: 'wall', fill: 'stone' },
    { x: 33, y: 3, width: 3, height: 30, type: 'wall', fill: 'stone' },
    // Nave floor
    { x: 3, y: 3, width: 30, height: 30, type: 'clearing', fill: 'cobblestone' },
    // Corrupted sanctum at the centre - the broken Wellspring seal
    { x: 9, y: 9, width: 18, height: 18, type: 'clearing', fill: 'ruins_floor' },
    { x: 13, y: 13, width: 10, height: 10, type: 'clearing', fill: 'ash' },
    // Altar dais at the head of the nave (north)
    { x: 15, y: 6, width: 6, height: 4, type: 'clearing', fill: 'mossy_stone' },
  ],
  portals: [],
  chests: [],
  interactables: [],
  props: [
    // Colonnade - pillars lining the nave
    { x: 8, y: 8, type: 'pillar', walkable: false },
    { x: 27, y: 8, type: 'pillar', walkable: false },
    { x: 8, y: 27, type: 'pillar', walkable: false },
    { x: 27, y: 27, type: 'pillar', walkable: false },
    { x: 8, y: 17, type: 'pillar', walkable: false },
    { x: 27, y: 17, type: 'pillar', walkable: false },
    // Corrupted altar
    { x: 17, y: 7, type: 'altar', walkable: false },
    { x: 16, y: 9, type: 'ritual_candle', walkable: true },
    { x: 20, y: 9, type: 'ritual_candle', walkable: true },
    // Battle aftermath / ash gradient toward the sanctum
    { x: 14, y: 8, type: 'bones', walkable: true },
    { x: 22, y: 7, type: 'bones', walkable: true },
    { x: 11, y: 16, type: 'bones_pile', walkable: true },
    { x: 25, y: 20, type: 'bones', walkable: true },
    { x: 18, y: 24, type: 'bloodstain', walkable: true },
    { x: 13, y: 22, type: 'rubble', walkable: false },
    { x: 24, y: 12, type: 'rubble', walkable: false },
    { x: 19, y: 18, type: 'bloodstain', walkable: true },
  ],
};
