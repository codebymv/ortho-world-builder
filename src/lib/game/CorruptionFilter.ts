import * as THREE from 'three';

/**
 * Full-screen corruption grade overlay. Sits in the main scene as a quad
 * pinned to the camera at the highest renderOrder so it composites over
 * everything after the world is drawn.
 *
 * The shader is a STATIC uniform tint — flat across the screen, no breathing,
 * no vignette, no scanline, no time-driven modulation. Identical to dropping
 * a partially-transparent violet layer in Photoshop on top of the scene.
 * Slight by design: hollow areas should feel like a different photographic
 * grade, not a special effect.
 *
 * Strength is set per-frame by the biome resolver and only ever sits at 0 or
 * 1. The class smooth-lerps the rendered value across that step (~2s) so the
 * region transition parallels the music crossfade — once the player is past
 * the threshold the tint is pinned at its static level with no fluctuation.
 *
 * Zero strength = the overlay is invisible (mesh skipped to save draw cost).
 */

const VERT = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    // Position is in clip-space [-1, 1] already (BufferGeometry plane manually
    // built that way), so we skip the projection multiply entirely.
    gl_Position = vec4(position.xy, 0.0, 1.0);
  }
`;

const FRAG = /* glsl */ `
  precision mediump float;
  varying vec2 vUv;
  uniform float strength;       // 0..1 overall mix
  uniform vec3  tintColor;      // base corruption color (violet)

  void main() {
    // === Static uniform color grade ===
    // A flat, slight photographic filter — no breathing, no throb, no
    // scanline, no time-based modulation of any kind. Strength only ramps
    // during the ~2s ENTER/EXIT crossfade and is otherwise pinned at 1.0 or
    // 0.0. Think Instagram filter intensity, not "the corruption is alive".
    // Roughly equivalent to dropping a 22% violet layer in Photoshop and
    // calling it a day.
    float alpha = 0.22 * strength;
    gl_FragColor = vec4(tintColor * alpha, alpha);
  }
`;

/**
 * Driver responsible for owning the overlay mesh and applying a smoothly-lerped
 * strength toward whatever the biome resolver requests. Designed to be created
 * once during setup and updated every frame.
 */
export class CorruptionFilter {
  private mesh: THREE.Mesh;
  private material: THREE.ShaderMaterial;
  private scene: THREE.Scene;
  private targetStrength = 0;
  private currentStrength = 0;
  // Per-second exponential lerp rate — ~2s to fully reach target. Roughly
  // matches the music crossfade pacing (equal-power, ~1.6s) so the audio and
  // visual transitions feel paired.
  private static readonly LERP_RATE = 1.6;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.material = new THREE.ShaderMaterial({
      uniforms: {
        strength:  { value: 0 },
        // Saturated violet in the same hollow-palette family as the ambient
        // particles / hollow_blight tiles. The grade reads as "this region
        // has different light", not "the corruption is alive".
        tintColor: { value: new THREE.Color(0x6B14B0) },
      },
      vertexShader: VERT,
      fragmentShader: FRAG,
      transparent: true,
      depthTest: false,
      depthWrite: false,
    });

    // Full-screen quad in clip-space coords. The vertex shader passes position
    // straight through, so this quad always fills the viewport regardless of
    // camera/world transforms.
    const geom = new THREE.BufferGeometry();
    geom.setAttribute('position', new THREE.Float32BufferAttribute([
      -1, -1, 0,
       1, -1, 0,
       1,  1, 0,
      -1, -1, 0,
       1,  1, 0,
      -1,  1, 0,
    ], 3));
    geom.setAttribute('uv', new THREE.Float32BufferAttribute([
      0, 0,
      1, 0,
      1, 1,
      0, 0,
      1, 1,
      0, 1,
    ], 2));

    this.mesh = new THREE.Mesh(geom, this.material);
    // Render last; frustumCulled off since position is fixed in clip space and
    // bounding box math doesn't apply.
    this.mesh.frustumCulled = false;
    this.mesh.renderOrder = 99999;
    this.mesh.visible = false;
    scene.add(this.mesh);
  }

  /**
   * Set the desired filter strength. Maps biome → strength typically:
   *   forest_hollow_deep → 0.90
   *   forest_hollow      → 0.45
   *   forest             → 0.00 (filter fades out)
   */
  setTargetStrength(value: number): void {
    this.targetStrength = Math.max(0, Math.min(1, value));
  }

  /**
   * Optionally swap the tint color (e.g. a different region uses red/green
   * corruption). Defaults to violet on construction.
   */
  setTintColor(hex: number): void {
    (this.material.uniforms.tintColor.value as THREE.Color).setHex(hex);
  }

  update(deltaTime: number, _currentTimeSeconds?: number): void {
    // Exponential approach — smooth ramp during the ~2s ENTER/EXIT transition,
    // pinned at target value once it settles. `_currentTimeSeconds` is kept
    // in the signature for backward compatibility with callers but isn't
    // used now that the shader is static.
    void _currentTimeSeconds;
    if (this.currentStrength !== this.targetStrength) {
      const blend = 1 - Math.exp(-CorruptionFilter.LERP_RATE * deltaTime);
      this.currentStrength += (this.targetStrength - this.currentStrength) * blend;
      if (Math.abs(this.targetStrength - this.currentStrength) < 0.001) {
        this.currentStrength = this.targetStrength;
      }
    }
    this.material.uniforms.strength.value = this.currentStrength;
    // Skip the draw entirely when fully off — saves a transparent pass on the
    // common path (every map that isn't the hollow side of the forest).
    this.mesh.visible = this.currentStrength > 0.001;
  }

  cleanup(): void {
    this.scene.remove(this.mesh);
    this.material.dispose();
    (this.mesh.geometry as THREE.BufferGeometry).dispose();
  }
}
