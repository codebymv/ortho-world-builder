import { describe, it, expect } from 'vitest';
import * as THREE from 'three';
import { GameState } from '../GameState';
import {
  extractMarkersFromText,
  getRingHintMarker,
  getManuscriptPrimaryObjectiveMarker,
  isHiddenMapMarker,
  isPrimaryObjectiveMarker,
  shouldHideStoredMarker,
  RING_HINT_MARKER_ID,
  MANUSCRIPT_PRIMARY_MARKER_ID,
} from '../MapMarkers';

function makeState(): GameState {
  return new GameState({} as THREE.Scene, {} as THREE.OrthographicCamera);
}

describe('extractMarkersFromText', () => {
  it('never adds Whispering Woods / forest keyword pins', () => {
    const markers = extractMarkersFromText(
      'Head to the ranger outpost near the stone golem at the eastern fort',
      'forest',
      new Set(),
    );
    expect(markers.every(m => m.map !== 'forest')).toBe(true);
  });

  it('never adds danger pins from dialogue keywords', () => {
    const markers = extractMarkersFromText(
      'Beware the bandits and wolves near the fort',
      'village',
      new Set(),
    );
    expect(markers.every(m => m.type !== 'danger')).toBe(true);
  });
});

describe('Whispering Woods runtime markers', () => {
  it('hides every persisted forest marker', () => {
    const state = makeState();
    expect(
      shouldHideStoredMarker(
        { id: 'forest_Stone Golem', label: 'Stone Golem', map: 'forest', tileX: 213, tileY: 70, type: 'danger' },
        state,
      ),
    ).toBe(true);
    expect(
      shouldHideStoredMarker(
        { id: 'forest_Ranger Outpost', label: 'Ranger Outpost', map: 'forest', tileX: 140, tileY: 170, type: 'poi' },
        state,
      ),
    ).toBe(true);
  });

  it('shows ring hint only after Olwen hint and before pickup', () => {
    const state = makeState();
    expect(getRingHintMarker(state)).toBeNull();

    state.setFlag('olwen_ranger_cabin_hint', true);
    const hint = getRingHintMarker(state);
    expect(hint).not.toBeNull();
    expect(hint?.id).toBe(RING_HINT_MARKER_ID);
    expect(hint?.tileX).toBe(236);
    expect(hint?.tileY).toBe(227);

    state.setFlag('wolf_ring_received', true);
    expect(getRingHintMarker(state)).toBeNull();
  });

  it('treats ring hint as optional, manuscript pin as primary', () => {
    const state = makeState();
    state.quests = [{
      id: 'find_hunter',
      active: true,
      completed: false,
      objectives: ['Find the Disparaged Cottage'],
      description: 'Search Whispering Woods',
    }];

    const primary = getManuscriptPrimaryObjectiveMarker(state);
    expect(primary?.id).toBe(MANUSCRIPT_PRIMARY_MARKER_ID);
    expect(isPrimaryObjectiveMarker(primary!, state)).toBe(true);

    state.setFlag('olwen_ranger_cabin_hint', true);
    const ring = getRingHintMarker(state)!;
    expect(isPrimaryObjectiveMarker(ring, state)).toBe(false);
  });
});

describe('isHiddenMapMarker', () => {
  it('suppresses danger and stale forest pins', () => {
    const state = makeState();
    expect(
      isHiddenMapMarker(
        { id: 'village_Bandit Camp', label: 'Bandit Camp', map: 'village', tileX: 1, tileY: 1, type: 'danger' },
        state,
        null,
      ),
    ).toBe(true);
    expect(
      isHiddenMapMarker(
        { id: 'forest_East Ridge', label: 'East Ridge', map: 'forest', tileX: 200, tileY: 50, type: 'poi' },
        state,
        null,
      ),
    ).toBe(true);
  });
});
