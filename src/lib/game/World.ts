import * as THREE from 'three';
import { AssetManager } from './AssetManager';

export type TileType = 
  | 'grass' | 'dirt' | 'water' | 'stone' | 'wood' 
  | 'tree' | 'house' | 'rock' | 'chest' | 'portal' | 'flower'
  | 'tall_grass' | 'bridge' | 'sand' | 'swamp' | 'lava' | 'ice'
  | 'pressure_plate' | 'hidden_wall' | 'push_block' | 'switch_door'
  | 'campfire' | 'sign' | 'well' | 'tombstone' | 'mushroom' | 'stump'
  | 'fence' | 'gate' | 'barrel' | 'crate' | 'spike_trap' | 'bones';

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
  hidden?: boolean; // for secret areas - becomes visible when discovered
  linkedTo?: string; // for pressure plates/switches linking to doors
  pushable?: boolean; // for push blocks
  activated?: boolean; // for switches/plates
}

export interface WorldMap {
  name: string;
  width: number;
  height: number;
  tiles: Tile[][];
  spawnPoint: { x: number; y: number };
}

// Mesh pool entry
interface ChunkMesh {
  mesh: THREE.Mesh;
  tileX: number;
  tileY: number;
  active: boolean;
}

const RENDER_RADIUS = 18; // tiles around the player to render
const OVERLAY_TYPES: Set<TileType> = new Set([
  'tree', 'house', 'rock', 'chest', 'portal', 'flower',
  'push_block', 'campfire', 'sign', 'well', 'tombstone', 'mushroom', 'stump',
  'fence', 'gate', 'barrel', 'crate', 'spike_trap', 'bones'
]);

export class World {
  private map: WorldMap;
  private tileSize: number = 1;
  private scene: THREE.Scene;
  private assetManager: AssetManager;
  
  // Chunk rendering
  private activeMeshes: Map<string, THREE.Mesh> = new Map();
  private meshPool: THREE.Mesh[] = [];
  private lastChunkCenter: { x: number; y: number } = { x: -9999, y: -9999 };
  private readonly CHUNK_UPDATE_THRESHOLD = 2; // retrigger when player moves 2+ tiles

  constructor(scene: THREE.Scene, assetManager: AssetManager, map: WorldMap) {
    this.scene = scene;
    this.assetManager = assetManager;
    this.map = map;
  }

  // Call every frame with player world position
  updateChunks(playerWorldX: number, playerWorldY: number) {
    const centerTileX = Math.floor(playerWorldX + this.map.width / 2);
    const centerTileY = Math.floor(playerWorldY + this.map.height / 2);

    const dx = Math.abs(centerTileX - this.lastChunkCenter.x);
    const dy = Math.abs(centerTileY - this.lastChunkCenter.y);
    if (dx < this.CHUNK_UPDATE_THRESHOLD && dy < this.CHUNK_UPDATE_THRESHOLD) return;

    this.lastChunkCenter = { x: centerTileX, y: centerTileY };

    const startX = Math.max(0, centerTileX - RENDER_RADIUS);
    const endX = Math.min(this.map.width - 1, centerTileX + RENDER_RADIUS);
    const startY = Math.max(0, centerTileY - RENDER_RADIUS);
    const endY = Math.min(this.map.height - 1, centerTileY + RENDER_RADIUS);

    // Track which keys should be visible
    const neededKeys = new Set<string>();
    for (let y = startY; y <= endY; y++) {
      for (let x = startX; x <= endX; x++) {
        neededKeys.add(`${x},${y}`);
      }
    }

    // Remove meshes that are out of range
    for (const [key, mesh] of this.activeMeshes) {
      if (!neededKeys.has(key)) {
        this.scene.remove(mesh);
        this.meshPool.push(mesh);
        this.activeMeshes.delete(key);
      }
    }

    // Add meshes for new tiles in range
    const worldOffsetX = -this.map.width / 2;
    const worldOffsetY = -this.map.height / 2;

    for (let y = startY; y <= endY; y++) {
      for (let x = startX; x <= endX; x++) {
        const key = `${x},${y}`;
        if (this.activeMeshes.has(key)) continue;

        const tile = this.map.tiles[y]?.[x];
        if (!tile) continue;
        if (tile.hidden) continue; // don't render hidden tiles

        const texture = this.assetManager.getTexture(tile.type);
        if (!texture) continue;

        const isOverlay = OVERLAY_TYPES.has(tile.type);
        let mesh: THREE.Mesh;

        if (this.meshPool.length > 0) {
          mesh = this.meshPool.pop()!;
          const mat = mesh.material as THREE.MeshBasicMaterial;
          mat.map = texture;
          mat.transparent = isOverlay;
          mat.needsUpdate = true;
        } else {
          const geometry = new THREE.PlaneGeometry(this.tileSize, this.tileSize);
          const material = new THREE.MeshBasicMaterial({
            map: texture,
            transparent: isOverlay,
          });
          mesh = new THREE.Mesh(geometry, material);
        }

        mesh.position.set(
          worldOffsetX + x * this.tileSize,
          worldOffsetY + y * this.tileSize,
          isOverlay ? 0.1 : -0.5
        );

        this.scene.add(mesh);
        this.activeMeshes.set(key, mesh);
      }
    }
  }

  // Force full rebuild (used on map transitions)
  rebuildChunks() {
    // Clear everything
    for (const [, mesh] of this.activeMeshes) {
      this.scene.remove(mesh);
      this.meshPool.push(mesh);
    }
    this.activeMeshes.clear();
    this.lastChunkCenter = { x: -9999, y: -9999 };
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

  // Push block mechanics
  tryPushBlock(playerX: number, playerY: number, direction: { x: number; y: number }): boolean {
    const blockTileX = Math.floor(playerX + direction.x + this.map.width / 2);
    const blockTileY = Math.floor(playerY + direction.y + this.map.height / 2);
    
    const tile = this.map.tiles[blockTileY]?.[blockTileX];
    if (!tile || tile.type !== 'push_block') return false;

    const targetTileX = blockTileX + direction.x;
    const targetTileY = blockTileY + direction.y;
    const targetTile = this.map.tiles[targetTileY]?.[targetTileX];
    
    if (!targetTile || !targetTile.walkable) return false;

    // Move the block
    this.map.tiles[blockTileY][blockTileX] = { type: 'stone', walkable: true };
    this.map.tiles[targetTileY][targetTileX] = { type: 'push_block', walkable: false, pushable: true };

    // Check if block landed on a pressure plate target
    if (targetTile.type === 'pressure_plate' && targetTile.linkedTo) {
      this.activateSwitch(targetTile.linkedTo);
    }

    this.rebuildChunks();
    return true;
  }

  // Activate switch/pressure plate
  activateSwitch(doorId: string) {
    for (let y = 0; y < this.map.height; y++) {
      for (let x = 0; x < this.map.width; x++) {
        const tile = this.map.tiles[y][x];
        if (tile.type === 'switch_door' && tile.interactionId === doorId) {
          tile.walkable = true;
          tile.type = 'stone'; // door opens
          tile.activated = true;
        }
      }
    }
  }

  // Reveal hidden area
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
    for (const [, mesh] of this.activeMeshes) {
      this.scene.remove(mesh);
      mesh.geometry.dispose();
      (mesh.material as THREE.Material).dispose();
    }
    this.activeMeshes.clear();
    
    for (const mesh of this.meshPool) {
      mesh.geometry.dispose();
      (mesh.material as THREE.Material).dispose();
    }
    this.meshPool = [];
  }
}
