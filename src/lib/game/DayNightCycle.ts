import * as THREE from 'three';

export type TimeOfDay = 'dawn' | 'day' | 'dusk' | 'night';

const TIME_COLORS: Record<TimeOfDay, { tint: number; opacity: number; bgColor: number }> = {
  dawn:  { tint: 0xFF9944, opacity: 0.12, bgColor: 0xFFCC88 },
  day:   { tint: 0x000000, opacity: 0.0,  bgColor: 0x87CEEB },
  dusk:  { tint: 0x883322, opacity: 0.18, bgColor: 0xCC7744 },
  night: { tint: 0x111133, opacity: 0.35, bgColor: 0x1A1A3A },
};

const FULL_CYCLE_DURATION = 240;

export class DayNightCycle {
  private overlay: THREE.Mesh;
  private scene: THREE.Scene;
  private time: number = 0;
  private currentPhase: TimeOfDay = 'day';
  private sceneBackground: THREE.Color;
  // Pre-allocated colors to avoid per-frame allocation
  private readonly _colorA = new THREE.Color();
  private readonly _colorB = new THREE.Color();

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.sceneBackground = scene.background as THREE.Color;

    const geo = new THREE.PlaneGeometry(80, 60);
    const mat = new THREE.MeshBasicMaterial({
      color: 0x000000, transparent: true, opacity: 0, depthWrite: false,
    });
    this.overlay = new THREE.Mesh(geo, mat);
    this.overlay.position.z = 3.5;
    this.overlay.frustumCulled = false;
    scene.add(this.overlay);

    this.time = 0.15;
  }

  getPhase(): TimeOfDay { return this.currentPhase; }
  getNormalizedTime(): number { return this.time; }

  update(deltaTime: number, playerX: number, playerY: number) {
    this.time = (this.time + deltaTime / FULL_CYCLE_DURATION) % 1;

    let phase: TimeOfDay;
    let blend = 0;
    if (this.time < 0.15) {
      phase = 'dawn'; blend = this.time / 0.15;
    } else if (this.time < 0.55) {
      phase = 'day'; blend = (this.time - 0.15) / 0.4;
    } else if (this.time < 0.7) {
      phase = 'dusk'; blend = (this.time - 0.55) / 0.15;
    } else {
      phase = 'night'; blend = (this.time - 0.7) / 0.3;
    }
    this.currentPhase = phase;

    const cfg = TIME_COLORS[phase];
    const nextPhase: TimeOfDay = phase === 'dawn' ? 'day' : phase === 'day' ? 'dusk' : phase === 'dusk' ? 'night' : 'dawn';
    const nextCfg = TIME_COLORS[nextPhase];

    const edgeFade = blend < 0.2 ? blend / 0.2 : blend > 0.8 ? 1 - (blend - 0.8) / 0.2 : 1;
    
    const mat = this.overlay.material as THREE.MeshBasicMaterial;
    mat.color.setHex(cfg.tint);
    mat.opacity = cfg.opacity * edgeFade + nextCfg.opacity * (1 - edgeFade) * 0.3;

    // Reuse pre-allocated colors
    const transBlend = blend > 0.8 ? (blend - 0.8) / 0.2 : 0;
    this._colorA.setHex(cfg.bgColor);
    this._colorB.setHex(nextCfg.bgColor);
    this.sceneBackground.copy(this._colorA).lerp(this._colorB, transBlend);

    this.overlay.position.x = playerX;
    this.overlay.position.y = playerY;
  }

  cleanup() {
    this.scene.remove(this.overlay);
    (this.overlay.material as THREE.Material).dispose();
    this.overlay.geometry.dispose();
  }
}
