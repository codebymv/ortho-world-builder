import type { SaveData } from '@/lib/game/SaveManager';
import type { GameState, Item } from '@/lib/game/GameState';
import type { World } from '@/lib/game/World';

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

export function bootstrapRuntimeState(context: BootstrapContext) {
  const { state, savedData, world, items, criticalPathItems, setMapMarkers, restoreVisitedTile } = context;

  if (savedData) {
    const staminaRatio =
      savedData.player.maxStamina > 0
        ? savedData.player.stamina / savedData.player.maxStamina
        : 1;
    const normalizedMaxStamina = Math.max(savedData.player.maxStamina, state.player.maxStamina);
    state.currentMap = savedData.currentMap;
    state.player.position = { ...savedData.player.position };
    state.player.direction = savedData.player.direction as GameState['player']['direction'];
    state.player.health = savedData.player.health;
    state.player.maxHealth = savedData.player.maxHealth;
    state.player.gold = savedData.player.gold;
    state.player.essence = savedData.player.essence ?? 0;
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
    state.inventory = savedData.inventory;

    stripDeprecatedLoadout(state);
    ensureStartingWeapon(state, items);

    state.activeItemIndex = 0;
    state.equippedWeaponId = savedData.equippedWeaponId ?? null;
    syncEquippedWeapon(state, savedData.equippedWeaponId);

    state.quests = savedData.quests;
    state.gameFlags = savedData.gameFlags;
    reconcileCriticalQuestItems(state, items, criticalPathItems);
    state.lastBonfire = savedData.lastBonfire ?? null;
    state.droppedEssence = savedData.droppedEssence ?? null;

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
