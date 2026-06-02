import { useCallback, useEffect, useMemo, useRef, useState, memo } from 'react';
import type { MutableRefObject, PointerEvent, WheelEvent } from 'react';
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
import { RotateCcw, ZoomIn, ZoomOut } from 'lucide-react';
import {
  computeMinimapScaleToFit,
  drawMinimapDynamicOverlay,
  drawMinimapTerrain,
} from '@/components/game/minimapDrawing';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { PlayerFaceMapIcon } from '@/components/game/PlayerFaceMapIcon';

const DYNAMIC_PRIMARY_MARKER_IDS = new Set([MANUSCRIPT_PRIMARY_MARKER_ID, VILLAGE_PRIMARY_MARKER_ID]);
const HIDE_MARKER_IDS_WHEN_PRIMARY = new Set(['forest_Disparaged Cottage', 'village_Village Elder']);
const MIN_MAP_ZOOM = 1;
const MAX_MAP_ZOOM = 6;
const MAP_ZOOM_STEP = 1.25;

interface MapModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentMap: WorldMap;
  currentMapId: string;
  gameStateRef: MutableRefObject<GameState | null>;
  visitedTilesRef: MutableRefObject<Set<string>>;
  mapMarkersRef: MutableRefObject<MapMarker[]>;
  markers: MapMarker[];
  refreshToken: number;
  assetManager?: AssetManager | null;
  perfProfiler?: PerfProfiler | null;
}

export const MapModal = memo(function MapModal({
  open,
  onOpenChange,
  currentMap,
  currentMapId,
  gameStateRef,
  visitedTilesRef,
  mapMarkersRef,
  markers,
  refreshToken,
  assetManager,
  perfProfiler,
}: MapModalProps) {
  const terrainCanvasRef = useRef<HTMLCanvasElement>(null);
  const overlayCanvasRef = useRef<HTMLCanvasElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const [viewport, setViewport] = useState({ w: 640, h: 480 });
  const [zoom, setZoom] = useState(MIN_MAP_ZOOM);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const dragRef = useRef<{ pointerId: number; startX: number; startY: number; startPanX: number; startPanY: number } | null>(null);
  const animRef = useRef<number>(0);
  const scale = useMemo(
    () => computeMinimapScaleToFit(currentMap.width, currentMap.height, viewport.w, viewport.h, 2, 14),
    [currentMap.height, currentMap.width, viewport.h, viewport.w],
  );
  const canvasWidth = currentMap.width * scale;
  const canvasHeight = currentMap.height * scale;

  const clampPan = useCallback((nextPan: { x: number; y: number }, nextZoom: number) => {
    const maxX = Math.max(0, (canvasWidth * nextZoom - viewport.w) / 2);
    const maxY = Math.max(0, (canvasHeight * nextZoom - viewport.h) / 2);
    return {
      x: Math.min(maxX, Math.max(-maxX, nextPan.x)),
      y: Math.min(maxY, Math.max(-maxY, nextPan.y)),
    };
  }, [canvasHeight, canvasWidth, viewport.h, viewport.w]);

  const applyZoom = useCallback((factor: number, anchor?: { clientX: number; clientY: number }) => {
    const nextZoom = Math.min(MAX_MAP_ZOOM, Math.max(MIN_MAP_ZOOM, zoom * factor));
    if (Math.abs(nextZoom - zoom) < 0.001) return;

    let nextPan = pan;
    const wrap = wrapRef.current;
    if (anchor && wrap) {
      const rect = wrap.getBoundingClientRect();
      const anchorFromCenter = {
        x: anchor.clientX - (rect.left + rect.width / 2),
        y: anchor.clientY - (rect.top + rect.height / 2),
      };
      const zoomRatio = nextZoom / zoom;
      nextPan = {
        x: anchorFromCenter.x - (anchorFromCenter.x - pan.x) * zoomRatio,
        y: anchorFromCenter.y - (anchorFromCenter.y - pan.y) * zoomRatio,
      };
    }

    setZoom(nextZoom);
    setPan(clampPan(nextPan, nextZoom));
  }, [clampPan, pan, zoom]);

  const resetView = useCallback(() => {
    setZoom(MIN_MAP_ZOOM);
    setPan({ x: 0, y: 0 });
    dragRef.current = null;
  }, []);

  useEffect(() => {
    resetView();
  }, [currentMapId, open, resetView]);

  useEffect(() => {
    setPan(prev => clampPan(prev, zoom));
  }, [clampPan, zoom]);

  const measure = useCallback(() => {
    const el = wrapRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    if (r.width > 20 && r.height > 20) {
      const w = Math.max(120, Math.floor(r.width - 8));
      const h = Math.max(120, Math.floor(r.height - 8));
      setViewport(prev => (prev.w !== w || prev.h !== h ? { w, h } : prev));
    }
  }, []);

  useEffect(() => {
    if (!open) return;
    const rafId = requestAnimationFrame(() => {
      measure();
      setTimeout(measure, 100);
    });
    const ro = new ResizeObserver(() => measure());
    const el = wrapRef.current;
    if (el) ro.observe(el);
    window.addEventListener('resize', measure);
    return () => {
      cancelAnimationFrame(rafId);
      ro.disconnect();
      window.removeEventListener('resize', measure);
    };
  }, [open, measure, currentMapId, currentMap.width, currentMap.height]);

  const drawTerrain = useCallback(() => {
    const terrainCanvas = terrainCanvasRef.current;
    const overlayCanvas = overlayCanvasRef.current;
    if (!terrainCanvas || !overlayCanvas) return false;

    terrainCanvas.width = canvasWidth;
    terrainCanvas.height = canvasHeight;
    overlayCanvas.width = canvasWidth;
    overlayCanvas.height = canvasHeight;

    const ctx = terrainCanvas.getContext('2d', { alpha: false });
    const state = gameStateRef.current;
    if (!ctx || !state) return false;

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
    perfProfiler?.recordExternal('mapTerrain', performance.now() - start);
    return true;
  }, [canvasWidth, canvasHeight, currentMap, currentMapId, gameStateRef, visitedTilesRef, scale, assetManager, perfProfiler]);

  useEffect(() => {
    if (!open) return;
    // Canvas refs may be null on the first effect pass when the Dialog portal
    // hasn't mounted yet. Retry after a frame if the initial draw fails.
    if (!drawTerrain()) {
      const id = requestAnimationFrame(() => { drawTerrain(); });
      return () => cancelAnimationFrame(id);
    }
  }, [open, drawTerrain, refreshToken]);

  useEffect(() => {
    if (!open) return;
    let lastCanvas: HTMLCanvasElement | null = null;
    let ctx: CanvasRenderingContext2D | null = null;
    let running = true;
    let lastDrawPerf = 0;
    let minFrameMs = 48;

    const draw = () => {
      if (!running) return;
      const canvas = overlayCanvasRef.current;
      if (!canvas) {
        animRef.current = requestAnimationFrame(draw);
        return;
      }
      if (canvas.width !== canvasWidth || canvas.height !== canvasHeight) {
        canvas.width = canvasWidth;
        canvas.height = canvasHeight;
      }
      if (canvas !== lastCanvas) {
        lastCanvas = canvas;
        ctx = canvas.getContext('2d', { alpha: true });
      }
      if (!ctx) {
        animRef.current = requestAnimationFrame(draw);
        return;
      }
      const nowMs = Date.now();
      const nowPerf = performance.now();
      if (nowPerf - lastDrawPerf < minFrameMs) {
        animRef.current = requestAnimationFrame(draw);
        return;
      }

      const state = gameStateRef.current;
      if (!state) {
        animRef.current = requestAnimationFrame(draw);
        return;
      }

      const dynamicPrimary = ([getManuscriptPrimaryObjectiveMarker(state), getVillagePrimaryObjectiveMarker(state)]
        .find(m => m?.map === currentMapId) ?? null);
      const idolMarker = getIdolHintMarker(state);
      const baseMarkers = mapMarkersRef.current.filter(
        m =>
          m.map === currentMapId &&
          !DYNAMIC_PRIMARY_MARKER_IDS.has(m.id) &&
          m.id !== IDOL_HINT_MARKER_ID &&
          m.type !== 'portal' &&
          !shouldHideStoredIdolHintMarker(m, state) &&
          !(dynamicPrimary && HIDE_MARKER_IDS_WHEN_PRIMARY.has(m.id)),
      );
      const dynamicSecondary = idolMarker?.map === currentMapId ? [idolMarker] : [];
      const currentMarkers = [...(dynamicPrimary ? [dynamicPrimary] : []), ...baseMarkers, ...dynamicSecondary];
      const hasPulsing = currentMarkers.some(m => nowMs < m.pulseUntil);
      minFrameMs = hasPulsing ? 16 : 48;
      lastDrawPerf = nowPerf;

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
      perfProfiler?.recordExternal('mapOverlay', performance.now() - start);

      animRef.current = requestAnimationFrame(draw);
    };

    draw();
    return () => {
      running = false;
      if (animRef.current) cancelAnimationFrame(animRef.current);
    };
  }, [
    open,
    currentMap,
    currentMapId,
    refreshToken,
    markers,
    gameStateRef,
    visitedTilesRef,
    mapMarkersRef,
    assetManager,
    perfProfiler,
    scale,
    canvasWidth,
    canvasHeight,
  ]);

  // Legend shows every marker drawn on the map for this region (no recency filter)
  // so the map key always matches the dots visible on the canvas.
  // The dynamic manuscript primary marker is injected first so it renders at the top.
  // refreshToken is a dep so the list re-evaluates whenever game state changes.
  const legendMarkers = useMemo(() => {
    const state = gameStateRef.current;
    // Resolve the primary only for THIS map so cross-map markers don't interfere.
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
    // Primary objective first, everything else after.
    const objective = all.filter(m => state && isPrimaryObjectiveMarker(m, state));
    const objectiveIds = new Set(objective.map(m => m.id));
    const rest = all.filter(m => !objectiveIds.has(m.id));
    return [...objective, ...rest];
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [markers, currentMapId, gameStateRef, refreshToken]);
  const legendEntries = useMemo(() => {
    const state = gameStateRef.current;
    const hasPrimary = legendMarkers.some(m => state && isPrimaryObjectiveMarker(m, state));
    const hasSecondary = legendMarkers.some(m => {
      const isObjective = state ? isPrimaryObjectiveMarker(m, state) : false;
      return (m.type === 'quest' || m.type === 'poi') && !isObjective;
    });
    return [
      ...(hasPrimary ? [{ key: 'primary', label: 'Primary' }] : []),
      ...(hasSecondary ? [{ key: 'secondary', label: 'Secondary' }] : []),
    ];
  }, [legendMarkers, gameStateRef]);

  const handleWheel = useCallback((event: WheelEvent<HTMLDivElement>) => {
    event.preventDefault();
    applyZoom(event.deltaY < 0 ? MAP_ZOOM_STEP : 1 / MAP_ZOOM_STEP, {
      clientX: event.clientX,
      clientY: event.clientY,
    });
  }, [applyZoom]);

  const handlePointerDown = useCallback((event: PointerEvent<HTMLDivElement>) => {
    if (event.button !== 0) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    dragRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      startPanX: pan.x,
      startPanY: pan.y,
    };
  }, [pan.x, pan.y]);

  const handlePointerMove = useCallback((event: PointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    setPan(clampPan({
      x: drag.startPanX + event.clientX - drag.startX,
      y: drag.startPanY + event.clientY - drag.startY,
    }, zoom));
  }, [clampPan, zoom]);

  const handlePointerEnd = useCallback((event: PointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    dragRef.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  }, []);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        onOpenAutoFocus={e => e.preventDefault()}
        className={cn(
          'z-[85] flex max-h-[min(92vh,900px)] w-[min(96vw,1100px)] max-w-[min(96vw,1100px)] flex-col gap-3 border-2 border-[#5C3A21] bg-[#120A08]/97 p-4 text-left shadow-2xl backdrop-blur-md sm:rounded-sm'
        )}
      >
        <DialogTitle className="sr-only">Region map — {currentMap.name}</DialogTitle>
        <div className="flex flex-shrink-0 flex-wrap items-end justify-between gap-2 border-b border-[#5C3A21]/60 pb-2 pr-12">
          <div>
            <h2 className="font-bold uppercase tracking-[0.2em] text-[#DAA520]">{currentMap.name}</h2>
          </div>
          <div className="flex items-center gap-3">
            <span className="rounded border border-[#5C3A21] bg-[#1A0F0A] px-2 py-1 font-mono text-sm text-[#DAA520]">
              X: {Math.round(gameStateRef.current?.player.position.x ?? 0)} Y: {Math.round(gameStateRef.current?.player.position.y ?? 0)}
            </span>
            <div className="flex items-center gap-1 rounded border border-[#5C3A21] bg-[#1A0F0A] p-1">
              <button
                type="button"
                title="Zoom out"
                aria-label="Zoom out"
                onClick={() => applyZoom(1 / MAP_ZOOM_STEP)}
                className="grid h-8 w-8 place-items-center border border-[#5C3A21]/70 bg-[#2A160F] text-[#F5DEB3] transition-colors hover:bg-[#3A2118] focus:outline-none focus:ring-1 focus:ring-[#DAA520]"
              >
                <ZoomOut className="h-4 w-4" aria-hidden />
              </button>
              <span className="w-12 text-center font-mono text-xs text-[#DAA520]">{Math.round(zoom * 100)}%</span>
              <button
                type="button"
                title="Zoom in"
                aria-label="Zoom in"
                onClick={() => applyZoom(MAP_ZOOM_STEP)}
                className="grid h-8 w-8 place-items-center border border-[#5C3A21]/70 bg-[#2A160F] text-[#F5DEB3] transition-colors hover:bg-[#3A2118] focus:outline-none focus:ring-1 focus:ring-[#DAA520]"
              >
                <ZoomIn className="h-4 w-4" aria-hidden />
              </button>
              <button
                type="button"
                title="Reset map view"
                aria-label="Reset map view"
                onClick={resetView}
                className="grid h-8 w-8 place-items-center border border-[#5C3A21]/70 bg-[#2A160F] text-[#F5DEB3] transition-colors hover:bg-[#3A2118] focus:outline-none focus:ring-1 focus:ring-[#DAA520]"
              >
                <RotateCcw className="h-4 w-4" aria-hidden />
              </button>
            </div>
          </div>
        </div>

        <div
          ref={wrapRef}
          onWheel={handleWheel}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerEnd}
          onPointerCancel={handlePointerEnd}
          className="relative flex min-h-[min(55vh,520px)] flex-1 cursor-grab select-none items-center justify-center overflow-hidden rounded-sm border-2 border-[#3a2812] bg-[#050302] p-2 active:cursor-grabbing"
          style={{ touchAction: 'none' }}
        >
          <div
            className="relative max-h-full max-w-full shadow-inner"
            style={{
              width: canvasWidth,
              height: canvasHeight,
              maxWidth: '100%',
              maxHeight: '100%',
              aspectRatio: `${currentMap.width} / ${currentMap.height}`,
              transform: `translate3d(${pan.x}px, ${pan.y}px, 0) scale(${zoom})`,
              transformOrigin: 'center',
            }}
          >
            <canvas
              ref={terrainCanvasRef}
              className="absolute inset-0 block h-full w-full pixelated"
              style={{ imageRendering: 'pixelated' }}
              aria-hidden
            />
            <canvas
              ref={overlayCanvasRef}
              className="pointer-events-none absolute inset-0 block h-full w-full pixelated"
              style={{ imageRendering: 'pixelated' }}
              aria-hidden
            />
          </div>
        </div>

        <div className="flex-shrink-0 border-t border-[#5C3A21]/50 pt-3">
          <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-[#DAA520]/90">Map key</p>
          <div className="grid grid-cols-1 gap-1.5 text-[11px] sm:grid-cols-2 lg:grid-cols-3">
            {legendEntries.map(entry => (
              <div
                key={entry.key}
                className="flex items-center gap-2 rounded border border-[#5C3A21]/40 bg-[#1A0F0A]/60 px-2 py-1.5"
              >
                <span className="relative h-4 w-4 flex-shrink-0">
                  <span className="absolute left-1/2 top-1/2 h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 rotate-45 bg-[#050302]" />
                  <span
                    className="absolute left-1/2 top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rotate-45 border border-white/60"
                    style={{
                      backgroundColor: entry.key === 'primary' ? '#FFD700' : '#8FBC8F',
                      boxShadow: entry.key === 'primary' ? '0 0 3px #FFD70080' : '0 0 3px #8FBC8F80',
                    }}
                  />
                </span>
                <span className="text-[#F5DEB3] leading-tight">
                  {entry.label}
                </span>
              </div>
            ))}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
});
