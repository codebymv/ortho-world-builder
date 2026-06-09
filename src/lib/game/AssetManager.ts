import * as THREE from 'three';
import { ENEMY_BLUEPRINTS } from '@/data/enemies';

// Shared geometry instances to avoid creating duplicates
const _sharedTileGeometry = new THREE.PlaneGeometry(1, 1);
const _sharedPlayerGeometry = new THREE.PlaneGeometry(1.0, 1.25);
const _sharedEnemyGeometry = new THREE.PlaneGeometry(0.7, 0.7);
const _sharedHPBarBgGeometry = new THREE.PlaneGeometry(0.6, 0.06);
const _sharedHPBarFillGeometry = new THREE.PlaneGeometry(0.58, 0.04);

export const SharedGeometry = {
  tile: _sharedTileGeometry,
  player: _sharedPlayerGeometry,
  enemy: _sharedEnemyGeometry,
  hpBarBg: _sharedHPBarBgGeometry,
  hpBarFill: _sharedHPBarFillGeometry,
};

export class AssetManager {
  private textures: Map<string, THREE.Texture>;
  private textureGenerators: Map<string, () => THREE.Texture>;
  private textureDataUrls: Map<string, string>;

  constructor() {
    this.textures = new Map();
    this.textureGenerators = new Map();
    this.textureDataUrls = new Map();
  }

  /**
   * Soft idle "wave crest" decal on a transparent background. World.tickWaterRipples stamps one
   * briefly onto a random visible water tile, fades it in and back out, then recycles it — so the
   * surface gets the occasional subtle lap instead of a constant per-tile loop. Two gently curved,
   * pale-cyan crest lines (bright core riding a fainter body) tapered to nothing at the edges.
   */
  createWaterRippleTexture(width = 32, height = 32): THREE.Texture {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d')!;
    ctx.clearRect(0, 0, width, height);
    const drawCrest = (cy: number, amp: number, coreAlpha: number, bodyAlpha: number) => {
      for (let x = 4; x < width - 4; x++) {
        const t = (x - 4) / (width - 8);
        const edge = Math.sin(t * Math.PI); // 0 at the ends, 1 in the middle — soft taper
        const y = Math.round(cy + Math.sin(t * Math.PI * 2) * amp);
        ctx.fillStyle = `rgba(150, 215, 245, ${bodyAlpha * edge})`;
        ctx.fillRect(x, y + 1, 1, 1);
        ctx.fillStyle = `rgba(228, 246, 255, ${coreAlpha * edge})`;
        ctx.fillRect(x, y, 1, 1);
      }
    };
    drawCrest(13, 2.2, 0.85, 0.45);
    drawCrest(20, 1.6, 0.55, 0.3);
    const texture = new THREE.CanvasTexture(canvas);
    texture.magFilter = THREE.NearestFilter;
    texture.minFilter = THREE.NearestFilter;
    return texture;
  }

  /**
   * Soft idle "wind gust" decal on a transparent background. World.tickAmbientDecals stamps one
   * briefly onto a random visible grass/tree tile, fades it in and back out, then recycles it — so
   * vegetation gets the occasional drifting rustle instead of a constant sway. A few pale, faintly
   * green-white motion streaks that arc gently upward to the right (the gust's travel direction),
   * tapered to nothing at both ends.
   */
  createWindGustTexture(width = 32, height = 32): THREE.Texture {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d')!;
    ctx.clearRect(0, 0, width, height);
    const streaks = [
      { x0: 5, len: 20, cy: 11, alpha: 0.5 },
      { x0: 3, len: 26, cy: 16, alpha: 0.62 },
      { x0: 9, len: 15, cy: 22, alpha: 0.42 },
    ];
    for (const s of streaks) {
      for (let i = 0; i < s.len; i++) {
        const x = s.x0 + i;
        if (x >= width - 1) break;
        const t = i / s.len;
        const edge = Math.sin(t * Math.PI); // soft taper at both ends of the streak
        const y = Math.round(s.cy - t * 2.5); // gentle upward arc toward the leading edge
        ctx.fillStyle = `rgba(236, 248, 232, ${s.alpha * edge})`;
        ctx.fillRect(x, y, 1, 1);
      }
    }
    const texture = new THREE.CanvasTexture(canvas);
    texture.magFilter = THREE.NearestFilter;
    texture.minFilter = THREE.NearestFilter;
    return texture;
  }

  createColorTexture(color: number, width: number = 32, height: number = 32, pattern?: 'noise' | 'checker' | 'gradient' | 'cobblestone_grid' | 'mossy_cobblestone' | 'bedrock'): THREE.Texture {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d')!;
    
    const r = (color >> 16) & 255;
    const g = (color >> 8) & 255;
    const b = color & 255;
    ctx.fillStyle = `rgb(${r}, ${g}, ${b})`;
    ctx.fillRect(0, 0, width, height);

    if (pattern === 'noise') {
      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          const variation = Math.floor(Math.random() * 20) - 10;
          const nr = Math.max(0, Math.min(255, r + variation));
          const ng = Math.max(0, Math.min(255, g + variation));
          const nb = Math.max(0, Math.min(255, b + variation));
          ctx.fillStyle = `rgb(${nr}, ${ng}, ${nb})`;
          ctx.fillRect(x, y, 1, 1);
        }
      }
    } else if (pattern === 'checker') {
      for (let y = 0; y < height; y += 4) {
        for (let x = 0; x < width; x += 4) {
          if ((x / 4 + y / 4) % 2 === 0) {
            ctx.fillStyle = `rgba(0,0,0,0.05)`;
            ctx.fillRect(x, y, 4, 4);
          }
        }
      }
    } else if (pattern === 'cobblestone_grid') {
      const stoneW = 7;
      const stoneH = 5;
      const gap = 1;
      const mr = Math.min(255, r + 28);
      const mg = Math.min(255, g + 25);
      const mb = Math.min(255, b + 20);
      ctx.fillStyle = `rgb(${mr}, ${mg}, ${mb})`;
      ctx.fillRect(0, 0, width, height);

      for (let row = 0; row < height + stoneH; row += stoneH + gap) {
        const rowIdx = Math.floor(row / (stoneH + gap));
        const offset = (rowIdx % 2 === 0) ? 0 : Math.floor(stoneW / 2);
        for (let col = -stoneW; col < width + stoneW; col += stoneW + gap) {
          const sx = col + offset;
          const v = Math.floor(Math.random() * 20) - 10;
          const sr = Math.max(0, Math.min(255, r + v));
          const sg = Math.max(0, Math.min(255, g + v));
          const sb = Math.max(0, Math.min(255, b + v));
          ctx.fillStyle = `rgb(${sr}, ${sg}, ${sb})`;
          ctx.fillRect(sx, row, stoneW, stoneH);
          ctx.fillStyle = 'rgba(255,255,255,0.12)';
          ctx.fillRect(sx, row, stoneW, 1);
          ctx.fillStyle = 'rgba(0,0,0,0.12)';
          ctx.fillRect(sx, row + stoneH - 1, stoneW, 1);
        }
      }
    } else if (pattern === 'mossy_cobblestone') {
      const clamp = (v: number) => Math.max(0, Math.min(255, v));
      const moss = { r: 60, g: 92, b: 48 };
      const darkMoss = { r: 36, g: 60, b: 32 };
      const stoneW = 7;
      const stoneH = 5;
      const gap = 1;

      ctx.fillStyle = `rgb(${clamp(r - 38)}, ${clamp(g - 35)}, ${clamp(b - 32)})`;
      ctx.fillRect(0, 0, width, height);

      for (let row = 0; row < height + stoneH; row += stoneH + gap) {
        const rowIdx = Math.floor(row / (stoneH + gap));
        const offset = rowIdx % 2 === 0 ? 0 : Math.floor(stoneW / 2);
        for (let col = -stoneW; col < width + stoneW; col += stoneW + gap) {
          const sx = col + offset;
          const hash = (rowIdx * 29 + col * 17 + width * 7) & 31;
          const v = (hash % 11) - 5;
          const sr = clamp(r + 12 + v);
          const sg = clamp(g + 8 + v);
          const sb = clamp(b + 2 + v);
          ctx.fillStyle = `rgb(${sr}, ${sg}, ${sb})`;
          ctx.fillRect(sx, row, stoneW, stoneH);

          ctx.fillStyle = 'rgba(255,255,255,0.10)';
          ctx.fillRect(sx, row, stoneW, 1);
          ctx.fillStyle = 'rgba(0,0,0,0.22)';
          ctx.fillRect(sx, row + stoneH - 1, stoneW, 1);
          ctx.fillRect(sx + stoneW - 1, row, 1, stoneH);

          if (hash % 3 === 0) {
            ctx.fillStyle = `rgba(${moss.r},${moss.g},${moss.b},0.52)`;
            ctx.fillRect(sx, row + stoneH - 1, stoneW, 1);
            if (stoneH > 3) ctx.fillRect(sx + 1, row + stoneH - 2, Math.max(1, stoneW - 3), 1);
          }
          if (hash % 5 === 0) {
            ctx.fillStyle = `rgba(${darkMoss.r},${darkMoss.g},${darkMoss.b},0.55)`;
            ctx.fillRect(sx, row, 1, stoneH);
            ctx.fillRect(sx + 1, row + 1, 1, Math.max(1, stoneH - 2));
          }
          if (hash % 7 === 0) {
            ctx.fillStyle = 'rgba(25,24,22,0.42)';
            ctx.fillRect(sx + 2, row + 1, 1, Math.max(1, stoneH - 2));
            ctx.fillRect(sx + 3, row + 2, 2, 1);
          }
        }
      }

      const flecks = Math.floor(width * height * 0.08);
      for (let i = 0; i < flecks; i++) {
        const fx = Math.floor(Math.random() * width);
        const fy = Math.floor(Math.random() * height);
        const isMoss = Math.random() < 0.65;
        ctx.fillStyle = isMoss
          ? `rgba(${moss.r},${moss.g + 18},${moss.b},0.42)`
          : 'rgba(255,255,255,0.10)';
        ctx.fillRect(fx, fy, 1, 1);
      }
    } else if (pattern === 'gradient') {
      for (let y = 0; y < height; y++) {
        const factor = y / height * 0.3;
        ctx.fillStyle = `rgba(0,0,0,${factor})`;
        ctx.fillRect(0, y, width, 1);
      }
    } else if (pattern === 'bedrock') {
      // Quarried bedrock - granite-like speckle in 2px clusters. No directional gradient, so it
      // tiles across a clearing without the repeating horizontal "bars" the gradient pattern caused.
      const clamp = (v: number) => Math.max(0, Math.min(255, v));
      for (let y = 0; y < height; y += 2) {
        for (let x = 0; x < width; x += 2) {
          const roll = Math.random();
          let v: number;
          if (roll < 0.14) v = 16 + Math.floor(Math.random() * 16);       // bright mineral fleck
          else if (roll < 0.30) v = -(18 + Math.floor(Math.random() * 18)); // dark pit / shadow
          else v = Math.floor(Math.random() * 16) - 8;                      // mid mottle
          ctx.fillStyle = `rgb(${clamp(r + v)}, ${clamp(g + v)}, ${clamp(b + v)})`;
          ctx.fillRect(x, y, 2, 2);
        }
      }
      // Fine grit overlay so the rock doesn't read as uniform 2px blocks.
      const grit = Math.floor(width * height * 0.14);
      for (let i = 0; i < grit; i++) {
        const gx = Math.floor(Math.random() * width);
        const gy = Math.floor(Math.random() * height);
        ctx.fillStyle = Math.random() < 0.5 ? 'rgba(255,255,255,0.14)' : 'rgba(0,0,0,0.16)';
        ctx.fillRect(gx, gy, 1, 1);
      }
    }
    
    const texture = new THREE.CanvasTexture(canvas);
    texture.magFilter = THREE.NearestFilter;
    texture.minFilter = THREE.NearestFilter;
    return texture;
  }

  private hex(c: number): string {
    return `rgb(${(c >> 16) & 255}, ${(c >> 8) & 255}, ${c & 255})`;
  }

  createSpriteTexture(
    colors: readonly (readonly number[])[],
    cellSize: number = 4,
    spriteId?: string
  ): THREE.Texture {
    const width = colors[0].length * cellSize;
    const height = colors.length * cellSize;
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d')!;

    // Clear canvas with transparent background
    ctx.clearRect(0, 0, width, height);

    for (let y = 0; y < colors.length; y++) {
      for (let x = 0; x < colors[y].length; x++) {
        const color = colors[y][x];
        if (color !== 0) {
          const r = (color >> 16) & 255;
          const g = (color >> 8) & 255;
          const b = color & 255;
          
          ctx.fillStyle = `rgb(${r}, ${g}, ${b})`;
          ctx.fillRect(x * cellSize, y * cellSize, cellSize, cellSize);
          
          // Remove automatic highlight/shadow effects to prevent transparency issues
          // ctx.fillStyle = `rgba(255,255,255,0.18)`;
          // ctx.fillRect(x * cellSize, y * cellSize, 1, 1);
          
          // ctx.fillStyle = `rgba(0,0,0,0.12)`;
          // ctx.fillRect(x * cellSize + cellSize - 1, y * cellSize + cellSize - 1, 1, 1);
        }
      }
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.magFilter = THREE.NearestFilter;
    texture.minFilter = THREE.NearestFilter;
    texture.wrapS = THREE.ClampToEdgeWrapping;
    texture.wrapT = THREE.ClampToEdgeWrapping;
    texture.premultiplyAlpha = false; // Disable premultiplied alpha for proper transparency

    if (spriteId) {
      this.textureDataUrls.set(spriteId, canvas.toDataURL());
    }

    return texture;
  }

  createBloodstainTexture(variant: number = 0, spriteId?: string): THREE.Texture {
    const C = 0;
    const BLOOD_HI = 0xA51A1A;
    const BLOOD_MID = 0x7B1010;
    const BLOOD_DARK = 0x4A0707;
    const BLOOD_DRY = 0x270303;
    const W = 11;
    const H = 9;
    const pixels: number[][] = Array.from({ length: H }, () => Array(W).fill(C));

    let seed = (Math.imul(variant + 1, 1664525) + 1013904223) >>> 0;
    const rand = () => {
      seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
      return seed / 0xffffffff;
    };

    const lobes = Array.from({ length: 2 + Math.floor(rand() * 3) }, (_, index) => {
      const isCore = index === 0;
      return {
        cx: 5 + (rand() - 0.5) * (isCore ? 1.0 : 4.2),
        cy: 4 + (rand() - 0.5) * (isCore ? 0.8 : 3.0),
        rx: (isCore ? 2.15 : 1.0) + rand() * (isCore ? 1.0 : 1.35),
        ry: (isCore ? 1.45 : 0.7) + rand() * (isCore ? 0.9 : 1.1),
      };
    });

    const setPixel = (x: number, y: number, color: number) => {
      const px = Math.round(x);
      const py = Math.round(y);
      if (px < 0 || py < 0 || px >= W || py >= H) return;
      pixels[py][px] = color;
    };

    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        let strength = 0;
        for (const lobe of lobes) {
          const dx = (x - lobe.cx) / lobe.rx;
          const dy = (y - lobe.cy) / lobe.ry;
          strength = Math.max(strength, 1 - (dx * dx + dy * dy));
        }
        strength += (rand() - 0.5) * 0.22;
        if (strength <= 0.06) continue;
        if (strength > 0.58) {
          pixels[y][x] = rand() > 0.35 ? BLOOD_HI : BLOOD_MID;
        } else if (strength > 0.28) {
          pixels[y][x] = rand() > 0.2 ? BLOOD_MID : BLOOD_DARK;
        } else {
          pixels[y][x] = rand() > 0.5 ? BLOOD_DARK : BLOOD_DRY;
        }
      }
    }

    const smearAngle = rand() * Math.PI * 2;
    const smearLength = 2 + Math.floor(rand() * 4);
    const smearX = 5 + (rand() - 0.5) * 1.2;
    const smearY = 4 + (rand() - 0.5) * 1.0;
    for (let step = 0; step < smearLength; step++) {
      const taper = step / Math.max(1, smearLength - 1);
      const x = smearX + Math.cos(smearAngle) * step;
      const y = smearY + Math.sin(smearAngle) * step;
      setPixel(x, y, taper < 0.65 ? BLOOD_DARK : BLOOD_DRY);
      if (rand() > 0.55) setPixel(x + Math.sin(smearAngle), y - Math.cos(smearAngle), BLOOD_DARK);
    }

    const dropCount = 2 + Math.floor(rand() * 5);
    for (let i = 0; i < dropCount; i++) {
      const angle = rand() * Math.PI * 2;
      const radius = 3 + rand() * 3.2;
      const x = 5 + Math.cos(angle) * radius;
      const y = 4 + Math.sin(angle) * radius;
      setPixel(x, y, rand() > 0.45 ? BLOOD_MID : BLOOD_DARK);
      if (rand() > 0.7) setPixel(x + (rand() > 0.5 ? 1 : -1), y, BLOOD_DARK);
    }

    return this.createSpriteTexture(pixels, 4, spriteId);
  }

  createRuinedForestCottageVariantTexture(
    baseSprite: readonly (readonly number[])[],
    variant: number = 0,
    spriteId?: string,
  ): THREE.Texture {
    const C = 0;
    const GROOF = 0x2E7D32;
    const GROOF_H = 0x43A047;
    const GROOF_S = 0x1B5E20;
    const RB = 0x5D4037;
    const RB_H = 0x795548;
    const RI = 0x3E2723;
    const RW_D = 0x8F857E;
    const RW_C = 0x6B5C50;
    const RV = 0x4CAF50;
    const RV_D = 0x2E7D32;
    const RM = 0x66BB6A;
    const CWALL = 0xD7CCC8;
    const CWALL_H = 0xEFEBE9;
    const WINDOW = 0x1A237E;
    const SHUTTER = 0x5D4037;

    const pixels: number[][] = baseSprite.map(row => [...row]);
    const height = pixels.length;
    const width = pixels[0]?.length ?? 0;
    let seed = (Math.imul(variant + 29, 1664525) + 1013904223) >>> 0;
    const rand = () => {
      seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
      return seed / 0xffffffff;
    };
    const randInt = (max: number) => Math.floor(rand() * max);
    const pick = <T,>(values: readonly T[]): T => values[Math.min(values.length - 1, randInt(values.length))];
    const inBounds = (x: number, y: number) => x >= 0 && y >= 0 && x < width && y < height;
    const get = (x: number, y: number) => inBounds(x, y) ? pixels[y][x] : C;
    const set = (x: number, y: number, color: number) => {
      if (!inBounds(x, y)) return;
      pixels[y][x] = color;
    };
    const paintIfSolid = (x: number, y: number, color: number) => {
      if (get(x, y) !== C) set(x, y, color);
    };

    const roofColors = new Set([GROOF, GROOF_H, GROOF_S, RB, RB_H, RI]);
    const wallColors = new Set([CWALL, CWALL_H, RW_D, RW_C, WINDOW, SHUTTER, RI]);

    const roofHoleCenters = [
      { x: 5, y: 3 },
      { x: 8, y: 4 },
      { x: 11, y: 5 },
      { x: 6, y: 6 },
      { x: 9, y: 6 },
    ];
    const roofHoleCount = 1 + randInt(3);
    for (let i = 0; i < roofHoleCount; i++) {
      const center = pick(roofHoleCenters);
      const w = 1 + randInt(2);
      const h = 1 + randInt(2);
      for (let dy = -h; dy <= h; dy++) {
        for (let dx = -w; dx <= w; dx++) {
          const x = center.x + dx;
          const y = center.y + dy;
          if (!roofColors.has(get(x, y))) continue;
          const edge = Math.abs(dx) === w || Math.abs(dy) === h;
          set(x, y, edge ? (rand() > 0.45 ? RB : RB_H) : RI);
        }
      }
    }

    const roofScars = 3 + randInt(4);
    for (let i = 0; i < roofScars; i++) {
      let x = 3 + randInt(10);
      const y = 2 + randInt(5);
      const len = 2 + randInt(4);
      for (let step = 0; step < len; step++) {
        if (roofColors.has(get(x, y + step))) {
          set(x, y + step, rand() > 0.5 ? RB : RI);
        }
        x += rand() > 0.55 ? 1 : -1;
      }
    }

    const vineCount = 2 + randInt(3);
    for (let i = 0; i < vineCount; i++) {
      let x = 2 + randInt(12);
      const startY = 3 + randInt(4);
      const endY = 11 + randInt(2);
      for (let y = startY; y <= endY; y++) {
        if (rand() > 0.62) x += rand() > 0.5 ? 1 : -1;
        x = Math.max(1, Math.min(width - 3, x));
        const current = get(x, y);
        if (current !== C && (roofColors.has(current) || wallColors.has(current))) {
          set(x, y, rand() > 0.35 ? RV_D : RV);
          if (rand() > 0.56) paintIfSolid(x + (rand() > 0.5 ? 1 : -1), y, rand() > 0.45 ? RM : RV);
          if (rand() > 0.72) paintIfSolid(x, y + 1, RM);
        }
      }
    }

    const crackCount = 2 + randInt(3);
    for (let i = 0; i < crackCount; i++) {
      let x = 2 + randInt(12);
      const yStart = 7 + randInt(4);
      const len = 2 + randInt(4);
      for (let step = 0; step < len; step++) {
        const y = yStart + step;
        if (wallColors.has(get(x, y))) {
          set(x, y, rand() > 0.28 ? RW_C : RI);
        }
        if (rand() > 0.6) x += rand() > 0.5 ? 1 : -1;
      }
    }

    const breakLeftWindow = rand() > 0.35;
    const breakRightWindow = rand() > 0.35;
    const damageWindow = (x0: number) => {
      for (let y = 8; y <= 9; y++) {
        for (let x = x0; x <= x0 + 1; x++) {
          const color = rand() > 0.45 ? RI : RW_C;
          set(x, y, color);
        }
      }
      if (rand() > 0.5) set(x0 - 1, 8, RB);
      if (rand() > 0.5) set(x0 + 2, 9, RB_H);
    };
    if (breakLeftWindow) damageWindow(2);
    if (breakRightWindow) damageWindow(12);

    for (let y = 10; y <= 12; y++) {
      for (let x = 4; x <= 11; x++) {
        if (get(x, y) === C) continue;
        const roll = rand();
        if (roll > 0.78) set(x, y, RM);
        else if (roll > 0.55) set(x, y, RV_D);
        else if (roll > 0.28) set(x, y, RW_C);
        else set(x, y, RW_D);
      }
    }

    const rubbleCount = 5 + randInt(5);
    for (let i = 0; i < rubbleCount; i++) {
      const x = 1 + randInt(width - 3);
      const y = 12 + randInt(2);
      const color = pick([RW_C, RW_D, RB, RB_H, RM]);
      paintIfSolid(x, y, color);
      if (rand() > 0.65) paintIfSolid(x + 1, y, color);
    }

    return this.createSpriteTexture(pixels, 4, spriteId);
  }

  // ---------------------------------------------------------------------------
  // Forest prop kit variant generators
  // Each function takes the base sprite array and a variant integer (1, 2…) and
  // returns a deterministically-modified texture so the forest never shows the
  // same asset copy-pasted identically throughout.
  // ---------------------------------------------------------------------------

  createDeadTreeVariantTexture(
    baseSprite: readonly (readonly number[])[],
    variant: number,
  ): THREE.Texture {
    const C      = 0;
    const TRUNK  = 0x5D4037;
    const TRUNK_S = 0x3E2723;
    const SCAR   = 0x4E342E; // mid-dark bark scar tone

    const pixels: number[][] = baseSprite.map(row => [...row]);
    const H = pixels.length;
    const W = pixels[0]?.length ?? 0;

    let seed = (Math.imul(variant + 13, 1664525) + 1013904223) >>> 0;
    const rand = () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 0xffffffff; };
    const inB  = (x: number, y: number) => x >= 0 && y >= 0 && x < W && y < H;
    const get  = (x: number, y: number): number => inB(x, y) ? pixels[y][x] : C;
    const set  = (x: number, y: number, c: number) => { if (inB(x, y)) pixels[y][x] = c; };

    if (variant === 1) {
      // dead_tree_b - lost its left limb; right-heavy asymmetric crown.
      // Clear the left branch arm (rows 0-2, cols 0-3).
      for (let row = 0; row <= 2; row++) {
        for (let col = 0; col <= 3; col++) {
          if (get(col, row) !== C) set(col, row, C);
        }
      }
      if (get(3, 3) !== C) set(3, 3, C); // clear left merge point on row 3
      // Broken-off stub scar where the arm was removed.
      set(2, 3, TRUNK_S);
      set(1, 4, TRUNK_S);
      // Slightly wider root spread.
      set(3, 6, TRUNK_S);
    } else if (variant === 2) {
      // dead_tree_c - struck by lightning; sparse crown, dominant low-left branch.
      // Clear crown row entirely.
      for (let col = 0; col < W; col++) set(col, 0, C);
      // Trim far outer branches on row 1-2.
      set(1, 1, C);
      set(8, 2, C);
      // Add a hard-left branch jutting from mid-trunk.
      set(2, 4, TRUNK);
      set(1, 4, TRUNK_S);
      set(0, 5, TRUNK_S);
      // Bark crack scar running down the trunk center.
      for (let row = 5; row < H; row++) {
        if (get(4, row) === TRUNK) set(4, row, SCAR);
      }
    }

    // Shared: scatter 2-3 bark grain spots per variant for texture uniqueness.
    for (let i = 0; i < 3; i++) {
      const row = 4 + Math.floor(rand() * Math.max(1, H - 4));
      const col = 3 + Math.floor(rand() * 4);
      if (get(col, row) === TRUNK) set(col, row, TRUNK_S);
    }

    return this.createSpriteTexture(pixels, 4);
  }

  createStumpVariantTexture(
    baseSprite: readonly (readonly number[])[],
    variant: number,
  ): THREE.Texture {
    const C    = 0;
    const LIGHT = 0xBCAAA4; // cut-end highlight
    const MID   = 0x795548; // mid-tone bark
    const DARK  = 0x5D4037; // shadow bark
    const ROT   = 0x3E2723; // rotted heartwood
    const MOSS  = 0x6B8E3A; // moss green

    const pixels: number[][] = baseSprite.map(row => [...row]);
    const H = pixels.length;
    const W = pixels[0]?.length ?? 0;
    const inB = (x: number, y: number) => x >= 0 && y >= 0 && x < W && y < H;
    const set  = (x: number, y: number, c: number) => { if (inB(x, y)) pixels[y][x] = c; };

    if (variant === 1) {
      // stump_b - old mossy stump; rot at center, moss patches on the rim.
      set(1, 0, MOSS);   // left moss patch
      set(5, 0, MOSS);   // right moss patch
      set(2, 0, ROT);    // rotting heartwood left of center
      set(3, 0, ROT);    // rotting heartwood center
      set(2, 1, ROT);
      set(4, 1, ROT);
      set(1, 1, DARK);   // darker body - older wood
      set(5, 1, DARK);
    } else if (variant === 2) {
      // stump_c - freshly cut; bright pale face, pronounced outer ring.
      // Lighten the entire cut face.
      for (let col = 1; col <= 5; col++) {
        if (pixels[0][col] === MID) pixels[0][col] = LIGHT;
      }
      // Bold dark center ring.
      set(2, 0, DARK);
      set(3, 0, DARK);
      set(2, 1, DARK);
      set(4, 1, DARK);
      // Slightly thicker outer bark edge.
      void (MID); // used in base, silence lint
      set(0, 1, MID);
      set(6, 1, MID);
    }

    return this.createSpriteTexture(pixels, 4);
  }

  createTallGrassVariantTexture(
    baseSprite: readonly (readonly number[])[],
    variant: number,
  ): THREE.Texture {
    const X     = 0;
    const TG_DK = 0x1F5C24; // shaded base blade
    const TG_MD = 0x388E3C; // mid green
    const TG_LT = 0x5BB85A; // lit blade
    const TG_TP = 0x8FD98A; // pale tip

    const pixels: number[][] = baseSprite.map(row => [...row]);
    const H = pixels.length;
    const W = pixels[0]?.length ?? 0;

    let seed = (Math.imul(variant + 3, 1664525) + 1013904223) >>> 0;
    const rand = () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 0xffffffff; };
    const inB = (x: number, y: number) => x >= 0 && y >= 0 && x < W && y < H;
    const get  = (x: number, y: number): number => inB(x, y) ? pixels[y][x] : X;
    const set  = (x: number, y: number, c: number) => { if (inB(x, y)) pixels[y][x] = c; };

    if (variant === 1) {
      // tall_grass_b - gentle left lean: primary tip shifts one pixel left.
      set(7, 0, X);  set(6, 0, TG_TP); // tip 1 pixel left
      set(7, 1, TG_LT); set(6, 1, TG_TP); // secondary tip follows
      set(10, 2, TG_LT); set(9, 2, TG_TP); // right secondary blade nudged
      // Two micro body swaps for subtle density difference.
      for (let i = 0; i < 2; i++) {
        const row = 5 + Math.floor(rand() * 5);
        const col = 4 + Math.floor(rand() * 7);
        if (get(col, row) === TG_LT) set(col, row, TG_MD);
      }
    } else if (variant === 2) {
      // tall_grass_c - gentle right lean: tip shifts one pixel right, extra left blade.
      set(7, 0, X);  set(8, 0, TG_TP); // tip 1 pixel right
      set(8, 1, TG_LT); set(7, 1, TG_TP); // secondary tip stays centre
      set(11, 2, TG_TP); set(10, 2, TG_LT); // right secondary blade more spread
      set(4, 5, TG_TP); set(4, 6, TG_LT);  // extra left blade sprout
      // Two micro base darkening spots for density variation.
      for (let i = 0; i < 2; i++) {
        const row = 10 + Math.floor(rand() * 4);
        const col = 4 + Math.floor(rand() * 8);
        if (get(col, row) === TG_MD) set(col, row, TG_DK);
      }
    }

    // Suppress lint on unused colour refs - they are used in base + are referenced
    // implicitly via the pixel array above.
    void (TG_DK); void (H); void (W);
    return this.createSpriteTexture(pixels, 4);
  }

  createLiveTreeVariantTexture(
    baseSprite: readonly (readonly number[])[],
    variant: number,
  ): THREE.Texture {
    const C      = 0;
    const LEAF   = 0x2E7D32;
    const LEAF_H = 0x66BB6A;
    const LEAF_S = 0x1B5E20;

    const pixels: number[][] = baseSprite.map(row => [...row]);
    const H = pixels.length;
    const W = pixels[0]?.length ?? 0;

    let seed = (Math.imul(variant + 5, 1664525) + 1013904223) >>> 0;
    const rand = () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 0xffffffff; };
    const inB = (x: number, y: number) => x >= 0 && y >= 0 && x < W && y < H;
    const get  = (x: number, y: number): number => inB(x, y) ? pixels[y][x] : C;
    const set  = (x: number, y: number, c: number) => { if (inB(x, y)) pixels[y][x] = c; };

    if (variant === 1) {
      // tree_b - dense spreading canopy; rounder, fuller oak silhouette.
      // Convert the LEAF_S outer corners on the widest rows into solid LEAF.
      set(0, 4, LEAF); set(11, 4, LEAF);
      set(0, 5, LEAF); set(11, 5, LEAF);
      // Lighten the mid-crown shadow pixels for denser appearance.
      for (let row = 4; row <= 6; row++) {
        for (let col = 1; col < W - 1; col++) {
          if (get(col, row) === LEAF_S && rand() > 0.35) set(col, row, LEAF);
        }
      }
      // Add bright highlight specks to the upper crown for a sun-lit look.
      for (let row = 0; row <= 3; row++) {
        for (let col = 2; col < W - 2; col++) {
          if (get(col, row) === LEAF && rand() > 0.55) set(col, row, LEAF_H);
        }
      }
    } else if (variant === 2) {
      // tree_c - slender young tree; narrower, more tapered crown.
      // Clip the outer columns of the widest rows so the crown thins at the base.
      for (const col of [0, 1, 10, 11]) {
        for (let row = 4; row <= 6; row++) {
          if (get(col, row) !== C) set(col, row, C);
        }
      }
      // Narrow the bottom crown row to a tighter band.
      for (let col = 0; col < W; col++) {
        const px = get(col, 8);
        if ((px === LEAF || px === LEAF_S) && (col < 3 || col > 8)) set(col, 8, C);
      }
      // Reduce highlights - uniform muted canopy of a younger tree.
      for (let row = 0; row <= 8; row++) {
        for (let col = 0; col < W; col++) {
          if (get(col, row) === LEAF_H && rand() > 0.45) set(col, row, LEAF);
        }
      }
    }

    // Shared: micro leaf texture variation - 4 random swaps per variant.
    for (let i = 0; i < 4; i++) {
      const row = Math.floor(rand() * 9);
      const col = 2 + Math.floor(rand() * Math.max(1, W - 4));
      if (get(col, row) === LEAF) set(col, row, rand() > 0.5 ? LEAF_H : LEAF_S);
    }

    return this.createSpriteTexture(pixels, 4);
  }

  createFallenLogVariantTexture(
    baseSprite: readonly (readonly number[])[],
    variant: number,
  ): THREE.Texture {
    const C     = 0;
    const TRUNK = 0x5D4037;
    const TRUNK_S = 0x3E2723;
    const MOSS  = 0x6B8E3A;

    const pixels: number[][] = baseSprite.map(row => [...row]);
    const H = pixels.length;
    const W = pixels[0]?.length ?? 0;
    const inB = (x: number, y: number) => x >= 0 && y >= 0 && x < W && y < H;
    const set  = (x: number, y: number, c: number) => { if (inB(x, y)) pixels[y][x] = c; };

    if (variant === 1) {
      // Shorter broken piece - clear one end of the log so it reads as a snapped section.
      if (H > W) {
        // Horizontal log (tall canvas): clear leftmost 3 cols.
        for (let row = 0; row < H; row++) {
          pixels[row][0] = C;
          pixels[row][1] = C;
          pixels[row][2] = C;
        }
        // Expose a cut-end face at the new left edge (col 3).
        for (let row = 6; row <= 10; row++) {
          if (pixels[row][3] !== C) set(3, row, TRUNK_S);
        }
      } else {
        // Vertical log (wide canvas): clear top 3 rows.
        for (let col = 0; col < W; col++) {
          pixels[0][col] = C;
          pixels[1][col] = C;
          pixels[2][col] = C;
        }
        // Expose cut-end face at row 3.
        for (let col = 5; col <= 11; col++) {
          if (pixels[3][col] !== C) set(col, 3, TRUNK_S);
        }
      }
      // Add moss patches along the body.
      set(5, 7, MOSS);
      set(8, 8, MOSS);
      void (TRUNK); // silence lint - used in base
      void (TRUNK_S);
    }

    return this.createSpriteTexture(pixels, 4);
  }

  // Supersamples a hand-authored facade base 2× on each axis (so a 16×28 design becomes
  // 32×56). The authored layout is the design source of truth; this doubles the logical
  // resolution so each cell covers a quarter of the on-screen area at the building's
  // imposing render scale (≈7 tiles), killing the chunky "few-giant-pixels" look without
  // changing proportions (the 4:7 aspect is preserved, so scale/yOffset/foundation hold).
  //
  // Window glow cells are the generator's per-window anchors, so after doubling we THIN
  // each 2×2 glow block back to a single top-left anchor (the rest become dark glass),
  // keeping one anchor per window. A subtle mullion + transom is drawn into the enlarged
  // pane, and horizontal mortar courses are scored across the brick - real sub-cell detail
  // the higher resolution now affords.
  private upscaleFacadeBase(
    base: readonly (readonly number[])[],
    windowAnchor: number,
    windowGlass: number,
    windowFrame: number,
    wallColors: readonly number[],
    mortar: number,
  ): number[][] {
    const H = base.length;
    const W = base[0]?.length ?? 0;
    const out: number[][] = Array.from({ length: H * 2 }, () => new Array<number>(W * 2).fill(0));
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        const c = base[y][x];
        out[2 * y][2 * x] = c;
        out[2 * y][2 * x + 1] = c;
        out[2 * y + 1][2 * x] = c;
        out[2 * y + 1][2 * x + 1] = c;
      }
    }
    const wall = new Set(wallColors);
    // Thin window-glow blocks to a single anchor, then mullion/transom the enlarged pane.
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        if (base[y][x] !== windowAnchor) continue;
        const ax = 2 * x, ay = 2 * y;
        out[ay][ax] = windowAnchor;          // single anchor (top-left)
        out[ay][ax + 1] = windowGlass;
        out[ay + 1][ax] = windowFrame;       // transom bar
        out[ay + 1][ax + 1] = windowGlass;
      }
    }
    // Mortar courses: score a faint horizontal line every 4 rows through brick walls so
    // the masonry reads as coursed stone/brick instead of a flat slab at large scale.
    for (let y = 0; y < H * 2; y += 4) {
      for (let x = 0; x < W * 2; x++) {
        if (wall.has(out[y][x]) && (x % 2 === 0)) out[y][x] = mortar;
      }
    }
    return out;
  }

  // Guilrhym building "kit" - takes a hand-authored base facade and layers
  // deterministic, bounded character per variant (grime streaks, boarded/broken
  // windows, ashen corruption creeping up from the street, roof holes + chimney
  // toggle, awnings, hanging signs, sparse vines, cracks). Same approach as the
  // ruined forest cottage, so every placed building reads as individual.
  //
  // Resolution-relative: every structural edit derives its rows/heights from the base's
  // actual H/W (via scaleY/scaleX vs the original 16×28 design grid), so the same code
  // drives both the legacy size and the 2× supersampled facades.
  createGuilrhymBuildingVariant(
    baseSprite: readonly (readonly number[])[],
    variant: number = 0,
    spriteId?: string,
  ): THREE.Texture {
    const C = 0;
    const TB = 0x6b4a3a, TBD = 0x533829, TBL = 0x7d5a48, TBG = 0x46362c;   // brick base/shadow/light/grime
    const TS = 0x8a8278;                                                    // stone trim/sill/cornice
    const TW = 0x171b22, TWG = 0x39434f, TWF = 0x241a14;                    // window glass/glow/frame
    const TR = 0x3a3a44, TRD = 0x2a2a32, CHM = 0x4a3530;                    // slate roof / chimney
    const TGF = 0x453f39, TSG = 0x2b3138;                                   // ground stone / shop glass
    const SOOT = 0x2a241e, ASH1 = 0x35313a, ASH2 = 0x201d26;               // soot grime / ashen corruption
    const MOSS = 0x55603f, VINE = 0x3f5238;                                 // muted urban green (rare)
    const BRD = 0x5a4632, BRD2 = 0x6e5640;                                  // boarding planks
    const AWN = [0x6e2b2b, 0x294a6e, 0x35543a, 0x6e5a2b, 0x4a2b5a];         // awning cloth options

    const pixels: number[][] = baseSprite.map(row => [...row]);
    const H = pixels.length;
    const W = pixels[0]?.length ?? 0;
    let seed = (Math.imul(variant + 53, 1664525) + 1013904223) >>> 0;
    const rand = () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 0xffffffff; };
    const ri = (m: number) => Math.floor(rand() * m);
    const pick = <T,>(a: readonly T[]): T => a[Math.min(a.length - 1, ri(a.length))];
    const inB = (x: number, y: number) => x >= 0 && y >= 0 && x < W && y < H;
    const get = (x: number, y: number) => (inB(x, y) ? pixels[y][x] : C);
    const set = (x: number, y: number, c: number) => { if (inB(x, y)) pixels[y][x] = c; };
    const wall = new Set([TB, TBD, TBL, TBG, TS]);
    const roof = new Set([TR, TRD, CHM]);
    const TRL = 0x4e4e5a;

    // Victorian palette pool - every building rolls one so brick / soot-black / grey
    // ashlar / stucco-white / brown all jumble together (a district is defined by the
    // MIX of forms, not a uniform colour). Remapped onto the base brick at the very end.
    const PALETTES = [
      { b: 0x8a4a3a, d: 0x6a3528, l: 0x9a5a48, r: 0x3a3a44, rd: 0x2a2a32, ch: 0x4a3028 }, // red brick
      { b: 0x8c8884, d: 0x6c6864, l: 0x9e9a96, r: 0x44444c, rd: 0x303038, ch: 0x5a5650 }, // grey ashlar
      { b: 0x36363c, d: 0x26262c, l: 0x48484f, r: 0x26262c, rd: 0x1a1a20, ch: 0x2a2a30 }, // soot black
      { b: 0xc4b49a, d: 0xa4947c, l: 0xd6c6ae, r: 0x4a4640, rd: 0x35332e, ch: 0x6a5a48 }, // cream stucco
      { b: 0x6b4a3a, d: 0x533829, l: 0x7d5a48, r: 0x3a3a44, rd: 0x2a2a32, ch: 0x4a3530 }, // brown brick
      { b: 0x9a9488, d: 0x787268, l: 0xaca698, r: 0x4e4a44, rd: 0x383530, ch: 0x6a6458 }, // pale stone
      { b: 0x6e3a3a, d: 0x4e2828, l: 0x804848, r: 0x3a3036, rd: 0x281f24, ch: 0x44302c }, // oxblood
    ];
    const PAL = PALETTES[Math.floor(rand() * PALETTES.length)];

    // ---- STRUCTURAL variety (roofline, height, bay) - applied before grime so the
    // silhouette itself differs per building, not just the surface. ----
    // Everything below is expressed relative to the base's actual size vs the original
    // 16×28 design grid, so the legacy and 2× supersampled facades both work.
    const cx = Math.floor(W / 2);
    const scaleY = H / 28;
    const sY = (v: number) => Math.max(0, Math.round(v * scaleY));
    const roofRows = Math.max(2, sY(4));                 // authored roof+dormer band height
    const clearRoof = () => { for (let y = 0; y < roofRows; y++) for (let x = 0; x < W; x++) set(x, y, C); };
    const parapetGap = Math.max(2, Math.round(3 * (W / 16)));
    const style = variant % 4;
    if (style === 1) {
      // Flat roof + crenellated parapet.
      clearRoof();
      for (let x = 1; x < W - 2; x++) { set(x, roofRows - 2, TBD); set(x, roofRows - 1, (x % parapetGap === 0) ? C : TB); }
    } else if (style === 2) {
      // Peaked gable - narrow peak at the TOP (row 0), widening to the eaves.
      clearRoof();
      for (let s = 0; s < roofRows; s++) {
        const half = s + 1;
        for (let x = cx - half; x <= cx + half; x++) set(x, s, (x === cx - half || x === cx + half) ? TRD : TR);
      }
    } else if (style === 3) {
      // Stepped (Dutch) gable.
      clearRoof();
      for (let s = 0; s < roofRows; s++) {
        const half = (roofRows - 1) - s;
        for (let x = cx - half; x <= cx + half; x++) set(x, (roofRows - 1) - s, (s % 2 === 0) ? TB : TBD);
      }
    }
    // else style 0: keep the authored mansard + dormers.

    // Chimney toggle (independent of roofline).
    if (rand() > 0.5) { for (let y = 0; y < roofRows; y++) for (let x = 0; x < W; x++) if (get(x, y) === CHM) set(x, y, C); }

    // Height variation - full / minus-one / minus-two storeys - so a connected terrace
    // gets a jagged Edinburgh-"lands" skyline instead of a flat top. The shortened
    // buildings take a flat crenellated parapet at their new roofline.
    const hr = rand();
    const cut = hr > 0.78 ? sY(12) : hr > 0.48 ? sY(8) : 0;
    if (cut > 0) {
      for (let y = 0; y <= cut; y++) for (let x = 0; x < W; x++) set(x, y, C);
      for (let x = 1; x < W - 2; x++) {
        set(x, cut, TS);                                  // cornice line
        set(x, cut - 1, (x % parapetGap === 0) ? C : TB); // crenellated parapet
        if (rand() > 0.6) set(x, cut + 1, TBD);           // grime under cornice
      }
    }

    // Protruding bay/oriel window on one storey (~55%).
    if (rand() > 0.45) {
      const wy = pick([sY(6), sY(10), sY(14), sY(18)]);
      const x0 = rand() > 0.5 ? Math.round(2 * (W / 16)) : Math.round(8 * (W / 16));
      for (let x = x0 - 1; x <= x0 + 3; x++) {
        if (get(x, wy) !== C) set(x, wy, TWG);
        if (get(x, wy + 1) !== C) set(x, wy + 1, TW);
        set(x, wy - 1, TRL);
        if (get(x, wy + 2) !== C) set(x, wy + 2, TBD);
      }
    }

    // 1) Soot streaks weeping down the brickwork.
    const streaks = 3 + ri(4);
    for (let i = 0; i < streaks; i++) {
      let x = 1 + ri(W - 2);
      const y0 = 5 + ri(8);
      const len = 4 + ri(10);
      for (let s = 0; s < len; s++) {
        const y = y0 + s;
        if (wall.has(get(x, y))) set(x, y, rand() > 0.5 ? TBG : SOOT);
        if (rand() > 0.72) x += rand() > 0.5 ? 1 : -1;
        x = Math.max(0, Math.min(W - 1, x));
      }
    }

    // 2) Ashen corruption creeping up from the base (Guilrhym's blight).
    const ashH = sY(3) + ri(sY(7));
    for (let y = H - 1; y >= H - ashH; y--) {
      const t = (y - (H - ashH)) / ashH; // 0 at top of band -> 1 at base
      for (let x = 0; x < W; x++) {
        if (get(x, y) === C) continue;
        if (rand() < 0.35 + 0.45 * (1 - t)) set(x, y, rand() > 0.5 ? ASH2 : ASH1);
      }
    }

    // 3) Per-window: board up, shatter dark, or leave. Window glow cells are anchors.
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        if (get(x, y) !== TWG) continue;
        const roll = rand();
        if (roll > 0.72) {            // boarded
          set(x, y, BRD); set(x - 1, y, BRD2); set(x + 1, y, rand() > 0.5 ? BRD : BRD2);
          if (rand() > 0.5) set(x, y - 1, BRD2);
        } else if (roll > 0.44) {     // dark / shattered
          set(x, y, TW); if (rand() > 0.6) set(x + 1, y, TWF);
        }
      }
    }

    // 4) Roof hole + chimney toggle for skyline variety.
    if (rand() > 0.55) {
      const cx = 3 + ri(W - 6), cy = ri(Math.max(1, roofRows - 1));
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
        if (roof.has(get(cx + dx, cy + dy))) set(cx + dx, cy + dy, rand() > 0.5 ? TRD : SOOT);
      }
    }
    if (rand() > 0.5) { // knock out the chimney on some variants
      for (let y = 0; y < roofRows; y++) for (let x = 0; x < W; x++) if (get(x, y) === CHM) set(x, y, C);
    }

    // 5) Ground-floor awning (cloth band) on roughly half the variants.
    if (rand() > 0.45) {
      const col = pick(AWN);
      const ay = H - sY(6) + ri(2);
      const ax0 = 1 + ri(3), ax1 = W - 2 - ri(3);
      for (let x = ax0; x <= ax1; x++) if (get(x, ay) !== C) set(x, ay, (x % 2 === 0) ? col : 0xe8e0d0);
    }

    // 6) A hanging shop sign bracket near the door.
    if (rand() > 0.5) {
      const sy = H - sY(8) + ri(2);
      const sx = rand() > 0.5 ? 2 + ri(2) : W - 4 - ri(2);
      set(sx, sy, 0x2a2018); set(sx, sy + 1, pick(AWN)); set(sx + 1, sy + 1, pick(AWN));
    }

    // 7) Sparse vines / moss on one flank (urban, not jungle).
    if (rand() > 0.4) {
      const side = rand() > 0.5 ? 1 : W - 2;
      let x = side;
      for (let y = 6 + ri(4); y < H - 2; y++) {
        if (wall.has(get(x, y)) && rand() > 0.4) set(x, y, rand() > 0.5 ? VINE : MOSS);
        if (rand() > 0.7) x += rand() > 0.5 ? 1 : -1;
        x = Math.max(0, Math.min(W - 1, x));
      }
    }

    // 8) Hairline cracks through the brick.
    const cracks = 1 + ri(3);
    for (let i = 0; i < cracks; i++) {
      let x = 2 + ri(W - 4);
      const y0 = 6 + ri(H - 14);
      const len = 3 + ri(6);
      for (let s = 0; s < len; s++) {
        const y = y0 + s;
        if (wall.has(get(x, y))) set(x, y, rand() > 0.4 ? TBD : SOOT);
        if (rand() > 0.55) x += rand() > 0.5 ? 1 : -1;
      }
    }

    // Final palette remap - recolours this building's brick + roof to its rolled palette
    // (windows, doors, sills, soot, boards, vines keep their own tones).
    const remap = new Map<number, number>([
      [TB, PAL.b], [TBD, PAL.d], [TBL, PAL.l], [TBG, PAL.d],
      [TR, PAL.r], [TRD, PAL.rd], [CHM, PAL.ch],
    ]);
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        const mapped = remap.get(pixels[y][x]);
        if (mapped !== undefined) pixels[y][x] = mapped;
      }
    }

    return this.createSpriteTexture(pixels, 4, spriteId);
  }

  // Unified pixel-art character sprite - pure fillRect, no curves
  createChibiCharacter(
    dir: 'down' | 'up' | 'left' | 'right',
    state: 'idle' | 'walk' | 'attack' | 'charge' | 'hurt' | 'block' = 'idle',
    frame: number = 0,
    palette: {
      hair: number; hairLight: number; hairDark: number;
      skin: number; skinLight: number; skinShadow: number;
      eyeIris: number; eyeIrisDark: number;
      tunicMain: number; tunicLight: number; tunicDark: number;
      trimColor: number; trimLight: number;
      capeMain: number; capeDark: number;
      pantColor: number; pantDark: number;
      bootColor: number; bootDark: number;
      // Optional blade colour overrides (defaults to grey sword)
      bladeMain?: number;
      bladeHighlight?: number;
      bladeShadow?: number;
      guardColor?: number;
      gripColor?: number;
      // 'broad' produces a longer/wider blade + wide guard for a distinct silhouette
      bladeStyle?: 'short' | 'broad';
    },
    spriteId?: string,
    bladeOnly: boolean = false,
    includeSword: boolean = true,
    // When provided the exact weapon icon is composited onto the character canvas
    // instead of drawing hardcoded sword pixels â€” creating a 1:1 match with the inventory UI.
    weaponCanvas?: HTMLCanvasElement,
    weaponScale: number = 1.0,
    // Combo step: 0=default swing, 1=backhand return, 2=overhead finisher
    comboStep: number = 0,
    // Extra downward pixel shift applied only to non-attack hold poses (idle/walk/block/charge).
    // Use for long weapons (e.g. scythe) whose blade tip clips the character's face at cy=default.
    weaponRestYShift: number = 0,
    // When 'scythe', applies a completely separate WPose table designed around scythe mechanics
    // (trailing low carry, ground-skim combo 0, hook pull combo 1, diagonal finisher combo 2).
    weaponType: 'default' | 'scythe' = 'default',
  ): THREE.Texture {
    // Grid-based pixel art: 16 cols x 20 rows, 4px per cell = 64x80
    const G = 4; // grid cell size
    const W = 16 * G, H = 20 * G;
    const canvas = document.createElement('canvas');
    canvas.width = W; canvas.height = H;
    const ctx = canvas.getContext('2d')!;
    const p = palette;
    const hex = this.hex.bind(this);

    const isLeft = dir === 'left';
    const isRight = dir === 'right';
    const isSide = isLeft || isRight;
    const isUp = dir === 'up';

    // Use hardcoded pixels only when no icon canvas is supplied (or for the blade-only glow mask).
    const drawHardcodedSword = includeSword && (!weaponCanvas || bladeOnly);

    // Helper: draw a cell at grid position
    const cell = (gx: number, gy: number, color: number) => {
      ctx.fillStyle = hex(color);
      ctx.fillRect(gx * G, gy * G, G, G);
    };

    // Animation
    const walkLeg = state === 'walk'
      ? frame === 0
        ? -1
        : frame === 1
          ? 1
          : frame === 2
            ? -2
            : 2
      : 0;
    const bob = state === 'walk' && Math.abs(walkLeg) > 0 ? -1 : 0;
    const atkFrame = state === 'attack' ? frame : -1;
    const isBlock = state === 'block';

    // Mirror helper for side views
    const mx = (gx: number) => isLeft ? gx : (15 - gx);

    if (isUp) {
      // ===== BACK VIEW =====
      // Cape
      for (let dy = 7; dy <= 16; dy++) {
        for (let dx = 4; dx <= 11; dx++) {
          cell(dx, dy + bob, (dx + dy) % 3 === 0 ? p.capeDark : p.capeMain);
        }
      }
      // Hair (back of head fills most)
      for (let dy = 0; dy <= 5; dy++) {
        const inset = dy < 2 ? 2 : 1;
        for (let dx = 4 + inset; dx <= 11 - inset; dx++) {
          cell(dx, dy, (dx + dy) % 4 === 0 ? p.hairLight : p.hair);
        }
      }
      // Hair dark stripes
      cell(6, 2, p.hairDark); cell(9, 3, p.hairDark); cell(7, 4, p.hairDark);
      // Spikes
      cell(6, 0, p.hair); cell(7, 0, p.hairLight); cell(9, 0, p.hair);
      // Neck
      cell(7, 6, p.skinShadow); cell(8, 6, p.skinShadow);
      // Body
      for (let dx = 5; dx <= 10; dx++) {
        cell(dx, 7 + bob, p.tunicDark);
        cell(dx, 8 + bob, p.tunicMain);
        cell(dx, 9 + bob, p.tunicMain);
      }
      // Belt
      for (let dx = 5; dx <= 10; dx++) cell(dx, 10 + bob, p.bootDark);
      cell(7, 10 + bob, p.trimColor); cell(8, 10 + bob, p.trimColor);
      // Tunic skirt
      for (let dx = 5; dx <= 10; dx++) cell(dx, 11 + bob, p.tunicDark);
      // Legs
      const lo = walkLeg;
      cell(6, 12 + bob, p.pantColor); cell(7, 12 + bob, p.pantColor);
      cell(6, 13 + lo + bob, p.pantColor); cell(7, 13 + lo + bob, p.pantColor);
      cell(6, 14 + lo + bob, p.bootColor); cell(7, 14 + lo + bob, p.bootColor);
      cell(8, 12 + bob, p.pantColor); cell(9, 12 + bob, p.pantColor);
      cell(8, 13 - lo + bob, p.pantColor); cell(9, 13 - lo + bob, p.pantColor);
      cell(8, 14 - lo + bob, p.bootColor); cell(9, 14 - lo + bob, p.bootColor);
    } else if (isSide) {
      // ===== SIDE VIEW =====
      const m = mx;
      // Cape behind
      for (let dy = 7; dy <= 14; dy++) {
        cell(m(10), dy + bob, p.capeMain);
        cell(m(11), dy + bob, p.capeDark);
        if (dy > 9) cell(m(12), dy + bob, p.capeDark);
      }
      // Sword - colours driven by palette overrides (defaults match the Meek Short Sword)
      const BLADE = p.bladeMain ?? 0xC0D0E0;
      const BLADE_H = p.bladeHighlight ?? 0xF0F4FF;
      const BLADE_E = p.bladeShadow ?? 0x90A8C0;
      const GUARD = p.guardColor ?? 0xE8C030;
      const GRIP = p.gripColor ?? 0x5D4037;
      const bladeIsBroad = p.bladeStyle === 'broad';
      if (drawHardcodedSword && atkFrame >= 0 && comboStep === 0) {
        // ===== COMBO STEP 0: right-to-left slash (original) =====
        if (atkFrame === 0) {
          cell(m(7), 0 + bob, BLADE_H); cell(m(8), 1 + bob, BLADE); cell(m(9), 2 + bob, BLADE_E);
          cell(m(8), 0 + bob, BLADE_H); cell(m(9), 1 + bob, BLADE);
          if (bladeIsBroad) {
            cell(m(7), 1 + bob, BLADE_H);
            cell(m(6), 2 + bob, GUARD); cell(m(7), 2 + bob, GUARD); cell(m(8), 2 + bob, GUARD); cell(m(9), 2 + bob, GUARD);
          } else {
            cell(m(8), 2 + bob, GUARD); cell(m(7), 2 + bob, GUARD);
          }
          cell(m(7), 3 + bob, GRIP); cell(m(7), 4 + bob, GRIP);
        } else if (atkFrame === 1) {
          cell(m(2), 2 + bob, BLADE_H); cell(m(3), 3 + bob, BLADE); cell(m(4), 4 + bob, BLADE_E);
          cell(m(3), 2 + bob, BLADE_H); cell(m(4), 3 + bob, BLADE);
          if (bladeIsBroad) {
            cell(m(1), 2 + bob, BLADE_H);
            cell(m(2), 5 + bob, GUARD); cell(m(3), 5 + bob, GUARD); cell(m(4), 5 + bob, GUARD); cell(m(5), 5 + bob, GUARD);
          } else {
            cell(m(4), 5 + bob, GUARD); cell(m(3), 5 + bob, GUARD);
          }
          cell(m(3), 6 + bob, GRIP);
        } else {
          cell(m(1), 7 + bob, BLADE_H); cell(m(2), 8 + bob, BLADE); cell(m(3), 9 + bob, BLADE_E);
          cell(m(2), 7 + bob, BLADE_H); cell(m(3), 8 + bob, BLADE);
          if (bladeIsBroad) {
            cell(m(0), 7 + bob, BLADE_H);
            cell(m(1), 10 + bob, GUARD); cell(m(2), 10 + bob, GUARD); cell(m(3), 10 + bob, GUARD); cell(m(4), 10 + bob, GUARD);
          } else {
            cell(m(3), 10 + bob, GUARD); cell(m(2), 10 + bob, GUARD);
          }
          cell(m(2), 11 + bob, GRIP);
        }
      } else if (drawHardcodedSword && atkFrame >= 0 && comboStep === 1) {
        // ===== COMBO STEP 1: backhand return â€” left-to-right (mirrored arc) =====
        // Blade starts low-left (where step 0 ended) and sweeps up-right
        if (atkFrame === 0) {
          // Wind-up from low opposite side
          cell(m(1), 9 + bob, BLADE_H); cell(m(2), 8 + bob, BLADE); cell(m(3), 7 + bob, BLADE_E);
          cell(m(2), 9 + bob, BLADE_H); cell(m(3), 8 + bob, BLADE);
          if (bladeIsBroad) {
            cell(m(0), 9 + bob, BLADE_H);
            cell(m(1), 10 + bob, GUARD); cell(m(2), 10 + bob, GUARD); cell(m(3), 10 + bob, GUARD); cell(m(4), 10 + bob, GUARD);
          } else {
            cell(m(3), 10 + bob, GUARD); cell(m(2), 10 + bob, GUARD);
          }
          cell(m(2), 11 + bob, GRIP);
        } else if (atkFrame === 1) {
          // Mid-swing: blade crossing through center, rising
          cell(m(11), 4 + bob, BLADE_H); cell(m(10), 5 + bob, BLADE); cell(m(9), 6 + bob, BLADE_E);
          cell(m(10), 4 + bob, BLADE_H); cell(m(9), 5 + bob, BLADE);
          if (bladeIsBroad) {
            cell(m(12), 4 + bob, BLADE_H);
            cell(m(9), 7 + bob, GUARD); cell(m(10), 7 + bob, GUARD); cell(m(11), 7 + bob, GUARD); cell(m(12), 7 + bob, GUARD);
          } else {
            cell(m(10), 7 + bob, GUARD); cell(m(9), 7 + bob, GUARD);
          }
          cell(m(9), 8 + bob, GRIP);
        } else {
          // Follow-through: swept high on opposite side
          cell(m(12), 1 + bob, BLADE_H); cell(m(11), 2 + bob, BLADE); cell(m(10), 3 + bob, BLADE_E);
          cell(m(11), 1 + bob, BLADE_H); cell(m(10), 2 + bob, BLADE);
          if (bladeIsBroad) {
            cell(m(13), 1 + bob, BLADE_H);
            cell(m(10), 4 + bob, GUARD); cell(m(11), 4 + bob, GUARD); cell(m(12), 4 + bob, GUARD); cell(m(13), 4 + bob, GUARD);
          } else {
            cell(m(11), 4 + bob, GUARD); cell(m(10), 4 + bob, GUARD);
          }
          cell(m(10), 5 + bob, GRIP);
        }
      } else if (drawHardcodedSword && atkFrame >= 0 && comboStep === 2) {
        // ===== COMBO STEP 2: overhead slam finisher â€” vertical downward =====
        if (atkFrame === 0) {
          // Wind-up: blade raised straight overhead
          cell(m(7), -1 + bob, BLADE_H); cell(m(7), 0 + bob, BLADE); cell(m(7), 1 + bob, BLADE_E);
          cell(m(8), -1 + bob, BLADE_H); cell(m(8), 0 + bob, BLADE);
          if (bladeIsBroad) {
            cell(m(6), -1 + bob, BLADE_H); cell(m(6), 0 + bob, BLADE_H);
            cell(m(5), 2 + bob, GUARD); cell(m(6), 2 + bob, GUARD); cell(m(7), 2 + bob, GUARD); cell(m(8), 2 + bob, GUARD); cell(m(9), 2 + bob, GUARD);
          } else {
            cell(m(6), 2 + bob, GUARD); cell(m(7), 2 + bob, GUARD); cell(m(8), 2 + bob, GUARD);
          }
          cell(m(7), 3 + bob, GRIP); cell(m(7), 4 + bob, GRIP);
        } else if (atkFrame === 1) {
          // Slam: blade coming straight down in front
          cell(m(5), 3 + bob, BLADE_H); cell(m(5), 4 + bob, BLADE); cell(m(5), 5 + bob, BLADE_E);
          cell(m(6), 3 + bob, BLADE_H); cell(m(6), 4 + bob, BLADE);
          if (bladeIsBroad) {
            cell(m(4), 3 + bob, BLADE_H); cell(m(4), 4 + bob, BLADE_H);
            cell(m(3), 6 + bob, GUARD); cell(m(4), 6 + bob, GUARD); cell(m(5), 6 + bob, GUARD); cell(m(6), 6 + bob, GUARD); cell(m(7), 6 + bob, GUARD);
          } else {
            cell(m(5), 6 + bob, GUARD); cell(m(6), 6 + bob, GUARD);
          }
          cell(m(5), 7 + bob, GRIP);
        } else {
          // Planted low: blade embedded past body
          cell(m(4), 9 + bob, BLADE_H); cell(m(4), 10 + bob, BLADE); cell(m(4), 11 + bob, BLADE_E);
          cell(m(5), 9 + bob, BLADE_H); cell(m(5), 10 + bob, BLADE);
          if (bladeIsBroad) {
            cell(m(3), 9 + bob, BLADE_H); cell(m(3), 10 + bob, BLADE_H);
            cell(m(2), 12 + bob, GUARD); cell(m(3), 12 + bob, GUARD); cell(m(4), 12 + bob, GUARD); cell(m(5), 12 + bob, GUARD); cell(m(6), 12 + bob, GUARD);
          } else {
            cell(m(4), 12 + bob, GUARD); cell(m(5), 12 + bob, GUARD);
          }
          cell(m(4), 13 + bob, GRIP);
        }
      } else if (drawHardcodedSword && isBlock) {
        // Block: tall forward guard so the silhouette reads clearly at gameplay scale
        cell(m(4), 0 + bob, BLADE_H); cell(m(5), 1 + bob, BLADE); cell(m(6), 2 + bob, BLADE_E);
        cell(m(4), 1 + bob, BLADE_H); cell(m(5), 2 + bob, BLADE);
        if (bladeIsBroad) {
          cell(m(3), 0 + bob, BLADE_H); cell(m(3), 1 + bob, BLADE_H); // 3-px wide blade
          cell(m(2), 4 + bob, GUARD); cell(m(3), 4 + bob, GUARD); cell(m(4), 4 + bob, GUARD);
          cell(m(5), 4 + bob, GUARD); cell(m(6), 4 + bob, GUARD); cell(m(7), 4 + bob, GUARD); // 6-px guard
        } else {
          cell(m(3), 4 + bob, GUARD); cell(m(4), 4 + bob, GUARD); cell(m(5), 4 + bob, GUARD); cell(m(6), 4 + bob, GUARD);
        }
        cell(m(5), 5 + bob, GRIP); cell(m(5), 6 + bob, GRIP); cell(m(5), 7 + bob, GRIP);
        cell(m(5), 8 + bob, GUARD);
      } else if (drawHardcodedSword && state === 'charge') {
        // Charge stance side view: sword extends forward into a ready guard.
        if (frame === 0) {
          cell(m(5), 3 + bob, BLADE_H); cell(m(6), 4 + bob, BLADE); cell(m(7), 5 + bob, BLADE_E);
          cell(m(5), 4 + bob, BLADE_H); cell(m(6), 5 + bob, BLADE);
          if (bladeIsBroad) {
            cell(m(4), 3 + bob, BLADE_H); cell(m(4), 4 + bob, BLADE_H); // 3-px wide
            cell(m(3), 6 + bob, GUARD); cell(m(4), 6 + bob, GUARD); cell(m(5), 6 + bob, GUARD); cell(m(6), 6 + bob, GUARD); cell(m(7), 6 + bob, GUARD);
          } else {
            cell(m(4), 6 + bob, GUARD); cell(m(5), 6 + bob, GUARD); cell(m(6), 6 + bob, GUARD);
          }
          cell(m(5), 7 + bob, GRIP); cell(m(5), 8 + bob, GRIP);
        } else {
          cell(m(3), 3 + bob, BLADE_H); cell(m(4), 4 + bob, BLADE); cell(m(5), 5 + bob, BLADE_E);
          cell(m(3), 4 + bob, BLADE_H); cell(m(4), 5 + bob, BLADE);
          if (bladeIsBroad) {
            cell(m(2), 3 + bob, BLADE_H); cell(m(2), 4 + bob, BLADE_H); // 3-px wide
            cell(m(1), 6 + bob, GUARD); cell(m(2), 6 + bob, GUARD); cell(m(3), 6 + bob, GUARD); cell(m(4), 6 + bob, GUARD); cell(m(5), 6 + bob, GUARD);
          } else {
            cell(m(2), 6 + bob, GUARD); cell(m(3), 6 + bob, GUARD); cell(m(4), 6 + bob, GUARD);
          }
          cell(m(4), 7 + bob, GRIP); cell(m(4), 8 + bob, GRIP);
        }
      } else if (drawHardcodedSword) {
        if (bladeIsBroad) {
          // Broadsword idle: longer blade (tip 1 row higher), 3-px wide body, 6-px guard
          cell(m(4), 2 + bob, BLADE_H); cell(m(5), 2 + bob, BLADE); // extra tip row
          cell(m(3), 3 + bob, BLADE_H); cell(m(4), 3 + bob, BLADE); cell(m(5), 3 + bob, BLADE_E);
          cell(m(3), 4 + bob, BLADE_H); cell(m(4), 4 + bob, BLADE); cell(m(5), 4 + bob, BLADE_E);
          cell(m(3), 5 + bob, BLADE_H); cell(m(4), 5 + bob, BLADE); cell(m(5), 5 + bob, BLADE_E);
          cell(m(3), 6 + bob, BLADE_H); cell(m(4), 6 + bob, BLADE); // narrows near guard
          cell(m(0), 7 + bob, GUARD); cell(m(1), 7 + bob, GUARD); cell(m(2), 7 + bob, GUARD);
          cell(m(3), 7 + bob, GUARD); cell(m(4), 7 + bob, GUARD); cell(m(5), 7 + bob, GUARD);
          cell(m(4), 8 + bob, GRIP);
          cell(m(4), 9 + bob, GRIP);
          cell(m(4), 10 + bob, GUARD); // Pommel
        } else {
          // Short sword idle: resting at side
          cell(m(3), 3 + bob, BLADE_H); cell(m(4), 4 + bob, BLADE); cell(m(5), 5 + bob, BLADE_E);
          cell(m(3), 4 + bob, BLADE_H); cell(m(4), 5 + bob, BLADE);
          cell(m(3), 5 + bob, BLADE_H); cell(m(4), 6 + bob, BLADE);
          cell(m(2), 7 + bob, GUARD); cell(m(3), 7 + bob, GUARD); cell(m(4), 7 + bob, GUARD); cell(m(5), 7 + bob, GUARD);
          cell(m(4), 8 + bob, GRIP);
          cell(m(4), 9 + bob, GRIP);
          cell(m(4), 10 + bob, GUARD); // Pommel
        }
      }
      // Hair back
      cell(m(9), 0, p.hairDark); cell(m(10), 1, p.hairDark); cell(m(10), 2, p.hairDark);
      // Head
      for (let dy = 1; dy <= 5; dy++) {
        for (let dx = 5; dx <= 9; dx++) cell(m(dx), dy, p.skin);
      }
      // Skin highlight
      cell(m(6), 2, p.skinLight); cell(m(7), 2, p.skinLight);
      // Hair top
      for (let dx = 5; dx <= 9; dx++) cell(m(dx), 0, (dx % 2 === 0) ? p.hairLight : p.hair);
      cell(m(6), 0, p.hairLight);
      // Spike
      cell(m(7), 0, p.hair);
      // Hair front bang
      cell(m(5), 1, p.hair); cell(m(5), 2, p.hair); cell(m(5), 3, p.hairDark);
      // Hair back
      cell(m(9), 1, p.hair); cell(m(9), 2, p.hairDark); cell(m(9), 3, p.hairDark);
      cell(m(9), 4, p.hairDark);
      // Eye
      cell(m(6), 3, 0xFFFFFF); cell(m(7), 3, p.eyeIris);
      if (state === 'charge') cell(m(7), 3, 0xFFD700);
      if (state !== 'hurt') cell(m(7), 3, p.eyeIrisDark);
      cell(m(6), 3, 0xFFFFFF); // white visible
      // Eyebrow
      cell(m(6), 2, p.hairDark); cell(m(7), 2, p.hairDark);
      // Re-draw skin highlight on forehead
      cell(m(7), 1, p.skinLight);
      // Mouth
      cell(m(6), 5, p.skinShadow);
      // Neck
      cell(m(7), 6, p.skinShadow); cell(m(8), 6, p.skinShadow);
      // Body
      for (let dy = 7; dy <= 10; dy++) {
        for (let dx = 6; dx <= 9; dx++) {
          cell(m(dx), dy + bob, dy === 7 ? p.tunicLight : p.tunicMain);
        }
      }
      // Trim
      cell(m(7), 7 + bob, p.trimColor); cell(m(8), 7 + bob, p.trimColor);
      cell(m(7), 8 + bob, p.trimColor); // center seam
      // Belt
      for (let dx = 6; dx <= 9; dx++) cell(m(dx), 10 + bob, p.bootDark);
      cell(m(7), 10 + bob, p.trimColor);
      // Arm
      cell(m(5), 7 + bob, p.tunicDark); cell(m(5), 8 + bob, p.tunicDark);
      cell(m(5), 9 + bob, p.skinShadow);
      // Tunic skirt
      cell(m(6), 11 + bob, p.tunicDark); cell(m(7), 11 + bob, p.tunicDark);
      cell(m(8), 11 + bob, p.tunicDark);
      // Legs
      cell(m(7), 12 + bob, p.pantColor); cell(m(8), 12 + bob, p.pantColor);
      cell(m(7), 13 + walkLeg + bob, p.pantColor); cell(m(8), 13 - walkLeg + bob, p.pantColor);
      cell(m(7), 14 + walkLeg + bob, p.bootColor); cell(m(8), 14 - walkLeg + bob, p.bootColor);
    } else {
      // ===== FRONT VIEW =====
      // Cape peeks behind
      cell(4, 8 + bob, p.capeDark); cell(11, 8 + bob, p.capeDark);
      cell(4, 9 + bob, p.capeDark); cell(11, 9 + bob, p.capeDark);
      cell(4, 10 + bob, p.capeDark); cell(11, 10 + bob, p.capeDark);

      // Sword (front view) - colours driven by palette overrides
      const BLADE = p.bladeMain ?? 0xC0D0E0;
      const BLADE_H = p.bladeHighlight ?? 0xF0F4FF;
      const BLADE_E = p.bladeShadow ?? 0x90A8C0;
      const GUARD = p.guardColor ?? 0xE8C030;
      const GRIP = p.gripColor ?? 0x5D4037;
      const bladeIsBroad = p.bladeStyle === 'broad';
      if (drawHardcodedSword && atkFrame >= 0 && comboStep === 0) {
        // ===== COMBO STEP 0: left slash (original) =====
        if (atkFrame === 0) {
          cell(5, 0 + bob, BLADE_H); cell(6, 0 + bob, BLADE); cell(7, 0 + bob, BLADE_E);
          cell(5, 1 + bob, BLADE_H); cell(6, 1 + bob, BLADE);
          if (bladeIsBroad) {
            cell(4, 0 + bob, BLADE_H);
            cell(6, 0 + bob, GUARD); cell(7, 0 + bob, GUARD); cell(8, 0 + bob, GUARD); cell(9, 0 + bob, GUARD);
          } else {
            cell(8, 0 + bob, GUARD); cell(7, 0 + bob, GUARD);
          }
          cell(7, 1 + bob, GRIP);
        } else if (atkFrame === 1) {
          cell(1, 3 + bob, BLADE_H); cell(2, 4 + bob, BLADE); cell(3, 5 + bob, BLADE_E);
          cell(2, 3 + bob, BLADE_H); cell(3, 4 + bob, BLADE);
          if (bladeIsBroad) {
            cell(0, 3 + bob, BLADE_H);
            cell(2, 6 + bob, GUARD); cell(3, 6 + bob, GUARD); cell(4, 6 + bob, GUARD); cell(5, 6 + bob, GUARD);
          } else {
            cell(4, 6 + bob, GUARD); cell(3, 6 + bob, GUARD);
          }
          cell(3, 7 + bob, GRIP);
        } else {
          cell(1, 9 + bob, BLADE_H); cell(2, 10 + bob, BLADE); cell(3, 11 + bob, BLADE_E);
          cell(2, 9 + bob, BLADE_H); cell(3, 10 + bob, BLADE);
          if (bladeIsBroad) {
            cell(0, 9 + bob, BLADE_H);
            cell(2, 12 + bob, GUARD); cell(3, 12 + bob, GUARD); cell(4, 12 + bob, GUARD); cell(5, 12 + bob, GUARD);
          } else {
            cell(4, 12 + bob, GUARD); cell(3, 12 + bob, GUARD);
          }
          cell(3, 13 + bob, GRIP);
        }
      } else if (drawHardcodedSword && atkFrame >= 0 && comboStep === 1) {
        // ===== COMBO STEP 1: backhand return â€” right-to-left (mirrored from step 0) =====
        if (atkFrame === 0) {
          // Start from low-left (mirror of step 0 follow-through)
          cell(1, 9 + bob, BLADE_H); cell(2, 10 + bob, BLADE); cell(3, 11 + bob, BLADE_E);
          cell(2, 9 + bob, BLADE_H); cell(3, 10 + bob, BLADE);
          if (bladeIsBroad) {
            cell(0, 9 + bob, BLADE_H);
            cell(2, 12 + bob, GUARD); cell(3, 12 + bob, GUARD); cell(4, 12 + bob, GUARD); cell(5, 12 + bob, GUARD);
          } else {
            cell(4, 12 + bob, GUARD); cell(3, 12 + bob, GUARD);
          }
          cell(3, 13 + bob, GRIP);
        } else if (atkFrame === 1) {
          // Mid-backhand: blade crossing to the right side
          cell(12, 4 + bob, BLADE_H); cell(11, 5 + bob, BLADE); cell(10, 6 + bob, BLADE_E);
          cell(11, 4 + bob, BLADE_H); cell(10, 5 + bob, BLADE);
          if (bladeIsBroad) {
            cell(13, 4 + bob, BLADE_H);
            cell(10, 7 + bob, GUARD); cell(11, 7 + bob, GUARD); cell(12, 7 + bob, GUARD); cell(13, 7 + bob, GUARD);
          } else {
            cell(11, 7 + bob, GUARD); cell(10, 7 + bob, GUARD);
          }
          cell(10, 8 + bob, GRIP);
        } else {
          // Follow-through: swept high-right
          cell(11, 0 + bob, BLADE_H); cell(10, 1 + bob, BLADE); cell(9, 2 + bob, BLADE_E);
          cell(10, 0 + bob, BLADE_H); cell(9, 1 + bob, BLADE);
          if (bladeIsBroad) {
            cell(12, 0 + bob, BLADE_H);
            cell(8, 2 + bob, GUARD); cell(9, 2 + bob, GUARD); cell(10, 2 + bob, GUARD); cell(11, 2 + bob, GUARD);
          } else {
            cell(9, 2 + bob, GUARD); cell(10, 2 + bob, GUARD);
          }
          cell(9, 3 + bob, GRIP);
        }
      } else if (drawHardcodedSword && atkFrame >= 0 && comboStep === 2) {
        // ===== COMBO STEP 2: overhead slam â€” straight down =====
        if (atkFrame === 0) {
          // Wind-up: blade raised high overhead center
          cell(7, -1 + bob, BLADE_H); cell(7, 0 + bob, BLADE); cell(8, -1 + bob, BLADE_E);
          cell(8, 0 + bob, BLADE_H); cell(7, 1 + bob, BLADE);
          if (bladeIsBroad) {
            cell(6, -1 + bob, BLADE_H); cell(6, 0 + bob, BLADE_H);
            cell(5, 2 + bob, GUARD); cell(6, 2 + bob, GUARD); cell(7, 2 + bob, GUARD); cell(8, 2 + bob, GUARD); cell(9, 2 + bob, GUARD);
          } else {
            cell(6, 2 + bob, GUARD); cell(7, 2 + bob, GUARD); cell(8, 2 + bob, GUARD);
          }
          cell(7, 3 + bob, GRIP);
        } else if (atkFrame === 1) {
          // Slam: blade straight down center
          cell(7, 4 + bob, BLADE_H); cell(7, 5 + bob, BLADE); cell(7, 6 + bob, BLADE_E);
          cell(8, 4 + bob, BLADE_H); cell(8, 5 + bob, BLADE);
          if (bladeIsBroad) {
            cell(6, 4 + bob, BLADE_H); cell(6, 5 + bob, BLADE_H);
            cell(5, 7 + bob, GUARD); cell(6, 7 + bob, GUARD); cell(7, 7 + bob, GUARD); cell(8, 7 + bob, GUARD); cell(9, 7 + bob, GUARD);
          } else {
            cell(7, 7 + bob, GUARD); cell(8, 7 + bob, GUARD);
          }
          cell(7, 8 + bob, GRIP);
        } else {
          // Planted: embedded low
          cell(7, 10 + bob, BLADE_H); cell(7, 11 + bob, BLADE); cell(7, 12 + bob, BLADE_E);
          cell(8, 10 + bob, BLADE_H); cell(8, 11 + bob, BLADE);
          if (bladeIsBroad) {
            cell(6, 10 + bob, BLADE_H); cell(6, 11 + bob, BLADE_H);
            cell(5, 13 + bob, GUARD); cell(6, 13 + bob, GUARD); cell(7, 13 + bob, GUARD); cell(8, 13 + bob, GUARD); cell(9, 13 + bob, GUARD);
          } else {
            cell(7, 13 + bob, GUARD); cell(8, 13 + bob, GUARD);
          }
          cell(7, 14 + bob, GRIP);
        }
      } else if (drawHardcodedSword && isBlock) {
        // Block: sword drawn high across the body for a strong readable guard silhouette
        cell(3, 1 + bob, BLADE_H); cell(4, 2 + bob, BLADE); cell(5, 3 + bob, BLADE_E);
        cell(3, 2 + bob, BLADE_H); cell(4, 3 + bob, BLADE);
        cell(3, 3 + bob, BLADE_H); cell(4, 4 + bob, BLADE);
        if (bladeIsBroad) {
          cell(2, 1 + bob, BLADE_H); cell(2, 2 + bob, BLADE_H); cell(2, 3 + bob, BLADE_H); // 3-px wide
          cell(1, 5 + bob, GUARD); cell(2, 5 + bob, GUARD); cell(3, 5 + bob, GUARD); cell(4, 5 + bob, GUARD); cell(5, 5 + bob, GUARD); cell(6, 5 + bob, GUARD);
        } else {
          cell(2, 5 + bob, GUARD); cell(3, 5 + bob, GUARD); cell(4, 5 + bob, GUARD); cell(5, 5 + bob, GUARD);
        }
        cell(4, 6 + bob, GRIP);
        cell(4, 7 + bob, GRIP);
        cell(4, 8 + bob, GRIP);
        cell(4, 9 + bob, GUARD);
      } else if (drawHardcodedSword && state === 'charge') {
        if (frame === 0) {
          cell(2, 4 + bob, BLADE_H); cell(3, 5 + bob, BLADE); cell(4, 6 + bob, BLADE_E);
          cell(2, 5 + bob, BLADE_H); cell(3, 6 + bob, BLADE);
          cell(2, 6 + bob, BLADE_H); cell(3, 7 + bob, BLADE);
          if (bladeIsBroad) {
            cell(1, 4 + bob, BLADE_H); cell(1, 5 + bob, BLADE_H); cell(1, 6 + bob, BLADE_H); // 3-px wide
            cell(0, 8 + bob, GUARD); cell(1, 8 + bob, GUARD); cell(2, 8 + bob, GUARD); cell(3, 8 + bob, GUARD); cell(4, 8 + bob, GUARD); cell(5, 8 + bob, GUARD);
          } else {
            cell(1, 8 + bob, GUARD); cell(2, 8 + bob, GUARD); cell(3, 8 + bob, GUARD); cell(4, 8 + bob, GUARD);
          }
          cell(3, 9 + bob, GRIP); cell(3, 10 + bob, GRIP);
        } else {
          cell(2, 2 + bob, BLADE_H); cell(3, 3 + bob, BLADE); cell(4, 4 + bob, BLADE_E);
          cell(2, 3 + bob, BLADE_H); cell(3, 4 + bob, BLADE);
          cell(2, 4 + bob, BLADE_H); cell(3, 5 + bob, BLADE);
          if (bladeIsBroad) {
            cell(1, 2 + bob, BLADE_H); cell(1, 3 + bob, BLADE_H); cell(1, 4 + bob, BLADE_H); // 3-px wide
            cell(0, 6 + bob, GUARD); cell(1, 6 + bob, GUARD); cell(2, 6 + bob, GUARD); cell(3, 6 + bob, GUARD); cell(4, 6 + bob, GUARD); cell(5, 6 + bob, GUARD);
          } else {
            cell(1, 6 + bob, GUARD); cell(2, 6 + bob, GUARD); cell(3, 6 + bob, GUARD); cell(4, 6 + bob, GUARD);
          }
          cell(3, 7 + bob, GRIP); cell(3, 8 + bob, GRIP);
        }
      } else if (drawHardcodedSword) {
        if (bladeIsBroad) {
          // Broadsword idle: longer blade (tip 1 row higher), 3-px wide, 6-px guard
          cell(2, 3 + bob, BLADE_H); cell(3, 4 + bob, BLADE); cell(4, 5 + bob, BLADE_E); // extra tip row
          cell(1, 4 + bob, BLADE_H); cell(2, 4 + bob, BLADE_H); cell(3, 5 + bob, BLADE); cell(4, 6 + bob, BLADE_E);
          cell(1, 5 + bob, BLADE_H); cell(2, 5 + bob, BLADE_H); cell(3, 6 + bob, BLADE);
          cell(2, 6 + bob, BLADE_H); cell(3, 7 + bob, BLADE);
          cell(0, 8 + bob, GUARD); cell(1, 8 + bob, GUARD); cell(2, 8 + bob, GUARD);
          cell(3, 8 + bob, GUARD); cell(4, 8 + bob, GUARD); cell(5, 8 + bob, GUARD);
          cell(3, 9 + bob, GRIP);
          cell(3, 10 + bob, GRIP);
          cell(3, 11 + bob, GUARD); // Pommel
        } else {
          // Short sword idle: resting at left side
          cell(2, 4 + bob, BLADE_H); cell(3, 5 + bob, BLADE); cell(4, 6 + bob, BLADE_E);
          cell(2, 5 + bob, BLADE_H); cell(3, 6 + bob, BLADE);
          cell(2, 6 + bob, BLADE_H); cell(3, 7 + bob, BLADE);
          cell(1, 8 + bob, GUARD); cell(2, 8 + bob, GUARD); cell(3, 8 + bob, GUARD); cell(4, 8 + bob, GUARD);
          cell(3, 9 + bob, GRIP);
          cell(3, 10 + bob, GRIP);
          cell(3, 11 + bob, GUARD); // Pommel
        }
      }

      // Hair (top rows)
      for (let dx = 5; dx <= 10; dx++) cell(dx, 0, p.hair);
      cell(6, 0, p.hairLight); cell(8, 0, p.hairLight);
      // Spikes
      cell(6, 0, p.hairLight); cell(9, 0, p.hair);
      // Hair volume row 1
      for (let dx = 4; dx <= 11; dx++) cell(dx, 1, (dx % 3 === 0) ? p.hairLight : p.hair);

      // Face
      for (let dy = 2; dy <= 5; dy++) {
        const inset = dy === 2 ? 1 : 0;
        for (let dx = 5 + inset; dx <= 10 - inset; dx++) {
          cell(dx, dy, p.skin);
        }
      }
      // Skin highlight
      cell(6, 2, p.skinLight); cell(7, 2, p.skinLight); cell(8, 2, p.skinLight);
      // Hair sides
      cell(4, 2, p.hair); cell(11, 2, p.hair);
      cell(4, 3, p.hairDark); cell(11, 3, p.hairDark);
      cell(4, 4, p.hairDark); cell(11, 4, p.hairDark);

      // Eyes (row 3)
      cell(6, 3, 0xFFFFFF); cell(7, 3, state === 'charge' ? 0xFFD700 : p.eyeIris);
      cell(9, 3, state === 'charge' ? 0xFFD700 : p.eyeIris); cell(8, 3, 0xFFFFFF);
      // Pupils
      if (state !== 'hurt') {
        cell(7, 3, p.eyeIrisDark);
        cell(9, 3, p.eyeIrisDark);
      }
      // Re-draw whites to be visible
      cell(6, 3, 0xFFFFFF); cell(10, 3, 0xFFFFFF);

      // Eyebrows (row 2, over skin)
      cell(6, 2, p.hairDark); cell(7, 2, p.hairDark);
      cell(9, 2, p.hairDark); cell(10, 2, p.hairDark);

      // Nose
      cell(8, 4, p.skinShadow);

      // Mouth - stoic firm line, no open mouth
      cell(7, 5, p.skinShadow); cell(8, 5, p.skinShadow);

      // Neck
      cell(7, 6, p.skinShadow); cell(8, 6, p.skinShadow);

      // Body / Tunic
      for (let dx = 5; dx <= 10; dx++) {
        cell(dx, 7 + bob, p.tunicLight);
        cell(dx, 8 + bob, p.tunicMain);
        cell(dx, 9 + bob, p.tunicMain);
      }
      // Trim
      cell(7, 7 + bob, p.trimColor); cell(8, 7 + bob, p.trimColor);
      cell(7, 8 + bob, p.trimColor); cell(8, 8 + bob, p.trimColor);
      // Arms
      cell(4, 7 + bob, p.tunicDark); cell(4, 8 + bob, p.tunicDark); cell(4, 9 + bob, p.skinShadow);
      cell(11, 7 + bob, p.tunicDark); cell(11, 8 + bob, p.tunicDark); cell(11, 9 + bob, p.skinShadow);
      if (isBlock) {
        cell(5, 7 + bob, p.tunicDark); cell(5, 8 + bob, p.tunicDark);
        cell(10, 7 + bob, p.tunicDark); cell(10, 8 + bob, p.tunicDark);
        cell(5, 9 + bob, p.skinShadow);
      }
      // Belt
      for (let dx = 5; dx <= 10; dx++) cell(dx, 10 + bob, p.bootDark);
      cell(7, 10 + bob, p.trimColor); cell(8, 10 + bob, p.trimColor);
      // Tunic skirt
      for (let dx = 5; dx <= 10; dx++) cell(dx, 11 + bob, p.tunicDark);

      // Legs
      const lo = walkLeg;
      cell(6, 12 + bob, p.pantColor); cell(7, 12 + bob, p.pantColor);
      cell(6, 13 + lo + bob, p.pantColor); cell(7, 13 + lo + bob, p.pantColor);
      cell(6, 14 + lo + bob, p.bootColor); cell(7, 14 + lo + bob, p.bootColor);
      cell(8, 12 + bob, p.pantColor); cell(9, 12 + bob, p.pantColor);
      cell(8, 13 - lo + bob, p.pantColor); cell(9, 13 - lo + bob, p.pantColor);
      cell(8, 14 - lo + bob, p.bootColor); cell(9, 14 - lo + bob, p.bootColor);
      // Boot trim
      cell(6, 14 + lo + bob, p.bootDark); cell(9, 14 - lo + bob, p.bootDark);
    }

    // Per-pixel highlight/shadow pass
    const imgData = ctx.getImageData(0, 0, W, H);
    for (let y = 0; y < H; y += G) {
      for (let x = 0; x < W; x += G) {
        const i = (y * W + x) * 4;
        if (imgData.data[i + 3] > 0) {
          // Top-left highlight
          ctx.fillStyle = 'rgba(255,255,255,0.12)';
          ctx.fillRect(x, y, 1, 1);
          // Bottom-right shadow
          ctx.fillStyle = 'rgba(0,0,0,0.1)';
          ctx.fillRect(x + G - 1, y + G - 1, 1, 1);
        }
      }
    }

    // Composite the weapon icon onto the character canvas so it matches the inventory UI exactly.
    // cx/cy = the CHARACTER's grip/hand pixel position (derived from hardcoded sword cells).
    // The icon is drawn with its grip area anchored at (cx, cy) then rotated.
    if (weaponCanvas && !bladeOnly) {
      const bobPx = bob * G;
      interface WPose { cx: number; cy: number; angleDeg: number; scale: number }
      let pose: WPose | null = null;

      // Weapon icons are 32Ã-32 (8 design-pixels Ã- cellSize 4).  Scale 1.0 = native res.
      // Grip anchor: ~(0.25, 0.81) of icon â€” averaged between sword grip at design (1.5,6.5)
      // and broadsword grip at (2.5,6.5).  Max per-weapon error â‰ˆ 2 px (half a cell).
      //
      // angleDeg = desired sword axis minus icon natural axis (~-60Â° from grip to tip).
      // Mirror: left cx = W - right cx  (m(n) = 15-n â†” n symmetry â†’ pixel symmetry at W/2).
      const AX = 0.25;
      const AY = 0.8125;

      if (isSide) {
        const cy0 = bobPx;
        if (weaponType === 'scythe') {
          // ═══════════════════════════════════════════════════════════════════
          // SCYTHE-SPECIFIC POSE TABLE
          // All positions tuned for weaponScale=1.3 (icon 41.6×41.6 px on canvas).
          // At S=1.3: A=10.4, B=33.8 - blade tip: cx+(-10.4cosθ+33.8sinθ), cy+(-10.4sinθ−33.8cosθ)
          // Canvas 64×80 px.  Every pose verified: tip AND handle-tail stay inside bounds.
          //
          //  Combo 0 - Rising arc (forward-sweep right to upper-left follow-through)
          //    f0 blade (40,14) → f1 blade (14,13) → f2 blade (3,30)
          //  Combo 1 - Hook pull-through (blade pulled left, scoops upward-right)
          //    f0 blade (4,74) → f1 blade (2,54) → f2 blade (2,20)
          //  Combo 2 - Overhead slam (blade upper-right, crushes diagonally down)
          //    f0 blade (5,2) → f1 blade (6,18) → f2 blade (30,21)
          //  Carry: blade at (11,48) trailing behind; Charge: raised overhead in 3 steps
          // ═══════════════════════════════════════════════════════════════════
          if (atkFrame >= 0 && comboStep === 0) {
            // Rising arc - blade forward at body-right, sweeps through to upper-left
            if (atkFrame === 0)      pose = { cx: 32, cy: 52 + cy0, angleDeg:  30, scale: 1.0 };
            else if (atkFrame === 1) pose = { cx: 30, cy: 42 + cy0, angleDeg: -10, scale: 1.0 };
            else                     pose = { cx: 38, cy: 32 + cy0, angleDeg: -70, scale: 1.0 };
          } else if (atkFrame >= 0 && comboStep === 1) {
            // Hook pull-through - blade yanked left/behind, hooks up to the right
            if (atkFrame === 0)      pose = { cx: 28, cy: 48 + cy0, angleDeg: -120, scale: 1.0 };
            else if (atkFrame === 1) pose = { cx: 36, cy: 44 + cy0, angleDeg:  -90, scale: 1.0 };
            else                     pose = { cx: 36, cy: 28 + cy0, angleDeg:  -60, scale: 1.0 };
          } else if (atkFrame >= 0 && comboStep === 2) {
            // Overhead slam - scythe loaded upper-right, crashes diagonally down
            if (atkFrame === 0)      pose = { cx: 36, cy: 18 + cy0, angleDeg: -45, scale: 1.0 };
            else if (atkFrame === 1) pose = { cx: 30, cy: 44 + cy0, angleDeg: -25, scale: 1.0 };
            else                     pose = { cx: 34, cy: 56 + cy0, angleDeg:  10, scale: 1.0 };
          } else if (isBlock) {
            // Horizontal guard: scythe held parallel to body, blade to the left
            pose = { cx: 40, cy: 38 + cy0, angleDeg: -75, scale: 1.0 };
          } else if (state === 'charge') {
            // Three-frame overhead wind-up (verified in-bounds at S=1.3):
            //  f0 - ready:    blade (9,46) mid-body trailing
            //  f1 - rising:   blade (6,20) at head level
            //  f2 - overhead: blade (5,6)  fully raised
            if (frame === 0)      pose = { cx: 44, cy: 44 + cy0, angleDeg: -75, scale: 1.0 };
            else if (frame === 1) pose = { cx: 40, cy: 28 + cy0, angleDeg: -60, scale: 1.0 };
            else                  pose = { cx: 38, cy: 24 + cy0, angleDeg: -50, scale: 1.0 };
          } else {
            // Idle / walk carry - blade trails behind at hip level (cx=40 keeps
            // the blade tip at x≈11 right-facing, well within the left canvas edge at S=1.3)
            pose = { cx: 40, cy: 52 + cy0, angleDeg: -65, scale: 1.0 };
          }
        } else {
          // ── DEFAULT (sword / broadsword) pose table ──────────────────────
          if (atkFrame >= 0 && comboStep === 0) {
            if (atkFrame === 0)      pose = { cx: 34, cy: 16 + cy0, angleDeg: -46, scale: 1.0 };
            else if (atkFrame === 1) pose = { cx: 50, cy: 26 + cy0, angleDeg: -16, scale: 1.0 };
            else                     pose = { cx: 54, cy: 46 + cy0, angleDeg: -16, scale: 1.0 };
          } else if (atkFrame >= 0 && comboStep === 1) {
            // Backhand return: blade starts low, sweeps high on opposite side
            if (atkFrame === 0)      pose = { cx: 12, cy: 46 + cy0, angleDeg: 16, scale: 1.0 };
            else if (atkFrame === 1) pose = { cx: 42, cy: 32 + cy0, angleDeg: 40, scale: 1.0 };
            else                     pose = { cx: 50, cy: 14 + cy0, angleDeg: 50, scale: 1.0 };
          } else if (atkFrame >= 0 && comboStep === 2) {
            // Overhead slam: vertical trajectory
            if (atkFrame === 0)      pose = { cx: 32, cy:  8 + cy0, angleDeg: -90, scale: 1.0 };
            else if (atkFrame === 1) pose = { cx: 24, cy: 28 + cy0, angleDeg: -80, scale: 1.0 };
            else                     pose = { cx: 20, cy: 52 + cy0, angleDeg: -75, scale: 1.0 };
          } else if (isBlock) {
            pose = { cx: 42, cy: 26 + cy0 + weaponRestYShift, angleDeg: -21, scale: 1.0 };
          } else if (state === 'charge') {
            if (frame === 0)       pose = { cx: 42, cy: 32 + cy0 + weaponRestYShift, angleDeg: -30, scale: 1.0 };
            else                   pose = { cx: 46, cy: 32 + cy0 + weaponRestYShift, angleDeg: -17, scale: 1.0 };
          } else {
            // Idle / walk rest pose. weaponRestYShift pushes the grip anchor down so long-bladed
            // weapons (e.g. scythe) don't overlap the character's face when held at the side.
            pose = { cx: 46, cy: 36 + cy0 + weaponRestYShift, angleDeg: -20, scale: 1.0 };
          }
        }
      } else if (!isUp) {
        const cy0 = bobPx;
        if (atkFrame >= 0 && comboStep === 0) {
          if (atkFrame === 0)      pose = { cx: 30, cy:  6 + cy0, angleDeg: -93, scale: 1.0 };
          else if (atkFrame === 1) pose = { cx: 14, cy: 30 + cy0, angleDeg: -57, scale: 1.0 };
          else                     pose = { cx: 14, cy: 54 + cy0, angleDeg: -57, scale: 1.0 };
        } else if (atkFrame >= 0 && comboStep === 1) {
          // Backhand: blade from right side sweeping to left
          if (atkFrame === 0)      pose = { cx: 14, cy: 54 + cy0, angleDeg: -57, scale: 1.0 };
          else if (atkFrame === 1) pose = { cx: 50, cy: 30 + cy0, angleDeg: -123, scale: 1.0 };
          else                     pose = { cx: 44, cy:  8 + cy0, angleDeg: -110, scale: 1.0 };
        } else if (atkFrame >= 0 && comboStep === 2) {
          // Overhead slam: centered vertical
          if (atkFrame === 0)      pose = { cx: 32, cy:  4 + cy0, angleDeg: -90, scale: 1.0 };
          else if (atkFrame === 1) pose = { cx: 32, cy: 28 + cy0, angleDeg: -90, scale: 1.0 };
          else                     pose = { cx: 32, cy: 56 + cy0, angleDeg: -90, scale: 1.0 };
        } else if (isBlock) {
          pose = { cx: 18, cy: 30 + cy0 + weaponRestYShift, angleDeg: -39, scale: 1.0 };
        } else if (state === 'charge') {
          if (weaponType === 'scythe') {
            // Front-facing overhead wind-up - verified in-bounds at S=1.3:
            //  f0: cx=30 (was 52) prevents tail_x from clipping right edge
            //  f1: cx=38 (was 44) same reason; cy stays mid-canvas
            //  f2: cx=36, cy=24 (was cy=16) prevents tail_y clipping top
            if (frame === 0)      pose = { cx: 30, cy: 48 + cy0, angleDeg: -30, scale: 1.0 };
            else if (frame === 1) pose = { cx: 38, cy: 28 + cy0, angleDeg: -50, scale: 1.0 };
            else                  pose = { cx: 36, cy: 24 + cy0, angleDeg: -60, scale: 1.0 };
          } else {
            if (frame === 0)       pose = { cx: 14, cy: 40 + cy0 + weaponRestYShift, angleDeg: -40, scale: 1.0 };
            else                   pose = { cx: 14, cy: 32 + cy0 + weaponRestYShift, angleDeg: -40, scale: 1.0 };
          }
        } else {
          pose = { cx: 14, cy: 40 + cy0 + weaponRestYShift, angleDeg: -40, scale: 1.0 };
        }
      }

      // Front-facing (!isUp) scythe override - default sword table uses cx=14 which puts the
      // S=1.3 blade tip at x≈-21 (off canvas left). Override every non-charge state here.
      // Charge is already handled by the scythe-specific branch inside the !isUp block above.
      if (!isUp && weaponType === 'scythe' && state !== 'charge') {
        const cy0 = bobPx;
        if (atkFrame >= 0 && comboStep === 0) {
          // Rising arc - blade forward-right → horizontal sweep → upper-left follow-through
          if (atkFrame === 0)      pose = { cx: 40, cy: 52 + cy0, angleDeg:  30, scale: 1.0 };
          else if (atkFrame === 1) pose = { cx: 28, cy: 44 + cy0, angleDeg: -20, scale: 1.0 };
          else                     pose = { cx: 38, cy: 36 + cy0, angleDeg: -65, scale: 1.0 };
        } else if (atkFrame >= 0 && comboStep === 1) {
          // Hook pull-through
          if (atkFrame === 0)      pose = { cx: 28, cy: 52 + cy0, angleDeg: -120, scale: 1.0 };
          else if (atkFrame === 1) pose = { cx: 36, cy: 44 + cy0, angleDeg:  -90, scale: 1.0 };
          else                     pose = { cx: 36, cy: 32 + cy0, angleDeg:  -60, scale: 1.0 };
        } else if (atkFrame >= 0 && comboStep === 2) {
          // Overhead slam
          if (atkFrame === 0)      pose = { cx: 32, cy: 16 + cy0, angleDeg: -45, scale: 1.0 };
          else if (atkFrame === 1) pose = { cx: 30, cy: 44 + cy0, angleDeg: -25, scale: 1.0 };
          else                     pose = { cx: 34, cy: 56 + cy0, angleDeg:  10, scale: 1.0 };
        } else if (isBlock) {
          // Steep angle - at face-level (y≈20) the shaft is at x≈67, off-canvas right → face clear
          pose = { cx: 44, cy: 38 + cy0, angleDeg: -75, scale: 1.0 };
        } else {
          // Idle / walk - scythe held down-right at hip, blade hanging to lower-left.
          // At θ=-75°, cx=44: shaft exits the right edge before reaching face height,
          // so the blade trails below the body and the face is fully unobstructed.
          pose = { cx: 44, cy: 52 + cy0, angleDeg: -75, scale: 1.0 };
        }
      }

      // Up-facing (back of head) - full pose table for all weapon types
      if (isUp) {
        const cy0 = bobPx;
        if (weaponType === 'scythe') {
          // ── SCYTHE up-facing ──────────────────────────────────────────────
          if (atkFrame >= 0 && comboStep === 0) {
            // Rising arc (mirrors isSide combo 0, verified in-bounds at S=1.3)
            if (atkFrame === 0)      pose = { cx: 32, cy: 52 + cy0, angleDeg:  30, scale: 1.0 };
            else if (atkFrame === 1) pose = { cx: 30, cy: 42 + cy0, angleDeg: -10, scale: 1.0 };
            else                     pose = { cx: 38, cy: 32 + cy0, angleDeg: -70, scale: 1.0 };
          } else if (atkFrame >= 0 && comboStep === 1) {
            // Hook pull-through (mirrors isSide combo 1)
            if (atkFrame === 0)      pose = { cx: 28, cy: 48 + cy0, angleDeg: -120, scale: 1.0 };
            else if (atkFrame === 1) pose = { cx: 36, cy: 44 + cy0, angleDeg:  -90, scale: 1.0 };
            else                     pose = { cx: 36, cy: 28 + cy0, angleDeg:  -60, scale: 1.0 };
          } else if (atkFrame >= 0 && comboStep === 2) {
            // Overhead slam (mirrors isSide combo 2)
            if (atkFrame === 0)      pose = { cx: 36, cy: 18 + cy0, angleDeg: -45, scale: 1.0 };
            else if (atkFrame === 1) pose = { cx: 30, cy: 44 + cy0, angleDeg: -25, scale: 1.0 };
            else                     pose = { cx: 34, cy: 56 + cy0, angleDeg:  10, scale: 1.0 };
          } else if (isBlock) {
            pose = { cx: 40, cy: 38 + cy0, angleDeg: -75, scale: 1.0 };
          } else if (state === 'charge') {
            // Overhead wind-up above the back of the head (verified in-bounds at S=1.3)
            if (frame === 0)      pose = { cx: 44, cy: 44 + cy0, angleDeg: -75, scale: 1.0 };
            else if (frame === 1) pose = { cx: 40, cy: 28 + cy0, angleDeg: -60, scale: 1.0 };
            else                  pose = { cx: 38, cy: 24 + cy0, angleDeg: -50, scale: 1.0 };
          } else {
            // Idle/walk carry - cx=40 keeps blade tip inside left edge at S=1.3
            pose = { cx: 40, cy: 52 + cy0, angleDeg: -65, scale: 1.0 };
          }
        } else {
          // ── DEFAULT (sword / broadsword) up-facing ────────────────────────
          // Mirrors the front-facing (!isUp) table; the back-of-head body layout
          // shares the same canvas geometry so the same coordinates read correctly.
          if (atkFrame >= 0 && comboStep === 0) {
            if (atkFrame === 0)      pose = { cx: 30, cy:  6 + cy0, angleDeg: -93, scale: 1.0 };
            else if (atkFrame === 1) pose = { cx: 14, cy: 30 + cy0, angleDeg: -57, scale: 1.0 };
            else                     pose = { cx: 14, cy: 54 + cy0, angleDeg: -57, scale: 1.0 };
          } else if (atkFrame >= 0 && comboStep === 1) {
            if (atkFrame === 0)      pose = { cx: 14, cy: 54 + cy0, angleDeg: -57, scale: 1.0 };
            else if (atkFrame === 1) pose = { cx: 50, cy: 30 + cy0, angleDeg: -123, scale: 1.0 };
            else                     pose = { cx: 44, cy:  8 + cy0, angleDeg: -110, scale: 1.0 };
          } else if (atkFrame >= 0 && comboStep === 2) {
            if (atkFrame === 0)      pose = { cx: 32, cy:  4 + cy0, angleDeg: -90, scale: 1.0 };
            else if (atkFrame === 1) pose = { cx: 32, cy: 28 + cy0, angleDeg: -90, scale: 1.0 };
            else                     pose = { cx: 32, cy: 56 + cy0, angleDeg: -90, scale: 1.0 };
          } else if (isBlock) {
            pose = { cx: 18, cy: 30 + cy0 + weaponRestYShift, angleDeg: -39, scale: 1.0 };
          } else if (state === 'charge') {
            if (frame === 0)       pose = { cx: 14, cy: 40 + cy0 + weaponRestYShift, angleDeg: -40, scale: 1.0 };
            else                   pose = { cx: 14, cy: 32 + cy0 + weaponRestYShift, angleDeg: -40, scale: 1.0 };
          } else {
            pose = { cx: 14, cy: 40 + cy0 + weaponRestYShift, angleDeg: -40, scale: 1.0 };
          }
        }
      }

      if (pose) {
        const S = pose.scale * weaponScale;
        const dw = weaponCanvas.width  * S;
        const dh = weaponCanvas.height * S;
        ctx.save();
        ctx.imageSmoothingEnabled = false;
        if (isLeft) {
          ctx.translate(W - pose.cx, pose.cy);
          ctx.scale(-1, 1);
        } else {
          ctx.translate(pose.cx, pose.cy);
        }
        ctx.rotate(pose.angleDeg * (Math.PI / 180));
        ctx.drawImage(weaponCanvas, -dw * AX, -dh * AY, dw, dh);
        ctx.restore();
      }
    }

    // If bladeOnly, remove all non-blade pixels
    if (bladeOnly) {
      const finalData = ctx.getImageData(0, 0, W, H);
      // Blade colors: BLADE=0xC0D0E0, BLADE_H=0xF0F4FF, BLADE_E=0x90A8C0, GUARD=0xE8C030, GRIP=0x5D4037
      for (let i = 0; i < finalData.data.length; i += 4) {
        const r = finalData.data[i];
        const g = finalData.data[i + 1];
        const b = finalData.data[i + 2];
        const a = finalData.data[i + 3];
        if (a === 0) continue;
        // Check if pixel is blade/sword (silver/white/gold/brown grip)
        const isSilver = r > 140 && g > 150 && b > 160 && Math.abs(r - b) < 60;
        const isGold = r > 200 && g > 150 && b < 80;
        const isGrip = r > 70 && r < 110 && g > 50 && g < 80 && b > 40 && b < 70;
        if (!isSilver && !isGold && !isGrip) {
          finalData.data[i + 3] = 0;
        }
      }
      ctx.putImageData(finalData, 0, 0);
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.magFilter = THREE.NearestFilter;
    texture.minFilter = THREE.NearestFilter;

    if (spriteId) {
      this.textureDataUrls.set(spriteId, canvas.toDataURL());
    }

    return texture;
  }

  /**
   * Olwen the Mountain Hermit - built from scratch, not a chibi palette swap.
   * Distinct silhouette: hunched, hooded, white-bearded, leaning on a gnarled
   * walking staff that breaks the standard chibi proportions on the right side.
   * Bandaged hand (vine wound from the grove) is the silent visual link to
   * Callum's questline.
   */
  createOlwenHermit(spriteId?: string): THREE.Texture {
    const G = 4;
    const W = 16 * G, H = 20 * G;
    const canvas = document.createElement('canvas');
    canvas.width = W; canvas.height = H;
    const ctx = canvas.getContext('2d')!;

    const cell = (gx: number, gy: number, color: number) => {
      ctx.fillStyle = this.hex(color);
      ctx.fillRect(gx * G, gy * G, G, G);
    };

    // Palette - earthen, weathered, deliberately desaturated so he reads as old
    // and out of place next to the brighter villager NPCs.
    const HOOD_D = 0x4A3B2E;  // hood deep shadow
    const HOOD   = 0x6B5440;  // hood main (mossy brown)
    const HOOD_H = 0x8A7158;  // hood highlight
    const SHADOW = 0x1E1812;  // hooded-face shadow
    const SKIN   = 0xC9A87A;  // weathered cheek
    const SKIN_D = 0x8E724A;  // weathered cheek shadow
    const EYE    = 0xE8D9A6;  // pale glint inside hood
    const BEARD  = 0xE8E0D2;  // long white beard
    const BEARD_S = 0xB5AC9A; // beard shadow
    const CLOAK  = 0x5A4A38;  // cloak main
    const CLOAK_H = 0x7C6648; // cloak highlight
    const CLOAK_D = 0x352818; // cloak deep
    const TRIM   = 0x9C6B2A;  // copper/bronze trim around cloak hem
    const ROPE   = 0xC9A66B;  // belt rope
    const BOOT   = 0x3E2A18;  // boots
    const BOOT_H = 0x5C4028;
    const STAFF  = 0x4A2E1A;  // dark gnarled staff
    const STAFF_H = 0x6B442A; // staff highlight
    const KNOT   = 0x2A1808;  // gnarled knots in staff
    const BANDAGE = 0xD9CFB8; // wrapped hand (vine wound)
    const BANDAGE_S = 0xA89E80;

    // ── STAFF (right side, full vertical, breaks chibi silhouette) ──
    // Gnarled top knob at row 1
    cell(13, 1, KNOT); cell(14, 1, STAFF_H);
    cell(13, 2, STAFF_H); cell(14, 2, STAFF);
    cell(13, 3, STAFF); cell(14, 3, STAFF);
    // Long shaft with knots
    for (let dy = 4; dy <= 16; dy++) {
      cell(13, dy, dy === 7 || dy === 12 ? KNOT : STAFF);
      cell(14, dy, dy === 7 || dy === 12 ? STAFF : STAFF_H);
    }
    // Staff base (where it rests on the ground)
    cell(13, 17, STAFF_H); cell(14, 17, STAFF_H);

    // ── HOOD PEAK (drooping, no chibi spiky hair on top) ──
    cell(6, 1, HOOD_D); cell(7, 1, HOOD_D);
    cell(5, 2, HOOD_D); cell(6, 2, HOOD); cell(7, 2, HOOD); cell(8, 2, HOOD_D);
    cell(4, 3, HOOD_D); cell(5, 3, HOOD); cell(6, 3, HOOD_H); cell(7, 3, HOOD_H); cell(8, 3, HOOD); cell(9, 3, HOOD_D);

    // ── HOOD FRAMING FACE (rows 4-7) - deep shadow inside ──
    cell(3, 4, HOOD_D); cell(4, 4, HOOD); cell(5, 4, HOOD_H);
    cell(6, 4, SHADOW); cell(7, 4, SHADOW); cell(8, 4, SHADOW);
    cell(9, 4, HOOD_H); cell(10, 4, HOOD); cell(11, 4, HOOD_D);

    cell(3, 5, HOOD_D); cell(4, 5, HOOD);
    cell(5, 5, SHADOW); cell(6, 5, EYE); cell(7, 5, SHADOW); cell(8, 5, EYE); cell(9, 5, SHADOW);
    cell(10, 5, HOOD); cell(11, 5, HOOD_D);

    cell(3, 6, HOOD_D); cell(4, 6, HOOD); cell(5, 6, SKIN_D);
    cell(6, 6, SKIN); cell(7, 6, SKIN); cell(8, 6, SKIN);
    cell(9, 6, SKIN_D); cell(10, 6, HOOD); cell(11, 6, HOOD_D);

    // Beard begins under nose
    cell(3, 7, HOOD_D); cell(4, 7, HOOD);
    cell(5, 7, BEARD_S); cell(6, 7, BEARD); cell(7, 7, BEARD); cell(8, 7, BEARD); cell(9, 7, BEARD_S);
    cell(10, 7, HOOD); cell(11, 7, HOOD_D);

    // ── LONG BEARD (rows 8-10) - extends down chest, very distinctive ──
    cell(4, 8, HOOD); cell(5, 8, BEARD_S); cell(6, 8, BEARD); cell(7, 8, BEARD);
    cell(8, 8, BEARD); cell(9, 8, BEARD); cell(10, 8, BEARD_S); cell(11, 8, HOOD);

    cell(4, 9, HOOD_D); cell(5, 9, BEARD); cell(6, 9, BEARD); cell(7, 9, BEARD_S);
    cell(8, 9, BEARD_S); cell(9, 9, BEARD); cell(10, 9, BEARD); cell(11, 9, HOOD_D);

    cell(5, 10, BEARD_S); cell(6, 10, BEARD); cell(7, 10, BEARD_S);
    cell(8, 10, BEARD_S); cell(9, 10, BEARD); cell(10, 10, BEARD_S);

    cell(6, 11, BEARD_S); cell(7, 11, BEARD_S); cell(8, 11, BEARD_S); cell(9, 11, BEARD_S);

    // ── HUNCHED SHOULDERS / CLOAK (rows 8-14) - wider, rounder than chibi ──
    cell(2, 9, CLOAK_D); cell(3, 9, CLOAK);
    cell(12, 9, CLOAK); cell(11, 10, CLOAK);

    cell(2, 10, CLOAK_D); cell(3, 10, CLOAK_H); cell(4, 10, CLOAK_H);
    cell(11, 10, CLOAK_H); cell(12, 10, CLOAK);

    // Mid cloak (rows 11-13)
    for (let dy = 11; dy <= 13; dy++) {
      cell(2, dy, CLOAK_D);
      cell(3, dy, CLOAK);
      cell(4, dy, CLOAK_H);
      cell(11, dy, CLOAK_H);
      cell(12, dy, CLOAK);
    }
    // Fill cloak interior (under beard, around it)
    cell(5, 12, CLOAK); cell(10, 12, CLOAK);
    cell(4, 13, CLOAK_H); cell(5, 13, CLOAK); cell(6, 13, CLOAK); cell(7, 13, CLOAK);
    cell(8, 13, CLOAK); cell(9, 13, CLOAK); cell(10, 13, CLOAK); cell(11, 13, CLOAK_H);

    // Belt rope across waist (row 13 trim)
    cell(5, 13, ROPE); cell(6, 13, ROPE); cell(9, 13, ROPE); cell(10, 13, ROPE);

    // ── BANDAGED HAND clutching the staff (left side of staff at row 11-12) ──
    cell(12, 11, BANDAGE); cell(12, 12, BANDAGE_S);
    cell(11, 12, BANDAGE);

    // ── CLOAK SKIRT FLARES (rows 14-16) - wider at bottom, with copper hem trim ──
    cell(2, 14, CLOAK_D); cell(3, 14, CLOAK_H); cell(4, 14, CLOAK);
    cell(5, 14, CLOAK); cell(6, 14, CLOAK); cell(7, 14, CLOAK); cell(8, 14, CLOAK);
    cell(9, 14, CLOAK); cell(10, 14, CLOAK); cell(11, 14, CLOAK); cell(12, 14, CLOAK_H);

    cell(2, 15, CLOAK_D); cell(3, 15, CLOAK); cell(4, 15, CLOAK_H);
    cell(5, 15, CLOAK); cell(6, 15, CLOAK_H); cell(7, 15, CLOAK); cell(8, 15, CLOAK);
    cell(9, 15, CLOAK_H); cell(10, 15, CLOAK); cell(11, 15, CLOAK_H); cell(12, 15, CLOAK_D);

    // Trim along hem (row 16)
    cell(3, 16, TRIM); cell(4, 16, CLOAK_D); cell(5, 16, TRIM);
    cell(6, 16, CLOAK_D); cell(7, 16, TRIM); cell(8, 16, TRIM);
    cell(9, 16, CLOAK_D); cell(10, 16, TRIM); cell(11, 16, CLOAK_D); cell(12, 16, TRIM);

    // ── BOOTS poking out under cloak (row 17) ──
    cell(6, 17, BOOT_H); cell(7, 17, BOOT);
    cell(9, 17, BOOT); cell(10, 17, BOOT_H);
    cell(6, 18, BOOT); cell(7, 18, BOOT);
    cell(9, 18, BOOT); cell(10, 18, BOOT);

    // ── Subtle per-pixel highlight/shadow pass for depth (mirrors other chibis) ──
    const imgData = ctx.getImageData(0, 0, W, H);
    for (let y = 0; y < H; y += G) {
      for (let x = 0; x < W; x += G) {
        const i = (y * W + x) * 4;
        if (imgData.data[i + 3] > 0) {
          ctx.fillStyle = 'rgba(255,255,255,0.10)';
          ctx.fillRect(x, y, 1, 1);
          ctx.fillStyle = 'rgba(0,0,0,0.12)';
          ctx.fillRect(x + G - 1, y + G - 1, 1, 1);
        }
      }
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.magFilter = THREE.NearestFilter;
    texture.minFilter = THREE.NearestFilter;

    if (spriteId) {
      this.textureDataUrls.set(spriteId, canvas.toDataURL());
    }

    return texture;
  }

  createCorruptedGiant(spriteId?: string, isTelegraph = false, isAttack = false): THREE.Texture {
    // Redesigned for maximum readability at field-boss scale:
    // - Head fills the top half of the canvas (wide, no neck)
    // - Eyes are 2×2 cell blocks with a bright violet centre and black socket surround
    // - Corruption veins read clearly against the warm-grey stone
    // - Shoulders span the full 16-cell width at peak
    const G = 4;
    const W = 16 * G, H = 20 * G;
    const canvas = document.createElement('canvas');
    canvas.width = W; canvas.height = H;
    const ctx = canvas.getContext('2d')!;

    const cell = (gx: number, gy: number, color: number) => {
      ctx.fillStyle = this.hex(color);
      ctx.fillRect(gx * G, gy * G, G, G);
    };

    const ST_D  = 0x241A16;
    const ST    = 0x3C2C28;
    const ST_H  = 0x604840;
    const ST_L  = 0x7A6058;
    const ST_HL = 0x9A8070;
    const CRACK = 0x0E0806;
    const BROW  = 0x1A100C;
    const SOCK  = 0x08040A;  // deep eye socket - near-black with purple tint
    const EYE_C = 0xFFDDFF;  // white-violet eye centre (very bright)
    const EYE   = 0xDD55FF;  // vivid violet iris ring
    const EYE_D = 0x9922CC;  // eye shadow edge
    const VEIN  = 0x7B3FA0;
    const VEIN_G = 0xCC6EF0;
    const VEIN_D = 0x3D1A55;

    // Telegraph/attack: veins and eyes pulse brighter
    const VG  = isTelegraph ? 0xFF99FF : isAttack ? 0xFFBBFF : VEIN_G;
    const V   = isTelegraph ? 0xDD44FF : isAttack ? 0xFF44FF : VEIN;
    const EC  = isTelegraph ? 0xFFFFFF : isAttack ? 0xFFFFFF : EYE_C;
    const EI  = isTelegraph ? 0xFF66FF : isAttack ? 0xFF88FF : EYE;

    // ── HEAD - starts at row 0, spans x:2-13 (12 cells wide) ──
    // Crown
    cell(5, 0, ST_D); cell(6, 0, ST_H); cell(7, 0, ST_L); cell(8, 0, ST_L); cell(9, 0, ST_H); cell(10, 0, ST_D);

    // Upper head
    cell(3, 1, ST_D); cell(4, 1, ST); cell(5, 1, ST_H); cell(6, 1, ST_L); cell(7, 1, ST_HL);
    cell(8, 1, ST_HL); cell(9, 1, ST_L); cell(10, 1, ST_H); cell(11, 1, ST); cell(12, 1, ST_D);

    // Forehead - wide, flat crown crack runs down centre
    cell(2, 2, ST_D); cell(3, 2, ST); cell(4, 2, ST_H); cell(5, 2, ST_L); cell(6, 2, ST_HL);
    cell(7, 2, CRACK); cell(8, 2, CRACK);
    cell(9, 2, ST_HL); cell(10, 2, ST_L); cell(11, 2, ST_H); cell(12, 2, ST); cell(13, 2, ST_D);

    // Brow ridge - heavy shadow shelf above eye sockets
    cell(2, 3, ST_D); cell(3, 3, BROW); cell(4, 3, BROW); cell(5, 3, BROW);
    cell(6, 3, SOCK); cell(7, 3, CRACK); cell(8, 3, CRACK); cell(9, 3, SOCK);
    cell(10, 3, BROW); cell(11, 3, BROW); cell(12, 3, BROW); cell(13, 3, ST_D);

    // ── EYES - 2×2 bright blocks, rows 4-5 ──
    // Left socket surround
    cell(2, 4, ST_D); cell(3, 4, SOCK); cell(4, 4, SOCK); cell(5, 4, SOCK);
    // Left eye (bright centre 2×2)
    cell(4, 4, EYE_D); cell(5, 4, EI);
    // Nose bridge
    cell(6, 4, ST_D); cell(7, 4, CRACK); cell(8, 4, CRACK); cell(9, 4, ST_D);
    // Right eye
    cell(10, 4, EI); cell(11, 4, EYE_D);
    // Right socket surround
    cell(11, 4, SOCK); cell(12, 4, SOCK); cell(13, 4, SOCK); cell(13, 4, ST_D);

    // Eye row 2 (lower - bright centre here)
    cell(2, 5, ST_D); cell(3, 5, SOCK); cell(4, 5, EI); cell(5, 5, EC);
    cell(6, 5, ST_D); cell(7, 5, CRACK); cell(8, 5, CRACK); cell(9, 5, ST_D);
    cell(10, 5, EC); cell(11, 5, EI); cell(12, 5, SOCK); cell(13, 5, ST_D);

    // Cheekbones / lower face
    cell(2, 6, ST_D); cell(3, 6, ST); cell(4, 6, ST_H); cell(5, 6, ST_L);
    cell(6, 6, ST_H); cell(7, 6, CRACK); cell(8, 6, CRACK); cell(9, 6, ST_H);
    cell(10, 6, ST_L); cell(11, 6, ST_H); cell(12, 6, ST); cell(13, 6, ST_D);

    // Jaw / chin - blends into shoulder line
    cell(2, 7, ST_D); cell(3, 7, ST_H); cell(4, 7, ST_L); cell(5, 7, ST_H);
    cell(6, 7, ST); cell(7, 7, ST_D); cell(8, 7, ST_D); cell(9, 7, ST);
    cell(10, 7, ST_H); cell(11, 7, ST_L); cell(12, 7, ST_H); cell(13, 7, ST_D);

    // ── SHOULDERS - full 16-cell width at peak ──
    // Row 8: shoulder slab emerges, vein nodes near shoulder tops
    cell(0, 8, ST_D); cell(1, 8, ST); cell(2, 8, ST_H); cell(3, 8, ST_L);
    cell(4, 8, ST_H); cell(5, 8, VEIN_D); cell(6, 8, ST_H); cell(7, 8, ST);
    cell(8, 8, ST); cell(9, 8, ST_H); cell(10, 8, VEIN_D); cell(11, 8, ST_H);
    cell(12, 8, ST_L); cell(13, 8, ST_H); cell(14, 8, ST); cell(15, 8, ST_D);

    // Row 9: peak width, veins glow
    cell(0, 9, ST_D); cell(1, 9, ST_H); cell(2, 9, ST_L); cell(3, 9, ST_H);
    cell(4, 9, ST); cell(5, 9, V); cell(6, 9, ST_H); cell(7, 9, ST_L);
    cell(8, 9, ST_L); cell(9, 9, ST_H); cell(10, 9, V); cell(11, 9, ST);
    cell(12, 9, ST_H); cell(13, 9, ST_L); cell(14, 9, ST_H); cell(15, 9, ST_D);

    // Row 10: shoulders begin to taper, upper arms visible at edges
    cell(0, 10, ST_D); cell(1, 10, ST); cell(2, 10, ST_H);
    cell(3, 10, ST); cell(4, 10, VG); cell(5, 10, ST_H); cell(6, 10, ST_L);
    cell(7, 10, ST_H); cell(8, 10, ST_H); cell(9, 10, ST_L); cell(10, 10, ST_H);
    cell(11, 10, VG); cell(12, 10, ST); cell(13, 10, ST_H); cell(14, 10, ST); cell(15, 10, ST_D);

    // ── TORSO - corruption veins split vertically down the chest ──
    // Row 11
    cell(1, 11, ST_D); cell(2, 11, ST_H); cell(3, 11, ST);
    cell(4, 11, V); cell(5, 11, ST_H); cell(6, 11, ST_L);
    cell(7, 11, CRACK); cell(8, 11, CRACK);
    cell(9, 11, ST_L); cell(10, 11, ST_H); cell(11, 11, V);
    cell(12, 11, ST); cell(13, 11, ST_H); cell(14, 11, ST_D);

    // Arms (hanging beside torso, rows 11-14)
    cell(0, 11, ST_D); cell(0, 12, ST); cell(0, 13, ST_H); cell(0, 14, ST);
    cell(15, 11, ST_D); cell(15, 12, ST); cell(15, 13, ST_H); cell(15, 14, ST);

    // Row 12
    cell(1, 12, ST_D); cell(2, 12, ST); cell(3, 12, ST_H);
    cell(4, 12, VG); cell(5, 12, ST_L); cell(6, 12, ST_H);
    cell(7, 12, ST); cell(8, 12, ST); cell(9, 12, ST_H);
    cell(10, 12, ST_L); cell(11, 12, VG);
    cell(12, 12, ST_H); cell(13, 12, ST); cell(14, 12, ST_D);

    // Row 13
    cell(1, 13, ST_D); cell(2, 13, ST_H); cell(3, 13, ST);
    cell(4, 13, V); cell(5, 13, ST_H); cell(6, 13, ST_L);
    cell(7, 13, VG); cell(8, 13, VG);
    cell(9, 13, ST_L); cell(10, 13, ST_H); cell(11, 13, V);
    cell(12, 13, ST); cell(13, 13, ST_H); cell(14, 13, ST_D);

    // Fists at sides (rows 13-14)
    cell(0, 13, ST_H); cell(1, 14, ST_H); cell(2, 14, ST_L);
    cell(15, 13, ST_H); cell(14, 14, ST_L); cell(13, 14, ST_H);

    // ── WAIST - vein convergence ──
    cell(3, 14, ST_D); cell(4, 14, ST);
    cell(5, 14, VEIN_D); cell(6, 14, V); cell(7, 14, VG); cell(8, 14, VG); cell(9, 14, V); cell(10, 14, VEIN_D);
    cell(11, 14, ST); cell(12, 14, ST_D);

    // ── LEGS - wide, heavy ──
    cell(3, 15, ST_D); cell(4, 15, ST_H); cell(5, 15, ST_L); cell(6, 15, ST_H);
    cell(7, 15, CRACK); cell(8, 15, CRACK);
    cell(9, 15, ST_H); cell(10, 15, ST_L); cell(11, 15, ST_H); cell(12, 15, ST_D);

    cell(3, 16, ST_D); cell(4, 16, ST); cell(5, 16, ST_H); cell(6, 16, ST_L);
    cell(7, 16, VEIN_D); cell(8, 16, VEIN_D);
    cell(9, 16, ST_L); cell(10, 16, ST_H); cell(11, 16, ST); cell(12, 16, ST_D);

    // ── FEET - splayed outward ──
    cell(2, 17, ST_D); cell(3, 17, ST); cell(4, 17, ST_H); cell(5, 17, ST_L); cell(6, 17, ST_H);
    cell(9, 17, ST_H); cell(10, 17, ST_L); cell(11, 17, ST_H); cell(12, 17, ST); cell(13, 17, ST_D);

    cell(2, 18, ST_D); cell(3, 18, ST); cell(4, 18, ST_H);
    cell(11, 18, ST_H); cell(12, 18, ST); cell(13, 18, ST_D);

    // ── Depth pass ──
    const imgData = ctx.getImageData(0, 0, W, H);
    for (let y = 0; y < H; y += G) {
      for (let x = 0; x < W; x += G) {
        const i = (y * W + x) * 4;
        if (imgData.data[i + 3] > 0) {
          ctx.fillStyle = 'rgba(255,255,255,0.08)';
          ctx.fillRect(x, y, 1, 1);
          ctx.fillStyle = 'rgba(0,0,0,0.16)';
          ctx.fillRect(x + G - 1, y + G - 1, 1, 1);
        }
      }
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.magFilter = THREE.NearestFilter;
    texture.minFilter = THREE.NearestFilter;

    if (spriteId) {
      this.textureDataUrls.set(spriteId, canvas.toDataURL());
    }

    return texture;
  }

  createMysteriousMan(spriteId?: string): THREE.Texture {
    // Design intent: tall, perfectly still, face completely absent inside the hood.
    // Void-black with violet seepage along the hem - same corruption palette as the
    // Hollow enemies - so the player feels something is wrong before they speak to him.
    const G = 4;
    const W = 16 * G, H = 20 * G;
    const canvas = document.createElement('canvas');
    canvas.width = W; canvas.height = H;
    const ctx = canvas.getContext('2d')!;

    const cell = (gx: number, gy: number, color: number) => {
      ctx.fillStyle = this.hex(color);
      ctx.fillRect(gx * G, gy * G, G, G);
    };

    // Palette - voidborne, barely-there, with violet corruption seeping up from below
    const VOID    = 0x0A080C;  // deepest black (true void)
    const CLOAK   = 0x161220;  // cloak base - near-black with blue-purple tint
    const CLOAK_H = 0x2A2440;  // cloak subtle highlight
    const CLOAK_D = 0x060408;  // cloak deepest shadow
    const HOOD    = 0x120F1C;  // hood outer
    const HOOD_D  = 0x080610;  // hood deep shadow
    const FACE    = 0x0D0B14;  // near-black inside hood (not pure void - eyes need contrast)
    const EYE     = 0x8A8296;  // dim silver-grey eyes - reads as person, not glowing enemy
    const EYE_D   = 0x4A4458;  // eye shadow
    const VIOLET  = 0x7B3FA0;  // corruption accent (matches Hollow enemies)
    const VIOLET_D = 0x4A1E6A; // corruption shadow
    const VIOLET_G = 0xB06ECC; // corruption glow/sparkle
    const SLEEVE  = 0x1A1628;  // sleeve ends, hands hidden
    const SEAM    = 0x221C34;  // cloak seam lines

    // ── HOOD - tall, upright (not drooping like Olwen), swallows the face entirely ──
    // Peak
    cell(7, 0, HOOD_D); cell(8, 0, HOOD_D);
    cell(6, 1, HOOD_D); cell(7, 1, HOOD); cell(8, 1, HOOD); cell(9, 1, HOOD_D);
    cell(5, 2, HOOD_D); cell(6, 2, HOOD); cell(7, 2, CLOAK_H); cell(8, 2, CLOAK_H); cell(9, 2, HOOD); cell(10, 2, HOOD_D);
    cell(4, 3, HOOD_D); cell(5, 3, HOOD); cell(6, 3, HOOD); cell(7, 3, CLOAK_H);
    cell(8, 3, CLOAK_H); cell(9, 3, HOOD); cell(10, 3, HOOD); cell(11, 3, HOOD_D);

    // Hood sides framing the void-face (rows 4-8)
    cell(3, 4, HOOD_D); cell(4, 4, HOOD); cell(5, 4, HOOD);
    cell(6, 4, FACE); cell(7, 4, FACE); cell(8, 4, FACE); cell(9, 4, FACE);
    cell(10, 4, HOOD); cell(11, 4, HOOD); cell(12, 4, HOOD_D);

    cell(3, 5, HOOD_D); cell(4, 5, HOOD);
    cell(5, 5, FACE); cell(6, 5, EYE_D); cell(7, 5, EYE);
    cell(8, 5, FACE);
    cell(9, 5, EYE); cell(10, 5, EYE_D);
    cell(11, 5, HOOD); cell(12, 5, HOOD_D);

    cell(3, 6, HOOD_D); cell(4, 6, HOOD);
    cell(5, 6, FACE); cell(6, 6, FACE); cell(7, 6, FACE);
    cell(8, 6, FACE); cell(9, 6, FACE); cell(10, 6, FACE);
    cell(11, 6, HOOD); cell(12, 6, HOOD_D);

    cell(3, 7, HOOD_D); cell(4, 7, HOOD); cell(5, 7, HOOD);
    cell(6, 7, FACE); cell(7, 7, FACE); cell(8, 7, FACE); cell(9, 7, FACE);
    cell(10, 7, HOOD); cell(11, 7, HOOD); cell(12, 7, HOOD_D);

    // Hood collar merges into shoulders (row 8)
    cell(3, 8, HOOD_D); cell(4, 8, HOOD); cell(5, 8, HOOD); cell(6, 8, HOOD);
    cell(7, 8, CLOAK_D); cell(8, 8, CLOAK_D);
    cell(9, 8, HOOD); cell(10, 8, HOOD); cell(11, 8, HOOD); cell(12, 8, HOOD_D);

    // ── SHOULDERS - wide and straight (taller posture than Olwen) ──
    cell(2, 9, CLOAK_D); cell(3, 9, CLOAK); cell(4, 9, CLOAK_H);
    cell(5, 9, CLOAK); cell(6, 9, CLOAK); cell(7, 9, SEAM); cell(8, 9, SEAM);
    cell(9, 9, CLOAK); cell(10, 9, CLOAK); cell(11, 9, CLOAK_H); cell(12, 9, CLOAK); cell(13, 9, CLOAK_D);

    cell(2, 10, CLOAK_D); cell(3, 10, CLOAK); cell(4, 10, CLOAK_H);
    cell(5, 10, CLOAK); cell(6, 10, SEAM); cell(7, 10, CLOAK); cell(8, 10, CLOAK);
    cell(9, 10, SEAM); cell(10, 10, CLOAK); cell(11, 10, CLOAK_H); cell(12, 10, CLOAK); cell(13, 10, CLOAK_D);

    // ── BODY - monolithic cloak slab (rows 11-14) no belt, no feature, just presence ──
    for (let dy = 11; dy <= 14; dy++) {
      cell(2, dy, CLOAK_D);
      cell(3, dy, CLOAK);
      cell(4, dy, CLOAK_H);
      cell(5, dy, CLOAK);
      cell(6, dy, dy === 12 ? SEAM : CLOAK);
      cell(7, dy, CLOAK);
      cell(8, dy, CLOAK);
      cell(9, dy, dy === 12 ? SEAM : CLOAK);
      cell(10, dy, CLOAK);
      cell(11, dy, CLOAK_H);
      cell(12, dy, CLOAK);
      cell(13, dy, CLOAK_D);
    }

    // Hidden sleeves - arms not visible, just dark sleeve mouths at sides (rows 12-13)
    cell(2, 12, SLEEVE); cell(2, 13, SLEEVE);
    cell(13, 12, SLEEVE); cell(13, 13, SLEEVE);

    // ── CLOAK SKIRT (rows 15-16) - widens slightly ──
    cell(2, 15, CLOAK_D); cell(3, 15, CLOAK); cell(4, 15, CLOAK_H);
    cell(5, 15, CLOAK); cell(6, 15, CLOAK); cell(7, 15, CLOAK); cell(8, 15, CLOAK);
    cell(9, 15, CLOAK); cell(10, 15, CLOAK); cell(11, 15, CLOAK_H); cell(12, 15, CLOAK); cell(13, 15, CLOAK_D);

    cell(1, 16, CLOAK_D); cell(2, 16, CLOAK_D); cell(3, 16, CLOAK); cell(4, 16, CLOAK_H);
    cell(5, 16, CLOAK); cell(6, 16, CLOAK); cell(7, 16, CLOAK); cell(8, 16, CLOAK);
    cell(9, 16, CLOAK); cell(10, 16, CLOAK); cell(11, 16, CLOAK_H); cell(12, 16, CLOAK);
    cell(13, 16, CLOAK_D); cell(14, 16, CLOAK_D);

    // ── VIOLET CORRUPTION HEM - seeping up from the ground, marks him as Hollow-touched ──
    // Row 17: main corruption band
    cell(2, 17, VIOLET_D); cell(3, 17, VIOLET); cell(4, 17, VIOLET_D);
    cell(5, 17, VIOLET); cell(6, 17, VIOLET_G); cell(7, 17, VIOLET);
    cell(8, 17, VIOLET); cell(9, 17, VIOLET_G); cell(10, 17, VIOLET);
    cell(11, 17, VIOLET_D); cell(12, 17, VIOLET); cell(13, 17, VIOLET_D);

    // Row 18: corruption drips (irregular pattern - not a clean line)
    cell(3, 18, VIOLET_D); cell(5, 18, VIOLET_D); cell(7, 18, VIOLET_D);
    cell(9, 18, VIOLET_D); cell(11, 18, VIOLET_D);

    // Row 19: faint trailing wisps
    cell(4, 19, VOID); cell(6, 19, VOID); cell(10, 19, VOID);

    // ── Subtle depth pass (same as Olwen) ──
    const imgData = ctx.getImageData(0, 0, W, H);
    for (let y = 0; y < H; y += G) {
      for (let x = 0; x < W; x += G) {
        const i = (y * W + x) * 4;
        if (imgData.data[i + 3] > 0) {
          ctx.fillStyle = 'rgba(255,255,255,0.06)';
          ctx.fillRect(x, y, 1, 1);
          ctx.fillStyle = 'rgba(0,0,0,0.18)';
          ctx.fillRect(x + G - 1, y + G - 1, 1, 1);
        }
      }
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.magFilter = THREE.NearestFilter;
    texture.minFilter = THREE.NearestFilter;

    if (spriteId) {
      this.textureDataUrls.set(spriteId, canvas.toDataURL());
    }

    return texture;
  }

  createInjuredSittingChibi(
    palette: {
      hair: number; hairLight: number; hairDark: number;
      skin: number; skinLight: number; skinShadow: number;
      eyeIris: number; eyeIrisDark: number;
      tunicMain: number; tunicLight: number; tunicDark: number;
      trimColor: number; trimLight: number;
      capeMain: number; capeDark: number;
      pantColor: number; pantDark: number;
      bootColor: number; bootDark: number;
    },
    spriteId?: string,
  ): THREE.Texture {
    const G = 4;
    const W = 16 * G, H = 20 * G;
    const canvas = document.createElement('canvas');
    canvas.width = W; canvas.height = H;
    const ctx = canvas.getContext('2d')!;
    const p = palette;

    const cell = (gx: number, gy: number, color: number) => {
      ctx.fillStyle = this.hex(color);
      ctx.fillRect(gx * G, gy * G, G, G);
    };

    const WOOD = 0x8B6914;
    const WOOD_D = 0x6B4E10;
    const WOOD_L = 0xA07828;
    const BAND = 0x555555;
    const BLOOD = 0x8B2020;
    const BLADE = 0xC0D0E0;
    const GUARD_M = 0xE8C030;
    const GRIP = 0x5D4037;

    // --- Crate on right side (character leans against it) ---
    cell(12, 5, WOOD_L); cell(13, 5, WOOD_L); cell(14, 5, WOOD_L);
    for (let dy = 6; dy <= 13; dy++) {
      const isBand = dy === 8 || dy === 11;
      cell(12, dy, isBand ? BAND : WOOD);
      cell(13, dy, isBand ? BAND : WOOD_D);
      cell(14, dy, isBand ? BAND : WOOD);
    }
    cell(12, 7, WOOD_L); cell(14, 10, WOOD_D);

    // --- Cape pooling on ground (left side) ---
    cell(2, 13, p.capeDark); cell(1, 14, p.capeDark);
    cell(2, 14, p.capeMain); cell(1, 15, p.capeDark);

    // --- Dropped sword on the ground (left edge) ---
    cell(0, 12, BLADE); cell(0, 13, BLADE);
    cell(0, 14, GUARD_M); cell(0, 15, GRIP);

    // === CHARACTER (rows 3-15, same head proportions as standing chibi) ===

    // Hair spikes (row 3)
    for (let dx = 5; dx <= 10; dx++) cell(dx, 3, p.hair);
    cell(6, 3, p.hairLight); cell(8, 3, p.hairLight); cell(9, 3, p.hair);

    // Hair volume (row 4)
    for (let dx = 4; dx <= 11; dx++) cell(dx, 4, (dx % 3 === 0) ? p.hairLight : p.hair);

    // Face skin fill (rows 5-8)
    for (let dy = 5; dy <= 8; dy++) {
      for (let dx = 5; dx <= 10; dx++) cell(dx, dy, p.skin);
    }
    cell(7, 5, p.skinLight); cell(8, 5, p.skinLight);
    // Hair sides framing face
    cell(4, 5, p.hair); cell(11, 5, p.hair);
    cell(4, 6, p.hairDark); cell(11, 6, p.hairDark);
    cell(4, 7, p.hairDark); cell(11, 7, p.hairDark);

    // Furrowed eyebrows (row 5) â€” heavy, inward-angled (pain)
    cell(6, 5, p.hairDark); cell(7, 5, p.hairDark);
    cell(9, 5, p.hairDark); cell(10, 5, p.hairDark);

    // Eyes (row 6) â€” squinting, heavy-lidded
    cell(5, 6, p.skinShadow);
    cell(6, 6, 0xDDDDDD); cell(7, 6, p.eyeIrisDark);
    cell(8, 6, p.skin);
    cell(9, 6, p.eyeIrisDark); cell(10, 6, 0xDDDDDD);

    // Nose (row 7)
    cell(8, 7, p.skinShadow);

    // Mouth â€” tight grimace (row 8)
    cell(7, 8, p.skinShadow); cell(8, 8, p.skinShadow);

    // Neck (row 9) â€” tilted right toward barrel
    cell(7, 9, p.skinShadow); cell(8, 9, p.skinShadow); cell(9, 9, p.skinShadow);

    // Upper body + shoulders (row 10) â€” hunched
    for (let dx = 5; dx <= 10; dx++) cell(dx, 10, p.tunicLight);
    cell(7, 10, p.trimColor); cell(8, 10, p.trimColor);
    cell(4, 10, p.tunicDark);
    cell(11, 10, p.tunicDark);

    // Mid body + blood stain (row 11)
    for (let dx = 5; dx <= 10; dx++) cell(dx, 11, p.tunicMain);
    cell(7, 11, p.trimColor); cell(8, 11, p.trimColor);
    cell(9, 11, BLOOD); cell(10, 11, BLOOD);
    cell(4, 11, p.tunicDark);
    cell(11, 11, p.skinShadow);

    // Left arm (holding wound) + right arm (resting on barrel)
    cell(4, 12, p.skinShadow);
    cell(11, 12, p.skinShadow);

    // Belt (row 12)
    for (let dx = 5; dx <= 10; dx++) cell(dx, 12, p.bootDark);
    cell(7, 12, p.trimColor); cell(8, 12, p.trimColor);

    // Thighs â€” bent wide, tunic skirt over lap (row 13)
    cell(4, 13, p.tunicDark); cell(5, 13, p.pantColor); cell(6, 13, p.pantColor);
    cell(7, 13, p.pantDark); cell(8, 13, p.pantDark);
    cell(9, 13, p.pantColor); cell(10, 13, p.pantColor); cell(11, 13, p.tunicDark);

    // Lower legs â€” spread wide (row 14)
    cell(3, 14, p.pantColor); cell(4, 14, p.pantDark);
    cell(10, 14, p.pantDark); cell(11, 14, p.pantColor);

    // Boots â€” kicked out at far edges (row 15)
    cell(2, 15, p.bootColor); cell(3, 15, p.bootDark);
    cell(11, 15, p.bootDark); cell(12, 15, p.bootColor);

    // Per-pixel highlight/shadow pass
    const imgData = ctx.getImageData(0, 0, W, H);
    for (let y = 0; y < H; y += G) {
      for (let x = 0; x < W; x += G) {
        const i = (y * W + x) * 4;
        if (imgData.data[i + 3] > 0) {
          ctx.fillStyle = 'rgba(255,255,255,0.12)';
          ctx.fillRect(x, y, 1, 1);
          ctx.fillStyle = 'rgba(0,0,0,0.1)';
          ctx.fillRect(x + G - 1, y + G - 1, 1, 1);
        }
      }
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.magFilter = THREE.NearestFilter;
    texture.minFilter = THREE.NearestFilter;

    if (spriteId) {
      this.textureDataUrls.set(spriteId, canvas.toDataURL());
    }

    return texture;
  }

  createFallenRangerRemains(
    palette: {
      hair: number; hairLight: number; hairDark: number;
      skin: number; skinLight: number; skinShadow: number;
      eyeIris: number; eyeIrisDark: number;
      tunicMain: number; tunicLight: number; tunicDark: number;
      trimColor: number; trimLight: number;
      capeMain: number; capeDark: number;
      pantColor: number; pantDark: number;
      bootColor: number; bootDark: number;
    },
    spriteId?: string,
  ): THREE.Texture {
    const G = 4;
    const W = 24 * G;
    const H = 16 * G;
    const canvas = document.createElement('canvas');
    canvas.width = W;
    canvas.height = H;
    const ctx = canvas.getContext('2d')!;
    const p = palette;

    const cell = (gx: number, gy: number, color: number) => {
      ctx.fillStyle = this.hex(color);
      ctx.fillRect(gx * G, gy * G, G, G);
    };

    const BLOOD_D = 0x2A0707;
    const BLOOD_M = 0x5C1010;
    const BLOOD_H = 0x8B1A1A;
    const STEEL_D = 0x455A64;
    const STEEL_M = 0x78909C;
    const STEEL_H = 0xB0BEC5;
    const KEY = 0xFFD54F;
    const BLADE = 0xB7C9D6;
    const GRIP = 0x5D4037;

    // Bloodstain footprint under and around the crushed torso.
    const bloodCells: Array<[number, number, number]> = [
      [4, 8, BLOOD_D], [5, 7, BLOOD_M], [5, 8, BLOOD_H], [6, 7, BLOOD_M], [6, 8, BLOOD_H],
      [7, 7, BLOOD_D], [7, 8, BLOOD_M], [8, 6, BLOOD_D], [8, 7, BLOOD_M], [8, 8, BLOOD_H],
      [9, 6, BLOOD_M], [9, 7, BLOOD_H], [9, 8, BLOOD_M], [10, 6, BLOOD_D], [10, 7, BLOOD_M],
      [11, 7, BLOOD_M], [11, 8, BLOOD_H], [12, 8, BLOOD_M], [13, 8, BLOOD_D],
      [4, 10, BLOOD_M], [3, 11, BLOOD_D], [12, 10, BLOOD_M], [14, 9, BLOOD_D],
    ];
    for (const [x, y, color] of bloodCells) cell(x, y, color);

    // Dropped blade, offset from the hand so the body reads as abandoned.
    cell(1, 10, BLADE); cell(2, 10, BLADE); cell(3, 10, BLADE);
    cell(4, 10, STEEL_H); cell(5, 10, GRIP);
    cell(3, 11, STEEL_D); cell(4, 9, STEEL_D);

    // Cape and coat flattened against the ground.
    cell(8, 9, p.capeDark); cell(9, 9, p.capeMain); cell(10, 9, p.capeMain); cell(11, 9, p.capeDark);
    cell(7, 10, p.capeDark); cell(8, 10, p.capeMain); cell(9, 10, p.capeMain); cell(10, 10, p.capeMain);
    cell(11, 10, p.capeDark); cell(12, 10, p.capeDark);
    cell(8, 11, p.capeDark); cell(9, 11, p.capeMain); cell(10, 11, p.capeDark);

    // Head on its side, built from the same square chibi face language as the player.
    cell(4, 5, p.hairDark); cell(5, 4, p.hair); cell(6, 4, p.hairLight); cell(7, 4, p.hair);
    cell(4, 6, p.hair); cell(5, 5, p.skinLight); cell(6, 5, p.skin); cell(7, 5, p.skin);
    cell(5, 6, p.skin); cell(6, 6, p.skin); cell(7, 6, p.skinShadow);
    cell(5, 7, p.hairDark); cell(6, 7, p.skinShadow); cell(7, 7, p.skinShadow);
    cell(6, 5, p.eyeIrisDark); cell(7, 6, 0x2A1A14);

    // Neck and broken chest plate, diagonal instead of upright/sitting.
    cell(8, 6, p.skinShadow);
    cell(8, 7, STEEL_H); cell(9, 6, STEEL_M); cell(9, 7, STEEL_H); cell(10, 6, STEEL_D);
    cell(10, 7, STEEL_M); cell(11, 7, STEEL_D); cell(8, 8, STEEL_M); cell(9, 8, STEEL_H);
    cell(10, 8, STEEL_M); cell(11, 8, STEEL_D);
    cell(9, 7, BLOOD_H); cell(10, 8, BLOOD_M);
    cell(11, 7, KEY);

    // Sprawled arms.
    cell(7, 8, p.tunicDark); cell(6, 9, p.skinShadow); cell(5, 9, p.skin);
    cell(12, 7, p.tunicDark); cell(13, 6, p.skinShadow); cell(14, 6, p.skin);
    cell(14, 5, p.skinLight);

    // Kicked-out legs and boots, separated so the pose reads limp.
    cell(12, 9, p.pantColor); cell(13, 10, p.pantDark); cell(14, 11, p.pantColor);
    cell(15, 12, p.bootDark); cell(16, 12, p.bootColor);
    cell(11, 10, p.pantDark); cell(12, 11, p.pantColor); cell(12, 12, p.pantDark);
    cell(12, 13, p.bootDark); cell(13, 13, p.bootColor);

    // Scattered blood flecks around the remains.
    cell(2, 8, BLOOD_H); cell(15, 8, BLOOD_M); cell(16, 10, BLOOD_D); cell(6, 12, BLOOD_M);
    cell(10, 12, BLOOD_H); cell(3, 6, BLOOD_D);

    const imgData = ctx.getImageData(0, 0, W, H);
    for (let y = 0; y < H; y += G) {
      for (let x = 0; x < W; x += G) {
        const i = (y * W + x) * 4;
        if (imgData.data[i + 3] > 0) {
          ctx.fillStyle = 'rgba(255,255,255,0.1)';
          ctx.fillRect(x, y, 1, 1);
          ctx.fillStyle = 'rgba(0,0,0,0.14)';
          ctx.fillRect(x + G - 1, y + G - 1, 1, 1);
        }
      }
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.magFilter = THREE.NearestFilter;
    texture.minFilter = THREE.NearestFilter;

    if (spriteId) {
      this.textureDataUrls.set(spriteId, canvas.toDataURL());
    }

    return texture;
  }

  createKeyRangerRemains(
    palette: {
      hair: number; hairLight: number; hairDark: number;
      skin: number; skinLight: number; skinShadow: number;
      eyeIris: number; eyeIrisDark: number;
      tunicMain: number; tunicLight: number; tunicDark: number;
      trimColor: number; trimLight: number;
      capeMain: number; capeDark: number;
      pantColor: number; pantDark: number;
      bootColor: number; bootDark: number;
    },
    spriteId?: string,
  ): THREE.Texture {
    const G = 4;
    const W = 28 * G;
    const H = 18 * G;
    const canvas = document.createElement('canvas');
    canvas.width = W;
    canvas.height = H;
    const ctx = canvas.getContext('2d')!;
    const p = palette;
    const cell = (gx: number, gy: number, color: number) => {
      ctx.fillStyle = this.hex(color);
      ctx.fillRect(gx * G, gy * G, G, G);
    };

    const BLOOD_D = 0x250606;
    const BLOOD_M = 0x5C1010;
    const BLOOD_H = 0x8B1A1A;
    const STEEL_D = 0x455A64;
    const STEEL_M = 0x78909C;
    const STEEL_H = 0xB0BEC5;
    const KEY = 0xFFD54F;
    const KEY_D = 0xB8860B;
    const BLADE = 0xB7C9D6;
    const GRIP = 0x5D4037;

    const bodyOx = 5;
    const bodyOy = -4;
    const rc = (sx: number, sy: number, color: number) => {
      cell(bodyOx + sy, bodyOy + (15 - sx), color);
    };

    const blood: Array<[number, number, number]> = [
      [12, 8, BLOOD_D], [13, 7, BLOOD_M], [13, 8, BLOOD_H], [14, 7, BLOOD_H], [14, 8, BLOOD_H],
      [15, 7, BLOOD_M], [15, 8, BLOOD_H], [16, 8, BLOOD_M], [17, 8, BLOOD_D],
      [13, 10, BLOOD_M], [15, 10, BLOOD_D], [11, 6, BLOOD_M], [18, 6, BLOOD_D],
    ];
    for (const [x, y, color] of blood) cell(x, y, color);

    // Dropped weapon reads as a clue, but sits away from the key-bearing belt.
    cell(1, 12, BLADE); cell(2, 12, BLADE); cell(3, 12, STEEL_H);
    cell(4, 12, GRIP); cell(4, 11, STEEL_D);

    // Cape under the rotated body. It supports the silhouette without changing anatomy.
    cell(12, 10, p.capeDark); cell(13, 10, p.capeMain); cell(14, 10, p.capeMain);
    cell(15, 10, p.capeDark); cell(13, 11, p.capeDark); cell(14, 11, p.capeMain);
    cell(15, 11, p.capeDark);

    // Exact 90-degree mapping of the player down-idle body grid.
    for (let sx = 5; sx <= 10; sx++) rc(sx, 0, p.hair);
    rc(6, 0, p.hairLight); rc(8, 0, p.hairLight); rc(9, 0, p.hair);
    for (let sx = 4; sx <= 11; sx++) rc(sx, 1, sx % 3 === 0 ? p.hairLight : p.hair);

    for (let sy = 2; sy <= 5; sy++) {
      const inset = sy === 2 ? 1 : 0;
      for (let sx = 5 + inset; sx <= 10 - inset; sx++) rc(sx, sy, p.skin);
    }
    rc(6, 2, p.skinLight); rc(7, 2, p.skinLight); rc(8, 2, p.skinLight);
    rc(4, 2, p.hair); rc(11, 2, p.hair);
    rc(4, 3, p.hairDark); rc(11, 3, p.hairDark);
    rc(4, 4, p.hairDark); rc(11, 4, p.hairDark);
    rc(6, 3, 0xFFFFFF); rc(10, 3, 0xFFFFFF);
    rc(7, 3, p.eyeIrisDark); rc(9, 3, p.eyeIrisDark);
    rc(6, 2, p.hairDark); rc(7, 2, p.hairDark);
    rc(9, 2, p.hairDark); rc(10, 2, p.hairDark);
    rc(8, 4, p.skinShadow);
    rc(7, 5, p.skinShadow); rc(8, 5, p.skinShadow);
    rc(7, 6, p.skinShadow); rc(8, 6, p.skinShadow);

    for (let sx = 5; sx <= 10; sx++) {
      rc(sx, 7, p.tunicLight);
      rc(sx, 8, p.tunicMain);
      rc(sx, 9, p.tunicMain);
      rc(sx, 10, p.bootDark);
      rc(sx, 11, p.tunicDark);
    }
    rc(7, 7, p.trimColor); rc(8, 7, p.trimColor);
    rc(7, 8, p.trimColor); rc(8, 8, p.trimColor);
    rc(7, 10, p.trimColor); rc(8, 10, p.trimColor);
    rc(4, 7, p.tunicDark); rc(4, 8, p.tunicDark); rc(4, 9, p.skinShadow);
    rc(11, 7, p.tunicDark); rc(11, 8, p.tunicDark); rc(11, 9, p.skinShadow);
    rc(6, 12, p.pantColor); rc(7, 12, p.pantColor);
    rc(6, 13, p.pantColor); rc(7, 13, p.pantColor);
    rc(6, 14, p.bootColor); rc(7, 14, p.bootColor);
    rc(8, 12, p.pantColor); rc(9, 12, p.pantColor);
    rc(8, 13, p.pantColor); rc(9, 13, p.pantColor);
    rc(8, 14, p.bootColor); rc(9, 14, p.bootColor);
    rc(6, 14, p.bootDark); rc(9, 14, p.bootDark);

    // Armor sits exactly on the torso cells: width remains 6, matching the player body.
    for (let sx = 5; sx <= 10; sx++) {
      rc(sx, 7, sx === 5 || sx === 10 ? STEEL_D : STEEL_H);
      rc(sx, 8, sx === 5 || sx === 10 ? STEEL_D : STEEL_M);
      rc(sx, 9, sx === 7 || sx === 8 ? BLOOD_H : STEEL_M);
    }
    rc(7, 10, KEY_D); rc(8, 10, KEY); rc(8, 9, KEY); rc(9, 10, KEY_D);
    cell(20, 7, BLOOD_M); cell(7, 6, BLOOD_D); cell(17, 11, BLOOD_H);

    const imgData = ctx.getImageData(0, 0, W, H);
    for (let y = 0; y < H; y += G) {
      for (let x = 0; x < W; x += G) {
        const i = (y * W + x) * 4;
        if (imgData.data[i + 3] > 0) {
          ctx.fillStyle = 'rgba(255,255,255,0.1)';
          ctx.fillRect(x, y, 1, 1);
          ctx.fillStyle = 'rgba(0,0,0,0.14)';
          ctx.fillRect(x + G - 1, y + G - 1, 1, 1);
        }
      }
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.magFilter = THREE.NearestFilter;
    texture.minFilter = THREE.NearestFilter;
    if (spriteId) this.textureDataUrls.set(spriteId, canvas.toDataURL());
    return texture;
  }

  createRangerRemainsFacedownKit(
    palette: {
      hair: number; hairLight: number; hairDark: number;
      skin: number; skinLight: number; skinShadow: number;
      eyeIris: number; eyeIrisDark: number;
      tunicMain: number; tunicLight: number; tunicDark: number;
      trimColor: number; trimLight: number;
      capeMain: number; capeDark: number;
      pantColor: number; pantDark: number;
      bootColor: number; bootDark: number;
    },
    spriteId?: string,
  ): THREE.Texture {
    const G = 4;
    const W = 28 * G;
    const H = 18 * G;
    const canvas = document.createElement('canvas');
    canvas.width = W;
    canvas.height = H;
    const ctx = canvas.getContext('2d')!;
    const p = palette;
    const cell = (gx: number, gy: number, color: number) => {
      ctx.fillStyle = this.hex(color);
      ctx.fillRect(gx * G, gy * G, G, G);
    };

    const BLOOD_D = 0x250606;
    const BLOOD_M = 0x5C1010;
    const BLOOD_H = 0x8B1A1A;
    const STEEL_D = 0x455A64;
    const STEEL_M = 0x78909C;
    const STEEL_H = 0xB0BEC5;

    const bodyOx = 5;
    const bodyOy = -4;
    const rc = (sx: number, sy: number, color: number) => {
      cell(bodyOx + sy, bodyOy + (15 - sx), color);
    };

    // Same corpse footprint as the key ranger, but no gold cue.
    const blood: Array<[number, number, number]> = [
      [12, 8, BLOOD_D], [13, 7, BLOOD_M], [13, 8, BLOOD_H], [14, 7, BLOOD_M], [14, 8, BLOOD_H],
      [15, 7, BLOOD_M], [15, 8, BLOOD_H], [16, 8, BLOOD_M], [17, 8, BLOOD_D],
      [13, 10, BLOOD_M], [15, 10, BLOOD_D], [11, 6, BLOOD_M], [18, 6, BLOOD_D],
    ];
    for (const [x, y, color] of blood) cell(x, y, color);

    cell(12, 10, p.capeDark); cell(13, 10, p.capeMain); cell(14, 10, p.capeMain);
    cell(15, 10, p.capeDark); cell(13, 11, p.capeDark); cell(14, 11, p.capeMain);
    cell(15, 11, p.capeDark);

    // Same rotated player grid, but the head is the back of the head: hair only,
    // with a small neck shadow instead of face/eyes.
    for (let sx = 5; sx <= 10; sx++) rc(sx, 0, p.hairDark);
    rc(6, 0, p.hair); rc(8, 0, p.hair); rc(9, 0, p.hairDark);
    for (let sx = 4; sx <= 11; sx++) rc(sx, 1, sx % 3 === 0 ? p.hair : p.hairDark);
    for (let sy = 2; sy <= 5; sy++) {
      const inset = sy === 2 ? 1 : 0;
      for (let sx = 5 + inset; sx <= 10 - inset; sx++) rc(sx, sy, p.hair);
    }
    rc(4, 2, p.hairDark); rc(11, 2, p.hairDark);
    rc(4, 3, p.hairDark); rc(11, 3, p.hairDark);
    rc(4, 4, p.hairDark); rc(11, 4, p.hairDark);
    rc(7, 5, p.skinShadow); rc(8, 5, p.skinShadow);
    rc(7, 6, p.skinShadow); rc(8, 6, p.skinShadow);

    for (let sx = 5; sx <= 10; sx++) {
      rc(sx, 7, p.tunicLight);
      rc(sx, 8, p.tunicMain);
      rc(sx, 9, p.tunicMain);
      rc(sx, 10, p.bootDark);
      rc(sx, 11, p.tunicDark);
    }
    rc(7, 7, p.trimColor); rc(8, 7, p.trimColor);
    rc(7, 8, p.trimColor); rc(8, 8, p.trimColor);
    rc(4, 7, p.tunicDark); rc(4, 8, p.tunicDark); rc(4, 9, p.skinShadow);
    rc(11, 7, p.tunicDark); rc(11, 8, p.tunicDark); rc(11, 9, p.skinShadow);
    rc(6, 12, p.pantColor); rc(7, 12, p.pantColor);
    rc(6, 13, p.pantColor); rc(7, 13, p.pantColor);
    rc(6, 14, p.bootColor); rc(7, 14, p.bootColor);
    rc(8, 12, p.pantColor); rc(9, 12, p.pantColor);
    rc(8, 13, p.pantColor); rc(9, 13, p.pantColor);
    rc(8, 14, p.bootColor); rc(9, 14, p.bootColor);
    rc(6, 14, p.bootDark); rc(9, 14, p.bootDark);

    for (let sx = 5; sx <= 10; sx++) {
      rc(sx, 7, sx === 5 || sx === 10 ? STEEL_D : STEEL_H);
      rc(sx, 8, sx === 5 || sx === 10 ? STEEL_D : STEEL_M);
      rc(sx, 9, sx === 7 || sx === 8 ? BLOOD_M : STEEL_M);
    }
    cell(20, 7, BLOOD_M); cell(7, 6, BLOOD_D); cell(17, 11, BLOOD_H);

    const imgData = ctx.getImageData(0, 0, W, H);
    for (let y = 0; y < H; y += G) {
      for (let x = 0; x < W; x += G) {
        const i = (y * W + x) * 4;
        if (imgData.data[i + 3] > 0) {
          ctx.fillStyle = 'rgba(255,255,255,0.08)';
          ctx.fillRect(x, y, 1, 1);
          ctx.fillStyle = 'rgba(0,0,0,0.16)';
          ctx.fillRect(x + G - 1, y + G - 1, 1, 1);
        }
      }
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.magFilter = THREE.NearestFilter;
    texture.minFilter = THREE.NearestFilter;
    if (spriteId) this.textureDataUrls.set(spriteId, canvas.toDataURL());
    return texture;
  }

  // Register a lazy texture generator instead of creating immediately
  private registerTexture(name: string, generator: () => THREE.Texture) {
    this.textureGenerators.set(name, generator);
  }

  getTexture(name: string): THREE.Texture | undefined {
    // Check cache first
    let tex = this.textures.get(name);
    if (tex) return tex;
    // Try lazy generation
    const gen = this.textureGenerators.get(name);
    if (gen) {
      tex = gen();
      this.textures.set(name, tex);
      this.textureGenerators.delete(name);
      return tex;
    }
    return undefined;
  }

  getTextureURL(id: string): string | null {
    const existingUrl = this.textureDataUrls.get(id);
    if (existingUrl) return existingUrl;

    this.getTexture(id);
    return this.textureDataUrls.get(id) || null;
  }

  getPalette(_id: string): Record<string, number> {
    // This method was added by the user's diff, but its implementation was not provided.
    // Returning an empty object as a placeholder to maintain syntactical correctness.
    return {};
  }

  /** Build enemy sprite textures before first spawn (e.g. on map load) to avoid frame hitches. */
  warmupEnemyTexturesForZones(zones: { enemyType: string }[] | undefined): void {
    if (!zones?.length) return;
    const seen = new Set<string>();
    for (const z of zones) {
      const bp = ENEMY_BLUEPRINTS[z.enemyType];
      if (!bp || seen.has(bp.sprite)) continue;
      seen.add(bp.sprite);
      const base = bp.sprite;
      this.getTexture(base);
      this.getTexture(`${base}_telegraph`);
      this.getTexture(`${base}_attack`);
    }
  }

  /**
   * Spread enemy sprite generation across idle frames so the first map stays light.
   * Call cancel fn on unmount.
   */
  startBackgroundEnemyPrewarm(shouldAbort: () => boolean): () => void {
    let cancelled = false;
    let idleId: number | null = null;
    let timeoutId: ReturnType<typeof setTimeout> | null = null;
    const typeKeys = Object.keys(ENEMY_BLUEPRINTS);
    let idx = 0;

    const clearScheduled = () => {
      if (idleId !== null && typeof cancelIdleCallback !== 'undefined') {
        cancelIdleCallback(idleId);
        idleId = null;
      }
      if (timeoutId !== null) {
        clearTimeout(timeoutId);
        timeoutId = null;
      }
    };

    const schedule = (fn: () => void) => {
      clearScheduled();
      if (typeof requestIdleCallback !== 'undefined') {
        idleId = requestIdleCallback(fn, { timeout: 1200 });
      } else {
        timeoutId = setTimeout(fn, 0);
      }
    };

    const pump = () => {
      if (cancelled || shouldAbort()) return;
      if (idx >= typeKeys.length) return;
      const bp = ENEMY_BLUEPRINTS[typeKeys[idx++]];
      this.getTexture(bp.sprite);
      this.getTexture(`${bp.sprite}_telegraph`);
      this.getTexture(`${bp.sprite}_attack`);
      if (!cancelled && !shouldAbort() && idx < typeKeys.length) {
        schedule(pump);
      }
    };

    const kick = () => {
      if (cancelled || shouldAbort()) return;
      schedule(pump);
    };

    if (typeof requestIdleCallback !== 'undefined') {
      idleId = requestIdleCallback(kick, { timeout: 2000 });
    } else {
      timeoutId = setTimeout(kick, 400);
    }

    return () => {
      cancelled = true;
      clearScheduled();
    };
  }

  loadDefaultAssets() {
    const C = 0; // transparent

    const registerColorTexture = (
      name: string,
      color: number,
      width: number = 32,
      height: number = 32,
      pattern?: 'noise' | 'checker' | 'gradient' | 'cobblestone_grid'
    ) => {
      this.registerTexture(name, () => this.createColorTexture(color, width, height, pattern));
    };

    const registerSpriteTexture = (
      name: string,
      colors: readonly (readonly number[])[],
      cellSize: number = 4,
    ) => {
      this.registerTexture(name, () => this.createSpriteTexture(colors, cellSize, name));
    };

    // ===== HERO PALETTE for canvas-drawn chibi =====
    const heroPalette = {
      hair: 0x8B6040, hairLight: 0xC09060, hairDark: 0x503018,
      skin: 0xFFE0BD, skinLight: 0xFFF0D8, skinShadow: 0xE8C4A0,
      eyeIris: 0x5B8B3A, eyeIrisDark: 0x2A5A08,
      tunicMain: 0x3A8AC0, tunicLight: 0x50A0D8, tunicDark: 0x286890,
      trimColor: 0xE8C030, trimLight: 0xFFD850,
      capeMain: 0x3080B8, capeDark: 0x185078,
      pantColor: 0x5A4030, pantDark: 0x3E2818,
      bootColor: 0x6B4428, bootDark: 0x503018,
    };

    // Generate all player sprites using canvas drawing
    const dirs: Array<'down' | 'up' | 'left' | 'right'> = ['down', 'up', 'left', 'right'];
    const states: Array<'idle' | 'walk' | 'attack' | 'charge' | 'hurt' | 'block'> = ['idle', 'walk', 'attack', 'charge', 'hurt', 'block'];

    for (const dir of dirs) {
      for (const state of states) {
        const maxFrames = state === 'attack' || state === 'charge' ? 3 : state === 'hurt' || state === 'block' ? 1 : 2;
        for (let f = 0; f < maxFrames; f++) {
          const d = dir, s = state, fr = f;
          const spriteId = `player_${d}_${s}_${fr}`;
          const bladeId = `player_${d}_${s}_${fr}_blade`;
          this.registerTexture(spriteId, () => {
            const tex = this.getTexture('sword');
            const wc = tex?.image instanceof HTMLCanvasElement ? tex.image : undefined;
            return this.createChibiCharacter(d, s, fr, heroPalette, spriteId, false, true, wc, 0.78);
          });
          this.registerTexture(bladeId, () => this.createChibiCharacter(d, s, fr, heroPalette, bladeId, true));
        }
      }
    }

    // Combo step attack textures: attack_0 (= attack), attack_1 (backhand), attack_2 (finisher)
    for (const dir of dirs) {
      for (let step = 0; step < 3; step++) {
        for (let f = 0; f < 3; f++) {
          const d = dir, cs = step, fr = f;
          const spriteId = `player_${d}_attack_${cs}_${fr}`;
          const bladeId = `player_${d}_attack_${cs}_${fr}_blade`;
          this.registerTexture(spriteId, () => {
            const tex = this.getTexture('sword');
            const wc = tex?.image instanceof HTMLCanvasElement ? tex.image : undefined;
            return this.createChibiCharacter(d, 'attack', fr, heroPalette, spriteId, false, true, wc, 0.78, cs);
          });
          this.registerTexture(bladeId, () => this.createChibiCharacter(d, 'attack', fr, heroPalette, bladeId, true, true, undefined, 1.0, cs));
        }
      }
    }

    // Diagonal sprites reuse side views
    const diagDirs = ['down_left', 'down_right', 'up_left', 'up_right'] as const;
    const diagBase = { down_left: 'left', down_right: 'right', up_left: 'left', up_right: 'right' } as const;
    
    for (const dDir of diagDirs) {
      const base = diagBase[dDir];
      for (const state of states) {
        const maxFrames = state === 'attack' || state === 'charge' ? 3 : state === 'hurt' || state === 'block' ? 1 : 2;
        for (let f = 0; f < maxFrames; f++) {
          const dd = dDir, b = base, s = state, fr = f;
          const spriteId = `player_${dd}_${s}_${fr}`;
          const bladeId = `player_${dd}_${s}_${fr}_blade`;
          this.registerTexture(spriteId, () => {
            const baseTexture = this.getTexture(`player_${b}_${s}_${fr}`)!;
            if (baseTexture instanceof THREE.CanvasTexture && baseTexture.image instanceof HTMLCanvasElement) {
              this.textureDataUrls.set(spriteId, baseTexture.image.toDataURL());
            }
            return baseTexture;
          });
          this.registerTexture(bladeId, () => {
            const baseTexture = this.getTexture(`player_${b}_${s}_${fr}_blade`)!;
            if (baseTexture instanceof THREE.CanvasTexture && baseTexture.image instanceof HTMLCanvasElement) {
              this.textureDataUrls.set(bladeId, baseTexture.image.toDataURL());
            }
            return baseTexture;
          });
        }
      }
    }

    // Diagonal combo step aliases
    for (const dDir of diagDirs) {
      const base = diagBase[dDir];
      for (let step = 0; step < 3; step++) {
        for (let f = 0; f < 3; f++) {
          const dd = dDir, b = base, cs = step, fr = f;
          const spriteId = `player_${dd}_attack_${cs}_${fr}`;
          const bladeId = `player_${dd}_attack_${cs}_${fr}_blade`;
          this.registerTexture(spriteId, () => {
            const baseTexture = this.getTexture(`player_${b}_attack_${cs}_${fr}`)!;
            if (baseTexture instanceof THREE.CanvasTexture && baseTexture.image instanceof HTMLCanvasElement) {
              this.textureDataUrls.set(spriteId, baseTexture.image.toDataURL());
            }
            return baseTexture;
          });
          this.registerTexture(bladeId, () => {
            const baseTexture = this.getTexture(`player_${b}_attack_${cs}_${fr}_blade`)!;
            if (baseTexture instanceof THREE.CanvasTexture && baseTexture.image instanceof HTMLCanvasElement) {
              this.textureDataUrls.set(bladeId, baseTexture.image.toDataURL());
            }
            return baseTexture;
          });
        }
      }
    }

    // Legacy aliases
    for (const d of ['down', 'up', 'left', 'right']) {
      const dd = d;
      const spriteId = `player_${dd}`;
      this.registerTexture(spriteId, () => {
        const baseTexture = this.getTexture(`player_${dd}_idle_0`)!;
        if (baseTexture instanceof THREE.CanvasTexture && baseTexture.image instanceof HTMLCanvasElement) {
          this.textureDataUrls.set(spriteId, baseTexture.image.toDataURL());
        }
        return baseTexture;
      });
    }

    // ========== NPC SPRITES - Using same chibi system ==========
    const elderPalette = {
      hair: 0xE8E8F0, hairLight: 0xFFFFFF, hairDark: 0xC0C0D0,
      skin: 0xFFE0BD, skinLight: 0xFFF0D8, skinShadow: 0xE8C4A0,
      eyeIris: 0x5D4037, eyeIrisDark: 0x3E2723,
      tunicMain: 0x5A1A8A, tunicLight: 0x7828AA, tunicDark: 0x3A0A6A,
      trimColor: 0xCCA800, trimLight: 0xFFD850,
      capeMain: 0x5A1A8A, capeDark: 0x3A0A6A,
      pantColor: 0x5A1A8A, pantDark: 0x3A0A6A,
      bootColor: 0x6B4428, bootDark: 0x503018,
    };
    this.registerTexture('npc_elder', () => this.createChibiCharacter('down', 'idle', 0, elderPalette, 'npc_elder', false, false));

    const merchantPalette = {
      hair: 0x6D4C41, hairLight: 0x8D6E63, hairDark: 0x4E342E,
      skin: 0xFFE0BD, skinLight: 0xFFF0D8, skinShadow: 0xE8C4A0,
      eyeIris: 0x5D4037, eyeIrisDark: 0x3E2723,
      tunicMain: 0xE06000, tunicLight: 0xFF8800, tunicDark: 0xBB4400,
      trimColor: 0xFFD700, trimLight: 0xFFE850,
      capeMain: 0xE06000, capeDark: 0xBB4400,
      pantColor: 0x5A4030, pantDark: 0x3E2818,
      bootColor: 0x6B4428, bootDark: 0x503018,
    };
    this.registerTexture('npc_merchant', () => this.createChibiCharacter('down', 'idle', 0, merchantPalette, 'npc_merchant', false, false));

    const guardPalette = {
      hair: 0x506070, hairLight: 0x687888, hairDark: 0x37474F,
      skin: 0xFFE0BD, skinLight: 0xFFF0D8, skinShadow: 0xE8C4A0,
      eyeIris: 0x37474F, eyeIrisDark: 0x263238,
      tunicMain: 0x607080, tunicLight: 0x788898, tunicDark: 0x485060,
      trimColor: 0xB0BEC5, trimLight: 0xCFD8DC,
      capeMain: 0x607080, capeDark: 0x485060,
      pantColor: 0x5A4030, pantDark: 0x3E2818,
      bootColor: 0x485060, bootDark: 0x37474F,
    };
    this.registerTexture('npc_guard', () => this.createChibiCharacter('down', 'idle', 0, guardPalette, 'npc_guard'));

    this.registerTexture('npc_oliver_injured', () => this.createInjuredSittingChibi(guardPalette, 'npc_oliver_injured'));

    // ========== NEW NPCs ==========
    const blacksmithPalette = {
      hair: 0x212121, hairLight: 0x424242, hairDark: 0x000000,
      skin: 0xD2A679, skinLight: 0xE8C49A, skinShadow: 0xB8895A,
      eyeIris: 0x4E342E, eyeIrisDark: 0x3E2723,
      tunicMain: 0x5D4037, tunicLight: 0x795548, tunicDark: 0x3E2723,
      trimColor: 0xFF6F00, trimLight: 0xFF8F00,
      capeMain: 0x4E342E, capeDark: 0x3E2723,
      pantColor: 0x3E2723, pantDark: 0x2C1B0E,
      bootColor: 0x3E2723, bootDark: 0x212121,
    };
    this.registerTexture('npc_blacksmith', () => this.createChibiCharacter('down', 'idle', 0, blacksmithPalette, 'npc_blacksmith', false, false));

    const healerPalette = {
      hair: 0xFFF9C4, hairLight: 0xFFFFFF, hairDark: 0xFFF176,
      skin: 0xFFE0BD, skinLight: 0xFFF0D8, skinShadow: 0xE8C4A0,
      eyeIris: 0x4FC3F7, eyeIrisDark: 0x0288D1,
      tunicMain: 0xF5F5F5, tunicLight: 0xFFFFFF, tunicDark: 0xE0E0E0,
      trimColor: 0x81C784, trimLight: 0xA5D6A7,
      capeMain: 0xC8E6C9, capeDark: 0xA5D6A7,
      pantColor: 0xE0E0E0, pantDark: 0xBDBDBD,
      bootColor: 0xA5D6A7, bootDark: 0x81C784,
    };
    this.registerTexture('npc_healer', () => this.createChibiCharacter('down', 'idle', 0, healerPalette, 'npc_healer', false, false));

    const apothecaryPalette = {
      hair: 0x6D4C41, hairLight: 0x8D6E63, hairDark: 0x4E342E,
      skin: 0xFFE0BD, skinLight: 0xFFF0D8, skinShadow: 0xE8C4A0,
      eyeIris: 0x2E7D32, eyeIrisDark: 0x1B5E20,
      tunicMain: 0x4E6E50, tunicLight: 0x6B8F6D, tunicDark: 0x355438,
      trimColor: 0xD4A52A, trimLight: 0xEBCB61,
      capeMain: 0x7A5A2F, capeDark: 0x5D4120,
      pantColor: 0x5A4030, pantDark: 0x3E2818,
      bootColor: 0x5D4037, bootDark: 0x3E2723,
    };
    this.registerTexture('npc_apothecary', () => this.createChibiCharacter('down', 'idle', 0, apothecaryPalette, 'npc_apothecary', false, false));

    const chapelKeeperPalette = {
      hair: 0xB0BEC5, hairLight: 0xCFD8DC, hairDark: 0x90A4AE,
      skin: 0xFFE0BD, skinLight: 0xFFF0D8, skinShadow: 0xE8C4A0,
      eyeIris: 0x455A64, eyeIrisDark: 0x263238,
      tunicMain: 0x546E7A, tunicLight: 0x78909C, tunicDark: 0x37474F,
      trimColor: 0xD7CCC8, trimLight: 0xEFEBE9,
      capeMain: 0x455A64, capeDark: 0x37474F,
      pantColor: 0x5A4030, pantDark: 0x3E2818,
      bootColor: 0x4E342E, bootDark: 0x3E2723,
    };
    this.registerTexture('npc_chapel_keeper', () => this.createChibiCharacter('down', 'idle', 0, chapelKeeperPalette, 'npc_chapel_keeper', false, false));

    const farmerPalette = {
      hair: 0x8D6E63, hairLight: 0xA1887F, hairDark: 0x6D4C41,
      skin: 0xD2A679, skinLight: 0xE8C49A, skinShadow: 0xB8895A,
      eyeIris: 0x5D4037, eyeIrisDark: 0x3E2723,
      tunicMain: 0x7CB342, tunicLight: 0x9CCC65, tunicDark: 0x558B2F,
      trimColor: 0x8D6E63, trimLight: 0xA1887F,
      capeMain: 0x689F38, capeDark: 0x558B2F,
      pantColor: 0x5D4037, pantDark: 0x4E342E,
      bootColor: 0x5D4037, bootDark: 0x3E2723,
    };
    this.registerTexture('npc_farmer', () => this.createChibiCharacter('down', 'idle', 0, farmerPalette, 'npc_farmer', false, false));

    const childPalette = {
      hair: 0xFFB74D, hairLight: 0xFFCC80, hairDark: 0xFFA726,
      skin: 0xFFE0BD, skinLight: 0xFFF0D8, skinShadow: 0xE8C4A0,
      eyeIris: 0x42A5F5, eyeIrisDark: 0x1E88E5,
      tunicMain: 0x66BB6A, tunicLight: 0x81C784, tunicDark: 0x43A047,
      trimColor: 0xFFEB3B, trimLight: 0xFFF176,
      capeMain: 0x66BB6A, capeDark: 0x43A047,
      pantColor: 0x5D4037, pantDark: 0x4E342E,
      bootColor: 0x6D4C41, bootDark: 0x5D4037,
    };
    this.registerTexture('npc_child', () => this.createChibiCharacter('down', 'idle', 0, childPalette, 'npc_child', false, false));

    const groveWardenPalette = {
      hair: 0x8B4513, hairLight: 0xA0522D, hairDark: 0x5C2E0A,
      skin: 0xD2A679, skinLight: 0xE0BB8A, skinShadow: 0xB08050,
      eyeIris: 0x556B2F, eyeIrisDark: 0x3B4A1F,
      tunicMain: 0x4A5D3A, tunicLight: 0x5E7648, tunicDark: 0x33422A,
      trimColor: 0xB87333, trimLight: 0xD4944A,
      capeMain: 0x3B5028, capeDark: 0x283A1A,
      pantColor: 0x4E3B2A, pantDark: 0x362818,
      bootColor: 0x3E2C1A, bootDark: 0x2A1C0E,
    };
    this.registerTexture('npc_grove_warden', () => this.createChibiCharacter('down', 'idle', 0, groveWardenPalette, 'npc_grove_warden', false, false));

    // Field archaeologist â€” dusty slate coat, amber trim, tawny auburn hair
    const petraPalette = {
      hair: 0x9E6B3C, hairLight: 0xBE8B52, hairDark: 0x7A4E28,
      skin: 0xFFE0BD, skinLight: 0xFFF0D8, skinShadow: 0xE8C4A0,
      eyeIris: 0xC07830, eyeIrisDark: 0x8A5018,
      tunicMain: 0x607060, tunicLight: 0x788878, tunicDark: 0x485048,
      trimColor: 0xC09030, trimLight: 0xE8B840,
      capeMain: 0x8A8070, capeDark: 0x6A6054,
      pantColor: 0x5A5040, pantDark: 0x3E3828,
      bootColor: 0x4A3020, bootDark: 0x321E10,
    };
    this.registerTexture('npc_petra', () => this.createChibiCharacter('down', 'idle', 0, petraPalette, 'npc_petra', false, false));

    // Explorer Ulmund - same chibi human build as the player, his own look via palette:
    // storm-grey oilskin coat, ochre trim, greying ginger hair, blue eyes, sun-darkened
    // skin, weathered brown legs/boots. No sword (he's an explorer, not a fighter).
    const ulmundPalette = {
      hair: 0xB5683A, hairLight: 0xCE8350, hairDark: 0x7A4424,
      skin: 0xC79A6E, skinLight: 0xDCB184, skinShadow: 0xA37A52,
      eyeIris: 0x4A6B8A, eyeIrisDark: 0x30485E,
      tunicMain: 0x4C545C, tunicLight: 0x646E78, tunicDark: 0x343A40,
      trimColor: 0xC8923A, trimLight: 0xE6B453,
      capeMain: 0x6B5A44, capeDark: 0x4A3D2C,
      pantColor: 0x4A4036, pantDark: 0x322A22,
      bootColor: 0x3A2A1C, bootDark: 0x261A10,
    };
    this.registerTexture('npc_ulmund', () => this.createChibiCharacter('down', 'idle', 0, ulmundPalette, 'npc_ulmund', false, false));

    // Olwen - fully custom sprite (hooded hermit with long beard and gnarled staff).
    // Intentionally NOT a chibi palette swap so the player recognises him as a
    // distinct character, not a recolour of the villagers.
    this.registerTexture('npc_olwen', () => this.createOlwenHermit('npc_olwen'));

    // Mysterious Man - void-black cloak with violet corruption hem. No face visible.
    // Distinct from any chibi variant; the Hollow colour palette marks him as dangerous.
    this.registerTexture('npc_mysterious_man', () => this.createMysteriousMan('npc_mysterious_man'));

    // ========== NEW ENEMY: Spider ==========
    const SPIDER_BODY = 0x212121;
    const SPIDER_BODY_H = 0x424242;
    const SPIDER_LEG = 0x37474F;
    const SPIDER_EYE = 0xF44336;
    const SPIDER_FANG = 0xBDBDBD;

    this.registerTexture('enemy_spider', () => this.createSpriteTexture([
      [C,          SPIDER_LEG,C,          C,          C,          C,          SPIDER_LEG,C,          C,          C],
      [SPIDER_LEG, C,         SPIDER_BODY,SPIDER_BODY_H,SPIDER_BODY,SPIDER_BODY_H,C,     SPIDER_LEG, C,         C],
      [C,          SPIDER_BODY,SPIDER_EYE,SPIDER_BODY,SPIDER_BODY,SPIDER_EYE,SPIDER_BODY,C,         C,         C],
      [SPIDER_LEG, SPIDER_BODY,SPIDER_FANG,SPIDER_BODY_H,SPIDER_BODY_H,SPIDER_FANG,SPIDER_BODY,SPIDER_LEG,C,C],
      [C,          SPIDER_BODY_H,SPIDER_BODY,SPIDER_BODY,SPIDER_BODY,SPIDER_BODY,SPIDER_BODY_H,C,  C,         C],
      [SPIDER_LEG, C,         SPIDER_BODY,SPIDER_BODY_H,SPIDER_BODY,SPIDER_BODY,C,     SPIDER_LEG, C,         C],
      [C,          SPIDER_LEG,C,          SPIDER_BODY,SPIDER_BODY,C,          SPIDER_LEG,C,          C,         C],
      [SPIDER_LEG, C,         C,          C,          C,          C,          C,         SPIDER_LEG, C,         C],
    ], 4, 'enemy_spider'));
    this.registerTexture('enemy_spider_telegraph', () => this.createSpriteTexture([
      [C,          C,         SPIDER_LEG, C,          C,          SPIDER_LEG,C,          C,         C,         C],
      [C,          SPIDER_LEG,SPIDER_BODY,SPIDER_BODY_H,SPIDER_BODY,SPIDER_BODY_H,SPIDER_LEG,C,    C,         C],
      [SPIDER_LEG, SPIDER_BODY,SPIDER_EYE,SPIDER_EYE,SPIDER_BODY,SPIDER_EYE,SPIDER_EYE,SPIDER_BODY,SPIDER_LEG,C],
      [C,          SPIDER_BODY,SPIDER_FANG,SPIDER_BODY_H,SPIDER_BODY_H,SPIDER_FANG,SPIDER_BODY,C, C,         C],
      [C,          SPIDER_BODY_H,SPIDER_BODY,SPIDER_BODY,SPIDER_BODY,SPIDER_BODY,SPIDER_BODY_H,C, C,         C],
      [C,          SPIDER_LEG,SPIDER_BODY,SPIDER_BODY_H,SPIDER_BODY,SPIDER_BODY,SPIDER_LEG,C,     C,         C],
      [SPIDER_LEG, C,         C,          SPIDER_BODY,SPIDER_BODY,C,          C,         SPIDER_LEG,C,       C],
      [C,          C,         SPIDER_LEG, C,          C,          SPIDER_LEG,C,          C,         C,       C],
    ], 4, 'enemy_spider_telegraph'));
    this.registerTexture('enemy_spider_attack', () => this.createSpriteTexture([
      [SPIDER_LEG, C,         C,          C,          C,          C,          C,         C,         SPIDER_LEG,C],
      [C,          SPIDER_LEG,SPIDER_BODY,SPIDER_BODY_H,SPIDER_BODY,SPIDER_BODY_H,C,    SPIDER_LEG,C,       C],
      [SPIDER_LEG, SPIDER_BODY,SPIDER_EYE,SPIDER_BODY,SPIDER_BODY,SPIDER_EYE,SPIDER_BODY,SPIDER_LEG,C,      C],
      [C,          SPIDER_BODY,SPIDER_FANG,SPIDER_FANG,SPIDER_BODY_H,SPIDER_BODY_H,SPIDER_FANG,SPIDER_FANG,C,C],
      [C,          SPIDER_BODY_H,SPIDER_BODY,SPIDER_BODY,SPIDER_BODY,SPIDER_BODY,SPIDER_BODY_H,C, C,        C],
      [SPIDER_LEG, C,         SPIDER_BODY,SPIDER_BODY_H,SPIDER_BODY,SPIDER_BODY,C,     SPIDER_LEG,C,       C],
      [C,          SPIDER_LEG,C,          SPIDER_BODY,SPIDER_BODY,C,          SPIDER_LEG,C,        C,      C],
      [SPIDER_LEG, C,         C,          C,          C,          C,          C,        SPIDER_LEG,C,       C],
    ], 4, 'enemy_spider_attack'));

    this.registerTexture('enemy_spider_walk_0', () => this.createSpriteTexture([
      [C,          SPIDER_LEG,C,          C,          C,          C,          SPIDER_LEG,C,          C,          C],
      [SPIDER_LEG, C,         SPIDER_BODY,SPIDER_BODY_H,SPIDER_BODY,SPIDER_BODY_H,C,     SPIDER_LEG, C,         C],
      [C,          SPIDER_BODY,SPIDER_EYE,SPIDER_BODY,SPIDER_BODY,SPIDER_EYE,SPIDER_BODY,C,         C,         C],
      [SPIDER_LEG, SPIDER_BODY,SPIDER_FANG,SPIDER_BODY_H,SPIDER_BODY_H,SPIDER_FANG,SPIDER_BODY,SPIDER_LEG,C,C],
      [C,          SPIDER_BODY_H,SPIDER_BODY,SPIDER_BODY,SPIDER_BODY,SPIDER_BODY,SPIDER_BODY_H,C,  C,         C],
      [SPIDER_LEG, C,         SPIDER_BODY,SPIDER_BODY_H,SPIDER_BODY,SPIDER_BODY,C,     SPIDER_LEG, C,         C],
      [C,          SPIDER_LEG,C,          SPIDER_BODY,SPIDER_BODY,C,          SPIDER_LEG,C,          C,         C],
      [SPIDER_LEG, C,         C,          C,          C,          C,          C,         SPIDER_LEG, C,         C],
    ], 4, 'enemy_spider_walk_0'));

    this.registerTexture('enemy_spider_walk_1', () => this.createSpriteTexture([
      [SPIDER_LEG, C,         C,          C,          C,          C,          C,         SPIDER_LEG, C,         C],
      [C,          SPIDER_LEG,SPIDER_BODY,SPIDER_BODY_H,SPIDER_BODY,SPIDER_BODY_H,SPIDER_LEG,C,     C,         C],
      [SPIDER_LEG, SPIDER_BODY,SPIDER_EYE,SPIDER_BODY,SPIDER_BODY,SPIDER_EYE,SPIDER_BODY,SPIDER_LEG,C,       C],
      [C,          SPIDER_BODY,SPIDER_FANG,SPIDER_BODY_H,SPIDER_BODY_H,SPIDER_FANG,SPIDER_BODY,C,  C,        C],
      [SPIDER_LEG, SPIDER_BODY_H,SPIDER_BODY,SPIDER_BODY,SPIDER_BODY,SPIDER_BODY,SPIDER_BODY_H,SPIDER_LEG,C, C],
      [C,          SPIDER_LEG,SPIDER_BODY,SPIDER_BODY_H,SPIDER_BODY,SPIDER_BODY,SPIDER_LEG,C,      C,        C],
      [SPIDER_LEG, C,         C,          SPIDER_BODY,SPIDER_BODY,C,          C,         SPIDER_LEG,C,       C],
      [C,          SPIDER_LEG,C,          C,          C,          C,          SPIDER_LEG,C,        C,        C],
    ], 4, 'enemy_spider_walk_1'));

    this.registerTexture('enemy_spider_walk_2', () => this.createSpriteTexture([
      [C,          C,         SPIDER_LEG, C,          C,          SPIDER_LEG,C,         C,          C,        C],
      [SPIDER_LEG, C,         SPIDER_BODY,SPIDER_BODY_H,SPIDER_BODY,SPIDER_BODY_H,C,     SPIDER_LEG,C,        C],
      [C,          SPIDER_BODY,SPIDER_EYE,SPIDER_BODY,SPIDER_BODY,SPIDER_EYE,SPIDER_BODY,C,       C,        C],
      [SPIDER_LEG, SPIDER_BODY,SPIDER_FANG,SPIDER_BODY_H,SPIDER_BODY_H,SPIDER_FANG,SPIDER_BODY,SPIDER_LEG,C,C],
      [C,          SPIDER_BODY_H,SPIDER_BODY,SPIDER_BODY,SPIDER_BODY,SPIDER_BODY,SPIDER_BODY_H,C,  C,       C],
      [SPIDER_LEG, C,         SPIDER_BODY,SPIDER_BODY_H,SPIDER_BODY,SPIDER_BODY,C,     SPIDER_LEG,C,        C],
      [C,          SPIDER_LEG,C,          SPIDER_BODY,SPIDER_BODY,C,          SPIDER_LEG,C,        C,       C],
      [C,          C,         SPIDER_LEG, C,          C,          SPIDER_LEG,C,         C,          C,       C],
    ], 4, 'enemy_spider_walk_2'));

    this.registerTexture('enemy_spider_walk_3', () => this.createSpriteTexture([
      [C,          SPIDER_LEG,C,          C,          C,          C,          SPIDER_LEG,C,          C,      C],
      [C,          C,         SPIDER_BODY,SPIDER_BODY_H,SPIDER_BODY,SPIDER_BODY_H,C,     C,          C,      C],
      [SPIDER_LEG, SPIDER_BODY,SPIDER_EYE,SPIDER_BODY,SPIDER_BODY,SPIDER_EYE,SPIDER_BODY,SPIDER_LEG,C,      C],
      [C,          SPIDER_BODY,SPIDER_FANG,SPIDER_BODY_H,SPIDER_BODY_H,SPIDER_FANG,SPIDER_BODY,C,  C,       C],
      [SPIDER_LEG, SPIDER_BODY_H,SPIDER_BODY,SPIDER_BODY,SPIDER_BODY,SPIDER_BODY,SPIDER_BODY_H,SPIDER_LEG,C,C],
      [C,          C,         SPIDER_BODY,SPIDER_BODY_H,SPIDER_BODY,SPIDER_BODY,C,      C,         C,       C],
      [C,          SPIDER_LEG,C,          SPIDER_BODY,SPIDER_BODY,C,          SPIDER_LEG,C,        C,       C],
      [SPIDER_LEG, C,         C,          C,          C,          C,          C,         SPIDER_LEG,C,       C],
    ], 4, 'enemy_spider_walk_3'));

    // Stagger - legs yanked inward, body tilted off-balance
    this.registerTexture('enemy_spider_stagger', () => this.createSpriteTexture([
      [C,          SPIDER_LEG, SPIDER_LEG, C,          C,          C,          SPIDER_LEG, C,          C,         C],
      [C,          SPIDER_BODY_H,SPIDER_BODY,SPIDER_BODY,SPIDER_BODY_H,SPIDER_BODY,C,       SPIDER_LEG, C,         C],
      [SPIDER_LEG, SPIDER_BODY,SPIDER_EYE, SPIDER_BODY,SPIDER_BODY,SPIDER_EYE, SPIDER_BODY,C,          C,         C],
      [C,          SPIDER_BODY,SPIDER_FANG,SPIDER_BODY_H,SPIDER_BODY,SPIDER_FANG,SPIDER_BODY,SPIDER_LEG,C,        C],
      [C,          SPIDER_BODY_H,SPIDER_BODY,SPIDER_BODY,SPIDER_BODY,SPIDER_BODY,SPIDER_BODY_H,C,        C,        C],
      [SPIDER_LEG, C,          SPIDER_LEG, SPIDER_BODY_H,SPIDER_BODY,C,          SPIDER_LEG, C,          C,        C],
      [C,          SPIDER_LEG, C,          C,          SPIDER_BODY, C,          C,          SPIDER_LEG, C,         C],
      [C,          C,          SPIDER_LEG, C,          C,          SPIDER_LEG, C,          C,          C,         C],
    ], 4, 'enemy_spider_stagger'));

    // ========== NEW ENEMY: Slime ==========
    const SLIME_BODY = 0x4CAF50;
    const SLIME_H = 0x66BB6A;
    const SLIME_S = 0x2E7D32;
    const SLIME_EYE = 0xFFFFFF;
    const SLIME_PUPIL = 0x212121;
    const SLIME_SHINE = 0xA5D6A7;

    this.registerTexture('enemy_slime', () => this.createSpriteTexture([
      [C,          C,          SLIME_H,   SLIME_H,   SLIME_H,   C,          C,          C],
      [C,          SLIME_H,   SLIME_SHINE,SLIME_BODY,SLIME_BODY,SLIME_H,   C,          C],
      [SLIME_S,   SLIME_BODY,SLIME_EYE, SLIME_BODY,SLIME_EYE, SLIME_BODY,SLIME_S,    C],
      [SLIME_S,   SLIME_BODY,SLIME_PUPIL,SLIME_BODY,SLIME_PUPIL,SLIME_BODY,SLIME_S,  C],
      [C,          SLIME_BODY,SLIME_BODY,SLIME_BODY,SLIME_BODY,SLIME_BODY,C,          C],
      [C,          SLIME_S,   SLIME_BODY,SLIME_S,   SLIME_BODY,SLIME_S,   C,          C],
    ], 4, 'enemy_slime'));
    this.registerTexture('enemy_slime_telegraph', () => this.createSpriteTexture([
      [C,          C,          C,          C,          C,          C,          C,          C],
      [C,          C,          SLIME_SHINE,SLIME_H,   SLIME_H,   C,          C,          C],
      [C,          SLIME_S,   SLIME_BODY,SLIME_BODY,SLIME_BODY,SLIME_S,   C,          C],
      [SLIME_S,   SLIME_BODY,SLIME_EYE, SLIME_BODY,SLIME_EYE, SLIME_BODY,SLIME_S,    C],
      [SLIME_S,   SLIME_BODY,SLIME_PUPIL,SLIME_BODY,SLIME_PUPIL,SLIME_BODY,SLIME_S,  C],
      [C,          SLIME_S,   SLIME_S,   SLIME_BODY,SLIME_S,   SLIME_S,   C,          C],
    ], 4, 'enemy_slime_telegraph'));
    this.registerTexture('enemy_slime_attack', () => this.createSpriteTexture([
      [C,          C,          SLIME_H,   SLIME_H,   SLIME_H,   C,          C,          C],
      [C,          SLIME_H,   SLIME_SHINE,SLIME_BODY,SLIME_BODY,SLIME_H,   SLIME_H,   C],
      [SLIME_S,   SLIME_BODY,SLIME_EYE, SLIME_BODY,SLIME_EYE, SLIME_BODY,SLIME_BODY,SLIME_S],
      [SLIME_S,   SLIME_BODY,SLIME_PUPIL,SLIME_BODY,SLIME_PUPIL,SLIME_BODY,SLIME_BODY,SLIME_S],
      [C,          SLIME_BODY,SLIME_BODY,SLIME_BODY,SLIME_BODY,SLIME_BODY,SLIME_H,   C],
      [C,          SLIME_S,   SLIME_BODY,SLIME_S,   SLIME_BODY,SLIME_S,   C,          C],
    ], 4, 'enemy_slime_attack'));

    // Stagger - squashed flat by impact, body wide and low
    this.registerTexture('enemy_slime_stagger', () => this.createSpriteTexture([
      [C,          C,          C,          C,          C,          C,          C,          C         ],
      [SLIME_S,    SLIME_H,    SLIME_SHINE,SLIME_H,    SLIME_H,    SLIME_H,    SLIME_S,    C         ],
      [SLIME_S,    SLIME_BODY, SLIME_EYE,  SLIME_BODY, SLIME_EYE,  SLIME_BODY, SLIME_S,    C         ],
      [SLIME_S,    SLIME_BODY, SLIME_PUPIL,SLIME_BODY, SLIME_PUPIL,SLIME_BODY, SLIME_S,    C         ],
      [SLIME_S,    SLIME_BODY, SLIME_BODY, SLIME_BODY, SLIME_BODY, SLIME_BODY, SLIME_S,    C         ],
      [SLIME_S,    SLIME_S,    SLIME_BODY, SLIME_BODY, SLIME_BODY, SLIME_S,    SLIME_S,    C         ],
    ], 4, 'enemy_slime_stagger'));

    const WSLIME_BODY = 0x46B8D8;
    const WSLIME_H = 0x7EDCFF;
    const WSLIME_S = 0x1F6FA0;
    const WSLIME_DEEP = 0x134B78;
    const WSLIME_FOAM = 0xE9FFFF;
    const WSLIME_SHELL = 0xF4D6A2;
    const WSLIME_SHELL_S = 0xB98455;

    this.registerTexture('enemy_water_slime', () => this.createSpriteTexture([
      [C,           C,           WSLIME_H,    WSLIME_H,    WSLIME_H,    C,           C,           C],
      [C,           WSLIME_H,    WSLIME_FOAM, WSLIME_BODY, WSLIME_BODY, WSLIME_H,    C,           C],
      [WSLIME_S,    WSLIME_BODY, SLIME_EYE,   WSLIME_BODY, SLIME_EYE,   WSLIME_BODY, WSLIME_S,    C],
      [WSLIME_S,    WSLIME_BODY, SLIME_PUPIL, WSLIME_BODY, SLIME_PUPIL, WSLIME_BODY, WSLIME_S,    C],
      [C,           WSLIME_BODY, WSLIME_BODY, WSLIME_H,    WSLIME_BODY, WSLIME_BODY, C,           C],
      [C,           WSLIME_DEEP, WSLIME_S,    WSLIME_FOAM, WSLIME_S,    WSLIME_DEEP, C,           C],
    ], 4, 'enemy_water_slime'));
    this.registerTexture('enemy_water_slime_telegraph', () => this.createSpriteTexture([
      [C,           C,           WSLIME_FOAM, WSLIME_H,    WSLIME_H,    C,           C,           C],
      [C,           WSLIME_H,    WSLIME_BODY, WSLIME_BODY, WSLIME_BODY, WSLIME_H,    C,           C],
      [WSLIME_S,    WSLIME_BODY, SLIME_EYE,   WSLIME_BODY, SLIME_EYE,   WSLIME_BODY, WSLIME_S,    C],
      [WSLIME_S,    WSLIME_BODY, SLIME_PUPIL, WSLIME_BODY, SLIME_PUPIL, WSLIME_BODY, WSLIME_S,    C],
      [C,           WSLIME_BODY, WSLIME_SHELL, WSLIME_SHELL, WSLIME_BODY, WSLIME_BODY, C,          C],
      [C,           WSLIME_DEEP, WSLIME_FOAM, WSLIME_S,     WSLIME_FOAM, WSLIME_DEEP, C,          C],
    ], 4, 'enemy_water_slime_telegraph'));
    this.registerTexture('enemy_water_slime_attack', () => this.createSpriteTexture([
      [C,           C,           WSLIME_H,    WSLIME_H,    WSLIME_H,     C,          C,           C],
      [C,           WSLIME_H,    WSLIME_BODY, WSLIME_BODY, WSLIME_BODY,  WSLIME_H,   C,           C],
      [WSLIME_S,    WSLIME_BODY, SLIME_EYE,   WSLIME_BODY, SLIME_EYE,    WSLIME_BODY,WSLIME_S,    C],
      [C,           WSLIME_S,    SLIME_PUPIL, WSLIME_SHELL,WSLIME_SHELL, WSLIME_S,  WSLIME_SHELL_S,C],
      [C,           WSLIME_BODY, WSLIME_BODY, WSLIME_SHELL,WSLIME_BODY,  WSLIME_BODY,C,           C],
      [C,           WSLIME_DEEP, WSLIME_FOAM, WSLIME_DEEP, WSLIME_FOAM,  WSLIME_DEEP,C,           C],
    ], 4, 'enemy_water_slime_attack'));

    // Stagger - squashed flat, water splashing at base
    this.registerTexture('enemy_water_slime_stagger', () => this.createSpriteTexture([
      [C,           C,           C,           C,           C,           C,           C,           C          ],
      [WSLIME_S,    WSLIME_H,    WSLIME_FOAM, WSLIME_H,    WSLIME_H,    WSLIME_FOAM, WSLIME_S,    C          ],
      [WSLIME_S,    WSLIME_BODY, SLIME_EYE,   WSLIME_BODY, SLIME_EYE,   WSLIME_BODY, WSLIME_S,    C          ],
      [WSLIME_S,    WSLIME_BODY, SLIME_PUPIL, WSLIME_BODY, SLIME_PUPIL, WSLIME_BODY, WSLIME_S,    C          ],
      [WSLIME_S,    WSLIME_BODY, WSLIME_BODY, WSLIME_BODY, WSLIME_BODY, WSLIME_BODY, WSLIME_S,    C          ],
      [WSLIME_DEEP, WSLIME_S,    WSLIME_FOAM, WSLIME_BODY, WSLIME_FOAM, WSLIME_S,    WSLIME_DEEP, C          ],
    ], 4, 'enemy_water_slime_stagger'));

    // ========== CORRUPTED GIANT ==========
    this.registerTexture('enemy_corrupted_giant', () => this.createCorruptedGiant('enemy_corrupted_giant'));
    this.registerTexture('enemy_corrupted_giant_telegraph', () => this.createCorruptedGiant('enemy_corrupted_giant_telegraph', true));
    this.registerTexture('enemy_corrupted_giant_attack', () => this.createCorruptedGiant('enemy_corrupted_giant_attack', false, true));

    // ========== ENEMY SPRITES ==========
    const WOLF_FUR = 0x616161;
    const WOLF_FUR_H = 0x757575;
    const WOLF_FUR_S = 0x424242;
    const WOLF_EYE = 0xFFEB3B;
    const WOLF_SNOUT = 0x9E9E9E;
    const WOLF_FANG = 0xFAFAFA;

    this.registerTexture('enemy_wolf', () => this.createSpriteTexture([
      [C,        C,        WOLF_FUR, WOLF_FUR_H,C,       C,        WOLF_FUR_H,WOLF_FUR,C,        C],
      [C,        WOLF_FUR, WOLF_FUR_H,WOLF_FUR,WOLF_FUR,WOLF_FUR, WOLF_FUR, WOLF_FUR_H,WOLF_FUR,C],
      [C,        WOLF_FUR, WOLF_EYE,WOLF_FUR,  WOLF_FUR,WOLF_FUR, WOLF_EYE, WOLF_FUR, C,        C],
      [C,        C,        WOLF_FUR,WOLF_SNOUT,WOLF_SNOUT,WOLF_SNOUT,WOLF_FUR,C,       C,        C],
      [C,        C,        C,       WOLF_FANG, WOLF_SNOUT,WOLF_FANG,C,       C,        C,        C],
      [WOLF_FUR_S,WOLF_FUR,WOLF_FUR,WOLF_FUR_H,WOLF_FUR,WOLF_FUR_H,WOLF_FUR,WOLF_FUR,WOLF_FUR_S,C],
      [C,        WOLF_FUR_S,WOLF_FUR,WOLF_FUR, WOLF_FUR_S,WOLF_FUR,WOLF_FUR,WOLF_FUR_S,C,       C],
      [C,        C,        WOLF_FUR_S,C,       WOLF_FUR_S,C,       WOLF_FUR_S,C,       C,        C],
    ], 4, 'enemy_wolf'));

    const WOLF_EYE_GLOW = 0xFFFF00;
    const WOLF_WARN = 0xFF5722;
    this.registerTexture('enemy_wolf_telegraph', () => this.createSpriteTexture([
      [C,        C,        C,        C,        C,       C,        C,        C,        C,        C],
      [C,        C,        WOLF_FUR, WOLF_FUR_H,C,       C,        WOLF_FUR_H,WOLF_FUR,C,       C],
      [C,        WOLF_FUR, WOLF_EYE_GLOW,WOLF_FUR,WOLF_FUR,WOLF_FUR, WOLF_EYE_GLOW, WOLF_FUR, C,C],
      [C,        C,        WOLF_FUR,WOLF_SNOUT,WOLF_WARN,WOLF_SNOUT,WOLF_FUR,C,       C,        C],
      [C,        C,        C,       WOLF_FANG, WOLF_WARN,WOLF_FANG,C,       C,        C,        C],
      [WOLF_FUR_S,WOLF_FUR,WOLF_FUR,WOLF_FUR_H,WOLF_FUR_S,WOLF_FUR_H,WOLF_FUR,WOLF_FUR,WOLF_FUR_S,C],
      [C,        WOLF_FUR_S,WOLF_FUR_S,WOLF_FUR_S,WOLF_FUR_S,WOLF_FUR_S,WOLF_FUR_S,WOLF_FUR_S,C,C],
      [C,        WOLF_FUR_S,C,       WOLF_FUR_S,C,       WOLF_FUR_S,C,       WOLF_FUR_S,C,      C],
    ], 4, 'enemy_wolf_telegraph'));

    this.registerTexture('enemy_wolf_attack', () => this.createSpriteTexture([
      [C,        C,        WOLF_FUR_H,WOLF_FUR_H,C,       C,        WOLF_FUR_H,WOLF_FUR_H,C,    C],
      [C,        WOLF_FUR, WOLF_FUR_H,WOLF_FUR,WOLF_FUR,WOLF_FUR, WOLF_FUR, WOLF_FUR_H,WOLF_FUR,C],
      [C,        WOLF_FUR, WOLF_EYE_GLOW,WOLF_FUR,WOLF_FUR,WOLF_FUR, WOLF_EYE_GLOW, WOLF_FUR, C,C],
      [C,        WOLF_FANG,WOLF_FUR,WOLF_WARN,WOLF_WARN,WOLF_WARN,WOLF_FUR,WOLF_FANG,C,        C],
      [C,        C,        WOLF_FANG,WOLF_WARN,WOLF_WARN,WOLF_WARN,WOLF_FANG,C,       C,        C],
      [WOLF_FUR_S,WOLF_FUR,WOLF_FUR,WOLF_FUR_H,WOLF_FUR,WOLF_FUR_H,WOLF_FUR,WOLF_FUR,WOLF_FUR_S,C],
      [C,        WOLF_FUR_S,WOLF_FUR,WOLF_FUR, WOLF_FUR_S,WOLF_FUR,WOLF_FUR,WOLF_FUR_S,C,       C],
      [C,        C,        WOLF_FUR_S,C,       WOLF_FUR_S,C,       WOLF_FUR_S,C,       C,        C],
    ], 4, 'enemy_wolf_attack'));

    this.registerTexture('enemy_wolf_walk_0', () => this.createSpriteTexture([
      [C,        C,        WOLF_FUR, WOLF_FUR_H,C,       C,        WOLF_FUR_H,WOLF_FUR,C,        C],
      [C,        WOLF_FUR, WOLF_FUR_H,WOLF_FUR,WOLF_FUR,WOLF_FUR, WOLF_FUR, WOLF_FUR_H,WOLF_FUR,C],
      [C,        WOLF_FUR, WOLF_EYE,WOLF_FUR,  WOLF_FUR,WOLF_FUR, WOLF_EYE, WOLF_FUR, C,        C],
      [C,        C,        WOLF_FUR,WOLF_SNOUT,WOLF_SNOUT,WOLF_SNOUT,WOLF_FUR,C,       C,        C],
      [C,        C,        C,       WOLF_FANG, WOLF_SNOUT,WOLF_FANG,C,       C,        C,        C],
      [WOLF_FUR_S,WOLF_FUR,WOLF_FUR,WOLF_FUR_H,WOLF_FUR,WOLF_FUR_H,WOLF_FUR,WOLF_FUR,WOLF_FUR_S,C],
      [C,        WOLF_FUR_S,WOLF_FUR,WOLF_FUR, WOLF_FUR_S,WOLF_FUR,WOLF_FUR,WOLF_FUR_S,C,       C],
      [C,        WOLF_FUR_S,C,       C,        WOLF_FUR_S,C,       C,       WOLF_FUR_S,C,        C],
    ], 4, 'enemy_wolf_walk_0'));

    this.registerTexture('enemy_wolf_walk_1', () => this.createSpriteTexture([
      [C,        C,        WOLF_FUR, WOLF_FUR_H,C,       C,        WOLF_FUR_H,WOLF_FUR,C,        C],
      [C,        WOLF_FUR, WOLF_FUR_H,WOLF_FUR,WOLF_FUR,WOLF_FUR, WOLF_FUR, WOLF_FUR_H,WOLF_FUR,C],
      [C,        WOLF_FUR, WOLF_EYE,WOLF_FUR,  WOLF_FUR,WOLF_FUR, WOLF_EYE, WOLF_FUR, C,        C],
      [C,        C,        WOLF_FUR,WOLF_SNOUT,WOLF_SNOUT,WOLF_SNOUT,WOLF_FUR,C,       C,        C],
      [C,        C,        C,       WOLF_FANG, WOLF_SNOUT,WOLF_FANG,C,       C,        C,        C],
      [WOLF_FUR_S,WOLF_FUR,WOLF_FUR,WOLF_FUR_H,WOLF_FUR,WOLF_FUR_H,WOLF_FUR,WOLF_FUR,WOLF_FUR_S,C],
      [C,        WOLF_FUR_S,WOLF_FUR,WOLF_FUR, WOLF_FUR_S,WOLF_FUR,WOLF_FUR,WOLF_FUR_S,C,       C],
      [C,        C,        WOLF_FUR_S,C,       C,       WOLF_FUR_S,WOLF_FUR_S,C,       C,        C],
    ], 4, 'enemy_wolf_walk_1'));

    this.registerTexture('enemy_wolf_walk_2', () => this.createSpriteTexture([
      [C,        C,        WOLF_FUR, WOLF_FUR_H,C,       C,        WOLF_FUR_H,WOLF_FUR,C,        C],
      [C,        WOLF_FUR, WOLF_FUR_H,WOLF_FUR,WOLF_FUR,WOLF_FUR, WOLF_FUR, WOLF_FUR_H,WOLF_FUR,C],
      [C,        WOLF_FUR, WOLF_EYE,WOLF_FUR,  WOLF_FUR,WOLF_FUR, WOLF_EYE, WOLF_FUR, C,        C],
      [C,        C,        WOLF_FUR,WOLF_SNOUT,WOLF_SNOUT,WOLF_SNOUT,WOLF_FUR,C,       C,        C],
      [C,        C,        C,       WOLF_FANG, WOLF_SNOUT,WOLF_FANG,C,       C,        C,        C],
      [WOLF_FUR_S,WOLF_FUR,WOLF_FUR,WOLF_FUR_H,WOLF_FUR,WOLF_FUR_H,WOLF_FUR,WOLF_FUR,WOLF_FUR_S,C],
      [C,        WOLF_FUR_S,WOLF_FUR,WOLF_FUR, WOLF_FUR_S,WOLF_FUR,WOLF_FUR,WOLF_FUR_S,C,       C],
      [C,        C,        WOLF_FUR_S,WOLF_FUR_S,C,       C,       WOLF_FUR_S,C,       C,        C],
    ], 4, 'enemy_wolf_walk_2'));

    this.registerTexture('enemy_wolf_walk_3', () => this.createSpriteTexture([
      [C,        C,        WOLF_FUR, WOLF_FUR_H,C,       C,        WOLF_FUR_H,WOLF_FUR,C,        C],
      [C,        WOLF_FUR, WOLF_FUR_H,WOLF_FUR,WOLF_FUR,WOLF_FUR, WOLF_FUR, WOLF_FUR_H,WOLF_FUR,C],
      [C,        WOLF_FUR, WOLF_EYE,WOLF_FUR,  WOLF_FUR,WOLF_FUR, WOLF_EYE, WOLF_FUR, C,        C],
      [C,        C,        WOLF_FUR,WOLF_SNOUT,WOLF_SNOUT,WOLF_SNOUT,WOLF_FUR,C,       C,        C],
      [C,        C,        C,       WOLF_FANG, WOLF_SNOUT,WOLF_FANG,C,       C,        C,        C],
      [WOLF_FUR_S,WOLF_FUR,WOLF_FUR,WOLF_FUR_H,WOLF_FUR,WOLF_FUR_H,WOLF_FUR,WOLF_FUR,WOLF_FUR_S,C],
      [C,        WOLF_FUR_S,WOLF_FUR,WOLF_FUR, WOLF_FUR_S,WOLF_FUR,WOLF_FUR,WOLF_FUR_S,C,       C],
      [C,        WOLF_FUR_S,C,       C,        WOLF_FUR_S,C,       WOLF_FUR_S,C,       C,        C],
    ], 4, 'enemy_wolf_walk_3'));

    // Stagger - head lowered, both eyes wide/dazed, legs buckled and splayed
    this.registerTexture('enemy_wolf_stagger', () => this.createSpriteTexture([
      [C,         C,         WOLF_FUR,   WOLF_FUR_H, WOLF_FUR_H,  WOLF_FUR_H,  WOLF_FUR_H, WOLF_FUR,   C,         C],
      [C,         WOLF_FUR,  WOLF_FUR_H, WOLF_FUR,   WOLF_EYE,    WOLF_EYE,    WOLF_FUR,   WOLF_FUR_H, WOLF_FUR,  C],
      [C,         C,         WOLF_FUR,   WOLF_SNOUT, WOLF_SNOUT,  WOLF_SNOUT,  WOLF_SNOUT, WOLF_FUR,   C,         C],
      [C,         C,         WOLF_FANG,  WOLF_SNOUT, WOLF_SNOUT,  WOLF_SNOUT,  WOLF_FANG,  C,          C,         C],
      [WOLF_FUR_S,WOLF_FUR_S,WOLF_FUR,   WOLF_FUR_H, WOLF_FUR_S,  WOLF_FUR_H,  WOLF_FUR,   WOLF_FUR_S, WOLF_FUR_S,C],
      [C,         WOLF_FUR_S,WOLF_FUR,   WOLF_FUR_S, WOLF_FUR,    WOLF_FUR_S,  WOLF_FUR,   WOLF_FUR_S, C,         C],
      [WOLF_FUR_S,C,         WOLF_FUR_S, C,          C,           C,           WOLF_FUR_S, C,          WOLF_FUR_S,C],
      [C,         C,         C,          C,          C,           C,           C,          C,          C,         C],
    ], 4, 'enemy_wolf_stagger'));

    // Armored wolf â€” darker fur with iron plate accents
    const AW_FUR  = 0x3E3E3E;
    const AW_FUR_H = 0x505050;
    const AW_FUR_S = 0x2A2A2A;
    const AW_EYE  = 0xFF6D00;
    const AW_SNOUT = 0x757575;
    const AW_FANG = 0xF5F5F5;
    const AW_PLATE = 0x78909C;
    const AW_PLATE_H = 0x90A4AE;

    this.registerTexture('enemy_armored_wolf', () => this.createSpriteTexture([
      [C,       C,       AW_FUR,  AW_FUR_H, C,        C,        AW_FUR_H,AW_FUR,  C,       C],
      [C,       AW_FUR,  AW_FUR_H,AW_FUR,   AW_PLATE_H,AW_PLATE_H,AW_FUR,AW_FUR_H,AW_FUR, C],
      [C,       AW_FUR,  AW_EYE,  AW_FUR,   AW_PLATE, AW_PLATE, AW_EYE, AW_FUR,  C,       C],
      [C,       C,       AW_FUR,  AW_SNOUT, AW_SNOUT, AW_SNOUT, AW_FUR, C,       C,       C],
      [C,       C,       C,       AW_FANG,  AW_SNOUT, AW_FANG,  C,      C,       C,       C],
      [AW_FUR_S,AW_PLATE,AW_PLATE,AW_PLATE_H,AW_FUR,  AW_PLATE_H,AW_PLATE,AW_PLATE,AW_FUR_S,C],
      [C,       AW_FUR_S,AW_PLATE,AW_FUR,   AW_FUR_S, AW_FUR,  AW_PLATE,AW_FUR_S,C,       C],
      [C,       C,       AW_FUR_S,C,        AW_FUR_S, C,       AW_FUR_S,C,       C,       C],
    ], 4, 'enemy_armored_wolf'));

    this.registerTexture('enemy_armored_wolf_telegraph', () => this.createSpriteTexture([
      [C,       C,       C,       C,        C,        C,        C,       C,       C,       C],
      [C,       C,       AW_FUR,  AW_FUR_H, AW_PLATE_H,AW_PLATE_H,AW_FUR_H,AW_FUR,C,      C],
      [C,       AW_FUR,  0xFFFF00,AW_FUR,   AW_PLATE, AW_PLATE, 0xFFFF00,AW_FUR, C,       C],
      [C,       C,       AW_FUR,  AW_SNOUT, 0xFF5722, AW_SNOUT, AW_FUR, C,       C,       C],
      [C,       C,       C,       AW_FANG,  0xFF5722, AW_FANG,  C,      C,       C,       C],
      [AW_FUR_S,AW_PLATE,AW_PLATE,AW_PLATE_H,AW_FUR_S,AW_PLATE_H,AW_PLATE,AW_PLATE,AW_FUR_S,C],
      [C,       AW_FUR_S,AW_FUR_S,AW_FUR_S, AW_FUR_S, AW_FUR_S,AW_FUR_S,AW_FUR_S,C,       C],
      [C,       AW_FUR_S,C,       AW_FUR_S, C,        AW_FUR_S,C,       AW_FUR_S,C,       C],
    ], 4, 'enemy_armored_wolf_telegraph'));

    this.registerTexture('enemy_armored_wolf_attack', () => this.createSpriteTexture([
      [C,       C,       AW_FUR_H,AW_FUR_H, C,        C,        AW_FUR_H,AW_FUR_H,C,       C],
      [C,       AW_FUR,  AW_FUR_H,AW_FUR,   AW_PLATE_H,AW_PLATE_H,AW_FUR,AW_FUR_H,AW_FUR, C],
      [C,       AW_FUR,  0xFFFF00,AW_FUR,   AW_PLATE, AW_PLATE, 0xFFFF00,AW_FUR, C,       C],
      [C,       AW_FANG, AW_FUR,  0xFF5722, 0xFF5722, 0xFF5722, AW_FUR, AW_FANG, C,       C],
      [C,       C,       AW_FANG, 0xFF5722, 0xFF5722, 0xFF5722, AW_FANG,C,       C,       C],
      [AW_FUR_S,AW_PLATE,AW_PLATE,AW_PLATE_H,AW_FUR,  AW_PLATE_H,AW_PLATE,AW_PLATE,AW_FUR_S,C],
      [C,       AW_FUR_S,AW_PLATE,AW_FUR,   AW_FUR_S, AW_FUR,  AW_PLATE,AW_FUR_S,C,       C],
      [C,       C,       AW_FUR_S,C,        AW_FUR_S, C,       AW_FUR_S,C,       C,       C],
    ], 4, 'enemy_armored_wolf_attack'));

    this.registerTexture('enemy_armored_wolf_walk_0', () => this.createSpriteTexture([
      [C,       C,       AW_FUR,  AW_FUR_H, C,        C,        AW_FUR_H,AW_FUR,  C,       C],
      [C,       AW_FUR,  AW_FUR_H,AW_FUR,   AW_PLATE_H,AW_PLATE_H,AW_FUR,AW_FUR_H,AW_FUR, C],
      [C,       AW_FUR,  AW_EYE,  AW_FUR,   AW_PLATE, AW_PLATE, AW_EYE, AW_FUR,  C,       C],
      [C,       C,       AW_FUR,  AW_SNOUT, AW_SNOUT, AW_SNOUT, AW_FUR, C,       C,       C],
      [C,       C,       C,       AW_FANG,  AW_SNOUT, AW_FANG,  C,      C,       C,       C],
      [AW_FUR_S,AW_PLATE,AW_PLATE,AW_PLATE_H,AW_FUR,  AW_PLATE_H,AW_PLATE,AW_PLATE,AW_FUR_S,C],
      [C,       AW_FUR_S,AW_PLATE,AW_FUR,   AW_FUR_S, AW_FUR,  AW_PLATE,AW_FUR_S,C,       C],
      [C,       AW_FUR_S,C,       C,        AW_FUR_S, C,       C,      AW_FUR_S,C,       C],
    ], 4, 'enemy_armored_wolf_walk_0'));

    this.registerTexture('enemy_armored_wolf_walk_1', () => this.createSpriteTexture([
      [C,       C,       AW_FUR,  AW_FUR_H, C,        C,        AW_FUR_H,AW_FUR,  C,       C],
      [C,       AW_FUR,  AW_FUR_H,AW_FUR,   AW_PLATE_H,AW_PLATE_H,AW_FUR,AW_FUR_H,AW_FUR, C],
      [C,       AW_FUR,  AW_EYE,  AW_FUR,   AW_PLATE, AW_PLATE, AW_EYE, AW_FUR,  C,       C],
      [C,       C,       AW_FUR,  AW_SNOUT, AW_SNOUT, AW_SNOUT, AW_FUR, C,       C,       C],
      [C,       C,       C,       AW_FANG,  AW_SNOUT, AW_FANG,  C,      C,       C,       C],
      [AW_FUR_S,AW_PLATE,AW_PLATE,AW_PLATE_H,AW_FUR,  AW_PLATE_H,AW_PLATE,AW_PLATE,AW_FUR_S,C],
      [C,       AW_FUR_S,AW_PLATE,AW_FUR,   AW_FUR_S, AW_FUR,  AW_PLATE,AW_FUR_S,C,       C],
      [C,       C,       AW_FUR_S,C,        C,        AW_FUR_S,AW_FUR_S,C,       C,       C],
    ], 4, 'enemy_armored_wolf_walk_1'));

    this.registerTexture('enemy_armored_wolf_walk_2', () => this.createSpriteTexture([
      [C,       C,       AW_FUR,  AW_FUR_H, C,        C,        AW_FUR_H,AW_FUR,  C,       C],
      [C,       AW_FUR,  AW_FUR_H,AW_FUR,   AW_PLATE_H,AW_PLATE_H,AW_FUR,AW_FUR_H,AW_FUR, C],
      [C,       AW_FUR,  AW_EYE,  AW_FUR,   AW_PLATE, AW_PLATE, AW_EYE, AW_FUR,  C,       C],
      [C,       C,       AW_FUR,  AW_SNOUT, AW_SNOUT, AW_SNOUT, AW_FUR, C,       C,       C],
      [C,       C,       C,       AW_FANG,  AW_SNOUT, AW_FANG,  C,      C,       C,       C],
      [AW_FUR_S,AW_PLATE,AW_PLATE,AW_PLATE_H,AW_FUR,  AW_PLATE_H,AW_PLATE,AW_PLATE,AW_FUR_S,C],
      [C,       AW_FUR_S,AW_PLATE,AW_FUR,   AW_FUR_S, AW_FUR,  AW_PLATE,AW_FUR_S,C,       C],
      [C,       C,       AW_FUR_S,AW_FUR_S, C,        C,       AW_FUR_S,C,       C,       C],
    ], 4, 'enemy_armored_wolf_walk_2'));

    this.registerTexture('enemy_armored_wolf_walk_3', () => this.createSpriteTexture([
      [C,       C,       AW_FUR,  AW_FUR_H, C,        C,        AW_FUR_H,AW_FUR,  C,       C],
      [C,       AW_FUR,  AW_FUR_H,AW_FUR,   AW_PLATE_H,AW_PLATE_H,AW_FUR,AW_FUR_H,AW_FUR, C],
      [C,       AW_FUR,  AW_EYE,  AW_FUR,   AW_PLATE, AW_PLATE, AW_EYE, AW_FUR,  C,       C],
      [C,       C,       AW_FUR,  AW_SNOUT, AW_SNOUT, AW_SNOUT, AW_FUR, C,       C,       C],
      [C,       C,       C,       AW_FANG,  AW_SNOUT, AW_FANG,  C,      C,       C,       C],
      [AW_FUR_S,AW_PLATE,AW_PLATE,AW_PLATE_H,AW_FUR,  AW_PLATE_H,AW_PLATE,AW_PLATE,AW_FUR_S,C],
      [C,       AW_FUR_S,AW_PLATE,AW_FUR,   AW_FUR_S, AW_FUR,  AW_PLATE,AW_FUR_S,C,       C],
      [C,       AW_FUR_S,C,       C,        AW_FUR_S, C,       AW_FUR_S,C,       C,       C],
    ], 4, 'enemy_armored_wolf_walk_3'));

    // Stagger - head low with dazed eyes, plated body compact, legs splayed
    this.registerTexture('enemy_armored_wolf_stagger', () => this.createSpriteTexture([
      [C,       C,       AW_FUR,  AW_FUR_H,  AW_FUR_H,  AW_FUR_H, AW_FUR_H, AW_FUR,  C,       C],
      [C,       AW_FUR,  AW_FUR_H,AW_FUR,    AW_EYE,    AW_EYE,   AW_FUR,   AW_FUR_H,AW_FUR,  C],
      [C,       C,       AW_FUR,  AW_SNOUT,  AW_SNOUT,  AW_SNOUT, AW_SNOUT, AW_FUR,  C,       C],
      [C,       C,       AW_FANG, AW_SNOUT,  AW_SNOUT,  AW_SNOUT, AW_FANG,  C,       C,       C],
      [AW_FUR_S,AW_FUR_S,AW_PLATE,AW_PLATE_H,AW_FUR_S,  AW_PLATE_H,AW_PLATE,AW_FUR_S,AW_FUR_S,C],
      [C,       AW_FUR_S,AW_PLATE,AW_FUR_S,  AW_PLATE,  AW_FUR_S, AW_PLATE, AW_FUR_S,C,       C],
      [AW_FUR_S,C,       AW_FUR_S,C,         C,         C,        AW_FUR_S, C,       AW_FUR_S,C],
      [C,       C,       C,       C,         C,         C,        C,        C,       C,       C],
    ], 4, 'enemy_armored_wolf_stagger'));

    // Stone Sentinel â€” imposing stone-armored beast with layered rock plates, glowing
    // crystal eyes, heavy pauldrons, and thick legs. 12x10 grid at scale 4 for detail.
    const SS_STONE  = 0x546E7A;  // base blue-grey stone
    const SS_STONE_H= 0x78909C;  // stone highlight
    const SS_STONE_S= 0x37474F;  // stone deep shadow
    const SS_PLATE  = 0x607D8B;  // armour plate mid
    const SS_PLATE_H= 0x90A4AE;  // armour plate highlight
    const SS_PLATE_S= 0x455A64;  // armour plate shadow
    const SS_FUR    = 0x424242;  // dark charcoal fur between plates
    const SS_FUR_H  = 0x616161;  // fur highlight
    const SS_FUR_S  = 0x212121;  // fur deep shadow
    const SS_EYE    = 0x64FFDA;  // aqua crystal glow
    const SS_EYE_RIM= 0x80DEEA;  // eye rim glow
    const SS_SNOUT  = 0x757575;  // stone-grey muzzle
    const SS_FANG   = 0xECEFF1;  // pale bone fang
    const SS_RUNE   = 0x4DD0E1;  // faint rune glow on chest plate
    const SS_CLAW   = 0xBDBDBD;  // stone claw tips

    this.registerTexture('enemy_stone_sentinel', () => this.createSpriteTexture([
      [C,        C,        C,        SS_FUR,   SS_FUR_H, C,        C,        SS_FUR_H, SS_FUR,   C,        C,        C       ],
      [C,        C,        SS_FUR,   SS_STONE_H,SS_FUR_H,SS_PLATE_H,SS_PLATE_H,SS_FUR_H,SS_STONE_H,SS_FUR,  C,        C       ],
      [C,        SS_PLATE, SS_FUR_H, SS_EYE_RIM,SS_EYE, SS_STONE, SS_STONE, SS_EYE,  SS_EYE_RIM,SS_FUR_H,SS_PLATE, C       ],
      [C,        C,        SS_FUR,   SS_SNOUT, SS_SNOUT, SS_SNOUT, SS_SNOUT, SS_SNOUT,SS_FUR,   C,        C,        C       ],
      [C,        C,        C,        SS_FANG,  SS_SNOUT, SS_SNOUT, SS_SNOUT, SS_FANG, C,        C,        C,        C       ],
      [C,        SS_PLATE_S,SS_PLATE,SS_PLATE_H,SS_PLATE,SS_RUNE,  SS_PLATE, SS_PLATE_H,SS_PLATE,SS_PLATE_S,C,       C       ],
      [SS_FUR_S, SS_PLATE, SS_PLATE_H,SS_PLATE_S,SS_STONE,SS_STONE_S,SS_STONE,SS_PLATE_S,SS_PLATE_H,SS_PLATE,SS_FUR_S,C      ],
      [C,        SS_FUR_S, SS_STONE, SS_STONE_S,SS_FUR_S,SS_STONE_S,SS_FUR_S,SS_STONE_S,SS_STONE, SS_FUR_S, C,       C       ],
      [C,        C,        SS_FUR_S, SS_CLAW,  C,        SS_FUR_S, C,        SS_CLAW, SS_FUR_S, C,        C,        C       ],
      [C,        C,        C,        C,        C,        C,        C,        C,        C,        C,        C,        C       ],
    ], 4, 'enemy_stone_sentinel'));

    this.registerTexture('enemy_stone_sentinel_telegraph', () => this.createSpriteTexture([
      [C,        C,        C,        C,        C,        C,        C,        C,        C,        C,        C,        C       ],
      [C,        C,        SS_FUR,   SS_STONE_H,SS_FUR_H,SS_PLATE_H,SS_PLATE_H,SS_FUR_H,SS_STONE_H,SS_FUR,  C,        C       ],
      [C,        SS_PLATE, SS_FUR_H, SS_EYE_RIM,SS_RUNE, SS_STONE, SS_STONE, SS_RUNE, SS_EYE_RIM,SS_FUR_H,SS_PLATE, C       ],
      [C,        C,        SS_FUR,   SS_SNOUT, 0xFF5722, SS_SNOUT, 0xFF5722, SS_SNOUT,SS_FUR,   C,        C,        C       ],
      [C,        C,        C,        SS_FANG,  0xFF5722, 0xFF5722, 0xFF5722, SS_FANG, C,        C,        C,        C       ],
      [C,        SS_PLATE_S,SS_PLATE,SS_PLATE_H,SS_RUNE, SS_RUNE,  SS_RUNE,  SS_PLATE_H,SS_PLATE,SS_PLATE_S,C,       C       ],
      [SS_FUR_S, SS_PLATE, SS_PLATE_H,SS_PLATE_S,SS_FUR_S,SS_STONE_S,SS_FUR_S,SS_PLATE_S,SS_PLATE_H,SS_PLATE,SS_FUR_S,C      ],
      [C,        SS_FUR_S, SS_FUR_S, SS_FUR_S, SS_FUR_S,SS_FUR_S, SS_FUR_S,SS_FUR_S, SS_FUR_S, SS_FUR_S, C,        C       ],
      [C,        C,        SS_FUR_S, SS_CLAW,  C,        SS_FUR_S, C,        SS_CLAW, SS_FUR_S, C,        C,        C       ],
      [C,        C,        C,        C,        C,        C,        C,        C,        C,        C,        C,        C       ],
    ], 4, 'enemy_stone_sentinel_telegraph'));

    this.registerTexture('enemy_stone_sentinel_attack', () => this.createSpriteTexture([
      [C,        C,        C,        SS_FUR_H, SS_FUR_H, C,        C,        SS_FUR_H,SS_FUR_H, C,        C,        C       ],
      [C,        C,        SS_FUR,   SS_STONE_H,SS_FUR_H,SS_PLATE_H,SS_PLATE_H,SS_FUR_H,SS_STONE_H,SS_FUR,  C,        C       ],
      [C,        SS_PLATE_H,SS_FUR_H,SS_EYE_RIM,SS_RUNE,SS_STONE, SS_STONE, SS_RUNE, SS_EYE_RIM,SS_FUR_H,SS_PLATE_H,C       ],
      [C,        SS_FANG,  SS_FUR,   0xFF5722, 0xFF5722, 0xFF5722, 0xFF5722, 0xFF5722,SS_FUR,   SS_FANG,  C,        C       ],
      [C,        C,        SS_FANG,  0xFF5722, 0xFF5722, 0xFF5722, 0xFF5722, 0xFF5722,SS_FANG,  C,        C,        C       ],
      [C,        SS_PLATE_S,SS_PLATE,SS_PLATE_H,SS_PLATE,SS_RUNE,  SS_PLATE, SS_PLATE_H,SS_PLATE,SS_PLATE_S,C,       C       ],
      [SS_FUR_S, SS_PLATE, SS_PLATE_H,SS_PLATE_S,SS_STONE,SS_STONE_S,SS_STONE,SS_PLATE_S,SS_PLATE_H,SS_PLATE,SS_FUR_S,C      ],
      [C,        SS_FUR_S, SS_STONE, SS_STONE_S,SS_FUR_S,SS_STONE_S,SS_FUR_S,SS_STONE_S,SS_STONE, SS_FUR_S, C,       C       ],
      [C,        C,        SS_FUR_S, SS_CLAW,  C,        SS_FUR_S, C,        SS_CLAW, SS_FUR_S, C,        C,        C       ],
      [C,        C,        C,        C,        C,        C,        C,        C,        C,        C,        C,        C       ],
    ], 4, 'enemy_stone_sentinel_attack'));

    // Walk frame 0 â€” left paw steps out 1 col
    this.registerTexture('enemy_stone_sentinel_walk_0', () => this.createSpriteTexture([
      [C,        C,        C,        SS_FUR,   SS_FUR_H, C,        C,        SS_FUR_H, SS_FUR,   C,        C,        C       ],
      [C,        C,        SS_FUR,   SS_STONE_H,SS_FUR_H,SS_PLATE_H,SS_PLATE_H,SS_FUR_H,SS_STONE_H,SS_FUR,  C,        C       ],
      [C,        SS_PLATE, SS_FUR_H, SS_EYE_RIM,SS_EYE, SS_STONE, SS_STONE, SS_EYE,  SS_EYE_RIM,SS_FUR_H,SS_PLATE, C       ],
      [C,        C,        SS_FUR,   SS_SNOUT, SS_SNOUT, SS_SNOUT, SS_SNOUT, SS_SNOUT,SS_FUR,   C,        C,        C       ],
      [C,        C,        C,        SS_FANG,  SS_SNOUT, SS_SNOUT, SS_SNOUT, SS_FANG, C,        C,        C,        C       ],
      [C,        SS_PLATE_S,SS_PLATE,SS_PLATE_H,SS_PLATE,SS_RUNE,  SS_PLATE, SS_PLATE_H,SS_PLATE,SS_PLATE_S,C,       C       ],
      [SS_FUR_S, SS_PLATE, SS_PLATE_H,SS_PLATE_S,SS_STONE,SS_STONE_S,SS_STONE,SS_PLATE_S,SS_PLATE_H,SS_PLATE,SS_FUR_S,C      ],
      [C,        SS_FUR_S, SS_STONE, SS_STONE_S,SS_FUR_S,SS_STONE_S,SS_FUR_S,SS_STONE_S,SS_STONE, SS_FUR_S, C,       C       ],
      [C,        SS_FUR_S, SS_CLAW,  C,        C,        SS_FUR_S, C,        SS_CLAW, SS_FUR_S, C,        C,        C       ],
      [C,        C,        C,        C,        C,        C,        C,        C,        C,        C,        C,        C       ],
    ], 4, 'enemy_stone_sentinel_walk_0'));

    // Walk frame 1 â€” right paw steps out 1 col
    this.registerTexture('enemy_stone_sentinel_walk_1', () => this.createSpriteTexture([
      [C,        C,        C,        SS_FUR,   SS_FUR_H, C,        C,        SS_FUR_H, SS_FUR,   C,        C,        C       ],
      [C,        C,        SS_FUR,   SS_STONE_H,SS_FUR_H,SS_PLATE_H,SS_PLATE_H,SS_FUR_H,SS_STONE_H,SS_FUR,  C,        C       ],
      [C,        SS_PLATE, SS_FUR_H, SS_EYE_RIM,SS_EYE, SS_STONE, SS_STONE, SS_EYE,  SS_EYE_RIM,SS_FUR_H,SS_PLATE, C       ],
      [C,        C,        SS_FUR,   SS_SNOUT, SS_SNOUT, SS_SNOUT, SS_SNOUT, SS_SNOUT,SS_FUR,   C,        C,        C       ],
      [C,        C,        C,        SS_FANG,  SS_SNOUT, SS_SNOUT, SS_SNOUT, SS_FANG, C,        C,        C,        C       ],
      [C,        SS_PLATE_S,SS_PLATE,SS_PLATE_H,SS_PLATE,SS_RUNE,  SS_PLATE, SS_PLATE_H,SS_PLATE,SS_PLATE_S,C,       C       ],
      [SS_FUR_S, SS_PLATE, SS_PLATE_H,SS_PLATE_S,SS_STONE,SS_STONE_S,SS_STONE,SS_PLATE_S,SS_PLATE_H,SS_PLATE,SS_FUR_S,C      ],
      [C,        SS_FUR_S, SS_STONE, SS_STONE_S,SS_FUR_S,SS_STONE_S,SS_FUR_S,SS_STONE_S,SS_STONE, SS_FUR_S, C,       C       ],
      [C,        C,        SS_FUR_S, SS_CLAW,  C,        SS_FUR_S, C,        C,        SS_CLAW, SS_FUR_S, C,        C       ],
      [C,        C,        C,        C,        C,        C,        C,        C,        C,        C,        C,        C       ],
    ], 4, 'enemy_stone_sentinel_walk_1'));

    // Stagger â€” paws splayed wide, off-balance
    this.registerTexture('enemy_stone_sentinel_stagger', () => this.createSpriteTexture([
      [C,        C,        C,        SS_FUR,   SS_FUR_H, C,        C,        SS_FUR_H, SS_FUR,   C,        C,        C       ],
      [C,        C,        SS_FUR,   SS_STONE_H,SS_FUR_H,SS_PLATE_H,SS_PLATE_H,SS_FUR_H,SS_STONE_H,SS_FUR,  C,        C       ],
      [C,        SS_PLATE, SS_FUR_H, SS_EYE_RIM,SS_EYE, SS_STONE, SS_STONE, SS_EYE,  SS_EYE_RIM,SS_FUR_H,SS_PLATE, C       ],
      [C,        C,        SS_FUR,   SS_SNOUT, SS_SNOUT, SS_SNOUT, SS_SNOUT, SS_SNOUT,SS_FUR,   C,        C,        C       ],
      [C,        C,        C,        SS_FANG,  SS_SNOUT, SS_SNOUT, SS_SNOUT, SS_FANG, C,        C,        C,        C       ],
      [C,        SS_PLATE_S,SS_PLATE,SS_PLATE_H,SS_PLATE,SS_RUNE,  SS_PLATE, SS_PLATE_H,SS_PLATE,SS_PLATE_S,C,       C       ],
      [SS_FUR_S, SS_PLATE, SS_PLATE_H,SS_PLATE_S,SS_STONE,SS_STONE_S,SS_STONE,SS_PLATE_S,SS_PLATE_H,SS_PLATE,SS_FUR_S,C      ],
      [C,        SS_FUR_S, SS_STONE, SS_STONE_S,C,       SS_STONE_S,SS_FUR_S,SS_STONE_S,SS_STONE, SS_FUR_S, C,       C       ],
      [SS_FUR_S, SS_CLAW,  C,        C,        C,        SS_FUR_S, C,        C,        C,        SS_CLAW, SS_FUR_S, C       ],
      [C,        C,        C,        C,        C,        C,        C,        C,        C,        C,        C,        C       ],
    ], 4, 'enemy_stone_sentinel_stagger'));

    // ========== VOID WISP â€” old shadow design preserved for later use ==========
    const VW_BODY  = 0x311B92;
    const VW_BODY_H = 0x4527A0;
    const VW_BODY_S = 0x1A0A5E;
    const VW_EYE   = 0xFF1744;
    const VW_GLOW  = 0xD500F9;
    const VW_WISP  = 0x7C4DFF;

    this.registerTexture('enemy_void_wisp', () => this.createSpriteTexture([
      [C,       C,        VW_WISP, VW_BODY_H,VW_BODY_H,VW_BODY_H,VW_WISP,C,        C,       C],
      [C,       VW_BODY,  VW_BODY_H,VW_EYE,  VW_BODY,  VW_EYE,   VW_BODY_H,VW_BODY,C,       C],
      [C,       VW_BODY_S,VW_BODY, VW_BODY,  VW_GLOW,  VW_BODY,  VW_BODY, VW_BODY_S,C,      C],
      [VW_WISP, VW_BODY,  VW_BODY_S,VW_BODY, VW_BODY_S,VW_BODY,  VW_BODY_S,VW_BODY,VW_WISP, C],
      [C,       VW_BODY_S,VW_BODY, VW_BODY,  VW_BODY,  VW_BODY,  VW_BODY, VW_BODY_S,C,      C],
      [C,       C,        VW_BODY_S,VW_BODY,  VW_BODY_S,VW_BODY,  VW_BODY_S,C,       C,      C],
      [C,       C,        VW_WISP, VW_BODY_S,VW_BODY,  VW_BODY_S,VW_WISP, C,        C,      C],
      [C,       VW_WISP,  C,       C,        VW_WISP,  C,        C,       VW_WISP,  C,      C],
    ], 4, 'enemy_void_wisp'));

    const VW_EYE_GLOW = 0xFF5252;
    const VW_CHARGE = 0xEA80FC;
    this.registerTexture('enemy_void_wisp_telegraph', () => this.createSpriteTexture([
      [VW_CHARGE,C,        VW_WISP,  VW_BODY_H,VW_BODY_H,VW_BODY_H,VW_WISP, C,        VW_CHARGE,C],
      [C,       VW_BODY,  VW_BODY_H,VW_EYE_GLOW,VW_BODY,VW_EYE_GLOW,VW_BODY_H,VW_BODY,C,      C],
      [C,       VW_BODY_S,VW_CHARGE,VW_BODY,  VW_GLOW,  VW_BODY,  VW_CHARGE,VW_BODY_S,C,      C],
      [VW_CHARGE,VW_BODY, VW_BODY_S,VW_CHARGE,VW_GLOW,  VW_CHARGE,VW_BODY_S,VW_BODY,VW_CHARGE,C],
      [C,       VW_BODY_S,VW_BODY,  VW_BODY,  VW_BODY,  VW_BODY,  VW_BODY, VW_BODY_S,C,      C],
      [C,       C,        VW_BODY_S,VW_BODY,  VW_BODY_S,VW_BODY,  VW_BODY_S,C,       C,      C],
      [C,       C,        VW_WISP,  VW_BODY_S,VW_BODY,  VW_BODY_S,VW_WISP, C,        C,      C],
      [C,       VW_WISP,  C,        C,        VW_WISP,  C,        C,       VW_WISP,  C,      C],
    ], 4, 'enemy_void_wisp_telegraph'));

    this.registerTexture('enemy_void_wisp_attack', () => this.createSpriteTexture([
      [C,       VW_WISP,  VW_CHARGE,VW_BODY_H,VW_BODY_H,VW_BODY_H,VW_CHARGE,VW_WISP,C,      C],
      [VW_WISP, VW_BODY,  VW_BODY_H,VW_EYE_GLOW,VW_GLOW,VW_EYE_GLOW,VW_BODY_H,VW_BODY,VW_WISP,C],
      [VW_CHARGE,VW_BODY_S,VW_BODY, VW_GLOW,  VW_CHARGE,VW_GLOW,  VW_BODY, VW_BODY_S,VW_CHARGE,C],
      [VW_WISP, VW_BODY,  VW_BODY_S,VW_BODY,  VW_BODY_S,VW_BODY,  VW_BODY_S,VW_BODY,VW_WISP, C],
      [C,       VW_BODY_S,VW_BODY,  VW_BODY,  VW_BODY,  VW_BODY,  VW_BODY, VW_BODY_S,C,      C],
      [C,       C,        VW_BODY_S,VW_BODY,  VW_BODY_S,VW_BODY,  VW_BODY_S,C,       C,      C],
      [C,       C,        VW_WISP,  VW_BODY_S,VW_BODY,  VW_BODY_S,VW_WISP, C,        C,      C],
      [C,       VW_WISP,  C,        C,        VW_WISP,  C,        C,       VW_WISP,  C,      C],
    ], 4, 'enemy_void_wisp_attack'));

    // Stagger - energy dispersing outward, core fragmented, wisps scattered to edges
    this.registerTexture('enemy_void_wisp_stagger', () => this.createSpriteTexture([
      [VW_WISP,  C,        C,        VW_BODY_H,VW_BODY_H,VW_BODY_H,C,        C,        VW_WISP, C],
      [C,        VW_BODY_S,C,        VW_EYE,   VW_BODY,  VW_EYE,   C,        VW_BODY_S,C,       C],
      [C,        C,        VW_BODY,  VW_BODY_S,VW_GLOW,  VW_BODY_S,VW_BODY,  C,        C,       C],
      [VW_WISP,  VW_BODY_S,C,        VW_BODY_S,VW_BODY,  VW_BODY_S,C,        VW_BODY_S,VW_WISP, C],
      [C,        C,        VW_BODY_S,C,        VW_BODY,  VW_BODY,  C,        VW_BODY_S,C,       C],
      [C,        VW_WISP,  C,        VW_BODY_S,C,        C,        VW_BODY_S,C,        VW_WISP, C],
      [VW_WISP,  C,        C,        C,        VW_BODY_S,VW_BODY_S,C,        C,        C,       VW_WISP],
      [C,        VW_WISP,  C,        C,        C,        C,        C,        VW_WISP,  C,       C],
    ], 4, 'enemy_void_wisp_stagger'));

    // ========== SHADOW REAPER â€” tall hooded figure, skull mask, curved scythe ==========
    // Sprite: 10 wide Ã- 12 tall @ 4px/cell.
    //
    // Layout topâ†’bottom:
    //   Rows  0- 1  pointed hood peak, narrow
    //   Rows  2- 3  skull/mask face, single cyan eye in hood opening
    //   Rows  4- 5  wide shoulders; scythe handle exits left shoulder
    //   Rows  6- 7  scythe blade (idle: hanging left); lower cloak body
    //   Rows  8- 9  tattered robe hem
    //   Rows 10-11  trailing dark wisps / tendrils
    //
    // Attack arc: blade swings from left-hang (idle) â†’ raised left (telegraph) â†’ sweeps right (attack)
    const RK_CK  = 0x080C18;   // cloak deep navy-black
    const RK_CKH = 0x181E38;   // cloak fold â€” catches dim light
    const RK_CKS = 0x030406;   // cloak deepest shadow
    const RK_HD  = 0x000408;   // hood interior void
    const RK_SK  = 0xD8CEBB;   // skull bone â€” warm ivory
    const RK_SKH = 0xEEE4D4;   // skull highlight
    const RK_SKS = 0x988A7C;   // skull shadow
    const RK_EYE = 0x44FFEE;   // eye glow â€” teal cyan
    const RK_BL  = 0xD8ECF8;   // scythe blade â€” pale silver-blue
    const RK_BLS = 0x5888A4;   // scythe blade shadow/edge
    const RK_HN  = 0x1C1008;   // scythe handle â€” near-black wood
    const RK_WSP = 0x10162C;   // trailing wisps â€” dark indigo

    const RK_ARM = 0x4B5668;   // decayed blue-grey armor
    const RK_ARH = 0x7F8EA0;   // chipped armor highlight
    const RK_ARS = 0x252C38;   // armor shadow
    const RK_RUST = 0x6A3A22;  // rust streak

    this.registerTexture('enemy_shadow', () => this.createSpriteTexture([
      //        0        1        2        3        4        5        6        7        8        9
      // hood peak â€” narrow 2-px point
      [C,       C,       C,       C,       RK_CKH,  RK_CKH,  C,       C,       C,       C      ],
      // hood upper â€” widens, void interior appears
      [C,       C,       C,       RK_CKS,  RK_CK,   RK_HD,   RK_CKS,  C,       C,       C      ],
      // skull face â€” bone catches faint light, single eye glows teal
      [C,       C,       RK_CKS,  RK_CK,   RK_SKH,  RK_EYE,  RK_CK,   RK_CKS,  C,       C      ],
      // skull lower jaw
      [C,       C,       RK_CKS,  RK_CK,   RK_SKS,  RK_SK,   RK_CK,   RK_CKS,  C,       C      ],
      // wide shoulders â€” broadest point; handle exits at col 1
      [C,       RK_HN,   RK_ARS,  RK_ARM,  RK_CK,   RK_CK,   RK_ARM,  RK_ARS,  C,       C      ],
      // upper body; handle continues, blade starts col 0â€“1
      [RK_HN,   RK_BLS,  RK_ARM,  RK_CK,   RK_RUST, RK_CK,   RK_CK,   RK_ARM,  C,       C      ],
      // scythe blade curves down-left; lower cloak body
      [RK_BL,   RK_BLS,  RK_CKS,  RK_ARM,  RK_CK,   RK_CK,   RK_CKS,  C,       C,       C      ],
      // blade tip fades; mid robe narrows
      [C,       RK_BLS,  RK_CKS,  RK_CK,   RK_ARM,  RK_CK,   RK_CKS,  C,       C,       C      ],
      // lower robe â€” slightly ragged
      [C,       C,       RK_CKS,  RK_CK,   RK_CKS,  RK_CK,   RK_WSP,  C,       C,       C      ],
      // robe hem â€” tattered edges begin
      [C,       C,       RK_WSP,  RK_CKS,  RK_CK,   RK_CKS,  RK_WSP,  C,       C,       C      ],
      // wisp tendrils â€” scattered, floating
      [C,       RK_WSP,  C,       RK_WSP,  RK_CKS,  RK_WSP,  C,       RK_WSP,  C,       C      ],
      // root wisps â€” final trailing flecks
      [RK_WSP,  C,       C,       C,       RK_WSP,  C,       C,       C,       RK_WSP,  C      ],
    ], 4, 'enemy_shadow'));

    const RK_EYG = 0x88FFFF;   // eye â€” intensified teal (telegraph/attack)
    const RK_CHG = 0x2828A8;   // cold ethereal charge energy
    const RK_SLH = 0xF0F8FF;   // blade slash flash â€” near-white

    this.registerTexture('enemy_shadow_telegraph', () => this.createSpriteTexture([
      //        0        1        2        3        4        5        6        7        8        9
      // hood â€” charge sparks appear at corners
      [C,       C,       C,       RK_CHG,  RK_CKH,  RK_CKH,  RK_CHG,  C,       C,       C      ],
      [C,       C,       RK_CHG,  RK_CKS,  RK_CK,   RK_HD,   RK_CKS,  RK_CHG,  C,       C      ],
      // eye intensifies
      [C,       C,       RK_CKS,  RK_CK,   RK_SKH,  RK_EYG,  RK_CK,   RK_CKS,  C,       C      ],
      // scythe arm raises â€” handle swings up toward col 2
      [C,       C,       RK_HN,   RK_CKS,  RK_SKS,  RK_SK,   RK_CK,   RK_CKS,  C,       C      ],
      // blade raised to row 4-5, pointing upward-left
      [RK_BLS,  RK_HN,   RK_BLS,  RK_ARM,  RK_CK,   RK_CK,   RK_ARM,  RK_CKS,  C,       C      ],
      [RK_BL,   RK_BLS,  RK_ARM,  RK_CK,   RK_RUST, RK_CK,   RK_CK,   RK_ARM,  C,       C      ],
      // cloak billows â€” charge energy outlines body
      [C,       RK_CHG,  RK_ARS,  RK_ARM,  RK_CK,   RK_CK,   RK_ARS,  RK_CHG,  C,       C      ],
      [C,       C,       RK_CKS,  RK_CK,   RK_ARM,  RK_CK,   RK_CKS,  C,       C,       C      ],
      [C,       C,       RK_CKS,  RK_CK,   RK_CKS,  RK_CK,   RK_WSP,  C,       C,       C      ],
      // wisps spread wider as energy rises
      [C,       RK_WSP,  RK_WSP,  RK_CKS,  RK_CK,   RK_CKS,  RK_WSP,  RK_WSP,  C,       C      ],
      [RK_WSP,  C,       RK_WSP,  RK_WSP,  RK_CKS,  RK_WSP,  RK_WSP,  C,       RK_WSP,  C      ],
      [RK_WSP,  C,       C,       RK_WSP,  C,       RK_WSP,  C,       C,       RK_WSP,  C      ],
    ], 4, 'enemy_shadow_telegraph'));

    this.registerTexture('enemy_shadow_attack', () => this.createSpriteTexture([
      //        0        1        2        3        4        5        6        7        8        9
      // hood stable â€” attack is fast and controlled
      [C,       C,       C,       C,       RK_CKH,  RK_CKH,  C,       C,       C,       C      ],
      [C,       C,       C,       RK_CKS,  RK_CK,   RK_HD,   RK_CKS,  C,       C,       C      ],
      // eye at full glow
      [C,       C,       RK_CKS,  RK_CK,   RK_SKH,  RK_EYG,  RK_CK,   RK_CKS,  C,       C      ],
      [C,       C,       RK_CKS,  RK_CK,   RK_SKS,  RK_SK,   RK_CK,   RK_CKS,  C,       C      ],
      // shoulders â€” blade has swung to right side
      [C,       C,       RK_ARS,  RK_ARM,  RK_CK,   RK_CK,   RK_ARM,  RK_HN,   RK_BLS,  C      ],
      // blade sweeps right; handle follows
      [C,       C,       RK_ARM,  RK_CK,   RK_RUST, RK_CK,   RK_HN,   RK_BL,   RK_SLH,  C      ],
      // slash flash â€” bright arc at blade tip
      [C,       C,       C,       RK_ARM,  RK_CK,   RK_CK,   RK_BLS,  RK_SLH,  C,       C      ],
      [C,       C,       RK_CKS,  RK_CK,   RK_ARM,  RK_CK,   RK_CKS,  C,       C,       C      ],
      [C,       C,       RK_CKS,  RK_CK,   RK_CKS,  RK_CK,   RK_WSP,  C,       C,       C      ],
      // wisps burst outward on strike
      [C,       RK_WSP,  RK_WSP,  RK_CKS,  RK_CK,   RK_CKS,  RK_WSP,  RK_WSP,  C,       C      ],
      [RK_WSP,  C,       RK_WSP,  RK_WSP,  RK_CKS,  RK_WSP,  RK_WSP,  C,       RK_WSP,  C      ],
      [RK_WSP,  C,       C,       RK_WSP,  C,       RK_WSP,  C,       C,       RK_WSP,  C      ],
    ], 4, 'enemy_shadow_attack'));

    // Stagger - body hunched/doubled over, scythe dropped, cloak billowing wide
    this.registerTexture('enemy_shadow_stagger', () => this.createSpriteTexture([
      [C,       C,       C,       C,       C,       C,       C,       C,       C,       C      ],
      [C,       C,       C,       C,       RK_CKH,  RK_CKH,  C,       C,       C,       C      ],
      [C,       C,       C,       RK_CKS,  RK_CK,   RK_HD,   RK_CKS,  C,       C,       C      ],
      [C,       C,       RK_CKS,  RK_CK,   RK_SKH,  RK_EYE,  RK_CK,   RK_CKS,  C,       C      ],
      [C,       RK_HN,   RK_ARS,  RK_ARM,  RK_CK,   RK_CK,   RK_ARM,  RK_ARS,  RK_HN,   C      ],
      [RK_HN,   RK_BL,   RK_BLS,  RK_CK,   RK_CK,   RK_RUST, RK_CK,   RK_BLS,  RK_BL,   RK_HN  ],
      [RK_BLS,  C,       RK_CKS,  RK_ARM,  RK_CK,   RK_CK,   RK_ARM,  RK_CKS,  C,       RK_BLS ],
      [C,       RK_BLS,  RK_CKS,  RK_CK,   RK_CK,   RK_CK,   RK_CKS,  RK_BLS,  C,       C      ],
      [C,       C,       RK_CKS,  RK_CK,   RK_CKS,  RK_CK,   RK_CKS,  C,       C,       C      ],
      [C,       RK_WSP,  RK_WSP,  RK_CKS,  RK_CK,   RK_CKS,  RK_WSP,  RK_WSP,  C,       C      ],
      [RK_WSP,  C,       RK_WSP,  C,       RK_WSP,  RK_WSP,  C,       RK_WSP,  C,       C      ],
      [C,       RK_WSP,  C,       RK_WSP,  C,       C,       RK_WSP,  C,       RK_WSP,  C      ],
    ], 4, 'enemy_shadow_stagger'));

    // ========== HOLLOW REAVER - ranged shade that throws scythe-blades ==========
    // Sister to the Hollow Shade but recognisably distinct: violet palette,
    // hood pulled lower over a single magenta eye, blade held aloft in a throwing pose,
    // and trailing wisps tinted toward magenta/violet rather than indigo.
    const RV_CK  = 0x080C18;   // cloak deep navy-black
    const RV_CKH = 0x181E38;   // cloak fold highlight
    const RV_CKS = 0x030406;   // deepest cloak shadow
    const RV_HD  = 0x05010A;   // hood interior void
    const RV_SK  = 0xC8B6D8;   // skull bone - cool ivory with violet wash
    const RV_SKH = 0xE2D2F0;   // skull highlight
    const RV_SKS = 0x8878A0;   // skull shadow
    const RV_EYE = 0xCC44FF;   // eye glow - violet/magenta
    const RV_BL  = 0xD8E4F8;   // blade pale silver-violet
    const RV_BLS = 0x6A4E94;   // blade shadow
    const RV_HN  = 0x140820;   // handle near-black violet
    const RV_WSP = 0x4E2378;   // trailing wisps - deep violet
    const RV_MST = 0x6E5BA8;
    const RV_MSH = 0xB9B0EA;
    const RV_BLM = 0xC8D5FF;

    this.registerTexture('enemy_hollow_reaver', () => this.createSpriteTexture([
      //        0        1        2        3        4        5        6        7        8        9
      // raised blade above hood - caster's signature silhouette
      [C,       C,       C,       C,       RK_BLS,  RK_BL,   RV_BLM,  C,       C,       C      ],
      [C,       C,       C,       RK_BLS,  RK_BL,   RV_BLM,  RK_HN,   C,       C,       C      ],
      // hood peak - narrower than shade's
      [C,       C,       C,       C,       RK_HN,   RK_HN,   C,       C,       C,       C      ],
      // hood upper - pulled lower over face
      [C,       C,       C,       RK_WSP,  RK_CKH,  RK_CKH,  RK_WSP,  C,       C,       C      ],
      // skull/eye - single magenta glow
      [C,       C,       RK_WSP,  RK_CK,   RK_HD,   RK_HD,   RK_CK,   RK_WSP,  C,       C      ],
      // skull lower jaw
      [C,       C,       RK_CKS,  RK_CK,   RK_EYE,  RK_HD,   RK_CK,   RK_CKS,  C,       C      ],
      // wide shoulders - both arms raised forward
      [C,       RK_WSP,  RK_ARS,  RK_ARM,  RK_CK,   RK_CK,   RK_ARM,  RK_ARS,  RK_WSP,  C      ],
      // upper body - billowing cloak
      [C,       RK_HN,   RK_ARM,  RK_CK,   RK_RUST, RK_CK,   RK_CK,   RK_ARM,  RK_HN,   C      ],
      // mid cloak
      [RK_WSP,  C,       RK_WSP,  RK_CKS,  RK_CK,   RK_CK,   RK_CKS,  RK_WSP,  C,       RK_WSP ],
      // lower robe
      [C,       RK_WSP,  C,       RK_WSP,  RK_CK,   RK_CKS,  RK_WSP,  C,       RK_WSP,  C      ],
      // hem - wisps spread
      [C,       C,       RK_WSP,  C,       RV_MSH,  RK_WSP,  C,       RK_WSP,  C,       C      ],
      // root wisps
      [RK_WSP,  C,       C,       RK_WSP,  C,       C,       RK_WSP,  C,       C,       RK_WSP ],
    ], 4, 'enemy_hollow_reaver'));

    this.registerTexture('enemy_hollow_reaver_telegraph', () => this.createSpriteTexture([
      //        0        1        2        3        4        5        6        7        8        9
      [C,       C,       RK_CHG,  C,       RK_BLS,  RK_BL,   RV_BLM,  C,       RK_CHG,  C      ],
      [C,       RK_CHG,  C,       RK_BLS,  RK_BL,   RK_SLH,  RK_HN,   C,       C,       C      ],
      [C,       C,       C,       C,       RK_HN,   RK_HN,   C,       C,       C,       C      ],
      [C,       C,       RK_CHG,  RK_WSP,  RK_CKH,  RK_CKH,  RK_WSP,  RK_CHG,  C,       C      ],
      [C,       C,       RK_WSP,  RK_CK,   RK_HD,   RK_HD,   RK_CK,   RK_WSP,  C,       C      ],
      [C,       C,       RK_CKS,  RK_CK,   RK_EYG,  RK_HD,   RK_CK,   RK_CKS,  C,       C      ],
      [C,       RK_CHG,  RK_ARS,  RK_ARM,  RK_CK,   RK_CK,   RK_ARM,  RK_ARS,  RK_CHG,  C      ],
      [C,       RK_HN,   RK_ARM,  RK_CK,   RK_RUST, RK_CK,   RK_CK,   RK_ARM,  RK_HN,   C      ],
      [RK_WSP,  RK_CHG,  RK_WSP,  RK_CKS,  RK_CK,   RK_CK,   RK_CKS,  RK_WSP,  RK_CHG,  RK_WSP ],
      [C,       RK_WSP,  C,       RK_WSP,  RK_CK,   RK_CKS,  RK_WSP,  C,       RK_WSP,  C      ],
      [RK_WSP,  C,       RK_WSP,  C,       RV_MSH,  RK_WSP,  C,       RK_WSP,  C,       RK_WSP ],
      [RK_WSP,  C,       C,       RK_WSP,  C,       RK_WSP,  C,       C,       RK_WSP,  C      ],
    ], 4, 'enemy_hollow_reaver_telegraph'));

    this.registerTexture('enemy_hollow_reaver_attack', () => this.createSpriteTexture([
      //        0        1        2        3        4        5        6        7        8        9
      [C,       C,       C,       C,       RK_WSP,  C,       C,       C,       C,       C      ],
      [C,       C,       C,       C,       RK_HN,   RK_HN,   C,       C,       C,       C      ],
      [C,       C,       C,       RK_WSP,  RK_CKH,  RK_CKH,  RK_WSP,  C,       C,       C      ],
      [C,       C,       RK_WSP,  RK_CK,   RK_HD,   RK_HD,   RK_CK,   RK_WSP,  C,       C      ],
      [C,       C,       RK_CKS,  RK_CK,   RK_EYG,  RK_HD,   RK_CK,   RK_CKS,  C,       C      ],
      [C,       RK_WSP,  RK_ARS,  RK_ARM,  RK_CK,   RK_CK,   RK_ARM,  RK_ARS,  RK_WSP,  C      ],
      [C,       RK_HN,   RK_ARM,  RK_CK,   RK_RUST, RK_CK,   RK_CK,   RK_ARM,  RK_HN,   C      ],
      [RK_WSP,  C,       RK_WSP,  RK_CKS,  RK_CK,   RK_CK,   RK_CKS,  RK_WSP,  C,       RK_WSP ],
      [C,       RK_WSP,  C,       RK_WSP,  RK_CK,   RK_CKS,  RK_WSP,  C,       RK_WSP,  C      ],
      [C,       C,       RK_WSP,  C,       RV_MSH,  RK_WSP,  C,       RK_WSP,  C,       C      ],
      [RK_WSP,  C,       C,       RK_WSP,  C,       C,       RK_WSP,  C,       C,       RK_WSP ],
      [C,       C,       C,       RK_CHG,  C,       RK_SLH,  RK_CHG,  C,       C,       C      ],
    ], 4, 'enemy_hollow_reaver_attack'));

    // Stagger - blade dropped (empty rows 0-1), body hunched, eye still glowing
    this.registerTexture('enemy_hollow_reaver_stagger', () => this.createSpriteTexture([
      [C,       C,       C,       C,       C,       C,       C,       C,       C,       C      ],
      [C,       C,       C,       C,       C,       C,       C,       C,       C,       C      ],
      [C,       C,       C,       C,       RK_HN,   RK_HN,   C,       C,       C,       C      ],
      [C,       C,       C,       RK_WSP,  RK_CKH,  RK_CKH,  RK_WSP,  C,       C,       C      ],
      [C,       C,       RK_WSP,  RK_CK,   RK_HD,   RK_HD,   RK_CK,   RK_WSP,  C,       C      ],
      [C,       C,       RK_CKS,  RK_CK,   RK_EYE,  RK_HD,   RK_CK,   RK_CKS,  C,       C      ],
      [C,       RK_WSP,  RK_ARS,  RK_ARM,  RK_CK,   RK_CK,   RK_ARM,  RK_ARS,  RK_WSP,  C      ],
      [RK_HN,   RK_ARM,  RK_CK,   RK_RUST, RK_CK,   RK_CK,   RK_RUST, RK_CK,   RK_ARM,  RK_HN  ],
      [RK_WSP,  RK_CKS,  C,       RK_CK,   RK_CK,   RK_CK,   RK_CK,   C,       RK_CKS,  RK_WSP ],
      [C,       RK_WSP,  RK_CKS,  RK_CK,   RK_CKS,  RK_CK,   RK_CKS,  RK_WSP,  C,       C      ],
      [C,       C,       RK_WSP,  C,       RV_MSH,  RK_WSP,  C,       RK_WSP,  C,       C      ],
      [RK_WSP,  C,       C,       RK_WSP,  C,       C,       RK_WSP,  C,       C,       RK_WSP ],
    ], 4, 'enemy_hollow_reaver_stagger'));

    // ========== PROJECTILE: thrown scythe-blade ==========
    // 8×8 sprite - a curved blade with handle stub. Renders with rotation in flight.
    const PB_BL  = 0xE8F4FF;   // blade highlight
    const PB_BLM = 0xA8C4E0;   // blade mid
    const PB_BLS = 0x5888A4;   // blade edge/shadow
    const PB_HN  = 0x140820;   // handle stub
    const PB_GLW = 0x44FFEE;   // hollow trailing glow
    const PB_DIM = 0x10162C;   // dim spectral edge

    this.registerTexture('projectile_scythe', () => this.createSpriteTexture([
      //        0        1        2        3        4        5        6        7
      [C,       PB_GLW,  PB_BL,   PB_BL,   PB_BLS,  C,       C,       C      ],
      [PB_GLW,  PB_BL,   PB_BLM,  PB_BLS,  C,       C,       C,       C      ],
      [C,       PB_DIM,  PB_BLS,  PB_BL,   PB_HN,   C,       C,       C      ],
      [C,       C,       PB_DIM,  PB_HN,   PB_HN,   PB_DIM,  C,       C      ],
      [C,       C,       C,       PB_DIM,  PB_HN,   PB_HN,   C,       C      ],
      [C,       C,       C,       C,       PB_DIM,  PB_HN,   PB_HN,   C      ],
      [C,       C,       C,       C,       C,       PB_GLW,  PB_HN,   PB_DIM ],
      [C,       C,       C,       C,       C,       C,       PB_GLW,  PB_HN  ],
    ], 4, 'projectile_scythe'));

    this.registerTexture('projectile_scythe_falling', () => this.createSpriteTexture([
      //        0        1        2        3        4        5        6        7
      [C,       C,       C,       PB_GLW,  PB_BLS,  PB_BL,   PB_BLM,  C      ],
      [C,       C,       PB_DIM,  PB_BLS,  PB_BL,   PB_BLM,  PB_BL,   PB_BLS ],
      [C,       PB_DIM,  PB_BLS,  PB_BL,   PB_BLM,  C,       PB_HN,   C      ],
      [PB_GLW,  PB_BLS,  PB_BL,   PB_BLM,  C,       PB_HN,   C,       C      ],
      [PB_DIM,  PB_BLS,  PB_BL,   PB_BLM,  C,       PB_HN,   C,       C      ],
      [C,       PB_DIM,  PB_BLS,  PB_BL,   PB_BLM,  C,       PB_HN,   C      ],
      [C,       C,       PB_DIM,  PB_BLS,  PB_BL,   PB_BLM,  PB_BL,   PB_BLS ],
      [C,       C,       C,       PB_GLW,  PB_BLS,  PB_BL,   PB_BLM,  C      ],
    ], 4, 'projectile_scythe_falling'));

    const SH_HI = 0xFFF0C8;
    const SH_MID = 0xD9A66F;
    const SH_EDGE = 0x8B5A3C;
    const SH_WET = 0x8EDCFF;
    this.registerTexture('projectile_shell', () => this.createSpriteTexture([
      [C,       C,       SH_WET,  C,       C,       C,       C,       C      ],
      [C,       SH_HI,   SH_HI,   SH_MID,  C,       C,       C,       C      ],
      [SH_WET,  SH_HI,   SH_MID,  SH_MID,  SH_EDGE, C,       C,       C      ],
      [C,       SH_MID,  SH_MID,  SH_EDGE, SH_EDGE, C,       C,       C      ],
      [C,       C,       SH_EDGE, SH_EDGE, C,       SH_WET,  C,       C      ],
      [C,       C,       C,       C,       C,       C,       C,       C      ],
      [C,       C,       C,       C,       C,       C,       C,       C      ],
      [C,       C,       C,       C,       C,       C,       C,       C      ],
    ], 4, 'projectile_shell'));

    // Ridge Revenant spectral blade - a summoned dagger pointing RIGHT (+X). The
    // bladestorm sets each projectile's rotation to its travel angle (spinRate 0),
    // so the tip always leads. Teal-core, purple-bodied to match the wraith.
    const SB_CORE = 0xE0FFFA; // bright spectral edge
    const SB_BL   = 0xC890F0; // purple light blade
    const SB_MID  = 0x8248C8; // purple body
    const SB_GLW  = 0x40FFEE; // teal aura
    const SB_HN   = 0x220E40; // dark hilt
    this.registerTexture('projectile_spectral_blade', () => this.createSpriteTexture([
      //        0        1        2        3        4        5        6        7
      [C,       C,       C,       C,       C,       C,       C,       C      ],
      [C,       C,       C,       C,       C,       SB_GLW,  C,       C      ],
      [C,       C,       C,       SB_GLW,  SB_BL,   SB_CORE, SB_GLW,  C      ],
      [SB_GLW,  SB_HN,   SB_MID,  SB_BL,   SB_CORE, SB_CORE, SB_CORE, SB_CORE],
      [SB_GLW,  SB_HN,   SB_MID,  SB_BL,   SB_BL,   SB_CORE, SB_GLW,  C      ],
      [C,       C,       C,       SB_GLW,  SB_MID,  SB_BL,   C,       C      ],
      [C,       C,       C,       C,       SB_GLW,  C,       C,       C      ],
      [C,       C,       C,       C,       C,       C,       C,       C      ],
    ], 4, 'projectile_spectral_blade'));

    // Ridge Revenant casting arm - a sleeved forearm ending in a pale claw wreathed in teal
    // cast-energy, pointing RIGHT (+X). The bladestorm overlay anchors this at the wraith's
    // shoulder and sweeps it up toward the aim as the cast charges (the "hand wave").
    const AR_SL = 0x220E40; // sleeve dark
    const AR_SM = 0x3E1C6E; // sleeve mid
    const AR_SH = 0x5E30A0; // sleeve highlight
    const AR_CW = 0xC8A8E8; // pale claw
    const AR_GL = 0x40FFEE; // teal cast energy
    this.registerTexture('fx_revenant_cast_arm', () => this.createSpriteTexture([
      //        0        1        2        3        4        5        6        7
      [C,       C,       C,       C,       C,       C,       C,       C      ],
      [C,       C,       C,       C,       C,       AR_GL,   C,       C      ],
      [AR_SL,   AR_SM,   AR_SM,   AR_SH,   AR_CW,   AR_CW,   AR_GL,   C      ],
      [AR_SL,   AR_SM,   AR_SH,   AR_SH,   AR_CW,   AR_CW,   AR_CW,   AR_GL  ],
      [AR_SL,   AR_SM,   AR_SM,   AR_SH,   AR_CW,   AR_CW,   AR_GL,   C      ],
      [C,       AR_SL,   AR_SM,   AR_SH,   AR_CW,   AR_GL,   C,       C      ],
      [C,       C,       C,       C,       AR_GL,   C,       C,       C      ],
      [C,       C,       C,       C,       C,       C,       C,       C      ],
    ], 4, 'fx_revenant_cast_arm'));

    this.registerTexture('hazard_scythe_marker', () => this.createSpriteTexture([
      [C,       C,       PB_DIM,  C,       C,       C,       PB_DIM,  C      ],
      [C,       PB_DIM,  C,       C,       PB_GLW,  C,       C,       C      ],
      [PB_DIM,  C,       PB_GLW,  C,       PB_BLS,  PB_GLW,  C,       PB_DIM ],
      [C,       C,       C,       PB_BLS,  PB_BLM,  PB_BLS,  PB_GLW,  C      ],
      [C,       PB_GLW,  PB_BLS,  PB_BLM,  PB_BLS,  C,       C,       C      ],
      [PB_DIM,  C,       PB_GLW,  PB_BLS,  C,       PB_GLW,  C,       PB_DIM ],
      [C,       C,       C,       PB_GLW,  C,       C,       PB_DIM,  C      ],
      [C,       PB_DIM,  C,       C,       C,       PB_DIM,  C,       C      ],
    ], 4, 'hazard_scythe_marker'));

    const HC_CORE = 0x55FFEE;
    const HC_PURP = 0x9C55FF;
    const HC_DARK = 0x191126;
    const HC_DIM = 0x2E2440;
    this.registerTexture('fx_hollow_nova_cracks', () => this.createSpriteTexture([
      [C,       C,       C,       HC_DIM,  C,       C,       C,       C,       C,       HC_DIM,  C,       C],
      [C,       HC_DIM,  C,       HC_PURP, C,       C,       HC_DARK, C,       HC_PURP, C,       C,       C],
      [C,       C,       HC_DIM,  HC_PURP, HC_CORE, C,       HC_DARK, HC_CORE, HC_PURP, HC_DIM,  C,       C],
      [HC_DIM,  HC_PURP, HC_PURP, C,       HC_CORE, HC_DARK, HC_CORE, C,       HC_PURP, HC_PURP, HC_DIM,  C],
      [C,       C,       HC_CORE, HC_CORE, HC_DARK, HC_CORE, HC_DARK, HC_CORE, HC_CORE, C,       C,       C],
      [C,       HC_DARK, C,       HC_DARK, HC_CORE, C,       C,       HC_CORE, HC_DARK, C,       HC_DARK, C],
      [C,       C,       HC_CORE, HC_CORE, HC_DARK, HC_CORE, HC_DARK, HC_CORE, HC_CORE, C,       C,       C],
      [C,       HC_DIM,  HC_PURP, HC_PURP, C,       HC_CORE, HC_DARK, HC_CORE, C,       HC_PURP, HC_PURP, HC_DIM],
      [C,       C,       HC_DIM,  HC_PURP, HC_CORE, HC_DARK, C,       HC_CORE, HC_PURP, HC_DIM,  C,       C],
      [C,       C,       C,       C,       HC_PURP, C,       C,       C,       HC_PURP, C,       HC_DIM,  C],
      [C,       HC_DIM,  C,       C,       C,       HC_DIM,  C,       C,       C,       C,       C,       C],
      [C,       C,       C,       HC_DIM,  C,       C,       C,       HC_DIM,  C,       C,       C,       C],
    ], 4, 'fx_hollow_nova_cracks'));

    // ========== NEW ENEMY: Plant Monster ==========
    const VINE = 0x2E7D32;
    const VINE_H = 0x43A047;
    const VINE_S = 0x1B5E20;
    const PETAL_E = 0xE91E63;
    const PETAL_EH = 0xF06292;
    const THORN = 0x5D4037;
    const BULB = 0x8BC34A;
    const BULB_S = 0x689F38;

    this.registerTexture('enemy_plant', () => this.createSpriteTexture([
      [C,       C,       PETAL_EH,PETAL_E, PETAL_EH,PETAL_E, C,       C,       C,       C],
      [C,       PETAL_E, PETAL_EH,0xFFEB3B,0xFFEB3B,PETAL_EH,PETAL_E, C,       C,       C],
      [VINE_S,  VINE,    PETAL_E, PETAL_EH,PETAL_E, PETAL_E, VINE,    VINE_S,  C,       C],
      [C,       VINE_S,  VINE,    BULB,    BULB_S,  VINE,    VINE_S,  C,       C,       C],
      [THORN,   VINE,    VINE_H,  VINE,    VINE,    VINE_H,  VINE,    THORN,   C,       C],
      [C,       VINE_S,  VINE,    VINE_S,  VINE_S,  VINE,    VINE_S,  C,       C,       C],
      [C,       C,       VINE_S,  VINE,    VINE,    VINE_S,  C,       C,       C,       C],
      [C,       VINE_S,  C,       VINE_S,  VINE_S,  C,       VINE_S,  C,       C,       C],
    ], 4, 'enemy_plant'));

    this.registerTexture('enemy_plant_telegraph', () => this.createSpriteTexture([
      [PETAL_EH,C,       PETAL_EH,PETAL_E, PETAL_EH,PETAL_E, C,       PETAL_EH,C,       C],
      [C,       PETAL_E, 0xFFEB3B,0xFFEB3B,0xFFEB3B,0xFFEB3B,PETAL_E, C,       C,       C],
      [VINE,    VINE_H,  PETAL_E, PETAL_EH,PETAL_E, PETAL_E, VINE_H,  VINE,    C,       C],
      [THORN,   VINE,    VINE_H,  BULB,    BULB_S,  VINE_H,  VINE,    THORN,   C,       C],
      [THORN,   VINE_H,  VINE,    VINE_H,  VINE_H,  VINE,    VINE_H,  THORN,   C,       C],
      [C,       VINE,    VINE_S,  VINE,    VINE,    VINE_S,  VINE,    C,       C,       C],
      [C,       C,       VINE_S,  VINE,    VINE,    VINE_S,  C,       C,       C,       C],
      [C,       VINE_S,  C,       VINE_S,  VINE_S,  C,       VINE_S,  C,       C,       C],
    ], 4, 'enemy_plant_telegraph'));

    this.registerTexture('enemy_plant_attack', () => this.createSpriteTexture([
      [PETAL_E, PETAL_EH,PETAL_E, PETAL_EH,PETAL_E, PETAL_EH,PETAL_E, PETAL_EH,C,       C],
      [THORN,   PETAL_E, 0xFFEB3B,0xFFEB3B,0xFFEB3B,0xFFEB3B,PETAL_E, THORN,   C,       C],
      [THORN,   VINE_H,  PETAL_E, PETAL_EH,PETAL_E, PETAL_E, VINE_H,  THORN,   C,       C],
      [C,       VINE,    VINE_H,  BULB,    BULB_S,  VINE_H,  VINE,    C,       C,       C],
      [THORN,   VINE_H,  VINE,    VINE_H,  VINE_H,  VINE,    VINE_H,  THORN,   C,       C],
      [C,       VINE,    VINE_S,  VINE,    VINE,    VINE_S,  VINE,    C,       C,       C],
      [C,       C,       VINE_S,  VINE,    VINE,    VINE_S,  C,       C,       C,       C],
      [C,       VINE_S,  C,       VINE_S,  VINE_S,  C,       VINE_S,  C,       C,       C],
    ], 4, 'enemy_plant_attack'));

    this.registerTexture('fx_vine_lash', () => this.createSpriteTexture([
      [C,      C,      C,      VINE_S, C,      C,      VINE_S, C,      C,      VINE_S, C,      C,      VINE_S, C,      C,      THORN],
      [VINE_S, VINE,   VINE_H, VINE,   VINE,   VINE_H, VINE,   VINE,   VINE_H, VINE,   VINE,   VINE_H, VINE,   VINE,   VINE_H, THORN],
      [C,      VINE_S, VINE,   VINE_S, VINE_H, VINE,   VINE_S, VINE_H, VINE,   VINE_S, VINE_H, VINE,   VINE_S, VINE_H, VINE,   C],
      [C,      C,      THORN,  C,      C,      THORN,  C,      C,      THORN,  C,      C,      THORN,  C,      C,      C,      C],
    ], 4, 'fx_vine_lash'));

    this.registerTexture('fx_vine_lash_tip', () => this.createSpriteTexture([
      [C,      C,      THORN,  C,      C,      C],
      [C,      VINE_S, VINE_H, THORN,  C,      C],
      [VINE_S, VINE_H, VINE_H, VINE,   THORN,  C],
      [C,      VINE_S, VINE_H, THORN,  C,      C],
      [C,      C,      THORN,  C,      C,      C],
      [C,      C,      C,      C,      C,      C],
    ], 4, 'fx_vine_lash_tip'));

    this.registerTexture('enemy_plant_walk_0', () => this.createSpriteTexture([
      [C,       C,       PETAL_EH,PETAL_E, PETAL_EH,PETAL_E, C,       C,       C,       C],
      [C,       PETAL_E, PETAL_EH,0xFFEB3B,0xFFEB3B,PETAL_EH,PETAL_E, C,       C,       C],
      [VINE_S,  VINE,    PETAL_E, PETAL_EH,PETAL_E, PETAL_E, VINE,    VINE_S,  C,       C],
      [C,       VINE_S,  VINE,    BULB,    BULB_S,  VINE,    VINE_S,  C,       C,       C],
      [THORN,   VINE,    VINE_H,  VINE,    VINE,    VINE_H,  VINE,    THORN,   C,       C],
      [C,       VINE_S,  VINE,    VINE_S,  VINE_S,  VINE,    VINE_S,  C,       C,       C],
      [VINE_S,  C,       VINE_S,  VINE,    VINE,    VINE_S,  C,       VINE_S,  C,       C],
      [C,       VINE_S,  C,       VINE_S,  VINE_S,  C,       VINE_S,  C,       C,       C],
    ], 4, 'enemy_plant_walk_0'));

    this.registerTexture('enemy_plant_walk_1', () => this.createSpriteTexture([
      [C,       C,       PETAL_EH,PETAL_E, PETAL_EH,PETAL_E, C,       C,       C,       C],
      [C,       PETAL_E, PETAL_EH,0xFFEB3B,0xFFEB3B,PETAL_EH,PETAL_E, C,       C,       C],
      [VINE_S,  VINE,    PETAL_E, PETAL_EH,PETAL_E, PETAL_E, VINE,    VINE_S,  C,       C],
      [C,       VINE_S,  VINE,    BULB,    BULB_S,  VINE,    VINE_S,  C,       C,       C],
      [THORN,   VINE,    VINE_H,  VINE,    VINE,    VINE_H,  VINE,    THORN,   C,       C],
      [C,       VINE_S,  VINE,    VINE_S,  VINE_S,  VINE,    VINE_S,  C,       C,       C],
      [C,       VINE_S,  C,       VINE_S,  VINE,    VINE,    VINE_S,  C,       VINE_S,  C],
      [VINE_S,  C,       VINE_S,  C,       VINE_S,  VINE_S,  C,       VINE_S,  C,       C],
    ], 4, 'enemy_plant_walk_1'));

    this.registerTexture('enemy_plant_walk_2', () => this.createSpriteTexture([
      [C,       C,       PETAL_EH,PETAL_E, PETAL_EH,PETAL_E, C,       C,       C,       C],
      [C,       PETAL_E, PETAL_EH,0xFFEB3B,0xFFEB3B,PETAL_EH,PETAL_E, C,       C,       C],
      [VINE_S,  VINE,    PETAL_E, PETAL_EH,PETAL_E, PETAL_E, VINE,    VINE_S,  C,       C],
      [C,       VINE_S,  VINE,    BULB,    BULB_S,  VINE,    VINE_S,  C,       C,       C],
      [THORN,   VINE,    VINE_H,  VINE,    VINE,    VINE_H,  VINE,    THORN,   C,       C],
      [C,       VINE_S,  VINE,    VINE_S,  VINE_S,  VINE,    VINE_S,  C,       C,       C],
      [C,       C,       VINE_S,  C,       VINE_S,  VINE,    VINE,    VINE_S,  C,       VINE_S],
      [C,       VINE_S,  C,       VINE_S,  C,       VINE_S,  VINE_S,  C,       VINE_S,  C],
    ], 4, 'enemy_plant_walk_2'));

    this.registerTexture('enemy_plant_walk_3', () => this.createSpriteTexture([
      [C,       C,       PETAL_EH,PETAL_E, PETAL_EH,PETAL_E, C,       C,       C,       C],
      [C,       PETAL_E, PETAL_EH,0xFFEB3B,0xFFEB3B,PETAL_EH,PETAL_E, C,       C,       C],
      [VINE_S,  VINE,    PETAL_E, PETAL_EH,PETAL_E, PETAL_E, VINE,    VINE_S,  C,       C],
      [C,       VINE_S,  VINE,    BULB,    BULB_S,  VINE,    VINE_S,  C,       C,       C],
      [THORN,   VINE,    VINE_H,  VINE,    VINE,    VINE_H,  VINE,    THORN,   C,       C],
      [C,       VINE_S,  VINE,    VINE_S,  VINE_S,  VINE,    VINE_S,  C,       C,       C],
      [VINE_S,  C,       VINE_S,  C,       VINE,    VINE,    VINE_S,  C,       VINE_S,  C],
      [C,       VINE_S,  C,       VINE_S,  C,       VINE_S,  VINE_S,  VINE_S,  C,       C],
    ], 4, 'enemy_plant_walk_3'));

    // Stagger - petals drooped over sides, stems bowed inward from impact
    this.registerTexture('enemy_plant_stagger', () => this.createSpriteTexture([
      [C,       C,       C,       C,       C,       C,       C,       C,       C,       C],
      [C,       PETAL_E, PETAL_EH,C,       C,       C,       PETAL_EH,PETAL_E, C,       C],
      [VINE_S,  VINE,    PETAL_E, PETAL_EH,PETAL_E, PETAL_E, VINE,    VINE_S,  C,       C],
      [C,       VINE_S,  VINE,    BULB,    BULB_S,  VINE,    VINE_S,  C,       C,       C],
      [THORN,   VINE,    VINE_H,  VINE_S,  VINE_S,  VINE_H,  VINE,    THORN,   C,       C],
      [C,       THORN,   VINE_S,  VINE,    VINE,    VINE_S,  THORN,   C,       C,       C],
      [C,       C,       VINE,    THORN,   VINE,    VINE,    VINE_S,  C,       C,       C],
      [C,       VINE_S,  C,       VINE_S,  C,       VINE_S,  C,       VINE_S,  C,       C],
    ], 4, 'enemy_plant_stagger'));

    // ========== NEW ENEMY: Skeleton Warrior ==========
    const skeletonPalette = {
      hair: 0x546E7A, hairLight: 0x78909C, hairDark: 0x37474F,
      skin: 0xE0E0E0, skinLight: 0xFFFFFF, skinShadow: 0xB0BEC5,
      eyeIris: 0xEF5350, eyeIrisDark: 0xB71C1C,
      tunicMain: 0xB0BEC5, tunicLight: 0xCFD8DC, tunicDark: 0x90A4AE,
      trimColor: 0xECEFF1, trimLight: 0xFFFFFF,
      capeMain: 0x455A64, capeDark: 0x263238,
      pantColor: 0xB0BEC5, pantDark: 0x90A4AE,
      bootColor: 0x546E7A, bootDark: 0x37474F,
    };
    const skeletonDirs: Array<'down' | 'up' | 'left' | 'right'> = ['down', 'up', 'left', 'right'];
    const skeletonStates: Array<'idle' | 'walk' | 'attack' | 'charge'> = ['idle', 'walk', 'attack', 'charge'];
    for (const dir of skeletonDirs) {
      for (const state of skeletonStates) {
        const frames = state === 'attack' || state === 'charge' ? 3 : state === 'walk' ? 4 : 1;
        for (let frame = 0; frame < frames; frame++) {
          const d = dir;
          const s = state;
          const f = frame;
          const spriteId = `enemy_skeleton_${d}_${s}_${f}`;
          this.registerTexture(spriteId, () => this.createChibiCharacter(d, s, f, skeletonPalette, spriteId));
        }
      }
    }
    this.registerTexture('enemy_skeleton', () => this.getTexture('enemy_skeleton_down_idle_0')!);
    this.registerTexture('enemy_skeleton_telegraph', () => this.getTexture('enemy_skeleton_down_charge_1')!);
    this.registerTexture('enemy_skeleton_attack', () => this.getTexture('enemy_skeleton_down_attack_1')!);

    // ========== NEW ENEMY: Skeleton Captain ==========
    // Blackened iron armor, crimson trim, blazing red eyes â€” a veteran undead commander.
    const skeletonCaptainPalette = {
      hair: 0x37474F, hairLight: 0x546E7A, hairDark: 0x263238,
      skin: 0xCFD8DC, skinLight: 0xECEFF1, skinShadow: 0x90A4AE,
      eyeIris: 0xFF1744, eyeIrisDark: 0xD50000,
      tunicMain: 0x424242, tunicLight: 0x616161, tunicDark: 0x212121,
      trimColor: 0xB71C1C, trimLight: 0xE53935,
      capeMain: 0x37474F, capeDark: 0x263238,
      pantColor: 0x37474F, pantDark: 0x263238,
      bootColor: 0x212121, bootDark: 0x0D0D0D,
    };
    for (const dir of ['up', 'down', 'left', 'right'] as const) {
      for (const state of ['idle', 'walk', 'attack', 'charge'] as const) {
        const frames = state === 'attack' || state === 'charge' ? 3 : state === 'walk' ? 4 : 1;
        for (let frame = 0; frame < frames; frame++) {
          const spriteId = `enemy_skeleton_captain_${dir}_${state}_${frame}`;
          this.registerTexture(spriteId, () => this.createChibiCharacter(dir, state, frame, skeletonCaptainPalette, spriteId));
        }
      }
    }
    this.registerTexture('enemy_skeleton_captain', () => this.getTexture('enemy_skeleton_captain_down_idle_0')!);
    this.registerTexture('enemy_skeleton_captain_telegraph', () => this.getTexture('enemy_skeleton_captain_down_charge_1')!);
    this.registerTexture('enemy_skeleton_captain_attack', () => this.getTexture('enemy_skeleton_captain_down_attack_1')!);

    // ========== NEW ENEMY: Bandit ==========
    const banditPalette = {
      hair: 0x4E342E, hairLight: 0x6D4C41, hairDark: 0x3E2723,
      skin: 0xFFE0BD, skinLight: 0xFFF0D8, skinShadow: 0xE8C4A0,
      eyeIris: 0x455A64, eyeIrisDark: 0x263238,
      tunicMain: 0x5D4037, tunicLight: 0x795548, tunicDark: 0x3E2723,
      trimColor: 0x8D6E63, trimLight: 0xA1887F,
      capeMain: 0x4E342E, capeDark: 0x3E2723,
      pantColor: 0x3E2723, pantDark: 0x2C1B0E,
      bootColor: 0x4E342E, bootDark: 0x3E2723,
    };
    const banditDirs: Array<'down' | 'up' | 'left' | 'right'> = ['down', 'up', 'left', 'right'];
    const banditStates: Array<'idle' | 'walk' | 'attack' | 'charge'> = ['idle', 'walk', 'attack', 'charge'];
    for (const dir of banditDirs) {
      for (const state of banditStates) {
        const frames = state === 'attack' || state === 'charge' ? 3 : state === 'walk' ? 4 : 1;
        for (let frame = 0; frame < frames; frame++) {
          const d = dir;
          const s = state;
          const f = frame;
          const spriteId = `enemy_bandit_${d}_${s}_${f}`;
          this.registerTexture(spriteId, () => this.createChibiCharacter(d, s, f, banditPalette, spriteId));
        }
      }
    }
    this.registerTexture('enemy_bandit', () => this.getTexture('enemy_bandit_down_idle_0')!);
    this.registerTexture('enemy_bandit_telegraph', () => this.getTexture('enemy_bandit_down_charge_1')!);
    this.registerTexture('enemy_bandit_attack', () => this.getTexture('enemy_bandit_down_attack_1')!);

    // ========== FIELD BOSS: Golem ==========
    const GOL = 0x607060;
    const GOL_H = 0x788878;
    const GOL_S = 0x485048;
    const GOL_D = 0x303830;
    const GOL_EYE = 0xFF4400;
    const GOL_RUNE = 0x44FFAA;
    const GOL_RUNE_B = 0x66FFCC;

    // Shared body rows (rows 0-7) reused across all golem frames
    const golemBody: (readonly number[])[] = [
      [C,    C,    C,    GOL_S,GOL,  GOL_H,GOL,  GOL_S,C,    C,    C,    C],
      [C,    C,    GOL_S,GOL,  GOL_H,GOL,  GOL,  GOL_H,GOL,  GOL_S,C,    C],
      [C,    GOL_S,GOL,  GOL_EYE,GOL_D,GOL,GOL,  GOL_D,GOL_EYE,GOL,GOL_S,C],
      [C,    GOL,  GOL_D,GOL,  GOL_RUNE,GOL_D,GOL_D,GOL_RUNE,GOL,GOL_D,GOL,  C],
      [GOL_S,GOL,  GOL_H,GOL_D,GOL,  GOL,  GOL,  GOL,  GOL_D,GOL_H,GOL,  GOL_S],
      [GOL,  GOL_H,GOL,  GOL,  GOL_RUNE,GOL_D,GOL_D,GOL_RUNE,GOL,  GOL,  GOL_H,GOL],
      [GOL_S,GOL,  GOL_D,GOL,  GOL,  GOL,  GOL,  GOL,  GOL,  GOL_D,GOL,  GOL_S],
      [C,    GOL_D,GOL,  GOL_D,GOL,  GOL_D,GOL_D,GOL,  GOL_D,GOL,  GOL_D,C],
    ];
    const E = [C,C,C,C,C,C,C,C,C,C,C,C]; // empty row

    // Idle â€” neutral stance (12 rows for consistent sizing)
    this.registerTexture('enemy_golem', () => this.createSpriteTexture([
      ...golemBody,
      [C,    C,    GOL_S,GOL,  GOL_D,C,    C,    GOL_D,GOL,  GOL_S,C,    C],
      [C,    C,    GOL_D,GOL_S,GOL,  C,    C,    GOL,  GOL_S,GOL_D,C,    C],
      E, E,
    ], 4, 'enemy_golem'));

    // Walk frame 0 â€” left leg steps out 1 col, right stays at idle
    this.registerTexture('enemy_golem_walk_0', () => this.createSpriteTexture([
      ...golemBody,
      [C,    GOL_S,GOL,  GOL_D,C,    C,    C,    GOL_D,GOL,  GOL_S,C,    C],
      [C,    GOL_D,GOL_S,GOL,  C,    C,    C,    GOL,  GOL_S,GOL_D,C,    C],
      E, E,
    ], 4, 'enemy_golem_walk_0'));

    // Walk frame 1 â€” right leg steps out 1 col, left stays at idle
    this.registerTexture('enemy_golem_walk_1', () => this.createSpriteTexture([
      ...golemBody,
      [C,    C,    GOL_S,GOL,  GOL_D,C,    C,    C,    GOL_D,GOL,  GOL_S,C],
      [C,    C,    GOL_D,GOL_S,GOL,  C,    C,    C,    GOL,  GOL_S,GOL_D,C],
      E, E,
    ], 4, 'enemy_golem_walk_1'));

    // Telegraph â€” rearing back to strike: body shifted down 1, arms wider, runes bright
    this.registerTexture('enemy_golem_telegraph', () => this.createSpriteTexture([
      E,
      [C,    C,    C,    GOL_S,GOL,  GOL_H,GOL,  GOL_S,C,    C,    C,    C],
      [C,    C,    GOL_S,GOL,  GOL_H,GOL,  GOL,  GOL_H,GOL,  GOL_S,C,    C],
      [C,    GOL_S,GOL,  GOL_EYE,GOL_D,GOL,GOL,  GOL_D,GOL_EYE,GOL,GOL_S,C],
      [GOL_S,GOL,  GOL_D,GOL,  GOL_RUNE_B,GOL_D,GOL_D,GOL_RUNE_B,GOL,GOL_D,GOL,GOL_S],
      [GOL,  GOL_H,GOL_H,GOL_D,GOL,  GOL,  GOL,  GOL,  GOL_D,GOL_H,GOL_H,GOL],
      [GOL_S,GOL_H,GOL,  GOL,  GOL_RUNE_B,GOL_D,GOL_D,GOL_RUNE_B,GOL,GOL,GOL_H,GOL_S],
      [GOL_S,GOL,  GOL_D,GOL,  GOL,  GOL,  GOL,  GOL,  GOL,  GOL_D,GOL,  GOL_S],
      [C,    GOL_D,GOL,  GOL_D,GOL,  GOL_D,GOL_D,GOL,  GOL_D,GOL,  GOL_D,C],
      [C,    C,    GOL_S,GOL,  GOL_D,C,    C,    GOL_D,GOL,  GOL_S,C,    C],
      [C,    C,    GOL_D,GOL_S,GOL,  C,    C,    GOL,  GOL_S,GOL_D,C,    C],
      E,
    ], 4, 'enemy_golem_telegraph'));

    // Attack â€” lunging forward: body shifted up 1, arms extended
    this.registerTexture('enemy_golem_attack', () => this.createSpriteTexture([
      [C,    C,    GOL_S,GOL,  GOL_H,GOL,  GOL,  GOL_H,GOL,  GOL_S,C,    C],
      [C,    GOL_S,GOL,  GOL_EYE,GOL_D,GOL,GOL,  GOL_D,GOL_EYE,GOL,GOL_S,C],
      [GOL_S,GOL,  GOL_D,GOL,  GOL_RUNE,GOL_D,GOL_D,GOL_RUNE,GOL,GOL_D,GOL,GOL_S],
      [GOL,  GOL_H,GOL_H,GOL_D,GOL,  GOL,  GOL,  GOL,  GOL_D,GOL_H,GOL_H,GOL],
      [GOL_S,GOL_H,GOL,  GOL,  GOL_RUNE,GOL_D,GOL_D,GOL_RUNE,GOL,GOL,GOL_H,GOL_S],
      [GOL_S,GOL,  GOL_D,GOL,  GOL,  GOL,  GOL,  GOL,  GOL,  GOL_D,GOL,  GOL_S],
      [C,    GOL_D,GOL,  GOL_D,GOL,  GOL_D,GOL_D,GOL,  GOL_D,GOL,  GOL_D,C],
      [C,    C,    GOL_S,GOL,  GOL_D,C,    C,    GOL_D,GOL,  GOL_S,C,    C],
      [C,    C,    GOL_D,GOL_S,GOL,  C,    C,    GOL,  GOL_S,GOL_D,C,    C],
      E, E, E,
    ], 4, 'enemy_golem_attack'));

    // Stagger â€” off-balance: legs splayed wide, right foot buckles lower
    this.registerTexture('enemy_golem_stagger', () => this.createSpriteTexture([
      ...golemBody,
      [C,    GOL_S,GOL,  GOL_D,C,    C,    C,    C,    GOL_D,GOL,  GOL_S,C],
      [C,    GOL_D,GOL_S,GOL,  C,    C,    C,    C,    C,    GOL,  GOL_S,C],
      [C,    C,    C,    C,    C,    C,    C,    C,    C,    GOL_S,GOL_D,C],
      E,
    ], 4, 'enemy_golem_stagger'));

    // ========== FIELD BOSS: Golem â€” Phase 2 (cracked stone, brighter runes) ==========
    const GOL_CRK = 0x1A2018;  // deep crack lines
    const GOL_P2 = 0x585858;   // weathered stone (slightly lighter, desaturated)
    const GOL_P2H = 0x707070;
    const GOL_P2S = 0x404040;
    const GOL_P2D = 0x282828;
    const GOL_P2EYE = 0xFF6600; // fiercer orange eyes
    const GOL_P2R = 0x88FFDD;   // blazing runes

    const golemP2Body: (readonly number[])[] = [
      [C,      C,      C,      GOL_P2S,GOL_P2, GOL_P2H,GOL_P2, GOL_P2S,C,      C,      C,      C],
      [C,      C,      GOL_P2S,GOL_P2, GOL_P2H,GOL_CRK,GOL_P2, GOL_P2H,GOL_P2, GOL_P2S,C,      C],
      [C,      GOL_P2S,GOL_CRK,GOL_P2EYE,GOL_P2D,GOL_P2,GOL_P2,GOL_P2D,GOL_P2EYE,GOL_CRK,GOL_P2S,C],
      [C,      GOL_P2, GOL_P2D,GOL_CRK,GOL_P2R,GOL_P2D,GOL_P2D,GOL_P2R,GOL_CRK,GOL_P2D,GOL_P2, C],
      [GOL_P2S,GOL_P2, GOL_P2H,GOL_P2D,GOL_CRK,GOL_P2, GOL_P2, GOL_CRK,GOL_P2D,GOL_P2H,GOL_P2, GOL_P2S],
      [GOL_P2, GOL_P2H,GOL_CRK,GOL_P2, GOL_P2R,GOL_P2D,GOL_P2D,GOL_P2R,GOL_P2, GOL_CRK,GOL_P2H,GOL_P2],
      [GOL_P2S,GOL_P2, GOL_P2D,GOL_CRK,GOL_P2, GOL_P2, GOL_P2, GOL_P2, GOL_CRK,GOL_P2D,GOL_P2, GOL_P2S],
      [C,      GOL_P2D,GOL_CRK,GOL_P2D,GOL_P2, GOL_P2D,GOL_P2D,GOL_P2, GOL_P2D,GOL_CRK,GOL_P2D,C],
    ];

    this.registerTexture('enemy_golem_phase2', () => this.createSpriteTexture([
      ...golemP2Body,
      [C,    C,    GOL_P2S,GOL_P2, GOL_P2D,C,    C,    GOL_P2D,GOL_P2, GOL_P2S,C,    C],
      [C,    C,    GOL_P2D,GOL_P2S,GOL_P2, C,    C,    GOL_P2, GOL_P2S,GOL_P2D,C,    C],
      E, E,
    ], 4, 'enemy_golem_phase2'));

    this.registerTexture('enemy_golem_phase2_walk_0', () => this.createSpriteTexture([
      ...golemP2Body,
      [C,    GOL_P2S,GOL_P2, GOL_P2D,C,    C,    C,    GOL_P2D,GOL_P2, GOL_P2S,C,    C],
      [C,    GOL_P2D,GOL_P2S,GOL_P2, C,    C,    C,    GOL_P2, GOL_P2S,GOL_P2D,C,    C],
      E, E,
    ], 4, 'enemy_golem_phase2_walk_0'));

    this.registerTexture('enemy_golem_phase2_walk_1', () => this.createSpriteTexture([
      ...golemP2Body,
      [C,    C,    GOL_P2S,GOL_P2, GOL_P2D,C,    C,    C,    GOL_P2D,GOL_P2, GOL_P2S,C],
      [C,    C,    GOL_P2D,GOL_P2S,GOL_P2, C,    C,    C,    GOL_P2, GOL_P2S,GOL_P2D,C],
      E, E,
    ], 4, 'enemy_golem_phase2_walk_1'));

    this.registerTexture('enemy_golem_phase2_telegraph', () => this.createSpriteTexture([
      E,
      [C,      C,      C,      GOL_P2S,GOL_P2, GOL_P2H,GOL_P2, GOL_P2S,C,      C,      C,      C],
      [C,      C,      GOL_P2S,GOL_P2, GOL_P2H,GOL_CRK,GOL_P2, GOL_P2H,GOL_P2, GOL_P2S,C,      C],
      [C,      GOL_P2S,GOL_CRK,GOL_P2EYE,GOL_P2D,GOL_P2,GOL_P2,GOL_P2D,GOL_P2EYE,GOL_CRK,GOL_P2S,C],
      [GOL_P2S,GOL_P2, GOL_P2D,GOL_CRK,GOL_P2R,GOL_P2D,GOL_P2D,GOL_P2R,GOL_CRK,GOL_P2D,GOL_P2, GOL_P2S],
      [GOL_P2, GOL_P2H,GOL_P2H,GOL_P2D,GOL_CRK,GOL_P2, GOL_P2, GOL_CRK,GOL_P2D,GOL_P2H,GOL_P2H,GOL_P2],
      [GOL_P2S,GOL_P2H,GOL_CRK,GOL_P2, GOL_P2R,GOL_P2D,GOL_P2D,GOL_P2R,GOL_P2, GOL_CRK,GOL_P2H,GOL_P2S],
      [GOL_P2S,GOL_P2, GOL_P2D,GOL_CRK,GOL_P2, GOL_P2, GOL_P2, GOL_P2, GOL_CRK,GOL_P2D,GOL_P2, GOL_P2S],
      [C,      GOL_P2D,GOL_CRK,GOL_P2D,GOL_P2, GOL_P2D,GOL_P2D,GOL_P2, GOL_P2D,GOL_CRK,GOL_P2D,C],
      [C,    C,    GOL_P2S,GOL_P2, GOL_P2D,C,    C,    GOL_P2D,GOL_P2, GOL_P2S,C,    C],
      [C,    C,    GOL_P2D,GOL_P2S,GOL_P2, C,    C,    GOL_P2, GOL_P2S,GOL_P2D,C,    C],
      E,
    ], 4, 'enemy_golem_phase2_telegraph'));

    this.registerTexture('enemy_golem_phase2_attack', () => this.createSpriteTexture([
      [C,      C,      GOL_P2S,GOL_P2, GOL_P2H,GOL_CRK,GOL_P2, GOL_P2H,GOL_P2, GOL_P2S,C,      C],
      [C,      GOL_P2S,GOL_CRK,GOL_P2EYE,GOL_P2D,GOL_P2,GOL_P2,GOL_P2D,GOL_P2EYE,GOL_CRK,GOL_P2S,C],
      [GOL_P2S,GOL_P2, GOL_P2D,GOL_CRK,GOL_P2R,GOL_P2D,GOL_P2D,GOL_P2R,GOL_CRK,GOL_P2D,GOL_P2, GOL_P2S],
      [GOL_P2, GOL_P2H,GOL_P2H,GOL_P2D,GOL_CRK,GOL_P2, GOL_P2, GOL_CRK,GOL_P2D,GOL_P2H,GOL_P2H,GOL_P2],
      [GOL_P2S,GOL_P2H,GOL_CRK,GOL_P2, GOL_P2R,GOL_P2D,GOL_P2D,GOL_P2R,GOL_P2, GOL_CRK,GOL_P2H,GOL_P2S],
      [GOL_P2S,GOL_P2, GOL_P2D,GOL_CRK,GOL_P2, GOL_P2, GOL_P2, GOL_P2, GOL_CRK,GOL_P2D,GOL_P2, GOL_P2S],
      [C,      GOL_P2D,GOL_CRK,GOL_P2D,GOL_P2, GOL_P2D,GOL_P2D,GOL_P2, GOL_P2D,GOL_CRK,GOL_P2D,C],
      [C,    C,    GOL_P2S,GOL_P2, GOL_P2D,C,    C,    GOL_P2D,GOL_P2, GOL_P2S,C,    C],
      [C,    C,    GOL_P2D,GOL_P2S,GOL_P2, C,    C,    GOL_P2, GOL_P2S,GOL_P2D,C,    C],
      E, E, E,
    ], 4, 'enemy_golem_phase2_attack'));

    this.registerTexture('enemy_golem_phase2_stagger', () => this.createSpriteTexture([
      ...golemP2Body,
      [C,    GOL_P2S,GOL_P2, GOL_P2D,C,    C,    C,    C,    GOL_P2D,GOL_P2, GOL_P2S,C],
      [C,    GOL_P2D,GOL_P2S,GOL_P2, C,    C,    C,    C,    C,      GOL_P2, GOL_P2S,C],
      [C,    C,      C,      C,      C,    C,    C,    C,    C,      GOL_P2S,GOL_P2D,C],
      E,
    ], 4, 'enemy_golem_phase2_stagger'));

    // ========== BOSS: Hollow Apparition (giant shade, tall hooded figure) â€” 16x16 sprites ==========
    // Reuses the RK_* shade palette. Boss-specific extras:
    const HA_CRWN = 0x1A3A4A;  // crown ridge â€” dark teal-grey, tops the oversized hood
    const HA_CORE = 0x227777;  // chest core glow â€” muted teal (brighter on attack)
    const HA_SUMM = 0x55FFEE;  // summoning arc â€” bright teal flash on attack/phase change

    // Idle: towering hooded shade, dual teal eyes, energy-tendril arms, long trailing wisps
    this.registerTexture('enemy_hollow_guardian', () => this.createSpriteTexture([
      // row 0 â€” narrow hood peak with crown ridge
      [C,       C,       C,       C,       C,       C,       HA_CRWN, RK_CKH,  HA_CRWN, C,       C,       C,       C,       C,       C,       C      ],
      // row 1 â€” hood widens
      [C,       C,       C,       C,       C,       RK_CKS,  RK_CKH,  RK_CK,   RK_CKH,  RK_CKS,  C,       C,       C,       C,       C,       C      ],
      // row 2 â€” deep hood interior
      [C,       C,       C,       C,       RK_CKS,  RK_CK,   RK_HD,   RK_HD,   RK_HD,   RK_CK,   RK_CKS,  C,       C,       C,       C,       C      ],
      // row 3 â€” dual teal eye sockets (boss has two glowing eyes unlike regular shade)
      [C,       C,       C,       RK_CKS,  RK_CK,   RK_SKH,  RK_EYE,  RK_HD,   RK_EYE,  RK_SKH,  RK_CK,   RK_CKS,  C,       C,       C,       C      ],
      // row 4 â€” skull jaw, bone plates flanking void
      [C,       C,       RK_CKS,  RK_CK,   RK_SKS,  RK_SK,   RK_CKS,  RK_SKS,  RK_SK,   RK_CKS,  RK_CK,   RK_CKS,  C,       C,       C,       C      ],
      // row 5 â€” wide shoulders begin, chest core flickers
      [C,       RK_CKS,  RK_CK,   RK_CKH,  RK_CK,   RK_CKS,  HA_CORE, RK_CKS,  HA_CORE, RK_CKS,  RK_CKH,  RK_CK,   RK_CKS,  C,       C,       C      ],
      // row 6 â€” broadest shoulder width; energy tendril arms start
      [RK_CKS,  RK_CK,   RK_CKH,  RK_BLS,  RK_CKH,  RK_CK,   RK_CKH,  RK_CK,   RK_CKH,  RK_BLS,  RK_CKH,  RK_CKH,  RK_CK,   RK_CKS,  C,       C      ],
      // row 7 â€” tendrils reach outward, core pulses at center
      [RK_BL,   RK_BLS,  RK_CKS,  RK_CK,   RK_CKH,  RK_CKS,  RK_CK,   HA_CORE, RK_CK,   RK_CKS,  RK_CKH,  RK_CK,   RK_BLS,  RK_BL,   C,       C      ],
      // row 8 â€” lower body, cloak narrows
      [C,       RK_CKS,  RK_CK,   RK_CKH,  RK_CKS,  RK_CK,   RK_CKS,  RK_CK,   RK_CKS,  RK_CK,   RK_CKH,  RK_CK,   RK_CKS,  C,       C,       C      ],
      // row 9 â€” robe narrows further
      [C,       C,       RK_CKS,  RK_CK,   RK_CKH,  RK_CKS,  RK_CK,   RK_CKS,  RK_CK,   RK_CKH,  RK_CKS,  RK_CK,   C,       C,       C,       C      ],
      // row 10 â€” robe hem, wisps emerge
      [C,       C,       RK_CKS,  RK_CK,   RK_WSP,  RK_CKS,  RK_CKH,  RK_CKS,  RK_WSP,  RK_CK,   RK_CKS,  C,       C,       C,       C,       C      ],
      // row 11 â€” wisp tendrils spread wide
      [C,       RK_WSP,  RK_CKS,  RK_WSP,  RK_CK,   RK_CKS,  RK_WSP,  RK_CKS,  RK_CK,   RK_WSP,  RK_CKS,  RK_WSP,  C,       C,       C,       C      ],
      // row 12 â€” wisps scatter across full width
      [RK_WSP,  C,       RK_WSP,  C,       RK_WSP,  RK_CKS,  C,       RK_CKS,  RK_WSP,  C,       RK_WSP,  C,       RK_WSP,  C,       C,       C      ],
      // row 13 â€” sparse floating wisps
      [C,       RK_WSP,  C,       RK_WSP,  C,       RK_WSP,  C,       RK_WSP,  C,       RK_WSP,  C,       RK_WSP,  C,       C,       C,       C      ],
      // row 14 â€” fading wisp traces
      [RK_WSP,  C,       C,       C,       RK_WSP,  C,       RK_WSP,  C,       C,       RK_WSP,  C,       C,       C,       RK_WSP,  C,       C      ],
      // row 15 â€” last ghostly tendrils
      [C,       C,       RK_WSP,  C,       C,       C,       C,       RK_WSP,  C,       C,       C,       C,       RK_WSP,  C,       C,       C      ],
    ], 4, 'enemy_hollow_guardian'));

    // Telegraph: hunches forward, arms pull inward gathering void energy, eyes blaze, CHG charge outline
    this.registerTexture('enemy_hollow_guardian_telegraph', () => this.createSpriteTexture([
      // row 0 â€” hood peak with charge sparks
      [C,       C,       C,       C,       C,       RK_CHG,  HA_CRWN, RK_CKH,  HA_CRWN, RK_CHG,  C,       C,       C,       C,       C,       C      ],
      // row 1 â€” charge energy outlines hood
      [C,       C,       C,       C,       RK_CHG,  RK_CKS,  RK_CKH,  RK_CK,   RK_CKH,  RK_CKS,  RK_CHG,  C,       C,       C,       C,       C      ],
      // row 2 â€” hood interior lit by charge
      [C,       C,       C,       RK_CKS,  RK_CK,   RK_CHG,  RK_HD,   RK_HD,   RK_HD,   RK_CHG,  RK_CK,   RK_CKS,  C,       C,       C,       C      ],
      // row 3 â€” eyes blaze at full intensity
      [C,       C,       C,       RK_CKS,  RK_CK,   RK_SKH,  RK_EYG,  RK_HD,   RK_EYG,  RK_SKH,  RK_CK,   RK_CKS,  C,       C,       C,       C      ],
      // row 4 â€” jaw
      [C,       C,       RK_CKS,  RK_CK,   RK_SKS,  RK_SK,   RK_CKS,  RK_SKS,  RK_SK,   RK_CKS,  RK_CK,   RK_CKS,  C,       C,       C,       C      ],
      // row 5 â€” shoulders hunch forward, core SUMM energy flares
      [C,       RK_CHG,  RK_CK,   RK_CKH,  RK_CK,   RK_CKS,  HA_SUMM, RK_CKS,  HA_SUMM, RK_CKS,  RK_CKH,  RK_CK,   RK_CHG,  C,       C,       C      ],
      // row 6 â€” arms pull inward, charge energy at shoulder tips
      [RK_CHG,  RK_CK,   RK_CKH,  RK_BLS,  RK_CKH,  RK_CK,   RK_CKH,  RK_CK,   RK_CKH,  RK_BLS,  RK_CKH,  RK_CKH,  RK_CK,   RK_CHG,  C,       C      ],
      // row 7 â€” tendrils gather to center, void pool forms
      [C,       RK_BLS,  RK_CKS,  RK_BLS,  RK_CKH,  RK_BLS,  RK_CHG,  HA_SUMM, RK_CHG,  RK_BLS,  RK_CKH,  RK_BLS,  RK_CKS,  C,       C,       C      ],
      // row 8 â€” body compressed inward
      [C,       C,       RK_CKS,  RK_CK,   RK_CKH,  RK_CKS,  RK_CHG,  RK_CK,   RK_CHG,  RK_CKS,  RK_CKH,  RK_CK,   C,       C,       C,       C      ],
      // row 9 â€” body gathered tight
      [C,       C,       RK_CKS,  RK_CK,   RK_CKH,  RK_CKS,  RK_CK,   RK_CKS,  RK_CK,   RK_CKH,  RK_CKS,  RK_CK,   C,       C,       C,       C      ],
      // row 10 â€” wisps pulled upward (contracted)
      [C,       C,       C,       RK_CKS,  RK_WSP,  RK_CKS,  RK_CKH,  RK_CKS,  RK_WSP,  RK_CKS,  C,       C,       C,       C,       C,       C      ],
      // row 11 â€” tighter wisps
      [C,       C,       RK_WSP,  RK_CKS,  RK_CK,   RK_WSP,  RK_CKS,  RK_WSP,  RK_CK,   RK_CKS,  RK_WSP,  C,       C,       C,       C,       C      ],
      // row 12 â€” sparse contracted wisps
      [C,       RK_WSP,  C,       RK_WSP,  C,       RK_CKS,  C,       RK_CKS,  C,       RK_WSP,  C,       RK_WSP,  C,       C,       C,       C      ],
      // row 13 â€” minimal trailing wisps
      [C,       C,       RK_WSP,  C,       C,       RK_WSP,  C,       RK_WSP,  C,       C,       RK_WSP,  C,       C,       C,       C,       C      ],
      // row 14 â€” last wisps (almost gone)
      [C,       C,       C,       C,       RK_WSP,  C,       C,       C,       RK_WSP,  C,       C,       C,       C,       C,       C,       C      ],
      // row 15 â€” void
      [C,       C,       C,       C,       C,       C,       C,       C,       C,       C,       C,       C,       C,       C,       C,       C      ],
    ], 4, 'enemy_hollow_guardian_telegraph'));

    // Attack: arms thrust wide, slash arcs erupt, wisps explode outward, SUMM core flares
    this.registerTexture('enemy_hollow_guardian_attack', () => this.createSpriteTexture([
      // row 0 â€” hood stable
      [C,       C,       C,       C,       C,       C,       HA_CRWN, RK_CKH,  HA_CRWN, C,       C,       C,       C,       C,       C,       C      ],
      // row 1
      [C,       C,       C,       C,       C,       RK_CKS,  RK_CKH,  RK_CK,   RK_CKH,  RK_CKS,  C,       C,       C,       C,       C,       C      ],
      // row 2
      [C,       C,       C,       C,       RK_CKS,  RK_CK,   RK_HD,   RK_HD,   RK_HD,   RK_CK,   RK_CKS,  C,       C,       C,       C,       C      ],
      // row 3 â€” eyes full blaze
      [C,       C,       C,       RK_CKS,  RK_CK,   RK_SKH,  RK_EYG,  RK_HD,   RK_EYG,  RK_SKH,  RK_CK,   RK_CKS,  C,       C,       C,       C      ],
      // row 4
      [C,       C,       RK_CKS,  RK_CK,   RK_SKS,  RK_SK,   RK_CKS,  RK_SKS,  RK_SK,   RK_CKS,  RK_CK,   RK_CKS,  C,       C,       C,       C      ],
      // row 5 â€” core erupts with SUMM energy
      [C,       RK_CKS,  RK_CK,   RK_CKH,  RK_CK,   RK_SLH,  HA_SUMM, RK_SLH,  HA_SUMM, RK_SLH,  RK_CKH,  RK_CK,   RK_CKS,  C,       C,       C      ],
      // row 6 â€” arms swing fully outward; slash arc at tips
      [RK_SLH,  RK_BL,   RK_BLS,  RK_CKH,  RK_CK,   RK_CKH,  RK_CK,   RK_CKH,  RK_CK,   RK_CKH,  RK_BLS,  RK_BL,   RK_SLH,  C,       C,       C      ],
      // row 7 â€” slash arc extends to full width, SUMM flash at ends
      [HA_SUMM, RK_SLH,  RK_BLS,  RK_CK,   RK_CKH,  RK_CKS,  RK_CK,   HA_SUMM, RK_CK,   RK_CKS,  RK_CKH,  RK_BLS,  RK_SLH,  HA_SUMM, C,       C      ],
      // row 8 â€” body center
      [C,       C,       RK_CKS,  RK_CK,   RK_CKH,  RK_CKS,  RK_CK,   RK_CKS,  RK_CK,   RK_CKH,  RK_CKS,  RK_CK,   C,       C,       C,       C      ],
      // row 9
      [C,       C,       RK_CKS,  RK_CK,   RK_CKH,  RK_CKS,  RK_CK,   RK_CKS,  RK_CK,   RK_CKH,  RK_CKS,  RK_CK,   C,       C,       C,       C      ],
      // row 10 â€” wisps burst outward
      [C,       RK_WSP,  RK_CKS,  RK_WSP,  RK_CK,   RK_WSP,  RK_CKH,  RK_WSP,  RK_CK,   RK_WSP,  RK_CKS,  RK_WSP,  C,       C,       C,       C      ],
      // row 11 â€” wisps exploding wide
      [RK_WSP,  C,       RK_WSP,  RK_CKS,  RK_WSP,  RK_CKS,  RK_WSP,  RK_CKS,  RK_WSP,  RK_CKS,  RK_WSP,  C,       RK_WSP,  C,       C,       C      ],
      // row 12 â€” wisps scatter
      [C,       RK_WSP,  C,       RK_WSP,  C,       RK_WSP,  RK_CKS,  RK_WSP,  C,       RK_WSP,  C,       RK_WSP,  C,       C,       C,       C      ],
      // row 13 â€” wisps burst further
      [RK_WSP,  C,       RK_WSP,  C,       RK_WSP,  C,       RK_WSP,  C,       RK_WSP,  C,       RK_WSP,  C,       C,       RK_WSP,  C,       C      ],
      // row 14 â€” last burst traces
      [C,       C,       C,       RK_WSP,  C,       C,       C,       RK_WSP,  C,       C,       RK_WSP,  C,       C,       C,       C,       C      ],
      // row 15 â€” void
      [C,       C,       C,       C,       C,       C,       C,       C,       C,       C,       C,       C,       C,       C,       C,       C      ],
    ], 4, 'enemy_hollow_guardian_attack'));

    // ========== BOSS: Ashen Reaver (corrupted commander in dark armor, ember-red accents) â€” 16x16 sprites ==========
    const AR_ARM  = 0x2C2C2C;  // dark plate armor
    const AR_ARMH = 0x4A4A4A;  // armor highlight
    const AR_ARMS = 0x1A1A1A;  // armor deep shadow
    const AR_EMB  = 0xFF4400;  // ember glow accents
    const AR_EMBH = 0xFF8844;  // bright ember
    const AR_EYE  = 0xFF2200;  // burning red eyes
    const AR_EYEG = 0xFF6600;  // eye glow telegraph
    const AR_CAPE = 0x1A0E0E;  // tattered dark cape
    const AR_HELM = 0x3A3A3A;  // helm main
    const AR_HELS = 0x222222;  // helm shadow
    const AR_BLD  = 0x555555;  // greatsword blade
    const AR_BLDH = 0x888888;  // blade highlight
    const AR_CHG  = 0xFF6600;  // charge outline

    this.registerTexture('enemy_ashen_reaver', () => this.createSpriteTexture([
      [C,       C,       C,       C,       C,       AR_HELS, AR_HELM, AR_ARMH, AR_HELM, AR_HELS, C,       C,       C,       C,       C,       C      ],
      [C,       C,       C,       C,       AR_HELS, AR_HELM, AR_ARMH, AR_ARM,  AR_ARMH, AR_HELM, AR_HELS, C,       C,       C,       C,       C      ],
      [C,       C,       C,       C,       AR_ARM,  AR_ARMS, AR_EYE,  AR_ARMS, AR_EYE,  AR_ARMS, AR_ARM,  C,       C,       C,       C,       C      ],
      [C,       C,       C,       AR_ARMS, AR_ARM,  AR_ARMH, AR_ARM,  AR_EMB,  AR_ARM,  AR_ARMH, AR_ARM,  AR_ARMS, C,       C,       C,       C      ],
      [C,       C,       AR_BLD,  AR_BLDH, AR_ARM,  AR_ARMH, AR_EMB,  AR_ARM,  AR_EMB,  AR_ARMH, AR_ARM,  AR_BLD,  AR_BLDH, C,       C,       C      ],
      [C,       AR_BLD,  AR_BLDH, C,       AR_ARMS, AR_ARM,  AR_ARMH, AR_EMB,  AR_ARMH, AR_ARM,  AR_ARMS, C,       AR_BLD,  AR_BLDH, C,       C      ],
      [AR_BLD,  AR_BLDH, C,       C,       C,       AR_ARMS, AR_ARM,  AR_ARM,  AR_ARM,  AR_ARMS, C,       C,       C,       AR_BLD,  AR_BLDH, C      ],
      [C,       C,       C,       C,       C,       AR_CAPE, AR_ARM,  AR_EMB,  AR_ARM,  AR_CAPE, C,       C,       C,       C,       C,       C      ],
      [C,       C,       C,       C,       AR_CAPE, AR_ARMS, AR_ARM,  AR_ARM,  AR_ARM,  AR_ARMS, AR_CAPE, C,       C,       C,       C,       C      ],
      [C,       C,       C,       AR_CAPE, AR_ARMS, C,       AR_ARMS, AR_ARM,  AR_ARMS, C,       AR_ARMS, AR_CAPE, C,       C,       C,       C      ],
      [C,       C,       C,       AR_CAPE, C,       C,       AR_ARM,  AR_ARMS, AR_ARM,  C,       C,       AR_CAPE, C,       C,       C,       C      ],
      [C,       C,       AR_CAPE, C,       C,       C,       AR_ARMS, C,       AR_ARMS, C,       C,       C,       AR_CAPE, C,       C,       C      ],
      [C,       C,       AR_CAPE, C,       C,       AR_ARM,  AR_ARMH, C,       AR_ARM,  AR_ARMH, C,       C,       AR_CAPE, C,       C,       C      ],
      [C,       AR_CAPE, C,       C,       C,       AR_ARMS, AR_ARM,  C,       AR_ARMS, AR_ARM,  C,       C,       C,       AR_CAPE, C,       C      ],
      [C,       AR_CAPE, C,       C,       C,       C,       AR_ARMS, C,       C,       AR_ARMS, C,       C,       C,       AR_CAPE, C,       C      ],
      [AR_CAPE, C,       C,       C,       C,       C,       C,       C,       C,       C,       C,       C,       C,       C,       AR_CAPE, C      ],
    ], 4, 'enemy_ashen_reaver'));

    this.registerTexture('enemy_ashen_reaver_telegraph', () => this.createSpriteTexture([
      [C,       C,       C,       C,       C,       AR_CHG,  AR_HELM, AR_ARMH, AR_HELM, AR_CHG,  C,       C,       C,       C,       C,       C      ],
      [C,       C,       C,       C,       AR_CHG,  AR_HELM, AR_ARMH, AR_ARM,  AR_ARMH, AR_HELM, AR_CHG,  C,       C,       C,       C,       C      ],
      [C,       C,       C,       C,       AR_ARM,  AR_CHG,  AR_EYEG, AR_ARMS, AR_EYEG, AR_CHG,  AR_ARM,  C,       C,       C,       C,       C      ],
      [C,       C,       C,       AR_ARMS, AR_ARM,  AR_ARMH, AR_ARM,  AR_EMBH, AR_ARM,  AR_ARMH, AR_ARM,  AR_ARMS, C,       C,       C,       C      ],
      [C,       C,       AR_BLD,  AR_BLDH, AR_ARM,  AR_ARMH, AR_EMBH, AR_ARM,  AR_EMBH, AR_ARMH, AR_ARM,  AR_BLD,  AR_BLDH, C,       C,       C      ],
      [C,       AR_BLD,  AR_BLDH, C,       AR_ARMS, AR_ARM,  AR_ARMH, AR_EMBH, AR_ARMH, AR_ARM,  AR_ARMS, C,       AR_BLD,  AR_BLDH, C,       C      ],
      [AR_BLD,  AR_BLDH, C,       C,       C,       AR_ARMS, AR_ARM,  AR_ARM,  AR_ARM,  AR_ARMS, C,       C,       C,       AR_BLD,  AR_BLDH, C      ],
      [C,       C,       C,       C,       C,       AR_CAPE, AR_ARM,  AR_EMBH, AR_ARM,  AR_CAPE, C,       C,       C,       C,       C,       C      ],
      [C,       C,       C,       C,       AR_CAPE, AR_ARMS, AR_ARM,  AR_ARM,  AR_ARM,  AR_ARMS, AR_CAPE, C,       C,       C,       C,       C      ],
      [C,       C,       C,       AR_CAPE, AR_ARMS, C,       AR_ARMS, AR_ARM,  AR_ARMS, C,       AR_ARMS, AR_CAPE, C,       C,       C,       C      ],
      [C,       C,       C,       AR_CAPE, C,       C,       AR_ARM,  AR_ARMS, AR_ARM,  C,       C,       AR_CAPE, C,       C,       C,       C      ],
      [C,       C,       AR_CAPE, C,       C,       C,       AR_ARMS, C,       AR_ARMS, C,       C,       C,       AR_CAPE, C,       C,       C      ],
      [C,       C,       AR_CAPE, C,       C,       AR_ARM,  AR_ARMH, C,       AR_ARM,  AR_ARMH, C,       C,       AR_CAPE, C,       C,       C      ],
      [C,       AR_CAPE, C,       C,       C,       AR_ARMS, AR_ARM,  C,       AR_ARMS, AR_ARM,  C,       C,       C,       AR_CAPE, C,       C      ],
      [C,       AR_CAPE, C,       C,       C,       C,       AR_ARMS, C,       C,       AR_ARMS, C,       C,       C,       AR_CAPE, C,       C      ],
      [AR_CAPE, C,       C,       C,       C,       C,       C,       C,       C,       C,       C,       C,       C,       C,       AR_CAPE, C      ],
    ], 4, 'enemy_ashen_reaver_telegraph'));

    this.registerTexture('enemy_ashen_reaver_attack', () => this.createSpriteTexture([
      [C,       C,       C,       C,       C,       C,       AR_HELM, AR_ARMH, AR_HELM, C,       C,       C,       C,       C,       C,       C      ],
      [C,       C,       C,       C,       C,       AR_HELM, AR_ARMH, AR_ARM,  AR_ARMH, AR_HELM, C,       C,       C,       C,       C,       C      ],
      [C,       C,       C,       C,       AR_ARM,  AR_ARMS, AR_EYEG, AR_ARMS, AR_EYEG, AR_ARMS, AR_ARM,  C,       C,       C,       C,       C      ],
      [C,       C,       C,       AR_ARMS, AR_ARM,  AR_ARMH, AR_ARM,  AR_EMB,  AR_ARM,  AR_ARMH, AR_ARM,  AR_ARMS, C,       C,       C,       C      ],
      [C,       AR_BLD,  AR_BLDH, AR_BLD,  AR_ARM,  AR_ARMH, AR_EMB,  AR_ARM,  AR_EMB,  AR_ARMH, AR_ARM,  AR_BLD,  AR_BLDH, AR_BLD,  C,       C      ],
      [AR_BLD,  AR_BLDH, C,       C,       AR_ARMS, AR_ARM,  AR_ARMH, AR_EMB,  AR_ARMH, AR_ARM,  AR_ARMS, C,       C,       AR_BLD,  AR_BLDH, C      ],
      [C,       C,       C,       C,       C,       AR_ARMS, AR_ARM,  AR_ARM,  AR_ARM,  AR_ARMS, C,       C,       C,       C,       C,       AR_BLD ],
      [C,       C,       C,       C,       C,       AR_CAPE, AR_ARM,  AR_EMB,  AR_ARM,  AR_CAPE, C,       C,       C,       C,       C,       C      ],
      [C,       C,       C,       C,       AR_CAPE, AR_ARMS, AR_ARM,  AR_ARM,  AR_ARM,  AR_ARMS, AR_CAPE, C,       C,       C,       C,       C      ],
      [C,       C,       C,       AR_CAPE, AR_ARMS, C,       AR_ARMS, AR_ARM,  AR_ARMS, C,       AR_ARMS, AR_CAPE, C,       C,       C,       C      ],
      [C,       C,       C,       AR_CAPE, C,       C,       AR_ARM,  AR_ARMS, AR_ARM,  C,       C,       AR_CAPE, C,       C,       C,       C      ],
      [C,       C,       AR_CAPE, C,       C,       C,       AR_ARMS, C,       AR_ARMS, C,       C,       C,       AR_CAPE, C,       C,       C      ],
      [C,       C,       AR_CAPE, C,       C,       AR_ARM,  AR_ARMH, C,       AR_ARM,  AR_ARMH, C,       C,       AR_CAPE, C,       C,       C      ],
      [C,       AR_CAPE, C,       C,       C,       AR_ARMS, AR_ARM,  C,       AR_ARMS, AR_ARM,  C,       C,       C,       AR_CAPE, C,       C      ],
      [C,       AR_CAPE, C,       C,       C,       C,       AR_ARMS, C,       C,       AR_ARMS, C,       C,       C,       AR_CAPE, C,       C      ],
      [AR_CAPE, C,       C,       C,       C,       C,       C,       C,       C,       C,       C,       C,       C,       C,       AR_CAPE, C      ],
    ], 4, 'enemy_ashen_reaver_attack'));

    // --- Ridge Revenant: hooded void reaper - humanoid wraith matching the game thumbnail ---
    // Readable as humanoid only at a glance: huge thorned hood, bright soul-core,
    // one dominant talon mass, and a ragged cloak-body.
    const RR_VD  = 0x080412; // void core / face void (darkest black-purple)
    const RR_VH  = 0x140A24; // void dark highlight
    const RR_PD  = 0x220E40; // dark purple robe
    const RR_PM  = 0x3E1C6E; // mid purple
    const RR_PH  = 0x5E30A0; // purple highlight
    const RR_PL  = 0x8248C8; // purple light
    const RR_PA  = 0xA868E0; // purple accent
    const RR_PE  = 0xC890F0; // purple edge / brightest
    const RR_TL  = 0x00BBA0; // teal orb core
    const RR_TH  = 0x40FFEE; // teal orb highlight
    const RR_TS  = 0x008070; // teal shadow
    const RR_EYE = 0x90FFE8; // glowing eye (bright cyan)
    const RR_CLW = 0xC8A8E8; // pale purple claw
    const RR_WSP = 0x0E061E; // robe wisps
    const RR_BON = 0xB48ECF; // dead ridge-bone / talon shadow
    const RR_SLH = 0xE0FFFA; // claw slash glint (attack)
    const RR_GLP = 0xFF50FF; // glow pulse (telegraph)

    // Idle - hooded reaper: pointed hood, deep void face with two glowing eyes, defined
    // soul-core, oversized talon mass, and tapered cloak wisps. Light biases upper-left.
    this.registerTexture('enemy_ridge_revenant', () => this.createSpriteTexture([
      [C,       C,       C,       C,       C,       RR_PD,   C,       RR_PM,   C,       RR_PD,   C,       C,       C,       C,       C,       C      ],
      [C,       C,       C,       C,       RR_PD,   RR_PH,   RR_PM,   RR_PL,   RR_PH,   RR_PM,   RR_PD,   C,       C,       C,       C,       C      ],
      [C,       C,       C,       RR_PD,   RR_PM,   RR_PH,   RR_VD,   RR_VD,   RR_VD,   RR_PH,   RR_PM,   RR_PD,   C,       C,       C,       C      ],
      [C,       C,       RR_VH,   RR_PM,   RR_PH,   RR_VD,   RR_VD,   RR_EYE,  RR_EYE,  RR_VD,   RR_PM,   RR_PD,   RR_VH,   C,       C,       C      ],
      [C,       RR_VH,   RR_PM,   RR_PH,   RR_VD,   RR_VD,   RR_VD,   RR_TS,   RR_VD,   RR_VD,   RR_VD,   RR_PM,   RR_PD,   C,       C,       C      ],
      [C,       RR_PM,   RR_PH,   RR_PM,   RR_VD,   RR_VD,   RR_PD,   RR_PM,   RR_PD,   RR_VD,   RR_PM,   RR_PD,   RR_WSP,  C,       C,       C      ],
      [RR_BON,  RR_CLW,  RR_PM,   RR_PD,   RR_PM,   RR_PD,   RR_TS,   RR_TL,   RR_TL,   RR_TS,   RR_PD,   RR_PM,   RR_WSP,  C,       C,       C      ],
      [RR_CLW,  RR_BON,  RR_PH,   RR_PM,   RR_PD,   RR_PD,   RR_TL,   RR_TH,   RR_TH,   RR_TL,   RR_PD,   RR_PM,   RR_PD,   RR_WSP,  C,       C      ],
      [C,       RR_CLW,  RR_BON,  RR_PH,   RR_PM,   RR_PD,   RR_TS,   RR_TL,   RR_TL,   RR_TS,   RR_PD,   RR_PM,   RR_PD,   RR_WSP,  C,       C      ],
      [C,       C,       RR_CLW,  RR_BON,  RR_PH,   RR_PM,   RR_PD,   RR_PD,   RR_PD,   RR_PD,   RR_PM,   RR_PD,   RR_PM,   RR_WSP,  C,       C      ],
      [C,       C,       C,       RR_CLW,  RR_PM,   RR_PH,   RR_PM,   RR_PD,   RR_PD,   RR_PM,   RR_PD,   RR_PM,   RR_WSP,  RR_PD,   C,       C      ],
      [C,       C,       C,       RR_WSP,  RR_PM,   RR_PA,   RR_PH,   RR_PM,   RR_PD,   RR_PD,   RR_PM,   RR_WSP,  RR_CLW,  RR_BON,  C,       C      ],
      [C,       C,       RR_WSP,  RR_PH,   RR_PE,   RR_PM,   RR_PD,   RR_WSP,  RR_PD,   RR_PM,   RR_WSP,  RR_CLW,  RR_BON,  C,       C,       C      ],
      [C,       RR_WSP,  RR_VH,   RR_PD,   RR_PM,   RR_WSP,  RR_VH,   RR_PD,   RR_WSP,  RR_PD,   RR_WSP,  RR_BON,  C,       C,       C,       C      ],
      [C,       C,       RR_WSP,  RR_PD,   RR_WSP,  C,       RR_WSP,  RR_PD,   C,       RR_WSP,  RR_PD,   RR_WSP,  C,       C,       C,       C      ],
      [C,       C,       C,       RR_WSP,  C,       C,       RR_WSP,  C,       C,       RR_WSP,  C,       RR_WSP,  C,       C,       C,       C      ],
    ], 4, 'enemy_ridge_revenant'));

    // Telegraph - eyes flare, chest rune-sigil blazes, purple energy crackles along the hood,
    // thorned hood and tattered hem.
    this.registerTexture('enemy_ridge_revenant_telegraph', () => this.createSpriteTexture([
      [C,       C,       C,       C,       RR_GLP,  RR_PD,   C,       RR_PE,   C,       RR_GLP,  RR_PD,   C,       C,       C,       C,       C      ],
      [C,       C,       C,       RR_GLP,  RR_PD,   RR_PH,   RR_PE,   RR_PL,   RR_PE,   RR_PH,   RR_PD,   RR_GLP,  C,       C,       C,       C      ],
      [C,       C,       C,       RR_PD,   RR_PM,   RR_PE,   RR_VD,   RR_VD,   RR_VD,   RR_PE,   RR_PM,   RR_PD,   C,       C,       C,       C      ],
      [C,       C,       RR_GLP,  RR_PM,   RR_PE,   RR_VD,   RR_EYE,  RR_TH,   RR_TH,   RR_EYE,  RR_PM,   RR_PD,   RR_GLP,  C,       C,       C      ],
      [C,       RR_VH,   RR_PM,   RR_PE,   RR_VD,   RR_VD,   RR_VD,   RR_TL,   RR_VD,   RR_VD,   RR_VD,   RR_PM,   RR_PD,   RR_GLP,  C,       C      ],
      [RR_GLP,  RR_PM,   RR_PH,   RR_PM,   RR_VD,   RR_GLP,  RR_PD,   RR_PM,   RR_PD,   RR_GLP,  RR_PM,   RR_PD,   RR_WSP,  C,       C,       C      ],
      [RR_BON,  RR_CLW,  RR_PH,   RR_PD,   RR_PM,   RR_PD,   RR_TL,   RR_TH,   RR_TH,   RR_TL,   RR_PD,   RR_PM,   RR_WSP,  RR_GLP,  C,       C      ],
      [RR_CLW,  RR_BON,  RR_PE,   RR_PM,   RR_PD,   RR_TS,   RR_TH,   RR_TH,   RR_TH,   RR_TH,   RR_TS,   RR_PM,   RR_PD,   RR_WSP,  C,       C      ],
      [C,       RR_CLW,  RR_BON,  RR_PE,   RR_PM,   RR_PD,   RR_TL,   RR_TH,   RR_TH,   RR_TL,   RR_PD,   RR_PM,   RR_PD,   RR_WSP,  RR_GLP,  C      ],
      [C,       C,       RR_CLW,  RR_BON,  RR_PH,   RR_PM,   RR_PD,   RR_GLP,  RR_GLP,  RR_PD,   RR_PM,   RR_PD,   RR_PM,   RR_WSP,  C,       C      ],
      [C,       C,       RR_GLP,  RR_CLW,  RR_PM,   RR_PH,   RR_PM,   RR_PD,   RR_PD,   RR_PM,   RR_PD,   RR_PM,   RR_WSP,  RR_PD,   C,       C      ],
      [C,       C,       C,       RR_WSP,  RR_PM,   RR_PE,   RR_PH,   RR_PM,   RR_PD,   RR_PD,   RR_PM,   RR_WSP,  RR_CLW,  RR_BON,  RR_GLP,  C      ],
      [C,       C,       RR_WSP,  RR_PH,   RR_PE,   RR_PM,   RR_GLP,  RR_WSP,  RR_PD,   RR_PM,   RR_WSP,  RR_CLW,  RR_BON,  C,       C,       C      ],
      [C,       RR_WSP,  RR_GLP,  RR_PD,   RR_PM,   RR_WSP,  RR_VH,   RR_PD,   RR_GLP,  RR_PD,   RR_WSP,  RR_BON,  C,       C,       C,       C      ],
      [C,       C,       RR_WSP,  RR_PD,   RR_WSP,  C,       RR_WSP,  RR_PD,   C,       RR_WSP,  RR_PD,   RR_WSP,  RR_GLP,  C,       C,       C      ],
      [C,       C,       C,       RR_WSP,  C,       C,       RR_GLP,  C,       C,       RR_WSP,  C,       RR_WSP,  C,       C,       C,       C      ],
    ], 4, 'enemy_ridge_revenant_telegraph'));

    // Attack - claws rake DOWNWARD past the robe hem with slash glints (a descending swipe,
    // not a sideways flap); the soul-core discharges and dims to core teal.
    this.registerTexture('enemy_ridge_revenant_attack', () => this.createSpriteTexture([
      [C,       C,       C,       C,       C,       RR_PD,   C,       RR_PM,   C,       RR_PD,   C,       C,       C,       C,       C,       C      ],
      [C,       C,       C,       C,       RR_PD,   RR_PH,   RR_PM,   RR_PL,   RR_PH,   RR_PM,   RR_PD,   C,       C,       C,       C,       C      ],
      [C,       C,       C,       RR_PD,   RR_PM,   RR_PH,   RR_VD,   RR_VD,   RR_VD,   RR_PH,   RR_PM,   RR_PD,   C,       C,       C,       C      ],
      [C,       C,       RR_VH,   RR_PM,   RR_PH,   RR_VD,   RR_VD,   RR_EYE,  RR_EYE,  RR_VD,   RR_PM,   RR_PD,   RR_VH,   C,       C,       C      ],
      [RR_SLH,  C,       RR_PM,   RR_PH,   RR_VD,   RR_VD,   RR_VD,   RR_TS,   RR_VD,   RR_VD,   RR_VD,   RR_PM,   RR_PD,   C,       C,       C      ],
      [RR_CLW,  RR_SLH,  RR_PH,   RR_PM,   RR_VD,   RR_VD,   RR_PD,   RR_PM,   RR_PD,   RR_VD,   RR_PM,   RR_PD,   RR_WSP,  C,       C,       C      ],
      [RR_BON,  RR_CLW,  RR_SLH,  RR_PD,   RR_PM,   RR_PD,   RR_TS,   RR_TL,   RR_TL,   RR_TS,   RR_PD,   RR_PM,   RR_WSP,  C,       C,       C      ],
      [C,       RR_BON,  RR_CLW,  RR_SLH,  RR_PD,   RR_PM,   RR_TL,   RR_TH,   RR_TH,   RR_TL,   RR_PD,   RR_PM,   RR_PD,   RR_WSP,  C,       C      ],
      [C,       C,       RR_BON,  RR_CLW,  RR_SLH,  RR_PH,   RR_TS,   RR_TL,   RR_TL,   RR_TS,   RR_PD,   RR_PM,   RR_PD,   RR_WSP,  C,       C      ],
      [C,       C,       C,       RR_BON,  RR_CLW,  RR_SLH,  RR_PH,   RR_PD,   RR_PD,   RR_PD,   RR_PM,   RR_PD,   RR_PM,   RR_WSP,  C,       C      ],
      [C,       C,       C,       C,       RR_BON,  RR_CLW,  RR_SLH,  RR_PM,   RR_PD,   RR_PM,   RR_PD,   RR_PM,   RR_WSP,  RR_PD,   C,       C      ],
      [C,       C,       C,       RR_WSP,  RR_PM,   RR_BON,  RR_CLW,  RR_SLH,  RR_PD,   RR_PD,   RR_PM,   RR_WSP,  RR_CLW,  RR_BON,  C,       C      ],
      [C,       C,       RR_WSP,  RR_PH,   RR_PE,   RR_PM,   RR_BON,  RR_CLW,  RR_SLH,  RR_PM,   RR_WSP,  RR_CLW,  RR_BON,  C,       C,       C      ],
      [C,       RR_WSP,  RR_VH,   RR_PD,   RR_PM,   RR_WSP,  RR_VH,   RR_BON,  RR_CLW,  RR_SLH,  RR_WSP,  RR_BON,  C,       C,       C,       C      ],
      [C,       C,       RR_WSP,  RR_PD,   RR_WSP,  C,       RR_WSP,  RR_PD,   RR_BON,  RR_CLW,  RR_SLH,  RR_WSP,  C,       C,       C,       C      ],
      [C,       C,       C,       RR_WSP,  C,       C,       RR_WSP,  C,       C,       RR_BON,  RR_SLH,  RR_WSP,  C,       C,       C,       C      ],
    ], 4, 'enemy_ridge_revenant_attack'));

    const registerWalkAliasCycle = (prefix: string, frames: readonly string[]) => {
      for (let frame = 0; frame < frames.length; frame++) {
        const source = frames[frame];
        this.registerTexture(`${prefix}_walk_${frame}`, () => this.getTexture(source)!);
      }
    };

    registerWalkAliasCycle('enemy_slime', [
      'enemy_slime',
      'enemy_slime_attack',
      'enemy_slime',
      'enemy_slime_telegraph',
    ]);
    registerWalkAliasCycle('enemy_water_slime', [
      'enemy_water_slime',
      'enemy_water_slime_attack',
      'enemy_water_slime',
      'enemy_water_slime_telegraph',
    ]);
    registerWalkAliasCycle('enemy_corrupted_giant', [
      'enemy_corrupted_giant',
      'enemy_corrupted_giant',
      'enemy_corrupted_giant',
      'enemy_corrupted_giant',
    ]);
    registerWalkAliasCycle('enemy_void_wisp', [
      'enemy_void_wisp',
      'enemy_void_wisp_attack',
      'enemy_void_wisp',
      'enemy_void_wisp_telegraph',
    ]);
    registerWalkAliasCycle('enemy_shadow', [
      'enemy_shadow',
      'enemy_shadow',
      'enemy_shadow',
      'enemy_shadow',
    ]);
    registerWalkAliasCycle('enemy_hollow_reaver', [
      'enemy_hollow_reaver',
      'enemy_hollow_reaver',
      'enemy_hollow_reaver',
      'enemy_hollow_reaver',
    ]);
    registerWalkAliasCycle('enemy_hollow_guardian', [
      'enemy_hollow_guardian',
      'enemy_hollow_guardian',
      'enemy_hollow_guardian',
      'enemy_hollow_guardian',
    ]);
    registerWalkAliasCycle('enemy_ashen_reaver', [
      'enemy_ashen_reaver',
      'enemy_ashen_reaver_attack',
      'enemy_ashen_reaver',
      'enemy_ashen_reaver_telegraph',
    ]);
    // Neutral hover: the wraith keeps its idle pose while moving (the float bob comes from the
    // animation config), instead of pumping the arms through the attack/telegraph frames which
    // read as flapping wings. Telegraph/attack frames are still used by the combat states.
    registerWalkAliasCycle('enemy_ridge_revenant', [
      'enemy_ridge_revenant',
      'enemy_ridge_revenant',
      'enemy_ridge_revenant',
      'enemy_ridge_revenant',
    ]);

    this.registerTexture('enemy_golem_walk_2', () => this.createSpriteTexture([
      ...golemBody,
      [C,    C,    GOL_S,GOL,  GOL_D,C,    C,    GOL_D,GOL,  GOL_S,C,    C],
      [C,    GOL_D,GOL_S,GOL,  C,    C,    C,    C,    GOL,  GOL_S,GOL_D,C],
      E, E,
    ], 4, 'enemy_golem_walk_2'));

    this.registerTexture('enemy_golem_walk_3', () => this.createSpriteTexture([
      ...golemBody,
      [C,    GOL_S,GOL,  GOL_D,C,    C,    C,    GOL_D,GOL,  GOL_S,C,    C],
      [C,    GOL_D,GOL_S,GOL,  C,    C,    C,    GOL,  GOL_S,GOL_D,C,    C],
      E, E,
    ], 4, 'enemy_golem_walk_3'));

    this.registerTexture('enemy_golem_phase2_walk_2', () => this.createSpriteTexture([
      ...golemP2Body,
      [C,    C,    GOL_P2S,GOL_P2, GOL_P2D,C,    C,    GOL_P2D,GOL_P2, GOL_P2S,C,    C],
      [C,    GOL_P2D,GOL_P2S,GOL_P2, C,    C,    C,    C,    GOL_P2, GOL_P2S,GOL_P2D,C],
      E, E,
    ], 4, 'enemy_golem_phase2_walk_2'));

    this.registerTexture('enemy_golem_phase2_walk_3', () => this.createSpriteTexture([
      ...golemP2Body,
      [C,    GOL_P2S,GOL_P2, GOL_P2D,C,    C,    C,    GOL_P2D,GOL_P2, GOL_P2S,C,    C],
      [C,    GOL_P2D,GOL_P2S,GOL_P2, C,    C,    C,    GOL_P2, GOL_P2S,GOL_P2D,C,    C],
      E, E,
    ], 4, 'enemy_golem_phase2_walk_3'));

    this.registerTexture('enemy_stone_sentinel_walk_2', () => this.createSpriteTexture([
      [C,        C,        C,        SS_FUR,   SS_FUR_H, C,        C,        SS_FUR_H, SS_FUR,   C,        C,        C       ],
      [C,        C,        SS_FUR,   SS_STONE_H,SS_FUR_H,SS_PLATE_H,SS_PLATE_H,SS_FUR_H,SS_STONE_H,SS_FUR,  C,        C       ],
      [C,        SS_PLATE, SS_FUR_H, SS_EYE_RIM,SS_EYE, SS_STONE, SS_STONE, SS_EYE,  SS_EYE_RIM,SS_FUR_H,SS_PLATE, C       ],
      [C,        C,        SS_FUR,   SS_SNOUT, SS_SNOUT, SS_SNOUT, SS_SNOUT, SS_SNOUT,SS_FUR,   C,        C,        C       ],
      [C,        C,        C,        SS_FANG,  SS_SNOUT, SS_SNOUT, SS_SNOUT, SS_FANG, C,        C,        C,        C       ],
      [C,        SS_PLATE_S,SS_PLATE,SS_PLATE_H,SS_PLATE,SS_RUNE,  SS_PLATE, SS_PLATE_H,SS_PLATE,SS_PLATE_S,C,       C       ],
      [SS_FUR_S, SS_PLATE, SS_PLATE_H,SS_PLATE_S,SS_STONE,SS_STONE_S,SS_STONE,SS_PLATE_S,SS_PLATE_H,SS_PLATE,SS_FUR_S,C      ],
      [C,        SS_FUR_S, SS_STONE, SS_STONE_S,SS_FUR_S,SS_STONE_S,SS_FUR_S,SS_STONE_S,SS_STONE, SS_FUR_S, C,       C       ],
      [C,        SS_FUR_S, SS_CLAW,  C,        C,        SS_FUR_S, C,        C,        SS_CLAW, SS_FUR_S, C,        C       ],
      [C,        C,        C,        C,        C,        C,        C,        C,        C,        C,        C,        C       ],
    ], 4, 'enemy_stone_sentinel_walk_2'));

    this.registerTexture('enemy_stone_sentinel_walk_3', () => this.createSpriteTexture([
      [C,        C,        C,        SS_FUR,   SS_FUR_H, C,        C,        SS_FUR_H, SS_FUR,   C,        C,        C       ],
      [C,        C,        SS_FUR,   SS_STONE_H,SS_FUR_H,SS_PLATE_H,SS_PLATE_H,SS_FUR_H,SS_STONE_H,SS_FUR,  C,        C       ],
      [C,        SS_PLATE, SS_FUR_H, SS_EYE_RIM,SS_EYE, SS_STONE, SS_STONE, SS_EYE,  SS_EYE_RIM,SS_FUR_H,SS_PLATE, C       ],
      [C,        C,        SS_FUR,   SS_SNOUT, SS_SNOUT, SS_SNOUT, SS_SNOUT, SS_SNOUT,SS_FUR,   C,        C,        C       ],
      [C,        C,        C,        SS_FANG,  SS_SNOUT, SS_SNOUT, SS_SNOUT, SS_FANG, C,        C,        C,        C       ],
      [C,        SS_PLATE_S,SS_PLATE,SS_PLATE_H,SS_PLATE,SS_RUNE,  SS_PLATE, SS_PLATE_H,SS_PLATE,SS_PLATE_S,C,       C       ],
      [SS_FUR_S, SS_PLATE, SS_PLATE_H,SS_PLATE_S,SS_STONE,SS_STONE_S,SS_STONE,SS_PLATE_S,SS_PLATE_H,SS_PLATE,SS_FUR_S,C      ],
      [C,        SS_FUR_S, SS_STONE, SS_STONE_S,SS_FUR_S,SS_STONE_S,SS_FUR_S,SS_STONE_S,SS_STONE, SS_FUR_S, C,       C       ],
      [C,        C,        SS_FUR_S, SS_CLAW,  C,        SS_FUR_S, C,        SS_CLAW, SS_FUR_S, C,        C,        C       ],
      [C,        C,        C,        C,        C,        C,        C,        C,        C,        C,        C,        C       ],
    ], 4, 'enemy_stone_sentinel_walk_3'));

    // ========== Interaction indicator sprite ==========
    registerSpriteTexture('interact_indicator', [
      [C,       C,       0xFFD700,0xFFD700,C,       C],
      [C,       0xFFD700,0xFFF9C4,0xFFF9C4,0xFFD700,C],
      [0xFFD700,0xFFF9C4,0xFFFFFF,0xFFFFFF,0xFFF9C4,0xFFD700],
      [0xFFD700,0xFFF9C4,0xFFFFFF,0xFFFFFF,0xFFF9C4,0xFFD700],
      [C,       0xFFD700,0xFFF9C4,0xFFF9C4,0xFFD700,C],
      [C,       C,       0xFFD700,0xFFD700,C,       C],
    ]);

    // ========== TERRAIN ==========
    registerColorTexture('grass', 0x4CAF50, 32, 32, 'noise');
    registerColorTexture('dirt', 0x8D6E63, 32, 32, 'noise');
    registerColorTexture('water', 0x1E88E5, 32, 32, 'noise');
    // Hollow-tainted pool: near-black with violet noise (Whispering Woods meander west of corrupted bridge)
    registerColorTexture('water_corrupted', 0x1A0A22, 32, 32, 'noise');
    // Transient idle ripple accent (a soft wave squiggle) spawned occasionally on random water tiles.
    this.registerTexture('water_ripple', () => this.createWaterRippleTexture());
    // Transient idle wind gust (a soft swoosh of motion streaks) spawned occasionally on grass/trees.
    this.registerTexture('wind_gust', () => this.createWindGustTexture());
    registerColorTexture('stone', 0x6E7B85, 32, 32, 'gradient');
    registerColorTexture('wood', 0x795548, 32, 32, 'gradient');
    // Tall grass - a fanning clump of reed blades (full-height, dark base tuft) that stands up
    // as a billboard. Tiled densely it forms a "wall of grass"; scale/yOffset (tiles.ts) lift it
    // tall off the ground. Replaces the old flat green-noise square.
    {
      const TG_DK = 0x1F5C24; // shaded base blade
      const TG_MD = 0x388E3C; // mid green (legacy tall_grass tone)
      const TG_LT = 0x5BB85A; // lit blade
      const TG_TP = 0x8FD98A; // pale tip
      const X = C;
      const BASE_TALL_GRASS = [
        [X,    X,    X,    X,    X,    X,    X,    TG_TP,X,    X,    X,    X,    X,    X,    X,    X    ],
        [X,    X,    X,    X,    X,    X,    TG_LT,TG_TP,TG_LT,X,    X,    X,    X,    X,    X,    X    ],
        [X,    X,    X,    X,    X,    X,    TG_LT,TG_MD,TG_LT,X,    TG_TP,X,    X,    X,    X,    X    ],
        [X,    X,    X,    X,    X,    TG_TP,TG_MD,TG_MD,TG_MD,X,    TG_LT,X,    X,    X,    X,    X    ],
        [X,    X,    X,    X,    X,    TG_LT,TG_MD,TG_MD,TG_MD,TG_TP,TG_MD,X,    X,    X,    X,    X    ],
        [X,    X,    X,    X,    TG_TP,TG_MD,TG_MD,TG_MD,TG_MD,TG_LT,TG_MD,X,    X,    X,    X,    X    ],
        [X,    X,    X,    X,    TG_LT,TG_MD,TG_MD,TG_MD,TG_MD,TG_MD,TG_MD,TG_LT,X,    X,    X,    X    ],
        [X,    X,    X,    TG_TP,TG_MD,TG_MD,TG_MD,TG_MD,TG_MD,TG_MD,TG_MD,TG_LT,X,    X,    X,    X    ],
        [X,    X,    X,    TG_LT,TG_MD,TG_MD,TG_MD,TG_MD,TG_MD,TG_MD,TG_MD,TG_MD,TG_TP,X,    X,    X    ],
        [X,    X,    X,    TG_MD,TG_MD,TG_MD,TG_LT,TG_LT,TG_MD,TG_MD,TG_MD,TG_MD,TG_LT,X,    X,    X    ],
        [X,    X,    TG_TP,TG_MD,TG_MD,TG_MD,TG_MD,TG_MD,TG_MD,TG_MD,TG_MD,TG_MD,TG_MD,X,    X,    X    ],
        [X,    X,    TG_LT,TG_MD,TG_MD,TG_MD,TG_MD,TG_MD,TG_MD,TG_MD,TG_MD,TG_MD,TG_MD,TG_TP,X,    X    ],
        [X,    X,    X,    TG_MD,TG_MD,TG_MD,TG_MD,TG_LT,TG_LT,TG_MD,TG_MD,TG_MD,TG_MD,TG_LT,X,    X    ],
        [X,    X,    X,    TG_DK,TG_MD,TG_MD,TG_MD,TG_MD,TG_MD,TG_MD,TG_MD,TG_MD,TG_DK,X,    X,    X    ],
        [X,    X,    X,    TG_DK,TG_DK,TG_MD,TG_MD,TG_MD,TG_MD,TG_MD,TG_MD,TG_DK,TG_DK,X,    X,    X    ],
        [X,    X,    X,    X,    TG_DK,TG_DK,TG_DK,TG_DK,TG_DK,TG_DK,TG_DK,TG_DK,X,    X,    X,    X    ],
      ] as const;
      this.registerTexture('tall_grass', () => this.createSpriteTexture(BASE_TALL_GRASS, 4, 'tall_grass'));
      this.registerTexture('tall_grass_b', () => this.createTallGrassVariantTexture(BASE_TALL_GRASS, 1));
      this.registerTexture('tall_grass_c', () => this.createTallGrassVariantTexture(BASE_TALL_GRASS, 2));
    }
    registerColorTexture('sand', 0xF5DEB3, 32, 32, 'noise');
    registerColorTexture('swamp', 0x556B2F, 32, 32, 'noise');
    // â”€â”€ bridge: rickety wooden planks running Eâ€“W, bridge travels Nâ€“S â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    // Rail edges (L/R columns), plank rows with dark cracks between them.
    const BR_RAIL  = 0x7A4F1E; // rail cap â€” dark aged timber
    const BR_SIDE  = 0x3E2208; // rail shadow / side face
    const BR_PL    = 0xC49050; // plank highlight (warm sunlit oak)
    const BR_PM    = 0x9B6A35; // plank mid-tone
    const BR_PD    = 0x6B4220; // plank shadow
    const BR_GP    = 0x22110A; // crack / gap between planks
    const BR_KN    = 0x5A3418; // wood knot accent
    registerSpriteTexture('bridge', [
      // north rail
      [BR_SIDE, BR_RAIL, BR_RAIL, BR_RAIL, BR_RAIL, BR_RAIL, BR_RAIL, BR_RAIL, BR_RAIL, BR_RAIL, BR_RAIL, BR_SIDE],
      // crack
      [BR_SIDE, BR_GP,   BR_GP,   BR_GP,   BR_GP,   BR_GP,   BR_GP,   BR_GP,   BR_GP,   BR_GP,   BR_GP,   BR_SIDE],
      // plank 1 â€” light lead edge, knot on col 4
      [BR_SIDE, BR_PL,   BR_PM,   BR_PD,   BR_KN,   BR_PM,   BR_PD,   BR_PM,   BR_PL,   BR_PD,   BR_PM,   BR_SIDE],
      // plank 1 low
      [BR_SIDE, BR_PM,   BR_PD,   BR_PM,   BR_PM,   BR_PD,   BR_PM,   BR_PD,   BR_PM,   BR_PM,   BR_PD,   BR_SIDE],
      // crack
      [BR_SIDE, BR_GP,   BR_GP,   BR_GP,   BR_GP,   BR_GP,   BR_GP,   BR_GP,   BR_GP,   BR_GP,   BR_GP,   BR_SIDE],
      // plank 2
      [BR_SIDE, BR_PL,   BR_PM,   BR_PL,   BR_PD,   BR_PM,   BR_KN,   BR_PM,   BR_PD,   BR_PL,   BR_PM,   BR_SIDE],
      // plank 2 low
      [BR_SIDE, BR_PM,   BR_PD,   BR_PM,   BR_PM,   BR_PD,   BR_PM,   BR_PL,   BR_PM,   BR_PD,   BR_PM,   BR_SIDE],
      // crack
      [BR_SIDE, BR_GP,   BR_GP,   BR_GP,   BR_GP,   BR_GP,   BR_GP,   BR_GP,   BR_GP,   BR_GP,   BR_GP,   BR_SIDE],
      // plank 3 â€” wider gap highlight on right half
      [BR_SIDE, BR_PL,   BR_PM,   BR_PD,   BR_PM,   BR_PL,   BR_PM,   BR_KN,   BR_PD,   BR_PM,   BR_PL,   BR_SIDE],
      // plank 3 low
      [BR_SIDE, BR_PM,   BR_PD,   BR_PM,   BR_PD,   BR_PM,   BR_PM,   BR_PD,   BR_PM,   BR_PD,   BR_PM,   BR_SIDE],
      // crack
      [BR_SIDE, BR_GP,   BR_GP,   BR_GP,   BR_GP,   BR_GP,   BR_GP,   BR_GP,   BR_GP,   BR_GP,   BR_GP,   BR_SIDE],
      // plank 4
      [BR_SIDE, BR_PL,   BR_PM,   BR_KN,   BR_PM,   BR_PD,   BR_PL,   BR_PM,   BR_PM,   BR_PD,   BR_PL,   BR_SIDE],
      // plank 4 low
      [BR_SIDE, BR_PM,   BR_PD,   BR_PM,   BR_PM,   BR_PM,   BR_PD,   BR_PM,   BR_PD,   BR_PM,   BR_PD,   BR_SIDE],
      // crack
      [BR_SIDE, BR_GP,   BR_GP,   BR_GP,   BR_GP,   BR_GP,   BR_GP,   BR_GP,   BR_GP,   BR_GP,   BR_GP,   BR_SIDE],
      // south rail
      [BR_SIDE, BR_RAIL, BR_RAIL, BR_RAIL, BR_RAIL, BR_RAIL, BR_RAIL, BR_RAIL, BR_RAIL, BR_RAIL, BR_RAIL, BR_SIDE],
      [BR_SIDE, BR_RAIL, BR_RAIL, BR_RAIL, BR_RAIL, BR_RAIL, BR_RAIL, BR_RAIL, BR_RAIL, BR_RAIL, BR_RAIL, BR_SIDE],
    ], 2);

    // Folded drawbridge: same timber language as bridge, with a dark hinge/shadow at the raised edge.
    const BF_HINGE = 0x455A64;
    const BF_HINGE_H = 0x90A4AE;
    const BF_SHADOW = 0x120805;
    registerSpriteTexture('bridge_folded', [
      [BR_SIDE, BR_RAIL, BR_RAIL, BR_RAIL, BR_RAIL, BR_RAIL, BR_RAIL, BR_RAIL, BR_RAIL, BR_RAIL, BR_RAIL, BR_SIDE],
      [BR_SIDE, BR_GP,   BR_GP,   BR_GP,   BR_GP,   BR_GP,   BR_GP,   BR_GP,   BR_GP,   BR_GP,   BR_GP,   BR_SIDE],
      [BR_SIDE, BR_PL,   BR_PM,   BR_PD,   BR_KN,   BR_PM,   BR_PD,   BR_PM,   BR_PL,   BR_PD,   BR_PM,   BR_SIDE],
      [BR_SIDE, BR_PM,   BR_PD,   BR_PM,   BR_PM,   BR_PD,   BR_PM,   BR_PD,   BR_PM,   BR_PM,   BR_PD,   BR_SIDE],
      [BR_SIDE, BR_GP,   BR_GP,   BR_GP,   BR_GP,   BR_GP,   BR_GP,   BR_GP,   BR_GP,   BR_GP,   BR_GP,   BR_SIDE],
      [BR_SIDE, BR_PL,   BR_PM,   BR_PL,   BR_PD,   BR_PM,   BR_KN,   BR_PM,   BR_PD,   BR_PL,   BR_PM,   BR_SIDE],
      [BR_SIDE, BR_PM,   BR_PD,   BR_PM,   BR_PM,   BR_PD,   BR_PM,   BR_PL,   BR_PM,   BR_PD,   BR_PM,   BR_SIDE],
      [BR_SIDE, BR_GP,   BR_GP,   BR_GP,   BR_GP,   BR_GP,   BR_GP,   BR_GP,   BR_GP,   BR_GP,   BR_GP,   BR_SIDE],
      [BR_SIDE, BR_RAIL, BR_RAIL, BR_RAIL, BR_RAIL, BR_RAIL, BR_RAIL, BR_RAIL, BR_RAIL, BR_RAIL, BR_RAIL, BR_SIDE],
      [BF_SHADOW,BF_HINGE,BF_HINGE_H,BF_HINGE,BF_HINGE,BF_HINGE_H,BF_HINGE,BF_HINGE,BF_HINGE_H,BF_HINGE,BF_HINGE,BF_SHADOW],
      [BF_SHADOW,BF_SHADOW,BF_HINGE,BF_SHADOW,BF_SHADOW,BF_HINGE,BF_SHADOW,BF_SHADOW,BF_HINGE,BF_SHADOW,BF_SHADOW,BF_SHADOW],
      [C,       BF_SHADOW,BF_SHADOW,BF_SHADOW,BF_SHADOW,BF_SHADOW,BF_SHADOW,BF_SHADOW,BF_SHADOW,BF_SHADOW,BF_SHADOW,C],
    ], 2);

    // â”€â”€ bridge_corrupted: same plank structure, rotted + hollow-tainted â”€â”€â”€â”€â”€â”€â”€â”€â”€
    // Planks are darker, redder, warped; corruption seeps through cracks as voids.
    const BC_RAIL  = 0x5A2E1A; // corrupted rail â€” near-black reddish wood
    const BC_SIDE  = 0x2A1008; // side shadow
    const BC_PL    = 0x9B5030; // plank highlight (reddish-brown, corrupted)
    const BC_PM    = 0x6B3020; // plank mid
    const BC_PD    = 0x3E1A10; // plank dark
    const BC_GP    = 0x0C1820; // gap â€” shows void/dark water (bluish-black)
    const BC_VD    = 0x102030; // void/corruption seep in crack
    const BC_CR    = 0x1A2810; // corruption growths on planks (dark green-black)
    registerSpriteTexture('bridge_corrupted', [
      // north rail â€” crumbling
      [BC_SIDE, BC_RAIL, BC_CR,   BC_RAIL, BC_RAIL, BC_CR,   BC_RAIL, BC_CR,   BC_RAIL, BC_RAIL, BC_CR,   BC_SIDE],
      // wide void crack (more exposed than normal bridge)
      [BC_SIDE, BC_VD,   BC_VD,   BC_VD,   BC_GP,   BC_VD,   BC_VD,   BC_VD,   BC_GP,   BC_VD,   BC_VD,   BC_SIDE],
      // plank 1 â€” warped, corruption blotch col 5
      [BC_SIDE, BC_PL,   BC_PM,   BC_PD,   BC_PM,   BC_CR,   BC_PD,   BC_PM,   BC_PL,   BC_PD,   BC_PM,   BC_SIDE],
      // plank 1 low â€” missing chunk col 7 (void)
      [BC_SIDE, BC_PM,   BC_PD,   BC_PM,   BC_PM,   BC_PD,   BC_PM,   BC_VD,   BC_PM,   BC_PM,   BC_PD,   BC_SIDE],
      // crack â€” void seep pools
      [BC_SIDE, BC_GP,   BC_VD,   BC_GP,   BC_VD,   BC_GP,   BC_VD,   BC_GP,   BC_VD,   BC_GP,   BC_VD,   BC_SIDE],
      // plank 2 â€” heavy rot, corruption col 2
      [BC_SIDE, BC_PL,   BC_CR,   BC_PL,   BC_PD,   BC_PM,   BC_PD,   BC_PM,   BC_PD,   BC_PL,   BC_PM,   BC_SIDE],
      // plank 2 low â€” gap in plank col 9 (void)
      [BC_SIDE, BC_PM,   BC_PD,   BC_PM,   BC_PM,   BC_CR,   BC_PM,   BC_PL,   BC_PM,   BC_VD,   BC_PM,   BC_SIDE],
      // wide crack â€” void bleeding through
      [BC_SIDE, BC_VD,   BC_VD,   BC_GP,   BC_VD,   BC_VD,   BC_GP,   BC_VD,   BC_VD,   BC_GP,   BC_VD,   BC_SIDE],
      // plank 3 â€” almost gone, mostly void with thin plank fragments
      [BC_SIDE, BC_VD,   BC_PD,   BC_VD,   BC_PM,   BC_CR,   BC_PM,   BC_VD,   BC_PD,   BC_PM,   BC_VD,   BC_SIDE],
      // plank 3 fragments
      [BC_SIDE, BC_VD,   BC_PM,   BC_VD,   BC_PD,   BC_VD,   BC_PM,   BC_VD,   BC_PM,   BC_VD,   BC_PD,   BC_SIDE],
      // near-full void â€” almost collapsed
      [BC_SIDE, BC_VD,   BC_VD,   BC_VD,   BC_VD,   BC_GP,   BC_VD,   BC_VD,   BC_VD,   BC_VD,   BC_GP,   BC_SIDE],
      // last plank fragments barely holding
      [BC_SIDE, BC_PD,   BC_VD,   BC_PD,   BC_VD,   BC_CR,   BC_VD,   BC_PD,   BC_VD,   BC_PD,   BC_VD,   BC_SIDE],
      // collapse row
      [BC_SIDE, BC_VD,   BC_VD,   BC_VD,   BC_VD,   BC_VD,   BC_VD,   BC_VD,   BC_VD,   BC_VD,   BC_VD,   BC_SIDE],
      // void dominant
      [BC_SIDE, BC_VD,   BC_GP,   BC_VD,   BC_VD,   BC_GP,   BC_VD,   BC_VD,   BC_GP,   BC_VD,   BC_VD,   BC_SIDE],
      // north face â€” corruption rail remnant
      [BC_SIDE, BC_CR,   BC_RAIL, BC_CR,   BC_RAIL, BC_CR,   BC_RAIL, BC_CR,   BC_RAIL, BC_CR,   BC_RAIL, BC_SIDE],
      [BC_SIDE, BC_CR,   BC_CR,   BC_CR,   BC_CR,   BC_CR,   BC_CR,   BC_CR,   BC_CR,   BC_CR,   BC_CR,   BC_SIDE],
    ], 2);
    registerColorTexture('lava', 0xE65100, 32, 32, 'noise');
    registerColorTexture('ice', 0xB3E5FC, 32, 32, 'checker');
    registerColorTexture('pressure_plate', 0x607D8B, 32, 32, 'checker');
    registerColorTexture('hidden_wall', 0x78909C, 32, 32, 'checker');
    registerColorTexture('push_block', 0x5D4037, 32, 32, 'gradient');
    registerColorTexture('switch_door', 0x4E342E, 32, 32, 'gradient');
    registerColorTexture('volcanic_rock', 0x3E2723, 32, 32, 'noise');
    registerColorTexture('ash', 0x616161, 32, 32, 'noise');
    registerColorTexture('ruins_floor', 0x6D4C41, 32, 32, 'checker');
    registerColorTexture('waterfall', 0x42A5F5, 32, 32, 'noise');
    registerColorTexture('snow', 0xECEFF1, 32, 32, 'noise');
    
    const CLIFF_GRASS    = 0x81C784; // vivid grass cap
    const CLIFF_GRASS_D  = 0x558B2F; // dark grass edge below cap
    const CLIFF_SOIL     = 0x5A3D2E; // dark soil band
    // Overhang lip â€” bright cream stripe, very readable as cliff edge
    const CLIFF_TOP_RIM  = 0xF0E0A0;
    // Rock strata â€” cool grey-stone palette, high contrast across 3 tones
    const CL  = 0xC0B4AA; // light strata highlight (warm grey-stone)
    const CM  = 0x7E706A; // mid strata
    const CD  = 0x3E3430; // dark strata seam
    const CS  = 0x18130F; // base shadow
    // Keep stair treads in a warmer stone range so cliff stair endpoints do not read as "sky" patches.
    const STAIRS_STONE   = 0xB8ADA2;
    const STAIRS_STONE_H = 0xE9E0D7;
    const STAIRS_STONE_S = 0x6A5B53;
    const STAIRS_EDGE    = 0xFFFFFF; // bright tread edge

    // cliff_edge: grass cap â†’ soil â†’ bright cream lip â†’ clearly banded rock face â†’ shadow base.
    // Each row renders 4px tall (NearestFilter, 4Ã- scale) â€” solid rows = clearly readable stripes.
    registerSpriteTexture('cliff_edge', [
      // rows 0-2: grass cap
      [CLIFF_GRASS,CLIFF_GRASS,CLIFF_GRASS_D,CLIFF_GRASS,CLIFF_GRASS,CLIFF_GRASS,CLIFF_GRASS_D,CLIFF_GRASS,CLIFF_GRASS,CLIFF_GRASS,CLIFF_GRASS_D,CLIFF_GRASS],
      [CLIFF_GRASS,CLIFF_GRASS_D,CLIFF_GRASS,CLIFF_GRASS,CLIFF_GRASS_D,CLIFF_GRASS,CLIFF_GRASS,CLIFF_GRASS_D,CLIFF_GRASS,CLIFF_GRASS,CLIFF_GRASS,CLIFF_GRASS_D],
      [CLIFF_GRASS,CLIFF_GRASS,CLIFF_GRASS_D,CLIFF_GRASS,CLIFF_GRASS,CLIFF_GRASS_D,CLIFF_GRASS,CLIFF_GRASS,CLIFF_GRASS_D,CLIFF_GRASS,CLIFF_GRASS,CLIFF_GRASS],
      // row 3: soil
      [CLIFF_SOIL,CLIFF_SOIL,CLIFF_SOIL,CLIFF_SOIL,CLIFF_SOIL,CLIFF_SOIL,CLIFF_SOIL,CLIFF_SOIL,CLIFF_SOIL,CLIFF_SOIL,CLIFF_SOIL,CLIFF_SOIL],
      // row 4: bright overhang lip â€” the most visible marker of the cliff top
      [CLIFF_TOP_RIM,CLIFF_TOP_RIM,CLIFF_TOP_RIM,CLIFF_TOP_RIM,CLIFF_TOP_RIM,CLIFF_TOP_RIM,CLIFF_TOP_RIM,CLIFF_TOP_RIM,CLIFF_TOP_RIM,CLIFF_TOP_RIM,CLIFF_TOP_RIM,CLIFF_TOP_RIM],
      // rows 5-13: banded rock face â€” strict L/M/D cycles for crisp horizontal stripes
      [CL,CL,CL,CL,CL,CL,CL,CL,CL,CL,CL,CL],
      [CM,CM,CM,CM,CM,CM,CM,CM,CM,CM,CM,CM],
      [CD,CD,CD,CD,CD,CD,CD,CD,CD,CD,CD,CD],
      [CL,CL,CM,CL,CL,CM,CL,CM,CL,CL,CM,CL],
      [CM,CM,CM,CM,CM,CM,CM,CM,CM,CM,CM,CM],
      [CD,CD,CD,CD,CD,CD,CD,CD,CD,CD,CD,CD],
      [CL,CM,CL,CL,CL,CM,CL,CL,CM,CL,CL,CL],
      [CM,CM,CM,CM,CM,CM,CM,CM,CM,CM,CM,CM],
      [CD,CD,CD,CD,CD,CD,CD,CD,CD,CD,CD,CD],
      // rows 14-15: base shadow
      [CS,CS,CS,CS,CS,CS,CS,CS,CS,CS,CS,CS],
      [CS,CS,CS,CS,CS,CS,CS,CS,CS,CS,CS,CS],
    ]);

    // cliff: pure rock body â€” 4 full L/M/D strata cycles then shadow base.
    registerSpriteTexture('cliff', [
      [CL,CL,CL,CL,CL,CL,CL,CL,CL,CL,CL,CL],
      [CM,CM,CM,CM,CM,CM,CM,CM,CM,CM,CM,CM],
      [CD,CD,CD,CD,CD,CD,CD,CD,CD,CD,CD,CD],
      [CL,CL,CM,CL,CL,CL,CM,CL,CL,CM,CL,CL],
      [CM,CM,CM,CM,CM,CM,CM,CM,CM,CM,CM,CM],
      [CD,CD,CD,CD,CD,CD,CD,CD,CD,CD,CD,CD],
      [CL,CM,CL,CL,CM,CL,CL,CM,CL,CL,CM,CL],
      [CM,CM,CM,CM,CM,CM,CM,CM,CM,CM,CM,CM],
      [CD,CD,CD,CD,CD,CD,CD,CD,CD,CD,CD,CD],
      [CL,CL,CL,CM,CL,CL,CL,CM,CL,CL,CL,CM],
      [CM,CM,CM,CM,CM,CM,CM,CM,CM,CM,CM,CM],
      [CD,CD,CD,CD,CD,CD,CD,CD,CD,CD,CD,CD],
      [CM,CM,CM,CM,CM,CM,CM,CM,CM,CM,CM,CM],
      [CS,CS,CS,CS,CS,CS,CS,CS,CS,CS,CS,CS],
      [CS,CS,CS,CS,CS,CS,CS,CS,CS,CS,CS,CS],
      [CS,CS,CS,CS,CS,CS,CS,CS,CS,CS,CS,CS],
    ]);

    // Corrupted cliff palette - Hollow-tinted variants placed for ty < 77 on the
    // Whispering Woods map. Slightly darker and shifted cool/violet from the base palette
    // so the rock face reads as drained of life without looking like a different material.
    const CLIFF_GRASS_C   = 0x4F5A52; // sickly grey-green cap (drained CLIFF_GRASS)
    const CLIFF_GRASS_D_C = 0x2F3A33; // dark cap edge
    const CLIFF_SOIL_C    = 0x3A2A26; // burnt soil band
    const CLIFF_TOP_RIM_C = 0xB8A890; // muted dirty cream lip (less buttery than base)
    const CL_C = 0x9A8E94; // cool-shifted light strata (was warm 0xC0B4AA)
    const CM_C = 0x5E5258; // mid strata (cooler violet-grey)
    const CD_C = 0x2A2228; // dark seam
    const CS_C = 0x0A0608; // base shadow (near-black with violet bias)

    registerSpriteTexture('cliff_edge_corrupted', [
      [CLIFF_GRASS_C,CLIFF_GRASS_C,CLIFF_GRASS_D_C,CLIFF_GRASS_C,CLIFF_GRASS_C,CLIFF_GRASS_C,CLIFF_GRASS_D_C,CLIFF_GRASS_C,CLIFF_GRASS_C,CLIFF_GRASS_C,CLIFF_GRASS_D_C,CLIFF_GRASS_C],
      [CLIFF_GRASS_C,CLIFF_GRASS_D_C,CLIFF_GRASS_C,CLIFF_GRASS_C,CLIFF_GRASS_D_C,CLIFF_GRASS_C,CLIFF_GRASS_C,CLIFF_GRASS_D_C,CLIFF_GRASS_C,CLIFF_GRASS_C,CLIFF_GRASS_C,CLIFF_GRASS_D_C],
      [CLIFF_GRASS_C,CLIFF_GRASS_C,CLIFF_GRASS_D_C,CLIFF_GRASS_C,CLIFF_GRASS_C,CLIFF_GRASS_D_C,CLIFF_GRASS_C,CLIFF_GRASS_C,CLIFF_GRASS_D_C,CLIFF_GRASS_C,CLIFF_GRASS_C,CLIFF_GRASS_C],
      [CLIFF_SOIL_C,CLIFF_SOIL_C,CLIFF_SOIL_C,CLIFF_SOIL_C,CLIFF_SOIL_C,CLIFF_SOIL_C,CLIFF_SOIL_C,CLIFF_SOIL_C,CLIFF_SOIL_C,CLIFF_SOIL_C,CLIFF_SOIL_C,CLIFF_SOIL_C],
      [CLIFF_TOP_RIM_C,CLIFF_TOP_RIM_C,CLIFF_TOP_RIM_C,CLIFF_TOP_RIM_C,CLIFF_TOP_RIM_C,CLIFF_TOP_RIM_C,CLIFF_TOP_RIM_C,CLIFF_TOP_RIM_C,CLIFF_TOP_RIM_C,CLIFF_TOP_RIM_C,CLIFF_TOP_RIM_C,CLIFF_TOP_RIM_C],
      [CL_C,CL_C,CL_C,CL_C,CL_C,CL_C,CL_C,CL_C,CL_C,CL_C,CL_C,CL_C],
      [CM_C,CM_C,CM_C,CM_C,CM_C,CM_C,CM_C,CM_C,CM_C,CM_C,CM_C,CM_C],
      [CD_C,CD_C,CD_C,CD_C,CD_C,CD_C,CD_C,CD_C,CD_C,CD_C,CD_C,CD_C],
      [CL_C,CL_C,CM_C,CL_C,CL_C,CM_C,CL_C,CM_C,CL_C,CL_C,CM_C,CL_C],
      [CM_C,CM_C,CM_C,CM_C,CM_C,CM_C,CM_C,CM_C,CM_C,CM_C,CM_C,CM_C],
      [CD_C,CD_C,CD_C,CD_C,CD_C,CD_C,CD_C,CD_C,CD_C,CD_C,CD_C,CD_C],
      [CL_C,CM_C,CL_C,CL_C,CL_C,CM_C,CL_C,CL_C,CM_C,CL_C,CL_C,CL_C],
      [CM_C,CM_C,CM_C,CM_C,CM_C,CM_C,CM_C,CM_C,CM_C,CM_C,CM_C,CM_C],
      [CD_C,CD_C,CD_C,CD_C,CD_C,CD_C,CD_C,CD_C,CD_C,CD_C,CD_C,CD_C],
      [CS_C,CS_C,CS_C,CS_C,CS_C,CS_C,CS_C,CS_C,CS_C,CS_C,CS_C,CS_C],
      [CS_C,CS_C,CS_C,CS_C,CS_C,CS_C,CS_C,CS_C,CS_C,CS_C,CS_C,CS_C],
    ]);

    registerSpriteTexture('cliff_corrupted', [
      [CL_C,CL_C,CL_C,CL_C,CL_C,CL_C,CL_C,CL_C,CL_C,CL_C,CL_C,CL_C],
      [CM_C,CM_C,CM_C,CM_C,CM_C,CM_C,CM_C,CM_C,CM_C,CM_C,CM_C,CM_C],
      [CD_C,CD_C,CD_C,CD_C,CD_C,CD_C,CD_C,CD_C,CD_C,CD_C,CD_C,CD_C],
      [CL_C,CL_C,CM_C,CL_C,CL_C,CL_C,CM_C,CL_C,CL_C,CM_C,CL_C,CL_C],
      [CM_C,CM_C,CM_C,CM_C,CM_C,CM_C,CM_C,CM_C,CM_C,CM_C,CM_C,CM_C],
      [CD_C,CD_C,CD_C,CD_C,CD_C,CD_C,CD_C,CD_C,CD_C,CD_C,CD_C,CD_C],
      [CL_C,CM_C,CL_C,CL_C,CM_C,CL_C,CL_C,CM_C,CL_C,CL_C,CM_C,CL_C],
      [CM_C,CM_C,CM_C,CM_C,CM_C,CM_C,CM_C,CM_C,CM_C,CM_C,CM_C,CM_C],
      [CD_C,CD_C,CD_C,CD_C,CD_C,CD_C,CD_C,CD_C,CD_C,CD_C,CD_C,CD_C],
      [CL_C,CL_C,CL_C,CM_C,CL_C,CL_C,CL_C,CM_C,CL_C,CL_C,CL_C,CM_C],
      [CM_C,CM_C,CM_C,CM_C,CM_C,CM_C,CM_C,CM_C,CM_C,CM_C,CM_C,CM_C],
      [CD_C,CD_C,CD_C,CD_C,CD_C,CD_C,CD_C,CD_C,CD_C,CD_C,CD_C,CD_C],
      [CM_C,CM_C,CM_C,CM_C,CM_C,CM_C,CM_C,CM_C,CM_C,CM_C,CM_C,CM_C],
      [CS_C,CS_C,CS_C,CS_C,CS_C,CS_C,CS_C,CS_C,CS_C,CS_C,CS_C,CS_C],
      [CS_C,CS_C,CS_C,CS_C,CS_C,CS_C,CS_C,CS_C,CS_C,CS_C,CS_C,CS_C],
      [CS_C,CS_C,CS_C,CS_C,CS_C,CS_C,CS_C,CS_C,CS_C,CS_C,CS_C,CS_C],
    ]);

    // stairs: carved stone steps â€” opaque grass cap at top, then treads
    registerSpriteTexture('stairs', [
      [CLIFF_GRASS,CLIFF_GRASS,CLIFF_GRASS_D,CLIFF_GRASS,CLIFF_GRASS,CLIFF_GRASS_D,CLIFF_GRASS,CLIFF_GRASS,CLIFF_GRASS_D,CLIFF_GRASS,CLIFF_GRASS,CLIFF_GRASS],
      [CLIFF_SOIL,CLIFF_SOIL,CLIFF_SOIL,CLIFF_SOIL,CLIFF_SOIL,CLIFF_SOIL,CLIFF_SOIL,CLIFF_SOIL,CLIFF_SOIL,CLIFF_SOIL,CLIFF_SOIL,CLIFF_SOIL],
      [STAIRS_EDGE,STAIRS_EDGE,STAIRS_EDGE,STAIRS_EDGE,STAIRS_EDGE,STAIRS_EDGE,STAIRS_EDGE,STAIRS_EDGE,STAIRS_EDGE,STAIRS_EDGE,STAIRS_EDGE,STAIRS_EDGE],
      [STAIRS_STONE_H,STAIRS_STONE_H,STAIRS_STONE_H,STAIRS_STONE_H,STAIRS_STONE_H,STAIRS_STONE_H,STAIRS_STONE_H,STAIRS_STONE_H,STAIRS_STONE_H,STAIRS_STONE_H,STAIRS_STONE_H,STAIRS_STONE_H],
      [STAIRS_STONE,STAIRS_STONE,STAIRS_STONE,STAIRS_STONE,STAIRS_STONE,STAIRS_STONE,STAIRS_STONE,STAIRS_STONE,STAIRS_STONE,STAIRS_STONE,STAIRS_STONE,STAIRS_STONE],
      [STAIRS_STONE_S,STAIRS_STONE_S,STAIRS_STONE_S,STAIRS_STONE_S,STAIRS_STONE_S,STAIRS_STONE_S,STAIRS_STONE_S,STAIRS_STONE_S,STAIRS_STONE_S,STAIRS_STONE_S,STAIRS_STONE_S,STAIRS_STONE_S],
      [STAIRS_EDGE,STAIRS_EDGE,STAIRS_EDGE,STAIRS_EDGE,STAIRS_EDGE,STAIRS_EDGE,STAIRS_EDGE,STAIRS_EDGE,STAIRS_EDGE,STAIRS_EDGE,STAIRS_EDGE,STAIRS_EDGE],
      [STAIRS_STONE_H,STAIRS_STONE_H,STAIRS_STONE_H,STAIRS_STONE_H,STAIRS_STONE_H,STAIRS_STONE_H,STAIRS_STONE_H,STAIRS_STONE_H,STAIRS_STONE_H,STAIRS_STONE_H,STAIRS_STONE_H,STAIRS_STONE_H],
      [STAIRS_STONE,STAIRS_STONE,STAIRS_STONE,STAIRS_STONE,STAIRS_STONE,STAIRS_STONE,STAIRS_STONE,STAIRS_STONE,STAIRS_STONE,STAIRS_STONE,STAIRS_STONE,STAIRS_STONE],
      [STAIRS_STONE_S,STAIRS_STONE_S,STAIRS_STONE_S,STAIRS_STONE_S,STAIRS_STONE_S,STAIRS_STONE_S,STAIRS_STONE_S,STAIRS_STONE_S,STAIRS_STONE_S,STAIRS_STONE_S,STAIRS_STONE_S,STAIRS_STONE_S],
      [STAIRS_EDGE,STAIRS_EDGE,STAIRS_EDGE,STAIRS_EDGE,STAIRS_EDGE,STAIRS_EDGE,STAIRS_EDGE,STAIRS_EDGE,STAIRS_EDGE,STAIRS_EDGE,STAIRS_EDGE,STAIRS_EDGE],
      [STAIRS_STONE_H,STAIRS_STONE_H,STAIRS_STONE_H,STAIRS_STONE_H,STAIRS_STONE_H,STAIRS_STONE_H,STAIRS_STONE_H,STAIRS_STONE_H,STAIRS_STONE_H,STAIRS_STONE_H,STAIRS_STONE_H,STAIRS_STONE_H],
      [STAIRS_STONE,STAIRS_STONE,STAIRS_STONE,STAIRS_STONE,STAIRS_STONE,STAIRS_STONE,STAIRS_STONE,STAIRS_STONE,STAIRS_STONE,STAIRS_STONE,STAIRS_STONE,STAIRS_STONE],
      [STAIRS_STONE_S,STAIRS_STONE_S,STAIRS_STONE_S,STAIRS_STONE_S,STAIRS_STONE_S,STAIRS_STONE_S,STAIRS_STONE_S,STAIRS_STONE_S,STAIRS_STONE_S,STAIRS_STONE_S,STAIRS_STONE_S,STAIRS_STONE_S],
    ]);
    
    // ladder: side rails + clear rung spacing (reads at a glance vs flat wood)
    const R = 0x3E2723;
    const R2 = 0x4E342E;
    const RG = 0xA1887F;
    const RG2 = 0x8D6E63;
    const RG3 = 0xBCAAA4;
    const Z = 0;
    registerSpriteTexture('ladder', [
      // 8Ã-12 @ 4px/cell â€” open center, double-thick rails, 5 rungs + feet
      [R, R2, Z, Z, Z, Z, R2, R],
      [R, R2, Z, Z, Z, Z, R2, R],
      [R, R2, RG3, RG, RG, RG3, R2, R],
      [R, R2, Z, Z, Z, Z, R2, R],
      [R, R2, RG3, RG2, RG2, RG3, R2, R],
      [R, R2, Z, Z, Z, Z, R2, R],
      [R, R2, RG3, RG, RG, RG3, R2, R],
      [R, R2, Z, Z, Z, Z, R2, R],
      [R, R2, RG3, RG2, RG2, RG3, R2, R],
      [R, R2, Z, Z, Z, Z, R2, R],
      [R, R2, RG3, RG, RG, RG3, R2, R],
      [R, R, RG2, RG2, RG2, RG2, R, R],
    ]);

    // Curled ladder â€” coiled rope bundle with visible rails, sitting on cliff edge
    const CL_RAIL = 0x5D4037;
    const CL_RAIL2 = 0x4E342E;
    const CL_ROPE = 0xBCAAA4;
    const CL_ROPE2 = 0xA1887F;
    const CL_ROPE3 = 0x8D6E63;
    const CL_KNOT = 0x6D4C41;
    registerSpriteTexture('curled_ladder', [
      [Z,        Z,        CL_RAIL,  CL_RAIL2, CL_RAIL2, CL_RAIL,  Z,        Z       ],
      [Z,        CL_RAIL,  CL_ROPE2, CL_ROPE,  CL_ROPE,  CL_ROPE2, CL_RAIL,  Z       ],
      [CL_RAIL,  CL_ROPE3, CL_ROPE,  CL_KNOT,  CL_KNOT,  CL_ROPE,  CL_ROPE3, CL_RAIL ],
      [CL_RAIL2, CL_ROPE,  CL_KNOT,  CL_ROPE2, CL_ROPE2, CL_KNOT,  CL_ROPE,  CL_RAIL2],
      [CL_RAIL,  CL_ROPE3, CL_ROPE,  CL_KNOT,  CL_KNOT,  CL_ROPE,  CL_ROPE3, CL_RAIL ],
      [Z,        CL_RAIL,  CL_ROPE2, CL_ROPE3, CL_ROPE3, CL_ROPE2, CL_RAIL,  Z       ],
    ]);

    // Gate with extended ladder â€” gate bars at top, full ladder rungs hanging below
    const GL_IRON = 0x455A64;
    const GL_IRON_H = 0x607D8B;
    const GL_RVT = 0x37474F;
    registerSpriteTexture('gate_ladder_open', [
      // Gate bars (top anchor)
      [GL_IRON,  GL_IRON_H, GL_IRON,  GL_IRON_H, GL_IRON,  GL_IRON_H, GL_IRON,  GL_IRON  ],
      [GL_RVT,   GL_IRON,   GL_RVT,   GL_IRON,   GL_RVT,   GL_IRON,   GL_RVT,   GL_IRON  ],
      [GL_IRON,  GL_IRON_H, GL_IRON,  GL_IRON_H, GL_IRON,  GL_IRON_H, GL_IRON,  GL_IRON  ],
      // Ladder rungs hanging down
      [R,  R2, Z,   Z,   Z,   Z,   R2, R ],
      [R,  R2, RG3, RG,  RG,  RG3, R2, R ],
      [R,  R2, Z,   Z,   Z,   Z,   R2, R ],
      [R,  R2, RG3, RG2, RG2, RG3, R2, R ],
      [R,  R2, Z,   Z,   Z,   Z,   R2, R ],
      [R,  R2, RG3, RG,  RG,  RG3, R2, R ],
      [R,  R2, Z,   Z,   Z,   Z,   R2, R ],
      [R,  R2, RG3, RG2, RG2, RG3, R2, R ],
      [R,  R2, Z,   Z,   Z,   Z,   R2, R ],
      [R,  R2, RG3, RG,  RG,  RG3, R2, R ],
      [R,  R,  RG2, RG2, RG2, RG2, R,  R ],
    ]);

    // Gate with curled ladder on top â€” simplified gate bars (upper rows) + coiled rope (lower rows)
    registerSpriteTexture('gate_ladder', [
      [Z,        Z,         CL_RAIL,  CL_RAIL2,  CL_RAIL2, CL_RAIL,   Z,        Z        ],
      [Z,        CL_RAIL,   CL_ROPE2, CL_ROPE,   CL_ROPE,  CL_ROPE2,  CL_RAIL,  Z        ],
      [CL_RAIL,  CL_ROPE3,  CL_ROPE,  CL_KNOT,   CL_KNOT,  CL_ROPE,   CL_ROPE3, CL_RAIL  ],
      [CL_RAIL2, CL_ROPE,   CL_KNOT,  CL_ROPE2,  CL_ROPE2, CL_KNOT,   CL_ROPE,  CL_RAIL2 ],
      [Z,        CL_RAIL,   CL_ROPE2, CL_ROPE3,  CL_ROPE3, CL_ROPE2,  CL_RAIL,  Z        ],
      [GL_IRON,  GL_IRON_H, GL_IRON,  GL_IRON_H, GL_IRON,  GL_IRON_H, GL_IRON,  GL_IRON  ],
      [GL_RVT,   GL_IRON,   GL_RVT,   GL_IRON,   GL_RVT,   GL_IRON,   GL_RVT,   GL_IRON  ],
      [GL_IRON,  GL_IRON_H, GL_IRON,  GL_IRON_H, GL_IRON,  GL_IRON_H, GL_IRON,  GL_IRON  ],
    ]);

    registerColorTexture('cobblestone', 0x7A7F88, 32, 32, 'cobblestone_grid');
    registerColorTexture('cobblestone_dark', 0x5C6068, 32, 32, 'cobblestone_grid');
    // Guilrhym district pavers - distinct palettes give each district identity with
    // zero procedural scatter (flat patterned ground, like cobblestone).
    registerColorTexture('cobble_grand', 0x9C968A, 32, 32, 'cobblestone_grid');        // civic / cathedral pale stone
    registerColorTexture('cobble_market', 0x867A68, 32, 32, 'cobblestone_grid');       // warm market paving
    registerColorTexture('cobble_residential', 0x6B6E66, 32, 32, 'cobblestone_grid');  // muted residential
    registerColorTexture('waterlogged_cobble', 0x44525A, 32, 32, 'cobblestone_grid');  // flood-damaged wet stone
    registerColorTexture('flood_silt', 0x53564A, 32, 32, 'noise');                     // canal silt / mud
    registerColorTexture('ashen_cobble', 0x4A4640, 32, 32, 'noise');                   // corrupted ash paving near the cathedral

    // --- Guilrhym TENEMENT kit - a tall Victorian townhouse (16x28 @ 4px), 4 storeys
    // + mansard roof with dormers + chimney + street-level shopfront. Registered as a
    // base plus 12 procedural variants (createGuilrhymBuildingVariant) so dense rows
    // read as a row of INDIVIDUAL buildings, not repeated apartments.
    {
      const C = 0;
      const TB = 0x6b4a3a, TBD = 0x533829, TBL = 0x7d5a48;
      const TW = 0x171b22, TWG = 0x39434f, TWF = 0x241a14;
      const TS = 0x8a8278;
      const TR = 0x3a3a44, TRD = 0x2a2a32, TRL = 0x4e4e5a, CHM = 0x4a3530;
      const TGF = 0x453f39, TSG = 0x2b3138, TDR = 0x201810;
      // Right edge (col 15) is a brick PARTY WALL (not transparent) so adjacent bays
      // butt seamlessly into one continuous terrace/"land", not a row of detached boxes.
      const lintel = [TBD, TB, TWF, TWF, TWF, TBD, TB, TBL, TWF, TWF, TWF, TB, TBD, TB, TB, TBD];
      const win    = [TBD, TB, TW, TWG, TW, TBD, TB, TBL, TW, TWG, TW, TB, TBD, TB, TB, TBD];
      const sill   = [TBD, TB, TS, TS, TS, TBD, TB, TBL, TS, TS, TS, TB, TBD, TB, TB, TBD];
      const brick  = [TBD, TB, TB, TBL, TB, TBD, TB, TBL, TBL, TB, TB, TB, TBD, TB, TB, TBD];
      const cornice = [TS, TS, TS, TS, TS, TS, TS, TS, TS, TS, TS, TS, TS, TS, TS, TS];
      const shop   = [TGF, TGF, TSG, TSG, TSG, TGF, TGF, TGF, TSG, TSG, TSG, TGF, TGF, TGF, TGF, TGF];
      const doorR  = [TGF, TGF, TGF, TGF, TGF, TDR, TDR, TDR, TGF, TGF, TGF, TGF, TGF, TGF, TGF, TGF];
      const baseR  = [TGF, TGF, TGF, TGF, TGF, TGF, TGF, TGF, TGF, TGF, TGF, TGF, TGF, TGF, TGF, TGF];
      const tenementBase: number[][] = [
        [C, C, C, C, C, C, C, C, C, C, C, C, CHM, CHM, C, C],
        [C, C, C, TRL, TR, TR, TR, TR, TR, TR, TR, TR, CHM, CHM, C, C],
        [C, C, TRL, TR, TR, TR, TR, TR, TR, TR, TR, TR, TR, TRD, C, C],
        [C, TRL, TR, TR, TW, TWG, TR, TR, TR, TR, TW, TWG, TR, TRD, C, C],
        cornice,
        lintel, win, sill, brick,
        lintel, win, sill, brick,
        lintel, win, sill, brick,
        lintel, win, sill, brick,
        cornice,
        shop, shop, doorR, doorR, baseR, baseR,
      ].map(r => [...r]);
      const tenementHi = this.upscaleFacadeBase(tenementBase, TWG, TW, TWF, [TB, TBL], TBD);
      registerSpriteTexture('tenement_facade', tenementHi, 4);
      for (let v = 0; v < 18; v++) {
        const id = `tenement_facade_variant_${v}`;
        this.registerTexture(id, () => this.createGuilrhymBuildingVariant(tenementHi, v, id));
      }
    }

    // --- TOWNHOUSE kit (pale Georgian terrace) - refined residential: cream stucco,
    // grand fanlight door over steps, area railing. Shares the variant generator. ---
    {
      const C = 0;
      // Walls use the shared brick consts so the generator's per-building palette remap
      // recolours townhouses too - they differ from tenements by FORM (fanlight door,
      // area railing), not a fixed colour.
      const CW = 0x6b4a3a, CWD = 0x533829, CWL = 0x7d5a48;
      const TW = 0x171b22, TWG = 0x39434f, TWF = 0x241a14;        // windows (generator targets TWG)
      const TS = 0x8a8278;                                        // stone sill/cornice
      const TR = 0x3a3a44, TRD = 0x2a2a32, CHM = 0x4a3530;
      const DR = 0x2a1c12, FL = 0x4a5a6a, RL = 0x33333c, ST = 0x8a8278;
      const lintel = [CWD, CW, TWF, TWF, TWF, CWD, CW, CWL, TWF, TWF, TWF, CW, CWD, CW, CW, CWD];
      const win    = [CWD, CW, TW, TWG, TW, CWD, CW, CWL, TW, TWG, TW, CW, CWD, CW, CW, CWD];
      const sill   = [CWD, CW, TS, TS, TS, CWD, CW, CWL, TS, TS, TS, CW, CWD, CW, CW, CWD];
      const wall   = [CWD, CW, CW, CWL, CW, CWD, CW, CWL, CWL, CW, CW, CW, CWD, CW, CW, CWD];
      const corn   = [TS, TS, TS, TS, TS, TS, TS, TS, TS, TS, TS, TS, TS, TS, TS, TS];
      const roof   = [TRD, TR, TR, TR, TR, TR, TR, TR, TR, TR, TR, TR, TR, TR, TR, TRD];
      const door1  = [CWD, CW, CW, CW, CW, CW, DR, FL, FL, DR, CW, CW, CW, CW, CW, CWD];
      const door2  = [CW, CW, CW, CW, CW, CW, DR, DR, DR, DR, CW, CW, CW, CW, CW, CW];
      const stepR  = [ST, ST, RL, ST, ST, ST, DR, DR, DR, DR, ST, ST, RL, ST, ST, ST];
      const townhouseBase: number[][] = [
        [C, C, C, C, C, C, C, C, C, C, C, C, CHM, CHM, C, C],
        roof, roof, roof, corn,
        lintel, win, sill, wall,
        lintel, win, sill, wall,
        lintel, win, sill, wall,
        lintel, win, sill, wall,
        corn,
        door1, door2, stepR, stepR, stepR, stepR,
      ].map(r => [...r]);
      const townhouseHi = this.upscaleFacadeBase(townhouseBase, TWG, TW, TWF, [CW, CWL], CWD);
      registerSpriteTexture('townhouse_facade', townhouseHi, 4);
      for (let v = 0; v < 18; v++) {
        const id = `townhouse_facade_variant_${v}`;
        this.registerTexture(id, () => this.createGuilrhymBuildingVariant(townhouseHi, v, id));
      }
    }

    // --- WAREHOUSE kit (canal/industrial) - dark engineering brick, big arched
    // loading bay, small high windows, a smoking chimney stack. Shares the generator. ---
    {
      const C = 0;
      // Shared brick consts (palette-remapped per building); warehouses differ by FORM
      // - the big arched loading bay, small high windows, smoking chimney stacks.
      const WB = 0x6b4a3a, WBD = 0x533829, WBL = 0x7d5a48;
      const TW = 0x141820, TWG = 0x39434f, TWF = 0x201810;        // small windows
      const TS = 0x8a8278;
      const TR = 0x3a3a44, TRD = 0x2a2a32, CHM = 0x4a3530;
      const DR = 0x171210, AR = 0x2a201a;                         // loading bay door + arch
      const lintel = [WBD, WB, WBL, WB, TWF, WB, WBD, WB, TWF, WB, WBL, WB, WBD, WB, WB, WBD];
      const win    = [WBD, WB, WBL, WB, TWG, WB, WBD, WB, TWG, WB, WBL, WB, WBD, WB, WB, WBD];
      const brick  = [WBD, WB, WB, WBL, WB, WBD, WB, WBL, WBL, WB, WB, WB, WBD, WB, WB, WBD];
      const band   = [TS, TS, TS, TS, TS, TS, TS, TS, TS, TS, TS, TS, TS, TS, TS, TS];
      const roof   = [TRD, TR, TR, TR, TR, TR, TR, TR, TR, TR, TR, TR, TR, TR, TR, TRD];
      const archT  = [WBD, WB, WB, AR, AR, AR, AR, AR, AR, AR, AR, AR, AR, WB, WB, WBD];
      const bayR   = [WBD, WB, WB, AR, DR, DR, DR, DR, DR, DR, DR, DR, AR, WB, WB, WBD];
      const warehouseBase: number[][] = [
        [C, C, C, C, C, C, C, C, C, C, CHM, CHM, CHM, C, C, C],
        roof, roof, roof, band,
        brick, lintel, win, brick,
        brick, lintel, win, brick,
        band,
        brick, lintel, win, brick,
        band,
        archT, bayR, bayR, bayR, bayR, bayR,
      ].map(r => [...r]);
      const warehouseHi = this.upscaleFacadeBase(warehouseBase, TWG, TW, TWF, [WB, WBL], WBD);
      registerSpriteTexture('warehouse_facade', warehouseHi, 4);
      for (let v = 0; v < 18; v++) {
        const id = `warehouse_facade_variant_${v}`;
        this.registerTexture(id, () => this.createGuilrhymBuildingVariant(warehouseHi, v, id));
      }
    }

    // --- MANOR kit (grand west-estate townhouse) - broad ashlar front, tall paired
    // windows, a pedimented portico with columns over the entrance, balustrade roofline.
    // Reads as the wealthy quarter's distinct, statelier form. Shares the variant generator. ---
    {
      const C = 0;
      const MW = 0x6b4a3a, MWD = 0x533829, MWL = 0x7d5a48;          // walls (generator remaps)
      const TW = 0x171b22, TWG = 0x39434f, TWF = 0x241a14;          // windows (generator targets TWG)
      const TS = 0x9a9182;                                          // pale ashlar stone band
      const TR = 0x3a3a44, TRD = 0x2a2a32, CHM = 0x4a3530;
      const COL = 0x8a8278, PED = 0xa39a8a, DR = 0x241814;          // portico columns, pediment, door
      const balus = [TS, MWL, TS, MWL, TS, MWL, TS, MWL, TS, MWL, TS, MWL, TS, MWL, TS, TS]; // roofline balustrade
      const roof  = [TRD, TR, TR, TR, TR, TR, TR, TR, TR, TR, TR, TR, TR, TR, TR, TRD];
      const corn  = [TS, TS, TS, TS, TS, TS, TS, TS, TS, TS, TS, TS, TS, TS, TS, TS];
      const lintel = [MWD, MW, TWF, TWF, TWF, MWD, MW, MWL, TWF, TWF, TWF, MW, MWD, MW, MW, MWD];
      const win    = [MWD, MW, TW, TWG, TW, MWD, MW, MWL, TW, TWG, TW, MW, MWD, MW, MW, MWD];
      const sill   = [MWD, MW, TS, TS, TS, MWD, MW, MWL, TS, TS, TS, MW, MWD, MW, MW, MWD];
      const wall   = [MWD, MW, MW, MWL, MW, MWD, MW, MWL, MWL, MW, MW, MW, MWD, MW, MW, MWD];
      const pedi   = [MW, MW, MW, MW, PED, PED, PED, PED, PED, PED, PED, PED, MW, MW, MW, MW];   // portico pediment
      const colR   = [MW, MW, MW, MW, COL, MW, MW, DR, DR, MW, MW, COL, MW, MW, MW, MW];          // columns flanking door
      const baseR  = [TS, TS, COL, TS, COL, TS, DR, DR, DR, DR, TS, COL, TS, COL, TS, TS];        // stylobate + steps
      const manorBase: number[][] = [
        [C, C, C, C, C, C, C, C, C, C, C, C, CHM, CHM, C, C],
        roof, roof, balus, corn,
        lintel, win, sill, wall,
        lintel, win, sill, wall,
        lintel, win, sill, wall,
        corn,
        pedi, colR, colR, baseR, baseR, baseR,
      ].map(r => [...r]);
      const manorHi = this.upscaleFacadeBase(manorBase, TWG, TW, TWF, [MW, MWL], MWD);
      registerSpriteTexture('manor_facade', manorHi, 4);
      for (let v = 0; v < 18; v++) {
        const id = `manor_facade_variant_${v}`;
        this.registerTexture(id, () => this.createGuilrhymBuildingVariant(manorHi, v, id));
      }
    }

    // --- BOARDED kit (abandoned slum tenement) - planks nailed across windows + door,
    // cracked render, a sagging roofline. The "fled and barricaded" frontage. ---
    {
      const C = 0;
      const BW = 0x6b4a3a, BWD = 0x533829, BWL = 0x7d5a48;
      const TW = 0x171b22, TWG = 0x39434f, TWF = 0x241a14;          // generator targets TWG
      const TS = 0x6e665a;                                          // grimy sill
      const TR = 0x33333c, TRD = 0x232329, CHM = 0x4a3530;
      const PK = 0x6d5038, PKL = 0x82603f, PKD = 0x402b1c;          // nailed planks
      // Windows are boarded: TWG core kept (so the generator still recolours), planks crossed over.
      const lintel = [BWD, BW, TWF, TWF, TWF, BWD, BW, BWL, TWF, TWF, TWF, BW, BWD, BW, BW, BWD];
      const boardW = [BWD, BW, PK, TWG, PKL, BWD, BW, BWL, PKL, TWG, PK, BW, BWD, BW, BW, BWD]; // planks over window
      const boardX = [BWD, BW, PKL, PKD, PK, BWD, BW, BWL, PK, PKD, PKL, BW, BWD, BW, BW, BWD]; // diagonal plank
      const wall   = [BWD, BW, BW, BWL, BW, BWD, BW, BWL, BWL, BW, BW, BW, BWD, BW, BW, BWD];
      const corn   = [TS, TS, TS, TS, TS, TS, TS, TS, TS, TS, TS, TS, TS, TS, TS, TS];
      const roof   = [TRD, TR, TR, TRD, TR, TR, TR, TRD, TR, TR, TRD, TR, TR, TR, TR, TRD];      // sagging/patchy
      const doorB  = [BWD, BW, BW, BW, BW, PK, PKL, PK, PKL, PK, BW, BW, BW, BW, BW, BWD];        // boarded door
      const baseR  = [BWD, BW, BW, BWL, BW, PKD, PK, PKD, PK, PKD, BW, BWL, BW, BW, BW, BWD];
      const boardedBase: number[][] = [
        [C, C, C, C, C, C, C, C, C, C, C, C, CHM, CHM, C, C],
        roof, roof, roof, corn,
        lintel, boardW, boardX, wall,
        lintel, boardW, boardX, wall,
        lintel, boardW, boardX, wall,
        corn,
        doorB, doorB, baseR, baseR, baseR, baseR,
      ].map(r => [...r]);
      const boardedHi = this.upscaleFacadeBase(boardedBase, TWG, TW, TWF, [BW, BWL], BWD);
      registerSpriteTexture('boarded_facade', boardedHi, 4);
      for (let v = 0; v < 18; v++) {
        const id = `boarded_facade_variant_${v}`;
        this.registerTexture(id, () => this.createGuilrhymBuildingVariant(boardedHi, v, id));
      }
    }

    // --- Guilrhym TOLBOOTH CLOCKTOWER - the civic landmark spire (12x28 @ 4px):
    // pointed slate spire, crenellated parapet, clock stage, arched belfry, lancet
    // shaft, plinth with an arched door. Towers over the tenements as the orienting POI.
    {
      const C = 0;
      const STN = 0x8c8678, STD = 0x6f695d, STL = 0x9e988b;  // ashlar stone (base / shadow / highlight)
      const SPR = 0x3c3c46, SPD = 0x2a2a32;                  // slate spire
      const CF = 0xe6dcc0, CR = 0x4a4030, CH = 0x201810;     // clock face / rim / hands
      const WN = 0x171b22, WG = 0x39434f, DR = 0x201810;     // window / glow / door
      registerSpriteTexture('clocktower', [
        [C, C, C, C, C, SPD, SPD, C, C, C, C, C],
        [C, C, C, C, SPD, SPR, SPR, SPD, C, C, C, C],
        [C, C, C, SPD, SPR, SPR, SPR, SPR, SPD, C, C, C],
        [C, C, SPD, SPR, SPR, SPR, SPR, SPR, SPR, SPD, C, C],
        [C, SPD, SPR, SPR, SPR, SPR, SPR, SPR, SPR, SPR, SPD, C],
        [SPD, SPR, SPR, SPR, SPR, SPR, SPR, SPR, SPR, SPR, SPR, SPD],
        [STD, STN, STN, STN, STN, STN, STN, STN, STN, STN, STN, STD],
        [STN, STD, STN, STD, STN, STD, STN, STD, STN, STD, STN, STD],
        [STD, STN, STN, STN, STN, STN, STN, STN, STN, STN, STN, STD],
        [STD, STN, STN, CR, CR, CR, CR, CR, CR, STN, STN, STD],
        [STD, STN, CR, CF, CF, CH, CH, CF, CF, CR, STN, STD],
        [STD, STN, CR, CF, CH, CF, CF, CH, CF, CR, STN, STD],
        [STD, STN, STN, CR, CR, CR, CR, CR, CR, STN, STN, STD],
        [STD, STN, STN, STN, STN, STN, STN, STN, STN, STN, STN, STD],
        [STD, STN, STN, WN, WG, STN, STN, WG, WN, STN, STN, STD],
        [STD, STN, STN, WN, WG, STN, STN, WG, WN, STN, STN, STD],
        [STD, STN, STN, STN, STN, STN, STN, STN, STN, STN, STN, STD],
        [STD, STN, STL, STN, STN, STD, STN, STN, STL, STN, STN, STD],
        [STD, STN, STN, STN, WN, STD, STN, WN, STN, STN, STN, STD],
        [STD, STN, STN, STN, WN, STD, STN, WN, STN, STN, STN, STD],
        [STD, STL, STN, STN, STN, STD, STN, STN, STN, STL, STN, STD],
        [STD, STN, STN, STN, WN, STD, STN, WN, STN, STN, STN, STD],
        [STD, STN, STN, STN, WN, STD, STN, WN, STN, STN, STN, STD],
        [STD, STN, STL, STN, STN, STD, STN, STN, STL, STN, STN, STD],
        [STD, STN, STN, STN, STN, STN, STN, STN, STN, STN, STN, STD],
        [STN, STN, STN, STN, CR, DR, DR, CR, STN, STN, STN, STN],
        [STN, STN, STN, STN, DR, DR, DR, DR, STN, STN, STN, STN],
        [STN, STN, STN, STN, DR, DR, DR, DR, STN, STN, STN, STN],
      ], 4);
    }

    // --- Guilrhym street life (props) + paved road ---
    // Proper paved road (granite setts) - distinct from plaza cobblestone for thoroughfares.
    registerColorTexture('road_setts', 0x676b72, 32, 32, 'cobblestone_grid');
    {
      const C = 0;
      // Baby carriage / perambulator (8x9) - dark bassinet + hood on big spoked wheels.
      const BD = 0x33384a, HD = 0x23283a, FR = 0x8a6a3a, WH = 0x1a1a22, WS = 0x5a5a66, BL = 0x4a5066;
      registerSpriteTexture('baby_carriage', [
        [C, C, HD, HD, C, C, C, C],
        [C, HD, HD, BD, BD, C, C, C],
        [C, HD, BD, BD, BD, BD, C, C],
        [C, BD, BL, BD, BD, BD, FR, C],
        [C, BD, BD, BD, BD, BD, C, C],
        [C, FR, FR, FR, FR, FR, FR, C],
        [C, WS, WH, WS, WS, WH, WS, C],
        [C, WH, WH, WH, WH, WH, WH, C],
        [C, C, WS, C, C, WS, C, C],
      ], 4);
      // Stagecoach (16x10) - lacquered coach body, windows, roof rail, big wheels.
      const CB = 0x5a342a, CT = 0x8a6a3a, CW = 0x23283a, CR2 = 0x3a241c, WHl = 0x2a2018, SP = 0x6a5238, LP = 0x3a3a42;
      registerSpriteTexture('stagecoach', [
        [C, C, C, LP, C, C, C, C, C, C, C, C, C, C, C, C],
        [C, C, CR2, CR2, CR2, CR2, CR2, CR2, CR2, CR2, CR2, CR2, C, C, C, C],
        [C, C, CT, CB, CB, CT, CB, CB, CT, CB, CB, CT, C, C, C, C],
        [C, C, CB, CW, CW, CB, CW, CW, CB, CW, CW, CB, C, C, C, C],
        [C, C, CB, CW, CW, CB, CW, CW, CB, CW, CW, CB, CB, C, C, C],
        [C, C, CT, CB, CB, CT, CB, CB, CT, CB, CB, CT, CT, C, C, C],
        [C, C, CB, CB, CB, CB, CB, CB, CB, CB, CB, CB, CB, C, C, C],
        [C, SP, WHl, SP, C, C, C, C, C, C, SP, WHl, SP, C, C, C],
        [SP, WHl, WHl, WHl, C, C, C, C, C, SP, WHl, WHl, WHl, SP, C, C],
        [C, SP, WHl, SP, C, C, C, C, C, C, SP, WHl, SP, C, C, C],
      ], 4);
      // Street sign / fingerpost (8x12) - iron post + enamel nameplate.
      const PO = 0x33333c, PL = 0x3a5a4a, TX = 0xd0d0c4, PB = 0x23232a;
      registerSpriteTexture('street_sign', [
        [C, C, C, PO, PO, C, C, C],
        [C, PL, PL, PL, PL, PL, PL, C],
        [C, PL, TX, TX, TX, TX, PL, C],
        [C, PL, PL, PL, PL, PL, PL, C],
        [C, C, C, PO, PO, C, C, C],
        [C, C, C, PO, PO, C, C, C],
        [C, C, C, PO, PO, C, C, C],
        [C, C, C, PO, PO, C, C, C],
        [C, C, C, PO, PO, C, C, C],
        [C, C, C, PO, PO, C, C, C],
        [C, C, PB, PB, PB, PB, C, C],
        [C, PB, PB, PB, PB, PB, PB, C],
      ], 4);
    }
    // Worked quarry floor - pale chiselled cut-stone, gridded like blocks scored out of bedrock.
    registerColorTexture('quarry_floor', 0x9097A0, 32, 32, 'cobblestone_grid');
    // Rough quarry bedrock rim - mottled granite speckle (replaces the banded 'stone' gradient here).
    registerColorTexture('quarry_bedrock', 0x767E86, 32, 32, 'bedrock');
    // Packed cave earth - reddish-brown floor distinct from outdoor dirt spines.
    registerColorTexture('cave_floor', 0x5C4A38, 32, 32, 'noise');
    registerColorTexture('brick', 0x8B4513, 32, 32, 'noise');
    registerColorTexture('roof_tile', 0x4A4A52, 32, 32, 'gradient');
    registerColorTexture('timber_wall', 0x5C4033, 32, 32, 'gradient');
    registerColorTexture('farmland', 0x6D4C41, 32, 32, 'noise');
    registerColorTexture('dark_grass', 0x2E7D32, 32, 32, 'noise');
    // Bleached / ash-sick forest floor (Deep Hollow, tile y < 59 â‰ˆ world y â‰¤ -91)
    registerColorTexture('hollow_blight', 0xC9B896, 32, 32, 'noise');
    registerColorTexture('mossy_stone', 0x6B7B5A, 32, 32, 'mossy_cobblestone');
    registerColorTexture('ruined_fort_wall', 0x777066, 32, 32, 'cobblestone_grid');
    registerColorTexture('ruined_fort_wall_mossy', 0x65705C, 32, 32, 'cobblestone_grid');
    registerColorTexture('wooden_path', 0x8D6E63, 32, 32, 'gradient');
    registerColorTexture('wood_floor', 0xA1887F, 32, 32, 'gradient');

    // ========== OBJECTS ==========
    const TRUNK = 0x5D4037;
    const TRUNK_S = 0x3E2723;
    const LEAF = 0x2E7D32;
    const LEAF_H = 0x66BB6A;
    const LEAF_S = 0x1B5E20;

    // Tree - base sprite extracted so the live-tree variant generator can reference it.
    const BASE_TREE = [
      [C,     C,     C,     C,     LEAF_H,LEAF,  LEAF_H,LEAF,  C,     C,     C,     C],
      [C,     C,     C,     LEAF,  LEAF_H,LEAF,  LEAF,  LEAF_H,LEAF,  C,     C,     C],
      [C,     C,     LEAF,  LEAF_H,LEAF,  LEAF_H,LEAF,  LEAF,  LEAF_H,LEAF,  C,     C],
      [C,     LEAF,  LEAF_H,LEAF,  LEAF,  LEAF,  LEAF_H,LEAF,  LEAF,  LEAF_H,LEAF,  C],
      [LEAF_S,LEAF,  LEAF,  LEAF_H,LEAF,  LEAF,  LEAF,  LEAF_H,LEAF,  LEAF,  LEAF,  LEAF_S],
      [LEAF_S,LEAF,  LEAF_S,LEAF,  LEAF_H,LEAF,  LEAF,  LEAF,  LEAF_H,LEAF_S,LEAF,  LEAF_S],
      [C,     LEAF_S,LEAF,  LEAF_S,LEAF,  LEAF,  LEAF_S,LEAF,  LEAF_S,LEAF,  LEAF_S,C],
      [C,     C,     LEAF_S,LEAF,  LEAF_S,LEAF,  LEAF_S,LEAF,  LEAF_S,LEAF_S,C,     C],
      [C,     C,     C,     LEAF_S,LEAF,  LEAF_S,LEAF_S,LEAF_S,LEAF_S,C,     C,     C],
      [C,     C,     C,     C,     C,     TRUNK, TRUNK_S,C,    C,     C,     C,     C],
      [C,     C,     C,     C,     C,     TRUNK_S,TRUNK,C,     C,     C,     C,     C],
      [C,     C,     C,     C,     C,     TRUNK, TRUNK_S,C,    C,     C,     C,     C],
      [C,     C,     C,     C,     TRUNK_S,TRUNK,TRUNK_S,TRUNK,C,     C,     C,     C],
      [C,     C,     C,     TRUNK_S,TRUNK, TRUNK,TRUNK, TRUNK_S,C,    C,     C,     C],
    ] as const;
    registerSpriteTexture('tree', BASE_TREE);
    this.registerTexture('tree_b', () => this.createLiveTreeVariantTexture(BASE_TREE, 1));
    this.registerTexture('tree_c', () => this.createLiveTreeVariantTexture(BASE_TREE, 2));

    // Dead tree - base sprite extracted so variant generator can reference it.
    const BASE_DEAD_TREE = [
      [C,     C,     C,     TRUNK, C,     C,     TRUNK, C,     C,     C],
      [C,     C,     TRUNK, TRUNK_S,C,    C,     TRUNK_S,TRUNK, C,    C],
      [C,     TRUNK, C,     TRUNK, C,     TRUNK, C,     C,     TRUNK, C],
      [C,     C,     C,     TRUNK, C,     TRUNK, C,     C,     C,     C],
      [C,     C,     C,     TRUNK_S,TRUNK, TRUNK, C,     C,     C,     C],
      [C,     C,     C,     C,     TRUNK, TRUNK_S,C,     C,     C,     C],
      [C,     C,     C,     C,     TRUNK_S,TRUNK, C,     C,     C,     C],
      [C,     C,     C,     TRUNK_S,TRUNK, TRUNK_S,TRUNK, C,     C,     C],
    ] as const;
    registerSpriteTexture('dead_tree', BASE_DEAD_TREE);
    this.registerTexture('dead_tree_b', () => this.createDeadTreeVariantTexture(BASE_DEAD_TREE, 1));
    this.registerTexture('dead_tree_c', () => this.createDeadTreeVariantTexture(BASE_DEAD_TREE, 2));

    // Statue
    const STATUE = 0x9E9E9E;
    const STATUE_H = 0xBDBDBD;
    const STATUE_S = 0x757575;
    registerSpriteTexture('statue', [
      [C,     C,     C,     STATUE_H,STATUE_H,C,     C,     C],
      [C,     C,     STATUE_H,STATUE, STATUE, STATUE_H,C,     C],
      [C,     C,     STATUE, STATUE_S,STATUE_S,STATUE, C,     C],
      [C,     C,     STATUE, STATUE, STATUE, STATUE, C,     C],
      [C,     C,     STATUE_S,STATUE,STATUE,STATUE_S, C,     C],
      [C,     STATUE_S,STATUE_S,STATUE_S,STATUE_S,STATUE_S,STATUE_S,C],
      [C,     C,     STATUE_S,STATUE_S,STATUE_S,STATUE_S, C,     C],
    ]);

    // House â€” chimney + roof ridge trim + door arch read
    const WALL = 0x8D6E63;
    const WALL_H = 0xA1887F;
    const WALL_S = 0x6D4C41;
    const ROOF = 0xB71C1C;
    const ROOF_H = 0xD32F2F;
    const ROOF_S = 0x7F0000;
    const ROOF_TRIM = 0xFFCDD2;
    const WINDOW = 0x1A237E;
    const SHUTTER = 0x5D4037;
    const DOOR = 0x4E342E;
    const DOOR_ARCH = 0x6D4C41;
    const CHIM = 0x3E2723;
    const CHIM_TOP = 0x5D4037;

    registerSpriteTexture('house', [
      [C,     C,     C,     CHIM,  CHIM,  CHIM_TOP,CHIM_TOP,C,     C,     C,     C,     C,     C,     C],
      [C,     C,     C,     CHIM,  CHIM,  ROOF_S,ROOF, ROOF_H,ROOF, C,     C,     C,     C,     C],
      [C,     C,     C,     C,     ROOF_S,ROOF,  ROOF_H,ROOF, ROOF, ROOF_S,C,     C,     C,     C],
      [C,     C,     C,     ROOF_S,ROOF,  ROOF,  ROOF_TRIM,ROOF, ROOF, ROOF,  ROOF_S,C,     C,     C],
      [C,     C,     ROOF_S,ROOF,  ROOF,  ROOF_H,ROOF, ROOF,  ROOF_H,ROOF, ROOF,  ROOF_S,C,     C],
      [C,     C,     WALL,  WALL_H,WALL,  WALL,  WALL, WALL,  WALL, WALL,  WALL_H,WALL,  C,     C],
      [C,     C,     WALL,  SHUTTER,WINDOW,WINDOW,SHUTTER,WALL_H,SHUTTER,WINDOW,WINDOW,SHUTTER,WALL,  C],
      [C,     C,     WALL_S,SHUTTER,WINDOW,WINDOW,SHUTTER,WALL_S,SHUTTER,WINDOW,WINDOW,SHUTTER,WALL_S,C],
      [C,     C,     WALL,  WALL,  WALL,  DOOR_ARCH,DOOR,DOOR,DOOR_ARCH,WALL,  WALL,  WALL,  C,     C],
      [C,     C,     WALL_S,WALL,  WALL,  DOOR_ARCH,DOOR,DOOR,DOOR_ARCH,WALL,  WALL,  WALL_S,C,     C],
      [C,     C,     WALL_S,WALL_S,WALL_S,WALL_S,WALL_S,WALL_S,WALL_S,WALL_S,WALL_S,WALL_S,C,   C],
    ]);
    const houseEntrySprite = [
      [C,     C,     C,     CHIM,  CHIM,  CHIM_TOP,CHIM_TOP,C,     C,     C,     C,     C,     C,     C],
      [C,     C,     C,     CHIM,  CHIM,  ROOF_S,ROOF, ROOF_H,ROOF, C,     C,     C,     C,     C],
      [C,     C,     C,     C,     ROOF_S,ROOF,  ROOF_H,ROOF, ROOF, ROOF_S,C,     C,     C,     C],
      [C,     C,     C,     ROOF_S,ROOF,  ROOF,  ROOF_TRIM,ROOF, ROOF, ROOF,  ROOF_S,C,     C,     C],
      [C,     C,     ROOF_S,ROOF,  ROOF,  ROOF_H,ROOF, ROOF,  ROOF_H,ROOF, ROOF,  ROOF_S,C,     C],
      [C,     C,     WALL,  WALL_H,WALL,  WALL,  WALL, WALL,  WALL, WALL,  WALL_H,WALL,  C,     C],
      [C,     C,     WALL,  SHUTTER,WINDOW,WINDOW,SHUTTER,WALL_H,SHUTTER,WINDOW,WINDOW,SHUTTER,WALL,  C],
      [C,     C,     WALL_S,SHUTTER,WINDOW,WINDOW,SHUTTER,WALL_S,SHUTTER,WINDOW,WINDOW,SHUTTER,WALL_S,C],
      [C,     C,     WALL,  WALL,  WALL,  DOOR_ARCH,0x8B5E3C,0x8B5E3C,DOOR_ARCH,WALL,  WALL,  WALL,  C,     C],
      [C,     C,     WALL_S,WALL,  WALL,  DOOR_ARCH,0x5D4037,0x5D4037,DOOR_ARCH,WALL,  WALL,  WALL_S,C,     C],
      [C,     C,     WALL_S,WALL_S,WALL_S,WALL_S,0x3E2723,0xFFD54F,0x3E2723,WALL_S,WALL_S,WALL_S,C,   C],
    ] as const;
    registerSpriteTexture('house_entry', houseEntrySprite);

    const BROOF = 0x1565C0;
    const BROOF_H = 0x1E88E5;
    const BROOF_S = 0x0D47A1;
    const BROOF_TRIM = 0xE3F2FD;
    registerSpriteTexture('house_blue', [
      [C,     C,     C,     CHIM,  CHIM,  CHIM_TOP,CHIM_TOP,C,     C,     C,     C,     C,     C,     C],
      [C,     C,     C,     CHIM,  CHIM,  BROOF_S,BROOF,BROOF_H,BROOF,C,     C,     C,     C,     C],
      [C,     C,     C,     C,     BROOF_S,BROOF, BROOF_H,BROOF,BROOF,BROOF_S,C,     C,     C,     C],
      [C,     C,     C,     BROOF_S,BROOF, BROOF, BROOF_TRIM,BROOF,BROOF,BROOF, BROOF_S,C,     C,     C],
      [C,     C,     BROOF_S,BROOF, BROOF, BROOF_H,BROOF,BROOF,BROOF_H,BROOF,BROOF,BROOF_S,C,    C],
      [C,     C,     WALL,  WALL_H,WALL,  WALL,  WALL, WALL,  WALL, WALL,  WALL_H,WALL,  C,     C],
      [C,     C,     WALL,  SHUTTER,WINDOW,WINDOW,SHUTTER,WALL_H,SHUTTER,WINDOW,WINDOW,SHUTTER,WALL,  C],
      [C,     C,     WALL_S,SHUTTER,WINDOW,WINDOW,SHUTTER,WALL_S,SHUTTER,WINDOW,WINDOW,SHUTTER,WALL_S,C],
      [C,     C,     WALL,  WALL,  WALL,  DOOR_ARCH,DOOR,DOOR,DOOR_ARCH,WALL,  WALL,  WALL,  C,     C],
      [C,     C,     WALL_S,WALL,  WALL,  DOOR_ARCH,DOOR,DOOR,DOOR_ARCH,WALL,  WALL,  WALL_S,C,     C],
      [C,     C,     WALL_S,WALL_S,WALL_S,WALL_S,WALL_S,WALL_S,WALL_S,WALL_S,WALL_S,WALL_S,C,   C],
    ]);
    const houseBlueEntrySprite = [
      [C,     C,     C,     CHIM,  CHIM,  CHIM_TOP,CHIM_TOP,C,     C,     C,     C,     C,     C,     C],
      [C,     C,     C,     CHIM,  CHIM,  BROOF_S,BROOF,BROOF_H,BROOF,C,     C,     C,     C,     C],
      [C,     C,     C,     C,     BROOF_S,BROOF, BROOF_H,BROOF,BROOF,BROOF_S,C,     C,     C,     C],
      [C,     C,     C,     BROOF_S,BROOF, BROOF, BROOF_TRIM,BROOF,BROOF,BROOF, BROOF_S,C,     C,     C],
      [C,     C,     BROOF_S,BROOF, BROOF, BROOF_H,BROOF,BROOF,BROOF_H,BROOF,BROOF,BROOF_S,C,    C],
      [C,     C,     WALL,  WALL_H,WALL,  WALL,  WALL, WALL,  WALL, WALL,  WALL_H,WALL,  C,     C],
      [C,     C,     WALL,  SHUTTER,WINDOW,WINDOW,SHUTTER,WALL_H,SHUTTER,WINDOW,WINDOW,SHUTTER,WALL,  C],
      [C,     C,     WALL_S,SHUTTER,WINDOW,WINDOW,SHUTTER,WALL_S,SHUTTER,WINDOW,WINDOW,SHUTTER,WALL_S,C],
      [C,     C,     WALL,  WALL,  WALL,  DOOR_ARCH,0x8B5E3C,0x8B5E3C,DOOR_ARCH,WALL,  WALL,  WALL,  C,     C],
      [C,     C,     WALL_S,WALL,  WALL,  DOOR_ARCH,0x5D4037,0x5D4037,DOOR_ARCH,WALL,  WALL,  WALL_S,C,     C],
      [C,     C,     WALL_S,WALL_S,WALL_S,WALL_S,0x3E2723,0xFFD54F,0x3E2723,WALL_S,WALL_S,WALL_S,C,   C],
    ] as const;
    registerSpriteTexture('house_blue_entry', houseBlueEntrySprite);

    const GROOF = 0x2E7D32;
    const GROOF_H = 0x43A047;
    const GROOF_S = 0x1B5E20;
    const GROOF_TRIM = 0xC8E6C9;
    registerSpriteTexture('house_green', [
      [C,     C,     C,     CHIM,  CHIM,  CHIM_TOP,CHIM_TOP,C,     C,     C,     C,     C,     C,     C],
      [C,     C,     C,     CHIM,  CHIM,  GROOF_S,GROOF,GROOF_H,GROOF,C,     C,     C,     C,     C],
      [C,     C,     C,     C,     GROOF_S,GROOF, GROOF_H,GROOF,GROOF,GROOF_S,C,     C,     C,     C],
      [C,     C,     C,     GROOF_S,GROOF, GROOF, GROOF_TRIM,GROOF,GROOF,GROOF, GROOF_S,C,     C,     C],
      [C,     C,     GROOF_S,GROOF, GROOF, GROOF_H,GROOF,GROOF,GROOF_H,GROOF,GROOF,GROOF_S,C,    C],
      [C,     C,     WALL,  WALL_H,WALL,  WALL,  WALL, WALL,  WALL, WALL,  WALL_H,WALL,  C,     C],
      [C,     C,     WALL,  SHUTTER,WINDOW,WINDOW,SHUTTER,WALL_H,SHUTTER,WINDOW,WINDOW,SHUTTER,WALL,  C],
      [C,     C,     WALL_S,SHUTTER,WINDOW,WINDOW,SHUTTER,WALL_S,SHUTTER,WINDOW,WINDOW,SHUTTER,WALL_S,C],
      [C,     C,     WALL,  WALL,  WALL,  DOOR_ARCH,DOOR,DOOR,DOOR_ARCH,WALL,  WALL,  WALL,  C,     C],
      [C,     C,     WALL_S,WALL,  WALL,  DOOR_ARCH,DOOR,DOOR,DOOR_ARCH,WALL,  WALL,  WALL_S,C,     C],
      [C,     C,     WALL_S,WALL_S,WALL_S,WALL_S,WALL_S,WALL_S,WALL_S,WALL_S,WALL_S,WALL_S,C,   C],
    ]);
    const houseGreenEntrySprite = [
      [C,     C,     C,     CHIM,  CHIM,  CHIM_TOP,CHIM_TOP,C,     C,     C,     C,     C,     C,     C],
      [C,     C,     C,     CHIM,  CHIM,  GROOF_S,GROOF,GROOF_H,GROOF,C,     C,     C,     C,     C],
      [C,     C,     C,     C,     GROOF_S,GROOF, GROOF_H,GROOF,GROOF,GROOF_S,C,     C,     C,     C],
      [C,     C,     C,     GROOF_S,GROOF, GROOF, GROOF_TRIM,GROOF,GROOF,GROOF, GROOF_S,C,     C,     C],
      [C,     C,     GROOF_S,GROOF, GROOF, GROOF_H,GROOF,GROOF,GROOF_H,GROOF,GROOF,GROOF_S,C,    C],
      [C,     C,     WALL,  WALL_H,WALL,  WALL,  WALL, WALL,  WALL, WALL,  WALL_H,WALL,  C,     C],
      [C,     C,     WALL,  SHUTTER,WINDOW,WINDOW,SHUTTER,WALL_H,SHUTTER,WINDOW,WINDOW,SHUTTER,WALL,  C],
      [C,     C,     WALL_S,SHUTTER,WINDOW,WINDOW,SHUTTER,WALL_S,SHUTTER,WINDOW,WINDOW,SHUTTER,WALL_S,C],
      [C,     C,     WALL,  WALL,  WALL,  DOOR_ARCH,0x8B5E3C,0x8B5E3C,DOOR_ARCH,WALL,  WALL,  WALL,  C,     C],
      [C,     C,     WALL_S,WALL,  WALL,  DOOR_ARCH,0x5D4037,0x5D4037,DOOR_ARCH,WALL,  WALL,  WALL_S,C,     C],
      [C,     C,     WALL_S,WALL_S,WALL_S,WALL_S,0x3E2723,0xFFD54F,0x3E2723,WALL_S,WALL_S,WALL_S,C,   C],
    ] as const;
    registerSpriteTexture('house_green_entry', houseGreenEntrySprite);

    const THATCH = 0xBCA065;
    const THATCH_H = 0xD4B878;
    const THATCH_S = 0x8D7540;
    const THATCH_BAND = 0xE6CEA0;
    const CWALL = 0xD7CCC8;
    const CWALL_S = 0xBCAAA4;
    const CWALL_H = 0xEFEBE9;
    const houseThatchSprite = [
      [C,      C,      CHIM,   CHIM,   CHIM_TOP,CHIM_TOP,C,      C,      C,      C,      C,      C],
      [C,      C,      CHIM,   CHIM,   THATCH_S,THATCH, THATCH_H,THATCH, C,      C,      C,      C],
      [C,      C,      C,      THATCH_S,THATCH, THATCH_H,THATCH, THATCH, THATCH_S,C,      C,      C],
      [C,      C,      THATCH_S,THATCH, THATCH_BAND,THATCH, THATCH_H,THATCH, THATCH, THATCH_S,C,      C],
      [C,      THATCH_S,THATCH, THATCH_H,THATCH, THATCH, THATCH, THATCH, THATCH_H,THATCH, THATCH_S,C],
      [C,      CWALL,  CWALL_H,CWALL,  CWALL,  CWALL,  CWALL,  CWALL,  CWALL,  CWALL_H,CWALL,  C],
      [C,      CWALL,  SHUTTER,WINDOW, WINDOW, CWALL,  CWALL_H,CWALL,  WINDOW, WINDOW, SHUTTER,CWALL,  C],
      [C,      CWALL_S,SHUTTER,WINDOW, WINDOW, CWALL_S,CWALL,  CWALL_S,WINDOW, WINDOW, SHUTTER,CWALL_S,C],
      [C,      CWALL,  CWALL,  CWALL,  CWALL,  DOOR_ARCH,DOOR, DOOR, DOOR_ARCH,CWALL,  CWALL,  CWALL,  C],
      [C,      CWALL_S,CWALL,  CWALL,  CWALL,  DOOR_ARCH,DOOR, DOOR, DOOR_ARCH,CWALL,  CWALL,  CWALL_S,C],
      [C,      CWALL_S,CWALL_S,CWALL_S,CWALL_S,CWALL_S,CWALL_S,CWALL_S,CWALL_S,CWALL_S,CWALL_S,C],
    ] as const;
    registerSpriteTexture('house_thatch', houseThatchSprite);
    const houseThatchEntrySprite = [
      [C,      C,      CHIM,   CHIM,   CHIM_TOP,CHIM_TOP,C,      C,      C,      C,      C,      C],
      [C,      C,      CHIM,   CHIM,   THATCH_S,THATCH, THATCH_H,THATCH, C,      C,      C,      C],
      [C,      C,      C,      THATCH_S,THATCH, THATCH_H,THATCH, THATCH, THATCH_S,C,      C,      C],
      [C,      C,      THATCH_S,THATCH, THATCH_BAND,THATCH, THATCH_H,THATCH, THATCH, THATCH_S,C,      C],
      [C,      THATCH_S,THATCH, THATCH_H,THATCH, THATCH, THATCH, THATCH, THATCH_H,THATCH, THATCH_S,C],
      [C,      CWALL,  CWALL_H,CWALL,  CWALL,  CWALL,  CWALL,  CWALL,  CWALL,  CWALL_H,CWALL,  C],
      [C,      CWALL,  SHUTTER,WINDOW, WINDOW, CWALL,  CWALL_H,CWALL,  WINDOW, WINDOW, SHUTTER,CWALL,  C],
      [C,      CWALL_S,SHUTTER,WINDOW, WINDOW, CWALL_S,CWALL,  CWALL_S,WINDOW, WINDOW, SHUTTER,CWALL_S,C],
      [C,      CWALL,  CWALL,  CWALL,  CWALL,  DOOR_ARCH,0x8B5E3C,0x8B5E3C,DOOR_ARCH,CWALL,  CWALL,  CWALL,  C],
      [C,      CWALL_S,CWALL,  CWALL,  CWALL,  DOOR_ARCH,0x5D4037,0x5D4037,DOOR_ARCH,CWALL,  CWALL,  CWALL_S,C],
      [C,      CWALL_S,CWALL_S,CWALL_S,CWALL_S,CWALL_S,0x3E2723,0xFFD54F,0x3E2723,CWALL_S,CWALL_S,C],
    ] as const;
    registerSpriteTexture('house_thatch_entry', houseThatchEntrySprite);
    const cottageHouseSprite = [
      [C, C, C, C, CHIM, CHIM, CHIM_TOP, CHIM_TOP, C, C, C, C, C, C, C, C],
      [C, C, C, CHIM, CHIM, CHIM, THATCH_S, THATCH_S, THATCH, THATCH, C, C, C, C, C, C],
      [C, C, C, C, THATCH_S, THATCH, THATCH, THATCH_H, THATCH_H, THATCH, THATCH_S, C, C, C, C, C],
      [C, C, C, THATCH_S, THATCH, THATCH, THATCH_BAND, THATCH_BAND, THATCH, THATCH_H, THATCH, THATCH_S, C, C, C, C],
      [C, C, THATCH_S, THATCH, THATCH_H, THATCH, THATCH, THATCH, THATCH, THATCH, THATCH_H, THATCH, THATCH_S, C, C, C],
      [C, THATCH_S, THATCH, THATCH_H, THATCH, THATCH, THATCH, THATCH, THATCH, THATCH, THATCH, THATCH_H, THATCH, THATCH_S, C, C],
      [C, THATCH_S, THATCH, THATCH, THATCH, THATCH, THATCH, THATCH, THATCH, THATCH, THATCH, THATCH, THATCH, THATCH_S, C, C],
      [C, CWALL, CWALL_H, CWALL, CWALL, CWALL, CWALL, CWALL_H, CWALL_H, CWALL, CWALL, CWALL, CWALL_H, CWALL, C, C],
      [CWALL, CWALL_H, WINDOW, WINDOW, SHUTTER, CWALL, CWALL_H, CWALL, CWALL, CWALL_H, CWALL, SHUTTER, WINDOW, WINDOW, CWALL_H, C],
      [CWALL, CWALL, WINDOW, WINDOW, SHUTTER, CWALL, CWALL, CWALL_H, CWALL_H, CWALL, CWALL, SHUTTER, WINDOW, WINDOW, CWALL, C],
      [CWALL, CWALL_S, CWALL, CWALL, CWALL, CWALL_S, CWALL, DOOR_ARCH, DOOR_ARCH, CWALL, CWALL_S, CWALL, CWALL, CWALL, CWALL_S, C],
      [CWALL, CWALL, CWALL_H, CWALL, CWALL_H, CWALL, DOOR_ARCH, DOOR, DOOR, DOOR_ARCH, CWALL, CWALL_H, CWALL, CWALL_H, CWALL, C],
      [C, CWALL_S, CWALL_S, CWALL_S, CWALL_S, CWALL_S, DOOR_ARCH, DOOR, DOOR, DOOR_ARCH, CWALL_S, CWALL_S, CWALL_S, CWALL_S, C, C],
      [C, C, C, C, C, C, CWALL_S, CWALL_S, CWALL_S, CWALL_S, C, C, C, C, C, C],
    ] as const;
    registerSpriteTexture('cottage_house', cottageHouseSprite);

    // Grey-roofed small house sprite for non-enterable decorative buildings
    const SH_ROOF   = 0x6B7B8D; // cool slate blue-grey roof
    const SH_ROOF_H = 0x8899A6; // roof highlight
    const SH_ROOF_S = 0x4E5D6B; // roof shadow
    const SH_WALL   = 0xD2C8B8; // warm cream wall
    const SH_WALL_H = 0xE0D8CA; // wall highlight
    const SH_WALL_S = 0xB0A898; // wall shadow
    const SH_WIN    = 0x3A5068; // dark blue window
    const SH_WIN_H  = 0x5A7A98; // window reflection
    const SH_SHUT   = 0x6D5840; // brown shutter
    const SH_CHIM   = 0x5A4A3A; // chimney
    const SH_CHIM_T = 0x6E5E4E; // chimney top
    const SH_TRIM   = 0x7A6A52; // wood trim
    const cottageShedSprite = [
      [C,        C,        C,        C,        SH_CHIM,  SH_CHIM_T, C,        C,        SH_ROOF_S, SH_ROOF_S, SH_ROOF, SH_ROOF,  C,        C,        C,        C],
      [C,        C,        C,        SH_CHIM,  SH_CHIM,  SH_ROOF_S, SH_ROOF,  SH_ROOF,  SH_ROOF_H, SH_ROOF,  SH_ROOF, SH_ROOF_S, C,        C,        C,        C],
      [C,        C,        SH_ROOF_S, SH_ROOF,  SH_ROOF,  SH_ROOF_H, SH_ROOF,  SH_ROOF,  SH_ROOF,  SH_ROOF_H, SH_ROOF, SH_ROOF,  SH_ROOF_S, C,        C,        C],
      [C,        SH_ROOF_S, SH_ROOF,  SH_ROOF,  SH_ROOF_H, SH_ROOF,  SH_ROOF,  SH_ROOF,  SH_ROOF,  SH_ROOF,  SH_ROOF_H, SH_ROOF,  SH_ROOF,  SH_ROOF_S, C,        C],
      [SH_ROOF_S, SH_ROOF,  SH_ROOF,  SH_ROOF,  SH_ROOF,  SH_ROOF_H, SH_ROOF,  SH_ROOF_H, SH_ROOF,  SH_ROOF,  SH_ROOF,  SH_ROOF,  SH_ROOF,  SH_ROOF,  SH_ROOF_S, C],
      [SH_TRIM,  SH_TRIM,  SH_TRIM,  SH_TRIM,  SH_TRIM,  SH_TRIM,  SH_TRIM,  SH_TRIM,  SH_TRIM,  SH_TRIM,  SH_TRIM,  SH_TRIM,  SH_TRIM,  SH_TRIM,  SH_TRIM,  C],
      [SH_WALL_S, SH_WALL,  SH_WALL_H, SH_WALL,  SH_WALL,  SH_WALL_H, SH_WALL,  SH_WALL,  SH_WALL_H, SH_WALL,  SH_WALL,  SH_WALL_H, SH_WALL,  SH_WALL,  SH_WALL_S, C],
      [SH_WALL_S, SH_WALL,  SH_SHUT,  SH_WIN,   SH_WIN_H, SH_WALL,  SH_WALL_H, SH_WALL,  SH_WALL,  SH_WALL_H, SH_SHUT,  SH_WIN,   SH_WIN_H, SH_WALL,  SH_WALL_S, C],
      [SH_WALL_S, SH_WALL,  SH_SHUT,  SH_WIN,   SH_WIN,   SH_WALL_H, SH_WALL,  SH_WALL,  SH_WALL_H, SH_WALL,  SH_SHUT,  SH_WIN,   SH_WIN,   SH_WALL_H, SH_WALL_S, C],
      [SH_WALL_S, SH_WALL,  SH_WALL_H, SH_WALL,  SH_WALL,  SH_WALL,  SH_WALL_H, SH_WALL,  SH_WALL,  SH_WALL,  SH_WALL,  SH_WALL_H, SH_WALL,  SH_WALL,  SH_WALL_S, C],
      [SH_TRIM,  SH_WALL_S, SH_WALL_S, SH_WALL_S, SH_WALL_S, SH_WALL_S, SH_WALL_S, SH_WALL_S, SH_WALL_S, SH_WALL_S, SH_WALL_S, SH_WALL_S, SH_WALL_S, SH_WALL_S, SH_TRIM,  C],
      [C,        C,        C,        C,        C,        C,        C,        C,        C,        C,        C,        C,        C,        C,        C,        C],
    ];
    registerSpriteTexture('cottage_shed', cottageShedSprite);

    const cottageHouseForestSprite = cottageHouseSprite.map(row => row.map(px => {
      if (px === THATCH) return GROOF;
      if (px === THATCH_H) return GROOF_H;
      if (px === THATCH_S) return GROOF_S;
      if (px === THATCH_BAND) return GROOF_TRIM;
      return px;
    }));
    registerSpriteTexture('cottage_house_forest', cottageHouseForestSprite);
    // Ruined forest cottage â€” roof caved in with visible holes, exposed timber beams,
    // crumbled walls. Derived from the forest sprite then punched with transparent gaps
    // and replaced roof sections with dark interior / beam colors.
    const RB = 0x5D4037; // exposed roof beam (dark wood)
    const RB_H = 0x795548; // beam highlight
    const RI = 0x3E2723; // dark interior visible through holes
    const RW_D = 0x8F857E; // damaged wall (darker)
    const RW_C = 0x6B5C50; // cracked wall
    const RV = 0x4CAF50;   // vine green
    const RV_D = 0x2E7D32; // dark vine
    const RM = 0x66BB6A;   // moss
    const cottageHouseForestRuinedSprite: number[][] = cottageHouseForestSprite.map(row => [...row]);
    cottageHouseForestRuinedSprite[0] = [C, C, C, C, CHIM, C, C, C, C, C, C, C, C, C, C, C];
    cottageHouseForestRuinedSprite[1] = [C, C, C, CHIM, RB, C, C, C, C, C, C, C, C, C, C, C];
    cottageHouseForestRuinedSprite[2] = [C, C, C, C, C, RI, RI, GROOF_H, GROOF_H, GROOF, GROOF_S, C, C, C, C, C];
    cottageHouseForestRuinedSprite[3] = [C, C, C, GROOF_S, RI, RI, RB, RB_H, GROOF, GROOF_H, GROOF, GROOF_S, C, C, C, C];
    cottageHouseForestRuinedSprite[4] = [C, C, GROOF_S, GROOF, GROOF_H, RB, GROOF, GROOF, RI, RI, RI, GROOF, GROOF_S, C, C, C];
    cottageHouseForestRuinedSprite[5] = [C, GROOF_S, GROOF, RB, GROOF, GROOF, RI, RI, RI, GROOF, GROOF, RB_H, GROOF, GROOF_S, C, C];
    cottageHouseForestRuinedSprite[6] = [C, GROOF_S, RB, GROOF, GROOF, RI, RI, GROOF, GROOF, RI, GROOF, GROOF, RB, GROOF_S, C, C];
    cottageHouseForestRuinedSprite[7] = [C, RW_D, CWALL_H, RW_C, CWALL, RW_C, CWALL, CWALL_H, CWALL_H, RW_C, CWALL, RW_C, CWALL_H, RW_D, C, C];
    cottageHouseForestRuinedSprite[8] = [RW_D, CWALL_H, RI, RI, RW_C, CWALL, CWALL_H, RV, RV_D, CWALL_H, CWALL, SHUTTER, WINDOW, WINDOW, CWALL_H, C];
    cottageHouseForestRuinedSprite[9] = [RW_D, CWALL, RI, RI, RW_C, CWALL, RV_D, RM, RV, RW_C, CWALL, SHUTTER, RI, WINDOW, RW_D, C];
    // Row 10: door arch area â€” completely blocked by rubble and overgrown with moss/vines
    cottageHouseForestRuinedSprite[10] = [RW_D, RW_C, CWALL, RW_C, CWALL, RV_D, RV, RW_C, RW_D, RV, RV_D, CWALL, RW_C, CWALL, RW_C, C];
    // Row 11: door sealed â€” rubble pile and thick vine growth where door once was
    cottageHouseForestRuinedSprite[11] = [RW_C, CWALL, CWALL_H, CWALL, RV_D, RV, RW_C, RW_D, RW_C, RW_D, RV, RV_D, CWALL, CWALL_H, RW_C, C];
    // Row 12: foundation with rubble and moss spilling out at the base
    cottageHouseForestRuinedSprite[12] = [C, RW_C, RW_C, RW_C, RM, RV_D, RW_D, RW_C, RW_C, RW_D, RV_D, RM, RW_C, RW_C, C, C];
    registerSpriteTexture('cottage_house_forest_ruined', cottageHouseForestRuinedSprite);
    for (let variant = 0; variant < 12; variant++) {
      const spriteId = `cottage_house_forest_ruined_variant_${variant}`;
      this.registerTexture(spriteId, () =>
        this.createRuinedForestCottageVariantTexture(cottageHouseForestRuinedSprite, variant, spriteId)
      );
    }

    const RR = 0x8B5E3C;    // warm brown roof
    const RR_H = 0xA67C52;  // roof highlight
    const RR_S = 0x6B4226;  // roof shadow
    const RR_B = 0x5C3A1E;  // roof band/ridge
    const RW = 0xC8B898;    // ranger wall (warm timber)
    const RW_H2 = 0xD8C8A8; // wall highlight
    const RW_S2 = 0xA89878; // wall shadow
    const cottageHouseRangerSprite = [
      [C, C, C, C, CHIM, CHIM, CHIM_TOP, CHIM_TOP, C, C, C, C, C, C, C, C],
      [C, C, C, CHIM, CHIM, CHIM, RR_S, RR_S, RR, RR, C, C, C, C, C, C],
      [C, C, C, C, RR_S, RR, RR, RR_H, RR_H, RR, RR_S, C, C, C, C, C],
      [C, C, C, RR_S, RR, RR, RR_B, RR_B, RR, RR_H, RR, RR_S, C, C, C, C],
      [C, C, RR_S, RR, RR_H, RR, RR, RR, RR, RR, RR_H, RR, RR_S, C, C, C],
      [C, RR_S, RR, RR_H, RR, RR, RR, RR, RR, RR, RR, RR_H, RR, RR_S, C, C],
      [C, RR_S, RR, RR, RR, RR, RR, RR, RR, RR, RR, RR, RR, RR_S, C, C],
      [C, RW, RW_H2, RW, RW, RW, RW, RW_H2, RW_H2, RW, RW, RW, RW_H2, RW, C, C],
      [RW, RW_H2, WINDOW, WINDOW, SHUTTER, RW, RW_H2, RW, RW, RW_H2, RW, SHUTTER, WINDOW, WINDOW, RW_H2, C],
      [RW, RW, WINDOW, WINDOW, SHUTTER, RW, RW, RW_H2, RW_H2, RW, RW, SHUTTER, WINDOW, WINDOW, RW, C],
      [RW, RW_S2, RW, RW, RW, RW_S2, RW, DOOR_ARCH, DOOR_ARCH, RW, RW_S2, RW, RW, RW, RW_S2, C],
      [RW, RW, RW_H2, RW, RW_H2, RW, DOOR_ARCH, DOOR, DOOR, DOOR_ARCH, RW, RW_H2, RW, RW_H2, RW, C],
      [C, RW_S2, RW_S2, RW_S2, RW_S2, RW_S2, DOOR_ARCH, DOOR, DOOR, DOOR_ARCH, RW_S2, RW_S2, RW_S2, RW_S2, C, C],
      [C, C, C, C, C, C, RW_S2, RW_S2, RW_S2, RW_S2, C, C, C, C, C, C],
    ] as const;
    registerSpriteTexture('cottage_house_ranger', cottageHouseRangerSprite);
    const cottageHouseEntrySprite = [
      [C, C, C, C, CHIM, CHIM, CHIM_TOP, CHIM_TOP, C, C, C, C, C, C, C, C],
      [C, C, C, CHIM, CHIM, CHIM, THATCH_S, THATCH_S, THATCH, THATCH, C, C, C, C, C, C],
      [C, C, C, C, THATCH_S, THATCH, THATCH, THATCH_H, THATCH_H, THATCH, THATCH_S, C, C, C, C, C],
      [C, C, C, THATCH_S, THATCH, THATCH, THATCH_BAND, THATCH_BAND, THATCH, THATCH_H, THATCH, THATCH_S, C, C, C, C],
      [C, C, THATCH_S, THATCH, THATCH_H, THATCH, THATCH, THATCH, THATCH, THATCH, THATCH_H, THATCH, THATCH_S, C, C, C],
      [C, THATCH_S, THATCH, THATCH_H, THATCH, THATCH, THATCH, THATCH, THATCH, THATCH, THATCH, THATCH_H, THATCH, THATCH_S, C, C],
      [C, THATCH_S, THATCH, THATCH, THATCH, THATCH, THATCH, THATCH, THATCH, THATCH, THATCH, THATCH, THATCH, THATCH_S, C, C],
      [C, CWALL, CWALL_H, CWALL, CWALL, CWALL, CWALL, CWALL_H, CWALL_H, CWALL, CWALL, CWALL, CWALL_H, CWALL, C, C],
      [CWALL, CWALL_H, WINDOW, WINDOW, SHUTTER, CWALL, CWALL_H, CWALL, CWALL, CWALL_H, CWALL, SHUTTER, WINDOW, WINDOW, CWALL_H, C],
      [CWALL, CWALL, WINDOW, WINDOW, SHUTTER, CWALL, CWALL, CWALL_H, CWALL_H, CWALL, CWALL, SHUTTER, WINDOW, WINDOW, CWALL, C],
      [CWALL, CWALL_S, CWALL, CWALL, CWALL, CWALL_S, CWALL, CWALL_H, CWALL_H, CWALL, CWALL_S, CWALL, CWALL, CWALL, CWALL_S, C],
      [CWALL, CWALL, CWALL_H, CWALL, CWALL_H, CWALL, CWALL_H, CWALL, CWALL, CWALL_H, CWALL, CWALL_H, CWALL, CWALL_H, CWALL, C],
      [C, CWALL_S, CWALL_S, CWALL_S, CWALL_S, CWALL_S, 0x3E2723, 0x6D4C41, 0x4E342E, 0x3E2723, CWALL_S, CWALL_S, CWALL_S, CWALL_S, C, C],
      [C, C, C, C, C, C, 0x3E2723, 0xFFD54F, 0xFF8F00, 0x3E2723, C, C, C, C, C, C],
    ] as const;
    registerSpriteTexture('cottage_house_entry', cottageHouseEntrySprite);

    // Destroyed house variants
    const RUBBLE = 0x795548;
    const RUBBLE_S = 0x5D4037;
    const OG_VINE = 0x4CAF50;
    const OG_VINE_D = 0x2E7D32;
    const OG_MOSS = 0x66BB6A;

    // Original: partial walls, collapsed roof, rubble interior
    registerSpriteTexture('destroyed_house', [
      [C,     C,     C,     C,     C,     C,     C,     C,     C,     C],
      [C,     C,     C,     ROOF_S,ROOF,  C,     C,     C,     C,     C],
      [C,     C,     ROOF_S,ROOF,  ROOF,  C,     C,     ROOF_S,C,     C],
      [C,     WALL,  WALL_H,C,     C,     C,     WALL_H,WALL,  C,     C],
      [C,     WALL,  C,     C,     RUBBLE,RUBBLE,C,     WALL,  C,     C],
      [C,     WALL_S,C,     RUBBLE_S,RUBBLE,RUBBLE_S,C, WALL_S,C,     C],
      [C,     WALL,  RUBBLE,RUBBLE_S,RUBBLE,RUBBLE,RUBBLE,WALL, C,     C],
      [C,     WALL_S,RUBBLE_S,RUBBLE,RUBBLE_S,RUBBLE,RUBBLE_S,WALL_S,C,C],
      [C,     RUBBLE_S,RUBBLE,RUBBLE_S,RUBBLE,RUBBLE_S,RUBBLE,RUBBLE_S,C,C],
      [C,     C,     C,     C,     C,     C,     C,     C,     C,     C],
    ]);

    // Rubble: collapsed foundation, scattered stone and timber debris
    registerSpriteTexture('destroyed_house_rubble', [
      [C,     C,     C,     C,     C,     C,     C,     C,     C,     C],
      [C,     C,     C,     C,     RUBBLE,C,     C,     C,     C,     C],
      [C,     C,     RUBBLE_S,RUBBLE,WALL_S,RUBBLE,C,   C,     C,     C],
      [C,     C,     RUBBLE,WALL_S,RUBBLE_S,RUBBLE,RUBBLE_S,C, C,     C],
      [C,     RUBBLE_S,WALL, RUBBLE,RUBBLE_S,WALL_H,RUBBLE,RUBBLE_S,C,C],
      [C,     RUBBLE,RUBBLE_S,WALL_S,RUBBLE,RUBBLE_S,WALL,RUBBLE,C,  C],
      [C,     WALL_S,RUBBLE,RUBBLE_S,WALL, RUBBLE,RUBBLE_S,WALL_S,C, C],
      [C,     RUBBLE_S,WALL, RUBBLE,RUBBLE_S,RUBBLE,WALL_S,RUBBLE,C, C],
      [C,     RUBBLE,RUBBLE_S,RUBBLE,WALL_S,RUBBLE_S,RUBBLE,RUBBLE_S,C,C],
      [C,     C,     C,     C,     C,     C,     C,     C,     C,     C],
    ]);

    // Overgrown: vines creeping over crumbled walls, moss patches
    registerSpriteTexture('destroyed_house_overgrown', [
      [C,     C,     C,     OG_VINE,C,     C,     C,     C,     C,     C],
      [C,     C,     OG_VINE_D,OG_VINE,OG_VINE,C, C,     OG_VINE,C,   C],
      [C,     C,     OG_VINE,WALL_H,OG_VINE_D,C,OG_VINE,OG_MOSS,C,   C],
      [C,     WALL,  OG_MOSS,C,     C,     C,     OG_VINE_D,WALL, C,   C],
      [C,     WALL_S,C,     C,     OG_VINE,RUBBLE,C,     OG_VINE,C,   C],
      [C,     OG_VINE_D,C,  RUBBLE_S,OG_MOSS,RUBBLE_S,C,WALL_S, C,   C],
      [C,     WALL,  OG_VINE,RUBBLE_S,OG_VINE_D,RUBBLE,OG_MOSS,WALL,C,C],
      [C,     OG_MOSS,RUBBLE_S,OG_VINE,RUBBLE_S,OG_VINE_D,RUBBLE_S,OG_VINE,C,C],
      [C,     RUBBLE_S,OG_MOSS,RUBBLE_S,OG_VINE,RUBBLE_S,OG_VINE,RUBBLE_S,C,C],
      [C,     C,     C,     C,     C,     C,     C,     C,     C,     C],
    ]);

    const ROCK_L = 0x9E9E9E;
    const ROCK_M = 0x757575;
    const ROCK_D = 0x616161;
    const ROCK_H = 0xBDBDBD;

    registerSpriteTexture('rock', [
      [C,     C,     C,     ROCK_H,ROCK_L,ROCK_H,C,     C,     C,     C],
      [C,     C,     ROCK_L,ROCK_M,ROCK_L,ROCK_M,ROCK_L,C,     C,     C],
      [C,     ROCK_L,ROCK_M,ROCK_D,ROCK_M,ROCK_D,ROCK_M,ROCK_L,C,     C],
      [ROCK_H,ROCK_M,ROCK_D,ROCK_D,ROCK_M,ROCK_D,ROCK_D,ROCK_M,ROCK_H,C],
      [ROCK_L,ROCK_D,ROCK_D,ROCK_M,ROCK_D,ROCK_D,ROCK_M,ROCK_D,ROCK_L,C],
      [C,     ROCK_D,ROCK_M,ROCK_D,ROCK_D,ROCK_D,ROCK_D,ROCK_D,C,     C],
      [C,     C,     ROCK_D,ROCK_D,ROCK_D,ROCK_D,ROCK_D,C,     C,     C],
      [C,     C,     C,     ROCK_D,ROCK_D,ROCK_D,C,     C,     C,     C],
    ]);

    const CHEST_WOOD = 0x6D4C41;
    const CHEST_WOOD_H = 0x8D6E63;
    const CHEST_WOOD_S = 0x4E342E;
    const CHEST_METAL = 0xFFB300;
    const CHEST_METAL_H = 0xFFD54F;
    const CHEST_LOCK = 0xFFC107;

    registerSpriteTexture('chest', [
      [C,     C,     CHEST_WOOD,CHEST_WOOD_H,CHEST_WOOD,CHEST_WOOD_H,CHEST_WOOD,CHEST_WOOD,C,     C],
      [C,     CHEST_WOOD,CHEST_METAL,CHEST_METAL_H,CHEST_METAL,CHEST_METAL_H,CHEST_METAL,CHEST_METAL,CHEST_WOOD,C],
      [C,     CHEST_WOOD_S,CHEST_WOOD,CHEST_WOOD,CHEST_LOCK,CHEST_LOCK,CHEST_WOOD,CHEST_WOOD,CHEST_WOOD_S,C],
      [C,     CHEST_WOOD,CHEST_WOOD_S,CHEST_WOOD,CHEST_WOOD_S,CHEST_WOOD,CHEST_WOOD_S,CHEST_WOOD,CHEST_WOOD,C],
      [C,     CHEST_WOOD_S,CHEST_WOOD_S,CHEST_WOOD_S,CHEST_WOOD_S,CHEST_WOOD_S,CHEST_WOOD_S,CHEST_WOOD_S,CHEST_WOOD_S,C],
    ]);

    const CHEST_OPEN_METAL = 0x8D8D8D;
    const CHEST_OPEN_METAL_H = 0xB0B0B0;
    const CHEST_OPEN_GLOW = 0xE6C45A;
    registerSpriteTexture('chest_opened', [
      [C,     C,     CHEST_WOOD_S, CHEST_WOOD_H,      CHEST_WOOD_H,      CHEST_WOOD_H,   CHEST_WOOD_S, C,     C,     C],
      [C,     CHEST_WOOD_S, CHEST_OPEN_METAL, CHEST_OPEN_METAL_H, CHEST_OPEN_GLOW, CHEST_OPEN_METAL_H, CHEST_OPEN_METAL, CHEST_WOOD_S, C, C],
      [C,     CHEST_WOOD, CHEST_WOOD, CHEST_OPEN_GLOW, C,               CHEST_OPEN_GLOW, CHEST_WOOD,   CHEST_WOOD_H, C, C],
      [C,     CHEST_WOOD_S, CHEST_WOOD, CHEST_WOOD,   CHEST_WOOD,      CHEST_WOOD,      CHEST_WOOD,   CHEST_WOOD_S, C, C],
      [C,     CHEST_WOOD, CHEST_WOOD_S, CHEST_WOOD,   CHEST_LOCK,      CHEST_LOCK,      CHEST_WOOD_S, CHEST_WOOD,   C, C],
      [C,     CHEST_WOOD_S, CHEST_WOOD_S, CHEST_WOOD_S,CHEST_WOOD_S,   CHEST_WOOD_S,    CHEST_WOOD_S, CHEST_WOOD_S, C, C],
    ]);

    const SPECIAL_CHEST_WOOD = 0x5A3428;
    const SPECIAL_CHEST_WOOD_H = 0x8A5A3A;
    const SPECIAL_CHEST_WOOD_S = 0x2F1A16;
    const SPECIAL_CHEST_GOLD = 0xD8A72B;
    const SPECIAL_CHEST_GOLD_H = 0xFFE082;
    const SPECIAL_CHEST_GOLD_S = 0x8A6115;
    const SPECIAL_CHEST_GEM = 0x66E6FF;
    const SPECIAL_CHEST_GLOW = 0xFFF4A3;
    const SPECIAL_CHEST_INTERIOR = 0x1D1718;
    const SPECIAL_CHEST_INTERIOR_H = 0x4A3A28;

    registerSpriteTexture('special_chest', [
      [C, SPECIAL_CHEST_GOLD_S, SPECIAL_CHEST_GOLD,   SPECIAL_CHEST_GOLD_H, SPECIAL_CHEST_GOLD,   SPECIAL_CHEST_GOLD_H, SPECIAL_CHEST_GOLD,   SPECIAL_CHEST_GOLD_H, SPECIAL_CHEST_GOLD,   SPECIAL_CHEST_GOLD_S, C, C],
      [SPECIAL_CHEST_GOLD_S, SPECIAL_CHEST_WOOD_H, SPECIAL_CHEST_WOOD,   SPECIAL_CHEST_WOOD_H, SPECIAL_CHEST_WOOD,   SPECIAL_CHEST_WOOD_H, SPECIAL_CHEST_WOOD,   SPECIAL_CHEST_WOOD_H, SPECIAL_CHEST_WOOD,   SPECIAL_CHEST_WOOD_H, SPECIAL_CHEST_GOLD_S, C],
      [SPECIAL_CHEST_GOLD,   SPECIAL_CHEST_GOLD_H, SPECIAL_CHEST_GOLD,   SPECIAL_CHEST_GOLD_H, SPECIAL_CHEST_GOLD,   SPECIAL_CHEST_GEM,    SPECIAL_CHEST_GEM,    SPECIAL_CHEST_GOLD,   SPECIAL_CHEST_GOLD_H, SPECIAL_CHEST_GOLD,   SPECIAL_CHEST_GOLD_H, SPECIAL_CHEST_GOLD],
      [SPECIAL_CHEST_WOOD_S, SPECIAL_CHEST_WOOD,   SPECIAL_CHEST_WOOD_H, SPECIAL_CHEST_WOOD,   SPECIAL_CHEST_WOOD,   SPECIAL_CHEST_GOLD_H, SPECIAL_CHEST_GOLD_H, SPECIAL_CHEST_WOOD,   SPECIAL_CHEST_WOOD,   SPECIAL_CHEST_WOOD_H, SPECIAL_CHEST_WOOD,   SPECIAL_CHEST_WOOD_S],
      [SPECIAL_CHEST_GOLD_S, SPECIAL_CHEST_WOOD,   SPECIAL_CHEST_WOOD_S, SPECIAL_CHEST_WOOD,   SPECIAL_CHEST_WOOD,   SPECIAL_CHEST_GEM,    SPECIAL_CHEST_GEM,    SPECIAL_CHEST_WOOD,   SPECIAL_CHEST_WOOD,   SPECIAL_CHEST_WOOD_S, SPECIAL_CHEST_WOOD,   SPECIAL_CHEST_GOLD_S],
      [SPECIAL_CHEST_GOLD,   SPECIAL_CHEST_WOOD_S, SPECIAL_CHEST_WOOD,   SPECIAL_CHEST_WOOD_S, SPECIAL_CHEST_WOOD,   SPECIAL_CHEST_GOLD,   SPECIAL_CHEST_GOLD,   SPECIAL_CHEST_WOOD,   SPECIAL_CHEST_WOOD_S, SPECIAL_CHEST_WOOD,   SPECIAL_CHEST_WOOD_S, SPECIAL_CHEST_GOLD],
      [C, SPECIAL_CHEST_GOLD_S, SPECIAL_CHEST_WOOD_S, SPECIAL_CHEST_WOOD_S, SPECIAL_CHEST_WOOD_S, SPECIAL_CHEST_WOOD_S, SPECIAL_CHEST_WOOD_S, SPECIAL_CHEST_WOOD_S, SPECIAL_CHEST_WOOD_S, SPECIAL_CHEST_WOOD_S, SPECIAL_CHEST_GOLD_S, C],
    ]);

    registerSpriteTexture('special_chest_opened', [
      [C, C, SPECIAL_CHEST_WOOD_S, SPECIAL_CHEST_GOLD,   SPECIAL_CHEST_GOLD_H, SPECIAL_CHEST_GOLD_H, SPECIAL_CHEST_GOLD_H, SPECIAL_CHEST_GOLD_H, SPECIAL_CHEST_GOLD,   SPECIAL_CHEST_WOOD_S, C, C],
      [C, SPECIAL_CHEST_WOOD_S, SPECIAL_CHEST_GOLD_H, SPECIAL_CHEST_GLOW, SPECIAL_CHEST_GLOW, SPECIAL_CHEST_GLOW, SPECIAL_CHEST_GLOW, SPECIAL_CHEST_GLOW, SPECIAL_CHEST_GLOW, SPECIAL_CHEST_GOLD_H, SPECIAL_CHEST_WOOD_S, C],
      [SPECIAL_CHEST_WOOD_S, SPECIAL_CHEST_GOLD,   SPECIAL_CHEST_GLOW, SPECIAL_CHEST_GEM,  SPECIAL_CHEST_INTERIOR_H, SPECIAL_CHEST_INTERIOR_H, SPECIAL_CHEST_INTERIOR_H, SPECIAL_CHEST_INTERIOR_H, SPECIAL_CHEST_GEM,  SPECIAL_CHEST_GLOW, SPECIAL_CHEST_GOLD,   SPECIAL_CHEST_WOOD_S],
      [SPECIAL_CHEST_GOLD_S, SPECIAL_CHEST_WOOD_H, SPECIAL_CHEST_GLOW, SPECIAL_CHEST_INTERIOR_H, SPECIAL_CHEST_INTERIOR,   SPECIAL_CHEST_INTERIOR,   SPECIAL_CHEST_INTERIOR,   SPECIAL_CHEST_INTERIOR,   SPECIAL_CHEST_INTERIOR_H, SPECIAL_CHEST_GLOW, SPECIAL_CHEST_WOOD_H, SPECIAL_CHEST_GOLD_S],
      [SPECIAL_CHEST_WOOD_S, SPECIAL_CHEST_WOOD,   SPECIAL_CHEST_GOLD_H, SPECIAL_CHEST_GLOW, SPECIAL_CHEST_INTERIOR_H, SPECIAL_CHEST_INTERIOR_H, SPECIAL_CHEST_INTERIOR_H, SPECIAL_CHEST_INTERIOR_H, SPECIAL_CHEST_GLOW, SPECIAL_CHEST_GOLD_H, SPECIAL_CHEST_WOOD,   SPECIAL_CHEST_WOOD_S],
      [SPECIAL_CHEST_GOLD,   SPECIAL_CHEST_WOOD,   SPECIAL_CHEST_WOOD_S, SPECIAL_CHEST_WOOD, SPECIAL_CHEST_WOOD, SPECIAL_CHEST_GEM, SPECIAL_CHEST_GEM, SPECIAL_CHEST_WOOD,   SPECIAL_CHEST_WOOD,   SPECIAL_CHEST_WOOD_S, SPECIAL_CHEST_WOOD,   SPECIAL_CHEST_GOLD],
      [C, SPECIAL_CHEST_GOLD_S, SPECIAL_CHEST_WOOD_S, SPECIAL_CHEST_WOOD_S, SPECIAL_CHEST_WOOD_S, SPECIAL_CHEST_WOOD_S, SPECIAL_CHEST_WOOD_S, SPECIAL_CHEST_WOOD_S, SPECIAL_CHEST_WOOD_S, SPECIAL_CHEST_WOOD_S, SPECIAL_CHEST_GOLD_S, C],
    ]);

    const PORTAL_OUTER = 0x7B1FA2;
    const PORTAL_MID = 0xAB47BC;
    const PORTAL_INNER = 0xCE93D8;
    const PORTAL_CORE = 0xE1BEE7;
    const PORTAL_GLOW = 0xEA80FC;

    registerSpriteTexture('portal', [
      [C,           C,           PORTAL_OUTER,PORTAL_OUTER,PORTAL_MID,  PORTAL_OUTER,PORTAL_OUTER,C,           C,           C],
      [C,           PORTAL_OUTER,PORTAL_MID,  PORTAL_MID,  PORTAL_INNER,PORTAL_MID,  PORTAL_MID,  PORTAL_OUTER,C,           C],
      [PORTAL_OUTER,PORTAL_MID,  PORTAL_INNER,PORTAL_GLOW, PORTAL_CORE, PORTAL_GLOW, PORTAL_INNER,PORTAL_MID,  PORTAL_OUTER,C],
      [PORTAL_OUTER,PORTAL_MID,  PORTAL_GLOW, PORTAL_CORE, 0xFFFFFF,    PORTAL_CORE, PORTAL_GLOW, PORTAL_MID,  PORTAL_OUTER,C],
      [PORTAL_OUTER,PORTAL_MID,  PORTAL_INNER,PORTAL_GLOW, PORTAL_CORE, PORTAL_GLOW, PORTAL_INNER,PORTAL_MID,  PORTAL_OUTER,C],
      [C,           PORTAL_OUTER,PORTAL_MID,  PORTAL_MID,  PORTAL_INNER,PORTAL_MID,  PORTAL_MID,  PORTAL_OUTER,C,           C],
      [C,           C,           PORTAL_OUTER,PORTAL_OUTER,PORTAL_MID,  PORTAL_OUTER,PORTAL_OUTER,C,           C,           C],
    ]);

    // Door textures - wooden and iron doors for building entrances
    const DOOR_FRAME = 0x3E2723;
    const DOOR_FRAME_L = 0x5D4037;
    const DOOR_WOOD = 0x6D4C41;
    const DOOR_WOOD_D = 0x4E342E;
    const DOOR_HANDLE = 0xFFD54F;
    const DOOR_HANDLE_S = 0xFF8F00;
    
    registerSpriteTexture('door', [
      [DOOR_FRAME,DOOR_FRAME,DOOR_FRAME,DOOR_FRAME,DOOR_FRAME,DOOR_FRAME],
      [DOOR_FRAME,DOOR_WOOD, DOOR_WOOD, DOOR_WOOD, DOOR_WOOD, DOOR_FRAME],
      [DOOR_FRAME_L,DOOR_WOOD, DOOR_WOOD_D,DOOR_WOOD, DOOR_WOOD, DOOR_FRAME_L],
      [DOOR_FRAME_L,DOOR_WOOD, DOOR_WOOD, DOOR_WOOD_D,DOOR_WOOD, DOOR_FRAME_L],
      [DOOR_FRAME_L,DOOR_WOOD, DOOR_WOOD_D,DOOR_WOOD, DOOR_WOOD, DOOR_FRAME_L],
      [DOOR_FRAME_L,DOOR_WOOD, DOOR_WOOD, DOOR_WOOD, DOOR_WOOD, DOOR_FRAME_L],
      [DOOR_FRAME,DOOR_FRAME_L,DOOR_HANDLE,DOOR_HANDLE_S,DOOR_FRAME_L,DOOR_FRAME],
      [DOOR_FRAME,DOOR_FRAME,DOOR_FRAME,DOOR_FRAME,DOOR_FRAME,DOOR_FRAME],
    ]);
    this.registerTexture('door_interior', () => this.getTexture('door')!.clone());

    const IRON_D = 0x37474F;
    const IRON_M = 0x546E7A;
    const IRON_L = 0x78909C;
    const IRON_HL = 0x90A4AE;
    const RIVET = 0x212121;
    
    registerSpriteTexture('door_iron', [
      [IRON_D,IRON_D,IRON_D,IRON_D,IRON_D,IRON_D],
      [IRON_D,IRON_M,IRON_L,IRON_L,IRON_M,IRON_D],
      [IRON_D,RIVET,IRON_L,IRON_L,RIVET,IRON_D],
      [IRON_D,IRON_M,IRON_HL,IRON_HL,IRON_M,IRON_D],
      [IRON_D,IRON_M,IRON_L,IRON_L,IRON_M,IRON_D],
      [IRON_D,RIVET,IRON_L,IRON_L,RIVET,IRON_D],
      [IRON_D,IRON_M,IRON_HL,IRON_HL,IRON_M,IRON_D],
      [IRON_D,IRON_D,IRON_D,IRON_D,IRON_D,IRON_D],
    ]);

    const WHEEL = 0x212121;
    const WHEEL_H = 0x424242;
    const WAGON_W = 0x5D4037;
    const WAGON_W_H = 0x795548;
    const CANOPY_R = 0xC62828;
    const CANOPY_R_H = 0xE53935;
    const STALL_W = 0x6D4C41;
    const BOOK = 0x5D4037;
    const BOOK_H = 0x8D6E63;
    const RUG_R = 0xB71C1C;
    const RUG_G = 0x1B5E20;
    const RUG_GOLD = 0xFFD54F;
    const CLAY = 0xBF360C;
    const CLAY_H = 0xE64A19;

    registerSpriteTexture('wagon', [
      [C,     C,     C,     WHEEL_H,WHEEL, WHEEL_H,C,     C,     WHEEL_H,WHEEL, WHEEL_H,C,     C],
      [C,     C,     WAGON_W,WAGON_W_H,WAGON_W,WAGON_W_H,WAGON_W,WAGON_W_H,WAGON_W,WAGON_W_H,WAGON_W,C,     C],
      [C,     WAGON_W_H,WAGON_W,WAGON_W_H,WAGON_W,WAGON_W_H,WAGON_W,WAGON_W_H,WAGON_W,WAGON_W_H,WAGON_W,WAGON_W_H,C],
      [C,     WAGON_W,WAGON_W_H,WAGON_W,WAGON_W_H,WAGON_W,WAGON_W_H,WAGON_W,WAGON_W_H,WAGON_W,WAGON_W_H,WAGON_W,C],
      [C,     WAGON_W_H,WAGON_W,WAGON_W_H,WAGON_W,WAGON_W_H,WAGON_W,WAGON_W_H,WAGON_W,WAGON_W_H,WAGON_W,WAGON_W_H,C],
      [C,     WHEEL_H,WHEEL, WHEEL_H,WHEEL, WHEEL_H,WHEEL, WHEEL_H,WHEEL, WHEEL_H,WHEEL, WHEEL_H,C],
      [C,     C,     C,     C,     C,     C,     C,     C,     C,     C,     C,     C,     C],
    ]);

    registerSpriteTexture('cart', [
      [C,     C,     WHEEL_H,WHEEL, WHEEL_H,C,     C,     C,     C],
      [C,     WAGON_W_H,WAGON_W,WAGON_W_H,WAGON_W,WAGON_W_H,C,     C],
      [C,     WAGON_W,WAGON_W_H,WAGON_W,WAGON_W_H,WAGON_W,WAGON_W_H,C],
      [C,     WAGON_W_H,WAGON_W,WAGON_W_H,WAGON_W,WAGON_W_H,WAGON_W,C],
      [C,     WHEEL_H,WHEEL, WHEEL_H,WHEEL, WHEEL_H,C,     C],
    ]);

    // ===== Riverbank props =====
    const HULL     = 0x5D4037;   // dark weathered wood â€” hull planks
    const HULL_H   = 0x795548;   // lighter highlight
    const HULL_S   = 0x4E342E;   // deep shadow grain
    const NAIL     = 0x37474F;   // iron nail heads
    const WATER_V  = 0x1565C0;   // water visible through holes
    const RIB      = 0x6D4C41;   // exposed rib strake
    const CLOTH    = 0xB71C1C;   // tattered sail scrap â€” faded red
    const CLOTH_D  = 0x7F0000;

    // boat_wreck â€” half-sunken rowboat viewed from top-down: broken bow at top, stern angled down
    registerSpriteTexture('boat_wreck', [
      //      0       1       2       3       4       5       6       7       8       9
      [C,      C,      HULL_H, HULL_H, HULL_H, HULL_H, C,      C,      C,      C    ],
      [C,      HULL_H, HULL,   WATER_V,WATER_V,HULL,   HULL_H, C,      C,      C    ],
      [HULL_H, HULL,   RIB,    WATER_V,WATER_V,RIB,    HULL,   HULL_H, C,      C    ],
      [HULL,   HULL_S, RIB,    CLOTH,  CLOTH_D,RIB,    HULL_S, HULL,   NAIL,   C    ],
      [HULL_S, NAIL,   HULL_S, CLOTH_D,CLOTH,  HULL_S, NAIL,   HULL_S, HULL_S, C    ],
      [C,      HULL_S, HULL,   HULL_S, HULL_S, HULL,   HULL_S, C,      C,      C    ],
      [C,      C,      HULL_S, HULL,   HULL,   HULL_S, C,      C,      C,      C    ],
      [C,      C,      C,      HULL_S, HULL_S, C,      C,      C,      C,      C    ],
    ], 4);

    const PLANK   = 0x78909C;   // grey-weathered dock board
    const PLANK_H = 0x90A4AE;   // lighter board face
    const PLANK_S = 0x546E7A;   // shadow between planks
    const PLANK_D = 0x37474F;   // dark gap showing water below
    const PPOST   = 0x4E342E;   // mooring post â€” dark wood

    // dock â€” top-down weathered wooden planking: posts at corners, plank gaps showing water
    registerSpriteTexture('dock', [
      //      0        1        2        3        4        5        6        7
      [PPOST,  PLANK_D, PLANK_H, PLANK,   PLANK,   PLANK_H, PLANK_D, PPOST  ],
      [PLANK_D,PLANK_H, PLANK,   PLANK_S, PLANK_S, PLANK,   PLANK_H, PLANK_D],
      [PLANK_H,PLANK,   PLANK_S, PLANK_H, PLANK_H, PLANK_S, PLANK,   PLANK_H],
      [PLANK,  PLANK_S, PLANK_H, PLANK,   PLANK,   PLANK_H, PLANK_S, PLANK  ],
      [PLANK,  PLANK_S, PLANK_H, PLANK,   PLANK,   PLANK_H, PLANK_S, PLANK  ],
      [PLANK_H,PLANK,   PLANK_S, PLANK_H, PLANK_H, PLANK_S, PLANK,   PLANK_H],
      [PLANK_D,PLANK_H, PLANK,   PLANK_S, PLANK_S, PLANK,   PLANK_H, PLANK_D],
      [PPOST,  PLANK_D, PLANK_H, PLANK,   PLANK,   PLANK_H, PLANK_D, PPOST  ],
    ], 4);

    registerSpriteTexture('market_stall', [
      [C,     CANOPY_R_H,CANOPY_R,CANOPY_R_H,CANOPY_R,CANOPY_R_H,CANOPY_R,CANOPY_R_H,CANOPY_R,C,     C],
      [C,     CANOPY_R,CANOPY_R_H,CANOPY_R,CANOPY_R_H,CANOPY_R,CANOPY_R_H,CANOPY_R,CANOPY_R_H,C,     C],
      [C,     STALL_W,STALL_W,STALL_W,STALL_W,STALL_W,STALL_W,STALL_W,STALL_W,STALL_W,C],
      [C,     STALL_W,0xFFF8E1,0xFFECB3,STALL_W,0xFFF8E1,0xFFECB3,STALL_W,STALL_W,STALL_W,C],
      [C,     STALL_W,STALL_W,STALL_W,STALL_W,STALL_W,STALL_W,STALL_W,STALL_W,STALL_W,C],
      [C,     C,     STALL_W,C,     STALL_W,C,     STALL_W,C,     C,     C,     C],
    ]);

    registerSpriteTexture('bench', [
      [C,     WAGON_W_H,WAGON_W,WAGON_W_H,WAGON_W,WAGON_W_H,WAGON_W,WAGON_W_H,C],
      [C,     WAGON_W,WAGON_W_H,WAGON_W,WAGON_W_H,WAGON_W,WAGON_W_H,WAGON_W,C],
      [WAGON_W_H,WAGON_W,WAGON_W_H,WAGON_W,WAGON_W_H,WAGON_W,WAGON_W_H,WAGON_W,WAGON_W_H],
      [C,     WAGON_W_H,C,     C,     C,     C,     WAGON_W_H,C],
    ]);

    registerSpriteTexture('bookshelf', [
      [STALL_W,STALL_W,STALL_W,STALL_W,STALL_W,STALL_W,STALL_W,STALL_W],
      [BOOK_H, BOOK,  BOOK_H, BOOK,  BOOK_H, BOOK,  BOOK_H, BOOK],
      [BOOK,   BOOK_H,BOOK,   BOOK_H,BOOK,   BOOK_H,BOOK,   BOOK_H],
      [STALL_W,STALL_W,STALL_W,STALL_W,STALL_W,STALL_W,STALL_W,STALL_W],
      [BOOK_H, BOOK,  BOOK_H, BOOK,  BOOK_H, BOOK,  BOOK_H, BOOK],
      [BOOK,   BOOK_H,BOOK,   BOOK_H,BOOK,   BOOK_H,BOOK,   BOOK_H],
      [STALL_W,STALL_W,STALL_W,STALL_W,STALL_W,STALL_W,STALL_W,STALL_W],
      [BOOK_H, BOOK,  BOOK_H, BOOK,  BOOK_H, BOOK,  BOOK_H, BOOK],
    ]);

    registerSpriteTexture('table', [
      [C,     WAGON_W_H,WAGON_W,WAGON_W_H,WAGON_W,WAGON_W_H,WAGON_W,WAGON_W_H,C],
      [C,     WAGON_W,WAGON_W_H,WAGON_W,WAGON_W_H,WAGON_W,WAGON_W_H,WAGON_W,C],
      [WAGON_W_H,WAGON_W,WAGON_W_H,WAGON_W,WAGON_W_H,WAGON_W,WAGON_W_H,WAGON_W,WAGON_W_H],
      [C,     WAGON_W_H,C,     C,     C,     C,     WAGON_W_H,C],
    ]);

    registerSpriteTexture('counter', [
      [WAGON_W_H,WAGON_W,WAGON_W_H,WAGON_W,WAGON_W_H,WAGON_W,WAGON_W_H,WAGON_W,WAGON_W_H,WAGON_W],
      [WAGON_W,0xFFF8E1,0xFFECB3,0xFFF8E1,0xFFECB3,0xFFF8E1,0xFFECB3,0xFFF8E1,0xFFECB3,WAGON_W],
      [WAGON_W_H,WAGON_W,WAGON_W_H,WAGON_W,WAGON_W_H,WAGON_W,WAGON_W_H,WAGON_W,WAGON_W_H,WAGON_W],
    ]);

    registerSpriteTexture('pot', [
      [C,     CLAY_H,CLAY,  CLAY_H,C],
      [CLAY_H,CLAY,  CLAY_H,CLAY,  CLAY_H],
      [CLAY,  CLAY_H,CLAY,  CLAY_H,CLAY],
      [C,     CLAY_H,CLAY,  CLAY_H,C],
    ]);

    registerSpriteTexture('rug', [
      [RUG_GOLD,RUG_R,  RUG_GOLD,RUG_R,  RUG_GOLD,RUG_R,  RUG_GOLD,RUG_R,  RUG_GOLD],
      [RUG_R,  RUG_G,  RUG_R,  RUG_G,  RUG_R,  RUG_G,  RUG_R,  RUG_G,  RUG_R],
      [RUG_GOLD,RUG_R,  RUG_GOLD,RUG_R,  RUG_GOLD,RUG_R,  RUG_GOLD,RUG_R,  RUG_GOLD],
      [RUG_R,  RUG_G,  RUG_R,  RUG_G,  RUG_R,  RUG_G,  RUG_R,  RUG_G,  RUG_R],
      [RUG_GOLD,RUG_R,  RUG_GOLD,RUG_R,  RUG_GOLD,RUG_R,  RUG_GOLD,RUG_R,  RUG_GOLD],
    ]);

    // === FURNITURE ===
    const BED_FRAME = 0x5D4037;
    const BED_FRAME_H = 0x6D4C41;
    const BED_SHEET = 0xE8EAF6;
    const BED_SHEET_S = 0xC5CAE9;
    const BED_PILLOW = 0xFFF8E1;
    
    registerSpriteTexture('bed', [
      [C,C,BED_FRAME_H,BED_FRAME_H,BED_FRAME_H,BED_FRAME_H,BED_FRAME_H,C,C],
      [C,BED_FRAME,BED_PILLOW,BED_PILLOW,BED_PILLOW,BED_PILLOW,BED_PILLOW,BED_FRAME,C],
      [BED_FRAME_H,BED_FRAME_H,BED_SHEET,BED_SHEET,BED_SHEET,BED_SHEET,BED_SHEET,BED_FRAME_H,BED_FRAME_H],
      [BED_FRAME,BED_FRAME,BED_SHEET_S,BED_SHEET_S,BED_SHEET_S,BED_SHEET_S,BED_SHEET_S,BED_FRAME,BED_FRAME],
      [BED_FRAME,BED_FRAME,BED_SHEET,BED_SHEET,BED_SHEET,BED_SHEET,BED_SHEET,BED_FRAME,BED_FRAME],
      [BED_FRAME_H,BED_FRAME_H,BED_SHEET_S,BED_SHEET_S,BED_SHEET_S,BED_SHEET_S,BED_SHEET_S,BED_FRAME_H,BED_FRAME_H],
    ]);

    const WOOD_D = 0x5D4037;
    const WOOD = 0x6D4C41;
    const WOOD_H = 0x8D6E63;
    
    registerSpriteTexture('wardrobe', [
      [WOOD_D,WOOD_H,WOOD,WOOD_H,WOOD_D,WOOD_H,WOOD,WOOD_H],
      [WOOD,WOOD_H,WOOD_D,WOOD_H,WOOD,WOOD_H,WOOD_D,WOOD_H],
      [WOOD_H,WOOD_D,WOOD,WOOD_H,WOOD_D,WOOD,WOOD_H,WOOD],
      [WOOD,WOOD_H,WOOD_D,WOOD_H,WOOD,WOOD_H,WOOD_D,WOOD_H],
      [WOOD_H,WOOD,WOOD_H,WOOD_D,WOOD_H,WOOD,WOOD_H,WOOD_D],
      [WOOD_D,WOOD_H,WOOD,WOOD_H,WOOD_D,WOOD_H,WOOD,WOOD_H],
    ]);

    const FIRE_B = 0x1A1A1A;
    const FIRE_R = 0xD32F2F;
    const FIRE_O = 0xFF6F00;
    const FIRE_Y = 0xFFEB3B;
    const FIRE_W = 0xFFF59D;
    
    registerSpriteTexture('fireplace', [
      [FIRE_B,FIRE_B,FIRE_B,FIRE_B,FIRE_B,FIRE_B,FIRE_B,FIRE_B,FIRE_B],
      [FIRE_B,FIRE_R,FIRE_O,FIRE_Y,FIRE_W,FIRE_Y,FIRE_O,FIRE_R,FIRE_B],
      [FIRE_B,FIRE_O,FIRE_Y,FIRE_W,FIRE_W,FIRE_W,FIRE_Y,FIRE_O,FIRE_B],
      [FIRE_B,FIRE_R,FIRE_O,FIRE_Y,FIRE_Y,FIRE_Y,FIRE_O,FIRE_R,FIRE_B],
      [FIRE_B,FIRE_B,FIRE_R,FIRE_O,FIRE_R,FIRE_O,FIRE_R,FIRE_B,FIRE_B],
      [FIRE_B,FIRE_B,FIRE_B,FIRE_R,FIRE_R,FIRE_R,FIRE_B,FIRE_B,FIRE_B],
    ]);

    const SWORD_L = 0x78909C;
    const SWORD_H = 0xB0BEC5;
    const AXE_W = 0x5D4037;
    const RACK_W = 0x3E2723;
    
    registerSpriteTexture('weapon_rack', [
      [RACK_W,RACK_W,RACK_W,RACK_W,RACK_W,RACK_W,RACK_W,RACK_W],
      [RACK_W,SWORD_H,SWORD_L,SWORD_L,SWORD_L,SWORD_L,SWORD_H,RACK_W],
      [RACK_W,SWORD_L,SWORD_H,SWORD_L,SWORD_L,SWORD_H,SWORD_L,RACK_W],
      [RACK_W,AXE_W,AXE_W,RACK_W,RACK_W,AXE_W,AXE_W,RACK_W],
      [RACK_W,RACK_W,RACK_W,RACK_W,RACK_W,RACK_W,RACK_W,RACK_W],
    ]);

    const ALCHEMY_B = 0x8D6E63;
    const ALCHEMY_W = 0x4527A0;
    const BOTTLE_G = 0x81C784;
    const BOTTLE_R = 0xE57373;
    
    registerSpriteTexture('alchemy_table', [
      [ALCHEMY_B,ALCHEMY_B,ALCHEMY_B,ALCHEMY_B,ALCHEMY_B,ALCHEMY_B],
      [ALCHEMY_B,BOTTLE_G,BOTTLE_R,BOTTLE_G,C,ALCHEMY_B],
      [ALCHEMY_B,BOTTLE_R,C,BOTTLE_G,BOTTLE_R,ALCHEMY_B],
      [ALCHEMY_W,ALCHEMY_W,ALCHEMY_W,ALCHEMY_W,ALCHEMY_W,ALCHEMY_B],
      [ALCHEMY_W,ALCHEMY_W,ALCHEMY_W,ALCHEMY_W,ALCHEMY_W,ALCHEMY_W],
      [ALCHEMY_B,ALCHEMY_B,ALCHEMY_B,ALCHEMY_B,ALCHEMY_B,ALCHEMY_B],
    ]);

    const CAULDRON = 0x37474F;
    const CAULDRON_H = 0x546E7A;
    const CAULDRON_L = 0x263238;
    const LIQUID_G = 0x4CAF50;
    const LIQUID_B = 0x2E7D32;
    
    registerSpriteTexture('cauldron', [
      [C,CAULDRON_H,CAULDRON,CAULDRON,CAULDRON,CAULDRON_H,C],
      [CAULDRON_H,LIQUID_G,LIQUID_B,LIQUID_G,LIQUID_B,LIQUID_G,CAULDRON_H],
      [CAULDRON,CAULDRON,CAULDRON_H,CAULDRON_H,CAULDRON,CAULDRON,CAULDRON],
      [CAULDRON_L,CAULDRON,CAULDRON_H,CAULDRON_H,CAULDRON,CAULDRON,CAULDRON_L],
      [C,CAULDRON_L,CAULDRON_L,CAULDRON_L,CAULDRON_L,CAULDRON_L,C],
    ]);

    // === ATMOSPHERIC / SOULS-LIKE ===
    const THRONE_G = 0x8D6E63;
    const THRONE_D = 0x3E2723;
    const THRONE_R = 0xB71C1C;
    const THRONE_GOLD = 0xFFD700;
    
    registerSpriteTexture('throne', [
      [THRONE_D,THRONE_GOLD,THRONE_D,THRONE_D,THRONE_D,THRONE_GOLD,THRONE_D],
      [THRONE_D,THRONE_G,THRONE_GOLD,THRONE_GOLD,THRONE_GOLD,THRONE_G,THRONE_D],
      [THRONE_D,THRONE_G,THRONE_R,THRONE_GOLD,THRONE_R,THRONE_G,THRONE_D],
      [THRONE_D,THRONE_G,THRONE_R,THRONE_R,THRONE_R,THRONE_G,THRONE_D],
      [THRONE_D,THRONE_D,THRONE_G,THRONE_G,THRONE_G,THRONE_D,THRONE_D],
      [THRONE_D,THRONE_D,THRONE_G,THRONE_G,THRONE_G,THRONE_D,THRONE_D],
    ]);

    const ALTAR_S = 0x9E9E9E;
    const ALTAR_G = 0x757575;
    const ALTAR_D = 0x424242;
    const ALTAR_B = 0xB71C1C;
    
    registerSpriteTexture('altar', [
      [ALTAR_D,ALTAR_S,ALTAR_S,ALTAR_S,ALTAR_S,ALTAR_D],
      [ALTAR_S,ALTAR_B,ALTAR_S,ALTAR_S,ALTAR_B,ALTAR_S],
      [ALTAR_G,ALTAR_S,ALTAR_S,ALTAR_S,ALTAR_S,ALTAR_G],
      [ALTAR_D,ALTAR_G,ALTAR_G,ALTAR_G,ALTAR_G,ALTAR_D],
      [ALTAR_D,ALTAR_D,ALTAR_D,ALTAR_D,ALTAR_D,ALTAR_D],
    ]);

    // Heresy altar - corrupted shrine, hollow-violet glow, gnarled obelisk profile.
    const HA_STN = 0x2A1F33; // base dark stone with violet undertone
    const HA_MID = 0x3D2A4A; // mid corrupted stone
    const HA_RIM = 0x584068; // lit rim / fractured edge
    const HA_GLW = 0xCC44FF; // violet rune glow (matches hollow corruption palette)
    const HA_CR  = 0x7A1F8C; // crystalline core
    const HA_SHD = 0x140A1E; // deep shadow
    registerSpriteTexture('heresy_altar', [
      [C,      C,      HA_SHD, HA_GLW, HA_SHD, C,      C     ],
      [C,      HA_SHD, HA_CR,  HA_GLW, HA_CR,  HA_SHD, C     ],
      [C,      HA_MID, HA_GLW, HA_CR,  HA_GLW, HA_MID, C     ],
      [HA_SHD, HA_STN, HA_MID, HA_GLW, HA_MID, HA_STN, HA_SHD],
      [HA_SHD, HA_STN, HA_RIM, HA_MID, HA_RIM, HA_STN, HA_SHD],
      [HA_SHD, HA_RIM, HA_STN, HA_STN, HA_STN, HA_RIM, HA_SHD],
      [HA_SHD, HA_RIM, HA_RIM, HA_RIM, HA_RIM, HA_RIM, HA_SHD],
      [HA_SHD, HA_SHD, HA_SHD, HA_SHD, HA_SHD, HA_SHD, HA_SHD],
    ]);

    // Heresy altar - cracked/damaged state after first hit.
    // Same palette; glow dimmed, diagonal crack slashes top-right → bottom-left.
    const HA_CRACK = 0xB090CC; // pale violet crack highlight
    registerSpriteTexture('heresy_altar_cracked', [
      [C,       C,       HA_SHD,  HA_CR,    HA_SHD,  C,       C      ], // tip - glow weakened
      [C,       HA_SHD,  HA_CR,   HA_CRACK, HA_MID,  HA_SHD,  C      ], // crack at col 3
      [C,       HA_MID,  HA_CRACK,HA_MID,   HA_GLW,  HA_MID,  C      ], // crack col 2, glow survives
      [HA_SHD,  HA_CR,   HA_CRACK,HA_MID,   HA_MID,  HA_STN,  HA_SHD], // crack continues
      [HA_SHD,  HA_CRACK,HA_RIM,  HA_MID,   HA_RIM,  HA_STN,  HA_SHD], // crack reaches col 1
      [HA_SHD,  HA_RIM,  HA_STN,  HA_STN,   HA_STN,  HA_RIM,  HA_SHD], // base intact
      [HA_SHD,  HA_RIM,  HA_RIM,  HA_STN,   HA_RIM,  HA_RIM,  HA_SHD], // chip in base
      [HA_SHD,  HA_STN,  HA_SHD,  HA_SHD,   HA_SHD,  HA_SHD,  HA_SHD], // rubble chip
    ]);

    // Summoning ritual glyph - a flattened double-ring heresy sigil on the ground (violet
    // outer ring, teal inner ring, rune ticks, hollow core). Drawn as a wide decal; the
    // RevenantRituals system fires the charge FX + materializes the wraith on top of it.
    const SR_O = 0xCC44FF; // violet outer ring
    const SR_I = 0x40FFEE; // teal inner ring
    const SR_R = 0xB090CC; // pale rune tick
    const SR_K = 0x7A1F8C; // dim core ring
    this.registerTexture('summoning_ritual', () => this.createSpriteTexture([
      [C,    C,    C,    C,    C,    SR_O, SR_O, SR_O, SR_O, SR_O, SR_O, C,    C,    C,    C,    C    ],
      [C,    C,    C,    SR_O, C,    C,    C,    C,    C,    C,    C,    C,    SR_O, C,    C,    C    ],
      [C,    C,    SR_O, C,    C,    SR_R, C,    C,    C,    C,    SR_R, C,    C,    SR_O, C,    C    ],
      [C,    SR_O, C,    C,    SR_I, SR_I, SR_I, C,    C,    SR_I, SR_I, SR_I, C,    C,    SR_O, C    ],
      [C,    SR_O, C,    SR_I, C,    C,    C,    C,    C,    C,    C,    C,    SR_I, C,    SR_O, C    ],
      [SR_O, C,    SR_R, SR_I, C,    C,    SR_K, SR_K, SR_K, SR_K, C,    C,    SR_I, SR_R, C,    SR_O ],
      [SR_O, C,    C,    SR_I, C,    C,    SR_K, C,    C,    SR_K, C,    C,    SR_I, C,    C,    SR_O ],
      [SR_O, C,    SR_R, SR_I, C,    C,    SR_K, C,    C,    SR_K, C,    C,    SR_I, SR_R, C,    SR_O ],
      [SR_O, C,    SR_R, SR_I, C,    C,    SR_K, SR_K, SR_K, SR_K, C,    C,    SR_I, SR_R, C,    SR_O ],
      [C,    SR_O, C,    SR_I, C,    C,    C,    C,    C,    C,    C,    C,    SR_I, C,    SR_O, C    ],
      [C,    SR_O, C,    C,    SR_I, SR_I, SR_I, C,    C,    SR_I, SR_I, SR_I, C,    C,    SR_O, C    ],
      [C,    C,    SR_O, C,    C,    SR_R, C,    C,    C,    C,    SR_R, C,    C,    SR_O, C,    C    ],
      [C,    C,    C,    SR_O, C,    C,    C,    C,    C,    C,    C,    C,    SR_O, C,    C,    C    ],
      [C,    C,    C,    C,    C,    SR_O, SR_O, SR_O, SR_O, SR_O, SR_O, C,    C,    C,    C,    C    ],
      [C,    C,    C,    C,    C,    C,    C,    C,    C,    C,    C,    C,    C,    C,    C,    C    ],
      [C,    C,    C,    C,    C,    C,    C,    C,    C,    C,    C,    C,    C,    C,    C,    C    ],
    ], 4, 'summoning_ritual'));

    // Failed summoning glyph mask - white ring on transparent; World.ts fills with the ash tile texture.
    const DM = 0xFFFFFF;
    this.registerTexture('summoning_ritual_dud', () => this.createSpriteTexture([
      [C,    C,    C,    C,    C,    DM,   DM,   DM,   DM,   DM,   DM,   C,    C,    C,    C,    C    ],
      [C,    C,    C,    DM,   C,    C,    C,    C,    C,    C,    C,    C,    DM,   C,    C,    C    ],
      [C,    C,    DM,   C,    C,    DM,   C,    C,    C,    C,    DM,   C,    C,    DM,   C,    C    ],
      [C,    DM,   C,    C,    DM,   DM,   DM,   C,    C,    DM,   DM,   DM,   C,    C,    DM,   C    ],
      [C,    DM,   C,    DM,   C,    C,    C,    C,    C,    C,    C,    C,    DM,   C,    DM,   C    ],
      [DM,   C,    DM,   DM,   C,    C,    DM,   DM,   DM,   DM,   C,    C,    DM,   DM,   C,    DM   ],
      [DM,   C,    C,    DM,   C,    C,    DM,   C,    C,    DM,   C,    C,    DM,   C,    C,    DM   ],
      [DM,   C,    DM,   DM,   C,    C,    DM,   C,    C,    DM,   C,    C,    DM,   DM,   C,    DM   ],
      [DM,   C,    DM,   DM,   C,    C,    DM,   DM,   DM,   DM,   C,    C,    DM,   DM,   C,    DM   ],
      [C,    DM,   C,    DM,   C,    C,    C,    C,    C,    C,    C,    C,    DM,   C,    DM,   C    ],
      [C,    DM,   C,    C,    DM,   DM,   C,    DM,   DM,   DM,   DM,   C,    C,    DM,   C,    C    ],
      [C,    C,    DM,   C,    C,    DM,   C,    C,    C,    C,    DM,   C,    C,    DM,   C,    C    ],
      [C,    C,    C,    DM,   C,    C,    C,    C,    C,    C,    C,    C,    DM,   C,    C,    C    ],
      [C,    C,    C,    C,    C,    DM,   DM,   DM,   C,    DM,   DM,   DM,   C,    C,    C,    C    ],
      [C,    C,    C,    C,    C,    C,    C,    C,    C,    C,    C,    C,    C,    C,    C,    C    ],
      [C,    C,    C,    C,    C,    C,    C,    C,    C,    C,    C,    C,    C,    C,    C,    C    ],
    ], 4, 'summoning_ritual_dud'));

    // Failed summoning glyph - opaque ash-grey version used only as a minimap/map landmark icon
    // (the in-world tile uses the white mask above as an alphaMap over the ash texture).
    const AD_O = 0x8A7F70; // outer ring (light ash)
    const AD_I = 0x5E564B; // inner lines (mid ash)
    const AD_K = 0x403A32; // dead core (dark ash)
    const AD_R = 0x9B9080; // rune tick (pale ash)
    this.registerTexture('summoning_ritual_dud_icon', () => this.createSpriteTexture([
      [C,    C,    C,    C,    C,    AD_O, AD_O, AD_O, AD_O, AD_O, AD_O, C,    C,    C,    C,    C    ],
      [C,    C,    C,    AD_O, C,    C,    C,    C,    C,    C,    C,    C,    AD_O, C,    C,    C    ],
      [C,    C,    AD_O, C,    C,    AD_R, C,    C,    C,    C,    AD_R, C,    C,    AD_O, C,    C    ],
      [C,    AD_O, C,    C,    AD_I, AD_I, AD_I, C,    C,    AD_I, AD_I, AD_I, C,    C,    AD_O, C    ],
      [C,    AD_O, C,    AD_I, C,    C,    C,    C,    C,    C,    C,    C,    AD_I, C,    AD_O, C    ],
      [AD_O, C,    AD_R, AD_I, C,    C,    AD_K, AD_K, AD_K, AD_K, C,    C,    AD_I, AD_R, C,    AD_O ],
      [AD_O, C,    C,    AD_I, C,    C,    AD_K, C,    C,    AD_K, C,    C,    AD_I, C,    C,    AD_O ],
      [AD_O, C,    AD_R, AD_I, C,    C,    AD_K, C,    C,    AD_K, C,    C,    AD_I, AD_R, C,    AD_O ],
      [AD_O, C,    AD_R, AD_I, C,    C,    AD_K, AD_K, AD_K, AD_K, C,    C,    AD_I, AD_R, C,    AD_O ],
      [C,    AD_O, C,    AD_I, C,    C,    C,    C,    C,    C,    C,    C,    AD_I, C,    AD_O, C    ],
      [C,    AD_O, C,    C,    AD_I, AD_I, AD_I, C,    C,    AD_I, AD_I, AD_I, C,    C,    AD_O, C    ],
      [C,    C,    AD_O, C,    C,    AD_R, C,    C,    C,    C,    AD_R, C,    C,    AD_O, C,    C    ],
      [C,    C,    C,    AD_O, C,    C,    C,    C,    C,    C,    C,    C,    AD_O, C,    C,    C    ],
      [C,    C,    C,    C,    C,    AD_O, AD_O, AD_O, AD_O, AD_O, AD_O, C,    C,    C,    C,    C    ],
      [C,    C,    C,    C,    C,    C,    C,    C,    C,    C,    C,    C,    C,    C,    C,    C    ],
      [C,    C,    C,    C,    C,    C,    C,    C,    C,    C,    C,    C,    C,    C,    C,    C    ],
    ], 4, 'summoning_ritual_dud_icon'));

    // Ritual site props - candles knocked over in a ring around summoning glyphs.
    const RC_W = 0xF5E6C8;
    const RC_F = 0xD84315;
    const RC_M = 0x4E342E;
    const RC_WX = 0x8D6E63;
    registerSpriteTexture('ritual_candle', [
      [C,     C,     RC_M,  RC_M,  C,     C    ],
      [C,     RC_M,  RC_W,  RC_W,  RC_M,  C    ],
      [C,     RC_W,  RC_F,  RC_F,  RC_W,  C    ],
      [C,     RC_W,  RC_F,  RC_F,  RC_W,  C    ],
      [C,     RC_M,  RC_WX, RC_W,  RC_M,  C    ],
      [C,     C,     RC_M,  RC_M,  C,     C    ],
    ], 4);
    registerSpriteTexture('ritual_candle_knocked', [
      [C,     RC_M,  RC_M,  C,     C,     C    ],
      [RC_M,  RC_WX, RC_W,  RC_W,  C,     C    ],
      [C,     RC_W,  RC_F,  RC_F,  RC_W,  C    ],
      [C,     C,     RC_W,  RC_WX, RC_M,  C    ],
      [C,     C,     C,     RC_M,  RC_M,  C    ],
      [C,     C,     C,     C,     C,     C    ],
    ], 4);

    this.registerTexture('bloodstain', () => this.createBloodstainTexture(0, 'bloodstain'));
    for (let variant = 0; variant < 16; variant++) {
      const spriteId = `bloodstain_variant_${variant}`;
      this.registerTexture(spriteId, () => this.createBloodstainTexture(variant, spriteId));
    }

    const CHAIN = 0x616161;
    const CHAIN_H = 0x757575;
    const CHAIN_S = 0x424242;
    
    registerSpriteTexture('chain', [
      [C,CHAIN_H,CHAIN_S,C,C],
      [CHAIN,CHAIN,CHAIN_H,CHAIN_S,C],
      [CHAIN_S,CHAIN_H,CHAIN,CHAIN_H,C],
      [C,CHAIN,CHAIN_S,CHAIN,C],
      [CHAIN_H,CHAIN_S,CHAIN_H,C,C],
      [C,CHAIN,C,C,C],
    ]);

    const LEVER_WOOD = 0xA67C52;
    const LEVER_WOOD_H = 0xD7B388;
    const LEVER_WOOD_S = 0x6D4C41;
    const LEVER_METAL = 0x9E9E9E;
    const LEVER_METAL_H = 0xD7D7D7;
    const LEVER_METAL_S = 0x616161;
    const LEVER_BRASS = 0xE0B11A;
    const LEVER_BRASS_H = 0xFFE082;
    registerSpriteTexture('shortcut_lever', [
      [C,            C,            LEVER_WOOD_S, LEVER_WOOD_S, LEVER_WOOD_S, LEVER_WOOD_S, C,            C],
      [C,            LEVER_WOOD_S, LEVER_WOOD_H, LEVER_WOOD_H, LEVER_WOOD_H, LEVER_WOOD_S, C,            C],
      [C,            LEVER_WOOD_S, LEVER_WOOD,   LEVER_METAL_H,LEVER_WOOD_H, LEVER_WOOD_S, C,            C],
      [C,            LEVER_WOOD_S, LEVER_WOOD_H, LEVER_METAL,  LEVER_BRASS_H,LEVER_BRASS,  C,            C],
      [C,            C,            LEVER_WOOD_S, LEVER_METAL_S,LEVER_METAL,  C,            C,            C],
      [C,            C,            C,            LEVER_WOOD_S, LEVER_WOOD_S, C,            C,            C],
      [C,            C,            C,            LEVER_WOOD_S, LEVER_WOOD_S, C,            C,            C],
      [C,            C,            C,            LEVER_WOOD_S, LEVER_WOOD_S, C,            C,            C],
    ], 4);

    const CAGE = 0x455A64;
    const CAGE_H = 0x90A4AE;
    const CAGE_S = 0x263238;
    const CAGE_B = 0x11171A;
    const CAGE_LOCK = 0xD6A21E;
    
    registerSpriteTexture('cage', [
      [C,      C,      CAGE_S, CAGE,   CAGE,   CAGE,   CAGE,   CAGE_S, C,      C     ],
      [C,      CAGE_S, CAGE_H, CAGE_H, CAGE_H, CAGE_H, CAGE_H, CAGE_H, CAGE_S, C     ],
      [CAGE_S, CAGE_H, CAGE_B, CAGE,   CAGE_B, CAGE_B, CAGE,   CAGE_B, CAGE_H, CAGE_S],
      [CAGE,   CAGE_B, CAGE_B, CAGE,   CAGE_B, CAGE_B, CAGE,   CAGE_B, CAGE_B, CAGE ],
      [CAGE,   CAGE_H, CAGE,   CAGE_H, CAGE,   CAGE,   CAGE_H, CAGE,   CAGE_H, CAGE ],
      [CAGE,   CAGE_B, CAGE_B, CAGE,   CAGE_B, CAGE_B, CAGE,   CAGE_B, CAGE_B, CAGE ],
      [CAGE,   CAGE_B, CAGE_B, CAGE,   CAGE_LOCK,CAGE_B,CAGE,  CAGE_B, CAGE_B, CAGE ],
      [CAGE,   CAGE_H, CAGE,   CAGE_H, CAGE,   CAGE,   CAGE_H, CAGE,   CAGE_H, CAGE ],
      [CAGE_S, CAGE_B, CAGE_B, CAGE,   CAGE_B, CAGE_B, CAGE,   CAGE_B, CAGE_B, CAGE_S],
      [C,      CAGE_S, CAGE_H, CAGE_H, CAGE_H, CAGE_H, CAGE_H, CAGE_H, CAGE_S, C     ],
      [C,      C,      CAGE_S, CAGE_S, C,      C,      CAGE_S, CAGE_S, C,      C     ],
    ], 4);

    const BONE_W = 0xFFF8E1;
    const BONE_M = 0xE6D8B8;
    const BONE_S = 0xBCA88A;
    const BONE_D = 0x6D5A46;
    const SKULL = 0xFFFDE7;
    const SKULL_EYE = 0x3E3328;
    
    registerSpriteTexture('bones_pile', [
      [C,      C,      C,      SKULL,  SKULL,    SKULL,  C,      C,      C,      C     ],
      [C,      C,      SKULL,  SKULL,  SKULL,    SKULL,  SKULL,  C,      C,      C     ],
      [C,      C,      SKULL,  SKULL_EYE,SKULL,  SKULL_EYE,SKULL,C,      C,      C     ],
      [C,      C,      SKULL,  SKULL,  BONE_D,   SKULL,  SKULL,  C,      C,      C     ],
      [C,      BONE_D, BONE_M, BONE_D, SKULL,    BONE_D, BONE_M, BONE_D, C,      C     ],
      [BONE_D, BONE_W, BONE_M, C,      BONE_S,   C,      BONE_M, BONE_W, BONE_D, C     ],
      [C,      C,      BONE_D, BONE_W, BONE_M,   BONE_W, BONE_D, C,      C,      C     ],
      [C,      BONE_D, BONE_M, BONE_W, BONE_D,   BONE_W, BONE_M, BONE_D, C,      C     ],
      [BONE_D, BONE_W, BONE_D, C,      C,        C,      BONE_D, BONE_W, BONE_D, C     ],
    ]);

    // Fallen ranger: top-down lying figure â€” helmet at top, chest armour, cape body, blood pooling at edges.
    // Row order: helmet dome â†’ visor (eye-slits) â†’ wide shoulders â†’ chest â†’ waist/cape â†’ legs â†’ feet/blood.
    const RM_BL = 0x2A0707;  // dried blood darkest
    const RM_BR = 0x5C1010;  // blood dark
    const RM_BH = 0x8B1A1A;  // blood mid
    const RM_CD = 0x0E1F3D;  // cape very dark blue
    const RM_CM = 0x1B355C;  // cape mid blue
    const RM_CH = 0x3568A8;  // cape highlight blue
    const RM_HM = 0x78909C;  // helmet mid gray
    const RM_HS = 0x546E7A;  // helmet shadow
    const RM_HH = 0xB0BEC5;  // helmet highlight (pale blue-gray)
    const RM_VV = 0x1C2529;  // visor slot (near-black)
    const RM_AM = 0x9E9E9E;  // chest armour plate mid (steel gray)
    const RM_AH = 0xC8C8C8;  // chest armour plate highlight
    registerSpriteTexture('ranger_remains', [
      [C,     C,     RM_HS, RM_HM, RM_HH, RM_HM, RM_HS, C,     C    ],  // helmet dome top
      [C,     RM_BH, RM_HS, RM_HH, RM_HH, RM_HH, RM_HS, RM_BH, C    ],  // helmet sides + blood
      [RM_BR, RM_BH, RM_HS, RM_VV, RM_HH, RM_VV, RM_HS, RM_BH, RM_BR],  // visor â€” two dark eye-slits
      [RM_BL, RM_BR, RM_AH, RM_AH, RM_AM, RM_AH, RM_AH, RM_BR, RM_BL],  // wide shoulders â€” steel plate
      [RM_BH, RM_CM, RM_AM, RM_AH, RM_AM, RM_AH, RM_AM, RM_CM, RM_BH],  // chest armour + cape edges
      [C,     RM_CD, RM_CM, RM_CH, RM_AM, RM_CH, RM_CM, RM_CD, C    ],  // waist â€” cape wrapping torso
      [C,     RM_BL, RM_CD, RM_CM, RM_CM, RM_CM, RM_CD, RM_BL, C    ],  // legs / lower cape
      [C,     C,     RM_BL, RM_BR, RM_BH, RM_BR, RM_BL, C,     C    ],  // feet / blood pool
    ]);

    // Fort gate key â€” gold ring bow + iron shaft with two teeth
    // Improved fallen ranger sprite. Registering the same texture key replaces the
    // compact legacy version above with a larger, more human-readable body.
    const RM2_BD = 0x2A0707;
    const RM2_BM = 0x5C1010;
    const RM2_BH = 0x8B1A1A;
    const RM2_CD = 0x0E1F3D;
    const RM2_CM = 0x1B355C;
    const RM2_CH = 0x3568A8;
    const RM2_ST = 0x78909C;
    const RM2_SS = 0x455A64;
    const RM2_SH = 0xB0BEC5;
    const RM2_SK = 0xD7B894;
    const RM2_HR = 0x6D4C41;
    const RM2_DK = 0x1C2529;
    const RM2_BT = 0x3E2723;
    const RM2_KG = 0xFFD54F;
    registerSpriteTexture('ranger_remains', [
      [C,      C,      C,      C,      RM2_BD, RM2_BM, RM2_BM, RM2_BD, C,      C,      C,      C,      C     ],
      [C,      C,      C,      RM2_BD, RM2_BM, RM2_BH, RM2_BH, RM2_BM, RM2_BD, C,      C,      C,      C     ],
      [C,      C,      RM2_BD, RM2_BM, RM2_SH, RM2_ST, RM2_ST, RM2_SH, RM2_BM, RM2_BD, C,      C,      C     ],
      [C,      C,      RM2_BM, RM2_SS, RM2_SH, RM2_SK, RM2_SK, RM2_SH, RM2_SS, RM2_BM, C,      C,      C     ],
      [C,      RM2_BD, RM2_BM, RM2_SS, RM2_HR, RM2_SK, RM2_DK, RM2_SK, RM2_HR, RM2_SS, RM2_BM, C,      C     ],
      [C,      RM2_BM, RM2_CM, RM2_SS, RM2_ST, RM2_SH, RM2_ST, RM2_SS, RM2_CM, RM2_CD, RM2_BH, C,      C     ],
      [RM2_BD, RM2_CM, RM2_CH, RM2_CM, RM2_ST, RM2_SH, RM2_ST, RM2_CM, RM2_CH, RM2_CM, RM2_BM, RM2_BD, C     ],
      [RM2_BM, RM2_CD, RM2_CM, RM2_CH, RM2_ST, RM2_KG, RM2_ST, RM2_CH, RM2_CM, RM2_CD, RM2_BH, RM2_BM, C     ],
      [C,      RM2_BD, RM2_CD, RM2_CM, RM2_CM, RM2_BT, RM2_BT, RM2_CM, RM2_CM, RM2_CD, RM2_BM, C,      C     ],
      [C,      C,      RM2_BM, RM2_BT, RM2_CD, RM2_CM, RM2_CM, RM2_CD, RM2_BT, RM2_BM, C,      C,      C     ],
      [C,      C,      C,      RM2_BT, RM2_BT, C,      C,      RM2_BT, RM2_BT, C,      C,      C,      C     ],
      [C,      C,      C,      C,      RM2_BD, RM2_BM, RM2_BH, RM2_BM, RM2_BD, C,      C,      C,      C     ],
    ], 4);

    // Final ranger corpse pass: the progression corpse keeps a visible key cue,
    // while the alternate kit is non-key battlefield set dressing.
    this.registerTexture('ranger_remains', () => this.createKeyRangerRemains(guardPalette, 'ranger_remains'));
    this.registerTexture('ranger_remains_scattered', () => this.createRangerRemainsFacedownKit(guardPalette, 'ranger_remains_scattered'));

    const FK_GH = 0xFFD54F;  // gold highlight
    const FK_G  = 0xD4AF37;  // gold mid
    const FK_GD = 0x8D7420;  // gold dark
    const FK_SH = 0x90A4AE;  // iron highlight
    const FK_S  = 0x607D8B;  // iron mid
    const FK_SD = 0x37474F;  // iron dark
    registerSpriteTexture('fort_gate_key', [
      // Ring / bow (rows 0-4) â€” hollow oval
      [C,     FK_GH, FK_G,  FK_GD, FK_GD, FK_G,  FK_GH, C   ],
      [FK_GH, FK_G,  C,     C,     C,     C,     FK_G,  C   ],
      [FK_G,  FK_GD, C,     C,     C,     C,     FK_GD, FK_G],
      [FK_GH, FK_G,  C,     C,     C,     C,     FK_G,  C   ],
      [C,     FK_GH, FK_G,  FK_GD, FK_GD, FK_G,  FK_GH, C   ],
      // Shaft (rows 5-11) at columns 3-4
      [C,     C,     C,     FK_SH, FK_SD, C,     C,     C   ],
      [C,     C,     C,     FK_SH, FK_SD, C,     C,     C   ],
      [C,     C,     C,     FK_SH, FK_SD, FK_SH, FK_S,  C   ],  // tooth 1
      [C,     C,     C,     FK_SH, FK_SD, C,     C,     C   ],
      [C,     C,     C,     FK_SH, FK_SD, FK_SH, C,     C   ],  // tooth 2
      [C,     C,     C,     FK_SH, FK_SD, C,     C,     C   ],
      [C,     C,     C,     C,     FK_SD, C,     C,     C   ],  // tip
    ], 4);

    const MAP_PAPER = 0xEAD7A8;
    const MAP_PAPER_H = 0xFFF1C8;
    const MAP_PAPER_S = 0xB99A66;
    const MAP_INK = 0x5B3924;
    const MAP_ROUTE = 0x2D6F87;
    const MAP_SEAL = 0xB33A3A;
    registerSpriteTexture('map', [
      [C,           MAP_PAPER_H, MAP_PAPER_H, MAP_PAPER,   MAP_PAPER,   MAP_PAPER_H, MAP_PAPER_S, C],
      [MAP_PAPER_H, MAP_PAPER,   MAP_INK,     MAP_PAPER,   MAP_ROUTE,   MAP_PAPER,   MAP_PAPER_S, C],
      [MAP_PAPER_H, MAP_PAPER,   MAP_PAPER,   MAP_INK,     MAP_ROUTE,   MAP_PAPER,   MAP_PAPER,   MAP_PAPER_S],
      [MAP_PAPER,   MAP_ROUTE,   MAP_ROUTE,   MAP_PAPER,   MAP_PAPER,   MAP_INK,     MAP_PAPER,   MAP_PAPER_S],
      [MAP_PAPER,   MAP_PAPER,   MAP_ROUTE,   MAP_PAPER,   MAP_SEAL,    MAP_PAPER,   MAP_INK,     MAP_PAPER_S],
      [MAP_PAPER_S, MAP_PAPER,   MAP_PAPER,   MAP_INK,     MAP_PAPER,   MAP_PAPER,   MAP_PAPER,   MAP_PAPER_S],
      [C,           MAP_PAPER_S, MAP_PAPER,   MAP_PAPER,   MAP_PAPER,   MAP_PAPER_S, MAP_PAPER_S, C],
    ], 4);

    const KEY_GH = 0xFFE27A;
    const KEY_G = 0xC9962D;
    const KEY_GD = 0x7A5520;
    const KEY_SH = 0xD7DEE8;
    const KEY_S = 0x8793A3;
    const KEY_SD = 0x4C5667;
    registerSpriteTexture('key', [
      [C,      KEY_GH, KEY_G,  KEY_GD, C,      C,      C,      C],
      [KEY_GH,KEY_G,  C,      KEY_GD, KEY_G,  C,      C,      C],
      [KEY_G, KEY_GD, C,      KEY_G,  KEY_GH, C,      C,      C],
      [C,     KEY_G,  KEY_GD, KEY_GH, KEY_S,  KEY_SH, KEY_S,  C],
      [C,     C,      C,      C,      KEY_SD, KEY_SH, KEY_SD, C],
      [C,     C,      C,      C,      KEY_SD, KEY_SH, KEY_S,  KEY_SH],
      [C,     C,      C,      C,      KEY_SD, KEY_SH, C,      C],
      [C,     C,      C,      C,      C,      KEY_SD, KEY_SH, C],
    ], 4);

    // Small environmental sprites
    const PETAL = 0xF48FB1;
    const PETAL_H = 0xF8BBD0;
    const STEM = 0x388E3C;
    const STEM_S = 0x2E7D32;
    const POLLEN = 0xFFF176;

    registerSpriteTexture('flower', [
      [C,     C,     PETAL_H,PETAL, C,     C],
      [C,     PETAL, POLLEN, POLLEN,PETAL_H,C],
      [PETAL_H,POLLEN,POLLEN,POLLEN,POLLEN,PETAL],
      [C,     PETAL, POLLEN, POLLEN,PETAL, C],
      [C,     C,     STEM,   STEM_S,C,     C],
      [C,     STEM,  STEM_S, STEM,  STEM,  C],
    ], 4);

    // Moonbloom â€” layered indigo / violet / crimson bloom (quest key item)
    const MB_B = 0x303F9F;
    const MB_BH = 0x5C6BC0;
    const MB_P = 0x6A1B9A;
    const MB_PH = 0x9575CD;
    const MB_PL = 0xCE93D8;
    const MB_R = 0xB71C1C;
    const MB_RH = 0xE53935;
    const MB_RC = 0xFF5252;
    const MB_GL = 0xE8EAF6;
    const MB_ST = 0x00897B;
    const MB_SD = 0x004D40;
    registerSpriteTexture('moonbloom', [
      [C,      MB_BH,  MB_PH,  MB_RH,  MB_RH,  MB_PH,  MB_BH,  C],
      [MB_BH,  MB_P,   MB_R,   MB_RC,  MB_RC,  MB_R,   MB_P,   MB_BH],
      [MB_PH,  MB_R,   MB_GL,  MB_RC,  MB_RC,  MB_GL,  MB_R,   MB_PH],
      [MB_RH,  MB_RC,  MB_RC,  MB_PL,  MB_PL,  MB_RC,  MB_RC,  MB_RH],
      [MB_PH,  MB_R,   MB_GL,  MB_RC,  MB_RC,  MB_GL,  MB_R,   MB_PH],
      [MB_B,   MB_PH,  MB_RH,  MB_R,   MB_R,   MB_RH,  MB_PH,  MB_B],
      [C,      MB_ST,  MB_ST,  MB_ST,  MB_ST,  MB_ST,  MB_ST,  C],
      [C,      C,      MB_SD,  MB_ST,  MB_ST,  MB_SD,  C,      C],
    ], 4);

    const HERB = 0x3FAE63;
    const HERB_H = 0x83E48C;
    const HERB_S = 0x1F7A3E;
    const HERB_CORE = 0xB7FF8A;

    registerSpriteTexture('tempest_grass', [
      [C,      C,      HERB_H, C,      HERB_H, C,      C,      C],
      [C,      HERB_H, HERB,   HERB_H, HERB,   HERB_H, C,      C],
      [HERB_H, HERB,   HERB_H, HERB_CORE,HERB_H,HERB,  HERB_H, C],
      [C,      HERB_S, HERB,   HERB_S, HERB,   HERB_S, C,      C],
      [C,      C,      HERB_S, HERB,   HERB_S, C,      C,      C],
      [C,      C,      HERB_S, HERB_S, HERB_S, C,      C,      C],
    ], 4);

    const PAPER = 0xF2E8C9;
    const PAPER_H = 0xFFF7DD;
    const PAPER_S = 0xCDBE96;
    const INK = 0x5D4037;
    const SEAL = 0xDAA520;
    registerSpriteTexture('loose_pages', [
      [C,       C,       PAPER_H, PAPER_H, PAPER_H, PAPER_H, C,       C],
      [C,       PAPER_H, PAPER,   PAPER,   PAPER_H, PAPER_H, PAPER_H, C],
      [PAPER_H, PAPER,   INK,     PAPER,   PAPER,   INK,     PAPER_H, C],
      [PAPER_H, PAPER,   PAPER,   INK,     PAPER,   PAPER,   PAPER_H, C],
      [C,       PAPER_H, PAPER,   PAPER,   PAPER_H, PAPER,   SEAL,    C],
      [C,       C,       PAPER_S, PAPER_H, PAPER,   PAPER_S, C,       C],
    ], 4);
    this.registerTexture('manuscript_fragment', () => {
      const baseTexture = this.getTexture('loose_pages')!;
      const baseUrl = this.textureDataUrls.get('loose_pages');
      if (baseUrl) this.textureDataUrls.set('manuscript_fragment', baseUrl);
      return baseTexture;
    });
    this.registerTexture('hunters_manuscript', () => {
      const baseTexture = this.getTexture('loose_pages')!;
      const baseUrl = this.textureDataUrls.get('loose_pages');
      if (baseUrl) this.textureDataUrls.set('hunters_manuscript', baseUrl);
      return baseTexture;
    });

    // Commander's Evacuation Order - folded dispatch with broken wax seal and a charred corner.
    const EO_P = 0xF2E8C9;
    const EO_PH = 0xFFF7DD;
    const EO_PS = 0xCDBE96;
    const EO_INK = 0x4E342E;
    const EO_CHAR = 0x3E2723;
    const EO_SEAL = 0xB71C1C;
    const EO_SEALH = 0xE53935;
    const EO_SEALS = 0x7F0000;
    registerSpriteTexture('evacuation_order', [
      [C,       C,       EO_CHAR, EO_P,    EO_PH,   EO_P,    C,       C      ],
      [C,       EO_CHAR, EO_P,    EO_INK,  EO_INK,  EO_P,    EO_PS,   C      ],
      [EO_CHAR, EO_P,    EO_INK,  EO_P,    EO_P,    EO_INK,  EO_P,    EO_PS  ],
      [EO_P,    EO_INK,  EO_P,    EO_SEALH,EO_SEAL, EO_P,    EO_INK,  EO_P   ],
      [EO_P,    EO_P,    EO_P,    EO_SEAL, EO_SEALS,EO_P,    EO_P,    EO_P   ],
      [EO_PS,   EO_P,    EO_INK,  EO_P,    EO_P,    EO_INK,  EO_P,    C      ],
      [C,       EO_PS,   EO_P,    EO_P,    EO_INK,  EO_P,    EO_CHAR, C      ],
      [C,       C,       EO_PS,   EO_P,    EO_P,    EO_PS,   C,       C      ],
    ], 4);

    // Blighted Root Shard â€” gnarled dark bark fragment with pulsing green corruption veins
    const BR_BARK  = 0x3E2723;   // dark bark
    const BR_BARK_H = 0x5D4037;  // bark highlight
    const BR_BARK_D = 0x1B0F0A;  // bark deep shadow
    const BR_VEIN  = 0x76FF03;   // corruption vein glow
    const BR_VEIN_D = 0x4CAF50;  // corruption vein dark
    const BR_PULSE = 0xCCFF90;   // bright pulse center
    const BR_THORN = 0x2E1A0E;   // sharp thorn tips
    registerSpriteTexture('blighted_root_shard', [
      [C,        C,        BR_THORN, BR_BARK_H,C,        C,        BR_THORN, C       ],
      [C,        BR_THORN, BR_BARK,  BR_VEIN,  BR_BARK_H,BR_BARK,  BR_BARK_H,C       ],
      [C,        BR_BARK_H,BR_VEIN_D,BR_BARK,  BR_PULSE, BR_BARK,  BR_VEIN,  BR_THORN],
      [BR_THORN, BR_BARK,  BR_BARK_H,BR_VEIN,  BR_BARK,  BR_VEIN_D,BR_BARK,  C       ],
      [C,        BR_BARK_D,BR_VEIN,  BR_BARK,  BR_VEIN,  BR_BARK_H,BR_BARK_D,C       ],
      [C,        BR_BARK,  BR_BARK_D,BR_PULSE, BR_BARK,  BR_VEIN,  BR_BARK,  C       ],
      [C,        C,        BR_BARK,  BR_VEIN_D,BR_BARK_H,BR_BARK_D,C,        C       ],
      [C,        C,        C,        BR_BARK_D,BR_THORN, C,        C,        C       ],
    ], 4);

    // Golem Heart â€” dense stone core with warm amber inner glow, cracked exterior
    const GH_STONE  = 0x757575;  // stone surface
    const GH_STONE_H = 0x9E9E9E; // stone highlight
    const GH_STONE_D = 0x424242; // stone shadow
    const GH_CRACK  = 0x212121;  // deep cracks
    const GH_GLOW   = 0xFF8F00;  // amber glow
    const GH_GLOW_H = 0xFFB300;  // bright glow center
    const GH_PULSE  = 0xFFD54F;  // hottest core
    const GH_EMBER  = 0xE65100;  // deep ember edge
    registerSpriteTexture('golem_heart', [
      [C,         C,         GH_STONE_H,GH_STONE,  GH_STONE,  GH_STONE_H,C,         C        ],
      [C,         GH_STONE_H,GH_STONE,  GH_CRACK,  GH_STONE,  GH_STONE,  GH_STONE_H,C        ],
      [GH_STONE_H,GH_STONE,  GH_GLOW,   GH_GLOW_H, GH_GLOW,   GH_CRACK,  GH_STONE,  GH_STONE_H],
      [GH_STONE,  GH_CRACK,  GH_GLOW_H, GH_PULSE,  GH_PULSE,  GH_GLOW_H, GH_STONE,  GH_STONE  ],
      [GH_STONE,  GH_STONE,  GH_GLOW,   GH_PULSE,  GH_PULSE,  GH_GLOW,   GH_CRACK,  GH_STONE  ],
      [GH_STONE_H,GH_CRACK,  GH_EMBER,  GH_GLOW_H, GH_GLOW,   GH_STONE,  GH_STONE,  GH_STONE_D],
      [C,         GH_STONE,  GH_STONE_D,GH_CRACK,  GH_STONE,  GH_STONE_D,GH_STONE,  C        ],
      [C,         C,         GH_STONE_D,GH_STONE,  GH_STONE,  GH_STONE_D,C,         C        ],
    ], 4);

    // Radiant Vestige â€” a teardrop shard of dawn-light with a violet radiant core threaded through
    // gold facets. The purple ties it to the game's essence/flame motif and makes it instantly
    // recognisable among the warmer steel/stone relics; a bright magenta spark gives it a glint.
    const RV_EDGE  = 0xB26A1E;  // dark amber base edge
    const RV_GOLD  = 0xFFB300;  // gold facet
    const RV_LGOLD = 0xFFD740;  // light gold
    const RV_CORE  = 0xFFF8E1;  // warm near-white core
    const RV_WHITE = 0xFFFFFF;  // white glint
    const RV_PUR   = 0x7C4DFF;  // violet radiance (game theme)
    const RV_PURL  = 0xB388FF;  // light violet
    const RV_PURB  = 0xEA80FC;  // bright magenta spark
    registerSpriteTexture('radiant_vestige', [
      [C,        C,        C,        RV_CORE,  RV_WHITE, C,        C,        C       ],
      [C,        C,        RV_GOLD,  RV_LGOLD, RV_LGOLD, RV_GOLD,  C,        C       ],
      [C,        RV_GOLD,  RV_LGOLD, RV_WHITE, RV_PURL,  RV_LGOLD, RV_GOLD,  C       ],
      [C,        RV_GOLD,  RV_PURL,  RV_CORE,  RV_WHITE, RV_PUR,   RV_GOLD,  C       ],
      [RV_GOLD,  RV_LGOLD, RV_WHITE, RV_PUR,   RV_PURL,  RV_CORE,  RV_LGOLD, RV_GOLD ],
      [C,        RV_GOLD,  RV_LGOLD, RV_PURB,  RV_PUR,   RV_LGOLD, RV_GOLD,  C       ],
      [C,        RV_EDGE,  RV_GOLD,  RV_LGOLD, RV_LGOLD, RV_GOLD,  RV_EDGE,  C       ],
      [C,        C,        RV_EDGE,  RV_GOLD,  RV_GOLD,  RV_EDGE,  C,        C       ],
    ], 4);

    // Tempered Core â€” folded steel ingot with molten seams glowing along the folds.
    const TC_STEEL  = 0x5C6470;  // cool steel
    const TC_STEELH = 0x8A95A3;  // steel highlight
    const TC_STEELD = 0x343A42;  // steel shadow
    const TC_SEAM   = 0xFF6F00;  // glowing fold seam
    const TC_SEAMH  = 0xFFC04D;  // hot seam highlight
    const TC_CORE   = 0xFFE08A;  // hottest core
    registerSpriteTexture('tempered_core', [
      [C,         C,         TC_STEELH, TC_STEEL,  TC_STEEL,  TC_STEELH, C,         C        ],
      [C,         TC_STEELH, TC_STEEL,  TC_SEAM,   TC_STEEL,  TC_STEEL,  TC_STEELH, C        ],
      [TC_STEELH, TC_STEEL,  TC_SEAM,   TC_SEAMH,  TC_SEAM,   TC_STEEL,  TC_STEEL,  TC_STEELH],
      [TC_STEEL,  TC_SEAM,   TC_SEAMH,  TC_CORE,   TC_SEAMH,  TC_SEAM,   TC_STEEL,  TC_STEEL ],
      [TC_STEEL,  TC_STEEL,  TC_SEAM,   TC_SEAMH,  TC_CORE,   TC_SEAMH,  TC_SEAM,   TC_STEEL ],
      [TC_STEELH, TC_STEELD, TC_STEEL,  TC_SEAM,   TC_SEAMH,  TC_SEAM,   TC_STEELD, TC_STEELD],
      [C,         TC_STEEL,  TC_STEELD, TC_STEEL,  TC_SEAM,   TC_STEELD, TC_STEEL,  C        ],
      [C,         C,         TC_STEELD, TC_STEEL,  TC_STEEL,  TC_STEELD, C,         C        ],
    ], 4);

    const HE_DP = 0x4A148C;
    const HE_P  = 0x7C4DFF;
    const HE_LP = 0xB388FF;
    const HE_BC = 0xEA80FC;
    const HE_WC = 0xF3E5F5;
    const HE_SH = 0x311B92;
    // Gravebound Ring - black stone band with faint violet corruption seep.
    const GR_K  = 0x1A1418;
    const GR_KH = 0x2C2429;
    const GR_KS = 0x0E0A0C;
    const GR_E  = 0x4A148C;
    const GR_EH = 0x7C4DFF;

    registerSpriteTexture('gravebound_ring', [
      [C,     C,     GR_KH, GR_K,  GR_K,  GR_KH, C,     C    ],
      [C,     GR_KH, GR_K,  GR_E,  GR_E,  GR_K,  GR_KH, C    ],
      [C,     GR_K,  GR_KS, GR_EH, GR_EH, GR_KS, GR_K,  C    ],
      [GR_KH, GR_K,  GR_K,  GR_KS, GR_KS, GR_K,  GR_K,  GR_KH],
      [C,     GR_KH, GR_K,  GR_K,  GR_K,  GR_KH, C,     C    ],
      [C,     C,     GR_KH, GR_K,  GR_K,  GR_KH, C,     C    ],
    ], 4);

    // Wolf Ring - battered iron band with a stamped wolf head crest.
    const WR_I  = 0x5D4037;
    const WR_IH = 0x8D6E63;
    const WR_IS = 0x3E2723;
    const WR_E  = 0xBCAAA4;
    const WR_W  = 0xD7CCC8;

    registerSpriteTexture('wolf_ring', [
      [C,     C,     WR_IH, WR_I,  WR_I,  WR_IH, C,     C    ],
      [C,     WR_IH, WR_I,  WR_W,  WR_W,  WR_I,  WR_IH, C    ],
      [C,     WR_I,  WR_IS, WR_E,  WR_E,  WR_IS, WR_I,  C    ],
      [WR_IH, WR_I,  WR_I,  WR_IS, WR_IS, WR_I,  WR_I,  WR_IH],
      [C,     WR_IH, WR_I,  WR_I,  WR_I,  WR_IH, C,     C    ],
      [C,     C,     WR_IH, WR_I,  WR_I,  WR_IH, C,     C    ],
    ], 4);

    // Wayfarer Ring - light bronze band with faint teal march chevrons.
    const WF_B  = 0x8D6E63;
    const WF_BH = 0xBCAAA4;
    const WF_BS = 0x5D4037;
    const WF_T  = 0x4DB6AC;
    const WF_TH = 0x80CBC4;

    registerSpriteTexture('wayfarer_ring', [
      [C,     C,     WF_BH, WF_B,  WF_B,  WF_BH, C,     C    ],
      [C,     WF_BH, WF_B,  WF_TH, WF_TH, WF_B,  WF_BH, C    ],
      [C,     WF_B,  WF_BS, WF_T,  WF_T,  WF_BS, WF_B,  C    ],
      [WF_BH, WF_B,  WF_B,  WF_BS, WF_BS, WF_B,  WF_B,  WF_BH],
      [C,     WF_BH, WF_B,  WF_B,  WF_B,  WF_BH, C,     C    ],
      [C,     C,     WF_BH, WF_B,  WF_B,  WF_BH, C,     C    ],
    ], 4);

    registerSpriteTexture('heretical_essence_apparition', [
      [C,      C,      HE_SH,  HE_DP,  HE_DP,  HE_SH,  C,      C     ],
      [C,      HE_SH,  HE_DP,  HE_P,   HE_P,   HE_DP,  HE_SH,  C     ],
      [HE_SH,  HE_DP,  HE_P,   HE_LP,  HE_LP,  HE_P,   HE_DP,  HE_SH ],
      [HE_DP,  HE_P,   HE_LP,  HE_BC,  HE_WC,  HE_LP,  HE_P,   HE_DP ],
      [HE_DP,  HE_P,   HE_LP,  HE_WC,  HE_BC,  HE_LP,  HE_P,   HE_DP ],
      [HE_SH,  HE_DP,  HE_P,   HE_LP,  HE_LP,  HE_P,   HE_DP,  HE_SH ],
      [C,      HE_SH,  HE_DP,  HE_P,   HE_P,   HE_DP,  HE_SH,  C     ],
      [C,      C,      HE_SH,  HE_DP,  HE_DP,  HE_SH,  C,      C     ],
    ], 4);

    registerSpriteTexture('mushroom', [
      [C,        C,        0xE53935,0xEF5350,0xE53935,0xEF5350,C,       C],
      [C,        0xE53935, 0xFFFFFF,0xE53935,0xE53935,0xFFFFFF, 0xE53935,C],
      [0xE53935, 0xE53935, 0xE53935,0xEF5350,0xE53935,0xE53935, 0xE53935,0xE53935],
      [C,        C,        C,       0xFFE0B2, 0xFFCC80,C,      C,       C],
      [C,        C,        C,       0xFFCC80,0xFFE0B2,C,       C,       C],
    ]);

    const SIGN_WOOD = 0xC29A6B;
    const SIGN_WOOD_H = 0xE6C79C;
    const SIGN_WOOD_S = 0x8D6E63;
    const SIGN_POST = 0x4E342E;
    const SIGN_BORDER = 0x6D4C41;
    const SIGN_FACE = 0xF3E0B8;
    registerSpriteTexture('sign', [
      [C,         C,         SIGN_BORDER,SIGN_BORDER,SIGN_BORDER,SIGN_BORDER,SIGN_BORDER,SIGN_BORDER,C,          C],
      [C,         C,         SIGN_BORDER,SIGN_FACE,SIGN_FACE,SIGN_FACE,SIGN_FACE,SIGN_BORDER,C,          C],
      [C,         C,         SIGN_BORDER,SIGN_WOOD,SIGN_WOOD_H,SIGN_WOOD,SIGN_WOOD,SIGN_BORDER,C,       C],
      [C,         C,         SIGN_BORDER,SIGN_FACE,SIGN_WOOD_H,SIGN_FACE,SIGN_FACE,SIGN_BORDER,C,       C],
      [C,         C,         C,         C,         SIGN_POST,SIGN_POST,C,         C,          C,          C],
      [C,         C,         C,         C,         SIGN_POST,SIGN_POST,C,         C,          C,          C],
      [C,         C,         C,         C,         SIGN_POST,SIGN_POST,C,         C,          C,          C],
    ]);

    // Broken sign: snapped post, hanging board at an angle
    registerSpriteTexture('broken_sign', [
      [C,         C,         C,         C,         C,         C,         C,         C,         C,         C],
      [C,         C,         C,         SIGN_BORDER,SIGN_BORDER,SIGN_BORDER,C,        C,         C,         C],
      [C,         C,         SIGN_BORDER,SIGN_FACE,SIGN_WOOD_S,SIGN_BORDER,C,        C,         C,         C],
      [C,         C,         SIGN_BORDER,SIGN_WOOD_S,SIGN_FACE,SIGN_BORDER,C,        C,         C,         C],
      [C,         C,         C,         C,         SIGN_POST,C,         C,         C,          C,         C],
      [C,         C,         C,         C,         SIGN_POST,C,         C,         C,          C,         C],
      [C,         C,         C,         SIGN_POST,C,         C,         C,         C,          C,         C],
    ]);

    registerSpriteTexture('well', [
      [C,          C,          0x795548,0x795548, 0x795548,0x795548, 0x795548,0x795548,C,          C],
      [C,          0x795548,  C,        C,         0x795548,C,        C,         0x795548,C,          C],
      [C,          0x78909C, 0x78909C,0x546E7A,0x1E88E5,0x546E7A,0x78909C,0x78909C,C, C],
      [C,          0x546E7A,0x78909C,0x1E88E5,0x1E88E5,0x1E88E5,0x78909C,0x546E7A,C,  C],
      [C,          C,          0x546E7A,0x78909C,0x78909C,0x78909C,0x546E7A,C,C,          C],
    ]);

    registerSpriteTexture('campfire', [
      [C,     C,     C,     0xFFEB3B,0xFFEB3B,C,     C,     C],
      [C,     C,     0xFF9800,0xFFEB3B,0xFF9800,0xFF9800,C,     C],
      [C,     0xFF5722,0xFF9800,0xFFEB3B,0xFFEB3B,0xFF9800,0xFF5722,C],
      [C,     0xFF5722,0xFF5722,0xFF9800,0xFF9800,0xFF5722,0xFF5722,C],
      [0x5D4037,0x5D4037,0xFF5722,0xFF5722,0xFF5722,0xFF5722,0x5D4037,0x5D4037],
      [C,     0x5D4037,0x5D4037,0x5D4037,0x5D4037,0x5D4037,0x5D4037,C],
    ]);

    // Stomped-out campfire remains - ash, scattered logs, and a last thread of smoke.
    registerSpriteTexture('campfire_remains', [
      [C,     C,     C,     0x8A8A8A,C,     C,     C,     C],
      [C,     C,     0x6F6F6F,C,     C,     0x9E9E9E,C,     C],
      [C,     0x3E2723,0x4E342E,0x5D4037,0x424242,0x4E342E,0x3E2723,C],
      [0x2B1B17,0x4E342E,0x212121,0x303030,0x303030,0x212121,0x4E342E,0x2B1B17],
      [C,     0x5D4037,0x303030,0x4A4A4A,0x4A4A4A,0x303030,0x5D4037,C],
      [C,     C,     0x2B1B17,0x3E2723,0x3E2723,0x2B1B17,C,     C],
    ]);

    // Bonfire (unlit) â€” cold wood pile with faint embers, no flame
    registerSpriteTexture('bonfire_unlit', [
      [C,     C,     C,     0x4E342E,C,     C,     C,     C],
      [C,     0x5D4037,0x4E342E,0x3E2723,0x4E342E,0x5D4037,C,     C],
      [C,     0x3E2723,0x5D4037,0x4E342E,0x3E2723,0x5D4037,0x3E2723,C],
      [0x4E342E,0x5D4037,0x795548,0x5D4037,0x5D4037,0x795548,0x5D4037,0x4E342E],
      [0x3E2723,0x4E342E,0x5D4037,0x795548,0x795548,0x5D4037,0x4E342E,0x3E2723],
      [C,     0x3E2723,0x4E342E,0x4E342E,0x4E342E,0x4E342E,0x3E2723,C],
    ]);

    // Bonfire â€” taller violet/white flame (rest checkpoint)
    registerSpriteTexture('bonfire', [
      [C,     C,     0xE1BEE7,0xFFFFFF,0xE1BEE7,C,     C,     C],
      [C,     0xBA68C8,0xFFFFFF,0xFFD54F,0xFFFFFF,0xBA68C8,C,     C],
      [C,     0x7B1FA2,0xE1BEE7,0xFFD54F,0xFFD54F,0xE1BEE7,0x7B1FA2,C],
      [0x4E342E,0x5D4037,0xFF6F00,0xFF9800,0xFF9800,0xFF6F00,0x5D4037,0x4E342E],
      [0x3E2723,0x4E342E,0x5D4037,0xFF5722,0xFF5722,0x5D4037,0x4E342E,0x3E2723],
      [C,     0x3E2723,0x4E342E,0x4E342E,0x4E342E,0x4E342E,0x3E2723,C],
    ]);

    // Dropped essence bloodstain orb (world pickup)
    registerSpriteTexture('essence_drop', [
      [C,     C,     0x4A148C,0xCE93D8,0x4A148C,C,     C],
      [C,     0x7B1FA2,0xE1BEE7,0xFFFFFF,0xE1BEE7,0x7B1FA2,C],
      [0x6A1B9A,0xCE93D8,0xFFFFFF,0xFFD54F,0xFFFFFF,0xCE93D8,0x6A1B9A],
      [C,     0x7B1FA2,0xE1BEE7,0xFFFFFF,0xE1BEE7,0x7B1FA2,C],
      [C,     C,     0x4A148C,0xCE93D8,0x4A148C,C,     C],
    ]);

    // Tombstone â€” rounded top, etched cross in center body, narrow base.
    // Cross: vertical = rows 2-4 at cols 3-4; horizontal = row 3 at cols 2-5.
    const TS_H = 0x9E9E9E;   // stone highlight
    const TS_M = 0x757575;   // stone mid
    const TS_D = 0x616161;   // stone dark
    const TS_C = 0xBBBBBB;   // etched cross (lighter, worn-pale carving)
    registerSpriteTexture('tombstone', [
      [C,     C,     TS_H,  TS_H,  TS_H,  TS_H,  C,     C    ],  // rounded top
      [C,     TS_M,  TS_M,  TS_M,  TS_M,  TS_M,  TS_M,  C    ],  // upper body
      [C,     TS_D,  TS_D,  TS_C,  TS_C,  TS_D,  TS_D,  C    ],  // cross â€” vertical arm (top)
      [C,     TS_D,  TS_C,  TS_C,  TS_C,  TS_C,  TS_D,  C    ],  // cross â€” horizontal arm
      [C,     TS_D,  TS_D,  TS_C,  TS_C,  TS_D,  TS_D,  C    ],  // cross â€” vertical arm (bottom)
      [C,     C,     TS_D,  TS_D,  TS_D,  TS_D,  C,     C    ],  // base
    ]);

    // Cracked horizontal â€” snapped at row 3, top half gone, only base remains.
    // Same palette as the intact tombstone; the upper rows are cleared to transparent.
    const TK = 0x4E4E4E; // dark crack / break edge
    registerSpriteTexture('tombstone_broken', [
      [C,     C,     C,     C,     C,     C,     C,     C    ],  // top gone
      [C,     C,     C,     C,     C,     C,     C,     C    ],  // top gone
      [C,     C,     TK,    TS_H,  TK,    TS_M,  C,     C    ],  // jagged break line
      [C,     TS_D,  TS_C,  TS_C,  TS_C,  TS_C,  TS_D,  C    ],  // cross horizontal (surviving)
      [C,     TS_D,  TS_D,  TS_C,  TS_C,  TS_D,  TS_D,  C    ],  // cross vertical arm (bottom)
      [C,     C,     TS_D,  TS_D,  TS_D,  TS_D,  C,     C    ],  // base
    ]);

    // Cracked vertical â€” crack runs ~60/40 down the center, fading out at row 4.
    registerSpriteTexture('tombstone_cracked_v', [
      [C,     C,     TS_H,  TS_H,  TK,    TS_H,  C,     C    ],  // crack starts at col 4
      [C,     TS_M,  TS_M,  TS_M,  TK,    TS_M,  TS_M,  C    ],  // crack continues
      [C,     TS_D,  TS_D,  TS_C,  TK,    TS_D,  TS_D,  C    ],  // crack through cross
      [C,     TS_D,  TS_C,  TS_C,  TS_C,  TS_C,  TS_D,  C    ],  // crack fades out here
      [C,     TS_D,  TS_D,  TS_C,  TS_C,  TS_D,  TS_D,  C    ],  // intact lower
      [C,     C,     TS_D,  TS_D,  TS_D,  TS_D,  C,     C    ],  // base
    ]);

    const BASE_STUMP = [
      [C,        0xBCAAA4, 0x795548, 0xBCAAA4, 0x795548, 0xBCAAA4, C      ],
      [0x795548, 0xBCAAA4, 0x5D4037, 0xBCAAA4, 0x5D4037, 0xBCAAA4, 0x795548],
      [0x5D4037, 0x795548, 0x5D4037, 0x795548, 0x5D4037, 0x795548, 0x5D4037],
      [C,        0x5D4037, 0x5D4037, 0x5D4037, 0x5D4037, 0x5D4037, C      ],
    ] as const;
    registerSpriteTexture('stump', BASE_STUMP);
    this.registerTexture('stump_b', () => this.createStumpVariantTexture(BASE_STUMP, 1));
    this.registerTexture('stump_c', () => this.createStumpVariantTexture(BASE_STUMP, 2));

    // Fallen log - base sprite extracted for variant generator.
    // 11 cols × 17 rows → horizontal trunk with branch stubs up (rows 4-5) and down (row 11).
    const BASE_FALLEN_LOG = [
      [C,       C,       C,       C,       C,       C,       C,       C,       C,       C,       C      ],  // row 0
      [C,       C,       C,       C,       C,       C,       C,       C,       C,       C,       C      ],  // row 1
      [C,       C,       C,       C,       C,       C,       C,       C,       C,       C,       C      ],  // row 2
      [C,       C,       C,       C,       C,       C,       C,       C,       C,       C,       C      ],  // row 3
      [C,       TRUNK,   C,       C,       TRUNK,   C,       C,       TRUNK,   C,       C,       C      ],  // row 4  – branch tips up
      [TRUNK,   TRUNK_S, C,       TRUNK,   TRUNK_S, C,       TRUNK,   TRUNK_S, C,       TRUNK,   C      ],  // row 5  – branch stubs up
      [C,       TRUNK,   TRUNK,   TRUNK_S, TRUNK,   TRUNK,   TRUNK_S, TRUNK,   TRUNK,   TRUNK_S, TRUNK  ],  // row 6  – branches join + start trunk
      [TRUNK,   TRUNK,   TRUNK,   TRUNK,   TRUNK,   TRUNK,   TRUNK,   TRUNK,   TRUNK,   TRUNK,   TRUNK  ],  // row 7  – top of trunk (lit)
      [TRUNK,   TRUNK_S, TRUNK,   TRUNK_S, TRUNK,   TRUNK_S, TRUNK,   TRUNK_S, TRUNK,   TRUNK_S, TRUNK  ],  // row 8  – bark grain
      [TRUNK_S, TRUNK,   TRUNK_S, TRUNK,   TRUNK_S, TRUNK,   TRUNK_S, TRUNK,   TRUNK_S, TRUNK,   TRUNK_S],  // row 9  – bark grain
      [TRUNK_S, TRUNK_S, TRUNK_S, TRUNK_S, TRUNK_S, TRUNK_S, TRUNK_S, TRUNK_S, TRUNK_S, TRUNK_S, TRUNK_S],  // row 10 – bottom of trunk (shadow)
      [C,       C,       TRUNK_S, C,       C,       TRUNK_S, C,       C,       TRUNK_S, C,       C      ],  // row 11 – branch stubs down
      [C,       C,       C,       C,       C,       C,       C,       C,       C,       C,       C      ],  // row 12
      [C,       C,       C,       C,       C,       C,       C,       C,       C,       C,       C      ],  // row 13
      [C,       C,       C,       C,       C,       C,       C,       C,       C,       C,       C      ],  // row 14
      [C,       C,       C,       C,       C,       C,       C,       C,       C,       C,       C      ],  // row 15
      [C,       C,       C,       C,       C,       C,       C,       C,       C,       C,       C      ],  // row 16
    ] as const;
    registerSpriteTexture('fallen_log', BASE_FALLEN_LOG);
    this.registerTexture('fallen_log_b', () => this.createFallenLogVariantTexture(BASE_FALLEN_LOG, 1));

    // Fallen log (vertical) - 17 cols × 11 rows.
    const BASE_FALLEN_LOG_V = [
      [C, C, C, C, C,       C,       TRUNK,   TRUNK,   TRUNK,   TRUNK_S, TRUNK_S, C,       C, C, C, C, C],  // row 0
      [C, C, C, C, C,       TRUNK,   TRUNK_S, TRUNK_S, TRUNK,   TRUNK,   TRUNK_S, C,       C, C, C, C, C],  // row 1
      [C, C, C, C, C,       C,       TRUNK,   TRUNK,   TRUNK,   TRUNK_S, TRUNK_S, TRUNK_S, C, C, C, C, C],  // row 2
      [C, C, C, C, TRUNK,   TRUNK_S, TRUNK,   TRUNK,   TRUNK_S, TRUNK,   TRUNK_S, C,       C, C, C, C, C],  // row 3
      [C, C, C, C, C,       TRUNK,   TRUNK_S, TRUNK,   TRUNK,   TRUNK_S, TRUNK_S, C,       C, C, C, C, C],  // row 4
      [C, C, C, C, C,       C,       TRUNK,   TRUNK,   TRUNK_S, TRUNK,   TRUNK_S, TRUNK_S, C, C, C, C, C],  // row 5
      [C, C, C, C, TRUNK,   TRUNK_S, TRUNK,   TRUNK,   TRUNK,   TRUNK_S, TRUNK_S, C,       C, C, C, C, C],  // row 6
      [C, C, C, C, C,       TRUNK,   TRUNK_S, TRUNK,   TRUNK,   TRUNK,   TRUNK_S, C,       C, C, C, C, C],  // row 7
      [C, C, C, C, C,       C,       TRUNK,   TRUNK,   TRUNK,   TRUNK_S, TRUNK_S, TRUNK_S, C, C, C, C, C],  // row 8
      [C, C, C, C, TRUNK,   TRUNK_S, TRUNK,   TRUNK,   TRUNK_S, TRUNK,   TRUNK_S, C,       C, C, C, C, C],  // row 9
      [C, C, C, C, C,       TRUNK,   C,       TRUNK,   TRUNK,   TRUNK_S, TRUNK_S, C,       C, C, C, C, C],  // row 10
    ] as const;
    registerSpriteTexture('fallen_log_v', BASE_FALLEN_LOG_V);
    this.registerTexture('fallen_log_v_b', () => this.createFallenLogVariantTexture(BASE_FALLEN_LOG_V, 1));

    // loose_plank — a bundle of 3 sawn bridge-construction planks viewed top-down.
    // Uses the same warm-oak palette as the bridge tile so it reads as building material,
    // not organic forest debris.  Appears at the broken west lake bridge gap as an
    // interact tease; replaced by bridge tiles once the crossing is extended.
    {
      const C   = 0x00000000;
      const PE  = 0xD4A060;  // cut end / cross-section face (warm, light)
      const PL  = 0xC49050;  // plank highlight (sunlit oak, matches bridge BR_PL)
      const PM  = 0x9B6A35;  // plank mid-tone  (matches bridge BR_PM)
      const PD  = 0x6B4220;  // plank shadow    (matches bridge BR_PD)
      const GP  = 0x22110A;  // gap between planks (matches bridge BR_GP)
      const KN  = 0x7A5228;  // wood knot / grain mark
      // 18 columns × 7 rows, cellSize=3 → 54×21 px canvas (~2.6:1 aspect ratio).
      // With widthScale:2.5, scale:0.65 the overlay renders at 1.625 tiles wide × 0.65 tiles tall,
      // so the content strip (rows 1-5, ~71% of height) appears at roughly 1.625:0.46 ≈ 3.5:1 — genuine plank.
      // PE on col 0 is the cross-section cut end; grain lines run full width.
      registerSpriteTexture('loose_plank', [
        //      0    1    2    3    4    5    6    7    8    9   10   11   12   13   14   15   16   17
        [C,   C,   C,   C,   C,   C,   C,   C,   C,   C,   C,   C,   C,   C,   C,   C,   C,   C  ],  // top clearance
        [PE,  PL,  PM,  PL,  PM,  PM,  PL,  KN,  PM,  PL,  PM,  PM,  PL,  PM,  PM,  PL,  PD,  C  ],  // plank 1 — lit face
        [PE,  PM,  PD,  PM,  PD,  KN,  PM,  PD,  PM,  PD,  PM,  PD,  PM,  PD,  KN,  PM,  PD,  C  ],  // plank 1 — shadow/grain
        [GP,  GP,  GP,  GP,  GP,  GP,  GP,  GP,  GP,  GP,  GP,  GP,  GP,  GP,  GP,  GP,  GP,  GP ],  // gap
        [PE,  PL,  PM,  PM,  PL,  PM,  KN,  PM,  PL,  PM,  PD,  PM,  PL,  PM,  PM,  PM,  PD,  C  ],  // plank 2 — lit face
        [PE,  PM,  PD,  PM,  PD,  PM,  PD,  KN,  PM,  PD,  PM,  PD,  PM,  PD,  PM,  PD,  PD,  C  ],  // plank 2 — shadow/grain
        [C,   C,   C,   C,   C,   C,   C,   C,   C,   C,   C,   C,   C,   C,   C,   C,   C,   C  ],  // bottom clearance
      ], 3);
    }

    // plank_pile — a disorganised bundle of 3 planks of varying lengths viewed top-down.
    // Sits as a static decorative prop on the bridge edge beside the interactable loose_plank.
    // Same warm-oak palette; planks are staggered in width and horizontal position to read as "pile".
    {
      const C   = 0x00000000;
      const PE  = 0xD4A060;  // cut end face
      const PL  = 0xC49050;  // plank highlight
      const PM  = 0x9B6A35;  // plank mid
      const PD  = 0x6B4220;  // plank shadow
      const GP  = 0x22110A;  // gap / shadow between planks
      const KN  = 0x7A5228;  // knot
      // 14 cols × 12 rows, cellSize=3 → 42×36 px.  Three planks:
      //   top:    short stub  (cols 2–7,   rows 1–2)
      //   middle: long plank  (cols 0–12,  rows 4–5)
      //   bottom: medium plank(cols 1–9,   rows 7–8)
      registerSpriteTexture('plank_pile', [
        //      0    1    2    3    4    5    6    7    8    9   10   11   12   13
        [C,   C,   C,   C,   C,   C,   C,   C,   C,   C,   C,   C,   C,   C  ],  // clearance
        [C,   C,   PE,  PL,  PM,  KN,  PM,  PD,  C,   C,   C,   C,   C,   C  ],  // stub — lit face
        [C,   C,   PE,  PM,  PD,  PM,  PD,  PD,  C,   C,   C,   C,   C,   C  ],  // stub — shadow
        [GP,  GP,  GP,  GP,  GP,  GP,  GP,  GP,  GP,  GP,  GP,  GP,  GP,  C  ],  // gap (full-ish)
        [PE,  PL,  PM,  PL,  KN,  PM,  PL,  PM,  PL,  PM,  PD,  PM,  PD,  C  ],  // long — lit face
        [PE,  PM,  PD,  PM,  PD,  PM,  PD,  KN,  PM,  PD,  PM,  PD,  PD,  C  ],  // long — shadow
        [C,   GP,  GP,  GP,  GP,  GP,  GP,  GP,  GP,  GP,  GP,  C,   C,   C  ],  // gap (shorter)
        [C,   PE,  PL,  PM,  PL,  PM,  KN,  PM,  PL,  PD,  C,   C,   C,   C  ],  // medium — lit face
        [C,   PE,  PM,  PD,  PM,  PD,  PM,  PD,  PM,  PD,  C,   C,   C,   C  ],  // medium — shadow
        [C,   C,   C,   C,   C,   C,   C,   C,   C,   C,   C,   C,   C,   C  ],  // clearance
        [C,   C,   C,   C,   C,   C,   C,   C,   C,   C,   C,   C,   C,   C  ],  // clearance
        [C,   C,   C,   C,   C,   C,   C,   C,   C,   C,   C,   C,   C,   C  ],  // clearance
      ], 3);
    }

    // plank_crossing — single long plank used as the extended west-lake-bridge shortcut crossing.
    // Same sprite as loose_plank; TILE_METADATA gives it widthScale:4.8 so one center tile spans
    // the full 3-tile gap visually.  Bridge renders beneath it via baseTile:'bridge' in metadata.
    this.registerTexture('plank_crossing', () => this.getTexture('loose_plank')!);

    // Ridge lumberyard remains - run-down log shed: gabled roof, plank walls, dark doorway, woodpiles.
    const LY_B = 0x5D4037;   // log bark
    const LY_BD = 0x3E2723;  // dark bark / plank gap
    const LY_E = 0xCBB89E;   // log cut-end (light)
    const LY_ER = 0x9C8468;  // log end ring
    const LY_P = 0x8D6E63;   // wall plank
    const LY_PH = 0xA1887F;  // plank highlight
    const LY_PO = 0x4E342E;  // corner post / frame
    const LY_RO = 0x7B4A2A;  // roof shingle
    const LY_RH = 0xA66A3F;  // roof highlight
    const LY_RD = 0x4E2E1A;  // roof shadow / eave
    const LY_DR = 0x241A12;  // doorway / window void
    const LY_M = 0x6B8E3A;   // moss
    registerSpriteTexture('ridge_lumberyard', [
      // 20x20 - run-down log shed: caved-in gabled roof, plank walls, woodpiles wrapping every side
      [C,    LY_B, LY_ER,C,    C,    C,    C,    C,    C,    C,    C,    C,    C,    C,    C,    C,    C,    LY_ER,LY_B, C    ],
      [LY_B, LY_ER,LY_E, C,    C,    C,    C,    C,    C,    LY_RD,LY_RD,C,    C,    C,    C,    C,    C,    LY_E, LY_ER,LY_B ],
      [LY_ER,LY_E, LY_ER,C,    C,    C,    C,    C,    LY_RD,LY_DR,LY_DR,LY_RD,C,    C,    C,    C,    C,    LY_ER,LY_E, LY_ER],
      [LY_B, LY_ER,LY_E, C,    C,    C,    C,    LY_RD,LY_RO,LY_DR,LY_DR,LY_RO,LY_RD,C,    C,    C,    C,    LY_E, LY_ER,LY_B ],
      [LY_ER,LY_E, LY_ER,C,    C,    C,    LY_RD,LY_RO,LY_RO,LY_DR,LY_DR,LY_RO,LY_RO,LY_RD,C,    C,    C,    LY_ER,LY_E, LY_ER],
      [LY_B, LY_ER,LY_E, C,    C,    LY_RD,LY_RO,LY_RO,LY_RO,LY_DR,LY_PO,LY_RO,LY_RO,LY_RO,LY_RD,C,    C,    LY_E, LY_ER,LY_B ],
      [LY_ER,LY_E, LY_ER,C,    LY_RD,LY_RO,LY_RO,LY_RO,LY_RH,LY_DR,LY_DR,LY_RO,LY_RO,LY_RO,LY_RO,LY_RD,C,    LY_ER,LY_E, LY_ER],
      [LY_B, LY_ER,LY_E, LY_RD,LY_RO,LY_RO,LY_RO,LY_RO,LY_PO,LY_DR,LY_DR,LY_PO,LY_RO,LY_RO,LY_RO,LY_RO,LY_RD,LY_E, LY_ER,LY_B ],
      // plank walls with collapsed front (interior void shows through)
      [LY_ER,LY_E, LY_ER,LY_PO,LY_P, LY_P, LY_PH,LY_P, LY_DR,LY_DR,LY_DR,LY_DR,LY_P, LY_PH,LY_P, LY_P, LY_PO,LY_ER,LY_E, LY_ER],
      [LY_B, LY_ER,LY_E, LY_PO,LY_P, LY_PH,LY_P, LY_P, LY_DR,LY_DR,LY_DR,LY_DR,LY_P, LY_P, LY_PH,LY_P, LY_PO,LY_E, LY_ER,LY_B ],
      [LY_ER,LY_E, LY_ER,LY_PO,LY_P, LY_P, LY_P, LY_P, LY_P, LY_DR,LY_DR,LY_P, LY_P, LY_P, LY_P, LY_P, LY_PO,LY_ER,LY_E, LY_ER],
      [LY_B, LY_ER,LY_E, LY_PO,LY_PH,LY_P, LY_P, LY_DR,LY_P, LY_P, LY_P, LY_P, LY_DR,LY_P, LY_P, LY_PH,LY_PO,LY_E, LY_ER,LY_B ],
      [LY_ER,LY_E, LY_ER,LY_PO,LY_P, LY_P, LY_P, LY_P, LY_P, LY_P, LY_P, LY_P, LY_P, LY_P, LY_P, LY_P, LY_PO,LY_ER,LY_E, LY_ER],
      [LY_B, LY_ER,LY_E, LY_PO,LY_P, LY_PH,LY_P, LY_P, LY_P, LY_P, LY_P, LY_P, LY_P, LY_P, LY_PH,LY_P, LY_PO,LY_E, LY_ER,LY_B ],
      [LY_ER,LY_E, LY_ER,LY_PO,LY_P, LY_P, LY_P, LY_P, LY_M, LY_P, LY_P, LY_M, LY_P, LY_P, LY_P, LY_P, LY_PO,LY_ER,LY_E, LY_ER],
      [LY_B, LY_ER,LY_E, LY_BD,LY_P, LY_P, LY_P, LY_P, LY_P, LY_P, LY_P, LY_P, LY_P, LY_P, LY_P, LY_BD,LY_E, LY_ER,LY_B, C    ],
      // woodpiles wrapping the base - round log cut-ends
      [LY_ER,LY_E, LY_ER,LY_B, LY_ER,LY_B, LY_ER,LY_B, LY_ER,LY_B, LY_ER,LY_B, LY_ER,LY_B, LY_ER,LY_B, LY_ER,LY_E, LY_ER,C    ],
      [LY_B, LY_ER,LY_E, LY_E, LY_ER,LY_E, LY_ER,LY_E, LY_ER,LY_E, LY_ER,LY_E, LY_ER,LY_E, LY_ER,LY_E, LY_ER,LY_ER,LY_E, LY_B ],
      [LY_ER,LY_E, LY_ER,LY_B, LY_ER,LY_M, LY_ER,LY_B, LY_ER,LY_B, LY_M, LY_B, LY_ER,LY_B, LY_ER,LY_M, LY_ER,LY_E, LY_ER,C    ],
      [C,    LY_ER,LY_E, LY_ER,C,    LY_ER,LY_E, LY_ER,C,    LY_ER,LY_E, LY_ER,C,    LY_ER,LY_E, LY_ER,C,    LY_ER,LY_E, C    ],
    ]);

    // ==== STONE QUARRY ASSET SET ==========================================
    // Shared cut-stone + timber + iron palette so every quarry prop reads as one site.
    const QS_L = 0xB6BEC6; // cut stone - light face
    const QS_M = 0x8A929B; // cut stone - mid
    const QS_S = 0x6E7780; // cut stone - shaded
    const QS_E = 0x4A525B; // cut stone - deep edge / mortar gap
    const QW_L = 0xC29A6B; // timber - light
    const QW_M = 0x8D6E63; // timber - mid
    const QW_D = 0x6D4C41; // timber - dark
    const QW_P = 0x4E342E; // timber - post/footing
    const QI_H = 0x90A4AE; // iron - highlight
    const QI_M = 0x546E7A; // iron - mid
    const QI_D = 0x37474F; // iron - dark
    const QR_O = 0xCDB173; // rope

    // Timber shear-legs hoist with a cut-stone block hanging from the pulley - quarry centerpiece.
    registerSpriteTexture('quarry_crane', [
      [C,    C,    C,    C,    C,    C,    QW_D, C,    C,    C,    C,    C,    C    ],
      [C,    C,    C,    C,    C,    QI_D, QI_H, QI_D, C,    C,    C,    C,    C    ],
      [C,    C,    C,    C,    C,    QW_M, QR_O, QW_M, C,    C,    C,    C,    C    ],
      [C,    C,    C,    C,    QW_M, QW_D, QR_O, QW_D, QW_M, C,    C,    C,    C    ],
      [C,    C,    C,    C,    QW_M, C,    QR_O, C,    QW_M, C,    C,    C,    C    ],
      [C,    C,    C,    QW_M, QW_D, C,    QR_O, C,    QW_D, QW_M, C,    C,    C    ],
      [C,    C,    C,    QW_M, C,    C,    QR_O, C,    C,    QW_M, C,    C,    C    ],
      [C,    C,    QW_M, QW_D, C,    C,    QR_O, C,    C,    QW_D, QW_M, C,    C    ],
      [C,    C,    QW_M, QW_L, QW_L, QW_L, QW_L, QW_L, QW_L, QW_L, QW_M, C,    C    ],
      [C,    QW_M, QW_D, C,    QS_L, QS_L, QS_L, QS_L, QS_L, C,    QW_D, QW_M, C    ],
      [C,    QW_M, C,    QS_E, QS_L, QS_M, QS_M, QS_M, QS_L, QS_E, C,    QW_M, C    ],
      [QW_M, QW_D, C,    QS_E, QS_M, QS_M, QS_S, QS_M, QS_M, QS_E, C,    QW_D, QW_M ],
      [QW_M, C,    C,    C,    QS_E, QS_E, QS_E, QS_E, QS_E, C,    C,    C,    QW_M ],
      [QW_P, QW_P, C,    C,    C,    C,    C,    C,    C,    C,    C,    QW_P, QW_P ],
    ]);

    // Stacked, freshly-cut quarry blocks - three slabs of decreasing size with mortar gaps.
    registerSpriteTexture('cut_stone_blocks', [
      [C,    C,    C,    QS_L, QS_L, QS_L, QS_L, C,    C,    C    ],
      [C,    C,    C,    QS_L, QS_M, QS_M, QS_L, C,    C,    C    ],
      [C,    C,    C,    QS_E, QS_E, QS_E, QS_E, C,    C,    C    ],
      [C,    QS_L, QS_L, QS_L, QS_L, QS_L, QS_L, QS_L, QS_L, C    ],
      [C,    QS_L, QS_M, QS_M, QS_L, QS_M, QS_M, QS_L, QS_M, C    ],
      [C,    QS_E, QS_E, QS_E, QS_E, QS_E, QS_E, QS_E, QS_E, C    ],
      [QS_L, QS_L, QS_L, QS_L, QS_L, QS_L, QS_L, QS_L, QS_L, QS_L ],
      [QS_M, QS_M, QS_L, QS_M, QS_M, QS_L, QS_M, QS_M, QS_L, QS_M ],
      [QS_E, QS_E, QS_E, QS_E, QS_E, QS_E, QS_E, QS_E, QS_E, QS_E ],
    ]);

    // Loaded mine cart of rubble on a short iron rail.
    registerSpriteTexture('quarry_cart', [
      [C,    C,    QS_M, QS_L, QS_S, QS_L, QS_S, QS_L, C,    C,    C    ],
      [C,    QS_L, QS_S, QS_L, QS_M, QS_S, QS_L, QS_S, QS_L, C,    C    ],
      [C,    QS_E, QS_S, QS_M, QS_L, QS_M, QS_S, QS_E, QS_E, C,    C    ],
      [QW_L, QW_M, QW_M, QW_M, QW_M, QW_M, QW_M, QW_M, QW_M, QW_L, C    ],
      [QW_M, QW_D, QW_M, QW_D, QW_M, QW_D, QW_M, QW_D, QW_M, QW_M, C    ],
      [QW_D, QW_M, QW_D, QW_M, QW_D, QW_M, QW_D, QW_M, QW_D, QW_M, C    ],
      [C,    QI_D, QI_H, QI_D, C,    C,    QI_D, QI_H, QI_D, C,    C    ],
      [QI_M, QI_D, QI_M, QI_D, QI_M, QI_D, QI_M, QI_D, QI_M, QI_D, QI_M ],
    ]);

    // Low spoil heap - broken stone grit raked off to the side (walkable).
    registerSpriteTexture('quarry_rubble', [
      [C,    C,    C,    QS_M, QS_L, C,    QS_M, C,    C,    C    ],
      [C,    C,    QS_L, QS_M, QS_M, QS_L, QS_M, QS_M, C,    C    ],
      [C,    QS_M, QS_L, QS_S, QS_E, QS_M, QS_L, QS_S, QS_E, C    ],
      [QS_S, QS_E, QS_M, QS_S, QS_M, QS_E, QS_M, QS_S, QS_M, QS_E ],
      [C,    QS_E, QS_S, QS_E, QS_E, QS_S, QS_E, QS_E, QS_S, C    ],
    ]);

    // Quarryman's tools - a pickaxe driven into a small cut block.
    registerSpriteTexture('quarry_tools', [
      [C,    C,    C,    C,    C,    QI_D, QI_H, C    ],
      [C,    C,    C,    C,    QI_H, QW_D, C,    C    ],
      [C,    C,    C,    QW_L, QW_D, C,    C,    C    ],
      [C,    C,    QW_L, QW_D, C,    C,    C,    C    ],
      [C,    QS_L, QS_L, QS_L, QS_L, QS_L, QS_L, C    ],
      [QS_L, QS_M, QS_M, QS_L, QS_M, QS_M, QS_L, QS_M ],
      [QS_E, QS_S, QS_M, QS_E, QS_S, QS_M, QS_E, QS_S ],
      [QS_E, QS_E, QS_E, QS_E, QS_E, QS_E, QS_E, QS_E ],
    ]);

    const BV = 0x1B5E20; // dark blight vine
    const BG = 0x69F0AE; // bright green glow
    const BP = 0xB388FF; // purple glow highlight
    const BD = 0x4A148C; // deep purple corruption
    const BW = 0x5D4037; // base wood (brown)
    const BH = 0x795548; // wood highlight
    const BL = 0x3E2723; // dark wood
    registerSpriteTexture('blighted_stump', [
      [C,  C,    BG,   C,    C,    BP,   C,    C,    C  ],
      [C,  BG,   BV,   BP,   BG,   BV,   BP,   BG,   C  ],
      [C,  BV,   BH,   BW,   BD,   BW,   BH,   BV,   C  ],
      [BP, BH,   BD,   BH,   BV,   BD,   BH,   BW,   BG ],
      [BV, BW,   BH,   BV,   BD,   BV,   BW,   BH,   BV ],
      [BG, BL,   BW,   BL,   BW,   BL,   BW,   BL,   BP ],
      [C,  BV,   BL,   BL,   BL,   BL,   BL,   BV,   C  ],
      [C,  C,    BV,   BD,   BV,   BD,   BV,   C,    C  ],
    ]);

    registerSpriteTexture('fence', [
      [0xA1887F, C,      0xA1887F, C,      0xA1887F, C,      0xA1887F, C],
      [0xA1887F, 0x6D4C41,0xA1887F, 0x6D4C41,0xA1887F, 0x6D4C41,0xA1887F, 0x6D4C41],
      [0x6D4C41, C,      0x6D4C41, C,      0x6D4C41, C,      0x6D4C41, C],
      [0x6D4C41, 0xA1887F,0x6D4C41, 0xA1887F,0x6D4C41, 0xA1887F,0x6D4C41, 0xA1887F],
    ]);

    registerSpriteTexture('barrel', [
      [C,        0x6D4C41,0x8D6E63,0x6D4C41,0x8D6E63,0x6D4C41,C],
      [0x546E7A, 0x6D4C41,0x8D6E63,0x6D4C41,0x8D6E63,0x6D4C41,0x546E7A],
      [0x6D4C41, 0x8D6E63,0x6D4C41,0x8D6E63,0x6D4C41,0x8D6E63,0x6D4C41],
      [0x546E7A, 0x6D4C41,0x8D6E63,0x6D4C41,0x8D6E63,0x6D4C41,0x546E7A],
      [C,        0x6D4C41,0x8D6E63,0x6D4C41,0x8D6E63,0x6D4C41,C],
    ]);

    registerSpriteTexture('crate', [
      [0x5D4037, 0x795548,0x795548,0x795548,0x795548,0x795548,0x5D4037],
      [0x795548, 0x8D6E63,0x5D4037,0x8D6E63,0x5D4037,0x8D6E63,0x795548],
      [0x795548, 0x5D4037,0x8D6E63,0x5D4037,0x8D6E63,0x5D4037,0x795548],
      [0x795548, 0x8D6E63,0x5D4037,0x8D6E63,0x5D4037,0x8D6E63,0x795548],
      [0x5D4037, 0x795548,0x795548,0x795548,0x795548,0x795548,0x5D4037],
    ]);

    const GATE_IRON = 0x455A64;
    const GATE_IRON_H = 0x607D8B;
    const GATE_RIVET = 0x37474F;
    const GATE_LOCK = 0xFFD54F;
    registerSpriteTexture('gate', [
      [GATE_IRON, GATE_IRON_H, GATE_IRON, GATE_IRON_H, GATE_IRON, GATE_IRON_H, GATE_IRON, GATE_IRON],
      [GATE_RIVET,GATE_IRON,   GATE_RIVET,GATE_IRON,   GATE_RIVET,GATE_IRON,   GATE_RIVET,GATE_IRON],
      [GATE_IRON, GATE_IRON_H, GATE_IRON, GATE_LOCK,   GATE_LOCK, GATE_IRON,   GATE_IRON_H,GATE_IRON],
      [GATE_RIVET,GATE_IRON,   GATE_RIVET,GATE_IRON,   GATE_RIVET,GATE_IRON,   GATE_RIVET,GATE_IRON],
      [GATE_IRON, GATE_IRON_H, GATE_IRON, GATE_IRON_H, GATE_IRON, GATE_IRON_H, GATE_IRON, GATE_IRON],
      [GATE_IRON, GATE_RIVET,  GATE_IRON, GATE_RIVET,  GATE_IRON, GATE_RIVET,  GATE_IRON, GATE_RIVET],
    ]);

    // Fog gate â€” swirling white/grey mist wall
    const FOG_W = 0xE0E0E0;
    const FOG_L = 0xBDBDBD;
    const FOG_M = 0x9E9E9E;
    const FOG_D = 0x757575;
    const FOG_P = 0xCE93D8; // faint purple tinge
    registerSpriteTexture('fog_gate', [
      [C,     FOG_D, FOG_M, FOG_L, FOG_W, FOG_L, FOG_M, FOG_D, C,     C    ],
      [FOG_D, FOG_M, FOG_W, FOG_L, FOG_P, FOG_L, FOG_W, FOG_M, FOG_D, C    ],
      [FOG_M, FOG_W, FOG_P, FOG_W, FOG_L, FOG_W, FOG_P, FOG_W, FOG_M, C    ],
      [FOG_L, FOG_P, FOG_W, FOG_L, FOG_M, FOG_L, FOG_W, FOG_P, FOG_L, C    ],
      [FOG_W, FOG_L, FOG_M, FOG_D, FOG_P, FOG_D, FOG_M, FOG_L, FOG_W, C    ],
      [FOG_M, FOG_W, FOG_P, FOG_M, FOG_L, FOG_M, FOG_P, FOG_W, FOG_M, C    ],
      [FOG_D, FOG_M, FOG_L, FOG_W, FOG_P, FOG_W, FOG_L, FOG_M, FOG_D, C    ],
      [C,     FOG_D, FOG_M, FOG_L, FOG_W, FOG_L, FOG_M, FOG_D, C,     C    ],
    ]);

    // Spike trap
    const SPIKE = 0x90A4AE;
    const SPIKE_S = 0x546E7A;
    registerSpriteTexture('spike_trap', [
      [C,      SPIKE, C,      SPIKE,  C,      SPIKE,  C,     C],
      [SPIKE_S,SPIKE, SPIKE_S,SPIKE,  SPIKE_S,SPIKE,  SPIKE_S,C],
      [C,      SPIKE_S,C,     SPIKE_S,C,      SPIKE_S,C,     C],
      [0x616161,0x616161,0x616161,0x616161,0x616161,0x616161,0x616161,0x616161],
    ]);

    registerSpriteTexture('bones', [
      [C,     0xEEEEEE,C,     C,     0xEEEEEE,C],
      [0xEEEEEE,0xBDBDBD,0xEEEEEE,0xEEEEEE,0xBDBDBD,0xEEEEEE],
      [C,     C,     0xBDBDBD,0xEEEEEE,C,     C],
      [C,     0xEEEEEE,0xEEEEEE,0xBDBDBD,0xEEEEEE,C],
      [0xEEEEEE,0xBDBDBD,C,     C,     0xBDBDBD,0xEEEEEE],
    ]);

    // Iron fence - dark metal bars
    const IRON = 0x37474F;
    const IRON_H = 0x546E7A;
    registerSpriteTexture('iron_fence', [
      [IRON_H, C,      IRON_H, C,      IRON_H, C,      IRON_H, C],
      [IRON,   IRON_H, IRON,   IRON_H, IRON,   IRON_H, IRON,   IRON_H],
      [IRON,   C,      IRON,   C,      IRON,   C,      IRON,   C],
      [IRON,   IRON_H, IRON,   IRON_H, IRON,   IRON_H, IRON,   IRON_H],
      [IRON,   C,      IRON,   C,      IRON,   C,      IRON,   C],
    ]);

    // Hedge - dense green bush
    const HEDGE = 0x2E7D32;
    const HEDGE_H = 0x43A047;
    const HEDGE_S = 0x1B5E20;
    registerSpriteTexture('hedge', [
      [C,      HEDGE_H,HEDGE,  HEDGE_H,HEDGE,  HEDGE_H,C,     C],
      [HEDGE_S,HEDGE,  HEDGE_H,HEDGE,  HEDGE_H,HEDGE,  HEDGE_S,C],
      [HEDGE,  HEDGE_S,HEDGE,  HEDGE_S,HEDGE,  HEDGE_S,HEDGE, C],
      [HEDGE_S,HEDGE,  HEDGE_S,HEDGE,  HEDGE_S,HEDGE,  HEDGE_S,C],
    ]);

    // Wheat - golden crop
    const WHEAT = 0xFFC107;
    const WHEAT_H = 0xFFD54F;
    const WHEAT_S = 0xFFA000;
    const WHEAT_STEM = 0x8BC34A;
    registerSpriteTexture('wheat', [
      [C,        WHEAT_H, C,       WHEAT,   C,       WHEAT_H, C,       C],
      [WHEAT,    WHEAT_H, WHEAT,   WHEAT_H, WHEAT,   WHEAT,   WHEAT_S, C],
      [WHEAT_S,  WHEAT,   WHEAT_S, WHEAT,   WHEAT_S, WHEAT,   WHEAT_S, C],
      [C,        WHEAT_STEM,C,     WHEAT_STEM,C,     WHEAT_STEM,C,      C],
      [C,        WHEAT_STEM,C,     WHEAT_STEM,C,     WHEAT_STEM,C,      C],
    ]);

    // Scarecrow
    const SC_HAT = 0x5D4037;
    const SC_SHIRT = 0xBCAAA4;
    const SC_FACE = 0xFFE0BD;
    registerSpriteTexture('scarecrow', [
      [C,      C,      SC_HAT, SC_HAT, SC_HAT, SC_HAT, C,      C],
      [C,      SC_HAT, SC_HAT, SC_HAT, SC_HAT, SC_HAT, SC_HAT, C],
      [C,      C,      SC_FACE,0x000000,SC_FACE,0x000000,C,      C],
      [C,      C,      SC_FACE,SC_FACE,SC_FACE,SC_FACE, C,      C],
      [SC_SHIRT,SC_SHIRT,SC_SHIRT,SC_SHIRT,SC_SHIRT,SC_SHIRT,SC_SHIRT,SC_SHIRT],
      [C,      C,      C,      SC_SHIRT,SC_SHIRT,C,      C,      C],
      [C,      C,      C,      0x5D4037,0x5D4037,C,      C,      C],
      [C,      C,      C,      0x5D4037,0x5D4037,C,      C,      C],
    ]);

    // Windmill â€” 10Ã-18 sprite: 4 distinct blade arms in "+" orientation,
    // conical cap, limestone tower with window + door, stone base.
    //
    // Blade layout (rows 0-9): top blade goes up (rows 0-3), hub + E/W blades
    // fill rows 4-5, bottom blade goes down (rows 6-9).  Transparent gaps
    // between arms make each of the 4 blades read separately.
    const WM_SL  = 0xFAF2DE;   // sail canvas â€“ light
    const WM_SM  = 0xDACA9C;   // sail canvas â€“ mid
    const WM_SD  = 0xB8A878;   // sail canvas â€“ dark edge
    const WM_FR  = 0x6D4C41;   // blade wooden frame/strut
    const WM_HB  = 0x3E2723;   // hub centre
    const WM_HH  = 0x5D4037;   // hub ring / blade root
    const WM_CAH = 0xC28E58;   // cap highlight
    const WM_CAM = 0xA07040;   // cap body
    const WM_CAD = 0x7A5030;   // cap shadow
    const WM_TWL = 0xEEE8DC;   // tower light (warm limestone)
    const WM_TWM = 0xCCC0A8;   // tower mid
    const WM_TWD = 0xA09880;   // tower shadow
    const WM_WIN = 0x2C3840;   // window / door opening
    const WM_BSL = 0xAAAAAA;   // stone base bright
    const WM_BSD = 0x787878;   // stone base dark
    registerSpriteTexture('windmill', [
      // â”€â”€ top blade (N arm, rows 0-3) â”€ cols 3-6 only, rest transparent â”€â”€â”€â”€
      [C,       C,       C,       WM_SD,   WM_SL,   WM_SL,   WM_SD,   C,       C,       C      ],
      [C,       C,       C,       WM_SM,   WM_SL,   WM_SL,   WM_SM,   C,       C,       C      ],
      [C,       C,       C,       WM_SM,   WM_SL,   WM_SL,   WM_SM,   C,       C,       C      ],
      [C,       C,       C,       WM_FR,   WM_HH,   WM_HH,   WM_FR,   C,       C,       C      ],
      // â”€â”€ hub + left (W) blade + right (E) blade (rows 4-5) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
      [WM_SD,   WM_SM,   WM_SM,   WM_FR,   WM_HB,   WM_HB,   WM_FR,   WM_SM,   WM_SM,   WM_SD  ],
      [WM_SD,   WM_SM,   WM_SM,   WM_FR,   WM_HB,   WM_HB,   WM_FR,   WM_SM,   WM_SM,   WM_SD  ],
      // â”€â”€ bottom blade (S arm, rows 6-9) â”€ cols 3-6 only â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
      [C,       C,       C,       WM_FR,   WM_HH,   WM_HH,   WM_FR,   C,       C,       C      ],
      [C,       C,       C,       WM_SM,   WM_SL,   WM_SL,   WM_SM,   C,       C,       C      ],
      [C,       C,       C,       WM_SM,   WM_SL,   WM_SL,   WM_SM,   C,       C,       C      ],
      [C,       C,       C,       WM_SD,   WM_SL,   WM_SL,   WM_SD,   C,       C,       C      ],
      // â”€â”€ conical cap (rows 10-12) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
      [C,       C,       C,       C,       WM_CAH,  WM_CAD,  C,       C,       C,       C      ],
      [C,       C,       C,       WM_CAH,  WM_CAM,  WM_CAD,  WM_CAD,  C,       C,       C      ],
      [C,       C,       WM_CAH,  WM_CAM,  WM_CAM,  WM_CAD,  WM_CAD,  C,       C,       C      ],
      // â”€â”€ limestone tower (rows 13-16) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
      [C,       C,       WM_TWL,  WM_TWL,  WM_TWL,  WM_TWM,  WM_TWD,  C,       C,       C      ],
      [C,       C,       WM_TWL,  WM_WIN,  WM_TWL,  WM_TWM,  WM_TWD,  C,       C,       C      ],
      [C,       WM_TWL,  WM_TWL,  WM_TWM,  WM_TWL,  WM_TWM,  WM_TWD,  WM_TWD,  C,       C      ],
      [C,       WM_TWL,  WM_TWL,  WM_TWM,  WM_WIN,  WM_TWM,  WM_TWD,  WM_TWD,  C,       C      ],
      // â”€â”€ stone base (row 17) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
      [WM_BSL,  WM_BSL,  WM_BSL,  WM_BSL,  WM_BSL,  WM_BSL,  WM_BSD,  WM_BSD,  C,       C      ],
    ]);

    // Observatory â€” abandoned stone watchtower, 14Ã-26 sprite grid
    // Pointed shingle roof â†’ crenellations â†’ straight-walled tower sections â†’ trim bands â†’ heavy base
    const RF_PK = 0xB8860B;  // roof peak finial (dark goldenrod)
    const RF_LT = 0x8B4513;  // roof shingle light (saddle brown)
    const RF_MD = 0x6B3410;  // roof shingle mid
    const RF_DK = 0x4A2208;  // roof shingle dark
    const RF_EV = 0x2A1A0A;  // eaves trim (near-black brown)
    const TW_LT = 0x9A9690;  // tower wall light (warm grey)
    const TW_MD = 0x7A7670;  // tower wall mid
    const TW_DK = 0x5A5650;  // tower wall dark/shadow
    const TW_BD = 0x3A3834;  // band/trim line (dark)
    const OB_WIN = 0x0A1018; // window (very dark)
    const OB_WF  = 0x4A5060; // window frame/sill
    const BS_LT = 0x706860;  // base stone light
    const BS_MD = 0x585248;  // base stone mid
    const BS_DK = 0x403C38;  // base stone dark
    const BS_TM = 0x2A2824;  // base trim/foundation (darkest)
    registerSpriteTexture('observatory', [
      // row 0: roof finial
      [C,      C,      C,      C,      C,      C,      RF_PK,  RF_PK,  C,      C,      C,      C,      C,      C     ],
      // row 1-2: upper roof cone
      [C,      C,      C,      C,      C,      RF_LT,  RF_MD,  RF_MD,  RF_DK,  C,      C,      C,      C,      C     ],
      [C,      C,      C,      C,      RF_LT,  RF_LT,  RF_MD,  RF_MD,  RF_DK,  RF_DK,  C,      C,      C,      C     ],
      // row 3-4: expanding roof
      [C,      C,      C,      RF_LT,  RF_LT,  RF_MD,  RF_MD,  RF_MD,  RF_DK,  RF_DK,  RF_DK,  C,      C,      C     ],
      [C,      C,      RF_LT,  RF_LT,  RF_MD,  RF_MD,  RF_MD,  RF_MD,  RF_MD,  RF_DK,  RF_DK,  RF_DK,  C,      C     ],
      // row 5: eaves overhang (wider than tower, dark edge trim)
      [C,      RF_EV,  RF_LT,  RF_LT,  RF_MD,  RF_MD,  RF_MD,  RF_MD,  RF_MD,  RF_DK,  RF_DK,  RF_DK,  RF_EV,  C     ],
      // row 6: crenellated parapet (gaps between merlons)
      [C,      C,      C,      TW_BD,  C,      TW_BD,  TW_MD,  TW_MD,  TW_BD,  C,      TW_BD,  C,      C,      C     ],
      // row 7-8: upper tower (straight edges cols 3-10)
      [C,      C,      C,      TW_LT,  TW_LT,  TW_MD,  TW_MD,  TW_MD,  TW_MD,  TW_DK,  TW_DK,  C,      C,      C     ],
      [C,      C,      C,      TW_LT,  OB_WF,  OB_WIN, TW_MD,  TW_MD,  OB_WIN, OB_WF,  TW_DK,  C,      C,      C     ],
      // row 9: trim band
      [C,      C,      C,      TW_LT,  TW_BD,  TW_BD,  TW_BD,  TW_BD,  TW_BD,  TW_BD,  TW_DK,  C,      C,      C     ],
      // row 10-11: upper tower continued
      [C,      C,      C,      TW_LT,  TW_LT,  TW_MD,  TW_MD,  TW_MD,  TW_MD,  TW_DK,  TW_DK,  C,      C,      C     ],
      [C,      C,      C,      TW_LT,  TW_MD,  OB_WF,  OB_WIN, OB_WIN, OB_WF,  TW_MD,  TW_DK,  C,      C,      C     ],
      // row 12: transition trim (widens to 10px, cols 2-11)
      [C,      C,      TW_BD,  TW_LT,  TW_BD,  TW_BD,  TW_BD,  TW_BD,  TW_BD,  TW_BD,  TW_DK,  TW_BD,  C,      C     ],
      // row 13-14: mid tower (straight edges cols 2-11)
      [C,      C,      TW_LT,  TW_LT,  TW_MD,  TW_MD,  TW_MD,  TW_MD,  TW_MD,  TW_MD,  TW_DK,  TW_DK,  C,      C     ],
      [C,      C,      TW_LT,  OB_WF,  OB_WIN, TW_MD,  TW_MD,  TW_MD,  TW_MD,  OB_WIN, OB_WF,  TW_DK,  C,      C     ],
      // row 15-16: mid tower continued
      [C,      C,      TW_LT,  TW_LT,  TW_MD,  TW_MD,  TW_MD,  TW_MD,  TW_MD,  TW_MD,  TW_DK,  TW_DK,  C,      C     ],
      [C,      C,      TW_LT,  TW_BD,  TW_BD,  TW_BD,  TW_BD,  TW_BD,  TW_BD,  TW_BD,  TW_BD,  TW_DK,  C,      C     ],
      // row 17: mid tower windows
      [C,      C,      TW_LT,  TW_MD,  OB_WF,  OB_WIN, TW_MD,  TW_MD,  OB_WIN, OB_WF,  TW_MD,  TW_DK,  C,      C     ],
      // row 18: transition band into base (widens to 12px, cols 1-12)
      [C,      TW_BD,  BS_LT,  BS_LT,  TW_BD,  TW_BD,  TW_BD,  TW_BD,  TW_BD,  TW_BD,  TW_BD,  BS_DK,  TW_BD,  C     ],
      // row 19: base wall
      [C,      BS_LT,  BS_LT,  BS_LT,  BS_MD,  BS_MD,  BS_MD,  BS_MD,  BS_MD,  BS_MD,  BS_DK,  BS_DK,  BS_DK,  C     ],
      // row 20-22: base with arched entrance (full 14px)
      [BS_LT,  BS_LT,  BS_LT,  BS_LT,  BS_MD,  OB_WF,  OB_WIN, OB_WIN, OB_WF,  BS_MD,  BS_DK,  BS_DK,  BS_DK,  BS_DK ],
      [BS_LT,  BS_LT,  BS_LT,  BS_LT,  BS_MD,  OB_WIN, OB_WIN, OB_WIN, OB_WIN, BS_MD,  BS_DK,  BS_DK,  BS_DK,  BS_DK ],
      [BS_LT,  BS_LT,  BS_LT,  BS_LT,  BS_LT,  BS_MD,  BS_MD,  BS_MD,  BS_MD,  BS_DK,  BS_DK,  BS_DK,  BS_DK,  BS_DK ],
      // row 23-25: heavy foundation (full width, no tapering)
      [BS_TM,  BS_LT,  BS_LT,  BS_LT,  BS_LT,  BS_MD,  BS_MD,  BS_MD,  BS_MD,  BS_DK,  BS_DK,  BS_DK,  BS_DK,  BS_TM ],
      [BS_TM,  BS_TM,  BS_LT,  BS_LT,  BS_LT,  BS_MD,  BS_MD,  BS_MD,  BS_DK,  BS_DK,  BS_DK,  BS_DK,  BS_TM,  BS_TM ],
      [BS_TM,  BS_TM,  BS_TM,  BS_LT,  BS_LT,  BS_LT,  BS_MD,  BS_DK,  BS_DK,  BS_DK,  BS_DK,  BS_TM,  BS_TM,  BS_TM ],
    ]);

    // Sword (Matches Player Buster Blade â€” fully diagonal, tip top-right to pommel bottom-left)
    // Every element (blade, guard, grip, pommel) follows the same 45Â° angle.
    const SW_B  = 0xC0D0E0;  // blade mid
    const SW_H  = 0xF0F4FF;  // blade highlight (bright edge)
    const SW_E  = 0x90A8C0;  // blade shadow edge
    const SW_G  = 0xE8C030;  // gold guard / pommel
    const SW_GR = 0x5D4037;  // brown grip
    const SW_GW = 0x8B7355;  // grip wrap highlight (lighter leather)

    registerSpriteTexture('sword', [
      //       0      1      2      3      4      5      6      7
      /* 0 */ [C,     C,     C,     C,     C,     SW_H,  SW_H,  C    ],  // tip
      /* 1 */ [C,     C,     C,     C,     SW_H,  SW_B,  SW_H,  C    ],  // blade
      /* 2 */ [C,     C,     C,     SW_H,  SW_B,  SW_E,  C,     C    ],  // blade
      /* 3 */ [C,     C,     SW_G,  SW_B,  SW_E,  SW_G,  C,     C    ],  // guard cross 1
      /* 4 */ [C,     SW_G,  SW_GR, SW_E,  SW_G,  C,     C,     C    ],  // guard cross 2
      /* 5 */ [C,     C,     SW_GW, SW_GR, C,     C,     C,     C    ],  // grip wrap
      /* 6 */ [C,     SW_GR, SW_GW, C,     C,     C,     C,     C    ],  // grip wrap
      /* 7 */ [SW_GR, SW_G,  C,     C,     C,     C,     C,     C    ],  // pommel
    ]);

    // Ornamental Broadsword inventory icon â€” straight blade that widens toward a wide
    // ornate guard.  Blue-steel tones, gold guard with highlights, ruby gem pommel.
    const BS_B  = 0x8AAEC8;  // blade body (blue-steel)
    const BS_H  = 0xD0E4FF;  // blade highlight (bright edge)
    const BS_E  = 0x5C7D99;  // blade shadow edge
    const BS_GH = 0xFFD700;  // gold guard highlight
    const BS_GR = 0x4E342E;  // dark leather grip
    const BS_GW = 0x7A5D42;  // grip wrap highlight (lighter leather)
    const BS_GM = 0xB22222;  // ruby gem pommel

    registerSpriteTexture('broadsword', [
      //       0      1      2      3      4      5      6      7
      /* 0 */ [C,     C,     C,     C,     C,     C,     BS_H,  C    ],  // tip
      /* 1 */ [C,     C,     C,     C,     C,     BS_H,  BS_B,  C    ],  // blade
      /* 2 */ [C,     C,     C,     C,     BS_H,  BS_B,  BS_E,  C    ],  // blade
      /* 3 */ [C,     C,     C,     BS_H,  BS_B,  BS_E,  C,     C    ],  // blade
      /* 4 */ [C,     C,     BS_GH, BS_B,  BS_E,  BS_GH, C,     C    ],  // guard cross 1
      /* 5 */ [C,     BS_GH, BS_GR, BS_E,  BS_GH, C,     C,     C    ],  // guard cross 2
      /* 6 */ [C,     C,     BS_GW, BS_GR, C,     C,     C,     C    ],  // grip wrap
      /* 7 */ [C,     BS_GR, BS_GM, BS_GR, C,     C,     C,     C    ],  // pommel with ruby
    ]);

    // Broadsword player sprites â€” identical chibi silhouette with blue-steel blade tones
    const heroBroadswordPalette = {
      ...heroPalette,
      bladeMain:      0x9BB8D0,  // blue-steel blade
      bladeHighlight: 0xD0E4FF,  // bright blue-white edge
      bladeShadow:    0x6A8BAA,  // darker blue shadow
      guardColor:     0xDAA520,  // gold guard
      gripColor:      0x4E342E,  // slightly darker leather grip
      bladeStyle:     'broad' as const, // distinct wider/longer silhouette
    };

    for (const dir of dirs) {
      for (const state of states) {
        const maxFrames = state === 'attack' || state === 'charge' ? 3 : state === 'hurt' || state === 'block' ? 1 : 2;
        for (let f = 0; f < maxFrames; f++) {
          const d = dir, s = state, fr = f;
          const spriteId = `player_broadsword_${d}_${s}_${fr}`;
          this.registerTexture(spriteId, () => {
            const tex = this.getTexture('broadsword');
            const wc = tex?.image instanceof HTMLCanvasElement ? tex.image : undefined;
            return this.createChibiCharacter(d, s, fr, heroBroadswordPalette, spriteId, false, true, wc, 1.0);
          });
        }
      }
    }

    // Broadsword combo step attack textures
    for (const dir of dirs) {
      for (let step = 0; step < 3; step++) {
        for (let f = 0; f < 3; f++) {
          const d = dir, cs = step, fr = f;
          const spriteId = `player_broadsword_${d}_attack_${cs}_${fr}`;
          this.registerTexture(spriteId, () => {
            const tex = this.getTexture('broadsword');
            const wc = tex?.image instanceof HTMLCanvasElement ? tex.image : undefined;
            return this.createChibiCharacter(d, 'attack', fr, heroBroadswordPalette, spriteId, false, true, wc, 1.0, cs);
          });
        }
      }
    }

    // Diagonal broadsword sprite aliases (reuse mirrored side views)
    const bsDiagDirs = ['down_left', 'down_right', 'up_left', 'up_right'] as const;
    const bsDiagBase = { down_left: 'left', down_right: 'right', up_left: 'left', up_right: 'right' } as const;
    for (const dDir of bsDiagDirs) {
      const base = bsDiagBase[dDir];
      for (const state of states) {
        const maxFrames = state === 'attack' || state === 'charge' ? 3 : state === 'hurt' || state === 'block' ? 1 : 2;
        for (let f = 0; f < maxFrames; f++) {
          const dd = dDir, b = base, s = state, fr = f;
          const spriteId = `player_broadsword_${dd}_${s}_${fr}`;
          this.registerTexture(spriteId, () => {
            const baseTexture = this.getTexture(`player_broadsword_${b}_${s}_${fr}`)!;
            if (baseTexture instanceof THREE.CanvasTexture && baseTexture.image instanceof HTMLCanvasElement) {
              this.textureDataUrls.set(spriteId, baseTexture.image.toDataURL());
            }
            return baseTexture;
          });
        }
      }
    }

    // Diagonal broadsword combo step aliases
    for (const dDir of bsDiagDirs) {
      const base = bsDiagBase[dDir];
      for (let step = 0; step < 3; step++) {
        for (let f = 0; f < 3; f++) {
          const dd = dDir, b = base, cs = step, fr = f;
          const spriteId = `player_broadsword_${dd}_attack_${cs}_${fr}`;
          this.registerTexture(spriteId, () => {
            const baseTexture = this.getTexture(`player_broadsword_${b}_attack_${cs}_${fr}`)!;
            if (baseTexture instanceof THREE.CanvasTexture && baseTexture.image instanceof HTMLCanvasElement) {
              this.textureDataUrls.set(spriteId, baseTexture.image.toDataURL());
            }
            return baseTexture;
          });
        }
      }
    }

    // Terminus Scythe inventory icon - oversized crescent blade, long ash shaft
    const SC_B  = 0x2A1B3D;  // dark-matter blade core
    const SC_BH = 0x6A0DAD;  // purple edge highlight
    const SC_BM = 0x4A2A7D;  // blade midtone (depth shading)
    const SC_BS = 0x1A0E2E;  // deep shadow
    const SC_SH = 0x8B8B8B;  // shaft gray
    const SC_SD = 0x5C5C5C;  // shaft shadow
    const SC_G  = 0x4E342E;  // grip leather
    registerSpriteTexture('scythe', [
      //       0       1       2       3       4       5       6       7
      /* 0 */ [C,     SC_BH, SC_B,  SC_B,  SC_B,  SC_BS, C,     C    ],  // wide tip (5 cols)
      /* 1 */ [SC_BH, SC_B,  SC_BM, SC_BM, SC_BS, C,     C,     C    ],  // blade midtone shading
      /* 2 */ [SC_B,  SC_BM, SC_BS, SC_SH, C,     C,     C,     C    ],  // blade base → shaft
      /* 3 */ [C,     C,     SC_SH, SC_SH, C,     C,     C,     C    ],  // shaft
      /* 4 */ [C,     C,     C,     SC_SH, SC_SD, C,     C,     C    ],  // shaft
      /* 5 */ [C,     C,     C,     C,     SC_SH, SC_SD, C,     C    ],  // shaft
      /* 6 */ [C,     C,     C,     C,     C,     SC_G,  SC_SD, C    ],  // grip
      /* 7 */ [C,     C,     C,     C,     C,     C,     SC_G,  SC_SD],  // grip end
    ]);

    // Scythe player sprites â€” same chibi silhouette with dark-matter purple tones
    const heroScythePalette = {
      ...heroPalette,
      bladeMain:      0x2A1B3D,
      bladeHighlight: 0x6A0DAD,
      bladeShadow:    0x1A0E2E,
      guardColor:     0x8B8B8B,
      gripColor:      0x4E342E,
      bladeStyle:     'broad' as const,
    };

    for (const dir of dirs) {
      for (const state of states) {
        const maxFrames = state === 'attack' || state === 'charge' ? 3 : state === 'hurt' || state === 'block' ? 1 : 2;
        for (let f = 0; f < maxFrames; f++) {
          const d = dir, s = state, fr = f;
          const spriteId = `player_scythe_${d}_${s}_${fr}`;
          this.registerTexture(spriteId, () => {
            const tex = this.getTexture('scythe');
            const wc = tex?.image instanceof HTMLCanvasElement ? tex.image : undefined;
            // weaponType='scythe' activates the scythe-specific WPose table (trailing carry,
            // ground-skim combos, horizontal block, overhead-loading charge).
            // weaponRestYShift=12 is a fallback for any down/up-view poses that share the
            // default table - keeps the blade below the face there too.
            return this.createChibiCharacter(d, s, fr, heroScythePalette, spriteId, false, true, wc, 1.3, 0, 12, 'scythe');
          });
        }
      }
    }

    // Scythe combo step attack textures
    for (const dir of dirs) {
      for (let step = 0; step < 3; step++) {
        for (let f = 0; f < 3; f++) {
          const d = dir, cs = step, fr = f;
          const spriteId = `player_scythe_${d}_attack_${cs}_${fr}`;
          this.registerTexture(spriteId, () => {
            const tex = this.getTexture('scythe');
            const wc = tex?.image instanceof HTMLCanvasElement ? tex.image : undefined;
            return this.createChibiCharacter(d, 'attack', fr, heroScythePalette, spriteId, false, true, wc, 1.3, cs, 12, 'scythe');
          });
        }
      }
    }

    // Diagonal scythe sprite aliases
    for (const dDir of bsDiagDirs) {
      const base = bsDiagBase[dDir];
      for (const state of states) {
        const maxFrames = state === 'attack' || state === 'charge' ? 3 : state === 'hurt' || state === 'block' ? 1 : 2;
        for (let f = 0; f < maxFrames; f++) {
          const dd = dDir, b = base, s = state, fr = f;
          const spriteId = `player_scythe_${dd}_${s}_${fr}`;
          this.registerTexture(spriteId, () => {
            const baseTexture = this.getTexture(`player_scythe_${b}_${s}_${fr}`)!;
            if (baseTexture instanceof THREE.CanvasTexture && baseTexture.image instanceof HTMLCanvasElement) {
              this.textureDataUrls.set(spriteId, baseTexture.image.toDataURL());
            }
            return baseTexture;
          });
        }
      }
    }

    // Diagonal scythe combo step aliases
    for (const dDir of bsDiagDirs) {
      const base = bsDiagBase[dDir];
      for (let step = 0; step < 3; step++) {
        for (let f = 0; f < 3; f++) {
          const dd = dDir, b = base, cs = step, fr = f;
          const spriteId = `player_scythe_${dd}_attack_${cs}_${fr}`;
          this.registerTexture(spriteId, () => {
            const baseTexture = this.getTexture(`player_scythe_${b}_attack_${cs}_${fr}`)!;
            if (baseTexture instanceof THREE.CanvasTexture && baseTexture.image instanceof HTMLCanvasElement) {
              this.textureDataUrls.set(spriteId, baseTexture.image.toDataURL());
            }
            return baseTexture;
          });
        }
      }
    }

    // Health Potion Sprite
    const P_G  = 0xA0B0C0;  // glass color
    const P_R  = 0xCC2222;  // red liquid
    const P_RH = 0xFF4444;  // red highlight
    const P_RS = 0x991111;  // red shadow
    const P_K  = 0x6B4423;  // cork brown
    const P_W  = 0x8D6E63;  // cork highlight

    registerSpriteTexture('potion', [
      //       0      1      2      3      4      5      6      7
      /* 0 */ [C,     C,     C,     P_W,   P_W,   C,     C,     C    ],
      /* 1 */ [C,     C,     P_K,   P_K,   P_K,   P_K,   C,     C    ],
      /* 2 */ [C,     C,     P_G,   P_G,   P_G,   P_G,   C,     C    ],
      /* 3 */ [C,     P_G,   P_RH,  P_R,   P_R,   P_R,   P_G,   C    ],
      /* 4 */ [P_G,   P_RH,  P_R,   P_R,   P_R,   P_R,   P_R,   P_G  ],
      /* 5 */ [P_G,   P_R,   P_R,   P_RS,  P_RS,  P_R,   P_R,   P_G  ],
      /* 6 */ [P_G,   P_R,   P_R,   P_R,   P_R,   P_R,   P_R,   P_G  ],
      /* 7 */ [C,     P_G,   P_G,   P_G,   P_G,   P_G,   P_G,   C    ],
    ]);

    // Verdant Tonic â€” tall narrow flask, teal-blue liquid, leaf cork stopper
    const VT_G  = 0x90A4AE;  // pale glass
    const VT_GD = 0x78909C;  // glass dark
    const VT_L  = 0x00ACC1;  // teal liquid
    const VT_LH = 0x26C6DA;  // teal highlight
    const VT_LS = 0x00838F;  // teal shadow
    const VT_LG = 0x4DD0E1;  // liquid gleam
    const VT_CK = 0x558B2F;  // leaf-green cork
    const VT_CH = 0x7CB342;  // cork highlight

    registerSpriteTexture('verdant_tonic', [
      //       0      1      2      3      4      5
      /* 0 */ [C,     C,     VT_CH, VT_CK, C,     C    ],
      /* 1 */ [C,     C,     VT_CK, VT_CK, C,     C    ],
      /* 2 */ [C,     C,     VT_G,  VT_GD, C,     C    ],
      /* 3 */ [C,     VT_G,  VT_LG, VT_L,  VT_GD, C    ],
      /* 4 */ [C,     VT_G,  VT_LH, VT_L,  VT_GD, C    ],
      /* 5 */ [VT_G,  VT_LH, VT_L,  VT_L,  VT_LS, VT_GD],
      /* 6 */ [VT_G,  VT_L,  VT_L,  VT_LS, VT_LS, VT_GD],
      /* 7 */ [VT_G,  VT_LH, VT_L,  VT_L,  VT_LS, VT_GD],
      /* 8 */ [C,     VT_G,  VT_L,  VT_LS, VT_GD, C    ],
      /* 9 */ [C,     C,     VT_GD, VT_GD, C,     C    ],
    ]);

    // Berserker Draught - black flask, deep red liquid, iron cork
    const BD_G  = 0x2C2A2E;  // dark glass
    const BD_GD = 0x1A181C;  // glass shadow
    const BD_L  = 0xB71C1C;  // red liquid
    const BD_LH = 0xE53935;  // red highlight
    const BD_LS = 0x7F0F0F;  // red shadow
    const BD_LG = 0xFF5252;  // ember gleam
    const BD_CK = 0x3E2723;  // iron cork
    const BD_CH = 0x5D4037;  // cork highlight

    registerSpriteTexture('berserker_draught', [
      //       0      1      2      3      4      5
      /* 0 */ [C,     C,     BD_CH, BD_CK, C,     C    ],
      /* 1 */ [C,     C,     BD_CK, BD_CK, C,     C    ],
      /* 2 */ [C,     C,     BD_G,  BD_GD, C,     C    ],
      /* 3 */ [C,     BD_G,  BD_LG, BD_L,  BD_GD, C    ],
      /* 4 */ [C,     BD_G,  BD_LH, BD_L,  BD_GD, C    ],
      /* 5 */ [BD_G,  BD_LH, BD_L,  BD_L,  BD_LS, BD_GD],
      /* 6 */ [BD_G,  BD_L,  BD_L,  BD_LS, BD_LS, BD_GD],
      /* 7 */ [BD_G,  BD_LH, BD_L,  BD_L,  BD_LS, BD_GD],
      /* 8 */ [C,     BD_G,  BD_L,  BD_LS, BD_GD, C    ],
      /* 9 */ [C,     C,     BD_GD, BD_GD, C,     C    ],
    ]);

    // Last Breath Charm - ivory bone token with a single carved red rune
    const LB_B  = 0xEFE6D2;  // bone white
    const LB_BH = 0xFFFAF0;  // bone highlight
    const LB_BS = 0xB7A78A;  // bone shadow
    const LB_BD = 0x7A6A52;  // bone deep shadow
    const LB_R  = 0xB71C1C;  // rune red
    const LB_RG = 0xFF5252;  // rune glow

    registerSpriteTexture('last_breath_charm', [
      //       0      1      2      3      4      5      6      7
      /* 0 */ [C,     C,     LB_BS, LB_B,  LB_B,  LB_BS, C,     C    ],
      /* 1 */ [C,     LB_BS, LB_BH, LB_B,  LB_B,  LB_BH, LB_BS, C    ],
      /* 2 */ [LB_BS, LB_BH, LB_B,  LB_R,  LB_R,  LB_B,  LB_BH, LB_BS],
      /* 3 */ [LB_B,  LB_B,  LB_R,  LB_RG, LB_RG, LB_R,  LB_B,  LB_B ],
      /* 4 */ [LB_B,  LB_B,  LB_R,  LB_RG, LB_RG, LB_R,  LB_B,  LB_B ],
      /* 5 */ [LB_BS, LB_BS, LB_B,  LB_R,  LB_R,  LB_B,  LB_BS, LB_BS],
      /* 6 */ [C,     LB_BS, LB_BD, LB_B,  LB_B,  LB_BD, LB_BS, C    ],
      /* 7 */ [C,     C,     LB_BD, LB_BS, LB_BS, LB_BD, C,     C    ],
    ]);

    // Sundered Essence - congealed violet soul-light. Tier I: a single mote.
    const SE_D  = 0x4A148C;  // deep violet core
    const SE_M  = 0x7B1FA2;  // mid violet
    const SE_H  = 0xBA68C8;  // violet highlight
    const SE_G  = 0xE1BEE7;  // pale glow
    const SE_C  = 0xF3E5F5;  // bright core

    registerSpriteTexture('sundered_essence_i', [
      //       0      1      2      3      4      5
      /* 0 */ [C,     C,     C,     SE_G,  C,     C    ],
      /* 1 */ [C,     C,     SE_G,  SE_H,  SE_G,  C    ],
      /* 2 */ [C,     SE_G,  SE_H,  SE_C,  SE_H,  SE_G ],
      /* 3 */ [C,     SE_H,  SE_C,  SE_C,  SE_M,  SE_H ],
      /* 4 */ [SE_G,  SE_H,  SE_C,  SE_M,  SE_M,  SE_H ],
      /* 5 */ [SE_G,  SE_M,  SE_M,  SE_M,  SE_D,  SE_G ],
      /* 6 */ [C,     SE_G,  SE_M,  SE_D,  SE_D,  C    ],
      /* 7 */ [C,     C,     SE_G,  SE_D,  SE_G,  C    ],
      /* 8 */ [C,     C,     C,     SE_G,  C,     C    ],
    ]);

    // Sundered Essence II - twin coils, denser and brighter.
    registerSpriteTexture('sundered_essence_ii', [
      //       0      1      2      3      4      5      6      7
      /* 0 */ [C,     SE_G,  C,     C,     C,     C,     SE_G,  C    ],
      /* 1 */ [SE_G,  SE_H,  SE_G,  C,     C,     SE_G,  SE_H,  SE_G ],
      /* 2 */ [SE_H,  SE_C,  SE_H,  SE_G,  SE_G,  SE_H,  SE_C,  SE_H ],
      /* 3 */ [SE_C,  SE_C,  SE_M,  SE_H,  SE_H,  SE_M,  SE_C,  SE_C ],
      /* 4 */ [SE_H,  SE_M,  SE_M,  SE_C,  SE_C,  SE_M,  SE_M,  SE_H ],
      /* 5 */ [SE_G,  SE_M,  SE_D,  SE_M,  SE_M,  SE_D,  SE_M,  SE_G ],
      /* 6 */ [SE_H,  SE_C,  SE_M,  SE_D,  SE_D,  SE_M,  SE_C,  SE_H ],
      /* 7 */ [SE_C,  SE_C,  SE_M,  SE_H,  SE_H,  SE_M,  SE_C,  SE_C ],
      /* 8 */ [SE_H,  SE_M,  SE_G,  SE_G,  SE_G,  SE_G,  SE_M,  SE_H ],
      /* 9 */ [SE_G,  SE_D,  C,     C,     C,     C,     SE_D,  SE_G ],
      /* 10*/ [C,     SE_G,  C,     C,     C,     C,     SE_G,  C    ],
    ]);

    const TG_WRAP = 0x8D6E63;
    const TG_WRAP_H = 0xBCAAA4;
    registerSpriteTexture('tempest_grass_item', [
      [C,        C,        HERB_H,   HERB_H,   HERB,     C,        C,        C],
      [C,        HERB_H,   HERB,     HERB_CORE,HERB_H,   HERB,     C,        C],
      [HERB_H,   HERB,     HERB_CORE,HERB_H,   HERB,     HERB_CORE,HERB_H,   C],
      [C,        HERB_S,   HERB,     HERB_S,   HERB,     HERB_S,   C,        C],
      [C,        C,        TG_WRAP_H,TG_WRAP,  TG_WRAP_H,C,        C,        C],
      [C,        C,        TG_WRAP,  TG_WRAP_H,TG_WRAP,  C,        C,        C],
      [C,        C,        HERB_S,   HERB_S,   HERB_S,   C,        C,        C],
      [C,        C,        C,        HERB_S,   C,        C,        C,        C],
    ]);


    // Hay bale
    const HAY = 0xD4A017;
    const HAY_H = 0xE8B830;
    const HAY_S = 0xB8860B;
    registerSpriteTexture('hay_bale', [
      [HAY_S, HAY,   HAY_H, HAY,   HAY_H, HAY,   HAY_S],
      [HAY,   HAY_H, HAY,   HAY_S, HAY,   HAY_H, HAY],
      [HAY_S, HAY,   HAY_S, HAY,   HAY_S, HAY,   HAY_S],
      [HAY,   HAY_S, HAY,   HAY_H, HAY,   HAY_S, HAY],
    ]);

    // Lantern
    const LANT_METAL = 0x37474F;
    const LANT_GLASS = 0xFFEB3B;
    const LANT_GLOW = 0xFFF9C4;
    registerSpriteTexture('lantern', [
      [C,         C,         LANT_METAL,LANT_METAL,C,         C],
      [C,         LANT_METAL,LANT_GLOW, LANT_GLASS,LANT_METAL,C],
      [C,         LANT_METAL,LANT_GLASS,LANT_GLOW, LANT_METAL,C],
      [C,         C,         LANT_METAL,LANT_METAL,C,         C],
      [C,         C,         LANT_METAL,LANT_METAL,C,         C],
      [C,         C,         LANT_METAL,LANT_METAL,C,         C],
    ]);

    const SL_IRON = 0x37474F;
    const SL_IRON_H = 0x546E7A;
    const SL_AMBER = 0xFFD54F;
    const SL_GLOW = 0xFFF9C4;
    registerSpriteTexture('street_lamp', [
      [C,       C,       SL_IRON_H,SL_IRON, SL_IRON_H,C,       C,       C],
      [C,       SL_IRON, SL_GLOW,  SL_AMBER,SL_GLOW,  SL_IRON, C,       C],
      [C,       SL_IRON, SL_AMBER, SL_GLOW, SL_AMBER, SL_IRON, C,       C],
      [C,       C,       SL_IRON,  SL_IRON, SL_IRON,  C,       C,       C],
      [C,       C,       C,        SL_IRON, C,        C,       C,       C],
      [C,       C,       C,        SL_IRON, C,        C,       C,       C],
      [C,       C,       C,        SL_IRON, C,        C,       C,       C],
      [C,       C,       C,        SL_IRON_H,C,       C,       C,       C],
    ]);

    const IR_BAR = 0x37474F;
    const IR_H = 0x546E7A;
    const IR_TIP = 0x78909C;
    registerSpriteTexture('iron_railing', [
      [IR_TIP, C,      IR_TIP, C,      IR_TIP, C,      IR_TIP, C],
      [IR_BAR, C,      IR_BAR, C,      IR_BAR, C,      IR_BAR, C],
      [IR_BAR, IR_H,   IR_BAR, IR_H,   IR_BAR, IR_H,   IR_BAR, IR_H],
      [IR_BAR, C,      IR_BAR, C,      IR_BAR, C,      IR_BAR, C],
      [IR_H,   IR_BAR, IR_H,   IR_BAR, IR_H,   IR_BAR, IR_H,   IR_BAR],
    ]);

    const FN_STONE = 0x78909C;
    const FN_STONE_H = 0x90A4AE;
    const FN_STONE_S = 0x546E7A;
    const FN_WATER = 0x42A5F5;
    const FN_WATER_H = 0x90CAF9;
    registerSpriteTexture('fountain', [
      [C,        C,        FN_STONE_H,FN_STONE, FN_STONE_H,FN_STONE, C,        C],
      [C,        FN_STONE, FN_WATER_H,FN_WATER, FN_WATER_H,FN_WATER, FN_STONE, C],
      [FN_STONE_S,FN_WATER, FN_WATER_H,FN_STONE_H,FN_STONE_H,FN_WATER_H,FN_WATER, FN_STONE_S],
      [FN_STONE, FN_WATER_H,FN_WATER, FN_STONE, FN_STONE, FN_WATER, FN_WATER_H,FN_STONE],
      [FN_STONE_S,FN_WATER, FN_WATER_H,FN_STONE_S,FN_STONE_S,FN_WATER_H,FN_WATER, FN_STONE_S],
      [C,        FN_STONE, FN_WATER,  FN_WATER_H,FN_WATER, FN_WATER_H,FN_STONE, C],
      [C,        FN_STONE_S,FN_STONE, FN_STONE_S,FN_STONE, FN_STONE_S,FN_STONE_S,C],
      [C,        C,        FN_STONE_S,FN_STONE, FN_STONE_S,FN_STONE, C,        C],
    ]);

    const PL_STONE = 0x78909C;
    const PL_STONE_H = 0x90A4AE;
    const PL_STONE_S = 0x546E7A;
    registerSpriteTexture('pillar', [
      [C,        PL_STONE_H,PL_STONE, PL_STONE_H,PL_STONE, PL_STONE_H,C],
      [C,        PL_STONE,  PL_STONE_H,PL_STONE, PL_STONE_H,PL_STONE, C],
      [C,        C,         PL_STONE, PL_STONE_S,PL_STONE, C,        C],
      [C,        C,         PL_STONE_S,PL_STONE, PL_STONE_S,C,        C],
      [C,        C,         PL_STONE, PL_STONE_S,PL_STONE, C,        C],
      [C,        C,         PL_STONE_S,PL_STONE, PL_STONE_S,C,        C],
      [C,        PL_STONE,  PL_STONE_H,PL_STONE, PL_STONE_H,PL_STONE, C],
      [C,        PL_STONE_H,PL_STONE, PL_STONE_H,PL_STONE, PL_STONE_H,C],
    ]);

    const SG_METAL = 0x424242;
    const SG_METAL_H = 0x616161;
    const SG_DARK = 0x212121;
    registerSpriteTexture('sewer_grate', [
      [SG_METAL_H,SG_METAL, SG_METAL_H,SG_METAL, SG_METAL_H,SG_METAL, SG_METAL_H,SG_METAL],
      [SG_METAL,  SG_DARK,  SG_DARK,   SG_METAL, SG_DARK,   SG_DARK,  SG_METAL,  SG_METAL_H],
      [SG_METAL_H,SG_DARK,  SG_DARK,   SG_METAL_H,SG_DARK,  SG_DARK,  SG_METAL_H,SG_METAL],
      [SG_METAL,  SG_METAL_H,SG_METAL, SG_METAL, SG_METAL_H,SG_METAL, SG_METAL,  SG_METAL_H],
      [SG_METAL_H,SG_DARK,  SG_DARK,   SG_METAL, SG_DARK,   SG_DARK,  SG_METAL_H,SG_METAL],
      [SG_METAL,  SG_DARK,  SG_DARK,   SG_METAL_H,SG_DARK,  SG_DARK,  SG_METAL,  SG_METAL_H],
      [SG_METAL_H,SG_METAL, SG_METAL_H,SG_METAL, SG_METAL_H,SG_METAL, SG_METAL_H,SG_METAL],
    ]);

    const HS_IRON = 0x37474F;
    const HS_WOOD = 0x795548;
    const HS_WOOD_H = 0xA1887F;
    const HS_TEXT = 0xD7CCC8;
    registerSpriteTexture('hanging_sign', [
      [C,       HS_IRON, HS_IRON, C,       C,       HS_IRON, HS_IRON, C],
      [C,       C,       HS_IRON, C,       C,       HS_IRON, C,       C],
      [C,       HS_WOOD, HS_WOOD_H,HS_WOOD, HS_WOOD_H,HS_WOOD, HS_WOOD, C],
      [C,       HS_WOOD_H,HS_TEXT, HS_TEXT, HS_TEXT, HS_TEXT, HS_WOOD_H,C],
      [C,       HS_WOOD, HS_TEXT, HS_TEXT, HS_TEXT, HS_TEXT, HS_WOOD, C],
      [C,       HS_WOOD, HS_WOOD_H,HS_WOOD, HS_WOOD_H,HS_WOOD, HS_WOOD, C],
    ]);

    const WT_IRON = 0x37474F;
    const WT_FLAME = 0xFF8F00;
    const WT_FLAME_H = 0xFFD54F;
    const WT_FLAME_TIP = 0xFFF9C4;
    registerSpriteTexture('wall_torch', [
      [C,        C,        WT_FLAME_TIP,C,       C,       C],
      [C,        WT_FLAME_H,WT_FLAME, WT_FLAME_H,C,       C],
      [C,        WT_FLAME, WT_FLAME_H,WT_FLAME, C,       C],
      [C,        C,        WT_IRON,  WT_IRON, C,       C],
      [C,        C,        WT_IRON,  WT_IRON, C,       C],
      [C,        C,        WT_IRON,  C,       C,       C],
    ]);

    const AW_FABRIC = 0x8D6E63;
    const AW_FABRIC_H = 0xA1887F;
    const AW_FABRIC_S = 0x5D4037;
    const AW_STRIPE = 0xBCAAA4;
    registerSpriteTexture('awning', [
      [AW_FABRIC_S,AW_FABRIC, AW_STRIPE, AW_FABRIC_H,AW_STRIPE, AW_FABRIC, AW_FABRIC_H,AW_FABRIC_S],
      [AW_FABRIC,  AW_STRIPE, AW_FABRIC_H,AW_STRIPE, AW_FABRIC, AW_STRIPE, AW_FABRIC_H,AW_FABRIC],
      [AW_FABRIC_S,AW_FABRIC_H,AW_FABRIC, AW_FABRIC_S,AW_FABRIC_H,AW_FABRIC, AW_FABRIC_S,C],
      [C,          AW_FABRIC_S,AW_FABRIC, C,          AW_FABRIC_S,AW_FABRIC_S,C,          C],
      [C,          C,          AW_FABRIC_S,C,         C,          AW_FABRIC_S,C,          C],
    ]);

    const RB_STONE = 0x78909C;
    const RB_STONE_S = 0x546E7A;
    const RB_WOOD = 0x6D4C41;
    const RB_WOOD_H = 0x8D6E63;
    registerSpriteTexture('rubble', [
      [C,        C,        RB_STONE, C,        RB_WOOD,  C,        C,       C],
      [C,        RB_STONE_S,RB_STONE, RB_WOOD_H,RB_STONE, RB_STONE_S,C,      C],
      [RB_WOOD,  RB_STONE, RB_STONE_S,RB_STONE, RB_WOOD,  RB_STONE, RB_WOOD_H,C],
      [RB_STONE_S,RB_WOOD_H,RB_STONE, RB_STONE_S,RB_STONE, RB_STONE_S,RB_STONE, RB_STONE_S],
      [C,        RB_STONE, RB_STONE_S,RB_WOOD,  RB_STONE_S,RB_STONE, C,       C],
    ]);

    const BS_WOOD = 0x795548;
    const BS_WOOD_H = 0xA1887F;
    const BS_WOOD_S = 0x5D4037;
    const BS_PLANK = 0x8D6E63;
    registerSpriteTexture('broken_stall', [
      [C,        BS_WOOD,  BS_WOOD_H, BS_WOOD,  C,        C,        BS_WOOD_S, C],
      [BS_WOOD_S,BS_PLANK, BS_WOOD,   BS_PLANK, BS_WOOD_S,BS_PLANK, BS_WOOD,   C],
      [BS_WOOD,  BS_PLANK, BS_WOOD_S, BS_PLANK, BS_WOOD,  BS_PLANK, BS_WOOD_S, BS_WOOD],
      [BS_WOOD_S,BS_WOOD,  BS_PLANK,  BS_WOOD,  BS_WOOD_S,BS_WOOD,  BS_PLANK,  BS_WOOD_S],
      [C,        BS_WOOD_S,C,         C,        BS_WOOD_S,C,        C,         BS_WOOD],
      [C,        C,        C,         BS_WOOD,  C,        C,        BS_WOOD_S, C],
    ]);

    const CS_WOOD = 0x795548;
    const CS_WOOD_H = 0x8D6E63;
    const CS_WOOD_S = 0x5D4037;
    const CS_BAND = 0x546E7A;
    registerSpriteTexture('crate_stack', [
      [C,        CS_WOOD_S,CS_WOOD,  CS_WOOD_H,CS_WOOD,  CS_WOOD_S,C,        C],
      [C,        CS_WOOD,  CS_WOOD_S,CS_BAND,  CS_WOOD_S,CS_WOOD,  C,        C],
      [CS_WOOD_S,CS_WOOD,  CS_WOOD_H,CS_WOOD,  CS_WOOD_H,CS_WOOD,  CS_WOOD_S,C],
      [CS_WOOD,  CS_WOOD_H,CS_WOOD_S,CS_BAND,  CS_WOOD_S,CS_WOOD_H,CS_WOOD,  C],
      [CS_WOOD,  CS_BAND,  CS_WOOD,  CS_WOOD_S,CS_WOOD,  CS_BAND,  CS_WOOD,  C],
      [CS_WOOD_S,CS_WOOD,  CS_WOOD_H,CS_WOOD,  CS_WOOD_H,CS_WOOD,  CS_WOOD_S,C],
    ]);

    const BK_WOOD = 0x6D4C41;
    const BK_WOOD_H = 0x8D6E63;
    const BK_BAND = 0x546E7A;
    const BK_BAND_H = 0x78909C;
    registerSpriteTexture('barrel_stack', [
      [C,        BK_WOOD,  BK_WOOD_H,BK_WOOD,  BK_WOOD_H,BK_WOOD,  C,        C],
      [C,        BK_BAND,  BK_WOOD,  BK_WOOD_H,BK_WOOD,  BK_BAND,  C,        C],
      [BK_WOOD,  BK_WOOD_H,BK_WOOD,  BK_WOOD_H,BK_WOOD,  BK_WOOD_H,BK_WOOD,  C],
      [BK_BAND_H,BK_WOOD,  BK_WOOD_H,BK_WOOD,  BK_WOOD_H,BK_WOOD,  BK_BAND_H,C],
      [BK_WOOD,  BK_WOOD_H,BK_WOOD,  BK_BAND,  BK_WOOD,  BK_WOOD_H,BK_WOOD,  C],
      [C,        BK_WOOD,  BK_WOOD_H,BK_WOOD,  BK_WOOD_H,BK_WOOD,  C,        C],
    ]);

    const CH_BRICK = 0x8B4513;
    const CH_BRICK_H = 0xA0522D;
    const CH_MORTAR = 0xBCAAA4;
    const CH_SOOT = 0x424242;
    registerSpriteTexture('chimney', [
      [C,        CH_SOOT,  CH_SOOT,  CH_SOOT,  CH_SOOT,  C],
      [CH_BRICK, CH_BRICK_H,CH_MORTAR,CH_BRICK, CH_BRICK_H,CH_BRICK],
      [CH_BRICK_H,CH_MORTAR,CH_BRICK, CH_BRICK_H,CH_MORTAR,CH_BRICK_H],
      [CH_BRICK, CH_BRICK_H,CH_MORTAR,CH_BRICK, CH_BRICK_H,CH_BRICK],
      [CH_BRICK_H,CH_BRICK, CH_BRICK_H,CH_MORTAR,CH_BRICK, CH_BRICK_H],
      [CH_BRICK, CH_MORTAR,CH_BRICK_H,CH_BRICK, CH_MORTAR,CH_BRICK],
    ]);

    // Burning barricade - overturned carts, planks, crates and barrels piled across a
    // street and set alight. The citizens of Guilrhym tried to hold the dead back here.
    // Static silhouette (flame is baked into the pixels, matching campfire/wall_torch).
    const BB_FT = 0xFFEB3B; // flame tip (yellow)
    const BB_FM = 0xFF9800; // flame mid (orange)
    const BB_FD = 0xFF5722; // flame deep (red-orange)
    const BB_SM = 0x6F6F6F; // smoke
    const BB_SL = 0x9E9E9E; // smoke light
    const BB_WD = 0x5D4037; // wood
    const BB_WH = 0x8D6E63; // wood highlight
    const BB_WS = 0x3E2723; // wood shadow
    const BB_PL = 0x795548; // plank
    const BB_IR = 0x546E7A; // iron band / cart rim
    const BB_CH = 0x212121; // charred
    registerSpriteTexture('burning_barricade', [
      [C,    BB_SL, C,     C,     BB_SM, C,     C,     BB_SL, C,     C,     C    ],
      [C,    C,     BB_SM, C,     BB_FT, C,     BB_SM, C,     C,     C,     C    ],
      [C,    C,     BB_FT, BB_FM, BB_FT, BB_FM, C,     BB_FT, C,     C,     C    ],
      [C,    BB_FM, BB_FM, BB_FD, BB_FM, BB_FD, BB_FM, BB_FM, BB_FM, C,     C    ],
      [C,    BB_FD, BB_FM, BB_FD, BB_FD, BB_FM, BB_FD, BB_FM, BB_FD, BB_FM, C    ],
      [BB_WS,BB_PL, BB_WD, BB_CH, BB_PL, BB_WH, BB_PL, BB_CH, BB_WD, BB_PL, BB_WS],
      [BB_WD,BB_IR, BB_PL, BB_WH, BB_IR, BB_WD, BB_PL, BB_WH, BB_IR, BB_WD, BB_WH],
      [BB_PL,BB_WD, BB_WH, BB_PL, BB_WD, BB_WS, BB_WH, BB_PL, BB_WD, BB_WH, BB_PL],
      [BB_WS,BB_IR, BB_WD, BB_WH, BB_PL, BB_WD, BB_WH, BB_IR, BB_WD, BB_WS, BB_WD],
      [C,    BB_WS, BB_WD, BB_WS, BB_CH, BB_WS, BB_WD, BB_WS, BB_WD, BB_WS, C    ],
    ]);

    // Memorial column - a tall Victorian civic monument: a bronze figure / urn finial on a
    // pale-stone column rising from a stepped plinth. A vertical landmark to break the rooftops.
    const MC_ST = 0x9E9384; // civic stone
    const MC_SH = 0xC4BBA8; // stone highlight
    const MC_SS = 0x6E665A; // stone shadow
    const MC_DK = 0x4E483F; // deep shadow
    const MC_BZ = 0x7A6033; // bronze
    const MC_BH = 0x9A7D45; // bronze highlight
    registerSpriteTexture('memorial_column', [
      [C,    C,     MC_BZ, MC_BH, MC_BZ, C,     C    ],
      [C,    MC_BZ, MC_BH, MC_BZ, MC_BH, MC_BZ, C    ],
      [C,    C,     MC_BZ, MC_BZ, MC_BZ, C,     C    ],
      [C,    MC_SH, MC_ST, MC_SH, MC_ST, MC_SH, C    ],
      [C,    C,     MC_ST, MC_SH, MC_ST, C,     C    ],
      [C,    C,     MC_SS, MC_ST, MC_SH, C,     C    ],
      [C,    C,     MC_ST, MC_SH, MC_ST, C,     C    ],
      [C,    C,     MC_SS, MC_ST, MC_SH, C,     C    ],
      [C,    C,     MC_ST, MC_SH, MC_ST, C,     C    ],
      [C,    C,     MC_SS, MC_ST, MC_SH, C,     C    ],
      [C,    C,     MC_ST, MC_SH, MC_ST, C,     C    ],
      [C,    MC_SH, MC_ST, MC_SH, MC_ST, MC_SH, C    ],
      [C,    MC_SS, MC_ST, MC_ST, MC_ST, MC_SS, C    ],
      [MC_SH,MC_ST, MC_SH, MC_ST, MC_SH, MC_ST, MC_SH],
      [MC_SS,MC_ST, MC_ST, MC_ST, MC_ST, MC_ST, MC_SS],
      [MC_DK,MC_SS, MC_ST, MC_ST, MC_ST, MC_SS, MC_DK],
    ]);

    // ── DISTRICT FENCING KITS + HARD BLOCKER ─────────────────────────────────
    // Block-scoped so the local colour consts don't collide with method-scope names.
    {
    // Timber palisade - rough lashed stakes (slum / cathedral-approach wynds).
    const TP_W = 0x6D4C41, TP_H = 0x8D6E63, TP_S = 0x4E342E, TP_P = 0x795548, TP_T = 0x3E2723;
    registerSpriteTexture('timber_palisade', [
      [TP_S, C,    TP_W, C,    TP_S, C,    TP_W, C   ], // ragged pointed tops
      [TP_W, TP_S, TP_H, TP_S, TP_W, TP_S, TP_H, TP_S],
      [TP_H, TP_W, TP_P, TP_W, TP_H, TP_W, TP_P, TP_W],
      [TP_T, TP_W, TP_T, TP_W, TP_T, TP_W, TP_T, TP_W], // lashing band
      [TP_W, TP_P, TP_W, TP_P, TP_W, TP_P, TP_W, TP_P],
      [TP_S, TP_W, TP_S, TP_W, TP_S, TP_W, TP_S, TP_W],
    ]);
    // Low stone wall - dressed coursed stone with a capstone (west estates / civic gardens).
    const SW_S = 0x8A8A8A, SW_H = 0xAEAEAE, SW_D = 0x6E6E6E, SW_M = 0x5A5A5A, SW_C = 0xB0A89A;
    registerSpriteTexture('stone_low_wall', [
      [SW_C, SW_C, SW_C, SW_C, SW_C, SW_C, SW_C, SW_C], // capstone course
      [SW_S, SW_H, SW_M, SW_S, SW_H, SW_M, SW_S, SW_H],
      [SW_M, SW_S, SW_S, SW_M, SW_S, SW_S, SW_M, SW_S],
      [SW_S, SW_H, SW_M, SW_S, SW_H, SW_M, SW_S, SW_H],
      [SW_D, SW_M, SW_D, SW_D, SW_M, SW_D, SW_D, SW_M],
    ]);
    // Iron post-and-chain - slack chains slung between posts (east docks / quays).
    const CF_P = 0x37474F, CF_H = 0x546E7A, CF_C = 0x607D8B;
    registerSpriteTexture('chain_fence', [
      [CF_H, C,    C,    C,    C,    C,    C,    CF_H],
      [CF_P, C,    C,    C,    C,    C,    C,    CF_P],
      [CF_P, CF_C, CF_C, CF_C, CF_C, CF_C, CF_C, CF_P], // top chain
      [CF_P, C,    CF_C, C,    CF_C, C,    CF_C, CF_P], // sag
      [CF_P, CF_C, CF_C, CF_C, CF_C, CF_C, CF_C, CF_P], // lower chain
      [CF_P, C,    C,    C,    C,    C,    C,    CF_P],
    ]);

    // ── HARD STREET BLOCKER ──────────────────────────────────────────────────
    // Collapsed masonry - a caved-in mound of broken stone blocks, mortar and snapped
    // timber that seals a street outright (the city's answer to a hill or river).
    const CM_S = 0x78909C, CM_D = 0x546E7A, CM_K = 0x37474F, CM_W = 0x6D4C41, CM_L = 0x90A4AE, CM_M = 0xB0A89A;
    registerSpriteTexture('collapsed_masonry', [
      [C,    C,    C,    CM_S, C,    CM_S, C,    C,    CM_S, C,    C,    C   ],
      [C,    C,    CM_S, CM_L, CM_S, CM_D, CM_S, CM_S, CM_D, CM_S, C,    C   ],
      [C,    CM_D, CM_S, CM_M, CM_S, CM_S, CM_L, CM_S, CM_S, CM_D, CM_S, C   ],
      [CM_S, CM_S, CM_L, CM_S, CM_W, CM_S, CM_S, CM_M, CM_S, CM_S, CM_D, CM_S],
      [CM_D, CM_S, CM_S, CM_D, CM_S, CM_K, CM_S, CM_S, CM_L, CM_S, CM_S, CM_D],
      [CM_S, CM_L, CM_S, CM_S, CM_W, CM_S, CM_M, CM_S, CM_S, CM_D, CM_S, CM_S],
      [CM_K, CM_S, CM_D, CM_S, CM_S, CM_D, CM_S, CM_K, CM_S, CM_S, CM_D, CM_K],
      [CM_S, CM_D, CM_S, CM_K, CM_S, CM_S, CM_K, CM_S, CM_D, CM_S, CM_K, CM_S],
      [CM_D, CM_K, CM_S, CM_D, CM_K, CM_S, CM_D, CM_K, CM_S, CM_D, CM_K, CM_D],
    ]);

    // ── CAVE MOUTH ───────────────────────────────────────────────────────────
    // A dark opening in a mossy rock face - the bespoke cliff cave entrance/exit.
    const CV_R = 0x6E6E6E, CV_H = 0x8A8A8A, CV_S = 0x4E4E4E, CV_D = 0x3A3A3A;
    const CV_V = 0x141414, CV_VD = 0x0A0A0A, CV_M = 0x4A5C3A;
    registerSpriteTexture('cave_mouth', [
      [C,    C,    CV_S, CV_R, CV_R, CV_H, CV_H, CV_R, CV_R, CV_S, C,    C   ],
      [C,    CV_S, CV_R, CV_H, CV_R, CV_M, CV_R, CV_R, CV_H, CV_R, CV_S, C   ],
      [CV_S, CV_R, CV_H, CV_M, CV_V, CV_V, CV_V, CV_V, CV_M, CV_H, CV_R, CV_S],
      [CV_R, CV_H, CV_M, CV_V, CV_VD,CV_VD,CV_VD,CV_VD,CV_V, CV_M, CV_H, CV_R],
      [CV_R, CV_S, CV_V, CV_VD,CV_VD,CV_VD,CV_VD,CV_VD,CV_VD,CV_V, CV_S, CV_R],
      [CV_R, CV_S, CV_V, CV_VD,CV_VD,CV_VD,CV_VD,CV_VD,CV_VD,CV_V, CV_S, CV_R],
      [CV_R, CV_S, CV_V, CV_VD,CV_VD,CV_VD,CV_VD,CV_VD,CV_VD,CV_V, CV_S, CV_R],
      [CV_S, CV_R, CV_S, CV_V, CV_VD,CV_VD,CV_VD,CV_VD,CV_V, CV_S, CV_R, CV_S],
      [CV_D, CV_S, CV_R, CV_S, CV_V, CV_VD,CV_VD,CV_V, CV_S, CV_R, CV_S, CV_D],
      [C,    CV_D, CV_S, CV_R, CV_S, CV_V, CV_V, CV_S, CV_R, CV_S, CV_D, C   ],
      [C,    C,    CV_D, CV_S, CV_R, CV_R, CV_R, CV_R, CV_S, CV_D, C,    C   ],
    ]);
    }
  }
}
