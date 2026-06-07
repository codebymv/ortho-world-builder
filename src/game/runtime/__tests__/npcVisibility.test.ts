import { describe, it, expect } from 'vitest';
import { GameState } from '@/lib/game/GameState';
import * as THREE from 'three';
import { isNpcHiddenByFlags } from '@/game/runtime/npcVisibility';

function makeState(): GameState {
  return new GameState({} as THREE.Scene, {} as THREE.OrthographicCamera);
}

describe('isNpcHiddenByFlags', () => {
  it('hides Petra after she departs', () => {
    const state = makeState();
    const petra = {
      id: 'petra_ashveil',
      name: 'Petra',
      mapId: 'forest',
      position: { x: 0, y: 0 },
      dialogueId: 'petra_ashveil',
      sprite: 'npc_petra',
    };

    expect(isNpcHiddenByFlags(state, petra)).toBe(false);
    state.setFlag('petra_departed', true);
    expect(isNpcHiddenByFlags(state, petra)).toBe(true);
  });
});
