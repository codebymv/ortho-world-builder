import * as THREE from 'three';

/**
 * Tuning for a scattered, transient decal field (idle water ripples, grass wind gusts, …).
 * The point is a sparse, capped trickle of short-lived quads — never a constant per-tile loop —
 * so the surface gets the occasional subtle lap/rustle that wanders across the whole area.
 */
export interface TileDecalConfig {
  /** Hard cap on simultaneously visible decals. */
  maxConcurrent: number;
  /** Lifetime of a single decal in ms (fade in → hold → fade out). */
  lifeMs: number;
  /** Random gap between spawns, in ms. */
  minGapMs: number;
  maxGapMs: number;
  /** Quad edge length in world units. */
  size: number;
  /** Render order (transparent): higher draws on top of lower transparents. */
  renderOrder: number;
  /** Z height above the ground plane. */
  z: number;
  /** Opacity at the peak of the fade envelope (0..1). */
  peakOpacity: number;
  /** Scale multiplier at birth and death (gentle spread). */
  scaleFrom: number;
  scaleTo: number;
  /** Total positional drift over the decal's life, in world units. */
  driftX: number;
  driftY: number;
  /** Max random offset within the host tile, in world units. */
  jitter: number;
  /** Max random rotation, in radians. */
  rotationJitter: number;
}

interface DecalInstance {
  mesh: THREE.Mesh;
  born: number;
  baseX: number;
  baseY: number;
}

/** Returns a world-space tile centre to host the next decal, or null if none are eligible. */
export type TileCenterPicker = () => { worldX: number; worldY: number } | null;

/**
 * A pooled field of short-lived, fading quads stamped occasionally onto eligible tiles. Cost is a
 * few transparent quads per frame (no per-tile work, no GPU texture churn). Shared by the water
 * ripple and wind-gust ambience in World.
 */
export class TransientTileDecalField {
  private readonly scene: THREE.Scene;
  private readonly cfg: TileDecalConfig;
  private readonly getTexture: () => THREE.Texture | null;
  private readonly geometry: THREE.PlaneGeometry;
  private texture: THREE.Texture | null = null;
  private readonly pool: THREE.Mesh[] = [];
  private readonly active: DecalInstance[] = [];
  private nextAt = 0;

  constructor(scene: THREE.Scene, cfg: TileDecalConfig, getTexture: () => THREE.Texture | null) {
    this.scene = scene;
    this.cfg = cfg;
    this.getTexture = getTexture;
    this.geometry = new THREE.PlaneGeometry(cfg.size, cfg.size);
  }

  tick(now: number, pickTile: TileCenterPicker): void {
    const { lifeMs, peakOpacity, scaleFrom, scaleTo, driftX, driftY } = this.cfg;
    for (let i = this.active.length - 1; i >= 0; i--) {
      const d = this.active[i];
      const t = (now - d.born) / lifeMs;
      if (t >= 1) {
        this.retire(i);
        continue;
      }
      // Single soft pulse: quick fade-in (first quarter), gentle fade-out (rest).
      const env = t < 0.25 ? t / 0.25 : 1 - (t - 0.25) / 0.75;
      const mat = d.mesh.material as THREE.MeshBasicMaterial;
      mat.opacity = Math.max(0, env) * peakOpacity;
      const s = scaleFrom + (scaleTo - scaleFrom) * t;
      d.mesh.scale.set(s, s, 1);
      d.mesh.position.x = d.baseX + t * driftX;
      d.mesh.position.y = d.baseY + t * driftY;
    }

    if (now < this.nextAt) return;
    this.nextAt = now + this.cfg.minGapMs + Math.random() * (this.cfg.maxGapMs - this.cfg.minGapMs);
    if (this.active.length >= this.cfg.maxConcurrent) return;
    if (!this.ensureTexture()) return;

    const tile = pickTile();
    if (tile) this.spawn(tile.worldX, tile.worldY, now);
  }

  private ensureTexture(): boolean {
    if (!this.texture) this.texture = this.getTexture();
    return this.texture !== null;
  }

  private spawn(worldX: number, worldY: number, now: number): void {
    let mesh = this.pool.pop();
    if (!mesh) {
      const material = new THREE.MeshBasicMaterial({
        map: this.texture,
        transparent: true,
        depthWrite: false,
        opacity: 0,
      });
      mesh = new THREE.Mesh(this.geometry, material);
      mesh.renderOrder = this.cfg.renderOrder;
    }
    const { jitter, rotationJitter, scaleFrom, z } = this.cfg;
    const baseX = worldX + (Math.random() - 0.5) * jitter;
    const baseY = worldY + (Math.random() - 0.5) * jitter;
    mesh.position.set(baseX, baseY, z);
    mesh.rotation.z = (Math.random() - 0.5) * rotationJitter;
    mesh.scale.set(scaleFrom, scaleFrom, 1);
    (mesh.material as THREE.MeshBasicMaterial).opacity = 0;
    mesh.visible = true;
    this.scene.add(mesh);
    this.active.push({ mesh, born: now, baseX, baseY });
  }

  private retire(index: number): void {
    const d = this.active[index];
    this.active.splice(index, 1);
    d.mesh.visible = false;
    this.scene.remove(d.mesh);
    (d.mesh.material as THREE.MeshBasicMaterial).opacity = 0;
    this.pool.push(d.mesh);
  }

  /** Drop all live decals (e.g. when the map is rebuilt) so none linger over the new scene. */
  clear(): void {
    for (let i = this.active.length - 1; i >= 0; i--) this.retire(i);
    this.nextAt = 0;
  }

  dispose(): void {
    this.clear();
    for (const mesh of this.pool) {
      (mesh.material as THREE.Material).dispose();
    }
    this.pool.length = 0;
    this.geometry.dispose();
  }
}
