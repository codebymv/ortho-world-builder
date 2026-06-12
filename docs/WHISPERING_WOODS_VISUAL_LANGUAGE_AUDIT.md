# Whispering Woods Visual Language Audit

This audit covers the post-Hollow Guardian playtest readability gaps: shortcut identity, key-gate
language, optional reward landmarks, Hollow material progression, false/dead-end spaces, corpse
directionality, arena readability, and district memorability.

## Findings

- Shortcut gates and key gates already have the right engine support. Key gates can display the
  `gate_padlock` overlay via `keyGateLock`; one-way shortcuts use gate panels plus nearby levers.
  The weak spot is consistency: the player should learn "barred gate plus far-side lever" versus
  "gate with padlock" immediately.
- Hollow progression reused ordinary dirt too far north. The main spine stayed mechanically clear,
  but visually it blended with earlier forest routes instead of becoming the Hollow's own path
  language.
- Optional reward routes were present but unevenly scented. Some branches had strong landmarks
  while the ornamental broadsword shelf, Wolf Ring route, and Highlander's Grotto cave needed more
  repeated "this is worth investigating" vocabulary.
- The Hollow dead-zone read like missing content. A failed ritual site is the right category marker:
  it can invite curiosity, force a fight, and then resolve as deliberate inert lore.
- The fort-key ranger corpse was mechanically correct but visually under-directed. Moving it to the
  east/right side of the stair approach and adding dropped gear/blood toward the fort road better
  communicates "this body matters to the fort."
- Hollow Guardian's arena had a center floor, but it did not strongly teach center control under
  combat pressure. Existing floor and low props can improve the read without adding UI.

## Implemented Pass

- Converted the northern Hollow spine and fog-gate apron from ordinary `dirt` to `hollow_blight`
  while preserving the same route topology.
- Added an inert failed-ritual cluster at world `(61, -117)` / tile `(211, 33)` to make the empty
  Hollow combat pocket read as authored false-progress lore.
- Moved the fort-key ranger corpse to tile `(68, 183)` and added eastward blood/gear breadcrumbs.
- Added existing-asset landmark clusters to optional reward pockets: ornamental broadsword bridge,
  Wolf Ring/ranger side route, and Highlander's Grotto cave mouth.
- Added a subtle worn center cue to the Hollow Guardian arena using existing floor bands, blood,
  bones, and rubble.
- Added padlock language to the manuscript checkpoint gate's center panel so story/key-like gates
  share a clear "locked barrier" read while shortcut gates remain lever/bar language.

## District Vocabulary

- South entry and village-adjacent forest: normal dirt spine, lantern pairs, crates/barrels.
- River and bonfire spine: dirt road plus blood trails and ranger line-of-march lanterns.
- Fort route: cobblestone, stone frames, padlocked gate center panels, military debris.
- Optional ranger/Olwen side route: lanterns, fallen logs, blood trails, cache-like pockets.
- Highlander's Plains and grotto: quarry props, cave mouth, plains grass, lone windmill landmark.
- Hollow approach and Deep Hollow: `hollow_blight`, dark grass, dead trees, graves, ritual debris.
- Hollow Guardian arena: concentric floor material and a worn central battle mark.

## Remaining Follow-up

- A future art pass could add a bespoke `hollow_dirt` tile if `hollow_blight` reads too pale or too
  shrine-like for long corridor use.
- A future shortcut audit could create a dedicated barred-shortcut gate sprite if existing `gate`
  panels still look too similar to key gates without the padlock overlay.
