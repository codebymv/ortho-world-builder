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
      // Subtle pixel noise for organic feel
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
          
          // Base color
          ctx.fillStyle = `rgb(${r}, ${g}, ${b})`;
          ctx.fillRect(x * cellSize, y * cellSize, cellSize, cellSize);
          
          // Subtle highlight on top-left pixel
          ctx.fillStyle = `rgba(255,255,255,0.15)`;
          ctx.fillRect(x * cellSize, y * cellSize, 1, 1);
          
          // Subtle shadow on bottom-right
          ctx.fillStyle = `rgba(0,0,0,0.1)`;
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
    // ========== PLAYER SPRITES (10x10 detailed adventurer) ==========
    const C = 0; // transparent
    const SKIN = 0xF5C8A0;
    const SKIN_S = 0xD4A574; // shadow
    const HAIR = 0x5C3317;
    const HAIR_H = 0x7A4A2A; // highlight
    const TUNIC = 0x2E7D32; // forest green tunic
    const TUNIC_S = 0x1B5E20;
    const TUNIC_H = 0x43A047;
    const BELT = 0x8D6E63;
    const BOOTS = 0x4E342E;
    const BOOTS_H = 0x6D4C41;
    const PANTS = 0x455A64;
    const CAPE = 0xC62828;
    const CAPE_S = 0x8E0000;
    const EYE = 0x1A237E;

    this.textures.set('player_down', this.createSpriteTexture([
      [C,  C,    C,     HAIR,  HAIR,  HAIR,   HAIR,  C,     C,   C],
      [C,  C,    HAIR,  HAIR_H,HAIR,  HAIR,   HAIR_H,HAIR,  C,   C],
      [C,  C,    SKIN,  SKIN,  SKIN,  SKIN,   SKIN,  SKIN,  C,   C],
      [C,  C,    SKIN,  EYE,   SKIN,  SKIN,   EYE,   SKIN,  C,   C],
      [C,  C,    C,     SKIN,  SKIN_S,SKIN,   SKIN,  C,     C,   C],
      [C,  CAPE, TUNIC, TUNIC_H,BELT, BELT,   TUNIC_H,TUNIC,CAPE,C],
      [C,  CAPE_S,TUNIC,TUNIC, TUNIC_S,TUNIC_S,TUNIC,TUNIC,CAPE_S,C],
      [C,  C,    SKIN,  TUNIC, TUNIC, TUNIC,  TUNIC, SKIN,  C,   C],
      [C,  C,    C,     PANTS, PANTS, PANTS,  PANTS, C,     C,   C],
      [C,  C,    BOOTS, BOOTS_H,C,    C,      BOOTS_H,BOOTS,C,   C],
    ]));

    this.textures.set('player_up', this.createSpriteTexture([
      [C,  C,    C,     HAIR,  HAIR,  HAIR,   HAIR,  C,     C,   C],
      [C,  C,    HAIR,  HAIR,  HAIR_H,HAIR_H, HAIR,  HAIR,  C,   C],
      [C,  C,    HAIR,  HAIR,  HAIR,  HAIR,   HAIR,  HAIR,  C,   C],
      [C,  C,    SKIN,  SKIN,  SKIN,  SKIN,   SKIN,  SKIN,  C,   C],
      [C,  C,    C,     SKIN,  SKIN,  SKIN,   SKIN,  C,     C,   C],
      [C,  CAPE, TUNIC, TUNIC, BELT,  BELT,   TUNIC, TUNIC, CAPE,C],
      [C,  CAPE_S,TUNIC,TUNIC_S,TUNIC_S,TUNIC_S,TUNIC_S,TUNIC,CAPE_S,C],
      [C,  C,    SKIN,  TUNIC, TUNIC, TUNIC,  TUNIC, SKIN,  C,   C],
      [C,  C,    C,     PANTS, PANTS, PANTS,  PANTS, C,     C,   C],
      [C,  C,    BOOTS, BOOTS_H,C,    C,      BOOTS_H,BOOTS,C,   C],
    ]));

    this.textures.set('player_left', this.createSpriteTexture([
      [C,  C,    C,     HAIR,  HAIR,  HAIR,   C,     C,     C,   C],
      [C,  C,    HAIR,  HAIR_H,HAIR,  HAIR,   HAIR,  C,     C,   C],
      [C,  C,    SKIN,  SKIN,  SKIN,  SKIN,   C,     C,     C,   C],
      [C,  C,    SKIN,  EYE,   SKIN,  SKIN_S, C,     C,     C,   C],
      [C,  C,    C,     SKIN,  SKIN_S,C,      C,     C,     C,   C],
      [C,  C,    TUNIC, TUNIC_H,BELT, TUNIC,  CAPE,  C,     C,   C],
      [C,  C,    TUNIC, TUNIC, TUNIC_S,TUNIC, CAPE_S,C,     C,   C],
      [C,  SKIN, C,     TUNIC, TUNIC, C,      C,     C,     C,   C],
      [C,  C,    C,     PANTS, PANTS, C,      C,     C,     C,   C],
      [C,  C,    BOOTS, BOOTS_H,C,    C,      C,     C,     C,   C],
    ]));

    this.textures.set('player_right', this.createSpriteTexture([
      [C,  C,    C,     C,     HAIR,  HAIR,   HAIR,  C,     C,   C],
      [C,  C,    C,     HAIR,  HAIR,  HAIR,   HAIR_H,HAIR,  C,   C],
      [C,  C,    C,     C,     SKIN,  SKIN,   SKIN,  SKIN,  C,   C],
      [C,  C,    C,     C,     SKIN_S,SKIN,   EYE,   SKIN,  C,   C],
      [C,  C,    C,     C,     C,     SKIN_S, SKIN,  C,     C,   C],
      [C,  C,    CAPE,  TUNIC, BELT,  TUNIC_H,TUNIC, C,     C,   C],
      [C,  C,    CAPE_S,TUNIC, TUNIC_S,TUNIC, TUNIC, C,     C,   C],
      [C,  C,    C,     C,     TUNIC, TUNIC,  C,     SKIN,  C,   C],
      [C,  C,    C,     C,     PANTS, PANTS,  C,     C,     C,   C],
      [C,  C,    C,     C,     C,     BOOTS_H,BOOTS, C,     C,   C],
    ]));

    // ========== NPC SPRITES (10x10 distinctive characters) ==========
    const ELDER_ROBE = 0x6A1B9A;
    const ELDER_ROBE_H = 0x8E24AA;
    const ELDER_ROBE_S = 0x4A148C;
    const BEARD = 0xE0E0E0;
    const STAFF = 0xFFB300;

    this.textures.set('npc_elder', this.createSpriteTexture([
      [C,  C,    C,     BEARD, BEARD, BEARD,  C,     C,     C,   C],
      [C,  C,    BEARD, SKIN,  SKIN,  SKIN,   BEARD, C,     C,   C],
      [C,  C,    SKIN,  0x5D4037,SKIN,0x5D4037,SKIN,  C,     C,   C],
      [C,  C,    C,     SKIN,  SKIN_S,SKIN,   C,     C,     C,   C],
      [C,  C,    C,     BEARD, BEARD, BEARD,  C,     C,     C,   C],
      [C,  STAFF,ELDER_ROBE,ELDER_ROBE_H,ELDER_ROBE,ELDER_ROBE_H,ELDER_ROBE,C,C,C],
      [C,  STAFF,ELDER_ROBE_S,ELDER_ROBE,ELDER_ROBE_S,ELDER_ROBE,ELDER_ROBE_S,C,C,C],
      [C,  STAFF,ELDER_ROBE,ELDER_ROBE,ELDER_ROBE,ELDER_ROBE,ELDER_ROBE,C,C,C],
      [C,  C,    C,     ELDER_ROBE_S,C,ELDER_ROBE_S,C,C,    C,   C],
      [C,  C,    BOOTS, BOOTS, C,    C,      BOOTS, BOOTS,  C,   C],
    ]));

    const MERCHANT_VEST = 0xE65100;
    const MERCHANT_VEST_H = 0xFF8F00;
    const MERCHANT_VEST_S = 0xBF360C;
    const HAT = 0x795548;
    const HAT_H = 0x8D6E63;
    const GOLD = 0xFFD700;

    this.textures.set('npc_merchant', this.createSpriteTexture([
      [C,  C,    HAT,   HAT_H, HAT,   HAT_H,  HAT,   C,     C,   C],
      [C,  HAT,  HAT,   HAT,   HAT,   HAT,    HAT,   HAT,   C,   C],
      [C,  C,    SKIN,  SKIN,  SKIN,  SKIN,   SKIN,  C,     C,   C],
      [C,  C,    SKIN,  0x5D4037,SKIN,0x5D4037,SKIN,  C,     C,   C],
      [C,  C,    C,     SKIN,  SKIN_S,SKIN,   C,     C,     C,   C],
      [C,  C,    MERCHANT_VEST,MERCHANT_VEST_H,GOLD,MERCHANT_VEST_H,MERCHANT_VEST,C,C,C],
      [C,  C,    MERCHANT_VEST_S,MERCHANT_VEST,MERCHANT_VEST_S,MERCHANT_VEST,MERCHANT_VEST_S,C,C,C],
      [C,  SKIN, C,     MERCHANT_VEST,MERCHANT_VEST,MERCHANT_VEST,C,SKIN,C,C],
      [C,  C,    C,     PANTS, C,     PANTS,  C,     C,     C,   C],
      [C,  C,    BOOTS, BOOTS_H,C,    C,      BOOTS_H,BOOTS, C,   C],
    ]));

    const ARMOR = 0x78909C;
    const ARMOR_H = 0x90A4AE;
    const ARMOR_S = 0x546E7A;
    const HELMET = 0x607D8B;
    const HELMET_H = 0x78909C;
    const SWORD = 0xB0BEC5;

    this.textures.set('npc_guard', this.createSpriteTexture([
      [C,  C,    HELMET,HELMET_H,HELMET,HELMET_H,HELMET,C,   C,   C],
      [C,  C,    HELMET,HELMET,HELMET_H,HELMET,HELMET,  C,   C,   C],
      [C,  C,    SKIN,  SKIN,  SKIN,  SKIN,   SKIN,  C,     C,   C],
      [C,  C,    SKIN,  0x37474F,SKIN,0x37474F,SKIN,  C,     C,   C],
      [C,  C,    C,     SKIN,  SKIN_S,SKIN,   C,     C,     C,   C],
      [C,  SWORD,ARMOR, ARMOR_H,ARMOR, ARMOR_H,ARMOR, C,     C,   C],
      [C,  SWORD,ARMOR_S,ARMOR, ARMOR_S,ARMOR, ARMOR_S,C,    C,   C],
      [C,  C,    ARMOR, ARMOR, ARMOR, ARMOR,  ARMOR, C,     C,   C],
      [C,  C,    C,     PANTS, C,     PANTS,  C,     C,     C,   C],
      [C,  C,    ARMOR_S,ARMOR_S,C,   C,      ARMOR_S,ARMOR_S,C, C],
    ]));

    // ========== TERRAIN TILES (with texture patterns) ==========
    this.textures.set('grass', this.createColorTexture(0x4CAF50, 32, 32, 'noise'));
    this.textures.set('dirt', this.createColorTexture(0x8D6E63, 32, 32, 'noise'));
    this.textures.set('water', this.createColorTexture(0x1E88E5, 32, 32, 'noise'));
    this.textures.set('stone', this.createColorTexture(0x78909C, 32, 32, 'checker'));
    this.textures.set('wood', this.createColorTexture(0x795548, 32, 32, 'gradient'));

    // ========== OBJECTS (10x10 detailed sprites) ==========
    const TRUNK = 0x5D4037;
    const TRUNK_S = 0x3E2723;
    const LEAF = 0x2E7D32;
    const LEAF_H = 0x66BB6A;
    const LEAF_S = 0x1B5E20;

    this.textures.set('tree', this.createSpriteTexture([
      [C,     C,     C,     LEAF_H,LEAF,  LEAF_H,LEAF,  C,     C,     C],
      [C,     C,     LEAF,  LEAF,  LEAF_H,LEAF,  LEAF,  LEAF,  C,     C],
      [C,     LEAF,  LEAF_H,LEAF,  LEAF,  LEAF,  LEAF_H,LEAF,  LEAF,  C],
      [LEAF_S,LEAF,  LEAF,  LEAF_S,LEAF_H,LEAF,  LEAF,  LEAF,  LEAF,  LEAF_S],
      [C,     LEAF_S,LEAF,  LEAF,  LEAF,  LEAF_S,LEAF,  LEAF,  LEAF_S,C],
      [C,     C,     LEAF_S,LEAF,  LEAF_S,LEAF,  LEAF_S,LEAF_S,C,     C],
      [C,     C,     C,     LEAF_S,LEAF,  LEAF_S,LEAF_S,C,     C,     C],
      [C,     C,     C,     C,     TRUNK, TRUNK_S,C,    C,     C,     C],
      [C,     C,     C,     C,     TRUNK_S,TRUNK,C,     C,     C,     C],
      [C,     C,     C,     TRUNK_S,TRUNK,TRUNK_S,TRUNK,C,     C,     C],
    ]));

    const WALL = 0x8D6E63;
    const WALL_H = 0xA1887F;
    const WALL_S = 0x6D4C41;
    const ROOF = 0xB71C1C;
    const ROOF_H = 0xD32F2F;
    const ROOF_S = 0x7F0000;
    const WINDOW = 0xBBDEFB;
    const DOOR = 0x4E342E;

    this.textures.set('house', this.createSpriteTexture([
      [C,     C,     C,     ROOF_S,ROOF,  ROOF_H,ROOF,  C,     C,     C],
      [C,     C,     ROOF_S,ROOF,  ROOF_H,ROOF,  ROOF,  ROOF_S,C,     C],
      [C,     ROOF_S,ROOF,  ROOF,  ROOF,  ROOF,  ROOF,  ROOF,  ROOF_S,C],
      [C,     WALL,  WALL_H,WALL,  WALL,  WALL,  WALL_H,WALL,  WALL,  C],
      [C,     WALL,  WINDOW,WINDOW,WALL,  WALL,  WINDOW,WINDOW,WALL,  C],
      [C,     WALL_S,WINDOW,WINDOW,WALL_S,WALL_S,WINDOW,WINDOW,WALL_S,C],
      [C,     WALL,  WALL,  WALL,  DOOR,  DOOR,  WALL,  WALL,  WALL,  C],
      [C,     WALL_S,WALL,  WALL,  DOOR,  DOOR,  WALL,  WALL,  WALL_S,C],
      [C,     WALL_S,WALL_S,WALL_S,WALL_S,WALL_S,WALL_S,WALL_S,WALL_S,C],
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

    // ========== ENEMY SPRITES (10x10 menacing designs) ==========
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

    // ========== ENVIRONMENTAL DETAIL SPRITES ==========
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

    const BONE = 0xEEEEEE;
    const BONE_S = 0xBDBDBD;

    this.textures.set('bones', this.createSpriteTexture([
      [C,     BONE,  C,     C,     BONE,  C],
      [BONE,  BONE_S,BONE,  BONE,  BONE_S,BONE],
      [C,     C,     BONE_S,BONE,  C,     C],
      [C,     BONE,  BONE,  BONE_S,BONE,  C],
      [BONE,  BONE_S,C,     C,     BONE_S,BONE],
    ]));

    const MUSH_CAP = 0xE53935;
    const MUSH_CAP_H = 0xEF5350;
    const MUSH_DOT = 0xFFFFFF;
    const MUSH_STEM = 0xFFE0B2;
    const MUSH_STEM_S = 0xFFCC80;

    this.textures.set('mushroom', this.createSpriteTexture([
      [C,        C,        MUSH_CAP,MUSH_CAP_H,MUSH_CAP,MUSH_CAP_H,C,       C],
      [C,        MUSH_CAP, MUSH_DOT,MUSH_CAP,  MUSH_CAP,MUSH_DOT, MUSH_CAP,C],
      [MUSH_CAP, MUSH_CAP, MUSH_CAP,MUSH_CAP_H,MUSH_CAP,MUSH_CAP, MUSH_CAP,MUSH_CAP],
      [C,        C,        C,       MUSH_STEM, MUSH_STEM_S,C,      C,       C],
      [C,        C,        C,       MUSH_STEM_S,MUSH_STEM,C,       C,       C],
    ]));
  }
}
