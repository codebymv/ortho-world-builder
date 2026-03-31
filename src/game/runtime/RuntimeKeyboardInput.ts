import type { Dispatch, MutableRefObject, SetStateAction } from 'react';
import type { GameState, Item } from '@/lib/game/GameState';

type PlayerAnimState =
  | 'idle'
  | 'walk'
  | 'attack'
  | 'dodge'
  | 'charge'
  | 'hurt'
  | 'spin_attack'
  | 'drinking'
  | 'block';

interface RuntimeKeyboardInputOptions {
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
  setTransitionDebugEnabled: Dispatch<SetStateAction<boolean>>;
  setTransitionDebugLines: Dispatch<SetStateAction<string[]>>;
  rebuildTransitionDebug: () => void;
  clearTransitionDebug: () => void;
  getTransitionDebug: () => boolean;
  setTransitionDebug: (enabled: boolean) => void;
  keys: Record<string, boolean>;
  setInteractBuffered: (value: boolean) => void;
  setDodgeBuffered: (value: boolean) => void;
  setPlayerAnimState: (value: PlayerAnimState) => void;
  getPlayerAnimState: () => PlayerAnimState;
  setDrinkTimer: (value: number) => void;
  drinkDuration: number;
  setIsBlocking: (value: boolean) => void;
  getIsBlocking: () => boolean;
  setBlockStartTime: (value: number) => void;
}

export function createKeyboardInputController({
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
  setTransitionDebugEnabled,
  setTransitionDebugLines,
  rebuildTransitionDebug,
  clearTransitionDebug,
  getTransitionDebug,
  setTransitionDebug,
  keys,
  setInteractBuffered,
  setDodgeBuffered,
  setPlayerAnimState,
  getPlayerAnimState,
  setDrinkTimer,
  drinkDuration,
  setIsBlocking,
  getIsBlocking,
  setBlockStartTime,
}: RuntimeKeyboardInputOptions) {
  const cycleActiveItem = (direction: -1 | 1) => {
    if (state.dialogueActive || state.inventory.length === 0) return;

    let nextIndex =
      direction === -1
        ? (state.activeItemIndex - 1 + state.inventory.length) % state.inventory.length
        : (state.activeItemIndex + 1) % state.inventory.length;

    const startId = state.inventory[state.activeItemIndex]?.id;
    let count = 0;
    while (state.inventory[nextIndex]?.id === startId && count < state.inventory.length) {
      nextIndex =
        direction === -1
          ? (nextIndex - 1 + state.inventory.length) % state.inventory.length
          : (nextIndex + 1) % state.inventory.length;
      count++;
    }

    if (state.activeItemIndex !== nextIndex) {
      state.activeItemIndex = nextIndex;
      if (state.inventory[nextIndex]?.type === 'equipment') {
        syncEquippedWeapon(state.inventory[nextIndex].id);
      }
      triggerUIUpdate();
    }
  };

  const useSelectedConsumable = () => {
    const activeItem = state.inventory[state.activeItemIndex];
    if (activeItem?.type !== 'consumable') {
      setDodgeBuffered(true);
      return;
    }

    if (typeof activeItem.healAmount === 'number' && activeItem.healAmount > 0) {
      if (state.player.health >= state.player.maxHealth) {
        notify('Already at full health!', { id: 'full-health', duration: 1500 });
        return;
      }
      setPlayerAnimState('drinking');
      setDrinkTimer(drinkDuration);
      state.player.health = Math.min(state.player.maxHealth, state.player.health + activeItem.healAmount);
      state.removeItem(activeItem.id);
      notify(`Used ${activeItem.name}`, {
        id: `used-${activeItem.id}`,
        type: 'success',
        description: `Restored ${activeItem.healAmount} health.`,
        duration: 2000,
      });
      if (state.activeItemIndex >= state.inventory.length) {
        state.activeItemIndex = Math.max(0, state.inventory.length - 1);
      }
      triggerUIUpdate();
    }
  };

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      if (mapModalOpenRef.current) {
        setMapModalOpenRef.current(false);
        return;
      }
      if (state.dialogueActive) {
        closeDialogueSession();
        return;
      }
      pausedRef.current = !pausedRef.current;
      setIsPaused(pausedRef.current);
      return;
    }

    if (e.key.toLowerCase() === 'm' && !e.repeat) {
      if (pausedRef.current || state.dialogueActive || playerDeadRef.current) return;
      e.preventDefault();
      setMapModalOpenRef.current(v => !v);
      return;
    }

    if (e.key.toLowerCase() === 'v' && !e.repeat) {
      const nextDebug = !getTransitionDebug();
      setTransitionDebug(nextDebug);
      setTransitionDebugEnabled(nextDebug);
      if (nextDebug) {
        rebuildTransitionDebug();
        notify('Transition debug ON', {
          id: 'transition-debug-on',
          description: 'Markers: yellow entrance, orange exit, purple portal, cyan transition.',
          duration: 2400,
        });
      } else {
        clearTransitionDebug();
        setTransitionDebugLines([]);
        notify('Transition debug OFF', { id: 'transition-debug-off', duration: 1600 });
      }
      return;
    }

    if (pausedRef.current || mapModalOpenRef.current) return;

    keys[e.key.toLowerCase()] = true;
    if (e.key.toLowerCase() === 'f' && !state.dialogueActive) {
      setInteractBuffered(true);
    }
    if (e.key.toLowerCase() === 'q') {
      cycleActiveItem(-1);
    }
    if (e.key.toLowerCase() === 'e') {
      cycleActiveItem(1);
    }
    if (e.key === ' ' && !state.dialogueActive) {
      e.preventDefault();
      useSelectedConsumable();
    }
    if (e.key === 'Control' && !state.dialogueActive) {
      if (!getIsBlocking() && !state.player.isDodging && state.player.stamina > 0) {
        setIsBlocking(true);
        setBlockStartTime(performance.now() / 1000);
        const playerAnimState = getPlayerAnimState();
        if (
          playerAnimState !== 'attack' &&
          playerAnimState !== 'spin_attack' &&
          playerAnimState !== 'drinking' &&
          playerAnimState !== 'block'
        ) {
          setPlayerAnimState('block');
        }
      }
      keys.control = true;
    }
    if (e.key === 'Shift') {
      keys.shift = true;
    }
  };

  const handleKeyUp = (e: KeyboardEvent) => {
    if (pausedRef.current && e.key !== 'Escape') return;
    keys[e.key.toLowerCase()] = false;
    if (e.key === 'Shift') {
      keys.shift = false;
    }
    if (e.key === 'Control') {
      keys.control = false;
      if (getIsBlocking()) {
        setIsBlocking(false);
        if (getPlayerAnimState() === 'block') {
          setPlayerAnimState('idle');
        }
      }
    }
  };

  return {
    handleKeyDown,
    handleKeyUp,
  };
}
