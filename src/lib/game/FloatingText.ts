import * as THREE from 'three';

const ATLAS_W = 2048;
const ATLAS_H = 2016; // 42 rows × 48px — closest multiple to 2048
const CELL_W = 128;
const CELL_H = 48;
const COLS = Math.floor(ATLAS_W / CELL_W); // 16
const ROWS = Math.floor(ATLAS_H / CELL_H); // 42
const MAX_CELLS = COLS * ROWS;              // 672

const VERT = `
  varying vec2 vUv;
  uniform vec4 uvRect;
  void main() {
    vUv = vec2(uvRect.x + uv.x * uvRect.z, uvRect.y + uv.y * uvRect.w);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const FRAG = `
  varying vec2 vUv;
  uniform sampler2D atlasMap;
  uniform float opacity;
  void main() {
    vec4 col = texture2D(atlasMap, vUv);
    gl_FragColor = vec4(col.rgb, col.a * opacity);
  }
`;

interface FloatingTextEntry {
  mesh: THREE.Mesh;
  lifetime: number;
  maxLifetime: number;
  velocity: { x: number; y: number };
  active: boolean;
}

export class FloatingTextSystem {
  private entries: FloatingTextEntry[] = [];
  private scene: THREE.Scene;
  private readonly POOL_SIZE = 20;
  private readonly sharedGeometry = new THREE.PlaneGeometry(1.2, 0.45);

  private atlasCanvas!: HTMLCanvasElement;
  private atlasCtx!: CanvasRenderingContext2D;
  private atlasTexture!: THREE.CanvasTexture;
  private glyphMap = new Map<string, number>(); // cacheKey -> cell index
  private nextCell = 0;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.initAtlas();
    this.preRenderCommonGlyphs();
    this.initPool();
  }

  private initAtlas() {
    this.atlasCanvas = document.createElement('canvas');
    this.atlasCanvas.width = ATLAS_W;
    this.atlasCanvas.height = ATLAS_H;
    this.atlasCtx = this.atlasCanvas.getContext('2d')!;
    this.atlasTexture = new THREE.CanvasTexture(this.atlasCanvas);
    this.atlasTexture.magFilter = THREE.LinearFilter;
    this.atlasTexture.minFilter = THREE.LinearFilter;
    this.atlasTexture.needsUpdate = true;
  }

  private renderToCell(cellIndex: number, text: string, color: string, size: number) {
    const col = cellIndex % COLS;
    const row = Math.floor(cellIndex / COLS);
    const px = col * CELL_W;
    const py = row * CELL_H;
    this.atlasCtx.clearRect(px, py, CELL_W, CELL_H);
    this.atlasCtx.font = `bold ${size}px monospace`;
    this.atlasCtx.textAlign = 'center';
    this.atlasCtx.textBaseline = 'middle';
    this.atlasCtx.fillStyle = '#000000';
    this.atlasCtx.fillText(text, px + CELL_W / 2 + 1, py + CELL_H / 2 + 1);
    this.atlasCtx.fillStyle = color;
    this.atlasCtx.fillText(text, px + CELL_W / 2, py + CELL_H / 2);
  }

  private cacheKey(text: string, color: string, size: number): string {
    return `${text}|${color}|${size}`;
  }

  private preRenderCommonGlyphs() {
    // Pre-render damage numbers 0-499 at the two most common damage display styles.
    for (let n = 0; n <= 499; n++) {
      const idx = this.nextCell++;
      this.renderToCell(idx, String(n), '#FF4444', 22);
      this.glyphMap.set(this.cacheKey(String(n), '#FF4444', 22), idx);
    }
    // Common labels — parries are intentionally NOT pre-rendered: parry
    // feedback is purely immersive (camera kick, freeze-frame, sparks).
    const labels: Array<[string, string, number]> = [
      ['STAGGER!', '#88AAFF', 20],
      ['BACKSTAB!', '#FFD700', 24],
      ['ENRAGED!', '#CC44FF', 24],
      ['LAST BREATH!', '#FF5252', 28],
      ['HOLLOW ECLIPSE', '#44FFEE', 24],
    ];
    for (const [text, color, size] of labels) {
      const idx = this.nextCell++;
      this.renderToCell(idx, text, color, size);
      this.glyphMap.set(this.cacheKey(text, color, size), idx);
    }
    this.atlasTexture.needsUpdate = true;
  }

  private getOrCreateGlyph(text: string, color: string, size: number): number {
    const key = this.cacheKey(text, color, size);
    const cached = this.glyphMap.get(key);
    if (cached !== undefined) return cached;
    if (this.nextCell >= MAX_CELLS) return 0;
    const idx = this.nextCell++;
    this.renderToCell(idx, text, color, size);
    this.glyphMap.set(key, idx);
    this.atlasTexture.needsUpdate = true;
    return idx;
  }

  private cellUvRect(cellIndex: number): [number, number, number, number] {
    const col = cellIndex % COLS;
    const row = Math.floor(cellIndex / COLS);
    const u1 = (col * CELL_W) / ATLAS_W;
    // Flip Y: canvas row 0 is at top; WebGL UV 0 is at bottom.
    const v1 = 1 - ((row + 1) * CELL_H) / ATLAS_H;
    return [u1, v1, CELL_W / ATLAS_W, CELL_H / ATLAS_H];
  }

  private initPool() {
    const [u1, v1, uw, vh] = this.cellUvRect(0);
    for (let i = 0; i < this.POOL_SIZE; i++) {
      const mat = new THREE.ShaderMaterial({
        uniforms: {
          atlasMap: { value: this.atlasTexture },
          uvRect: { value: new THREE.Vector4(u1, v1, uw, vh) },
          opacity: { value: 1.0 },
        },
        vertexShader: VERT,
        fragmentShader: FRAG,
        transparent: true,
        depthWrite: false,
      });
      const mesh = new THREE.Mesh(this.sharedGeometry, mat);
      mesh.visible = false;
      mesh.frustumCulled = false;
      this.scene.add(mesh);
      this.entries.push({ mesh, lifetime: 0, maxLifetime: 1, velocity: { x: 0, y: 0 }, active: false });
    }
  }

  spawn(x: number, y: number, text: string, color: string = '#FF4444', size: number = 24) {
    let entry: FloatingTextEntry | null = null;
    for (const e of this.entries) {
      if (!e.active) { entry = e; break; }
    }
    if (!entry) return;

    const cellIdx = this.getOrCreateGlyph(text, color, size);
    const [u1, v1, uw, vh] = this.cellUvRect(cellIdx);
    const mat = entry.mesh.material as THREE.ShaderMaterial;
    (mat.uniforms.uvRect.value as THREE.Vector4).set(u1, v1, uw, vh);
    mat.uniforms.opacity.value = 1.0;

    entry.active = true;
    entry.lifetime = 0;
    entry.maxLifetime = 0.9;
    entry.velocity.x = (Math.random() - 0.5) * 0.8;
    entry.velocity.y = 1.5 + Math.random() * 0.5;
    entry.mesh.position.set(x, y + 0.5, 1);
    entry.mesh.visible = true;
  }

  spawnDamage(x: number, y: number, damage: number, critical: boolean = false) {
    const color = critical ? '#FFD700' : '#FF4444';
    const text = critical ? `${damage}!` : `${damage}`;
    const size = critical ? 30 : 22;
    this.spawn(x, y, text, color, size);
  }

  spawnHeal(x: number, y: number, amount: number) {
    this.spawn(x, y, `+${amount}`, '#44FF44', 22);
  }

  spawnGold(x: number, y: number, amount: number) {
    this.spawn(x, y, `+${amount}g`, '#FFD700', 20);
  }

  update(deltaTime: number) {
    for (const e of this.entries) {
      if (!e.active) continue;

      e.lifetime += deltaTime;
      e.mesh.position.x += e.velocity.x * deltaTime;
      e.mesh.position.y += e.velocity.y * deltaTime;
      e.velocity.y -= 3 * deltaTime;

      const mat = e.mesh.material as THREE.ShaderMaterial;
      const t = e.lifetime / e.maxLifetime;
      mat.uniforms.opacity.value = t > 0.6 ? 1 - (t - 0.6) / 0.4 : 1;

      const scale = t < 0.15 ? 0.5 + (t / 0.15) * 0.7 : 1.2 - t * 0.3;
      e.mesh.scale.set(scale, scale, 1);

      if (e.lifetime >= e.maxLifetime) {
        e.active = false;
        e.mesh.visible = false;
      }
    }
  }

  cleanup() {
    for (const e of this.entries) {
      this.scene.remove(e.mesh);
      (e.mesh.material as THREE.ShaderMaterial).dispose();
    }
    this.sharedGeometry.dispose();
    this.atlasTexture.dispose();
    this.entries = [];
  }
}
