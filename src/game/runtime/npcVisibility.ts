import type { GameState, NPC } from '@/lib/game/GameState';

/** NPCs hidden by story flags - excluded from interaction and visuals. */
export function isNpcHiddenByFlags(state: GameState, npc: NPC): boolean {
  if (npc.id === 'petra_ashveil' && state.getFlagBool('petra_departed')) {
    return true;
  }
  return false;
}
