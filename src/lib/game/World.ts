import * as THREE from 'three';
import { AssetManager } from './AssetManager';

export type TileType = 
  | 'grass' | 'dirt' | 'water' | 'stone' | 'wood' 
  | 'tree' | 'house' | 'house_blue' | 'house_green' | 'house_thatch' | 'rock' | 'chest' | 'portal' | 'flower'
  | 'tall_grass' | 'bridge' | 'sand' | 'swamp' | 'lava' | 'ice'
  | 'pressure_plate' | 'hidden_wall' | 'push_block' | 'switch_door'
  | 'campfire' | 'sign' | 'well' | 'tombstone' | 'mushroom' | 'stump'
  | 'fence' | 'gate' | 'barrel' | 'crate' | 'spike_trap' | 'bones'
  | 'volcanic_rock' | 'ash' | 'ruins_floor' | 'waterfall' | 'snow'
  | 'dead_tree' | 'destroyed_house' | 'statue'
  | 'cliff' | 'cliff_edge' | 'cobblestone' | 'farmland' | 'wheat'
  | 'iron_fence' | 'hedge' | 'scarecrow' | 'hay_bale' | 'lantern'
  | 'dark_grass' | 'mossy_stone' | 'wooden_path';

export interface Tile {
  type: TileType;
  walkable: boolean;
  interactable?: boolean;
  interactionId?: string;
  transition?: {
    targetMap: string;
    targetX: number;
    targetY: number;
  };
  hidden?: boolean;
  linkedTo?: string;
  pushable?: boolean;
  activated?: boolean;
}

export interface WorldMap {
  name: string;
  width: number;
  height: number;
  tiles: Tile[][];
  spawnPoint: { x: number; y: number };
}

interface ChunkMesh {
  mesh: THREE.Mesh;
  tileX: number;
  tileY: number;
  active: boolean;
}

const RENDER_RADIUS = 32;
const CULL_RADIUS = 42;
const MAX_TILES_PER_FRAME = 200; // batch tile creation to prevent frame drops
const OVERLAY_TYPES: Set<TileType> = new Set([
  'tree', 'house', 'house_blue', 'house_green', 'house_thatch', 'rock', 'chest', 'portal', 'flower',
  'push_block', 'campfire', 'sign', 'well', 'tombstone', 'mushroom', 'stump',
  'fence', 'gate', 'barrel', 'crate', 'spike_trap', 'bones',
  'dead_tree', 'destroyed_house', 'statue',
  'iron_fence', 'hedge', 'scarecrow', 'hay_bale', 'lantern',
  'tall_grass', 'wheat'
]);

const OVERLAY_BASE_TILE: Partial<Record<TileType, TileType>> = {
  flower: 'grass',
  mushroom: 'grass',
  stump: 'grass',
  tree: 'grass',
  tall_grass: 'grass',
  dead_tree: 'ash',
  rock: 'stone',
  chest: 'grass',
  portal: 'stone',
  push_block: 'stone',
  campfire: 'dirt',
  sign: 'dirt',
  well: 'stone',
  tombstone: 'grass',
  fence: 'grass',
  gate: 'dirt',
  barrel: 'wood',
  crate: 'wood',
  spike_trap: 'stone',
  bones: 'dirt',
  house: 'dirt',
  house_blue: 'dirt',
  house_green: 'dirt',
  house_thatch: 'dirt',
  destroyed_house: 'ruins_floor',
  statue: 'stone',
  iron_fence: 'cobblestone',
  hedge: 'grass',
  scarecrow: 'farmland',
  hay_bale: 'farmland',
  lantern: 'cobblestone',
  wheat: 'farmland',
};

// Scale multipliers for overlay objects to make them proportionally correct
const OVERLAY_SCALE: Partial<Record<TileType, number>> = {
  house: 2.2,
  house_blue: 2.2,
  house_green: 2.2,
  house_thatch: 2.0,
  destroyed_house: 2.0,
  tree: 1.8,
  tall_grass: 0.9,
  dead_tree: 1.5,
  statue: 1.4,
  well: 1.2,
  portal: 1.3,
  rock: 1.0,
  chest: 0.8,
  campfire: 0.8,
  sign: 0.8,
  tombstone: 0.7,
  barrel: 0.7,
  crate: 0.7,
  stump: 0.6,
  flower: 0.5,
  mushroom: 0.7,
  bones: 0.5,
  fence: 1.0,
  gate: 1.0,
  push_block: 1.0,
  spike_trap: 0.8,
  iron_fence: 1.1,
  hedge: 0.9,
  scarecrow: 1.4,
  hay_bale: 0.7,
  lantern: 0.9,
  wheat: 0.95,
};

const OVERLAY_SORT_TRIM: Partial<Record<TileType, number>> = {
  tree: 0.12,
  dead_tree: 0.1,
  house: 0.14,
  house_blue: 0.14,
  house_green: 0.14,
  house_thatch: 0.12,
  destroyed_house: 0.1,
  statue: 0.08,
  well: 0.18,
  portal: 0.2,
  rock: 0.18,
  chest: 0.16,
  campfire: 0.2,
  sign: 0.16,
  tombstone: 0.16,
  barrel: 0.16,
  crate: 0.16,
  stump: 0.16,
  flower: 0.22,
  mushroom: 0.2,
  bones: 0.18,
  fence: 0.22,
  gate: 0.22,
  push_block: 0.16,
  spike_trap: 0.2,
  iron_fence: 0.22,
  hedge: 0.2,
  scarecrow: 0.12,
  hay_bale: 0.18,
  lantern: 0.14,
  tall_grass: 0.24,
  wheat: 0.24,
};

// Seeded hash for deterministic detail placement
function tileHash(x: number, y: number, seed: number = 0): number {
  let h = (x * 374761393 + y * 668265263 + seed * 1274126177) | 0;
  h = (h ^ (h >> 13)) * 1274126177;
  h = h ^ (h >> 16);
  return (h & 0x7fffffff) / 0x7fffffff; // 0..1
}

// Detail decal types per terrain
const DETAIL_CONFIG: Partial<Record<TileType, { chance: number; types: string[]; scale: number; opacity: number }>> = {
  grass: { chance: 0.18, types: ['detail_grass_tuft', 'detail_leaf', 'detail_pebble'], scale: 0.25, opacity: 0.5 },
  dirt: { chance: 0.12, types: ['detail_pebble', 'detail_crack', 'detail_twig'], scale: 0.22, opacity: 0.45 },
  dark_grass: { chance: 0.22, types: ['detail_leaf', 'detail_grass_tuft', 'detail_mushroom_small'], scale: 0.28, opacity: 0.55 },
  cobblestone: { chance: 0.08, types: ['detail_crack', 'detail_pebble'], scale: 0.2, opacity: 0.35 },
  sand: { chance: 0.06, types: ['detail_pebble'], scale: 0.18, opacity: 0.3 },
  farmland: { chance: 0.1, types: ['detail_grass_tuft', 'detail_pebble'], scale: 0.2, opacity: 0.4 },
  stone: { chance: 0.1, types: ['detail_crack', 'detail_pebble'], scale: 0.2, opacity: 0.4 },
  wooden_path: { chance: 0.08, types: ['detail_crack', 'detail_leaf'], scale: 0.2, opacity: 0.35 },
  mossy_stone: { chance: 0.15, types: ['detail_leaf', 'detail_mushroom_small'], scale: 0.25, opacity: 0.5 },
};

export class World {
  private map: WorldMap;
  private tileSize: number = 1;
  private scene: THREE.Scene;
  private assetManager: AssetManager;
  
  private activeMeshes: Map<string, THREE.Object3D> = new Map();
  private overlayPool: THREE.Group[] = [];
  private lastChunkCenter: { x: number; y: number } = { x: -9999, y: -9999 };
  private lastMoveDir: { x: number; y: number } = { x: 0, y: 0 };
  private readonly CHUNK_UPDATE_THRESHOLD = 2;
  private readonly PRELOAD_EXTRA = 10; // extra tiles in movement direction
  private pendingTiles: Array<{ x: number; y: number; key: string }> = [];
  private isInitialLoad: boolean = true;
  private materialCache: Map<string, THREE.MeshBasicMaterial> = new Map();
  private detailGeometry: THREE.PlaneGeometry;
  private detailTextures: Map<string, THREE.Texture> = new Map();

  constructor(scene: THREE.Scene, assetManager: AssetManager, map: WorldMap) {
    this.scene = scene;
    this.assetManager = assetManager;
    this.map = map;
    this.detailGeometry = new THREE.PlaneGeometry(0.3, 0.3);
    this.generateDetailTextures();
  }

  private generateDetailTextures() {
    const makeCanvas = (draw: (ctx: CanvasRenderingContext2D) => void): THREE.Texture => {
      const c = document.createElement('canvas');
      c.width = 16; c.height = 16;
      const ctx = c.getContext('2d')!;
      ctx.clearRect(0, 0, 16, 16);
      draw(ctx);
      const tex = new THREE.CanvasTexture(c);
      tex.magFilter = THREE.NearestFilter;
      tex.minFilter = THREE.NearestFilter;
      return tex;
    };

    this.detailTextures.set('detail_grass_tuft', makeCanvas(ctx => {
      ctx.fillStyle = '#3a6b28';
      ctx.fillRect(6, 8, 2, 6); ctx.fillRect(4, 6, 2, 5); ctx.fillRect(9, 7, 2, 5);
      ctx.fillStyle = '#4a8b38';
      ctx.fillRect(7, 6, 1, 4); ctx.fillRect(5, 5, 1, 3); ctx.fillRect(10, 6, 1, 3);
    }));

    this.detailTextures.set('detail_leaf', makeCanvas(ctx => {
      ctx.fillStyle = '#8B6914';
      ctx.fillRect(5, 6, 6, 4);
      ctx.fillStyle = '#A07828';
      ctx.fillRect(6, 7, 4, 2);
      ctx.fillRect(7, 5, 2, 1);
      ctx.fillRect(7, 10, 2, 1);
    }));

    this.detailTextures.set('detail_pebble', makeCanvas(ctx => {
      ctx.fillStyle = '#888';
      ctx.beginPath(); ctx.arc(6, 9, 3, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#999';
      ctx.beginPath(); ctx.arc(10, 7, 2, 0, Math.PI * 2); ctx.fill();
    }));

    this.detailTextures.set('detail_crack', makeCanvas(ctx => {
      ctx.strokeStyle = 'rgba(0,0,0,0.3)';
      ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(4, 4); ctx.lineTo(8, 8); ctx.lineTo(6, 12); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(8, 8); ctx.lineTo(12, 10); ctx.stroke();
    }));

    this.detailTextures.set('detail_twig', makeCanvas(ctx => {
      ctx.strokeStyle = '#6B4226';
      ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(3, 10); ctx.lineTo(12, 6); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(8, 7); ctx.lineTo(10, 4); ctx.stroke();
    }));

    this.detailTextures.set('detail_mushroom_small', makeCanvas(ctx => {
      ctx.fillStyle = '#C8A882';
      ctx.fillRect(7, 9, 2, 4);
      ctx.fillStyle = '#CC4444';
      ctx.fillRect(5, 7, 6, 3);
      ctx.fillStyle = '#EE6666';
      ctx.fillRect(6, 7, 4, 2);
    }));
  }

  // Shared geometry for all tile meshes
  private readonly sharedTileGeometry = new THREE.PlaneGeometry(this.tileSize, this.tileSize);

  private getCachedMaterial(texture: THREE.Texture, cacheKey: string): THREE.MeshBasicMaterial {
    let material = this.materialCache.get(cacheKey);
    if (!material) {
      material = new THREE.MeshBasicMaterial({
        map: texture,
        transparent: true,
        depthWrite: false,
      });
      this.materialCache.set(cacheKey, material);
    }
    return material;
  }

  private createPlaneMesh(texture: THREE.Texture, z: number, cacheKey: string): THREE.Mesh {
    const material = this.getCachedMaterial(texture, cacheKey);
    const mesh = new THREE.Mesh(this.sharedTileGeometry, material);
    mesh.frustumCulled = false;
    mesh.position.z = z;
    mesh.matrixAutoUpdate = false;
    return mesh;
  }

  private createDetailDecal(tileX: number, tileY: number, tileType: TileType): THREE.Mesh | null {
    const config = DETAIL_CONFIG[tileType];
    if (!config) return null;

    const h = tileHash(tileX, tileY);
    if (h > config.chance) return null;

    const typeIndex = Math.floor(tileHash(tileX, tileY, 7) * config.types.length);
    const detailType = config.types[typeIndex];
    const tex = this.detailTextures.get(detailType);
    if (!tex) return null;

    const cacheKey = `detail_${detailType}_${Math.floor(config.opacity * 10)}`;
    let mat = this.materialCache.get(cacheKey);
    if (!mat) {
      mat = new THREE.MeshBasicMaterial({
        map: tex,
        transparent: true,
        opacity: config.opacity,
        depthWrite: false,
      });
      this.materialCache.set(cacheKey, mat);
    }

    const mesh = new THREE.Mesh(this.detailGeometry, mat);
    mesh.frustumCulled = false;
    mesh.matrixAutoUpdate = false;

    const offsetX = (tileHash(tileX, tileY, 3) - 0.5) * 0.5;
    const offsetY = (tileHash(tileX, tileY, 5) - 0.5) * 0.5;
    const rot = tileHash(tileX, tileY, 11) * Math.PI * 2;
    const s = config.scale * (0.8 + tileHash(tileX, tileY, 13) * 0.4);

    mesh.position.set(offsetX, offsetY, -0.3);
    mesh.rotation.z = rot;
    mesh.scale.set(s, s, 1);

    return mesh;
  }

  private createTileObject(tile: Tile, tileX?: number, tileY?: number): THREE.Object3D | null {
    const isOverlay = OVERLAY_TYPES.has(tile.type);

    if (!isOverlay) {
      const texture = this.assetManager.getTexture(tile.type);
      if (!texture) return null;
      
      // Check for detail decal
      if (tileX !== undefined && tileY !== undefined && tile.walkable) {
        const decal = this.createDetailDecal(tileX, tileY, tile.type);
        if (decal) {
          const group = this.overlayPool.pop() ?? new THREE.Group();
          group.clear();
          group.matrixAutoUpdate = false;
          const baseMesh = this.createPlaneMesh(texture, -0.5, `base_${tile.type}`);
          baseMesh.updateMatrix();
          decal.updateMatrix();
          group.add(baseMesh, decal);
          return group;
        }
      }
      
      return this.createPlaneMesh(texture, -0.5, `base_${tile.type}`);
    }

    const overlayTexture = this.assetManager.getTexture(tile.type);
    
    // Determine base tile: check surrounding terrain for context, fall back to default
    let baseType = OVERLAY_BASE_TILE[tile.type] ?? 'grass';
    if (tileX !== undefined && tileY !== undefined) {
      const neighbors: TileType[] = [];
      for (const [dx, dy] of [[0,1],[0,-1],[1,0],[-1,0]]) {
        const nx = tileX + dx, ny = tileY + dy;
        if (ny >= 0 && ny < this.map.height && nx >= 0 && nx < this.map.width) {
          const neighbor = this.map.tiles[ny][nx];
          if (!OVERLAY_TYPES.has(neighbor.type)) {
            neighbors.push(neighbor.type);
          }
        }
      }
      if (neighbors.length > 0) {
        const counts = new Map<TileType, number>();
        for (const n of neighbors) counts.set(n, (counts.get(n) || 0) + 1);
        let best = neighbors[0], bestCount = 0;
        for (const [t, c] of counts) {
          if (c > bestCount) {
            best = t;
            bestCount = c;
          }
        }
        baseType = best;
      }
    }
    
    const baseTexture = this.assetManager.getTexture(baseType);
    if (!overlayTexture || !baseTexture) return null;

    const group = this.overlayPool.pop() ?? new THREE.Group();
    group.clear();
    group.matrixAutoUpdate = false;
    group.userData = {
      tileType: tile.type,
      footOffset: OVERLAY_FOOT_OFFSET[tile.type] ?? 0,
    };

    const baseMesh = this.createPlaneMesh(baseTexture, -0.5, `base_${baseType}`);
    const overlayMesh = this.createPlaneMesh(overlayTexture, 0.1, `overlay_${tile.type}`);

    const scale = OVERLAY_SCALE[tile.type] ?? 1.0;
    if (scale !== 1.0) {
      overlayMesh.scale.set(scale, scale, 1);
      overlayMesh.position.y = (scale - 1) * this.tileSize * 0.3;
    }
    baseMesh.updateMatrix();
    overlayMesh.updateMatrix();

    group.add(baseMesh, overlayMesh);
    return group;
  }

  private recycleObject(object: THREE.Object3D) {
    if (object instanceof THREE.Group) {
      object.clear();
      this.overlayPool.push(object);
      return;
    }
    // Meshes with shared materials just get removed from scene — no disposal needed
  }

  updateChunks(playerWorldX: number, playerWorldY: number) {
    const centerTileX = Math.floor(playerWorldX + this.map.width / 2);
    const centerTileY = Math.floor(playerWorldY + this.map.height / 2);

    const dx = centerTileX - this.lastChunkCenter.x;
    const dy = centerTileY - this.lastChunkCenter.y;
    
    const needsFullUpdate = Math.abs(dx) >= this.CHUNK_UPDATE_THRESHOLD || Math.abs(dy) >= this.CHUNK_UPDATE_THRESHOLD;

    // Process pending tiles from previous frames (batched loading)
    if (this.pendingTiles.length > 0) {
      const batchSize = this.isInitialLoad ? this.pendingTiles.length : MAX_TILES_PER_FRAME;
      const batch = this.pendingTiles.splice(0, batchSize);
      const worldOffsetX = -this.map.width / 2;
      const worldOffsetY = -this.map.height / 2;

      for (const { x, y, key } of batch) {
        if (this.activeMeshes.has(key)) continue;
        const tile = this.map.tiles[y]?.[x];
        if (!tile || tile.hidden) continue;

        const object = this.createTileObject(tile, x, y);
        if (!object) continue;

        const isOverlay = OVERLAY_TYPES.has(tile.type);
        object.position.set(worldOffsetX + x * this.tileSize, worldOffsetY + y * this.tileSize, 0);
        if (isOverlay) {
          const footOffset = object.userData?.footOffset ?? 0;
          const worldY = worldOffsetY + y * this.tileSize;
          const ySort = Math.round(1000 + (this.map.height - (worldY - footOffset + this.map.height / 2)) * 10);
          object.renderOrder = ySort;
          if (object instanceof THREE.Group) {
            for (const child of object.children) child.renderOrder = ySort;
          }
        }
        object.updateMatrix();
        if (object instanceof THREE.Group) object.updateMatrixWorld(true);

        this.scene.add(object);
        this.activeMeshes.set(key, object);
      }

      if (this.pendingTiles.length === 0) this.isInitialLoad = false;
      if (!needsFullUpdate) return;
    }

    if (!needsFullUpdate) return;

    // Track movement direction for preloading
    if (dx !== 0 || dy !== 0) {
      this.lastMoveDir.x = dx > 0 ? 1 : dx < 0 ? -1 : 0;
      this.lastMoveDir.y = dy > 0 ? 1 : dy < 0 ? -1 : 0;
    }
    this.lastChunkCenter = { x: centerTileX, y: centerTileY };

    // Extend render radius in movement direction
    const preX = this.lastMoveDir.x * this.PRELOAD_EXTRA;
    const preY = this.lastMoveDir.y * this.PRELOAD_EXTRA;
    const startX = Math.max(0, centerTileX - RENDER_RADIUS + Math.min(0, preX));
    const endX = Math.min(this.map.width - 1, centerTileX + RENDER_RADIUS + Math.max(0, preX));
    const startY = Math.max(0, centerTileY - RENDER_RADIUS + Math.min(0, preY));
    const endY = Math.min(this.map.height - 1, centerTileY + RENDER_RADIUS + Math.max(0, preY));

    // Cull distant tiles (keep anything within cull radius to prevent flicker)
    for (const [key, object] of this.activeMeshes) {
      const [kx, ky] = key.split(',').map(Number);
      if (Math.abs(kx - centerTileX) > CULL_RADIUS || Math.abs(ky - centerTileY) > CULL_RADIUS) {
        this.scene.remove(object);
        this.recycleObject(object);
        this.activeMeshes.delete(key);
      }
    }

    // Collect new tiles to create
    this.pendingTiles = [];
    for (let y = startY; y <= endY; y++) {
      for (let x = startX; x <= endX; x++) {
        const key = `${x},${y}`;
        if (!this.activeMeshes.has(key)) {
          this.pendingTiles.push({ x, y, key });
        }
      }
    }

    // Sort pending tiles by distance to player (closest first) for better visual loading
    this.pendingTiles.sort((a, b) => {
      const da = Math.abs(a.x - centerTileX) + Math.abs(a.y - centerTileY);
      const db = Math.abs(b.x - centerTileX) + Math.abs(b.y - centerTileY);
      return da - db;
    });

    // Process first batch immediately (initial load gets all at once)
    const immediateBatch = this.isInitialLoad ? this.pendingTiles.length : MAX_TILES_PER_FRAME;
    const batch = this.pendingTiles.splice(0, immediateBatch);
    const worldOffsetX = -this.map.width / 2;
    const worldOffsetY = -this.map.height / 2;

    for (const { x, y, key } of batch) {
      if (this.activeMeshes.has(key)) continue;
      const tile = this.map.tiles[y]?.[x];
      if (!tile || tile.hidden) continue;

      const object = this.createTileObject(tile, x, y);
      if (!object) continue;

      const isOverlay = OVERLAY_TYPES.has(tile.type);
      object.position.set(worldOffsetX + x * this.tileSize, worldOffsetY + y * this.tileSize, 0);
      if (isOverlay) {
        const footOffset = object.userData?.footOffset ?? 0;
        const worldY = worldOffsetY + y * this.tileSize;
        const ySort = Math.round(1000 + (this.map.height - (worldY - footOffset + this.map.height / 2)) * 10);
        object.renderOrder = ySort;
        if (object instanceof THREE.Group) {
          for (const child of object.children) child.renderOrder = ySort;
        }
      }
      object.updateMatrix();
      if (object instanceof THREE.Group) object.updateMatrixWorld(true);

      this.scene.add(object);
      this.activeMeshes.set(key, object);
    }

    if (this.pendingTiles.length === 0) this.isInitialLoad = false;
  }

  rebuildChunks() {
    for (const [, object] of this.activeMeshes) {
      this.scene.remove(object);
      this.recycleObject(object);
    }
    this.activeMeshes.clear();
    this.pendingTiles = [];
    this.lastChunkCenter = { x: -9999, y: -9999 };
    this.lastMoveDir = { x: 0, y: 0 };
    this.isInitialLoad = true;
  }

  getTile(x: number, y: number): Tile | null {
    const tileX = Math.floor(x + this.map.width / 2);
    const tileY = Math.floor(y + this.map.height / 2);

    if (tileX < 0 || tileX >= this.map.width || tileY < 0 || tileY >= this.map.height) {
      return null;
    }

    return this.map.tiles[tileY][tileX];
  }

  isWalkable(x: number, y: number): boolean {
    const tile = this.getTile(x, y);
    return tile ? tile.walkable : false;
  }

  getSpawnPoint(): { x: number; y: number } {
    return {
      x: this.map.spawnPoint.x - this.map.width / 2,
      y: this.map.spawnPoint.y - this.map.height / 2,
    };
  }

  getInteractableAt(x: number, y: number): string | null {
    const tile = this.getTile(x, y);
    return tile?.interactable && tile.interactionId ? tile.interactionId : null;
  }

  getTransitionAt(x: number, y: number): { targetMap: string; targetX: number; targetY: number } | null {
    const tile = this.getTile(x, y);
    return tile?.transition || null;
  }

  tryPushBlock(playerX: number, playerY: number, direction: { x: number; y: number }): boolean {
    const blockTileX = Math.floor(playerX + direction.x + this.map.width / 2);
    const blockTileY = Math.floor(playerY + direction.y + this.map.height / 2);
    
    const tile = this.map.tiles[blockTileY]?.[blockTileX];
    if (!tile || tile.type !== 'push_block') return false;

    const targetTileX = blockTileX + direction.x;
    const targetTileY = blockTileY + direction.y;
    const targetTile = this.map.tiles[targetTileY]?.[targetTileX];
    
    if (!targetTile || !targetTile.walkable) return false;

    this.map.tiles[blockTileY][blockTileX] = { type: 'stone', walkable: true };
    this.map.tiles[targetTileY][targetTileX] = { type: 'push_block', walkable: false, pushable: true };

    if (targetTile.type === 'pressure_plate' && targetTile.linkedTo) {
      this.activateSwitch(targetTile.linkedTo);
    }

    this.rebuildChunks();
    return true;
  }

  activateSwitch(doorId: string) {
    for (let y = 0; y < this.map.height; y++) {
      for (let x = 0; x < this.map.width; x++) {
        const tile = this.map.tiles[y][x];
        if (tile.type === 'switch_door' && tile.interactionId === doorId) {
          tile.walkable = true;
          tile.type = 'stone';
          tile.activated = true;
        }
      }
    }
  }

  revealHiddenArea(centerX: number, centerY: number, radius: number = 3) {
    const tileX = Math.floor(centerX + this.map.width / 2);
    const tileY = Math.floor(centerY + this.map.height / 2);

    for (let dy = -radius; dy <= radius; dy++) {
      for (let dx = -radius; dx <= radius; dx++) {
        const tx = tileX + dx;
        const ty = tileY + dy;
        if (tx >= 0 && tx < this.map.width && ty >= 0 && ty < this.map.height) {
          if (this.map.tiles[ty][tx].hidden) {
            this.map.tiles[ty][tx].hidden = false;
          }
        }
      }
    }
    this.rebuildChunks();
  }

  loadMap(map: WorldMap) {
    this.map = map;
    this.rebuildChunks();
  }

  getCurrentMap(): WorldMap {
    return this.map;
  }

  dispose() {
    for (const [, object] of this.activeMeshes) {
      this.scene.remove(object);
    }
    this.activeMeshes.clear();
    
    for (const [, material] of this.materialCache) {
      material.dispose();
    }
    this.materialCache.clear();
    for (const [, tex] of this.detailTextures) {
      tex.dispose();
    }
    this.detailTextures.clear();
    this.overlayPool = [];
    this.sharedTileGeometry.dispose();
    this.detailGeometry.dispose();
  }
}
