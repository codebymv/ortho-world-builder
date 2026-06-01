import type { CombatSystem } from '@/lib/game/Combat';
import type { GameState } from '@/lib/game/GameState';
import type { World } from '@/lib/game/World';
import { notify } from '@/lib/game/notificationBus';
import { ensureForestDudRitualSites } from '@/game/runtime/revenantRitualDecor';
import { resetRevenantRitualForDev } from '@/game/runtime/RevenantRituals';
import { RANGER_APPROACH_DUD_RITUAL } from '@/game/runtime/ritualSiteConstants';

export interface SoulsSlopDevApi {
  /** West fort glyph (~-132,-3): clears `ritual_revenant_west_cleared` and nearby revenants. */
  resetWestRevenantRitual: () => void;
  /** East ridge glyph (~110,-8): clears `ridge_revenant_defeated` and drops Tempered Core from the ground. */
  resetEastRevenantRitual: () => void;
  resetAllRevenantRituals: () => void;
  /** Set cursed sediment (glyph needs 3+ to summon). */
  giveCursedSediment: (amount?: number) => void;
  /** Force-stamp the dud ritual at world (123, 109). */
  fixDudRituals: () => void;
  /** Teleport the player onto the dud ritual glyph (world 123, 109) and remesh it. */
  gotoDudRitual: () => void;
}

const DEV_METHOD_KEYS: (keyof SoulsSlopDevApi)[] = [
  'resetWestRevenantRitual',
  'resetEastRevenantRitual',
  'resetAllRevenantRituals',
  'giveCursedSediment',
  'fixDudRituals',
  'gotoDudRitual',
];

const DUD_TILE_X = RANGER_APPROACH_DUD_RITUAL.tileX;
const DUD_TILE_Y = RANGER_APPROACH_DUD_RITUAL.tileY;

interface RevenantRitualDevHost {
  getState: () => GameState | null;
  getCombat: () => CombatSystem | null;
  getWorld: () => World | null;
  onChanged: () => void;
}

function runReset(host: RevenantRitualDevHost, target: 'west' | 'east' | 'all'): void {
  const state = host.getState();
  const combat = host.getCombat();
  const world = host.getWorld();
  if (!state || !combat || !world) {
    console.warn('[soulsSlopDev] Game not ready — load into the world first.');
    return;
  }
  if (state.currentMap !== 'forest') {
    console.warn('[soulsSlopDev] Switch to Whispering Woods (forest map) first.');
    return;
  }

  const map = world.getCurrentMap();
  resetRevenantRitualForDev(target, state, combat, map.width, map.height);
  host.onChanged();

  const label = target === 'west' ? 'West fort' : target === 'east' ? 'East ridge' : 'All ritual';
  console.log(`[soulsSlopDev] ${label} ritual reset. Stand on the glyph with 3+ cursed sediment.`);
  notify('Dev: ritual reset', {
    id: `dev-revenant-reset-${target}`,
    type: 'info',
    description: `${label} revenant can be summoned again. You need 3+ cursed sediment on the glyph.`,
    duration: 4000,
  });
}

export function registerRevenantRitualDevCommands(host: RevenantRitualDevHost): void {
  if (!import.meta.env.DEV) return;

  const win = window as Window & { soulsSlopDev?: Partial<SoulsSlopDevApi> };
  const api: SoulsSlopDevApi = {
    resetWestRevenantRitual: () => runReset(host, 'west'),
    resetEastRevenantRitual: () => runReset(host, 'east'),
    resetAllRevenantRituals: () => runReset(host, 'all'),
    giveCursedSediment: (amount = 3) => {
      const state = host.getState();
      if (!state) {
        console.warn('[soulsSlopDev] Game not ready.');
        return;
      }
      state.player.cursedSediment = Math.max(0, Math.floor(amount));
      host.onChanged();
      console.log(`[soulsSlopDev] cursed sediment = ${state.player.cursedSediment}`);
    },
    fixDudRituals: () => {
      const state = host.getState();
      const world = host.getWorld();
      if (!state || !world) {
        console.warn('[soulsSlopDev] Game not ready.');
        return;
      }
      const map = world.getCurrentMap();
      const remeshed = ensureForestDudRitualSites(world, state.currentMap, {
        forceRemesh: true,
        playerWorldX: state.player.position.x,
        playerWorldY: state.player.position.y,
      });
      const tileType = map.tiles[DUD_TILE_Y]?.[DUD_TILE_X]?.type ?? 'missing';
      const meshType = world.isActiveTileMeshStale(DUD_TILE_X, DUD_TILE_Y) ? 'stale/missing' : tileType;
      const playerTileX = Math.floor(state.player.position.x + map.width / 2);
      const playerTileY = Math.floor(state.player.position.y + map.height / 2);
      const dist = Math.max(Math.abs(playerTileX - DUD_TILE_X), Math.abs(playerTileY - DUD_TILE_Y));
      const dudWorldX = DUD_TILE_X - map.width / 2;
      const dudWorldY = DUD_TILE_Y - map.height / 2;
      console.log(
        `[soulsSlopDev] Dud ritual at world (${dudWorldX},${dudWorldY}) / tile (${DUD_TILE_X},${DUD_TILE_Y}): ` +
          `map=${tileType}, mesh=${meshType}${remeshed ? ' — remeshed' : ''}.\n` +
          `  player world = (${Math.round(state.player.position.x)},${Math.round(state.player.position.y)}), ${dist} tiles away.` +
          (dist > 4 ? ' You are NOT on the glyph — run soulsSlopDev.gotoDudRitual().' : ''),
      );
    },
    gotoDudRitual: () => {
      const state = host.getState();
      const world = host.getWorld();
      if (!state || !world) {
        console.warn('[soulsSlopDev] Game not ready.');
        return;
      }
      if (state.currentMap !== 'forest') {
        console.warn('[soulsSlopDev] Switch to Whispering Woods (forest map) first.');
        return;
      }
      const map = world.getCurrentMap();
      state.player.position.x = DUD_TILE_X - map.width / 2 + 0.5;
      state.player.position.y = DUD_TILE_Y - map.height / 2 + 0.5;
      ensureForestDudRitualSites(world, state.currentMap, {
        forceRemesh: true,
        playerWorldX: state.player.position.x,
        playerWorldY: state.player.position.y,
      });
      world.updateChunks(state.player.position.x, state.player.position.y);
      host.onChanged();
      console.log(
        `[soulsSlopDev] Teleported to dud ritual glyph at world (${DUD_TILE_X - map.width / 2},${DUD_TILE_Y - map.height / 2}). It should be under your feet now.`,
      );
    },
  };

  win.soulsSlopDev = { ...win.soulsSlopDev, ...api };

  console.log(
    '%c[soulsSlopDev]%c Ritual debug (dev only):\n' +
      '  soulsSlopDev.resetWestRevenantRitual()\n' +
      '  soulsSlopDev.resetEastRevenantRitual()\n' +
      '  soulsSlopDev.giveCursedSediment(3)\n' +
      '  soulsSlopDev.fixDudRituals()\n' +
      '  soulsSlopDev.gotoDudRitual()\n' +
      'Then stand on the summoning circle with 3+ sediment.',
    'color:#83B6FF;font-weight:bold',
    '',
  );
}

export function unregisterRevenantRitualDevCommands(): void {
  const win = window as Window & { soulsSlopDev?: Partial<SoulsSlopDevApi> };
  if (!win.soulsSlopDev) return;
  for (const key of DEV_METHOD_KEYS) {
    delete win.soulsSlopDev[key];
  }
}
