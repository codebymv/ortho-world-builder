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
    id: 'gilrhym',
    label: 'Gilrhym',
    summary: 'A sprawling Victorian city overrun by reanimated dead and corruption, reached after the Hollow boss.',
    mapIds: ['gilrhym'],
  },
];
