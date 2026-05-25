import { useEffect, useRef } from 'react';
import type { AssetManager } from '@/lib/game/AssetManager';
import { drawPlayerFaceMapMarker } from '@/components/game/minimapDrawing';

interface PlayerFaceMapIconProps {
  assetManager?: AssetManager | null;
  equippedWeaponId?: string | null;
  className?: string;
}

export function PlayerFaceMapIcon({ assetManager, equippedWeaponId, className }: PlayerFaceMapIconProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.width = 32;
    canvas.height = 32;
    const ctx = canvas.getContext('2d', { alpha: true });
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawPlayerFaceMapMarker(ctx, 16, 16, 24, assetManager, equippedWeaponId, {
      glow: false,
      fallback: true,
    });
  }, [assetManager, equippedWeaponId]);

  return (
    <canvas
      ref={canvasRef}
      className={className}
      style={{ imageRendering: 'pixelated' }}
      aria-hidden
    />
  );
}
