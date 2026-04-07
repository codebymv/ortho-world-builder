import type { CampaignArc } from '../types';

export const findHunterArc: CampaignArc = {
  id: 'find_hunter',
  label: 'The Missing Hunter',
  act: 1,
  summary:
    'Greenleaf sends the player into Whispering Woods, where the search for the missing hunter turns into a full first-act investigation and field-boss arc.',
  maps: ['village', 'forest', 'interior_hunter_cottage', 'interior_hollow_arena'],
  quests: ['find_hunter'],
  items: ['manuscript_fragment', 'hunters_manuscript'],
  beats: [
    {
      id: 'greenleaf-briefing',
      label: 'Elder Briefing',
      role: 'briefing',
      summary: 'The elder introduces the missing hunter and points the player toward Whispering Woods.',
      maps: ['village'],
      quests: ['find_hunter'],
    },
    {
      id: 'whispering-woods-investigation',
      label: 'Whispering Woods Investigation',
      role: 'investigation',
      summary:
        'The player follows the ranger route, warning signs, and blood-dark trail deeper into the forest.',
      maps: ['forest', 'interior_ranger_cabin'],
      quests: ['find_hunter'],
    },
    {
      id: 'disparaged-cottage',
      label: 'Disparaged Cottage',
      role: 'discovery',
      summary:
        'The cottage reveals the missing hunter’s final trace and points farther into the woods instead of resolving the mystery immediately.',
      maps: ['forest', 'interior_hunter_cottage'],
      quests: ['find_hunter'],
      items: ['manuscript_fragment'],
    },
    {
      id: 'hollow-guardian',
      label: 'The Hollow',
      role: 'boss',
      summary:
        'Crossing the river into the Hollow culminates in the first field-boss check and the complete manuscript recovery.',
      maps: ['forest', 'interior_hollow_arena'],
      quests: ['find_hunter'],
      items: ['hunters_manuscript'],
    },
    {
      id: 'return-to-elder',
      label: 'Return To Elder',
      role: 'return',
      summary:
        'The manuscript and the fight’s aftermath confirm that the threat extends beyond the outer woods.',
      maps: ['village'],
      quests: ['find_hunter'],
      items: ['hunters_manuscript'],
    },
  ],
};
