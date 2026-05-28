import { useEffect, useMemo, useRef, memo } from 'react';
import type { MutableRefObject } from 'react';
import { WorldMap } from '@/lib/game/World';
import {
  getManuscriptPrimaryObjectiveMarker,
  getVillagePrimaryObjectiveMarker,
  getIdolHintMarker,
  isPrimaryObjectiveMarker,
  shouldHideStoredIdolHintMarker,
  MANUSCRIPT_PRIMARY_MARKER_ID,
  VILLAGE_PRIMARY_MARKER_ID,
  IDOL_HINT_MARKER_ID,
  type MapMarker,
} from '@/lib/game/MapMarkers';
import type { GameState } from '@/lib/game/GameState';
import type { AssetManager } from '@/lib/game/AssetManager';
import type { PerfProfiler } from '@/game/runtime/PerfProfiler';
import {
  computeMinimapScale,
  drawMinimapDynamicOverlay,
  drawMinimapTerrain,
} from '@/components/game/minimapDrawing';
import { PlayerFaceMapIcon } from '@/components/game/PlayerFaceMapIcon';

const DYNAMIC_PRIMARY_MARKER_IDS = new Set([MANUSCRIPT_PRIMARY_MARKER_ID, VILLAGE_PRIMARY_MARKER_ID]);
const HIDE_MARKER_IDS_WHEN_PRIMARY = new Set(['forest_Disparaged Cottage', 'village_Village Elder']);

interface MinimapProps {
  currentMap: WorldMap;
  currentMapId: string;
  gameStateRef: MutableRefObject<GameState | null>;
  visitedTilesRef: MutableRefObject<Set<string>>;
  mapMarkersRef: MutableRefObject<MapMarker[]>;
  /** For legend + effect refresh when markers change (kept in sync with ref). */
  markers: MapMarker[];
  refreshToken: number;
  playerX: number;
  playerY: number;
  assetManager?: AssetManager | null;
  perfProfiler?: PerfProfiler | null;
}

export const Minimap = memo(
  ({
    currentMap,
    currentMapId,
    gameStateRef,
    visitedTilesRef,
    mapMarkersRef,
    markers,
    refreshToken,
    playerX,
    playerY,
    assetManager,
    perfProfiler,
  }: MinimapProps) => {
    const terrainCanvasRef = useRef<HTMLCanvasElement>(null);
    const overlayCanvasRef = useRef<HTMLCanvasElement>(null);
    const animFrameRef = useRef<number>(0);
    const maxHudPixels = 200;
    const scale = useMemo(
      () => computeMinimapScale(currentMap.width, currentMap.height, maxHudPixels, 1, 4),
      [currentMap.width, currentMap.height],
    );
    const canvasWidth = currentMap.width * scale;
    const canvasHeight = currentMap.height * scale;

    useEffect(() => {
      const terrainCanvas = terrainCanvasRef.current;
      const overlayCanvas = overlayCanvasRef.current;
      if (!terrainCanvas || !overlayCanvas) return;

      terrainCanvas.width = canvasWidth;
      terrainCanvas.height = canvasHeight;
      overlayCanvas.width = canvasWidth;
      overlayCanvas.height = canvasHeight;
    }, [canvasHeight, canvasWidth]);

    useEffect(() => {
      const terrainCanvas = terrainCanvasRef.current;
      if (!terrainCanvas) return;
      const ctx = terrainCanvas.getContext('2d', { alpha: false });
      if (!ctx) return;

      const state = gameStateRef.current;
      if (!state) return;

      const start = performance.now();
      drawMinimapTerrain({
        ctx,
        currentMap,
        currentMapId,
        state,
        visited: visitedTilesRef.current,
        scale,
        assetManager,
      });
      perfProfiler?.recordExternal('minimapTerrain', performance.now() - start);
    }, [canvasHeight, canvasWidth, currentMap, currentMapId, gameStateRef, refreshToken, scale, visitedTilesRef, assetManager, perfProfiler]);

    useEffect(() => {
      const canvas = overlayCanvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d', { alpha: true });
      if (!ctx) return;

      let running = true;
      let lastDrawPerf = 0;

      const draw = () => {
        if (!running) return;

        const nowMs = Date.now();
        const nowPerf = performance.now();
        const state = gameStateRef.current;
        // Resolve the dynamic primary for THIS map specifically so a forest marker
        // cannot accidentally suppress village markers (or vice-versa).
        const dynamicPrimary = state
          ? ([getManuscriptPrimaryObjectiveMarker(state), getVillagePrimaryObjectiveMarker(state)]
              .find(m => m?.map === currentMapId) ?? null)
          : null;
        const idolMarker = state ? getIdolHintMarker(state) : null;
        const baseMarkers = mapMarkersRef.current.filter(
          m =>
            m.map === currentMapId &&
            !DYNAMIC_PRIMARY_MARKER_IDS.has(m.id) &&
            m.id !== IDOL_HINT_MARKER_ID &&
            m.type !== 'portal' &&
            (!state || !shouldHideStoredIdolHintMarker(m, state)) &&
            !(dynamicPrimary && HIDE_MARKER_IDS_WHEN_PRIMARY.has(m.id)),
        );
        const dynamicSecondary = idolMarker?.map === currentMapId ? [idolMarker] : [];
        const currentMarkers = [...(dynamicPrimary ? [dynamicPrimary] : []), ...baseMarkers, ...dynamicSecondary];
        const hasPulsing = currentMarkers.some(m => nowMs < m.pulseUntil);
        const minFrameMs = hasPulsing ? 16 : 48;

        if (nowPerf - lastDrawPerf < minFrameMs) {
          animFrameRef.current = requestAnimationFrame(draw);
          return;
        }
        lastDrawPerf = nowPerf;

        if (!state) {
          animFrameRef.current = requestAnimationFrame(draw);
          return;
        }

        const start = performance.now();
        drawMinimapDynamicOverlay({
          ctx,
          currentMap,
          currentMapId,
          state,
          markers: currentMarkers,
          scale,
          nowMs,
          clear: true,
          includeFrame: false,
          assetManager,
          visited: visitedTilesRef.current,
        });
        perfProfiler?.recordExternal('minimapOverlay', performance.now() - start);

        animFrameRef.current = requestAnimationFrame(draw);
      };

      draw();

      return () => {
        running = false;
        if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      };
    }, [assetManager, currentMap, currentMapId, gameStateRef, mapMarkersRef, refreshToken, scale, visitedTilesRef, perfProfiler]);

    // All markers drawn on this map's overlay — no recency filter, so the HUD legend
    // matches the dots actually visible on the minimap. Objective first, others after.
    // refreshToken is a dep so the list re-evaluates whenever game state changes.
    const visibleMarkers = useMemo(() => {
      const state = gameStateRef.current;
      // Resolve the primary only for THIS map — prevents a forest marker from
      // accidentally hiding village markers while on the village minimap.
      const dynamicPrimary = state
        ? ([getManuscriptPrimaryObjectiveMarker(state), getVillagePrimaryObjectiveMarker(state)]
            .find(m => m?.map === currentMapId) ?? null)
        : null;
      const idolMarker = state ? getIdolHintMarker(state) : null;
      const base = markers.filter(
        m =>
          m.map === currentMapId &&
          !DYNAMIC_PRIMARY_MARKER_IDS.has(m.id) &&
          m.id !== IDOL_HINT_MARKER_ID &&
          m.type !== 'portal' &&
          (!state || !shouldHideStoredIdolHintMarker(m, state)) &&
          !(dynamicPrimary && HIDE_MARKER_IDS_WHEN_PRIMARY.has(m.id)),
      );
      const dynamicSecondary = idolMarker?.map === currentMapId ? [idolMarker] : [];
      const all = [...(dynamicPrimary ? [dynamicPrimary] : []), ...base, ...dynamicSecondary];
      const objective = all.filter(m => state && isPrimaryObjectiveMarker(m, state));
      const objectiveIds = new Set(objective.map(m => m.id));
      const rest = all.filter(m => !objectiveIds.has(m.id));
      return [...objective, ...rest];
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [markers, currentMapId, gameStateRef, refreshToken]);
    const legendEntries = useMemo(() => {
      const state = gameStateRef.current;
      const hasPrimary = visibleMarkers.some(m => state && isPrimaryObjectiveMarker(m, state));
      const hasSecondary = visibleMarkers.some(m => {
        const isObjective = state ? isPrimaryObjectiveMarker(m, state) : false;
        return (m.type === 'quest' || m.type === 'poi') && !isObjective;
      });
      return [
        ...(hasPrimary ? [{ key: 'primary', label: 'Primary' }] : []),
        ...(hasSecondary ? [{ key: 'secondary', label: 'Secondary' }] : []),
      ];
    }, [visibleMarkers, gameStateRef]);

    return (
      <div
        className="bg-[#1A0F0A]/90 backdrop-blur-sm p-2 rounded-sm border-2 border-[#5C3A21] shadow-lg pointer-events-auto"
        style={{ width: '220px' }}
      >
        <div className="text-[#DAA520] text-xs mb-1 text-center font-bold uppercase tracking-wider">
          {currentMap.name}
        </div>
        {/* <p className="text-[9px] text-[#8D6E63] text-center mb-1.5 leading-tight px-0.5">
          Explored areas only. <kbd className="text-[#DAA520]">M</kbd> opens the full map.
        </p> */}
        <div
          className="relative mx-auto overflow-hidden rounded-sm border-2 border-[#3a2812]"
          style={{ width: '100%', maxWidth: '200px', maxHeight: '180px', aspectRatio: `${currentMap.width} / ${currentMap.height}` }}
        >
          <canvas
            ref={terrainCanvasRef}
            className="pixelated block h-full w-full"
            style={{ imageRendering: 'pixelated' }}
          />
          <canvas
            ref={overlayCanvasRef}
            className="pointer-events-none absolute inset-0 block h-full w-full pixelated"
            style={{ imageRendering: 'pixelated' }}
          />
        </div>
        <div className="mt-2 space-y-1 border-t border-[#5C3A21]/50 pt-2">
          <div className="mb-1 flex items-center justify-between gap-2">
            <p className="text-[9px] text-[#DAA520]/80 uppercase tracking-wider font-bold">Map key</p>
            <span className="rounded border border-[#5C3A21]/40 bg-[#120907]/55 px-1.5 py-0.5 text-[9px] font-mono text-[#DAA520]">
              {Math.round(playerX)}, {Math.round(playerY)}
            </span>
          </div>
          {legendEntries.map(entry => (
            <div
              key={entry.key}
              className="flex items-center gap-2 rounded border border-[#5C3A21]/35 bg-[#120907]/55 px-1.5 py-1 text-[11px] leading-tight"
            >
              <span className="relative h-4 w-4 flex-shrink-0">
                <span className="absolute left-1/2 top-1/2 h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 rotate-45 bg-[#050302]" />
                <span
                  className="absolute left-1/2 top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rotate-45 border border-white/60"
                  style={{
                    backgroundColor: entry.key === 'primary' ? '#FFD700' : '#8FBC8F',
                    boxShadow: entry.key === 'primary' ? '0 0 2px #FFD70080' : '0 0 2px #8FBC8F80',
                  }}
                />
              </span>
              <span className="text-[#F5DEB3] font-medium leading-tight">
                {entry.label}
              </span>
            </div>
          ))}
        </div>
      </div>
    );
  }
);
