import type { GameState } from '@/lib/game/GameState';
import type { PlayerState } from '@/lib/game/GameState';
import type { World } from '@/lib/game/World';
import type { Enemy } from '@/lib/game/Combat';
import type { ParticleSystem } from '@/lib/game/ParticleSystem';
import { makeVisitedTileKey } from '@/lib/game/visitedTiles';
import {
  BREAKABLE_TILES,
  breakTileAt,
  breakTilesInRadius,
  playBreakableSound,
  type BreakableSoundHandlers,
} from '@/game/runtime/BreakableProps';
import { PLAYER_MOVE_RADIUS } from '@/lib/game/playerCombatGeometry';
import { hasPlayerMeleeLineOfSight } from '@/lib/game/Combat';

export interface ArcWaveState {
  active: boolean;
  dirX: number;
  dirY: number;
  currentDist: number;
  maxDist: number;
  arcWidth: number;
  damage: number;
  hitIds: Set<string>;
}

const CLIMB_SPEED_MULT = 0.55;
/** Movement speed while standing in unchopped tall grass (applies to player and enemies). */
export const TALL_GRASS_SPEED_MULT = 0.5;
/** Narrow collision while on a 1-tile ladder column surrounded by cliff. */
const CLIMB_MOVE_RADIUS = 0;
/**
 * Exponential lerp rate (per second) for sliding onto the ladder rail or off onto
 * a landing tile. ~12/s gives ~85% smoothing in ~150ms - fast enough to feel
 * responsive, slow enough to read as a smooth glide instead of a teleport.
 */
const LADDER_SNAP_RATE = 12;
const LADDER_DISMOUNT_RATE = 14;
export const SPRINT_RESTART_STAMINA_THRESHOLD = 18;
export const SPRINT_MIN_HEALTH = 2;

export function canPlayerSprint(
  player: Pick<PlayerState, 'isClimbing' | 'isSprinting' | 'stamina' | 'health'>,
  shiftHeld: boolean,
): boolean {
  if (!shiftHeld || player.isClimbing || player.health < SPRINT_MIN_HEALTH) return false;
  if (player.isSprinting) return player.stamina > 0;
  return player.stamina >= SPRINT_RESTART_STAMINA_THRESHOLD;
}

interface ClimbMovementResult {
  moveX: number;
  moveY: number;
  dismount: boolean;
  dismountTarget?: { x: number; y: number };
  sideDismount?: boolean;
}

let activeLadderDismount: { targetX: number; targetY: number; facing: Direction8 } | null = null;

let _lastRevealTileX = -999999;
let _lastRevealTileY = -999999;
let _cachedRevealAspect = 0; // window aspect, cached; width derives from the (possibly ring-boosted) height
if (typeof window !== 'undefined') {
  window.addEventListener('resize', () => { _cachedRevealAspect = 0; });
}
const _scratchLungeEnemies: Enemy[] = [];

function getEnemyLungeKnockbackScale(enemy: Enemy): number {
  const tuned = enemy.behaviorOverrides.knockbackResistance;
  if (typeof tuned === 'number') return Math.max(0, Math.min(1.25, tuned));
  const poiseScale = 1 - Math.min(0.75, enemy.maxPoise / 500);
  return Math.max(0.25, poiseScale);
}

function shouldLungeInterruptEnemy(enemy: Enemy, staggeredByHit: boolean): boolean {
  if (staggeredByHit) return true;
  return getEnemyLungeKnockbackScale(enemy) >= 0.5;
}

function isLadderTile(world: World, px: number, py: number): boolean {
  return world.getTile(px, py)?.type === 'ladder';
}

function isStructuralWallTile(type: string | undefined): boolean {
  if (!type) return true;
  return (
    type === 'cliff' ||
    type === 'cliff_edge' ||
    type === 'cliff_corrupted' ||
    type === 'cliff_edge_corrupted' ||
    type === 'cliff_edge_plains'
  );
}

/** Pick one X for the whole ladder column so mount side does not flip mid-climb. */
function resolveVerticalLadderColumnX(
  map: ReturnType<World['getCurrentMap']>,
  tileX: number,
  tileY: number,
  hw: number,
): number {
  const tileAt = (tx: number, ty: number) => map.tiles[ty]?.[tx] ?? null;

  let minY = tileY;
  let maxY = tileY;
  while (minY > 0 && tileAt(tileX, minY - 1)?.type === 'ladder') minY--;
  while (maxY < map.tiles.length - 1 && tileAt(tileX, maxY + 1)?.type === 'ladder') maxY++;

  let westWalls = 0;
  let eastWalls = 0;
  for (let ty = minY; ty <= maxY; ty++) {
    if (isStructuralWallTile(tileAt(tileX - 1, ty)?.type)) westWalls++;
    if (isStructuralWallTile(tileAt(tileX + 1, ty)?.type)) eastWalls++;
  }

  // 0.15 / 0.85 hug the rail against the dominant structural wall across the full span.
  if (map.name === 'Whispering Woods' && tileX === 239) {
    // A tile sprite renders centered at world-x (tileX - hw); the ladder overlay adds a +0.06
    // east mesh shift and the climb pose draws the sprite 0.07 west. Net flush position lands at
    // ~0.13 - matching the generic west-hug value the other (flush) vertical ladders use.
    return tileX - hw + 0.13;
  }
  if (westWalls >= eastWalls) return tileX - hw + 0.15;
  return tileX - hw + 0.85;
}

/** Stand flush on the ladder rails - hug the adjacent wall rather than tile center. */
function snapToLadderAxis(world: World, px: number, py: number): { x: number; y: number } {
  const map = world.getCurrentMap();
  const hw = map.width / 2;
  const hh = map.height / 2;
  const tileX = Math.floor(px + hw);
  const tileY = Math.floor(py + hh);
  const centerX = tileX - hw + 0.5;
  const centerY = tileY - hh + 0.5;

  const tileAt = (tx: number, ty: number) => map.tiles[ty]?.[tx] ?? null;
  const ladderAt = (dx: number, dy: number) => isLadderTile(world, px + dx, py + dy);

  const resolveHorizontalY = () => {
    let minX = tileX;
    let maxX = tileX;
    while (minX > 0 && tileAt(minX - 1, tileY)?.type === 'ladder') minX--;
    while (maxX < map.tiles[0].length - 1 && tileAt(maxX + 1, tileY)?.type === 'ladder') maxX++;

    let northWalls = 0;
    let southWalls = 0;
    for (let tx = minX; tx <= maxX; tx++) {
      if (isStructuralWallTile(tileAt(tx, tileY + 1)?.type)) northWalls++;
      if (isStructuralWallTile(tileAt(tx, tileY - 1)?.type)) southWalls++;
    }

    if (northWalls >= southWalls) return tileY - hh + 0.85;
    return tileY - hh + 0.15;
  };

  if (ladderAt(0, 1) || ladderAt(0, -1) || isLadderTile(world, px, py)) {
    return { x: resolveVerticalLadderColumnX(map, tileX, tileY, hw), y: py };
  }
  if (ladderAt(1, 0) || ladderAt(-1, 0)) {
    return { x: px, y: resolveHorizontalY() };
  }
  return { x: centerX, y: centerY };
}

/** Lock traversal to the ladder axis, but allow stepping off onto adjacent walkable ground. */
function resolveClimbMovement(
  world: World,
  px: number,
  py: number,
  moveX: number,
  moveY: number,
): ClimbMovementResult {
  const map = world.getCurrentMap();
  const hw = map.width / 2;
  const hh = map.height / 2;
  const tileX = Math.floor(px + hw);
  const tileY = Math.floor(py + hh);
  const tileAt = (tx: number, ty: number) => map.tiles[ty]?.[tx] ?? null;
  const ladderAt = (dx: number, dy: number) => isLadderTile(world, px + dx, py + dy);

  const neighborInMoveDir = (mx: number, my: number) => {
    if (mx === 0 && my === 0) return null;
    const ntx = tileX + (mx > 0 ? 1 : mx < 0 ? -1 : 0);
    const nty = tileY + (my > 0 ? 1 : my < 0 ? -1 : 0);
    return { tile: tileAt(ntx, nty), tx: ntx, ty: nty };
  };

  const isDismountTarget = (tile: ReturnType<typeof tileAt>) =>
    Boolean(tile?.walkable && tile.type !== 'ladder');

  const tryDismount = (mx: number, my: number, sideDismount = false): ClimbMovementResult | null => {
    if (mx === 0 && my === 0) return null;
    const neighbor = neighborInMoveDir(mx, my);
    if (neighbor && isDismountTarget(neighbor.tile)) {
      return {
        moveX: mx,
        moveY: my,
        dismount: true,
        dismountTarget: {
          x: neighbor.tx - hw + 0.5,
          y: neighbor.ty - hh + 0.5,
        },
        sideDismount,
      };
    }
    return null;
  };

  if (ladderAt(0, 1) || ladderAt(0, -1) || isLadderTile(world, px, py)) {
    return (
      tryDismount(moveX, 0, true) ??
      tryDismount(0, moveY) ??
      { moveX: 0, moveY, dismount: false }
    );
  }
  if (ladderAt(1, 0) || ladderAt(-1, 0)) {
    return (
      tryDismount(moveX, moveY) ??
      tryDismount(moveX, 0) ??
      tryDismount(0, moveY) ??
      { moveX, moveY: 0, dismount: false }
    );
  }
  return { moveX, moveY, dismount: false };
}

/** Interpolate elevation smoothly along a ladder column instead of stepping per tile. */
export function getClimbVisualElevation(world: World, px: number, py: number): number {
  const map = world.getCurrentMap();
  const hw = map.width / 2;
  const hh = map.height / 2;
  const tileX = Math.floor(px + hw);
  let tileY = Math.floor(py + hh);
  const tileAt = (tx: number, ty: number) => map.tiles[ty]?.[tx] ?? null;

  if (tileAt(tileX, tileY)?.type !== 'ladder') {
    return world.getElevationAt(px, py);
  }

  let minY = tileY;
  let maxY = tileY;
  while (minY > 0 && tileAt(tileX, minY - 1)?.type === 'ladder') minY--;
  while (maxY < map.tiles.length - 1 && tileAt(tileX, maxY + 1)?.type === 'ladder') maxY++;

  const bottomElev = tileAt(tileX, minY)?.elevation ?? 0;
  const topElev = tileAt(tileX, maxY)?.elevation ?? 0;
  const bottomWorldY = minY - hh + 0.5;
  const topWorldY = maxY - hh + 0.5;

  if (Math.abs(topWorldY - bottomWorldY) < 1e-6) return topElev;

  const t = Math.max(0, Math.min(1, (py - bottomWorldY) / (topWorldY - bottomWorldY)));
  return bottomElev + (topElev - bottomElev) * t;
}

/** While on a ladder, face the ladder plane instead of the movement vector. */
function resolveClimbFacingDirection(
  world: World,
  px: number,
  py: number,
  moveX: number,
  moveY: number,
): Direction8 {
  const isLadderAt = (dx: number, dy: number) => world.getTile(px + dx, py + dy)?.type === 'ladder';
  const north = isLadderAt(0, 1);
  const south = isLadderAt(0, -1);
  const east = isLadderAt(1, 0);
  const west = isLadderAt(-1, 0);

  // Vertical ladder column: face up toward the ladder plane (reads correctly for both W and S).
  if (north || south) return 'up';

  // Horizontal ladder run: face into the ladder from the side.
  if (east || west) return west ? 'left' : 'right';

  // Single-tile / end cap: infer axis from movement, still biased toward the ladder plane.
  if (moveY !== 0) return 'up';
  if (moveX > 0) return 'left';
  if (moveX < 0) return 'right';
  return 'up';
}

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
  | 'block'
  | 'climb';

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

/** Attack locomotion timer can expire before frame state clears - snap to walk/idle so movement isn't a frozen attack pose. */
export function resolveStaleAttackAnimState(
  playerAnimState: PlayerAnimState,
  attackAnimationTimer: number,
  moved: boolean,
): PlayerAnimState | null {
  if (playerAnimState === 'attack' && attackAnimationTimer <= 0) {
    return moved ? 'walk' : 'idle';
  }
  return null;
}

export function attackBlocksLocomotion(
  playerAnimState: PlayerAnimState,
  attackAnimationTimer: number,
): boolean {
  return playerAnimState === 'attack' && attackAnimationTimer > 0;
}

/** Souls-style consumable use - root the player until the drink/chew animation resolves. */
export function consumableUseBlocksLocomotion(
  _playerAnimState: PlayerAnimState,
  drinkTimer: number,
): boolean {
  return drinkTimer > 0;
}

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
  /** LMB pressed during a dodge roll - fires as the roll ends (TTL-expired upstream). */
  attackBuffered: boolean;
  keys: Record<string, boolean>;
  visitedTiles: Set<string>;
  getDirection8: (x: number, y: number) => Direction8;
  dir8to4: (direction: string) => string;
  /** Returns true when the dodge actually fired (cooldown/stamina gates passed). */
  performDodge: (moveX: number, moveY: number) => boolean;
  /** Fires a buffered roll→attack; null while gates still block it. */
  performBufferedAttack: () => { frameDuration: number } | null;
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
    getEnemiesInRange: (position: { x: number; y: number }, range: number, out?: Enemy[]) => Enemy[];
    playerAttack: (enemy: Enemy, damage: number, playerPosition: { x: number; y: number }, playerDirection: string) => { killed: boolean; staggered: boolean; backstab: boolean };
  };
  onLungeHit: (enemy: Enemy, damage: number) => { killed: boolean; staggered: boolean; backstab: boolean };
  onLungeEnd: () => void;
  arcWave: ArcWaveState;
  onArcWaveHit: (enemy: Enemy, damage: number) => void;
  particleSystem: ParticleSystem;
  playPropBreak?: () => void;
  playTallGrassBreak?: () => void;
  dodgeIFrameDuration: number;
  // Combo chain state
  comboStep: number;
  comboWindowTimer: number;
  comboInputBuffered: boolean;
  comboWindowDuration: number;
  getComboFrameDuration: (step: number) => number;
  /** Number of combo steps for the equipped weapon's moveset. */
  comboStepCount: number;
  /** Post-swing recovery lockout (seconds) if the combo ends on the given step. */
  getComboRecovery: (step: number) => number;
  triggerComboChain: () => { frameDuration: number } | null;
  completeConsumableUse?: () => void;
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
  attackBuffered: boolean;
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
  attackBuffered,
  keys,
  visitedTiles,
  getDirection8,
  dir8to4,
  performDodge,
  performBufferedAttack,
  playFootstep,
  emitDust,
  emitHeal,
  triggerMinimapUpdate,
  lungeState,
  combatSystem,
  onLungeHit,
  onLungeEnd,
  arcWave,
  onArcWaveHit,
  particleSystem,
  playPropBreak,
  playTallGrassBreak,
  dodgeIFrameDuration,
  comboStep,
  comboWindowTimer,
  comboInputBuffered,
  comboWindowDuration,
  getComboFrameDuration,
  comboStepCount,
  getComboRecovery,
  triggerComboChain,
  completeConsumableUse,
}: UpdatePlayerSimulationOptions): PlayerSimulationResult {
  const revealVisibleTiles = () => {
    const currentMap = world.getCurrentMap();
    // Base reveal radius + any utility-ring bonus (e.g. Ironbark Band widens map discovery).
    const viewHalfH = 7 + state.getRevealRadiusBonus();
    if (_cachedRevealAspect === 0) {
      _cachedRevealAspect = window.innerWidth / window.innerHeight;
    }
    const viewHalfW = Math.ceil(viewHalfH * _cachedRevealAspect);
    const centerTileX = Math.floor(state.player.position.x + currentMap.width / 2);
    const centerTileY = Math.floor(state.player.position.y + currentMap.height / 2);

    if (centerTileX === _lastRevealTileX && centerTileY === _lastRevealTileY) return;
    _lastRevealTileX = centerTileX;
    _lastRevealTileY = centerTileY;

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

  // Stale-charge guard: if performAttack() returned early without updating anim state,
  // isChargingAttack was cleared externally but playerAnimState is still 'charge'.
  // Clears the deadlock so walk/idle can resume on the next movement check.
  if (playerAnimState === 'charge' && !isChargingAttack) {
    playerAnimState = 'idle';
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
      attackBuffered,
      comboStep,
      comboWindowTimer,
      comboInputBuffered,
    };
  }

  revealVisibleTiles();

  // Knockback integration - runs before input movement so the player gets shoved
  // and can recover with WASD in the same frame. Slide stops on wall collision
  // (no clipping through cliffs); decays exponentially so impacts feel weighty
  // for ~0.3s then ease out.
  const kbMagSq = state.player.knockbackVelX * state.player.knockbackVelX
    + state.player.knockbackVelY * state.player.knockbackVelY;
  if (kbMagSq > 0.0004) {
    const kbX = state.player.position.x + state.player.knockbackVelX * deltaTime;
    const kbY = state.player.position.y + state.player.knockbackVelY * deltaTime;
    if (world.canMoveTo(state.player.position.x, state.player.position.y, kbX, kbY, PLAYER_MOVE_RADIUS)) {
      state.player.position.x = kbX;
      state.player.position.y = kbY;
    } else if (world.canMoveTo(state.player.position.x, state.player.position.y, kbX, state.player.position.y, PLAYER_MOVE_RADIUS)) {
      state.player.position.x = kbX;
      state.player.knockbackVelY = 0;
    } else if (world.canMoveTo(state.player.position.x, state.player.position.y, state.player.position.x, kbY, PLAYER_MOVE_RADIUS)) {
      state.player.position.y = kbY;
      state.player.knockbackVelX = 0;
    } else {
      // Wall-stop - bleed the impulse so we don't stay stuck pushing.
      state.player.knockbackVelX = 0;
      state.player.knockbackVelY = 0;
    }
    const decay = Math.exp(-7 * deltaTime); // ~0.3s half-life feel
    state.player.knockbackVelX *= decay;
    state.player.knockbackVelY *= decay;
  } else if (kbMagSq > 0) {
    state.player.knockbackVelX = 0;
    state.player.knockbackVelY = 0;
  }

  // Tick hit-stun and recovery timers every frame before any movement/animation logic.
  const recoverySpeed = state.getRecoverySpeedMultiplier();
  if (state.player.hurtTimer > 0) {
    state.player.hurtTimer = Math.max(0, state.player.hurtTimer - deltaTime * recoverySpeed);
  }
  if (state.player.attackRecoveryTimer > 0) {
    state.player.attackRecoveryTimer = Math.max(0, state.player.attackRecoveryTimer - deltaTime * recoverySpeed);
  }

  const playerTile = world.getTile(state.player.position.x, state.player.position.y);
  state.player.isClimbing = playerTile?.type === 'ladder';

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

  let handledLadderDismount = false;
  if (activeLadderDismount) {
    const target = activeLadderDismount;
    const lerp = 1 - Math.exp(-LADDER_DISMOUNT_RATE * deltaTime);
    state.player.position.x += (target.targetX - state.player.position.x) * lerp;
    state.player.position.y += (target.targetY - state.player.position.y) * lerp;

    const dx = target.targetX - state.player.position.x;
    const dy = target.targetY - state.player.position.y;
    const arrived = Math.hypot(dx, dy) < 0.035;
    if (arrived) {
      state.player.position.x = target.targetX;
      state.player.position.y = target.targetY;
      activeLadderDismount = null;
    }

    state.player.isClimbing = !arrived;
    state.player.isMoving = true;
    state.player.isSprinting = false;
    currentDir8 = target.facing;
    state.player.direction = dir8to4(target.facing) as CardinalDirection;
    playerAnimState = 'climb';
    moveX = 0;
    moveY = 0;
    moved = false;
    dodgeBuffered = false;
    attackBuffered = false;
    handledLadderDismount = true;
  }

  if (!handledLadderDismount && dodgeBuffered && !isBlocking && !state.player.isClimbing && playerAnimState !== 'lunge' && playerAnimState !== 'lunge_recovery' && !consumableUseBlocksLocomotion(playerAnimState, drinkTimer)) {
    // Only consume the press when the dodge actually fires. Failed attempts
    // (cooldown still ticking, stamina trough) keep the buffer alive so it
    // retries each frame until the TTL in RuntimeFrameRunner expires it.
    if (performDodge(moveX, moveY)) {
      dodgeBuffered = false;
    }
  }

  if (moveX !== 0 && moveY !== 0) {
    const length = Math.sqrt(moveX * moveX + moveY * moveY);
    moveX /= length;
    moveY /= length;
  }

  const staleAttackState = resolveStaleAttackAnimState(
    playerAnimState,
    state.player.attackAnimationTimer,
    moved,
  );
  if (staleAttackState) {
    playerAnimState = staleAttackState;
    attackFrame = 0;
    attackFrameTimer = 0;
  }

  let climbingDismount = false;
  let climbingDismountTarget: { x: number; y: number } | undefined;
  let climbingSideDismount = false;
  if (!handledLadderDismount && state.player.isClimbing) {
    const resolved = resolveClimbMovement(
      world,
      state.player.position.x,
      state.player.position.y,
      moveX,
      moveY,
    );
    moveX = resolved.moveX;
    moveY = resolved.moveY;
    climbingDismount = resolved.dismount;
    climbingDismountTarget = resolved.dismountTarget;
    climbingSideDismount = Boolean(resolved.sideDismount);
    moved = moveX !== 0 || moveY !== 0;

    // Smoothly ease the player onto the ladder rail rather than hard-snapping -
    // a sudden lateral jump of ~0.35 units on the first climb frame reads as a
    // teleport. Dismount handles its own glide further below.
    if (!climbingDismount) {
      const snapped = snapToLadderAxis(world, state.player.position.x, state.player.position.y);
      const lerp = 1 - Math.exp(-LADDER_SNAP_RATE * deltaTime);
      state.player.position.x += (snapped.x - state.player.position.x) * lerp;
      state.player.position.y += (snapped.y - state.player.position.y) * lerp;
    }
  }

  if (state.player.isDodging) {
    // Dodge-cancel: rolling out of recovery clears the attack-lockout timer (Souls-style).
    state.player.attackRecoveryTimer = 0;
    state.player.dodgeTimer -= deltaTime;
    const dodgeFrameSpeed = state.player.dodgeSpeed * deltaTime * 60;
    const newDodgeX = state.player.position.x + state.player.dodgeDirection.x * dodgeFrameSpeed;
    const newDodgeY = state.player.position.y + state.player.dodgeDirection.y * dodgeFrameSpeed;

    // Mirror the exact four corner probes that canMoveTo(PLAYER_MOVE_RADIUS) uses
    // so we break whichever tile blocks the roll - radius checks against tile
    // centers are unreliable when the player straddles a tile boundary.
    const dodgeMap = world.getCurrentMap();
    const DR = PLAYER_MOVE_RADIUS;
    const halfW = dodgeMap.width / 2;
    const halfH = dodgeMap.height / 2;
    const breakSounds: BreakableSoundHandlers = {
      generic: playPropBreak,
      tallGrass: playTallGrassBreak,
    };
    let dodgeBrokeTallGrass = false;
    let dodgeBrokeGeneric = false;
    for (let i = 0; i < 4; i++) {
      const cx = newDodgeX + (i & 1 ? DR : -DR);
      const cy = newDodgeY + (i & 2 ? DR : -DR);
      const tx = Math.floor(cx + halfW);
      const ty = Math.floor(cy + halfH);
      const tile = dodgeMap.tiles[ty]?.[tx];
      if (tile && BREAKABLE_TILES.has(tile.type)) {
        if (tile.type === 'tall_grass') dodgeBrokeTallGrass = true;
        else dodgeBrokeGeneric = true;
      }
      breakTileAt(world, dodgeMap, tx, ty, particleSystem);
    }
    if (dodgeBrokeTallGrass) playBreakableSound(breakSounds, 'tall_grass');
    if (dodgeBrokeGeneric) playBreakableSound(breakSounds, 'barrel');
    if (world.canMoveTo(state.player.position.x, state.player.position.y, newDodgeX, newDodgeY, PLAYER_MOVE_RADIUS)) {
      state.player.position.x = newDodgeX;
      state.player.position.y = newDodgeY;
    }

    if (state.player.dodgeTimer <= 0) {
      state.player.isDodging = false;
      state.player.iFrameTimer = 0;
      playerAnimState = moved ? 'walk' : 'idle';
    }
  } else if (handledLadderDismount) {
    footstepTimer = 0;
  } else if (
    moved &&
    !attackBlocksLocomotion(playerAnimState, state.player.attackAnimationTimer) &&
    !consumableUseBlocksLocomotion(playerAnimState, drinkTimer) &&
    !isBlocking &&
    !isChargingAttack &&
    playerAnimState !== 'spin_attack' &&
    playerAnimState !== 'lunge' &&
    playerAnimState !== 'lunge_recovery'
  ) {
    const rawDir = state.player.isClimbing
      ? resolveClimbFacingDirection(world, state.player.position.x, state.player.position.y, moveX, moveY)
      : getDirection8(moveX > 0 ? 1 : moveX < 0 ? -1 : 0, moveY > 0 ? 1 : moveY < 0 ? -1 : 0);
    currentDir8 = rawDir;
    state.player.direction = dir8to4(rawDir) as CardinalDirection;

    const wantsSprint = canPlayerSprint(state.player, keys.shift);
    state.player.isSprinting = wantsSprint;
    const baseSpeed = wantsSprint ? state.player.sprintSpeed : state.player.speed;
    const climbAdjusted = state.player.isClimbing ? baseSpeed * CLIMB_SPEED_MULT : baseSpeed;
    const snareAdjusted = state.player.snareTimer > 0 ? climbAdjusted * state.player.snareSpeedMult : climbAdjusted;
    // Tall grass: trudging through unchopped grass halves movement speed.
    const standingTile = world.getTile(state.player.position.x, state.player.position.y);
    const onTallGrass = standingTile?.type === 'tall_grass';
    const onSlowWalk = standingTile?.slowWalk === true;
    let grassAdjusted = onTallGrass ? snareAdjusted * TALL_GRASS_SPEED_MULT : snareAdjusted;
    if (onSlowWalk) grassAdjusted *= TALL_GRASS_SPEED_MULT;
    const currentSpeed = grassAdjusted * state.player.berserkerSpeedMult * state.getMovementSpeedMultiplier();

    if (wantsSprint) {
      state.player.stamina = Math.max(0, state.player.stamina - 16 * deltaTime);
      state.player.lastStaminaUseTime = currentTime / 1000;
      if (state.player.stamina <= 0) {
        state.player.isSprinting = false;
      }
    }

    const frameSpeed = currentSpeed * deltaTime * 60;
    const newX = state.player.position.x + moveX * frameSpeed;
    const newY = state.player.position.y + moveY * frameSpeed;
    const curX = state.player.position.x;
    const curY = state.player.position.y;
    if (climbingDismount && climbingDismountTarget && (moveX !== 0 || moveY !== 0)) {
      // Commit to the landing once a ladder dismount starts. Side exits are allowed to finish
      // even if the input is released, which makes the rail-to-ground step read as one action.
      const dismountFacing: Direction8 = climbingSideDismount
        ? Math.abs(moveX) >= Math.abs(moveY)
          ? (moveX >= 0 ? 'right' : 'left')
          : (moveY >= 0 ? 'up' : 'down')
        : rawDir;
      currentDir8 = dismountFacing;
      state.player.direction = dir8to4(dismountFacing) as CardinalDirection;
      activeLadderDismount = {
        targetX: climbingDismountTarget.x,
        targetY: climbingDismountTarget.y,
        facing: dismountFacing,
      };
      const lerp = 1 - Math.exp(-LADDER_DISMOUNT_RATE * deltaTime);
      const dismountX = curX + (climbingDismountTarget.x - curX) * lerp;
      const dismountY = curY + (climbingDismountTarget.y - curY) * lerp;
      if (world.canMoveTo(curX, curY, dismountX, dismountY, 0)) {
        state.player.position.x = dismountX;
        state.player.position.y = dismountY;
      }
    } else {
      const moveRadius = state.player.isClimbing ? CLIMB_MOVE_RADIUS : PLAYER_MOVE_RADIUS;
      if (world.canMoveTo(curX, curY, newX, newY, moveRadius)) {
        state.player.position.x = newX;
        state.player.position.y = newY;
      } else if (world.canMoveTo(curX, curY, newX, curY, moveRadius)) {
        state.player.position.x = newX;
      } else if (world.canMoveTo(curX, curY, curX, newY, moveRadius)) {
        state.player.position.y = newY;
      }
    }

    state.player.isMoving = true;

    if (
      playerAnimState !== 'attack' &&
      playerAnimState !== 'dodge' &&
      playerAnimState !== 'charge' &&
      playerAnimState !== 'drinking' &&
      playerAnimState !== 'block'
    ) {
      playerAnimState = state.player.isClimbing ? 'climb' : 'walk';
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
    if (state.player.isClimbing) {
      const climbDir = resolveClimbFacingDirection(
        world,
        state.player.position.x,
        state.player.position.y,
        0,
        0,
      );
      currentDir8 = climbDir;
      state.player.direction = dir8to4(climbDir) as CardinalDirection;
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
      playerAnimState = state.player.isClimbing ? 'climb' : 'idle';
    }
  }

  // Roll→attack buffer: a press made mid-dodge fires the moment the roll ends
  // (retrying through the post-roll attack cooldown until the TTL expires).
  if (
    attackBuffered &&
    !state.player.isDodging &&
    !isBlocking &&
    !isChargingAttack &&
    playerAnimState !== 'attack' &&
    playerAnimState !== 'spin_attack' &&
    playerAnimState !== 'lunge' &&
    playerAnimState !== 'lunge_recovery' &&
    !consumableUseBlocksLocomotion(playerAnimState, drinkTimer) &&
    !state.player.isClimbing
  ) {
    const buffered = performBufferedAttack();
    if (buffered) {
      attackBuffered = false;
      playerAnimState = 'attack';
      attackFrame = 0;
      attackFrameTimer = buffered.frameDuration;
      comboStep = 0;
      comboWindowTimer = 0;
    }
  }

  if (playerAnimState === 'attack') {
    attackFrameTimer -= deltaTime;
    if (attackFrameTimer <= 0) {
      attackFrame++;
      if (attackFrame >= 3) {
        // Swing complete - open the combo chain window
        playerAnimState = moved ? 'walk' : 'idle';
        attackFrame = 0;
        state.player.attackAnimationTimer = 0;
        comboWindowTimer = comboWindowDuration;

        // If input was buffered during the swing, chain immediately.
        // After a finisher (step >= 2) triggerComboChain wraps back to step 0
        // so the player keeps swinging instead of dropping the press.
        const lastStep = Math.max(0, comboStepCount - 1);
        if (comboInputBuffered) {
          comboInputBuffered = false;
          const chainResult = triggerComboChain();
          if (chainResult) {
            comboStep = comboStep >= lastStep ? 0 : comboStep + 1; // mirror triggerComboChain's wrap-or-advance
            attackFrame = 0;
            attackFrameTimer = chainResult.frameDuration;
            playerAnimState = 'attack';
            comboWindowTimer = 0;
          } else {
            // Chain failed (hurt/no stamina) - enforce post-swing recovery lockout.
            state.player.attackRecoveryTimer = getComboRecovery(comboStep);
          }
        } else {
          // No input buffered - enforce recovery so rapid-fire mashing is blocked.
          state.player.attackRecoveryTimer = getComboRecovery(comboStep);
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
    const newLungeX = state.player.position.x + lungeState.dirX * step;
    const newLungeY = state.player.position.y + lungeState.dirY * step;

    if (world.canMoveTo(state.player.position.x, state.player.position.y, newLungeX, newLungeY, PLAYER_MOVE_RADIUS)) {
      state.player.position.x = newLungeX;
      state.player.position.y = newLungeY;
    } else {
      lungeState.distanceRemaining = 0;
    }

    breakTilesInRadius(world, world.getCurrentMap(), state.player.position.x, state.player.position.y, 1.0, particleSystem, {
      generic: playPropBreak,
      tallGrass: playTallGrassBreak,
    });

    lungeState.distanceRemaining -= step;

    const hitRadius = 1.5;
    const nearby = combatSystem.getEnemiesInRange(state.player.position, hitRadius, _scratchLungeEnemies);
    const { dirX, dirY } = lungeState;
    const LUNGE_POST_HIT_LOCK = 0.42;
    // Fixed push distances from the player's current position - independent of
    // how much lunge travel remains, so enemies always land well clear.
    const KNOCKBACK_DISTANCES = [3.2, 2.8, 2.4, 2.0];

    for (const enemy of nearby) {
      if (!lungeState.hitEnemyIds.has(enemy.id)) {
        // No hitting through walls / across tiers, consistent with the combo + charge.
        if (!hasPlayerMeleeLineOfSight(world, state.player.position.x, state.player.position.y, enemy.position.x, enemy.position.y)) {
          continue;
        }
        lungeState.hitEnemyIds.add(enemy.id);
        const result = onLungeHit(enemy, lungeState.damage);

        if (enemy.state !== 'dead') {
          const knockbackScale = getEnemyLungeKnockbackScale(enemy);
          for (const dist of KNOCKBACK_DISTANCES) {
            const scaledDist = Math.max(0.35, dist * knockbackScale);
            const pushX = state.player.position.x + dirX * scaledDist;
            const pushY = state.player.position.y + dirY * scaledDist;
            if (world.canEnemyMoveTo(enemy.position.x, enemy.position.y, pushX, pushY, 0.2)) {
              enemy.position.x = pushX;
              enemy.position.y = pushY;
              break;
            }
          }

          if (shouldLungeInterruptEnemy(enemy, result.staggered) && (enemy.state === 'telegraphing' || enemy.state === 'attacking')) {
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
      // separation before enemies can retaliate. Free - no stamina cost.
      if (!state.player.isDodging) {
        state.player.isDodging = true;
        state.player.dodgeTimer = state.player.dodgeDuration;
        state.player.iFrameTimer = dodgeIFrameDuration;
        state.player.dodgeDirection = { x: -lungeState.dirX, y: -lungeState.dirY };
        state.player.lastDodgeTime = performance.now();
        playerAnimState = 'dodge';
      } else {
        playerAnimState = moved ? 'walk' : 'idle';
      }
    }
    state.player.attackAnimationTimer = Math.max(0, state.player.attackAnimationTimer - deltaTime);
  }

  // ─── Arc wave per-frame: advance the wave front, hit enemies as it sweeps through ──
  // Speed is calibrated to reach maxDist in exactly SCYTHE_WAVE_DURATION (0.65 s),
  // matching the spinSwooshMesh visual in RuntimePlayerFrame.ts.
  if (arcWave.active) {
    const WAVE_SPEED = arcWave.maxDist / 0.65;
    arcWave.currentDist = Math.min(arcWave.maxDist, arcWave.currentDist + WAVE_SPEED * deltaTime);
    const allNearby = combatSystem.getEnemiesInRange(state.player.position, arcWave.maxDist + arcWave.arcWidth, _scratchLungeEnemies);
    for (const enemy of allNearby) {
      if (arcWave.hitIds.has(enemy.id)) continue;
      const edx = enemy.position.x - state.player.position.x;
      const edy = enemy.position.y - state.player.position.y;
      const fwd = edx * arcWave.dirX + edy * arcWave.dirY;
      if (fwd < 0 || fwd > arcWave.currentDist) continue;
      const perpSq = edx * edx + edy * edy - fwd * fwd;
      if (perpSq > arcWave.arcWidth * arcWave.arcWidth) continue;
      if (!hasPlayerMeleeLineOfSight(world, state.player.position.x, state.player.position.y, enemy.position.x, enemy.position.y)) continue;
      arcWave.hitIds.add(enemy.id);
      onArcWaveHit(enemy, arcWave.damage);
    }
    if (arcWave.currentDist >= arcWave.maxDist) {
      arcWave.active = false;
      arcWave.hitIds.clear();
    }
  }

  if (drinkTimer > 0) {
    playerAnimState = 'drinking';
    drinkTimer -= deltaTime;
    state.player.isMoving = false;
    state.player.isSprinting = false;
    footstepTimer = 0;
    if (Math.random() < 0.3) {
      emitHeal(state.player.position.x, state.player.position.y + 0.5, 0.3);
    }
    if (drinkTimer <= 0) {
      drinkTimer = 0;
      completeConsumableUse?.();
      playerAnimState = 'idle';
    }
  }

  if (
    playerAnimState !== 'attack' &&
    playerAnimState !== 'dodge' &&
    playerAnimState !== 'charge' &&
    playerAnimState !== 'hurt' &&
    playerAnimState !== 'spin_attack' &&
    playerAnimState !== 'lunge' &&
    playerAnimState !== 'lunge_recovery' &&
    playerAnimState !== 'drinking' &&
    playerAnimState !== 'block'
  ) {
    const frameDuration =
      playerAnimState === 'walk' || playerAnimState === 'climb'
        ? walkFrameDuration
        : idleFrameDuration;
    animTimer += deltaTime;
    if (animTimer >= frameDuration) {
      animFrame = (animFrame + 1) % 2;
      animTimer = 0;
    }
  }

  // Hurt-state override: when hit-stun is active and no priority animation is running,
  // force 'hurt' so the player's sprite visually reacts to taking damage.
  if (
    state.player.hurtTimer > 0 &&
    !state.player.isDodging &&
    (playerAnimState === 'idle' || playerAnimState === 'walk')
  ) {
    playerAnimState = 'hurt';
  }

  if (playerAnimState === 'charge') {
    // Drive the frame directly from hold progress so the sword visually rises
    // as the charge builds: frame 0 (just started) → 1 (mid wind-up) → 2 (fully coiled).
    const holdProgress = Math.min(1, chargeTimer / chargeTimeMax);
    animFrame = Math.min(2, Math.floor(holdProgress * 3));
  }

  if (!moved || state.player.isClimbing || state.player.stamina <= 0 || state.player.health < SPRINT_MIN_HEALTH) {
    state.player.isSprinting = false;
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
    attackBuffered,
    comboStep,
    comboWindowTimer,
    comboInputBuffered,
  };
}
