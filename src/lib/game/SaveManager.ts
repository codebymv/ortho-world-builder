import { GameState, Item, Quest, LastBonfire, DroppedEssence, WorldItem } from './GameState';
import { MapMarker } from './MapMarkers';

const SAVE_KEY = 'rpg_save_data';
const SAVE_VERSION = 6;

export interface SaveData {
  version: number;
  timestamp: number;
  player: {
    position: { x: number; y: number };
    direction: 'up' | 'down' | 'left' | 'right';
    health: number;
    maxHealth: number;
    gold: number;
    essence: number;
    cursedSediment?: number;
    attackDamage: number;
    attackRange?: number;
    stamina: number;
    maxStamina: number;
    level?: number;
    vitality?: number;
    endurance?: number;
    strength?: number;
  };
  currentMap: string;
  inventory: Item[];
  equippedWeaponId?: string | null;
  lastBonfire: LastBonfire | null;
  droppedEssence: DroppedEssence | null;
  worldItems: WorldItem[];
  quests: Quest[];
  gameFlags: Record<string, boolean | number>;
  mapMarkers: MapMarker[];
  visitedTiles: string[];
  seenItemIds: string[];
}

// Loose shape used during migration — every field optional so we can defensively
// fill anything older saves don't carry. Only `player.position` etc. are needed
// at runtime; missing ones get filled by `normalizeSave`.
type RawSave = Partial<Omit<SaveData, 'player' | 'version'>> & {
  version?: number;
  player?: Partial<SaveData['player']>;
};

function isObject(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

/** Fill every v5 field. Safe to call on any version's payload. */
function normalizeSave(raw: RawSave): SaveData {
  const player = raw.player ?? {};
  return {
    version: SAVE_VERSION,
    timestamp: typeof raw.timestamp === 'number' ? raw.timestamp : Date.now(),
    player: {
      position: player.position ?? { x: 0, y: 0 },
      direction: player.direction ?? 'down',
      health: player.health ?? 100,
      maxHealth: player.maxHealth ?? 100,
      gold: player.gold ?? 0,
      essence: player.essence ?? 0,
      cursedSediment: player.cursedSediment ?? 0,
      attackDamage: player.attackDamage ?? 20,
      attackRange: player.attackRange,
      stamina: player.stamina ?? 120,
      maxStamina: player.maxStamina ?? 120,
      level: player.level,
      vitality: player.vitality,
      endurance: player.endurance,
      strength: player.strength,
    },
    currentMap: raw.currentMap ?? 'village',
    inventory: Array.isArray(raw.inventory) ? raw.inventory : [],
    equippedWeaponId: raw.equippedWeaponId ?? null,
    lastBonfire: raw.lastBonfire ?? null,
    droppedEssence: raw.droppedEssence ?? null,
    worldItems: Array.isArray(raw.worldItems) ? raw.worldItems : [],
    quests: Array.isArray(raw.quests) ? raw.quests : [],
    gameFlags: isObject(raw.gameFlags) ? (raw.gameFlags as Record<string, boolean | number>) : {},
    mapMarkers: Array.isArray(raw.mapMarkers) ? raw.mapMarkers : [],
    visitedTiles: Array.isArray(raw.visitedTiles) ? raw.visitedTiles : [],
    // Pre-v6 saves had no seen-item tracking. Seed from current inventory so the
    // first-time overlay doesn't blast every loaded item; this is an intentional
    // backfill — players upgrading mid-game won't see overlays for items they
    // were already carrying, which is the right call.
    seenItemIds: Array.isArray(raw.seenItemIds)
      ? (raw.seenItemIds as string[])
      : Array.isArray(raw.inventory)
        ? (raw.inventory as Item[]).map(i => i.id)
        : [],
  };
}

export class SaveManager {
  static save(state: GameState, mapMarkers: MapMarker[], visitedTiles: Set<string>): void {
    const data: SaveData = {
      version: SAVE_VERSION,
      timestamp: Date.now(),
      player: {
        position: { ...state.player.position },
        direction: state.player.direction,
        health: state.player.health,
        maxHealth: state.player.maxHealth,
        gold: state.player.gold,
        essence: state.player.essence,
        cursedSediment: state.player.cursedSediment,
        attackDamage: state.player.attackDamage,
        attackRange: state.player.attackRange,
        stamina: state.player.stamina,
        maxStamina: state.player.maxStamina,
        level: state.player.level,
        vitality: state.player.vitality,
        endurance: state.player.endurance,
        strength: state.player.strength,
      },
      currentMap: state.currentMap,
      inventory: state.inventory.map(i => ({ ...i })),
      equippedWeaponId: state.equippedWeaponId,
      lastBonfire: state.lastBonfire ? { ...state.lastBonfire } : null,
      droppedEssence: state.droppedEssence ? { ...state.droppedEssence } : null,
      worldItems: state.worldItems.map(wi => ({ ...wi })),
      quests: state.quests.map(q => ({ ...q, objectives: [...q.objectives], reward: q.reward ? { ...q.reward } : undefined })),
      gameFlags: { ...state.gameFlags },
      mapMarkers: mapMarkers.map(m => ({ ...m })),
      visitedTiles: Array.from(visitedTiles),
      seenItemIds: Array.from(state.seenItemIds),
    };
    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify(data));
    } catch (e) {
      console.warn('[SaveManager] Failed to save game:', e);
    }
  }

  static load(): SaveData | null {
    let raw: string | null;
    try {
      raw = localStorage.getItem(SAVE_KEY);
    } catch (e) {
      console.warn('[SaveManager] localStorage unavailable:', e);
      return null;
    }
    if (!raw) return null;

    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch (e) {
      console.error('[SaveManager] Corrupt save (invalid JSON):', e);
      return null;
    }

    if (!isObject(parsed)) {
      console.error('[SaveManager] Corrupt save (not an object):', typeof parsed);
      return null;
    }

    // Versions 1-4 (and any unset/future) all go through the same defensive
    // normalizer — it tolerates missing fields and fills them with safe defaults.
    return normalizeSave(parsed as RawSave);
  }

  static hasSave(): boolean {
    try {
      return localStorage.getItem(SAVE_KEY) !== null;
    } catch {
      return false;
    }
  }

  static clearSave(): void {
    try {
      localStorage.removeItem(SAVE_KEY);
    } catch (e) {
      console.warn('[SaveManager] Failed to clear save:', e);
    }
  }
}
