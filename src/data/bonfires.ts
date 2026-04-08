export interface BonfireEntry {
  id: string;
  name: string;
  mapId: string;
  tileX: number;
  tileY: number;
}

export const BONFIRE_REGISTRY: BonfireEntry[] = [
  { id: 'bonfire_village',           name: 'Village Square',      mapId: 'village',       tileX: 120, tileY: 104 },
  { id: 'bonfire_hollow',            name: 'Hollow Entrance',     mapId: 'forest',        tileX: 124, tileY: 72  },
  { id: 'bonfire_forest_fort',       name: 'Fort Corridor',       mapId: 'forest',        tileX: 156, tileY: 154 },
  { id: 'bonfire_forest_south',      name: 'Southern Trail',      mapId: 'forest',        tileX: 130, tileY: 206 },
  { id: 'bonfire_deep_woods_north',  name: 'Deep Woods Summit',   mapId: 'deep_woods',    tileX: 118, tileY: 38  },
  { id: 'bonfire_deep_woods_west',   name: 'Western Hollow',      mapId: 'deep_woods',    tileX: 52,  tileY: 72  },
  { id: 'bonfire_gilrhym_gate',       name: 'City Gate',           mapId: 'gilrhym',       tileX: 150, tileY: 268 },
  { id: 'bonfire_gilrhym_market',     name: 'Market Square',       mapId: 'gilrhym',       tileX: 150, tileY: 155 },
  { id: 'bonfire_gilrhym_heights',    name: 'The Heights',         mapId: 'gilrhym',       tileX: 140, tileY: 85  },
  { id: 'bonfire_gilrhym_cathedral',  name: 'Cathedral Steps',     mapId: 'gilrhym',       tileX: 150, tileY: 50  },
  { id: 'bonfire_shadow_castle',     name: 'Shadow Castle',       mapId: 'shadow_castle', tileX: 100, tileY: 101 },
];

export function getBonfiresForMap(mapId: string): BonfireEntry[] {
  return BONFIRE_REGISTRY.filter(b => b.mapId === mapId);
}

export function getKindledBonfiresForMap(
  mapId: string,
  gameFlags: Record<string, boolean | number>,
): BonfireEntry[] {
  return getBonfiresForMap(mapId).filter(b => {
    const key = `bonfire_first_${b.mapId}_${b.tileX}_${b.tileY}`;
    return Boolean(gameFlags[key]);
  });
}
