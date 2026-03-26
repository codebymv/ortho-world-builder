# Ortho World Builder: AAA Execution Plan

## Goal
Deliver an unmistakably premium action-adventure experience inspired by Souls/Bloodborne structure:
- Clear macro destination and world mystery
- Tight combat readability and intentional encounters
- Interconnected pathing with unlockable shortcuts
- Cohesive progression and map-state reliability

This plan is scoped for indie execution with AAA-level craft standards.

## Current Baseline (Observed)
- Strong early loop exists: hub -> woods -> cottage -> elder turn-in.
- Critical friction points:
  - Cottage transition reliability and spawn alignment regressions.
  - Visual overlap/ordering issues for large cottage facade + doors.
  - Shadow Castle is implied in Deep Woods but not a distinct destination map.
  - Early critical path can feel flat after first quest turn-in.

## Design Pillars
1. World Legibility
- Player always knows one long-term goal and one immediate next step.
- Landmarks are visible before they are reachable.

2. Combat Readability
- Every enemy attack has consistent telegraph, punish window, and impact feedback.
- Encounter compositions are authored, not random noise.

3. Meaningful Progression
- Milestones unlock routes, systems, and build identity.
- Hub reflects world progress after each major beat.

4. Robust Traversal
- No dead-end transitions or inconsistent spawn placements.
- Shortcuts loop back to safety and reduce runback fatigue.

## Milestone Roadmap

### M1: Transition/Pathing Stability (Week 1)
Objective: eliminate progression-breaking movement/entry regressions.

Deliverables
- Deterministic cottage door placement and interaction anchors.
- Consistent interior <-> exterior spawn alignment.
- Collision-safe structure stamping for all cottage variants.
- Debug overlays to inspect interactables, blockers, and transitions.

Core files
- `src/data/mapGenerator.ts`
- `src/data/maps.ts`
- `src/lib/game/World.ts`
- `src/components/Game.tsx`

Acceptance Criteria
- 10 fresh new-game runs with no failed cottage entry/exit.
- No spawn-on-roof or blocked-by-structure events in known cottages.
- No facade patch/cutout artifacts in Greenleaf and Whispering Woods cottages.

### M2: Whispering Woods Re-Authoring (Weeks 2-3)
Objective: create true exploration flow with deliberate risk/reward lanes.

Deliverables
- Reposition hunter cottage deeper into woods with stronger approach path.
- Add one optional danger lane and one safe-but-long lane.
- Add 2 unlockable shortcuts that fold to a central safe route.
- Introduce whispering-specific cottage visual language.

Core files
- `src/data/maps.ts`
- `src/data/mapGenerator.ts`
- `src/data/tiles.ts`
- `src/lib/game/AssetManager.ts`

Acceptance Criteria
- First-time player can verbally describe the “safe path” and “risk path”.
- Hunter cottage remains reachable and readable under combat pressure.
- Cottage in Whispering is visibly distinct from Greenleaf cottage.

### M3: Shadow Castle Vertical Slice (Weeks 4-6)
Objective: turn “Shadow Castle” into a real destination dungeon.

Deliverables
- New `shadow_castle` map with entrance, mid-loop shortcut, and boss arena.
- Deep Woods route that visually foreshadows castle before entry.
- Boss gate that uses explicit progression condition(s), not hidden state.
- Return-to-hub consequence after castle milestone.

Core files
- `src/data/maps.ts`
- `src/data/mapGenerator.ts`
- `src/lib/game/MapMarkers.ts`
- `src/data/dialogues.ts`
- `src/data/quests.ts`

Acceptance Criteria
- Shadow Castle appears as a named map destination with clear ingress.
- One completed run from elder objective to castle entry without confusion.
- New shortcut unlocked from interior of castle to reduce return friction.

### M4: Combat and Encounter Craft (Weeks 7-8)
Objective: remove “prototype combat” feel and enforce encounter intent.

Deliverables
- Enemy role matrix (chaser/flanker/ranged/elite) for each biome.
- Telegraph/impact standards (timings, FX, hitpause, audio layers).
- Re-authored encounter pods at forks/chokes/open clearings.
- Mini-boss pass for one woods and one castle encounter.

Core files
- `src/data/enemies.ts`
- `src/components/Game.tsx`
- `src/lib/game/Combat.ts`
- `src/lib/game/ParticleSystem.ts`
- `src/lib/game/AssetManager.ts`

Acceptance Criteria
- 80%+ of test players can identify safe punish windows after 1 attempt.
- No unavoidable damage in base route encounters.
- At least 3 standout encounter moments in first 40 minutes.

### M5: Presentation and UX Polish (Weeks 9-10)
Objective: raise overall production quality and moment-to-moment clarity.

Deliverables
- Biome-specific audio layering and ambience transitions.
- Stronger objective wording + minimap guidance prioritization.
- Contextual interact cues (entrance labels, quest-sensitive hints).
- Camera/event polish for portals, bosses, and major discoveries.

Core files
- `src/components/game/GameUI.tsx`
- `src/components/game/Minimap.tsx`
- `src/components/game/NotificationFeed.tsx`
- `src/lib/game/BiomeAmbience.ts`
- `src/lib/game/WeatherSystem.ts`
- `src/components/Game.tsx`

Acceptance Criteria
- New players can complete first two critical objectives without external guidance.
- Subjective quality score improves in playtest rubric for clarity and immersion.

## Progression Structure Target

Act 1 (Hub + Woods)
- Elder briefing -> Woods exploration -> Hunter cottage journal -> Elder return.
- Unlock: deeper lanes + stronger enemy archetypes + castle foreshadow.

Act 2 (Deep Woods + Castle Approach)
- Witch lore + shadow escalation + route to Shadow Castle.
- Unlock: castle ingress and first major shortcut web.

Act 3 (Shadow Castle)
- Multi-lane interior, shortcut mastery, boss confrontation, world-state payoff.

## Engineering Guardrails
- No map feature merges without transition validation checklist.
- No new interior without explicit entry/exit coordinate tests.
- All map interaction IDs must be unique and grep-verifiable.
- Save migrations required for removed/renamed items or maps.

## QA Test Matrix (Every Milestone)
- New game pathing test (critical route)
- Save/load mid-quest test
- Death/respawn near transition test
- Interior-enter/exit reliability test
- Minimap marker correctness test

## Immediate Sprint Backlog (Start Now)

1. Lock cottage reliability as a system
- Add a dedicated helper in map generation for cottage entrance geometry + interaction stamping.
- Remove duplicate/competing stamps that can overwrite door/interior transitions.
Status
- In progress: cottage anchor math was centralized in `placeCottage` so entry/sprite/front coordinates come from one deterministic source.

2. Build transition debug mode
- Hotkey to display transition tiles, interact radius, and spawn targets.
- Add map/id labels for quick screenshot triage.
Status
- In progress: map-generation transition validation warnings added (missing portal transitions / missing building entrances).
- Completed first pass: runtime transition debug toggle (`V`) added with in-world markers and a live diagnostics panel.

3. Whispering hunter cottage relocation pass
- Move farther from portal lane and reinforce approach path.
- Keep entry/exit coordinates consistent with visible doorway cue.
Status
- In progress: hunter cottage moved deeper into Whispering Woods and interior return target updated to land near front approach.
- In progress: first-quest guidance is being tightened around the Disparaged Cottage / Hunter's Manuscript route so the early critical path reads as a named destination, not a vague search.

4. Shadow Castle discovery setup
- Add landmark signposting in Deep Woods and map marker references.
- Prepare map definition scaffold for `shadow_castle` destination.
Status
- In progress: `shadow_castle` map scaffold added and linked from Deep Woods via dedicated portal route.
- In progress: marker/location keyword coverage added for Shadow Castle discovery.

## Definition of AAA-Ready (Project Level)
- No critical-path blocker bugs across 20 consecutive fresh runs.
- Distinct regional identity in visuals, encounters, and traversal.
- At least one memorable “wow” reveal in each act.
- Strong return-to-hub cadence with noticeable world reactivity.
