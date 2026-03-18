import * as THREE from 'three';

interface AmbientParticle {
  mesh: THREE.Mesh;
  velocity: THREE.Vector3;
  lifetime: number;
  maxLifetime: number;
  baseY: number;
  phase: number;
  type: 'firefly' | 'fog' | 'dust' | 'smoke' | 'snow' | 'ember';
}

export class BiomeAmbience {
  private particles: AmbientParticle[] = [];
  private scene: THREE.Scene;
  private currentBiome: string = '';
  private spawnTimer: number = 0;
  private readonly MAX_PARTICLES = 40;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
  }

  setBiome(biome: string) {
    if (this.currentBiome === biome) return;
    this.currentBiome = biome;
    this.clearAll();
  }

  private clearAll() {
    for (const p of this.particles) {
      this.scene.remove(p.mesh);
      p.mesh.geometry.dispose();
      (p.mesh.material as THREE.Material).dispose();
    }
    this.particles = [];
  }

  private spawnParticle(playerX: number, playerY: number) {
    if (this.particles.length >= this.MAX_PARTICLES) return;

    const offsetX = (Math.random() - 0.5) * 16;
    const offsetY = (Math.random() - 0.5) * 16;
    const x = playerX + offsetX;
    const y = playerY + offsetY;

    let color = 0xFFEB3B;
    let size = 0.08;
    let lifetime = 3;
    let type: AmbientParticle['type'] = 'firefly';
    let vx = 0, vy = 0;

    switch (this.currentBiome) {
      case 'forest':
        // Fireflies
        color = Math.random() > 0.5 ? 0xCDDC39 : 0xFFEB3B;
        size = 0.06 + Math.random() * 0.04;
        lifetime = 3 + Math.random() * 4;
        type = 'firefly';
        break;
      case 'swamp':
        // Fog wisps
        color = 0x90A4AE;
        size = 0.3 + Math.random() * 0.4;
        lifetime = 4 + Math.random() * 3;
        type = 'fog';
        vx = (Math.random() - 0.5) * 0.3;
        break;
      case 'ruins':
        // Dust motes
        color = 0xBCAAA4;
        size = 0.04 + Math.random() * 0.03;
        lifetime = 2 + Math.random() * 3;
        type = 'dust';
        vy = 0.1 + Math.random() * 0.2;
        break;
      case 'grassland':
        // Pollen / dandelion seeds
        color = 0xFFF9C4;
        size = 0.03 + Math.random() * 0.03;
        lifetime = 4 + Math.random() * 4;
        type = 'dust';
        vx = 0.1 + Math.random() * 0.15;
        vy = 0.05;
        break;
      default:
        return;
    }

    const geo = new THREE.PlaneGeometry(size, size);
    const mat = new THREE.MeshBasicMaterial({
      color,
      transparent: true,
      opacity: type === 'fog' ? 0.15 : 0.8,
      depthWrite: false,
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(x, y, 0.15);
    this.scene.add(mesh);

    this.particles.push({
      mesh,
      velocity: new THREE.Vector3(vx, vy, 0),
      lifetime: 0,
      maxLifetime: lifetime,
      baseY: y,
      phase: Math.random() * Math.PI * 2,
      type,
    });
  }

  update(deltaTime: number, playerX: number, playerY: number) {
    this.spawnTimer += deltaTime;
    const spawnInterval = this.currentBiome === 'swamp' ? 0.6 : 0.3;

    if (this.spawnTimer >= spawnInterval) {
      this.spawnParticle(playerX, playerY);
      this.spawnTimer = 0;
    }

    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.lifetime += deltaTime;

      // Movement
      p.mesh.position.x += p.velocity.x * deltaTime;
      p.mesh.position.y += p.velocity.y * deltaTime;

      // Type-specific animation
      if (p.type === 'firefly') {
        // Gentle floating + bobbing
        p.mesh.position.x += Math.sin(p.lifetime * 1.5 + p.phase) * 0.003;
        p.mesh.position.y += Math.cos(p.lifetime * 2 + p.phase) * 0.002;
        const mat = p.mesh.material as THREE.MeshBasicMaterial;
        mat.opacity = 0.4 + Math.sin(p.lifetime * 3 + p.phase) * 0.4;
      } else if (p.type === 'fog') {
        // Slow drift and expand
        const scale = 1 + p.lifetime * 0.1;
        p.mesh.scale.set(scale, scale, 1);
      }

      // Fade in/out
      const mat = p.mesh.material as THREE.MeshBasicMaterial;
      const fadeIn = Math.min(1, p.lifetime / 0.5);
      const fadeOut = Math.max(0, 1 - (p.lifetime - p.maxLifetime + 1) / 1);
      const baseFade = p.type === 'fog' ? 0.15 : 0.8;
      mat.opacity = baseFade * fadeIn * fadeOut;

      // Remove old/far particles
      const distX = p.mesh.position.x - playerX;
      const distY = p.mesh.position.y - playerY;
      const dist = Math.sqrt(distX * distX + distY * distY);

      if (p.lifetime >= p.maxLifetime || dist > 20) {
        this.scene.remove(p.mesh);
        p.mesh.geometry.dispose();
        (p.mesh.material as THREE.Material).dispose();
        this.particles.splice(i, 1);
      }
    }
  }

  cleanup() {
    this.clearAll();
  }
}
