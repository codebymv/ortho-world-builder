import * as THREE from 'three';

/**
 * Batches flat base-ground tile quads into per-texture InstancedMeshes so the terrain floor
 * costs one draw call per distinct ground texture instead of one per tile.
 *
 * Scope: ONLY non-overlay, flat ground quads (renderOrder 0, no y-sorting). Anything that needs
 * per-tile depth sorting — overlays, sprites, decals, shadows, seam fillers, height/cliff tiles —
 * stays as individual meshes, because an InstancedMesh draws every instance at a single
 * renderOrder and would break painter's-order overlap with the player.
 *
 * Occupancy is managed with a per-material free-slot list. Removed instances are collapsed to a
 * zero-scale matrix (degenerate, renders nothing) and their slot is recycled. `count` tracks the
 * high-water mark so the GPU only processes slots that have ever been allocated.
 */

const DEFAULT_CAPACITY = 4096;

interface InstanceEntry {
  mesh: THREE.InstancedMesh;
  free: number[];
  highWater: number;
  capacity: number;
}

export class GroundInstanceLayer {
  private readonly scene: THREE.Scene;
  private readonly entries = new Map<string, InstanceEntry>();
  private readonly tileToSlot = new Map<number, { matKey: string; slot: number }>();
  private readonly _matrix = new THREE.Matrix4();
  private readonly _zero = new THREE.Matrix4().makeScale(0, 0, 0);

  constructor(scene: THREE.Scene) {
    this.scene = scene;
  }

  private getEntry(matKey: string, geometry: THREE.BufferGeometry, material: THREE.Material): InstanceEntry {
    let entry = this.entries.get(matKey);
    if (!entry) {
      const mesh = new THREE.InstancedMesh(geometry, material, DEFAULT_CAPACITY);
      mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
      mesh.frustumCulled = false; // instances span the whole loaded area; always near the camera
      mesh.matrixAutoUpdate = false;
      mesh.renderOrder = 0;
      mesh.count = 0; // grows to the high-water mark as slots are allocated
      this.scene.add(mesh);
      entry = { mesh, free: [], highWater: 0, capacity: DEFAULT_CAPACITY };
      this.entries.set(matKey, entry);
    }
    return entry;
  }

  /**
   * Place (or move) the ground quad for `tileKey` at world position (x,y,z) in the InstancedMesh
   * for `matKey`. Returns false if that material's capacity is exhausted, so the caller can fall
   * back to an individual mesh.
   */
  set(
    tileKey: number,
    matKey: string,
    geometry: THREE.BufferGeometry,
    material: THREE.Material,
    x: number,
    y: number,
    z: number,
  ): boolean {
    const entry = this.getEntry(matKey, geometry, material);

    const existing = this.tileToSlot.get(tileKey);
    let slot: number;
    if (existing && existing.matKey === matKey) {
      slot = existing.slot;
    } else {
      if (existing) this.remove(tileKey); // material changed — free the old slot first
      slot = entry.free.pop() ?? (entry.highWater < entry.capacity ? entry.highWater++ : -1);
      if (slot < 0) return false; // capacity overflow — caller falls back to an individual mesh
      if (entry.highWater > entry.mesh.count) entry.mesh.count = entry.highWater;
      this.tileToSlot.set(tileKey, { matKey, slot });
    }

    this._matrix.makeTranslation(x, y, z);
    entry.mesh.setMatrixAt(slot, this._matrix);
    entry.mesh.instanceMatrix.needsUpdate = true;
    return true;
  }

  /** Free the instance slot for `tileKey` (collapses it to zero-scale and recycles the slot). */
  remove(tileKey: number): void {
    const ref = this.tileToSlot.get(tileKey);
    if (!ref) return;
    const entry = this.entries.get(ref.matKey);
    if (entry) {
      entry.mesh.setMatrixAt(ref.slot, this._zero);
      entry.mesh.instanceMatrix.needsUpdate = true;
      entry.free.push(ref.slot);
    }
    this.tileToSlot.delete(tileKey);
  }

  has(tileKey: number): boolean {
    return this.tileToSlot.has(tileKey);
  }

  /** Drop every instance (used on full chunk rebuilds / map changes). */
  clear(): void {
    for (const entry of this.entries.values()) {
      for (let i = 0; i < entry.highWater; i++) entry.mesh.setMatrixAt(i, this._zero);
      entry.mesh.instanceMatrix.needsUpdate = true;
      entry.free.length = 0;
      entry.highWater = 0;
      entry.mesh.count = 0;
    }
    this.tileToSlot.clear();
  }

  getStats(): { materials: number; instances: number } {
    return { materials: this.entries.size, instances: this.tileToSlot.size };
  }

  dispose(): void {
    for (const entry of this.entries.values()) {
      this.scene.remove(entry.mesh);
      entry.mesh.dispose();
    }
    this.entries.clear();
    this.tileToSlot.clear();
  }
}
