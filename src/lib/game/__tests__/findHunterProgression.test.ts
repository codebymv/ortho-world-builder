import { describe, it, expect, beforeEach } from 'vitest';
import * as THREE from 'three';
import { GameState } from '../GameState';
import { quests } from '../../../data/quests';
import {
  migrateFindHunterObjectiveOrder,
  tryCompleteFindHunterQuest,
  FIND_HUNTER_INDEX,
  FIND_HUNTER_BOSS_OBJECTIVE,
} from '../findHunterProgression';
import { CHECKMARK } from '../progressionToasts';

describe('findHunterProgression', () => {
  let state: GameState;

  beforeEach(() => {
    state = new GameState(new THREE.Scene(), new THREE.OrthographicCamera());
  });

  it('swaps legacy boss/manuscript objective order on migration', () => {
    const legacy = [
      'Travel to the Whispering Woods',
      'Find the Disparaged Cottage',
      'Find traces of the manuscript',
      'Cross the river into the Hollow',
      `Defeat the Hollow Guardian ${CHECKMARK}`,
      `Recover the complete manuscript ${CHECKMARK}`,
    ];
    const migrated = migrateFindHunterObjectiveOrder(legacy);
    expect(migrated[4]).toContain('Recover');
    expect(migrated[5]).toContain('Defeat the Hollow Apparition');
  });

  it('completes find_hunter when manuscript and boss flags are set', () => {
    state.addQuest({ ...quests.find_hunter, active: true, objectives: [...quests.find_hunter.objectives] });
    state.setFlag('hunters_manuscript_collected', true);
    state.setFlag('hollow_guardian_defeated', true);
    markAllButBossAndManuscript(state);

    const done = tryCompleteFindHunterQuest(state);
    expect(done).toBe(true);
    expect(state.quests.find(q => q.id === 'find_hunter')?.completed).toBe(true);
    expect(state.quests.find(q => q.id === 'find_hunter')?.active).toBe(false);
  });
});

function markAllButBossAndManuscript(state: GameState) {
  const q = state.quests.find(quest => quest.id === 'find_hunter');
  if (!q) return;
  const labels = [
    'Travel to the Whispering Woods',
    'Find the Disparaged Cottage',
    'Find traces of the manuscript',
    'Cross the river into the Hollow',
  ];
  labels.forEach((label, i) => {
    q.objectives[i] = `${label} ${CHECKMARK}`;
  });
  q.objectives[FIND_HUNTER_INDEX.manuscript] = quests.find_hunter.objectives[FIND_HUNTER_INDEX.manuscript];
  q.objectives[FIND_HUNTER_INDEX.boss] = FIND_HUNTER_BOSS_OBJECTIVE;
}
