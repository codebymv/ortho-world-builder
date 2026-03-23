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
    { x: 155, y: 58, width: 8, height: 6, type: 'inn_building', interactionId: 'shop_weapons', interiorMap: 'interior_blacksmith', interiorSpawnX: 8, interiorSpawnY: 3 },
    { x: 175, y: 56, width: 8, height: 6, type: 'inn_building', interactionId: 'shop_potions', interiorMap: 'interior_merchant', interiorSpawnX: 7, interiorSpawnY: 3 },
    { x: 155, y: 86, width: 8, height: 6, type: 'building', interactionId: 'shop_armor' },
    { x: 175, y: 88, width: 8, height: 6, type: 'inn_building', interactionId: 'inn', interiorMap: 'interior_inn', interiorSpawnX: 10, interiorSpawnY: 4 },
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
    { x: 45, y: 30, width: 12, height: 14, type: 'church', interactionId: 'village_church' },

    // ====== SCATTERED COTTAGES (countryside feel) ======
    { x: 88, y: 115, width: 6, height: 6, type: 'cottage', interactionId: 'cottage_south', interiorMap: 'interior_cottage_a', interiorSpawnX: 6, interiorSpawnY: 2 },
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
    { x: 120, y: 8, targetMap: 'forest', targetX: 150, targetY: 294 },
    { x: 237, y: 80, targetMap: 'forest', targetX: 4, targetY: 150 },
    { x: 120, y: 150, targetMap: 'deep_woods', targetX: 120, targetY: 8 },
  ],
  chests: [
    { x: 122, y: 110, interactionId: 'start_potion_chest_1' },
    { x: 118, y: 110, interactionId: 'start_potion_chest_2' },
    { x: 120, y: 108, interactionId: 'start_potion_chest_3' },
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
    { x: 117, y: 86, type: 'bonfire', walkable: false, interactionId: 'bonfire_rest' },
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
    // Potion pickups scattered across town squares, paths, clearings
    { x: 105, y: 78, type: 'flower', walkable: true, interactionId: 'potion_pickup' },
    { x: 130, y: 75, type: 'flower', walkable: true, interactionId: 'potion_pickup' },
    { x: 160, y: 70, type: 'flower', walkable: true, interactionId: 'potion_pickup' },
    { x: 85, y: 98, type: 'flower', walkable: true, interactionId: 'potion_pickup' },
    { x: 45, y: 65, type: 'flower', walkable: true, interactionId: 'potion_pickup' },
    { x: 118, y: 112, type: 'flower', walkable: true, interactionId: 'potion_pickup' },
    { x: 100, y: 45, type: 'flower', walkable: true, interactionId: 'potion_pickup' },
    { x: 175, y: 68, type: 'flower', walkable: true, interactionId: 'potion_pickup' },
    { x: 200, y: 98, type: 'flower', walkable: true, interactionId: 'potion_pickup' },
    { x: 60, y: 85, type: 'flower', walkable: true, interactionId: 'potion_pickup' },
  ],
  props: [
    { x: 84, y: 14, type: 'bench', walkable: false },
    { x: 78, y: 12, type: 'lantern', walkable: false },
    { x: 102, y: 75, type: 'bench', walkable: false },
    { x: 132, y: 75, type: 'bench', walkable: false },
    { x: 100, y: 78, type: 'pot', walkable: true },
    { x: 134, y: 78, type: 'pot', walkable: true },
    { x: 116, y: 72, type: 'pot', walkable: true },
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
    // West residential south face on main N-S road: south_face=75
    { x: 114, y: 75, width: 8, height: 4, elevation: 1 },
    // East market approach: south_face=45
    { x: 148, y: 45, width: 4, height: 4, elevation: 1 },
    // SW farm south face: south_face=155 (zone y=140 + height=16 - 1 = 155)
    { x: 54, y: 155, width: 6, height: 4, elevation: 1 },
    // SE lake south face: south_face=155
    { x: 176, y: 155, width: 4, height: 4, elevation: 1 },
  ],
  enemyZones: [],
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
  autoRoads: false,
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
    { x: 136, y: 164, width: 10, height: 8, type: 'inn_building', interactionId: 'ranger_cabin', interiorMap: 'interior_ranger_cabin', interiorSpawnX: 7, interiorSpawnY: 2 },
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
    { x: 26, y: 208, width: 14, height: 8, type: 'abandoned_camp', interactionId: 'caravan_wreck' },
    { x: 144, y: 228, width: 5, height: 4, type: 'broken_wagon' },
    { x: 148, y: 118, width: 5, height: 4, type: 'broken_wagon' },
    { x: 156, y: 172, width: 4, height: 1, type: 'market_stall_row' },

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
    { x: 90, y: 180, width: 6, height: 6, type: 'cottage', interactionId: 'woodcutter_cottage' },
    { x: 230, y: 130, width: 6, height: 6, type: 'cottage', interactionId: 'witch_cottage' },
    { x: 140, y: 240, width: 6, height: 6, type: 'cottage', interactionId: 'hunter_cottage' },
    { x: 170, y: 80, width: 6, height: 6, type: 'cottage', interactionId: 'forest_cottage' },
    { x: 80, y: 50, width: 6, height: 6, type: 'cottage', interactionId: 'ruin_cottage' },
    { x: 210, y: 200, width: 6, height: 6, type: 'cottage', interactionId: 'hidden_cottage' },

    // === WATCHTOWERS ===
    { x: 150, y: 130, width: 6, height: 6, type: 'watchtower' },
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
    { x: 118, y: 232, width: 28, height: 4, type: 'path', fill: 'dirt' },
    { x: 114, y: 214, width: 6, height: 18, type: 'path', fill: 'dirt' },
    // West branch off the central spine so travelers and AI can reach the mid-west forest without hugging the fort
    { x: 100, y: 120, width: 40, height: 6, type: 'path', fill: 'dirt' },
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
    { x: 275, y: 265, interactionId: 'hermit_chest' },
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
  ],
  interactables: [
    { x: 140, y: 170, type: 'sign', walkable: false, interactionId: 'ranger_sign' },
    { x: 120, y: 90, type: 'sign', walkable: false, interactionId: 'bridge_sign' },
    { x: 76, y: 36, type: 'sign', walkable: false, interactionId: 'danger_sign' },
    { x: 130, y: 44, type: 'bonfire', walkable: false, interactionId: 'bonfire_rest' },
    { x: 138, y: 168, type: 'bonfire', walkable: false, interactionId: 'bonfire_rest' },
    { x: 150, y: 260, type: 'sign', walkable: false, interactionId: 'forest_entry_sign' },
    // Quest objective: Hunter's last known location in the north
    { x: 120, y: 40, type: 'sign', walkable: false, interactionId: 'hunter_clue' },
    { x: 90, y: 230, type: 'mushroom', walkable: true, interactionId: 'healing_mushroom' },
    { x: 250, y: 190, type: 'mushroom', walkable: true, interactionId: 'healing_mushroom' },
    { x: 45, y: 145, type: 'mushroom', walkable: true, interactionId: 'healing_mushroom' },
    { x: 160, y: 175, type: 'campfire', walkable: false, interactionId: 'campfire' },
    { x: 35, y: 250, type: 'campfire', walkable: false, interactionId: 'campfire' },
    { x: 275, y: 270, type: 'well', walkable: false, interactionId: 'well' },
    { x: 25, y: 205, type: 'sign', walkable: false, interactionId: 'destroyed_town_sign' },
    { x: 258, y: 155, type: 'well', walkable: false, interactionId: 'ancient_fountain' },
    // Potion pickups in forest clearings and paths
    { x: 68, y: 65, type: 'flower', walkable: true, interactionId: 'potion_pickup' },
    { x: 210, y: 108, type: 'flower', walkable: true, interactionId: 'potion_pickup' },
    { x: 140, y: 170, type: 'flower', walkable: true, interactionId: 'potion_pickup' },
    { x: 85, y: 225, type: 'flower', walkable: true, interactionId: 'potion_pickup' },
    { x: 225, y: 225, type: 'flower', walkable: true, interactionId: 'potion_pickup' },
    { x: 45, y: 145, type: 'flower', walkable: true, interactionId: 'potion_pickup' },
    { x: 255, y: 55, type: 'flower', walkable: true, interactionId: 'potion_pickup' },
    { x: 155, y: 55, type: 'flower', walkable: true, interactionId: 'potion_pickup' },
    { x: 100, y: 165, type: 'flower', walkable: true, interactionId: 'potion_pickup' },
    { x: 148, y: 265, type: 'flower', walkable: true, interactionId: 'potion_pickup' },
    { x: 230, y: 165, type: 'flower', walkable: true, interactionId: 'potion_pickup' },
    { x: 75, y: 100, type: 'flower', walkable: true, interactionId: 'potion_pickup' },
  ],
  props: [
    { x: 128, y: 42, type: 'bench', walkable: false },
    { x: 182, y: 42, type: 'barrel', walkable: false },
    { x: 186, y: 44, type: 'crate', walkable: false },
    { x: 124, y: 40, type: 'lantern', walkable: false },
    { x: 139, y: 128, type: 'barrel', walkable: false },
    { x: 142, y: 128, type: 'crate', walkable: false },
    { x: 206, y: 66, type: 'barrel', walkable: false },
    { x: 209, y: 66, type: 'crate', walkable: false },
    { x: 66, y: 196, type: 'barrel', walkable: false },
    { x: 70, y: 196, type: 'crate', walkable: false },
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
  ],
  stairways: [
    // All stairways start AT south_face = zone_y + zone_h - 1 so placeStairways
    // (post-stampCliffs) overwrites cliff_edge + all 3 cliff tiles below it.

    // Main trail → north highlands (el1): zone {x:112,y:148,h:52}, south_face=199
    { x: 146, y: 199, width: 8, height: 4, elevation: 1 },
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
    // Central ranger plateau south face: zone {x:112,y:148,h:52}, south_face=199
    // (second stairway on east side of plateau)
    { x: 178, y: 199, width: 6, height: 4, elevation: 1 },
    // SE enchanted hills south: zone {x:230,y:222,h:62}, south_face=283
    { x: 248, y: 283, width: 6, height: 4, elevation: 1 },
  ],
  enemyZones: [
    // Zones are spread by quadrant / POI so packs are not stacked on one choke (esp. north gate).

    // NE — bandit camp + wider road approach
    { x: 210, y: 25, width: 20, height: 18, enemyType: 'bandit', count: 10 },
    { x: 182, y: 46, width: 32, height: 14, enemyType: 'bandit', count: 6 },

    // SW — spider nest + perimeter (offset from nest center)
    { x: 20, y: 240, width: 28, height: 22, enemyType: 'spider', count: 8 },
    { x: 55, y: 252, width: 22, height: 12, enemyType: 'spider', count: 4 },

    // NW — ruins (clear of wolf den clearing center)
    { x: 65, y: 25, width: 22, height: 16, enemyType: 'skeleton', count: 6 },

    // Central — east of ranger plateau / inn (avoids fort footprint ~130–152, 120–138)
    { x: 150, y: 150, width: 24, height: 16, enemyType: 'wolf', count: 5 },
    { x: 86, y: 116, width: 26, height: 18, enemyType: 'wolf', count: 5 },

    // North — single wide band along deep woods gate (replaces stacked twin boxes)
    { x: 96, y: 4, width: 60, height: 16, enemyType: 'wolf', count: 12 },

    // West — hidden grove plants
    { x: 18, y: 124, width: 22, height: 18, enemyType: 'plant', count: 6 },
    { x: 8, y: 150, width: 20, height: 14, enemyType: 'plant', count: 3 },

    // E — lakeside spiders + temple skeletons
    { x: 230, y: 176, width: 24, height: 14, enemyType: 'spider', count: 5 },
    { x: 246, y: 136, width: 26, height: 26, enemyType: 'skeleton', count: 6 },

    // South — split wolf / slime along trail (less pile-up on portal column)
    { x: 122, y: 256, width: 32, height: 18, enemyType: 'wolf', count: 5 },
    { x: 172, y: 266, width: 30, height: 16, enemyType: 'slime', count: 7 },

    { x: 128, y: 276, width: 28, height: 14, enemyType: 'wolf', count: 3 },

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

    // SW plateau + far E trail
    { x: 36, y: 192, width: 20, height: 16, enemyType: 'wolf', count: 4 },
    { x: 278, y: 92, width: 16, height: 16, enemyType: 'wolf', count: 4 },

    { x: 215, y: 140, width: 20, height: 16, enemyType: 'golem', count: 1 },
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
    { x: 60, y: 60, width: 10, height: 8, type: 'inn_building', interactionId: 'witch_hut', interiorMap: 'interior_witch_hut', interiorSpawnX: 6, interiorSpawnY: 2 },
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

    // === NORTH SHELF CASCADE (el2 sanctum rim — ties shrine approach to the high marsh) ===
    { x: 172, y: 4, width: 22, height: 26, type: 'waterfall' },

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
    { x: 186, y: 28, width: 6, height: 12, type: 'path', fill: 'dirt' },
  ],
  portals: [
    { x: 120, y: 190, targetMap: 'forest', targetX: 150, targetY: 8 },
    { x: 120, y: 8, targetMap: 'village', targetX: 120, targetY: 150 },
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
    { x: 55, y: 58, type: 'flower', walkable: true, interactionId: 'potion_pickup' },
    { x: 115, y: 108, type: 'flower', walkable: true, interactionId: 'potion_pickup' },
    { x: 185, y: 85, type: 'flower', walkable: true, interactionId: 'potion_pickup' },
    { x: 55, y: 135, type: 'flower', walkable: true, interactionId: 'potion_pickup' },
    { x: 165, y: 165, type: 'flower', walkable: true, interactionId: 'potion_pickup' },
    { x: 25, y: 165, type: 'flower', walkable: true, interactionId: 'potion_pickup' },
  ],
  props: [
    { x: 168, y: 48, type: 'pot', walkable: true },
    { x: 172, y: 48, type: 'pot', walkable: true },
    { x: 175, y: 52, type: 'bones', walkable: true },
    { x: 114, y: 24, type: 'pot', walkable: true },
    { x: 118, y: 26, type: 'pot', walkable: true },
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
    { x: 50, y: 55, width: 20, height: 16, enemyType: 'shadow', count: 7 },
    // Witch hut perimeter
    { x: 30, y: 40, width: 24, height: 18, enemyType: 'shadow', count: 5 },

    // Ancient Shrine
    { x: 155, y: 35, width: 22, height: 16, enemyType: 'shadow', count: 6 },
    { x: 168, y: 58, width: 16, height: 14, enemyType: 'shadow', count: 4 },

    // Cursed Cemetery
    { x: 145, y: 95, width: 20, height: 16, enemyType: 'skeleton', count: 8 },

    // Dark hollow
    { x: 25, y: 160, width: 18, height: 14, enemyType: 'spider', count: 7 },
    { x: 20, y: 18, width: 28, height: 22, enemyType: 'spider', count: 6 },

    // Northern dark forest (boss approach)
    { x: 80, y: 20, width: 30, height: 24, enemyType: 'shadow', count: 9 },
    { x: 115, y: 10, width: 22, height: 18, enemyType: 'shadow', count: 7 },

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
    { x: 15, y: 35, width: 40, height: 30, enemyType: 'shadow', count: 4 },
    { x: 165, y: 8, width: 20, height: 14, enemyType: 'shadow', count: 4 },
  ],
};

// ============= INTERIOR ROOMS (portal targets) =============
const interiorInnDef: MapDefinition = {
  name: 'Greenleaf Inn',
  width: 20,
  height: 14,
  spawnPoint: { x: 10, y: 4 },
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
  portals: [{ x: 10, y: 13, targetMap: 'village', targetX: 179, targetY: 93 }],
  chests: [],
  interactables: [{ x: 10, y: 4, type: 'sign', walkable: false, interactionId: 'merchant' }],
  props: [
    { x: 10, y: 2, type: 'campfire', walkable: false },
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
  ],
};

const interiorBlacksmithDef: MapDefinition = {
  name: 'Village Smithy',
  width: 16,
  height: 12,
  spawnPoint: { x: 8, y: 3 },
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
  portals: [{ x: 8, y: 11, targetMap: 'village', targetX: 159, targetY: 63 }],
  chests: [],
  interactables: [{ x: 8, y: 4, type: 'sign', walkable: false, interactionId: 'blacksmith' }],
  props: [
    { x: 8, y: 2, type: 'campfire', walkable: false },
    { x: 4, y: 5, type: 'crate', walkable: false },
    { x: 5, y: 5, type: 'crate', walkable: false },
    { x: 11, y: 5, type: 'barrel', walkable: false },
    { x: 12, y: 5, type: 'barrel', walkable: false },
    { x: 3, y: 7, type: 'counter', walkable: false },
    { x: 7, y: 7, type: 'counter', walkable: false },
    { x: 11, y: 7, type: 'counter', walkable: false },
  ],
};

const interiorMerchantDef: MapDefinition = {
  name: 'Potion Shop',
  width: 14,
  height: 12,
  spawnPoint: { x: 7, y: 3 },
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
  portals: [{ x: 7, y: 11, targetMap: 'village', targetX: 179, targetY: 61 }],
  chests: [],
  interactables: [{ x: 7, y: 7, type: 'sign', walkable: false, interactionId: 'healer' }],
  props: [
    { x: 3, y: 3, type: 'bookshelf', walkable: false },
    { x: 10, y: 3, type: 'bookshelf', walkable: false },
    { x: 5, y: 6, type: 'counter', walkable: false },
    { x: 9, y: 6, type: 'counter', walkable: false },
    { x: 4, y: 8, type: 'pot', walkable: true },
    { x: 10, y: 8, type: 'pot', walkable: true },
    { x: 6, y: 5, type: 'crate', walkable: false },
    { x: 8, y: 5, type: 'crate', walkable: false },
  ],
};

const interiorCottageADef: MapDefinition = {
  name: 'Cottage Interior',
  width: 12,
  height: 10,
  spawnPoint: { x: 6, y: 2 },
  seed: 9004,
  baseTerrain: 'grassland',
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
  portals: [{ x: 6, y: 9, targetMap: 'village', targetX: 91, targetY: 118 }],
  chests: [],
  interactables: [],
  props: [
    { x: 4, y: 4, type: 'table', walkable: false },
    { x: 8, y: 4, type: 'bench', walkable: false },
    { x: 6, y: 6, type: 'rug', walkable: true },
    { x: 9, y: 3, type: 'pot', walkable: true },
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
  portals: [{ x: 7, y: 9, targetMap: 'forest', targetX: 141, targetY: 171 }],
  chests: [],
  interactables: [{ x: 7, y: 4, type: 'sign', walkable: false, interactionId: 'ranger_sign' }],
  props: [
    { x: 7, y: 3, type: 'table', walkable: false },
    { x: 4, y: 5, type: 'crate', walkable: false },
    { x: 5, y: 5, type: 'crate', walkable: false },
    { x: 10, y: 4, type: 'bookshelf', walkable: false },
    { x: 3, y: 6, type: 'bench', walkable: false },
    { x: 11, y: 6, type: 'bench', walkable: false },
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
  portals: [{ x: 6, y: 9, targetMap: 'deep_woods', targetX: 65, targetY: 67 }],
  chests: [],
  interactables: [{ x: 6, y: 4, type: 'sign', walkable: false, interactionId: 'witch_hut_lore' }],
  props: [
    { x: 3, y: 3, type: 'bookshelf', walkable: false },
    { x: 9, y: 3, type: 'bookshelf', walkable: false },
    { x: 6, y: 5, type: 'campfire', walkable: false },
    { x: 4, y: 6, type: 'pot', walkable: true },
    { x: 8, y: 6, type: 'pot', walkable: true },
    { x: 5, y: 4, type: 'counter', walkable: false },
  ],
};

// Lazy map generation - only generate when first accessed
const mapCache: Record<string, WorldMap> = {};

export const mapDefinitions: Record<string, MapDefinition> = {
  village: villageDef,
  forest: forestDef,
  deep_woods: deepWoodsDef,
  ruins: ruinsDef,
  interior_inn: interiorInnDef,
  interior_blacksmith: interiorBlacksmithDef,
  interior_merchant: interiorMerchantDef,
  interior_cottage_a: interiorCottageADef,
  interior_ranger_cabin: interiorRangerCabinDef,
  interior_witch_hut: interiorWitchHutDef,
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
