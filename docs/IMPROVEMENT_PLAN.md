# Ortho World Builder — Improvement Plan

Prioritized follow-ups derived from `AUDIT_FINDINGS.md`. Effort is measured in developer-days at a single-developer pace. Impact reflects player-facing or development-velocity value.

## Prioritization Matrix

```
             LOW EFFORT            MED EFFORT           HIGH EFFORT
HIGH  ┌───────────────────────┬─────────────────────┬──────────────────┐
IMPACT│ A1 README             │ A4 Main menu        │ B1 Runtime Ph5   │
      │ A5 Objective toast    │                     │ B8 Test coverage │
      │ A8 Script docs        │                     │                  │
      │ B7 Pause objective fix│                     │                  │
      ├───────────────────────┼─────────────────────┼──────────────────┤
MED   │ A3 Controls dedupe    │ A9 Enemy roles      │ A10 Combat pass  │
IMPACT│ A7 Quest naming       │ B3 Save UI          │ B2 Shadow Castle │
      │ A12 Arc drift script  │ A12 Arc viewer      │                  │
      │ B19 First-run hint    │                     │                  │
      ├───────────────────────┼─────────────────────┼──────────────────┤
LOW   │ A6/B10 Dead prop      │ B6 Notif history    │                  │
IMPACT│ A11 Version label     │                     │                  │
      │ B4 Death polish       │                     │                  │
      │ B5 Transition skip    │                     │                  │
      └───────────────────────┴─────────────────────┴──────────────────┘
```

---

## Top 5 Do Next

Small, high-value, can realistically ship in one sitting each.

### 1. Replace the README — `A1`

- **Why:** Every new contributor / screenshot reviewer hits this first.
- **Acceptance:**
  - Game pitch (2–3 lines).
  - Controls table.
  - `npm run dev` / build / test.
  - "Dev scripts" block referencing `audit:content`, `probe:hunter`, `simulate:cottage`.
  - "Debug hotkeys" block (`V` transition debug, `B` collision debug).
- **Effort:** XS.

### 2. Pause menu — show actual active objective — `B7`

- **Why:** Label says "Current Objective" but currently prints the quest title. One-line correctness fix.
- **Acceptance:** In `Game.tsx`, pass `firstActiveQuest.objectives.find(o => !o.includes('✓'))` instead of `activeQuestTitle`.
- **Effort:** XS.

### 3. Objective-step toasts — `A5`

- **Why:** Players already get notifies on quest accept/complete. Adding per-step adds the most perceived "polish" for the least work.
- **Acceptance:**
  - New helper `notifyObjectiveAdvanced(quest, newObjectiveIndex)` in `ProgressionService`.
  - Called at every existing `objectives[i] = "... ✓"` site (search ProgressionService for `✓` / `\u2713`).
  - Uses `id: "quest-step-{questId}-{i}"` and `type: 'info'`, duration 3500ms.
- **Effort:** S.

### 4. Controls single-source-of-truth — `A3`

- **Why:** Two maintained lists will drift. Also enables extending with icons/grouping in one place.
- **Acceptance:**
  - `src/components/game/controlBindings.ts` exporting `CONTROL_GROUPS: { title: string; bindings: { keys: string; action: string }[] }[]`.
  - `GameUI.tsx` and `PauseMenu.tsx` render from it.
  - Snapshot test covering expected bindings.
- **Effort:** S.

### 5. Dev-only version + position footer — `A11`

- **Why:** Every screenshot and bug report becomes 10× more actionable.
- **Acceptance:**
  - Footer in bottom-right: `{mapId} @ {x.toFixed(1)},{y.toFixed(1)} · v{import.meta.env.VITE_APP_VERSION ?? 'dev'}`.
  - Only rendered when `import.meta.env.DEV`.
- **Effort:** XS.

---

## Suggested First Sprint (one-pass, ~1 day)

Do these together. They are small, low-risk, and lift overall polish noticeably.

1. README rewrite (**A1**).
2. Pause menu objective fix (**B7**).
3. Objective-step toasts (**A5**).
4. Wire or remove `onObjectiveClick` (**A6 / B10**).
5. Quest naming consistency — "Disparaged Cottage" across dialogue, marker, quest text (**A7**).
6. Fix AAA plan staleness about `shadow_castle` (**B2** partial — just reconcile the plan).

---

## Medium-Term Backlog

Grouped by system.

### Onboarding & UX

- **A4 Main menu / continue screen** — New Game / Continue / Controls / Credits. Continue disabled if `!SaveManager.hasSave()`.
- **B19 First-run hint** — auto-open controls panel or pulse the `?` button on first play (no save present).
- **A3 Controls panel** polish after the dedupe — add grouping + small icons.
- **B4 Death overlay** — show last bonfire, allow `Enter` skip, optional "Return to Main Menu".
- **B5 Transition overlay** — tie fade-out to "map ready" promise instead of fixed timer.

### Progression & Content

- **A7 Quest naming consistency** — single canonical name across dialogue/markers/quests.
- **A12 Campaign arc drift check** — extend `scripts/audit.mts` to verify each `CampaignArc` references existing map/quest/item IDs. Small, but immediately useful.
- **A12 Campaign dev viewer** — behind a debug key, overlay arc/beat vs actual quest state.
- **B2 Shadow Castle minimal scaffold** — either start an `interior_shadow_castle` map or cleanly defer M3 in the AAA plan.

### Combat

- **A9 Enemy role metadata** — add optional `role: 'chaser' | 'bruiser' | 'ranged' | 'snare' | 'elite' | 'boss'`.
- **A10 First-40-minutes readability pass** — after A9, tune early enemy telegraph/recover targets against a "safe-punish window" standard.
- **Targeted encounter authoring** — formalize a few pod compositions at forks/chokes (AAA M4).

### Persistence & Safety

- **B3 Delete Save / Multi-slot** — pass 1: delete button in PauseMenu. Pass 2: slot manager under Main Menu.
- **B8 Tests** — unit tests for `SaveManager` migrations and `notificationBus.notify` dedup first. Then `ProgressionService` quest-acceptance / objective advancement.

### Runtime & Architecture

- **B1 REFACTOR_BLUEPRINT Phase 5** — consolidate `Game.tsx` ref soup behind a `RuntimeSessionRefs` object.
- **B1 Phase 6** — split `src/data/mapGenerator.ts` into terrain/placers/validators submodules.
- **B1 Phase 7** — start wrapping direct `state.player.*` mutations with domain methods when touching those files for other reasons (opportunistic).

### Nice-to-Have

- **B6 Notification history popover** from the top bar.
- **A6/B10** — remove `onObjectiveClick` or wire it to open the Map modal centered on the active marker.

---

## Deferred / Not Worth Doing Now

- **Full save-slot UI with cloud sync.** Not needed for a single-player prototype.
- **Per-biome dynamic weather authoring.** Current `WeatherSystem` is sufficient for the roadmap.
- **Replacement of `GameState` with a reducer.** Explicitly discouraged by REFACTOR_BLUEPRINT Risk 4.
- **New boss content for Shadow Castle.** Do the map scaffold + approach signposting first (M3).

---

## Effort & Impact Cheat Sheet

| Task | Effort | Impact | When |
|---|---|---|---|
| A1 README | XS | high | now |
| B7 Pause objective fix | XS | med | now |
| A5 Objective-step toasts | S | high | now |
| A11 Dev footer | XS | low | now |
| A3 Controls dedupe | S | med | sprint 1 |
| A7 Quest naming | XS | med | sprint 1 |
| A6/B10 Dead prop | XS | low | sprint 1 |
| A8 Script docs | XS | med | sprint 1 |
| A9 Enemy roles | S | med | sprint 2 |
| A12 Arc audit script | S | med | sprint 2 |
| B19 First-run hint | XS | med | sprint 2 |
| B3 Delete save button | S | med | sprint 2 |
| A4 Main menu | M | high | sprint 3 |
| A12 Arc dev viewer | S | med | sprint 3 |
| B4 Death polish | S | low | sprint 3 |
| B8 Save/notify unit tests | S | med | sprint 3 |
| A10 Combat readability | M | med | sprint 4 |
| B1 Phase 5 runtime refs | L | high | sprint 4+ |
| B2 Shadow Castle scaffold | L | med | sprint 4+ |

---

## Guardrails When Executing

- No edits to `docs/AAA_EXECUTION_PLAN.md` or `docs/REFACTOR_BLUEPRINT.md` without user review — they are authored plans, not living docs.
- Keep content strings as the single source of naming (don't fork "Disparaged Cottage" into two lookup paths).
- Preserve existing `notify()` `id` prefixes so dedup continues to work across reloads.
- Every refactor pass should leave the game runnable at the end of the pass.
- Do not add new TODO markers without a tracked follow-up.
