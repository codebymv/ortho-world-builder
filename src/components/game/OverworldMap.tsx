import { memo, useEffect, useMemo, useRef } from 'react';
import type { MutableRefObject } from 'react';
import type { GameState } from '@/lib/game/GameState';
import { tileColorForMinimap } from '@/components/game/minimapDrawing';
import {
  getOverworldBandAtRow,
  getOverworldFogStrength,
  getOverworldScene,
  getOverworldWaterDistanceField,
  type OverworldScene,
} from '@/data/overworldScene';
import {
  OVERWORLD_REGIONS,
  isOverworldRegionDiscovered,
  resolveOverworldRegionId,
} from '@/data/overworld';
import { cn } from '@/lib/utils';

interface OverworldMapProps {
  currentMapId: string;
  gameStateRef: MutableRefObject<GameState | null>;
  refreshToken: number;
  /** Pixel size of the region map canvas — overworld matches this exactly. */
  displayWidth: number;
  displayHeight: number;
  className?: string;
}

const REGION_LABEL: Record<string, string> = Object.fromEntries(
  OVERWORLD_REGIONS.map(r => [r.id, r.label]),
);

/**
 * In the overworld scene:
 *   'water'     → ocean/sea backdrop  → ocean blue
 *   'waterfall' → inland rivers/lakes → bright river blue
 * Everything else uses the shared minimap palette.
 */
const OVERWORLD_COLOR_OVERRIDE: Record<string, string> = {
  water: '#1a4f7a',     // Ocean blue — clearly water, not black
  waterfall: '#2878c8', // Bright river blue for inland water
};

function blendColors(color1: string, color2: string, ratio: number): string {
  const r1 = parseInt(color1.slice(1, 3), 16);
  const g1 = parseInt(color1.slice(3, 5), 16);
  const b1 = parseInt(color1.slice(5, 7), 16);

  const r2 = parseInt(color2.slice(1, 3), 16);
  const g2 = parseInt(color2.slice(3, 5), 16);
  const b2 = parseInt(color2.slice(5, 7), 16);

  const r = Math.round(r1 * (1 - ratio) + r2 * ratio);
  const g = Math.round(g1 * (1 - ratio) + g2 * ratio);
  const b = Math.round(b1 * (1 - ratio) + b2 * ratio);

  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
}

let overworldBaseCanvas: HTMLCanvasElement | null = null;

function getOverworldBaseCanvas(scene: OverworldScene): HTMLCanvasElement {
  if (overworldBaseCanvas) return overworldBaseCanvas;

  const dist = getOverworldWaterDistanceField();
  const w = scene.width;
  const h = scene.height;
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d', { alpha: false });
  if (!ctx) return canvas;
  ctx.imageSmoothingEnabled = false;

  ctx.fillStyle = '#1a4f7a';
  ctx.fillRect(0, 0, w, h);

  for (let y = 0; y < scene.height; y++) {
    const row = scene.tiles[y];
    for (let x = 0; x < scene.width; x++) {
      const tileType = row[x];

      let color =
        OVERWORLD_COLOR_OVERRIDE[tileType] ??
        tileColorForMinimap({ type: tileType, walkable: true });

      if (tileType === 'water') {
        const d = dist[y][x];
        if (d <= 4) {
          color = '#2878c8';
        } else if (d <= 20) {
          color = blendColors('#2878c8', '#1a4f7a', (d - 4) / 16);
        } else {
          color = '#1a4f7a';
        }
      }

      ctx.fillStyle = color;
      ctx.fillRect(x, y, 1, 1);
    }
  }

  for (let y = 0; y < scene.height; y++) {
    const row = scene.tiles[y];
    for (let x = 0; x < scene.width; x++) {
      if (row[x] !== 'water') continue;
      const adjacent =
        scene.tiles[y]?.[x - 1] !== 'water' ||
        scene.tiles[y]?.[x + 1] !== 'water' ||
        scene.tiles[y - 1]?.[x] !== 'water' ||
        scene.tiles[y + 1]?.[x] !== 'water';
      if (adjacent) {
        ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
        ctx.fillRect(x, y, 1, 1);
      }
    }
  }

  const grad = ctx.createRadialGradient(w / 2, h * 0.45, h * 0.18, w / 2, h * 0.45, h * 0.62);
  grad.addColorStop(0, 'rgba(0,0,0,0)');
  grad.addColorStop(0.7, 'rgba(0,0,0,0.08)');
  grad.addColorStop(1, 'rgba(0,0,0,0.42)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, w, h);

  overworldBaseCanvas = canvas;
  return canvas;
}

if (typeof window !== 'undefined') {
  const warmOverworldPaint = () => {
    getOverworldBaseCanvas(getOverworldScene());
  };
  if (window.requestIdleCallback) {
    window.requestIdleCallback(warmOverworldPaint, { timeout: 2500 });
  } else {
    window.setTimeout(warmOverworldPaint, 1500);
  }
}

export const OverworldMap = memo(function OverworldMap({
  currentMapId,
  gameStateRef,
  refreshToken,
  displayWidth,
  displayHeight,
  className,
}: OverworldMapProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const scene = useMemo(() => getOverworldScene(), []);
  const currentRegionId = resolveOverworldRegionId(currentMapId);
  const scaleX = displayWidth / scene.width;
  const scaleY = displayHeight / scene.height;

  const discovered = useMemo(() => {
    const state = gameStateRef.current;
    const map: Record<string, boolean> = {};
    for (const region of OVERWORLD_REGIONS) {
      map[region.id] = state
        ? isOverworldRegionDiscovered(region, state, currentMapId)
        : Boolean(region.alwaysKnown);
    }
    return map;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameStateRef, currentMapId, refreshToken]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const w = displayWidth;
    const h = displayHeight;
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w;
      canvas.height = h;
    }
    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) return;
    ctx.imageSmoothingEnabled = false;

    const base = getOverworldBaseCanvas(scene);
    ctx.drawImage(base, 0, 0, scene.width, scene.height, 0, 0, w, h);

    for (let y = 0; y < scene.height; y++) {
      const band = getOverworldBandAtRow(y);
      const bandKnown = discovered[band.id] ?? false;
      for (let x = 0; x < scene.width; x++) {
        const fog = getOverworldFogStrength(y, band.id, bandKnown);
        if (fog > 0.02) {
          ctx.fillStyle = `rgba(5, 3, 2, ${fog})`;
          ctx.fillRect(x * scaleX, y * scaleY, scaleX, scaleY);
        }
      }
    }
  }, [displayHeight, displayWidth, discovered, scaleX, scaleY, scene]);

  return (
    <div
      className={cn('relative max-h-full max-w-full shadow-inner', className)}
      style={{
        width: displayWidth,
        height: displayHeight,
        maxWidth: '100%',
        maxHeight: '100%',
      }}
    >
      <canvas
        ref={canvasRef}
        className="absolute inset-0 block h-full w-full pixelated"
        style={{ imageRendering: 'pixelated' }}
        aria-hidden
      />

      {scene.anchors.map(anchor => {
          const isKnown = discovered[anchor.id];
          if (!isKnown) return null;
          const isCurrent = currentRegionId === anchor.id;
          const leftPct = (anchor.x / scene.width) * 100;
          const topPct = (anchor.y / scene.height) * 100;

          return (
            <div
              key={anchor.id}
              className="pointer-events-none absolute -translate-x-1/2 -translate-y-1/2"
              style={{ left: `${leftPct}%`, top: `${topPct}%` }}
            >
              {isCurrent && (
                <span className="absolute left-1/2 top-1/2 h-5 w-5 -translate-x-1/2 -translate-y-1/2 animate-ping rounded-full border border-[#FFD700]/50 bg-[#FFD700]/15" />
              )}
              {isCurrent && (
                <span className="absolute left-1/2 top-1/2 h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#FFD700] shadow-[0_0_6px_#FFD700]" />
              )}
              <div
                className={cn(
                  'relative mt-3 rounded-sm border px-1.5 py-0.5 text-center shadow-lg',
                  isCurrent
                    ? 'border-[#FFD700]/80 bg-[#120A08]/95'
                    : 'border-[#5C3A21]/60 bg-[#070403]/80',
                )}
              >
                <p className="whitespace-nowrap font-bold uppercase leading-tight tracking-[0.12em] text-[#DAA520] [font-size:clamp(8px,1.1vw,11px)]">
                  {REGION_LABEL[anchor.id]}
                </p>
                {isCurrent && (
                  <p className="mt-px whitespace-nowrap uppercase tracking-[0.14em] text-[#FFD700]/85 [font-size:clamp(7px,0.9vw,9px)]">
                    You are here
                  </p>
                )}
              </div>
            </div>
          );
        })}
    </div>
  );
});
