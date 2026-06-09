import type { MapDefinition } from '@/data/mapGenerator';
// ============= FOREST: 300x300 Massive Explorable Forest =============
export const forestDef: MapDefinition = {
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
    // Failed ritual glyph - world (-16, -17); opens the tree cover for the decor ring.
    { x: 130, y: 129, width: 9, height: 9, type: 'clearing', fill: 'grass' },
    { x: 138, y: 246, width: 24, height: 18, type: 'clearing', fill: 'dirt' },
    // Explorer Ulmund's teaching ritual circle - world (5,93) / tile (155,243). Paved as
    // dirt spine so the dud glyph reads as part of the entry path (not a stray grass island)
    // and so the clearing fill clears the procedural tree Ulmund would otherwise snag on.
    { x: 147, y: 234, width: 18, height: 18, type: 'clearing', fill: 'dirt' },
    // Ends at y=171 so the ranger cabin approach (172+) can stay grass until the y=175 artery.
    { x: 126, y: 156, width: 48, height: 16, type: 'clearing', fill: 'dirt' },
    { x: 116, y: 192, width: 48, height: 24, type: 'clearing', fill: 'dirt' },
    { x: 126, y: 180, width: 26, height: 14, type: 'clearing', fill: 'dirt' },
    // === TALL GRASS GATE - Western Fort approach corridor ===
    // A dense 7-wide grass corridor (world x:-109..-103, y:-26..12; tiles x41-47, y124-162)
    // running from the cliff at y=-26 up to the grove-rim fence. Slows movement 50% unless
    // chopped, softly gating the western fort so the area reads as secluded / earned to reach.
    { x: 41, y: 124, width: 7, height: 39, type: 'clearing', fill: 'tall_grass' },

    // === RANGER OUTPOST (overgrown ruin - real cabin relocated to SE hills) ===
    { x: 136, y: 164, width: 6, height: 6, type: 'cottage', interactionId: 'ranger_cabin_ruin' },
    // South of cabin: sit below the y=178 east???west artery so the approach stays mostly grass.
    { x: 156, y: 180, width: 12, height: 10, type: 'camp', interactionId: 'ranger_camp' },

    // === CONSUMED CAMP (north-east) ===
    { x: 210, y: 40, width: 20, height: 16, type: 'camp', interactionId: 'forest_consumed_camp' },
    { x: 216, y: 30, width: 8, height: 6, type: 'building', interactionId: 'consumed_camp_hut' },

    // === HIDDEN GROVE (west) ===
    { x: 15, y: 120, width: 36, height: 28, type: 'clearing', fill: 'grass' },
    { x: 25, y: 128, width: 16, height: 12, type: 'garden' },

    // === SPIDER NEST (dark area, south-west) ===
    { x: 20, y: 240, width: 30, height: 25, type: 'clearing', fill: 'dirt' },
    { x: 25, y: 245, width: 20, height: 15, type: 'camp', interactionId: 'spider_nest' },

    // === HOLLOW APPROACH RIVER ??? single smooth flowing river replacing the old flat barrier + lake ===
    // Flows west-to-east with a natural southward meander through the old lake zone.
    // The NW seal (28,64,64??16) terminates at y=79; this river picks up seamlessly at y=80.
    // Water tiles are placed first; the decayed bridge overwrites the crossing span.
    // At x=118???130 the water spans y=81???95; bridge matches exactly so y=80 is walkable
    // ground on the hollow side and y=96 (cliff gap) is walkable on the approach side.

    // NW seal: blocks the y=74 crosspath west of x=92 from dropping south without the correct approach.
    { x: 28, y: 64, width: 64, height: 16, type: 'wall', fill: 'water' },
    // West run: straight channel east from map edge, connecting off the NW seal
    { x: 4, y: 80, width: 104, height: 7, type: 'wall', fill: 'water' },
    // Curve 1 ??? river bends gently southward entering the meander
    { x: 104, y: 80, width: 12, height: 11, type: 'wall', fill: 'water' },
    // Meander belly ??? river pools south through the old lake zone (ends y=95, not y=96)
    { x: 110, y: 84, width: 14, height: 12, type: 'wall', fill: 'water' },
    // Crossing zone ??? river widens under the bridge (y=81???95, exactly matching bridge height)
    { x: 116, y: 81, width: 18, height: 15, type: 'wall', fill: 'water' },
    // Curve 2 ??? river swings back north-east after the crossing
    { x: 130, y: 80, width: 10, height: 11, type: 'wall', fill: 'water' },
    // East exit ??? runs flush into the far hollow river (x=189??'190) so there is no land isthmus
    // or extra bridge on the east; the only crossing is the decayed bridge at x=118???130.
    { x: 134, y: 78, width: 56, height: 8, type: 'wall', fill: 'water' },
    // Far hollow river sections (east of the meander)
    { x: 190, y: 79, width: 50, height: 6, type: 'wall', fill: 'water' },
    { x: 250, y: 78, width: 50, height: 6, type: 'wall', fill: 'water' },
    // Decayed bridge spanning the hollow entrance (x=118???129, y=81???95). Gradient + speckle blend
    // (bridge_decay_blend) replaces hard rectangle boundaries ??? south stays mostly intact wood,
    // north goes hollow-tainted, with mixed tiles in between. Water gap x=123???124 on north rows.
    { x: 118, y: 81, width: 12, height: 15, type: 'bridge_decay_blend' },
    // Corrupted-water pass now targets the deeper hollow lake near world position (4, -112) via
    // applyWhisperingWoodsHollowApproachCorruptedWater (mapGenerator), leaving this bridge run normal.

    // === THE HOLLOW ??? Dark clearings and corrupted terrain (y < 75) ===
    { x: 40, y: 30, width: 30, height: 30, type: 'clearing', fill: 'dark_grass' },
    { x: 80, y: 40, width: 25, height: 25, type: 'clearing', fill: 'dark_grass' },
    { x: 110, y: 50, width: 30, height: 22, type: 'clearing', fill: 'dark_grass' },
    { x: 145, y: 35, width: 30, height: 30, type: 'clearing', fill: 'dark_grass' },
    { x: 180, y: 45, width: 25, height: 25, type: 'clearing', fill: 'dark_grass' },
    { x: 60, y: 55, width: 20, height: 20, type: 'clearing', fill: 'dark_grass' },
    { x: 200, y: 30, width: 24, height: 20, type: 'clearing', fill: 'dark_grass' },
    // Mossy stone patches ??? corruption seeping through
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

    // === THE HOLLOW ??? Fog Gate terminus (y=18) ===
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
    // North hollow boundary east extension ? closes the gap from the corridor east wall (x:148)
    // to the east flank seal (x:204) so players cannot wander north out of the hollow on the east side.
    { x: 148, y: 18, width: 56, height: 10, type: 'cliff_face' },
    // Continue the north cliff wall eastward to x:261 (world 111) for a stronger visual boundary.
    { x: 204, y: 18, width: 57, height: 10, type: 'cliff_face' },
    // Fog gate south extension ? extends the east flank cliff face from y=28 (world -122)
    // to y=38 (world -112) so the visible cliff wall reaches further south from the hollow side.
    { x: 148, y: 28, width: 56, height: 11, type: 'cliff_face' },
    // East seal ? vertical cliff connecting the horizontal cliff band (y=28) to the north fort's
    // north wall (y=60). Blocks east bypass around the fort; only path through is the fort gate.
    { x: 218, y: 28, width: 8, height: 32, type: 'cliff_face' },

    // === THE HOLLOW ??? Corridor walls funneling player from bonfire to fog gate ===
    // Lower corridor returns to dead-tree walls deeper in the Hollow.
    { x: 100, y: 28, width: 16, height: 44, type: 'wall', fill: 'dead_tree' },
    { x: 130, y: 28, width: 18, height: 44, type: 'wall', fill: 'dead_tree' },

    // === HOLLOW WEST SEAL ? solid cliff barrier preventing flanking the corridor gate ===
    // The iron gate inside the corridor (placed at runtime, x:116-129, y:50-51) is between
    // two dead-tree walls which have visual gaps. Without a continuous cliff west of the
    // corridor, players slip past via the open Hollow apron. This block of cliff_face
    // extends the existing north cliff (x:100-147, y:2-17) westward and southward, ending
    // at a small corrupted pond. From there a wider cliff seals the wolf-den east exit.

    // North cliff extension west: continues the y:2-17 cliff face to x:54.
    { x: 54, y: 2, width: 46, height: 16, type: 'cliff_face' },
    // Vertical cliff east of pond: spans the full corridor height (y:18-71) so the
    // dead-tree corridor west wall has a solid cliff backing for its entire length.
    { x: 94, y: 18, width: 6, height: 54, type: 'cliff_face' },
    // Dry corrupted ground around the west-cliff stair mouth.
    { x: 88, y: 47, width: 6, height: 5, type: 'clearing', fill: 'hollow_blight' },
    // Wolf-den east seal: blocks the open ground between the wolf den (x:30-53) and the
    // pond/corridor so players cannot circle north from the wolf den toward the boss.
    { x: 54, y: 18, width: 34, height: 34, type: 'cliff_face' },
    // Corridor wall solid overlays at the iron gate latitude ? the dead_tree wall fill
    // leaves walkable gaps between tree sprites, so a player can step through the corridor
    // walls and flank the gate. These cliff_face strips at y:46-53 (gate at y:50-51) make
    // the walls fully solid across the 8 tile band around the gate on both sides.
    { x: 100, y: 46, width: 16, height: 8, type: 'cliff_face' },
    { x: 130, y: 46, width: 18, height: 8, type: 'cliff_face' },
    // East flank seal at gate latitude ? blocks the open ground east of the corridor east
    // wall up to the existing east-river bank seal at x:204. Without this strip, players
    // who slip through the dead_tree wall could walk freely north past the gate.
    { x: 148, y: 46, width: 56, height: 8, type: 'cliff_face' },
    // West bypass seal ? closes the open corridor between the hollow east wall (x=148) and
    // the north fort west wall (x=200) at y=54-70 (world -96 to -80). Combined with the
    // y=46-53 cliff above, this forms a continuous barrier that prevents players from walking
    // north alongside the fort's west side and bypassing the south gate.
    { x: 148, y: 54, width: 52, height: 17, type: 'cliff_face' },

    // Corrupted west-cliff stair shelf near world (-56,-98): an east-facing climb through the
    // Hollow cliff wall into a small hollow-blight/dirt landing, echoing the sentinel shelves.
    { x: 99, y: 48, width: 17, height: 9, type: 'clearing', fill: 'hollow_blight' },
    { x: 100, y: 51, width: 16, height: 3, type: 'clearing', fill: 'dirt' },
    { x: 113, y: 49, width: 3, height: 9, type: 'cliff_face' },
    // West-side gate seal: closes the left shelf from the cliff gap down one tile into the water.
    { x: 87, y: 53, width: 1, height: 12, type: 'wall', fill: 'iron_fence' },


    // === THE HOLLOW ??? Hunter trail camps ===
    { x: 130, y: 45, width: 8, height: 6, type: 'abandoned_camp', interactionId: 'hollow_hunter_camp_2' },
    { x: 118, y: 28, width: 10, height: 8, type: 'abandoned_camp' },

    // === HOLLOW APPROACH BARRIER ??? cliff_face forms the south river bank ===
    // Flanking prevention: players can only enter the Hollow via the decayed bridge at x=118???130.
    // The river (y=81???95) sits in the cliff channel; these cliff walls form the south bank at y=96.
    // West segment: map edge to x=118 (just west of bridge).
    { x: 4, y: 96, width: 114, height: 8, type: 'cliff_face' },
    // East segment: x=130 to x=242, narrow 4-tile gap at x=243-246 (world ~93-96), then x=247 to map edge.
    { x: 130, y: 96, width: 113, height: 8, type: 'cliff_face' },
    { x: 247, y: 96, width: 45, height: 8, type: 'cliff_face' },
    // Narrow canyon passage (x=243-246, 4 tiles wide). Dirt path prevents stampCliffs from
    // generating cliff art across the el=2→el=1 ledge transition (y=79-80) for the passage
    // columns. Height=8 covers only the ledge + cliff-body rows; tree scatter south of y=86
    // is cleaned by enforceHighlandPassageCorridor so no dirt spine appears in the cave.
    { x: 243, y: 79, width: 4, height: 8, type: 'path', fill: 'dirt' },
    // West canyon entrance wall: x=240-242, y=80-85 (height=6). Forms the tight cliff flanks
    // at the passage entrance. Ends at y=85 (world ~-65) so the corridor opens up below.
    { x: 240, y: 80, width: 3, height: 6, type: 'cliff_face' },
    // East canyon entrance wall: x=247-250, height=6 (y=80-85). Width=4 ensures x=250
    // (last tile of the elevation zone) is covered. Corridor opens below y=86.
    { x: 247, y: 80, width: 4, height: 6, type: 'cliff_face' },
    // Canyon corridor south seal: fills the barrier passage gap (x=243-246 was open) and
    // extends the wall to y=105 (world ~-45). x=242-247 spans both barrier-adjacent columns
    // and the passage columns so the full 6-tile band is solid cliff (world ~92-97, -54 to -45).
    { x: 242, y: 96, width: 6, height: 10, type: 'cliff_face' },
    // Spine corridor through the east-bank cliff sprite buffer (y=104-105).
    // placeCliffFace unconditionally marks those two rows walkable:false, but the main N-S
    // spine path (x:146-153) must remain passable. placeClearing overwrites unconditionally
    // (unlike placePath which skips non-PATH_BLOCKERS unwalkable tiles), so this restores the
    // two buffer rows to walkable dirt before stampCliffs runs its elevation check.
    { x: 146, y: 104, width: 8, height: 2, type: 'clearing', fill: 'dirt' },
    // East river bank seal ??? vertical cliff connecting the far hollow river's south edge (y=85)
    // to the east cliff barrier (y=96). Blocks eastern circumnavigation so the bridge is the
    // only way into the Hollow.
    { x: 204, y: 85, width: 4, height: 12, type: 'cliff_face' },
    // Dirt-spine roadway gate at world (112,-92), sealing the east hollow route.
    { x: 260, y: 58, width: 6, height: 1, type: 'wall', fill: 'iron_fence' },
    // East hollow horizontal gate: seals the route from world (76,-93) to (101,-93).
    { x: 226, y: 57, width: 26, height: 1, type: 'wall', fill: 'iron_fence' },
    // East map-edge cliff extension: carries the Hollow cliff to world (143,-91).
    { x: 292, y: 54, width: 6, height: 15, type: 'cliff_face' },
    // === FOREST LAKES ===
    { x: 240, y: 180, width: 20, height: 16, type: 'lake' },
    { x: 40, y: 200, width: 16, height: 12, type: 'lake' },
    { x: 180, y: 250, width: 22, height: 16, type: 'lake' },

    // === BRIDGES ===
    // Lake overlook crossing at world (~96,33): north-south bridge flush with cliff lips.
    // Side shoulders run up to the water edge; the stair throat is carved separately
    // so the bridge remains usable instead of being sealed by the cliff face.
    { x: 246, y: 176, width: 2, height: 6, type: 'cliff_face' },
    { x: 252, y: 176, width: 2, height: 6, type: 'cliff_face' },
    { x: 246, y: 196, width: 8, height: 4, type: 'cliff_face' },
    // Seal the lower-left lake overlook approach so the intended entry is the upper
    // grass landing at world (~102,25), not the bridge shoulder near world (90,42).
    { x: 240, y: 192, width: 7, height: 4, type: 'cliff_face' },
    { x: 239, y: 197, width: 8, height: 5, type: 'cliff_face' },
    // Close the southeast lake-overlook gap so the cliff reads as one sealed ledge.
    { x: 254, y: 193, width: 5, height: 5, type: 'cliff_face' },
    // Connect the far-east cliff seam and clear the tree at world (~143,45).
    { x: 292, y: 193, width: 3, height: 6, type: 'cliff_face' },
    // Water channel under the overlook cliff, joining the west lake to the east water.
    { x: 259, y: 184, width: 36, height: 9, type: 'lake' },
    { x: 248, y: 180, width: 4, height: 16, type: 'bridge' },

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

    // === WATERFALL (north) ??? large summit cascade; clearing placed first, fall overwrites the chasm
    { x: 126, y: 36, width: 48, height: 16, type: 'clearing', fill: 'grass' },
    { x: 140, y: 4, width: 30, height: 36, type: 'waterfall' },

    // === TEMPLE (east) ??? removed; the cliff_face at (238,118,30,56) buries the structure.
    // Ruins props and relocated interactables fill the accessible corridor (x=268-274).

    // === PRECIPICE RESERVE CALDERA (far north-east) ===
    // The center is intentionally far beyond the playable bounds: the player only sees
    // the lower-left lip of a much larger circular mountain mass.
    { x: 250, y: -54, width: 120, height: 118, type: 'volcano' },

    // === FIELD BOSS ARENA ??? stone golem guards the south approach to the fort ===
    { x: 210, y: 175, width: 20, height: 18, type: 'boss_arena', interactionId: 'golem_boss' },

    // === ENCHANTED GROVES with plant monsters ===
    { x: 70, y: 140, width: 30, height: 26, type: 'enchanted_grove' },
    // Vine-choked ruin on the grove's north lip (~world -81, -9); unenterable set dressing.
    // Former heresy altar tile; Olwen's hut before the blight (see cemetery dialogue).
    { x: 66, y: 138, width: 5, height: 5, type: 'cottage', interactionId: 'hollow_ruin_4' },
    { x: 240, y: 240, width: 24, height: 22, type: 'enchanted_grove' },
    { x: 50, y: 260, width: 26, height: 22, type: 'enchanted_grove' },

    // === FORTS (strategic positions) ===
    // Forest fort relocated to the river's east terminus ??? spans the crossing so the key
    // gate is south-facing (player approach) and north exit leads to the post-river corridor.
    // Stone golems guard the approach; the vine-monster grove is the key-free western alternate.
    { x: 222, y: 153, width: 16, height: 15, type: 'fort', interactionId: 'forest_fort' },
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
    // Ruined shell (matches forest_hermit treatment) ??? was an enterable woodcutter hut; chest moved outside.
    { x: 90, y: 170, width: 6, height: 6, type: 'cottage', interactionId: 'woodcutter_cottage_ruin' },
    { x: 230, y: 130, width: 6, height: 6, type: 'cottage' },
    // Flat grass shelf west of cliff-1 ??? cleared before the cliff stamps so trees don't seal the bypass trail.
    // Cliff-1 (x=60+) overwrites the overlap zone; only x=44-59 survives as walkable grass.
    { x: 44, y: 180, width: 35, height: 33, type: 'clearing', fill: 'grass' },
    // Mid-plateau observatory plot ? world (-36, -13); sized for expanded foundation mask.
    { x: 106, y: 126, width: 16, height: 18, type: 'clearing', fill: 'grass' },

    // Hunter shack is teased from below, then reached by wrapping around a cliff-backed approach.
    { x: 60, y: 186, width: 62, height: 26, type: 'cliff_face' },
    // West cliff overlook: east-facing stair at world (-70,42) into a small grass pocket.
    { x: 87, y: 189, width: 12, height: 8, type: 'clearing', fill: 'grass' },
    // Lower west sentinel overlook ? landing at stair top UI ~-79..-73, 52..55 (center -76,53).
    { x: 71, y: 202, width: 7, height: 3, type: 'clearing', fill: 'grass' },
    { x: 134, y: 182, width: 6, height: 6, type: 'cottage', interactionId: 'hunter_cottage', interiorMap: 'interior_hunter_cottage', interiorSpawnX: 6, interiorSpawnY: 8 },
    { x: 108, y: 196, width: 28, height: 14, type: 'ruined_fort', interactionId: 'hunter_gate_ruin' },
    { x: 136, y: 192, width: 72, height: 18, type: 'cliff_face' },
    // Collapsed cottage north of the iron fence ??? facade is cottage_house_forest_ruined, yard is
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

    // === SE FORGOTTEN SHRINE ? hidden discovery in the SE void quadrant ===
    // Fills the empty 30?30 grass void at (240-269, 240-269). A small overgrown shrine
    // guarded by vine plants ? rewards players who wander off the main path east.
    { x: 248, y: 248, width: 14, height: 12, type: 'clearing', fill: 'dirt' },
    { x: 250, y: 250, width: 10, height: 8, type: 'ruins', interactionId: 'forgotten_shrine' },

    // === RELOCATED RANGER CABIN (hidden SE hills, world 86, 77) ===
    { x: 232, y: 224, width: 12, height: 10, type: 'clearing', fill: 'grass' },
    { x: 236, y: 227, width: 10, height: 8, type: 'inn_building', interactionId: 'ranger_cabin', interiorMap: 'interior_ranger_cabin', interiorSpawnX: 7, interiorSpawnY: 5 },

    // === SOUTH QUADRANT POIs (below y:250 ??? fills the empty stretch before the village portal) ===
    { x: 200, y: 260, width: 16, height: 12, type: 'abandoned_camp', interactionId: 'southern_outpost' },
    // Abandoned shack prop only (ruined facade + overgrowth); no interior ??? see placeCottage forest_hermit branch.
    { x: 60, y: 270, width: 6, height: 6, type: 'cottage', interactionId: 'forest_hermit' },
    { x: 250, y: 270, width: 10, height: 14, type: 'church', interactionId: 'overgrown_shrine' },
    { x: 176, y: 176, width: 18, height: 14, type: 'clearing', fill: 'grass' },
    { x: 104, y: 180, width: 14, height: 12, type: 'clearing', fill: 'dirt' },

    // === RUINED WAYSTATION ??? collapsed ranger rest stop on the golem approach ===
    { x: 190, y: 167, width: 18, height: 8, type: 'clearing', fill: 'dirt' },
    { x: 191, y: 168, width: 5, height: 4, type: 'cottage' },
    { x: 201, y: 167, width: 5, height: 4, type: 'cottage' },
    { x: 196, y: 174, width: 5, height: 4, type: 'broken_wagon' },

    // === HOLLOW EDGE RUINS ? abandoned cottages overgrown with vines and moss ===
    // Set-dressing only (no interaction). Sits in the corruption-blend band (y:57-77),
    // where the Hollow's hollow_blight gradually thins back into forest grass. The
    // hollow_ruin interactionId prefix routes placeCottage to the ruined forest facade
    // (cottage_house_forest_ruined) and skips the door/threshold so they read as
    // abandoned wreckage. Spaced ~16-18 tiles apart with slight y jitter.
    { x: 138, y: 65, width: 5, height: 5, type: 'cottage', interactionId: 'hollow_ruin_1' },
    { x: 156, y: 66, width: 5, height: 5, type: 'cottage', interactionId: 'hollow_ruin_2' },
    { x: 175, y: 64, width: 5, height: 5, type: 'cottage', interactionId: 'hollow_ruin_3' },

    // === MAIN TRAILS: basin to ridge, then branching into shelves ===
    // South portal spine: starts around world y=67 so the portal road ties back into
    // the main progression shelf instead of fading into grass.
    { x: 146, y: 217, width: 8, height: 79, type: 'path', fill: 'dirt' },
    // height: 11 (was 10) ? extends to y=194, explicitly carving through cliff B so the approach
    // row south of the corridor is dirt rather than relying on cleanupIllogicalPlacements to clear
    // adjacent cliff tiles. Cliff B at y=195 (north wall of secluded shelf) is unaffected; the
    // shelf seal is intact because the player inside the shelf (y=196+) still can't cross y=195.
    { x: 132, y: 184, width: 42, height: 11, type: 'path', fill: 'dirt' },
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
    // Outpost gate seal: blocks the high apron by the mossy house so progress routes closer to the water.
    { x: 156, y: 184, width: 52, height: 8, type: 'cliff_face' },

    // === HUNTER CLIFF SHELF ? single-entrance secluded spot ===
    // Layout (south ? north): approach buffer ? lower stairway ? secluded shelf.
    // One entrance (lower stairway at y=204?211) leads to one enclosed area (y=196?203).
    // The clearing is placed AFTER cliff B (y=192?209) so grass overwrites cliff art only
    // inside the carved bounds. Cliff B rows y=192?195 remain as cliff ? they form the
    // north wall that seals the shelf against the iron gate, making the stairway the only
    // way in. A companion el0 force zone prevents stampCliffs from re-stamping cliff art
    // over the carved tiles; path tiles at y=178?183 stop stampCliffs at the zone's north
    // boundary so no spurious cliff_edge is generated at y=184.
    //
    // Secluded shelf: enclosed grass inside cliff B (y=196?203).
    { x: 161, y: 196, width: 10, height: 8, type: 'clearing', fill: 'grass' },
    // Approach strip ? restores the cliff-B sprite-buffer rows (y=210?211) and two ground
    // rows below (y=212?213) to walkable so the stairway base is passable from the south.
    { x: 161, y: 210, width: 8, height: 4, type: 'clearing', fill: 'grass' },

    // === EAST CLIFF GRASS PATCH ? second secluded pocket, entered via EW stairway ===
    // Accessed from inside the secluded shelf: walk east off x=170 onto the EW stairway
    // (x=171?176) which bores eastward through cliff B, emerging into a second enclosed
    // grass clearing (x=177?184, y=197?202). Cliff B seals all four sides with ample buffer:
    // 5 rows on the north wall (y=192?196), 7 rows on the south wall (y=203?209), 7 cols
    // on the east wall (x=185?207). The stairway is the only entrance.
    { x: 177, y: 196, width: 28, height: 6, type: 'clearing', fill: 'grass' },
    // Explicit overlook caps: keep the grass patch as a cliff-top pocket and prevent the
    // ruined-town stamps/cleanup passes from reopening a walkable route east or south.
    { x: 191, y: 196, width: 17, height: 14, type: 'cliff_face' },
    { x: 177, y: 202, width: 28, height: 8, type: 'cliff_face' },
    // Third overlook pocket reached by another east-west stair from the larger grass patch.
    // Kept intentionally compact so it reads as a cliff landing, not a broad plateau.
    { x: 177, y: 196, width: 28, height: 6, type: 'clearing', fill: 'grass' },
    { x: 205, y: 196, width: 34, height: 16, type: 'cliff_face' },
    { x: 177, y: 202, width: 62, height: 10, type: 'cliff_face' },
    // Fourth overlook shelf: reached from the third pocket by a north-south stair, then
    // runs west as a long cliff-top grass stretch.
    { x: 177, y: 187, width: 28, height: 6, type: 'clearing', fill: 'grass' },
    // Final small lookout reached by a skinny north stair from the west end of the shelf.
    { x: 174, y: 180, width: 7, height: 4, type: 'clearing', fill: 'grass' },
    { x: 171, y: 180, width: 3, height: 7, type: 'cliff_face' },
    { x: 174, y: 177, width: 12, height: 3, type: 'cliff_face' },
    { x: 181, y: 180, width: 5, height: 7, type: 'cliff_face' },
    { x: 174, y: 184, width: 12, height: 3, type: 'cliff_face' },
    { x: 174, y: 187, width: 3, height: 9, type: 'cliff_face' },
    { x: 174, y: 177, width: 12, height: 3, type: 'cliff_face' },
    { x: 171, y: 180, width: 3, height: 7, type: 'cliff_face' },
    { x: 181, y: 180, width: 5, height: 7, type: 'cliff_face' },
    { x: 177, y: 184, width: 44, height: 3, type: 'cliff_face' },
    { x: 205, y: 187, width: 16, height: 9, type: 'cliff_face' },
    { x: 177, y: 193, width: 44, height: 3, type: 'cliff_face' },

    // Shortcut connector between the Disparaged Cottage approach and the ranger plateau.
    { x: 124, y: 202, width: 6, height: 12, type: 'path', fill: 'dirt' },
    { x: 120, y: 212, width: 10, height: 4, type: 'path', fill: 'dirt' },
    { x: 126, y: 218, width: 22, height: 4, type: 'path', fill: 'dirt' },
    { x: 146, y: 214, width: 4, height: 18, type: 'path', fill: 'dirt' },
    // Small cemetery on hunter shelf - must be after y=204–219 path strips or dirt overwrites gate (walkable) and nibbles the back fence.
    // eastOpenDY=9 opens a 3-tile gap in the east fence at dy=8–10 (tile y=214–216, world ~10,64–66) as a second entrance.
    { x: 144, y: 206, width: 16, height: 14, type: 'cemetery', eastOpenDY: 9, eastOpenHalf: 1 },

    // === IRON GATE PROGRESSION SPINES - west bypass → lever + Disparaged Cottage ===
    // North spur to the shortcut lever (127,196). Stops at y=197 so world y=48 stays cliff face.
    { x: 122, y: 190, width: 8, height: 8, type: 'path', fill: 'dirt' },
    // Links the west stair inlet into the shelf - stops at x=105 so it never cuts the cliff east face (106+).
    { x: 99, y: 196, width: 6, height: 2, type: 'path', fill: 'dirt' },
    // Westward fork off the Iron Gate plateau - steers away from the east fort artery at y=178.
    // Dirt only east of cliff-1 (x≥122); x=106–121 stays cliff_face like pre-spine layout.
    { x: 122, y: 200, width: 10, height: 5, type: 'path', fill: 'dirt' },
    // Restore cliff shelf east face (world ~-44..-33, y~40–45 and ~50–53). Stops at y=195 so
    // the west-only shelf connector (x≤105) stays walkable; lever access is via x≥122 spur.
    { x: 106, y: 190, width: 16, height: 6, type: 'cliff_face' },
    { x: 106, y: 200, width: 16, height: 5, type: 'cliff_face' },
    // Disparaged Cottage (236,227): southeast spur from the bypass loop, below the cemetery fence.
    { x: 148, y: 221, width: 90, height: 4, type: 'path', fill: 'dirt' },
    { x: 232, y: 221, width: 8, height: 10, type: 'path', fill: 'dirt' },
    // === NE RIDGE DESCENT CORRIDOR ??? links mid-zone stairway to eastern spine ===
    // North-south spur from stairway base (y???123) south to the east-west artery at y=178.
    // The existing path {x:154,y:178,w:80} already covers the full horizontal span so no
    // extra connector is needed ??? the spur hits it naturally at y=178.
    { x: 201, y: 123, width: 4, height: 56, type: 'path', fill: 'dirt' },

    // River cut separating the skeleton shelf from the bonfire/shortcut shelf until the loop reconnects farther east.
    { x: 86, y: 196, width: 22, height: 18, type: 'wall', fill: 'water' },
    { x: 90, y: 208, width: 20, height: 18, type: 'wall', fill: 'water' },
    { x: 94, y: 222, width: 18, height: 16, type: 'wall', fill: 'water' },
    { x: 98, y: 234, width: 14, height: 12, type: 'wall', fill: 'water' },
    { x: 68, y: 206, width: 20, height: 22, type: 'cliff_face' },
    { x: 120, y: 218, width: 8, height: 12, type: 'cliff_face' },

    // === SOUTH FORT CLIFF SHELF ??? carved AFTER cliff_faces so grass overwrites cliff art ===
    // Inner shelf: natural grass inside the cliff body, reachable via two stairways.
    { x: 64, y: 190, width: 16, height: 8, type: 'clearing', fill: 'grass' },
    // Cliff-top grass ??? continuous with the main forest surface above, flows into the NS stairs.
    { x: 60, y: 178, width: 20, height: 8, type: 'clearing', fill: 'grass' },

    // === SENTINEL PLATEAU GATING ??? prevents bypassing the Stone Sentinels ===
    // Cliff barrier extending west from cliff-1 to the map edge. Players on the bypass trail
    // can see the cliff but cannot walk east onto the cliff-top. The only access to the
    // sentinel chest is: bypass trail ??' west stairway (55,194) ??' inner sanctum ??' NS stairway (68,185).
    // Main cliff wall: runs from map edge past the bypass trail to x=59 (y=184-189).
    // The ruined_west_fort (30,170,16,14) blocks y=170-183 above; this cliff seals below it.
    // The bypass trail path at (54,180,4,35) is placed later and carves a 4-tile passage at
    // x=54-57; the cliff at x=58-59 remains solid and merges with cliff-1 at x=60, y=186.
    { x: 4, y: 184, width: 56, height: 6, type: 'cliff_face' },
    // Dense tree line sealing the gap between the bypass trail (x=54-57) and the cliff-top
    // plateau (x=60-79) for y=178-185. Below y=185 the cliff_face above handles the seal.
    { x: 58, y: 178, width: 3, height: 6, type: 'wall', fill: 'tree' },
    // Dirt road extension ??? wraps west across the cliff-top shelf and south to the bypass trail.
    // Placed AFTER the grass clearing + tree wall so dirt overwrites them.
    { x: 54, y: 178, width: 26, height: 6, type: 'path', fill: 'dirt' },

    // === CLIFF BARRIER ??? continuous east-west barrier broken only by grove gap + fort ===
    // West segment: map edge ??' enchanted grove gap at x=68.
    { x: 4, y: 114, width: 64, height: 8, type: 'cliff_face' },
    // Central segment: east of grove gap ??' river/fort area. Stairway gap at x=148-151 lets
    // post-fort players progress north after crossing. Split into sub-segments so the
    // cliff-top walkway clearing (x=198-227, y=114-121) can override the middle section.
    { x: 100, y: 114, width: 48, height: 8, type: 'cliff_face' },
    { x: 152, y: 114, width: 46, height: 8, type: 'cliff_face' },
    // East sub-segment: from cliff-top exit (x=228) to the vertical column.
    { x: 228, y: 114, width: 4, height: 8, type: 'cliff_face' },
    // East seal on the stairway-gap approach ??? blocks players from walking west along y=107-113
    // from the highland east to the lantern-lit ridge connector path; forces cliff corridor entry.
    // Extended north to y=107 to also seal the upper approach at UI (8, -43).
    { x: 154, y: 104, width: 4, height: 18, type: 'cliff_face' },
    // Permanent iron fence at the dirt-spine junction (runtime syncHollowApproachSpineGateState,
    // x=145, y=112-113 / world ~-4,-37) ? single vertical picket sealing the ridge corridor mouth.
    // Hollow approach ladder cliff extension ??? continuous cliff face from the stairway (x=115)
    // to the dirt path corridor (x=146). Stops before the main N-S trail so it stays walkable.
    { x: 116, y: 107, width: 30, height: 4, type: 'cliff_face' },
    // East wall of the hollow-approach overlook pocket (x=117-118, y=103-107).
    // Seals the full east edge of the chest ledge so the player cannot walk east off the
    // overlook. The coiled ladder gate at x=119, y=107 (runtime) is the only exit east.
    { x: 117, y: 103, width: 2, height: 5, type: 'cliff_face' },

    // === CLIFF-TOP WALKWAY ??? walkable grass layer on top of the central cliff ===
    // Same pattern as the sentinel plateau: clearing placed AFTER cliff_face features
    // so grass overwrites cliff art. Entry stair at south face (x=203), exit stair at
    // north face (x=223). Elevation zone (el1) matches the highlands so stampCliffs
    // does not re-stamp cliff art on the north boundary.
    // Width=30 (x=198-227) stops before the east cliff sub-segment at x=228.
    { x: 198, y: 114, width: 30, height: 8, type: 'clearing', fill: 'grass' },
    // North-face cliff barrier ??? forces the player to use the exit stairway at x=223-227
    // rather than walking directly south from the highland chest area onto the walkway.
    // Gap left at x=223-227 for the stairway; east sealed against the x=228 sub-segment.
    { x: 198, y: 112, width: 25, height: 2, type: 'cliff_face' },
    { x: 228, y: 112, width: 2, height: 2, type: 'cliff_face' },
    // South-face plug ??? seals x=208-217 between the entry stair east edge (x=208) and the
    // vertical column west edge (x=218), making the stair the only way up from below.
    { x: 208, y: 121, width: 10, height: 6, type: 'cliff_face' },
    // Vertical cliff column ??? narrower (4 wide) so the north-bank corridor can reach the fort exit.
    { x: 218, y: 118, width: 4, height: 38, type: 'cliff_face' },
    // East wall: blocks bypass east of the fort.
    { x: 238, y: 118, width: 30, height: 56, type: 'cliff_face' },
    // Cliff plugs sealing the grass (left) and sand (right) side passages ???
    // forces the player through the central dirt corridor only.
    { x: 227, y: 121, width: 1, height: 6, type: 'cliff_face' },
    { x: 233, y: 121, width: 5, height: 6, type: 'cliff_face' },
    // Ridge connector ??? stairway gap (x=148-151) to the central spine.
    { x: 146, y: 110, width: 8, height: 6, type: 'path', fill: 'dirt' },

    // === WESTERN BYPASS ??? placed AFTER all cliffs so these tiles override buffer rows ===
    // Cliff-1 buffer marks y=212-213, x=60-121 non-walkable.  The west-cliff marks x=68-87,
    // y=206-227 non-walkable.  This clearing restores a walkable strip so the bypass trail
    // and its east-west connector can stamp passable dirt on top.
    // Split around the river (x=90-109) so water remains visible under the bridge.
    { x: 44, y: 213, width: 46, height: 6, type: 'clearing', fill: 'grass' },
    { x: 110, y: 213, width: 26, height: 6, type: 'clearing', fill: 'grass' },
    // South grass lip under cliff-spin (path ends y=217); fence stamps on this row like the north cap at y=213.
    { x: 60, y: 218, width: 28, height: 1, type: 'clearing', fill: 'grass' },
    // Narrow dirt trail pressed against cliff-1's west face (x<60, safe from cliff stamps).
    // Split around the sentinel cliff_face (y=184-189) so cliff texture stays visible.
    { x: 54, y: 169, width: 4, height: 15, type: 'path', fill: 'dirt' },
    { x: 54, y: 190, width: 4, height: 25, type: 'path', fill: 'dirt' },
    // East-west connector: split around the river crossing; bridge spans the water.
    { x: 54, y: 214, width: 36, height: 4, type: 'path', fill: 'dirt' },
    { x: 110, y: 214, width: 18, height: 4, type: 'path', fill: 'dirt' },
    // Plank bridge over the river ??? rickety crossing to the ornamental broadsword shelf.
    { x: 90, y: 214, width: 20, height: 4, type: 'bridge' },

    // === SOUTH-BANK ARTERY ??? chapel (west) to fort (east) ===
    // Segment 1: chapel to the start of the river's south meander (x=50???186, y=165???169).
    // Stops before Curve 1 at x=187 to avoid overlapping the water.
    { x: 50, y: 165, width: 136, height: 5, type: 'path', fill: 'dirt' },
    // Segment 2: curves south around the deep meander (Curve 2 belly is at y=170),
    // then leads east to the fort's south gate approach (x=186???234, y=167???177).
    { x: 186, y: 167, width: 48, height: 11, type: 'path', fill: 'dirt' },

    // === MID-ZONE CORRIDOR ??? tree walls channelling the south bank toward the fort ===
    // Light tree cover west of the fort approach; not a hard wall, just visual guidance.
    { x: 170, y: 138, width: 10, height: 14, type: 'wall', fill: 'tree' },
    { x: 196, y: 142, width: 8, height: 12, type: 'wall', fill: 'tree' },

    // === RUINED RANGER CHECKPOINT ??? world ~(53, 7) ===
    // Burned-out patrol post on the ridge descent path. Tells the story of the ranger
    // collapse before the player reaches the fort.
    { x: 205, y: 132, width: 12, height: 12, type: 'ruins' },

    // === ONE-WAY FUNNEL GATING ??? seals plateau exits so players flow toward chapel/fort ===
    // East artery block: cliff wall at the plateau's east edge stops the y=178 artery
    // from leading into the temple/skeleton terrace. Visible but unreachable for now.
    { x: 152, y: 172, width: 6, height: 14, type: 'cliff_face' },
    // North spine block: short cliff band on the spine (y=148?151 only). Blocks going further
    // north toward the chapel; must not extend to y=153 or it seals the broken-bridge descent.
    { x: 144, y: 148, width: 10, height: 4, type: 'cliff_face' },

    // === WATERFALL BASE ??? mossy stone pool ===
    { x: 176, y: 46, width: 4, height: 3, type: 'clearing', fill: 'mossy_stone' },

    // === SOUTH ENTRY ? broken wagon clearing ===
    { x: 142, y: 276, width: 6, height: 4, type: 'clearing', fill: 'dirt' },

    // === SOUTH SPINE SOFT FUNNELS ? light tree walls east + west of the spine path (x:146-154,
    // y:240-260) to gently nudge wandering players back toward the marked trail without sealing
    // off exploration. Each wall is small (6?6 or 8?6); players can still walk around them.
    { x: 172, y: 244, width: 8, height: 6, type: 'wall', fill: 'tree' },
    { x: 175, y: 256, width: 6, height: 6, type: 'wall', fill: 'tree' },
    { x: 128, y: 245, width: 6, height: 6, type: 'wall', fill: 'tree' },
    { x: 125, y: 256, width: 8, height: 6, type: 'wall', fill: 'tree' },

    // ============================================================
    // === CREEK SYSTEMS ??? winding water channels with bridges ===
    // ============================================================

    // --- South-east creek: runs from (200,230) curving south-east toward (260,270) ---
    { x: 200, y: 232, width: 30, height: 3, type: 'wall', fill: 'water' },
    { x: 228, y: 234, width: 3, height: 16, type: 'wall', fill: 'water' },
    { x: 230, y: 248, width: 20, height: 3, type: 'wall', fill: 'water' },
    { x: 248, y: 250, width: 3, height: 14, type: 'wall', fill: 'water' },
    { x: 215, y: 232, width: 6, height: 3, type: 'bridge' },
    { x: 228, y: 240, width: 3, height: 4, type: 'bridge' },
    { x: 238, y: 248, width: 6, height: 3, type: 'bridge' },
    // Creek-to-lake connector ? flowy overlap from world ~(48,83) down to ~(42,100).
    { x: 197, y: 233, width: 8, height: 5, type: 'wall', fill: 'water' },
    { x: 194, y: 237, width: 8, height: 5, type: 'wall', fill: 'water' },
    { x: 190, y: 241, width: 9, height: 5, type: 'wall', fill: 'water' },
    { x: 186, y: 245, width: 10, height: 5, type: 'wall', fill: 'water' },
    { x: 184, y: 248, width: 12, height: 5, type: 'wall', fill: 'water' },
    // Broken west lake bridge: visual route from world (32,109) to (51,109),
    // with a missing middle span so it stays non-functional.
    // West stub extended 1 tile east (now x:182–189); east stub extended 2 tiles west (now x:193–201).
    // This narrows the gap to x:190–192 (3 tiles) so the plank shortcut reads believably.
    { x: 182, y: 258, width: 8, height: 3, type: 'bridge' },
    { x: 193, y: 258, width: 9, height: 3, type: 'bridge' },
    // Stair-top picket run ? touches the north stair edge and continues west to the map edge.
    { x: 6, y: 192, width: 54, height: 1, type: 'wall', fill: 'fence' },
    // Connector below the stair-top run ? world (-91,43), still north of the stair tiles.
    { x: 59, y: 193, width: 1, height: 1, type: 'wall', fill: 'fence' },
    // Stair-side picket run ? touches the south stair edge and connects into the bypass cap.
    { x: 59, y: 198, width: 1, height: 17, type: 'wall', fill: 'fence' },
    // West-bank picket cordon ? flush with the cliff at world y=60; water starts at y=82.
    { x: 205, y: 210, width: 1, height: 20, type: 'wall', fill: 'fence' },
    // Rocky-shore sand divide ? world (-40, 97); chest on west side at ~(-45, 97).
    { x: 110, y: 246, width: 1, height: 2, type: 'wall', fill: 'fence' },
    // Bypass plank bridge (~world -68, 66) ? horizontal pickets along cliff-spin bands north + south of the trail.
    // North cap sits one row off the cliff sprite so the grass lip remains visible.
    { x: 60, y: 214, width: 28, height: 1, type: 'wall', fill: 'fence' },
    { x: 60, y: 218, width: 28, height: 1, type: 'wall', fill: 'fence' },
    // --- West creek: short grove outlet (original reach ? does not run the full south spine) ---
    { x: 38, y: 212, width: 3, height: 20, type: 'wall', fill: 'water' },
    { x: 36, y: 230, width: 14, height: 3, type: 'wall', fill: 'water' },
    { x: 38, y: 220, width: 3, height: 4, type: 'bridge' },
    // --- South entry stream: start-portal water only (world y ~= 120-144) ---
    // A carved meander built from 3 overlapping blocks so the bend has no inner peninsula.
    // Max water width = 20 tiles (down from 22). Stays at/south of world y=120.
    { x: 110, y: 284, width: 12, height: 12, type: 'wall', fill: 'water' },
    { x: 118, y: 276, width: 16, height: 10, type: 'wall', fill: 'water' },
    { x: 126, y: 270, width: 20, height: 8, type: 'wall', fill: 'water' },
    { x: 154, y: 270, width: 40, height: 8, type: 'wall', fill: 'water' },
    // Main dirt-spine crossing ? bridge matches portal spine (x:146, width: 8) and spans the full water depth.
    { x: 146, y: 270, width: 8, height: 8, type: 'bridge' },
    // --- South entry ? south lake connector: 4-block taper, gently bending west as it flows from
    //     the lake (180,250,22x16) down into the east river segment. Mirrors the carved overlap
    //     pattern used by the eastern fort river bend (overlapping rectangles, monotonic taper).
    { x: 188, y: 263, width:  6, height: 3, type: 'wall', fill: 'water' },
    { x: 186, y: 265, width: 10, height: 3, type: 'wall', fill: 'water' },
    { x: 184, y: 267, width: 12, height: 3, type: 'wall', fill: 'water' },
    { x: 182, y: 269, width: 14, height: 3, type: 'wall', fill: 'water' },

    // --- Central-east stream: descends from east of golem arena (240,170) south ---
    { x: 264, y: 165, width: 3, height: 22, type: 'wall', fill: 'water' },
    { x: 264, y: 185, width: 14, height: 3, type: 'wall', fill: 'water' },
    { x: 264, y: 174, width: 3, height: 4, type: 'bridge' },

    // ============================================================
    // === CLIFF FACES & ROCKY RIDGES ??? natural barriers ===
    // ============================================================

    // --- East ridge: rocky shelf sealing the far-east bypass ---
    // Match the full el1 shelf width so Cliff Cemetery cannot route north around the shortcut.
    { x: 282, y: 100, width: 15, height: 50, type: 'cliff_face' },
    // Seal the two buffer rows (y:150-151) on the west side of the stairway (x:282-289). The
    // main cliff face above ends at y:149; the walkability buffer it sets at y:150-151 gets
    // scrubbed back to walkable grass by scrubDecorationsAdjacentToCliffs whenever a procedural
    // fallen_log (or other POST_CLIFF_DECOR_TYPES tile) lands there. Explicit cliff_face tiles
    // here are not in POST_CLIFF_DECOR_TYPES so the scrub pass leaves them alone, ensuring the
    // only entrance to the Cliff Cemetery is the stairway at x:290-295.
    { x: 282, y: 149, width: 8, height: 3, type: 'cliff_face' },
    // Seal the left sand lane beside the cliff-corridor shortcut so the ladder column is the
    // only north-south break through this seam.
    { x: 268, y: 118, width: 1, height: 14, type: 'cliff_face' },
    // Compact el1 stair landing (x=256-263, y=113-118) - placed AFTER the broad cliff_face so
    // it carves only the pocket reached by the traditional stairway at x=260-262.
    { x: 256, y: 113, width: 8, height: 6, type: 'clearing', fill: 'grass' },
    // Cliff caps around the landing keep this as an enclosed alcove instead of a ledge that
    // spills east into the corridor. The open side is the stairway itself.
    { x: 256, y: 112, width: 8, height: 1, type: 'cliff_face' },
    { x: 255, y: 113, width: 1, height: 6, type: 'cliff_face' },
    { x: 264, y: 113, width: 5, height: 21, type: 'cliff_face' },
    // Corridor gap (x=269-271, y=125-139) - clears forest trees from the open slot east of the
    // sealed alcove. RuntimeMapFlow keeps the ladder sides clipped by cliff, with the usable
    // lower dismount on the east side around x=269, y=128 (world 119,-22).
    { x: 269, y: 125, width: 3, height: 7, type: 'clearing', fill: 'grass' },
    { x: 269, y: 132, width: 3, height: 8, type: 'clearing', fill: 'grass' },
    // Cliff separator between the shortcut strip and the nearby enemy arena.
    // Covers roughly world (118,-15) through (123,20).
    { x: 268, y: 135, width: 6, height: 36, type: 'cliff_face' },

    // --- EAST RIDGE ASCENT: optional winding descent into the empty cliff void SOUTH of the
    // ladder overlook (screen-up; larger tile-Y renders upward). Dead-end reward branch carved
    // through the cliff block between the homestead (west, x<=237) and the cliff-corridor/terrace
    // (east, x>=260); 3-tile cliff buffers on both sides keep it isolated from the story route.
    // See enforceEastRidgeAscent for the authoritative carve (these clearings keep props off).
    // C1: connector ledge linking the ladder overlook (x>=260) west to the throat.
    { x: 248, y: 129, width: 14, height: 2, type: 'clearing', fill: 'grass' },
    // C2: throat dropping south off the ledge into the void.
    { x: 248, y: 131, width: 4, height: 6, type: 'clearing', fill: 'grass' },
    // C3: first switchback turning west.
    { x: 241, y: 134, width: 11, height: 3, type: 'clearing', fill: 'grass' },
    // C4: long west leg descending south.
    { x: 241, y: 136, width: 4, height: 15, type: 'clearing', fill: 'grass' },
    // C5: switchback shelf turning east. Stops at x251 so a thick cliff wall (x252-255) keeps the
    // first-half approach from touching the second-half climb / summit field to the east.
    { x: 241, y: 148, width: 11, height: 3, type: 'clearing', fill: 'grass' },
    // C6: corridor descending south to the mid-point landing, held at x248-251 (world ~99) so it
    // stays well west of the second-half wrap.
    { x: 248, y: 150, width: 4, height: 10, type: 'clearing', fill: 'grass' },
    // C7: mid-point landing bowl (halfway rest; was the old arena).
    { x: 243, y: 157, width: 13, height: 7, type: 'clearing', fill: 'grass' },
    // --- Extension (second half): wrap east then climb north toward the ladder, ending on a
    // higher cliff tier (el2) that overlooks the ladder shortcut. Doubles the route length. ---
    // E1: right leg east off the landing into the void.
    { x: 255, y: 159, width: 8, height: 3, type: 'clearing', fill: 'grass' },
    // E2: lengthened north leg climbing the cliff void back toward the ladder layer.
    { x: 259, y: 147, width: 4, height: 15, type: 'clearing', fill: 'grass' },
    // E3: open summit field (el2) with the end-of-road Ridge Revenant + Tempered Core. Pushed north
    // (top edge ~world y -11) and the south-west corner shaved off versus the C5 shelf, so the
    // reward can't be glimpsed "across the cliff" from the main route below.
    { x: 256, y: 139, width: 10, height: 8, type: 'clearing', fill: 'grass' },

    // --- South-east rocky shelf ---
    { x: 205, y: 240, width: 24, height: 8, type: 'cliff_face' },
    // Small south-east corridor seal near world (75,100).
    { x: 225, y: 248, width: 4, height: 5, type: 'cliff_face' },

    // --- Central-south ridge: separates cemetery area from south trail ---
    { x: 106, y: 248, width: 20, height: 6, type: 'cliff_face' },

    // --- Far east rocky spur ---
    { x: 285, y: 200, width: 10, height: 20, type: 'cliff_face' },

    // ============================================================
    // === ROCKY OUTCROPS & STONE CLEARINGS ===
    // ============================================================

    // --- Quarry - lower west shelf (one continuous dig site with the main pit; abuts its west rim at x228) ---
    { x: 212, y: 212, width: 16, height: 10, type: 'clearing', fill: 'quarry_bedrock' },
    { x: 214, y: 214, width: 11, height: 6, type: 'clearing', fill: 'quarry_floor' },
    { x: 216, y: 215, width: 6, height: 3, type: 'clearing', fill: 'cobblestone' },

    // --- Ancient stone circle (far east, x:285, y:140) ---
    { x: 285, y: 140, width: 12, height: 10, type: 'clearing', fill: 'mossy_stone' },
    { x: 288, y: 143, width: 6, height: 4, type: 'clearing', fill: 'ruins_floor' },

    // --- Rocky shelf south of entry (fills x:200-230, y:270-285) ---
    { x: 200, y: 275, width: 18, height: 10, type: 'clearing', fill: 'stone' },

    // --- Mossy ruins east of spine (x:170, y:130) ---
    { x: 172, y: 132, width: 10, height: 8, type: 'ruins' },

    // ============================================================
    // === DENSE TREE CORRIDORS ??? natural funnelling ===
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
    // === NEW POIs ??? filling dead zones ===
    // ============================================================

    // --- Overgrown ruins (south-east, x:210, y:250) ---
    { x: 212, y: 252, width: 14, height: 10, type: 'ruins' },
    // Stair landing near world (62,105): keep the exit from the south-east bluff stairs open.
    { x: 209, y: 255, width: 9, height: 3, type: 'clearing', fill: 'grass' },

    // --- Abandoned logging camp (central-south, x:165, y:235) ---
    { x: 165, y: 236, width: 14, height: 10, type: 'abandoned_camp', interactionId: 'logging_camp' },
    { x: 162, y: 234, width: 20, height: 14, type: 'clearing', fill: 'dirt' },

    // --- Collapsed cottage (far east, x:280, y:160) ---
    { x: 280, y: 160, width: 6, height: 6, type: 'cottage', interactionId: 'collapsed_cottage' },
    { x: 276, y: 158, width: 14, height: 10, type: 'clearing', fill: 'grass' },

    // --- Stone quarry (south-east, x:230, y:205) - nested terraces: rough rim → worked floor → cut pit ---
    { x: 228, y: 205, width: 16, height: 12, type: 'clearing', fill: 'quarry_bedrock' },
    { x: 231, y: 207, width: 11, height: 8, type: 'clearing', fill: 'quarry_floor' },
    { x: 233, y: 209, width: 6, height: 4, type: 'clearing', fill: 'cobblestone' },

    // --- Sunken garden (west, x:20, y:170) ---
    { x: 18, y: 168, width: 14, height: 12, type: 'clearing', fill: 'grass' },
    { x: 22, y: 172, width: 6, height: 4, type: 'garden' },

    // --- Old well clearing (central, x:190, y:120) ---
    { x: 188, y: 118, width: 12, height: 10, type: 'clearing', fill: 'grass' },

    // --- Rocky pond (far south-west, x:30, y:280) ---
    { x: 28, y: 278, width: 12, height: 8, type: 'lake' },

    // --- Small pond (far east, x:275, y:220) ---
    { x: 275, y: 220, width: 10, height: 8, type: 'lake' },

    // --- SW rocky hill plateau ??? walkable grass on top, accessed via south-face stairs ---
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

    // --- Cliff inlet west of ranger plateau ??? x=106???111 only so x???112 plateau is not paved over.
    { x: 106, y: 164, width: 6, height: 10, type: 'clearing', fill: 'dirt' },
    // --- Windmill plot (world ~-41, 22) ??? dirt pad just south of the river / inlet lane.
    { x: 104, y: 168, width: 12, height: 10, type: 'clearing', fill: 'dirt' },

    // --- West hidden grove south rim ??? picket cordon along shelf_face y=163 (meets plateau at x=112) ---
    // Blocks descent onto the wolf shelf; stampCliffs skips fence/gate/iron_fence caps on this row.
    { x: 4, y: 163, width: 108, height: 1, type: 'wall', fill: 'fence' },
    // Heavier band at the trail head ??? reads as a sealed gate line you can swap to walkable `gate` later.
    { x: 56, y: 163, width: 5, height: 1, type: 'wall', fill: 'iron_fence' },
    // Short sand-pinch blocker tucked closer to the grass edge.
    { x: 100, y: 162, width: 1, height: 1, type: 'wall', fill: 'fence' },

    // ============================================================
    // === WHISPERING RIVER ??? winding east toward golem mountain ===
    // Cuts the N-S spine at the broken bridge, then curves south-east
    // in a natural meander before narrowing to its headwaters at the
    // golem mountain base (~x=222). The straight working bridge is gone;
    // a natural ford marks where the old ridge trail crosses the deep bend.
    // Water features first; bridge/path tiles follow to overwrite.
    // ============================================================

    // West segment: x=100???145 (unchanged)
    { x: 100, y: 155, width: 46, height: 7, type: 'wall', fill: 'water' },
    // Broken bridge zone: x=146???153
    { x: 146, y: 155, width: 8, height: 7, type: 'wall', fill: 'water' },
    // Straight mid-section: x=154???186
    { x: 154, y: 155, width: 33, height: 7, type: 'wall', fill: 'water' },
    // Curve 1 ??? initial south bend: river widens as it enters the meander
    { x: 187, y: 155, width: 10, height: 11, type: 'wall', fill: 'water' },
    // Curve 2 ??? deepest south meander (belly of the bend)
    { x: 194, y: 159, width: 14, height: 11, type: 'wall', fill: 'water' },
    // Curve 3 ??? swings back north-east
    { x: 206, y: 157, width: 12, height: 10, type: 'wall', fill: 'water' },
    // Curve 4 ??? narrows toward golem mountain base, ends ~x=222
    { x: 214, y: 153, width: 9, height: 9, type: 'wall', fill: 'water' },

    // Broken bridge ??? north stub (bonfire side, y=155???156) and south stub (cottage side, y=159???161)
    { x: 146, y: 155, width: 8, height: 2, type: 'bridge' },
    { x: 146, y: 159, width: 8, height: 3, type: 'bridge' },

    // Tiny sand lip under the west-grove blocker so it reads as beach, not water.
    { x: 100, y: 161, width: 1, height: 1, type: 'clearing', fill: 'sand' },

    // North-bank corridor ??? split into two segments with a stone wall plug between them.
    // West segment: stair gap to the wall plug.
    { x: 100, y: 148, width: 118, height: 5, type: 'path', fill: 'dirt' },
    // Cliff sealing the corridor to the fort's NW corner tower (x=222-224, y=153+).
    // Width covers x=218-225 so no walkable grass gap remains east of the cliff.
    { x: 218, y: 148, width: 8, height: 5, type: 'cliff_face' },
    // East segment: small dirt apron at the fort's north exit so exiting the fort still works.
    { x: 228, y: 148, width: 6, height: 5, type: 'path', fill: 'dirt' },

    // East-bank picket cordon ? south-entry river (after cliffs/stone; same fill as west-grove rim).
    // World (~44, 128)?(~44, 143). Vertical on grass at x=194 (east bank); south cap split around portal spine (x:146?153).
    { x: 194, y: 278, width: 1, height: 4, type: 'wall', fill: 'fence' },
    { x: 194, y: 282, width: 1, height: 12, type: 'wall', fill: 'fence' },
    // West-bank picket cordon ? seals the meander's east grass lip (world x=-22, y=106?119).
    { x: 128, y: 256, width: 1, height: 14, type: 'wall', fill: 'fence' },
    // West cap meets the spine west edge (x=145); portal column stays open at x:146?153.
    { x: 122, y: 293, width: 24, height: 1, type: 'wall', fill: 'fence' },
    { x: 154, y: 293, width: 41, height: 1, type: 'wall', fill: 'fence' },

    // Final overlook seal after later stone/ruin stamps: preserves the chained grass
    // pockets while preventing a wraparound route into the destroyed town below.
    { x: 174, y: 177, width: 12, height: 3, type: 'cliff_face' },
    { x: 171, y: 180, width: 3, height: 7, type: 'cliff_face' },
    { x: 181, y: 180, width: 5, height: 7, type: 'cliff_face' },
    { x: 174, y: 184, width: 12, height: 3, type: 'cliff_face' },
    { x: 174, y: 177, width: 12, height: 3, type: 'wall', fill: 'cliff' },
    { x: 171, y: 180, width: 3, height: 7, type: 'wall', fill: 'cliff' },
    { x: 181, y: 180, width: 5, height: 7, type: 'wall', fill: 'cliff' },
    { x: 174, y: 184, width: 12, height: 3, type: 'wall', fill: 'cliff' },
    { x: 174, y: 187, width: 3, height: 9, type: 'cliff_face' },
    { x: 177, y: 184, width: 44, height: 3, type: 'cliff_face' },
    { x: 205, y: 187, width: 16, height: 9, type: 'cliff_face' },
    { x: 177, y: 193, width: 44, height: 3, type: 'cliff_face' },
    { x: 205, y: 196, width: 16, height: 16, type: 'cliff_face' },
    { x: 177, y: 202, width: 44, height: 10, type: 'cliff_face' },
    // THE SURVEYOR'S DEN - a bespoke cave mouth carved into the western cliff at tile
    // (45,114)=world(-105,-36). Interact to enter the cave interior. Placed LAST so it carves
    // through the cliff_face; it survives the cliff auto-stamp because the tile is interactable.
    { x: 45, y: 114, width: 1, height: 1, type: 'cave_mouth', interactionId: 'surveyors_hollow_entrance', interiorMap: 'interior_surveyors_hollow', interiorSpawnX: 5, interiorSpawnY: 5 },
    // TRAVELER'S INLET - cave mouth on the eastern cliff at tile (258,96)=world(108,-54).
    { x: 258, y: 96, width: 1, height: 1, type: 'cave_mouth', interactionId: 'travelers_inlet_entrance', interiorMap: 'interior_travelers_inlet', interiorSpawnX: 12, interiorSpawnY: 5 },
  ],
  portals: [
    { x: 150, y: 291, targetMap: 'village', targetX: 120, targetY: 8 },
    // Guilrhym return landing: makes the post-Hollow city gate route a two-way threshold.
    // Kept on the lower-left caldera lip so the portal is visible without landing the player in mountain collision.
    { x: 266, y: 45, targetMap: 'guilrhym', targetX: 150, targetY: 292 },
  ],
  chests: [
    // Hollow corridor gate - last_breath_charm, earned before the boss approach
    { x: 128, y: 55, interactionId: 'hollow_gate_chest' },
    { x: 33, y: 135, interactionId: 'hidden_grove_chest' },
    // Former interior_woodcutter_cottage loot (exterior prop only now).
    { x: 93, y: 177, interactionId: 'forest_woodcutter_chest' },
    { x: 42, y: 38, interactionId: 'wolf_den_chest' },
    { x: 228, y: 244, interactionId: 'forest_lake_chest' },
    { x: 90, y: 230, interactionId: 'spider_chest' },
    { x: 275, y: 265, interactionId: 'forest_hermit_chest' },
    { x: 30, y: 210, interactionId: 'destroyed_town_chest' },
    { x: 268, y: 28, interactionId: 'volcano_chest' },
    // One grove chest (deepest grove exploration reward)
    { x: 58, y: 268, interactionId: 'enchanted_chest_3' },
    // West Fort boss reward - tucked in the north yard (off the gate walkway), near the Ridge Revenant.
    { x: 21, y: 144, interactionId: 'west_fort_chest' },
    { x: 111, y: 220, interactionId: 'forest_river_chest' },
    { x: 218, y: 183, interactionId: 'golem_arena_chest' },
    // Hidden chest behind waterfall
    { x: 180, y: 46, interactionId: 'waterfall_hidden_chest' },
    // West grove rim ??? world (-52, 12); reach from inside the cordon, not the river sand pinch.
    { x: 98, y: 162, interactionId: 'west_grove_hidden_rim_chest' },
    // Hollow approach ridge ??? world (-35, -44); overlooking the river / decayed bridge lane.
    { x: 115, y: 106, interactionId: 'forest_chest_hollow_approach' },
    // Observatory compound ??? hidden reward corner at world (59, -60).
    { x: 209, y: 90, interactionId: 'observatory_chest' },
    // East Ridge terminus chest is materialised at runtime by syncRevenantTerminusChestState
    // (at the glyph tile 260,142) after the Ridge Revenant is defeated - NOT pre-placed here.
    // Hunter gate ??? tucked in the east cliff notch just past the iron fence. World (6, 48).
    { x: 156, y: 198, interactionId: 'forest_southern_chest' },
    // Hunter cliff shelf ? reward inside the secluded shelf (world ~17, 49).
    { x: 167, y: 199, interactionId: 'hunter_cliff_shelf_chest' },
    // Cliff-corridor overlook pocket ? world (121,-36); reward for finding the stair alcove.
    { x: 270, y: 113, interactionId: 'cliff_corridor_chest' },
    // SE forgotten shrine ? reward for discovering the eastern void.
    { x: 256, y: 254, interactionId: 'forgotten_shrine_chest' },
    // SW rocky hill plateau ??? reward sits on the cliff-top shelf directly above the stairs.
    { x: 80, y: 294, interactionId: 'rocky_hill_chest' },
    // South-entry river peninsula ? world (-27, 135).
    { x: 123, y: 285, interactionId: 'forest_south_entry_chest' },
    // Rocky-shore sand divide ? west of fence at world (-45, 97).
    { x: 105, y: 247, interactionId: 'forest_shore_divide_chest' },
    // North fort approach — Wayfarer Ring + Radiant Vestige (ranger cache) at world (-63, 99).
    { x: 87, y: 249, interactionId: 'north_fort_wayfarer_ring_chest' },
    // Ironbark Band - guarded by the east-edge Corrupted Giant (world 143,93 = tile 293,243).
    { x: 245, y: 282, interactionId: 'forest_ironbark_ring_chest' }, // south-woods cliff's edge (world 95,132)
    // NE ridge heresy altar pocket - Radiant Vestige (bonfire flask upgrade). World (85,-104), altar at (85,-105).
    { x: 235, y: 46, interactionId: 'east_ridge_vestige_chest' },
    // Broken west lake bridge reward at world (46,109), default Ephemeral Extract.
    { x: 196, y: 259, interactionId: 'broken_west_lake_bridge_chest' },
  ],
  interactables: [
    // Blighted Root ??? corrupted growth at the center of the enchanted grove. Quest target for grove_warden.
    { x: 85, y: 153, type: 'blighted_stump', walkable: false, interactionId: 'blighted_root' },
    // Corrupted bridge (north stub) ??? primary ???hollow??? checkpoint for fast travel / narrative.
    { x: 156, y: 154, type: 'bonfire', walkable: false, interactionId: 'bonfire_hollow' },
    // Riverside Grove drawbridge lever - reachable from the bonfire side after the long route.
    { x: 154, y: 153, type: 'shortcut_lever', walkable: false, interactionId: 'riverside_bridge_shortcut_lever' },
  // Hollow corridor gate lever - north of the iron gate row at world (~-32,-102) / tile (118,48).
    { x: 118, y: 48, type: 'shortcut_lever', walkable: false, interactionId: 'hollow_shortcut_lever' },
    // East hollow route gate lever - north of fence row at world (~86,-95) / tile (236,55).
    { x: 236, y: 55, type: 'shortcut_lever', walkable: false, interactionId: 'east_hollow_route_gate_lever' },
    // Quarry-bank shortcut lever - on the quarry side of the west-bank picket cordon.
    { x: 207, y: 220, type: 'shortcut_lever', walkable: false, interactionId: 'quarry_bank_shortcut_lever' },
    // South approach trail toward the fog-gate corridor ??? world near (-26, -46).
    { x: 124, y: 77, type: 'bonfire', walkable: false, interactionId: 'bonfire_forest_fort' },
    // Eastern fort passage - safe rest point inside the garrison by the gatekeeper and quartermaster.
    { x: 228, y: 158, type: 'bonfire', walkable: false, interactionId: 'bonfire_eastern_fort_passage' },
    // Iron Gate ??? world ~(-15.5, 58.5), slightly NE of old (130, 206)
    { x: 134, y: 208, type: 'bonfire', walkable: false, interactionId: 'bonfire_forest_south' },
    { x: 150, y: 250, type: 'bonfire', walkable: false, interactionId: 'bonfire_forest_clearing' },
    { x: 193, y: 192, type: 'bonfire', walkable: false, interactionId: 'bonfire_cliff_ledge_approach' },
    { x: 291, y: 145, type: 'bonfire', walkable: false, interactionId: 'bonfire_cliff_cemetery' },
    { x: 261, y: 107, type: 'bonfire', walkable: false, interactionId: 'bonfire_east_ridge_overlook' },
    { x: 126, y: 46, type: 'bonfire', walkable: false, interactionId: 'bonfire_deep_hollow' },
    { x: 256, y: 45, type: 'bonfire', walkable: false, interactionId: 'bonfire_guilrhym_threshold' },
    // West fort - world ~(-130, 5), north of the sealed garrison (logs smother until cleared).
    { x: 20, y: 155, type: 'bonfire', walkable: false, interactionId: 'bonfire_west_fort_north' },
    // West fort ritual hall - world ~(-127, 0), beside the summoning glyph.
    { x: 23, y: 150, type: 'bonfire', walkable: false, interactionId: 'bonfire_west_fort_ritual' },
    // Lever is on the NORTH side of the ranger gate (y=199-202) so the player must first
    // navigate the long way around through the forest to reach the cottage, then on the way
    // back south they pull the lever to open the shortcut home to the Ranger Outpost.
    { x: 127, y: 196, type: 'shortcut_lever', walkable: false, interactionId: 'forest_shortcut_lever' },
    { x: 146, y: 240, type: 'stump', walkable: false },
    { x: 100, y: 100, type: 'stump_b', walkable: false },
    { x: 200, y: 90, type: 'stump_c', walkable: false },
    { x: 170, y: 182, type: 'mushroom', walkable: true },
    { x: 35, y: 250, type: 'campfire_remains', walkable: false },
    { x: 275, y: 270, type: 'well', walkable: false, interactionId: 'well' },
    { x: 140, y: 95, type: 'well', walkable: false, interactionId: 'ancient_well' },
    { x: 30, y: 35, type: 'bones_pile', walkable: true, interactionId: 'wolf_den_bones' },
    { x: 65, y: 183, type: 'ranger_remains', walkable: true, interactionId: 'chapel_dead_ranger' },
    { x: 89, y: 190, type: 'ranger_remains_scattered', walkable: true },
    { x: 262, y: 25, type: 'sign', walkable: false, interactionId: 'volcano_warning' },
    { x: 22, y: 248, type: 'cage', walkable: false },
    // Potion pickups in forest clearings and paths
    // West of Hollow river seal strip (was 68,65 ??? flooded by north-west water seal).
    { x: 22, y: 66, type: 'tempest_grass', walkable: true, interactionId: 'tempest_grass_pickup' },
    { x: 210, y: 108, type: 'tempest_grass', walkable: true, interactionId: 'tempest_grass_pickup' },
    { x: 148, y: 162, type: 'tempest_grass', walkable: true, interactionId: 'tempest_grass_pickup' },
    // (85,225) removed - that tile sits on an inaccessible cliff face
    { x: 225, y: 225, type: 'tempest_grass', walkable: true, interactionId: 'tempest_grass_pickup' },
    { x: 48, y: 148, type: 'tempest_grass', walkable: true, interactionId: 'tempest_grass_pickup' },
    { x: 255, y: 65, type: 'tempest_grass', walkable: true, interactionId: 'tempest_grass_pickup' },
    { x: 155, y: 55, type: 'tempest_grass', walkable: true, interactionId: 'tempest_grass_pickup' },
    // Fort lawn pickup (world 39,-28).
    { x: 189, y: 122, type: 'tempest_grass', walkable: true, interactionId: 'tempest_grass_pickup' },
    // Hollow-approach spine gate pocket ? world (-10, -37), west of the iron fence at x=145.
    { x: 140, y: 113, type: 'tempest_grass', walkable: true, interactionId: 'tempest_grass_pickup' },
    { x: 100, y: 165, type: 'tempest_grass', walkable: true, interactionId: 'tempest_grass_pickup' },
    { x: 148, y: 265, type: 'tempest_grass', walkable: true, interactionId: 'tempest_grass_pickup' },
    { x: 172, y: 195, type: 'tempest_grass', walkable: true, interactionId: 'tempest_grass_pickup' },
    // Tucked beside the forgotten shrine ? reward for the SE exploration loop.
    { x: 258, y: 252, type: 'tempest_grass', walkable: true, interactionId: 'tempest_grass_pickup' },
    { x: 75, y: 100, type: 'tempest_grass', walkable: true, interactionId: 'tempest_grass_pickup' },
    // East ridge fort approach (world 107,-32).
    { x: 257, y: 118, type: 'tempest_grass', walkable: true, interactionId: 'tempest_grass_pickup' },
    // Cliff-corridor shortcut landing (world 120,-24).
    { x: 270, y: 126, type: 'tempest_grass', walkable: true, interactionId: 'tempest_grass_pickup' },
    // Moonbloom flowers for Merchant's Request quest
    { x: 140, y: 48, type: 'moonbloom', walkable: true, interactionId: 'moonbloom_pickup' },
    { x: 210, y: 107, type: 'moonbloom', walkable: true, interactionId: 'moonbloom_pickup' },
    { x: 105, y: 190, type: 'moonbloom', walkable: true, interactionId: 'moonbloom_pickup' },
    { x: 97, y: 194, type: 'moonbloom', walkable: true, interactionId: 'moonbloom_pickup' },
    // === THE HOLLOW ??? Warning sign lower on the bridge approach (world y ~= -50) ===
    { x: 118, y: 100, type: 'sign', walkable: false, interactionId: 'hollow_warning_sign' },
    // === SOUTH ENTRY CORRIDOR ? moss-covered milestone before the spine bridge (world ~-3, 132).
    { x: 147, y: 282, type: 'sign', walkable: false, interactionId: 'forest_milestone' },
    // Carved marker on the path ? a ranger-carved note, east of the main trail so it reads as optional.
    { x: 157, y: 283, type: 'fallen_log', walkable: false },

    // === ABANDONED HOMESTEAD SURROUNDS ===
    // Windmill, hay bales and stump are pure decoration.
    // The barrels and crate are searchable (Press E) - small coin finds.
    { x: 224, y: 127, type: 'windmill', walkable: false },
    { x: 234, y: 131, type: 'barrel', walkable: false, interactionId: 'homestead_container_1' },
    { x: 235, y: 132, type: 'crate', walkable: false, interactionId: 'homestead_container_2' },
    { x: 234, y: 134, type: 'stump_b', walkable: false },
    { x: 223, y: 128, type: 'hay_bale', walkable: false },
    { x: 225, y: 128, type: 'hay_bale', walkable: false },
    { x: 227, y: 134, type: 'barrel', walkable: false, interactionId: 'homestead_container_3' },

    // === SHORTCUT LEVER HINTS ===
    // Gate-side blood trail lives in props (PROGRESSION BLOOD TRAILS - iron gate cluster).
    // Sign on the bonfire plateau ??? visible after the player hits the gate and looks around.
    // === FORT INTERIOR ===
    // Grove shelf shortcut lever - north of the iron gate, west of the gap (x=56–60).
    { x: 55, y: 162, type: 'shortcut_lever', walkable: false, interactionId: 'grove_shelf_shortcut_lever' },

    // West cliff shelf gate lever - set back on the WEST (far/shortcut) side, clear of the gate
    // entrance at x:87, y:58-59. Classic "doesn't open from this side": the gate tile itself
    // reports sealed when faced from the EAST (approach) side; this lever - only reachable from
    // the WEST - opens it. Proximity-based interaction still picks the lever from the west and the
    // gate's sealed message from the east.
    { x: 84, y: 55, type: 'shortcut_lever', walkable: false, interactionId: 'west_cliff_gate_lever' },

  ],
  props: [
    // === REVENANT SUMMONING GLYPHS (walkable ground sigils) ===
    // Stepping onto these with 3+ cursed sediment summons a Ridge Revenant
    // (RevenantRituals.ts). East glyph = Tempered Core fight; west glyph = fort boss room.
    { x: 260, y: 142, type: 'summoning_ritual', walkable: true }, // East Ridge Ascent summit (world ~110,-8)
    { x: 18, y: 147, type: 'summoning_ritual', walkable: true },  // West Fort interior (world ~-132,-3)
    { x: 227, y: 12, type: 'summoning_ritual', walkable: true },  // Precipice west lip (world ~77,-138)
    // Failed ritual (dud) - SE hills; decor ring applied at runtime (RevenantRituals dud hint).
    { x: 273, y: 259, type: 'summoning_ritual_dud', walkable: true }, // world (123, 109)
    { x: 134, y: 133, type: 'summoning_ritual_dud', walkable: true }, // world (-16, -17)
    { x: 285, y: 162, type: 'summoning_ritual_dud', walkable: true }, // world (135, 12)
    // Ritual rings - east placed at map gen; west ring is re-stamped after the fort overlay loads.
    { x: 257, y: 139, type: 'ritual_candle_knocked', walkable: true },
    { x: 263, y: 139, type: 'ritual_candle_knocked', walkable: true },
    { x: 264, y: 142, type: 'ritual_candle', walkable: true },
    { x: 263, y: 145, type: 'ritual_candle_knocked', walkable: true },
    { x: 257, y: 145, type: 'ritual_candle_knocked', walkable: true },
    { x: 256, y: 142, type: 'bones', walkable: true },
    { x: 265, y: 142, type: 'rubble', walkable: true },

    // === HERESY ALTARS (minimap landmarks ? downscaled sprite icons once explored) ===
    // Corrupted shrines hidden off the main progression spine ? 2 hits to destroy, +1 cursed sediment each.
    { x: 34, y: 259, type: 'heresy_altar', walkable: false }, // world (-116, 109) ? far SW dirt plot
    { x: 235, y: 45, type: 'heresy_altar', walkable: false }, // world (85, -105) ? NE ridge clearing
    { x: 277, y: 205, type: 'heresy_altar', walkable: false }, // world (127, 55) ? east ranger outpost flank
    { x: 58, y: 155, type: 'heresy_altar', walkable: false }, // world (-92, 5) - west grove shelf approach
    { x: 177, y: 182, type: 'heresy_altar', walkable: false }, // world (27, 32) ? final cliff lookout
    { x: 107, y: 54, type: 'heresy_altar', walkable: false }, // world (-43, -96) ? corrupted west-cliff stair shelf
    { x: 279, y: 72, type: 'heresy_altar', walkable: false }, // world (129, -78) ? eastern Hollow edge grove
    { x: 263, y: 231, type: 'ridge_lumberyard', walkable: false }, // world (~113, 81) - ridge lumberyard remains
    { x: 278, y: 90, type: 'sign', walkable: false, interactionId: 'east_ridge_lumberyard_sign' },
    { x: 276, y: 162, type: 'bones_pile', walkable: false },
    { x: 280, y: 158, type: 'barrel', walkable: false },
    // Watch tower south-east of the west fort ? world (-117, 9)
    { x: 33, y: 159, type: 'observatory', walkable: false },
    // Watch tower on the western bypass, east of the south-fort cliff shelf ? world (-19, 72)
    { x: 131, y: 222, type: 'observatory', walkable: false },
    // Mid-plateau watch tower ? world (-36, -13)
    { x: 114, y: 137, type: 'observatory', walkable: false },
    // SW spider-nest meadow landmark ? world (-95, 82)
    { x: 55, y: 231, type: 'windmill', walkable: false },
    // Lantern trail guiding player toward the Hollow bridge.
    { x: 122, y: 110, type: 'lantern', walkable: true },
    { x: 122, y: 106, type: 'lantern', walkable: true },
    { x: 122, y: 100, type: 'lantern', walkable: true },
    // Lantern at the stairway base ? walkable so it doesn't block the landing mouth.
    { x: 112, y: 111, type: 'lantern', walkable: true },
    // Clear procedural noise rocks near world (93,23)–(94,26) on the C7 shelf corridor.
    // North-cap cliffs, east cliff face fill (241-244, 173-177), and rock→cliff at 243,175 are
    // stamped in enforceFortRidgeLadderGate.
    { x: 242, y: 172, type: 'grass', walkable: true },
    { x: 243, y: 172, type: 'grass', walkable: true },
    { x: 244, y: 172, type: 'grass', walkable: true },
    // Clear a procedural tree on the NE fortress ridge plateau at world (83,-33).
    { x: 233, y: 117, type: 'grass', walkable: true },
    // Clear the procedural trees pinching the east-side detour lane around the observatory
    // tower (x:222,y:91) so the player can skirt its east edge down to the compound entrance.
    { x: 226, y: 86, type: 'grass', walkable: true },
    { x: 226, y: 89, type: 'grass', walkable: true },
    // Precipice summoning glyph + decor ring: mapGenerator restampAuthoredRitualGlyphs (world ~77,-138).
    // Hollow approach and shortcut hints are atmosphere, not direct interactables.
    { x: 120, y: 26, type: 'campfire_remains', walkable: false },
    { x: 124, y: 28, type: 'bloodstain', walkable: true },
    // === DEEP HOLLOW (tile y <= 59, world y <= -91) ??? broken graves, corruption, silhouettes; flanks only (spine ~117-129 open).
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
    { x: 148, y: 54, type: 'dead_tree_b', walkable: false },
    { x: 95, y: 38, type: 'bones_pile', walkable: true },
    { x: 157, y: 34, type: 'mossy_stone', walkable: false },
    // Ruined stagecoach scene near world (52, -93), just outside the north fort.
    { x: 202, y: 57, type: 'wagon', walkable: false },
    { x: 205, y: 58, type: 'cart', walkable: false },
    { x: 201, y: 59, type: 'bones_pile', walkable: true },
    { x: 204, y: 56, type: 'bones', walkable: true },
    { x: 203, y: 60, type: 'bloodstain', walkable: true },
    { x: 130, y: 203, type: 'bloodstain', walkable: true },
    // Gate-side cluster ??? environmental storytelling on the bonfire side of the hunter cliff seal.
    // None are PATH_BLOCKERS so they survive path-proximity cleanup; each pair is spaced > 2 tiles
    // apart in at least one axis to survive SPACED_DECORATIONS thinning.
    { x: 151, y: 199, type: 'lantern', walkable: false },
    { x: 154, y: 199, type: 'rubble', walkable: true },
    { x: 150, y: 202, type: 'statue', walkable: false },
    { x: 154, y: 202, type: 'statue', walkable: false },
    { x: 152, y: 207, type: 'campfire_remains', walkable: false },
    // === SOUTH ENTRY ATMOSPHERE (spawn corridor y:270-295) ===
    // Environmental storytelling before the first bonfire ? communicates danger without a tutorial
    // pop-up. Bloodstains + bones tell the player that something bad happened here recently.
    { x: 150, y: 289, type: 'bloodstain', walkable: true },
    { x: 145, y: 285, type: 'bones', walkable: true },
    { x: 156, y: 282, type: 'dead_tree_c', walkable: false },
    { x: 143, y: 280, type: 'bones_pile', walkable: true },
    { x: 160, y: 278, type: 'bloodstain', walkable: true },
    // Mid-corridor lantern ? keeps the northward trail readable between bonfires.
    { x: 152, y: 260, type: 'lantern', walkable: false },

    { x: 144, y: 268, type: 'lantern', walkable: false },
    { x: 156, y: 268, type: 'lantern', walkable: false },
    { x: 142, y: 262, type: 'barrel', walkable: false },
    { x: 144, y: 262, type: 'crate', walkable: false },
    { x: 158, y: 262, type: 'barrel', walkable: false },
    { x: 160, y: 262, type: 'crate', walkable: false },
    { x: 140, y: 256, type: 'fallen_log_v', walkable: false },
    { x: 160, y: 256, type: 'stump_c', walkable: false },
    // Broken west lake bridge — plank pile on the east stub gap edge (south row y:260, where the
    // player naturally walks). The dynamic loose_plank tease tile at (192,260) sticks out from
    // this pile into the water gap and carries the interactionId.
    { x: 193, y: 260, type: 'plank_pile', walkable: true },
    { x: 146, y: 238, type: 'lantern', walkable: false },
    { x: 146, y: 222, type: 'lantern', walkable: false },
    // Northward spine ??? ranger line of march (packed path ~146???154 x); keeps manuscript progression readable
    { x: 152, y: 182, type: 'lantern', walkable: false },
    { x: 152, y: 152, type: 'lantern', walkable: false },
    { x: 152, y: 132, type: 'lantern', walkable: false },
    { x: 152, y: 112, type: 'lantern', walkable: false },
    { x: 74, y: 40, type: 'bones_pile', walkable: true },
    { x: 82, y: 38, type: 'dead_tree_b', walkable: false },
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

    // === PROGRESSION BLOOD TRAILS ===
    // Environmental breadcrumbs toward critical pickups - no dialogue, just a dragged patrol read.

    // --- Iron key: south-bank artery west toward chapel dead ranger (65, 183) ---
    { x: 130, y: 179, type: 'bloodstain', walkable: true },
    { x: 115, y: 180, type: 'bloodstain', walkable: true },
    { x: 100, y: 181, type: 'bloodstain', walkable: true },
    { x: 88, y: 182, type: 'bloodstain', walkable: true },
    { x: 76, y: 183, type: 'bloodstain', walkable: true },
    { x: 67, y: 182, type: 'bloodstain', walkable: true },
    { x: 52, y: 164, type: 'bloodstain', walkable: true },
    { x: 56, y: 169, type: 'bloodstain', walkable: true },
    { x: 60, y: 175, type: 'bloodstain', walkable: true },
    { x: 63, y: 180, type: 'bloodstain', walkable: true },

    // --- Iron gate: bonfire plateau north to the sealed ranger gate (y=199-202) ---
    { x: 134, y: 206, type: 'bloodstain', walkable: true },
    { x: 131, y: 204, type: 'bloodstain', walkable: true },
    { x: 128, y: 202, type: 'bloodstain', walkable: true },
    { x: 126, y: 200, type: 'bloodstain', walkable: true },
    { x: 124, y: 199, type: 'bloodstain', walkable: true },
    { x: 142, y: 205, type: 'bloodstain', walkable: true },
    { x: 136, y: 203, type: 'bloodstain', walkable: true },

    // --- Hunter cottage bypass: gate west along y=178, then up to Disparaged Cottage ---
    { x: 112, y: 197, type: 'bloodstain', walkable: true },
    { x: 102, y: 193, type: 'bloodstain', walkable: true },
    { x: 92, y: 189, type: 'bloodstain', walkable: true },
    { x: 82, y: 185, type: 'bloodstain', walkable: true },
    { x: 72, y: 181, type: 'bloodstain', walkable: true },
    { x: 62, y: 179, type: 'bloodstain', walkable: true },
    { x: 100, y: 187, type: 'bloodstain', walkable: true },
    { x: 115, y: 186, type: 'bloodstain', walkable: true },
    { x: 125, y: 185, type: 'bloodstain', walkable: true },
    { x: 133, y: 186, type: 'bloodstain', walkable: true },
    { x: 137, y: 187, type: 'bloodstain', walkable: true },

    // --- Manuscript checkpoint gate: north-bank corridor east to forest fort north wall (y=153) ---
    { x: 138, y: 151, type: 'bloodstain', walkable: true },
    { x: 152, y: 150, type: 'bloodstain', walkable: true },
    { x: 165, y: 149, type: 'bloodstain', walkable: true },
    { x: 178, y: 149, type: 'bloodstain', walkable: true },
    { x: 205, y: 150, type: 'bloodstain', walkable: true },
    { x: 222, y: 151, type: 'bloodstain', walkable: true },
    { x: 228, y: 152, type: 'bloodstain', walkable: true },

    // --- Fort gate key route: chapel fallout east toward garrison south gate (230, 172) ---
    { x: 82, y: 178, type: 'bloodstain', walkable: true },
    { x: 105, y: 174, type: 'bloodstain', walkable: true },
    { x: 130, y: 170, type: 'bloodstain', walkable: true },
    { x: 155, y: 165, type: 'bloodstain', walkable: true },
    { x: 180, y: 160, type: 'bloodstain', walkable: true },
    { x: 205, y: 158, type: 'bloodstain', walkable: true },
    { x: 220, y: 163, type: 'bloodstain', walkable: true },
    { x: 228, y: 169, type: 'bloodstain', walkable: true },

    // --- Blighted root: grove-shelf path into enchanted grove center (85, 153) ---
    { x: 62, y: 153, type: 'bloodstain', walkable: true },
    { x: 70, y: 154, type: 'bloodstain', walkable: true },
    { x: 78, y: 153, type: 'bloodstain', walkable: true },
    { x: 83, y: 152, type: 'bloodstain', walkable: true },

    // --- Fort evacuation order: spine north from Riverside Grove toward north fort shelf (~213, 70) ---
    { x: 148, y: 140, type: 'bloodstain', walkable: true },
    { x: 150, y: 125, type: 'bloodstain', walkable: true },
    { x: 152, y: 110, type: 'bloodstain', walkable: true },
    { x: 155, y: 95, type: 'bloodstain', walkable: true },
    { x: 160, y: 82, type: 'bloodstain', walkable: true },
    { x: 168, y: 75, type: 'bloodstain', walkable: true },
    { x: 180, y: 71, type: 'bloodstain', walkable: true },
    { x: 195, y: 69, type: 'bloodstain', walkable: true },
    { x: 208, y: 70, type: 'bloodstain', walkable: true },
    { x: 212, y: 71, type: 'bloodstain', walkable: true },

    // --- Hollow fog gate: Corrupted Bridge bonfire up the spine toward the boss terminus ---
    { x: 146, y: 70, type: 'bloodstain', walkable: true },
    { x: 145, y: 58, type: 'bloodstain', walkable: true },
    { x: 144, y: 45, type: 'bloodstain', walkable: true },
    { x: 142, y: 35, type: 'bloodstain', walkable: true },
    { x: 124, y: 30, type: 'bloodstain', walkable: true },
    { x: 122, y: 24, type: 'bloodstain', walkable: true },

    // --- Wolf ring (optional): cemetery shelf east toward relocated ranger cottage (236, 227) ---
    { x: 200, y: 220, type: 'bloodstain', walkable: true },
    { x: 215, y: 224, type: 'bloodstain', walkable: true },
    { x: 228, y: 226, type: 'bloodstain', walkable: true },
    { x: 234, y: 227, type: 'bloodstain', walkable: true },

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
    // East of the spine so the dirt column (x=146–153) stays open near Riverside Grove bonfire.
    { x: 158, y: 149, type: 'lantern', walkable: false },

    // === NORTH-BANK STORY PROPS ? fills the 128-tile lantern-only corridor with environmental
    // storytelling. Each prop tells a fragment of the ranger collapse / Hollow corruption story.
    { x: 122, y: 150, type: 'bloodstain', walkable: true },
    { x: 135, y: 151, type: 'bones', walkable: true },
    { x: 158, y: 151, type: 'bones_pile', walkable: true },
    { x: 173, y: 150, type: 'wagon', walkable: false },
    { x: 188, y: 151, type: 'bloodstain', walkable: true },
    { x: 205, y: 150, type: 'crate', walkable: false },
    { x: 207, y: 151, type: 'barrel', walkable: false },
    { x: 218, y: 152, type: 'bloodstain', walkable: true },

    // === EAST ARTERY MIDSECTION ? fills the dead 40-tile horizontal stretch from spider zone
    // to golem arena. Hints at a ruined patrol that didn't make it back.
    { x: 198, y: 180, type: 'campfire_remains', walkable: false },
    { x: 196, y: 178, type: 'barrel', walkable: false },
    { x: 200, y: 182, type: 'crate', walkable: false },
    { x: 203, y: 181, type: 'bones_pile', walkable: true },
    { x: 207, y: 176, type: 'bloodstain', walkable: true },
    { x: 209, y: 179, type: 'dead_tree_c', walkable: false },

    // === BRANCH TEASES ? visible landmarks at fork points to draw the eye toward optional paths.
    // East ridge tease ? tall statue visible from east end of the artery, suggests "something there".
    { x: 234, y: 178, type: 'statue', walkable: false },
    // Western bypass tease ? statue visible from the iron-gate plateau, hints at the bypass loop.
    { x: 88, y: 196, type: 'statue', walkable: false },
    { x: 90, y: 198, type: 'lantern', walkable: false },

    // === SE FORGOTTEN SHRINE ATMOSPHERE ===
    // Surrounds the hidden shrine with overgrowth and decay ? communicates "lost place" without text.
    { x: 247, y: 247, type: 'dead_tree', walkable: false },
    { x: 263, y: 248, type: 'dead_tree_b', walkable: false },
    { x: 251, y: 260, type: 'mossy_stone', walkable: false },
    { x: 261, y: 261, type: 'mossy_stone', walkable: false },
    { x: 254, y: 251, type: 'bones_pile', walkable: true },
    { x: 259, y: 257, type: 'bloodstain', walkable: true },
    { x: 252, y: 258, type: 'rubble', walkable: true },
    { x: 260, y: 250, type: 'statue', walkable: false },
    // Lantern breadcrumb from the south creek leading east toward the shrine ? telegraphs the discovery.
    { x: 240, y: 252, type: 'lantern', walkable: false },
    // Grove south rim ??? cordon clutter.
    { x: 52, y: 162, type: 'barrel', walkable: false },
    { x: 54, y: 161, type: 'crate', walkable: false },
    { x: 68, y: 162, type: 'chain', walkable: false },
    { x: 88, y: 162, type: 'lantern', walkable: false },
    { x: 96, y: 162, type: 'stump', walkable: false },
    { x: 104, y: 162, type: 'dead_tree_c', walkable: false },
    // Wolf shelf below the rim (unreachable until a gate opens) ??? visible tease beyond the fence.
    { x: 72, y: 168, type: 'bones_pile', walkable: true },
    { x: 84, y: 170, type: 'dead_tree_b', walkable: false },
    { x: 92, y: 169, type: 'fallen_log_b', walkable: false },
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
    // Windmill plot ??? was beside removed river-adjacent stairs; now world (-41, 22) / tile (109,172).
    { x: 109, y: 172, type: 'windmill', walkable: false },

    // === LOWER CLIFF INLET (world -39, 37 / tile 111,187) ===
    // The cliff walls form a 14-tile-wide bowl from y=186-191 (x=104-117 open).
    // Windmill planted against the east cliff wall inside the inlet ??? visible silhouette from the north.
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
    { x: 112, y: 189, type: 'tall_grass_b', walkable: true },
    { x: 110, y: 191, type: 'bones', walkable: true },
    // Dead tree on the north approach ??? silhouette before the cliff mouth.
    { x: 106, y: 175, type: 'dead_tree', walkable: false },
    { x: 124, y: 203, type: 'bloodstain', walkable: true },
    { x: 129, y: 205, type: 'bloodstain', walkable: true },
    { x: 136, y: 209, type: 'bloodstain', walkable: true },
    { x: 144, y: 213, type: 'bloodstain', walkable: true },
    { x: 126, y: 194, type: 'bloodstain', walkable: true },
    { x: 134, y: 191, type: 'bloodstain', walkable: true },
    { x: 150, y: 222, type: 'bones_pile', walkable: true },
    { x: 156, y: 225, type: 'cage', walkable: false },
    { x: 146, y: 208, type: 'dead_tree_c', walkable: false },
    { x: 118, y: 224, type: 'dead_tree', walkable: false },
    { x: 116, y: 200, type: 'bones_pile', walkable: true },
    { x: 124, y: 207, type: 'lantern', walkable: false },
    { x: 142, y: 189, type: 'dead_tree_b', walkable: false },
    { x: 148, y: 190, type: 'dead_tree_c', walkable: false },
    { x: 132, y: 187, type: 'bones_pile', walkable: true },
    { x: 140, y: 186, type: 'bones_pile', walkable: true },
    { x: 130, y: 190, type: 'lantern', walkable: false },
    { x: 144, y: 190, type: 'lantern', walkable: false },
    { x: 124, y: 191, type: 'lantern', walkable: false },
    { x: 108, y: 200, type: 'lantern', walkable: false },
    { x: 170, y: 221, type: 'lantern', walkable: false },
    { x: 210, y: 221, type: 'lantern', walkable: false },
    { x: 234, y: 224, type: 'lantern', walkable: false },
    { x: 124, y: 191, type: 'stump', walkable: false },
    { x: 150, y: 192, type: 'stump_b', walkable: false },

    // === HUNTER CLIFF SHELF props ===
    // Lantern at the stairway base ? draws the player's eye toward the cliff face.
    { x: 164, y: 213, type: 'lantern', walkable: false },
    // Secluded shelf atmosphere: old hunter's lookout, long abandoned.
    { x: 163, y: 197, type: 'stump_c', walkable: false },
    { x: 169, y: 198, type: 'rock', walkable: false },
    { x: 162, y: 201, type: 'bones', walkable: true },
    { x: 169, y: 200, type: 'lantern', walkable: false },
    // East cliff grass patch props ? same abandoned-hunter vibe as the secluded shelf.
    { x: 179, y: 197, type: 'fallen_log', walkable: false },
    { x: 183, y: 199, type: 'rock', walkable: false },
    { x: 180, y: 201, type: 'bones', walkable: true },
    { x: 182, y: 197, type: 'lantern', walkable: false },
    // Cliff ledge approach landmarks: a windmill lookout and a wrecked coach scene.
    { x: 185, y: 192, type: 'windmill', walkable: false },
    { x: 181, y: 199, type: 'hay_bale', walkable: false },
    { x: 184, y: 201, type: 'hay_bale', walkable: false },
    { x: 191, y: 199, type: 'hay_bale', walkable: false },
    { x: 186, y: 198, type: 'wagon', walkable: false },
    { x: 188, y: 198, type: 'cart', walkable: false },
    { x: 185, y: 199, type: 'bones_pile', walkable: true },
    { x: 189, y: 200, type: 'bones', walkable: true },
    { x: 187, y: 200, type: 'bloodstain', walkable: true },

    { x: 136, y: 168, type: 'bench', walkable: false },
    { x: 144, y: 168, type: 'lantern', walkable: false },
    { x: 150, y: 168, type: 'crate', walkable: false },
    { x: 153, y: 179, type: 'barrel', walkable: false },
    { x: 162, y: 180, type: 'cart', walkable: false },
    { x: 166, y: 184, type: 'crate', walkable: false },
    { x: 168, y: 184, type: 'barrel', walkable: false },
    { x: 123, y: 196, type: 'bones_pile', walkable: true },
    { x: 131, y: 201, type: 'bones_pile', walkable: true },
    { x: 134, y: 206, type: 'bones_pile', walkable: true },
    { x: 141, y: 204, type: 'dead_tree_b', walkable: false },
    { x: 146, y: 201, type: 'stump_b', walkable: false },
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
    { x: 233, y: 130, type: 'fallen_log_v', walkable: false },
    { x: 237, y: 132, type: 'barrel', walkable: false },
    { x: 239, y: 132, type: 'crate', walkable: false },
    { x: 174, y: 88, type: 'stump_c', walkable: false },
    { x: 88, y: 181, type: 'stump', walkable: false },
    { x: 92, y: 182, type: 'barrel', walkable: false },
    { x: 176, y: 180, type: 'fallen_log_b', walkable: false },
    { x: 181, y: 182, type: 'stump', walkable: false },
    { x: 188, y: 183, type: 'lantern', walkable: false },
    { x: 191, y: 187, type: 'bones_pile', walkable: true },
    { x: 108, y: 181, type: 'dead_tree_c', walkable: false },
    { x: 114, y: 176, type: 'bones_pile', walkable: true },
    { x: 118, y: 179, type: 'dead_tree', walkable: false },
    { x: 156, y: 120, type: 'dead_tree_b', walkable: false },
    { x: 160, y: 122, type: 'dead_tree_c', walkable: false },
    { x: 164, y: 124, type: 'dead_tree_b', walkable: false },
    { x: 96, y: 110, type: 'lantern', walkable: false },
    { x: 202, y: 258, type: 'crate', walkable: false },
    { x: 206, y: 258, type: 'barrel', walkable: false },
    { x: 246, y: 268, type: 'lantern', walkable: false },
    { x: 66, y: 268, type: 'bones_pile', walkable: true },

    // === SOUTH ENTRY CORRIDOR ??? broken wagon and scatter ===
    { x: 152, y: 264, type: 'bones_pile', walkable: true },
    { x: 148, y: 258, type: 'bones_pile', walkable: true },
    { x: 144, y: 278, type: 'wagon', walkable: false },
    { x: 146, y: 280, type: 'barrel', walkable: false },
    { x: 148, y: 280, type: 'crate', walkable: false },
    { x: 142, y: 276, type: 'bones_pile', walkable: true },

    // === MAIN SPINE ??? stumps and mushroom rings ===
    { x: 144, y: 230, type: 'stump_b', walkable: false },
    { x: 156, y: 200, type: 'stump_c', walkable: false },
    { x: 144, y: 180, type: 'fallen_log', walkable: false },
    { x: 156, y: 150, type: 'stump_b', walkable: false },
    { x: 144, y: 140, type: 'fallen_log_v', walkable: false },
    { x: 156, y: 110, type: 'stump_c', walkable: false },
    { x: 153, y: 243, type: 'mushroom', walkable: true },
    { x: 155, y: 244, type: 'mushroom', walkable: true },
    { x: 154, y: 246, type: 'mushroom', walkable: true },
    { x: 143, y: 195, type: 'mushroom', walkable: true },
    { x: 141, y: 196, type: 'mushroom', walkable: true },
    { x: 142, y: 198, type: 'mushroom', walkable: true },
    { x: 153, y: 135, type: 'mushroom', walkable: true },
    { x: 155, y: 136, type: 'mushroom', walkable: true },
    { x: 154, y: 138, type: 'mushroom', walkable: true },

    // === MAIN SPINE ??? lanterns at forks ===
    // Moved from y=161 (now inside the Whispering River) to the south bank at y=162.
    { x: 149, y: 162, type: 'lantern', walkable: false },
    { x: 149, y: 114, type: 'lantern', walkable: false },
    { x: 119, y: 121, type: 'lantern', walkable: false },
    { x: 119, y: 97, type: 'lantern', walkable: false },

    // === HOLLOW APPROACH ??? bones trail to fog gate ===
    { x: 120, y: 34, type: 'bones_pile', walkable: true },
    { x: 123, y: 32, type: 'bones_pile', walkable: true },
    { x: 118, y: 30, type: 'bones_pile', walkable: true },
    { x: 125, y: 28, type: 'bones_pile', walkable: true },

    // === HOLLOW APPROACH ??? bloodstains near fog gate ===
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
    { x: 132, y: 192, type: 'tall_grass_c', walkable: true },
    { x: 131, y: 191, type: 'tall_grass', walkable: true },
    { x: 133, y: 193, type: 'tall_grass_b', walkable: true },

    // === WITCH COTTAGE ??? altar prop ===
    { x: 230, y: 140, type: 'altar', walkable: false },

    // === RUINED WAYSTATION ??? environmental storytelling props ===
    // Iron fence remnants along the perimeter ??? half-collapsed enclosure
    { x: 190, y: 167, type: 'iron_fence', walkable: false },
    { x: 190, y: 169, type: 'iron_fence', walkable: false },
    { x: 207, y: 167, type: 'iron_fence', walkable: false },
    { x: 207, y: 169, type: 'iron_fence', walkable: false },
    // Lanterns flanking the compound entrance
    { x: 193, y: 167, type: 'lantern', walkable: false },
    { x: 204, y: 167, type: 'lantern', walkable: false },
    // Cold campfire between the two cottages ??? last stand
    { x: 197, y: 170, type: 'campfire_remains', walkable: false },
    // Remains of the occupants
    { x: 196, y: 171, type: 'bones', walkable: true },
    { x: 199, y: 169, type: 'bones_pile', walkable: true },
    { x: 195, y: 173, type: 'bloodstain', walkable: true },
    { x: 201, y: 174, type: 'bloodstain', walkable: true },
    // Mossy waystone marker on the path edge
    // Nature reclaiming the ruins
    { x: 190, y: 172, type: 'dead_tree', walkable: false },
    { x: 207, y: 170, type: 'dead_tree_c', walkable: false },
    { x: 193, y: 171, type: 'mushroom', walkable: true },
    { x: 205, y: 168, type: 'mushroom', walkable: true },
    { x: 206, y: 173, type: 'stump', walkable: false },
    { x: 192, y: 174, type: 'fallen_log_b', walkable: false },
    // Spilled cargo from the overturned wagon
    { x: 197, y: 175, type: 'barrel', walkable: false },
    { x: 199, y: 175, type: 'crate', walkable: false },
    { x: 195, y: 176, type: 'barrel', walkable: false },

    // === GOLEM APPROACH ??? scattered bones on the south-bank approach to the fort ===
    { x: 214, y: 178, type: 'bones_pile', walkable: true },
    { x: 220, y: 180, type: 'bloodstain', walkable: true },

    // === WITCH COTTAGE SURROUNDS ??? mushroom ring ===
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
    { x: 176, y: 42, type: 'tall_grass_c', walkable: true },
    { x: 178, y: 42, type: 'tall_grass', walkable: true },
    { x: 180, y: 42, type: 'tall_grass_b', walkable: true },
    { x: 182, y: 42, type: 'tall_grass_c', walkable: true },

    // === FORT INTERIOR DETAIL ===
    { x: 140, y: 130, type: 'campfire_remains', walkable: false },
    { x: 142, y: 132, type: 'bones_pile', walkable: true },
    { x: 144, y: 132, type: 'bones_pile', walkable: true },
    { x: 134, y: 126, type: 'barrel', walkable: false },
    { x: 136, y: 126, type: 'crate', walkable: false },
    { x: 148, y: 126, type: 'barrel', walkable: false },
    { x: 150, y: 126, type: 'crate', walkable: false },

    // ============================================================
    // === ENVIRONMENTAL SCATTER ??? rocks, stumps, wells, statues ===
    // ============================================================

    // --- East ridge approach: rocky scatter ---
    { x: 284, y: 108, type: 'rock', walkable: false },
    { x: 286, y: 112, type: 'rock', walkable: false },
    { x: 288, y: 116, type: 'rock', walkable: false },
    { x: 290, y: 110, type: 'rock', walkable: false },
    { x: 292, y: 120, type: 'rock', walkable: false },
    { x: 285, y: 124, type: 'rock', walkable: false },
    { x: 294, y: 130, type: 'rock', walkable: false },
    { x: 287, y: 136, type: 'stump', walkable: false },
    { x: 298, y: 118, type: 'rock', walkable: false },
    { x: 296, y: 140, type: 'rock', walkable: false },
    { x: 284, y: 142, type: 'stump_b', walkable: false },

    // === ABANDONED OBSERVATORY COMPOUND ??? off-the-beaten-path encounter SE of North Fort ===
    // Observatory tower ??? the area's visual anchor (world ~72, -59)
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
    { x: 228, y: 91, type: 'dead_tree_b', walkable: false },
    { x: 230, y: 99, type: 'dead_tree_c', walkable: false },
    // Cold campfire near the faction fight ??? failed camp
    { x: 229, y: 97, type: 'campfire_remains', walkable: false },
    // Broken wagon near the chest corner
    { x: 210, y: 93, type: 'wagon', walkable: false },
    // Stumps around the perimeter
    { x: 214, y: 97, type: 'stump_c', walkable: false },
    { x: 228, y: 103, type: 'fallen_log', walkable: false },
    // Bloodstain breadcrumbs leading from the main trail toward the observatory
    { x: 218, y: 89, type: 'bloodstain', walkable: true },
    { x: 220, y: 93, type: 'bloodstain', walkable: true },
    { x: 224, y: 101, type: 'bloodstain', walkable: true },
    { x: 228, y: 98, type: 'bloodstain', walkable: true },
    { x: 226, y: 93, type: 'bloodstain', walkable: true },
    { x: 215, y: 95, type: 'bloodstain', walkable: true },
    // --- Quarry lower shelf - cut blocks staged for haulage, a spare cart, spoil and tools ---
    { x: 215, y: 214, type: 'cut_stone_blocks', walkable: false },
    { x: 223, y: 218, type: 'cut_stone_blocks', walkable: false },
    { x: 225, y: 216, type: 'quarry_cart', walkable: false },     // cart on the haul-out track west
    { x: 218, y: 214, type: 'quarry_tools', walkable: false },
    { x: 213, y: 217, type: 'quarry_rubble', walkable: true },
    { x: 220, y: 219, type: 'quarry_rubble', walkable: true },
    { x: 214, y: 220, type: 'rock', walkable: false },            // unworked boulders at the shelf rim
    { x: 222, y: 213, type: 'rock', walkable: false },
    { x: 218, y: 221, type: 'stump_b', walkable: false },

    // --- Cliff corridor ladder ??? gate prop removed; stairway now carves through the cliff ---
    // Lantern at the base of the cliff to draw the player's eye upward
    { x: 270, y: 123, type: 'lantern', walkable: false },

    // --- Temple Ruins corridor (x=278-285) between cliff_face and east ridge ---
    // Broken columns half-swallowed by the cliff wall
    { x: 278, y: 141, type: 'statue', walkable: false },
    { x: 278, y: 148, type: 'statue', walkable: false },
    { x: 278, y: 154, type: 'statue', walkable: false },
    // Rubble and loose stones along the passage
    { x: 281, y: 140, type: 'rock', walkable: false },
    { x: 281, y: 145, type: 'rock', walkable: false },
    { x: 280, y: 151, type: 'rock', walkable: false },
    { x: 279, y: 157, type: 'rock', walkable: false },
    // Lanterns and atmosphere
    { x: 281, y: 142, type: 'lantern', walkable: false },
    { x: 281, y: 150, type: 'lantern', walkable: false },
    { x: 278, y: 156, type: 'lantern', walkable: false },
    // Scattered bones and bloodstains from skeleton patrols
    { x: 279, y: 144, type: 'bones', walkable: true },
    { x: 280, y: 149, type: 'bloodstain', walkable: true },
    { x: 279, y: 153, type: 'bones', walkable: true },
    { x: 280, y: 146, type: 'bloodstain', walkable: true },
    // Southern opening where the east ridge cliff ends ??? ruins spill out
    { x: 282, y: 152, type: 'tombstone', walkable: false },
    { x: 284, y: 154, type: 'tombstone', walkable: false },
    { x: 283, y: 157, type: 'fallen_log_v', walkable: false },
    { x: 285, y: 150, type: 'rock', walkable: false },
    { x: 280, y: 159, type: 'bones_pile', walkable: false },

    // --- Cliff Cemetery ??? scattered remains around the stone circle ---
    { x: 289, y: 144, type: 'statue', walkable: false },
    { x: 291, y: 148, type: 'statue', walkable: false },
    // Tombstones scattered through the clearing
    { x: 286, y: 141, type: 'tombstone', walkable: false },
    { x: 288, y: 146, type: 'tombstone', walkable: false },
    { x: 293, y: 143, type: 'tombstone', walkable: false },
    { x: 295, y: 147, type: 'tombstone', walkable: false },
    { x: 287, y: 149, type: 'tombstone', walkable: false },
    // Bones and remains among the graves
    { x: 290, y: 142, type: 'bones', walkable: true },
    { x: 294, y: 145, type: 'bones', walkable: true },
    { x: 286, y: 147, type: 'bones', walkable: true },
    { x: 292, y: 149, type: 'bones_pile', walkable: false },
    // Bloodstains near the graves
    { x: 290, y: 146, type: 'bloodstain', walkable: true },
    { x: 294, y: 148, type: 'bloodstain', walkable: true },
    // Weathered lantern at the clearing edge
    { x: 285, y: 143, type: 'lantern', walkable: false },

    // --- Stone quarry - worked dig site: timber hoist, cut blocks, mine cart, spoil ---
    { x: 230, y: 207, type: 'quarry_crane', walkable: false },     // shear-legs hoist over the pit (NW edge)
    { x: 237, y: 208, type: 'cut_stone_blocks', walkable: false }, // freshly-cut blocks stacked for haulage
    { x: 234, y: 213, type: 'cut_stone_blocks', walkable: false },
    { x: 240, y: 211, type: 'quarry_cart', walkable: false },      // loaded mine cart on its rail
    { x: 233, y: 211, type: 'quarry_tools', walkable: false },     // pickaxe driven into a block
    { x: 239, y: 214, type: 'quarry_rubble', walkable: true },     // spoil heaps raked aside
    { x: 231, y: 213, type: 'quarry_rubble', walkable: true },
    { x: 241, y: 207, type: 'rock', walkable: false },             // unworked boulders at the rough rim
    { x: 229, y: 211, type: 'rock', walkable: false },
    { x: 236, y: 206, type: 'stump_c', walkable: false },

    // --- Old well clearing props ---
    { x: 192, y: 122, type: 'well', walkable: false },
    { x: 190, y: 120, type: 'flower', walkable: true },
    { x: 194, y: 120, type: 'flower', walkable: true },
    { x: 196, y: 124, type: 'stump', walkable: false },

    // --- South-west stumps and rocks (near entry approach) ---
    { x: 112, y: 274, type: 'rock', walkable: false },
    { x: 116, y: 276, type: 'fallen_log_b', walkable: false },
    { x: 108, y: 278, type: 'rock', walkable: false },
    { x: 174, y: 276, type: 'rock', walkable: false },
    { x: 178, y: 278, type: 'stump', walkable: false },

    // --- Creek-side vegetation (south-east creek) ---
    { x: 202, y: 230, type: 'tall_grass', walkable: true },
    { x: 206, y: 230, type: 'tall_grass_b', walkable: true },
    { x: 210, y: 230, type: 'flower', walkable: true },
    { x: 226, y: 236, type: 'tall_grass_c', walkable: true },
    { x: 230, y: 236, type: 'flower', walkable: true },
    { x: 232, y: 250, type: 'tall_grass', walkable: true },
    { x: 236, y: 250, type: 'tall_grass_b', walkable: true },
    { x: 246, y: 252, type: 'flower', walkable: true },

    // --- West creek vegetation ---
    { x: 36, y: 214, type: 'tall_grass_c', walkable: true },
    { x: 40, y: 216, type: 'tall_grass', walkable: true },
    { x: 42, y: 218, type: 'flower', walkable: true },
    { x: 36, y: 226, type: 'tall_grass_b', walkable: true },
    { x: 38, y: 228, type: 'flower', walkable: true },

    // --- Far south creek vegetation ---
    { x: 112, y: 270, type: 'tall_grass_c', walkable: true },
    { x: 118, y: 270, type: 'tall_grass', walkable: true },
    { x: 124, y: 274, type: 'flower', walkable: true },
    { x: 136, y: 274, type: 'tall_grass_b', walkable: true },
    { x: 172, y: 271, type: 'tall_grass_c', walkable: true },
    { x: 178, y: 271, type: 'flower', walkable: true },
    { x: 190, y: 275, type: 'tall_grass', walkable: true },

    // --- Logging camp detail ---
    { x: 166, y: 238, type: 'stump_b', walkable: false },
    { x: 168, y: 238, type: 'stump_c', walkable: false },
    { x: 170, y: 240, type: 'fallen_log', walkable: false },
    { x: 172, y: 236, type: 'barrel', walkable: false },
    { x: 174, y: 238, type: 'crate', walkable: false },

    // --- Collapsed cottage rubble ---
    { x: 278, y: 162, type: 'rock', walkable: false },
    { x: 282, y: 164, type: 'rock', walkable: false },
    { x: 280, y: 166, type: 'barrel', walkable: false },

    // --- Sunken garden detail (west) ---
    { x: 20, y: 170, type: 'flower', walkable: true },
    { x: 24, y: 170, type: 'flower', walkable: true },
    { x: 26, y: 174, type: 'flower', walkable: true },
    { x: 20, y: 174, type: 'mushroom', walkable: true },
    { x: 28, y: 176, type: 'tall_grass_b', walkable: true },

    // --- Ruined shrine props ---
    { x: 80, y: 280, type: 'statue', walkable: false },
    { x: 84, y: 282, type: 'bones_pile', walkable: true },
    { x: 82, y: 284, type: 'tombstone', walkable: false },

    // --- Golem den props ??? scattered stone outcrops around the clearing ---
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
    { x: 266, y: 184, type: 'tall_grass_c', walkable: true },

    // --- Large central grass zone scatter (x:160-200, y:100-130) ---
    { x: 176, y: 108, type: 'rock', walkable: false },
    { x: 180, y: 112, type: 'stump_b', walkable: false },
    { x: 184, y: 106, type: 'mushroom', walkable: true },
    { x: 188, y: 114, type: 'rock', walkable: false },
    { x: 182, y: 118, type: 'flower', walkable: true },
    { x: 186, y: 122, type: 'tall_grass', walkable: true },

    // --- South-central empty zone scatter (x:100-140, y:230-250) ---
    // Override: remove noise-generated stump at (128,227) ??? no interaction exists there
    { x: 128, y: 227, type: 'grass', walkable: true },
    { x: 100, y: 236, type: 'fallen_log_v', walkable: false },
    { x: 104, y: 240, type: 'rock', walkable: false },
    { x: 108, y: 244, type: 'stump_c', walkable: false },

    // --- Rocky ford detail (east) ---
    { x: 260, y: 230, type: 'rock', walkable: false },
    { x: 262, y: 232, type: 'rock', walkable: false },
    { x: 264, y: 234, type: 'tall_grass_b', walkable: true },
    { x: 258, y: 234, type: 'flower', walkable: true },

    // --- Central-south path variety (between paths y:220-240) ---
    { x: 148, y: 224, type: 'rock', walkable: false },
    { x: 152, y: 228, type: 'stump', walkable: false },
    { x: 156, y: 226, type: 'mushroom', walkable: true },
    { x: 160, y: 232, type: 'rock', walkable: false },

    // --- Far-east midfield scatter (x:285-295, y:200-240) ---
    { x: 288, y: 204, type: 'rock', walkable: false },
    { x: 290, y: 210, type: 'rock', walkable: false },
    { x: 286, y: 216, type: 'fallen_log_b', walkable: false },
    { x: 292, y: 222, type: 'rock', walkable: false },
    { x: 288, y: 230, type: 'rock', walkable: false },
    { x: 290, y: 236, type: 'stump', walkable: false },

    // --- Cliff-top stone plateau (x:60-79, y:178-185) ---
    // Rubble and signs of a past encampment ??? the Sentinels drove defenders out long ago.
    { x: 64, y: 180, type: 'rock', walkable: false },
    { x: 69, y: 179, type: 'rock', walkable: false },
    { x: 76, y: 181, type: 'rock', walkable: false },
    { x: 62, y: 183, type: 'rock', walkable: false },
    { x: 74, y: 184, type: 'rock', walkable: false },
    { x: 67, y: 182, type: 'stump_b', walkable: false },
    { x: 71, y: 185, type: 'stump_c', walkable: false },
    { x: 77, y: 179, type: 'bones', walkable: true },
    { x: 61, y: 181, type: 'bones', walkable: true },
    { x: 75, y: 183, type: 'tall_grass_c', walkable: true },
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
    // West cliff overlook supplies near world (-59,43).
    { x: 91, y: 193, type: 'barrel', walkable: false },
    { x: 89, y: 194, type: 'crate', walkable: false },
    { x: 93, y: 195, type: 'barrel', walkable: false },
    // Lower west sentinel overlook props ? keep (74,203) clear for the Stone Sentinel spawn.
    { x: 72, y: 202, type: 'barrel', walkable: false },
    { x: 76, y: 202, type: 'crate', walkable: false },
    { x: 76, y: 204, type: 'lantern', walkable: false },
    { x: 73, y: 204, type: 'bones_pile', walkable: true },

    // === WHISPERING RIVER ??? environmental storytelling ===
    // South bank (broken bridge approach): collapsed supply wagon suggests the crossing
    // was once used by ranger patrols. The player can see the north stub and bonfire beyond.
    { x: 148, y: 165, type: 'wagon', walkable: false },
    { x: 145, y: 164, type: 'barrel', walkable: false },
    { x: 143, y: 165, type: 'crate', walkable: false },
    // South bank (working bridge approach, x=188???193): old supply cache beside the crossing
    { x: 191, y: 163, type: 'barrel', walkable: false },
    { x: 186, y: 166, type: 'crate', walkable: false },
    { x: 185, y: 163, type: 'rock', walkable: false },
    // North bank (after crossing working bridge): signs of the old ranger patrol route westward
    { x: 193, y: 151, type: 'lantern', walkable: false },
    { x: 178, y: 150, type: 'lantern', walkable: false },
    { x: 160, y: 150, type: 'lantern', walkable: false },
    { x: 193, y: 152, type: 'bones_pile', walkable: true },

    // === RUINED RANGER CHECKPOINT props ??? world ~(53, 7) ===
    { x: 208, y: 134, type: 'destroyed_house', walkable: false },
    { x: 205, y: 133, type: 'campfire_remains', walkable: false },
    { x: 212, y: 133, type: 'fallen_log', walkable: false },
    { x: 213, y: 136, type: 'barrel', walkable: false },
    { x: 211, y: 138, type: 'barrel', walkable: false },
    { x: 209, y: 140, type: 'bones_pile', walkable: true },
    { x: 206, y: 141, type: 'bloodstain', walkable: true },
    { x: 214, y: 140, type: 'cart', walkable: false },

    // === RIVERBANK PENINSULA ??? world ~(52, 7) ===
    // A collapsed river outpost: broken dock, sunken rowboat, scattered debris suggesting
    // the checkpoint once ferried supplies across the Whispering River before the war.
    { x: 204, y: 158, type: 'boat_wreck', walkable: false },
    { x: 206, y: 155, type: 'dock', walkable: true },
    { x: 202, y: 156, type: 'barrel', walkable: false },
    { x: 204, y: 155, type: 'crate', walkable: false },
    { x: 200, y: 158, type: 'bones_pile', walkable: true },
    { x: 201, y: 156, type: 'bloodstain', walkable: true },
    { x: 203, y: 153, type: 'bones', walkable: true },
    { x: 205, y: 153, type: 'stump_b', walkable: false },
    { x: 177, y: 152, type: 'bones_pile', walkable: true },
    { x: 163, y: 151, type: 'bloodstain', walkable: true },
    { x: 155, y: 152, type: 'rock', walkable: false },
    { x: 172, y: 152, type: 'fallen_log_v', walkable: false },
  ],
  secretAreas: [],
  elevationZones: [
    // y=2 start + width to x=245 removes el0 strip at north portals (y=3) and NE approach (x>195).
    // === TIER 1: Broad north highlands (main elevated mass) ??? extended south to close el0 gap vs. west ridge ===
    { x: 36, y: 2, width: 210, height: 106, elevation: 1 },
    // === TIER 2: North-center summit (ruins / waterfall zone) ===
    { x: 108, y: 2, width: 94, height: 48, elevation: 2 },
    // === TIER 1: NE fortress ridge ===
    { x: 194, y: 24, width: 98, height: 96, elevation: 1 },
    // === TIER 2: Far NE caldera lip ===
    { x: 246, y: 0, width: 54, height: 56, elevation: 2 },
    // === TIER 1: NW ridge (wolf den / ruins area) ===
    // height extended from 70→85 (y=2–86) to close the el=0 pocket at x=28–35, y=72–79
    // (NW water seal gap between this zone and the broad highlands which start at x=36)
    // and at x=4–35, y=80–86 (river west run). Water tiles in that pocket rendered at the
    // wrong screen height, causing a sky-coloured strip visible from the south river bank.
    { x: 4, y: 2, width: 50, height: 85, elevation: 1 },
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
    { x: 282, y: 100, width: 15, height: 50, elevation: 1 },
    // === TIER 2: East Ridge Ascent summit field - one cliff layer above the ladder shortcut, the
    // highest point of the optional climb. The el1->el2 step is crossed via a spinePath grass seam
    // where the north leg meets the field. ===
    { x: 256, y: 143, width: 10, height: 8, elevation: 2 },
    // === TIER 1: South-east rocky bluff ===
    { x: 200, y: 236, width: 28, height: 16, elevation: 1 },
    // === TIER 1: South-west rocky hill (near ruined shrine) ===
    { x: 72, y: 274, width: 18, height: 16, elevation: 1 },
    // === GROUND LEVEL: Western bypass corridor ===
    // Force elevation=0 across the entire zone so stampCliffs (which runs after placeFeatures)
    // cannot auto-generate blocking cliff art that would seal the narrow bypass trail.
    // Covers x=44-142 (trail west of cliff-1, plus connector strip) y=180-223.
    // Keep the el0???el1 vertical seam east of the hunter cottage foundation.
    { x: 44, y: 180, width: 99, height: 44, elevation: 0 },
    // === GROUND LEVEL: Hunter cliff shelf column ===
    // Overrides the ranger plateau el1 (x=112?191, y=148?199) for this narrow column so
    // stampCliffs generates no cliff art inside the shelf. The path tiles at y=178?183
    // (path {x:154,w:80} covers x=160?173 at y=178?183) cause stampCliffs to skip the
    // north boundary of this zone, so no unwanted cliff_edge is stamped at y=184.
    // Height=36 covers cliff A (y=184?191), cliff B (y=192?209), and the stairway
    // approach below (y=210?219).
    // width: 28 (was 18) ? extended east to x=187 to cover the EW stairway (x=171?176)
    // and the east cliff grass patch clearing (x=177?186) so stampCliffs cannot re-stamp
    // cliff art over the carved grass areas.
    { x: 160, y: 177, width: 60, height: 43, elevation: 0 },
  ],
  stairways: [
    // All stairways start AT south_face = zone_y + zone_h - 1 so placeStairways
    // (post-stampCliffs) overwrites cliff_edge + all 3 cliff tiles below it.

    // Main trail ??' north highlands (el1): zone {x:112,y:148,h:52}, south_face=199
    // (Stairway removed ??? cliff runs unbroken along full south face of el2 summit)
    // NW corner el1 south descent: zone {x:4,y:4,h:68}, south_face=71
    { x: 38, y: 71, width: 6, height: 4, elevation: 1 },
    // NE fortress ridge (east temple terrace el1): zone {x:240,y:132,h:62}, south_face=193
    { x: 248, y: 193, width: 6, height: 4, elevation: 1 },
    // Second NE temple-ridge access at x=228 removed - stray stairs at world (~80,44) / tile
    // (228-233,193-196); south face stays sealed here like the main-trail stair removal.
    // West hidden grove (y=163): no stair ??? cliff runs the full shelf/Grove???plateau seam so this
    // cannot shortcut the Disparaged Cottage / ranger-gate arc.
    // SE enchanted hills south: stairway removed ??? cliff runs unbroken across the full south face.
    // East ridge south face: zone {x:282,y:100,h:50}, south_face=149
    { x: 290, y: 149, width: 6, height: 4, elevation: 1 },
    // South-east bluff south face: zone {x:200,y:236,h:16}, south_face=251
    { x: 209, y: 251, width: 8, height: 5, elevation: 0 },
    // South-west rocky hill south: zone {x:72,y:274,h:16}, south_face=289
    { x: 78, y: 289, width: 6, height: 4, elevation: 1 },
    // NE fortress ridge south face mid-corridor: zone {x:194,y:24,h:96}, south_face=119.
    // Creates a traversal break in the otherwise unbroken 97-tile cliff face and eliminates
    // the sky-gap seam visible at approximately world (51, 28) near this cliff boundary.
    { x: 199, y: 119, width: 6, height: 4, elevation: 1 },
    // South fort shelf: cliff_face stamps an unwalkable west face; carved stone steps (el0)
    // replace the west wall + one interior column so a barrel row does not choke the landing.
    { x: 55, y: 194, width: 12, height: 4, elevation: 0, axis: 'ew' },
    // West cliff overlook: east-facing stair from world (-70,42) into the new pocket.
    { x: 80, y: 190, width: 7, height: 5, elevation: 0, axis: 'ew' },
    // Lower west sentinel overlook: NS stair UI -76,48 ? -76,53 (height 6); landing on the top tread.
    { x: 72, y: 198, width: 5, height: 6, elevation: 0 },
    // North face stairway: connects cliff-top plateau (y=185) through cliff_edge/cliff body to
    // the inner sanctum (y=190).  NS axis ??? treads descend south.
    { x: 68, y: 185, width: 5, height: 6, elevation: 0 },
    // Hunter cliff shelf ? LOWER stairway: base (y=211) up to mid landing (y=196).
    // Both sides el0 (hunter-shelf force zone). Spans cliff B lower body (y=204?209) plus
    // the two sprite-buffer rows (y=210?211). Approach clearing at y=210?213 restores
    // the flanking buffer tiles to walkable grass so the base is reachable from the south.
    { x: 162, y: 204, width: 5, height: 8, elevation: 0 },
    // EW stairway boring east from the secluded shelf (x=170) through cliff B into the
    // east cliff grass patch. Player approaches from x=170 on the shelf and steps east.
    // Width=6 = climbing distance; height=6 = corridor width (centred in the shelf Y span).
    { x: 171, y: 197, width: 6, height: 6, elevation: 0, axis: 'ew' },
    // Third overlook stair: climbs north from the compact right-hand landing into another
    // small grass pocket at more-negative UI Y.
    { x: 197, y: 191, width: 7, height: 7, elevation: 0 },
    // Final skinny stair from the west shelf into the small lookout above.
    { x: 176, y: 183, width: 3, height: 7, elevation: 0 },
    // Lake overlook north lip at world (~100,30): replace the cliff block with stairs
    // so the north-south bridge connects flush through the raised bank.
    { x: 248, y: 176, width: 4, height: 6, elevation: 1 },
    // === CLIFF-TOP WALKWAY STAIRWAYS ===
    // South entry: el0 (north-bank corridor) ??' el1 (cliff-top walkway).
    // stampCliffs stamps cliff_edge at y=121 + cliff wall at y=122-124 (drop el1??'el0).
    // Stair spans y=119-126: 3 tiles on the cliff-top, 4 tiles through the cliff art,
    // 2 tiles of ground below. elevation=0 so el0 ground connects; stairs tile lets
    // the player cross the 1-step diff up to el1 cliff-top (canWalkTo allows stairs ?1).
    { x: 203, y: 119, width: 5, height: 8, elevation: 0 },
    // North exit: el1 (cliff-top walkway, y=114) ??' el1 (NE fortress ridge, y=113).
    // Both sides are el1 so stampCliffs generates no cliff art here. The stairway
    // provides a visual cue and cuts through any residual cliff art from the original
    // cliff_face feature. Spans y=112-117: 2 tiles in highlands, 4 tiles on cliff-top.
    { x: 223, y: 112, width: 5, height: 6, elevation: 1 },
    // Broken-bridge spine descent (UI ~0, 2?3): carved steps from the north-bank corridor down
    // to the folded north stub / shortcut lever. placeStairways runs post-stampCliffs.
    { x: 147, y: 152, width: 6, height: 4, elevation: 1 },
    // South-bank mirror (UI ~0, 12?15): steps up from the ranger-plateau approach to the south stub.
    // Starts at y=162 so syncRiversideBridgeShortcutState (y=155?161) does not overwrite treads.
    { x: 147, y: 162, width: 6, height: 4, elevation: 1 },
    // Funnel-drop stair at x=110 removed ??? it read as stray steps into the river; el1???el0
    // along the shelf is handled by the cliff seam + south-bank corridor without that block.
    // Hollow approach: stairway west of the ridge chest so the player can ascend to el1.
    // South face of north highlands (y=2, h=106) is y=107; stampCliffs puts cliff_edge at y=107
    // and cliff wall at y=108-110 (depth 2+1=3). Stair spans y=107..110 to overwrite the full
    // cliff face, but stays narrow so it does not clip into the ladder overlook shoulder.
    { x: 110, y: 107, width: 4, height: 4, elevation: 1 },
    // Traditional cliff-corridor stairway (x=260-262, y=118-130, width=3, height=13).
    // Carved through the main cliff face into a compact grass pocket/overlook. The overlook is
    // sealed by cliff on the east side, so it cannot connect to the corridor until the player
    // kicks the coiled ladder gate at x=268, y=132.
    { x: 260, y: 118, width: 3, height: 13, elevation: 1 },
    // Short west-side walkup into the enclosed grass patch. Centered around world (109,-35)
    // / tile (259,115), it cuts through the west cliff cap without opening the east corridor.
    { x: 255, y: 114, width: 5, height: 3, elevation: 1, axis: 'ew' },
    // Hollow west-cliff corrupted shelf: starts at world ~(-56,-98) and climbs east onto
    // a small corrupted dirt/grass landing above the cliff wall.
    { x: 94, y: 49, width: 7, height: 6, elevation: 1, axis: 'ew' },
    // (south-entry stairway removed - the pocket/corridor connection is runtime-gated)
  ],
  ladders: [],
  enemyZones: [
    // Zones are spread by quadrant / POI so packs are not stacked on one choke (esp. north gate).

    // NE ??? Hollow shadow creatures (formerly bandits)
    { x: 210, y: 25, width: 20, height: 18, enemyType: 'shadow', count: 6 },
    { x: 182, y: 46, width: 32, height: 14, enemyType: 'shadow', count: 4 },

    // SW ??? spider nest + perimeter (offset from nest center; thinned for early-game readability)
    { x: 20, y: 240, width: 28, height: 22, enemyType: 'spider', count: 5 },
    { x: 55, y: 252, width: 22, height: 12, enemyType: 'spider', count: 2 },

    // NW ??? Hollow dark wolves + shadows (formerly skeletons)
    { x: 65, y: 25, width: 22, height: 16, enemyType: 'wolf', count: 4 },
    { x: 50, y: 50, width: 20, height: 16, enemyType: 'shadow', count: 3 },

    // Lone Hollow Shade (reaper) at the cliff stretch end ??? world (9, -44) / tile (159, 106).
    { x: 156, y: 104, width: 6, height: 4, enemyType: 'shadow', count: 1 },

    // Central ??? east of ranger plateau / inn (avoids fort footprint ~130???152, 120???138)
    // Lifted north (y148->138, h18->14) off the central water-slime ford band (y154-166) so the
    // crossing reads as two sequential beats - dodge ranged slime fire while crossing, THEN fight
    // the wolves on dry land - instead of a ranged+chain gank-stack at the ford's east shoulder.
    // count kept at 4 (intended stiff pack); flag for playtest since it sits on the main route.
    { x: 166, y: 138, width: 18, height: 14, enemyType: 'wolf', count: 4 },
    // Hollow approach stair landing ? armored wolves on the grass shelf (world ~-38,-38).
    { x: 106, y: 111, width: 9, height: 2, enemyType: 'armored_wolf', count: 2, patrolRadius: 0.8 },
    { x: 86, y: 116, width: 20, height: 14, enemyType: 'wolf', count: 3 },
    // Stone Sentinel guards the deeper cliff sanctum east of the Iron Gate / Cliff Ledge route.
    { x: 209, y: 190, width: 1, height: 1, enemyType: 'stone_sentinel', count: 1 },
    // Cliff inlet back wall (world ~-46,41 / tile ~108,191) ??? Hollow Shade lurking deep.
    // Very tight chaseRange (2.8) ??? only aggros on direct approach; easily missed.
    // Faces south (cliff wall) by default. A dripfeed of the Hollow section.
    { x: 107, y: 190, width: 6, height: 2, enemyType: 'shadow_lurker', count: 1 },

    // The two Ridge Revenants are no longer placed as static zones - they are SUMMONED from
    // heresy glyphs (props: summoning_ritual at tile 260,142 and 18,147) when a player holding
    // 3+ cursed sediment on a ritual glyph summons the revenant. Logic: RevenantRituals.ts.

    // West ??? hidden grove plants
    { x: 18, y: 124, width: 22, height: 18, enemyType: 'plant', count: 5 },
    // Stops at y=162 so patrols do not spawn on the south_face fence row (y=163).
    { x: 52, y: 148, width: 18, height: 15, enemyType: 'wolf', count: 4 },

    // E ??? lakeside spiders + temple skeletons
    { x: 230, y: 176, width: 24, height: 14, enemyType: 'spider', count: 3 },
    { x: 246, y: 136, width: 26, height: 26, enemyType: 'skeleton', count: 6 },

    // First bridge crossing guard ? 2 wolves at the spine bridge over the south entry river (y:270).
    { x: 140, y: 267, width: 16, height: 6, enemyType: 'wolf', count: 2 },

    // South ? split wolf / slime along trail (less pile-up on portal column)
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

    // Far E / SE coverage - east void consolidated into authored mini-POIs below.
    { x: 216, y: 68, width: 22, height: 16, enemyType: 'wolf', count: 3 },
    { x: 195, y: 256, width: 16, height: 14, enemyType: 'wolf', count: 3 },
    { x: 55, y: 266, width: 18, height: 14, enemyType: 'spider', count: 2 },
    { x: 245, y: 266, width: 16, height: 14, enemyType: 'plant', count: 4 },
    { x: 175, y: 178, width: 16, height: 14, enemyType: 'spider', count: 2 },
    { x: 105, y: 178, width: 14, height: 12, enemyType: 'wolf', count: 3 },
    // South of the Hollow river: a single undead guard force at the crossing approach.
    { x: 142, y: 90, width: 16, height: 14, enemyType: 'skeleton', count: 2 },
    { x: 150, y: 90, width: 8, height: 10, enemyType: 'skeleton_captain', count: 1 },

    // SW plateau trail
    { x: 36, y: 192, width: 20, height: 16, enemyType: 'wolf', count: 4 },
    { x: 110, y: 200, width: 14, height: 12, enemyType: 'skeleton', count: 2 },
    { x: 142, y: 210, width: 18, height: 14, enemyType: 'wolf', count: 2 },

    // EAST VOID POI 1 - Consumed Ridge Camp (world ~126, 10): undead overtook a supply cache
    { x: 274, y: 158, width: 12, height: 10, enemyType: 'shadow', count: 2 },
    { x: 276, y: 162, width: 10, height: 8, enemyType: 'skeleton', count: 2 },
    // EAST VOID POI 2 - Ridge Lumberyard Remains (world ~128, -62): shadow patrol at the old cut
    { x: 276, y: 88, width: 14, height: 12, enemyType: 'shadow', count: 2 },
    { x: 280, y: 92, width: 10, height: 8, enemyType: 'skeleton', count: 2 },

    { x: 212, y: 177, width: 18, height: 14, enemyType: 'golem', count: 1 },

    // East artery patrol ? 2 wolves on the dead 20-tile stretch between the spider zone
    // (ends x:191) and the golem arena (starts x:212). Closes a long no-encounter walk.
    { x: 194, y: 178, width: 16, height: 6, enemyType: 'wolf', count: 2 },

    // SE forgotten shrine guardians ? vine plants protecting the hidden chest. Discovery encounter
    // in the previously-empty SE void quadrant.
    { x: 246, y: 246, width: 18, height: 14, enemyType: 'plant', count: 4 },

    // AUTHORED ENCOUNTER POD 1 ??? mid-spine fork, first multi-enemy test
    { x: 146, y: 181, width: 6, height: 4, enemyType: 'wolf', count: 3 },
    // AUTHORED ENCOUNTER POD 2 ??? river crossing approach handled by the undead guard above.
    // AUTHORED ENCOUNTER POD 3 ??? hollow approach: shades stalk the corridor to the fog gate
    { x: 116, y: 33, width: 10, height: 8, enemyType: 'shadow_lurker', count: 1, patrolRadius: 1.0 },
    // Hollow approach west shelf ? stone golem at world (-122, -40).
    { x: 28, y: 110, width: 1, height: 1, enemyType: 'golem', count: 1 },
    // Lake overlook east shelf ? lone stone golem watching the high-water bridge approach.
    { x: 289, y: 180, width: 1, height: 1, enemyType: 'golem', count: 1 },
    // Hollow Shades - staged along the bonfire-to-gate corridor (y:72 -> y:18).
    // South pods sit below the iron gate (y:51+) so patrols never sweep the Deep Hollow flame yard.
    { x: 118, y: 67, width: 10, height: 8, enemyType: 'shadow_lurker', count: 2, patrolRadius: 1.0 },
    { x: 116, y: 60, width: 12, height: 8, enemyType: 'shadow_lurker', count: 2, patrolRadius: 1.0 },
    { x: 118, y: 34, width: 10, height: 8, enemyType: 'shadow_lurker', count: 3, patrolRadius: 1.0 },
    { x: 116, y: 21, width: 12, height: 8, enemyType: 'shadow_lurker', count: 3, patrolRadius: 1.0 },

    // Hollow Reavers ? ranged sister enemies of the Shades. Throw scythe-blade projectiles.
    // Kept sparse in the open Hollow flats so ranged pressure reads as dread, not off-screen spam.
    { x: 160, y: 38, width: 14, height: 12, enemyType: 'hollow_reaver', count: 3 },
    { x: 140, y: 30, width: 14, height: 10, enemyType: 'hollow_reaver', count: 1 },
    { x: 178, y: 28, width: 14, height: 12, enemyType: 'hollow_reaver', count: 1 },
    // One Reaver mixed into the corridor to harass approach to the fog gate.
    { x: 118, y: 30, width: 10, height: 6, enemyType: 'hollow_reaver', count: 1 },

    // East ridge wolf zone removed ??? zone was 97% unwalkable cliff tiles.
    // Stone quarry ??? skeletons among the rubble (main pit + lower west shelf of the same dig)
    { x: 228, y: 205, width: 16, height: 12, enemyType: 'skeleton', count: 4 },
    { x: 213, y: 213, width: 13, height: 8, enemyType: 'skeleton', count: 2 },
    // Logging camp ??? wolves prowl the cleared area. Pushed NE off the south entry
    // approach (world ~20,93 / tile 170,243) so Explorer Ulmund's teaching beat isn't
    // delivered mid-fight; pack now guards the camp proper deeper in.
    { x: 176, y: 220, width: 18, height: 12, enemyType: 'wolf', count: 3 },
    // Collapsed cottage spiders removed - east void consolidated into Consumed Ridge Camp POI.
    // Hollow-side bridge water stretch around world (-51,64): first water-slime test pocket,
    // safely below the y=105 cutoff and away from the start portal river.
    { x: 88, y: 208, width: 30, height: 18, enemyType: 'water_slime', count: 1 },
    // Southern lake connector just below world y=105. Spawns prefer water, with shore fallback
    // only if the local generated water shape leaves no valid water tile in the zone.
    { x: 180, y: 244, width: 24, height: 12, enemyType: 'water_slime', count: 1 },
    // === WATER SLIMES - every sizable water body south of the north portal river ===
    // Eastern overlook lake + channel - world (~100, 39).
    { x: 240, y: 180, width: 20, height: 16, enemyType: 'water_slime', count: 2 },
    // West forest lake - world (~-110, 50).
    { x: 40, y: 200, width: 16, height: 12, enemyType: 'water_slime', count: 1 },
    // Central golem-ford river (broken-bridge crossing) - world (~-30, 8).
    { x: 120, y: 154, width: 100, height: 12, enemyType: 'water_slime', count: 2 },
    // South-east creek system - world (~75, 98).
    { x: 200, y: 232, width: 50, height: 32, enemyType: 'water_slime', count: 1 },
    // Southern river bend - world (~0, 124).
    { x: 118, y: 270, width: 64, height: 8, enemyType: 'water_slime', count: 1 },
    // SW rocky pond - world (~-122, 132).
    { x: 28, y: 278, width: 12, height: 8, enemyType: 'water_slime', count: 1 },
    // East small pond - world (~130, 75).
    { x: 275, y: 220, width: 10, height: 8, enemyType: 'water_slime', count: 1 },
    // Ruined shrine ??? shadows guard the ancient stones
    { x: 76, y: 276, width: 14, height: 12, enemyType: 'shadow', count: 2 },
    // SW corner golem den ? punishes players who stray deep into the south-west forest early.
    // Moved from y:284 (too close to spawn) to y:255 so it's a mid-exploration threat, not a
    // spawn-adjacent death trap for first-time players exploring off the main path.
    { x: 70, y: 255, width: 12, height: 8, enemyType: 'golem', count: 1 },
    // Rocky ford wolf filler removed - east void consolidated into authored POIs.

    // === OBSERVATORY COMPOUND ??? hidden encounter SE of North Fort ===
    // Stone Sentinels guarding the observatory entrance
    { x: 220, y: 90, width: 10, height: 8, enemyType: 'stone_sentinel', count: 2 },
    // Stone Golem patrolling the compound perimeter (drops golem_heart)
    { x: 226, y: 94, width: 8, height: 6, enemyType: 'golem', count: 1 },

    // === CORRUPTED GIANT ??" field boss in the open hollow meadow west of the corrupted river ===
    // Off the beaten path: requires crossing the sealed NW corridor away from the main hollow route.
    // Weaker than the Hollow Guardian but hits harder than anything else in the open world.
    // Scales to a regular field encounter in later maps.
    { x: 68, y: 68, width: 6, height: 6, enemyType: 'corrupted_giant', count: 1 },
    // East-edge field boss - guards the Ironbark Band chest at tile (293,243) = world (143,93).
    // Converts a reachable but empty edge clearing into a "should I risk it?" detour.
    { x: 231, y: 268, width: 18, height: 16, enemyType: 'corrupted_giant', count: 1 }, // guards the cliff-edge Ironbark chest
  ],
};
