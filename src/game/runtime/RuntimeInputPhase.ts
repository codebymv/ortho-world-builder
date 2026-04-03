import * as THREE from 'three';
import type { Dispatch, MutableRefObject, SetStateAction } from 'react';
import type { GameState } from '@/lib/game/GameState';
import type { RuntimeSessionState } from '@/game/runtime/RuntimeSessionState';
import { createKeyboardInputController } from '@/game/runtime/RuntimeKeyboardInput';
import { createPointerInputController, createViewportResizeHandler } from '@/game/runtime/RuntimePointerInput';
import { bindRuntimeDomEvents } from '@/game/runtime/RuntimeEventBindings';

interface SetupRuntimeInputPhaseOptions {
  state: GameState;
  pausedRef: MutableRefObject<boolean>;
  playerDeadRef: MutableRefObject<boolean>;
  mapModalOpenRef: MutableRefObject<boolean>;
  setMapModalOpenRef: MutableRefObject<Dispatch<SetStateAction<boolean>>>;
  setIsPaused: Dispatch<SetStateAction<boolean>>;
  closeDialogueSession: () => void;
  notify: (title: string, options?: { id?: string; type?: string; description?: string; duration?: number }) => void;
  triggerUIUpdate: () => void;
  syncEquippedWeapon: (preferredWeaponId?: string | null) => void;
  usePotion: () => void;
  setTransitionDebugEnabled: Dispatch<SetStateAction<boolean>>;
  setTransitionDebugLines: Dispatch<SetStateAction<string[]>>;
  rebuildTransitionDebug: () => void;
  clearTransitionDebug: () => void;
  getTransitionDebug: () => boolean;
  setTransitionDebug: (enabled: boolean) => void;
  runtimeSession: RuntimeSessionState;
  playBlock: () => void;
  performAttack: () => void;
  performChargeAttack: (level: number) => void;
  chargeTimeMin: number;
  camera: THREE.OrthographicCamera;
  renderer: THREE.WebGLRenderer;
  frustumSize: number;
  bonfireMenuOpenRef: MutableRefObject<boolean>;
  closeBonfireMenu: () => void;
}

export function setupRuntimeInputPhase({
  state,
  pausedRef,
  playerDeadRef,
  mapModalOpenRef,
  setMapModalOpenRef,
  setIsPaused,
  closeDialogueSession,
  notify,
  triggerUIUpdate,
  syncEquippedWeapon,
  usePotion,
  setTransitionDebugEnabled,
  setTransitionDebugLines,
  rebuildTransitionDebug,
  clearTransitionDebug,
  getTransitionDebug,
  setTransitionDebug,
  runtimeSession,
  playBlock,
  performAttack,
  performChargeAttack,
  chargeTimeMin,
  camera,
  renderer,
  frustumSize,
  bonfireMenuOpenRef,
  closeBonfireMenu,
}: SetupRuntimeInputPhaseOptions) {
  const keys: Record<string, boolean> = {};

  const { handleKeyDown, handleKeyUp } = createKeyboardInputController({
    state,
    pausedRef,
    playerDeadRef,
    mapModalOpenRef,
    setMapModalOpenRef,
    setIsPaused,
    closeDialogueSession,
    notify,
    triggerUIUpdate,
    syncEquippedWeapon,
    usePotion,
    setTransitionDebugEnabled,
    setTransitionDebugLines,
    rebuildTransitionDebug,
    clearTransitionDebug,
    getTransitionDebug,
    setTransitionDebug,
    keys,
    setInteractBuffered: value => {
      runtimeSession.input.interactBuffered = value;
    },
    setDodgeBuffered: value => {
      runtimeSession.input.dodgeBuffered = value;
    },
    setPlayerAnimState: value => {
      runtimeSession.animation.playerAnimState = value;
    },
    getPlayerAnimState: () => runtimeSession.animation.playerAnimState,
    playBlock,
    setIsBlocking: value => {
      runtimeSession.combat.isBlocking = value;
    },
    getIsBlocking: () => runtimeSession.combat.isBlocking,
    setBlockStartTime: value => {
      runtimeSession.combat.blockStartTime = value;
    },
    bonfireMenuOpenRef,
    closeBonfireMenu,
  });

  const { handleMouseDown, handleMouseUp, handleContextMenu } = createPointerInputController({
    state,
    pausedRef,
    playerDeadRef,
    mapModalOpenRef,
    performAttack,
    performChargeAttack,
    getPlayerAnimState: () => runtimeSession.animation.playerAnimState,
    setPlayerAnimState: value => {
      runtimeSession.animation.playerAnimState = value;
    },
    playBlock,
    getIsChargingAttack: () => runtimeSession.animation.isChargingAttack,
    setIsChargingAttack: value => {
      runtimeSession.animation.isChargingAttack = value;
    },
    setChargeTimer: value => {
      runtimeSession.animation.chargeTimer = value;
    },
    setChargeLevel: value => {
      runtimeSession.animation.chargeLevel = value;
    },
    getChargeLevel: () => runtimeSession.animation.chargeLevel,
    getIsBlocking: () => runtimeSession.combat.isBlocking,
    setIsBlocking: value => {
      runtimeSession.combat.isBlocking = value;
    },
    setBlockStartTime: value => {
      runtimeSession.combat.blockStartTime = value;
    },
    getIsLmbHeld: () => runtimeSession.input.isLmbHeld,
    setIsLmbHeld: value => {
      runtimeSession.input.isLmbHeld = value;
    },
    setIsRmbHeld: value => {
      runtimeSession.combat.isRmbHeld = value;
    },
    getLmbHoldStartTime: () => runtimeSession.input.lmbHoldStartTime,
    setLmbHoldStartTime: value => {
      runtimeSession.input.lmbHoldStartTime = value;
    },
    chargeTimeMin,
  });

  const handleResize = createViewportResizeHandler({
    camera,
    renderer,
    frustumSize,
  });

  const detachDomEvents = bindRuntimeDomEvents({
    rendererDomElement: renderer.domElement,
    handleKeyDown,
    handleKeyUp,
    handleResize,
    handleMouseDown,
    handleMouseUp,
    handleContextMenu,
  });

  return {
    keys,
    detachDomEvents,
  };
}
