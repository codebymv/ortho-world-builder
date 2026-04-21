import { WorldMap } from '@/lib/game/World';
import { interiorBlacksmithDef, interiorCottageADef, interiorCottageForestDef, interiorHollowArenaDef, interiorHunterCottageDef, interiorInnDef, interiorMerchantDef, interiorRangerCabinDef, interiorWoodcutterCottageDef } from '@/content/regions/interiors';
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
    // ====== CENTRAL VILLAGE SQUARE (dirt clearing with grass border) ======
    { x: 95, y: 68, width: 50, height: 34, type: 'clearing', fill: 'dirt' },

    // ====== TOWN HALL (center of plaza) ======
    { x: 110, y: 58, width: 16, height: 10, type: 'building', interactionId: 'town_hall' },

    // ====== NON-ENTERABLE BUILDINGS INSIDE SQUARE (small houses for density) ======
    { x: 96, y: 72, width: 5, height: 4, type: 'cottage' },
    { x: 131, y: 72, width: 5, height: 4, type: 'building' },
    { x: 109, y: 79, width: 5, height: 4, type: 'cottage' },
    { x: 128, y: 82, width: 5, height: 4, type: 'building' },
    { x: 98, y: 88, width: 5, height: 4, type: 'cottage' },
    { x: 135, y: 90, width: 5, height: 4, type: 'building' },

    // ====== WINDMILL LANDMARK (visible from square) ======
    { x: 142, y: 58, width: 6, height: 6, type: 'clearing', fill: 'dirt' },

    // ====== MARKET STALLS & WAGONS INSIDE SQUARE ======
    { x: 106, y: 74, width: 5, height: 1, type: 'market_stall_row' },
    { x: 122, y: 74, width: 5, height: 1, type: 'market_stall_row' },
    { x: 106, y: 86, width: 5, height: 1, type: 'market_stall_row' },
    { x: 122, y: 86, width: 4, height: 1, type: 'market_stall_row' },
    { x: 114, y: 92, width: 5, height: 1, type: 'market_stall_row' },
    { x: 96, y: 96, width: 5, height: 4, type: 'broken_wagon' },
    { x: 136, y: 96, width: 5, height: 4, type: 'broken_wagon' },

    // ====== GARDEN NEAR ELDER'S AREA ======
    { x: 96, y: 68, width: 4, height: 3, type: 'garden' },

    // ====== APPROACH BUILDINGS (spawn to square, small non-enterable) ======
    { x: 108, y: 106, width: 5, height: 4, type: 'cottage' },
    { x: 128, y: 108, width: 5, height: 4, type: 'cottage' },
    { x: 100, y: 112, width: 5, height: 4, type: 'building' },

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
    // Residential yard gardens next to houses
    { x: 34, y: 48, width: 4, height: 3, type: 'garden' },
    { x: 49, y: 52, width: 4, height: 3, type: 'garden' },
    { x: 37, y: 65, width: 4, height: 3, type: 'garden' },
    { x: 59, y: 60, width: 4, height: 3, type: 'garden' },
    { x: 64, y: 72, width: 4, height: 3, type: 'garden' },
    { x: 31, y: 88, width: 4, height: 3, type: 'garden' },
    // Residential dirt side lanes connecting houses to main roads
    { x: 25, y: 55, width: 3, height: 3, type: 'path', fill: 'dirt' },
    { x: 40, y: 58, width: 3, height: 2, type: 'path', fill: 'dirt' },
    { x: 50, y: 66, width: 3, height: 6, type: 'path', fill: 'dirt' },
    { x: 35, y: 84, width: 3, height: 4, type: 'path', fill: 'dirt' },
    { x: 55, y: 78, width: 3, height: 2, type: 'path', fill: 'dirt' },
    { x: 68, y: 56, width: 3, height: 16, type: 'path', fill: 'dirt' },
    // Fence borders defining residential clusters
    { x: 23, y: 46, width: 22, height: 18, type: 'iron_fence_border', fill: 'grass' },
    { x: 47, y: 58, width: 16, height: 14, type: 'iron_fence_border', fill: 'grass' },

    // ====== MARKET DISTRICT (east) - shops with dirt clearing ======
    { x: 155, y: 65, width: 30, height: 18, type: 'clearing', fill: 'dirt' },
    { x: 184, y: 74, width: 24, height: 18, type: 'clearing', fill: 'dirt' },
    { x: 155, y: 58, width: 8, height: 6, type: 'inn_building', interactionId: 'shop_weapons', interiorMap: 'interior_blacksmith', interiorSpawnX: 8, interiorSpawnY: 10 },
    { x: 175, y: 56, width: 8, height: 6, type: 'inn_building', interactionId: 'shop_potions', interiorMap: 'interior_merchant', interiorSpawnX: 7, interiorSpawnY: 10 },
    { x: 175, y: 88, width: 8, height: 6, type: 'inn_building', interactionId: 'inn', interiorMap: 'interior_inn', interiorSpawnX: 10, interiorSpawnY: 12 },
    { x: 192, y: 64, width: 8, height: 6, type: 'building', interactionId: 'shop_magic' },
    { x: 192, y: 80, width: 8, height: 6, type: 'building', interactionId: 'tavern' },

    // ====== FARM DISTRICT (south) - wheat fields with fences ======
    { x: 20, y: 105, width: 30, height: 18, type: 'farm' },
    { x: 55, y: 110, width: 26, height: 16, type: 'farm' },
    { x: 130, y: 115, width: 28, height: 16, type: 'farm' },
    // Threshing clearings between farms
    { x: 52, y: 105, width: 6, height: 5, type: 'clearing', fill: 'dirt' },
    { x: 83, y: 112, width: 5, height: 5, type: 'clearing', fill: 'dirt' },
    { x: 110, y: 118, width: 6, height: 5, type: 'clearing', fill: 'dirt' },

    // ====== CEMETERY with IRON FENCING (north-west) ======
    { x: 10, y: 15, width: 28, height: 22, type: 'iron_fence_border', fill: 'dirt' },
    { x: 12, y: 17, width: 24, height: 18, type: 'graveyard' },

    // ====== HEDGE GARDEN/MAZE (east of plaza) ======
    { x: 200, y: 30, width: 28, height: 22, type: 'hedge_maze' },

    // ====== FOREST GROVES scattered for natural feel ======
    { x: 5, y: 90, width: 18, height: 16, type: 'forest_grove' },
    { x: 210, y: 110, width: 22, height: 20, type: 'forest_grove' },
    { x: 85, y: 12, width: 20, height: 14, type: 'forest_grove' },
    { x: 68, y: 5, width: 14, height: 16, type: 'waterfall' },

    // ====== VILLAGE LAKE with surrounding trees ======
    { x: 170, y: 110, width: 30, height: 20, type: 'lake' },
    // Wooden boardwalk and dock at lake
    { x: 168, y: 108, width: 10, height: 2, type: 'path', fill: 'wooden_path' },
    { x: 185, y: 125, width: 3, height: 6, type: 'path', fill: 'wooden_path' },

    // ====== TRAINING GROUNDS (north-east) ======
    { x: 170, y: 20, width: 24, height: 16, type: 'clearing', fill: 'dirt' },
    // Fence border around training grounds
    { x: 169, y: 19, width: 26, height: 18, type: 'iron_fence_border', fill: 'dirt' },

    // ====== ELDER'S GARDEN (fenced, north of plaza) ======
    { x: 105, y: 42, width: 14, height: 12, type: 'garden' },

    // ====== PARKS & GREEN SPACES filling gaps ======
    { x: 82, y: 95, width: 12, height: 10, type: 'garden' },
    { x: 200, y: 95, width: 14, height: 12, type: 'garden' },
    // Additional flower gardens in town center gaps
    { x: 95, y: 60, width: 6, height: 4, type: 'garden' },
    { x: 135, y: 60, width: 6, height: 4, type: 'garden' },

    // ====== ENEMY OUTPOSTS (edges) ======
    { x: 215, y: 12, width: 16, height: 12, type: 'camp', interactionId: 'bandit_camp' },
    { x: 5, y: 130, width: 12, height: 10, type: 'camp', interactionId: 'goblin_camp' },

    // ====== FORTS ======
    { x: 190, y: 18, width: 20, height: 16, type: 'fort', interactionId: 'north_fort' },
    { x: 8, y: 40, width: 16, height: 14, type: 'fort', interactionId: 'west_fort' },

    // ====== VILLAGE CHURCH (east of cemetery) ======
    { x: 42, y: 28, width: 20, height: 20, type: 'clearing', fill: 'dirt' },
    { x: 45, y: 30, width: 12, height: 14, type: 'church', interactionId: 'village_church' },
    // Churchyard flower beds flanking entry
    { x: 43, y: 44, width: 4, height: 3, type: 'garden' },
    { x: 55, y: 44, width: 4, height: 3, type: 'garden' },

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

    // ====== NORTH CORRIDOR: ZONE A â€” VILLAGE GATE CROSSROADS (y:53-58) ======
    { x: 108, y: 53, width: 22, height: 6, type: 'clearing', fill: 'dirt' },

    // ====== NORTH CORRIDOR: ZONE B â€” THE THRESHOLD (y:22-42) ======
    { x: 124, y: 30, width: 5, height: 4, type: 'cottage' },
    { x: 106, y: 28, width: 7, height: 5, type: 'clearing', fill: 'dark_grass' },
    { x: 127, y: 36, width: 7, height: 5, type: 'clearing', fill: 'dark_grass' },
    { x: 108, y: 36, width: 6, height: 4, type: 'clearing', fill: 'tall_grass' },
    { x: 125, y: 24, width: 6, height: 4, type: 'clearing', fill: 'tall_grass' },

    // ====== NORTH CORRIDOR: ZONE C â€” FOREST EDGE (y:3-22) ======
    { x: 100, y: 8, width: 14, height: 16, type: 'forest_grove' },
    { x: 126, y: 8, width: 14, height: 16, type: 'forest_grove' },
    { x: 110, y: 3, width: 20, height: 12, type: 'clearing', fill: 'dirt' },

    // ====== DIRT ROADS connecting everything ======
    { x: 116, y: 10, width: 6, height: 130, type: 'path', fill: 'dirt' },
    { x: 20, y: 72, width: 200, height: 4, type: 'path', fill: 'dirt' },
    { x: 145, y: 72, width: 60, height: 4, type: 'path', fill: 'dirt' },
    { x: 184, y: 88, width: 24, height: 4, type: 'path', fill: 'dirt' },
    { x: 40, y: 100, width: 100, height: 3, type: 'path', fill: 'dirt' },
    { x: 28, y: 58, width: 50, height: 2, type: 'path', fill: 'dirt' },
    { x: 28, y: 76, width: 50, height: 2, type: 'path', fill: 'dirt' },
    { x: 38, y: 25, width: 78, height: 3, type: 'path', fill: 'dirt' },
    { x: 116, y: 8, width: 6, height: 6, type: 'path', fill: 'dirt' },
    { x: 196, y: 72, width: 42, height: 4, type: 'path', fill: 'dirt' },
    { x: 160, y: 100, width: 20, height: 3, type: 'path', fill: 'dirt' },
    { x: 170, y: 36, width: 24, height: 3, type: 'path', fill: 'dirt' },
    { x: 112, y: 38, width: 4, height: 20, type: 'path', fill: 'dirt' },
    // Dirt widening at key intersections
    { x: 113, y: 70, width: 10, height: 8, type: 'clearing', fill: 'dirt' },
    { x: 113, y: 98, width: 10, height: 8, type: 'clearing', fill: 'dirt' },
    // Lake approach road
    { x: 160, y: 103, width: 12, height: 3, type: 'path', fill: 'dirt' },
    // South-central connecting path
    { x: 88, y: 100, width: 28, height: 3, type: 'path', fill: 'dirt' },
  ],
  portals: [
    { x: 120, y: 8, targetMap: 'forest', targetX: 150, targetY: 289 },
    { x: 237, y: 80, targetMap: 'forest', targetX: 4, targetY: 150 },
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
    // ====== CORE INTERACTABLES ======
    { x: 120, y: 104, type: 'bonfire', walkable: false, interactionId: 'bonfire_village' },
    { x: 119, y: 82, type: 'well', walkable: false, interactionId: 'fountain' },
    { x: 119, y: 125, type: 'campfire', walkable: false, interactionId: 'campfire' },
    { x: 20, y: 30, type: 'tombstone', walkable: false, interactionId: 'tombstone' },

    // ====== WELLS (residential, farm, lakeside) ======
    { x: 38, y: 60, type: 'well', walkable: false, interactionId: 'well' },
    { x: 180, y: 100, type: 'well', walkable: false, interactionId: 'well' },
    { x: 45, y: 82, type: 'well', walkable: false, interactionId: 'well_residential' },
    { x: 42, y: 108, type: 'well', walkable: false, interactionId: 'well_farm' },
    { x: 178, y: 28, type: 'well', walkable: false, interactionId: 'well_training' },

    // ====== VILLAGE SIGN ======
    { x: 108, y: 100, type: 'sign', walkable: false, interactionId: 'village_sign' },

    // ====== LANTERNS along main N-S road (every ~12 tiles) ======
    { x: 115, y: 18, type: 'lantern', walkable: false, interactionId: 'lantern' },
    { x: 122, y: 30, type: 'lantern', walkable: false, interactionId: 'lantern' },
    { x: 115, y: 42, type: 'lantern', walkable: false, interactionId: 'lantern' },
    { x: 122, y: 50, type: 'lantern', walkable: false, interactionId: 'lantern' },
    { x: 115, y: 62, type: 'lantern', walkable: false, interactionId: 'lantern' },
    { x: 122, y: 80, type: 'lantern', walkable: false, interactionId: 'lantern' },
    { x: 115, y: 90, type: 'lantern', walkable: false, interactionId: 'lantern' },
    { x: 122, y: 108, type: 'lantern', walkable: false, interactionId: 'lantern' },
    { x: 115, y: 120, type: 'lantern', walkable: false, interactionId: 'lantern' },
    { x: 122, y: 132, type: 'lantern', walkable: false, interactionId: 'lantern' },
    // ====== LANTERNS along E-W road ======
    { x: 35, y: 71, type: 'lantern', walkable: false, interactionId: 'lantern' },
    { x: 50, y: 76, type: 'lantern', walkable: false, interactionId: 'lantern' },
    { x: 70, y: 71, type: 'lantern', walkable: false, interactionId: 'lantern' },
    { x: 90, y: 76, type: 'lantern', walkable: false, interactionId: 'lantern' },
    { x: 145, y: 71, type: 'lantern', walkable: false, interactionId: 'lantern' },
    { x: 165, y: 76, type: 'lantern', walkable: false, interactionId: 'lantern' },
    { x: 195, y: 71, type: 'lantern', walkable: false, interactionId: 'lantern' },
    // ====== LANTERNS at district entries ======
    { x: 152, y: 64, type: 'lantern', walkable: false, interactionId: 'lantern' },
    { x: 200, y: 64, type: 'lantern', walkable: false, interactionId: 'lantern' },

    // ====== TEMPEST GRASS ======
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
    // Additional tempest_grass in underserved areas
    { x: 25, y: 110, type: 'tempest_grass', walkable: true, interactionId: 'tempest_grass_pickup' },
    { x: 140, y: 120, type: 'tempest_grass', walkable: true, interactionId: 'tempest_grass_pickup' },
    { x: 190, y: 115, type: 'tempest_grass', walkable: true, interactionId: 'tempest_grass_pickup' },
    { x: 75, y: 18, type: 'tempest_grass', walkable: true, interactionId: 'tempest_grass_pickup' },
    { x: 210, y: 45, type: 'tempest_grass', walkable: true, interactionId: 'tempest_grass_pickup' },
    { x: 8, y: 95, type: 'tempest_grass', walkable: true, interactionId: 'tempest_grass_pickup' },
    { x: 155, y: 38, type: 'tempest_grass', walkable: true, interactionId: 'tempest_grass_pickup' },

    // ====== NORTH CORRIDOR: SUPPLIES ======
    { x: 117, y: 38, type: 'tempest_grass', walkable: true, interactionId: 'tempest_grass_pickup' },
    { x: 120, y: 24, type: 'tempest_grass', walkable: true, interactionId: 'tempest_grass_pickup' },
  ],
  props: [
    // ====== NORTH RIDGE OVERLOOK ======
    { x: 84, y: 14, type: 'bench', walkable: false },
    { x: 78, y: 12, type: 'lantern', walkable: false },
    { x: 90, y: 16, type: 'rock', walkable: false },
    { x: 76, y: 10, type: 'rock', walkable: false },
    { x: 82, y: 18, type: 'stump', walkable: false },
    { x: 92, y: 20, type: 'flower', walkable: true },

    // ====== CENTRAL PLAZA ======
    // Windmill landmark
    { x: 144, y: 60, type: 'windmill', walkable: false },
    // Fountain centerpiece
    { x: 118, y: 84, type: 'fountain', walkable: false },
    // Statue near town hall
    { x: 118, y: 70, type: 'statue', walkable: false },

    // Benches around plaza perimeter and between buildings
    { x: 104, y: 100, type: 'bench', walkable: false },
    { x: 130, y: 100, type: 'bench', walkable: false },
    { x: 110, y: 69, type: 'bench', walkable: false },
    { x: 126, y: 69, type: 'bench', walkable: false },
    { x: 114, y: 77, type: 'bench', walkable: false },
    { x: 124, y: 77, type: 'bench', walkable: false },
    { x: 105, y: 85, type: 'bench', walkable: false },
    { x: 126, y: 88, type: 'bench', walkable: false },
    { x: 116, y: 97, type: 'bench', walkable: false },
    { x: 112, y: 93, type: 'bench', walkable: false },

    // Lanterns at building corners and along lanes
    { x: 96, y: 68, type: 'lantern', walkable: false },
    { x: 144, y: 68, type: 'lantern', walkable: false },
    { x: 96, y: 100, type: 'lantern', walkable: false },
    { x: 144, y: 100, type: 'lantern', walkable: false },
    { x: 102, y: 72, type: 'lantern', walkable: false },
    { x: 136, y: 72, type: 'lantern', walkable: false },
    { x: 113, y: 79, type: 'lantern', walkable: false },
    { x: 134, y: 82, type: 'lantern', walkable: false },
    { x: 104, y: 88, type: 'lantern', walkable: false },
    { x: 140, y: 90, type: 'lantern', walkable: false },
    { x: 118, y: 92, type: 'lantern', walkable: false },
    { x: 110, y: 100, type: 'lantern', walkable: false },
    { x: 136, y: 100, type: 'lantern', walkable: false },

    // Barrel/crate clusters flanking building walls
    { x: 96, y: 77, type: 'barrel', walkable: false },
    { x: 98, y: 77, type: 'crate', walkable: false },
    { x: 130, y: 77, type: 'barrel', walkable: false },
    { x: 132, y: 77, type: 'crate', walkable: false },
    { x: 108, y: 83, type: 'barrel', walkable: false },
    { x: 110, y: 83, type: 'crate', walkable: false },
    { x: 128, y: 87, type: 'barrel', walkable: false },
    { x: 130, y: 87, type: 'crate', walkable: false },
    { x: 98, y: 93, type: 'barrel_stack', walkable: false },
    { x: 100, y: 93, type: 'crate_stack', walkable: false },
    { x: 134, y: 95, type: 'barrel_stack', walkable: false },
    { x: 136, y: 95, type: 'crate_stack', walkable: false },
    { x: 116, y: 69, type: 'barrel', walkable: false },
    { x: 120, y: 69, type: 'crate', walkable: false },

    // Hay bales near grain store
    { x: 96, y: 86, type: 'hay_bale', walkable: false },
    { x: 104, y: 92, type: 'hay_bale', walkable: false },
    { x: 100, y: 96, type: 'hay_bale', walkable: false },
    { x: 140, y: 96, type: 'hay_bale', walkable: false },

    // Carts along main lane through square
    { x: 114, y: 75, type: 'cart', walkable: false },
    { x: 122, y: 82, type: 'cart', walkable: false },
    { x: 108, y: 96, type: 'cart', walkable: false },
    { x: 130, y: 96, type: 'cart', walkable: false },
    { x: 118, y: 99, type: 'cart', walkable: false },

    // Flower pots flanking building entrances
    { x: 109, y: 68, type: 'pot', walkable: true },
    { x: 127, y: 68, type: 'pot', walkable: true },
    { x: 103, y: 74, type: 'pot', walkable: true },
    { x: 137, y: 74, type: 'pot', walkable: true },
    { x: 114, y: 80, type: 'pot', walkable: true },
    { x: 127, y: 84, type: 'pot', walkable: true },
    { x: 105, y: 90, type: 'pot', walkable: true },
    { x: 141, y: 92, type: 'pot', walkable: true },
    { x: 116, y: 95, type: 'pot', walkable: true },
    { x: 120, y: 95, type: 'pot', walkable: true },

    // Hedges marking west edge of square
    { x: 94, y: 70, type: 'hedge', walkable: false },
    { x: 94, y: 75, type: 'hedge', walkable: false },
    { x: 94, y: 80, type: 'hedge', walkable: false },
    { x: 94, y: 85, type: 'hedge', walkable: false },
    { x: 94, y: 90, type: 'hedge', walkable: false },
    { x: 94, y: 95, type: 'hedge', walkable: false },
    // Hedges marking east edge of square
    { x: 145, y: 70, type: 'hedge', walkable: false },
    { x: 145, y: 75, type: 'hedge', walkable: false },
    { x: 145, y: 80, type: 'hedge', walkable: false },
    { x: 145, y: 85, type: 'hedge', walkable: false },
    { x: 145, y: 90, type: 'hedge', walkable: false },
    { x: 145, y: 95, type: 'hedge', walkable: false },

    // Rocks at path edges inside square
    { x: 96, y: 98, type: 'rock', walkable: false },
    { x: 142, y: 98, type: 'rock', walkable: false },
    { x: 95, y: 68, type: 'rock', walkable: false },
    { x: 143, y: 68, type: 'rock', walkable: false },

    // Stumps (felled trees) for rustic feel
    { x: 136, y: 70, type: 'stump', walkable: false },
    { x: 96, y: 82, type: 'stump', walkable: false },
    { x: 140, y: 86, type: 'stump', walkable: false },

    // Flowers inside square gardens
    { x: 100, y: 70, type: 'flower', walkable: true },
    { x: 104, y: 76, type: 'flower', walkable: true },
    { x: 138, y: 76, type: 'flower', walkable: true },
    { x: 112, y: 88, type: 'flower', walkable: true },
    { x: 126, y: 92, type: 'flower', walkable: true },

    // ====== SPAWN APPROACH (bonfire to square) ======
    // Lanterns flanking the approach road
    { x: 115, y: 104, type: 'lantern', walkable: false },
    { x: 123, y: 104, type: 'lantern', walkable: false },
    { x: 115, y: 110, type: 'lantern', walkable: false },
    { x: 123, y: 110, type: 'lantern', walkable: false },
    // Barrels and crates near approach cottages
    { x: 107, y: 112, type: 'barrel', walkable: false },
    { x: 109, y: 112, type: 'crate', walkable: false },
    { x: 134, y: 110, type: 'barrel', walkable: false },
    { x: 136, y: 110, type: 'crate', walkable: false },
    { x: 100, y: 117, type: 'barrel', walkable: false },
    { x: 102, y: 117, type: 'crate', walkable: false },
    // Benches outside approach cottages
    { x: 108, y: 104, type: 'bench', walkable: false },
    { x: 128, y: 106, type: 'bench', walkable: false },
    { x: 100, y: 110, type: 'bench', walkable: false },
    // Cart on the approach road
    { x: 124, y: 114, type: 'cart', walkable: false },
    // Flower/hedge borders along approach
    { x: 114, y: 108, type: 'hedge', walkable: false },
    { x: 124, y: 108, type: 'hedge', walkable: false },
    { x: 106, y: 106, type: 'pot', walkable: true },
    { x: 135, y: 108, type: 'pot', walkable: true },
    { x: 110, y: 114, type: 'flower', walkable: true },
    { x: 128, y: 114, type: 'flower', walkable: true },
    // Rocks along approach
    { x: 112, y: 106, type: 'rock', walkable: false },
    { x: 126, y: 112, type: 'rock', walkable: false },

    // ====== MARKET DISTRICT ======
    // Hanging signs above shop entrances
    { x: 156, y: 57, type: 'hanging_sign', walkable: false },
    { x: 176, y: 55, type: 'hanging_sign', walkable: false },
    { x: 193, y: 63, type: 'hanging_sign', walkable: false },
    { x: 193, y: 79, type: 'hanging_sign', walkable: false },
    { x: 176, y: 87, type: 'hanging_sign', walkable: false },
    // Awnings at stall positions
    { x: 157, y: 67, type: 'awning', walkable: true },
    { x: 167, y: 67, type: 'awning', walkable: true },
    { x: 159, y: 77, type: 'awning', walkable: true },
    { x: 167, y: 77, type: 'awning', walkable: true },
    { x: 183, y: 77, type: 'awning', walkable: true },
    // Barrel/crate clusters near stalls
    { x: 155, y: 63, type: 'barrel', walkable: false },
    { x: 157, y: 63, type: 'crate', walkable: false },
    { x: 173, y: 60, type: 'barrel', walkable: false },
    { x: 175, y: 62, type: 'crate', walkable: false },
    { x: 165, y: 60, type: 'barrel', walkable: false },
    { x: 167, y: 60, type: 'crate', walkable: false },
    { x: 164, y: 66, type: 'barrel', walkable: false },
    { x: 166, y: 66, type: 'crate', walkable: false },
    { x: 178, y: 66, type: 'barrel', walkable: false },
    { x: 180, y: 66, type: 'crate', walkable: false },
    { x: 155, y: 82, type: 'barrel_stack', walkable: false },
    { x: 157, y: 82, type: 'crate_stack', walkable: false },
    { x: 188, y: 90, type: 'barrel', walkable: false },
    { x: 190, y: 90, type: 'crate', walkable: false },
    { x: 202, y: 90, type: 'barrel_stack', walkable: false },
    { x: 204, y: 90, type: 'crate_stack', walkable: false },
    { x: 192, y: 70, type: 'barrel', walkable: false },
    { x: 194, y: 70, type: 'crate', walkable: false },
    { x: 192, y: 86, type: 'barrel', walkable: false },
    { x: 194, y: 86, type: 'crate', walkable: false },
    // Carts at market road intersections
    { x: 185, y: 66, type: 'cart', walkable: false },
    { x: 150, y: 66, type: 'cart', walkable: false },
    { x: 170, y: 72, type: 'cart', walkable: false },
    { x: 206, y: 74, type: 'cart', walkable: false },
    // Market benches for shoppers
    { x: 184, y: 70, type: 'bench', walkable: false },
    { x: 172, y: 84, type: 'bench', walkable: false },
    { x: 186, y: 86, type: 'bench', walkable: false },
    { x: 204, y: 86, type: 'bench', walkable: false },
    { x: 160, y: 74, type: 'bench', walkable: false },
    // Market planters
    { x: 162, y: 86, type: 'pot', walkable: true },
    { x: 178, y: 86, type: 'pot', walkable: true },
    { x: 171, y: 66, type: 'pot', walkable: true },
    { x: 186, y: 74, type: 'pot', walkable: true },
    { x: 198, y: 80, type: 'pot', walkable: true },
    // Market lanterns
    { x: 188, y: 74, type: 'lantern', walkable: false },
    { x: 186, y: 80, type: 'lantern', walkable: false },
    { x: 204, y: 80, type: 'lantern', walkable: false },
    { x: 160, y: 65, type: 'lantern', walkable: false },
    { x: 175, y: 65, type: 'lantern', walkable: false },
    { x: 198, y: 90, type: 'lantern', walkable: false },

    // ====== RESIDENTIAL DISTRICT ======
    // Per-house domestic clutter: benches, pots, barrels, hedges
    // House 1 area (x:25 y:48)
    { x: 24, y: 54, type: 'bench', walkable: false },
    { x: 33, y: 50, type: 'pot', walkable: true },
    { x: 26, y: 46, type: 'barrel', walkable: false },
    { x: 35, y: 46, type: 'hedge', walkable: false },
    // House 2 area (x:40 y:52)
    { x: 39, y: 58, type: 'bench', walkable: false },
    { x: 48, y: 54, type: 'pot', walkable: true },
    { x: 42, y: 50, type: 'barrel', walkable: false },
    { x: 44, y: 50, type: 'crate', walkable: false },
    // House 3 area (x:28 y:65)
    { x: 27, y: 71, type: 'bench', walkable: false },
    { x: 36, y: 67, type: 'pot', walkable: true },
    { x: 30, y: 63, type: 'hedge', walkable: false },
    { x: 37, y: 63, type: 'barrel', walkable: false },
    // House 4 area (x:50 y:60)
    { x: 49, y: 66, type: 'bench', walkable: false },
    { x: 58, y: 62, type: 'pot', walkable: true },
    { x: 52, y: 58, type: 'barrel', walkable: false },
    { x: 54, y: 58, type: 'crate', walkable: false },
    // House 5 area (x:35 y:78)
    { x: 34, y: 84, type: 'bench', walkable: false },
    { x: 43, y: 80, type: 'pot', walkable: true },
    { x: 37, y: 76, type: 'barrel', walkable: false },
    { x: 44, y: 78, type: 'hedge', walkable: false },
    // House 6 area (x:55 y:72)
    { x: 54, y: 78, type: 'bench', walkable: false },
    { x: 63, y: 74, type: 'pot', walkable: true },
    { x: 57, y: 70, type: 'crate', walkable: false },
    { x: 64, y: 72, type: 'hedge', walkable: false },
    // House 7 area (x:68 y:50)
    { x: 67, y: 56, type: 'bench', walkable: false },
    { x: 76, y: 52, type: 'pot', walkable: true },
    { x: 70, y: 48, type: 'barrel', walkable: false },
    { x: 77, y: 50, type: 'hedge', walkable: false },
    // House 8 area (x:22 y:88)
    { x: 21, y: 94, type: 'bench', walkable: false },
    { x: 30, y: 90, type: 'pot', walkable: true },
    { x: 24, y: 86, type: 'barrel', walkable: false },
    { x: 26, y: 86, type: 'crate', walkable: false },
    // House 9 area (x:48 y:88)
    { x: 47, y: 94, type: 'bench', walkable: false },
    { x: 56, y: 90, type: 'pot', walkable: true },
    { x: 50, y: 86, type: 'barrel', walkable: false },
    { x: 57, y: 88, type: 'hedge', walkable: false },
    // House 10 area (x:72 y:65)
    { x: 71, y: 71, type: 'bench', walkable: false },
    { x: 80, y: 67, type: 'pot', walkable: true },
    { x: 74, y: 63, type: 'barrel', walkable: false },
    { x: 81, y: 65, type: 'hedge', walkable: false },
    // Residential flower patches
    { x: 30, y: 62, type: 'flower', walkable: true },
    { x: 46, y: 56, type: 'flower', walkable: true },
    { x: 62, y: 66, type: 'flower', walkable: true },
    { x: 38, y: 82, type: 'flower', walkable: true },
    { x: 55, y: 86, type: 'flower', walkable: true },

    // ====== CEMETERY ======
    { x: 12, y: 18, type: 'dead_tree', walkable: false },
    { x: 34, y: 20, type: 'dead_tree', walkable: false },
    { x: 18, y: 35, type: 'dead_tree', walkable: false },
    { x: 16, y: 25, type: 'statue', walkable: false },
    { x: 30, y: 30, type: 'tombstone', walkable: false },
    { x: 20, y: 32, type: 'tombstone', walkable: false },
    { x: 26, y: 22, type: 'tombstone', walkable: false },
    { x: 22, y: 28, type: 'tombstone', walkable: false },
    { x: 14, y: 30, type: 'bones', walkable: true },
    { x: 32, y: 34, type: 'bones', walkable: true },
    { x: 11, y: 36, type: 'lantern', walkable: false },
    { x: 36, y: 16, type: 'lantern', walkable: false },
    { x: 12, y: 38, type: 'bench', walkable: false },

    // ====== CHURCH ======
    // Outdoor benches (pew rows) in church clearing
    { x: 44, y: 42, type: 'bench', walkable: false },
    { x: 50, y: 42, type: 'bench', walkable: false },
    { x: 56, y: 42, type: 'bench', walkable: false },
    { x: 44, y: 44, type: 'bench', walkable: false },
    { x: 50, y: 44, type: 'bench', walkable: false },
    { x: 56, y: 44, type: 'bench', walkable: false },
    // Church decoration
    { x: 51, y: 30, type: 'statue', walkable: false },
    { x: 44, y: 30, type: 'lantern', walkable: false },
    { x: 56, y: 30, type: 'lantern', walkable: false },
    { x: 46, y: 46, type: 'tombstone', walkable: false },
    { x: 54, y: 46, type: 'tombstone', walkable: false },
    { x: 48, y: 46, type: 'tombstone', walkable: false },
    { x: 60, y: 46, type: 'lantern', walkable: false },
    { x: 42, y: 46, type: 'lantern', walkable: false },
    { x: 45, y: 48, type: 'pot', walkable: true },
    { x: 57, y: 48, type: 'pot', walkable: true },

    // ====== TRAINING GROUNDS ======
    { x: 172, y: 22, type: 'weapon_rack', walkable: false },
    { x: 178, y: 22, type: 'weapon_rack', walkable: false },
    { x: 190, y: 22, type: 'weapon_rack', walkable: false },
    { x: 174, y: 26, type: 'stump', walkable: false },
    { x: 180, y: 28, type: 'stump', walkable: false },
    { x: 186, y: 26, type: 'stump', walkable: false },
    { x: 175, y: 32, type: 'stump', walkable: false },
    { x: 188, y: 32, type: 'scarecrow', walkable: false },
    { x: 172, y: 34, type: 'barrel', walkable: false },
    { x: 174, y: 34, type: 'crate', walkable: false },
    { x: 190, y: 34, type: 'barrel', walkable: false },
    { x: 192, y: 34, type: 'crate', walkable: false },
    { x: 182, y: 34, type: 'bench', walkable: false },
    { x: 170, y: 28, type: 'lantern', walkable: false },
    { x: 192, y: 28, type: 'lantern', walkable: false },
    { x: 181, y: 20, type: 'lantern', walkable: false },

    // ====== FARM DISTRICT ======
    // West farm cluster
    { x: 18, y: 108, type: 'cart', walkable: false },
    { x: 48, y: 105, type: 'barrel', walkable: false },
    { x: 50, y: 105, type: 'crate', walkable: false },
    { x: 22, y: 123, type: 'hay_bale', walkable: false },
    { x: 28, y: 120, type: 'hay_bale', walkable: false },
    { x: 44, y: 122, type: 'hay_bale', walkable: false },
    { x: 25, y: 103, type: 'scarecrow', walkable: false },
    { x: 46, y: 108, type: 'stump', walkable: false },
    // Central farm
    { x: 58, y: 112, type: 'barrel', walkable: false },
    { x: 60, y: 112, type: 'crate', walkable: false },
    { x: 66, y: 116, type: 'hay_bale', walkable: false },
    { x: 70, y: 118, type: 'hay_bale', walkable: false },
    { x: 75, y: 114, type: 'hay_bale', walkable: false },
    { x: 55, y: 126, type: 'scarecrow', walkable: false },
    { x: 79, y: 116, type: 'stump', walkable: false },
    { x: 62, y: 108, type: 'cart', walkable: false },
    // East farm
    { x: 135, y: 118, type: 'scarecrow', walkable: false },
    { x: 142, y: 123, type: 'hay_bale', walkable: false },
    { x: 147, y: 121, type: 'hay_bale', walkable: false },
    { x: 128, y: 118, type: 'barrel', walkable: false },
    { x: 130, y: 118, type: 'crate', walkable: false },
    { x: 152, y: 118, type: 'cart', walkable: false },
    { x: 155, y: 120, type: 'hay_bale', walkable: false },
    { x: 132, y: 130, type: 'hay_bale', walkable: false },
    { x: 138, y: 113, type: 'stump', walkable: false },
    { x: 156, y: 128, type: 'hay_bale', walkable: false },
    // Farm threshing area props
    { x: 84, y: 113, type: 'barrel', walkable: false },
    { x: 86, y: 113, type: 'crate', walkable: false },
    { x: 84, y: 115, type: 'hay_bale', walkable: false },
    { x: 111, y: 119, type: 'barrel', walkable: false },
    { x: 113, y: 119, type: 'crate', walkable: false },
    // South cottage area
    { x: 88, y: 118, type: 'barrel', walkable: false },
    { x: 92, y: 118, type: 'crate', walkable: false },
    { x: 95, y: 117, type: 'pot', walkable: true },
    { x: 90, y: 122, type: 'bench', walkable: false },
    // Farm path roadside
    { x: 50, y: 100, type: 'rock', walkable: false },
    { x: 100, y: 100, type: 'rock', walkable: false },
    { x: 75, y: 99, type: 'lantern', walkable: false },
    { x: 120, y: 99, type: 'lantern', walkable: false },

    // ====== LAKE AREA ======
    { x: 165, y: 111, type: 'bench', walkable: false },
    { x: 168, y: 115, type: 'bench', walkable: false },
    { x: 198, y: 112, type: 'bench', walkable: false },
    { x: 195, y: 118, type: 'bench', walkable: false },
    { x: 166, y: 118, type: 'rock', walkable: false },
    { x: 170, y: 128, type: 'rock', walkable: false },
    { x: 198, y: 126, type: 'rock', walkable: false },
    { x: 200, y: 120, type: 'rock', walkable: false },
    { x: 164, y: 112, type: 'lantern', walkable: false },
    { x: 200, y: 110, type: 'lantern', walkable: false },
    { x: 188, y: 108, type: 'lantern', walkable: false },
    { x: 168, y: 122, type: 'stump', walkable: false },
    { x: 202, y: 125, type: 'stump', walkable: false },
    { x: 186, y: 130, type: 'rock', walkable: false },

    // ====== HEDGE MAZE APPROACH ======
    { x: 198, y: 30, type: 'bench', walkable: false },
    { x: 198, y: 40, type: 'bench', walkable: false },
    { x: 199, y: 28, type: 'lantern', walkable: false },
    { x: 199, y: 50, type: 'lantern', walkable: false },
    { x: 196, y: 34, type: 'hedge', walkable: false },
    { x: 196, y: 38, type: 'hedge', walkable: false },
    { x: 196, y: 42, type: 'hedge', walkable: false },
    { x: 196, y: 46, type: 'hedge', walkable: false },

    // ====== FOREST GROVES edge blending ======
    // SW grove edges
    { x: 4, y: 106, type: 'stump', walkable: false },
    { x: 18, y: 96, type: 'stump', walkable: false },
    { x: 8, y: 100, type: 'rock', walkable: false },
    { x: 14, y: 104, type: 'mushroom', walkable: true },
    { x: 20, y: 92, type: 'flower', walkable: true },
    // SE grove edges
    { x: 208, y: 130, type: 'stump', walkable: false },
    { x: 230, y: 118, type: 'stump', walkable: false },
    { x: 212, y: 128, type: 'rock', walkable: false },
    { x: 225, y: 114, type: 'mushroom', walkable: true },
    { x: 220, y: 108, type: 'flower', walkable: true },
    // N grove edges
    { x: 84, y: 26, type: 'stump', walkable: false },
    { x: 104, y: 14, type: 'stump', walkable: false },
    { x: 86, y: 24, type: 'rock', walkable: false },
    { x: 100, y: 18, type: 'mushroom', walkable: true },
    { x: 95, y: 22, type: 'flower', walkable: true },

    // ====== WATERFALL AREA ======
    { x: 66, y: 18, type: 'rock', walkable: false },
    { x: 80, y: 8, type: 'rock', walkable: false },
    { x: 72, y: 20, type: 'bench', walkable: false },
    { x: 74, y: 6, type: 'flower', walkable: true },

    // ====== ROAD INTERSECTIONS ======
    // Main crossroads (N-S meets E-W)
    { x: 112, y: 71, type: 'lantern', walkable: false },
    { x: 123, y: 71, type: 'lantern', walkable: false },
    { x: 112, y: 76, type: 'pot', walkable: true },
    { x: 123, y: 76, type: 'pot', walkable: true },
    // Spawn area bonfire vicinity
    { x: 112, y: 100, type: 'bench', walkable: false },
    { x: 126, y: 100, type: 'bench', walkable: false },
    { x: 112, y: 106, type: 'pot', walkable: true },
    { x: 126, y: 106, type: 'pot', walkable: true },

    // ====== ELDER'S GARDEN area ======
    { x: 103, y: 42, type: 'lantern', walkable: false },
    { x: 119, y: 42, type: 'lantern', walkable: false },
    { x: 105, y: 53, type: 'bench', walkable: false },
    { x: 117, y: 53, type: 'bench', walkable: false },
    { x: 111, y: 40, type: 'statue', walkable: false },
    { x: 107, y: 46, type: 'pot', walkable: true },
    { x: 115, y: 46, type: 'pot', walkable: true },

    // ====== SOUTH PARK garden area ======
    { x: 81, y: 97, type: 'bench', walkable: false },
    { x: 93, y: 97, type: 'bench', walkable: false },
    { x: 85, y: 94, type: 'pot', walkable: true },
    { x: 90, y: 94, type: 'pot', walkable: true },
    { x: 84, y: 103, type: 'lantern', walkable: false },
    // East park
    { x: 199, y: 97, type: 'bench', walkable: false },
    { x: 212, y: 97, type: 'bench', walkable: false },
    { x: 204, y: 94, type: 'pot', walkable: true },
    { x: 208, y: 94, type: 'pot', walkable: true },
    { x: 200, y: 105, type: 'lantern', walkable: false },

    // ====== SCATTERED ENVIRONMENTAL DETAIL ======
    // Broken wagon decorations
    { x: 50, y: 28, type: 'rock', walkable: false },
    { x: 52, y: 26, type: 'bones', walkable: true },
    { x: 120, y: 120, type: 'rock', walkable: false },
    // Rocks along elevation cliff edges
    { x: 6, y: 48, type: 'rock', walkable: false },
    { x: 30, y: 46, type: 'rock', walkable: false },
    { x: 60, y: 48, type: 'rock', walkable: false },
    { x: 150, y: 48, type: 'rock', walkable: false },
    { x: 180, y: 48, type: 'rock', walkable: false },
    { x: 220, y: 48, type: 'rock', walkable: false },
    // Flower patches in sunny meadow spaces
    { x: 85, y: 65, type: 'flower', walkable: true },
    { x: 88, y: 75, type: 'flower', walkable: true },
    { x: 140, y: 55, type: 'flower', walkable: true },
    { x: 150, y: 95, type: 'flower', walkable: true },
    { x: 100, y: 110, type: 'flower', walkable: true },
    { x: 160, y: 140, type: 'flower', walkable: true },
    // Cottage lake area
    { x: 193, y: 105, type: 'pot', walkable: true },
    { x: 197, y: 98, type: 'bench', walkable: false },
    { x: 200, y: 102, type: 'barrel', walkable: false },
    // Cottage west area
    { x: 20, y: 100, type: 'pot', walkable: true },
    { x: 28, y: 97, type: 'bench', walkable: false },
    // Cottage south area
    { x: 94, y: 120, type: 'pot', walkable: true },
    { x: 86, y: 122, type: 'flower', walkable: true },

    // ====== NORTH CORRIDOR: ZONE A â€” VILLAGE GATE ======
    // Iron fence line west of road gap
    { x: 108, y: 55, type: 'iron_fence', walkable: false },
    { x: 109, y: 55, type: 'iron_fence', walkable: false },
    { x: 110, y: 55, type: 'iron_fence', walkable: false },
    { x: 111, y: 55, type: 'iron_fence', walkable: false },
    { x: 112, y: 55, type: 'iron_fence', walkable: false },
    { x: 113, y: 55, type: 'iron_fence', walkable: false },
    // Pillars flanking the road gap
    { x: 114, y: 55, type: 'pillar', walkable: false },
    { x: 123, y: 55, type: 'pillar', walkable: false },
    // Iron fence line east of road gap
    { x: 124, y: 55, type: 'iron_fence', walkable: false },
    { x: 125, y: 55, type: 'iron_fence', walkable: false },
    { x: 126, y: 55, type: 'iron_fence', walkable: false },
    { x: 127, y: 55, type: 'iron_fence', walkable: false },
    { x: 128, y: 55, type: 'iron_fence', walkable: false },
    { x: 129, y: 55, type: 'iron_fence', walkable: false },
    // Gate area village props
    { x: 110, y: 53, type: 'bench', walkable: false },
    { x: 126, y: 53, type: 'bench', walkable: false },
    { x: 108, y: 57, type: 'barrel', walkable: false },
    { x: 129, y: 57, type: 'barrel', walkable: false },
    { x: 110, y: 57, type: 'cart', walkable: false },
    { x: 127, y: 57, type: 'pot', walkable: true },
    { x: 108, y: 53, type: 'lantern', walkable: false },
    { x: 129, y: 53, type: 'lantern', walkable: false },

    // ====== NORTH CORRIDOR: ZONE B â€” THE THRESHOLD ======
    // Abandoned guard post debris
    { x: 123, y: 34, type: 'barrel', walkable: false },
    { x: 130, y: 30, type: 'barrel', walkable: false },
    { x: 130, y: 32, type: 'crate', walkable: false },
    { x: 124, y: 35, type: 'bones', walkable: true },
    { x: 128, y: 34, type: 'bloodstain', walkable: true },
    // Wild encroachment â€” stumps, dead trees, mushrooms, hedges
    { x: 110, y: 30, type: 'stump', walkable: false },
    { x: 108, y: 34, type: 'dead_tree', walkable: false },
    { x: 130, y: 40, type: 'stump', walkable: false },
    { x: 128, y: 26, type: 'dead_tree', walkable: false },
    { x: 107, y: 32, type: 'mushroom', walkable: true },
    { x: 132, y: 38, type: 'mushroom', walkable: true },
    { x: 112, y: 40, type: 'rock', walkable: false },
    { x: 126, y: 42, type: 'rock', walkable: false },
    { x: 110, y: 38, type: 'hedge', walkable: false },
    { x: 126, y: 36, type: 'hedge', walkable: false },
    { x: 108, y: 42, type: 'hedge', walkable: false },

    // ====== NORTH CORRIDOR: ZONE C â€” FOREST EDGE ======
    // Portal clearing stone arch markers
    { x: 112, y: 5, type: 'pillar', walkable: false },
    { x: 127, y: 5, type: 'pillar', walkable: false },
    { x: 114, y: 3, type: 'mossy_stone', walkable: false },
    { x: 125, y: 3, type: 'mossy_stone', walkable: false },
    // Forest encroachment narrowing the path
    { x: 113, y: 18, type: 'dead_tree', walkable: false },
    { x: 125, y: 16, type: 'dead_tree', walkable: false },
    { x: 112, y: 14, type: 'stump', walkable: false },
    { x: 127, y: 20, type: 'stump', walkable: false },
    { x: 114, y: 20, type: 'mushroom', walkable: true },
    { x: 124, y: 18, type: 'mushroom', walkable: true },
    { x: 113, y: 10, type: 'rock', walkable: false },
    { x: 126, y: 12, type: 'rock', walkable: false },
    // Last lantern before the woods
    { x: 118, y: 10, type: 'lantern', walkable: false },
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
    // North zones start at y=2 so rows y=2â€“3 match portal/approach rows (y=4 portal). Otherwise el0â†’el1
    // at y=3|4 leaves a horizontal seam â€” stampCliffs only handles â€œnorth tile higher than southâ€.
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

    // Center peak (el2 â†’ el1): south_face=27, on the main N-S cobble
    { x: 114, y: 27, width: 8, height: 4, elevation: 2 },
    // North ridge (el1 â†’ el0): south_face=45, main N-S cobble
    { x: 114, y: 45, width: 8, height: 4, elevation: 1 },
    // NE citadel (el2 â†’ el1): south_face=29
    { x: 188, y: 29, width: 6, height: 4, elevation: 2 },
    // NE to town (el1 â†’ el0): south_face=45
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
  /** Full ocean + cliff rim on north, east, and west like the default south coast (Greenleaf-style). */
  coastalBorderAllSides: true,
  features: [
    // === FOREST CLEARINGS ===
    { x: 60, y: 60, width: 30, height: 24, type: 'clearing', fill: 'grass' },
    { x: 200, y: 100, width: 24, height: 20, type: 'clearing', fill: 'grass' },
    { x: 80, y: 220, width: 20, height: 16, type: 'clearing', fill: 'grass' },
    { x: 220, y: 220, width: 24, height: 20, type: 'clearing', fill: 'grass' },
    { x: 40, y: 140, width: 20, height: 16, type: 'clearing', fill: 'grass' },
    { x: 48, y: 146, width: 20, height: 20, type: 'clearing', fill: 'dirt' },
    { x: 250, y: 50, width: 20, height: 16, type: 'clearing', fill: 'grass' },
    { x: 150, y: 50, width: 30, height: 20, type: 'clearing', fill: 'grass' },
    { x: 138, y: 246, width: 24, height: 18, type: 'clearing', fill: 'dirt' },
    // Ends at y=171 so the ranger cabin approach (172+) can stay grass until the y=175 artery.
    { x: 126, y: 156, width: 48, height: 16, type: 'clearing', fill: 'dirt' },
    { x: 116, y: 192, width: 48, height: 24, type: 'clearing', fill: 'dirt' },
    { x: 126, y: 180, width: 26, height: 14, type: 'clearing', fill: 'dirt' },

    // === RANGER OUTPOST ===
    { x: 136, y: 164, width: 10, height: 8, type: 'inn_building', interactionId: 'ranger_cabin', interiorMap: 'interior_ranger_cabin', interiorSpawnX: 7, interiorSpawnY: 5 },
    // South of cabin: sit below the y=178 eastâ€“west artery so the approach stays mostly grass.
    { x: 156, y: 180, width: 12, height: 10, type: 'camp', interactionId: 'ranger_camp' },

    // === BANDIT CAMP (north-east) ===
    { x: 210, y: 40, width: 20, height: 16, type: 'camp', interactionId: 'forest_bandit_camp' },
    { x: 216, y: 30, width: 8, height: 6, type: 'building', interactionId: 'bandit_hut' },

    // === HIDDEN GROVE (west) ===
    { x: 15, y: 120, width: 36, height: 28, type: 'clearing', fill: 'grass' },
    { x: 25, y: 128, width: 16, height: 12, type: 'garden' },

    // === SPIDER NEST (dark area, south-west) ===
    { x: 20, y: 240, width: 30, height: 25, type: 'clearing', fill: 'dirt' },
    { x: 25, y: 245, width: 20, height: 15, type: 'camp', interactionId: 'spider_nest' },

    // === HOLLOW APPROACH RIVER â€” single smooth flowing river replacing the old flat barrier + lake ===
    // Flows west-to-east with a natural southward meander through the old lake zone.
    // The NW seal (28,64,64Ã—16) terminates at y=79; this river picks up seamlessly at y=80.
    // Water tiles are placed first; the decayed bridge overwrites the crossing span.
    // At x=118â€“130 the water spans y=81â€“95; bridge matches exactly so y=80 is walkable
    // ground on the hollow side and y=96 (cliff gap) is walkable on the approach side.

    // NW seal: blocks the y=74 crosspath west of x=92 from dropping south without the correct approach.
    { x: 28, y: 64, width: 64, height: 16, type: 'wall', fill: 'water' },
    // West run: straight channel east from map edge, connecting off the NW seal
    { x: 4, y: 80, width: 104, height: 7, type: 'wall', fill: 'water' },
    // Curve 1 â€” river bends gently southward entering the meander
    { x: 104, y: 80, width: 12, height: 11, type: 'wall', fill: 'water' },
    // Meander belly â€” river pools south through the old lake zone (ends y=95, not y=96)
    { x: 110, y: 84, width: 14, height: 12, type: 'wall', fill: 'water' },
    // Crossing zone â€” river widens under the bridge (y=81â€“95, exactly matching bridge height)
    { x: 116, y: 81, width: 18, height: 15, type: 'wall', fill: 'water' },
    // Curve 2 â€” river swings back north-east after the crossing
    { x: 130, y: 80, width: 10, height: 11, type: 'wall', fill: 'water' },
    // East exit â€” runs flush into the far hollow river (x=189â†’190) so there is no land isthmus
    // or extra bridge on the east; the only crossing is the decayed bridge at x=118â€“130.
    { x: 134, y: 78, width: 56, height: 8, type: 'wall', fill: 'water' },
    // Far hollow river sections (east of the meander)
    { x: 190, y: 79, width: 50, height: 6, type: 'wall', fill: 'water' },
    { x: 250, y: 78, width: 50, height: 6, type: 'wall', fill: 'water' },
    // Decayed bridge spanning the hollow entrance (x=118â€“129, y=81â€“95). Gradient + speckle blend
    // (bridge_decay_blend) replaces hard rectangle boundaries â€” south stays mostly intact wood,
    // north goes hollow-tainted, with mixed tiles in between. Water gap x=123â€“124 on north rows.
    { x: 118, y: 81, width: 12, height: 15, type: 'bridge_decay_blend' },
    // Corrupted-water pass now targets the deeper hollow lake near world position (4, -112) via
    // applyWhisperingWoodsHollowApproachCorruptedWater (mapGenerator), leaving this bridge run normal.

    // === THE HOLLOW â€” Dark clearings and corrupted terrain (y < 75) ===
    { x: 40, y: 30, width: 30, height: 30, type: 'clearing', fill: 'dark_grass' },
    { x: 80, y: 40, width: 25, height: 25, type: 'clearing', fill: 'dark_grass' },
    { x: 110, y: 50, width: 30, height: 22, type: 'clearing', fill: 'dark_grass' },
    { x: 145, y: 35, width: 30, height: 30, type: 'clearing', fill: 'dark_grass' },
    { x: 180, y: 45, width: 25, height: 25, type: 'clearing', fill: 'dark_grass' },
    { x: 60, y: 55, width: 20, height: 20, type: 'clearing', fill: 'dark_grass' },
    { x: 200, y: 30, width: 24, height: 20, type: 'clearing', fill: 'dark_grass' },
    // Mossy stone patches â€” corruption seeping through
    { x: 85, y: 35, width: 8, height: 6, type: 'clearing', fill: 'mossy_stone' },
    { x: 155, y: 50, width: 6, height: 4, type: 'clearing', fill: 'mossy_stone' },
    { x: 120, y: 25, width: 8, height: 6, type: 'clearing', fill: 'mossy_stone' },
    // Paths through the Hollow (mossy stone trails)
    { x: 120, y: 72, width: 8, height: 8, type: 'path', fill: 'dirt' },
    { x: 122, y: 55, width: 6, height: 18, type: 'path', fill: 'dirt' },
    { x: 118, y: 40, width: 8, height: 16, type: 'path', fill: 'dirt' },
    { x: 120, y: 28, width: 6, height: 14, type: 'path', fill: 'dirt' },
    // Path continues to the fog gate at y=18 so the terminus is readable on-screen.
    { x: 120, y: 18, width: 6, height: 11, type: 'path', fill: 'dirt' },

    // === THE HOLLOW â€” Fog Gate terminus (y=18) ===
    // Ceremonial cleared apron behind the gate so it reads as the hard end of the path,
    // not a random tree line in the forest.
    { x: 100, y: 2, width: 48, height: 34, type: 'clearing', fill: 'dirt' },
    // Everything north of y=18 is sealed. The fog gate (5 tiles, x=120-124) is placed at
    // runtime by syncHollowFogGateState and clears to hollow_blight after the boss is defeated.
    // Cliff block directly behind the gate so there is no visible grass/tree space beyond it.
    { x: 100, y: 2, width: 48, height: 16, type: 'cliff_face' },
    // Gate shoulders only around the terminus so the gate is visible and cannot be flanked.
    { x: 100, y: 18, width: 20, height: 10, type: 'cliff_face' },
    { x: 125, y: 18, width: 23, height: 10, type: 'cliff_face' },

    // === THE HOLLOW â€” Corridor walls funneling player from bonfire to fog gate ===
    // Lower corridor returns to dead-tree walls deeper in the Hollow.
    { x: 100, y: 28, width: 16, height: 44, type: 'wall', fill: 'dead_tree' },
    { x: 130, y: 28, width: 18, height: 44, type: 'wall', fill: 'dead_tree' },

    // === THE HOLLOW â€” Hunter trail camps ===
    { x: 130, y: 45, width: 8, height: 6, type: 'abandoned_camp', interactionId: 'hollow_hunter_camp_2' },
    { x: 118, y: 28, width: 10, height: 8, type: 'abandoned_camp' },

    // === HOLLOW APPROACH BARRIER â€” cliff_face forms the south river bank ===
    // Flanking prevention: players can only enter the Hollow via the decayed bridge at x=118â€“130.
    // The river (y=81â€“95) sits in the cliff channel; these cliff walls form the south bank at y=96.
    // West segment: map edge to x=118 (just west of bridge).
    { x: 4, y: 96, width: 114, height: 8, type: 'cliff_face' },
    // East segment: x=130 to map edge (just east of bridge).
    { x: 130, y: 96, width: 162, height: 8, type: 'cliff_face' },
    // East river bank seal â€” vertical cliff connecting the far hollow river's south edge (y=85)
    // to the east cliff barrier (y=96). Blocks eastern circumnavigation so the bridge is the
    // only way into the Hollow.
    { x: 204, y: 85, width: 4, height: 12, type: 'cliff_face' },
    // === FOREST LAKES ===
    { x: 240, y: 180, width: 20, height: 16, type: 'lake' },
    { x: 40, y: 200, width: 16, height: 12, type: 'lake' },
    { x: 180, y: 250, width: 22, height: 16, type: 'lake' },

    // === BRIDGES ===
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
    { x: 156, y: 182, width: 4, height: 1, type: 'market_stall_row' },
    { x: 160, y: 184, width: 4, height: 1, type: 'market_stall_row' },
    { x: 150, y: 214, width: 5, height: 4, type: 'broken_wagon' },
    { x: 118, y: 179, width: 5, height: 4, type: 'broken_wagon' },

    // === WATERFALL (north) â€” large summit cascade; clearing placed first, fall overwrites the chasm
    { x: 126, y: 36, width: 48, height: 16, type: 'clearing', fill: 'grass' },
    { x: 140, y: 4, width: 30, height: 36, type: 'waterfall' },

    // === TEMPLE (east) â€” removed; the cliff_face at (238,118,30,56) buries the structure.
    // Ruins props and relocated interactables fill the accessible corridor (x=268-274).

    // === VOLCANO (far north-east) ===
    { x: 260, y: 20, width: 28, height: 24, type: 'volcano' },

    // === FIELD BOSS ARENA â€” stone golem guards the south approach to the fort ===
    { x: 210, y: 175, width: 20, height: 18, type: 'boss_arena', interactionId: 'golem_boss' },

    // === ENCHANTED GROVES with plant monsters ===
    { x: 70, y: 140, width: 30, height: 26, type: 'enchanted_grove' },
    { x: 240, y: 240, width: 24, height: 22, type: 'enchanted_grove' },
    { x: 50, y: 260, width: 26, height: 22, type: 'enchanted_grove' },

    // === FORTS (strategic positions) ===
    // Forest fort relocated to the river's east terminus â€” spans the crossing so the key
    // gate is south-facing (player approach) and north exit leads to the post-river corridor.
    // Stone golems guard the approach; the vine-monster grove is the key-free western alternate.
    { x: 222, y: 153, width: 16, height: 20, type: 'fort', interactionId: 'forest_fort' },
    { x: 200, y: 60, width: 18, height: 16, type: 'fort', interactionId: 'north_fort' },
    { x: 60, y: 190, width: 20, height: 16, type: 'fort', interactionId: 'south_fort' },

    // === RUINED FORTS (collapsed, overrun) ===
    { x: 110, y: 30, width: 18, height: 16, type: 'ruined_fort', interactionId: 'ruined_north_fort' },
    { x: 260, y: 170, width: 16, height: 14, type: 'ruined_fort', interactionId: 'ruined_east_fort' },
    { x: 30, y: 170, width: 16, height: 14, type: 'ruined_fort', interactionId: 'ruined_west_fort' },

    // === FOREST CHURCHES (ancient, overgrown) ===
    { x: 180, y: 130, width: 12, height: 16, type: 'church', interactionId: 'forest_church' },
    // Old chapel south of the cliff at y=114. Players get the fort key here then travel east
    // along the south bank to the new fort at the river's east terminus.
    { x: 40, y: 150, width: 10, height: 14, type: 'church', interactionId: 'old_chapel' },

    // === SCATTERED COTTAGES (hermits, woodcutters) ===
    // Moved north of the cliff_face (y=186+) so frontY=176 is reachable from the y=178 artery.
    // Ruined shell (matches forest_hermit treatment) â€” was an enterable woodcutter hut; chest moved outside.
    { x: 90, y: 170, width: 6, height: 6, type: 'cottage', interactionId: 'woodcutter_cottage_ruin' },
    { x: 230, y: 130, width: 6, height: 6, type: 'cottage' },
    // Flat grass shelf west of cliff-1 â€” cleared before the cliff stamps so trees don't seal the bypass trail.
    // Cliff-1 (x=60+) overwrites the overlap zone; only x=44-59 survives as walkable grass.
    { x: 44, y: 180, width: 35, height: 33, type: 'clearing', fill: 'grass' },

    // Hunter shack is teased from below, then reached by wrapping around a cliff-backed approach.
    { x: 60, y: 186, width: 62, height: 26, type: 'cliff_face' },
    { x: 134, y: 182, width: 6, height: 6, type: 'cottage', interactionId: 'hunter_cottage', interiorMap: 'interior_hunter_cottage', interiorSpawnX: 6, interiorSpawnY: 8 },
    { x: 108, y: 196, width: 28, height: 14, type: 'ruined_fort', interactionId: 'hunter_gate_ruin' },
    { x: 136, y: 192, width: 72, height: 18, type: 'cliff_face' },
    // Collapsed cottage north of the iron fence â€” facade is cottage_house_forest_ruined, yard is
    // overgrown (isAbandonedForestShack path). Yard-clear may touch iron_fence tiles but the wall
    // feature re-stamps them later in the array. World (2, 43).
    { x: 149, y: 188, width: 6, height: 6, type: 'cottage', interactionId: 'woodcutter_cottage_ruin' },
    { x: 118, y: 220, width: 18, height: 12, type: 'abandoned_camp', interactionId: 'hunters_last_camp' },
    { x: 152, y: 220, width: 18, height: 12, type: 'destroyed_town', interactionId: 'hunter_wreck' },
    { x: 170, y: 90, width: 6, height: 6, type: 'cottage', interactionId: 'forest_cottage', interiorMap: 'interior_cottage_forest', interiorSpawnX: 6, interiorSpawnY: 8 },
    { x: 80, y: 50, width: 6, height: 6, type: 'cottage', interactionId: 'ruin_cottage' },
    { x: 210, y: 200, width: 6, height: 6, type: 'cottage', interactionId: 'hidden_cottage' },

    // === WATCHTOWERS ===
    { x: 100, y: 70, width: 6, height: 6, type: 'watchtower' },
    { x: 230, y: 90, width: 6, height: 6, type: 'watchtower' },

    // === ABANDONED CAMPS scattered ===
    { x: 100, y: 200, width: 16, height: 12, type: 'abandoned_camp' },
    { x: 50, y: 80, width: 12, height: 10, type: 'abandoned_camp', interactionId: 'hunters_camp' },
    { x: 270, y: 200, width: 14, height: 10, type: 'abandoned_camp', interactionId: 'hermit_camp' },

    // === CEMETERY (deep in forest) ===
    { x: 120, y: 240, width: 22, height: 16, type: 'cemetery' },

    // === ADDITIONAL DESTROYED VILLAGE ===
    { x: 180, y: 200, width: 24, height: 18, type: 'destroyed_town' },

    // === SOUTH QUADRANT POIs (below y:250 â€” fills the empty stretch before the village portal) ===
    { x: 200, y: 260, width: 16, height: 12, type: 'abandoned_camp', interactionId: 'southern_outpost' },
    // Abandoned shack prop only (ruined facade + overgrowth); no interior â€” see placeCottage forest_hermit branch.
    { x: 60, y: 270, width: 6, height: 6, type: 'cottage', interactionId: 'forest_hermit' },
    { x: 250, y: 270, width: 10, height: 14, type: 'church', interactionId: 'overgrown_shrine' },
    { x: 176, y: 176, width: 18, height: 14, type: 'clearing', fill: 'grass' },
    { x: 104, y: 180, width: 14, height: 12, type: 'clearing', fill: 'dirt' },

    // === RUINED WAYSTATION â€” collapsed ranger rest stop on the golem approach ===
    { x: 190, y: 167, width: 18, height: 8, type: 'clearing', fill: 'dirt' },
    { x: 191, y: 168, width: 5, height: 4, type: 'cottage' },
    { x: 201, y: 167, width: 5, height: 4, type: 'cottage' },
    { x: 196, y: 174, width: 5, height: 4, type: 'broken_wagon' },

    // === MAIN TRAILS: basin to ridge, then branching into shelves ===
    { x: 146, y: 258, width: 8, height: 38, type: 'path', fill: 'dirt' },
    { x: 132, y: 184, width: 42, height: 10, type: 'path', fill: 'dirt' },
    { x: 146, y: 82, width: 8, height: 102, type: 'path', fill: 'dirt' },
    { x: 92, y: 74, width: 106, height: 6, type: 'path', fill: 'dirt' },
    { x: 74, y: 178, width: 72, height: 6, type: 'path', fill: 'dirt' },
    // Stops at y=161 so dirt does not sit on the grove south_face (y=163); path+dirt blocks stampCliffs.
    { x: 54, y: 152, width: 6, height: 10, type: 'path', fill: 'dirt' },
    { x: 154, y: 178, width: 80, height: 6, type: 'path', fill: 'dirt' },
    // Narrow vs x=233 so path does not cover witch cottage door (233,133).
    { x: 228, y: 122, width: 5, height: 46, type: 'path', fill: 'dirt' },
    { x: 234, y: 148, width: 22, height: 4, type: 'path', fill: 'dirt' },
    { x: 260, y: 48, width: 6, height: 20, type: 'path', fill: 'dirt' },
    { x: 118, y: 204, width: 38, height: 6, type: 'path', fill: 'dirt' },
    { x: 150, y: 192, width: 6, height: 14, type: 'path', fill: 'dirt' },
    // Iron fence sealing the early-game cliff corridor. Placed AFTER the dirt path so it
    // overwrites the path tiles. fence/iron_fence is immune to placePath, stampCliffs, and
    // cleanupIllogicalPlacements, so it survives the full generator pipeline.
    { x: 145, y: 195, width: 16, height: 3, type: 'wall', fill: 'iron_fence' },
    { x: 138, y: 188, width: 18, height: 4, type: 'path', fill: 'dirt' },
    // Shortcut connector between the Disparaged Cottage approach and the ranger plateau.
    { x: 124, y: 202, width: 6, height: 12, type: 'path', fill: 'dirt' },
    { x: 120, y: 212, width: 10, height: 4, type: 'path', fill: 'dirt' },
    { x: 126, y: 218, width: 22, height: 4, type: 'path', fill: 'dirt' },
    { x: 146, y: 214, width: 4, height: 18, type: 'path', fill: 'dirt' },
    // Small cemetery on hunter shelf â€” must be after y=204â€“219 path strips or dirt overwrites gate (walkable) and nibbles the back fence.
    { x: 144, y: 206, width: 16, height: 14, type: 'cemetery' },
    // === NE RIDGE DESCENT CORRIDOR â€” links mid-zone stairway to eastern spine ===
    // North-south spur from stairway base (yâ‰ˆ123) south to the east-west artery at y=178.
    // The existing path {x:154,y:178,w:80} already covers the full horizontal span so no
    // extra connector is needed â€” the spur hits it naturally at y=178.
    { x: 201, y: 123, width: 4, height: 56, type: 'path', fill: 'dirt' },

    // River cut separating the skeleton shelf from the bonfire/shortcut shelf until the loop reconnects farther east.
    { x: 86, y: 196, width: 22, height: 18, type: 'wall', fill: 'water' },
    { x: 90, y: 208, width: 20, height: 18, type: 'wall', fill: 'water' },
    { x: 94, y: 222, width: 18, height: 16, type: 'wall', fill: 'water' },
    { x: 98, y: 234, width: 14, height: 12, type: 'wall', fill: 'water' },
    { x: 68, y: 206, width: 20, height: 22, type: 'cliff_face' },
    { x: 120, y: 218, width: 8, height: 12, type: 'cliff_face' },

    // === SOUTH FORT CLIFF SHELF â€” carved AFTER cliff_faces so grass overwrites cliff art ===
    // Inner shelf: natural grass inside the cliff body, reachable via two stairways.
    { x: 64, y: 190, width: 16, height: 8, type: 'clearing', fill: 'grass' },
    // Cliff-top grass â€” continuous with the main forest surface above, flows into the NS stairs.
    { x: 60, y: 178, width: 20, height: 8, type: 'clearing', fill: 'grass' },

    // === SENTINEL PLATEAU GATING â€” prevents bypassing the Stone Sentinels ===
    // Cliff barrier extending west from cliff-1 to the map edge. Players on the bypass trail
    // can see the cliff but cannot walk east onto the cliff-top. The only access to the
    // sentinel chest is: bypass trail â†’ west stairway (55,194) â†’ inner sanctum â†’ NS stairway (68,185).
    // Main cliff wall: runs from map edge past the bypass trail to x=59 (y=184-189).
    // The ruined_west_fort (30,170,16,14) blocks y=170-183 above; this cliff seals below it.
    // The bypass trail path at (54,180,4,35) is placed later and carves a 4-tile passage at
    // x=54-57; the cliff at x=58-59 remains solid and merges with cliff-1 at x=60, y=186.
    { x: 4, y: 184, width: 56, height: 6, type: 'cliff_face' },
    // Dense tree line sealing the gap between the bypass trail (x=54-57) and the cliff-top
    // plateau (x=60-79) for y=178-185. Below y=185 the cliff_face above handles the seal.
    { x: 58, y: 178, width: 3, height: 6, type: 'wall', fill: 'tree' },
    // Dirt road extension â€” wraps west across the cliff-top shelf and south to the bypass trail.
    // Placed AFTER the grass clearing + tree wall so dirt overwrites them.
    { x: 54, y: 178, width: 26, height: 6, type: 'path', fill: 'dirt' },

    // === CLIFF BARRIER â€” continuous east-west barrier broken only by grove gap + fort ===
    // West segment: map edge â†’ enchanted grove gap at x=68.
    { x: 4, y: 114, width: 64, height: 8, type: 'cliff_face' },
    // Central segment: east of grove gap â†’ river/fort area. Stairway gap at x=148-151 lets
    // post-fort players progress north after crossing. Split into sub-segments so the
    // cliff-top walkway clearing (x=198-227, y=114-121) can override the middle section.
    { x: 100, y: 114, width: 48, height: 8, type: 'cliff_face' },
    { x: 152, y: 114, width: 46, height: 8, type: 'cliff_face' },
    // East sub-segment: from cliff-top exit (x=228) to the vertical column.
    { x: 228, y: 114, width: 4, height: 8, type: 'cliff_face' },
    // East seal on the stairway-gap approach â€” blocks players from walking west along y=107-113
    // from the highland east to the lantern-lit ridge connector path; forces cliff corridor entry.
    // Extended north to y=107 to also seal the upper approach at UI (8, -43).
    { x: 154, y: 104, width: 4, height: 18, type: 'cliff_face' },
    // Hollow approach ladder cliff extension â€” continuous cliff face from the stairway (x=115)
    // to the dirt path corridor (x=146). Stops before the main N-S trail so it stays walkable.
    { x: 116, y: 107, width: 30, height: 4, type: 'cliff_face' },

    // === CLIFF-TOP WALKWAY â€” walkable grass layer on top of the central cliff ===
    // Same pattern as the sentinel plateau: clearing placed AFTER cliff_face features
    // so grass overwrites cliff art. Entry stair at south face (x=203), exit stair at
    // north face (x=223). Elevation zone (el1) matches the highlands so stampCliffs
    // does not re-stamp cliff art on the north boundary.
    // Width=30 (x=198-227) stops before the east cliff sub-segment at x=228.
    { x: 198, y: 114, width: 30, height: 8, type: 'clearing', fill: 'grass' },
    // North-face cliff barrier â€” forces the player to use the exit stairway at x=223-227
    // rather than walking directly south from the highland chest area onto the walkway.
    // Gap left at x=223-227 for the stairway; east sealed against the x=228 sub-segment.
    { x: 198, y: 112, width: 25, height: 2, type: 'cliff_face' },
    { x: 228, y: 112, width: 2, height: 2, type: 'cliff_face' },
    // South-face plug â€” seals x=208-217 between the entry stair east edge (x=208) and the
    // vertical column west edge (x=218), making the stair the only way up from below.
    { x: 208, y: 121, width: 10, height: 6, type: 'cliff_face' },
    // Vertical cliff column â€” narrower (4 wide) so the north-bank corridor can reach the fort exit.
    { x: 218, y: 118, width: 4, height: 38, type: 'cliff_face' },
    // East wall: blocks bypass east of the fort.
    { x: 238, y: 118, width: 30, height: 56, type: 'cliff_face' },
    // Cliff plugs sealing the grass (left) and sand (right) side passages â€”
    // forces the player through the central dirt corridor only.
    { x: 227, y: 121, width: 1, height: 6, type: 'cliff_face' },
    { x: 233, y: 121, width: 5, height: 6, type: 'cliff_face' },
    // Ridge connector â€” stairway gap (x=148-151) to the central spine.
    { x: 146, y: 110, width: 8, height: 6, type: 'path', fill: 'dirt' },

    // === WESTERN BYPASS â€” placed AFTER all cliffs so these tiles override buffer rows ===
    // Cliff-1 buffer marks y=212-213, x=60-121 non-walkable.  The west-cliff marks x=68-87,
    // y=206-227 non-walkable.  This clearing restores a walkable strip so the bypass trail
    // and its east-west connector can stamp passable dirt on top.
    // Split around the river (x=90-109) so water remains visible under the bridge.
    { x: 44, y: 213, width: 46, height: 6, type: 'clearing', fill: 'grass' },
    { x: 110, y: 213, width: 26, height: 6, type: 'clearing', fill: 'grass' },
    // Narrow dirt trail pressed against cliff-1's west face (x<60, safe from cliff stamps).
    // Split around the sentinel cliff_face (y=184-189) so cliff texture stays visible.
    { x: 54, y: 169, width: 4, height: 15, type: 'path', fill: 'dirt' },
    { x: 54, y: 190, width: 4, height: 25, type: 'path', fill: 'dirt' },
    // East-west connector: split around the river crossing; bridge spans the water.
    { x: 54, y: 214, width: 36, height: 4, type: 'path', fill: 'dirt' },
    { x: 110, y: 214, width: 18, height: 4, type: 'path', fill: 'dirt' },
    // Plank bridge over the river â€” rickety crossing to the ornamental broadsword shelf.
    { x: 90, y: 214, width: 20, height: 4, type: 'bridge' },

    // === SOUTH-BANK ARTERY â€” chapel (west) to fort (east) ===
    // Segment 1: chapel to the start of the river's south meander (x=50â€“186, y=165â€“169).
    // Stops before Curve 1 at x=187 to avoid overlapping the water.
    { x: 50, y: 165, width: 136, height: 5, type: 'path', fill: 'dirt' },
    // Segment 2: curves south around the deep meander (Curve 2 belly is at y=170),
    // then leads east to the fort's south gate approach (x=186â€“234, y=173â€“177).
    { x: 186, y: 173, width: 48, height: 5, type: 'path', fill: 'dirt' },

    // === MID-ZONE CORRIDOR â€” tree walls channelling the south bank toward the fort ===
    // Light tree cover west of the fort approach; not a hard wall, just visual guidance.
    { x: 170, y: 138, width: 10, height: 14, type: 'wall', fill: 'tree' },
    { x: 196, y: 142, width: 8, height: 12, type: 'wall', fill: 'tree' },

    // === RUINED RANGER CHECKPOINT â€” world ~(53, 7) ===
    // Burned-out patrol post on the ridge descent path. Tells the story of the ranger
    // collapse before the player reaches the fort.
    { x: 205, y: 132, width: 12, height: 12, type: 'ruins' },

    // === ONE-WAY FUNNEL GATING â€” seals plateau exits so players flow toward chapel/fort ===
    // East artery block: cliff wall at the plateau's east edge stops the y=178 artery
    // from leading into the temple/skeleton terrace. Visible but unreachable for now.
    { x: 152, y: 172, width: 6, height: 14, type: 'cliff_face' },
    // North spine block: cliff across the N-S spine where it meets the plateau's north edge.
    // Forces the player west toward the chapel instead of north to the broken bridge dead-end.
    { x: 144, y: 148, width: 10, height: 6, type: 'cliff_face' },

    // === WATERFALL BASE â€” mossy stone pool ===
    { x: 176, y: 46, width: 4, height: 3, type: 'clearing', fill: 'mossy_stone' },

    // === SOUTH ENTRY â€” broken wagon clearing ===
    { x: 142, y: 276, width: 6, height: 4, type: 'clearing', fill: 'dirt' },

    // ============================================================
    // === CREEK SYSTEMS â€” winding water channels with bridges ===
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
    // === CLIFF FACES & ROCKY RIDGES â€” natural barriers ===
    // ============================================================

    // --- East ridge: rocky shelf sealing the far-east bypass ---
    // Match the full el1 shelf width so Cliff Cemetery cannot route north around the shortcut.
    { x: 272, y: 100, width: 24, height: 50, type: 'cliff_face' },
    // Seal the left sand lane beside the cliff-corridor shortcut so the ladder column is the
    // only north-south break through this seam.
    { x: 268, y: 118, width: 1, height: 14, type: 'cliff_face' },

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
    // === DENSE TREE CORRIDORS â€” natural funnelling ===
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
    // === NEW POIs â€” filling dead zones ===
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

    // --- SW rocky hill plateau â€” walkable grass on top, accessed via south-face stairs ---
    // Extends to y=290 so grass covers the full elevation zone including the stairway row;
    // stampCliffs buffer eats ~2 rows above the cliff edge, so overshooting ensures enough
    // walkable ground remains between the shrine and the stairs.
    { x: 73, y: 275, width: 16, height: 16, type: 'clearing', fill: 'grass' },
    // Ruined shrine stones at the center-north of the plateau; south edge stays grassy so the
    // stair-top reads like the sentinel plateau rather than a separate stone landing.
    { x: 78, y: 277, width: 10, height: 8, type: 'clearing', fill: 'mossy_stone' },
    { x: 80, y: 279, width: 6, height: 4, type: 'clearing', fill: 'ruins_floor' },
    // Small cliff-top grass shelf carved into the coastal rim so the south-face stairway lands
    // on a visible walkable plateau like the southern Stone Sentinel setup.
    { x: 78, y: 293, width: 6, height: 3, type: 'clearing', fill: 'grass' },

    // --- Golem den (south-west corner, world ~-54,142 / tile 96,292) ---
    // Stone patches signal "something territorial lives here" before the golem aggros.
    // Stops at y=293 to avoid overwriting the 6-row coastal cliff/ocean border (y>=294).
    { x: 90, y: 282, width: 16, height: 12, type: 'clearing', fill: 'mossy_stone' },
    { x: 93, y: 285, width: 8, height: 6, type: 'clearing', fill: 'stone' },

    // --- Rocky ford (east, x:260, y:230) ---
    { x: 258, y: 228, width: 10, height: 8, type: 'clearing', fill: 'mossy_stone' },

    // --- Cliff inlet west of ranger plateau â€” x=106â€“111 only so xâ‰¥112 plateau is not paved over.
    { x: 106, y: 164, width: 6, height: 10, type: 'clearing', fill: 'dirt' },
    // --- Windmill plot (world ~-41, 22) â€” dirt pad just south of the river / inlet lane.
    { x: 104, y: 168, width: 12, height: 10, type: 'clearing', fill: 'dirt' },

    // --- West hidden grove south rim â€” picket cordon along shelf_face y=163 (meets plateau at x=112) ---
    // Blocks descent onto the wolf shelf; stampCliffs skips fence/gate/iron_fence caps on this row.
    { x: 4, y: 163, width: 108, height: 1, type: 'wall', fill: 'fence' },
    // Heavier band at the trail head â€” reads as a sealed gate line you can swap to walkable `gate` later.
    { x: 56, y: 163, width: 5, height: 1, type: 'wall', fill: 'iron_fence' },
    // Short sand-pinch blocker tucked closer to the grass edge.
    { x: 100, y: 162, width: 1, height: 1, type: 'wall', fill: 'fence' },

    // ============================================================
    // === WHISPERING RIVER â€” winding east toward golem mountain ===
    // Cuts the N-S spine at the broken bridge, then curves south-east
    // in a natural meander before narrowing to its headwaters at the
    // golem mountain base (~x=222). The straight working bridge is gone;
    // a natural ford marks where the old ridge trail crosses the deep bend.
    // Water features first; bridge/path tiles follow to overwrite.
    // ============================================================

    // West segment: x=100â€“145 (unchanged)
    { x: 100, y: 155, width: 46, height: 7, type: 'wall', fill: 'water' },
    // Broken bridge zone: x=146â€“153
    { x: 146, y: 155, width: 8, height: 7, type: 'wall', fill: 'water' },
    // Straight mid-section: x=154â€“186
    { x: 154, y: 155, width: 33, height: 7, type: 'wall', fill: 'water' },
    // Curve 1 â€” initial south bend: river widens as it enters the meander
    { x: 187, y: 155, width: 10, height: 11, type: 'wall', fill: 'water' },
    // Curve 2 â€” deepest south meander (belly of the bend)
    { x: 194, y: 159, width: 14, height: 11, type: 'wall', fill: 'water' },
    // Curve 3 â€” swings back north-east
    { x: 206, y: 157, width: 12, height: 10, type: 'wall', fill: 'water' },
    // Curve 4 â€” narrows toward golem mountain base, ends ~x=222
    { x: 214, y: 153, width: 9, height: 9, type: 'wall', fill: 'water' },

    // Broken bridge â€” north stub (bonfire side, y=155â€“156) and south stub (cottage side, y=159â€“161)
    { x: 146, y: 155, width: 8, height: 2, type: 'bridge' },
    { x: 146, y: 159, width: 8, height: 3, type: 'bridge' },

    // Tiny sand lip under the west-grove blocker so it reads as beach, not water.
    { x: 100, y: 161, width: 1, height: 1, type: 'clearing', fill: 'sand' },

    // North-bank corridor â€” split into two segments with a stone wall plug between them.
    // West segment: stair gap to the wall plug.
    { x: 100, y: 148, width: 118, height: 5, type: 'path', fill: 'dirt' },
    // Cliff sealing the corridor to the fort's NW corner tower (x=222-224, y=153+).
    // Width covers x=218-225 so no walkable grass gap remains east of the cliff.
    { x: 218, y: 148, width: 8, height: 5, type: 'cliff_face' },
    // East segment: small dirt apron at the fort's north exit so exiting the fort still works.
    { x: 228, y: 148, width: 6, height: 5, type: 'path', fill: 'dirt' },
  ],
  portals: [
    { x: 150, y: 291, targetMap: 'village', targetX: 120, targetY: 8 },
    { x: 3, y: 150, targetMap: 'village', targetX: 235, targetY: 80 },
  ],
  chests: [
    // Shifted east: Hollow river west seal (xâ‰ˆ28â€“91, yâ‰ˆ64â€“79) covers old spot.
    { x: 102, y: 72, interactionId: 'forest_chest_1' },
    { x: 216, y: 110, interactionId: 'forest_chest_2' },
    { x: 33, y: 135, interactionId: 'hidden_grove_chest' },
    // Former interior_woodcutter_cottage loot (exterior prop only now).
    { x: 93, y: 177, interactionId: 'forest_woodcutter_chest' },
    { x: 265, y: 85, interactionId: 'ruins_chest_1' },
    { x: 42, y: 38, interactionId: 'wolf_den_chest' },
    { x: 228, y: 244, interactionId: 'forest_lake_chest' },
    { x: 160, y: 60, interactionId: 'forest_north_chest' },
    { x: 90, y: 230, interactionId: 'spider_chest' },
    { x: 275, y: 265, interactionId: 'forest_hermit_chest' },
    { x: 105, y: 265, interactionId: 'ruins_south_chest' },
    { x: 30, y: 250, interactionId: 'spider_nest_chest' },
    { x: 190, y: 260, interactionId: 'forest_deep_chest' },
    { x: 30, y: 210, interactionId: 'destroyed_town_chest' },
    { x: 178, y: 48, interactionId: 'waterfall_chest' },
    { x: 268, y: 28, interactionId: 'volcano_chest' },
    // New chests in enchanted groves and forts
    { x: 80, y: 150, interactionId: 'enchanted_chest_1' },
    { x: 248, y: 250, interactionId: 'enchanted_chest_2' },
    { x: 58, y: 268, interactionId: 'enchanted_chest_3' },
    { x: 232, y: 161, interactionId: 'fort_chest_1' },
    { x: 208, y: 66, interactionId: 'fort_chest_2' },
    { x: 68, y: 196, interactionId: 'fort_chest_3' },
    // Hidden chest on the cliff-top plateau â€” reward for finding the north descent.
    { x: 72, y: 182, interactionId: 'cliff_top_sentinel_chest' },
    { x: 111, y: 220, interactionId: 'forest_river_chest' },
    // Near hunter approach / river shelf â€” player-facing coords ~(8, 66) inside small cemetery.
    { x: 158, y: 216, interactionId: 'forest_cemetery_chest' },
    { x: 218, y: 183, interactionId: 'golem_arena_chest' },
    // Fort garrison chest â€” inside the gate so entry feels earned
    { x: 228, y: 161, interactionId: 'fort_garrison_chest' },
    // Hidden chest behind waterfall
    { x: 180, y: 46, interactionId: 'waterfall_hidden_chest' },
    // West grove rim â€” world (-52, 12); reach from inside the cordon, not the river sand pinch.
    { x: 98, y: 162, interactionId: 'west_grove_hidden_rim_chest' },
    // Hollow approach ridge â€” world (-36, -44); overlooking the river / decayed bridge lane.
    { x: 114, y: 106, interactionId: 'forest_chest_hollow_approach' },
    // Observatory compound â€” hidden reward corner at world (59, -60).
    { x: 209, y: 90, interactionId: 'observatory_chest' },
    // Hunter gate â€” tucked in the east cliff notch just past the iron fence. World (6, 48).
    { x: 156, y: 198, interactionId: 'forest_southern_chest' },
    // SW rocky hill plateau â€” reward sits on the cliff-top shelf directly above the stairs.
    { x: 80, y: 294, interactionId: 'rocky_hill_chest' },
  ],
  interactables: [
    // Blighted Root â€” corrupted growth at the center of the enchanted grove. Quest target for grove_warden.
    { x: 85, y: 153, type: 'blighted_stump', walkable: false, interactionId: 'blighted_root' },
    // Corrupted bridge (north stub) â€” primary â€œhollowâ€ checkpoint for fast travel / narrative.
    { x: 156, y: 154, type: 'bonfire', walkable: false, interactionId: 'bonfire_hollow' },
    // South approach trail toward the fog-gate corridor â€” world near (-26, -46).
    { x: 124, y: 77, type: 'bonfire', walkable: false, interactionId: 'bonfire_forest_fort' },
    // Iron Gate â€” world ~(-15.5, 58.5), slightly NE of old (130, 206)
    { x: 134, y: 208, type: 'bonfire', walkable: false, interactionId: 'bonfire_forest_south' },
    { x: 148, y: 286, type: 'bonfire', walkable: false, interactionId: 'bonfire_forest_clearing' },
    { x: 281, y: 145, type: 'bonfire', walkable: false, interactionId: 'bonfire_cliff_cemetery' },
    // Lever is on the NORTH side of the ranger gate (y=199-202) so the player must first
    // navigate the long way around through the forest to reach the cottage, then on the way
    // back south they pull the lever to open the shortcut home to the Ranger Outpost.
    { x: 127, y: 196, type: 'shortcut_lever', walkable: false, interactionId: 'forest_shortcut_lever' },
    { x: 146, y: 240, type: 'stump', walkable: false, interactionId: 'stump_lore' },
    { x: 100, y: 100, type: 'stump', walkable: false, interactionId: 'stump_lore' },
    { x: 200, y: 90, type: 'stump', walkable: false, interactionId: 'stump_lore' },
    { x: 87, y: 228, type: 'mushroom', walkable: true, interactionId: 'healing_mushroom' },
    { x: 250, y: 190, type: 'mushroom', walkable: true, interactionId: 'healing_mushroom' },
    { x: 45, y: 145, type: 'mushroom', walkable: true, interactionId: 'healing_mushroom' },
    { x: 170, y: 182, type: 'mushroom', walkable: true, interactionId: 'healing_mushroom' },
    { x: 160, y: 185, type: 'campfire', walkable: false, interactionId: 'campfire' },
    { x: 35, y: 250, type: 'campfire', walkable: false, interactionId: 'campfire' },
    { x: 275, y: 270, type: 'well', walkable: false, interactionId: 'well' },
    { x: 140, y: 95, type: 'well', walkable: false, interactionId: 'ancient_well' },
    { x: 30, y: 35, type: 'bones_pile', walkable: true, interactionId: 'wolf_den_bones' },
    { x: 45, y: 165, type: 'ranger_remains', walkable: true, interactionId: 'chapel_dead_ranger' },
    { x: 45, y: 157, type: 'altar', walkable: false, interactionId: 'old_chapel_altar' },
    { x: 262, y: 25, type: 'sign', walkable: false, interactionId: 'volcano_warning' },
    { x: 22, y: 248, type: 'cage', walkable: false, interactionId: 'spider_cocoon' },
    // Potion pickups in forest clearings and paths
    // West of Hollow river seal strip (was 68,65 â€” flooded by north-west water seal).
    { x: 22, y: 66, type: 'tempest_grass', walkable: true, interactionId: 'tempest_grass_pickup' },
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
    { x: 140, y: 48, type: 'moonbloom', walkable: true, interactionId: 'moonbloom_pickup' },
    { x: 210, y: 107, type: 'moonbloom', walkable: true, interactionId: 'moonbloom_pickup' },
    { x: 85, y: 181, type: 'moonbloom', walkable: true, interactionId: 'moonbloom_pickup' },
    // === THE HOLLOW â€” Warning sign lower on the bridge approach (world y ~= -50) ===
    { x: 118, y: 100, type: 'sign', walkable: false, interactionId: 'hollow_warning_sign' },
    // Hollow shortcut lever removed â€” fog gate clears after boss defeat; corridor is open.

    // === SOUTH ENTRY CORRIDOR â€” environmental storytelling ===
    { x: 148, y: 270, type: 'sign', walkable: false, interactionId: 'forest_milestone' },

    // === ABANDONED HOMESTEAD SURROUNDS ===
    { x: 224, y: 127, type: 'windmill', walkable: false, interactionId: '' },
    { x: 234, y: 131, type: 'barrel', walkable: false, interactionId: '' },
    { x: 235, y: 132, type: 'crate', walkable: false, interactionId: '' },
    { x: 234, y: 134, type: 'stump', walkable: false, interactionId: '' },
    { x: 223, y: 128, type: 'hay_bale', walkable: false, interactionId: '' },
    { x: 225, y: 128, type: 'hay_bale', walkable: false, interactionId: '' },
    { x: 227, y: 134, type: 'barrel', walkable: false, interactionId: '' },

    // === SHORTCUT LEVER HINTS ===
    // Bloodstain on the SOUTH face of the gate â€” environmental hint that someone fell here.
    // Sign on the bonfire plateau â€” visible after the player hits the gate and looks around.
    // === FORT INTERIOR ===
    { x: 228, y: 159, type: 'sign', walkable: false, interactionId: 'fort_garrison_orders' },

    // Grove shelf shortcut lever â€” north of the iron gate, west of the gap (x=56â€“60).
    { x: 55, y: 162, type: 'shortcut_lever', walkable: false, interactionId: 'grove_shelf_shortcut_lever' },

  ],
  props: [
    // Lantern trail guiding player toward the Hollow bridge.
    { x: 122, y: 110, type: 'lantern', walkable: true },
    { x: 122, y: 106, type: 'lantern', walkable: true },
    { x: 122, y: 100, type: 'lantern', walkable: true },
    // Tighten the hollow-approach ladder funnel: signs are soft/walkable, so add hard blockers
    // on the east side to stop side-slipping past the ledge lip.
    { x: 119, y: 105, type: 'rock', walkable: false },
    { x: 119, y: 106, type: 'rock', walkable: false },
    // Permanent gate anchor at the cliff edge â€” always visible, y-sorts behind the ladder below it.
    { x: 117, y: 105, type: 'gate', walkable: false },
    // Lantern at the stairway base to draw the player's eye toward the correct route up.
    { x: 112, y: 111, type: 'lantern', walkable: false },
    // Hollow approach and shortcut hints are atmosphere, not direct interactables.
    { x: 120, y: 26, type: 'campfire', walkable: false },
    { x: 124, y: 28, type: 'bloodstain', walkable: true },
    // === DEEP HOLLOW (tile y <= 59, world y <= -91) â€” broken graves, corruption, silhouettes; flanks only (spine ~117-129 open).
    { x: 90, y: 42, type: 'windmill', walkable: false },
    { x: 154, y: 45, type: 'windmill', walkable: false },
    { x: 94, y: 52, type: 'tombstone_broken', walkable: false },
    { x: 98, y: 48, type: 'tombstone_cracked_v', walkable: false },
    { x: 92, y: 46, type: 'tombstone_broken', walkable: false },
    { x: 96, y: 54, type: 'bones_pile', walkable: true },
    { x: 88, y: 50, type: 'bloodstain', walkable: true },
    { x: 99, y: 56, type: 'rubble', walkable: true },
    { x: 97, y: 50, type: 'dead_tree', walkable: false },
    { x: 98, y: 44, type: 'statue', walkable: false },
    { x: 152, y: 52, type: 'tombstone_cracked_v', walkable: false },
    { x: 158, y: 46, type: 'tombstone_broken', walkable: false },
    { x: 154, y: 56, type: 'bones', walkable: true },
    { x: 160, y: 50, type: 'bloodstain', walkable: true },
    { x: 150, y: 48, type: 'rubble', walkable: true },
    { x: 162, y: 42, type: 'statue', walkable: false },
    { x: 148, y: 54, type: 'dead_tree', walkable: false },
    { x: 95, y: 38, type: 'bones_pile', walkable: true },
    { x: 157, y: 34, type: 'mossy_stone', walkable: false },
    { x: 91, y: 58, type: 'mossy_stone', walkable: false },
    { x: 130, y: 203, type: 'bloodstain', walkable: true },
    // Gate-side cluster â€” environmental storytelling on the bonfire side of the hunter cliff seal.
    // None are PATH_BLOCKERS so they survive path-proximity cleanup; each pair is spaced > 2 tiles
    // apart in at least one axis to survive SPACED_DECORATIONS thinning.
    { x: 151, y: 199, type: 'lantern', walkable: false },
    { x: 154, y: 199, type: 'rubble', walkable: true },
    { x: 150, y: 202, type: 'statue', walkable: false },
    { x: 154, y: 202, type: 'statue', walkable: false },
    { x: 152, y: 207, type: 'campfire', walkable: false },
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
    // Northward spine â€” ranger line of march (packed path ~146â€“154 x); keeps manuscript progression readable
    { x: 152, y: 182, type: 'lantern', walkable: false },
    { x: 152, y: 152, type: 'lantern', walkable: false },
    { x: 152, y: 132, type: 'lantern', walkable: false },
    { x: 152, y: 112, type: 'lantern', walkable: false },
    { x: 74, y: 40, type: 'bones_pile', walkable: true },
    { x: 82, y: 38, type: 'dead_tree', walkable: false },
    { x: 84, y: 42, type: 'cage', walkable: false },
    { x: 56, y: 152, type: 'dead_tree', walkable: false },
    { x: 62, y: 150, type: 'bones_pile', walkable: true },
    { x: 64, y: 154, type: 'cage', walkable: false },

    // === SOUTH-BANK BREADCRUMBS ===
    // Segment 1 breadcrumbs (y=165-169 artery, before the meander detour).
    { x: 60, y: 167, type: 'bloodstain', walkable: true },
    { x: 80, y: 166, type: 'bloodstain', walkable: true },
    { x: 100, y: 168, type: 'bloodstain', walkable: true },
    { x: 120, y: 167, type: 'bloodstain', walkable: true },
    { x: 140, y: 166, type: 'bloodstain', walkable: true },
    { x: 160, y: 168, type: 'bloodstain', walkable: true },
    { x: 180, y: 167, type: 'bloodstain', walkable: true },
    // Segment 2 breadcrumbs (y=173-177 detour south of the meander).
    { x: 194, y: 175, type: 'bloodstain', walkable: true },
    { x: 210, y: 174, type: 'bloodstain', walkable: true },
    { x: 224, y: 175, type: 'bloodstain', walkable: true },
    // Lanterns along the south bank.
    { x: 90, y: 166, type: 'lantern', walkable: false },
    { x: 150, y: 166, type: 'lantern', walkable: false },
    { x: 202, y: 174, type: 'lantern', walkable: false },
    // === NORTH-BANK CORRIDOR LANTERN TRAIL ===
    // Guides the player west from the fort's north exit to the stair gap at x=148-151.
    // Path is at y=148-152; lanterns placed on the path edge.
    { x: 225, y: 149, type: 'lantern', walkable: false },
    { x: 195, y: 149, type: 'lantern', walkable: false },
    { x: 180, y: 149, type: 'lantern', walkable: false },
    { x: 165, y: 149, type: 'lantern', walkable: false },
    { x: 150, y: 149, type: 'lantern', walkable: false },
    // Grove south rim â€” cordon clutter.
    { x: 52, y: 162, type: 'barrel', walkable: false },
    { x: 54, y: 161, type: 'crate', walkable: false },
    { x: 68, y: 162, type: 'chain', walkable: false },
    { x: 88, y: 162, type: 'lantern', walkable: false },
    { x: 96, y: 162, type: 'stump', walkable: false },
    { x: 104, y: 162, type: 'dead_tree', walkable: false },
    // Wolf shelf below the rim (unreachable until a gate opens) â€” visible tease beyond the fence.
    { x: 72, y: 168, type: 'bones_pile', walkable: true },
    { x: 84, y: 170, type: 'dead_tree', walkable: false },
    { x: 92, y: 169, type: 'stump', walkable: false },
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
    // Windmill plot â€” was beside removed river-adjacent stairs; now world (-41, 22) / tile (109,172).
    { x: 109, y: 172, type: 'windmill', walkable: false },

    // === LOWER CLIFF INLET (world -39, 37 / tile 111,187) ===
    // The cliff walls form a 14-tile-wide bowl from y=186-191 (x=104-117 open).
    // Windmill planted against the east cliff wall inside the inlet â€” visible silhouette from the north.
    { x: 115, y: 189, type: 'windmill', walkable: false },
    // Lanterns flanking the cliff-mouth entrance (y=186 is first cliff_edge row).
    { x: 104, y: 186, type: 'lantern', walkable: false },
    { x: 116, y: 186, type: 'lantern', walkable: false },
    // Hay bales scattered near the windmill base and along the walls.
    { x: 113, y: 188, type: 'hay_bale', walkable: false },
    { x: 114, y: 190, type: 'hay_bale', walkable: false },
    { x: 106, y: 189, type: 'hay_bale', walkable: false },
    { x: 107, y: 191, type: 'hay_bale', walkable: false },
    // Cliff-base rubble pressed against both walls.
    { x: 105, y: 188, type: 'rock', walkable: false },
    { x: 116, y: 188, type: 'rock', walkable: false },
    { x: 104, y: 191, type: 'rock', walkable: false },
    { x: 116, y: 191, type: 'rock', walkable: false },
    // Floor variety inside the corridor.
    { x: 108, y: 190, type: 'tall_grass', walkable: true },
    { x: 112, y: 189, type: 'tall_grass', walkable: true },
    { x: 110, y: 191, type: 'bones', walkable: true },
    // Dead tree on the north approach â€” silhouette before the cliff mouth.
    { x: 106, y: 175, type: 'dead_tree', walkable: false },
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
    { x: 142, y: 189, type: 'dead_tree', walkable: false },
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
    { x: 153, y: 179, type: 'barrel', walkable: false },
    { x: 162, y: 180, type: 'cart', walkable: false },
    { x: 166, y: 184, type: 'crate', walkable: false },
    { x: 168, y: 184, type: 'barrel', walkable: false },
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
    { x: 108, y: 181, type: 'dead_tree', walkable: false },
    { x: 114, y: 176, type: 'bones_pile', walkable: true },
    { x: 118, y: 179, type: 'dead_tree', walkable: false },
    { x: 156, y: 120, type: 'dead_tree', walkable: false },
    { x: 160, y: 122, type: 'dead_tree', walkable: false },
    { x: 164, y: 124, type: 'dead_tree', walkable: false },
    { x: 96, y: 110, type: 'lantern', walkable: false },
    { x: 202, y: 258, type: 'crate', walkable: false },
    { x: 206, y: 258, type: 'barrel', walkable: false },
    { x: 246, y: 268, type: 'lantern', walkable: false },
    { x: 66, y: 268, type: 'bones_pile', walkable: true },

    // === SOUTH ENTRY CORRIDOR â€” broken wagon and scatter ===
    { x: 152, y: 264, type: 'bones_pile', walkable: true },
    { x: 148, y: 258, type: 'bones_pile', walkable: true },
    { x: 144, y: 278, type: 'wagon', walkable: false },
    { x: 146, y: 280, type: 'barrel', walkable: false },
    { x: 148, y: 280, type: 'crate', walkable: false },
    { x: 142, y: 276, type: 'bones_pile', walkable: true },

    // === MAIN SPINE â€” stumps and mushroom rings ===
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

    // === MAIN SPINE â€” lanterns at forks ===
    // Moved from y=161 (now inside the Whispering River) to the south bank at y=162.
    { x: 149, y: 162, type: 'lantern', walkable: false },
    { x: 149, y: 114, type: 'lantern', walkable: false },
    { x: 119, y: 121, type: 'lantern', walkable: false },
    { x: 119, y: 97, type: 'lantern', walkable: false },

    // === HOLLOW APPROACH â€” bones trail to fog gate ===
    { x: 120, y: 34, type: 'bones_pile', walkable: true },
    { x: 123, y: 32, type: 'bones_pile', walkable: true },
    { x: 118, y: 30, type: 'bones_pile', walkable: true },
    { x: 125, y: 28, type: 'bones_pile', walkable: true },

    // === HOLLOW APPROACH â€” bloodstains near fog gate ===
    { x: 121, y: 24, type: 'bloodstain', walkable: true },
    { x: 123, y: 25, type: 'bloodstain', walkable: true },
    { x: 119, y: 26, type: 'bloodstain', walkable: true },
    { x: 125, y: 23, type: 'bloodstain', walkable: true },

    // === HUNTER COTTAGE SURROUNDS ===
    { x: 136, y: 190, type: 'lantern', walkable: false },
    { x: 143, y: 186, type: 'bones_pile', walkable: true },
    { x: 134, y: 186, type: 'bones_pile', walkable: true },
    { x: 135, y: 186, type: 'bones_pile', walkable: true },
    { x: 136, y: 186, type: 'bones_pile', walkable: true },
    { x: 140, y: 186, type: 'bones_pile', walkable: true },
    { x: 141, y: 186, type: 'bones_pile', walkable: true },
    { x: 134, y: 194, type: 'flower', walkable: true },
    { x: 136, y: 194, type: 'flower', walkable: true },
    { x: 138, y: 194, type: 'flower', walkable: true },
    { x: 132, y: 192, type: 'tall_grass', walkable: true },
    { x: 131, y: 191, type: 'tall_grass', walkable: true },
    { x: 133, y: 193, type: 'tall_grass', walkable: true },

    // === WITCH COTTAGE â€” altar prop ===
    { x: 230, y: 140, type: 'altar', walkable: false },

    // === RUINED WAYSTATION â€” environmental storytelling props ===
    // Iron fence remnants along the perimeter â€” half-collapsed enclosure
    { x: 190, y: 167, type: 'iron_fence', walkable: false },
    { x: 190, y: 169, type: 'iron_fence', walkable: false },
    { x: 207, y: 167, type: 'iron_fence', walkable: false },
    { x: 207, y: 169, type: 'iron_fence', walkable: false },
    // Lanterns flanking the compound entrance
    { x: 193, y: 167, type: 'lantern', walkable: false },
    { x: 204, y: 167, type: 'lantern', walkable: false },
    // Cold campfire between the two cottages â€” last stand
    { x: 197, y: 170, type: 'campfire', walkable: false },
    // Remains of the occupants
    { x: 196, y: 171, type: 'bones', walkable: true },
    { x: 199, y: 169, type: 'bones_pile', walkable: true },
    { x: 195, y: 173, type: 'bloodstain', walkable: true },
    { x: 201, y: 174, type: 'bloodstain', walkable: true },
    // Mossy waystone marker on the path edge
    { x: 194, y: 173, type: 'mossy_stone', walkable: false },
    // Nature reclaiming the ruins
    { x: 190, y: 172, type: 'dead_tree', walkable: false },
    { x: 207, y: 170, type: 'dead_tree', walkable: false },
    { x: 193, y: 171, type: 'mushroom', walkable: true },
    { x: 205, y: 168, type: 'mushroom', walkable: true },
    { x: 206, y: 173, type: 'stump', walkable: false },
    { x: 192, y: 174, type: 'stump', walkable: false },
    // Spilled cargo from the overturned wagon
    { x: 197, y: 175, type: 'barrel', walkable: false },
    { x: 199, y: 175, type: 'crate', walkable: false },
    { x: 195, y: 176, type: 'barrel', walkable: false },

    // === GOLEM APPROACH â€” scattered bones on the south-bank approach to the fort ===
    { x: 214, y: 178, type: 'bones_pile', walkable: true },
    { x: 220, y: 180, type: 'bloodstain', walkable: true },

    // === WITCH COTTAGE SURROUNDS â€” mushroom ring ===
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
    // === ENVIRONMENTAL SCATTER â€” rocks, stumps, wells, statues ===
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

    // === ABANDONED OBSERVATORY COMPOUND â€” off-the-beaten-path encounter SE of North Fort ===
    // Observatory tower â€” the area's visual anchor (world ~72, -59)
    { x: 222, y: 91, type: 'observatory', walkable: false },
    // Rocks around the observatory base
    { x: 219, y: 97, type: 'rock', walkable: false },
    { x: 225, y: 97, type: 'rock', walkable: false },
    { x: 221, y: 100, type: 'rock', walkable: false },
    { x: 226, y: 101, type: 'rock', walkable: false },
    // Lanterns flanking the approach
    { x: 220, y: 99, type: 'lantern', walkable: false },
    { x: 224, y: 99, type: 'lantern', walkable: false },
    // Crates and barrels near the entrance
    { x: 218, y: 95, type: 'barrel', walkable: false },
    { x: 219, y: 95, type: 'crate', walkable: false },
    { x: 226, y: 95, type: 'barrel', walkable: false },
    // Dead trees marking the area as distinct
    { x: 216, y: 91, type: 'dead_tree', walkable: false },
    { x: 228, y: 91, type: 'dead_tree', walkable: false },
    { x: 230, y: 99, type: 'dead_tree', walkable: false },
    // Cold campfire near the faction fight â€” failed camp
    { x: 229, y: 97, type: 'campfire', walkable: false },
    // Broken wagon near the chest corner
    { x: 210, y: 93, type: 'wagon', walkable: false },
    // Stumps around the perimeter
    { x: 214, y: 97, type: 'stump', walkable: false },
    { x: 228, y: 103, type: 'stump', walkable: false },
    // Bloodstain breadcrumbs leading from the main trail toward the observatory
    { x: 218, y: 89, type: 'bloodstain', walkable: true },
    { x: 220, y: 93, type: 'bloodstain', walkable: true },
    { x: 224, y: 101, type: 'bloodstain', walkable: true },
    { x: 228, y: 98, type: 'bloodstain', walkable: true },
    { x: 226, y: 93, type: 'bloodstain', walkable: true },
    { x: 215, y: 95, type: 'bloodstain', walkable: true },
    // Final collision footprint for the tower facade/base.
    // Stamp this after local decor so later walkable props do not reopen the footprint.
    { x: 220, y: 90, type: 'stone', walkable: false },
    { x: 221, y: 90, type: 'stone', walkable: false },
    { x: 222, y: 90, type: 'stone', walkable: false },
    { x: 223, y: 90, type: 'stone', walkable: false },
    { x: 224, y: 90, type: 'stone', walkable: false },
    { x: 220, y: 91, type: 'stone', walkable: false },
    { x: 221, y: 91, type: 'stone', walkable: false },
    { x: 223, y: 91, type: 'stone', walkable: false },
    { x: 224, y: 91, type: 'stone', walkable: false },
    { x: 220, y: 92, type: 'stone', walkable: false },
    { x: 221, y: 92, type: 'stone', walkable: false },
    { x: 222, y: 92, type: 'stone', walkable: false },
    { x: 223, y: 92, type: 'stone', walkable: false },
    { x: 224, y: 92, type: 'stone', walkable: false },
    { x: 220, y: 93, type: 'stone', walkable: false },
    { x: 221, y: 93, type: 'stone', walkable: false },
    { x: 222, y: 93, type: 'stone', walkable: false },
    { x: 223, y: 93, type: 'stone', walkable: false },
    { x: 224, y: 93, type: 'stone', walkable: false },
    { x: 220, y: 94, type: 'stone', walkable: false },
    { x: 221, y: 94, type: 'stone', walkable: false },
    { x: 222, y: 94, type: 'stone', walkable: false },
    { x: 223, y: 94, type: 'stone', walkable: false },
    { x: 224, y: 94, type: 'stone', walkable: false },
    { x: 220, y: 95, type: 'stone', walkable: false },
    { x: 221, y: 95, type: 'stone', walkable: false },
    { x: 222, y: 95, type: 'stone', walkable: false },
    { x: 223, y: 95, type: 'stone', walkable: false },
    { x: 224, y: 95, type: 'stone', walkable: false },

    // --- South-east rocky shelf scatter ---
    { x: 214, y: 218, type: 'rock', walkable: false },
    { x: 218, y: 220, type: 'rock', walkable: false },
    { x: 222, y: 216, type: 'rock', walkable: false },
    { x: 220, y: 222, type: 'stump', walkable: false },
    { x: 216, y: 214, type: 'rock', walkable: false },

    // --- Cliff corridor ladder â€” gate prop removed; stairway now carves through the cliff ---
    // Lantern at the base of the cliff to draw the player's eye upward
    { x: 270, y: 123, type: 'lantern', walkable: false },

    // --- Temple Ruins corridor (x=268-274) between cliff_face and east ridge ---
    // Broken columns half-swallowed by the cliff wall
    { x: 268, y: 141, type: 'statue', walkable: false },
    { x: 268, y: 148, type: 'statue', walkable: false },
    { x: 268, y: 154, type: 'statue', walkable: false },
    // Rubble and loose stones along the passage
    { x: 271, y: 140, type: 'rock', walkable: false },
    { x: 271, y: 145, type: 'rock', walkable: false },
    { x: 270, y: 151, type: 'rock', walkable: false },
    { x: 269, y: 157, type: 'rock', walkable: false },
    // Lanterns and atmosphere
    { x: 271, y: 142, type: 'lantern', walkable: false },
    { x: 271, y: 150, type: 'lantern', walkable: false },
    { x: 268, y: 156, type: 'lantern', walkable: false },
    // Scattered bones and bloodstains from skeleton patrols
    { x: 269, y: 144, type: 'bones', walkable: true },
    { x: 270, y: 149, type: 'bloodstain', walkable: true },
    { x: 269, y: 153, type: 'bones', walkable: true },
    { x: 270, y: 146, type: 'bloodstain', walkable: true },
    // Southern opening where the east ridge cliff ends â€” ruins spill out
    { x: 272, y: 152, type: 'tombstone', walkable: false },
    { x: 274, y: 154, type: 'tombstone', walkable: false },
    { x: 273, y: 157, type: 'stump', walkable: false },
    { x: 275, y: 150, type: 'rock', walkable: false },
    { x: 270, y: 159, type: 'bones_pile', walkable: false },

    // --- Cliff Cemetery â€” scattered remains around the stone circle ---
    { x: 279, y: 144, type: 'statue', walkable: false },
    { x: 281, y: 148, type: 'statue', walkable: false },
    // Tombstones scattered through the clearing
    { x: 276, y: 141, type: 'tombstone', walkable: false },
    { x: 278, y: 146, type: 'tombstone', walkable: false },
    { x: 283, y: 143, type: 'tombstone', walkable: false },
    { x: 285, y: 147, type: 'tombstone', walkable: false },
    { x: 277, y: 149, type: 'tombstone', walkable: false },
    // Bones and remains among the graves
    { x: 280, y: 142, type: 'bones', walkable: true },
    { x: 284, y: 145, type: 'bones', walkable: true },
    { x: 276, y: 147, type: 'bones', walkable: true },
    { x: 282, y: 149, type: 'bones_pile', walkable: false },
    // Bloodstains near the graves
    { x: 280, y: 146, type: 'bloodstain', walkable: true },
    { x: 284, y: 148, type: 'bloodstain', walkable: true },
    // Weathered lantern at the clearing edge
    { x: 275, y: 143, type: 'lantern', walkable: false },

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

    // --- Golem den props â€” scattered stone outcrops around the clearing ---
    { x: 91, y: 283, type: 'rubble', walkable: true },
    { x: 95, y: 284, type: 'statue', walkable: false },
    { x: 100, y: 283, type: 'rubble', walkable: true },
    { x: 93, y: 289, type: 'rubble', walkable: true },
    { x: 99, y: 291, type: 'rubble', walkable: true },
    { x: 104, y: 286, type: 'rubble', walkable: true },
    { x: 90, y: 292, type: 'bones_pile', walkable: true },

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
    // Override: remove noise-generated stump at (128,227) â€” no interaction exists there
    { x: 128, y: 227, type: 'grass', walkable: true },
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

    // --- Cliff-top stone plateau (x:60-79, y:178-185) ---
    // Rubble and signs of a past encampment â€” the Sentinels drove defenders out long ago.
    { x: 64, y: 180, type: 'rock', walkable: false },
    { x: 69, y: 179, type: 'rock', walkable: false },
    { x: 76, y: 181, type: 'rock', walkable: false },
    { x: 62, y: 183, type: 'rock', walkable: false },
    { x: 74, y: 184, type: 'rock', walkable: false },
    { x: 67, y: 182, type: 'stump', walkable: false },
    { x: 71, y: 185, type: 'stump', walkable: false },
    { x: 77, y: 179, type: 'bones', walkable: true },
    { x: 61, y: 181, type: 'bones', walkable: true },
    { x: 75, y: 183, type: 'tall_grass', walkable: true },
    { x: 65, y: 179, type: 'tall_grass', walkable: true },

    // --- Inner sanctum (x:64-79, y:190-197) ---
    // Scattered stone rubble and abandoned garrison supplies.
    { x: 66, y: 192, type: 'rock', walkable: false },
    { x: 79, y: 190, type: 'rock', walkable: false },
    { x: 74, y: 196, type: 'rock', walkable: false },
    { x: 65, y: 195, type: 'bones', walkable: true },
    { x: 78, y: 193, type: 'bones', walkable: true },
    { x: 77, y: 197, type: 'crate', walkable: false },
    { x: 75, y: 194, type: 'barrel', walkable: false },
    { x: 79, y: 196, type: 'lantern', walkable: false },

    // === WHISPERING RIVER â€” environmental storytelling ===
    // South bank (broken bridge approach): collapsed supply wagon suggests the crossing
    // was once used by ranger patrols. The player can see the north stub and bonfire beyond.
    { x: 148, y: 165, type: 'wagon', walkable: false },
    { x: 145, y: 164, type: 'barrel', walkable: false },
    { x: 143, y: 165, type: 'crate', walkable: false },
    // South bank (working bridge approach, x=188â€“193): old supply cache beside the crossing
    { x: 191, y: 163, type: 'barrel', walkable: false },
    { x: 186, y: 166, type: 'crate', walkable: false },
    { x: 185, y: 163, type: 'rock', walkable: false },
    // North bank (after crossing working bridge): signs of the old ranger patrol route westward
    { x: 193, y: 151, type: 'lantern', walkable: false },
    { x: 178, y: 150, type: 'lantern', walkable: false },
    { x: 160, y: 150, type: 'lantern', walkable: false },
    { x: 193, y: 152, type: 'bones_pile', walkable: true },

    // === RUINED RANGER CHECKPOINT props â€” world ~(53, 7) ===
    { x: 208, y: 134, type: 'destroyed_house', walkable: false },
    { x: 205, y: 133, type: 'campfire', walkable: false },
    { x: 212, y: 133, type: 'stump', walkable: false },
    { x: 213, y: 136, type: 'barrel', walkable: false },
    { x: 211, y: 138, type: 'barrel', walkable: false },
    { x: 209, y: 140, type: 'bones_pile', walkable: true },
    { x: 206, y: 141, type: 'bloodstain', walkable: true },
    { x: 214, y: 140, type: 'cart', walkable: false },

    // === RIVERBANK PENINSULA â€” world ~(52, 7) ===
    // A collapsed river outpost: broken dock, sunken rowboat, scattered debris suggesting
    // the checkpoint once ferried supplies across the Whispering River before the war.
    { x: 204, y: 158, type: 'boat_wreck', walkable: false },
    { x: 206, y: 155, type: 'dock', walkable: true },
    { x: 202, y: 156, type: 'barrel', walkable: false },
    { x: 204, y: 155, type: 'crate', walkable: false },
    { x: 200, y: 158, type: 'bones_pile', walkable: true },
    { x: 201, y: 156, type: 'bloodstain', walkable: true },
    { x: 203, y: 153, type: 'bones', walkable: true },
    { x: 205, y: 153, type: 'stump', walkable: false },
    { x: 177, y: 152, type: 'bones_pile', walkable: true },
    { x: 163, y: 151, type: 'bloodstain', walkable: true },
    { x: 155, y: 152, type: 'rock', walkable: false },
    { x: 172, y: 152, type: 'stump', walkable: false },
  ],
  secretAreas: [],
  elevationZones: [
    // y=2 start + width to x=245 removes el0 strip at north portals (y=3) and NE approach (x>195).
    // === TIER 1: Broad north highlands (main elevated mass) â€” extended south to close el0 gap vs. west ridge ===
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
    // Width reaches x=111 so the south cliff meets the ranger plateau (x=112) with no el0 gap
    // players could slip through to bypass the Disparaged Cottage / gate arc.
    { x: 4, y: 108, width: 108, height: 56, elevation: 1 },
    // === TIER 1: Cliff-top walkway (sentinel-style raised grass on the central cliff barrier) ===
    { x: 198, y: 114, width: 30, height: 8, elevation: 1 },
    // === TIER 1: Central ranger plateau ===
    { x: 112, y: 148, width: 80, height: 52, elevation: 1 },
    // === TIER 1: East temple terrace ===
    { x: 240, y: 132, width: 52, height: 62, elevation: 1 },
    // === TIER 2: Center summit ledge (boss arena area) ===
    { x: 204, y: 38, width: 47, height: 42, elevation: 2 },
    // === TIER 1: SE enchanted hills ===
    { x: 230, y: 222, width: 62, height: 62, elevation: 1 },
    // === TIER 1: East ridge (rocky cliff shelf) ===
    { x: 272, y: 100, width: 24, height: 50, elevation: 1 },
    // === TIER 1: South-east rocky bluff ===
    { x: 200, y: 236, width: 28, height: 16, elevation: 1 },
    // === TIER 1: South-west rocky hill (near ruined shrine) ===
    { x: 72, y: 274, width: 18, height: 16, elevation: 1 },
    // === GROUND LEVEL: Western bypass corridor ===
    // Force elevation=0 across the entire zone so stampCliffs (which runs after placeFeatures)
    // cannot auto-generate blocking cliff art that would seal the narrow bypass trail.
    // Covers x=44-142 (trail west of cliff-1, plus connector strip) y=180-223.
    // Keep the el0â†”el1 vertical seam east of the hunter cottage foundation.
    { x: 44, y: 180, width: 99, height: 44, elevation: 0 },
  ],
  stairways: [
    // All stairways start AT south_face = zone_y + zone_h - 1 so placeStairways
    // (post-stampCliffs) overwrites cliff_edge + all 3 cliff tiles below it.

    // Main trail â†’ north highlands (el1): zone {x:112,y:148,h:52}, south_face=199
    // (Stairway removed â€” cliff runs unbroken along full south face of el2 summit)
    // NW corner el1 south descent: zone {x:4,y:4,h:68}, south_face=71
    { x: 38, y: 71, width: 6, height: 4, elevation: 1 },
    // NE fortress ridge (east temple terrace el1): zone {x:240,y:132,h:62}, south_face=193
    { x: 248, y: 193, width: 6, height: 4, elevation: 1 },
    // Second access to NE temple ridge from central trail
    { x: 228, y: 193, width: 6, height: 4, elevation: 1 },
    // West hidden grove (y=163): no stair â€” cliff runs the full shelf/Groveâ€“plateau seam so this
    // cannot shortcut the Disparaged Cottage / ranger-gate arc.
    // SE enchanted hills south: stairway removed â€” cliff runs unbroken across the full south face.
    // East ridge south face: zone {x:272,y:100,h:50}, south_face=149
    { x: 280, y: 149, width: 6, height: 4, elevation: 1 },
    // South-east bluff south face: zone {x:200,y:236,h:16}, south_face=251
    { x: 210, y: 251, width: 6, height: 4, elevation: 1 },
    // South-west rocky hill south: zone {x:72,y:274,h:16}, south_face=289
    { x: 78, y: 289, width: 6, height: 4, elevation: 1 },
    // NE fortress ridge south face mid-corridor: zone {x:194,y:24,h:96}, south_face=119.
    // Creates a traversal break in the otherwise unbroken 97-tile cliff face and eliminates
    // the sky-gap seam visible at approximately world (51, 28) near this cliff boundary.
    { x: 199, y: 119, width: 6, height: 4, elevation: 1 },
    // South fort shelf: cliff_face stamps an unwalkable west face; carved stone steps (el0)
    // replace the west wall + one interior column so a barrel row does not choke the landing.
    { x: 55, y: 194, width: 12, height: 4, elevation: 0, axis: 'ew' },
    // North face stairway: connects cliff-top plateau (y=185) through cliff_edge/cliff body to
    // the inner sanctum (y=190).  NS axis â€” treads descend south.
    { x: 68, y: 185, width: 5, height: 6, elevation: 0 },
    // === CLIFF-TOP WALKWAY STAIRWAYS ===
    // South entry: el0 (north-bank corridor) â†’ el1 (cliff-top walkway).
    // stampCliffs stamps cliff_edge at y=121 + cliff wall at y=122-124 (drop el1â†’el0).
    // Stair spans y=119-126: 3 tiles on the cliff-top, 4 tiles through the cliff art,
    // 2 tiles of ground below. elevation=0 so el0 ground connects; stairs tile lets
    // the player cross the 1-step diff up to el1 cliff-top (canWalkTo allows stairs Â±1).
    { x: 203, y: 119, width: 5, height: 8, elevation: 0 },
    // North exit: el1 (cliff-top walkway, y=114) â†’ el1 (NE fortress ridge, y=113).
    // Both sides are el1 so stampCliffs generates no cliff art here. The stairway
    // provides a visual cue and cuts through any residual cliff art from the original
    // cliff_face feature. Spans y=112-117: 2 tiles in highlands, 4 tiles on cliff-top.
    { x: 223, y: 112, width: 5, height: 6, elevation: 1 },
    // Funnel-drop stair at x=110 removed â€” it read as stray steps into the river; el1â†”el0
    // along the shelf is handled by the cliff seam + south-bank corridor without that block.
    // Hollow approach: stairway west of the ridge chest so the player can ascend to el1.
    // South face of north highlands (y=2, h=106) is y=107; stampCliffs puts cliff_edge at y=107
    // and cliff wall at y=108-110 (depth 2+1=3). Stair spans y=107..110 to overwrite the full
    // cliff face. Width 6 matches standard stairway sizing.
    { x: 110, y: 107, width: 6, height: 4, elevation: 1 },
    // Cliff corridor: 1-tile-wide stairway carved through the cliff face (y=119-123).
    // placeStairways runs post-stampCliffs so this overwrites the cliff_edge + cliff wall,
    // then extends one tile farther south to hide the render seam under the shortcut stairs.
    // The sync function places the gate_ladder at y=123 (the bottom) to gate access.
    { x: 269, y: 119, width: 1, height: 5, elevation: 1 },
    // Cliff corridor south entry: el0 gap (y=123-131) â†’ el1 east temple terrace (y=132).
    // Width 3 (x=268-270) covers the cliff_face seal column at x=268 to close the sky gap
    // left by the seal's south buffer.
    { x: 268, y: 132, width: 3, height: 2, elevation: 1 },
  ],
  ladders: [],
  enemyZones: [
    // Zones are spread by quadrant / POI so packs are not stacked on one choke (esp. north gate).

    // NE â€” Hollow shadow creatures (formerly bandits)
    { x: 210, y: 25, width: 20, height: 18, enemyType: 'shadow', count: 6 },
    { x: 182, y: 46, width: 32, height: 14, enemyType: 'shadow', count: 4 },

    // SW â€” spider nest + perimeter (offset from nest center)
    { x: 20, y: 240, width: 28, height: 22, enemyType: 'spider', count: 8 },
    { x: 55, y: 252, width: 22, height: 12, enemyType: 'spider', count: 4 },

    // NW â€” Hollow dark wolves + shadows (formerly skeletons)
    { x: 65, y: 25, width: 22, height: 16, enemyType: 'wolf', count: 4 },
    { x: 50, y: 50, width: 20, height: 16, enemyType: 'shadow', count: 3 },

    // Lone Hollow Shade (reaper) at the cliff stretch end â€” world (9, -44) / tile (159, 106).
    { x: 156, y: 104, width: 6, height: 4, enemyType: 'shadow', count: 1 },

    // Central â€” east of ranger plateau / inn (avoids fort footprint ~130â€“152, 120â€“138)
    { x: 166, y: 148, width: 18, height: 18, enemyType: 'wolf', count: 4 },
    // Fort garrison â€” armored wolves patrol the perimeter; regular wolves hang back west
    { x: 110, y: 116, width: 18, height: 14, enemyType: 'armored_wolf', count: 3 },
    { x: 86, y: 116, width: 20, height: 14, enemyType: 'wolf', count: 3 },
    // South fort cliff sanctum â€” two Stone Sentinels guard the inner shelf and cliff-top plateau.
    // Tighter zone so they don't roam outside the carved stone area (x=64-79, y=190-197).
    { x: 65, y: 191, width: 13, height: 6, enemyType: 'stone_sentinel', count: 2 },
    // Cliff inlet back wall (world ~-46,41 / tile ~108,191) â€” Hollow Shade lurking deep.
    // Very tight chaseRange (2.8) â€” only aggros on direct approach; easily missed.
    // Faces south (cliff wall) by default. A dripfeed of the Hollow section.
    { x: 107, y: 190, width: 6, height: 2, enemyType: 'shadow_lurker', count: 1 },

    // West â€” hidden grove plants
    { x: 18, y: 124, width: 22, height: 18, enemyType: 'plant', count: 5 },
    // Stops at y=162 so patrols do not spawn on the south_face fence row (y=163).
    { x: 52, y: 148, width: 18, height: 15, enemyType: 'wolf', count: 4 },

    // E â€” lakeside spiders + temple skeletons
    { x: 230, y: 176, width: 24, height: 14, enemyType: 'spider', count: 5 },
    { x: 246, y: 136, width: 26, height: 26, enemyType: 'skeleton', count: 6 },

    // South â€” split wolf / slime along trail (less pile-up on portal column)
    { x: 112, y: 252, width: 18, height: 14, enemyType: 'wolf', count: 3 },
    { x: 170, y: 262, width: 24, height: 16, enemyType: 'slime', count: 5 },
    { x: 164, y: 278, width: 18, height: 10, enemyType: 'wolf', count: 2 },

    // Enchanted groves
    { x: 72, y: 140, width: 28, height: 23, enemyType: 'plant', count: 8 },
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
    { x: 175, y: 178, width: 16, height: 14, enemyType: 'spider', count: 3 },
    { x: 105, y: 178, width: 14, height: 12, enemyType: 'wolf', count: 3 },
    // South of the hollow river â€” mundane threats (not Hollow shades); same footprint as old shadow pack.
    { x: 142, y: 90, width: 16, height: 14, enemyType: 'skeleton', count: 2 },
    { x: 142, y: 90, width: 16, height: 14, enemyType: 'skeleton_captain', count: 1 },
    { x: 142, y: 90, width: 16, height: 14, enemyType: 'slime', count: 1 },

    // SW plateau + far E trail
    { x: 36, y: 192, width: 20, height: 16, enemyType: 'wolf', count: 4 },
    { x: 278, y: 92, width: 16, height: 16, enemyType: 'wolf', count: 4 },
    { x: 110, y: 200, width: 14, height: 12, enemyType: 'skeleton', count: 2 },
    { x: 142, y: 210, width: 18, height: 14, enemyType: 'wolf', count: 2 },

    { x: 212, y: 177, width: 18, height: 14, enemyType: 'golem', count: 1 },

    // AUTHORED ENCOUNTER POD 1 â€” mid-spine fork, first multi-enemy test
    { x: 146, y: 181, width: 6, height: 4, enemyType: 'wolf', count: 3 },
    // AUTHORED ENCOUNTER POD 2 â€” river crossing approach: wolves west, undead/slime east (pre-Hollow)
    { x: 140, y: 88, width: 8, height: 6, enemyType: 'wolf', count: 2 },
    { x: 148, y: 88, width: 8, height: 6, enemyType: 'skeleton', count: 1 },
    { x: 148, y: 88, width: 8, height: 6, enemyType: 'slime', count: 1 },
    // AUTHORED ENCOUNTER POD 3 â€” hollow approach: shades stalk the corridor to the fog gate
    { x: 116, y: 33, width: 10, height: 8, enemyType: 'plant', count: 1 },
    // Hollow Shades â€” staged along the bonfire-to-gate corridor (y:72 â†’ y:18)
    { x: 118, y: 62, width: 10, height: 8, enemyType: 'shadow_lurker', count: 2 },
    { x: 116, y: 50, width: 12, height: 8, enemyType: 'shadow_lurker', count: 2 },
    { x: 118, y: 40, width: 10, height: 8, enemyType: 'shadow_lurker', count: 3 },
    { x: 116, y: 25, width: 12, height: 8, enemyType: 'shadow_lurker', count: 3 },

    // East ridge wolf zone removed â€” zone was 97% unwalkable cliff tiles.
    // Stone quarry â€” skeletons among the rubble
    { x: 228, y: 205, width: 16, height: 12, enemyType: 'skeleton', count: 4 },
    // Logging camp â€” wolves prowl the cleared area
    { x: 162, y: 234, width: 18, height: 12, enemyType: 'wolf', count: 3 },
    // Collapsed cottage â€” spiders nested in the ruins
    { x: 276, y: 156, width: 14, height: 12, enemyType: 'spider', count: 3 },
    // South creek crossing â€” slimes in the water margin
    { x: 110, y: 270, width: 30, height: 6, enemyType: 'slime', count: 3 },
    // Ruined shrine â€” shadows guard the ancient stones
    { x: 76, y: 276, width: 14, height: 12, enemyType: 'shadow', count: 2 },
    // SW corner golem den â€” punishes players straying off the designated path. World ~(-54, 138).
    { x: 92, y: 284, width: 12, height: 8, enemyType: 'golem', count: 1 },
    // Rocky ford â€” wolves at the mossy crossing
    { x: 256, y: 226, width: 14, height: 10, enemyType: 'wolf', count: 2 },

    // === OBSERVATORY COMPOUND â€” hidden encounter SE of North Fort ===
    // Stone Sentinels guarding the observatory entrance
    { x: 220, y: 90, width: 10, height: 8, enemyType: 'stone_sentinel', count: 2 },
    // Stone Golem patrolling the compound perimeter (drops golem_heart)
    { x: 226, y: 94, width: 8, height: 6, enemyType: 'golem', count: 1 },
  ],
};

const mapCache: Record<string, WorldMap> = {};

function clearMapCache() {
  for (const key of Object.keys(mapCache)) {
    delete mapCache[key];
  }
}

/** Dev-only: after HMR edits to this module, World must call `loadMap(allMaps[id])` â€” cache clear alone is not enough. */
const mapHotReloadSubscribers: Array<() => void> = [];

export function subscribeMapHotReload(handler: () => void): () => void {
  mapHotReloadSubscribers.push(handler);
  return () => {
    const i = mapHotReloadSubscribers.indexOf(handler);
    if (i !== -1) mapHotReloadSubscribers.splice(i, 1);
  };
}

type MapDefinitionSummary = Pick<MapDefinition, 'name' | 'subtitle' | 'width' | 'height'>;

type DeferredMapDefinitionLoader = {
  summary: MapDefinitionSummary;
  load: () => Promise<MapDefinition>;
};

function summarizeMapDefinition(def: MapDefinition): MapDefinitionSummary {
  return {
    name: def.name,
    subtitle: def.subtitle,
    width: def.width,
    height: def.height,
  };
}

const staticMapDefinitions: Record<string, MapDefinition> = {
  village: villageDef,
  forest: forestDef,
  interior_inn: interiorInnDef,
  interior_blacksmith: interiorBlacksmithDef,
  interior_merchant: interiorMerchantDef,
  interior_cottage_a: interiorCottageADef,
  interior_cottage_forest: interiorCottageForestDef,
  interior_ranger_cabin: interiorRangerCabinDef,
  interior_woodcutter_cottage: interiorWoodcutterCottageDef,
  interior_hunter_cottage: interiorHunterCottageDef,
  interior_hollow_arena: interiorHollowArenaDef,
};

const deferredMapLoaders: Record<string, DeferredMapDefinitionLoader> = {
  gilrhym: {
    summary: {
      name: 'Gilrhym',
      subtitle: 'A city consumed by what it buried',
      width: 300,
      height: 300,
    },
    load: async () => (await import('@/content/regions/ruins/map')).gilrhymDef,
  },
};

const deferredMapDefinitions: Record<string, MapDefinition> = {};
const deferredMapDefinitionLoads: Record<string, Promise<MapDefinition>> = {};

const mapDefinitionSummaries: Record<string, MapDefinitionSummary> = {
  village: summarizeMapDefinition(villageDef),
  forest: summarizeMapDefinition(forestDef),
  gilrhym: deferredMapLoaders.gilrhym.summary,
  interior_inn: summarizeMapDefinition(interiorInnDef),
  interior_blacksmith: summarizeMapDefinition(interiorBlacksmithDef),
  interior_merchant: summarizeMapDefinition(interiorMerchantDef),
  interior_cottage_a: summarizeMapDefinition(interiorCottageADef),
  interior_cottage_forest: summarizeMapDefinition(interiorCottageForestDef),
  interior_ranger_cabin: summarizeMapDefinition(interiorRangerCabinDef),
  interior_woodcutter_cottage: summarizeMapDefinition(interiorWoodcutterCottageDef),
  interior_hunter_cottage: summarizeMapDefinition(interiorHunterCottageDef),
  interior_hollow_arena: summarizeMapDefinition(interiorHollowArenaDef),
};

function clearDeferredMapDefinitions() {
  for (const key of Object.keys(deferredMapDefinitions)) {
    delete deferredMapDefinitions[key];
  }
  for (const key of Object.keys(deferredMapDefinitionLoads)) {
    delete deferredMapDefinitionLoads[key];
  }
}

function getLoadedMapDefinition(key: string): MapDefinition | undefined {
  return staticMapDefinitions[key] ?? deferredMapDefinitions[key];
}

async function ensureMapDefinition(key: string): Promise<MapDefinition | undefined> {
  const loaded = getLoadedMapDefinition(key);
  if (loaded) return loaded;

  const loader = deferredMapLoaders[key];
  if (!loader) return undefined;

  deferredMapDefinitionLoads[key] ??= loader.load().then(def => {
    deferredMapDefinitions[key] = def;
    return def;
  });

  return deferredMapDefinitionLoads[key];
}

export async function preloadMap(key: string): Promise<WorldMap | undefined> {
  if (mapCache[key]) {
    return mapCache[key];
  }

  const def = await ensureMapDefinition(key);
  if (!def) return undefined;

  mapCache[key] = generateMap(def);
  return mapCache[key];
}

export const mapDefinitions: Record<string, MapDefinition> = new Proxy({} as Record<string, MapDefinition>, {
  get(_target, prop: string | symbol) {
    if (typeof prop !== 'string') return undefined;
    return getLoadedMapDefinition(prop) ?? (mapDefinitionSummaries[prop] as MapDefinition | undefined);
  },
  has(_target, prop: string | symbol) {
    return typeof prop === 'string' && prop in mapDefinitionSummaries;
  },
  ownKeys() {
    return Reflect.ownKeys(mapDefinitionSummaries);
  },
  getOwnPropertyDescriptor(_target, prop: string | symbol) {
    if (typeof prop !== 'string' || !(prop in mapDefinitionSummaries)) {
      return undefined;
    }

    return {
      configurable: true,
      enumerable: true,
      value: getLoadedMapDefinition(prop) ?? mapDefinitionSummaries[prop],
      writable: false,
    };
  },
});

function getOrGenerateMap(key: string): WorldMap | undefined {
  if (!mapCache[key]) {
    const def = getLoadedMapDefinition(key);
    if (!def) return undefined;
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
    clearDeferredMapDefinitions();
  });
  import.meta.hot.accept(() => {
    clearMapCache();
    clearDeferredMapDefinitions();
    for (const fn of mapHotReloadSubscribers) {
      try {
        fn();
      } catch (err) {
        console.warn('[maps hot reload]', err);
      }
    }
  });
}
