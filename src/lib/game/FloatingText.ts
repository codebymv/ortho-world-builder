import * as THREE from 'three';

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

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.initPool();
  }

  private initPool() {
    for (let i = 0; i < this.POOL_SIZE; i++) {
      const canvas = document.createElement('canvas');
      canvas.width = 128;
      canvas.height = 48;
      const tex = new THREE.CanvasTexture(canvas);
      tex.magFilter = THREE.NearestFilter;
      tex.minFilter = THREE.NearestFilter;

      const mat = new THREE.MeshBasicMaterial({
        map: tex, transparent: true, opacity: 1, depthWrite: false,
      });
      const mesh = new THREE.Mesh(this.sharedGeometry, mat);
      mesh.visible = false;
      mesh.frustumCulled = false;
      this.scene.add(mesh);

      this.entries.push({
        mesh, lifetime: 0, maxLifetime: 1, velocity: { x: 0, y: 0 }, active: false,
      });
    }
  }

  spawn(x: number, y: number, text: string, color: string = '#FF4444', size: number = 24) {
    let entry: FloatingTextEntry | null = null;
    for (const e of this.entries) {
      if (!e.active) { entry = e; break; }
    }
    if (!entry) return;

    // Render text to canvas
    const mat = entry.mesh.material as THREE.MeshBasicMaterial;
    const tex = mat.map as THREE.CanvasTexture;
    const canvas = tex.image as HTMLCanvasElement;
    const ctx = canvas.getContext('2d')!;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    ctx.font = `bold ${size}px monospace`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // Shadow
    ctx.fillStyle = '#000000';
    ctx.fillText(text, canvas.width / 2 + 2, canvas.height / 2 + 2);
    // Main
    ctx.fillStyle = color;
    ctx.fillText(text, canvas.width / 2, canvas.height / 2);

    tex.needsUpdate = true;

    entry.active = true;
    entry.lifetime = 0;
    entry.maxLifetime = 0.9;
    entry.velocity.x = (Math.random() - 0.5) * 0.8;
    entry.velocity.y = 1.5 + Math.random() * 0.5;
    entry.mesh.position.set(x, y + 0.5, 1);
    entry.mesh.visible = true;
    mat.opacity = 1;
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

  update(deltaTime: number) {
    for (const e of this.entries) {
      if (!e.active) continue;

      e.lifetime += deltaTime;
      e.mesh.position.x += e.velocity.x * deltaTime;
      e.mesh.position.y += e.velocity.y * deltaTime;
      e.velocity.y -= 3 * deltaTime; // gravity

      const mat = e.mesh.material as THREE.MeshBasicMaterial;
      const t = e.lifetime / e.maxLifetime;
      mat.opacity = t > 0.6 ? 1 - (t - 0.6) / 0.4 : 1;

      // Scale bounce
      const scale = t < 0.15 ? 0.5 + t / 0.15 * 0.7 : 1.2 - t * 0.3;
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
      e.mesh.geometry.dispose();
      (e.mesh.material as THREE.Material).dispose();
    }
    this.entries = [];
  }
}
