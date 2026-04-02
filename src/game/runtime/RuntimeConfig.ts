import type { GameState, NPC } from '@/lib/game/GameState';
import { getVillageReactivityStage, type VillageReactivityStage } from '@/game/domain/VillageReactivity';

export type EnemyVisualProfile = {
  baseScale: number;
  footOffset: number;
  strideAmp: number;
  bobAmp: number;
  squashAmp: number;
  leanAmp: number;
  hpBarOffset: number;
};

export type NpcWanderState = {
  origin: { x: number; y: number };
  angle: number;
  radius: number;
  speed: number;
  pauseTimer: number;
  isPaused: boolean;
  stuckFrames: number;
};

type VillageNpcLayout = {
  position: { x: number; y: number };
  radius: number;
  speed: number;
};

export const NPC_SCALE_BY_ID: Record<string, number> = {
  elder: 1.06,
  merchant: 1.02,
  apothecary: 1.01,
  guard: 1.04,
  blacksmith: 1.1,
  innkeeper: 1.01,
  healer: 0.98,
  chapel_keeper: 1.02,
  farmer: 1.03,
  child: 0.86,
  forest_ranger: 1.04,
  fort_quartermaster: 1.06,
};

export const ENEMY_VISUALS: Record<string, EnemyVisualProfile> = {
  wolf: { baseScale: 1.22, footOffset: 0.18, strideAmp: 0.05, bobAmp: 0.045, squashAmp: 0.07, leanAmp: 0.08, hpBarOffset: 0.62 },
  shadow: { baseScale: 1.12, footOffset: 0.12, strideAmp: 0.03, bobAmp: 0.05, squashAmp: 0.04, leanAmp: 0.03, hpBarOffset: 0.62 },
  plant: { baseScale: 1.14, footOffset: 0.16, strideAmp: 0.02, bobAmp: 0.03, squashAmp: 0.03, leanAmp: 0.04, hpBarOffset: 0.64 },
  skeleton: { baseScale: 1.18, footOffset: 0.22, strideAmp: 0.04, bobAmp: 0.04, squashAmp: 0.05, leanAmp: 0.05, hpBarOffset: 0.66 },
  bandit: { baseScale: 1.12, footOffset: 0.24, strideAmp: 0.04, bobAmp: 0.05, squashAmp: 0.06, leanAmp: 0.05, hpBarOffset: 0.7 },
  golem: { baseScale: 1.72, footOffset: 0.28, strideAmp: 0.025, bobAmp: 0.03, squashAmp: 0.04, leanAmp: 0.025, hpBarOffset: 0.86 },
  spider: { baseScale: 1.08, footOffset: 0.14, strideAmp: 0.06, bobAmp: 0.02, squashAmp: 0.08, leanAmp: 0.06, hpBarOffset: 0.56 },
  armored_wolf: { baseScale: 1.34, footOffset: 0.2, strideAmp: 0.045, bobAmp: 0.04, squashAmp: 0.06, leanAmp: 0.07, hpBarOffset: 0.68 },
  slime: { baseScale: 1.18, footOffset: 0.12, strideAmp: 0.02, bobAmp: 0.035, squashAmp: 0.12, leanAmp: 0.02, hpBarOffset: 0.58 },
  hollow_guardian: { baseScale: 2.4, footOffset: 0.35, strideAmp: 0.015, bobAmp: 0.02, squashAmp: 0.06, leanAmp: 0.02, hpBarOffset: 1.2 },
};

export function createDefaultNpcData(): NPC[] {
  return [
    { id: 'elder', name: 'Village Elder', mapId: 'village', position: { x: -18, y: -10 }, dialogueId: 'elder', sprite: 'npc_elder', questGiver: true },
    { id: 'merchant', name: 'Traveling Merchant', mapId: 'village', position: { x: 66, y: -4 }, dialogueId: 'merchant', sprite: 'npc_merchant' },
    { id: 'apothecary', name: 'Apothecary Mirelle', mapId: 'interior_merchant', position: { x: 7, y: 5 }, dialogueId: 'apothecary', sprite: 'npc_apothecary' },
    { id: 'guard', name: 'Village Guard', mapId: 'village', position: { x: 0, y: 5 }, dialogueId: 'guard', sprite: 'npc_guard' },
    { id: 'blacksmith', name: 'Blacksmith', mapId: 'interior_blacksmith', position: { x: 8, y: 5 }, dialogueId: 'blacksmith', sprite: 'npc_blacksmith' },
    { id: 'innkeeper', name: 'Innkeeper Mara', mapId: 'interior_inn', position: { x: 10, y: 5 }, dialogueId: 'innkeeper', sprite: 'npc_merchant' },
    { id: 'healer', name: 'Healer', mapId: 'village', position: { x: -10, y: 15 }, dialogueId: 'healer', sprite: 'npc_healer' },
    { id: 'chapel_keeper', name: 'Caretaker Rowan', mapId: 'village', position: { x: -69, y: -39 }, dialogueId: 'chapel_keeper', sprite: 'npc_chapel_keeper' },
    { id: 'farmer', name: 'Old Farmer', mapId: 'village', position: { x: -56, y: 35 }, dialogueId: 'farmer', sprite: 'npc_farmer' },
    { id: 'child', name: 'Village Child', mapId: 'village', position: { x: 5, y: -5 }, dialogueId: 'child', sprite: 'npc_child' },
    { id: 'forest_ranger', name: 'Forest Ranger', mapId: 'forest', position: { x: 158, y: 168 }, dialogueId: 'forest_ranger', sprite: 'npc_guard', questGiver: true },
    { id: 'fort_quartermaster', name: 'Listless Merchant', mapId: 'forest', position: { x: -10, y: -22 }, dialogueId: 'fort_quartermaster', sprite: 'npc_merchant' },
  ];
}

export function createNpcWanderState(npcData: NPC[]): Record<string, NpcWanderState> {
  const npcWander: Record<string, NpcWanderState> = {};
  for (const npc of npcData) {
    npcWander[npc.id] = {
      origin: { ...npc.position },
      angle: Math.random() * Math.PI * 2,
      radius:
        npc.id === 'guard'
            ? 3
          : npc.id === 'child'
            ? 4
            : npc.id === 'apothecary'
              ? 0.45
            : npc.id === 'blacksmith'
              ? 0.65
              : npc.id === 'innkeeper'
                ? 0.55
                : npc.id === 'chapel_keeper'
                  ? 0.45
                : npc.id === 'fort_quartermaster'
                  ? 0.8
                : 1.5,
      speed:
        npc.id === 'child'
          ? 1.2
          : npc.id === 'guard'
            ? 0.8
            : npc.id === 'apothecary'
              ? 0.16
            : npc.id === 'blacksmith'
              ? 0.2
              : npc.id === 'innkeeper'
                ? 0.18
                : npc.id === 'chapel_keeper'
                  ? 0.14
                : npc.id === 'fort_quartermaster'
                  ? 0.22
                : 0.5,
      pauseTimer: Math.random() * 3,
      isPaused: true,
      stuckFrames: 0,
    };
  }
  return npcWander;
}

const VILLAGE_NPC_LAYOUTS: Record<VillageReactivityStage, Record<string, VillageNpcLayout>> = {
  calm: {
    elder: { position: { x: -18, y: -10 }, radius: 1.5, speed: 0.5 },
    merchant: { position: { x: 66, y: -4 }, radius: 1.5, speed: 0.5 },
    guard: { position: { x: 0, y: 5 }, radius: 3, speed: 0.8 },
    blacksmith: { position: { x: 42, y: -4 }, radius: 1.5, speed: 0.5 },
    healer: { position: { x: -10, y: 15 }, radius: 1.5, speed: 0.5 },
    chapel_keeper: { position: { x: -69, y: -39 }, radius: 0.45, speed: 0.14 },
    farmer: { position: { x: -56, y: 35 }, radius: 1.5, speed: 0.5 },
    child: { position: { x: 5, y: -5 }, radius: 4, speed: 1.2 },
  },
  after_manuscript: {
    elder: { position: { x: -14, y: -8 }, radius: 1.1, speed: 0.42 },
    merchant: { position: { x: 62, y: -1 }, radius: 1.0, speed: 0.42 },
    guard: { position: { x: 10, y: 0 }, radius: 1.8, speed: 0.9 },
    healer: { position: { x: -66, y: -36 }, radius: 0.8, speed: 0.28 },
    chapel_keeper: { position: { x: -72, y: -35 }, radius: 0.32, speed: 0.1 },
    farmer: { position: { x: -42, y: 24 }, radius: 1.0, speed: 0.36 },
    child: { position: { x: -1, y: 6 }, radius: 1.1, speed: 0.72 },
  },
  after_deep_woods: {
    elder: { position: { x: -8, y: -5 }, radius: 0.8, speed: 0.3 },
    merchant: { position: { x: 58, y: 2 }, radius: 0.75, speed: 0.32 },
    guard: { position: { x: 12, y: -6 }, radius: 1.4, speed: 0.95 },
    healer: { position: { x: -64, y: -32 }, radius: 0.55, speed: 0.18 },
    chapel_keeper: { position: { x: -71, y: -33 }, radius: 0.22, speed: 0.08 },
    farmer: { position: { x: -28, y: 14 }, radius: 0.8, speed: 0.3 },
    child: { position: { x: -10, y: 8 }, radius: 0.4, speed: 0.16 },
  },
};

export function syncVillageNpcReactivity(
  state: GameState,
  npcData: NPC[],
  npcWander: Record<string, NpcWanderState>,
) {
  const stage = getVillageReactivityStage(state);
  const layoutSet = VILLAGE_NPC_LAYOUTS[stage];

  for (const npc of npcData) {
    if (npc.mapId !== 'village') continue;

    const layout = layoutSet[npc.id];
    if (!layout) continue;

    npc.position.x = layout.position.x;
    npc.position.y = layout.position.y;

    const wander = npcWander[npc.id];
    if (!wander) continue;

    wander.origin.x = layout.position.x;
    wander.origin.y = layout.position.y;
    wander.radius = layout.radius;
    wander.speed = layout.speed;
    wander.isPaused = true;
    wander.pauseTimer = 0.35;
    wander.stuckFrames = 0;
  }
}
