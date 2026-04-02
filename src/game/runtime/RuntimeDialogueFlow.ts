import * as THREE from 'three';
import type { Dispatch, MutableRefObject, SetStateAction } from 'react';
import type { DialogueNode } from '@/data/dialogues';
import type { GameState, Item } from '@/lib/game/GameState';
import { createInteractionSystem } from '@/game/domain/InteractionSystem';

interface DialogueProgressionLike {
  selectDialogueStartNode: (state: GameState, dialogueId: string) => DialogueNode | null | undefined;
}

interface CreateRuntimeDialogueFlowOptions {
  state: GameState;
  items: Record<string, Item>;
  createDialogueProgression: () => DialogueProgressionLike;
  activeNpcWorldPos: MutableRefObject<{ x: number; y: number } | null>;
  setCurrentDialogue: Dispatch<SetStateAction<{ node: DialogueNode; npcName: string } | null>>;
  addMarkersFromText: (text: string, currentMap: string) => void;
  playItemGrab: () => void;
  playGrassPull: () => void;
  playChestUnlock: () => void;
  playGateShortcut: () => void;
  particleSystem: {
    emitSparkles: (position: THREE.Vector3) => void;
    emitHeal: (position: THREE.Vector3) => void;
  };
  notify: (message: string, options?: { id?: string; type?: 'success' | 'info' | 'error'; description?: string; duration?: number }) => void;
  triggerSave: () => void;
  triggerUIUpdate: () => void;
  performBonfireRest: (tileX: number, tileY: number) => void;
  syncOpenedChestState: () => void;
  syncHarvestedTempestGrassState: () => void;
  getInteractionCooldown: (interactionId: string) => number;
  setInteractionCooldown: (interactionId: string, timestamp: number) => void;
  healCooldownMs: number;
  handleMapTransition: (targetMap: string, targetX: number, targetY: number) => void;
  activateSwitch: (doorId: string) => void;
  updateWorldChunksAtPlayer: () => void;
  syncWhisperingWoodsShortcutState: () => void;
  syncHollowShortcutState: () => void;
  syncForestFortGateState: () => void;
  showHeroOverlay: (title: string, subtitle?: string) => void;
  hasDialogue: (interactionId: string) => boolean;
}

export function createRuntimeDialogueFlow({
  state,
  items,
  createDialogueProgression,
  activeNpcWorldPos,
  setCurrentDialogue,
  addMarkersFromText,
  playItemGrab,
  playGrassPull,
  playChestUnlock,
  playGateShortcut,
  particleSystem,
  notify,
  triggerSave,
  triggerUIUpdate,
  performBonfireRest,
  syncOpenedChestState,
  syncHarvestedTempestGrassState,
  getInteractionCooldown,
  setInteractionCooldown,
  healCooldownMs,
  handleMapTransition,
  activateSwitch,
  updateWorldChunksAtPlayer,
  syncWhisperingWoodsShortcutState,
  syncHollowShortcutState,
  syncForestFortGateState,
  showHeroOverlay,
  hasDialogue,
}: CreateRuntimeDialogueFlowOptions) {
  const progressionService = createDialogueProgression();

  const startDialogue = (dialogueId: string, npcName?: string) => {
    const startNode = progressionService.selectDialogueStartNode(state, dialogueId);
    if (!startNode) return;

    state.dialogueActive = true;
    state.currentDialogue = dialogueId;

    const npc = state.npcs.find(n => n.dialogueId === dialogueId);
    if (npc) {
      activeNpcWorldPos.current = { x: npc.position.x, y: npc.position.y };
    } else {
      activeNpcWorldPos.current = null;
    }

    setCurrentDialogue({ node: startNode, npcName: npcName || '' });
    addMarkersFromText(startNode.text, state.currentMap);
  };

  const interactionSystem = createInteractionSystem({
    state,
    startDialogue,
    items,
    playItemGrab,
    playGrassPull,
    playChestUnlock,
    playGateShortcut,
    emitSparkles: position => {
      particleSystem.emitSparkles(position);
    },
    emitHeal: position => {
      particleSystem.emitHeal(position);
    },
    notify,
    triggerSave,
    triggerUIUpdate,
    performBonfireRest,
    syncOpenedChestState,
    syncHarvestedTempestGrassState,
    getInteractionCooldown,
    setInteractionCooldown,
    healCooldownMs,
    handleMapTransition,
    activateSwitch,
    updateWorldChunksAtPlayer,
    syncWhisperingWoodsShortcutState,
    syncHollowShortcutState,
    syncForestFortGateState,
    showHeroOverlay,
    hasDialogue,
  });

  return {
    startDialogue,
    interactionSystem,
  };
}
