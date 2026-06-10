# Performance Audit — souls-slop

*Audited June 2026. Companion to `COMBAT_FLUIDITY_AUDIT.md`. All file:line references verified against the current tree.*

---

## 1. Executive summary

This codebase has already had **serious, competent performance work**: a phase-level profiler with
adaptive quality scaling, instanced particle/weather systems, pooled floating text over a glyph
atlas, an incremental spatial hash, pooled world-tile meshes with chunk streaming, and widespread
scratch-object discipline in the frame hot path. The foundation is good.

What remains falls into four buckets:

1. **Draw-call volume** — the world renders ~4,700 active tile objects as *individual meshes*
   (≈7k–14k leaf meshes in a dense view), with the already-built instancing layer **switched off**.
   Most sprites are `transparent + depthWrite:false`, so Three.js re-sorts thousands of quads every
   frame.
2. **Simulation scaling** — Whispering Woods spawns **~202 enemies**; dormancy culling only covers
   `idle` enemies, and each *chasing* enemy can run 10+ collision slide attempts × 8-probe hull
   checks plus uncached 0.25-step LoS raycasts per frame.
3. **Periodic hitches** — full minimap terrain redraw on every newly explored tile
   (O(all visited tiles), up to ~8×/s while exploring), synchronous 30s autosaves that stringify the
   unbounded `visitedTiles` set, dodge/lunge tile-breaking every frame in grass, first-sight
   procedural texture generation, and full 2048×2016 glyph-atlas GPU re-uploads on uncached damage
   numbers.
4. **Steady GC pressure** — per-chase move-step object allocations, per-walking-enemy sprite-key
   strings, and a handful of closures/option literals rebuilt every frame.

**The single highest-leverage change is flipping `USE_INSTANCED_GROUND` on** — the batching layer
exists, is documented as A/B-ready, and the F8 overlay already reports draw calls to verify it.

---

## 2. Scorecard

| Area | Grade | One-liner |
| --- | --- | --- |
| Profiling & adaptive quality | A | Phase timings, draw-call stats, auto effects/pixel-ratio scaling — already built (F8) |
| Particles / weather / floating text | A- | Instanced + pooled + budgeted; atlas re-upload edge case remains |
| Render pipeline (world) | C | Per-tile meshes, instancing OFF, mass transparent sorting |
| Render pipeline (actors) | B- | Pooled aux meshes; per-frame renderOrder + needsUpdate churn |
| Simulation scaling | C+ | Spatial hash is good; dormancy partial; chase collision & LoS uncached |
| Hitch sources | C | Minimap redraw, sync autosave, per-frame breakables, lazy texture gen |
| GC discipline | B- | Excellent in runtime/ phase files; breaks down in Combat.ts movement + sprite keys |
| React/UI | B- | HUD snapshot-diffed + throttled, but re-renders the 1,604-line root; minimap overlay has its own always-on rAF |

---

## 3. What's already done well (do not re-do)

- **PerfProfiler** (`PerfProfiler.ts`): per-phase timings (prelude/player/enemy/tail/render/minimap…),
  renderer draw-call/triangle/texture stats, p50/p95/p99 frame stats, **adaptive effects scale**
  (0.45–1.0) and **adaptive pixel-ratio cap** (1.25–2.0) on 1.2s cooldown (`PerfProfiler.ts:302-317`),
  consumed by particles/weather/ambience and `applyAdaptivePixelRatio` (`RuntimeLoopTail.ts:99-104`).
- **ParticleSystem** (`ParticleSystem.ts`): 4 opacity-bucket `InstancedMesh`es (≈4 draw calls),
  pooled, per-frame emission budget, numeric `emitAt` hot path avoiding Vector3 allocation.
- **WeatherSystem / TransientTileDecals**: instanced buckets / pooled decals with hard caps.
- **FloatingText** (`FloatingText.ts`): 20 pooled meshes, shared glyph atlas, damage 0–499 pre-rendered.
- **SpatialHash** (`SpatialHash.ts`): packed numeric cell keys, incremental `updateEnemyHash`, all
  hot-path queries pass a reusable `out` buffer (`Combat.ts:2346-2351`). No per-frame rebuild.
- **World streaming** (`World.ts`): mesh/overlay pools (`:624-646`), chunk threshold gating
  (`:1973-2002`), 200-tiles/frame batching, decorative-overlay distance culling (`:1693-1710`),
  material cache (`:609-621`), and a **ready-to-enable `GroundInstanceLayer`**.
- **Frame-loop allocation discipline**: phase context objects mutated in place
  (`RuntimeFrameRunner.ts:127-153`), `_frameResult` singleton (`GameLoop.ts:18`), scratch arrays/Sets
  (`PlayerSimulationSystem.ts:68`, `RuntimeEnemyLoop.ts:17-20`), swap-pop dead removal.
- **Audio**: pooled HTML5 elements created at init, one-time `createMediaElementSource` per element
  (`AudioDirector.ts:136-160`); no per-play node churn.
- **Renderer config**: `antialias:false`, `powerPreference:'high-performance'`, `stencil:false`,
  DPR capped at 2 (`GameRuntime.ts:85-91`).
- **Dormancy**: idle enemies beyond 40 tiles skip their update (`Combat.ts:20,1020`).
- **AssetManager warmup**: enemy textures pre-built per map zone (`AssetManager.ts:3006-3018`)
  plus idle-callback background prewarm (`:3024+`).

---

## 4. P0 — Highest frame-time / hitch impact

### P0.1 — World tile draw-call explosion (instancing built but OFF)

`World.ts:13`: `USE_INSTANCED_GROUND: boolean = false` — the comment says it's experimental and
A/B-ready ("F8 to watch drawCalls"). With `RENDER_RADIUS 22` / `CULL_RADIUS 34` (`World.ts:189-190`),
`activeMeshes` holds ≈4,761 tile objects; each flat tile is 1 quad + optional shadow (up to 3),
detail decal, corruption decals, seam fillers (`createTileObject`, `World.ts:1599-1795`); overlay
props add 2–10 more. Net ≈**7k–14k leaf meshes**, each ≈1 draw call since transparent overlays
don't batch.

**Fix**: enable `USE_INSTANCED_GROUND`, A/B with the F8 overlay's drawCalls stat. Then extend the
same batching to shadow/decal quads. Long-term: per-chunk merged geometry for static base terrain.

### P0.2 — Mass transparent-quad sorting

Actors, overlays, ambience, HP bars all use `transparent: true, depthWrite: false`
(`RuntimeEnemyLoop.ts:645-646`, `World.ts:913-916`, `BiomeAmbience.ts:34-38`,
`EnemyVisualRegistry.ts:67-80`). Three.js sorts every transparent object every frame —
O(n log n) over thousands of quads plus GL state churn. World *base* tiles already use the better
path (`alphaTest` + opaque, `World.ts:614-617`).

**Fix**: prefer `alphaTest` cutout materials for hard-edged pixel-art sprites (most of them);
reducing mesh count via P0.1 also directly shrinks the sort. `sortObjects = false` is risky with
the current mixed renderOrder scheme — don't start there.

### P0.3 — Enemy AI scaling: partial dormancy + chase collision combinatorics

- Whispering Woods spawns **~202 enemies** across ~75 zones (`whispering_woods/map.ts:2204-2382`);
  `updateEnemies` iterates all of them every frame (`Combat.ts:981`).
- Dormancy only skips **idle** enemies >40 tiles (`Combat.ts:1020`). Chasing/telegraphing/recovering
  enemies run full AI at any distance until they leash.
- `tryEnemyChaseMove` (`Combat.ts:251-327`) can attempt direct + side-blend + recovery slides —
  10+ `trySlideEnemyMove` calls × up to 3 `canMove` each; `canEnemyMoveTo` probes an **8-point hull**
  (`World.ts:2275-2284`) vs the player's 4. Worst case: hundreds of `getTile` probes per stuck enemy
  per frame, multiplied in packs.
- LoS raycasts are uncached: `canEnemyMeleeReachPlayer` samples every 0.25 tiles
  (`Combat.ts:33,611-641`) ≈24 `getTile` at 6 tiles, re-run per enemy per frame near melee.

**Fix** (in order of safety): extend dormancy to all non-engaged states beyond ~25 tiles with a
periodic (e.g. 4Hz) wake check → stagger far-enemy AI across frames → cap chase recovery attempts
per enemy per frame → add a per-frame LoS memo keyed by (fromTile, toTile).

### P0.4 — Minimap: O(visited) terrain redraws + always-on overlay rAF

- **Terrain**: the redraw key includes `visitedTiles.size` (`Minimap.tsx:89-100`), so *every newly
  revealed tile* re-parses the entire visited set (`getVisitedTilesForMap`,
  `minimapDrawing.ts:676-706` — string split per key) and repaints **every visited cell**
  (`drawMinimapTerrain`, `:771-776`). On a 300×300 map that trends toward 90,000 cells, up to ~8×/s
  while exploring (120ms throttle, `Game.tsx:538-542`).
- **Overlay**: a second, independent rAF loop redraws markers/NPC dots every 48ms (16ms when
  pulsing) *forever*, even idle (`Minimap.tsx:116-189`).

**Fix**: terrain — exploit Set insertion order: track a per-map "drawn count" cursor and paint only
`visited[drawnCount..]` (full redraw only on map change/revision/scale change). Overlay — pause the
rAF when nothing is pulsing and no entity moved; or drive it from the game loop tail at the same
cadence it already throttles to.

### P0.5 — Synchronous autosave stringifies the unbounded visited set

Every 30s (`setupGameRuntime.ts:372`, `RuntimeLoopTail.ts:355-358`), `SaveManager.save` runs a
synchronous `JSON.stringify` + `localStorage.setItem` (`SaveManager.ts:321-328`) of the full save —
including `Array.from(visitedTiles)` (`SaveManager.ts:314`), which grows without bound
(90K tiles/map × multiple maps ≈ several MB of strings late-game). Guaranteed periodic main-thread
stall that worsens with playtime.

**Fix**: serialize during idle (`requestIdleCallback`) and/or move the stringify off-thread;
compress visited tiles (per-map bitset / RLE of tile indices instead of `"map:x:y"` strings) —
this also shrinks the per-frame `revealVisibleTiles` Set memory.

### P0.6 — Dodge/lunge break tiles every frame

- Dodge: 4 corner `breakTileAt` calls **every dodge frame** (`PlayerSimulationSystem.ts:742-753`).
- Lunge: `breakTilesInRadius(r=1.0)` **every lunge frame** (`PlayerSimulationSystem.ts:1008-1011`).
- Each actual break triggers a 3×3 `refreshMapTileRegion` mesh rebuild (`BreakableProps.ts:117`)
  and a `Vector3.clone()` per particle burst (`BreakableProps.ts:122`). Rolling through tall grass
  = mesh rebuild bursts mid-dodge, exactly when frame budget matters most.

**Fix**: only run break probes when the player crosses a tile boundary (cache last tile coords);
batch refreshes for multiple broken tiles into one region rebuild.

---

## 5. P1 — Meaningful, lower-risk wins

### P1.1 — BiomeAmbience: 90 individual transparent meshes

`BiomeAmbience.ts:20,32-54`: each ambient mote is its own `THREE.Mesh` + material — up to **90 draw
calls + 90 sort entries**, while sibling systems (particles, weather) are instanced.
**Fix**: mirror the 3–4 opacity-bucket `InstancedMesh` pattern from `ParticleSystem`.

### P1.2 — React HUD re-renders the 1,604-line root

- `uiVersion` is declared once (`Game.tsx:191`) and **never read** — it exists purely to force the
  whole `Game` tree to re-render. Throttled path runs at ~11Hz during stamina churn (90ms gate,
  `Game.tsx:531`); unthrottled `triggerUIUpdate` fires from dozens of event sites.
- The throttled path itself runs `getEnemies().find(...)` + builds a 10-field snapshot object
  **every frame** (`Game.tsx:489-516`), called unconditionally from the prelude (`GameLoop.ts:236`).
- `GameUI` is not memoized (its `CombatBars` child is).

**Fix**: isolate the HUD into a small component subscribed via ref + its own low-rate timer (or CSS
variables written directly from the loop); memoize `GameUI`; cache the boss enemy reference instead
of `.find` per frame; delete the dead `uiVersion` state if the ref approach lands.

### P1.3 — Per-frame actor render-state churn

- `enemyMesh.renderOrder = getActorRenderOrder(...)` runs unconditionally per visible enemy per
  frame (`EnemyVisualSystem.ts:537`) — shadow/outline are correctly gated behind `posChanged`
  (`:543-565`); the body mesh isn't.
- `resetMeshBasicMaterial` sets `material.needsUpdate = true` on every projectile/hazard acquire,
  every frame (`EnemyVisualRegistry.ts:154-167`, called from `RuntimeEnemyLoop.ts:921`), forcing
  needless material refreshes when the texture didn't change.

**Fix**: move the renderOrder write inside the `posChanged` block; in `resetMeshBasicMaterial`,
only assign `map`/`needsUpdate` when `texture !== material.map`.

### P1.4 — Combat.ts movement allocations (largest steady GC source)

Per chasing/patrolling enemy per frame: fresh `{x,y,moved,vx,vy}` step objects, `{...step}` spread
copies, `normalizeMoveVector` `{x,y}` returns, and `sideOrder`/`distanceOrder` array literals
(`Combat.ts:93-110,222-225,248,276-279`), plus per-call arrow predicates (`:262-263,1200`).
`updateMovementVisuals` is redefined inside `updateEnemies` on every call (`Combat.ts:934-964`);
`onPhaseChange` / `fireParryFeedback` arrows are rebuilt every frame
(`RuntimeEnemyLoop.ts:273-390,428-502`).

**Fix**: out-param scratch step object + static direction-order arrays; hoist the closures to
module/class level (store `onPhaseChange` once on the combat system or phase context).

### P1.5 — Sprite-key string churn for walking enemies

`_enemySpriteCache` invalidates whenever `walkFrame` advances — i.e. **every frame for every visible
moving enemy** — rebuilding template-string keys and re-doing Map lookups
(`EnemyVisualSystem.ts:165,176-207`). Player equivalent builds its key per frame too
(`setupGameRuntime.ts:499-504`, cached by string in `PlayerVisualSystem.ts:450-459`).

**Fix**: pack (type, facing, animState, frame, phase) into a numeric key, or pre-resolve per-enemy
texture ref arrays at spawn so the per-frame path is `textures[state][facing][frame]`.

### P1.6 — FloatingText atlas re-upload + init stall

Any glyph not pre-rendered — crit suffixes (`"57!"`), damage ≥500, heals, gold — calls
`getOrCreateGlyph` → `atlasTexture.needsUpdate = true` (`FloatingText.ts:111-120`), re-uploading the
full **2048×2016 canvas (~16MB)** to the GPU mid-combat. Init also does ~500 synchronous canvas text
draws (`:87-108`).

**Fix**: pre-render crit variants for 0–499 (or render crits as normal glyph + scale/tint);
`texSubImage2D`-style partial updates aren't exposed by `CanvasTexture`, so alternatively split the
atlas into small per-row textures so an upload is cheap; move prewarm into an idle callback.

---

## 6. P2 — Worth doing opportunistically

| Item | Evidence | Fix |
| --- | --- | --- |
| `AssetManager.toDataURL()` per generated texture (sync PNG encode + permanent base64 Map) | `AssetManager.ts:2967` | Generate data URLs lazily in `getTextureURL` only |
| First-sight texture generation hitches (un-warmed enemies/props) | `AssetManager.ts:2976-2988` | Extend zone warmup to portal-destination maps on travel |
| World items: mesh+material created/disposed per item, no pool | `WorldItemRenderer.ts:50-99` | Pool like projectiles/hazards |
| Enemy spawn allocates body material per enemy | `RuntimeEnemyLoop.ts:643-647` | Material pool keyed by sprite texture |
| Chunk streaming bursts (200 tile builds/frame while moving) | `World.ts:191,1985` | Halve budget when adaptive scale < 1 |
| Full-screen overlay stacking (corruption + haze + day/night + weather tint) | `CorruptionFilter.ts:109`, `AltitudeHaze.ts:75` | Composite into one pass if all active at once |
| Particle pool (50) smaller than frame budget (90) | `ParticleSystem.ts:17,26` | Align pool to budget or vice versa |
| Prelude/sim return 18-field object literals per frame | `GameLoop.ts:364-388`, `PlayerSimulationSystem.ts:1172-1191` | Scratch result objects (same `_frameResult` pattern) |
| Profiler-on overhead: `profiledRenderFrame` closure + stats object per frame | `RuntimeFrameRunner.ts:86-97,47-56` | Hoist; only while F8 open, so low priority |
| Music crossfade allocates `new Audio()` per track switch | `AudioDirector.ts:219-224` | Cache per-track elements (infrequent — minor) |

---

## 7. Suggested implementation order

| Pass | Work | Effort | Risk | Expected win |
| --- | --- | --- | --- | --- |
| 1 | **Flip `USE_INSTANCED_GROUND` + A/B via F8** | XS | Low (flag + fallback exist) | Largest draw-call cut available |
| 2 | Minimap incremental terrain + overlay rAF gating (P0.4) | S | Low | Kills the exploration-time stutter |
| 3 | Autosave: idle-deferred + visited-tile compression (P0.5) | S | Low | Removes the 30s hitch; shrinks saves |
| 4 | Breakables on tile-boundary crossing only (P0.6) | S | Low | Smooth dodges/lunges in grass |
| 5 | Enemy AI: extended dormancy + chase-attempt caps + LoS memo (P0.3) | M | Medium (AI behavior) | Frame-time floor on dense maps |
| 6 | GC batch: move-step out-params, closure hoisting, sprite-key ints (P1.4/1.5) | M | Low | Fewer GC pauses in packs |
| 7 | Render-state batch: renderOrder gating, needsUpdate guard, BiomeAmbience instancing, alphaTest sweep (P0.2/P1.1/P1.3) | M | Medium (visual regressions possible) | Sort cost + draw calls |
| 8 | HUD isolation + GameUI memoization (P1.2) | S–M | Low | Less main-thread React work during combat |

Measure with the existing F8 overlay before/after every pass — drawCalls, frame p95, and the
per-phase timings are already there. Passes 1–4 are pure wins with no gameplay risk.

---

## 8. Deep-dive sources

Three parallel investigations fed this report (full details preserved in their transcripts):
render pipeline; per-frame allocations/GC; simulation algorithms + React/UI/audio/saves.
Key numbers cross-verified by direct reads: `World.ts` instancing flag and radii, `PerfProfiler`
adaptive thresholds, `Minimap.tsx` redraw keying, `SaveManager.ts` payload, `FloatingText.ts` atlas
behavior, `Game.tsx` UI update paths, Whispering Woods spawn counts, and `Combat.ts` dormancy.
