import type { MutableRefObject } from 'react';
import {
  createEnemyAudioDirector,
  logAudioEvent,
  createRandomAudioPool,
  createSequentialAudioPool,
  setAudioElementLowpass,
} from '@/game/domain/AudioDirector';

interface CreateRuntimeSfxOptions {
  processAudioElement: (audio: HTMLAudioElement) => void;
  musicRef: MutableRefObject<HTMLAudioElement | null>;
  musicStarted: MutableRefObject<boolean>;
}

const clampVolume = (value: number) => Math.max(0, Math.min(1, value));

export function createRuntimeSfx({
  processAudioElement,
  musicRef,
  musicStarted,
}: CreateRuntimeSfxOptions) {
  const createLoopingAudio = (
    src: string,
    volume: number,
    playbackRate: number = 1,
    fadeMs: number = 900,
    initialLowpassHz?: number,
    logIntensityChanges: boolean = true,
  ) => {
    const audio = new Audio(src);
    const label = src.split('/').pop() ?? src;
    audio.loop = true;
    audio.volume = 0;
    audio.playbackRate = playbackRate;
    if (initialLowpassHz) setAudioElementLowpass(audio, initialLowpassHz);
    processAudioElement(audio);
    let targetVolume = 0;
    let fadeFrame: number | null = null;
    let stopAfterFade = false;
    let playPending = false;
    let lastLoggedScale = -1;
    let lastScaleLogAt = 0;
    let lastLowpassHz = initialLowpassHz ?? 0;

    const cancelFade = () => {
      if (fadeFrame === null) return;
      cancelAnimationFrame(fadeFrame);
      fadeFrame = null;
    };

    const rampTo = (nextVolume: number, shouldStopAfterFade: boolean) => {
      if (targetVolume === nextVolume && stopAfterFade === shouldStopAfterFade) return;
      cancelFade();
      targetVolume = nextVolume;
      stopAfterFade = shouldStopAfterFade;
      const startVolume = audio.volume;
      const startTime = performance.now();
      const duration = Math.max(1, fadeMs);

      const step = (now: number) => {
        const t = Math.min(1, (now - startTime) / duration);
        audio.volume = clampVolume(startVolume + (targetVolume - startVolume) * t);
        if (t < 1) {
          fadeFrame = requestAnimationFrame(step);
          return;
        }
        fadeFrame = null;
        audio.volume = clampVolume(targetVolume);
        if (stopAfterFade) {
          audio.pause();
          audio.currentTime = 0;
        }
      };

      fadeFrame = requestAnimationFrame(step);
    };

    const play = () => {
      audio.playbackRate = playbackRate;
      stopAfterFade = false;
      logAudioEvent('loop:start', label, { src, targetVolume: volume, playbackRate });
      if (audio.paused) {
        audio.currentTime = 0;
        audio.volume = 0;
        playPending = true;
        audio.play().then(() => {
          playPending = false;
          rampTo(volume, false);
        }).catch(() => {
          playPending = false;
        });
        return;
      }
      rampTo(volume, false);
    };

    const stop = () => {
      if (audio.paused && audio.currentTime === 0) return;
      logAudioEvent('loop:stop', label, { src });
      rampTo(0, true);
    };

    const setVolumeScale = (scale: number) => {
      const nextVolume = clampVolume(volume * clampVolume(scale));
      const now = performance.now();
      const roundedScale = Math.round(clampVolume(scale) * 100) / 100;
      if (
        logIntensityChanges &&
        nextVolume > 0 &&
        (Math.abs(roundedScale - lastLoggedScale) >= 0.08 || now - lastScaleLogAt > 1500)
      ) {
        lastLoggedScale = roundedScale;
        lastScaleLogAt = now;
        logAudioEvent('loop:intensity', label, {
          src,
          scale: roundedScale,
          volume: Math.round(nextVolume * 1000) / 1000,
        });
      }
      targetVolume = nextVolume;
      stopAfterFade = nextVolume <= 0;
      cancelFade();

      if (nextVolume <= 0) {
        audio.volume = 0;
        if (!audio.paused) {
          audio.pause();
          audio.currentTime = 0;
        }
        return;
      }

      audio.playbackRate = playbackRate;
      if (audio.paused) {
        if (playPending) return;
        audio.currentTime = 0;
        audio.volume = 0;
        playPending = true;
        audio.play().then(() => {
          playPending = false;
          audio.volume = clampVolume(targetVolume);
        }).catch(() => {
          playPending = false;
        });
        return;
      }

      audio.volume = nextVolume;
    };

    return {
      audio,
      play,
      stop,
      setVolumeScale,
      setLowpassFrequency: (frequencyHz: number) => {
        if (Math.abs(frequencyHz - lastLowpassHz) < 1) return;
        lastLowpassHz = frequencyHz;
        setAudioElementLowpass(audio, frequencyHz);
      },
    };
  };

  const dodgeRollSfx = createSequentialAudioPool({
    src: './audio/dodge_roll.mp3',
    volume: 0.44,
    poolSize: 4,
    processAudioElement,
  });

  const SFX_POOL_SIZE = 4;
  const swordSwingSfx = createSequentialAudioPool({
    src: './audio/sword_swing.mp3',
    volume: 0.3,
    poolSize: SFX_POOL_SIZE,
    processAudioElement,
  });

  /** Boss telegraph wind-up — same clip as the player swing, slightly louder. */
  const bossAttackTelegraphSfx = createSequentialAudioPool({
    src: './audio/sword_swing.mp3',
    volume: 0.36,
    poolSize: 2,
    processAudioElement,
  });

  const bladeSheathSfx = createSequentialAudioPool({
    src: './audio/blade_sheath.mp3',
    volume: 0.2,
    poolSize: SFX_POOL_SIZE,
    processAudioElement,
  });

  const weaponHitFleshSfx = createRandomAudioPool({
    entries: [
      { src: './audio/weapon_hit_flesh_1.mp3', volume: 0.46 },
      { src: './audio/weapon_hit_flesh_2.mp3', volume: 0.46 },
    ],
    copiesPerEntry: 2,
    processAudioElement,
  });

  const weaponHitBoneSfx = createRandomAudioPool({
    entries: [
      { src: './audio/weapon_hit_bone_1.mp3', volume: 0.48 },
      { src: './audio/weapon_hit_bone_2.mp3', volume: 0.48 },
    ],
    copiesPerEntry: 2,
    processAudioElement,
  });

  const weaponHitStoneSfx = createRandomAudioPool({
    entries: [
      { src: './audio/weapon_hit_stone_1.mp3', volume: 0.5 },
      { src: './audio/weapon_hit_stone_2.mp3', volume: 0.5 },
    ],
    copiesPerEntry: 2,
    processAudioElement,
  });

  const weaponHitPlantSfx = createRandomAudioPool({
    entries: [
      { src: './audio/weapon_hit_plant_1.mp3', volume: 0.46 },
      { src: './audio/weapon_hit_plant_2.mp3', volume: 0.46 },
    ],
    copiesPerEntry: 2,
    processAudioElement,
  });

  const weaponHitEtherealSfx = createRandomAudioPool({
    entries: [
      { src: './audio/weapon_hit_ethereal_1.mp3', volume: 0.48 },
      { src: './audio/weapon_hit_ethereal_2.mp3', volume: 0.48 },
    ],
    copiesPerEntry: 2,
    processAudioElement,
  });

  const weaponChargeStartSfx = createSequentialAudioPool({
    src: './audio/weapon_charge_start.mp3',
    volume: 0.35,
    poolSize: 2,
    processAudioElement,
  });

  const weaponChargeReleaseSfx = createSequentialAudioPool({
    src: './audio/weapon_charge_release.mp3',
    volume: 0.44,
    poolSize: SFX_POOL_SIZE,
    processAudioElement,
  });

  const weaponArcWaveSfx = createSequentialAudioPool({
    src: './audio/weapon_arc_wave.mp3',
    volume: 0.48,
    poolSize: 2,
    processAudioElement,
  });

  const staggerEnemySfx = createSequentialAudioPool({
    src: './audio/stagger_enemy.mp3',
    volume: 0.48,
    poolSize: 3,
    processAudioElement,
  });

  const tryStartMusicFromSfx = () => {
    if (!musicStarted.current && musicRef.current) {
      musicStarted.current = true;
      musicRef.current.play().catch(() => {});
    }
  };

  const FOOTSTEP_POOL_SIZE = 2;
  const walkFootstepSfx = createRandomAudioPool({
    entries: [1, 2, 3].map(variant => ({ src: `./audio/fs_${variant}_walk.mp3`, volume: 0.35 })),
    copiesPerEntry: FOOTSTEP_POOL_SIZE,
    processAudioElement,
    onPlaySuccess: tryStartMusicFromSfx,
    onPlayError: err => {
      console.error('Failed to play walk footstep:', err);
    },
  });

  const sprintFootstepSfx = createRandomAudioPool({
    entries: [1, 2, 3].map(variant => ({ src: `./audio/fs_${variant}_sprint.mp3`, volume: 0.46 })),
    copiesPerEntry: FOOTSTEP_POOL_SIZE,
    processAudioElement,
    onPlaySuccess: tryStartMusicFromSfx,
    onPlayError: err => {
      console.error('Failed to play sprint footstep:', err);
    },
  });

  const deathSfx = createSequentialAudioPool({
    src: './audio/mob_die.mp3',
    volume: 0.35,
    poolSize: 3,
    processAudioElement,
  });

  const SMALL_SFX_POOL = 2;
  const chestUnlockSfx = createSequentialAudioPool({
    src: './audio/chest_unlock.mp3',
    volume: 0.45,
    poolSize: SMALL_SFX_POOL,
    processAudioElement,
  });

  const itemGrabSfx = createSequentialAudioPool({
    src: './audio/item_grab.mp3',
    volume: 0.4,
    poolSize: SMALL_SFX_POOL,
    processAudioElement,
  });

  const goldPickupSfx = createSequentialAudioPool({
    src: './audio/gold_pickup.mp3',
    volume: 0.42,
    poolSize: SMALL_SFX_POOL,
    processAudioElement,
  });

  const essencePickupSfx = createSequentialAudioPool({
    src: './audio/essence_pickup.mp3',
    volume: 0.16,
    poolSize: SMALL_SFX_POOL,
    processAudioElement,
  });

  const grassPullSfx = createSequentialAudioPool({
    src: './audio/grass_pull.mp3',
    volume: 0.42,
    poolSize: SMALL_SFX_POOL,
    processAudioElement,
  });

  const grassChewSfx = createSequentialAudioPool({
    src: './audio/grass_chew.mp3',
    volume: 0.44,
    poolSize: SMALL_SFX_POOL,
    processAudioElement,
  });

  const potionDrinkSfx = createSequentialAudioPool({
    src: './audio/potion_drink.mp3',
    volume: 0.45,
    poolSize: SMALL_SFX_POOL,
    processAudioElement,
  });

  const blockSfx = createSequentialAudioPool({
    src: './audio/block.mp3',
    volume: 0.5,
    poolSize: SMALL_SFX_POOL,
    processAudioElement,
  });

  const parrySuccessSfx = createSequentialAudioPool({
    src: './audio/parry_success.mp3',
    volume: 0.58,
    poolSize: SMALL_SFX_POOL,
    processAudioElement,
  });

  const parryProjectileSfx = createSequentialAudioPool({
    src: './audio/parry_projectile.mp3',
    volume: 0.52,
    poolSize: SMALL_SFX_POOL,
    processAudioElement,
  });

  const guardBreakSfx = createSequentialAudioPool({
    src: './audio/guard_break.mp3',
    volume: 0.58,
    poolSize: SMALL_SFX_POOL,
    processAudioElement,
  });

  const playerHitSfx = createSequentialAudioPool({
    src: './audio/player_hit.mp3',
    volume: 0.42,
    poolSize: SMALL_SFX_POOL,
    processAudioElement,
  });

  const autoWarpLoopSfx = createLoopingAudio('./audio/auto_warp.mp3', 0.46, 1);

  const portalWarpSfx = createSequentialAudioPool({
    src: './audio/portal_warp.mp3',
    volume: 0.12,
    poolSize: SMALL_SFX_POOL,
    processAudioElement,
  });

  const gameOverSfx = createSequentialAudioPool({
    src: './audio/game_over.mp3',
    volume: 0.5,
    poolSize: 2,
    processAudioElement,
  });

  const bonfireKindleSfx = createSequentialAudioPool({
    src: './audio/fire_kindle.mp3',
    volume: 0.62,
    poolSize: SMALL_SFX_POOL,
    processAudioElement,
  });

  const bonfireRestoreSfx = createSequentialAudioPool({
    src: './audio/fire_restore.mp3',
    volume: 0.58,
    poolSize: SMALL_SFX_POOL,
    processAudioElement,
  });

  const heroEventSfx = createSequentialAudioPool({
    src: './audio/hero_event.mp3',
    volume: 0.5,
    poolSize: SMALL_SFX_POOL,
    processAudioElement,
  });

  const gateShortcutSfx = createSequentialAudioPool({
    src: './audio/gate_shortcut.mp3',
    volume: 0.52,
    poolSize: SMALL_SFX_POOL,
    processAudioElement,
  });

  const leverPullSfx = createSequentialAudioPool({
    src: './audio/lever_pull.mp3',
    volume: 0.5,
    poolSize: SMALL_SFX_POOL,
    processAudioElement,
  });

  const gateOpenHeavySfx = createSequentialAudioPool({
    src: './audio/gate_open_heavy.mp3',
    volume: 0.54,
    poolSize: SMALL_SFX_POOL,
    processAudioElement,
  });

  const gateLockedHeavySfx = createSequentialAudioPool({
    src: './audio/gate_locked_heavy.mp3',
    volume: 0.48,
    poolSize: SMALL_SFX_POOL,
    processAudioElement,
  });

  const doorOpenWoodSfx = createSequentialAudioPool({
    src: './audio/door_open_wood.mp3',
    volume: 0.46,
    poolSize: SMALL_SFX_POOL,
    processAudioElement,
  });

  const doorCloseWoodSfx = createSequentialAudioPool({
    src: './audio/door_close_wood.mp3',
    volume: 0.42,
    poolSize: SMALL_SFX_POOL,
    processAudioElement,
  });

  const doorLockedSfx = createSequentialAudioPool({
    src: './audio/door_locked.mp3',
    volume: 0.46,
    poolSize: SMALL_SFX_POOL,
    processAudioElement,
  });

  const ladderClimbSfx = createRandomAudioPool({
    entries: [
      { src: './audio/ladder_climb_1.mp3', volume: 0.38 },
      { src: './audio/ladder_climb_2.mp3', volume: 0.38 },
    ],
    copiesPerEntry: SMALL_SFX_POOL,
    processAudioElement,
  });

  const heresyAltarHitSfx = createSequentialAudioPool({
    src: './audio/heresy_altar_hit.mp3',
    volume: 0.5,
    poolSize: SMALL_SFX_POOL,
    processAudioElement,
  });

  const heresyAltarBreakSfx = createSequentialAudioPool({
    src: './audio/heresy_altar_break.mp3',
    volume: 0.56,
    poolSize: SMALL_SFX_POOL,
    processAudioElement,
  });

  const ritualSummonStartSfx = createSequentialAudioPool({
    src: './audio/ritual_summon_start.mp3',
    volume: 0.55,
    poolSize: SMALL_SFX_POOL,
    processAudioElement,
  });

  const corruptionIdleLoopSfx = createLoopingAudio('./audio/corruption_idle_loop.mp3', 0.26, 1, 1200);

  const plantIdleSfx = createSequentialAudioPool({
    src: './audio/plant_idle.mp3',
    volume: 0.2,
    poolSize: SMALL_SFX_POOL,
    processAudioElement,
  });

  const plantLashSfx = createSequentialAudioPool({
    src: './audio/plant_lash.mp3',
    volume: 0.49,
    poolSize: SMALL_SFX_POOL,
    processAudioElement,
  });

  const hollowReaverAttackSfx = createSequentialAudioPool({
    src: './audio/hollow_reaver_attack.mp3',
    volume: 0.53,
    poolSize: SMALL_SFX_POOL,
    processAudioElement,
  });

  const projectileScytheCastSfx = createSequentialAudioPool({
    src: './audio/projectile_scythe_cast.mp3',
    volume: 0.44,
    poolSize: SMALL_SFX_POOL,
    processAudioElement,
  });

  const projectileScytheFlyLoopSfx = createLoopingAudio('./audio/projectile_scythe_fly.mp3', 0.24, 1, 140);

  const projectileScytheImpactSfx = createSequentialAudioPool({
    src: './audio/projectile_scythe_impact.mp3',
    volume: 0.48,
    poolSize: SMALL_SFX_POOL,
    processAudioElement,
  });

  const projectileShellCastSfx = createSequentialAudioPool({
    src: './audio/projectile_shell_cast.mp3',
    volume: 0.42,
    poolSize: SMALL_SFX_POOL,
    processAudioElement,
  });

  const projectileShellImpactSfx = createSequentialAudioPool({
    src: './audio/projectile_shell_impact.mp3',
    volume: 0.48,
    poolSize: SMALL_SFX_POOL,
    processAudioElement,
  });

  const projectileSpectralBladeCastSfx = createSequentialAudioPool({
    src: './audio/projectile_spectral_blade_cast.mp3',
    volume: 0.46,
    poolSize: SMALL_SFX_POOL,
    processAudioElement,
  });

  const projectileSpectralBladeFlyLoopSfx = createLoopingAudio('./audio/projectile_spectral_blade_fly.mp3', 0.22, 1, 140);

  const projectileSpectralBladeImpactSfx = createSequentialAudioPool({
    src: './audio/projectile_spectral_blade_impact.mp3',
    volume: 0.48,
    poolSize: SMALL_SFX_POOL,
    processAudioElement,
  });

  const projectileReflectSfx = createSequentialAudioPool({
    src: './audio/projectile_reflect.mp3',
    volume: 0.5,
    poolSize: SMALL_SFX_POOL,
    processAudioElement,
  });

  const hazardWarningPulseSfx = createSequentialAudioPool({
    src: './audio/hazard_warning_pulse.mp3',
    volume: 0.34,
    poolSize: SMALL_SFX_POOL,
    processAudioElement,
  });

  const hazardScytheFallSfx = createSequentialAudioPool({
    src: './audio/hazard_scythe_fall.mp3',
    volume: 0.47,
    poolSize: SMALL_SFX_POOL,
    processAudioElement,
  });

  const hazardScytheImpactSfx = createSequentialAudioPool({
    src: './audio/hazard_scythe_impact.mp3',
    volume: 0.55,
    poolSize: SMALL_SFX_POOL,
    processAudioElement,
  });

  const boulderRollLoopSfx = createLoopingAudio('./audio/boulder_roll_loop.mp3', 0.88, 1, 180);

  const boulderImpactSfx = createSequentialAudioPool({
    src: './audio/boulder_impact.mp3',
    volume: 0.92,
    poolSize: SMALL_SFX_POOL,
    processAudioElement,
  });

  const keyItemDiscoveredSfx = createSequentialAudioPool({
    src: './audio/key_item_discovered.mp3',
    volume: 0.5,
    poolSize: SMALL_SFX_POOL,
    processAudioElement,
  });

  const vendorPurchaseSfx = createSequentialAudioPool({
    src: './audio/vendor_purchase.mp3',
    volume: 0.42,
    poolSize: SMALL_SFX_POOL,
    processAudioElement,
  });

  const inventoryEquipSfx = createSequentialAudioPool({
    src: './audio/inventory_equip.mp3',
    volume: 0.42,
    poolSize: SMALL_SFX_POOL,
    processAudioElement,
  });

  const inventoryUnequipSfx = createSequentialAudioPool({
    src: './audio/inventory_unequip.mp3',
    volume: 0.4,
    poolSize: SMALL_SFX_POOL,
    processAudioElement,
  });

  const propBreakSfx = createRandomAudioPool({
    entries: [
      { src: './audio/prop_break_1.mp3', volume: 0.35 },
      { src: './audio/prop_break_2.mp3', volume: 0.35 },
    ],
    copiesPerEntry: SMALL_SFX_POOL,
    processAudioElement,
  });

  const tallGrassBreakSfx = createSequentialAudioPool({
    src: './audio/tall_grass_break.mp3',
    volume: 0.4,
    poolSize: SMALL_SFX_POOL,
    processAudioElement,
  });

  const outdoorsLoopSfx = createLoopingAudio('./audio/outdoors_loop.mp3', 0.043, 1, 1400, 20000, false);
  const stormLoopSfx = createLoopingAudio('./audio/storm_loop.mp3', 0.48);

  const thunderSfx = createRandomAudioPool({
    entries: [
      { src: './audio/thunder_1.mp3', volume: 0.24 },
      { src: './audio/thunder_2.mp3', volume: 0.24 },
    ],
    copiesPerEntry: SMALL_SFX_POOL,
    processAudioElement,
  });

  const dialogueAdvanceSfx = createSequentialAudioPool({
    src: './audio/dialog_loop.mp3',
    volume: 0.34,
    poolSize: SMALL_SFX_POOL,
    playbackRate: 1.35,
    processAudioElement,
  });

  const dialogueLoopSfx = createLoopingAudio('./audio/dialog_loop.mp3', 0.24, 1.35);

  const menuOpenSfx = createSequentialAudioPool({
    src: './audio/pause_open.mp3',
    volume: 0.64,
    poolSize: SMALL_SFX_POOL,
    processAudioElement,
  });

  const menuCloseSfx = createSequentialAudioPool({
    src: './audio/pause_close.mp3',
    volume: 0.58,
    poolSize: SMALL_SFX_POOL,
    processAudioElement,
  });

  const enemyAudio = createEnemyAudioDirector({
    processAudioElement,
    playFallbackDefeatSound: deathSfx.play,
  });

  if (import.meta.env.DEV) {
    const testAudio = () => {
      console.log('Testing audio...');
      if (walkFootstepSfx.pool.length > 0) {
        const testSfx = walkFootstepSfx.pool[0];
        console.log('Test audio ready state:', testSfx.readyState);
        console.log('Test audio src:', testSfx.src);
        testSfx.play().then(() => {
          console.log('Test audio played successfully');
        }).catch(err => {
          console.error('Test audio failed:', err);
        });
      } else {
        console.error('No audio in pool');
      }
    };

    (window as Window & { testAudio?: () => void }).testAudio = testAudio;
  }

  return {
    enemyAudio,
    playDodgeRoll: dodgeRollSfx.play,
    playSwordSwing: swordSwingSfx.play,
    playBossAttack: bossAttackTelegraphSfx.play,
    playBladeSheath: bladeSheathSfx.play,
    playFootstep: (isSprinting: boolean) => {
      if (isSprinting) {
        sprintFootstepSfx.play();
        return;
      }
      walkFootstepSfx.play();
    },
    playDeathSound: deathSfx.play,
    playChestUnlock: chestUnlockSfx.play,
    playItemGrab: itemGrabSfx.play,
    playGoldPickup: goldPickupSfx.play,
    playEssencePickup: essencePickupSfx.play,
    playGrassPull: grassPullSfx.play,
    playGrassChew: grassChewSfx.play,
    playPotionDrink: potionDrinkSfx.play,
    playBlock: blockSfx.play,
    playParrySuccess: parrySuccessSfx.play,
    playParryProjectile: parryProjectileSfx.play,
    playGuardBreak: guardBreakSfx.play,
    playPlayerHit: playerHitSfx.play,
    playWeaponHitFlesh: weaponHitFleshSfx.play,
    playWeaponHitBone: weaponHitBoneSfx.play,
    playWeaponHitStone: weaponHitStoneSfx.play,
    playWeaponHitPlant: weaponHitPlantSfx.play,
    playWeaponHitEthereal: weaponHitEtherealSfx.play,
    playWeaponChargeStart: weaponChargeStartSfx.play,
    playWeaponChargeRelease: weaponChargeReleaseSfx.play,
    playWeaponArcWave: weaponArcWaveSfx.play,
    playStaggerEnemy: staggerEnemySfx.play,
    startPortalChargeLoop: autoWarpLoopSfx.play,
    stopPortalChargeLoop: autoWarpLoopSfx.stop,
    playPortalWarp: portalWarpSfx.play,
    playGameOverSound: gameOverSfx.play,
    playBonfireKindle: bonfireKindleSfx.play,
    playBonfireRestore: bonfireRestoreSfx.play,
    playHeroEvent: heroEventSfx.play,
    playGateShortcut: gateShortcutSfx.play,
    playLeverPull: leverPullSfx.play,
    playGateOpenHeavy: gateOpenHeavySfx.play,
    playGateLockedHeavy: gateLockedHeavySfx.play,
    playDoorOpenWood: doorOpenWoodSfx.play,
    playDoorCloseWood: doorCloseWoodSfx.play,
    playDoorLocked: doorLockedSfx.play,
    playLadderClimb: ladderClimbSfx.play,
    playHeresyAltarHit: heresyAltarHitSfx.play,
    playHeresyAltarBreak: heresyAltarBreakSfx.play,
    playRitualSummonStart: ritualSummonStartSfx.play,
    playPlantIdle: plantIdleSfx.play,
    playPlantLash: plantLashSfx.play,
    playHollowReaverAttack: hollowReaverAttackSfx.play,
    playProjectileCast: (sprite: string) => {
      if (sprite === 'projectile_shell') {
        projectileShellCastSfx.play();
        return;
      }
      if (sprite === 'projectile_spectral_blade') {
        projectileSpectralBladeCastSfx.play();
        return;
      }
      if (sprite === 'projectile_scythe') {
        projectileScytheCastSfx.play();
      }
    },
    startProjectileFly: (sprite: string) => {
      if (sprite === 'projectile_scythe') projectileScytheFlyLoopSfx.play();
      if (sprite === 'projectile_spectral_blade') projectileSpectralBladeFlyLoopSfx.play();
    },
    stopProjectileFly: (sprite: string) => {
      if (sprite === 'projectile_scythe') projectileScytheFlyLoopSfx.stop();
      if (sprite === 'projectile_spectral_blade') projectileSpectralBladeFlyLoopSfx.stop();
    },
    playProjectileImpact: (sprite: string) => {
      if (sprite === 'projectile_shell') {
        projectileShellImpactSfx.play();
        return;
      }
      if (sprite === 'projectile_spectral_blade') {
        projectileSpectralBladeImpactSfx.play();
        return;
      }
      if (sprite === 'projectile_scythe') {
        projectileScytheImpactSfx.play();
      }
    },
    playProjectileReflect: projectileReflectSfx.play,
    playHazardWarningPulse: hazardWarningPulseSfx.play,
    playHazardScytheFall: hazardScytheFallSfx.play,
    playHazardScytheImpact: hazardScytheImpactSfx.play,
    startBoulderRollLoop: boulderRollLoopSfx.play,
    stopBoulderRollLoop: boulderRollLoopSfx.stop,
    playBoulderImpact: boulderImpactSfx.play,
    playKeyItemDiscovered: keyItemDiscoveredSfx.play,
    playVendorPurchase: vendorPurchaseSfx.play,
    playInventoryEquip: inventoryEquipSfx.play,
    playInventoryUnequip: inventoryUnequipSfx.play,
    playDialogueAdvance: dialogueAdvanceSfx.play,
    startDialogueLoop: dialogueLoopSfx.play,
    stopDialogueLoop: dialogueLoopSfx.stop,
    playMenuOpen: menuOpenSfx.play,
    playMenuClose: menuCloseSfx.play,
    playPropBreak: propBreakSfx.play,
    playTallGrassBreak: tallGrassBreakSfx.play,
    startStormLoop: stormLoopSfx.play,
    stopStormLoop: stormLoopSfx.stop,
    playThunder: thunderSfx.play,
    setOutdoorsLoopState: (volumeScale: number, lowpassFrequencyHz: number) => {
      outdoorsLoopSfx.setLowpassFrequency(lowpassFrequencyHz);
      outdoorsLoopSfx.setVolumeScale(volumeScale);
    },
    startCorruptionIdleLoop: corruptionIdleLoopSfx.play,
    stopCorruptionIdleLoop: corruptionIdleLoopSfx.stop,
    setCorruptionIdleLoopIntensity: corruptionIdleLoopSfx.setVolumeScale,
  };
}
