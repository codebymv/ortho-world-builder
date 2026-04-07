import type { GameState } from '@/lib/game/GameState';
import type { World } from '@/lib/game/World';
import { makeVisitedTileKey } from '@/lib/game/visitedTiles';

export type PlayerAnimState =
  | 'idle'
  | 'walk'
  | 'attack'
  | 'dodge'
  | 'charge'
  | 'hurt'
  | 'spin_attack'
  | 'lunge'
  | 'lunge_recovery'
  | 'drinking'
  | 'block';

export type Direction8 =
  | 'up'
  | 'down'
  | 'left'
  | 'right'
  | 'up_left'
  | 'up_right'
  | 'down_left'
  | 'down_right';

export type CardinalDirection = 'up' | 'down' | 'left' | 'right';

interface UpdatePlayerSimulationOptions {
  state: GameState;
  world: World;
  currentTime: number;
  deltaTime: number;
  isDialogueActive: boolean;
  isBlocking: boolean;
  isLmbHeld: boolean;
  isChargingAttack: boolean;
  chargeTimer: number;
  chargeLevel: number;
  playerAnimState: PlayerAnimState;
  currentDir8: Direction8;
  footstepTimer: number;
  footstepInterval: number;
  attackFrame: number;
  attackFrameTimer: number;
  attackFrameDuration: number;
  spinDirIndex: number;
  spinFrameTimer: number;
  spinFrameDuration: number;
  spinDirections: Direction8[];
  drinkTimer: number;
  animTimer: number;
  animFrame: number;
  idleFrameDuration: number;
  walkFrameDuration: number;
  chargeTimeMin: number;
  chargeTimeMax: number;
  dodgeBuffered: boolean;
  keys: Record<string, boolean>;
  visitedTiles: Set<string>;
  getDirection8: (x: number, y: number) => Direction8;
  dir8to4: (direction: Direction8) => CardinalDirection;
  performDodge: (moveX: number, moveY: number) => void;
  playFootstep: (isSprinting: boolean) => void;
  emitDust: (x: number, y: number) => void;
  emitHeal: (x: number, y: number, z: number) => void;
  triggerMinimapUpdate: (force?: boolean, now?: number) => void;
  // Lunge state
  lungeState: {
    active: boolean;
    recovering: boolean;
    dirX: number;
    dirY: number;
    speed: number;
    distanceRemaining: number;
    recoveryTimer: number;
    damage: number;
    hitEnemyIds: Set<string>;
  };
  combatSystem: {
    getEnemiesInRange: (position: { x: number; y: number }, range: number) => any[];
    playerAttack: (enemy: any, damage: number, playerPosition: { x: number; y: number }, playerDirection: string) => { killed: boolean; staggered: boolean; backstab: boolean };
  };
  onLungeHit: (enemy: any, damage: number) => void;
  onLungeEnd: () => void;
  dodgeIFrameDuration: number;
  // Combo chain state
  comboStep: number;
  comboWindowTimer: number;
  comboInputBuffered: boolean;
  comboWindowDuration: number;
  getComboFrameDuration: (step: number) => number;
  triggerComboChain: () => { frameDuration: number } | null;
}

export interface PlayerSimulationResult {
  isChargingAttack: boolean;
  chargeTimer: number;
  chargeLevel: number;
  playerAnimState: PlayerAnimState;
  currentDir8: Direction8;
  footstepTimer: number;
  attackFrame: number;
  attackFrameTimer: number;
  spinDirIndex: number;
  spinFrameTimer: number;
  drinkTimer: number;
  animTimer: number;
  animFrame: number;
  dodgeBuffered: boolean;
  comboStep: number;
  comboWindowTimer: number;
  comboInputBuffered: boolean;
}

export function updatePlayerSimulation({
  state,
  world,
  currentTime,
  deltaTime,
  isDialogueActive,
  isBlocking,
  isLmbHeld,
  isChargingAttack,
  chargeTimer,
  chargeLevel,
  playerAnimState,
  currentDir8,
  footstepTimer,
  footstepInterval,
  attackFrame,
  attackFrameTimer,
  attackFrameDuration,
  spinDirIndex,
  spinFrameTimer,
  spinFrameDuration,
  spinDirections,
  drinkTimer,
  animTimer,
  animFrame,
  idleFrameDuration,
  walkFrameDuration,
  chargeTimeMin,
  chargeTimeMax,
  dodgeBuffered,
  keys,
  visitedTiles,
  getDirection8,
  dir8to4,
  performDodge,
  playFootstep,
  emitDust,
  emitHeal,
  triggerMinimapUpdate,
  lungeState,
  combatSystem,
  onLungeHit,
  onLungeEnd,
  dodgeIFrameDuration,
  comboStep,
  comboWindowTimer,
  comboInputBuffered,
  comboWindowDuration,
  getComboFrameDuration,
  triggerComboChain,
}: UpdatePlayerSimulationOptions): PlayerSimulationResult {
  const revealVisibleTiles = () => {
    const currentMap = world.getCurrentMap();
    const viewHalfH = 7;
    const viewHalfW = Math.ceil(viewHalfH * (window.innerWidth / window.innerHeight));
    const centerTileX = Math.floor(state.player.position.x + currentMap.width / 2);
    const centerTileY = Math.floor(state.player.position.y + currentMap.height / 2);
    let newTilesRevealed = false;

    for (let dy = -viewHalfH; dy <= viewHalfH; dy++) {
      for (let dx = -viewHalfW; dx <= viewHalfW; dx++) {
        const tx = centerTileX + dx;
        const ty = centerTileY + dy;
        if (tx >= 0 && tx < currentMap.width && ty >= 0 && ty < currentMap.height) {
          const key = makeVisitedTileKey(state.currentMap, tx, ty);
          if (!visitedTiles.has(key)) {
            visitedTiles.add(key);
            newTilesRevealed = true;
          }
        }
      }
    }

    if (newTilesRevealed) {
      triggerMinimapUpdate(false, currentTime);
    }
  };

  if (isChargingAttack) {
    if (!isLmbHeld) {
      isChargingAttack = false;
      chargeTimer = 0;
      chargeLevel = 0;
      playerAnimState = 'idle';
    } else {
      chargeTimer += deltaTime;
      chargeLevel = Math.min(
        1,
        Math.max(0, (chargeTimer - chargeTimeMin) / (chargeTimeMax - chargeTimeMin)),
      );
      playerAnimState = 'charge';
    }
  }

  if (isDialogueActive) {
    return {
      isChargingAttack,
      chargeTimer,
      chargeLevel,
      playerAnimState,
      currentDir8,
      footstepTimer,
      attackFrame,
      attackFrameTimer,
      spinDirIndex,
      spinFrameTimer,
      drinkTimer,
      animTimer,
      animFrame,
      dodgeBuffered,
      comboStep,
      comboWindowTimer,
      comboInputBuffered,
    };
  }

  revealVisibleTiles();

  let moveX = 0;
  let moveY = 0;
  let moved = false;

  if (keys.w) {
    moveY += 1;
    moved = true;
  }
  if (keys.s) {
    moveY -= 1;
    moved = true;
  }
  if (keys.a) {
    moveX -= 1;
    moved = true;
  }
  if (keys.d) {
    moveX += 1;
    moved = true;
  }

  if (dodgeBuffered && !isBlocking && playerAnimState !== 'lunge' && playerAnimState !== 'lunge_recovery') {
    performDodge(moveX, moveY);
    dodgeBuffered = false;
  }

  if (moveX !== 0 && moveY !== 0) {
    const length = Math.sqrt(moveX * moveX + moveY * moveY);
    moveX /= length;
    moveY /= length;
  }

  if (state.player.isDodging) {
    state.player.dodgeTimer -= deltaTime;
    const dodgeFrameSpeed = state.player.dodgeSpeed * deltaTime * 60;
    const newPos = {
      x: state.player.position.x + state.player.dodgeDirection.x * dodgeFrameSpeed,
      y: state.player.position.y + state.player.dodgeDirection.y * dodgeFrameSpeed,
    };

    if (world.canMoveTo(state.player.position.x, state.player.position.y, newPos.x, newPos.y, 0.2)) {
      state.player.position = newPos;
    }

    if (state.player.dodgeTimer <= 0) {
      state.player.isDodging = false;
      state.player.iFrameTimer = 0;
      playerAnimState = moved ? 'walk' : 'idle';
    }
  } else if (moved && !isBlocking && !isChargingAttack && playerAnimState !== 'spin_attack' && playerAnimState !== 'lunge' && playerAnimState !== 'lunge_recovery' && state.player.attackAnimationTimer <= 0) {
    const rawDir = getDirection8(moveX > 0 ? 1 : moveX < 0 ? -1 : 0, moveY > 0 ? 1 : moveY < 0 ? -1 : 0);
    currentDir8 = rawDir;
    state.player.direction = dir8to4(rawDir);

    const wantsSprint = keys.shift && state.player.stamina > 0;
    state.player.isSprinting = wantsSprint;
    const baseSpeed = wantsSprint ? state.player.sprintSpeed : state.player.speed;
    const currentSpeed = state.player.snareTimer > 0 ? baseSpeed * state.player.snareSpeedMult : baseSpeed;

    if (wantsSprint) {
      state.player.stamina = Math.max(0, state.player.stamina - 16 * deltaTime);
      state.player.lastStaminaUseTime = currentTime / 1000;
      if (state.player.stamina <= 0) {
        state.player.isSprinting = false;
      }
    }

    const frameSpeed = currentSpeed * deltaTime * 60;
    const newPos = {
      x: state.player.position.x + moveX * frameSpeed,
      y: state.player.position.y + moveY * frameSpeed,
    };

    if (world.canMoveTo(state.player.position.x, state.player.position.y, newPos.x, newPos.y, 0.2)) {
      state.player.position = newPos;
    } else if (world.canMoveTo(state.player.position.x, state.player.position.y, newPos.x, state.player.position.y, 0.2)) {
      state.player.position.x = newPos.x;
    } else if (world.canMoveTo(state.player.position.x, state.player.position.y, state.player.position.x, newPos.y, 0.2)) {
      state.player.position.y = newPos.y;
    }

    state.player.isMoving = true;

    if (
      playerAnimState !== 'attack' &&
      playerAnimState !== 'dodge' &&
      playerAnimState !== 'charge' &&
      playerAnimState !== 'drinking' &&
      playerAnimState !== 'block'
    ) {
      playerAnimState = 'walk';
    }

    footstepTimer += deltaTime;
    const actualFootstepInterval = state.player.isSprinting ? footstepInterval * 0.65 : footstepInterval;
    if (footstepTimer >= actualFootstepInterval) {
      emitDust(state.player.position.x, state.player.position.y);
      playFootstep(state.player.isSprinting);
      footstepTimer = 0;
    }

  } else {
    state.player.isMoving = false;
    footstepTimer = 0;
    if (
      playerAnimState !== 'attack' &&
      playerAnimState !== 'dodge' &&
      playerAnimState !== 'charge' &&
      playerAnimState !== 'spin_attack' &&
      playerAnimState !== 'lunge' &&
      playerAnimState !== 'lunge_recovery' &&
      playerAnimState !== 'block'
    ) {
      playerAnimState = 'idle';
    }
  }

  if (playerAnimState === 'attack') {
    attackFrameTimer -= deltaTime;
    if (attackFrameTimer <= 0) {
      attackFrame++;
      if (attackFrame >= 3) {
        // Swing complete — open the combo chain window
        playerAnimState = moved ? 'walk' : 'idle';
        attackFrame = 0;
        comboWindowTimer = comboWindowDuration;

        // If input was buffered during the swing, chain immediately
        if (comboInputBuffered && comboStep < 2) {
          comboInputBuffered = false;
          const chainResult = triggerComboChain();
          if (chainResult) {
            comboStep = comboStep + 1; // keep local var in sync with the setter inside triggerComboChain
            attackFrame = 0;
            attackFrameTimer = chainResult.frameDuration;
            playerAnimState = 'attack';
            comboWindowTimer = 0;
          }
        }
      } else {
        attackFrameTimer = getComboFrameDuration(comboStep);
      }
    }
    state.player.attackAnimationTimer = Math.max(0, state.player.attackAnimationTimer - deltaTime);
  }

  // Tick combo chain window; reset combo step when it expires without input
  if (comboWindowTimer > 0) {
    comboWindowTimer = Math.max(0, comboWindowTimer - deltaTime);
    if (comboWindowTimer <= 0) {
      comboStep = 0;
    }
  }

  if (playerAnimState === 'spin_attack') {
    spinFrameTimer -= deltaTime;
    if (spinFrameTimer <= 0) {
      spinDirIndex++;
      if (spinDirIndex >= spinDirections.length) {
        playerAnimState = moved ? 'walk' : 'idle';
        spinDirIndex = 0;
        state.player.attackAnimationTimer = 0;
      } else {
        // Decelerate: last two frames play at 2x duration for a wind-down feel
        const remaining = spinDirections.length - spinDirIndex;
        const slowdown = remaining <= 2 ? 2 : 1;
        spinFrameTimer = spinFrameDuration * slowdown;
      }
    }
    state.player.attackAnimationTimer = Math.max(0, state.player.attackAnimationTimer - deltaTime);
  }

  if (playerAnimState === 'lunge' && lungeState.active) {
    const step = lungeState.speed * deltaTime;
    const newPos = {
      x: state.player.position.x + lungeState.dirX * step,
      y: state.player.position.y + lungeState.dirY * step,
    };

    if (world.canMoveTo(state.player.position.x, state.player.position.y, newPos.x, newPos.y, 0.2)) {
      state.player.position = newPos;
    } else {
      lungeState.distanceRemaining = 0;
    }

    lungeState.distanceRemaining -= step;

    const hitRadius = 1.5;
    const nearby = combatSystem.getEnemiesInRange(state.player.position, hitRadius);
    const { dirX, dirY } = lungeState;
    const LUNGE_POST_HIT_LOCK = 0.42;
    // Fixed push distances from the player's current position — independent of
    // how much lunge travel remains, so enemies always land well clear.
    const KNOCKBACK_DISTANCES = [3.2, 2.8, 2.4, 2.0];

    for (const enemy of nearby) {
      if (!lungeState.hitEnemyIds.has(enemy.id)) {
        lungeState.hitEnemyIds.add(enemy.id);
        onLungeHit(enemy, lungeState.damage);

        if (enemy.state !== 'dead') {
          for (const dist of KNOCKBACK_DISTANCES) {
            const pushX = state.player.position.x + dirX * dist;
            const pushY = state.player.position.y + dirY * dist;
            if (world.canMoveTo(enemy.position.x, enemy.position.y, pushX, pushY, 0.2)) {
              enemy.position.x = pushX;
              enemy.position.y = pushY;
              break;
            }
          }

          if (enemy.state === 'telegraphing' || enemy.state === 'attacking') {
            enemy.state = 'recovering';
            enemy.telegraphTimer = 0;
            enemy.recoverTimer = Math.max(enemy.recoverTimer, enemy.recoverDuration * 0.55);
          }
          enemy.attackWindupLockTimer = Math.max(enemy.attackWindupLockTimer, LUNGE_POST_HIT_LOCK);
        }
      }
    }

    if (lungeState.distanceRemaining <= 0) {
      lungeState.active = false;
      lungeState.recovering = true;
      playerAnimState = 'lunge_recovery';
    }

    state.player.attackAnimationTimer = Math.max(0, state.player.attackAnimationTimer - deltaTime);
  }

  if (playerAnimState === 'lunge_recovery' && lungeState.recovering) {
    lungeState.recoveryTimer -= deltaTime;
    if (lungeState.recoveryTimer <= 0) {
      lungeState.recovering = false;
      lungeState.hitEnemyIds.clear();
      state.player.attackAnimationTimer = 0;
      onLungeEnd();

      // Auto-retreat: kick the player backward out of the lunge so there is
      // separation before enemies can retaliate. Free — no stamina cost.
      if (!state.player.isDodging) {
        state.player.isDodging = true;
        state.player.dodgeTimer = state.player.dodgeDuration;
        state.player.iFrameTimer = dodgeIFrameDuration;
        state.player.dodgeDirection = { x: -lungeState.dirX, y: -lungeState.dirY };
        state.player.lastDodgeTime = Date.now();
        playerAnimState = 'dodge';
      } else {
        playerAnimState = moved ? 'walk' : 'idle';
      }
    }
    state.player.attackAnimationTimer = Math.max(0, state.player.attackAnimationTimer - deltaTime);
  }

  if (playerAnimState === 'drinking') {
    drinkTimer -= deltaTime;
    if (Math.random() < 0.3) {
      emitHeal(state.player.position.x, state.player.position.y + 0.5, 0.3);
    }
    if (drinkTimer <= 0) {
      playerAnimState = 'idle';
    }
  }

  if (
    playerAnimState !== 'attack' &&
    playerAnimState !== 'dodge' &&
    playerAnimState !== 'charge' &&
    playerAnimState !== 'spin_attack' &&
    playerAnimState !== 'lunge' &&
    playerAnimState !== 'lunge_recovery' &&
    playerAnimState !== 'drinking' &&
    playerAnimState !== 'block'
  ) {
    const frameDuration = playerAnimState === 'walk' ? walkFrameDuration : idleFrameDuration;
    animTimer += deltaTime;
    if (animTimer >= frameDuration) {
      animFrame = (animFrame + 1) % 2;
      animTimer = 0;
    }
  }

  if (playerAnimState === 'charge') {
    // Drive the frame directly from hold progress so the sword visually rises
    // as the charge builds: frame 0 (just started) → 1 (mid wind-up) → 2 (fully coiled).
    const holdProgress = Math.min(1, chargeTimer / chargeTimeMax);
    animFrame = Math.min(2, Math.floor(holdProgress * 3));
  }

  return {
    isChargingAttack,
    chargeTimer,
    chargeLevel,
    playerAnimState,
    currentDir8,
    footstepTimer,
    attackFrame,
    attackFrameTimer,
    spinDirIndex,
    spinFrameTimer,
    drinkTimer,
    animTimer,
    animFrame,
    dodgeBuffered,
    comboStep,
    comboWindowTimer,
    comboInputBuffered,
  };
}
