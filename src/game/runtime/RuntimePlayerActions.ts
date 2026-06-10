import type { GameState } from '@/lib/game/GameState';
import type { Direction8, PlayerAnimState } from '@/game/runtime/PlayerSimulationSystem';

const DIRECTION_VECTORS: Record<Direction8, { x: number; y: number }> = {
  up: { x: 0, y: 1 },
  down: { x: 0, y: -1 },
  left: { x: -1, y: 0 },
  right: { x: 1, y: 0 },
  up_left: { x: -1, y: 1 },
  up_right: { x: 1, y: 1 },
  down_left: { x: -1, y: -1 },
  down_right: { x: 1, y: -1 },
};

interface CreatePerformDodgeActionOptions {
  state: GameState;
  getCurrentDir8: () => Direction8;
  setPlayerAnimState: (value: PlayerAnimState) => void;
  playDodgeRoll: () => void;
  triggerUIUpdate: () => void;
  dodgeIFrameDuration: number;
  dodgeStaminaCost: number;
  getIsConsuming?: () => boolean;
}

export function createPerformDodgeAction({
  state,
  getCurrentDir8,
  setPlayerAnimState,
  playDodgeRoll,
  triggerUIUpdate,
  dodgeIFrameDuration,
  dodgeStaminaCost,
  getIsConsuming,
}: CreatePerformDodgeActionOptions) {
  // Returns true when the dodge actually starts so callers can keep the input
  // buffered (and retry next frame) instead of dropping presses made during
  // the cooldown or a stamina trough.
  return (moveX: number, moveY: number): boolean => {
    const now = performance.now();
    if (now - state.player.lastDodgeTime < state.player.dodgeCooldown) return false;
    if (state.player.stamina < dodgeStaminaCost) return false;
    if (state.player.isDodging) return false;
    if (state.player.isClimbing) return false;
    if (getIsConsuming?.()) return false;

    let dx = moveX;
    let dy = moveY;

    if (dx === 0 && dy === 0) {
      const direction = DIRECTION_VECTORS[getCurrentDir8()] || DIRECTION_VECTORS.down;
      dx = direction.x;
      dy = direction.y;
    }

    const len = Math.sqrt(dx * dx + dy * dy);
    if (len > 0) {
      dx /= len;
      dy /= len;
    }

    state.player.isDodging = true;
    state.player.dodgeTimer = state.player.dodgeDuration;
    state.player.iFrameTimer = dodgeIFrameDuration;
    state.player.dodgeDirection = { x: dx, y: dy };
    state.player.lastDodgeTime = now;
    state.player.stamina -= dodgeStaminaCost;
    // Keep stamina recovery locked through the roll itself so the meter
    // doesn't begin refilling before the evasive animation has resolved.
    state.player.lastStaminaUseTime = performance.now() / 1000 + state.player.dodgeDuration;
    setPlayerAnimState('dodge');
    playDodgeRoll();
    triggerUIUpdate();
    return true;
  };
}
