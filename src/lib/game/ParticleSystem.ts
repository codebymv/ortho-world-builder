import * as THREE from 'three';

export interface Particle {
  mesh: THREE.Mesh;
  velocity: THREE.Vector3;
  lifetime: number;
  maxLifetime: number;
  active: boolean;
}

export class ParticleSystem {
  private particles: Particle[] = [];
  private scene: THREE.Scene;
  private poolSize: number = 50;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.initializePool();
  }

  private initializePool() {
    for (let i = 0; i < this.poolSize; i++) {
      const geometry = new THREE.PlaneGeometry(0.1, 0.1);
      const material = new THREE.MeshBasicMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: 1,
      });
      const mesh = new THREE.Mesh(geometry, material);
      mesh.visible = false;
      this.scene.add(mesh);

      this.particles.push({
        mesh,
        velocity: new THREE.Vector3(),
        lifetime: 0,
        maxLifetime: 1,
        active: false,
      });
    }
  }

  emit(
    position: THREE.Vector3,
    count: number,
    color: number,
    lifetime: number = 1,
    speed: number = 2,
    spread: number = 1
  ) {
    let emitted = 0;
    for (const particle of this.particles) {
      if (!particle.active && emitted < count) {
        particle.active = true;
        particle.lifetime = 0;
        particle.maxLifetime = lifetime;
        particle.mesh.position.copy(position);
        particle.mesh.visible = true;

        // Random velocity
        particle.velocity.set(
          (Math.random() - 0.5) * spread,
          (Math.random() - 0.5) * spread,
          Math.random() * 0.5
        ).multiplyScalar(speed);

        const material = particle.mesh.material as THREE.MeshBasicMaterial;
        material.color.setHex(color);
        material.opacity = 1;

        emitted++;
      }
    }
  }

  emitSparkles(position: THREE.Vector3) {
    this.emit(position, 8, 0xFFD700, 0.8, 1.5, 2);
  }

  emitDust(position: THREE.Vector3) {
    this.emit(position, 3, 0xD2B48C, 0.5, 0.5, 0.8);
  }

  emitWaterRipple(position: THREE.Vector3) {
    this.emit(position, 5, 0x4169E1, 0.6, 0.8, 1.2);
  }

  emitDamage(position: THREE.Vector3) {
    this.emit(position, 6, 0xFF0000, 0.7, 2, 1.5);
  }

  emitHeal(position: THREE.Vector3) {
    this.emit(position, 8, 0x00FF00, 1, 1, 1.5);
  }

  update(deltaTime: number) {
    for (const particle of this.particles) {
      if (particle.active) {
        particle.lifetime += deltaTime;

        // Update position (avoid clone for GC)
        particle.mesh.position.x += particle.velocity.x * deltaTime;
        particle.mesh.position.y += particle.velocity.y * deltaTime;
        particle.mesh.position.z += particle.velocity.z * deltaTime;

        // Apply gravity
        particle.velocity.y -= 3 * deltaTime;

        // Fade out
        const material = particle.mesh.material as THREE.MeshBasicMaterial;
        material.opacity = 1 - (particle.lifetime / particle.maxLifetime);

        // Deactivate if lifetime exceeded
        if (particle.lifetime >= particle.maxLifetime) {
          particle.active = false;
          particle.mesh.visible = false;
        }
      }
    }
  }

  cleanup() {
    for (const particle of this.particles) {
      this.scene.remove(particle.mesh);
      particle.mesh.geometry.dispose();
      (particle.mesh.material as THREE.Material).dispose();
    }
    this.particles = [];
  }
}
