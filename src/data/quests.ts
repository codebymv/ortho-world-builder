import { Quest } from '@/lib/game/GameState';

export const quests: Record<string, Quest> = {
  // FIRST QUEST - Takes place in Whispering Woods
  find_hunter: {
    id: 'find_hunter',
    title: 'The Missing Hunter',
    description: 'A hunter went into the Whispering Woods and never returned. Search the Disparaged Cottage deep in the forest and bring back whatever evidence remains.',
    objectives: [
      'Travel to the Whispering Woods',
      'Find the Disparaged Cottage',
      'Find traces of the manuscript',
      'Cross the river into the Hollow',
      'Defeat the Hollow Apparition',
      'Recover the complete manuscript',
      "Follow the hunter's trail to Gilrhym",
      'Investigate the inner city',
      'Return to the elder with your findings',
    ],
    completed: false,
    active: false,
    reward: {
      gold: 100,
      items: ['ancient_map'],
    },
  },

  // SECOND QUEST - Unlocks Deep Woods
  clear_deep_woods: {
    id: 'clear_deep_woods',
    title: 'Into the Depths',
    description: "With the Hunter's Manuscript in hand, the elder reveals the path to the Deep Woods is now open. Find the witch, uncover the shadow threat, and trace it toward Shadow Castle.",
    objectives: [
      'Travel to the Deep Woods',
      'Find the witch\'s hut',
      'Learn about the dark magic',
      'Return to the elder',
    ],
    completed: false,
    active: false,
    reward: {
      gold: 150,
    },
  },

  merchants_request: {
    id: 'merchants_request',
    title: "Merchant's Rare Goods",
    description: 'The traveling merchant wants Moonbloom flowers that grow in and around the Whispering Woods and along the ruin-side paths beyond it. He will pay handsomely for them.',
    objectives: [
      'Find Moonbloom flowers (0/3)',
      'Return to the merchant',
    ],
    completed: false,
    active: false,
    reward: {
      gold: 75,
    },
  },

  guard_duty: {
    id: 'guard_duty',
    title: 'Guard Duty',
    description: 'The village guard needs help patrolling the northern border. Strange creatures have been spotted in the area.',
    objectives: [
      'Patrol the northern forest border',
      'Defeat any hostile creatures (0/5)',
      'Report back to the guard',
    ],
    completed: false,
    active: false,
    reward: {
      gold: 50,
      items: ['iron_sword'],
    },
  },

  blighted_heart: {
    id: 'blighted_heart',
    title: 'The Blighted Heart',
    description: 'Warden Callum says a corrupted growth at the heart of the western enchanted grove is spreading blight across the woods. Enter the grove, destroy the Blighted Root, and bring proof back to the warden.',
    objectives: [
      'Enter the enchanted grove west of the corridor',
      'Find and destroy the Blighted Root',
      'Return to Warden Callum',
    ],
    completed: false,
    active: false,
    reward: {
      gold: 75,
      items: ['verdant_tonic', 'verdant_tonic', 'verdant_tonic'],
    },
  },

  rangers_request: {
    id: 'rangers_request',
    title: "The Ranger's Request",
    description: 'The ranger at the outpost wants the Stone Golem in the eastern highlands destroyed before it seals the old watchtower route for good.',
    objectives: [
      'Defeat the Stone Golem',
      'Return to the ranger',
    ],
    completed: false,
    active: false,
    reward: {
      gold: 80,
      items: ['ranger_badge'],
    },
  },
};
