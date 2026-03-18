import * as THREE from 'three';

export class AssetManager {
  private textures: Map<string, THREE.Texture>;
  private textureLoader: THREE.TextureLoader;

  constructor() {
    this.textures = new Map();
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
      // Sword
      if (atkFrame >= 1) {
        cell(m(3), 4 + bob, 0xD8E0E8); cell(m(3), 3 + bob, 0xD8E0E8); cell(m(3), 2 + bob, 0xF0F4FF);
        cell(m(3), 5 + bob, p.trimColor);
      } else {
        cell(m(4), 8 + bob, 0xD8E0E8); cell(m(4), 7 + bob, 0xD8E0E8); cell(m(4), 6 + bob, 0xF0F4FF);
        cell(m(4), 9 + bob, p.trimColor);
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
      if (state === 'attack') {
        cell(m(6), 5, 0xB03020);
      } else {
        cell(m(6), 5, p.skinShadow);
      }
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

      // Sword (left side)
      if (atkFrame >= 1) {
        cell(3, 3 + bob, 0xF0F4FF); cell(3, 4 + bob, 0xD8E0E8); cell(3, 5 + bob, 0xD8E0E8);
        cell(3, 6 + bob, p.trimColor);
      } else {
        cell(4, 7 + bob, 0xD8E0E8); cell(4, 6 + bob, 0xF0F4FF);
        cell(4, 8 + bob, p.trimColor);
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

      // Mouth
      if (state === 'attack' || state === 'charge') {
        cell(7, 5, 0xB03020); cell(8, 5, 0xB03020);
      } else if (state === 'hurt') {
        cell(7, 5, p.skinShadow); cell(8, 5, p.skinShadow);
      } else {
        cell(7, 5, p.skinShadow); cell(8, 5, p.skinShadow);
      }

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

  getTexture(name: string): THREE.Texture | undefined {
    return this.textures.get(name);
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
          const tex = this.createChibiCharacter(dir, state, f, heroPalette);
          this.textures.set(`player_${dir}_${state}_${f}`, tex);
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
          const src = this.textures.get(`player_${base}_${state}_${f}`);
          if (src) this.textures.set(`player_${dDir}_${state}_${f}`, src);
        }
      }
    }

    // Legacy aliases
    this.textures.set('player_down', this.textures.get('player_down_idle_0')!);
    this.textures.set('player_up', this.textures.get('player_up_idle_0')!);
    this.textures.set('player_left', this.textures.get('player_left_idle_0')!);
    this.textures.set('player_right', this.textures.get('player_right_idle_0')!);

    // Shared NPC palette constants
    const SK = 0xFFE0BD; const SK_H = 0xFFF0D8; const SK_S = 0xE8C4A0; const SK_D = 0xD4A878;
    const EY_W = 0xFFFFFF; const BROW = 0x503018; const MOUTH = 0xD06050;
    const PANT = 0x5A4030; const BOOT = 0x6B4428; const BOOT_H = 0x8B6040; const BOOT_S = 0x503018;

    // ========== NPC SPRITES - Chibi Anime Style ==========
    const NPC_W = 14; // NPCs use 14-wide sprites at cellSize 3

    // Elder - wise old man, long white beard, purple robes, crystal staff
    const ELD_ROBE = 0x5A1A8A;
    const ELD_ROBE_H = 0x7828AA;
    const ELD_ROBE_S = 0x3A0A6A;
    const ELD_HAIR = 0xE8E8F0;
    const ELD_HAIR_S = 0xC0C0D0;
    const ELD_BEARD = 0xE0E0E8;
    const ELD_BEARD_S = 0xC0C0C8;
    const ELD_STAFF = 0xCCA800;
    const ELD_STAFF_S = 0x997700;
    const ELD_GEM = 0x44BBFF;
    const ELD_GEM_G = 0x88DDFF;

    this.textures.set('npc_elder', this.createSpriteTexture([
      [C,  C,  C,  C,  ELD_HAIR_S,ELD_HAIR,ELD_HAIR,ELD_HAIR,ELD_HAIR,ELD_HAIR_S,C,  C,  C,  C],
      [C,  C,  C,  ELD_HAIR_S,ELD_HAIR,ELD_HAIR,ELD_HAIR,ELD_HAIR,ELD_HAIR,ELD_HAIR_S,C,  C,  C,  C],
      [C,  C,  C,  ELD_HAIR,SK, SK_H, SK, SK, SK_H, SK, ELD_HAIR,C,  C,  C],
      [C,  C,  C,  SK, BROW,0x5D4037,SK, SK, 0x5D4037,BROW,SK, C,  C,  C],
      [C,  C,  C,  C,  SK, SK, SK_S, SK_S, SK, SK, C,  C,  C,  C],
      [C,  C,  C,  C,  ELD_BEARD,ELD_BEARD,ELD_BEARD,ELD_BEARD,ELD_BEARD,ELD_BEARD,C,  C,  C,  C],
      [C,  C,  C,  C,  ELD_BEARD_S,ELD_BEARD,ELD_BEARD_S,ELD_BEARD,ELD_BEARD_S,C,  C,  C,  C,  C],
      [C,  ELD_STAFF,ELD_GEM,ELD_GEM_G,ELD_ROBE,ELD_ROBE_H,ELD_ROBE,ELD_ROBE_H,ELD_ROBE,ELD_ROBE,C,  C,  C,  C],
      [C,  ELD_STAFF,C,  C, ELD_ROBE_S,ELD_ROBE,ELD_ROBE_S,ELD_ROBE,ELD_ROBE_S,ELD_ROBE,C,  C,  C,  C],
      [C,  ELD_STAFF_S,C,  C, ELD_ROBE,ELD_ROBE,ELD_ROBE,ELD_ROBE,ELD_ROBE,ELD_ROBE,C,  C,  C,  C],
      [C,  C,  C,  C, ELD_ROBE,ELD_ROBE_S,C,  C,  ELD_ROBE_S,ELD_ROBE,C,  C,  C,  C],
      [C,  C,  C,  C, ELD_ROBE_S,ELD_ROBE,C,  C,  ELD_ROBE,ELD_ROBE_S,C,  C,  C,  C],
      [C,  C,  C,  BOOT_S,BOOT,BOOT_H,C,  C,  BOOT_H,BOOT,BOOT_S,C,  C,  C],
    ], 3));

    // Merchant - jolly with hat, orange vest, gold accents
    const MCH_VEST = 0xE06000;
    const MCH_VEST_H = 0xFF8800;
    const MCH_VEST_S = 0xBB4400;
    const MCH_HAT = 0x6D4C41;
    const MCH_HAT_H = 0x8D6E63;

    this.textures.set('npc_merchant', this.createSpriteTexture([
      [C,  C,  C,  MCH_HAT,MCH_HAT_H,MCH_HAT,MCH_HAT_H,MCH_HAT,MCH_HAT,C,  C,  C,  C,  C],
      [C,  C,  MCH_HAT,MCH_HAT,MCH_HAT,MCH_HAT,MCH_HAT,MCH_HAT,MCH_HAT,MCH_HAT,C,  C,  C,  C],
      [C,  C,  C,  SK, SK_H,SK, SK, SK_H,SK, C,  C,  C,  C,  C],
      [C,  C,  C,  SK, EY_W,0x5D4037,SK, 0x5D4037,EY_W,SK, C,  C,  C,  C],
      [C,  C,  C,  C,  SK, SK, SK_S,SK, SK, C,  C,  C,  C,  C],
      [C,  C,  C,  C,  C,  SK, MOUTH,SK, C,  C,  C,  C,  C,  C],
      [C,  C,  MCH_VEST,MCH_VEST_H,0xFFD700,MCH_VEST,0xFFE850,MCH_VEST_H,MCH_VEST,MCH_VEST,C,  C,  C,  C],
      [C,  C,  MCH_VEST_S,MCH_VEST,MCH_VEST_S,MCH_VEST,MCH_VEST_S,MCH_VEST,MCH_VEST_S,C,  C,  C,  C,  C],
      [C,  SK, C,  MCH_VEST,MCH_VEST,MCH_VEST,MCH_VEST,MCH_VEST,C,  SK, C,  C,  C,  C],
      [C,  C,  C,  C,  PANT,C,  C,  PANT,C,  C,  C,  C,  C,  C],
      [C,  C,  C,  BOOT_S,BOOT_H,C,  C,  BOOT_H,BOOT_S,C,  C,  C,  C,  C],
    ], 3));

    // Guard - armored, helmet, stern
    const G_ARM = 0x607080;
    const G_ARM_H = 0x788898;
    const G_ARM_S = 0x485060;
    const G_HELM = 0x506070;
    const G_HELM_H = 0x687888;
    const G_SWD = 0xB0BEC5;

    this.textures.set('npc_guard', this.createSpriteTexture([
      [C,  C,  C,  G_HELM,G_HELM_H,G_HELM,G_HELM_H,G_HELM,G_HELM,C,  C,  C,  C,  C],
      [C,  C,  C,  G_HELM,G_HELM,G_HELM_H,G_HELM,G_HELM,G_HELM,C,  C,  C,  C,  C],
      [C,  C,  C,  SK, SK, SK, SK, SK, SK, C,  C,  C,  C,  C],
      [C,  C,  C,  SK, EY_W,0x37474F,SK,0x37474F,EY_W,SK, C,  C,  C,  C],
      [C,  C,  C,  C,  SK, SK, SK_S,SK, SK, C,  C,  C,  C,  C],
      [C,  G_SWD,G_ARM,G_ARM_H,G_ARM,G_ARM_H,G_ARM,G_ARM_H,G_ARM,G_ARM,C,  C,  C,  C],
      [C,  G_SWD,G_ARM_S,G_ARM,G_ARM_S,G_ARM,G_ARM_S,G_ARM,G_ARM_S,C,  C,  C,  C,  C],
      [C,  C,  G_ARM,G_ARM,G_ARM,G_ARM,G_ARM,G_ARM,G_ARM,C,  C,  C,  C,  C],
      [C,  C,  C,  C,  PANT,C,  C,  PANT,C,  C,  C,  C,  C,  C],
      [C,  C,  C,  G_ARM_S,G_ARM_S,C,  C,  G_ARM_S,G_ARM_S,C,  C,  C,  C,  C],
    ], 3));

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

    this.textures.set('enemy_golem_telegraph', this.textures.get('enemy_golem')!);
    this.textures.set('enemy_golem_attack', this.textures.get('enemy_golem')!);

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
