import { describe, it, expect, beforeEach } from 'vitest';
import * as THREE from 'three';
import { GameState } from '../GameState';
import { items } from '../../../data/items';

describe('GameState ring equipment', () => {
  let state: GameState;

  beforeEach(() => {
    state = new GameState(new THREE.Scene(), new THREE.OrthographicCamera());
  });

  it('starts with two empty ring slots and neutral stamina multiplier', () => {
    expect(state.equippedRingIds).toEqual([null, null]);
    expect(state.getStaminaRegenMultiplier()).toBe(1);
  });

  it('applies stamina regen multiplier from a single equipped ring', () => {
    state.addItem({ ...items.gravebound_ring });
    state.equipRing('gravebound_ring', 0);
    expect(state.getStaminaRegenMultiplier()).toBeCloseTo(1.22);
  });

  it('applies recovery speed multiplier from equipped wolf ring', () => {
    state.addItem({ ...items.wolf_ring });
    state.equipRing('wolf_ring', 0);
    expect(state.getRecoverySpeedMultiplier()).toBeCloseTo(1.22);
  });

  it('combines stamina and recovery bonuses from two different rings', () => {
    state.addItem({ ...items.gravebound_ring });
    state.addItem({ ...items.wolf_ring });
    state.equipRing('gravebound_ring', 0);
    state.equipRing('wolf_ring', 1);
    expect(state.getStaminaRegenMultiplier()).toBeCloseTo(1.22);
    expect(state.getRecoverySpeedMultiplier()).toBeCloseTo(1.22);
  });

  it('auto-equips into the first empty slot', () => {
    state.addItem({ ...items.gravebound_ring });
    expect(state.tryAutoEquipRing('gravebound_ring')).toBe(true);
    expect(state.equippedRingIds).toEqual(['gravebound_ring', null]);
  });

  it('clears ring slots when the ring item is removed from inventory', () => {
    state.addItem({ ...items.gravebound_ring });
    state.equipRing('gravebound_ring', 0);
    state.removeItem('gravebound_ring');
    expect(state.equippedRingIds).toEqual([null, null]);
  });
});
