import type { MutableRefObject } from 'react';
import type { GameState } from '@/lib/game/GameState';
import * as THREE from 'three';

type PlayerAnimState =
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

interface PointerInputOptions {
  state: GameState;
  pausedRef: MutableRefObject<boolean>;
  playerDeadRef: MutableRefObject<boolean>;
  mapModalOpenRef: MutableRefObject<boolean>;
  performAttack: () => void;
  performChargeAttack: (level: number) => void;
  getPlayerAnimState: () => PlayerAnimState;
  setPlayerAnimState: (value: PlayerAnimState) => void;
  playBlock: () => void;
  getIsChargingAttack: () => boolean;
  setIsChargingAttack: (value: boolean) => void;
  setChargeTimer: (value: number) => void;
  setChargeLevel: (value: number) => void;
  getChargeLevel: () => number;
  getIsBlocking: () => boolean;
  setIsBlocking: (value: boolean) => void;
  setBlockStartTime: (value: number) => void;
  getIsLmbHeld: () => boolean;
  setIsLmbHeld: (value: boolean) => void;
  setIsRmbHeld: (value: boolean) => void;
  getLmbHoldStartTime: () => number;
  setLmbHoldStartTime: (value: number) => void;
  chargeTimeMin: number;
  getComboWindowTimer: () => number;
}

export function createPointerInputController({
  state,
  pausedRef,
  playerDeadRef,
  mapModalOpenRef,
  performAttack,
  performChargeAttack,
  getPlayerAnimState,
  setPlayerAnimState,
  playBlock,
  getIsChargingAttack,
  setIsChargingAttack,
  setChargeTimer,
  setChargeLevel,
  getChargeLevel,
  getIsBlocking,
  setIsBlocking,
  setBlockStartTime,
  getIsLmbHeld,
  setIsLmbHeld,
  setIsRmbHeld,
  getLmbHoldStartTime,
  setLmbHoldStartTime,
  chargeTimeMin,
  getComboWindowTimer,
}: PointerInputOptions) {
  const clearChargeState = () => {
    setIsLmbHeld(false);
    setIsChargingAttack(false);
    setChargeTimer(0);
    setChargeLevel(0);
  };

  const releaseBlock = () => {
    setIsRmbHeld(false);
    if (getIsBlocking()) {
      setIsBlocking(false);
      if (getPlayerAnimState() === 'block') {
        setPlayerAnimState('idle');
      }
    }
  };

  const handleMouseDown = (e: MouseEvent) => {
    if (pausedRef.current || mapModalOpenRef.current || playerDeadRef.current) return;

    if (e.button === 0) {
      if (!state.dialogueActive && !state.player.isDodging) {
        const currentTime = Date.now();
        const playerAnimState = getPlayerAnimState();

        // Mid-swing: call performAttack directly so it can set comboInputBuffered.
        // Bypass the charge system entirely — the combo chain handles its own timing.
        if (playerAnimState === 'attack') {
          performAttack();
          return;
        }

        // In the combo chain window (after animation ends, before window expires):
        // register the mousedown so mouseup can call performAttack for the chain.
        // Bypass the attackCooldown gate since the chain has its own timing logic.
        if (getComboWindowTimer() > 0) {
          setIsLmbHeld(true);
          setLmbHoldStartTime(currentTime);
          return;
        }

        // Normal flow: respect the cooldown gate and start the charge system
        if (currentTime - state.player.lastAttackTime >= state.player.attackCooldown) {
          setIsLmbHeld(true);
          setLmbHoldStartTime(currentTime);
          if (
            !getIsChargingAttack() &&
            playerAnimState !== 'spin_attack' &&
            playerAnimState !== 'lunge' &&
            playerAnimState !== 'lunge_recovery' &&
            playerAnimState !== 'drinking' &&
            playerAnimState !== 'block'
          ) {
            setIsChargingAttack(true);
            setChargeTimer(0);
            setChargeLevel(0);
            setPlayerAnimState('charge');
          }
        }
      }
      return;
    }

    if (e.button === 2) {
      setIsRmbHeld(true);
      const currentAnim = getPlayerAnimState();
      if (currentAnim === 'lunge' || currentAnim === 'lunge_recovery') return;
      if (!getIsBlocking() && !state.player.isDodging && state.player.stamina > 0) {
        setIsBlocking(true);
        setBlockStartTime(performance.now() / 1000);
        playBlock();
        if (
          currentAnim !== 'attack' &&
          currentAnim !== 'spin_attack' &&
          currentAnim !== 'drinking' &&
          currentAnim !== 'block'
        ) {
          setPlayerAnimState('block');
        }
      }
    }
  };

  const handleMouseUp = (e: MouseEvent) => {
    if (pausedRef.current || mapModalOpenRef.current) {
      if (e.button === 0) clearChargeState();
      if (e.button === 2) releaseBlock();
      return;
    }

    if (e.button === 0) {
      if (getIsLmbHeld()) {
        setIsLmbHeld(false);
        const holdDuration = (Date.now() - getLmbHoldStartTime()) / 1000;
        if (getIsChargingAttack()) {
          if (holdDuration >= chargeTimeMin) {
            performChargeAttack(getChargeLevel());
          } else {
            performAttack();
          }
          setIsChargingAttack(false);
          setChargeTimer(0);
          setChargeLevel(0);
        }
      }
      return;
    }

    if (e.button === 2) {
      releaseBlock();
    }
  };

  const handleContextMenu = (e: MouseEvent) => {
    e.preventDefault();
  };

  return {
    handleMouseDown,
    handleMouseUp,
    handleContextMenu,
  };
}

interface ViewportResizeOptions {
  camera: THREE.OrthographicCamera;
  renderer: THREE.WebGLRenderer;
  frustumSize: number;
}

export function createViewportResizeHandler({
  camera,
  renderer,
  frustumSize,
}: ViewportResizeOptions) {
  return () => {
    const aspect = window.innerWidth / window.innerHeight;
    camera.left = (frustumSize * aspect) / -2;
    camera.right = (frustumSize * aspect) / 2;
    camera.top = frustumSize / 2;
    camera.bottom = frustumSize / -2;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  };
}
