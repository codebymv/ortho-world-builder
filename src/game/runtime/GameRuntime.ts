import * as THREE from 'three';
import { GameState } from '@/lib/game/GameState';
import { AssetManager } from '@/lib/game/AssetManager';
import { World } from '@/lib/game/World';
import { ParticleSystem } from '@/lib/game/ParticleSystem';
import { BiomeAmbience } from '@/lib/game/BiomeAmbience';
import { WeatherSystem } from '@/lib/game/WeatherSystem';
import { CombatSystem } from '@/lib/game/Combat';
import { DayNightCycle } from '@/lib/game/DayNightCycle';
import { FloatingTextSystem } from '@/lib/game/FloatingText';
import { ScreenShake } from '@/lib/game/ScreenShake';
import { SaveManager } from '@/lib/game/SaveManager';
import { allMaps, mapDefinitions } from '@/data/maps';
import { bootstrapRuntimeState, ensureRespawnPoint } from '@/game/runtime/RuntimeBootstrap';
import type { MapMarker } from '@/lib/game/MapMarkers';
import type { Item } from '@/lib/game/GameState';
import type { CriticalPathItemVisual } from '@/data/criticalPathItems';

interface CreateGameRuntimeOptions {
  mountElement: HTMLDivElement;
  setCameraRef: (camera: THREE.OrthographicCamera) => void;
  setRendererRef: (renderer: THREE.WebGLRenderer) => void;
  setAssetManagerRef: (assetManager: AssetManager) => void;
  setWorldRef: (world: World) => void;
  setGameStateRef: (state: GameState) => void;
  items: Record<string, Item>;
  criticalPathItems: Record<string, CriticalPathItemVisual>;
  setMapMarkers: (markers: MapMarker[]) => void;
  restoreVisitedTile: (tile: string) => void;
}

export interface GameRuntime {
  scene: THREE.Scene;
  camera: THREE.OrthographicCamera;
  renderer: THREE.WebGLRenderer;
  assetManager: AssetManager;
  state: GameState;
  world: World;
  particleSystem: ParticleSystem;
  combatSystem: CombatSystem;
  biomeAmbience: BiomeAmbience;
  weatherSystem: WeatherSystem;
  dayNightCycle: DayNightCycle;
  floatingText: FloatingTextSystem;
  screenShake: ScreenShake;
  savedData: ReturnType<typeof SaveManager.load>;
  startMap: string;
  frustumSize: number;
}

export function createGameRuntime({
  mountElement,
  setCameraRef,
  setRendererRef,
  setAssetManagerRef,
  setWorldRef,
  setGameStateRef,
  items,
  criticalPathItems,
  setMapMarkers,
  restoreVisitedTile,
}: CreateGameRuntimeOptions): GameRuntime {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x2d5a1b);

  const aspect = window.innerWidth / window.innerHeight;
  const frustumSize = 12;
  const camera = new THREE.OrthographicCamera(
    (frustumSize * aspect) / -2,
    (frustumSize * aspect) / 2,
    frustumSize / 2,
    frustumSize / -2,
    0.1,
    1000,
  );
  camera.position.z = 5;
  setCameraRef(camera);

  const renderer = new THREE.WebGLRenderer({
    antialias: true,
    powerPreference: 'high-performance',
    stencil: false,
  });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  mountElement.appendChild(renderer.domElement);
  setRendererRef(renderer);

  const assetManager = new AssetManager();
  assetManager.loadDefaultAssets();
  setAssetManagerRef(assetManager);

  const state = new GameState(scene, camera);
  setGameStateRef(state);

  const particleSystem = new ParticleSystem(scene);
  const combatSystem = new CombatSystem(state);
  const biomeAmbience = new BiomeAmbience(scene);
  const weatherSystem = new WeatherSystem(scene);
  const dayNightCycle = new DayNightCycle(scene);
  const floatingText = new FloatingTextSystem(scene);
  const screenShake = new ScreenShake(camera);

  const savedData = SaveManager.load();
  const startMap = savedData?.currentMap || 'village';
  assetManager.warmupEnemyTexturesForZones(mapDefinitions[startMap]?.enemyZones);
  const world = new World(scene, assetManager, allMaps[startMap] || allMaps.village);
  setWorldRef(world);

  bootstrapRuntimeState({
    state,
    savedData,
    world,
    items,
    criticalPathItems,
    setMapMarkers,
    restoreVisitedTile,
  });
  ensureRespawnPoint(state, world);

  return {
    scene,
    camera,
    renderer,
    assetManager,
    state,
    world,
    particleSystem,
    combatSystem,
    biomeAmbience,
    weatherSystem,
    dayNightCycle,
    floatingText,
    screenShake,
    savedData,
    startMap,
    frustumSize,
  };
}
