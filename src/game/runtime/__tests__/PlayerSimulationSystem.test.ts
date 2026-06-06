import { describe, expect, it } from 'vitest';
import {
  attackBlocksLocomotion,
  consumableUseBlocksLocomotion,
  resolveStaleAttackAnimState,
} from '@/game/runtime/PlayerSimulationSystem';

describe('attack locomotion state', () => {
  it('blocks movement while the attack timer is active', () => {
    expect(attackBlocksLocomotion('attack', 0.12)).toBe(true);
    expect(attackBlocksLocomotion('attack', 0)).toBe(false);
    expect(attackBlocksLocomotion('walk', 0.12)).toBe(false);
  });

  it('blocks movement while a consumable use animation is active', () => {
    expect(consumableUseBlocksLocomotion('drinking', 0.4)).toBe(true);
    expect(consumableUseBlocksLocomotion('idle', 0.4)).toBe(true);
    expect(consumableUseBlocksLocomotion('drinking', 0)).toBe(false);
    expect(consumableUseBlocksLocomotion('walk', 0)).toBe(false);
  });

  it('snaps stale attack pose to walk or idle once the timer expires', () => {
    expect(resolveStaleAttackAnimState('attack', 0, true)).toBe('walk');
    expect(resolveStaleAttackAnimState('attack', 0, false)).toBe('idle');
    expect(resolveStaleAttackAnimState('attack', 0.05, true)).toBeNull();
    expect(resolveStaleAttackAnimState('walk', 0, true)).toBeNull();
  });
});
