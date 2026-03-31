import * as THREE from 'three';
import type { GameState, Item } from '@/lib/game/GameState';
import type { World } from '@/lib/game/World';
import type { ParticleSystem } from '@/lib/game/ParticleSystem';
import type { CriticalPathItemVisual } from '@/data/criticalPathItems';
import { getInteractionPromptLabel } from '@/game/runtime/RuntimeWorldUtils';

interface CreateRuntimePhaseAdaptersOptions {
  state: GameState;
  world: World;
  particleSystem: ParticleSystem;
  tempVector: THREE.Vector3;
  criticalItemInteractionIds: Set<string>;
  criticalPathItems: Record<string, CriticalPathItemVisual>;
  items: Record<string, Item>;
  setInteractionPrompt: (prompt: string | null) => void;
  closeDialogueSession: () => void;
  isPortalDestinationUnlocked: (targetMap: string) => boolean;
}

export function createRuntimePhaseAdapters({
  state,
  world,
  particleSystem,
  tempVector,
  criticalItemInteractionIds,
  criticalPathItems,
  items,
  setInteractionPrompt,
  closeDialogueSession,
  isPortalDestinationUnlocked,
}: CreateRuntimePhaseAdaptersOptions) {
  return {
    emitDust: (x: number, y: number) => {
      tempVector.set(x, y, 0);
      particleSystem.emitDust(tempVector);
    },
    emitHeal: (x: number, y: number, z: number) => {
      tempVector.set(x, y, z);
      particleSystem.emitHeal(tempVector);
    },
    resolveInteractionPrompt: (
      interactionId: string,
      promptState: GameState,
      promptWorld: World,
      x: number,
      y: number,
      npcName?: string,
    ) =>
      getInteractionPromptLabel(
        interactionId,
        promptState,
        promptWorld,
        x,
        y,
        criticalItemInteractionIds,
        criticalPathItems,
        items,
        npcName,
      ),
    isPortalDestinationUnlocked,
    isCollectedCriticalItem: (interactionId: string) =>
      state.getFlag(criticalPathItems[interactionId].collectedFlag),
    isChestOpened: (interactionId: string) => state.getFlag(`${interactionId}_opened`),
    isConsumablePickupCollected: (interactionId: string, x: number, y: number) =>
      interactionId === 'tempest_grass_pickup'
        ? state.getFlag(`tempest_grass_${state.currentMap}_${Math.round(x)}_${Math.round(y)}`)
        : false,
    setInteractionPrompt,
    closeDialogueSession,
  };
}
