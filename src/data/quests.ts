import { Quest } from '@/lib/game/GameState';

export const quests: Record<string, Quest> = {
  find_hunter: {
    id: 'find_hunter',
    title: 'The Missing Hunter',
    description: 'The village elder has asked you to find the missing hunter who went into the Deep Woods to investigate strange occurrences.',
    objectives: [
      'Travel to the Deep Woods',
      'Find signs of the missing hunter',
      'Investigate the mysterious lights',
      'Return to the elder with your findings',
    ],
    completed: false,
    active: false,
    reward: {
      gold: 100,
      items: ['ancient_map'],
    },
  },
  
  merchants_request: {
    id: 'merchants_request',
    title: "Merchant's Rare Goods",
    description: 'The traveling merchant is looking for rare herbs that grow near the ancient ruins. He will pay handsomely for them.',
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
};
