import { useEffect, useRef, useState, useCallback } from 'react';
import * as THREE from 'three';
import { GameState, NPC } from '@/lib/game/GameState';
import { AssetManager, SharedGeometry } from '@/lib/game/AssetManager';
import { World } from '@/lib/game/World';
import { ParticleSystem } from '@/lib/game/ParticleSystem';
import { BiomeAmbience } from '@/lib/game/BiomeAmbience';
import { WeatherSystem } from '@/lib/game/WeatherSystem';
import { CombatSystem, Enemy } from '@/lib/game/Combat';
import { DayNightCycle } from '@/lib/game/DayNightCycle';
import { FloatingTextSystem } from '@/lib/game/FloatingText';
import { ScreenShake } from '@/lib/game/ScreenShake';
import { MapMarker, extractMarkersFromText } from '@/lib/game/MapMarkers';
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
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const visitedTilesRef = useRef<Set<string>>(new Set());
  const [minimapVersion, setMinimapVersion] = useState(0);
  const lastMinimapRefreshRef = useRef(0);
  const gameStateRef = useRef<GameState | null>(null);

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

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    rendererRef.current = renderer;
    mountRef.current.appendChild(renderer.domElement);

    const assetManager = new AssetManager();
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

    const world = new World(scene, assetManager, allMaps.village);
    const spawnPoint = world.getSpawnPoint();
    state.player.position = { x: spawnPoint.x, y: spawnPoint.y };
    world.updateChunks(spawnPoint.x, spawnPoint.y);
    biomeAmbience.setBiome('grassland');

    const enemyMeshes = new Map<string, THREE.Mesh>();
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

    // Animation state
    let animFrame = 0;
    let animTimer = 0;
    const IDLE_FRAME_DURATION = 0.8;
    const WALK_FRAME_DURATION = 0.18;
    let playerAnimState: 'idle' | 'walk' | 'attack' | 'dodge' | 'charge' | 'hurt' | 'spin_attack' = 'idle';
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

    // Death state - use ref so callback can reset it

    // Map biome lookup
    const mapBiomes: Record<string, string> = {
      village: 'grassland',
      forest: 'forest',
      deep_woods: 'swamp',
      ruins: 'ruins',
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

    // Helper: get Y-based render order using the entity foot point instead of body center
    const getYRenderOrder = (worldY: number, footOffset: number = 0): number => {
      const currentMap = world.getCurrentMap();
      const footY = worldY - footOffset;
      const tileY = Math.floor(footY + currentMap.height / 2);
      return 100 + (currentMap.height - tileY);
    };

    const handleMapTransition = (targetMap: string, targetX: number, targetY: number) => {
      const newMap = allMaps[targetMap];
      if (!newMap) return;

      // Show transition overlay
      setTransitionMapName(newMap.name);
      setTransitionActive(true);
      setTimeout(() => setTransitionActive(false), 100); // trigger re-render

      state.currentMap = targetMap;
      world.loadMap(newMap);
      biomeAmbience.setBiome(mapBiomes[targetMap] || 'grassland');
      
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
      enemyHPBars.forEach(({ bg, fill }) => {
        scene.remove(bg);
        scene.remove(fill);
        (bg.material as THREE.Material).dispose();
        (fill.material as THREE.Material).dispose();
      });
      enemyHPBars.clear();

      const mapDef = mapDefinitions[targetMap];
      if (mapDef?.enemyZones) {
        for (const zone of mapDef.enemyZones) {
          let enemySprite: string;
          let enemyName: string;
          let hp: number;
          let dmg: number;

          switch (zone.enemyType) {
            case 'wolf':
              enemySprite = 'enemy_wolf'; enemyName = 'Forest Wolf'; hp = 40; dmg = 10; break;
            case 'shadow':
              enemySprite = 'enemy_shadow'; enemyName = 'Shadow Creature'; hp = 60; dmg = 15; break;
            case 'plant':
              enemySprite = 'enemy_plant'; enemyName = 'Vine Terror'; hp = 50; dmg = 12; break;
            case 'skeleton':
              enemySprite = 'enemy_skeleton'; enemyName = 'Skeleton Warrior'; hp = 55; dmg = 14; break;
            case 'bandit':
              enemySprite = 'enemy_bandit'; enemyName = 'Bandit'; hp = 45; dmg = 11; break;
            case 'golem':
              enemySprite = 'enemy_golem'; enemyName = 'Stone Golem'; hp = 200; dmg = 25; break;
            case 'spider':
              enemySprite = 'enemy_spider'; enemyName = 'Giant Spider'; hp = 35; dmg = 8; break;
            case 'slime':
              enemySprite = 'enemy_slime'; enemyName = 'Green Slime'; hp = 25; dmg = 5; break;
            default:
              enemySprite = 'enemy_wolf'; enemyName = 'Wild Beast'; hp = 40; dmg = 10;
          }
          
          for (let i = 0; i < zone.count; i++) {
            const ex = (zone.x + Math.random() * zone.width) - newMap.width / 2;
            const ey = (zone.y + Math.random() * zone.height) - newMap.height / 2;
            combatSystem.spawnEnemy(enemyName, { x: ex, y: ey }, hp, dmg, enemySprite);
          }
        }
      }

      // Quest objective: track map entry
      const guardQuest = state.quests.find(q => q.id === 'guard_duty' && q.active && !q.completed);
      if (guardQuest && targetMap === 'forest') {
        guardQuest.objectives[0] = 'Patrol the northern forest border ✓';
      }
      const hunterQuest = state.quests.find(q => q.id === 'find_hunter' && q.active && !q.completed);
      if (hunterQuest && targetMap === 'deep_woods') {
        hunterQuest.objectives[0] = 'Travel to the Deep Woods ✓';
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

    const playerGeometry = SharedGeometry.player;
    const playerTexture = assetManager.getTexture('player_down_idle_0');
    const playerMaterial = new THREE.MeshBasicMaterial({
      map: playerTexture,
      transparent: true,
      depthWrite: false,
    });
    const playerMesh = new THREE.Mesh(playerGeometry, playerMaterial);
    playerMesh.position.set(spawnPoint.x, spawnPoint.y, 0.2);
    playerMesh.scale.setScalar(PLAYER_BASE_SCALE);
    playerMesh.renderOrder = getYRenderOrder(spawnPoint.y, PLAYER_FOOT_OFFSET);
    scene.add(playerMesh);

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

    npcData.forEach(npc => {
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
      npcMesh.renderOrder = getYRenderOrder(npc.position.y, NPC_FOOT_OFFSET);
      npcMesh.userData = { npcId: npc.id };
      scene.add(npcMesh);
      npcMeshes.push(npcMesh);
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
      if (e.key.toLowerCase() === 'e' && !state.dialogueActive) {
        interactBuffered = true;
      }
      // Q = use potion hotkey
      if (e.key.toLowerCase() === 'q' && !state.dialogueActive) {
        potionBuffered = true;
      }
      if (e.key === ' ' && !state.dialogueActive) {
        e.preventDefault();
        if (!isChargingAttack && !state.player.isDodging && playerAnimState !== 'attack') {
          const currentTime = Date.now();
          if (currentTime - state.player.lastAttackTime >= state.player.attackCooldown) {
            isChargingAttack = true;
            chargeTimer = 0;
            chargeLevel = 0;
            playerAnimState = 'charge';
          }
        }
      }
      if (e.key === 'Shift' && !state.dialogueActive) {
        dodgeBuffered = true;
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (pausedRef.current && e.key !== 'Escape') return;
      keys[e.key.toLowerCase()] = false;
      if (e.key === 'Shift') {
        keys['shift'] = false;
      }
      if (e.key === ' ' && isChargingAttack) {
        if (chargeTimer >= CHARGE_TIME_MIN) {
          performChargeAttack(chargeLevel);
        } else {
          performAttack();
        }
        isChargingAttack = false;
        chargeTimer = 0;
        chargeLevel = 0;
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

    // Pre-load sword swing sound
    const swordSwingAudio = new Audio('/audio/sword_swing.mp3');
    swordSwingAudio.volume = 0.3;

    const playSwordSwing = () => {
      const sfx = swordSwingAudio.cloneNode() as HTMLAudioElement;
      sfx.volume = 0.3;
      sfx.play().catch(() => {});
    };

    const onEnemyKilled = (enemy: Enemy) => {
      killCount++;
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
      playSwordSwing();

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
          8, 0xFFD700, 0.5, 1.5, 2
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
      const interactionRange = 1.5;
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

      // === NPC WANDERING ===
      for (let ni = 0; ni < npcData.length; ni++) {
        const npc = npcData[ni];
        const wander = npcWander[npc.id];
        if (!wander) continue;

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
          npcMesh.renderOrder = getYRenderOrder(npc.position.y, NPC_FOOT_OFFSET);
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

        if (dodgeBuffered && !state.dialogueActive) {
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
          if (world.isWalkable(newPos.x, newPos.y)) {
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

          const frameSpeed = state.player.speed * deltaTime * 60;
          const newPos = {
            x: state.player.position.x + moveX * frameSpeed,
            y: state.player.position.y + moveY * frameSpeed,
          };

          if (world.isWalkable(newPos.x, newPos.y)) {
            state.player.position = newPos;
          } else if (world.isWalkable(newPos.x, state.player.position.y)) {
            state.player.position.x = newPos.x;
          } else if (world.isWalkable(state.player.position.x, newPos.y)) {
            state.player.position.y = newPos.y;
          }

          world.updateChunks(state.player.position.x, state.player.position.y);
          state.player.isMoving = true;

          if (playerAnimState !== 'attack' && playerAnimState !== 'dodge' && playerAnimState !== 'charge') {
            playerAnimState = 'walk';
          }

          footstepTimer += deltaTime;
          if (footstepTimer >= footstepInterval) {
          _tmpVec3.set(state.player.position.x, state.player.position.y, 0);
          particleSystem.emitDust(_tmpVec3);
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
          if (playerAnimState !== 'attack' && playerAnimState !== 'dodge' && playerAnimState !== 'charge' && playerAnimState !== 'spin_attack') {
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

        // Cycle idle/walk frames
        if (playerAnimState !== 'attack' && playerAnimState !== 'dodge' && playerAnimState !== 'charge' && playerAnimState !== 'spin_attack') {
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
        } else {
          texName = getPlayerTextureName(currentDir8, playerAnimState, animFrame);
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
          newTex = assetManager.getTexture(texName);
        }
        
        if (newTex && playerMaterial.map !== newTex) {
          playerMaterial.map = newTex;
        }

        // === PLAYER POSITION WITH ANIMATION OFFSETS ===
        let attackOffsetX = 0;
        let attackOffsetY = 0;
        const facing4 = dir8to4(currentDir8);
        const moveWave = playerAnimState === 'walk' || state.player.isDodging
          ? Math.sin(currentTime / 95)
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
          attackOffsetY += stride * 0.06;
          if (facing4 === 'left') attackOffsetX -= stride * 0.04;
          else if (facing4 === 'right') attackOffsetX += stride * 0.04;
          visualScaleX *= 1 - stride * 0.035;
          visualScaleY *= 1 + stride * 0.07;
          visualRotation = moveWave * (facing4 === 'left' ? -0.035 : facing4 === 'right' ? 0.035 : 0.018);
        }

        if (state.player.isDodging) {
          const t = 1 - (state.player.dodgeTimer / state.player.dodgeDuration);
          const dodgeScaleX = 1 + Math.sin(t * Math.PI) * 0.3;
          const dodgeScaleY = 1 - Math.sin(t * Math.PI) * 0.2;
          visualScaleX *= dodgeScaleX;
          visualScaleY *= dodgeScaleY;
          visualRotation = t * Math.PI * 2 * (state.player.dodgeDirection.x >= 0 ? -1 : 1);
        } else if (isChargingAttack) {
          const pulse = 1 + chargeLevel * 0.15;
          const shake = chargeLevel * Math.sin(currentTime / 30) * 0.02;
          visualScaleX *= pulse;
          visualScaleY *= pulse;
          attackOffsetX += shake;
          visualRotation = 0;
        }

        playerMesh.rotation.z = visualRotation;
        playerMesh.scale.set(visualScaleX, visualScaleY, 1);
        playerMesh.position.set(
          state.player.position.x + attackOffsetX,
          state.player.position.y + attackOffsetY,
          0.2
        );

        // Dynamic Y-sorting for player
        playerMesh.renderOrder = getYRenderOrder(state.player.position.y, PLAYER_FOOT_OFFSET);

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
          playerMaterial.color.setHex(0xaaaaff);
          playerMaterial.opacity = 0.6;
        } else if (isChargingAttack && chargeLevel > 0) {
          const glow = Math.sin(currentTime / 100) > 0 ? 0xFFD700 : 0xFFA000;
          playerMaterial.color.setHex(glow);
          playerMaterial.opacity = 1;
        } else {
          playerMaterial.color.setHex(0xffffff);
          playerMaterial.opacity = 1;
        }

        // Smooth camera follow
        cameraTarget.x = state.player.position.x;
        cameraTarget.y = state.player.position.y;

        // === INTERACTION INDICATOR ===
        let showIndicator = false;
        let indicatorX = 0, indicatorY = 0;
        const interactionRange = 1.5;

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
        combatSystem.updateEnemies(deltaTime, state.player.position, state.player.isDodging);

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
            enemyMesh.renderOrder = getYRenderOrder(enemy.position.y);
            scene.add(enemyMesh);
            enemyMeshes.set(enemy.id, enemyMesh);
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
            const telegraphProgress = 1 - (enemy.telegraphTimer / enemy.telegraphDuration);
            const shakeIntensity = 0.06 * telegraphProgress;
            finalEnemyX += Math.sin(currentTime / 35 + seed) * shakeIntensity;
            finalEnemyY += Math.cos(currentTime / 42 + seed) * shakeIntensity;
            scaleX *= 1 + telegraphProgress * 0.18;
            scaleY *= 1 + telegraphProgress * 0.2;
            rotation = Math.sin(currentTime / 55 + seed) * 0.03;

            if (Math.sin(currentTime / 50) > 0) {
              mat.color.setHex(0xffaa00);
            } else {
              mat.color.setHex(0xffffff);
            }
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
            if (!enemy.damageFlashTimer || enemy.damageFlashTimer <= 0) {
              mat.color.setHex(0x8888ff);
            }
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
          enemyMesh.renderOrder = getYRenderOrder(enemy.position.y, visual.footOffset);

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

          const showBar = enemy.state !== 'idle' || enemy.health < enemy.maxHealth;
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
          }
        }

        if (fullyDeadEnemyIds.size > 0) {
          combatSystem.removeDeadEnemiesByIds(Array.from(fullyDeadEnemyIds));
        }

        // Check if player died — death penalty
        if (state.player.health <= 0 && !playerDeadRef.current) {
          playerDeadRef.current = true;
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
      renderer.render(scene, camera);
    };

    animate();

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

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('resize', handleResize);
      if (mountRef.current && renderer.domElement.parentNode === mountRef.current) {
        mountRef.current.removeChild(renderer.domElement);
      }
      particleSystem.cleanup();
      biomeAmbience.cleanup();
      weatherSystem.cleanup();
      dayNightCycle.cleanup();
      floatingText.cleanup();
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
      state.player.position = { x: 0, y: 0 };
      triggerUIUpdate();
    }
  }, []);

  // Unlock and play music on first user interaction
  const musicRef = useRef<HTMLAudioElement | null>(null);
  const musicStarted = useRef(false);

  useEffect(() => {
    const audio = new Audio('/audio/ortho_loop2.mp3');
    audio.loop = true;
    audio.volume = 0.15;
    musicRef.current = audio;

    const startMusic = () => {
      if (musicStarted.current) return;
      musicStarted.current = true;
      audio.play().catch(() => {});
    };

    audio.play().catch(() => {
      window.addEventListener('click', startMusic, { once: true });
      window.addEventListener('keydown', startMusic, { once: true });
    });

    return () => {
      audio.pause();
      audio.src = '';
      window.removeEventListener('click', startMusic);
      window.removeEventListener('keydown', startMusic);
    };
  }, []);

  const activeQuestTitle = gameState?.quests.find(q => q.active && !q.completed)?.title;

  return (
    <div className="relative w-full h-screen overflow-hidden">
      <div ref={mountRef} className="w-full h-full" />
      
      {gameState && (
        <>
          <GameUI gameState={gameState} refreshToken={uiVersion} musicRef={musicRef} showControls={showControls} />
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
