import type { GameState } from '@/lib/game/GameState';

export const VILLAGE_REACTIVITY_FLAGS = {
  afterManuscript: 'village_after_manuscript',
  afterDeepWoods: 'village_after_deep_woods',
} as const;

export type VillageReactivityStage = 'calm' | 'after_manuscript' | 'after_deep_woods';

export function getVillageReactivityStage(state: GameState): VillageReactivityStage {
  const deepQuest = state.quests.find(quest => quest.id === 'clear_deep_woods');

  if (state.getFlag(VILLAGE_REACTIVITY_FLAGS.afterDeepWoods) || deepQuest?.completed) {
    return 'after_deep_woods';
  }

  if (state.getFlag(VILLAGE_REACTIVITY_FLAGS.afterManuscript) || deepQuest?.active) {
    return 'after_manuscript';
  }

  return 'calm';
}
