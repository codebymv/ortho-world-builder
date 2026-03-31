import type { WorldMap } from '@/lib/game/World';

export type MapTransitionResult =
  | { ok: true; map: WorldMap }
  | { ok: false; reason: 'locked' | 'missing_map' };
