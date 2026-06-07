import type { GameState } from '@/lib/game/GameState';

/**
 * The overworld layer is hand-authored, zoomed out, and intentionally decoupled
 * from the 300x300 region maps. It exists for orientation only (no fast travel).
 * Positions are normalized (0..1) over the overworld canvas.
 */
export interface OverworldRegion {
  id: string;
  label: string;
  subtitle?: string;
  /** Normalized node center on the overworld canvas. */
  x: number;
  y: number;
  /** Region/interior map ids that resolve to this overworld node. */
  mapIds: string[];
  /** Always revealed (e.g. the starting region). */
  alwaysKnown?: boolean;
  /**
   * Fallback reveal signals for existing saves that pre-date the per-region
   * `seen_region_*` flag. Any truthy flag here also reveals the region.
   */
  impliedByFlags?: string[];
}

/**
 * Vertical layout per the design: Greenleaf (top) -> Whispering Woods (center)
 * -> Guilrhym (below, fogged until first reached).
 */
export const OVERWORLD_REGIONS: OverworldRegion[] = [
  {
    id: 'greenleaf',
    label: 'Greenleaf Village',
    subtitle: 'A quiet hamlet on the forest edge',
    x: 0.5,
    y: 0.16,
    mapIds: [
      'village',
      'interior_inn',
      'interior_blacksmith',
      'interior_merchant',
      'interior_cottage_a',
    ],
    alwaysKnown: true,
  },
  {
    id: 'whispering_woods',
    label: 'Whispering Woods',
    subtitle: 'Mist-bound trees and a buried hollow',
    x: 0.5,
    y: 0.5,
    mapIds: [
      'forest',
      'interior_cottage_forest',
      'interior_ranger_cabin',
      'interior_woodcutter_cottage',
      'interior_hunter_cottage',
      'interior_hollow_arena',
    ],
    impliedByFlags: ['hollow_entered', 'hollow_guardian_defeated'],
  },
  {
    id: 'guilrhym',
    label: 'Guilrhym',
    subtitle: 'A city consumed by what it buried',
    x: 0.5,
    y: 0.83,
    mapIds: ['guilrhym', 'interior_guilrhym_cathedral'],
    impliedByFlags: ['ashen_reaver_defeated'],
  },
];

const REGION_BY_MAP_ID = new Map<string, OverworldRegion>(
  OVERWORLD_REGIONS.flatMap(region => region.mapIds.map(mapId => [mapId, region] as const)),
);

/** Direct discovery only — no “later region implies earlier” chain. */
function isOverworldRegionDirectlyDiscovered(
  region: OverworldRegion,
  state: GameState,
  currentMapId: string,
): boolean {
  if (region.alwaysKnown) return true;
  if (Boolean(state.gameFlags[seenRegionFlagKey(region.id)])) return true;
  if (region.impliedByFlags?.some(flag => state.getFlagBool(flag))) return true;
  return resolveOverworldRegionId(currentMapId) === region.id;
}

export function resolveOverworldRegionId(mapId: string | null | undefined): string | null {
  if (!mapId) return null;
  return REGION_BY_MAP_ID.get(mapId)?.id ?? null;
}

export function seenRegionFlagKey(regionId: string): string {
  return `seen_region_${regionId}`;
}

/**
 * A region is discovered once the player has entered it (persisted via the
 * `seen_region_*` flag set on map entry), if it is the always-known start
 * region, if an implied progression flag is set (covers older saves), if it
 * is the player's current location, or if any **later** region on the overworld
 * path has been discovered (you cannot reach Guilrhym without having passed
 * through Whispering Woods).
 */
export function isOverworldRegionDiscovered(
  region: OverworldRegion,
  state: GameState,
  currentMapId: string,
): boolean {
  if (isOverworldRegionDirectlyDiscovered(region, state, currentMapId)) return true;

  const regionIndex = OVERWORLD_REGIONS.findIndex(r => r.id === region.id);
  if (regionIndex < 0) return false;

  for (let i = regionIndex + 1; i < OVERWORLD_REGIONS.length; i++) {
    if (isOverworldRegionDirectlyDiscovered(OVERWORLD_REGIONS[i], state, currentMapId)) {
      return true;
    }
  }
  return false;
}
