import * as THREE from 'three';
import { AssetManager } from './AssetManager';

export type TileType = 
  | 'grass' | 'dirt' | 'water' | 'stone' | 'wood' 
  | 'tree' | 'house' | 'rock' | 'chest' | 'portal' | 'flower'
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

const RENDER_RADIUS = 28;
const CULL_RADIUS = 38;
const OVERLAY_TYPES: Set<TileType> = new Set([
  'tree', 'house', 'rock', 'chest', 'portal', 'flower',
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
  private meshPool: THREE.Mesh[] = [];
  private overlayPool: THREE.Group[] = [];
  private lastChunkCenter: { x: number; y: number } = { x: -9999, y: -9999 };
  private lastMoveDir: { x: number; y: number } = { x: 0, y: 0 };
  private readonly CHUNK_UPDATE_THRESHOLD = 1;
  private readonly PRELOAD_EXTRA = 8; // extra tiles in movement direction

  constructor(scene: THREE.Scene, assetManager: AssetManager, map: WorldMap) {
    this.scene = scene;
    this.assetManager = assetManager;
    this.map = map;
  }

  // Shared geometry for all tile meshes
  private readonly sharedTileGeometry = new THREE.PlaneGeometry(this.tileSize, this.tileSize);

  private createPlaneMesh(texture: THREE.Texture, z: number): THREE.Mesh {
    let mesh: THREE.Mesh;

    if (this.meshPool.length > 0) {
      mesh = this.meshPool.pop()!;
      const material = mesh.material as THREE.MeshBasicMaterial;
      material.map = texture;
      material.transparent = true;
      material.needsUpdate = true;
    } else {
      const material = new THREE.MeshBasicMaterial({
        map: texture,
        transparent: true,
      });
      mesh = new THREE.Mesh(this.sharedTileGeometry, material);
      mesh.frustumCulled = false; // We handle culling manually
    }

    mesh.position.z = z;
    mesh.matrixAutoUpdate = false;
    return mesh;
  }

  private createTileObject(tile: Tile): THREE.Object3D | null {
    const isOverlay = OVERLAY_TYPES.has(tile.type);

    if (!isOverlay) {
      const texture = this.assetManager.getTexture(tile.type);
      return texture ? this.createPlaneMesh(texture, -0.5) : null;
    }

    const overlayTexture = this.assetManager.getTexture(tile.type);
    const baseType = OVERLAY_BASE_TILE[tile.type] ?? 'grass';
    const baseTexture = this.assetManager.getTexture(baseType);
    if (!overlayTexture || !baseTexture) return null;

    const group = this.overlayPool.pop() ?? new THREE.Group();
    group.clear();
    group.matrixAutoUpdate = false;

    const baseMesh = this.createPlaneMesh(baseTexture, -0.5);
    const overlayMesh = this.createPlaneMesh(overlayTexture, 0.1);

    // Apply scale to overlay
    const scale = OVERLAY_SCALE[tile.type] ?? 1.0;
    if (scale !== 1.0) {
      overlayMesh.scale.set(scale, scale, 1);
      // Offset upward so bottom aligns with tile bottom
      overlayMesh.position.y = (scale - 1) * this.tileSize * 0.3;
    }
    baseMesh.updateMatrix();
    overlayMesh.updateMatrix();

    group.add(baseMesh, overlayMesh);
    return group;
  }

  private recycleObject(object: THREE.Object3D) {
    if (object instanceof THREE.Group) {
      const children = [...object.children];
      for (const child of children) {
        object.remove(child);
        if (child instanceof THREE.Mesh) {
          this.meshPool.push(child);
        }
      }
      this.overlayPool.push(object);
      return;
    }

    if (object instanceof THREE.Mesh) {
      this.meshPool.push(object);
    }
  }

  updateChunks(playerWorldX: number, playerWorldY: number) {
    const centerTileX = Math.floor(playerWorldX + this.map.width / 2);
    const centerTileY = Math.floor(playerWorldY + this.map.height / 2);

    const dx = centerTileX - this.lastChunkCenter.x;
    const dy = centerTileY - this.lastChunkCenter.y;
    if (Math.abs(dx) < this.CHUNK_UPDATE_THRESHOLD && Math.abs(dy) < this.CHUNK_UPDATE_THRESHOLD) return;

    // Track movement direction for preloading
    if (dx !== 0 || dy !== 0) {
      this.lastMoveDir.x = dx > 0 ? 1 : dx < 0 ? -1 : 0;
      this.lastMoveDir.y = dy > 0 ? 1 : dy < 0 ? -1 : 0;
    }
    this.lastChunkCenter = { x: centerTileX, y: centerTileY };

    // Extend render radius in movement direction for seamless preloading
    const preX = this.lastMoveDir.x * this.PRELOAD_EXTRA;
    const preY = this.lastMoveDir.y * this.PRELOAD_EXTRA;
    const startX = Math.max(0, centerTileX - RENDER_RADIUS + Math.min(0, preX));
    const endX = Math.min(this.map.width - 1, centerTileX + RENDER_RADIUS + Math.max(0, preX));
    const startY = Math.max(0, centerTileY - RENDER_RADIUS + Math.min(0, preY));
    const endY = Math.min(this.map.height - 1, centerTileY + RENDER_RADIUS + Math.max(0, preY));

    const neededKeys = new Set<string>();
    for (let y = startY; y <= endY; y++) {
      for (let x = startX; x <= endX; x++) {
        neededKeys.add(`${x},${y}`);
      }
    }

    // Cull with a larger radius than render to prevent flicker at edges
    for (const [key, object] of this.activeMeshes) {
      const [kx, ky] = key.split(',').map(Number);
      if (Math.abs(kx - centerTileX) > CULL_RADIUS || Math.abs(ky - centerTileY) > CULL_RADIUS) {
        this.scene.remove(object);
        this.recycleObject(object);
        this.activeMeshes.delete(key);
      }
    }

    const worldOffsetX = -this.map.width / 2;
    const worldOffsetY = -this.map.height / 2;

    for (let y = startY; y <= endY; y++) {
      for (let x = startX; x <= endX; x++) {
        const key = `${x},${y}`;
        if (this.activeMeshes.has(key)) continue;

        const tile = this.map.tiles[y]?.[x];
        if (!tile || tile.hidden) continue;

        const object = this.createTileObject(tile);
        if (!object) continue;

        object.position.set(
          worldOffsetX + x * this.tileSize,
          worldOffsetY + y * this.tileSize,
          0
        );
        object.updateMatrix();
        if (object instanceof THREE.Group) {
          object.updateMatrixWorld(true);
        }

        this.scene.add(object);
        this.activeMeshes.set(key, object);
      }
    }
  }

  rebuildChunks() {
    for (const [, object] of this.activeMeshes) {
      this.scene.remove(object);
      this.recycleObject(object);
    }
    this.activeMeshes.clear();
    this.lastChunkCenter = { x: -9999, y: -9999 };
    this.lastMoveDir = { x: 0, y: 0 };
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
      if (object instanceof THREE.Group) {
        for (const child of object.children) {
          if (child instanceof THREE.Mesh) {
            (child.material as THREE.Material).dispose();
          }
        }
      } else if (object instanceof THREE.Mesh) {
        (object.material as THREE.Material).dispose();
      }
    }
    this.activeMeshes.clear();
    
    for (const mesh of this.meshPool) {
      (mesh.material as THREE.Material).dispose();
    }
    this.meshPool = [];
    this.overlayPool = [];
    this.sharedTileGeometry.dispose();
  }
}
