import type { GameFlagKey, GameState, NPC } from '@/lib/game/GameState';

/** Matches the revenant glyph charge window (RevenantRituals SUMMON_CHARGE_TIME). */
export const HOODED_WITNESS_VANISH_DURATION = 0.95;

export const HOODED_WITNESS_IDS = new Set(['mysterious_man', 'mysterious_man_shore']);

const RR_VIOLET = 0xCC44FF;
const RR_TEAL = 0x40FFEE;

interface VanishState {
  timer: number;
  x: number;
  y: number;
}

interface ParticleEmitter {
  emitAt: (
    x: number,
    y: number,
    z: number,
    count: number,
    color: number,
    lifetime?: number,
    speed?: number,
    spread?: number,
  ) => void;
}

interface ScreenShakeLike {
  shake: (intensity: number, duration: number) => void;
}

const _vanishing = new Map<string, VanishState>();
let _lastMap = '';

export function hoodedWitnessVanishedFlag(npcId: string): GameFlagKey {
  return `${npcId}_vanished` as GameFlagKey;
}

export function isHoodedWitnessVanished(state: GameState, npcId: string): boolean {
  return state.getFlag(hoodedWitnessVanishedFlag(npcId));
}

export function isHoodedWitnessVanishing(npcId: string): boolean {
  return _vanishing.has(npcId);
}

/** 0 while idle, 0→1 as the witness dissolves. */
export function getHoodedWitnessVanishProgress(npcId: string): number {
  const vanish = _vanishing.get(npcId);
  if (!vanish) return 0;
  return 1 - vanish.timer / HOODED_WITNESS_VANISH_DURATION;
}

function emitVanishBurst(particleSystem: ParticleEmitter, x: number, y: number) {
  particleSystem.emitAt(x, y, 0.4, 30, RR_VIOLET, 0.5, 2.4, 1.6);
  particleSystem.emitAt(x, y, 0.4, 18, RR_TEAL, 0.45, 2.0, 1.4);
}

function isWithinStrikeRadius(
  npc: NPC,
  strikeX: number,
  strikeY: number,
  radius: number,
): boolean {
  const dx = npc.position.x - strikeX;
  const dy = npc.position.y - strikeY;
  return dx * dx + dy * dy <= radius * radius;
}

export function tryStrikeHoodedWitness({
  state,
  strikeX,
  strikeY,
  radius,
  npcs,
  particleSystem,
  screenShake,
  playRitualSummonStart,
  onDialogueClosed,
}: {
  state: GameState;
  strikeX: number;
  strikeY: number;
  radius: number;
  npcs: NPC[];
  particleSystem: ParticleEmitter;
  screenShake?: ScreenShakeLike;
  playRitualSummonStart?: () => void;
  onDialogueClosed?: () => void;
}): string | null {
  if (state.getFlag('hollow_guardian_defeated')) return null;

  const strikeRadius = radius + 0.55;
  for (const npc of npcs) {
    if (!HOODED_WITNESS_IDS.has(npc.id)) continue;
    if (isHoodedWitnessVanished(state, npc.id)) continue;
    if (isHoodedWitnessVanishing(npc.id)) continue;
    if (!isWithinStrikeRadius(npc, strikeX, strikeY, strikeRadius)) continue;

    _vanishing.set(npc.id, {
      timer: HOODED_WITNESS_VANISH_DURATION,
      x: npc.position.x,
      y: npc.position.y,
    });

    emitVanishBurst(particleSystem, npc.position.x, npc.position.y);
    playRitualSummonStart?.();
    screenShake?.shake(0.35, 0.3);

    if (
      state.dialogueActive &&
      (state.currentDialogue === 'mysterious_man' || state.currentDialogue === 'mysterious_man_shore')
    ) {
      state.dialogueActive = false;
      state.currentDialogue = null;
      onDialogueClosed?.();
    }

    return npc.id;
  }

  return null;
}

export function updateHoodedWitnessVanish({
  state,
  deltaTime,
  currentTime,
  particleSystem,
  screenShake,
  triggerSave,
  onWitnessVanished,
}: {
  state: GameState;
  deltaTime: number;
  currentTime: number;
  particleSystem: ParticleEmitter;
  screenShake?: ScreenShakeLike;
  triggerSave?: () => void;
  onWitnessVanished?: (npcId: string) => void;
}): void {
  if (state.currentMap !== _lastMap) {
    _vanishing.clear();
    _lastMap = state.currentMap;
  }

  if (_vanishing.size === 0) return;

  const completed: string[] = [];

  for (const [npcId, vanish] of _vanishing) {
    const progress = 1 - vanish.timer / HOODED_WITNESS_VANISH_DURATION;

    // Reverse of the glyph charge spiral: ring expands as the witness dissolves.
    const ringR = 1.4 * progress + 0.2;
    const angle = currentTime / 60;
    particleSystem.emitAt(
      vanish.x + Math.cos(angle) * ringR,
      vanish.y + Math.sin(angle) * ringR * 0.6,
      0.3,
      2,
      RR_VIOLET,
      0.35,
      0.4 + progress * 1.2,
      0.7,
    );
    particleSystem.emitAt(
      vanish.x - Math.cos(angle) * ringR,
      vanish.y - Math.sin(angle) * ringR * 0.6,
      0.3,
      2,
      RR_TEAL,
      0.3,
      0.4 + progress * 1.2,
      0.7,
    );

    if (progress > 0.5) {
      screenShake?.shake(0.05 + progress * 0.05, 0.08);
    }

    vanish.timer -= deltaTime;
    if (vanish.timer <= 0) {
      completed.push(npcId);
    }
  }

  for (const npcId of completed) {
    _vanishing.delete(npcId);
    state.setFlag(hoodedWitnessVanishedFlag(npcId), true);
    onWitnessVanished?.(npcId);
    triggerSave?.();
  }
}
