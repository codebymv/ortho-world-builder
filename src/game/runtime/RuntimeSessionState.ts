import type { Direction8, PlayerAnimState } from '@/game/runtime/PlayerSimulationSystem';

interface CreateRuntimeSessionStateOptions {
  initialPlayerSmoothedElevation: number;
  initialLastAutoSaveTime: number;
  initialLastTime: number;
}

export function createRuntimeSessionState({
  initialPlayerSmoothedElevation,
  initialLastAutoSaveTime,
  initialLastTime,
}: CreateRuntimeSessionStateOptions) {
  return {
    visual: {
      playerSmoothedElevation: initialPlayerSmoothedElevation,
      swooshTimer: 0,
      swooshFacing: 'down' as 'up' | 'down' | 'left' | 'right',
      spinSwooshTimer: 0,
      lastTransitionDebugRefreshAt: 0,
    },
    animation: {
      animFrame: 0,
      animTimer: 0,
      playerAnimState: 'idle' as PlayerAnimState,
      heldConsumableSpriteId: null as string | null,
      drinkTimer: 0,
      attackFrameTimer: 0,
      attackFrame: 0,
      currentDir8: 'down' as Direction8,
      isChargingAttack: false,
      chargeTimer: 0,
      chargeLevel: 0,
      spinDirIndex: 0,
      spinFrameTimer: 0,
      // Combo chain state
      comboStep: 0,        // 0=first hit, 1=second, 2=third/finisher
      comboWindowTimer: 0, // time remaining to chain the next hit
    },
    lunge: {
      active: false,
      recovering: false,
      dirX: 0,
      dirY: 0,
      speed: 0,
      distanceRemaining: 0,
      recoveryTimer: 0,
      damage: 0,
      hitEnemyIds: new Set<string>(),
    },
    combat: {
      isBlocking: false,
      blockStartTime: 0,
      isRmbHeld: false,
      blockAngle: 0,
    },
    input: {
      isLmbHeld: false,
      lmbHoldStartTime: 0,
      interactBuffered: false,
      dodgeBuffered: false,
      potionBuffered: false,
      comboInputBuffered: false, // LMB pressed during active swing; chains on animation end
    },
    loop: {
      lastAutoSaveTime: initialLastAutoSaveTime,
      lastTime: initialLastTime,
      footstepTimer: 0,
      portalCooldown: 0,
      lastNpcScreenUpdate: 0,
    },
  };
}

export type RuntimeSessionState = ReturnType<typeof createRuntimeSessionState>;
