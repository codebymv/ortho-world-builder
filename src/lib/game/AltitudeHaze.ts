import * as THREE from 'three';

/**
 * Full-screen "high altitude" atmosphere overlay. Same construction as CorruptionFilter:
 * a clip-space quad pinned over the scene at the highest render order, with a time-lerped
 * strength so it fades in/out as the player enters/leaves a high-mountain zone.
 *
 * Deliberately VERY subtle - a faint cool blue-white wash plus a soft edge vignette that
 * thickens toward the screen corners, faking thin air and distant haze so the surroundings
 * read as far below / far away. No blur (too costly in this ortho pipeline), no motion.
 */
const VERT = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = vec4(position.xy, 0.0, 1.0);
  }
`;

const FRAG = /* glsl */ `
  precision mediump float;
  varying vec2 vUv;
  uniform float strength;   // 0..1 overall fade
  uniform vec3  hazeColor;  // pale cool blue-white

  void main() {
    // Distance from screen center → vignette that thickens toward the edges, so the periphery
    // hazes out like a distant drop-off while the center stays clearer. Starts fairly close to
    // center (0.18) so a good portion of the screen reads as hazy, not just the corners.
    vec2 d = vUv - 0.5;
    float r = length(d) * 1.42;                  // ~0 center → ~1 corners
    float vignette = smoothstep(0.18, 1.0, r);
    // Soft flat wash everywhere + a heavier edge haze (kept gentle).
    float alpha = strength * (0.07 + vignette * 0.25);
    gl_FragColor = vec4(hazeColor, alpha);
  }
`;

export class AltitudeHaze {
  private mesh: THREE.Mesh;
  private material: THREE.ShaderMaterial;
  private scene: THREE.Scene;
  private targetStrength = 0;
  private currentStrength = 0;
  // Gentle ramp so cresting into / dropping out of the zone feels like a soft atmospheric shift.
  private static readonly LERP_RATE = 2.0;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.material = new THREE.ShaderMaterial({
      uniforms: {
        strength: { value: 0 },
        hazeColor: { value: new THREE.Color(0xCFE0EE) },
      },
      vertexShader: VERT,
      fragmentShader: FRAG,
      transparent: true,
      depthTest: false,
      depthWrite: false,
    });

    const geom = new THREE.BufferGeometry();
    geom.setAttribute('position', new THREE.Float32BufferAttribute([
      -1, -1, 0, 1, -1, 0, 1, 1, 0,
      -1, -1, 0, 1, 1, 0, -1, 1, 0,
    ], 3));
    geom.setAttribute('uv', new THREE.Float32BufferAttribute([
      0, 0, 1, 0, 1, 1,
      0, 0, 1, 1, 0, 1,
    ], 2));

    this.mesh = new THREE.Mesh(geom, this.material);
    this.mesh.frustumCulled = false;
    // Just under the corruption grade so both can stack if a zone is ever both.
    this.mesh.renderOrder = 99998;
    this.mesh.visible = false;
    scene.add(this.mesh);
  }

  setTargetStrength(value: number): void {
    this.targetStrength = Math.max(0, Math.min(1, value));
  }

  update(deltaTime: number): void {
    if (this.currentStrength !== this.targetStrength) {
      const blend = 1 - Math.exp(-AltitudeHaze.LERP_RATE * deltaTime);
      this.currentStrength += (this.targetStrength - this.currentStrength) * blend;
      if (Math.abs(this.targetStrength - this.currentStrength) < 0.001) {
        this.currentStrength = this.targetStrength;
      }
    }
    this.material.uniforms.strength.value = this.currentStrength;
    this.mesh.visible = this.currentStrength > 0.001;
  }

  cleanup(): void {
    this.scene.remove(this.mesh);
    this.material.dispose();
    (this.mesh.geometry as THREE.BufferGeometry).dispose();
  }
}
