import { WorldMap } from '@/lib/game/World';
import { generateMap, MapDefinition } from './mapGenerator';

// ============= VILLAGE: 240x160 Dense Interconnected Starting Town =============
const villageDef: MapDefinition = {
  name: 'Greenleaf Village',
  subtitle: 'A haven at the edge of the wilds',
  width: 240,
  height: 160,
  spawnPoint: { x: 120, y: 110 },
  seed: 42,
  baseTerrain: 'grassland',
  borderTile: 'tree',
  features: [
    // ====== CENTRAL COBBLESTONE PLAZA ======
    { x: 95, y: 68, width: 50, height: 34, type: 'cobble_plaza' },

    // ====== TOWN HALL (center of plaza) ======
    { x: 110, y: 58, width: 16, height: 10, type: 'building', interactionId: 'town_hall' },

    // ====== RESIDENTIAL DISTRICT (west) - organic village layout with yards ======
    { x: 25, y: 48, width: 8, height: 6, type: 'building', interactionId: 'house_1' },
    { x: 40, y: 52, width: 8, height: 6, type: 'building', interactionId: 'house_2' },
    { x: 28, y: 65, width: 8, height: 6, type: 'building', interactionId: 'house_3' },
    { x: 50, y: 60, width: 8, height: 6, type: 'building', interactionId: 'house_4' },
    { x: 35, y: 78, width: 8, height: 6, type: 'building', interactionId: 'house_5' },
    { x: 55, y: 72, width: 8, height: 6, type: 'building', interactionId: 'house_6' },
    { x: 68, y: 50, width: 8, height: 6, type: 'building', interactionId: 'house_7' },
    { x: 22, y: 88, width: 8, height: 6, type: 'building', interactionId: 'house_8' },
    { x: 48, y: 88, width: 8, height: 6, type: 'building', interactionId: 'house_9' },
    { x: 72, y: 65, width: 8, height: 6, type: 'building', interactionId: 'house_10' },

    // ====== MARKET DISTRICT (east) - shops with cobblestone ======
    { x: 155, y: 65, width: 30, height: 18, type: 'cobble_plaza' },
    { x: 184, y: 74, width: 24, height: 18, type: 'cobble_plaza' },
    { x: 155, y: 58, width: 8, height: 6, type: 'inn_building', interactionId: 'shop_weapons', interiorMap: 'interior_blacksmith', interiorSpawnX: 8, interiorSpawnY: 10 },
    { x: 175, y: 56, width: 8, height: 6, type: 'inn_building', interactionId: 'shop_potions', interiorMap: 'interior_merchant', interiorSpawnX: 7, interiorSpawnY: 10 },
    { x: 175, y: 88, width: 8, height: 6, type: 'inn_building', interactionId: 'inn', interiorMap: 'interior_inn', interiorSpawnX: 10, interiorSpawnY: 12 },
    { x: 192, y: 64, width: 8, height: 6, type: 'building', interactionId: 'shop_magic' },
    { x: 192, y: 80, width: 8, height: 6, type: 'building', interactionId: 'tavern' },

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
    // Ravine spring on the north ridge (landmark; el zones applied after features)
    { x: 68, y: 5, width: 14, height: 16, type: 'waterfall' },

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

    // ====== VILLAGE CHURCH (east of cemetery) ======
    { x: 42, y: 28, width: 20, height: 20, type: 'clearing', fill: 'dirt' },
    { x: 45, y: 30, width: 12, height: 14, type: 'church', interactionId: 'village_church' },

    // ====== SCATTERED COTTAGES (countryside feel) ======
    { x: 88, y: 117, width: 6, height: 6, type: 'cottage', interactionId: 'cottage_south', interiorMap: 'interior_cottage_a', interiorSpawnX: 6, interiorSpawnY: 8 },
    { x: 165, y: 40, width: 6, height: 6, type: 'cottage', interactionId: 'cottage_east' },
    { x: 22, y: 95, width: 6, height: 6, type: 'cottage', interactionId: 'cottage_west' },
    { x: 195, y: 100, width: 6, height: 6, type: 'cottage', interactionId: 'cottage_lake' },

    // ====== WATCHTOWERS along roads ======
    { x: 115, y: 38, width: 6, height: 6, type: 'watchtower' },
    { x: 145, y: 95, width: 6, height: 6, type: 'watchtower' },

    // ====== DESTROYED OUTPOST (north-west, near cemetery) ======
    { x: 45, y: 15, width: 18, height: 14, type: 'destroyed_town' },
    { x: 48, y: 26, width: 5, height: 4, type: 'broken_wagon' },
    { x: 118, y: 118, width: 5, height: 4, type: 'broken_wagon' },
    { x: 158, y: 68, width: 6, height: 1, type: 'market_stall_row' },
    { x: 168, y: 68, width: 6, height: 1, type: 'market_stall_row' },
    { x: 176, y: 70, width: 4, height: 1, type: 'market_stall_row' },
    { x: 160, y: 78, width: 5, height: 1, type: 'market_stall_row' },
    { x: 168, y: 78, width: 5, height: 1, type: 'market_stall_row' },
    { x: 160, y: 84, width: 4, height: 1, type: 'market_stall_row' },
    { x: 184, y: 78, width: 5, height: 1, type: 'market_stall_row' },
    { x: 184, y: 88, width: 5, height: 1, type: 'market_stall_row' },
    { x: 58, y: 108, width: 5, height: 4, type: 'broken_wagon' },

    // ====== COBBLESTONE ROADS connecting everything ======
    // Main N-S road through center
    { x: 116, y: 10, width: 6, height: 130, type: 'path', fill: 'cobblestone' },
    // Main E-W road through town
    { x: 20, y: 72, width: 200, height: 4, type: 'path', fill: 'cobblestone' },
    // Market road
    { x: 145, y: 72, width: 60, height: 4, type: 'path', fill: 'cobblestone' },
    // Tavern frontage
    { x: 184, y: 88, width: 24, height: 4, type: 'path', fill: 'cobblestone' },
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
    { x: 120, y: 8, targetMap: 'forest', targetX: 150, targetY: 289 },
    { x: 237, y: 80, targetMap: 'forest', targetX: 4, targetY: 150 },
    { x: 120, y: 150, targetMap: 'deep_woods', targetX: 120, targetY: 8 },
  ],
  chests: [
    { x: 116, y: 112, interactionId: 'start_potion_chest_1' },
    { x: 120, y: 115, interactionId: 'start_potion_chest_2' },
    { x: 124, y: 112, interactionId: 'start_potion_chest_3' },
    { x: 70, y: 100, interactionId: 'chest_1' },
    { x: 190, y: 35, interactionId: 'training_chest' },
    { x: 25, y: 120, interactionId: 'garden_chest' },
    { x: 140, y: 85, interactionId: 'market_chest' },
    { x: 220, y: 18, interactionId: 'bandit_chest' },
    { x: 50, y: 40, interactionId: 'village_hidden_chest' },
    { x: 115, y: 130, interactionId: 'farm_chest' },
    { x: 168, y: 110, interactionId: 'lake_chest' },
    { x: 212, y: 42, interactionId: 'hedge_chest' },
    { x: 35, y: 28, interactionId: 'cemetery_chest' },
  ],
  interactables: [
    { x: 120, y: 104, type: 'bonfire', walkable: false, interactionId: 'bonfire_rest' },
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
    // Tempest Grass patches scattered across town squares, paths, and clearings
    { x: 105, y: 78, type: 'tempest_grass', walkable: true, interactionId: 'tempest_grass_pickup' },
    { x: 130, y: 75, type: 'tempest_grass', walkable: true, interactionId: 'tempest_grass_pickup' },
    { x: 160, y: 70, type: 'tempest_grass', walkable: true, interactionId: 'tempest_grass_pickup' },
    { x: 85, y: 98, type: 'tempest_grass', walkable: true, interactionId: 'tempest_grass_pickup' },
    { x: 45, y: 65, type: 'tempest_grass', walkable: true, interactionId: 'tempest_grass_pickup' },
    { x: 118, y: 112, type: 'tempest_grass', walkable: true, interactionId: 'tempest_grass_pickup' },
    { x: 100, y: 45, type: 'tempest_grass', walkable: true, interactionId: 'tempest_grass_pickup' },
    { x: 175, y: 68, type: 'tempest_grass', walkable: true, interactionId: 'tempest_grass_pickup' },
    { x: 200, y: 98, type: 'tempest_grass', walkable: true, interactionId: 'tempest_grass_pickup' },
    { x: 60, y: 85, type: 'tempest_grass', walkable: true, interactionId: 'tempest_grass_pickup' },
  ],
  props: [
    // North ridge overlook
    { x: 84, y: 14, type: 'bench', walkable: false },
    { x: 78, y: 12, type: 'lantern', walkable: false },
    // Plaza social core
    { x: 104, y: 86, type: 'bench', walkable: false },
    { x: 132, y: 86, type: 'bench', walkable: false },
    { x: 106, y: 90, type: 'pot', walkable: true },
    { x: 132, y: 90, type: 'pot', walkable: true },
    { x: 126, y: 96, type: 'lantern', walkable: false },
    { x: 102, y: 75, type: 'bench', walkable: false },
    { x: 132, y: 75, type: 'bench', walkable: false },
    { x: 100, y: 78, type: 'pot', walkable: true },
    { x: 134, y: 78, type: 'pot', walkable: true },
    { x: 116, y: 72, type: 'pot', walkable: true },
    // Smithy + market quarter
    { x: 152, y: 60, type: 'lantern', walkable: false },
    { x: 165, y: 60, type: 'barrel', walkable: false },
    { x: 167, y: 60, type: 'crate', walkable: false },
    { x: 173, y: 60, type: 'barrel', walkable: false },
    { x: 185, y: 66, type: 'cart', walkable: false },
    { x: 150, y: 66, type: 'cart', walkable: false },
    { x: 164, y: 66, type: 'barrel', walkable: false },
    { x: 166, y: 66, type: 'crate', walkable: false },
    { x: 171, y: 66, type: 'pot', walkable: true },
    { x: 178, y: 66, type: 'barrel', walkable: false },
    { x: 180, y: 66, type: 'crate', walkable: false },
    { x: 184, y: 70, type: 'bench', walkable: false },
    { x: 172, y: 84, type: 'bench', walkable: false },
    { x: 162, y: 86, type: 'pot', walkable: true },
    { x: 178, y: 86, type: 'pot', walkable: true },
    { x: 188, y: 74, type: 'lantern', walkable: false },
    { x: 186, y: 86, type: 'bench', walkable: false },
    { x: 204, y: 86, type: 'bench', walkable: false },
    { x: 188, y: 90, type: 'barrel', walkable: false },
    { x: 190, y: 90, type: 'crate', walkable: false },
    { x: 202, y: 90, type: 'barrel', walkable: false },
    { x: 204, y: 90, type: 'crate', walkable: false },
    { x: 186, y: 80, type: 'lantern', walkable: false },
    { x: 204, y: 80, type: 'lantern', walkable: false },
    // Churchyard + west residential
    { x: 44, y: 42, type: 'bench', walkable: false },
    { x: 58, y: 42, type: 'bench', walkable: false },
    { x: 46, y: 46, type: 'tombstone', walkable: false },
    { x: 54, y: 46, type: 'tombstone', walkable: false },
    { x: 60, y: 46, type: 'lantern', walkable: false },
    { x: 62, y: 52, type: 'barrel', walkable: false },
    { x: 64, y: 52, type: 'crate', walkable: false },
    { x: 44, y: 58, type: 'bench', walkable: false },
    { x: 30, y: 66, type: 'pot', walkable: true },
    { x: 54, y: 80, type: 'pot', walkable: true },
    { x: 75, y: 82, type: 'bench', walkable: false },
    { x: 88, y: 118, type: 'barrel', walkable: false },
    { x: 92, y: 118, type: 'crate', walkable: false },
    { x: 18, y: 108, type: 'cart', walkable: false },
    { x: 58, y: 112, type: 'barrel', walkable: false },
    { x: 60, y: 112, type: 'crate', walkable: false },
    { x: 66, y: 116, type: 'hay_bale', walkable: false },
    { x: 135, y: 118, type: 'scarecrow', walkable: false },
    { x: 142, y: 123, type: 'hay_bale', walkable: false },
    { x: 147, y: 121, type: 'hay_bale', walkable: false },
    { x: 128, y: 118, type: 'barrel', walkable: false },
    { x: 130, y: 118, type: 'crate', walkable: false },
    { x: 152, y: 118, type: 'cart', walkable: false },
    { x: 165, y: 111, type: 'bench', walkable: false },
    { x: 188, y: 108, type: 'barrel', walkable: false },
    { x: 192, y: 108, type: 'crate', walkable: false },
  ],
  secretAreas: [
    { x: 5, y: 20, width: 6, height: 4, fill: 'stone' },
    { x: 220, y: 140, width: 5, height: 4, fill: 'stone' },
    { x: 75, y: 45, width: 4, height: 4, fill: 'grass' },
    { x: 200, y: 50, width: 5, height: 3, fill: 'stone' },
    { x: 95, y: 135, width: 6, height: 4, fill: 'grass' },
    { x: 160, y: 130, width: 4, height: 4, fill: 'stone' },
  ],
  elevationZones: [
    // North zones start at y=2 so rows y=2–3 match portal/approach rows (y=4 portal). Otherwise el0→el1
    // at y=3|4 leaves a horizontal seam — stampCliffs only handles “north tile higher than south”.
    // === TIER 1: Broad north ridge backing the entire town ===
    { x: 4, y: 2, width: 232, height: 44, elevation: 1 },
    // === TIER 2: Center-north peak (garden / watchtower zone) ===
    { x: 96, y: 2, width: 50, height: 26, elevation: 2 },
    // === TIER 2: NE fortress citadel ===
    { x: 168, y: 2, width: 64, height: 28, elevation: 2 },
    // === TIER 1: West residential terrace (separated by a flat valley from ridge) ===
    { x: 4, y: 50, width: 90, height: 26, elevation: 1 },
    // === TIER 1: East market plateau ===
    { x: 148, y: 50, width: 88, height: 26, elevation: 1 },
    // === TIER 1: SW farm plateau ===
    { x: 4, y: 136, width: 104, height: 20, elevation: 1 },
    // === TIER 1: SE lake terrace ===
    { x: 150, y: 140, width: 86, height: 16, elevation: 1 },
  ],
  stairways: [
    // Stairways start AT south_face (zone_y + zone_h - 1) so placeStairways, which runs
    // after stampCliffs, overwrites all 4 blocked rows. Roads/paths are now excluded from
    // stampCliffs entirely so narrow stairways only needed at scenic crossing points.

    // Center peak (el2 → el1): south_face=27, on the main N-S cobble
    { x: 114, y: 27, width: 8, height: 4, elevation: 2 },
    // North ridge (el1 → el0): south_face=45, main N-S cobble
    { x: 114, y: 45, width: 8, height: 4, elevation: 1 },
    // NE citadel (el2 → el1): south_face=29
    { x: 188, y: 29, width: 6, height: 4, elevation: 2 },
    // NE to town (el1 → el0): south_face=45
    { x: 188, y: 45, width: 4, height: 4, elevation: 1 },
    // West cemetery approach: south_face=45
    { x: 44, y: 45, width: 4, height: 4, elevation: 1 },
    // East market approach: south_face=45
    { x: 148, y: 45, width: 4, height: 4, elevation: 1 },
    // SW farm south face: south_face=155 (zone y=140 + height=16 - 1 = 155)
    { x: 54, y: 155, width: 6, height: 4, elevation: 1 },
    // SE lake south face: south_face=155
    { x: 176, y: 155, width: 4, height: 4, elevation: 1 },
  ],
  enemyZones: [
    { x: 215, y: 12, width: 16, height: 12, enemyType: 'bandit', count: 4 },
    { x: 5, y: 130, width: 12, height: 10, enemyType: 'slime', count: 3 },
  ],
};

// ============= FOREST: 300x300 Massive Explorable Forest =============
const forestDef: MapDefinition = {
  name: 'Whispering Woods',
  subtitle: 'Something watches from between the trees',
  width: 300,
  height: 300,
  spawnPoint: { x: 150, y: 290 },
  seed: 137,
  baseTerrain: 'forest',
  borderTile: 'tree',
  autoRoads: false,
  features: [
    // === FOREST CLEARINGS ===
    { x: 60, y: 60, width: 30, height: 24, type: 'clearing', fill: 'grass' },
    { x: 200, y: 100, width: 24, height: 20, type: 'clearing', fill: 'grass' },
    { x: 130, y: 160, width: 40, height: 30, type: 'clearing', fill: 'grass' },
    { x: 80, y: 220, width: 20, height: 16, type: 'clearing', fill: 'grass' },
    { x: 220, y: 220, width: 24, height: 20, type: 'clearing', fill: 'grass' },
    { x: 40, y: 140, width: 20, height: 16, type: 'clearing', fill: 'grass' },
    { x: 48, y: 146, width: 20, height: 20, type: 'clearing', fill: 'dirt' },
    { x: 250, y: 50, width: 20, height: 16, type: 'clearing', fill: 'grass' },
    { x: 150, y: 50, width: 30, height: 20, type: 'clearing', fill: 'grass' },
    { x: 138, y: 246, width: 24, height: 18, type: 'clearing', fill: 'dirt' },
    { x: 126, y: 156, width: 48, height: 24, type: 'clearing', fill: 'dirt' },
    { x: 116, y: 192, width: 48, height: 24, type: 'clearing', fill: 'dirt' },
    { x: 126, y: 180, width: 26, height: 14, type: 'clearing', fill: 'dirt' },

    // === RANGER OUTPOST ===
    { x: 136, y: 164, width: 10, height: 8, type: 'inn_building', interactionId: 'ranger_cabin', interiorMap: 'interior_ranger_cabin', interiorSpawnX: 7, interiorSpawnY: 5 },
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

    // === THE HOLLOW — River Crossing (east-west barrier at y~78-86) ===
    { x: 30, y: 78, width: 40, height: 6, type: 'wall', fill: 'water' },
    { x: 68, y: 79, width: 44, height: 6, type: 'wall', fill: 'water' },
    { x: 136, y: 78, width: 40, height: 6, type: 'wall', fill: 'water' },
    { x: 190, y: 79, width: 50, height: 6, type: 'wall', fill: 'water' },
    { x: 250, y: 78, width: 40, height: 6, type: 'wall', fill: 'water' },
    // Bridges across the Hollow river
    { x: 120, y: 78, width: 8, height: 6, type: 'bridge' },
    { x: 178, y: 78, width: 6, height: 6, type: 'bridge' },

    // === THE HOLLOW — Dark clearings and corrupted terrain (y < 75) ===
    { x: 40, y: 30, width: 30, height: 30, type: 'clearing', fill: 'dark_grass' },
    { x: 80, y: 40, width: 25, height: 25, type: 'clearing', fill: 'dark_grass' },
    { x: 110, y: 50, width: 30, height: 22, type: 'clearing', fill: 'dark_grass' },
    { x: 145, y: 35, width: 30, height: 30, type: 'clearing', fill: 'dark_grass' },
    { x: 180, y: 45, width: 25, height: 25, type: 'clearing', fill: 'dark_grass' },
    { x: 60, y: 55, width: 20, height: 20, type: 'clearing', fill: 'dark_grass' },
    { x: 200, y: 30, width: 24, height: 20, type: 'clearing', fill: 'dark_grass' },
    // Mossy stone patches — corruption seeping through
    { x: 85, y: 35, width: 8, height: 6, type: 'clearing', fill: 'mossy_stone' },
    { x: 155, y: 50, width: 6, height: 4, type: 'clearing', fill: 'mossy_stone' },
    { x: 120, y: 25, width: 8, height: 6, type: 'clearing', fill: 'mossy_stone' },
    // Paths through the Hollow (mossy stone trails)
    { x: 120, y: 72, width: 8, height: 8, type: 'path', fill: 'dirt' },
    { x: 122, y: 55, width: 6, height: 18, type: 'path', fill: 'dirt' },
    { x: 118, y: 40, width: 8, height: 16, type: 'path', fill: 'dirt' },
    { x: 120, y: 28, width: 6, height: 14, type: 'path', fill: 'dirt' },
    // Side path to shortcut gate
    { x: 100, y: 38, width: 20, height: 4, type: 'path', fill: 'dirt' },

    // === THE HOLLOW — Fog Gate to Boss Arena ===
    { x: 105, y: 12, width: 34, height: 20, type: 'clearing', fill: 'dark_grass' },

    // === THE HOLLOW — Hunter trail camps ===
    { x: 115, y: 65, width: 10, height: 8, type: 'abandoned_camp', interactionId: 'hollow_hunter_camp_1' },
    { x: 130, y: 45, width: 8, height: 6, type: 'abandoned_camp', interactionId: 'hollow_hunter_camp_2' },
    { x: 118, y: 28, width: 10, height: 8, type: 'abandoned_camp', interactionId: 'hollow_hunters_final_camp' },

    // === THE HOLLOW — Shortcut gate (blocks path back to bonfire from boss side) ===
    { x: 98, y: 40, width: 4, height: 4, type: 'gate', interactionId: 'hollow_gate' },

    // === FOREST LAKES ===
    { x: 110, y: 87, width: 28, height: 13, type: 'lake' },
    { x: 240, y: 180, width: 20, height: 16, type: 'lake' },
    { x: 40, y: 200, width: 16, height: 12, type: 'lake' },
    { x: 180, y: 250, width: 22, height: 16, type: 'lake' },

    // === BRIDGES ===
    { x: 120, y: 92, width: 8, height: 4, type: 'bridge' },
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
    { x: 26, y: 208, width: 14, height: 8, type: 'abandoned_camp', interactionId: 'caravan_wreck' },
    { x: 144, y: 228, width: 5, height: 4, type: 'broken_wagon' },
    { x: 148, y: 118, width: 5, height: 4, type: 'broken_wagon' },
    { x: 156, y: 172, width: 4, height: 1, type: 'market_stall_row' },
    { x: 160, y: 174, width: 4, height: 1, type: 'market_stall_row' },
    { x: 150, y: 214, width: 5, height: 4, type: 'broken_wagon' },
    { x: 118, y: 176, width: 5, height: 4, type: 'broken_wagon' },

    // === WATERFALL (north) — large summit cascade; clearing placed first, fall overwrites the chasm
    { x: 126, y: 36, width: 48, height: 16, type: 'clearing', fill: 'grass' },
    { x: 140, y: 4, width: 30, height: 36, type: 'waterfall' },

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

    // === RUINED FORTS (collapsed, overrun) ===
    { x: 110, y: 30, width: 18, height: 16, type: 'ruined_fort', interactionId: 'ruined_north_fort' },
    { x: 260, y: 170, width: 16, height: 14, type: 'ruined_fort', interactionId: 'ruined_east_fort' },
    { x: 30, y: 170, width: 16, height: 14, type: 'ruined_fort', interactionId: 'ruined_west_fort' },

    // === FOREST CHURCHES (ancient, overgrown) ===
    { x: 180, y: 130, width: 12, height: 16, type: 'church', interactionId: 'forest_church' },
    { x: 50, y: 100, width: 10, height: 14, type: 'church', interactionId: 'old_chapel' },

    // === SCATTERED COTTAGES (hermits, woodcutters) ===
    { x: 90, y: 180, width: 6, height: 6, type: 'cottage', interactionId: 'woodcutter_cottage', interiorMap: 'interior_woodcutter_cottage', interiorSpawnX: 6, interiorSpawnY: 8 },
    { x: 230, y: 130, width: 6, height: 6, type: 'cottage', interactionId: 'witch_cottage', interiorMap: 'interior_witch_cottage', interiorSpawnX: 6, interiorSpawnY: 8 },
    // Hunter shack is teased from below, then reached by wrapping around a cliff-backed approach.
    { x: 60, y: 186, width: 62, height: 26, type: 'cliff_face' },
    { x: 134, y: 182, width: 6, height: 6, type: 'cottage', interactionId: 'hunter_cottage', interiorMap: 'interior_hunter_cottage', interiorSpawnX: 6, interiorSpawnY: 8 },
    { x: 108, y: 196, width: 28, height: 14, type: 'ruined_fort', interactionId: 'hunter_gate_ruin' },
    { x: 136, y: 192, width: 72, height: 18, type: 'cliff_face' },
    { x: 118, y: 220, width: 18, height: 12, type: 'abandoned_camp', interactionId: 'hunters_last_camp' },
    { x: 144, y: 206, width: 16, height: 14, type: 'cemetery' },
    { x: 152, y: 220, width: 18, height: 12, type: 'destroyed_town', interactionId: 'hunter_wreck' },
    { x: 170, y: 90, width: 6, height: 6, type: 'cottage', interactionId: 'forest_cottage', interiorMap: 'interior_cottage_forest', interiorSpawnX: 6, interiorSpawnY: 8 },
    { x: 80, y: 50, width: 6, height: 6, type: 'cottage', interactionId: 'ruin_cottage' },
    { x: 210, y: 200, width: 6, height: 6, type: 'cottage', interactionId: 'hidden_cottage' },

    // === WATCHTOWERS ===
    { x: 100, y: 70, width: 6, height: 6, type: 'watchtower' },
    { x: 230, y: 90, width: 6, height: 6, type: 'watchtower' },

    // === ABANDONED CAMPS scattered ===
    { x: 100, y: 200, width: 16, height: 12, type: 'abandoned_camp', interactionId: 'lost_expedition' },
    { x: 50, y: 80, width: 12, height: 10, type: 'abandoned_camp', interactionId: 'hunters_camp' },
    { x: 270, y: 200, width: 14, height: 10, type: 'abandoned_camp', interactionId: 'hermit_camp' },

    // === CEMETERY (deep in forest) ===
    { x: 120, y: 240, width: 22, height: 16, type: 'cemetery' },

    // === ADDITIONAL DESTROYED VILLAGE ===
    { x: 180, y: 200, width: 24, height: 18, type: 'destroyed_town' },

    // === SOUTH QUADRANT POIs (below y:250 — fills the empty stretch before the village portal) ===
    { x: 200, y: 260, width: 16, height: 12, type: 'abandoned_camp', interactionId: 'southern_outpost' },
    { x: 60, y: 270, width: 6, height: 6, type: 'cottage', interactionId: 'forest_hermit' },
    { x: 250, y: 270, width: 10, height: 14, type: 'church', interactionId: 'overgrown_shrine' },
    { x: 176, y: 176, width: 18, height: 14, type: 'clearing', fill: 'grass' },
    { x: 104, y: 170, width: 14, height: 12, type: 'clearing', fill: 'dirt' },

    // === MAIN TRAILS: basin to ridge, then branching into shelves ===
    { x: 146, y: 258, width: 8, height: 38, type: 'path', fill: 'dirt' },
    { x: 132, y: 184, width: 42, height: 10, type: 'path', fill: 'dirt' },
    { x: 146, y: 82, width: 8, height: 102, type: 'path', fill: 'dirt' },
    { x: 92, y: 74, width: 106, height: 6, type: 'path', fill: 'dirt' },
    { x: 74, y: 168, width: 72, height: 6, type: 'path', fill: 'dirt' },
    { x: 54, y: 152, width: 6, height: 18, type: 'path', fill: 'dirt' },
    { x: 154, y: 168, width: 80, height: 6, type: 'path', fill: 'dirt' },
    { x: 228, y: 122, width: 6, height: 46, type: 'path', fill: 'dirt' },
    { x: 234, y: 148, width: 22, height: 4, type: 'path', fill: 'dirt' },
    { x: 260, y: 48, width: 6, height: 20, type: 'path', fill: 'dirt' },
    { x: 118, y: 204, width: 38, height: 6, type: 'path', fill: 'dirt' },
    { x: 150, y: 192, width: 6, height: 14, type: 'path', fill: 'dirt' },
    { x: 138, y: 188, width: 18, height: 4, type: 'path', fill: 'dirt' },
    // Shortcut connector between the Disparaged Cottage approach and the ranger plateau.
    { x: 124, y: 202, width: 6, height: 12, type: 'path', fill: 'dirt' },
    { x: 120, y: 212, width: 10, height: 4, type: 'path', fill: 'dirt' },
    { x: 126, y: 218, width: 22, height: 4, type: 'path', fill: 'dirt' },
    { x: 146, y: 214, width: 4, height: 18, type: 'path', fill: 'dirt' },
    // River cut separating the skeleton shelf from the bonfire/shortcut shelf until the loop reconnects farther east.
    { x: 86, y: 196, width: 22, height: 18, type: 'wall', fill: 'water' },
    { x: 90, y: 208, width: 20, height: 18, type: 'wall', fill: 'water' },
    { x: 94, y: 222, width: 18, height: 16, type: 'wall', fill: 'water' },
    { x: 98, y: 234, width: 14, height: 12, type: 'wall', fill: 'water' },
    { x: 68, y: 206, width: 20, height: 22, type: 'cliff_face' },
    { x: 120, y: 218, width: 8, height: 12, type: 'cliff_face' },
    // West branch off the central spine — optional exploration; ranger_north_spine_sign + whisper_wild_fork_sign frame the main quest lane vs. secrets
    { x: 100, y: 120, width: 40, height: 6, type: 'path', fill: 'dirt' },
    // Chapel approach: paved link from west branch (south of old_chapel footprint y≤113) to the ranger remains at ~55,114
    { x: 58, y: 120, width: 43, height: 6, type: 'path', fill: 'dirt' },
    { x: 50, y: 114, width: 16, height: 10, type: 'path', fill: 'dirt' },

    // === MID-ZONE CORRIDOR — tree walls funnelling the spine between ranger plateau and fort ===
    // West tree wall (south segment, below the west-branch gap)
    { x: 90, y: 128, width: 12, height: 18, type: 'wall', fill: 'tree' },
    // West tree wall (north segment, above the west-branch gap)
    { x: 92, y: 108, width: 10, height: 10, type: 'wall', fill: 'tree' },
    // West palisade — closes gap between west tree wall and fort west wall
    { x: 102, y: 131, width: 28, height: 15, type: 'wall', fill: 'tree' },
    // East tree wall (south segment, below the east side-trail gap at ~y:130)
    { x: 160, y: 136, width: 12, height: 12, type: 'wall', fill: 'tree' },
    // East tree wall (north segment, above the east side-trail gap)
    { x: 158, y: 108, width: 12, height: 20, type: 'wall', fill: 'tree' },
    // East palisade — closes gap between fort east wall and east tree wall
    { x: 152, y: 131, width: 8, height: 15, type: 'wall', fill: 'tree' },

    // === WATERFALL BASE — mossy stone pool ===
    { x: 176, y: 46, width: 4, height: 3, type: 'clearing', fill: 'mossy_stone' },

    // === SOUTH ENTRY — broken wagon clearing ===
    { x: 142, y: 276, width: 6, height: 4, type: 'clearing', fill: 'dirt' },

    // ============================================================
    // === CREEK SYSTEMS — winding water channels with bridges ===
    // ============================================================

    // --- South-east creek: runs from (200,230) curving south-east toward (260,270) ---
    { x: 200, y: 232, width: 30, height: 3, type: 'wall', fill: 'water' },
    { x: 228, y: 234, width: 3, height: 16, type: 'wall', fill: 'water' },
    { x: 230, y: 248, width: 20, height: 3, type: 'wall', fill: 'water' },
    { x: 248, y: 250, width: 3, height: 14, type: 'wall', fill: 'water' },
    { x: 215, y: 232, width: 6, height: 3, type: 'bridge' },
    { x: 228, y: 240, width: 3, height: 4, type: 'bridge' },
    { x: 238, y: 248, width: 6, height: 3, type: 'bridge' },

    // --- West creek: runs from the hidden grove lake (40,200) south past spider nest ---
    { x: 38, y: 212, width: 3, height: 20, type: 'wall', fill: 'water' },
    { x: 36, y: 230, width: 14, height: 3, type: 'wall', fill: 'water' },
    { x: 38, y: 220, width: 3, height: 4, type: 'bridge' },

    // --- Central-east stream: descends from east of golem arena (240,170) south ---
    { x: 264, y: 165, width: 3, height: 22, type: 'wall', fill: 'water' },
    { x: 264, y: 185, width: 14, height: 3, type: 'wall', fill: 'water' },
    { x: 264, y: 174, width: 3, height: 4, type: 'bridge' },

    // --- Far south creek: cuts across the entry approach (y~270) ---
    { x: 110, y: 272, width: 28, height: 3, type: 'wall', fill: 'water' },
    { x: 170, y: 273, width: 24, height: 3, type: 'wall', fill: 'water' },
    { x: 128, y: 272, width: 6, height: 3, type: 'bridge' },
    { x: 182, y: 273, width: 6, height: 3, type: 'bridge' },

    // ============================================================
    // === CLIFF FACES & ROCKY RIDGES — natural barriers ===
    // ============================================================

    // --- East ridge: rocky shelf from (270,100) to (280,150) ---
    { x: 272, y: 100, width: 16, height: 50, type: 'cliff_face' },

    // --- South-east rocky shelf ---
    { x: 205, y: 240, width: 24, height: 8, type: 'cliff_face' },

    // --- Central-south ridge: separates cemetery area from south trail ---
    { x: 106, y: 248, width: 20, height: 6, type: 'cliff_face' },

    // --- Far east rocky spur ---
    { x: 285, y: 200, width: 10, height: 20, type: 'cliff_face' },

    // ============================================================
    // === ROCKY OUTCROPS & STONE CLEARINGS ===
    // ============================================================

    // --- Rocky outcrop south-east (fills empty zone x:210-240, y:210-230) ---
    { x: 212, y: 212, width: 16, height: 10, type: 'clearing', fill: 'stone' },
    { x: 214, y: 216, width: 8, height: 4, type: 'clearing', fill: 'mossy_stone' },

    // --- Ancient stone circle (far east, x:275, y:140) ---
    { x: 275, y: 140, width: 12, height: 10, type: 'clearing', fill: 'mossy_stone' },
    { x: 278, y: 143, width: 6, height: 4, type: 'clearing', fill: 'ruins_floor' },

    // --- Rocky shelf south of entry (fills x:200-230, y:270-285) ---
    { x: 200, y: 275, width: 18, height: 10, type: 'clearing', fill: 'stone' },

    // --- Mossy ruins east of spine (x:170, y:130) ---
    { x: 172, y: 132, width: 10, height: 8, type: 'ruins' },

    // ============================================================
    // === DENSE TREE CORRIDORS — natural funnelling ===
    // ============================================================

    // --- East corridor: forces path around rocky shelf ---
    { x: 260, y: 200, width: 8, height: 14, type: 'wall', fill: 'tree' },

    // --- South-west tree wall: guides players toward spider nest ---
    { x: 52, y: 236, width: 8, height: 22, type: 'wall', fill: 'tree' },

    // --- Central-south tree cluster: breaks up empty grass ---
    { x: 168, y: 240, width: 10, height: 8, type: 'wall', fill: 'tree' },

    // --- Far south tree lines: frames the entry corridor ---
    { x: 120, y: 282, width: 8, height: 8, type: 'wall', fill: 'tree' },
    { x: 174, y: 282, width: 8, height: 8, type: 'wall', fill: 'tree' },

    // ============================================================
    // === NEW POIs — filling dead zones ===
    // ============================================================

    // --- Overgrown ruins (south-east, x:210, y:250) ---
    { x: 212, y: 252, width: 14, height: 10, type: 'ruins' },

    // --- Abandoned logging camp (central-south, x:165, y:235) ---
    { x: 165, y: 236, width: 14, height: 10, type: 'abandoned_camp', interactionId: 'logging_camp' },
    { x: 162, y: 234, width: 20, height: 14, type: 'clearing', fill: 'dirt' },

    // --- Collapsed cottage (far east, x:280, y:160) ---
    { x: 280, y: 160, width: 6, height: 6, type: 'cottage', interactionId: 'collapsed_cottage' },
    { x: 276, y: 158, width: 14, height: 10, type: 'clearing', fill: 'grass' },

    // --- Stone quarry (south-east, x:230, y:205) ---
    { x: 228, y: 205, width: 16, height: 12, type: 'clearing', fill: 'stone' },
    { x: 232, y: 208, width: 8, height: 6, type: 'clearing', fill: 'cobblestone' },

    // --- Sunken garden (west, x:20, y:170) ---
    { x: 18, y: 168, width: 14, height: 12, type: 'clearing', fill: 'grass' },
    { x: 22, y: 172, width: 6, height: 4, type: 'garden' },

    // --- Old well clearing (central, x:190, y:120) ---
    { x: 188, y: 118, width: 12, height: 10, type: 'clearing', fill: 'grass' },

    // --- Rocky pond (far south-west, x:30, y:280) ---
    { x: 28, y: 278, width: 12, height: 8, type: 'lake' },

    // --- Small pond (far east, x:275, y:220) ---
    { x: 275, y: 220, width: 10, height: 8, type: 'lake' },

    // --- Ruined shrine (south, x:80, y:280) ---
    { x: 78, y: 278, width: 10, height: 8, type: 'clearing', fill: 'mossy_stone' },
    { x: 80, y: 280, width: 6, height: 4, type: 'clearing', fill: 'ruins_floor' },

    // --- Rocky ford (east, x:260, y:230) ---
    { x: 258, y: 228, width: 10, height: 8, type: 'clearing', fill: 'mossy_stone' },
  ],
  portals: [
    { x: 150, y: 291, targetMap: 'village', targetX: 120, targetY: 8 },
    { x: 3, y: 150, targetMap: 'village', targetX: 235, targetY: 80 },
    { x: 150, y: 8, targetMap: 'deep_woods', targetX: 120, targetY: 190 },
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
    { x: 275, y: 265, interactionId: 'forest_hermit_chest' },
    { x: 105, y: 265, interactionId: 'ruins_south_chest' },
    { x: 30, y: 250, interactionId: 'spider_nest_chest' },
    { x: 190, y: 260, interactionId: 'forest_deep_chest' },
    { x: 30, y: 210, interactionId: 'destroyed_town_chest' },
    { x: 178, y: 48, interactionId: 'waterfall_chest' },
    { x: 258, y: 148, interactionId: 'temple_chest' },
    { x: 268, y: 28, interactionId: 'volcano_chest' },
    // New chests in enchanted groves and forts
    { x: 80, y: 150, interactionId: 'enchanted_chest_1' },
    { x: 248, y: 250, interactionId: 'enchanted_chest_2' },
    { x: 58, y: 268, interactionId: 'enchanted_chest_3' },
    { x: 138, y: 128, interactionId: 'fort_chest_1' },
    { x: 208, y: 66, interactionId: 'fort_chest_2' },
    { x: 68, y: 196, interactionId: 'fort_chest_3' },
    { x: 111, y: 220, interactionId: 'forest_river_chest' },
    { x: 225, y: 155, interactionId: 'golem_arena_chest' },
    // Fort garrison chest — inside the gate so entry feels earned
    { x: 145, y: 128, interactionId: 'fort_garrison_chest' },
    // Hollow boss arena chest — full manuscript
    { x: 130, y: 16, interactionId: 'hollow_boss_chest' },
    // Hidden chest behind waterfall
    { x: 180, y: 46, interactionId: 'waterfall_hidden_chest' },
  ],
  interactables: [
    { x: 140, y: 170, type: 'sign', walkable: false, interactionId: 'ranger_sign' },
    { x: 150, y: 162, type: 'sign', walkable: false, interactionId: 'ranger_north_spine_sign' },
    { x: 150, y: 115, type: 'sign', walkable: false, interactionId: 'fort_north_approach_sign' },
    { x: 150, y: 105, type: 'sign', walkable: false, interactionId: 'whisper_lake_runoff_sign' },
    { x: 120, y: 122, type: 'sign', walkable: false, interactionId: 'whisper_wild_fork_sign' },
    { x: 120, y: 98, type: 'sign', walkable: false, interactionId: 'bridge_sign' },
    { x: 60, y: 156, type: 'sign', walkable: false, interactionId: 'danger_sign' },
    { x: 130, y: 44, type: 'bonfire', walkable: false, interactionId: 'bonfire_hollow' },
    { x: 141, y: 148, type: 'bonfire', walkable: false, interactionId: 'bonfire_forest_fort' },
    { x: 130, y: 206, type: 'bonfire', walkable: false, interactionId: 'bonfire_forest_south' },
    { x: 150, y: 260, type: 'sign', walkable: false, interactionId: 'forest_entry_sign' },
    { x: 127, y: 205, type: 'shortcut_lever', walkable: false, interactionId: 'forest_shortcut_lever' },
    { x: 146, y: 240, type: 'stump', walkable: false, interactionId: 'stump_lore' },
    { x: 100, y: 100, type: 'stump', walkable: false, interactionId: 'stump_lore' },
    { x: 200, y: 90, type: 'stump', walkable: false, interactionId: 'stump_lore' },
    { x: 132, y: 188, type: 'sign', walkable: false, interactionId: 'hunter_cottage_sign' },
    { x: 168, y: 96, type: 'sign', walkable: false, interactionId: 'forest_cottage_sign' },
    { x: 90, y: 230, type: 'mushroom', walkable: true, interactionId: 'healing_mushroom' },
    { x: 250, y: 190, type: 'mushroom', walkable: true, interactionId: 'healing_mushroom' },
    { x: 45, y: 145, type: 'mushroom', walkable: true, interactionId: 'healing_mushroom' },
    { x: 186, y: 184, type: 'mushroom', walkable: true, interactionId: 'healing_mushroom' },
    { x: 160, y: 175, type: 'campfire', walkable: false, interactionId: 'campfire' },
    { x: 35, y: 250, type: 'campfire', walkable: false, interactionId: 'campfire' },
    { x: 275, y: 270, type: 'well', walkable: false, interactionId: 'well' },
    { x: 25, y: 205, type: 'sign', walkable: false, interactionId: 'destroyed_town_sign' },
    { x: 258, y: 155, type: 'well', walkable: false, interactionId: 'ancient_fountain' },
    { x: 140, y: 95, type: 'well', walkable: false, interactionId: 'ancient_well' },
    { x: 30, y: 35, type: 'bones_pile', walkable: true, interactionId: 'wolf_den_bones' },
    { x: 55, y: 114, type: 'ranger_remains', walkable: true, interactionId: 'chapel_dead_ranger' },
    { x: 55, y: 107, type: 'altar', walkable: false, interactionId: 'old_chapel_altar' },
    { x: 262, y: 25, type: 'sign', walkable: false, interactionId: 'volcano_warning' },
    { x: 252, y: 142, type: 'sign', walkable: false, interactionId: 'temple_inscription' },
    { x: 132, y: 122, type: 'sign', walkable: false, interactionId: 'forest_fort_banner' },
    { x: 28, y: 210, type: 'sign', walkable: false, interactionId: 'caravan_journal' },
    { x: 22, y: 248, type: 'cage', walkable: false, interactionId: 'spider_cocoon' },
    // Potion pickups in forest clearings and paths
    { x: 68, y: 65, type: 'tempest_grass', walkable: true, interactionId: 'tempest_grass_pickup' },
    { x: 210, y: 108, type: 'tempest_grass', walkable: true, interactionId: 'tempest_grass_pickup' },
    { x: 148, y: 162, type: 'tempest_grass', walkable: true, interactionId: 'tempest_grass_pickup' },
    { x: 85, y: 225, type: 'tempest_grass', walkable: true, interactionId: 'tempest_grass_pickup' },
    { x: 225, y: 225, type: 'tempest_grass', walkable: true, interactionId: 'tempest_grass_pickup' },
    { x: 48, y: 148, type: 'tempest_grass', walkable: true, interactionId: 'tempest_grass_pickup' },
    { x: 255, y: 55, type: 'tempest_grass', walkable: true, interactionId: 'tempest_grass_pickup' },
    { x: 155, y: 55, type: 'tempest_grass', walkable: true, interactionId: 'tempest_grass_pickup' },
    { x: 100, y: 165, type: 'tempest_grass', walkable: true, interactionId: 'tempest_grass_pickup' },
    { x: 148, y: 265, type: 'tempest_grass', walkable: true, interactionId: 'tempest_grass_pickup' },
    { x: 230, y: 165, type: 'tempest_grass', walkable: true, interactionId: 'tempest_grass_pickup' },
    { x: 75, y: 100, type: 'tempest_grass', walkable: true, interactionId: 'tempest_grass_pickup' },
    // Moonbloom flowers for Merchant's Request quest
    { x: 140, y: 48, type: 'flower', walkable: true, interactionId: 'moonbloom_pickup' },
    { x: 210, y: 105, type: 'flower', walkable: true, interactionId: 'moonbloom_pickup' },
    { x: 85, y: 185, type: 'flower', walkable: true, interactionId: 'moonbloom_pickup' },
    // === THE HOLLOW — Warning signs at river crossing ===
    { x: 118, y: 85, type: 'sign', walkable: false, interactionId: 'hollow_warning_sign' },
    { x: 176, y: 85, type: 'sign', walkable: false, interactionId: 'hollow_warning_sign' },
    // === THE HOLLOW — Hunter trail signs ===
    { x: 122, y: 70, type: 'sign', walkable: false, interactionId: 'hollow_trail_sign_1' },
    { x: 124, y: 50, type: 'sign', walkable: false, interactionId: 'hollow_trail_sign_2' },
    { x: 120, y: 32, type: 'sign', walkable: false, interactionId: 'hollow_trail_sign_3' },
    // === THE HOLLOW — Shortcut lever (boss side, opens gate back to bonfire) ===
    { x: 96, y: 38, type: 'shortcut_lever', walkable: false, interactionId: 'hollow_shortcut_lever' },
    // === THE HOLLOW — Hunters final camp (just before boss arena) ===
    { x: 120, y: 26, type: 'campfire', walkable: false, interactionId: 'hollow_final_camp' },

    // === SOUTH ENTRY CORRIDOR — environmental storytelling ===
    { x: 148, y: 270, type: 'sign', walkable: false, interactionId: 'forest_milestone' },

    // === HOLLOW APPROACH — fallen ranger and final warning ===
    { x: 124, y: 28, type: 'ranger_remains', walkable: true, interactionId: 'hollow_dead_ranger' },
    { x: 122, y: 26, type: 'sign', walkable: false, interactionId: 'hollow_final_warning' },

    // === WITCH COTTAGE SURROUNDS ===
    { x: 232, y: 134, type: 'cauldron', walkable: false, interactionId: 'witch_cauldron' },
    { x: 228, y: 138, type: 'sign', walkable: false, interactionId: 'witch_circle_warning' },

    // === GOLEM HIGHLAND APPROACH ===
    { x: 210, y: 145, type: 'sign', walkable: false, interactionId: 'golem_highland_warning' },

    // === SHORTCUT LEVER HINTS ===
    { x: 130, y: 207, type: 'ranger_remains', walkable: true, interactionId: 'dead_ranger_shortcut_note' },
    { x: 98, y: 40, type: 'sign', walkable: false, interactionId: 'hollow_lever_inscription' },

    // === FORT INTERIOR ===
    { x: 136, y: 130, type: 'sign', walkable: false, interactionId: 'fort_garrison_orders' },
  ],
  props: [
    { x: 144, y: 268, type: 'lantern', walkable: false },
    { x: 156, y: 268, type: 'lantern', walkable: false },
    { x: 142, y: 262, type: 'barrel', walkable: false },
    { x: 144, y: 262, type: 'crate', walkable: false },
    { x: 158, y: 262, type: 'barrel', walkable: false },
    { x: 160, y: 262, type: 'crate', walkable: false },
    { x: 140, y: 256, type: 'stump', walkable: false },
    { x: 160, y: 256, type: 'stump', walkable: false },
    { x: 146, y: 238, type: 'lantern', walkable: false },
    { x: 146, y: 222, type: 'lantern', walkable: false },
    // Northward spine — ranger line of march (packed path ~146–154 x); keeps manuscript progression readable
    { x: 152, y: 172, type: 'lantern', walkable: false },
    { x: 152, y: 152, type: 'lantern', walkable: false },
    { x: 152, y: 132, type: 'lantern', walkable: false },
    { x: 152, y: 112, type: 'lantern', walkable: false },
    { x: 118, y: 85, type: 'lantern', walkable: false },
    { x: 122, y: 85, type: 'lantern', walkable: false },
    { x: 74, y: 40, type: 'bones_pile', walkable: true },
    { x: 82, y: 38, type: 'dead_tree', walkable: false },
    { x: 84, y: 42, type: 'cage', walkable: false },
    { x: 56, y: 152, type: 'dead_tree', walkable: false },
    { x: 62, y: 150, type: 'bones_pile', walkable: true },
    { x: 64, y: 154, type: 'cage', walkable: false },
    { x: 66, y: 158, type: 'wagon', walkable: false },
    { x: 70, y: 160, type: 'barrel', walkable: false },
    { x: 72, y: 160, type: 'crate', walkable: false },
    { x: 128, y: 42, type: 'bench', walkable: false },
    { x: 182, y: 42, type: 'barrel', walkable: false },
    { x: 186, y: 44, type: 'crate', walkable: false },
    { x: 124, y: 40, type: 'lantern', walkable: false },
    { x: 132, y: 166, type: 'lantern', walkable: false },
    { x: 148, y: 166, type: 'lantern', walkable: false },
    { x: 154, y: 166, type: 'bench', walkable: false },
    { x: 158, y: 166, type: 'barrel', walkable: false },
    { x: 160, y: 166, type: 'crate', walkable: false },
    { x: 170, y: 176, type: 'lantern', walkable: false },
    { x: 139, y: 128, type: 'barrel', walkable: false },
    { x: 142, y: 128, type: 'crate', walkable: false },
    { x: 206, y: 66, type: 'barrel', walkable: false },
    { x: 209, y: 66, type: 'crate', walkable: false },
    { x: 66, y: 196, type: 'barrel', walkable: false },
    { x: 70, y: 196, type: 'crate', walkable: false },
    { x: 124, y: 203, type: 'bloodstain', walkable: true },
    { x: 129, y: 205, type: 'bloodstain', walkable: true },
    { x: 136, y: 209, type: 'bloodstain', walkable: true },
    { x: 144, y: 213, type: 'bloodstain', walkable: true },
    { x: 120, y: 198, type: 'bloodstain', walkable: true },
    { x: 126, y: 194, type: 'bloodstain', walkable: true },
    { x: 134, y: 191, type: 'bloodstain', walkable: true },
    { x: 150, y: 222, type: 'bones_pile', walkable: true },
    { x: 156, y: 225, type: 'cage', walkable: false },
    { x: 146, y: 208, type: 'dead_tree', walkable: false },
    { x: 118, y: 224, type: 'dead_tree', walkable: false },
    { x: 116, y: 200, type: 'bones_pile', walkable: true },
    { x: 124, y: 207, type: 'lantern', walkable: false },
    { x: 138, y: 189, type: 'dead_tree', walkable: false },
    { x: 148, y: 190, type: 'dead_tree', walkable: false },
    { x: 132, y: 187, type: 'bones_pile', walkable: true },
    { x: 140, y: 186, type: 'bones_pile', walkable: true },
    { x: 130, y: 190, type: 'lantern', walkable: false },
    { x: 144, y: 190, type: 'lantern', walkable: false },
    { x: 124, y: 191, type: 'stump', walkable: false },
    { x: 150, y: 192, type: 'stump', walkable: false },
    { x: 136, y: 168, type: 'bench', walkable: false },
    { x: 144, y: 168, type: 'lantern', walkable: false },
    { x: 150, y: 168, type: 'crate', walkable: false },
    { x: 153, y: 169, type: 'barrel', walkable: false },
    { x: 162, y: 170, type: 'cart', walkable: false },
    { x: 166, y: 174, type: 'crate', walkable: false },
    { x: 168, y: 174, type: 'barrel', walkable: false },
    { x: 123, y: 196, type: 'bones_pile', walkable: true },
    { x: 131, y: 201, type: 'bones_pile', walkable: true },
    { x: 134, y: 206, type: 'cage', walkable: false },
    { x: 141, y: 204, type: 'dead_tree', walkable: false },
    { x: 146, y: 201, type: 'stump', walkable: false },
    { x: 152, y: 205, type: 'barrel', walkable: false },
    { x: 155, y: 208, type: 'crate', walkable: false },
    { x: 160, y: 214, type: 'bones_pile', walkable: true },
    { x: 164, y: 218, type: 'cage', walkable: false },
    { x: 28, y: 206, type: 'wagon', walkable: false },
    { x: 34, y: 214, type: 'dead_tree', walkable: false },
    { x: 42, y: 212, type: 'bones_pile', walkable: true },
    { x: 214, y: 47, type: 'barrel', walkable: false },
    { x: 218, y: 47, type: 'crate', walkable: false },
    { x: 222, y: 52, type: 'lantern', walkable: false },
    { x: 233, y: 130, type: 'stump', walkable: false },
    { x: 237, y: 132, type: 'barrel', walkable: false },
    { x: 239, y: 132, type: 'crate', walkable: false },
    { x: 174, y: 88, type: 'stump', walkable: false },
    { x: 88, y: 181, type: 'stump', walkable: false },
    { x: 92, y: 182, type: 'barrel', walkable: false },
    { x: 176, y: 180, type: 'stump', walkable: false },
    { x: 181, y: 182, type: 'stump', walkable: false },
    { x: 188, y: 183, type: 'lantern', walkable: false },
    { x: 191, y: 187, type: 'bones_pile', walkable: true },
    { x: 108, y: 174, type: 'dead_tree', walkable: false },
    { x: 114, y: 176, type: 'bones_pile', walkable: true },
    { x: 118, y: 179, type: 'dead_tree', walkable: false },
    { x: 156, y: 120, type: 'dead_tree', walkable: false },
    { x: 160, y: 122, type: 'dead_tree', walkable: false },
    { x: 164, y: 124, type: 'dead_tree', walkable: false },
    { x: 96, y: 110, type: 'lantern', walkable: false },
    { x: 204, y: 88, type: 'lantern', walkable: false },
    { x: 202, y: 258, type: 'crate', walkable: false },
    { x: 206, y: 258, type: 'barrel', walkable: false },
    { x: 246, y: 268, type: 'lantern', walkable: false },
    { x: 66, y: 268, type: 'bones_pile', walkable: true },

    // === SOUTH ENTRY CORRIDOR — broken wagon and scatter ===
    { x: 152, y: 264, type: 'bones_pile', walkable: true },
    { x: 148, y: 258, type: 'bones_pile', walkable: true },
    { x: 144, y: 278, type: 'wagon', walkable: false },
    { x: 146, y: 280, type: 'barrel', walkable: false },
    { x: 148, y: 280, type: 'crate', walkable: false },
    { x: 142, y: 276, type: 'bones_pile', walkable: true },

    // === MAIN SPINE — stumps and mushroom rings ===
    { x: 144, y: 230, type: 'stump', walkable: false },
    { x: 156, y: 200, type: 'stump', walkable: false },
    { x: 144, y: 180, type: 'stump', walkable: false },
    { x: 156, y: 150, type: 'stump', walkable: false },
    { x: 144, y: 140, type: 'stump', walkable: false },
    { x: 156, y: 110, type: 'stump', walkable: false },
    { x: 153, y: 243, type: 'mushroom', walkable: true },
    { x: 155, y: 244, type: 'mushroom', walkable: true },
    { x: 154, y: 246, type: 'mushroom', walkable: true },
    { x: 143, y: 195, type: 'mushroom', walkable: true },
    { x: 141, y: 196, type: 'mushroom', walkable: true },
    { x: 142, y: 198, type: 'mushroom', walkable: true },
    { x: 153, y: 135, type: 'mushroom', walkable: true },
    { x: 155, y: 136, type: 'mushroom', walkable: true },
    { x: 154, y: 138, type: 'mushroom', walkable: true },

    // === MAIN SPINE — lanterns at forks ===
    { x: 149, y: 161, type: 'lantern', walkable: false },
    { x: 149, y: 114, type: 'lantern', walkable: false },
    { x: 119, y: 121, type: 'lantern', walkable: false },
    { x: 119, y: 97, type: 'lantern', walkable: false },

    // === HOLLOW APPROACH — bones trail to fog gate ===
    { x: 120, y: 34, type: 'bones_pile', walkable: true },
    { x: 123, y: 32, type: 'bones_pile', walkable: true },
    { x: 118, y: 30, type: 'bones_pile', walkable: true },
    { x: 125, y: 28, type: 'bones_pile', walkable: true },

    // === HOLLOW APPROACH — bloodstains near fog gate ===
    { x: 121, y: 24, type: 'bloodstain', walkable: true },
    { x: 123, y: 25, type: 'bloodstain', walkable: true },
    { x: 119, y: 26, type: 'bloodstain', walkable: true },
    { x: 125, y: 23, type: 'bloodstain', walkable: true },

    // === HUNTER COTTAGE SURROUNDS ===
    { x: 136, y: 190, type: 'lantern', walkable: false },
    { x: 143, y: 186, type: 'bones_pile', walkable: true },
    { x: 134, y: 186, type: 'fence', walkable: false },
    { x: 135, y: 186, type: 'fence', walkable: false },
    { x: 136, y: 186, type: 'fence', walkable: false },
    { x: 140, y: 186, type: 'fence', walkable: false },
    { x: 141, y: 186, type: 'fence', walkable: false },
    { x: 134, y: 194, type: 'flower', walkable: true },
    { x: 136, y: 194, type: 'flower', walkable: true },
    { x: 138, y: 194, type: 'flower', walkable: true },
    { x: 132, y: 192, type: 'tall_grass', walkable: true },
    { x: 131, y: 191, type: 'tall_grass', walkable: true },
    { x: 133, y: 193, type: 'tall_grass', walkable: true },

    // === WITCH COTTAGE — altar prop ===
    { x: 230, y: 140, type: 'altar', walkable: false },

    // === GOLEM APPROACH — bones ===
    { x: 212, y: 143, type: 'bones_pile', walkable: true },

    // === WITCH COTTAGE SURROUNDS — mushroom ring ===
    { x: 230, y: 132, type: 'mushroom', walkable: true },
    { x: 234, y: 132, type: 'mushroom', walkable: true },
    { x: 236, y: 134, type: 'mushroom', walkable: true },
    { x: 236, y: 138, type: 'mushroom', walkable: true },
    { x: 234, y: 140, type: 'mushroom', walkable: true },
    { x: 230, y: 140, type: 'mushroom', walkable: true },
    { x: 228, y: 138, type: 'mushroom', walkable: true },
    { x: 228, y: 134, type: 'mushroom', walkable: true },
    { x: 231, y: 139, type: 'bloodstain', walkable: true },

    // === WATERFALL AREA ===
    { x: 180, y: 44, type: 'flower', walkable: true },
    { x: 182, y: 44, type: 'flower', walkable: true },
    { x: 184, y: 44, type: 'flower', walkable: true },
    { x: 176, y: 42, type: 'tall_grass', walkable: true },
    { x: 178, y: 42, type: 'tall_grass', walkable: true },
    { x: 180, y: 42, type: 'tall_grass', walkable: true },
    { x: 182, y: 42, type: 'tall_grass', walkable: true },

    // === FORT INTERIOR DETAIL ===
    { x: 140, y: 130, type: 'campfire', walkable: false },
    { x: 142, y: 132, type: 'bones_pile', walkable: true },
    { x: 144, y: 132, type: 'bones_pile', walkable: true },
    { x: 134, y: 126, type: 'barrel', walkable: false },
    { x: 136, y: 126, type: 'crate', walkable: false },
    { x: 148, y: 126, type: 'barrel', walkable: false },
    { x: 150, y: 126, type: 'crate', walkable: false },
    { x: 138, y: 134, type: 'weapon_rack', walkable: false },

    // ============================================================
    // === ENVIRONMENTAL SCATTER — rocks, stumps, wells, statues ===
    // ============================================================

    // --- East ridge approach: rocky scatter ---
    { x: 274, y: 108, type: 'rock', walkable: false },
    { x: 276, y: 112, type: 'rock', walkable: false },
    { x: 278, y: 116, type: 'rock', walkable: false },
    { x: 280, y: 110, type: 'rock', walkable: false },
    { x: 282, y: 120, type: 'rock', walkable: false },
    { x: 275, y: 124, type: 'rock', walkable: false },
    { x: 284, y: 130, type: 'rock', walkable: false },
    { x: 277, y: 136, type: 'stump', walkable: false },
    { x: 288, y: 118, type: 'rock', walkable: false },
    { x: 286, y: 140, type: 'rock', walkable: false },
    { x: 274, y: 142, type: 'stump', walkable: false },

    // --- South-east rocky shelf scatter ---
    { x: 214, y: 218, type: 'rock', walkable: false },
    { x: 218, y: 220, type: 'rock', walkable: false },
    { x: 222, y: 216, type: 'rock', walkable: false },
    { x: 220, y: 222, type: 'stump', walkable: false },
    { x: 216, y: 214, type: 'rock', walkable: false },

    // --- Ancient stone circle props (far east) ---
    { x: 279, y: 144, type: 'statue', walkable: false },
    { x: 281, y: 148, type: 'statue', walkable: false },

    // --- Stone quarry debris ---
    { x: 230, y: 206, type: 'rock', walkable: false },
    { x: 234, y: 210, type: 'rock', walkable: false },
    { x: 238, y: 208, type: 'rock', walkable: false },
    { x: 232, y: 214, type: 'rock', walkable: false },
    { x: 236, y: 212, type: 'stump', walkable: false },
    { x: 240, y: 206, type: 'rock', walkable: false },
    { x: 228, y: 210, type: 'rock', walkable: false },

    // --- Old well clearing props ---
    { x: 192, y: 122, type: 'well', walkable: false },
    { x: 190, y: 120, type: 'flower', walkable: true },
    { x: 194, y: 120, type: 'flower', walkable: true },
    { x: 196, y: 124, type: 'stump', walkable: false },

    // --- South-west stumps and rocks (near entry approach) ---
    { x: 112, y: 274, type: 'rock', walkable: false },
    { x: 116, y: 276, type: 'stump', walkable: false },
    { x: 108, y: 278, type: 'rock', walkable: false },
    { x: 174, y: 276, type: 'rock', walkable: false },
    { x: 178, y: 278, type: 'stump', walkable: false },

    // --- Creek-side vegetation (south-east creek) ---
    { x: 202, y: 230, type: 'tall_grass', walkable: true },
    { x: 206, y: 230, type: 'tall_grass', walkable: true },
    { x: 210, y: 230, type: 'flower', walkable: true },
    { x: 226, y: 236, type: 'tall_grass', walkable: true },
    { x: 230, y: 236, type: 'flower', walkable: true },
    { x: 232, y: 250, type: 'tall_grass', walkable: true },
    { x: 236, y: 250, type: 'tall_grass', walkable: true },
    { x: 246, y: 252, type: 'flower', walkable: true },

    // --- West creek vegetation ---
    { x: 36, y: 214, type: 'tall_grass', walkable: true },
    { x: 40, y: 216, type: 'tall_grass', walkable: true },
    { x: 42, y: 218, type: 'flower', walkable: true },
    { x: 36, y: 226, type: 'tall_grass', walkable: true },
    { x: 38, y: 228, type: 'flower', walkable: true },

    // --- Far south creek vegetation ---
    { x: 112, y: 270, type: 'tall_grass', walkable: true },
    { x: 118, y: 270, type: 'tall_grass', walkable: true },
    { x: 124, y: 274, type: 'flower', walkable: true },
    { x: 136, y: 274, type: 'tall_grass', walkable: true },
    { x: 172, y: 271, type: 'tall_grass', walkable: true },
    { x: 178, y: 271, type: 'flower', walkable: true },
    { x: 190, y: 275, type: 'tall_grass', walkable: true },

    // --- Logging camp detail ---
    { x: 166, y: 238, type: 'stump', walkable: false },
    { x: 168, y: 238, type: 'stump', walkable: false },
    { x: 170, y: 240, type: 'stump', walkable: false },
    { x: 172, y: 236, type: 'barrel', walkable: false },
    { x: 174, y: 238, type: 'crate', walkable: false },

    // --- Collapsed cottage rubble ---
    { x: 278, y: 162, type: 'rock', walkable: false },
    { x: 282, y: 164, type: 'rock', walkable: false },
    { x: 284, y: 162, type: 'stump', walkable: false },
    { x: 280, y: 166, type: 'barrel', walkable: false },

    // --- Sunken garden detail (west) ---
    { x: 20, y: 170, type: 'flower', walkable: true },
    { x: 24, y: 170, type: 'flower', walkable: true },
    { x: 26, y: 174, type: 'flower', walkable: true },
    { x: 20, y: 174, type: 'mushroom', walkable: true },
    { x: 28, y: 176, type: 'tall_grass', walkable: true },

    // --- Ruined shrine props ---
    { x: 80, y: 280, type: 'statue', walkable: false },
    { x: 84, y: 282, type: 'bones_pile', walkable: true },
    { x: 82, y: 284, type: 'tombstone', walkable: false },

    // --- South-east ruins scatter ---
    { x: 214, y: 254, type: 'rock', walkable: false },
    { x: 218, y: 256, type: 'rock', walkable: false },
    { x: 222, y: 254, type: 'statue', walkable: false },
    { x: 216, y: 258, type: 'bones_pile', walkable: true },

    // --- Scattered rocks along central-east stream ---
    { x: 262, y: 168, type: 'rock', walkable: false },
    { x: 266, y: 172, type: 'rock', walkable: false },
    { x: 268, y: 176, type: 'rock', walkable: false },
    { x: 270, y: 180, type: 'rock', walkable: false },
    { x: 266, y: 184, type: 'tall_grass', walkable: true },

    // --- Large central grass zone scatter (x:160-200, y:100-130) ---
    { x: 176, y: 108, type: 'rock', walkable: false },
    { x: 180, y: 112, type: 'stump', walkable: false },
    { x: 184, y: 106, type: 'mushroom', walkable: true },
    { x: 188, y: 114, type: 'rock', walkable: false },
    { x: 182, y: 118, type: 'flower', walkable: true },
    { x: 186, y: 122, type: 'tall_grass', walkable: true },

    // --- South-central empty zone scatter (x:100-140, y:230-250) ---
    { x: 100, y: 236, type: 'stump', walkable: false },
    { x: 104, y: 240, type: 'rock', walkable: false },
    { x: 108, y: 244, type: 'stump', walkable: false },

    // --- Rocky ford detail (east) ---
    { x: 260, y: 230, type: 'rock', walkable: false },
    { x: 262, y: 232, type: 'rock', walkable: false },
    { x: 264, y: 234, type: 'tall_grass', walkable: true },
    { x: 258, y: 234, type: 'flower', walkable: true },

    // --- Central-south path variety (between paths y:220-240) ---
    { x: 148, y: 224, type: 'rock', walkable: false },
    { x: 152, y: 228, type: 'stump', walkable: false },
    { x: 156, y: 226, type: 'mushroom', walkable: true },
    { x: 160, y: 232, type: 'rock', walkable: false },

    // --- Far-east midfield scatter (x:285-295, y:200-240) ---
    { x: 288, y: 204, type: 'rock', walkable: false },
    { x: 290, y: 210, type: 'rock', walkable: false },
    { x: 286, y: 216, type: 'stump', walkable: false },
    { x: 292, y: 222, type: 'rock', walkable: false },
    { x: 288, y: 230, type: 'rock', walkable: false },
    { x: 290, y: 236, type: 'stump', walkable: false },
  ],
  secretAreas: [
    { x: 256, y: 184, width: 8, height: 6, fill: 'grass' },
    { x: 24, y: 24, width: 6, height: 6, fill: 'stone' },
    { x: 280, y: 270, width: 5, height: 5, fill: 'grass' },
    { x: 90, y: 145, width: 6, height: 5, fill: 'grass' },
    { x: 195, y: 175, width: 5, height: 5, fill: 'stone' },
    { x: 55, y: 195, width: 5, height: 5, fill: 'stone' },
    { x: 270, y: 130, width: 4, height: 5, fill: 'grass' },
  ],
  elevationZones: [
    // y=2 start + width to x=245 removes el0 strip at north portals (y=3) and NE approach (x>195).
    // === TIER 1: Broad north highlands (main elevated mass) — extended south to close el0 gap vs. west ridge ===
    { x: 36, y: 2, width: 210, height: 106, elevation: 1 },
    // === TIER 2: North-center summit (ruins / waterfall zone) ===
    { x: 108, y: 2, width: 94, height: 48, elevation: 2 },
    // === TIER 1: NE fortress ridge ===
    { x: 194, y: 24, width: 98, height: 96, elevation: 1 },
    // === TIER 2: Far NE volcano peak ===
    { x: 246, y: 2, width: 46, height: 54, elevation: 2 },
    // === TIER 1: NW ridge (wolf den / ruins area) ===
    { x: 4, y: 2, width: 50, height: 70, elevation: 1 },
    // === TIER 1: West hidden grove hill ===
    { x: 4, y: 108, width: 72, height: 56, elevation: 1 },
    // === TIER 1: Central ranger plateau ===
    { x: 112, y: 148, width: 80, height: 52, elevation: 1 },
    // === TIER 1: East temple terrace ===
    { x: 240, y: 132, width: 52, height: 62, elevation: 1 },
    // === TIER 2: Center summit ledge (boss arena area) ===
    { x: 204, y: 38, width: 42, height: 42, elevation: 2 },
    // === TIER 1: SE enchanted hills ===
    { x: 230, y: 222, width: 62, height: 62, elevation: 1 },
    // === TIER 1: East ridge (rocky cliff shelf) ===
    { x: 272, y: 100, width: 24, height: 50, elevation: 1 },
    // === TIER 1: South-east rocky bluff ===
    { x: 200, y: 236, width: 28, height: 16, elevation: 1 },
    // === TIER 1: South-west rocky hill (near ruined shrine) ===
    { x: 72, y: 274, width: 18, height: 16, elevation: 1 },
  ],
  stairways: [
    // All stairways start AT south_face = zone_y + zone_h - 1 so placeStairways
    // (post-stampCliffs) overwrites cliff_edge + all 3 cliff tiles below it.

    // Main trail → north highlands (el1): zone {x:112,y:148,h:52}, south_face=199
    // Center summit el2→el0: zone {x:204,y:38,h:42}, south_face=79; elevDrop=2 → 5 tiles
    { x: 218, y: 79, width: 6, height: 5, elevation: 2 },
    // NW corner el1 south descent: zone {x:4,y:4,h:68}, south_face=71
    { x: 38, y: 71, width: 6, height: 4, elevation: 1 },
    // NE fortress ridge (east temple terrace el1): zone {x:240,y:132,h:62}, south_face=193
    { x: 248, y: 193, width: 6, height: 4, elevation: 1 },
    // Second access to NE temple ridge from central trail
    { x: 228, y: 193, width: 6, height: 4, elevation: 1 },
    // West hidden grove south face: zone {x:4,y:108,h:56}, south_face=163
    { x: 54, y: 163, width: 6, height: 4, elevation: 1 },
    // Hunter shack overlook: climb from the bloodstained bonfire shelf to the upper approach.
    // SE enchanted hills south: zone {x:230,y:222,h:62}, south_face=283
    { x: 248, y: 283, width: 6, height: 4, elevation: 1 },
    // East ridge south face: zone {x:272,y:100,h:50}, south_face=149
    { x: 280, y: 149, width: 6, height: 4, elevation: 1 },
    // South-east bluff south face: zone {x:200,y:236,h:16}, south_face=251
    { x: 210, y: 251, width: 6, height: 4, elevation: 1 },
    // South-west rocky hill south: zone {x:72,y:274,h:16}, south_face=289
    { x: 78, y: 289, width: 6, height: 4, elevation: 1 },
  ],
  enemyZones: [
    // Zones are spread by quadrant / POI so packs are not stacked on one choke (esp. north gate).

    // NE — Hollow shadow creatures (formerly bandits)
    { x: 210, y: 25, width: 20, height: 18, enemyType: 'shadow', count: 6 },
    { x: 182, y: 46, width: 32, height: 14, enemyType: 'shadow', count: 4 },

    // SW — spider nest + perimeter (offset from nest center)
    { x: 20, y: 240, width: 28, height: 22, enemyType: 'spider', count: 8 },
    { x: 55, y: 252, width: 22, height: 12, enemyType: 'spider', count: 4 },

    // NW — Hollow dark wolves + shadows (formerly skeletons)
    { x: 65, y: 25, width: 22, height: 16, enemyType: 'wolf', count: 4 },
    { x: 50, y: 50, width: 20, height: 16, enemyType: 'shadow', count: 3 },

    // Central — east of ranger plateau / inn (avoids fort footprint ~130–152, 120–138)
    { x: 166, y: 148, width: 18, height: 18, enemyType: 'wolf', count: 4 },
    // Fort garrison — armored wolves patrol the perimeter; regular wolves hang back west
    { x: 110, y: 116, width: 18, height: 14, enemyType: 'armored_wolf', count: 3 },
    { x: 86, y: 116, width: 20, height: 14, enemyType: 'wolf', count: 3 },

    // North — Hollow shadows near fog gate
    { x: 96, y: 4, width: 60, height: 16, enemyType: 'shadow', count: 8 },

    // West — hidden grove plants
    { x: 18, y: 124, width: 22, height: 18, enemyType: 'plant', count: 5 },
    { x: 52, y: 148, width: 18, height: 16, enemyType: 'wolf', count: 4 },

    // E — lakeside spiders + temple skeletons
    { x: 230, y: 176, width: 24, height: 14, enemyType: 'spider', count: 5 },
    { x: 246, y: 136, width: 26, height: 26, enemyType: 'skeleton', count: 6 },

    // South — split wolf / slime along trail (less pile-up on portal column)
    { x: 112, y: 252, width: 18, height: 14, enemyType: 'wolf', count: 3 },
    { x: 170, y: 262, width: 24, height: 16, enemyType: 'slime', count: 5 },
    { x: 164, y: 278, width: 18, height: 10, enemyType: 'wolf', count: 2 },

    // Enchanted groves
    { x: 72, y: 140, width: 28, height: 24, enemyType: 'plant', count: 8 },
    { x: 236, y: 240, width: 26, height: 20, enemyType: 'plant', count: 7 },
    { x: 48, y: 260, width: 26, height: 20, enemyType: 'plant', count: 6 },

    // Destroyed villages
    { x: 22, y: 202, width: 28, height: 18, enemyType: 'skeleton', count: 6 },
    { x: 176, y: 200, width: 26, height: 18, enemyType: 'skeleton', count: 6 },

    // Mid-forest roamers (NW / NE of central paths)
    { x: 90, y: 94, width: 24, height: 18, enemyType: 'wolf', count: 4 },
    { x: 198, y: 106, width: 24, height: 16, enemyType: 'wolf', count: 4 },

    // Far E / SE coverage
    { x: 266, y: 186, width: 22, height: 18, enemyType: 'spider', count: 4 },
    { x: 216, y: 68, width: 22, height: 16, enemyType: 'wolf', count: 3 },
    { x: 195, y: 256, width: 16, height: 14, enemyType: 'wolf', count: 3 },
    { x: 55, y: 266, width: 18, height: 14, enemyType: 'spider', count: 3 },
    { x: 245, y: 266, width: 16, height: 14, enemyType: 'plant', count: 4 },
    { x: 175, y: 175, width: 16, height: 14, enemyType: 'spider', count: 3 },
    { x: 105, y: 168, width: 14, height: 12, enemyType: 'wolf', count: 3 },
    { x: 142, y: 90, width: 16, height: 14, enemyType: 'shadow', count: 4 },

    // SW plateau + far E trail
    { x: 36, y: 192, width: 20, height: 16, enemyType: 'wolf', count: 4 },
    { x: 278, y: 92, width: 16, height: 16, enemyType: 'wolf', count: 4 },
    { x: 110, y: 200, width: 14, height: 12, enemyType: 'skeleton', count: 2 },
    { x: 142, y: 210, width: 18, height: 14, enemyType: 'wolf', count: 2 },

    { x: 215, y: 140, width: 20, height: 16, enemyType: 'golem', count: 1 },

    // AUTHORED ENCOUNTER POD 1 — mid-spine fork, first multi-enemy test
    { x: 146, y: 178, width: 6, height: 4, enemyType: 'wolf', count: 3 },
    // AUTHORED ENCOUNTER POD 2 — river crossing approach, mixed threat
    { x: 140, y: 88, width: 8, height: 6, enemyType: 'wolf', count: 2 },
    { x: 148, y: 88, width: 8, height: 6, enemyType: 'shadow', count: 2 },
    // AUTHORED ENCOUNTER POD 3 — hollow approach, highest pressure before boss
    { x: 116, y: 33, width: 10, height: 8, enemyType: 'shadow', count: 4 },
    { x: 116, y: 33, width: 10, height: 8, enemyType: 'plant', count: 1 },

    // East ridge — wolves patrol the rocky shelf
    { x: 274, y: 110, width: 16, height: 30, enemyType: 'wolf', count: 4 },
    // Stone quarry — skeletons among the rubble
    { x: 228, y: 205, width: 16, height: 12, enemyType: 'skeleton', count: 4 },
    // Logging camp — wolves prowl the cleared area
    { x: 162, y: 234, width: 18, height: 12, enemyType: 'wolf', count: 3 },
    // Collapsed cottage — spiders nested in the ruins
    { x: 276, y: 156, width: 14, height: 12, enemyType: 'spider', count: 3 },
    // South creek crossing — slimes in the water margin
    { x: 110, y: 270, width: 30, height: 6, enemyType: 'slime', count: 3 },
    // Ruined shrine — shadows guard the ancient stones
    { x: 76, y: 276, width: 14, height: 12, enemyType: 'shadow', count: 2 },
    // Rocky ford — wolves at the mossy crossing
    { x: 256, y: 226, width: 14, height: 10, enemyType: 'wolf', count: 2 },
  ],
};

// ============= DEEP WOODS: 240x200 Dark Mysterious Area =============
const deepWoodsDef: MapDefinition = {
  name: 'The Deep Woods',
  subtitle: 'Light does not reach this far in',
  width: 240,
  height: 200,
  spawnPoint: { x: 120, y: 190 },
  seed: 256,
  baseTerrain: 'swamp',
  borderTile: 'tree',
  features: [
    // === WITCH'S HUT ===
    { x: 60, y: 60, width: 10, height: 8, type: 'inn_building', interactionId: 'witch_hut', interiorMap: 'interior_witch_hut', interiorSpawnX: 6, interiorSpawnY: 2 },
    { x: 50, y: 52, width: 24, height: 20, type: 'clearing', fill: 'swamp' },
    { x: 44, y: 54, width: 36, height: 24, type: 'clearing', fill: 'dirt' },

    // === ANCIENT SHRINE ===
    { x: 160, y: 40, width: 24, height: 20, type: 'ruins' },

    // === MUSHROOM GROVE ===
    { x: 100, y: 100, width: 40, height: 30, type: 'clearing', fill: 'grass' },
    { x: 110, y: 110, width: 20, height: 12, type: 'garden' },
    { x: 92, y: 88, width: 36, height: 18, type: 'clearing', fill: 'stone' },

    // === SWAMP LAKES ===
    { x: 40, y: 120, width: 32, height: 24, type: 'lake' },
    { x: 52, y: 130, width: 8, height: 4, type: 'bridge' },
    { x: 180, y: 140, width: 24, height: 18, type: 'lake' },

    // === SHADOW CREATURE DEN ===
    { x: 180, y: 80, width: 30, height: 24, type: 'clearing', fill: 'dirt' },
    { x: 186, y: 86, width: 16, height: 12, type: 'camp', interactionId: 'shadow_den' },

    // === HIDDEN TEMPLE ENTRANCE ===
    { x: 110, y: 20, width: 20, height: 16, type: 'ruins', interactionId: 'temple_entrance' },

    // === NORTH SHELF CASCADE (el2 sanctum rim — ties shrine approach to the high marsh) ===
    { x: 172, y: 4, width: 22, height: 26, type: 'waterfall' },

    // === DARK HOLLOW (new dangerous area) ===
    { x: 20, y: 20, width: 30, height: 25, type: 'clearing', fill: 'dirt' },

    // === CURSED GROVE ===
    { x: 200, y: 160, width: 20, height: 16, type: 'clearing', fill: 'swamp' },
    { x: 108, y: 154, width: 24, height: 28, type: 'clearing', fill: 'dirt' },

    // === TREANT GROVE ===
    { x: 160, y: 160, width: 15, height: 12, type: 'garden' },

    // === BOSS ARENA - Deep Woods Guardian ===
    { x: 90, y: 40, width: 20, height: 20, type: 'boss_arena', interactionId: 'deep_woods_guardian' },
    // Shadow Castle entrance (elevated platform with ritual elements)
    { x: 85, y: 35, width: 30, height: 30, type: 'clearing', fill: 'stone' },
    // Atmospheric props around boss arena - bloodstains and bones

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
    { x: 96, y: 44, width: 8, height: 56, type: 'path', fill: 'stone' },
    { x: 60, y: 60, width: 56, height: 6, type: 'path', fill: 'dirt' },
    { x: 52, y: 66, width: 20, height: 4, type: 'path', fill: 'dirt' },
    { x: 160, y: 50, width: 6, height: 50, type: 'path', fill: 'dirt' },
    { x: 40, y: 30, width: 70, height: 4, type: 'path', fill: 'dirt' },
    { x: 180, y: 100, width: 6, height: 60, type: 'path', fill: 'dirt' },
    { x: 186, y: 28, width: 6, height: 12, type: 'path', fill: 'dirt' },
    { x: 96, y: 98, width: 24, height: 6, type: 'path', fill: 'stone' },
  ],
  portals: [
    { x: 120, y: 190, targetMap: 'forest', targetX: 150, targetY: 8 },
    { x: 120, y: 8, targetMap: 'village', targetX: 120, targetY: 150 },
    { x: 120, y: 28, targetMap: 'ruins', targetX: 100, targetY: 115 },
    { x: 100, y: 44, targetMap: 'shadow_castle', targetX: 100, targetY: 108 },
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
    { x: 118, y: 38, type: 'bonfire', walkable: false, interactionId: 'bonfire_rest' },
    { x: 52, y: 72, type: 'bonfire', walkable: false, interactionId: 'bonfire_rest' },
    { x: 64, y: 66, type: 'sign', walkable: false, interactionId: 'witch_sign' },
    { x: 120, y: 30, type: 'sign', walkable: false, interactionId: 'temple_sign' },
    { x: 120, y: 175, type: 'sign', walkable: false, interactionId: 'deep_woods_sign' },
    { x: 100, y: 114, type: 'well', walkable: false, interactionId: 'ancient_fountain' },
    { x: 190, y: 95, type: 'campfire', walkable: false, interactionId: 'campfire' },
    { x: 115, y: 115, type: 'mushroom', walkable: true, interactionId: 'healing_mushroom' },
    { x: 205, y: 165, type: 'tombstone', walkable: false, interactionId: 'tombstone' },
    { x: 35, y: 25, type: 'campfire', walkable: false, interactionId: 'campfire' },
    // Potion pickups in deep woods clearings
    { x: 55, y: 58, type: 'tempest_grass', walkable: true, interactionId: 'tempest_grass_pickup' },
    { x: 115, y: 108, type: 'tempest_grass', walkable: true, interactionId: 'tempest_grass_pickup' },
    { x: 185, y: 85, type: 'tempest_grass', walkable: true, interactionId: 'tempest_grass_pickup' },
    { x: 55, y: 135, type: 'tempest_grass', walkable: true, interactionId: 'tempest_grass_pickup' },
    { x: 165, y: 165, type: 'tempest_grass', walkable: true, interactionId: 'tempest_grass_pickup' },
    { x: 25, y: 165, type: 'tempest_grass', walkable: true, interactionId: 'tempest_grass_pickup' },
  ],
  props: [
    // South threshold and first warning shelf
    { x: 114, y: 178, type: 'lantern', walkable: false },
    { x: 126, y: 178, type: 'lantern', walkable: false },
    { x: 112, y: 170, type: 'dead_tree', walkable: false },
    { x: 128, y: 170, type: 'dead_tree', walkable: false },
    { x: 118, y: 166, type: 'bones_pile', walkable: true },
    { x: 122, y: 164, type: 'cage', walkable: false },
    // Ancient shrine vicinity
    { x: 162, y: 42, type: 'lantern', walkable: false },
    { x: 178, y: 42, type: 'lantern', walkable: false },
    { x: 168, y: 48, type: 'pot', walkable: true },
    { x: 172, y: 48, type: 'pot', walkable: true },
    { x: 175, y: 52, type: 'bones', walkable: true },
    { x: 164, y: 54, type: 'bones_pile', walkable: true },
    { x: 180, y: 54, type: 'chain', walkable: false },
    { x: 114, y: 24, type: 'pot', walkable: true },
    { x: 118, y: 26, type: 'pot', walkable: true },
    { x: 96, y: 92, type: 'altar', walkable: false },
    { x: 124, y: 92, type: 'altar', walkable: false },
    { x: 108, y: 84, type: 'chain', walkable: false },
    { x: 120, y: 84, type: 'chain', walkable: false },
    { x: 112, y: 96, type: 'lantern', walkable: false },
    // Shadow Castle approach - ritual elements and atmosphere
    { x: 92, y: 42, type: 'altar', walkable: false },
    { x: 108, y: 42, type: 'altar', walkable: false },
    { x: 98, y: 38, type: 'throne', walkable: false },
    { x: 102, y: 38, type: 'throne', walkable: false },
    // Bloodstains leading to boss
    { x: 94, y: 72, type: 'bloodstain', walkable: true },
    { x: 106, y: 72, type: 'bloodstain', walkable: true },
    { x: 100, y: 64, type: 'bloodstain', walkable: true },
    { x: 88, y: 52, type: 'bloodstain', walkable: true },
    { x: 112, y: 52, type: 'bloodstain', walkable: true },
    { x: 95, y: 48, type: 'bloodstain', walkable: true },
    { x: 105, y: 48, type: 'bloodstain', walkable: true },
    // Bones piles around arena
    { x: 88, y: 86, type: 'bones_pile', walkable: true },
    { x: 112, y: 86, type: 'bones_pile', walkable: true },
    { x: 85, y: 45, type: 'bones_pile', walkable: true },
    { x: 115, y: 45, type: 'bones_pile', walkable: true },
    { x: 100, y: 56, type: 'bones_pile', walkable: true },
    // Chains hanging from elevated areas
    { x: 96, y: 80, type: 'chain', walkable: false },
    { x: 104, y: 80, type: 'chain', walkable: false },
    { x: 90, y: 38, type: 'chain', walkable: false },
    { x: 110, y: 38, type: 'chain', walkable: false },
    // Cages (imprisoned souls)
    { x: 92, y: 76, type: 'cage', walkable: false },
    { x: 108, y: 76, type: 'cage', walkable: false },
    { x: 86, y: 50, type: 'cage', walkable: false },
    { x: 114, y: 50, type: 'cage', walkable: false },
    // Witch's hut area
    { x: 48, y: 68, type: 'lantern', walkable: false },
    { x: 72, y: 68, type: 'lantern', walkable: false },
    { x: 52, y: 60, type: 'bones_pile', walkable: true },
    { x: 70, y: 58, type: 'stump', walkable: false },
    { x: 55, y: 58, type: 'cauldron', walkable: false },
    { x: 65, y: 62, type: 'cauldron', walkable: false },
    { x: 58, y: 66, type: 'altar', walkable: false },
  ],
  secretAreas: [
    { x: 15, y: 15, width: 8, height: 6, fill: 'stone' },
    { x: 210, y: 90, width: 8, height: 6, fill: 'grass' },
    { x: 225, y: 175, width: 6, height: 5, fill: 'stone' },
  ],
  elevationZones: [
    // y=2 north padding: avoids el0→el1 seam at y=3|4 near portals and north paths.
    // === TIER 1: North wall (solid raised border) ===
    { x: 4, y: 2, width: 232, height: 54, elevation: 1 },
    // === TIER 2: North shrine sanctum (the hidden temple area) ===
    { x: 84, y: 2, width: 120, height: 40, elevation: 2 },
    // === TIER 1: West dark hollow ridge ===
    { x: 4, y: 58, width: 42, height: 52, elevation: 1 },
    // === TIER 1: East shadow den rise ===
    { x: 172, y: 72, width: 64, height: 44, elevation: 1 },
    // === TIER 2: Shadow den inner sanctum ===
    { x: 180, y: 78, width: 48, height: 28, elevation: 2 },
    // === TIER 1: SE cursed grove terrace ===
    { x: 150, y: 148, width: 82, height: 42, elevation: 1 },
  ],
  stairways: [
    // All start AT south_face = zone_y + zone_h - 1.

    // North shrine sanctum el2→el1: zone {x:84,y:4,h:38}, south_face=41
    { x: 116, y: 41, width: 8, height: 4, elevation: 2 },
    // North wall el1→el0: zone {x:4,y:4,h:52}, south_face=55
    { x: 116, y: 55, width: 8, height: 4, elevation: 1 },
    // Shadow den inner el2→el1: zone {x:180,y:78,h:28}, south_face=105
    { x: 180, y: 105, width: 6, height: 4, elevation: 2 },
    // East shadow den rise el1→el0: zone {x:172,y:72,h:44}, south_face=115
    { x: 176, y: 115, width: 6, height: 4, elevation: 1 },
    // West dark hollow el1→el0: zone {x:4,y:58,h:52}, south_face=109
    { x: 38, y: 109, width: 6, height: 4, elevation: 1 },
    // SE cursed grove south face el1→el0: zone {x:150,y:148,h:42}, south_face=189
    { x: 160, y: 189, width: 8, height: 4, elevation: 1 },
    // Second SE grove exit on east side
    { x: 210, y: 189, width: 6, height: 4, elevation: 1 },
  ],
  enemyZones: [
    // Witch's Hut clearing
    { x: 50, y: 55, width: 20, height: 16, enemyType: 'shadow', count: 4 },
    // Witch hut perimeter
    { x: 30, y: 40, width: 24, height: 18, enemyType: 'shadow', count: 3 },

    // Ancient Shrine
    { x: 155, y: 35, width: 22, height: 16, enemyType: 'shadow', count: 5 },
    { x: 168, y: 58, width: 16, height: 14, enemyType: 'shadow', count: 3 },

    // Cursed Cemetery
    { x: 145, y: 95, width: 20, height: 16, enemyType: 'skeleton', count: 8 },

    // Dark hollow
    { x: 25, y: 160, width: 18, height: 14, enemyType: 'spider', count: 7 },
    { x: 20, y: 18, width: 28, height: 22, enemyType: 'spider', count: 6 },

    // Northern dark forest (boss approach)
    { x: 92, y: 58, width: 20, height: 18, enemyType: 'shadow', count: 4 },
    { x: 80, y: 20, width: 30, height: 24, enemyType: 'shadow', count: 6 },
    { x: 115, y: 10, width: 22, height: 18, enemyType: 'shadow', count: 5 },

    // Shadow den outer ring
    { x: 178, y: 82, width: 26, height: 22, enemyType: 'shadow', count: 8 },
    // Eastern cursed grove
    { x: 190, y: 150, width: 16, height: 14, enemyType: 'shadow', count: 6 },
    { x: 155, y: 155, width: 20, height: 16, enemyType: 'skeleton', count: 5 },

    // Western swamp
    { x: 20, y: 100, width: 18, height: 14, enemyType: 'spider', count: 6 },

    // Mushroom grove ambush
    { x: 100, y: 102, width: 36, height: 24, enemyType: 'slime', count: 7 },

    // Swamp bridges (dangerous crossing)
    { x: 38, y: 118, width: 20, height: 16, enemyType: 'slime', count: 5 },
    { x: 175, y: 138, width: 22, height: 16, enemyType: 'shadow', count: 5 },

    // === Boss ===
    { x: 85, y: 35, width: 18, height: 14, enemyType: 'golem', count: 1 },
  ],
};

// ============= ANCIENT RUINS: 200x120 Dungeon-like Area =============
const ruinsDef: MapDefinition = {
  name: 'Ancient Ruins',
  subtitle: 'A civilization buried and forgotten',
  width: 200,
  height: 120,
  spawnPoint: { x: 100, y: 110 },
  seed: 512,
  baseTerrain: 'ruins',
  borderTile: 'stone',
  coastalSouthBorder: false,
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

    // === TREASURE VAULT (north) — landing apron so the vault reads as a raised sanctum ===
    { x: 86, y: 2, width: 28, height: 8, type: 'clearing', fill: 'ruins_floor' },
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
    { x: 100, y: 56, type: 'bonfire', walkable: false, interactionId: 'bonfire_rest' },
    { x: 100, y: 50, type: 'well', walkable: false, interactionId: 'ancient_fountain' },
    { x: 35, y: 25, type: 'sign', walkable: false, interactionId: 'ancient_tablet' },
    { x: 160, y: 25, type: 'sign', walkable: false, interactionId: 'ancient_tablet_2' },
    { x: 100, y: 18, type: 'sign', walkable: false, interactionId: 'vault_inscription' },
    { x: 10, y: 65, type: 'sign', walkable: false, interactionId: 'library_tablet' },
    { x: 175, y: 12, type: 'campfire', walkable: false, interactionId: 'campfire' },
    { x: 88, y: 58, type: 'flower', walkable: true, interactionId: 'moonbloom_pickup' },
    { x: 142, y: 62, type: 'flower', walkable: true, interactionId: 'moonbloom_pickup' },
    { x: 48, y: 48, type: 'flower', walkable: true, interactionId: 'moonbloom_pickup' },
  ],
  elevationZones: [
    // === TIER 1: West wing elevated floor ===
    { x: 14, y: 28, width: 48, height: 40, elevation: 1 },
    // === TIER 1: East wing elevated floor ===
    { x: 136, y: 28, width: 50, height: 40, elevation: 1 },
    // === TIER 1: Central chamber floor ===
    { x: 66, y: 22, width: 68, height: 52, elevation: 1 },
    // === TIER 2: Central vault (innermost sanctum) ===
    { x: 80, y: 6, width: 40, height: 28, elevation: 2 },
    // === TIER 2: East treasure vault ===
    { x: 158, y: 6, width: 30, height: 24, elevation: 2 },
    // === TIER 1: West library alcove ===
    { x: 4, y: 56, width: 28, height: 22, elevation: 1 },
  ],
  stairways: [
    // Central vault (el2 → el1) via main corridor
    { x: 96, y: 32, width: 8, height: 4, elevation: 2 },
    // Central chamber south to entrance (el1 → el0)
    { x: 96, y: 72, width: 8, height: 4, elevation: 1 },
    // West wing south descent (el1 → el0)
    { x: 30, y: 66, width: 6, height: 4, elevation: 1 },
    // East wing south descent (el1 → el0)
    { x: 158, y: 66, width: 6, height: 4, elevation: 1 },
    // East vault (el2 → el1)
    { x: 168, y: 28, width: 6, height: 4, elevation: 2 },
    // West library (el1 → el0)
    { x: 12, y: 76, width: 6, height: 4, elevation: 1 },
  ],
  enemyZones: [
    { x: 140, y: 30, width: 44, height: 36, enemyType: 'shadow', count: 8 },
    { x: 70, y: 30, width: 60, height: 40, enemyType: 'shadow', count: 6 },
    { x: 84, y: 8, width: 32, height: 20, enemyType: 'shadow', count: 5 },
    { x: 15, y: 35, width: 40, height: 30, enemyType: 'skeleton', count: 4 },
    { x: 165, y: 8, width: 20, height: 14, enemyType: 'skeleton', count: 4 },
  ],
};

// ============= SHADOW CASTLE: 200x120 Legacy Fortress =============
const shadowCastleDef: MapDefinition = {
  name: 'Shadow Castle',
  subtitle: 'Darkness made stone',
  width: 200,
  height: 120,
  spawnPoint: { x: 100, y: 108 },
  seed: 770,
  baseTerrain: 'ruins',
  borderTile: 'stone',
  coastalSouthBorder: false,
  features: [
    // === ENTRY COURT ===
    { x: 78, y: 96, width: 44, height: 20, type: 'clearing', fill: 'stone' },
    { x: 66, y: 88, width: 68, height: 20, type: 'clearing', fill: 'stone' },

    // === OUTER WALLS AND WINGS ===
    { x: 14, y: 68, width: 42, height: 32, type: 'ruins' },
    { x: 144, y: 68, width: 42, height: 32, type: 'ruins' },
    { x: 22, y: 30, width: 34, height: 28, type: 'ruins' },
    { x: 144, y: 30, width: 34, height: 28, type: 'ruins' },
    { x: 20, y: 82, width: 30, height: 12, type: 'clearing', fill: 'stone' },
    { x: 150, y: 82, width: 30, height: 12, type: 'clearing', fill: 'stone' },

    // === CENTRAL HALL ===
    { x: 70, y: 46, width: 60, height: 44, type: 'clearing', fill: 'stone' },
    { x: 78, y: 52, width: 44, height: 32, type: 'ruins' },
    { x: 88, y: 44, width: 24, height: 18, type: 'clearing', fill: 'stone' },

    // === UPPER KEEP / BOSS APPROACH ===
    { x: 84, y: 6, width: 32, height: 30, type: 'clearing', fill: 'ruins_floor' },
    { x: 82, y: 10, width: 36, height: 24, type: 'boss_arena', interactionId: 'shadow_lord' },
    { x: 76, y: 0, width: 48, height: 12, type: 'clearing', fill: 'ruins_floor' },

    // === CONNECTORS ===
    { x: 96, y: 34, width: 8, height: 64, type: 'path', fill: 'stone' },
    { x: 96, y: 96, width: 8, height: 20, type: 'path', fill: 'ruins_floor' },
    { x: 80, y: 92, width: 40, height: 6, type: 'path', fill: 'ruins_floor' },
    { x: 56, y: 72, width: 88, height: 6, type: 'path', fill: 'stone' },
    { x: 56, y: 42, width: 88, height: 6, type: 'path', fill: 'stone' },
    { x: 48, y: 42, width: 8, height: 36, type: 'path', fill: 'stone' },
    { x: 144, y: 42, width: 8, height: 36, type: 'path', fill: 'stone' },
    { x: 36, y: 82, width: 20, height: 4, type: 'path', fill: 'stone' },
    { x: 144, y: 82, width: 20, height: 4, type: 'path', fill: 'stone' },
  ],
  portals: [
    { x: 100, y: 117, targetMap: 'deep_woods', targetX: 100, targetY: 44 },
    { x: 100, y: 4, targetMap: 'village', targetX: 120, targetY: 70 },
  ],
  chests: [
    { x: 38, y: 84, interactionId: 'shadow_castle_west_chest' },
    { x: 162, y: 84, interactionId: 'shadow_castle_east_chest' },
    { x: 100, y: 58, interactionId: 'shadow_castle_hall_chest' },
    { x: 100, y: 12, interactionId: 'boss_arena_chest' },
  ],
  interactables: [
    { x: 100, y: 101, type: 'bonfire', walkable: false, interactionId: 'bonfire_rest' },
    { x: 100, y: 40, type: 'sign', walkable: false, interactionId: 'temple_sign' },
    { x: 100, y: 52, type: 'sign', walkable: false, interactionId: 'shadow_castle_gate_switch' },
    { x: 84, y: 88, type: 'campfire', walkable: false, interactionId: 'campfire' },
    { x: 116, y: 88, type: 'campfire', walkable: false, interactionId: 'campfire' },
  ],
  props: [
    // Entry procession
    { x: 84, y: 102, type: 'campfire', walkable: false },
    { x: 116, y: 102, type: 'campfire', walkable: false },
    { x: 78, y: 96, type: 'lantern', walkable: false },
    { x: 122, y: 96, type: 'lantern', walkable: false },
    { x: 88, y: 98, type: 'bones_pile', walkable: true },
    { x: 112, y: 98, type: 'bones_pile', walkable: true },
    { x: 92, y: 94, type: 'chain', walkable: false },
    { x: 108, y: 94, type: 'chain', walkable: false },
    { x: 90, y: 92, type: 'chain', walkable: false },
    { x: 110, y: 92, type: 'chain', walkable: false },
    { x: 88, y: 84, type: 'bones_pile', walkable: true },
    { x: 112, y: 84, type: 'bones_pile', walkable: true },
    // West reliquary wing
    { x: 30, y: 86, type: 'altar', walkable: false },
    { x: 42, y: 86, type: 'cage', walkable: false },
    { x: 38, y: 92, type: 'bones_pile', walkable: true },
    { x: 28, y: 78, type: 'lantern', walkable: false },
    // East armory wing
    { x: 158, y: 86, type: 'altar', walkable: false },
    { x: 170, y: 86, type: 'cage', walkable: false },
    { x: 162, y: 92, type: 'bones_pile', walkable: true },
    { x: 172, y: 78, type: 'lantern', walkable: false },
    // Inner hall
    { x: 96, y: 70, type: 'altar', walkable: false },
    { x: 104, y: 70, type: 'altar', walkable: false },
    { x: 92, y: 60, type: 'lantern', walkable: false },
    { x: 108, y: 60, type: 'lantern', walkable: false },
    { x: 90, y: 54, type: 'bones_pile', walkable: true },
    { x: 110, y: 54, type: 'bones_pile', walkable: true },
    { x: 84, y: 50, type: 'chain', walkable: false },
    { x: 116, y: 50, type: 'chain', walkable: false },
    // Upper keep sanctum
    { x: 95, y: 28, type: 'throne', walkable: false },
    { x: 105, y: 28, type: 'throne', walkable: false },
    { x: 88, y: 24, type: 'altar', walkable: false },
    { x: 112, y: 24, type: 'altar', walkable: false },
    { x: 92, y: 16, type: 'cage', walkable: false },
    { x: 108, y: 16, type: 'cage', walkable: false },
    { x: 96, y: 12, type: 'lantern', walkable: false },
    { x: 104, y: 12, type: 'lantern', walkable: false },
  ],
  elevationZones: [
    { x: 6, y: 22, width: 188, height: 74, elevation: 1 },
    { x: 74, y: 2, width: 52, height: 42, elevation: 2 },
    { x: 16, y: 26, width: 44, height: 36, elevation: 1 },
    { x: 140, y: 26, width: 44, height: 36, elevation: 1 },
  ],
  stairways: [
    { x: 96, y: 44, width: 8, height: 4, elevation: 2 },
    { x: 96, y: 96, width: 8, height: 4, elevation: 1 },
    { x: 52, y: 62, width: 6, height: 4, elevation: 1 },
    { x: 144, y: 62, width: 6, height: 4, elevation: 1 },
  ],
  enemyZones: [
    { x: 78, y: 88, width: 44, height: 20, enemyType: 'shadow', count: 6 },
    { x: 24, y: 76, width: 24, height: 18, enemyType: 'skeleton', count: 4 },
    { x: 152, y: 76, width: 24, height: 18, enemyType: 'skeleton', count: 4 },
    { x: 84, y: 54, width: 32, height: 22, enemyType: 'shadow', count: 7 },
    { x: 84, y: 10, width: 30, height: 22, enemyType: 'golem', count: 1 },
  ],
};

// ============= INTERIOR ROOMS (portal targets) =============
const interiorInnDef: MapDefinition = {
  name: 'Greenleaf Inn',
  width: 20,
  height: 14,
  spawnPoint: { x: 10, y: 12 },
  seed: 9001,
  baseTerrain: 'grassland',
  borderTile: 'stone',
  autoRoads: false,
  features: [
    { x: 2, y: 2, width: 16, height: 10, type: 'clearing', fill: 'wood_floor' },
    { x: 0, y: 0, width: 20, height: 2, type: 'wall', fill: 'stone' },
    { x: 0, y: 2, width: 2, height: 10, type: 'wall', fill: 'stone' },
    { x: 18, y: 2, width: 2, height: 10, type: 'wall', fill: 'stone' },
    { x: 0, y: 12, width: 8, height: 2, type: 'wall', fill: 'stone' },
    { x: 12, y: 12, width: 8, height: 2, type: 'wall', fill: 'stone' },
  ],
  portals: [{ x: 10, y: 13, targetMap: 'village', targetX: 179, targetY: 94 }],
  chests: [],
  interactables: [],
  props: [
    { x: 10, y: 2, type: 'fireplace', walkable: false },
    { x: 6, y: 6, type: 'table', walkable: false },
    { x: 10, y: 6, type: 'table', walkable: false },
    { x: 14, y: 6, type: 'table', walkable: false },
    { x: 5, y: 8, type: 'bench', walkable: false },
    { x: 15, y: 8, type: 'bench', walkable: false },
    { x: 3, y: 5, type: 'barrel', walkable: false },
    { x: 17, y: 5, type: 'barrel', walkable: false },
    { x: 10, y: 9, type: 'rug', walkable: true },
    { x: 8, y: 3, type: 'counter', walkable: false },
    { x: 12, y: 3, type: 'counter', walkable: false },
    { x: 3, y: 3, type: 'bed', walkable: false },
    { x: 17, y: 3, type: 'bed', walkable: false },
    { x: 2, y: 9, type: 'wardrobe', walkable: false },
  ],
};

const interiorBlacksmithDef: MapDefinition = {
  name: 'Village Smithy',
  width: 16,
  height: 12,
  spawnPoint: { x: 8, y: 10 },
  seed: 9002,
  baseTerrain: 'grassland',
  borderTile: 'stone',
  autoRoads: false,
  features: [
    { x: 2, y: 2, width: 12, height: 8, type: 'clearing', fill: 'stone' },
    { x: 0, y: 0, width: 16, height: 2, type: 'wall', fill: 'stone' },
    { x: 0, y: 2, width: 2, height: 8, type: 'wall', fill: 'stone' },
    { x: 14, y: 2, width: 2, height: 8, type: 'wall', fill: 'stone' },
    { x: 0, y: 10, width: 6, height: 2, type: 'wall', fill: 'stone' },
    { x: 10, y: 10, width: 6, height: 2, type: 'wall', fill: 'stone' },
  ],
  portals: [{ x: 8, y: 11, targetMap: 'village', targetX: 159, targetY: 64 }],
  chests: [],
  interactables: [],
  props: [
    { x: 8, y: 2, type: 'fireplace', walkable: false },
    { x: 4, y: 5, type: 'crate', walkable: false },
    { x: 5, y: 5, type: 'crate', walkable: false },
    { x: 11, y: 5, type: 'barrel', walkable: false },
    { x: 12, y: 5, type: 'barrel', walkable: false },
    { x: 3, y: 7, type: 'counter', walkable: false },
    { x: 7, y: 7, type: 'counter', walkable: false },
    { x: 11, y: 7, type: 'counter', walkable: false },
    { x: 4, y: 3, type: 'weapon_rack', walkable: false },
    { x: 3, y: 3, type: 'barrel', walkable: false },
  ],
};

const interiorMerchantDef: MapDefinition = {
  name: 'Potion Shop',
  width: 14,
  height: 12,
  spawnPoint: { x: 7, y: 10 },
  seed: 9003,
  baseTerrain: 'grassland',
  borderTile: 'stone',
  autoRoads: false,
  features: [
    { x: 2, y: 2, width: 10, height: 8, type: 'clearing', fill: 'wood_floor' },
    { x: 0, y: 0, width: 14, height: 2, type: 'wall', fill: 'stone' },
    { x: 0, y: 2, width: 2, height: 8, type: 'wall', fill: 'stone' },
    { x: 12, y: 2, width: 2, height: 8, type: 'wall', fill: 'stone' },
    { x: 0, y: 10, width: 5, height: 2, type: 'wall', fill: 'stone' },
    { x: 9, y: 10, width: 5, height: 2, type: 'wall', fill: 'stone' },
  ],
  portals: [{ x: 7, y: 11, targetMap: 'village', targetX: 179, targetY: 62 }],
  chests: [],
  interactables: [],
  props: [
    { x: 3, y: 3, type: 'bookshelf', walkable: false },
    { x: 10, y: 3, type: 'bookshelf', walkable: false },
    { x: 5, y: 6, type: 'counter', walkable: false },
    { x: 9, y: 6, type: 'counter', walkable: false },
    { x: 4, y: 8, type: 'pot', walkable: true },
    { x: 10, y: 8, type: 'pot', walkable: true },
    { x: 6, y: 5, type: 'crate', walkable: false },
    { x: 8, y: 5, type: 'crate', walkable: false },
    { x: 7, y: 3, type: 'alchemy_table', walkable: false },
    { x: 3, y: 5, type: 'cauldron', walkable: false },
    { x: 11, y: 5, type: 'cauldron', walkable: false },
  ],
};

const interiorCottageADef: MapDefinition = {
  name: 'Cottage Interior',
  width: 12,
  height: 10,
  spawnPoint: { x: 6, y: 8 },
  seed: 9004,
  baseTerrain: 'grassland',
  borderTile: 'stone',
  autoRoads: false,
  features: [
    { x: 2, y: 2, width: 8, height: 6, type: 'clearing', fill: 'wood_floor' },
    { x: 0, y: 0, width: 12, height: 2, type: 'wall', fill: 'stone' },
    { x: 0, y: 2, width: 2, height: 8, type: 'wall', fill: 'stone' },
    { x: 10, y: 2, width: 2, height: 8, type: 'wall', fill: 'stone' },
    // Split bottom wall with a center doorway opening for the exit door tile.
    { x: 2, y: 8, width: 3, height: 2, type: 'wall', fill: 'stone' },
    { x: 7, y: 8, width: 3, height: 2, type: 'wall', fill: 'stone' },
  ],
  portals: [{ x: 6, y: 9, targetMap: 'village', targetX: 91, targetY: 119 }],
  chests: [{ x: 9, y: 6, interactionId: 'cottage_interior_chest_a' }],
  interactables: [],
  props: [
    { x: 4, y: 4, type: 'table', walkable: false },
    { x: 8, y: 4, type: 'bench', walkable: false },
    { x: 6, y: 6, type: 'rug', walkable: true },
    { x: 9, y: 3, type: 'pot', walkable: true },
    { x: 3, y: 3, type: 'bed', walkable: false },
    { x: 3, y: 6, type: 'wardrobe', walkable: false },
    { x: 8, y: 3, type: 'bed', walkable: false },
    { x: 3, y: 5, type: 'fireplace', walkable: false },
  ],
};

const interiorCottageForestDef: MapDefinition = {
  name: 'Cottage Interior',
  width: 12,
  height: 10,
  spawnPoint: { x: 6, y: 8 },
  seed: 9014,
  baseTerrain: 'forest',
  borderTile: 'stone',
  autoRoads: false,
  features: [
    { x: 2, y: 2, width: 8, height: 6, type: 'clearing', fill: 'wood_floor' },
    { x: 0, y: 0, width: 12, height: 2, type: 'wall', fill: 'stone' },
    { x: 0, y: 2, width: 2, height: 8, type: 'wall', fill: 'stone' },
    { x: 10, y: 2, width: 2, height: 8, type: 'wall', fill: 'stone' },
    { x: 2, y: 8, width: 3, height: 2, type: 'wall', fill: 'stone' },
    { x: 7, y: 8, width: 3, height: 2, type: 'wall', fill: 'stone' },
  ],
  portals: [{ x: 6, y: 9, targetMap: 'forest', targetX: 173, targetY: 96 }],
  chests: [{ x: 9, y: 6, interactionId: 'forest_cottage_chest' }],
  interactables: [],
  props: [
    { x: 4, y: 4, type: 'table', walkable: false },
    { x: 8, y: 4, type: 'bench', walkable: false },
    { x: 6, y: 6, type: 'rug', walkable: true },
    { x: 9, y: 3, type: 'pot', walkable: true },
    { x: 3, y: 3, type: 'bed', walkable: false },
    { x: 3, y: 6, type: 'wardrobe', walkable: false },
    { x: 8, y: 3, type: 'bed', walkable: false },
    { x: 3, y: 5, type: 'fireplace', walkable: false },
  ],
};

const interiorRangerCabinDef: MapDefinition = {
  name: 'Ranger Cabin',
  width: 14,
  height: 10,
  spawnPoint: { x: 7, y: 2 },
  seed: 9005,
  baseTerrain: 'forest',
  borderTile: 'stone',
  autoRoads: false,
  features: [
    { x: 2, y: 2, width: 10, height: 6, type: 'clearing', fill: 'wood_floor' },
    { x: 0, y: 0, width: 14, height: 2, type: 'wall', fill: 'stone' },
    { x: 0, y: 2, width: 2, height: 6, type: 'wall', fill: 'stone' },
    { x: 12, y: 2, width: 2, height: 6, type: 'wall', fill: 'stone' },
    { x: 0, y: 8, width: 5, height: 2, type: 'wall', fill: 'stone' },
    { x: 9, y: 8, width: 5, height: 2, type: 'wall', fill: 'stone' },
  ],
  portals: [{ x: 7, y: 9, targetMap: 'forest', targetX: 141, targetY: 172 }],
  chests: [{ x: 10, y: 5, interactionId: 'forest_ranger_chest' }],
  interactables: [{ x: 7, y: 4, type: 'sign', walkable: false, interactionId: 'ranger_sign' }],
  props: [
    { x: 7, y: 3, type: 'table', walkable: false },
    { x: 4, y: 5, type: 'crate', walkable: false },
    { x: 5, y: 5, type: 'crate', walkable: false },
    { x: 10, y: 4, type: 'bookshelf', walkable: false },
    { x: 3, y: 6, type: 'bench', walkable: false },
    { x: 11, y: 6, type: 'bench', walkable: false },
    { x: 3, y: 3, type: 'bed', walkable: false },
    { x: 11, y: 3, type: 'bed', walkable: false },
    { x: 6, y: 6, type: 'fireplace', walkable: false },
    { x: 4, y: 3, type: 'wardrobe', walkable: false },
  ],
};

const interiorWoodcutterCottageDef: MapDefinition = {
  name: "Woodcutter's Cottage",
  width: 12,
  height: 10,
  spawnPoint: { x: 6, y: 8 },
  seed: 9011,
  baseTerrain: 'forest',
  borderTile: 'stone',
  autoRoads: false,
  features: [
    { x: 2, y: 2, width: 8, height: 6, type: 'clearing', fill: 'wood_floor' },
    { x: 0, y: 0, width: 12, height: 2, type: 'wall', fill: 'stone' },
    { x: 0, y: 2, width: 2, height: 8, type: 'wall', fill: 'stone' },
    { x: 10, y: 2, width: 2, height: 8, type: 'wall', fill: 'stone' },
    { x: 2, y: 8, width: 3, height: 2, type: 'wall', fill: 'stone' },
    { x: 7, y: 8, width: 3, height: 2, type: 'wall', fill: 'stone' },
  ],
  portals: [{ x: 6, y: 9, targetMap: 'forest', targetX: 93, targetY: 186 }],
  chests: [{ x: 9, y: 6, interactionId: 'forest_woodcutter_chest' }],
  interactables: [],
  props: [
    { x: 3, y: 3, type: 'bed', walkable: false },
    { x: 3, y: 5, type: 'fireplace', walkable: false },
    { x: 4, y: 4, type: 'table', walkable: false },
    { x: 8, y: 4, type: 'weapon_rack', walkable: false },
    { x: 8, y: 5, type: 'crate', walkable: false },
    { x: 9, y: 4, type: 'barrel', walkable: false },
    { x: 7, y: 6, type: 'bench', walkable: false },
    { x: 3, y: 6, type: 'wardrobe', walkable: false },
  ],
};

const interiorWitchHutDef: MapDefinition = {
  name: 'Witch Hut',
  width: 12,
  height: 10,
  spawnPoint: { x: 6, y: 2 },
  seed: 9006,
  baseTerrain: 'swamp',
  borderTile: 'stone',
  autoRoads: false,
  features: [
    { x: 2, y: 2, width: 8, height: 6, type: 'clearing', fill: 'wood_floor' },
    { x: 0, y: 0, width: 12, height: 2, type: 'wall', fill: 'stone' },
    { x: 0, y: 2, width: 2, height: 6, type: 'wall', fill: 'stone' },
    { x: 10, y: 2, width: 2, height: 6, type: 'wall', fill: 'stone' },
    { x: 0, y: 8, width: 4, height: 2, type: 'wall', fill: 'stone' },
    { x: 8, y: 8, width: 4, height: 2, type: 'wall', fill: 'stone' },
  ],
  portals: [{ x: 6, y: 9, targetMap: 'deep_woods', targetX: 65, targetY: 68 }],
  chests: [],
  interactables: [{ x: 6, y: 4, type: 'sign', walkable: false, interactionId: 'witch_hut_lore' }],
  props: [
    { x: 3, y: 3, type: 'bookshelf', walkable: false },
    { x: 9, y: 3, type: 'bookshelf', walkable: false },
    { x: 6, y: 5, type: 'fireplace', walkable: false },
    { x: 4, y: 6, type: 'pot', walkable: true },
    { x: 8, y: 6, type: 'pot', walkable: true },
    { x: 5, y: 4, type: 'counter', walkable: false },
    { x: 3, y: 5, type: 'cauldron', walkable: false },
    { x: 9, y: 5, type: 'cauldron', walkable: false },
    { x: 6, y: 3, type: 'alchemy_table', walkable: false },
    { x: 4, y: 4, type: 'bones', walkable: true },
    { x: 8, y: 4, type: 'bones_pile', walkable: true },
  ],
};

const interiorWitchCottageDef: MapDefinition = {
  name: "Witch's Cottage",
  width: 12,
  height: 10,
  spawnPoint: { x: 6, y: 8 },
  seed: 9015,
  baseTerrain: 'forest',
  borderTile: 'stone',
  autoRoads: false,
  features: [
    { x: 2, y: 2, width: 8, height: 6, type: 'clearing', fill: 'wood_floor' },
    { x: 0, y: 0, width: 12, height: 2, type: 'wall', fill: 'stone' },
    { x: 0, y: 2, width: 2, height: 8, type: 'wall', fill: 'stone' },
    { x: 10, y: 2, width: 2, height: 8, type: 'wall', fill: 'stone' },
    { x: 2, y: 8, width: 3, height: 2, type: 'wall', fill: 'stone' },
    { x: 7, y: 8, width: 3, height: 2, type: 'wall', fill: 'stone' },
  ],
  portals: [{ x: 6, y: 9, targetMap: 'forest', targetX: 233, targetY: 136 }],
  chests: [{ x: 9, y: 6, interactionId: 'forest_witch_chest' }],
  interactables: [{ x: 6, y: 4, type: 'sign', walkable: false, interactionId: 'witch_cottage' }],
  props: [
    { x: 3, y: 3, type: 'bookshelf', walkable: false },
    { x: 9, y: 3, type: 'bookshelf', walkable: false },
    { x: 6, y: 5, type: 'cauldron', walkable: false },
    { x: 4, y: 6, type: 'pot', walkable: true },
    { x: 8, y: 6, type: 'pot', walkable: true },
    { x: 5, y: 4, type: 'counter', walkable: false },
    { x: 7, y: 4, type: 'counter', walkable: false },
    { x: 3, y: 5, type: 'alchemy_table', walkable: false },
    { x: 9, y: 5, type: 'fireplace', walkable: false },
  ],
};

const interiorHunterCottageDef: MapDefinition = {
  name: 'Disparaged Cottage',
  width: 12,
  height: 10,
  spawnPoint: { x: 6, y: 8 },
  seed: 9010,
  baseTerrain: 'dungeon',
  borderTile: 'stone',
  autoRoads: false,
  features: [
    { x: 2, y: 2, width: 8, height: 6, type: 'clearing', fill: 'wood_floor' },
    { x: 0, y: 0, width: 12, height: 2, type: 'wall', fill: 'stone' },
    { x: 0, y: 2, width: 2, height: 8, type: 'wall', fill: 'stone' },
    { x: 10, y: 2, width: 2, height: 8, type: 'wall', fill: 'stone' },
    { x: 2, y: 8, width: 3, height: 2, type: 'wall', fill: 'stone' },
    { x: 7, y: 8, width: 3, height: 2, type: 'wall', fill: 'stone' },
  ],
  // Return to Whispering Woods on the upper shack approach, just in front of the exterior entrance.
  portals: [{ x: 6, y: 9, targetMap: 'forest', targetX: 137, targetY: 188 }],
  chests: [{ x: 8, y: 5, interactionId: 'forest_hunter_chest' }],
  interactables: [{ x: 6, y: 4, type: 'table', walkable: false, interactionId: 'hunter_clue' }],
  props: [
    { x: 3, y: 3, type: 'bed', walkable: false },
    { x: 8, y: 3, type: 'crate', walkable: false },
    { x: 9, y: 3, type: 'barrel', walkable: false },
    { x: 8, y: 4, type: 'crate', walkable: false },
    { x: 3, y: 5, type: 'fireplace', walkable: false },
    { x: 4, y: 4, type: 'bones', walkable: true },
    { x: 5, y: 6, type: 'bloodstain', walkable: true },
    { x: 7, y: 6, type: 'bloodstain', walkable: true },
    { x: 9, y: 5, type: 'barrel', walkable: false },
    { x: 6, y: 6, type: 'rug', walkable: true },
  ],
};

// ==================== INTERIOR: HOLLOW GUARDIAN ARENA ====================
const interiorHollowArenaDef: MapDefinition = {
  name: 'The Hollow',
  subtitle: 'Lair of the Guardian',
  width: 36,
  height: 36,
  spawnPoint: { x: 18, y: 32 },
  seed: 9100,
  baseTerrain: 'forest',
  borderTile: 'dead_tree',
  autoRoads: false,
  coastalSouthBorder: false,
  features: [
    // Outer dead tree perimeter (solid ring)
    { x: 0, y: 0, width: 36, height: 3, type: 'wall', fill: 'dead_tree' },
    { x: 0, y: 33, width: 36, height: 3, type: 'wall', fill: 'dead_tree' },
    { x: 0, y: 3, width: 3, height: 30, type: 'wall', fill: 'dead_tree' },
    { x: 33, y: 3, width: 3, height: 30, type: 'wall', fill: 'dead_tree' },
    // Inner clearing — corrupted dark arena floor
    { x: 3, y: 3, width: 30, height: 30, type: 'clearing', fill: 'dark_grass' },
    // Stone circle at center
    { x: 10, y: 10, width: 16, height: 16, type: 'clearing', fill: 'mossy_stone' },
    { x: 13, y: 13, width: 10, height: 10, type: 'clearing', fill: 'ruins_floor' },
  ],
  portals: [
    { x: 18, y: 34, targetMap: 'forest', targetX: 122, targetY: 30 },
  ],
  chests: [],
  interactables: [],
  props: [
    // Corner pillars
    { x: 10, y: 10, type: 'statue', walkable: false },
    { x: 25, y: 10, type: 'statue', walkable: false },
    { x: 10, y: 25, type: 'statue', walkable: false },
    { x: 25, y: 25, type: 'statue', walkable: false },
    // Scattered bones
    { x: 14, y: 8, type: 'bones', walkable: true },
    { x: 22, y: 7, type: 'bones', walkable: true },
    { x: 8, y: 16, type: 'bones', walkable: true },
    { x: 27, y: 20, type: 'bones', walkable: true },
  ],
};

// Lazy map generation - only generate when first accessed
const mapCache: Record<string, WorldMap> = {};

function clearMapCache() {
  for (const key of Object.keys(mapCache)) {
    delete mapCache[key];
  }
}

export const mapDefinitions: Record<string, MapDefinition> = {
  village: villageDef,
  forest: forestDef,
  deep_woods: deepWoodsDef,
  shadow_castle: shadowCastleDef,
  ruins: ruinsDef,
  interior_inn: interiorInnDef,
  interior_blacksmith: interiorBlacksmithDef,
  interior_merchant: interiorMerchantDef,
  interior_cottage_a: interiorCottageADef,
  interior_cottage_forest: interiorCottageForestDef,
  interior_ranger_cabin: interiorRangerCabinDef,
  interior_woodcutter_cottage: interiorWoodcutterCottageDef,
  interior_witch_cottage: interiorWitchCottageDef,
  interior_witch_hut: interiorWitchHutDef,
  interior_hunter_cottage: interiorHunterCottageDef,
  interior_hollow_arena: interiorHollowArenaDef,
};

function getOrGenerateMap(key: string): WorldMap {
  if (!mapCache[key]) {
    const def = mapDefinitions[key];
    if (!def) throw new Error(`Unknown map: ${key}`);
    mapCache[key] = generateMap(def);
  }
  return mapCache[key];
}

// Proxy that lazily generates maps on first access
export const allMaps: Record<string, WorldMap> = new Proxy({} as Record<string, WorldMap>, {
  get(_target, prop: string) {
    return getOrGenerateMap(prop);
  },
  has(_target, prop: string) {
    return prop in mapDefinitions;
  },
});

if (import.meta.hot) {
  import.meta.hot.dispose(() => {
    clearMapCache();
  });
}
