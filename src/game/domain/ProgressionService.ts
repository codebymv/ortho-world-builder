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
  opensVendor?: string;
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
  syncBlightedRootState?: () => void;
}

interface DialogueResponseResult {
  shouldCloseDialogue: boolean;
  nextNode: DialogueNode | null;
  shouldSave: boolean;
  openVendorId?: string;
}

const CHECKMARK = '\u2713';

export function createProgressionService(context: ProgressionServiceContext) {
  const selectVillageReactivityNode = (
    state: GameState,
    dialogue: Dialogue,
    fallback: DialogueNode | null,
  ) => {
    const villageStage = getVillageReactivityStage(state);

    if (villageStage === 'after_reaver') {
      return dialogue.nodes.find(node => node.id === 'after_reaver') ?? fallback;
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
      const pursuitQuest = state.quests.find(q => q.id === 'heretical_pursuit');
      const villageStage = getVillageReactivityStage(state);

      if (villageStage === 'after_reaver') {
        startNode = dialogue.nodes.find(node => node.id === 'after_reaver') ?? startNode;
      } else if (pursuitQuest?.active && !pursuitQuest.completed) {
        startNode = dialogue.nodes.find(node => node.id === 'heretical_pursuit_active') ?? startNode;
      } else if (hunterQuest?.active && state.getFlag('hunters_manuscript_collected')) {
        startNode = dialogue.nodes.find(node => node.id === 'quest_complete') ?? startNode;
      } else if (hunterQuest?.active && state.getFlag('manuscript_fragment_collected')) {
        startNode = dialogue.nodes.find(node => node.id === 'quest_active_fragment') ?? startNode;
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

    if (dialogueId === 'blighted_root') {
      if (state.getFlag('blighted_root_destroyed')) {
        startNode = dialogue.nodes.find(node => node.id === 'already_destroyed') ?? startNode;
      }
    }

    if (dialogueId === 'petra_ashveil') {
      if (state.getFlag('petra_heart_delivered')) {
        startNode = dialogue.nodes.find(node => node.id === 'after_delivery') ?? startNode;
      } else if (state.hasItem('golem_heart')) {
        startNode = dialogue.nodes.find(node => node.id === 'has_heart') ?? startNode;
      }
    }

    if (dialogueId === 'grove_warden') {
      const groveQuest = state.quests.find(q => q.id === 'blighted_heart');
      if (groveQuest?.completed) {
        startNode = dialogue.nodes.find(node => node.id === 'after_quest') ?? startNode;
      } else if (groveQuest?.active && !groveQuest.completed) {
        if (state.getFlag('blighted_root_destroyed')) {
          startNode = dialogue.nodes.find(node => node.id === 'quest_turnin') ?? startNode;
        } else {
          startNode = dialogue.nodes.find(node => node.id === 'quest_active') ?? startNode;
        }
      }
    }

    if (dialogueId === 'oliver') {
      const pursuitQuest = state.quests.find(q => q.id === 'heretical_pursuit');
      if (state.getFlag('ashen_reaver_defeated')) {
        startNode = dialogue.nodes.find(node => node.id === 'after_reaver') ?? startNode;
      } else if (pursuitQuest?.active && !pursuitQuest.completed) {
        startNode = dialogue.nodes.find(node => node.id === 'quest_active') ?? startNode;
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


  const handleDialogueResponse = ({
    state,
    currentDialogue,
    nextId,
    givesQuest,
    opensVendor,
  }: DialogueResponseContext): DialogueResponseResult => {
    let shouldSave = false;

    // If the response opens a vendor, close dialogue and signal the vendor to open
    if (opensVendor) {
      return {
        shouldCloseDialogue: true,
        nextNode: null,
        shouldSave: false,
        openVendorId: opensVendor,
      };
    }

    if (givesQuest) {
      shouldSave = acceptQuest(state, givesQuest) || shouldSave;
    }

    if (state.currentDialogue === 'chapel_dead_ranger' && currentDialogue.node.id === 'take_key' && nextId === 'end') {
      if (!state.getFlag('chapel_key_collected')) {
        state.setFlag('chapel_key_collected', true);
        state.addItem({ ...context.items.fort_gate_key });
        context.notify('Fort Gate Key Acquired', {
          id: 'fort-key-pickup',
          type: 'success',
          description: 'The key bears the same crest as the fort banner.',
          duration: 3200,
        });
        shouldSave = true;
        context.triggerUIUpdate();
      }
    }

    if (state.currentDialogue === 'hunter_clue' && nextId === 'end') {
      state.setFlag('hunter_clue_dialogue_seen', true);
      shouldSave = true;
    }

    if (state.currentDialogue === 'elder' && nextId === 'end' && currentDialogue.node.id === 'quest_complete') {
      state.setFlag(VILLAGE_REACTIVITY_FLAGS.afterManuscript, true);
      context.syncVillageReactivity?.();
      shouldSave = true;
    }

    if (state.currentDialogue === 'elder' && nextId === 'end' && currentDialogue.node.id === 'after_reaver') {
      const pursuitQuest = state.quests.find(q => q.id === 'heretical_pursuit' && q.active && !q.completed);
      if (pursuitQuest) {
        pursuitQuest.objectives[4] = `Return to the Elder ${CHECKMARK}`;
        state.completeQuest('heretical_pursuit');
        state.setFlag(VILLAGE_REACTIVITY_FLAGS.afterReaver, true);
        context.notify('Quest Completed: The Heretical Pursuit!', {
          id: 'quest-done-pursuit',
          type: 'success',
          description: 'The Ashen Court is broken, but the heretical magic runs deeper still.',
          duration: 6000,
        });
        context.triggerUIUpdate();
        context.triggerMinimapUpdate(true);
        context.syncVillageReactivity?.();
      }
      shouldSave = true;
    }

    if (state.currentDialogue !== null && ['healer', 'apothecary'].includes(state.currentDialogue) && nextId === 'end' && currentDialogue.node.id === 'heal') {
      state.player.health = state.player.maxHealth;
      context.triggerUIUpdate();
    }

    if (state.currentDialogue === 'oliver' && nextId === 'end' && currentDialogue.node.id === 'warning') {
      const pursuitQuest = state.quests.find(q => q.id === 'heretical_pursuit' && q.active && !q.completed);
      if (pursuitQuest) {
        pursuitQuest.objectives[0] = `Find a survivor in Gilrhym ${CHECKMARK}`;
        pursuitQuest.objectives[1] = `Learn about the Ashen Court ${CHECKMARK}`;
        context.triggerUIUpdate();
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

    if (state.currentDialogue === 'blighted_root' && currentDialogue.node.id === 'destroy' && nextId === 'end') {
      if (!state.getFlag('blighted_root_destroyed')) {
        state.setFlag('blighted_root_destroyed', true);
        context.syncBlightedRootState?.();
      }
      let blightedRootProgress = false;
      // Grant the quest item whenever it is still missing (decoupled from flag — avoids softlocks).
      if (context.items.blighted_root_shard && !state.hasItem('blighted_root_shard')) {
        state.addItem({ ...context.items.blighted_root_shard });
        context.notify('Blighted Root Destroyed', {
          id: 'blighted-root-destroyed',
          type: 'success',
          description: 'A gnarled shard pulses in your hands. Return it to Warden Callum.',
          duration: 3600,
        });
        shouldSave = true;
        blightedRootProgress = true;
      }
      const groveQuest = state.quests.find(q => q.id === 'blighted_heart' && q.active && !q.completed);
      if (groveQuest) {
        groveQuest.objectives[1] = `Find and destroy the Blighted Root ${CHECKMARK}`;
        context.addMarkersFromText('Warden Callum', state.currentMap);
        shouldSave = true;
        blightedRootProgress = true;
      }
      if (blightedRootProgress) {
        context.triggerUIUpdate();
        context.triggerMinimapUpdate(true);
      }
    }

    if (state.currentDialogue === 'blighted_root' && currentDialogue.node.id === 'already_destroyed' && nextId === 'end') {
      const heartQuest = state.quests.find(q => q.id === 'blighted_heart');
      if (!heartQuest?.completed && context.items.blighted_root_shard && !state.hasItem('blighted_root_shard')) {
        state.addItem({ ...context.items.blighted_root_shard });
        context.notify('Blighted Root Destroyed', {
          id: 'blighted-root-destroyed-return',
          type: 'success',
          description: 'You pry loose a last loose fragment from the dead growth. Return it to Warden Callum.',
          duration: 3600,
        });
        const groveQuest = state.quests.find(q => q.id === 'blighted_heart' && q.active && !q.completed);
        if (groveQuest) {
          groveQuest.objectives[1] = `Find and destroy the Blighted Root ${CHECKMARK}`;
          context.addMarkersFromText('Warden Callum', state.currentMap);
        }
        context.triggerUIUpdate();
        context.triggerMinimapUpdate(true);
        shouldSave = true;
      }
    }

    if (state.currentDialogue === 'petra_ashveil' && nextId === 'end' && currentDialogue.node.id === 'deliver_heart') {
      if (!state.getFlag('petra_heart_delivered') && state.hasItem('golem_heart')) {
        state.removeItem('golem_heart');
        state.addEssence(2000);
        state.setFlag('petra_heart_delivered', true);
        context.notify('Golem Heart Sold!', {
          id: 'petra-heart-sold',
          type: 'success',
          description: 'Petra Ashveil paid 2,000 essence for the Golem Heart.',
          duration: 4000,
        });
        context.triggerUIUpdate();
        shouldSave = true;
      }
    }

    if (state.currentDialogue === 'grove_warden' && nextId === 'end' && currentDialogue.node.id === 'reward') {
      const groveQuest = state.quests.find(q => q.id === 'blighted_heart' && q.active && !q.completed);
      if (groveQuest && state.getFlag('blighted_root_destroyed')) {
        state.removeItem('blighted_root_shard');
        groveQuest.objectives[2] = `Return to Warden Callum ${CHECKMARK}`;
        state.completeQuest('blighted_heart');
        context.notify('Quest Completed: The Blighted Heart!', {
          id: 'quest-done-grove',
          type: 'success',
          description: 'The grove will heal. Three Verdant Tonics and 75 gold earned.',
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
