import { useEffect, useRef, useState, useCallback } from 'react';
import * as THREE from 'three';
import { GameState } from '@/lib/game/GameState';
import { AssetManager } from '@/lib/game/AssetManager';
import { World } from '@/lib/game/World';
import { MapMarker, extractMarkersFromText } from '@/lib/game/MapMarkers';
import { SaveManager } from '@/lib/game/SaveManager';
import { allMaps } from '@/data/maps';
import { dialogues, DialogueNode } from '@/data/dialogues';
import { quests } from '@/data/quests';
import { items } from '@/data/items';
import { criticalPathItems } from '@/data/criticalPathItems';
import type { CurrencyGain, Item } from '@/lib/game/GameState';
import { DialogueBox } from './game/DialogueBox';
import { GameUI } from './game/GameUI';
import { Minimap } from './game/Minimap';
import { NotificationFeed } from './game/NotificationFeed';
import { MapModal } from './game/MapModal';
import { PauseMenu } from './game/PauseMenu';
import { TransitionOverlay } from './game/TransitionOverlay';
import { DeathOverlay } from './game/DeathOverlay';
import { BonfireOverlay } from './game/BonfireOverlay';
import { notify } from '@/lib/game/notificationBus';
import { createProgressionService } from '@/game/domain/ProgressionService';
import { createAudioProcessor } from '@/game/domain/AudioDirector';
import {
  setupGameRuntimeEffect,
  type RuntimeCallbacks,
  type RuntimeContent,
  type RuntimeHostRefs,
  type RuntimeUiBindings,
} from '@/game/runtime/setupGameRuntime';
import { useGameMusic } from '@/game/runtime/useGameMusic';
import { useGameRuntime } from '@/game/runtime/useGameRuntime';

type InteractionPrompt = string | null;

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
  const syncVillageReactivityRef = useRef<(() => void) | null>(null);
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
  const [deathActive, setDeathActive] = useState(false);
  const [deathEssenceLost, setDeathEssenceLost] = useState(0);
  const [showControls, setShowControls] = useState(true);
  const [mapModalOpen, setMapModalOpen] = useState(false);
  const [transitionDebugEnabled, setTransitionDebugEnabled] = useState(false);
  const [transitionDebugLines, setTransitionDebugLines] = useState<string[]>([]);
  const [interactionPrompt, setInteractionPrompt] = useState<InteractionPrompt>(null);
  const [bonfireOverlayActive, setBonfireOverlayActive] = useState(false);
  const [bonfireOverlayTitle, setBonfireOverlayTitle] = useState('Flame Kindled');
  const [bonfireOverlaySubtitle, setBonfireOverlaySubtitle] = useState<string | null>(null);
  const [justPickedUpItem, setJustPickedUpItem] = useState<Item | null>(null);
  const [justGainedCurrency, setJustGainedCurrency] = useState<CurrencyGain | null>(null);
  const bonfireOverlayTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const justPickedUpTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const justGainedCurrencyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pausedRef = useRef(false);
  const playerDeadRef = useRef(false);
  const deathRespawnFnRef = useRef<(() => void) | null>(null);
  const controlsTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastInteractionPromptRef = useRef<InteractionPrompt>(null);
  const previousPausedStateRef = useRef(isPaused);
  const previousMapModalOpenRef = useRef(mapModalOpen);

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
  const createDialogueProgression = () =>
    createProgressionService({
      dialogues,
      quests,
      items,
      criticalPathItems,
      notify,
      addMarkersFromText,
      triggerUIUpdate,
      triggerMinimapUpdate,
      syncVillageReactivity: () => {
        syncVillageReactivityRef.current?.();
      },
    });
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
    if (previousMapModalOpenRef.current !== mapModalOpen) {
      (mapModalOpen ? playMenuOpenRef.current : playMenuCloseRef.current)?.();
      previousMapModalOpenRef.current = mapModalOpen;
    }
  }, [mapModalOpen]);

  const handleDialogueResponse = (nextId: string, givesQuest?: string) => {
    if (!gameState || !currentDialogue) return;

    const progressionService = createDialogueProgression();

    const result = progressionService.handleDialogueResponse({
      state: gameState,
      currentDialogue,
      nextId,
      givesQuest,
    });

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
    portalVignetteRef,
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
  } satisfies Omit<RuntimeHostRefs, 'mountElement'>;

  const runtimeUi = {
    setGameState,
    setMapMarkers,
    setCurrentDialogue,
    setNpcScreenPos,
    setIsPaused,
    setTransitionActive,
    setTransitionMapName,
    setTransitionDebugEnabled,
    setTransitionDebugLines,
    setInteractionPrompt,
    setBonfireOverlayActive,
    setDeathEssenceLost,
    setDeathActive,
  } satisfies RuntimeUiBindings;

  const runtimeContent = {
    items,
    criticalPathItems,
  } satisfies RuntimeContent;

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
  } satisfies RuntimeCallbacks;

  const setupRuntime = () => {
    const mountElement = mountRef.current;
    if (!mountElement) return;

    return setupGameRuntimeEffect({
      refs: { ...runtimeRefs, mountElement },
      ui: runtimeUi,
      content: runtimeContent,
      callbacks: runtimeCallbacks,
    });
  };

  useGameRuntime(setupRuntime);

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
          <GameUI
            gameState={gameState}
            assetManager={assetManagerRef.current}
            refreshToken={uiVersion}
            triggerUIUpdate={triggerUIUpdate}
            justPickedUpItem={justPickedUpItem}
            justGainedCurrency={justGainedCurrency}
            playPotionDrink={() => {
              playPotionDrinkRef.current?.();
            }}
            playGrassChew={() => {
              playGrassChewRef.current?.();
            }}
            playMenuOpen={() => {
              playMenuOpenRef.current?.();
            }}
            playMenuClose={() => {
              playMenuCloseRef.current?.();
            }}
            musicRef={musicRef}
            showControls={showControls}
            interactionPrompt={interactionPrompt}
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
          <div className="fixed top-16 right-4 z-30 flex flex-col gap-2 pointer-events-none">
            <Minimap
              currentMap={allMaps[gameState.currentMap]}
              currentMapId={gameState.currentMap}
              gameStateRef={gameStateRef}
              visitedTilesRef={visitedTilesRef}
              mapMarkersRef={mapMarkersRef}
              markers={mapMarkers}
              refreshToken={minimapVersion}
              playerX={gameState.player.position.x}
              playerY={gameState.player.position.y}
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

      <TransitionOverlay active={transitionActive} mapName={transitionMapName} />
      <DeathOverlay active={deathActive} essenceLost={deathEssenceLost} onComplete={handleDeathComplete} />
      <BonfireOverlay active={bonfireOverlayActive} title={bonfireOverlayTitle} subtitle={bonfireOverlaySubtitle ?? undefined} />
    </div>
  );
};

export default Game;


