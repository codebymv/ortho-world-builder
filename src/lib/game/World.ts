import * as THREE from 'three';
import { AssetManager } from './AssetManager';

export type TileType = 'grass' | 'dirt' | 'water' | 'stone' | 'wood' | 'tree' | 'house' | 'rock' | 'chest' | 'portal' | 'flower';

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
}

export interface WorldMap {
  name: string;
  width: number;
  height: number;
  tiles: Tile[][];
  spawnPoint: { x: number; y: number };
}

export class World {
  private map: WorldMap;
  private tileSize: number = 1;
  private scene: THREE.Scene;
  private assetManager: AssetManager;
  private tileMeshes: THREE.Mesh[] = [];

  constructor(scene: THREE.Scene, assetManager: AssetManager, map: WorldMap) {
    this.scene = scene;
    this.assetManager = assetManager;
    this.map = map;
    this.buildWorld();
  }

  private buildWorld() {
    // Clear existing tiles
    this.tileMeshes.forEach(mesh => this.scene.remove(mesh));
    this.tileMeshes = [];

    const startX = -this.map.width / 2;
    const startY = -this.map.height / 2;

    for (let y = 0; y < this.map.height; y++) {
      for (let x = 0; x < this.map.width; x++) {
        const tile = this.map.tiles[y][x];
        const texture = this.assetManager.getTexture(tile.type);

        if (texture) {
          const geometry = new THREE.PlaneGeometry(this.tileSize, this.tileSize);
          const material = new THREE.MeshBasicMaterial({
            map: texture,
            transparent: tile.type === 'tree' || tile.type === 'house' || tile.type === 'rock' || tile.type === 'chest' || tile.type === 'portal',
          });
          const mesh = new THREE.Mesh(geometry, material);
          
          mesh.position.set(
            startX + x * this.tileSize,
            startY + y * this.tileSize,
            tile.type === 'tree' || tile.type === 'house' || tile.type === 'rock' || tile.type === 'chest' || tile.type === 'portal' ? 0.1 : -0.5
          );

          this.scene.add(mesh);
          this.tileMeshes.push(mesh);
        }
      }
    }
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

  loadMap(map: WorldMap) {
    this.map = map;
    this.buildWorld();
  }

  getCurrentMap(): WorldMap {
    return this.map;
  }
}
