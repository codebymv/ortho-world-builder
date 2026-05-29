# Whispering Woods - Faction, Lore, Progression & Orphan-Zone Audit

Second-pass audit of `src/content/regions/whispering_woods/map.ts`, focused on whether encounters make sense as a world:

- faction alignment and enemy-on-enemy logic
- logical gameplay placement
- lore placement and environmental storytelling
- progression order and checkpoint pressure
- orphaned or stale enemy zones

This complements:

- `docs/WHISPERING_WOODS_ENCOUNTER_AUDIT.md` - density, dispersion, and combat pressure
- `docs/WHISPERING_WOODS_DEEP_DIVE.md` - level-design structure
- `docs/BALANCE_AUDIT.md` - numeric combat/economy balance

No gameplay files were modified during this audit.

---

## Post-Audit Cleanup Status

Implemented immediately after this audit:

- River crossing mixed stack collapsed into a single undead guard: `skeleton x2` + `skeleton_captain x1`.
- Removed the wolf/slime/skeleton overlap boxes at the crossing approach.
- Hollow approach mismatch fixed: the stale `plant x1` became `shadow_lurker x1`.
- NE stale `forest_bandit_camp` / `bandit_hut` IDs renamed to consumed-camp IDs.
- West Stone Sentinel pair moved off the pre-Iron-Gate shelf to the deeper cliff sanctum route.
- Old west shelf now carries `cliff_sanctum_warning` plus `highland_garrison_remains` as readable danger telegraphing.
- Hollow Reaver open-flat density reduced from 8 to 5, keeping the single corridor Reaver intact.
- Forest Clearing bonfire moved from `(148,286)` to `(150,250)` for real south-spine checkpoint support.

Current forest enemy-zone metrics after cleanup:

- **67** authored enemy zones
- **205** total zone-spawned enemies
- **0** overlapping enemy-zone boxes
- **0** authored enemy zones with explicit `faction`

---

## Executive Summary

The woods are **stronger in lore logic than in encounter logic**. Most enemy types belong where they are: spiders nest in the SW, skeletons occupy ruins and dead settlements, plants guard groves, sentinels guard stone/fort/observatory spaces, and Hollow enemies intensify north of the river.

The main problems are not "random enemies everywhere." They are:

1. **Faction logic is underused in authored map zones.** The code supports faction fights, but no `enemyZones` in Whispering Woods set `faction`. Only runtime fixed skirmishes use factions.
2. **Some mixed-species pods can imply alliances that do not make lore sense.** The biggest case, the river choke, has been cleaned up.
3. **Stale labels from older designs need cleanup when enemy families change.** The NE consumed camp was renamed in the first cleanup pass.
4. **Progression spikes are lore-valid but checkpoint-invalid.** Stone Sentinels belong near forts, but their current placement hits before the first real checkpoint.
5. **A handful of zones are gameplay fillers rather than authored encounters.** They prevent empty walks, but do not always teach, guard, foreshadow, or reward.

**Recommendation:** after the first cleanup passes, continue with east-side filler consolidation and explicit faction-skirmish metadata/comments.

---

## 1. Faction System Reality

### 1.1 What the engine supports

`MapDefinition.enemyZones` supports optional `faction`, and `spawnEnemiesFromMapZones` passes `zone.faction ?? blueprint.faction` into `CombatSystem.spawnEnemy`.

Faction behavior is real:

- enemies with non-empty different factions can target each other
- faction fights wake when the player approaches
- hitting a faction enemy permanently aggroes that enemy and nearby same-faction allies
- enemies with no faction default to player-only hostility

### 1.2 What the forest actually uses

In `whispering_woods/map.ts`, **none of the 67 authored enemy zones set `faction`**.

The only faction fights in the forest are runtime spawns in `RuntimeMapFlow.ts`:

- river road skirmish: undead skeletons/captain vs armored wolves
- observatory skirmish: undead skeletons/captain vs armored wolves

Those runtime fights are good set pieces, but they are invisible in the map's `enemyZones` layer. That creates two design risks:

- authored mixed pods do **not** behave like faction fights even when they visually imply one
- future map edits can accidentally stack normal enemy zones on top of runtime faction fights because the fight is not visible near the zone definitions

### 1.3 Faction alignment verdict

| Area | Current enemies | Faction/lore read | Verdict |
|---|---|---|---|
| River road runtime skirmish | undead vs armored wolves | great "woods at war" moment | Keep, but document near zones |
| Observatory runtime skirmish | undead vs armored wolves | strong POI set piece | Keep |
| River choke `(142-150, 90)` | skeletons + captain | coherent undead guard | Fixed |
| Destroyed villages | skeletons | coherent | Keep |
| Spider nest | spiders | coherent | Keep |
| Enchanted groves | plants | coherent | Keep |
| Hollow corridor | shadow_lurker + reaver | coherent | Keep |
| Hollow approach pod 3 | `plant` at `(116,33)` under "shades stalk corridor" comment | comment/type mismatch | Fix |

---

## 2. Lore Placement Audit

### Strong Fits

**Spiders**

- SW nest at `(20,240)` and `(55,252)` matches `spider_nest`.
- East/lakeside/collapsed cottage spiders are believable if framed as nesting in damp ruins.

**Skeletons**

- Destroyed villages, temple/church, stone quarry, and fort approach all make sense.
- The old chapel key dialogue says the fort was overrun, so skeletons near fort/chapel reinforce the story.

**Plants**

- Enchanted groves and forgotten shrine guardians are coherent.
- Plant counts are high, but they have a clear ecological home.

**Stone Sentinels / Golems / Ridge Revenant**

- These belong near forts, observatories, ridges, stonework, or old magical infrastructure.
- The issue is progression pressure, not world logic.

**Hollow Shades / Reavers**

- North of the river, dark grass, hollow blight, ruined camps, and the fog gate all support them.
- The Hollow corridor is the best lore-meets-gameplay placement in the map.

### Weak or Stale Fits

**Consumed camp naming**

The NE camp now uses consumed-camp interaction IDs while the nearby enemy zones remain shadows. That keeps the story direction clear: this was once a camp, now the Hollow has taken it.

**Former plant inside Hollow approach**

The authored pod comment says:

> hollow approach: shades stalk the corridor to the fog gate

This was previously:

```ts
{ x: 116, y: 33, width: 10, height: 8, enemyType: 'plant', count: 1 }
```

It is now `shadow_lurker x1`, matching the corridor's enemy language.

**Normal wolves in deep Hollow-adjacent spaces**

Some northern wolf zones are acceptable as corrupted wildlife, but normal `wolf` near deep Hollow can blur the threat taxonomy. If a wolf is north of the river or inside Hollow-flavored terrain, consider `armored_wolf`, `shadow`, or a renamed corrupted wolf variant later.

---

## 3. Logical Gameplay Placement

### Good Gameplay Logic

| Pattern | Why it works |
|---|---|
| singleton elites at POIs | player reads them as guarding something |
| spider nest + perimeter | clear territorial identity |
| Hollow corridor staging | teaches escalation and creates boss approach tension |
| plant groves | area denial and optional route pressure |
| skeletons in ruined settlements | combat reinforces environmental story |
| runtime faction skirmishes | spectacle, world motion, and player choice |

### Weak Gameplay Logic

| Zone | Problem |
|---|---|
| river choke `(142,90)` | cleaned up to one undead guard force |
| pre-Iron-Gate Sentinels | lore-valid, but checkpoint-invalid |
| Reaver flats | ranged pressure in open fixed-camera terrain |
| far east wolves `(278,92)` | fills space but does not guard a clear reward or teach a new behavior |
| east lake/ruined fort spiders | plausible, but should be tied more visibly to a nest/cocoon/loot beat |

### Gameplay rule of thumb

Every enemy zone should answer at least one of these:

1. **Guard:** protects a reward, shortcut, key, POI, or route.
2. **Teach:** introduces or remixes behavior.
3. **Foreshadow:** warns of a later enemy family or region.
4. **Pressure:** creates checkpoint-to-checkpoint attrition.
5. **Story:** makes the environment's history legible.

Zones that only "fill empty space" should be reduced, replaced with props, or turned into a mini-POI.

---

## 4. Progression Audit

### South entry

Current logic:

- portal at `(150,290)`
- Forest Clearing bonfire at `(150,250)`
- bridge wolves at `(140,267)`
- Iron Gate bonfire at `(134,208)`

The lore pacing is good: warning signs, first wolf contact, ruined camps, then ranger network.

The first cleanup passes moved Forest Clearing north to `(150,250)`, so early deaths no longer repeat the full portal-to-Iron-Gate walk.

**Verdict:** do not nerf the bridge wolves further. Checkpoint support is now in place.

### Cottage / Ranger loop

The hunter cottage, ranger gate, dead ranger note, shortcut lever, and Iron Gate loop form a strong Souls-like route.

Resolved: the Stone Sentinels have been moved off the west shelf to the deeper cliff sanctum route. The old approach now uses warning sign/remains telegraphing instead of an early elite ambush.

**Verdict:** lore fit remains good, and progression order is now healthier: players see the danger first, then meet the Sentinels later near a stronger route/checkpoint context.

### River barrier / Hollow approach

This is the critical transition from woods into corrupted Hollow. The environment supports it well:

- decayed bridge
- corrupted water
- warning sign
- hunter camps
- Hollow ruins
- gate/fog terminus

The first cleanup pass converted the river south bank from a wolf/skeleton/slime/captain pileup into a deliberate undead guard. The barrier now reads more like a designed threshold.

**Verdict:** this should become a deliberate "crossing guard" encounter, not a multi-zone convergence.

### Hollow

The Hollow is progression-consistent:

- stronger enemies
- more restricted paths
- lore camps get more desperate
- boss approach is staged

Resolved: Reaver density in open flats has been reduced from 8 to 5 while preserving the single corridor Reaver. This keeps Hollow ranged dread without letting the open flats behave like an off-screen firing squad.

**Verdict:** enemy family and pressure are preserved; if playtests still show off-screen deaths, the next step is an on-screen-only projectile gate in combat logic.

---

## 5. Orphan-Zone Audit

### Clear non-orphans

| Zone family | Anchor |
|---|---|
| SW spiders | spider nest / cocoon logic |
| destroyed village skeletons | dead settlements |
| plant groves | enchanted groves / blighted root theme |
| golems | stonework, fort, observatory, field-boss arenas |
| Hollow shades/reavers | Hollow blight, camps, fog gate |
| ridge revenant | Tempered Core / ridge skill check |
| SE shrine plants | forgotten shrine |

### Suspect orphans / stale zones

| Zone | Issue | Recommendation |
|---|---|---|
| NE consumed camp with shadows | formerly stale bandit naming | fixed by renaming IDs |
| `shadow_lurker` at `(116,33)` | formerly comment/type mismatch | fixed |
| far east wolves `(278,92)` | weak guard/teach/story role | tie to ruins/altar/chest or remove |
| spiders `(266,186)` and `(276,156)` | plausible, but visually under-anchored | add cocoon/bones props or consolidate |
| east artery wolves `(194,178)` | explicit filler "dead stretch" | acceptable short-term, but should become a landmark patrol |
| runtime faction fights | not orphaned, but not visible in map zones | document with comments near enemyZones or convert to authored zone metadata |

---

## 6. Proposed Encounter Taxonomy

Add a mental, or eventually typed, classification for enemy zones:

| Role | Meaning | Example |
|---|---|---|
| `spine_gate` | mandatory route pressure | river crossing guard |
| `checkpoint_attrition` | pressure between bonfires | south spine wolves/slimes |
| `poi_guard` | protects landmark/reward | golem arena, shrine plants |
| `optional_elite` | avoidable skill check | ridge revenant, corrupted giant |
| `faction_skirmish` | enemies fight each other until player interferes | runtime river/observatory battles |
| `ecosystem` | territorial ambience | spider nest, wolf den |
| `lore_echo` | story-first encounter | destroyed village skeletons |

This would make future audits much easier and prevent filler zones from surviving without a reason.

---

## 7. Recommended Implementation Order

### P0 - Fix logical contradictions first

1. **River crossing rewrite — complete**
   - Replaced the `(142,90)` triple-stack + adjacent mixed pods with one deliberate crossing encounter.
   - Current version: `skeleton x2` + `skeleton_captain x1` on the south bank.

2. **Fix Hollow approach plant mismatch — complete**
   - Changed `(116,33)` from `plant x1` to `shadow_lurker x1`.

3. **Rename/stabilize NE bandit camp — complete**
   - Renamed the POI IDs to consumed-camp IDs while keeping the shadow encounter.

### P1 - Align progression with intended difficulty

4. **Sentinel placement pass — complete**
   - Kept Sentinels tied to stone/fort lore, moved the pre-Iron-Gate pair deeper, and added hard warning/sightline props.

5. **South checkpoint support — complete**
   - Moved Forest Clearing to `(150,250)`.

6. **Reaver engagement cleanup — complete**
   - Reduced open-flat Reaver count from 8 to 5 while keeping corridor pressure.

### P2 - Remove weak filler

7. **East void consolidation — complete**
   - Replaced far-east wolf/spider filler with **Consumed Ridge Camp** (shadow×2 + skeleton×2) and **Ridge Lumberyard Remains** (shadow×2 + skeleton×2), with sign props and dialogue.
   - Placed **East Ridge Overlook** bonfire at `(261,107)`.

8. **Zone role metadata/test**
   - Add `role` / `authoredPod` / `factionIntent` metadata to map zones, or at minimum add comments and a small overlap test.

---

## 8. Final Judgement

Whispering Woods has a coherent world thesis: the forest starts as wildlife and ranger territory, becomes overrun by dead patrols and corrupted groves, then decays into the Hollow. That arc is strong.

The cleanup target is narrower:

- stop mixed pods from implying enemy alliances that do not exist
- make faction fights explicit rather than hidden runtime exceptions
- remove stale labels from older enemy plans
- ensure every zone has a job beyond filling map area
- make checkpoint order support the difficulty order

The best first change was the river crossing, the second was Sentinel/checkpoint alignment, the third was Reaver open-flat engagement, the fourth was south checkpoint support, and the fifth was east void consolidation; all are now in place. The next highest-value work is zone role metadata and overlap CI.
