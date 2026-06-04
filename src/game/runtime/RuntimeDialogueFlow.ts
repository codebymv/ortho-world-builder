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
  createDialogueProgression: () => DialogueProgressionLike | null;
  activeNpcWorldPos: MutableRefObject<{ x: number; y: number } | null>;
  setCurrentDialogue: Dispatch<SetStateAction<{ node: DialogueNode; npcName: string } | null>>;
  addMarkersFromText: (text: string, currentMap: string) => void;
  playItemGrab: () => void;
  playGoldPickup: () => void;
  playEssencePickup: () => void;
  playGrassPull: () => void;
  playChestUnlock: () => void;
  playGateShortcut: () => void;
  playLeverPull: () => void;
  playGateOpenHeavy: () => void;
  playGateLockedHeavy: () => void;
  playDoorOpenWood: () => void;
  playDoorCloseWood: () => void;
  playDoorLocked: () => void;
  playLadderClimb: () => void;
  particleSystem: {
    emitSparkles: (position: THREE.Vector3) => void;
    emitHeal: (position: THREE.Vector3) => void;
  };
  notify: (message: string, options?: { id?: string; type?: 'success' | 'info' | 'error'; description?: string; duration?: number }) => void;
  triggerSave: () => void;
  triggerUIUpdate: () => void;
  performBonfireRest: (tileX: number, tileY: number) => void;
  syncOpenedChestState: () => void;
  syncRangerWolfRingChestState: () => void;
  triggerMinimapUpdate: (reset: boolean) => void;
  syncHarvestedTempestGrassState: () => void;
  syncHarvestedMoonbloomState: () => void;
  getInteractionCooldown: (interactionId: string) => number;
  setInteractionCooldown: (interactionId: string, timestamp: number) => void;
  healCooldownMs: number;
  handleMapTransition: (targetMap: string, targetX: number, targetY: number) => void;
  activateSwitch: (doorId: string) => void;
  updateWorldChunksAtPlayer: () => void;
  syncWhisperingWoodsShortcutState: () => void;
  syncGroveShelfShortcutState: () => void;
  syncWestCliffGateState: () => void;
  syncRiversideBridgeShortcutState: () => void;
  syncHollowShortcutState: () => void;
  syncEastHollowRouteGateState: () => void;
  syncHollowApproachLadderState: () => void;
  syncCliffCorridorLadderState: () => void;
  syncFortRidgeLadderState: () => void;
  syncForestFortGateState: () => void;
  syncNorthFortGateState: () => void;
  syncWestFortGateState: () => void;
  syncGolemFortGateState: () => void;
  syncManuscriptCheckpointGateState: () => void;
  syncGuilrhymBossState: () => void;
  showHeroOverlay: (title: string, subtitle?: string) => void;
  hasDialogue: (interactionId: string) => boolean;
  onWorldItemPickup?: (itemId: string) => void;
  getAliveEnemyCountNearPlayer?: (radius: number) => number;
}

export function createRuntimeDialogueFlow({
  state,
  items,
  createDialogueProgression,
  activeNpcWorldPos,
  setCurrentDialogue,
  addMarkersFromText,
  playItemGrab,
  playGoldPickup,
  playEssencePickup,
  playGrassPull,
  playChestUnlock,
  playGateShortcut,
  playLeverPull,
  playGateOpenHeavy,
  playGateLockedHeavy,
  playDoorOpenWood,
  playDoorCloseWood,
  playDoorLocked,
  playLadderClimb,
  particleSystem,
  notify,
  triggerSave,
  triggerUIUpdate,
  performBonfireRest,
  syncOpenedChestState,
  syncRangerWolfRingChestState,
  triggerMinimapUpdate,
  syncHarvestedTempestGrassState,
  syncHarvestedMoonbloomState,
  getInteractionCooldown,
  setInteractionCooldown,
  healCooldownMs,
  handleMapTransition,
  activateSwitch,
  updateWorldChunksAtPlayer,
  syncWhisperingWoodsShortcutState,
  syncGroveShelfShortcutState,
  syncWestCliffGateState,
  syncRiversideBridgeShortcutState,
  syncHollowShortcutState,
  syncEastHollowRouteGateState,
  syncHollowApproachLadderState,
  syncCliffCorridorLadderState,
  syncFortRidgeLadderState,
  syncForestFortGateState,
  syncNorthFortGateState,
  syncWestFortGateState,
  syncGolemFortGateState,
  syncManuscriptCheckpointGateState,
  syncGuilrhymBossState,
  showHeroOverlay,
  hasDialogue,
  onWorldItemPickup,
  getAliveEnemyCountNearPlayer,
}: CreateRuntimeDialogueFlowOptions) {
  let progressionService: DialogueProgressionLike | null = null;

  const getProgressionService = () => {
    if (!progressionService) {
      progressionService = createDialogueProgression();
    }
    return progressionService;
  };

  const startDialogue = (dialogueId: string, npcName?: string) => {
    const service = getProgressionService();
    if (!service) return;

    const startNode = service.selectDialogueStartNode(state, dialogueId);
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
    playGoldPickup,
    playEssencePickup,
    playGrassPull,
    playChestUnlock,
    playGateShortcut,
    playLeverPull,
    playGateOpenHeavy,
    playGateLockedHeavy,
    playDoorOpenWood,
    playDoorCloseWood,
    playDoorLocked,
    playLadderClimb,
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
    syncRangerWolfRingChestState,
    triggerMinimapUpdate,
    syncHarvestedTempestGrassState,
    syncHarvestedMoonbloomState,
    getInteractionCooldown,
    setInteractionCooldown,
    healCooldownMs,
    handleMapTransition,
    activateSwitch,
    updateWorldChunksAtPlayer,
    syncWhisperingWoodsShortcutState,
    syncGroveShelfShortcutState,
    syncWestCliffGateState,
    syncRiversideBridgeShortcutState,
    syncHollowShortcutState,
  syncEastHollowRouteGateState,
    syncHollowApproachLadderState,
    syncCliffCorridorLadderState,
    syncFortRidgeLadderState,
    syncForestFortGateState,
    syncNorthFortGateState,
    syncWestFortGateState,
    syncGolemFortGateState,
    syncManuscriptCheckpointGateState,
    syncGuilrhymBossState,
    showHeroOverlay,
    hasDialogue,
    onWorldItemPickup,
    getAliveEnemyCountNearPlayer,
  });

  return {
    startDialogue,
    interactionSystem,
  };
}
