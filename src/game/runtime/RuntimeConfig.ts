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
  target: { x: number; y: number } | null;
  angle: number;
  radius: number;
  speed: number;
  pauseTimer: number;
  isPaused: boolean;
  stuckFrames: number;
  nextRetargetTime: number;
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
  grove_warden: 1.04,
  explorer_ulmund: 1.05,
  petra_ashveil: 1.02,
  mountain_hermit: 1.02,
  mysterious_man: 1.04,
  mysterious_man_shore: 1.04,
};

export const ENEMY_VISUALS: Record<string, EnemyVisualProfile> = {
  wolf: { baseScale: 1.22, footOffset: 0.18, strideAmp: 0.05, bobAmp: 0.045, squashAmp: 0.07, leanAmp: 0.08, hpBarOffset: 0.62 },
  shadow: { baseScale: 1.28, footOffset: 0.16, strideAmp: 0.02, bobAmp: 0.06, squashAmp: 0.03, leanAmp: 0.02, hpBarOffset: 0.72 },
  shadow_lurker: { baseScale: 1.28, footOffset: 0.16, strideAmp: 0.012, bobAmp: 0.04, squashAmp: 0.02, leanAmp: 0.01, hpBarOffset: 0.72 },
  hollow_reaver: { baseScale: 1.34, footOffset: 0.16, strideAmp: 0.012, bobAmp: 0.05, squashAmp: 0.02, leanAmp: 0.015, hpBarOffset: 0.78 },
  void_wisp: { baseScale: 1.12, footOffset: 0.12, strideAmp: 0.03, bobAmp: 0.05, squashAmp: 0.04, leanAmp: 0.03, hpBarOffset: 0.62 },
  plant: { baseScale: 1.14, footOffset: 0.16, strideAmp: 0.02, bobAmp: 0.03, squashAmp: 0.03, leanAmp: 0.04, hpBarOffset: 0.64 },
  skeleton: { baseScale: 1.18, footOffset: 0.22, strideAmp: 0.04, bobAmp: 0.04, squashAmp: 0.05, leanAmp: 0.05, hpBarOffset: 0.66 },
  skeleton_captain: { baseScale: 1.54, footOffset: 0.26, strideAmp: 0.03, bobAmp: 0.035, squashAmp: 0.05, leanAmp: 0.04, hpBarOffset: 0.80 },
  bandit: { baseScale: 1.12, footOffset: 0.24, strideAmp: 0.04, bobAmp: 0.05, squashAmp: 0.06, leanAmp: 0.05, hpBarOffset: 0.7 },
  golem: { baseScale: 2.8, footOffset: 0.46, strideAmp: 0.03, bobAmp: 0.045, squashAmp: 0.05, leanAmp: 0.025, hpBarOffset: 1.4 },
  spider: { baseScale: 1.08, footOffset: 0.14, strideAmp: 0.06, bobAmp: 0.02, squashAmp: 0.08, leanAmp: 0.06, hpBarOffset: 0.56 },
  armored_wolf: { baseScale: 1.34, footOffset: 0.2, strideAmp: 0.045, bobAmp: 0.04, squashAmp: 0.06, leanAmp: 0.07, hpBarOffset: 0.68 },
  stone_sentinel: { baseScale: 2.0, footOffset: 0.3, strideAmp: 0.026, bobAmp: 0.038, squashAmp: 0.045, leanAmp: 0.026, hpBarOffset: 1.0 },
  slime: { baseScale: 1.18, footOffset: 0.12, strideAmp: 0.02, bobAmp: 0.035, squashAmp: 0.12, leanAmp: 0.02, hpBarOffset: 0.58 },
  water_slime: { baseScale: 1.14, footOffset: 0.1, strideAmp: 0.018, bobAmp: 0.03, squashAmp: 0.14, leanAmp: 0.018, hpBarOffset: 0.56 },
  hollow_guardian: { baseScale: 2.6, footOffset: 0.22, strideAmp: 0.012, bobAmp: 0.04, squashAmp: 0.03, leanAmp: 0.02, hpBarOffset: 1.35 },
  ashen_reaver: { baseScale: 2.8, footOffset: 0.24, strideAmp: 0.015, bobAmp: 0.035, squashAmp: 0.025, leanAmp: 0.02, hpBarOffset: 1.45 },
  corrupted_giant: { baseScale: 2.6, footOffset: 0.42, strideAmp: 0.026, bobAmp: 0.04, squashAmp: 0.05, leanAmp: 0.025, hpBarOffset: 1.35 },
  // Floating wraith: minimal stride/squash (no footsteps), a gentle hover bob, slight lean.
  ridge_revenant: { baseScale: 2.2, footOffset: 0.22, strideAmp: 0.004, bobAmp: 0.05, squashAmp: 0, leanAmp: 0.01, hpBarOffset: 1.2 },
};

export function createDefaultNpcData(): NPC[] {
  return [
    { id: 'elder', name: 'Village Elder', mapId: 'village', position: { x: 4, y: 20 }, dialogueId: 'elder', sprite: 'npc_elder', questGiver: true },
    { id: 'merchant', name: 'Traveling Merchant', mapId: 'village', position: { x: 66, y: -4 }, dialogueId: 'merchant', sprite: 'npc_merchant' },
    { id: 'apothecary', name: 'Apothecary Mirelle', mapId: 'interior_merchant', position: { x: 7, y: 5 }, dialogueId: 'apothecary', sprite: 'npc_apothecary' },
    { id: 'guard', name: 'Village Guard', mapId: 'village', position: { x: 0, y: 5 }, dialogueId: 'guard', sprite: 'npc_guard' },
    { id: 'blacksmith', name: 'Blacksmith', mapId: 'interior_blacksmith', position: { x: 8, y: 5 }, dialogueId: 'blacksmith', sprite: 'npc_blacksmith' },
    { id: 'innkeeper', name: 'Innkeeper Mara', mapId: 'interior_inn', position: { x: 10, y: 5 }, dialogueId: 'innkeeper', sprite: 'npc_merchant' },
    { id: 'healer', name: 'Healer', mapId: 'village', position: { x: -10, y: 15 }, dialogueId: 'healer', sprite: 'npc_healer' },
    { id: 'chapel_keeper', name: 'Caretaker Rowan', mapId: 'village', position: { x: -69, y: -39 }, dialogueId: 'chapel_keeper', sprite: 'npc_chapel_keeper' },
    { id: 'farmer', name: 'Old Farmer', mapId: 'village', position: { x: -56, y: 35 }, dialogueId: 'farmer', sprite: 'npc_farmer' },
    { id: 'child', name: 'Village Child', mapId: 'village', position: { x: 8, y: -12 }, dialogueId: 'child', sprite: 'npc_child' },
    { id: 'forest_ranger', name: 'Forest Ranger', mapId: 'forest', position: { x: 158, y: 168 }, dialogueId: 'forest_ranger', sprite: 'npc_guard', questGiver: true },
    { id: 'manuscript_gate_guard', name: 'Ranger Gatekeeper', mapId: 'forest', position: { x: 80, y: 4 }, dialogueId: 'manuscript_gate_guard', sprite: 'npc_guard' },
    { id: 'fort_quartermaster', name: 'Listless Merchant', mapId: 'forest', position: { x: 80, y: 13 }, dialogueId: 'fort_quartermaster', sprite: 'npc_merchant' },
    { id: 'grove_warden', name: 'Warden Callum', mapId: 'forest', position: { x: -7, y: -1 }, dialogueId: 'grove_warden', sprite: 'npc_grove_warden', questGiver: true },
    // Explorer Ulmund - south entry teaching beat beside a dud summoning circle (world 5,93).
    // Sits on the main spine so first-time players can't miss him. Names the two stone types
    // and gives the Shatter the Shrines quest, teaching the altar -> sediment -> live-glyph -> summon loop.
    { id: 'explorer_ulmund', name: 'Explorer Ulmund', mapId: 'forest', position: { x: 5, y: 93 }, dialogueId: 'explorer_ulmund', sprite: 'npc_ulmund', questGiver: true },
    { id: 'petra_ashveil', name: 'Petra the Researcher', mapId: 'forest', position: { x: 12, y: -37 }, dialogueId: 'petra_ashveil', sprite: 'npc_petra' },
    // Olwen - displaced grove hermit now tending the eastern cliff cemetery near Bonfire 5.
    // Hands the player the Cursed Idol once, then settles into a quiet reflective state.
    { id: 'mountain_hermit', name: 'Olwen, Mountain Hermit', mapId: 'forest', position: { x: 143, y: -8 }, dialogueId: 'mountain_hermit', sprite: 'npc_olwen' },
    // Unnamed Hollow figure on the north bank of the corrupted river. Dismissive until
    // the player kills the Hollow Apparition (flag: hollow_guardian_defeated).
    { id: 'mysterious_man', name: 'A Hooded Figure', mapId: 'forest', position: { x: -55, y: -73 }, dialogueId: 'mysterious_man', sprite: 'npc_mysterious_man', facing: 'left' },
    // Second hooded witness on the north shore of the SW rocky pond (world ~-118, 127).
    // Front-facing sprite reads as looking south toward the water below.
    { id: 'mysterious_man_shore', name: 'A Hooded Figure', mapId: 'forest', position: { x: -118, y: 127 }, dialogueId: 'mysterious_man_shore', sprite: 'npc_mysterious_man_shore' },
    { id: 'oliver', name: 'Oliver', mapId: 'guilrhym', position: { x: 9, y: 125 }, dialogueId: 'oliver', sprite: 'npc_oliver_injured' }, // world (9,125) = tile (159,275), gate plaza
  ];
}

export function createNpcWanderState(npcData: NPC[]): Record<string, NpcWanderState> {
  const npcWander: Record<string, NpcWanderState> = {};
  for (const npc of npcData) {
    npcWander[npc.id] = {
      origin: { ...npc.position },
      target: null,
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
                : npc.id === 'fort_quartermaster' || npc.id === 'manuscript_gate_guard'
                  ? 0.8
                : npc.id === 'grove_warden'
                  ? 0.6
                : npc.id === 'petra_ashveil'
                  ? 0.4
                : npc.id === 'mountain_hermit'
                  ? 0.5
                : npc.id === 'explorer_ulmund'
                  ? 0.4
                : npc.id === 'mysterious_man' || npc.id === 'mysterious_man_shore'
                  ? 0
                : npc.id === 'oliver'
                  ? 0
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
                : npc.id === 'fort_quartermaster' || npc.id === 'manuscript_gate_guard'
                  ? 0.22
                : npc.id === 'grove_warden'
                  ? 0.16
                : npc.id === 'petra_ashveil'
                  ? 0.12
                : npc.id === 'mountain_hermit'
                  ? 0.15
                : npc.id === 'explorer_ulmund'
                  ? 0.12
                : npc.id === 'mysterious_man' || npc.id === 'mysterious_man_shore'
                  ? 0
                : npc.id === 'oliver'
                  ? 0
                : 0.5,
      pauseTimer: Math.random() * 3,
      isPaused: true,
      stuckFrames: 0,
      nextRetargetTime: 0,
    };
  }
  return npcWander;
}

const VILLAGE_NPC_LAYOUTS: Record<VillageReactivityStage, Record<string, VillageNpcLayout>> = {
  calm: {
    elder: { position: { x: 4, y: 20 }, radius: 1.5, speed: 0.5 },
    merchant: { position: { x: 66, y: -4 }, radius: 1.5, speed: 0.5 },
    guard: { position: { x: 0, y: 5 }, radius: 3, speed: 0.8 },
    blacksmith: { position: { x: 42, y: -4 }, radius: 1.5, speed: 0.5 },
    healer: { position: { x: -10, y: 15 }, radius: 1.5, speed: 0.5 },
    chapel_keeper: { position: { x: -69, y: -39 }, radius: 0.45, speed: 0.14 },
    farmer: { position: { x: -56, y: 35 }, radius: 1.5, speed: 0.5 },
    child: { position: { x: 8, y: -12 }, radius: 2, speed: 1.2 },
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
  after_reaver: {
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
    wander.target = null;
    wander.stuckFrames = 0;
  }
}
