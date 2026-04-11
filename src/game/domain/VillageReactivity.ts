import type { GameState } from '@/lib/game/GameState';

export const VILLAGE_REACTIVITY_FLAGS = {
  afterManuscript: 'village_after_manuscript',
  afterReaver: 'village_after_reaver',
} as const;

export type VillageReactivityStage = 'calm' | 'after_manuscript' | 'after_reaver';

export function getVillageReactivityStage(state: GameState): VillageReactivityStage {
  if (state.getFlag(VILLAGE_REACTIVITY_FLAGS.afterReaver) || state.getFlag('ashen_reaver_defeated')) {
    return 'after_reaver';
  }

  const hunterQuest = state.quests.find(quest => quest.id === 'find_hunter');
  if (state.getFlag(VILLAGE_REACTIVITY_FLAGS.afterManuscript) || hunterQuest?.completed) {
    return 'after_manuscript';
  }

  return 'calm';
}
