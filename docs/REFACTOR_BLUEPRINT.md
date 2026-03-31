# Ortho World Builder Refactor Blueprint

## Purpose

This document defines the target architecture for refactoring the game toward a more extendible, system-oriented structure with explicit orchestration and smaller module boundaries.

The immediate goal is not to rewrite the entire game engine. The goal is to:

- reduce the responsibility load of `src/components/Game.tsx`
- make gameplay rules easier to extend without editing one giant file
- isolate simulation, orchestration, presentation, and persistence concerns
- preserve playability throughout the migration

## Current Architecture Summary

### Primary issue

`src/components/Game.tsx` currently acts as:

- application shell
- runtime bootstrapper
- frame loop owner
- input router
- gameplay rule host
- interaction resolver
- dialogue director
- quest progression host
- map transition coordinator
- save/load coordinator
- audio manager
- UI bridge
- visual effect coordinator

This is the main architectural bottleneck.

### Existing modules that are already useful boundaries

- `src/lib/game/World.ts`
  Good candidate to remain the spatial/world rendering authority.

- `src/lib/game/Combat.ts`
  Already functions as a simulation module, but currently mutates `GameState` directly.

- `src/lib/game/SaveManager.ts`
  Already isolated enough to evolve into a higher-level save service.

- `src/lib/game/MapMarkers.ts`
  Good basis for a progression-facing marker service.

- `src/data/maps.ts`
  Good authored data source, but too monolithic.

- `src/data/mapGenerator.ts`
  Good pipeline entry point, but too large and too feature-dense for continued growth.

## Target Architecture

### Design principles

1. `Game.tsx` should become a thin composition shell.
2. Runtime orchestration should be explicit and centralized.
3. Systems should own one job each.
4. Domain rules should not be embedded in UI event handlers.
5. Data should remain declarative.
6. Refactors should be incremental and behavior-preserving.

### Proposed top-level structure

```text
src/game/
  runtime/
    GameRuntime.ts
    GameLoop.ts
    RuntimeContext.ts
    RuntimeTypes.ts
    RuntimeEvents.ts

  domain/
    GameStore.ts
    InventoryService.ts
    ProgressionService.ts
    DialogueDirector.ts
    QuestDirector.ts
    InteractionSystem.ts
    MapTransitionService.ts
    SaveService.ts
    PlayerService.ts

  systems/
    AudioDirector.ts
    CameraSystem.ts
    EnemySpawnSystem.ts
    PresentationSystem.ts
    NotificationService.ts

  world/
    mapRegistry.ts
    definitions/
    generator/
      generateMap.ts
      placers/
      validators/
      terrain/
```

This structure does not need to appear all at once. It is the target shape.

## Ownership Model

### `Game.tsx`

Should own only:

- mounting/unmounting
- wiring runtime outputs to React overlays
- passing commands into the runtime
- rendering UI components

Should not own:

- quest logic
- dialogue consequences
- map transition logic
- item use logic
- interaction branching
- audio lifecycle policy
- enemy spawn policy

### `GameRuntime`

Should become the top-level orchestrator for non-React runtime execution.

Responsibilities:

- initialize shared runtime context
- start and stop the frame loop
- bind systems together
- expose read models/snapshots to UI
- expose commands to UI/input adapters

Suggested collaborators:

- `World`
- `CombatSystem`
- `AudioDirector`
- `MapTransitionService`
- `InteractionSystem`
- `ProgressionService`

### `GameStore`

Should become the canonical mutable gameplay state holder.

This can begin as a thin wrapper around the existing `GameState` and evolve later.

Responsibilities:

- player state
- inventory state
- quest state
- flags
- current map id
- last bonfire
- dropped essence
- UI-facing snapshot generation

Important note:

Do not begin with a full reducer rewrite. Start with a wrapper around `GameState` that exposes domain-level operations.

### `InteractionSystem`

Should own all player-triggered world interactions.

Responsibilities:

- NPC talk initiation
- bonfire rest
- item pickups
- chest opens
- healing source use
- building entry/exit
- shortcut lever activation
- gate switch activation
- essence reclaim
- authored interaction routing

Recommended shape:

- one entry point: `tryInteract()`
- dispatch by interaction kind or handler registry
- return a structured result or emit domain events

### `ProgressionService`

Should own gameplay consequences tied to dialogue, quests, and world progression.

Responsibilities:

- accept quest
- complete quest
- update quest objectives
- grant rewards
- unlock routes and flags
- create/update map markers
- resolve dialogue side effects

This service should remove hard-coded progression logic from:

- `startDialogue`
- `handleDialogueResponse`
- map transition side effects
- interaction side effects

### `DialogueDirector`

Should own dialogue entry and node progression.

Responsibilities:

- choose the correct start node for a dialogue id
- advance the conversation
- ask `ProgressionService` for consequences
- produce a UI-facing dialogue state

The data in `src/data/dialogues.ts` remains declarative. The director interprets it.

### `MapTransitionService`

Should own map changes end-to-end.

Responsibilities:

- validate route unlock
- load target map
- place player safely
- sync persistent map state
- activate/deactivate map-specific NPCs
- respawn map enemies
- trigger transition overlays and map-enter notifications
- persist state after transition

This is one of the best first extractions because it already exists as a coherent block inside `Game.tsx`.

### `AudioDirector`

Should own all music and SFX behavior.

Responsibilities:

- initialize audio context
- music track policy by map/biome
- mute state
- autoplay recovery
- sound effect pools
- central sound triggering API

Suggested API examples:

- `audio.playSfx('dodge_roll')`
- `audio.playSfx('bonfire_restore')`
- `audio.setMusicForMap(mapId)`
- `audio.setMuted(boolean)`

### `EnemySpawnSystem`

Should own enemy population for maps and reset events.

Responsibilities:

- spawn enemies from map definitions
- clear active enemies on map swap/reset
- respond to bonfire rest and death/reset

This logic is currently spread between helper functions and transition/bonfire flows.

## Dependency Rules

These rules are important. Without them, the refactor will just create more files with the same coupling.

### Allowed

- UI can call runtime commands.
- Runtime can coordinate systems and services.
- Services can mutate `GameStore`.
- Systems can read `GameStore`.
- `World` can answer spatial queries.
- Data modules can be read by services/directors.

### Avoid

- UI components mutating `GameState` directly.
- `CombatSystem` writing quest state.
- `World` making quest decisions.
- dialogue response handlers directly editing rewards, flags, and map markers.
- audio setup embedded inside gameplay handlers.
- map definitions importing runtime modules.

## Refactor Strategy

### Strategy choice

Use incremental extraction, not big-bang rewrite.

Reason:

- the game is already playable
- the runtime is heavily coupled to rendering and input timing
- a full rewrite would create too much regression risk

### Migration rule

Every pass should leave the game in a runnable state and reduce total responsibility inside `Game.tsx`.

## Phased Migration Plan

### Phase 0: Introduce architecture scaffolding

Goal:

- create new target directories and first service modules without changing behavior

Work:

- add `src/game/runtime/`
- add `src/game/domain/`
- add `src/game/systems/`
- create simple types for runtime context and service dependencies

Output:

- new folders and interfaces
- no gameplay behavior change

### Phase 1: Extract `MapTransitionService`

Goal:

- remove map transition orchestration from `Game.tsx`

Move:

- target-map unlock validation
- map load flow
- safe spawn resolution
- transition overlay dispatch
- NPC activation sync
- enemy reset and respawn
- save after transition
- map-entry quest objective updates

Why first:

- coherent behavior block
- high impact
- low conceptual ambiguity

Success criteria:

- `Game.tsx` no longer owns the full transition pipeline
- all map transition behavior still matches current game flow

### Phase 2: Extract `InteractionSystem`

Goal:

- replace the giant interaction branch tree with a handler-based system

Move:

- essence reclaim
- bonfire rest
- pickups
- chest opening
- heal sources
- building transitions
- switch/lever actions
- interaction-based dialogue launch

Recommended internal shape:

```text
InteractionSystem
  tryInteract()
  handleNpcInteraction()
  handleBonfire()
  handlePickup()
  handleChest()
  handleHealingSource()
  handleTransition()
  handleSwitch()
  handleDialogueObject()
```

Success criteria:

- `Game.tsx` delegates interaction resolution
- new interaction types can be added without editing a giant function

### Phase 3: Extract `DialogueDirector` and `ProgressionService`

Goal:

- move dialogue branching and quest side effects out of React handlers

Move:

- dialogue start node selection
- dialogue node advancement
- merchant/healer/etc consequences
- quest acceptance/completion
- marker generation
- reward distribution

Success criteria:

- `handleDialogueResponse` in `Game.tsx` becomes a thin delegate
- progression logic no longer depends on React component local state

### Phase 4: Extract `AudioDirector`

Goal:

- centralize audio lifecycle and policies

Move:

- audio context creation
- music startup and fallback behavior
- map-based track switching
- pooled SFX
- mute handling

Success criteria:

- audio setup code largely removed from `Game.tsx`
- sound triggers become named API calls

### Phase 5: Introduce `GameRuntime`

Goal:

- consolidate non-React orchestration behind a runtime object or hook

Move:

- runtime initialization
- loop start/stop
- command entrypoints
- system coordination
- cleanup lifecycle

Success criteria:

- `Game.tsx` becomes mostly shell + overlays
- runtime dependencies are easier to inspect and test

### Phase 6: Split content modules

Goal:

- reduce monoliths in authored and generated world content

Move:

- split `maps.ts` into per-map files
- split `mapGenerator.ts` into terrain, placers, validators
- preserve current generation pipeline behavior

Success criteria:

- adding a new map or feature no longer requires editing giant files

### Phase 7: Evolve `GameStore`

Goal:

- reduce ad hoc direct mutation across systems

Work:

- wrap state transitions in domain methods
- optionally introduce action/event logging later

Success criteria:

- fewer raw writes to `state.player`, `state.quests`, `state.inventory`, and flags from arbitrary modules

## Recommended First Passes In Practice

The first concrete implementation passes should be:

1. create runtime/domain/system folders and shared types
2. extract `MapTransitionService`
3. extract `InteractionSystem`
4. extract `ProgressionService`

This order gives the highest structural gain without forcing a full simulation rewrite.

## Data and UI Guidance

### Keep declarative data declarative

These files should stay mostly data-first:

- `src/data/dialogues.ts`
- `src/data/quests.ts`
- `src/data/items.ts`
- `src/data/enemies.ts`
- future per-map definition files

### UI should consume snapshots, not raw mutable engine state

The current UI already leans in this direction through refs and refresh tokens.

Longer-term target:

- runtime exposes snapshot selectors
- UI renders those snapshots
- UI dispatches commands

Example command surface:

- `runtime.commands.interact()`
- `runtime.commands.useActiveItem()`
- `runtime.commands.toggleMap()`
- `runtime.commands.advanceDialogue(choiceId)`

## Risks

### Risk 1: accidental behavior rewrites during extraction

Mitigation:

- preserve existing function bodies first
- move code with minimal change
- clean up internally only after behavior is stable

### Risk 2: circular dependencies between runtime and domain services

Mitigation:

- define narrow interfaces for collaborators
- keep runtime as composition root
- keep data modules dependency-free

### Risk 3: React state and mutable engine state drifting apart

Mitigation:

- centralize snapshot refresh points
- avoid adding new direct state mutations in UI components

### Risk 4: over-engineering too early

Mitigation:

- extract around natural seams already present in the code
- do not force event sourcing or reducer architecture immediately

## Definition of Success

The refactor is moving in the right direction when:

- `Game.tsx` shrinks substantially and becomes easier to scan
- major gameplay behaviors live in named services
- new world interactions and dialogue consequences stop requiring edits in multiple places
- map transitions, progression, and audio policies each have a clear owner
- the game remains playable after every extraction pass

## Immediate Next Action

Implement Phase 0 and Phase 1:

- add runtime/domain/system scaffolding
- extract the current map transition flow into a dedicated `MapTransitionService`

That gives the first meaningful reduction in orchestration load while preserving the rest of the runtime shape.
