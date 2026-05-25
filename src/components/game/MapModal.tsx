import { useCallback, useEffect, useMemo, useRef, useState, memo } from 'react';
import type { MutableRefObject } from 'react';
import { WorldMap } from '@/lib/game/World';
import {
  getManuscriptPrimaryObjectiveMarker,
  getVillagePrimaryObjectiveMarker,
  isPrimaryObjectiveMarker,
  MANUSCRIPT_PRIMARY_MARKER_ID,
  VILLAGE_PRIMARY_MARKER_ID,
  type MapMarker,
} from '@/lib/game/MapMarkers';
import type { GameState } from '@/lib/game/GameState';
import type { AssetManager } from '@/lib/game/AssetManager';
import {
  computeMinimapScaleToFit,
  drawMinimapContent,
} from '@/components/game/minimapDrawing';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { PlayerFaceMapIcon } from '@/components/game/PlayerFaceMapIcon';

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
}: MapModalProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const [viewport, setViewport] = useState({ w: 640, h: 480 });
  const animRef = useRef<number>(0);

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

  useEffect(() => {
    if (!open) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) return;

    let running = true;
    let lastDrawPerf = 0;

    const draw = () => {
      if (!running) return;
      const nowMs = Date.now();
      const nowPerf = performance.now();
      const state = gameStateRef.current;
      if (!state) {
        animRef.current = requestAnimationFrame(draw);
        return;
      }

      const DYNAMIC_IDS = new Set([MANUSCRIPT_PRIMARY_MARKER_ID, VILLAGE_PRIMARY_MARKER_ID]);
      const HIDE_WHEN_PRIMARY = new Set(['forest_Disparaged Cottage', 'village_Village Elder']);
      const dynamicPrimary = ([getManuscriptPrimaryObjectiveMarker(state), getVillagePrimaryObjectiveMarker(state)]
        .find(m => m?.map === currentMapId) ?? null);
      const baseMarkers = mapMarkersRef.current.filter(
        m =>
          m.map === currentMapId &&
          !DYNAMIC_IDS.has(m.id) &&
          m.type !== 'portal' &&
          !(dynamicPrimary && HIDE_WHEN_PRIMARY.has(m.id)),
      );
      const currentMarkers = dynamicPrimary ? [dynamicPrimary, ...baseMarkers] : baseMarkers;
      const hasPulsing = currentMarkers.some(m => nowMs < m.pulseUntil);
      const minFrameMs = hasPulsing ? 16 : 48;
      if (nowPerf - lastDrawPerf < minFrameMs) {
        animRef.current = requestAnimationFrame(draw);
        return;
      }
      lastDrawPerf = nowPerf;

      const scale = computeMinimapScaleToFit(
        currentMap.width,
        currentMap.height,
        viewport.w,
        viewport.h,
        2,
        14,
      );

      const cw = currentMap.width * scale;
      const ch = currentMap.height * scale;
      if (canvas.width !== cw || canvas.height !== ch) {
        canvas.width = cw;
        canvas.height = ch;
      }

      drawMinimapContent({
        ctx,
        currentMap,
        currentMapId,
        state,
        visited: visitedTilesRef.current,
        markers: currentMarkers,
        scale,
        nowMs,
        assetManager,
      });

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
    viewport.w,
    viewport.h,
    refreshToken,
    markers,
    gameStateRef,
    visitedTilesRef,
    mapMarkersRef,
    assetManager,
  ]);

  // Legend shows every marker drawn on the map for this region (no recency filter)
  // so the map key always matches the dots visible on the canvas.
  // The dynamic manuscript primary marker is injected first so it renders at the top.
  // refreshToken is a dep so the list re-evaluates whenever game state changes.
  const legendMarkers = useMemo(() => {
    const state = gameStateRef.current;
    const DYNAMIC_IDS = new Set([MANUSCRIPT_PRIMARY_MARKER_ID, VILLAGE_PRIMARY_MARKER_ID]);
    const HIDE_WHEN_PRIMARY = new Set(['forest_Disparaged Cottage', 'village_Village Elder']);
    // Resolve the primary only for THIS map so cross-map markers don't interfere.
    const dynamicPrimary = state
      ? ([getManuscriptPrimaryObjectiveMarker(state), getVillagePrimaryObjectiveMarker(state)]
          .find(m => m?.map === currentMapId) ?? null)
      : null;
    const base = markers.filter(
      m =>
        m.map === currentMapId &&
        !DYNAMIC_IDS.has(m.id) &&
        m.type !== 'portal' &&
        !(dynamicPrimary && HIDE_WHEN_PRIMARY.has(m.id)),
    );
    const all = dynamicPrimary ? [dynamicPrimary, ...base] : base;
    // Primary objective first, everything else after.
    const objective = all.filter(m => state && isPrimaryObjectiveMarker(m, state));
    const objectiveIds = new Set(objective.map(m => m.id));
    const rest = all.filter(m => !objectiveIds.has(m.id));
    return [...objective, ...rest];
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [markers, currentMapId, gameStateRef, refreshToken]);
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        onOpenAutoFocus={e => e.preventDefault()}
        className={cn(
          'z-[85] flex max-h-[min(92vh,900px)] w-[min(96vw,1100px)] max-w-[min(96vw,1100px)] flex-col gap-3 border-2 border-[#5C3A21] bg-[#120A08]/97 p-4 text-left shadow-2xl backdrop-blur-md sm:rounded-sm'
        )}
      >
        <DialogTitle className="sr-only">Region map — {currentMap.name}</DialogTitle>
        <div className="flex flex-shrink-0 flex-wrap items-end justify-between gap-2 border-b border-[#5C3A21]/60 pb-2">
          <div>
            <h2 className="font-bold uppercase tracking-[0.2em] text-[#DAA520]">{currentMap.name}</h2>
          </div>
          <div className="flex items-center gap-3">
            <span className="rounded border border-[#5C3A21] bg-[#1A0F0A] px-2 py-1 font-mono text-sm text-[#DAA520]">
              X: {Math.round(gameStateRef.current?.player.position.x ?? 0)} Y: {Math.round(gameStateRef.current?.player.position.y ?? 0)}
            </span>
          </div>
        </div>

        <div
          ref={wrapRef}
          className="relative flex min-h-[min(55vh,520px)] flex-1 items-center justify-center overflow-hidden rounded-sm border-2 border-[#3a2812] bg-[#050302] p-2"
        >
          <canvas
            ref={canvasRef}
            className="max-h-full max-w-full pixelated shadow-inner"
            style={{ imageRendering: 'pixelated' }}
            aria-hidden
          />
        </div>

        <div className="flex-shrink-0 border-t border-[#5C3A21]/50 pt-3">
          <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-[#DAA520]/90">Map key</p>
          <div className="grid grid-cols-1 gap-1.5 text-[11px] sm:grid-cols-2 lg:grid-cols-3">
            {legendMarkers.map(m => {
              const isObjective = gameStateRef.current
                ? isPrimaryObjectiveMarker(m, gameStateRef.current)
                : false;
              return (
                <div
                  key={m.id}
                  className="flex items-center gap-2 rounded border border-[#5C3A21]/40 bg-[#1A0F0A]/60 px-2 py-1.5"
                >
                  <span className="relative h-4 w-4 flex-shrink-0">
                    <span className="absolute left-1/2 top-1/2 h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 rotate-45 bg-[#050302]" />
                    <span
                      className="absolute left-1/2 top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rotate-45 border border-white/60"
                      style={{
                        backgroundColor: m.color,
                        boxShadow: `0 0 3px ${m.color}80`,
                      }}
                    />
                  </span>
                  <span className="text-[#F5DEB3] leading-tight">
                    {m.type === 'quest' || m.type === 'poi'
                      ? isObjective ? 'Primary' : 'Secondary'
                      : m.label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
});
