import type * as THREE from 'three';

type PerfPhase =
  | 'prelude'
  | 'player'
  | 'enemy'
  | 'tail'
  | 'world'
  | 'npcProjection'
  | 'ambience'
  | 'weather'
  | 'dayNight'
  | 'floatingText'
  | 'particles'
  | 'worldItems'
  | 'render'
  | 'minimapTerrain'
  | 'minimapOverlay'
  | 'mapTerrain'
  | 'mapOverlay';

interface PhaseSnapshot {
  last: number;
  avg: number;
  p95: number;
}

interface FrameSnapshot {
  last: number;
  p50: number;
  p95: number;
  p99: number;
  max: number;
  fps: number;
}

export interface PerfStatsInput {
  renderer?: THREE.WebGLRenderer;
  world?: {
    getPerformanceStats?: () => {
      activeObjects: number;
      activeOverlayObjects?: number;
      activeDecorativeOverlayCulls?: number;
      decorativeOverlayCullSkips?: number;
      pendingTiles: number;
      meshPoolSize?: number;
      groupPoolSize?: number;
      mapRevision: number;
    };
  };
  combatSystem?: {
    getPerformanceStats?: () => { liveEnemies: number; totalEnemies: number; projectiles: number; hazards: number };
  };
  particleSystem?: {
    getPerformanceStats?: () => {
      activeParticles: number;
      poolSize: number;
      qualityScale?: number;
      frameBudget?: number;
      emittedThisFrame?: number;
      droppedThisFrame?: number;
    };
  };
  weatherSystem?: {
    getPerformanceStats?: () => { renderedParticles: number; activeWeather: string; qualityScale: number };
  };
  biomeAmbience?: {
    getPerformanceStats?: () => { activeParticles: number; poolSize: number; qualityScale: number };
  };
  worldItemRenderer?: {
    getPerformanceStats?: () => { activeVisuals: number; visibleVisuals: number; cachedVisibleItems: number };
  };
  worldItemCount?: number;
}

export interface PerfSnapshot {
  enabled: boolean;
  adaptiveEffectsScale: number;
  adaptivePixelRatioCap: number;
  frames: FrameSnapshot;
  phases: Partial<Record<PerfPhase, PhaseSnapshot>>;
  renderer: {
    drawCalls: number;
    triangles: number;
    points: number;
    lines: number;
    geometries: number;
    textures: number;
    pixelRatio: number;
  };
  world: {
    activeObjects: number;
    activeOverlayObjects: number;
    activeDecorativeOverlayCulls: number;
    decorativeOverlayCullSkips: number;
    pendingTiles: number;
    meshPoolSize: number;
    groupPoolSize: number;
    mapRevision: number;
  };
  entities: {
    liveEnemies: number;
    totalEnemies: number;
    projectiles: number;
    hazards: number;
    particles: number;
    particleBudget: number;
    particleEmitted: number;
    particleDropped: number;
    particleQualityScale: number;
    weatherParticles: number;
    ambientParticles: number;
    worldItems: number;
    worldItemVisuals: number;
    worldItemVisible: number;
  };
}

const FRAME_SAMPLE_LIMIT = 240;
const PHASE_SAMPLE_LIMIT = 120;
const ADAPTIVE_COOLDOWN_MS = 1200;

function pushSample(samples: number[], value: number, limit: number): void {
  samples.push(value);
  if (samples.length > limit) samples.shift();
}

function percentile(sorted: number[], fraction: number): number {
  if (sorted.length === 0) return 0;
  const index = Math.min(sorted.length - 1, Math.max(0, Math.ceil(sorted.length * fraction) - 1));
  return sorted[index];
}

function summarizeSamples(samples: number[]): FrameSnapshot {
  if (samples.length === 0) {
    return { last: 0, p50: 0, p95: 0, p99: 0, max: 0, fps: 0 };
  }
  const sorted = [...samples].sort((a, b) => a - b);
  const last = samples[samples.length - 1] ?? 0;
  return {
    last,
    p50: percentile(sorted, 0.5),
    p95: percentile(sorted, 0.95),
    p99: percentile(sorted, 0.99),
    max: sorted[sorted.length - 1] ?? 0,
    fps: last > 0 ? 1000 / last : 0,
  };
}

function summarizePhase(samples: number[]): PhaseSnapshot {
  if (samples.length === 0) return { last: 0, avg: 0, p95: 0 };
  const sorted = [...samples].sort((a, b) => a - b);
  const sum = samples.reduce((acc, value) => acc + value, 0);
  return {
    last: samples[samples.length - 1] ?? 0,
    avg: sum / samples.length,
    p95: percentile(sorted, 0.95),
  };
}

export class PerfProfiler {
  private enabled = false;
  private frameStart = 0;
  private phaseStarts = new Map<PerfPhase, number>();
  private frameSamples: number[] = [];
  private phaseSamples = new Map<PerfPhase, number[]>();
  private lastAdaptiveAdjustment = 0;
  private adaptiveEffectsScale = 1;
  private adaptivePixelRatioCap = 2;
  private latestStats: PerfStatsInput = {};

  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
  }

  toggleEnabled(): boolean {
    this.enabled = !this.enabled;
    return this.enabled;
  }

  isEnabled(): boolean {
    return this.enabled;
  }

  beginFrame(now: number = performance.now()): void {
    this.frameStart = now;
    if (this.enabled) {
      this.phaseStarts.clear();
    }
  }

  start(phase: PerfPhase, now: number = performance.now()): void {
    if (!this.enabled) return;
    this.phaseStarts.set(phase, now);
  }

  end(phase: PerfPhase, now: number = performance.now()): void {
    if (!this.enabled) return;
    const start = this.phaseStarts.get(phase);
    if (start === undefined) return;
    this.phaseStarts.delete(phase);
    this.recordPhase(phase, Math.max(0, now - start));
  }

  measure<T>(phase: PerfPhase, fn: () => T): T {
    if (!this.enabled) return fn();
    this.start(phase);
    try {
      return fn();
    } finally {
      this.end(phase);
    }
  }

  recordExternal(phase: PerfPhase, durationMs: number): void {
    if (!this.enabled) return;
    this.recordPhase(phase, Math.max(0, durationMs));
  }

  endFrame(stats: PerfStatsInput = {}, now: number = performance.now()): void {
    if (this.frameStart > 0) {
      pushSample(this.frameSamples, Math.max(0, now - this.frameStart), FRAME_SAMPLE_LIMIT);
    }
    this.latestStats = stats;
    this.updateAdaptiveQuality(now);
  }

  getAdaptiveEffectsScale(): number {
    return this.adaptiveEffectsScale;
  }

  getAdaptivePixelRatioCap(): number {
    return this.adaptivePixelRatioCap;
  }

  getSnapshot(): PerfSnapshot {
    const renderer = this.latestStats.renderer;
    const world = this.latestStats.world?.getPerformanceStats?.();
    const combat = this.latestStats.combatSystem?.getPerformanceStats?.();
    const particles = this.latestStats.particleSystem?.getPerformanceStats?.();
    const weather = this.latestStats.weatherSystem?.getPerformanceStats?.();
    const ambience = this.latestStats.biomeAmbience?.getPerformanceStats?.();
    const worldItems = this.latestStats.worldItemRenderer?.getPerformanceStats?.();
    const phases: Partial<Record<PerfPhase, PhaseSnapshot>> = {};
    for (const [phase, samples] of this.phaseSamples) {
      phases[phase] = summarizePhase(samples);
    }

    return {
      enabled: this.enabled,
      adaptiveEffectsScale: this.adaptiveEffectsScale,
      adaptivePixelRatioCap: this.adaptivePixelRatioCap,
      frames: summarizeSamples(this.frameSamples),
      phases,
      renderer: {
        drawCalls: renderer?.info.render.calls ?? 0,
        triangles: renderer?.info.render.triangles ?? 0,
        points: renderer?.info.render.points ?? 0,
        lines: renderer?.info.render.lines ?? 0,
        geometries: renderer?.info.memory.geometries ?? 0,
        textures: renderer?.info.memory.textures ?? 0,
        pixelRatio: renderer?.getPixelRatio?.() ?? 1,
      },
      world: {
        activeObjects: world?.activeObjects ?? 0,
        activeOverlayObjects: world?.activeOverlayObjects ?? 0,
        activeDecorativeOverlayCulls: world?.activeDecorativeOverlayCulls ?? 0,
        decorativeOverlayCullSkips: world?.decorativeOverlayCullSkips ?? 0,
        pendingTiles: world?.pendingTiles ?? 0,
        meshPoolSize: world?.meshPoolSize ?? 0,
        groupPoolSize: world?.groupPoolSize ?? 0,
        mapRevision: world?.mapRevision ?? 0,
      },
      entities: {
        liveEnemies: combat?.liveEnemies ?? 0,
        totalEnemies: combat?.totalEnemies ?? 0,
        projectiles: combat?.projectiles ?? 0,
        hazards: combat?.hazards ?? 0,
        particles: particles?.activeParticles ?? 0,
        particleBudget: particles?.frameBudget ?? 0,
        particleEmitted: particles?.emittedThisFrame ?? 0,
        particleDropped: particles?.droppedThisFrame ?? 0,
        particleQualityScale: particles?.qualityScale ?? 1,
        weatherParticles: weather?.renderedParticles ?? 0,
        ambientParticles: ambience?.activeParticles ?? 0,
        worldItems: this.latestStats.worldItemCount ?? 0,
        worldItemVisuals: worldItems?.activeVisuals ?? 0,
        worldItemVisible: worldItems?.visibleVisuals ?? 0,
      },
    };
  }

  private recordPhase(phase: PerfPhase, durationMs: number): void {
    let samples = this.phaseSamples.get(phase);
    if (!samples) {
      samples = [];
      this.phaseSamples.set(phase, samples);
    }
    pushSample(samples, durationMs, PHASE_SAMPLE_LIMIT);
  }

  private updateAdaptiveQuality(now: number): void {
    if (now - this.lastAdaptiveAdjustment < ADAPTIVE_COOLDOWN_MS) return;
    this.lastAdaptiveAdjustment = now;
    const frame = summarizeSamples(this.frameSamples);
    if (frame.p95 <= 0) return;

    if (frame.p95 > 28) {
      this.adaptiveEffectsScale = 0.45;
      this.adaptivePixelRatioCap = 1.25;
    } else if (frame.p95 > 20) {
      this.adaptiveEffectsScale = Math.min(this.adaptiveEffectsScale, 0.68);
      this.adaptivePixelRatioCap = 1.5;
    } else if (frame.p95 < 15.5 && frame.p99 < 22) {
      this.adaptiveEffectsScale = 1;
      this.adaptivePixelRatioCap = 2;
    }
  }
}
