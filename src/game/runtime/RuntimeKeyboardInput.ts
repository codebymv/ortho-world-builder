import type { Dispatch, MutableRefObject, SetStateAction } from 'react';
import type { GameState } from '@/lib/game/GameState';

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
  usePotion: () => void;
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
  playBlock: () => void;
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
  usePotion,
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
  playBlock,
  setIsBlocking,
  getIsBlocking,
  setBlockStartTime,
}: RuntimeKeyboardInputOptions) {
  const cycleConsumable = (direction: -1 | 1) => {
    if (state.dialogueActive) return;
    const consumableIndexesById = new Map<string, number>();
    state.inventory.forEach((item, index) => {
      if (item.type === 'consumable' && !consumableIndexesById.has(item.id)) {
        consumableIndexesById.set(item.id, index);
      }
    });
    const consumableIndexes = Array.from(consumableIndexesById.values());
    if (consumableIndexes.length === 0) return;

    const activeItem = state.inventory[state.activeItemIndex];
    const currentIndex =
      activeItem?.type === 'consumable' && consumableIndexesById.has(activeItem.id)
        ? consumableIndexesById.get(activeItem.id)!
        : state.activeItemIndex;
    const currentPosition = consumableIndexes.indexOf(currentIndex);
    const basePosition = currentPosition >= 0 ? currentPosition : 0;
    const nextPosition =
      direction === -1
        ? (basePosition - 1 + consumableIndexes.length) % consumableIndexes.length
        : (basePosition + 1) % consumableIndexes.length;

    const nextIndex = consumableIndexes[nextPosition];
    if (state.activeItemIndex !== nextIndex) {
      state.activeItemIndex = nextIndex;
      triggerUIUpdate();
    }
  };

  const cycleWeapon = (direction: -1 | 1) => {
    if (state.dialogueActive) return;
    const weaponIds: string[] = [];
    state.inventory.forEach(item => {
      if (item.type === 'equipment' && !weaponIds.includes(item.id)) {
        weaponIds.push(item.id);
      }
    });
    if (weaponIds.length === 0) return;

    const currentIndex = Math.max(0, weaponIds.indexOf(state.equippedWeaponId ?? weaponIds[0]));
    const nextIndex =
      direction === -1
        ? (currentIndex - 1 + weaponIds.length) % weaponIds.length
        : (currentIndex + 1) % weaponIds.length;
    const nextWeaponId = weaponIds[nextIndex];
    if (nextWeaponId !== state.equippedWeaponId) {
      syncEquippedWeapon(nextWeaponId);
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

    if (pausedRef.current || mapModalOpenRef.current || playerDeadRef.current) return;

    keys[e.key.toLowerCase()] = true;
    if (e.key.toLowerCase() === 'f' && !state.dialogueActive) {
      setInteractBuffered(true);
    }
    if (e.key.toLowerCase() === 'q') {
      cycleConsumable(-1);
    }
    if (e.key.toLowerCase() === 'e') {
      cycleConsumable(1);
    }
    if (e.key.toLowerCase() === 'z' && !state.dialogueActive) {
      e.preventDefault();
      usePotion();
    }
    if (e.key === 'ArrowLeft') {
      e.preventDefault();
      cycleWeapon(-1);
    }
    if (e.key === 'ArrowRight') {
      e.preventDefault();
      cycleWeapon(1);
    }
    if (e.key === ' ' && !state.dialogueActive) {
      e.preventDefault();
      setDodgeBuffered(true);
    }
    if (e.key === 'Control' && !state.dialogueActive) {
      if (!getIsBlocking() && !state.player.isDodging && state.player.stamina > 0) {
        setIsBlocking(true);
        setBlockStartTime(performance.now() / 1000);
        playBlock();
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
