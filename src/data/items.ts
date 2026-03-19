import { Item } from '@/lib/game/GameState';

export const items: Record<string, Item> = {
  health_potion: {
    id: 'health_potion',
    name: 'Health Potion',
    description: 'A small vial filled with red liquid. Restores 50 health when consumed.',
    type: 'consumable',
    sprite: 'potion',
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
  
  iron_sword: {
    id: 'iron_sword',
    name: 'Iron Sword',
    description: 'A well-crafted blade of sturdy iron. Reliable and sharp.',
    type: 'equipment',
    sprite: 'sword',
  },
  
  meek_short_sword: {
    id: 'meek_short_sword',
    name: 'Meek Short Sword',
    description: 'A simple, reliable starting blade.',
    type: 'equipment',
    sprite: 'sword',
  },
};
