import type { MapDefinition } from '@/data/mapGenerator';
// ============= VILLAGE: 240x160 Dense Interconnected Starting Town =============
export const villageDef: MapDefinition = {
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
