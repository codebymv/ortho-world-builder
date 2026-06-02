import type { PerfSnapshot } from '@/game/runtime/PerfProfiler';

interface PerfOverlayProps {
  snapshot: PerfSnapshot;
}

function ms(value: number): string {
  return `${value.toFixed(1)}ms`;
}

function number(value: number): string {
  return Math.round(value).toLocaleString();
}

export function PerfOverlay({ snapshot }: PerfOverlayProps) {
  const phaseEntries = Object.entries(snapshot.phases)
    .filter(([, phase]) => phase && phase.last > 0)
    .sort(([, a], [, b]) => (b?.p95 ?? 0) - (a?.p95 ?? 0))
    .slice(0, 10);

  return (
    <div className="fixed left-4 top-16 z-[90] w-[22rem] border border-[#3B5B72] bg-[#061018]/92 p-2 font-mono text-[11px] text-[#D8F3FF] shadow-lg pointer-events-none">
      <div className="mb-1 flex items-center justify-between gap-2 text-[11px] font-bold uppercase tracking-wider text-[#8DD8FF]">
        <span>Perf profiler (F8)</span>
        <span>{snapshot.frames.fps.toFixed(0)} fps</span>
      </div>
      <div className="grid grid-cols-5 gap-1 text-center">
        <div>last<br />{ms(snapshot.frames.last)}</div>
        <div>p50<br />{ms(snapshot.frames.p50)}</div>
        <div>p95<br />{ms(snapshot.frames.p95)}</div>
        <div>p99<br />{ms(snapshot.frames.p99)}</div>
        <div>max<br />{ms(snapshot.frames.max)}</div>
      </div>
      <div className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1">
        <div>draws {number(snapshot.renderer.drawCalls)}</div>
        <div>tris {number(snapshot.renderer.triangles)}</div>
        <div>tex {number(snapshot.renderer.textures)}</div>
        <div>geo {number(snapshot.renderer.geometries)}</div>
        <div>pixel {snapshot.renderer.pixelRatio.toFixed(2)}x</div>
        <div>cap {snapshot.adaptivePixelRatioCap.toFixed(2)}x</div>
        <div>world {number(snapshot.world.activeObjects)}</div>
        <div>pending {number(snapshot.world.pendingTiles)}</div>
        <div>overlays {number(snapshot.world.activeOverlayObjects)}</div>
        <div>culled {number(snapshot.world.activeDecorativeOverlayCulls)}</div>
        <div>mesh pool {number(snapshot.world.meshPoolSize)}</div>
        <div>grp pool {number(snapshot.world.groupPoolSize)}</div>
        <div>enemies {snapshot.entities.liveEnemies}/{snapshot.entities.totalEnemies}</div>
        <div>proj {snapshot.entities.projectiles + snapshot.entities.hazards}</div>
        <div>particles {snapshot.entities.particles}</div>
        <div>p budget {snapshot.entities.particleEmitted}/{snapshot.entities.particleBudget}</div>
        <div>p drop {number(snapshot.entities.particleDropped)}</div>
        <div>p scale {snapshot.entities.particleQualityScale.toFixed(2)}</div>
        <div>weather {snapshot.entities.weatherParticles}</div>
        <div>ambient {snapshot.entities.ambientParticles}</div>
        <div>items {snapshot.entities.worldItemVisible}/{snapshot.entities.worldItemVisuals}/{snapshot.entities.worldItems}</div>
      </div>
      <div className="mt-2 border-t border-[#3B5B72]/70 pt-1">
        {phaseEntries.map(([name, phase]) => (
          phase ? (
            <div key={name} className="flex justify-between gap-2 leading-4">
              <span>{name}</span>
              <span>last {ms(phase.last)} avg {ms(phase.avg)} p95 {ms(phase.p95)}</span>
            </div>
          ) : null
        ))}
      </div>
    </div>
  );
}
