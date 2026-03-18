import { WorldMap } from '@/lib/game/World';
import { generateMap, MapDefinition } from './mapGenerator';

// ============= VILLAGE: 240x160 Dense Interconnected Starting Town =============
const villageDef: MapDefinition = {
  name: 'Greenleaf Village',
  width: 240,
  height: 160,
  spawnPoint: { x: 120, y: 110 },
  seed: 42,
  baseTerrain: 'grassland',
  borderTile: 'tree',
  features: [
    // ====== CLIFFSIDE (north edge) - creates elevation/depth ======
    { x: 3, y: 3, width: 234, height: 6, type: 'cliff_face' },
    { x: 3, y: 140, width: 100, height: 5, type: 'cliff_face' },
    { x: 150, y: 145, width: 87, height: 5, type: 'cliff_face' },

    // ====== CENTRAL COBBLESTONE PLAZA ======
    { x: 95, y: 68, width: 50, height: 34, type: 'cobble_plaza' },

    // ====== TOWN HALL (center of plaza) ======
    { x: 110, y: 58, width: 16, height: 10, type: 'building', interactionId: 'town_hall' },

    // ====== RESIDENTIAL DISTRICT (west) - dense housing ======
    { x: 28, y: 50, width: 8, height: 6, type: 'building', interactionId: 'house_1' },
    { x: 28, y: 62, width: 8, height: 6, type: 'building', interactionId: 'house_2' },
    { x: 42, y: 55, width: 8, height: 6, type: 'building', interactionId: 'house_3' },
    { x: 42, y: 70, width: 8, height: 6, type: 'building', interactionId: 'house_4' },
    { x: 56, y: 50, width: 8, height: 6, type: 'building', interactionId: 'house_5' },
    { x: 56, y: 65, width: 8, height: 6, type: 'building', interactionId: 'house_6' },
    { x: 28, y: 78, width: 8, height: 6, type: 'building', interactionId: 'house_7' },
    { x: 42, y: 85, width: 8, height: 6, type: 'building', interactionId: 'house_8' },
    { x: 70, y: 55, width: 8, height: 6, type: 'building', interactionId: 'house_9' },
    { x: 70, y: 70, width: 8, height: 6, type: 'building', interactionId: 'house_10' },

    // ====== MARKET DISTRICT (east) - shops with cobblestone ======
    { x: 155, y: 65, width: 30, height: 18, type: 'cobble_plaza' },
    { x: 158, y: 60, width: 8, height: 6, type: 'building', interactionId: 'shop_weapons' },
    { x: 172, y: 60, width: 8, height: 6, type: 'building', interactionId: 'shop_potions' },
    { x: 158, y: 84, width: 8, height: 6, type: 'building', interactionId: 'shop_armor' },
    { x: 172, y: 84, width: 8, height: 6, type: 'building', interactionId: 'inn' },
    { x: 188, y: 68, width: 8, height: 6, type: 'building', interactionId: 'shop_magic' },
    { x: 188, y: 80, width: 8, height: 6, type: 'building', interactionId: 'tavern' },

    // ====== FARM DISTRICT (south) - wheat fields with fences ======
    { x: 20, y: 105, width: 30, height: 18, type: 'farm' },
    { x: 55, y: 110, width: 26, height: 16, type: 'farm' },
    { x: 130, y: 115, width: 28, height: 16, type: 'farm' },

    // ====== CEMETERY with IRON FENCING (north-west) ======
    { x: 10, y: 15, width: 28, height: 22, type: 'iron_fence_border', fill: 'dirt' },
    // Tombstones inside cemetery (placed after iron fence)
    { x: 12, y: 17, width: 24, height: 18, type: 'graveyard' },

    // ====== HEDGE GARDEN/MAZE (east of plaza) ======
    { x: 200, y: 30, width: 28, height: 22, type: 'hedge_maze' },

    // ====== FOREST GROVES scattered for natural feel ======
    { x: 5, y: 90, width: 18, height: 16, type: 'forest_grove' },
    { x: 210, y: 110, width: 22, height: 20, type: 'forest_grove' },
    { x: 85, y: 12, width: 20, height: 14, type: 'forest_grove' },

    // ====== VILLAGE LAKE with surrounding trees ======
    { x: 170, y: 110, width: 30, height: 20, type: 'lake' },

    // ====== TRAINING GROUNDS (north-east) ======
    { x: 170, y: 20, width: 24, height: 16, type: 'clearing', fill: 'dirt' },

    // ====== ELDER'S GARDEN (fenced, north of plaza) ======
    { x: 105, y: 42, width: 14, height: 12, type: 'garden' },

    // ====== PARKS & GREEN SPACES filling gaps ======
    { x: 82, y: 95, width: 12, height: 10, type: 'garden' },
    { x: 200, y: 95, width: 14, height: 12, type: 'garden' },

    // ====== ENEMY OUTPOSTS (edges) ======
    { x: 215, y: 12, width: 16, height: 12, type: 'camp', interactionId: 'bandit_camp' },
    { x: 5, y: 130, width: 12, height: 10, type: 'camp', interactionId: 'goblin_camp' },

    // ====== FORTS ======
    { x: 190, y: 18, width: 20, height: 16, type: 'fort', interactionId: 'north_fort' },
    { x: 8, y: 40, width: 16, height: 14, type: 'fort', interactionId: 'west_fort' },

    // ====== DESTROYED OUTPOST (north-west, near cemetery) ======
    { x: 45, y: 15, width: 18, height: 14, type: 'destroyed_town' },

    // ====== COBBLESTONE ROADS connecting everything ======
    // Main N-S road through center
    { x: 116, y: 10, width: 6, height: 130, type: 'path', fill: 'cobblestone' },
    // Main E-W road through town
    { x: 20, y: 72, width: 200, height: 4, type: 'path', fill: 'cobblestone' },
    // Market road
    { x: 145, y: 72, width: 60, height: 4, type: 'path', fill: 'cobblestone' },
    // South farm connector
    { x: 40, y: 100, width: 100, height: 3, type: 'path', fill: 'dirt' },
    // Residential side streets
    { x: 28, y: 58, width: 50, height: 2, type: 'path', fill: 'dirt' },
    { x: 28, y: 76, width: 50, height: 2, type: 'path', fill: 'dirt' },
    // Cemetery approach
    { x: 38, y: 25, width: 78, height: 3, type: 'path', fill: 'dirt' },
    // North path to forest
    { x: 116, y: 8, width: 6, height: 6, type: 'path', fill: 'cobblestone' },
    // East path
    { x: 196, y: 72, width: 42, height: 4, type: 'path', fill: 'dirt' },
    // Lake path
    { x: 160, y: 100, width: 20, height: 3, type: 'path', fill: 'dirt' },
    // Training grounds path
    { x: 170, y: 36, width: 24, height: 3, type: 'path', fill: 'dirt' },
    // Garden path connecting north
    { x: 112, y: 38, width: 4, height: 20, type: 'path', fill: 'cobblestone' },
  ],
  portals: [
    { x: 120, y: 4, targetMap: 'forest', targetX: 150, targetY: 294 },
    { x: 237, y: 80, targetMap: 'forest', targetX: 4, targetY: 150 },
    { x: 120, y: 156, targetMap: 'deep_woods', targetX: 120, targetY: 4 },
  ],
  chests: [
    { x: 70, y: 100, interactionId: 'chest_1' },
    { x: 190, y: 35, interactionId: 'training_chest' },
    { x: 25, y: 120, interactionId: 'garden_chest' },
    { x: 140, y: 85, interactionId: 'market_chest' },
    { x: 220, y: 18, interactionId: 'bandit_chest' },
    { x: 50, y: 40, interactionId: 'village_hidden_chest' },
    { x: 115, y: 130, interactionId: 'farm_chest' },
    { x: 175, y: 115, interactionId: 'lake_chest' },
    { x: 212, y: 42, interactionId: 'hedge_chest' },
    { x: 35, y: 28, interactionId: 'cemetery_chest' },
  ],
  interactables: [
    { x: 119, y: 82, type: 'well', walkable: false, interactionId: 'fountain' },
    { x: 108, y: 100, type: 'sign', walkable: false, interactionId: 'village_sign' },
    { x: 155, y: 72, type: 'sign', walkable: false, interactionId: 'market_sign' },
    { x: 38, y: 60, type: 'well', walkable: false, interactionId: 'well' },
    { x: 180, y: 100, type: 'well', walkable: false, interactionId: 'well' },
    { x: 170, y: 30, type: 'sign', walkable: false, interactionId: 'training_sign' },
    { x: 20, y: 30, type: 'tombstone', walkable: false, interactionId: 'tombstone' },
    { x: 119, y: 125, type: 'campfire', walkable: false, interactionId: 'campfire' },
    // Lanterns along main road
    { x: 115, y: 50, type: 'lantern', walkable: false, interactionId: 'lantern' },
    { x: 115, y: 90, type: 'lantern', walkable: false, interactionId: 'lantern' },
    { x: 50, y: 71, type: 'lantern', walkable: false, interactionId: 'lantern' },
    { x: 145, y: 71, type: 'lantern', walkable: false, interactionId: 'lantern' },
  ],
  secretAreas: [
    { x: 5, y: 20, width: 6, height: 4, fill: 'stone' },
    { x: 220, y: 140, width: 5, height: 4, fill: 'stone' },
    { x: 75, y: 45, width: 4, height: 4, fill: 'grass' },
    { x: 200, y: 50, width: 5, height: 3, fill: 'stone' },
    { x: 95, y: 135, width: 6, height: 4, fill: 'grass' },
    { x: 160, y: 130, width: 4, height: 4, fill: 'stone' },
  ],
  enemyZones: [
    { x: 210, y: 8, width: 25, height: 20, enemyType: 'bandit', count: 5 },
    { x: 3, y: 125, width: 15, height: 15, enemyType: 'wolf', count: 3 },
    { x: 190, y: 18, width: 20, height: 16, enemyType: 'bandit', count: 4 },
    { x: 8, y: 40, width: 16, height: 14, enemyType: 'skeleton', count: 3 },
  ],
};

// ============= FOREST: 300x300 Massive Explorable Forest =============
const forestDef: MapDefinition = {
  name: 'Whispering Woods',
  width: 300,
  height: 300,
  spawnPoint: { x: 150, y: 290 },
  seed: 137,
  baseTerrain: 'forest',
  borderTile: 'tree',
  features: [
    // === FOREST CLEARINGS ===
    { x: 60, y: 60, width: 30, height: 24, type: 'clearing', fill: 'grass' },
    { x: 200, y: 100, width: 24, height: 20, type: 'clearing', fill: 'grass' },
    { x: 130, y: 160, width: 40, height: 30, type: 'clearing', fill: 'grass' },
    { x: 80, y: 220, width: 20, height: 16, type: 'clearing', fill: 'grass' },
    { x: 220, y: 220, width: 24, height: 20, type: 'clearing', fill: 'grass' },
    { x: 40, y: 140, width: 20, height: 16, type: 'clearing', fill: 'grass' },
    { x: 250, y: 50, width: 20, height: 16, type: 'clearing', fill: 'grass' },
    { x: 150, y: 50, width: 30, height: 20, type: 'clearing', fill: 'grass' },

    // === RANGER OUTPOST ===
    { x: 136, y: 164, width: 10, height: 8, type: 'building', interactionId: 'ranger_cabin' },
    { x: 156, y: 170, width: 12, height: 10, type: 'camp', interactionId: 'ranger_camp' },

    // === BANDIT CAMP (north-east) ===
    { x: 210, y: 40, width: 20, height: 16, type: 'camp', interactionId: 'forest_bandit_camp' },
    { x: 216, y: 30, width: 8, height: 6, type: 'building', interactionId: 'bandit_hut' },

    // === HIDDEN GROVE (west) ===
    { x: 15, y: 120, width: 36, height: 28, type: 'clearing', fill: 'grass' },
    { x: 25, y: 128, width: 16, height: 12, type: 'garden' },

    // === SPIDER NEST (dark area, south-west) ===
    { x: 20, y: 240, width: 30, height: 25, type: 'clearing', fill: 'dirt' },
    { x: 25, y: 245, width: 20, height: 15, type: 'camp', interactionId: 'spider_nest' },

    // === FOREST LAKES ===
    { x: 110, y: 80, width: 28, height: 20, type: 'lake' },
    { x: 240, y: 180, width: 20, height: 16, type: 'lake' },
    { x: 40, y: 200, width: 16, height: 12, type: 'lake' },
    { x: 180, y: 250, width: 22, height: 16, type: 'lake' },

    // === BRIDGES ===
    { x: 120, y: 88, width: 8, height: 4, type: 'bridge' },
    { x: 248, y: 186, width: 4, height: 4, type: 'bridge' },

    // === ANCIENT RUINS ===
    { x: 70, y: 30, width: 20, height: 16, type: 'ruins' },
    { x: 260, y: 80, width: 16, height: 12, type: 'ruins' },
    { x: 100, y: 260, width: 16, height: 12, type: 'ruins' },

    // === WOLF DEN ===
    { x: 30, y: 30, width: 24, height: 20, type: 'clearing', fill: 'dirt' },

    // === HERMIT HUT ===
    { x: 270, y: 260, width: 8, height: 6, type: 'building', interactionId: 'hermit_hut' },
    { x: 265, y: 255, width: 20, height: 16, type: 'clearing', fill: 'grass' },

    // === DESTROYED TOWN (south-west) ===
    { x: 20, y: 200, width: 30, height: 22, type: 'destroyed_town' },

    // === WATERFALL (north) ===
    { x: 155, y: 15, width: 12, height: 18, type: 'waterfall' },

    // === TEMPLE (east) ===
    { x: 250, y: 140, width: 20, height: 16, type: 'temple' },

    // === VOLCANO (far north-east) ===
    { x: 260, y: 20, width: 28, height: 24, type: 'volcano' },

    // === FIELD BOSS ARENA (central-east) ===
    { x: 220, y: 150, width: 24, height: 24, type: 'boss_arena', interactionId: 'golem_boss' },

    // === ENCHANTED GROVES with plant monsters ===
    { x: 70, y: 140, width: 30, height: 26, type: 'enchanted_grove' },
    { x: 240, y: 240, width: 24, height: 22, type: 'enchanted_grove' },
    { x: 50, y: 260, width: 26, height: 22, type: 'enchanted_grove' },

    // === FORTS (strategic positions) ===
    { x: 130, y: 120, width: 22, height: 18, type: 'fort', interactionId: 'forest_fort' },
    { x: 200, y: 60, width: 18, height: 16, type: 'fort', interactionId: 'north_fort' },
    { x: 60, y: 190, width: 20, height: 16, type: 'fort', interactionId: 'south_fort' },

    // === ABANDONED CAMPS scattered ===
    { x: 100, y: 200, width: 16, height: 12, type: 'abandoned_camp', interactionId: 'lost_expedition' },
    { x: 50, y: 80, width: 12, height: 10, type: 'abandoned_camp', interactionId: 'hunters_camp' },
    { x: 270, y: 200, width: 14, height: 10, type: 'abandoned_camp', interactionId: 'hermit_camp' },

    // === CEMETERY (deep in forest) ===
    { x: 120, y: 240, width: 22, height: 16, type: 'cemetery' },

    // === ADDITIONAL DESTROYED VILLAGE ===
    { x: 180, y: 200, width: 24, height: 18, type: 'destroyed_town' },

    // === MAIN PATHS ===
    { x: 146, y: 260, width: 8, height: 40, type: 'path', fill: 'dirt' },
    { x: 146, y: 160, width: 8, height: 100, type: 'path', fill: 'dirt' },
    { x: 70, y: 160, width: 80, height: 6, type: 'path', fill: 'dirt' },
    { x: 150, y: 100, width: 60, height: 6, type: 'path', fill: 'dirt' },
    { x: 60, y: 60, width: 6, height: 100, type: 'path', fill: 'dirt' },
    { x: 150, y: 20, width: 6, height: 80, type: 'path', fill: 'dirt' },
    { x: 200, y: 100, width: 6, height: 60, type: 'path', fill: 'dirt' },
    { x: 80, y: 230, width: 70, height: 4, type: 'path', fill: 'dirt' },
    { x: 220, y: 220, width: 50, height: 4, type: 'path', fill: 'dirt' },
    { x: 20, y: 210, width: 60, height: 4, type: 'path', fill: 'dirt' },
    { x: 250, y: 140, width: 4, height: 40, type: 'path', fill: 'dirt' },
    { x: 220, y: 150, width: 30, height: 4, type: 'path', fill: 'dirt' },
  ],
  portals: [
    { x: 150, y: 297, targetMap: 'village', targetX: 120, targetY: 6 },
    { x: 3, y: 150, targetMap: 'village', targetX: 235, targetY: 80 },
    { x: 150, y: 3, targetMap: 'deep_woods', targetX: 120, targetY: 197 },
    { x: 280, y: 20, targetMap: 'ruins', targetX: 100, targetY: 115 },
  ],
  chests: [
    { x: 74, y: 70, interactionId: 'forest_chest_1' },
    { x: 216, y: 110, interactionId: 'forest_chest_2' },
    { x: 33, y: 135, interactionId: 'hidden_grove_chest' },
    { x: 265, y: 85, interactionId: 'ruins_chest_1' },
    { x: 42, y: 38, interactionId: 'wolf_den_chest' },
    { x: 230, y: 230, interactionId: 'forest_lake_chest' },
    { x: 160, y: 60, interactionId: 'forest_north_chest' },
    { x: 90, y: 230, interactionId: 'spider_chest' },
    { x: 275, y: 265, interactionId: 'hermit_chest' },
    { x: 105, y: 265, interactionId: 'ruins_south_chest' },
    { x: 30, y: 250, interactionId: 'spider_nest_chest' },
    { x: 190, y: 260, interactionId: 'forest_deep_chest' },
    { x: 30, y: 210, interactionId: 'destroyed_town_chest' },
    { x: 160, y: 20, interactionId: 'waterfall_chest' },
    { x: 258, y: 148, interactionId: 'temple_chest' },
    { x: 268, y: 28, interactionId: 'volcano_chest' },
  ],
  interactables: [
    { x: 140, y: 170, type: 'sign', walkable: false, interactionId: 'ranger_sign' },
    { x: 120, y: 90, type: 'sign', walkable: false, interactionId: 'bridge_sign' },
    { x: 76, y: 36, type: 'sign', walkable: false, interactionId: 'danger_sign' },
    { x: 150, y: 260, type: 'sign', walkable: false, interactionId: 'forest_entry_sign' },
    { x: 90, y: 230, type: 'mushroom', walkable: true, interactionId: 'healing_mushroom' },
    { x: 250, y: 190, type: 'mushroom', walkable: true, interactionId: 'healing_mushroom' },
    { x: 45, y: 145, type: 'mushroom', walkable: true, interactionId: 'healing_mushroom' },
    { x: 160, y: 175, type: 'campfire', walkable: false, interactionId: 'campfire' },
    { x: 35, y: 250, type: 'campfire', walkable: false, interactionId: 'campfire' },
    { x: 275, y: 270, type: 'well', walkable: false, interactionId: 'well' },
    { x: 25, y: 205, type: 'sign', walkable: false, interactionId: 'destroyed_town_sign' },
    { x: 258, y: 155, type: 'well', walkable: false, interactionId: 'ancient_fountain' },
  ],
  secretAreas: [
    { x: 256, y: 184, width: 8, height: 6, fill: 'grass' },
    { x: 24, y: 24, width: 6, height: 6, fill: 'stone' },
    { x: 280, y: 270, width: 5, height: 5, fill: 'grass' },
    { x: 90, y: 145, width: 6, height: 5, fill: 'grass' },
    { x: 195, y: 175, width: 5, height: 5, fill: 'stone' },
    { x: 145, y: 270, width: 6, height: 4, fill: 'grass' },
    { x: 55, y: 195, width: 5, height: 5, fill: 'stone' },
    { x: 270, y: 130, width: 4, height: 5, fill: 'grass' },
  ],
  enemyZones: [
    { x: 30, y: 30, width: 30, height: 24, enemyType: 'wolf', count: 8 },
    { x: 210, y: 36, width: 30, height: 24, enemyType: 'bandit', count: 6 },
    { x: 60, y: 120, width: 40, height: 30, enemyType: 'wolf', count: 5 },
    { x: 200, y: 160, width: 40, height: 40, enemyType: 'wolf', count: 6 },
    { x: 20, y: 240, width: 35, height: 30, enemyType: 'shadow', count: 7 },
    { x: 100, y: 250, width: 25, height: 20, enemyType: 'skeleton', count: 4 },
    { x: 250, y: 50, width: 25, height: 20, enemyType: 'wolf', count: 4 },
    { x: 160, y: 40, width: 30, height: 20, enemyType: 'bandit', count: 3 },
    // Plant monster zones in enchanted groves
    { x: 70, y: 140, width: 30, height: 26, enemyType: 'plant', count: 6 },
    { x: 240, y: 240, width: 24, height: 22, enemyType: 'plant', count: 5 },
    { x: 50, y: 260, width: 26, height: 22, enemyType: 'plant', count: 4 },
    // Fort defenders
    { x: 130, y: 120, width: 22, height: 18, enemyType: 'bandit', count: 5 },
    { x: 200, y: 60, width: 18, height: 16, enemyType: 'skeleton', count: 4 },
    { x: 60, y: 190, width: 20, height: 16, enemyType: 'bandit', count: 4 },
    // Field boss zone
    { x: 215, y: 145, width: 30, height: 30, enemyType: 'golem', count: 1 },
    // Cemetery undead
    { x: 118, y: 238, width: 26, height: 20, enemyType: 'skeleton', count: 5 },
    // Abandoned areas
    { x: 175, y: 195, width: 30, height: 25, enemyType: 'wolf', count: 5 },
  ],
};

// ============= DEEP WOODS: 240x200 Dark Mysterious Area =============
const deepWoodsDef: MapDefinition = {
  name: 'The Deep Woods',
  width: 240,
  height: 200,
  spawnPoint: { x: 120, y: 190 },
  seed: 256,
  baseTerrain: 'swamp',
  borderTile: 'tree',
  features: [
    // === WITCH'S HUT ===
    { x: 60, y: 60, width: 10, height: 8, type: 'building', interactionId: 'witch_hut' },
    { x: 50, y: 52, width: 24, height: 20, type: 'clearing', fill: 'swamp' },

    // === ANCIENT SHRINE ===
    { x: 160, y: 40, width: 24, height: 20, type: 'ruins' },

    // === MUSHROOM GROVE ===
    { x: 100, y: 100, width: 40, height: 30, type: 'clearing', fill: 'grass' },
    { x: 110, y: 110, width: 20, height: 12, type: 'garden' },

    // === SWAMP LAKES ===
    { x: 40, y: 120, width: 32, height: 24, type: 'lake' },
    { x: 52, y: 130, width: 8, height: 4, type: 'bridge' },
    { x: 180, y: 140, width: 24, height: 18, type: 'lake' },

    // === SHADOW CREATURE DEN ===
    { x: 180, y: 80, width: 30, height: 24, type: 'clearing', fill: 'dirt' },
    { x: 186, y: 86, width: 16, height: 12, type: 'camp', interactionId: 'shadow_den' },

    // === HIDDEN TEMPLE ENTRANCE ===
    { x: 110, y: 20, width: 20, height: 16, type: 'ruins', interactionId: 'temple_entrance' },

    // === DARK HOLLOW (new dangerous area) ===
    { x: 20, y: 20, width: 30, height: 25, type: 'clearing', fill: 'dirt' },

    // === CURSED GROVE ===
    { x: 200, y: 160, width: 20, height: 16, type: 'clearing', fill: 'swamp' },

    // === TREANT GROVE ===
    { x: 160, y: 160, width: 15, height: 12, type: 'garden' },

    // === BOSS ARENA - Shadow Lord ===
    { x: 90, y: 40, width: 20, height: 20, type: 'boss_arena', interactionId: 'shadow_lord' },

    // === ABANDONED EXPEDITION CAMPS ===
    { x: 30, y: 160, width: 12, height: 10, type: 'abandoned_camp', interactionId: 'lost_scholars' },
    { x: 210, y: 120, width: 14, height: 10, type: 'abandoned_camp', interactionId: 'fallen_knights' },

    // === CURSED CEMETERY ===
    { x: 150, y: 100, width: 18, height: 14, type: 'cemetery' },

    // === PATHS ===
    { x: 116, y: 160, width: 8, height: 36, type: 'path', fill: 'dirt' },
    { x: 60, y: 100, width: 60, height: 6, type: 'path', fill: 'dirt' },
    { x: 120, y: 100, width: 60, height: 6, type: 'path', fill: 'dirt' },
    { x: 116, y: 20, width: 8, height: 80, type: 'path', fill: 'dirt' },
    { x: 60, y: 60, width: 56, height: 6, type: 'path', fill: 'dirt' },
    { x: 160, y: 50, width: 6, height: 50, type: 'path', fill: 'dirt' },
    { x: 40, y: 30, width: 70, height: 4, type: 'path', fill: 'dirt' },
    { x: 180, y: 100, width: 6, height: 60, type: 'path', fill: 'dirt' },
  ],
  portals: [
    { x: 120, y: 197, targetMap: 'forest', targetX: 150, targetY: 5 },
    { x: 120, y: 3, targetMap: 'village', targetX: 120, targetY: 154 },
    { x: 120, y: 28, targetMap: 'ruins', targetX: 100, targetY: 115 },
  ],
  chests: [
    { x: 170, y: 50, interactionId: 'shrine_chest' },
    { x: 110, y: 104, interactionId: 'mushroom_chest' },
    { x: 50, y: 136, interactionId: 'swamp_chest' },
    { x: 190, y: 90, interactionId: 'shadow_chest' },
    { x: 30, y: 30, interactionId: 'dark_hollow_chest' },
    { x: 210, y: 170, interactionId: 'cursed_chest' },
    { x: 165, y: 165, interactionId: 'treant_chest' },
    { x: 60, y: 65, interactionId: 'witch_chest' },
  ],
  interactables: [
    { x: 64, y: 66, type: 'sign', walkable: false, interactionId: 'witch_sign' },
    { x: 120, y: 30, type: 'sign', walkable: false, interactionId: 'temple_sign' },
    { x: 120, y: 175, type: 'sign', walkable: false, interactionId: 'deep_woods_sign' },
    { x: 100, y: 114, type: 'well', walkable: false, interactionId: 'ancient_fountain' },
    { x: 190, y: 95, type: 'campfire', walkable: false, interactionId: 'campfire' },
    { x: 115, y: 115, type: 'mushroom', walkable: true, interactionId: 'healing_mushroom' },
    { x: 205, y: 165, type: 'tombstone', walkable: false, interactionId: 'tombstone' },
    { x: 35, y: 25, type: 'campfire', walkable: false, interactionId: 'campfire' },
  ],
  secretAreas: [
    { x: 15, y: 15, width: 8, height: 6, fill: 'stone' },
    { x: 210, y: 90, width: 8, height: 6, fill: 'grass' },
    { x: 225, y: 175, width: 6, height: 5, fill: 'stone' },
  ],
  enemyZones: [
    { x: 175, y: 75, width: 40, height: 35, enemyType: 'shadow', count: 10 },
    { x: 30, y: 110, width: 40, height: 40, enemyType: 'shadow', count: 7 },
    { x: 80, y: 30, width: 30, height: 25, enemyType: 'shadow', count: 5 },
    { x: 15, y: 15, width: 35, height: 30, enemyType: 'shadow', count: 8 },
    { x: 195, y: 155, width: 30, height: 25, enemyType: 'shadow', count: 6 },
    { x: 150, y: 155, width: 20, height: 15, enemyType: 'wolf', count: 4 },
  ],
};

// ============= ANCIENT RUINS: 200x120 Dungeon-like Area =============
const ruinsDef: MapDefinition = {
  name: 'Ancient Ruins',
  width: 200,
  height: 120,
  spawnPoint: { x: 100, y: 110 },
  seed: 512,
  baseTerrain: 'ruins',
  borderTile: 'stone',
  features: [
    // === ENTRANCE HALL ===
    { x: 80, y: 96, width: 40, height: 20, type: 'clearing', fill: 'stone' },

    // === WEST WING - Puzzle rooms ===
    { x: 15, y: 35, width: 40, height: 30, type: 'ruins' },
    { x: 20, y: 15, width: 28, height: 16, type: 'ruins' },

    // === EAST WING - Combat arena ===
    { x: 140, y: 35, width: 40, height: 30, type: 'ruins' },
    { x: 146, y: 15, width: 28, height: 16, type: 'ruins' },

    // === CENTRAL CHAMBER ===
    { x: 70, y: 30, width: 60, height: 40, type: 'clearing', fill: 'stone' },
    { x: 80, y: 36, width: 40, height: 28, type: 'ruins' },

    // === TREASURE VAULT (north) ===
    { x: 84, y: 8, width: 32, height: 20, type: 'ruins' },

    // === EAST TREASURE WING ===
    { x: 165, y: 8, width: 20, height: 14, type: 'ruins' },

    // === WEST LIBRARY ===
    { x: 5, y: 60, width: 20, height: 15, type: 'ruins' },

    // === CORRIDORS ===
    { x: 96, y: 70, width: 8, height: 30, type: 'path', fill: 'stone' },
    { x: 40, y: 50, width: 50, height: 6, type: 'path', fill: 'stone' },
    { x: 110, y: 50, width: 40, height: 6, type: 'path', fill: 'stone' },
    { x: 30, y: 31, width: 6, height: 16, type: 'path', fill: 'stone' },
    { x: 160, y: 31, width: 6, height: 16, type: 'path', fill: 'stone' },
    { x: 96, y: 28, width: 8, height: 10, type: 'path', fill: 'stone' },
    { x: 130, y: 50, width: 8, height: 46, type: 'path', fill: 'stone' },
    { x: 60, y: 50, width: 8, height: 46, type: 'path', fill: 'stone' },
    { x: 130, y: 15, width: 35, height: 4, type: 'path', fill: 'stone' },
    { x: 15, y: 55, width: 6, height: 10, type: 'path', fill: 'stone' },
  ],
  portals: [
    { x: 100, y: 117, targetMap: 'deep_woods', targetX: 120, targetY: 30 },
    { x: 197, y: 110, targetMap: 'forest', targetX: 282, targetY: 22 },
  ],
  chests: [
    { x: 25, y: 45, interactionId: 'ruins_puzzle_chest' },
    { x: 160, y: 50, interactionId: 'ruins_combat_chest' },
    { x: 100, y: 14, interactionId: 'ancient_chest' },
    { x: 90, y: 44, interactionId: 'ruins_central_chest' },
    { x: 175, y: 14, interactionId: 'east_vault_chest' },
    { x: 12, y: 68, interactionId: 'library_chest' },
    { x: 150, y: 45, interactionId: 'ruins_arena_chest' },
    { x: 35, y: 22, interactionId: 'ruins_west_chest' },
  ],
  interactables: [
    { x: 100, y: 50, type: 'well', walkable: false, interactionId: 'ancient_fountain' },
    { x: 35, y: 25, type: 'sign', walkable: false, interactionId: 'ancient_tablet' },
    { x: 160, y: 25, type: 'sign', walkable: false, interactionId: 'ancient_tablet_2' },
    { x: 100, y: 18, type: 'sign', walkable: false, interactionId: 'vault_inscription' },
    { x: 10, y: 65, type: 'sign', walkable: false, interactionId: 'library_tablet' },
    { x: 175, y: 12, type: 'campfire', walkable: false, interactionId: 'campfire' },
  ],
  enemyZones: [
    { x: 140, y: 30, width: 44, height: 36, enemyType: 'shadow', count: 8 },
    { x: 70, y: 30, width: 60, height: 40, enemyType: 'shadow', count: 6 },
    { x: 84, y: 8, width: 32, height: 20, enemyType: 'shadow', count: 5 },
    { x: 15, y: 35, width: 40, height: 30, enemyType: 'shadow', count: 4 },
    { x: 165, y: 8, width: 20, height: 14, enemyType: 'shadow', count: 4 },
  ],
};

// Generate all maps
export const villageMap: WorldMap = generateMap(villageDef);
export const forestMap: WorldMap = generateMap(forestDef);
export const deepWoodsMap: WorldMap = generateMap(deepWoodsDef);
export const ruinsMap: WorldMap = generateMap(ruinsDef);

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
