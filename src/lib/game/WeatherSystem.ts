import * as THREE from 'three';

type WeatherType = 'clear' | 'rain' | 'heavy_rain' | 'snow' | 'storm' | 'fog';

interface WeatherParticle {
  mesh: THREE.Mesh;
  velocity: THREE.Vector3;
  active: boolean;
}

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
    color: 0x9BAFE6, count: 120, sizeMin: 0.026, sizeMax: 0.075,
    speedY: -8, speedX: -1.5, opacity: 0.68, spread: 20,
    bgTint: 0x445566, bgOpacity: 0.15,
  },
  heavy_rain: {
    color: 0x8EA3DE, count: 200, sizeMin: 0.038, sizeMax: 0.1,
    speedY: -12, speedX: -3, opacity: 0.8, spread: 24,
    bgTint: 0x334455, bgOpacity: 0.3,
  },
  snow: {
    color: 0xEEEEFF, count: 100, sizeMin: 0.04, sizeMax: 0.1,
    speedY: -1.5, speedX: 0.3, opacity: 0.7, spread: 20,
    bgTint: 0xCCCCDD, bgOpacity: 0.1,
  },
  storm: {
    color: 0x8A9CDD, count: 180, sizeMin: 0.036, sizeMax: 0.09,
    speedY: -14, speedX: -5, opacity: 0.82, spread: 26,
    bgTint: 0x222233, bgOpacity: 0.4,
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
  private readonly MAX_PARTICLES = 200;
  private overlay: THREE.Mesh | null = null;
  /** Seconds until next lightning attempt (storm only). */
  private lightningCooldown = 4 + Math.random() * 5;
  /** Brief flash duration remaining; 0 = no flash. */
  private lightningBurstRemaining = 0;

  // Biome-based weather weights
  private biomeWeights: Record<string, Partial<Record<WeatherType, number>>> = {
    grassland: { clear: 50, rain: 25, fog: 10, heavy_rain: 10, storm: 5 },
    forest: { clear: 30, rain: 30, fog: 20, heavy_rain: 10, storm: 10 },
    swamp: { clear: 15, rain: 25, fog: 35, heavy_rain: 15, storm: 10 },
    ruins: { clear: 20, rain: 20, fog: 25, snow: 15, storm: 20 },
  };

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.initPool();
    this.createOverlay();
  }

  private initPool() {
    for (let i = 0; i < this.MAX_PARTICLES; i++) {
      const mat = new THREE.MeshBasicMaterial({
        color: 0xffffff, transparent: true, opacity: 0, depthWrite: false,
      });
      const mesh = new THREE.Mesh(this.sharedGeometry, mat);
      mesh.visible = false;
      mesh.frustumCulled = false;
      mesh.matrixAutoUpdate = true; // weather particles move every frame
      this.scene.add(mesh);
      this.particles.push({
        mesh, velocity: new THREE.Vector3(), active: false,
      });
    }
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

    // Storm lightning: random bursts, short duration (no full-screen pure white hold)
    if (activeWeather === 'storm') {
      this.lightningCooldown -= deltaTime;
      if (this.lightningCooldown <= 0 && this.lightningBurstRemaining <= 0) {
        this.lightningBurstRemaining = 0.07 + Math.random() * 0.05;
        this.lightningCooldown = 2.8 + Math.random() * 7;
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
        p.mesh.position.x += p.velocity.x * deltaTime;
        p.mesh.position.y += p.velocity.y * deltaTime;

        // Snow wobble
        if (activeWeather === 'snow') {
          p.mesh.position.x += Math.sin(p.mesh.position.y * 2) * 0.01;
        }

        // Recycle if out of view
        const dx = p.mesh.position.x - playerX;
        const dy = p.mesh.position.y - playerY;
        if (Math.abs(dx) > cfg.spread || Math.abs(dy) > cfg.spread) {
          // Reset position
          p.mesh.position.x = playerX + (Math.random() - 0.5) * cfg.spread * 2;
          p.mesh.position.y = playerY + cfg.spread + Math.random() * 4;
          p.velocity.y = cfg.speedY + (Math.random() - 0.5) * 2;
          p.velocity.x = cfg.speedX + (Math.random() - 0.5) * 1;
        }

        activeCount++;
      }
    }

    // Activate more particles if needed
    if (activeCount < targetCount) {
      for (const p of this.particles) {
        if (!p.active && activeCount < targetCount) {
          p.active = true;
          p.mesh.visible = true;
          const size = cfg.sizeMin + Math.random() * (cfg.sizeMax - cfg.sizeMin);
          p.mesh.scale.set(
            activeWeather === 'rain' || activeWeather === 'heavy_rain' || activeWeather === 'storm' ? size * 0.34 : size,
            activeWeather === 'rain' || activeWeather === 'heavy_rain' || activeWeather === 'storm' ? size * 3.8 : size,
            1
          );
          p.mesh.position.set(
            playerX + (Math.random() - 0.5) * cfg.spread * 2,
            playerY + (Math.random() - 0.5) * cfg.spread * 2,
            2 // above tiles, below overlay
          );
          p.velocity.set(
            cfg.speedX + (Math.random() - 0.5) * 1,
            cfg.speedY + (Math.random() - 0.5) * 2,
            0
          );
          const mat = p.mesh.material as THREE.MeshBasicMaterial;
          mat.color.setHex(cfg.color);
          mat.opacity = cfg.opacity * (0.5 + Math.random() * 0.5);
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
          p.mesh.visible = false;
          toRemove--;
        }
      }
    }
  }

  cleanup() {
    for (const p of this.particles) {
      this.scene.remove(p.mesh);
      (p.mesh.material as THREE.Material).dispose();
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
