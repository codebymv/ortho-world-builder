# Ortho World Builder

An orthographic action-adventure RPG inspired by Souls/Bloodborne, built with React, Three.js, TypeScript, and Tailwind CSS.

## Overview

Ortho World Builder is a 2D orthographic action RPG featuring:
- **Exploration**: Navigate a world of interconnected regions including the Village, Whispering Woods, and the city of Gilrhym
- **Combat**: Tactical combat with attacks, dodges, blocking, and charged attacks
- **Quests**: A branching quest system with objectives, dialogue, and rewards
- **Progression**: Collect items, earn essence, unlock shortcuts, and rest at bonfires
- **Save System**: LocalStorage-based saves with versioned migrations

The game follows the campaign arc "The Missing Hunter," with planned acts including the Shadow Castle.

## Tech Stack

- **Frontend**: React 18, TypeScript, Vite
- **Rendering**: Three.js for 2D orthographic projection
- **Styling**: Tailwind CSS, shadcn/ui components
- **State**: Custom game state management with local storage persistence
- **Audio**: HTML5 Audio with Web Audio API for compression/gain
- **Build**: Vite with TypeScript compilation

## Getting Started

### Prerequisites

- Node.js 18+
- npm or pnpm

### Installation

```bash
npm install
```

### Development

```bash
npm run dev
```

The game will be available at `http://localhost:5173`.

### Build

```bash
npm run build
```

Production builds are output to `dist/`.

### Type Checking

```bash
npm run typecheck
```

### Linting

```bash
npm run lint
```

## Scripts

### Development Scripts

- `npm run dev` - Start the Vite dev server
- `npm run build` - Build for production
- `npm run build:dev` - Build for development mode
- `npm run preview` - Preview the production build locally
- `npm run typecheck` - Run TypeScript type checking
- `npm run lint` - Run ESLint
- `npm run test` - Run Vitest tests
- `npm run test:watch` - Run Vitest in watch mode

### Audit & Probe Scripts

- `npm run audit:content` - Audit game content for consistency and completeness
- `npm run probe:hunter` - Probe the hunter approach corridor tiles for QA
- `npm run simulate:cottage` - Simulate cottage pathing for debugging

## Game Controls

### Movement
- **WASD** - Move
- **SHIFT** - Sprint
- **SPACE** - Dodge Roll

### Combat
- **LMB** - Attack
- **HOLD LMB** - Charge Attack
- **RMB** - Block

### Items
- **Q/E** - Cycle Consumables
- **Z** - Use Item
- **←/→** - Cycle Weapons

### World
- **F** - Interact
- **M** - Open Map
- **I** - Open Inventory
- **O** - Open Objectives
- **ESC** - Pause

### Debug Hotkeys
- **V** - Toggle transition debug visualization
- **B** - Toggle collision debug visualization

## Project Structure

```
src/
├── components/
│   ├── game/          # Game UI components (GameUI, PauseMenu, overlays)
│   └── ui/            # shadcn/ui components
├── data/              # Game data (quests, dialogues, enemies, items, maps)
├── game/
│   ├── domain/        # Domain services (Progression, Interaction, VillageReactivity)
│   ├── runtime/       # Runtime systems (Combat, Dialogue, Input, Audio)
│   └── lib/           # Game libraries (GameState, Combat, World, SaveManager)
├── lib/               # Shared utilities (notificationBus, progressionToasts)
└── components/        # Main entry point (Game.tsx)
```

## Key Systems

### Quest System
Quests are defined in `src/data/quests.ts` with objectives, descriptions, and rewards. The `ProgressionService` handles quest acceptance, completion, and objective tracking with automatic notifications.

### Save System
The `SaveManager` in `src/lib/game/SaveManager.ts` handles single-slot saves with versioned migrations. Saves are stored in LocalStorage and loaded on game startup.

### Dialogue System
Dialogues are defined in `src/data/dialogues.ts` as node trees with branching text and quest-giving logic. The `InteractionSystem` handles dialogue triggers and NPC interactions.

### Combat System
Combat is handled by `src/lib/game/Combat.ts` with enemy AI, damage calculations, and player combat actions. The `RuntimeCombatActions` orchestrates combat events including enemy deaths and quest progression.

### Map System
Maps are defined in `src/data/maps.ts` with tile-based collision and entity placement. The `World` class handles chunk loading, collision detection, and entity management.

## Development Notes

### Adding New Quests
1. Define the quest in `src/data/quests.ts`
2. Add dialogue nodes in `src/data/dialogues.ts` to give the quest
3. Add objective completion logic in `ProgressionService.ts` or runtime systems
4. Use `markObjectiveDone()` from `src/lib/game/progressionToasts.ts` for consistent step completion notifications

### Adding New Controls
1. Add the binding to `src/components/game/controlBindings.ts` in the appropriate group
2. Wire the key in `RuntimeKeyboardInput.ts`
3. Add the action to the relevant runtime system

### Debugging
- Use the transition debug (V) to see map transition states
- Use the collision debug (B) to see collision tiles and walkable areas
- Check the dev footer for version/build info
- Use the notification feed for quest and objective updates

## License

Private project.
