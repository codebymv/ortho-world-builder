import { WorldMap } from '@/lib/game/World';
import { generateMap, MapDefinition } from './mapGenerator';

// ============= VILLAGE: 120x80 Cozy Starting Town =============
const villageDef: MapDefinition = {
  name: 'Greenleaf Village',
  width: 120,
  height: 80,
  spawnPoint: { x: 60, y: 55 },
  seed: 42,
  baseTerrain: 'grassland',
  borderTile: 'tree',
  features: [
    // === CENTRAL TOWN SQUARE ===
    { x: 50, y: 35, width: 20, height: 15, type: 'clearing', fill: 'stone' },
    // Town hall (large building north of square)
    { x: 56, y: 30, width: 8, height: 5, type: 'building', interactionId: 'town_hall' },
    // Fountain in center of square
    // (placed via interactables)
    
    // === RESIDENTIAL DISTRICT (west) ===
    { x: 20, y: 30, width: 5, height: 4, type: 'building', interactionId: 'house_1' },
    { x: 20, y: 38, width: 5, height: 4, type: 'building', interactionId: 'house_2' },
    { x: 28, y: 33, width: 5, height: 4, type: 'building', interactionId: 'house_3' },
    { x: 28, y: 42, width: 5, height: 4, type: 'building', interactionId: 'house_4' },
    { x: 20, y: 46, width: 5, height: 4, type: 'building', interactionId: 'house_5' },

    // === MARKET DISTRICT (east) ===
    { x: 78, y: 35, width: 4, height: 3, type: 'building', interactionId: 'shop_weapons' },
    { x: 78, y: 42, width: 4, height: 3, type: 'building', interactionId: 'shop_potions' },
    { x: 85, y: 38, width: 4, height: 3, type: 'building', interactionId: 'shop_armor' },
    { x: 85, y: 45, width: 4, height: 3, type: 'building', interactionId: 'inn' },

    // === GARDENS & PARK (south-west) ===
    { x: 15, y: 55, width: 14, height: 10, type: 'garden' },

    // === TRAINING GROUNDS (north-east) ===
    { x: 85, y: 20, width: 15, height: 10, type: 'clearing', fill: 'dirt' },

    // === VILLAGE LAKE (south-east) ===
    { x: 85, y: 55, width: 18, height: 12, type: 'lake' },

    // === GRAVEYARD (far west, behind village) ===
    { x: 8, y: 15, width: 12, height: 9, type: 'graveyard' },

    // === ELDER'S GARDEN (near elder house) ===
    { x: 38, y: 20, width: 8, height: 6, type: 'garden' },

    // === ENEMY CAMP hints (outside village perimeter) ===
    { x: 100, y: 10, width: 8, height: 6, type: 'camp', interactionId: 'bandit_camp' },

    // === MAIN ROADS ===
    { x: 58, y: 50, width: 4, height: 25, type: 'path', fill: 'dirt' }, // Main north-south road
    { x: 20, y: 37, width: 70, height: 2, type: 'path', fill: 'dirt' }, // Main east-west road
  ],
  portals: [
    // North exit → Forest
    { x: 60, y: 3, targetMap: 'forest', targetX: 75, targetY: 147 },
    // East exit → Plains (future)
    { x: 117, y: 40, targetMap: 'forest', targetX: 3, targetY: 75 },
    // South exit → Beach (future)
    { x: 60, y: 76, targetMap: 'deep_woods', targetX: 60, targetY: 3 },
  ],
  chests: [
    { x: 35, y: 50, interactionId: 'chest_1' },
    { x: 95, y: 25, interactionId: 'training_chest' },
    { x: 12, y: 60, interactionId: 'garden_chest' },
  ],
  interactables: [
    // Fountain in town square center
    { x: 60, y: 42, type: 'well', walkable: false, interactionId: 'fountain' },
    // Village signs
    { x: 55, y: 50, type: 'sign', walkable: false, interactionId: 'village_sign' },
    { x: 75, y: 37, type: 'sign', walkable: false, interactionId: 'market_sign' },
    // Wells
    { x: 25, y: 35, type: 'well', walkable: false, interactionId: 'well' },
    { x: 90, y: 50, type: 'well', walkable: false, interactionId: 'well' },
    // Stumps (decorative)
    { x: 40, y: 60, type: 'stump', walkable: false, interactionId: 'stump_lore' },
  ],
  secretAreas: [
    // Hidden cave behind graveyard
    { x: 5, y: 12, width: 4, height: 3, fill: 'stone' },
  ],
  enemyZones: [
    { x: 95, y: 5, width: 20, height: 15, enemyType: 'wolf', count: 3 },
  ],
};

// ============= FOREST: 150x150 Dense Explorable Forest =============
const forestDef: MapDefinition = {
  name: 'Whispering Woods',
  width: 150,
  height: 150,
  spawnPoint: { x: 75, y: 145 },
  seed: 137,
  baseTerrain: 'forest',
  borderTile: 'tree',
  features: [
    // === FOREST CLEARINGS ===
    { x: 30, y: 30, width: 15, height: 12, type: 'clearing', fill: 'grass' },
    { x: 100, y: 50, width: 12, height: 10, type: 'clearing', fill: 'grass' },
    { x: 65, y: 80, width: 20, height: 15, type: 'clearing', fill: 'grass' },
    { x: 40, y: 110, width: 10, height: 8, type: 'clearing', fill: 'grass' },
    { x: 110, y: 110, width: 12, height: 10, type: 'clearing', fill: 'grass' },

    // === RANGER OUTPOST (central clearing) ===
    { x: 68, y: 82, width: 5, height: 4, type: 'building', interactionId: 'ranger_cabin' },
    { x: 78, y: 85, width: 6, height: 5, type: 'camp', interactionId: 'ranger_camp' },

    // === BANDIT CAMP (north-east) ===
    { x: 105, y: 20, width: 10, height: 8, type: 'camp', interactionId: 'forest_bandit_camp' },
    { x: 108, y: 15, width: 4, height: 3, type: 'building', interactionId: 'bandit_hut' },

    // === HIDDEN GROVE (west) ===
    { x: 10, y: 60, width: 18, height: 14, type: 'clearing', fill: 'grass' },
    { x: 15, y: 64, width: 8, height: 6, type: 'garden' },

    // === FOREST LAKES ===
    { x: 55, y: 40, width: 14, height: 10, type: 'lake' },
    { x: 120, y: 90, width: 10, height: 8, type: 'lake' },
    { x: 20, y: 100, width: 8, height: 6, type: 'lake' },

    // === BRIDGE over lake ===
    { x: 60, y: 44, width: 4, height: 2, type: 'bridge' },

    // === ANCIENT RUINS scattered ===
    { x: 35, y: 15, width: 10, height: 8, type: 'ruins' },
    { x: 130, y: 40, width: 8, height: 6, type: 'ruins' },

    // === WOLF DEN (dark area) ===
    { x: 15, y: 15, width: 12, height: 10, type: 'clearing', fill: 'dirt' },

    // === MAIN PATHS through forest ===
    { x: 73, y: 130, width: 4, height: 20, type: 'path', fill: 'dirt' }, // south entry road
    { x: 73, y: 80, width: 4, height: 50, type: 'path', fill: 'dirt' }, // continues north
    { x: 35, y: 80, width: 40, height: 3, type: 'path', fill: 'dirt' }, // east-west path
    { x: 75, y: 50, width: 30, height: 3, type: 'path', fill: 'dirt' }, // northeast path
    { x: 30, y: 30, width: 3, height: 50, type: 'path', fill: 'dirt' }, // western path
    { x: 75, y: 10, width: 3, height: 40, type: 'path', fill: 'dirt' }, // north road to deep woods
  ],
  portals: [
    // South → Village
    { x: 75, y: 147, targetMap: 'village', targetX: 60, targetY: 5 },
    // West → Village east exit
    { x: 3, y: 75, targetMap: 'village', targetX: 115, targetY: 40 },
    // North → Deep Woods
    { x: 75, y: 3, targetMap: 'deep_woods', targetX: 60, targetY: 97 },
    // North-east → Ruins
    { x: 140, y: 10, targetMap: 'ruins', targetX: 50, targetY: 55 },
  ],
  chests: [
    { x: 37, y: 35, interactionId: 'forest_chest_1' },
    { x: 108, y: 55, interactionId: 'forest_chest_2' },
    { x: 18, y: 65, interactionId: 'hidden_grove_chest' },
    { x: 130, y: 43, interactionId: 'ruins_chest_1' },
    { x: 22, y: 18, interactionId: 'wolf_den_chest' },
    { x: 115, y: 115, interactionId: 'forest_lake_chest' },
  ],
  interactables: [
    { x: 70, y: 85, type: 'sign', walkable: false, interactionId: 'ranger_sign' },
    { x: 60, y: 45, type: 'sign', walkable: false, interactionId: 'bridge_sign' },
    { x: 38, y: 18, type: 'sign', walkable: false, interactionId: 'danger_sign' },
    { x: 75, y: 130, type: 'sign', walkable: false, interactionId: 'forest_entry_sign' },
    // Healing mushroom rings
    { x: 45, y: 115, type: 'mushroom', walkable: true, interactionId: 'healing_mushroom' },
    { x: 125, y: 95, type: 'mushroom', walkable: true, interactionId: 'healing_mushroom' },
  ],
  secretAreas: [
    // Hidden path behind waterfall (east lake)
    { x: 128, y: 92, width: 5, height: 4, fill: 'grass' },
    // Secret stash in wolf den
    { x: 12, y: 12, width: 3, height: 3, fill: 'stone' },
  ],
  enemyZones: [
    { x: 15, y: 15, width: 15, height: 12, enemyType: 'wolf', count: 5 },
    { x: 105, y: 18, width: 15, height: 12, enemyType: 'wolf', count: 4 },
    { x: 30, y: 60, width: 20, height: 15, enemyType: 'wolf', count: 3 },
    { x: 100, y: 80, width: 20, height: 20, enemyType: 'wolf', count: 4 },
  ],
};

// ============= DEEP WOODS: 120x100 Dark Mysterious Area =============
const deepWoodsDef: MapDefinition = {
  name: 'The Deep Woods',
  width: 120,
  height: 100,
  spawnPoint: { x: 60, y: 95 },
  seed: 256,
  baseTerrain: 'swamp',
  borderTile: 'tree',
  features: [
    // === WITCH'S HUT ===
    { x: 30, y: 30, width: 5, height: 4, type: 'building', interactionId: 'witch_hut' },
    { x: 27, y: 28, width: 12, height: 10, type: 'clearing', fill: 'swamp' },

    // === ANCIENT SHRINE ===
    { x: 80, y: 20, width: 12, height: 10, type: 'ruins' },

    // === MUSHROOM GROVE ===
    { x: 50, y: 50, width: 20, height: 15, type: 'clearing', fill: 'grass' },
    { x: 55, y: 55, width: 10, height: 6, type: 'garden' },

    // === SWAMP LAKE ===
    { x: 20, y: 60, width: 16, height: 12, type: 'lake' },
    { x: 26, y: 65, width: 4, height: 2, type: 'bridge' },

    // === SHADOW CREATURE DEN ===
    { x: 90, y: 50, width: 15, height: 12, type: 'clearing', fill: 'dirt' },
    { x: 93, y: 53, width: 8, height: 6, type: 'camp', interactionId: 'shadow_den' },

    // === HIDDEN TEMPLE ENTRANCE ===
    { x: 55, y: 15, width: 10, height: 8, type: 'ruins', interactionId: 'temple_entrance' },

    // === PATHS ===
    { x: 58, y: 80, width: 4, height: 18, type: 'path', fill: 'dirt' },
    { x: 30, y: 55, width: 30, height: 3, type: 'path', fill: 'dirt' },
    { x: 60, y: 50, width: 30, height: 3, type: 'path', fill: 'dirt' },
    { x: 58, y: 15, width: 4, height: 40, type: 'path', fill: 'dirt' },
    { x: 30, y: 30, width: 28, height: 3, type: 'path', fill: 'dirt' },
  ],
  portals: [
    // South → Forest
    { x: 60, y: 97, targetMap: 'forest', targetX: 75, targetY: 5 },
    // North → Village south
    { x: 60, y: 3, targetMap: 'village', targetX: 60, targetY: 74 },
    // Temple entrance → Ruins
    { x: 60, y: 16, targetMap: 'ruins', targetX: 50, targetY: 55 },
  ],
  chests: [
    { x: 85, y: 25, interactionId: 'shrine_chest' },
    { x: 55, y: 52, interactionId: 'mushroom_chest' },
    { x: 25, y: 68, interactionId: 'swamp_chest' },
    { x: 95, y: 55, interactionId: 'shadow_chest' },
  ],
  interactables: [
    { x: 32, y: 33, type: 'sign', walkable: false, interactionId: 'witch_sign' },
    { x: 60, y: 18, type: 'sign', walkable: false, interactionId: 'temple_sign' },
    { x: 60, y: 85, type: 'sign', walkable: false, interactionId: 'deep_woods_sign' },
    { x: 50, y: 57, type: 'well', walkable: false, interactionId: 'ancient_fountain' },
  ],
  secretAreas: [
    { x: 10, y: 10, width: 6, height: 5, fill: 'stone' },
    { x: 105, y: 45, width: 5, height: 4, fill: 'grass' },
  ],
  enemyZones: [
    { x: 85, y: 45, width: 25, height: 20, enemyType: 'shadow', count: 6 },
    { x: 15, y: 55, width: 20, height: 20, enemyType: 'shadow', count: 4 },
    { x: 40, y: 20, width: 20, height: 15, enemyType: 'shadow', count: 3 },
  ],
};

// ============= ANCIENT RUINS: 100x60 Dungeon-like Area =============
const ruinsDef: MapDefinition = {
  name: 'Ancient Ruins',
  width: 100,
  height: 60,
  spawnPoint: { x: 50, y: 55 },
  seed: 512,
  baseTerrain: 'ruins',
  borderTile: 'stone',
  features: [
    // === ENTRANCE HALL ===
    { x: 40, y: 48, width: 20, height: 10, type: 'clearing', fill: 'stone' },

    // === WEST WING - Puzzle rooms ===
    { x: 10, y: 20, width: 20, height: 15, type: 'ruins' },
    { x: 13, y: 10, width: 14, height: 8, type: 'ruins' },

    // === EAST WING - Combat arena ===
    { x: 70, y: 20, width: 20, height: 15, type: 'ruins' },
    { x: 73, y: 10, width: 14, height: 8, type: 'ruins' },

    // === CENTRAL CHAMBER ===
    { x: 35, y: 15, width: 30, height: 20, type: 'clearing', fill: 'stone' },
    { x: 40, y: 18, width: 20, height: 14, type: 'ruins' },

    // === TREASURE VAULT (north) ===
    { x: 42, y: 5, width: 16, height: 10, type: 'ruins' },

    // === CORRIDORS ===
    { x: 48, y: 35, width: 4, height: 15, type: 'path', fill: 'stone' },
    { x: 20, y: 25, width: 25, height: 3, type: 'path', fill: 'stone' },
    { x: 55, y: 25, width: 20, height: 3, type: 'path', fill: 'stone' },
    { x: 18, y: 18, width: 3, height: 8, type: 'path', fill: 'stone' },
    { x: 78, y: 18, width: 3, height: 8, type: 'path', fill: 'stone' },
    { x: 48, y: 15, width: 4, height: 5, type: 'path', fill: 'stone' },
  ],
  portals: [
    // South → Deep Woods
    { x: 50, y: 57, targetMap: 'deep_woods', targetX: 60, targetY: 18 },
    // South-east → Forest
    { x: 97, y: 55, targetMap: 'forest', targetX: 142, targetY: 12 },
  ],
  chests: [
    { x: 15, y: 25, interactionId: 'ruins_puzzle_chest' },
    { x: 80, y: 25, interactionId: 'ruins_combat_chest' },
    { x: 50, y: 8, interactionId: 'ancient_chest' },
    { x: 45, y: 22, interactionId: 'ruins_central_chest' },
  ],
  interactables: [
    { x: 50, y: 25, type: 'well', walkable: false, interactionId: 'ancient_fountain' },
    { x: 20, y: 14, type: 'sign', walkable: false, interactionId: 'ancient_tablet' },
    { x: 80, y: 14, type: 'sign', walkable: false, interactionId: 'ancient_tablet_2' },
    { x: 50, y: 10, type: 'sign', walkable: false, interactionId: 'vault_inscription' },
  ],
  enemyZones: [
    { x: 70, y: 18, width: 22, height: 18, enemyType: 'shadow', count: 5 },
    { x: 35, y: 15, width: 30, height: 20, enemyType: 'shadow', count: 4 },
    { x: 42, y: 5, width: 16, height: 10, enemyType: 'shadow', count: 3 },
  ],
};

// Generate all maps
export const villageMap: WorldMap = generateMap(villageDef);
export const forestMap: WorldMap = generateMap(forestDef);
export const deepWoodsMap: WorldMap = generateMap(deepWoodsDef);
export const ruinsMap: WorldMap = generateMap(ruinsDef);

// Export definitions for enemy spawning
export const mapDefinitions: Record<string, MapDefinition> = {
  village: villageDef,
  forest: forestDef,
  deep_woods: deepWoodsDef,
  ruins: ruinsDef,
};

export const allMaps: Record<string, WorldMap> = {
  village: villageMap,
  forest: forestMap,
  deep_woods: deepWoodsMap,
  ruins: ruinsMap,
};
