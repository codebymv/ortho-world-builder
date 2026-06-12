import type { GameState, NPC } from '@/lib/game/GameState';
import { HOODED_WITNESS_IDS, isHoodedWitnessVanished } from '@/game/runtime/hoodedWitnessVanish';

/** NPCs hidden by story flags - excluded from interaction and visuals. */
export function isNpcHiddenByFlags(state: GameState, npc: NPC): boolean {
  if (npc.id === 'petra_ashveil' && state.getFlagBool('petra_departed')) {
    return true;
  }
  if (HOODED_WITNESS_IDS.has(npc.id) && isHoodedWitnessVanished(state, npc.id)) {
    return true;
  }
  return false;
}
