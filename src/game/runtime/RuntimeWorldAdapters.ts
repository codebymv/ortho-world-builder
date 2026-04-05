import type { GameState, NPC } from '@/lib/game/GameState';
import type { World } from '@/lib/game/World';

interface TransitionLike {
  targetMap: string;
  targetX: number;
  targetY: number;
}

export function createSetActiveNpcsForCurrentMap(
  state: GameState,
  setActiveForMap: (mapId: string) => NPC[],
  syncNpcReactivity?: () => void,
) {
  return () => {
    syncNpcReactivity?.();
    state.npcs = setActiveForMap(state.currentMap);
  };
}

/** For interaction prompts: small offsets help catch portal when standing slightly offset on the tile. */
export function createPortalSampler(state: GameState, world: World) {
  return (): TransitionLike | null => {
    const px = state.player.position.x;
    const py = state.player.position.y;

    for (const dir of [
      { x: 0, y: 0 },
      { x: 0, y: 1 },
      { x: 0, y: -1 },
      { x: 1, y: 0 },
      { x: -1, y: 0 },
    ]) {
      const transition = world.getAutoTransitionAt(px + dir.x * 0.7, py + dir.y * 0.7);
      if (transition) return transition;
    }

    return null;
  };
}

/**
 * Auto-warp: prefer strict foot-on-portal; if the physics read misses the portal cell by a hair, use the
 * same 0.7 cardinal probes as the travel prompt. Skip probes when standing on a chest so we never warp
 * from a loot tile that sits next to a portal.
 */
export function createPortalWarpFootSampler(state: GameState, world: World) {
  return (): TransitionLike | null => {
    const px = state.player.position.x;
    const py = state.player.position.y;

    const center = world.getTile(px, py);
    if (center?.type === 'portal' && center.transition) return center.transition;

    if (center?.type === 'chest' || center?.type === 'chest_opened') return null;

    for (const dir of [
      { x: 0, y: 1 },
      { x: 0, y: -1 },
      { x: 1, y: 0 },
      { x: -1, y: 0 },
    ] as const) {
      const t = world.getAutoTransitionAt(px + dir.x * 0.7, py + dir.y * 0.7);
      if (t) return t;
    }

    return null;
  };
}
