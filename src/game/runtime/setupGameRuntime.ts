import * as THREE from 'three';
import type { Dispatch, MutableRefObject, SetStateAction } from 'react';
import { GameState, NPC } from '@/lib/game/GameState';
import { AssetManager } from '@/lib/game/AssetManager';
import { World } from '@/lib/game/World';
import { ENEMY_BLUEPRINTS, DEFAULT_ENEMY } from '@/data/enemies';
import { getPrimaryObjectiveText, MapMarker, isNpcObjectiveTarget } from '@/lib/game/MapMarkers';
import { SaveManager } from '@/lib/game/SaveManager';
import { allMaps } from '@/data/maps';
import { dialogues, DialogueNode } from '@/data/dialogues';
import { notify } from '@/lib/game/notificationBus';
import type { WorldMap } from '@/lib/game/World';
import type { Item } from '@/lib/game/GameState';
import type { CriticalPathItemVisual } from '@/data/criticalPathItems';
import { createRuntimeMapFlow } from '@/game/runtime/RuntimeMapFlow';
import { applyMapEntryProgression, isPortalDestinationUnlocked, MAP_BIOMES } from '@/game/runtime/RuntimeMapRules';
import { createRuntimeVisualSubsystems } from '@/game/runtime/RuntimeVisualSubsystems';
import { createGameRuntime } from '@/game/runtime/GameRuntime';
import {
  createDefaultNpcData,
  createNpcWanderState,
  ENEMY_VISUALS,
  NPC_SCALE_BY_ID,
  syncVillageNpcReactivity,
} from '@/game/runtime/RuntimeConfig';
import { getMapDisplayName, resolveSafeTransitionPosition, SPAWN_BODY_R } from '@/game/runtime/RuntimeWorldUtils';
import { createCriticalItemVisualManager } from '@/game/runtime/CriticalItemVisualManager';
import { createTransitionDebugManager } from '@/game/runtime/TransitionDebugManager';
import { createPortalWarpManager } from '@/game/runtime/PortalWarpManager';
import { cleanupRuntimeResources } from '@/game/runtime/RuntimeCleanup';
import { direction8ToCardinal, getDirection8FromVector } from '@/game/runtime/RuntimeDirectionUtils';
import { createRuntimePhaseAdapters } from '@/game/runtime/RuntimePhaseAdapters';
import { setupRuntimeActionPhase } from '@/game/runtime/RuntimeActionPhase';
import { setupRuntimeInputPhase } from '@/game/runtime/RuntimeInputPhase';
import { runRuntimeFrame } from '@/game/runtime/RuntimeFrameRunner';
import { createRuntimeSessionState } from '@/game/runtime/RuntimeSessionState';
import { createDeathRespawnHandler, queueRuntimeStartupNotifications } from '@/game/runtime/RuntimeStartupFlow';
import { performRuntimeTeardown } from '@/game/runtime/RuntimeTeardown';
import { createFatalRuntimeReporter } from '@/game/runtime/RuntimeFatalError';
import {
  createPortalSampler,
  createPortalWarpFootSampler,
  createSetActiveNpcsForCurrentMap,
} from '@/game/runtime/RuntimeWorldAdapters';
import { buildRuntimePhaseContexts } from '@/game/runtime/RuntimePhaseContextBuilder';

type InteractionPrompt = string | null;
type Direction8 = 'up' | 'down' | 'left' | 'right' | 'up_left' | 'up_right' | 'down_left' | 'down_right';
type CurrentDialogueState = { node: DialogueNode; npcName: string } | null;

const PLAYER_BASE_SCALE = 1.06;
const PLAYER_FOOT_OFFSET = 0.44;
const NPC_FOOT_OFFSET = 0.42;
const HEAL_COOLDOWN_MS = 30000;

interface DialogueProgression {
  selectDialogueStartNode: (state: GameState, dialogueId: string) => DialogueNode | null | undefined;
}

export interface RuntimeHostRefs {
  mountElement: HTMLDivElement;
  cameraRef: MutableRefObject<THREE.OrthographicCamera | null>;
  rendererRef: MutableRefObject<THREE.WebGLRenderer | null>;
  assetManagerRef: MutableRefObject<AssetManager | null>;
  worldRef: MutableRefObject<World | null>;
  gameStateRef: MutableRefObject<GameState | null>;
  textureCacheRef: MutableRefObject<Map<string, THREE.Texture>>;
  musicRef: MutableRefObject<HTMLAudioElement | null>;
  musicStarted: MutableRefObject<boolean>;
  bonfireOverlayTimerRef: MutableRefObject<ReturnType<typeof setTimeout> | null>;
  lastInteractionPromptRef: MutableRefObject<InteractionPrompt>;
  pausedRef: MutableRefObject<boolean>;
  playerDeadRef: MutableRefObject<boolean>;
  deathRespawnFnRef: MutableRefObject<(() => void) | null>;
  mapMarkersRef: MutableRefObject<MapMarker[]>;
  visitedTilesRef: MutableRefObject<Set<string>>;
  healCooldowns: MutableRefObject<Map<string, number>>;
  mapModalOpenRef: MutableRefObject<boolean>;
  setMapModalOpenRef: MutableRefObject<Dispatch<SetStateAction<boolean>>>;
  activeNpcWorldPos: MutableRefObject<{ x: number; y: number } | null>;
  syncVillageReactivityRef: MutableRefObject<(() => void) | null>;
  playPotionDrinkRef: MutableRefObject<(() => void) | null>;
  playGrassChewRef: MutableRefObject<(() => void) | null>;
  playHeroEventRef: MutableRefObject<(() => void) | null>;
  playPortalWarpRef: MutableRefObject<(() => void) | null>;
  startPortalChargeLoopRef: MutableRefObject<(() => void) | null>;
  stopPortalChargeLoopRef: MutableRefObject<(() => void) | null>;
  playDialogueAdvanceRef: MutableRefObject<(() => void) | null>;
  startDialogueLoopRef: MutableRefObject<(() => void) | null>;
  stopDialogueLoopRef: MutableRefObject<(() => void) | null>;
  playMenuOpenRef: MutableRefObject<(() => void) | null>;
  playMenuCloseRef: MutableRefObject<(() => void) | null>;
  killCountRef: MutableRefObject<number>;
}

export interface RuntimeUiBindings {
  setGameState: Dispatch<SetStateAction<GameState | null>>;
  setMapMarkers: Dispatch<SetStateAction<MapMarker[]>>;
  setCurrentDialogue: Dispatch<SetStateAction<CurrentDialogueState>>;
  setNpcScreenPos: Dispatch<SetStateAction<{ x: number; y: number } | null>>;
  setIsPaused: Dispatch<SetStateAction<boolean>>;
  setTransitionActive: Dispatch<SetStateAction<boolean>>;
  setTransitionMapName: Dispatch<SetStateAction<string>>;
  setTransitionMapSubtitle: Dispatch<SetStateAction<string>>;
  setTransitionDebugEnabled: Dispatch<SetStateAction<boolean>>;
  setTransitionDebugLines: Dispatch<SetStateAction<string[]>>;
  setInteractionPrompt: Dispatch<SetStateAction<InteractionPrompt>>;
  setBonfireOverlayActive: Dispatch<SetStateAction<boolean>>;
  setDeathEssenceLost: Dispatch<SetStateAction<number>>;
  setDeathActive: Dispatch<SetStateAction<boolean>>;
}

export interface RuntimeContent {
  items: Record<string, Item>;
  criticalPathItems: Record<string, CriticalPathItemVisual>;
}

export interface RuntimeCallbacks {
  addMarkersFromText: (text: string, currentMap: string) => void;
  triggerUIUpdate: () => void;
  triggerUIUpdateThrottled: (now?: number) => void;
  triggerMinimapUpdate: (force?: boolean, now?: number) => void;
  createDialogueProgression: () => DialogueProgression;
  closeDialogueSession: (stateToClose?: GameState | null) => void;
  switchMusicTrack: (mapId: string) => void;
  processAudioElement: (audio: HTMLAudioElement) => void;
  showHeroOverlay: (title: string, subtitle?: string) => void;
}

interface SetupGameRuntimeOptions {
  refs: RuntimeHostRefs;
  ui: RuntimeUiBindings;
  content: RuntimeContent;
  callbacks: RuntimeCallbacks;
}

export function setupGameRuntimeEffect(options: SetupGameRuntimeOptions) {
  const {
    refs: {
      mountElement,
      cameraRef,
      rendererRef,
      assetManagerRef,
      worldRef,
      gameStateRef,
      textureCacheRef,
      musicRef,
      musicStarted,
      bonfireOverlayTimerRef,
      lastInteractionPromptRef,
      pausedRef,
      playerDeadRef,
      deathRespawnFnRef,
      mapMarkersRef,
      visitedTilesRef,
      healCooldowns,
      mapModalOpenRef,
      setMapModalOpenRef,
      activeNpcWorldPos,
      syncVillageReactivityRef,
      playPotionDrinkRef,
      playGrassChewRef,
      playHeroEventRef,
      playPortalWarpRef,
      startPortalChargeLoopRef,
      stopPortalChargeLoopRef,
      playDialogueAdvanceRef,
      startDialogueLoopRef,
      stopDialogueLoopRef,
      playMenuOpenRef,
      playMenuCloseRef,
      killCountRef,
    },
    ui: {
      setGameState,
      setMapMarkers,
      setCurrentDialogue,
      setNpcScreenPos,
      setIsPaused,
      setTransitionActive,
      setTransitionMapName,
      setTransitionMapSubtitle,
      setTransitionDebugEnabled,
      setTransitionDebugLines,
      setInteractionPrompt,
      setBonfireOverlayActive,
      setDeathEssenceLost,
      setDeathActive,
    },
    content: {
      items,
      criticalPathItems,
    },
    callbacks: {
      addMarkersFromText,
      triggerUIUpdate,
      triggerUIUpdateThrottled,
      triggerMinimapUpdate,
      createDialogueProgression,
      closeDialogueSession,
      switchMusicTrack,
      processAudioElement,
      showHeroOverlay,
    },
  } = options;

  const CRITICAL_ITEM_INTERACTION_IDS = new Set(Object.keys(criticalPathItems));
  const fatalRuntime = createFatalRuntimeReporter(mountElement);
  let fatalSetupError = false;

    const runtime = createGameRuntime({
      mountElement,
      setCameraRef: camera => {
        cameraRef.current = camera;
      },
      setRendererRef: renderer => {
        rendererRef.current = renderer;
      },
      setAssetManagerRef: assetManager => {
        assetManagerRef.current = assetManager;
      },
      setWorldRef: world => {
        worldRef.current = world;
      },
      setGameStateRef: state => {
        gameStateRef.current = state;
      },
      items,
      criticalPathItems,
      setMapMarkers: markers => {
        mapMarkersRef.current = markers;
        setMapMarkers(markers);
      },
      restoreVisitedTile: tile => {
        visitedTilesRef.current.add(tile);
      },
    });
    const {
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
    } = runtime;
    const isNpcPriorityCueTarget = (npc: NPC) => {
      if (isNpcObjectiveTarget(npc, state.currentMap, mapMarkersRef.current)) {
        const primaryObjectiveText = getPrimaryObjectiveText(state);
        if (primaryObjectiveText) {
          const npcName = npc.name.toLowerCase();
          if (npcName.includes('elder') && primaryObjectiveText.includes('elder')) return true;
          if (npcName.includes('merchant') && primaryObjectiveText.includes('merchant')) return true;
          if (npcName.includes('guard') && primaryObjectiveText.includes('guard')) return true;
          if (npcName.includes('blacksmith') && primaryObjectiveText.includes('blacksmith')) return true;
          if (npcName.includes('healer') && primaryObjectiveText.includes('healer')) return true;
          if (npcName.includes('ranger') && primaryObjectiveText.includes('ranger')) return true;
        }
      }

      const activeQuestText = getPrimaryObjectiveText(state);
      if (!activeQuestText) return npc.questGiver && npc.id === 'elder' && state.currentMap === 'village';

      const npcName = npc.name.toLowerCase();
      if (npcName.includes('elder') && activeQuestText.includes('elder')) return true;
      if (npcName.includes('merchant') && activeQuestText.includes('merchant')) return true;
      if (npcName.includes('guard') && activeQuestText.includes('guard')) return true;
      if (npcName.includes('blacksmith') && activeQuestText.includes('blacksmith')) return true;
      if (npcName.includes('healer') && activeQuestText.includes('healer')) return true;
      if (npcName.includes('ranger') && activeQuestText.includes('ranger')) return true;
      return false;
    };
    setGameState(state);

    const syncEquippedWeapon = (preferredWeaponId?: string | null) => {
      state.setEquippedWeapon(preferredWeaponId ?? state.equippedWeaponId);
      // Clear cached player textures so the new weapon's sprite set takes effect immediately
      const cache = textureCacheRef.current;
      for (const key of Array.from(cache.keys())) {
        if (key.startsWith('player_')) cache.delete(key);
      }
    };

    if (savedData) {
      console.log('[SaveManager] Loaded save from', new Date(savedData.timestamp).toLocaleString());
    }
    
    const initialNow = performance.now();
    const AUTO_SAVE_INTERVAL = 30000; // 30 seconds

    const getVisualYAt = (x: number, y: number) => world.getVisualY(x, y);
    const getActorRenderOrder = (x: number, y: number, footOffset: number) =>
      getYRenderOrder(getVisualYAt(x, y), footOffset, true);
    // Smoothed elevation offset for the player â€” lerps toward the real tile elevation each frame
    // so stepping onto a stair/cliff doesn't produce a jarring instant Y-snap.
    const runtimeSession = createRuntimeSessionState({
      initialPlayerSmoothedElevation: world.getElevationAt(state.player.position.x, state.player.position.y),
      initialLastAutoSaveTime: initialNow,
      initialLastTime: initialNow,
    });
    const getPlayerVisualY = (x: number, y: number) =>
      y + runtimeSession.visual.playerSmoothedElevation * World.ELEVATION_Y_OFFSET;
    const cameraTarget = { x: state.player.position.x, y: getVisualYAt(state.player.position.x, state.player.position.y) };

    let transitionDebug = false;
    const footstepInterval = 0.3;
    const MAX_DELTA = 0.1;
    const portalWarpManager = createPortalWarpManager({
      startPortalChargeLoop: () => {
        startPortalChargeLoopRef.current?.();
      },
      stopPortalChargeLoop: () => {
        stopPortalChargeLoopRef.current?.();
      },
    });

    // Reusable vectors to avoid per-frame allocation
    const _tmpVec3 = new THREE.Vector3();

    // Sword swoosh trail effect â€” normal attack
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
    const SWOOSH_DURATION = 0.22;

    // Spin attack swoosh â€” same arc style as normal but full circle
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
    const SPIN_SWOOSH_DURATION = 0.35;

    // Animation state
    const IDLE_FRAME_DURATION = 0.8;
    const WALK_FRAME_DURATION = 0.18;
    const DRINK_DURATION = 0.8; // seconds to drink potion
    const ATTACK_FRAME_DURATION = 0.1;

    // Charge attack state
    const CHARGE_TIME_MIN = 0.4;
    const CHARGE_TIME_MAX = 1.2;
    const CHARGE_DAMAGE_MULT = 2.5;
    const ATTACK_STAMINA_COST = 15;
    const CHARGE_ATTACK_STAMINA_COST = 32;

    // Spin attack animation state
    const SPIN_DIRECTIONS: Direction8[] = ['down', 'left', 'up', 'right'];
    const SPIN_FRAME_DURATION = 0.06;

    // Lunge attack (broadsword charge)
    const LUNGE_DIST_MIN = 2.0;
    const LUNGE_DIST_MAX = 4.0;
    const LUNGE_SPEED_BASE = 14;
    const LUNGE_SPEED_FULL = 8;
    const LUNGE_RECOVERY_MIN = 0.15;
    const LUNGE_RECOVERY_MAX = 0.45;

    // Blocking state
    const BLOCK_STAMINA_COST = 1.5;
    const DODGE_IFRAME_DURATION = 0.15;

    // LMB charge attack state
    // Death state - use ref so callback can reset it

    // Set biome for loaded map
    biomeAmbience.setBiome(MAP_BIOMES[startMap] || 'grassland');

    let disposed = false;
    let rafId = 0;
    const effectTimeouts: ReturnType<typeof setTimeout>[] = [];
    let cancelEnemyPrewarm: (() => void) | undefined;

    // Save helper
    const triggerSave = () => {
      SaveManager.save(state, mapMarkersRef.current, visitedTilesRef.current);
    };

    // Kill tracker for quests — synced to ref so ProgressionService can snapshot baselines
    let killCount = killCountRef.current;

    const getPlayerTextureName = (dir: Direction8, animState: string, frame: number): string => {
      const weaponPrefix = state.equippedWeaponId === 'ornamental_broadsword' ? 'broadsword_' : '';
      return `player_${weaponPrefix}${dir}_${animState}_${frame}`;
    };

    // Helper: get Y-based render order using the entity foot point with sub-tile precision
    const getYRenderOrder = (worldY: number, footOffset: number = 0, isCharacter: boolean = false): number => {
      const footY = worldY - footOffset;
      // Characters get a much higher base render order to ensure they're always in front of environmental assets
      const baseOrder = isCharacter ? 200000 : 100000;
      return Math.round(baseOrder - footY * 10);
    };

    const samplePortalNearPlayer = createPortalSampler(state, world);
    const samplePortalForWarpFoot = createPortalWarpFootSampler(state, world);

    // === SHADOW SYSTEM ===

    // === OUTLINE SYSTEM â€” thin dark silhouette behind each sprite ===
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

    const npcData = createDefaultNpcData();
    const npcWander = createNpcWanderState(npcData);
    syncVillageNpcReactivity(state, npcData, npcWander);

    const {
      enemyVisuals,
      sceneObjects: {
        indicatorGeometry,
        indicatorMaterial,
        indicatorMesh,
        objectiveIndicatorRingMaterial,
        objectiveIndicatorRingMesh,
        objectiveIndicatorOuterMaterial,
        objectiveIndicatorOuterMesh,
        transitionDebugGroup,
        transitionDebugGeometry,
        transitionDebugMaterials,
        essenceOrbMaterial,
        essenceOrbMesh,
        criticalItemVisualGroup,
      },
      playerVisuals: {
        shadowGeometry,
        shadowMaterial,
        playerShadow,
        playerMaterial,
        playerMesh,
        playerOutline,
        bladeOverlayMaterial,
        bladeOverlayMesh,
        heldItemMaterial: potionMaterial,
        heldItemMesh,
        dispose: disposePlayerVisuals,
      },
      npcVisuals: {
        activeNpcIndices,
        npcMeshes,
        npcShadows,
        npcOutlines,
        npcObjectiveRings,
        npcObjectiveHalos,
        setActiveForMap,
        dispose: disposeNpcVisuals,
      },
    } = createRuntimeVisualSubsystems({
      scene,
      assetManager,
      state,
      npcData,
      playerBaseScale: PLAYER_BASE_SCALE,
      npcFootOffset: NPC_FOOT_OFFSET,
      npcScaleById: NPC_SCALE_BY_ID,
      outlinePad: OUTLINE_PAD,
      getVisualYAt,
      getActorRenderOrder,
      getPlayerVisualY,
      createOutlineMesh,
    });
    const transitionDebugManager = createTransitionDebugManager({
      world,
      transitionDebugGroup,
      transitionDebugGeometry,
      transitionDebugMaterials,
      setTransitionDebugLines,
    });
    const criticalItemVisuals = createCriticalItemVisualManager({
      state,
      world,
      assetManager,
      particleSystem,
      items,
      criticalPathItems,
      criticalItemVisualGroup,
      getVisualYAt,
    });
    state.npcs = [];

    const setActiveNpcsForCurrentMap = createSetActiveNpcsForCurrentMap(
      state,
      setActiveForMap,
      () => syncVillageNpcReactivity(state, npcData, npcWander),
    );


    const {
      syncWhisperingWoodsShortcutState,
      syncHollowShortcutState,
      syncForestFortGateState,
      syncHollowFogGateState,
      syncHollowArenaExitState,
      syncVillageReactivityState,
      syncOpenedChestState,
      syncHarvestedTempestGrassState,
      syncPersistentMapState,
      handleMapTransition,
      handlePortalTransition,
      respawnEnemiesForCurrentMap,
    } = createRuntimeMapFlow({
      state,
      world,
      allMaps,
      notify,
      showTransitionOverlay: (mapName: string, mapSubtitle?: string) => {
        setTransitionMapName(mapName);
        setTransitionMapSubtitle(mapSubtitle ?? '');
        setTransitionActive(true);
        effectTimeouts.push(setTimeout(() => setTransitionActive(false), 800));
      },
      setBiomeForMap: (mapId: string) => {
        biomeAmbience.setBiome(MAP_BIOMES[mapId] || 'grassland');
      },
      switchMusicTrack,
      triggerSave,
      resolveSafeTransitionPosition,
      syncPlayerSpatialState: (_targetMap: string, worldX: number, worldY: number) => {
        runtimeSession.animation.currentDir8 = 'down';
        state.player.direction = 'down';
        runtimeSession.visual.playerSmoothedElevation = world.getElevationAt(worldX, worldY);
        playerMesh.position.set(worldX, getPlayerVisualY(worldX, worldY), 0.2);
        cameraTarget.x = worldX;
        cameraTarget.y = getPlayerVisualY(worldX, worldY);
        camera.position.x = worldX;
        camera.position.y = getPlayerVisualY(worldX, worldY);
        world.updateChunks(worldX, worldY);
      },
      resetExplorationState: () => {
        triggerMinimapUpdate(true);
        triggerUIUpdate();
      },
      isPortalDestinationUnlocked: targetMap => isPortalDestinationUnlocked(state, targetMap),
      setPortalCooldown: (seconds: number) => {
        runtimeSession.loop.portalCooldown = seconds;
      },
      setActiveForCurrentMap: setActiveNpcsForCurrentMap,
      playPortalWarp: () => {
        playPortalWarpRef.current?.();
      },
      assetManager,
      combatSystem,
      enemyVisuals,
      applyMapEntryProgression: targetMap => applyMapEntryProgression(state, targetMap),
    });
    syncVillageReactivityRef.current = () => {
      setActiveNpcsForCurrentMap();
      syncVillageReactivityState();
    };

    syncPersistentMapState();
    world.updateChunks(state.player.position.x, state.player.position.y);
    respawnEnemiesForCurrentMap(state.currentMap, world.getCurrentMap());
    setActiveNpcsForCurrentMap();

    const {
      enemyAudio,
      playFootstep,
      playGameOverSound,
      playPotionDrink,
      playGrassChew,
      playBlock,
      playPlayerHit,
      playHeroEvent,
      playGateShortcut,
      startPortalChargeLoop,
      stopPortalChargeLoop,
      playPortalWarp,
      playDialogueAdvance,
      startDialogueLoop,
      stopDialogueLoop,
      playMenuOpen,
      playMenuClose,
      usePotion,
      checkInteraction,
      performDodge,
      performAttack,
      performChargeAttack,
    } = (() => {
      try {
        return setupRuntimeActionPhase({
          state,
          world,
          runtimeSession,
          processAudioElement,
          musicRef,
          musicStarted,
          showHeroOverlay,
          particleSystem,
          combatSystem,
          floatingText,
          screenShake,
          items,
          criticalPathItems,
          criticalItemInteractionIds: CRITICAL_ITEM_INTERACTION_IDS,
          createDialogueProgression,
          activeNpcWorldPos,
          setCurrentDialogue,
          addMarkersFromText,
          notify,
          triggerSave,
          triggerUIUpdate,
          respawnEnemiesForCurrentMap,
          syncOpenedChestState,
          syncHarvestedTempestGrassState,
          syncWhisperingWoodsShortcutState,
          syncHollowShortcutState,
          syncForestFortGateState,
          syncHollowFogGateState,
          syncHollowArenaExitState,
          handleMapTransition,
          healCooldowns,
          hasDialogue: interactionId => Boolean(dialogues[interactionId]),
          dir8to4: direction8ToCardinal,
          getKillCount: () => killCount,
          setKillCount: value => {
            killCount = value;
            killCountRef.current = value;
          },
          getCurrentDir8: () => runtimeSession.animation.currentDir8,
          healCooldownMs: HEAL_COOLDOWN_MS,
          drinkDuration: DRINK_DURATION,
          attackFrameDuration: ATTACK_FRAME_DURATION,
          spinFrameDuration: SPIN_FRAME_DURATION,
          spinDirections: SPIN_DIRECTIONS,
          swooshDuration: SWOOSH_DURATION,
          spinSwooshDuration: SPIN_SWOOSH_DURATION,
          attackStaminaCost: ATTACK_STAMINA_COST,
          chargeAttackStaminaCost: CHARGE_ATTACK_STAMINA_COST,
          chargeDamageMult: CHARGE_DAMAGE_MULT,
          dodgeIFrameDuration: DODGE_IFRAME_DURATION,
          dodgeStaminaCost: 26,
          lungeDistMin: LUNGE_DIST_MIN,
          lungeDistMax: LUNGE_DIST_MAX,
          lungeSpeedBase: LUNGE_SPEED_BASE,
          lungeSpeedFull: LUNGE_SPEED_FULL,
          lungeRecoveryMin: LUNGE_RECOVERY_MIN,
          lungeRecoveryMax: LUNGE_RECOVERY_MAX,
        });
      } catch (error) {
        fatalRuntime.report(error, 'action phase setup');
        fatalSetupError = true;
        return {
          enemyAudio: null as any,
          playFootstep: () => {},
          playGameOverSound: () => {},
          playPotionDrink: () => {},
          playGrassChew: () => {},
          playBlock: () => {},
          playPlayerHit: () => {},
          playHeroEvent: () => {},
          playGateShortcut: () => {},
          startPortalChargeLoop: () => {},
          stopPortalChargeLoop: () => {},
          playPortalWarp: () => {},
          playDialogueAdvance: () => {},
          startDialogueLoop: () => {},
          stopDialogueLoop: () => {},
          playMenuOpen: () => {},
          playMenuClose: () => {},
          usePotion: () => {},
          checkInteraction: () => {},
          performDodge: () => {},
          performAttack: () => {},
          performChargeAttack: () => {},
        };
      }
    })();
    playPotionDrinkRef.current = playPotionDrink;
    playGrassChewRef.current = playGrassChew;
    playHeroEventRef.current = playHeroEvent;
    playPortalWarpRef.current = playPortalWarp;
    startPortalChargeLoopRef.current = startPortalChargeLoop;
    stopPortalChargeLoopRef.current = stopPortalChargeLoop;
    playDialogueAdvanceRef.current = playDialogueAdvance;
    startDialogueLoopRef.current = startDialogueLoop;
    stopDialogueLoopRef.current = stopDialogueLoop;
    playMenuOpenRef.current = playMenuOpen;
    playMenuCloseRef.current = playMenuClose;

    const { keys, detachDomEvents } = (() => {
      try {
        return setupRuntimeInputPhase({
          state,
          pausedRef,
          playerDeadRef,
          mapModalOpenRef,
          setMapModalOpenRef,
          setIsPaused,
          closeDialogueSession: () => closeDialogueSession(state),
          notify,
          triggerUIUpdate,
          syncEquippedWeapon,
          setTransitionDebugEnabled,
          setTransitionDebugLines,
          rebuildTransitionDebug: () => {
            transitionDebugManager.rebuild(state.player.position);
          },
          clearTransitionDebug: () => {
            transitionDebugManager.clear();
          },
          getTransitionDebug: () => transitionDebug,
          setTransitionDebug: enabled => {
            transitionDebug = enabled;
            transitionDebugGroup.visible = enabled;
          },
          runtimeSession,
          playBlock,
          usePotion,
          performAttack,
          performChargeAttack,
          chargeTimeMin: CHARGE_TIME_MIN,
          camera,
          renderer,
          frustumSize,
        });
      } catch (error) {
        fatalRuntime.report(error, 'input phase setup');
        fatalSetupError = true;
        return {
          keys: {},
          detachDomEvents: () => {},
        };
      }
    })();

    const lastNpcProjected = { x: 0, y: 0 };
    const NPC_SCREEN_MIN_MS = 48;
    const NPC_SCREEN_MIN_PX = 3;
    const phaseAdapters = createRuntimePhaseAdapters({
      state,
      world,
      particleSystem,
      tempVector: _tmpVec3,
      criticalItemInteractionIds: CRITICAL_ITEM_INTERACTION_IDS,
      criticalPathItems,
      items,
      setInteractionPrompt,
      closeDialogueSession: () => closeDialogueSession(state),
      isPortalDestinationUnlocked: targetMap => isPortalDestinationUnlocked(state, targetMap),
    });
    const phaseContexts = (() => {
      try {
        return buildRuntimePhaseContexts({
          state,
          world,
          assetManager,
          combatSystem,
          floatingText,
          screenShake,
          particleSystem,
          biomeAmbience,
          weatherSystem,
          dayNightCycle,
          scene,
          camera,
          renderer,
          activeNpcIndices,
          npcData,
          npcWander,
          isNpcPriorityCueTarget,
          npcScaleById: NPC_SCALE_BY_ID,
          npcFootOffset: NPC_FOOT_OFFSET,
          getVisualYAt,
          getActorRenderOrder,
          npcMeshes,
          npcShadows,
          npcOutlines,
          npcObjectiveHalos,
          npcObjectiveRings,
          checkInteraction,
          usePotion,
          keys,
          visitedTiles: visitedTilesRef.current,
          getDirection8: getDirection8FromVector,
          dir8to4: direction8ToCardinal,
          performDodge,
          playFootstep,
          emitDust: phaseAdapters.emitDust,
          emitHeal: phaseAdapters.emitHeal,
          triggerUIUpdateThrottled,
          triggerMinimapUpdate,
          blockStaminaCost: BLOCK_STAMINA_COST,
          footstepInterval,
          attackFrameDuration: ATTACK_FRAME_DURATION,
          spinFrameDuration: SPIN_FRAME_DURATION,
          spinDirections: SPIN_DIRECTIONS,
          idleFrameDuration: IDLE_FRAME_DURATION,
          walkFrameDuration: WALK_FRAME_DURATION,
          chargeTimeMin: CHARGE_TIME_MIN,
          chargeTimeMax: CHARGE_TIME_MAX,
          lungeState: runtimeSession.lunge,
          onLungeHit: (enemy: any, damage: number) => {
            const result = combatSystem.playerAttack(
              enemy,
              damage,
              state.player.position,
              state.player.direction,
            );
            const actualDamage = enemy.state === 'staggered' ? Math.floor(damage * 2) : damage;
            floatingText.spawnDamage(enemy.position.x, enemy.position.y, actualDamage, true);
            screenShake.shake(0.2, 0.15);
            screenShake.hitStop(0.04);
            if (result.backstab) {
              floatingText.spawn(enemy.position.x, enemy.position.y + 0.6, 'BACKSTAB!', '#FFD700', 24);
            }
            if (result.staggered) {
              floatingText.spawn(enemy.position.x, enemy.position.y + 0.4, 'STAGGER!', '#88AAFF', 20);
            }
            particleSystem.emitDamage(new THREE.Vector3(enemy.position.x, enemy.position.y, 0.3));
            particleSystem.emitSparkles(new THREE.Vector3(enemy.position.x, enemy.position.y + 0.3, 0.5));
            if (result.killed) {
              const nextKillCount = killCountRef.current + 1;
              killCountRef.current = nextKillCount;
              killCount = nextKillCount;
              enemyAudio.playDefeat(enemy);
              enemyAudio.clearEnemy(enemy.id);
              notify(`Defeated ${enemy.name}!`, {
                id: 'enemy-kill',
                description: enemy.essenceReward > 0 ? `+${enemy.essenceReward} essence` : undefined,
                duration: 2000,
              });
            }
          },
          onLungeEnd: () => {
            // Recovery complete — no additional SFX needed (swing played at lunge start)
          },
          dodgeIFrameDuration: DODGE_IFRAME_DURATION,
          textureCache: textureCacheRef.current,
          playerBaseScale: PLAYER_BASE_SCALE,
          outlinePad: OUTLINE_PAD,
          getPlayerTextureName,
          getPlayerVisualY,
          playerMesh,
          playerMaterial,
          playerOutline,
          playerShadow,
          bladeOverlayMesh,
          heldItemMesh,
          potionMaterial,
          swooshMesh,
          swooshMaterial,
          spinSwooshMesh,
          spinSwooshMaterial,
          indicatorMesh,
          indicatorMaterial,
          objectiveIndicatorRingMesh,
          objectiveIndicatorRingMaterial,
          objectiveIndicatorOuterMesh,
          objectiveIndicatorOuterMaterial,
          essenceOrbMesh,
          essenceOrbMaterial,
          swooshDuration: SWOOSH_DURATION,
          getInteractionPromptLabel: phaseAdapters.resolveInteractionPrompt,
          isPortalDestinationUnlocked: phaseAdapters.isPortalDestinationUnlocked,
          samplePortalNearPlayer,
          samplePortalForWarpFoot,
          getMapDisplayName,
          criticalItemInteractionIds: CRITICAL_ITEM_INTERACTION_IDS,
          isCollectedCriticalItem: phaseAdapters.isCollectedCriticalItem,
          isChestOpened: phaseAdapters.isChestOpened,
          isConsumablePickupCollected: phaseAdapters.isConsumablePickupCollected,
          setInteractionPrompt: phaseAdapters.setInteractionPrompt,
          criticalItemVisuals,
          transitionDebugManager,
          portalWarpManager,
          notify,
          handleMapTransition,
          handlePortalTransition,
          enemyVisualProfiles: ENEMY_VISUALS,
          enemyVisuals,
          enemyAudio,
          playPlayerHit,
          shadowGeometry,
          shadowMaterial,
          createOutlineMesh,
          closeDialogueSession: phaseAdapters.closeDialogueSession,
          setNpcScreenPos,
          npcScreenMinMs: NPC_SCREEN_MIN_MS,
          npcScreenMinPx: NPC_SCREEN_MIN_PX,
          autoSaveInterval: AUTO_SAVE_INTERVAL,
          triggerSave,
        });
      } catch (error) {
        fatalRuntime.report(error, 'phase context setup');
        fatalSetupError = true;
        return null as any;
      }
    })();
    const animate = () => {
      if (disposed) return;
      if (fatalSetupError || !phaseContexts) return;
      rafId = requestAnimationFrame(animate);

      try {
        fatalRuntime.clear();
        lastInteractionPromptRef.current = runRuntimeFrame({
          runtimeSession,
          phaseContexts,
          currentTime: performance.now(),
          maxDelta: MAX_DELTA,
          isPaused: pausedRef.current,
          isMapModalOpen: mapModalOpenRef.current,
          isPlayerDead: playerDeadRef.current,
          renderFrame: () => renderer.render(scene, camera),
          updateScreenShake: dt => screenShake.update(dt),
          updateFloatingText: dt => floatingText.update(dt),
          state,
          camera,
          cameraTarget,
          spinDirections: SPIN_DIRECTIONS,
          spinSwooshDuration: SPIN_SWOOSH_DURATION,
          transitionDebug,
          lastInteractionPrompt: lastInteractionPromptRef.current,
          particleSystem,
          activeNpcWorldPos: activeNpcWorldPos.current,
          lastNpcProjected,
          currentBiome: (() => {
            const baseBiome = MAP_BIOMES[state.currentMap] || 'grassland';
            if (baseBiome === 'forest') {
              const map = world.getCurrentMap();
              const tileY = Math.floor(state.player.position.y + map.height / 2);
              if (tileY < 75) return 'forest_hollow';
            }
            return baseBiome;
          })(),
          onPlayerDied: lostEssence => {
            playerDeadRef.current = true;
            playGameOverSound();
            setDeathEssenceLost(lostEssence);
            setDeathActive(true);
          },
        });
      } catch (error) {
        disposed = true;
        fatalRuntime.report(error, 'frame execution');
      }
    };

    deathRespawnFnRef.current = createDeathRespawnHandler({
      gameStateRef,
      worldRef,
      cameraRef,
      items,
      biomeAmbience,
      mapBiomes: MAP_BIOMES,
      setActiveNpcsForCurrentMap,
      switchMusicTrack,
      syncPersistentMapState,
      getPlayerVisualY,
      playerMesh,
      cameraTarget,
      setPlayerSmoothedElevation: elevation => {
        runtimeSession.visual.playerSmoothedElevation = elevation;
      },
      respawnEnemiesForMap: respawnEnemiesForCurrentMap,
      closeDialogueSession,
      triggerSave,
      triggerUIUpdate,
      triggerMinimapUpdate,
    });

    animate();

    cancelEnemyPrewarm = assetManager.startBackgroundEnemyPrewarm(() => disposed);

    queueRuntimeStartupNotifications({
      savedData,
      state,
      effectTimeouts,
      isDisposed: () => disposed,
      addMarkersFromText,
      notify,
    });

    return () => {
      disposed = true;
      performRuntimeTeardown({
        rafId,
        effectTimeouts,
        cancelEnemyPrewarm,
        clearRuntimeRefs: () => {
          fatalRuntime.clear();
          stopDialogueLoopRef.current?.();
          stopPortalChargeLoopRef.current?.();
          syncVillageReactivityRef.current = null;
          playPotionDrinkRef.current = null;
          playGrassChewRef.current = null;
          playHeroEventRef.current = null;
          playPortalWarpRef.current = null;
          startPortalChargeLoopRef.current = null;
          stopPortalChargeLoopRef.current = null;
          playDialogueAdvanceRef.current = null;
          startDialogueLoopRef.current = null;
          stopDialogueLoopRef.current = null;
          playMenuOpenRef.current = null;
          playMenuCloseRef.current = null;
          gameStateRef.current = null;
          worldRef.current = null;
          assetManagerRef.current = null;
          cameraRef.current = null;
          rendererRef.current = null;
        },
        detachDomEvents,
        mountElement,
        rendererDomElement: renderer.domElement,
        cleanupResources: () => {
          cleanupRuntimeResources({
            scene,
            renderer,
            world,
            enemyVisuals,
            disposePlayerVisuals,
            disposeNpcVisuals,
            transitionDebugManager,
            criticalItemVisuals,
            particleSystem,
            biomeAmbience,
            weatherSystem,
            dayNightCycle,
            floatingText,
            criticalItemVisualGroup,
            transitionDebugGroup,
            indicatorMesh,
            indicatorMaterial,
            indicatorGeometry,
            objectiveIndicatorRingMesh,
            objectiveIndicatorRingMaterial,
            objectiveIndicatorOuterMesh,
            objectiveIndicatorOuterMaterial,
            essenceOrbMesh,
            essenceOrbMaterial,
            swooshMesh,
            swooshMaterial,
            spinSwooshMesh,
            spinSwooshMaterial,
          });
        },
      });
    };
}
