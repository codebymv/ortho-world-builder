/** Authored failed ritual glyph anchors on the forest map (tile coords). */
export const FOREST_DUD_RITUAL_ANCHORS = [
  /** South-east hills — world (123, 109) on the in-game minimap. */
  { tileX: 273, tileY: 259 },
  /** Central north woods — world (-16, -17). */
  { tileX: 134, tileY: 133 },
  /** Consumed ridge camp approach — world (135, 12). */
  { tileX: 285, tileY: 162 },
  /** South entry teaching site beside Explorer Ulmund — world (5, 93). The first,
   *  safe glyph the player sees, so a live one reads as familiar later. */
  { tileX: 155, tileY: 243 },
] as const;

export const RANGER_APPROACH_DUD_RITUAL = FOREST_DUD_RITUAL_ANCHORS[0];
