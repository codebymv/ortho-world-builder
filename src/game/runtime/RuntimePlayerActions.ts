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
}

export function createPerformDodgeAction({
  state,
  getCurrentDir8,
  setPlayerAnimState,
  playDodgeRoll,
  triggerUIUpdate,
  dodgeIFrameDuration,
  dodgeStaminaCost,
}: CreatePerformDodgeActionOptions) {
  return (moveX: number, moveY: number) => {
    const now = Date.now();
    if (now - state.player.lastDodgeTime < state.player.dodgeCooldown) return;
    if (state.player.stamina < dodgeStaminaCost) return;
    if (state.player.isDodging) return;

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
  };
}
