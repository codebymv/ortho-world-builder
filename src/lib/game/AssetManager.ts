import * as THREE from 'three';

export class AssetManager {
  private textures: Map<string, THREE.Texture>;
  private textureLoader: THREE.TextureLoader;

  constructor() {
    this.textures = new Map();
    this.textureLoader = new THREE.TextureLoader();
  }

  createColorTexture(color: number, width: number = 32, height: number = 32): THREE.Texture {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d')!;
    
    const r = (color >> 16) & 255;
    const g = (color >> 8) & 255;
    const b = color & 255;
    ctx.fillStyle = `rgb(${r}, ${g}, ${b})`;
    ctx.fillRect(0, 0, width, height);
    
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
    // Player sprite (adventurer)
    this.textures.set('player_down', this.createSpriteTexture([
      [0, 0, 0xFFDBB5, 0xFFDBB5, 0xFFDBB5, 0, 0],
      [0, 0xFFDBB5, 0xFFDBB5, 0xFFDBB5, 0xFFDBB5, 0xFFDBB5, 0],
      [0, 0, 0x8B4513, 0xFFDBB5, 0x8B4513, 0, 0],
      [0, 0x4169E1, 0x4169E1, 0x4169E1, 0x4169E1, 0x4169E1, 0],
      [0, 0x4169E1, 0x4169E1, 0x4169E1, 0x4169E1, 0x4169E1, 0],
      [0, 0x8B4513, 0, 0, 0, 0x8B4513, 0],
      [0, 0x654321, 0, 0, 0, 0x654321, 0],
    ]));

    this.textures.set('player_up', this.createSpriteTexture([
      [0, 0, 0xFFDBB5, 0xFFDBB5, 0xFFDBB5, 0, 0],
      [0, 0xFFDBB5, 0x654321, 0xFFDBB5, 0x654321, 0xFFDBB5, 0],
      [0, 0, 0xFFDBB5, 0xFFDBB5, 0xFFDBB5, 0, 0],
      [0, 0x4169E1, 0x4169E1, 0x4169E1, 0x4169E1, 0x4169E1, 0],
      [0, 0x4169E1, 0x4169E1, 0x4169E1, 0x4169E1, 0x4169E1, 0],
      [0, 0x8B4513, 0, 0, 0, 0x8B4513, 0],
      [0, 0x654321, 0, 0, 0, 0x654321, 0],
    ]));

    this.textures.set('player_left', this.createSpriteTexture([
      [0, 0, 0xFFDBB5, 0xFFDBB5, 0xFFDBB5, 0, 0],
      [0, 0xFFDBB5, 0x8B4513, 0xFFDBB5, 0xFFDBB5, 0, 0],
      [0, 0, 0xFFDBB5, 0xFFDBB5, 0, 0, 0],
      [0, 0x4169E1, 0x4169E1, 0x4169E1, 0x4169E1, 0, 0],
      [0, 0, 0x4169E1, 0x4169E1, 0x4169E1, 0, 0],
      [0, 0, 0x8B4513, 0, 0, 0, 0],
      [0, 0, 0x654321, 0, 0, 0, 0],
    ]));

    this.textures.set('player_right', this.createSpriteTexture([
      [0, 0, 0xFFDBB5, 0xFFDBB5, 0xFFDBB5, 0, 0],
      [0, 0, 0xFFDBB5, 0xFFDBB5, 0x8B4513, 0xFFDBB5, 0],
      [0, 0, 0, 0xFFDBB5, 0xFFDBB5, 0, 0],
      [0, 0, 0x4169E1, 0x4169E1, 0x4169E1, 0x4169E1, 0],
      [0, 0, 0x4169E1, 0x4169E1, 0x4169E1, 0, 0],
      [0, 0, 0, 0, 0x8B4513, 0, 0],
      [0, 0, 0, 0, 0x654321, 0, 0],
    ]));

    // NPC sprites
    this.textures.set('npc_elder', this.createSpriteTexture([
      [0, 0, 0xFFDBB5, 0xFFDBB5, 0xFFDBB5, 0, 0],
      [0, 0xFFDBB5, 0xFFFFFF, 0xFFDBB5, 0xFFFFFF, 0xFFDBB5, 0],
      [0, 0, 0xFFFFFF, 0xFFDBB5, 0xFFFFFF, 0, 0],
      [0, 0x8B4513, 0x8B4513, 0x8B4513, 0x8B4513, 0x8B4513, 0],
      [0, 0x654321, 0x8B4513, 0x8B4513, 0x8B4513, 0x654321, 0],
      [0, 0x654321, 0, 0, 0, 0x654321, 0],
      [0, 0x654321, 0, 0, 0, 0x654321, 0],
    ]));

    this.textures.set('npc_merchant', this.createSpriteTexture([
      [0, 0, 0xFFDBB5, 0xFFDBB5, 0xFFDBB5, 0, 0],
      [0, 0xFFDBB5, 0x8B4513, 0xFFDBB5, 0x8B4513, 0xFFDBB5, 0],
      [0, 0, 0x8B4513, 0xFFDBB5, 0x8B4513, 0, 0],
      [0, 0xFF6347, 0xFF6347, 0xFF6347, 0xFF6347, 0xFF6347, 0],
      [0, 0xFF6347, 0xFF6347, 0xFF6347, 0xFF6347, 0xFF6347, 0],
      [0, 0x8B4513, 0, 0, 0, 0x8B4513, 0],
      [0, 0x654321, 0, 0, 0, 0x654321, 0],
    ]));

    this.textures.set('npc_guard', this.createSpriteTexture([
      [0, 0, 0xFFDBB5, 0xFFDBB5, 0xFFDBB5, 0, 0],
      [0, 0xFFDBB5, 0x8B4513, 0xFFDBB5, 0x8B4513, 0xFFDBB5, 0],
      [0, 0, 0x8B4513, 0xFFDBB5, 0x8B4513, 0, 0],
      [0, 0x708090, 0x708090, 0x708090, 0x708090, 0x708090, 0],
      [0, 0x708090, 0x708090, 0x708090, 0x708090, 0x708090, 0],
      [0, 0x696969, 0, 0, 0, 0x696969, 0],
      [0, 0x696969, 0, 0, 0, 0x696969, 0],
    ]));

    // Terrain tiles
    this.textures.set('grass', this.createColorTexture(0x228B22));
    this.textures.set('dirt', this.createColorTexture(0x8B4513));
    this.textures.set('water', this.createColorTexture(0x4169E1));
    this.textures.set('stone', this.createColorTexture(0x708090));
    this.textures.set('wood', this.createColorTexture(0x8B7355));
    
    // Objects
    this.textures.set('tree', this.createSpriteTexture([
      [0, 0, 0x228B22, 0x228B22, 0x228B22, 0, 0],
      [0, 0x228B22, 0x228B22, 0x228B22, 0x228B22, 0x228B22, 0],
      [0x228B22, 0x228B22, 0x228B22, 0x228B22, 0x228B22, 0x228B22, 0x228B22],
      [0, 0x228B22, 0x228B22, 0x228B22, 0x228B22, 0x228B22, 0],
      [0, 0, 0, 0x8B4513, 0, 0, 0],
      [0, 0, 0, 0x8B4513, 0, 0, 0],
      [0, 0, 0, 0x654321, 0, 0, 0],
    ]));

    this.textures.set('house', this.createSpriteTexture([
      [0, 0, 0x8B0000, 0x8B0000, 0x8B0000, 0, 0],
      [0, 0x8B0000, 0x8B0000, 0x8B0000, 0x8B0000, 0x8B0000, 0],
      [0, 0x8B7355, 0x8B7355, 0x8B7355, 0x8B7355, 0x8B7355, 0],
      [0, 0x8B7355, 0x654321, 0x8B7355, 0x654321, 0x8B7355, 0],
      [0, 0x8B7355, 0x8B7355, 0x8B7355, 0x8B7355, 0x8B7355, 0],
      [0, 0x8B7355, 0x654321, 0x654321, 0x654321, 0x8B7355, 0],
      [0, 0x654321, 0x654321, 0x654321, 0x654321, 0x654321, 0],
    ]));

    this.textures.set('rock', this.createSpriteTexture([
      [0, 0, 0x808080, 0x808080, 0, 0, 0],
      [0, 0x808080, 0x696969, 0x808080, 0x808080, 0, 0],
      [0x808080, 0x696969, 0x696969, 0x696969, 0x808080, 0x808080, 0],
      [0x696969, 0x696969, 0x696969, 0x696969, 0x696969, 0x808080, 0],
      [0, 0x696969, 0x696969, 0x696969, 0x696969, 0, 0],
      [0, 0, 0x696969, 0x696969, 0, 0, 0],
    ]));

    this.textures.set('chest', this.createSpriteTexture([
      [0, 0, 0x8B4513, 0x8B4513, 0x8B4513, 0, 0],
      [0, 0x8B4513, 0xFFD700, 0xFFD700, 0xFFD700, 0x8B4513, 0],
      [0x8B4513, 0x654321, 0x654321, 0x654321, 0x654321, 0x8B4513, 0],
      [0x8B4513, 0x654321, 0x654321, 0x654321, 0x654321, 0x8B4513, 0],
      [0, 0x8B4513, 0x8B4513, 0x8B4513, 0x8B4513, 0, 0],
    ]));
  }
}
