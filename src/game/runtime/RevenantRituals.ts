import type { CombatSystem } from '@/lib/game/Combat';
import type { GameFlagKey, GameState } from '@/lib/game/GameState';
import type { World } from '@/lib/game/World';
import { ENEMY_BLUEPRINTS } from '@/data/enemies';
import { notify } from '@/lib/game/notificationBus';
import { FOREST_DUD_RITUAL_ANCHORS } from '@/game/runtime/ritualSiteConstants';
import { ensureForestDudRitualSites } from '@/game/runtime/revenantRitualDecor';

interface ScreenShakeLike {
  shake: (intensity: number, duration: number) => void;
}

interface ParticleSystemLike {
  emitAt: (
    x: number,
    y: number,
    z: number,
    count: number,
    color: number,
    size?: number,
    speed?: number,
    life?: number,
  ) => void;
}

export interface RevenantRitualContext {
  state: GameState;
  world: World;
  combatSystem: CombatSystem;
  screenShake: ScreenShakeLike;
  particleSystem: ParticleSystemLike;
  deltaTime: number;
  currentTime: number;
  playRitualSummonStart?: () => void;
}

/**
 * Heresy summoning rituals: the two Ridge Revenants are no longer placed as static
 * enemy zones — instead a summoning glyph sits at each site, and the wraith is dragged
 * back only for a player steeped in heresy. If the player holds at least three cursed
 * sediment ("heretical cores") and steps onto a glyph, the ritual fires a brief charge
 * animation and materializes the revenant, which immediately attacks. Below the
 * threshold the glyph is inert — nothing happens.
 *
 * Gate-only (cores are a threshold, not a cost). One revenant per ritual: the site is
 * marked cleared when its revenant dies (see RuntimeCombatActions), so it never re-summons
 * once beaten, but the fight stays available until you win it (no soft-lock if you flee).
 *
 * Coordinates are world-space (forest map is 300x300, so world = tile - 150).
 */
export interface RitualSite {
  mapId: string;
  tileX: number;
  tileY: number;
  clearedFlag: string;
}

const RITUAL_SITES: RitualSite[] = [
  // East Ridge Ascent summit (world ~110,-8) — yields the Tempered Core on defeat.
  { mapId: 'forest', tileX: 260, tileY: 142, clearedFlag: 'ridge_revenant_defeated' },
  // West Fort interior (world ~-132,-3) — yields the west-fort chest on defeat.
  { mapId: 'forest', tileX: 18, tileY: 147, clearedFlag: 'ritual_revenant_west_cleared' },
  // Precipice west lip (world ~77,-138) — outdoor ritual like the fort glyph.
  { mapId: 'forest', tileX: 227, tileY: 12, clearedFlag: 'ritual_revenant_precipice_cleared' },
];

/** Attribute a slain ritual revenant to the nearest glyph (world-space). */
export function resolveNearestRitualSite(
  mapId: string,
  worldX: number,
  worldY: number,
  mapWidth: number,
  mapHeight: number,
  maxDist = 22,
): RitualSite | null {
  const halfW = mapWidth / 2;
  const halfH = mapHeight / 2;
  const maxDistSq = maxDist * maxDist;
  let best: RitualSite | null = null;
  let bestDistSq = maxDistSq;
  for (const site of RITUAL_SITES) {
    if (site.mapId !== mapId) continue;
    const wx = site.tileX - halfW + 0.5;
    const wy = site.tileY - halfH + 0.5;
    const distSq = (worldX - wx) ** 2 + (worldY - wy) ** 2;
    if (distSq < bestDistSq) {
      bestDistSq = distSq;
      best = site;
    }
  }
  return best;
}

/** Minimum cursed sediment on the player to awaken a glyph (3+). */
const MIN_CURSED_SEDIMENT = 3;
const TRIGGER_RADIUS = 2.6;
const TRIGGER_RADIUS_SQ = TRIGGER_RADIUS * TRIGGER_RADIUS;
/** Seconds the glyph charges before the wraith materializes. */
const SUMMON_CHARGE_TIME = 0.95;
/** Don't re-summon while a revenant is still alive within this range of the glyph. */
const ACTIVE_RADIUS_SQ = 16 * 16;

const RR_VIOLET = 0xCC44FF;
const RR_TEAL = 0x40FFEE;

// Per-site charge timer (in-memory only — resets on map change; a summon in progress
// when you leave simply doesn't complete).
const _charging = new Map<string, number>();
const _hintedInsufficient = new Set<string>();
const _hintedDud = new Set<string>();
let _lastMap = '';

/** Failed ritual circles — visual only; never summon (wrong elevation, chaotic rite, etc.). */
interface DudRitualSite {
  mapId: string;
  tileX: number;
  tileY: number;
  title: string;
  description: string;
}

const DUD_RITUAL_SITES: DudRitualSite[] = FOREST_DUD_RITUAL_ANCHORS.map(anchor => ({
  mapId: 'forest',
  tileX: anchor.tileX,
  tileY: anchor.tileY,
  title: 'The sigil will not hold',
  description:
    'Cursed sediment fizzles in the cracked ring and dies. Whoever tried this rite chose the wrong ground — the elevation shifts, or the working was simply too chaotic to bind.',
}));

function siteKey(site: RitualSite): string {
  return `${site.mapId}:${site.tileX}:${site.tileY}`;
}

function spawnRitualRevenant(combatSystem: CombatSystem, x: number, y: number): void {
  const bp = ENEMY_BLUEPRINTS.ridge_revenant;
  combatSystem.spawnEnemy(bp.name, { x, y }, bp.hp, bp.damage, bp.sprite, {
    speed: bp.speed,
    attackRange: bp.attackRange,
    chaseRange: bp.chaseRange,
    essenceReward: bp.essenceReward,
    telegraphDuration: bp.telegraphDuration,
    recoverDuration: bp.recoverDuration,
    poise: bp.poise,
    staggerDuration: bp.staggerDuration,
    behaviorOverrides: bp.behaviorOverrides,
    faction: bp.faction,
  });
}

export function updateRevenantRituals(ctx: RevenantRitualContext): void {
  const { state, world, combatSystem, particleSystem, screenShake, deltaTime, currentTime, playRitualSummonStart } = ctx;

  if (state.currentMap !== _lastMap) {
    _charging.clear();
    _hintedInsufficient.clear();
    _hintedDud.clear();
    _lastMap = state.currentMap;
  }

  const map = world.getCurrentMap();
  const halfW = map.width / 2;
  const halfH = map.height / 2;
  const px = state.player.position.x;
  const py = state.player.position.y;
  const cores = state.player.cursedSediment ?? 0;

  for (const site of RITUAL_SITES) {
    if (site.mapId !== state.currentMap) continue;

    const wx = site.tileX - halfW + 0.5;
    const wy = site.tileY - halfH + 0.5;
    const key = siteKey(site);

    const dx = px - wx;
    const dy = py - wy;
    const onGlyph = dx * dx + dy * dy <= TRIGGER_RADIUS_SQ;

    if (state.getFlag(site.clearedFlag)) {
      continue;
    }

    // ── Charge phase: glyph is firing. Escalate the FX, then materialize the wraith. ──
    const charge = _charging.get(key);
    if (charge !== undefined) {
      const progress = 1 - charge / SUMMON_CHARGE_TIME;
      // Rising spiral of violet/teal motes from the glyph.
      const ringR = 1.4 * (1 - progress) + 0.2;
      const a = currentTime / 60;
      particleSystem.emitAt(wx + Math.cos(a) * ringR, wy + Math.sin(a) * ringR * 0.6, 0.3, 2, RR_VIOLET, 0.35, 0.4 + progress * 1.2, 0.7);
      particleSystem.emitAt(wx - Math.cos(a) * ringR, wy - Math.sin(a) * ringR * 0.6, 0.3, 2, RR_TEAL, 0.3, 0.4 + progress * 1.2, 0.7);
      if (progress > 0.5) screenShake.shake(0.05 + progress * 0.05, 0.08);

      const next = charge - deltaTime;
      if (next <= 0) {
        _charging.delete(key);
        spawnRitualRevenant(combatSystem, wx, wy);
        // Materialization burst.
        particleSystem.emitAt(wx, wy, 0.4, 30, RR_VIOLET, 0.5, 2.4, 1.6);
        particleSystem.emitAt(wx, wy, 0.4, 18, RR_TEAL, 0.45, 2.0, 1.4);
        screenShake.shake(0.4, 0.4);
      } else {
        _charging.set(key, next);
      }
      continue;
    }

    // ── Idle glyph: gate on a living revenant, proximity, and the core threshold. ──
    const aliveNear = combatSystem.getAllEnemies().some(e =>
      e.type === 'ridge_revenant' && e.state !== 'dead'
      && (e.position.x - wx) ** 2 + (e.position.y - wy) ** 2 < ACTIVE_RADIUS_SQ);
    if (aliveNear) continue;

    if (!onGlyph) continue;

    if (cores < MIN_CURSED_SEDIMENT) {
      if (!_hintedInsufficient.has(key)) {
        _hintedInsufficient.add(key);
        notify('The glyph stays cold', {
          id: `revenant-ritual-need-cores-${key}`,
          type: 'info',
          description:
            cores === 0
              ? `You need at least ${MIN_CURSED_SEDIMENT} cursed sediment to wake this circle. Shatter heresy altars in the woods to gather it.`
              : `You carry ${cores} cursed sediment — the glyph needs ${MIN_CURSED_SEDIMENT}+. Destroy more heresy altars.`,
          duration: 4500,
        });
      }
      continue;
    }

    // Begin the summon.
    _charging.set(key, SUMMON_CHARGE_TIME);
    playRitualSummonStart?.();
    screenShake.shake(0.18, 0.25);
    notify('The glyph drinks your heresy', {
      id: `revenant-ritual-${key}`,
      type: 'info',
      description: 'The cursed sediment in your pack flares — something is being dragged back.',
      duration: 2800,
    });
  }
}

/** One-shot flavor when the player steps on a spent / failed summoning circle. */
export function updateFailedRitualGlyphs(ctx: Pick<RevenantRitualContext, 'state' | 'world'>): void {
  const { state, world } = ctx;
  ensureForestDudRitualSites(world, state.currentMap, {
    playerWorldX: state.player.position.x,
    playerWorldY: state.player.position.y,
  });
  const map = world.getCurrentMap();
  const halfW = map.width / 2;
  const halfH = map.height / 2;
  const px = state.player.position.x;
  const py = state.player.position.y;

  for (const site of DUD_RITUAL_SITES) {
    if (site.mapId !== state.currentMap) continue;
    const key = `${site.mapId}:${site.tileX}:${site.tileY}`;
    if (_hintedDud.has(key)) continue;

    const wx = site.tileX - halfW + 0.5;
    const wy = site.tileY - halfH + 0.5;
    const dx = px - wx;
    const dy = py - wy;
    if (dx * dx + dy * dy > TRIGGER_RADIUS_SQ) continue;

    _hintedDud.add(key);
    const cores = state.player.cursedSediment ?? 0;
    notify(site.title, {
      id: `ritual-dud-${key}`,
      type: 'info',
      description:
        cores >= MIN_CURSED_SEDIMENT
          ? `${site.description} Even steeped in heresy, nothing answers here.`
          : site.description,
      duration: 5200,
    });
  }
}

export type RevenantRitualDevTarget = 'west' | 'east' | 'all';

function ritualSitesForDevTarget(target: RevenantRitualDevTarget): RitualSite[] {
  if (target === 'all') return RITUAL_SITES;
  if (target === 'west') {
    return RITUAL_SITES.filter(s => s.clearedFlag === 'ritual_revenant_west_cleared');
  }
  return RITUAL_SITES.filter(s => s.clearedFlag === 'ridge_revenant_defeated');
}

/** Dev-only: clear ritual flags and nearby ridge revenants so glyphs can fire again. */
export function resetRevenantRitualForDev(
  target: RevenantRitualDevTarget,
  state: GameState,
  combatSystem: CombatSystem,
  mapWidth: number,
  mapHeight: number,
): void {
  const halfW = mapWidth / 2;
  const halfH = mapHeight / 2;
  const clearRadiusSq = ACTIVE_RADIUS_SQ * 2;

  for (const site of ritualSitesForDevTarget(target)) {
    state.setFlag(site.clearedFlag as GameFlagKey, false);
    const key = siteKey(site);
    _charging.delete(key);
    _hintedInsufficient.delete(key);

    const wx = site.tileX - halfW + 0.5;
    const wy = site.tileY - halfH + 0.5;
    for (const enemy of combatSystem.getAllEnemies()) {
      if (enemy.type !== 'ridge_revenant') continue;
      const distSq = (enemy.position.x - wx) ** 2 + (enemy.position.y - wy) ** 2;
      if (distSq <= clearRadiusSq) {
        enemy.health = 0;
        enemy.state = 'dead';
      }
    }
  }

  if (target === 'east' || target === 'all') {
    state.worldItems = state.worldItems.filter(item => item.itemId !== 'tempered_core');
  }
}
