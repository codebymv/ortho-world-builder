import * as THREE from 'three';
import type { Enemy } from '@/lib/game/Combat';
import type { GameState } from '@/lib/game/GameState';

type Direction8 = 'up' | 'down' | 'left' | 'right' | 'up_left' | 'up_right' | 'down_left' | 'down_right';
type Direction4 = 'up' | 'down' | 'left' | 'right';
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
  getEnemiesInRange: (position: { x: number; y: number }, range: number) => Enemy[];
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
  combatSystem: CombatSystemLike;
  floatingText: FloatingTextLike;
  screenShake: ScreenShakeLike;
  particleSystem: ParticleSystemLike;
  enemyAudio: EnemyAudioLike;
  notify: (title: string, options?: { id?: string; description?: string; duration?: number }) => void;
  triggerUIUpdate: () => void;
  playItemGrab: () => void;
  playSwordSwing: () => void;
  playBladeSheath: () => void;
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
  comboFrameMultipliers: readonly [number, number, number];
  comboDamageMultipliers: readonly [number, number, number];
  // Lunge attack (broadsword)
  lungeDistMin: number;
  lungeDistMax: number;
  lungeSpeedBase: number;
  lungeSpeedFull: number;
  lungeRecoveryMin: number;
  lungeRecoveryMax: number;
  startLunge: (dirX: number, dirY: number, speed: number, distance: number, recovery: number, damage: number) => void;
  onBossDefeated?: () => void;
}

export function createRuntimeCombatActions({
  state,
  combatSystem,
  floatingText,
  screenShake,
  particleSystem,
  enemyAudio,
  notify,
  triggerUIUpdate,
  playItemGrab,
  playSwordSwing,
  playBladeSheath,
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
  getComboInputBuffered,
  setComboInputBuffered,
  getPlayerAnimState,
  comboFrameMultipliers,
  comboDamageMultipliers,
  lungeDistMin,
  lungeDistMax,
  lungeSpeedBase,
  lungeSpeedFull,
  lungeRecoveryMin,
  lungeRecoveryMax,
  startLunge,
  onBossDefeated,
}: RuntimeCombatActionOptions) {
  const onEnemyKilled = (enemy: Enemy) => {
    const nextKillCount = getKillCount() + 1;
    setKillCount(nextKillCount);
    enemyAudio.playDefeat(enemy);
    enemyAudio.clearEnemy(enemy.id);
    if (enemy.essenceReward > 0) playItemGrab();

    if (state.currentMap === 'forest' || state.currentMap === 'interior_hollow_arena') {
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
        particleSystem.emit(
          new THREE.Vector3(enemy.position.x, enemy.position.y, 0.5),
          30, 0xAA8844, 0.1, 1.8, 1.2,
        );
      }
      if (enemy.type === 'hollow_guardian') {
        state.setFlag('hollow_guardian_defeated', true);
        const hunterQuest = state.quests.find(q => q.id === 'find_hunter' && q.active && !q.completed);
        if (hunterQuest) {
          hunterQuest.objectives[4] = 'Defeat the Hollow Apparition \u2713';
        }
        screenShake.shake(0.6, 0.5);
        screenShake.hitStop(0.3);
        particleSystem.emit(
          new THREE.Vector3(enemy.position.x, enemy.position.y, 0.5),
          40, 0x7C4DFF, 0.12, 2.0, 1.5,
        );
        if (onBossDefeated) onBossDefeated();
        for (const e of combatSystem.getAllEnemies()) {
          if (e.id !== enemy.id && e.state !== 'dead') {
            e.health = 0;
            e.state = 'dead';
          }
        }
      }
    }

    const guardQuest = state.quests.find(q => q.id === 'guard_duty' && q.active && !q.completed);
    if (guardQuest && state.currentMap === 'forest') {
      const baseline = Number(state.getFlag('guard_duty_kill_baseline')) || 0;
      const forestKillCount = Number(state.getFlag('forest_kill_count')) || 0;
      const kills = Math.min(forestKillCount - baseline, 5);
      guardQuest.objectives[1] = `Defeat any hostile creatures (${kills}/5)`;
      if (kills === 3) {
        notify('The forest is beginning to fear you.', { id: 'guard-progress', duration: 3000 });
      }
      if (kills >= 5) {
        guardQuest.objectives[1] = 'Defeat any hostile creatures (5/5) ✓';
        screenShake.shake(0.15, 0.1);
      }
    }

    if (enemy.type === 'hollow_guardian') {
      notify('HOLLOW APPARITION VANQUISHED', {
        id: 'boss-kill',
        description: `+${enemy.essenceReward} essence. The fog lifts…`,
        duration: 5000,
      });
    } else {
      notify(`Defeated ${enemy.name}!`, {
        id: 'enemy-kill',
        description: enemy.essenceReward > 0 ? `+${enemy.essenceReward} essence` : undefined,
        duration: 2000,
      });
    }
    triggerUIUpdate();
  };

  const _applyAttackDamage = (step: number) => {
    const dirOffsets: Record<Direction4, { x: number; y: number }> = {
      up: { x: 0, y: 1 },
      down: { x: 0, y: -1 },
      left: { x: -1, y: 0 },
      right: { x: 1, y: 0 },
    };

    const enemiesInRange = combatSystem.getEnemiesInRange(state.player.position, state.player.attackRange);
    if (enemiesInRange.length === 0) {
      const attackPos = { ...state.player.position };
      const direction = dir8to4(getCurrentDir8());
      if (direction === 'up') attackPos.y += 1;
      else if (direction === 'down') attackPos.y -= 1;
      else if (direction === 'left') attackPos.x -= 1;
      else if (direction === 'right') attackPos.x += 1;
      particleSystem.emit(new THREE.Vector3(attackPos.x, attackPos.y, 0.3), 4, 0xffffff, 0.3, 1, 1);
      return;
    }

    let target = enemiesInRange[0];
    const direction = dir8to4(getCurrentDir8());
    const dir = dirOffsets[direction];
    const facingEnemies = enemiesInRange.filter(enemy => {
      const dx = enemy.position.x - state.player.position.x;
      const dy = enemy.position.y - state.player.position.y;
      return (dx * dir.x + dy * dir.y) > 0;
    });
    if (facingEnemies.length > 0) target = facingEnemies[0];

    const parryBonus = state.player.parryBonusTimer > 0 ? 1.25 : 1;
    const stepDamageMult = comboDamageMultipliers[step] ?? 1;
    const baseDamage = Math.floor(state.player.attackDamage * parryBonus * stepDamageMult);

    const result = combatSystem.playerAttack(target, baseDamage, state.player.position, state.player.direction);

    if (parryBonus > 1) state.player.parryBonusTimer = 0;

    const isCrit = target.state === 'recovering' || target.state === 'staggered';
    const isBackstab = result.backstab;
    const isStaggered = result.staggered;

    let actualDamage = baseDamage;
    if (isBackstab) actualDamage = Math.floor(baseDamage * 2.5);
    else if (target.state === 'staggered') actualDamage = Math.floor(baseDamage * 2);
    else if (isCrit) actualDamage = Math.floor(baseDamage * 1.5);

    floatingText.spawnDamage(target.position.x, target.position.y, actualDamage, isCrit || isBackstab);

    if (isBackstab) {
      screenShake.shake(0.35, 0.2);
      screenShake.hitStop(0.1);
      floatingText.spawn(target.position.x, target.position.y + 0.8, 'BACKSTAB!', '#FFD700', 24);
    } else {
      const shakeIntensity = step === 2 ? 0.25 : (isCrit ? 0.2 : 0.1);
      const shakeDuration = step === 2 ? 0.18 : (isCrit ? 0.15 : 0.08);
      const hitStopDuration = step === 2 ? 0.13 : (isCrit ? 0.1 : 0.07);
      screenShake.shake(shakeIntensity, shakeDuration);
      screenShake.hitStop(hitStopDuration);
    }

    if (isStaggered) {
      floatingText.spawn(target.position.x, target.position.y + 0.6, 'STAGGER!', '#88AAFF', 20);
    }

    // Finisher: emit extra sparkles on step 2
    if (step === 2) {
      particleSystem.emitSparkles(new THREE.Vector3(target.position.x, target.position.y + 0.3, 0.5));
    }

    particleSystem.emitDamage(new THREE.Vector3(target.position.x, target.position.y, 0.3));

    if (result.killed) onEnemyKilled(target);
  };

  // Core attack logic for a given combo step (0=first hit, 1=second, 2=finisher).
  // Returns the frameDuration so callers (e.g. simulation) can sync local timer variables.
  const _executeAttackStep = (step: number, skipCooldown = false): number => {
    const currentTime = Date.now();
    if (!skipCooldown && currentTime - state.player.lastAttackTime < state.player.attackCooldown) return 0;
    if (state.player.isDodging) return 0;
    if (state.player.stamina < attackStaminaCost) return 0;

    if (getIsBlocking()) setIsBlocking(false);

    playSwordSwing();
    playBladeSheath();
    setSwooshTimer(swooshDuration);
    setSwooshFacing(dir8to4(getCurrentDir8()));

    const frameDuration = attackFrameDuration * (comboFrameMultipliers[step] ?? 1);
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
    const animState = getPlayerAnimState();
    const step = getComboStep();

    // During active swing: buffer the next hit rather than ignoring input
    if (animState === 'attack') {
      if (step < 2) setComboInputBuffered(true);
      return;
    }

    if (state.player.isDodging) return;
    if (state.player.stamina < attackStaminaCost) return;

    // In combo window: chain immediately to the next step
    if (getComboWindowTimer() > 0 && step < 2) {
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

  // Called by PlayerSimulationSystem when a buffered input fires at animation end.
  // Returns the new frameDuration so the simulation can update its local timer variables.
  const triggerComboChain = (): { frameDuration: number } | null => {
    const step = getComboStep();
    if (step >= 2) return null;
    if (state.player.isDodging) return null;
    if (state.player.stamina < attackStaminaCost) return null;

    const nextStep = step + 1;
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
    const currentTime = Date.now();
    if (state.player.isDodging || state.player.stamina < chargeAttackStaminaCost) {
      clearChargeState();
      setPlayerAnimState('idle');
      return;
    }

    playSwordSwing();

    const dir = dir8ToVector[getCurrentDir8()];
    const distance = lungeDistMin + (lungeDistMax - lungeDistMin) * level;
    const speed = lungeSpeedBase - (lungeSpeedBase - lungeSpeedFull) * level;
    const recovery = lungeRecoveryMin + (lungeRecoveryMax - lungeRecoveryMin) * level;
    const damageMultiplier = 1 + (chargeDamageMult - 1) * level;
    const damage = Math.floor(state.player.attackDamage * damageMultiplier);

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

  const performChargeAttack = (level: number) => {
    if (state.equippedWeaponId === 'ornamental_broadsword') {
      performLungeAttack(level);
      return;
    }

    const currentTime = Date.now();
    if (state.player.isDodging || state.player.stamina < chargeAttackStaminaCost) {
      clearChargeState();
      setPlayerAnimState('idle');
      return;
    }

    playSwordSwing();
    playBladeSheath();
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
    const chargeDamage = Math.floor(state.player.attackDamage * damageMultiplier);
    const chargeRange = state.player.attackRange * (1 + level * 0.5);
    const enemiesInRange = combatSystem.getEnemiesInRange(state.player.position, chargeRange);

    if (enemiesInRange.length === 0) {
      const attackPos = { ...state.player.position };
      const direction = dir8to4(getCurrentDir8());
      if (direction === 'up') attackPos.y += 1.5;
      else if (direction === 'down') attackPos.y -= 1.5;
      else if (direction === 'left') attackPos.x -= 1.5;
      else if (direction === 'right') attackPos.x += 1.5;

      particleSystem.emit(new THREE.Vector3(attackPos.x, attackPos.y, 0.3), 4, 0xcccccc, 0.3, 1, 1);
      return;
    }

    for (const target of enemiesInRange) {
      const result = combatSystem.playerAttack(
        target,
        chargeDamage,
        state.player.position,
        state.player.direction,
      );

      const actualDamage = target.state === 'staggered'
        ? Math.floor(chargeDamage * 2)
        : chargeDamage;

      floatingText.spawnDamage(target.position.x, target.position.y, actualDamage, true);
      screenShake.shake(0.25, 0.2);
      screenShake.hitStop(0.1);

      if (result.backstab) {
        floatingText.spawn(target.position.x, target.position.y + 0.6, 'BACKSTAB!', '#FFD700', 24);
      }
      if (result.staggered) {
        floatingText.spawn(target.position.x, target.position.y + 0.4, 'STAGGER!', '#88AAFF', 20);
      }

      particleSystem.emitDamage(new THREE.Vector3(target.position.x, target.position.y, 0.3));
      particleSystem.emitSparkles(new THREE.Vector3(target.position.x, target.position.y + 0.3, 0.5));

      if (result.killed) {
        onEnemyKilled(target);
      }
    }
  };

  return {
    onEnemyKilled,
    performAttack,
    performChargeAttack,
    triggerComboChain,
  };
}
