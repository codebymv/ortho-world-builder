import type { MutableRefObject } from 'react';
import type { Enemy } from '@/lib/game/Combat';
import {
  applyElementMute,
  applyMasterGainMute,
} from '@/game/domain/audioMutePreference';

const MASTER_COMPRESSOR_THRESHOLD_DB = -30;
const MASTER_COMPRESSOR_KNEE_DB = 24;
const MASTER_COMPRESSOR_RATIO = 8;
const MASTER_COMPRESSOR_ATTACK_SEC = 0.005;
const MASTER_COMPRESSOR_RELEASE_SEC = 0.18;
const MASTER_POST_COMPRESSOR_GAIN = 1.25;
const AUDIO_DEBUG_WINDOW_KEY = '__ORTHO_AUDIO_DEBUG';
const LOOP_INTENSITY_LOG_INTERVAL_MS = 900;
const FOOTSTEP_LOG_INTERVAL_MS = 300;
const audioLowpassRequests = new WeakMap<HTMLAudioElement, number>();
const audioLowpassNodes = new WeakMap<HTMLAudioElement, BiquadFilterNode>();
const audioLogLastAt = new Map<string, number>();

function getAudioLogIntervalMs(event: string, label: string): number {
  if (event === 'loop:intensity') return LOOP_INTENSITY_LOG_INTERVAL_MS;
  if (event === 'sfx' && /(^|\/)fs_\d+_(walk|sprint)\.mp3$/i.test(label)) {
    return FOOTSTEP_LOG_INTERVAL_MS;
  }
  return 0;
}

export function logAudioEvent(event: string, label: string, detail?: Record<string, unknown>) {
  if (!import.meta.env.DEV || typeof window === 'undefined') return;
  const debugFlag = (window as Window & Record<string, unknown>)[AUDIO_DEBUG_WINDOW_KEY];
  if (debugFlag === false) return;

  const intervalMs = getAudioLogIntervalMs(event, label);
  if (intervalMs > 0) {
    const key = `${event}:${label}`;
    const now = performance.now();
    const last = audioLogLastAt.get(key) ?? 0;
    if (now - last < intervalMs) return;
    audioLogLastAt.set(key, now);
  }

  const time = new Date().toLocaleTimeString();
  if (detail) {
    console.log(`[Audio ${time}] ${event}: ${label}`, detail);
    return;
  }
  console.log(`[Audio ${time}] ${event}: ${label}`);
}

export function setAudioElementLowpass(audio: HTMLAudioElement, frequencyHz: number): void {
  const clampedFrequency = Math.max(20, Math.min(22050, frequencyHz));
  audioLowpassRequests.set(audio, clampedFrequency);
  const filter = audioLowpassNodes.get(audio);
  if (!filter) return;

  const context = filter.context;
  const safeFrequency = Math.min(clampedFrequency, context.sampleRate / 2);
  const now = context.currentTime;
  filter.frequency.cancelScheduledValues(now);
  filter.frequency.setTargetAtTime(safeFrequency, now, 0.08);
}

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
      refs.compressorRef.current.threshold.value = MASTER_COMPRESSOR_THRESHOLD_DB;
      refs.compressorRef.current.knee.value = MASTER_COMPRESSOR_KNEE_DB;
      refs.compressorRef.current.ratio.value = MASTER_COMPRESSOR_RATIO;
      refs.compressorRef.current.attack.value = MASTER_COMPRESSOR_ATTACK_SEC;
      refs.compressorRef.current.release.value = MASTER_COMPRESSOR_RELEASE_SEC;

      refs.gainNodeRef.current = refs.audioContextRef.current.createGain();
      refs.gainNodeRef.current.gain.value = MASTER_POST_COMPRESSOR_GAIN;

      refs.masterGainRef.current = refs.audioContextRef.current.createGain();
      applyMasterGainMute(refs.masterGainRef.current);

      refs.compressorRef.current.connect(refs.gainNodeRef.current);
      refs.gainNodeRef.current.connect(refs.masterGainRef.current);
      refs.masterGainRef.current.connect(refs.audioContextRef.current.destination);
    }

    return refs.audioContextRef.current;
  };

  // All non-looping SFX elements registered here get played+paused at volume=0
  // after the first AudioContext resume, forcing the browser to pre-decode the
  // MP3 data. Without this, each sound pays a 5-50ms decode penalty on first play.
  const prewarmQueue: HTMLAudioElement[] = [];
  let hasPrewarmed = false;

  const prewarmRegistered = () => {
    if (hasPrewarmed) return;
    hasPrewarmed = true;
    for (const audio of prewarmQueue) {
      const vol = audio.volume;
      audio.volume = 0;
      audio.play()
        .then(() => {
          audio.pause();
          audio.currentTime = 0;
          audio.volume = vol;
        })
        .catch(() => {
          audio.volume = vol;
        });
    }
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
    applyMasterGainMute(refs.masterGainRef.current);
    prewarmRegistered();
    return context;
  };

  const processAudioElement = (audio: HTMLAudioElement) => {
    // Register non-looping SFX for pre-warming (music loops are excluded).
    if (!audio.loop) prewarmQueue.push(audio);

    if (refs.audioSourcesConnectedRef.current.has(audio)) return;

    const context = initializeAudioContext();
    if (!context || !refs.compressorRef.current) return;

    const source = context.createMediaElementSource(audio);
    refs.audioSourcesConnectedRef.current.add(audio);
    const lowpassFrequency = audioLowpassRequests.get(audio);
    if (lowpassFrequency) {
      const lowpass = context.createBiquadFilter();
      lowpass.type = 'lowpass';
      lowpass.frequency.value = Math.min(lowpassFrequency, context.sampleRate / 2);
      lowpass.Q.value = 0.7;
      audioLowpassNodes.set(audio, lowpass);
      source.connect(lowpass);
      lowpass.connect(refs.compressorRef.current);
      return source;
    }

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

const MAP_MUSIC_VOLUME = 0.08;
const MUSIC_FADE_MS = 1200;
const clampVolume = (value: number) => Math.max(0, Math.min(1, value));

export function createMusicDirector(context: MusicDirectorContext) {
  let fadeFrame: number | null = null;
  let activeFadeFromAudio: HTMLAudioElement | null = null;
  let activeFadeToAudio: HTMLAudioElement | null = null;
  let fadeGeneration = 0;

  const cancelFade = () => {
    fadeGeneration++;
    if (fadeFrame !== null) {
      cancelAnimationFrame(fadeFrame);
      fadeFrame = null;
    }
    if (activeFadeFromAudio && activeFadeFromAudio !== context.musicRef.current) {
      activeFadeFromAudio.pause();
      activeFadeFromAudio.src = '';
    }
    if (activeFadeToAudio && activeFadeToAudio !== context.musicRef.current) {
      activeFadeToAudio.pause();
      activeFadeToAudio.src = '';
    }
    activeFadeFromAudio = null;
    activeFadeToAudio = null;
  };

  const equalPowerCrossfade = (fromAudio: HTMLAudioElement, toTrack: string) => {
    cancelFade();
    const fadeId = fadeGeneration;
    const wasMuted = fromAudio.muted;
    const toAudio = new Audio(toTrack);
    toAudio.loop = true;
    toAudio.preload = 'auto';
    toAudio.volume = 0;
    toAudio.muted = wasMuted;
    context.processAudioElement(toAudio);
    logAudioEvent('music:crossfade', toTrack, { from: fromAudio.src });
    activeFadeFromAudio = fromAudio;
    activeFadeToAudio = toAudio;

    const restoreFromAudio = () => {
      cancelFade();
      fromAudio.volume = MAP_MUSIC_VOLUME;
      fromAudio.muted = wasMuted;
      context.musicRef.current = fromAudio;
      if (import.meta.env.DEV) {
        console.warn(`[Music] Failed to start track: ${toTrack}`);
      }
    };

    toAudio.play().then(() => {
      if (fadeId !== fadeGeneration) {
        if (toAudio !== context.musicRef.current) {
          toAudio.pause();
          toAudio.src = '';
        }
        return;
      }
      context.musicRef.current = toAudio;
      const startTime = performance.now();
      const step = (now: number) => {
        if (fadeId !== fadeGeneration) return;
        const t = Math.min(1, (now - startTime) / MUSIC_FADE_MS);
        const theta = t * Math.PI * 0.5;
        fromAudio.volume = clampVolume(Math.cos(theta) * MAP_MUSIC_VOLUME);
        toAudio.volume = clampVolume(Math.sin(theta) * MAP_MUSIC_VOLUME);
        if (t < 1) {
          fadeFrame = requestAnimationFrame(step);
          return;
        }
        fadeFrame = null;
        fromAudio.pause();
        fromAudio.src = '';
        toAudio.volume = MAP_MUSIC_VOLUME;
        activeFadeFromAudio = null;
        activeFadeToAudio = null;
      };
      fadeFrame = requestAnimationFrame(step);
    }).catch(() => {
      restoreFromAudio();
    });
  };

  const switchTrack = (mapId: string) => {
    const track = context.resolveTrack(mapId);
    if (context.currentTrackRef.current === track) return;

    context.currentTrackRef.current = track;
    logAudioEvent('music:switch', track, { key: mapId });
    const audio = context.musicRef.current;
    if (!audio) return;

    if (context.musicStartedRef.current && !audio.paused) {
      equalPowerCrossfade(audio, track);
      return;
    }
    const wasMuted = audio.muted;
    audio.pause();
    audio.src = track;
    audio.loop = true;
    audio.volume = MAP_MUSIC_VOLUME;
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
    audio.volume = MAP_MUSIC_VOLUME;
    applyElementMute(audio);
    context.processAudioElement(audio);
    context.musicRef.current = audio;
    context.currentTrackRef.current = startTrack;
    logAudioEvent('music:init', startTrack, { key: initialMapId });
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
    cancelFade();
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
  label?: string;
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
    logAudioEvent('sfx', config.label ?? config.src, {
      src: config.src,
      volume: config.volume,
      poolIndex: (index - 1) % pool.length,
    });
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
  label?: string;
}

interface RandomAudioPoolConfig {
  entries: RandomAudioPoolEntry[];
  copiesPerEntry: number;
  processAudioElement: (audio: HTMLAudioElement) => void;
  onPlaySuccess?: () => void;
  onPlayError?: (error: unknown) => void;
  label?: string;
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
    // Prefer an element that isn't currently playing to avoid cutting a clip short.
    const idle = pool.filter(a => a.paused);
    const audio = idle.length > 0
      ? idle[Math.floor(Math.random() * idle.length)]
      : pool[Math.floor(Math.random() * pool.length)];
    audio.currentTime = 0;
    logAudioEvent('sfx', config.label ?? audio.src.split('/').pop() ?? 'random-pool', {
      src: audio.src,
      volume: audio.volume,
      idleAvailable: idle.length,
    });
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

type EnemyAudioType =
  | 'skeleton'
  | 'slime'
  | 'wolf'
  | 'shadow'
  | 'spider'
  | 'plant'
  | 'golem'
  | 'stone_sentinel'
  | 'hollow_reaver'
  | 'ridge_revenant';

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
    shadow: createSequentialAudioPool({
      src: './audio/reaper_defeat.mp3',
      volume: 0.44,
      poolSize: 2,
      processAudioElement: config.processAudioElement,
    }),
    spider: createSequentialAudioPool({
      src: './audio/spider_defeat.mp3',
      volume: 0.44,
      poolSize: 2,
      processAudioElement: config.processAudioElement,
    }),
    plant: createSequentialAudioPool({
      src: './audio/plant_defeat.mp3',
      volume: 0.42,
      poolSize: 2,
      processAudioElement: config.processAudioElement,
    }),
    golem: createSequentialAudioPool({
      src: './audio/golem_defeat.mp3',
      volume: 0.54,
      poolSize: 2,
      processAudioElement: config.processAudioElement,
    }),
    stone_sentinel: createSequentialAudioPool({
      src: './audio/stone_sentinel_defeat.mp3',
      volume: 0.54,
      poolSize: 2,
      processAudioElement: config.processAudioElement,
    }),
    hollow_reaver: createSequentialAudioPool({
      src: './audio/hollow_reaver_defeat.mp3',
      volume: 0.52,
      poolSize: 2,
      processAudioElement: config.processAudioElement,
    }),
    ridge_revenant: createSequentialAudioPool({
      src: './audio/ridge_revenant_defeat.mp3',
      volume: 0.52,
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
    shadow: createSequentialAudioPool({
      src: './audio/reaper_walk.mp3',
      volume: 0.36,
      poolSize: 2,
      processAudioElement: config.processAudioElement,
    }),
    spider: createSequentialAudioPool({
      src: './audio/spider_walk.mp3',
      volume: 0.22,
      poolSize: 2,
      processAudioElement: config.processAudioElement,
    }),
    plant: createSequentialAudioPool({
      src: './audio/plant_walk.mp3',
      volume: 0.2,
      poolSize: 2,
      processAudioElement: config.processAudioElement,
    }),
    golem: createSequentialAudioPool({
      src: './audio/golem_walk.mp3',
      volume: 0.38,
      poolSize: 2,
      processAudioElement: config.processAudioElement,
    }),
    stone_sentinel: createSequentialAudioPool({
      src: './audio/stone_sentinel_walk.mp3',
      volume: 0.38,
      poolSize: 2,
      processAudioElement: config.processAudioElement,
    }),
    hollow_reaver: createSequentialAudioPool({
      src: './audio/hollow_reaver_walk.mp3',
      volume: 0.36,
      poolSize: 2,
      processAudioElement: config.processAudioElement,
    }),
    ridge_revenant: createSequentialAudioPool({
      src: './audio/ridge_revenant_walk.mp3',
      volume: 0.38,
      poolSize: 2,
      processAudioElement: config.processAudioElement,
    }),
  };

  const getEnemyAudioType = (enemy: Enemy): EnemyAudioType | null => {
    const type = enemy.sprite.replace('enemy_', '') as EnemyAudioType | string;
    if (type === 'water_slime') return 'slime';
    if (
      type === 'skeleton' ||
      type === 'slime' ||
      type === 'wolf' ||
      type === 'shadow' ||
      type === 'spider' ||
      type === 'plant' ||
      type === 'golem' ||
      type === 'stone_sentinel' ||
      type === 'hollow_reaver' ||
      type === 'ridge_revenant'
    ) return type;
    if (type === 'skeleton_captain') return 'skeleton';
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
      type === 'shadow' ? 1.20 :
      type === 'spider' ? 0.58 :
      type === 'plant' ? 0.95 :
      type === 'golem' ? 1.08 :
      type === 'stone_sentinel' ? 0.96 :
      type === 'hollow_reaver' ? 0.78 :
      type === 'ridge_revenant' ? 1.18 :
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
