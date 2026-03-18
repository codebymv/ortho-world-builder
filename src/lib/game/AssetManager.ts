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
    const SKIN = 0xF5C8A0;
    const SKIN_S = 0xD4A574;
    const HAIR = 0x5C3317;
    const HAIR_H = 0x7A4A2A;
    const TUNIC = 0x2E7D32;
    const TUNIC_S = 0x1B5E20;
    const TUNIC_H = 0x43A047;
    const BELT = 0x8D6E63;
    const BOOTS = 0x4E342E;
    const BOOTS_H = 0x6D4C41;
    const PANTS = 0x455A64;
    const CAPE = 0xC62828;
    const CAPE_S = 0x8E0000;
    const EYE = 0x1A237E;
    const SWORD = 0xB0BEC5;
    const SWORD_H = 0xE0E0E0;
    const SWORD_G = 0x8D6E63;
    const SWORD_P = 0xFFD700;

    // Helper to generate mirrored sprite (flip horizontally)
    const mirrorSprite = (sprite: number[][]): number[][] => {
      return sprite.map(row => [...row].reverse());
    };

    // ========== PLAYER DOWN - Facing camera ==========
    const downIdle0 = [
      [C,  C,    C,     HAIR,  HAIR,  HAIR,   HAIR,  C,     C,   C],
      [C,  C,    HAIR,  HAIR_H,HAIR,  HAIR,   HAIR_H,HAIR,  C,   C],
      [C,  C,    SKIN,  SKIN,  SKIN,  SKIN,   SKIN,  SKIN,  C,   C],
      [C,  C,    SKIN,  EYE,   SKIN,  SKIN,   EYE,   SKIN,  C,   C],
      [C,  C,    C,     SKIN,  SKIN_S,SKIN,   SKIN,  C,     C,   C],
      [C,  CAPE, TUNIC, TUNIC_H,BELT, BELT,   TUNIC_H,TUNIC,CAPE,C],
      [C,  CAPE_S,TUNIC,TUNIC, TUNIC_S,TUNIC_S,TUNIC,TUNIC,CAPE_S,C],
      [C,  SWORD_H,SWORD,TUNIC, TUNIC, TUNIC,  TUNIC, SKIN,  C,   C],
      [C,  SWORD_G,C,   PANTS, PANTS, PANTS,  PANTS, C,     C,   C],
      [C,  SWORD_P,BOOTS, BOOTS_H,C,    C,      BOOTS_H,BOOTS,C,   C],
    ];
    const downIdle1 = [
      [C,  C,    C,     HAIR,  HAIR,  HAIR,   HAIR,  C,     C,   C],
      [C,  C,    HAIR,  HAIR_H,HAIR,  HAIR,   HAIR_H,HAIR,  C,   C],
      [C,  C,    SKIN,  SKIN,  SKIN,  SKIN,   SKIN,  SKIN,  C,   C],
      [C,  C,    SKIN,  EYE,   SKIN,  SKIN,   EYE,   SKIN,  C,   C],
      [C,  C,    C,     SKIN,  SKIN_S,SKIN,   SKIN,  C,     C,   C],
      [CAPE,CAPE, TUNIC, TUNIC_H,BELT, BELT,   TUNIC_H,TUNIC,C,   C],
      [CAPE_S,CAPE_S,TUNIC,TUNIC, TUNIC_S,TUNIC_S,TUNIC,TUNIC,C,  C],
      [C,  SWORD_H,SWORD,TUNIC, TUNIC, TUNIC,  TUNIC, SKIN,  C,   C],
      [C,  SWORD_G,C,   PANTS, PANTS, PANTS,  PANTS, C,     C,   C],
      [C,  SWORD_P,BOOTS, BOOTS_H,C,    C,      BOOTS_H,BOOTS,C,   C],
    ];

    this.textures.set('player_down_idle_0', this.createSpriteTexture(downIdle0));
    this.textures.set('player_down_idle_1', this.createSpriteTexture(downIdle1));

    // Walk frames with leg animation
    const downWalk0 = [
      [C,  C,    C,     HAIR,  HAIR,  HAIR,   HAIR,  C,     C,   C],
      [C,  C,    HAIR,  HAIR_H,HAIR,  HAIR,   HAIR_H,HAIR,  C,   C],
      [C,  C,    SKIN,  SKIN,  SKIN,  SKIN,   SKIN,  SKIN,  C,   C],
      [C,  C,    SKIN,  EYE,   SKIN,  SKIN,   EYE,   SKIN,  C,   C],
      [C,  C,    C,     SKIN,  SKIN_S,SKIN,   SKIN,  C,     C,   C],
      [C,  CAPE, TUNIC, TUNIC_H,BELT, BELT,   TUNIC_H,TUNIC,CAPE,C],
      [C,  CAPE_S,TUNIC,TUNIC, TUNIC_S,TUNIC_S,TUNIC,TUNIC,CAPE_S,C],
      [C,  SWORD_H,SWORD,TUNIC, TUNIC, TUNIC,  TUNIC, SKIN,  C,   C],
      [C,  SWORD_G,BOOTS, PANTS, C,    PANTS,  PANTS, C,     C,   C],
      [C,  SWORD_P,C,    BOOTS_H,C,    C,      C,     BOOTS, C,   C],
    ];
    const downWalk1 = [
      [C,  C,    C,     HAIR,  HAIR,  HAIR,   HAIR,  C,     C,   C],
      [C,  C,    HAIR,  HAIR_H,HAIR,  HAIR,   HAIR_H,HAIR,  C,   C],
      [C,  C,    SKIN,  SKIN,  SKIN,  SKIN,   SKIN,  SKIN,  C,   C],
      [C,  C,    SKIN,  EYE,   SKIN,  SKIN,   EYE,   SKIN,  C,   C],
      [C,  C,    C,     SKIN,  SKIN_S,SKIN,   SKIN,  C,     C,   C],
      [C,  CAPE, TUNIC, TUNIC_H,BELT, BELT,   TUNIC_H,TUNIC,CAPE,C],
      [C,  CAPE_S,TUNIC,TUNIC, TUNIC_S,TUNIC_S,TUNIC,TUNIC,CAPE_S,C],
      [C,  SWORD_H,SWORD,TUNIC, TUNIC, TUNIC,  TUNIC, SKIN,  C,   C],
      [C,  SWORD_G,PANTS, PANTS, C,    C,      BOOTS, PANTS, C,   C],
      [C,  SWORD_P,BOOTS, C,    C,     C,      BOOTS_H,C,    C,   C],
    ];

    this.textures.set('player_down_walk_0', this.createSpriteTexture(downWalk0));
    this.textures.set('player_down_walk_1', this.createSpriteTexture(downWalk1));

    // Attack frames
    this.textures.set('player_down_attack_0', this.createSpriteTexture([
      [C,  SWORD_P,SWORD_G,HAIR,  HAIR,  HAIR,   HAIR,  C,     C,   C],
      [C,  C,    SWORD,HAIR_H,HAIR,  HAIR,   HAIR_H,HAIR,  C,   C],
      [C,  C,    SWORD_H,SKIN,  SKIN,  SKIN,   SKIN,  SKIN,  C,   C],
      [C,  C,    SKIN,  EYE,   SKIN,  SKIN,   EYE,   SKIN,  C,   C],
      [C,  C,    C,     SKIN,  SKIN_S,SKIN,   SKIN,  C,     C,   C],
      [C,  CAPE, TUNIC, TUNIC_H,BELT, BELT,   TUNIC_H,TUNIC,CAPE,C],
      [C,  CAPE_S,TUNIC,TUNIC, TUNIC_S,TUNIC_S,TUNIC,TUNIC,CAPE_S,C],
      [C,  C,    SKIN,  TUNIC, TUNIC, TUNIC,  TUNIC, SKIN,  C,   C],
      [C,  C,    C,     PANTS, PANTS, PANTS,  PANTS, C,     C,   C],
      [C,  C,    BOOTS, BOOTS_H,C,    C,      BOOTS_H,BOOTS,C,   C],
    ]));
    this.textures.set('player_down_attack_1', this.createSpriteTexture([
      [C,  C,    C,     HAIR,  HAIR,  HAIR,   HAIR,  C,     C,   C],
      [C,  C,    HAIR,  HAIR_H,HAIR,  HAIR,   HAIR_H,HAIR,  C,   C],
      [C,  C,    SKIN,  SKIN,  SKIN,  SKIN,   SKIN,  SKIN,  C,   C],
      [C,  C,    SKIN,  EYE,   SKIN,  SKIN,   EYE,   SKIN,  C,   C],
      [C,  C,    SKIN,  SKIN,  SKIN_S,SKIN,   SKIN,  C,     C,   C],
      [C,  CAPE, TUNIC, TUNIC_H,BELT, BELT,   TUNIC_H,TUNIC,CAPE,C],
      [C,  CAPE_S,TUNIC,TUNIC, TUNIC_S,TUNIC_S,TUNIC,TUNIC,CAPE_S,C],
      [SWORD_H,SWORD,SWORD_G,TUNIC, TUNIC, TUNIC,  TUNIC, SKIN,  C,   C],
      [C,  C,    C,     PANTS, PANTS, PANTS,  PANTS, C,     C,   C],
      [C,  C,    BOOTS, BOOTS_H,C,    C,      BOOTS_H,BOOTS,C,   C],
    ]));
    this.textures.set('player_down_attack_2', this.createSpriteTexture([
      [C,  C,    C,     HAIR,  HAIR,  HAIR,   HAIR,  C,     C,   C],
      [C,  C,    HAIR,  HAIR_H,HAIR,  HAIR,   HAIR_H,HAIR,  C,   C],
      [C,  C,    SKIN,  SKIN,  SKIN,  SKIN,   SKIN,  SKIN,  C,   C],
      [C,  C,    SKIN,  EYE,   SKIN,  SKIN,   EYE,   SKIN,  C,   C],
      [C,  C,    C,     SKIN,  SKIN_S,SKIN,   SKIN,  C,     C,   C],
      [C,  CAPE, TUNIC, TUNIC_H,BELT, BELT,   TUNIC_H,TUNIC,CAPE,C],
      [C,  CAPE_S,TUNIC,TUNIC, TUNIC_S,TUNIC_S,TUNIC,TUNIC,CAPE_S,C],
      [C,  C,    SKIN,  TUNIC, TUNIC, TUNIC,  TUNIC, SKIN,  C,   C],
      [C,  C,    C,     PANTS, PANTS, PANTS,  PANTS, C,     C,   C],
      [SWORD_P,SWORD_G,SWORD,SWORD_H,C,    C,      BOOTS_H,BOOTS,C,   C],
    ]));

    // ========== PLAYER UP - Back view ==========
    const upIdle0 = [
      [C,  C,    C,     HAIR,  HAIR,  HAIR,   HAIR,  C,     C,   C],
      [C,  C,    HAIR,  HAIR,  HAIR_H,HAIR_H, HAIR,  HAIR,  C,   C],
      [C,  C,    HAIR,  HAIR,  HAIR,  HAIR,   HAIR,  HAIR,  C,   C],
      [C,  C,    SKIN,  SKIN,  SKIN,  SKIN,   SKIN,  SKIN,  C,   C],
      [C,  C,    C,     SKIN,  SKIN,  SKIN,   SKIN,  C,     C,   C],
      [C,  CAPE, TUNIC, TUNIC, BELT,  BELT,   TUNIC, TUNIC, CAPE,C],
      [C,  CAPE_S,TUNIC,TUNIC_S,TUNIC_S,TUNIC_S,TUNIC_S,TUNIC,CAPE_S,C],
      [C,  SWORD_H,SWORD,TUNIC, TUNIC, TUNIC,  TUNIC, SKIN,  C,   C],
      [C,  SWORD_G,C,   PANTS, PANTS, PANTS,  PANTS, C,     C,   C],
      [C,  SWORD_P,BOOTS, BOOTS_H,C,    C,      BOOTS_H,BOOTS,C,   C],
    ];
    const upIdle1 = [
      [C,  C,    C,     HAIR,  HAIR,  HAIR,   HAIR,  C,     C,   C],
      [C,  C,    HAIR,  HAIR,  HAIR_H,HAIR_H, HAIR,  HAIR,  C,   C],
      [C,  C,    HAIR,  HAIR,  HAIR,  HAIR,   HAIR,  HAIR,  C,   C],
      [C,  C,    SKIN,  SKIN,  SKIN,  SKIN,   SKIN,  SKIN,  C,   C],
      [C,  C,    C,     SKIN,  SKIN,  SKIN,   SKIN,  C,     C,   C],
      [CAPE,CAPE, TUNIC, TUNIC, BELT,  BELT,   TUNIC, TUNIC, C,   C],
      [CAPE_S,CAPE_S,TUNIC,TUNIC_S,TUNIC_S,TUNIC_S,TUNIC_S,TUNIC,C,C],
      [C,  SWORD_H,SWORD,TUNIC, TUNIC, TUNIC,  TUNIC, SKIN,  C,   C],
      [C,  SWORD_G,C,   PANTS, PANTS, PANTS,  PANTS, C,     C,   C],
      [C,  SWORD_P,BOOTS, BOOTS_H,C,    C,      BOOTS_H,BOOTS,C,   C],
    ];

    this.textures.set('player_up_idle_0', this.createSpriteTexture(upIdle0));
    this.textures.set('player_up_idle_1', this.createSpriteTexture(upIdle1));

    // Up walk frames
    const upWalk0 = [
      [C,  C,    C,     HAIR,  HAIR,  HAIR,   HAIR,  C,     C,   C],
      [C,  C,    HAIR,  HAIR,  HAIR_H,HAIR_H, HAIR,  HAIR,  C,   C],
      [C,  C,    HAIR,  HAIR,  HAIR,  HAIR,   HAIR,  HAIR,  C,   C],
      [C,  C,    SKIN,  SKIN,  SKIN,  SKIN,   SKIN,  SKIN,  C,   C],
      [C,  C,    C,     SKIN,  SKIN,  SKIN,   SKIN,  C,     C,   C],
      [C,  CAPE, TUNIC, TUNIC, BELT,  BELT,   TUNIC, TUNIC, CAPE,C],
      [C,  CAPE_S,TUNIC,TUNIC_S,TUNIC_S,TUNIC_S,TUNIC_S,TUNIC,CAPE_S,C],
      [C,  SWORD_H,SWORD,TUNIC, TUNIC, TUNIC,  TUNIC, SKIN,  C,   C],
      [C,  SWORD_G,BOOTS, PANTS, C,    PANTS,  PANTS, C,     C,   C],
      [C,  SWORD_P,C,    BOOTS_H,C,    C,      C,     BOOTS, C,   C],
    ];
    const upWalk1 = [
      [C,  C,    C,     HAIR,  HAIR,  HAIR,   HAIR,  C,     C,   C],
      [C,  C,    HAIR,  HAIR,  HAIR_H,HAIR_H, HAIR,  HAIR,  C,   C],
      [C,  C,    HAIR,  HAIR,  HAIR,  HAIR,   HAIR,  HAIR,  C,   C],
      [C,  C,    SKIN,  SKIN,  SKIN,  SKIN,   SKIN,  SKIN,  C,   C],
      [C,  C,    C,     SKIN,  SKIN,  SKIN,   SKIN,  C,     C,   C],
      [C,  CAPE, TUNIC, TUNIC, BELT,  BELT,   TUNIC, TUNIC, CAPE,C],
      [C,  CAPE_S,TUNIC,TUNIC_S,TUNIC_S,TUNIC_S,TUNIC_S,TUNIC,CAPE_S,C],
      [C,  SWORD_H,SWORD,TUNIC, TUNIC, TUNIC,  TUNIC, SKIN,  C,   C],
      [C,  SWORD_G,PANTS, PANTS, C,    C,      BOOTS, PANTS, C,   C],
      [C,  SWORD_P,BOOTS, C,    C,     C,      BOOTS_H,C,    C,   C],
    ];

    this.textures.set('player_up_walk_0', this.createSpriteTexture(upWalk0));
    this.textures.set('player_up_walk_1', this.createSpriteTexture(upWalk1));

    // Up attack frames
    this.textures.set('player_up_attack_0', this.createSpriteTexture([
      [C,  SWORD_P,SWORD_G,HAIR,  HAIR,  HAIR,   HAIR,  C,     C,   C],
      [C,  C,    SWORD, HAIR,  HAIR_H,HAIR_H, HAIR,  HAIR,  C,   C],
      [C,  C,    SWORD_H,HAIR,  HAIR,  HAIR,   HAIR,  HAIR,  C,   C],
      [C,  C,    SKIN,  SKIN,  SKIN,  SKIN,   SKIN,  SKIN,  C,   C],
      [C,  C,    C,     SKIN,  SKIN,  SKIN,   SKIN,  C,     C,   C],
      [C,  CAPE, TUNIC, TUNIC, BELT,  BELT,   TUNIC, TUNIC, CAPE,C],
      [C,  CAPE_S,TUNIC,TUNIC_S,TUNIC_S,TUNIC_S,TUNIC_S,TUNIC,CAPE_S,C],
      [C,  C,    SKIN,  TUNIC, TUNIC, TUNIC,  TUNIC, SKIN,  C,   C],
      [C,  C,    C,     PANTS, PANTS, PANTS,  PANTS, C,     C,   C],
      [C,  C,    BOOTS, BOOTS_H,C,    C,      BOOTS_H,BOOTS,C,   C],
    ]));
    this.textures.set('player_up_attack_1', this.createSpriteTexture([
      [SWORD_H,SWORD,SWORD_G,HAIR,  HAIR,  HAIR,   HAIR,  C,     C,   C],
      [C,  C,    HAIR,  HAIR,  HAIR_H,HAIR_H, HAIR,  HAIR,  C,   C],
      [C,  C,    HAIR,  HAIR,  HAIR,  HAIR,   HAIR,  HAIR,  C,   C],
      [C,  C,    SKIN,  SKIN,  SKIN,  SKIN,   SKIN,  SKIN,  C,   C],
      [C,  C,    SKIN,  SKIN,  SKIN,  SKIN,   SKIN,  C,     C,   C],
      [C,  CAPE, TUNIC, TUNIC, BELT,  BELT,   TUNIC, TUNIC, CAPE,C],
      [C,  CAPE_S,TUNIC,TUNIC_S,TUNIC_S,TUNIC_S,TUNIC_S,TUNIC,CAPE_S,C],
      [C,  C,    SKIN,  TUNIC, TUNIC, TUNIC,  TUNIC, SKIN,  C,   C],
      [C,  C,    C,     PANTS, PANTS, PANTS,  PANTS, C,     C,   C],
      [C,  C,    BOOTS, BOOTS_H,C,    C,      BOOTS_H,BOOTS,C,   C],
    ]));
    this.textures.set('player_up_attack_2', this.createSpriteTexture([
      [C,  C,    C,     HAIR,  HAIR,  HAIR,   HAIR,  C,     C,   C],
      [C,  C,    HAIR,  HAIR,  HAIR_H,HAIR_H, HAIR,  HAIR,  C,   C],
      [C,  C,    HAIR,  HAIR,  HAIR,  HAIR,   HAIR,  HAIR,  C,   C],
      [C,  C,    SKIN,  SKIN,  SKIN,  SKIN,   SKIN,  SKIN,  C,   C],
      [C,  C,    C,     SKIN,  SKIN,  SKIN,   SKIN,  C,     C,   C],
      [C,  CAPE, TUNIC, TUNIC, BELT,  BELT,   TUNIC, TUNIC, CAPE,C],
      [C,  CAPE_S,TUNIC,TUNIC_S,TUNIC_S,TUNIC_S,TUNIC_S,TUNIC,CAPE_S,C],
      [C,  C,    SKIN,  TUNIC, TUNIC, TUNIC,  TUNIC, SKIN,  C,   C],
      [C,  C,    C,     PANTS, PANTS, PANTS,  PANTS, C,     C,   C],
      [SWORD_P,SWORD_G,SWORD,SWORD_H,C,    C,      BOOTS_H,BOOTS,C,   C],
    ]));

    // ========== PLAYER LEFT ==========
    const leftIdle0 = [
      [C,  C,    C,     HAIR,  HAIR,  HAIR,   C,     C,     C,   C],
      [C,  C,    HAIR,  HAIR_H,HAIR,  HAIR,   HAIR,  C,     C,   C],
      [C,  C,    SKIN,  SKIN,  SKIN,  SKIN,   C,     C,     C,   C],
      [C,  C,    SKIN,  EYE,   SKIN,  SKIN_S, C,     C,     C,   C],
      [C,  C,    C,     SKIN,  SKIN_S,C,      C,     C,     C,   C],
      [C,  C,    TUNIC, TUNIC_H,BELT, TUNIC,  CAPE,  C,     C,   C],
      [C,  C,    TUNIC, TUNIC, TUNIC_S,TUNIC, CAPE_S,C,     C,   C],
      [SWORD_H,SWORD,C,TUNIC, TUNIC, C,      C,     C,     C,   C],
      [SWORD_G,C,    C,     PANTS, PANTS, C,      C,     C,     C,   C],
      [SWORD_P,C,    BOOTS, BOOTS_H,C,    C,      C,     C,     C,   C],
    ];

    this.textures.set('player_left_idle_0', this.createSpriteTexture(leftIdle0));
    this.textures.set('player_left_idle_1', this.createSpriteTexture(leftIdle0)); // subtle

    // Left walk frames
    const leftWalk0 = [
      [C,  C,    C,     HAIR,  HAIR,  HAIR,   C,     C,     C,   C],
      [C,  C,    HAIR,  HAIR_H,HAIR,  HAIR,   HAIR,  C,     C,   C],
      [C,  C,    SKIN,  SKIN,  SKIN,  SKIN,   C,     C,     C,   C],
      [C,  C,    SKIN,  EYE,   SKIN,  SKIN_S, C,     C,     C,   C],
      [C,  C,    C,     SKIN,  SKIN_S,C,      C,     C,     C,   C],
      [C,  C,    TUNIC, TUNIC_H,BELT, TUNIC,  CAPE,  C,     C,   C],
      [C,  C,    TUNIC, TUNIC, TUNIC_S,TUNIC, CAPE_S,C,     C,   C],
      [SWORD_H,SWORD,C,TUNIC, TUNIC, C,      C,     C,     C,   C],
      [SWORD_G,C,    BOOTS, PANTS, C,    PANTS,  C,     C,     C,   C],
      [SWORD_P,C,    C,     BOOTS_H,C,    C,      BOOTS, C,     C,   C],
    ];
    const leftWalk1 = [
      [C,  C,    C,     HAIR,  HAIR,  HAIR,   C,     C,     C,   C],
      [C,  C,    HAIR,  HAIR_H,HAIR,  HAIR,   HAIR,  C,     C,   C],
      [C,  C,    SKIN,  SKIN,  SKIN,  SKIN,   C,     C,     C,   C],
      [C,  C,    SKIN,  EYE,   SKIN,  SKIN_S, C,     C,     C,   C],
      [C,  C,    C,     SKIN,  SKIN_S,C,      C,     C,     C,   C],
      [C,  C,    TUNIC, TUNIC_H,BELT, TUNIC,  CAPE,  C,     C,   C],
      [C,  C,    TUNIC, TUNIC, TUNIC_S,TUNIC, CAPE_S,C,     C,   C],
      [SWORD_H,SWORD,C,TUNIC, TUNIC, C,      C,     C,     C,   C],
      [SWORD_G,C,    PANTS, PANTS, C,    BOOTS,  C,     C,     C,   C],
      [SWORD_P,C,    BOOTS, C,    C,     BOOTS_H,C,     C,     C,   C],
    ];

    this.textures.set('player_left_walk_0', this.createSpriteTexture(leftWalk0));
    this.textures.set('player_left_walk_1', this.createSpriteTexture(leftWalk1));

    // Left attack
    this.textures.set('player_left_attack_0', this.createSpriteTexture([
      [C,  C,    C,     HAIR,  HAIR,  HAIR,   C,     C,     C,   C],
      [C,  C,    HAIR,  HAIR_H,HAIR,  HAIR,   HAIR,  C,     C,   C],
      [C,  C,    SKIN,  SKIN,  SKIN,  SKIN,   C,     C,     C,   C],
      [C,  C,    SKIN,  EYE,   SKIN,  SKIN_S, C,     C,     C,   C],
      [C,  C,    SKIN,  SKIN,  SKIN_S,C,      C,     C,     C,   C],
      [C,  C,    TUNIC, TUNIC_H,BELT, TUNIC,  CAPE,  C,     C,   C],
      [SWORD_H,SWORD,SWORD_G,TUNIC, TUNIC_S,TUNIC, CAPE_S,C,     C,   C],
      [C,  C,    C,     TUNIC, TUNIC, C,      C,     C,     C,   C],
      [C,  C,    C,     PANTS, PANTS, C,      C,     C,     C,   C],
      [C,  C,    BOOTS, BOOTS_H,C,    C,      C,     C,     C,   C],
    ]));
    this.textures.set('player_left_attack_1', this.textures.get('player_left_attack_0')!);
    this.textures.set('player_left_attack_2', this.textures.get('player_left_attack_0')!);

    // ========== PLAYER RIGHT (mirror of left) ==========
    const rightIdle0 = mirrorSprite(leftIdle0);
    this.textures.set('player_right_idle_0', this.createSpriteTexture(rightIdle0));
    this.textures.set('player_right_idle_1', this.createSpriteTexture(rightIdle0));

    this.textures.set('player_right_walk_0', this.createSpriteTexture(mirrorSprite(leftWalk0)));
    this.textures.set('player_right_walk_1', this.createSpriteTexture(mirrorSprite(leftWalk1)));

    this.textures.set('player_right_attack_0', this.createSpriteTexture([
      [C,  C,    C,     C,     HAIR,  HAIR,   HAIR,  C,     C,   C],
      [C,  C,    C,     HAIR,  HAIR,  HAIR,   HAIR_H,HAIR,  C,   C],
      [C,  C,    C,     C,     SKIN,  SKIN,   SKIN,  SKIN,  C,   C],
      [C,  C,    C,     C,     SKIN_S,SKIN,   EYE,   SKIN,  C,   C],
      [C,  C,    C,     C,     C,     SKIN_S, SKIN,  SKIN,  C,   C],
      [C,  C,    CAPE,  TUNIC, BELT,  TUNIC_H,TUNIC, C,     C,   C],
      [C,  C,    CAPE_S,TUNIC, TUNIC_S,TUNIC, SWORD_G,SWORD,SWORD_H,C],
      [C,  C,    C,     C,     TUNIC, TUNIC,  C,     C,     C,   C],
      [C,  C,    C,     C,     PANTS, PANTS,  C,     C,     C,   C],
      [C,  C,    C,     C,     C,     BOOTS_H,BOOTS, C,     C,   C],
    ]));
    this.textures.set('player_right_attack_1', this.textures.get('player_right_attack_0')!);
    this.textures.set('player_right_attack_2', this.textures.get('player_right_attack_0')!);

    // ========== DIAGONAL SPRITES ==========
    // Down-left: 3/4 view facing down-left  
    const downLeftIdle = [
      [C,  C,    C,     HAIR,  HAIR,  HAIR,   C,     C,     C,   C],
      [C,  C,    HAIR,  HAIR_H,HAIR,  HAIR,   HAIR,  C,     C,   C],
      [C,  C,    SKIN,  SKIN,  SKIN,  SKIN,   SKIN,  C,     C,   C],
      [C,  C,    SKIN,  EYE,   SKIN,  SKIN_S, C,     C,     C,   C],
      [C,  C,    C,     SKIN,  SKIN_S,SKIN,   C,     C,     C,   C],
      [C,  CAPE, TUNIC, TUNIC_H,BELT, TUNIC_H,TUNIC, CAPE,  C,   C],
      [C,  CAPE_S,TUNIC,TUNIC, TUNIC_S,TUNIC, TUNIC, CAPE_S,C,   C],
      [C,  SWORD_H,SWORD,TUNIC, TUNIC, TUNIC,  SKIN,  C,     C,   C],
      [C,  SWORD_G,C,   PANTS, PANTS, PANTS,  C,     C,     C,   C],
      [C,  SWORD_P,BOOTS, BOOTS_H,C,    BOOTS_H,BOOTS, C,     C,   C],
    ];
    const downLeftWalk0 = [
      [C,  C,    C,     HAIR,  HAIR,  HAIR,   C,     C,     C,   C],
      [C,  C,    HAIR,  HAIR_H,HAIR,  HAIR,   HAIR,  C,     C,   C],
      [C,  C,    SKIN,  SKIN,  SKIN,  SKIN,   SKIN,  C,     C,   C],
      [C,  C,    SKIN,  EYE,   SKIN,  SKIN_S, C,     C,     C,   C],
      [C,  C,    C,     SKIN,  SKIN_S,SKIN,   C,     C,     C,   C],
      [C,  CAPE, TUNIC, TUNIC_H,BELT, TUNIC_H,TUNIC, CAPE,  C,   C],
      [C,  CAPE_S,TUNIC,TUNIC, TUNIC_S,TUNIC, TUNIC, CAPE_S,C,   C],
      [C,  SWORD_H,SWORD,TUNIC, TUNIC, TUNIC,  SKIN,  C,     C,   C],
      [C,  SWORD_G,BOOTS, PANTS, C,    PANTS,  C,     C,     C,   C],
      [C,  SWORD_P,C,    BOOTS_H,C,    C,      BOOTS, C,     C,   C],
    ];
    const downLeftWalk1 = [
      [C,  C,    C,     HAIR,  HAIR,  HAIR,   C,     C,     C,   C],
      [C,  C,    HAIR,  HAIR_H,HAIR,  HAIR,   HAIR,  C,     C,   C],
      [C,  C,    SKIN,  SKIN,  SKIN,  SKIN,   SKIN,  C,     C,   C],
      [C,  C,    SKIN,  EYE,   SKIN,  SKIN_S, C,     C,     C,   C],
      [C,  C,    C,     SKIN,  SKIN_S,SKIN,   C,     C,     C,   C],
      [C,  CAPE, TUNIC, TUNIC_H,BELT, TUNIC_H,TUNIC, CAPE,  C,   C],
      [C,  CAPE_S,TUNIC,TUNIC, TUNIC_S,TUNIC, TUNIC, CAPE_S,C,   C],
      [C,  SWORD_H,SWORD,TUNIC, TUNIC, TUNIC,  SKIN,  C,     C,   C],
      [C,  SWORD_G,PANTS, PANTS, C,    BOOTS,  C,     C,     C,   C],
      [C,  SWORD_P,BOOTS, C,    C,     BOOTS_H,C,     C,     C,   C],
    ];

    // Set all diagonal direction textures
    const diagDirs = ['down_left', 'down_right', 'up_left', 'up_right'];
    
    // down_left
    this.textures.set('player_down_left_idle_0', this.createSpriteTexture(downLeftIdle));
    this.textures.set('player_down_left_idle_1', this.createSpriteTexture(downLeftIdle));
    this.textures.set('player_down_left_walk_0', this.createSpriteTexture(downLeftWalk0));
    this.textures.set('player_down_left_walk_1', this.createSpriteTexture(downLeftWalk1));
    this.textures.set('player_down_left_attack_0', this.textures.get('player_left_attack_0')!);
    this.textures.set('player_down_left_attack_1', this.textures.get('player_left_attack_0')!);
    this.textures.set('player_down_left_attack_2', this.textures.get('player_left_attack_0')!);

    // down_right (mirror of down_left)
    this.textures.set('player_down_right_idle_0', this.createSpriteTexture(mirrorSprite(downLeftIdle)));
    this.textures.set('player_down_right_idle_1', this.createSpriteTexture(mirrorSprite(downLeftIdle)));
    this.textures.set('player_down_right_walk_0', this.createSpriteTexture(mirrorSprite(downLeftWalk0)));
    this.textures.set('player_down_right_walk_1', this.createSpriteTexture(mirrorSprite(downLeftWalk1)));
    this.textures.set('player_down_right_attack_0', this.textures.get('player_right_attack_0')!);
    this.textures.set('player_down_right_attack_1', this.textures.get('player_right_attack_0')!);
    this.textures.set('player_down_right_attack_2', this.textures.get('player_right_attack_0')!);

    // up_left (back view left)
    const upLeftIdle = [
      [C,  C,    C,     HAIR,  HAIR,  HAIR,   C,     C,     C,   C],
      [C,  C,    HAIR,  HAIR,  HAIR_H,HAIR,   HAIR,  C,     C,   C],
      [C,  C,    HAIR,  HAIR,  HAIR,  HAIR,   HAIR,  C,     C,   C],
      [C,  C,    SKIN,  SKIN,  SKIN,  SKIN,   C,     C,     C,   C],
      [C,  C,    C,     SKIN,  SKIN,  C,      C,     C,     C,   C],
      [C,  CAPE, TUNIC, TUNIC, BELT,  TUNIC,  CAPE,  C,     C,   C],
      [C,  CAPE_S,TUNIC,TUNIC_S,TUNIC_S,TUNIC,CAPE_S,C,     C,   C],
      [C,  SWORD_H,SWORD,TUNIC, TUNIC, SKIN,  C,     C,     C,   C],
      [C,  SWORD_G,C,   PANTS, PANTS, C,      C,     C,     C,   C],
      [C,  SWORD_P,BOOTS, BOOTS_H,C,    BOOTS, C,     C,     C,   C],
    ];
    const upLeftWalk0 = [
      [C,  C,    C,     HAIR,  HAIR,  HAIR,   C,     C,     C,   C],
      [C,  C,    HAIR,  HAIR,  HAIR_H,HAIR,   HAIR,  C,     C,   C],
      [C,  C,    HAIR,  HAIR,  HAIR,  HAIR,   HAIR,  C,     C,   C],
      [C,  C,    SKIN,  SKIN,  SKIN,  SKIN,   C,     C,     C,   C],
      [C,  C,    C,     SKIN,  SKIN,  C,      C,     C,     C,   C],
      [C,  CAPE, TUNIC, TUNIC, BELT,  TUNIC,  CAPE,  C,     C,   C],
      [C,  CAPE_S,TUNIC,TUNIC_S,TUNIC_S,TUNIC,CAPE_S,C,     C,   C],
      [C,  SWORD_H,SWORD,TUNIC, TUNIC, SKIN,  C,     C,     C,   C],
      [C,  SWORD_G,BOOTS, PANTS, C,    PANTS,  C,     C,     C,   C],
      [C,  SWORD_P,C,    BOOTS_H,C,    C,      BOOTS, C,     C,   C],
    ];
    const upLeftWalk1 = [
      [C,  C,    C,     HAIR,  HAIR,  HAIR,   C,     C,     C,   C],
      [C,  C,    HAIR,  HAIR,  HAIR_H,HAIR,   HAIR,  C,     C,   C],
      [C,  C,    HAIR,  HAIR,  HAIR,  HAIR,   HAIR,  C,     C,   C],
      [C,  C,    SKIN,  SKIN,  SKIN,  SKIN,   C,     C,     C,   C],
      [C,  C,    C,     SKIN,  SKIN,  C,      C,     C,     C,   C],
      [C,  CAPE, TUNIC, TUNIC, BELT,  TUNIC,  CAPE,  C,     C,   C],
      [C,  CAPE_S,TUNIC,TUNIC_S,TUNIC_S,TUNIC,CAPE_S,C,     C,   C],
      [C,  SWORD_H,SWORD,TUNIC, TUNIC, SKIN,  C,     C,     C,   C],
      [C,  SWORD_G,PANTS, PANTS, C,    BOOTS,  C,     C,     C,   C],
      [C,  SWORD_P,BOOTS, C,    C,     BOOTS_H,C,     C,     C,   C],
    ];

    this.textures.set('player_up_left_idle_0', this.createSpriteTexture(upLeftIdle));
    this.textures.set('player_up_left_idle_1', this.createSpriteTexture(upLeftIdle));
    this.textures.set('player_up_left_walk_0', this.createSpriteTexture(upLeftWalk0));
    this.textures.set('player_up_left_walk_1', this.createSpriteTexture(upLeftWalk1));
    this.textures.set('player_up_left_attack_0', this.textures.get('player_left_attack_0')!);
    this.textures.set('player_up_left_attack_1', this.textures.get('player_left_attack_0')!);
    this.textures.set('player_up_left_attack_2', this.textures.get('player_left_attack_0')!);

    // up_right (mirror of up_left)
    this.textures.set('player_up_right_idle_0', this.createSpriteTexture(mirrorSprite(upLeftIdle)));
    this.textures.set('player_up_right_idle_1', this.createSpriteTexture(mirrorSprite(upLeftIdle)));
    this.textures.set('player_up_right_walk_0', this.createSpriteTexture(mirrorSprite(upLeftWalk0)));
    this.textures.set('player_up_right_walk_1', this.createSpriteTexture(mirrorSprite(upLeftWalk1)));
    this.textures.set('player_up_right_attack_0', this.textures.get('player_right_attack_0')!);
    this.textures.set('player_up_right_attack_1', this.textures.get('player_right_attack_0')!);
    this.textures.set('player_up_right_attack_2', this.textures.get('player_right_attack_0')!);

    // Legacy aliases
    this.textures.set('player_down', this.textures.get('player_down_idle_0')!);
    this.textures.set('player_up', this.textures.get('player_up_idle_0')!);
    this.textures.set('player_left', this.textures.get('player_left_idle_0')!);
    this.textures.set('player_right', this.textures.get('player_right_idle_0')!);

    // ========== NPC SPRITES ==========
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

    // Environmental sprites
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
