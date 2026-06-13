import type { MapDefinition } from '@/data/mapGenerator';

export const interiorCottageForestDef: MapDefinition = {
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
  // Loot moved to the overworld: the cottage is now an unenterable vine-choked ruin.
  chests: [],
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

export const interiorRangerCabinDef: MapDefinition = {
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
  portals: [{ x: 7, y: 9, targetMap: 'forest', targetX: 241, targetY: 235 }],
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

export const interiorWoodcutterCottageDef: MapDefinition = {
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
  chests: [],
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

export const interiorHunterCottageDef: MapDefinition = {
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
  portals: [{ x: 6, y: 9, targetMap: 'forest', targetX: 137, targetY: 188 }],
  chests: [{ x: 8, y: 7, interactionId: 'forest_hunter_chest' }],
  interactables: [],
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

// The Surveyor's Den - a hidden cliff cave (entered via a cave_mouth on the west cliff).
// An L: the entry arm (mouth + sign + the surveyor's camp) bends DOWN-right into the dangerous
// chamber (his 500g hoard, guarded by shadows). Cave-floor earth, stone walls, rock formations.
// Door-free: the mouth itself is the exit (cave_mouth), exited by interacting like the entrance.
export const interiorSurveyorsHollowDef: MapDefinition = {
  name: "Surveyor's Den",
  width: 22,
  height: 18,
  spawnPoint: { x: 5, y: 5 },
  seed: 4517,
  baseTerrain: 'dungeon',
  borderTile: 'stone',
  autoRoads: false,
  features: [
    // Whole cave is solid rock; the L-floor is carved out of it (so walls read as rock, not a box).
    { x: 0, y: 0, width: 22, height: 18, type: 'wall', fill: 'stone' },
    // L floor - packed cave earth. Entry arm (top-left) + dangerous chamber (down-right), joined at the corner.
    { x: 2, y: 3, width: 7, height: 5, type: 'clearing', fill: 'cave_floor' },   // entry arm
    { x: 7, y: 7, width: 13, height: 9, type: 'clearing', fill: 'cave_floor' },  // chamber
    // The cave mouth IS the exit - an interact-to-exit cave_mouth punched through the entry-arm wall.
    { x: 4, y: 2, width: 1, height: 1, type: 'cave_mouth', caveExit: true, interiorMap: 'forest', interiorSpawnX: 45, interiorSpawnY: 113 },
  ],
  portals: [], // door-free: the cave_mouth feature above is the exit (interact to leave)
  chests: [{ x: 17, y: 13, interactionId: 'surveyors_hollow_chest' }], // 500g hoard, far end of the chamber
  interactables: [
    { x: 7, y: 4, type: 'sign', walkable: false, interactionId: 'surveyors_hollow_journal' }, // beside the mouth
  ],
  enemyZones: [
    { x: 9, y: 8, width: 10, height: 7, enemyType: 'shadow', count: 3 }, // shadows hold the chamber
  ],
  props: [
    // The surveyor's camp - the safe entry arm
    { x: 3, y: 4, type: 'bed', walkable: false },              // bedroll
    { x: 6, y: 3, type: 'lantern', walkable: false },          // guttered lantern
    { x: 3, y: 6, type: 'campfire_remains', walkable: false }, // long-cold fire
    { x: 7, y: 5, type: 'bones', walkable: true },             // his remains
    { x: 6, y: 6, type: 'bloodstain', walkable: true },
    // Cave formations through the L (rock-driven)
    { x: 8, y: 8, type: 'rock', walkable: false },
    { x: 11, y: 10, type: 'rock', walkable: false },
    { x: 15, y: 9, type: 'volcanic_rock', walkable: false },
    { x: 13, y: 14, type: 'rock', walkable: false },
    { x: 18, y: 11, type: 'volcanic_rock', walkable: false },
    { x: 10, y: 13, type: 'rock', walkable: false },
    { x: 16, y: 8, type: 'rock', walkable: false },
    { x: 17, y: 14, type: 'crate', walkable: false },
    { x: 14, y: 12, type: 'bones', walkable: true },
  ],
};

// Traveler's Inlet - a cliff cave on the eastern ridge (entered via a cave_mouth on the east cliff).
// Y-shaped fork: entry terrace splits west (chest alcove + lone reaper) and east (spider nest).
export const interiorTravelersInletDef: MapDefinition = {
  name: "Traveler's Inlet",
  width: 26,
  height: 22,
  spawnPoint: { x: 12, y: 5 },
  seed: 5321,
  baseTerrain: 'dungeon',
  borderTile: 'stone',
  autoRoads: false,
  features: [
    { x: 0, y: 0, width: 26, height: 22, type: 'wall', fill: 'stone' },
    // Entry terrace - mouth opens onto the top-center lip.
    { x: 9, y: 2, width: 8, height: 6, type: 'clearing', fill: 'cave_floor' },
    // Fork junction beneath the terrace.
    { x: 8, y: 7, width: 10, height: 3, type: 'clearing', fill: 'cave_floor' },
    // West arm - narrow alcove where the traveler hid their purse.
    { x: 2, y: 8, width: 11, height: 11, type: 'clearing', fill: 'cave_floor' },
    // East arm - wide nest chamber, silk and skittering legs.
    { x: 13, y: 7, width: 11, height: 14, type: 'clearing', fill: 'cave_floor' },
    // Interact-to-exit cave mouth on the terrace lip (matches the entrance's interact-to-enter).
    { x: 12, y: 1, width: 1, height: 1, type: 'cave_mouth', caveExit: true, interiorMap: 'forest', interiorSpawnX: 258, interiorSpawnY: 95 },
  ],
  portals: [],
  chests: [{ x: 4, y: 15, interactionId: 'travelers_inlet_chest' }], // special chest - Radiant Vestige
  interactables: [
    { x: 14, y: 4, type: 'sign', walkable: false, interactionId: 'travelers_inlet_journal' },
  ],
  enemyZones: [
    { x: 3, y: 10, width: 8, height: 7, enemyType: 'shadow', count: 1 },
    { x: 15, y: 9, width: 8, height: 10, enemyType: 'spider', count: 3 },
  ],
  props: [
    // Traveler's camp on the entry terrace
    { x: 10, y: 3, type: 'bed', walkable: false },
    { x: 15, y: 3, type: 'lantern', walkable: false },
    { x: 10, y: 6, type: 'campfire_remains', walkable: false },
    { x: 11, y: 5, type: 'crate', walkable: false },
    { x: 12, y: 5, type: 'barrel', walkable: false },
    // West alcove - picked clean except the buried chest
    { x: 5, y: 10, type: 'bones', walkable: true },
    { x: 7, y: 12, type: 'rock', walkable: false },
    { x: 3, y: 14, type: 'rock', walkable: false },
    // East nest - webbed clutter
    { x: 16, y: 10, type: 'rock', walkable: false },
    { x: 20, y: 12, type: 'volcanic_rock', walkable: false },
    { x: 17, y: 17, type: 'rock', walkable: false },
    { x: 22, y: 10, type: 'bones', walkable: true },
    { x: 19, y: 18, type: 'bones', walkable: true },
    { x: 18, y: 11, type: 'cage', walkable: false },
    { x: 21, y: 15, type: 'cage', walkable: false },
    { x: 21, y: 13, type: 'barrel', walkable: false },
  ],
};

// Highlander's Grotto - a small cave tucked behind the east cliff cemetery overlook. Entered via an
// angled (side-facing) cave mouth on the overlook's east wall; interior exit uses the head-on mouth.
export const interiorCliffGrottoDef: MapDefinition = {
  name: "Highlander's Grotto",
  width: 16,
  height: 14,
  spawnPoint: { x: 8, y: 5 },
  seed: 6273,
  baseTerrain: 'dungeon',
  borderTile: 'stone',
  autoRoads: false,
  features: [
    { x: 0, y: 0, width: 16, height: 14, type: 'wall', fill: 'stone' },
    { x: 2, y: 3, width: 12, height: 9, type: 'clearing', fill: 'cave_floor' },
    // The exit IS the mouth - interact-to-exit, dropping back onto the overlook grass
    // just west of the overworld cave mouth (forest tile 292,131). Head-on sprite inside;
    // the overworld entrance keeps the angled side-facing mouth on the cliff wall.
    { x: 8, y: 2, width: 1, height: 1, type: 'cave_mouth', caveExit: true, interiorMap: 'forest', interiorSpawnX: 292, interiorSpawnY: 131 },
  ],
  portals: [],
  chests: [{ x: 12, y: 9, interactionId: 'cliff_grotto_chest' }],
  interactables: [],
  enemyZones: [
    // Lone Hollow Reaver guarding the highlander's cache - throws scythe blades from the back alcove.
    { x: 8, y: 6, width: 5, height: 4, enemyType: 'hollow_reaver', count: 1 },
  ],
  props: [
    { x: 4, y: 5, type: 'rock', walkable: false },
    { x: 5, y: 10, type: 'bones', walkable: true },
    { x: 11, y: 4, type: 'lantern', walkable: false },
    { x: 6, y: 8, type: 'crate', walkable: false },
    { x: 9, y: 10, type: 'bones', walkable: true },
  ],
};
