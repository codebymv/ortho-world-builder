import React, { useEffect, useMemo, useRef, memo } from 'react';
import type { MutableRefObject } from 'react';
import { WorldMap } from '@/lib/game/World';
import type { MapMarker } from '@/lib/game/MapMarkers';
import type { GameState } from '@/lib/game/GameState';
import { isPrimaryObjectiveMarker } from '@/lib/game/MapMarkers';
import {
  MARKER_TYPE_SHORT,
  computeMinimapScale,
  drawMinimapDynamicOverlay,
  drawMinimapTerrain,
} from '@/components/game/minimapDrawing';

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

      drawMinimapTerrain({
        ctx,
        currentMap,
        currentMapId,
        state,
        visited: visitedTilesRef.current,
        scale,
      });
    }, [canvasHeight, canvasWidth, currentMap, currentMapId, gameStateRef, refreshToken, scale, visitedTilesRef]);

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
        const currentMarkers = mapMarkersRef.current.filter(m => m.map === currentMapId);
        const hasPulsing = currentMarkers.some(m => nowMs < m.pulseUntil);
        const minFrameMs = hasPulsing ? 16 : 48;

        if (nowPerf - lastDrawPerf < minFrameMs) {
          animFrameRef.current = requestAnimationFrame(draw);
          return;
        }
        lastDrawPerf = nowPerf;

        const state = gameStateRef.current;
        if (!state) {
          animFrameRef.current = requestAnimationFrame(draw);
          return;
        }

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
        });

        animFrameRef.current = requestAnimationFrame(draw);
      };

      draw();

      return () => {
        running = false;
        if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      };
    }, [currentMap, currentMapId, gameStateRef, mapMarkersRef, refreshToken, scale, visitedTilesRef]);

    const visibleMarkers = useMemo(() => {
      const currentMarkers = markers.filter(m => m.map === currentMapId);
      const now = Date.now();
      const recentMarkers = currentMarkers.filter(
        m => m.permanent || now - m.createdAt < 120000 || now < m.pulseUntil
      );
      const objectiveMarkers = recentMarkers.filter(
        m => m.type === 'quest' && gameStateRef.current && isPrimaryObjectiveMarker(m, gameStateRef.current)
      );
      const supportMarkers = recentMarkers.filter(m => m.type !== 'quest').slice(0, 4);
      return [...objectiveMarkers, ...supportMarkers];
    }, [markers, currentMapId, refreshToken, gameStateRef]);

    return (
      <div
        className="bg-[#1A0F0A]/90 backdrop-blur-sm p-2 rounded-sm border-2 border-[#5C3A21] shadow-lg font-sans pointer-events-auto"
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
        {visibleMarkers.length > 0 && (
          <div className="mt-2 space-y-1 border-t border-[#5C3A21]/50 pt-2">
            <div className="mb-1 flex items-center justify-between gap-2">
              <p className="text-[9px] text-[#DAA520]/80 uppercase tracking-wider font-bold">Map guide</p>
              <span className="rounded border border-[#5C3A21]/40 bg-[#120907]/55 px-1.5 py-0.5 text-[9px] font-mono text-[#DAA520]">
                {Math.round(playerX)}, {Math.round(playerY)}
              </span>
            </div>
            {visibleMarkers.map(m => {
              const isPulsing = Date.now() < m.pulseUntil;
              const labelPrefix = m.type === 'quest' ? 'Goal' : MARKER_TYPE_SHORT[m.type] || 'Mark';
              return (
                <div
                  key={m.id}
                  className="flex items-center gap-2 rounded border border-[#5C3A21]/35 bg-[#120907]/55 px-1.5 py-1 text-[11px] leading-tight"
                >
                  <span
                    className={`inline-block w-3 h-3 flex-shrink-0 rounded-sm ${isPulsing ? 'animate-pulse' : ''}`}
                    style={{
                      backgroundColor: m.color,
                      boxShadow: isPulsing ? `0 0 6px ${m.color}` : `0 0 2px ${m.color}80`,
                    }}
                  />
                  <span className="text-[#DAA520] font-bold text-[10px] w-8 flex-shrink-0 uppercase tracking-wide">
                    {labelPrefix}
                  </span>
                  <span className="text-[#F5DEB3] font-medium leading-tight">{m.label}</span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  }
);
