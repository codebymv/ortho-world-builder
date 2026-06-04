import type { MapDefinition } from '@/data/mapGenerator';

// =============================================================================
// GUILRHYM — 300x300 ruined Victorian city (the act-two level after the Hollow).
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
// STREET GAPS between them — not by carving streets out of solid blocks.
//
// FIXED ANCHORS (kept in lockstep with external files — do not move casually):
//   spawn (150,286); Oliver manor near tile (135,268) ↔ RuntimeConfig oliver;
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
    // PERIMETER — seal the map edges (cliffs + curtain wall). South portal gap
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
    // DISTRICT FLOORS — the city is CONCRETE. Ground stays grey stone everywhere;
    // identity comes from GEOMETRY (blocks, alleys, verticality), not ground colour.
    // Only two intentional stone accents + the wet canal banks are retinted here.
    // Placed EARLY so later walls/buildings overwrite them.
    // =========================================================================
    // Grand pale civic stone — cathedral forecourt + Reliquary Cloister (north landmark)
    { x: 100, y: 10, width: 100, height: 34, type: 'clearing', fill: 'cobble_grand' },
    { x: 108, y: 44, width: 84, height: 52, type: 'clearing', fill: 'cobble_grand' },
    // Ash-corruption creeping out from the cathedral steps (gradient, dark stone)
    { x: 120, y: 44, width: 60, height: 14, type: 'clearing', fill: 'ashen_cobble' },
    // Canal banks — flood-damaged wet stone (water overwrites the channel later)
    { x: 16, y: 166, width: 268, height: 3, type: 'clearing', fill: 'waterlogged_cobble' },
    { x: 16, y: 176, width: 268, height: 3, type: 'clearing', fill: 'waterlogged_cobble' },

    // =========================================================================
    // ZONE A — OUTSKIRTS & GATE PLAZA (y: 242–293)
    // Open entry plaza; Oliver slumped by his west estate. The INNER CITY WALL
    // at y242 blocks the way north EXCEPT the east gap (x200–228), forcing the
    // player east into the market.
    // =========================================================================

    // Inner city wall — forces the dogleg east. Gap at x200–228.
    { x: 16, y: 242, width: 184, height: 5, type: 'wall', fill: 'stone' },
    { x: 228, y: 242, width: 56, height: 5, type: 'wall', fill: 'stone' },
    // Gatehouses flanking the east opening
    { x: 196, y: 240, width: 6, height: 8, type: 'building' },
    { x: 228, y: 240, width: 6, height: 8, type: 'building' },

    // West estate (Oliver) — manor mass + walled garden
    { x: 128, y: 259, width: 10, height: 7, type: 'building', interactionId: 'guilrhym_oliver_manor' },
    { x: 112, y: 256, width: 12, height: 8, type: 'building' },
    { x: 110, y: 266, width: 6, height: 6, type: 'garden' }, // the one kept "park" patch (Oliver's walled garden)
    { x: 124, y: 268, width: 10, height: 4, type: 'cobble_plaza' },
    { x: 108, y: 254, width: 34, height: 2, type: 'iron_fence_border' },
    // East estate (ruined, asymmetric counterpart)
    { x: 168, y: 258, width: 12, height: 8, type: 'building' },
    { x: 184, y: 262, width: 10, height: 7, type: 'destroyed_town' },
    { x: 176, y: 252, width: 16, height: 2, type: 'iron_fence_border' },

    // Outskirts edge — ruined buildings (no grass yards; this is a stone city)
    { x: 40, y: 264, width: 12, height: 8, type: 'destroyed_town' },
    { x: 56, y: 274, width: 10, height: 8, type: 'destroyed_town' },
    { x: 244, y: 266, width: 12, height: 8, type: 'destroyed_town' },
    { x: 258, y: 276, width: 10, height: 8, type: 'destroyed_town' },
    { x: 36, y: 250, width: 10, height: 8, type: 'destroyed_town' },
    { x: 252, y: 250, width: 10, height: 8, type: 'destroyed_town' },
    // Broken wagons on the approach
    { x: 120, y: 280, width: 6, height: 5, type: 'broken_wagon' },
    { x: 174, y: 282, width: 6, height: 5, type: 'broken_wagon' },

    // =========================================================================
    // ZONE B — MARKET / ARTISAN QUARTER (EAST, y: 180–240)
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
    // Cemetery rise (east, elevated — see elevationZones)
    { x: 244, y: 168, width: 36, height: 18, type: 'cemetery' },
    { x: 250, y: 184, width: 22, height: 6, type: 'graveyard' },
    // West-south residential pocket (optional explore, reachable from the plaza
    // via the y205 cross-street; building masses with narrow lanes)
    { x: 40, y: 188, width: 14, height: 10, type: 'building' },
    { x: 58, y: 184, width: 12, height: 10, type: 'building' },
    { x: 40, y: 206, width: 12, height: 10, type: 'building' },
    { x: 58, y: 210, width: 14, height: 12, type: 'building' },
    { x: 44, y: 224, width: 16, height: 12, type: 'destroyed_town' },
    { x: 78, y: 196, width: 10, height: 10, type: 'building' },
    { x: 96, y: 200, width: 12, height: 10, type: 'building' },
    // Cross-street linking the west pocket to the market plaza (a clear lane at
    // y205; everything around it is base cobblestone, so this is just dressing)
    { x: 74, y: 204, width: 102, height: 4, type: 'clearing', fill: 'cobblestone' },

    // =========================================================================
    // THE CANAL (y: 169–175) — the single hard barrier. Water everywhere except
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
    // ZONE C — NORTH BANK & WEST UNDERCROFT (y: 100–168)
    // After the Toll Bridge the player lands on the north bank (east). Upper-city
    // building masses + the NORTH-BANK WALL at y150 (gap on the WEST, x16–104)
    // force the player west into the Undercroft, which climbs to The Heights.
    // The central spine is sealed by the Heights portcullis (Lever 1, y116-118).
    // =========================================================================

    // North-bank wall forcing west (WEST gap x16–104 + CENTER gap x146–154 for the
    // Lever-1 portcullis shortcut lane stay open).
    { x: 104, y: 150, width: 42, height: 5, type: 'wall', fill: 'stone' },  // x104–145
    { x: 155, y: 150, width: 129, height: 5, type: 'wall', fill: 'stone' }, // x155–283
    // UPPER-CITY WARREN (east of the spine, off the critical path) — a DENSE
    // concrete maze of solid building blocks with 2-tile alleys, a packed
    // Yharnam-style district the player threads through for optional loot. Region
    // x158-272, y100-148; one block omitted as a courtyard nook (x214,y124).
    // Row y100
    { x: 158, y: 100, width: 12, height: 10, type: 'wall', fill: 'stone' },
    { x: 172, y: 100, width: 12, height: 10, type: 'wall', fill: 'stone' },
    { x: 186, y: 100, width: 12, height: 10, type: 'wall', fill: 'stone' },
    { x: 200, y: 100, width: 12, height: 10, type: 'wall', fill: 'stone' },
    { x: 214, y: 100, width: 12, height: 10, type: 'wall', fill: 'stone' },
    { x: 228, y: 100, width: 12, height: 10, type: 'wall', fill: 'stone' },
    { x: 242, y: 100, width: 12, height: 10, type: 'wall', fill: 'stone' },
    { x: 256, y: 100, width: 14, height: 10, type: 'wall', fill: 'stone' },
    // Row y112
    { x: 158, y: 112, width: 12, height: 10, type: 'wall', fill: 'stone' },
    { x: 172, y: 112, width: 12, height: 10, type: 'wall', fill: 'stone' },
    { x: 186, y: 112, width: 12, height: 10, type: 'wall', fill: 'stone' },
    { x: 200, y: 112, width: 12, height: 10, type: 'wall', fill: 'stone' },
    { x: 214, y: 112, width: 12, height: 10, type: 'wall', fill: 'stone' },
    { x: 228, y: 112, width: 12, height: 10, type: 'wall', fill: 'stone' },
    { x: 242, y: 112, width: 12, height: 10, type: 'wall', fill: 'stone' },
    { x: 256, y: 112, width: 14, height: 10, type: 'wall', fill: 'stone' },
    // Row y124 (x214 omitted → courtyard nook with a chest)
    { x: 158, y: 124, width: 12, height: 10, type: 'wall', fill: 'stone' },
    { x: 172, y: 124, width: 12, height: 10, type: 'wall', fill: 'stone' },
    { x: 186, y: 124, width: 12, height: 10, type: 'wall', fill: 'stone' },
    { x: 200, y: 124, width: 12, height: 10, type: 'wall', fill: 'stone' },
    { x: 228, y: 124, width: 12, height: 10, type: 'wall', fill: 'stone' },
    { x: 242, y: 124, width: 12, height: 10, type: 'wall', fill: 'stone' },
    { x: 256, y: 124, width: 14, height: 10, type: 'wall', fill: 'stone' },
    // Row y136
    { x: 158, y: 136, width: 12, height: 10, type: 'wall', fill: 'stone' },
    { x: 172, y: 136, width: 12, height: 10, type: 'wall', fill: 'stone' },
    { x: 186, y: 136, width: 12, height: 10, type: 'wall', fill: 'stone' },
    { x: 200, y: 136, width: 12, height: 10, type: 'wall', fill: 'stone' },
    { x: 214, y: 136, width: 12, height: 10, type: 'wall', fill: 'stone' },
    { x: 228, y: 136, width: 12, height: 10, type: 'wall', fill: 'stone' },
    { x: 242, y: 136, width: 12, height: 10, type: 'wall', fill: 'stone' },
    { x: 256, y: 136, width: 14, height: 10, type: 'wall', fill: 'stone' },
    // Center spine walls (leave the x146-154 column for the portcullis route)
    { x: 116, y: 120, width: 28, height: 16, type: 'building' },
    { x: 156, y: 120, width: 2, height: 16, type: 'wall', fill: 'stone' },
    { x: 142, y: 120, width: 2, height: 16, type: 'wall', fill: 'stone' },

    // The Undercroft (WEST) — sunken cloister: ruins floor, drainage, claustral
    { x: 24, y: 116, width: 76, height: 48, type: 'clearing', fill: 'ruins_floor' },
    { x: 30, y: 124, width: 14, height: 12, type: 'building' },
    { x: 30, y: 144, width: 14, height: 12, type: 'building' },
    { x: 54, y: 120, width: 12, height: 10, type: 'destroyed_town' },
    { x: 76, y: 124, width: 14, height: 12, type: 'building' },
    { x: 76, y: 146, width: 14, height: 12, type: 'building' },
    { x: 48, y: 140, width: 16, height: 14, type: 'ruined_fort' },
    // Undercroft drainage channel (dressing, walkable cobblestone gaps remain)
    { x: 24, y: 158, width: 76, height: 3, type: 'clearing', fill: 'cobblestone_dark' },

    // =========================================================================
    // THE HEIGHTS (WEST-NORTH terrace, y: 95–115) — residential terrace on a
    // rise. The Heights bonfire (95,110). Path turns EAST toward the cloister.
    // =========================================================================
    { x: 64, y: 92, width: 60, height: 26, type: 'cobble_plaza' },
    { x: 70, y: 96, width: 12, height: 10, type: 'building' },
    { x: 100, y: 96, width: 12, height: 10, type: 'building' },
    { x: 84, y: 98, width: 10, height: 8, type: 'cobble_plaza' },
    { x: 28, y: 90, width: 10, height: 10, type: 'watchtower' },
    // Heights → cloister connector street (center-north)
    { x: 120, y: 96, width: 36, height: 6, type: 'clearing', fill: 'cobblestone' },

    // =========================================================================
    // ZONE D — RELIQUARY CLOISTER & CATHEDRAL APPROACH (center-north, y: 44–95)
    // The authored "dungeon": a colonnade funnel rising to the fog gate. No
    // flanking — building masses wall both sides; a votive-candle trail wayfinds.
    // Cathedral Steps bonfire (150,55) sits just before the fog gate (y45).
    // =========================================================================
    { x: 122, y: 46, width: 56, height: 48, type: 'clearing', fill: 'ruins_floor' },
    // Cloister side walls (funnel — no flanking)
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
    { x: 104, y: 100, interactionId: 'guilrhym_rooftop_chest' },
    { x: 30, y: 94, interactionId: 'guilrhym_terrace_hidden_chest' }, // 'hidden'
    // --- Reliquary Cloister (4) ---
    { x: 219, y: 129, interactionId: 'guilrhym_warren_chest' }, // upper-city warren courtyard nook
    { x: 130, y: 88, interactionId: 'guilrhym_cloister_chest' },
    { x: 150, y: 50, interactionId: 'guilrhym_reliquary_ancient_chest' }, // bait-and-switch deep ornate chest
    { x: 138, y: 20, interactionId: 'guilrhym_cathedral_chest' },
    { x: 168, y: 22, interactionId: 'guilrhym_steps_chest' },
  ],
  interactables: [
    // --- Bonfires (4) — match bonfires.ts exactly ---
    { x: 150, y: 272, type: 'bonfire', walkable: false, interactionId: 'bonfire_guilrhym_gate' },
    { x: 200, y: 198, type: 'bonfire', walkable: false, interactionId: 'bonfire_guilrhym_market' },
    { x: 95, y: 110, type: 'bonfire', walkable: false, interactionId: 'bonfire_guilrhym_heights' },
    { x: 150, y: 55, type: 'bonfire', walkable: false, interactionId: 'bonfire_guilrhym_cathedral' },

    // --- Wells (3) — keep interactionIds (heal interactions) ---
    { x: 146, y: 268, type: 'well', walkable: false, interactionId: 'guilrhym_fountain' },
    { x: 198, y: 206, type: 'well', walkable: false, interactionId: 'guilrhym_market_well' },
    { x: 150, y: 62, type: 'well', walkable: false, interactionId: 'guilrhym_cathedral_well' },

    // --- Shortcut levers (2) — runtime opens the matching center gate ---
    // Lever 1: pulled at the top of the Heights detour, opens the center portcullis below.
    { x: 140, y: 112, type: 'shortcut_lever', walkable: false, interactionId: 'guilrhym_shortcut_lever_1' },
    // Lever 2: pulled on the north canal bank, opens the central canal sluice below.
    { x: 138, y: 162, type: 'shortcut_lever', walkable: false, interactionId: 'guilrhym_shortcut_lever_2' },

    // --- Narrative signs (13) — keep interactionIds (dialogues.ts) ---
    { x: 150, y: 290, type: 'sign', walkable: false, interactionId: 'guilrhym_gate_sign' },
    { x: 158, y: 270, type: 'sign', walkable: false, interactionId: 'guilrhym_notice_board' },
    { x: 186, y: 212, type: 'sign', walkable: false, interactionId: 'guilrhym_hunter_trace' },
    { x: 246, y: 182, type: 'sign', walkable: false, interactionId: 'guilrhym_cemetery_marker' },
    { x: 62, y: 200, type: 'sign', walkable: false, interactionId: 'guilrhym_residential_notice' },
    { x: 134, y: 158, type: 'sign', walkable: false, interactionId: 'guilrhym_fallen_guard' },
    { x: 150, y: 90, type: 'sign', walkable: false, interactionId: 'guilrhym_church_altar' },
    { x: 206, y: 216, type: 'sign', walkable: false, interactionId: 'guilrhym_market_ledger' },
    { x: 184, y: 226, type: 'sign', walkable: false, interactionId: 'guilrhym_inn_notice' },
    { x: 90, y: 104, type: 'sign', walkable: false, interactionId: 'guilrhym_rooftop_journal' },
    { x: 70, y: 138, type: 'sign', walkable: false, interactionId: 'guilrhym_guard_orders' },
    { x: 150, y: 48, type: 'sign', walkable: false, interactionId: 'guilrhym_cathedral_inscription' },
    { x: 156, y: 47, type: 'sign', walkable: false, interactionId: 'guilrhym_reaver_plaque' },

    // --- Campfire remains (atmosphere) ---
    { x: 60, y: 256, type: 'campfire_remains', walkable: false },
    { x: 248, y: 244, type: 'campfire_remains', walkable: false },
    { x: 70, y: 132, type: 'campfire_remains', walkable: false },

    // --- Moonblooms (4) — merchant quest ---
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
    // Cemetery rise (east market quarter) — OFF the critical path (optional loot).
    { x: 244, y: 166, width: 38, height: 22, elevation: 1 },
    // Heights watchtower — OFF the critical path (optional vantage/loot).
    { x: 26, y: 88, width: 14, height: 14, elevation: 1 },
    // NOTE: The Heights terrace itself is kept at elevation 0 so the critical
    // path (Undercroft → Heights → Cloister) has no elevation seam to block it.
  ],
  stairways: [
    // Onto the cemetery rise (from the market plaza side)
    { x: 248, y: 186, width: 4, height: 3, elevation: 1 },
    // Watchtower
    { x: 30, y: 100, width: 3, height: 3, elevation: 1 },
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

    // --- Zone D Reliquary Cloister (boss approach — staged ramp toward fog gate) ---
    { x: 122, y: 84, width: 56, height: 10, enemyType: 'shadow', count: 4 },
    { x: 122, y: 70, width: 56, height: 12, enemyType: 'shadow_lurker', count: 4 },
    { x: 122, y: 56, width: 56, height: 12, enemyType: 'skeleton_captain', count: 2 },
    { x: 130, y: 60, width: 40, height: 10, enemyType: 'golem', count: 1 }, // cloister guardian
    { x: 122, y: 46, width: 56, height: 10, enemyType: 'shadow', count: 3 }, // final press before the gate
  ],
  props: [
    // ===== ASSET TEST (temporary) — tenement kit: a row showing variant variety =====
    { x: 34, y: 254, type: 'tenement_facade', walkable: false },
    { x: 42, y: 254, type: 'tenement_facade', walkable: false },
    { x: 50, y: 254, type: 'tenement_facade', walkable: false },
    { x: 58, y: 254, type: 'tenement_facade', walkable: false },
    { x: 66, y: 254, type: 'tenement_facade', walkable: false },

    // =========================================================================
    // ENVIRONMENTAL STORYTELLING GRADIENT — bloodstains → bones → ash rising
    // toward the cathedral, plus the votive-candle wayfinding trail.
    // =========================================================================

    // --- Gate Plaza (Oliver's last stand — battle debris) ---
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

    // --- North bank / Undercroft (corruption deepening — bones + rubble) ---
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
    // Candle trail — guides the player north up the nave toward the fog gate.
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
    // Cathedral forecourt (peak corruption — ash, fallen grandeur)
    { x: 128, y: 36, type: 'statue', walkable: false },
    { x: 172, y: 36, type: 'statue', walkable: false },
    { x: 130, y: 30, type: 'wall_torch', walkable: false },
    { x: 170, y: 30, type: 'wall_torch', walkable: false },
    { x: 150, y: 38, type: 'bones_pile', walkable: true },
    { x: 144, y: 32, type: 'bloodstain', walkable: true },
    { x: 156, y: 32, type: 'bloodstain', walkable: true },
  ],
};
