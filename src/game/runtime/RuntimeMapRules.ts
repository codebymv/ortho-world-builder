import type { GameState } from '@/lib/game/GameState';

export const MAP_BIOMES: Record<string, string> = {
  village: 'grassland',
  forest: 'forest',
  deep_woods: 'swamp',
  shadow_castle: 'ruins',
  gilrhym: 'city',
};

export function isPortalDestinationUnlocked(state: GameState, targetMap: string): boolean {
  if (targetMap === 'deep_woods') {
    const questUnlocked = !!state.quests.find(q => q.id === 'clear_deep_woods');
    if (!questUnlocked) return false;
    if (state.currentMap === 'village') {
      return !!state.getFlag('whispering_woods_shortcut_open');
    }
    return true;
  }
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

  const deepQuest = state.quests.find(q => q.id === 'clear_deep_woods' && q.active && !q.completed);
  if (deepQuest && targetMap === 'deep_woods') {
    deepQuest.objectives[0] = 'Travel to the Deep Woods checked';
  }
  if (deepQuest && targetMap === 'interior_witch_hut') {
    deepQuest.objectives[1] = "Find the witch's hut checked";
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
