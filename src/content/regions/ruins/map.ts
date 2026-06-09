import type { MapDefinition } from '@/data/mapGenerator';
import { cityBlocks, cityFences } from './cityBlocks';

// GUILRHYM ROAD NETWORK - the deliberate, inter-connecting streets (granite setts).
// Buildings are kept OFF these (keepClear) and they're laid as walkable road_setts, so
// roads read as roads. N-S roads are split at the canal (y169-175) - the only crossing is
// the Toll Bridge. Everything NOT on a road is destined to be fenced/gated off.
const GUILRHYM_ROADS: Array<{ x: number; y: number; width: number; height: number }> = [
  // East–west streets (full width)
  { x: 16, y: 30, width: 268, height: 3 },
  { x: 16, y: 62, width: 268, height: 3 },
  { x: 16, y: 92, width: 268, height: 3 },
  { x: 16, y: 130, width: 268, height: 3 },
  { x: 16, y: 192, width: 268, height: 3 },
  { x: 16, y: 230, width: 268, height: 3 },
  { x: 16, y: 270, width: 268, height: 3 },
  // North–south streets, north half (stop at the canal's north bank)
  ...[18, 58, 102, 198, 242, 280].map(x => ({ x, y: 16, width: 3, height: 150 })),
  // North–south streets, south half (start at the canal's south bank)
  ...[18, 58, 102, 198, 242, 280].map(x => ({ x, y: 178, width: 3, height: 110 })),
];
const ROAD_RECTS = GUILRHYM_ROADS.map(r => ({ x0: r.x, y0: r.y, x1: r.x + r.width - 1, y1: r.y + r.height - 1 }));

// =============================================================================
// GUILRHYM - 300x300 ruined Victorian city (the act-two level after the Hollow).
//
// DESIGN PHILOSOPHY (mirrors Whispering Woods' intentionality):
//   - The city RISES on a slope toward the cathedral in the north. The critical
//     path DOGLEGS rather than running straight up a central boulevard:
//        South Gate → forced EAST through the Market quarter
//        → cross the CANAL at the single Toll Bridge
//        → forced WEST along the north bank into the Undercroft
//        → up to The Heights → EAST into the Reliquary Cloister
//        → the Cathedral fog gate (→ interior_guilrhym_cathedral boss arena).
//   - ONE hard barrier splits the map: the Canal. Only the Toll Bridge crosses it.
//   - TWO winch levers open shortcuts that collapse the dogleg back onto the
//     central spine for return/death-run trips (textbook Souls loops):
//        Lever 1 → the Heights portcullis (center, y116-118)
//        Lever 2 → the central canal sluice (center, y169-175)
//     Both gate tiles are authored CLOSED here and carved open at runtime by
//     syncGuilrhymBossState in RuntimeMapFlow.ts once the matching lever is pulled.
//   - Asymmetry: WEST = decayed wealthy estates + the Undercroft; EAST = the
//     market/artisan quarter + the cemetery rise. Cathedral pushed off-center.
//   - A corruption/danger GRADIENT (bloodstains → bones → ash) rises toward the
//     cathedral; a votive-candle trail wayfinds through the Reliquary Cloister.
//
// ENGINE NOTE: baseTerrain 'city' fills the whole map with WALKABLE cobblestone
// (mapGenerator.ts). So movement is shaped by placing WALL masses and leaving
// STREET GAPS between them - not by carving streets out of solid blocks.
//
// FIXED ANCHORS (kept in lockstep with external files - do not move casually):
//   spawn (150,286); Oliver at tile (159,275)=world(9,125) ↔ RuntimeConfig oliver
//   (his manor building stays at tile 128,259);
//   bonfires (150,272)/(200,198)/(95,110)/(150,55) ↔ bonfires.ts;
//   fog gate y45 x147-153 + lever gates ↔ RuntimeMapFlow.syncGuilrhymBossState;
//   wells/sign/lever interactionIds ↔ dialogues.ts.
// =============================================================================

export const guilrhymDef: MapDefinition = {
  name: 'Guilrhym',
  subtitle: 'A city consumed by what it buried',
  width: 300,
  height: 300,
  spawnPoint: { x: 150, y: 286 },
  seed: 714,
  baseTerrain: 'city',
  borderTile: 'stone',
  coastalSouthBorder: false,
  autoRoads: false,
  features: [
    // =========================================================================
    // PERIMETER - seal the map edges (cliffs + curtain wall). South portal gap
    // is left open at x146-154, y296+.
    // =========================================================================
    { x: 0, y: 0, width: 300, height: 6, type: 'wall', fill: 'stone' },
    { x: 0, y: 0, width: 6, height: 300, type: 'wall', fill: 'stone' },
    { x: 294, y: 0, width: 6, height: 300, type: 'wall', fill: 'stone' },
    // South curtain wall with the gate gap
    { x: 0, y: 294, width: 146, height: 6, type: 'wall', fill: 'stone' },
    { x: 154, y: 294, width: 146, height: 6, type: 'wall', fill: 'stone' },
    // Edge cliff dressing
    { x: 6, y: 60, width: 10, height: 180, type: 'cliff_face' },
    { x: 284, y: 60, width: 10, height: 180, type: 'cliff_face' },

    // =========================================================================
    // DISTRICT FLOORS - the city is CONCRETE. Ground stays grey stone everywhere;
    // identity comes from GEOMETRY (blocks, alleys, verticality), not ground colour.
    // Only two intentional stone accents + the wet canal banks are retinted here.
    // Placed EARLY so later walls/buildings overwrite them.
    // =========================================================================
    // Grand pale civic stone - cathedral forecourt + Reliquary Cloister (north landmark)
    { x: 100, y: 10, width: 100, height: 34, type: 'clearing', fill: 'cobble_grand' },
    { x: 108, y: 44, width: 84, height: 52, type: 'clearing', fill: 'cobble_grand' },
    // Ash-corruption creeping out from the cathedral steps (gradient, dark stone)
    { x: 120, y: 44, width: 60, height: 14, type: 'clearing', fill: 'ashen_cobble' },
    // Canal banks - flood-damaged wet stone (water overwrites the channel later)
    { x: 16, y: 166, width: 268, height: 3, type: 'clearing', fill: 'waterlogged_cobble' },
    { x: 16, y: 176, width: 268, height: 3, type: 'clearing', fill: 'waterlogged_cobble' },
    // PROPER ROADS - granite setts on the thoroughfares (not dirt spines): the central
    // gate boulevard + the dense west-pocket high street.
    { x: 144, y: 248, width: 12, height: 44, type: 'clearing', fill: 'road_setts' },
    { x: 24, y: 204, width: 116, height: 4, type: 'clearing', fill: 'road_setts' },
    // THE ROAD NETWORK - the inter-connecting street grid (see GUILRHYM_ROADS at top).
    // Laid EARLY so later walls / the canal / civic plazas override (and keep gating) where
    // they cross; everything off these roads is fenced/gated off (the iron_fence fabric).
    ...GUILRHYM_ROADS.map(r => ({ x: r.x, y: r.y, width: r.width, height: r.height, type: 'clearing' as const, fill: 'road_setts' as const })),

    // =========================================================================
    // ZONE A - OUTSKIRTS & GATE PLAZA (y: 242–293)
    // Open entry plaza; Oliver slumped by his west estate. The INNER CITY WALL
    // at y242 blocks the way north EXCEPT the east gap (x200–228), forcing the
    // player east into the market.
    // =========================================================================

    // Inner city wall - forces the dogleg east. Gap at x200–228.
    { x: 16, y: 242, width: 184, height: 5, type: 'wall', fill: 'stone' },
    { x: 228, y: 242, width: 56, height: 5, type: 'wall', fill: 'stone' },
    // Gatehouses flanking the east opening
    { x: 196, y: 240, width: 6, height: 8, type: 'building' },
    { x: 228, y: 240, width: 6, height: 8, type: 'building' },

    // West estate (Oliver) - manor where he slumps; the tenement lands + Tolbooth
    // (placed as props) form the rest of the west frontage of the gate plaza.
    { x: 128, y: 259, width: 10, height: 7, type: 'building', interactionId: 'guilrhym_oliver_manor' },
    { x: 124, y: 268, width: 10, height: 4, type: 'cobble_plaza' },
    { x: 108, y: 254, width: 34, height: 2, type: 'iron_fence_border' },
    // East frontage railings (the east tenement land sits behind, placed as props)
    { x: 176, y: 252, width: 16, height: 2, type: 'iron_fence_border' },

    // Outskirts edge - ruined buildings (no grass yards; this is a stone city)
    { x: 40, y: 264, width: 12, height: 8, type: 'clearing', fill: 'cobblestone' },
    { x: 56, y: 274, width: 10, height: 8, type: 'clearing', fill: 'cobblestone' },
    { x: 244, y: 266, width: 12, height: 8, type: 'clearing', fill: 'cobblestone' },
    { x: 258, y: 276, width: 10, height: 8, type: 'clearing', fill: 'cobblestone' },
    { x: 36, y: 250, width: 10, height: 8, type: 'clearing', fill: 'cobblestone' },
    { x: 252, y: 250, width: 10, height: 8, type: 'clearing', fill: 'cobblestone' },
    // Broken wagons on the approach
    { x: 120, y: 280, width: 6, height: 5, type: 'broken_wagon' },
    { x: 174, y: 282, width: 6, height: 5, type: 'broken_wagon' },

    // =========================================================================
    // ZONE B - MARKET / ARTISAN QUARTER (EAST, y: 180–240)
    // The east identity: trade plaza, stalls, inn, shops, and the cemetery rise.
    // Entered from the gate gap; exits north over the Toll Bridge.
    // =========================================================================

    // Market plaza (the open heart of the quarter)
    { x: 176, y: 188, width: 64, height: 44, type: 'cobble_plaza' },
    { x: 188, y: 196, width: 36, height: 12, type: 'market_stall_row' },
    { x: 188, y: 216, width: 30, height: 8, type: 'market_stall_row' },
    // Inn + church flanking the plaza
    { x: 178, y: 220, width: 12, height: 10, type: 'inn_building', interactionId: 'guilrhym_inn' },
    { x: 226, y: 184, width: 14, height: 12, type: 'church', interactionId: 'guilrhym_market_chapel' },
    // Artisan shops (east blocks)
    { x: 248, y: 190, width: 10, height: 8, type: 'building' },
    { x: 248, y: 206, width: 10, height: 8, type: 'building' },
    { x: 248, y: 222, width: 10, height: 8, type: 'building' },
    { x: 264, y: 198, width: 8, height: 8, type: 'building' },
    { x: 264, y: 214, width: 8, height: 8, type: 'building' },
    // Cemetery rise (east, elevated - see elevationZones)
    { x: 244, y: 168, width: 36, height: 18, type: 'cemetery' },
    { x: 250, y: 184, width: 22, height: 6, type: 'graveyard' },
    // West-south residential pocket - now DENSELY filled by cityBlocks() in the props
    // array (dense-by-default tenement lands + carved winding closes). The old sparse
    // building masses were removed so the fill owns this district.
    // Cross-street linking the west pocket to the market plaza (a clear lane at
    // y205; everything around it is base cobblestone, so this is just dressing)
    { x: 74, y: 204, width: 102, height: 4, type: 'clearing', fill: 'cobblestone' },

    // =========================================================================
    // THE CANAL (y: 169–175) - the single hard barrier. Water everywhere except
    // the Toll Bridge gap (x203–211). The central sluice (x146–154) is authored
    // as water (CLOSED) and carved to a bridge at runtime by Lever 2.
    // =========================================================================
    { x: 16, y: 169, width: 187, height: 7, type: 'wall', fill: 'water' }, // west + center band (incl. closed sluice)
    { x: 212, y: 169, width: 72, height: 7, type: 'wall', fill: 'water' }, // east band
    // Toll Bridge (always-open east crossing)
    { x: 203, y: 168, width: 9, height: 9, type: 'clearing', fill: 'wooden_path' },
    // Canal embankment dressing
    { x: 16, y: 176, width: 268, height: 2, type: 'clearing', fill: 'cobblestone_dark' },
    { x: 16, y: 167, width: 268, height: 2, type: 'clearing', fill: 'cobblestone_dark' },

    // =========================================================================
    // ZONE C - NORTH BANK & WEST UNDERCROFT (y: 100–168)
    // After the Toll Bridge the player lands on the north bank (east). Upper-city
    // building masses + the NORTH-BANK WALL at y150 (gap on the WEST, x16–104)
    // force the player west into the Undercroft, which climbs to The Heights.
    // The central spine is sealed by the Heights portcullis (Lever 1, y116-118).
    // =========================================================================

    // North-bank wall forcing west (WEST gap x16–104 + CENTER gap x146–154 for the
    // Lever-1 portcullis shortcut lane stay open).
    { x: 104, y: 150, width: 42, height: 5, type: 'wall', fill: 'stone' },  // x104–145
    { x: 155, y: 150, width: 129, height: 5, type: 'wall', fill: 'stone' }, // x155–283
    // UPPER-CITY (north-east of the spine) - now packed densely as tenement lands by
    // cityBlocks() in the props array (the old solid-stone warren was removed so the
    // dense-fill owns this district and it reads as buildings on the map).
    // Center spine walls (leave the x146-154 column for the portcullis route)
    { x: 116, y: 120, width: 28, height: 16, type: 'building' },
    { x: 156, y: 120, width: 2, height: 16, type: 'wall', fill: 'stone' },
    { x: 142, y: 120, width: 2, height: 16, type: 'wall', fill: 'stone' },

    // The Undercroft (WEST) - sunken cloister: dark flood-stained stone, drainage, claustral
    { x: 24, y: 116, width: 76, height: 48, type: 'clearing', fill: 'cobblestone_dark' },
    { x: 30, y: 124, width: 14, height: 12, type: 'building' },
    { x: 30, y: 144, width: 14, height: 12, type: 'building' },
    { x: 54, y: 120, width: 12, height: 10, type: 'clearing', fill: 'cobblestone' },
    { x: 76, y: 124, width: 14, height: 12, type: 'building' },
    { x: 76, y: 146, width: 14, height: 12, type: 'building' },
    { x: 48, y: 140, width: 16, height: 14, type: 'ruined_fort' },
    // Undercroft drainage channel (dressing, walkable cobblestone gaps remain)
    { x: 24, y: 158, width: 76, height: 3, type: 'clearing', fill: 'cobblestone_dark' },

    // =========================================================================
    // THE HEIGHTS (WEST-NORTH terrace, y: 95–115) - residential terrace on a
    // rise. The Heights bonfire (95,110). Path turns EAST toward the cloister.
    // =========================================================================
    { x: 64, y: 92, width: 60, height: 26, type: 'cobble_plaza' },
    { x: 70, y: 96, width: 12, height: 10, type: 'building' },
    { x: 100, y: 96, width: 12, height: 10, type: 'building' },
    { x: 84, y: 98, width: 10, height: 8, type: 'cobble_plaza' },
    { x: 28, y: 90, width: 10, height: 10, type: 'watchtower' },
    // Heights → cloister connector street (center-north)
    { x: 120, y: 96, width: 36, height: 6, type: 'clearing', fill: 'cobblestone' },
    // THE HEIGHTS RAMPART - a carved walkable deck along the north edge, raised to
    // elevation 1 (see elevationZones). The "rooftops" Oliver warns about, realised as a
    // wall-walk: a vantage + slight shortcut OVER the streets. Its south retaining cliff
    // lands at y93–95 (north of the dogleg's y96+ travel), so the critical path is unaffected.
    // East edge stops at x108 - the cloister west wall begins at x110.
    { x: 66, y: 88, width: 43, height: 5, type: 'clearing', fill: 'cobblestone' },

    // =========================================================================
    // ZONE D - RELIQUARY CLOISTER & CATHEDRAL APPROACH (center-north, y: 44–95)
    // The authored "dungeon": a colonnade funnel rising to the fog gate. No
    // flanking - building masses wall both sides; a votive-candle trail wayfinds.
    // Cathedral Steps bonfire (150,55) sits just before the fog gate (y45).
    // =========================================================================
    { x: 122, y: 46, width: 56, height: 48, type: 'clearing', fill: 'cobblestone_dark' },
    // Cloister side walls (funnel - no flanking)
    { x: 110, y: 46, width: 12, height: 50, type: 'wall', fill: 'stone' },
    { x: 178, y: 46, width: 12, height: 50, type: 'wall', fill: 'stone' },
    // Colonnade bays (building masses lining the nave approach)
    { x: 124, y: 72, width: 8, height: 8, type: 'building' },
    { x: 168, y: 72, width: 8, height: 8, type: 'building' },
    { x: 124, y: 84, width: 8, height: 8, type: 'building' },
    { x: 168, y: 84, width: 8, height: 8, type: 'building' },
    // Chapel of the Wellspring (mid-cloister landmark)
    { x: 138, y: 78, width: 24, height: 12, type: 'church', interactionId: 'guilrhym_cloister_chapel' },
    // Cathedral facade & forecourt NORTH of the fog gate (dead-ends after boss)
    { x: 120, y: 14, width: 60, height: 26, type: 'cobble_plaza' },
    { x: 132, y: 16, width: 36, height: 18, type: 'church', interactionId: 'guilrhym_cathedral' },
    { x: 96, y: 16, width: 16, height: 14, type: 'graveyard' },
    { x: 188, y: 16, width: 16, height: 14, type: 'graveyard' },
    { x: 86, y: 12, width: 10, height: 12, type: 'ruins' },
    { x: 204, y: 12, width: 10, height: 12, type: 'ruins' },
  ],
  portals: [
    // South gate → back to Whispering Woods (Hollow arena exit landing)
    { x: 150, y: 297, targetMap: 'forest', targetX: 261, targetY: 45 },
  ],
  chests: [
    // --- Zone A (3) ---
    { x: 150, y: 264, interactionId: 'guilrhym_gate_chest' },
    { x: 66, y: 249, interactionId: 'guilrhym_close_chest' }, // loot up a dead-end close in the west land
    { x: 46, y: 268, interactionId: 'guilrhym_outskirt_hidden_chest' }, // 'hidden' → richer
    { x: 132, y: 262, interactionId: 'guilrhym_servant_chest' },
    // --- Zone B Market (5) ---
    { x: 200, y: 210, interactionId: 'guilrhym_market_chest_1' },
    { x: 232, y: 222, interactionId: 'guilrhym_market_chest_2' },
    { x: 182, y: 226, interactionId: 'guilrhym_inn_chest' },
    { x: 268, y: 206, interactionId: 'guilrhym_shop_secret_chest' }, // 'secret' → richer
    { x: 256, y: 176, interactionId: 'guilrhym_cemetery_chest' },
    // --- West-south residential (3) ---
    { x: 46, y: 192, interactionId: 'guilrhym_manor_chest' },
    { x: 62, y: 214, interactionId: 'guilrhym_residential_hidden_chest' }, // 'hidden'
    { x: 100, y: 204, interactionId: 'guilrhym_courtyard_chest' },
    // --- Undercroft (3) ---
    { x: 36, y: 130, interactionId: 'guilrhym_undercroft_chest' },
    { x: 52, y: 146, interactionId: 'guilrhym_undercroft_ancient_chest' }, // 'ancient' → 100g, behind ruined fort
    { x: 82, y: 152, interactionId: 'guilrhym_drain_chest' },
    // --- The Heights (3) ---
    { x: 72, y: 100, interactionId: 'guilrhym_heights_chest' },
    { x: 104, y: 90, interactionId: 'guilrhym_rooftop_chest' }, // now actually on the Heights rampart
    { x: 30, y: 94, interactionId: 'guilrhym_terrace_hidden_chest' }, // 'hidden'
    // --- Reliquary Cloister (4) ---
    { x: 219, y: 129, interactionId: 'guilrhym_warren_chest' }, // upper-city warren courtyard nook
    { x: 130, y: 88, interactionId: 'guilrhym_cloister_chest' },
    { x: 150, y: 50, interactionId: 'guilrhym_reliquary_ancient_chest' }, // bait-and-switch deep ornate chest
    { x: 138, y: 20, interactionId: 'guilrhym_cathedral_chest' },
    { x: 168, y: 22, interactionId: 'guilrhym_steps_chest' },
  ],
  interactables: [
    // --- Bonfires (4) - match bonfires.ts exactly ---
    { x: 150, y: 272, type: 'bonfire', walkable: false, interactionId: 'bonfire_guilrhym_gate' },
    { x: 200, y: 198, type: 'bonfire', walkable: false, interactionId: 'bonfire_guilrhym_market' },
    { x: 95, y: 110, type: 'bonfire', walkable: false, interactionId: 'bonfire_guilrhym_heights' },
    { x: 150, y: 55, type: 'bonfire', walkable: false, interactionId: 'bonfire_guilrhym_cathedral' },

    // --- Wells (3) - keep interactionIds (heal interactions) ---
    { x: 146, y: 268, type: 'well', walkable: false, interactionId: 'guilrhym_fountain' },
    { x: 198, y: 206, type: 'well', walkable: false, interactionId: 'guilrhym_market_well' },
    { x: 150, y: 62, type: 'well', walkable: false, interactionId: 'guilrhym_cathedral_well' },

    // --- Shortcut levers (2) - runtime opens the matching center gate ---
    // Lever 1: pulled at the top of the Heights detour, opens the center portcullis below.
    { x: 140, y: 112, type: 'shortcut_lever', walkable: false, interactionId: 'guilrhym_shortcut_lever_1' },
    // Lever 2: pulled on the north canal bank, opens the central canal sluice below.
    { x: 138, y: 162, type: 'shortcut_lever', walkable: false, interactionId: 'guilrhym_shortcut_lever_2' },

    // --- Narrative signs (13) - keep interactionIds (dialogues.ts) ---
    { x: 150, y: 290, type: 'sign', walkable: false, interactionId: 'guilrhym_gate_sign' },
    { x: 158, y: 270, type: 'sign', walkable: false, interactionId: 'guilrhym_notice_board' },
    { x: 186, y: 212, type: 'sign', walkable: false, interactionId: 'guilrhym_hunter_trace' },
    { x: 246, y: 182, type: 'sign', walkable: false, interactionId: 'guilrhym_cemetery_marker' },
    { x: 62, y: 200, type: 'sign', walkable: false, interactionId: 'guilrhym_residential_notice' },
    { x: 134, y: 158, type: 'sign', walkable: false, interactionId: 'guilrhym_fallen_guard' },
    { x: 150, y: 90, type: 'sign', walkable: false, interactionId: 'guilrhym_church_altar' },
    { x: 206, y: 216, type: 'sign', walkable: false, interactionId: 'guilrhym_market_ledger' },
    { x: 184, y: 226, type: 'sign', walkable: false, interactionId: 'guilrhym_inn_notice' },
    { x: 84, y: 90, type: 'sign', walkable: false, interactionId: 'guilrhym_rooftop_journal' }, // on the rampart deck
    { x: 70, y: 138, type: 'sign', walkable: false, interactionId: 'guilrhym_guard_orders' },
    { x: 150, y: 48, type: 'sign', walkable: false, interactionId: 'guilrhym_cathedral_inscription' },
    { x: 156, y: 47, type: 'sign', walkable: false, interactionId: 'guilrhym_reaver_plaque' },
    // Notice beside the sealed west gate (foreshadows the West Quarter as a later zone)
    { x: 128, y: 273, type: 'sign', walkable: false, interactionId: 'guilrhym_west_seal' },

    // --- Campfire remains (atmosphere) ---
    { x: 60, y: 256, type: 'campfire_remains', walkable: false },
    { x: 248, y: 244, type: 'campfire_remains', walkable: false },
    { x: 70, y: 132, type: 'campfire_remains', walkable: false },

    // --- Moonblooms (4) - merchant quest ---
    { x: 118, y: 270, type: 'moonbloom', walkable: true, interactionId: 'moonbloom_pickup' },
    { x: 234, y: 210, type: 'moonbloom', walkable: true, interactionId: 'moonbloom_pickup' },
    { x: 40, y: 150, type: 'moonbloom', walkable: true, interactionId: 'moonbloom_pickup' },
    { x: 132, y: 64, type: 'moonbloom', walkable: true, interactionId: 'moonbloom_pickup' },

    // --- Tempest grass (8) ---
    { x: 44, y: 272, type: 'tempest_grass', walkable: true, interactionId: 'tempest_grass_pickup' },
    { x: 256, y: 270, type: 'tempest_grass', walkable: true, interactionId: 'tempest_grass_pickup' },
    { x: 210, y: 224, type: 'tempest_grass', walkable: true, interactionId: 'tempest_grass_pickup' },
    { x: 88, y: 200, type: 'tempest_grass', walkable: true, interactionId: 'tempest_grass_pickup' },
    { x: 34, y: 160, type: 'tempest_grass', walkable: true, interactionId: 'tempest_grass_pickup' },
    { x: 110, y: 100, type: 'tempest_grass', walkable: true, interactionId: 'tempest_grass_pickup' },
    { x: 168, y: 90, type: 'tempest_grass', walkable: true, interactionId: 'tempest_grass_pickup' },
    { x: 144, y: 60, type: 'tempest_grass', walkable: true, interactionId: 'tempest_grass_pickup' },
  ],
  elevationZones: [
    // Cemetery rise (east market quarter) - OFF the critical path (optional loot).
    { x: 244, y: 166, width: 38, height: 22, elevation: 1 },
    // Heights watchtower - OFF the critical path (optional vantage/loot).
    { x: 26, y: 88, width: 14, height: 14, elevation: 1 },
    // Heights rampart - the north-edge wall-walk (vantage + shortcut). Only the north
    // strip (y88–92) rises; the dogleg's plaza travel (y96+) stays at elevation 0, so the
    // auto retaining cliff at y93–95 walls the rampart WITHOUT cutting the critical path.
    { x: 66, y: 88, width: 43, height: 5, elevation: 1 },
  ],
  stairways: [
    // Onto the cemetery rise (from the market plaza side)
    { x: 248, y: 186, width: 4, height: 3, elevation: 1 },
    // Watchtower
    { x: 30, y: 100, width: 3, height: 3, elevation: 1 },
    // Heights rampart - climb up (west) and descend (east) into the plaza; both landings
    // fall in open plaza gaps (clear of the x70-81 / x100-111 buildings).
    { x: 66, y: 92, width: 3, height: 5, elevation: 1 },
    { x: 96, y: 92, width: 3, height: 5, elevation: 1 },
  ],
  enemyZones: [
    // --- Zone A Outskirts (light) ---
    { x: 40, y: 256, width: 40, height: 26, enemyType: 'slime', count: 3 },
    { x: 200, y: 256, width: 50, height: 26, enemyType: 'slime', count: 3 },
    { x: 96, y: 268, width: 70, height: 16, enemyType: 'skeleton', count: 4 },

    // --- Zone B Market (medium → heavy) ---
    { x: 176, y: 188, width: 64, height: 44, enemyType: 'shadow', count: 6 },
    { x: 244, y: 188, width: 30, height: 40, enemyType: 'skeleton', count: 4 },
    { x: 244, y: 166, width: 36, height: 20, enemyType: 'skeleton_captain', count: 2 }, // cemetery rise elite
    { x: 40, y: 184, width: 70, height: 54, enemyType: 'skeleton', count: 5 },
    { x: 60, y: 200, width: 50, height: 30, enemyType: 'shadow_lurker', count: 3 },

    // --- Zone C North bank + Undercroft (heavy) ---
    { x: 110, y: 152, width: 160, height: 14, enemyType: 'shadow', count: 5 }, // north bank patrol
    { x: 160, y: 96, width: 110, height: 40, enemyType: 'skeleton_captain', count: 3 }, // upper-city blocks
    { x: 200, y: 96, width: 70, height: 40, enemyType: 'armored_wolf', count: 3 },
    { x: 24, y: 116, width: 76, height: 48, enemyType: 'shadow_lurker', count: 5 }, // undercroft
    { x: 44, y: 138, width: 24, height: 20, enemyType: 'stone_sentinel', count: 1 }, // telegraphed elite (guards ancient chest)

    // --- The Heights (heavy) ---
    { x: 64, y: 90, width: 62, height: 28, enemyType: 'shadow_lurker', count: 4 },
    { x: 64, y: 90, width: 62, height: 28, enemyType: 'skeleton_captain', count: 2 },
    // Rampart snipers - the "rooftops are watched" beat Oliver warns about.
    { x: 70, y: 88, width: 38, height: 4, enemyType: 'shadow_lurker', count: 2 },

    // --- Zone D Reliquary Cloister (boss approach - staged ramp toward fog gate) ---
    { x: 122, y: 84, width: 56, height: 10, enemyType: 'shadow', count: 4 },
    { x: 122, y: 70, width: 56, height: 12, enemyType: 'shadow_lurker', count: 4 },
    { x: 122, y: 56, width: 56, height: 12, enemyType: 'skeleton_captain', count: 2 },
    { x: 130, y: 60, width: 40, height: 10, enemyType: 'golem', count: 1 }, // cloister guardian
    { x: 122, y: 46, width: 56, height: 10, enemyType: 'shadow', count: 3 }, // final press before the gate
  ],
  props: [
    // ===== ASSET TEST (temporary) - tenement "lands": short groups (spacing 6, butted
    // at party walls) separated by narrow 2-tile CLOSES (anchors 9 apart) - the Edinburgh
    // Old Town pattern of connected blocks broken by frequent wynds/closes.
    { x: 34, y: 254, type: 'tenement_facade', walkable: false },
    { x: 40, y: 254, type: 'tenement_facade', walkable: false },
    { x: 46, y: 254, type: 'tenement_facade', walkable: false },
    // close
    { x: 55, y: 254, type: 'tenement_facade', walkable: false },
    { x: 61, y: 254, type: 'tenement_facade', walkable: false },
    // close
    { x: 70, y: 254, type: 'tenement_facade', walkable: false },
    { x: 76, y: 254, type: 'tenement_facade', walkable: false },
    { x: 82, y: 254, type: 'tenement_facade', walkable: false },
    // close
    { x: 91, y: 254, type: 'tenement_facade', walkable: false },
    { x: 97, y: 254, type: 'tenement_facade', walkable: false },
    // ===== LANDMARK - the Tolbooth clocktower (civic spire, POI in MapMarkers) =====
    { x: 118, y: 250, type: 'clocktower', walkable: false },
    // ===== STREET LIFE - abandoned in the fled city (carriages, a coach, signage) =====
    { x: 140, y: 282, type: 'stagecoach', walkable: false },   // overturned coach at the gate
    { x: 158, y: 270, type: 'street_sign', walkable: false },  // gate plaza fingerpost
    { x: 66, y: 206, type: 'street_sign', walkable: false },   // west high-street nameplate
    { x: 152, y: 277, type: 'baby_carriage', walkable: false },// pram abandoned at the gate
    { x: 90, y: 213, type: 'baby_carriage', walkable: false }, // pram in the west pocket
    // ===== EAST frontage of the gate plaza - two tenement groups split by a close,
    // set WEST of the inner-wall gap (x200-228) so the dogleg-east route stays open.
    { x: 172, y: 254, type: 'tenement_facade', walkable: false },
    { x: 178, y: 254, type: 'tenement_facade', walkable: false },
    // close (leads north onto the wall-side street toward the east gap)
    { x: 190, y: 254, type: 'tenement_facade', walkable: false },
    { x: 196, y: 254, type: 'tenement_facade', walkable: false },

    // =========================================================================
    // ENVIRONMENTAL STORYTELLING GRADIENT - bloodstains → bones → ash rising
    // toward the cathedral, plus the votive-candle wayfinding trail.
    // =========================================================================

    // --- Gate Plaza (Oliver's last stand - battle debris) ---
    { x: 138, y: 268, type: 'street_lamp', walkable: false },
    { x: 162, y: 268, type: 'street_lamp', walkable: false },
    { x: 140, y: 278, type: 'street_lamp', walkable: false },
    { x: 160, y: 278, type: 'street_lamp', walkable: false },
    { x: 148, y: 280, type: 'hanging_sign', walkable: false },
    { x: 136, y: 266, type: 'bench', walkable: false },
    { x: 164, y: 266, type: 'bench', walkable: false },
    { x: 134, y: 264, type: 'barrel_stack', walkable: false },
    { x: 166, y: 264, type: 'crate_stack', walkable: false },
    { x: 144, y: 270, type: 'bloodstain', walkable: true },
    { x: 154, y: 270, type: 'bloodstain', walkable: true },
    { x: 150, y: 274, type: 'bones', walkable: true },
    { x: 142, y: 282, type: 'rubble', walkable: false },
    { x: 158, y: 282, type: 'rubble', walkable: false },
    { x: 130, y: 288, type: 'statue', walkable: false },
    { x: 170, y: 288, type: 'statue', walkable: false },

    // --- Market quarter (commerce gone to ruin) ---
    { x: 182, y: 192, type: 'street_lamp', walkable: false },
    { x: 232, y: 192, type: 'street_lamp', walkable: false },
    { x: 182, y: 228, type: 'street_lamp', walkable: false },
    { x: 232, y: 228, type: 'street_lamp', walkable: false },
    { x: 196, y: 200, type: 'awning', walkable: false },
    { x: 212, y: 200, type: 'awning', walkable: false },
    { x: 204, y: 214, type: 'fountain', walkable: false },
    { x: 190, y: 222, type: 'barrel', walkable: false },
    { x: 220, y: 222, type: 'crate', walkable: false },
    { x: 208, y: 208, type: 'bloodstain', walkable: true },
    { x: 226, y: 218, type: 'bones', walkable: true },
    { x: 188, y: 230, type: 'bones_pile', walkable: true },
    { x: 250, y: 176, type: 'tombstone', walkable: false },
    { x: 258, y: 180, type: 'tombstone', walkable: false },
    { x: 264, y: 174, type: 'tombstone', walkable: false },

    // --- North bank / Undercroft (corruption deepening - bones + rubble) ---
    { x: 140, y: 158, type: 'wall_torch', walkable: false },
    { x: 130, y: 158, type: 'bloodstain', walkable: true },
    { x: 60, y: 128, type: 'rubble', walkable: false },
    { x: 84, y: 150, type: 'rubble', walkable: false },
    { x: 40, y: 134, type: 'bones', walkable: true },
    { x: 56, y: 150, type: 'bones_pile', walkable: true },
    { x: 70, y: 134, type: 'sewer_grate', walkable: true },
    { x: 90, y: 158, type: 'sewer_grate', walkable: true },
    { x: 48, y: 144, type: 'bones', walkable: true },

    // --- The Heights (survivors' last refuge) ---
    { x: 70, y: 94, type: 'wall_torch', walkable: false },
    { x: 114, y: 94, type: 'wall_torch', walkable: false },
    { x: 86, y: 100, type: 'barrel_stack', walkable: false },
    { x: 96, y: 108, type: 'bloodstain', walkable: true },
    { x: 78, y: 106, type: 'bones', walkable: true },

    // --- Reliquary Cloister (ASH + votive-candle wayfinding trail to the gate) ---
    // Candle trail - guides the player north up the nave toward the fog gate.
    { x: 150, y: 88, type: 'ritual_candle', walkable: true },
    { x: 150, y: 80, type: 'ritual_candle', walkable: true },
    { x: 150, y: 72, type: 'ritual_candle', walkable: true },
    { x: 150, y: 64, type: 'ritual_candle', walkable: true },
    { x: 150, y: 58, type: 'ritual_candle', walkable: true },
    { x: 144, y: 84, type: 'pillar', walkable: false },
    { x: 156, y: 84, type: 'pillar', walkable: false },
    { x: 144, y: 68, type: 'pillar', walkable: false },
    { x: 156, y: 68, type: 'pillar', walkable: false },
    { x: 134, y: 76, type: 'bones_pile', walkable: true },
    { x: 166, y: 76, type: 'bones_pile', walkable: true },
    { x: 140, y: 60, type: 'bloodstain', walkable: true },
    { x: 160, y: 60, type: 'bloodstain', walkable: true },
    { x: 138, y: 52, type: 'rubble', walkable: false },
    { x: 162, y: 52, type: 'rubble', walkable: false },
    // Cathedral forecourt (peak corruption - ash, fallen grandeur)
    { x: 128, y: 36, type: 'statue', walkable: false },
    { x: 172, y: 36, type: 'statue', walkable: false },
    { x: 130, y: 30, type: 'wall_torch', walkable: false },
    { x: 170, y: 30, type: 'wall_torch', walkable: false },
    { x: 150, y: 38, type: 'bones_pile', walkable: true },
    { x: 144, y: 32, type: 'bloodstain', walkable: true },
    { x: 156, y: 32, type: 'bloodstain', walkable: true },

    // =========================================================================
    // BURNING BARRICADES - the population's last defence. Piled carts/crates set
    // alight across SECONDARY streets to wall off side-routes (reinforcing the
    // dogleg) and to tell the story of a city that tried to hold the dead back.
    // Each cluster is a short side-by-side run so it spans the 3-wide street.
    // Placed on roads/plazas the dense-fill keeps clear, so they read cleanly.
    // =========================================================================
    // Gate plaza - barricades sealing the west & east residential streets (steer to centre/dogleg)
    { x: 57, y: 250, type: 'burning_barricade', walkable: false },
    { x: 58, y: 250, type: 'burning_barricade', walkable: false },
    { x: 59, y: 250, type: 'burning_barricade', walkable: false },
    { x: 241, y: 250, type: 'burning_barricade', walkable: false },
    { x: 242, y: 250, type: 'burning_barricade', walkable: false },
    { x: 243, y: 250, type: 'burning_barricade', walkable: false },
    // North bank - wall off the eastward lane so the player is steered WEST into the Undercroft
    { x: 244, y: 160, type: 'burning_barricade', walkable: false },
    { x: 245, y: 160, type: 'burning_barricade', walkable: false },
    { x: 246, y: 160, type: 'burning_barricade', walkable: false },
    // Market square - an overturned, burning stall barricade (last stand among the commerce)
    { x: 220, y: 210, type: 'burning_barricade', walkable: false },
    { x: 221, y: 210, type: 'burning_barricade', walkable: false },
    { x: 222, y: 210, type: 'burning_barricade', walkable: false },
    // Reliquary cloister approach - a final desperate barricade flanking the nave mouth
    // (centre x144–156 left open for the candle-trail critical path).
    { x: 132, y: 94, type: 'burning_barricade', walkable: false },
    { x: 136, y: 94, type: 'burning_barricade', walkable: false },
    { x: 164, y: 94, type: 'burning_barricade', walkable: false },
    { x: 168, y: 94, type: 'burning_barricade', walkable: false },

    // =========================================================================
    // VICTORIAN LANDMARKS - dispersed civic monuments so districts read as a city
    // with character, not a grid of houses. The Tolbooth clocktower (above) anchors
    // the gate; these memorial columns + memorial statues punctuate the other quarters.
    // =========================================================================
    { x: 236, y: 200, type: 'memorial_column', walkable: false }, // market quarter monument
    { x: 120, y: 160, type: 'memorial_column', walkable: false }, // riverside (north bank) monument
    { x: 84, y: 100, type: 'memorial_column', walkable: false },  // the Heights - survivors' rallying monument
    { x: 128, y: 90, type: 'statue', walkable: false },           // cloister flank memorial (west)
    { x: 170, y: 90, type: 'statue', walkable: false },           // cloister flank memorial (east)

    // =========================================================================
    // DENSE-BY-DEFAULT FILL - pack districts with tenement lands and carve a
    // winding street/close network (the forest's "fill + carve", Yharnam-tight).
    // =========================================================================
    // West-south residential pocket (x24-138, y184-238). E-W streets at the cross
    // lanes; closes offset per row so N-S travel must jog. POIs kept clear.
    ...(() => {
      // STREETS/CORRIDORS kept open (the dogleg + civic nodes + canal); buildings stay out.
      const S = [
        { x0: 142, y0: 8, x1: 157, y1: 293 },   // central spine road (+ lever gates)
        { x0: 128, y0: 254, x1: 174, y1: 293 },  // gate plaza
        { x0: 194, y0: 228, x1: 232, y1: 252 },  // east dogleg gap
        { x0: 174, y0: 184, x1: 244, y1: 236 },  // market square node
        { x0: 198, y0: 156, x1: 214, y1: 204 },  // toll bridge approach
        { x0: 16, y0: 148, x1: 284, y1: 168 },   // north bank lane
        { x0: 16, y0: 169, x1: 284, y1: 176 },   // canal channel
        { x0: 22, y0: 112, x1: 102, y1: 166 },   // undercroft
        { x0: 60, y0: 86, x1: 128, y1: 120 },    // the Heights
        { x0: 116, y0: 92, x1: 158, y1: 104 },   // Heights → cloister connector
        { x0: 118, y0: 44, x1: 180, y1: 98 },    // Reliquary cloister
        { x0: 106, y0: 8, x1: 194, y1: 44 },     // cathedral forecourt
        { x0: 108, y0: 248, x1: 138, y1: 274 },  // Oliver's manor + the Tolbooth
      ];
      // Block grammar: solid 28-wide terrace blocks, 16 deep, split by 3-tile streets
      // and 2-tile alleys/wynds - continuous terraces with real alleys between blocks.
      const o = { blockW: 28, blockH: 16, streetW: 3, alleyW: 2, rowStep: 7, baySpacing: 6, streetHalfWidth: 2 };
      const chests = [
        { x0: 46, y0: 192, x1: 46, y1: 192 }, { x0: 62, y0: 214, x1: 62, y1: 214 },
        { x0: 100, y0: 204, x1: 100, y1: 204 }, { x0: 62, y0: 200, x1: 62, y1: 200 },
        { x0: 88, y0: 200, x1: 88, y1: 200 },
      ];
      // District = a FREQUENCY mix of forms (colours jumble per-building via the kit palette).
      // ESTATE = wealthy west: townhouses + the occasional grand manor. SLUM now reads
      // abandoned: frequent boarded-up frontages among the tenements.
      const ESTATE = ['townhouse_facade', 'townhouse_facade', 'manor_facade', 'tenement_facade'] as const;
      const RES = ['townhouse_facade', 'townhouse_facade', 'townhouse_facade', 'tenement_facade'] as const;
      const IND = ['warehouse_facade', 'warehouse_facade', 'warehouse_facade', 'tenement_facade'] as const;
      const COMMON = ['tenement_facade', 'tenement_facade', 'tenement_facade', 'townhouse_facade'] as const;
      const SLUM = ['tenement_facade', 'tenement_facade', 'boarded_facade', 'boarded_facade', 'warehouse_facade'] as const;
      const m = (a: readonly string[]) => [...a] as import('@/lib/game/World').TileType[];
      // Buildings must never land on the GUILRHYM_ROADS grid - fold ROAD_RECTS into every
      // district's keepClear so the street network reads as actual streets BETWEEN blocks
      // (not facades stamped across a road). This is the source of "roads through houses".
      const KC = [...S, ...ROAD_RECTS];
      // Fences want to SIT on road frontages, so their keepClear is only the dogleg + loot
      // (not the road grid) - that punches gate-openings where the path/chests cross.
      const fenceKC = [...S, ...chests];
      const fo = { gateEvery: 11, gateWidth: 2, keepClear: fenceKC };
      return [
        // WEST RESIDENTIAL - wealthy estates: townhouses + occasional manors
        ...cityBlocks({ ...o, seed: 101, types: m(ESTATE), x0: 26, y0: 186, x1: 136, y1: 236, streetRows: [205, 223], keepClear: [...KC, ...chests] }),
        // EAST DOCKS - mostly warehouses, tighter denser blocks
        ...cityBlocks({ ...o, seed: 202, blockW: 34, blockH: 20, streetW: 2, alleyW: 2, types: m(IND), x0: 246, y0: 184, x1: 282, y1: 238, streetRows: [205], keepClear: KC }),
        // UPPER CITY (the Heights) - residential mix
        ...cityBlocks({ ...o, seed: 303, types: m(RES), x0: 16, y0: 92, x1: 56, y1: 146, streetRows: [112, 130], keepClear: KC }),
        ...cityBlocks({ ...o, seed: 313, types: m(RES), x0: 104, y0: 122, x1: 140, y1: 146, streetRows: [], keepClear: KC }),
        // UPPER-EAST INDUSTRIAL - warehouses (the old warren region)
        ...cityBlocks({ ...o, seed: 404, blockW: 34, blockH: 20, streetW: 2, alleyW: 2, types: m(IND), x0: 158, y0: 96, x1: 282, y1: 146, streetRows: [112, 130], keepClear: KC }),
        // CATHEDRAL APPROACH flanks - tight slum wynds
        ...cityBlocks({ ...o, seed: 505, blockW: 22, alleyW: 2, courtChance: 0.16, types: m(SLUM), x0: 16, y0: 48, x1: 104, y1: 92, streetRows: [70], keepClear: KC }),
        ...cityBlocks({ ...o, seed: 515, blockW: 22, alleyW: 2, courtChance: 0.16, types: m(SLUM), x0: 192, y0: 48, x1: 282, y1: 92, streetRows: [70], keepClear: KC }),
        // GATE OUTSKIRTS flanks - common mix
        ...cityBlocks({ ...o, seed: 606, types: m(COMMON), x0: 16, y0: 248, x1: 126, y1: 290, streetRows: [268], keepClear: KC }),
        ...cityBlocks({ ...o, seed: 616, types: m(COMMON), x0: 178, y0: 248, x1: 282, y1: 290, streetRows: [268], keepClear: KC }),

        // ── COMPOUND FENCING (district-specific) ───────────────────────────────
        // A fence perimeter around each housing compound, with periodic gates, in each
        // district's OWN material: dressed stone walls round the west estates, iron
        // post-and-chain along the docks/industrial quays, rough timber palisades in the
        // slum wynds, civic iron round the gate outskirts. The road network stays the
        // controlled way through (gate routes off by closing a gate); the dogleg + loot
        // (S + chests) punch openings so the critical path is never sealed.
        ...cityFences({ ...fo, seed: 1101, fenceType: 'stone_low_wall', x0: 26, y0: 186, x1: 136, y1: 236 }),  // west estates
        ...cityFences({ ...fo, seed: 1202, fenceType: 'chain_fence', x0: 246, y0: 184, x1: 282, y1: 238 }),    // east docks
        ...cityFences({ ...fo, seed: 1303, fenceType: 'stone_low_wall', x0: 16, y0: 92, x1: 56, y1: 146 }),    // upper city / Heights
        ...cityFences({ ...fo, seed: 1313, fenceType: 'stone_low_wall', x0: 104, y0: 122, x1: 140, y1: 146 }), // upper-city pocket
        ...cityFences({ ...fo, seed: 1404, fenceType: 'chain_fence', x0: 158, y0: 96, x1: 282, y1: 146 }),     // upper-east industrial
        ...cityFences({ ...fo, seed: 1505, fenceType: 'timber_palisade', x0: 16, y0: 48, x1: 104, y1: 92 }),   // cathedral approach (west slum)
        ...cityFences({ ...fo, seed: 1515, fenceType: 'timber_palisade', x0: 192, y0: 48, x1: 282, y1: 92 }),  // cathedral approach (east slum)
        ...cityFences({ ...fo, seed: 1606, x0: 16, y0: 248, x1: 126, y1: 290 }),  // gate outskirts (west) - civic iron
        // gate outskirts (east) - civic iron; west edge OPENED from tile y259-275 (world y109-125)
        // where the boundary was relocated west to x169.
        ...cityFences({ ...fo, seed: 1616, x0: 178, y0: 248, x1: 282, y1: 290, keepClear: [...fenceKC, { x0: 178, y0: 261, x1: 178, y1: 273 }] }),
      ];
    })(),

    // ── HARD STREET BLOCKERS ──────────────────────────────────────────────────
    // Chunky impassable masses - the city's answer to Whispering Woods' hills/water.
    // Collapsed masonry (3-wide footprint) chokes off-dogleg side streets so the open
    // route reads as THE way and the alleys behind them feel like earned detours.
    // Caved-in buildings add the same hard-mass language as district scenery.
    // All sit OFF the dogleg corridors (S); the reachability probe confirms the path holds.
    // Placed LAST so they win over the dense fill on their tiles.
    { x: 44, y: 232, type: 'collapsed_masonry', walkable: false },  // west estates side street
    { x: 96, y: 214, type: 'collapsed_masonry', walkable: false },  // west pocket cross-lane
    { x: 262, y: 224, type: 'collapsed_masonry', walkable: false }, // east docks lane
    { x: 40, y: 100, type: 'collapsed_masonry', walkable: false },  // upper-city west
    { x: 250, y: 132, type: 'collapsed_masonry', walkable: false }, // upper-east industrial
    { x: 44, y: 72, type: 'collapsed_masonry', walkable: false },   // cathedral approach (west slum)
    { x: 236, y: 72, type: 'collapsed_masonry', walkable: false },  // cathedral approach (east slum)
    { x: 250, y: 200, type: 'collapsed_masonry', walkable: false }, // east docks lower
    // Caved-in buildings (atmosphere + soft blocks)
    { x: 70, y: 196, type: 'destroyed_house', walkable: false },         // collapsed manor (estates)
    { x: 256, y: 210, type: 'destroyed_house_rubble', walkable: false }, // collapsed warehouse (docks)
    { x: 224, y: 116, type: 'destroyed_house', walkable: false },        // upper-east ruin
    { x: 50, y: 64, type: 'destroyed_house_rubble', walkable: false },   // slum ruin (cathedral west)
    { x: 232, y: 64, type: 'destroyed_house', walkable: false },         // slum ruin (cathedral east)

    // ── LEADING LIGHTS ────────────────────────────────────────────────────────
    // The city can't show a distant spire (top-down ortho), so it DRAWS the player
    // with light. Lit lamps/torches form a breadcrumb down the dogleg and beacon the
    // decision points (the wall gap, the bridge, the gaps). The alleys are left dark -
    // so the lit route reads as THE way and the dark detours feel optional / earned.
    // Lamps sit at corridor EDGES so they never block the through-line.

    // 1) Gate spine → the forced EAST turn at the inner wall
    { x: 144, y: 258, type: 'street_lamp', walkable: false },
    { x: 156, y: 258, type: 'street_lamp', walkable: false },
    { x: 144, y: 250, type: 'street_lamp', walkable: false },
    { x: 156, y: 250, type: 'street_lamp', walkable: false },
    // wall-front lead east toward the gap (x200–228)
    { x: 170, y: 249, type: 'street_lamp', walkable: false },
    { x: 182, y: 249, type: 'street_lamp', walkable: false },
    { x: 194, y: 249, type: 'street_lamp', walkable: false },
    // gap beacon - torches on the flanking gatehouses
    { x: 199, y: 243, type: 'wall_torch', walkable: false },
    { x: 227, y: 243, type: 'wall_torch', walkable: false },
    { x: 214, y: 236, type: 'street_lamp', walkable: false }, // through the gap into the market

    // 2) Market → the Toll Bridge (the only canal crossing)
    { x: 206, y: 186, type: 'street_lamp', walkable: false },
    { x: 202, y: 177, type: 'street_lamp', walkable: false }, // bridge mouth (south)
    { x: 212, y: 177, type: 'street_lamp', walkable: false },
    { x: 202, y: 167, type: 'wall_torch', walkable: false },  // bridge beacon (north bank)
    { x: 212, y: 167, type: 'wall_torch', walkable: false },

    // 3) North bank - lead WEST along the canal side toward the Undercroft gap
    { x: 190, y: 164, type: 'street_lamp', walkable: false },
    { x: 170, y: 164, type: 'street_lamp', walkable: false },
    { x: 150, y: 164, type: 'street_lamp', walkable: false },
    { x: 130, y: 164, type: 'street_lamp', walkable: false },
    { x: 110, y: 164, type: 'street_lamp', walkable: false },

    // 4) Undercroft → climb to the Heights bonfire (the dark stretch gets just a thread)
    { x: 88, y: 150, type: 'street_lamp', walkable: false },
    { x: 88, y: 138, type: 'street_lamp', walkable: false },
    { x: 90, y: 122, type: 'street_lamp', walkable: false },
    { x: 90, y: 114, type: 'street_lamp', walkable: false },

    // 5) Heights → cloister connector (hands off to the existing candle trail north)
    { x: 124, y: 98, type: 'street_lamp', walkable: false },
    { x: 138, y: 98, type: 'street_lamp', walkable: false },
    { x: 152, y: 98, type: 'street_lamp', walkable: false },
    // Heights rampart - lit braziers mark the vantage (and read as a beacon from below)
    { x: 74, y: 89, type: 'wall_torch', walkable: false },
    { x: 102, y: 89, type: 'wall_torch', walkable: false },

    // ── GATE-PLAZA FENCE EXTENSION (authored request) ─────────────────────────
    // Extend the east-outskirts iron fence: its bottom edge runs WEST along tile y290
    // (world y140) to tile x169 (world x19), then turns and runs NORTH up to tile y259
    // (world y109). Pushes the east compound's south-west corner out across the plaza edge.
    ...(() => {
      const f: { x: number; y: number; type: 'iron_fence'; walkable: false }[] = [];
      for (let x = 169; x <= 177; x++) f.push({ x, y: 290, type: 'iron_fence', walkable: false }); // west along y290 to x169
      for (let y = 259; y <= 289; y++) {
        if (y >= 270 && y <= 272) continue; // plain gap (no fence) at world y120-122 - bare ground
        f.push({ x: 169, y, type: 'iron_fence', walkable: false });
      }
      return f;
    })(),
    // Override the lone gate sprite the west-frontage iron_fence_border stamps at its
    // centre - make it plain fence so no gate textures remain on the map's railings.
    { x: 125, y: 255, type: 'iron_fence', walkable: false },
    // Solid west gate-plaza boundary fence (authored request): tile x126, y257-290
    // (world x-24, y107-140) - continuous, NO breaks. A 2-tile section is a SEALED iron
    // gate (still unwalkable) - the foreshadowed seam to the future West Quarter zone.
    ...(() => {
      const f: { x: number; y: number; type: 'iron_fence' | 'door_iron'; walkable: false }[] = [];
      for (let y = 257; y <= 290; y++) {
        const sealedGate = y >= 272 && y <= 273; // locked western seam (opens later)
        f.push({ x: 126, y, type: sealedGate ? 'door_iron' : 'iron_fence', walkable: false });
      }
      return f;
    })(),
    // Extend the west-frontage railing east to tile x169 (world x19) along its two rows
    // y254-255 (world y104-105). Authored request.
    ...(() => {
      const f: { x: number; y: number; type: 'iron_fence'; walkable: false }[] = [];
      for (let x = 142; x <= 169; x++) { f.push({ x, y: 254, type: 'iron_fence', walkable: false }); f.push({ x, y: 255, type: 'iron_fence', walkable: false }); }
      return f;
    })(),
  ],
};
