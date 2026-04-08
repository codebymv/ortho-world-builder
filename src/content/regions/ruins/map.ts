import type { MapDefinition } from '@/data/mapGenerator';

export const gilrhymDef: MapDefinition = {
  name: 'Gilrhym',
  subtitle: 'A city consumed by what it buried',
  width: 300,
  height: 300,
  spawnPoint: { x: 150, y: 285 },
  seed: 714,
  baseTerrain: 'city',
  borderTile: 'stone',
  coastalSouthBorder: false,
  autoRoads: false,
  features: [
    // ============================================================
    // LAYER 1 — BUILDING BLOCK WALLS
    // Placed first. Streets (clearings) carve through them.
    // These create the solid impassable building masses that
    // funnel player movement like cliffs/water in Whispering Woods.
    // ============================================================

    // Zone A — Outskirts edge walls (open center for courtyards)
    { x: 22, y: 250, width: 68, height: 38, type: 'wall', fill: 'stone' },
    { x: 210, y: 250, width: 68, height: 38, type: 'wall', fill: 'stone' },

    // Zone B — Residential building blocks (two large masses flanking boulevard)
    { x: 22, y: 185, width: 118, height: 53, type: 'wall', fill: 'stone' },
    { x: 160, y: 185, width: 118, height: 53, type: 'wall', fill: 'stone' },

    // Zone C — Market district walls (edge blocks, center open for plaza)
    { x: 22, y: 122, width: 85, height: 56, type: 'wall', fill: 'stone' },
    { x: 195, y: 122, width: 83, height: 56, type: 'wall', fill: 'stone' },

    // Zone D — Upper city dense blocks (tightest walls)
    { x: 22, y: 62, width: 118, height: 56, type: 'wall', fill: 'stone' },
    { x: 160, y: 62, width: 118, height: 56, type: 'wall', fill: 'stone' },

    // Zone E — Cathedral approach corridor walls
    { x: 22, y: 10, width: 88, height: 45, type: 'wall', fill: 'stone' },
    { x: 190, y: 10, width: 88, height: 45, type: 'wall', fill: 'stone' },

    // ============================================================
    // LAYER 2 — ZONE GATES (full-width barriers with controlled gaps)
    // ============================================================

    // Gate 1 (y:238) — City wall between outskirts and residential
    { x: 22, y: 238, width: 118, height: 4, type: 'wall', fill: 'stone' },
    { x: 160, y: 238, width: 118, height: 4, type: 'wall', fill: 'stone' },

    // Gate 2 (y:178) — Iron fence between residential and market
    { x: 22, y: 178, width: 118, height: 4, type: 'wall', fill: 'iron_fence' },
    { x: 160, y: 178, width: 118, height: 4, type: 'wall', fill: 'iron_fence' },

    // Gate 3 (y:118) — Dense wall between market and upper city
    { x: 22, y: 118, width: 118, height: 4, type: 'wall', fill: 'stone' },
    { x: 160, y: 118, width: 118, height: 4, type: 'wall', fill: 'stone' },

    // Gate 4 (y:55) — Rubble barrier between upper city and cathedral
    { x: 22, y: 55, width: 118, height: 5, type: 'wall', fill: 'stone' },
    { x: 160, y: 55, width: 118, height: 5, type: 'wall', fill: 'stone' },

    // ============================================================
    // LAYER 3 — STREETS (clearings that carve through walls)
    // Clearings always overwrite, so they cut walkable paths
    // through the building block walls above.
    // ============================================================

    // --- Central boulevard (runs through ALL zones) ---
    { x: 140, y: 10, width: 20, height: 280, type: 'clearing', fill: 'cobblestone' },

    // --- Gate gaps (wider clearings at gate barriers) ---
    { x: 138, y: 238, width: 24, height: 4, type: 'clearing', fill: 'cobblestone' },
    { x: 138, y: 178, width: 24, height: 4, type: 'clearing', fill: 'cobblestone' },
    { x: 140, y: 118, width: 20, height: 4, type: 'clearing', fill: 'cobblestone' },
    { x: 142, y: 55, width: 16, height: 5, type: 'clearing', fill: 'cobblestone' },

    // --- Zone A approach streets ---
    { x: 90, y: 268, width: 120, height: 5, type: 'clearing', fill: 'cobblestone' },

    // --- Zone B cross streets ---
    { x: 22, y: 228, width: 256, height: 5, type: 'clearing', fill: 'cobblestone' },
    { x: 22, y: 205, width: 256, height: 5, type: 'clearing', fill: 'cobblestone' },
    { x: 22, y: 188, width: 256, height: 5, type: 'clearing', fill: 'cobblestone' },

    // --- Zone B side alleys ---
    { x: 103, y: 185, width: 6, height: 53, type: 'clearing', fill: 'cobblestone_dark' },
    { x: 170, y: 185, width: 6, height: 53, type: 'clearing', fill: 'cobblestone_dark' },
    { x: 192, y: 185, width: 6, height: 53, type: 'clearing', fill: 'cobblestone_dark' },

    // --- Zone C cross streets ---
    { x: 22, y: 158, width: 256, height: 5, type: 'clearing', fill: 'cobblestone' },
    { x: 22, y: 135, width: 256, height: 5, type: 'clearing', fill: 'cobblestone' },
    { x: 22, y: 125, width: 256, height: 5, type: 'clearing', fill: 'cobblestone' },

    // --- Zone C side alleys ---
    { x: 84, y: 122, width: 6, height: 56, type: 'clearing', fill: 'cobblestone_dark' },
    { x: 198, y: 122, width: 6, height: 56, type: 'clearing', fill: 'cobblestone_dark' },

    // --- Zone D cross streets ---
    { x: 22, y: 112, width: 256, height: 5, type: 'clearing', fill: 'cobblestone' },
    { x: 22, y: 96, width: 256, height: 4, type: 'clearing', fill: 'cobblestone' },
    { x: 22, y: 78, width: 256, height: 4, type: 'clearing', fill: 'cobblestone' },

    // --- Zone D narrow alleys (dark cobblestone) ---
    { x: 50, y: 62, width: 5, height: 56, type: 'clearing', fill: 'cobblestone_dark' },
    { x: 68, y: 62, width: 5, height: 56, type: 'clearing', fill: 'cobblestone_dark' },
    { x: 86, y: 62, width: 5, height: 56, type: 'clearing', fill: 'cobblestone_dark' },
    { x: 106, y: 62, width: 5, height: 56, type: 'clearing', fill: 'cobblestone_dark' },
    { x: 126, y: 62, width: 5, height: 56, type: 'clearing', fill: 'cobblestone_dark' },
    { x: 163, y: 62, width: 5, height: 56, type: 'clearing', fill: 'cobblestone_dark' },
    { x: 176, y: 62, width: 5, height: 56, type: 'clearing', fill: 'cobblestone_dark' },
    { x: 193, y: 62, width: 5, height: 56, type: 'clearing', fill: 'cobblestone_dark' },
    { x: 211, y: 62, width: 5, height: 56, type: 'clearing', fill: 'cobblestone_dark' },
    { x: 233, y: 62, width: 5, height: 56, type: 'clearing', fill: 'cobblestone_dark' },
    { x: 250, y: 62, width: 5, height: 56, type: 'clearing', fill: 'cobblestone_dark' },

    // --- Zone E approach corridor ---
    { x: 110, y: 10, width: 80, height: 50, type: 'clearing', fill: 'cobblestone' },
    { x: 100, y: 30, width: 6, height: 25, type: 'clearing', fill: 'cobblestone' },
    { x: 194, y: 30, width: 6, height: 25, type: 'clearing', fill: 'cobblestone' },
    { x: 60, y: 34, width: 50, height: 4, type: 'clearing', fill: 'cobblestone' },
    { x: 194, y: 34, width: 50, height: 4, type: 'clearing', fill: 'cobblestone' },

    // ============================================================
    // LAYER 4 — ZONE CONTENT (plazas, buildings, landmarks, details)
    // Placed after walls and streets for correct layering.
    // ============================================================

    // --- ZONE A — OUTSKIRTS / APPROACH (y: 240–290) ---

    // === WEST ESTATE GROUNDS (Oliver courtyard) ===
    // Main courtyard — large paved area
    { x: 92, y: 255, width: 44, height: 26, type: 'cobble_plaza' },
    // Courtyard walkway connecting to boulevard
    { x: 130, y: 258, width: 12, height: 5, type: 'clearing', fill: 'cobblestone' },
    // North walkway to gardens
    { x: 100, y: 248, width: 30, height: 5, type: 'clearing', fill: 'cobblestone' },
    // Estate manor (Oliver leans against this)
    { x: 96, y: 262, width: 14, height: 10, type: 'building', interactionId: 'gilrhym_oliver_manor' },
    // Garden atrium behind the manor
    { x: 94, y: 248, width: 18, height: 10, type: 'garden' },
    // Brick foundation around the manor
    { x: 92, y: 260, width: 20, height: 3, type: 'clearing', fill: 'brick' },
    // Side garden wing
    { x: 118, y: 244, width: 14, height: 8, type: 'garden' },
    // Cobblestone approach from south
    { x: 108, y: 270, width: 22, height: 6, type: 'clearing', fill: 'cobblestone' },
    // Iron fence border along south edge of estate
    { x: 92, y: 280, width: 44, height: 2, type: 'iron_fence_border' },
    // Guard house (east wing of estate)
    { x: 124, y: 270, width: 8, height: 6, type: 'building', interactionId: 'gilrhym_guard_house' },
    // Servant quarters (south wing)
    { x: 94, y: 274, width: 10, height: 6, type: 'cottage', interactionId: 'gilrhym_servant_quarters' },
    // Brick courtyard cross-paths
    { x: 110, y: 262, width: 2, height: 14, type: 'clearing', fill: 'brick' },
    { x: 96, y: 272, width: 38, height: 2, type: 'clearing', fill: 'brick' },
    // Central garden bed in courtyard
    { x: 114, y: 260, width: 10, height: 6, type: 'garden' },
    // Cobblestone_dark accent strips
    { x: 92, y: 258, width: 4, height: 2, type: 'clearing', fill: 'cobblestone_dark' },
    { x: 132, y: 258, width: 4, height: 2, type: 'clearing', fill: 'cobblestone_dark' },
    { x: 92, y: 276, width: 4, height: 2, type: 'clearing', fill: 'cobblestone_dark' },
    { x: 132, y: 276, width: 4, height: 2, type: 'clearing', fill: 'cobblestone_dark' },
    // Iron fence partitions within courtyard
    { x: 110, y: 255, width: 22, height: 1, type: 'iron_fence_border' },

    // Damaged ruins on estate perimeter
    { x: 90, y: 272, width: 12, height: 8, type: 'destroyed_town' },

    // === EAST ESTATE GROUNDS ===
    // Main courtyard
    { x: 164, y: 255, width: 44, height: 26, type: 'cobble_plaza' },
    // Courtyard walkway connecting to boulevard
    { x: 158, y: 258, width: 12, height: 5, type: 'clearing', fill: 'cobblestone' },
    // North walkway to gardens
    { x: 170, y: 248, width: 30, height: 5, type: 'clearing', fill: 'cobblestone' },
    // Estate manor
    { x: 190, y: 262, width: 14, height: 10, type: 'building', interactionId: 'gilrhym_east_manor' },
    // Garden atrium
    { x: 188, y: 248, width: 18, height: 10, type: 'garden' },
    // Brick foundation
    { x: 188, y: 260, width: 20, height: 3, type: 'clearing', fill: 'brick' },
    // Side garden wing
    { x: 168, y: 244, width: 14, height: 8, type: 'garden' },
    // Cobblestone approach from south
    { x: 170, y: 270, width: 22, height: 6, type: 'clearing', fill: 'cobblestone' },
    // Iron fence border along south edge
    { x: 164, y: 280, width: 44, height: 2, type: 'iron_fence_border' },
    // Guard house (west wing)
    { x: 168, y: 270, width: 8, height: 6, type: 'building', interactionId: 'gilrhym_east_guard_house' },
    // Stable building (south wing)
    { x: 196, y: 274, width: 10, height: 6, type: 'cottage', interactionId: 'gilrhym_east_stable' },
    // Brick courtyard cross-paths
    { x: 188, y: 262, width: 2, height: 14, type: 'clearing', fill: 'brick' },
    { x: 164, y: 272, width: 38, height: 2, type: 'clearing', fill: 'brick' },
    // Central garden bed in courtyard
    { x: 176, y: 260, width: 10, height: 6, type: 'garden' },
    // Cobblestone_dark accent strips
    { x: 164, y: 258, width: 4, height: 2, type: 'clearing', fill: 'cobblestone_dark' },
    { x: 204, y: 258, width: 4, height: 2, type: 'clearing', fill: 'cobblestone_dark' },
    { x: 164, y: 276, width: 4, height: 2, type: 'clearing', fill: 'cobblestone_dark' },
    { x: 204, y: 276, width: 4, height: 2, type: 'clearing', fill: 'cobblestone_dark' },
    // Iron fence partitions within courtyard
    { x: 168, y: 255, width: 22, height: 1, type: 'iron_fence_border' },
    // Damaged ruins on perimeter
    { x: 198, y: 272, width: 12, height: 8, type: 'destroyed_town' },

    // === CENTRAL BOULEVARD WIDENING (between estates) ===
    // Wider plaza where boulevard meets the estate district
    { x: 130, y: 248, width: 40, height: 8, type: 'cobble_plaza' },
    // Cross-walkway connecting both estates through boulevard
    { x: 92, y: 253, width: 116, height: 4, type: 'clearing', fill: 'cobblestone' },

    // === OUTSKIRTS EDGE (flanking the estates) ===
    { x: 72, y: 275, width: 12, height: 8, type: 'cottage', interactionId: 'gilrhym_ruin_cottage_1' },
    { x: 210, y: 272, width: 12, height: 8, type: 'cottage', interactionId: 'gilrhym_ruin_cottage_2' },
    { x: 60, y: 258, width: 16, height: 10, type: 'destroyed_town' },
    { x: 222, y: 260, width: 14, height: 10, type: 'destroyed_town' },
    { x: 40, y: 248, width: 20, height: 14, type: 'clearing', fill: 'dirt' },
    { x: 240, y: 250, width: 18, height: 12, type: 'clearing', fill: 'dirt' },
    { x: 85, y: 248, width: 8, height: 6, type: 'broken_wagon' },
    { x: 160, y: 252, width: 8, height: 6, type: 'broken_wagon' },
    { x: 30, y: 265, width: 20, height: 16, type: 'clearing', fill: 'grass' },
    { x: 260, y: 268, width: 18, height: 14, type: 'clearing', fill: 'grass' },
    { x: 5, y: 280, width: 25, height: 10, type: 'cliff_face' },
    { x: 270, y: 282, width: 25, height: 8, type: 'cliff_face' },

    // === CITY GATE (placed LAST in Zone A so it overwrites estate plazas) ===
    // Outer approach clearing
    { x: 130, y: 282, width: 40, height: 8, type: 'clearing', fill: 'cobblestone' },
    // Inner gate walkway — Oliver's landing
    { x: 130, y: 271, width: 40, height: 5, type: 'clearing', fill: 'cobblestone' },
    // Brick walkway borders
    { x: 130, y: 271, width: 40, height: 1, type: 'clearing', fill: 'brick' },
    { x: 130, y: 275, width: 9, height: 1, type: 'clearing', fill: 'brick' },
    { x: 161, y: 275, width: 9, height: 1, type: 'clearing', fill: 'brick' },
    // City wall (full width, overwrites plaza tiles at y:276-278)
    { x: 88, y: 276, width: 124, height: 3, type: 'wall', fill: 'stone' },
    // Gate gap (carves through the wall)
    { x: 143, y: 276, width: 14, height: 3, type: 'clearing', fill: 'cobblestone' },
    // Gate posts (thick stone pillars flanking the gap)
    { x: 139, y: 275, width: 4, height: 5, type: 'wall', fill: 'stone' },
    { x: 157, y: 275, width: 4, height: 5, type: 'wall', fill: 'stone' },
    // Iron fence wings extending from each gate post
    { x: 130, y: 278, width: 9, height: 2, type: 'iron_fence_border' },
    { x: 161, y: 278, width: 9, height: 2, type: 'iron_fence_border' },

    // --- ZONE B — OUTER DISTRICTS (y: 180–240) ---

    { x: 55, y: 215, width: 10, height: 8, type: 'building', interactionId: 'gilrhym_manor_w1' },
    { x: 70, y: 218, width: 10, height: 8, type: 'building', interactionId: 'gilrhym_manor_w2' },
    { x: 55, y: 198, width: 10, height: 8, type: 'building', interactionId: 'gilrhym_manor_w3' },
    { x: 72, y: 195, width: 10, height: 8, type: 'building', interactionId: 'gilrhym_manor_w4' },
    { x: 58, y: 232, width: 10, height: 8, type: 'building', interactionId: 'gilrhym_manor_w5' },
    { x: 85, y: 215, width: 10, height: 8, type: 'building', interactionId: 'gilrhym_manor_w6' },
    { x: 90, y: 195, width: 10, height: 8, type: 'building', interactionId: 'gilrhym_manor_w7' },
    { x: 195, y: 215, width: 10, height: 8, type: 'building', interactionId: 'gilrhym_manor_e1' },
    { x: 210, y: 218, width: 10, height: 8, type: 'building', interactionId: 'gilrhym_manor_e2' },
    { x: 195, y: 198, width: 10, height: 8, type: 'building', interactionId: 'gilrhym_manor_e3' },
    { x: 212, y: 195, width: 10, height: 8, type: 'building', interactionId: 'gilrhym_manor_e4' },
    { x: 198, y: 232, width: 10, height: 8, type: 'building', interactionId: 'gilrhym_manor_e5' },
    { x: 228, y: 212, width: 10, height: 8, type: 'building', interactionId: 'gilrhym_manor_e6' },
    { x: 120, y: 210, width: 24, height: 18, type: 'cobble_plaza' },
    { x: 128, y: 214, width: 8, height: 6, type: 'garden' },
    { x: 230, y: 185, width: 30, height: 22, type: 'cemetery' },
    { x: 225, y: 210, width: 20, height: 14, type: 'graveyard' },
    { x: 248, y: 212, width: 12, height: 10, type: 'clearing', fill: 'dirt' },
    { x: 30, y: 195, width: 20, height: 16, type: 'destroyed_town' },
    { x: 25, y: 215, width: 18, height: 12, type: 'destroyed_town' },
    { x: 35, y: 230, width: 14, height: 10, type: 'clearing', fill: 'dirt' },
    { x: 50, y: 210, width: 4, height: 2, type: 'clearing', fill: 'cobblestone' },
    { x: 48, y: 226, width: 6, height: 4, type: 'clearing', fill: 'cobblestone' },
    { x: 108, y: 235, width: 10, height: 8, type: 'building', interactionId: 'gilrhym_outer_1' },
    { x: 162, y: 230, width: 10, height: 8, type: 'building', interactionId: 'gilrhym_outer_2' },
    { x: 100, y: 195, width: 20, height: 14, type: 'clearing', fill: 'cobblestone' },
    { x: 170, y: 198, width: 18, height: 12, type: 'clearing', fill: 'cobblestone' },

    // --- ZONE C — MARKET DISTRICT (y: 120–180) ---

    { x: 110, y: 140, width: 80, height: 30, type: 'cobble_plaza' },
    { x: 125, y: 148, width: 50, height: 12, type: 'market_stall_row' },
    { x: 130, y: 170, width: 16, height: 12, type: 'church' },
    { x: 70, y: 142, width: 14, height: 10, type: 'inn_building', interactionId: 'gilrhym_inn' },
    { x: 45, y: 145, width: 10, height: 8, type: 'building', interactionId: 'gilrhym_shop_w1' },
    { x: 45, y: 130, width: 10, height: 8, type: 'building', interactionId: 'gilrhym_shop_w2' },
    { x: 30, y: 140, width: 10, height: 8, type: 'building', interactionId: 'gilrhym_shop_w3' },
    { x: 55, y: 160, width: 10, height: 8, type: 'building', interactionId: 'gilrhym_shop_w4' },
    { x: 35, y: 158, width: 10, height: 8, type: 'building', interactionId: 'gilrhym_shop_w5' },
    { x: 60, y: 120, width: 10, height: 8, type: 'building', interactionId: 'gilrhym_shop_w6' },
    { x: 210, y: 145, width: 10, height: 8, type: 'building', interactionId: 'gilrhym_shop_e1' },
    { x: 225, y: 142, width: 10, height: 8, type: 'building', interactionId: 'gilrhym_shop_e2' },
    { x: 210, y: 128, width: 10, height: 8, type: 'building', interactionId: 'gilrhym_shop_e3' },
    { x: 240, y: 135, width: 10, height: 8, type: 'building', interactionId: 'gilrhym_shop_e4' },
    { x: 228, y: 160, width: 10, height: 8, type: 'building', interactionId: 'gilrhym_shop_e5' },
    { x: 245, y: 152, width: 10, height: 8, type: 'building', interactionId: 'gilrhym_shop_e6' },
    { x: 255, y: 130, width: 8, height: 8, type: 'watchtower' },
    { x: 25, y: 125, width: 16, height: 12, type: 'garden' },
    { x: 95, y: 162, width: 12, height: 10, type: 'cobble_plaza' },
    { x: 196, y: 160, width: 14, height: 10, type: 'cobble_plaza' },
    { x: 130, y: 108, width: 10, height: 8, type: 'building', interactionId: 'gilrhym_upper_c1' },
    { x: 160, y: 108, width: 10, height: 8, type: 'building', interactionId: 'gilrhym_upper_c2' },
    { x: 120, y: 115, width: 20, height: 10, type: 'clearing', fill: 'cobblestone' },
    { x: 170, y: 115, width: 18, height: 10, type: 'clearing', fill: 'cobblestone' },
    { x: 25, y: 172, width: 20, height: 14, type: 'ruined_fort' },
    { x: 255, y: 115, width: 18, height: 14, type: 'fort' },
    { x: 10, y: 140, width: 10, height: 20, type: 'lake' },
    { x: 25, y: 155, width: 14, height: 10, type: 'hedge_maze' },

    // --- ZONE D — UPPER CITY / ROOFTOPS (y: 60–120) ---

    { x: 40, y: 100, width: 10, height: 8, type: 'building', interactionId: 'gilrhym_upper_w1' },
    { x: 55, y: 102, width: 10, height: 8, type: 'building', interactionId: 'gilrhym_upper_w2' },
    { x: 40, y: 85, width: 10, height: 8, type: 'building', interactionId: 'gilrhym_upper_w3' },
    { x: 58, y: 88, width: 10, height: 8, type: 'building', interactionId: 'gilrhym_upper_w4' },
    { x: 42, y: 68, width: 10, height: 8, type: 'building', interactionId: 'gilrhym_upper_w5' },
    { x: 60, y: 72, width: 10, height: 8, type: 'building', interactionId: 'gilrhym_upper_w6' },
    { x: 75, y: 98, width: 10, height: 8, type: 'building', interactionId: 'gilrhym_upper_w7' },
    { x: 78, y: 80, width: 10, height: 8, type: 'building', interactionId: 'gilrhym_upper_w8' },
    { x: 75, y: 65, width: 10, height: 8, type: 'building', interactionId: 'gilrhym_upper_w9' },
    { x: 95, y: 105, width: 10, height: 8, type: 'building', interactionId: 'gilrhym_upper_w10' },
    { x: 95, y: 90, width: 10, height: 8, type: 'building', interactionId: 'gilrhym_upper_w11' },
    { x: 95, y: 72, width: 10, height: 8, type: 'building', interactionId: 'gilrhym_upper_w12' },
    { x: 115, y: 100, width: 10, height: 8, type: 'building', interactionId: 'gilrhym_upper_w13' },
    { x: 115, y: 82, width: 10, height: 8, type: 'building', interactionId: 'gilrhym_upper_w14' },
    { x: 115, y: 66, width: 10, height: 8, type: 'building', interactionId: 'gilrhym_upper_w15' },
    { x: 130, y: 95, width: 10, height: 8, type: 'building', interactionId: 'gilrhym_upper_w16' },
    { x: 130, y: 76, width: 10, height: 8, type: 'building', interactionId: 'gilrhym_upper_w17' },
    { x: 165, y: 100, width: 10, height: 8, type: 'building', interactionId: 'gilrhym_upper_e1' },
    { x: 165, y: 82, width: 10, height: 8, type: 'building', interactionId: 'gilrhym_upper_e2' },
    { x: 165, y: 66, width: 10, height: 8, type: 'building', interactionId: 'gilrhym_upper_e3' },
    { x: 182, y: 98, width: 10, height: 8, type: 'building', interactionId: 'gilrhym_upper_e4' },
    { x: 182, y: 80, width: 10, height: 8, type: 'building', interactionId: 'gilrhym_upper_e5' },
    { x: 182, y: 64, width: 10, height: 8, type: 'building', interactionId: 'gilrhym_upper_e6' },
    { x: 200, y: 102, width: 10, height: 8, type: 'building', interactionId: 'gilrhym_upper_e7' },
    { x: 200, y: 85, width: 10, height: 8, type: 'building', interactionId: 'gilrhym_upper_e8' },
    { x: 200, y: 68, width: 10, height: 8, type: 'building', interactionId: 'gilrhym_upper_e9' },
    { x: 218, y: 100, width: 10, height: 8, type: 'building', interactionId: 'gilrhym_upper_e10' },
    { x: 218, y: 82, width: 10, height: 8, type: 'building', interactionId: 'gilrhym_upper_e11' },
    { x: 218, y: 66, width: 10, height: 8, type: 'building', interactionId: 'gilrhym_upper_e12' },
    { x: 238, y: 95, width: 10, height: 8, type: 'building', interactionId: 'gilrhym_upper_e13' },
    { x: 240, y: 75, width: 10, height: 8, type: 'building', interactionId: 'gilrhym_upper_e14' },
    { x: 255, y: 90, width: 10, height: 8, type: 'building', interactionId: 'gilrhym_upper_e15' },
    { x: 45, y: 70, width: 18, height: 6, type: 'clearing', fill: 'roof_tile' },
    { x: 80, y: 68, width: 16, height: 6, type: 'clearing', fill: 'roof_tile' },
    { x: 100, y: 74, width: 14, height: 6, type: 'clearing', fill: 'roof_tile' },
    { x: 120, y: 68, width: 16, height: 6, type: 'clearing', fill: 'roof_tile' },
    { x: 168, y: 70, width: 16, height: 6, type: 'clearing', fill: 'roof_tile' },
    { x: 205, y: 68, width: 18, height: 6, type: 'clearing', fill: 'roof_tile' },
    { x: 240, y: 72, width: 14, height: 6, type: 'clearing', fill: 'roof_tile' },
    { x: 63, y: 72, width: 7, height: 2, type: 'clearing', fill: 'wooden_path' },
    { x: 96, y: 76, width: 4, height: 2, type: 'clearing', fill: 'wooden_path' },
    { x: 114, y: 70, width: 6, height: 2, type: 'clearing', fill: 'wooden_path' },
    { x: 136, y: 70, width: 24, height: 2, type: 'clearing', fill: 'wooden_path' },
    { x: 184, y: 72, width: 21, height: 2, type: 'clearing', fill: 'wooden_path' },
    { x: 223, y: 74, width: 17, height: 2, type: 'clearing', fill: 'wooden_path' },
    { x: 140, y: 86, width: 20, height: 14, type: 'cobble_plaza' },
    { x: 144, y: 88, width: 12, height: 10, type: 'clearing', fill: 'ruins_floor' },
    { x: 28, y: 90, width: 8, height: 8, type: 'watchtower' },
    { x: 262, y: 85, width: 8, height: 8, type: 'watchtower' },

    // --- ZONE E — CITY CENTER / BOSS (y: 10–60) ---

    { x: 110, y: 25, width: 80, height: 30, type: 'cobble_plaza' },
    { x: 125, y: 15, width: 50, height: 30, type: 'boss_arena', interactionId: 'reaver_summon' },
    { x: 85, y: 20, width: 18, height: 14, type: 'ruins' },
    { x: 200, y: 20, width: 18, height: 14, type: 'ruins' },
    { x: 80, y: 38, width: 14, height: 10, type: 'destroyed_town' },
    { x: 210, y: 38, width: 14, height: 10, type: 'destroyed_town' },
    { x: 70, y: 40, width: 10, height: 8, type: 'building', interactionId: 'gilrhym_cathedral_bldg_1' },
    { x: 225, y: 40, width: 10, height: 8, type: 'building', interactionId: 'gilrhym_cathedral_bldg_2' },
    { x: 60, y: 25, width: 10, height: 8, type: 'building', interactionId: 'gilrhym_cathedral_bldg_3' },
    { x: 235, y: 25, width: 10, height: 8, type: 'building', interactionId: 'gilrhym_cathedral_bldg_4' },
    { x: 45, y: 15, width: 14, height: 12, type: 'graveyard' },
    { x: 245, y: 15, width: 14, height: 12, type: 'graveyard' },
    { x: 20, y: 8, width: 260, height: 3, type: 'wall', fill: 'stone' },
    { x: 5, y: 5, width: 12, height: 55, type: 'cliff_face' },
    { x: 283, y: 5, width: 12, height: 55, type: 'cliff_face' },

    // --- Map edge cliffs (all zones) ---
    { x: 5, y: 60, width: 15, height: 60, type: 'cliff_face' },
    { x: 280, y: 60, width: 15, height: 60, type: 'cliff_face' },
    { x: 5, y: 120, width: 15, height: 60, type: 'cliff_face' },
    { x: 280, y: 120, width: 15, height: 60, type: 'cliff_face' },
    { x: 5, y: 180, width: 15, height: 60, type: 'cliff_face' },
    { x: 280, y: 180, width: 15, height: 60, type: 'cliff_face' },

    // --- Abandoned camps (outskirts) ---
    { x: 260, y: 240, width: 12, height: 10, type: 'abandoned_camp' },
    { x: 30, y: 242, width: 10, height: 8, type: 'abandoned_camp' },

    // --- Visual detail clearings ---
    { x: 92, y: 256, width: 8, height: 6, type: 'clearing', fill: 'brick' },
    { x: 56, y: 230, width: 6, height: 10, type: 'clearing', fill: 'brick' },
    { x: 197, y: 228, width: 6, height: 10, type: 'clearing', fill: 'brick' },
    { x: 42, y: 142, width: 6, height: 4, type: 'clearing', fill: 'brick' },
    { x: 207, y: 142, width: 6, height: 4, type: 'clearing', fill: 'brick' },
    { x: 48, y: 90, width: 4, height: 12, type: 'clearing', fill: 'brick' },
    { x: 170, y: 88, width: 4, height: 12, type: 'clearing', fill: 'brick' },
    { x: 108, y: 26, width: 6, height: 4, type: 'clearing', fill: 'brick' },
    { x: 186, y: 26, width: 6, height: 4, type: 'clearing', fill: 'brick' },
    { x: 125, y: 42, width: 50, height: 3, type: 'clearing', fill: 'brick' },
    { x: 60, y: 155, width: 12, height: 8, type: 'cobble_plaza' },
    { x: 240, y: 148, width: 12, height: 8, type: 'cobble_plaza' },
    { x: 280, y: 200, width: 12, height: 16, type: 'lake' },

    // ============================================================
    // DENSITY PASS — Additional buildings, plazas, walkways, gardens
    // ============================================================

    // --- Zone A additions ---
    // West outskirts: cottages and walkways within edge wall
    { x: 35, y: 260, width: 10, height: 8, type: 'cottage', interactionId: 'gilrhym_outskirt_cottage_w1' },
    { x: 50, y: 265, width: 10, height: 8, type: 'cottage', interactionId: 'gilrhym_outskirt_cottage_w2' },
    { x: 35, y: 272, width: 14, height: 8, type: 'destroyed_town' },
    { x: 55, y: 275, width: 12, height: 6, type: 'clearing', fill: 'cobblestone' },
    { x: 65, y: 265, width: 8, height: 6, type: 'clearing', fill: 'brick' },
    // East outskirts: cottages and walkways within edge wall
    { x: 240, y: 260, width: 10, height: 8, type: 'cottage', interactionId: 'gilrhym_outskirt_cottage_e1' },
    { x: 255, y: 265, width: 10, height: 8, type: 'cottage', interactionId: 'gilrhym_outskirt_cottage_e2' },
    { x: 240, y: 272, width: 14, height: 8, type: 'destroyed_town' },
    { x: 228, y: 275, width: 12, height: 6, type: 'clearing', fill: 'cobblestone' },
    { x: 222, y: 265, width: 8, height: 6, type: 'clearing', fill: 'brick' },
    // South approach plazas
    { x: 110, y: 284, width: 16, height: 6, type: 'cobble_plaza' },
    { x: 168, y: 284, width: 16, height: 6, type: 'cobble_plaza' },

    // --- Zone B additions ---
    // More buildings along the y:228 cross street
    { x: 40, y: 230, width: 10, height: 8, type: 'building', interactionId: 'gilrhym_res_b1' },
    { x: 240, y: 230, width: 10, height: 8, type: 'building', interactionId: 'gilrhym_res_b2' },
    // More buildings along the y:205 cross street
    { x: 40, y: 200, width: 10, height: 8, type: 'building', interactionId: 'gilrhym_res_b3' },
    { x: 240, y: 200, width: 10, height: 8, type: 'building', interactionId: 'gilrhym_res_b4' },
    // Buildings along the y:188 cross street
    { x: 40, y: 186, width: 10, height: 8, type: 'building', interactionId: 'gilrhym_res_b5' },
    { x: 240, y: 186, width: 10, height: 8, type: 'building', interactionId: 'gilrhym_res_b6' },
    // Plazas at cross-street intersections
    { x: 100, y: 226, width: 10, height: 8, type: 'cobble_plaza' },
    { x: 168, y: 226, width: 10, height: 8, type: 'cobble_plaza' },
    { x: 190, y: 226, width: 10, height: 8, type: 'cobble_plaza' },
    { x: 100, y: 203, width: 10, height: 8, type: 'cobble_plaza' },
    { x: 168, y: 203, width: 10, height: 8, type: 'cobble_plaza' },
    // Gardens along boulevard
    { x: 122, y: 192, width: 10, height: 8, type: 'garden' },
    { x: 168, y: 192, width: 10, height: 8, type: 'garden' },
    // More buildings in central blocks
    { x: 112, y: 215, width: 10, height: 8, type: 'building', interactionId: 'gilrhym_res_b7' },
    { x: 112, y: 195, width: 10, height: 8, type: 'building', interactionId: 'gilrhym_res_b8' },
    { x: 175, y: 215, width: 10, height: 8, type: 'building', interactionId: 'gilrhym_res_b9' },
    { x: 175, y: 195, width: 10, height: 8, type: 'building', interactionId: 'gilrhym_res_b10' },
    // Brick clearings near buildings
    { x: 52, y: 218, width: 6, height: 4, type: 'clearing', fill: 'brick' },
    { x: 200, y: 218, width: 6, height: 4, type: 'clearing', fill: 'brick' },
    { x: 88, y: 228, width: 8, height: 4, type: 'clearing', fill: 'brick' },
    { x: 208, y: 228, width: 8, height: 4, type: 'clearing', fill: 'brick' },
    // Extra destroyed areas for variety
    { x: 248, y: 228, width: 12, height: 10, type: 'destroyed_town' },
    { x: 25, y: 232, width: 10, height: 8, type: 'destroyed_town' },

    // --- Zone C additions ---
    // More buildings filling the wall edges
    { x: 30, y: 125, width: 10, height: 8, type: 'building', interactionId: 'gilrhym_shop_extra_w1' },
    { x: 55, y: 148, width: 10, height: 8, type: 'building', interactionId: 'gilrhym_shop_extra_w2' },
    { x: 30, y: 155, width: 10, height: 8, type: 'building', interactionId: 'gilrhym_shop_extra_w3' },
    { x: 60, y: 135, width: 10, height: 8, type: 'building', interactionId: 'gilrhym_shop_extra_w4' },
    { x: 225, y: 125, width: 10, height: 8, type: 'building', interactionId: 'gilrhym_shop_extra_e1' },
    { x: 210, y: 158, width: 10, height: 8, type: 'building', interactionId: 'gilrhym_shop_extra_e2' },
    { x: 240, y: 148, width: 10, height: 8, type: 'building', interactionId: 'gilrhym_shop_extra_e3' },
    { x: 255, y: 145, width: 10, height: 8, type: 'building', interactionId: 'gilrhym_shop_extra_e4' },
    // Extra market plazas at intersections
    { x: 82, y: 133, width: 10, height: 8, type: 'cobble_plaza' },
    { x: 196, y: 133, width: 10, height: 8, type: 'cobble_plaza' },
    { x: 82, y: 156, width: 10, height: 8, type: 'cobble_plaza' },
    { x: 196, y: 156, width: 10, height: 8, type: 'cobble_plaza' },
    // Gardens flanking the church
    { x: 115, y: 172, width: 10, height: 8, type: 'garden' },
    { x: 155, y: 172, width: 10, height: 8, type: 'garden' },
    // Brick foundations near shops
    { x: 68, y: 150, width: 6, height: 3, type: 'clearing', fill: 'brick' },
    { x: 208, y: 150, width: 6, height: 3, type: 'clearing', fill: 'brick' },
    { x: 43, y: 155, width: 6, height: 3, type: 'clearing', fill: 'brick' },
    { x: 237, y: 155, width: 6, height: 3, type: 'clearing', fill: 'brick' },
    // More walkway detail
    { x: 90, y: 140, width: 16, height: 4, type: 'clearing', fill: 'cobblestone' },
    { x: 194, y: 140, width: 16, height: 4, type: 'clearing', fill: 'cobblestone' },

    // --- Zone D additions ---
    // Small plazas at key alley intersections
    { x: 48, y: 94, width: 8, height: 6, type: 'cobble_plaza' },
    { x: 66, y: 76, width: 8, height: 6, type: 'cobble_plaza' },
    { x: 104, y: 94, width: 8, height: 6, type: 'cobble_plaza' },
    { x: 124, y: 76, width: 8, height: 6, type: 'cobble_plaza' },
    { x: 161, y: 94, width: 8, height: 6, type: 'cobble_plaza' },
    { x: 191, y: 76, width: 8, height: 6, type: 'cobble_plaza' },
    { x: 231, y: 94, width: 8, height: 6, type: 'cobble_plaza' },
    { x: 248, y: 76, width: 8, height: 6, type: 'cobble_plaza' },
    // Brick alley detail
    { x: 84, y: 94, width: 5, height: 4, type: 'clearing', fill: 'brick' },
    { x: 174, y: 94, width: 5, height: 4, type: 'clearing', fill: 'brick' },
    { x: 209, y: 76, width: 5, height: 4, type: 'clearing', fill: 'brick' },
    // Additional ruins in alleys
    { x: 35, y: 75, width: 10, height: 8, type: 'destroyed_town' },
    { x: 265, y: 80, width: 10, height: 8, type: 'destroyed_town' },

    // --- Zone E additions ---
    // More ruins near cathedral
    { x: 70, y: 22, width: 12, height: 10, type: 'ruins' },
    { x: 218, y: 22, width: 12, height: 10, type: 'ruins' },
    // Additional destroyed areas along approach
    { x: 65, y: 42, width: 12, height: 8, type: 'destroyed_town' },
    { x: 225, y: 42, width: 12, height: 8, type: 'destroyed_town' },
    // Approach walkway widening
    { x: 115, y: 45, width: 70, height: 5, type: 'clearing', fill: 'cobblestone' },
    // More graveyard area
    { x: 30, y: 18, width: 12, height: 10, type: 'graveyard' },
    { x: 260, y: 18, width: 12, height: 10, type: 'graveyard' },
    // Brick cathedral foundations
    { x: 112, y: 22, width: 8, height: 4, type: 'clearing', fill: 'brick' },
    { x: 180, y: 22, width: 8, height: 4, type: 'clearing', fill: 'brick' },

    // ============================================================
    // DETAIL PASS 2 — Zone identity & transition reinforcement
    // ============================================================

    // --- Zone A: Rural outskirts feel (more grass, dirt, open space) ---
    // Extra grass patches making outskirts feel rural / overgrown
    { x: 22, y: 280, width: 20, height: 10, type: 'clearing', fill: 'grass' },
    { x: 260, y: 280, width: 18, height: 10, type: 'clearing', fill: 'grass' },
    { x: 75, y: 282, width: 14, height: 8, type: 'clearing', fill: 'grass' },
    { x: 210, y: 282, width: 14, height: 8, type: 'clearing', fill: 'grass' },
    // Dirt cart-tracks approaching the estates
    { x: 78, y: 266, width: 14, height: 3, type: 'clearing', fill: 'dirt' },
    { x: 208, y: 266, width: 14, height: 3, type: 'clearing', fill: 'dirt' },
    { x: 45, y: 258, width: 10, height: 3, type: 'clearing', fill: 'dirt' },
    { x: 248, y: 258, width: 10, height: 3, type: 'clearing', fill: 'dirt' },
    // More gardens to reinforce the estate feel
    { x: 100, y: 270, width: 10, height: 6, type: 'garden' },
    { x: 190, y: 270, width: 10, height: 6, type: 'garden' },
    // Broken wagons on the approach roads
    { x: 122, y: 286, width: 8, height: 6, type: 'broken_wagon' },
    { x: 175, y: 286, width: 8, height: 6, type: 'broken_wagon' },
    // Estate-side iron fence borders
    { x: 92, y: 244, width: 40, height: 2, type: 'iron_fence_border' },
    { x: 164, y: 244, width: 40, height: 2, type: 'iron_fence_border' },
    // Small garden courtyard east of Oliver
    { x: 120, y: 262, width: 8, height: 6, type: 'garden' },

    // --- Zone A→B gate transition: make the city wall entrance imposing ---
    // Extra wall thickness on either side of Gate 1
    { x: 22, y: 236, width: 40, height: 3, type: 'wall', fill: 'stone' },
    { x: 238, y: 236, width: 40, height: 3, type: 'wall', fill: 'stone' },
    // Gatehouse buildings flanking the gate gap
    { x: 125, y: 240, width: 10, height: 6, type: 'building', interactionId: 'gilrhym_gatehouse_w' },
    { x: 165, y: 240, width: 10, height: 6, type: 'building', interactionId: 'gilrhym_gatehouse_e' },
    // Small plazas inside the gate
    { x: 128, y: 234, width: 14, height: 4, type: 'cobble_plaza' },
    { x: 158, y: 234, width: 14, height: 4, type: 'cobble_plaza' },

    // --- Zone B: Residential tightening (more cobble walkways, gardens, density) ---
    // Courtyards between west residential buildings
    { x: 62, y: 210, width: 8, height: 6, type: 'cobble_plaza' },
    { x: 78, y: 202, width: 8, height: 6, type: 'cobble_plaza' },
    { x: 62, y: 228, width: 8, height: 6, type: 'cobble_plaza' },
    // Courtyards between east residential buildings
    { x: 222, y: 210, width: 8, height: 6, type: 'cobble_plaza' },
    { x: 202, y: 202, width: 8, height: 6, type: 'cobble_plaza' },
    { x: 205, y: 228, width: 8, height: 6, type: 'cobble_plaza' },
    // Residential gardens (smaller, private yards)
    { x: 55, y: 222, width: 8, height: 6, type: 'garden' },
    { x: 88, y: 210, width: 8, height: 6, type: 'garden' },
    { x: 195, y: 222, width: 8, height: 6, type: 'garden' },
    { x: 228, y: 218, width: 8, height: 6, type: 'garden' },
    // Brick walkways connecting buildings to streets
    { x: 66, y: 215, width: 4, height: 12, type: 'clearing', fill: 'brick' },
    { x: 80, y: 195, width: 4, height: 10, type: 'clearing', fill: 'brick' },
    { x: 210, y: 215, width: 4, height: 12, type: 'clearing', fill: 'brick' },
    { x: 225, y: 198, width: 4, height: 10, type: 'clearing', fill: 'brick' },
    // Iron fence borders around residential clusters
    { x: 54, y: 213, width: 22, height: 2, type: 'iron_fence_border' },
    { x: 194, y: 213, width: 22, height: 2, type: 'iron_fence_border' },

    // --- Zone B→C gate transition: iron fence feels commercial ---
    // Small market preview plazas just inside Gate 2
    { x: 128, y: 174, width: 14, height: 4, type: 'cobble_plaza' },
    { x: 158, y: 174, width: 14, height: 4, type: 'cobble_plaza' },
    // Broken stalls near gate (market spilling out)
    { x: 122, y: 175, width: 8, height: 4, type: 'market_stall_row' },
    { x: 170, y: 175, width: 8, height: 4, type: 'market_stall_row' },

    // --- Zone C: Market density (more stalls, commercial features) ---
    // Additional market stall rows in the main plaza
    { x: 112, y: 144, width: 14, height: 6, type: 'market_stall_row' },
    { x: 174, y: 144, width: 14, height: 6, type: 'market_stall_row' },
    // Side market areas flanking the main plaza
    { x: 90, y: 148, width: 16, height: 10, type: 'cobble_plaza' },
    { x: 194, y: 148, width: 16, height: 10, type: 'cobble_plaza' },
    // Brick foundations for market stall areas
    { x: 92, y: 152, width: 12, height: 3, type: 'clearing', fill: 'brick' },
    { x: 196, y: 152, width: 12, height: 3, type: 'clearing', fill: 'brick' },
    // Merchant walkways (connects side plazas to main market)
    { x: 106, y: 150, width: 4, height: 8, type: 'clearing', fill: 'cobblestone' },
    { x: 190, y: 150, width: 4, height: 8, type: 'clearing', fill: 'cobblestone' },

    // --- Zone C→D gate transition: heavily barricaded ---
    // Rubble piles flanking Gate 3
    { x: 120, y: 116, width: 10, height: 4, type: 'destroyed_town' },
    { x: 170, y: 116, width: 10, height: 4, type: 'destroyed_town' },

    // --- Zone D: Dense urban claustrophobia (more bridges, rooftop detail) ---
    // Extra wooden plank bridges between rooftops
    { x: 56, y: 68, width: 4, height: 2, type: 'clearing', fill: 'wooden_path' },
    { x: 73, y: 82, width: 5, height: 2, type: 'clearing', fill: 'wooden_path' },
    { x: 93, y: 70, width: 3, height: 2, type: 'clearing', fill: 'wooden_path' },
    { x: 113, y: 84, width: 4, height: 2, type: 'clearing', fill: 'wooden_path' },
    { x: 163, y: 82, width: 5, height: 2, type: 'clearing', fill: 'wooden_path' },
    { x: 200, y: 70, width: 5, height: 2, type: 'clearing', fill: 'wooden_path' },
    { x: 218, y: 84, width: 4, height: 2, type: 'clearing', fill: 'wooden_path' },
    { x: 238, y: 78, width: 4, height: 2, type: 'clearing', fill: 'wooden_path' },
    // Extra rooftop tile platforms
    { x: 35, y: 84, width: 12, height: 5, type: 'clearing', fill: 'roof_tile' },
    { x: 258, y: 86, width: 12, height: 5, type: 'clearing', fill: 'roof_tile' },
    { x: 130, y: 68, width: 10, height: 4, type: 'clearing', fill: 'roof_tile' },
    // Tight brick alcoves
    { x: 52, y: 82, width: 4, height: 6, type: 'clearing', fill: 'brick' },
    { x: 110, y: 82, width: 4, height: 6, type: 'clearing', fill: 'brick' },
    { x: 195, y: 82, width: 4, height: 6, type: 'clearing', fill: 'brick' },
    { x: 250, y: 82, width: 4, height: 6, type: 'clearing', fill: 'brick' },

    // --- Zone D→E gate transition: collapsed, almost impassable ---
    // Rubble and ruins right at Gate 4
    { x: 120, y: 52, width: 12, height: 6, type: 'destroyed_town' },
    { x: 168, y: 52, width: 12, height: 6, type: 'destroyed_town' },
    // Narrowing walls squeezing the approach
    { x: 115, y: 48, width: 6, height: 8, type: 'wall', fill: 'stone' },
    { x: 179, y: 48, width: 6, height: 8, type: 'wall', fill: 'stone' },

    // --- Zone E: Grand corrupted cathedral (more pillars, ruins, grandeur) ---
    // Colonnade along the approach (rows of pillars)
    { x: 114, y: 40, width: 4, height: 4, type: 'clearing', fill: 'brick' },
    { x: 122, y: 40, width: 4, height: 4, type: 'clearing', fill: 'brick' },
    { x: 174, y: 40, width: 4, height: 4, type: 'clearing', fill: 'brick' },
    { x: 182, y: 40, width: 4, height: 4, type: 'clearing', fill: 'brick' },
    // Crumbling walls around the boss arena
    { x: 110, y: 14, width: 12, height: 3, type: 'wall', fill: 'stone' },
    { x: 178, y: 14, width: 12, height: 3, type: 'wall', fill: 'stone' },
    // More ruins flanking the cathedral
    { x: 50, y: 30, width: 10, height: 8, type: 'ruins' },
    { x: 242, y: 30, width: 10, height: 8, type: 'ruins' },
    // Cemetery expansion
    { x: 35, y: 22, width: 10, height: 8, type: 'cemetery' },
    { x: 258, y: 22, width: 10, height: 8, type: 'cemetery' },
  ],
  portals: [
    { x: 150, y: 298, targetMap: 'forest', targetX: 282, targetY: 22 },
  ],
  chests: [
    // Zone A — Outskirts (4)
    { x: 105, y: 265, interactionId: 'gilrhym_gate_chest' },
    { x: 190, y: 258, interactionId: 'gilrhym_courtyard_chest' },
    { x: 68, y: 270, interactionId: 'gilrhym_rubble_chest' },
    { x: 220, y: 265, interactionId: 'gilrhym_outskirt_chest' },

    // Zone B — Outer Districts (8)
    { x: 60, y: 220, interactionId: 'gilrhym_manor_chest_1' },
    { x: 215, y: 220, interactionId: 'gilrhym_manor_chest_2' },
    { x: 125, y: 215, interactionId: 'gilrhym_courtyard_chest_2' },
    { x: 235, y: 190, interactionId: 'gilrhym_cemetery_chest' },
    { x: 32, y: 200, interactionId: 'gilrhym_rubble_chest_2' },
    { x: 95, y: 202, interactionId: 'gilrhym_district_chest_1' },
    { x: 170, y: 208, interactionId: 'gilrhym_district_chest_2' },
    { x: 248, y: 215, interactionId: 'gilrhym_graveyard_chest' },

    // Zone C — Market District (8)
    { x: 118, y: 150, interactionId: 'gilrhym_market_chest_1' },
    { x: 175, y: 148, interactionId: 'gilrhym_market_chest_2' },
    { x: 75, y: 145, interactionId: 'gilrhym_inn_chest' },
    { x: 220, y: 140, interactionId: 'gilrhym_shop_chest_1' },
    { x: 135, y: 175, interactionId: 'gilrhym_church_chest' },
    { x: 258, y: 132, interactionId: 'gilrhym_tower_chest' },
    { x: 48, y: 132, interactionId: 'gilrhym_garden_chest' },
    { x: 98, y: 165, interactionId: 'gilrhym_plaza_chest' },

    // Zone D — Upper City (10)
    { x: 48, y: 102, interactionId: 'gilrhym_alley_chest_1' },
    { x: 82, y: 85, interactionId: 'gilrhym_alley_chest_2' },
    { x: 118, y: 95, interactionId: 'gilrhym_alley_chest_3' },
    { x: 148, y: 92, interactionId: 'gilrhym_scythe_chest' },
    { x: 170, y: 98, interactionId: 'gilrhym_alley_chest_4' },
    { x: 205, y: 88, interactionId: 'gilrhym_alley_chest_5' },
    { x: 242, y: 95, interactionId: 'gilrhym_alley_chest_6' },
    { x: 50, y: 72, interactionId: 'gilrhym_rooftop_chest_1' },
    { x: 210, y: 70, interactionId: 'gilrhym_rooftop_chest_2' },
    { x: 130, y: 70, interactionId: 'gilrhym_rooftop_chest_3' },

    // Zone E — City Center (3)
    { x: 148, y: 20, interactionId: 'gilrhym_cathedral_chest' },
    { x: 90, y: 25, interactionId: 'gilrhym_ruin_chest_1' },
    { x: 210, y: 25, interactionId: 'gilrhym_ruin_chest_2' },
  ],
  interactables: [
    // Bonfires (4)
    { x: 150, y: 268, type: 'bonfire', walkable: false, interactionId: 'bonfire_gilrhym_gate' },
    { x: 150, y: 155, type: 'bonfire', walkable: false, interactionId: 'bonfire_gilrhym_market' },
    { x: 140, y: 85, type: 'bonfire', walkable: false, interactionId: 'bonfire_gilrhym_heights' },
    { x: 150, y: 50, type: 'bonfire', walkable: false, interactionId: 'bonfire_gilrhym_cathedral' },

    // Wells (3)
    { x: 145, y: 265, type: 'well', walkable: false, interactionId: 'gilrhym_fountain' },
    { x: 140, y: 152, type: 'well', walkable: false, interactionId: 'gilrhym_market_well' },
    { x: 145, y: 45, type: 'well', walkable: false, interactionId: 'gilrhym_cathedral_well' },

    // Signs — Zone A (3)
    { x: 148, y: 278, type: 'sign', walkable: false, interactionId: 'gilrhym_gate_sign' },
    { x: 108, y: 262, type: 'sign', walkable: false, interactionId: 'gilrhym_notice_board' },
    { x: 202, y: 270, type: 'sign', walkable: false, interactionId: 'gilrhym_hunter_trace' },

    // Signs — Zone B (3)
    { x: 232, y: 188, type: 'sign', walkable: false, interactionId: 'gilrhym_cemetery_marker' },
    { x: 62, y: 210, type: 'sign', walkable: false, interactionId: 'gilrhym_residential_notice' },
    { x: 130, y: 220, type: 'sign', walkable: false, interactionId: 'gilrhym_fallen_guard' },

    // Signs — Zone C (3)
    { x: 135, y: 172, type: 'sign', walkable: false, interactionId: 'gilrhym_church_altar' },
    { x: 155, y: 142, type: 'sign', walkable: false, interactionId: 'gilrhym_market_ledger' },
    { x: 80, y: 145, type: 'sign', walkable: false, interactionId: 'gilrhym_inn_notice' },

    // Signs — Zone D (3)
    { x: 148, y: 90, type: 'sign', walkable: false, interactionId: 'gilrhym_scythe_inscription' },
    { x: 90, y: 80, type: 'sign', walkable: false, interactionId: 'gilrhym_rooftop_journal' },
    { x: 220, y: 85, type: 'sign', walkable: false, interactionId: 'gilrhym_guard_orders' },

    // Signs — Zone E (2)
    { x: 120, y: 30, type: 'sign', walkable: false, interactionId: 'gilrhym_cathedral_inscription' },
    { x: 180, y: 30, type: 'sign', walkable: false, interactionId: 'gilrhym_reaver_plaque' },

    // Shortcut levers (2)
    { x: 55, y: 240, type: 'shortcut_lever', walkable: false, interactionId: 'gilrhym_shortcut_lever_1' },
    { x: 200, y: 118, type: 'shortcut_lever', walkable: false, interactionId: 'gilrhym_shortcut_lever_2' },

    // Campfires (4)
    { x: 65, y: 260, type: 'campfire', walkable: false, interactionId: 'campfire' },
    { x: 235, y: 235, type: 'campfire', walkable: false, interactionId: 'campfire' },
    { x: 100, y: 175, type: 'campfire', walkable: false, interactionId: 'campfire' },
    { x: 35, y: 100, type: 'campfire', walkable: false, interactionId: 'campfire' },

    // Moonblooms (4)
    { x: 112, y: 255, type: 'moonbloom', walkable: true, interactionId: 'moonbloom_pickup' },
    { x: 225, y: 205, type: 'moonbloom', walkable: true, interactionId: 'moonbloom_pickup' },
    { x: 82, y: 140, type: 'moonbloom', walkable: true, interactionId: 'moonbloom_pickup' },
    { x: 250, y: 80, type: 'moonbloom', walkable: true, interactionId: 'moonbloom_pickup' },

    // Tempest grass (8)
    { x: 78, y: 275, type: 'tempest_grass', walkable: true, interactionId: 'tempest_grass_pickup' },
    { x: 210, y: 252, type: 'tempest_grass', walkable: true, interactionId: 'tempest_grass_pickup' },
    { x: 45, y: 215, type: 'tempest_grass', walkable: true, interactionId: 'tempest_grass_pickup' },
    { x: 245, y: 195, type: 'tempest_grass', walkable: true, interactionId: 'tempest_grass_pickup' },
    { x: 70, y: 150, type: 'tempest_grass', walkable: true, interactionId: 'tempest_grass_pickup' },
    { x: 255, y: 140, type: 'tempest_grass', walkable: true, interactionId: 'tempest_grass_pickup' },
    { x: 45, y: 80, type: 'tempest_grass', walkable: true, interactionId: 'tempest_grass_pickup' },
    { x: 230, y: 70, type: 'tempest_grass', walkable: true, interactionId: 'tempest_grass_pickup' },
  ],
  elevationZones: [
    // Zone D rooftop platforms
    { x: 42, y: 68, width: 24, height: 10, elevation: 1 },
    { x: 76, y: 65, width: 22, height: 12, elevation: 1 },
    { x: 96, y: 72, width: 20, height: 10, elevation: 1 },
    { x: 116, y: 65, width: 22, height: 12, elevation: 1 },
    { x: 164, y: 68, width: 22, height: 10, elevation: 1 },
    { x: 200, y: 65, width: 26, height: 12, elevation: 1 },
    { x: 236, y: 70, width: 20, height: 10, elevation: 1 },

    // Zone C watchtower elevation
    { x: 253, y: 128, width: 12, height: 12, elevation: 1 },

    // Zone D watchtower elevations
    { x: 26, y: 88, width: 12, height: 12, elevation: 1 },
    { x: 260, y: 83, width: 12, height: 12, elevation: 1 },

    // Zone E elevated cathedral flanks
    { x: 80, y: 18, width: 28, height: 18, elevation: 1 },
    { x: 195, y: 18, width: 28, height: 18, elevation: 1 },

    // Zone B cemetery rise
    { x: 228, y: 183, width: 34, height: 26, elevation: 1 },

    // Zone A cliff shelves
    { x: 5, y: 275, width: 25, height: 15, elevation: 1 },
    { x: 270, y: 278, width: 25, height: 12, elevation: 1 },

    // Additional rooftop elevation (Zone D upper)
    { x: 130, y: 62, width: 40, height: 8, elevation: 2 },
  ],
  stairways: [
    // Zone D rooftop access stairs
    { x: 48, y: 78, width: 4, height: 3, elevation: 1 },
    { x: 82, y: 77, width: 4, height: 3, elevation: 1 },
    { x: 102, y: 82, width: 4, height: 3, elevation: 1 },
    { x: 122, y: 77, width: 4, height: 3, elevation: 1 },
    { x: 170, y: 78, width: 4, height: 3, elevation: 1 },
    { x: 210, y: 77, width: 4, height: 3, elevation: 1 },
    { x: 242, y: 80, width: 4, height: 3, elevation: 1 },

    // Level 2 access
    { x: 145, y: 70, width: 4, height: 3, elevation: 2 },

    // Watchtower stairs
    { x: 258, y: 138, width: 3, height: 3, elevation: 1 },
    { x: 30, y: 98, width: 3, height: 3, elevation: 1 },
    { x: 265, y: 93, width: 3, height: 3, elevation: 1 },

    // Cathedral flank stairs
    { x: 95, y: 36, width: 4, height: 3, elevation: 1 },
    { x: 205, y: 36, width: 4, height: 3, elevation: 1 },

    // Cemetery stairs
    { x: 232, y: 208, width: 4, height: 3, elevation: 1 },

    // Cliff shelf stairs
    { x: 22, y: 275, width: 4, height: 3, elevation: 1 },
    { x: 268, y: 278, width: 4, height: 3, elevation: 1 },
  ],
  enemyZones: [
    // Zone A — Light enemies (outskirts)
    { x: 60, y: 255, width: 40, height: 25, enemyType: 'slime', count: 4 },
    { x: 200, y: 258, width: 35, height: 22, enemyType: 'slime', count: 3 },
    { x: 90, y: 270, width: 50, height: 15, enemyType: 'skeleton', count: 4 },
    { x: 170, y: 265, width: 40, height: 18, enemyType: 'skeleton', count: 3 },

    // Zone B — Outer districts (medium)
    { x: 50, y: 210, width: 50, height: 30, enemyType: 'skeleton', count: 5 },
    { x: 180, y: 210, width: 50, height: 30, enemyType: 'skeleton', count: 5 },
    { x: 225, y: 185, width: 35, height: 25, enemyType: 'skeleton', count: 6 },
    { x: 60, y: 195, width: 40, height: 20, enemyType: 'wolf', count: 4 },
    { x: 190, y: 195, width: 40, height: 20, enemyType: 'wolf', count: 4 },
    { x: 100, y: 220, width: 60, height: 20, enemyType: 'shadow_lurker', count: 3 },
    { x: 25, y: 195, width: 20, height: 20, enemyType: 'shadow', count: 3 },
    { x: 240, y: 210, width: 25, height: 20, enemyType: 'shadow', count: 2 },
    { x: 110, y: 195, width: 30, height: 20, enemyType: 'plant', count: 3 },
    { x: 160, y: 225, width: 25, height: 15, enemyType: 'plant', count: 2 },

    // Zone C — Market district (heavy)
    { x: 45, y: 130, width: 40, height: 30, enemyType: 'skeleton_captain', count: 2 },
    { x: 210, y: 130, width: 40, height: 30, enemyType: 'skeleton_captain', count: 2 },
    { x: 100, y: 140, width: 100, height: 30, enemyType: 'shadow', count: 8 },
    { x: 55, y: 160, width: 30, height: 15, enemyType: 'shadow', count: 3 },
    { x: 220, y: 155, width: 30, height: 15, enemyType: 'skeleton', count: 4 },
    { x: 30, y: 140, width: 20, height: 20, enemyType: 'plant', count: 3 },
    { x: 250, y: 125, width: 25, height: 20, enemyType: 'skeleton', count: 3 },
    { x: 90, y: 120, width: 30, height: 15, enemyType: 'shadow_lurker', count: 2 },

    // Zone D — Upper city / rooftops (heaviest)
    { x: 40, y: 85, width: 40, height: 30, enemyType: 'stone_sentinel', count: 2 },
    { x: 220, y: 80, width: 40, height: 25, enemyType: 'stone_sentinel', count: 2 },
    { x: 160, y: 90, width: 50, height: 25, enemyType: 'shadow_lurker', count: 5 },
    { x: 80, y: 70, width: 40, height: 20, enemyType: 'shadow_lurker', count: 4 },
    { x: 90, y: 95, width: 50, height: 20, enemyType: 'skeleton_captain', count: 3 },
    { x: 180, y: 65, width: 50, height: 25, enemyType: 'skeleton_captain', count: 2 },
    { x: 55, y: 100, width: 30, height: 15, enemyType: 'armored_wolf', count: 3 },
    { x: 200, y: 100, width: 35, height: 15, enemyType: 'armored_wolf', count: 2 },
    { x: 120, y: 62, width: 60, height: 15, enemyType: 'golem', count: 2 },
    { x: 240, y: 90, width: 20, height: 20, enemyType: 'shadow', count: 4 },
    { x: 40, y: 65, width: 25, height: 20, enemyType: 'shadow', count: 3 },
    { x: 130, y: 100, width: 40, height: 15, enemyType: 'skeleton', count: 4 },

    // Zone E — City center (boss approach)
    { x: 70, y: 30, width: 30, height: 20, enemyType: 'shadow', count: 5 },
    { x: 200, y: 30, width: 30, height: 20, enemyType: 'shadow', count: 5 },
    { x: 85, y: 40, width: 25, height: 15, enemyType: 'skeleton_captain', count: 2 },
    { x: 195, y: 40, width: 25, height: 15, enemyType: 'skeleton', count: 4 },
    { x: 45, y: 15, width: 20, height: 15, enemyType: 'skeleton', count: 3 },
    { x: 240, y: 15, width: 20, height: 15, enemyType: 'skeleton', count: 3 },
    { x: 110, y: 35, width: 80, height: 20, enemyType: 'shadow_lurker', count: 4 },

    // Boss — Cathedral plaza
    { x: 130, y: 18, width: 40, height: 20, enemyType: 'ashen_reaver', count: 1 },
  ],
  props: [
    // ============================================================
    // ZONE A — OUTSKIRTS PROPS (y: 240–290)
    // Victorian estate grounds: courtyards, iron railings, fountains
    // ============================================================

    // === OLIVER'S WALKWAY (y:271-275, just inside the gate) ===
    // Street lamps along the inner walkway
    { x: 132, y: 272, type: 'street_lamp', walkable: false },
    { x: 142, y: 272, type: 'street_lamp', walkable: false },
    { x: 155, y: 272, type: 'street_lamp', walkable: false },
    { x: 167, y: 272, type: 'street_lamp', walkable: false },
    // Iron railings along the walkway north edge
    { x: 130, y: 271, type: 'iron_railing', walkable: false },
    { x: 134, y: 271, type: 'iron_railing', walkable: false },
    { x: 138, y: 271, type: 'iron_railing', walkable: false },
    { x: 160, y: 271, type: 'iron_railing', walkable: false },
    { x: 164, y: 271, type: 'iron_railing', walkable: false },
    { x: 168, y: 271, type: 'iron_railing', walkable: false },
    // Wall torches on the gate posts
    { x: 140, y: 276, type: 'wall_torch', walkable: false },
    { x: 157, y: 276, type: 'wall_torch', walkable: false },
    { x: 140, y: 278, type: 'wall_torch', walkable: false },
    { x: 157, y: 278, type: 'wall_torch', walkable: false },
    // Benches on the walkway (Oliver slumped near one)
    { x: 144, y: 274, type: 'bench', walkable: false },
    { x: 152, y: 274, type: 'bench', walkable: false },
    // Battle debris around Oliver
    { x: 146, y: 273, type: 'bloodstain', walkable: true },
    { x: 150, y: 274, type: 'bones', walkable: true },
    { x: 145, y: 275, type: 'bones_pile', walkable: true },
    { x: 152, y: 273, type: 'bloodstain', walkable: true },
    // Barrel/crate supplies Oliver was carrying
    { x: 135, y: 273, type: 'barrel_stack', walkable: false },
    { x: 137, y: 273, type: 'crate_stack', walkable: false },
    { x: 160, y: 273, type: 'barrel', walkable: false },
    { x: 162, y: 273, type: 'crate', walkable: false },
    // Rubble from the gate battle
    { x: 133, y: 275, type: 'rubble', walkable: false },
    { x: 165, y: 275, type: 'rubble', walkable: false },

    // === GATE ENTRANCE AREA (y:276-290) ===
    // Gate post pillars (decorative tops)
    { x: 139, y: 275, type: 'pillar', walkable: false },
    { x: 160, y: 275, type: 'pillar', walkable: false },
    // Outer approach pillars
    { x: 140, y: 282, type: 'pillar', walkable: false },
    { x: 159, y: 282, type: 'pillar', walkable: false },
    { x: 140, y: 288, type: 'pillar', walkable: false },
    { x: 159, y: 288, type: 'pillar', walkable: false },
    // Gate street lamps (lining the entrance road)
    { x: 138, y: 280, type: 'street_lamp', walkable: false },
    { x: 162, y: 280, type: 'street_lamp', walkable: false },
    { x: 130, y: 276, type: 'street_lamp', walkable: false },
    { x: 170, y: 276, type: 'street_lamp', walkable: false },
    { x: 142, y: 286, type: 'street_lamp', walkable: false },
    { x: 156, y: 286, type: 'street_lamp', walkable: false },
    { x: 132, y: 284, type: 'street_lamp', walkable: false },
    { x: 166, y: 284, type: 'street_lamp', walkable: false },
    // Iron railings along the approach road
    { x: 130, y: 284, type: 'iron_railing', walkable: false },
    { x: 134, y: 284, type: 'iron_railing', walkable: false },
    { x: 164, y: 284, type: 'iron_railing', walkable: false },
    { x: 168, y: 284, type: 'iron_railing', walkable: false },
    { x: 130, y: 288, type: 'iron_railing', walkable: false },
    { x: 134, y: 288, type: 'iron_railing', walkable: false },
    { x: 164, y: 288, type: 'iron_railing', walkable: false },
    { x: 168, y: 288, type: 'iron_railing', walkable: false },
    // Overturned cart debris scattered across the entrance
    { x: 145, y: 287, type: 'barrel_stack', walkable: false },
    { x: 147, y: 287, type: 'crate_stack', walkable: false },
    { x: 152, y: 288, type: 'barrel', walkable: false },
    { x: 154, y: 288, type: 'crate', walkable: false },
    // Battle aftermath at the gate entrance
    { x: 148, y: 284, type: 'bones_pile', walkable: true },
    { x: 151, y: 286, type: 'bloodstain', walkable: true },
    { x: 144, y: 289, type: 'bones', walkable: true },
    { x: 155, y: 284, type: 'bloodstain', walkable: true },
    { x: 141, y: 285, type: 'bones', walkable: true },
    { x: 157, y: 289, type: 'bones_pile', walkable: true },
    // Rubble from the broken gate
    { x: 143, y: 282, type: 'rubble', walkable: false },
    { x: 156, y: 282, type: 'rubble', walkable: false },
    { x: 125, y: 284, type: 'rubble', walkable: false },
    { x: 165, y: 284, type: 'rubble', walkable: false },
    { x: 128, y: 282, type: 'rubble', walkable: false },
    { x: 168, y: 282, type: 'rubble', walkable: false },
    { x: 135, y: 286, type: 'rock', walkable: false },
    { x: 155, y: 286, type: 'rock', walkable: false },
    // Benches near the gate (waiting area)
    { x: 136, y: 284, type: 'bench', walkable: false },
    { x: 162, y: 284, type: 'bench', walkable: false },
    // Wall torches on the gate wall
    { x: 142, y: 276, type: 'wall_torch', walkable: false },
    { x: 154, y: 276, type: 'wall_torch', walkable: false },
    { x: 136, y: 276, type: 'wall_torch', walkable: false },
    { x: 162, y: 276, type: 'wall_torch', walkable: false },
    // Hanging sign (the Gilrhym plaque)
    { x: 148, y: 280, type: 'hanging_sign', walkable: false },

    // === BOULEVARD — Zone A section (y:244-280) ===
    // Street lamps along boulevard edges (every ~5 tiles)
    { x: 141, y: 270, type: 'street_lamp', walkable: false },
    { x: 158, y: 270, type: 'street_lamp', walkable: false },
    { x: 141, y: 264, type: 'street_lamp', walkable: false },
    { x: 158, y: 264, type: 'street_lamp', walkable: false },
    { x: 141, y: 258, type: 'street_lamp', walkable: false },
    { x: 158, y: 258, type: 'street_lamp', walkable: false },
    { x: 141, y: 252, type: 'street_lamp', walkable: false },
    { x: 158, y: 252, type: 'street_lamp', walkable: false },
    { x: 141, y: 246, type: 'street_lamp', walkable: false },
    { x: 158, y: 246, type: 'street_lamp', walkable: false },
    // Boulevard center benches (pairs along the median)
    { x: 148, y: 274, type: 'bench', walkable: false },
    { x: 148, y: 268, type: 'bench', walkable: false },
    { x: 148, y: 256, type: 'bench', walkable: false },
    { x: 148, y: 248, type: 'bench', walkable: false },
    // Sewer grates along boulevard
    { x: 146, y: 272, type: 'sewer_grate', walkable: true },
    { x: 150, y: 262, type: 'sewer_grate', walkable: true },
    { x: 146, y: 250, type: 'sewer_grate', walkable: true },
    // Boulevard edge iron railings (estate fences visible from road)
    { x: 139, y: 260, type: 'iron_railing', walkable: false },
    { x: 139, y: 268, type: 'iron_railing', walkable: false },
    { x: 139, y: 275, type: 'iron_railing', walkable: false },
    { x: 161, y: 260, type: 'iron_railing', walkable: false },
    { x: 161, y: 268, type: 'iron_railing', walkable: false },
    { x: 161, y: 275, type: 'iron_railing', walkable: false },
    // Battle debris on the boulevard
    { x: 144, y: 275, type: 'bones', walkable: true },
    { x: 153, y: 266, type: 'bloodstain', walkable: true },
    { x: 147, y: 258, type: 'bones_pile', walkable: true },
    { x: 155, y: 250, type: 'bloodstain', walkable: true },
    { x: 143, y: 248, type: 'bones', walkable: true },
    // Scattered debris on boulevard edges
    { x: 140, y: 272, type: 'barrel', walkable: false },
    { x: 159, y: 266, type: 'crate', walkable: false },
    { x: 140, y: 254, type: 'crate_stack', walkable: false },
    { x: 159, y: 248, type: 'barrel', walkable: false },

    // === WEST ESTATE COURTYARD (Oliver area) ===

    // Fountain at courtyard east garden
    { x: 118, y: 263, type: 'fountain', walkable: false },

    // Iron railings along north courtyard perimeter (dense, every 4 tiles)
    { x: 92, y: 255, type: 'iron_railing', walkable: false },
    { x: 96, y: 255, type: 'iron_railing', walkable: false },
    { x: 100, y: 255, type: 'iron_railing', walkable: false },
    { x: 104, y: 255, type: 'iron_railing', walkable: false },
    { x: 108, y: 255, type: 'iron_railing', walkable: false },
    { x: 116, y: 255, type: 'iron_railing', walkable: false },
    { x: 120, y: 255, type: 'iron_railing', walkable: false },
    { x: 124, y: 255, type: 'iron_railing', walkable: false },
    { x: 128, y: 255, type: 'iron_railing', walkable: false },
    { x: 132, y: 255, type: 'iron_railing', walkable: false },
    // West edge railings
    { x: 92, y: 259, type: 'iron_railing', walkable: false },
    { x: 92, y: 263, type: 'iron_railing', walkable: false },
    { x: 92, y: 267, type: 'iron_railing', walkable: false },
    { x: 92, y: 271, type: 'iron_railing', walkable: false },
    { x: 92, y: 275, type: 'iron_railing', walkable: false },
    // East edge railings
    { x: 135, y: 259, type: 'iron_railing', walkable: false },
    { x: 135, y: 263, type: 'iron_railing', walkable: false },
    { x: 135, y: 267, type: 'iron_railing', walkable: false },
    { x: 135, y: 271, type: 'iron_railing', walkable: false },
    { x: 135, y: 275, type: 'iron_railing', walkable: false },

    // Street lamps at courtyard corners and along paths
    { x: 93, y: 256, type: 'street_lamp', walkable: false },
    { x: 134, y: 256, type: 'street_lamp', walkable: false },
    { x: 93, y: 279, type: 'street_lamp', walkable: false },
    { x: 134, y: 279, type: 'street_lamp', walkable: false },
    { x: 111, y: 257, type: 'street_lamp', walkable: false },
    { x: 111, y: 271, type: 'street_lamp', walkable: false },
    { x: 111, y: 279, type: 'street_lamp', walkable: false },
    { x: 125, y: 264, type: 'street_lamp', walkable: false },

    // Benches around the garden bed and along paths
    { x: 114, y: 258, type: 'bench', walkable: false },
    { x: 120, y: 258, type: 'bench', walkable: false },
    { x: 114, y: 267, type: 'bench', walkable: false },
    { x: 120, y: 267, type: 'bench', walkable: false },
    { x: 100, y: 276, type: 'bench', walkable: false },
    { x: 108, y: 276, type: 'bench', walkable: false },
    { x: 125, y: 276, type: 'bench', walkable: false },
    { x: 132, y: 276, type: 'bench', walkable: false },

    // Pillars marking courtyard quadrant intersections
    { x: 110, y: 260, type: 'pillar', walkable: false },
    { x: 110, y: 271, type: 'pillar', walkable: false },
    { x: 124, y: 260, type: 'pillar', walkable: false },
    { x: 124, y: 271, type: 'pillar', walkable: false },

    // Wall torches on Oliver manor (all around it)
    { x: 96, y: 262, type: 'wall_torch', walkable: false },
    { x: 102, y: 262, type: 'wall_torch', walkable: false },
    { x: 108, y: 262, type: 'wall_torch', walkable: false },
    { x: 96, y: 270, type: 'wall_torch', walkable: false },
    { x: 108, y: 270, type: 'wall_torch', walkable: false },

    // Wall torches on guard house
    { x: 124, y: 270, type: 'wall_torch', walkable: false },
    { x: 130, y: 270, type: 'wall_torch', walkable: false },
    // Wall torches on servant quarters
    { x: 94, y: 274, type: 'wall_torch', walkable: false },
    { x: 102, y: 274, type: 'wall_torch', walkable: false },

    // Manor hanging signs
    { x: 100, y: 262, type: 'hanging_sign', walkable: false },
    { x: 106, y: 262, type: 'hanging_sign', walkable: false },
    // Awnings on manor front
    { x: 98, y: 262, type: 'awning', walkable: false },
    { x: 104, y: 262, type: 'awning', walkable: false },
    // Guard house hanging sign
    { x: 126, y: 270, type: 'hanging_sign', walkable: false },

    // Battle debris scattered through courtyard
    { x: 115, y: 265, type: 'bones', walkable: true },
    { x: 118, y: 268, type: 'bloodstain', walkable: true },
    { x: 98, y: 258, type: 'bones_pile', walkable: true },
    { x: 130, y: 262, type: 'bones', walkable: true },
    { x: 100, y: 268, type: 'bloodstain', walkable: true },
    { x: 122, y: 275, type: 'bones_pile', walkable: true },
    { x: 133, y: 268, type: 'bloodstain', walkable: true },
    { x: 96, y: 278, type: 'bones', walkable: true },

    // Barrel/crate stacks at estate corners and near buildings
    { x: 126, y: 265, type: 'barrel_stack', walkable: false },
    { x: 128, y: 265, type: 'crate_stack', walkable: false },
    { x: 93, y: 274, type: 'barrel', walkable: false },
    { x: 133, y: 274, type: 'crate', walkable: false },
    { x: 112, y: 274, type: 'barrel_stack', walkable: false },
    { x: 114, y: 274, type: 'crate_stack', walkable: false },
    { x: 132, y: 260, type: 'barrel', walkable: false },
    { x: 134, y: 260, type: 'crate', walkable: false },

    // Sewer grates in courtyard
    { x: 105, y: 266, type: 'sewer_grate', walkable: true },
    { x: 128, y: 272, type: 'sewer_grate', walkable: true },

    // Rubble at estate edges (battle damage)
    { x: 93, y: 268, type: 'rubble', walkable: false },
    { x: 133, y: 270, type: 'rubble', walkable: false },

    // Atrium garden props (north of manor)
    { x: 96, y: 250, type: 'bench', walkable: false },
    { x: 104, y: 250, type: 'bench', walkable: false },
    { x: 94, y: 248, type: 'pillar', walkable: false },
    { x: 110, y: 248, type: 'pillar', walkable: false },
    { x: 100, y: 248, type: 'street_lamp', walkable: false },
    { x: 106, y: 252, type: 'iron_railing', walkable: false },

    // Side garden props (NE corner)
    { x: 118, y: 246, type: 'bench', walkable: false },
    { x: 126, y: 246, type: 'bench', walkable: false },
    { x: 122, y: 244, type: 'pillar', walkable: false },
    { x: 130, y: 244, type: 'pillar', walkable: false },

    // === EAST ESTATE COURTYARD ===

    // Fountain at courtyard west garden
    { x: 180, y: 263, type: 'fountain', walkable: false },

    // Iron railings along north courtyard perimeter (dense)
    { x: 164, y: 255, type: 'iron_railing', walkable: false },
    { x: 168, y: 255, type: 'iron_railing', walkable: false },
    { x: 172, y: 255, type: 'iron_railing', walkable: false },
    { x: 176, y: 255, type: 'iron_railing', walkable: false },
    { x: 180, y: 255, type: 'iron_railing', walkable: false },
    { x: 184, y: 255, type: 'iron_railing', walkable: false },
    { x: 192, y: 255, type: 'iron_railing', walkable: false },
    { x: 196, y: 255, type: 'iron_railing', walkable: false },
    { x: 200, y: 255, type: 'iron_railing', walkable: false },
    { x: 204, y: 255, type: 'iron_railing', walkable: false },
    // West edge railings
    { x: 164, y: 259, type: 'iron_railing', walkable: false },
    { x: 164, y: 263, type: 'iron_railing', walkable: false },
    { x: 164, y: 267, type: 'iron_railing', walkable: false },
    { x: 164, y: 271, type: 'iron_railing', walkable: false },
    { x: 164, y: 275, type: 'iron_railing', walkable: false },
    // East edge railings
    { x: 207, y: 259, type: 'iron_railing', walkable: false },
    { x: 207, y: 263, type: 'iron_railing', walkable: false },
    { x: 207, y: 267, type: 'iron_railing', walkable: false },
    { x: 207, y: 271, type: 'iron_railing', walkable: false },
    { x: 207, y: 275, type: 'iron_railing', walkable: false },

    // Street lamps at courtyard corners and along paths
    { x: 165, y: 256, type: 'street_lamp', walkable: false },
    { x: 206, y: 256, type: 'street_lamp', walkable: false },
    { x: 165, y: 279, type: 'street_lamp', walkable: false },
    { x: 206, y: 279, type: 'street_lamp', walkable: false },
    { x: 187, y: 257, type: 'street_lamp', walkable: false },
    { x: 187, y: 271, type: 'street_lamp', walkable: false },
    { x: 187, y: 279, type: 'street_lamp', walkable: false },
    { x: 173, y: 264, type: 'street_lamp', walkable: false },

    // Benches around the garden bed and along paths
    { x: 178, y: 258, type: 'bench', walkable: false },
    { x: 184, y: 258, type: 'bench', walkable: false },
    { x: 178, y: 267, type: 'bench', walkable: false },
    { x: 184, y: 267, type: 'bench', walkable: false },
    { x: 170, y: 276, type: 'bench', walkable: false },
    { x: 178, y: 276, type: 'bench', walkable: false },
    { x: 196, y: 276, type: 'bench', walkable: false },
    { x: 204, y: 276, type: 'bench', walkable: false },

    // Pillars marking courtyard quadrant intersections
    { x: 176, y: 260, type: 'pillar', walkable: false },
    { x: 176, y: 271, type: 'pillar', walkable: false },
    { x: 188, y: 260, type: 'pillar', walkable: false },
    { x: 188, y: 271, type: 'pillar', walkable: false },

    // Wall torches on east manor (all around)
    { x: 190, y: 262, type: 'wall_torch', walkable: false },
    { x: 196, y: 262, type: 'wall_torch', walkable: false },
    { x: 202, y: 262, type: 'wall_torch', walkable: false },
    { x: 190, y: 270, type: 'wall_torch', walkable: false },
    { x: 202, y: 270, type: 'wall_torch', walkable: false },

    // Wall torches on guard house
    { x: 168, y: 270, type: 'wall_torch', walkable: false },
    { x: 174, y: 270, type: 'wall_torch', walkable: false },
    // Wall torches on stable
    { x: 196, y: 274, type: 'wall_torch', walkable: false },
    { x: 204, y: 274, type: 'wall_torch', walkable: false },

    // Manor hanging signs and awnings
    { x: 194, y: 262, type: 'hanging_sign', walkable: false },
    { x: 198, y: 262, type: 'hanging_sign', walkable: false },
    { x: 192, y: 262, type: 'awning', walkable: false },
    { x: 200, y: 262, type: 'awning', walkable: false },
    // Guard house hanging sign
    { x: 170, y: 270, type: 'hanging_sign', walkable: false },

    // Battle debris scattered through courtyard
    { x: 176, y: 258, type: 'bloodstain', walkable: true },
    { x: 182, y: 268, type: 'bones', walkable: true },
    { x: 200, y: 266, type: 'bones_pile', walkable: true },
    { x: 166, y: 262, type: 'bones', walkable: true },
    { x: 204, y: 268, type: 'bloodstain', walkable: true },
    { x: 174, y: 275, type: 'bones_pile', walkable: true },
    { x: 165, y: 268, type: 'bloodstain', walkable: true },
    { x: 200, y: 278, type: 'bones', walkable: true },

    // Barrel/crate stacks at estate corners and near buildings
    { x: 170, y: 265, type: 'barrel_stack', walkable: false },
    { x: 172, y: 265, type: 'crate_stack', walkable: false },
    { x: 165, y: 274, type: 'barrel', walkable: false },
    { x: 205, y: 274, type: 'crate', walkable: false },
    { x: 184, y: 274, type: 'barrel_stack', walkable: false },
    { x: 186, y: 274, type: 'crate_stack', walkable: false },
    { x: 166, y: 260, type: 'barrel', walkable: false },
    { x: 168, y: 260, type: 'crate', walkable: false },

    // Sewer grates in courtyard
    { x: 196, y: 266, type: 'sewer_grate', walkable: true },
    { x: 172, y: 272, type: 'sewer_grate', walkable: true },

    // Rubble at estate edges
    { x: 165, y: 268, type: 'rubble', walkable: false },
    { x: 205, y: 270, type: 'rubble', walkable: false },

    // Atrium garden props (north of manor)
    { x: 190, y: 250, type: 'bench', walkable: false },
    { x: 198, y: 250, type: 'bench', walkable: false },
    { x: 188, y: 248, type: 'pillar', walkable: false },
    { x: 204, y: 248, type: 'pillar', walkable: false },
    { x: 196, y: 248, type: 'street_lamp', walkable: false },
    { x: 194, y: 252, type: 'iron_railing', walkable: false },

    // Side garden props (NW corner)
    { x: 170, y: 246, type: 'bench', walkable: false },
    { x: 178, y: 246, type: 'bench', walkable: false },
    { x: 168, y: 244, type: 'pillar', walkable: false },
    { x: 180, y: 244, type: 'pillar', walkable: false },

    // === CENTRAL BOULEVARD PLAZA ===
    // Pillars at boulevard widening
    { x: 132, y: 248, type: 'pillar', walkable: false },
    { x: 168, y: 248, type: 'pillar', walkable: false },
    { x: 132, y: 254, type: 'pillar', walkable: false },
    { x: 168, y: 254, type: 'pillar', walkable: false },
    // Central plaza benches
    { x: 138, y: 250, type: 'bench', walkable: false },
    { x: 158, y: 250, type: 'bench', walkable: false },

    // === OUTSKIRTS EDGE ===
    // Scattered debris beyond the estates
    { x: 65, y: 270, type: 'bones_pile', walkable: true },
    { x: 68, y: 268, type: 'bloodstain', walkable: true },
    { x: 72, y: 280, type: 'rubble', walkable: false },
    { x: 212, y: 275, type: 'bones', walkable: true },
    { x: 216, y: 268, type: 'crate_stack', walkable: false },
    { x: 218, y: 268, type: 'barrel', walkable: false },
    { x: 55, y: 262, type: 'dead_tree', walkable: false },
    { x: 228, y: 265, type: 'dead_tree', walkable: false },
    { x: 48, y: 270, type: 'rubble', walkable: false },
    { x: 242, y: 272, type: 'rubble', walkable: false },
    { x: 35, y: 268, type: 'stump', walkable: false },
    { x: 255, y: 270, type: 'stump', walkable: false },
    { x: 74, y: 278, type: 'hanging_sign', walkable: false },
    { x: 214, y: 275, type: 'hanging_sign', walkable: false },
    { x: 32, y: 270, type: 'rock', walkable: false },
    { x: 262, y: 274, type: 'rock', walkable: false },
    { x: 38, y: 265, type: 'bones', walkable: true },
    { x: 256, y: 268, type: 'bones', walkable: true },

    // Wagon debris
    { x: 158, y: 254, type: 'barrel_stack', walkable: false },
    { x: 160, y: 256, type: 'crate_stack', walkable: false },
    { x: 84, y: 250, type: 'barrel', walkable: false },
    { x: 86, y: 252, type: 'crate', walkable: false },

    // ============================================================
    // ZONE B — OUTER DISTRICTS PROPS (y: 180–240)
    // Dark medieval decay: broken stalls, sewer grates, rubble
    // ============================================================

    // Cross street lamps
    { x: 65, y: 228, type: 'street_lamp', walkable: false },
    { x: 90, y: 228, type: 'street_lamp', walkable: false },
    { x: 120, y: 228, type: 'street_lamp', walkable: false },
    { x: 180, y: 228, type: 'street_lamp', walkable: false },
    { x: 210, y: 228, type: 'street_lamp', walkable: false },
    { x: 235, y: 228, type: 'street_lamp', walkable: false },
    { x: 85, y: 205, type: 'street_lamp', walkable: false },
    { x: 115, y: 205, type: 'street_lamp', walkable: false },
    { x: 185, y: 205, type: 'street_lamp', walkable: false },
    { x: 215, y: 205, type: 'street_lamp', walkable: false },

    // Side alley wall torches
    { x: 105, y: 215, type: 'wall_torch', walkable: false },
    { x: 105, y: 225, type: 'wall_torch', walkable: false },
    { x: 165, y: 215, type: 'wall_torch', walkable: false },
    { x: 165, y: 225, type: 'wall_torch', walkable: false },
    { x: 190, y: 205, type: 'wall_torch', walkable: false },
    { x: 190, y: 218, type: 'wall_torch', walkable: false },

    // Sewer grates at alley intersections
    { x: 107, y: 228, type: 'sewer_grate', walkable: true },
    { x: 167, y: 228, type: 'sewer_grate', walkable: true },
    { x: 107, y: 205, type: 'sewer_grate', walkable: true },
    { x: 192, y: 210, type: 'sewer_grate', walkable: true },

    // Broken stalls in side alleys
    { x: 108, y: 220, type: 'broken_stall', walkable: false },
    { x: 168, y: 218, type: 'broken_stall', walkable: false },
    { x: 60, y: 212, type: 'broken_stall', walkable: false },

    // West residential debris + rubble
    { x: 52, y: 220, type: 'barrel_stack', walkable: false },
    { x: 54, y: 220, type: 'crate_stack', walkable: false },
    { x: 68, y: 225, type: 'bench', walkable: false },
    { x: 82, y: 218, type: 'rubble', walkable: false },
    { x: 84, y: 218, type: 'rubble', walkable: false },
    { x: 56, y: 235, type: 'bones', walkable: true },
    { x: 70, y: 232, type: 'bloodstain', walkable: true },
    { x: 62, y: 200, type: 'bench', walkable: false },
    { x: 78, y: 198, type: 'barrel', walkable: false },
    { x: 92, y: 200, type: 'crate', walkable: false },

    // Iron railings along elevated walkways
    { x: 55, y: 210, type: 'iron_railing', walkable: false },
    { x: 88, y: 212, type: 'iron_railing', walkable: false },
    { x: 195, y: 210, type: 'iron_railing', walkable: false },
    { x: 225, y: 212, type: 'iron_railing', walkable: false },

    // East residential debris
    { x: 198, y: 220, type: 'barrel', walkable: false },
    { x: 200, y: 220, type: 'crate_stack', walkable: false },
    { x: 215, y: 225, type: 'bench', walkable: false },
    { x: 208, y: 200, type: 'rubble', walkable: false },
    { x: 210, y: 200, type: 'crate', walkable: false },
    { x: 225, y: 218, type: 'bench', walkable: false },

    // Hanging signs on manor buildings
    { x: 57, y: 218, type: 'hanging_sign', walkable: false },
    { x: 72, y: 221, type: 'hanging_sign', walkable: false },
    { x: 197, y: 218, type: 'hanging_sign', walkable: false },
    { x: 212, y: 221, type: 'hanging_sign', walkable: false },

    // Cemetery props
    { x: 232, y: 190, type: 'dead_tree', walkable: false },
    { x: 240, y: 188, type: 'dead_tree', walkable: false },
    { x: 250, y: 192, type: 'dead_tree', walkable: false },
    { x: 235, y: 195, type: 'bones_pile', walkable: true },
    { x: 242, y: 198, type: 'bones', walkable: true },
    { x: 238, y: 202, type: 'bloodstain', walkable: true },
    { x: 248, y: 200, type: 'bones_pile', walkable: true },
    { x: 230, y: 208, type: 'bones', walkable: true },
    { x: 245, y: 205, type: 'bloodstain', walkable: true },
    { x: 237, y: 186, type: 'iron_railing', walkable: false },
    { x: 255, y: 188, type: 'iron_railing', walkable: false },

    // Collapsed west block — heavy rubble
    { x: 28, y: 198, type: 'rubble', walkable: false },
    { x: 32, y: 202, type: 'rubble', walkable: false },
    { x: 35, y: 195, type: 'barrel', walkable: false },
    { x: 40, y: 200, type: 'bones', walkable: true },
    { x: 22, y: 220, type: 'bones_pile', walkable: true },
    { x: 28, y: 218, type: 'bloodstain', walkable: true },
    { x: 30, y: 225, type: 'rubble', walkable: false },

    // Courtyard center
    { x: 125, y: 215, type: 'bench', walkable: false },
    { x: 135, y: 215, type: 'bench', walkable: false },
    { x: 130, y: 222, type: 'street_lamp', walkable: false },

    // District edge walls
    { x: 22, y: 190, type: 'rock', walkable: false },
    { x: 22, y: 210, type: 'rock', walkable: false },
    { x: 22, y: 230, type: 'rock', walkable: false },
    { x: 262, y: 190, type: 'rock', walkable: false },
    { x: 262, y: 210, type: 'rock', walkable: false },
    { x: 262, y: 230, type: 'rock', walkable: false },

    // ============================================================
    // ZONE C — MARKET DISTRICT PROPS (y: 120–180)
    // Steampunk grandeur: awnings, fountains, pillars, intact lamps
    // ============================================================

    // Market plaza street lamps (grandeur style)
    { x: 112, y: 142, type: 'street_lamp', walkable: false },
    { x: 188, y: 142, type: 'street_lamp', walkable: false },
    { x: 112, y: 166, type: 'street_lamp', walkable: false },
    { x: 188, y: 166, type: 'street_lamp', walkable: false },
    { x: 130, y: 140, type: 'street_lamp', walkable: false },
    { x: 170, y: 140, type: 'street_lamp', walkable: false },

    // Fountain at market plaza center
    { x: 150, y: 154, type: 'fountain', walkable: false },

    // Cross street lamps
    { x: 65, y: 158, type: 'street_lamp', walkable: false },
    { x: 100, y: 158, type: 'street_lamp', walkable: false },
    { x: 200, y: 158, type: 'street_lamp', walkable: false },
    { x: 235, y: 158, type: 'street_lamp', walkable: false },
    { x: 75, y: 135, type: 'street_lamp', walkable: false },
    { x: 105, y: 135, type: 'street_lamp', walkable: false },
    { x: 195, y: 135, type: 'street_lamp', walkable: false },
    { x: 225, y: 135, type: 'street_lamp', walkable: false },

    // Awnings along stall rows
    { x: 126, y: 149, type: 'awning', walkable: false },
    { x: 138, y: 149, type: 'awning', walkable: false },
    { x: 155, y: 149, type: 'awning', walkable: false },
    { x: 167, y: 149, type: 'awning', walkable: false },

    // Market stall debris with stacked goods
    { x: 120, y: 152, type: 'crate_stack', walkable: false },
    { x: 122, y: 152, type: 'barrel_stack', walkable: false },
    { x: 160, y: 152, type: 'barrel_stack', walkable: false },
    { x: 162, y: 152, type: 'crate_stack', walkable: false },
    { x: 175, y: 155, type: 'barrel', walkable: false },
    { x: 135, y: 155, type: 'barrel', walkable: false },
    { x: 140, y: 160, type: 'crate', walkable: false },
    { x: 158, y: 160, type: 'crate', walkable: false },

    // Market benches
    { x: 115, y: 145, type: 'bench', walkable: false },
    { x: 185, y: 145, type: 'bench', walkable: false },
    { x: 130, y: 162, type: 'bench', walkable: false },
    { x: 168, y: 162, type: 'bench', walkable: false },

    // Pillars flanking church entrance
    { x: 128, y: 172, type: 'pillar', walkable: false },
    { x: 148, y: 172, type: 'pillar', walkable: false },
    { x: 132, y: 180, type: 'bones', walkable: true },
    { x: 142, y: 178, type: 'bloodstain', walkable: true },

    // Hanging signs on shop fronts
    { x: 47, y: 148, type: 'hanging_sign', walkable: false },
    { x: 47, y: 133, type: 'hanging_sign', walkable: false },
    { x: 32, y: 143, type: 'hanging_sign', walkable: false },
    { x: 212, y: 148, type: 'hanging_sign', walkable: false },
    { x: 227, y: 145, type: 'hanging_sign', walkable: false },
    { x: 242, y: 138, type: 'hanging_sign', walkable: false },
    { x: 72, y: 145, type: 'hanging_sign', walkable: false },
    { x: 62, y: 123, type: 'hanging_sign', walkable: false },

    // West shop area
    { x: 42, y: 148, type: 'barrel_stack', walkable: false },
    { x: 44, y: 148, type: 'crate_stack', walkable: false },
    { x: 42, y: 135, type: 'barrel', walkable: false },
    { x: 28, y: 142, type: 'bench', walkable: false },
    { x: 52, y: 162, type: 'bench', walkable: false },
    { x: 32, y: 160, type: 'barrel', walkable: false },
    { x: 34, y: 160, type: 'crate', walkable: false },
    { x: 58, y: 122, type: 'barrel', walkable: false },
    { x: 60, y: 122, type: 'crate', walkable: false },

    // East shop area
    { x: 208, y: 148, type: 'barrel', walkable: false },
    { x: 210, y: 148, type: 'crate', walkable: false },
    { x: 222, y: 145, type: 'bench', walkable: false },
    { x: 238, y: 138, type: 'barrel_stack', walkable: false },
    { x: 240, y: 138, type: 'crate_stack', walkable: false },
    { x: 225, y: 162, type: 'bench', walkable: false },
    { x: 242, y: 155, type: 'barrel', walkable: false },
    { x: 244, y: 155, type: 'crate', walkable: false },

    // Alley details — wall torches + sewer grates
    { x: 86, y: 135, type: 'wall_torch', walkable: false },
    { x: 86, y: 145, type: 'sewer_grate', walkable: true },
    { x: 86, y: 155, type: 'wall_torch', walkable: false },
    { x: 200, y: 132, type: 'wall_torch', walkable: false },
    { x: 200, y: 142, type: 'sewer_grate', walkable: true },
    { x: 200, y: 155, type: 'wall_torch', walkable: false },

    // Small plazas
    { x: 97, y: 164, type: 'bench', walkable: false },
    { x: 100, y: 166, type: 'street_lamp', walkable: false },
    { x: 198, y: 162, type: 'bench', walkable: false },
    { x: 202, y: 164, type: 'street_lamp', walkable: false },

    // Garden area
    { x: 28, y: 128, type: 'bench', walkable: false },
    { x: 35, y: 130, type: 'stump', walkable: false },
    { x: 22, y: 125, type: 'pillar', walkable: false },

    // Iron fence wall street lamps
    { x: 22, y: 130, type: 'street_lamp', walkable: false },
    { x: 22, y: 150, type: 'street_lamp', walkable: false },
    { x: 22, y: 170, type: 'street_lamp', walkable: false },
    { x: 268, y: 130, type: 'street_lamp', walkable: false },
    { x: 268, y: 150, type: 'street_lamp', walkable: false },
    { x: 268, y: 170, type: 'street_lamp', walkable: false },

    // ============================================================
    // ZONE D — UPPER CITY / ROOFTOP PROPS (y: 60–120)
    // Dark medieval rooftops: chimneys, iron railings, wall torches
    // ============================================================

    // Alley wall torches (dense grid — replaces lanterns)
    { x: 52, y: 70, type: 'wall_torch', walkable: false },
    { x: 52, y: 85, type: 'wall_torch', walkable: false },
    { x: 52, y: 100, type: 'wall_torch', walkable: false },
    { x: 70, y: 70, type: 'wall_torch', walkable: false },
    { x: 70, y: 85, type: 'wall_torch', walkable: false },
    { x: 70, y: 100, type: 'wall_torch', walkable: false },
    { x: 88, y: 72, type: 'wall_torch', walkable: false },
    { x: 88, y: 88, type: 'wall_torch', walkable: false },
    { x: 88, y: 104, type: 'wall_torch', walkable: false },
    { x: 108, y: 70, type: 'wall_torch', walkable: false },
    { x: 108, y: 85, type: 'wall_torch', walkable: false },
    { x: 108, y: 100, type: 'wall_torch', walkable: false },
    { x: 128, y: 72, type: 'wall_torch', walkable: false },
    { x: 128, y: 88, type: 'wall_torch', walkable: false },
    { x: 128, y: 104, type: 'wall_torch', walkable: false },
    { x: 160, y: 70, type: 'wall_torch', walkable: false },
    { x: 160, y: 85, type: 'wall_torch', walkable: false },
    { x: 160, y: 100, type: 'wall_torch', walkable: false },
    { x: 178, y: 70, type: 'wall_torch', walkable: false },
    { x: 178, y: 85, type: 'wall_torch', walkable: false },
    { x: 178, y: 100, type: 'wall_torch', walkable: false },
    { x: 195, y: 70, type: 'wall_torch', walkable: false },
    { x: 195, y: 85, type: 'wall_torch', walkable: false },
    { x: 195, y: 100, type: 'wall_torch', walkable: false },
    { x: 213, y: 70, type: 'wall_torch', walkable: false },
    { x: 213, y: 85, type: 'wall_torch', walkable: false },
    { x: 213, y: 100, type: 'wall_torch', walkable: false },
    { x: 235, y: 72, type: 'wall_torch', walkable: false },
    { x: 235, y: 88, type: 'wall_torch', walkable: false },
    { x: 235, y: 104, type: 'wall_torch', walkable: false },
    { x: 252, y: 75, type: 'wall_torch', walkable: false },
    { x: 252, y: 90, type: 'wall_torch', walkable: false },
    { x: 252, y: 105, type: 'wall_torch', walkable: false },

    // Alley debris with rubble (dense, decayed)
    { x: 55, y: 95, type: 'rubble', walkable: false },
    { x: 57, y: 95, type: 'crate_stack', walkable: false },
    { x: 62, y: 80, type: 'bones', walkable: true },
    { x: 65, y: 92, type: 'bloodstain', walkable: true },
    { x: 73, y: 75, type: 'rubble', walkable: false },
    { x: 75, y: 75, type: 'crate', walkable: false },
    { x: 80, y: 95, type: 'bones_pile', walkable: true },
    { x: 85, y: 82, type: 'bloodstain', walkable: true },
    { x: 92, y: 90, type: 'rubble', walkable: false },
    { x: 94, y: 90, type: 'barrel', walkable: false },
    { x: 100, y: 100, type: 'bones', walkable: true },
    { x: 105, y: 75, type: 'bloodstain', walkable: true },
    { x: 110, y: 95, type: 'barrel', walkable: false },
    { x: 112, y: 95, type: 'rubble', walkable: false },
    { x: 120, y: 80, type: 'bones_pile', walkable: true },
    { x: 125, y: 92, type: 'bloodstain', walkable: true },
    { x: 132, y: 85, type: 'rubble', walkable: false },
    { x: 134, y: 85, type: 'crate', walkable: false },

    // East side alley debris
    { x: 168, y: 95, type: 'rubble', walkable: false },
    { x: 170, y: 95, type: 'crate', walkable: false },
    { x: 175, y: 78, type: 'bones', walkable: true },
    { x: 180, y: 92, type: 'bloodstain', walkable: true },
    { x: 185, y: 72, type: 'barrel', walkable: false },
    { x: 187, y: 72, type: 'rubble', walkable: false },
    { x: 192, y: 88, type: 'bones_pile', walkable: true },
    { x: 198, y: 80, type: 'bloodstain', walkable: true },
    { x: 203, y: 98, type: 'rubble', walkable: false },
    { x: 205, y: 98, type: 'crate', walkable: false },
    { x: 210, y: 75, type: 'bones', walkable: true },
    { x: 215, y: 90, type: 'bloodstain', walkable: true },
    { x: 220, y: 78, type: 'barrel', walkable: false },
    { x: 222, y: 78, type: 'rubble', walkable: false },
    { x: 228, y: 95, type: 'bones_pile', walkable: true },
    { x: 232, y: 82, type: 'bloodstain', walkable: true },
    { x: 240, y: 90, type: 'rubble', walkable: false },
    { x: 242, y: 90, type: 'barrel', walkable: false },
    { x: 250, y: 80, type: 'bones', walkable: true },
    { x: 258, y: 95, type: 'bones_pile', walkable: true },

    // Sewer grates at alley intersections
    { x: 54, y: 96, type: 'sewer_grate', walkable: true },
    { x: 72, y: 78, type: 'sewer_grate', walkable: true },
    { x: 110, y: 96, type: 'sewer_grate', walkable: true },
    { x: 162, y: 96, type: 'sewer_grate', walkable: true },
    { x: 197, y: 78, type: 'sewer_grate', walkable: true },
    { x: 237, y: 96, type: 'sewer_grate', walkable: true },

    // Scythe courtyard detail
    { x: 142, y: 88, type: 'bones_pile', walkable: true },
    { x: 156, y: 92, type: 'bloodstain', walkable: true },
    { x: 138, y: 95, type: 'street_lamp', walkable: false },
    { x: 162, y: 95, type: 'street_lamp', walkable: false },
    { x: 148, y: 86, type: 'bloodstain', walkable: true },
    { x: 140, y: 92, type: 'pillar', walkable: false },
    { x: 158, y: 92, type: 'pillar', walkable: false },

    // Cross street debris
    { x: 50, y: 96, type: 'bones', walkable: true },
    { x: 80, y: 78, type: 'rubble', walkable: false },
    { x: 120, y: 96, type: 'crate', walkable: false },
    { x: 170, y: 96, type: 'bones', walkable: true },
    { x: 220, y: 78, type: 'rubble', walkable: false },
    { x: 250, y: 96, type: 'crate', walkable: false },

    // Chimneys on rooftop elevation zones
    { x: 50, y: 72, type: 'chimney', walkable: false },
    { x: 60, y: 71, type: 'chimney', walkable: false },
    { x: 85, y: 69, type: 'chimney', walkable: false },
    { x: 93, y: 69, type: 'chimney', walkable: false },
    { x: 103, y: 75, type: 'chimney', walkable: false },
    { x: 125, y: 69, type: 'chimney', walkable: false },
    { x: 133, y: 69, type: 'chimney', walkable: false },
    { x: 172, y: 71, type: 'chimney', walkable: false },
    { x: 180, y: 71, type: 'chimney', walkable: false },
    { x: 210, y: 69, type: 'chimney', walkable: false },
    { x: 220, y: 69, type: 'chimney', walkable: false },
    { x: 244, y: 73, type: 'chimney', walkable: false },
    { x: 250, y: 73, type: 'chimney', walkable: false },

    // Iron railings along rooftop edges
    { x: 46, y: 75, type: 'iron_railing', walkable: false },
    { x: 62, y: 75, type: 'iron_railing', walkable: false },
    { x: 81, y: 73, type: 'iron_railing', walkable: false },
    { x: 95, y: 73, type: 'iron_railing', walkable: false },
    { x: 101, y: 79, type: 'iron_railing', walkable: false },
    { x: 113, y: 79, type: 'iron_railing', walkable: false },
    { x: 117, y: 73, type: 'iron_railing', walkable: false },
    { x: 135, y: 73, type: 'iron_railing', walkable: false },
    { x: 165, y: 75, type: 'iron_railing', walkable: false },
    { x: 183, y: 75, type: 'iron_railing', walkable: false },
    { x: 206, y: 73, type: 'iron_railing', walkable: false },
    { x: 222, y: 73, type: 'iron_railing', walkable: false },
    { x: 241, y: 77, type: 'iron_railing', walkable: false },
    { x: 253, y: 77, type: 'iron_railing', walkable: false },

    // Crate stacks on rooftop platforms
    { x: 48, y: 72, type: 'crate_stack', walkable: false },
    { x: 58, y: 72, type: 'barrel_stack', walkable: false },
    { x: 83, y: 70, type: 'crate_stack', walkable: false },
    { x: 90, y: 70, type: 'bones', walkable: true },
    { x: 123, y: 70, type: 'crate_stack', walkable: false },
    { x: 130, y: 70, type: 'barrel_stack', walkable: false },
    { x: 218, y: 70, type: 'crate_stack', walkable: false },

    // Wall section street lamps
    { x: 22, y: 65, type: 'street_lamp', walkable: false },
    { x: 22, y: 80, type: 'street_lamp', walkable: false },
    { x: 22, y: 95, type: 'street_lamp', walkable: false },
    { x: 22, y: 110, type: 'street_lamp', walkable: false },
    { x: 273, y: 65, type: 'street_lamp', walkable: false },
    { x: 273, y: 80, type: 'street_lamp', walkable: false },
    { x: 273, y: 95, type: 'street_lamp', walkable: false },
    { x: 273, y: 110, type: 'street_lamp', walkable: false },

    // ============================================================
    // ZONE E — CITY CENTER / BOSS PROPS (y: 10–60)
    // Corrupted grandeur: pillars, heavy rubble, bones
    // ============================================================

    // Cathedral plaza street lamps
    { x: 112, y: 28, type: 'street_lamp', walkable: false },
    { x: 188, y: 28, type: 'street_lamp', walkable: false },
    { x: 112, y: 48, type: 'street_lamp', walkable: false },
    { x: 188, y: 48, type: 'street_lamp', walkable: false },
    { x: 130, y: 22, type: 'street_lamp', walkable: false },
    { x: 170, y: 22, type: 'street_lamp', walkable: false },
    { x: 130, y: 42, type: 'street_lamp', walkable: false },
    { x: 170, y: 42, type: 'street_lamp', walkable: false },

    // Pillars flanking cathedral approach
    { x: 118, y: 30, type: 'pillar', walkable: false },
    { x: 182, y: 30, type: 'pillar', walkable: false },
    { x: 118, y: 45, type: 'pillar', walkable: false },
    { x: 182, y: 45, type: 'pillar', walkable: false },
    { x: 128, y: 17, type: 'pillar', walkable: false },
    { x: 172, y: 17, type: 'pillar', walkable: false },

    // Corrupted fountain in cathedral plaza
    { x: 150, y: 35, type: 'fountain', walkable: false },

    // Approach corridor — heavy rubble and bones
    { x: 105, y: 52, type: 'rubble', walkable: false },
    { x: 108, y: 54, type: 'bones_pile', walkable: true },
    { x: 192, y: 52, type: 'rubble', walkable: false },
    { x: 195, y: 54, type: 'bones_pile', walkable: true },
    { x: 115, y: 48, type: 'bones', walkable: true },
    { x: 185, y: 48, type: 'bones', walkable: true },
    { x: 110, y: 50, type: 'rubble', walkable: false },
    { x: 190, y: 50, type: 'rubble', walkable: false },

    // Boss arena area — dense bloodstains and bones
    { x: 128, y: 18, type: 'bloodstain', walkable: true },
    { x: 172, y: 18, type: 'bloodstain', walkable: true },
    { x: 130, y: 38, type: 'bones_pile', walkable: true },
    { x: 170, y: 38, type: 'bones_pile', walkable: true },
    { x: 135, y: 15, type: 'bloodstain', walkable: true },
    { x: 165, y: 15, type: 'bloodstain', walkable: true },
    { x: 140, y: 20, type: 'bones_pile', walkable: true },
    { x: 160, y: 20, type: 'bones_pile', walkable: true },
    { x: 145, y: 35, type: 'bones', walkable: true },
    { x: 155, y: 35, type: 'bones', walkable: true },

    // Corrupted ruin props
    { x: 88, y: 22, type: 'rubble', walkable: false },
    { x: 92, y: 28, type: 'rubble', walkable: false },
    { x: 95, y: 24, type: 'dead_tree', walkable: false },
    { x: 202, y: 22, type: 'rubble', walkable: false },
    { x: 208, y: 28, type: 'rubble', walkable: false },
    { x: 212, y: 24, type: 'dead_tree', walkable: false },

    // Destroyed flanking areas
    { x: 82, y: 42, type: 'rubble', walkable: false },
    { x: 84, y: 42, type: 'crate_stack', walkable: false },
    { x: 88, y: 45, type: 'bones', walkable: true },
    { x: 212, y: 42, type: 'rubble', walkable: false },
    { x: 214, y: 42, type: 'barrel_stack', walkable: false },
    { x: 218, y: 45, type: 'bones', walkable: true },

    // Graveyard flanks
    { x: 48, y: 18, type: 'dead_tree', walkable: false },
    { x: 52, y: 22, type: 'bones', walkable: true },
    { x: 55, y: 20, type: 'bones_pile', walkable: true },
    { x: 248, y: 18, type: 'dead_tree', walkable: false },
    { x: 252, y: 22, type: 'bones', walkable: true },
    { x: 255, y: 20, type: 'bones_pile', walkable: true },
    { x: 46, y: 16, type: 'iron_railing', walkable: false },
    { x: 56, y: 16, type: 'iron_railing', walkable: false },
    { x: 246, y: 16, type: 'iron_railing', walkable: false },
    { x: 256, y: 16, type: 'iron_railing', walkable: false },

    // Approach alley details
    { x: 65, y: 36, type: 'rubble', walkable: false },
    { x: 67, y: 36, type: 'crate', walkable: false },
    { x: 70, y: 38, type: 'bones', walkable: true },
    { x: 232, y: 36, type: 'rubble', walkable: false },
    { x: 234, y: 36, type: 'barrel', walkable: false },
    { x: 230, y: 38, type: 'bones', walkable: true },

    // Northern wall street lamps
    { x: 40, y: 10, type: 'street_lamp', walkable: false },
    { x: 80, y: 10, type: 'street_lamp', walkable: false },
    { x: 120, y: 10, type: 'street_lamp', walkable: false },
    { x: 180, y: 10, type: 'street_lamp', walkable: false },
    { x: 220, y: 10, type: 'street_lamp', walkable: false },
    { x: 260, y: 10, type: 'street_lamp', walkable: false },

    // Eastern/western wall street lamps
    { x: 22, y: 15, type: 'street_lamp', walkable: false },
    { x: 22, y: 30, type: 'street_lamp', walkable: false },
    { x: 22, y: 45, type: 'street_lamp', walkable: false },
    { x: 276, y: 15, type: 'street_lamp', walkable: false },
    { x: 276, y: 30, type: 'street_lamp', walkable: false },
    { x: 276, y: 45, type: 'street_lamp', walkable: false },

    // Cathedral building surroundings
    { x: 62, y: 28, type: 'bench', walkable: false },
    { x: 232, y: 28, type: 'bench', walkable: false },
    { x: 68, y: 45, type: 'rubble', walkable: false },
    { x: 228, y: 45, type: 'rubble', walkable: false },

    // ============================================================
    // GATE DETAIL PROPS — visual detail at zone boundary gates
    // ============================================================

    // Gate 1 (y:238) — City wall gatehouse
    { x: 136, y: 238, type: 'street_lamp', walkable: false },
    { x: 162, y: 238, type: 'street_lamp', walkable: false },
    { x: 136, y: 242, type: 'pillar', walkable: false },
    { x: 162, y: 242, type: 'pillar', walkable: false },
    { x: 130, y: 239, type: 'rubble', walkable: false },
    { x: 168, y: 239, type: 'rubble', walkable: false },
    { x: 132, y: 240, type: 'bones', walkable: true },
    { x: 166, y: 240, type: 'bones', walkable: true },

    // Gate 2 (y:178) — Iron fence market entrance
    { x: 136, y: 178, type: 'street_lamp', walkable: false },
    { x: 162, y: 178, type: 'street_lamp', walkable: false },
    { x: 136, y: 182, type: 'iron_railing', walkable: false },
    { x: 162, y: 182, type: 'iron_railing', walkable: false },
    { x: 130, y: 179, type: 'iron_railing', walkable: false },
    { x: 168, y: 179, type: 'iron_railing', walkable: false },

    // Gate 3 (y:118) — Dense upper city squeeze
    { x: 138, y: 118, type: 'wall_torch', walkable: false },
    { x: 160, y: 118, type: 'wall_torch', walkable: false },
    { x: 134, y: 119, type: 'rubble', walkable: false },
    { x: 164, y: 119, type: 'rubble', walkable: false },
    { x: 132, y: 120, type: 'crate_stack', walkable: false },
    { x: 166, y: 120, type: 'barrel_stack', walkable: false },

    // Gate 4 (y:55) — Rubble barrier to cathedral
    { x: 140, y: 55, type: 'wall_torch', walkable: false },
    { x: 158, y: 55, type: 'wall_torch', walkable: false },
    { x: 136, y: 56, type: 'rubble', walkable: false },
    { x: 162, y: 56, type: 'rubble', walkable: false },
    { x: 134, y: 57, type: 'bones_pile', walkable: true },
    { x: 164, y: 57, type: 'bloodstain', walkable: true },

    // ============================================================
    // BUILDING-EDGE CHIMNEYS — along wall faces visible from streets
    // ============================================================

    // Zone B wall edges (y:185 top, y:238 bottom)
    { x: 30, y: 186, type: 'chimney', walkable: false },
    { x: 50, y: 186, type: 'chimney', walkable: false },
    { x: 75, y: 186, type: 'chimney', walkable: false },
    { x: 115, y: 186, type: 'chimney', walkable: false },
    { x: 170, y: 186, type: 'chimney', walkable: false },
    { x: 200, y: 186, type: 'chimney', walkable: false },
    { x: 230, y: 186, type: 'chimney', walkable: false },
    { x: 260, y: 186, type: 'chimney', walkable: false },
    { x: 40, y: 237, type: 'chimney', walkable: false },
    { x: 80, y: 237, type: 'chimney', walkable: false },
    { x: 120, y: 237, type: 'chimney', walkable: false },
    { x: 180, y: 237, type: 'chimney', walkable: false },
    { x: 220, y: 237, type: 'chimney', walkable: false },
    { x: 255, y: 237, type: 'chimney', walkable: false },

    // Zone C wall edges
    { x: 30, y: 123, type: 'chimney', walkable: false },
    { x: 55, y: 123, type: 'chimney', walkable: false },
    { x: 80, y: 123, type: 'chimney', walkable: false },
    { x: 205, y: 123, type: 'chimney', walkable: false },
    { x: 235, y: 123, type: 'chimney', walkable: false },
    { x: 260, y: 123, type: 'chimney', walkable: false },

    // Zone D wall edges
    { x: 30, y: 63, type: 'chimney', walkable: false },
    { x: 55, y: 63, type: 'chimney', walkable: false },
    { x: 80, y: 63, type: 'chimney', walkable: false },
    { x: 110, y: 63, type: 'chimney', walkable: false },
    { x: 170, y: 63, type: 'chimney', walkable: false },
    { x: 200, y: 63, type: 'chimney', walkable: false },
    { x: 235, y: 63, type: 'chimney', walkable: false },
    { x: 260, y: 63, type: 'chimney', walkable: false },

    // ============================================================
    // BOULEVARD DETAIL — props along the main boulevard (x:139-161)
    // The boulevard is the player's primary path through ALL zones.
    // ============================================================

    // --- Boulevard Zone B section (y:185-238) ---
    // Wall torches on building faces (every ~8 tiles)
    { x: 139, y: 190, type: 'wall_torch', walkable: false },
    { x: 161, y: 190, type: 'wall_torch', walkable: false },
    { x: 139, y: 198, type: 'wall_torch', walkable: false },
    { x: 161, y: 198, type: 'wall_torch', walkable: false },
    { x: 139, y: 210, type: 'wall_torch', walkable: false },
    { x: 161, y: 210, type: 'wall_torch', walkable: false },
    { x: 139, y: 220, type: 'wall_torch', walkable: false },
    { x: 161, y: 220, type: 'wall_torch', walkable: false },
    { x: 139, y: 232, type: 'wall_torch', walkable: false },
    { x: 161, y: 232, type: 'wall_torch', walkable: false },
    // Street lamps (every ~6 tiles, edge of boulevard)
    { x: 141, y: 235, type: 'street_lamp', walkable: false },
    { x: 158, y: 235, type: 'street_lamp', walkable: false },
    { x: 141, y: 222, type: 'street_lamp', walkable: false },
    { x: 158, y: 222, type: 'street_lamp', walkable: false },
    { x: 141, y: 210, type: 'street_lamp', walkable: false },
    { x: 158, y: 210, type: 'street_lamp', walkable: false },
    { x: 141, y: 198, type: 'street_lamp', walkable: false },
    { x: 158, y: 198, type: 'street_lamp', walkable: false },
    { x: 141, y: 188, type: 'street_lamp', walkable: false },
    { x: 158, y: 188, type: 'street_lamp', walkable: false },
    // Awnings on building faces
    { x: 139, y: 194, type: 'awning', walkable: false },
    { x: 161, y: 194, type: 'awning', walkable: false },
    { x: 139, y: 206, type: 'awning', walkable: false },
    { x: 161, y: 206, type: 'awning', walkable: false },
    { x: 139, y: 218, type: 'awning', walkable: false },
    { x: 161, y: 218, type: 'awning', walkable: false },
    { x: 139, y: 230, type: 'awning', walkable: false },
    { x: 161, y: 230, type: 'awning', walkable: false },
    // Center boulevard benches (every ~8 tiles)
    { x: 148, y: 236, type: 'bench', walkable: false },
    { x: 148, y: 224, type: 'bench', walkable: false },
    { x: 148, y: 214, type: 'bench', walkable: false },
    { x: 148, y: 202, type: 'bench', walkable: false },
    { x: 148, y: 192, type: 'bench', walkable: false },
    // Iron railings along boulevard walls
    { x: 139, y: 192, type: 'iron_railing', walkable: false },
    { x: 139, y: 204, type: 'iron_railing', walkable: false },
    { x: 139, y: 216, type: 'iron_railing', walkable: false },
    { x: 139, y: 228, type: 'iron_railing', walkable: false },
    { x: 161, y: 192, type: 'iron_railing', walkable: false },
    { x: 161, y: 204, type: 'iron_railing', walkable: false },
    { x: 161, y: 216, type: 'iron_railing', walkable: false },
    { x: 161, y: 228, type: 'iron_railing', walkable: false },
    // Sewer grates on boulevard
    { x: 150, y: 230, type: 'sewer_grate', walkable: true },
    { x: 146, y: 218, type: 'sewer_grate', walkable: true },
    { x: 150, y: 200, type: 'sewer_grate', walkable: true },
    // Battle debris on boulevard
    { x: 145, y: 234, type: 'bones', walkable: true },
    { x: 153, y: 226, type: 'bloodstain', walkable: true },
    { x: 143, y: 212, type: 'bones_pile', walkable: true },
    { x: 155, y: 204, type: 'bloodstain', walkable: true },
    { x: 147, y: 194, type: 'bones', walkable: true },
    // Hanging signs on boulevard building faces
    { x: 139, y: 196, type: 'hanging_sign', walkable: false },
    { x: 161, y: 196, type: 'hanging_sign', walkable: false },
    { x: 139, y: 212, type: 'hanging_sign', walkable: false },
    { x: 161, y: 212, type: 'hanging_sign', walkable: false },
    { x: 139, y: 226, type: 'hanging_sign', walkable: false },
    { x: 161, y: 226, type: 'hanging_sign', walkable: false },
    // Clutter at boulevard/cross-street intersections
    { x: 140, y: 229, type: 'barrel_stack', walkable: false },
    { x: 159, y: 229, type: 'crate_stack', walkable: false },
    { x: 140, y: 206, type: 'crate', walkable: false },
    { x: 159, y: 206, type: 'barrel', walkable: false },
    { x: 140, y: 189, type: 'barrel', walkable: false },
    { x: 159, y: 189, type: 'crate', walkable: false },

    // --- Boulevard Zone C section (y:118-178) ---
    // Wall torches (denser in market)
    { x: 139, y: 125, type: 'wall_torch', walkable: false },
    { x: 161, y: 125, type: 'wall_torch', walkable: false },
    { x: 139, y: 135, type: 'wall_torch', walkable: false },
    { x: 161, y: 135, type: 'wall_torch', walkable: false },
    { x: 139, y: 145, type: 'wall_torch', walkable: false },
    { x: 161, y: 145, type: 'wall_torch', walkable: false },
    { x: 139, y: 155, type: 'wall_torch', walkable: false },
    { x: 161, y: 155, type: 'wall_torch', walkable: false },
    { x: 139, y: 168, type: 'wall_torch', walkable: false },
    { x: 161, y: 168, type: 'wall_torch', walkable: false },
    { x: 139, y: 175, type: 'wall_torch', walkable: false },
    { x: 161, y: 175, type: 'wall_torch', walkable: false },
    // Street lamps
    { x: 141, y: 175, type: 'street_lamp', walkable: false },
    { x: 158, y: 175, type: 'street_lamp', walkable: false },
    { x: 141, y: 165, type: 'street_lamp', walkable: false },
    { x: 158, y: 165, type: 'street_lamp', walkable: false },
    { x: 141, y: 155, type: 'street_lamp', walkable: false },
    { x: 158, y: 155, type: 'street_lamp', walkable: false },
    { x: 141, y: 145, type: 'street_lamp', walkable: false },
    { x: 158, y: 145, type: 'street_lamp', walkable: false },
    { x: 141, y: 135, type: 'street_lamp', walkable: false },
    { x: 158, y: 135, type: 'street_lamp', walkable: false },
    { x: 141, y: 125, type: 'street_lamp', walkable: false },
    { x: 158, y: 125, type: 'street_lamp', walkable: false },
    { x: 141, y: 120, type: 'street_lamp', walkable: false },
    { x: 158, y: 120, type: 'street_lamp', walkable: false },
    // Awnings (market = more awnings)
    { x: 139, y: 128, type: 'awning', walkable: false },
    { x: 161, y: 128, type: 'awning', walkable: false },
    { x: 139, y: 138, type: 'awning', walkable: false },
    { x: 161, y: 138, type: 'awning', walkable: false },
    { x: 139, y: 148, type: 'awning', walkable: false },
    { x: 161, y: 148, type: 'awning', walkable: false },
    { x: 139, y: 158, type: 'awning', walkable: false },
    { x: 161, y: 158, type: 'awning', walkable: false },
    { x: 139, y: 170, type: 'awning', walkable: false },
    { x: 161, y: 170, type: 'awning', walkable: false },
    // Hanging signs (densest in market)
    { x: 139, y: 130, type: 'hanging_sign', walkable: false },
    { x: 161, y: 130, type: 'hanging_sign', walkable: false },
    { x: 139, y: 142, type: 'hanging_sign', walkable: false },
    { x: 161, y: 142, type: 'hanging_sign', walkable: false },
    { x: 139, y: 152, type: 'hanging_sign', walkable: false },
    { x: 161, y: 152, type: 'hanging_sign', walkable: false },
    { x: 139, y: 162, type: 'hanging_sign', walkable: false },
    { x: 161, y: 162, type: 'hanging_sign', walkable: false },
    { x: 139, y: 172, type: 'hanging_sign', walkable: false },
    { x: 161, y: 172, type: 'hanging_sign', walkable: false },
    // Center boulevard benches
    { x: 148, y: 172, type: 'bench', walkable: false },
    { x: 148, y: 160, type: 'bench', walkable: false },
    { x: 148, y: 148, type: 'bench', walkable: false },
    { x: 148, y: 136, type: 'bench', walkable: false },
    { x: 148, y: 122, type: 'bench', walkable: false },
    // Iron railings along boulevard walls
    { x: 139, y: 132, type: 'iron_railing', walkable: false },
    { x: 139, y: 150, type: 'iron_railing', walkable: false },
    { x: 139, y: 164, type: 'iron_railing', walkable: false },
    { x: 161, y: 132, type: 'iron_railing', walkable: false },
    { x: 161, y: 150, type: 'iron_railing', walkable: false },
    { x: 161, y: 164, type: 'iron_railing', walkable: false },
    // Sewer grates
    { x: 150, y: 170, type: 'sewer_grate', walkable: true },
    { x: 146, y: 152, type: 'sewer_grate', walkable: true },
    { x: 150, y: 130, type: 'sewer_grate', walkable: true },
    // Market clutter on boulevard
    { x: 140, y: 159, type: 'crate_stack', walkable: false },
    { x: 159, y: 159, type: 'barrel_stack', walkable: false },
    { x: 140, y: 136, type: 'barrel', walkable: false },
    { x: 159, y: 136, type: 'crate', walkable: false },
    { x: 140, y: 126, type: 'barrel_stack', walkable: false },
    { x: 159, y: 126, type: 'crate_stack', walkable: false },

    // --- Boulevard Zone D section (y:55-118) ---
    // Wall torches (densest zone — every ~5 tiles)
    { x: 139, y: 65, type: 'wall_torch', walkable: false },
    { x: 161, y: 65, type: 'wall_torch', walkable: false },
    { x: 139, y: 72, type: 'wall_torch', walkable: false },
    { x: 161, y: 72, type: 'wall_torch', walkable: false },
    { x: 139, y: 80, type: 'wall_torch', walkable: false },
    { x: 161, y: 80, type: 'wall_torch', walkable: false },
    { x: 139, y: 88, type: 'wall_torch', walkable: false },
    { x: 161, y: 88, type: 'wall_torch', walkable: false },
    { x: 139, y: 96, type: 'wall_torch', walkable: false },
    { x: 161, y: 96, type: 'wall_torch', walkable: false },
    { x: 139, y: 104, type: 'wall_torch', walkable: false },
    { x: 161, y: 104, type: 'wall_torch', walkable: false },
    { x: 139, y: 112, type: 'wall_torch', walkable: false },
    { x: 161, y: 112, type: 'wall_torch', walkable: false },
    // Street lamps
    { x: 141, y: 115, type: 'street_lamp', walkable: false },
    { x: 158, y: 115, type: 'street_lamp', walkable: false },
    { x: 141, y: 105, type: 'street_lamp', walkable: false },
    { x: 158, y: 105, type: 'street_lamp', walkable: false },
    { x: 141, y: 92, type: 'street_lamp', walkable: false },
    { x: 158, y: 92, type: 'street_lamp', walkable: false },
    { x: 141, y: 80, type: 'street_lamp', walkable: false },
    { x: 158, y: 80, type: 'street_lamp', walkable: false },
    { x: 141, y: 68, type: 'street_lamp', walkable: false },
    { x: 158, y: 68, type: 'street_lamp', walkable: false },
    { x: 141, y: 58, type: 'street_lamp', walkable: false },
    { x: 158, y: 58, type: 'street_lamp', walkable: false },
    // Hanging signs (grim, ominous)
    { x: 139, y: 68, type: 'hanging_sign', walkable: false },
    { x: 161, y: 68, type: 'hanging_sign', walkable: false },
    { x: 139, y: 82, type: 'hanging_sign', walkable: false },
    { x: 161, y: 82, type: 'hanging_sign', walkable: false },
    { x: 139, y: 98, type: 'hanging_sign', walkable: false },
    { x: 161, y: 98, type: 'hanging_sign', walkable: false },
    { x: 139, y: 110, type: 'hanging_sign', walkable: false },
    { x: 161, y: 110, type: 'hanging_sign', walkable: false },
    // Clutter / barricades
    { x: 140, y: 112, type: 'rubble', walkable: false },
    { x: 159, y: 112, type: 'rubble', walkable: false },
    { x: 140, y: 96, type: 'barrel', walkable: false },
    { x: 159, y: 96, type: 'crate', walkable: false },
    { x: 140, y: 78, type: 'crate_stack', walkable: false },
    { x: 159, y: 78, type: 'barrel_stack', walkable: false },
    { x: 140, y: 62, type: 'rubble', walkable: false },
    { x: 159, y: 62, type: 'rubble', walkable: false },
    // Dense boulevard debris
    { x: 145, y: 110, type: 'bones', walkable: true },
    { x: 153, y: 100, type: 'bloodstain', walkable: true },
    { x: 147, y: 88, type: 'bones_pile', walkable: true },
    { x: 155, y: 76, type: 'bloodstain', walkable: true },
    { x: 143, y: 66, type: 'bones', walkable: true },
    { x: 151, y: 60, type: 'bones_pile', walkable: true },
    // Sewer grates
    { x: 150, y: 108, type: 'sewer_grate', walkable: true },
    { x: 146, y: 90, type: 'sewer_grate', walkable: true },
    { x: 150, y: 72, type: 'sewer_grate', walkable: true },

    // --- Boulevard Zone E section (y:10-55) ---
    // Street lamps (grand approach spacing)
    { x: 141, y: 52, type: 'street_lamp', walkable: false },
    { x: 158, y: 52, type: 'street_lamp', walkable: false },
    { x: 141, y: 44, type: 'street_lamp', walkable: false },
    { x: 158, y: 44, type: 'street_lamp', walkable: false },
    { x: 141, y: 36, type: 'street_lamp', walkable: false },
    { x: 158, y: 36, type: 'street_lamp', walkable: false },
    { x: 141, y: 28, type: 'street_lamp', walkable: false },
    { x: 158, y: 28, type: 'street_lamp', walkable: false },
    { x: 141, y: 18, type: 'street_lamp', walkable: false },
    { x: 158, y: 18, type: 'street_lamp', walkable: false },
    // Pillars along the approach (grand colonnade)
    { x: 140, y: 50, type: 'pillar', walkable: false },
    { x: 159, y: 50, type: 'pillar', walkable: false },
    { x: 140, y: 42, type: 'pillar', walkable: false },
    { x: 159, y: 42, type: 'pillar', walkable: false },
    { x: 140, y: 34, type: 'pillar', walkable: false },
    { x: 159, y: 34, type: 'pillar', walkable: false },
    { x: 140, y: 26, type: 'pillar', walkable: false },
    { x: 159, y: 26, type: 'pillar', walkable: false },
    // Boulevard debris (heaviest near boss)
    { x: 145, y: 50, type: 'bones_pile', walkable: true },
    { x: 153, y: 46, type: 'bloodstain', walkable: true },
    { x: 147, y: 40, type: 'bones', walkable: true },
    { x: 155, y: 34, type: 'bloodstain', walkable: true },
    { x: 143, y: 28, type: 'bones_pile', walkable: true },
    { x: 151, y: 22, type: 'bones', walkable: true },
    { x: 148, y: 16, type: 'bloodstain', walkable: true },
    // Rubble approaching boss
    { x: 140, y: 48, type: 'rubble', walkable: false },
    { x: 159, y: 48, type: 'rubble', walkable: false },
    { x: 140, y: 38, type: 'rubble', walkable: false },
    { x: 159, y: 38, type: 'rubble', walkable: false },
    { x: 140, y: 30, type: 'rubble', walkable: false },
    { x: 159, y: 30, type: 'rubble', walkable: false },

    // --- Cross-street intersection clutter (map edges) ---
    { x: 24, y: 229, type: 'crate_stack', walkable: false },
    { x: 26, y: 229, type: 'barrel', walkable: false },
    { x: 270, y: 229, type: 'barrel_stack', walkable: false },
    { x: 272, y: 229, type: 'crate', walkable: false },
    { x: 24, y: 206, type: 'barrel', walkable: false },
    { x: 270, y: 206, type: 'crate', walkable: false },
    { x: 24, y: 159, type: 'crate_stack', walkable: false },
    { x: 270, y: 159, type: 'barrel_stack', walkable: false },
    { x: 24, y: 136, type: 'barrel', walkable: false },
    { x: 270, y: 136, type: 'crate', walkable: false },

    // --- Hanging signs at alley/cross-street junctions ---
    { x: 105, y: 229, type: 'hanging_sign', walkable: false },
    { x: 172, y: 229, type: 'hanging_sign', walkable: false },
    { x: 194, y: 229, type: 'hanging_sign', walkable: false },
    { x: 105, y: 206, type: 'hanging_sign', walkable: false },
    { x: 172, y: 206, type: 'hanging_sign', walkable: false },
    { x: 86, y: 136, type: 'hanging_sign', walkable: false },
    { x: 200, y: 136, type: 'hanging_sign', walkable: false },

    // ============================================================
    // DENSITY PASS — Additional props across all zones
    // ============================================================

    // --- Zone A density ---
    // West outskirts cottage detail
    { x: 37, y: 263, type: 'hanging_sign', walkable: false },
    { x: 52, y: 268, type: 'hanging_sign', walkable: false },
    { x: 40, y: 265, type: 'barrel', walkable: false },
    { x: 42, y: 265, type: 'crate', walkable: false },
    { x: 55, y: 270, type: 'bench', walkable: false },
    { x: 48, y: 262, type: 'street_lamp', walkable: false },
    { x: 60, y: 270, type: 'street_lamp', walkable: false },
    { x: 38, y: 270, type: 'rubble', walkable: false },
    { x: 45, y: 275, type: 'bones', walkable: true },
    { x: 50, y: 278, type: 'bloodstain', walkable: true },
    // East outskirts cottage detail
    { x: 242, y: 263, type: 'hanging_sign', walkable: false },
    { x: 257, y: 268, type: 'hanging_sign', walkable: false },
    { x: 245, y: 265, type: 'barrel', walkable: false },
    { x: 247, y: 265, type: 'crate', walkable: false },
    { x: 252, y: 270, type: 'bench', walkable: false },
    { x: 238, y: 262, type: 'street_lamp', walkable: false },
    { x: 260, y: 262, type: 'street_lamp', walkable: false },
    { x: 250, y: 274, type: 'rubble', walkable: false },
    { x: 248, y: 276, type: 'bones', walkable: true },
    // South approach plaza detail
    { x: 112, y: 286, type: 'street_lamp', walkable: false },
    { x: 124, y: 286, type: 'street_lamp', walkable: false },
    { x: 170, y: 286, type: 'street_lamp', walkable: false },
    { x: 182, y: 286, type: 'street_lamp', walkable: false },
    { x: 116, y: 285, type: 'bench', walkable: false },
    { x: 174, y: 285, type: 'bench', walkable: false },
    // More iron railings along the approach
    { x: 90, y: 269, type: 'iron_railing', walkable: false },
    { x: 136, y: 269, type: 'iron_railing', walkable: false },
    { x: 164, y: 269, type: 'iron_railing', walkable: false },
    { x: 208, y: 269, type: 'iron_railing', walkable: false },

    // --- Zone B density ---
    // y:188 cross street detail (currently sparse)
    { x: 50, y: 188, type: 'street_lamp', walkable: false },
    { x: 75, y: 188, type: 'street_lamp', walkable: false },
    { x: 115, y: 188, type: 'street_lamp', walkable: false },
    { x: 185, y: 188, type: 'street_lamp', walkable: false },
    { x: 215, y: 188, type: 'street_lamp', walkable: false },
    { x: 245, y: 188, type: 'street_lamp', walkable: false },
    // Alley wall torches at y:188 intersections
    { x: 105, y: 190, type: 'wall_torch', walkable: false },
    { x: 172, y: 190, type: 'wall_torch', walkable: false },
    { x: 194, y: 190, type: 'wall_torch', walkable: false },
    // More broken stalls in residential alleys
    { x: 42, y: 232, type: 'broken_stall', walkable: false },
    { x: 242, y: 232, type: 'broken_stall', walkable: false },
    { x: 42, y: 202, type: 'broken_stall', walkable: false },
    { x: 242, y: 202, type: 'broken_stall', walkable: false },
    // More sewer grates on residential streets
    { x: 60, y: 229, type: 'sewer_grate', walkable: true },
    { x: 230, y: 229, type: 'sewer_grate', walkable: true },
    { x: 80, y: 206, type: 'sewer_grate', walkable: true },
    { x: 220, y: 206, type: 'sewer_grate', walkable: true },
    { x: 65, y: 189, type: 'sewer_grate', walkable: true },
    { x: 235, y: 189, type: 'sewer_grate', walkable: true },
    // More iron railings near buildings
    { x: 53, y: 212, type: 'iron_railing', walkable: false },
    { x: 68, y: 215, type: 'iron_railing', walkable: false },
    { x: 83, y: 212, type: 'iron_railing', walkable: false },
    { x: 193, y: 212, type: 'iron_railing', walkable: false },
    { x: 208, y: 215, type: 'iron_railing', walkable: false },
    { x: 226, y: 209, type: 'iron_railing', walkable: false },
    // More hanging signs on buildings
    { x: 57, y: 200, type: 'hanging_sign', walkable: false },
    { x: 87, y: 218, type: 'hanging_sign', walkable: false },
    { x: 92, y: 198, type: 'hanging_sign', walkable: false },
    { x: 197, y: 200, type: 'hanging_sign', walkable: false },
    { x: 230, y: 215, type: 'hanging_sign', walkable: false },
    // More awnings on residential buildings
    { x: 57, y: 216, type: 'awning', walkable: false },
    { x: 72, y: 219, type: 'awning', walkable: false },
    { x: 87, y: 216, type: 'awning', walkable: false },
    { x: 197, y: 216, type: 'awning', walkable: false },
    { x: 212, y: 219, type: 'awning', walkable: false },
    // Fountain at central courtyard
    { x: 130, y: 218, type: 'fountain', walkable: false },
    // More residential debris
    { x: 114, y: 220, type: 'barrel_stack', walkable: false },
    { x: 116, y: 220, type: 'crate', walkable: false },
    { x: 164, y: 232, type: 'barrel', walkable: false },
    { x: 166, y: 232, type: 'crate_stack', walkable: false },
    { x: 110, y: 198, type: 'bones', walkable: true },
    { x: 174, y: 200, type: 'bloodstain', walkable: true },
    { x: 45, y: 190, type: 'rubble', walkable: false },
    { x: 250, y: 192, type: 'rubble', walkable: false },
    // More benches
    { x: 60, y: 229, type: 'bench', walkable: false },
    { x: 80, y: 206, type: 'bench', walkable: false },
    { x: 220, y: 229, type: 'bench', walkable: false },
    { x: 240, y: 206, type: 'bench', walkable: false },

    // --- Zone C density ---
    // More street lamps on y:125 street
    { x: 75, y: 125, type: 'street_lamp', walkable: false },
    { x: 105, y: 125, type: 'street_lamp', walkable: false },
    { x: 195, y: 125, type: 'street_lamp', walkable: false },
    { x: 225, y: 125, type: 'street_lamp', walkable: false },
    // More broken stalls near market
    { x: 115, y: 155, type: 'broken_stall', walkable: false },
    { x: 175, y: 155, type: 'broken_stall', walkable: false },
    { x: 90, y: 148, type: 'broken_stall', walkable: false },
    { x: 200, y: 148, type: 'broken_stall', walkable: false },
    // More hanging signs on extra shops
    { x: 32, y: 128, type: 'hanging_sign', walkable: false },
    { x: 57, y: 151, type: 'hanging_sign', walkable: false },
    { x: 32, y: 158, type: 'hanging_sign', walkable: false },
    { x: 62, y: 138, type: 'hanging_sign', walkable: false },
    { x: 227, y: 128, type: 'hanging_sign', walkable: false },
    { x: 212, y: 161, type: 'hanging_sign', walkable: false },
    { x: 242, y: 151, type: 'hanging_sign', walkable: false },
    { x: 257, y: 148, type: 'hanging_sign', walkable: false },
    // More awnings on shop buildings
    { x: 47, y: 146, type: 'awning', walkable: false },
    { x: 32, y: 141, type: 'awning', walkable: false },
    { x: 57, y: 161, type: 'awning', walkable: false },
    { x: 212, y: 146, type: 'awning', walkable: false },
    { x: 227, y: 143, type: 'awning', walkable: false },
    { x: 247, y: 153, type: 'awning', walkable: false },
    // More iron railings in market district
    { x: 110, y: 138, type: 'iron_railing', walkable: false },
    { x: 190, y: 138, type: 'iron_railing', walkable: false },
    { x: 110, y: 168, type: 'iron_railing', walkable: false },
    { x: 190, y: 168, type: 'iron_railing', walkable: false },
    // More crate/barrel clutter near shops
    { x: 32, y: 128, type: 'barrel', walkable: false },
    { x: 34, y: 128, type: 'crate', walkable: false },
    { x: 55, y: 165, type: 'barrel_stack', walkable: false },
    { x: 57, y: 165, type: 'crate_stack', walkable: false },
    { x: 237, y: 128, type: 'barrel', walkable: false },
    { x: 239, y: 128, type: 'crate', walkable: false },
    { x: 230, y: 165, type: 'barrel_stack', walkable: false },
    { x: 232, y: 165, type: 'crate_stack', walkable: false },
    // More wall torches in alleys
    { x: 86, y: 128, type: 'wall_torch', walkable: false },
    { x: 86, y: 165, type: 'wall_torch', walkable: false },
    { x: 200, y: 128, type: 'wall_torch', walkable: false },
    { x: 200, y: 165, type: 'wall_torch', walkable: false },
    // More benches in market area
    { x: 92, y: 136, type: 'bench', walkable: false },
    { x: 92, y: 159, type: 'bench', walkable: false },
    { x: 200, y: 136, type: 'bench', walkable: false },
    { x: 200, y: 159, type: 'bench', walkable: false },
    // Church area detail
    { x: 120, y: 175, type: 'pillar', walkable: false },
    { x: 155, y: 175, type: 'pillar', walkable: false },
    { x: 125, y: 178, type: 'bones_pile', walkable: true },
    { x: 148, y: 176, type: 'bones', walkable: true },
    // More sewer grates
    { x: 86, y: 125, type: 'sewer_grate', walkable: true },
    { x: 200, y: 125, type: 'sewer_grate', walkable: true },
    { x: 150, y: 158, type: 'sewer_grate', walkable: true },

    // --- Zone D density ---
    // More hanging signs in alleys
    { x: 52, y: 68, type: 'hanging_sign', walkable: false },
    { x: 70, y: 78, type: 'hanging_sign', walkable: false },
    { x: 88, y: 68, type: 'hanging_sign', walkable: false },
    { x: 108, y: 78, type: 'hanging_sign', walkable: false },
    { x: 128, y: 68, type: 'hanging_sign', walkable: false },
    { x: 163, y: 68, type: 'hanging_sign', walkable: false },
    { x: 178, y: 78, type: 'hanging_sign', walkable: false },
    { x: 195, y: 68, type: 'hanging_sign', walkable: false },
    { x: 213, y: 78, type: 'hanging_sign', walkable: false },
    { x: 235, y: 68, type: 'hanging_sign', walkable: false },
    { x: 252, y: 78, type: 'hanging_sign', walkable: false },
    // More broken stalls blocking alleys
    { x: 55, y: 88, type: 'broken_stall', walkable: false },
    { x: 73, y: 92, type: 'broken_stall', walkable: false },
    { x: 112, y: 88, type: 'broken_stall', walkable: false },
    { x: 168, y: 88, type: 'broken_stall', walkable: false },
    { x: 200, y: 92, type: 'broken_stall', walkable: false },
    { x: 238, y: 88, type: 'broken_stall', walkable: false },
    // More barrel/crate stacks in alleys
    { x: 54, y: 78, type: 'barrel_stack', walkable: false },
    { x: 90, y: 96, type: 'crate_stack', walkable: false },
    { x: 130, y: 78, type: 'barrel', walkable: false },
    { x: 165, y: 96, type: 'crate_stack', walkable: false },
    { x: 198, y: 78, type: 'barrel_stack', walkable: false },
    { x: 240, y: 96, type: 'barrel', walkable: false },
    // More awnings in upper city
    { x: 42, y: 102, type: 'awning', walkable: false },
    { x: 60, y: 74, type: 'awning', walkable: false },
    { x: 97, y: 107, type: 'awning', walkable: false },
    { x: 117, y: 102, type: 'awning', walkable: false },
    { x: 167, y: 102, type: 'awning', walkable: false },
    { x: 184, y: 100, type: 'awning', walkable: false },
    { x: 220, y: 102, type: 'awning', walkable: false },
    { x: 240, y: 97, type: 'awning', walkable: false },
    // More street lamps at alley intersections
    { x: 50, y: 112, type: 'street_lamp', walkable: false },
    { x: 68, y: 112, type: 'street_lamp', walkable: false },
    { x: 86, y: 112, type: 'street_lamp', walkable: false },
    { x: 106, y: 112, type: 'street_lamp', walkable: false },
    { x: 126, y: 112, type: 'street_lamp', walkable: false },
    { x: 163, y: 112, type: 'street_lamp', walkable: false },
    { x: 193, y: 112, type: 'street_lamp', walkable: false },
    { x: 211, y: 112, type: 'street_lamp', walkable: false },
    { x: 233, y: 112, type: 'street_lamp', walkable: false },
    { x: 250, y: 112, type: 'street_lamp', walkable: false },

    // --- Zone E density ---
    // More pillars along the approach
    { x: 112, y: 38, type: 'pillar', walkable: false },
    { x: 188, y: 38, type: 'pillar', walkable: false },
    { x: 120, y: 50, type: 'pillar', walkable: false },
    { x: 180, y: 50, type: 'pillar', walkable: false },
    // More iron railings near graveyards
    { x: 32, y: 20, type: 'iron_railing', walkable: false },
    { x: 40, y: 20, type: 'iron_railing', walkable: false },
    { x: 262, y: 20, type: 'iron_railing', walkable: false },
    { x: 270, y: 20, type: 'iron_railing', walkable: false },
    // More rubble along the approach
    { x: 75, y: 35, type: 'rubble', walkable: false },
    { x: 78, y: 32, type: 'crate_stack', walkable: false },
    { x: 220, y: 35, type: 'rubble', walkable: false },
    { x: 222, y: 32, type: 'barrel_stack', walkable: false },
    // More bones in cathedral area
    { x: 72, y: 25, type: 'bones', walkable: true },
    { x: 75, y: 28, type: 'bones_pile', walkable: true },
    { x: 222, y: 25, type: 'bones', walkable: true },
    { x: 225, y: 28, type: 'bones_pile', walkable: true },
    // More dead trees near graveyards
    { x: 35, y: 15, type: 'dead_tree', walkable: false },
    { x: 42, y: 24, type: 'dead_tree', walkable: false },
    { x: 258, y: 15, type: 'dead_tree', walkable: false },
    { x: 265, y: 24, type: 'dead_tree', walkable: false },
    // Approach corridor awnings
    { x: 72, y: 42, type: 'awning', walkable: false },
    { x: 227, y: 42, type: 'awning', walkable: false },
    // More benches along cathedral plaza
    { x: 115, y: 32, type: 'bench', walkable: false },
    { x: 185, y: 32, type: 'bench', walkable: false },
    { x: 115, y: 45, type: 'bench', walkable: false },
    { x: 185, y: 45, type: 'bench', walkable: false },
    // More bloodstains in approach
    { x: 120, y: 52, type: 'bloodstain', walkable: true },
    { x: 180, y: 52, type: 'bloodstain', walkable: true },
    { x: 140, y: 48, type: 'bones', walkable: true },
    { x: 160, y: 48, type: 'bones_pile', walkable: true },

    // ============================================================
    // DETAIL PASS 2 — Zone identity reinforcement props
    // ============================================================

    // --- Zone A: Rural outskirts feel ---
    // Tree stumps and rocks (overgrown edges)
    { x: 28, y: 275, type: 'stump', walkable: false },
    { x: 22, y: 270, type: 'stump', walkable: false },
    { x: 270, y: 275, type: 'stump', walkable: false },
    { x: 265, y: 282, type: 'stump', walkable: false },
    { x: 80, y: 284, type: 'rock', walkable: false },
    { x: 215, y: 284, type: 'rock', walkable: false },
    // Scattered rural debris along grass patches
    { x: 32, y: 268, type: 'barrel', walkable: false },
    { x: 264, y: 270, type: 'barrel', walkable: false },
    { x: 76, y: 284, type: 'crate', walkable: false },
    { x: 218, y: 284, type: 'crate', walkable: false },
    // Dead trees on the outskirts edges
    { x: 26, y: 262, type: 'dead_tree', walkable: false },
    { x: 270, y: 260, type: 'dead_tree', walkable: false },
    { x: 42, y: 280, type: 'dead_tree', walkable: false },
    { x: 258, y: 282, type: 'dead_tree', walkable: false },
    // Estate garden benches
    { x: 102, y: 272, type: 'bench', walkable: false },
    { x: 192, y: 272, type: 'bench', walkable: false },
    { x: 122, y: 264, type: 'bench', walkable: false },
    // Estate garden iron railings
    { x: 98, y: 270, type: 'iron_railing', walkable: false },
    { x: 108, y: 270, type: 'iron_railing', walkable: false },
    { x: 188, y: 270, type: 'iron_railing', walkable: false },
    { x: 198, y: 270, type: 'iron_railing', walkable: false },
    // More approach street lamps (sparse rural spacing)
    { x: 86, y: 268, type: 'street_lamp', walkable: false },
    { x: 210, y: 268, type: 'street_lamp', walkable: false },

    // --- Gate 1 transition props ---
    // Heavy gatehouse detail
    { x: 127, y: 242, type: 'wall_torch', walkable: false },
    { x: 173, y: 242, type: 'wall_torch', walkable: false },
    { x: 125, y: 240, type: 'pillar', walkable: false },
    { x: 175, y: 240, type: 'pillar', walkable: false },
    { x: 136, y: 236, type: 'iron_railing', walkable: false },
    { x: 162, y: 236, type: 'iron_railing', walkable: false },
    { x: 130, y: 235, type: 'street_lamp', walkable: false },
    { x: 168, y: 235, type: 'street_lamp', walkable: false },
    // Bodies at the gate (battle evidence)
    { x: 140, y: 240, type: 'bones_pile', walkable: true },
    { x: 156, y: 240, type: 'bloodstain', walkable: true },
    { x: 148, y: 236, type: 'bones', walkable: true },

    // --- Zone B: Residential character ---
    // Courtyard benches (residential leisure)
    { x: 64, y: 212, type: 'bench', walkable: false },
    { x: 224, y: 212, type: 'bench', walkable: false },
    { x: 80, y: 204, type: 'bench', walkable: false },
    { x: 204, y: 204, type: 'bench', walkable: false },
    { x: 64, y: 230, type: 'bench', walkable: false },
    { x: 207, y: 230, type: 'bench', walkable: false },
    // Small garden props (flowers → pillar markers)
    { x: 57, y: 224, type: 'pillar', walkable: false },
    { x: 90, y: 212, type: 'pillar', walkable: false },
    { x: 197, y: 224, type: 'pillar', walkable: false },
    { x: 230, y: 220, type: 'pillar', walkable: false },
    // Residential iron railings (garden fences)
    { x: 56, y: 226, type: 'iron_railing', walkable: false },
    { x: 66, y: 226, type: 'iron_railing', walkable: false },
    { x: 86, y: 214, type: 'iron_railing', walkable: false },
    { x: 96, y: 214, type: 'iron_railing', walkable: false },
    { x: 196, y: 226, type: 'iron_railing', walkable: false },
    { x: 206, y: 226, type: 'iron_railing', walkable: false },
    { x: 226, y: 222, type: 'iron_railing', walkable: false },
    { x: 236, y: 222, type: 'iron_railing', walkable: false },
    // Wall torches on residential building faces
    { x: 57, y: 217, type: 'wall_torch', walkable: false },
    { x: 72, y: 220, type: 'wall_torch', walkable: false },
    { x: 87, y: 217, type: 'wall_torch', walkable: false },
    { x: 197, y: 217, type: 'wall_torch', walkable: false },
    { x: 212, y: 220, type: 'wall_torch', walkable: false },
    { x: 230, y: 214, type: 'wall_torch', walkable: false },
    // Courtyard fountains (nicer residential blocks)
    { x: 65, y: 214, type: 'fountain', walkable: false },
    { x: 224, y: 214, type: 'fountain', walkable: false },
    // More residential street lamps
    { x: 62, y: 232, type: 'street_lamp', walkable: false },
    { x: 80, y: 198, type: 'street_lamp', walkable: false },
    { x: 206, y: 232, type: 'street_lamp', walkable: false },
    { x: 224, y: 200, type: 'street_lamp', walkable: false },

    // --- Gate 2 transition props ---
    { x: 130, y: 176, type: 'iron_railing', walkable: false },
    { x: 168, y: 176, type: 'iron_railing', walkable: false },
    { x: 124, y: 177, type: 'barrel_stack', walkable: false },
    { x: 174, y: 177, type: 'crate_stack', walkable: false },

    // --- Zone C: Market bustle (more goods, commercial clutter) ---
    // Stacked goods at side market areas
    { x: 92, y: 150, type: 'barrel_stack', walkable: false },
    { x: 94, y: 150, type: 'crate_stack', walkable: false },
    { x: 102, y: 152, type: 'barrel', walkable: false },
    { x: 196, y: 150, type: 'crate_stack', walkable: false },
    { x: 198, y: 150, type: 'barrel_stack', walkable: false },
    { x: 204, y: 152, type: 'crate', walkable: false },
    // More awnings over side market areas
    { x: 93, y: 149, type: 'awning', walkable: false },
    { x: 197, y: 149, type: 'awning', walkable: false },
    // Market sewer grates (drainage)
    { x: 130, y: 144, type: 'sewer_grate', walkable: true },
    { x: 170, y: 144, type: 'sewer_grate', walkable: true },
    { x: 150, y: 140, type: 'sewer_grate', walkable: true },
    // Merchant walkway street lamps
    { x: 106, y: 152, type: 'street_lamp', walkable: false },
    { x: 190, y: 152, type: 'street_lamp', walkable: false },
    // More hanging signs (market signage density)
    { x: 115, y: 142, type: 'hanging_sign', walkable: false },
    { x: 185, y: 142, type: 'hanging_sign', walkable: false },
    { x: 130, y: 148, type: 'hanging_sign', walkable: false },
    { x: 170, y: 148, type: 'hanging_sign', walkable: false },
    // Broken stalls near alleys (market overflow)
    { x: 86, y: 140, type: 'broken_stall', walkable: false },
    { x: 200, y: 140, type: 'broken_stall', walkable: false },

    // --- Gate 3 transition props ---
    { x: 122, y: 118, type: 'rubble', walkable: false },
    { x: 178, y: 118, type: 'rubble', walkable: false },
    { x: 118, y: 117, type: 'bones_pile', walkable: true },
    { x: 180, y: 117, type: 'bloodstain', walkable: true },

    // --- Zone D: Claustrophobic urban density ---
    // Rooftop iron railings (safety edges for bridges)
    { x: 57, y: 69, type: 'iron_railing', walkable: false },
    { x: 74, y: 83, type: 'iron_railing', walkable: false },
    { x: 94, y: 71, type: 'iron_railing', walkable: false },
    { x: 114, y: 85, type: 'iron_railing', walkable: false },
    { x: 164, y: 83, type: 'iron_railing', walkable: false },
    { x: 201, y: 71, type: 'iron_railing', walkable: false },
    { x: 219, y: 85, type: 'iron_railing', walkable: false },
    { x: 239, y: 79, type: 'iron_railing', walkable: false },
    // More chimneys on rooftop platforms
    { x: 38, y: 85, type: 'chimney', walkable: false },
    { x: 262, y: 87, type: 'chimney', walkable: false },
    { x: 132, y: 69, type: 'chimney', walkable: false },
    // Extra crate/barrel stacks on rooftops (storage)
    { x: 37, y: 86, type: 'crate_stack', walkable: false },
    { x: 260, y: 88, type: 'barrel_stack', walkable: false },
    // Dense alley wall torches (more than other zones)
    { x: 52, y: 78, type: 'wall_torch', walkable: false },
    { x: 52, y: 92, type: 'wall_torch', walkable: false },
    { x: 70, y: 75, type: 'wall_torch', walkable: false },
    { x: 70, y: 92, type: 'wall_torch', walkable: false },
    { x: 108, y: 75, type: 'wall_torch', walkable: false },
    { x: 108, y: 92, type: 'wall_torch', walkable: false },
    { x: 128, y: 78, type: 'wall_torch', walkable: false },
    { x: 128, y: 96, type: 'wall_torch', walkable: false },
    { x: 163, y: 78, type: 'wall_torch', walkable: false },
    { x: 163, y: 92, type: 'wall_torch', walkable: false },
    { x: 195, y: 75, type: 'wall_torch', walkable: false },
    { x: 195, y: 92, type: 'wall_torch', walkable: false },
    { x: 213, y: 78, type: 'wall_torch', walkable: false },
    { x: 213, y: 92, type: 'wall_torch', walkable: false },
    { x: 235, y: 78, type: 'wall_torch', walkable: false },
    { x: 235, y: 96, type: 'wall_torch', walkable: false },
    // Dense sewer grates (upper city, worst drainage)
    { x: 52, y: 112, type: 'sewer_grate', walkable: true },
    { x: 70, y: 96, type: 'sewer_grate', walkable: true },
    { x: 88, y: 112, type: 'sewer_grate', walkable: true },
    { x: 108, y: 96, type: 'sewer_grate', walkable: true },
    { x: 128, y: 112, type: 'sewer_grate', walkable: true },
    { x: 165, y: 96, type: 'sewer_grate', walkable: true },
    { x: 195, y: 112, type: 'sewer_grate', walkable: true },
    { x: 213, y: 96, type: 'sewer_grate', walkable: true },
    { x: 235, y: 112, type: 'sewer_grate', walkable: true },

    // --- Gate 4 transition props ---
    { x: 117, y: 54, type: 'rubble', walkable: false },
    { x: 183, y: 54, type: 'rubble', walkable: false },
    { x: 116, y: 52, type: 'bones_pile', walkable: true },
    { x: 182, y: 52, type: 'bloodstain', walkable: true },
    { x: 119, y: 50, type: 'dead_tree', walkable: false },
    { x: 179, y: 50, type: 'dead_tree', walkable: false },

    // --- Zone E: Corrupted grandeur ---
    // Colonnade pillars along the approach
    { x: 116, y: 42, type: 'pillar', walkable: false },
    { x: 124, y: 42, type: 'pillar', walkable: false },
    { x: 176, y: 42, type: 'pillar', walkable: false },
    { x: 184, y: 42, type: 'pillar', walkable: false },
    // More corrupted fountain
    { x: 90, y: 35, type: 'fountain', walkable: false },
    { x: 210, y: 35, type: 'fountain', walkable: false },
    // Heavy bones/bloodstain density around ruins
    { x: 52, y: 32, type: 'bones_pile', walkable: true },
    { x: 55, y: 35, type: 'bloodstain', walkable: true },
    { x: 245, y: 32, type: 'bones_pile', walkable: true },
    { x: 248, y: 35, type: 'bloodstain', walkable: true },
    { x: 62, y: 30, type: 'bones', walkable: true },
    { x: 238, y: 30, type: 'bones', walkable: true },
    // Cemetery railings
    { x: 36, y: 24, type: 'iron_railing', walkable: false },
    { x: 44, y: 24, type: 'iron_railing', walkable: false },
    { x: 260, y: 24, type: 'iron_railing', walkable: false },
    { x: 268, y: 24, type: 'iron_railing', walkable: false },
    // More dead trees at cemetery
    { x: 38, y: 28, type: 'dead_tree', walkable: false },
    { x: 264, y: 28, type: 'dead_tree', walkable: false },
    // Grand street lamps on approach
    { x: 115, y: 42, type: 'street_lamp', walkable: false },
    { x: 185, y: 42, type: 'street_lamp', walkable: false },
    { x: 125, y: 48, type: 'street_lamp', walkable: false },
    { x: 175, y: 48, type: 'street_lamp', walkable: false },
  ],
  secretAreas: [
    { x: 28, y: 255, width: 6, height: 4, fill: 'cobblestone' },
    { x: 255, y: 252, width: 5, height: 5, fill: 'cobblestone' },
    { x: 42, y: 192, width: 5, height: 4, fill: 'stone' },
    { x: 250, y: 195, width: 6, height: 4, fill: 'stone' },
    { x: 92, y: 68, width: 5, height: 4, fill: 'stone' },
    { x: 222, y: 72, width: 5, height: 4, fill: 'stone' },
    { x: 55, y: 30, width: 4, height: 4, fill: 'cobblestone' },
    { x: 240, y: 28, width: 4, height: 4, fill: 'cobblestone' },
  ],
};
