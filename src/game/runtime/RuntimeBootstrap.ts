import type { SaveData } from '@/lib/game/SaveManager';
import type { GameState, Item } from '@/lib/game/GameState';
import { EMPTY_EQUIPPED_RING_IDS, EMPTY_WEAPON_LOADOUT } from '@/lib/game/GameState';
import type { World } from '@/lib/game/World';
import { mapDefinitions } from '@/data/maps';
import { tryCompleteFindHunterQuest } from '@/lib/game/findHunterProgression';

interface CriticalPathItemConfig {
  itemId: string;
  collectedFlag: string;
}

interface BootstrapContext {
  state: GameState;
  savedData: SaveData | null;
  world: World;
  items: Record<string, Item>;
  criticalPathItems: Record<string, CriticalPathItemConfig>;
  setMapMarkers: (markers: SaveData['mapMarkers']) => void;
  restoreVisitedTile: (tile: string) => void;
}

const STARTING_WEAPON_ID = 'meek_short_sword';
const DEPRECATED_ITEM_ID = 'magic_wand';
const DEV_TEST_ITEM_GRANT_FLAG = 'dev_test_chrysalis_barbs_grant_v1';
const DEV_TEST_EXTRA_PARCHMENT_GRANT_FLAG = 'dev_test_chrysalis_parchment_grant_v2';
const DEV_TEST_MORE_PARCHMENT_GRANT_FLAG = 'dev_test_chrysalis_parchment_grant_v3';

function ensureStartingWeapon(state: GameState, items: Record<string, Item>) {
  const hasStartingWeapon = state.inventory.some(item => item.id === STARTING_WEAPON_ID);
  const hasAnyEquipment = state.inventory.some(item => item.type === 'equipment');
  if (!hasStartingWeapon && !hasAnyEquipment) {
    state.inventory.unshift({ ...items[STARTING_WEAPON_ID] });
  }
}

function stripDeprecatedLoadout(state: GameState) {
  state.inventory = state.inventory.filter(item => item.id !== DEPRECATED_ITEM_ID);
  if (state.activeItemIndex >= state.inventory.length) {
    state.activeItemIndex = Math.max(0, state.inventory.length - 1);
  }
  if (state.equippedWeaponId === DEPRECATED_ITEM_ID) {
    state.equippedWeaponId = null;
  }
}

function reconcileCriticalQuestItems(
  state: GameState,
  items: Record<string, Item>,
  criticalPathItems: Record<string, CriticalPathItemConfig>,
) {
  const manuscriptQuestDone = state.quests.some(quest => quest.id === 'find_hunter' && quest.completed);
  if (!manuscriptQuestDone) return;

  const manuscript = criticalPathItems.hunter_clue;
  state.setFlag(manuscript.collectedFlag, true);
  if (!state.hasItem(manuscript.itemId)) {
    state.addItem({ ...items[manuscript.itemId] });
  }
}

function syncEquippedWeapon(state: GameState, preferredWeaponId?: string | null) {
  state.setEquippedWeapon(preferredWeaponId ?? state.equippedWeaponId);
}

function grantDevTestItemsOnce(state: GameState, items: Record<string, Item>) {
  if (state.getFlag(DEV_TEST_ITEM_GRANT_FLAG)) return;

  for (let i = 0; i < 3; i++) {
    if (items.chrysalis_parchment) state.addItem({ ...items.chrysalis_parchment }, { notify: false });
  }
  for (let i = 0; i < 10; i++) {
    if (items.throwing_barbs) state.addItem({ ...items.throwing_barbs }, { notify: false });
  }
  state.setFlag(DEV_TEST_ITEM_GRANT_FLAG, true);
}

function grantExtraChrysalisParchmentOnce(state: GameState, items: Record<string, Item>) {
  if (state.getFlag(DEV_TEST_EXTRA_PARCHMENT_GRANT_FLAG)) return;

  for (let i = 0; i < 3; i++) {
    if (items.chrysalis_parchment) state.addItem({ ...items.chrysalis_parchment }, { notify: false });
  }
  state.setFlag(DEV_TEST_EXTRA_PARCHMENT_GRANT_FLAG, true);
}

function grantMoreChrysalisParchmentOnce(state: GameState, items: Record<string, Item>) {
  if (state.getFlag(DEV_TEST_MORE_PARCHMENT_GRANT_FLAG)) return;

  for (let i = 0; i < 3; i++) {
    if (items.chrysalis_parchment) state.addItem({ ...items.chrysalis_parchment }, { notify: false });
  }
  state.setFlag(DEV_TEST_MORE_PARCHMENT_GRANT_FLAG, true);
}

export function bootstrapRuntimeState(context: BootstrapContext) {
  const { state, savedData, world, items, criticalPathItems, setMapMarkers, restoreVisitedTile } = context;

  if (savedData) {
    const staminaRatio =
      savedData.player.maxStamina > 0
        ? savedData.player.stamina / savedData.player.maxStamina
        : 1;
    const normalizedMaxStamina = Math.max(savedData.player.maxStamina, state.player.maxStamina);
    const mapValid = savedData.currentMap in mapDefinitions;
    state.currentMap = mapValid ? savedData.currentMap : 'village';
    state.player.position = mapValid
      ? { ...savedData.player.position }
      : { x: 0, y: 0 };
    state.player.direction = savedData.player.direction as GameState['player']['direction'];
    state.player.health = savedData.player.health;
    state.player.maxHealth = savedData.player.maxHealth;
    state.player.gold = savedData.player.gold;
    state.player.essence = savedData.player.essence ?? 0;
    state.player.cursedSediment = savedData.player.cursedSediment ?? 0;
    state.player.attackDamage = savedData.player.attackDamage;
    state.player.attackRange = savedData.player.attackRange ?? state.player.attackRange;
    state.player.maxStamina = normalizedMaxStamina;
    state.player.stamina = Math.min(
      normalizedMaxStamina,
      Math.max(0, staminaRatio * normalizedMaxStamina),
    );
    state.player.level = savedData.player.level ?? 1;
    state.player.vitality = savedData.player.vitality ?? 1;
    state.player.endurance = savedData.player.endurance ?? 1;
    state.player.strength = savedData.player.strength ?? 1;
    state.player.maxEphemeralExtractCharges = savedData.player.maxEphemeralExtractCharges ?? state.player.maxEphemeralExtractCharges;
    state.player.ephemeralExtractPotency = savedData.player.ephemeralExtractPotency ?? state.player.ephemeralExtractPotency;
    state.inventory = savedData.inventory;

    stripDeprecatedLoadout(state);
    ensureStartingWeapon(state, items);

    state.activeItemIndex = 0;
    state.equippedWeaponId = savedData.equippedWeaponId ?? null;
    state.equippedRingIds = savedData.equippedRingIds
      ? [...savedData.equippedRingIds]
      : [...EMPTY_EQUIPPED_RING_IDS];
    state.weaponLoadout = savedData.weaponLoadout
      ? [...savedData.weaponLoadout]
      : [...EMPTY_WEAPON_LOADOUT];
    syncEquippedWeapon(state, savedData.equippedWeaponId);

    state.quests = savedData.quests;
    state.replaceGameFlags(savedData.gameFlags);
    tryCompleteFindHunterQuest(state);
    state.seenItemIds = new Set(savedData.seenItemIds);
    state.killedEnemyIds = new Set(savedData.killedEnemyIds ?? []);
    // Always keep the starter weapon flagged as seen even on legacy saves.
    state.seenItemIds.add(STARTING_WEAPON_ID);
    reconcileCriticalQuestItems(state, items, criticalPathItems);
    grantDevTestItemsOnce(state, items);
    grantExtraChrysalisParchmentOnce(state, items);
    grantMoreChrysalisParchmentOnce(state, items);
    state.lastBonfire = savedData.lastBonfire ?? null;
    state.droppedEssence = savedData.droppedEssence ?? null;
    state.worldItems = savedData.worldItems ?? [];

    setMapMarkers(savedData.mapMarkers || []);
    if (savedData.visitedTiles) {
      savedData.visitedTiles.forEach(restoreVisitedTile);
    }
    return;
  }

  const spawnPoint = world.getSpawnPoint();
  state.player.position = { x: spawnPoint.x, y: spawnPoint.y };
  ensureStartingWeapon(state, items);
  syncEquippedWeapon(state);
}

export function ensureRespawnPoint(state: GameState, world: World) {
  if (state.lastBonfire) return;
  const spawnPoint = world.getSpawnPoint();
  state.lastBonfire = {
    mapId: state.currentMap,
    x: spawnPoint.x,
    y: spawnPoint.y,
  };
}
