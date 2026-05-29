# Whispering Woods — Enemy Dispersion & Placement Audit

Read-only audit of how enemies are **placed** on the forest map and how that interacts with **combat balance**, bonfire pacing, and the main progression spine. Complements [BALANCE_AUDIT.md](./BALANCE_AUDIT.md) (numeric tuning) and [WHISPERING_WOODS_DEEP_DIVE.md](./WHISPERING_WOODS_DEEP_DIVE.md) (level design).

**Source:** `src/content/regions/whispering_woods/map.ts` (`enemyZones`, lines 1949–2101)  
**Stats:** post–P0 trash tuning in `src/data/enemies.ts` (wolf 85 HP / 48 poise, spider 70, skeleton 110, etc.)

---

## Executive summary

**Dispersion is mostly good; balance pain comes from a handful of spine chokepoints and checkpoints that lag behind difficulty spikes — not from total enemy count.**

**Post-audit cleanup:** the river-crossing stack called out below has been collapsed into a 3-enemy undead guard (`skeleton x2` + `skeleton_captain x1`), the west Sentinel pair has moved off the pre-Iron-Gate shelf, Hollow Reaver flats were reduced from 8 to 5, and the forest now has no overlapping enemy-zone boxes.

| Verdict | Detail |
|---------|--------|
| **Strengths** | Quadrant/POI anchoring, staged Hollow corridor, elite singletons at landmarks, intentional removal of cliff-only dead zones |
| **Weaknesses** | South checkpoint gap, remaining Hollow Reaver projectile reach risk, wolf/roamer sameness in east filler |
| **Post-P0 impact** | Longer trash TTK makes overlapping patrols and multi-zone boxes **more** punishing than before |

---

## 1. Scale & composition

| Metric | Value |
|--------|------:|
| Zone entries | 67 |
| Total spawn count (`count` sum) | 205 |
| Map footprint | 300×300 tiles |
| Bonfires on map | 8 (+1 registry-only overlook) |

### By enemy type (spawn-weighted)

| Type | Count | Role on map |
|------|------:|-------------|
| wolf | 59 | Default roamer — south spine, mid-forest, lakeside |
| plant | 34 | Optional grove / shrine filler — low lethality, high count |
| spider | 30 | SW nest + east lakeside |
| skeleton | 26 | Destroyed villages, temple, river approach |
| shadow | 16 | NE/NW Hollow-flavored packs |
| shadow_lurker | 12 | **Hollow corridor** — best-staged encounters |
| slime | 8 | South creek, bridge margins |
| hollow_reaver | 6 | Hollow flats + corridor — ranged pressure |
| golem | 5 | Field bosses at POIs |
| stone_sentinel | 4 | Fort sanctum, observatory |
| armored_wolf | 2 | Hollow approach shelf |
| ridge_revenant | 1 | East ridge skill check |
| skeleton_captain | 1 | River stack (see §4) |
| corrupted_giant | 1 | NW optional boss |

**Takeaway:** ~28% of all spawns are wolves in generic roam zones. That keeps the map populated but makes east/south filler feel samey compared to the authored Hollow corridor.

### By progression band (y-axis, spawn-weighted)

| Band | y range | Spawns | Notes |
|------|---------|-------:|-------|
| Entry | 270–300 | 27 | Portal → first bridge; mostly safe walk |
| South spine | 220–270 | 57 | Main path density ramps here |
| Mid / artery | 175–220 | 49 | Iron Gate bonfire, cottage loop, Sentinels |
| North mid | 100–175 | 54 | River crossing, fort, observatory |
| Hollow north | 0–100 | 57 | Highest pressure — intentional |

Progression **does** ramp northward on paper. The problem is **local spikes** on the spine that sit **before** the next bonfire, not absent northward escalation.

---

## 2. Dispersion model — what works

### 2.1 Quadrant + POI anchoring

Comments in `map.ts` explicitly spread zones by quadrant to avoid north-gate pile-ups. Anchors align with content:

- **SW:** spider nest `(20,240)` + perimeter — matches `spider_nest` camp
- **NE/NW:** shadow/wolf packs — Hollow corruption flavor
- **SE:** plant shrine `(246,246)`, ranger cottage `(236,227)`, lakeside spiders
- **Singleton elites:** golems, sentinels, ridge revenant, corrupted giant at named POIs

This is correct Souls-like placement: **danger at landmarks**, not random uniform noise.

### 2.2 Hollow corridor (gold standard)

Staged `shadow_lurker` bands at y ≈ 62 → 50 → 34 → 21 plus corridor `hollow_reaver` at `(118,30)`:

- Hard funnel (dead trees, cliffs) — no flanking
- Density ramps toward fog gate
- Melee + ranged mix at gate approach
- Matches bonfire-to-boss dungeon pacing

**Balance note:** Placement intent is excellent. Frustration here is mostly **Reaver projectile reach (~11 tiles) vs fixed orthographic camera**, not pack size.

### 2.3 Surgical zone tuning

Examples of good placement hygiene already in data:

- Sentinels use 1×1 zones + comments to prevent roaming off cliff shelf
- SW golem moved from `y:284` → `y:255` to avoid spawn-adjacent death trap
- East ridge wolf zone removed (97% unwalkable cliff)
- Armored wolves: `patrolRadius: 0.8` on narrow stair landing

---

## 3. Dispersion problems

### 3.1 Bonfire lag on the south spine

| Checkpoint | Tile | Distance from portal |
|------------|------|----------------------|
| Forest Clearing | (150, 250) | ~40 tiles from portal — true first woods checkpoint |
| Iron Gate | (134, 208) | ~45 tiles from Forest Clearing |

First mandatory combat cluster: **bridge wolves** at `(140, 267)` — 2 wolves after a short entry walk, with Forest Clearing now deeper on the south spine.

**Balance interaction:** After P0, wolves take ~4+ hits. A double wolf pull at the bridge is a fair first test; relocating Forest Clearing means deaths before Iron Gate no longer repeat the full portal-to-Iron-Gate run.

### 3.2 Difficulty spike *before* checkpoint (Stone Sentinels, fixed)

| Entity | Tile | Bonfire relative |
|--------|------|------------------|
| Stone Sentinel ×2 | (181,190), (204,190) | Deeper cliff sanctum route |
| Damage | 36 (slab mult → ~49) | Likely 2-shot on level 1 |

Previously, players exploring the cottage bypass loop could hit **endgame-tier sentinels** while still hunting their first real bonfire. That has been fixed: the old west shelf now uses `cliff_sanctum_warning` and `highland_garrison_remains` to foreshadow the threat, while the Sentinels guard a deeper cliff sanctum route.

### 3.3 Main-spine chokepoint stacking — `(142, 90)` corridor (fixed)

This issue has been fixed. Previously, the river-crossing approach had overlapping boxes:

```
(142, 90, 16×14): skeleton×2 + skeleton_captain×1 + slime×1  → 4 enemies
(148,  88,  8×6): skeleton×1 + slime×1                        → 2 enemies
(140,  88,  8×6): wolf×2                                      → 2 wolves (authored pod)
```

Up to **8 hostiles** could converge on a **16-tile-wide funnel** just south of the Hollow river (`y ≈ 80–95`). No faction behavior — all aggroed player.

Current state: one deliberate undead guard (`skeleton x2` + `skeleton_captain x1`) protects the south bank. There are no overlapping enemy-zone boxes left in Whispering Woods.

**Recommendation:** no further action needed for this specific stack unless playtesting shows the captain still feels too high-pressure before the bridge.

### 3.4 Hollow Reaver flats vs camera (reduced)

Previously, eight Reavers in open tiles `(140–178, y:28–38)` plus one corridor Reaver could stack too much ranged pressure:

- `chaseRange: 7.5`, projectile speed 7 t/s, lifetime 1.6 s → **~11 tile reach**
- Open flats = multiple off-screen shooters on approach to `y < 75`

Current state: open-flat Reavers are reduced from 8 to 5, while the single corridor Reaver remains. If playtesting still shows off-screen deaths, the next fix should be an on-screen-only fire gate or projectile lifetime clamp.

### 3.5 East void — dispersion without intent

`x > 250`, `y: 100–200`: generic wolf/spider zones, cliffs, sparse chests. Spawn weight SE quadrant (65) matches SW (65), but **SE lacks authored pods** except shrine plants and observatory compound.

Compare to Hollow corridor: same spawn budget, **lower design intent per spawn**.

### 3.6 Roamer redundancy

Mid-forest wolf zones at `(90,94)`, `(198,106)`, `(216,68)`, `(278,92)` etc. prevent empty walks (good) but duplicate the same encounter fantasy (good after P0 TTK, repetitive over 300 tiles).

---

## 4. Placement ↔ balance matrix

How **where** enemies sit affects **how long** fights feel after P0 (20 ATK, 3-hit combo ≈ 44 dmg per string, ~0.5 s recovery):

| Location | Enemies | Expected pull | TTK @ P0 | Bonfire nearby? | Placement grade |
|----------|---------|---------------|----------|-----------------|-----------------|
| Bridge y=267 | 2 wolf | 1–2 | ~8–10 hits total | Clearing only | B — fair fight, bad checkpoint |
| South spine y=252–278 | wolf×3, slime×5, wolf×2 | 2–4 | Mixed | None until 208 | B- — split helps, still long run |
| River guard y=90 | captain + 2 skel | 2–3 | ~8–10 hits | Corrupted Bridge 32t north | B — fixed choke |
| Sentinels y=190 | 2 sentinel | 1–2 | Minutes | Cliff Ledge route | B — moved past early checkpoint pressure |
| Hollow corridor | 10 lurker + 1 reaver | 1–2 at a time | Staged | Deep Hollow | **A** — best on map |
| Hollow flats | 5 reaver | 1–3 ranged | Long + chip | Deep Hollow | B- — reduced camera unfairness |
| Observatory | 2 sentinel + golem + faction | 3–6 | Boss-tier | Fort passage | B+ — optional POI |
| Corrupted Giant | 1 | 1 | Boss fight | Deep Hollow ~22t | B — optional if telegraphed |

---

## 5. Prioritized recommendations

### P0 — Spine surgery (placement + balance)

| ID | Action | Tiles | Rationale |
|----|--------|-------|-----------|
| E1 | **Collapse river-crossing stacks** to one 3-enemy undead guard | (142,90), (150,90) | **Complete** |
| E2 | **Move or telegraph Sentinels** — relocated deeper and added danger props on old shelf | y=185–203 | **Complete** |
| E3 | **Cap Reaver engagement** — reduced open flats from 8→5; keep corridor Reaver | y=28–38 | **Complete** |

### P1 — Pacing alignment

| ID | Action | Rationale |
|----|--------|-----------|
| E4 | Move Forest Clearing north to `(150,250)` | **Complete** |
| E5 | Replace 2 east-void wolf roam zones with 1 authored mini-POI pod (3 enemies + 1 chest) | Intent per spawn |

### P2 — Polish

| ID | Action | Rationale |
|----|--------|-----------|
| E6 | Diversify east filler: swap one wolf zone for skeleton×2 + shadow×1 | Break wolf monotony |
| E7 | Add `role: 'spine' \| 'optional' \| 'boss'` metadata to zones (see BALANCE_AUDIT P3-3) | Tooling for future audits |
| E8 | Automated overlap test: fail CI if >N zone boxes share origin without `authoredPod` flag | Prevent (142,90) regressions |

---

## 6. Overall opinion

**The map’s enemy dispersion philosophy is sound** — quadrant spread, POI-tied packs, staged Hollow corridor, and elite singletons are all correct Souls-like patterns. The team already fixed several placement sins (golem away from spawn, cliff wolf zone removed, sentinel roam tightened).

**What hurts balance is not “too many enemies” (205 zone spawns on 90k tiles is reasonable)** but:

1. **Three zone boxes on one river choke** turning a progression gate into a raid boss. **Fixed.**
2. **Sentinels placed optimistically on the bypass loop before the first real bonfire. Fixed.**
3. **Reaver flats treating open terrain like a corridor** in a fixed-camera game. **Reduced.**
4. **Bonfire spacing on the south spine** amplifying any of the above into long death runs.

After P0 combat tuning, trash fights last long enough that **placement mistakes matter more**, not less. E1–E3 are now addressed; remaining playtests should focus on death-run pacing and whether Reaver projectile reach still needs a code-level gate.

---

## 7. Suggested playtest script

1. Fresh save → village → woods portal → confirm Forest Clearing sits at `(150,250)` and shortens deaths before Iron Gate.
2. Cottage bypass loop → confirm old west shelf reads as warning/remains rather than an elite ambush.
3. Main spine river crossing at (142,90) → confirm max simultaneous aggro is the undead guard, not a mixed pileup.
4. Corrupted Bridge bonfire → walk into Hollow flats → note whether reduced Reaver density still causes off-screen projectile deaths.
5. Hollow corridor only → compare fairness vs flats (should feel dramatically better).

---

*Generated from zone data analysis + cross-reference to existing balance/deep-dive docs. No map files modified.*
