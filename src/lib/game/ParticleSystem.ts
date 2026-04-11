import * as THREE from 'three';

export interface Particle {
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  color: THREE.Color;
  lifetime: number;
  maxLifetime: number;
  active: boolean;
}

const PARTICLE_ALPHA_BUCKETS = [0.18, 0.42, 0.68, 0.92] as const;

export class ParticleSystem {
  private particles: Particle[] = [];
  private scene: THREE.Scene;
  private poolSize: number = 50;
  private readonly sharedGeometry = new THREE.PlaneGeometry(0.1, 0.1);
  private readonly particleMaterials: THREE.MeshBasicMaterial[] = [];
  private readonly particleMeshes: THREE.InstancedMesh[] = [];
  private readonly tempParticleObject = new THREE.Object3D();

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.initializePool();
  }

  private initializePool() {
    for (let i = 0; i < PARTICLE_ALPHA_BUCKETS.length; i++) {
      const material = new THREE.MeshBasicMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: PARTICLE_ALPHA_BUCKETS[i],
        depthWrite: false,
        vertexColors: true,
      });
      const mesh = new THREE.InstancedMesh(this.sharedGeometry, material, this.poolSize);
      mesh.count = 0;
      mesh.frustumCulled = false;
      mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
      this.scene.add(mesh);
      this.particleMaterials.push(material);
      this.particleMeshes.push(mesh);
    }

    for (let i = 0; i < this.poolSize; i++) {
      this.particles.push({
        position: new THREE.Vector3(),
        velocity: new THREE.Vector3(),
        color: new THREE.Color(0xffffff),
        lifetime: 0,
        maxLifetime: 1,
        active: false,
      });
    }
  }

  private getOpacityBucket(opacity: number): number {
    if (opacity <= 0.3) return 0;
    if (opacity <= 0.55) return 1;
    if (opacity <= 0.8) return 2;
    return 3;
  }

  private syncParticleInstances() {
    const bucketCounts = new Array(this.particleMeshes.length).fill(0);

    for (const particle of this.particles) {
      if (!particle.active) continue;

      const opacity = 1 - (particle.lifetime / particle.maxLifetime);
      const bucketIndex = this.getOpacityBucket(opacity);
      const instanceIndex = bucketCounts[bucketIndex]++;
      const mesh = this.particleMeshes[bucketIndex];

      this.tempParticleObject.position.copy(particle.position);
      this.tempParticleObject.rotation.set(0, 0, 0);
      this.tempParticleObject.scale.setScalar(1);
      this.tempParticleObject.updateMatrix();
      mesh.setMatrixAt(instanceIndex, this.tempParticleObject.matrix);
      mesh.setColorAt(instanceIndex, particle.color);
    }

    for (let i = 0; i < this.particleMeshes.length; i++) {
      const mesh = this.particleMeshes[i];
      mesh.count = bucketCounts[i];
      mesh.visible = bucketCounts[i] > 0;
      mesh.instanceMatrix.needsUpdate = true;
      if (mesh.instanceColor) {
        mesh.instanceColor.needsUpdate = true;
      }
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
        particle.position.copy(position);

        particle.velocity.set(
          (Math.random() - 0.5) * spread,
          (Math.random() - 0.5) * spread,
          Math.random() * 0.5
        ).multiplyScalar(speed);

        particle.color.setHex(color);

        emitted++;
      }
    }
  }

  emitSparkles(position: THREE.Vector3) {
    this.emit(position, 5, 0xcccccc, 0.4, 1, 1.5);
  }

  emitDust(position: THREE.Vector3) {
    this.emit(position, 3, 0xD2B48C, 0.5, 0.5, 0.8);
  }

  emitWaterRipple(position: THREE.Vector3) {
    this.emit(position, 5, 0x4169E1, 0.6, 0.8, 1.2);
  }

  emitDamage(position: THREE.Vector3) {
    this.emit(position, 4, 0xdddddd, 0.4, 1.5, 1);
  }

  emitHeal(position: THREE.Vector3) {
    this.emit(position, 8, 0x00FF00, 1, 1, 1.5);
  }

  emitBonfireKindled(position: THREE.Vector3) {
    this.emit(position, 10, 0xffd36b, 0.8, 1.1, 0.9);
    this.emit(position, 8, 0xff9e2c, 1.0, 0.9, 0.8);
    this.emit(position, 6, 0xfff2c1, 0.55, 0.7, 0.55);
  }

  /** Purple / cyan swirl while charging a map portal (charge 0..1). */
  emitPortalWarp(position: THREE.Vector3, charge: number) {
    const n = Math.max(2, Math.floor(3 + charge * 12));
    this.emit(position, Math.max(1, Math.floor(n * 0.4)), 0xaa66ff, 0.45 + charge * 0.35, 1.4 + charge * 1.2, 2.2);
    this.emit(position, Math.max(1, Math.floor(n * 0.35)), 0x44ffdd, 0.4 + charge * 0.3, 1.1 + charge, 2);
    this.emit(position, Math.max(1, Math.floor(n * 0.25)), 0xff88ee, 0.35 + charge * 0.25, 1.6 + charge * 0.8, 1.6);
  }

  /** Dim sparks when a portal is warded / unusable. */
  emitPortalBlocked(position: THREE.Vector3) {
    this.emit(position, 4, 0x661133, 0.55, 0.7, 1.4);
    this.emit(position, 3, 0x330066, 0.5, 0.5, 1.2);
  }

  update(deltaTime: number) {
    for (const particle of this.particles) {
      if (particle.active) {
        particle.position.x += particle.velocity.x * deltaTime;
        particle.position.y += particle.velocity.y * deltaTime;
        particle.position.z += particle.velocity.z * deltaTime;

        particle.velocity.y -= 3 * deltaTime;

        particle.lifetime += deltaTime;

        if (particle.lifetime >= particle.maxLifetime) {
          particle.active = false;
        }
      }
    }

    this.syncParticleInstances();
  }

  cleanup() {
    for (const mesh of this.particleMeshes) {
      this.scene.remove(mesh);
    }
    for (const material of this.particleMaterials) {
      material.dispose();
    }
    this.sharedGeometry.dispose();
    this.particles = [];
  }
}
