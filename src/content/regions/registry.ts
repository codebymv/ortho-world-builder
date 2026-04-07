export interface RegionContentEntry {
  id: string;
  label: string;
  summary: string;
  mapIds: string[];
  interiorIds?: string[];
}

export const regionContentRegistry: RegionContentEntry[] = [
  {
    id: 'greenleaf',
    label: 'Greenleaf Village',
    summary: 'Primary hub, onboarding zone, social state changes, and village interiors.',
    mapIds: ['village'],
    interiorIds: ['interior_inn', 'interior_blacksmith', 'interior_merchant', 'interior_cottage_a'],
  },
  {
    id: 'whispering_woods',
    label: 'Whispering Woods',
    summary: 'First-act wilderness investigation, ranger route, cottage trail, and Hollow boss arc.',
    mapIds: ['forest'],
    interiorIds: ['interior_cottage_forest', 'interior_ranger_cabin', 'interior_woodcutter_cottage', 'interior_hunter_cottage', 'interior_hollow_arena'],
  },
  {
    id: 'deep_woods',
    label: 'Deep Woods',
    summary: 'Occult escalation biome connecting the witch, shrine road, and castle approach.',
    mapIds: ['deep_woods'],
    interiorIds: ['interior_witch_hut', 'interior_witch_cottage'],
  },
  {
    id: 'ruins',
    label: 'Ancient Ruins',
    summary: 'Optional history-heavy branch reinforcing the buried civilization beneath the campaign.',
    mapIds: ['ruins'],
  },
  {
    id: 'shadow_castle',
    label: 'Shadow Castle',
    summary: 'Late-game fortress arc and current end-point of the main progression spine.',
    mapIds: ['shadow_castle'],
  },
];
