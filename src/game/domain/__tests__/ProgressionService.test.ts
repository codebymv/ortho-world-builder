import { describe, it, expect, beforeEach, vi } from 'vitest';
import * as THREE from 'three';

// Stub notificationBus so toasts don't leak setTimeout handles between tests.
vi.mock('@/lib/game/notificationBus', () => ({
  notify: vi.fn(),
}));

import { createProgressionService } from '../ProgressionService';
import { GameState } from '@/lib/game/GameState';
import { quests as questCatalog } from '@/data/quests';
import { items as itemCatalog } from '@/data/items';
import type { Dialogue, DialogueNode } from '@/data/dialogues';

const CHECKMARK = '✓';

function makeState(): GameState {
  // ProgressionService never touches scene/camera methods — pass empty stubs.
  const scene = {} as unknown as THREE.Scene;
  const camera = {} as unknown as THREE.OrthographicCamera;
  return new GameState(scene, camera);
}

function makeService(state: GameState, overrides: Partial<Parameters<typeof createProgressionService>[0]> = {}) {
  const notify = vi.fn();
  const addMarkersFromText = vi.fn();
  const clearNpcMarkerPulse = vi.fn();
  const triggerUIUpdate = vi.fn();
  const triggerMinimapUpdate = vi.fn();
  const syncVillageReactivity = vi.fn();
  const syncBlightedRootState = vi.fn();
  const getKillCount = vi.fn(() => 0);

  const dialogues: Record<string, Dialogue> = {};
  const criticalPathItems: Record<string, { itemId: string; collectedFlag: string }> = {};

  const service = createProgressionService({
    dialogues,
    quests: questCatalog,
    items: itemCatalog,
    criticalPathItems,
    notify,
    addMarkersFromText,
    clearNpcMarkerPulse,
    getKillCount,
    triggerUIUpdate,
    triggerMinimapUpdate,
    syncVillageReactivity,
    syncBlightedRootState,
    ...overrides,
  });

  return {
    service,
    spies: { notify, addMarkersFromText, clearNpcMarkerPulse, triggerUIUpdate, triggerMinimapUpdate, syncVillageReactivity, syncBlightedRootState, getKillCount },
    dialogues,
  };
}

function makeDialogue(id: string, nodes: Pick<DialogueNode, 'id' | 'text'>[]): Dialogue {
  return {
    id,
    npcName: id,
    nodes: nodes.map(n => ({ ...n, responses: [] } as DialogueNode)),
  };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('selectDialogueStartNode', () => {
  it('returns null when dialogue id is unknown', () => {
    const state = makeState();
    const { service } = makeService(state);
    expect(service.selectDialogueStartNode(state, 'nonexistent')).toBeNull();
  });

  it('returns the "start" node by default', () => {
    const state = makeState();
    const { service, dialogues } = makeService(state);
    dialogues.blacksmith = makeDialogue('blacksmith', [
      { id: 'start', text: 'Greetings, traveler.' },
    ]);
    const node = service.selectDialogueStartNode(state, 'blacksmith');
    expect(node?.id).toBe('start');
  });

  it('routes elder dialogue to quest_active when find_hunter is accepted', () => {
    const state = makeState();
    state.addQuest({ ...questCatalog.find_hunter, active: true, objectives: [...questCatalog.find_hunter.objectives] });
    const { service, dialogues } = makeService(state);
    dialogues.elder = makeDialogue('elder', [
      { id: 'start', text: 'Hello' },
      { id: 'quest_active', text: 'How goes the search?' },
    ]);
    const node = service.selectDialogueStartNode(state, 'elder');
    expect(node?.id).toBe('quest_active');
  });

  it('routes elder dialogue to quest_complete when hunters_manuscript_collected', () => {
    const state = makeState();
    state.addQuest({ ...questCatalog.find_hunter, active: true, objectives: [...questCatalog.find_hunter.objectives] });
    state.setFlag('hunters_manuscript_collected', true);
    const { service, dialogues } = makeService(state);
    dialogues.elder = makeDialogue('elder', [
      { id: 'start', text: 'Hello' },
      { id: 'quest_active', text: 'How goes the search?' },
      { id: 'quest_complete', text: 'You found it!' },
    ]);
    const node = service.selectDialogueStartNode(state, 'elder');
    expect(node?.id).toBe('quest_complete');
  });

  it('routes blighted_root to already_destroyed once the flag is set', () => {
    const state = makeState();
    state.setFlag('blighted_root_destroyed', true);
    const { service, dialogues } = makeService(state);
    dialogues.blighted_root = makeDialogue('blighted_root', [
      { id: 'start', text: 'It pulses.' },
      { id: 'already_destroyed', text: 'It is dead.' },
    ]);
    const node = service.selectDialogueStartNode(state, 'blighted_root');
    expect(node?.id).toBe('already_destroyed');
  });
});

describe('handleDialogueResponse — quest acceptance', () => {
  it('accepting a quest via givesQuest adds it to state and notifies', () => {
    const state = makeState();
    state.currentDialogue = 'elder';
    const { service, spies } = makeService(state);

    const result = service.handleDialogueResponse({
      state,
      currentDialogue: { node: { id: 'offer', text: '', responses: [] }, npcName: 'Elder' },
      nextId: 'end',
      givesQuest: 'find_hunter',
    });

    expect(state.quests.find(q => q.id === 'find_hunter')?.active).toBe(true);
    expect(spies.notify).toHaveBeenCalledWith(
      'Quest Accepted: The Missing Hunter',
      expect.objectContaining({ id: 'quest-accept-find_hunter' }),
    );
    expect(result.shouldCloseDialogue).toBe(true);
    expect(result.shouldSave).toBe(true);
  });

  it('accepting the same quest twice is a no-op', () => {
    const state = makeState();
    state.currentDialogue = 'elder';
    const { service, spies } = makeService(state);

    service.handleDialogueResponse({
      state,
      currentDialogue: { node: { id: 'offer', text: '', responses: [] }, npcName: 'Elder' },
      nextId: 'end',
      givesQuest: 'find_hunter',
    });
    spies.notify.mockClear();

    service.handleDialogueResponse({
      state,
      currentDialogue: { node: { id: 'offer', text: '', responses: [] }, npcName: 'Elder' },
      nextId: 'end',
      givesQuest: 'find_hunter',
    });

    expect(state.quests.filter(q => q.id === 'find_hunter')).toHaveLength(1);
    expect(spies.notify).not.toHaveBeenCalled();
  });

  it('accepting guard_duty captures the forest_kill_count baseline', () => {
    const state = makeState();
    state.currentDialogue = 'guard';
    state.setFlag('forest_kill_count', 7);
    const { service } = makeService(state);

    service.handleDialogueResponse({
      state,
      currentDialogue: { node: { id: 'offer', text: '', responses: [] }, npcName: 'Guard' },
      nextId: 'end',
      givesQuest: 'guard_duty',
    });

    expect(state.getFlagNumber('guard_duty_kill_baseline')).toBe(7);
  });
});

describe('handleDialogueResponse — chapel key pickup', () => {
  it('grants the fort gate key once and sets the flag', () => {
    const state = makeState();
    state.currentDialogue = 'chapel_dead_ranger';
    const { service, spies } = makeService(state);

    service.handleDialogueResponse({
      state,
      currentDialogue: { node: { id: 'take_key', text: '', responses: [] }, npcName: 'Dead Ranger' },
      nextId: 'end',
    });

    expect(state.hasItem('fort_gate_key')).toBe(true);
    expect(state.getFlagBool('chapel_key_collected')).toBe(true);
    expect(spies.notify).toHaveBeenCalledWith('Fort Gate Key Acquired', expect.any(Object));
  });

  it('does not duplicate the key on a second pickup', () => {
    const state = makeState();
    state.currentDialogue = 'chapel_dead_ranger';
    const { service } = makeService(state);

    const ctx = {
      state,
      currentDialogue: { node: { id: 'take_key', text: '', responses: [] }, npcName: 'Dead Ranger' },
      nextId: 'end',
    };
    service.handleDialogueResponse(ctx);
    service.handleDialogueResponse(ctx);

    expect(state.inventory.filter(i => i.id === 'fort_gate_key')).toHaveLength(1);
  });
});

describe('handleDialogueResponse — guard_duty turn-in', () => {
  it('completes guard_duty when the kill objective is checked and player turns in', () => {
    const state = makeState();
    state.currentDialogue = 'guard';
    const { service, spies } = makeService(state);

    service.handleDialogueResponse({
      state,
      currentDialogue: { node: { id: 'offer', text: '', responses: [] }, npcName: 'Guard' },
      nextId: 'end',
      givesQuest: 'guard_duty',
    });
    const quest = state.quests.find(q => q.id === 'guard_duty')!;
    quest.objectives[1] = `Defeat any hostile creatures (5/5) ${CHECKMARK}`;
    spies.notify.mockClear();

    service.handleDialogueResponse({
      state,
      currentDialogue: { node: { id: 'guard_turnin', text: '', responses: [] }, npcName: 'Guard' },
      nextId: 'end',
    });

    expect(state.quests.find(q => q.id === 'guard_duty')?.completed).toBe(true);
    expect(spies.notify).toHaveBeenCalledWith('Quest Completed: Guard Duty!', expect.any(Object));
  });

  it('does not complete guard_duty when the kill objective is still open', () => {
    const state = makeState();
    state.currentDialogue = 'guard';
    const { service, spies } = makeService(state);

    service.handleDialogueResponse({
      state,
      currentDialogue: { node: { id: 'offer', text: '', responses: [] }, npcName: 'Guard' },
      nextId: 'end',
      givesQuest: 'guard_duty',
    });
    spies.notify.mockClear();

    service.handleDialogueResponse({
      state,
      currentDialogue: { node: { id: 'guard_turnin', text: '', responses: [] }, npcName: 'Guard' },
      nextId: 'end',
    });

    expect(state.quests.find(q => q.id === 'guard_duty')?.completed).toBe(false);
    expect(spies.notify).not.toHaveBeenCalledWith('Quest Completed: Guard Duty!', expect.any(Object));
  });
});

describe('handleDialogueResponse — vendor open short-circuits', () => {
  it('opening a vendor closes dialogue and returns the vendor id', () => {
    const state = makeState();
    state.currentDialogue = 'merchant';
    const { service } = makeService(state);

    const result = service.handleDialogueResponse({
      state,
      currentDialogue: { node: { id: 'shop', text: '', responses: [] }, npcName: 'Merchant' },
      nextId: 'shop',
      opensVendor: 'merchant_shop',
    });

    expect(result.shouldCloseDialogue).toBe(true);
    expect(result.openVendorId).toBe('merchant_shop');
    expect(result.shouldSave).toBe(false);
  });
});

describe('handleDialogueResponse — Olwen ring hint', () => {
  it('adds the ranger cottage hint when the player does not already have the Wolf Ring', () => {
    const state = makeState();
    state.currentDialogue = 'mountain_hermit';
    const { service, spies } = makeService(state);

    const result = service.handleDialogueResponse({
      state,
      currentDialogue: { node: { id: 'offer_ring', text: '', responses: [] }, npcName: 'Olwen' },
      nextId: 'take_ring',
    });

    expect(state.getFlag('olwen_ranger_cabin_hint')).toBe(true);
    expect(spies.notify).toHaveBeenCalledWith(
      'Location Revealed',
      expect.objectContaining({ id: 'olwen-cabin-hint' }),
    );
    expect(spies.triggerMinimapUpdate).toHaveBeenCalledWith(true);
    expect(result.shouldSave).toBe(true);
  });

  it('does not add a secondary hint if the Wolf Ring was already found', () => {
    const state = makeState();
    state.currentDialogue = 'mountain_hermit';
    state.setFlag('wolf_ring_received', true);
    const { service, spies } = makeService(state);

    const result = service.handleDialogueResponse({
      state,
      currentDialogue: { node: { id: 'offer_ring', text: '', responses: [] }, npcName: 'Olwen' },
      nextId: 'take_ring',
    });

    expect(state.getFlag('olwen_ranger_cabin_hint')).toBe(false);
    expect(spies.notify).not.toHaveBeenCalledWith(
      'Location Revealed',
      expect.anything(),
    );
    expect(spies.triggerMinimapUpdate).not.toHaveBeenCalled();
    expect(result.shouldSave).toBe(false);
  });
});

describe('handleDialogueResponse — healer/apothecary heal action', () => {
  it('heals the player to max when ending the heal node', () => {
    const state = makeState();
    state.currentDialogue = 'healer';
    state.player.health = 10;
    state.player.maxHealth = 100;
    const { service } = makeService(state);

    service.handleDialogueResponse({
      state,
      currentDialogue: { node: { id: 'heal', text: '', responses: [] }, npcName: 'Healer' },
      nextId: 'end',
    });

    expect(state.player.health).toBe(100);
  });
});
