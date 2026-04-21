import * as THREE from 'three';

type WeatherType = 'clear' | 'rain' | 'heavy_rain' | 'snow' | 'storm' | 'fog';

interface WeatherParticle {
  position: THREE.Vector3;
  scale: THREE.Vector3;
  velocity: THREE.Vector3;
  opacityBucket: number;
  active: boolean;
}

const WEATHER_OPACITY_BUCKETS = [0.76, 0.86, 0.96] as const;

const WEATHER_CONFIGS: Record<WeatherType, {
  color: number;
  count: number;
  sizeMin: number;
  sizeMax: number;
  speedY: number;
  speedX: number;
  opacity: number;
  spread: number;
  bgTint: number;
  bgOpacity: number;
}> = {
  clear: { color: 0, count: 0, sizeMin: 0, sizeMax: 0, speedY: 0, speedX: 0, opacity: 0, spread: 0, bgTint: 0, bgOpacity: 0 },
  rain: {
    // Brighter blue-white streaks, more drops, higher minimum opacity so no drop disappears.
    color: 0xBBCCFF, count: 200, sizeMin: 0.04, sizeMax: 0.10,
    speedY: -10, speedX: -1.5, opacity: 0.85, spread: 22,
    bgTint: 0x3a4e66, bgOpacity: 0.22,
  },
  heavy_rain: {
    color: 0xAABBFF, count: 300, sizeMin: 0.055, sizeMax: 0.14,
    speedY: -14, speedX: -3, opacity: 0.92, spread: 26,
    bgTint: 0x283344, bgOpacity: 0.38,
  },
  snow: {
    color: 0xEEEEFF, count: 100, sizeMin: 0.04, sizeMax: 0.1,
    speedY: -1.5, speedX: 0.3, opacity: 0.7, spread: 20,
    bgTint: 0xCCCCDD, bgOpacity: 0.1,
  },
  storm: {
    color: 0x99AAEE, count: 280, sizeMin: 0.055, sizeMax: 0.13,
    speedY: -18, speedX: -6, opacity: 0.95, spread: 28,
    bgTint: 0x1a1f2e, bgOpacity: 0.48,
  },
  fog: {
    color: 0xBBBBCC, count: 40, sizeMin: 0.3, sizeMax: 0.8,
    speedY: 0, speedX: 0.2, opacity: 0.12, spread: 18,
    bgTint: 0x999999, bgOpacity: 0.2,
  },
};

export class WeatherSystem {
  private scene: THREE.Scene;
  private particles: WeatherParticle[] = [];
  private currentWeather: WeatherType = 'clear';
  private targetWeather: WeatherType = 'clear';
  private transitionTimer = 0;
  private readonly TRANSITION_DURATION = 3; // seconds to fade between weather
  private weatherTimer = 0;
  private nextWeatherChange = 60; // seconds until next weather change
  private readonly sharedGeometry = new THREE.PlaneGeometry(1, 1);
  private readonly MAX_PARTICLES = 320;
  private readonly particleMaterials: THREE.MeshBasicMaterial[] = [];
  private readonly particleMeshes: THREE.InstancedMesh[] = [];
  private readonly particleBucketCounts = new Uint16Array(WEATHER_OPACITY_BUCKETS.length);
  private readonly lastParticleBucketCounts = new Uint16Array(WEATHER_OPACITY_BUCKETS.length);
  private readonly tempParticleObject = new THREE.Object3D();
  private overlay: THREE.Mesh | null = null;
  private lastParticleMaterialWeather: WeatherType | null = null;
  private renderedParticleCount = 0;
  /** Seconds until next lightning attempt (storm only). */
  private lightningCooldown = 4 + Math.random() * 5;
  /** Brief flash duration remaining; 0 = no flash. */
  private lightningBurstRemaining = 0;
  /** Called once each time a lightning bolt fires. Wire up thunder SFX here. */
  onLightningFlash?: () => void;

  // Biome-based weather weights
  private biomeWeights: Record<string, Partial<Record<WeatherType, number>>> = {
    grassland: { clear: 50, rain: 25, fog: 10, heavy_rain: 10, storm: 5 },
    forest: { clear: 30, rain: 30, fog: 20, heavy_rain: 10, storm: 10 },
    forest_hollow: { clear: 25, rain: 28, fog: 25, heavy_rain: 12, storm: 10 },
    forest_hollow_deep: { clear: 15, rain: 25, fog: 40, heavy_rain: 12, storm: 8 },
    swamp: { clear: 15, rain: 25, fog: 35, heavy_rain: 15, storm: 10 },
    ruins: { clear: 20, rain: 20, fog: 25, snow: 15, storm: 20 },
    city: { clear: 15, rain: 25, fog: 30, storm: 20, snow: 10 },
  };

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.initPool();
    this.createOverlay();
  }

  private initPool() {
    for (let i = 0; i < WEATHER_OPACITY_BUCKETS.length; i++) {
      const material = new THREE.MeshBasicMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: 0,
        depthWrite: false,
      });
      const mesh = new THREE.InstancedMesh(this.sharedGeometry, material, this.MAX_PARTICLES);
      mesh.count = 0;
      mesh.frustumCulled = false;
      mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
      this.scene.add(mesh);
      this.particleMaterials.push(material);
      this.particleMeshes.push(mesh);
    }

    for (let i = 0; i < this.MAX_PARTICLES; i++) {
      this.particles.push({
        position: new THREE.Vector3(),
        scale: new THREE.Vector3(1, 1, 1),
        velocity: new THREE.Vector3(),
        opacityBucket: i % WEATHER_OPACITY_BUCKETS.length,
        active: false,
      });
    }
  }

  private isRainType(weather: WeatherType): boolean {
    return weather === 'rain' || weather === 'heavy_rain' || weather === 'storm';
  }

  private refreshParticleMaterials(weather: WeatherType, cfg: (typeof WEATHER_CONFIGS)[WeatherType]) {
    if (this.lastParticleMaterialWeather === weather) return;
    for (let i = 0; i < this.particleMaterials.length; i++) {
      const material = this.particleMaterials[i];
      material.color.setHex(cfg.color);
      material.opacity = cfg.opacity * WEATHER_OPACITY_BUCKETS[i];
    }
    this.lastParticleMaterialWeather = weather;
  }

  private resetParticle(
    particle: WeatherParticle,
    cfg: (typeof WEATHER_CONFIGS)[WeatherType],
    playerX: number,
    playerY: number,
    spawnAboveView: boolean
  ) {
    particle.position.x = playerX + (Math.random() - 0.5) * cfg.spread * 2;
    particle.position.y = spawnAboveView
      ? playerY + cfg.spread + Math.random() * 4
      : playerY + (Math.random() - 0.5) * cfg.spread * 2;
    particle.position.z = 2;
    particle.velocity.set(
      cfg.speedX + (Math.random() - 0.5) * 1,
      cfg.speedY + (Math.random() - 0.5) * 2,
      0
    );
  }

  private activateParticle(
    particle: WeatherParticle,
    weather: WeatherType,
    cfg: (typeof WEATHER_CONFIGS)[WeatherType],
    playerX: number,
    playerY: number
  ) {
    particle.active = true;
    particle.opacityBucket = Math.floor(Math.random() * WEATHER_OPACITY_BUCKETS.length);

    const size = cfg.sizeMin + Math.random() * (cfg.sizeMax - cfg.sizeMin);
    const isRainType = this.isRainType(weather);
    particle.scale.set(
      isRainType ? size * 0.28 : size,
      isRainType ? size * 5.5 : size,
      1
    );

    this.resetParticle(particle, cfg, playerX, playerY, false);
  }

  private syncParticleInstances(weather: WeatherType) {
    this.particleBucketCounts.fill(0);
    let renderedCount = 0;

    for (const particle of this.particles) {
      if (!particle.active) continue;

      const bucketIndex = particle.opacityBucket;
      const instanceIndex = this.particleBucketCounts[bucketIndex]++;
      renderedCount++;
      this.tempParticleObject.position.copy(particle.position);
      this.tempParticleObject.scale.copy(particle.scale);
      this.tempParticleObject.rotation.set(0, 0, weather === 'snow' ? Math.sin(particle.position.y * 1.5) * 0.12 : 0);
      this.tempParticleObject.updateMatrix();
      this.particleMeshes[bucketIndex].setMatrixAt(instanceIndex, this.tempParticleObject.matrix);
    }

    for (let i = 0; i < this.particleMeshes.length; i++) {
      const mesh = this.particleMeshes[i];
      const nextCount = this.particleBucketCounts[i];
      if (mesh.count !== nextCount) {
        mesh.count = nextCount;
      }
      const shouldBeVisible = nextCount > 0;
      if (mesh.visible !== shouldBeVisible) {
        mesh.visible = shouldBeVisible;
      }
      if (nextCount > 0) {
        mesh.instanceMatrix.needsUpdate = true;
      }
      this.lastParticleBucketCounts[i] = nextCount;
    }

    this.renderedParticleCount = renderedCount;
  }

  private createOverlay() {
    const geo = new THREE.PlaneGeometry(60, 40);
    const mat = new THREE.MeshBasicMaterial({
      color: 0x000000, transparent: true, opacity: 0, depthWrite: false,
    });
    this.overlay = new THREE.Mesh(geo, mat);
    this.overlay.position.z = 3; // above everything
    this.overlay.frustumCulled = false;
    this.scene.add(this.overlay);
  }

  rollNewWeather(biome: string) {
    const weights = this.biomeWeights[biome] || this.biomeWeights.grassland;
    const entries = Object.entries(weights) as [WeatherType, number][];
    const total = entries.reduce((s, [, w]) => s + w, 0);
    let r = Math.random() * total;
    for (const [type, weight] of entries) {
      r -= weight;
      if (r <= 0) {
        this.targetWeather = type;
        this.transitionTimer = this.TRANSITION_DURATION;
        return;
      }
    }
    this.targetWeather = 'clear';
    this.transitionTimer = this.TRANSITION_DURATION;
  }

  forceWeather(type: WeatherType) {
    this.targetWeather = type;
    this.transitionTimer = this.TRANSITION_DURATION;
  }

  getCurrentWeather(): WeatherType {
    return this.currentWeather;
  }

  getActiveWeather(): WeatherType {
    return this.transitionTimer > 0 ? this.targetWeather : this.currentWeather;
  }

  update(deltaTime: number, playerX: number, playerY: number, biome: string) {
    // Weather change timer
    this.weatherTimer += deltaTime;
    if (this.weatherTimer >= this.nextWeatherChange) {
      this.weatherTimer = 0;
      this.nextWeatherChange = 45 + Math.random() * 90; // 45-135 seconds
      this.rollNewWeather(biome);
    }

    // Transition
    if (this.transitionTimer > 0) {
      this.transitionTimer -= deltaTime;
      if (this.transitionTimer <= 0) {
        this.currentWeather = this.targetWeather;
      }
    }

    const activeWeather = this.transitionTimer > 0 ? this.targetWeather : this.currentWeather;
    const cfg = WEATHER_CONFIGS[activeWeather];
    const fadeProgress = this.transitionTimer > 0
      ? 1 - (this.transitionTimer / this.TRANSITION_DURATION)
      : 1;

    this.refreshParticleMaterials(activeWeather, cfg);

    // Storm lightning: random bursts, short duration (no full-screen pure white hold)
    if (activeWeather === 'storm') {
      this.lightningCooldown -= deltaTime;
      if (this.lightningCooldown <= 0 && this.lightningBurstRemaining <= 0) {
        this.lightningBurstRemaining = 0.07 + Math.random() * 0.05;
        this.lightningCooldown = 2.8 + Math.random() * 7;
        this.onLightningFlash?.();
      }
    } else {
      this.lightningBurstRemaining = 0;
      this.lightningCooldown = 3 + Math.random() * 5;
    }

    if (this.lightningBurstRemaining > 0) {
      this.lightningBurstRemaining -= deltaTime;
      if (this.lightningBurstRemaining < 0) this.lightningBurstRemaining = 0;
    }

    // Atmospheric overlay (must reset color when clear — lightning used to leave 0xFFFFFF and caused white flashes)
    if (this.overlay) {
      const mat = this.overlay.material as THREE.MeshBasicMaterial;
      const baseOpacity = cfg.bgOpacity > 0 ? cfg.bgOpacity * fadeProgress : 0;

      if (activeWeather === 'storm' && this.lightningBurstRemaining > 0) {
        // Cool white-blue sheet flash, not pure 0xFFFFFF on the whole screen
        mat.color.setHex(0xaabbdd);
        mat.opacity = Math.min(0.42, baseOpacity + 0.28);
      } else if (cfg.bgOpacity > 0) {
        mat.color.setHex(cfg.bgTint);
        mat.opacity = baseOpacity;
      } else {
        mat.color.setHex(0x000000);
        mat.opacity = Math.max(0, mat.opacity - deltaTime * 0.6);
      }
      this.overlay.position.x = playerX;
      this.overlay.position.y = playerY;
    }

    // Spawn / update particles
    const targetCount = Math.floor(cfg.count * fadeProgress);
    let activeCount = 0;

    for (const p of this.particles) {
      if (p.active) {
        // Update position
        p.position.x += p.velocity.x * deltaTime;
        p.position.y += p.velocity.y * deltaTime;

        // Snow wobble
        if (activeWeather === 'snow') {
          p.position.x += Math.sin(p.position.y * 2) * 0.01;
        }

        // Recycle if out of view
        const dx = p.position.x - playerX;
        const dy = p.position.y - playerY;
        if (Math.abs(dx) > cfg.spread || Math.abs(dy) > cfg.spread) {
          this.resetParticle(p, cfg, playerX, playerY, true);
        }

        activeCount++;
      }
    }

    // Activate more particles if needed
    if (activeCount < targetCount) {
      for (const p of this.particles) {
        if (!p.active && activeCount < targetCount) {
          this.activateParticle(p, activeWeather, cfg, playerX, playerY);
          activeCount++;
        }
      }
    }

    // Deactivate excess
    if (activeCount > targetCount) {
      let toRemove = activeCount - targetCount;
      for (const p of this.particles) {
        if (p.active && toRemove > 0) {
          p.active = false;
          toRemove--;
        }
      }
    }

    if (activeCount === 0 && targetCount === 0 && this.renderedParticleCount === 0) {
      return;
    }

    this.syncParticleInstances(activeWeather);
  }

  cleanup() {
    for (const mesh of this.particleMeshes) {
      this.scene.remove(mesh);
    }
    for (const material of this.particleMaterials) {
      material.dispose();
    }
    this.particles = [];
    if (this.overlay) {
      this.scene.remove(this.overlay);
      (this.overlay.material as THREE.Material).dispose();
      this.overlay.geometry.dispose();
    }
    this.sharedGeometry.dispose();
  }
}
