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

  getTexture(name: string): THREE.Texture | undefined {
    return this.textures.get(name);
  }

  loadDefaultAssets() {
    const C = 0; // transparent

    const mirrorSprite = (sprite: number[][]): number[][] => {
      return sprite.map(row => [...row].reverse());
    };

    // ===== VANILLA FANTASY HERO PALETTE =====
    // Skin - warm peachy
    const SK   = 0xFFE0BD;
    const SK_H = 0xFFF0D8;
    const SK_S = 0xE8C4A0;
    const SK_D = 0xD4A878;
    const BLUSH = 0xFFA8A8;
    // Hair - warm chestnut brown
    const HR   = 0x8B6040;
    const HR_H = 0xA87850;
    const HR_S = 0x6B4428;
    const HR_D = 0x503018;
    const HR_T = 0x7A5238;
    const HR_B = 0xC09060; // golden highlight
    // Eyes - big warm brown anime eyes
    const EY_W = 0xFFFFFF;
    const EY   = 0x7B5B3A;
    const EY_H = 0x9B7B50;
    const EY_D = 0x5A3E20;
    const EY_P = 0x2A1A08;
    const EY_G = 0xFFFFFF; // eye shine/sparkle
    const EY_HURT = 0x888888;
    const EY_CHG = 0xFFD700;
    const EY_CHG2 = 0xFFA000;
    const MOUTH = 0xD06050;
    const MOUTH_O = 0xC04030; // open mouth
    const MOUTH_H = 0xCC4444;
    const MOUTH_C = 0xFF8C00;
    const BROW = 0x503018;

    // Outfit - blue tunic with gold trim (like reference)
    const TUN   = 0x3A8AC0; // main tunic blue
    const TUN_H = 0x50A0D8; // tunic highlight
    const TUN_S = 0x286890; // tunic shadow
    const TUN_D = 0x1A5070; // tunic dark
    // Gold trim/accents
    const GOLD  = 0xE8C030;
    const GOLD_H = 0xFFD850;
    const GOLD_S = 0xB89820;
    // Inner shirt
    const SHIRT = 0x404048;
    const SHIRT_H = 0x505058;
    // Belt
    const BELT   = 0x6B4428;
    const BELT_B = 0xE8C030; // gold buckle
    // Pants/shorts - dark brown
    const PANT   = 0x5A4030;
    const PANT_S = 0x3E2818;
    const PANT_H = 0x6E5040;
    // Boots - brown leather
    const BOOT   = 0x6B4428;
    const BOOT_H = 0x8B6040;
    const BOOT_S = 0x503018;
    const BOOT_T = 0xE8C030; // gold boot trim
    // Gloves - brown leather
    const GLV  = 0x6B4428;
    const GLV_H = 0x8B6040;

    // Cape - flowing blue
    const CAPE  = 0x3080B8;
    const CAPE_H = 0x4898D0;
    const CAPE_S = 0x206898;
    const CAPE_D = 0x185078;

    // Sword - classic straight blade
    const BL   = 0xD0D8E0;
    const BL_H = 0xF0F4FF;
    const BL_S = 0xA0A8B8;
    const GRD  = 0xE8C030; // gold crossguard
    const GRD_H = 0xFFD850;
    const GRP  = 0x5A3020; // leather grip
    const POM  = 0xE8C030; // gold pommel

    // Charge glow
    const CG   = 0x50B8FF;
    const CG2  = 0x3090DD;
    const CG_B = 0x80D0FF;

    // ========== PLAYER DOWN - Classic Fantasy Hero (16x20) ==========
    const downIdle0: number[][] = [
      // Hair - soft, tousled brown, slightly spiky top
      [C,  C,  C,  C,  C,  HR_S,HR, HR_H,HR_B,HR, HR_S,C,  C,  C,  C,  C ],
      [C,  C,  C,  C,  HR_S,HR, HR_H,HR_B,HR_H,HR, HR_H,HR_S,C,  C,  C,  C ],
      [C,  C,  C,  HR_D,HR, HR_H,HR_B,HR, HR, HR_B,HR_H,HR, HR_D,C,  C,  C ],
      [C,  C,  C,  HR_S,HR, HR_B,HR_H,HR, HR, HR_H,HR_B,HR, HR_S,C,  C,  C ],
      // Bangs frame forehead
      [C,  C,  C,  HR_D,HR, HR_S,SK_H,SK, SK, SK_H,HR_S,HR, HR_D,C,  C,  C ],
      [C,  C,  C,  HR_S,SK, SK, SK_H,SK, SK, SK_H,SK, SK, HR_S,C,  C,  C ],
      // Eyes - big, round, warm brown with sparkle (chibi!)
      [C,  C,  C,  SK, BROW,EY_W,EY_H,EY, SK, EY, EY_H,EY_W,BROW,SK, C,  C ],
      [C,  C,  C,  SK, SK, EY_G,EY, EY_D,SK_S,EY_D,EY, EY_G,SK, SK, C,  C ],
      // Nose + blush
      [C,  C,  C,  C,  SK, BLUSH,SK, SK_S,SK, SK, BLUSH,SK, C,  C,  C,  C ],
      // Open happy mouth
      [C,  C,  C,  C,  C,  SK, SK_S,MOUTH_O,MOUTH,SK, SK, C,  C,  C,  C,  C ],
      // Neck area
      [C,  C,  C,  C,  C,  SK, SK_S,SHIRT,SK_S,SK, SK, C,  C,  C,  C,  C ],
      // Shoulders - tunic with gold trim, cape behind
      [C,  C,  C,  CAPE_S,TUN_S,GOLD,TUN, TUN_H,TUN, GOLD,TUN_S,CAPE_S,C,  C,  C,  C ],
      // Torso + belt
      [C,  C,  C,  CAPE,TUN, GOLD_S,TUN_H,TUN, TUN_H,GOLD_S,TUN, CAPE,C,  C,  C,  C ],
      // Arms + sword on left
      [C,  BL_H,BL, GLV, GLV_H,TUN_S,BELT,BELT_B,BELT,TUN_S,GLV_H,GLV, C,  C,  C,  C ],
      // Sword handle + lower body
      [C,  GRD,BL_S,C,  GLV, TUN_D,TUN_S,TUN, TUN_S,TUN_D,GLV, C,  C,  C,  C,  C ],
      // Cape tails + pants
      [C,  POM,C,  C,  CAPE_D,PANT,PANT_H,PANT,PANT_H,PANT,CAPE_D,C,  C,  C,  C,  C ],
      // Legs
      [C,  C,  C,  C,  C,  PANT_S,PANT,C,  PANT,PANT_S,C,  C,  C,  C,  C,  C ],
      // Boots with gold trim
      [C,  C,  C,  C,  BOOT_S,BOOT,BOOT_T,BOOT_H,BOOT_T,BOOT,BOOT_S,C,  C,  C,  C,  C ],
      // Hair tips at sides
      [C,  C,  C,  HR_D,HR_S,C,  C,  C,  C,  C,  HR_S,HR_D,C,  C,  C,  C ],
      [C,  C,  C,  C,  HR_D,C,  C,  C,  C,  C,  HR_D,C,  C,  C,  C,  C ],
    ];

    const downIdle1 = downIdle0.map((row, i) => {
      if (i === 11) return [C,C,C,CAPE_H,TUN_S,GOLD,TUN,TUN_H,TUN,GOLD,TUN_S,CAPE_H,C,C,C,C]; // cape flutter
      if (i === 18) return [C,C,C,HR_S,HR_D,C,C,C,C,C,HR_D,HR_S,C,C,C,C]; // hair sway
      return row;
    });

    this.textures.set('player_down_idle_0', this.createSpriteTexture(downIdle0, 4));
    this.textures.set('player_down_idle_1', this.createSpriteTexture(downIdle1, 4));

    // Walk frames
    const downWalk0 = downIdle0.map((row, i) => {
      if (i === 15) return [C,POM,C,C,CAPE_D,PANT,PANT_H,PANT,PANT_H,PANT,CAPE_D,C,C,C,C,C];
      if (i === 16) return [C,C,C,C,BOOT,PANT_S,C,C,C,PANT,BOOT,C,C,C,C,C];
      if (i === 17) return [C,C,C,C,BOOT_S,BOOT_T,C,C,C,BOOT_T,BOOT_S,C,C,C,C,C];
      return row;
    });
    const downWalk1 = downIdle0.map((row, i) => {
      if (i === 15) return [C,POM,C,C,CAPE_D,PANT,PANT_H,PANT,PANT_H,PANT,CAPE_D,C,C,C,C,C];
      if (i === 16) return [C,C,C,C,PANT,PANT_S,C,C,C,BOOT,PANT,C,C,C,C,C];
      if (i === 17) return [C,C,C,C,BOOT_T,BOOT_S,C,C,C,BOOT_S,BOOT_T,C,C,C,C,C];
      return row;
    });

    this.textures.set('player_down_walk_0', this.createSpriteTexture(downWalk0, 4));
    this.textures.set('player_down_walk_1', this.createSpriteTexture(downWalk1, 4));

    // Attack frames - sword swings
    const downAtk0 = downIdle0.map((row, i) => {
      if (i === 0) return [C,C,POM,GRD,BL_S,HR_S,HR,HR_H,HR_B,HR,HR_S,C,C,C,C,C];
      if (i === 1) return [C,C,C,GRP,BL,HR_S,HR,HR_H,HR_B,HR_H,HR,HR_S,C,C,C,C];
      if (i === 2) return [C,C,C,C,BL_H,HR,HR_H,HR_B,HR,HR_B,HR_H,HR,HR_D,C,C,C];
      if (i === 6) return [C,C,C,SK,BROW,EY_W,EY_D,EY_P,SK,EY_P,EY_D,EY_W,BROW,SK,C,C];
      if (i === 9) return [C,C,C,C,C,BROW,SK_S,MOUTH_O,SK_S,BROW,SK,C,C,C,C,C];
      return row;
    });
    const downAtk1 = downIdle0.map((row, i) => {
      if (i === 6) return [C,C,C,SK,BROW,EY_W,EY_D,EY_P,SK,EY_P,EY_D,EY_W,BROW,SK,C,C];
      if (i === 9) return [C,C,C,C,C,BROW,SK_S,MOUTH_O,SK_S,BROW,SK,C,C,C,C,C];
      if (i === 13) return [BL_H,BL,BL_S,GRD,GLV_H,TUN_S,BELT,BELT_B,BELT,TUN_S,GLV_H,GLV,C,C,C,C];
      return row;
    });
    const downAtk2 = downIdle0.map((row, i) => {
      if (i === 15) return [POM,GRD,BL_S,BL,BL_H,PANT,PANT_H,PANT,PANT_H,PANT,CAPE_D,C,C,C,C,C];
      return row;
    });

    this.textures.set('player_down_attack_0', this.createSpriteTexture(downAtk0, 4));
    this.textures.set('player_down_attack_1', this.createSpriteTexture(downAtk1, 4));
    this.textures.set('player_down_attack_2', this.createSpriteTexture(downAtk2, 4));

    // Charge frames - glowing sword
    const downChg0 = downAtk0.map((row, i) => {
      if (i === 0) return [C,C,POM,GRD_H,CG_B,HR_S,HR,HR_H,HR_B,HR,HR_S,C,C,C,C,C];
      if (i === 1) return [C,C,C,GRP,CG_B,HR_S,HR,HR_H,HR_B,HR_H,HR,HR_S,C,C,C,C];
      if (i === 2) return [C,C,C,C,CG,HR,HR_H,HR_B,HR,HR_B,HR_H,HR,HR_D,C,C,C];
      if (i === 6) return [C,C,C,SK,BROW,EY_W,EY_CHG,EY_CHG2,SK,EY_CHG2,EY_CHG,EY_W,BROW,SK,C,C];
      if (i === 9) return [C,C,C,C,C,BROW,SK_S,MOUTH_C,SK_S,BROW,SK,C,C,C,C,C];
      return row;
    });
    const downChg1 = downAtk1.map((row, i) => {
      if (i === 6) return [C,C,C,SK,BROW,EY_W,EY_CHG,EY_CHG2,SK,EY_CHG2,EY_CHG,EY_W,BROW,SK,C,C];
      if (i === 9) return [C,C,C,C,C,BROW,SK_S,MOUTH_C,SK_S,BROW,SK,C,C,C,C,C];
      if (i === 13) return [CG,CG_B,CG_B,GRD_H,GLV_H,TUN_S,BELT,BELT_B,BELT,TUN_S,GLV_H,GLV,C,C,C,C];
      return row;
    });
    const downChg2 = downAtk2.map((row, i) => {
      if (i === 15) return [POM,GRD_H,CG_B,CG,CG2,PANT,PANT_H,PANT,PANT_H,PANT,CAPE_D,C,C,C,C,C];
      return row;
    });

    this.textures.set('player_down_charge_0', this.createSpriteTexture(downChg0, 4));
    this.textures.set('player_down_charge_1', this.createSpriteTexture(downChg1, 4));
    this.textures.set('player_down_charge_2', this.createSpriteTexture(downChg2, 4));

    // Hurt frame
    const downHurt = downIdle0.map((row, i) => {
      if (i === 6) return [C,C,C,SK,BROW,EY_W,EY_HURT,BROW,SK,BROW,EY_HURT,EY_W,BROW,SK,C,C];
      if (i === 9) return [C,C,C,C,C,SK,SK_S,MOUTH_H,SK_S,SK,SK,C,C,C,C,C];
      return row;
    });
    this.textures.set('player_down_hurt_0', this.createSpriteTexture(downHurt, 4));

    // ========== PLAYER UP - Back view (16x20) ==========
    const upIdle0: number[][] = [
      [C,  C,  C,  C,  C,  HR_S,HR, HR_H,HR_B,HR, HR_S,C,  C,  C,  C,  C ],
      [C,  C,  C,  C,  HR_S,HR, HR_H,HR_B,HR_H,HR, HR_H,HR_S,C,  C,  C,  C ],
      [C,  C,  C,  HR_D,HR, HR_H,HR_B,HR, HR, HR_B,HR_H,HR, HR_D,C,  C,  C ],
      [C,  C,  C,  HR_S,HR, HR_B,HR_H,HR, HR, HR_H,HR_B,HR, HR_S,C,  C,  C ],
      [C,  C,  C,  HR_D,HR, HR_T,HR_S,HR, HR, HR_S,HR_T,HR, HR_D,C,  C,  C ],
      [C,  C,  C,  HR_S,HR, HR_S,HR, HR_S,HR, HR, HR_S,HR, HR_S,C,  C,  C ],
      [C,  C,  C,  HR_D,HR, HR, HR_S,HR, HR, HR_S,HR, HR, HR_D,C,  C,  C ],
      [C,  C,  C,  C,  HR_S,HR, HR, HR_S,HR, HR, HR, HR_S,C,  C,  C,  C ],
      [C,  C,  C,  C,  C,  SK, SK, SK_S,SK_S,SK, SK, C,  C,  C,  C,  C ],
      [C,  C,  C,  C,  C,  SK, SK, SK_S,SK, SK, SK, C,  C,  C,  C,  C ],
      [C,  C,  C,  C,  C,  SK, SK_S,SHIRT,SK_S,SK, SK, C,  C,  C,  C,  C ],
      [C,  C,  C,  CAPE_S,TUN_S,TUN, TUN, TUN_S,TUN, TUN, TUN_S,CAPE_S,C,  C,  C,  C ],
      [C,  C,  C,  CAPE,TUN, GOLD_S,TUN_H,TUN, TUN_H,GOLD_S,TUN, CAPE,C,  C,  C,  C ],
      [C,  BL_H,BL, GLV, GLV_H,TUN_S,BELT,BELT,BELT,TUN_S,GLV_H,GLV, C,  C,  C,  C ],
      [C,  GRD,BL_S,C,  GLV, TUN_D,TUN_S,TUN, TUN_S,TUN_D,GLV, C,  C,  C,  C,  C ],
      [C,  POM,C,  C,  CAPE_D,PANT,PANT_H,PANT,PANT_H,PANT,CAPE_D,C,  C,  C,  C,  C ],
      [C,  C,  C,  C,  C,  PANT_S,PANT,C,  PANT,PANT_S,C,  C,  C,  C,  C,  C ],
      [C,  C,  C,  C,  BOOT_S,BOOT,BOOT_T,BOOT_H,BOOT_T,BOOT,BOOT_S,C,  C,  C,  C,  C ],
      // Cape flows down back
      [C,  C,  C,  CAPE_D,CAPE_S,CAPE,CAPE_H,CAPE,CAPE_H,CAPE,CAPE_S,CAPE_D,C,  C,  C,  C ],
      [C,  C,  C,  C,  CAPE_D,CAPE_S,CAPE,CAPE_S,CAPE,CAPE_S,CAPE_D,C,  C,  C,  C,  C ],
    ];

    this.textures.set('player_up_idle_0', this.createSpriteTexture(upIdle0, 4));
    this.textures.set('player_up_idle_1', this.createSpriteTexture(upIdle0, 4));

    const upWalk0 = upIdle0.map((row, i) => {
      if (i === 16) return [C,C,C,C,BOOT,PANT_S,C,C,C,PANT,BOOT,C,C,C,C,C];
      if (i === 17) return [C,C,C,C,BOOT_S,BOOT_T,C,C,C,BOOT_T,BOOT_S,C,C,C,C,C];
      return row;
    });
    const upWalk1 = upIdle0.map((row, i) => {
      if (i === 16) return [C,C,C,C,PANT,PANT_S,C,C,C,BOOT,PANT,C,C,C,C,C];
      if (i === 17) return [C,C,C,C,BOOT_T,BOOT_S,C,C,C,BOOT_S,BOOT_T,C,C,C,C,C];
      return row;
    });

    this.textures.set('player_up_walk_0', this.createSpriteTexture(upWalk0, 4));
    this.textures.set('player_up_walk_1', this.createSpriteTexture(upWalk1, 4));

    const upAtk0 = upIdle0.map((row, i) => {
      if (i === 0) return [C,C,POM,GRD,BL_S,HR_S,HR,HR_H,HR_B,HR,HR_S,C,C,C,C,C];
      if (i === 1) return [C,C,C,GRP,BL,HR_S,HR,HR_H,HR_B,HR_H,HR,HR_S,C,C,C,C];
      if (i === 2) return [C,C,C,C,BL_H,HR,HR_H,HR_B,HR,HR_B,HR_H,HR,HR_D,C,C,C];
      return row;
    });
    this.textures.set('player_up_attack_0', this.createSpriteTexture(upAtk0, 4));
    this.textures.set('player_up_attack_1', this.textures.get('player_up_attack_0')!);
    const upAtk2 = upIdle0.map((row, i) => {
      if (i === 15) return [POM,GRD,BL_S,BL,BL_H,PANT,PANT_H,PANT,PANT_H,PANT,CAPE_D,C,C,C,C,C];
      return row;
    });
    this.textures.set('player_up_attack_2', this.createSpriteTexture(upAtk2, 4));

    this.textures.set('player_up_charge_0', this.textures.get('player_down_charge_0')!);
    this.textures.set('player_up_charge_1', this.textures.get('player_down_charge_1')!);
    this.textures.set('player_up_charge_2', this.textures.get('player_down_charge_2')!);
    this.textures.set('player_up_hurt_0', this.textures.get('player_down_hurt_0')!);

    // ========== PLAYER LEFT - ROBUST side view (16x20) ==========
    // Wide body profile with visible cape, arm, hair detail
    const leftIdle0: number[][] = [
      // Hair top
      [C,  C,  C,  C,  C,  HR_S,HR, HR_H,HR_B,HR, C,  C,  C,  C,  C,  C ],
      [C,  C,  C,  C,  HR_D,HR, HR_H,HR_B,HR, HR_H,HR_S,C,  C,  C,  C,  C ],
      [C,  C,  C,  HR_D,HR, HR_H,HR_B,HR, HR, HR, HR_H,HR_S,C,  C,  C,  C ],
      [C,  C,  C,  HR_S,HR, HR_B,HR_H,HR, HR, HR_T,HR, HR_S,C,  C,  C,  C ],
      // Side of face - wider profile
      [C,  C,  C,  HR_D,HR, SK, SK_H,SK, SK, HR, HR_T,HR_S,C,  C,  C,  C ],
      [C,  C,  C,  HR_S,SK, SK_H,SK, SK, SK_S,HR_S,HR, HR_D,C,  C,  C,  C ],
      // One big eye visible with sparkle
      [C,  C,  C,  SK, BROW,EY_W,EY_H,EY, EY_P,SK_S,HR_D,C,  C,  C,  C,  C ],
      [C,  C,  C,  SK, SK, EY_G,EY, EY_D,SK, SK_S,C,  C,  C,  C,  C,  C ],
      // Nose + blush cheek
      [C,  C,  C,  SK, SK, BLUSH,SK_S,SK, SK, C,  C,  C,  C,  C,  C,  C ],
      [C,  C,  C,  C,  SK, SK_S,MOUTH_O,SK, C,  C,  C,  C,  C,  C,  C,  C ],
      // Neck
      [C,  C,  C,  C,  SK, SK_S,SHIRT,SK, C,  C,  C,  C,  C,  C,  C,  C ],
      // Shoulder - tunic + cape behind (7px wide body)
      [C,  C,  C,  CAPE_S,TUN_S,GOLD,TUN, TUN_H,TUN, TUN_S,CAPE,C,  C,  C,  C,  C ],
      // Torso - arm visible
      [C,  C,  C,  CAPE,TUN, GOLD_S,BELT,BELT_B,TUN, TUN_S,CAPE_S,C,  C,  C,  C,  C ],
      // Arm + sword forward
      [C,  BL_H,BL, GLV, GLV_H,TUN_S,TUN, TUN, TUN_S,CAPE_D,C,  C,  C,  C,  C,  C ],
      [C,  GRD,BL_S,C,  GLV, TUN_D,TUN_S,TUN_D,CAPE_D,C,  C,  C,  C,  C,  C,  C ],
      // Cape tail flows behind + pants
      [C,  POM,C,  C,  CAPE_D,PANT,PANT_H,PANT,CAPE_S,CAPE_H,C,  C,  C,  C,  C,  C ],
      // Legs
      [C,  C,  C,  C,  C,  PANT_S,PANT,PANT,PANT_S,C,  C,  C,  C,  C,  C,  C ],
      // Boots
      [C,  C,  C,  C,  BOOT_S,BOOT,BOOT_T,BOOT_H,BOOT_S,C,  C,  C,  C,  C,  C,  C ],
      // Hair tips trailing behind
      [C,  C,  C,  C,  C,  C,  C,  C,  HR_S,HR, HR_S,HR_D,C,  C,  C,  C ],
      [C,  C,  C,  C,  C,  C,  C,  C,  C,  HR_D,HR_S,C,  C,  C,  C,  C ],
    ];

    this.textures.set('player_left_idle_0', this.createSpriteTexture(leftIdle0, 4));
    this.textures.set('player_left_idle_1', this.createSpriteTexture(leftIdle0.map((row, i) => {
      if (i === 15) return [C,POM,C,C,CAPE_D,PANT,PANT_H,PANT,CAPE_H,CAPE_S,C,C,C,C,C,C]; // cape flutter
      return row;
    }), 4));

    const leftWalk0 = leftIdle0.map((row, i) => {
      if (i === 16) return [C,C,C,C,BOOT,PANT_S,PANT,C,PANT,PANT_S,C,C,C,C,C,C];
      if (i === 17) return [C,C,C,C,BOOT_S,BOOT_T,C,C,BOOT_T,BOOT_S,C,C,C,C,C,C];
      return row;
    });
    const leftWalk1 = leftIdle0.map((row, i) => {
      if (i === 16) return [C,C,C,C,PANT,PANT_S,C,BOOT,C,PANT_S,C,C,C,C,C,C];
      if (i === 17) return [C,C,C,C,BOOT_T,C,C,BOOT_S,C,BOOT_T,C,C,C,C,C,C];
      return row;
    });

    this.textures.set('player_left_walk_0', this.createSpriteTexture(leftWalk0, 4));
    this.textures.set('player_left_walk_1', this.createSpriteTexture(leftWalk1, 4));

    // Left attack
    const leftAtk0 = leftIdle0.map((row, i) => {
      if (i === 6) return [C,C,C,SK,BROW,EY_W,EY_D,EY_P,SK_S,HR_D,C,C,C,C,C,C];
      if (i === 13) return [BL_H,BL,BL_S,GRD,GLV_H,TUN_S,TUN,TUN,TUN_S,CAPE_D,C,C,C,C,C,C];
      return row;
    });
    const leftAtk1 = leftIdle0.map((row, i) => {
      if (i === 6) return [C,C,C,SK,BROW,EY_W,EY_D,EY_P,SK_S,HR_D,C,C,C,C,C,C];
      if (i === 13) return [BL_H,BL,BL_S,BL,GRD,GLV_H,TUN_S,TUN,TUN_S,CAPE_D,C,C,C,C,C,C];
      return row;
    });
    const leftAtk2 = leftIdle0.map((row, i) => {
      if (i === 15) return [POM,GRD,BL_S,BL,BL_H,PANT,PANT_H,PANT,CAPE_S,CAPE_H,C,C,C,C,C,C];
      return row;
    });

    this.textures.set('player_left_attack_0', this.createSpriteTexture(leftAtk0, 4));
    this.textures.set('player_left_attack_1', this.createSpriteTexture(leftAtk1, 4));
    this.textures.set('player_left_attack_2', this.createSpriteTexture(leftAtk2, 4));

    // Left charge
    const leftChg0 = leftAtk0.map((row, i) => {
      if (i === 6) return [C,C,C,SK,BROW,EY_W,EY_CHG,EY_CHG2,SK_S,HR_D,C,C,C,C,C,C];
      if (i === 13) return [CG,CG_B,CG_B,GRD_H,GLV_H,TUN_S,TUN,TUN,TUN_S,CAPE_D,C,C,C,C,C,C];
      return row;
    });
    this.textures.set('player_left_charge_0', this.createSpriteTexture(leftChg0, 4));
    this.textures.set('player_left_charge_1', this.createSpriteTexture(leftChg0, 4));
    this.textures.set('player_left_charge_2', this.createSpriteTexture(leftChg0, 4));
    
    // Left hurt
    const leftHurt = leftIdle0.map((row, i) => {
      if (i === 6) return [C,C,C,SK,BROW,EY_W,EY_HURT,BROW,SK_S,HR_D,C,C,C,C,C,C];
      if (i === 9) return [C,C,C,C,SK,SK_S,MOUTH_H,SK,C,C,C,C,C,C,C,C];
      return row;
    });
    this.textures.set('player_left_hurt_0', this.createSpriteTexture(leftHurt, 4));

    // ========== PLAYER RIGHT (mirror of left) ==========
    this.textures.set('player_right_idle_0', this.createSpriteTexture(mirrorSprite(leftIdle0), 4));
    this.textures.set('player_right_idle_1', this.textures.get('player_right_idle_0')!);
    this.textures.set('player_right_walk_0', this.createSpriteTexture(mirrorSprite(leftWalk0), 4));
    this.textures.set('player_right_walk_1', this.createSpriteTexture(mirrorSprite(leftWalk1), 4));
    this.textures.set('player_right_attack_0', this.createSpriteTexture(mirrorSprite(leftAtk0.map(r => [...r])), 4));
    this.textures.set('player_right_attack_1', this.createSpriteTexture(mirrorSprite(leftAtk1.map(r => [...r])), 4));
    this.textures.set('player_right_attack_2', this.createSpriteTexture(mirrorSprite(leftAtk2.map(r => [...r])), 4));
    this.textures.set('player_right_charge_0', this.createSpriteTexture(mirrorSprite(leftChg0.map(r => [...r])), 4));
    this.textures.set('player_right_charge_1', this.textures.get('player_right_charge_0')!);
    this.textures.set('player_right_charge_2', this.textures.get('player_right_charge_0')!);
    this.textures.set('player_right_hurt_0', this.createSpriteTexture(mirrorSprite(leftHurt.map(r => [...r])), 4));

    // ========== DIAGONAL SPRITES ==========
    const diagDirs = ['down_left', 'down_right', 'up_left', 'up_right'] as const;
    const diagBase = { down_left: 'left', down_right: 'right', up_left: 'left', up_right: 'right' } as const;
    
    for (const dDir of diagDirs) {
      const base = diagBase[dDir];
      for (const state of ['idle', 'walk', 'attack']) {
        const frames = state === 'attack' ? 3 : 2;
        for (let f = 0; f < frames; f++) {
          const src = this.textures.get(`player_${base}_${state}_${f}`);
          if (src) this.textures.set(`player_${dDir}_${state}_${f}`, src);
        }
      }
      for (let f = 0; f < 3; f++) {
        const src = this.textures.get(`player_${base}_charge_${f}`);
        if (src) this.textures.set(`player_${dDir}_charge_${f}`, src);
      }
      const hurtSrc = this.textures.get(`player_${base}_hurt_0`);
      if (hurtSrc) this.textures.set(`player_${dDir}_hurt_0`, hurtSrc);
    }

    // Legacy aliases
    this.textures.set('player_down', this.textures.get('player_down_idle_0')!);
    this.textures.set('player_up', this.textures.get('player_up_idle_0')!);
    this.textures.set('player_left', this.textures.get('player_left_idle_0')!);
    this.textures.set('player_right', this.textures.get('player_right_idle_0')!);

    // ========== NPC SPRITES - Chibi Anime Style (matching protagonist proportions) ==========
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
  }
}
