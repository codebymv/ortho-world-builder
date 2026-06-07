import type { GameState } from '@/lib/game/GameState';
import { markObjectiveDone } from '@/lib/game/progressionToasts';
import { resolveOverworldRegionId, seenRegionFlagKey } from '@/data/overworld';

export const MAP_BIOMES: Record<string, string> = {
  village: 'grassland',
  forest: 'forest',
  guilrhym: 'city',
};

// Ship-readiness note: portal routes stay open until design review decides
// whether to add real locks or remove locked-route messaging.
export function isPortalDestinationUnlocked(_state: GameState, _targetMap: string): boolean {
  return true;
}

export function applyMapEntryProgression(state: GameState, targetMap: string) {
  // Reveal the corresponding overworld region the first time the player enters it.
  const overworldRegionId = resolveOverworldRegionId(targetMap);
  if (overworldRegionId) {
    state.setFlag(seenRegionFlagKey(overworldRegionId), true);
  }

  const guardQuest = state.quests.find(q => q.id === 'guard_duty' && q.active && !q.completed);
  if (guardQuest && targetMap === 'forest') {
    markObjectiveDone(guardQuest, 0, 'Patrol the northern forest border');
  }

  const hunterQuest = state.quests.find(q => q.id === 'find_hunter' && q.active && !q.completed);
  if (hunterQuest && targetMap === 'forest') {
    markObjectiveDone(hunterQuest, 0, 'Travel to the Whispering Woods');
    // Step 2 is just opened (no checkmark) so the player has a clear next pointer.
    if (!hunterQuest.objectives[1]?.includes('\u2713')) {
      hunterQuest.objectives[1] = 'Find the Disparaged Cottage';
    }
  }
  if (hunterQuest && targetMap === 'interior_hunter_cottage') {
    markObjectiveDone(hunterQuest, 1, 'Find the Disparaged Cottage');
  }
}

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
    markObjectiveDone(hunterQuest, 3, 'Cross the river into the Hollow');
    return true;
  }

  return false;
}
