import * as THREE from 'three';
import type { AssetManager } from '@/lib/game/AssetManager';
import type { CombatSystem } from '@/lib/game/Combat';
import type { FloatingTextSystem } from '@/lib/game/FloatingText';
import type { GameState, NPC } from '@/lib/game/GameState';
import type { ParticleSystem } from '@/lib/game/ParticleSystem';
import type { ScreenShake } from '@/lib/game/ScreenShake';
import type { World } from '@/lib/game/World';
import type { BiomeAmbience } from '@/lib/game/BiomeAmbience';
import type { WeatherSystem } from '@/lib/game/WeatherSystem';
import type { DayNightCycle } from '@/lib/game/DayNightCycle';
import type { WorldItemRendererInstance } from '@/game/runtime/WorldItemRenderer';
import type { Direction8 } from '@/game/runtime/PlayerSimulationSystem';
import type { EnemyVisualRegistry } from '@/game/runtime/EnemyVisualRegistry';
import type { EnemyVisualProfile, NpcWanderState } from '@/game/runtime/RuntimeConfig';

export interface PortalHint {
  targetMap: string;
  targetX: number;
  targetY: number;
}

export interface PortalWarpManagerLike {
  update: (options: {
    currentTime: number;
    deltaTime: number;
    playerPosition: { x: number; y: number };
    portalCooldown: number;
    isDialogueActive: boolean;
    isPlayerDead: boolean;
    isMapModalOpen: boolean;
    camera: THREE.OrthographicCamera;
    particleSystem: ParticleSystem;
    samplePortalNearPlayer: () => PortalHint | null;
    isPortalDestinationUnlocked: (targetMap: string) => boolean;
    notify: (title: string, options?: { id?: string; description?: string; duration?: number }) => void;
    handleMapTransition: (targetMap: string, targetX: number, targetY: number) => void;
  }) => void;
}

export interface GameplayPreludeContext {
  state: GameState;
  world: World;
  blockStaminaCost: number;
  triggerUIUpdateThrottled: (now: number) => void;
  notify: (title: string, options?: { id?: string; description?: string; duration?: number }) => void;
  activeNpcIndices: number[];
  npcData: NPC[];
  npcWander: Record<string, NpcWanderState>;
  isNpcPriorityCueTarget: (npc: NPC) => boolean;
  npcScaleById: Record<string, number>;
  npcFootOffset: number;
  getVisualYAt: (x: number, y: number) => number;
  getActorRenderOrder: (x: number, y: number, footOffset: number) => number;
  npcMeshes: THREE.Mesh[];
  npcShadows: THREE.Mesh[];
  npcOutlines: THREE.Mesh[];
  npcObjectiveHalos: THREE.Mesh[];
  npcObjectiveRings: THREE.Mesh[];
  checkInteraction: () => void;
  usePotion: () => void;
  keys: Record<string, boolean>;
  visitedTiles: Set<string>;
  getDirection8: (x: number, y: number) => Direction8;
  dir8to4: (direction: Direction8) => 'up' | 'down' | 'left' | 'right';
  performDodge: (moveX: number, moveY: number) => void;
  playFootstep: (isSprinting: boolean) => void;
  emitDust: (x: number, y: number) => void;
  emitHeal: (x: number, y: number, z: number) => void;
  triggerMinimapUpdate: (force?: boolean, now?: number) => void;
  footstepInterval: number;
  attackFrameDuration: number;
  spinFrameDuration: number;
  spinDirections: Direction8[];
  idleFrameDuration: number;
  walkFrameDuration: number;
  chargeTimeMin: number;
  chargeTimeMax: number;
  lungeState: {
    active: boolean;
    recovering: boolean;
    dirX: number;
    dirY: number;
    speed: number;
    distanceRemaining: number;
    recoveryTimer: number;
    damage: number;
    hitEnemyIds: Set<string>;
  };
  combatSystem: {
    getEnemiesInRange: (position: { x: number; y: number }, range: number) => any[];
    playerAttack: (enemy: any, damage: number, playerPosition: { x: number; y: number }, playerDirection: string) => { killed: boolean; staggered: boolean; backstab: boolean };
  };
  onLungeHit: (enemy: any, damage: number) => void;
  onLungeEnd: () => void;
  particleSystem: {
    emit(position: any, count: number, color: number, lifetime: number, speed: number, spread: number): void;
  };
  playPropBreak?: () => void;
  dodgeIFrameDuration: number;
  triggerComboChain: () => { frameDuration: number } | null;
  comboWindowDuration: number;
  getComboFrameDuration: (step: number) => number;
}

export interface PlayerFrameContext {
  state: GameState;
  world: World;
  assetManager: AssetManager;
  textureCache: Map<string, THREE.Texture>;
  playerBaseScale: number;
  outlinePad: number;
  getPlayerTextureName: (direction: string, state: string, frame: number) => string;
  dir8to4: (direction: string) => string;
  getPlayerVisualY: (x: number, y: number) => number;
  getVisualYAt: (x: number, y: number) => number;
  meshes: {
    playerMesh: THREE.Mesh;
    playerMaterial: THREE.MeshBasicMaterial;
    playerOutline: THREE.Mesh;
    playerShadow: THREE.Mesh;
    bladeOverlayMesh: THREE.Mesh;
    heldItemMesh: THREE.Mesh;
    potionMaterial: THREE.MeshBasicMaterial;
    swooshMesh: THREE.Mesh;
    swooshMaterial: THREE.MeshBasicMaterial;
    spinSwooshMesh: THREE.Mesh;
    spinSwooshMaterial: THREE.MeshBasicMaterial;
    indicatorMesh: THREE.Mesh;
    indicatorMaterial: THREE.MeshBasicMaterial;
    objectiveIndicatorRingMesh: THREE.Mesh;
    objectiveIndicatorRingMaterial: THREE.MeshBasicMaterial;
    objectiveIndicatorOuterMesh: THREE.Mesh;
    objectiveIndicatorOuterMaterial: THREE.MeshBasicMaterial;
    essenceOrbMesh: THREE.Mesh;
    essenceOrbMaterial: THREE.MeshBasicMaterial;
  };
  swooshDuration: number;
  comboStep: number;
  screenShake: ScreenShake;
  getInteractionPromptLabel: (
    interactionId: string,
    promptState: GameState,
    promptWorld: World,
    x: number,
    y: number,
    npcName?: string,
  ) => string | null;
  isNpcPriorityCueTarget: (npc: NPC) => boolean;
  isPortalDestinationUnlocked: (targetMap: string) => boolean;
  samplePortalNearPlayer: () => PortalHint | null;
  samplePortalForWarpFoot: () => PortalHint | null;
  getMapDisplayName: (mapId: string) => string;
  criticalItemInteractionIds: Set<string>;
  isCollectedCriticalItem: (interactionId: string) => boolean;
  isChestOpened: (interactionId: string) => boolean;
  isConsumablePickupCollected: (interactionId: string, x: number, y: number) => boolean;
  setInteractionPrompt: (prompt: string | null) => void;
  criticalItemVisuals: { update: (currentTime: number, deltaTime: number) => void };
  transitionDebugManager: { rebuild: (playerPosition: { x: number; y: number }) => void };
  portalWarpManager: PortalWarpManagerLike;
  notify: (title: string, options?: { id?: string; description?: string; duration?: number }) => void;
  handleMapTransition: (targetMap: string, targetX: number, targetY: number) => void;
  handlePortalTransition: (targetMap: string, targetX: number, targetY: number) => void;
  lungeState: {
    active: boolean;
    recovering: boolean;
    dirX: number;
    dirY: number;
    speed: number;
    distanceRemaining: number;
  };
}

export interface EnemyAudioContext {
  maybePlayWalk: (
    enemy: { id: string; position: { x: number; y: number }; velocity: { x: number; y: number }; moveBlend: number; state: string; sprite: string },
    nowSeconds: number,
    playerPosition: { x: number; y: number },
  ) => void;
  clearEnemy: (enemyId: string) => void;
}

export interface EnemyLoopContext {
  scene: THREE.Scene;
  assetManager: AssetManager;
  combatSystem: CombatSystem;
  state: GameState;
  world: World;
  floatingText: FloatingTextSystem;
  screenShake: ScreenShake;
  particleSystem: ParticleSystem;
  outlinePad: number;
  enemyVisualProfiles: Record<string, EnemyVisualProfile>;
  registry: EnemyVisualRegistry;
  enemyAudio: EnemyAudioContext;
  shadowGeometry: THREE.BufferGeometry;
  shadowMaterial: THREE.MeshBasicMaterial;
  createOutlineMesh: (geometry: THREE.BufferGeometry, texture: THREE.Texture | null) => THREE.Mesh;
  getVisualYAt: (x: number, y: number) => number;
  getActorRenderOrder: (x: number, y: number, footOffset: number) => number;
  playPlayerHit: () => void;
  playPropBreak?: () => void;
}

export interface RuntimeLoopTailContext {
  scene: THREE.Scene;
  world: World;
  camera: THREE.OrthographicCamera;
  renderer: THREE.WebGLRenderer;
  getVisualYAt: (x: number, y: number) => number;
  closeDialogueSession: () => void;
  setNpcScreenPos: (position: { x: number; y: number }) => void;
  npcScreenMinMs: number;
  npcScreenMinPx: number;
  biomeAmbience: BiomeAmbience;
  weatherSystem: WeatherSystem;
  dayNightCycle: DayNightCycle;
  floatingText: FloatingTextSystem;
  particleSystem: ParticleSystem;
  autoSaveInterval: number;
  triggerSave: () => void;
  worldItemRenderer: WorldItemRendererInstance;
  state: GameState;
  assetManager: AssetManager;
  startStormLoop?: () => void;
  stopStormLoop?: () => void;
  playThunder?: () => void;
}

interface CreateRuntimePhaseContextsOptions {
  gameplayPreludeContext: GameplayPreludeContext;
  playerFrameContext: PlayerFrameContext;
  enemyLoopContext: EnemyLoopContext;
  runtimeLoopTailContext: RuntimeLoopTailContext;
}

export function createRuntimePhaseContexts(options: CreateRuntimePhaseContextsOptions) {
  return options;
}

export type RuntimePhaseContexts = ReturnType<typeof createRuntimePhaseContexts>;
