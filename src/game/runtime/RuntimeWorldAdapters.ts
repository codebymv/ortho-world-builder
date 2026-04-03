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

/** For auto-warp charge only: foot tile must be `portal` so adjacent chests / pickups never start warp FX. */
export function createPortalWarpFootSampler(state: GameState, world: World) {
  return (): TransitionLike | null => {
    const px = state.player.position.x;
    const py = state.player.position.y;
    const tile = world.getTile(px, py);
    if (tile?.type === 'portal' && tile.transition) return tile.transition;
    return null;
  };
}
