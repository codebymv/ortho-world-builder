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
  inventoryModalOpenRef: MutableRefObject<boolean>;
  setInventoryModalOpenRef: MutableRefObject<Dispatch<SetStateAction<boolean>>>;
  objectivesModalOpenRef: MutableRefObject<boolean>;
  setObjectivesModalOpenRef: MutableRefObject<Dispatch<SetStateAction<boolean>>>;
  vendorModalOpenRef: MutableRefObject<boolean>;
  setVendorModalOpenRef: MutableRefObject<Dispatch<SetStateAction<boolean>>>;
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
  inventoryModalOpenRef,
  setInventoryModalOpenRef,
  objectivesModalOpenRef,
  setObjectivesModalOpenRef,
  vendorModalOpenRef,
  setVendorModalOpenRef,
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

  const resetInputState = () => {
    for (const key of Object.keys(keys)) {
      keys[key] = false;
    }

    runtimeSession.input.interactBuffered = false;
    runtimeSession.input.dodgeBuffered = false;
    runtimeSession.input.potionBuffered = false;
    runtimeSession.input.comboInputBuffered = false;
    runtimeSession.input.isLmbHeld = false;
    runtimeSession.input.lmbHoldStartTime = 0;

    runtimeSession.combat.isRmbHeld = false;
    runtimeSession.combat.blockStartTime = 0;
    runtimeSession.combat.blockAngle = 0;
    if (runtimeSession.combat.isBlocking) {
      runtimeSession.combat.isBlocking = false;
    }

    runtimeSession.animation.isChargingAttack = false;
    runtimeSession.animation.chargeTimer = 0;
    runtimeSession.animation.chargeLevel = 0;
    if (
      runtimeSession.animation.playerAnimState === 'block' ||
      runtimeSession.animation.playerAnimState === 'charge'
    ) {
      runtimeSession.animation.playerAnimState = 'idle';
    }
  };

  const { handleKeyDown, handleKeyUp } = createKeyboardInputController({
    state,
    pausedRef,
    playerDeadRef,
    mapModalOpenRef,
    setMapModalOpenRef,
    inventoryModalOpenRef,
    setInventoryModalOpenRef,
    objectivesModalOpenRef,
    setObjectivesModalOpenRef,
    vendorModalOpenRef,
    setVendorModalOpenRef,
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
    getComboWindowTimer: () => runtimeSession.animation.comboWindowTimer,
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
    resetInputState,
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
