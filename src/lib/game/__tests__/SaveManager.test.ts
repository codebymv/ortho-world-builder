import { describe, it, expect, beforeEach, vi } from 'vitest';
import { SaveManager, type SaveData } from '../SaveManager';

// Minimal in-memory localStorage shim — vitest runs in node, so global
// localStorage isn't defined by default.
class MemoryStorage {
  private store = new Map<string, string>();
  getItem(key: string) { return this.store.has(key) ? this.store.get(key)! : null; }
  setItem(key: string, value: string) { this.store.set(key, value); }
  removeItem(key: string) { this.store.delete(key); }
  clear() { this.store.clear(); }
  get length() { return this.store.size; }
  key(i: number) { return Array.from(this.store.keys())[i] ?? null; }
}

const SAVE_KEY = 'rpg_save_data';

beforeEach(() => {
  (globalThis as { localStorage: MemoryStorage }).localStorage = new MemoryStorage();
  vi.restoreAllMocks();
});

function writeRaw(payload: unknown) {
  localStorage.setItem(SAVE_KEY, JSON.stringify(payload));
}

describe('SaveManager.load — corruption handling', () => {
  it('returns null when no save exists', () => {
    expect(SaveManager.load()).toBeNull();
  });

  it('returns null and logs on invalid JSON', () => {
    const err = vi.spyOn(console, 'error').mockImplementation(() => {});
    localStorage.setItem(SAVE_KEY, '{not json');
    expect(SaveManager.load()).toBeNull();
    expect(err).toHaveBeenCalledOnce();
  });

  it('returns null and logs when payload is not an object', () => {
    const err = vi.spyOn(console, 'error').mockImplementation(() => {});
    writeRaw('a string');
    expect(SaveManager.load()).toBeNull();
    expect(err).toHaveBeenCalledOnce();
  });

  it('returns null and logs when payload is an array', () => {
    const err = vi.spyOn(console, 'error').mockImplementation(() => {});
    writeRaw([1, 2, 3]);
    expect(SaveManager.load()).toBeNull();
    expect(err).toHaveBeenCalledOnce();
  });
});

describe('SaveManager.load — defaults for missing v5 fields', () => {
  it('fills mapMarkers, visitedTiles, quests, gameFlags, worldItems, inventory as empty', () => {
    writeRaw({
      version: 2,
      timestamp: 123,
      player: {
        position: { x: 5, y: 10 },
        direction: 'left',
        health: 80,
        maxHealth: 100,
        gold: 7,
        essence: 3,
        attackDamage: 25,
        stamina: 100,
        maxStamina: 120,
      },
      currentMap: 'whispering_woods',
      lastBonfire: null,
      droppedEssence: null,
    });

    const loaded = SaveManager.load() as SaveData;
    expect(loaded).not.toBeNull();
    expect(loaded.version).toBe(8);
    expect(loaded.inventory).toEqual([]);
    expect(loaded.quests).toEqual([]);
    expect(loaded.gameFlags).toEqual({});
    expect(loaded.mapMarkers).toEqual([]);
    expect(loaded.visitedTiles).toEqual([]);
    expect(loaded.worldItems).toEqual([]);
    expect(loaded.equippedWeaponId).toBeNull();
    expect(loaded.equippedRingIds).toEqual([null, null]);
    expect(loaded.currentMap).toBe('whispering_woods');
    expect(loaded.player.position).toEqual({ x: 5, y: 10 });
  });

  it('preserves existing v5 fields untouched', () => {
    const full: SaveData = {
      version: 5,
      timestamp: 999,
      player: {
        position: { x: 1, y: 2 },
        direction: 'up',
        health: 50,
        maxHealth: 100,
        gold: 200,
        essence: 50,
        attackDamage: 30,
        attackRange: 3,
        stamina: 100,
        maxStamina: 120,
        level: 4,
        vitality: 3,
        endurance: 2,
        strength: 4,
      },
      currentMap: 'village',
      inventory: [{ id: 'health_potion', name: 'Health Potion', description: '', type: 'consumable', sprite: 'x' }],
      equippedWeaponId: 'meek_short_sword',
      equippedRingIds: ['gravebound_ring', null],
      lastBonfire: { mapId: 'village', x: 0, y: 0 },
      droppedEssence: null,
      worldItems: [],
      quests: [{ id: 'q1', title: 'T', description: 'D', objectives: ['a'], completed: false, active: true }],
      gameFlags: { ashen_reaver_defeated: true, forest_kill_count: 5 },
      mapMarkers: [],
      visitedTiles: ['village|0|0'],
    };
    writeRaw(full);
    const loaded = SaveManager.load() as SaveData;
    expect(loaded.player.level).toBe(4);
    expect(loaded.equippedWeaponId).toBe('meek_short_sword');
    expect(loaded.equippedRingIds).toEqual(['gravebound_ring', null]);
    expect(loaded.gameFlags.forest_kill_count).toBe(5);
    expect(loaded.quests[0].id).toBe('q1');
    expect(loaded.visitedTiles).toEqual(['village|0|0']);
  });

  it('defaults v1-style save (no lastBonfire / essence / worldItems)', () => {
    writeRaw({
      version: 1,
      timestamp: 1,
      player: {
        position: { x: 0, y: 0 },
        direction: 'down',
        health: 100,
        maxHealth: 100,
        gold: 0,
        attackDamage: 20,
        stamina: 120,
        maxStamina: 120,
      },
      currentMap: 'village',
      inventory: [],
    });
    const loaded = SaveManager.load() as SaveData;
    expect(loaded.lastBonfire).toBeNull();
    expect(loaded.droppedEssence).toBeNull();
    expect(loaded.worldItems).toEqual([]);
    expect(loaded.player.essence).toBe(0);
    expect(loaded.version).toBe(8);
  });

  it('coerces malformed inventory (non-array) to []', () => {
    writeRaw({
      version: 5,
      timestamp: 1,
      player: { position: { x: 0, y: 0 }, direction: 'down', health: 100, maxHealth: 100, gold: 0, essence: 0, attackDamage: 20, stamina: 120, maxStamina: 120 },
      currentMap: 'village',
      inventory: 'not-an-array',
      gameFlags: 'also-bad',
    });
    const loaded = SaveManager.load() as SaveData;
    expect(loaded.inventory).toEqual([]);
    expect(loaded.gameFlags).toEqual({});
  });
});

describe('SaveManager.hasSave / clearSave', () => {
  it('hasSave reflects presence', () => {
    expect(SaveManager.hasSave()).toBe(false);
    localStorage.setItem(SAVE_KEY, '{}');
    expect(SaveManager.hasSave()).toBe(true);
  });

  it('clearSave removes the key', () => {
    localStorage.setItem(SAVE_KEY, '{}');
    SaveManager.clearSave();
    expect(SaveManager.hasSave()).toBe(false);
  });
});

describe('SaveManager.load — v7 ring migration', () => {
  it('migrates cursed_idol inventory, flags, and auto-equips wolf_ring from Olwen path', () => {
    writeRaw({
      version: 6,
      timestamp: 1,
      player: {
        position: { x: 0, y: 0 },
        direction: 'down',
        health: 100,
        maxHealth: 100,
        gold: 0,
        essence: 0,
        attackDamage: 20,
        stamina: 120,
        maxStamina: 120,
      },
      currentMap: 'forest',
      inventory: [{
        id: 'cursed_idol',
        name: 'Cursed Idol',
        description: 'old',
        type: 'quest',
        sprite: 'cursed_idol',
      }],
      gameFlags: { cursed_idol_received: true, olwen_ranger_cabin_hint: true },
      seenItemIds: ['cursed_idol'],
      worldItems: [{
        instanceId: 'preplaced_cursed_idol_interior_ranger_cabin',
        itemId: 'cursed_idol',
        mapId: 'interior_ranger_cabin',
        x: 3,
        y: -1,
      }],
      lastBonfire: null,
      droppedEssence: null,
    });

    const loaded = SaveManager.load() as SaveData;
    expect(loaded.version).toBe(8);
    expect(loaded.inventory[0].id).toBe('wolf_ring');
    expect(loaded.inventory[0].type).toBe('ring');
    expect(loaded.gameFlags.wolf_ring_received).toBe(true);
    expect(loaded.gameFlags.cursed_idol_received).toBeUndefined();
    expect(loaded.equippedRingIds).toEqual(['wolf_ring', null]);
    expect(loaded.seenItemIds).toEqual(['wolf_ring']);
    expect(loaded.worldItems).toEqual([]);
    expect(loaded.gameFlags.ranger_wolf_ring_chest_opened).toBe(true);
  });
});
