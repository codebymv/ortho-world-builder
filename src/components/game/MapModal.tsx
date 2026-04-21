import { useCallback, useEffect, useRef, useState, memo } from 'react';
import type { MutableRefObject } from 'react';
import { WorldMap } from '@/lib/game/World';
import type { MapMarker } from '@/lib/game/MapMarkers';
import type { GameState } from '@/lib/game/GameState';
import {
  MARKER_TYPE_NAMES,
  MINIMAP_TERRAIN_LEGEND,
  computeMinimapScaleToFit,
  drawMinimapContent,
} from '@/components/game/minimapDrawing';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';

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

      const currentMarkers = mapMarkersRef.current.filter(m => m.map === currentMapId);
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
  ]);

  const currentMarkers = markers.filter(m => m.map === currentMapId);
  const now = Date.now();
  const legendMarkers = currentMarkers.filter(
    m => m.permanent || now - m.createdAt < 120000 || now < m.pulseUntil
  );

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
          <p className="mb-2 text-[9px] uppercase tracking-wider text-[#8B7355]">Terrain (matches overworld materials)</p>
          <div className="mb-3 grid grid-cols-1 gap-1.5 text-[10px] sm:grid-cols-2 lg:grid-cols-3">
            {MINIMAP_TERRAIN_LEGEND.map(row => (
              <div
                key={row.label}
                className="flex items-center gap-2 rounded border border-[#5C3A21]/30 bg-[#0f0906]/80 px-2 py-1"
              >
                <span
                  className="h-3 w-3 flex-shrink-0 rounded-sm border border-black/40"
                  style={{ backgroundColor: row.color }}
                />
                <span className="text-[#C9B8A8] leading-tight">{row.label}</span>
              </div>
            ))}
          </div>
          <p className="mb-2 text-[9px] uppercase tracking-wider text-[#8B7355]">Markers &amp; player</p>
          <div className="grid grid-cols-1 gap-2 text-[11px] sm:grid-cols-2 lg:grid-cols-3">
            <div className="flex items-center gap-2 rounded border border-[#5C3A21]/40 bg-[#1A0F0A]/60 px-2 py-1.5">
              <span className="h-3 w-3 flex-shrink-0 rounded-full bg-[#4488ff] ring-2 ring-white/40" />
              <span className="text-[#F5DEB3]">You</span>
            </div>
            <div className="flex items-center gap-2 rounded border border-[#5C3A21]/40 bg-[#1A0F0A]/60 px-2 py-1.5">
              <span className="h-3 w-3 flex-shrink-0 rounded-full bg-[#FFD700] ring-1 ring-black/50" />
              <span className="text-[#F5DEB3]">Villagers &amp; NPCs (this area)</span>
            </div>
            <div className="flex items-center gap-2 rounded border border-[#5C3A21]/40 bg-[#1A0F0A]/60 px-2 py-1.5">
              <span className="relative h-3 w-3 flex-shrink-0 rounded-full bg-[#FFD700] ring-2 ring-[#ffe9a8]/80">
                <span className="absolute inset-[-4px] rounded-full border border-[#FFD700]/70" />
              </span>
              <span className="text-[#F5DEB3]">Gold pulse means this is where to go next</span>
            </div>
            <div className="flex items-center gap-2 rounded border border-[#5C3A21]/40 bg-[#1A0F0A]/60 px-2 py-1.5">
              <span
                className="h-3 w-3 flex-shrink-0 rounded-full"
                style={{ background: 'rgba(186,104,255,0.85)', boxShadow: '0 0 6px #ba68c8' }}
              />
              <span className="text-[#F5DEB3]">Lost essence (reclaim at glow)</span>
            </div>
            {(['quest', 'poi', 'danger', 'npc', 'portal'] as const).map(type => (
              <div
                key={type}
                className="flex items-center gap-2 rounded border border-[#5C3A21]/40 bg-[#1A0F0A]/60 px-2 py-1.5"
              >
                <span className="w-7 flex-shrink-0 text-center font-bold uppercase tracking-wide text-[#DAA520]">
                  {type === 'quest'
                    ? 'Goal'
                    : type === 'poi'
                      ? 'Place'
                      : type === 'danger'
                        ? 'Risk'
                        : type === 'npc'
                          ? 'NPC'
                          : 'Gate'}
                </span>
                <span className="text-[#C9B8A8]">{MARKER_TYPE_NAMES[type]}</span>
              </div>
            ))}
          </div>

          {legendMarkers.length > 0 && (
            <div className="mt-3 border-t border-[#5C3A21]/40 pt-2">
              <p className="mb-1.5 text-[10px] font-bold uppercase tracking-wider text-[#DAA520]/80">Visible markers</p>
              <ul className="space-y-1.5 text-[11px] text-[#E8DCC8]">
                {legendMarkers.map(m => (
                  <li key={m.id} className="flex items-start gap-2">
                    <span
                      className="mt-0.5 h-2.5 w-2.5 flex-shrink-0 rounded-sm"
                      style={{ backgroundColor: m.color, boxShadow: `0 0 4px ${m.color}` }}
                    />
                    <span>
                      <span className="font-bold uppercase tracking-wide text-[#DAA520]">
                        {m.type === 'quest'
                          ? 'Goal'
                          : m.type === 'poi'
                            ? 'Place'
                            : m.type === 'danger'
                              ? 'Risk'
                              : m.type === 'npc'
                                ? 'NPC'
                                : 'Gate'}
                      </span>{' '}
                      <span className="text-[#A1887F]">({MARKER_TYPE_NAMES[m.type]})</span> {m.label}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
});
