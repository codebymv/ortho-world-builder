import { WorldMap } from '@/lib/game/World';
import { interiorBlacksmithDef, interiorCottageADef, interiorCottageForestDef, interiorHollowArenaDef, interiorHunterCottageDef, interiorInnDef, interiorMerchantDef, interiorRangerCabinDef, interiorWoodcutterCottageDef } from '@/content/regions/interiors';
import { villageDef } from '@/content/regions/greenleaf/map';
import { forestDef } from '@/content/regions/whispering_woods/map';
import { generateMap, MapDefinition } from './mapGenerator';

const mapCache: Record<string, WorldMap> = {};

function clearMapCache() {
  for (const key of Object.keys(mapCache)) {
    delete mapCache[key];
  }
}

/** Dev-only: after HMR edits to this module, World must call `loadMap(allMaps[id])` â€” cache clear alone is not enough. */
const mapHotReloadSubscribers: Array<() => void> = [];

export function subscribeMapHotReload(handler: () => void): () => void {
  mapHotReloadSubscribers.push(handler);
  return () => {
    const i = mapHotReloadSubscribers.indexOf(handler);
    if (i !== -1) mapHotReloadSubscribers.splice(i, 1);
  };
}

type MapDefinitionSummary = Pick<MapDefinition, 'name' | 'subtitle' | 'width' | 'height'>;

type DeferredMapDefinitionLoader = {
  summary: MapDefinitionSummary;
  load: () => Promise<MapDefinition>;
};

function summarizeMapDefinition(def: MapDefinition): MapDefinitionSummary {
  return {
    name: def.name,
    subtitle: def.subtitle,
    width: def.width,
    height: def.height,
  };
}

const staticMapDefinitions: Record<string, MapDefinition> = {
  village: villageDef,
  forest: forestDef,
  interior_inn: interiorInnDef,
  interior_blacksmith: interiorBlacksmithDef,
  interior_merchant: interiorMerchantDef,
  interior_cottage_a: interiorCottageADef,
  interior_cottage_forest: interiorCottageForestDef,
  interior_ranger_cabin: interiorRangerCabinDef,
  interior_woodcutter_cottage: interiorWoodcutterCottageDef,
  interior_hunter_cottage: interiorHunterCottageDef,
  interior_hollow_arena: interiorHollowArenaDef,
};

const deferredMapLoaders: Record<string, DeferredMapDefinitionLoader> = {
  gilrhym: {
    summary: {
      name: 'Gilrhym',
      subtitle: 'A city consumed by what it buried',
      width: 300,
      height: 300,
    },
    load: async () => (await import('@/content/regions/ruins/map')).gilrhymDef,
  },
};

const deferredMapDefinitions: Record<string, MapDefinition> = {};
const deferredMapDefinitionLoads: Record<string, Promise<MapDefinition>> = {};

const mapDefinitionSummaries: Record<string, MapDefinitionSummary> = {
  village: summarizeMapDefinition(villageDef),
  forest: summarizeMapDefinition(forestDef),
  gilrhym: deferredMapLoaders.gilrhym.summary,
  interior_inn: summarizeMapDefinition(interiorInnDef),
  interior_blacksmith: summarizeMapDefinition(interiorBlacksmithDef),
  interior_merchant: summarizeMapDefinition(interiorMerchantDef),
  interior_cottage_a: summarizeMapDefinition(interiorCottageADef),
  interior_cottage_forest: summarizeMapDefinition(interiorCottageForestDef),
  interior_ranger_cabin: summarizeMapDefinition(interiorRangerCabinDef),
  interior_woodcutter_cottage: summarizeMapDefinition(interiorWoodcutterCottageDef),
  interior_hunter_cottage: summarizeMapDefinition(interiorHunterCottageDef),
  interior_hollow_arena: summarizeMapDefinition(interiorHollowArenaDef),
};

function clearDeferredMapDefinitions() {
  for (const key of Object.keys(deferredMapDefinitions)) {
    delete deferredMapDefinitions[key];
  }
  for (const key of Object.keys(deferredMapDefinitionLoads)) {
    delete deferredMapDefinitionLoads[key];
  }
}

function getLoadedMapDefinition(key: string): MapDefinition | undefined {
  return staticMapDefinitions[key] ?? deferredMapDefinitions[key];
}

async function ensureMapDefinition(key: string): Promise<MapDefinition | undefined> {
  const loaded = getLoadedMapDefinition(key);
  if (loaded) return loaded;

  const loader = deferredMapLoaders[key];
  if (!loader) return undefined;

  deferredMapDefinitionLoads[key] ??= loader.load().then(def => {
    deferredMapDefinitions[key] = def;
    return def;
  });

  return deferredMapDefinitionLoads[key];
}

export async function preloadMap(key: string): Promise<WorldMap | undefined> {
  if (mapCache[key]) {
    return mapCache[key];
  }

  const def = await ensureMapDefinition(key);
  if (!def) return undefined;

  mapCache[key] = generateMap(def);
  return mapCache[key];
}

export const mapDefinitions: Record<string, MapDefinition> = new Proxy({} as Record<string, MapDefinition>, {
  get(_target, prop: string | symbol) {
    if (typeof prop !== 'string') return undefined;
    return getLoadedMapDefinition(prop) ?? (mapDefinitionSummaries[prop] as MapDefinition | undefined);
  },
  has(_target, prop: string | symbol) {
    return typeof prop === 'string' && prop in mapDefinitionSummaries;
  },
  ownKeys() {
    return Reflect.ownKeys(mapDefinitionSummaries);
  },
  getOwnPropertyDescriptor(_target, prop: string | symbol) {
    if (typeof prop !== 'string' || !(prop in mapDefinitionSummaries)) {
      return undefined;
    }

    return {
      configurable: true,
      enumerable: true,
      value: getLoadedMapDefinition(prop) ?? mapDefinitionSummaries[prop],
      writable: false,
    };
  },
});

function getOrGenerateMap(key: string): WorldMap | undefined {
  if (!mapCache[key]) {
    const def = getLoadedMapDefinition(key);
    if (!def) return undefined;
    mapCache[key] = generateMap(def);
  }
  return mapCache[key];
}

// Proxy that lazily generates maps on first access
export const allMaps: Record<string, WorldMap> = new Proxy({} as Record<string, WorldMap>, {
  get(_target, prop: string) {
    return getOrGenerateMap(prop);
  },
  has(_target, prop: string) {
    return prop in mapDefinitions;
  },
});

if (import.meta.hot) {
  import.meta.hot.dispose(() => {
    clearMapCache();
    clearDeferredMapDefinitions();
  });
  import.meta.hot.accept(() => {
    clearMapCache();
    clearDeferredMapDefinitions();
    for (const fn of mapHotReloadSubscribers) {
      try {
        fn();
      } catch (err) {
        console.warn('[maps hot reload]', err);
      }
    }
  });
}
