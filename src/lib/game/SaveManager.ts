import { GameState, Item, Quest, LastBonfire, DroppedEssence, WorldItem, EMPTY_EQUIPPED_RING_IDS, EMPTY_WEAPON_LOADOUT, type EquippedRingIds, type WeaponLoadout } from './GameState';
import { MapMarker, KNOWN_LOCATIONS } from './MapMarkers';
import { items } from '../../data/items';
import { MAX_EPHEMERAL_EXTRACT_CHARGES } from '../../data/balance';
import { migrateFindHunterObjectiveOrder } from './findHunterProgression';

const SAVE_KEY = 'rpg_save_data';
const BOSS_ATTEMPT_CHECKPOINT_KEY = 'rpg_boss_attempt_checkpoint';
const SAVE_VERSION = 8;

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
    maxEphemeralExtractCharges?: number;
    ephemeralExtractPotency?: number;
  };
  currentMap: string;
  inventory: Item[];
  equippedWeaponId?: string | null;
  equippedRingIds?: EquippedRingIds;
  weaponLoadout?: WeaponLoadout;
  lastBonfire: LastBonfire | null;
  droppedEssence: DroppedEssence | null;
  worldItems: WorldItem[];
  quests: Quest[];
  gameFlags: Record<string, boolean | number>;
  mapMarkers: MapMarker[];
  visitedTiles: string[];
  seenItemIds: string[];
  killedEnemyIds?: string[];
}

export interface BossAttemptCheckpointMetadata {
  bossId: 'hollow_guardian';
  targetMap: 'interior_hollow_arena';
}

export interface BossAttemptCheckpointData extends BossAttemptCheckpointMetadata {
  save: SaveData;
}

// Loose shape used during migration - every field optional so we can defensively
// fill anything older saves don't carry. Only `player.position` etc. are needed
// at runtime; missing ones get filled by `normalizeSave`.
type RawSave = Partial<Omit<SaveData, 'player' | 'version'>> & {
  version?: number;
  player?: Partial<SaveData['player']>;
};

function isObject(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

// Discovered location markers persist with the tileX/tileY/colour they had when first
// added (id format: `${map}_${label}`). If a location's canonical coords are later
// corrected in KNOWN_LOCATIONS, old saves would keep drawing the marker at the stale
// spot. Re-sync position/colour/type from KNOWN_LOCATIONS by id so corrections apply
// retroactively. Dynamic/non-location markers (no id match) pass through unchanged.
const KNOWN_LOCATION_BY_ID = new Map(
  KNOWN_LOCATIONS.map(loc => [`${loc.map}_${loc.label}`, loc] as const),
);

function reconcileMarkerWithKnownLocation(marker: MapMarker): MapMarker {
  const loc = KNOWN_LOCATION_BY_ID.get(marker.id);
  if (!loc) return marker;
  if (marker.tileX === loc.tileX && marker.tileY === loc.tileY) return marker;
  return { ...marker, tileX: loc.tileX, tileY: loc.tileY, color: loc.color, type: loc.type };
}

function migrateQuests(quests: Quest[]): Quest[] {
  return quests.map(quest => {
    if (quest.id !== 'find_hunter') return quest;
    return { ...quest, objectives: migrateFindHunterObjectiveOrder(quest.objectives) };
  });
}

function migrateInventoryItem(item: Item): Item {
  if (item.id === 'cursed_idol') return { ...items.wolf_ring };
  if (item.id === 'wayfarer_ring') return { ...items.wayfarer_ring };
  if (item.id === 'chrysalis_parchment') return { ...items.chrysalis_parchment };
  if (item.id === 'clockwork_axe') return { ...items.clockwork_axe };
  return item;
}

function migrateGameFlags(flags: Record<string, boolean | number>): Record<string, boolean | number> {
  const next = { ...flags };
  if (next.cursed_idol_received && !next.wolf_ring_received) {
    next.wolf_ring_received = next.cursed_idol_received;
  }
  delete next.cursed_idol_received;

  if (next.gravebound_ring_received && !next.hunter_cliff_shelf_chest_opened && !next.wolf_ring_received) {
    next.wolf_ring_received = next.gravebound_ring_received;
    delete next.gravebound_ring_received;
  }

  if (next.gravebound_ring_received) {
    next.hunter_cliff_shelf_chest_opened = true;
  }
  if (next.wolf_ring_received) {
    next.ranger_wolf_ring_chest_opened = true;
  }
  if (next.wayfarer_ring_received) {
    next.north_fort_wayfarer_ring_chest_opened = true;
  }
  return next;
}

function migrateSeenItemIds(seenItemIds: string[]): string[] {
  return seenItemIds.map(id => (id === 'cursed_idol' ? 'wolf_ring' : id));
}

function migrateWorldItems(worldItems: WorldItem[]): WorldItem[] {
  return worldItems.filter(entry => {
    if (entry.mapId === 'interior_ranger_cabin') {
      return entry.itemId !== 'wolf_ring' && entry.itemId !== 'cursed_idol' && entry.itemId !== 'gravebound_ring';
    }
    // Hunter's Manuscript was replaced by the Commander's Evacuation Order at the same forest pickup.
    if (entry.mapId === 'forest' && entry.itemId === 'hunters_manuscript') {
      return false;
    }
    return true;
  });
}

function migrateInventoryForRingSwap(
  inventory: Item[],
  gameFlags: Record<string, boolean | number>,
): Item[] {
  const olwenWolfClaimed = Boolean(gameFlags.wolf_ring_received) && !Boolean(gameFlags.gravebound_ring_received);
  return inventory.map(item => {
    if (item.id === 'cursed_idol') return { ...items.wolf_ring };
    if (item.id === 'gravebound_ring' && olwenWolfClaimed) return { ...items.wolf_ring };
    if (item.id === 'wayfarer_ring') return { ...items.wayfarer_ring };
    return item;
  });
}

function finalizeEquippedRingIds(
  equippedRingIds: EquippedRingIds,
  gameFlags: Record<string, boolean | number>,
): EquippedRingIds {
  const olwenWolfClaimed = Boolean(gameFlags.wolf_ring_received) && !Boolean(gameFlags.gravebound_ring_received);
  return equippedRingIds.map(id => {
    if (id === 'cursed_idol') return 'wolf_ring';
    if (id === 'gravebound_ring' && olwenWolfClaimed) return 'wolf_ring';
    return id;
  }) as EquippedRingIds;
}

function migrateWeaponLoadout(raw: RawSave, inventory: Item[]): WeaponLoadout {
  if (Array.isArray(raw.weaponLoadout) && raw.weaponLoadout.length === 3) {
    return [
      typeof raw.weaponLoadout[0] === 'string' ? raw.weaponLoadout[0] : null,
      typeof raw.weaponLoadout[1] === 'string' ? raw.weaponLoadout[1] : null,
      typeof raw.weaponLoadout[2] === 'string' ? raw.weaponLoadout[2] : null,
    ];
  }

  const weaponIds: string[] = [];
  const preferred = raw.equippedWeaponId;
  if (typeof preferred === 'string' && inventory.some(item => item.id === preferred && item.type === 'equipment')) {
    weaponIds.push(preferred);
  }
  inventory.forEach(item => {
    if (item.type === 'equipment' && !weaponIds.includes(item.id)) {
      weaponIds.push(item.id);
    }
  });

  const loadout: WeaponLoadout = [...EMPTY_WEAPON_LOADOUT];
  for (let i = 0; i < Math.min(WEAPON_LOADOUT_SIZE, weaponIds.length); i++) {
    loadout[i] = weaponIds[i];
  }
  return loadout;
}

const WEAPON_LOADOUT_SIZE = 3;

function migrateEquippedRingIds(
  raw: RawSave,
  inventory: Item[],
  gameFlags: Record<string, boolean | number>,
): EquippedRingIds {
  let equippedRingIds: EquippedRingIds;
  if (Array.isArray(raw.equippedRingIds) && raw.equippedRingIds.length === 2) {
    equippedRingIds = [
      typeof raw.equippedRingIds[0] === 'string' ? raw.equippedRingIds[0] : null,
      typeof raw.equippedRingIds[1] === 'string' ? raw.equippedRingIds[1] : null,
    ];
  } else {
    const hadLegacyOlwenRing =
      gameFlags.wolf_ring_received ||
      inventory.some(item => item.id === 'wolf_ring' || item.id === 'gravebound_ring' || item.id === 'cursed_idol');
    equippedRingIds = hadLegacyOlwenRing ? ['wolf_ring', null] : [...EMPTY_EQUIPPED_RING_IDS];
  }
  return finalizeEquippedRingIds(equippedRingIds, gameFlags);
}

/** Fill every field. Safe to call on any version's payload. */
function normalizeSave(raw: RawSave): SaveData {
  const player = raw.player ?? {};
  const gameFlags = migrateGameFlags(isObject(raw.gameFlags) ? (raw.gameFlags as Record<string, boolean | number>) : {});
  const inventory = migrateInventoryForRingSwap(
    Array.isArray(raw.inventory)
      ? (raw.inventory as Item[]).map(migrateInventoryItem)
      : [],
    gameFlags,
  );
  const seenItemIds = Array.isArray(raw.seenItemIds)
    ? migrateSeenItemIds(raw.seenItemIds as string[])
    : inventory.map(i => i.id);
  const worldItems = migrateWorldItems(Array.isArray(raw.worldItems) ? (raw.worldItems as WorldItem[]) : []);
  const equippedRingIds = migrateEquippedRingIds(raw, inventory, gameFlags);
  const weaponLoadout = migrateWeaponLoadout(raw, inventory);

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
      maxEphemeralExtractCharges: player.maxEphemeralExtractCharges ?? MAX_EPHEMERAL_EXTRACT_CHARGES,
      ephemeralExtractPotency: player.ephemeralExtractPotency ?? 1,
    },
    currentMap: raw.currentMap ?? 'village',
    inventory,
    equippedWeaponId: raw.equippedWeaponId ?? null,
    equippedRingIds,
    weaponLoadout,
    lastBonfire: raw.lastBonfire ?? null,
    droppedEssence: raw.droppedEssence ?? null,
    worldItems,
    quests: migrateQuests(Array.isArray(raw.quests) ? (raw.quests as Quest[]) : []),
    gameFlags,
    // Strip portal-type markers on load - they are always regenerated fresh
    // from the current objective, so persisting them causes stale labels/colours.
    // Also drop any removed legend entries (e.g. Whispering Woods) from old saves.
    // Finally, reconcile each discovered location marker's position/colour/type
    // against the current KNOWN_LOCATIONS so saves made before a marker's canonical
    // coords were corrected (e.g. Chapel Ruins) don't keep rendering it in the wrong place.
    mapMarkers: Array.isArray(raw.mapMarkers)
      ? (raw.mapMarkers as MapMarker[])
          .filter(m => m.type !== 'portal' && m.label !== 'Whispering Woods')
          .map(reconcileMarkerWithKnownLocation)
      : [],
    visitedTiles: Array.isArray(raw.visitedTiles) ? raw.visitedTiles : [],
    seenItemIds,
    killedEnemyIds: Array.isArray(raw.killedEnemyIds) ? (raw.killedEnemyIds as string[]) : [],
  };
}

function createSaveData(state: GameState, mapMarkers: MapMarker[], visitedTiles: Set<string>): SaveData {
  return {
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
      maxEphemeralExtractCharges: state.player.maxEphemeralExtractCharges,
      ephemeralExtractPotency: state.player.ephemeralExtractPotency,
    },
    currentMap: state.currentMap,
    inventory: state.inventory.map(i => ({ ...i })),
    equippedWeaponId: state.equippedWeaponId,
    equippedRingIds: [...state.equippedRingIds],
    weaponLoadout: [...state.weaponLoadout],
    lastBonfire: state.lastBonfire ? { ...state.lastBonfire } : null,
    droppedEssence: state.droppedEssence ? { ...state.droppedEssence } : null,
    worldItems: state.worldItems.map(wi => ({ ...wi })),
    quests: state.quests.map(q => ({ ...q, objectives: [...q.objectives], reward: q.reward ? { ...q.reward } : undefined })),
    gameFlags: { ...state.gameFlags },
    mapMarkers: mapMarkers.map(m => ({ ...m })),
    visitedTiles: Array.from(visitedTiles),
    seenItemIds: Array.from(state.seenItemIds),
    killedEnemyIds: Array.from(state.killedEnemyIds),
  };
}

export class SaveManager {
  static save(state: GameState, mapMarkers: MapMarker[], visitedTiles: Set<string>): void {
    const data = createSaveData(state, mapMarkers, visitedTiles);
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
    // normalizer - it tolerates missing fields and fills them with safe defaults.
    return normalizeSave(parsed as RawSave);
  }

  static saveBossAttemptCheckpoint(
    state: GameState,
    mapMarkers: MapMarker[],
    visitedTiles: Set<string>,
    metadata: BossAttemptCheckpointMetadata,
  ): void {
    const data: BossAttemptCheckpointData = {
      ...metadata,
      save: createSaveData(state, mapMarkers, visitedTiles),
    };
    try {
      localStorage.setItem(BOSS_ATTEMPT_CHECKPOINT_KEY, JSON.stringify(data));
    } catch (e) {
      console.warn('[SaveManager] Failed to save boss checkpoint:', e);
    }
  }

  static loadBossAttemptCheckpoint(): BossAttemptCheckpointData | null {
    let raw: string | null;
    try {
      raw = localStorage.getItem(BOSS_ATTEMPT_CHECKPOINT_KEY);
    } catch (e) {
      console.warn('[SaveManager] localStorage unavailable:', e);
      return null;
    }
    if (!raw) return null;

    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch (e) {
      console.error('[SaveManager] Corrupt boss checkpoint (invalid JSON):', e);
      return null;
    }

    if (!isObject(parsed) || !isObject(parsed.save)) {
      console.error('[SaveManager] Corrupt boss checkpoint (not an object)');
      return null;
    }
    if (parsed.bossId !== 'hollow_guardian' || parsed.targetMap !== 'interior_hollow_arena') {
      console.error('[SaveManager] Corrupt boss checkpoint (unknown metadata)');
      return null;
    }

    return {
      bossId: parsed.bossId,
      targetMap: parsed.targetMap,
      save: normalizeSave(parsed.save as RawSave),
    };
  }

  static clearBossAttemptCheckpoint(): void {
    try {
      localStorage.removeItem(BOSS_ATTEMPT_CHECKPOINT_KEY);
    } catch (e) {
      console.warn('[SaveManager] Failed to clear boss checkpoint:', e);
    }
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
