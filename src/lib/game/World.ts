import * as THREE from 'three';
import { AssetManager } from './AssetManager';
import { TILE_METADATA, DETAIL_CONFIG } from '@/data/tiles';

export type TileType = 
  | 'grass' | 'dirt' | 'water' | 'stone' | 'wood' 
  | 'tree' | 'house' | 'house_entry' | 'house_blue' | 'house_blue_entry' | 'house_green' | 'house_green_entry' | 'house_thatch' | 'house_thatch_entry' | 'cottage_house' | 'cottage_house_entry' | 'cottage_house_forest' | 'cottage_house_forest_ruined' | 'rock' | 'chest' | 'chest_opened' | 'portal' | 'flower' | 'tempest_grass'
  | 'tall_grass' | 'bridge' | 'sand' | 'swamp' | 'lava' | 'ice'
  | 'pressure_plate' | 'hidden_wall' | 'push_block' | 'switch_door'
  | 'campfire' | 'bonfire' | 'sign' | 'well' | 'tombstone' | 'mushroom' | 'stump'
  | 'fence' | 'gate' | 'barrel' | 'crate' | 'spike_trap' | 'bones'
  | 'volcanic_rock' | 'ash' | 'ruins_floor' | 'waterfall' | 'snow'
  | 'dead_tree' | 'destroyed_house' | 'statue'
  | 'cliff' | 'cliff_edge' | 'cobblestone' | 'farmland' | 'wheat'
  | 'iron_fence' | 'hedge' | 'scarecrow' | 'windmill' | 'hay_bale' | 'lantern'
  | 'dark_grass' | 'mossy_stone' | 'wooden_path' | 'stairs' | 'ladder'
  | 'wagon' | 'cart' | 'market_stall' | 'bench' | 'bookshelf'
  | 'table' | 'pot' | 'rug' | 'wood_floor' | 'counter'
  | 'bed' | 'wardrobe' | 'fireplace' | 'weapon_rack' | 'alchemy_table' | 'cauldron'
  | 'throne' | 'altar' | 'bloodstain' | 'chain' | 'shortcut_lever' | 'cage' | 'bones_pile' | 'ranger_remains'
  | 'door' | 'door_interior' | 'door_iron'
  | 'fog_gate'
  | 'bonfire_unlit';

/** Pass as `getInteractableNear` radius from gameplay so gates / chunky facades stay in scan + reach.
 * Must be >= every `getInteractableReach` value so the min() cap does not shrink large reaches. */
export const INTERACTABLE_QUERY_RADIUS = 3.25;

export interface Tile {
  type: TileType;
  walkable: boolean;
  elevation?: number;
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
  subtitle?: string;
  width: number;
  height: number;
  tiles: Tile[][];
  spawnPoint: { x: number; y: number };
  /** When true, World draws an extra south backdrop (cliff/ocean) below the tile grid so the camera does not show empty void past the coast. */
  coastalSouthBackdrop?: boolean;
}

export interface InteractableHit {
  interactionId: string;
  tileType: TileType;
  x: number;
  y: number;
}

interface ChunkMesh {
  mesh: THREE.Mesh;
  tileX: number;
  tileY: number;
  active: boolean;
}

const RENDER_RADIUS = 32;
const CULL_RADIUS = 42;
const MAX_TILES_PER_FRAME = 200; // steady-state budget while moving
const INITIAL_LOAD_TILES_PER_FRAME = 320; // smoother initial/after-rebuild streaming without one-frame spikes
const HEIGHT_TILE_TYPES: ReadonlySet<TileType> = new Set(['cliff', 'cliff_edge', 'stairs', 'ladder']);
const NON_BLOCKING_OVERLAYS: ReadonlySet<TileType> = new Set([
  'bones',
  'flower',
  'tempest_grass',
  'hay_bale',
  'mushroom',
  'pot',
  'rug',
  'tall_grass',
  'wheat',
]);
const OVERWORLD_STRUCTURE_TILE_TYPES: ReadonlySet<TileType> = new Set([
  'house',
  'house_entry',
  'house_blue',
  'house_blue_entry',
  'house_green',
  'house_green_entry',
  'house_thatch',
  'house_thatch_entry',
  'cottage_house',
  'cottage_house_entry',
  'cottage_house_forest',
  'cottage_house_forest_ruined',
  'destroyed_house',
]);
const OVERWORLD_STRUCTURE_SCALE_MULTIPLIER = 1.18;

// Seeded hash for deterministic detail placement
function tileHash(x: number, y: number, seed: number = 0): number {
  let h = (x * 374761393 + y * 668265263 + seed * 1274126177) | 0;
  h = (h ^ (h >> 13)) * 1274126177;
  h = h ^ (h >> 16);
  return (h & 0x7fffffff) / 0x7fffffff; // 0..1
}

// detail Decals - now imported from data/tiles.ts

export class World {
  static readonly ELEVATION_Y_OFFSET = 0.58;

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
  private mapRevision: number = 0;
  private interactableCache: {
    centerTileX: number;
    centerTileY: number;
    radius: number;
    revision: number;
    result: InteractableHit | null;
  } | null = null;
  /** Meshes below the south coast tiles; not part of chunk streaming. */
  private southCoastBackdrop: THREE.Group | null = null;
  private southCoastBackdropDisposables: Array<{
    geometry: THREE.BufferGeometry;
    material: THREE.Material;
    texture?: THREE.Texture;
  }> = [];
  private materialCache: Map<string, THREE.MeshBasicMaterial> = new Map();
  private detailGeometry: THREE.PlaneGeometry;
  private shadowGeometry: THREE.PlaneGeometry;
  private detailTextures: Map<string, THREE.Texture> = new Map();

  constructor(scene: THREE.Scene, assetManager: AssetManager, map: WorldMap) {
    this.scene = scene;
    this.assetManager = assetManager;
    this.map = map;
    this.detailGeometry = new THREE.PlaneGeometry(0.3, 0.3);
    this.shadowGeometry = new THREE.PlaneGeometry(1, 1);
    this.generateDetailTextures();
    this.rebuildSouthCoastBackdrop();
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

    this.detailTextures.set('height_shadow_top', makeCanvas(ctx => {
      for (let y = 0; y < 16; y++) {
        const alpha = Math.max(0, 0.5 - y * 0.055);
        if (alpha <= 0) continue;
        ctx.fillStyle = `rgba(0, 0, 0, ${alpha})`;
        ctx.fillRect(0, y, 16, 1);
      }
    }));

    this.detailTextures.set('height_shadow_side', makeCanvas(ctx => {
      for (let x = 0; x < 16; x++) {
        const alpha = Math.max(0, 0.34 - x * 0.04);
        if (alpha <= 0) continue;
        ctx.fillStyle = `rgba(0, 0, 0, ${alpha})`;
        ctx.fillRect(x, 0, 1, 16);
      }
    }));
  }

  // Shared geometry for all tile meshes
  private readonly sharedTileGeometry = new THREE.PlaneGeometry(this.tileSize, this.tileSize);
  /** Shared 1×1 plane; scaled per edge to plug elevation gaps (see appendTerrainSeamFillers). */
  private readonly elevationFillerGeometry = new THREE.PlaneGeometry(this.tileSize, this.tileSize);
  /** Cached gradient strips: kind + variant → texture/material (disposed in dispose()). */
  private seamFillTextureByKey = new Map<string, THREE.CanvasTexture>();
  private seamFillMaterialByKey = new Map<string, THREE.MeshBasicMaterial>();

  private getCachedMaterial(texture: THREE.Texture, cacheKey: string): THREE.MeshBasicMaterial {
    let material = this.materialCache.get(cacheKey);
    if (!material) {
      material = new THREE.MeshBasicMaterial({
        map: texture,
        transparent: false, // Use alpha-tested cutouts instead of transparent sorting for world sprites
        depthWrite: false,
        depthTest: false, // Disable depth test completely for proper transparency
        alphaTest: 0.5, // Discard empty pixels so sprite cutouts don't hide the player
      });
      this.materialCache.set(cacheKey, material);
    }
    return material;
  }

  private createPlaneMesh(texture: THREE.Texture, z: number, cacheKey: string): THREE.Mesh {
    const material = this.getCachedMaterial(texture, cacheKey);
    const mesh = new THREE.Mesh(this.sharedTileGeometry, material);
    mesh.frustumCulled = true;
    mesh.position.z = z;
    mesh.matrixAutoUpdate = false;
    return mesh;
  }

  private tileKey(tileX: number, tileY: number): string {
    return `${tileX},${tileY}`;
  }

  private shouldKeepTileActive(tileX: number, tileY: number): boolean {
    if (this.lastChunkCenter.x === -9999 || this.lastChunkCenter.y === -9999) return false;
    return Math.abs(tileX - this.lastChunkCenter.x) <= CULL_RADIUS &&
      Math.abs(tileY - this.lastChunkCenter.y) <= CULL_RADIUS;
  }

  private removeActiveTileObject(key: string): void {
    const object = this.activeMeshes.get(key);
    if (!object) return;
    this.scene.remove(object);
    this.recycleObject(object);
    this.activeMeshes.delete(key);
  }

  private attachTileObject(tileX: number, tileY: number, object: THREE.Object3D): void {
    const isOverlay = this.isOverlayTileType(this.map.tiles[tileY]?.[tileX]?.type ?? 'grass');
    const baseZ = isOverlay ? 0.01 : 0.0;
    const visualYOffset = (this.map.tiles[tileY]?.[tileX]?.elevation ?? 0) * World.ELEVATION_Y_OFFSET;
    const worldOffsetX = -this.map.width / 2;
    const worldOffsetY = -this.map.height / 2;
    object.position.set(worldOffsetX + tileX * this.tileSize, worldOffsetY + tileY * this.tileSize + visualYOffset, baseZ);
    object.userData = {
      ...object.userData,
      tileX,
      tileY,
    };
    if (isOverlay) {
      const sortAnchorY = object.userData?.sortAnchorY ?? 0;
      const worldY = worldOffsetY + tileY * this.tileSize + visualYOffset + sortAnchorY;
      const ySort = Math.round(100000 - worldY * 10 + (object.userData?.renderOrderBias ?? 0));
      this.applyOverlayRenderOrder(object, ySort);
    }
    object.updateMatrix();
    if (object instanceof THREE.Group) object.updateMatrixWorld(false);
    this.scene.add(object);
    this.activeMeshes.set(this.tileKey(tileX, tileY), object);
  }

  private refreshTileRegion(minTileX: number, minTileY: number, maxTileX: number, maxTileY: number): void {
    this.mapRevision += 1;
    this.interactableCache = null;
    const clampedMinX = Math.max(0, minTileX);
    const clampedMinY = Math.max(0, minTileY);
    const clampedMaxX = Math.min(this.map.width - 1, maxTileX);
    const clampedMaxY = Math.min(this.map.height - 1, maxTileY);
    if (clampedMinX > clampedMaxX || clampedMinY > clampedMaxY) return;

    this.pendingTiles = this.pendingTiles.filter(({ x, y }) =>
      x < clampedMinX || x > clampedMaxX || y < clampedMinY || y > clampedMaxY
    );

    for (let y = clampedMinY; y <= clampedMaxY; y++) {
      for (let x = clampedMinX; x <= clampedMaxX; x++) {
        const key = this.tileKey(x, y);
        this.removeActiveTileObject(key);
        if (!this.shouldKeepTileActive(x, y)) continue;

        const tile = this.map.tiles[y]?.[x];
        if (!tile || tile.hidden) continue;
        const object = this.createTileObject(tile, x, y);
        if (!object) continue;
        this.attachTileObject(x, y, object);
      }
    }
  }

  private setRenderRole(object: THREE.Object3D, role: 'ground' | 'overlay'): void {
    object.userData = {
      ...object.userData,
      renderRole: role,
    };
  }

  private applyOverlayRenderOrder(object: THREE.Object3D, ySort: number): void {
    if (!(object instanceof THREE.Group)) {
      object.renderOrder = ySort;
      return;
    }

    object.renderOrder = 0;
    for (const child of object.children) {
      child.renderOrder = child.userData?.renderRole === 'overlay' ? ySort : 0;
    }
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
        depthTest: false, // Disable depth test completely for proper transparency
        alphaTest: 0.5, // Keep detail decals as cutout sprites too
      });
      this.materialCache.set(cacheKey, mat);
    }

    const mesh = new THREE.Mesh(this.detailGeometry, mat);
    mesh.frustumCulled = true;
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

  private createShadowMesh(textureKey: string, opacity: number, rotation: number = 0, flipX: boolean = false): THREE.Mesh | null {
    const tex = this.detailTextures.get(textureKey);
    if (!tex) return null;

    const cacheKey = `shadow_${textureKey}_${Math.round(opacity * 100)}`;
    let mat = this.materialCache.get(cacheKey);
    if (!mat) {
      mat = new THREE.MeshBasicMaterial({
        map: tex,
        transparent: true,
        opacity,
        depthWrite: false,
        depthTest: false,
        alphaTest: 0.02,
      });
      this.materialCache.set(cacheKey, mat);
    }

    const mesh = new THREE.Mesh(this.shadowGeometry, mat);
    mesh.frustumCulled = true;
    mesh.matrixAutoUpdate = false;
    mesh.position.set(0, 0, -0.32);
    mesh.rotation.z = rotation;
    mesh.scale.set(flipX ? -1 : 1, 1, 1);
    return mesh;
  }

  private createElevationShadow(tileX: number, tileY: number, tile: Tile): THREE.Object3D | null {
    const currentElevation = tile.elevation ?? 0;
    const shadowGroup = this.overlayPool.pop() ?? new THREE.Group();
    shadowGroup.clear();
    shadowGroup.matrixAutoUpdate = false;

    let hasShadow = false;
    const northElevation = tileY > 0 ? (this.map.tiles[tileY - 1]?.[tileX]?.elevation ?? 0) : currentElevation;
    const westElevation = tileX > 0 ? (this.map.tiles[tileY]?.[tileX - 1]?.elevation ?? 0) : currentElevation;
    const eastElevation = tileX < this.map.width - 1 ? (this.map.tiles[tileY]?.[tileX + 1]?.elevation ?? 0) : currentElevation;

    if (northElevation > currentElevation) {
      const mesh = this.createShadowMesh('height_shadow_top', Math.min(0.34, 0.18 + (northElevation - currentElevation) * 0.1));
      if (mesh) {
        mesh.updateMatrix();
        shadowGroup.add(mesh);
        hasShadow = true;
      }
    }

    if (westElevation > currentElevation) {
      const mesh = this.createShadowMesh('height_shadow_side', Math.min(0.22, 0.1 + (westElevation - currentElevation) * 0.06));
      if (mesh) {
        mesh.position.z = -0.31;
        mesh.updateMatrix();
        shadowGroup.add(mesh);
        hasShadow = true;
      }
    }

    if (eastElevation > currentElevation) {
      const mesh = this.createShadowMesh('height_shadow_side', Math.min(0.22, 0.1 + (eastElevation - currentElevation) * 0.06), 0, true);
      if (mesh) {
        mesh.position.z = -0.31;
        mesh.updateMatrix();
        shadowGroup.add(mesh);
        hasShadow = true;
      }
    }

    if (!hasShadow) {
      this.overlayPool.push(shadowGroup);
      return null;
    }

    shadowGroup.userData = {
      tileType: `${tile.type}_shadow`,
      sortAnchorY: null,
    };
    return shadowGroup;
  }

  private isOverlayTileType(type: TileType): boolean {
    return Boolean(TILE_METADATA[type]?.isOverlay) || HEIGHT_TILE_TYPES.has(type);
  }

  private resolveBaseTileType(tileX: number, tileY: number, fallback: TileType = 'dirt'): TileType {
    const neighbors: TileType[] = [];
    for (const [dx, dy] of [[0, 1], [0, -1], [1, 0], [-1, 0]] as const) {
      const nx = tileX + dx;
      const ny = tileY + dy;
      if (ny < 0 || ny >= this.map.height || nx < 0 || nx >= this.map.width) continue;
      const neighborType = this.map.tiles[ny][nx]?.type;
      if (!neighborType) continue;
      if (!this.isOverlayTileType(neighborType)) neighbors.push(neighborType);
    }

    if (neighbors.length === 0) return fallback;

    const counts = new Map<TileType, number>();
    for (const neighborType of neighbors) {
      counts.set(neighborType, (counts.get(neighborType) || 0) + 1);
    }

    let best = neighbors[0];
    let bestCount = 0;
    for (const [type, count] of counts) {
      if (count > bestCount) {
        best = type;
        bestCount = count;
      }
    }

    return best;
  }

  private createHeightTileObject(tile: Tile, tileX?: number, tileY?: number): THREE.Object3D | null {
    const overlayTexture = this.assetManager.getTexture(tile.type);
    if (!overlayTexture) return null;

    const baseType = tileX !== undefined && tileY !== undefined
      ? this.resolveBaseTileType(tileX, tileY, tile.type === 'stairs' ? 'dirt' : 'grass')
      : (tile.type === 'stairs' ? 'dirt' : 'grass');
    const baseTexture = this.assetManager.getTexture(baseType);
    if (!baseTexture) return null;

    const group = this.overlayPool.pop() ?? new THREE.Group();
    group.clear();
    group.matrixAutoUpdate = false;

    let scale = 1.0;
    let yOffset = 0;
    let sortTrim = 0.16;

    if (tile.type === 'cliff') {
      scale = 2.4;
      yOffset = 0.76;
      sortTrim = 0.04;
    } else if (tile.type === 'cliff_edge') {
      scale = 2.0;
      yOffset = 0.55;
      sortTrim = 0.05;
    } else {
      scale = 1.42;
      yOffset = 0.16;
      sortTrim = 0.12;
    }

    const sortAnchorY = yOffset - scale * 0.5 + sortTrim;
    group.userData = {
      tileType: tile.type,
      sortAnchorY,
    };

    const baseMesh = this.createPlaneMesh(baseTexture, -0.5, `base_${baseType}`);
    const overlayMesh = this.createPlaneMesh(overlayTexture, 0.1, `height_${tile.type}`);
    this.setRenderRole(baseMesh, 'ground');
    this.setRenderRole(overlayMesh, 'overlay');
    overlayMesh.scale.set(1, scale, 1);
    overlayMesh.position.y = yOffset;

    baseMesh.updateMatrix();
    overlayMesh.updateMatrix();
    group.add(baseMesh, overlayMesh);
    return group;
  }

  /**
   * Elevation UX: stampCliffs only covers “north tile higher than south”. Offset-based drawing still
   * leaves gaps when a neighbor to the south OR east is higher. We only add strips from the **lower**
   * tile toward the higher one (south edge or east edge) so each internal boundary is drawn once.
   * Textures are small vertical gradients + noise per terrain family so seams read as soil/rock, not UI.
   */
  private seamTerrainKind(tile: Tile, tileX: number, tileY: number): string {
    const base: TileType = TILE_METADATA[tile.type]?.isOverlay
      ? this.resolveBaseTileType(tileX, tileY, TILE_METADATA[tile.type]?.baseTile ?? 'grass')
      : tile.type;
    if (base === 'water' || base === 'waterfall') return 'swamp';
    if (base === 'swamp') return 'swamp';
    if (base === 'snow' || base === 'ice') return 'snow';
    if (base === 'ruins_floor') return 'ruins';
    if (base === 'mossy_stone' || base === 'cobblestone' || base === 'stone' || base === 'wooden_path') return 'stone';
    if (base === 'dirt' || base === 'sand' || base === 'wood' || base === 'wood_floor' || base === 'farmland' || base === 'ash') return 'dirt';
    if (base === 'dark_grass' || base === 'tall_grass') return 'forest_floor';
    return 'grass';
  }

  private createSeamGradientCanvasTexture(kind: string, variant: number): THREE.CanvasTexture {
    const W = 8;
    const H = 80;
    const canvas = document.createElement('canvas');
    canvas.width = W;
    canvas.height = H;
    const ctx = canvas.getContext('2d')!;
    const PAL: Record<string, [[number, number, number], [number, number, number]]> = {
      grass: [
        [82, 148, 88],
        [32, 58, 38],
      ],
      forest_floor: [
        [54, 104, 62],
        [24, 44, 30],
      ],
      dirt: [
        [124, 96, 70],
        [56, 42, 30],
      ],
      stone: [
        [102, 104, 108],
        [46, 48, 52],
      ],
      swamp: [
        [62, 102, 84],
        [28, 52, 44],
      ],
      ruins: [
        [92, 88, 108],
        [40, 38, 52],
      ],
      snow: [
        [220, 228, 236],
        [148, 162, 176],
      ],
    };
    const pair = PAL[kind] ?? PAL.grass;
    const top = pair[0];
    const bot = pair[1];
    const vr = variant * 19.1;
    const clamp = (n: number) => Math.max(0, Math.min(255, Math.round(n)));
    for (let y = 0; y < H; y++) {
      const u = y / (H - 1);
      // Ease-in curve so the bottom half darkens faster, reinforcing a shadow drop
      const ue = u * u;
      const n =
        Math.sin(y * 0.55 + vr) * 7 +
        Math.sin(y * 1.4 + vr * 1.7) * 5 +
        (tileHash(variant, y, 2) - 0.5) * 12;
      const r = top[0] * (1 - ue) + bot[0] * ue + n;
      const g = top[1] * (1 - ue) + bot[1] * ue + n * 0.92;
      const b = top[2] * (1 - ue) + bot[2] * ue + n * 0.88;
      ctx.fillStyle = `rgb(${clamp(r)},${clamp(g)},${clamp(b)})`;
      ctx.fillRect(0, y, W, 1);
    }
    // Dark seam rows scattered through the gradient for rock-strata feel
    for (let s = 0; s < 8; s++) {
      const yy = Math.floor(tileHash(variant, s, 11) * H);
      ctx.fillStyle = `rgba(0,0,0,${0.10 + tileHash(s, variant, 5) * 0.15})`;
      ctx.fillRect(0, yy, W, 1);
    }
    // Extra hard shadow at the very bottom edge (base of the drop)
    ctx.fillStyle = 'rgba(0,0,0,0.45)';
    ctx.fillRect(0, H - 2, W, 2);
    const tex = new THREE.CanvasTexture(canvas);
    tex.magFilter = THREE.NearestFilter;
    tex.minFilter = THREE.NearestFilter;
    tex.wrapS = THREE.ClampToEdgeWrapping;
    tex.wrapT = THREE.ClampToEdgeWrapping;
    tex.needsUpdate = true;
    return tex;
  }

  private getSeamFillMaterial(kind: string, variant: number): THREE.MeshBasicMaterial {
    const key = `${kind}_v${variant}`;
    let mat = this.seamFillMaterialByKey.get(key);
    if (!mat) {
      let tex = this.seamFillTextureByKey.get(key);
      if (!tex) {
        tex = this.createSeamGradientCanvasTexture(kind, variant);
        this.seamFillTextureByKey.set(key, tex);
      }
      mat = new THREE.MeshBasicMaterial({
        map: tex,
        depthWrite: true,
        depthTest: true,
      });
      this.seamFillMaterialByKey.set(key, mat);
    }
    return mat;
  }

  private appendTerrainSeamFillers(parent: THREE.Group, tile: Tile, tileX: number, tileY: number): void {
    if (HEIGHT_TILE_TYPES.has(tile.type)) return;
    const me = tile.elevation ?? 0;
    const kind = this.seamTerrainKind(tile, tileX, tileY);

    const addSouth = () => {
      if (tileY >= this.map.height - 1) return;
      const nb = this.map.tiles[tileY + 1]?.[tileX];
      if (!nb || HEIGHT_TILE_TYPES.has(nb.type)) return;
      const ne = nb.elevation ?? 0;
      if (ne <= me) return;
      const gap = (ne - me) * World.ELEVATION_Y_OFFSET;
      if (gap < 0.02) return;
      const variant = Math.floor(tileHash(tileX, tileY, 201) * 6);
      const mesh = new THREE.Mesh(this.elevationFillerGeometry, this.getSeamFillMaterial(kind, variant));
      this.setRenderRole(mesh, 'ground');
      mesh.scale.set(1, gap, 1);
      mesh.position.set(0, this.tileSize * 0.5 + gap * 0.5, 0.04);
      mesh.frustumCulled = true;
      mesh.matrixAutoUpdate = false;
      mesh.updateMatrix();
      parent.add(mesh);
    };

    const addEast = () => {
      if (tileX >= this.map.width - 1) return;
      const nb = this.map.tiles[tileY]?.[tileX + 1];
      if (!nb || HEIGHT_TILE_TYPES.has(nb.type)) return;
      const ne = nb.elevation ?? 0;
      if (ne <= me) return;
      const gap = (ne - me) * World.ELEVATION_Y_OFFSET;
      if (gap < 0.02) return;
      const variant = Math.floor(tileHash(tileX, tileY, 307) * 6);
      const mesh = new THREE.Mesh(this.elevationFillerGeometry, this.getSeamFillMaterial(kind, variant));
      this.setRenderRole(mesh, 'ground');
      mesh.scale.set(gap, 1, 1);
      mesh.position.set(this.tileSize * 0.5 + gap * 0.5, 0, 0.04);
      mesh.frustumCulled = true;
      mesh.matrixAutoUpdate = false;
      mesh.updateMatrix();
      parent.add(mesh);
    };

    addSouth();
    addEast();
  }

  private createTileObject(tile: Tile, tileX?: number, tileY?: number): THREE.Object3D | null {
    if (HEIGHT_TILE_TYPES.has(tile.type)) {
      return this.createHeightTileObject(tile, tileX, tileY);
    }

    const isOverlay = TILE_METADATA[tile.type]?.isOverlay;

    if (!isOverlay) {
      const texture = this.assetManager.getTexture(tile.type);
      if (!texture) return null;
      
      if (tileX !== undefined && tileY !== undefined && tile.walkable) {
        const shadow = this.createElevationShadow(tileX, tileY, tile);
        const decal = this.createDetailDecal(tileX, tileY, tile.type);
        if (shadow || decal) {
          const group = this.overlayPool.pop() ?? new THREE.Group();
          group.clear();
          group.matrixAutoUpdate = false;
          group.userData = {
            tileType: tile.type,
            sortAnchorY: null,
          };
          const baseMesh = this.createPlaneMesh(texture, -0.5, `base_${tile.type}`);
          baseMesh.updateMatrix();
          group.add(baseMesh);
          this.appendTerrainSeamFillers(group, tile, tileX, tileY);
          if (shadow instanceof THREE.Group) {
            for (const child of shadow.children) {
              group.add(child);
            }
            shadow.clear();
            this.overlayPool.push(shadow);
          } else if (shadow) {
            shadow.updateMatrix();
            group.add(shadow);
          }
          if (decal) {
            decal.updateMatrix();
            group.add(decal);
          }
          return group;
        }
      }

      if (tileX !== undefined && tileY !== undefined) {
        const group = this.overlayPool.pop() ?? new THREE.Group();
        group.clear();
        group.matrixAutoUpdate = false;
        group.userData = { tileType: tile.type, sortAnchorY: null };
        const baseMesh = this.createPlaneMesh(texture, -0.5, `base_${tile.type}`);
        baseMesh.updateMatrix();
        group.add(baseMesh);
        this.appendTerrainSeamFillers(group, tile, tileX, tileY);
        return group;
      }

      return this.createPlaneMesh(texture, -0.5, `base_${tile.type}`);
    }

    const overlayTexture = this.assetManager.getTexture(tile.type);
    
    // Determine base tile: check surrounding terrain for context, fall back to default
    const baseType = tileX !== undefined && tileY !== undefined
      ? this.resolveBaseTileType(tileX, tileY, TILE_METADATA[tile.type]?.baseTile ?? 'grass')
      : (TILE_METADATA[tile.type]?.baseTile ?? 'grass');
    
    const baseTexture = this.assetManager.getTexture(baseType);
    if (!overlayTexture || !baseTexture) return null;

    const group = this.overlayPool.pop() ?? new THREE.Group();
    group.clear();
    group.matrixAutoUpdate = false;
    const baseScale = TILE_METADATA[tile.type]?.scale ?? 1.0;
    const isOverworldMap = this.map.width >= 80 || this.map.height >= 80;
    const structureScaleBoost = isOverworldMap && OVERWORLD_STRUCTURE_TILE_TYPES.has(tile.type)
      ? OVERWORLD_STRUCTURE_SCALE_MULTIPLIER
      : 1;
    const metadata = TILE_METADATA[tile.type];
    const scale = baseScale * structureScaleBoost;
    const sortTrim = TILE_METADATA[tile.type]?.sortTrim ?? 0.16;
    const yOffset = metadata?.yOffset ?? ((scale - 1) * this.tileSize * 0.3);
    const sortAnchorY = ((scale - 1) * this.tileSize * 0.3) - (scale * 0.5) + sortTrim;
    const renderOrderBias =
      tile.type === 'house_entry' ||
      tile.type === 'house_blue_entry' ||
      tile.type === 'house_green_entry' ||
      tile.type === 'house_thatch_entry' ||
      tile.type === 'cottage_house' ||
      tile.type === 'cottage_house_entry' ||
      tile.type === 'cottage_house_forest' ||
      tile.type === 'cottage_house_forest_ruined'
        ? 1500
        : tile.type === 'door' || tile.type === 'door_interior' || tile.type === 'door_iron'
          ? 1300
          : tile.type === 'chest' || tile.type === 'chest_opened'
            ? 900
            : tile.type === 'windmill'
              ? 850
              : 0;

    group.userData = {
      tileType: tile.type,
      sortAnchorY,
      renderOrderBias,
    };

    const baseMesh = this.createPlaneMesh(baseTexture, -0.5, `base_${baseType}`);
    const overlayZ = tile.type === 'windmill' ? 0.22 : 0.1;
    const overlayMesh = this.createPlaneMesh(overlayTexture, overlayZ, `overlay_${tile.type}`);
    this.setRenderRole(baseMesh, 'ground');
    this.setRenderRole(overlayMesh, 'overlay');

    if (scale !== 1.0) {
      overlayMesh.scale.set(scale, scale, 1);
      overlayMesh.position.y = yOffset;
    }
    baseMesh.updateMatrix();
    overlayMesh.updateMatrix();

    group.add(baseMesh, overlayMesh);
    if (tileX !== undefined && tileY !== undefined) {
      this.appendTerrainSeamFillers(group, tile, tileX, tileY);
    }
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

  private disposeSouthCoastBackdrop() {
    if (this.southCoastBackdrop) {
      this.scene.remove(this.southCoastBackdrop);
      this.southCoastBackdrop.clear();
      this.southCoastBackdrop = null;
    }
    for (const d of this.southCoastBackdropDisposables) {
      d.geometry.dispose();
      d.material.dispose();
      d.texture?.dispose();
    }
    this.southCoastBackdropDisposables = [];
  }

  /**
   * Fills the view south of the map with deep ocean so the camera does not show empty
   * void past the water tiles. The cliff drama is provided by the COASTAL_SOUTH_ROWS tile
   * rows stamped by the map generator; the backdrop just continues the ocean indefinitely.
   */
  private rebuildSouthCoastBackdrop() {
    this.disposeSouthCoastBackdrop();
    if (!this.map.coastalSouthBackdrop) return;

    const w = this.map.width;
    const h = this.map.height;
    const ts = this.tileSize;
    const worldOffsetY = -h / 2;
    // South = low y = low world Y. The backdrop fills the void below row 0 (the southernmost water row).
    const southEdgeY = worldOffsetY - ts * 0.5; // bottom edge of row 0

    const group = new THREE.Group();
    group.name = 'southCoastBackdrop';

    // Deep-ocean canvas: subtle depth gradient, same hue family as water tile (0x1E88E5)
    // but darker/deeper so it reads as ocean depth rather than more flat terrain.
    const cw = 4;
    const ch = 64;
    const c = document.createElement('canvas');
    c.width = cw; c.height = ch;
    const ctx = c.getContext('2d')!;
    for (let py = 0; py < ch; py++) {
      const t = py / (ch - 1);
      const r = Math.round(18 + t * 10);
      const g = Math.round(90 + t * 20 + (py % 6 < 1 ? 8 : 0));
      const b = Math.round(155 + t * 30);
      ctx.fillStyle = `rgb(${r},${g},${b})`;
      ctx.fillRect(0, py, cw, 1);
    }
    const tex = new THREE.CanvasTexture(c);
    tex.magFilter = THREE.NearestFilter;
    tex.minFilter = THREE.NearestFilter;
    tex.wrapS = THREE.ClampToEdgeWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.colorSpace = THREE.SRGBColorSpace;

    // Wide, tall plane — enough to fill any camera view below the tile grid.
    const planeW = w * ts + 20;
    const planeH = 32;
    const geom = new THREE.PlaneGeometry(planeW, planeH);
    const mat = new THREE.MeshBasicMaterial({
      map: tex,
      depthWrite: false,
      depthTest: false,
    });
    const mesh = new THREE.Mesh(geom, mat);
    mesh.position.set(0, southEdgeY - planeH * 0.5, -0.15);
    mesh.renderOrder = -4000;
    group.add(mesh);
    this.southCoastBackdropDisposables.push({ geometry: geom, material: mat, texture: tex });

    this.scene.add(group);
    this.southCoastBackdrop = group;
  }

  updateChunks(playerWorldX: number, playerWorldY: number) {
    const centerTileX = Math.floor(playerWorldX + this.map.width / 2);
    const centerTileY = Math.floor(playerWorldY + this.map.height / 2);

    const dx = centerTileX - this.lastChunkCenter.x;
    const dy = centerTileY - this.lastChunkCenter.y;
    
    const needsFullUpdate = Math.abs(dx) >= this.CHUNK_UPDATE_THRESHOLD || Math.abs(dy) >= this.CHUNK_UPDATE_THRESHOLD;

    // Process pending tiles from previous frames (batched loading)
    if (this.pendingTiles.length > 0) {
      const batchSize = this.isInitialLoad ? INITIAL_LOAD_TILES_PER_FRAME : MAX_TILES_PER_FRAME;
      const batch = this.pendingTiles.splice(0, batchSize);

      for (const { x, y, key } of batch) {
        if (this.activeMeshes.has(key)) continue;
        const tile = this.map.tiles[y]?.[x];
        if (!tile || tile.hidden) continue;

        const object = this.createTileObject(tile, x, y);
        if (!object) continue;
        this.attachTileObject(x, y, object);
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
      const kx = typeof object.userData?.tileX === 'number' ? object.userData.tileX : NaN;
      const ky = typeof object.userData?.tileY === 'number' ? object.userData.tileY : NaN;
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
        const key = this.tileKey(x, y);
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
    const immediateBatch = this.isInitialLoad ? INITIAL_LOAD_TILES_PER_FRAME : MAX_TILES_PER_FRAME;
    const batch = this.pendingTiles.splice(0, immediateBatch);

    for (const { x, y, key } of batch) {
      if (this.activeMeshes.has(key)) continue;
      const tile = this.map.tiles[y]?.[x];
      if (!tile || tile.hidden) continue;

      const object = this.createTileObject(tile, x, y);
      if (!object) continue;
      this.attachTileObject(x, y, object);
    }

    if (this.pendingTiles.length === 0) this.isInitialLoad = false;
  }

  rebuildChunks() {
    this.mapRevision += 1;
    this.interactableCache = null;
    this.disposeSouthCoastBackdrop();
    for (const [, object] of this.activeMeshes) {
      this.scene.remove(object);
      this.recycleObject(object);
    }
    this.activeMeshes.clear();
    this.pendingTiles = [];
    this.lastChunkCenter = { x: -9999, y: -9999 };
    this.lastMoveDir = { x: 0, y: 0 };
    this.isInitialLoad = true;
    this.rebuildSouthCoastBackdrop();
  }

  /**
   * Rebuild Three.js tile meshes only inside a map-tile rectangle.
   * Prefer this over {@link rebuildChunks} for small edits: rebuildChunks tears down the
   * south coast backdrop (deep blue) and all tiles, which produced a visible blue edge flash
   * on chest opens / pickups when the GPU recomposited the frame.
   */
  refreshMapTileRegion(minTileX: number, minTileY: number, maxTileX: number, maxTileY: number): void {
    this.refreshTileRegion(minTileX, minTileY, maxTileX, maxTileY);
  }

  getTile(x: number, y: number): Tile | null {
    const tileX = Math.floor(x + this.map.width / 2);
    const tileY = Math.floor(y + this.map.height / 2);

    if (tileX < 0 || tileX >= this.map.width || tileY < 0 || tileY >= this.map.height) {
      return null;
    }

    return this.map.tiles[tileY][tileX];
  }

  getElevationAt(x: number, y: number): number {
    return this.getTile(x, y)?.elevation ?? 0;
  }

  getVisualY(x: number, y: number): number {
    return y + this.getElevationAt(x, y) * World.ELEVATION_Y_OFFSET;
  }

  private isTileWalkable(tile: Tile | null): boolean {
    if (!tile) return false;
    if (tile.transition) return true;

    const metadata = TILE_METADATA[tile.type];
    if (metadata?.isOverlay) {
      if (NON_BLOCKING_OVERLAYS.has(tile.type)) return true;
      return tile.walkable;
    }

    return tile.walkable;
  }

  private canStepBetween(fromTile: Tile | null, toTile: Tile | null): boolean {
    if (!toTile || !this.isTileWalkable(toTile)) return false;

    const fromElevation = fromTile?.elevation ?? 0;
    const toElevation = toTile.elevation ?? 0;
    if (fromElevation === toElevation) return true;

    // Map transitions / portals must stay reachable even if elevation metadata is inconsistent.
    if (fromTile?.transition || toTile.transition) return true;

    const connectsLevels =
      fromTile?.type === 'stairs' ||
      toTile.type === 'stairs' ||
      fromTile?.type === 'ladder' ||
      toTile.type === 'ladder';
    if (connectsLevels) {
      return Math.abs(toElevation - fromElevation) <= 1;
    }

    // Block raw elevation steps (north/south stamped cliffs, elevation seams, missed buffers).
    return false;
  }

  isWalkable(x: number, y: number, r: number = 0): boolean {
    if (r === 0) {
      return this.isTileWalkable(this.getTile(x, y));
    }
    return this.isWalkable(x - r, y - r) &&
           this.isWalkable(x + r, y - r) &&
           this.isWalkable(x - r, y + r) &&
           this.isWalkable(x + r, y + r);
  }

  canMoveTo(fromX: number, fromY: number, toX: number, toY: number, r: number = 0): boolean {
    if (r === 0) {
      return this.canStepBetween(this.getTile(fromX, fromY), this.getTile(toX, toY));
    }

    return this.canMoveTo(fromX - r, fromY - r, toX - r, toY - r) &&
           this.canMoveTo(fromX + r, fromY - r, toX + r, toY - r) &&
           this.canMoveTo(fromX - r, fromY + r, toX - r, toY + r) &&
           this.canMoveTo(fromX + r, fromY + r, toX + r, toY + r);
  }

  private getBaseTileWalkability(tileType: TileType): boolean {
    // Define walkability for base tile types
    const walkableBaseTiles = new Set([
      'grass', 'dirt', 'stone', 'wood', 'sand', 'swamp', 'ice', 
      'cobblestone', 'farmland', 'ash', 'ruins_floor', 'dark_grass', 
      'mossy_stone', 'wooden_path', 'wood_floor'
    ]);
    return walkableBaseTiles.has(tileType);
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

  getInteractableNear(x: number, y: number, radius: number = INTERACTABLE_QUERY_RADIUS): InteractableHit | null {
    const centerTileX = Math.floor(x + this.map.width / 2);
    const centerTileY = Math.floor(y + this.map.height / 2);
    const cached = this.interactableCache;
    if (
      cached &&
      cached.centerTileX === centerTileX &&
      cached.centerTileY === centerTileY &&
      cached.radius === radius &&
      cached.revision === this.mapRevision
    ) {
      return cached.result;
    }
    let best: InteractableHit | null = null;
    let bestDistSq = Number.POSITIVE_INFINITY;
    /** On equal distance, prefer map transitions so doors are not “stolen” by nearer lanterns/signs. */
    let bestPriority = -1;
    const interactablePriority = (tile: Tile): number => {
      if (tile.interactionId === 'building_exit' || tile.interactionId === 'building_entrance') return 2;
      return 0;
    };

    const maxGateReach = 3;
    const span = Math.max(2, Math.ceil(radius + maxGateReach));

    for (let ty = centerTileY - span; ty <= centerTileY + span; ty++) {
      if (ty < 0 || ty >= this.map.height) continue;
      for (let tx = centerTileX - span; tx <= centerTileX + span; tx++) {
        if (tx < 0 || tx >= this.map.width) continue;
        const tile = this.map.tiles[ty][tx];
        if (!tile?.interactable || !tile.interactionId) continue;

        const tileCenterX = tx - this.map.width / 2;
        const tileCenterY = ty - this.map.height / 2;
        const dx = x - tileCenterX;
        const dy = y - tileCenterY;
        const distSq = dx * dx + dy * dy;
        const reach = Math.min(radius, this.getInteractableReach(tile));
        if (distSq > reach * reach) continue;

        const pr = interactablePriority(tile);
        if (distSq < bestDistSq || (distSq === bestDistSq && pr > bestPriority)) {
          bestDistSq = distSq;
          bestPriority = pr;
          best = {
            interactionId: tile.interactionId,
            tileType: tile.type,
            x: tileCenterX,
            y: tileCenterY,
          };
        }
      }
    }

    this.interactableCache = {
      centerTileX,
      centerTileY,
      radius,
      revision: this.mapRevision,
      result: best,
    };
    return best;
  }

  getTransitionAt(x: number, y: number): { targetMap: string; targetX: number; targetY: number } | null {
    const tile = this.getTile(x, y);
    return tile?.transition || null;
  }

  /** Like getTransitionAt but only for portal tiles (auto-warp). Doors require F-key. */
  getAutoTransitionAt(x: number, y: number): { targetMap: string; targetX: number; targetY: number } | null {
    const tile = this.getTile(x, y);
    if (tile?.type === 'portal' && tile.transition) return tile.transition;
    return null;
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

    this.refreshTileRegion(
      Math.min(blockTileX, targetTileX) - 1,
      Math.min(blockTileY, targetTileY) - 1,
      Math.max(blockTileX, targetTileX) + 1,
      Math.max(blockTileY, targetTileY) + 1,
    );
    return true;
  }

  activateSwitch(doorId: string) {
    let minX = Number.POSITIVE_INFINITY;
    let minY = Number.POSITIVE_INFINITY;
    let maxX = Number.NEGATIVE_INFINITY;
    let maxY = Number.NEGATIVE_INFINITY;
    for (let y = 0; y < this.map.height; y++) {
      for (let x = 0; x < this.map.width; x++) {
        const tile = this.map.tiles[y][x];
        if (tile.type === 'switch_door' && tile.interactionId === doorId) {
          tile.walkable = true;
          tile.type = 'stone';
          tile.activated = true;
          if (x < minX) minX = x;
          if (y < minY) minY = y;
          if (x > maxX) maxX = x;
          if (y > maxY) maxY = y;
        }
      }
    }
    if (Number.isFinite(minX) && Number.isFinite(minY) && Number.isFinite(maxX) && Number.isFinite(maxY)) {
      this.refreshTileRegion(minX - 1, minY - 1, maxX + 1, maxY + 1);
    }
  }

  private getInteractableReach(tile: Tile): number {
    // Distances are in world units (~1.0 between adjacent tile centres). Old values (≤1.0) forced the
    // player to nearly overlap the tile; these targets allow comfortable adjacency and slight diagonals.
    if (tile.interactionId === 'building_entrance' || tile.interactionId === 'building_exit') {
      return 1.55;
    }
    if (tile.type === 'door' || tile.type === 'door_interior' || tile.type === 'door_iron' || tile.type === 'portal') {
      return 1.2;
    }
    if (tile.type === 'bonfire' || tile.type === 'campfire') {
      return 1.65;
    }
    if (tile.type === 'sign' || tile.type === 'chain' || tile.type === 'shortcut_lever' || tile.type === 'lantern') {
      return 1.45;
    }
    if (tile.type === 'well' || tile.type === 'tombstone' || tile.type === 'table' || tile.type === 'stump') {
      return 1.4;
    }
    if (tile.type === 'gate') {
      return 3.0;
    }
    if (tile.type === 'fog_gate') {
      return 2.85;
    }
    if (tile.type === 'chest' || tile.type === 'chest_opened') {
      return 1.5;
    }
    if (tile.type === 'flower' || tile.type === 'mushroom' || tile.type === 'tempest_grass') {
      return 1.5;
    }
    if (tile.type === 'ranger_remains' || tile.type === 'bones_pile') {
      return 1.5;
    }
    return 1.4;
  }

  revealHiddenArea(centerX: number, centerY: number, radius: number = 3) {
    const tileX = Math.floor(centerX + this.map.width / 2);
    const tileY = Math.floor(centerY + this.map.height / 2);
    let revealedAny = false;

    for (let dy = -radius; dy <= radius; dy++) {
      for (let dx = -radius; dx <= radius; dx++) {
        const tx = tileX + dx;
        const ty = tileY + dy;
        if (tx >= 0 && tx < this.map.width && ty >= 0 && ty < this.map.height) {
          if (this.map.tiles[ty][tx].hidden) {
            this.map.tiles[ty][tx].hidden = false;
            revealedAny = true;
          }
        }
      }
    }
    if (revealedAny) {
      this.refreshTileRegion(tileX - radius - 1, tileY - radius - 1, tileX + radius + 1, tileY + radius + 1);
    }
  }

  loadMap(map: WorldMap) {
    this.map = map;
    this.mapRevision += 1;
    this.interactableCache = null;
    this.rebuildChunks();
  }

  getCurrentMap(): WorldMap {
    return this.map;
  }

  dispose() {
    this.disposeSouthCoastBackdrop();
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
    for (const [, m] of this.seamFillMaterialByKey) {
      m.dispose();
    }
    this.seamFillMaterialByKey.clear();
    for (const [, t] of this.seamFillTextureByKey) {
      t.dispose();
    }
    this.seamFillTextureByKey.clear();
    this.sharedTileGeometry.dispose();
    this.elevationFillerGeometry.dispose();
    this.detailGeometry.dispose();
  }
}
