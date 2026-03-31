import type { MutableRefObject } from 'react';
import type { Enemy } from '@/lib/game/Combat';

interface AudioProcessorRefs {
  audioContextRef: MutableRefObject<AudioContext | null>;
  compressorRef: MutableRefObject<DynamicsCompressorNode | null>;
  gainNodeRef: MutableRefObject<GainNode | null>;
  masterGainRef: MutableRefObject<GainNode | null>;
  audioSourcesConnectedRef: MutableRefObject<Set<HTMLAudioElement>>;
}

export function createAudioProcessor(refs: AudioProcessorRefs) {
  const initializeAudioContext = () => {
    if (!refs.audioContextRef.current) {
      refs.audioContextRef.current = new (window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext)();

      refs.compressorRef.current = refs.audioContextRef.current.createDynamicsCompressor();
      refs.compressorRef.current.threshold.value = -24;
      refs.compressorRef.current.knee.value = 30;
      refs.compressorRef.current.ratio.value = 12;
      refs.compressorRef.current.attack.value = 0.003;
      refs.compressorRef.current.release.value = 0.25;

      refs.gainNodeRef.current = refs.audioContextRef.current.createGain();
      refs.gainNodeRef.current.gain.value = 1.4;

      refs.masterGainRef.current = refs.audioContextRef.current.createGain();
      refs.masterGainRef.current.gain.value = 0.85;

      refs.compressorRef.current.connect(refs.gainNodeRef.current);
      refs.gainNodeRef.current.connect(refs.masterGainRef.current);
      refs.masterGainRef.current.connect(refs.audioContextRef.current.destination);
    }

    return refs.audioContextRef.current;
  };

  const resumeAudioContext = async () => {
    const context = initializeAudioContext();
    if (context?.state === 'suspended') {
      try {
        await context.resume();
      } catch {
        // Ignore autoplay-policy resume failures and try again on the next user gesture.
      }
    }
    return context;
  };

  const processAudioElement = (audio: HTMLAudioElement) => {
    if (refs.audioSourcesConnectedRef.current.has(audio)) return;

    const context = initializeAudioContext();
    if (!context || !refs.compressorRef.current) return;

    const source = context.createMediaElementSource(audio);
    refs.audioSourcesConnectedRef.current.add(audio);
    source.connect(refs.compressorRef.current);
    return source;
  };

  const cleanup = () => {
    if (refs.audioContextRef.current) {
      refs.audioContextRef.current.close();
      refs.audioContextRef.current = null;
    }
    refs.audioSourcesConnectedRef.current.clear();
  };

  return {
    initializeAudioContext,
    resumeAudioContext,
    processAudioElement,
    cleanup,
  };
}

interface MusicDirectorContext {
  musicRef: MutableRefObject<HTMLAudioElement | null>;
  musicStartedRef: MutableRefObject<boolean>;
  currentTrackRef: MutableRefObject<string>;
  processAudioElement: (audio: HTMLAudioElement) => void;
  resolveTrack: (mapId: string) => string;
}

export function createMusicDirector(context: MusicDirectorContext) {
  const switchTrack = (mapId: string) => {
    const track = context.resolveTrack(mapId);
    if (context.currentTrackRef.current === track) return;

    context.currentTrackRef.current = track;
    const audio = context.musicRef.current;
    if (!audio) return;

    const wasMuted = audio.muted;
    audio.pause();
    audio.src = track;
    audio.loop = true;
    audio.volume = 0.15;
    audio.muted = wasMuted;
    context.processAudioElement(audio);

    if (context.musicStartedRef.current) {
      audio.play().catch(() => {});
    }
  };

  const initializeMusic = (initialMapId: string) => {
    const startTrack = context.resolveTrack(initialMapId);
    const audio = new Audio(startTrack);
    audio.loop = true;
    audio.volume = 0.15;
    context.processAudioElement(audio);
    context.musicRef.current = audio;
    context.currentTrackRef.current = startTrack;
    return audio;
  };

  const tryPlay = () => {
    const audio = context.musicRef.current;
    if (audio?.paused) {
      audio.play().catch(() => {});
    }
  };

  const markStartedAndPlay = () => {
    context.musicStartedRef.current = true;
    tryPlay();
  };

  const disposeMusic = () => {
    if (context.musicRef.current) {
      context.musicRef.current.pause();
      context.musicRef.current = null;
    }
  };

  return {
    switchTrack,
    initializeMusic,
    tryPlay,
    markStartedAndPlay,
    disposeMusic,
  };
}

interface SequentialAudioPoolConfig {
  src: string;
  volume: number;
  poolSize: number;
  processAudioElement: (audio: HTMLAudioElement) => void;
  playbackRate?: number;
}

export function createSequentialAudioPool(config: SequentialAudioPoolConfig) {
  const pool: HTMLAudioElement[] = [];
  for (let i = 0; i < config.poolSize; i++) {
    const audio = new Audio(config.src);
    audio.volume = config.volume;
    audio.playbackRate = config.playbackRate ?? 1;
    config.processAudioElement(audio);
    pool.push(audio);
  }

  let index = 0;

  const play = () => {
    const audio = pool[index % pool.length];
    index += 1;
    audio.currentTime = 0;
    audio.playbackRate = config.playbackRate ?? 1;
    audio.play().catch(() => {});
  };

  return {
    pool,
    play,
  };
}

interface RandomAudioPoolEntry {
  src: string;
  volume: number;
}

interface RandomAudioPoolConfig {
  entries: RandomAudioPoolEntry[];
  copiesPerEntry: number;
  processAudioElement: (audio: HTMLAudioElement) => void;
  onPlaySuccess?: () => void;
  onPlayError?: (error: unknown) => void;
}

export function createRandomAudioPool(config: RandomAudioPoolConfig) {
  const pool: HTMLAudioElement[] = [];

  for (const entry of config.entries) {
    for (let i = 0; i < config.copiesPerEntry; i++) {
      const audio = new Audio(entry.src);
      audio.volume = entry.volume;
      config.processAudioElement(audio);
      pool.push(audio);
    }
  }

  const play = () => {
    if (pool.length === 0) return;
    const audio = pool[Math.floor(Math.random() * pool.length)];
    audio.currentTime = 0;
    audio.play()
      .then(() => {
        config.onPlaySuccess?.();
      })
      .catch(error => {
        config.onPlayError?.(error);
      });
  };

  return {
    pool,
    play,
  };
}

const ENEMY_AUDIO_TYPES = ['skeleton', 'slime', 'wolf'] as const;
type EnemyAudioType = typeof ENEMY_AUDIO_TYPES[number];

interface EnemyAudioDirectorConfig {
  processAudioElement: (audio: HTMLAudioElement) => void;
  playFallbackDefeatSound: () => void;
}

export function createEnemyAudioDirector(config: EnemyAudioDirectorConfig) {
  const walkCooldowns = new Map<string, number>();
  const defeatPools: Record<EnemyAudioType, ReturnType<typeof createSequentialAudioPool>> = {
    skeleton: createSequentialAudioPool({
      src: './audio/skeleton_defeat.mp3',
      volume: 0.42,
      poolSize: 2,
      processAudioElement: config.processAudioElement,
    }),
    slime: createSequentialAudioPool({
      src: './audio/slime_defeat.mp3',
      volume: 0.38,
      poolSize: 2,
      processAudioElement: config.processAudioElement,
    }),
    wolf: createSequentialAudioPool({
      src: './audio/wolf_defeat.mp3',
      volume: 0.46,
      poolSize: 2,
      processAudioElement: config.processAudioElement,
    }),
  };
  const walkPools: Record<EnemyAudioType, ReturnType<typeof createSequentialAudioPool>> = {
    skeleton: createSequentialAudioPool({
      src: './audio/skeleton_walk.mp3',
      volume: 0.24,
      poolSize: 2,
      processAudioElement: config.processAudioElement,
    }),
    slime: createSequentialAudioPool({
      src: './audio/slime_walk.mp3',
      volume: 0.18,
      poolSize: 2,
      processAudioElement: config.processAudioElement,
    }),
    wolf: createSequentialAudioPool({
      src: './audio/wolf_walk.mp3',
      volume: 0.28,
      poolSize: 2,
      processAudioElement: config.processAudioElement,
    }),
  };

  const getEnemyAudioType = (enemy: Enemy): EnemyAudioType | null => {
    const type = enemy.sprite.replace('enemy_', '') as EnemyAudioType | string;
    if (type === 'skeleton' || type === 'slime' || type === 'wolf') return type;
    return null;
  };

  const playDefeat = (enemy: Enemy) => {
    const type = getEnemyAudioType(enemy);
    if (!type) {
      config.playFallbackDefeatSound();
      return;
    }
    defeatPools[type].play();
  };

  const maybePlayWalk = (
    enemy: Enemy,
    nowSeconds: number,
    playerPosition: { x: number; y: number },
  ) => {
    const type = getEnemyAudioType(enemy);
    if (!type) return;

    const nextAllowed = walkCooldowns.get(enemy.id) ?? 0;
    if (nowSeconds < nextAllowed) return;

    const dx = enemy.position.x - playerPosition.x;
    const dy = enemy.position.y - playerPosition.y;
    const distSq = dx * dx + dy * dy;
    if (distSq > 36) return;

    const speedSq = enemy.velocity.x * enemy.velocity.x + enemy.velocity.y * enemy.velocity.y;
    const isMoving = enemy.moveBlend > 0.3 || speedSq > 0.0025;
    if (!isMoving) return;
    if (enemy.state !== 'chasing' && enemy.moveBlend < 0.45) return;

    walkPools[type].play();

    const baseInterval =
      type === 'wolf' ? 0.52 :
      type === 'skeleton' ? 0.64 :
      0.78;
    walkCooldowns.set(enemy.id, nowSeconds + baseInterval + Math.random() * 0.18);
  };

  const clearEnemy = (enemyId: string) => {
    walkCooldowns.delete(enemyId);
  };

  return {
    playDefeat,
    maybePlayWalk,
    clearEnemy,
  };
}
