import { Item } from '@/lib/game/GameState';

export const items: Record<string, Item> = {
  health_potion: {
    id: 'health_potion',
    name: 'Ephemeral Extract',
    description: 'A bright alchemical draught that briefly steadies body and breath. Restores 100 health when consumed.',
    type: 'consumable',
    sprite: 'potion',
    healAmount: 100,
  },

  tempest_grass: {
    id: 'tempest_grass',
    name: 'Tempest Grass',
    description: 'A wild healing herb bundled with twine. Restores 35 health when chewed or steeped.',
    type: 'consumable',
    sprite: 'tempest_grass_item',
    healAmount: 35,
  },
  
  ancient_map: {
    id: 'ancient_map',
    name: 'Ancient Map',
    description: 'A weathered map showing the location of ancient ruins and forgotten paths.',
    type: 'quest',
    sprite: 'map',
  },
  
  village_key: {
    id: 'village_key',
    name: 'Village Key',
    description: 'An old iron key. It might open something important in the village.',
    type: 'key',
    sprite: 'key',
  },
  
  moonbloom: {
    id: 'moonbloom',
    name: 'Moonbloom Flower',
    description: 'A rare flower that glows faintly with silvery light. Prized by alchemists and merchants.',
    type: 'quest',
    sprite: 'flower',
  },

  hunters_manuscript: {
    id: 'hunters_manuscript',
    name: "Hunter's Manuscript",
    description: 'Loose weathered pages from the missing hunter, filled with grim notes about shadow creatures at the northern perimeter.',
    type: 'quest',
    sprite: 'loose_pages',
  },
  
  iron_sword: {
    id: 'iron_sword',
    name: 'Iron Sword',
    description: 'A well-crafted blade of sturdy iron. Reliable and sharp.',
    type: 'equipment',
    sprite: 'sword',
    stats: {
      damage: 28,
      range: 2.15,
    },
  },
  
  meek_short_sword: {
    id: 'meek_short_sword',
    name: 'Meek Short Sword',
    description: 'A simple, reliable starting blade. Attack with left click.',
    type: 'equipment',
    sprite: 'sword',
    stats: {
      damage: 20,
      range: 2,
    },
  },

  shadow_blade: {
    id: 'shadow_blade',
    name: 'Shadow Blade',
    description: 'A dark sword forged from an alloy found only in the ancient ruins. Its edge hums with residual magic.',
    type: 'equipment',
    sprite: 'sword',
    stats: {
      damage: 36,
      range: 2.3,
    },
  },

  crystal_greatsword: {
    id: 'crystal_greatsword',
    name: 'Crystal Greatsword',
    description: 'A massive crystalline blade pulsing with arcane power. Devastatingly slow but overwhelmingly powerful.',
    type: 'equipment',
    sprite: 'sword',
    stats: {
      damage: 44,
      range: 2.5,
    },
  },

  golem_heart: {
    id: 'golem_heart',
    name: 'Golem Heart',
    description: 'A dense core chipped from the Stone Golem. It is warm to the touch and thrums with the memory of impossible weight.',
    type: 'quest',
    sprite: 'key',
  },

  ranger_badge: {
    id: 'ranger_badge',
    name: 'Ranger Badge',
    description: 'A weathered badge from the old outpost, pressed into your palm as proof that the high road is safe again.',
    type: 'quest',
    sprite: 'map',
  },
};
