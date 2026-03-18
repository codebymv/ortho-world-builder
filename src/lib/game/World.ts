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
  'iron_fence', 'hedge', 'scarecrow', 'hay_bale', 'lantern'
]);

const OVERLAY_BASE_TILE: Partial<Record<TileType, TileType>> = {
  flower: 'grass',
  mushroom: 'grass',
  stump: 'grass',
  tree: 'grass',
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
};

// Scale multipliers for overlay objects to make them proportionally correct
const OVERLAY_SCALE: Partial<Record<TileType, number>> = {
  house: 2.2,
  house_blue: 2.2,
  house_green: 2.2,
  house_thatch: 2.0,
  destroyed_house: 2.0,
  tree: 1.8,
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
  mushroom: 0.5,
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

  constructor(scene: THREE.Scene, assetManager: AssetManager, map: WorldMap) {
    this.scene = scene;
    this.assetManager = assetManager;
    this.map = map;
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

  private createTileObject(tile: Tile, tileX?: number, tileY?: number): THREE.Object3D | null {
    const isOverlay = OVERLAY_TYPES.has(tile.type);

    if (!isOverlay) {
      const texture = this.assetManager.getTexture(tile.type);
      return texture ? this.createPlaneMesh(texture, -0.5, `base_${tile.type}`) : null;
    }

    const overlayTexture = this.assetManager.getTexture(tile.type);
    
    // Determine base tile: check surrounding terrain for context, fall back to default
    let baseType = OVERLAY_BASE_TILE[tile.type] ?? 'grass';
    if (tileX !== undefined && tileY !== undefined) {
      // Sample adjacent tiles to find the dominant ground type
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
        // Use the most common neighbor as base
        const counts = new Map<TileType, number>();
        for (const n of neighbors) counts.set(n, (counts.get(n) || 0) + 1);
        let best = neighbors[0], bestCount = 0;
        for (const [t, c] of counts) { if (c > bestCount) { best = t; bestCount = c; } }
        baseType = best;
      }
    }
    
    const baseTexture = this.assetManager.getTexture(baseType);
    if (!overlayTexture || !baseTexture) return null;

    const group = this.overlayPool.pop() ?? new THREE.Group();
    group.clear();
    group.matrixAutoUpdate = false;

    const baseMesh = this.createPlaneMesh(baseTexture, -0.5, `base_${baseType}`);
    const overlayMesh = this.createPlaneMesh(overlayTexture, 0.1, `overlay_${tile.type}`);

    // Apply scale to overlay
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
          object.renderOrder = 100 + y;
          if (object instanceof THREE.Group) {
            for (const child of object.children) child.renderOrder = 100 + y;
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

      const object = this.createTileObject(tile);
      if (!object) continue;

      const isOverlay = OVERLAY_TYPES.has(tile.type);
      object.position.set(worldOffsetX + x * this.tileSize, worldOffsetY + y * this.tileSize, 0);
      if (isOverlay) {
        object.renderOrder = 100 + y;
        if (object instanceof THREE.Group) {
          for (const child of object.children) child.renderOrder = 100 + y;
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
    this.overlayPool = [];
    this.sharedTileGeometry.dispose();
  }
}
