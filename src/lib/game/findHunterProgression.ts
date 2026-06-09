import type { GameState } from '@/lib/game/GameState';
import { CHECKMARK, markObjectiveDone } from '@/lib/game/progressionToasts';

export const FIND_HUNTER_BOSS_OBJECTIVE = 'Defeat the Hollow Apparition';
export const FIND_HUNTER_MANUSCRIPT_OBJECTIVE = 'Find proof of what happened here';

/** Indices for `find_hunter` objectives after the manuscript / boss reorder. */
export const FIND_HUNTER_INDEX = {
  travel: 0,
  cottage: 1,
  traces: 2,
  crossRiver: 3,
  manuscript: 4,
  boss: 5,
} as const;

type NotifyFn = (message: string, options?: {
  id?: string;
  type?: 'success' | 'info' | 'error';
  description?: string;
  duration?: number;
}) => void;

type ShowHeroOverlayFn = (title: string, subtitle?: string) => void;

/** Swap legacy saves that listed the boss step before the manuscript step. */
export function migrateFindHunterObjectiveOrder(objectives: string[]): string[] {
  if (objectives.length < 6) return objectives;
  const fourth = objectives[4] ?? '';
  const fifth = objectives[5] ?? '';
  if (!fourth.includes('Defeat') || !fifth.includes('Recover')) return objectives.map(normalizeFindHunterBossLabel);
  const swapped = [...objectives];
  swapped[4] = fifth;
  swapped[5] = fourth;
  return swapped.map(normalizeFindHunterBossLabel);
}

function normalizeFindHunterBossLabel(line: string): string {
  return line.replace('Defeat the Hollow Guardian', FIND_HUNTER_BOSS_OBJECTIVE);
}

/**
 * Marks the find_hunter quest complete once the manuscript is recovered and the
 * Hollow Apparition is defeated. Idempotent - safe to call after either milestone.
 */
export function tryCompleteFindHunterQuest(state: GameState, notify?: NotifyFn, showHeroOverlay?: ShowHeroOverlayFn): boolean {
  const quest = state.quests.find(q => q.id === 'find_hunter' && q.active && !q.completed);
  if (!quest) return false;

  const hasProof = state.getFlag('evacuation_order_collected') || state.getFlag('hunters_manuscript_collected');
  if (hasProof && !quest.objectives[FIND_HUNTER_INDEX.manuscript]?.includes(CHECKMARK)) {
    markObjectiveDone(quest, FIND_HUNTER_INDEX.manuscript, FIND_HUNTER_MANUSCRIPT_OBJECTIVE, { silent: true });
  }
  if (state.getFlag('hollow_guardian_defeated') && !quest.objectives[FIND_HUNTER_INDEX.boss]?.includes(CHECKMARK)) {
    markObjectiveDone(quest, FIND_HUNTER_INDEX.boss, FIND_HUNTER_BOSS_OBJECTIVE, { silent: true });
  }

  if (!hasProof || !state.getFlag('hollow_guardian_defeated')) {
    return false;
  }
  if (!quest.objectives.every(line => line.includes(CHECKMARK))) {
    return false;
  }

  state.completeQuest('find_hunter');
  if (showHeroOverlay) {
    showHeroOverlay('Quest Completed', 'The Missing Hunter');
    return true;
  }

  notify?.('Quest Completed: The Missing Hunter!', {
    id: 'quest-done-find-hunter',
    type: 'success',
    description: 'The evacuation order and the Hollow Apparition\'s fall. Greenleaf now knows where this began.',
    duration: 6000,
  });
  return true;
}
