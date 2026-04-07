# Campaign Content

This folder makes the game's intended journey explicit.

## Purpose

Historically, the campaign flow has been implied across:

- `src/data/quests.ts`
- `src/data/dialogues.ts`
- `src/data/maps.ts`
- `src/game/domain/ProgressionService.ts`

That works at runtime, but it makes the authored campaign hard to read quickly.

The files here describe the high-level arc structure so humans and tools can answer:

- what the current critical path is
- which maps belong to which act
- where investigation, boss, return, and revelation beats happen
- which quests and pivotal items anchor each phase

## Entry Points

- `registry.ts`
  the full campaign spine
- `arcs/*.ts`
  one arc per major campaign phase

## Notes

- This layer is descriptive, not authoritative runtime logic.
- Runtime systems should still rely on the quest/dialogue/progression data they already use.
- As the game grows, this layer should stay small, stable, and highly readable.
