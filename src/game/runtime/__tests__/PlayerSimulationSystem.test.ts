import { describe, expect, it } from 'vitest';
import {
  attackBlocksLocomotion,
  canPlayerSprint,
  consumableUseBlocksLocomotion,
  resolveStaleAttackAnimState,
  SPRINT_RESTART_STAMINA_THRESHOLD,
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

describe('sprint gating', () => {
  const sprintState = (overrides: Partial<Parameters<typeof canPlayerSprint>[0]> = {}) => ({
    isClimbing: false,
    isSprinting: false,
    stamina: SPRINT_RESTART_STAMINA_THRESHOLD,
    health: 100,
    ...overrides,
  });

  it('requires a recovered stamina pool before starting sprint', () => {
    expect(canPlayerSprint(sprintState({ stamina: SPRINT_RESTART_STAMINA_THRESHOLD - 1 }), true)).toBe(false);
    expect(canPlayerSprint(sprintState({ stamina: SPRINT_RESTART_STAMINA_THRESHOLD }), true)).toBe(true);
  });

  it('allows an active sprint to continue below the restart threshold until stamina empties', () => {
    expect(canPlayerSprint(sprintState({ isSprinting: true, stamina: 1 }), true)).toBe(true);
    expect(canPlayerSprint(sprintState({ isSprinting: true, stamina: 0 }), true)).toBe(false);
  });

  it('disables sprinting at 1 health', () => {
    expect(canPlayerSprint(sprintState({ health: 1 }), true)).toBe(false);
  });
});
