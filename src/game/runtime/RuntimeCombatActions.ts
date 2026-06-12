import * as THREE from 'three';
import type { MutableRefObject } from 'react';
import type { Enemy } from '@/lib/game/Combat';
import type { World } from '@/lib/game/World';
import { hasPlayerMeleeLineOfSight } from '@/lib/game/Combat';
import type { GameFlagKey, GameState } from '@/lib/game/GameState';
import { resolveNearestRitualSite } from '@/game/runtime/RevenantRituals';
import type { ArcWaveState } from '@/game/runtime/PlayerSimulationSystem';
import { breakTilesInRadius, type BreakableWorld } from '@/game/runtime/BreakableProps';
import { damageHeresyAltarsInRadius } from '@/game/runtime/HeresyAltars';
import {
  FIND_HUNTER_BOSS_OBJECTIVE,
  FIND_HUNTER_INDEX,
  tryCompleteFindHunterQuest,
} from '@/lib/game/findHunterProgression';
import { markObjectiveDone } from '@/lib/game/progressionToasts';
import { revealAllTilesForMap } from '@/lib/game/visitedTiles';
import { getStaggerDamageMultiplier } from '@/data/balance';
import { getMoveset } from '@/data/weaponMovesets';
import { SaveManager } from '@/lib/game/SaveManager';
import { tryStrikeHoodedWitness } from '@/game/runtime/hoodedWitnessVanish';

type Direction8 = 'up' | 'down' | 'left' | 'right' | 'up_left' | 'up_right' | 'down_left' | 'down_right';
type Direction4 = 'up' | 'down' | 'left' | 'right';

// Hoisted to module scope so per-attack frames don't allocate the literal.
const DIR_OFFSETS_4: Record<Direction4, { x: number; y: number }> = {
  up: { x: 0, y: 1 },
  down: { x: 0, y: -1 },
  left: { x: -1, y: 0 },
  right: { x: 1, y: 0 },
};

const PLAYER_MELEE_CONE_DOT = 0.5; // 120-degree front arc.

const getEnemyForwardDot = (
  enemy: Enemy,
  playerPosition: { x: number; y: number },
  direction: Direction4,
): number => {
  const dir = DIR_OFFSETS_4[direction];
  const dx = enemy.position.x - playerPosition.x;
  const dy = enemy.position.y - playerPosition.y;
  const len = Math.sqrt(dx * dx + dy * dy);
  if (len < 0.0001) return 1;
  return (dx / len) * dir.x + (dy / len) * dir.y;
};

const getForwardMeleeTarget = (
  enemies: Enemy[],
  playerPosition: { x: number; y: number },
  direction: Direction4,
  world?: World,
): Enemy | null => {
  let target: Enemy | null = null;
  let bestScore = Number.POSITIVE_INFINITY;

  for (const enemy of enemies) {
    const dot = getEnemyForwardDot(enemy, playerPosition, direction);
    if (dot < PLAYER_MELEE_CONE_DOT) continue;
    // Don't connect through walls or across cliff tiers - mirrors enemy melee LOS.
    if (!hasPlayerMeleeLineOfSight(world, playerPosition.x, playerPosition.y, enemy.position.x, enemy.position.y)) continue;
    const dx = enemy.position.x - playerPosition.x;
    const dy = enemy.position.y - playerPosition.y;
    const distSq = dx * dx + dy * dy;
    const score = distSq - dot * 0.25;
    if (score < bestScore) {
      bestScore = score;
      target = enemy;
    }
  }

  return target;
};

const _scratchEnemies: Enemy[] = [];
const _scratchArcEnemies: Enemy[] = [];
type PlayerAnimState =
  | 'idle'
  | 'walk'
  | 'attack'
  | 'dodge'
  | 'charge'
  | 'hurt'
  | 'spin_attack'
  | 'lunge'
  | 'lunge_recovery'
  | 'drinking'
  | 'block';

interface CombatSystemLike {
  getEnemiesInRange: (position: { x: number; y: number }, range: number, out?: Enemy[]) => Enemy[];
  getAllEnemies: () => Enemy[];
  playerAttack: (
    enemy: Enemy,
    damage: number,
    playerPosition: { x: number; y: number },
    playerDirection: string,
  ) => { killed: boolean; staggered: boolean; backstab: boolean };
}

interface FloatingTextLike {
  spawnDamage: (x: number, y: number, amount: number, crit?: boolean) => void;
  spawn: (x: number, y: number, text: string, color: string, size: number) => void;
  spawnGold: (x: number, y: number, amount: number) => void;
}

interface ScreenShakeLike {
  shake: (intensity: number, duration: number) => void;
  hitStop: (duration: number) => void;
}

interface ParticleSystemLike {
  emitDamage: (position: THREE.Vector3) => void;
  emitSparkles: (position: THREE.Vector3) => void;
  emit: (position: THREE.Vector3, count: number, color: number, size: number, speed: number, life: number) => void;
}

interface EnemyAudioLike {
  playDefeat: (enemy: Enemy) => void;
  clearEnemy: (enemyId: string) => void;
}

interface RuntimeCombatActionOptions {
  state: GameState;
  world: BreakableWorld & World;
  visitedTilesRef?: MutableRefObject<Set<string>>;
  combatSystem: CombatSystemLike;
  floatingText: FloatingTextLike;
  screenShake: ScreenShakeLike;
  particleSystem: ParticleSystemLike;
  enemyAudio: EnemyAudioLike;
  notify: (title: string, options?: { id?: string; description?: string; duration?: number }) => void;
  showHeroOverlay?: (title: string, subtitle?: string) => void;
  triggerUIUpdate: () => void;
  playEssencePickup: () => void;
  playSwordSwing: () => void;
  playBladeSheath: () => void;
  playWeaponHit: (enemy: Enemy) => void;
  playWeaponChargeRelease: () => void;
  playWeaponArcWave: () => void;
  playStaggerEnemy: () => void;
  getKillCount: () => number;
  setKillCount: (value: number) => void;
  getCurrentDir8: () => Direction8;
  dir8to4: (direction: Direction8) => Direction4;
  getIsBlocking: () => boolean;
  setIsBlocking: (value: boolean) => void;
  setSwooshTimer: (value: number) => void;
  setSwooshFacing: (value: Direction4) => void;
  swooshDuration: number;
  attackStaminaCost: number;
  chargeAttackStaminaCost: number;
  chargeDamageMult: number;
  spinSwooshDuration: number;
  setSpinSwooshTimer: (value: number) => void;
  arcWave: ArcWaveState;
  setPlayerAnimState: (value: PlayerAnimState) => void;
  setAttackFrame: (value: number) => void;
  setAttackFrameTimer: (value: number) => void;
  attackFrameDuration: number;
  setSpinDirIndex: (value: number) => void;
  setSpinFrameTimer: (value: number) => void;
  spinFrameDuration: number;
  spinDirections: Direction8[];
  clearChargeState: () => void;
  // Combo chain state
  getComboStep: () => number;
  setComboStep: (value: number) => void;
  getComboWindowTimer: () => number;
  setComboWindowTimer: (value: number) => void;
  getComboInputBuffered: () => boolean;
  setComboInputBuffered: (value: boolean) => void;
  getPlayerAnimState: () => string;
  // Lunge attack (broadsword)
  lungeDistMin: number;
  lungeDistMax: number;
  lungeSpeedBase: number;
  lungeSpeedFull: number;
  lungeRecoveryMin: number;
  lungeRecoveryMax: number;
  startLunge: (dirX: number, dirY: number, speed: number, distance: number, recovery: number, damage: number) => void;
  onBossDefeated?: () => void;
  playPropBreak?: () => void;
  playTallGrassBreak?: () => void;
  playHeresyAltarHit?: () => void;
  playHeresyAltarBreak?: () => void;
  playRitualSummonStart?: () => void;
  syncRevenantTerminusChestState?: () => void;
  triggerSave: () => void;
}

export function createRuntimeCombatActions({
  state,
  world,
  visitedTilesRef,
  combatSystem,
  floatingText,
  screenShake,
  particleSystem,
  enemyAudio,
  notify,
  showHeroOverlay,
  triggerUIUpdate,
  playEssencePickup,
  playSwordSwing,
  playBladeSheath,
  playWeaponHit,
  playWeaponChargeRelease,
  playWeaponArcWave,
  playStaggerEnemy,
  getKillCount,
  setKillCount,
  getCurrentDir8,
  dir8to4,
  getIsBlocking,
  setIsBlocking,
  setSwooshTimer,
  setSwooshFacing,
  swooshDuration,
  attackStaminaCost,
  chargeAttackStaminaCost,
  chargeDamageMult,
  spinSwooshDuration,
  setSpinSwooshTimer,
  arcWave,
  setPlayerAnimState,
  setAttackFrame,
  setAttackFrameTimer,
  attackFrameDuration,
  setSpinDirIndex,
  setSpinFrameTimer,
  spinFrameDuration,
  spinDirections,
  clearChargeState,
  getComboStep,
  setComboStep,
  getComboWindowTimer,
  setComboWindowTimer,
  setComboInputBuffered,
  getPlayerAnimState,
  lungeDistMin,
  lungeDistMax,
  lungeSpeedBase,
  lungeSpeedFull,
  lungeRecoveryMin,
  lungeRecoveryMax,
  startLunge,
  onBossDefeated,
  playPropBreak,
  playTallGrassBreak,
  playHeresyAltarHit,
  playHeresyAltarBreak,
  playRitualSummonStart,
  syncRevenantTerminusChestState,
  triggerSave,
}: RuntimeCombatActionOptions) {
  const onEnemyKilled = (enemy: Enemy) => {
    const nextKillCount = getKillCount() + 1;
    setKillCount(nextKillCount);
    enemyAudio.playDefeat(enemy);
    enemyAudio.clearEnemy(enemy.id);
    if (enemy.essenceReward > 0) playEssencePickup();
    if (enemy.goldReward > 0) floatingText.spawnGold(enemy.position.x, enemy.position.y + 0.6, enemy.goldReward);

    if (enemy.zoneId) {
      state.killedEnemyIds.add(enemy.zoneId);
      triggerSave();
    }

    if (state.currentMap === 'forest' || state.currentMap === 'interior_hollow_arena' || state.currentMap === 'interior_guilrhym_cathedral') {
      if (state.currentMap === 'forest') {
        const forestKillCount = (Number(state.getFlag('forest_kill_count')) || 0) + 1;
        state.setFlag('forest_kill_count', forestKillCount);
      }
      if (enemy.type === 'golem') {
        state.setFlag('forest_golem_defeated', true);
        // Drop the Golem Heart as a world item at the enemy's position
        state.worldItems.push({
          instanceId: `golem_heart_${state.currentMap}_${Math.round(enemy.position.x)}_${Math.round(enemy.position.y)}`,
          itemId: 'golem_heart',
          mapId: state.currentMap,
          x: enemy.position.x,
          y: enemy.position.y,
        });
        screenShake.shake(0.5, 0.4);
        particleSystem.emitAt(enemy.position.x, enemy.position.y, 0.5, 30, 0xAA8844, 0.1, 1.8, 1.2);
      }
      if (enemy.type === 'corrupted_giant') {
        state.setFlag('corrupted_giant_defeated', true);
        screenShake.shake(0.8, 0.6);
        particleSystem.emitAt(enemy.position.x, enemy.position.y, 0.6, 60, 0x7B3FA0, 0.12, 2.6, 1.8);
      }
      if (enemy.type === 'hollow_guardian') {
        state.setFlag('hollow_guardian_defeated', true);
        SaveManager.clearBossAttemptCheckpoint();
        const hunterQuest = state.quests.find(q => q.id === 'find_hunter' && q.active && !q.completed);
        if (hunterQuest) {
          markObjectiveDone(hunterQuest, FIND_HUNTER_INDEX.boss, FIND_HUNTER_BOSS_OBJECTIVE);
          tryCompleteFindHunterQuest(state, notify, showHeroOverlay);
        }
        state.worldItems.push({
          instanceId: `heretical_essence_apparition_${state.currentMap}_${Math.round(enemy.position.x)}_${Math.round(enemy.position.y)}`,
          itemId: 'heretical_essence_apparition',
          mapId: state.currentMap,
          x: enemy.position.x,
          y: enemy.position.y,
        });
        screenShake.shake(0.6, 0.5);
        screenShake.hitStop(0.3);
        particleSystem.emitAt(enemy.position.x, enemy.position.y, 0.5, 40, 0x7C4DFF, 0.12, 2.0, 1.5);
        // Reveal entire arena map when boss is defeated
        const map = world.getCurrentMap();
        if (visitedTilesRef?.current) {
          revealAllTilesForMap(visitedTilesRef.current, state.currentMap, map.width, map.height);
        }
        if (onBossDefeated) onBossDefeated();
        for (const e of combatSystem.getAllEnemies()) {
          if (e.id !== enemy.id && e.state !== 'dead') {
            e.health = 0;
            e.state = 'dead';
          }
        }
      }
      if (enemy.type === 'ashen_reaver') {
        state.setFlag('ashen_reaver_defeated', true);
        screenShake.shake(0.7, 0.6);
        screenShake.hitStop(0.35);
        particleSystem.emitAt(enemy.position.x, enemy.position.y, 0.5, 50, 0xFF4400, 0.14, 2.5, 1.8);
        // Reveal entire Guilrhym cathedral area when Reaver is defeated
        const map = world.getCurrentMap();
        if (visitedTilesRef?.current) {
          revealAllTilesForMap(visitedTilesRef.current, state.currentMap, map.width, map.height);
        }
        if (onBossDefeated) onBossDefeated();
        for (const e of combatSystem.getAllEnemies()) {
          if (e.id !== enemy.id && e.state !== 'dead') {
            e.health = 0;
            e.state = 'dead';
          }
        }
      }
      if (enemy.type === 'ridge_revenant') {
        const map = world.getCurrentMap();
        const ritualSite = resolveNearestRitualSite(
          state.currentMap,
          enemy.position.x,
          enemy.position.y,
          map.width,
          map.height,
        );
        if (ritualSite) {
          state.setFlag(ritualSite.clearedFlag as GameFlagKey, true);
          if (ritualSite.clearedFlag === 'ridge_revenant_defeated') {
            const wx = ritualSite.tileX - map.width / 2 + 0.5;
            const wy = ritualSite.tileY - map.height / 2 + 0.5;
            const remaining = combatSystem.getAllEnemies().filter(e => {
              if (e.type !== 'ridge_revenant' || e.state === 'dead' || e.id === enemy.id) return false;
              const d = (e.position.x - wx) ** 2 + (e.position.y - wy) ** 2;
              return d < 22 * 22;
            }).length;
            if (remaining === 0) {
              state.worldItems.push({
                instanceId: `tempered_core_${state.currentMap}_${Math.round(enemy.position.x)}_${Math.round(enemy.position.y)}`,
                itemId: 'tempered_core',
                mapId: state.currentMap,
                x: enemy.position.x + 0.5,
                y: enemy.position.y - 0.5,
              });
              screenShake.shake(0.55, 0.45);
              particleSystem.emitAt(enemy.position.x, enemy.position.y, 0.45, 35, 0xFF6F00, 0.12, 2.0, 1.4);
            }
          } else if (
            (ritualSite.clearedFlag === 'ritual_revenant_west_cleared' ||
             ritualSite.clearedFlag === 'ritual_revenant_precipice_cleared') &&
            !state.getFlag('terminus_scythe_early_obtained')
          ) {
            // Chest materialises at the anchor - same burst the revenant was summoned with.
            const wx = ritualSite.tileX - map.width / 2 + 0.5;
            const wy = ritualSite.tileY - map.height / 2 + 0.5;
            particleSystem.emitAt(wx, wy, 0.4, 30, 0x7C4DFF, 0.5, 2.4, 1.6);
            particleSystem.emitAt(wx, wy, 0.4, 18, 0x44CCCC, 0.45, 2.0, 1.4);
            particleSystem.emitAt(wx, wy, 0.55, 12, 0xFFD700, 0.6, 1.6, 1.2);
            screenShake.shake(0.35, 0.3);
            playRitualSummonStart?.();
            syncRevenantTerminusChestState?.();
          }
        }
      }
    }

    const guardQuest = state.quests.find(q => q.id === 'guard_duty' && q.active && !q.completed);
    if (guardQuest && state.currentMap === 'forest') {
      const baseline = Number(state.getFlag('guard_duty_kill_baseline')) || 0;
      const forestKillCount = Number(state.getFlag('forest_kill_count')) || 0;
      const kills = Math.min(forestKillCount - baseline, 5);
      const alreadyMaxed = guardQuest.objectives[1]?.includes('\u2713');
      guardQuest.objectives[1] = `Defeat any hostile creatures (${kills}/5)`;
      if (kills === 3) {
        notify('The forest is beginning to fear you.', { id: 'guard-progress', duration: 3000 });
      }
      if (kills >= 5 && !alreadyMaxed) {
        markObjectiveDone(guardQuest, 1, 'Defeat any hostile creatures (5/5)');
        screenShake.shake(0.15, 0.1);
      }
    }

    if (enemy.type === 'hollow_guardian') {
      if (!onBossDefeated) {
        notify('HOLLOW APPARITION VANQUISHED', {
          id: 'boss-kill',
          description: `+${enemy.essenceReward} essence. The fog lifts...`,
          duration: 5000,
        });
      }
    } else {
      notify(`Defeated ${enemy.name}!`, {
        id: 'enemy-kill',
        description: enemy.essenceReward > 0 ? `+${enemy.essenceReward} essence` : undefined,
        duration: 2000,
      });
    }
    triggerUIUpdate();

    if (enemy.type === 'hollow_guardian') {
      triggerSave();
    }
  };

  // Total altars in the Whispering Woods forest map.
  const FOREST_ALTAR_TOTAL = 8;

  const _trackAltarQuestProgress = (destroyedThisSwing: number) => {
    const prev = (state.getFlag('altars_destroyed_total') as number) || 0;
    const newTotal = prev + destroyedThisSwing;
    state.setFlag('altars_destroyed_total', newTotal);

    const q = state.quests.find(q => q.id === 'shattered_altars');
    if (!q) return;

    // Auto-start the quest on first altar destruction.
    if (!q.active) q.active = true;

    const count = Math.min(newTotal, FOREST_ALTAR_TOTAL);
    q.objectives[0] = `Destroy the heresy altars (${count}/${FOREST_ALTAR_TOTAL})`;

    if (!q.completed && newTotal >= FOREST_ALTAR_TOTAL) {
      markObjectiveDone(q, 0, q.objectives[0]);
      state.addGold(q.reward?.gold ?? 0);
      notify('All shrines shattered', {
        id: 'shattered-altars-complete',
        type: 'success',
        description: 'The Hollow\'s tether to these woods weakens.',
        duration: 4000,
      });
    }
    triggerUIUpdate();
  };

  const _tryStrikeHoodedWitnessAt = (strikeX: number, strikeY: number, radius: number) => {
    tryStrikeHoodedWitness({
      state,
      strikeX,
      strikeY,
      radius,
      npcs: state.npcs,
      particleSystem,
      screenShake,
      playRitualSummonStart,
      onDialogueClosed: triggerUIUpdate,
    });
  };

  const _applyAttackDamage = (step: number) => {
    const moveset = getMoveset(state.equippedWeaponId);
    const stepDef = moveset.steps[step] ?? moveset.steps[moveset.steps.length - 1];
    const stepRange = state.player.attackRange * (stepDef?.rangeMult ?? 1);
    const enemiesInRange = combatSystem.getEnemiesInRange(state.player.position, stepRange, _scratchEnemies);
    const direction = dir8to4(getCurrentDir8()) as Direction4;
    const off = DIR_OFFSETS_4[direction];
    const attackX = state.player.position.x + off.x;
    const attackY = state.player.position.y + off.y;
    const target = getForwardMeleeTarget(enemiesInRange, state.player.position, direction, world);
    if (!target) {
      _tryStrikeHoodedWitnessAt(attackX, attackY, stepRange);
      particleSystem.emitAt(attackX, attackY, 0.3, 4, 0xffffff, 0.3, 1, 1);
      breakTilesInRadius(world, world.getCurrentMap(), attackX, attackY, stepRange, particleSystem, {
        generic: playPropBreak,
        tallGrass: playTallGrassBreak,
      });
      const altarsDestroyed = damageHeresyAltarsInRadius(state, world, world.getCurrentMap(), attackX, attackY, stepRange, particleSystem, {
        hit: playHeresyAltarHit ?? playPropBreak,
        destroy: playHeresyAltarBreak ?? playPropBreak,
      }, notify);
      if (altarsDestroyed > 0 && state.currentMap === 'forest') {
        _trackAltarQuestProgress(altarsDestroyed);
      }
      return;
    }

    _tryStrikeHoodedWitnessAt(attackX, attackY, stepRange);

    const parryBonus = state.player.parryBonusTimer > 0 ? 1.25 : 1;
    const stepDamageMult = stepDef?.damageMult ?? 1;
    const baseDamage = Math.floor(state.player.attackDamage * parryBonus * stepDamageMult * state.player.berserkerDamageMult);

    const result = combatSystem.playerAttack(target, baseDamage, state.player.position, state.player.direction);
    playWeaponHit(target);

    if (parryBonus > 1) state.player.parryBonusTimer = 0;

    const isCrit = target.state === 'recovering' || target.state === 'staggered';
    const isBackstab = result.backstab;
    const isStaggered = result.staggered;
    if (isStaggered) playStaggerEnemy();

    let actualDamage = baseDamage;
    if (isBackstab) actualDamage = Math.floor(baseDamage * 2.5);
    else if (target.state === 'staggered') actualDamage = Math.floor(baseDamage * getStaggerDamageMultiplier(target.type));
    else if (isCrit) actualDamage = Math.floor(baseDamage * 1.5);

    floatingText.spawnDamage(target.position.x, target.position.y, actualDamage, isCrit || isBackstab);

    if (isBackstab) {
      screenShake.shake(0.35, 0.2);
      screenShake.hitStop(0.1);
    } else {
      const shakeIntensity = step === 2 ? 0.25 : (isCrit ? 0.2 : 0.1);
      const shakeDuration = step === 2 ? 0.18 : (isCrit ? 0.15 : 0.08);
      const hitStopDuration = step === 2 ? 0.13 : (isCrit ? 0.1 : 0.07);
      screenShake.shake(shakeIntensity, shakeDuration);
      screenShake.hitStop(hitStopDuration);
    }

    // Finisher: emit extra sparkles on step 2
    if (step === 2) {
      particleSystem.emitSparklesAt(target.position.x, target.position.y + 0.3, 0.5);
    }

    particleSystem.emitDamageAt(target.position.x, target.position.y, 0.3);

    if (result.killed) onEnemyKilled(target);
  };

  // Core attack logic for a given combo step (0=first hit, 1=second, 2=finisher).
  // Returns the frameDuration so callers (e.g. simulation) can sync local timer variables.
  const _executeAttackStep = (step: number, skipCooldown = false): number => {
    const currentTime = performance.now();
    if (!skipCooldown && currentTime - state.player.lastAttackTime < state.player.attackCooldown) return 0;
    if (getPlayerAnimState() === 'drinking') return 0;
    if (state.player.isDodging || state.player.isClimbing) return 0;
    if (state.player.stamina < attackStaminaCost) return 0;

    if (getIsBlocking()) setIsBlocking(false);

    playSwordSwing();
    playBladeSheath();
    setSwooshTimer(swooshDuration);
    setSwooshFacing(dir8to4(getCurrentDir8()));

    const moveset = getMoveset(state.equippedWeaponId);
    const stepFrameMult = moveset.steps[step]?.frameMult ?? 1;
    const frameDuration = attackFrameDuration * stepFrameMult;
    const attackAnimationDuration = frameDuration * 3;

    state.player.lastAttackTime = currentTime;
    state.player.stamina = Math.max(0, state.player.stamina - attackStaminaCost);
    state.player.lastStaminaUseTime = performance.now() / 1000 + attackAnimationDuration;
    setPlayerAnimState('attack');
    setAttackFrame(0);
    setAttackFrameTimer(frameDuration);
    state.player.attackAnimationTimer = attackAnimationDuration;

    _applyAttackDamage(step);
    return frameDuration;
  };

  const performAttack = () => {
    // Hurt lockout: can't attack (or buffer a next hit) while recoiling from damage.
    if (state.player.hurtTimer > 0) return;

    const animState = getPlayerAnimState();
    if (animState === 'drinking') return;
    const step = getComboStep();

    // During active swing: buffer the next press regardless of combo step.
    // For step < 2 the buffer chains into the next combo hit; for step 2
    // (finisher) it starts a fresh combo from step 0 once the swing ends -
    // either way the player's input is honored instead of silently dropped.
    if (animState === 'attack') {
      setComboInputBuffered(true);
      return;
    }

    // Attack recovery lockout: brief window after a swing ends (Souls-style recovery frames).
    // Combo-window chains bypass this so natural chaining still feels fluid.
    if (state.player.attackRecoveryTimer > 0 && getComboWindowTimer() <= 0) return;

    if (state.player.isDodging || state.player.isClimbing) return;
    if (state.player.stamina < attackStaminaCost) return;

    // In combo window: chain immediately to the next step
    const lastStep = getMoveset(state.equippedWeaponId).steps.length - 1;
    if (getComboWindowTimer() > 0 && step < lastStep) {
      const nextStep = step + 1;
      setComboStep(nextStep);
      setComboWindowTimer(0);
      _executeAttackStep(nextStep, true);
      return;
    }

    // Fresh attack: reset combo to step 0
    setComboStep(0);
    setComboWindowTimer(0);
    _executeAttackStep(0);
  };

  // Called by PlayerSimulationSystem when an attack press buffered during a dodge
  // roll fires at roll end. Always restarts the combo at step 0 - rolling drops
  // the chain, Souls-style. Returns null while gates (attack cooldown, stamina,
  // hurt lockout) still block the swing so the caller can retry each frame until
  // the buffer's TTL expires.
  const performBufferedAttack = (): { frameDuration: number } | null => {
    if (state.player.hurtTimer > 0) return null;
    const animState = getPlayerAnimState();
    if (animState === 'drinking' || animState === 'attack') return null;

    const frameDuration = _executeAttackStep(0);
    if (frameDuration === 0) return null;
    setComboStep(0);
    setComboWindowTimer(0);
    return { frameDuration };
  };

  // Called by PlayerSimulationSystem when a buffered input fires at animation end.
  // For step 0/1 this advances the combo chain; for step 2 (finisher) it restarts
  // a fresh combo at step 0 so a press during the finisher swing isn't lost.
  // Returns the new frameDuration so the simulation can update its local timer variables.
  const triggerComboChain = (): { frameDuration: number } | null => {
    const step = getComboStep();
    // Hurt lockout: an interrupted swing can't chain.
    if (state.player.hurtTimer > 0) return null;
    if (getPlayerAnimState() === 'drinking') return null;
    if (state.player.isDodging || state.player.isClimbing) return null;
    if (state.player.stamina < attackStaminaCost) return null;

    const lastStep = getMoveset(state.equippedWeaponId).steps.length - 1;
    const nextStep = step >= lastStep ? 0 : step + 1;
    setComboStep(nextStep);
    setComboInputBuffered(false);

    const frameDuration = _executeAttackStep(nextStep, true);
    if (frameDuration === 0) return null;
    return { frameDuration };
  };

  const dir8ToVector: Record<Direction8, { x: number; y: number }> = {
    up: { x: 0, y: 1 }, down: { x: 0, y: -1 },
    left: { x: -1, y: 0 }, right: { x: 1, y: 0 },
    up_left: { x: -0.707, y: 0.707 }, up_right: { x: 0.707, y: 0.707 },
    down_left: { x: -0.707, y: -0.707 }, down_right: { x: 0.707, y: -0.707 },
  };

  const performLungeAttack = (level: number) => {
    const currentTime = performance.now();
    if (
      getPlayerAnimState() === 'drinking' ||
      state.player.isDodging ||
      state.player.isClimbing ||
      state.player.stamina < chargeAttackStaminaCost
    ) {
      clearChargeState();
      setPlayerAnimState('idle');
      return;
    }

    playSwordSwing();
    playWeaponChargeRelease();

    const dir = dir8ToVector[getCurrentDir8()];
    const distance = lungeDistMin + (lungeDistMax - lungeDistMin) * level;
    const speed = lungeSpeedBase - (lungeSpeedBase - lungeSpeedFull) * level;
    const recovery = lungeRecoveryMin + (lungeRecoveryMax - lungeRecoveryMin) * level;
    const damageMultiplier = 1 + (chargeDamageMult - 1) * level;
    const damage = Math.floor(state.player.attackDamage * damageMultiplier * state.player.berserkerDamageMult);

    state.player.lastAttackTime = currentTime;
    state.player.stamina = Math.max(0, state.player.stamina - chargeAttackStaminaCost);
    const lungeDuration = distance / speed;
    state.player.lastStaminaUseTime = performance.now() / 1000 + lungeDuration + recovery;
    state.player.attackAnimationTimer = lungeDuration + recovery;

    setPlayerAnimState('lunge');
    setAttackFrame(1);
    clearChargeState();

    startLunge(dir.x, dir.y, speed, distance, recovery, damage);
  };

  const performArcSlash = (level: number) => {
    const currentTime = performance.now();
    if (
      getPlayerAnimState() === 'drinking' ||
      state.player.isDodging ||
      state.player.isClimbing ||
      state.player.stamina < chargeAttackStaminaCost
    ) {
      clearChargeState();
      setPlayerAnimState('idle');
      return;
    }

    playSwordSwing();
    playBladeSheath();
    playWeaponArcWave();

    state.player.lastAttackTime = currentTime;
    state.player.stamina = Math.max(0, state.player.stamina - chargeAttackStaminaCost);
    state.player.lastStaminaUseTime = performance.now() / 1000 + 0.6;
    setPlayerAnimState('spin_attack');
    setSpinDirIndex(0);
    setSpinFrameTimer(spinFrameDuration);
    setAttackFrame(1);
    state.player.attackAnimationTimer = 0.6;
    clearChargeState();

    // Softer than the default spin charge (2.5×) - the traveling wave already hits many targets.
    const SCYTHE_CHARGE_DAMAGE_MULT = 1.85;
    const damageMultiplier = 1 + (SCYTHE_CHARGE_DAMAGE_MULT - 1) * level;
    const arcDamage = Math.floor(state.player.attackDamage * damageMultiplier * state.player.berserkerDamageMult);
    const arcRange = 4 + level * 2;
    const arcWidth = 2.0;

    const direction = dir8to4(getCurrentDir8());
    const dx = direction === 'right' ? 1 : direction === 'left' ? -1 : 0;
    const dy = direction === 'up' ? 1 : direction === 'down' ? -1 : 0;

    // Launch the traveling wave - damage is deferred to per-frame hit detection in
    // PlayerSimulationSystem.ts (arcWave update), so enemies take damage as the wave
    // actually reaches them instead of all dying on the release frame.
    arcWave.active = true;
    arcWave.dirX = dx;
    arcWave.dirY = dy;
    arcWave.currentDist = 0;
    arcWave.maxDist = arcRange;
    arcWave.arcWidth = arcWidth;
    arcWave.damage = arcDamage;
    arcWave.hitIds.clear();

    // Tile-breaking along the arc path - stays instant (environmental, not combat).
    // Visual wave is handled by the traveling spinSwooshMesh in RuntimePlayerFrame.ts.
    const steps = 6;
    for (let i = 1; i <= steps; i++) {
      const t = (i / steps) * arcRange;
      const checkX = state.player.position.x + dx * t;
      const checkY = state.player.position.y + dy * t;
      breakTilesInRadius(world, world.getCurrentMap(), checkX, checkY, arcWidth, particleSystem, {
        generic: playPropBreak,
        tallGrass: playTallGrassBreak,
      });
    }

    // Corruption wave release burst - dark void erupts at the scythe's release point.
    // The traveling wave front is rendered by the spinSwooshMesh over the next 0.65 s.
    const bx = state.player.position.x + dx * 0.55;
    const by = state.player.position.y + dy * 0.55;
    particleSystem.emitAt(bx, by, 0.3, 6, 0x2A1B3D, 0.45, 0.9, 0.7);   // dark void core
    particleSystem.emitAt(bx, by, 0.3, 4, 0x6A0DAD, 0.30, 1.1, 0.9);   // purple burst
    particleSystem.emitAt(state.player.position.x, state.player.position.y, 0.3, 3, 0x1A0E2E, 0.55, 0.5, 0.5); // black wisps

    // SCYTHE_WAVE_DURATION = 0.65 - must match the constant in RuntimePlayerFrame.ts
    setSpinSwooshTimer(0.65);
  };

  const performChargeAttack = (level: number) => {
    if (state.equippedWeaponId === 'ornamental_broadsword') {
      performLungeAttack(level);
      return;
    }
    if (state.equippedWeaponId === 'terminus_scythe') {
      performArcSlash(level);
      return;
    }

    const currentTime = performance.now();
    if (
      getPlayerAnimState() === 'drinking' ||
      state.player.isDodging ||
      state.player.isClimbing ||
      state.player.stamina < chargeAttackStaminaCost
    ) {
      clearChargeState();
      setPlayerAnimState('idle');
      return;
    }

    playSwordSwing();
    playBladeSheath();
    playWeaponChargeRelease();
    setSpinSwooshTimer(spinSwooshDuration);

    const spinAttackDuration = spinFrameDuration * spinDirections.length;
    state.player.lastAttackTime = currentTime;
    state.player.stamina = Math.max(0, state.player.stamina - chargeAttackStaminaCost);
    // Charge attacks should keep stamina locked through the full spin cycle.
    state.player.lastStaminaUseTime = performance.now() / 1000 + spinAttackDuration;
    setPlayerAnimState('spin_attack');
    setSpinDirIndex(0);
    setSpinFrameTimer(spinFrameDuration);
    setAttackFrame(1);
    state.player.attackAnimationTimer = spinAttackDuration;
    clearChargeState();

    const damageMultiplier = 1 + (chargeDamageMult - 1) * level;
    const chargeDamage = Math.floor(state.player.attackDamage * damageMultiplier * state.player.berserkerDamageMult);
    const chargeRange = state.player.attackRange * (1 + level * 0.5);
    _tryStrikeHoodedWitnessAt(state.player.position.x, state.player.position.y, chargeRange);
    breakTilesInRadius(world, world.getCurrentMap(), state.player.position.x, state.player.position.y, chargeRange, particleSystem, {
      generic: playPropBreak,
      tallGrass: playTallGrassBreak,
    });
    const enemiesInRange = combatSystem.getEnemiesInRange(state.player.position, chargeRange, _scratchEnemies);

    if (enemiesInRange.length === 0) {
      const attackPos = { ...state.player.position };
      const direction = dir8to4(getCurrentDir8());
      if (direction === 'up') attackPos.y += 1.5;
      else if (direction === 'down') attackPos.y -= 1.5;
      else if (direction === 'left') attackPos.x -= 1.5;
      else if (direction === 'right') attackPos.x += 1.5;

      particleSystem.emitAt(attackPos.x, attackPos.y, 0.3, 4, 0xcccccc, 0.3, 1, 1);
      return;
    }

    for (const target of enemiesInRange) {
      // The charge sweep is radial, but it still shouldn't punch through walls or
      // hit enemies a tier up/down - same LOS gate as the standard combo.
      if (!hasPlayerMeleeLineOfSight(world, state.player.position.x, state.player.position.y, target.position.x, target.position.y)) {
        continue;
      }
      const result = combatSystem.playerAttack(
        target,
        chargeDamage,
        state.player.position,
        state.player.direction,
      );
      playWeaponHit(target);
      if (result.staggered) playStaggerEnemy();

      const actualDamage = target.state === 'staggered'
        ? Math.floor(chargeDamage * getStaggerDamageMultiplier(target.type))
        : chargeDamage;

      floatingText.spawnDamage(target.position.x, target.position.y, actualDamage, true);
      screenShake.shake(0.25, 0.2);
      screenShake.hitStop(0.1);

      particleSystem.emitDamageAt(target.position.x, target.position.y, 0.3);
      particleSystem.emitSparklesAt(target.position.x, target.position.y + 0.3, 0.5);

      if (result.killed) {
        onEnemyKilled(target);
      }
    }
  };

  return {
    onEnemyKilled,
    performAttack,
    performBufferedAttack,
    performChargeAttack,
    triggerComboChain,
  };
}
