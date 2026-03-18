import * as THREE from 'three';

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

  constructor() {
    this.textures = new Map();
    this.textureGenerators = new Map();
    this.textureLoader = new THREE.TextureLoader();
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
    cellSize: number = 4
  ): THREE.Texture {
    const width = colors[0].length * cellSize;
    const height = colors.length * cellSize;
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d')!;

    for (let y = 0; y < colors.length; y++) {
      for (let x = 0; x < colors[y].length; x++) {
        const color = colors[y][x];
        if (color !== 0) {
          const r = (color >> 16) & 255;
          const g = (color >> 8) & 255;
          const b = color & 255;
          
          ctx.fillStyle = `rgb(${r}, ${g}, ${b})`;
          ctx.fillRect(x * cellSize, y * cellSize, cellSize, cellSize);
          
          ctx.fillStyle = `rgba(255,255,255,0.18)`;
          ctx.fillRect(x * cellSize, y * cellSize, 1, 1);
          
          ctx.fillStyle = `rgba(0,0,0,0.12)`;
          ctx.fillRect(x * cellSize + cellSize - 1, y * cellSize + cellSize - 1, 1, 1);
        }
      }
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.magFilter = THREE.NearestFilter;
    texture.minFilter = THREE.NearestFilter;
    return texture;
  }

  // Unified pixel-art character sprite - pure fillRect, no curves
  createChibiCharacter(
    dir: 'down' | 'up' | 'left' | 'right',
    state: 'idle' | 'walk' | 'attack' | 'charge' | 'hurt' = 'idle',
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
    }
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
      // Sword - long imposing blade with 3-frame swing
      const BLADE = 0xC0D0E0;
      const BLADE_H = 0xF0F4FF;
      const BLADE_E = 0x90A8C0;
      const GUARD = p.trimColor;
      const GRIP = 0x5D4037;
      if (atkFrame === 0) {
        // Wind-up: sword raised high behind head
        cell(m(8), 0 + bob, BLADE_H); cell(m(9), 1 + bob, BLADE); cell(m(10), 2 + bob, BLADE);
        cell(m(10), 3 + bob, BLADE_E); cell(m(9), 3 + bob, GUARD);
        cell(m(8), 4 + bob, GRIP);
      } else if (atkFrame === 1) {
        // Mid-swing: sword diagonal coming down
        cell(m(3), 2 + bob, BLADE_H); cell(m(3), 3 + bob, BLADE); cell(m(4), 4 + bob, BLADE);
        cell(m(4), 5 + bob, BLADE_E); cell(m(5), 5 + bob, GUARD);
        cell(m(5), 6 + bob, GRIP);
      } else if (atkFrame === 2) {
        // Follow-through: sword low and forward
        cell(m(2), 7 + bob, BLADE_H); cell(m(3), 7 + bob, BLADE); cell(m(4), 7 + bob, BLADE);
        cell(m(5), 7 + bob, BLADE_E); cell(m(5), 8 + bob, GUARD);
        cell(m(5), 9 + bob, GRIP);
      } else {
        // Idle: resting at side
        cell(m(4), 4 + bob, BLADE_H); cell(m(4), 5 + bob, BLADE); cell(m(4), 6 + bob, BLADE);
        cell(m(4), 7 + bob, BLADE_E); cell(m(4), 8 + bob, GUARD);
        cell(m(4), 9 + bob, GRIP); cell(m(4), 10 + bob, GRIP);
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

      // Sword (left side) - long imposing blade
      const BLADE = 0xC0D0E0;
      const BLADE_H = 0xF0F4FF;
      const BLADE_E = 0x90A8C0;
      const GUARD = p.trimColor;
      const GRIP = 0x5D4037;
      if (atkFrame === 0) {
        // Wind-up: sword raised overhead
        cell(6, 0 + bob, BLADE_H); cell(7, 0 + bob, BLADE); cell(8, 0 + bob, BLADE);
        cell(9, 0 + bob, BLADE_E); cell(8, 1 + bob, GUARD);
        cell(7, 1 + bob, GRIP);
      } else if (atkFrame === 1) {
        // Mid-swing: sword coming down diagonally
        cell(2, 3 + bob, BLADE_H); cell(3, 4 + bob, BLADE); cell(3, 5 + bob, BLADE);
        cell(3, 6 + bob, BLADE_E); cell(4, 6 + bob, GUARD);
        cell(4, 7 + bob, GRIP);
      } else if (atkFrame === 2) {
        // Follow-through: sword swept low
        cell(2, 9 + bob, BLADE_H); cell(3, 9 + bob, BLADE); cell(4, 9 + bob, BLADE);
        cell(5, 9 + bob, BLADE_E); cell(4, 10 + bob, GUARD);
        cell(4, 11 + bob, GRIP);
      } else {
        // Idle: resting at left side
        cell(4, 4 + bob, BLADE_H); cell(4, 5 + bob, BLADE); cell(4, 6 + bob, BLADE);
        cell(4, 7 + bob, BLADE_E); cell(4, 8 + bob, GUARD);
        cell(4, 9 + bob, GRIP); cell(4, 10 + bob, GRIP);
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

    const texture = new THREE.CanvasTexture(canvas);
    texture.magFilter = THREE.NearestFilter;
    texture.minFilter = THREE.NearestFilter;
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
    const states: Array<'idle' | 'walk' | 'attack' | 'charge' | 'hurt'> = ['idle', 'walk', 'attack', 'charge', 'hurt'];

    for (const dir of dirs) {
      for (const state of states) {
        const maxFrames = state === 'attack' || state === 'charge' ? 3 : state === 'hurt' ? 1 : 2;
        for (let f = 0; f < maxFrames; f++) {
          const d = dir, s = state, fr = f;
          this.registerTexture(`player_${d}_${s}_${fr}`, () => this.createChibiCharacter(d, s, fr, heroPalette));
        }
      }
    }

    // Diagonal sprites reuse side views
    const diagDirs = ['down_left', 'down_right', 'up_left', 'up_right'] as const;
    const diagBase = { down_left: 'left', down_right: 'right', up_left: 'left', up_right: 'right' } as const;
    
    for (const dDir of diagDirs) {
      const base = diagBase[dDir];
      for (const state of states) {
        const maxFrames = state === 'attack' || state === 'charge' ? 3 : state === 'hurt' ? 1 : 2;
        for (let f = 0; f < maxFrames; f++) {
          const dd = dDir, b = base, s = state, fr = f;
          this.registerTexture(`player_${dd}_${s}_${fr}`, () => this.getTexture(`player_${b}_${s}_${fr}`)!);
        }
      }
    }

    // Legacy aliases
    for (const d of ['down', 'up', 'left', 'right']) {
      const dd = d;
      this.registerTexture(`player_${dd}`, () => this.getTexture(`player_${dd}_idle_0`)!);
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
    this.registerTexture('npc_elder', () => this.createChibiCharacter('down', 'idle', 0, elderPalette));

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
    this.registerTexture('npc_merchant', () => this.createChibiCharacter('down', 'idle', 0, merchantPalette));

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
    this.registerTexture('npc_guard', () => this.createChibiCharacter('down', 'idle', 0, guardPalette));

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
    this.registerTexture('npc_blacksmith', () => this.createChibiCharacter('down', 'idle', 0, blacksmithPalette));

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
    this.registerTexture('npc_healer', () => this.createChibiCharacter('down', 'idle', 0, healerPalette));

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
    this.registerTexture('npc_farmer', () => this.createChibiCharacter('down', 'idle', 0, farmerPalette));

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
    this.registerTexture('npc_child', () => this.createChibiCharacter('down', 'idle', 0, childPalette));

    // ========== NEW ENEMY: Spider ==========
    const SPIDER_BODY = 0x212121;
    const SPIDER_BODY_H = 0x424242;
    const SPIDER_LEG = 0x37474F;
    const SPIDER_EYE = 0xF44336;
    const SPIDER_FANG = 0xBDBDBD;

    this.textures.set('enemy_spider', this.createSpriteTexture([
      [C,          SPIDER_LEG,C,          C,          C,          C,          SPIDER_LEG,C,          C,          C],
      [SPIDER_LEG, C,         SPIDER_BODY,SPIDER_BODY_H,SPIDER_BODY,SPIDER_BODY_H,C,     SPIDER_LEG, C,         C],
      [C,          SPIDER_BODY,SPIDER_EYE,SPIDER_BODY,SPIDER_BODY,SPIDER_EYE,SPIDER_BODY,C,         C,         C],
      [SPIDER_LEG, SPIDER_BODY,SPIDER_FANG,SPIDER_BODY_H,SPIDER_BODY_H,SPIDER_FANG,SPIDER_BODY,SPIDER_LEG,C,C],
      [C,          SPIDER_BODY_H,SPIDER_BODY,SPIDER_BODY,SPIDER_BODY,SPIDER_BODY,SPIDER_BODY_H,C,  C,         C],
      [SPIDER_LEG, C,         SPIDER_BODY,SPIDER_BODY_H,SPIDER_BODY,SPIDER_BODY,C,     SPIDER_LEG, C,         C],
      [C,          SPIDER_LEG,C,          SPIDER_BODY,SPIDER_BODY,C,          SPIDER_LEG,C,          C,         C],
      [SPIDER_LEG, C,         C,          C,          C,          C,          C,         SPIDER_LEG, C,         C],
    ]));
    this.registerTexture('enemy_spider_telegraph', () => this.getTexture('enemy_spider')!);
    this.registerTexture('enemy_spider_attack', () => this.getTexture('enemy_spider')!);

    // ========== NEW ENEMY: Slime ==========
    const SLIME_BODY = 0x4CAF50;
    const SLIME_H = 0x66BB6A;
    const SLIME_S = 0x2E7D32;
    const SLIME_EYE = 0xFFFFFF;
    const SLIME_PUPIL = 0x212121;
    const SLIME_SHINE = 0xA5D6A7;

    this.textures.set('enemy_slime', this.createSpriteTexture([
      [C,          C,          SLIME_H,   SLIME_H,   SLIME_H,   C,          C,          C],
      [C,          SLIME_H,   SLIME_SHINE,SLIME_BODY,SLIME_BODY,SLIME_H,   C,          C],
      [SLIME_S,   SLIME_BODY,SLIME_EYE, SLIME_BODY,SLIME_EYE, SLIME_BODY,SLIME_S,    C],
      [SLIME_S,   SLIME_BODY,SLIME_PUPIL,SLIME_BODY,SLIME_PUPIL,SLIME_BODY,SLIME_S,  C],
      [C,          SLIME_BODY,SLIME_BODY,SLIME_BODY,SLIME_BODY,SLIME_BODY,C,          C],
      [C,          SLIME_S,   SLIME_BODY,SLIME_S,   SLIME_BODY,SLIME_S,   C,          C],
    ]));
    this.registerTexture('enemy_slime_telegraph', () => this.getTexture('enemy_slime')!);
    this.registerTexture('enemy_slime_attack', () => this.getTexture('enemy_slime')!);

    // ========== ENEMY SPRITES ==========
    const WOLF_FUR = 0x616161;
    const WOLF_FUR_H = 0x757575;
    const WOLF_FUR_S = 0x424242;
    const WOLF_EYE = 0xFFEB3B;
    const WOLF_SNOUT = 0x9E9E9E;
    const WOLF_FANG = 0xFAFAFA;

    this.textures.set('enemy_wolf', this.createSpriteTexture([
      [C,        C,        WOLF_FUR, WOLF_FUR_H,C,       C,        WOLF_FUR_H,WOLF_FUR,C,        C],
      [C,        WOLF_FUR, WOLF_FUR_H,WOLF_FUR,WOLF_FUR,WOLF_FUR, WOLF_FUR, WOLF_FUR_H,WOLF_FUR,C],
      [C,        WOLF_FUR, WOLF_EYE,WOLF_FUR,  WOLF_FUR,WOLF_FUR, WOLF_EYE, WOLF_FUR, C,        C],
      [C,        C,        WOLF_FUR,WOLF_SNOUT,WOLF_SNOUT,WOLF_SNOUT,WOLF_FUR,C,       C,        C],
      [C,        C,        C,       WOLF_FANG, WOLF_SNOUT,WOLF_FANG,C,       C,        C,        C],
      [WOLF_FUR_S,WOLF_FUR,WOLF_FUR,WOLF_FUR_H,WOLF_FUR,WOLF_FUR_H,WOLF_FUR,WOLF_FUR,WOLF_FUR_S,C],
      [C,        WOLF_FUR_S,WOLF_FUR,WOLF_FUR, WOLF_FUR_S,WOLF_FUR,WOLF_FUR,WOLF_FUR_S,C,       C],
      [C,        C,        WOLF_FUR_S,C,       WOLF_FUR_S,C,       WOLF_FUR_S,C,       C,        C],
    ]));

    const WOLF_EYE_GLOW = 0xFFFF00;
    const WOLF_WARN = 0xFF5722;
    this.textures.set('enemy_wolf_telegraph', this.createSpriteTexture([
      [C,        C,        C,        C,        C,       C,        C,        C,        C,        C],
      [C,        C,        WOLF_FUR, WOLF_FUR_H,C,       C,        WOLF_FUR_H,WOLF_FUR,C,       C],
      [C,        WOLF_FUR, WOLF_EYE_GLOW,WOLF_FUR,WOLF_FUR,WOLF_FUR, WOLF_EYE_GLOW, WOLF_FUR, C,C],
      [C,        C,        WOLF_FUR,WOLF_SNOUT,WOLF_WARN,WOLF_SNOUT,WOLF_FUR,C,       C,        C],
      [C,        C,        C,       WOLF_FANG, WOLF_WARN,WOLF_FANG,C,       C,        C,        C],
      [WOLF_FUR_S,WOLF_FUR,WOLF_FUR,WOLF_FUR_H,WOLF_FUR_S,WOLF_FUR_H,WOLF_FUR,WOLF_FUR,WOLF_FUR_S,C],
      [C,        WOLF_FUR_S,WOLF_FUR_S,WOLF_FUR_S,WOLF_FUR_S,WOLF_FUR_S,WOLF_FUR_S,WOLF_FUR_S,C,C],
      [C,        WOLF_FUR_S,C,       WOLF_FUR_S,C,       WOLF_FUR_S,C,       WOLF_FUR_S,C,      C],
    ]));

    this.textures.set('enemy_wolf_attack', this.createSpriteTexture([
      [C,        C,        WOLF_FUR_H,WOLF_FUR_H,C,       C,        WOLF_FUR_H,WOLF_FUR_H,C,    C],
      [C,        WOLF_FUR, WOLF_FUR_H,WOLF_FUR,WOLF_FUR,WOLF_FUR, WOLF_FUR, WOLF_FUR_H,WOLF_FUR,C],
      [C,        WOLF_FUR, WOLF_EYE_GLOW,WOLF_FUR,WOLF_FUR,WOLF_FUR, WOLF_EYE_GLOW, WOLF_FUR, C,C],
      [C,        WOLF_FANG,WOLF_FUR,WOLF_WARN,WOLF_WARN,WOLF_WARN,WOLF_FUR,WOLF_FANG,C,        C],
      [C,        C,        WOLF_FANG,WOLF_WARN,WOLF_WARN,WOLF_WARN,WOLF_FANG,C,       C,        C],
      [WOLF_FUR_S,WOLF_FUR,WOLF_FUR,WOLF_FUR_H,WOLF_FUR,WOLF_FUR_H,WOLF_FUR,WOLF_FUR,WOLF_FUR_S,C],
      [C,        WOLF_FUR_S,WOLF_FUR,WOLF_FUR, WOLF_FUR_S,WOLF_FUR,WOLF_FUR,WOLF_FUR_S,C,       C],
      [C,        C,        WOLF_FUR_S,C,       WOLF_FUR_S,C,       WOLF_FUR_S,C,       C,        C],
    ]));

    const SHADOW_BODY = 0x311B92;
    const SHADOW_BODY_H = 0x4527A0;
    const SHADOW_BODY_S = 0x1A0A5E;
    const SHADOW_EYE = 0xFF1744;
    const SHADOW_GLOW = 0xD500F9;
    const SHADOW_WISP = 0x7C4DFF;

    this.textures.set('enemy_shadow', this.createSpriteTexture([
      [C,          C,           SHADOW_WISP, SHADOW_BODY_H,SHADOW_BODY_H,SHADOW_BODY_H,SHADOW_WISP,C,          C,          C],
      [C,          SHADOW_BODY, SHADOW_BODY_H,SHADOW_EYE,  SHADOW_BODY, SHADOW_EYE,   SHADOW_BODY_H,SHADOW_BODY,C,         C],
      [C,          SHADOW_BODY_S,SHADOW_BODY,SHADOW_BODY,  SHADOW_GLOW, SHADOW_BODY,  SHADOW_BODY,SHADOW_BODY_S,C,         C],
      [SHADOW_WISP,SHADOW_BODY, SHADOW_BODY_S,SHADOW_BODY,SHADOW_BODY_S,SHADOW_BODY, SHADOW_BODY_S,SHADOW_BODY,SHADOW_WISP,C],
      [C,          SHADOW_BODY_S,SHADOW_BODY,SHADOW_BODY,  SHADOW_BODY, SHADOW_BODY,  SHADOW_BODY,SHADOW_BODY_S,C,         C],
      [C,          C,           SHADOW_BODY_S,SHADOW_BODY, SHADOW_BODY_S,SHADOW_BODY, SHADOW_BODY_S,C,          C,         C],
      [C,          C,           SHADOW_WISP, SHADOW_BODY_S,SHADOW_BODY,  SHADOW_BODY_S,SHADOW_WISP,C,          C,         C],
      [C,          SHADOW_WISP, C,           C,            SHADOW_WISP,  C,            C,          SHADOW_WISP,C,         C],
    ]));

    const SHADOW_EYE_GLOW = 0xFF5252;
    const SHADOW_CHARGE = 0xEA80FC;
    this.textures.set('enemy_shadow_telegraph', this.createSpriteTexture([
      [SHADOW_CHARGE,C,       SHADOW_WISP, SHADOW_BODY_H,SHADOW_BODY_H,SHADOW_BODY_H,SHADOW_WISP,C,         SHADOW_CHARGE,C],
      [C,          SHADOW_BODY, SHADOW_BODY_H,SHADOW_EYE_GLOW,SHADOW_BODY,SHADOW_EYE_GLOW,SHADOW_BODY_H,SHADOW_BODY,C,C],
      [C,          SHADOW_BODY_S,SHADOW_CHARGE,SHADOW_BODY,SHADOW_GLOW,SHADOW_BODY,SHADOW_CHARGE,SHADOW_BODY_S,C,  C],
      [SHADOW_CHARGE,SHADOW_BODY,SHADOW_BODY_S,SHADOW_CHARGE,SHADOW_GLOW,SHADOW_CHARGE,SHADOW_BODY_S,SHADOW_BODY,SHADOW_CHARGE,C],
      [C,          SHADOW_BODY_S,SHADOW_BODY,SHADOW_BODY,SHADOW_BODY,SHADOW_BODY,SHADOW_BODY,SHADOW_BODY_S,C,     C],
      [C,          C,           SHADOW_BODY_S,SHADOW_BODY,SHADOW_BODY_S,SHADOW_BODY,SHADOW_BODY_S,C,        C,     C],
      [C,          C,           SHADOW_WISP, SHADOW_BODY_S,SHADOW_BODY,SHADOW_BODY_S,SHADOW_WISP,C,         C,     C],
      [C,          SHADOW_WISP, C,           C,           SHADOW_WISP, C,           C,          SHADOW_WISP,C,     C],
    ]));

    this.textures.set('enemy_shadow_attack', this.createSpriteTexture([
      [C,          SHADOW_WISP, SHADOW_CHARGE,SHADOW_BODY_H,SHADOW_BODY_H,SHADOW_BODY_H,SHADOW_CHARGE,SHADOW_WISP,C,C],
      [SHADOW_WISP,SHADOW_BODY, SHADOW_BODY_H,SHADOW_EYE_GLOW,SHADOW_GLOW,SHADOW_EYE_GLOW,SHADOW_BODY_H,SHADOW_BODY,SHADOW_WISP,C],
      [SHADOW_CHARGE,SHADOW_BODY_S,SHADOW_BODY,SHADOW_GLOW,SHADOW_CHARGE,SHADOW_GLOW,SHADOW_BODY,SHADOW_BODY_S,SHADOW_CHARGE,C],
      [SHADOW_WISP,SHADOW_BODY,SHADOW_BODY_S,SHADOW_BODY,SHADOW_BODY_S,SHADOW_BODY,SHADOW_BODY_S,SHADOW_BODY,SHADOW_WISP,C],
      [C,          SHADOW_BODY_S,SHADOW_BODY,SHADOW_BODY,SHADOW_BODY,SHADOW_BODY,SHADOW_BODY,SHADOW_BODY_S,C,         C],
      [C,          C,           SHADOW_BODY_S,SHADOW_BODY,SHADOW_BODY_S,SHADOW_BODY,SHADOW_BODY_S,C,        C,         C],
      [C,          C,           SHADOW_WISP, SHADOW_BODY_S,SHADOW_BODY,SHADOW_BODY_S,SHADOW_WISP,C,         C,         C],
      [C,          SHADOW_WISP, C,           C,           SHADOW_WISP, C,           C,          SHADOW_WISP,C,         C],
    ]));

    // ========== NEW ENEMY: Plant Monster ==========
    const VINE = 0x2E7D32;
    const VINE_H = 0x43A047;
    const VINE_S = 0x1B5E20;
    const PETAL_E = 0xE91E63;
    const PETAL_EH = 0xF06292;
    const THORN = 0x5D4037;
    const BULB = 0x8BC34A;
    const BULB_S = 0x689F38;

    this.textures.set('enemy_plant', this.createSpriteTexture([
      [C,       C,       PETAL_EH,PETAL_E, PETAL_EH,PETAL_E, C,       C,       C,       C],
      [C,       PETAL_E, PETAL_EH,0xFFEB3B,0xFFEB3B,PETAL_EH,PETAL_E, C,       C,       C],
      [VINE_S,  VINE,    PETAL_E, PETAL_EH,PETAL_E, PETAL_E, VINE,    VINE_S,  C,       C],
      [C,       VINE_S,  VINE,    BULB,    BULB_S,  VINE,    VINE_S,  C,       C,       C],
      [THORN,   VINE,    VINE_H,  VINE,    VINE,    VINE_H,  VINE,    THORN,   C,       C],
      [C,       VINE_S,  VINE,    VINE_S,  VINE_S,  VINE,    VINE_S,  C,       C,       C],
      [C,       C,       VINE_S,  VINE,    VINE,    VINE_S,  C,       C,       C,       C],
      [C,       VINE_S,  C,       VINE_S,  VINE_S,  C,       VINE_S,  C,       C,       C],
    ]));

    this.textures.set('enemy_plant_telegraph', this.createSpriteTexture([
      [PETAL_EH,C,       PETAL_EH,PETAL_E, PETAL_EH,PETAL_E, C,       PETAL_EH,C,       C],
      [C,       PETAL_E, 0xFFEB3B,0xFFEB3B,0xFFEB3B,0xFFEB3B,PETAL_E, C,       C,       C],
      [VINE,    VINE_H,  PETAL_E, PETAL_EH,PETAL_E, PETAL_E, VINE_H,  VINE,    C,       C],
      [THORN,   VINE,    VINE_H,  BULB,    BULB_S,  VINE_H,  VINE,    THORN,   C,       C],
      [THORN,   VINE_H,  VINE,    VINE_H,  VINE_H,  VINE,    VINE_H,  THORN,   C,       C],
      [C,       VINE,    VINE_S,  VINE,    VINE,    VINE_S,  VINE,    C,       C,       C],
      [C,       C,       VINE_S,  VINE,    VINE,    VINE_S,  C,       C,       C,       C],
      [C,       VINE_S,  C,       VINE_S,  VINE_S,  C,       VINE_S,  C,       C,       C],
    ]));

    this.textures.set('enemy_plant_attack', this.createSpriteTexture([
      [PETAL_E, PETAL_EH,PETAL_E, PETAL_EH,PETAL_E, PETAL_EH,PETAL_E, PETAL_EH,C,       C],
      [THORN,   PETAL_E, 0xFFEB3B,0xFFEB3B,0xFFEB3B,0xFFEB3B,PETAL_E, THORN,   C,       C],
      [THORN,   VINE_H,  PETAL_E, PETAL_EH,PETAL_E, PETAL_E, VINE_H,  THORN,   C,       C],
      [C,       VINE,    VINE_H,  BULB,    BULB_S,  VINE_H,  VINE,    C,       C,       C],
      [THORN,   VINE_H,  VINE,    VINE_H,  VINE_H,  VINE,    VINE_H,  THORN,   C,       C],
      [C,       VINE,    VINE_S,  VINE,    VINE,    VINE_S,  VINE,    C,       C,       C],
      [C,       C,       VINE_S,  VINE,    VINE,    VINE_S,  C,       C,       C,       C],
      [C,       VINE_S,  C,       VINE_S,  VINE_S,  C,       VINE_S,  C,       C,       C],
    ]));

    // ========== NEW ENEMY: Skeleton Warrior ==========
    const BONE = 0xEEEEEE;
    const BONE_S = 0xBDBDBD;
    const BONE_D = 0x9E9E9E;
    const SK_EYE = 0xFF1744;
    const SK_HELM = 0x546E7A;
    const SK_HELM_H = 0x78909C;
    const SK_SWORD = 0xB0BEC5;

    this.textures.set('enemy_skeleton', this.createSpriteTexture([
      [C,       C,       SK_HELM, SK_HELM_H,SK_HELM, SK_HELM_H,SK_HELM, C,       C,       C],
      [C,       SK_HELM, BONE,    SK_EYE,   BONE_S,  SK_EYE,   BONE,    SK_HELM, C,       C],
      [C,       C,       BONE_S,  BONE,     BONE_D,  BONE,     BONE_S,  C,       C,       C],
      [C,       SK_SWORD,BONE,    BONE_S,   BONE,    BONE_S,   BONE,    SK_SWORD,C,       C],
      [C,       SK_SWORD,C,       BONE_D,   BONE,    BONE_D,   C,       SK_SWORD,C,       C],
      [C,       C,       C,       BONE,     BONE_S,  BONE,     C,       C,       C,       C],
      [C,       C,       BONE,    C,        C,       C,        BONE,    C,       C,       C],
      [C,       C,       BONE_D,  C,        C,       C,        BONE_D,  C,       C,       C],
    ]));

    this.textures.set('enemy_skeleton_telegraph', this.createSpriteTexture([
      [C,       SK_SWORD,SK_HELM, SK_HELM_H,SK_HELM, SK_HELM_H,SK_HELM, SK_SWORD,C,       C],
      [C,       SK_HELM, BONE,    SK_EYE,   BONE_S,  SK_EYE,   BONE,    SK_HELM, C,       C],
      [C,       C,       BONE_S,  BONE,     BONE_D,  BONE,     BONE_S,  C,       C,       C],
      [SK_SWORD,SK_SWORD,BONE,    BONE_S,   BONE,    BONE_S,   BONE,    SK_SWORD,SK_SWORD,C],
      [C,       C,       C,       BONE_D,   BONE,    BONE_D,   C,       C,       C,       C],
      [C,       C,       C,       BONE,     BONE_S,  BONE,     C,       C,       C,       C],
      [C,       C,       BONE,    C,        C,       C,        BONE,    C,       C,       C],
      [C,       C,       BONE_D,  C,        C,       C,        BONE_D,  C,       C,       C],
    ]));

    this.textures.set('enemy_skeleton_attack', this.createSpriteTexture([
      [SK_SWORD,C,       SK_HELM, SK_HELM_H,SK_HELM, SK_HELM_H,SK_HELM, C,       SK_SWORD,C],
      [SK_SWORD,SK_HELM, BONE,    SK_EYE,   BONE_S,  SK_EYE,   BONE,    SK_HELM, SK_SWORD,C],
      [C,       C,       BONE_S,  BONE,     BONE_D,  BONE,     BONE_S,  C,       C,       C],
      [C,       BONE,    BONE,    BONE_S,   BONE,    BONE_S,   BONE,    BONE,    C,       C],
      [C,       C,       C,       BONE_D,   BONE,    BONE_D,   C,       C,       C,       C],
      [C,       C,       C,       BONE,     BONE_S,  BONE,     C,       C,       C,       C],
      [C,       C,       BONE,    C,        C,       C,        BONE,    C,       C,       C],
      [C,       C,       BONE_D,  C,        C,       C,        BONE_D,  C,       C,       C],
    ]));

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
    this.registerTexture('enemy_bandit', () => this.createChibiCharacter('down', 'idle', 0, banditPalette));
    this.registerTexture('enemy_bandit_telegraph', () => this.createChibiCharacter('down', 'charge', 0, banditPalette));
    this.registerTexture('enemy_bandit_attack', () => this.createChibiCharacter('down', 'attack', 1, banditPalette));

    // ========== FIELD BOSS: Golem ==========
    const GOL = 0x607060;
    const GOL_H = 0x788878;
    const GOL_S = 0x485048;
    const GOL_D = 0x303830;
    const GOL_EYE = 0xFF4400;
    const GOL_RUNE = 0x44FFAA;

    this.textures.set('enemy_golem', this.createSpriteTexture([
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
    ]));

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
    ]));

    // ========== TERRAIN ==========
    this.textures.set('grass', this.createColorTexture(0x4CAF50, 32, 32, 'noise'));
    this.textures.set('dirt', this.createColorTexture(0x8D6E63, 32, 32, 'noise'));
    this.textures.set('water', this.createColorTexture(0x1E88E5, 32, 32, 'noise'));
    this.textures.set('stone', this.createColorTexture(0x78909C, 32, 32, 'checker'));
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
    
    // New terrain tiles
    this.textures.set('cliff', this.createColorTexture(0x5D4037, 32, 32, 'gradient'));
    this.textures.set('cliff_edge', this.createColorTexture(0x4E342E, 32, 32, 'gradient'));
    this.textures.set('cobblestone', this.createColorTexture(0x9E9E9E, 32, 32, 'checker'));
    this.textures.set('farmland', this.createColorTexture(0x6D4C41, 32, 32, 'noise'));
    this.textures.set('dark_grass', this.createColorTexture(0x2E7D32, 32, 32, 'noise'));
    this.textures.set('mossy_stone', this.createColorTexture(0x607060, 32, 32, 'checker'));
    this.textures.set('wooden_path', this.createColorTexture(0x8D6E63, 32, 32, 'gradient'));

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

    // House - bigger (14x12)
    const WALL = 0x8D6E63;
    const WALL_H = 0xA1887F;
    const WALL_S = 0x6D4C41;
    const ROOF = 0xB71C1C;
    const ROOF_H = 0xD32F2F;
    const ROOF_S = 0x7F0000;
    const WINDOW = 0xBBDEFB;
    const DOOR = 0x4E342E;

    this.textures.set('house', this.createSpriteTexture([
      [C,     C,     C,     C,     C,     ROOF_S,ROOF, ROOF_H,ROOF, C,     C,     C,     C,     C],
      [C,     C,     C,     C,     ROOF_S,ROOF,  ROOF_H,ROOF, ROOF, ROOF_S,C,     C,     C,     C],
      [C,     C,     C,     ROOF_S,ROOF,  ROOF,  ROOF, ROOF,  ROOF, ROOF,  ROOF_S,C,     C,     C],
      [C,     C,     ROOF_S,ROOF,  ROOF,  ROOF_H,ROOF, ROOF,  ROOF_H,ROOF, ROOF,  ROOF_S,C,     C],
      [C,     C,     WALL,  WALL_H,WALL,  WALL,  WALL, WALL,  WALL, WALL,  WALL_H,WALL,  C,     C],
      [C,     C,     WALL,  WINDOW,WINDOW,WALL,  WALL_H,WALL, WINDOW,WINDOW,WALL,  WALL,  C,     C],
      [C,     C,     WALL_S,WINDOW,WINDOW,WALL_S,WALL, WALL_S,WINDOW,WINDOW,WALL_S,WALL_S,C,     C],
      [C,     C,     WALL,  WALL,  WALL,  WALL,  DOOR, DOOR,  WALL, WALL,  WALL,  WALL,  C,     C],
      [C,     C,     WALL_S,WALL,  WALL,  WALL,  DOOR, DOOR,  WALL, WALL,  WALL,  WALL_S,C,     C],
      [C,     C,     WALL_S,WALL_S,WALL_S,WALL_S,WALL_S,WALL_S,WALL_S,WALL_S,WALL_S,WALL_S,C,   C],
    ]));

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
