import { useEffect, useRef } from 'react';
import type { AssetManager } from '@/lib/game/AssetManager';
import { getPlayerFaceMarkerDrawable } from '@/components/game/minimapDrawing';

interface PlayerPreviewSpriteProps {
  assetManager?: AssetManager | null;
  equippedWeaponId?: string | null;
  className?: string;
}

/** Idle-down player sprite for character sheet UI. */
export function PlayerPreviewSprite({ assetManager, equippedWeaponId, className }: PlayerPreviewSpriteProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const size = 96;
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d', { alpha: true });
    if (!ctx) return;

    ctx.clearRect(0, 0, size, size);
    const drawable = getPlayerFaceMarkerDrawable(assetManager, equippedWeaponId);
    if (!drawable) return;

    const width = 'naturalWidth' in drawable ? drawable.naturalWidth || drawable.width : drawable.width;
    const height = 'naturalHeight' in drawable ? drawable.naturalHeight || drawable.height : drawable.height;
    ctx.drawImage(drawable, 0, 0, width, height, 0, 0, size, size);
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
