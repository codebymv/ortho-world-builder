import type { MutableRefObject } from 'react';
import {
  createEnemyAudioDirector,
  createRandomAudioPool,
  createSequentialAudioPool,
} from '@/game/domain/AudioDirector';

interface CreateRuntimeSfxOptions {
  processAudioElement: (audio: HTMLAudioElement) => void;
  musicRef: MutableRefObject<HTMLAudioElement | null>;
  musicStarted: MutableRefObject<boolean>;
}

export function createRuntimeSfx({
  processAudioElement,
  musicRef,
  musicStarted,
}: CreateRuntimeSfxOptions) {
  const dodgeRollSfx = createSequentialAudioPool({
    src: './audio/dodge_roll.mp3',
    volume: 0.38,
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

  const bladeSheathSfx = createSequentialAudioPool({
    src: './audio/blade_sheath.mp3',
    volume: 0.2,
    poolSize: SFX_POOL_SIZE,
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
    entries: [1, 2, 3].map(variant => ({ src: `./audio/fs_${variant}_walk.mp3`, volume: 0.3 })),
    copiesPerEntry: FOOTSTEP_POOL_SIZE,
    processAudioElement,
    onPlaySuccess: tryStartMusicFromSfx,
    onPlayError: err => {
      console.error('Failed to play walk footstep:', err);
    },
  });

  const sprintFootstepSfx = createRandomAudioPool({
    entries: [1, 2, 3].map(variant => ({ src: `./audio/fs_${variant}_sprint.mp3`, volume: 0.4 })),
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

  const gameOverSfx = createSequentialAudioPool({
    src: './audio/game_over.mp3',
    volume: 0.5,
    poolSize: 2,
    processAudioElement,
  });

  const bonfireKindleSfx = createSequentialAudioPool({
    src: './audio/fire_kindle.mp3',
    volume: 0.55,
    poolSize: SMALL_SFX_POOL,
    processAudioElement,
  });

  const bonfireRestoreSfx = createSequentialAudioPool({
    src: './audio/fire_restore.mp3',
    volume: 0.5,
    poolSize: SMALL_SFX_POOL,
    processAudioElement,
  });

  const enemyAudio = createEnemyAudioDirector({
    processAudioElement,
    playFallbackDefeatSound: deathSfx.play,
  });

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

  return {
    enemyAudio,
    playDodgeRoll: dodgeRollSfx.play,
    playSwordSwing: swordSwingSfx.play,
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
    playGameOverSound: gameOverSfx.play,
    playBonfireKindle: bonfireKindleSfx.play,
    playBonfireRestore: bonfireRestoreSfx.play,
  };
}
