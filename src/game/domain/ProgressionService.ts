import type { Dialogue, DialogueNode } from '@/data/dialogues';
import type { GameState, Item, Quest } from '@/lib/game/GameState';
import { getVillageReactivityStage, VILLAGE_REACTIVITY_FLAGS } from '@/game/domain/VillageReactivity';

type NotificationType = 'success' | 'info' | 'error';

interface NotificationOptions {
  id?: string;
  type?: NotificationType;
  description?: string;
  duration?: number;
}

interface DialogueContext {
  node: DialogueNode;
  npcName: string;
}

interface DialogueResponseContext {
  state: GameState;
  currentDialogue: DialogueContext;
  nextId: string;
  givesQuest?: string;
}

interface ProgressionServiceContext {
  dialogues: Record<string, Dialogue>;
  quests: Record<string, Quest>;
  items: Record<string, Item>;
  criticalPathItems: Record<string, { itemId: string; collectedFlag: string }>;
  notify: (message: string, options?: NotificationOptions) => void;
  addMarkersFromText: (text: string, mapId: string) => void;
  clearNpcMarkerPulse: (mapId: string) => void;
  getKillCount: () => number;
  triggerUIUpdate: () => void;
  triggerMinimapUpdate: (reset: boolean) => void;
  syncVillageReactivity?: () => void;
}

interface DialogueResponseResult {
  shouldCloseDialogue: boolean;
  nextNode: DialogueNode | null;
  shouldSave: boolean;
}

const CHECKMARK = '\u2713';

export function createProgressionService(context: ProgressionServiceContext) {
  const selectVillageReactivityNode = (
    state: GameState,
    dialogue: Dialogue,
    fallback: DialogueNode | null,
  ) => {
    const villageStage = getVillageReactivityStage(state);

    if (villageStage === 'after_deep_woods') {
      return dialogue.nodes.find(node => node.id === 'shadow_watch') ?? fallback;
    }

    if (villageStage === 'after_manuscript') {
      return dialogue.nodes.find(node => node.id === 'manuscript_return') ?? fallback;
    }

    return fallback;
  };

  const selectDialogueStartNode = (state: GameState, dialogueId: string): DialogueNode | null => {
    const dialogue = context.dialogues[dialogueId];
    if (!dialogue) return null;

    let startNode = dialogue.nodes.find(node => node.id === 'start') ?? null;

    if (dialogueId === 'elder') {
      const hunterQuest = state.quests.find(q => q.id === 'find_hunter');
      const deepQuest = state.quests.find(q => q.id === 'clear_deep_woods');
      const villageStage = getVillageReactivityStage(state);

      if (deepQuest?.active && !deepQuest.completed && deepQuest.objectives[2]?.includes(CHECKMARK)) {
        startNode = dialogue.nodes.find(node => node.id === 'deep_woods_report') ?? startNode;
      } else if (deepQuest?.active && !deepQuest.completed) {
        startNode = dialogue.nodes.find(node => node.id === 'deep_woods_active') ?? startNode;
      } else if (villageStage === 'after_deep_woods') {
        startNode = dialogue.nodes.find(node => node.id === 'shadow_watch') ?? startNode;
      } else if (hunterQuest?.completed) {
        startNode = dialogue.nodes.find(node => node.id === 'quest_complete') ?? startNode;
      } else if (hunterQuest?.active) {
        startNode = dialogue.nodes.find(node => node.id === 'quest_active') ?? startNode;
      }
    }

    if (dialogueId === 'guard') {
      const guardQuest = state.quests.find(q => q.id === 'guard_duty' && q.active && !q.completed);
      if (guardQuest?.objectives[1]?.includes(CHECKMARK)) {
        startNode = dialogue.nodes.find(node => node.id === 'guard_turnin') ?? startNode;
      } else {
        startNode = selectVillageReactivityNode(state, dialogue, startNode);
      }
    }

    if (dialogueId === 'merchant') {
      const merchantQuest = state.quests.find(q => q.id === 'merchants_request' && q.active && !q.completed);
      const moonCount = state.inventory.filter(item => item.id === 'moonbloom').length;
      if (merchantQuest && moonCount >= 3) {
        startNode = dialogue.nodes.find(node => node.id === 'merchant_moonbloom_deliver') ?? startNode;
      } else {
        startNode = selectVillageReactivityNode(state, dialogue, startNode);
      }
    }

    if (dialogueId === 'forest_ranger') {
      const rangerQuest = state.quests.find(q => q.id === 'rangers_request');
      if (rangerQuest?.completed) {
        startNode = dialogue.nodes.find(node => node.id === 'after_quest') ?? startNode;
      } else if (rangerQuest?.active && !rangerQuest.completed) {
        if (state.getFlag('forest_golem_defeated')) {
          rangerQuest.objectives[0] = `Defeat the Stone Golem ${CHECKMARK}`;
          rangerQuest.objectives[1] = 'Return to the ranger';
          startNode = dialogue.nodes.find(node => node.id === 'quest_complete') ?? startNode;
        } else {
          startNode = dialogue.nodes.find(node => node.id === 'quest_active') ?? startNode;
        }
      }
    }

    if (['blacksmith', 'healer', 'apothecary', 'chapel_keeper', 'farmer', 'child', 'innkeeper'].includes(dialogueId)) {
      startNode = selectVillageReactivityNode(state, dialogue, startNode);
    }

    return startNode;
  };

  const syncMoonbloomObjective = (state: GameState) => {
    const merchantQuest = state.quests.find(q => q.id === 'merchants_request');
    if (!merchantQuest) return;

    const count = state.inventory.filter(item => item.id === 'moonbloom').length;
    const clamped = Math.min(count, 3);
    merchantQuest.objectives[0] = `Find Moonbloom flowers (${clamped}/3)`;
    if (count >= 3) {
      merchantQuest.objectives[0] = `Find Moonbloom flowers (3/3) ${CHECKMARK}`;
    }
  };

  const acceptQuest = (state: GameState, questId: string): boolean => {
    const questTemplate = context.quests[questId];
    if (!questTemplate) return false;
    if (state.quests.some(q => q.id === questId)) return false;

    const quest = { ...questTemplate, objectives: [...questTemplate.objectives], active: true };
    state.addQuest(quest);
    context.notify(`Quest Accepted: ${quest.title}`, {
      id: `quest-accept-${quest.id}`,
      type: 'success',
      description: quest.description,
      duration: 6000,
    });
    // Stop any NPC markers on this map from pulsing — the player just spoke to the quest-giver
    // and is now heading somewhere else, so quest-giver NPC dots should not keep blinking.
    context.clearNpcMarkerPulse(state.currentMap);

    context.addMarkersFromText(quest.description, state.currentMap);
    // Only scan the first objective for markers — later objectives (e.g. "Return to the elder")
    // get their markers created at the correct time by the progression system, so we don't
    // pre-create markers that make past/future NPCs glow when they aren't the active target.
    if (quest.objectives.length > 0) {
      context.addMarkersFromText(quest.objectives[0], state.currentMap);
    }

    if (questId === 'guard_duty') {
      state.setFlag('guard_duty_kill_baseline', Number(state.getFlag('forest_kill_count')) || 0);
    }

    if (questId === 'merchants_request') {
      syncMoonbloomObjective(state);
    }

    context.triggerUIUpdate();
    return true;
  };

  const applyMerchantPurchase = (state: GameState, nodeId: string) => {
    if (nodeId === 'buy_potion') {
      if (state.player.gold >= 10) {
        state.spendGold(10);
        state.addItem(context.items.health_potion);
        context.notify('Purchased Ephemeral Extract!', {
          type: 'success',
          description: 'Spent 10 gold.',
          duration: 2500,
        });
      } else {
        context.notify('Not enough gold!', { id: 'no-gold', type: 'error', duration: 2000 });
      }
      context.triggerUIUpdate();
    }

    if (nodeId === 'buy_artifact') {
      if (state.player.gold >= 50) {
        state.spendGold(50);
        state.addItem(context.items.ancient_map);
        context.notify('Purchased Ancient Artifact!', {
          type: 'success',
          description: 'Spent 50 gold.',
          duration: 2500,
        });
      } else {
        context.notify('Not enough gold!', { id: 'no-gold', type: 'error', duration: 2000 });
      }
      context.triggerUIUpdate();
    }
  };

  const handleDialogueResponse = ({
    state,
    currentDialogue,
    nextId,
    givesQuest,
  }: DialogueResponseContext): DialogueResponseResult => {
    let shouldSave = false;

    if (givesQuest) {
      shouldSave = acceptQuest(state, givesQuest) || shouldSave;
    }

    if (state.currentDialogue === 'merchant' && nextId === 'end') {
      applyMerchantPurchase(state, currentDialogue.node.id);
    }

    if (state.currentDialogue === 'hunter_clue' && nextId === 'complete_quest') {
      const manuscriptConfig = context.criticalPathItems.hunter_clue;
      if (!state.getFlag(manuscriptConfig.collectedFlag)) {
        state.setFlag(manuscriptConfig.collectedFlag, true);
        if (!state.hasItem(manuscriptConfig.itemId)) {
          state.addItem({ ...context.items[manuscriptConfig.itemId] });
        }
        context.notify("Hunter's Manuscript Acquired", {
          id: 'hunters-manuscript',
          type: 'success',
          description: 'The loose pages may be the clue the Elder needs.',
          duration: 3600,
        });
      }

      const hunterQuest = state.quests.find(q => q.id === 'find_hunter' && q.active && !q.completed);
      if (hunterQuest) {
        hunterQuest.objectives[1] = `Find the Disparaged Cottage ${CHECKMARK}`;
        hunterQuest.objectives[2] = `Recover the Hunter's Manuscript ${CHECKMARK}`;
        context.addMarkersFromText('Village Elder', 'village');
        context.triggerUIUpdate();
        context.triggerMinimapUpdate(true);
        shouldSave = true;
      }
    }

    if (state.currentDialogue === 'elder' && nextId === 'end' && currentDialogue.node.id === 'give_second_quest') {
      const hunterQuestPending = state.quests.find(q => q.id === 'find_hunter' && q.active && !q.completed);
      if (hunterQuestPending) {
        hunterQuestPending.objectives[3] = `Return to the elder with your findings ${CHECKMARK}`;
        state.completeQuest('find_hunter');
        context.notify('Quest Completed: The Missing Hunter!', {
          id: 'quest-done-hunter',
          type: 'success',
          description: 'The Elder now knows the truth of the forest.',
          duration: 6000,
        });
        context.triggerUIUpdate();
      }
      state.setFlag(VILLAGE_REACTIVITY_FLAGS.afterManuscript, true);
      context.syncVillageReactivity?.();
      shouldSave = true;
    }

    if (['healer', 'apothecary'].includes(state.currentDialogue) && nextId === 'end' && currentDialogue.node.id === 'heal') {
      state.player.health = state.player.maxHealth;
      context.triggerUIUpdate();
    }

    if (state.currentDialogue === 'witch_hut_lore' && nextId === 'lore') {
      const deepQuest = state.quests.find(q => q.id === 'clear_deep_woods' && q.active && !q.completed);
      if (deepQuest) {
        deepQuest.objectives[2] = `Learn about the dark magic ${CHECKMARK}`;
      }
      context.triggerUIUpdate();
    }

    if (
      state.currentDialogue === 'witch_sign' &&
      nextId === 'end' &&
      currentDialogue.node.id === 'start' &&
      state.currentMap === 'deep_woods'
    ) {
      const deepQuest = state.quests.find(q => q.id === 'clear_deep_woods' && q.active && !q.completed);
      if (deepQuest) {
        deepQuest.objectives[1] = `Find the witch's hut ${CHECKMARK}`;
      }
      context.triggerUIUpdate();
    }

    if (state.currentDialogue === 'elder' && nextId === 'end' && currentDialogue.node.id === 'elder_deep_done') {
      const deepQuest = state.quests.find(q => q.id === 'clear_deep_woods' && q.active && !q.completed);
      if (deepQuest) {
        state.setFlag(VILLAGE_REACTIVITY_FLAGS.afterDeepWoods, true);
        deepQuest.objectives[3] = `Return to the elder ${CHECKMARK}`;
        state.completeQuest('clear_deep_woods');
        context.notify('Quest Completed: Into the Depths!', {
          id: 'quest-done-depths',
          type: 'success',
          description: 'The village is safer for your courage.',
          duration: 6000,
        });
        context.triggerUIUpdate();
        context.triggerMinimapUpdate(true);
        context.syncVillageReactivity?.();
        shouldSave = true;
      }
    }

    if (state.currentDialogue === 'guard' && nextId === 'end' && currentDialogue.node.id === 'guard_turnin') {
      const guardQuest = state.quests.find(q => q.id === 'guard_duty' && q.active && !q.completed);
      if (guardQuest && guardQuest.objectives[1]?.includes(CHECKMARK)) {
        guardQuest.objectives[2] = `Report back to the guard ${CHECKMARK}`;
        state.completeQuest('guard_duty');
        context.notify('Quest Completed: Guard Duty!', {
          id: 'quest-done-guard',
          type: 'success',
          description: 'The border is a little quieter tonight.',
          duration: 6000,
        });
        context.triggerUIUpdate();
        shouldSave = true;
      }
    }

    if (state.currentDialogue === 'merchant' && nextId === 'end' && currentDialogue.node.id === 'merchant_moonbloom_deliver') {
      const merchantQuest = state.quests.find(q => q.id === 'merchants_request' && q.active && !q.completed);
      const moonCount = state.inventory.filter(item => item.id === 'moonbloom').length;
      if (merchantQuest && moonCount >= 3) {
        for (let i = 0; i < 3; i++) {
          state.removeItem('moonbloom');
        }
        merchantQuest.objectives[1] = `Return to the merchant ${CHECKMARK}`;
        state.completeQuest('merchants_request');
        context.notify("Quest Completed: Merchant's Rare Goods!", {
          id: 'quest-done-merchant',
          type: 'success',
          description: 'Your purse grows heavier.',
          duration: 6000,
        });
        context.triggerUIUpdate();
        shouldSave = true;
      }
    }

    if (state.currentDialogue === 'forest_ranger' && nextId === 'end' && currentDialogue.node.id === 'quest_complete') {
      const rangerQuest = state.quests.find(q => q.id === 'rangers_request' && q.active && !q.completed);
      if (rangerQuest && state.getFlag('forest_golem_defeated')) {
        rangerQuest.objectives[0] = `Defeat the Stone Golem ${CHECKMARK}`;
        rangerQuest.objectives[1] = `Return to the ranger ${CHECKMARK}`;
        state.completeQuest('rangers_request');
        context.notify("Quest Completed: The Ranger's Request!", {
          id: 'quest-done-ranger',
          type: 'success',
          description: 'The eastern high road is open again.',
          duration: 6000,
        });
        context.triggerUIUpdate();
        shouldSave = true;
      }
    }

    if (nextId === 'end' || !state.currentDialogue) {
      return {
        shouldCloseDialogue: true,
        nextNode: null,
        shouldSave: true,
      };
    }

    const dialogue = context.dialogues[state.currentDialogue];
    const nextNode = dialogue?.nodes.find(node => node.id === nextId) ?? null;
    if (nextNode) {
      context.addMarkersFromText(nextNode.text, state.currentMap);
    }

    return {
      shouldCloseDialogue: false,
      nextNode,
      shouldSave,
    };
  };

  return {
    selectDialogueStartNode,
    handleDialogueResponse,
  };
}
