import * as THREE from 'three';

interface AmbientParticle {
  mesh: THREE.Mesh;
  velocity: THREE.Vector3;
  lifetime: number;
  maxLifetime: number;
  baseY: number;
  phase: number;
  type: 'firefly' | 'fog' | 'dust' | 'smoke' | 'snow' | 'ember' | 'leaf';
  active: boolean;
}

export class BiomeAmbience {
  private particles: AmbientParticle[] = [];
  private scene: THREE.Scene;
  private currentBiome: string = '';
  private spawnTimer: number = 0;
  private readonly MAX_PARTICLES = 60;

  // Shared geometry for all ambient particles (avoids per-particle allocation)
  private readonly sharedGeometry = new THREE.PlaneGeometry(1, 1);

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.initializePool();
  }

  private initializePool() {
    for (let i = 0; i < this.MAX_PARTICLES; i++) {
      const mat = new THREE.MeshBasicMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: 0,
        depthWrite: false,
      });
      const mesh = new THREE.Mesh(this.sharedGeometry, mat);
      mesh.visible = false;
      this.scene.add(mesh);

      this.particles.push({
        mesh,
        velocity: new THREE.Vector3(),
        lifetime: 0,
        maxLifetime: 1,
        baseY: 0,
        phase: 0,
        type: 'firefly',
        active: false,
      });
    }
  }

  setBiome(biome: string) {
    if (this.currentBiome === biome) return;
    this.currentBiome = biome;
    // Deactivate all particles instead of destroying
    for (const p of this.particles) {
      p.active = false;
      p.mesh.visible = false;
    }
  }

  private spawnParticle(playerX: number, playerY: number) {
    // Find inactive particle from pool
    let particle: AmbientParticle | null = null;
    for (const p of this.particles) {
      if (!p.active) {
        particle = p;
        break;
      }
    }
    if (!particle) return;

    const offsetX = (Math.random() - 0.5) * 16;
    const offsetY = (Math.random() - 0.5) * 16;
    const x = playerX + offsetX;
    const y = playerY + offsetY;

    let color = 0xFFEB3B;
    let size = 0.08;
    let lifetime = 3;
    let type: AmbientParticle['type'] = 'firefly';
    let vx = 0, vy = 0;
    let baseOpacity = 0.8;

    switch (this.currentBiome) {
      case 'forest':
        if (Math.random() < 0.3) {
          color = Math.random() > 0.5 ? 0x8BC34A : 0x795548;
          size = 0.06 + Math.random() * 0.02;
          lifetime = 5 + Math.random() * 3;
          type = 'leaf';
          vx = 0.2 + Math.random() * 0.15;
          vy = -0.08 - Math.random() * 0.04;
          baseOpacity = 0.3;
        } else {
          color = Math.random() > 0.5 ? 0xCDDC39 : 0xFFEB3B;
          size = 0.06 + Math.random() * 0.04;
          lifetime = 3 + Math.random() * 4;
          type = 'firefly';
        }
        break;
      case 'swamp':
        color = 0x90A4AE;
        size = 0.3 + Math.random() * 0.4;
        lifetime = 4 + Math.random() * 3;
        type = 'fog';
        vx = (Math.random() - 0.5) * 0.3;
        baseOpacity = 0.15;
        break;
      case 'ruins':
        color = 0xBCAAA4;
        size = 0.04 + Math.random() * 0.03;
        lifetime = 2 + Math.random() * 3;
        type = 'dust';
        vy = 0.1 + Math.random() * 0.2;
        break;
      case 'forest_hollow':
        if (Math.random() > 0.6) {
          color = 0x7E57C2;
          size = 0.25 + Math.random() * 0.3;
          lifetime = 3 + Math.random() * 3;
          type = 'fog';
          vx = (Math.random() - 0.5) * 0.2;
          baseOpacity = 0.12;
        } else {
          color = Math.random() > 0.5 ? 0xAB47BC : 0x9C27B0;
          size = 0.04 + Math.random() * 0.03;
          lifetime = 2 + Math.random() * 2;
          type = 'ember';
          vy = 0.15 + Math.random() * 0.2;
          baseOpacity = 0.6;
        }
        break;
      case 'grassland':
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

    // Reuse mesh from pool - just update properties
    particle.active = true;
    particle.lifetime = 0;
    particle.maxLifetime = lifetime;
    particle.baseY = y;
    particle.phase = Math.random() * Math.PI * 2;
    particle.type = type;
    particle.velocity.set(vx, vy, 0);

    particle.mesh.visible = true;
    particle.mesh.position.set(x, y, 0.15);
    particle.mesh.scale.set(size, size, 1);

    const mat = particle.mesh.material as THREE.MeshBasicMaterial;
    mat.color.setHex(color);
    mat.opacity = baseOpacity;
  }

  update(deltaTime: number, playerX: number, playerY: number) {
    this.spawnTimer += deltaTime;
    const spawnInterval = this.currentBiome === 'swamp' ? 0.6 : 0.3;

    if (this.spawnTimer >= spawnInterval) {
      this.spawnParticle(playerX, playerY);
      this.spawnTimer = 0;
    }

    for (const p of this.particles) {
      if (!p.active) continue;

      p.lifetime += deltaTime;

      // Movement
      p.mesh.position.x += p.velocity.x * deltaTime;
      p.mesh.position.y += p.velocity.y * deltaTime;

      // Type-specific animation
      if (p.type === 'firefly') {
        p.mesh.position.x += Math.sin(p.lifetime * 1.5 + p.phase) * 0.003;
        p.mesh.position.y += Math.cos(p.lifetime * 2 + p.phase) * 0.002;
        const mat = p.mesh.material as THREE.MeshBasicMaterial;
        mat.opacity = 0.4 + Math.sin(p.lifetime * 3 + p.phase) * 0.4;
      } else if (p.type === 'fog') {
        const scale = (0.3 + Math.sin(p.phase + p.lifetime) * 0.2) * (1 + p.lifetime * 0.1);
        p.mesh.scale.set(scale, scale, 1);
      } else if (p.type === 'leaf') {
        p.mesh.position.x += Math.sin(p.lifetime * 0.8 + p.phase) * 0.004;
        p.mesh.rotation.z += deltaTime * (0.5 + Math.sin(p.phase) * 0.3);
      }

      // Fade in/out
      const mat = p.mesh.material as THREE.MeshBasicMaterial;
      const fadeIn = Math.min(1, p.lifetime / 0.5);
      const fadeOut = Math.max(0, 1 - (p.lifetime - p.maxLifetime + 1) / 1);
      const baseFade = p.type === 'fog' ? 0.15 : 0.8;
      mat.opacity = baseFade * fadeIn * fadeOut;

      // Deactivate old/far particles (return to pool)
      const distX = p.mesh.position.x - playerX;
      const distY = p.mesh.position.y - playerY;
      const dist = distX * distX + distY * distY; // skip sqrt

      if (p.lifetime >= p.maxLifetime || dist > 400) {
        p.active = false;
        p.mesh.visible = false;
      }
    }
  }

  cleanup() {
    for (const p of this.particles) {
      this.scene.remove(p.mesh);
      (p.mesh.material as THREE.Material).dispose();
    }
    this.sharedGeometry.dispose();
    this.particles = [];
  }
}
