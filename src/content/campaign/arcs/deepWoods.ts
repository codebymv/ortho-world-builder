import type { CampaignArc } from '../types';

export const deepWoodsArc: CampaignArc = {
  id: 'clear_deep_woods',
  label: 'Into the Depths',
  act: 2,
  summary:
    'The Deep Woods escalate the campaign from frontier danger into occult corruption, with the witch and shrine road revealing the larger shadow threat.',
  maps: ['village', 'deep_woods', 'interior_witch_hut', 'gilrhym'],
  quests: ['clear_deep_woods'],
  beats: [
    {
      id: 'deep-woods-briefing',
      label: 'Deeper Briefing',
      role: 'briefing',
      summary:
        'The elder sends the player beyond Whispering Woods, framing Deep Woods as the place where explanation turns into revelation.',
      maps: ['village'],
      quests: ['clear_deep_woods'],
    },
    {
      id: 'witch-territory',
      label: 'Witch Territory',
      role: 'investigation',
      summary:
        'The witch hut acts as a controlled sanctuary where the player learns the forest corruption is part of an older northern cycle.',
      maps: ['deep_woods', 'interior_witch_hut'],
      quests: ['clear_deep_woods'],
    },
    {
      id: 'ritual-road',
      label: 'Ritual Road',
      role: 'revelation',
      summary:
        'The shrine route and ritual staging make the shadow threat feel systemic rather than local.',
      maps: ['deep_woods'],
      quests: ['clear_deep_woods'],
    },
    {
      id: 'gilrhym-arrival',
      label: 'Gilrhym Arrival',
      role: 'discovery',
      summary:
        'After the Hollow boss, the player reaches the outskirts of Gilrhym and meets Oliver, who contextualizes the corruption and reanimation plaguing the land.',
      maps: ['gilrhym'],
    },
    {
      id: 'gilrhym-exploration',
      label: 'City Navigation',
      role: 'investigation',
      summary:
        'The player navigates the fallen city from outskirts through market district to the dense rooftop layer, uncovering lore about the rogue faction.',
      maps: ['gilrhym'],
    },
    {
      id: 'gilrhym-scythe',
      label: 'Terminus Scythe',
      role: 'discovery',
      summary:
        'At the city midpoint the player discovers the Terminus Scythe, a two-handed weapon radiating dark matter energy.',
      maps: ['gilrhym'],
    },
    {
      id: 'gilrhym-boss',
      label: 'The Ashen Reaver',
      role: 'boss',
      summary:
        'The corrupted knight-commander of the Gilrhym guard awaits in the cathedral plaza, enforcing the rogue faction\'s will.',
      maps: ['gilrhym'],
    },
    {
      id: 'elder-report',
      label: 'Return With Knowledge',
      role: 'return',
      summary:
        'Reporting back to Greenleaf shifts the village from frontier anxiety into active wartime preparation.',
      maps: ['village'],
      quests: ['clear_deep_woods'],
    },
  ],
};
