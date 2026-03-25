import { useEffect, useRef, useState, useCallback } from 'react';
import * as THREE from 'three';
import { GameState, NPC } from '@/lib/game/GameState';
import { AssetManager, SharedGeometry } from '@/lib/game/AssetManager';
import { World } from '@/lib/game/World';
import { ParticleSystem } from '@/lib/game/ParticleSystem';
import { BiomeAmbience } from '@/lib/game/BiomeAmbience';
import { WeatherSystem } from '@/lib/game/WeatherSystem';
import { CombatSystem, Enemy } from '@/lib/game/Combat';
import { ENEMY_BLUEPRINTS, DEFAULT_ENEMY } from '@/data/enemies';
import { DayNightCycle } from '@/lib/game/DayNightCycle';
import { FloatingTextSystem } from '@/lib/game/FloatingText';
import { ScreenShake } from '@/lib/game/ScreenShake';
import { MapMarker, extractMarkersFromText } from '@/lib/game/MapMarkers';
import { SaveManager } from '@/lib/game/SaveManager';
import { allMaps, mapDefinitions } from '@/data/maps';
import { dialogues, DialogueNode } from '@/data/dialogues';
import { quests } from '@/data/quests';
import { items } from '@/data/items';
import { criticalPathItems } from '@/data/criticalPathItems';
import { DialogueBox } from './game/DialogueBox';
import { GameUI } from './game/GameUI';
import { Minimap } from './game/Minimap';
import { NotificationFeed } from './game/NotificationFeed';
import { MapModal } from './game/MapModal';
import { PauseMenu } from './game/PauseMenu';
import { TransitionOverlay } from './game/TransitionOverlay';
import { DeathOverlay } from './game/DeathOverlay';
import { notify } from '@/lib/game/notificationBus';
import type { WorldMap } from '@/lib/game/World';

const SPAWN_BODY_R = 0.15;
const CRITICAL_ITEM_INTERACTION_IDS = new Set(Object.keys(criticalPathItems));

function pickEnemySpawnInZone(
  zone: { x: number; y: number; width: number; height: number },
  mapWorld: WorldMap,
  world: World,
  index: number,
  total: number
): { x: number; y: number } | null {
  const cols = Math.max(1, Math.min(Math.floor(zone.width), Math.ceil(Math.sqrt(total))));
  const rows = Math.max(1, Math.ceil(total / cols));
  const subW = zone.width / cols;
  const subH = zone.height / rows;
  const ci = index % cols;
  const cj = Math.floor(index / cols);
  const bx = zone.x + ci * subW;
  const by = zone.y + cj * subH;
  for (let t = 0; t < 10; t++) {
    const ex = bx + Math.random() * subW - mapWorld.width / 2;
    const ey = by + Math.random() * subH - mapWorld.height / 2;
    if (world.canMoveTo(ex, ey, ex, ey, SPAWN_BODY_R)) return { x: ex, y: ey };
  }
  for (let t = 0; t < 28; t++) {
    const ex = zone.x + Math.random() * zone.width - mapWorld.width / 2;
    const ey = zone.y + Math.random() * zone.height - mapWorld.height / 2;
    if (world.canMoveTo(ex, ey, ex, ey, SPAWN_BODY_R)) return { x: ex, y: ey };
  }
  return null;
}

function spawnEnemiesFromMapZones(mapKey: string, mapWorld: WorldMap, combatSystem: CombatSystem, world: World) {
  const mapDef = mapDefinitions[mapKey];
  if (!mapDef?.enemyZones?.length) return;
  for (const zone of mapDef.enemyZones) {
    const blueprint = ENEMY_BLUEPRINTS[zone.enemyType] || DEFAULT_ENEMY;
    for (let i = 0; i < zone.count; i++) {
      const pos = pickEnemySpawnInZone(zone, mapWorld, world, i, zone.count);
      if (!pos) continue;
      combatSystem.spawnEnemy(
        blueprint.name,
        pos,
        blueprint.hp,
        blueprint.damage,
        blueprint.sprite,
        {
          speed: blueprint.speed,
          attackRange: blueprint.attackRange,
          chaseRange: blueprint.chaseRange,
          essenceReward: blueprint.essenceReward,
          telegraphDuration: blueprint.telegraphDuration,
          recoverDuration: blueprint.recoverDuration,
          poise: blueprint.poise,
          staggerDuration: blueprint.staggerDuration,
        }
      );
    }
  }
}

type Direction8 = 'up' | 'down' | 'left' | 'right' | 'up_left' | 'up_right' | 'down_left' | 'down_right';
type CardinalDirection = 'up' | 'down' | 'left' | 'right';

type EnemyVisualProfile = {
  baseScale: number;
  footOffset: number;
  strideAmp: number;
  bobAmp: number;
  squashAmp: number;
  leanAmp: number;
  hpBarOffset: number;
};

const PLAYER_BASE_SCALE = 1.06;
const PLAYER_FOOT_OFFSET = 0.44;
const NPC_FOOT_OFFSET = 0.42;

const NPC_SCALE_BY_ID: Record<string, number> = {
  elder: 1.06,
  merchant: 1.02,
  guard: 1.04,
  blacksmith: 1.1,
  healer: 0.98,
  farmer: 1.03,
  child: 0.86,
};

const ENEMY_VISUALS: Record<string, EnemyVisualProfile> = {
  wolf: { baseScale: 1.22, footOffset: 0.18, strideAmp: 0.05, bobAmp: 0.045, squashAmp: 0.07, leanAmp: 0.08, hpBarOffset: 0.62 },
  shadow: { baseScale: 1.12, footOffset: 0.12, strideAmp: 0.03, bobAmp: 0.05, squashAmp: 0.04, leanAmp: 0.03, hpBarOffset: 0.62 },
  plant: { baseScale: 1.14, footOffset: 0.16, strideAmp: 0.02, bobAmp: 0.03, squashAmp: 0.03, leanAmp: 0.04, hpBarOffset: 0.64 },
  skeleton: { baseScale: 1.18, footOffset: 0.22, strideAmp: 0.04, bobAmp: 0.04, squashAmp: 0.05, leanAmp: 0.05, hpBarOffset: 0.66 },
  bandit: { baseScale: 1.12, footOffset: 0.24, strideAmp: 0.04, bobAmp: 0.05, squashAmp: 0.06, leanAmp: 0.05, hpBarOffset: 0.7 },
  golem: { baseScale: 1.72, footOffset: 0.28, strideAmp: 0.025, bobAmp: 0.03, squashAmp: 0.04, leanAmp: 0.025, hpBarOffset: 0.86 },
  spider: { baseScale: 1.08, footOffset: 0.14, strideAmp: 0.06, bobAmp: 0.02, squashAmp: 0.08, leanAmp: 0.06, hpBarOffset: 0.56 },
  slime: { baseScale: 1.18, footOffset: 0.12, strideAmp: 0.02, bobAmp: 0.035, squashAmp: 0.12, leanAmp: 0.02, hpBarOffset: 0.58 },
};

const Game = () => {
  const mountRef = useRef<HTMLDivElement>(null);
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [uiVersion, setUiVersion] = useState(0);
  const [currentDialogue, setCurrentDialogue] = useState<{ node: DialogueNode; npcName: string } | null>(null);
  const [npcScreenPos, setNpcScreenPos] = useState<{ x: number; y: number } | null>(null);
  const activeNpcWorldPos = useRef<{ x: number; y: number } | null>(null);
  const cameraRef = useRef<THREE.OrthographicCamera | null>(null);
  const visitedTilesRef = useRef<Set<string>>(new Set());
  const [minimapVersion, setMinimapVersion] = useState(0);
  const lastMinimapRefreshRef = useRef(0);
  const gameStateRef = useRef<GameState | null>(null);
  const assetManagerRef = useRef<AssetManager | null>(null);
  const worldRef = useRef<World | null>(null);
  const textureCacheRef = useRef<Map<string, THREE.Texture>>(new Map());
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const portalVignetteRef = useRef<HTMLDivElement | null>(null);

  // Audio processing system for compression and gain
  const audioContextRef = useRef<AudioContext | null>(null);
  const compressorRef = useRef<DynamicsCompressorNode | null>(null);
  const gainNodeRef = useRef<GainNode | null>(null);
  const masterGainRef = useRef<GainNode | null>(null);

  const initializeAudioContext = () => {
    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      
      // Create compressor for dynamic range compression
      compressorRef.current = audioContextRef.current.createDynamicsCompressor();
      compressorRef.current.threshold.value = -24; // Start compression at -24dB
      compressorRef.current.knee.value = 30; // Soft knee
      compressorRef.current.ratio.value = 12; // 12:1 compression ratio
      compressorRef.current.attack.value = 0.003; // 3ms attack
      compressorRef.current.release.value = 0.25; // 250ms release
      
      // Create gain node for output boost
      gainNodeRef.current = audioContextRef.current.createGain();
      gainNodeRef.current.gain.value = 1.4; // Boost output by 40%
      
      // Create master gain for overall volume control
      masterGainRef.current = audioContextRef.current.createGain();
      masterGainRef.current.gain.value = 0.85; // Slightly reduce to prevent clipping
      
      // Connect the audio processing chain
      compressorRef.current.connect(gainNodeRef.current);
      gainNodeRef.current.connect(masterGainRef.current);
      masterGainRef.current.connect(audioContextRef.current.destination);
    }
    return audioContextRef.current;
  };

  const audioSourcesConnectedRef = useRef<Set<HTMLAudioElement>>(new Set());
  
  const processAudioElement = (audio: HTMLAudioElement) => {
    // Skip if already connected to avoid InvalidStateError
    if (audioSourcesConnectedRef.current.has(audio)) return;
    
    const ctx = initializeAudioContext();
    if (!ctx || !compressorRef.current || !gainNodeRef.current || !masterGainRef.current) return;
    
    // Create source from audio element
    const source = ctx.createMediaElementSource(audio);
    audioSourcesConnectedRef.current.add(audio);
    
    // Disconnect direct connection and route through processing chain
    source.connect(compressorRef.current);
    
    return source;
  };

  // New state for overlays
  const [isPaused, setIsPaused] = useState(false);
  const [transitionActive, setTransitionActive] = useState(false);
  const [transitionMapName, setTransitionMapName] = useState('');
  const [deathActive, setDeathActive] = useState(false);
  const [deathEssenceLost, setDeathEssenceLost] = useState(0);
  const [showControls, setShowControls] = useState(true);
  const [mapModalOpen, setMapModalOpen] = useState(false);
  const [transitionDebugEnabled, setTransitionDebugEnabled] = useState(false);
  const [transitionDebugLines, setTransitionDebugLines] = useState<string[]>([]);
  const pausedRef = useRef(false);
  const playerDeadRef = useRef(false);
  const deathRespawnFnRef = useRef<(() => void) | null>(null);
  const controlsTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Healing cooldowns: interactionId -> last use timestamp
  const healCooldowns = useRef<Map<string, number>>(new Map());
  const HEAL_COOLDOWN_MS = 30000; // 30 seconds

  // Map markers system
  const [mapMarkers, setMapMarkers] = useState<MapMarker[]>([]);
  const mapMarkersRef = useRef<MapMarker[]>([]);
  
  const addMarkersFromText = useCallback((text: string, currentMap: string) => {
    const existingIds = new Set(mapMarkersRef.current.map(m => m.id));
    const newMarkers = extractMarkersFromText(text, currentMap, existingIds);
    if (newMarkers.length > 0) {
      const updated = [...mapMarkersRef.current, ...newMarkers];
      mapMarkersRef.current = updated;
      setMapMarkers(updated);
      triggerMinimapUpdate(true);
    }
  }, []);

  const setMapModalOpenRef = useRef(setMapModalOpen);
  setMapModalOpenRef.current = setMapModalOpen;
  const mapModalOpenRef = useRef(false);
  mapModalOpenRef.current = mapModalOpen;

  const triggerUIUpdate = () => setUiVersion(prev => prev + 1);
  const lastUIUpdateRef = useRef(0);
  const triggerUIUpdateThrottled = (now: number = performance.now()) => {
    if (now - lastUIUpdateRef.current >= 50) {
      lastUIUpdateRef.current = now;
      setUiVersion(prev => prev + 1);
    }
  };
  const triggerMinimapUpdate = (force: boolean = false, now: number = performance.now()) => {
    if (force || now - lastMinimapRefreshRef.current >= 120) {
      lastMinimapRefreshRef.current = now;
      setMinimapVersion(prev => prev + 1);
    }
  };

  // Auto-hide controls after 60 seconds
  useEffect(() => {
    controlsTimerRef.current = setTimeout(() => setShowControls(false), 60000);
    return () => { if (controlsTimerRef.current) clearTimeout(controlsTimerRef.current); };
  }, []);

  useEffect(() => {
    if (deathActive) setMapModalOpen(false);
  }, [deathActive]);

  useEffect(() => {
    if (!mountRef.current) return;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x2d5a1b); // dark grass green — neutral backdrop, prevents sky bleed through cliff transparent pixels

    const aspect = window.innerWidth / window.innerHeight;
    const frustumSize = 12;
    const camera = new THREE.OrthographicCamera(
      frustumSize * aspect / -2,
      frustumSize * aspect / 2,
      frustumSize / 2,
      frustumSize / -2,
      0.1,
      1000
    );
    camera.position.z = 5;
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      premultipliedAlpha: false,
      powerPreference: 'high-performance',
      stencil: false,
    });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    rendererRef.current = renderer;
    mountRef.current.appendChild(renderer.domElement);

    const assetManager = new AssetManager();
    assetManagerRef.current = assetManager;
    assetManager.loadDefaultAssets();

    const state = new GameState(scene, camera);
    gameStateRef.current = state;
    setGameState(state);

    const ensureStartingWeapon = () => {
      const hasMeekSword = state.inventory.some(i => i.id === 'meek_short_sword');
      if (!hasMeekSword && !state.inventory.some(i => i.type === 'equipment')) {
        state.inventory.unshift({ ...items.meek_short_sword });
      }
    };

    // Save compatibility: Elder's Wand was removed from progression.
    const stripDeprecatedLoadout = () => {
      state.inventory = state.inventory.filter(i => i.id !== 'magic_wand');
      if (state.activeItemIndex >= state.inventory.length) {
        state.activeItemIndex = Math.max(0, state.inventory.length - 1);
      }
      if (state.equippedWeaponId === 'magic_wand') {
        state.equippedWeaponId = null;
      }
    };

    const reconcileCriticalQuestItems = () => {
      const manuscriptQuestDone = state.quests.some(q => q.id === 'find_hunter' && q.completed);
      if (manuscriptQuestDone) {
        state.setFlag(criticalPathItems.hunter_clue.collectedFlag, true);
        if (!state.hasItem(criticalPathItems.hunter_clue.itemId)) {
          state.addItem({ ...items[criticalPathItems.hunter_clue.itemId] });
        }
      }
    };

    const syncEquippedWeapon = (preferredWeaponId?: string | null) => {
      state.setEquippedWeapon(preferredWeaponId ?? state.equippedWeaponId);
    };

    const particleSystem = new ParticleSystem(scene);
    const combatSystem = new CombatSystem(state);
    const biomeAmbience = new BiomeAmbience(scene);
    const weatherSystem = new WeatherSystem(scene);
    const dayNightCycle = new DayNightCycle(scene);
    const floatingText = new FloatingTextSystem(scene);
    const screenShake = new ScreenShake(camera);

    // Load saved data or start fresh
    const savedData = SaveManager.load();
    const startMap = savedData?.currentMap || 'village';
    assetManager.warmupEnemyTexturesForZones(mapDefinitions[startMap]?.enemyZones);
    const world = new World(scene, assetManager, allMaps[startMap] || allMaps.village);
    worldRef.current = world;
    
    if (savedData) {
      state.currentMap = savedData.currentMap;
      state.player.position = { ...savedData.player.position };
      state.player.direction = savedData.player.direction as any;
      state.player.health = savedData.player.health;
      state.player.maxHealth = savedData.player.maxHealth;
      state.player.gold = savedData.player.gold;
      state.player.essence = savedData.player.essence ?? 0;
      state.player.attackDamage = savedData.player.attackDamage;
      state.player.attackRange = savedData.player.attackRange ?? state.player.attackRange;
      state.player.stamina = savedData.player.stamina;
      state.player.maxStamina = savedData.player.maxStamina;
      state.inventory = savedData.inventory;
      stripDeprecatedLoadout();
      
      ensureStartingWeapon();
      state.activeItemIndex = 0;
      state.equippedWeaponId = savedData.equippedWeaponId ?? null;
      syncEquippedWeapon(savedData.equippedWeaponId);

      state.quests = savedData.quests;
      state.gameFlags = savedData.gameFlags;
      reconcileCriticalQuestItems();
      state.lastBonfire = savedData.lastBonfire ?? null;
      state.droppedEssence = savedData.droppedEssence ?? null;
      // Restore map markers
      mapMarkersRef.current = savedData.mapMarkers || [];
      setMapMarkers(mapMarkersRef.current);
      // Restore visited tiles
      if (savedData.visitedTiles) {
        savedData.visitedTiles.forEach(t => visitedTilesRef.current.add(t));
      }
      console.log('[SaveManager] Loaded save from', new Date(savedData.timestamp).toLocaleString());
    } else {
      const spawnPoint = world.getSpawnPoint();
      state.player.position = { x: spawnPoint.x, y: spawnPoint.y };
      ensureStartingWeapon();
      syncEquippedWeapon();
    }

    if (!state.lastBonfire) {
      const sp = world.getSpawnPoint();
      state.lastBonfire = { mapId: state.currentMap, x: sp.x, y: sp.y };
    }

    syncShadowCastleGateState();
    
    world.updateChunks(state.player.position.x, state.player.position.y);
    
    spawnEnemiesFromMapZones(state.currentMap, world.getCurrentMap(), combatSystem, world);
    console.log(`[Spawn] Total enemies spawned: ${combatSystem.getEnemies().length}`);
    
    let lastAutoSaveTime = performance.now();
    const AUTO_SAVE_INTERVAL = 30000; // 30 seconds

    const enemyMeshes = new Map<string, THREE.Mesh>();
    const enemyShadows = new Map<string, THREE.Mesh>();
    const enemyOutlines = new Map<string, THREE.Mesh>();
    const enemyHPBars = new Map<string, { bg: THREE.Mesh; fill: THREE.Mesh }>();

    const disposeEnemyMeshes = () => {
      enemyMeshes.forEach(mesh => {
        scene.remove(mesh);
        (mesh.material as THREE.Material).dispose();
      });
      enemyMeshes.clear();
      enemyShadows.forEach(mesh => {
        scene.remove(mesh);
        (mesh.material as THREE.Material).dispose();
      });
      enemyShadows.clear();
      enemyOutlines.forEach(mesh => {
        scene.remove(mesh);
        (mesh.material as THREE.Material).dispose();
      });
      enemyOutlines.clear();
      enemyHPBars.forEach(({ bg, fill }) => {
        scene.remove(bg);
        scene.remove(fill);
        (bg.material as THREE.Material).dispose();
        (fill.material as THREE.Material).dispose();
      });
      enemyHPBars.clear();
    };

    const getVisualYAt = (x: number, y: number) => world.getVisualY(x, y);
    const getActorRenderOrder = (x: number, y: number, footOffset: number) =>
      getYRenderOrder(getVisualYAt(x, y), footOffset, true);
    // Smoothed elevation offset for the player — lerps toward the real tile elevation each frame
    // so stepping onto a stair/cliff doesn't produce a jarring instant Y-snap.
    let playerSmoothedElevation = world.getElevationAt(state.player.position.x, state.player.position.y);
    const getPlayerVisualY = (x: number, y: number) =>
      y + playerSmoothedElevation * World.ELEVATION_Y_OFFSET;
    const cameraTarget = { x: state.player.position.x, y: getVisualYAt(state.player.position.x, state.player.position.y) };

    // Interaction indicator
    const indicatorTexture = assetManager.getTexture('interact_indicator');
    const indicatorGeometry = new THREE.PlaneGeometry(0.4, 0.4);
    const indicatorMaterial = new THREE.MeshBasicMaterial({
      map: indicatorTexture,
      transparent: true,
      opacity: 0,
      depthWrite: false,
    });
    const indicatorMesh = new THREE.Mesh(indicatorGeometry, indicatorMaterial);
    indicatorMesh.position.z = 0.5;
    indicatorMesh.visible = false;
    scene.add(indicatorMesh);

    const transitionDebugGroup = new THREE.Group();
    transitionDebugGroup.visible = false;
    scene.add(transitionDebugGroup);
    const transitionDebugGeometry = new THREE.RingGeometry(0.2, 0.3, 16);
    const transitionDebugMaterials = {
      entrance: new THREE.MeshBasicMaterial({ color: 0xFFD24A, transparent: true, opacity: 0.9, depthWrite: false, depthTest: false }),
      exit: new THREE.MeshBasicMaterial({ color: 0xFF8A4A, transparent: true, opacity: 0.9, depthWrite: false, depthTest: false }),
      portal: new THREE.MeshBasicMaterial({ color: 0xB47BFF, transparent: true, opacity: 0.9, depthWrite: false, depthTest: false }),
      other: new THREE.MeshBasicMaterial({ color: 0x6EE7FF, transparent: true, opacity: 0.9, depthWrite: false, depthTest: false }),
    };
    let transitionDebug = false;
    let lastTransitionDebugRefreshAt = 0;

    const clearTransitionDebugMarkers = () => {
      for (let i = transitionDebugGroup.children.length - 1; i >= 0; i--) {
        transitionDebugGroup.remove(transitionDebugGroup.children[i]);
      }
    };

    const rebuildTransitionDebugMarkers = () => {
      clearTransitionDebugMarkers();
      const map = world.getCurrentMap();
      const radius = 18;
      const centerTileX = Math.floor(state.player.position.x + map.width / 2);
      const centerTileY = Math.floor(state.player.position.y + map.height / 2);
      const lines: string[] = [];

      for (let ty = Math.max(0, centerTileY - radius); ty <= Math.min(map.height - 1, centerTileY + radius); ty++) {
        for (let tx = Math.max(0, centerTileX - radius); tx <= Math.min(map.width - 1, centerTileX + radius); tx++) {
          const tile = map.tiles[ty]?.[tx];
          if (!tile) continue;
          const isEntrance = tile.interactionId === 'building_entrance';
          const isExit = tile.interactionId === 'building_exit';
          const hasTransition = !!tile.transition;
          if (!isEntrance && !isExit && !hasTransition) continue;

          const wx = tx - map.width / 2;
          const wy = ty - map.height / 2;
          const mat = isEntrance
            ? transitionDebugMaterials.entrance
            : isExit
              ? transitionDebugMaterials.exit
              : tile.type === 'portal'
                ? transitionDebugMaterials.portal
                : transitionDebugMaterials.other;
          const marker = new THREE.Mesh(transitionDebugGeometry, mat);
          marker.position.set(wx, world.getVisualY(wx, wy) + 0.02, 0.72);
          marker.renderOrder = 250000;
          transitionDebugGroup.add(marker);

          if (lines.length < 7) {
            const target = tile.transition
              ? ` -> ${tile.transition.targetMap}(${tile.transition.targetX},${tile.transition.targetY})`
              : '';
            lines.push(`(${wx}, ${wy}) ${tile.type}${tile.interactionId ? ` [${tile.interactionId}]` : ''}${target}`);
          }
        }
      }

      setTransitionDebugLines(lines);
    };

    const essenceOrbMaterial = new THREE.MeshBasicMaterial({
      map: assetManager.getTexture('essence_drop'),
      transparent: true,
      opacity: 0.95,
      depthWrite: false,
      depthTest: false,
    });
    const essenceOrbMesh = new THREE.Mesh(new THREE.PlaneGeometry(0.55, 0.55), essenceOrbMaterial);
    essenceOrbMesh.visible = false;
    essenceOrbMesh.renderOrder = 150000;
    scene.add(essenceOrbMesh);

    const criticalItemVisualGroup = new THREE.Group();
    criticalItemVisualGroup.visible = true;
    scene.add(criticalItemVisualGroup);
    let criticalItemGlowAccumulator = 0;
    let lastCriticalItemVisualSignature = '';

    const disposeCriticalItemVisuals = () => {
      for (let i = criticalItemVisualGroup.children.length - 1; i >= 0; i--) {
        const child = criticalItemVisualGroup.children[i] as THREE.Group;
        child.children.forEach(grandChild => {
          if (grandChild instanceof THREE.Mesh) {
            grandChild.geometry.dispose();
            (grandChild.material as THREE.Material).dispose();
          }
        });
        criticalItemVisualGroup.remove(child);
      }
    };

    const getCriticalItemVisualSignature = () =>
      `${state.currentMap}|${Object.values(criticalPathItems).map(config => `${config.interactionId}:${state.getFlag(config.collectedFlag) ? 1 : 0}`).join('|')}`;

    const rebuildCriticalItemVisuals = () => {
      disposeCriticalItemVisuals();
      const map = world.getCurrentMap();

      for (const config of Object.values(criticalPathItems)) {
        if (state.getFlag(config.collectedFlag)) continue;
        const item = items[config.itemId];
        const texture = item ? assetManager.getTexture(item.sprite) : undefined;
        if (!item || !texture) continue;

        let found = false;
        for (let ty = 0; ty < map.height && !found; ty++) {
          for (let tx = 0; tx < map.width; tx++) {
            const tile = map.tiles[ty]?.[tx];
            if (!tile || tile.interactionId !== config.interactionId) continue;

            const group = new THREE.Group();
            const halo = new THREE.Mesh(
              new THREE.CircleGeometry(config.haloScale ?? 0.88, 24),
              new THREE.MeshBasicMaterial({
                color: config.haloColor ?? config.glowColor,
                transparent: true,
                opacity: 0.22,
                depthWrite: false,
                depthTest: false,
              })
            );
            halo.renderOrder = 149500;
            halo.position.set(0, 0.04, 0.38);

            const sprite = new THREE.Mesh(
              new THREE.PlaneGeometry(config.spriteScale ?? 0.56, config.spriteScale ?? 0.56),
              new THREE.MeshBasicMaterial({
                map: texture,
                transparent: true,
                opacity: 1,
                depthWrite: false,
                depthTest: false,
              })
            );
            sprite.renderOrder = 150000;
            sprite.position.set(0, 0.12, 0.44);

            group.userData = {
              baseX: tx - map.width / 2,
              baseY: ty - map.height / 2,
              bobAmplitude: config.bobAmplitude ?? 0.05,
              hoverHeight: config.hoverHeight ?? 0.52,
              glowColor: config.glowColor,
            };
            group.add(halo, sprite);
            criticalItemVisualGroup.add(group);
            found = true;
            break;
          }
        }
      }
    };

    let footstepTimer = 0;
    const footstepInterval = 0.3;
    let lastTime = performance.now();
    const MAX_DELTA = 0.1;
    let portalCooldown = 0;
    let portalWarpCharge = 0;
    let portalParticleAcc = 0;
    let lastBarrierToastAt = -1e12;
    let blockedPortalHintTimer = 0;

    // Reusable vectors to avoid per-frame allocation
    const _tmpVec3 = new THREE.Vector3();
    const _worldPosVec3 = new THREE.Vector3();

    // Sword swoosh trail effect — normal attack
    const swooshGeometry = new THREE.RingGeometry(0.2, 0.8, 16, 1, 0, Math.PI * 0.75);
    const swooshMaterial = new THREE.MeshBasicMaterial({
      color: 0xccddff,
      transparent: true,
      opacity: 0,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
    const swooshMesh = new THREE.Mesh(swooshGeometry, swooshMaterial);
    swooshMesh.visible = false;
    swooshMesh.renderOrder = 20000;
    scene.add(swooshMesh);
    let swooshTimer = 0;
    let swooshFacing: 'up' | 'down' | 'left' | 'right' = 'down';
    const SWOOSH_DURATION = 0.22;

    // Spin attack swoosh — same arc style as normal but full circle
    const spinSwooshGeometry = new THREE.RingGeometry(0.2, 0.8, 16, 1, 0, Math.PI * 2);
    const spinSwooshMaterial = new THREE.MeshBasicMaterial({
      color: 0xccddff,
      transparent: true,
      opacity: 0,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
    const spinSwooshMesh = new THREE.Mesh(spinSwooshGeometry, spinSwooshMaterial);
    spinSwooshMesh.visible = false;
    spinSwooshMesh.renderOrder = 20000;
    scene.add(spinSwooshMesh);
    let spinSwooshTimer = 0;
    const SPIN_SWOOSH_DURATION = 0.35;

    // Animation state
    let animFrame = 0;
    let animTimer = 0;
    const IDLE_FRAME_DURATION = 0.8;
    const WALK_FRAME_DURATION = 0.18;
    let playerAnimState: 'idle' | 'walk' | 'attack' | 'dodge' | 'charge' | 'hurt' | 'spin_attack' | 'drinking' | 'block' = 'idle';
    let drinkTimer = 0;
    const DRINK_DURATION = 0.8; // seconds to drink potion
    let attackFrameTimer = 0;
    let attackFrame = 0;
    const ATTACK_FRAME_DURATION = 0.1;
    let currentDir8: Direction8 = 'down';

    // Charge attack state
    let isChargingAttack = false;
    let chargeTimer = 0;
    const CHARGE_TIME_MIN = 0.4;
    const CHARGE_TIME_MAX = 1.2;
    const CHARGE_DAMAGE_MULT = 2.5;
    const ATTACK_STAMINA_COST = 15;
    const CHARGE_ATTACK_STAMINA_COST = 35;
    let chargeLevel = 0;

    // Spin attack animation state
    const SPIN_DIRECTIONS: Direction8[] = ['down', 'left', 'up', 'right'];
    let spinDirIndex = 0;
    let spinFrameTimer = 0;
    const SPIN_FRAME_DURATION = 0.06;

    // Blocking state
    let isBlocking = false;
    let blockStartTime = 0;
    let isRMBHeld = false;
    let blockAngle = 0;
    const BLOCK_DAMAGE_REDUCTION = 0.6;
    const BLOCK_STAMINA_COST = 2;
    const DODGE_IFRAME_DURATION = 0.15;

    // LMB charge attack state
    let isLMBHeld = false;
    let lmbHoldStartTime = 0;
    const LMB_CHARGE_TIME = 0.4; // Time to hold LMB to start charging

    // Death state - use ref so callback can reset it

    // Map biome lookup
    const mapBiomes: Record<string, string> = {
      village: 'grassland',
      forest: 'forest',
      deep_woods: 'swamp',
      shadow_castle: 'ruins',
      ruins: 'ruins',
    };

    // Set biome for loaded map
    biomeAmbience.setBiome(mapBiomes[startMap] || 'grassland');

    let disposed = false;
    let rafId = 0;
    const effectTimeouts: ReturnType<typeof setTimeout>[] = [];
    let cancelEnemyPrewarm: (() => void) | undefined;

    // Save helper
    const triggerSave = () => {
      SaveManager.save(state, mapMarkersRef.current, visitedTilesRef.current);
    };

    // Kill tracker for quests
    let killCount = 0;

    const getPlayerTextureName = (dir: Direction8, animState: string, frame: number): string => {
      return `player_${dir}_${animState}_${frame}`;
    };

    const getDirection8 = (mx: number, my: number): Direction8 => {
      if (mx === 0 && my > 0) return 'up';
      if (mx === 0 && my < 0) return 'down';
      if (mx < 0 && my === 0) return 'left';
      if (mx > 0 && my === 0) return 'right';
      if (mx < 0 && my > 0) return 'up_left';
      if (mx > 0 && my > 0) return 'up_right';
      if (mx < 0 && my < 0) return 'down_left';
      if (mx > 0 && my < 0) return 'down_right';
      return 'down';
    };

    const dir8to4 = (d: Direction8): 'up' | 'down' | 'left' | 'right' => {
      if (d === 'up' || d === 'up_left' || d === 'up_right') return 'up';
      if (d === 'left' || d === 'down_left') return 'left';
      if (d === 'right' || d === 'down_right') return 'right';
      return 'down';
    };

    // Helper: get Y-based render order using the entity foot point with sub-tile precision
    const getYRenderOrder = (worldY: number, footOffset: number = 0, isCharacter: boolean = false): number => {
      const footY = worldY - footOffset;
      // Characters get a much higher base render order to ensure they're always in front of environmental assets
      const baseOrder = isCharacter ? 200000 : 100000;
      return Math.round(baseOrder - footY * 10);
    };

    const isPortalDestinationUnlocked = (targetMap: string): boolean => {
      if (targetMap === 'deep_woods') {
        return !!state.quests.find(q => q.id === 'clear_deep_woods' && q.active);
      }
      return true;
    };

    function syncShadowCastleGateState() {
      if (state.currentMap !== 'shadow_castle') return;
      const map = world.getCurrentMap();
      const gateOpen = state.getFlag('shadow_castle_gate_open');
      const gateId = 'shadow_castle_inner_gate';
      for (let y = 46; y <= 47; y++) {
        for (let x = 92; x <= 107; x++) {
          const t = map.tiles[y]?.[x];
          if (!t) continue;
          if (gateOpen) {
            map.tiles[y][x] = { type: 'stone', walkable: true, elevation: t.elevation ?? 0 };
          } else {
            map.tiles[y][x] = {
              type: 'switch_door',
              walkable: false,
              elevation: t.elevation ?? 0,
              interactionId: gateId,
            };
          }
        }
      }
      world.rebuildChunks();
    }

    const samplePortalNearPlayer = (): { targetMap: string; targetX: number; targetY: number } | null => {
      const px = state.player.position.x;
      const py = state.player.position.y;
      for (const dir of [
        { x: 0, y: 0 }, { x: 0, y: 1 }, { x: 0, y: -1 }, { x: 1, y: 0 }, { x: -1, y: 0 },
      ]) {
        const t = world.getAutoTransitionAt(px + dir.x * 0.7, py + dir.y * 0.7);
        if (t) return t;
      }
      return null;
    };

    const handleMapTransition = (targetMap: string, targetX: number, targetY: number) => {
      console.log(`[MapTransition] Starting transition to ${targetMap} at (${targetX}, ${targetY})`);
      
      if (!isPortalDestinationUnlocked(targetMap)) {
        notify("Magical barrier blocks the path", {
          id: 'portal-barrier',
          description: 'Complete the right quest to unlock this route.',
          duration: 3500,
        });
        return;
      }

      const newMap = allMaps[targetMap];
      if (!newMap) {
        console.log(`[MapTransition] ERROR: Map ${targetMap} not found!`);
        return;
      }
      console.log(`[MapTransition] Map loaded: ${newMap.name}, size: ${newMap.width}x${newMap.height}`);

      // Show transition overlay
      setTransitionMapName(newMap.name);
      setTransitionActive(true);
      effectTimeouts.push(setTimeout(() => setTransitionActive(false), 800));

      state.currentMap = targetMap;
      world.loadMap(newMap);
      syncShadowCastleGateState();
      setActiveNpcsForCurrentMap();
      if (!targetMap.startsWith('interior_')) {
        biomeAmbience.setBiome(mapBiomes[targetMap] || 'grassland');
        switchMusicTrack(targetMap);
      }
      triggerSave(); // Save on map transition
      
      const worldX = targetX - newMap.width / 2;
      const worldY = targetY - newMap.height / 2;
      
      state.player.position = { x: worldX, y: worldY };
      
      // Set player orientation based on transition direction:
      // - Entering interior: face 'down' (into room, door is behind at high-Y)
      // - Exiting to overworld: face 'down' (away from building)
      if (targetMap.startsWith('interior_')) {
        currentDir8 = 'down';
        state.player.direction = 'down';
      } else {
        currentDir8 = 'down';
        state.player.direction = 'down';
      }
      
      // Snap smoothed elevation to target immediately on map load to avoid gliding from 0
      playerSmoothedElevation = world.getElevationAt(worldX, worldY);
      playerMesh.position.set(worldX, getPlayerVisualY(worldX, worldY), 0.2);
      cameraTarget.x = worldX;
      cameraTarget.y = getPlayerVisualY(worldX, worldY);
      camera.position.x = worldX;
      camera.position.y = getPlayerVisualY(worldX, worldY);
      world.updateChunks(worldX, worldY);

      combatSystem.clearAllEnemies();
      disposeEnemyMeshes();

      const mapDef = mapDefinitions[targetMap];
      assetManager.warmupEnemyTexturesForZones(mapDef?.enemyZones);
      spawnEnemiesFromMapZones(targetMap, newMap, combatSystem, world);
      console.log(`[Spawn] Total enemies spawned: ${combatSystem.getEnemies().length}`);

      // Quest objective: track map entry
      const guardQuest = state.quests.find(q => q.id === 'guard_duty' && q.active && !q.completed);
      if (guardQuest && targetMap === 'forest') {
        guardQuest.objectives[0] = 'Patrol the northern forest border ✓';
      }
      
      // First quest: track entering Whispering Woods (forest)
      const hunterQuest = state.quests.find(q => q.id === 'find_hunter' && q.active && !q.completed);
      if (hunterQuest && targetMap === 'forest') {
        hunterQuest.objectives[0] = 'Travel to the Whispering Woods ✓';
        hunterQuest.objectives[1] = 'Search the northern area for clues ✓';
      }
      
      const deepQuest = state.quests.find(q => q.id === 'clear_deep_woods' && q.active && !q.completed);
      if (deepQuest && targetMap === 'deep_woods') {
        deepQuest.objectives[0] = 'Travel to the Deep Woods ✓';
      }
      if (deepQuest && targetMap === 'interior_witch_hut') {
        deepQuest.objectives[1] = 'Find the witch\'s hut ✓';
      }

      notify(`Entered ${newMap.name}`, { id: 'map-enter', duration: 2500 });
      visitedTilesRef.current = new Set();
      triggerMinimapUpdate(true);
      triggerUIUpdate();
      portalCooldown = 0.5;
    };

    const performBonfireRest = (tileX: number, tileY: number) => {
      state.player.health = state.player.maxHealth;
      state.player.stamina = state.player.maxStamina;
      state.lastBonfire = {
        mapId: state.currentMap,
        x: state.player.position.x,
        y: state.player.position.y,
      };
      const firstKey = `bonfire_first_${state.currentMap}_${tileX}_${tileY}`;
      if (!state.getFlag(firstKey)) {
        state.setFlag(firstKey, true);
        notify('Flame kindled', {
          id: 'bonfire', type: 'success',
          description: 'You will respawn here if you fall. Foes have returned.',
          duration: 4000,
        });
      } else {
        notify('Rested at bonfire', {
          id: 'bonfire', type: 'success',
          description: 'Health and stamina restored. Enemies have respawned.',
          duration: 2500,
        });
      }
      assetManager.warmupEnemyTexturesForZones(mapDefinitions[state.currentMap]?.enemyZones);
      combatSystem.clearAllEnemies();
      disposeEnemyMeshes();
      spawnEnemiesFromMapZones(state.currentMap, world.getCurrentMap(), combatSystem, world);
      triggerSave();
      triggerUIUpdate();
    };

    // === SHADOW SYSTEM ===
    const shadowGeometry = new THREE.CircleGeometry(0.25, 12);
    const shadowMaterial = new THREE.MeshBasicMaterial({
      color: 0x000000,
      transparent: true,
      opacity: 0.18,
      depthWrite: false,
    });

    // Player shadow
    const playerShadow = new THREE.Mesh(shadowGeometry, shadowMaterial.clone());
    playerShadow.position.z = 0.05;
    playerShadow.scale.set(1.0, 0.4, 1);
    playerShadow.renderOrder = 1;
    scene.add(playerShadow);

    // === OUTLINE SYSTEM — thin dark silhouette behind each sprite ===
    const createOutlineMesh = (geometry: THREE.BufferGeometry, texture: THREE.Texture | null) => {
      const outlineMat = new THREE.MeshBasicMaterial({
        map: texture,
        color: 0x000000,
        transparent: true,
        opacity: 0.45,
        depthWrite: false,
        depthTest: false,
      });
      return new THREE.Mesh(geometry, outlineMat);
    };

    const OUTLINE_PAD = 1.035; // just 3.5% larger than sprite

    const playerGeometry = SharedGeometry.player;
    const playerTexture = assetManager.getTexture('player_down_idle_0');
    const playerMaterial = new THREE.MeshBasicMaterial({
      map: playerTexture,
      transparent: true,
      depthWrite: false,
      depthTest: false, // Disable depth test completely for proper transparency
      alphaTest: 0, // Disable alpha test to allow full transparency
      side: THREE.DoubleSide,
    });
    const playerMesh = new THREE.Mesh(playerGeometry, playerMaterial);
    playerMesh.position.set(state.player.position.x, getPlayerVisualY(state.player.position.x, state.player.position.y), 0.8); // Higher Z to be above world objects
    playerMesh.scale.setScalar(PLAYER_BASE_SCALE);
    // Set player render order higher than any Y-sorted character (200000 + maxWorldY * 10)
    // Assuming max world Y of 1000, this gives us 200000 + 10000 = 210000 max for other characters
    playerMesh.renderOrder = 999999; // Much higher than any possible Y-sorted character
    scene.add(playerMesh);

    // Player outline
    const playerOutline = createOutlineMesh(playerGeometry, playerTexture);
    playerOutline.position.z = 0.79; // Just below player
    playerOutline.renderOrder = 999998; // Just below player
    scene.add(playerOutline);

    // Blade shimmer overlay (for charge attack)
    const bladeOverlayMaterial = new THREE.MeshBasicMaterial({
      map: playerTexture, // Will be updated to blade texture during charge
      transparent: true,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
    const bladeOverlayMesh = new THREE.Mesh(playerGeometry, bladeOverlayMaterial);
    bladeOverlayMesh.position.z = 0.81; // Just above player
    bladeOverlayMesh.renderOrder = 9999999;
    bladeOverlayMesh.visible = false;
    scene.add(bladeOverlayMesh);

    // Held item mesh (for showing potion instead of sword)
    const potionGeometry = new THREE.PlaneGeometry(0.3, 0.3);
    const potionMaterial = new THREE.MeshBasicMaterial({
      map: assetManager.getTexture('potion'),
      transparent: true,
      depthWrite: false,
    });
    const heldItemMesh = new THREE.Mesh(potionGeometry, potionMaterial);
    heldItemMesh.position.z = 0.85;
    heldItemMesh.renderOrder = 1000000;
    heldItemMesh.visible = false;
    scene.add(heldItemMesh);

    const npcData: NPC[] = [
      { id: 'elder', name: 'Village Elder', mapId: 'village', position: { x: -18, y: -10 }, dialogueId: 'elder', sprite: 'npc_elder', questGiver: true },
      { id: 'merchant', name: 'Traveling Merchant', mapId: 'village', position: { x: 20, y: -2 }, dialogueId: 'merchant', sprite: 'npc_merchant' },
      { id: 'guard', name: 'Village Guard', mapId: 'village', position: { x: 0, y: 5 }, dialogueId: 'guard', sprite: 'npc_guard' },
      { id: 'blacksmith', name: 'Blacksmith', mapId: 'village', position: { x: 35, y: -8 }, dialogueId: 'blacksmith', sprite: 'npc_blacksmith' },
      { id: 'healer', name: 'Healer', mapId: 'village', position: { x: -10, y: 15 }, dialogueId: 'healer', sprite: 'npc_healer' },
      { id: 'farmer', name: 'Old Farmer', mapId: 'village', position: { x: -40, y: -30 }, dialogueId: 'farmer', sprite: 'npc_farmer' },
      { id: 'child', name: 'Village Child', mapId: 'village', position: { x: 5, y: -5 }, dialogueId: 'child', sprite: 'npc_child' },
    ];

    // NPC wandering state
    const npcWander: Record<string, {
      origin: { x: number; y: number };
      angle: number;
      radius: number;
      speed: number;
      pauseTimer: number;
      isPaused: boolean;
      stuckFrames: number;
    }> = {};
    for (const npc of npcData) {
      npcWander[npc.id] = {
        origin: { ...npc.position },
        angle: Math.random() * Math.PI * 2,
        radius: npc.id === 'guard' ? 3 : npc.id === 'child' ? 4 : 1.5,
        speed: npc.id === 'child' ? 1.2 : npc.id === 'guard' ? 0.8 : 0.5,
        pauseTimer: Math.random() * 3,
        isPaused: true,
        stuckFrames: 0,
      };
    }

    state.npcs = [];
    const activeNpcIndices: number[] = [];
    const npcMeshes: THREE.Mesh[] = [];
    const npcShadows: THREE.Mesh[] = [];
    const npcOutlines: THREE.Mesh[] = [];

    npcData.forEach(npc => {
      // NPC shadow
      const npcShadow = new THREE.Mesh(shadowGeometry, shadowMaterial.clone());
      npcShadow.position.set(npc.position.x, getVisualYAt(npc.position.x, npc.position.y) - 0.3, 0.05);
      npcShadow.scale.set(0.8, 0.35, 1);
      npcShadow.renderOrder = 1;
      scene.add(npcShadow);
      npcShadows.push(npcShadow);

      const npcGeometry = SharedGeometry.player;
      const npcTexture = assetManager.getTexture(npc.sprite);
      const npcMaterial = new THREE.MeshBasicMaterial({
        map: npcTexture,
        transparent: true,
        depthWrite: false,
      });
      const npcMesh = new THREE.Mesh(npcGeometry, npcMaterial);
      const npcScale = NPC_SCALE_BY_ID[npc.id] ?? 1;
      npcMesh.position.set(npc.position.x, getVisualYAt(npc.position.x, npc.position.y), 0.2);
      npcMesh.scale.set(npcScale, npcScale, 1);
      npcMesh.renderOrder = getActorRenderOrder(npc.position.x, npc.position.y, NPC_FOOT_OFFSET);
      npcMesh.userData = { npcId: npc.id };
      scene.add(npcMesh);
      npcMeshes.push(npcMesh);

      // NPC outline
      const npcOutline = createOutlineMesh(npcGeometry, npcTexture);
      npcOutline.position.set(npc.position.x, getVisualYAt(npc.position.x, npc.position.y), 0.19);
      npcOutline.scale.set(npcScale * OUTLINE_PAD, npcScale * OUTLINE_PAD, 1);
      npcOutline.renderOrder = npcMesh.renderOrder - 1;
      scene.add(npcOutline);
      npcOutlines.push(npcOutline);
    });

    const setActiveNpcsForCurrentMap = () => {
      const currentMap = state.currentMap;
      activeNpcIndices.length = 0;
      state.npcs = [];

      for (let i = 0; i < npcData.length; i++) {
        const npc = npcData[i];
        const isActive = !npc.mapId || npc.mapId === currentMap;

        const npcMesh = npcMeshes[i];
        if (npcMesh) npcMesh.visible = isActive;
        const npcShadow = npcShadows[i];
        if (npcShadow) npcShadow.visible = isActive;
        const npcOutline = npcOutlines[i];
        if (npcOutline) npcOutline.visible = isActive;

        if (isActive) {
          activeNpcIndices.push(i);
          state.npcs.push(npc);
        }
      }
    };

    setActiveNpcsForCurrentMap();

    const keys: { [key: string]: boolean } = {};
    let interactBuffered = false;
    let dodgeBuffered = false;
    let potionBuffered = false;

    const handleKeyDown = (e: KeyboardEvent) => {
      // ESC: close full map, then dialogue, then pause
      if (e.key === 'Escape') {
        if (mapModalOpenRef.current) {
          setMapModalOpenRef.current(false);
          return;
        }
        if (state.dialogueActive) {
          // Close dialogue immediately
          state.dialogueActive = false;
          state.currentDialogue = null;
          activeNpcWorldPos.current = null;
          setCurrentDialogue(null);
          setNpcScreenPos(null);
          return;
        }
        pausedRef.current = !pausedRef.current;
        setIsPaused(pausedRef.current);
        return;
      }

      if (e.key.toLowerCase() === 'm' && !e.repeat) {
        if (pausedRef.current || state.dialogueActive || playerDeadRef.current) return;
        e.preventDefault();
        setMapModalOpenRef.current(v => !v);
        return;
      }
      if (e.key.toLowerCase() === 'v' && !e.repeat) {
        transitionDebug = !transitionDebug;
        transitionDebugGroup.visible = transitionDebug;
        setTransitionDebugEnabled(transitionDebug);
        if (transitionDebug) {
          rebuildTransitionDebugMarkers();
          notify('Transition debug ON', {
            id: 'transition-debug-on',
            description: 'Markers: yellow entrance, orange exit, purple portal, cyan transition.',
            duration: 2400,
          });
        } else {
          clearTransitionDebugMarkers();
          setTransitionDebugLines([]);
          notify('Transition debug OFF', { id: 'transition-debug-off', duration: 1600 });
        }
        return;
      }

      if (pausedRef.current || mapModalOpenRef.current) return;

      keys[e.key.toLowerCase()] = true;
      if (e.key.toLowerCase() === 'f' && !state.dialogueActive) {
        interactBuffered = true;
      }
      // Switch Active Item (Q / E) - skip duplicates
      if (e.key.toLowerCase() === 'q' && !state.dialogueActive && state.inventory.length > 0) {
        let prevIdx = (state.activeItemIndex - 1 + state.inventory.length) % state.inventory.length;
        const startId = state.inventory[state.activeItemIndex]?.id;
        let count = 0;
        while (state.inventory[prevIdx]?.id === startId && count < state.inventory.length) {
          prevIdx = (prevIdx - 1 + state.inventory.length) % state.inventory.length;
          count++;
        }
        if (state.activeItemIndex !== prevIdx) {
          state.activeItemIndex = prevIdx;
          if (state.inventory[prevIdx]?.type === 'equipment') {
            syncEquippedWeapon(state.inventory[prevIdx].id);
          }
          triggerUIUpdate();
        }
      }
      if (e.key.toLowerCase() === 'e' && !state.dialogueActive && state.inventory.length > 0) {
        let nextIdx = (state.activeItemIndex + 1) % state.inventory.length;
        const startId = state.inventory[state.activeItemIndex]?.id;
        let count = 0;
        while (state.inventory[nextIdx]?.id === startId && count < state.inventory.length) {
          nextIdx = (nextIdx + 1) % state.inventory.length;
          count++;
        }
        if (state.activeItemIndex !== nextIdx) {
          state.activeItemIndex = nextIdx;
          if (state.inventory[nextIdx]?.type === 'equipment') {
            syncEquippedWeapon(state.inventory[nextIdx].id);
          }
          triggerUIUpdate();
        }
      }
      if (e.key === ' ' && !state.dialogueActive) {
        e.preventDefault();
        const activeItem = state.inventory[state.activeItemIndex];
        if (activeItem?.type === 'consumable') {
          if (activeItem.id === 'health_potion') {
            if (state.player.health >= state.player.maxHealth) {
              notify('Already at full health!', { id: 'full-health', duration: 1500 });
              return;
            }
            playerAnimState = 'drinking';
            drinkTimer = DRINK_DURATION;
            state.player.health = Math.min(state.player.maxHealth, state.player.health + 50);
            state.removeItem(activeItem.id);
            notify('Used Health Potion', { id: 'used-potion', type: 'success', description: 'Restored 50 health.', duration: 2000 });
            if (state.activeItemIndex >= state.inventory.length) {
              state.activeItemIndex = Math.max(0, state.inventory.length - 1);
            }
            triggerUIUpdate();
          }
        } else {
          dodgeBuffered = true;
        }
      }
      if (e.key === 'Control' && !state.dialogueActive) {
        if (!isBlocking && !state.player.isDodging && state.player.stamina > 0) {
          isBlocking = true;
          blockStartTime = performance.now() / 1000;
          if (playerAnimState !== 'attack' && playerAnimState !== 'spin_attack' && playerAnimState !== 'drinking' && playerAnimState !== 'block') {
            playerAnimState = 'block';
          }
        }
        keys['control'] = true;
      }
      if (e.key === 'Shift') {
        keys['shift'] = true;
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (pausedRef.current && e.key !== 'Escape') return;
      keys[e.key.toLowerCase()] = false;
      if (e.key === 'Shift') {
        keys['shift'] = false;
      }
      if (e.key === 'Control') {
        keys['control'] = false;
        // Release block when Ctrl is released
        if (isBlocking) {
          isBlocking = false;
          if (playerAnimState === 'block') {
            playerAnimState = 'idle';
          }
        }
      }
    };

    const DODGE_ROLL_POOL_SIZE = 4;
    const dodgeRollPool: HTMLAudioElement[] = [];
    for (let i = 0; i < DODGE_ROLL_POOL_SIZE; i++) {
      const a = new Audio('./audio/dodge_roll.mp3');
      a.volume = 0.38;
      processAudioElement(a);
      dodgeRollPool.push(a);
    }
    let dodgeRollIdx = 0;
    const playDodgeRoll = () => {
      const sfx = dodgeRollPool[dodgeRollIdx % DODGE_ROLL_POOL_SIZE];
      dodgeRollIdx++;
      sfx.currentTime = 0;
      sfx.play().catch(() => {});
    };

    const performDodge = (moveX: number, moveY: number) => {
      const now = Date.now();
      if (now - state.player.lastDodgeTime < state.player.dodgeCooldown) return;
      if (state.player.stamina < 25) return;
      if (state.player.isDodging) return;

      let dx = moveX;
      let dy = moveY;
      if (dx === 0 && dy === 0) {
        const dirMap: Record<string, { x: number; y: number }> = {
          up: { x: 0, y: 1 }, down: { x: 0, y: -1 },
          left: { x: -1, y: 0 }, right: { x: 1, y: 0 },
          up_left: { x: -1, y: 1 }, up_right: { x: 1, y: 1 },
          down_left: { x: -1, y: -1 }, down_right: { x: 1, y: -1 },
        };
        const d = dirMap[currentDir8] || { x: 0, y: -1 };
        dx = d.x;
        dy = d.y;
      }

      const len = Math.sqrt(dx * dx + dy * dy);
      if (len > 0) { dx /= len; dy /= len; }

      state.player.isDodging = true;
      state.player.dodgeTimer = state.player.dodgeDuration;
      state.player.iFrameTimer = DODGE_IFRAME_DURATION;
      state.player.dodgeDirection = { x: dx, y: dy };
      state.player.lastDodgeTime = now;
      state.player.stamina -= 25;
      state.player.lastStaminaUseTime = performance.now() / 1000;
      playerAnimState = 'dodge';
      playDodgeRoll();
      triggerUIUpdate();
    };

    // Pre-load sword swing sound with pooling to prevent memory leaks
    const SFX_POOL_SIZE = 4;
    const swordSwingPool: HTMLAudioElement[] = [];
    for (let i = 0; i < SFX_POOL_SIZE; i++) {
      const a = new Audio('./audio/sword_swing.mp3');
      a.volume = 0.3;
      processAudioElement(a);
      swordSwingPool.push(a);
    }
    let swordSwingIdx = 0;

    const playSwordSwing = () => {
      const sfx = swordSwingPool[swordSwingIdx % SFX_POOL_SIZE];
      swordSwingIdx++;
      sfx.currentTime = 0;
      sfx.play().catch(() => {});
    };

    // Pre-load blade sheath sound (layered with sword swing)
    const bladePool: HTMLAudioElement[] = [];
    for (let i = 0; i < SFX_POOL_SIZE; i++) {
      const a = new Audio('./audio/blade_sheath.mp3');
      a.volume = 0.2;
      processAudioElement(a);
      bladePool.push(a);
    }
    let bladeIdx = 0;

    const playBladeSheath = () => {
      const sfx = bladePool[bladeIdx % SFX_POOL_SIZE];
      bladeIdx++;
      sfx.currentTime = 0;
      sfx.play().catch(() => {});
    };

    // Pre-load footstep sounds (3 walk + 3 sprint variants)
    const FOOTSTEP_POOL_SIZE = 2; // 2 copies per variant to allow overlap
    const walkFootstepPool: HTMLAudioElement[] = [];
    const sprintFootstepPool: HTMLAudioElement[] = [];
    for (let variant = 1; variant <= 3; variant++) {
      for (let i = 0; i < FOOTSTEP_POOL_SIZE; i++) {
        const walkSfx = new Audio(`./audio/fs_${variant}_walk.mp3`);
        walkSfx.volume = 0.3;
        processAudioElement(walkSfx);
        walkSfx.addEventListener('error', () => console.error(`Failed to load walk footstep ${variant}`));
        walkSfx.addEventListener('loadeddata', () => console.log(`Walk footstep ${variant} loaded successfully`));
        walkFootstepPool.push(walkSfx);
        const sprintSfx = new Audio(`./audio/fs_${variant}_sprint.mp3`);
        sprintSfx.volume = 0.4;
        processAudioElement(sprintSfx);
        sprintSfx.addEventListener('error', () => console.error(`Failed to load sprint footstep ${variant}`));
        sprintSfx.addEventListener('loadeddata', () => console.log(`Sprint footstep ${variant} loaded successfully`));
        sprintFootstepPool.push(sprintSfx);
      }
    }
    let footstepPoolIdx = 0;

    const playFootstep = (isSprinting: boolean) => {
      const pool = isSprinting ? sprintFootstepPool : walkFootstepPool;
      // Pick a random sound from the pool
      const randomIdx = Math.floor(Math.random() * pool.length);
      const sfx = pool[randomIdx];
      sfx.currentTime = 0;
      console.log('Playing footstep, isSprinting:', isSprinting, 'pool length:', pool.length);
      sfx.play().then(() => {
        console.log('Footstep played successfully');
        // Start music on first footstep - this is a guaranteed user interaction
        if (!musicStarted.current && musicRef.current) {
          musicStarted.current = true;
          musicRef.current.play().catch(() => {});
        }
      }).catch(err => {
        console.error('Failed to play footstep:', err);
      });
    };

    // Debug: Add manual audio test
    const testAudio = () => {
      console.log('Testing audio...');
      if (walkFootstepPool.length > 0) {
        const testSfx = walkFootstepPool[0];
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

    // Expose test function to window for debugging
    (window as any).testAudio = testAudio;

    // Pre-load death sound
    const deathPool: HTMLAudioElement[] = [];
    for (let i = 0; i < 3; i++) {
      const a = new Audio('./audio/mob_die.mp3');
      a.volume = 0.35;
      processAudioElement(a);
      deathPool.push(a);
    }
    let deathIdx = 0;

    const playDeathSound = () => {
      const sfx = deathPool[deathIdx % deathPool.length];
      deathIdx++;
      sfx.currentTime = 0;
      sfx.play().catch(() => {});
    };

    const SMALL_SFX_POOL = 2;
    const chestUnlockPool: HTMLAudioElement[] = [];
    for (let i = 0; i < SMALL_SFX_POOL; i++) {
      const a = new Audio('./audio/chest_unlock.mp3');
      a.volume = 0.45;
      processAudioElement(a);
      chestUnlockPool.push(a);
    }
    let chestUnlockIdx = 0;
    const playChestUnlock = () => {
      const sfx = chestUnlockPool[chestUnlockIdx % SMALL_SFX_POOL];
      chestUnlockIdx++;
      sfx.currentTime = 0;
      sfx.play().catch(() => {});
    };

    const itemGrabPool: HTMLAudioElement[] = [];
    for (let i = 0; i < SMALL_SFX_POOL; i++) {
      const a = new Audio('./audio/item_grab.mp3');
      a.volume = 0.4;
      processAudioElement(a);
      itemGrabPool.push(a);
    }
    let itemGrabIdx = 0;
    const playItemGrab = () => {
      const sfx = itemGrabPool[itemGrabIdx % SMALL_SFX_POOL];
      itemGrabIdx++;
      sfx.currentTime = 0;
      sfx.play().catch(() => {});
    };

    const gameOverPool: HTMLAudioElement[] = [];
    for (let i = 0; i < 2; i++) {
      const a = new Audio('./audio/game_over.mp3');
      a.volume = 0.5;
      processAudioElement(a);
      gameOverPool.push(a);
    }
    let gameOverIdx = 0;
    const playGameOverSound = () => {
      const sfx = gameOverPool[gameOverIdx % gameOverPool.length];
      gameOverIdx++;
      sfx.currentTime = 0;
      sfx.play().catch(() => {});
    };

    const onEnemyKilled = (enemy: Enemy) => {
      killCount++;
      playDeathSound();
      if (enemy.essenceReward > 0) playItemGrab();
      // Update guard_duty quest kill counter
      const guardQuest = state.quests.find(q => q.id === 'guard_duty' && q.active && !q.completed);
      if (guardQuest) {
        const kills = Math.min(killCount, 5);
        guardQuest.objectives[1] = `Defeat any hostile creatures (${kills}/5)`;
        if (kills >= 5) {
          guardQuest.objectives[1] = 'Defeat any hostile creatures (5/5) ✓';
        }
      }
      notify(`Defeated ${enemy.name}!`, {
        id: 'enemy-kill',
        description: enemy.essenceReward > 0 ? `+${enemy.essenceReward} essence` : undefined,
        duration: 2000,
      });
      triggerUIUpdate();
    };

    const performAttack = () => {
      const currentTime = Date.now();
      if (currentTime - state.player.lastAttackTime < state.player.attackCooldown) return;
      if (state.player.isDodging) return;
      if (state.player.stamina < ATTACK_STAMINA_COST) return;
      if (isBlocking) {
        // Cancel block when attacking
        isBlocking = false;
      }
      playSwordSwing();
      playBladeSheath();
      swooshTimer = SWOOSH_DURATION;
      swooshFacing = dir8to4(currentDir8); // Capture direction at the moment of the attack

state.player.lastAttackTime = currentTime;
      state.player.stamina = Math.max(0, state.player.stamina - ATTACK_STAMINA_COST);
      state.player.lastStaminaUseTime = performance.now() / 1000;
      playerAnimState = 'attack';
      attackFrame = 0;
      attackFrameTimer = ATTACK_FRAME_DURATION;
      state.player.attackAnimationTimer = ATTACK_FRAME_DURATION * 3;

      const enemiesInRange = combatSystem.getEnemiesInRange(
        state.player.position,
        state.player.attackRange
      );

      if (enemiesInRange.length > 0) {
        let target = enemiesInRange[0];
        const d4 = dir8to4(currentDir8);
        const dirOffsets: Record<string, {x: number, y: number}> = {
          up: {x: 0, y: 1}, down: {x: 0, y: -1},
          left: {x: -1, y: 0}, right: {x: 1, y: 0}
        };
        const dir = dirOffsets[d4];
        
        const facingEnemies = enemiesInRange.filter(e => {
          const edx = e.position.x - state.player.position.x;
          const edy = e.position.y - state.player.position.y;
          return (edx * dir.x + edy * dir.y) > 0;
        });
        if (facingEnemies.length > 0) target = facingEnemies[0];

        const result = combatSystem.playerAttack(target, state.player.attackDamage, state.player.position, state.player.direction);

        const isCrit = target.state === 'recovering' || target.state === 'staggered';
        const isStaggered = result.staggered;
        const isBackstab = result.backstab;
        
        let actualDmg = state.player.attackDamage;
        if (isBackstab) {
          actualDmg = Math.floor(state.player.attackDamage * 2.5);
        } else if (target.state === 'staggered') {
          actualDmg = Math.floor(state.player.attackDamage * 2);
        } else if (isCrit) {
          actualDmg = Math.floor(state.player.attackDamage * 1.5);
        }
        
        floatingText.spawnDamage(target.position.x, target.position.y, actualDmg, isCrit || isBackstab);
        
        if (isBackstab) {
          screenShake.shake(0.35, 0.2);
          screenShake.hitStop(0.1);
          floatingText.spawn(target.position.x, target.position.y + 0.8, 'BACKSTAB!', '#FFD700', 24);
        } else {
          screenShake.shake(isCrit ? 0.2 : 0.1, isCrit ? 0.15 : 0.08);
          if (isCrit) screenShake.hitStop(0.05);
        }
        
        if (isStaggered) {
          floatingText.spawn(target.position.x, target.position.y + 0.6, 'STAGGER!', '#88AAFF', 20);
        }

        particleSystem.emitDamage(
          new THREE.Vector3(target.position.x, target.position.y, 0.3)
        );

        if (result.killed) {
          onEnemyKilled(target);
        }
      } else {
        const attackPos = { ...state.player.position };
        const d4 = dir8to4(currentDir8);
        if (d4 === 'up') attackPos.y += 1;
        else if (d4 === 'down') attackPos.y -= 1;
        else if (d4 === 'left') attackPos.x -= 1;
        else if (d4 === 'right') attackPos.x += 1;

        particleSystem.emit(
          new THREE.Vector3(attackPos.x, attackPos.y, 0.3),
          4, 0xFFFFFF, 0.3, 1, 1
        );
      }
    };

    const performChargeAttack = (level: number) => {
      const currentTime = Date.now();
      if (state.player.isDodging) {
        isChargingAttack = false;
        chargeTimer = 0;
        chargeLevel = 0;
        playerAnimState = 'idle';
        return;
      }
      if (state.player.stamina < CHARGE_ATTACK_STAMINA_COST) {
        isChargingAttack = false;
        chargeTimer = 0;
        chargeLevel = 0;
        playerAnimState = 'idle';
        return;
      }
      playSwordSwing();
      playBladeSheath();
      spinSwooshTimer = SPIN_SWOOSH_DURATION;

      state.player.lastAttackTime = currentTime;
      state.player.stamina = Math.max(0, state.player.stamina - CHARGE_ATTACK_STAMINA_COST);
      state.player.lastStaminaUseTime = performance.now() / 1000;
      playerAnimState = 'spin_attack';
      spinDirIndex = 0;
      spinFrameTimer = SPIN_FRAME_DURATION;
      attackFrame = 1;
      state.player.attackAnimationTimer = SPIN_FRAME_DURATION * SPIN_DIRECTIONS.length;
      isChargingAttack = false;
      chargeTimer = 0;
      chargeLevel = 0;

      const dmgMult = 1 + (CHARGE_DAMAGE_MULT - 1) * level;
      const chargeDamage = Math.floor(state.player.attackDamage * dmgMult);
      const chargeRange = state.player.attackRange * (1 + level * 0.5);

      const enemiesInRange = combatSystem.getEnemiesInRange(
        state.player.position,
        chargeRange
      );

      if (enemiesInRange.length > 0) {
        for (const target of enemiesInRange) {
          const result = combatSystem.playerAttack(target, chargeDamage, state.player.position, state.player.direction);

          const actualDmg = target.state === 'staggered'
            ? Math.floor(chargeDamage * 2)
            : chargeDamage;
          floatingText.spawnDamage(target.position.x, target.position.y, actualDmg, true);
          screenShake.shake(0.25, 0.2);
          screenShake.hitStop(0.06);

          if (result.backstab) {
            floatingText.spawn(target.position.x, target.position.y + 0.6, 'BACKSTAB!', '#FFD700', 24);
          }
          if (result.staggered) {
            floatingText.spawn(target.position.x, target.position.y + 0.4, 'STAGGER!', '#88AAFF', 20);
          }

          particleSystem.emitDamage(
            new THREE.Vector3(target.position.x, target.position.y, 0.3)
          );
          particleSystem.emitSparkles(
            new THREE.Vector3(target.position.x, target.position.y + 0.3, 0.5)
          );

          if (result.killed) {
            onEnemyKilled(target);
          }
        }
      } else {
        const attackPos = { ...state.player.position };
        const d4 = dir8to4(currentDir8);
        if (d4 === 'up') attackPos.y += 1.5;
        else if (d4 === 'down') attackPos.y -= 1.5;
        else if (d4 === 'left') attackPos.x -= 1.5;
        else if (d4 === 'right') attackPos.x += 1.5;

        particleSystem.emit(
          new THREE.Vector3(attackPos.x, attackPos.y, 0.3),
          4, 0xcccccc, 0.3, 1, 1
        );
      }
    };

    const usePotion = () => {
      const potionIdx = state.inventory.findIndex(item => item.type === 'consumable' && item.id === 'health_potion');
      if (potionIdx === -1) {
        notify('No potions!', { id: 'no-potions', duration: 1500 });
        return;
      }
      if (state.player.health >= state.player.maxHealth) {
        notify('Already at full health!', { id: 'full-health', duration: 1500 });
        return;
      }
      state.player.health = Math.min(state.player.maxHealth, state.player.health + 50);
      state.inventory.splice(potionIdx, 1);
      particleSystem.emitHeal(new THREE.Vector3(state.player.position.x, state.player.position.y, 0.3));
      notify('Used Health Potion', { id: 'used-potion', type: 'success', description: 'Restored 50 health.', duration: 2000 });
      triggerUIUpdate();
    };

    const checkInteraction = () => {
      const interactionRange = 3.0; // expanded from 2.0 so wandering NPCs are reachable
      const interactionRangeSq = interactionRange * interactionRange;
      for (const npc of state.npcs) {
        const dx = state.player.position.x - npc.position.x;
        const dy = state.player.position.y - npc.position.y;
        const distSq = dx * dx + dy * dy;
        if (distSq < interactionRangeSq) {
          startDialogue(npc.dialogueId, npc.name);
          return;
        }
      }

      const checkX = state.player.position.x;
      const checkY = state.player.position.y;

      const dropped = state.droppedEssence;
      if (dropped && dropped.mapId === state.currentMap && dropped.amount > 0) {
        const sdx = checkX - dropped.x;
        const sdy = checkY - dropped.y;
        if (sdx * sdx + sdy * sdy < 2.25) {
          state.player.essence += dropped.amount;
          state.droppedEssence = null;
          playItemGrab();
          particleSystem.emitSparkles(new THREE.Vector3(dropped.x, dropped.y, 0.5));
          notify('Essence reclaimed', {
            id: 'essence-reclaim', type: 'success',
            description: `Recovered ${dropped.amount} essence from your bloodstain.`,
            duration: 2500,
          });
          triggerSave();
          triggerUIUpdate();
          return;
        }
      }

      // Probe the player's own tile, then 8 directions at 0.5 tiles and 1.0 tiles.
      // Chests and signs can now be triggered from any adjacent tile at any angle,
      // making interaction snappy regardless of exact facing direction.
      const _D = 1 / Math.SQRT2; // normalised diagonal component
      const probeOffsets: Array<{ x: number; y: number }> = [
        { x: 0, y: 0 },                                    // own tile
        { x: 0, y: 0.5 }, { x: 0, y: -0.5 },              // cardinal 0.5
        { x: 0.5, y: 0 }, { x: -0.5, y: 0 },
        { x: _D * 0.7, y: _D * 0.7 },                     // diagonal 0.5
        { x: -_D * 0.7, y: _D * 0.7 },
        { x: _D * 0.7, y: -_D * 0.7 },
        { x: -_D * 0.7, y: -_D * 0.7 },
        { x: 0, y: 1.0 }, { x: 0, y: -1.0 },              // cardinal 1.0
        { x: 1.0, y: 0 }, { x: -1.0, y: 0 },
        { x: _D, y: _D }, { x: -_D, y: _D },              // diagonal 1.0
        { x: _D, y: -_D }, { x: -_D, y: -_D },
      ];

      // Deduplicate so multiple probe points landing on the same tile don't
      // fire the interaction twice or return early on the wrong one.
      const seenIds = new Set<string>();
      for (const dir of probeOffsets) {
        const px = checkX + dir.x;
        const py = checkY + dir.y;
        const interactionId = world.getInteractableAt(px, py);
        if (!interactionId) continue;
        if (seenIds.has(interactionId)) continue;
        seenIds.add(interactionId);

        if (interactionId === 'bonfire_rest') {
          const w = world.getCurrentMap().width;
          const h = world.getCurrentMap().height;
          const tx = Math.floor(px + w / 2);
          const ty = Math.floor(py + h / 2);
          performBonfireRest(tx, ty);
          return;
        }

        if (interactionId === 'moonbloom_pickup') {
          const pickupKey = `moonbloom_${state.currentMap}_${Math.round(px)}_${Math.round(py)}`;
          if (!state.getFlag(pickupKey)) {
            state.setFlag(pickupKey, true);
            if (items.moonbloom) state.addItem({ ...items.moonbloom });
            playItemGrab();
            particleSystem.emitSparkles(new THREE.Vector3(px, py, 0.3));
            const mq = state.quests.find(q => q.id === 'merchants_request' && q.active && !q.completed);
            if (mq) {
              const n = state.inventory.filter(i => i.id === 'moonbloom').length;
              const c = Math.min(n, 3);
              mq.objectives[0] = `Find Moonbloom flowers (${c}/3)`;
              if (n >= 3) mq.objectives[0] = 'Find Moonbloom flowers (3/3) ✓';
            }
            notify('Picked Moonbloom', { type: 'success', description: 'A silvery petal glimmers in your pack.', duration: 2500 });
            triggerUIUpdate();
            SaveManager.save(state, mapMarkersRef.current, visitedTilesRef.current);
            return;
          }
        }

        if (interactionId.includes('chest') && !state.getFlag(`${interactionId}_opened`)) {
          playChestUnlock();
          const goldAmount = interactionId.includes('ancient') ? 100 :
                           interactionId.includes('ruins') ? 75 :
                           interactionId.includes('wolf') || interactionId.includes('shadow') ? 60 :
                           interactionId.includes('hidden') ? 50 :
                           interactionId.includes('forest') ? 40 : 20;
          state.player.gold += goldAmount;
          if (items.health_potion) {
            state.addItem(items.health_potion);
            playItemGrab();
          }
          state.setFlag(`${interactionId}_opened`, true);
          particleSystem.emitSparkles(new THREE.Vector3(px, py, 0.3));
          notify('Chest Opened!', {
            id: 'chest-open', type: 'success',
            description: `Found ${goldAmount} gold and a Health Potion.`,
            duration: 3000,
          });
          triggerUIUpdate();
          return;
        }

        if (CRITICAL_ITEM_INTERACTION_IDS.has(interactionId)) {
          const config = criticalPathItems[interactionId];
          if (state.getFlag(config.collectedFlag)) {
            notify('Nothing more remains here.', { id: 'critical-item-collected', duration: 1800 });
            return;
          }
        }

        // Potion ground pickups
        if (interactionId === 'potion_pickup') {
          const pickupKey = `potion_${state.currentMap}_${Math.round(px)}_${Math.round(py)}`;
          if (!state.getFlag(pickupKey)) {
            state.setFlag(pickupKey, true);
            if (items.health_potion) state.addItem(items.health_potion);
            particleSystem.emitSparkles(new THREE.Vector3(px, py, 0.3));
            notify('Found a Health Potion!', {
              type: 'success', description: 'Added to your inventory.', duration: 2000,
            });
            triggerUIUpdate();
            SaveManager.save(state, mapMarkersRef.current, visitedTilesRef.current);
            return;
          }
        }

        if (interactionId === 'building_exit' || interactionId === 'building_entrance') {
          if (interactionId === 'building_entrance') {
            const entryTile = world.getTile(px, py);
            const isEntranceTile =
              entryTile?.type === 'door' ||
              entryTile?.type === 'door_iron';
            if (!isEntranceTile) continue;
          }
          const transition = world.getTransitionAt(px, py);
          if (transition) {
            handleMapTransition(transition.targetMap, transition.targetX, transition.targetY);
            return;
          }
        }

        // Healing sources with cooldown
        if (interactionId === 'well' || interactionId === 'fountain' || interactionId === 'ancient_fountain' || interactionId === 'healing_mushroom' || interactionId === 'campfire') {
          const now = Date.now();
          const lastUse = healCooldowns.current.get(interactionId) || 0;
          if (now - lastUse < HEAL_COOLDOWN_MS) {
            const remaining = Math.ceil((HEAL_COOLDOWN_MS - (now - lastUse)) / 1000);
            notify(`Not ready yet… (${remaining}s)`, { id: 'heal-cooldown', duration: 1500 });
            return;
          }
          if (state.player.health >= state.player.maxHealth) {
            notify('Already at full health!', { id: 'full-health', duration: 1500 });
            return;
          }
          healCooldowns.current.set(interactionId, now);
          state.player.health = Math.min(state.player.maxHealth, state.player.health + 25);
          particleSystem.emitHeal(new THREE.Vector3(checkX, checkY, 0.3));
          const label = interactionId === 'campfire' ? 'Resting by the Fire' :
                       interactionId === 'healing_mushroom' ? 'Mushroom Energy!' : 'Refreshing Water!';
          notify(label, {
            id: 'heal-source', type: 'success', description: 'Restored 25 health.', duration: 2000,
          });
          triggerUIUpdate();
          return;
        }

        if (interactionId === 'shadow_castle_gate_switch') {
          if (state.currentMap !== 'shadow_castle') continue;
          if (state.getFlag('shadow_castle_gate_open')) {
            notify('The inner gate is already open.', { id: 'shadow-gate-open', duration: 1800 });
            return;
          }
          state.setFlag('shadow_castle_gate_open', true);
          world.activateSwitch('shadow_castle_inner_gate');
          world.updateChunks(state.player.position.x, state.player.position.y);
          notify('Inner gate unlocked', {
            id: 'shadow-gate-unlocked',
            type: 'success',
            description: 'A heavy mechanism rumbles deeper in the castle.',
            duration: 3200,
          });
          triggerSave();
          triggerUIUpdate();
          return;
        }

        if (dialogues[interactionId]) {
          startDialogue(interactionId, undefined);
          return;
        }
      }
    };

    const startDialogue = (dialogueId: string, npcName?: string) => {
      const dialogue = dialogues[dialogueId];
      if (!dialogue) return;

      state.dialogueActive = true;
      state.currentDialogue = dialogueId;

      const npc = state.npcs.find(n => n.dialogueId === dialogueId);
      if (npc) {
        activeNpcWorldPos.current = { x: npc.position.x, y: npc.position.y };
      } else {
        activeNpcWorldPos.current = null;
      }

      let startNode = dialogue.nodes.find(n => n.id === 'start');
      
      if (dialogueId === 'elder') {
        const hunterQuest = state.quests.find(q => q.id === 'find_hunter');
        const deepQuest = state.quests.find(q => q.id === 'clear_deep_woods');
        if (deepQuest?.active && !deepQuest.completed && deepQuest.objectives[2]?.includes('✓')) {
          startNode = dialogue.nodes.find(n => n.id === 'deep_woods_report');
        } else if (deepQuest?.active && !deepQuest.completed) {
          startNode = dialogue.nodes.find(n => n.id === 'deep_woods_active');
        } else if (hunterQuest?.completed) {
          startNode = dialogue.nodes.find(n => n.id === 'quest_complete');
        } else if (hunterQuest?.active) {
          startNode = dialogue.nodes.find(n => n.id === 'quest_active');
        }
      }

      if (dialogueId === 'guard') {
        const gq = state.quests.find(q => q.id === 'guard_duty' && q.active && !q.completed);
        if (gq && gq.objectives[1]?.includes('✓')) {
          startNode = dialogue.nodes.find(n => n.id === 'guard_turnin') ?? startNode;
        }
      }

      if (dialogueId === 'merchant') {
        const mq = state.quests.find(q => q.id === 'merchants_request' && q.active && !q.completed);
        const moonCount = state.inventory.filter(i => i.id === 'moonbloom').length;
        if (mq && moonCount >= 3) {
          startNode = dialogue.nodes.find(n => n.id === 'merchant_moonbloom_deliver') ?? startNode;
        }
      }

      if (startNode) {
        setCurrentDialogue({ node: startNode, npcName: npcName || '' });
        // Extract map markers from dialogue text
        addMarkersFromText(startNode.text, state.currentMap);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    // Mouse event handlers for LMB (attack/charge) and RMB (block)
    const handleMouseDown = (e: MouseEvent) => {
      if (pausedRef.current || mapModalOpenRef.current) return;
      
      if (e.button === 0) {
        // Left click - attack/charge
        if (!state.dialogueActive && !state.player.isDodging) {
          const activeItem = state.inventory[state.activeItemIndex];
          if (activeItem?.type === 'consumable') {
            // LMB with consumable selected - use it
            if (activeItem.id === 'health_potion') {
              if (state.player.health >= state.player.maxHealth) {
                notify('Already at full health!', { id: 'full-health', duration: 1500 });
                return;
              }
              playerAnimState = 'drinking';
              drinkTimer = DRINK_DURATION;
              state.player.health = Math.min(state.player.maxHealth, state.player.health + 50);
              state.removeItem(activeItem.id);
              notify('Used Health Potion', { id: 'used-potion', type: 'success', description: 'Restored 50 health.', duration: 2000 });
              if (state.activeItemIndex >= state.inventory.length) {
                state.activeItemIndex = Math.max(0, state.inventory.length - 1);
              }
              triggerUIUpdate();
            }
          } else {
            // Attack with weapon - start charge tracking
            const currentTime = Date.now();
            if (currentTime - state.player.lastAttackTime >= state.player.attackCooldown) {
              isLMBHeld = true;
              lmbHoldStartTime = currentTime;
              // Start charging
              if (!isChargingAttack && playerAnimState !== 'attack' && playerAnimState !== 'spin_attack' && playerAnimState !== 'drinking' && playerAnimState !== 'block') {
                isChargingAttack = true;
                chargeTimer = 0;
                chargeLevel = 0;
                playerAnimState = 'charge';
              }
            }
          }
        }
      } else if (e.button === 2) {
        // Right click - block
        isRMBHeld = true;
        if (!isBlocking && !state.player.isDodging && state.player.stamina > 0) {
          isBlocking = true;
          blockStartTime = performance.now() / 1000;
          if (playerAnimState !== 'attack' && playerAnimState !== 'spin_attack' && playerAnimState !== 'drinking' && playerAnimState !== 'block') {
            playerAnimState = 'block';
          }
        }
      }
    };

    const handleMouseUp = (e: MouseEvent) => {
      if (pausedRef.current || mapModalOpenRef.current) {
        if (e.button === 0) {
          isLMBHeld = false;
          isChargingAttack = false;
          chargeTimer = 0;
          chargeLevel = 0;
        }
        if (e.button === 2) {
          isRMBHeld = false;
          if (isBlocking) {
            isBlocking = false;
            if (playerAnimState === 'block') playerAnimState = 'idle';
          }
        }
        return;
      }
      if (e.button === 0) {
        // LMB released - perform charge attack if charged enough
        if (isLMBHeld) {
          isLMBHeld = false;
          const currentTime = Date.now();
          const holdDuration = (currentTime - lmbHoldStartTime) / 1000;
          
          if (isChargingAttack) {
            if (holdDuration >= CHARGE_TIME_MIN) {
              // Charged enough - release charge attack
              performChargeAttack(chargeLevel);
            } else {
              // Too short - perform quick attack
              performAttack();
            }
            isChargingAttack = false;
            chargeTimer = 0;
            chargeLevel = 0;
          }
        }
      } else if (e.button === 2) {
        // Release block on RMB release
        isRMBHeld = false;
        if (isBlocking) {
          isBlocking = false;
          if (playerAnimState === 'block') {
            playerAnimState = 'idle';
          }
        }
      }
    };

    // Prevent context menu on right click
    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault();
    };

    renderer.domElement.addEventListener('mousedown', handleMouseDown);
    renderer.domElement.addEventListener('mouseup', handleMouseUp);
    renderer.domElement.addEventListener('contextmenu', handleContextMenu);

    const handleResize = () => {
      const aspect = window.innerWidth / window.innerHeight;
      camera.left = frustumSize * aspect / -2;
      camera.right = frustumSize * aspect / 2;
      camera.top = frustumSize / 2;
      camera.bottom = frustumSize / -2;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    };

    window.addEventListener('resize', handleResize);

    const getOrCreateHPBar = (enemy: Enemy) => {
      let hpBar = enemyHPBars.get(enemy.id);
      if (!hpBar) {
        const bgMat = new THREE.MeshBasicMaterial({ color: 0x333333, transparent: true, opacity: 0.8, depthWrite: false });
        const bg = new THREE.Mesh(SharedGeometry.hpBarBg, bgMat);

        const fillMat = new THREE.MeshBasicMaterial({ color: 0xff0000, transparent: true, opacity: 0.9, depthWrite: false });
        const fill = new THREE.Mesh(SharedGeometry.hpBarFill, fillMat);

        scene.add(bg);
        scene.add(fill);
        hpBar = { bg, fill };
        enemyHPBars.set(enemy.id, hpBar);
      }
      return hpBar;
    };

    let lastNpcScreenUpdate = 0;
    const lastNpcProjected = { x: 0, y: 0 };
    const NPC_SCREEN_MIN_MS = 48;
    const NPC_SCREEN_MIN_PX = 3;

    // ============= ANIMATION LOOP =============
    const animate = () => {
      if (disposed) return;
      rafId = requestAnimationFrame(animate);

      const currentTime = performance.now();
      let deltaTime = (currentTime - lastTime) / 1000;
      lastTime = currentTime;
      if (deltaTime > MAX_DELTA) deltaTime = MAX_DELTA;

      // Skip game logic when paused or full map is open (world frozen)
      if (pausedRef.current || mapModalOpenRef.current) {
        renderer.render(scene, camera);
        return;
      }

      // Skip during death animation
      if (playerDeadRef.current) {
        renderer.render(scene, camera);
        return;
      }

      // Hit-stop: freeze game logic when active
      const frozen = screenShake.update(deltaTime);
      if (frozen) {
        floatingText.update(deltaTime);
        renderer.render(scene, camera);
        return;
      }

      // Stamina regen
      const nowSec = currentTime / 1000;
      if (state.player.iFrameTimer > 0) {
        state.player.iFrameTimer = Math.max(0, state.player.iFrameTimer - deltaTime);
      }
      if (nowSec - state.player.lastStaminaUseTime > state.player.staminaRegenDelay) {
        state.player.stamina = Math.min(state.player.maxStamina, state.player.stamina + state.player.staminaRegenRate * deltaTime);
      }

      // Blocking stamina drain
      if (isBlocking) {
        if (state.player.stamina <= 0) {
          isBlocking = false;
          if (playerAnimState === 'block') {
            playerAnimState = 'idle';
          }
        } else {
          state.player.stamina = Math.max(0, state.player.stamina - BLOCK_STAMINA_COST * deltaTime);
          state.player.lastStaminaUseTime = nowSec;
        }
      }

      // Throttled UI update for smooth stat bars (20fps)
      triggerUIUpdateThrottled(currentTime);

      // Smooth block angle animation
      const targetBlockAngle = isBlocking ? 0.3 : 0;
      blockAngle += (targetBlockAngle - blockAngle) * Math.min(1, deltaTime * 15);

      if (portalCooldown > 0) {
        portalCooldown -= deltaTime;
      }

    // === NPC WANDERING ===
      for (let ai = 0; ai < activeNpcIndices.length; ai++) {
        const ni = activeNpcIndices[ai];
        const npc = npcData[ni];
        const wander = npcWander[npc.id];
        if (!wander) continue;

        // Freeze NPC in place when player is in conversation with them
        const isTalkingToThisNpc = state.dialogueActive && state.currentDialogue === npc.dialogueId;
        if (isTalkingToThisNpc) {
          // Update mesh position without moving
          const npcMesh = npcMeshes[ni];
          if (npcMesh) {
            const npcScale = NPC_SCALE_BY_ID[npc.id] ?? 1;
            const breathe = Math.sin(currentTime / 800 + ni * 2.1) * 0.03;
            npcMesh.position.set(npc.position.x, getVisualYAt(npc.position.x, npc.position.y) + breathe, 0.2);
            npcMesh.scale.set(npcScale, npcScale, 1);
            npcMesh.rotation.z = 0;
            npcMesh.renderOrder = getActorRenderOrder(npc.position.x, npc.position.y, NPC_FOOT_OFFSET);
          }
          continue;
        }

        if (wander.isPaused) {
          wander.pauseTimer -= deltaTime;
          if (wander.pauseTimer <= 0) {
            wander.isPaused = false;
            wander.angle += (Math.random() - 0.5) * Math.PI;
          }
        } else {
          const targetX = wander.origin.x + Math.cos(wander.angle) * wander.radius;
          const targetY = wander.origin.y + Math.sin(wander.angle) * wander.radius;
          const dx = targetX - npc.position.x;
          const dy = targetY - npc.position.y;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist > 0.1) {
            const moveSpeed = wander.speed * deltaTime;
            const nx = npc.position.x + (dx / dist) * moveSpeed;
            const ny = npc.position.y + (dy / dist) * moveSpeed;
            let moved = false;
            if (world.canMoveTo(npc.position.x, npc.position.y, nx, ny)) {
              npc.position.x = nx;
              npc.position.y = ny;
              moved = true;
            } else if (world.canMoveTo(npc.position.x, npc.position.y, nx, npc.position.y)) {
              npc.position.x = nx;
              moved = true;
            } else if (world.canMoveTo(npc.position.x, npc.position.y, npc.position.x, ny)) {
              npc.position.y = ny;
              moved = true;
            }
            if (moved) {
              wander.stuckFrames = 0;
            } else {
              wander.stuckFrames++;
              if (wander.stuckFrames >= 4) {
                // Completely stuck — abandon this heading, pause briefly, pick a fresh direction.
                wander.isPaused = true;
                wander.pauseTimer = 0.3 + Math.random() * 1.0;
                wander.angle = Math.random() * Math.PI * 2;
                wander.stuckFrames = 0;
              } else {
                wander.angle += Math.PI * (0.4 + Math.random() * 0.6);
              }
            }
          } else {
            wander.isPaused = true;
            wander.pauseTimer = 1.5 + Math.random() * 3;
            wander.angle += (Math.random() - 0.5) * Math.PI * 1.5;
          }

        }

        const npcMesh = npcMeshes[ni];
        if (npcMesh) {
          const npcScale = NPC_SCALE_BY_ID[npc.id] ?? 1;
          const walkWave = !wander.isPaused ? Math.sin(currentTime / 120 + ni * 1.7) : 0;
          const stride = Math.abs(walkWave);
          const bob = !wander.isPaused
            ? stride * 0.05
            : Math.sin(currentTime / 800 + ni * 2.1) * 0.03;
          const lean = !wander.isPaused ? walkWave * 0.035 : 0;

          npcMesh.position.set(npc.position.x, getVisualYAt(npc.position.x, npc.position.y) + bob, 0.2);
          npcMesh.scale.set(
            npcScale * (1 - stride * 0.025),
            npcScale * (1 + stride * 0.05),
            1
          );
          npcMesh.rotation.z = lean;
          npcMesh.renderOrder = getActorRenderOrder(npc.position.x, npc.position.y, NPC_FOOT_OFFSET);

          // Update NPC shadow
          const npcShadow = npcShadows[ni];
          if (npcShadow) {
            npcShadow.position.set(npc.position.x, getVisualYAt(npc.position.x, npc.position.y) - 0.3, 0.05);
          }
          // Update NPC outline
          const npcOutline = npcOutlines[ni];
          if (npcOutline) {
            npcOutline.position.set(npc.position.x, getVisualYAt(npc.position.x, npc.position.y) + bob, 0.19);
            npcOutline.rotation.z = lean;
            npcOutline.renderOrder = npcMesh.renderOrder - 1;
          }
        }
      }

      // Process buffered inputs
      if (interactBuffered && !state.dialogueActive) {
        checkInteraction();
        interactBuffered = false;
      }
      if (potionBuffered && !state.dialogueActive) {
        usePotion();
        potionBuffered = false;
      }
      // Update charge timer
      if (isChargingAttack) {
        if (!isLMBHeld) {
          // LMB was released but charge state wasn't cleaned up - force reset
          isChargingAttack = false;
          chargeTimer = 0;
          chargeLevel = 0;
          playerAnimState = 'idle';
        } else {
          chargeTimer += deltaTime;
          chargeLevel = Math.min(1, Math.max(0, (chargeTimer - CHARGE_TIME_MIN) / (CHARGE_TIME_MAX - CHARGE_TIME_MIN)));
          playerAnimState = 'charge';
        }
      }

      if (!state.dialogueActive) {
        let moveX = 0;
        let moveY = 0;
        let moved = false;

        if (keys['w'] || keys['arrowup']) { moveY += 1; moved = true; }
        if (keys['s'] || keys['arrowdown']) { moveY -= 1; moved = true; }
        if (keys['a'] || keys['arrowleft']) { moveX -= 1; moved = true; }
        if (keys['d'] || keys['arrowright']) { moveX += 1; moved = true; }

        if (dodgeBuffered && !state.dialogueActive && !isBlocking) {
          performDodge(moveX, moveY);
          dodgeBuffered = false;
        }

        if (moveX !== 0 && moveY !== 0) {
          const length = Math.sqrt(moveX * moveX + moveY * moveY);
          moveX /= length;
          moveY /= length;
        }

        // Dodge roll movement
        if (state.player.isDodging) {
          state.player.dodgeTimer -= deltaTime;
          const dodgeFrameSpeed = state.player.dodgeSpeed * deltaTime * 60;
          const newPos = {
            x: state.player.position.x + state.player.dodgeDirection.x * dodgeFrameSpeed,
            y: state.player.position.y + state.player.dodgeDirection.y * dodgeFrameSpeed,
          };
          if (world.canMoveTo(state.player.position.x, state.player.position.y, newPos.x, newPos.y, 0.2)) {
            state.player.position = newPos;
          }

          if (state.player.dodgeTimer <= 0) {
            state.player.isDodging = false;
            state.player.iFrameTimer = 0;
            playerAnimState = moved ? 'walk' : 'idle';
          }
        } else if (moved && !isChargingAttack && playerAnimState !== 'spin_attack' && state.player.attackAnimationTimer <= 0) {
          const rawDir = getDirection8(moveX > 0 ? 1 : moveX < 0 ? -1 : 0, moveY > 0 ? 1 : moveY < 0 ? -1 : 0);
          currentDir8 = rawDir;
          state.player.direction = dir8to4(rawDir);

          // Sprint: hold shift while moving
          const wantsSprint = keys['shift'] && state.player.stamina > 0;
          state.player.isSprinting = wantsSprint;
          const currentSpeed = wantsSprint ? state.player.sprintSpeed : state.player.speed;
          if (wantsSprint) {
            state.player.stamina = Math.max(0, state.player.stamina - 20 * deltaTime);
            state.player.lastStaminaUseTime = currentTime / 1000;
            if (state.player.stamina <= 0) state.player.isSprinting = false;
          }

          const frameSpeed = currentSpeed * deltaTime * 60;
          const newPos = {
            x: state.player.position.x + moveX * frameSpeed,
            y: state.player.position.y + moveY * frameSpeed,
          };

          if (world.canMoveTo(state.player.position.x, state.player.position.y, newPos.x, newPos.y, 0.2)) {
            state.player.position = newPos;
          } else if (world.canMoveTo(state.player.position.x, state.player.position.y, newPos.x, state.player.position.y, 0.2)) {
            state.player.position.x = newPos.x;
          } else if (world.canMoveTo(state.player.position.x, state.player.position.y, state.player.position.x, newPos.y, 0.2)) {
            state.player.position.y = newPos.y;
          }

          state.player.isMoving = true;

          if (playerAnimState !== 'attack' && playerAnimState !== 'dodge' && playerAnimState !== 'charge' && playerAnimState !== 'drinking' && playerAnimState !== 'block') {
            playerAnimState = 'walk';
          }

          footstepTimer += deltaTime;
          const actualFootstepInterval = state.player.isSprinting ? footstepInterval * 0.65 : footstepInterval;
          if (footstepTimer >= actualFootstepInterval) {
            _tmpVec3.set(state.player.position.x, state.player.position.y, 0);
            particleSystem.emitDust(_tmpVec3);
            playFootstep(state.player.isSprinting);
            footstepTimer = 0;
          }

          // Reveal all tiles within the player's visible viewport
          const currentMap = world.getCurrentMap();
          const viewHalfH = 7;
          const viewHalfW = Math.ceil(viewHalfH * (window.innerWidth / window.innerHeight));
          const centerTileX = Math.floor(state.player.position.x + currentMap.width / 2);
          const centerTileY = Math.floor(state.player.position.y + currentMap.height / 2);
          let newTilesRevealed = false;
          for (let dy = -viewHalfH; dy <= viewHalfH; dy++) {
            for (let dx = -viewHalfW; dx <= viewHalfW; dx++) {
              const tx = centerTileX + dx;
              const ty = centerTileY + dy;
              if (tx >= 0 && tx < currentMap.width && ty >= 0 && ty < currentMap.height) {
                const key = `${tx},${ty}`;
                if (!visitedTilesRef.current.has(key)) {
                  visitedTilesRef.current.add(key);
                  newTilesRevealed = true;
                }
              }
            }
          }
          if (newTilesRevealed) {
            triggerMinimapUpdate(false, currentTime);
          }
        } else {
          state.player.isMoving = false;
          footstepTimer = 0;
          if (playerAnimState !== 'attack' && playerAnimState !== 'dodge' && playerAnimState !== 'charge' && playerAnimState !== 'spin_attack' && playerAnimState !== 'block') {
            playerAnimState = 'idle';
          }
        }

        // === PLAYER ANIMATION FRAME MANAGEMENT ===
        if (playerAnimState === 'attack') {
          attackFrameTimer -= deltaTime;
          if (attackFrameTimer <= 0) {
            attackFrame++;
            if (attackFrame >= 3) {
              playerAnimState = moved ? 'walk' : 'idle';
              attackFrame = 0;
            } else {
              attackFrameTimer = ATTACK_FRAME_DURATION;
            }
          }
          state.player.attackAnimationTimer = Math.max(0, state.player.attackAnimationTimer - deltaTime);
        }

        if (playerAnimState === 'spin_attack') {
          spinFrameTimer -= deltaTime;
          if (spinFrameTimer <= 0) {
            spinDirIndex++;
            if (spinDirIndex >= SPIN_DIRECTIONS.length) {
              playerAnimState = moved ? 'walk' : 'idle';
              spinDirIndex = 0;
            } else {
              spinFrameTimer = SPIN_FRAME_DURATION;
            }
          }
          state.player.attackAnimationTimer = Math.max(0, state.player.attackAnimationTimer - deltaTime);
        }

        // Handle drinking state
        if (playerAnimState === 'drinking') {
          drinkTimer -= deltaTime;
          // Emit heal particles while drinking
          if (Math.random() < 0.3) {
            _tmpVec3.set(state.player.position.x, state.player.position.y + 0.5, 0.3);
            particleSystem.emitHeal(_tmpVec3);
          }
          if (drinkTimer <= 0) {
            playerAnimState = 'idle';
          }
        }

        // Cycle idle/walk frames (drinking and blocking pause animation)
        if (playerAnimState !== 'attack' && playerAnimState !== 'dodge' && playerAnimState !== 'charge' && playerAnimState !== 'spin_attack' && playerAnimState !== 'drinking' && playerAnimState !== 'block') {
          const frameDuration = playerAnimState === 'walk' ? WALK_FRAME_DURATION : IDLE_FRAME_DURATION;
          animTimer += deltaTime;
          if (animTimer >= frameDuration) {
            animFrame = (animFrame + 1) % 2;
            animTimer = 0;
          }
        }

        if (playerAnimState === 'charge') {
          animTimer += deltaTime;
          if (animTimer >= 0.15) {
            animFrame = (animFrame + 1) % 3;
            animTimer = 0;
          }
        }

        // Update player texture
        let texName: string;
        if (state.player.damageFlashTimer > 0) {
          texName = getPlayerTextureName(currentDir8, 'hurt', 0);
        } else if (playerAnimState === 'spin_attack') {
          const spinDir = SPIN_DIRECTIONS[Math.min(spinDirIndex, SPIN_DIRECTIONS.length - 1)];
          texName = getPlayerTextureName(spinDir, 'attack', 1);
        } else if (playerAnimState === 'charge') {
          texName = getPlayerTextureName(currentDir8, 'charge', Math.min(animFrame, 2));
        } else if (playerAnimState === 'attack') {
          texName = getPlayerTextureName(currentDir8, 'attack', Math.min(attackFrame, 2));
        } else if (playerAnimState === 'dodge') {
          texName = getPlayerTextureName(currentDir8, 'walk', animFrame);
        } else if (playerAnimState === 'drinking') {
          texName = getPlayerTextureName(currentDir8, 'attack', 2);
        } else if (playerAnimState === 'block') {
          texName = getPlayerTextureName(currentDir8, 'block', 0);
        } else {
          // Check if player is holding a consumable (show potion instead of sword)
          const activeItem = state.inventory[state.activeItemIndex];
          if (activeItem?.type === 'consumable') {
            texName = getPlayerTextureName(currentDir8, 'attack', 2);
          } else {
            texName = getPlayerTextureName(currentDir8, playerAnimState, animFrame);
          }
        }
        
        let newTex = assetManager.getTexture(texName);
        if (!newTex) {
          const fallbackDir = dir8to4(playerAnimState === 'spin_attack' 
            ? SPIN_DIRECTIONS[Math.min(spinDirIndex, SPIN_DIRECTIONS.length - 1)] 
            : currentDir8);
          const fallbackState = playerAnimState === 'dodge' ? 'walk' : 
                               playerAnimState === 'charge' ? 'charge' : 
                               playerAnimState === 'spin_attack' ? 'attack' :
                               playerAnimState === 'hurt' ? 'hurt' : playerAnimState;
          const fallbackFrame = playerAnimState === 'attack' ? Math.min(attackFrame, 2) : 
                               playerAnimState === 'spin_attack' ? 1 :
                               playerAnimState === 'charge' ? Math.min(animFrame, 2) : animFrame;
          texName = `player_${fallbackDir}_${fallbackState}_${fallbackFrame}`;
          
          // Use cache for texture lookups
          if (textureCacheRef.current.has(texName)) {
            newTex = textureCacheRef.current.get(texName)!;
          } else {
            newTex = assetManager.getTexture(texName);
            if (newTex) textureCacheRef.current.set(texName, newTex);
          }
        } else {
          // Check cache for the initial texName too
          if (textureCacheRef.current.has(texName)) {
            newTex = textureCacheRef.current.get(texName)!;
          } else {
            newTex = assetManager.getTexture(texName);
            if (newTex) textureCacheRef.current.set(texName, newTex);
          }
        }
        
        if (newTex && playerMaterial.map !== newTex) {
          playerMaterial.map = newTex;
          (playerOutline.material as THREE.MeshBasicMaterial).map = newTex;
        }

        // === PLAYER POSITION WITH ANIMATION OFFSETS ===
        let attackOffsetX = 0;
        let attackOffsetY = 0;
        const facing4 = dir8to4(currentDir8);
        const walkCycleSpeed = state.player.isSprinting ? 70 : 95;
        const moveWave = playerAnimState === 'walk' || state.player.isDodging
          ? Math.sin(currentTime / walkCycleSpeed)
          : 0;
        const stride = Math.abs(moveWave);

        if (playerAnimState === 'attack' && attackFrame === 1) {
          const lungeAmount = 0.15;
          if (facing4 === 'up') attackOffsetY = lungeAmount;
          else if (facing4 === 'down') attackOffsetY = -lungeAmount;
          else if (facing4 === 'left') attackOffsetX = -lungeAmount;
          else if (facing4 === 'right') attackOffsetX = lungeAmount;
        } else if (playerAnimState === 'spin_attack') {
          const spinDir = SPIN_DIRECTIONS[Math.min(spinDirIndex, SPIN_DIRECTIONS.length - 1)];
          const lungeAmount = 0.1;
          const d4 = dir8to4(spinDir);
          if (d4 === 'up') attackOffsetY = lungeAmount;
          else if (d4 === 'down') attackOffsetY = -lungeAmount;
          else if (d4 === 'left') attackOffsetX = -lungeAmount;
          else if (d4 === 'right') attackOffsetX = lungeAmount;
        }

        let visualScaleX = PLAYER_BASE_SCALE;
        let visualScaleY = PLAYER_BASE_SCALE;
        let visualRotation = 0;

        if (playerAnimState === 'walk') {
          const sprintMult = state.player.isSprinting ? 1.4 : 1.0;
          attackOffsetY += stride * 0.06 * sprintMult;
          if (facing4 === 'left') attackOffsetX -= stride * 0.04 * sprintMult;
          else if (facing4 === 'right') attackOffsetX += stride * 0.04 * sprintMult;
          visualScaleX *= 1 - stride * 0.035 * sprintMult;
          visualScaleY *= 1 + stride * 0.07 * sprintMult;
          visualRotation = moveWave * (facing4 === 'left' ? -0.035 : facing4 === 'right' ? 0.035 : 0.018) * sprintMult;
        }

        if (state.player.isDodging) {
          const t = 1 - (state.player.dodgeTimer / state.player.dodgeDuration);
          const dodgeScaleX = 1 + Math.sin(t * Math.PI) * 0.3;
          const dodgeScaleY = 1 - Math.sin(t * Math.PI) * 0.2;
          visualScaleX *= dodgeScaleX;
          visualScaleY *= dodgeScaleY;
          visualRotation = t * Math.PI * 2 * (state.player.dodgeDirection.x >= 0 ? -1 : 1);
        }

        // Color tinting for animations
        const outlineMat = playerOutline.material as THREE.MeshBasicMaterial;
        if (state.player.damageFlashTimer > 0) {
          playerMaterial.color.setHex(0xffaaaa);
          outlineMat.color.setHex(0xff0000);
        } else if (isChargingAttack && chargeLevel > 0) {
          // Blade shimmer: pulse brightness - light pixels (blade) shimmer more than dark
          const pulse = Math.sin(currentTime / 40) * 0.15 * chargeLevel;
          const brightness = 1 + pulse;
          playerMaterial.color.setRGB(brightness, brightness, brightness);
          outlineMat.color.setHex(0x000000);
        } else {
          playerMaterial.color.setHex(0xffffff);
          outlineMat.color.setHex(0x000000);
        }

        // Blade shimmer overlay during charge
        if (isChargingAttack) {
          // Simple brightness pulse - blade (brightest pixels) will shimmer most
          const pulse = 1 + Math.sin(currentTime / 50) * 0.15 * (0.3 + chargeLevel * 0.7);
          playerMaterial.color.setRGB(pulse, pulse, pulse);
          bladeOverlayMesh.visible = false;
        } else {
          bladeOverlayMesh.visible = false;
        }

        // Update smoothed elevation first so all visual calculations this frame use the
        // same fresh value — avoids a one-frame lag between player/shadow and camera.
        const targetElev = world.getElevationAt(state.player.position.x, state.player.position.y);
        playerSmoothedElevation += (targetElev - playerSmoothedElevation) * Math.min(1, 12 * deltaTime);

        playerMesh.rotation.z = visualRotation;
        playerMesh.scale.set(visualScaleX, visualScaleY, 1);
        const playerVisualX = state.player.position.x + attackOffsetX;
        const playerVisualY = getPlayerVisualY(playerVisualX, state.player.position.y + attackOffsetY);
        playerMesh.position.set(
          playerVisualX,
          playerVisualY,
          0.8 // Higher Z to be above world objects
        );

        // FORCE player render order every frame to prevent any overrides
        playerMesh.renderOrder = 999999;

        // Update held item mesh (show potion when holding consumable)
        const activeItem = state.inventory[state.activeItemIndex];
        const isHoldingConsumable = activeItem?.type === 'consumable' && playerAnimState !== 'drinking';
        
        if (isHoldingConsumable) {
          // Position the potion in the SAME hand as sword (left hand, offset to the right of player body)
          // Sword is held on the right side of the player, so use the same offset
          let itemOffsetX = 0.25;
          let itemOffsetY = 0.05;
          
          // Adjust position based on direction - same as sword positioning
          if (currentDir8 === 'left' || currentDir8 === 'up_left' || currentDir8 === 'down_left') {
            itemOffsetX = -0.25;
          }
          if (currentDir8 === 'up' || currentDir8 === 'up_left' || currentDir8 === 'up_right') {
            itemOffsetY = 0.35;
          }
          if (currentDir8 === 'down' || currentDir8 === 'down_left' || currentDir8 === 'down_right') {
            itemOffsetY = -0.15;
          }
          
          // Position held item on same arm as sword (attached to player body)
          heldItemMesh.position.set(
            state.player.position.x + itemOffsetX,
            getVisualYAt(state.player.position.x + itemOffsetX, state.player.position.y + itemOffsetY),
            0.85
          );
          heldItemMesh.visible = true;
          
          // Update potion texture if it's a health potion
          if (activeItem.id === 'health_potion') {
            const potionTex = assetManager.getTexture('potion');
            if (potionTex !== potionMaterial.map) {
              potionMaterial.map = potionTex;
            }
          }
        } else {
          heldItemMesh.visible = false;
        }

        // Update player shadow — always at the player's ground position, ignoring attack
        // offsets and camera jitter so it stays flush with the terrain smoothly.
        playerShadow.position.set(
          state.player.position.x,
          getPlayerVisualY(state.player.position.x, state.player.position.y) - 0.35,
          0.05
        );

        // Dynamic Y-sorting for player (disabled - player always on top)
        // playerMesh.renderOrder = getYRenderOrder(state.player.position.y, PLAYER_FOOT_OFFSET, true);

        // Update player outline — use smoothed elevation so it glides with the player sprite
        playerOutline.position.set(
          state.player.position.x,
          getPlayerVisualY(state.player.position.x, state.player.position.y),
          0.79 // Just below player
        );
        playerOutline.scale.set(visualScaleX * OUTLINE_PAD, visualScaleY * OUTLINE_PAD, 1);
        playerOutline.rotation.z = visualRotation;
        playerOutline.renderOrder = 999998; // Just below player

        // === NORMAL SWORD SWOOSH (synced to attackRange) ===
        if (swooshTimer > 0) {
          swooshTimer -= deltaTime;
          const progress = 1 - (swooshTimer / SWOOSH_DURATION);
          swooshMesh.visible = true;
          swooshMaterial.opacity = (1 - progress) * 0.35; // subtle
          // Scale to match attackRange
          const rangeScale = state.player.attackRange * 0.5;
          const swooshScale = rangeScale * (0.5 + progress * 0.7);
          swooshMesh.scale.set(swooshScale, swooshScale, 1);

          const swooshDirAngles: Record<string, number> = {
            up: Math.PI * 0.5,
            down: -Math.PI * 0.5,
            left: Math.PI,
            right: 0,
          };
          const baseAngle = swooshDirAngles[swooshFacing] ?? 0;
          // perfectly center the 135-deg arc (PI*0.75) across the facing direction:
          // start the geometry halfway back (-PI*0.375) so the arc's center matches baseAngle
          // add a minor 20% sweep progress to give it a swinging motion
          swooshMesh.rotation.z = baseAngle - Math.PI * 0.375 + (progress * 0.2);

          const swooshDist = state.player.attackRange * 0.4;
          const swooshOffsets: Record<string, {x: number, y: number}> = {
            up: {x: 0, y: swooshDist}, down: {x: 0, y: -swooshDist},
            left: {x: -swooshDist, y: 0}, right: {x: swooshDist, y: 0},
          };
          const sOff = swooshOffsets[swooshFacing] ?? {x: 0, y: 0};
          swooshMesh.position.set(
            state.player.position.x + attackOffsetX + sOff.x,
            getVisualYAt(state.player.position.x + attackOffsetX + sOff.x, state.player.position.y + attackOffsetY + sOff.y),
            0.3
          );
        } else {
          swooshMesh.visible = false;
        }

        // === SPIN ATTACK SWOOSH (full circle, synced to chargeRange) ===
        if (spinSwooshTimer > 0) {
          spinSwooshTimer -= deltaTime;
          const progress = 1 - (spinSwooshTimer / SPIN_SWOOSH_DURATION);
          spinSwooshMesh.visible = true;
          spinSwooshMaterial.opacity = (1 - progress) * 0.35;
          const chargeRange = state.player.attackRange * 1.5;
          const spinScale = chargeRange * (0.3 + progress * 0.7);
          spinSwooshMesh.scale.set(spinScale, spinScale, 1);
          spinSwooshMesh.rotation.z = progress * Math.PI * 2;
          spinSwooshMesh.position.set(
            playerVisualX,
            playerVisualY,
            0.3
          );
        } else {
          spinSwooshMesh.visible = false;
        }

        // Player damage flash
        if (state.player.damageFlashTimer > 0) {
          if (state.player.damageFlashTimer > 0.28) {
            screenShake.shake(0.18, 0.12);
          }
          state.player.damageFlashTimer -= deltaTime;
          const flashIntensity = Math.sin(state.player.damageFlashTimer * 30) > 0 ? 0xff0000 : 0xff6666;
          playerMaterial.color.setHex(flashIntensity);

          // Floating damage text on player when hit
          if (state.player.damageFlashTimer > 0.25) {
            // Show the damage amount the first frame
          }
        } else if (state.player.isDodging) {
          playerMaterial.opacity = 0.6;
        } else if (isChargingAttack && chargeLevel > 0) {
          playerMaterial.opacity = 1;
        } else {
          playerMaterial.opacity = 1;
        }

        // Smooth camera follow — uses the smoothed elevation so camera glides with the player
        cameraTarget.x = state.player.position.x;
        cameraTarget.y = getPlayerVisualY(state.player.position.x, state.player.position.y);

        // === INTERACTION INDICATOR ===
        // Priority: interactable objects first (bonfires, signs, chests) → portals → NPCs.
        // This prevents an NPC behind a campfire from stealing the indicator.
        let showIndicator = false;
        let indicatorX = 0, indicatorY = 0;
        const interactionRange = 2.0;

        const directions = [
          { x: 0, y: 0 }, { x: 0, y: 1 }, { x: 0, y: -1 }, { x: 1, y: 0 }, { x: -1, y: 0 }
        ];
        for (const dir of directions) {
          const cx = state.player.position.x + dir.x * 0.5;
          const cy = state.player.position.y + dir.y * 0.5;
          const intId = world.getInteractableAt(cx, cy);
          if (intId) {
            if (CRITICAL_ITEM_INTERACTION_IDS.has(intId) && state.getFlag(criticalPathItems[intId].collectedFlag)) continue;
            if (intId === 'building_entrance') {
              const entryTile = world.getTile(cx, cy);
              const isEntranceTile =
                entryTile?.type === 'door' ||
                entryTile?.type === 'door_iron';
              if (!isEntranceTile || !world.getTransitionAt(cx, cy)) continue;
            }
            if (intId.includes('chest') && state.getFlag(`${intId}_opened`)) continue;
            if (intId === 'potion_pickup' && state.getFlag('potion_pickup_collected')) continue;
            showIndicator = true;
            indicatorX = cx;
            indicatorY = cy;
            break;
          }
        }

        if (!showIndicator) {
          const portalHint = samplePortalNearPlayer();
          if (portalHint && isPortalDestinationUnlocked(portalHint.targetMap)) {
            showIndicator = true;
            const portalDir = directions.find(dir => {
              const cx = state.player.position.x + dir.x * 0.7;
              const cy = state.player.position.y + dir.y * 0.7;
              return world.getTransitionAt(cx, cy) !== null;
            }) || directions[0];
            indicatorX = state.player.position.x + portalDir.x * 0.7;
            indicatorY = state.player.position.y + portalDir.y * 0.7;
          }
        }

        if (!showIndicator) {
          const interactionRangeSq = interactionRange * interactionRange;
          let closestDistSq = interactionRangeSq;
          for (const npc of state.npcs) {
            const ndx = state.player.position.x - npc.position.x;
            const ndy = state.player.position.y - npc.position.y;
            const distSq = ndx * ndx + ndy * ndy;
            if (distSq < closestDistSq) {
              closestDistSq = distSq;
              showIndicator = true;
              indicatorX = npc.position.x;
              indicatorY = npc.position.y;
            }
          }
        }

        if (showIndicator) {
          indicatorMesh.visible = true;
          const bobY = Math.sin(currentTime / 200) * 0.12;
          const pulse = 0.7 + Math.sin(currentTime / 300) * 0.3;
          indicatorMesh.position.set(indicatorX, getVisualYAt(indicatorX, indicatorY) + 0.8 + bobY, 0.5);
          indicatorMaterial.opacity = pulse;
          indicatorMesh.scale.set(0.8 + Math.sin(currentTime / 250) * 0.15, 0.8 + Math.sin(currentTime / 250) * 0.15, 1);
        } else {
          indicatorMesh.visible = false;
        }

        const criticalItemVisualSignature = getCriticalItemVisualSignature();
        if (criticalItemVisualSignature !== lastCriticalItemVisualSignature) {
          rebuildCriticalItemVisuals();
          lastCriticalItemVisualSignature = criticalItemVisualSignature;
        }

        criticalItemGlowAccumulator += deltaTime;
        criticalItemVisualGroup.children.forEach((child, index) => {
          const group = child as THREE.Group;
          const baseX = group.userData.baseX as number;
          const baseY = group.userData.baseY as number;
          const bobAmplitude = group.userData.bobAmplitude as number;
          const hoverHeight = group.userData.hoverHeight as number;
          const glowColor = group.userData.glowColor as number;
          const bob = Math.sin(currentTime / 280 + index * 0.9) * bobAmplitude;
          const pulse = 0.78 + Math.sin(currentTime / 220 + index * 0.7) * 0.22;
          group.position.set(baseX, getVisualYAt(baseX, baseY) + hoverHeight + bob, 0);
          group.children.forEach((meshChild, meshIndex) => {
            if (!(meshChild instanceof THREE.Mesh)) return;
            const material = meshChild.material as THREE.MeshBasicMaterial;
            material.opacity = meshIndex === 0 ? 0.15 + pulse * 0.18 : 0.92;
            if (meshIndex === 0) {
              meshChild.scale.setScalar(0.94 + pulse * 0.12);
            }
            meshChild.updateMatrix();
          });
          group.updateMatrixWorld();
          if (criticalItemGlowAccumulator >= 0.18) {
            _tmpVec3.set(baseX, getVisualYAt(baseX, baseY) + hoverHeight, 0.45);
            particleSystem.emit(_tmpVec3, 2, glowColor, 0.55, 0.22, 0.7);
          }
        });
        if (criticalItemGlowAccumulator >= 0.18) {
          criticalItemGlowAccumulator = 0;
        }

        if (transitionDebug && currentTime - lastTransitionDebugRefreshAt > 180) {
          rebuildTransitionDebugMarkers();
          lastTransitionDebugRefreshAt = currentTime;
        }

        const stain = state.droppedEssence;
        if (stain && stain.mapId === state.currentMap && stain.amount > 0) {
          essenceOrbMesh.visible = true;
          const orbY = getVisualYAt(stain.x, stain.y) + 0.75 + Math.sin(currentTime / 280) * 0.08;
          essenceOrbMesh.position.set(stain.x, orbY, 0.55);
          essenceOrbMaterial.opacity = 0.78 + Math.sin(currentTime / 350) * 0.18;
          const s = 0.9 + Math.sin(currentTime / 200) * 0.12;
          essenceOrbMesh.scale.set(s, s, 1);
        } else {
          essenceOrbMesh.visible = false;
        }

        const lerpFactor = 1 - Math.pow(0.001, deltaTime);
        camera.position.x += (cameraTarget.x - camera.position.x) * lerpFactor;
        camera.position.y += (cameraTarget.y - camera.position.y) * lerpFactor;

        // === PORTAL PROXIMITY: charge-up, particles, vignette, auto-travel (no key press) ===
        const PORTAL_CHARGE_SEC = 1.12;
        const vignette = portalVignetteRef.current;
        const px = state.player.position.x;
        const py = state.player.position.y;

        if (portalCooldown > 0 || state.dialogueActive || playerDeadRef.current || mapModalOpenRef.current) {
          portalWarpCharge = 0;
          portalParticleAcc = 0;
          blockedPortalHintTimer = 0;
          if (vignette) {
            vignette.style.opacity = '0';
          }
        } else {
          const nearPortal = samplePortalNearPlayer();
          if (nearPortal) {
            if (!isPortalDestinationUnlocked(nearPortal.targetMap)) {
              portalWarpCharge = Math.max(0, portalWarpCharge - deltaTime * 2.8);
              blockedPortalHintTimer += deltaTime;
              if (vignette) {
                const pulse = 0.18 + Math.sin(currentTime * 0.006) * 0.06;
                vignette.style.opacity = String(pulse);
                vignette.style.background =
                  'radial-gradient(circle at 50% 52%, rgba(140,30,70,0.55) 0%, rgba(40,0,60,0.5) 50%, transparent 72%)';
              }
              portalParticleAcc += deltaTime;
              if (portalParticleAcc > 0.14) {
                portalParticleAcc = 0;
                _tmpVec3.set(px, py + 0.45, 0.28);
                particleSystem.emitPortalBlocked(_tmpVec3);
              }
              if (blockedPortalHintTimer > 0.5 && currentTime - lastBarrierToastAt > 9000) {
                lastBarrierToastAt = currentTime;
                blockedPortalHintTimer = 0;
                notify('Magical barrier blocks this portal', {
                  id: 'portal-barrier',
                  description: 'Complete the right quest to unlock this route.',
                  duration: 4500,
                });
              }
            } else {
              blockedPortalHintTimer = 0;
              portalWarpCharge = Math.min(1, portalWarpCharge + deltaTime / PORTAL_CHARGE_SEC);
              if (vignette) {
                const o = portalWarpCharge * (0.42 + Math.sin(currentTime * 0.01) * 0.08);
                vignette.style.opacity = String(Math.min(0.68, o));
                vignette.style.background =
                  'radial-gradient(circle at 50% 46%, rgba(200,120,255,0.55) 0%, rgba(80,40,200,0.4) 38%, rgba(0,220,200,0.2) 62%, transparent 82%)';
              }
              portalParticleAcc += deltaTime;
              const emitEvery = Math.max(0.028, 0.055 - portalWarpCharge * 0.028);
              if (portalParticleAcc >= emitEvery) {
                portalParticleAcc = 0;
                _tmpVec3.set(
                  px + (Math.random() - 0.5) * 0.25,
                  py + 0.4 + Math.random() * 0.2,
                  0.22
                );
                particleSystem.emitPortalWarp(_tmpVec3, portalWarpCharge);
              }
              camera.position.x += Math.sin(currentTime * 0.009) * 0.038 * portalWarpCharge;
              camera.position.y += Math.cos(currentTime * 0.011) * 0.024 * portalWarpCharge;

              if (portalWarpCharge >= 1) {
                portalWarpCharge = 0;
                portalParticleAcc = 0;
                if (vignette) vignette.style.opacity = '0';
                handleMapTransition(nearPortal.targetMap, nearPortal.targetX, nearPortal.targetY);
              }
            }
          } else {
            portalWarpCharge = Math.max(0, portalWarpCharge - deltaTime * 2.4);
            portalParticleAcc = 0;
            blockedPortalHintTimer = 0;
            if (vignette) vignette.style.opacity = '0';
          }
        }

        // Update combat system
        const combatResult = combatSystem.updateEnemies(deltaTime, state.player.position, state.player.iFrameTimer > 0, isBlocking, blockStartTime, world);
        
        // Handle parry success
        if (combatResult.parried && combatResult.parryEnemyId) {
          const parriedEnemy = combatSystem.getEnemies().find(e => e.id === combatResult.parryEnemyId);
          if (parriedEnemy) {
            floatingText.spawnDamage(parriedEnemy.position.x, parriedEnemy.position.y, 0, false);
            screenShake.shake(0.3, 0.1);
            screenShake.hitStop(0.08);
          }
        }

        // === ENEMY RENDERING WITH HP BARS ===
        const enemies = combatSystem.getEnemies();
        for (const enemy of enemies) {
          let enemyMesh = enemyMeshes.get(enemy.id);
          
          if (!enemyMesh) {
            const enemyGeometry = SharedGeometry.enemy;
            const enemyTexture = assetManager.getTexture(enemy.sprite);
            const enemyMaterial = new THREE.MeshBasicMaterial({
              map: enemyTexture,
              transparent: true,
              depthWrite: false,
            });
            enemyMesh = new THREE.Mesh(enemyGeometry, enemyMaterial);
            enemyMesh.position.z = 0.2;
            enemyMesh.renderOrder = getActorRenderOrder(enemy.position.x, enemy.position.y, 0);
            scene.add(enemyMesh);
            enemyMeshes.set(enemy.id, enemyMesh);

            // Enemy shadow
            const eShadow = new THREE.Mesh(shadowGeometry, shadowMaterial.clone());
            const enemyType2 = enemy.sprite.replace('enemy_', '');
            const eVisual = ENEMY_VISUALS[enemyType2] ?? ENEMY_VISUALS.wolf;
            eShadow.scale.set(eVisual.baseScale * 0.6, eVisual.baseScale * 0.25, 1);
            eShadow.renderOrder = 1;
            scene.add(eShadow);
            enemyShadows.set(enemy.id, eShadow);

            // Enemy outline
            const eOutline = createOutlineMesh(enemyGeometry, enemyTexture);
            eOutline.position.z = 0.19;
            scene.add(eOutline);
            enemyOutlines.set(enemy.id, eOutline);
          }

          const mat = enemyMesh.material as THREE.MeshBasicMaterial;

          const enemyType = enemy.sprite.replace('enemy_', '');
          const visual = ENEMY_VISUALS[enemyType] ?? ENEMY_VISUALS.wolf;
          const seed = parseFloat(enemy.id.split('_')[1] || "0") * 0.001;

          let spriteKey = enemy.sprite;
          if (enemyType === 'bandit') {
            const banditState = enemy.state === 'telegraphing'
              ? 'charge'
              : enemy.state === 'recovering' && enemy.attackAnimationTimer > 0
                ? 'attack'
                : enemy.moveBlend > 0.25
                  ? 'walk'
                  : 'idle';
            const banditFrame = banditState === 'walk'
              ? Math.floor(enemy.moveCycle * 2.4) % 2
              : banditState === 'charge'
                ? Math.min(2, Math.floor((1 - enemy.telegraphTimer / enemy.telegraphDuration) * 3))
                : banditState === 'attack'
                  ? 1
                  : 0;
            spriteKey = `enemy_bandit_${enemy.facing as CardinalDirection}_${banditState}_${banditFrame}`;
          } else if (enemy.state === 'telegraphing') {
            spriteKey = `${enemy.sprite}_telegraph`;
          } else if (enemy.state === 'recovering' && enemy.attackAnimationTimer > 0) {
            spriteKey = `${enemy.sprite}_attack`;
          }

          let enemyTex = assetManager.getTexture(spriteKey);
          if (!enemyTex) {
            const fallbackKey = enemy.state === 'telegraphing'
              ? `${enemy.sprite}_telegraph`
              : enemy.state === 'recovering' && enemy.attackAnimationTimer > 0
                ? `${enemy.sprite}_attack`
                : enemy.sprite;
            enemyTex = assetManager.getTexture(fallbackKey);
          }
          if (enemyTex && mat.map !== enemyTex) {
            mat.map = enemyTex;
          }

          if (enemy.damageFlashTimer > 0) {
            enemy.damageFlashTimer -= deltaTime;
            mat.color.setHex(0xff0000);
          } else if (enemy.state === 'telegraphing') {
            const flashPhase = (enemy.telegraphTimer / enemy.telegraphDuration);
            const flash = Math.sin(flashPhase * Math.PI * 6) * 0.3 + 0.7;
            mat.color.setRGB(1, flash, flash);
          } else if (enemy.state === 'staggered') {
            mat.color.setHex(0xaaaaee);
          } else {
            mat.color.setHex(0xffffff);
          }

          let finalEnemyX = enemy.position.x;
          let finalEnemyY = getVisualYAt(enemy.position.x, enemy.position.y);
          let scaleX = visual.baseScale;
          let scaleY = visual.baseScale;
          let rotation = 0;
          const moveWave = Math.sin(enemy.moveCycle);
          const stride = Math.abs(moveWave) * enemy.moveBlend;
          const lateralBias = Math.abs(enemy.velocity.x) > 0.001 ? Math.sign(enemy.velocity.x) : 0;

          if (enemy.state === 'chasing' || enemy.moveBlend > 0.2) {
            finalEnemyY += stride * visual.bobAmp;
            finalEnemyX += moveWave * visual.strideAmp * (enemyType === 'spider' ? 1 : lateralBias * 0.5);
            scaleX *= 1 - stride * visual.squashAmp;
            scaleY *= 1 + stride * visual.squashAmp * 1.35;
            rotation = moveWave * visual.leanAmp * (lateralBias !== 0 ? lateralBias : 1);

            switch (enemyType) {
              case 'shadow':
                finalEnemyY += Math.sin(currentTime / 180 + seed) * 0.05;
                finalEnemyX += Math.cos(currentTime / 220 + seed) * 0.025;
                scaleX *= 1 + stride * 0.02;
                scaleY *= 1 - stride * 0.02;
                rotation *= 0.4;
                break;
              case 'slime':
                finalEnemyY += stride * 0.02;
                scaleX *= 1 + stride * 0.08;
                scaleY *= 1 - stride * 0.08;
                rotation = moveWave * 0.015;
                break;
              case 'spider':
                finalEnemyY += Math.sin(enemy.moveCycle * 2) * 0.012;
                rotation = moveWave * 0.03;
                break;
              case 'golem':
                finalEnemyY += stride * 0.03;
                scaleX *= 1 + stride * 0.03;
                scaleY *= 1 - stride * 0.04;
                rotation *= 0.35;
                break;
              case 'plant':
                finalEnemyX += Math.sin(currentTime / 260 + seed) * 0.02;
                rotation = moveWave * 0.025;
                break;
            }
          } else if (enemy.state === 'telegraphing') {
            // Movement-based telegraph: wind-up crouch + lean toward player
            const telegraphProgress = 1 - (enemy.telegraphTimer / enemy.telegraphDuration);
            const dx = state.player.position.x - enemy.position.x;
            const dy = state.player.position.y - enemy.position.y;
            const dist = Math.sqrt(dx * dx + dy * dy) || 1;
            
            // Crouch down (squash vertically, widen)
            scaleX *= 1 + telegraphProgress * 0.15;
            scaleY *= 1 - telegraphProgress * 0.12;
            
            // Lean toward player (wind-up)
            const windUpDist = telegraphProgress * 0.15;
            finalEnemyX += (dx / dist) * -windUpDist; // pull BACK first
            finalEnemyY += (dy / dist) * -windUpDist;
            
            // Increasing vibration
            const shakeIntensity = 0.03 * telegraphProgress * telegraphProgress;
            finalEnemyX += Math.sin(currentTime / 25 + seed) * shakeIntensity;
            finalEnemyY += Math.cos(currentTime / 30 + seed) * shakeIntensity;
            
            // Tilt toward player
            rotation = Math.atan2(dy, dx) * 0.08 * telegraphProgress;
          } else if (enemy.state === 'recovering') {
            if (enemy.attackAnimationTimer > 0) {
              enemy.attackAnimationTimer -= deltaTime;
              const dx = state.player.position.x - enemy.position.x;
              const dy = state.player.position.y - enemy.position.y;
              const dist = Math.sqrt(dx * dx + dy * dy);
              if (dist > 0) {
                const lungeProgress = enemy.attackAnimationTimer / 0.3;
                const lungeDistance = Math.sin(lungeProgress * Math.PI) * 0.4;
                finalEnemyX += (dx / dist) * lungeDistance;
                finalEnemyY += (dy / dist) * lungeDistance;
              }
            }
            const recoverProgress = enemy.recoverTimer / enemy.recoverDuration;
            scaleX *= 0.92 + recoverProgress * 0.08;
            scaleY *= 0.88 + recoverProgress * 0.12;
            rotation = Math.sin(currentTime / 90 + seed) * 0.02;
            // No glow — just show the recoil posture
          } else {
            const breathe = Math.sin(currentTime / 800 + seed * 3);
            if (enemyType === 'shadow') {
              finalEnemyY += breathe * 0.05;
              finalEnemyX += Math.cos(currentTime / 900 + seed) * 0.02;
              scaleX *= 1 + breathe * 0.012;
              scaleY *= 1 - breathe * 0.012;
            } else if (enemyType === 'slime') {
              finalEnemyY += Math.abs(breathe) * 0.025;
              scaleX *= 1 + Math.abs(breathe) * 0.04;
              scaleY *= 1 - Math.abs(breathe) * 0.04;
            } else if (enemyType === 'spider') {
              finalEnemyX += breathe * 0.015;
              rotation = breathe * 0.02;
            } else {
              finalEnemyY += breathe * 0.02;
              scaleX *= 1 + breathe * 0.015;
              scaleY *= 1 - breathe * 0.015;
            }
          }

          enemyMesh.rotation.z = rotation;
          enemyMesh.scale.set(scaleX, scaleY, 1);
          enemyMesh.position.set(finalEnemyX, finalEnemyY, 0.2);
          enemyMesh.renderOrder = getActorRenderOrder(enemy.position.x, enemy.position.y, visual.footOffset);

          // Update enemy shadow
          const eShadow = enemyShadows.get(enemy.id);
          if (eShadow) {
            eShadow.position.set(finalEnemyX, finalEnemyY - visual.footOffset * 0.7, 0.05);
          }

          // Update enemy outline
          const eOutline = enemyOutlines.get(enemy.id);
          if (eOutline) {
            eOutline.position.set(finalEnemyX, finalEnemyY, 0.19);
            eOutline.scale.set(scaleX * OUTLINE_PAD, scaleY * OUTLINE_PAD, 1);
            eOutline.rotation.z = rotation;
            eOutline.renderOrder = enemyMesh.renderOrder - 1;
          }

          // === HP BAR ===
          const hpBar = getOrCreateHPBar(enemy);
          const hpRatio = enemy.health / enemy.maxHealth;
          const barY = finalEnemyY + visual.hpBarOffset;
          
          hpBar.bg.position.set(finalEnemyX, barY, 0.35);
          hpBar.fill.position.set(finalEnemyX - 0.29 * (1 - hpRatio), barY, 0.36);
          hpBar.fill.scale.set(hpRatio, 1, 1);
          hpBar.bg.renderOrder = 10000;
          hpBar.fill.renderOrder = 10001;

          const fillMat = hpBar.fill.material as THREE.MeshBasicMaterial;
          if (hpRatio > 0.5) fillMat.color.setHex(0x4CAF50);
          else if (hpRatio > 0.25) fillMat.color.setHex(0xFFC107);
          else fillMat.color.setHex(0xF44336);

          // Always show HP bar when enemy is in range and visible
          const showBar = true;
          hpBar.bg.visible = showBar;
          hpBar.fill.visible = showBar;
        }

        // Handle dying enemies
        const allEnemies = combatSystem.getAllEnemies();
        const fullyDeadEnemyIds = new Set<string>();

        for (const enemy of allEnemies) {
          if (enemy.state === 'dead') {
            const mesh = enemyMeshes.get(enemy.id);
            if (mesh) {
              mesh.scale.x *= 0.9;
              mesh.scale.y *= 0.9;
              const deadMat = mesh.material as THREE.MeshBasicMaterial;
              deadMat.opacity -= 0.05;

              if (deadMat.opacity <= 0) {
                scene.remove(mesh);
                deadMat.dispose();
                enemyMeshes.delete(enemy.id);

                const hpBar = enemyHPBars.get(enemy.id);
                if (hpBar) {
                  scene.remove(hpBar.bg);
                  scene.remove(hpBar.fill);
                  (hpBar.bg.material as THREE.Material).dispose();
                  (hpBar.fill.material as THREE.Material).dispose();
                  enemyHPBars.delete(enemy.id);
                }

                const eShadow = enemyShadows.get(enemy.id);
                if (eShadow) {
                  scene.remove(eShadow);
                  (eShadow.material as THREE.Material).dispose();
                  enemyShadows.delete(enemy.id);
                }

                const eOutlineDeath = enemyOutlines.get(enemy.id);
                if (eOutlineDeath) {
                  scene.remove(eOutlineDeath);
                  (eOutlineDeath.material as THREE.Material).dispose();
                  enemyOutlines.delete(enemy.id);
                }

                fullyDeadEnemyIds.add(enemy.id);
              }
            } else {
              fullyDeadEnemyIds.add(enemy.id);
            }

            const hpBar = enemyHPBars.get(enemy.id);
            if (hpBar) {
              hpBar.bg.visible = false;
              hpBar.fill.visible = false;
            }

            const eShadow = enemyShadows.get(enemy.id);
            if (eShadow) {
              eShadow.visible = false;
            }
            const eOutlineDead = enemyOutlines.get(enemy.id);
            if (eOutlineDead) {
              eOutlineDead.visible = false;
            }
          }
        }

        if (fullyDeadEnemyIds.size > 0) {
          combatSystem.removeDeadEnemiesByIds(Array.from(fullyDeadEnemyIds));
        }

        // Check if player died — drop essence bloodstain
        if (state.player.health <= 0 && !playerDeadRef.current) {
          playerDeadRef.current = true;
          playGameOverSound();
          const lost = state.player.essence;
          if (lost > 0) {
            state.droppedEssence = {
              mapId: state.currentMap,
              x: state.player.position.x,
              y: state.player.position.y,
              amount: lost,
            };
            state.player.essence = 0;
          } else {
            state.droppedEssence = null;
          }
          setDeathEssenceLost(lost);
          setDeathActive(true);
        }
      }

      world.updateChunks(state.player.position.x, state.player.position.y);

      // Project active NPC world pos to screen for chat bubble + walk-away detection
      if (activeNpcWorldPos.current && state.dialogueActive) {
        // Close dialogue if player walks too far from NPC
        const nwx = activeNpcWorldPos.current.x;
        const nwy = activeNpcWorldPos.current.y;
        const pdx = state.player.position.x - nwx;
        const pdy = state.player.position.y - nwy;
        const npcDistSq = pdx * pdx + pdy * pdy;
        const DIALOGUE_BREAK_DIST = 4; // tiles
        if (npcDistSq > DIALOGUE_BREAK_DIST * DIALOGUE_BREAK_DIST) {
          state.dialogueActive = false;
          state.currentDialogue = null;
          activeNpcWorldPos.current = null;
          setCurrentDialogue(null);
          setNpcScreenPos(null);
        } else {
          _worldPosVec3.set(nwx, getVisualYAt(nwx, nwy) + 1.2, 0);
          _worldPosVec3.project(camera);
          const sx = (_worldPosVec3.x * 0.5 + 0.5) * renderer.domElement.clientWidth;
          const sy = (-_worldPosVec3.y * 0.5 + 0.5) * renderer.domElement.clientHeight;
          const elapsed = currentTime - lastNpcScreenUpdate;
          const moved =
            Math.abs(sx - lastNpcProjected.x) >= NPC_SCREEN_MIN_PX ||
            Math.abs(sy - lastNpcProjected.y) >= NPC_SCREEN_MIN_PX;
          if (elapsed >= NPC_SCREEN_MIN_MS || moved) {
            lastNpcScreenUpdate = currentTime;
            lastNpcProjected.x = sx;
            lastNpcProjected.y = sy;
            setNpcScreenPos({ x: sx, y: sy });
          }
        }
      }

      // Update systems
      const currentBiome = mapBiomes[state.currentMap] || 'grassland';
      biomeAmbience.update(deltaTime, state.player.position.x, state.player.position.y);
      weatherSystem.update(deltaTime, state.player.position.x, state.player.position.y, currentBiome);
      dayNightCycle.update(deltaTime, state.player.position.x, state.player.position.y);
      floatingText.update(deltaTime);
      particleSystem.update(deltaTime);
      
      // Auto-save every 30 seconds
      if (currentTime - lastAutoSaveTime >= AUTO_SAVE_INTERVAL) {
        lastAutoSaveTime = currentTime;
        triggerSave();
      }
      
      renderer.render(scene, camera);
    };

    deathRespawnFnRef.current = () => {
      const st = gameStateRef.current;
      const w = worldRef.current;
      if (!st || !w) return;
      const cam = cameraRef.current;
      st.player.health = st.player.maxHealth;
      st.player.stamina = st.player.maxStamina;
      st.player.isDodging = false;
      st.player.iFrameTimer = 0;

      // Give player 2 health potions on respawn
      const potionCount = st.inventory.filter(i => i.id === 'health_potion').length;
      if (potionCount < 2) {
        while (st.inventory.filter(i => i.id === 'health_potion').length < 2) {
          st.addItem({ ...items.health_potion });
        }
      }

      let lb = st.lastBonfire;
      if (!lb) {
        const sp = w.getSpawnPoint();
        lb = { mapId: st.currentMap, x: sp.x, y: sp.y };
        st.lastBonfire = lb;
      }

      const targetMap = lb.mapId;
      const newMap = allMaps[targetMap];
      if (!newMap) return;

      if (st.currentMap !== targetMap) {
        st.currentMap = targetMap;
        w.loadMap(newMap);
        setActiveNpcsForCurrentMap();
        if (!targetMap.startsWith('interior_')) {
          biomeAmbience.setBiome(mapBiomes[targetMap] || 'grassland');
          switchMusicTrack(targetMap);
        }
      }

      syncShadowCastleGateState();

      st.player.position = { x: lb.x, y: lb.y };
      playerSmoothedElevation = w.getElevationAt(lb.x, lb.y);
      const pvy = lb.y + playerSmoothedElevation * World.ELEVATION_Y_OFFSET;
      playerMesh.position.set(lb.x, pvy, 0.8);
      cameraTarget.x = lb.x;
      cameraTarget.y = pvy;
      if (cam) {
        cam.position.x = lb.x;
        cam.position.y = pvy;
      }

      combatSystem.clearAllEnemies();
      disposeEnemyMeshes();
      assetManager.warmupEnemyTexturesForZones(mapDefinitions[targetMap]?.enemyZones);
      spawnEnemiesFromMapZones(targetMap, w.getCurrentMap(), combatSystem, w);

      w.rebuildChunks();
      w.updateChunks(lb.x, lb.y);
      activeNpcWorldPos.current = null;
      setCurrentDialogue(null);
      setNpcScreenPos(null);
      triggerSave();
      triggerUIUpdate();
      triggerMinimapUpdate(true);
    };

    animate();

    cancelEnemyPrewarm = assetManager.startBackgroundEnemyPrewarm(() => disposed);

    if (!savedData) {
      effectTimeouts.push(
        setTimeout(() => {
          if (disposed) return;
          notify("The Village Elder looks deeply troubled...", {
            description: "Perhaps you should speak with him. (Press F to interact)",
            duration: 8000,
          });
          addMarkersFromText("Village Elder", state.currentMap);
        }, 1000)
      );
    } else {
      notify("Progress restored.", { id: 'save-load', duration: 3000 });
    }

    return () => {
      disposed = true;
      cancelEnemyPrewarm?.();
      cancelAnimationFrame(rafId);
      effectTimeouts.forEach(clearTimeout);
      effectTimeouts.length = 0;
      if (portalVignetteRef.current) {
        portalVignetteRef.current.style.opacity = '0';
      }
      gameStateRef.current = null;
      worldRef.current = null;
      assetManagerRef.current = null;
      cameraRef.current = null;
      rendererRef.current = null;

      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('resize', handleResize);
      renderer.domElement.removeEventListener('mousedown', handleMouseDown);
      renderer.domElement.removeEventListener('mouseup', handleMouseUp);
      renderer.domElement.removeEventListener('contextmenu', handleContextMenu);
      if (mountRef.current && renderer.domElement.parentNode === mountRef.current) {
        mountRef.current.removeChild(renderer.domElement);
      }
      // Dispose all enemy objects
      enemyMeshes.forEach(m => { scene.remove(m); (m.material as THREE.Material).dispose(); });
      enemyShadows.forEach(m => { scene.remove(m); (m.material as THREE.Material).dispose(); });
      enemyOutlines.forEach(m => { scene.remove(m); (m.material as THREE.Material).dispose(); });
      enemyHPBars.forEach(({ bg, fill }) => {
        scene.remove(bg); scene.remove(fill);
        (bg.material as THREE.Material).dispose();
        (fill.material as THREE.Material).dispose();
      });
      // Dispose player + NPC objects
      scene.remove(playerMesh); (playerMesh.material as THREE.Material).dispose();
      scene.remove(playerShadow); (playerShadow.material as THREE.Material).dispose();
      scene.remove(playerOutline); (playerOutline.material as THREE.Material).dispose();
      scene.remove(heldItemMesh); (heldItemMesh.material as THREE.Material).dispose();
      scene.remove(essenceOrbMesh); essenceOrbMaterial.dispose();
      scene.remove(transitionDebugGroup);
      clearTransitionDebugMarkers();
      transitionDebugGeometry.dispose();
      transitionDebugMaterials.entrance.dispose();
      transitionDebugMaterials.exit.dispose();
      transitionDebugMaterials.portal.dispose();
      transitionDebugMaterials.other.dispose();
      scene.remove(swooshMesh); swooshMaterial.dispose();
      scene.remove(spinSwooshMesh); spinSwooshMaterial.dispose();
      disposeCriticalItemVisuals();
      scene.remove(criticalItemVisualGroup);
      npcMeshes.forEach(m => { scene.remove(m); (m.material as THREE.Material).dispose(); });
      npcShadows.forEach(m => { scene.remove(m); (m.material as THREE.Material).dispose(); });
      npcOutlines.forEach(m => { scene.remove(m); (m.material as THREE.Material).dispose(); });
      // Dispose systems
      particleSystem.cleanup();
      biomeAmbience.cleanup();
      weatherSystem.cleanup();
      dayNightCycle.cleanup();
      floatingText.cleanup();
      world.dispose();
      renderer.dispose();
    };
  }, []);

  const handleDialogueResponse = (nextId: string, givesQuest?: string) => {
    if (!gameState || !currentDialogue) return;

    if (givesQuest && quests[givesQuest]) {
      const quest = { ...quests[givesQuest], active: true };
      gameState.addQuest(quest);
      notify(`Quest Accepted: ${quest.title}`, {
        id: `quest-accept-${quest.id}`, type: 'success',
        description: quest.description,
        duration: 6000,
      });
      // Extract markers from quest description
      addMarkersFromText(quest.description, gameState.currentMap);
      quest.objectives.forEach(obj => addMarkersFromText(obj, gameState.currentMap));
      if (givesQuest === 'merchants_request') {
        const mq = gameState.quests.find(q => q.id === 'merchants_request');
        if (mq) {
          const n = gameState.inventory.filter(i => i.id === 'moonbloom').length;
          const c = Math.min(n, 3);
          mq.objectives[0] = `Find Moonbloom flowers (${c}/3)`;
          if (n >= 3) mq.objectives[0] = 'Find Moonbloom flowers (3/3) ✓';
        }
      }
      triggerUIUpdate();
      // Save on quest accept
      SaveManager.save(gameState, mapMarkersRef.current, visitedTilesRef.current);
    }

    // Merchant buy logic
    if (gameState.currentDialogue === 'merchant') {
      if (nextId === 'end' && currentDialogue.node.id === 'buy_potion') {
        if (gameState.player.gold >= 10) {
          gameState.player.gold -= 10;
          gameState.addItem(items.health_potion);
          notify('Purchased Health Potion!', { type: 'success', description: 'Spent 10 gold.', duration: 2500 });
        } else {
          notify("Not enough gold!", { id: 'no-gold', type: 'error', duration: 2000 });
        }
        triggerUIUpdate();
      }
      if (nextId === 'end' && currentDialogue.node.id === 'buy_artifact') {
        if (gameState.player.gold >= 50) {
          gameState.player.gold -= 50;
          gameState.addItem(items.ancient_map);
          notify('Purchased Ancient Artifact!', { type: 'success', description: 'Spent 50 gold.', duration: 2500 });
        } else {
          notify("Not enough gold!", { id: 'no-gold', type: 'error', duration: 2000 });
        }
        triggerUIUpdate();
      }
    }

    // Quest completion from hunter_clue dialogue
    if (gameState.currentDialogue === 'hunter_clue' && nextId === 'complete_quest') {
      const manuscriptConfig = criticalPathItems.hunter_clue;
      if (!gameState.getFlag(manuscriptConfig.collectedFlag)) {
        gameState.setFlag(manuscriptConfig.collectedFlag, true);
        if (!gameState.hasItem(manuscriptConfig.itemId)) {
          gameState.addItem({ ...items[manuscriptConfig.itemId] });
        }
        notify("Hunter's Manuscript Acquired", {
          id: 'hunters-manuscript',
          type: 'success',
          description: 'The loose pages may be the clue the Elder needs.',
          duration: 3600,
        });
      }
      const hunterQuest = gameState.quests.find(q => q.id === 'find_hunter' && q.active && !q.completed);
      if (hunterQuest) {
        hunterQuest.objectives[2] = 'Defeat the forest threat ✓';
        gameState.completeQuest('find_hunter');
        notify("Quest Completed: The Missing Hunter!", {
          id: 'quest-done-hunter', type: 'success',
          description: "Return to the Elder to report your findings.",
          duration: 6000,
        });
        // Add marker for village
        addMarkersFromText("Village Elder", "village");
        triggerUIUpdate();
        triggerMinimapUpdate(true);
      }
    }

    // Healer free heal
    if (gameState.currentDialogue === 'healer' && nextId === 'end' && currentDialogue.node.id === 'heal') {
      gameState.player.health = gameState.player.maxHealth;
      triggerUIUpdate();
    }

    if (gameState.currentDialogue === 'witch_hut_lore' && nextId === 'lore') {
      const dq = gameState.quests.find(q => q.id === 'clear_deep_woods' && q.active && !q.completed);
      if (dq) {
        dq.objectives[2] = 'Learn about the dark magic ✓';
      }
      triggerUIUpdate();
    }

    if (
      gameState.currentDialogue === 'witch_sign' &&
      nextId === 'end' &&
      currentDialogue.node.id === 'start' &&
      gameState.currentMap === 'deep_woods'
    ) {
      const dq = gameState.quests.find(q => q.id === 'clear_deep_woods' && q.active && !q.completed);
      if (dq) {
        dq.objectives[1] = 'Find the witch\'s hut ✓';
      }
      triggerUIUpdate();
    }

    if (gameState.currentDialogue === 'elder' && nextId === 'end' && currentDialogue.node.id === 'elder_deep_done') {
      const dq = gameState.quests.find(q => q.id === 'clear_deep_woods' && q.active && !q.completed);
      if (dq) {
        dq.objectives[3] = 'Return to the elder ✓';
        gameState.completeQuest('clear_deep_woods');
        notify('Quest Completed: Into the Depths!', {
          id: 'quest-done-depths', type: 'success',
          description: 'The village is safer for your courage.',
          duration: 6000,
        });
        triggerUIUpdate();
        triggerMinimapUpdate(true);
      }
    }

    if (gameState.currentDialogue === 'guard' && nextId === 'end' && currentDialogue.node.id === 'guard_turnin') {
      const gq = gameState.quests.find(q => q.id === 'guard_duty' && q.active && !q.completed);
      if (gq && gq.objectives[1]?.includes('✓')) {
        gq.objectives[2] = 'Report back to the guard ✓';
        gameState.completeQuest('guard_duty');
        notify('Quest Completed: Guard Duty!', {
          id: 'quest-done-guard', type: 'success',
          description: 'The border is a little quieter tonight.',
          duration: 6000,
        });
        triggerUIUpdate();
      }
    }

    if (gameState.currentDialogue === 'merchant' && nextId === 'end' && currentDialogue.node.id === 'merchant_moonbloom_deliver') {
      const mq = gameState.quests.find(q => q.id === 'merchants_request' && q.active && !q.completed);
      const moonCount = gameState.inventory.filter(i => i.id === 'moonbloom').length;
      if (mq && moonCount >= 3) {
        for (let i = 0; i < 3; i++) {
          gameState.removeItem('moonbloom');
        }
        mq.objectives[1] = 'Return to the merchant ✓';
        gameState.completeQuest('merchants_request');
        notify("Quest Completed: Merchant's Rare Goods!", {
          id: 'quest-done-merchant', type: 'success',
          description: 'Your purse grows heavier.',
          duration: 6000,
        });
        triggerUIUpdate();
      }
    }

    if (nextId === 'end' || !gameState.currentDialogue) {
      setCurrentDialogue(null);
      setNpcScreenPos(null);
      activeNpcWorldPos.current = null;
      gameState.dialogueActive = false;
      gameState.currentDialogue = null;
      // Save on dialogue end
      SaveManager.save(gameState, mapMarkersRef.current, visitedTilesRef.current);
      return;
    }

    const dialogue = dialogues[gameState.currentDialogue];
    const nextNode = dialogue.nodes.find(n => n.id === nextId);
    
    if (nextNode) {
      setCurrentDialogue({ node: nextNode, npcName: currentDialogue.npcName });
      // Extract map markers from new dialogue text
      addMarkersFromText(nextNode.text, gameState.currentMap);
    }
  };

  const handleCloseDialogue = () => {
    if (gameState) {
      gameState.dialogueActive = false;
      gameState.currentDialogue = null;
    }
    setCurrentDialogue(null);
    setNpcScreenPos(null);
    activeNpcWorldPos.current = null;
  };

  const handleDeathComplete = useCallback(() => {
    setDeathActive(false);
    playerDeadRef.current = false;
    deathRespawnFnRef.current?.();
  }, []);

  // Music system with per-map tracks
  const musicRef = useRef<HTMLAudioElement | null>(null);
  const musicStarted = useRef(false);
  const currentTrackRef = useRef<string>('');
  const switchMusicTrackRef = useRef<(mapId: string) => void>(() => {});

  const MAP_MUSIC_MAP: Record<string, string> = {
    village: './audio/ortho_loop2.mp3',  // Village theme
    forest: './audio/wood_theme.mp3',    // Whispering Woods
    deep_woods: './audio/wood_theme.mp3',
    ruins: './audio/wood_theme.mp3',
  };
  const DEFAULT_MUSIC_TRACK = './audio/ortho_loop2.mp3';

  // Debug: Log music switching
  switchMusicTrackRef.current = (mapId: string) => {
    console.log(`[Music] Switching to: ${mapId}`);
    const track = MAP_MUSIC_MAP[mapId] || DEFAULT_MUSIC_TRACK;
    console.log(`[Music] Track: ${track}`);
    if (currentTrackRef.current === track) {
      console.log(`[Music] Same track, skipping`);
      return;
    }
    currentTrackRef.current = track;
    const audio = musicRef.current;
    if (!audio) return;
    const wasMuted = audio.muted;
    audio.pause();
    audio.src = track;
    audio.loop = true;
    audio.volume = 0.15;
    audio.muted = wasMuted;
    
    // Process new audio through compression and gain chain
    processAudioElement(audio);
    
    if (musicStarted.current) {
      audio.play().catch(() => {});
    }
  };

  // Stable reference for use in effects
  const switchMusicTrack = useCallback((mapId: string) => {
    switchMusicTrackRef.current(mapId);
  }, []);

  useEffect(() => {
    const currentMap = gameStateRef.current?.currentMap || 'village';
    const startTrack = MAP_MUSIC_MAP[currentMap] || DEFAULT_MUSIC_TRACK;
    const audio = new Audio(startTrack);
    audio.loop = true;
    audio.volume = 0.15;
    
    // Process audio through compression and gain chain
    processAudioElement(audio);
    
    musicRef.current = audio;
    currentTrackRef.current = startTrack;

    const tryPlay = () => {
      if (!musicRef.current) return;
      const a = musicRef.current;
      if (a.paused) {
        a.play().catch(() => {});
      }
    };

    const startMusic = () => {
      musicStarted.current = true;
      // Sync to the correct track for current map
      const map = gameStateRef.current?.currentMap || 'village';
      const correctTrack = MAP_MUSIC_MAP[map] || DEFAULT_MUSIC_TRACK;
      if (currentTrackRef.current !== correctTrack) {
        audio.src = correctTrack;
        currentTrackRef.current = correctTrack;
      }
      tryPlay();
    };

    // Attempt autoplay immediately; browsers may block this inside iframes.
    // If blocked, we try again on any game interaction
    const startMusicOnAction = () => {
      if (!musicStarted.current && musicRef.current) {
        musicStarted.current = true;
        musicRef.current.play().catch(() => {});
      }
    };
    
    audio.play().then(() => {
      musicStarted.current = true;
    }).catch(() => {
      // If autoplay fails, attach listeners to iframe and parent for better coverage
      const iframe = document.querySelector('iframe');
      const container = document.getElementById('game-container');
      
      const startOnInteraction = () => {
        if (!musicStarted.current) {
          startMusicOnAction();
        }
      };
      
      // Listen on various targets for maximum coverage
      if (window) {
        window.addEventListener('click', startOnInteraction, { once: true });
        window.addEventListener('keydown', startOnInteraction, { once: true });
        window.addEventListener('touchstart', startOnInteraction, { once: true });
      }
      if (document) {
        document.addEventListener('click', startOnInteraction, { once: true });
        document.addEventListener('keydown', startOnInteraction, { once: true });
      }
      if (container) {
        container.addEventListener('click', startOnInteraction, { once: true });
        container.addEventListener('keydown', startOnInteraction, { once: true });
      }
      if (iframe) {
        iframe.addEventListener('load', startOnInteraction, { once: true });
      }
    });

    // Kick audio if it stops due to browser throttling when tab regains focus
    const onVisibility = () => {
      if (!document.hidden) tryPlay();
    };
    document.addEventListener('visibilitychange', onVisibility);

    // Cleanup function
    return () => {
      if (audioContextRef.current) {
        audioContextRef.current.close();
        audioContextRef.current = null;
      }
      if (musicRef.current) {
        musicRef.current.pause();
        musicRef.current = null;
      }
      audio.pause();
      audio.src = '';
      window.removeEventListener('click', startMusic);
      window.removeEventListener('keydown', startMusic);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, []);

  const activeQuestTitle = gameState?.quests.find(q => q.active && !q.completed)?.title;

  return (
    <div className="relative w-full h-screen overflow-hidden">
      <div
        ref={portalVignetteRef}
        className="pointer-events-none fixed inset-0 z-[35]"
        style={{ opacity: 0, mixBlendMode: 'screen', transition: 'opacity 120ms ease-out' }}
        aria-hidden
      />
      <div ref={mountRef} className="w-full h-full" />
      
      {gameState && (
        <>
          <GameUI gameState={gameState} assetManager={assetManagerRef.current} refreshToken={uiVersion} triggerUIUpdate={triggerUIUpdate} musicRef={musicRef} showControls={showControls} />
          {transitionDebugEnabled && (
            <div className="fixed left-4 top-16 z-[80] max-w-md border border-[#5C3A21] bg-[#1A0F0A]/92 p-2 text-[11px] text-[#F5DEB3] shadow-lg pointer-events-none">
              <div className="font-bold text-[#FFD27A]">TRANSITION DEBUG (V)</div>
              {transitionDebugLines.length > 0 ? (
                transitionDebugLines.map((line, idx) => (
                  <div key={`td-${idx}`} className="font-mono leading-4">{line}</div>
                ))
              ) : (
                <div className="font-mono leading-4 text-[#C8B18A]">No nearby transitions in scan radius.</div>
              )}
            </div>
          )}
          <div className="fixed top-16 right-4 z-30 flex flex-col gap-2 pointer-events-none">
            <Minimap
              currentMap={allMaps[gameState.currentMap]}
              currentMapId={gameState.currentMap}
              gameStateRef={gameStateRef}
              visitedTilesRef={visitedTilesRef}
              mapMarkersRef={mapMarkersRef}
              markers={mapMarkers}
              refreshToken={minimapVersion}
            />
            <NotificationFeed />
          </div>
          <MapModal
            open={mapModalOpen}
            onOpenChange={setMapModalOpen}
            currentMap={allMaps[gameState.currentMap]}
            currentMapId={gameState.currentMap}
            gameStateRef={gameStateRef}
            visitedTilesRef={visitedTilesRef}
            mapMarkersRef={mapMarkersRef}
            markers={mapMarkers}
            refreshToken={minimapVersion}
          />
        </>
      )}
      
      {currentDialogue && (
        <DialogueBox
          node={currentDialogue.node}
          npcName={currentDialogue.npcName}
          npcScreenPos={npcScreenPos}
          onResponse={handleDialogueResponse}
          onClose={handleCloseDialogue}
        />
      )}

      {isPaused && (
        <PauseMenu
          onResume={() => { pausedRef.current = false; setIsPaused(false); }}
          questSummary={activeQuestTitle}
        />
      )}

      <TransitionOverlay active={transitionActive} mapName={transitionMapName} />
      <DeathOverlay active={deathActive} essenceLost={deathEssenceLost} onComplete={handleDeathComplete} />
    </div>
  );
};

export default Game;
