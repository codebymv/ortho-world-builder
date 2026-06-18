import { useEffect, useRef } from 'react';

/**
 * HUD pixel-sprite renderer. Same visual language as the world tiles and
 * landmark icons - every glyph in the navigation bar is hand-authored on an
 * 8×8 grid using readable color cells, then upscaled with crisp-edge pixel
 * rendering. No lucide / no SVGs: the UI matches the game's art style.
 *
 * Use `<HudSprite spec={SPRITE_*} size={16} />` anywhere a small icon belongs.
 * Larger `size` values upscale the same grid so the same definition serves
 * both 12px inline contexts and 48px modal headers without re-authoring.
 */

const TRANSPARENT = 0xFFFFFFFF; // sentinel for "skip this cell" - readable in grids below

export interface HudSpriteSpec {
  /** Square grid of hex colors. `null` cells are transparent. */
  grid: ReadonlyArray<ReadonlyArray<number | null>>;
  /** Optional override of the per-cell pixel size in the *source* canvas before CSS scaling. */
  cellSize?: number;
}

interface HudSpriteProps {
  spec: HudSpriteSpec;
  /** Rendered (CSS) pixel size. Source canvas is small + pixelated upscaled. */
  size?: number;
  /** Extra Tailwind classes (positioning, drop-shadow, etc.). */
  className?: string;
  /** Optional alt-text equivalent for screen readers. */
  title?: string;
}

export function HudSprite({ spec, size = 16, className, title }: HudSpriteProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const cellPx = spec.cellSize ?? 2;
  const gridW = spec.grid[0]?.length ?? 0;
  const gridH = spec.grid.length;
  const sourcePxW = gridW * cellPx;
  const sourcePxH = gridH * cellPx;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.width = sourcePxW;
    canvas.height = sourcePxH;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, sourcePxW, sourcePxH);
    for (let y = 0; y < gridH; y++) {
      const row = spec.grid[y];
      for (let x = 0; x < gridW; x++) {
        const c = row?.[x];
        if (c == null || c === TRANSPARENT) continue;
        ctx.fillStyle = `#${c.toString(16).padStart(6, '0')}`;
        ctx.fillRect(x * cellPx, y * cellPx, cellPx, cellPx);
      }
    }
  }, [spec, sourcePxW, sourcePxH, gridW, gridH, cellPx]);

  return (
    <canvas
      ref={canvasRef}
      width={sourcePxW}
      height={sourcePxH}
      title={title}
      aria-label={title}
      className={className}
      style={{ width: size, height: size, imageRendering: 'pixelated' }}
    />
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Color palette - kept in one place so the HUD reads as a coherent set rather
// than a bag of one-offs. Hue families align with their gameplay meaning:
//   gold/amber = wealth + warning
//   violet     = essence + corruption
//   crimson    = cursed sediment + danger
// ─────────────────────────────────────────────────────────────────────────────
const C = {
  // gold coin
  goldHi:    0xFFE680,
  gold:      0xDAA520,
  goldShade: 0x8B5C0A,
  goldRim:   0x4A2C00,
  // essence sigil (purple/white star)
  essenceHi: 0xFFFFFF,
  essence:   0xB388FF,
  essenceMid:0x7E57C2,
  essenceDk: 0x4A2A6E,
  // cursed sediment (jagged crystal shard)
  shardHi:   0xFF80E0,
  shard:     0xC2185B,
  shardDk:   0x6A0F38,
  // traveler / player bust (character sheet nav icon)
  skinHi:    0xFFE0B2,
  skin:      0xFFCC80,
  hoodHi:    0x8D6E63,
  hood:      0x5D4037,
  hoodDk:    0x2D1B11,
  eye:       0x1A0F0A,
  // satchel / inventory pouch
  leatherHi: 0x8D6E63,
  leather:   0x5D4037,
  leatherDk: 0x2D1B11,
  buckle:    0xDAA520,
  // parchment map
  paperHi:   0xF5E8C9,
  paper:     0xD2B48C,
  paperDk:   0x8B6A47,
  inkRed:    0xB71C1C,
  inkLine:   0x5D4037,
  // target / objectives
  targetOut: 0xB71C1C,
  targetMid: 0xF5E8C9,
  targetCtr: 0xFFD700,
  // speaker / volume
  speaker:   0xD3D3D3,
  speakerDk: 0x6B6B6B,
  speakerHi: 0xFFFFFF,
  wave:      0x9DD9F3,
  mute:      0xE53935,
} as const;

const _ = null; // shorthand for transparent cells - keeps the grids readable

/**
 * Gold coin. Round bevel with a bright NW highlight and a SE rim shadow so it
 * reads as a 3D minted coin even at 16px. Center has a faint "wreath" notch
 * to distinguish from generic circles.
 */
export const SPRITE_COIN: HudSpriteSpec = {
  grid: [
    [_, _, C.gold, C.gold, C.gold, C.gold, _, _],
    [_, C.goldHi, C.gold, C.gold, C.gold, C.gold, C.goldShade, _],
    [C.goldHi, C.gold, C.goldShade, C.gold, C.gold, C.goldShade, C.gold, C.goldRim],
    [C.goldHi, C.gold, C.gold, C.goldShade, C.goldShade, C.gold, C.gold, C.goldRim],
    [C.goldHi, C.gold, C.gold, C.goldShade, C.goldShade, C.gold, C.gold, C.goldRim],
    [C.goldHi, C.gold, C.goldShade, C.gold, C.gold, C.goldShade, C.gold, C.goldRim],
    [_, C.gold, C.gold, C.gold, C.gold, C.gold, C.goldShade, _],
    [_, _, C.goldRim, C.goldRim, C.goldRim, C.goldRim, _, _],
  ],
};

/**
 * Essence sigil - four-point star with a glowing center, reads as an arcane
 * insignia / inscription rather than a generic sparkle. Same purple family as
 * the corruption tint and hollow ambience particles.
 */
export const SPRITE_ESSENCE: HudSpriteSpec = {
  grid: [
    [_, _, _, C.essenceMid, C.essenceMid, _, _, _],
    [_, _, _, C.essence, C.essence, _, _, _],
    [C.essenceDk, _, C.essenceMid, C.essenceHi, C.essenceHi, C.essenceMid, _, C.essenceDk],
    [C.essenceMid, C.essence, C.essenceHi, C.essenceHi, C.essenceHi, C.essenceHi, C.essence, C.essenceMid],
    [C.essenceMid, C.essence, C.essenceHi, C.essenceHi, C.essenceHi, C.essenceHi, C.essence, C.essenceMid],
    [C.essenceDk, _, C.essenceMid, C.essenceHi, C.essenceHi, C.essenceMid, _, C.essenceDk],
    [_, _, _, C.essence, C.essence, _, _, _],
    [_, _, _, C.essenceMid, C.essenceMid, _, _, _],
  ],
};

/**
 * Cursed sediment - jagged crystalline shard. Reads as something "pulled from
 * a heresy altar": broken, glowing edges, asymmetric silhouette.
 */
export const SPRITE_CURSED_SHARD: HudSpriteSpec = {
  grid: [
    [_, _, _, _, C.shardDk, _, _, _],
    [_, _, _, C.shardDk, C.shard, C.shardDk, _, _],
    [_, _, C.shardDk, C.shard, C.shardHi, C.shard, C.shardDk, _],
    [_, C.shardDk, C.shard, C.shardHi, C.shard, C.shard, C.shard, C.shardDk],
    [C.shardDk, C.shard, C.shardHi, C.shard, C.shard, C.shard, C.shardDk, _],
    [_, C.shardDk, C.shard, C.shard, C.shard, C.shardDk, _, _],
    [_, _, C.shardDk, C.shard, C.shardDk, _, _, _],
    [_, _, _, C.shardDk, _, _, _, _],
  ],
};

/**
 * Speaker with sound waves - replaces the lucide `Volume2` icon. Volume is
 * shown via three crescent waves on the right; the mute variant drops the
 * waves and overlays a red strike line.
 */
export const SPRITE_VOLUME_ON: HudSpriteSpec = {
  grid: [
    [_, _, C.speaker, C.speaker, _, _, C.wave, _],
    [_, C.speaker, C.speakerHi, C.speaker, _, C.wave, _, C.wave],
    [C.speaker, C.speakerHi, C.speakerHi, C.speaker, _, _, C.wave, _],
    [C.speaker, C.speakerHi, C.speakerHi, C.speaker, C.wave, _, _, C.wave],
    [C.speaker, C.speakerHi, C.speakerHi, C.speaker, _, _, C.wave, _],
    [_, C.speaker, C.speakerHi, C.speaker, _, C.wave, _, C.wave],
    [_, _, C.speaker, C.speaker, _, _, C.wave, _],
    [_, _, C.speakerDk, C.speakerDk, _, _, _, _],
  ],
};

export const SPRITE_VOLUME_MUTE: HudSpriteSpec = {
  grid: [
    [_, _, C.speakerDk, C.speakerDk, _, _, _, _],
    [_, C.speakerDk, C.speaker, C.speakerDk, _, _, C.mute, _],
    [C.speakerDk, C.speaker, C.speaker, C.speakerDk, _, C.mute, _, _],
    [C.speakerDk, C.speaker, C.speaker, C.speakerDk, C.mute, _, _, _],
    [C.speakerDk, C.speaker, C.speaker, C.speakerDk, _, C.mute, _, _],
    [_, C.speakerDk, C.speaker, C.speakerDk, _, _, C.mute, _],
    [_, _, C.speakerDk, C.speakerDk, _, _, _, C.mute],
    [_, _, C.speakerDk, C.speakerDk, _, _, _, _],
  ],
};

/**
 * Hooded traveler bust - character sheet / loadout nav icon. Matches the
 * in-world chibi silhouette without pulling a live sprite texture into the HUD.
 */
export const SPRITE_PLAYER: HudSpriteSpec = {
  grid: [
    [_, C.hoodDk, C.hood, C.hood, C.hood, C.hood, C.hoodDk, _],
    [_, C.hood, C.hoodHi, C.hood, C.hood, C.hoodHi, C.hood, _],
    [_, C.hood, C.skin, C.skin, C.skin, C.skin, C.hood, _],
    [C.hood, C.hood, C.skin, C.eye, C.skin, C.eye, C.skin, C.hood],
    [C.hood, C.hood, C.skin, C.skin, C.skin, C.skin, C.skin, C.hood],
    [_, C.hood, C.hood, C.skinHi, C.skinHi, C.hood, C.hood, _],
    [_, C.hoodDk, C.hood, C.hood, C.hood, C.hood, C.hoodDk, _],
    [_, _, C.hoodDk, C.hoodDk, C.hoodDk, C.hoodDk, _, _],
  ],
};

/**
 * Crouch / sneak indicator - a hunched, low figure with a wide planted stance
 * and feet apart, distinct from the upright SPRITE_PLAYER bust. Shown in the HUD
 * while the sneak toggle is active. Reuses the hooded-traveler palette.
 */
export const SPRITE_CROUCH: HudSpriteSpec = {
  grid: [
    [_, _, C.hoodDk, C.hood, C.hood, C.hoodDk, _, _],
    [_, _, C.hood, C.skin, C.skin, C.hood, _, _],
    [_, C.hoodDk, C.hood, C.hood, C.hood, C.hood, C.hoodDk, _],
    [_, C.hood, C.hoodHi, C.hood, C.hood, C.hoodHi, C.hood, _],
    [C.hoodDk, C.hood, C.hood, C.hoodHi, C.hoodHi, C.hood, C.hood, C.hoodDk],
    [C.hood, C.hoodDk, C.hood, C.hood, C.hood, C.hood, C.hoodDk, C.hood],
    [C.hoodDk, _, C.hoodDk, _, _, C.hoodDk, _, C.hoodDk],
    [C.hoodDk, _, _, _, _, _, _, C.hoodDk],
  ],
};

/**
 * Inventory satchel. Leather pouch with a brass buckle in the center - pairs
 * thematically with the cottage chest and quest item iconography.
 */
export const SPRITE_INVENTORY: HudSpriteSpec = {
  grid: [
    [_, C.leatherDk, _, _, _, _, C.leatherDk, _],
    [_, C.leather, C.leatherDk, _, _, C.leatherDk, C.leather, _],
    [_, C.leatherHi, C.leather, C.leatherDk, C.leatherDk, C.leather, C.leatherHi, _],
    [C.leatherDk, C.leather, C.leatherHi, C.leather, C.leather, C.leatherHi, C.leather, C.leatherDk],
    [C.leatherDk, C.leather, C.leather, C.buckle, C.buckle, C.leather, C.leather, C.leatherDk],
    [C.leatherDk, C.leather, C.leather, C.leather, C.leather, C.leather, C.leather, C.leatherDk],
    [C.leatherDk, C.leatherHi, C.leather, C.leather, C.leather, C.leather, C.leatherHi, C.leatherDk],
    [_, C.leatherDk, C.leatherDk, C.leatherDk, C.leatherDk, C.leatherDk, C.leatherDk, _],
  ],
};

/**
 * Folded parchment map with a route line + an X marker. Reads as cartography,
 * not a generic page icon.
 */
export const SPRITE_MAP: HudSpriteSpec = {
  grid: [
    [C.paperDk, C.paper, C.paper, C.paperDk, C.paper, C.paper, C.paperDk, _],
    [C.paper, C.paperHi, C.inkLine, C.paper, C.paperHi, C.paper, C.paper, C.paperDk],
    [C.paper, C.inkLine, C.paper, C.inkLine, C.paper, C.paper, C.paperHi, C.paper],
    [C.paper, C.paper, C.inkLine, C.paper, C.paper, C.inkRed, C.paper, C.paper],
    [C.paper, C.paperHi, C.inkLine, C.inkLine, C.inkLine, C.inkRed, C.paper, C.paper],
    [C.paper, C.paper, C.paper, C.paper, C.inkLine, C.paper, C.paperHi, C.paper],
    [C.paperDk, C.paperHi, C.paper, C.paper, C.paper, C.paper, C.paper, C.paperDk],
    [_, C.paperDk, C.paperDk, C.paperDk, C.paperDk, C.paperDk, C.paperDk, _],
  ],
};

/**
 * Objectives target - concentric rings with a gold bullseye center. Reads as
 * a quest tracker / waypoint reticle.
 */
export const SPRITE_OBJECTIVES: HudSpriteSpec = {
  grid: [
    [_, _, C.targetOut, C.targetOut, C.targetOut, C.targetOut, _, _],
    [_, C.targetOut, C.targetMid, C.targetMid, C.targetMid, C.targetMid, C.targetOut, _],
    [C.targetOut, C.targetMid, C.targetOut, C.targetCtr, C.targetCtr, C.targetOut, C.targetMid, C.targetOut],
    [C.targetOut, C.targetMid, C.targetCtr, C.targetCtr, C.targetCtr, C.targetCtr, C.targetMid, C.targetOut],
    [C.targetOut, C.targetMid, C.targetCtr, C.targetCtr, C.targetCtr, C.targetCtr, C.targetMid, C.targetOut],
    [C.targetOut, C.targetMid, C.targetOut, C.targetCtr, C.targetCtr, C.targetOut, C.targetMid, C.targetOut],
    [_, C.targetOut, C.targetMid, C.targetMid, C.targetMid, C.targetMid, C.targetOut, _],
    [_, _, C.targetOut, C.targetOut, C.targetOut, C.targetOut, _, _],
  ],
};
