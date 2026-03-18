import { GameState, Item, Quest } from './GameState';
import { MapMarker } from './MapMarkers';

const SAVE_KEY = 'rpg_save_data';
const SAVE_VERSION = 1;

export interface SaveData {
  version: number;
  timestamp: number;
  player: {
    position: { x: number; y: number };
    direction: string;
    health: number;
    maxHealth: number;
    gold: number;
    attackDamage: number;
    stamina: number;
    maxStamina: number;
  };
  currentMap: string;
  inventory: Item[];
  quests: Quest[];
  gameFlags: Record<string, boolean>;
  mapMarkers: MapMarker[];
  visitedTiles: string[];
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
        attackDamage: state.player.attackDamage,
        stamina: state.player.stamina,
        maxStamina: state.player.maxStamina,
      },
      currentMap: state.currentMap,
      inventory: state.inventory.map(i => ({ ...i })),
      quests: state.quests.map(q => ({ ...q, objectives: [...q.objectives], reward: q.reward ? { ...q.reward } : undefined })),
      gameFlags: { ...state.gameFlags },
      mapMarkers: mapMarkers.map(m => ({ ...m })),
      visitedTiles: Array.from(visitedTiles),
    };
    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify(data));
    } catch (e) {
      console.warn('Failed to save game:', e);
    }
  }

  static load(): SaveData | null {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (!raw) return null;
      const data: SaveData = JSON.parse(raw);
      if (data.version !== SAVE_VERSION) return null;
      return data;
    } catch {
      return null;
    }
  }

  static hasSave(): boolean {
    return localStorage.getItem(SAVE_KEY) !== null;
  }

  static clearSave(): void {
    localStorage.removeItem(SAVE_KEY);
  }
}
