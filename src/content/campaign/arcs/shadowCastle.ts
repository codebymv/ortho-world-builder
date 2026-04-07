import type { CampaignArc } from '../types';

export const shadowCastleArc: CampaignArc = {
  id: 'shadow_castle_assault',
  label: 'Shadow Castle',
  act: 3,
  summary:
    'The northern road culminates in Shadow Castle, where the ritual architecture of the world becomes explicit and the campaign resolves in fortress form.',
  maps: ['deep_woods', 'shadow_castle'],
  quests: [],
  beats: [
    {
      id: 'castle-approach',
      label: 'Castle Approach',
      role: 'investigation',
      summary:
        'The player crosses from woodland horror into fortress horror, with the castle presented as the seat of the cycle rather than a generic final dungeon.',
      maps: ['deep_woods', 'shadow_castle'],
    },
    {
      id: 'castle-procession',
      label: 'Entry Procession',
      role: 'dungeon',
      summary:
        'The outer court, reliquary wings, and central hall teach the fortress’ ceremonial structure before the upper keep.',
      maps: ['shadow_castle'],
    },
    {
      id: 'upper-keep',
      label: 'Upper Keep',
      role: 'boss',
      summary:
        'The upper keep and Shadow Lord approach function as the culminating confrontation of the current campaign spine.',
      maps: ['shadow_castle'],
    },
    {
      id: 'aftermath',
      label: 'Resolution',
      role: 'resolution',
      summary:
        'The campaign should eventually branch here into ending logic or world-state aftermath once that layer is authored.',
      maps: ['shadow_castle', 'village'],
    },
  ],
};
