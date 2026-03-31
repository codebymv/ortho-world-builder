import type { GameState } from '@/lib/game/GameState';

export const MAP_BIOMES: Record<string, string> = {
  village: 'grassland',
  forest: 'forest',
  deep_woods: 'swamp',
  shadow_castle: 'ruins',
  ruins: 'ruins',
};

export function isPortalDestinationUnlocked(state: GameState, targetMap: string): boolean {
  if (targetMap === 'deep_woods') {
    return !!state.quests.find(q => q.id === 'clear_deep_woods' && q.active);
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
