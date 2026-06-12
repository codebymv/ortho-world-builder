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

  it('hides hooded witnesses after they vanish from a strike', () => {
    const state = makeState();
    const witness = {
      id: 'mysterious_man',
      name: '???',
      mapId: 'forest',
      position: { x: -55, y: -73 },
      dialogueId: 'mysterious_man',
      sprite: 'npc_mysterious_man',
    };

    expect(isNpcHiddenByFlags(state, witness)).toBe(false);
    state.setFlag('mysterious_man_vanished', true);
    expect(isNpcHiddenByFlags(state, witness)).toBe(true);
  });
});
