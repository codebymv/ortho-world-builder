import * as THREE from 'three';
import { updateNpcDialogueProjection } from '@/game/runtime/NpcBehaviorSystem';
import type { RuntimeLoopTailContext } from '@/game/runtime/RuntimePhaseContexts';
import type { PerfProfiler } from '@/game/runtime/PerfProfiler';

const CAMP_SMOKE_REFRESH_MS = 900;
// Y thresholds for the forest hollow-region music + corruption-filter
// transition. Exported so `useGameMusic` can pick the correct initial track
// on page load — without that, refreshing in the hollow starts wood_theme and
// immediately crossfades to guilrhym_theme, briefly playing both songs at once.
//
// The ENTER point is the midpoint of the bridge crossing into the hollow side
// (world y = -61). EXIT sits a few tiles north to provide hysteresis so a
// player skirting the boundary doesn't flicker the filter / music.
export const HOLLOW_MUSIC_ENTER_Y = -61;
export const HOLLOW_MUSIC_EXIT_Y = -55;

const CORRUPTION_LOOP_RAMP_START_Y = 100;
const CORRUPTION_LOOP_GROVE_Y = 4;
const CORRUPTION_LOOP_GROVE_SCALE = 0.11;
const CORRUPTION_LOOP_BRIDGE_APPROACH_SCALE = 0.38;
const CORRUPTION_LOOP_SILENCE_EPSILON = 0.01;
const CORRUPTION_LOOP_BUILD_TAU_SEC = 1.65;
const CORRUPTION_LOOP_HOLLOW_SWELL_TAU_SEC = 0.42;
const CORRUPTION_LOOP_FADE_OUT_TAU_SEC = 0.95;
const OUTDOORS_LOOP_OUTSIDE_SCALE = 1;
const OUTDOORS_LOOP_INSIDE_SCALE = 0.45;
const OUTDOORS_LOOP_STORM_DUCK_SCALE = 0.125;
const OUTDOORS_LOOP_OPEN_LOWPASS_HZ = 20000;
const OUTDOORS_LOOP_CLOSED_DOOR_LOWPASS_HZ = 1000;

// `null` until the first frame establishes the region from the actual player
// position. Avoids the spurious "switch from woods → hollow" crossfade on
// refresh-into-hollow when the track was already initialized correctly.
let forestMusicRegion: 'woods' | 'hollow' | null = null;
let corruptionLoopIntensity = 0;

let campSmokeCache: {
  mapId: string;
  mapRevision: number;
  tileX: number;
  tileY: number;
  refreshedAt: number;
  sources: Array<{ x: number; y: number }>;
} | null = null;

export interface RunRuntimeLoopTailOptions extends RuntimeLoopTailContext {
  playerPosition: { x: number; y: number };
  activeNpcWorldPos: { x: number; y: number } | null;
  isDialogueActive: boolean;
  currentTime: number;
  deltaTime: number;
  lastNpcScreenUpdate: number;
  lastNpcProjected: { x: number; y: number };
  currentBiome: string;
  lastAutoSaveTime: number;
  perfProfiler?: PerfProfiler;
}

function getCachedCampSmokeSources({
  world,
  state,
  playerPosition,
  currentTime,
}: Pick<RunRuntimeLoopTailOptions, 'world' | 'state' | 'playerPosition' | 'currentTime'>): Array<{ x: number; y: number }> {
  const map = world.getCurrentMap();
  const tileX = Math.floor(playerPosition.x + map.width / 2);
  const tileY = Math.floor(playerPosition.y + map.height / 2);
  const mapRevision = world.getMapRevision();

  if (
    campSmokeCache &&
    campSmokeCache.mapId === state.currentMap &&
    campSmokeCache.mapRevision === mapRevision &&
    campSmokeCache.tileX === tileX &&
    campSmokeCache.tileY === tileY &&
    currentTime - campSmokeCache.refreshedAt < CAMP_SMOKE_REFRESH_MS
  ) {
    return campSmokeCache.sources;
  }

  const sources = world.getNearbyTileWorldPositions(
    'campfire_remains',
    playerPosition.x,
    playerPosition.y,
    18,
  );
  campSmokeCache = {
    mapId: state.currentMap,
    mapRevision,
    tileX,
    tileY,
    refreshedAt: currentTime,
    sources,
  };
  return sources;
}

function applyAdaptivePixelRatio(renderer: THREE.WebGLRenderer, cap: number): void {
  if (typeof window === 'undefined') return;
  const target = Math.max(1, Math.min(window.devicePixelRatio || 1, cap));
  if (Math.abs(renderer.getPixelRatio() - target) > 0.05) {
    renderer.setPixelRatio(target);
  }
}

const clamp01 = (value: number): number => Math.max(0, Math.min(1, value));

function easeInCubic(t: number): number {
  return t * t * t;
}

function easeInOutCubic(t: number): number {
  return t < 0.5
    ? 4 * t * t * t
    : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

function getForestCorruptionLoopTarget(playerY: number, inHollow: boolean): number {
  if (inHollow) return 1;
  if (playerY >= CORRUPTION_LOOP_RAMP_START_Y) return 0;

  if (playerY >= CORRUPTION_LOOP_GROVE_Y) {
    const t = clamp01((CORRUPTION_LOOP_RAMP_START_Y - playerY) / (CORRUPTION_LOOP_RAMP_START_Y - CORRUPTION_LOOP_GROVE_Y));
    return CORRUPTION_LOOP_GROVE_SCALE * easeInCubic(t);
  }

  const t = clamp01((CORRUPTION_LOOP_GROVE_Y - playerY) / (CORRUPTION_LOOP_GROVE_Y - HOLLOW_MUSIC_ENTER_Y));
  return CORRUPTION_LOOP_GROVE_SCALE
    + (CORRUPTION_LOOP_BRIDGE_APPROACH_SCALE - CORRUPTION_LOOP_GROVE_SCALE) * easeInOutCubic(t);
}

function approachCorruptionLoopIntensity(target: number, deltaTime: number): number {
  const tau = target >= 1
    ? CORRUPTION_LOOP_HOLLOW_SWELL_TAU_SEC
    : target < corruptionLoopIntensity
      ? CORRUPTION_LOOP_FADE_OUT_TAU_SEC
      : CORRUPTION_LOOP_BUILD_TAU_SEC;
  const alpha = 1 - Math.exp(-deltaTime / tau);
  corruptionLoopIntensity += (target - corruptionLoopIntensity) * alpha;
  if (target <= 0 && corruptionLoopIntensity < CORRUPTION_LOOP_SILENCE_EPSILON) {
    corruptionLoopIntensity = 0;
  }
  return corruptionLoopIntensity;
}

export function runRuntimeLoopTail({
  scene,
  world,
  playerPosition,
  activeNpcWorldPos,
  isDialogueActive,
  currentTime,
  deltaTime,
  camera,
  renderer,
  getVisualYAt,
  closeDialogueSession,
  setNpcScreenPos,
  lastNpcScreenUpdate,
  lastNpcProjected,
  npcScreenMinMs = 48,
  npcScreenMinPx = 3,
  currentBiome,
  biomeAmbience,
  corruptionFilter,
  altitudeHaze,
  weatherSystem,
  dayNightCycle,
  floatingText,
  particleSystem,
  lastAutoSaveTime,
  autoSaveInterval,
  triggerSave,
  worldItemRenderer,
  state,
  assetManager,
  startStormLoop,
  stopStormLoop,
  setOutdoorsLoopState,
  startCorruptionIdleLoop,
  stopCorruptionIdleLoop,
  setCorruptionIdleLoopIntensity,
  playThunder,
  switchMusicTrack,
  perfProfiler,
}: RunRuntimeLoopTailOptions) {
  const profilePhases = perfProfiler?.isEnabled() ?? false;

  if (profilePhases) {
    perfProfiler!.measure('world', () => {
      world.updateChunks(playerPosition.x, playerPosition.y);
    });
  } else {
    world.updateChunks(playerPosition.x, playerPosition.y);
  }

  const nextNpcScreenUpdate = profilePhases
    ? perfProfiler!.measure('npcProjection', () => updateNpcDialogueProjection({
      activeNpcWorldPos,
      isDialogueActive,
      playerPosition,
      currentTime,
      camera,
      renderer,
      getVisualYAt,
      closeDialogueSession,
      setNpcScreenPos,
      lastNpcScreenUpdate,
      lastNpcProjected,
      minIntervalMs: npcScreenMinMs,
      minDeltaPx: npcScreenMinPx,
    }))
    : updateNpcDialogueProjection({
      activeNpcWorldPos,
      isDialogueActive,
      playerPosition,
      currentTime,
      camera,
      renderer,
      getVisualYAt,
      closeDialogueSession,
      setNpcScreenPos,
      lastNpcScreenUpdate,
      lastNpcProjected,
      minIntervalMs: npcScreenMinMs,
      minDeltaPx: npcScreenMinPx,
    });

  const adaptiveScale = perfProfiler?.getAdaptiveEffectsScale() ?? 1;
  biomeAmbience.setQualityScale(adaptiveScale);
  weatherSystem.setQualityScale(adaptiveScale);
  particleSystem.setQualityScale(adaptiveScale);
  applyAdaptivePixelRatio(renderer, perfProfiler?.getAdaptivePixelRatioCap() ?? 2);

  if (profilePhases) {
    perfProfiler!.measure('ambience', () => {
      biomeAmbience.setBiome(currentBiome);
      const campSmokeSources = getCachedCampSmokeSources({ world, state, playerPosition, currentTime });
      biomeAmbience.update(deltaTime, playerPosition.x, playerPosition.y, campSmokeSources);
    });
  } else {
    biomeAmbience.setBiome(currentBiome);
    const campSmokeSources = getCachedCampSmokeSources({ world, state, playerPosition, currentTime });
    biomeAmbience.update(deltaTime, playerPosition.x, playerPosition.y, campSmokeSources);
  }

  if (playThunder) weatherSystem.onLightningFlash = playThunder;
  if (profilePhases) {
    perfProfiler!.measure('weather', () => {
      weatherSystem.update(deltaTime, playerPosition.x, playerPosition.y, currentBiome);
    });
  } else {
    weatherSystem.update(deltaTime, playerPosition.x, playerPosition.y, currentBiome);
  }

  const isStorm = weatherSystem.getActiveWeather() === 'storm';
  if (isStorm) {
    startStormLoop?.();
  } else {
    stopStormLoop?.();
  }

  const isInterior = state.currentMap.startsWith('interior_');
  const outdoorsLoopBaseScale = isInterior ? OUTDOORS_LOOP_INSIDE_SCALE : OUTDOORS_LOOP_OUTSIDE_SCALE;
  const outdoorsLoopStormScale = isStorm ? OUTDOORS_LOOP_STORM_DUCK_SCALE : 1;
  setOutdoorsLoopState?.(
    outdoorsLoopBaseScale * outdoorsLoopStormScale,
    isInterior ? OUTDOORS_LOOP_CLOSED_DOOR_LOWPASS_HZ : OUTDOORS_LOOP_OPEN_LOWPASS_HZ,
  );

  if (state.currentMap !== 'forest') {
    forestMusicRegion = 'woods';
  } else if (forestMusicRegion === null) {
    // First frame in the forest map — sync the tracked region to the actual
    // player position AND self-heal the music track. The `switchMusicTrack`
    // call is a no-op if the right track is already loaded, but it acts as a
    // safety net if `useGameMusic`'s initial resolve missed (e.g. SaveManager
    // was empty on a brand-new game that happens to start near the boundary).
    forestMusicRegion = playerPosition.y <= HOLLOW_MUSIC_ENTER_Y ? 'hollow' : 'woods';
    switchMusicTrack(forestMusicRegion === 'hollow' ? 'forest_hollow' : 'forest');
  } else if (forestMusicRegion === 'woods' && playerPosition.y <= HOLLOW_MUSIC_ENTER_Y) {
    forestMusicRegion = 'hollow';
    switchMusicTrack('forest_hollow');
  } else if (forestMusicRegion === 'hollow' && playerPosition.y >= HOLLOW_MUSIC_EXIT_Y) {
    forestMusicRegion = 'woods';
    switchMusicTrack('forest');
  }

  // Hollow-side corruption filter — full-screen violet grade. Tied to the
  // same hysteresis state (`forestMusicRegion`) that drives the music
  // crossfade so the visual and audio transitions happen at the exact same
  // boundary crossing. Single binary target (on/off) — once the player is
  // past the ENTER threshold the filter holds at full strength; no biome-
  // depth gradient that could fluctuate as the player wanders the hollow.
  // Runs AFTER the music block so it reads the freshly-updated region this
  // frame (no 1-frame visual lag behind the audio).
  if (corruptionFilter) {
    const target = forestMusicRegion === 'hollow' ? 1.0 : 0.0;
    corruptionFilter.setTargetStrength(target);
    corruptionFilter.update(deltaTime, currentTime / 1000);
  }

  const corruptionLoopTarget = state.currentMap === 'forest'
    ? getForestCorruptionLoopTarget(playerPosition.y, forestMusicRegion === 'hollow')
    : 0;
  const loopIntensity = approachCorruptionLoopIntensity(corruptionLoopTarget, deltaTime);
  if (setCorruptionIdleLoopIntensity) {
    setCorruptionIdleLoopIntensity(loopIntensity);
  } else if (loopIntensity > CORRUPTION_LOOP_SILENCE_EPSILON) {
    startCorruptionIdleLoop?.();
  } else {
    stopCorruptionIdleLoop?.();
  }

  // High-mountain altitude haze: fades in within an authored east-ridge overlook zone
  // (world x91-116, y-23..14 on the forest map) to sell "high up" with a faint cool wash + vignette.
  if (altitudeHaze) {
    const inAltitudeZone = state.currentMap === 'forest'
      && playerPosition.x >= 91 && playerPosition.x <= 118
      && playerPosition.y >= -23 && playerPosition.y <= 14;
    altitudeHaze.setTargetStrength(inAltitudeZone ? 1.0 : 0.0);
    altitudeHaze.update(deltaTime);
  }

  if (profilePhases) {
    perfProfiler!.measure('dayNight', () => {
      dayNightCycle.update(deltaTime, playerPosition.x, playerPosition.y);
    });
    perfProfiler!.measure('floatingText', () => {
      floatingText.update(deltaTime);
    });
    perfProfiler!.measure('particles', () => {
      particleSystem.update(deltaTime);
    });
    perfProfiler!.measure('worldItems', () => {
      worldItemRenderer.update(state.worldItems, state.currentMap, assetManager, currentTime, getVisualYAt, {
        playerX: playerPosition.x,
        playerY: playerPosition.y,
      });
    });
  } else {
    dayNightCycle.update(deltaTime, playerPosition.x, playerPosition.y);
    floatingText.update(deltaTime);
    particleSystem.update(deltaTime);
    worldItemRenderer.update(state.worldItems, state.currentMap, assetManager, currentTime, getVisualYAt, {
      playerX: playerPosition.x,
      playerY: playerPosition.y,
    });
  }

  let nextAutoSaveTime = lastAutoSaveTime;
  if (currentTime - nextAutoSaveTime >= autoSaveInterval) {
    nextAutoSaveTime = currentTime;
    triggerSave();
  }

  if (profilePhases) {
    perfProfiler!.measure('render', () => {
      renderer.render(scene, camera);
    });
  } else {
    renderer.render(scene, camera);
  }

  return {
    lastNpcScreenUpdate: nextNpcScreenUpdate,
    lastAutoSaveTime: nextAutoSaveTime,
  };
}
