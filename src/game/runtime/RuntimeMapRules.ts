import type { GameState } from '@/lib/game/GameState';

export const MAP_BIOMES: Record<string, string> = {
  village: 'grassland',
  forest: 'forest',
  gilrhym: 'city',
};

export function isPortalDestinationUnlocked(_state: GameState, _targetMap: string): boolean {
  return true;
}

export function applyMapEntryProgression(state: GameState, targetMap: string) {
  const guardQuest = state.quests.find(q => q.id === 'guard_duty' && q.active && !q.completed);
  if (guardQuest && targetMap === 'forest') {
    guardQuest.objectives[0] = 'Patrol the northern forest border checked';
  }

  const hunterQuest = state.quests.find(q => q.id === 'find_hunter' && q.active && !q.completed);
  if (hunterQuest && targetMap === 'forest') {
    hunterQuest.objectives[0] = 'Travel to the Whispering Woods checked';
    hunterQuest.objectives[1] = 'Find the Disparaged Cottage';
  }
  if (hunterQuest && targetMap === 'interior_hunter_cottage') {
    hunterQuest.objectives[1] = 'Find the Disparaged Cottage checked';
  }

}

const CHECKMARK = '✓';

/**
 * Checks position-based quest objectives each frame.
 * Returns true if any objective was updated (caller should save/refresh UI).
 */
export function checkPositionBasedProgression(state: GameState, playerTileY: number): boolean {
  if (state.currentMap !== 'forest') return false;

  const hunterQuest = state.quests.find(q => q.id === 'find_hunter' && q.active && !q.completed);
  if (!hunterQuest) return false;

  if (playerTileY < 75 && !state.getFlag('hollow_entered')) {
    state.setFlag('hollow_entered', true);
    hunterQuest.objectives[3] = `Cross the river into the Hollow ${CHECKMARK}`;
    return true;
  }

  return false;
}
