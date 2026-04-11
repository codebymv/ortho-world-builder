import { Suspense, lazy, useEffect, useRef, useState, useCallback } from 'react';
import * as THREE from 'three';
import { GameState } from '@/lib/game/GameState';
import { AssetManager } from '@/lib/game/AssetManager';
import { World, type CollisionDebugSnapshot } from '@/lib/game/World';
import { MapMarker, extractMarkersFromText } from '@/lib/game/MapMarkers';
import { SaveManager } from '@/lib/game/SaveManager';
import { preloadMap } from '@/data/maps';
import type { DialogueNode } from '@/data/dialogues';
import type { VendorItem } from '@/data/vendors';
import type { CurrencyGain, Item } from '@/lib/game/GameState';
import { DialogueBox } from './game/DialogueBox';
import { GameUI } from './game/GameUI';
import { Minimap } from './game/Minimap';
import { NotificationFeed } from './game/NotificationFeed';
import { PauseMenu } from './game/PauseMenu';
import { TransitionOverlay } from './game/TransitionOverlay';
import { DeathOverlay } from './game/DeathOverlay';
import { BonfireOverlay } from './game/BonfireOverlay';
import { BonfireMenu } from './game/BonfireMenu';
import { WeaponAcquiredOverlay } from './game/WeaponAcquiredOverlay';
import { notify } from '@/lib/game/notificationBus';
import { createProgressionService } from '@/game/domain/ProgressionService';
import { createAudioProcessor } from '@/game/domain/AudioDirector';
import type { BonfireEntry } from '@/data/bonfires';
import type {
  RuntimeCallbacks,
  RuntimeContent,
  RuntimeHostRefs,
  RuntimeUiBindings,
} from '@/game/runtime/setupGameRuntime';
import { useGameMusic } from '@/game/runtime/useGameMusic';
import { useGameRuntime } from '@/game/runtime/useGameRuntime';

type InteractionPrompt = string | null;
type LoadedRuntimeContent = {
  items: typeof import('@/data/items').items;
  criticalPathItems: typeof import('@/data/criticalPathItems').criticalPathItems;
};

type LoadedInteractionContent = {
  dialogues: typeof import('@/data/dialogues').dialogues;
  quests: typeof import('@/data/quests').quests;
  vendors: typeof import('@/data/vendors').vendors;
};

const loadMapModal = () => import('./game/MapModal');
const loadInventoryModal = () => import('./game/InventoryModal');
const loadObjectivesModal = () => import('./game/ObjectivesModal');
const loadVendorModal = () => import('./game/VendorModal');
const runtimeSetupPromise = import('@/game/runtime/setupGameRuntime');
let runtimeContentPromise: Promise<LoadedRuntimeContent> | null = null;
const loadRuntimeContent = () => {
  runtimeContentPromise ??= Promise.all([
    import('@/data/items'),
    import('@/data/criticalPathItems'),
  ]).then(([itemsModule, criticalPathItemsModule]) => ({
    items: itemsModule.items,
    criticalPathItems: criticalPathItemsModule.criticalPathItems,
  }));

  return runtimeContentPromise;
};

let interactionContentPromise: Promise<LoadedInteractionContent> | null = null;
const loadInteractionContent = () => {
  interactionContentPromise ??= Promise.all([
    import('@/data/dialogues'),
    import('@/data/quests'),
    import('@/data/vendors'),
  ]).then(([dialoguesModule, questsModule, vendorsModule]) => ({
    dialogues: dialoguesModule.dialogues,
    quests: questsModule.quests,
    vendors: vendorsModule.vendors,
  }));

  return interactionContentPromise;
};

const LazyMapModal = lazy(async () => ({ default: (await loadMapModal()).MapModal }));
const LazyInventoryModal = lazy(async () => ({ default: (await loadInventoryModal()).InventoryModal }));
const LazyObjectivesModal = lazy(async () => ({ default: (await loadObjectivesModal()).ObjectivesModal }));
const LazyVendorModal = lazy(async () => ({ default: (await loadVendorModal()).VendorModal }));

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
  const killCountRef = useRef(0);
  const runtimeContentRef = useRef<LoadedRuntimeContent | null>(null);
  const interactionContentRef = useRef<LoadedInteractionContent | null>(null);
  const syncVillageReactivityRef = useRef<(() => void) | null>(null);
  const syncBlightedRootStateRef = useRef<(() => void) | null>(null);
  const playPotionDrinkRef = useRef<(() => void) | null>(null);
  const playGrassChewRef = useRef<(() => void) | null>(null);
  const playHeroEventRef = useRef<(() => void) | null>(null);
  const playPortalWarpRef = useRef<(() => void) | null>(null);
  const startPortalChargeLoopRef = useRef<(() => void) | null>(null);
  const stopPortalChargeLoopRef = useRef<(() => void) | null>(null);
  const playDialogueAdvanceRef = useRef<(() => void) | null>(null);
  const startDialogueLoopRef = useRef<(() => void) | null>(null);
  const stopDialogueLoopRef = useRef<(() => void) | null>(null);
  const playMenuOpenRef = useRef<(() => void) | null>(null);
  const playMenuCloseRef = useRef<(() => void) | null>(null);
  const restAtBonfireRef = useRef<(() => void) | null>(null);
  const travelToBonfireRef = useRef<((entry: BonfireEntry) => void) | null>(null);

  // Audio processing system for compression and gain
  const audioContextRef = useRef<AudioContext | null>(null);
  const compressorRef = useRef<DynamicsCompressorNode | null>(null);
  const gainNodeRef = useRef<GainNode | null>(null);
  const masterGainRef = useRef<GainNode | null>(null);

  const audioSourcesConnectedRef = useRef<Set<HTMLAudioElement>>(new Set());
  const audioProcessorRef = useRef<ReturnType<typeof createAudioProcessor> | null>(null);
  if (!audioProcessorRef.current) {
    audioProcessorRef.current = createAudioProcessor({
      audioContextRef,
      compressorRef,
      gainNodeRef,
      masterGainRef,
      audioSourcesConnectedRef,
    });
  }
  const audioProcessor = audioProcessorRef.current;
  const processAudioElement = audioProcessor.processAudioElement;
  const cleanupAudioProcessor = useCallback(() => {
    audioProcessor.cleanup();
  }, [audioProcessor]);
  const resumeAudioProcessor = useCallback(() => {
    return audioProcessor.resumeAudioContext().then(() => {});
  }, [audioProcessor]);

  // New state for overlays
  const [isPaused, setIsPaused] = useState(false);
  const [transitionActive, setTransitionActive] = useState(false);
  const [transitionMapName, setTransitionMapName] = useState('');
  const [transitionMapSubtitle, setTransitionMapSubtitle] = useState('');
  const [deathActive, setDeathActive] = useState(false);
  const [deathEssenceLost, setDeathEssenceLost] = useState(0);
  const [showControls, setShowControls] = useState(true);
  const [mapModalOpen, setMapModalOpen] = useState(false);
  const [inventoryModalOpen, setInventoryModalOpen] = useState(false);
  const [objectivesModalOpen, setObjectivesModalOpen] = useState(false);
  const [vendorModalOpen, setVendorModalOpen] = useState(false);
  const [activeVendorId, setActiveVendorId] = useState<string | null>(null);
  const [transitionDebugEnabled, setTransitionDebugEnabled] = useState(false);
  const [transitionDebugLines, setTransitionDebugLines] = useState<string[]>([]);
  const [collisionDebugEnabled, setCollisionDebugEnabled] = useState(false);
  const [collisionDebugSnapshot, setCollisionDebugSnapshot] = useState<CollisionDebugSnapshot | null>(null);
  const [interactionPrompt, setInteractionPrompt] = useState<InteractionPrompt>(null);
  const [bonfireOverlayActive, setBonfireOverlayActive] = useState(false);
  const [bonfireOverlayTitle, setBonfireOverlayTitle] = useState('Flame Kindled');
  const [bonfireOverlaySubtitle, setBonfireOverlaySubtitle] = useState<string | null>(null);
  const [justPickedUpItem, setJustPickedUpItem] = useState<Item | null>(null);
  const [justGainedCurrency, setJustGainedCurrency] = useState<CurrencyGain | null>(null);
  const [weaponAcquiredItem, setWeaponAcquiredItem] = useState<Item | null>(null);
  const [bonfireMenuOpen, setBonfireMenuOpen] = useState(false);
  const bonfireOverlayTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const justPickedUpTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const justGainedCurrencyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pausedRef = useRef(false);
  const playerDeadRef = useRef(false);
  const deathRespawnFnRef = useRef<(() => void) | null>(null);
  const controlsTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastInteractionPromptRef = useRef<InteractionPrompt>(null);
  const previousPausedStateRef = useRef(isPaused);
  const previousMenuModalOpenRef = useRef(false);

  useEffect(() => {
    return () => {
      if (bonfireOverlayTimerRef.current) {
        clearTimeout(bonfireOverlayTimerRef.current);
        bonfireOverlayTimerRef.current = null;
      }
      if (justPickedUpTimerRef.current) {
        clearTimeout(justPickedUpTimerRef.current);
        justPickedUpTimerRef.current = null;
      }
      if (justGainedCurrencyTimerRef.current) {
        clearTimeout(justGainedCurrencyTimerRef.current);
        justGainedCurrencyTimerRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (!gameState) return;

    gameState.onItemAdded = (item: Item) => {
      if (item.type === 'equipment') {
        setWeaponAcquiredItem({ ...item });
        return;
      }
      setJustPickedUpItem({ ...item });
      if (justPickedUpTimerRef.current) {
        clearTimeout(justPickedUpTimerRef.current);
      }
      justPickedUpTimerRef.current = setTimeout(() => {
        setJustPickedUpItem(null);
        justPickedUpTimerRef.current = null;
      }, 2600);
    };

    gameState.onCurrencyGained = (gain: CurrencyGain) => {
      setJustGainedCurrency({ ...gain });
      if (justGainedCurrencyTimerRef.current) {
        clearTimeout(justGainedCurrencyTimerRef.current);
      }
      justGainedCurrencyTimerRef.current = setTimeout(() => {
        setJustGainedCurrency(null);
        justGainedCurrencyTimerRef.current = null;
      }, 1800);
    };

    return () => {
      if (gameState.onItemAdded) {
        gameState.onItemAdded = null;
      }
      if (gameState.onCurrencyGained) {
        gameState.onCurrencyGained = null;
      }
    };
  }, [gameState]);

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

  const clearNpcMarkerPulse = useCallback((mapId: string) => {
    const now = Date.now();
    const updated = mapMarkersRef.current.map(m =>
      m.map === mapId && m.type === 'npc' && m.pulseUntil > now
        ? { ...m, pulseUntil: now }
        : m
    );
    mapMarkersRef.current = updated;
    setMapMarkers(updated);
    triggerMinimapUpdate(true);
  }, []);

  const setMapModalOpenRef = useRef(setMapModalOpen);
  setMapModalOpenRef.current = setMapModalOpen;
  const setInventoryModalOpenRef = useRef(setInventoryModalOpen);
  setInventoryModalOpenRef.current = setInventoryModalOpen;
  const setObjectivesModalOpenRef = useRef(setObjectivesModalOpen);
  setObjectivesModalOpenRef.current = setObjectivesModalOpen;
  const setVendorModalOpenRef = useRef(setVendorModalOpen);
  setVendorModalOpenRef.current = setVendorModalOpen;

  // mapModalOpenRef is checked throughout the runtime to pause player input.
  // We sync it to true when ANY menu modal is open so all runtime guards work.
  const mapModalOpenRef = useRef(false);
  mapModalOpenRef.current = mapModalOpen || inventoryModalOpen || objectivesModalOpen || vendorModalOpen;

  // Individual refs so the keyboard handler can check which specific modal is open for Escape
  const inventoryModalOpenRef = useRef(false);
  inventoryModalOpenRef.current = inventoryModalOpen;
  const objectivesModalOpenRef = useRef(false);
  objectivesModalOpenRef.current = objectivesModalOpen;
  const vendorModalOpenRef = useRef(false);
  vendorModalOpenRef.current = vendorModalOpen;

  const triggerUIUpdate = () => setUiVersion(prev => prev + 1);
  const lastUIUpdateRef = useRef(0);
  const lastUiHudSnapshotRef = useRef<{
    health: number;
    stamina: number;
    maxHealth: number;
    maxStamina: number;
    gold: number;
    essence: number;
  } | null>(null);
  const triggerUIUpdateThrottled = (now: number = performance.now()) => {
    const state = gameStateRef.current;
    if (!state) return;

    const nextSnapshot = {
      health: state.player.health,
      stamina: Math.round(state.player.stamina),
      maxHealth: state.player.maxHealth,
      maxStamina: state.player.maxStamina,
      gold: state.player.gold,
      essence: state.player.essence,
    };
    const prevSnapshot = lastUiHudSnapshotRef.current;
    const changed = !prevSnapshot ||
      prevSnapshot.health !== nextSnapshot.health ||
      prevSnapshot.stamina !== nextSnapshot.stamina ||
      prevSnapshot.maxHealth !== nextSnapshot.maxHealth ||
      prevSnapshot.maxStamina !== nextSnapshot.maxStamina ||
      prevSnapshot.gold !== nextSnapshot.gold ||
      prevSnapshot.essence !== nextSnapshot.essence;

    if (!changed) return;
    if (now - lastUIUpdateRef.current < 90) return;

    lastUIUpdateRef.current = now;
    lastUiHudSnapshotRef.current = nextSnapshot;
    setUiVersion(prev => prev + 1);
  };
  const triggerMinimapUpdate = (force: boolean = false, now: number = performance.now()) => {
    if (force || now - lastMinimapRefreshRef.current >= 120) {
      lastMinimapRefreshRef.current = now;
      setMinimapVersion(prev => prev + 1);
    }
  };
  const refreshCollisionDebug = useCallback(() => {
    const state = gameStateRef.current;
    const world = worldRef.current;
    if (!state || !world) return;
    setCollisionDebugSnapshot(
      world.getCollisionDebugSnapshot(state.player.position.x, state.player.position.y, 0.2, 3),
    );
  }, []);
  const showHeroOverlay = useCallback((title: string, subtitle?: string) => {
    playHeroEventRef.current?.();
    if (bonfireOverlayTimerRef.current) {
      clearTimeout(bonfireOverlayTimerRef.current);
      bonfireOverlayTimerRef.current = null;
    }
    setBonfireOverlayTitle(title);
    setBonfireOverlaySubtitle(subtitle ?? null);
    setBonfireOverlayActive(false);
    requestAnimationFrame(() => setBonfireOverlayActive(true));
    bonfireOverlayTimerRef.current = setTimeout(() => {
      setBonfireOverlayActive(false);
      bonfireOverlayTimerRef.current = null;
    }, 2900);
  }, []);

  const handlePlayPotionDrink = useCallback(() => {
    playPotionDrinkRef.current?.();
  }, []);

  const handlePlayGrassChew = useCallback(() => {
    playGrassChewRef.current?.();
  }, []);

  const handlePlayMenuOpen = useCallback(() => {
    playMenuOpenRef.current?.();
  }, []);

  const handlePlayMenuClose = useCallback(() => {
    playMenuCloseRef.current?.();
  }, []);
  const createDialogueProgression = () => {
    const runtimeContent = runtimeContentRef.current;
    const interactionContent = interactionContentRef.current;
    if (!runtimeContent || !interactionContent) {
      void loadInteractionContent()
        .then(loadedInteractionContent => {
          interactionContentRef.current ??= loadedInteractionContent;
        })
        .catch(error => {
          console.error('[Game] Failed to load interaction content', error);
        });
      return null;
    }

    return createProgressionService({
      dialogues: interactionContent.dialogues,
      quests: interactionContent.quests,
      items: runtimeContent.items,
      criticalPathItems: runtimeContent.criticalPathItems,
      notify,
      addMarkersFromText,
      clearNpcMarkerPulse,
      getKillCount: () => killCountRef.current,
      triggerUIUpdate,
      triggerMinimapUpdate,
      syncVillageReactivity: () => {
        syncVillageReactivityRef.current?.();
      },
      syncBlightedRootState: () => {
        syncBlightedRootStateRef.current?.();
      },
    });
  };
  const closeDialogueSession = (stateToClose?: GameState | null) => {
    if (stateToClose) {
      stateToClose.dialogueActive = false;
      stateToClose.currentDialogue = null;
    }
    activeNpcWorldPos.current = null;
    setCurrentDialogue(null);
    setNpcScreenPos(null);
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
    if (previousPausedStateRef.current !== isPaused) {
      (isPaused ? playMenuOpenRef.current : playMenuCloseRef.current)?.();
      previousPausedStateRef.current = isPaused;
    }
  }, [isPaused]);

  useEffect(() => {
    const preloadMenuChunks = () => {
      void loadMapModal();
      void loadInventoryModal();
      void loadObjectivesModal();
      void loadVendorModal();
      const startMap = SaveManager.load()?.currentMap ?? 'village';
      void preloadMap(startMap).catch(() => {
        // Best-effort idle prefetch only.
      });
    };

    if ('requestIdleCallback' in window) {
      const idleId = window.requestIdleCallback(preloadMenuChunks, { timeout: 2000 });
      return () => window.cancelIdleCallback(idleId);
    }

    const timeoutId = window.setTimeout(preloadMenuChunks, 1200);
    return () => window.clearTimeout(timeoutId);
  }, []);

  // Unified menu modal sound effect — plays open/close for map, inventory, or objectives.
  const anyMenuModalOpen = mapModalOpen || inventoryModalOpen || objectivesModalOpen;
  useEffect(() => {
    if (previousMenuModalOpenRef.current !== anyMenuModalOpen) {
      (anyMenuModalOpen ? playMenuOpenRef.current : playMenuCloseRef.current)?.();
      previousMenuModalOpenRef.current = anyMenuModalOpen;
    }
  }, [anyMenuModalOpen]);

  useEffect(() => {
    const handleCollisionDebugToggle = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() !== 'b' || e.repeat) return;
      setCollisionDebugEnabled(prev => {
        const next = !prev;
        if (next) {
          refreshCollisionDebug();
          notify('Collision debug ON', {
            id: 'collision-debug-on',
            description: 'Shows nearby tiles, player corner samples, and movement probes.',
            duration: 2400,
          });
        } else {
          setCollisionDebugSnapshot(null);
          notify('Collision debug OFF', { id: 'collision-debug-off', duration: 1600 });
        }
        return next;
      });
    };

    window.addEventListener('keydown', handleCollisionDebugToggle);
    return () => window.removeEventListener('keydown', handleCollisionDebugToggle);
  }, [refreshCollisionDebug]);

  useEffect(() => {
    if (!collisionDebugEnabled) return;
    refreshCollisionDebug();
    const interval = window.setInterval(refreshCollisionDebug, 100);
    return () => window.clearInterval(interval);
  }, [collisionDebugEnabled, refreshCollisionDebug]);

  const handleDialogueResponse = (nextId: string, givesQuest?: string, opensVendor?: string) => {
    if (!gameState || !currentDialogue) return;

    const progressionService = createDialogueProgression();
    if (!progressionService) return;

    const result = progressionService.handleDialogueResponse({
      state: gameState,
      currentDialogue,
      nextId,
      givesQuest,
      opensVendor,
    });

    if (result.openVendorId) {
      closeDialogueSession(gameState);
      setActiveVendorId(result.openVendorId);
      setVendorModalOpen(true);
      SaveManager.save(gameState, mapMarkersRef.current, visitedTilesRef.current);
      return;
    }

    if (result.shouldCloseDialogue) {
      closeDialogueSession(gameState);
      SaveManager.save(gameState, mapMarkersRef.current, visitedTilesRef.current);
      return;
    }

    if (result.nextNode) {
      setCurrentDialogue({ node: result.nextNode, npcName: currentDialogue.npcName });
    }

    if (result.shouldSave) {
      SaveManager.save(gameState, mapMarkersRef.current, visitedTilesRef.current);
    }
  };

  const handleVendorPurchase = useCallback((vendorItem: VendorItem, item: Item) => {
    if (!gameState) return;
    
    if (vendorItem.currency === 'gold') {
      if (gameState.player.gold >= vendorItem.price) {
        gameState.spendGold(vendorItem.price);
        gameState.addItem({ ...item });
        notify(`Purchased ${item.name}!`, {
          type: 'success',
          description: `Spent ${vendorItem.price} gold.`,
          duration: 3000,
        });
        triggerUIUpdate();
      } else {
        notify('Not enough gold!', { id: 'no-gold', type: 'error', duration: 2000 });
      }
    } else {
      if (gameState.player.essence >= vendorItem.price) {
        gameState.spendEssence(vendorItem.price);
        gameState.addItem({ ...item });
        notify(`Purchased ${item.name}!`, {
          type: 'success',
          description: `Spent ${vendorItem.price} essence.`,
          duration: 3000,
        });
        triggerUIUpdate();
      } else {
        notify('Not enough essence!', { id: 'no-essence', type: 'error', duration: 2000 });
      }
    }
    // We explicitly leave the modal open so the user can continue shopping
  }, [gameState]);

  const handleCloseDialogue = () => {
    closeDialogueSession(gameState);
  };

  const handleDeathComplete = useCallback(() => {
    setDeathActive(false);
    playerDeadRef.current = false;
    deathRespawnFnRef.current?.();
  }, []);

  const { musicRef, musicStarted, switchMusicTrack } = useGameMusic({
    gameStateRef,
    processAudioElement,
    cleanupAudioProcessor,
    resumeAudioProcessor,
  });

  const runtimeRefs = {
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
    inventoryModalOpenRef,
    setInventoryModalOpenRef,
    objectivesModalOpenRef,
    setObjectivesModalOpenRef,
    vendorModalOpenRef,
    setVendorModalOpenRef,
    activeNpcWorldPos,
    syncVillageReactivityRef,
    syncBlightedRootStateRef,
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
    restAtBonfireRef,
    travelToBonfireRef,
    killCountRef,
  } satisfies Omit<RuntimeHostRefs, 'mountElement'>;

  const runtimeUi = {
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
    setBonfireMenuOpen,
    setDeathEssenceLost,
    setDeathActive,
  } satisfies RuntimeUiBindings;

  const runtimeCallbacks = {
    addMarkersFromText,
    triggerUIUpdate,
    triggerUIUpdateThrottled,
    triggerMinimapUpdate,
    createDialogueProgression,
    closeDialogueSession,
    switchMusicTrack,
    processAudioElement,
    showHeroOverlay,
    openBonfireMenu: () => {
      pausedRef.current = true;
      setBonfireMenuOpen(true);
    },
  } satisfies RuntimeCallbacks;

  const setupRuntime = () => {
    const mountElement = mountRef.current;
    if (!mountElement) return;

    let disposed = false;
    let cleanup: void | (() => void);

    void loadInteractionContent()
      .then(loadedInteractionContent => {
        if (disposed) return;
        interactionContentRef.current = loadedInteractionContent;
      })
      .catch(error => {
        console.error('[Game] Failed to load interaction content', error);
      });

    void Promise.all([runtimeSetupPromise, loadRuntimeContent()])
      .then(([{ setupGameRuntimeEffect }, loadedRuntimeContent]) => {
        if (disposed) return;

        runtimeContentRef.current = loadedRuntimeContent;
        cleanup = setupGameRuntimeEffect({
          refs: { ...runtimeRefs, mountElement },
          ui: runtimeUi,
          content: {
            items: loadedRuntimeContent.items,
            criticalPathItems: loadedRuntimeContent.criticalPathItems,
          } satisfies RuntimeContent,
          callbacks: runtimeCallbacks,
        });
      })
      .catch(error => {
        console.error('[Game] Failed to load runtime setup', error);
      });

    return () => {
      disposed = true;
      cleanup?.();
    };
  };

  useGameRuntime(setupRuntime);

  const activeQuests = gameState?.quests.filter(q => q.active && !q.completed) ?? [];
  const activeQuestTitle = activeQuests[0]?.title;
  const currentWorldMap = worldRef.current?.getCurrentMap() ?? null;
  const runtimeContent = runtimeContentRef.current;
  const interactionContent = interactionContentRef.current;

  // Modal open helpers with mutual exclusivity
  const openInventoryModal = useCallback(() => {
    setMapModalOpen(false);
    setObjectivesModalOpen(false);
    setInventoryModalOpen(true);
  }, []);
  const openObjectivesModal = useCallback(() => {
    setMapModalOpen(false);
    setInventoryModalOpen(false);
    setObjectivesModalOpen(true);
  }, []);
  const openMapModal = useCallback(() => {
    setInventoryModalOpen(false);
    setObjectivesModalOpen(false);
    setMapModalOpen(true);
  }, []);

  return (
    <div className="relative w-full h-screen overflow-hidden">
      <div ref={mountRef} className="w-full h-full" />
      
      {gameState && (
        <>
          <GameUI
            gameState={gameState}
            assetManager={assetManagerRef.current}
            refreshToken={uiVersion}
            justPickedUpItem={justPickedUpItem}
            justGainedCurrency={justGainedCurrency}
            onOpenInventory={openInventoryModal}
            onOpenMap={openMapModal}
            onOpenObjectives={openObjectivesModal}
            musicRef={musicRef}
            masterGainRef={masterGainRef}
            showControls={showControls}
            interactionPrompt={interactionPrompt}
            activeQuestCount={activeQuests.length}
          />
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
          {collisionDebugEnabled && collisionDebugSnapshot && (
            <div className="fixed left-4 top-56 z-[80] w-[22rem] border border-[#2A4A2A] bg-[#081208]/92 p-2 text-[11px] text-[#D7F7D7] shadow-lg pointer-events-none">
              <div className="font-bold text-[#9CFF9C]">COLLISION DEBUG (B)</div>
              <div className="font-mono leading-4">
                pos {collisionDebugSnapshot.worldX.toFixed(2)},{collisionDebugSnapshot.worldY.toFixed(2)} | tile {collisionDebugSnapshot.tileX},{collisionDebugSnapshot.tileY}
              </div>
              {collisionDebugSnapshot.currentTile && (
                <div className="font-mono leading-4">
                  current {collisionDebugSnapshot.currentTile.type} | walk {collisionDebugSnapshot.currentTile.walkable ? 'Y' : 'N'} | elev {collisionDebugSnapshot.currentTile.elevation}
                </div>
              )}
              <div className="mt-1 font-mono leading-4">
                probes {collisionDebugSnapshot.probes.map(p => `${p.label[0]}:${p.allowed ? 'Y' : 'N'}`).join('  ')}
              </div>
              <div
                className="mt-2 grid gap-[2px]"
                style={{ gridTemplateColumns: `repeat(${collisionDebugSnapshot.scanRadius * 2 + 1}, minmax(0, 1fr))` }}
              >
                {collisionDebugSnapshot.nearbyTiles.map(tile => {
                  const isPlayerTile = tile.tileX === collisionDebugSnapshot.tileX && tile.tileY === collisionDebugSnapshot.tileY;
                  const bg = tile.transition
                    ? '#0EA5E9'
                    : tile.interactable
                      ? '#F59E0B'
                      : tile.walkable
                        ? '#166534'
                        : '#991B1B';
                  return (
                    <div
                      key={`cd-${tile.tileX}-${tile.tileY}`}
                      className="h-8 border text-[9px] font-mono leading-[10px] text-white flex flex-col items-center justify-center"
                      style={{
                        backgroundColor: bg,
                        borderColor: isPlayerTile ? '#FFFFFF' : 'rgba(255,255,255,0.2)',
                      }}
                    >
                      <div>{tile.tileX},{tile.tileY}</div>
                      <div>{tile.type.slice(0, 4)}</div>
                      <div>E{tile.elevation}</div>
                    </div>
                  );
                })}
              </div>
              <div className="mt-2 text-[10px] text-[#B6DDB6]">green walkable, red blocked, amber interactable, blue transition, white border player tile</div>
              <div className="mt-1 grid grid-cols-2 gap-x-2 gap-y-1">
                {collisionDebugSnapshot.samples.map(sample => (
                  <div key={`sample-${sample.label}`} className="font-mono leading-4">
                    {sample.label}: {sample.tileX},{sample.tileY} {sample.type} {sample.walkable ? 'Y' : 'N'} e{sample.elevation}
                  </div>
                ))}
              </div>
            </div>
          )}
          <div className="fixed top-16 right-4 z-30 flex flex-col gap-2 pointer-events-none">
            {currentWorldMap && (
              <Minimap
                currentMap={currentWorldMap}
                currentMapId={gameState.currentMap}
                gameStateRef={gameStateRef}
                visitedTilesRef={visitedTilesRef}
                mapMarkersRef={mapMarkersRef}
                markers={mapMarkers}
                refreshToken={minimapVersion}
                playerX={gameState.player.position.x}
                playerY={gameState.player.position.y}
              />
            )}
            <NotificationFeed />
          </div>
          {mapModalOpen && currentWorldMap && (
            <Suspense fallback={null}>
              <LazyMapModal
                open={mapModalOpen}
                onOpenChange={setMapModalOpen}
                currentMap={currentWorldMap}
                currentMapId={gameState.currentMap}
                gameStateRef={gameStateRef}
                visitedTilesRef={visitedTilesRef}
                mapMarkersRef={mapMarkersRef}
                markers={mapMarkers}
                refreshToken={minimapVersion}
              />
            </Suspense>
          )}
          {inventoryModalOpen && (
            <Suspense fallback={null}>
              <LazyInventoryModal
                open={inventoryModalOpen}
                onOpenChange={setInventoryModalOpen}
                gameState={gameState}
                assetManager={assetManagerRef.current}
                triggerUIUpdate={triggerUIUpdate}
                playPotionDrink={handlePlayPotionDrink}
                playGrassChew={handlePlayGrassChew}
              />
            </Suspense>
          )}
          {objectivesModalOpen && (
            <Suspense fallback={null}>
              <LazyObjectivesModal
                open={objectivesModalOpen}
                onOpenChange={setObjectivesModalOpen}
                gameState={gameState}
                assetManager={assetManagerRef.current}
              />
            </Suspense>
          )}
          {vendorModalOpen && runtimeContent && interactionContent && (
            <Suspense fallback={null}>
              <LazyVendorModal
                open={vendorModalOpen}
                onOpenChange={setVendorModalOpen}
                vendor={activeVendorId ? interactionContent.vendors[activeVendorId] : null}
                gameState={gameState}
                assetManager={assetManagerRef.current}
                itemsRegistry={runtimeContent.items}
                onPurchase={handleVendorPurchase}
              />
            </Suspense>
          )}
        </>
      )}
      
      {currentDialogue && (
        <DialogueBox
          node={currentDialogue.node}
          npcName={currentDialogue.npcName}
          npcScreenPos={npcScreenPos}
          onResponse={handleDialogueResponse}
          onClose={handleCloseDialogue}
          playAdvanceSound={() => {
            playDialogueAdvanceRef.current?.();
          }}
          startTypewriterLoop={() => {
            startDialogueLoopRef.current?.();
          }}
          stopTypewriterLoop={() => {
            stopDialogueLoopRef.current?.();
          }}
        />
      )}

      {isPaused && (
        <PauseMenu
          onResume={() => { pausedRef.current = false; setIsPaused(false); }}
          questSummary={activeQuestTitle}
        />
      )}

      <TransitionOverlay active={transitionActive} mapName={transitionMapName} mapSubtitle={transitionMapSubtitle} />
      <DeathOverlay active={deathActive} essenceLost={deathEssenceLost} onComplete={handleDeathComplete} />
      <BonfireOverlay active={bonfireOverlayActive} title={bonfireOverlayTitle} subtitle={bonfireOverlaySubtitle ?? undefined} />

      {bonfireMenuOpen && gameState && (
        <BonfireMenu
          gameState={gameState}
          onRest={() => {
            restAtBonfireRef.current?.();
          }}
          onClose={() => {
            setBonfireMenuOpen(false);
            pausedRef.current = false;
          }}
          onLevelUp={(stat) => {
            return gameState.levelUpStat(stat);
          }}
          onTravel={(entry) => {
            travelToBonfireRef.current?.(entry);
            setBonfireMenuOpen(false);
            pausedRef.current = false;
          }}
          triggerUIUpdate={triggerUIUpdate}
        />
      )}
      <WeaponAcquiredOverlay
        weapon={weaponAcquiredItem}
        currentWeapon={
          gameState
            ? (gameState.equippedWeaponId
                ? gameState.inventory.find(i => i.id === gameState.equippedWeaponId) ?? null
                : gameState.inventory.find(i => i.type === 'equipment') ?? null)
            : null
        }
        assetManager={assetManagerRef.current}
        onEquip={(weaponId) => {
          gameState?.setEquippedWeapon(weaponId);
          triggerUIUpdate();
        }}
        onDismiss={() => setWeaponAcquiredItem(null)}
      />
    </div>
  );
};

export default Game;

