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
import { DialogueBox } from './game/DialogueBox';
import { GameUI } from './game/GameUI';
import { Minimap } from './game/Minimap';
import { PauseMenu } from './game/PauseMenu';
import { TransitionOverlay } from './game/TransitionOverlay';
import { DeathOverlay } from './game/DeathOverlay';
import { toast } from 'sonner';

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
  const [deathGoldLost, setDeathGoldLost] = useState(0);
  const [showControls, setShowControls] = useState(true);
  const pausedRef = useRef(false);
  const playerDeadRef = useRef(false);
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

  const triggerUIUpdate = () => setUiVersion(prev => prev + 1);
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
    if (!mountRef.current) return;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x87ceeb);

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
      alpha: true, // Enable transparency support
      premultipliedAlpha: false // Disable premultiplied alpha
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
    const world = new World(scene, assetManager, allMaps[startMap] || allMaps.village);
    worldRef.current = world;
    
    if (savedData) {
      state.currentMap = savedData.currentMap;
      state.player.position = { ...savedData.player.position };
      state.player.direction = savedData.player.direction as any;
      state.player.health = savedData.player.health;
      state.player.maxHealth = savedData.player.maxHealth;
      state.player.gold = savedData.player.gold;
      state.player.attackDamage = savedData.player.attackDamage;
      state.player.stamina = savedData.player.stamina;
      state.player.maxStamina = savedData.player.maxStamina;
      state.inventory = savedData.inventory;
      
      const hasMeekSword = state.inventory.some(i => i.id === 'meek_short_sword');
      if (!hasMeekSword && !state.inventory.some(i => i.type === 'equipment')) {
        state.inventory.unshift({
          id: 'meek_short_sword',
          name: 'Meek Short Sword',
          description: 'A simple, reliable starting blade. Press space to swing.',
          type: 'equipment',
          sprite: 'sword',
        });
      }
      state.activeItemIndex = 0;

      state.quests = savedData.quests;
      state.gameFlags = savedData.gameFlags;
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
    }
    
    world.updateChunks(state.player.position.x, state.player.position.y);
    
    // Spawn enemies for the initial map
    const initialMapDef = mapDefinitions[state.currentMap];
    if (initialMapDef?.enemyZones) {
      console.log(`[Spawn] Loading enemies for initial map ${state.currentMap}, zones: ${initialMapDef.enemyZones.length}`);
      for (const zone of initialMapDef.enemyZones) {
        const blueprint = ENEMY_BLUEPRINTS[zone.enemyType] || DEFAULT_ENEMY;
        console.log(`[Spawn] Zone: ${zone.enemyType}, count: ${zone.count}, pos: (${zone.x}, ${zone.y})`);
        
        for (let i = 0; i < zone.count; i++) {
          const ex = (zone.x + Math.random() * zone.width) - initialMapDef.width / 2;
          const ey = (zone.y + Math.random() * zone.height) - initialMapDef.height / 2;
          combatSystem.spawnEnemy(
            blueprint.name, 
            { x: ex, y: ey }, 
            blueprint.hp, 
            blueprint.damage, 
            blueprint.sprite
          );
        }
      }
      console.log(`[Spawn] Total enemies spawned: ${combatSystem.getEnemies().length}`);
    }
    
    let lastAutoSaveTime = performance.now();
    const AUTO_SAVE_INTERVAL = 30000; // 30 seconds

    const enemyMeshes = new Map<string, THREE.Mesh>();
    const enemyShadows = new Map<string, THREE.Mesh>();
    const enemyOutlines = new Map<string, THREE.Mesh>();
    const enemyHPBars = new Map<string, { bg: THREE.Mesh; fill: THREE.Mesh }>();
    const cameraTarget = { x: state.player.position.x, y: state.player.position.y };

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

    let footstepTimer = 0;
    const footstepInterval = 0.3;
    let lastTime = performance.now();
    const MAX_DELTA = 0.1;
    let portalCooldown = 0;

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
    let playerAnimState: 'idle' | 'walk' | 'attack' | 'dodge' | 'charge' | 'hurt' | 'spin_attack' | 'drinking' = 'idle';
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
    let chargeLevel = 0;

    // Spin attack animation state
    const SPIN_DIRECTIONS: Direction8[] = ['down', 'left', 'up', 'right'];
    let spinDirIndex = 0;
    let spinFrameTimer = 0;
    const SPIN_FRAME_DURATION = 0.06;

    // Blocking state
    let isBlocking = false;
    let isRMBHeld = false; // Track if right mouse button is held
    let blockAngle = 0; // For smooth block animation
    const BLOCK_DAMAGE_REDUCTION = 0.6; // Reduce incoming damage by 60% when blocking
    const BLOCK_STAMINA_COST = 2; // Stamina cost per second while blocking

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
      ruins: 'ruins',
    };

    // Set biome for loaded map
    biomeAmbience.setBiome(mapBiomes[startMap] || 'grassland');

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

    const handleMapTransition = (targetMap: string, targetX: number, targetY: number) => {
      console.log(`[MapTransition] Starting transition to ${targetMap} at (${targetX}, ${targetY})`);
      
      // Block deep_woods portal unless clear_deep_woods quest is active
      if (targetMap === 'deep_woods') {
        const deepQuest = state.quests.find(q => q.id === 'clear_deep_woods' && q.active);
        if (!deepQuest) {
          toast("You sense a magical barrier blocking the path. The ancient magic must be stronger elsewhere first.", {
            className: "rpg-toast font-bold text-lg",
          });
          return;
        }
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
      setTimeout(() => setTransitionActive(false), 800); // trigger re-render

      state.currentMap = targetMap;
      world.loadMap(newMap);
      biomeAmbience.setBiome(mapBiomes[targetMap] || 'grassland');
      switchMusicTrack(targetMap);
      triggerSave(); // Save on map transition
      
      const worldX = targetX - newMap.width / 2;
      const worldY = targetY - newMap.height / 2;
      
      state.player.position = { x: worldX, y: worldY };
      playerMesh.position.set(worldX, worldY, 0.2);
      cameraTarget.x = worldX;
      cameraTarget.y = worldY;
      camera.position.x = worldX;
      camera.position.y = worldY;
      world.updateChunks(worldX, worldY);

      combatSystem.clearAllEnemies();
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

      const mapDef = mapDefinitions[targetMap];
      console.log(`[Spawn] mapDefinitions[${targetMap}] = `, mapDef);
      if (mapDef?.enemyZones) {
        console.log(`[Spawn] Loading enemies for ${targetMap}, zones: ${mapDef.enemyZones.length}`);
        for (const zone of mapDef.enemyZones) {
          const blueprint = ENEMY_BLUEPRINTS[zone.enemyType] || DEFAULT_ENEMY;
          console.log(`[Spawn] Zone: ${zone.enemyType}, count: ${zone.count}, pos: (${zone.x}, ${zone.y})`);
          
          for (let i = 0; i < zone.count; i++) {
            const ex = (zone.x + Math.random() * zone.width) - newMap.width / 2;
            const ey = (zone.y + Math.random() * zone.height) - newMap.height / 2;
            combatSystem.spawnEnemy(
              blueprint.name, 
              { x: ex, y: ey }, 
              blueprint.hp, 
              blueprint.damage, 
              blueprint.sprite
            );
          }
        }
        console.log(`[Spawn] Total enemies spawned: ${combatSystem.getEnemies().length}`);
      } else {
        console.log(`[Spawn] No enemy zones defined for ${targetMap}`);
      }

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
      
      // When returning to village after completing first quest, start second quest
      if (targetMap === 'village') {
        const completedHunter = state.quests.find(q => q.id === 'find_hunter' && q.completed);
        const deepQuest = state.quests.find(q => q.id === 'clear_deep_woods');
        
        if (completedHunter && deepQuest && !deepQuest.active && !deepQuest.completed) {
          // Start the second quest
          deepQuest.active = true;
          triggerUIUpdate();
          toast("New quest available: Into the Depths", {
            className: "rpg-toast font-bold text-lg",
            duration: 5000,
          });
        }
      }

      toast(`Entered ${newMap.name}`, {
        className: "rpg-toast font-bold text-lg text-center justify-center",
        duration: 3000,
      });
      visitedTilesRef.current = new Set();
      triggerMinimapUpdate(true);
      triggerUIUpdate();
      portalCooldown = 0.5;
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
    playerMesh.position.set(state.player.position.x, state.player.position.y, 0.8); // Higher Z to be above world objects
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
      { id: 'elder', name: 'Village Elder', position: { x: -18, y: -10 }, dialogueId: 'elder', sprite: 'npc_elder', questGiver: true },
      { id: 'merchant', name: 'Traveling Merchant', position: { x: 20, y: -2 }, dialogueId: 'merchant', sprite: 'npc_merchant' },
      { id: 'guard', name: 'Village Guard', position: { x: 0, y: 5 }, dialogueId: 'guard', sprite: 'npc_guard' },
      { id: 'blacksmith', name: 'Blacksmith', position: { x: 35, y: -8 }, dialogueId: 'blacksmith', sprite: 'npc_blacksmith' },
      { id: 'healer', name: 'Healer', position: { x: -10, y: 15 }, dialogueId: 'healer', sprite: 'npc_healer' },
      { id: 'farmer', name: 'Old Farmer', position: { x: -40, y: -30 }, dialogueId: 'farmer', sprite: 'npc_farmer' },
      { id: 'child', name: 'Village Child', position: { x: 5, y: -5 }, dialogueId: 'child', sprite: 'npc_child' },
    ];

    // NPC wandering state
    const npcWander: Record<string, {
      origin: { x: number; y: number };
      angle: number;
      radius: number;
      speed: number;
      pauseTimer: number;
      isPaused: boolean;
    }> = {};
    for (const npc of npcData) {
      npcWander[npc.id] = {
        origin: { ...npc.position },
        angle: Math.random() * Math.PI * 2,
        radius: npc.id === 'guard' ? 3 : npc.id === 'child' ? 4 : 1.5,
        speed: npc.id === 'child' ? 1.2 : npc.id === 'guard' ? 0.8 : 0.5,
        pauseTimer: Math.random() * 3,
        isPaused: true,
      };
    }

    state.npcs = npcData;
    const npcMeshes: THREE.Mesh[] = [];
    const npcShadows: THREE.Mesh[] = [];
    const npcOutlines: THREE.Mesh[] = [];

    npcData.forEach(npc => {
      // NPC shadow
      const npcShadow = new THREE.Mesh(shadowGeometry, shadowMaterial.clone());
      npcShadow.position.set(npc.position.x, npc.position.y - 0.3, 0.05);
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
      npcMesh.position.set(npc.position.x, npc.position.y, 0.2);
      npcMesh.scale.set(npcScale, npcScale, 1);
      npcMesh.renderOrder = getYRenderOrder(npc.position.y, NPC_FOOT_OFFSET, true);
      npcMesh.userData = { npcId: npc.id };
      scene.add(npcMesh);
      npcMeshes.push(npcMesh);

      // NPC outline
      const npcOutline = createOutlineMesh(npcGeometry, npcTexture);
      npcOutline.position.set(npc.position.x, npc.position.y, 0.19);
      npcOutline.scale.set(npcScale * OUTLINE_PAD, npcScale * OUTLINE_PAD, 1);
      npcOutline.renderOrder = npcMesh.renderOrder - 1;
      scene.add(npcOutline);
      npcOutlines.push(npcOutline);
    });

    const keys: { [key: string]: boolean } = {};
    let interactBuffered = false;
    let dodgeBuffered = false;
    let potionBuffered = false;

    const handleKeyDown = (e: KeyboardEvent) => {
      // ESC: close dialogue first, then toggle pause
      if (e.key === 'Escape') {
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
      if (pausedRef.current) return;

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
          triggerUIUpdate();
        }
      }
      if (e.key === ' ' && !state.dialogueActive) {
        e.preventDefault();
        const activeItem = state.inventory[state.activeItemIndex];
        if (activeItem?.type === 'consumable') {
          if (activeItem.id === 'health_potion') {
            if (state.player.health >= state.player.maxHealth) {
              toast('Already at full health!', { className: 'rpg-toast' });
              return;
            }
            // Start drinking animation and restore health
            playerAnimState = 'drinking';
            drinkTimer = DRINK_DURATION;
            state.player.health = Math.min(state.player.maxHealth, state.player.health + 50);
            state.removeItem(activeItem.id);
            toast.success('Used Health Potion!', { description: 'Restored 50 health.', className: 'rpg-toast' });
            if (state.activeItemIndex >= state.inventory.length) {
              state.activeItemIndex = Math.max(0, state.inventory.length - 1);
            }
            triggerUIUpdate();
          }
        } else {
          // Space now triggers dodge roll
          dodgeBuffered = true;
        }
      }
      if (e.key === 'Control' && !state.dialogueActive) {
        // Ctrl now triggers block
        if (!isBlocking && !state.player.isDodging && state.player.stamina > 0) {
          isBlocking = true;
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
      state.player.dodgeDirection = { x: dx, y: dy };
      state.player.lastDodgeTime = now;
      state.player.stamina -= 25;
      state.player.lastStaminaUseTime = now / 1000;
      playerAnimState = 'dodge';
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

    const onEnemyKilled = (enemy: Enemy) => {
      killCount++;
      playDeathSound();
      // Update guard_duty quest kill counter
      const guardQuest = state.quests.find(q => q.id === 'guard_duty' && q.active && !q.completed);
      if (guardQuest) {
        const kills = Math.min(killCount, 5);
        guardQuest.objectives[1] = `Defeat any hostile creatures (${kills}/5)`;
        if (kills >= 5) {
          guardQuest.objectives[1] = 'Defeat any hostile creatures (5/5) ✓';
        }
      }
      toast(`Defeated ${enemy.name}!`, {
        description: `Gained ${enemy.goldReward} gold.`,
        className: "rpg-toast",
      });
      triggerUIUpdate();
    };

    const performAttack = () => {
      const currentTime = Date.now();
      if (currentTime - state.player.lastAttackTime < state.player.attackCooldown) return;
      if (state.player.isDodging) return;
      if (isBlocking) {
        // Cancel block when attacking
        isBlocking = false;
      }
      playSwordSwing();
      playBladeSheath();
      swooshTimer = SWOOSH_DURATION;
      swooshFacing = dir8to4(currentDir8); // Capture direction at the moment of the attack

      state.player.lastAttackTime = currentTime;
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

        const died = combatSystem.playerAttack(target, state.player.attackDamage);

        const isCrit = target.state === 'recovering';
        const actualDmg = isCrit ? Math.floor(state.player.attackDamage * 1.5) : state.player.attackDamage;
        floatingText.spawnDamage(target.position.x, target.position.y, actualDmg, isCrit);
        screenShake.shake(isCrit ? 0.2 : 0.1, isCrit ? 0.15 : 0.08);
        if (isCrit) screenShake.hitStop(0.05);

        particleSystem.emitDamage(
          new THREE.Vector3(target.position.x, target.position.y, 0.3)
        );

        if (died) {
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
      if (state.player.isDodging) return;
      playSwordSwing();
      playBladeSheath();
      spinSwooshTimer = SPIN_SWOOSH_DURATION; // trigger spin swoosh

      state.player.lastAttackTime = currentTime;
      playerAnimState = 'spin_attack';
      spinDirIndex = 0;
      spinFrameTimer = SPIN_FRAME_DURATION;
      attackFrame = 1;
      state.player.attackAnimationTimer = SPIN_FRAME_DURATION * SPIN_DIRECTIONS.length;

      const dmgMult = 1 + (CHARGE_DAMAGE_MULT - 1) * level;
      const chargeDamage = Math.floor(state.player.attackDamage * dmgMult);
      const chargeRange = state.player.attackRange * (1 + level * 0.5);

      const enemiesInRange = combatSystem.getEnemiesInRange(
        state.player.position,
        chargeRange
      );

      if (enemiesInRange.length > 0) {
        for (const target of enemiesInRange) {
          const died = combatSystem.playerAttack(target, chargeDamage);

          floatingText.spawnDamage(target.position.x, target.position.y, chargeDamage, true);
          screenShake.shake(0.25, 0.2);
          screenShake.hitStop(0.06);

          particleSystem.emitDamage(
            new THREE.Vector3(target.position.x, target.position.y, 0.3)
          );
          particleSystem.emitSparkles(
            new THREE.Vector3(target.position.x, target.position.y + 0.3, 0.5)
          );

          if (died) {
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
        toast('No potions!', { className: 'rpg-toast' });
        return;
      }
      if (state.player.health >= state.player.maxHealth) {
        toast('Already at full health!', { className: 'rpg-toast' });
        return;
      }
      state.player.health = Math.min(state.player.maxHealth, state.player.health + 50);
      state.inventory.splice(potionIdx, 1);
      particleSystem.emitHeal(new THREE.Vector3(state.player.position.x, state.player.position.y, 0.3));
      toast.success('Used Health Potion!', { description: 'Restored 50 health.', className: 'rpg-toast' });
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

      // Check nearby portal tiles and trigger transition on F press
      for (const dir of [
        { x: 0, y: 0 }, { x: 0, y: 1 }, { x: 0, y: -1 }, { x: 1, y: 0 }, { x: -1, y: 0 }
      ]) {
        const portalTransition = world.getTransitionAt(
          checkX + dir.x * 0.7,
          checkY + dir.y * 0.7
        );
        if (portalTransition) {
          handleMapTransition(portalTransition.targetMap, portalTransition.targetX, portalTransition.targetY);
          return;
        }
      }

      const directions = [
        { x: 0, y: 1 }, { x: 0, y: -1 }, { x: 1, y: 0 }, { x: -1, y: 0 }
      ];

      for (const dir of directions) {
        const interactionId = world.getInteractableAt(
          checkX + dir.x * 0.5,
          checkY + dir.y * 0.5
        );
        
        if (interactionId) {
          if (interactionId.includes('chest') && !state.getFlag(`${interactionId}_opened`)) {
            const goldAmount = interactionId.includes('ancient') ? 100 : 
                             interactionId.includes('ruins') ? 75 :
                             interactionId.includes('wolf') || interactionId.includes('shadow') ? 60 :
                             interactionId.includes('hidden') ? 50 : 
                             interactionId.includes('forest') ? 40 : 20;
            state.player.gold += goldAmount;
            if (items.health_potion) state.addItem(items.health_potion);
            state.setFlag(`${interactionId}_opened`, true);
            particleSystem.emitSparkles(new THREE.Vector3(checkX + dir.x * 0.5, checkY + dir.y * 0.5, 0.3));
            toast.success('Chest Opened!', {
              description: `Found ${goldAmount} gold and a Health Potion.`,
              className: "rpg-toast",
            });
            triggerUIUpdate();
            return;
          }

          // Potion ground pickups
          if (interactionId === 'potion_pickup') {
            const pickupKey = `potion_${state.currentMap}_${Math.round(checkX + dir.x * 0.5)}_${Math.round(checkY + dir.y * 0.5)}`;
            if (!state.getFlag(pickupKey)) {
              state.setFlag(pickupKey, true);
              if (items.health_potion) state.addItem(items.health_potion);
              particleSystem.emitSparkles(new THREE.Vector3(checkX + dir.x * 0.5, checkY + dir.y * 0.5, 0.3));
              toast.success('Found a Health Potion!', {
                description: 'Added to your inventory.',
                className: "rpg-toast",
              });
              triggerUIUpdate();
              SaveManager.save(state, mapMarkersRef.current, visitedTilesRef.current);
              return;
            }
          }
          
          // Healing sources with cooldown
          if (interactionId === 'well' || interactionId === 'fountain' || interactionId === 'ancient_fountain' || interactionId === 'healing_mushroom' || interactionId === 'campfire') {
            const now = Date.now();
            const lastUse = healCooldowns.current.get(interactionId) || 0;
            if (now - lastUse < HEAL_COOLDOWN_MS) {
              const remaining = Math.ceil((HEAL_COOLDOWN_MS - (now - lastUse)) / 1000);
              toast(`Not ready yet... (${remaining}s)`, { className: 'rpg-toast' });
              return;
            }
            if (state.player.health >= state.player.maxHealth) {
              toast('Already at full health!', { className: 'rpg-toast' });
              return;
            }
            healCooldowns.current.set(interactionId, now);
            state.player.health = Math.min(state.player.maxHealth, state.player.health + 25);
            particleSystem.emitHeal(new THREE.Vector3(checkX, checkY, 0.3));
            const label = interactionId === 'campfire' ? 'Resting by the Fire' : 
                         interactionId === 'healing_mushroom' ? 'Mushroom Energy!' : 'Refreshing Water!';
            toast.success(label, {
              description: 'Health restored.',
              className: "rpg-toast",
            });
            triggerUIUpdate();
            return;
          }
          
          if (dialogues[interactionId]) {
            startDialogue(interactionId, undefined);
            return;
          }
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
        if (hunterQuest?.completed) {
          startNode = dialogue.nodes.find(n => n.id === 'quest_complete');
        } else if (hunterQuest?.active) {
          startNode = dialogue.nodes.find(n => n.id === 'quest_active');
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
      if (pausedRef.current) return;
      
      if (e.button === 0) {
        // Left click - attack/charge
        if (!state.dialogueActive && !state.player.isDodging) {
          const activeItem = state.inventory[state.activeItemIndex];
          if (activeItem?.type === 'consumable') {
            // LMB with consumable selected - use it
            if (activeItem.id === 'health_potion') {
              if (state.player.health >= state.player.maxHealth) {
                toast('Already at full health!', { className: 'rpg-toast' });
                return;
              }
              playerAnimState = 'drinking';
              drinkTimer = DRINK_DURATION;
              state.player.health = Math.min(state.player.maxHealth, state.player.health + 50);
              state.removeItem(activeItem.id);
              toast.success('Used Health Potion!', { description: 'Restored 50 health.', className: 'rpg-toast' });
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
          if (playerAnimState !== 'attack' && playerAnimState !== 'spin_attack' && playerAnimState !== 'drinking' && playerAnimState !== 'block') {
            playerAnimState = 'block';
          }
        }
      }
    };

    const handleMouseUp = (e: MouseEvent) => {
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

    // ============= ANIMATION LOOP =============
    const animate = () => {
      requestAnimationFrame(animate);

      const currentTime = performance.now();
      let deltaTime = (currentTime - lastTime) / 1000;
      lastTime = currentTime;
      if (deltaTime > MAX_DELTA) deltaTime = MAX_DELTA;

      // Skip game logic when paused
      if (pausedRef.current) {
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
      if (nowSec - state.player.lastStaminaUseTime > state.player.staminaRegenDelay) {
        const prevStamina = state.player.stamina;
        state.player.stamina = Math.min(state.player.maxStamina, state.player.stamina + state.player.staminaRegenRate * deltaTime);
        if (Math.floor(state.player.stamina) !== Math.floor(prevStamina)) {
          triggerUIUpdate();
        }
      }

      // Blocking stamina drain
      if (isBlocking) {
        if (state.player.stamina <= 0) {
          // Out of stamina - release block
          isBlocking = false;
          if (playerAnimState === 'block') {
            playerAnimState = 'idle';
          }
        } else {
          // Drain stamina while blocking
          state.player.stamina = Math.max(0, state.player.stamina - BLOCK_STAMINA_COST * deltaTime);
          state.player.lastStaminaUseTime = nowSec;
        }
      }

      // Smooth block angle animation
      const targetBlockAngle = isBlocking ? 0.3 : 0;
      blockAngle += (targetBlockAngle - blockAngle) * Math.min(1, deltaTime * 15);

    // === NPC WANDERING ===
      for (let ni = 0; ni < npcData.length; ni++) {
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
            npcMesh.position.set(npc.position.x, npc.position.y + breathe, 0.2);
            npcMesh.scale.set(npcScale, npcScale, 1);
            npcMesh.rotation.z = 0;
            npcMesh.renderOrder = getYRenderOrder(npc.position.y, NPC_FOOT_OFFSET, true);
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
            if (world.isWalkable(nx, ny)) {
              npc.position.x = nx;
              npc.position.y = ny;
            } else {
              wander.angle += Math.PI * 0.5;
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

          npcMesh.position.set(npc.position.x, npc.position.y + bob, 0.2);
          npcMesh.scale.set(
            npcScale * (1 - stride * 0.025),
            npcScale * (1 + stride * 0.05),
            1
          );
          npcMesh.rotation.z = lean;
          npcMesh.renderOrder = getYRenderOrder(npc.position.y, NPC_FOOT_OFFSET, true);

          // Update NPC shadow
          const npcShadow = npcShadows[ni];
          if (npcShadow) {
            npcShadow.position.set(npc.position.x, npc.position.y - 0.3, 0.05);
          }
          // Update NPC outline
          const npcOutline = npcOutlines[ni];
          if (npcOutline) {
            npcOutline.position.set(npc.position.x, npc.position.y + bob, 0.19);
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
        chargeTimer += deltaTime;
        chargeLevel = Math.min(1, Math.max(0, (chargeTimer - CHARGE_TIME_MIN) / (CHARGE_TIME_MAX - CHARGE_TIME_MIN)));
        playerAnimState = 'charge';
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
          if (world.isWalkable(newPos.x, newPos.y, 0.2)) {
            state.player.position = newPos;
          }
          world.updateChunks(state.player.position.x, state.player.position.y);

          if (state.player.dodgeTimer <= 0) {
            state.player.isDodging = false;
            playerAnimState = moved ? 'walk' : 'idle';
          }
        } else if (moved && !isChargingAttack && playerAnimState !== 'spin_attack') {
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

          if (world.isWalkable(newPos.x, newPos.y, 0.2)) {
            state.player.position = newPos;
          } else if (world.isWalkable(newPos.x, state.player.position.y, 0.2)) {
            state.player.position.x = newPos.x;
          } else if (world.isWalkable(state.player.position.x, newPos.y, 0.2)) {
            state.player.position.y = newPos.y;
          }

          world.updateChunks(state.player.position.x, state.player.position.y);
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

          if (portalCooldown > 0) {
            portalCooldown -= deltaTime;
          } else {
            const transition = world.getTransitionAt(state.player.position.x, state.player.position.y);
            if (transition) {
              handleMapTransition(transition.targetMap, transition.targetX, transition.targetY);
            }
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
          texName = getPlayerTextureName(currentDir8, 'attack', 2); // Use attack frame as holding pose
        } else {
          // Check if player is holding a consumable (show potion instead of sword)
          const activeItem = state.inventory[state.activeItemIndex];
          if (activeItem?.type === 'consumable') {
            // Show drinking hold pose when holding consumable
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
        } else if (isChargingAttack) {
          // Movement-based charge: crouch down and vibrate, no glow
          const crouchAmount = 0.08 * chargeLevel;
          const shakeAmt = chargeLevel * Math.sin(currentTime / 30) * 0.025;
          visualScaleX *= 1 + chargeLevel * 0.06;
          visualScaleY *= 1 - crouchAmount;
          attackOffsetX += shakeAmt;
          attackOffsetY -= crouchAmount * 0.3;
          visualRotation = 0;
        }

        // Color tinting for animations
        const outlineMat = playerOutline.material as THREE.MeshBasicMaterial;
        if (state.player.damageFlashTimer > 0) {
          playerMaterial.color.setHex(0xffaaaa);
          outlineMat.color.setHex(0xff0000);
        } else if (isChargingAttack) {
          const tint = new THREE.Color().setHSL(0.12, 1.0, 1.0 - (chargeLevel * 0.3)); // Shift to gold
          playerMaterial.color.copy(tint);
          outlineMat.color.setHex(0xffaa00);
        } else {
          playerMaterial.color.setHex(0xffffff);
          outlineMat.color.setHex(0x000000);
        }

        playerMesh.rotation.z = visualRotation;
        playerMesh.scale.set(visualScaleX, visualScaleY, 1);
        playerMesh.position.set(
          state.player.position.x + attackOffsetX,
          state.player.position.y + attackOffsetY,
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
            state.player.position.y + itemOffsetY,
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

        // Update player shadow
        playerShadow.position.set(
          state.player.position.x + attackOffsetX,
          state.player.position.y + attackOffsetY - 0.35,
          0.05
        );

        // Dynamic Y-sorting for player (disabled - player always on top)
        // playerMesh.renderOrder = getYRenderOrder(state.player.position.y, PLAYER_FOOT_OFFSET, true);

        // Update player outline
        playerOutline.position.set(
          state.player.position.x,
          state.player.position.y,
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
            state.player.position.y + attackOffsetY + sOff.y,
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
            state.player.position.x + attackOffsetX,
            state.player.position.y + attackOffsetY,
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

        // Smooth camera follow
        cameraTarget.x = state.player.position.x;
        cameraTarget.y = state.player.position.y;

        // === INTERACTION INDICATOR ===
        let showIndicator = false;
        let indicatorX = 0, indicatorY = 0;
        const interactionRange = 2.0;

        const interactionRangeSq = interactionRange * interactionRange;
        for (const npc of state.npcs) {
          const ndx = state.player.position.x - npc.position.x;
          const ndy = state.player.position.y - npc.position.y;
          const distSq = ndx * ndx + ndy * ndy;
          if (distSq < interactionRangeSq) {
            showIndicator = true;
            indicatorX = npc.position.x;
            indicatorY = npc.position.y;
            break;
          }
        }

        if (!showIndicator) {
          const directions = [
            { x: 0, y: 0 }, { x: 0, y: 1 }, { x: 0, y: -1 }, { x: 1, y: 0 }, { x: -1, y: 0 }
          ];
          for (const dir of directions) {
            const cx = state.player.position.x + dir.x * 0.5;
            const cy = state.player.position.y + dir.y * 0.5;
            const intId = world.getInteractableAt(cx, cy);
            if (intId) {
              // Don't show indicator for already-looted chests
              if (intId.includes('chest') && state.getFlag(`${intId}_opened`)) {
                continue;
              }
              // Don't show indicator for already-collected pickups
              if (intId === 'potion_pickup' && state.getFlag('potion_pickup_collected')) {
                continue;
              }
              showIndicator = true;
              indicatorX = state.player.position.x + dir.x * 0.5;
              indicatorY = state.player.position.y + dir.y * 0.5;
              break;
            }
          }
        }

        if (showIndicator) {
          indicatorMesh.visible = true;
          const bobY = Math.sin(currentTime / 200) * 0.12;
          const pulse = 0.7 + Math.sin(currentTime / 300) * 0.3;
          indicatorMesh.position.set(indicatorX, indicatorY + 0.8 + bobY, 0.5);
          indicatorMaterial.opacity = pulse;
          indicatorMesh.scale.set(0.8 + Math.sin(currentTime / 250) * 0.15, 0.8 + Math.sin(currentTime / 250) * 0.15, 1);
        } else {
          indicatorMesh.visible = false;
        }

        const lerpFactor = 1 - Math.pow(0.001, deltaTime);
        camera.position.x += (cameraTarget.x - camera.position.x) * lerpFactor;
        camera.position.y += (cameraTarget.y - camera.position.y) * lerpFactor;

        // Update combat system
        combatSystem.updateEnemies(deltaTime, state.player.position, state.player.isDodging, isBlocking);

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
            enemyMesh.renderOrder = getYRenderOrder(enemy.position.y, 0, true);
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
          } else {
            mat.color.setHex(0xffffff);
          }

          let finalEnemyX = enemy.position.x;
          let finalEnemyY = enemy.position.y;
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
          enemyMesh.renderOrder = getYRenderOrder(enemy.position.y, visual.footOffset, true);

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

        // Check if player died — death penalty
        if (state.player.health <= 0 && !playerDeadRef.current) {
          playerDeadRef.current = true;
          playDeathSound();
          const goldLoss = Math.floor(state.player.gold * 0.1);
          state.player.gold -= goldLoss;
          setDeathGoldLost(goldLoss);
          setDeathActive(true);
        }
      }

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
          _worldPosVec3.set(nwx, nwy + 1.2, 0);
          _worldPosVec3.project(camera);
          const sx = (_worldPosVec3.x * 0.5 + 0.5) * renderer.domElement.clientWidth;
          const sy = (-_worldPosVec3.y * 0.5 + 0.5) * renderer.domElement.clientHeight;
          setNpcScreenPos({ x: sx, y: sy });
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

    animate();

    if (!savedData) {
      setTimeout(() => {
        toast("The Village Elder looks deeply troubled...", {
          description: "Perhaps you should speak with him. (Press E to interact)",
          icon: "📜",
          duration: 8000,
          className: "rpg-toast",
        });
        // Ping the Elder's location on the minimap
        addMarkersFromText("Village Elder", state.currentMap);
      }, 1000);
    } else {
      toast("Progress restored.", { icon: "💾", duration: 3000, className: "rpg-toast" });
    }

    return () => {
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
      scene.remove(swooshMesh); swooshMaterial.dispose();
      scene.remove(spinSwooshMesh); spinSwooshMaterial.dispose();
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
      toast.success(`Quest Accepted: ${quest.title}`, {
        description: quest.description,
        icon: "📜",
        className: "rpg-toast",
        duration: 5000,
      });
      // Extract markers from quest description
      addMarkersFromText(quest.description, gameState.currentMap);
      quest.objectives.forEach(obj => addMarkersFromText(obj, gameState.currentMap));
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
          toast.success('Purchased Health Potion!', { description: 'Spent 10 gold.', className: 'rpg-toast' });
        } else {
          toast.error("Not enough gold!", { className: 'rpg-toast' });
        }
        triggerUIUpdate();
      }
      if (nextId === 'end' && currentDialogue.node.id === 'buy_artifact') {
        if (gameState.player.gold >= 50) {
          gameState.player.gold -= 50;
          gameState.addItem(items.ancient_map);
          toast.success('Purchased Ancient Artifact!', { description: 'Spent 50 gold.', className: 'rpg-toast' });
        } else {
          toast.error("Not enough gold!", { className: 'rpg-toast' });
        }
        triggerUIUpdate();
      }
    }

    // Quest completion from hunter_clue dialogue
    if (gameState.currentDialogue === 'hunter_clue' && nextId === 'complete_quest') {
      const hunterQuest = gameState.quests.find(q => q.id === 'find_hunter' && q.active && !q.completed);
      if (hunterQuest) {
        hunterQuest.objectives[2] = 'Defeat the forest threat ✓';
        hunterQuest.completed = true;
        toast.success("Quest Completed: The Missing Hunter!", {
          description: "Return to the Elder to report your findings.",
          icon: "📜",
          className: "rpg-toast",
          duration: 5000,
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
    if (gameStateRef.current) {
      const state = gameStateRef.current;
      state.player.health = state.player.maxHealth;
      state.player.stamina = state.player.maxStamina;
      state.player.isDodging = false;
      
      const spawn = worldRef.current?.getSpawnPoint() || { x: 0, y: 0 };
      state.player.position = { x: spawn.x, y: spawn.y };
      
      worldRef.current?.rebuildChunks();
      worldRef.current?.updateChunks(spawn.x, spawn.y);
      
      triggerUIUpdate();
    }
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
    if (currentTrackRef.current === track) return;
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
      
      // Also try on first player movement/attack which triggers sound
      const originalHandleInput = handleInput;
      handleInput = (...args) => {
        const result = originalHandleInput(...args);
        startOnInteraction();
        return result;
      };
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
      <div ref={mountRef} className="w-full h-full" />
      
      {gameState && (
        <>
          <GameUI gameState={gameState} assetManager={assetManagerRef.current} refreshToken={uiVersion} triggerUIUpdate={triggerUIUpdate} musicRef={musicRef} showControls={showControls} />
          <Minimap
            currentMap={allMaps[gameState.currentMap]}
            currentMapId={gameState.currentMap}
            playerPosition={gameState.player.position}
            visitedTiles={visitedTilesRef.current}
            npcs={gameState.npcs}
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
      <DeathOverlay active={deathActive} goldLost={deathGoldLost} onComplete={handleDeathComplete} />
    </div>
  );
};

export default Game;
