# Ortho World Builder — Audit Findings

Read-only audit of the current codebase against previously proposed quick wins and across major runtime systems. Evidence cites file + line ranges. No code was modified during this audit.

Legend for **Status**: `done` · `partial` · `missing` · `stale` (authored but unused) · `n/a`.

---

## Summary Table

| # | Item | Status | Effort | Impact |
|---|---|---|---|---|
| A1 | README game-specific rewrite | missing | XS | high |
| A2 | Controls panel (in-game) | done | — | — |
| A3 | Controls panel polish / duplication with PauseMenu | partial | S | med |
| A4 | Main menu / continue screen | missing | M | high |
| A5 | Objective-update toast (per step) | partial | S | high |
| A6 | Objective click → minimap ping | stale (prop unused) | XS | low |
| A7 | First-quest wording | partial | XS | med |
| A8 | Debug / test scripts documented | missing | XS | med |
| A9 | Enemy role metadata | missing | S | med |
| A10 | Early-enemy combat readability tuning | partial | M | med |
| A11 | Dev build / version label | missing | XS | low |
| A12 | Campaign arc dev viewer | stale (registry unused) | S | med |
| B1 | Runtime orchestration extraction (REFACTOR_BLUEPRINT) | partial | L | high |
| B2 | `shadow_castle` map scaffold (per AAA plan) | missing | L | med |
| B3 | Manual save / save-slot UI | missing | M | med |
| B4 | Death overlay — no player choice | partial | S | low |
| B5 | Transition overlay polish (skip, timing) | partial | XS | low |
| B6 | Notification history viewer | missing | S | low |
| B7 | Pause menu — shows quest title, not active objective | partial | XS | med |
| B8 | Tests coverage (only 1 unit test) | partial | L | med |
| B9 | TODO/FIXME markers in src | clean | — | — |
| B10 | `CurrentObjective.onObjectiveClick` dead prop | stale | XS | low |
| B11 | Critical path items visuals / glow tuning | done | — | — |
| B12 | Bonfire rest / fast travel / level up | done | — | — |
| B13 | Vendor system | done | — | — |
| B14 | Audio: music / SFX / enemy pools / master gain | done | — | — |
| B15 | Weather / day-night / biome ambience | done | — | — |
| B16 | Transition debug (`V`) + collision debug (`B`) | done | — | — |
| B17 | Map preloading / deferred map definitions | done | — | — |
| B18 | Save version 5 + migrations | done | — | — |
| B19 | Controls discoverability (first-run hint) | missing | XS | med |

---

## A. Quick-Win Items

### A1. README game-specific rewrite — `missing`

- **Evidence:** `@c:\Users\roxas\OneDrive\Desktop\PROJECTS\ortho-world-builder\README.md:1-78` — still the default Lovable template. No game pitch, no controls, no mention of `audit:content`, `probe:hunter`, `simulate:cottage`, no mention of debug hotkeys.
- **Gap:** Opening the repo does not communicate that this is a real action-adventure prototype.
- **Next step:** Replace top half with game pitch, controls list, how to run, and a "Dev scripts" section referencing `package.json` scripts.

### A2. Controls panel (in-game) — `done`

- **Evidence:** `@c:\Users\roxas\OneDrive\Desktop\PROJECTS\ortho-world-builder\src\components\game\GameUI.tsx:373-447` — collapsible `Controls` panel bottom-left, 14 bindings, `?` button, ARIA-labeled.
- **Gap:** None at baseline.

### A3. Controls panel polish + duplication with PauseMenu — `partial`

- **Evidence:**
  - `@c:\Users\roxas\OneDrive\Desktop\PROJECTS\ortho-world-builder\src\components\game\GameUI.tsx:399-443` — controls list.
  - `@c:\Users\roxas\OneDrive\Desktop\PROJECTS\ortho-world-builder\src\components\game\PauseMenu.tsx:33-56` — identical controls list duplicated.
- **Gap:** Two hand-maintained control lists can drift (`HOLD LMB` vs `Hold LMB`, `Z` labeled "Use Item" in GameUI but missing item name; no grouping by Movement/Combat/Menus; no icons).
- **Next step:** Extract a single `CONTROL_BINDINGS` constant, render it from both panels, and add group headers.

### A4. Main menu / continue screen — `missing`

- **Evidence:**
  - `@c:\Users\roxas\OneDrive\Desktop\PROJECTS\ortho-world-builder\src\pages\Index.tsx:1-8` — `Index` renders `<Game />` directly.
  - `@c:\Users\roxas\OneDrive\Desktop\PROJECTS\ortho-world-builder\src\lib\game\SaveManager.ts:129-131` — `hasSave()` exists but is not surfaced to users.
  - `@c:\Users\roxas\OneDrive\Desktop\PROJECTS\ortho-world-builder\src\game\runtime\GameRuntime.ts:104-108` — runtime boots straight into saved map or `village`.
- **Gap:** No New Game / Continue / Controls / Credits landing screen. No way to start fresh without clearing `localStorage` manually (`SaveManager.clearSave()` exists but isn't wired to UI).
- **Next step:** Add a `<MainMenu />` gating `<Game />` with Continue (enabled if `SaveManager.hasSave()`), New Game (prompts overwrite), Controls modal reusing shared bindings.

### A5. Objective-update toast (per step) — `partial`

- **Evidence:**
  - `@c:\Users\roxas\OneDrive\Desktop\PROJECTS\ortho-world-builder\src\game\domain\ProgressionService.ts:190-196` — quest **accept** notifies.
  - `@c:\Users\roxas\OneDrive\Desktop\PROJECTS\ortho-world-builder\src\game\domain\ProgressionService.ts:276-335` — quest **complete** notifies for pursuit/guard/merchant/grove/ranger.
  - Objective-step updates (e.g. `objectives[0] = "... ✓"`) do NOT emit a toast — see ProgressionService lines 296-301 (Oliver), 326 (merchant), 359-362 (blighted root), 411 (grove), 427-428 (ranger).
  - `@c:\Users\roxas\OneDrive\Desktop\PROJECTS\ortho-world-builder\src\lib\game\notificationBus.ts:19-58` — `notify()` supports `id` dedup, description, TTL — ready-made.
- **Gap:** Players see notifications only on quest accept/complete. Intermediate beats ("Manuscript fragment found", "Ranger trail entered") are silent.
- **Next step:** Emit `notify()` after each `objectives[i] = "... ✓"` mutation with `type: 'info'`, `id: "quest-step-{questId}-{i}"`, 3–4s duration.

### A6. Objective click → minimap ping — `stale (prop unused)`

- **Evidence:** `@c:\Users\roxas\OneDrive\Desktop\PROJECTS\ortho-world-builder\src\components\game\GameUI.tsx:109-118` — `CurrentObjective` accepts `onObjectiveClick` and renders `cursor-pointer` + `title="Click to view on minimap"`, but the caller at `@c:\Users\roxas\OneDrive\Desktop\PROJECTS\ortho-world-builder\src\components\game\GameUI.tsx:315-318` does not pass `onObjectiveClick`.
- **Gap:** UI implies a click action that does nothing.
- **Next step:** Wire it to open the minimap centered on the active marker, or remove the cursor/title to stop misleading users.

### A7. First-quest wording — `partial`

- **Evidence:**
  - `@c:\Users\roxas\OneDrive\Desktop\PROJECTS\ortho-world-builder\src\data\quests.ts:4-22` — objectives are sequential and directional. Good.
  - `@c:\Users\roxas\OneDrive\Desktop\PROJECTS\ortho-world-builder\src\data\dialogues.ts:34-49` — elder dialogue uses "run down old shack" while the in-world marker is "Disparaged Cottage".
  - `@c:\Users\roxas\OneDrive\Desktop\PROJECTS\ortho-world-builder\src\lib\game\MapMarkers.ts:68-71` — marker keywords include both "old shack" and "disparaged cottage".
- **Gap:** Player-facing naming is inconsistent — elder says "shack", map/markers say "Disparaged Cottage". Objective "Find the Disparaged Cottage" may not match the player's mental model built from dialogue.
- **Next step:** Standardize on either "run-down shack" or "Disparaged Cottage" across dialogue, quest text, and marker labels. Lean toward "Disparaged Cottage" since it's already the marker label and appears in content/campaign.

### A8. Debug / test scripts documented — `missing`

- **Evidence:** `@c:\Users\roxas\OneDrive\Desktop\PROJECTS\ortho-world-builder\package.json:6-18` — three content scripts (`audit:content`, `probe:hunter`, `simulate:cottage`) exist. README does not mention any of them.
- **Gap:** Valuable QA tools are effectively hidden.
- **Next step:** README section with purpose, inputs/outputs, when to run each. Optionally add one umbrella script `npm run verify:critical-path`.

### A9. Enemy role metadata — `missing`

- **Evidence:** `@c:\Users\roxas\OneDrive\Desktop\PROJECTS\ortho-world-builder\src\data\enemies.ts:17-35` — `EnemyBlueprint` has no `role` / `archetype` field. Grep for `role:` / `archetype` in `enemies.ts` returns no matches.
- **Gap:** Encounter authoring has no declarative archetype tag (chaser / ranged / snare / bruiser / elite / boss). This has to be inferred from stats + `behaviorOverrides`.
- **Next step:** Add an optional `role: EnemyRole` field (design metadata only — not runtime-consumed yet). Populates the AAA plan's "enemy role matrix" acceptance criterion.

### A10. Early-enemy combat readability tuning — `partial`

- **Evidence:**
  - `@c:\Users\roxas\OneDrive\Desktop\PROJECTS\ortho-world-builder\src\data\enemies.ts:37-335` — telegraph/recover/poise/stagger values exist for every enemy. Chain attacks, retreat-after-hit, snare-on-hit, poise-immune-first-hit, and ranged attacks are already wired.
  - Hollow Guardian, Ashen Reaver, Stone Sentinel, Skeleton Captain all have distinct tuning.
- **Gap:** No authored "encounter pod" tuning pass. First-impression enemies (wolf, plant, shadow_lurker) have defaults not explicitly tuned for a first-40-minutes readability pass (AAA M4 acceptance).
- **Next step:** After enemy-role metadata is in (A9), annotate each early enemy with expected punish-window length in ms and compare against `telegraphDuration + recoverDuration`. Target: player can attack once safely without trading on every single enemy.

### A11. Dev build / version label — `missing`

- **Evidence:** Grep for `VITE_APP_VERSION|APP_VERSION|build.*version` in `src/**` returns no matches. No overlay prints build info.
- **Gap:** Screenshots and bug reports have no context.
- **Next step:** Add a tiny `dev`-only footer overlay showing `mapId @ x,y · v{APP_VERSION}` when `import.meta.env.DEV` is true.

### A12. Campaign arc dev viewer — `stale (registry unused)`

- **Evidence:**
  - `@c:\Users\roxas\OneDrive\Desktop\PROJECTS\ortho-world-builder\src\content\campaign\registry.ts:1-11` — exports `campaignArcs` and `campaignArcById`.
  - `@c:\Users\roxas\OneDrive\Desktop\PROJECTS\ortho-world-builder\src\content\campaign\arcs\findHunter.ts:1-62` — the only authored arc.
  - Grep for `campaignArcs|campaignArcById` across `src/**` returns results only inside `registry.ts` itself.
- **Gap:** The campaign spine is authored but never consumed at runtime or by a dev tool. It will drift from actual quest/dialogue content.
- **Next step:** Add a dev-only campaign inspector panel (behind a debug key) that shows current arc + beat vs actual quest state, or have `scripts/audit.mts` cross-check arc `maps`/`items` against the real data modules.

---

## B. Systems Sweep

### B1. Runtime orchestration extraction — `partial`

- **Evidence:**
  - `@c:\Users\roxas\OneDrive\Desktop\PROJECTS\ortho-world-builder\docs\REFACTOR_BLUEPRINT.md:1-579` — full phased plan (Phase 0–7).
  - `src/game/runtime/` contains 54 files incl. `GameRuntime.ts`, `GameLoop.ts`, `RuntimeBootstrap.ts`, `RuntimeActionPhase.ts`, `RuntimeCombatActions.ts`, `RuntimeDialogueFlow.ts`, `RuntimeMapFlow.ts`, `RuntimeRestFlow.ts`, `RuntimeInteractionActions.ts`, `RuntimeSfx.ts`, etc.
  - `src/game/domain/` contains `ProgressionService.ts`, `InteractionSystem.ts`, `MapTransitionService.ts`, `AudioDirector.ts`, `VillageReactivity.ts`.
  - `@c:\Users\roxas\OneDrive\Desktop\PROJECTS\ortho-world-builder\src\components\Game.tsx:1-948` — still 948 lines, owns all runtime refs and ties subsystems together.
- **Gap:** Phases 0-4 look largely executed (runtime/domain/system scaffolding, `MapTransitionService`, `InteractionSystem`, `ProgressionService`, `AudioDirector`). Phase 5 (GameRuntime consolidation) is partial — `Game.tsx` is still heavy. Phase 6 (content split) is in progress — `content/regions/*` exists but `data/mapGenerator.ts` is still monolithic. Phase 7 (GameStore evolution) not obviously started.
- **Next step:** Continue Phase 5: move the dozens of `*Ref` mirrors currently in `Game.tsx` into a single `RuntimeSessionRefs` object passed to `setupGameRuntime`.

### B2. `shadow_castle` map scaffold — `missing`

- **Evidence:** Grep for `shadow_castle|Shadow Castle` across `src/**` returns **no results**. The AAA plan (`@c:\Users\roxas\OneDrive\Desktop\PROJECTS\ortho-world-builder\docs\AAA_EXECUTION_PLAN.md:190-195`) marks this as "In progress: `shadow_castle` map scaffold added and linked from Deep Woods".
- **Gap:** Plan is stale — no such scaffold exists in code. `data/maps.ts` only enumerates `village`, `forest`, `gilrhym`, interiors, and `interior_hollow_arena`.
- **Next step:** Update the AAA plan to reflect current truth, and either start a minimal `shadow_castle` map definition or explicitly defer M3.

### B3. Manual save / save-slot UI — `missing`

- **Evidence:**
  - `@c:\Users\roxas\OneDrive\Desktop\PROJECTS\ortho-world-builder\src\lib\game\SaveManager.ts:4-5` — single `SAVE_KEY = 'rpg_save_data'`, no slots.
  - `@c:\Users\roxas\OneDrive\Desktop\PROJECTS\ortho-world-builder\src\components\Game.tsx:432,506,512,521` — saves are triggered only by dialogue flow + certain actions.
  - No "Save" button in PauseMenu, BonfireMenu, or anywhere else.
- **Gap:** Players can't explicitly save, delete the save, or keep parallel runs.
- **Next step:** Low-friction pass: add a "Delete Save" button in PauseMenu (with confirmation). Deeper pass: multi-slot manager behind a settings menu.

### B4. Death overlay — no player choice — `partial`

- **Evidence:** `@c:\Users\roxas\OneDrive\Desktop\PROJECTS\ortho-world-builder\src\components\game\DeathOverlay.tsx:28-45` — auto-progresses through phases (fade-in → show → fade-out → complete) in a fixed 2.8s. Skippable only after 1s.
- **Gap:** No "Respawn" explicit button, no "Return to title", no meta-info about last bonfire.
- **Next step:** Show last bonfire name and allow `Enter` to skip. Consider a "Return to Main Menu" option once A4 exists.

### B5. Transition overlay polish — `partial`

- **Evidence:** `@c:\Users\roxas\OneDrive\Desktop\PROJECTS\ortho-world-builder\src\components\game\TransitionOverlay.tsx:13-22` — 2.2s hardcoded. No skip. No loading spinner if map is still generating.
- **Gap:** Long map generation could desynchronize overlay end and actual availability.
- **Next step:** Drive overlay end from a "map ready" promise, not a fixed timer.

### B6. Notification history viewer — `missing`

- **Evidence:** `@c:\Users\roxas\OneDrive\Desktop\PROJECTS\ortho-world-builder\src\lib\game\notificationBus.ts:16` — `MAX_HISTORY = 12` stored but only 3 are shown (`@c:\Users\roxas\OneDrive\Desktop\PROJECTS\ortho-world-builder\src\components\game\NotificationFeed.tsx:33`).
- **Gap:** Recently missed notifications are unrecoverable.
- **Next step:** Optional: a small "Recent" popover from the top bar showing the last 12 entries with timestamps.

### B7. Pause menu — shows quest title, not active objective — `partial`

- **Evidence:** `@c:\Users\roxas\OneDrive\Desktop\PROJECTS\ortho-world-builder\src\components\game\PauseMenu.tsx:25-30` receives `questSummary` which `Game.tsx:897` passes as `activeQuestTitle`. Under the "Current Objective" label, it prints the quest's **title**, not its active objective step.
- **Gap:** Label says "Current Objective", content is the quest title. Misleading.
- **Next step:** Pass the first not-checked objective string instead. One-line change plus a helper.

### B8. Tests coverage — `partial`

- **Evidence:**
  - `@c:\Users\roxas\OneDrive\Desktop\PROJECTS\ortho-world-builder\src\lib\game\__tests__\AssetManager.registry.test.ts:1` — single test file under `src`.
  - `package.json:13-14` — Vitest configured.
- **Gap:** Core modules with no tests: `SaveManager`, `ProgressionService`, `InteractionSystem`, `MapTransitionService`, `notificationBus`, `mapGenerator`, `World`, `Combat`.
- **Next step:** Start with unit tests for `SaveManager` migrations and `notificationBus.notify` dedup — both are pure, high-value, and small.

### B9. TODO / FIXME markers — `clean`

- **Evidence:** Grep for `TODO|FIXME|HACK|XXX` with word boundaries in `src/**`. The matches returned were coincidental substrings inside content strings (e.g. "run down old shack", "south quadrant"), not actual code markers.
- **Gap:** None. Notable discipline.

### B10. `CurrentObjective.onObjectiveClick` dead prop — `stale`

- **Evidence:** See A6. Declared at `GameUI.tsx:109`, never passed at `GameUI.tsx:317`.
- **Next step:** Wire or remove.

### B11. Critical path items visuals — `done`

- **Evidence:** `@c:\Users\roxas\OneDrive\Desktop\PROJECTS\ortho-world-builder\src\data\criticalPathItems.ts:14-33` — `hunter_clue` and `hollow_manuscript` have glow/halo/sprite scale/bob configured. Loader wiring verified in `Game.tsx:53-63`.

### B12. Bonfire rest / fast travel / level up — `done`

- **Evidence:** `@c:\Users\roxas\OneDrive\Desktop\PROJECTS\ortho-world-builder\src\components\game\BonfireMenu.tsx:1-290` — full three-view menu (main, level-up with Vigor/Endurance/Strength, fast-travel).

### B13. Vendor system — `done`

- **Evidence:** `LazyVendorModal` + `interactionContent.vendors` in `Game.tsx:51-78, 859-871`. Dialogue `opensVendor` flag fully wired through `ProgressionService`.

### B14. Audio system — `done`

- **Evidence:** `@c:\Users\roxas\OneDrive\Desktop\PROJECTS\ortho-world-builder\src\game\domain\AudioDirector.ts:12-358` — audio context, compressor+master gain, music director with map-based tracks, sequential + random pools, per-enemy walk/defeat pools with cooldowns.

### B15. Weather / day-night / biome ambience — `done`

- **Evidence:** Classes exist at `src/lib/game/WeatherSystem.ts`, `DayNightCycle.ts`, `BiomeAmbience.ts` and are instantiated in `GameRuntime.ts:98-101`.

### B16. Transition debug + collision debug — `done`

- **Evidence:**
  - `@c:\Users\roxas\OneDrive\Desktop\PROJECTS\ortho-world-builder\src\game\runtime\RuntimeKeyboardInput.ts:184-200` — `V` hotkey toggles transition debug with notify feedback.
  - `@c:\Users\roxas\OneDrive\Desktop\PROJECTS\ortho-world-builder\src\components\Game.tsx:740-804` — UI panels for transition + collision (`B`) debug. Collision debug shows tile grid, probes, samples.

### B17. Map preloading / deferred definitions — `done`

- **Evidence:** `@c:\Users\roxas\OneDrive\Desktop\PROJECTS\ortho-world-builder\src\data\maps.ts:56-124` — `gilrhym` is lazy-loaded via dynamic import; `preloadMap` idle-prefetches the saved start map from `Game.tsx:432-435`.

### B18. Save version + migrations — `done`

- **Evidence:** `@c:\Users\roxas\OneDrive\Desktop\PROJECTS\ortho-world-builder\src\lib\game\SaveManager.ts:5` — `SAVE_VERSION = 5` with migrations from v1-v4 at lines 82-120.

### B19. Controls discoverability (first-run hint) — `missing`

- **Evidence:** No first-time prompt, pulse, or tooltip pointing new players at the collapsed `?` Controls button.
- **Next step:** On first load (no save or `firstRun` flag), auto-open the controls panel for 4s or add a brief pulse animation on the `?` button.

---

## Cross-Cutting Findings

- **Duplicated control bindings** between `GameUI.tsx:399-443` and `PauseMenu.tsx:34-55` — single source-of-truth needed.
- **AAA plan drift** — `docs/AAA_EXECUTION_PLAN.md` references `shadow_castle` as scaffolded but it isn't in code. Plan should be marked stale or reconciled.
- **Campaign registry drift** — `src/content/campaign/registry.ts` is declarative content the runtime never reads.
- **Gilrhym / Ashen Reaver / Ashen Court are fully implemented** — the Act 2 boss content exists (evidence in `enemies.ts:285-305`, dialogues.ts elder `heretical_pursuit_active` / `after_reaver` nodes, `gilrhymDef` deferred map). So current playable scope is Act 1 + Act 2; Act 3 (Shadow Castle) is the real gap.
- **`Game.tsx` still huge** — 948 lines carrying ~30 refs and runtime wiring. Prime target for continued REFACTOR_BLUEPRINT Phase 5.
- **No product version wiring** — `package.json:4` is `"version": "0.0.0"`. No `VITE_APP_VERSION` used.
- **Tests extremely sparse** — pure domain modules (SaveManager, notificationBus) are low-cost to cover.

---

## Things That Are Surprisingly Polished

These didn't need follow-up and are worth not regressing:

- Accessibility on the controls panel (`aria-expanded`, `aria-controls`, `role="region"`).
- `notify()` dedup via `id` key preventing spam.
- Save migrations across four prior versions.
- Bonfire fast-travel filtered to kindled bonfires + current-location detection.
- Enemy SFX pools with per-type walk cadence and proximity culling (36 squared-unit radius).
- Runtime fatal-error overlay with stack trace.
- Critical-path items have bespoke visual tuning per item.
