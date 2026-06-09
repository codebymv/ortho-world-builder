import { describe, expect, it, vi } from 'vitest';
import * as THREE from 'three';
import { canReleaseFortRidgeLadderFromPosition, createInteractionSystem } from '@/game/domain/InteractionSystem';
import { GameState } from '@/lib/game/GameState';
import { items } from '@/data/items';

describe('fort ridge ladder side gating', () => {
  it('rejects the fort side and only allows the east ridge tile', () => {
    const ladderWorldX = 89;

    expect(canReleaseFortRidgeLadderFromPosition(88, ladderWorldX)).toBe(false);
    expect(canReleaseFortRidgeLadderFromPosition(89, ladderWorldX)).toBe(false);
    expect(canReleaseFortRidgeLadderFromPosition(89.49, ladderWorldX)).toBe(false);
    expect(canReleaseFortRidgeLadderFromPosition(89.5, ladderWorldX)).toBe(true);
    expect(canReleaseFortRidgeLadderFromPosition(90, ladderWorldX)).toBe(true);
  });
});

describe('ranger wolf ring chest availability', () => {
  it('opens even before Olwen has given the hint', () => {
    const state = new GameState({} as THREE.Scene, {} as THREE.OrthographicCamera);
    state.currentMap = 'interior_ranger_cabin';

    const system = createInteractionSystem({
      state,
      startDialogue: vi.fn(),
      items,
      playItemGrab: vi.fn(),
      playGoldPickup: vi.fn(),
      playEssencePickup: vi.fn(),
      playGrassPull: vi.fn(),
      playChestUnlock: vi.fn(),
      playGateShortcut: vi.fn(),
      playLeverPull: vi.fn(),
      playGateOpenHeavy: vi.fn(),
      playGateLockedHeavy: vi.fn(),
      playDoorOpenWood: vi.fn(),
      playDoorCloseWood: vi.fn(),
      playDoorLocked: vi.fn(),
      playLadderClimb: vi.fn(),
      emitSparkles: vi.fn(),
      emitHeal: vi.fn(),
      notify: vi.fn(),
      triggerSave: vi.fn(),
      triggerUIUpdate: vi.fn(),
      performBonfireRest: vi.fn(),
      syncOpenedChestState: vi.fn(),
      syncRangerWolfRingChestState: vi.fn(),
      triggerMinimapUpdate: vi.fn(),
      syncHarvestedTempestGrassState: vi.fn(),
      syncHarvestedMoonbloomState: vi.fn(),
      getInteractionCooldown: vi.fn(() => 0),
      setInteractionCooldown: vi.fn(),
      healCooldownMs: 0,
      handleMapTransition: vi.fn(),
      activateSwitch: vi.fn(),
      updateWorldChunksAtPlayer: vi.fn(),
      syncWhisperingWoodsShortcutState: vi.fn(),
      syncGroveShelfShortcutState: vi.fn(),
      syncQuarryBankShortcutState: vi.fn(),
      syncWestLakeBridgePlankState: vi.fn(),
      syncWestCliffGateState: vi.fn(),
      syncRiversideBridgeShortcutState: vi.fn(),
      syncHollowShortcutState: vi.fn(),
      syncEastHollowRouteGateState: vi.fn(),
      syncHollowApproachLadderState: vi.fn(),
      syncCliffCorridorLadderState: vi.fn(),
      syncFortRidgeLadderState: vi.fn(),
      syncForestFortGateState: vi.fn(),
      syncNorthFortGateState: vi.fn(),
      syncWestFortGateState: vi.fn(),
      syncGolemFortGateState: vi.fn(),
      syncManuscriptCheckpointGateState: vi.fn(),
      syncGuilrhymBossState: vi.fn(),
      showHeroOverlay: vi.fn(),
      hasDialogue: vi.fn(() => false),
    });

    expect(state.getFlag('olwen_ranger_cabin_hint')).toBe(false);
    expect(system.tryHandleChestOpen('ranger_wolf_ring_chest', 0, 0)).toBe(true);
    expect(state.getFlag('wolf_ring_received')).toBe(true);
    expect(state.getFlag('ranger_wolf_ring_chest_opened')).toBe(true);
  });
});

describe('chest reward bundles', () => {
  it('shows gold and item rewards together without firing per-item acquisition callbacks', () => {
    const state = new GameState({} as THREE.Scene, {} as THREE.OrthographicCamera);
    const onItemAdded = vi.fn();
    state.onItemAdded = onItemAdded;
    const showRewardBundle = vi.fn();

    const system = createInteractionSystem({
      state,
      startDialogue: vi.fn(),
      items,
      playItemGrab: vi.fn(),
      playGoldPickup: vi.fn(),
      playEssencePickup: vi.fn(),
      playGrassPull: vi.fn(),
      playChestUnlock: vi.fn(),
      playGateShortcut: vi.fn(),
      playLeverPull: vi.fn(),
      playGateOpenHeavy: vi.fn(),
      playGateLockedHeavy: vi.fn(),
      playDoorOpenWood: vi.fn(),
      playDoorCloseWood: vi.fn(),
      playDoorLocked: vi.fn(),
      playLadderClimb: vi.fn(),
      emitSparkles: vi.fn(),
      emitHeal: vi.fn(),
      notify: vi.fn(),
      showRewardBundle,
      triggerSave: vi.fn(),
      triggerUIUpdate: vi.fn(),
      performBonfireRest: vi.fn(),
      syncOpenedChestState: vi.fn(),
      syncRangerWolfRingChestState: vi.fn(),
      triggerMinimapUpdate: vi.fn(),
      syncHarvestedTempestGrassState: vi.fn(),
      syncHarvestedMoonbloomState: vi.fn(),
      getInteractionCooldown: vi.fn(() => 0),
      setInteractionCooldown: vi.fn(),
      healCooldownMs: 0,
      handleMapTransition: vi.fn(),
      activateSwitch: vi.fn(),
      updateWorldChunksAtPlayer: vi.fn(),
      syncWhisperingWoodsShortcutState: vi.fn(),
      syncGroveShelfShortcutState: vi.fn(),
      syncQuarryBankShortcutState: vi.fn(),
      syncWestLakeBridgePlankState: vi.fn(),
      syncWestCliffGateState: vi.fn(),
      syncRiversideBridgeShortcutState: vi.fn(),
      syncHollowShortcutState: vi.fn(),
      syncEastHollowRouteGateState: vi.fn(),
      syncHollowApproachLadderState: vi.fn(),
      syncCliffCorridorLadderState: vi.fn(),
      syncFortRidgeLadderState: vi.fn(),
      syncForestFortGateState: vi.fn(),
      syncNorthFortGateState: vi.fn(),
      syncWestFortGateState: vi.fn(),
      syncGolemFortGateState: vi.fn(),
      syncManuscriptCheckpointGateState: vi.fn(),
      syncGuilrhymBossState: vi.fn(),
      showHeroOverlay: vi.fn(),
      hasDialogue: vi.fn(() => false),
    });

    expect(system.tryHandleChestOpen('forest_south_entry_chest', 0, 0)).toBe(true);

    expect(state.player.gold).toBe(28);
    expect(state.hasItem('sundered_essence_i')).toBe(true);
    expect(onItemAdded).not.toHaveBeenCalled();
    expect(showRewardBundle).toHaveBeenCalledWith(expect.objectContaining({
      title: 'Chest Rewards',
      entries: [
        { kind: 'gold', amount: 28 },
        expect.objectContaining({
          kind: 'item',
          quantity: 1,
          item: expect.objectContaining({ id: 'sundered_essence_i' }),
        }),
      ],
    }));
  });
});
