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
  private textureLoader: THREE.TextureLoader;
  private textureDataUrls: Map<string, string>;

  constructor() {
    this.textures = new Map();
    this.textureGenerators = new Map();
    this.textureLoader = new THREE.TextureLoader();
    this.textureDataUrls = new Map();
  }

  createColorTexture(color: number, width: number = 32, height: number = 32, pattern?: 'noise' | 'checker' | 'gradient'): THREE.Texture {
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
    } else if (pattern === 'gradient') {
      for (let y = 0; y < height; y++) {
        const factor = y / height * 0.3;
        ctx.fillStyle = `rgba(0,0,0,${factor})`;
        ctx.fillRect(0, y, width, 1);
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
    colors: number[][],
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
    },
    spriteId?: string,
    bladeOnly: boolean = false
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

    // Helper: draw a cell at grid position
    const cell = (gx: number, gy: number, color: number) => {
      ctx.fillStyle = hex(color);
      ctx.fillRect(gx * G, gy * G, G, G);
    };

    // Animation
    const walkLeg = state === 'walk' ? (frame === 0 ? -1 : 1) : 0;
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
      // Sword - traditional short sword
      const BLADE = 0xC0D0E0;
      const BLADE_H = 0xF0F4FF;
      const BLADE_E = 0x90A8C0;
      const GUARD = 0xE8C030;
      const GRIP = 0x5D4037;
      if (atkFrame === 0) {
        // Wind-up: sword raised high behind head
        cell(m(7), 0 + bob, BLADE_H); cell(m(8), 1 + bob, BLADE); cell(m(9), 2 + bob, BLADE_E);
        cell(m(8), 0 + bob, BLADE_H); cell(m(9), 1 + bob, BLADE);
        cell(m(8), 2 + bob, GUARD); cell(m(7), 2 + bob, GUARD);
        cell(m(7), 3 + bob, GRIP); cell(m(7), 4 + bob, GRIP);
      } else if (atkFrame === 1) {
        // Mid-swing: sword coming down
        cell(m(2), 2 + bob, BLADE_H); cell(m(3), 3 + bob, BLADE); cell(m(4), 4 + bob, BLADE_E);
        cell(m(3), 2 + bob, BLADE_H); cell(m(4), 3 + bob, BLADE);
        cell(m(4), 5 + bob, GUARD); cell(m(3), 5 + bob, GUARD);
        cell(m(3), 6 + bob, GRIP);
      } else if (atkFrame === 2) {
        // Follow-through: swept low
        cell(m(1), 7 + bob, BLADE_H); cell(m(2), 8 + bob, BLADE); cell(m(3), 9 + bob, BLADE_E);
        cell(m(2), 7 + bob, BLADE_H); cell(m(3), 8 + bob, BLADE);
        cell(m(3), 10 + bob, GUARD); cell(m(2), 10 + bob, GUARD);
        cell(m(2), 11 + bob, GRIP);
      } else if (isBlock) {
        // Block: sword raised slightly from idle stance - defensive guard
        // Same position as idle but shifted up 1 row
        cell(m(3), 2 + bob, BLADE_H); cell(m(4), 3 + bob, BLADE); cell(m(5), 4 + bob, BLADE_E);
        cell(m(3), 3 + bob, BLADE_H); cell(m(4), 4 + bob, BLADE);
        cell(m(2), 6 + bob, GUARD); cell(m(3), 6 + bob, GUARD); cell(m(4), 6 + bob, GUARD); cell(m(5), 6 + bob, GUARD);
        cell(m(4), 7 + bob, GRIP); cell(m(4), 8 + bob, GRIP);
        cell(m(4), 9 + bob, GUARD);
      } else {
        // Idle: resting at side, traditional short sword
        // Blade
        cell(m(3), 3 + bob, BLADE_H); cell(m(4), 4 + bob, BLADE); cell(m(5), 5 + bob, BLADE_E);
        cell(m(3), 4 + bob, BLADE_H); cell(m(4), 5 + bob, BLADE);
        cell(m(3), 5 + bob, BLADE_H); cell(m(4), 6 + bob, BLADE);
        
        // Guard
        cell(m(2), 7 + bob, GUARD); cell(m(3), 7 + bob, GUARD); cell(m(4), 7 + bob, GUARD); cell(m(5), 7 + bob, GUARD);
        
        // Grip & Pommel
        cell(m(4), 8 + bob, GRIP);
        cell(m(4), 9 + bob, GRIP);
        cell(m(4), 10 + bob, GUARD);
        cell(m(4), 9 + bob, GRIP);
        cell(m(4), 10 + bob, GUARD); // Pommel
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
      cell(m(7), -1 < 0 ? 0 : 0, p.hair);
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

      // Sword (front view) - traditional short sword
      const BLADE = 0xC0D0E0;
      const BLADE_H = 0xF0F4FF;
      const BLADE_E = 0x90A8C0;
      const GUARD = 0xE8C030;
      const GRIP = 0x5D4037;
      if (atkFrame === 0) {
        // Wind-up: sword raised overhead
        cell(5, 0 + bob, BLADE_H); cell(6, 0 + bob, BLADE); cell(7, 0 + bob, BLADE_E);
        cell(5, 1 + bob, BLADE_H); cell(6, 1 + bob, BLADE);
        cell(8, 0 + bob, GUARD); cell(7, 0 + bob, GUARD);
        cell(7, 1 + bob, GRIP);
      } else if (atkFrame === 1) {
        // Mid-swing: sword coming down
        cell(1, 3 + bob, BLADE_H); cell(2, 4 + bob, BLADE); cell(3, 5 + bob, BLADE_E);
        cell(2, 3 + bob, BLADE_H); cell(3, 4 + bob, BLADE);
        cell(4, 6 + bob, GUARD); cell(3, 6 + bob, GUARD);
        cell(3, 7 + bob, GRIP);
      } else if (atkFrame === 2) {
        // Follow-through: sword swept low
        cell(1, 9 + bob, BLADE_H); cell(2, 10 + bob, BLADE); cell(3, 11 + bob, BLADE_E);
        cell(2, 9 + bob, BLADE_H); cell(3, 10 + bob, BLADE);
        cell(4, 12 + bob, GUARD); cell(3, 12 + bob, GUARD);
        cell(3, 13 + bob, GRIP);
      } else if (isBlock) {
        // Block: sword raised slightly from idle - defensive guard
        // Same as idle but shifted up 1 row
        cell(2, 3 + bob, BLADE_H); cell(3, 4 + bob, BLADE); cell(4, 5 + bob, BLADE_E);
        cell(2, 4 + bob, BLADE_H); cell(3, 5 + bob, BLADE);
        cell(2, 5 + bob, BLADE_H); cell(3, 6 + bob, BLADE);
        cell(1, 7 + bob, GUARD); cell(2, 7 + bob, GUARD); cell(3, 7 + bob, GUARD); cell(4, 7 + bob, GUARD);
        cell(3, 8 + bob, GRIP);
        cell(3, 9 + bob, GRIP);
        cell(3, 10 + bob, GUARD);
      } else {
        // Idle: resting at left side, traditional short sword
        // Blade
        cell(2, 4 + bob, BLADE_H); cell(3, 5 + bob, BLADE); cell(4, 6 + bob, BLADE_E);
        cell(2, 5 + bob, BLADE_H); cell(3, 6 + bob, BLADE);
        cell(2, 6 + bob, BLADE_H); cell(3, 7 + bob, BLADE);
        
        // Guard
        cell(1, 8 + bob, GUARD); cell(2, 8 + bob, GUARD); cell(3, 8 + bob, GUARD); cell(4, 8 + bob, GUARD);
        
        // Grip & Pommel
        cell(3, 9 + bob, GRIP);
        cell(3, 10 + bob, GRIP);
        cell(3, 11 + bob, GUARD); // Pommel
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
    return this.textureDataUrls.get(id) || null;
  }

  getPalette(id: string): Record<string, number> {
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

    const mirrorSprite = (sprite: number[][]): number[][] => {
      return sprite.map(row => [...row].reverse());
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
          this.registerTexture(spriteId, () => this.createChibiCharacter(d, s, fr, heroPalette, spriteId));
          this.registerTexture(bladeId, () => this.createChibiCharacter(d, s, fr, heroPalette, bladeId, true));
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
    this.registerTexture('npc_elder', () => this.createChibiCharacter('down', 'idle', 0, elderPalette, 'npc_elder'));

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
    this.registerTexture('npc_merchant', () => this.createChibiCharacter('down', 'idle', 0, merchantPalette, 'npc_merchant'));

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
    this.registerTexture('npc_blacksmith', () => this.createChibiCharacter('down', 'idle', 0, blacksmithPalette, 'npc_blacksmith'));

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
    this.registerTexture('npc_healer', () => this.createChibiCharacter('down', 'idle', 0, healerPalette, 'npc_healer'));

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
    this.registerTexture('npc_farmer', () => this.createChibiCharacter('down', 'idle', 0, farmerPalette, 'npc_farmer'));

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
    this.registerTexture('npc_child', () => this.createChibiCharacter('down', 'idle', 0, childPalette, 'npc_child'));

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
    this.registerTexture('enemy_spider_telegraph', () => this.getTexture('enemy_spider')!);
    this.registerTexture('enemy_spider_attack', () => this.getTexture('enemy_spider')!);

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
    this.registerTexture('enemy_slime_telegraph', () => this.getTexture('enemy_slime')!);
    this.registerTexture('enemy_slime_attack', () => this.getTexture('enemy_slime')!);

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

    const SHADOW_BODY = 0x311B92;
    const SHADOW_BODY_H = 0x4527A0;
    const SHADOW_BODY_S = 0x1A0A5E;
    const SHADOW_EYE = 0xFF1744;
    const SHADOW_GLOW = 0xD500F9;
    const SHADOW_WISP = 0x7C4DFF;

    this.registerTexture('enemy_shadow', () => this.createSpriteTexture([
      [C,          C,           SHADOW_WISP, SHADOW_BODY_H,SHADOW_BODY_H,SHADOW_BODY_H,SHADOW_WISP,C,          C,          C],
      [C,          SHADOW_BODY, SHADOW_BODY_H,SHADOW_EYE,  SHADOW_BODY, SHADOW_EYE,   SHADOW_BODY_H,SHADOW_BODY,C,         C],
      [C,          SHADOW_BODY_S,SHADOW_BODY,SHADOW_BODY,  SHADOW_GLOW, SHADOW_BODY,  SHADOW_BODY,SHADOW_BODY_S,C,         C],
      [SHADOW_WISP,SHADOW_BODY, SHADOW_BODY_S,SHADOW_BODY,SHADOW_BODY_S,SHADOW_BODY, SHADOW_BODY_S,SHADOW_BODY,SHADOW_WISP,C],
      [C,          SHADOW_BODY_S,SHADOW_BODY,SHADOW_BODY,  SHADOW_BODY, SHADOW_BODY,  SHADOW_BODY,SHADOW_BODY_S,C,         C],
      [C,          C,           SHADOW_BODY_S,SHADOW_BODY, SHADOW_BODY_S,SHADOW_BODY, SHADOW_BODY_S,C,          C,         C],
      [C,          C,           SHADOW_WISP, SHADOW_BODY_S,SHADOW_BODY,  SHADOW_BODY_S,SHADOW_WISP,C,          C,         C],
      [C,          SHADOW_WISP, C,           C,            SHADOW_WISP,  C,            C,          SHADOW_WISP,C,         C],
    ], 4, 'enemy_shadow'));

    const SHADOW_EYE_GLOW = 0xFF5252;
    const SHADOW_CHARGE = 0xEA80FC;
    this.registerTexture('enemy_shadow_telegraph', () => this.createSpriteTexture([
      [SHADOW_CHARGE,C,       SHADOW_WISP, SHADOW_BODY_H,SHADOW_BODY_H,SHADOW_BODY_H,SHADOW_WISP,C,         SHADOW_CHARGE,C],
      [C,          SHADOW_BODY, SHADOW_BODY_H,SHADOW_EYE_GLOW,SHADOW_BODY,SHADOW_EYE_GLOW,SHADOW_BODY_H,SHADOW_BODY,C,C],
      [C,          SHADOW_BODY_S,SHADOW_CHARGE,SHADOW_BODY,SHADOW_GLOW,SHADOW_BODY,SHADOW_CHARGE,SHADOW_BODY_S,C,  C],
      [SHADOW_CHARGE,SHADOW_BODY,SHADOW_BODY_S,SHADOW_CHARGE,SHADOW_GLOW,SHADOW_CHARGE,SHADOW_BODY_S,SHADOW_BODY,SHADOW_CHARGE,C],
      [C,          SHADOW_BODY_S,SHADOW_BODY,SHADOW_BODY,SHADOW_BODY,SHADOW_BODY,SHADOW_BODY,SHADOW_BODY_S,C,     C],
      [C,          C,           SHADOW_BODY_S,SHADOW_BODY,SHADOW_BODY_S,SHADOW_BODY,SHADOW_BODY_S,C,        C,     C],
      [C,          C,           SHADOW_WISP, SHADOW_BODY_S,SHADOW_BODY,SHADOW_BODY_S,SHADOW_WISP,C,         C,     C],
      [C,          SHADOW_WISP, C,           C,           SHADOW_WISP, C,           C,          SHADOW_WISP,C,     C],
    ], 4, 'enemy_shadow_telegraph'));

    this.registerTexture('enemy_shadow_attack', () => this.createSpriteTexture([
      [C,          SHADOW_WISP, SHADOW_CHARGE,SHADOW_BODY_H,SHADOW_BODY_H,SHADOW_BODY_H,SHADOW_CHARGE,SHADOW_WISP,C,C],
      [SHADOW_WISP,SHADOW_BODY, SHADOW_BODY_H,SHADOW_EYE_GLOW,SHADOW_GLOW,SHADOW_EYE_GLOW,SHADOW_BODY_H,SHADOW_BODY,SHADOW_WISP,C],
      [SHADOW_CHARGE,SHADOW_BODY_S,SHADOW_BODY,SHADOW_GLOW,SHADOW_CHARGE,SHADOW_GLOW,SHADOW_BODY,SHADOW_BODY_S,SHADOW_CHARGE,C],
      [SHADOW_WISP,SHADOW_BODY,SHADOW_BODY_S,SHADOW_BODY,SHADOW_BODY_S,SHADOW_BODY,SHADOW_BODY_S,SHADOW_BODY,SHADOW_WISP,C],
      [C,          SHADOW_BODY_S,SHADOW_BODY,SHADOW_BODY,SHADOW_BODY,SHADOW_BODY,SHADOW_BODY,SHADOW_BODY_S,C,         C],
      [C,          C,           SHADOW_BODY_S,SHADOW_BODY,SHADOW_BODY_S,SHADOW_BODY,SHADOW_BODY_S,C,        C,         C],
      [C,          C,           SHADOW_WISP, SHADOW_BODY_S,SHADOW_BODY,SHADOW_BODY_S,SHADOW_WISP,C,         C,         C],
      [C,          SHADOW_WISP, C,           C,           SHADOW_WISP, C,           C,          SHADOW_WISP,C,         C],
    ], 4, 'enemy_shadow_attack'));

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
        const frames = state === 'attack' || state === 'charge' ? 3 : state === 'walk' ? 2 : 1;
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
        const frames = state === 'attack' || state === 'charge' ? 3 : state === 'walk' ? 2 : 1;
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

    this.registerTexture('enemy_golem', () => this.createSpriteTexture([
      [C,    C,    C,    GOL_S,GOL, GOL_H,GOL, GOL_S,C,    C,    C,    C],
      [C,    C,    GOL_S,GOL,  GOL_H,GOL, GOL, GOL_H,GOL, GOL_S,C,    C],
      [C,    GOL_S,GOL,  GOL_EYE,GOL_D,GOL,GOL,GOL_D,GOL_EYE,GOL,GOL_S,C],
      [C,    GOL,  GOL_D,GOL,  GOL_RUNE,GOL_D,GOL_D,GOL_RUNE,GOL,GOL_D,GOL,C],
      [GOL_S,GOL,  GOL_H,GOL_D,GOL, GOL, GOL, GOL, GOL_D,GOL_H,GOL,GOL_S],
      [GOL,  GOL_H,GOL,  GOL,  GOL_RUNE,GOL_D,GOL_D,GOL_RUNE,GOL,GOL,GOL_H,GOL],
      [GOL_S,GOL,  GOL_D,GOL,  GOL, GOL, GOL, GOL, GOL, GOL_D,GOL,GOL_S],
      [C,    GOL_D,GOL,  GOL_D,GOL, GOL_D,GOL_D,GOL, GOL_D,GOL,GOL_D,C],
      [C,    C,    GOL_S,GOL,  GOL_D,C,   C,   GOL_D,GOL, GOL_S,C,    C],
      [C,    C,    GOL_D,GOL_S,GOL,  C,   C,   GOL, GOL_S,GOL_D,C,    C],
    ], 4, 'enemy_golem'));

    this.registerTexture('enemy_golem_telegraph', () => this.getTexture('enemy_golem')!);
    this.registerTexture('enemy_golem_attack', () => this.getTexture('enemy_golem')!);

    // ========== Interaction indicator sprite ==========
    this.textures.set('interact_indicator', this.createSpriteTexture([
      [C,       C,       0xFFD700,0xFFD700,C,       C],
      [C,       0xFFD700,0xFFF9C4,0xFFF9C4,0xFFD700,C],
      [0xFFD700,0xFFF9C4,0xFFFFFF,0xFFFFFF,0xFFF9C4,0xFFD700],
      [0xFFD700,0xFFF9C4,0xFFFFFF,0xFFFFFF,0xFFF9C4,0xFFD700],
      [C,       0xFFD700,0xFFF9C4,0xFFF9C4,0xFFD700,C],
      [C,       C,       0xFFD700,0xFFD700,C,       C],
    ], 4, 'interact_indicator'));

    // ========== TERRAIN ==========
    this.textures.set('grass', this.createColorTexture(0x4CAF50, 32, 32, 'noise'));
    this.textures.set('dirt', this.createColorTexture(0x8D6E63, 32, 32, 'noise'));
    this.textures.set('water', this.createColorTexture(0x1E88E5, 32, 32, 'noise'));
    this.textures.set('stone', this.createColorTexture(0x897060, 32, 32, 'checker'));
    this.textures.set('wood', this.createColorTexture(0x795548, 32, 32, 'gradient'));
    this.textures.set('tall_grass', this.createColorTexture(0x388E3C, 32, 32, 'noise'));
    this.textures.set('sand', this.createColorTexture(0xF5DEB3, 32, 32, 'noise'));
    this.textures.set('swamp', this.createColorTexture(0x556B2F, 32, 32, 'noise'));
    this.textures.set('bridge', this.createColorTexture(0x8D6E63, 32, 32, 'checker'));
    this.textures.set('lava', this.createColorTexture(0xE65100, 32, 32, 'noise'));
    this.textures.set('ice', this.createColorTexture(0xB3E5FC, 32, 32, 'checker'));
    this.textures.set('pressure_plate', this.createColorTexture(0x607D8B, 32, 32, 'checker'));
    this.textures.set('hidden_wall', this.createColorTexture(0x78909C, 32, 32, 'checker'));
    this.textures.set('push_block', this.createColorTexture(0x5D4037, 32, 32, 'gradient'));
    this.textures.set('switch_door', this.createColorTexture(0x4E342E, 32, 32, 'gradient'));
    this.textures.set('volcanic_rock', this.createColorTexture(0x3E2723, 32, 32, 'noise'));
    this.textures.set('ash', this.createColorTexture(0x616161, 32, 32, 'noise'));
    this.textures.set('ruins_floor', this.createColorTexture(0x6D4C41, 32, 32, 'checker'));
    this.textures.set('waterfall', this.createColorTexture(0x42A5F5, 32, 32, 'noise'));
    this.textures.set('snow', this.createColorTexture(0xECEFF1, 32, 32, 'noise'));
    
    // New terrain tiles — cleaner, higher-contrast cliff set
    const CLIFF_GRASS    = 0x81C784; // vivid grass cap
    const CLIFF_GRASS_D  = 0x558B2F; // dark grass edge below cap
    const CLIFF_SOIL     = 0x6D4C41; // dark soil band
    const CLIFF_TOP_RIM  = 0xC8A97E; // warm sandy stone — the overhang lip
    const CLIFF_STRATA_H = 0xA0877A; // lighter rock highlight
    const CLIFF_STRATA   = 0x7B6460; // mid rock face
    const CLIFF_STRATA_D = 0x4E3A36; // dark strata seam
    const CLIFF_SHADOW   = 0x2C211E; // deep base shadow
    const STAIRS_STONE   = 0xB0BEC5;
    const STAIRS_STONE_H = 0xECEFF1;
    const STAIRS_STONE_S = 0x546E7A;
    const STAIRS_EDGE    = 0xFFFFFF; // bright tread edge

    // cliff_edge: the TOP of the cliff — shows grass cap, soil band, overhang, then rock face.
    // Top rows are opaque grass so the sky-blue scene background never bleeds through.
    this.textures.set('cliff_edge', this.createSpriteTexture([
      [CLIFF_GRASS,CLIFF_GRASS,CLIFF_GRASS_D,CLIFF_GRASS,CLIFF_GRASS,CLIFF_GRASS,CLIFF_GRASS_D,CLIFF_GRASS,CLIFF_GRASS,CLIFF_GRASS,CLIFF_GRASS_D,CLIFF_GRASS],
      [CLIFF_GRASS,CLIFF_GRASS_D,CLIFF_GRASS,CLIFF_GRASS,CLIFF_GRASS_D,CLIFF_GRASS,CLIFF_GRASS,CLIFF_GRASS_D,CLIFF_GRASS,CLIFF_GRASS,CLIFF_GRASS,CLIFF_GRASS_D],
      [CLIFF_GRASS,CLIFF_GRASS,CLIFF_GRASS_D,CLIFF_GRASS,CLIFF_GRASS,CLIFF_GRASS_D,CLIFF_GRASS,CLIFF_GRASS,CLIFF_GRASS_D,CLIFF_GRASS,CLIFF_GRASS,CLIFF_GRASS],
      [CLIFF_SOIL,CLIFF_SOIL,CLIFF_SOIL,CLIFF_SOIL,CLIFF_SOIL,CLIFF_SOIL,CLIFF_SOIL,CLIFF_SOIL,CLIFF_SOIL,CLIFF_SOIL,CLIFF_SOIL,CLIFF_SOIL],
      [CLIFF_TOP_RIM,CLIFF_TOP_RIM,CLIFF_TOP_RIM,CLIFF_TOP_RIM,CLIFF_TOP_RIM,CLIFF_TOP_RIM,CLIFF_TOP_RIM,CLIFF_TOP_RIM,CLIFF_TOP_RIM,CLIFF_TOP_RIM,CLIFF_TOP_RIM,CLIFF_TOP_RIM],
      [CLIFF_STRATA_H,CLIFF_STRATA_H,CLIFF_STRATA,CLIFF_STRATA,CLIFF_STRATA_H,CLIFF_STRATA,CLIFF_STRATA_H,CLIFF_STRATA,CLIFF_STRATA_H,CLIFF_STRATA,CLIFF_STRATA_H,CLIFF_STRATA],
      [CLIFF_STRATA,CLIFF_STRATA,CLIFF_STRATA_D,CLIFF_STRATA,CLIFF_STRATA,CLIFF_STRATA_D,CLIFF_STRATA,CLIFF_STRATA,CLIFF_STRATA_D,CLIFF_STRATA,CLIFF_STRATA,CLIFF_STRATA_D],
      [CLIFF_STRATA_D,CLIFF_STRATA_D,CLIFF_STRATA_D,CLIFF_STRATA_D,CLIFF_STRATA_D,CLIFF_STRATA_D,CLIFF_STRATA_D,CLIFF_STRATA_D,CLIFF_STRATA_D,CLIFF_STRATA_D,CLIFF_STRATA_D,CLIFF_STRATA_D],
      [CLIFF_STRATA_H,CLIFF_STRATA,CLIFF_STRATA,CLIFF_STRATA_H,CLIFF_STRATA,CLIFF_STRATA,CLIFF_STRATA_H,CLIFF_STRATA,CLIFF_STRATA,CLIFF_STRATA_H,CLIFF_STRATA,CLIFF_STRATA],
      [CLIFF_STRATA,CLIFF_STRATA_D,CLIFF_STRATA,CLIFF_STRATA,CLIFF_STRATA_D,CLIFF_STRATA,CLIFF_STRATA,CLIFF_STRATA_D,CLIFF_STRATA,CLIFF_STRATA,CLIFF_STRATA_D,CLIFF_STRATA],
      [CLIFF_STRATA_D,CLIFF_STRATA_D,CLIFF_STRATA_D,CLIFF_STRATA_D,CLIFF_STRATA_D,CLIFF_STRATA_D,CLIFF_STRATA_D,CLIFF_STRATA_D,CLIFF_STRATA_D,CLIFF_STRATA_D,CLIFF_STRATA_D,CLIFF_STRATA_D],
      [CLIFF_STRATA_H,CLIFF_STRATA,CLIFF_STRATA_H,CLIFF_STRATA,CLIFF_STRATA,CLIFF_STRATA_H,CLIFF_STRATA,CLIFF_STRATA,CLIFF_STRATA_H,CLIFF_STRATA,CLIFF_STRATA,CLIFF_STRATA_H],
      [CLIFF_STRATA,CLIFF_STRATA_D,CLIFF_STRATA,CLIFF_STRATA,CLIFF_STRATA_D,CLIFF_STRATA,CLIFF_STRATA,CLIFF_STRATA_D,CLIFF_STRATA,CLIFF_STRATA,CLIFF_STRATA_D,CLIFF_STRATA],
      [CLIFF_SHADOW,CLIFF_SHADOW,CLIFF_SHADOW,CLIFF_SHADOW,CLIFF_SHADOW,CLIFF_SHADOW,CLIFF_SHADOW,CLIFF_SHADOW,CLIFF_SHADOW,CLIFF_SHADOW,CLIFF_SHADOW,CLIFF_SHADOW],
      [CLIFF_SHADOW,CLIFF_SHADOW,CLIFF_SHADOW,CLIFF_SHADOW,CLIFF_SHADOW,CLIFF_SHADOW,CLIFF_SHADOW,CLIFF_SHADOW,CLIFF_SHADOW,CLIFF_SHADOW,CLIFF_SHADOW,CLIFF_SHADOW],
      [CLIFF_SHADOW,CLIFF_SHADOW,CLIFF_SHADOW,CLIFF_SHADOW,CLIFF_SHADOW,CLIFF_SHADOW,CLIFF_SHADOW,CLIFF_SHADOW,CLIFF_SHADOW,CLIFF_SHADOW,CLIFF_SHADOW,CLIFF_SHADOW],
    ], 4, 'cliff_edge'));

    // cliff: the BODY tile below cliff_edge — pure rock face with strata lines.
    // Top rows opaque to prevent sky bleed-through.
    this.textures.set('cliff', this.createSpriteTexture([
      [CLIFF_STRATA_H,CLIFF_STRATA,CLIFF_STRATA,CLIFF_STRATA_H,CLIFF_STRATA,CLIFF_STRATA,CLIFF_STRATA_H,CLIFF_STRATA,CLIFF_STRATA,CLIFF_STRATA_H,CLIFF_STRATA,CLIFF_STRATA],
      [CLIFF_STRATA,CLIFF_STRATA_D,CLIFF_STRATA,CLIFF_STRATA,CLIFF_STRATA_D,CLIFF_STRATA,CLIFF_STRATA,CLIFF_STRATA_D,CLIFF_STRATA,CLIFF_STRATA,CLIFF_STRATA_D,CLIFF_STRATA],
      [CLIFF_STRATA_D,CLIFF_STRATA_D,CLIFF_STRATA_D,CLIFF_STRATA_D,CLIFF_STRATA_D,CLIFF_STRATA_D,CLIFF_STRATA_D,CLIFF_STRATA_D,CLIFF_STRATA_D,CLIFF_STRATA_D,CLIFF_STRATA_D,CLIFF_STRATA_D],
      [CLIFF_STRATA_H,CLIFF_STRATA_H,CLIFF_STRATA,CLIFF_STRATA,CLIFF_STRATA_H,CLIFF_STRATA,CLIFF_STRATA_H,CLIFF_STRATA,CLIFF_STRATA,CLIFF_STRATA_H,CLIFF_STRATA,CLIFF_STRATA_H],
      [CLIFF_STRATA,CLIFF_STRATA,CLIFF_STRATA_D,CLIFF_STRATA,CLIFF_STRATA,CLIFF_STRATA_D,CLIFF_STRATA,CLIFF_STRATA,CLIFF_STRATA_D,CLIFF_STRATA,CLIFF_STRATA,CLIFF_STRATA_D],
      [CLIFF_STRATA_D,CLIFF_STRATA_D,CLIFF_STRATA_D,CLIFF_STRATA_D,CLIFF_STRATA_D,CLIFF_STRATA_D,CLIFF_STRATA_D,CLIFF_STRATA_D,CLIFF_STRATA_D,CLIFF_STRATA_D,CLIFF_STRATA_D,CLIFF_STRATA_D],
      [CLIFF_STRATA_H,CLIFF_STRATA,CLIFF_STRATA,CLIFF_STRATA_H,CLIFF_STRATA,CLIFF_STRATA,CLIFF_STRATA_H,CLIFF_STRATA,CLIFF_STRATA,CLIFF_STRATA_H,CLIFF_STRATA,CLIFF_STRATA],
      [CLIFF_STRATA,CLIFF_STRATA_D,CLIFF_STRATA,CLIFF_STRATA,CLIFF_STRATA_D,CLIFF_STRATA,CLIFF_STRATA,CLIFF_STRATA_D,CLIFF_STRATA,CLIFF_STRATA,CLIFF_STRATA_D,CLIFF_STRATA],
      [CLIFF_STRATA_D,CLIFF_STRATA_D,CLIFF_STRATA_D,CLIFF_STRATA_D,CLIFF_STRATA_D,CLIFF_STRATA_D,CLIFF_STRATA_D,CLIFF_STRATA_D,CLIFF_STRATA_D,CLIFF_STRATA_D,CLIFF_STRATA_D,CLIFF_STRATA_D],
      [CLIFF_STRATA_H,CLIFF_STRATA,CLIFF_STRATA_H,CLIFF_STRATA,CLIFF_STRATA,CLIFF_STRATA_H,CLIFF_STRATA,CLIFF_STRATA,CLIFF_STRATA_H,CLIFF_STRATA,CLIFF_STRATA,CLIFF_STRATA_H],
      [CLIFF_STRATA,CLIFF_STRATA_D,CLIFF_STRATA,CLIFF_STRATA,CLIFF_STRATA_D,CLIFF_STRATA,CLIFF_STRATA,CLIFF_STRATA_D,CLIFF_STRATA,CLIFF_STRATA,CLIFF_STRATA_D,CLIFF_STRATA],
      [CLIFF_STRATA_D,CLIFF_STRATA_D,CLIFF_STRATA_D,CLIFF_STRATA_D,CLIFF_STRATA_D,CLIFF_STRATA_D,CLIFF_STRATA_D,CLIFF_STRATA_D,CLIFF_STRATA_D,CLIFF_STRATA_D,CLIFF_STRATA_D,CLIFF_STRATA_D],
      [CLIFF_STRATA_H,CLIFF_STRATA,CLIFF_STRATA,CLIFF_STRATA_H,CLIFF_STRATA,CLIFF_STRATA,CLIFF_STRATA_H,CLIFF_STRATA,CLIFF_STRATA,CLIFF_STRATA_H,CLIFF_STRATA,CLIFF_STRATA],
      [CLIFF_STRATA,CLIFF_STRATA_D,CLIFF_STRATA,CLIFF_STRATA,CLIFF_STRATA_D,CLIFF_STRATA,CLIFF_STRATA,CLIFF_STRATA_D,CLIFF_STRATA,CLIFF_STRATA,CLIFF_STRATA_D,CLIFF_STRATA],
      [CLIFF_SHADOW,CLIFF_SHADOW,CLIFF_SHADOW,CLIFF_SHADOW,CLIFF_SHADOW,CLIFF_SHADOW,CLIFF_SHADOW,CLIFF_SHADOW,CLIFF_SHADOW,CLIFF_SHADOW,CLIFF_SHADOW,CLIFF_SHADOW],
      [CLIFF_SHADOW,CLIFF_SHADOW,CLIFF_SHADOW,CLIFF_SHADOW,CLIFF_SHADOW,CLIFF_SHADOW,CLIFF_SHADOW,CLIFF_SHADOW,CLIFF_SHADOW,CLIFF_SHADOW,CLIFF_SHADOW,CLIFF_SHADOW],
    ], 4, 'cliff'));

    // stairs: carved stone steps — opaque grass cap at top, then treads
    this.textures.set('stairs', this.createSpriteTexture([
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
    ], 4, 'stairs'));
    
    // ladder: wooden rungs on side rails
    const LADDER_SIDE = 0x5D4037;
    const LADDER_RUNG = 0x8D6E63;
    const LADDER_RUNG_H = 0xA1887F;
    this.textures.set('ladder', this.createSpriteTexture([
      [LADDER_SIDE,LADDER_RUNG_H,LADDER_RUNG,LADDER_RUNG,LADDER_RUNG_H,LADDER_SIDE],
      [LADDER_SIDE,LADDER_RUNG_H,LADDER_RUNG,LADDER_RUNG,LADDER_RUNG_H,LADDER_SIDE],
      [LADDER_SIDE,LADDER_RUNG_H,LADDER_RUNG,LADDER_RUNG,LADDER_RUNG_H,LADDER_SIDE],
      [LADDER_SIDE,LADDER_RUNG_H,LADDER_RUNG,LADDER_RUNG,LADDER_RUNG_H,LADDER_SIDE],
      [LADDER_SIDE,LADDER_RUNG_H,LADDER_RUNG,LADDER_RUNG,LADDER_RUNG_H,LADDER_SIDE],
      [LADDER_SIDE,LADDER_RUNG_H,LADDER_RUNG,LADDER_RUNG,LADDER_RUNG_H,LADDER_SIDE],
    ], 4, 'ladder'));
    
    this.textures.set('cobblestone', this.createColorTexture(0x9B8B72, 32, 32, 'checker'));
    this.textures.set('farmland', this.createColorTexture(0x6D4C41, 32, 32, 'noise'));
    this.textures.set('dark_grass', this.createColorTexture(0x2E7D32, 32, 32, 'noise'));
    this.textures.set('mossy_stone', this.createColorTexture(0x6B7B5A, 32, 32, 'checker'));
    this.textures.set('wooden_path', this.createColorTexture(0x8D6E63, 32, 32, 'gradient'));
    this.textures.set('wood_floor', this.createColorTexture(0xA1887F, 32, 32, 'gradient'));

    // ========== OBJECTS ==========
    const TRUNK = 0x5D4037;
    const TRUNK_S = 0x3E2723;
    const LEAF = 0x2E7D32;
    const LEAF_H = 0x66BB6A;
    const LEAF_S = 0x1B5E20;

    // Tree - bigger, more detailed (12x14)
    this.textures.set('tree', this.createSpriteTexture([
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
    ]));

    // Dead tree
    this.textures.set('dead_tree', this.createSpriteTexture([
      [C,     C,     C,     TRUNK, C,     C,     TRUNK, C,     C,     C],
      [C,     C,     TRUNK, TRUNK_S,C,    C,     TRUNK_S,TRUNK, C,    C],
      [C,     TRUNK, C,     TRUNK, C,     TRUNK, C,     C,     TRUNK, C],
      [C,     C,     C,     TRUNK, C,     TRUNK, C,     C,     C,     C],
      [C,     C,     C,     TRUNK_S,TRUNK, TRUNK, C,     C,     C,     C],
      [C,     C,     C,     C,     TRUNK, TRUNK_S,C,     C,     C,     C],
      [C,     C,     C,     C,     TRUNK_S,TRUNK, C,     C,     C,     C],
      [C,     C,     C,     TRUNK_S,TRUNK, TRUNK_S,TRUNK, C,     C,     C],
    ]));

    // Statue
    const STATUE = 0x9E9E9E;
    const STATUE_H = 0xBDBDBD;
    const STATUE_S = 0x757575;
    this.textures.set('statue', this.createSpriteTexture([
      [C,     C,     C,     STATUE_H,STATUE_H,C,     C,     C],
      [C,     C,     STATUE_H,STATUE, STATUE, STATUE_H,C,     C],
      [C,     C,     STATUE, STATUE_S,STATUE_S,STATUE, C,     C],
      [C,     C,     STATUE, STATUE, STATUE, STATUE, C,     C],
      [C,     C,     STATUE_S,STATUE,STATUE,STATUE_S, C,     C],
      [C,     STATUE_S,STATUE_S,STATUE_S,STATUE_S,STATUE_S,STATUE_S,C],
      [C,     C,     STATUE_S,STATUE_S,STATUE_S,STATUE_S, C,     C],
    ]));

    // House — chimney + roof ridge trim + door arch read
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

    this.textures.set('house', this.createSpriteTexture([
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
    ]));

    const BROOF = 0x1565C0;
    const BROOF_H = 0x1E88E5;
    const BROOF_S = 0x0D47A1;
    const BROOF_TRIM = 0xE3F2FD;
    this.textures.set('house_blue', this.createSpriteTexture([
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
    ]));

    const GROOF = 0x2E7D32;
    const GROOF_H = 0x43A047;
    const GROOF_S = 0x1B5E20;
    const GROOF_TRIM = 0xC8E6C9;
    this.textures.set('house_green', this.createSpriteTexture([
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
    ]));

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
    this.textures.set('house_thatch', this.createSpriteTexture(houseThatchSprite));
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
    this.textures.set('cottage_house', this.createSpriteTexture(cottageHouseSprite));
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
    this.textures.set('cottage_house_entry', this.createSpriteTexture(cottageHouseEntrySprite));

    // Destroyed house
    const RUBBLE = 0x795548;
    const RUBBLE_S = 0x5D4037;
    this.textures.set('destroyed_house', this.createSpriteTexture([
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
    ]));

    const ROCK_L = 0x9E9E9E;
    const ROCK_M = 0x757575;
    const ROCK_D = 0x616161;
    const ROCK_H = 0xBDBDBD;

    this.textures.set('rock', this.createSpriteTexture([
      [C,     C,     C,     ROCK_H,ROCK_L,ROCK_H,C,     C,     C,     C],
      [C,     C,     ROCK_L,ROCK_M,ROCK_L,ROCK_M,ROCK_L,C,     C,     C],
      [C,     ROCK_L,ROCK_M,ROCK_D,ROCK_M,ROCK_D,ROCK_M,ROCK_L,C,     C],
      [ROCK_H,ROCK_M,ROCK_D,ROCK_D,ROCK_M,ROCK_D,ROCK_D,ROCK_M,ROCK_H,C],
      [ROCK_L,ROCK_D,ROCK_D,ROCK_M,ROCK_D,ROCK_D,ROCK_M,ROCK_D,ROCK_L,C],
      [C,     ROCK_D,ROCK_M,ROCK_D,ROCK_D,ROCK_D,ROCK_D,ROCK_D,C,     C],
      [C,     C,     ROCK_D,ROCK_D,ROCK_D,ROCK_D,ROCK_D,C,     C,     C],
      [C,     C,     C,     ROCK_D,ROCK_D,ROCK_D,C,     C,     C,     C],
    ]));

    const CHEST_WOOD = 0x6D4C41;
    const CHEST_WOOD_H = 0x8D6E63;
    const CHEST_WOOD_S = 0x4E342E;
    const CHEST_METAL = 0xFFB300;
    const CHEST_METAL_H = 0xFFD54F;
    const CHEST_LOCK = 0xFFC107;

    this.textures.set('chest', this.createSpriteTexture([
      [C,     C,     CHEST_WOOD,CHEST_WOOD_H,CHEST_WOOD,CHEST_WOOD_H,CHEST_WOOD,CHEST_WOOD,C,     C],
      [C,     CHEST_WOOD,CHEST_METAL,CHEST_METAL_H,CHEST_METAL,CHEST_METAL_H,CHEST_METAL,CHEST_METAL,CHEST_WOOD,C],
      [C,     CHEST_WOOD_S,CHEST_WOOD,CHEST_WOOD,CHEST_LOCK,CHEST_LOCK,CHEST_WOOD,CHEST_WOOD,CHEST_WOOD_S,C],
      [C,     CHEST_WOOD,CHEST_WOOD_S,CHEST_WOOD,CHEST_WOOD_S,CHEST_WOOD,CHEST_WOOD_S,CHEST_WOOD,CHEST_WOOD,C],
      [C,     CHEST_WOOD_S,CHEST_WOOD_S,CHEST_WOOD_S,CHEST_WOOD_S,CHEST_WOOD_S,CHEST_WOOD_S,CHEST_WOOD_S,CHEST_WOOD_S,C],
    ]));

    const PORTAL_OUTER = 0x7B1FA2;
    const PORTAL_MID = 0xAB47BC;
    const PORTAL_INNER = 0xCE93D8;
    const PORTAL_CORE = 0xE1BEE7;
    const PORTAL_GLOW = 0xEA80FC;

    this.textures.set('portal', this.createSpriteTexture([
      [C,           C,           PORTAL_OUTER,PORTAL_OUTER,PORTAL_MID,  PORTAL_OUTER,PORTAL_OUTER,C,           C,           C],
      [C,           PORTAL_OUTER,PORTAL_MID,  PORTAL_MID,  PORTAL_INNER,PORTAL_MID,  PORTAL_MID,  PORTAL_OUTER,C,           C],
      [PORTAL_OUTER,PORTAL_MID,  PORTAL_INNER,PORTAL_GLOW, PORTAL_CORE, PORTAL_GLOW, PORTAL_INNER,PORTAL_MID,  PORTAL_OUTER,C],
      [PORTAL_OUTER,PORTAL_MID,  PORTAL_GLOW, PORTAL_CORE, 0xFFFFFF,    PORTAL_CORE, PORTAL_GLOW, PORTAL_MID,  PORTAL_OUTER,C],
      [PORTAL_OUTER,PORTAL_MID,  PORTAL_INNER,PORTAL_GLOW, PORTAL_CORE, PORTAL_GLOW, PORTAL_INNER,PORTAL_MID,  PORTAL_OUTER,C],
      [C,           PORTAL_OUTER,PORTAL_MID,  PORTAL_MID,  PORTAL_INNER,PORTAL_MID,  PORTAL_MID,  PORTAL_OUTER,C,           C],
      [C,           C,           PORTAL_OUTER,PORTAL_OUTER,PORTAL_MID,  PORTAL_OUTER,PORTAL_OUTER,C,           C,           C],
    ]));

    // Door textures - wooden and iron doors for building entrances
    const DOOR_FRAME = 0x3E2723;
    const DOOR_FRAME_L = 0x5D4037;
    const DOOR_WOOD = 0x6D4C41;
    const DOOR_WOOD_D = 0x4E342E;
    const DOOR_HANDLE = 0xFFD54F;
    const DOOR_HANDLE_S = 0xFF8F00;
    
    this.textures.set('door', this.createSpriteTexture([
      [DOOR_FRAME,DOOR_FRAME,DOOR_FRAME,DOOR_FRAME,DOOR_FRAME,DOOR_FRAME],
      [DOOR_FRAME,DOOR_WOOD, DOOR_WOOD, DOOR_WOOD, DOOR_WOOD, DOOR_FRAME],
      [DOOR_FRAME_L,DOOR_WOOD, DOOR_WOOD_D,DOOR_WOOD, DOOR_WOOD, DOOR_FRAME_L],
      [DOOR_FRAME_L,DOOR_WOOD, DOOR_WOOD, DOOR_WOOD_D,DOOR_WOOD, DOOR_FRAME_L],
      [DOOR_FRAME_L,DOOR_WOOD, DOOR_WOOD_D,DOOR_WOOD, DOOR_WOOD, DOOR_FRAME_L],
      [DOOR_FRAME_L,DOOR_WOOD, DOOR_WOOD, DOOR_WOOD, DOOR_WOOD, DOOR_FRAME_L],
      [DOOR_FRAME,DOOR_FRAME_L,DOOR_HANDLE,DOOR_HANDLE_S,DOOR_FRAME_L,DOOR_FRAME],
      [DOOR_FRAME,DOOR_FRAME,DOOR_FRAME,DOOR_FRAME,DOOR_FRAME,DOOR_FRAME],
    ]));

    const IRON_D = 0x37474F;
    const IRON_M = 0x546E7A;
    const IRON_L = 0x78909C;
    const IRON_HL = 0x90A4AE;
    const RIVET = 0x212121;
    
    this.textures.set('door_iron', this.createSpriteTexture([
      [IRON_D,IRON_D,IRON_D,IRON_D,IRON_D,IRON_D],
      [IRON_D,IRON_M,IRON_L,IRON_L,IRON_M,IRON_D],
      [IRON_D,RIVET,IRON_L,IRON_L,RIVET,IRON_D],
      [IRON_D,IRON_M,IRON_HL,IRON_HL,IRON_M,IRON_D],
      [IRON_D,IRON_M,IRON_L,IRON_L,IRON_M,IRON_D],
      [IRON_D,RIVET,IRON_L,IRON_L,RIVET,IRON_D],
      [IRON_D,IRON_M,IRON_HL,IRON_HL,IRON_M,IRON_D],
      [IRON_D,IRON_D,IRON_D,IRON_D,IRON_D,IRON_D],
    ]));

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

    this.textures.set('wagon', this.createSpriteTexture([
      [C,     C,     C,     WHEEL_H,WHEEL, WHEEL_H,C,     C,     WHEEL_H,WHEEL, WHEEL_H,C,     C],
      [C,     C,     WAGON_W,WAGON_W_H,WAGON_W,WAGON_W_H,WAGON_W,WAGON_W_H,WAGON_W,WAGON_W_H,WAGON_W,C,     C],
      [C,     WAGON_W_H,WAGON_W,WAGON_W_H,WAGON_W,WAGON_W_H,WAGON_W,WAGON_W_H,WAGON_W,WAGON_W_H,WAGON_W,WAGON_W_H,C],
      [C,     WAGON_W,WAGON_W_H,WAGON_W,WAGON_W_H,WAGON_W,WAGON_W_H,WAGON_W,WAGON_W_H,WAGON_W,WAGON_W_H,WAGON_W,C],
      [C,     WAGON_W_H,WAGON_W,WAGON_W_H,WAGON_W,WAGON_W_H,WAGON_W,WAGON_W_H,WAGON_W,WAGON_W_H,WAGON_W,WAGON_W_H,C],
      [C,     WHEEL_H,WHEEL, WHEEL_H,WHEEL, WHEEL_H,WHEEL, WHEEL_H,WHEEL, WHEEL_H,WHEEL, WHEEL_H,C],
      [C,     C,     C,     C,     C,     C,     C,     C,     C,     C,     C,     C,     C],
    ]));

    this.textures.set('cart', this.createSpriteTexture([
      [C,     C,     WHEEL_H,WHEEL, WHEEL_H,C,     C,     C,     C],
      [C,     WAGON_W_H,WAGON_W,WAGON_W_H,WAGON_W,WAGON_W_H,C,     C],
      [C,     WAGON_W,WAGON_W_H,WAGON_W,WAGON_W_H,WAGON_W,WAGON_W_H,C],
      [C,     WAGON_W_H,WAGON_W,WAGON_W_H,WAGON_W,WAGON_W_H,WAGON_W,C],
      [C,     WHEEL_H,WHEEL, WHEEL_H,WHEEL, WHEEL_H,C,     C],
    ]));

    this.textures.set('market_stall', this.createSpriteTexture([
      [C,     CANOPY_R_H,CANOPY_R,CANOPY_R_H,CANOPY_R,CANOPY_R_H,CANOPY_R,CANOPY_R_H,CANOPY_R,C,     C],
      [C,     CANOPY_R,CANOPY_R_H,CANOPY_R,CANOPY_R_H,CANOPY_R,CANOPY_R_H,CANOPY_R,CANOPY_R_H,C,     C],
      [C,     STALL_W,STALL_W,STALL_W,STALL_W,STALL_W,STALL_W,STALL_W,STALL_W,STALL_W,C],
      [C,     STALL_W,0xFFF8E1,0xFFECB3,STALL_W,0xFFF8E1,0xFFECB3,STALL_W,STALL_W,STALL_W,C],
      [C,     STALL_W,STALL_W,STALL_W,STALL_W,STALL_W,STALL_W,STALL_W,STALL_W,STALL_W,C],
      [C,     C,     STALL_W,C,     STALL_W,C,     STALL_W,C,     C,     C,     C],
    ]));

    this.textures.set('bench', this.createSpriteTexture([
      [C,     WAGON_W_H,WAGON_W,WAGON_W_H,WAGON_W,WAGON_W_H,WAGON_W,WAGON_W_H,C],
      [C,     WAGON_W,WAGON_W_H,WAGON_W,WAGON_W_H,WAGON_W,WAGON_W_H,WAGON_W,C],
      [WAGON_W_H,WAGON_W,WAGON_W_H,WAGON_W,WAGON_W_H,WAGON_W,WAGON_W_H,WAGON_W,WAGON_W_H],
      [C,     WAGON_W_H,C,     C,     C,     C,     WAGON_W_H,C],
    ]));

    this.textures.set('bookshelf', this.createSpriteTexture([
      [STALL_W,STALL_W,STALL_W,STALL_W,STALL_W,STALL_W,STALL_W,STALL_W],
      [BOOK_H, BOOK,  BOOK_H, BOOK,  BOOK_H, BOOK,  BOOK_H, BOOK],
      [BOOK,   BOOK_H,BOOK,   BOOK_H,BOOK,   BOOK_H,BOOK,   BOOK_H],
      [STALL_W,STALL_W,STALL_W,STALL_W,STALL_W,STALL_W,STALL_W,STALL_W],
      [BOOK_H, BOOK,  BOOK_H, BOOK,  BOOK_H, BOOK,  BOOK_H, BOOK],
      [BOOK,   BOOK_H,BOOK,   BOOK_H,BOOK,   BOOK_H,BOOK,   BOOK_H],
      [STALL_W,STALL_W,STALL_W,STALL_W,STALL_W,STALL_W,STALL_W,STALL_W],
      [BOOK_H, BOOK,  BOOK_H, BOOK,  BOOK_H, BOOK,  BOOK_H, BOOK],
    ]));

    this.textures.set('table', this.createSpriteTexture([
      [C,     WAGON_W_H,WAGON_W,WAGON_W_H,WAGON_W,WAGON_W_H,WAGON_W,WAGON_W_H,C],
      [C,     WAGON_W,WAGON_W_H,WAGON_W,WAGON_W_H,WAGON_W,WAGON_W_H,WAGON_W,C],
      [WAGON_W_H,WAGON_W,WAGON_W_H,WAGON_W,WAGON_W_H,WAGON_W,WAGON_W_H,WAGON_W,WAGON_W_H],
      [C,     WAGON_W_H,C,     C,     C,     C,     WAGON_W_H,C],
    ]));

    this.textures.set('counter', this.createSpriteTexture([
      [WAGON_W_H,WAGON_W,WAGON_W_H,WAGON_W,WAGON_W_H,WAGON_W,WAGON_W_H,WAGON_W,WAGON_W_H,WAGON_W],
      [WAGON_W,0xFFF8E1,0xFFECB3,0xFFF8E1,0xFFECB3,0xFFF8E1,0xFFECB3,0xFFF8E1,0xFFECB3,WAGON_W],
      [WAGON_W_H,WAGON_W,WAGON_W_H,WAGON_W,WAGON_W_H,WAGON_W,WAGON_W_H,WAGON_W,WAGON_W_H,WAGON_W],
    ]));

    this.textures.set('pot', this.createSpriteTexture([
      [C,     CLAY_H,CLAY,  CLAY_H,C],
      [CLAY_H,CLAY,  CLAY_H,CLAY,  CLAY_H],
      [CLAY,  CLAY_H,CLAY,  CLAY_H,CLAY],
      [C,     CLAY_H,CLAY,  CLAY_H,C],
    ]));

    this.textures.set('rug', this.createSpriteTexture([
      [RUG_GOLD,RUG_R,  RUG_GOLD,RUG_R,  RUG_GOLD,RUG_R,  RUG_GOLD,RUG_R,  RUG_GOLD],
      [RUG_R,  RUG_G,  RUG_R,  RUG_G,  RUG_R,  RUG_G,  RUG_R,  RUG_G,  RUG_R],
      [RUG_GOLD,RUG_R,  RUG_GOLD,RUG_R,  RUG_GOLD,RUG_R,  RUG_GOLD,RUG_R,  RUG_GOLD],
      [RUG_R,  RUG_G,  RUG_R,  RUG_G,  RUG_R,  RUG_G,  RUG_R,  RUG_G,  RUG_R],
      [RUG_GOLD,RUG_R,  RUG_GOLD,RUG_R,  RUG_GOLD,RUG_R,  RUG_GOLD,RUG_R,  RUG_GOLD],
    ]));

    // === FURNITURE ===
    const BED_FRAME = 0x5D4037;
    const BED_FRAME_H = 0x6D4C41;
    const BED_SHEET = 0xE8EAF6;
    const BED_SHEET_S = 0xC5CAE9;
    const BED_PILLOW = 0xFFF8E1;
    
    this.textures.set('bed', this.createSpriteTexture([
      [C,C,BED_FRAME_H,BED_FRAME_H,BED_FRAME_H,BED_FRAME_H,BED_FRAME_H,C,C],
      [C,BED_FRAME,BED_PILLOW,BED_PILLOW,BED_PILLOW,BED_PILLOW,BED_PILLOW,BED_FRAME,C],
      [BED_FRAME_H,BED_FRAME_H,BED_SHEET,BED_SHEET,BED_SHEET,BED_SHEET,BED_SHEET,BED_FRAME_H,BED_FRAME_H],
      [BED_FRAME,BED_FRAME,BED_SHEET_S,BED_SHEET_S,BED_SHEET_S,BED_SHEET_S,BED_SHEET_S,BED_FRAME,BED_FRAME],
      [BED_FRAME,BED_FRAME,BED_SHEET,BED_SHEET,BED_SHEET,BED_SHEET,BED_SHEET,BED_FRAME,BED_FRAME],
      [BED_FRAME_H,BED_FRAME_H,BED_SHEET_S,BED_SHEET_S,BED_SHEET_S,BED_SHEET_S,BED_SHEET_S,BED_FRAME_H,BED_FRAME_H],
    ]));

    const WOOD_D = 0x5D4037;
    const WOOD = 0x6D4C41;
    const WOOD_H = 0x8D6E63;
    
    this.textures.set('wardrobe', this.createSpriteTexture([
      [WOOD_D,WOOD_H,WOOD,WOOD_H,WOOD_D,WOOD_H,WOOD,WOOD_H],
      [WOOD,WOOD_H,WOOD_D,WOOD_H,WOOD,WOOD_H,WOOD_D,WOOD_H],
      [WOOD_H,WOOD_D,WOOD,WOOD_H,WOOD_D,WOOD,WOOD_H,WOOD],
      [WOOD,WOOD_H,WOOD_D,WOOD_H,WOOD,WOOD_H,WOOD_D,WOOD_H],
      [WOOD_H,WOOD,WOOD_H,WOOD_D,WOOD_H,WOOD,WOOD_H,WOOD_D],
      [WOOD_D,WOOD_H,WOOD,WOOD_H,WOOD_D,WOOD_H,WOOD,WOOD_H],
    ]));

    const FIRE_B = 0x1A1A1A;
    const FIRE_R = 0xD32F2F;
    const FIRE_O = 0xFF6F00;
    const FIRE_Y = 0xFFEB3B;
    const FIRE_W = 0xFFF59D;
    
    this.textures.set('fireplace', this.createSpriteTexture([
      [FIRE_B,FIRE_B,FIRE_B,FIRE_B,FIRE_B,FIRE_B,FIRE_B,FIRE_B,FIRE_B],
      [FIRE_B,FIRE_R,FIRE_O,FIRE_Y,FIRE_W,FIRE_Y,FIRE_O,FIRE_R,FIRE_B],
      [FIRE_B,FIRE_O,FIRE_Y,FIRE_W,FIRE_W,FIRE_W,FIRE_Y,FIRE_O,FIRE_B],
      [FIRE_B,FIRE_R,FIRE_O,FIRE_Y,FIRE_Y,FIRE_Y,FIRE_O,FIRE_R,FIRE_B],
      [FIRE_B,FIRE_B,FIRE_R,FIRE_O,FIRE_R,FIRE_O,FIRE_R,FIRE_B,FIRE_B],
      [FIRE_B,FIRE_B,FIRE_B,FIRE_R,FIRE_R,FIRE_R,FIRE_B,FIRE_B,FIRE_B],
    ]));

    const SWORD_L = 0x78909C;
    const SWORD_H = 0xB0BEC5;
    const AXE_W = 0x5D4037;
    const RACK_W = 0x3E2723;
    
    this.textures.set('weapon_rack', this.createSpriteTexture([
      [RACK_W,RACK_W,RACK_W,RACK_W,RACK_W,RACK_W,RACK_W,RACK_W],
      [RACK_W,SWORD_H,SWORD_L,SWORD_L,SWORD_L,SWORD_L,SWORD_H,RACK_W],
      [RACK_W,SWORD_L,SWORD_H,SWORD_L,SWORD_L,SWORD_H,SWORD_L,RACK_W],
      [RACK_W,AXE_W,AXE_W,RACK_W,RACK_W,AXE_W,AXE_W,RACK_W],
      [RACK_W,RACK_W,RACK_W,RACK_W,RACK_W,RACK_W,RACK_W,RACK_W],
    ]));

    const ALCHEMY_B = 0x8D6E63;
    const ALCHEMY_W = 0x4527A0;
    const ALCHEMY_G = 0x1B5E20;
    const BOTTLE_G = 0x81C784;
    const BOTTLE_R = 0xE57373;
    
    this.textures.set('alchemy_table', this.createSpriteTexture([
      [ALCHEMY_B,ALCHEMY_B,ALCHEMY_B,ALCHEMY_B,ALCHEMY_B,ALCHEMY_B],
      [ALCHEMY_B,BOTTLE_G,BOTTLE_R,BOTTLE_G,C,ALCHEMY_B],
      [ALCHEMY_B,BOTTLE_R,C,BOTTLE_G,BOTTLE_R,ALCHEMY_B],
      [ALCHEMY_W,ALCHEMY_W,ALCHEMY_W,ALCHEMY_W,ALCHEMY_W,ALCHEMY_B],
      [ALCHEMY_W,ALCHEMY_W,ALCHEMY_W,ALCHEMY_W,ALCHEMY_W,ALCHEMY_W],
      [ALCHEMY_B,ALCHEMY_B,ALCHEMY_B,ALCHEMY_B,ALCHEMY_B,ALCHEMY_B],
    ]));

    const CAULDRON = 0x37474F;
    const CAULDRON_H = 0x546E7A;
    const CAULDRON_L = 0x263238;
    const LIQUID_G = 0x4CAF50;
    const LIQUID_B = 0x2E7D32;
    
    this.textures.set('cauldron', this.createSpriteTexture([
      [C,CAULDRON_H,CAULDRON,CAULDRON,CAULDRON,CAULDRON_H,C],
      [CAULDRON_H,LIQUID_G,LIQUID_B,LIQUID_G,LIQUID_B,LIQUID_G,CAULDRON_H],
      [CAULDRON,CAULDRON,CAULDRON_H,CAULDRON_H,CAULDRON,CAULDRON,CAULDRON],
      [CAULDRON_L,CAULDRON,CAULDRON_H,CAULDRON_H,CAULDRON,CAULDRON,CAULDRON_L],
      [C,CAULDRON_L,CAULDRON_L,CAULDRON_L,CAULDRON_L,CAULDRON_L,C],
    ]));

    // === ATMOSPHERIC / SOULS-LIKE ===
    const THRONE_G = 0x8D6E63;
    const THRONE_D = 0x3E2723;
    const THRONE_R = 0xB71C1C;
    const THRONE_GOLD = 0xFFD700;
    
    this.textures.set('throne', this.createSpriteTexture([
      [THRONE_D,THRONE_GOLD,THRONE_D,THRONE_D,THRONE_D,THRONE_GOLD,THRONE_D],
      [THRONE_D,THRONE_G,THRONE_GOLD,THRONE_GOLD,THRONE_GOLD,THRONE_G,THRONE_D],
      [THRONE_D,THRONE_G,THRONE_R,THRONE_GOLD,THRONE_R,THRONE_G,THRONE_D],
      [THRONE_D,THRONE_G,THRONE_R,THRONE_R,THRONE_R,THRONE_G,THRONE_D],
      [THRONE_D,THRONE_D,THRONE_G,THRONE_G,THRONE_G,THRONE_D,THRONE_D],
      [THRONE_D,THRONE_D,THRONE_G,THRONE_G,THRONE_G,THRONE_D,THRONE_D],
    ]));

    const ALTAR_S = 0x9E9E9E;
    const ALTAR_G = 0x757575;
    const ALTAR_D = 0x424242;
    const ALTAR_B = 0xB71C1C;
    
    this.textures.set('altar', this.createSpriteTexture([
      [ALTAR_D,ALTAR_S,ALTAR_S,ALTAR_S,ALTAR_S,ALTAR_D],
      [ALTAR_S,ALTAR_B,ALTAR_S,ALTAR_S,ALTAR_B,ALTAR_S],
      [ALTAR_G,ALTAR_S,ALTAR_S,ALTAR_S,ALTAR_S,ALTAR_G],
      [ALTAR_D,ALTAR_G,ALTAR_G,ALTAR_G,ALTAR_G,ALTAR_D],
      [ALTAR_D,ALTAR_D,ALTAR_D,ALTAR_D,ALTAR_D,ALTAR_D],
    ]));

    const BLOOD_R = 0x8B0000;
    const BLOOD_D = 0x4A0000;
    const BLOOD_S = 0x2A0000;
    
    this.textures.set('bloodstain', this.createSpriteTexture([
      [C,C,BLOOD_S,BLOOD_D,BLOOD_S,C,C,C],
      [C,BLOOD_D,BLOOD_R,BLOOD_R,BLOOD_R,BLOOD_D,BLOOD_S,C],
      [BLOOD_S,BLOOD_R,BLOOD_R,BLOOD_D,BLOOD_R,BLOOD_R,BLOOD_D,C],
      [BLOOD_D,BLOOD_R,BLOOD_D,BLOOD_S,BLOOD_D,BLOOD_R,BLOOD_R,BLOOD_S],
      [BLOOD_S,BLOOD_R,BLOOD_R,BLOOD_R,BLOOD_R,BLOOD_D,BLOOD_S,C],
      [C,BLOOD_D,BLOOD_S,C,BLOOD_S,BLOOD_D,BLOOD_S,C],
    ]));

    const CHAIN = 0x616161;
    const CHAIN_H = 0x757575;
    const CHAIN_S = 0x424242;
    
    this.textures.set('chain', this.createSpriteTexture([
      [C,CHAIN_H,CHAIN_S,C,C],
      [CHAIN,CHAIN,CHAIN_H,CHAIN_S,C],
      [CHAIN_S,CHAIN_H,CHAIN,CHAIN_H,C],
      [C,CHAIN,CHAIN_S,CHAIN,C],
      [CHAIN_H,CHAIN_S,CHAIN_H,C,C],
      [C,CHAIN,C,C,C],
    ]));

    const CAGE = 0x424242;
    const CAGE_H = 0x616161;
    const CAGE_B = 0x212121;
    
    this.textures.set('cage', this.createSpriteTexture([
      [CAGE_B,CAGE_H,CAGE,CAGE,CAGE_H,CAGE_B],
      [CAGE_H,CAGE,CAGE_H,CAGE_H,CAGE,CAGE_H],
      [CAGE,CAGE_H,CAGE,CAGE,CAGE_H,CAGE],
      [CAGE_H,CAGE,CAGE_H,CAGE_H,CAGE,CAGE_H],
      [CAGE,CAGE_H,CAGE,CAGE,CAGE_H,CAGE],
      [CAGE_H,CAGE,CAGE_H,CAGE_H,CAGE,CAGE_H],
    ]));

    const BONE_W = 0xFFF8E1;
    const BONE_S = 0xE0E0E0;
    const SKULL = 0xFFFDE7;
    
    this.textures.set('bones_pile', this.createSpriteTexture([
      [C,C,BONE_W,BONE_S,BONE_W,C,C,C,C],
      [C,BONE_S,SKULL,SKULL,SKULL,BONE_S,C,C,C],
      [BONE_W,SKULL,0xBDBDBD,BONE_W,BONE_S,SKULL,BONE_W,C,C],
      [BONE_S,BONE_W,BONE_S,SKULL,BONE_W,BONE_S,BONE_S,BONE_W,C],
      [BONE_W,BONE_S,BONE_W,BONE_S,BONE_W,BONE_S,BONE_W,BONE_S,C],
      [C,BONE_W,BONE_S,BONE_W,BONE_S,BONE_W,BONE_S,BONE_W,C],
    ]));

    // Small environmental sprites
    const PETAL = 0xF48FB1;
    const PETAL_H = 0xF8BBD0;
    const STEM = 0x388E3C;
    const STEM_S = 0x2E7D32;
    const POLLEN = 0xFFF176;

    this.textures.set('flower', this.createSpriteTexture([
      [C,     C,     PETAL_H,PETAL, C,     C],
      [C,     PETAL, POLLEN, POLLEN,PETAL_H,C],
      [PETAL_H,POLLEN,POLLEN,POLLEN,POLLEN,PETAL],
      [C,     PETAL, POLLEN, POLLEN,PETAL, C],
      [C,     C,     STEM,   STEM_S,C,     C],
      [C,     STEM,  STEM_S, STEM,  STEM,  C],
    ]));

    this.textures.set('mushroom', this.createSpriteTexture([
      [C,        C,        0xE53935,0xEF5350,0xE53935,0xEF5350,C,       C],
      [C,        0xE53935, 0xFFFFFF,0xE53935,0xE53935,0xFFFFFF, 0xE53935,C],
      [0xE53935, 0xE53935, 0xE53935,0xEF5350,0xE53935,0xE53935, 0xE53935,0xE53935],
      [C,        C,        C,       0xFFE0B2, 0xFFCC80,C,      C,       C],
      [C,        C,        C,       0xFFCC80,0xFFE0B2,C,       C,       C],
    ]));

    const SIGN_WOOD = 0x8D6E63;
    const SIGN_WOOD_H = 0xA1887F;
    const SIGN_WOOD_S = 0x6D4C41;
    const SIGN_POST = 0x5D4037;
    this.textures.set('sign', this.createSpriteTexture([
      [C,         C,         SIGN_WOOD,SIGN_WOOD_H,SIGN_WOOD,SIGN_WOOD_H,SIGN_WOOD,C,         C,         C],
      [C,         SIGN_WOOD, SIGN_WOOD_H,SIGN_WOOD_S,SIGN_WOOD,SIGN_WOOD_S,SIGN_WOOD_H,SIGN_WOOD,C,      C],
      [C,         SIGN_WOOD_S,SIGN_WOOD,SIGN_WOOD,SIGN_WOOD,SIGN_WOOD,SIGN_WOOD,SIGN_WOOD_S,C,          C],
      [C,         C,         C,        C,         SIGN_POST,SIGN_POST,C,        C,         C,           C],
      [C,         C,         C,        C,         SIGN_POST,SIGN_POST,C,        C,         C,           C],
      [C,         C,         C,        C,         SIGN_POST,SIGN_POST,C,        C,         C,           C],
    ]));

    this.textures.set('well', this.createSpriteTexture([
      [C,          C,          0x795548,0x795548, 0x795548,0x795548, 0x795548,0x795548,C,          C],
      [C,          0x795548,  C,        C,         0x795548,C,        C,         0x795548,C,          C],
      [C,          0x78909C, 0x78909C,0x546E7A,0x1E88E5,0x546E7A,0x78909C,0x78909C,C, C],
      [C,          0x546E7A,0x78909C,0x1E88E5,0x1E88E5,0x1E88E5,0x78909C,0x546E7A,C,  C],
      [C,          C,          0x546E7A,0x78909C,0x78909C,0x78909C,0x546E7A,C,C,          C],
    ]));

    this.textures.set('campfire', this.createSpriteTexture([
      [C,     C,     C,     0xFFEB3B,0xFFEB3B,C,     C,     C],
      [C,     C,     0xFF9800,0xFFEB3B,0xFF9800,0xFF9800,C,     C],
      [C,     0xFF5722,0xFF9800,0xFFEB3B,0xFFEB3B,0xFF9800,0xFF5722,C],
      [C,     0xFF5722,0xFF5722,0xFF9800,0xFF9800,0xFF5722,0xFF5722,C],
      [0x5D4037,0x5D4037,0xFF5722,0xFF5722,0xFF5722,0xFF5722,0x5D4037,0x5D4037],
      [C,     0x5D4037,0x5D4037,0x5D4037,0x5D4037,0x5D4037,0x5D4037,C],
    ]));

    // Bonfire — taller violet/white flame (rest checkpoint)
    this.textures.set('bonfire', this.createSpriteTexture([
      [C,     C,     0xE1BEE7,0xFFFFFF,0xE1BEE7,C,     C,     C],
      [C,     0xBA68C8,0xFFFFFF,0xFFD54F,0xFFFFFF,0xBA68C8,C,     C],
      [C,     0x7B1FA2,0xE1BEE7,0xFFD54F,0xFFD54F,0xE1BEE7,0x7B1FA2,C],
      [0x4E342E,0x5D4037,0xFF6F00,0xFF9800,0xFF9800,0xFF6F00,0x5D4037,0x4E342E],
      [0x3E2723,0x4E342E,0x5D4037,0xFF5722,0xFF5722,0x5D4037,0x4E342E,0x3E2723],
      [C,     0x3E2723,0x4E342E,0x4E342E,0x4E342E,0x4E342E,0x3E2723,C],
    ]));

    // Dropped essence bloodstain orb (world pickup)
    this.textures.set('essence_drop', this.createSpriteTexture([
      [C,     C,     0x4A148C,0xCE93D8,0x4A148C,C,     C],
      [C,     0x7B1FA2,0xE1BEE7,0xFFFFFF,0xE1BEE7,0x7B1FA2,C],
      [0x6A1B9A,0xCE93D8,0xFFFFFF,0xFFD54F,0xFFFFFF,0xCE93D8,0x6A1B9A],
      [C,     0x7B1FA2,0xE1BEE7,0xFFFFFF,0xE1BEE7,0x7B1FA2,C],
      [C,     C,     0x4A148C,0xCE93D8,0x4A148C,C,     C],
    ]));

    this.textures.set('tombstone', this.createSpriteTexture([
      [C,     C,     0x9E9E9E,0x757575,0x757575,0x9E9E9E,C,     C],
      [C,     0x757575,0x757575,0x616161,0x616161,0x757575,0x757575,C],
      [C,     0x757575,0x616161,0x757575,0x757575,0x616161,0x757575,C],
      [C,     0x616161,0x757575,0x757575,0x757575,0x757575,0x616161,C],
      [C,     0x616161,0x616161,0x616161,0x616161,0x616161,0x616161,C],
      [C,     C,     0x616161,0x616161,0x616161,0x616161,C,     C],
    ]));

    this.textures.set('stump', this.createSpriteTexture([
      [C,       0xBCAAA4,0x795548,0xBCAAA4,0x795548,0xBCAAA4,C],
      [0x795548, 0xBCAAA4,0x5D4037,0xBCAAA4,0x5D4037,0xBCAAA4,0x795548],
      [0x5D4037,0x795548,0x5D4037,0x795548,0x5D4037,0x795548,0x5D4037],
      [C,       0x5D4037,0x5D4037,0x5D4037,0x5D4037,0x5D4037,C],
    ]));

    this.textures.set('fence', this.createSpriteTexture([
      [0xA1887F, C,      0xA1887F, C,      0xA1887F, C,      0xA1887F, C],
      [0xA1887F, 0x6D4C41,0xA1887F, 0x6D4C41,0xA1887F, 0x6D4C41,0xA1887F, 0x6D4C41],
      [0x6D4C41, C,      0x6D4C41, C,      0x6D4C41, C,      0x6D4C41, C],
      [0x6D4C41, 0xA1887F,0x6D4C41, 0xA1887F,0x6D4C41, 0xA1887F,0x6D4C41, 0xA1887F],
    ]));

    this.textures.set('barrel', this.createSpriteTexture([
      [C,        0x6D4C41,0x8D6E63,0x6D4C41,0x8D6E63,0x6D4C41,C],
      [0x546E7A, 0x6D4C41,0x8D6E63,0x6D4C41,0x8D6E63,0x6D4C41,0x546E7A],
      [0x6D4C41, 0x8D6E63,0x6D4C41,0x8D6E63,0x6D4C41,0x8D6E63,0x6D4C41],
      [0x546E7A, 0x6D4C41,0x8D6E63,0x6D4C41,0x8D6E63,0x6D4C41,0x546E7A],
      [C,        0x6D4C41,0x8D6E63,0x6D4C41,0x8D6E63,0x6D4C41,C],
    ]));

    this.textures.set('crate', this.createSpriteTexture([
      [0x5D4037, 0x795548,0x795548,0x795548,0x795548,0x795548,0x5D4037],
      [0x795548, 0x8D6E63,0x5D4037,0x8D6E63,0x5D4037,0x8D6E63,0x795548],
      [0x795548, 0x5D4037,0x8D6E63,0x5D4037,0x8D6E63,0x5D4037,0x795548],
      [0x795548, 0x8D6E63,0x5D4037,0x8D6E63,0x5D4037,0x8D6E63,0x795548],
      [0x5D4037, 0x795548,0x795548,0x795548,0x795548,0x795548,0x5D4037],
    ]));

    this.textures.set('gate', this.createSpriteTexture([
      [0xA1887F, C,      C,      C,      C,      C,      0xA1887F],
      [0x6D4C41, C,      C,      C,      C,      C,      0x6D4C41],
      [0x6D4C41, C,      C,      C,      C,      C,      0x6D4C41],
      [0x6D4C41, C,      C,      C,      C,      C,      0x6D4C41],
      [0xA1887F, C,      C,      C,      C,      C,      0xA1887F],
    ]));

    // Spike trap
    const SPIKE = 0x90A4AE;
    const SPIKE_S = 0x546E7A;
    this.textures.set('spike_trap', this.createSpriteTexture([
      [C,      SPIKE, C,      SPIKE,  C,      SPIKE,  C,     C],
      [SPIKE_S,SPIKE, SPIKE_S,SPIKE,  SPIKE_S,SPIKE,  SPIKE_S,C],
      [C,      SPIKE_S,C,     SPIKE_S,C,      SPIKE_S,C,     C],
      [0x616161,0x616161,0x616161,0x616161,0x616161,0x616161,0x616161,0x616161],
    ]));

    this.textures.set('bones', this.createSpriteTexture([
      [C,     0xEEEEEE,C,     C,     0xEEEEEE,C],
      [0xEEEEEE,0xBDBDBD,0xEEEEEE,0xEEEEEE,0xBDBDBD,0xEEEEEE],
      [C,     C,     0xBDBDBD,0xEEEEEE,C,     C],
      [C,     0xEEEEEE,0xEEEEEE,0xBDBDBD,0xEEEEEE,C],
      [0xEEEEEE,0xBDBDBD,C,     C,     0xBDBDBD,0xEEEEEE],
    ]));

    // Iron fence - dark metal bars
    const IRON = 0x37474F;
    const IRON_H = 0x546E7A;
    this.textures.set('iron_fence', this.createSpriteTexture([
      [IRON_H, C,      IRON_H, C,      IRON_H, C,      IRON_H, C],
      [IRON,   IRON_H, IRON,   IRON_H, IRON,   IRON_H, IRON,   IRON_H],
      [IRON,   C,      IRON,   C,      IRON,   C,      IRON,   C],
      [IRON,   IRON_H, IRON,   IRON_H, IRON,   IRON_H, IRON,   IRON_H],
      [IRON,   C,      IRON,   C,      IRON,   C,      IRON,   C],
    ]));

    // Hedge - dense green bush
    const HEDGE = 0x2E7D32;
    const HEDGE_H = 0x43A047;
    const HEDGE_S = 0x1B5E20;
    this.textures.set('hedge', this.createSpriteTexture([
      [C,      HEDGE_H,HEDGE,  HEDGE_H,HEDGE,  HEDGE_H,C,     C],
      [HEDGE_S,HEDGE,  HEDGE_H,HEDGE,  HEDGE_H,HEDGE,  HEDGE_S,C],
      [HEDGE,  HEDGE_S,HEDGE,  HEDGE_S,HEDGE,  HEDGE_S,HEDGE, C],
      [HEDGE_S,HEDGE,  HEDGE_S,HEDGE,  HEDGE_S,HEDGE,  HEDGE_S,C],
    ]));

    // Wheat - golden crop
    const WHEAT = 0xFFC107;
    const WHEAT_H = 0xFFD54F;
    const WHEAT_S = 0xFFA000;
    const WHEAT_STEM = 0x8BC34A;
    this.textures.set('wheat', this.createSpriteTexture([
      [C,        WHEAT_H, C,       WHEAT,   C,       WHEAT_H, C,       C],
      [WHEAT,    WHEAT_H, WHEAT,   WHEAT_H, WHEAT,   WHEAT,   WHEAT_S, C],
      [WHEAT_S,  WHEAT,   WHEAT_S, WHEAT,   WHEAT_S, WHEAT,   WHEAT_S, C],
      [C,        WHEAT_STEM,C,     WHEAT_STEM,C,     WHEAT_STEM,C,      C],
      [C,        WHEAT_STEM,C,     WHEAT_STEM,C,     WHEAT_STEM,C,      C],
    ]));

    // Scarecrow
    const SC_HAT = 0x5D4037;
    const SC_SHIRT = 0xBCAAA4;
    const SC_FACE = 0xFFE0BD;
    this.textures.set('scarecrow', this.createSpriteTexture([
      [C,      C,      SC_HAT, SC_HAT, SC_HAT, SC_HAT, C,      C],
      [C,      SC_HAT, SC_HAT, SC_HAT, SC_HAT, SC_HAT, SC_HAT, C],
      [C,      C,      SC_FACE,0x000000,SC_FACE,0x000000,C,      C],
      [C,      C,      SC_FACE,SC_FACE,SC_FACE,SC_FACE, C,      C],
      [SC_SHIRT,SC_SHIRT,SC_SHIRT,SC_SHIRT,SC_SHIRT,SC_SHIRT,SC_SHIRT,SC_SHIRT],
      [C,      C,      C,      SC_SHIRT,SC_SHIRT,C,      C,      C],
      [C,      C,      C,      0x5D4037,0x5D4037,C,      C,      C],
      [C,      C,      C,      0x5D4037,0x5D4037,C,      C,      C],
    ]));

    // Sword (Matches Player Buster Blade — fully diagonal, tip top-right to pommel bottom-left)
    // Every element (blade, guard, grip, pommel) follows the same 45° angle.
    const SW_B  = 0xC0D0E0;  // blade mid
    const SW_H  = 0xF0F4FF;  // blade highlight (bright edge)
    const SW_E  = 0x90A8C0;  // blade shadow edge
    const SW_G  = 0xE8C030;  // gold guard / pommel
    const SW_GR = 0x5D4037;  // brown grip

    const swordTex = this.createSpriteTexture([
      //       0      1      2      3      4      5      6      7
      /* 0 */ [C,     C,     C,     C,     C,     SW_H,  SW_H,  C    ],  // tip
      /* 1 */ [C,     C,     C,     C,     SW_H,  SW_B,  SW_H,  C    ],  // blade
      /* 2 */ [C,     C,     C,     SW_H,  SW_B,  SW_H,  C,     C    ],  // blade
      /* 3 */ [C,     C,     SW_H,  SW_B,  SW_E,  C,     C,     C    ],  // blade
      /* 4 */ [C,     SW_G,  SW_B,  SW_E,  SW_G,  C,     C,     C    ],  // guard crossing diagonal
      /* 5 */ [SW_G,  SW_GR, SW_E,  SW_G,  C,     C,     C,     C    ],  // guard center + grip start
      /* 6 */ [C,     SW_GR, SW_GR, C,     C,     C,     C,     C    ],  // grip
      /* 7 */ [SW_GR, SW_G,  C,     C,     C,     C,     C,     C    ],  // pommel
    ]);
    this.textures.set('sword', swordTex);
    if (swordTex.image instanceof HTMLCanvasElement) {
      this.textureDataUrls.set('sword', swordTex.image.toDataURL());
    }

    // Health Potion Sprite
    const P_G  = 0xA0B0C0;  // glass color
    const P_R  = 0xCC2222;  // red liquid
    const P_RH = 0xFF4444;  // red highlight
    const P_RS = 0x991111;  // red shadow
    const P_K  = 0x6B4423;  // cork brown
    const P_W  = 0x8D6E63;  // cork highlight

    const potionTex = this.createSpriteTexture([
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
    this.textures.set('potion', potionTex);
    if (potionTex.image instanceof HTMLCanvasElement) {
      this.textureDataUrls.set('potion', potionTex.image.toDataURL());
    }


    // Hay bale
    const HAY = 0xD4A017;
    const HAY_H = 0xE8B830;
    const HAY_S = 0xB8860B;
    this.textures.set('hay_bale', this.createSpriteTexture([
      [HAY_S, HAY,   HAY_H, HAY,   HAY_H, HAY,   HAY_S],
      [HAY,   HAY_H, HAY,   HAY_S, HAY,   HAY_H, HAY],
      [HAY_S, HAY,   HAY_S, HAY,   HAY_S, HAY,   HAY_S],
      [HAY,   HAY_S, HAY,   HAY_H, HAY,   HAY_S, HAY],
    ]));

    // Lantern
    const LANT_METAL = 0x37474F;
    const LANT_GLASS = 0xFFEB3B;
    const LANT_GLOW = 0xFFF9C4;
    this.textures.set('lantern', this.createSpriteTexture([
      [C,         C,         LANT_METAL,LANT_METAL,C,         C],
      [C,         LANT_METAL,LANT_GLOW, LANT_GLASS,LANT_METAL,C],
      [C,         LANT_METAL,LANT_GLASS,LANT_GLOW, LANT_METAL,C],
      [C,         C,         LANT_METAL,LANT_METAL,C,         C],
      [C,         C,         LANT_METAL,LANT_METAL,C,         C],
      [C,         C,         LANT_METAL,LANT_METAL,C,         C],
    ]));
  }
}
